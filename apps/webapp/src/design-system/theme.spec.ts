import { auroraTheme } from './theme'

describe('auroraTheme', () => {
  it('has primary color', () => {
    expect(auroraTheme.colors.primary).toBe('#0A2540')
  })

  it('has accent color', () => {
    expect(auroraTheme.colors.accent).toBe('#14B8A6')
  })

  it('has font families defined', () => {
    expect(auroraTheme.fontFamily.sans).toContain('Manrope')
    expect(auroraTheme.fontFamily.heading).toContain('Space Grotesk')
  })

  it('has aurora box shadow', () => {
    expect(auroraTheme.boxShadow.aurora).toContain('rgba')
  })
})
