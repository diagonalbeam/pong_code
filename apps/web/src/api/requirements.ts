import { http } from './client'
import type { Requirement } from './types'

export function getRequirements(
  projectId: number,
  params: Record<string, string | number | undefined> = {},
) {
  return http
    .get<Requirement[]>(`/projects/${projectId}/requirements`, { params })
    .then(response => response.data)
}

export function getRequirementStats(projectId: number) {
  return http
    .get<Record<string, number | Record<string, number>>>(`/projects/${projectId}/requirements/stats`)
    .then(response => response.data)
}

export function createRequirement(projectId: number, data: Record<string, unknown>) {
  return http
    .post<Requirement>(`/projects/${projectId}/requirements`, data)
    .then(response => response.data)
}

export function getRequirement(id: number) {
  return http
    .get<Requirement>(`/requirements/${id}`)
    .then(response => response.data)
}

export function updateRequirement(id: number, data: Record<string, unknown>) {
  return http
    .put<Requirement>(`/requirements/${id}`, data)
    .then(response => response.data)
}

export function deleteRequirement(id: number) {
  return http
    .delete<{ success: boolean }>(`/requirements/${id}`)
    .then(response => response.data)
}
