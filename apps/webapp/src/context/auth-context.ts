import { createContext, useContext } from 'react'
import type { AuthClaims } from './auth-session'

export type AuthContextValue = {
  accessToken: string | null
  authClaims: AuthClaims | null
  isAuthenticated: boolean
  isHydrating: boolean
  setSession: (accessToken: string) => void
  clearSession: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }

  return context
}