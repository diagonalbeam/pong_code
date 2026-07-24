# PongCode 功能等价矩阵

状态：迁移完成
更新日期：2026-07-23

本矩阵用于约束 Vue 前端重构。事实优先级为：当前有效业务行为与已确认要求、服务端实现、可复现浏览器行为、自动化测试。测试与真实行为冲突时需要审查测试，不能为了通过旧测试复刻失效实现。

## 1. 基线测试

| 范围 | 基线结果 | 说明 |
| --- | --- | --- |
| 旧前端 Node 源码测试 | 基线 65/65 通过，迁移后删除 | 这些用例只匹配旧全局对象和源码字符串；业务语义由 Vue 单测、E2E 和 Flask 测试承接 |
| Vue Vitest | 4/4 通过 | 覆盖看板状态映射、统计和本地存储键 |
| 后端非 E2E pytest | 36/36 通过 | 基线失败源于测试辅助函数漏返回登录用户 ID；只修正测试数据准备，没有改服务端逻辑 |
| Playwright E2E | 5/5 通过 | 生产构建下验证认证、组织、旧导航习惯、History、主题、移动端、迭代行跳转、详情弹窗、整卡拖拽、缺陷状态和证据 |

## 2. 认证与账号

| 行为 | API | 前端验收 |
| --- | --- | --- |
| 查询登录状态 | `GET /api/auth/status` | 未登录进入登录页；已登录恢复用户状态；响应不缓存 |
| 登录 | `POST /api/auth/login` | 支持用户名或邮箱、记住登录；失败显示原错误 |
| 注册 | `POST /api/auth/register` | 成功后不自动登录 |
| 退出 | `GET /api/auth/logout` | 清理用户状态并进入登录页 |
| 查看个人资料 | `GET /api/auth/profile` | 展示当前用户名和邮箱 |
| 修改个人资料 | `PUT /api/auth/profile` | 成功后同步顶栏和 Store |
| 忘记密码 | `POST /api/auth/forgot-password` | 无论邮箱是否存在都显示相同成功反馈 |
| 验证重置 Token | `POST /api/auth/verify-reset-token` | 兼容旧 `reset_token` 查询参数 |
| 重置密码 | `POST /api/auth/reset-password` | 展示过期、非法、账号不存在等原错误 |

## 3. 组织与团队

| 行为 | API | 前端验收 |
| --- | --- | --- |
| 组织列表 | `GET /api/organizations` | 展示本人拥有和加入的组织 |
| 创建组织 | `POST /api/organizations` | 创建者自动为 owner/admin |
| 加入组织 | `POST /api/organizations/join` | 按精确组织名加入 |
| 组织详情 | `GET /api/organizations/:id` | 展示项目、团队和管理权限 |
| 删除组织 | `DELETE /api/organizations/:id` | 仅 owner 可见；确认文案说明级联范围 |
| 组织成员 | `GET /api/organizations/:id/members` | 展示成员与角色 |
| 团队列表 | `GET /api/organizations/:id/teams` | 展示组织团队 |
| 创建团队 | `POST /api/organizations/:id/teams` | owner/admin 可用；创建者成为 leader |
| 团队详情 | `GET /api/teams/:id` | 展示团队、组织、成员和角色 |
| 加入团队 | `POST /api/teams/:id/join` | 组织成员可以加入 |
| 离开团队 | `POST /api/teams/:id/leave` | 当前成员可以离开 |
| 添加团队成员 | `POST /api/teams/:id/members` | owner 或 leader 可添加组织成员并选择角色 |

## 4. 项目

| 行为 | API | 前端验收 |
| --- | --- | --- |
| 创建项目 | `POST /api/organizations/:orgId/projects` | 团队必填；记住组织最近选择的团队 |
| 项目详情 | `GET /api/projects/:id` | 恢复组织、活动迭代、全部迭代和 backlog |
| 编辑项目 | `PUT /api/projects/:id` | owner/admin 可见；支持名称、描述、团队 |
| 删除项目 | `DELETE /api/projects/:id` | owner/admin 可见；确认文案说明级联范围 |
| 项目筛选 | 客户端 | 实时名称搜索、团队筛选、每用户/组织持久化 |

## 5. 迭代

| 行为 | API | 前端验收 |
| --- | --- | --- |
| 创建迭代 | `POST /api/projects/:projectId/sprints` | 名称、日期、状态、类别、负责人、描述、目标 |
| 查看迭代详情 | `GET /api/sprints/:id` | 详情、工时、需求页签和 `can_delete` |
| 编辑迭代 | `PUT /api/sprints/:id` | 所有现有字段可修改 |
| 删除迭代 | `DELETE /api/sprints/:id` | 仅允许的用户可见；保留级联语义 |
| 登记迭代工时 | `POST /api/sprints/:id/worklogs` | 日期、小时、说明 |
| 读取关联需求 | `GET /api/sprints/:id/requirements` | 展示当前关联需求 |
| 替换关联需求 | `PUT /api/sprints/:id/requirements` | 全量替换并保留服务端状态副作用 |
| 列表筛选 | 客户端 | 名称、状态、负责人实时筛选 |

## 6. 需求

| 行为 | API | 前端验收 |
| --- | --- | --- |
| 需求列表 | `GET /api/projects/:projectId/requirements` | 搜索标题/内容；状态和优先级筛选 |
| 创建需求 | `POST /api/projects/:projectId/requirements` | 标题、内容、优先级 1–5、交付日期、状态 |
| 需求详情 | `GET /api/requirements/:id` | 展示所有现有字段 |
| 编辑需求 | `PUT /api/requirements/:id` | 保留原字段和错误反馈 |
| 删除需求 | `DELETE /api/requirements/:id` | 仅允许的用户可见 |
| 需求统计 | `GET /api/projects/:projectId/requirements/stats` | 状态和优先级统计 |

## 7. 任务与工时

| 行为 | API | 前端验收 |
| --- | --- | --- |
| 创建任务 | `POST /api/projects/:projectId/issues` | 未选负责人时保留服务端默认行为 |
| 任务详情 | `GET /api/issues/:id` | 详情和工时页签 |
| 编辑任务 | `PUT /api/issues/:id` | 标题、描述、优先级 1–5、工时、状态、需求、负责人 |
| 删除任务 | `DELETE /api/issues/:id` | 确认后删除任务及工时 |
| 登记任务工时 | `POST /api/issues/:id/worklogs` | 日期、小时、说明 |
| 删除任务工时 | `DELETE /api/issues/:id/worklogs/:worklogId` | 只对服务端允许的记录显示 |
| 移动任务状态 | `PUT /api/issues/:id` | 看板拖拽和菜单移动同时更新状态与需求；原 `/move` 接口保留 |
| 分配迭代 | `POST /api/issues/:id/assign_sprint` | 支持分配和移出迭代 |
| 搜索用户 | `GET /api/users/search` | 如实使用当前返回的全系统用户 |

## 8. 缺陷、证据与工时

| 行为 | API | 前端验收 |
| --- | --- | --- |
| 缺陷列表 | `GET /api/projects/:projectId/bugs` | 搜索标题、描述、编码；状态、严重度、负责人筛选 |
| 创建缺陷 | `POST /api/projects/:projectId/bugs` | 保留现有字段白名单 |
| 缺陷详情 | `GET /api/bugs/:id` | 详情、工时、证据时间线 |
| 编辑缺陷 | `PUT /api/bugs/:id` | 保留历史字段兼容展示 |
| 删除缺陷 | `DELETE /api/bugs/:id` | 仅允许的用户可见 |
| 添加证据 | `POST /api/bugs/:id/evidences` | multipart；说明、堆栈、最多 5 张图、每张 5MB |
| 登记缺陷工时 | `POST /api/bugs/:id/worklogs` | 日期、小时、说明 |
| 删除缺陷工时 | `DELETE /api/bugs/:id/worklogs/:worklogId` | 只对服务端允许的记录显示 |
| 缺陷统计 | `GET /api/projects/:projectId/bugs/stats` | 状态与严重度统计 |
| 两阶段创建 | 两个接口 | 主缺陷先创建；首次证据失败时不得重复创建缺陷 |
| 历史状态 | 序列化兼容 | `resolved` 继续按“已修复”展示和统计 |

## 9. 工作台

| 行为 | API | 前端验收 |
| --- | --- | --- |
| 日期范围 | `GET /api/workbench?start_date=&end_date=` | 默认当天；支持范围选择 |
| 工时汇总 | 同上 | 展示任务、缺陷、迭代工时及每日汇总 |
| 待办任务 | 同上 | 本人负责且状态为 todo/doing |
| 待办缺陷 | 同上 | 本人负责或报告且未终结 |
| 快捷操作 | 现有详情/工时 API | 编辑、登记工时、跳转迭代看板 |

## 10. 看板

| 行为 | API/存储 | 前端验收 |
| --- | --- | --- |
| 看板数据 | `GET /api/projects/:projectId/board?sprint_id=` | 需求泳道、未分类泳道、任务/缺陷混排 |
| 切换迭代 | 查询参数 | 指定迭代；未指定时保留服务端首个 active 行为 |
| 切换迭代状态 | `PUT /api/sprints/:id` | 更新失败时恢复控件 |
| 跨状态拖拽 | 任务/缺陷现有更新接口 | 整张卡片均可拖动，编辑和移动按钮除外；拖动中显示随指针移动的卡片副本，并保留任务与缺陷状态映射 |
| 跨需求泳道 | 任务/缺陷现有更新接口 | 更新 `requirement_id` |
| 同列排序 | 客户端 | 当前会话可调整，刷新后恢复 |
| 隐藏已完成 | localStorage | 全局持久化 |
| 泳道折叠 | localStorage | 每用户/项目/迭代持久化 |
| 快捷创建 | 现有创建接口 | 泳道内创建任务并默认关联需求 |
| 详情和工时 | 现有详情接口 | 双击卡片或点击编辑按钮打开 Dialog；保留旧前端弹窗习惯并支持快捷工时 |
| 无障碍移动 | 现有更新接口 | 菜单选择目标状态和需求泳道 |

## 11. 非业务路由和生产行为

| 行为 | 验收 |
| --- | --- |
| `/healthz` | 保留数据库连通检查和 200/503 语义 |
| `/favicon.ico` | 保留当前无内容响应 |
| `/hybridaction/:path` | 保留 204 |
| `/static/uploads/*` | 地址、文件和部署方式保持不变 |
| History 深链接 | 登录页及所有业务路由直接请求均返回 SPA |
| 默认入口 | Flask 只提供新 Vue 前端；旧运行时 CDN 和原生 JS SPA 已清理 |

## 12. 最终验证记录

| 验证项 | 结果 |
| --- | --- |
| `pnpm typecheck` | 通过 |
| `pnpm lint` | 通过 |
| `pnpm test` | 4/4 通过 |
| `pnpm test:api` | 36/36 通过 |
| `pnpm build` | 通过；仅保留 Element Plus 主包体积警告 |
| `pytest tests/e2e` | 5/5 通过；整卡拖拽用例额外连续执行 3 次通过 |
| 前端结构静态审计 | 通过；页面均为小写连字符目录下的 `index.vue`，API 按领域导出具名函数，无聚合 API 对象和旧路由兼容实现 |
| Tailwind 样式审计 | 通过；页面和业务组件使用 Tailwind CSS 4 工具类，仅为第三方组件 `:deep()` 和 SortableJS 运行时状态类保留必要覆盖 |
| 页面标题 | 通过；所有页面路由声明中文标题，浏览器统一显示“页面名 · PongCode” |
| Flask History/系统路径 | `/`、`/login`、业务深链 200；未知 `/api`、`/assets` 404；`/healthz` 200 |
| 真实浏览器桌面/移动 | 通过；旧“团队”导航在多组织时打开选择弹窗，迭代行进入看板、编辑打开弹窗，整卡从待处理拖到进行中，浏览器控制台无错误 |
| Docker 镜像 | 通过；最新镜像 `pongcode:codex-drag-verify`（`sha256:53d28a9261dc...`），多阶段构建、Gunicorn、健康检查、History 深链、最新拖拽样式、认证和组织创建均正常 |
