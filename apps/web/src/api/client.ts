import axios, {
  AxiosError,
  type AxiosRequestConfig,
} from 'axios'

export interface ApiErrorBody {
  error?: string
  message?: string
}
interface ResponseDataHttpClient {
  get<T = unknown, D = unknown>(url: string, config?: AxiosRequestConfig<D>): Promise<T>
  delete<T = unknown, D = unknown>(url: string, config?: AxiosRequestConfig<D>): Promise<T>
  post<T = unknown, D = unknown>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig<D>,
  ): Promise<T>
  put<T = unknown, D = unknown>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig<D>,
  ): Promise<T>
  patch<T = unknown, D = unknown>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig<D>,
  ): Promise<T>
}

const axiosInstance = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

axiosInstance.interceptors.response.use(
  response => response.data,
  (error: AxiosError<ApiErrorBody>) => {
    if (error.response?.status === 401) {
      window.dispatchEvent(new CustomEvent('pongcode:unauthorized'))
    }
    return Promise.reject(error)
  },
)

export const http = axiosInstance as ResponseDataHttpClient

export function apiErrorMessage(error: unknown, fallback = '操作失败，请重试'): string {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    return error.response?.data?.error
      || error.response?.data?.message
      || error.message
      || fallback
  }
  return error instanceof Error ? error.message : fallback
}
