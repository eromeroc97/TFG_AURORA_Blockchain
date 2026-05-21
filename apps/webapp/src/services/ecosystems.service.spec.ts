import * as ecosystemsService from './ecosystems.service'

const mockGet = jest.fn()
const mockPost = jest.fn()
const mockPatch = jest.fn()
const mockDelete = jest.fn()

jest.mock('../api/axios', () => ({
  apiClient: {
    get: (...args: any[]) => mockGet(...args),
    post: (...args: any[]) => mockPost(...args),
    patch: (...args: any[]) => mockPatch(...args),
    delete: (...args: any[]) => mockDelete(...args),
  },
}))

describe('ecosystems.service', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('getEcosystems', () => {
    const mockEcosystems = [
      { id: 'eco-1', name: 'Eco 1', ownerId: 'user-1', latitude: 40.0, longitude: -3.0 },
      { id: 'eco-2', name: 'Eco 2', ownerId: 'user-2', latitude: null, longitude: null, accessType: 'DELEGATED', accessRole: 'EDITOR' },
    ]
    const mockDevices = [
      { id: 'dev-1', name: 'Device 1', category: 'sensor', room: null, type: 'sensor', status: 'ONLINE', lastSeen: null, vendor: null, macAddress: null },
    ]

    it('returns ecosystems with devices', async () => {
      mockGet
        .mockResolvedValueOnce({ data: mockEcosystems })
        .mockResolvedValueOnce({ data: mockDevices })
      const result = await ecosystemsService.getEcosystems()
      expect(result).toHaveLength(2)
      expect(result[0].isShared).toBe(false)
      expect(result[0].devices).toHaveLength(1)
      expect(result[0].devices[0].isOnline).toBe(true)
    })

    it('handles device fetch failure with empty devices', async () => {
      mockGet
        .mockResolvedValueOnce({ data: mockEcosystems })
        .mockRejectedValueOnce(new Error('fail'))
      const result = await ecosystemsService.getEcosystems()
      expect(result[0].devices).toEqual([])
    })

    it('maps DELEGATED accessType as isShared=true', async () => {
      mockGet
        .mockResolvedValueOnce({ data: mockEcosystems })
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: [] })
      const result = await ecosystemsService.getEcosystems()
      expect(result[1].isShared).toBe(true)
      expect(result[1].accessType).toBe('DELEGATED')
    })
  })

  describe('createEcosystem', () => {
    it('creates ecosystem and returns response', async () => {
      const response = { id: 'new-eco', name: 'Test', ownerId: 'user-1', apiKey: 'key', latitude: null, longitude: null }
      mockPost.mockResolvedValue({ data: response })
      const result = await ecosystemsService.createEcosystem('Test')
      expect(result).toEqual(response)
      expect(mockPost).toHaveBeenCalledWith('/ecosystems', { name: 'Test' })
    })
  })

  describe('grantAccess', () => {
    it('grants access with default VIEWER role', async () => {
      mockPost.mockResolvedValue({})
      await ecosystemsService.grantAccess('eco-1', 'user@test.com')
      expect(mockPost).toHaveBeenCalledWith('/ecosystems/eco-1/accesses', { email: 'user@test.com', role: 'VIEWER' })
    })

    it('grants access with EDITOR role', async () => {
      mockPost.mockResolvedValue({})
      await ecosystemsService.grantAccess('eco-1', 'user@test.com', 'EDITOR')
      expect(mockPost).toHaveBeenCalledWith('/ecosystems/eco-1/accesses', { email: 'user@test.com', role: 'EDITOR' })
    })
  })

  describe('revokeAccess', () => {
    it('revokes access', async () => {
      mockDelete.mockResolvedValue({})
      await ecosystemsService.revokeAccess('eco-1', 'user-1')
      expect(mockDelete).toHaveBeenCalledWith('/ecosystems/eco-1/accesses/user-1')
    })
  })

  describe('updateAccessRole', () => {
    it('updates access role', async () => {
      mockPatch.mockResolvedValue({})
      await ecosystemsService.updateAccessRole('eco-1', 'user-1', 'EDITOR')
      expect(mockPatch).toHaveBeenCalledWith('/ecosystems/eco-1/accesses/user-1', { role: 'EDITOR' })
    })
  })

  describe('getEcosystemAccesses', () => {
    it('returns access list', async () => {
      const data = [{ userId: 'user-1', email: 'test@test.com', role: 'VIEWER', grantedAt: '2025-01-01' }]
      mockGet.mockResolvedValue({ data })
      const result = await ecosystemsService.getEcosystemAccesses('eco-1')
      expect(result).toEqual(data)
      expect(mockGet).toHaveBeenCalledWith('/ecosystems/eco-1/accesses')
    })
  })

  describe('leaveSharedEcosystem', () => {
    it('sends leave request', async () => {
      mockDelete.mockResolvedValue({})
      await ecosystemsService.leaveSharedEcosystem('eco-1')
      expect(mockDelete).toHaveBeenCalledWith('/ecosystems/eco-1/leave')
    })
  })

  describe('getSharedWithMe', () => {
    it('returns shared ecosystems with devices', async () => {
      const sharedData = [{
        ecosystemId: 'eco-1',
        ecosystemName: 'Shared Eco',
        ecosystemStatus: 'ACTIVE',
        ecosystemLatitude: 10.0,
        ecosystemLongitude: 20.0,
        ecosystemIsOnline: true,
        ecosystemLastSeen: null,
        ecosystemOwnerId: 'owner-1',
        role: 'VIEWER',
        accessType: 'DELEGATED',
      }]
      const devices = [{ id: 'dev-1', name: 'Dev', category: null, room: null, type: 'sensor', status: 'ONLINE', lastSeen: null, vendor: null, macAddress: null }]
      mockGet
        .mockResolvedValueOnce({ data: sharedData })
        .mockResolvedValueOnce({ data: devices })
      const result = await ecosystemsService.getSharedWithMe()
      expect(result).toHaveLength(1)
      expect(result[0].isShared).toBe(true)
      expect(result[0].accessType).toBe('DELEGATED')
    })

    it('returns empty array on API error', async () => {
      mockGet.mockRejectedValue(new Error('fail'))
      const result = await ecosystemsService.getSharedWithMe()
      expect(result).toEqual([])
    })
  })

  describe('getMyEcosystems', () => {
    it('returns my ecosystems with devices', async () => {
      const myData = [{ id: 'eco-1', name: 'My Eco', ownerId: 'user-1', latitude: null, longitude: null }]
      const devices = [{ id: 'dev-1', name: 'Dev', category: null, room: null, type: 'sensor', status: 'ONLINE', lastSeen: null, vendor: null, macAddress: null }]
      mockGet
        .mockResolvedValueOnce({ data: myData })
        .mockResolvedValueOnce({ data: devices })
      const result = await ecosystemsService.getMyEcosystems()
      expect(result).toHaveLength(1)
      expect(result[0].isShared).toBe(false)
      expect(result[0].accessType).toBe('OWNER')
    })

    it('returns empty array on API error', async () => {
      mockGet.mockRejectedValue(new Error('fail'))
      const result = await ecosystemsService.getMyEcosystems()
      expect(result).toEqual([])
    })
  })

  describe('getUserEcosystems', () => {
    it('returns user ecosystems', async () => {
      const data = [{ id: 'eco-1', name: 'Eco', ownerId: 'user-1', latitude: null, longitude: null, accessType: 'OWNER' }]
      mockGet.mockResolvedValue({ data })
      const result = await ecosystemsService.getUserEcosystems('user-1')
      expect(result).toEqual(data)
      expect(mockGet).toHaveBeenCalledWith('/ecosystems/by-user/user-1')
    })

    it('returns empty array on error', async () => {
      mockGet.mockRejectedValue(new Error('fail'))
      const result = await ecosystemsService.getUserEcosystems('user-1')
      expect(result).toEqual([])
    })
  })
})
