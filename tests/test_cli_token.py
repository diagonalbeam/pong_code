import importlib
import os
import shutil
import tempfile
import unittest
from datetime import date, timedelta
from uuid import uuid4


class CliTokenApiTestCase(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp(prefix='pongcode-cli-token-')
        os.environ['DATABASE_URL'] = f"sqlite:///{os.path.join(self.temp_dir, 'test.db')}"
        os.environ['SECRET_KEY'] = 'test-secret'

        app_module = importlib.import_module('app')
        self.app_module = importlib.reload(app_module)
        self.app = self.app_module.create_app()
        self.app.config.update(TESTING=True, WTF_CSRF_ENABLED=False)
        self.client = self.app.test_client()

        suffix = uuid4().hex[:8]
        with self.app.app_context():
            self._register_and_login(f'owner_{suffix}')
            self.owner_token = self._current_token()
            org = self.client.post('/api/organizations', json={'name': f'CLI Org {suffix}'})
            self.org_id = org.get_json()['id']
            team = self.client.post(
                f'/api/organizations/{self.org_id}/teams',
                json={'name': f'CLI Team {suffix}'},
            )
            project = self.client.post(
                f'/api/organizations/{self.org_id}/projects',
                json={'name': f'CLI Project {suffix}', 'team_id': team.get_json()['id']},
            )
            self.project_id = project.get_json()['id']
            start = date.today()
            sprint = self.client.post(
                f'/api/projects/{self.project_id}/sprints',
                json={
                    'name': f'CLI Sprint {suffix}',
                    'start_date': start.isoformat(),
                    'end_date': (start + timedelta(days=14)).isoformat(),
                },
            )
            self.sprint_id = sprint.get_json()['sprint']['id']

    def tearDown(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def _register_and_login(self, prefix):
        username = f'{prefix}_{uuid4().hex[:8]}'
        register = self.client.post('/api/auth/register', json={
            'username': username,
            'email': f'{username}@example.com',
            'password': 'password123',
        })
        self.assertEqual(register.status_code, 200)
        login = self.client.post('/api/auth/login', json={
            'username': username,
            'password': 'password123',
        })
        self.assertEqual(login.status_code, 200)
        return login.get_json()['user']['id']

    def _current_token(self):
        models = importlib.import_module('models')
        response = self.client.get('/api/auth/cli-token')
        self.assertEqual(response.status_code, 200)
        return response.get_json()['cli_token']

    def _auth_headers(self, token):
        return {'Authorization': f'Bearer {token}'}

    def test_token_is_generated_visible_and_rotatable(self):
        with self.app.app_context():
            models = importlib.import_module('models')
            user = models.User.query.get(1)
            self.assertEqual(len(user.cli_token), 64)

            profile = self.client.get('/api/auth/profile').get_json()
            self.assertNotIn('cli_token', profile['user'])

            visible = self.client.get('/api/auth/cli-token')
            self.assertEqual(visible.status_code, 200)
            self.assertEqual(visible.get_json()['cli_token'], user.cli_token)

            rotated = self.client.post('/api/auth/cli-token/rotate')
            self.assertEqual(rotated.status_code, 200)
            new_token = rotated.get_json()['cli_token']
            self.assertNotEqual(new_token, self.owner_token)
            self.assertEqual(models.User.query.get(1).cli_token, new_token)
            self.client.get('/api/auth/logout')

        old_response = self.client.get(
            '/api/auth/profile',
            headers=self._auth_headers(self.owner_token),
        )
        new_response = self.client.get(
            '/api/auth/profile',
            headers=self._auth_headers(new_token),
        )
        self.assertEqual(old_response.status_code, 401)
        self.assertEqual(new_response.status_code, 200)

    def test_bearer_token_can_manage_board_task(self):
        self.client.get('/api/auth/logout')
        headers = self._auth_headers(self.owner_token)

        created = self.client.post(
            f'/api/projects/{self.project_id}/issues',
            headers=headers,
            json={'title': 'CLI task', 'sprint_id': self.sprint_id},
        )
        self.assertEqual(created.status_code, 201)
        issue = created.get_json()
        self.assertTrue(issue['item_code'])

        shown = self.client.get(f"/api/issues/{issue['id']}", headers=headers)
        self.assertEqual(shown.status_code, 200)
        self.assertEqual(shown.get_json()['issue']['title'], 'CLI task')

        updated = self.client.put(
            f"/api/issues/{issue['id']}",
            headers=headers,
            json={'description': 'updated by CLI', 'status': 'doing'},
        )
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.get_json()['status'], 'doing')

        moved = self.client.post(
            f"/api/issues/{issue['id']}/move",
            headers=headers,
            json={'status': 'done'},
        )
        self.assertEqual(moved.status_code, 200)

        deleted = self.client.delete(f"/api/issues/{issue['id']}", headers=headers)
        self.assertEqual(deleted.status_code, 200)

    def test_outside_token_cannot_access_task(self):
        with self.app.app_context():
            models = importlib.import_module('models')
            issue = models.Issue(
                title='Protected task',
                project_id=self.project_id,
                sprint_id=self.sprint_id,
            )
            self.app_module.db.session.add(issue)
            self.app_module.db.session.commit()
            issue_id = issue.id

        outsider_id = self._register_and_login('outsider')
        with self.app.app_context():
            models = importlib.import_module('models')
            outsider_token = models.User.query.get(outsider_id).cli_token
        headers = self._auth_headers(outsider_token)

        paths = [
            ('GET', f'/api/issues/{issue_id}', None),
            ('PUT', f'/api/issues/{issue_id}', {'title': 'changed'}),
            ('POST', f'/api/issues/{issue_id}/move', {'status': 'done'}),
            ('DELETE', f'/api/issues/{issue_id}', None),
        ]
        for method, path, body in paths:
            response = self.client.open(path, method=method, headers=headers, json=body)
            self.assertEqual(response.status_code, 403)

        with self.app.app_context():
            models = importlib.import_module('models')
            stored = models.Issue.query.get(issue_id)
            self.assertEqual(stored.title, 'Protected task')
            self.assertEqual(stored.status, 'todo')


if __name__ == '__main__':
    unittest.main()
