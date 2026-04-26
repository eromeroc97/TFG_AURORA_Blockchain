import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { apiClient } from '../api/axios'
import {
  clearAuthAccessToken,
  getAuthSession,
  setAuthAccessToken,
  subscribeAuthSession,
} from './auth-session'
import { AuthContext } from './auth-context'

/**
 * Proveedor de autenticación de React Context.
 * Maneja el ciclo de vida de la sesión JWT:
 * - Inicialización/hidratación desde cookies
 * - Refresh automático de tokens
 * - Limpieza de sesión en logout
 *
 * Propósito de seguridad:
 * - No almacena tokens en localStorage (XSS)
 * - Usa cookies HttpOnly para refresh tokens
 * - Decodifica claims del JWT para RBAC
 *
 * @param children - Componentes hijos
 * @returns Proveedor de contexto
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(() => getAuthSession().accessToken)
  const [authClaims, setAuthClaims] = useState(() => getAuthSession().claims)
  const [isHydrating, setIsHydrating] = useState(true)

  useEffect(() => {
    const unsubscribe = subscribeAuthSession((snapshot) => {
      setAccessToken(snapshot.accessToken)
      setAuthClaims(snapshot.claims)
    })

    return unsubscribe
  }, [])

  useEffect(() => {
    let isMounted = true

    const bootstrapSession = async () => {
      try {
        const response = await apiClient.post('/auth/refresh', undefined, {
          skipAuthRefresh: true,
        })

        if (!isMounted) {
          return
        }

        setAuthAccessToken(response.data.accessToken)
      } catch {
        if (isMounted) {
          clearAuthAccessToken()
        }
      } finally {
        if (isMounted) {
          setIsHydrating(false)
        }
      }
    }

    void bootstrapSession()

    return () => {
      isMounted = false
    }
  }, [])

  const setSession = useCallback((nextAccessToken: string) => {
    setAuthAccessToken(nextAccessToken)
  }, [])

  const clearSession = useCallback(() => {
    clearAuthAccessToken()
  }, [])

  const value = useMemo(
    () => ({
      accessToken,
      authClaims,
      isAuthenticated: Boolean(accessToken),
      isHydrating,
      setSession,
      clearSession,
    }),
    [accessToken, authClaims, isHydrating, setSession, clearSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}