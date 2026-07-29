import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { getProject } from '@/api/projects'
import type { ProjectDetails } from '@/api/types'
import { useNavigationContextCache } from '@/shared/navigation-context-cache'

export function useProjectContext() {
  const route = useRoute()
  const navigationContextCache = useNavigationContextCache()
  const projectId = computed(() => Number(route.params.projectId))
  const routeOrganizationId = computed(() => Number(route.params.orgId || 0))
  const details = ref<ProjectDetails | null>(
    navigationContextCache?.projectDetails.get(projectId.value) || null,
  )
  const loadingProject = ref(false)

  async function loadProject(force = false) {
    const cached = navigationContextCache?.projectDetails.get(projectId.value)
    if (cached && !force) {
      details.value = cached
      return cached
    }

    loadingProject.value = !cached
    try {
      details.value = navigationContextCache
        ? await navigationContextCache.loadProject(projectId.value, force)
        : await getProject(projectId.value)
      return details.value
    }
    finally {
      loadingProject.value = false
    }
  }

  const organizationId = computed(() => details.value?.organization.id || routeOrganizationId.value)

  return {
    projectId,
    organizationId,
    details,
    loadingProject,
    loadProject,
  }
}
