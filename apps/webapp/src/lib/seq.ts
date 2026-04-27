const seqApiKey = import.meta.env.VITE_SEQ_API_KEY
const seqUrl = (import.meta.env.VITE_SEQ_URL ?? 'http://localhost:5341').replace(/\/+$/, '')
const seqEndpoint = seqApiKey
  ? `${seqUrl}/api/events/raw?apiKey=${encodeURIComponent(seqApiKey)}`
  : undefined

export const isSeqEnabled = Boolean(seqApiKey && seqEndpoint)

const buildSeqEventPayload = (
  message: string,
  level: 'Verbose' | 'Debug' | 'Information' | 'Warning' | 'Error' | 'Fatal',
  properties?: Record<string, unknown>,
) => {
  const event = {
    '@t': new Date().toISOString(),
    '@m': message,
    '@l': level,
    SourceContext: 'webapp',
    ...properties,
  }

  return JSON.stringify(event)
}

export const sendSeqEvent = async (
  message: string,
  level: 'Verbose' | 'Debug' | 'Information' | 'Warning' | 'Error' | 'Fatal' = 'Information',
  properties?: Record<string, unknown>,
) => {
  if (!isSeqEnabled || !seqEndpoint) {
    return
  }

  try {
    await fetch(seqEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/vnd.serilog.clef',
      },
      body: buildSeqEventPayload(message, level, properties),
    })
  } catch (error) {
    console.debug('Seq logging failed:', error)
  }
}

export const setupSeqErrorReporting = () => {
  if (!isSeqEnabled) {
    return
  }

  window.addEventListener('error', (event) => {
    void sendSeqEvent('Uncaught frontend error', 'Error', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error?.message ?? null,
    })
  })

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason
    void sendSeqEvent('Unhandled promise rejection', 'Error', {
      reason: typeof reason === 'string' ? reason : JSON.stringify(reason),
    })
  })
}
