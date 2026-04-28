export type DailyVolumeItem = {
  hour: string
  tx: number
}

export type SuccessRatioItem = {
  name: string
  value: number
}

export type EcosystemUsageItem = {
  name: string
  anchors: number
}

export interface TelemetryMetrics {
  dailyVolume: DailyVolumeItem[]
  successRatio: SuccessRatioItem[]
  ecosystemUsage: EcosystemUsageItem[]
  totalDevices: number
}
