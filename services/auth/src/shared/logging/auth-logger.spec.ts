jest.mock('nest-winston', () => ({
  WinstonModule: {
    createLogger: jest.fn(() => ({
      on: jest.fn(),
    })),
  },
  utilities: {
    format: {
      nestLike: jest.fn(() => ({
        transform: (info: Record<string, unknown>) => ({ ...info, nested: true }),
      })),
    },
  },
}));

import * as authLogger from './auth-logger';

type CreateSeqTransportMock = jest.MockedFunction<typeof authLogger.createSeqTransport>;

jest.mock('winston-seq', () => {
  const seqLogMock = jest.fn();

  const SeqTransportMock = jest.fn().mockImplementation(function (this: {
    options?: unknown;
    log: (...args: unknown[]) => void;
  }, options: unknown) {
    this.options = options;
    this.log = seqLogMock;
  });

  return Object.assign(SeqTransportMock, {
    __seqLogMock: seqLogMock,
  });
});

describe('Auth logger', () => {
  const seqModule = jest.requireMock('winston-seq') as jest.Mock & {
    __seqLogMock: jest.Mock;
  };
  const nestWinstonModule = jest.requireMock('nest-winston') as {
    WinstonModule: { createLogger: jest.Mock };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.SEQ_URL;
    delete process.env.SEQ_API_KEY_AUTH;
    delete process.env.ENABLE_SEQ_LOGGING;
  });

  it('creates Seq transport with stack-enabled JSON format', () => {
    authLogger.createSeqTransport('http://localhost:5341', 'auth-seq-key');

    expect(seqModule).toHaveBeenCalledWith(
      expect.objectContaining({
        serverUrl: 'http://localhost:5341',
        apiKey: 'auth-seq-key',
        format: expect.anything(),
        onError: expect.any(Function),
      }),
    );
  });

  it('sends an info event to Seq transport marked as TEST', () => {
    const seqInstance = authLogger.createSeqTransport('http://localhost:5341', 'auth-seq-key') as {
      log: (entry: Record<string, unknown>, callback: () => void) => void;
    };

    seqInstance.log(
      {
        level: 'info',
        message: 'Evento emitido desde TEST para validar envio a Seq',
        errorOrigin: 'TEST',
        stack: 'TEST_STACK_TRACE',
      },
      () => undefined,
    );

    expect(seqModule.__seqLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'info',
        errorOrigin: 'TEST',
        message: 'Evento emitido desde TEST para validar envio a Seq',
      }),
      expect.any(Function),
    );
  });

  it('adds service metadata formatter to Seq transport format pipeline', () => {
    authLogger.createSeqTransport('http://localhost:5341', 'auth-seq-key');

    const transportOptions = seqModule.mock.calls[0][0] as {
      format: { transform: (input: Record<string, unknown>) => Record<string, unknown> };
    };

    const transformed = transportOptions.format.transform({ level: 'info', message: 'sample' });

    expect(transformed).toEqual(
      expect.objectContaining({
        service: 'auth-service',
        component: 'backend',
        environment: expect.any(String),
      }),
    );
  });

  it('createAuthLogger uses only console transport when Seq logging is disabled', () => {
    process.env.ENABLE_SEQ_LOGGING = 'false';
    const logger = authLogger.createAuthLogger('http://localhost:5341', 'auth-seq-key');

    expect(nestWinstonModule.WinstonModule.createLogger).toHaveBeenCalledWith(
      expect.objectContaining({
        transports: expect.any(Array),
      }),
    );
    const createLoggerOptions = nestWinstonModule.WinstonModule.createLogger.mock.calls[0][0];
    expect(createLoggerOptions.transports).toHaveLength(1);
    expect(typeof logger.on).toBe('function');
  });

  it('createAuthLogger adds Seq transport when enabled', () => {
    process.env.ENABLE_SEQ_LOGGING = 'true';
    process.env.SEQ_URL = 'http://localhost:5341';
    process.env.SEQ_API_KEY_AUTH = 'auth-seq-key';
    const createSeqTransportSpy = jest.spyOn(authLogger, 'createSeqTransport').mockReturnValue({} as any);

    authLogger.createAuthLogger();

    expect(createSeqTransportSpy).toHaveBeenCalledWith('http://localhost:5341', 'auth-seq-key');
    const createLoggerOptions = nestWinstonModule.WinstonModule.createLogger.mock.calls[0][0];
    expect(createLoggerOptions.transports).toHaveLength(2);
  });

  it('createAuthLogger falls back to console transport if Seq init fails', () => {
    process.env.ENABLE_SEQ_LOGGING = 'true';
    process.env.SEQ_URL = 'http://localhost:5341';
    process.env.SEQ_API_KEY_AUTH = 'auth-seq-key';
    const error = new Error('Seq init failed');
    jest.spyOn(authLogger, 'createSeqTransport').mockImplementation(() => {
      throw error;
    });
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    authLogger.createAuthLogger();

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to initialize Seq transport. Falling back to console only:'),
      error,
    );
    const createLoggerOptions = nestWinstonModule.WinstonModule.createLogger.mock.calls[0][0];
    expect(createLoggerOptions.transports).toHaveLength(1);
    consoleSpy.mockRestore();
  });
});
