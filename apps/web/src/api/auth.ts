import { http } from './client'
import type { User } from './types'

export function status() {
  return http.get<{ authenticated: boolean; user?: User }>('/auth/status')
}

export function login(data: { username: string; password: string; remember_me: boolean }) {
  return http.post<{ success: boolean; user: User }>('/auth/login', data)
}

export function register(data: { username: string; email: string; password: string }) {
  return http.post<{ success: boolean; message: string }>('/auth/register', data)
}

export function logout() {
  return http.get<{ success: boolean }>('/auth/logout')
}

export function getProfile() {
  return http.get<{ user: User }>('/auth/profile')
}

export function updateProfile(data: { username: string; email: string }) {
  return http.put<{ success: boolean; user: User }>('/auth/profile', data)
}

export function forgotPassword(email: string) {
  return http.post<{ success: boolean; message: string }>('/auth/forgot-password', { email })
}

export function verifyResetToken(token: string) {
  return http.post<{ valid: boolean; username?: string }>('/auth/verify-reset-token', { token })
}

export function resetPassword(token: string, password: string) {
  return http.post<{ success: boolean; message: string }>('/auth/reset-password', { token, password })
}
