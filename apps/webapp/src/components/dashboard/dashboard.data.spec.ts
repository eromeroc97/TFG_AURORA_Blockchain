import { SECURITY_ALERTS_MOCK } from './dashboard.data'

describe('dashboard.data', () => {
  it('exports security alerts array', () => {
    expect(Array.isArray(SECURITY_ALERTS_MOCK)).toBe(true)
  })

  it('has 6 alerts', () => {
    expect(SECURITY_ALERTS_MOCK).toHaveLength(6)
  })

  it('each alert has required fields', () => {
    for (const alert of SECURITY_ALERTS_MOCK) {
      expect(alert).toHaveProperty('id')
      expect(alert).toHaveProperty('ecosystemId')
      expect(alert).toHaveProperty('title')
      expect(alert).toHaveProperty('level')
    }
  })

  it('includes critical level alerts', () => {
    const critical = SECURITY_ALERTS_MOCK.filter(a => a.level === 'critical')
    expect(critical.length).toBeGreaterThanOrEqual(1)
  })

  it('covers all severity levels', () => {
    const levels = SECURITY_ALERTS_MOCK.map(a => a.level)
    expect(levels).toContain('low')
    expect(levels).toContain('medium')
    expect(levels).toContain('high')
    expect(levels).toContain('critical')
  })
})
