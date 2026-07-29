# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

##请使用中文输出文案，因为是中国人使用

## Project Overview

**PongCode** 是轻量敏捷项目管理工具，支持组织、团队、项目、迭代、需求、任务、缺陷、看板、工时与缺陷证据。

仓库已是前后端分离的 **pnpm monorepo**：Flask API + Vue 3 SPA。生产由 Flask/Gunicorn 同源提供 API、上传附件与 Vue History 回退。

### Tech Stack
- **Backend**: Flask 3 + Flask-SQLAlchemy + Flask-Login + Flask-Mail
- **Database**: 默认 MySQL（`DATABASE_URL`）；测试与本地可用 SQLite
- **Frontend**: Vue 3 + Element Plus + Vite 8 + TypeScript + Tailwind CSS 4
- **State / Router**: Pinia、Vue Router（History）
- **HTTP**: Axios（Session Cookie）
- **Kanban**: SortableJS 业务组件封装
- **Contracts**: `packages/api-contract`（OpenAPI → TypeScript 类型）
- **Package manager**: pnpm 11

视觉规范见根目录 [`design.md`](design.md)（Action Blue `#0066cc`，非旧版靛蓝主题）。

---

## Repository Layout

```text
apps/
  api/                 # Flask 后端入口与业务
    app.py
    extensions.py
    models.py
    routes/
    services/
    requirements.txt
  web/                 # Vue 3 SPA
    src/
      pages/           # 路由页面（小写连字符目录 + index.vue）
      components/      # 通用与 business/ 业务组件
      api/             # 按领域导出具名请求函数
      shared/
      router/
      stores/
      styles/
packages/
  api-contract/        # OpenAPI 与生成类型
static/                # 运行时上传根目录（uploads/），非前端源码
tests/                 # pytest（含 e2e/）
docs/architecture/     # 目标架构与功能等价矩阵
```

根目录若仍有空的 `routes/`、`services/`，仅为历史残留，**不要**往那里加代码；后端代码在 `apps/api/`。

---

## Development Commands

前置：Node.js 24+、pnpm 11.9+、Python 3.10+。

```bash
pnpm install
python3 -m venv .venv
.venv/bin/pip install -r apps/api/requirements.txt

# 同时启动 Flask(5001) + Vite(5173)
pnpm dev
# 访问 http://localhost:5173 （Vite 代理 /api、/static、/healthz）

pnpm dev:api    # .venv/bin/python apps/api/app.py
pnpm dev:web
```

校验与构建：

```bash
pnpm check          # typecheck + lint + vitest + pytest(非 e2e) + build
pnpm typecheck
pnpm lint
pnpm test           # Vitest
pnpm test:api       # pytest，忽略 tests/e2e
pnpm test:e2e       # 先 build，再跑 Playwright E2E
pnpm build          # 生成契约类型 + Vue 产物到 apps/web/dist
```

生产镜像见根目录 `Dockerfile` 与 [`README.md`](README.md)。

---

## Architecture

### Backend（`apps/api`）

**入口**: [`apps/api/app.py`](apps/api/app.py)
- `create_app()` 配置 Flask、扩展、Blueprint、表结构与历史字段兼容迁移
- API 前缀 `/api/`；Session Cookie 认证（Flask-Login）
- 生产静态：优先 `apps/api/static/app`（镜像），否则 `apps/web/dist`
- History fallback：非 `/api`、`/static`、`/assets`、`/oauth`、`/external` 等返回 SPA `index.html`
- 健康检查：`GET /healthz`

**启动路径注意**：`pnpm`/`gunicorn` 以 `apps/api` 为工作目录，因此代码里是 `from routes import ...`、`from models import ...`，不是 `apps.api.routes`。

**API 路由** [`apps/api/routes/`](apps/api/routes/)：
- `auth.py` — 登录/注册/资料/忘记密码/重置密码（登录支持用户名或邮箱）
- `organizations.py` / `teams.py` / `projects.py`
- `sprints.py` — 迭代、工时、需求关联、看板
- `issues.py` / `requirements.py` / `bugs.py`
- `workbench.py` — 工作台
- `external.py` — 外部开放查询（OAuth2 client_credentials + JWT）
- `item_codes.py` / `input_utils.py` — 辅助逻辑

**Models** [`apps/api/models.py`](apps/api/models.py)：
`User`、`Organization`、`Team`、`Project`、`Sprint`、`Issue`、`Requirement`、`Bug`、各类 WorkLog / BugEvidence 等。模型均有 `to_dict()`。

**Extensions** [`apps/api/extensions.py`](apps/api/extensions.py)：`db`、`login_manager`、`mail`。

### Frontend（`apps/web`）

- 页面：`src/pages/**/index.vue`（小写连字符目录）
- 请求：`src/api/*.ts` 按领域导出具名函数；**不要**做聚合 `api` 对象
- 状态：Pinia 仅 `auth`、`theme` 等确需跨页共享的状态；页面数据留在页面/composable
- 路由：History；鉴权守卫与中文标题在 `src/router`
- 看板：`src/components/business/board`
- 样式：优先 Tailwind CSS 4 工具类；scoped/` :deep()` 仅用于第三方组件；设计令牌对齐 `design.md`

---

## Important Patterns

### Auth
1. 前端初始化调 `GET /api/auth/status`
2. Axios 带 Session Cookie；401 跳转登录（公开页除外）
3. 后端 `@login_required`；未授权返回 JSON 401

### Database
- 生产默认 MySQL，用 `DATABASE_URL` 覆盖
- `db.create_all()` + 若干 `ensure_*_schema()` 兼容历史列，勿随意删库“重置”生产数据
- 关系混用 `lazy='select'` / `lazy='dynamic'`，查成员时注意返回类型

### Kanban
- 需求泳道 × 状态列；任务与缺陷可判别联合类型
- 跨状态/跨泳道走现有更新接口；先乐观更新，失败回滚并重拉
- 同列排序仅会话内有效

### Dates
- 后端 `date`；前后端用 `YYYY-MM-DD` / `.isoformat()`

### Contracts
- 改 API 时同步 [`packages/api-contract/openapi.yaml`](packages/api-contract/openapi.yaml)
- 契约与实现冲突时，以**当前服务端行为**为准修正文档

---

## Adding New Features

### 新 API
1. 在 `apps/api/routes/` 对应领域模块加路由
2. 需要登录用 `@login_required`
3. 更新 `openapi.yaml`，必要时 `pnpm build` 刷新类型
4. 前端在 `apps/web/src/api/` 增加具名函数并调用

### 新页面
1. `apps/web/src/pages/<name>/index.vue`
2. 在 `src/router` 注册 History 路由与中文 `meta.title`
3. 复杂表单/详情用 Dialog，保持与现有业务弹窗习惯一致

### 新模型字段
1. 改 `apps/api/models.py` 与 `to_dict()`
2. 如需兼容旧库，在 `app.py` 增加 `ensure_*_schema()` 补列
3. 更新前端表单、展示与契约

---

## Configuration Notes

常用环境变量：`DATABASE_URL`、`SECRET_KEY`、`BUG_EVIDENCE_UPLOAD_DIR`、邮件相关、`APP_BASE_URL`、`FRONTEND_DIST_DIR`、`PORT`（本地默认 5001，Docker/Gunicorn 默认 5000）、`JWT_SECRET`、`OAUTH_CLIENTS`。

开发默认 `SECRET_KEY` / `JWT_SECRET` 仅为本地占位，生产必须覆盖。

---

## Testing

- **Flask**：`pnpm test:api` 或 `pytest`（`pytest.ini` 设置 `pythonpath = apps/api`）
- **Vue 单测**：`pnpm test`（Vitest）
- **E2E**：`pnpm test:e2e`（生产构建 + 隔离 Flask + Playwright）；说明见 [`tests/e2e/README.md`](tests/e2e/README.md)

旧原生 JS / `window.app` / Hash 路由相关测试与源码已清理，勿再按旧路径编写。

---

## 架构资料

- [`README.md`](README.md) — 本地开发与 Docker
- [`docs/architecture/pongcode-monorepo-target.md`](docs/architecture/pongcode-monorepo-target.md) — 已实施的目标架构
- [`docs/architecture/feature-parity-matrix.md`](docs/architecture/feature-parity-matrix.md) — 功能等价矩阵
- [`design.md`](design.md) — 视觉规范
- `docs/superpowers/` — 历史设计/实现计划快照，可能与现状不符，以代码与上述架构文档为准
