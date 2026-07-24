import { http } from './client'
import type { Issue, WorkLog } from './types'

export function createIssue(projectId: number, data: Record<string, unknown>) {
  return http
    .post<Issue>(`/projects/${projectId}/issues`, data)
    .then(response => response.data)
}

export function getIssue(id: number) {
  return http
    .get<{ issue: Issue; work_logs: WorkLog[] }>(`/issues/${id}`)
    .then(response => response.data)
}

export function updateIssue(id: number, data: Record<string, unknown>) {
  return http
    .put<Issue>(`/issues/${id}`, data)
    .then(response => response.data)
}

export function deleteIssue(id: number) {
  return http
    .delete<{ success: boolean }>(`/issues/${id}`)
    .then(response => response.data)
}

export function addIssueWorklog(id: number, data: Record<string, unknown>) {
  return http
    .post<{ log: WorkLog; issue: Issue }>(`/issues/${id}/worklogs`, data)
    .then(response => response.data)
}

export function deleteIssueWorklog(id: number, worklogId: number) {
  return http
    .delete<{ success: boolean; issue_id: number }>(`/issues/${id}/worklogs/${worklogId}`)
    .then(response => response.data)
}

export function moveIssue(id: number, status: string) {
  return http
    .post<{ success: boolean }>(`/issues/${id}/move`, { status })
    .then(response => response.data)
}

export function assignIssueSprint(id: number, sprintId: number | null) {
  return http
    .post<{ success: boolean }>(`/issues/${id}/assign_sprint`, { sprint_id: sprintId })
    .then(response => response.data)
}
