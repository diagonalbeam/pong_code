import { http } from './client'
import type { Requirement, Sprint } from './types'

export function getRequirements(
  projectId: number,
  params: Record<string, string | number | undefined> = {},
) {
  return http.get<Requirement[]>(`/projects/${projectId}/requirements`, { params })
}

export function getRequirementStats(projectId: number) {
  return http.get<Record<string, number | Record<string, number>>>(`/projects/${projectId}/requirements/stats`)
}

export function createRequirement(projectId: number, data: Record<string, unknown>) {
  return http.post<Requirement>(`/projects/${projectId}/requirements`, data)
}

export function getRequirement(id: number) {
  return http.get<Requirement>(`/requirements/${id}`)
}

export function updateRequirement(id: number, data: Record<string, unknown>) {
  return http.put<Requirement>(`/requirements/${id}`, data)
}

export function deleteRequirement(id: number) {
  return http.delete<{ success: boolean }>(`/requirements/${id}`)
}

export function batchDeleteRequirements(projectId: number, requirementIds: number[]) {
  return http.post<{
    success: boolean
    deleted_count: number
    deleted_issue_count: number
  }>(`/projects/${projectId}/requirements/batch-delete`, {
    requirement_ids: requirementIds,
  })
}

export function batchBindRequirementsToSprint(
  projectId: number,
  requirementIds: number[],
  sprintId: number,
) {
  return http.post<{
    success: boolean
    updated_count: number
    sprint: Sprint
  }>(`/projects/${projectId}/requirements/batch-bind-sprint`, {
    requirement_ids: requirementIds,
    sprint_id: sprintId,
  })
}
