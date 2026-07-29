import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createNavigationContextCache } from './navigation-context-cache'

const apiMocks = vi.hoisted(() => ({
  getOrganization: vi.fn(),
  getOrganizations: vi.fn(),
  getProject: vi.fn(),
}))

vi.mock('@/api/organizations', () => ({
  getOrganization: apiMocks.getOrganization,
  getOrganizations: apiMocks.getOrganizations,
}))

vi.mock('@/api/projects', () => ({
  getProject: apiMocks.getProject,
}))

describe('导航上下文缓存', () => {
  beforeEach(() => {
    apiMocks.getOrganization.mockReset()
    apiMocks.getOrganizations.mockReset()
    apiMocks.getProject.mockReset()
  })

  it('合并并发的项目详情请求，并在后续层级切换时复用结果', async () => {
    let resolveProject!: (value: unknown) => void
    apiMocks.getProject.mockReturnValue(new Promise((resolve) => {
      resolveProject = resolve
    }))
    const cache = createNavigationContextCache()

    const shellRequest = cache.loadProject(10)
    const pageRequest = cache.loadProject(10)
    expect(apiMocks.getProject).toHaveBeenCalledTimes(1)

    const project = {
      project: { id: 10, name: '支付平台', organization_id: 1 },
      active_sprint: null,
      sprints: [],
    }
    resolveProject(project)

    await expect(shellRequest).resolves.toEqual(project)
    await expect(pageRequest).resolves.toEqual(project)
    await expect(cache.loadProject(10)).resolves.toEqual(project)
    expect(apiMocks.getProject).toHaveBeenCalledTimes(1)
  })

  it('强制刷新组织后清除该组织下可能过期的项目详情', async () => {
    apiMocks.getProject.mockResolvedValue({
      project: { id: 10, name: '支付平台', organization_id: 1 },
      active_sprint: null,
      sprints: [],
    })
    apiMocks.getOrganization.mockResolvedValue({
      organization: { id: 1, name: '龙腾团队' },
      projects: [],
      teams: [],
    })
    const cache = createNavigationContextCache()

    await cache.loadProject(10)
    expect(cache.projectDetails.has(10)).toBe(true)

    await cache.loadOrganization(1, true)
    expect(cache.projectDetails.has(10)).toBe(false)
  })
})
