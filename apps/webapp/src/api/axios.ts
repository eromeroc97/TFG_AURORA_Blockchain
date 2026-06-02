import axios, { AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios'
import {
  clearAuthAccessToken,
  getAuthSession,
  setAuthAccessToken,
} from '../context/auth-session'

/**
 * Extiende Window con la ruta base de la API.
 */
declare global {
  interface Window {
    /** Ruta base de la API configurada dinámicamente */
    __WEBAPP_API_BASE_PATH__?: string
  }
}

const authApiBasePath =
  (globalThis as typeof globalThis & { __WEBAPP_API_BASE_PATH__?: string }).__WEBAPP_API_BASE_PATH__ ??
  ''

/**
 * Extiende AxiosRequestConfig con opciones de autenticación.
 */
declare module 'axios' {
  export interface AxiosRequestConfig {
    /** Indica si se debe omitir el refresh de token */
    skipAuthRefresh?: boolean
    /** Indica si la petición ya fue reintentada */
    _retry?: boolean
  }
}

/**
 * Cliente de Axios para llamadas a la API.
 * Incluye interceptores para autenticación y refresh de tokens.
 */
export const apiClient = axios.create({
  baseURL: authApiBasePath,
  withCredentials: true,
})

/**
 * Cliente separado para refresh de tokens.
 * No usa interceptores para evitar ciclos infinitos.
 */
export const refreshClient = axios.create({
  baseURL: authApiBasePath,
  withCredentials: true,
})

/**
 * Verifica si la ruta es de autenticación.
 *
 * @param url - Ruta a verificar
 * @returns true si es ruta de auth
 */
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

let isRefreshing = false
let failedQueue: Array<{
  config: AxiosRequestConfig
  resolve: (value: unknown) => void
  reject: (reason: unknown) => void
}> = []

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach(({ config, resolve, reject }) => {
    if (error) {
      reject(error)
    } else if (token) {
      config.headers = config.headers ?? {}
      config.headers.Authorization = `Bearer ${token}`
      config._retry = true
      resolve(apiClient.request(config))
    }
  })

  failedQueue = []
}

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
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ config: originalConfig, resolve, reject })
        })
      }

      originalConfig._retry = true
      isRefreshing = true

      try {
        const nextAccessToken = await refreshAccessToken()

        processQueue(null, nextAccessToken)

        originalConfig.headers = originalConfig.headers ?? {}
        originalConfig.headers.Authorization = `Bearer ${nextAccessToken}`

        return apiClient.request(originalConfig)
      } catch (refreshError) {
        processQueue(refreshError, null)
        clearAuthAccessToken()
        unauthorizedHandler?.(error)

        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    if (error.response?.status === 401) {
      unauthorizedHandler?.(error)
    }

    return Promise.reject(error)
  },
)