import axios, { AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios'
import {
  clearAuthAccessToken,
  getAuthSession,
  setAuthAccessToken,
} from '../context/auth-session'

const authApiBasePath = import.meta.env.VITE_API_BASE_PATH

declare module 'axios' {
  export interface AxiosRequestConfig {
    skipAuthRefresh?: boolean
    _retry?: boolean
  }
}

export const apiClient = axios.create({
  baseURL: authApiBasePath,
  withCredentials: true,
})

const refreshClient = axios.create({
  baseURL: authApiBasePath,
  withCredentials: true,
})

const isAuthRoute = (url?: string) => {
  if (!url) {
    return false
  }

  return ['/auth/login', '/auth/refresh', '/auth/logout'].some((route) => url.includes(route))
}

let unauthorizedHandler: ((error: AxiosError) => void) | null = null

export function setUnauthorizedHandler(handler: ((error: AxiosError) => void) | null) {
  unauthorizedHandler = handler
}

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const { accessToken } = getAuthSession()

  if (accessToken) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${accessToken}`
  }

  return config
})

const refreshAccessToken = async () => {
  const response = await refreshClient.post('/auth/refresh', undefined, {
    skipAuthRefresh: true,
  })

  const nextAccessToken = response.data?.accessToken as string | undefined

  if (!nextAccessToken) {
    throw new Error('Refresh response missing accessToken')
  }

  setAuthAccessToken(nextAccessToken)

  return nextAccessToken
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalConfig = error.config as AxiosRequestConfig | undefined

    if (
      error.response?.status === 401 &&
      originalConfig &&
      !originalConfig.skipAuthRefresh &&
      !originalConfig._retry &&
      !isAuthRoute(originalConfig.url)
    ) {
      originalConfig._retry = true

      try {
        const nextAccessToken = await refreshAccessToken()

        originalConfig.headers = originalConfig.headers ?? {}
        originalConfig.headers.Authorization = `Bearer ${nextAccessToken}`

        return apiClient.request(originalConfig)
      } catch (refreshError) {
        clearAuthAccessToken()
        unauthorizedHandler?.(error)
        return Promise.reject(refreshError)
      }
    }

    if (error.response?.status === 401) {
      unauthorizedHandler?.(error)
    }

    return Promise.reject(error)
  },
)