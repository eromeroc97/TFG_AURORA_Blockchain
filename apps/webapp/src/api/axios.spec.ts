type HandlerPair = {
  onFulfilled?: (value: any) => any
  onRejected?: (error: any) => any
}

const instances: Array<{
  request: jest.Mock
  post: jest.Mock
  requestHandler?: (config: any) => any
  responseHandler?: HandlerPair
}> = []

jest.mock('axios', () => {
  const create = jest.fn(() => {
    const instance: {
      request: jest.Mock
      post: jest.Mock
      interceptors: {
        request: { use: jest.Mock }
        response: { use: jest.Mock }
      }
      requestHandler?: (config: any) => any
      responseHandler?: HandlerPair
    } = {
      request: jest.fn(),
      post: jest.fn(),
      interceptors: {
        request: {
          use: jest.fn((handler: (config: any) => any) => {
            instance.requestHandler = handler
          }),
        },
        response: {
          use: jest.fn((onFulfilled: (value: any) => any, onRejected: (error: any) => any) => {
            instance.responseHandler = { onFulfilled, onRejected }
          }),
        },
      },
    }

    instances.push(instance)
    return instance
  })

  return {
    __esModule: true,
    default: { create },
    create,
  }
})

describe('api axios client', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    instances.length = 0
    ;(globalThis as typeof globalThis & { __WEBAPP_API_BASE_PATH__?: string }).__WEBAPP_API_BASE_PATH__ =
      'http://localhost:3000'
  })

  it('adds the bearer token to outgoing requests', async () => {
    await jest.isolateModulesAsync(async () => {
      const authSession = await import('../context/auth-session')
      authSession.setAuthAccessToken('session-token')

      const { apiClient } = await import('./axios')
      const apiInstance = instances[0]
      const nextConfig = await apiInstance.requestHandler?.({ headers: {} })

      expect(apiClient).toBe(apiInstance)
      expect(nextConfig.headers.Authorization).toBe('Bearer session-token')
    })
  })

  it('refreshes the token and retries the original request on 401', async () => {
    await jest.isolateModulesAsync(async () => {
      const authSession = await import('../context/auth-session')
      await import('./axios')

      const apiInstance = instances[0]
      const refreshInstance = instances[1]

      refreshInstance.post.mockResolvedValueOnce({ data: { accessToken: 'new-token' } })
      apiInstance.request.mockResolvedValueOnce({ data: 'retried' })

      const result = await apiInstance.responseHandler?.onRejected?.({
        response: { status: 401 },
        config: { url: '/projects', headers: {} },
      })

      expect(refreshInstance.post).toHaveBeenCalledWith('/auth/refresh', undefined, {
        skipAuthRefresh: true,
      })
      expect(authSession.getAuthSession().accessToken).toBe('new-token')
      expect(apiInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/projects',
          headers: expect.objectContaining({ Authorization: 'Bearer new-token' }),
        }),
      )
      expect(result).toEqual({ data: 'retried' })
    })
  })

  it('clears the session when refresh fails', async () => {
    await jest.isolateModulesAsync(async () => {
      const authSession = await import('../context/auth-session')
      const { setUnauthorizedHandler } = await import('./axios')

      const apiInstance = instances[0]
      const refreshInstance = instances[1]
      const unauthorizedHandler = jest.fn()

      authSession.setAuthAccessToken('session-token')
      refreshInstance.post.mockRejectedValueOnce(new Error('refresh failed'))
      setUnauthorizedHandler(unauthorizedHandler)

      await expect(
        apiInstance.responseHandler?.onRejected?.({
          response: { status: 401 },
          config: { url: '/projects', headers: {} },
        }),
      ).rejects.toBeTruthy()

      expect(unauthorizedHandler).toHaveBeenCalled()
      expect(authSession.getAuthSession().accessToken).toBeNull()
    })
  })
})
