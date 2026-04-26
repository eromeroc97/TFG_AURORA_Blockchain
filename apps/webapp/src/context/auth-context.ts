import { createContext, useContext } from 'react'
import type { AuthClaims } from './auth-session'

/**
 * Valor del contexto de autenticación.
 */
export type AuthContextValue = {
  /** Token de acceso actual */
  accessToken: string | null
  /** Claims decodificados del JWT */
  authClaims: AuthClaims | null
  /** Indica si el usuario está autenticado */
  isAuthenticated: boolean
  /** Indica si está hidratando la sesión */
  isHydrating: boolean
  /** Función para establecer sesión */
  setSession: (accessToken: string) => void
  /** Función para limpiar sesión */
  clearSession: () => void
}

/**
 * Contexto de React para autenticación.
 */
export const AuthContext = createContext<AuthContextValue | null>(null)

/**
 * Hook para acceder al contexto de autenticación.
 *
 * @returns Valor del contexto de autenticación
 * @throws Error si se usa fuera de AuthProvider
 */
export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }

  return context
}