# PongCode 前后端分离 Monorepo 改造规格

状态：已实施
确认日期：2026-07-23
文档校对：2026-07-29（内容仍为改造规格与验收记录；日常开发请同时参考根目录 README / CLAUDE.md / AGENTS.md）

## 1. 目标

将现有 Flask 同源应用重构为前后端代码分离的 Monorepo，在开发阶段分别运行 Vue 和 Flask，在生产阶段由 Docker 构建 Vue 静态资源并由 Flask/Gunicorn 同源提供页面、API 和现有上传附件。

改造必须保留当前有效业务能力、接口结构、权限判断、数据库配置、附件处理和隐含计算。前端技术、页面结构、样式和交互可以现代化；服务端业务实现不在本次重构范围内。

## 2. 目标目录

```text
apps/
  api/
    app.py
    extensions.py
    models.py
    routes/
    services/
    requirements.txt
    static/
  web/
    src/
      pages/
        dashboard/
          index.vue
        project/
          board/
            index.vue
      components/
        business/
      api/
        auth.ts
        organizations.ts
        projects.ts
      shared/
      router/
      stores/
      styles/
packages/
  api-contract/
```

目录职责：

- `apps/api`：原 Flask 后端。保持扁平结构，仅调整位置、导入、静态构建产物路径和 History fallback。
- `apps/web`：Vue 3 SPA。
- `apps/web/src/pages`：路由页面；每个页面使用小写连字符目录和 `index.vue`。
- `apps/web/src/components`：跨页面通用 Vue 组件。
- `apps/web/src/components/business`：看板卡片、工时、缺陷证据等业务组件。
- `apps/web/src/api`：Axios 实例和按领域划分的具名请求函数；不导出聚合对象。
- `apps/web/src/shared`：DTO 之外的通用类型、常量、工具函数和 composable。
- `apps/web/src/router`：History 路由、鉴权守卫和浏览器标题。
- `apps/web/src/stores`：用户、导航上下文、主题及需跨页面共享的状态。
- `apps/web/src/styles`：设计令牌、Element Plus 覆盖、亮暗主题和全局样式。
- `packages/api-contract`：现有 Flask API 的 OpenAPI 描述和生成的 TypeScript DTO。

## 3. 技术栈

实施时从包仓库选择最新稳定版本，不使用 beta、RC 或 `next` 版本，最终精确版本由 `pnpm-lock.yaml` 锁定。

- Vue 3
- Element Plus
- Vite 8
- TypeScript
- Tailwind CSS 4
- pnpm workspace

> 版本说明：除 TypeScript 外均使用实施时的最新稳定版。TypeScript 7.0.2
> 已发布，但最新版 `vue-tsc@3.3.8` 尚不能加载其编译器导出，因此暂时使用
> Vue 官方类型检查工具支持的最新 TypeScript 5 稳定版 `5.9.3`。待
> `vue-tsc` 正式支持 TypeScript 7 后再独立升级，不以跳过 Vue SFC 类型检查为代价。
- Vue Router，History 模式
- Pinia
- Axios
- SortableJS，直接封装为 Vue 业务组件
- Vitest + Vue Test Utils
- Playwright
- pytest + Flask test client
- vue-tsc
- Oxlint

不再使用运行时 CDN。Flatpickr 由 Element Plus 日期组件替代，Font Awesome 由本地安装的图标组件替代，未实际使用的 Chart.js 删除。

## 4. 服务端边界

以下内容必须保持现状：

- 数据库配置及环境变量注入逻辑。
- Flask-Login Session Cookie 认证。
- `/api/*` 的路径、方法、请求字段、响应字段和状态码。
- 现有权限及访问判断，包括当前实现中可能存在的安全缺陷。
- 模型、关联关系、序列化字段和隐含计算。
- 缺陷证据两阶段提交、附件路径和上传目录。
- 项目、组织、迭代删除时的级联及文件清理。
- 当前错误文案及不统一的 API envelope。

本次允许的服务端改动仅包括：

- 将文件迁移到 `apps/api`。
- 调整迁移后必要的导入和启动路径。
- 让 Flask 提供 `apps/web` 的生产构建产物。
- 为 Vue Router History 模式提供非系统路径的 `index.html` fallback。

OpenAPI 文件描述现有行为，不驱动服务端重写。契约与代码不一致时，以当前服务端实际行为为准修正文档。

## 5. 前端结构与状态

- Vue Router 管理页面地址和鉴权。
- Pinia 只保存用户、组织/项目导航上下文、主题和确需跨页面共享的状态。
- 页面数据由页面或业务 composable 管理，不集中塞入全局 Store。
- Axios 统一处理 Session Cookie、HTTP 401 和错误信息。
- 前端执行必填、格式、长度、范围和关联字段即时验证，服务端仍是最终裁决。
- API 错误优先显示后端具体文案。

需要继续兼容的 localStorage 偏好：

- 每个组织最近一次创建项目时选择的团队。
- 每个用户、组织的项目团队筛选。
- 看板全局“隐藏已完成”开关。
- 每个用户、项目、迭代的泳道折叠状态。
- 用户选择的亮暗主题。

## 6. 路由

新路由使用 History 模式：

```text
/login
/register
/forgot-password
/reset-password
/dashboard
/workbench
/profile
/organizations
/organizations/:orgId
/organizations/:orgId/members
/organizations/:orgId/teams
/teams/:teamId
/organizations/:orgId/projects/:projectId/sprints
/organizations/:orgId/projects/:projectId/board
/organizations/:orgId/projects/:projectId/requirements
/organizations/:orgId/projects/:projectId/bugs
```

路由要求：

- 不保留旧 Hash 地址和缺少组织上下文的项目短路径兼容路由。
- 原 `/?reset_token=...` 密码重置地址继续有效。
- 新页面接受 `/reset-password?token=...`。
- Flask 对非 `/api`、`/static`、`/healthz`、`/favicon.ico` 和 `/hybridaction` 的页面地址返回 SPA `index.html`。

## 7. 视觉与交互

以仓库根目录 `design.md` 为视觉规范来源，以 `/Users/hefty/lizhi/push-admin` 为应用壳和后台布局参考。

硬性原则：

- 使用设计文档中的颜色、字体、间距、圆角、焦点、按压反馈和低阴影体系。
- 页面和业务组件直接使用 Tailwind CSS 4 工具类，不定义语义样式 class；
  scoped style 仅用于无法通过模板工具类覆盖的 `:deep()` 第三方组件样式；
  SortableJS 动态注入的拖拽状态类允许在全局样式中集中定义。
- 前端文件与目录统一使用小写字母，多个单词使用连字符。
- 管理后台不强行使用营销页面的摄影 Hero、商品展陈和超大留白。
- 桌面端使用可折叠侧栏、顶栏和独立滚动内容区。
- 移动端侧栏使用 Drawer。
- 保留工作台、组织、项目三级导航上下文。
- 交互主色使用 Action Blue；业务状态允许使用受控语义色。
- 支持亮色和暗色。首次跟随系统，人工选择后持久化。
- 产品文案统一中文，不引入国际化。
- 列表首次加载使用骨架或区域 Loading，提交使用局部 Loading。
- 空状态只展示当前用户有权限执行的主操作。
- 键盘可操作、焦点可见、触控目标不小于 44px，并尊重 `prefers-reduced-motion`。

页面模式：

- 控制台、组织、团队、项目使用卡片和概览布局。
- 迭代、需求、缺陷、工作台明细使用响应式表格。
- 窄屏下表格转换为字段精简的卡片列表。
- 创建、编辑使用 Dialog。
- 任务、迭代、需求、缺陷等复杂详情使用 Dialog，保持旧前端的弹窗习惯，
  并保留详情、工时、需求、证据页签。
- 暂未实现的入口继续保留原有反馈，可以重做 UI，不删除或伪造实际能力。

## 8. 看板

看板使用 SortableJS 直接封装，封装位于 `components/business/board`。

- 每个“需求泳道 × 状态列”是独立拖拽列表，共用同一个 group。
- 任务与缺陷使用可判别联合类型。
- 跨状态和跨需求泳道调用当前对应的任务或缺陷接口。
- 先乐观更新本地状态；失败时回滚快照、重新拉取看板并显示错误。
- 同列排序只在当前会话生效，刷新后恢复服务端顺序。
- 整张卡片都可作为拖拽区域；编辑和移动按钮通过 SortableJS `filter` 排除，
  触屏长按卡片后拖动。
- 拖动时使用 fallback 副本随指针移动，并提供阴影、轻微缩放、占位和列内
  排序动画；副本不得对位移 `transform` 添加过渡，以免产生追帧延迟。
- 双击卡片主体或点击编辑按钮打开详情 Dialog。
- 卡片操作菜单提供状态和泳道移动，作为键盘及移动端替代操作。
- 移动端泳道纵向排列，泳道内状态列横向滚动。
- 不新增持久化排序接口。

## 9. 生产构建

Docker 使用多阶段构建：

1. Node/pnpm 阶段安装依赖并构建 `apps/web/dist`。
2. 将构建结果复制到 Python 镜像的 `apps/api/static/app`。
3. 最终镜像只保留 Python 运行环境。
4. Gunicorn 继续监听 `5000` 并保留 `/healthz`。

本地 Vite 构建只写入 `apps/web/dist`，不得直接清理后端 `static`，避免误删 `static/uploads`。上传目录继续使用当前部署和持久化方式。

## 10. 迁移顺序

1. Monorepo、构建、设计令牌、请求层、路由、主题和应用壳。
2. 登录、注册、忘记密码、重置密码和个人资料。
3. 控制台和工作台。
4. 组织、成员和团队。
5. 项目和迭代。
6. 需求和任务。
7. 缺陷、证据和工时。
8. 看板及拖拽。
9. 响应式、暗色、生产部署和完整回归。

迁移期间旧前端曾保持默认生产入口可用；新前端通过验收后，Flask
入口已切换到 Vue 构建产物，旧前端源码、运行时 CDN 和旧构建配置已经清理。

## 11. 完成定义

完成必须同时满足：

- 功能等价矩阵中的所有有效行为有当前证据。
- 所有现有 API 被契约描述并由新前端正确调用。
- 后端有效测试继续通过。
- 过时测试已基于事实更新或删除并记录原因。
- 新前端类型检查、Lint、单元测试和生产构建通过。
- Playwright 关键流程通过。
- 登录、组织、团队、项目、迭代、需求、任务、缺陷、工时、附件和看板完成新旧浏览器对照。
- 亮暗主题、桌面和移动布局完成浏览器验证。
- Flask 直接访问任意 History 深链接可以返回新前端。
- Docker 镜像构建并按现有运行契约启动。
- 旧前端已在最终切换后清理，上传附件目录未删除或覆盖。

## 12. 实施验收

2026-07-23 的本地验收结果：

- Vue 类型检查、Oxlint、Vitest 和生产构建通过。
- Flask 非 E2E 测试 36/36 通过。
- 新 Playwright E2E 5/5 通过，覆盖认证、History 深链、主题、移动端、
  页面标题、旧项目短路径移除、旧团队导航、迭代行跳转与编辑弹窗、
  看板菜单移动、整卡拖拽跟随和缺陷证据。
- 前端结构静态审计通过：页面均为小写连字符目录下的 `index.vue`；API
  按领域导出具名函数；不存在聚合 API 对象、旧 Hash 路由或无组织上下文的
  项目兼容路由。
- Tailwind CSS 4 样式审计通过：页面和业务组件直接使用工具类，仅保留
  Element Plus 等第三方组件的 `:deep()` 和 SortableJS 运行时状态覆盖。
- Flask 测试客户端验证页面深链返回 SPA，未知 API 和资源保持 404。
- 真实浏览器完成组织、团队、项目、迭代、需求、任务、工时、缺陷、证据、
  看板、亮暗主题和 390px 移动布局回归；并验证旧“团队”导航弹窗、迭代行
  进入看板、编辑弹窗、整卡拖拽从待处理移动到进行中，浏览器控制台无错误；
  移动看板列区域
  `clientWidth=364`、`scrollWidth=828`、`overflow-x=auto`。
- Docker Desktop 29.6.1 实测最新源码的多阶段镜像构建通过，验证镜像为
  `pongcode:codex-drag-verify`（镜像 ID `sha256:53d28a9261dc...`）。
- 镜像以 Gunicorn 启动后健康检查为 `healthy`，无重启、无 OOM；使用容器内
  隔离 SQLite 验证了认证、组织、团队、项目、迭代、需求、任务、工时、缺陷、
  证据、统计和看板接口。
- 最新镜像的 History 看板深链返回 SPA，构建 CSS 包含
  `board-drag-fallback` 跟随态；注册、登录和组织创建再次通过。
- Chromium 直接访问容器中的生产静态产物，验证了注册登录、组织创建、History
  深链刷新和旧项目短路径移除；结合当前 Playwright 回归验证了亮暗主题、
  390px 移动布局、看板移动和缺陷证据，浏览器控制台无错误。
- `/`、`/login`、业务深链和构建资源返回正确内容；未知 `/api`、`/assets`
  保持 404，`/favicon.ico` 与 `/hybridaction/*` 保持原有响应。
- 生产构建保留 Vite 对 Element Plus 主包超过 500 kB 的体积警告。一次手工
  Rolldown 分组曾在浏览器中产生依赖顺序错误，已撤销；后续应通过按需组件导入
  单独优化，不以运行正确性换取无警告构建。
