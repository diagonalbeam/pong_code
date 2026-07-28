import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AppShell from './app-shell.vue'

const testState = vi.hoisted(() => ({
  route: {
    path: '/workbench',
    params: {} as Record<string, string>,
    query: {} as Record<string, string>,
    meta: { title: '工作台' },
    name: 'workbench',
  },
  push: vi.fn(),
  replace: vi.fn(),
  toggleTheme: vi.fn(),
  user: {
    id: 1,
    username: 'guihaihuan',
    email: 'guihaihuan@example.com',
  },
}))

const apiMocks = vi.hoisted(() => ({
  getOrganization: vi.fn(),
  getOrganizations: vi.fn().mockResolvedValue([]),
  getProject: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRoute: () => testState.route,
  useRouter: () => ({
    push: testState.push,
    replace: testState.replace,
  }),
}))

vi.mock('@/api/organizations', () => ({
  getOrganization: apiMocks.getOrganization,
  getOrganizations: apiMocks.getOrganizations,
}))

vi.mock('@/api/projects', () => ({
  getProject: apiMocks.getProject,
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    user: testState.user,
    logout: vi.fn(),
  }),
}))

vi.mock('@/stores/theme', () => ({
  useThemeStore: () => ({
    isDark: false,
    toggle: testState.toggleTheme,
  }),
}))

const PassThroughStub = defineComponent({
  inheritAttrs: false,
  setup(_, { attrs, slots }) {
    return () => h('div', attrs, [slots.default?.(), slots.dropdown?.()])
  },
})

const ButtonStub = defineComponent({
  inheritAttrs: false,
  setup(_, { attrs, slots }) {
    return () => h('button', attrs, slots.default?.())
  },
})

const TooltipStub = defineComponent({
  props: {
    content: String,
    disabled: Boolean,
  },
  setup(props, { slots }) {
    return () => h('span', {
      'data-tooltip': props.content,
      'data-tooltip-disabled': String(props.disabled),
    }, slots.default?.())
  },
})

const BadgeStub = defineComponent({
  inheritAttrs: false,
  props: {
    offset: Array,
    value: [Number, String],
  },
  setup(props, { attrs, slots }) {
    return () => h('span', {
      ...attrs,
      'data-badge-offset': JSON.stringify(props.offset),
      'data-badge-value': String(props.value),
    }, slots.default?.())
  },
})

const AvatarStub = defineComponent({
  inheritAttrs: false,
  setup(_, { attrs, slots }) {
    return () => h('span', {
      ...attrs,
      'data-avatar': '',
    }, slots.default?.())
  },
})

function mountShell() {
  return mount(AppShell, {
    global: {
      stubs: {
        RouterView: PassThroughStub,
        ElAvatar: AvatarStub,
        ElBadge: BadgeStub,
        ElBreadcrumb: PassThroughStub,
        ElBreadcrumbItem: PassThroughStub,
        ElButton: ButtonStub,
        ElDialog: PassThroughStub,
        ElDrawer: PassThroughStub,
        ElDropdown: PassThroughStub,
        ElDropdownItem: PassThroughStub,
        ElDropdownMenu: PassThroughStub,
        ElIcon: PassThroughStub,
        ElTooltip: TooltipStub,
      },
      directives: {
        loading: {},
      },
    },
  })
}

describe('应用外壳', () => {
  beforeEach(() => {
    testState.route.path = '/workbench'
    testState.route.params = {}
    testState.route.query = {}
    testState.route.meta = { title: '工作台' }
    testState.route.name = 'workbench'
    testState.push.mockReset()
    apiMocks.getOrganization.mockReset()
    apiMocks.getProject.mockReset()
  })

  it('在顶栏控制侧栏，并在收起时居中菜单图标和展示菜单 Tooltip', async () => {
    const wrapper = mountShell()

    const headerToggle = wrapper.find('header [aria-label="收起侧栏"]')
    expect(headerToggle.exists()).toBe(true)
    expect(wrapper.find('aside > button[aria-label="收起侧栏"]').exists()).toBe(false)

    await headerToggle.trigger('click')

    const navigationButtons = wrapper.findAll('[data-testid="sidebar-navigation-item"]')
    expect(navigationButtons.length).toBeGreaterThan(0)
    for (const button of navigationButtons) {
      expect(button.classes()).toContain('justify-center')
      expect(button.classes()).toContain('px-0')
    }

    const tooltipLabels = wrapper
      .findAll('[data-tooltip]')
      .map(item => item.attributes('data-tooltip'))
    expect(tooltipLabels).toEqual(expect.arrayContaining(['控制台', '工作台', '团队']))
  })

  it('将通知 badge 收进容器，并只在下拉菜单展示用户名和邮箱', () => {
    const wrapper = mountShell()

    expect(wrapper.get('[data-testid="header-notification"]').classes()).toContain('pc-header-notification')

    const userTrigger = wrapper.get('[data-testid="user-trigger"]')
    expect(userTrigger.text()).not.toContain(testState.user.username)

    const accountSummary = wrapper.get('[data-testid="account-summary"]')
    expect(accountSummary.text()).toContain(testState.user.username)
    expect(accountSummary.text()).toContain(testState.user.email)

    const avatarStyle = wrapper.get('[data-avatar]').attributes('style')
    expect(avatarStyle).toContain('background-color: rgb(88, 86, 214)')
    expect(avatarStyle).toContain('color: rgb(255, 255, 255)')
  })

  it('先展示当前项目，再在下一行提供迭代切换', async () => {
    testState.route.path = '/organizations/1/projects/10/board'
    testState.route.params = { orgId: '1', projectId: '10' }
    testState.route.query = { sprint: '101' }
    testState.route.meta = { title: '看板' }
    testState.route.name = 'project-board'
    apiMocks.getOrganization.mockResolvedValue({
      projects: [
        { id: 10, name: '支付平台' },
        { id: 11, name: '消息中心' },
      ],
    })
    apiMocks.getProject.mockResolvedValue({
      active_sprint: { id: 101 },
      sprints: [
        { id: 101, name: '迭代 1' },
        { id: 102, name: '迭代 2' },
      ],
    })
    const wrapper = mountShell()
    await vi.waitFor(() => {
      expect(wrapper.get('[data-testid="sidebar-project-switcher"]').text()).toContain('支付平台')
    })

    expect(wrapper.get('[data-testid="sidebar-sprint-switcher"]').text()).toContain('迭代 1')
    expect(wrapper.get('[data-testid="sidebar-project-switcher-menu"]').text()).toContain('消息中心')
  })
})
