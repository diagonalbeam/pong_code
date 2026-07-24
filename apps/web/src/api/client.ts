import axios, { AxiosError } from 'axios'

export interface ApiErrorBody {
  error?: string
  message?: string
}
export const http = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

http.interceptors.response.use(
  response => response,
  (error: AxiosError<ApiErrorBody>) => {
    if (error.response?.status === 401) {
      window.dispatchEvent(new CustomEvent('pongcode:unauthorized'))
    }
    return Promise.reject(error)
  },
)

export function apiErrorMessage(error: unknown, fallback = '操作失败，请重试'): string {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    return error.response?.data?.error
      || error.response?.data?.message
      || error.message
      || fallback
  }
  return error instanceof Error ? error.message : fallback
}
