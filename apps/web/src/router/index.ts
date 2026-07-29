import { createRouter, createWebHistory, type RouteLocationNormalized } from 'vue-router'
import AppShell from '@/components/app-shell.vue'
import { useAuthStore } from '@/stores/auth'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/pages/auth/login/index.vue'),
    meta: { title: '登录', public: true },
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('@/pages/auth/register/index.vue'),
    meta: { title: '注册', public: true },
  },
  {
    path: '/forgot-password',
    name: 'forgot-password',
    component: () => import('@/pages/auth/forgot-password/index.vue'),
    meta: { title: '忘记密码', public: true },
  },
  {
    path: '/reset-password',
    name: 'reset-password',
    component: () => import('@/pages/auth/reset-password/index.vue'),
    meta: { title: '重置密码', public: true },
  },
  {
    path: '/',
    component: AppShell,
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: '/dashboard' },
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('@/pages/dashboard/index.vue'),
        meta: { title: '控制台', requiresAuth: true },
      },
      {
        path: 'workbench',
        name: 'workbench',
        component: () => import('@/pages/workbench/index.vue'),
        meta: { title: '工作台', requiresAuth: true },
      },
      {
        path: 'profile',
        name: 'profile',
        component: () => import('@/pages/profile/index.vue'),
        meta: { title: '个人资料', requiresAuth: true },
      },
      {
        path: 'organizations',
        name: 'organizations',
        component: () => import('@/pages/organizations/index.vue'),
        meta: { title: '组织', requiresAuth: true },
      },
      {
        path: 'organizations/:orgId',
        name: 'organization-detail',
        component: () => import('@/pages/organization-detail/index.vue'),
        meta: { title: '组织详情', requiresAuth: true },
      },
      {
        path: 'organizations/:orgId/members',
        name: 'organization-members',
        component: () => import('@/pages/organization-members/index.vue'),
        meta: { title: '组织成员', requiresAuth: true },
      },
      {
        path: 'organizations/:orgId/teams',
        name: 'organization-teams',
        component: () => import('@/pages/organization-teams/index.vue'),
        meta: { title: '团队', requiresAuth: true },
      },
      {
        path: 'teams/:teamId',
        name: 'team-detail',
        component: () => import('@/pages/team-detail/index.vue'),
        meta: { title: '团队详情', requiresAuth: true },
      },
      {
        path: 'organizations/:orgId/projects/:projectId/sprints',
        name: 'project-sprints',
        component: () => import('@/pages/project/sprints/index.vue'),
        meta: { title: '全部迭代', requiresAuth: true },
      },
      {
        path: 'organizations/:orgId/projects/:projectId/board',
        name: 'project-board',
        component: () => import('@/pages/project/board/index.vue'),
        meta: { title: '看板', requiresAuth: true },
      },
      {
        path: 'organizations/:orgId/projects/:projectId/requirements',
        name: 'project-requirements',
        component: () => import('@/pages/project/requirements/index.vue'),
        meta: { title: '需求', requiresAuth: true },
      },
      {
        path: 'organizations/:orgId/projects/:projectId/bugs',
        name: 'project-bugs',
        component: () => import('@/pages/project/bugs/index.vue'),
        meta: { title: '缺陷', requiresAuth: true },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/pages/not-found/index.vue'),
    meta: { title: '页面不存在', public: true },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach(async (to: RouteLocationNormalized) => {
  const resetToken = to.query.reset_token
  if (typeof resetToken === 'string')
    return { name: 'reset-password', query: { token: resetToken } }

  const auth = useAuthStore()
  if (!auth.initialized)
    await auth.restore()

  if (to.meta.requiresAuth && !auth.isAuthenticated)
    return { name: 'login', query: { redirect: to.fullPath } }

  if (to.meta.public && auth.isAuthenticated && ['login', 'register'].includes(String(to.name)))
    return { name: 'dashboard' }

  return true
})

router.afterEach((to) => {
  const title = typeof to.meta.title === 'string' ? to.meta.title : ''
  document.title = title ? `${title} · PongCode` : 'PongCode'
})

export default router
