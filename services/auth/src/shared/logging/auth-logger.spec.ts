import { createSeqTransport } from './auth-logger';

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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates Seq transport with stack-enabled JSON format', () => {
    createSeqTransport('http://localhost:5341', 'auth-seq-key');

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
    const seqInstance = createSeqTransport('http://localhost:5341', 'auth-seq-key') as {
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
    createSeqTransport('http://localhost:5341', 'auth-seq-key');

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
});
