import { WinstonModule, utilities as nestWinstonModuleUtilities } from 'nest-winston';
import * as winston from 'winston';

const winstonSeqModule = require('winston-seq');
const SeqTransportCtor =
  winstonSeqModule.Seq ?? winstonSeqModule.default ?? winstonSeqModule;
const AUTH_SERVICE_NAME = 'auth-service';

const attachServiceMetadata = winston.format((info) => ({
  ...info,
  service: AUTH_SERVICE_NAME,
  component: 'backend',
  environment: process.env.NODE_ENV ?? 'development',
}));

export const createSeqTransport = (seqUrl: string, seqApiKey?: string) =>
  new SeqTransportCtor({
    serverUrl: seqUrl,
    apiKey: seqApiKey,
    onError: (error: unknown) => {
      // Fallback log so Seq transport issues are still visible locally.
      console.error('Seq transport error:', error);
    },
    format: winston.format.combine(
      attachServiceMetadata(),
      winston.format.errors({ stack: true }),
      winston.format.timestamp(),
      winston.format.json(),
    ),
  });

export const createAuthLogger = (
  seqUrl = process.env.SEQ_URL,
  seqApiKey = process.env.SEQ_API_KEY_AUTH,
) => {
  const isSeqLoggingEnabled = process.env.ENABLE_SEQ_LOGGING === 'true';

  const consoleTransport = new winston.transports.Console({
    format: winston.format.combine(
      winston.format.timestamp(),
      nestWinstonModuleUtilities.format.nestLike('AuthService', {
        colors: true,
        prettyPrint: true,
      }),
    ),
  });

  const transports: winston.transport[] = [consoleTransport];

  const exceptionHandlers: winston.transport[] = [
    new winston.transports.Console({
      format: winston.format.combine(
        attachServiceMetadata(),
        winston.format.errors({ stack: true }),
        winston.format.timestamp(),
        winston.format.json(),
      ),
    }),
  ];

  const rejectionHandlers: winston.transport[] = [
    new winston.transports.Console({
      format: winston.format.combine(
        attachServiceMetadata(),
        winston.format.errors({ stack: true }),
        winston.format.timestamp(),
        winston.format.json(),
      ),
    }),
  ];

  if (seqUrl && isSeqLoggingEnabled) {
    try {
      const seqTransport = createSeqTransport(seqUrl, seqApiKey) as winston.transport;
      transports.push(seqTransport);
    } catch (error) {
      // Keep auth service running even if external log transport has runtime compatibility issues.
      console.error('Failed to initialize Seq transport. Falling back to console only:', error);
    }
  }

  return WinstonModule.createLogger({
    transports,
    exceptionHandlers,
    rejectionHandlers,
  });
};
