import { WinstonModule, utilities as nestWinstonModuleUtilities } from 'nest-winston';
import * as winston from 'winston';

const SeqTransportCtor = require('winston-seq');

export const createSeqTransport = (seqUrl: string) =>
  new SeqTransportCtor({
    serverUrl: seqUrl,
    onError: (error: unknown) => {
      // Fallback log so Seq transport issues are still visible locally.
      console.error('Seq transport error:', error);
    },
    format: winston.format.combine(
      winston.format.errors({ stack: true }),
      winston.format.timestamp(),
      winston.format.json(),
    ),
  });

export const createAuthLogger = (seqUrl = process.env.SEQ_URL) => {
  const transports: winston.transport[] = [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        nestWinstonModuleUtilities.format.nestLike('AuthService', {
          colors: true,
          prettyPrint: true,
        }),
      ),
    }),
  ];

  if (seqUrl) {
    transports.push(createSeqTransport(seqUrl) as winston.transport);
  }

  return WinstonModule.createLogger({ transports });
};
