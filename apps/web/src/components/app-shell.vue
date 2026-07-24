<script setup lang="ts">
import {
  Bell,
  Briefcase,
  Collection,
  DataBoard,
  Expand,
  Fold,
  House,
  List,
  Menu as MenuIcon,
  Moon,
  MoreFilled,
  Operation,
  Postcard,
  Setting,
  Sunny,
  User,
  UserFilled,
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getOrganizations } from '@/api/organizations'
import type { Organization } from '@/api/types'
import { getUserAvatarColor } from '@/shared/avatar-color'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'

interface NavigationItem {
  label: string
  icon: unknown
  path?: string
  action?: 'teams'
  placeholder?: boolean
}

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const theme = useThemeStore()
const collapsed = ref(false)
const mobileOpen = ref(false)
const teamNavigationOpen = ref(false)
const teamNavigationLoading = ref(false)
const teamOrganizations = ref<Organization[]>([])

const orgId = computed(() => Number(route.params.orgId || 0))
const projectId = computed(() => Number(route.params.projectId || 0))
const isProject = computed(() => Boolean(projectId.value))
const avatarStyle = computed(() => {
  const color = getUserAvatarColor(auth.user?.username ?? '')

  return {
    backgroundColor: color.background,
    color: color.foreground,
  }
})

const mainItems = computed<NavigationItem[]>(() => [
  { label: '控制台', path: '/dashboard', icon: House },
  { label: '工作台', path: '/workbench', icon: Briefcase },
  { label: '团队', action: 'teams', icon: UserFilled },
])

const projectItems = computed<NavigationItem[]>(() => {
  if (!isProject.value)
    return []
  const prefix = `/organizations/${orgId.value}/projects/${projectId.value}`
  return [
    { label: '概览', icon: DataBoard, placeholder: true },
    { label: '规划', icon: Operation, placeholder: true },
    { label: '需求', icon: Postcard, path: `${prefix}/requirements` },
    { label: '缺陷', icon: Collection, path: `${prefix}/bugs` },
    { label: '工作项', icon: List, placeholder: true },
    { label: '迭代', icon: MenuIcon, path: `${prefix}/sprints` },
    { label: '看板', icon: DataBoard, path: `${prefix}/board` },
    { label: '发布', icon: MoreFilled, placeholder: true },
    { label: '基线', icon: Setting, placeholder: true },
  ]
})

const breadcrumbs = computed(() => {
  const items: Array<{ label: string; path?: string }> = [{ label: 'PongCode', path: '/dashboard' }]
  const title = String(route.meta.title || 'PongCode')
  if (projectId.value) {
    items.push(
      { label: '组织', path: '/organizations' },
      { label: '项目', path: `/organizations/${orgId.value}` },
      { label: title },
    )
    return items
  }
  if (route.path.startsWith('/organizations')) {
    items.push({ label: '组织', path: route.path === '/organizations' ? undefined : '/organizations' })
    if (route.path !== '/organizations')
      items.push({ label: title })
    return items
  }
  if (route.path.startsWith('/teams/')) {
    items.push({ label: '团队' }, { label: title })
    return items
  }
  if (route.path !== '/dashboard')
    items.push({ label: title })
  return items
})

async function openTeams() {
  teamNavigationLoading.value = true
  try {
    teamOrganizations.value = await getOrganizations()
    if (!teamOrganizations.value.length) {
      ElMessage.info('请先创建或加入一个组织')
      return
    }
    if (teamOrganizations.value.length === 1) {
      await router.push(`/organizations/${teamOrganizations.value[0]!.id}/teams`)
      return
    }
    teamNavigationOpen.value = true
  }
  catch {
    ElMessage.error('加载组织失败')
  }
  finally {
    teamNavigationLoading.value = false
  }
}

function selectTeamOrganization(organizationId: number) {
  teamNavigationOpen.value = false
  void router.push(`/organizations/${organizationId}/teams`)
}

function navigate(path?: string, placeholder?: boolean, action?: string) {
  if (placeholder) {
    ElMessage.info('功能开发中')
    return
  }
  if (action === 'teams') {
    void openTeams()
    mobileOpen.value = false
    return
  }
  if (path)
    void router.push(path)
  mobileOpen.value = false
}

async function logout() {
  await auth.logout()
  await router.replace('/login')
}
</script>

<template>
  <div
    class="grid min-h-screen bg-[var(--pc-page)] transition-[grid-template-columns] duration-[180ms] max-md:block"
    :class="collapsed
      ? 'grid-cols-[var(--pc-sidebar-collapsed)_minmax(0,1fr)]'
      : 'grid-cols-[var(--pc-sidebar-width)_minmax(0,1fr)]'"
  >
    <aside
      data-testid="desktop-sidebar"
      class="sticky top-0 flex h-screen min-w-0 flex-col border-r border-[var(--pc-border-soft)] bg-[var(--pc-sidebar)] max-md:hidden"
    >
      <div
        data-testid="sidebar-header"
        class="flex h-[var(--pc-header-height)] cursor-pointer items-center gap-2.5 border-b border-[var(--pc-border)] px-3 py-2"
        @click="navigate('/dashboard')"
      >
        <img src="/branding/pongcode-mark.png" alt="" class="h-9 w-9 shrink-0 object-contain" aria-hidden="true">
        <strong v-if="!collapsed" class="overflow-hidden text-[18px] font-semibold whitespace-nowrap text-[var(--pc-text)]">PongCode</strong>
      </div>
      <nav class="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-2" aria-label="主导航">
        <el-tooltip
          v-for="item in mainItems"
          :key="item.label"
          :content="item.label"
          :disabled="!collapsed"
          placement="right"
          :show-after="100"
        >
          <button
            type="button"
            data-testid="sidebar-navigation-item"
            class="flex min-h-10 w-full cursor-pointer items-center rounded-[6px] border-0 bg-transparent text-sm text-[var(--pc-text-secondary)] hover:bg-[var(--pc-surface-soft)] hover:text-[var(--pc-text)] data-[active=true]:bg-[color-mix(in_srgb,var(--pc-action)_9%,transparent)] data-[active=true]:font-semibold data-[active=true]:text-[var(--pc-action)]"
            :class="collapsed ? 'justify-center px-0' : 'gap-2.5 px-3 text-left'"
            :data-active="(route.path === item.path || (item.action === 'teams' && ['organization-teams', 'team-detail'].includes(String(route.name)))) || undefined"
            :aria-label="collapsed ? item.label : undefined"
            @click="navigate(item.path, false, item.action)"
          >
            <el-icon class="w-5 shrink-0 text-lg"><component :is="item.icon" /></el-icon>
            <span v-if="!collapsed">{{ item.label }}</span>
          </button>
        </el-tooltip>

        <div v-if="isProject" class="mx-1 my-2 h-px bg-[var(--pc-border-soft)]" />
        <p v-if="isProject && !collapsed" class="mt-0.5 mr-3 mb-1.5 ml-3 text-xs font-semibold text-[var(--pc-text-muted)]">
          当前项目
        </p>
        <el-tooltip
          v-for="item in projectItems"
          :key="item.label"
          :content="item.label"
          :disabled="!collapsed"
          placement="right"
          :show-after="100"
        >
          <button
            type="button"
            data-testid="sidebar-navigation-item"
            class="flex min-h-10 w-full cursor-pointer items-center rounded-[6px] border-0 bg-transparent text-sm text-[var(--pc-text-secondary)] hover:bg-[var(--pc-surface-soft)] hover:text-[var(--pc-text)] data-[active=true]:bg-[color-mix(in_srgb,var(--pc-action)_9%,transparent)] data-[active=true]:font-semibold data-[active=true]:text-[var(--pc-action)] data-[placeholder=true]:text-[var(--pc-text-muted)]"
            :class="collapsed ? 'justify-center px-0' : 'gap-2.5 px-3 text-left'"
            :data-active="Boolean(item.path && route.path === item.path) || undefined"
            :data-placeholder="item.placeholder || undefined"
            :aria-label="collapsed ? item.label : undefined"
            @click="navigate(item.path, item.placeholder)"
          >
            <el-icon class="w-5 shrink-0 text-lg"><component :is="item.icon" /></el-icon>
            <span v-if="!collapsed">{{ item.label }}</span>
          </button>
        </el-tooltip>
      </nav>
    </aside>

    <el-drawer v-model="mobileOpen" direction="ltr" size="288px" :with-header="false">
      <div class="flex h-[var(--pc-header-height)] cursor-pointer items-center gap-2.5 py-2">
        <img src="/branding/pongcode-mark.png" alt="" class="h-9 w-9 shrink-0 object-contain" aria-hidden="true">
        <strong class="overflow-hidden text-[18px] font-semibold whitespace-nowrap text-[var(--pc-text)]">PongCode</strong>
      </div>
      <nav class="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-2" aria-label="移动端主导航">
        <button
          v-for="item in mainItems"
          :key="item.label"
          type="button"
          class="flex min-h-10 w-full cursor-pointer items-center gap-2.5 rounded-[6px] border-0 bg-transparent px-3 text-left text-sm text-[var(--pc-text-secondary)] hover:bg-[var(--pc-surface-soft)] hover:text-[var(--pc-text)] data-[active=true]:bg-[color-mix(in_srgb,var(--pc-action)_9%,transparent)] data-[active=true]:font-semibold data-[active=true]:text-[var(--pc-action)]"
          :data-active="(route.path === item.path || (item.action === 'teams' && ['organization-teams', 'team-detail'].includes(String(route.name)))) || undefined"
          @click="navigate(item.path, false, item.action)"
        >
          <el-icon class="w-5 shrink-0 text-lg"><component :is="item.icon" /></el-icon>
          <span>{{ item.label }}</span>
        </button>
        <div v-if="isProject" class="mx-1 my-2 h-px bg-[var(--pc-border-soft)]" />
        <button
          v-for="item in projectItems"
          :key="item.label"
          type="button"
          class="flex min-h-10 w-full cursor-pointer items-center gap-2.5 rounded-[6px] border-0 bg-transparent px-3 text-left text-sm text-[var(--pc-text-secondary)] hover:bg-[var(--pc-surface-soft)] hover:text-[var(--pc-text)] data-[active=true]:bg-[color-mix(in_srgb,var(--pc-action)_9%,transparent)] data-[active=true]:font-semibold data-[active=true]:text-[var(--pc-action)] data-[placeholder=true]:text-[var(--pc-text-muted)]"
          :data-active="Boolean(item.path && route.path === item.path) || undefined"
          :data-placeholder="item.placeholder || undefined"
          @click="navigate(item.path, item.placeholder)"
        >
          <el-icon class="w-5 shrink-0 text-lg"><component :is="item.icon" /></el-icon>
          <span>{{ item.label }}</span>
        </button>
      </nav>
    </el-drawer>

    <div class="min-w-0">
      <header data-testid="app-header" class="sticky top-0 z-30 flex h-[var(--pc-header-height)] items-center justify-between gap-2 overflow-hidden border-b border-[var(--pc-border)] bg-[var(--pc-header)] px-[17px] max-md:pr-3 max-md:pl-2">
        <div class="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
          <button
            type="button"
            class="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-[6px] border-0 bg-transparent text-[var(--pc-text-secondary)] hover:bg-[var(--pc-surface-soft)] hover:text-[var(--pc-action)] md:hidden"
            aria-label="打开导航"
            @click="mobileOpen = true"
          >
            <el-icon><MenuIcon /></el-icon>
          </button>
          <el-tooltip :content="collapsed ? '展开侧栏' : '收起侧栏'" placement="bottom" :show-after="100">
            <button
              type="button"
              data-testid="desktop-sidebar-toggle"
              class="hidden h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-[6px] border-0 bg-transparent text-[var(--pc-text-secondary)] hover:bg-[var(--pc-surface-soft)] hover:text-[var(--pc-action)] md:grid"
              :aria-label="collapsed ? '展开侧栏' : '收起侧栏'"
              @click="collapsed = !collapsed"
            >
              <el-icon class="text-base"><Expand v-if="collapsed" /><Fold v-else /></el-icon>
            </button>
          </el-tooltip>
          <el-breadcrumb class="min-w-0 flex-1 overflow-hidden whitespace-nowrap" separator="/">
            <el-breadcrumb-item v-for="item in breadcrumbs" :key="`${item.label}-${item.path || ''}`" :to="item.path ? { path: item.path } : undefined">
              {{ item.label }}
            </el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="flex shrink-0 items-center gap-1 pr-1">
          <button
            type="button"
            data-testid="theme-toggle"
            class="grid h-10 w-10 cursor-pointer place-items-center rounded-[6px] border-0 bg-transparent p-0 text-[var(--pc-text-secondary)] hover:bg-[var(--pc-surface-soft)] hover:text-[var(--pc-action)]"
            :aria-label="theme.isDark ? '切换到亮色' : '切换到暗色'"
            @click="theme.toggle"
          >
            <el-icon :size="18"><Sunny v-if="theme.isDark" /><Moon v-else /></el-icon>
          </button>
          <el-badge data-testid="header-notification" class="pc-header-notification" :value="3" :max="99">
            <button
              type="button"
              class="grid h-10 w-10 cursor-pointer place-items-center rounded-[6px] border-0 bg-transparent p-0 text-[var(--pc-text-secondary)] hover:bg-[var(--pc-surface-soft)] hover:text-[var(--pc-action)]"
              aria-label="通知"
              @click="ElMessage.info('通知功能开发中')"
            >
              <el-icon :size="18"><Bell /></el-icon>
            </button>
          </el-badge>
          <el-dropdown trigger="click">
            <button
              type="button"
              data-testid="user-trigger"
              class="grid h-10 w-10 cursor-pointer place-items-center rounded-[6px] border-0 bg-transparent p-1 hover:bg-[var(--pc-surface-soft)]"
              aria-label="用户菜单"
            >
              <el-avatar :size="32" class="text-xs font-semibold" :style="avatarStyle">
                {{ auth.user?.username?.slice(0, 1).toUpperCase() }}
              </el-avatar>
            </button>
            <template #dropdown>
              <el-dropdown-menu>
                <div data-testid="account-summary" class="min-w-[200px] px-3 py-2">
                  <strong class="block truncate text-sm font-semibold text-[var(--pc-text)]">
                    {{ auth.user?.username || '未登录' }}
                  </strong>
                  <span class="mt-1 block truncate text-xs text-[var(--pc-text-muted)]">
                    {{ auth.user?.email || '暂无邮箱' }}
                  </span>
                </div>
                <el-dropdown-item :icon="User" @click="navigate('/profile')">
                  个人资料
                </el-dropdown-item>
                <el-dropdown-item :icon="Setting" @click="ElMessage.info('偏好设置功能开发中')">
                  偏好设置
                </el-dropdown-item>
                <el-dropdown-item divided @click="logout">
                  退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>
      <main class="min-h-[calc(100vh-var(--pc-header-height))]">
        <RouterView />
      </main>
    </div>

    <el-dialog
      v-model="teamNavigationOpen"
      title="选择组织"
      width="min(92vw, 520px)"
      append-to-body
      align-center
      :close-on-click-modal="false"
    >
      <div v-loading="teamNavigationLoading" class="grid gap-2">
        <button
          v-for="organization in teamOrganizations"
          :key="organization.id"
          type="button"
          class="flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-[8px] border border-[var(--pc-border)] bg-[var(--pc-surface)] px-[17px] text-left hover:border-[var(--pc-action)] hover:bg-[var(--pc-surface-soft)]"
          @click="selectTeamOrganization(organization.id)"
        >
          <span class="grid h-8 w-8 shrink-0 place-items-center rounded-[6px] bg-[color-mix(in_srgb,var(--pc-action)_12%,var(--pc-surface))] text-sm font-semibold text-[var(--pc-action)]">
            {{ organization.name.slice(0, 1) }}
          </span>
          <span class="min-w-0 flex-1 truncate text-sm font-medium">{{ organization.name }}</span>
        </button>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
.pc-header-notification :deep(.el-badge__content) {
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-width: 1px;
  font-size: 10px;
  line-height: 14px;
}

.pc-header-notification :deep(.el-badge__content.is-fixed) {
  top: 1px;
  right: 1px;
  transform: none;
}
</style>
