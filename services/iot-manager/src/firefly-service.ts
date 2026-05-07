type LogContext = Record<string, unknown>;

class Logger {
  private readonly context: string;

  constructor(context: string) {
    this.context = context;
  }

  private write(level: string, message: string, ctx?: LogContext): void {
    const timestamp = new Date().toISOString();
    const ctxStr = ctx ? ` ${JSON.stringify(ctx)}` : '';
    const msg = `[${timestamp}] [${level}] [${this.context}] ${message}${ctxStr}`;

    if (level === 'ERROR') {
      console.error(msg);
    } else if (level === 'WARN') {
      console.warn(msg);
    } else {
      console.log(msg);
    }
  }

  log(message: string, ctx?: LogContext): void {
    this.write('INFO', message, ctx);
  }

  error(message: string, ctx?: LogContext): void {
    this.write('ERROR', message, ctx);
  }

  warn(message: string, ctx?: LogContext): void {
    this.write('WARN', message, ctx);
  }
}

export type AnchorTelemetryDto = {
  ingestId: string;
  ecosystemId: string;
  telemetryHash: string;
  signature: string;
  publicKey: string;
};

type FireFlyInvokeResponse = {
  id?: string;
  tx?: string;
  status?: string;
};

type FireFlyConfig = {
  apiUrl: string;
  namespace: string;
  apiName: string;
  methodName: string;
};

const loadFireFlyConfig = (): FireFlyConfig => {
  const apiUrl = process.env.FIREFLY_API_URL?.trim();
  const namespace = process.env.FIREFLY_NAMESPACE?.trim() || 'default';
  const apiName = process.env.FIREFLY_API_NAME?.trim();
  const methodName = process.env.FIREFLY_METHOD_NAME?.trim();

  if (!apiUrl) {
    throw new Error('FIREFLY_API_URL is required');
  }
  if (!apiName) {
    throw new Error('FIREFLY_API_NAME is required');
  }
  if (!methodName) {
    throw new Error('FIREFLY_METHOD_NAME is required');
  }

  return { apiUrl, namespace, apiName, methodName };
};

export class FireFlyService {
  private readonly logger = new Logger(FireFlyService.name);
  private readonly config: FireFlyConfig;

  constructor() {
    this.config = loadFireFlyConfig();
  }

  async anchorTelemetry(data: AnchorTelemetryDto): Promise<string> {
    const url = `${this.config.apiUrl}/namespaces/${this.config.namespace}/apis/${this.config.apiName}/invoke/${this.config.methodName}`;

    this.logger.log('Anchoring telemetry to Fabric', { url, ingestId: data.ingestId });

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: {
            ingestId: data.ingestId,
            ecosystemId: data.ecosystemId,
            telemetryHash: data.telemetryHash,
            signature: data.signature,
            publicKey: data.publicKey,
          },
        }),
      });
    } catch (networkError) {
      this.logger.error('Network error calling FireFly', { error: String(networkError), ingestId: data.ingestId });
      throw networkError;
    }

    if (!response.ok) {
      let errorBody: string;
      try {
        errorBody = await response.text();
      } catch {
        errorBody = '(unable to read error body)';
      }

      this.logger.error('FireFly contract invoke failed', {
        status: response.status,
        statusText: response.statusText,
        errorBody,
        ingestId: data.ingestId,
      });

      throw Object.assign(new Error(`FireFly invoke failed: ${response.status} ${response.statusText}`), {
        status: response.status,
        data: errorBody,
      });
    }

    const result = (await response.json()) as FireFlyInvokeResponse;
    const txId = result.id;

    if (!txId) {
      this.logger.warn('FireFly response missing id field', { result, ingestId: data.ingestId });
      throw new Error('FireFly response missing operation ID');
    }

    this.logger.log('Telemetry anchored successfully', { txId, ingestId: data.ingestId });

    return txId;
  }
}