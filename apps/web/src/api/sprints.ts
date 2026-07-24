import { http } from './client'
import type { Requirement, Sprint, WorkLog } from './types'

export function createSprint(projectId: number, data: Record<string, unknown>) {
  return http
    .post<{ sprint: Sprint }>(`/projects/${projectId}/sprints`, data)
    .then(response => response.data)
}

export function getSprint(id: number) {
  return http
    .get<{ sprint: Sprint; work_logs: WorkLog[]; can_delete: boolean }>(`/sprints/${id}`)
    .then(response => response.data)
}

export function updateSprint(id: number, data: Record<string, unknown>) {
  return http
    .put<Sprint>(`/sprints/${id}`, data)
    .then(response => response.data)
}

export function deleteSprint(id: number) {
  return http
    .delete<{ success: boolean; project_id: number }>(`/sprints/${id}`)
    .then(response => response.data)
}

export function addSprintWorklog(id: number, data: Record<string, unknown>) {
  return http
    .post<{ log: WorkLog; sprint: Sprint }>(`/sprints/${id}/worklogs`, data)
    .then(response => response.data)
}

export function getSprintRequirements(id: number) {
  return http
    .get<{ requirements: Requirement[] }>(`/sprints/${id}/requirements`)
    .then(response => response.data)
}

export function updateSprintRequirements(id: number, requirementIds: number[]) {
  return http
    .put<{ sprint: Sprint; requirements: Requirement[] }>(`/sprints/${id}/requirements`, {
      requirement_ids: requirementIds,
    })
    .then(response => response.data)
}
