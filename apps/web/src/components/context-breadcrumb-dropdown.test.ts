import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { afterEach, describe, expect, it } from 'vitest'
import ContextBreadcrumbDropdown from './context-breadcrumb-dropdown.vue'

const PassThroughStub = defineComponent({
  inheritAttrs: false,
  setup(_, { attrs, slots }) {
    return () => h('div', attrs, [slots.default?.(), slots.dropdown?.()])
  },
})

const DropdownStub = defineComponent({
  inheritAttrs: false,
  emits: ['visible-change', 'command'],
  setup(_, { attrs, slots }) {
    return () => h('div', attrs, [slots.default?.(), slots.dropdown?.()])
  },
})

const InputStub = defineComponent({
  inheritAttrs: false,
  props: {
    modelValue: String,
    placeholder: String,
  },
  emits: ['update:modelValue'],
  setup(props, { attrs, emit }) {
    return () => h('input', {
      ...attrs,
      value: props.modelValue,
      placeholder: props.placeholder,
      onInput: (event: Event) => emit('update:modelValue', (event.target as HTMLInputElement).value),
    })
  },
})

afterEach(() => {
  window.localStorage.clear()
})

function mountDropdown(
  optionCount: number,
  options?: Array<{ value: number; label: string; meta?: string; status?: string; group?: string }>,
  props?: Partial<{
    contextName: string
    label: string
    modelValue: number | null
    statusFilterOptions: Array<{ value: string; label: string }>
    defaultStatusFilter: string
    testId: string
  }>,
) {
  return mount(ContextBreadcrumbDropdown, {
    props: {
      contextName: '项目',
      label: '支付平台',
      modelValue: 1,
      options: options || Array.from({ length: optionCount }, (_, index) => ({
        value: index + 1,
        label: `项目 ${index + 1}`,
      })),
      manageLabel: '查看所有项目',
      emptyLabel: '暂无项目',
      testId: 'project-switcher',
      ...props,
    },
    global: {
      stubs: {
        ElDropdown: DropdownStub,
        ElDropdownItem: PassThroughStub,
        ElDropdownMenu: PassThroughStub,
        ElIcon: PassThroughStub,
        ElInput: InputStub,
        ElTooltip: PassThroughStub,
      },
    },
  })
}

const sprintStatusOptions = [
  { value: 'active', label: '进行中' },
  { value: 'open', label: '未开始' },
  { value: 'closed', label: '已完成' },
]

const sprintOptions = [
  { value: 1, label: '迭代 1', meta: '进行中', status: 'active' },
  { value: 2, label: '迭代 2', meta: '未开始', status: 'open' },
  { value: 3, label: '迭代 3', meta: '已完成', status: 'closed' },
]

describe('上下文面包屑下拉', () => {
  it('只有一个选项时仍保留切换入口、搜索框与管理入口', () => {
    const wrapper = mountDropdown(1)

    expect(wrapper.get('[data-testid="project-switcher"]').attributes('aria-label')).toBe('切换项目：支付平台')
    expect(wrapper.text()).toContain('项目 1')
    expect(wrapper.text()).toContain('查看所有项目')
    expect(wrapper.find('input[placeholder="搜索项目"]').exists()).toBe(true)
  })

  it('用状态 Tag 的颜色展示状态，并且当前项使用可点击的选中高亮', () => {
    const wrapper = mountDropdown(3, [
      { value: 1, label: '迭代 1', meta: '进行中', status: 'active' },
      { value: 2, label: '迭代 2', meta: '已完成', status: 'closed' },
      { value: 3, label: '迭代 3', meta: '未开始', status: 'open' },
    ])

    const current = wrapper.get('[data-testid="project-switcher-option-1"]')
    expect(current.attributes('aria-current')).toBe('true')
    expect(current.attributes('disabled')).toBeUndefined()
    expect(current.classes()).toContain('pc-context-menu__item--selected')
    expect(current.get('small').attributes('style')).toContain('var(--el-color-warning)')
    expect(current.find('svg').exists()).toBe(false)
    expect(wrapper.get('[data-testid="project-switcher-option-2"] small').attributes('style'))
      .toContain('var(--el-color-success)')
    expect(wrapper.get('[data-testid="project-switcher-option-3"] small').attributes('style'))
      .toContain('var(--el-color-info)')
  })

  it('通过常驻搜索框过滤结果', async () => {
    const wrapper = mountDropdown(9)
    const search = wrapper.get('input[placeholder="搜索项目"]')

    await search.setValue('项目 9')

    expect(wrapper.text()).toContain('项目 9')
    expect(wrapper.text()).not.toContain('项目 8')
  })

  it('按团队级联筛选选项，并支持继续搜索项目', async () => {
    const wrapper = mountDropdown(3, [
      { value: 1, label: '支付平台', group: '核心团队' },
      { value: 2, label: '订单中心', group: '核心团队' },
      { value: 3, label: '消息中心', group: '增长团队' },
    ])

    expect(wrapper.text()).toContain('核心团队')
    expect(wrapper.text()).toContain('增长团队')
    expect(wrapper.find('[data-testid="context-menu-team-list"]').exists()).toBe(true)

    await wrapper.get('[data-testid="project-switcher-team-增长团队"]').trigger('click')

    expect(wrapper.text()).toContain('增长团队')
    expect(wrapper.text()).toContain('消息中心')
    expect(wrapper.text()).not.toContain('支付平台')

    await wrapper.get('input[placeholder="搜索项目"]').setValue('消息')

    expect(wrapper.text()).toContain('消息中心')
    expect(wrapper.text()).not.toContain('订单中心')
  })

  it('状态标签默认展示指定状态，并支持多选切换', async () => {
    const wrapper = mountDropdown(0, sprintOptions, {
      contextName: '迭代',
      label: '迭代 1',
      statusFilterOptions: sprintStatusOptions,
      defaultStatusFilter: 'active',
      testId: 'sprint-switcher',
    })

    expect(wrapper.find('[data-testid="sprint-switcher-option-1"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="sprint-switcher-option-2"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="sprint-switcher-option-3"]').exists()).toBe(false)

    await wrapper.get('[data-testid="sprint-switcher-status-open"]').trigger('click')

    expect(wrapper.find('[data-testid="sprint-switcher-option-1"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="sprint-switcher-option-2"]').exists()).toBe(true)

    await wrapper.get('[data-testid="sprint-switcher-status-active"]').trigger('click')

    expect(wrapper.find('[data-testid="sprint-switcher-option-1"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="sprint-switcher-option-2"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="sprint-switcher-option-3"]').exists()).toBe(false)
  })

  it('状态筛选在打开关闭后保持用户选择，并缓存到新实例', async () => {
    const props = {
      contextName: '迭代',
      label: '迭代 1',
      statusFilterOptions: sprintStatusOptions,
      defaultStatusFilter: 'active',
      testId: 'sprint-switcher',
    }
    const wrapper = mountDropdown(0, sprintOptions, props)

    await wrapper.get('[data-testid="sprint-switcher-status-open"]').trigger('click')
    await wrapper.findComponent(DropdownStub).vm.$emit('visible-change', false)
    await wrapper.findComponent(DropdownStub).vm.$emit('visible-change', true)

    expect(wrapper.find('[data-testid="sprint-switcher-option-1"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="sprint-switcher-option-2"]').exists()).toBe(true)

    wrapper.unmount()

    const remount = mountDropdown(0, sprintOptions, props)
    expect(remount.find('[data-testid="sprint-switcher-option-1"]').exists()).toBe(true)
    expect(remount.find('[data-testid="sprint-switcher-option-2"]').exists()).toBe(true)
  })

  it('搜索与管理入口固定，中间列表区域可滚动', () => {
    const wrapper = mountDropdown(20)
    const menu = wrapper.get('[data-testid="project-switcher-menu"]')
    const body = wrapper.get('[data-testid="context-menu-scroll-body"]')

    expect(menu.classes()).toContain('pc-context-menu')
    expect(body.find('[data-testid="project-switcher-option-1"]').exists()).toBe(true)
    expect(wrapper.find('.pc-context-menu__header input[placeholder="搜索项目"]').exists()).toBe(true)
    expect(wrapper.find('.pc-context-menu__footer').text()).toContain('查看所有项目')
  })

  it('菜单滚轮在边界处阻止默认行为，避免带动外层滚动', async () => {
    const wrapper = mountDropdown(20)
    const menu = wrapper.get('[data-testid="project-switcher-menu"]')
    const body = wrapper.get('[data-testid="context-menu-scroll-body"]').element as HTMLElement

    Object.defineProperty(body, 'scrollHeight', { configurable: true, get: () => 400 })
    Object.defineProperty(body, 'clientHeight', { configurable: true, get: () => 200 })
    Object.defineProperty(body, 'scrollTop', {
      configurable: true,
      get: () => 0,
      set: () => undefined,
    })

    const event = new WheelEvent('wheel', { deltaY: -40, bubbles: true, cancelable: true })
    Object.defineProperty(event, 'composedPath', {
      value: () => [body, menu.element],
    })
    const prevented = !menu.element.dispatchEvent(event)

    expect(prevented).toBe(true)
  })
})
