import re
import unittest
from datetime import date, timedelta
from uuid import uuid4

from playwright.sync_api import expect, sync_playwright

from tests.e2e.support.server import MiniAgileServer


PASSWORD = "SecureE2E#1"


class VueAppE2ETestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = MiniAgileServer()
        cls.server.start()
        cls.playwright = sync_playwright().start()
        cls.browser = cls.playwright.chromium.launch(headless=True)

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.playwright.stop()
        cls.server.stop()

    def setUp(self):
        self.context = self.browser.new_context(viewport={"width": 1280, "height": 900})
        self.page = self.context.new_page()
        self.page.set_default_timeout(20_000)
        self.browser_errors = []
        self.page.on("pageerror", lambda error: self.browser_errors.append(str(error)))
        self.page.on(
            "console",
            lambda message: self.browser_errors.append(message.text)
            if message.type == "error"
            else None,
        )
        self.username = f"vue_{uuid4().hex[:10]}"
        self.email = f"{self.username}@example.com"
        self._register_and_login()

    def tearDown(self):
        errors = list(self.browser_errors)
        self.context.close()
        self.assertFalse(errors, f"浏览器控制台错误：{errors}")

    @property
    def base_url(self):
        return self.server.base_url

    def _api(self, method, path, payload=None):
        response = getattr(self.context.request, method)(
            f"{self.base_url}{path}",
            data=payload,
        )
        self.assertTrue(
            response.ok,
            f"{method.upper()} {path} 返回 {response.status}: {response.text()}",
        )
        return response.json()

    def _register_and_login(self):
        self.page.goto(f"{self.base_url}/register")
        expect(self.page).to_have_title("注册 · PongCode")
        self.page.get_by_test_id("register-username").fill(self.username)
        self.page.get_by_test_id("register-email").fill(self.email)
        self.page.get_by_test_id("register-password").fill(PASSWORD)
        self.page.get_by_test_id("register-password-confirm").fill(PASSWORD)
        self.page.get_by_test_id("register-submit").click()
        expect(self.page).to_have_url(re.compile(r"/login$"))

        self.page.get_by_test_id("login-username").fill(self.username)
        self.page.get_by_test_id("login-password").fill(PASSWORD)
        self.page.get_by_test_id("login-submit").click()
        expect(self.page).to_have_url(re.compile(r"/dashboard$"))
        expect(self.page).to_have_title("控制台 · PongCode")
        expect(self.page.get_by_role("heading", name="控制台")).to_be_visible()

    def _create_project_fixture(self):
        organization = self._api("post", "/api/organizations", {"name": f"组织_{uuid4().hex[:8]}"})
        team = self._api(
            "post",
            f"/api/organizations/{organization['id']}/teams",
            {"name": f"团队_{uuid4().hex[:8]}", "description": "Vue E2E"},
        )
        project = self._api(
            "post",
            f"/api/organizations/{organization['id']}/projects",
            {"name": f"项目_{uuid4().hex[:8]}", "description": "Vue E2E", "team_id": team["id"]},
        )
        today = date.today()
        sprint_payload = self._api(
            "post",
            f"/api/projects/{project['id']}/sprints",
            {
                "name": f"迭代_{uuid4().hex[:8]}",
                "start_date": today.isoformat(),
                "end_date": (today + timedelta(days=14)).isoformat(),
            },
        )
        sprint = sprint_payload["sprint"]
        self._api("put", f"/api/sprints/{sprint['id']}", {"status": "active"})
        return organization, team, project, sprint

    def test_auth_organization_history_theme_and_mobile_shell(self):
        organization_name = f"产品组织_{uuid4().hex[:8]}"
        self.page.get_by_test_id("create-org-button").click()
        self.page.get_by_test_id("create-org-name-input").fill(organization_name)
        self.page.get_by_test_id("create-org-submit-button").click()
        expect(self.page.get_by_text(organization_name, exact=True)).to_be_visible()

        organizations = self._api("get", "/api/organizations")
        organization = next(item for item in organizations if item["name"] == organization_name)
        self._api("post", "/api/organizations", {"name": f"第二组织_{uuid4().hex[:8]}"})
        self.page.get_by_role("button", name="团队", exact=True).first.click()
        team_dialog = self.page.get_by_role("dialog", name="选择组织")
        expect(team_dialog).to_be_visible()
        team_dialog.get_by_text(organization_name, exact=True).click()
        expect(self.page).to_have_url(
            re.compile(rf"/organizations/{organization['id']}/teams$")
        )
        expect(self.page).to_have_title("团队 · PongCode")

        deep_link = f"{self.base_url}/organizations/{organization['id']}"
        self.page.goto(deep_link)
        expect(self.page).to_have_url(deep_link)
        expect(self.page).to_have_title("组织详情 · PongCode")
        expect(self.page.get_by_role("heading", name=organization_name)).to_be_visible()
        self.page.reload()
        expect(self.page.get_by_role("heading", name=organization_name)).to_be_visible()

        html = self.page.locator("html")
        original_dark = html.evaluate("element => element.classList.contains('dark')")
        self.page.get_by_test_id("theme-toggle").click()
        expect(html).to_have_class(re.compile(r"\bdark\b") if not original_dark else re.compile(r"^(?!.*\bdark\b).*$"))

        self.page.set_viewport_size({"width": 390, "height": 844})
        expect(self.page.get_by_role("button", name="打开导航")).to_be_visible()
        expect(self.page.get_by_test_id("desktop-sidebar")).to_be_hidden()

        self.page.goto(f"{self.base_url}/projects/999/board")
        expect(self.page).to_have_title("页面不存在 · PongCode")
        expect(self.page.get_by_text("页面不存在", exact=True)).to_be_visible()

    def test_desktop_shell_sidebar_and_account_controls(self):
        header = self.page.get_by_test_id("app-header")
        sidebar = self.page.get_by_test_id("desktop-sidebar")
        sidebar_header = self.page.get_by_test_id("sidebar-header")
        toggle = self.page.get_by_test_id("desktop-sidebar-toggle")

        expect(header).to_be_visible()
        expect(sidebar).to_be_visible()
        expect(sidebar).to_have_css("width", "220px")
        expect(sidebar_header).to_have_css("border-bottom-width", "1px")
        header_box = header.bounding_box()
        sidebar_header_box = sidebar_header.bounding_box()
        self.assertIsNotNone(header_box)
        self.assertIsNotNone(sidebar_header_box)
        self.assertAlmostEqual(
            sidebar_header_box["y"] + sidebar_header_box["height"],
            header_box["y"] + header_box["height"],
            delta=0.5,
        )
        expect(toggle).to_have_attribute("aria-label", "收起侧栏")
        self.assertEqual(
            sidebar.get_by_role("button", name="收起侧栏").count(),
            0,
        )

        toggle.click()
        expect(toggle).to_have_attribute("aria-label", "展开侧栏")
        expect(sidebar).to_have_css("width", "60px")

        workbench = sidebar.get_by_role("button", name="工作台", exact=True)
        sidebar_box = sidebar.bounding_box()
        workbench_box = workbench.bounding_box()
        self.assertIsNotNone(sidebar_box)
        self.assertIsNotNone(workbench_box)
        self.assertAlmostEqual(
            workbench_box["x"] + workbench_box["width"] / 2,
            sidebar_box["x"] + sidebar_box["width"] / 2,
            delta=1,
        )

        workbench.hover()
        tooltip = self.page.locator('.el-popper[role="tooltip"]').filter(
            has_text="工作台"
        )
        expect(tooltip).to_be_visible()

        notification = self.page.get_by_test_id("header-notification")
        theme_toggle = self.page.get_by_test_id("theme-toggle")
        notification_button = notification.get_by_role("button", name="通知")
        user_trigger = self.page.get_by_test_id("user-trigger")
        action_boxes = [
            theme_toggle.bounding_box(),
            notification_button.bounding_box(),
            user_trigger.bounding_box(),
        ]
        self.assertTrue(all(box is not None for box in action_boxes))
        for box in action_boxes:
            self.assertAlmostEqual(box["width"], 40, delta=0.5)
            self.assertAlmostEqual(box["height"], 40, delta=0.5)

        action_centers = [
            box["x"] + box["width"] / 2
            for box in action_boxes
        ]
        self.assertAlmostEqual(
            action_centers[1] - action_centers[0],
            action_centers[2] - action_centers[1],
            delta=0.5,
        )

        badge = notification.locator(".el-badge__content")
        header_box = header.bounding_box()
        badge_box = badge.bounding_box()
        self.assertIsNotNone(header_box)
        self.assertIsNotNone(badge_box)
        self.assertGreaterEqual(badge_box["y"], header_box["y"])
        self.assertLessEqual(
            badge_box["y"] + badge_box["height"],
            header_box["y"] + header_box["height"],
        )
        self.assertLessEqual(badge_box["height"], 16)
        self.assertEqual(
            notification_button.locator(".el-icon").evaluate(
                "element => getComputedStyle(element).fontSize"
            ),
            "18px",
        )

        self.assertEqual(header.get_by_text(self.username, exact=True).count(), 0)
        avatar = user_trigger.locator(".el-avatar")
        avatar_background = avatar.evaluate(
            "element => getComputedStyle(element).backgroundColor"
        )
        self.assertNotEqual(avatar_background, "rgba(0, 0, 0, 0)")

        user_trigger.click()
        account_summary = self.page.get_by_test_id("account-summary")
        expect(account_summary).to_be_visible()
        expect(account_summary.get_by_text(self.username, exact=True)).to_be_visible()
        expect(account_summary.get_by_text(self.email, exact=True)).to_be_visible()

    def test_board_menu_moves_task_across_status_and_requirement(self):
        organization, team, project, sprint = self._create_project_fixture()
        alternate_project = self._api(
            "post",
            f"/api/organizations/{organization['id']}/projects",
            {
                "name": f"切换项目_{uuid4().hex[:8]}",
                "description": "验证侧栏项目下拉选择",
                "team_id": team["id"],
            },
        )
        requirement = self._api(
            "post",
            f"/api/projects/{project['id']}/requirements",
            {
                "title": f"需求_{uuid4().hex[:8]}",
                "content": "E2E 验收需求",
                "priority": 2,
                "status": "in_progress",
                "sprint_id": sprint["id"],
            },
        )
        issue = self._api(
            "post",
            f"/api/projects/{project['id']}/issues",
            {
                "title": f"任务_{uuid4().hex[:8]}",
                "description": "验证 SortableJS 菜单替代操作",
                "sprint_id": sprint["id"],
                "requirement_id": requirement["id"],
            },
        )
        next_sprint = self._api(
            "post",
            f"/api/projects/{project['id']}/sprints",
            {
                "name": f"下一迭代_{uuid4().hex[:8]}",
                "start_date": sprint["start_date"],
                "end_date": sprint["end_date"],
            },
        )["sprint"]
        board_url = (
            f"{self.base_url}/organizations/{organization['id']}/projects/"
            f"{project['id']}/board?sprint={sprint['id']}"
        )
        self.page.goto(board_url)
        expect(self.page).to_have_title("看板 · PongCode")
        sprint_status_select = self.page.get_by_test_id("board-sprint-status-trigger")
        expect(sprint_status_select.locator(".el-tag")).to_be_visible()
        expect(sprint_status_select).to_contain_text("进行中")
        expect(self.page.get_by_test_id("sidebar-project-switcher")).to_contain_text(project["name"])
        expect(self.page.get_by_test_id("sidebar-sprint-switcher")).to_contain_text(sprint["name"])
        expect(self.page.get_by_role("combobox", name="选择迭代")).to_have_count(0)
        card = self.page.get_by_test_id("board-item").filter(has_text=issue["title"])
        expect(card).to_be_visible()

        card.get_by_role("button", name="编辑工作项").click()
        issue_dialog = self.page.get_by_role("dialog")
        expect(issue_dialog).to_be_visible()
        expect(issue_dialog.get_by_text(issue["title"], exact=True).first).to_be_visible()
        self.page.keyboard.press("Escape")
        expect(issue_dialog).to_be_hidden()

        card.get_by_test_id("board-item-move-button").click()
        with self.page.expect_response(
            lambda response: response.url.endswith(f"/api/issues/{issue['id']}")
            and response.request.method == "PUT"
        ):
            self.page.get_by_role("menuitem", name="移到进行中").click()
        doing_column = self.page.locator('[data-testid="board-column"][data-status="doing"]')
        expect(doing_column.get_by_text(issue["title"], exact=True)).to_be_visible()
        self.assertEqual(self._api("get", f"/api/issues/{issue['id']}")["issue"]["status"], "doing")

        moved_card = doing_column.get_by_test_id("board-item").filter(has_text=issue["title"])
        moved_card.get_by_test_id("board-item-move-button").click()
        with self.page.expect_response(
            lambda response: response.url.endswith(f"/api/issues/{issue['id']}")
            and response.request.method == "PUT"
        ):
            self.page.get_by_role("menuitem", name="未分类", exact=True).click()
        unassigned_lane = self.page.get_by_test_id("board-swimlane-unassigned")
        expect(unassigned_lane.get_by_text(issue["title"], exact=True)).to_be_visible()
        self.assertIsNone(self._api("get", f"/api/issues/{issue['id']}")["issue"]["requirement_id"])

        self.page.get_by_test_id("sidebar-sprint-switcher").click()
        self.page.get_by_role("menuitem", name=next_sprint["name"], exact=True).click()
        expect(self.page).to_have_url(re.compile(rf"[?&]sprint={next_sprint['id']}(?:&|$)"))
        expect(self.page.get_by_role("heading", name=next_sprint["name"], exact=True)).to_be_visible()

        self.page.get_by_test_id("sidebar-project-switcher").click()
        self.page.get_by_role("menuitem", name=alternate_project["name"], exact=True).click()
        expect(self.page).to_have_url(
            re.compile(
                rf"/organizations/{organization['id']}/projects/"
                rf"{alternate_project['id']}/board$"
            )
        )

    def test_board_drag_card_moves_task_across_status(self):
        organization, _, project, sprint = self._create_project_fixture()
        requirement = self._api(
            "post",
            f"/api/projects/{project['id']}/requirements",
            {
                "title": f"拖拽需求_{uuid4().hex[:8]}",
                "content": "验证 SortableJS 整卡拖动",
                "priority": 2,
                "status": "in_progress",
                "sprint_id": sprint["id"],
            },
        )
        issue = self._api(
            "post",
            f"/api/projects/{project['id']}/issues",
            {
                "title": f"拖拽任务_{uuid4().hex[:8]}",
                "description": "必须通过拖动整张卡片移动",
                "sprint_id": sprint["id"],
                "requirement_id": requirement["id"],
            },
        )
        board_url = (
            f"{self.base_url}/organizations/{organization['id']}/projects/"
            f"{project['id']}/board?sprint={sprint['id']}"
        )
        self.page.goto(board_url)

        lane = self.page.get_by_test_id(f"board-swimlane-req-{requirement['id']}")
        todo_column = lane.locator('[data-testid="board-column"][data-status="todo"]')
        doing_column = lane.locator('[data-testid="board-column"][data-status="doing"]')
        card = todo_column.get_by_test_id("board-item").filter(has_text=issue["title"])
        expect(card).to_be_visible()
        expect(self.page.locator(".el-loading-mask")).to_be_hidden()

        card_content = card.get_by_role("heading", name=issue["title"])
        card_box = card_content.bounding_box()
        target_box = doing_column.bounding_box()
        self.assertIsNotNone(card_box)
        self.assertIsNotNone(target_box)
        source_x = card_box["x"] + card_box["width"] / 2
        source_y = card_box["y"] + card_box["height"] / 2
        self.page.mouse.move(
            source_x,
            source_y,
        )
        self.page.mouse.down()
        self.page.mouse.move(source_x + 12, source_y, steps=4)
        self.page.wait_for_timeout(100)
        drag_preview = self.page.locator(".board-drag-fallback")
        expect(drag_preview).to_be_visible()
        preview_style = drag_preview.evaluate(
            """element => {
                const style = getComputedStyle(element)
                const rect = element.getBoundingClientRect()
                return {
                    boxShadow: style.boxShadow,
                    cursor: style.cursor,
                    opacity: Number(style.opacity),
                    transitionProperty: style.transitionProperty,
                    width: rect.width,
                    height: rect.height,
                    x: rect.x,
                    y: rect.y,
                }
            }"""
        )
        self.assertNotEqual(preview_style["boxShadow"], "none")
        self.assertEqual(preview_style["cursor"], "grabbing")
        self.assertGreater(preview_style["opacity"], 0.8)
        self.assertNotIn("transform", preview_style["transitionProperty"])
        self.assertGreater(preview_style["width"], 0)
        self.assertGreater(preview_style["height"], 0)
        self.page.mouse.move(
            target_box["x"] + target_box["width"] / 2,
            target_box["y"] + min(target_box["height"] / 2, 80),
            steps=24,
        )
        self.page.wait_for_timeout(150)
        moved_preview_box = drag_preview.bounding_box()
        self.assertIsNotNone(moved_preview_box)
        self.assertGreater(
            max(
                abs(moved_preview_box["x"] - preview_style["x"]),
                abs(moved_preview_box["y"] - preview_style["y"]),
            ),
            40,
        )
        with self.page.expect_response(
            lambda response: response.url.endswith(f"/api/issues/{issue['id']}")
            and response.request.method == "PUT"
        ):
            self.page.mouse.up()

        expect(doing_column.get_by_text(issue["title"], exact=True)).to_be_visible()
        self.assertEqual(self._api("get", f"/api/issues/{issue['id']}")["issue"]["status"], "doing")

    def test_sprint_row_opens_board_and_edit_uses_dialog(self):
        organization, _, project, sprint = self._create_project_fixture()
        sprints_url = (
            f"{self.base_url}/organizations/{organization['id']}/projects/"
            f"{project['id']}/sprints"
        )
        self.page.goto(sprints_url)
        expect(self.page).to_have_title("全部迭代 · PongCode")

        self.page.get_by_test_id("desktop-table").get_by_text(sprint["name"], exact=True).click()
        expect(self.page).to_have_url(
            re.compile(
                rf"/organizations/{organization['id']}/projects/{project['id']}/board"
                rf"\?sprint={sprint['id']}$"
            )
        )

        self.page.goto(sprints_url)
        self.page.get_by_role("button", name=f"编辑迭代 {sprint['name']}").click()
        sprint_dialog = self.page.get_by_role("dialog")
        expect(sprint_dialog).to_be_visible()
        expect(sprint_dialog.get_by_text(sprint["name"], exact=True).first).to_be_visible()

    def test_bug_status_and_evidence_flow(self):
        organization, _, project, sprint = self._create_project_fixture()
        bug = self._api(
            "post",
            f"/api/projects/{project['id']}/bugs",
            {
                "title": f"缺陷_{uuid4().hex[:8]}",
                "description": "缺陷证据 E2E",
                "severity": 2,
                "status": "open",
                "sprint_id": sprint["id"],
            },
        )
        bugs_url = (
            f"{self.base_url}/organizations/{organization['id']}/projects/"
            f"{project['id']}/bugs"
        )
        self.page.goto(bugs_url)
        expect(self.page).to_have_title("缺陷 · PongCode")
        desktop_table = self.page.get_by_test_id("desktop-table")
        bug_title = desktop_table.get_by_text(bug["title"], exact=True)
        expect(bug_title).to_be_visible()
        expect(desktop_table.get_by_text("待处理", exact=True)).to_be_visible()
        self.assertEqual(desktop_table.get_by_text("未开始", exact=True).count(), 0)

        bug_title.click()
        expect(self.page.get_by_test_id("bug-detail-title")).to_be_visible()
        expect(self.page.get_by_role("dialog")).to_be_visible()
        self.page.get_by_role("tab", name=re.compile(r"证据")).click()
        evidence_comment = f"证据说明_{uuid4().hex[:8]}"
        self.page.get_by_test_id("add-bug-evidence-comment-input").fill(evidence_comment)
        with self.page.expect_response(
            lambda response: response.url.endswith(f"/api/bugs/{bug['id']}/evidences")
            and response.request.method == "POST"
        ):
            self.page.get_by_test_id("add-bug-evidence-submit-button").click()
        expect(self.page.get_by_text(evidence_comment, exact=True)).to_be_visible()


if __name__ == "__main__":
    unittest.main()
