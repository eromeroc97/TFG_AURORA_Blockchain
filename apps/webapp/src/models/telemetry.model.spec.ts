describe('telemetry.model', () => {
  it('exports DailyVolumeItem type', () => {
    const item = { timestamp: '2025-01-01', tx: 10 }
    expect(item.timestamp).toBeDefined()
    expect(item.tx).toBe(10)
  })

  it('exports SuccessRatioItem type', () => {
    const item = { name: 'test', value: 90 }
    expect(item.name).toBe('test')
    expect(item.value).toBe(90)
  })

  it('exports EcosystemUsageItem type', () => {
    const item = { name: 'eco-1', anchors: 42 }
    expect(item.name).toBe('eco-1')
    expect(item.anchors).toBe(42)
  })

  it('exports TelemetryMetrics interface', () => {
    const metrics = {
      dailyVolume: [],
      successRatio: [],
      ecosystemUsage: [],
      totalDevices: 0,
    }
    expect(metrics.totalDevices).toBe(0)
  })
})
