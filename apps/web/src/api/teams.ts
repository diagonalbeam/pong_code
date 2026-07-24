import { http } from './client'
import type { Organization, Team, User } from './types'

export function getOrganizationTeams(organizationId: number) {
  return http.get<{ organization: Organization; teams: Team[]; total_count: number }>(`/organizations/${organizationId}/teams`)
}

export function createTeam(organizationId: number, data: { name: string; description: string }) {
  return http.post<Team>(`/organizations/${organizationId}/teams`, data)
}

export function getTeam(id: number) {
  return http.get<{ team: Team; organization: Organization; members: User[] }>(`/teams/${id}`)
}

export function joinTeam(id: number) {
  return http.post<{ success: boolean; message: string }>(`/teams/${id}/join`)
}

export function leaveTeam(id: number) {
  return http.post<{ success: boolean; message: string }>(`/teams/${id}/leave`)
}

export function addTeamMember(id: number, data: { user_id: number; role: string }) {
  return http.post<{ success: boolean; message: string }>(`/teams/${id}/members`, data)
}
