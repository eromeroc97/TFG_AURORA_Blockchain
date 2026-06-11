const seqUrl = (process.env.SEQ_URL || 'http://seq:5341').replace(/\/$/, '');
const serviceName = 'iot-manager';

export async function sendToSeq(
  level: string,
  message: string,
  meta?: Record<string, unknown>,
): Promise<void> {
  if (process.env.ENABLE_SEQ_LOGGING !== 'true') return;
  try {
    await fetch(`${seqUrl}/api/events/raw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        Events: [
          {
            Timestamp: new Date().toISOString(),
            Level: level,
            MessageTemplate: message,
            Service: serviceName,
            ...meta,
          },
        ],
      }),
    });
  } catch {
    /* fail silently */
  }
}
