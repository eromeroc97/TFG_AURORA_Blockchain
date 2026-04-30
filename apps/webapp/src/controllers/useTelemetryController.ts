import { useCallback, useEffect, useState } from 'react'
import { getTelemetryMetrics, type TelemetryRange } from '../services/telemetry.service'
import type { TelemetryMetrics, SuccessRatioItem, DailyVolumeItem } from '../models/telemetry.model'

const normalizeSuccessName = (status: string) => {
  switch (status) {
    case 'ANCHORED':
      return 'Anclajes OK'
    case 'PENDING_ANCHOR':
      return 'Pendientes'
    case 'FAILED':
      return 'Fallidos'
    default:
      return status
  }
}

const fillTimeRange = (range: TelemetryRange, data: DailyVolumeItem[]): DailyVolumeItem[] => {
  const rangeMs: Record<TelemetryRange, number> = {
    '30m': 30 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '12h': 12 * 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '1w': 7 * 24 * 60 * 60 * 1000,
    '1M': 30 * 24 * 60 * 60 * 1000,
    '1y': 365 * 24 * 60 * 60 * 1000,
  }
  const intervalMs: Record<TelemetryRange, number> = {
    '30m': 60 * 1000,
    '1h': 60 * 1000,
    '12h': 60 * 1000,
    '24h': 5 * 60 * 1000,
    '1w': 60 * 60 * 1000,
    '1M': 24 * 60 * 60 * 1000,
    '1y': 24 * 60 * 60 * 1000,
  }
  const totalMs = rangeMs[range]
  const interval = intervalMs[range]
  const now = Date.now()
  const startTime = now - totalMs

  const result: DailyVolumeItem[] = []

  for (let t = startTime; t <= now; t += interval) {
    const match = data.find(d => Math.abs(new Date(d.timestamp).getTime() - t) < interval)
    result.push({
      timestamp: new Date(t).toISOString(),
      tx: match ? match.tx : 0,
    })
  }

  return result
}

export function useTelemetryController(initialRange: TelemetryRange = '24h') {
  const [data, setData] = useState<TelemetryMetrics>({
    dailyVolume: [],
    rawDailyVolume: [],
    successRatio: [],
    ecosystemUsage: [],
    totalDevices: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [range, setRange] = useState<TelemetryRange>(initialRange)

  const loadMetrics = useCallback(async (r: TelemetryRange) => {
    setIsLoading(true)
    setError(null)

    try {
      const metrics = await getTelemetryMetrics(r)

      const filledVolume = fillTimeRange(r, metrics.dailyVolume ?? [])

      setData({
        dailyVolume: filledVolume,
        rawDailyVolume: metrics.dailyVolume ?? [],
        successRatio: (metrics.successRatio ?? []).map<SuccessRatioItem>((metric) => ({
          name: normalizeSuccessName(metric.name),
          value: metric.value,
        })),
        ecosystemUsage: metrics.ecosystemUsage ?? [],
        totalDevices: metrics.totalDevices ?? 0,
      })
    } catch (error) {
      const err = error as { response?: { status?: number } }
      if (err.response?.status === 403) {
        setError('NO_DATA')
      } else {
        setError('No se pudieron cargar las métricas. Intenta de nuevo más tarde.')
      }
      setData({
        dailyVolume: [],
        rawDailyVolume: [],
        successRatio: [],
        ecosystemUsage: [],
        totalDevices: 0,
      })
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadMetrics(range)
  }, [loadMetrics, range])

  const changeRange = useCallback((newRange: TelemetryRange) => {
    setRange(newRange)
  }, [])

  return {
    data,
    isLoading,
    error,
    range,
    changeRange,
    refreshMetrics: () => loadMetrics(range),
  }
}
