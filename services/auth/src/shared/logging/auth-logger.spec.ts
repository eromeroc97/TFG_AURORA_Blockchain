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
    createSeqTransport('http://localhost:5341');

    expect(seqModule).toHaveBeenCalledWith(
      expect.objectContaining({
        serverUrl: 'http://localhost:5341',
        format: expect.anything(),
        onError: expect.any(Function),
      }),
    );
  });

  it('sends an error to Seq transport marked as TEST', () => {
    const seqInstance = createSeqTransport('http://localhost:5341') as {
      log: (entry: Record<string, unknown>, callback: () => void) => void;
    };

    seqInstance.log(
      {
        level: 'error',
        message: 'Error emitido desde TEST para validar envio a Seq',
        errorOrigin: 'TEST',
        stack: 'TEST_STACK_TRACE',
      },
      () => undefined,
    );

    expect(seqModule.__seqLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'error',
        errorOrigin: 'TEST',
        message: 'Error emitido desde TEST para validar envio a Seq',
      }),
      expect.any(Function),
    );
  });
});
