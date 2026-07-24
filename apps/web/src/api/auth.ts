import { http } from './client'
import type { User } from './types'

export function status() {
  return http
    .get<{ authenticated: boolean; user?: User }>('/auth/status')
    .then(response => response.data)
}

export function login(data: { username: string; password: string; remember_me: boolean }) {
  return http
    .post<{ success: boolean; user: User }>('/auth/login', data)
    .then(response => response.data)
}

export function register(data: { username: string; email: string; password: string }) {
  return http
    .post<{ success: boolean; message: string }>('/auth/register', data)
    .then(response => response.data)
}

export function logout() {
  return http
    .get<{ success: boolean }>('/auth/logout')
    .then(response => response.data)
}

export function getProfile() {
  return http
    .get<{ user: User }>('/auth/profile')
    .then(response => response.data)
}

export function updateProfile(data: { username: string; email: string }) {
  return http
    .put<{ success: boolean; user: User }>('/auth/profile', data)
    .then(response => response.data)
}

export function forgotPassword(email: string) {
  return http
    .post<{ success: boolean; message: string }>('/auth/forgot-password', { email })
    .then(response => response.data)
}

export function verifyResetToken(token: string) {
  return http
    .post<{ valid: boolean; username?: string }>('/auth/verify-reset-token', { token })
    .then(response => response.data)
}

export function resetPassword(token: string, password: string) {
  return http
    .post<{ success: boolean; message: string }>('/auth/reset-password', { token, password })
    .then(response => response.data)
}
