/**
 * Claims decodificados del token JWT.
 */
export type AuthClaims = {
  /** ID del usuario */
  sub: string
  /** Email del usuario */
  email: string
  /** Rol del usuario */
  role: string
}

/**
 * Snapshot del estado de sesión.
 */
export type AuthSessionSnapshot = {
  /** Token de acceso actual */
  accessToken: string | null
  /** Claims decodificados */
  claims: AuthClaims | null
}

/**
 * Listener para cambios de sesión.
 */
type SessionListener = (snapshot: AuthSessionSnapshot) => void

let accessToken: string | null = null
const listeners = new Set<SessionListener>()

/**
 * Decodifica un valor Base64URL.
 *
 * @param value - Valor codificado
 * @returns Cadena decodificada
 */
const base64UrlDecode = (value: string) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - (normalized.length % 4 || 4)) % 4)

  return atob(padded)
}

/**
 * Decodifica los claims de un token JWT.
 *
 * @param token - Token JWT
 * @returns Claims o null si el token es inválido
 */
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
    }
  } catch {
    return null
  }
}

/**
 * Obtiene el estado actual de la sesión.
 *
 * @returns Snapshot con token y claims
 */
export const getAuthSession = (): AuthSessionSnapshot => ({
  accessToken,
  claims: accessToken ? decodeAccessTokenClaims(accessToken) : null,
})

/**
 * Notifica a todos los listeners del cambio.
 */
const notifyListeners = () => {
  const snapshot = getAuthSession()

  listeners.forEach((listener) => listener(snapshot))
}

/**
 * Establece el token de acceso.
 *
 * @param nextAccessToken - Nuevo token o null
 */
export const setAuthAccessToken = (nextAccessToken: string | null) => {
  accessToken = nextAccessToken
  notifyListeners()
}

/**
 * Limpia el token de acceso.
 */
export const clearAuthAccessToken = () => {
  accessToken = null
  notifyListeners()
}

/**
 * Suscribe un listener a cambios de sesión.
 *
 * @param listener - Función a llamar en cambios
 * @returns Función para cancelar la suscripción
 */
export const subscribeAuthSession = (listener: SessionListener) => {
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
  }
}