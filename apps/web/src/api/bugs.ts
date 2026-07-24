import { http } from './client'
import type { Bug, BugEvidence, WorkLog } from './types'

export function getBugs(
  projectId: number,
  params: Record<string, string | number | undefined> = {},
) {
  return http.get<Bug[]>(`/projects/${projectId}/bugs`, { params })
}

export function getBugStats(projectId: number) {
  return http.get<Record<string, number | Record<string, number>>>(`/projects/${projectId}/bugs/stats`)
}

export function createBug(projectId: number, data: Record<string, unknown>) {
  return http.post<Bug>(`/projects/${projectId}/bugs`, data)
}

export function getBug(id: number) {
  return http.get<{ bug: Bug; work_logs: WorkLog[]; evidences: BugEvidence[] }>(`/bugs/${id}`)
}

export function updateBug(id: number, data: Record<string, unknown>) {
  return http.put<Bug>(`/bugs/${id}`, data)
}

export function deleteBug(id: number) {
  return http.delete<{ success: boolean }>(`/bugs/${id}`)
}

export function addBugEvidence(id: number, data: FormData) {
  return http.post<{ evidence: BugEvidence; bug: Bug }>(`/bugs/${id}/evidences`, data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export function addBugWorklog(id: number, data: Record<string, unknown>) {
  return http.post<{ log: WorkLog; bug: Bug }>(`/bugs/${id}/worklogs`, data)
}

export function deleteBugWorklog(id: number, worklogId: number) {
  return http.delete<{ success: boolean; bug_id: number }>(`/bugs/${id}/worklogs/${worklogId}`)
}
