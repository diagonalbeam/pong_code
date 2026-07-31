import base64
import importlib
import io
import os
import shutil
import tempfile
import unittest
from uuid import uuid4


class MarkdownImageUploadApiTestCase(unittest.TestCase):
    SAMPLE_PNG_BYTES = base64.b64decode(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aF9sAAAAASUVORK5CYII='
    )

    def setUp(self):
        self.temp_dir = tempfile.mkdtemp(prefix='pongcode-markdown-upload-')
        self.db_path = os.path.join(self.temp_dir, 'test.db')
        self.upload_dir = os.path.join(
            os.path.dirname(os.path.dirname(__file__)),
            'static',
            'uploads',
            f'markdown-test-{uuid4().hex[:8]}'
        )
        os.environ['DATABASE_URL'] = f'sqlite:///{self.db_path}'
        os.environ['SECRET_KEY'] = 'test-secret'
        os.environ['MARKDOWN_IMAGE_UPLOAD_DIR'] = self.upload_dir

        app_module = importlib.import_module('app')
        app_module = importlib.reload(app_module)
        self.app_module = app_module
        self.app = app_module.create_app()
        self.app.config.update(TESTING=True, WTF_CSRF_ENABLED=False)
        self.app_context = self.app.app_context()
        self.app_context.push()
        self.client = self.app.test_client()
        self._register_and_login()

    def tearDown(self):
        self.app_module.db.session.remove()
        self.app_context.pop()
        shutil.rmtree(self.upload_dir, ignore_errors=True)
        shutil.rmtree(self.temp_dir, ignore_errors=True)
        os.environ.pop('MARKDOWN_IMAGE_UPLOAD_DIR', None)

    def _register_and_login(self):
        unique = uuid4().hex[:8]
        username = f'user_{unique}'
        password = 'password123'
        register = self.client.post(
            '/api/auth/register',
            json={
                'username': username,
                'email': f'{unique}@example.com',
                'password': password,
            },
        )
        self.assertEqual(register.status_code, 200)
        login = self.client.post(
            '/api/auth/login',
            json={'username': username, 'password': password},
        )
        self.assertEqual(login.status_code, 200)

    def _png_upload(self, filename='pasted-image.png'):
        return io.BytesIO(self.SAMPLE_PNG_BYTES), filename

    def _saved_files(self):
        saved = []
        if os.path.exists(self.upload_dir):
            for root, _, files in os.walk(self.upload_dir):
                for file_name in files:
                    saved.append(os.path.join(root, file_name))
        return saved

    def test_upload_accepts_real_image_and_returns_renderable_static_url(self):
        response = self.client.post(
            '/api/uploads/markdown-images',
            data={'images': self._png_upload()},
            content_type='multipart/form-data',
        )

        self.assertEqual(response.status_code, 201)
        urls = response.get_json()['urls']
        self.assertEqual(len(urls), 1)
        self.assertTrue(urls[0].startswith('/static/uploads/markdown-test-'))
        self.assertTrue(urls[0].endswith('.png'))
        self.assertEqual(len(self._saved_files()), 1)

        image_response = self.client.get(urls[0])
        self.assertEqual(image_response.status_code, 200)
        self.assertEqual(image_response.data, self.SAMPLE_PNG_BYTES)

    def test_upload_requires_login(self):
        self.client.get('/api/auth/logout')

        response = self.client.post(
            '/api/uploads/markdown-images',
            data={'images': self._png_upload()},
            content_type='multipart/form-data',
        )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(self._saved_files(), [])

    def test_upload_rejects_content_disguised_as_an_image(self):
        response = self.client.post(
            '/api/uploads/markdown-images',
            data={'images': (io.BytesIO(b'<script>alert(1)</script>'), 'fake.png')},
            content_type='multipart/form-data',
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn('PNG', response.get_json()['error'])
        self.assertEqual(self._saved_files(), [])

    def test_mixed_upload_rolls_back_files_saved_before_invalid_image(self):
        response = self.client.post(
            '/api/uploads/markdown-images',
            data={
                'images': [
                    self._png_upload('valid.png'),
                    (io.BytesIO(b'not-an-image'), 'invalid.png'),
                ],
            },
            content_type='multipart/form-data',
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(self._saved_files(), [])


if __name__ == '__main__':
    unittest.main()
