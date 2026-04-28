import { apiClient } from '../api/axios'
import type { TelemetryMetrics } from '../models/telemetry.model'

export async function getTelemetryMetrics(): Promise<TelemetryMetrics> {
  const response = await apiClient.get<TelemetryMetrics>('/api/telemetry/v1/metrics')
  return response.data
}
