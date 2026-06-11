import { ConsoleLogger } from '@nestjs/common';

export class SeqLogger extends ConsoleLogger {
  private seqUrl: string;

  constructor(private readonly serviceName: string) {
    super();
    this.seqUrl = (process.env.SEQ_URL || 'http://seq:5341').replace(/\/$/, '');
  }

  override error(message: any, stack?: any, context?: string) {
    super.error(message, stack, context);
    this.sendToSeq('Error', message, stack, context);
  }

  override warn(message: any, stack?: any, context?: string) {
    super.warn(message, stack, context);
    this.sendToSeq('Warning', message, stack, context);
  }

  private async sendToSeq(level: string, message: any, stack?: any, context?: string) {
    if (process.env.ENABLE_SEQ_LOGGING !== 'true') return;
    try {
      await fetch(`${this.seqUrl}/api/events/raw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Events: [
            {
              Timestamp: new Date().toISOString(),
              Level: level,
              MessageTemplate: typeof message === 'string' ? message : JSON.stringify(message),
              Exception: typeof stack === 'string' ? stack : stack?.stack || '',
              Service: this.serviceName,
              Context: context || '',
            },
          ],
        }),
      });
    } catch {
      /* fail silently */
    }
  }
}
