import { http } from './client'
import type { Organization, Team, User } from './types'

export function getOrganizationTeams(organizationId: number) {
  return http
    .get<{ organization: Organization; teams: Team[]; total_count: number }>(`/organizations/${organizationId}/teams`)
    .then(response => response.data)
}

export function createTeam(organizationId: number, data: { name: string; description: string }) {
  return http
    .post<Team>(`/organizations/${organizationId}/teams`, data)
    .then(response => response.data)
}

export function getTeam(id: number) {
  return http
    .get<{ team: Team; organization: Organization; members: User[] }>(`/teams/${id}`)
    .then(response => response.data)
}

export function joinTeam(id: number) {
  return http
    .post<{ success: boolean; message: string }>(`/teams/${id}/join`)
    .then(response => response.data)
}

export function leaveTeam(id: number) {
  return http
    .post<{ success: boolean; message: string }>(`/teams/${id}/leave`)
    .then(response => response.data)
}

export function addTeamMember(id: number, data: { user_id: number; role: string }) {
  return http
    .post<{ success: boolean; message: string }>(`/teams/${id}/members`, data)
    .then(response => response.data)
}
