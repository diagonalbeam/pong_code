import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import BugDetailDialog from './bug-detail-dialog.vue'
import IssueDetailDialog from './issue-detail-dialog.vue'
import RequirementDetailDialog from './requirement-detail-dialog.vue'
import SprintDetailDialog from './sprint-detail-dialog.vue'

const apiMocks = vi.hoisted(() => ({
  getBug: vi.fn(),
  updateBug: vi.fn(),
  getIssue: vi.fn(),
  updateIssue: vi.fn(),
  getRequirement: vi.fn(),
  updateRequirement: vi.fn(),
  getSprint: vi.fn(),
  getSprintRequirements: vi.fn(),
  updateSprint: vi.fn(),
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
  },
  ElMessageBox: {
    confirm: vi.fn(),
  },
}))

vi.mock('@/api/bugs', () => ({
  addBugEvidence: vi.fn(),
  addBugWorklog: vi.fn(),
  deleteBug: vi.fn(),
  deleteBugWorklog: vi.fn(),
  getBug: apiMocks.getBug,
  updateBug: apiMocks.updateBug,
}))

vi.mock('@/api/issues', () => ({
  addIssueWorklog: vi.fn(),
  deleteIssue: vi.fn(),
  deleteIssueWorklog: vi.fn(),
  getIssue: apiMocks.getIssue,
  updateIssue: apiMocks.updateIssue,
}))

vi.mock('@/api/requirements', () => ({
  deleteRequirement: vi.fn(),
  getRequirement: apiMocks.getRequirement,
  updateRequirement: apiMocks.updateRequirement,
}))

vi.mock('@/api/sprints', () => ({
  addSprintWorklog: vi.fn(),
  deleteSprint: vi.fn(),
  getSprint: apiMocks.getSprint,
  getSprintRequirements: apiMocks.getSprintRequirements,
  updateSprint: apiMocks.updateSprint,
  updateSprintRequirements: vi.fn(),
}))

const PassThroughStub = defineComponent({
  inheritAttrs: false,
  setup(_, { attrs, slots }) {
    return () => h('div', attrs, [
      slots['header-extra']?.(),
      slots.default?.(),
      slots.footer?.(),
    ])
  },
})

const ButtonStub = defineComponent({
  inheritAttrs: false,
  setup(_, { attrs, slots }) {
    return () => h('button', attrs, slots.default?.())
  },
})

function mountDialog(component: any, props: Record<string, unknown>) {
  return mount(component, {
    props,
    global: {
      stubs: {
        AppDialog: PassThroughStub,
        Delete: true,
        ElAlert: PassThroughStub,
        ElButton: ButtonStub,
        ElCheckbox: PassThroughStub,
        ElCheckboxGroup: PassThroughStub,
        ElDatePicker: PassThroughStub,
        ElEmpty: PassThroughStub,
        ElForm: PassThroughStub,
        ElFormItem: PassThroughStub,
        ElIcon: PassThroughStub,
        ElInput: PassThroughStub,
        ElInputNumber: PassThroughStub,
        ElOption: PassThroughStub,
        ElSelect: PassThroughStub,
        ElTabPane: PassThroughStub,
        ElTabs: PassThroughStub,
        Picture: true,
        StatusTag: true,
        WorklogForm: true,
      },
      directives: {
        loading: {},
      },
    },
  })
}

describe('详情弹窗保存成功后的关闭行为', () => {
  beforeEach(() => {
    for (const mock of Object.values(apiMocks))
      mock.mockReset()

    apiMocks.getRequirement.mockResolvedValue({
      id: 1,
      title: '需求一',
      content: '需求内容',
      priority: 3,
      status: 'in_progress',
      sprint_id: null,
      expected_delivery_date: null,
    })
    apiMocks.getIssue.mockResolvedValue({
      issue: {
        id: 2,
        title: '任务一',
        description: '',
        priority: 3,
        time_estimate: 0,
        status: 'todo',
        assignee_id: null,
        requirement_id: null,
      },
      work_logs: [],
    })
    apiMocks.getBug.mockResolvedValue({
      bug: {
        id: 3,
        title: '缺陷一',
        description: '缺陷描述',
        severity: 3,
        status: 'open',
        steps_to_reproduce: '',
        time_estimate: 0,
        assignee_id: null,
        sprint_id: null,
        requirement_id: null,
      },
      evidences: [],
      work_logs: [],
    })
    apiMocks.getSprint.mockResolvedValue({
      sprint: {
        id: 4,
        name: '迭代一',
        status: 'active',
        start_date: '2026-07-01',
        end_date: '2026-07-14',
        category: '',
        owner_id: null,
        description: '',
        goal: '',
      },
      can_delete: true,
      work_logs: [],
    })
    apiMocks.getSprintRequirements.mockResolvedValue({ requirements: [] })

    apiMocks.updateRequirement.mockResolvedValue({})
    apiMocks.updateIssue.mockResolvedValue({})
    apiMocks.updateBug.mockResolvedValue({})
    apiMocks.updateSprint.mockResolvedValue({})
  })

  const cases = [
    {
      name: '需求',
      component: RequirementDetailDialog,
      props: { modelValue: true, requirementId: 1, sprints: [] },
      update: apiMocks.updateRequirement,
    },
    {
      name: '任务',
      component: IssueDetailDialog,
      props: { modelValue: true, issueId: 2, requirements: [], users: [] },
      update: apiMocks.updateIssue,
    },
    {
      name: '缺陷',
      component: BugDetailDialog,
      props: { modelValue: true, bugId: 3, requirements: [], sprints: [], users: [] },
      update: apiMocks.updateBug,
    },
    {
      name: '迭代',
      component: SprintDetailDialog,
      props: { modelValue: true, sprintId: 4, users: [], allRequirements: [] },
      update: apiMocks.updateSprint,
    },
  ]

  it.each(cases)('$name保存成功后请求关闭弹窗', async ({ component, props, update }) => {
    const wrapper = mountDialog(component, props)
    await flushPromises()

    const saveButton = wrapper.findAll('button').find(button => button.text().trim() === '保存修改')
    expect(saveButton).toBeDefined()
    await saveButton!.trigger('click')
    await flushPromises()

    expect(update).toHaveBeenCalledOnce()
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
    expect(wrapper.emitted('changed')).toHaveLength(1)
  })
})
