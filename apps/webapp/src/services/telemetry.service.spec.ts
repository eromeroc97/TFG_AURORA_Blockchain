import * as telemetryService from './telemetry.service'

const mockGet = jest.fn()

jest.mock('../api/axios', () => ({
  apiClient: {
    get: (...args: any[]) => mockGet(...args),
  },
}))

describe('telemetry.service', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('getTelemetryMetrics', () => {
    it('fetches metrics with default range', async () => {
      const responseData = {
        dailyVolume: [{ timestamp: '00:00', tx: 12 }],
        successRatio: [{ name: 'ANCHORED', value: 42 }],
        ecosystemUsage: [{ name: 'Ecosystem A', anchors: 7 }],
        totalDevices: 3,
      }

      mockGet.mockResolvedValueOnce({ data: responseData })
      const metrics = await telemetryService.getTelemetryMetrics()
      expect(mockGet).toHaveBeenCalledWith('/telemetry/v1/metrics', { params: { range: '24h' } })
      expect(metrics).toEqual(responseData)
    })

    it('fetches metrics with custom range', async () => {
      mockGet.mockResolvedValue({ data: { dailyVolume: [], successRatio: [], ecosystemUsage: [], totalDevices: 0 } })
      await telemetryService.getTelemetryMetrics('1h')
      expect(mockGet).toHaveBeenCalledWith('/telemetry/v1/metrics', { params: { range: '1h' } })
    })
  })

  describe('getTelemetryVolume', () => {
    it('returns 0 when ecosystemIds is empty', async () => {
      const result = await telemetryService.getTelemetryVolume([])
      expect(result).toBe(0)
      expect(mockGet).not.toHaveBeenCalled()
    })

    it('returns volume on success', async () => {
      mockGet.mockResolvedValue({ data: { volume: 42 } })
      const result = await telemetryService.getTelemetryVolume(['eco-1', 'eco-2'])
      expect(result).toBe(42)
      expect(mockGet).toHaveBeenCalledWith('/telemetry/v1/volume', { params: { ecosystemIds: 'eco-1,eco-2' } })
    })

    it('returns 0 on error', async () => {
      mockGet.mockRejectedValue(new Error('fail'))
      const result = await telemetryService.getTelemetryVolume(['eco-1'])
      expect(result).toBe(0)
    })
  })
})
