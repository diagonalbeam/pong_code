import { http } from './client'
import type { Requirement, Sprint, WorkLog } from './types'

export function createSprint(projectId: number, data: Record<string, unknown>) {
  return http.post<{ sprint: Sprint }>(`/projects/${projectId}/sprints`, data)
}

export function getSprint(id: number) {
  return http.get<{ sprint: Sprint; work_logs: WorkLog[]; can_delete: boolean }>(`/sprints/${id}`)
}

export function updateSprint(id: number, data: Record<string, unknown>) {
  return http.put<Sprint>(`/sprints/${id}`, data)
}

export function deleteSprint(id: number) {
  return http.delete<{ success: boolean; project_id: number }>(`/sprints/${id}`)
}

export function addSprintWorklog(id: number, data: Record<string, unknown>) {
  return http.post<{ log: WorkLog; sprint: Sprint }>(`/sprints/${id}/worklogs`, data)
}

export function getSprintRequirements(id: number) {
  return http.get<{ requirements: Requirement[] }>(`/sprints/${id}/requirements`)
}

export function updateSprintRequirements(
  id: number,
  requirementIds: number[],
  deleteUnboundTasks = false,
) {
  return http.put<{
    sprint: Sprint
    requirements: Requirement[]
    deleted_issue_count: number
  }>(`/sprints/${id}/requirements`, {
    requirement_ids: requirementIds,
    delete_unbound_tasks: deleteUnboundTasks,
  })
}
