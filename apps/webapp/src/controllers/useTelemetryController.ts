import { useCallback, useEffect, useState } from 'react'
import { getTelemetryMetrics } from '../services/telemetry.service'
import type { TelemetryMetrics, SuccessRatioItem } from '../models/telemetry.model'

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

export function useTelemetryController() {
  const [data, setData] = useState<TelemetryMetrics>({
    dailyVolume: [],
    successRatio: [],
    ecosystemUsage: [],
    totalDevices: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadMetrics = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const metrics = await getTelemetryMetrics()

      setData({
        dailyVolume: metrics.dailyVolume ?? [],
        successRatio: (metrics.successRatio ?? []).map<SuccessRatioItem>((metric) => ({
          name: normalizeSuccessName(metric.name),
          value: metric.value,
        })),
        ecosystemUsage: metrics.ecosystemUsage ?? [],
        totalDevices: metrics.totalDevices ?? 0,
      })
    } catch (error) {
      setError('No se pudieron cargar las métricas. Intenta de nuevo más tarde.')
      setData({
        dailyVolume: [],
        successRatio: [],
        ecosystemUsage: [],
        totalDevices: 0,
      })
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadMetrics()
  }, [loadMetrics])

  return {
    data,
    isLoading,
    error,
    refreshMetrics: loadMetrics,
  }
}
