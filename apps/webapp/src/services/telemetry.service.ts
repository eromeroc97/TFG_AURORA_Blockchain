import { apiClient } from '../api/axios'
import type { TelemetryMetrics } from '../models/telemetry.model'

export type TelemetryRange = '30m' | '1h' | '12h' | '24h' | '1w' | '1M' | '1y'

export async function getTelemetryMetrics(range: TelemetryRange = '24h'): Promise<TelemetryMetrics> {
  const response = await apiClient.get<TelemetryMetrics>('/telemetry/v1/metrics', {
    params: { range },
  })
  return response.data
}
