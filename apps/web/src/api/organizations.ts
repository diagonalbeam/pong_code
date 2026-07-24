import { http } from './client'
import type { Organization, OrganizationDetails, User } from './types'

export function getOrganizations() {
  return http.get<Organization[]>('/organizations')
}

export function createOrganization(name: string) {
  return http.post<Organization>('/organizations', { name })
}

export function joinOrganization(name: string) {
  return http.post<{ success: boolean; message: string; organization: Organization }>('/organizations/join', { name })
}

export function getOrganization(id: number) {
  return http.get<OrganizationDetails>(`/organizations/${id}`)
}

export function deleteOrganization(id: number) {
  return http.delete<{ success: boolean }>(`/organizations/${id}`)
}

export function getOrganizationMembers(id: number) {
  return http.get<{ organization: Organization; members: User[]; total_count: number }>(`/organizations/${id}/members`)
}
