import { getMapEcosystems } from './dashboard.service'

const mockGet = jest.fn()

jest.mock('../api/axios', () => ({
  apiClient: {
    get: (...args: any[]) => mockGet(...args),
  },
}))

describe('dashboard.service', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  const mockEcosystems = [
    { id: 'eco-1', name: 'Eco 1', ownerId: 'user-1', latitude: 40.0, longitude: -3.0 },
    { id: 'eco-2', name: 'Eco 2', ownerId: 'user-1', latitude: null, longitude: null },
  ]

  const mockDevices = [
    { id: 'dev-1', name: 'Device 1', type: 'sensor', status: 'ONLINE', lastSeen: '2025-01-01', vendor: 'vendor1', macAddress: 'AA:BB:CC:DD:EE:FF' },
    { id: 'dev-2', name: 'Device 2', type: 'actuator', status: 'OFFLINE', lastSeen: null, vendor: null, macAddress: null },
  ]

  it('returns ecosystems with devices', async () => {
    mockGet
      .mockResolvedValueOnce({ data: mockEcosystems })
      .mockResolvedValueOnce({ data: mockDevices })

    const result = await getMapEcosystems()

    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('eco-1')
    expect(result[0].lat).toBe(40.0)
    expect(result[0].lng).toBe(-3.0)
    expect(result[0].devices).toHaveLength(2)
    expect(result[0].devices[0].isOnline).toBe(true)
    expect(result[0].devices[1].isOnline).toBe(false)
  })

  it('handles device fetch failure gracefully', async () => {
    mockGet
      .mockResolvedValueOnce({ data: mockEcosystems })
      .mockRejectedValueOnce(new Error('devices fail'))
      .mockResolvedValueOnce({ data: mockDevices })

    const result = await getMapEcosystems()

    expect(result).toHaveLength(2)
    expect(result[0].devices).toEqual([])
    expect(result[1].devices).toHaveLength(2)
  })

  it('returns empty array when no ecosystems', async () => {
    mockGet.mockResolvedValue({ data: [] })
    const result = await getMapEcosystems()
    expect(result).toEqual([])
  })
})
