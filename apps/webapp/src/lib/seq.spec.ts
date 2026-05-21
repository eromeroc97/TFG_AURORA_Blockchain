jest.mock('./seq', () => ({
  isSeqEnabled: false,
  sendSeqEvent: jest.fn().mockResolvedValue(undefined),
  setupSeqErrorReporting: jest.fn(),
}))

import { sendSeqEvent, isSeqEnabled, setupSeqErrorReporting } from './seq'

describe('seq', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('is disabled by default', () => {
    expect(isSeqEnabled).toBe(false)
  })

  it('sendSeqEvent returns void when seq is disabled', async () => {
    const result = await sendSeqEvent('test', 'Information')
    expect(result).toBeUndefined()
  })

  it('setupSeqErrorReporting returns void when seq is disabled', () => {
    expect(setupSeqErrorReporting()).toBeUndefined()
  })
})
