import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { refreshClient } from '../api/axios'
import {
  clearAuthAccessToken,
  getAuthSession,
  setAuthAccessToken,
  subscribeAuthSession,
} from './auth-session'
import { AuthContext } from './auth-context'

/**
 * Proveedor de contexto de autenticación.
 * Maneja estado de sesión, refresh de tokens y protección de rutas.
 *
 * @param children - Componentes hijos que requieren contexto de autenticación
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
        const response = await refreshClient.post('/auth/refresh', undefined, {
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