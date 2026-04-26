import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';

/**
 * Interfaz para el payload de anclaje (anchor) en la blockchain.
 * Representa una acción de auditoría que se registrará inmutablemente.
 */
export interface AnchorPayload {
	/** Identificador de la acción */
	actionId: string;
	/** Hash SHA-256 de los datos originales */
	originalHash: string;
	/** Firma digital Ed25519 */
	signature: string;
	/** Clave pública del firmante */
	signerPublicKey: string;
	/** Timestamp ISO 8601 */
	timestamp: string;
}

/**
 * Interfaz para la respuesta después deAnclar datos en la blockchain.
 */
export interface AnchorResponse {
	/** ID del mensaje en la blockchain */
	id: string;
	/** Hash del bloque */
	hash: string;
	/** Número del bloque (opcional) */
	blockNumber?: number;
}

/**
 * Estado de la organización en FireFly.
 */
interface FireflyStatus {
	org: {
		id: string;
		did: string;
		verifiers?: Array<{ type: string; value: string }>;
	};
}

/**
 * Identidad creada en FireFly.
 */
interface FireflyIdentity {
	id: string;
	did: string;
	name: string;
	type: string;
	parent: string;
}

/**
 * Servicio de integración con FireFly (blockchain Hyperledger).
 * Proporciona:
 * - Creación de identidades en la blockchain
 * - Anclaje de acciones de auditoría (immutables)
 *
 * Propósito de seguridad:
 * - Registra acciones de usuario de forma inmutable
 * - Permite auditoría de cambios en usuarios y roles
 * - Utiliza DID (Decentralized Identifiers) para identidad
 *
 * @Injectable() - Proveído a nivel de módulo
 */
@Injectable()
export class FireflyService {
  private readonly logger = new Logger(FireflyService.name);
  private baseUrl!: string;
  private orgId?: string;
  private verifierKey?: string;
  private initialized = false;

  constructor(private readonly httpService: HttpService) {}

  /**
	 * Asegura que el servicio esté inicializado.
	 * Obtiene el orgId y verifierKey de FireFly al primer uso.
	 *
	 * @throws Error - Si FIREFLY_API_URL no está definida
	 * @async
	 */
	private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;

    this.baseUrl = process.env.FIREFLY_API_URL!;
    if (!this.baseUrl) {
      throw new Error('FIREFLY_API_URL is not defined');
    }

    await this.fetchOrganizationKeys();
    this.initialized = true;
  }

  /**
	 * Obtiene las claves de la organización desde FireFly.
	 *
	 * @async
	 */
	private async fetchOrganizationKeys(): Promise<void> {
    const statusRes = await firstValueFrom(
      this.httpService.get<FireflyStatus>(`${this.baseUrl}/status`),
    );

    this.orgId = statusRes.data.org.id;

    const verifier = statusRes.data.org.verifiers?.[0]?.value;
    if (!verifier) {
      const verifiersRes = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/verifiers`),
      );
      this.verifierKey = verifiersRes.data?.[0]?.value;
    } else {
      this.verifierKey = verifier;
    }

    if (!this.verifierKey) {
      throw new Error('No blockchain key available from FireFly');
    }

    this.logger.log(`FireFly org initialized: ${this.orgId}`);
  }

/**
	 * Crea una nueva identidad en la blockchain.
	 *
	 * @param payload - Datos para crear la identidad
	 * @returns El DID de la identidad creada
	 * @async
	 */
	async createIdentity(payload: { name: string; parentDid: string }): Promise<string> {
		return this.createChildIdentity({ name: payload.name });
	}

	/**
	 * Crea una identidad hijo bajo la organización.
	 *
	 * @param payload - Nombre de la identidad
	 * @returns El DID de la identidad creada
	 * @throws Error - Si la creación falla después de 3 intentos
	 * @async
	 */
	async createChildIdentity(payload: { name: string }): Promise<string> {
    await this.ensureInitialized();

    const maxAttempts = 3;
    const retryDelayMs = 3000;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const postRes = await firstValueFrom(
          this.httpService.post<{ id: string; did: string }>(
            `${this.baseUrl}/identities?confirm=true`,
            {
              name: payload.name,
              type: 'custom',
              parent: this.orgId,
              key: this.verifierKey,
            },
          ),
        );

        const identity = postRes.data;
        if (!identity.id) {
          throw new Error('FireFly POST did not return identity ID');
        }

        if (!identity.did) {
          throw new Error('FireFly POST with confirm=true did not return confirmed DID');
        }

        this.logger.log(`Identity confirmed: ${identity.did}`);
        return identity.did;
      } catch (error) {
        const isLastAttempt = attempt === maxAttempts;
        this.logger.warn(
          `Identity creation attempt ${attempt}/${maxAttempts} failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );

        if (isLastAttempt) {
          throw new Error(
            `Identity creation failed after ${maxAttempts} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }

        this.logger.log(`Retrying in ${retryDelayMs / 1000}s...`);
        await this.delay(retryDelayMs);
      }
    }

    throw new Error('Identity creation failed: unexpected code path');
  }

  /**
	 * Función de retardo para reintentos.
	 *
	 * @param ms - Milisegundos a esperar
	 * @returns Promise que se resuelve después del retardo
	 */
	private delay(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	/**
	 * Ancla un payload en la blockchain.
	 * Registra una acción de auditoría de forma inmutable.
	 *
	 * Propósito de seguridad:
	 * - Registra acciones como aprobación, revocación, cambio de rol
	 * - Almacena hash, firma y timestamp
	 *
	 * @param payload - Datos aAnclar
	 * @returns Respuesta con ID y hash del mensaje
	 * @throws Error - Si el broadcast falla después de 3 intentos
	 * @async
	 */
	async broadcastAnchor(payload: AnchorPayload): Promise<AnchorResponse> {
    await this.ensureInitialized();

    const maxAttempts = 3;
    const retryDelayMs = 3000;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const postRes = await firstValueFrom(
          this.httpService.post<{ id: string; hash: string }>(
            `${this.baseUrl}/messages/broadcast`,
            {
              data: payload,
            },
          ),
        );

        const response = postRes.data;
        if (!response.id) {
          throw new Error('FireFly broadcast did not return message ID');
        }

        this.logger.log(`Anchor broadcast: ${response.id}`);
        return {
          id: response.id,
          hash: response.hash,
        };
      } catch (error) {
        const isLastAttempt = attempt === maxAttempts;
        this.logger.warn(
          `Anchor broadcast attempt ${attempt}/${maxAttempts} failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );

        if (isLastAttempt) {
          throw new Error(
            `Anchor broadcast failed after ${maxAttempts} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }

        this.logger.log(`Retrying in ${retryDelayMs / 1000}s...`);
        await this.delay(retryDelayMs);
      }
    }

    throw new Error('Anchor broadcast failed: unexpected code path');
  }
}