export type AuthClaims = {
  sub: string
  email: string
  role: string
  did: string | null
}

export type AuthSessionSnapshot = {
  accessToken: string | null
  claims: AuthClaims | null
}

type SessionListener = (snapshot: AuthSessionSnapshot) => void

let accessToken: string | null = null
const listeners = new Set<SessionListener>()

const base64UrlDecode = (value: string) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - (normalized.length % 4 || 4)) % 4)

  return atob(padded)
}

export const decodeAccessTokenClaims = (token: string): AuthClaims | null => {
  try {
    const [, payload] = token.split('.')
    if (!payload) {
      return null
    }

    const parsed = JSON.parse(base64UrlDecode(payload)) as Partial<AuthClaims>
    if (!parsed.sub || !parsed.email || !parsed.role) {
      return null
    }

    return {
      sub: parsed.sub,
      email: parsed.email,
      role: parsed.role,
      did: parsed.did ?? null,
    }
  } catch {
    return null
  }
}

export const getAuthSession = (): AuthSessionSnapshot => ({
  accessToken,
  claims: accessToken ? decodeAccessTokenClaims(accessToken) : null,
})

const notifyListeners = () => {
  const snapshot = getAuthSession()

  listeners.forEach((listener) => listener(snapshot))
}

export const setAuthAccessToken = (nextAccessToken: string | null) => {
  accessToken = nextAccessToken
  notifyListeners()
}

export const clearAuthAccessToken = () => {
  accessToken = null
  notifyListeners()
}

export const subscribeAuthSession = (listener: SessionListener) => {
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
  }
}