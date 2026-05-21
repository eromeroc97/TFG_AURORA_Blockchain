import * as usersService from './users.service'

const mockGet = jest.fn()
const mockPatch = jest.fn()
const mockDelete = jest.fn()

jest.mock('../api/axios', () => ({
  apiClient: {
    get: (...args: any[]) => mockGet(...args),
    patch: (...args: any[]) => mockPatch(...args),
    delete: (...args: any[]) => mockDelete(...args),
  },
}))

describe('users.service', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('getCurrentUser', () => {
    it('returns user data on success', async () => {
      const user = { id: '1', name: 'Test' }
      mockGet.mockResolvedValue({ data: user })
      const result = await usersService.getCurrentUser()
      expect(result).toEqual(user)
      expect(mockGet).toHaveBeenCalledWith('/users/me')
    })

    it('returns null on error', async () => {
      mockGet.mockRejectedValue(new Error('fail'))
      const result = await usersService.getCurrentUser()
      expect(result).toBeNull()
    })
  })

  describe('getUserById', () => {
    it('returns user data on success', async () => {
      const user = { id: '1', name: 'Test' }
      mockGet.mockResolvedValue({ data: user })
      const result = await usersService.getUserById('1')
      expect(result).toEqual(user)
      expect(mockGet).toHaveBeenCalledWith('/users/1')
    })

    it('returns null on error', async () => {
      mockGet.mockRejectedValue(new Error('fail'))
      const result = await usersService.getUserById('1')
      expect(result).toBeNull()
    })
  })

  describe('getUserByEmail', () => {
    it('returns user data on success', async () => {
      const user = { id: '1', email: 'test@test.com' }
      mockGet.mockResolvedValue({ data: user })
      const result = await usersService.getUserByEmail('test@test.com')
      expect(result).toEqual(user)
      expect(mockGet).toHaveBeenCalledWith('/users/by-email/test%40test.com')
    })

    it('returns null on error', async () => {
      mockGet.mockRejectedValue(new Error('fail'))
      const result = await usersService.getUserByEmail('test@test.com')
      expect(result).toBeNull()
    })
  })

  describe('getUsers', () => {
    it('returns users array on success', async () => {
      const users = [{ id: '1' }, { id: '2' }]
      mockGet.mockResolvedValue({ data: users })
      const result = await usersService.getUsers()
      expect(result).toEqual(users)
      expect(mockGet).toHaveBeenCalledWith('/users')
    })

    it('returns empty array on error', async () => {
      mockGet.mockRejectedValue(new Error('fail'))
      const result = await usersService.getUsers()
      expect(result).toEqual([])
    })
  })

  describe('approveUser', () => {
    it('returns approved user', async () => {
      const user = { id: '1', status: 'ACTIVE' }
      mockPatch.mockResolvedValue({ data: user })
      const result = await usersService.approveUser('1')
      expect(result).toEqual(user)
      expect(mockPatch).toHaveBeenCalledWith('/users/1/approve')
    })
  })

  describe('revokeUser', () => {
    it('calls delete endpoint', async () => {
      mockDelete.mockResolvedValue({})
      await usersService.revokeUser('1')
      expect(mockDelete).toHaveBeenCalledWith('/users/1')
    })
  })

  describe('changeUserRole', () => {
    it('returns updated user', async () => {
      const user = { id: '1', role: 'ADMIN' }
      mockPatch.mockResolvedValue({ data: user })
      const result = await usersService.changeUserRole('1', 'ADMIN')
      expect(result).toEqual(user)
      expect(mockPatch).toHaveBeenCalledWith('/users/1/role', { newRole: 'ADMIN' })
    })
  })

  describe('getUserTelemetryVolume', () => {
    it('returns volume on success', async () => {
      mockGet.mockResolvedValue({ data: { volume: 42 } })
      const result = await usersService.getUserTelemetryVolume('1')
      expect(result).toBe(42)
      expect(mockGet).toHaveBeenCalledWith('/users/1/telemetry-volume')
    })

    it('returns 0 when volume field missing', async () => {
      mockGet.mockResolvedValue({ data: {} })
      const result = await usersService.getUserTelemetryVolume('1')
      expect(result).toBe(0)
    })

    it('returns 0 on error', async () => {
      mockGet.mockRejectedValue(new Error('fail'))
      const result = await usersService.getUserTelemetryVolume('1')
      expect(result).toBe(0)
    })
  })
})
