import {
  clearAuthAccessToken,
  decodeAccessTokenClaims,
  getAuthSession,
  setAuthAccessToken,
  subscribeAuthSession,
} from './auth-session'

const createToken = (payload: Record<string, unknown>) => {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')

  return `${header}.${body}.signature`
}

describe('auth-session', () => {
  afterEach(() => {
    clearAuthAccessToken()
  })

  it('decodes access token claims', () => {
    const token = createToken({
      sub: 'user-1',
      email: 'user@aurora.local',
      role: 'USER',
      did: 'did:firefly:1',
    })

    expect(decodeAccessTokenClaims(token)).toEqual({
      sub: 'user-1',
      email: 'user@aurora.local',
      role: 'USER',
      did: 'did:firefly:1',
    })
  })

  it('returns null for invalid tokens', () => {
    expect(decodeAccessTokenClaims('invalid-token')).toBeNull()
  })

  it('publishes session changes to subscribers', () => {
    const listener = jest.fn()
    const unsubscribe = subscribeAuthSession(listener)

    setAuthAccessToken(createToken({ sub: 'user-2', email: 'user2@aurora.local', role: 'USER' }))

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        accessToken: expect.any(String),
        claims: expect.objectContaining({ sub: 'user-2' }),
      }),
    )

    unsubscribe()
  })

  it('exposes the current auth session snapshot', () => {
    clearAuthAccessToken()
    expect(getAuthSession()).toEqual({ accessToken: null, claims: null })
  })
})