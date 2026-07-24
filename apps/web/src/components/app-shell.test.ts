import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import AppShell from './app-shell.vue'

const testState = vi.hoisted(() => ({
  route: {
    path: '/workbench',
    params: {},
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

vi.mock('vue-router', () => ({
  useRoute: () => testState.route,
  useRouter: () => ({
    push: testState.push,
    replace: testState.replace,
  }),
}))

vi.mock('@/api/organizations', () => ({
  getOrganizations: vi.fn().mockResolvedValue([]),
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
})
