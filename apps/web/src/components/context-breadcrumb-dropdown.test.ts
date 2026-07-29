import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { describe, expect, it } from 'vitest'
import ContextBreadcrumbDropdown from './context-breadcrumb-dropdown.vue'

const PassThroughStub = defineComponent({
  inheritAttrs: false,
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

function mountDropdown(
  optionCount: number,
  options?: Array<{ value: number; label: string; meta?: string; status?: string }>,
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
    },
    global: {
      stubs: {
        ElDropdown: PassThroughStub,
        ElDropdownItem: PassThroughStub,
        ElDropdownMenu: PassThroughStub,
        ElIcon: PassThroughStub,
        ElInput: InputStub,
        ElTooltip: PassThroughStub,
      },
    },
  })
}

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
})
