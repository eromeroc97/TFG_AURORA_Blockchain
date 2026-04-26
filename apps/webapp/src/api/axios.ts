import axios, { AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios'
import {
  clearAuthAccessToken,
  getAuthSession,
  setAuthAccessToken,
} from '../context/auth-session'

/**
 * Extensión global para la base de la API.
 */
declare global {
  interface Window {
    /** Ruta base de la API (injectada en build) */
    __WEBAPP_API_BASE_PATH__?: string
  }
}

/**
 * Interfaz extendida de AxiosRequestConfig para el cliente.
 */
declare module 'axios' {
  export interface AxiosRequestConfig {
    /** Omite el refresh automático de token */
    skipAuthRefresh?: boolean
    /** Indica si ya se intentó refresh */
    _retry?: boolean
  }
}

/**
 * Cliente de Axios para llamadas a la API del Auth Service.
 * Configurado con:
 * - withCredentials: true (cookies HttpOnly)
 * - Interceptores para JWT
 * - Refresh automático en 401
 *
 * Propósito de seguridad:
 * - Adjunta Bearer token en header Authorization
 * - Maneja refresh de tokens automáticamente
 * - Limpia sesión en errores de autenticación
 */
export const apiClient = axios.create({
  baseURL: authApiBasePath,
  withCredentials: true,
})

/**
 * Cliente para llamadas de refresh (sin interceptores de auth).
 */
const refreshClient = axios.create({
  baseURL: authApiBasePath,
  withCredentials: true,
})

/**
 * Verifica si una URL es de autenticación.
 *
 * @param url - URL a verificar
 * @returns true si es ruta de auth
 */
const isAuthRoute = (url?: string) => {

/**
 * Handler para errores 401 (no autorizado).
 */
let unauthorizedHandler: ((error: AxiosError) => void) | null = null

/**
 * Establece el handler para errores 401.
 *
 * @param handler - Función a llamar en unauthorized
 */
export function setUnauthorizedHandler(handler: ((error: AxiosError) => void) | null) {
  unauthorizedHandler = handler
}

/**
 * Interceptor que adjunta el Bearer token a cada solicitud.
 */
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {

/**
 * Realiza refresh del token de acceso.
 *
 * @returns Promise con el nuevo token
 */
const refreshAccessToken = async () => {

/**
 * Interceptor de respuesta para manejo de 401 y refresh automático.
 */
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