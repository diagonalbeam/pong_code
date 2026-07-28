import { inject, shallowReactive, shallowRef, type InjectionKey, type ShallowRef } from 'vue'
import { getOrganization, getOrganizations } from '@/api/organizations'
import { getProject } from '@/api/projects'
import type { Organization, OrganizationDetails, ProjectDetails } from '@/api/types'

export interface NavigationContextCache {
  organizations: ShallowRef<Organization[] | null>
  organizationDetails: Map<number, OrganizationDetails>
  projectDetails: Map<number, ProjectDetails>
  loadOrganizations: (force?: boolean) => Promise<Organization[]>
  loadOrganization: (id: number, force?: boolean) => Promise<OrganizationDetails>
  loadProject: (id: number, force?: boolean) => Promise<ProjectDetails>
  clear: () => void
}

export const navigationContextCacheKey: InjectionKey<NavigationContextCache> = Symbol('navigation-context-cache')

interface PendingRequest<T> {
  promise: Promise<T>
  force: boolean
}

export function createNavigationContextCache(): NavigationContextCache {
  const organizations = shallowRef<Organization[] | null>(null)
  const organizationDetails = shallowReactive(new Map<number, OrganizationDetails>())
  const projectDetails = shallowReactive(new Map<number, ProjectDetails>())
  let organizationsRequest: PendingRequest<Organization[]> | null = null
  const organizationRequests = new Map<number, PendingRequest<OrganizationDetails>>()
  const projectRequests = new Map<number, PendingRequest<ProjectDetails>>()
  let generation = 0

  function updateOrganizationSummary(organization: Organization) {
    if (!organizations.value)
      return
    const index = organizations.value.findIndex(item => item.id === organization.id)
    if (index < 0)
      return
    organizations.value = organizations.value.map(item => (
      item.id === organization.id ? organization : item
    ))
  }

  async function loadOrganizations(force = false) {
    if (!force && organizations.value)
      return organizations.value
    if (organizationsRequest) {
      if (!force || organizationsRequest.force)
        return organizationsRequest.promise
      try {
        await organizationsRequest.promise
      }
      catch {}
      return loadOrganizations(true)
    }

    const requestGeneration = generation
    const request = getOrganizations()
      .then((result) => {
        if (requestGeneration !== generation)
          return result
        organizations.value = result
        const availableIds = new Set(result.map(organization => organization.id))
        for (const id of organizationDetails.keys()) {
          if (!availableIds.has(id))
            organizationDetails.delete(id)
        }
        for (const [id, details] of projectDetails) {
          if (!availableIds.has(details.project.organization_id))
            projectDetails.delete(id)
        }
        return result
      })
      .finally(() => {
        if (organizationsRequest?.promise === request)
          organizationsRequest = null
      })
    organizationsRequest = { promise: request, force }
    return request
  }

  async function loadOrganization(id: number, force = false) {
    const cached = organizationDetails.get(id)
    if (!force && cached)
      return cached
    const pending = organizationRequests.get(id)
    if (pending) {
      if (!force || pending.force)
        return pending.promise
      try {
        await pending.promise
      }
      catch {}
      return loadOrganization(id, true)
    }

    const requestGeneration = generation
    const request = getOrganization(id)
      .then((result) => {
        if (requestGeneration !== generation)
          return result
        organizationDetails.set(id, result)
        updateOrganizationSummary(result.organization)

        const latestProjects = new Map(result.projects.map(project => [project.id, project]))
        for (const [projectId, details] of projectDetails) {
          if (details.project.organization_id !== id)
            continue
          const project = latestProjects.get(projectId)
          if (!project) {
            projectDetails.delete(projectId)
            continue
          }
          projectDetails.set(projectId, {
            ...details,
            project,
            organization: result.organization,
          })
        }
        return result
      })
      .finally(() => {
        if (organizationRequests.get(id)?.promise === request)
          organizationRequests.delete(id)
      })
    organizationRequests.set(id, { promise: request, force })
    return request
  }

  async function loadProject(id: number, force = false) {
    const cached = projectDetails.get(id)
    if (!force && cached)
      return cached
    const pending = projectRequests.get(id)
    if (pending) {
      if (!force || pending.force)
        return pending.promise
      try {
        await pending.promise
      }
      catch {}
      return loadProject(id, true)
    }

    const requestGeneration = generation
    const request = getProject(id)
      .then((result) => {
        if (requestGeneration !== generation)
          return result
        projectDetails.set(id, result)
        updateOrganizationSummary(result.organization)

        const organization = organizationDetails.get(result.project.organization_id)
        if (organization) {
          const projectExists = organization.projects.some(project => project.id === id)
          organizationDetails.set(result.project.organization_id, {
            ...organization,
            organization: result.organization,
            projects: projectExists
              ? organization.projects.map(project => project.id === id ? result.project : project)
              : [...organization.projects, result.project],
          })
        }
        return result
      })
      .finally(() => {
        if (projectRequests.get(id)?.promise === request)
          projectRequests.delete(id)
      })
    projectRequests.set(id, { promise: request, force })
    return request
  }

  function clear() {
    generation += 1
    organizations.value = null
    organizationDetails.clear()
    projectDetails.clear()
    organizationsRequest = null
    organizationRequests.clear()
    projectRequests.clear()
  }

  return {
    organizations,
    organizationDetails,
    projectDetails,
    loadOrganizations,
    loadOrganization,
    loadProject,
    clear,
  }
}

export function useNavigationContextCache() {
  return inject(navigationContextCacheKey, null)
}
