import { shallowMount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import BoardPage from './index.vue'

const testState = vi.hoisted(() => ({
  route: {
    query: {} as Record<string, string>,
  },
  replace: vi.fn(),
  loadProject: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRoute: () => testState.route,
  useRouter: () => ({
    push: vi.fn(),
    replace: testState.replace,
  }),
}))

vi.mock('@/shared/use-project-context', async () => {
  const { ref } = await import('vue')

  return {
    useProjectContext: () => ({
      projectId: ref(10),
      organizationId: ref(1),
      details: ref(null),
      loadProject: testState.loadProject,
    }),
  }
})

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    user: { id: 1, username: 'tester' },
  }),
}))

describe('看板首次加载', () => {
  beforeEach(() => {
    testState.route.query = {}
    testState.replace.mockReset()
    testState.loadProject.mockReset()
  })

  it('接口尚未返回时展示看板列表骨架', () => {
    testState.loadProject.mockImplementation(() => new Promise(() => {}))

    const wrapper = shallowMount(BoardPage, {
      global: {
        stubs: {
          LoadingSkeleton: false,
          ElButton: true,
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

    expect(wrapper.find('[data-testid="loading-skeleton"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="board-header-skeleton"]').exists()).toBe(true)
  })
})
