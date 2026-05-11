jest.mock('../api/axios', () => ({
  apiClient: {
    get: jest.fn(),
  },
}))

import { apiClient } from '../api/axios'
import { getTelemetryMetrics } from './telemetry.service'

describe('telemetry service', () => {
  const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('fetches telemetry metrics from the expected API route', async () => {
    const responseData = {
      dailyVolume: [{ hour: '00:00', tx: 12 }],
      successRatio: [{ name: 'ANCHORED', value: 42 }],
      ecosystemUsage: [{ name: 'Ecosystem A', anchors: 7 }],
      totalDevices: 3,
    }

    mockedApiClient.get.mockResolvedValueOnce({ data: responseData })

    const metrics = await getTelemetryMetrics()

    expect(mockedApiClient.get).toHaveBeenCalledWith('/telemetry/v1/metrics', { params: { range: '24h' } })
    expect(metrics).toEqual(responseData)
  })
})
