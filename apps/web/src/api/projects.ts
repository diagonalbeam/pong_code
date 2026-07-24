import { http } from './client'
import type { BoardResponse, Project, ProjectDetails } from './types'

export function createProject(
  organizationId: number,
  data: { name: string; description: string; team_id: number },
) {
  return http.post<Project>(`/organizations/${organizationId}/projects`, data)
}

export function getProject(id: number) {
  return http.get<ProjectDetails>(`/projects/${id}`)
}

export function updateProject(
  id: number,
  data: { name: string; description: string; team_id: number },
) {
  return http.put<Project>(`/projects/${id}`, data)
}

export function deleteProject(id: number) {
  return http.delete<{ success: boolean; organization_id: number }>(`/projects/${id}`)
}

export function getProjectBoard(id: number, sprintId?: number) {
  return http.get<BoardResponse>(`/projects/${id}/board`, {
    params: sprintId ? { sprint_id: sprintId } : {},
  })
}
