import type { AppConfig } from './config';

/**
 * Respuesta de invocación de contrato vía FireFly.
 */
export type FireFlyContractInvokeResponse = {
  /** ID de la transacción Fabric */
  id: string;
  /** Estado de la operación */
  status: string;
};

/**
 * Parámetros para anclar telemetría en Fabric vía FireFly.
 */
export type AnchorTelemetryInput = {
  /** ID único de ingesta de iot-manager */
  ingestId: string;
  /** ID del ecosistema propietario */
  ecosystemId: string;
  /** Hash SHA-256 del payload (incluye GPS) */
  telemetryHash: string;
  /** Firma digital emitida por auth-service */
  signature: string;
  /** Clave pública del firmante */
  publicKey: string;
};

/**
 * Servicio para interactuar con FireFly y anclar telemetría en Hyperledger Fabric.
 * Utiliza la API de contratos de FireFly para invocar el chaincode.
 */
export class FireFlyService {
  private readonly apiUrl: string;
  private readonly contractId: string;
  private readonly namespace: string;

  /**
   * @param config - Configuración de la aplicación
   */
  constructor(config: AppConfig) {
    this.apiUrl = config.fireflyApiUrl;
    this.contractId = config.fireflyContractId ?? '';
    this.namespace = config.fireflyNamespace ?? 'default';
  }

  /**
   * Invoca el chaincode para anclar telemetría en Fabric.
   * POST /api/v1/namespaces/{namespace}/contracts/{contractId}/invoke/AnchorTelemetry
   *
   * @param input - Datos para anclar
   * @returns Promise con el ID de transacción Fabric
   */
  async anchorTelemetry(input: AnchorTelemetryInput): Promise<string> {
    if (!this.contractId) {
      throw new Error('FIREFLY_CONTRACT_ID is not configured');
    }

    const url = `${this.apiUrl}/api/v1/namespaces/${this.namespace}/contracts/${this.contractId}/invoke/AnchorTelemetry`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: {
          ingestId: input.ingestId,
          ecosystemId: input.ecosystemId,
          telemetryHash: input.telemetryHash,
          signature: input.signature,
          publicKey: input.publicKey,
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `FireFly contract invoke failed: ${response.status} ${response.statusText}: ${errorBody}`,
      );
    }

    const result = (await response.json()) as FireFlyContractInvokeResponse;
    return result.id;
  }
}
