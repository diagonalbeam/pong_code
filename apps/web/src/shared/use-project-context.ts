import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { getProject } from '@/api/projects'
import type { ProjectDetails } from '@/api/types'

export function useProjectContext() {
  const route = useRoute()
  const projectId = computed(() => Number(route.params.projectId))
  const routeOrganizationId = computed(() => Number(route.params.orgId || 0))
  const details = ref<ProjectDetails | null>(null)
  const loadingProject = ref(false)

  async function loadProject() {
    loadingProject.value = true
    try {
      details.value = await getProject(projectId.value)
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
