import { renderHook } from '@testing-library/react'
import { createElement } from 'react'
import { AuthContext, useAuth } from './auth-context'
import type { ReactNode } from 'react'

describe('auth-context', () => {
  it('throws error when useAuth is called outside AuthProvider', () => {
    expect(() => renderHook(() => useAuth())).toThrow(
      'useAuth must be used inside AuthProvider',
    )
  })

  it('returns context value when inside provider', () => {
    const value = {
      accessToken: 'token',
      authClaims: { sub: 'user-1', email: 'test@test.com', role: 'USER' },
      isAuthenticated: true,
      isHydrating: false,
      setSession: jest.fn(),
      clearSession: jest.fn(),
    }

    function Wrapper({ children }: { children: ReactNode }) {
      return createElement(AuthContext.Provider, { value }, children)
    }

    const { result } = renderHook(() => useAuth(), { wrapper: Wrapper })

    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.authClaims?.sub).toBe('user-1')
  })
})
