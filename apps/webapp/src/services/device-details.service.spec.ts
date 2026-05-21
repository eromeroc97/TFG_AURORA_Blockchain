import { getDeviceDetails } from './device-details.service'

const mockGet = jest.fn()

jest.mock('../api/axios', () => ({
  apiClient: {
    get: (...args: any[]) => mockGet(...args),
  },
}))

describe('device-details.service', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('returns device details on success', async () => {
    const details = { payload: { temperature: 25 } }
    mockGet.mockResolvedValue({ data: details })
    const result = await getDeviceDetails('eco-1', 'AA:BB:CC:DD:EE:FF')
    expect(result).toEqual(details)
    expect(mockGet).toHaveBeenCalledWith('/iot/devices/device-details', {
      params: { ecosystemId: 'eco-1', macAddress: 'AA:BB:CC:DD:EE:FF' },
    })
  })

  it('returns null payload on error', async () => {
    mockGet.mockRejectedValue(new Error('fail'))
    const result = await getDeviceDetails('eco-1', 'AA:BB:CC:DD:EE:FF')
    expect(result).toEqual({ payload: null })
  })
})
