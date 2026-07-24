# Vue 前端 E2E 测试

本目录使用 Python Playwright 驱动生产构建，并由隔离的 Flask 子进程提供
History 路由、API 和静态资源。每次启动都会创建临时 SQLite 数据库和附件目录，
不会修改开发数据库。

## 安装

在仓库根目录执行：

```bash
python3 -m pip install -r apps/api/requirements.txt
python3 -m playwright install chromium
pnpm install
```

## 运行

推荐使用根脚本，它会先生成前端生产构建：

```bash
pnpm test:e2e
```

也可以在已有 `apps/web/dist` 时直接运行：

```bash
.venv/bin/python -m pytest -q tests/e2e
```

当前自动化覆盖：

- 注册、登录和组织创建；
- Vue Router History 深链接与刷新；
- 亮暗主题和移动端应用壳；
- 看板任务跨状态、跨需求泳道移动；
- 缺陷状态中文语义与证据提交。

后端权限、删除级联、附件类型/大小、工时归属等细节由 `tests/` 下的 Flask
测试覆盖。旧 E2E 依赖 `window.app`、Hash 路由和原生 DOM，在 Vue 切换后已经
失去事实基础，因此由本套用例替代。

## 常见问题

| 现象 | 处理 |
| --- | --- |
| 找不到 Chromium | 执行 `python3 -m playwright install chromium` |
| 端口 5001 被占用 | 停止占用进程后重试 |
| 页面返回 404 或旧资源 | 先执行 `pnpm build` |
| 需要观察浏览器 | 将测试中的 `headless=True` 临时改为 `False` |
