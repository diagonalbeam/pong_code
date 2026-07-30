import { flushPromises, shallowMount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import BoardPage from './index.vue'

const testState = vi.hoisted(() => ({
  route: {
    query: { sprint: '1' } as Record<string, string>,
  },
  getProjectBoard: vi.fn(),
  getRequirements: vi.fn(),
  getUsers: vi.fn(),
  loadProject: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRoute: () => testState.route,
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}))

vi.mock('@/api/projects', () => ({
  getProjectBoard: testState.getProjectBoard,
}))

vi.mock('@/api/requirements', () => ({
  getRequirements: testState.getRequirements,
}))

vi.mock('@/api/users', () => ({
  getUsers: testState.getUsers,
}))

vi.mock('@/shared/use-project-context', () => ({
  useProjectContext: () => ({
    projectId: ref(10),
    organizationId: ref(1),
    details: ref({ sprints: [] }),
    loadProject: testState.loadProject,
  }),
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    user: { id: 1, username: 'tester' },
  }),
}))

let sortableInstanceId = 0
const SortableBoardColumnStub = defineComponent({
  name: 'SortableBoardColumn',
  setup() {
    const instanceId = ++sortableInstanceId
    return () => h('div', {
      'data-testid': 'sortable-instance',
      'data-instance-id': instanceId,
    })
  },
})

const ButtonStub = defineComponent({
  inheritAttrs: false,
  setup(_, { attrs, slots }) {
    return () => h('button', attrs, slots.default?.())
  },
})

function boardResult() {
  return {
    has_sprint: true,
    sprint: {
      id: 1,
      name: '迭代一',
      status: 'active',
      start_date: '2026-07-01',
      end_date: '2026-07-31',
    },
    swimlanes: [
      {
        requirement: null,
        todo: [
          {
            id: 11,
            item_type: 'task',
            title: '保留列实例',
            status: 'todo',
            priority: 3,
            time_estimate: 0,
            time_spent: 0,
          },
        ],
        doing: [],
        done: [],
      },
    ],
  }
}

describe('看板渲染性能', () => {
  beforeEach(() => {
    sortableInstanceId = 0
    testState.loadProject.mockReset().mockResolvedValue(undefined)
    testState.getUsers.mockReset().mockResolvedValue([])
    testState.getRequirements.mockReset().mockResolvedValue([])
    testState.getProjectBoard.mockReset().mockImplementation(async () => boardResult())
  })

  it('刷新数据时复用现有 Sortable 列实例', async () => {
    const wrapper = shallowMount(BoardPage, {
      global: {
        stubs: {
          SortableBoardColumn: SortableBoardColumnStub,
          LoadingSkeleton: true,
          EmptyState: true,
          StatusTag: true,
          IssueDialog: true,
          BugDialog: true,
          IssueDetailDialog: true,
          BugViewDialog: true,
          BugDetailDialog: true,
          BoardRequirementBindDialog: true,
          ElButton: ButtonStub,
          ElDropdown: true,
          ElDropdownItem: true,
          ElDropdownMenu: true,
          ElIcon: true,
          ElProgress: true,
          ElSwitch: true,
        },
        directives: {
          loading: {},
        },
      },
    })

    await flushPromises()
    const before = wrapper.findAll('[data-testid="sortable-instance"]')
      .map(item => item.attributes('data-instance-id'))
    expect(before).toHaveLength(3)

    await wrapper.get('[data-testid="board-refresh-button"]').trigger('click')
    await flushPromises()
    expect(testState.getProjectBoard).toHaveBeenCalledTimes(2)

    const after = wrapper.findAll('[data-testid="sortable-instance"]')
      .map(item => item.attributes('data-instance-id'))
    expect(after).toEqual(before)
  })
})
