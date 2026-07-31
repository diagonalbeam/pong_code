# PongCode

PongCode 是一个轻量的敏捷项目管理工具，支持组织、团队、项目、迭代、
需求、任务、缺陷、看板、工时及缺陷证据。

当前仓库已采用前后端分离的 pnpm monorepo 结构：

```text
.
├── apps
│   ├── api                 # Flask API 与生产静态资源入口
│   └── web                 # Vue 3 单页应用
├── packages
│   └── api-contract        # OpenAPI 契约与生成的 TypeScript 类型
├── static                  # 运行时上传文件根目录
├── tests                   # Flask 与浏览器测试
└── docs/architecture       # 目标架构与功能对照表
```

## 技术栈

- 后端：Flask 3、Flask-SQLAlchemy、Flask-Login
- 前端：Vue 3、Element Plus、Vite 8、TypeScript、Tailwind CSS 4
- 前端状态与请求：Pinia、Vue Router（History 模式）、Axios
- 看板拖拽：直接封装 SortableJS
- 包管理器：pnpm 11

具体版本以各 workspace 的 `package.json` 和 `pnpm-lock.yaml` 为准。
TypeScript 版本兼容性说明见
[`docs/architecture/pongcode-monorepo-target.md`](docs/architecture/pongcode-monorepo-target.md)。

## 本地开发

前置要求：

- Node.js 24+
- pnpm 11.9+
- Python 3.10+

安装依赖：

```bash
pnpm install
python3 -m venv .venv
.venv/bin/pip install -r apps/api/requirements.txt
```

同时启动 Flask（5001）和 Vite（5173）：

```bash
pnpm dev
```

访问 `http://localhost:5173`。Vite 会将 `/api`、`/static` 和 `/healthz`
代理到 Flask。

也可以分别启动：

```bash
pnpm dev:api
pnpm dev:web
```

数据库连接仍沿用既有逻辑：生产环境通过 `DATABASE_URL` 注入，
本次重构没有修改数据库和服务端业务行为。

## 构建与校验

```bash
pnpm check
pnpm test:e2e
```

`pnpm build` 会先从 OpenAPI 生成契约类型，再构建 Vue 静态资源。
本地构建后，也可以只启动 Flask；Flask 会从 `apps/web/dist` 提供前端，
并对 History 路由返回 `index.html`。

## 生产镜像

```bash
docker build -t pongcode .
docker run --rm -p 5000:5000 \
  -e DATABASE_URL='数据库连接' \
  -e SECRET_KEY='生产密钥' \
  pongcode
```

Dockerfile 使用多阶段构建：

1. Node 阶段通过 pnpm 构建 Vue；
2. Python 阶段安装 Flask 依赖并复制静态产物；
3. Gunicorn 运行 Flask，同时提供 API、上传文件和 Vue History 回退。

运行时仍可使用既有环境变量，包括：

- `DATABASE_URL`
- `SECRET_KEY`
- `BUG_EVIDENCE_UPLOAD_DIR`
- `MARKDOWN_IMAGE_UPLOAD_DIR`
- `MAIL_SERVER`、`MAIL_PORT`、`MAIL_USE_TLS`
- `MAIL_USERNAME`、`MAIL_PASSWORD`、`MAIL_DEFAULT_SENDER`
- `APP_BASE_URL`
- `FRONTEND_DIST_DIR`（仅用于覆盖前端构建目录）
- `PORT`、`WEB_CONCURRENCY`、`GUNICORN_THREADS`

## 架构资料

- [目标架构与已确认决策](docs/architecture/pongcode-monorepo-target.md)（已实施）
- [旧版到新版功能对照表](docs/architecture/feature-parity-matrix.md)（迁移完成）
- [API 契约](packages/api-contract/openapi.yaml)
- [视觉规范](design.md)
- Agent 开发指引：[CLAUDE.md](CLAUDE.md) / [AGENTS.md](AGENTS.md)

`docs/superpowers/` 下为历史设计与实现计划快照，路径与前端技术栈可能仍指向旧原生 JS；以本 README、架构文档和当前代码为准。
