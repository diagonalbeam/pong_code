import type { Component, ComputedRef, PropType } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { computed, defineComponent, h, inject, provide } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import BugsPage from './bugs/index.vue'
import RequirementsPage from './requirements/index.vue'

const apiMocks = vi.hoisted(() => ({
  getBugs: vi.fn(),
  getBugStats: vi.fn(),
  getRequirements: vi.fn(),
  getRequirementStats: vi.fn(),
  getUsers: vi.fn(),
  loadProject: vi.fn(),
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    error: vi.fn(),
  },
}))

vi.mock('@/api/bugs', () => ({
  getBugs: apiMocks.getBugs,
  getBugStats: apiMocks.getBugStats,
}))

vi.mock('@/api/requirements', () => ({
  getRequirements: apiMocks.getRequirements,
  getRequirementStats: apiMocks.getRequirementStats,
}))

vi.mock('@/api/users', () => ({
  getUsers: apiMocks.getUsers,
}))

vi.mock('@/shared/use-project-context', async () => {
  const { ref } = await import('vue')
  return {
    useProjectContext: () => ({
      projectId: ref(1),
      details: ref({
        project: { id: 1, name: 'PongCode' },
        sprints: [],
      }),
      loadProject: apiMocks.loadProject,
    }),
  }
})

const TABLE_ROW_KEY = 'table-dialog-affordance-row'

const PassThroughStub = defineComponent({
  inheritAttrs: false,
  setup(_, { attrs, slots }) {
    return () => h('div', attrs, slots.default?.())
  },
})

const ButtonStub = defineComponent({
  inheritAttrs: false,
  setup(_, { attrs, slots }) {
    return () => h('button', attrs, slots.default?.())
  },
})

const TableStub = defineComponent({
  props: {
    data: {
      type: Array as PropType<Record<string, unknown>[]>,
      default: () => [],
    },
  },
  setup(props, { slots }) {
    provide(TABLE_ROW_KEY, computed(() => props.data[0]))
    return () => h('div', { 'data-testid': 'table-stub' }, slots.default?.())
  },
})

const TableColumnStub = defineComponent({
  props: {
    label: String,
    prop: String,
  },
  setup(props, { slots }) {
    const row = inject<ComputedRef<Record<string, unknown> | undefined>>(TABLE_ROW_KEY)
    return () => h('section', {
      'data-column-label': props.label,
    }, slots.default?.({ row: row?.value }) ?? String(row?.value?.[props.prop || ''] ?? ''))
  },
})

function detailDialogStub(testid: string) {
  return defineComponent({
    props: {
      modelValue: Boolean,
    },
    setup(props) {
      return () => h('div', {
        'data-testid': testid,
        'data-open': String(props.modelValue),
      })
    },
  })
}

function mountPage(component: Component) {
  return mount(component, {
    global: {
      stubs: {
        BugDialog: true,
        BugViewDialog: detailDialogStub('bug-view-dialog'),
        BugDetailDialog: detailDialogStub('bug-detail-dialog'),
        ElButton: ButtonStub,
        ElIcon: PassThroughStub,
        ElInput: PassThroughStub,
        ElOption: PassThroughStub,
        ElSelect: PassThroughStub,
        ElTable: TableStub,
        ElTableColumn: TableColumnStub,
        EmptyState: PassThroughStub,
        PageHeader: PassThroughStub,
        Plus: true,
        RequirementDialog: true,
        RequirementDetailDialog: detailDialogStub('requirement-detail-dialog'),
        Search: true,
        StatCard: true,
        StatusTag: PassThroughStub,
      },
      directives: {
        loading: {},
      },
    },
  })
}

describe('详情表格的明确操作入口与溢出提示', () => {
  beforeEach(() => {
    for (const mock of Object.values(apiMocks))
      mock.mockReset()

    apiMocks.loadProject.mockResolvedValue(undefined)
    apiMocks.getUsers.mockResolvedValue([])
    apiMocks.getRequirementStats.mockResolvedValue({
      total: 1,
      pending: 0,
      in_progress: 1,
      testing: 0,
      completed: 0,
    })
    apiMocks.getBugStats.mockResolvedValue({
      total: 1,
      open: 1,
      in_progress: 0,
      fixed: 0,
      closed: 0,
      rejected: 0,
    })
    apiMocks.getRequirements.mockResolvedValue([{
      id: 11,
      title: '登录流程优化',
      content: '这是一段需要在表格中单行省略并通过悬浮提示查看的完整需求详情。',
      status: 'in_progress',
      priority: 2,
      sprint_name: null,
      creator_name: 'tester',
      expected_delivery_date: null,
    }])
    apiMocks.getBugs.mockResolvedValue([{
      id: 21,
      item_code: 'BUG-21',
      title: '登录按钮无响应',
      description: '这是一段需要在表格中单行省略并通过悬浮提示查看的完整缺陷详情。',
      severity: 2,
      status: 'open',
      assignee_name: null,
      sprint_name: null,
      evidence_count: 0,
      time_spent: 0,
    }])
  })

  it('需求表格提供详情操作列并为需求内容启用 overflow tooltip', async () => {
    const wrapper = mountPage(RequirementsPage)
    await flushPromises()

    expect(wrapper.find('[data-column-label="操作"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="requirement-content-overflow"]').attributes('data-tooltip-content'))
      .toContain('完整需求详情')

    await wrapper.get('[data-testid="requirement-detail-action"]').trigger('click')
    expect(wrapper.get('[data-testid="requirement-detail-dialog"]').attributes('data-open')).toBe('true')
  })

  it('缺陷表格提供详情与编辑操作列并为缺陷描述启用 overflow tooltip', async () => {
    const wrapper = mountPage(BugsPage)
    await flushPromises()

    expect(wrapper.find('[data-column-label="操作"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="bug-description-overflow"]').attributes('data-tooltip-content'))
      .toContain('完整缺陷详情')

    await wrapper.get('[data-testid="bug-detail-action"]').trigger('click')
    expect(wrapper.get('[data-testid="bug-view-dialog"]').attributes('data-open')).toBe('true')

    await wrapper.get('[data-testid="bug-edit-action"]').trigger('click')
    expect(wrapper.get('[data-testid="bug-view-dialog"]').attributes('data-open')).toBe('false')
    expect(wrapper.get('[data-testid="bug-detail-dialog"]').attributes('data-open')).toBe('true')
  })

  it('缺陷表格把 Markdown 转成可读摘要而不是在单元格中渲染富内容', async () => {
    apiMocks.getBugs.mockResolvedValue([{
      id: 21,
      item_code: 'BUG-21',
      title: '登录按钮无响应',
      description: [
        '![1.00](/static/uploads/markdown/2026/07/demo.png)',
        '',
        '## 登录流程',
        '',
        '- 点击登录按钮',
      ].join('\n'),
      severity: 2,
      status: 'open',
      assignee_name: null,
      sprint_name: null,
      evidence_count: 0,
      time_spent: 0,
    }])

    const wrapper = mountPage(BugsPage)
    await flushPromises()

    const summary = wrapper.get('[data-testid="bug-description-overflow"]')
    expect(summary.text()).toBe('图片 登录流程 点击登录按钮')
    expect(summary.attributes('data-tooltip-content')).toBe('图片 登录流程 点击登录按钮')
    expect(summary.find('img').exists()).toBe(false)
  })

  it('需求表格同样把 Markdown 转成可读摘要', async () => {
    apiMocks.getRequirements.mockResolvedValue([{
      id: 11,
      title: '登录流程优化',
      content: [
        '![1.00](/static/uploads/markdown/2026/07/demo.png)',
        '',
        '# 验收标准',
        '',
        '- 可以正常登录',
      ].join('\n'),
      status: 'in_progress',
      priority: 2,
      sprint_name: null,
      creator_name: 'tester',
      expected_delivery_date: null,
    }])

    const wrapper = mountPage(RequirementsPage)
    await flushPromises()

    const summary = wrapper.get('[data-testid="requirement-content-overflow"]')
    expect(summary.text()).toBe('图片 验收标准 可以正常登录')
    expect(summary.attributes('data-tooltip-content')).toBe('图片 验收标准 可以正常登录')
    expect(summary.find('img').exists()).toBe(false)
  })
})
