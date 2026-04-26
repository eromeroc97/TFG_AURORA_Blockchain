import { MongoClient, type Db, type Collection } from 'mongodb';

/**
 * Estado del anclaje en blockchain de la telemetría.
 */
export type AnchorStatus = 'PENDING_ANCHOR' | 'ANCHORED' | 'FAILED';

/**
 * Metadatos asociados a un evento de telemetría.
 */
export type TelemetryMetadata = {
	/** ID único del documento de telemetría */
	telemetryId: string;
	/** ID del ecosistema */
	ecosystemId: string;
	/** Latitud de la lectura */
	latitude: number;
	/** Longitud de la lectura */
	longitude: number;
	/** Estado del anclaje en blockchain */
	anchorStatus: AnchorStatus;
	/** Firma digital Ed25519 del evento */
	signature: string | null;
	/** Clave pública del firmante */
	publicKey: string | null;
	/** ID de la transacción en blockchain */
	txId: string | null;
};

/**
 * Documento completo de telemetría almacenado en MongoDB.
 */
export type TelemetryDocument = {
	/** Timestamp de la lectura */
	timestamp: Date;
	/** Metadatos del evento */
	metadata: TelemetryMetadata;
	/** Datos del sensor */
	payload: Record<string, unknown>;
	/** Hash SHA-256 del payload */
	hash: string;
};

/**
 * Datos de entrada para guardar telemetría.
 */
export type SaveTelemetryInput = {
	/** ID del ecosistema */
	ecosystemId: string;
	/** Latitud de la lectura */
	latitude: number;
	/** Longitud de la lectura */
	longitude: number;
	/** Datos del sensor */
	payload: Record<string, unknown>;
	/** Hash SHA-256 del payload */
	hash: string;
	/** Firma digital (opcional) */
	signature?: string;
	/** Clave pública del firmante (opcional) */
	publicKey?: string;
	/** Timestamp de la lectura */
	timestamp: Date;
};

/**
 * Resultado de guardar telemetría.
 */
export type SaveTelemetryResult = {
	/** ID del documento creado */
	id: string;
};

/**
 * Interfaz para el almacenamiento de telemetría.
 * Abstrae el backend de almacenamiento (MongoDB).
 */
export interface TelemetryStore {
	/**
	 * Guarda un nuevo evento de telemetría.
	 *
	 * @param input - Datos del evento
	 * @returns Promise con el ID generado
	 */
	save(input: SaveTelemetryInput): Promise<SaveTelemetryResult>;

	/**
	 * Actualiza el estado de anclaje de un evento.
	 *
	 * @param id - ID del documento
	 * @param anchorStatus - Nuevo estado
	 * @param signature - Firma digital
	 * @param publicKey - Clave pública
	 * @param txId - ID de transacción (opcional)
	 */
	updateAnchorStatus(id: string, anchorStatus: AnchorStatus, signature: string, publicKey: string, txId?: string): Promise<void>;

	/**
	 * Busca la última interacción de un dispositivo.
	 *
	 * @param deviceId - ID o MAC del dispositivo
	 * @param ecosystemId - ID del ecosistema (opcional)
	 * @returns Promise con el timestamp o null
	 */
	findLastInteraction(deviceId: string, ecosystemId?: string): Promise<Date | null>;

	/**
	 * Cierra la conexión al almacenamiento.
	 */
	close(): Promise<void>;
}

const DEFAULT_DB_NAME = 'iot_data';
const TELEMETRY_COLLECTION = 'telemetry_events';

/**
 * Implementación de TelemetryStore usando MongoDB.
 * Utiliza MongoDB Timeseries para optimizar almacenamiento de series temporales.
 *
 * Propósito de seguridad:
 * - Almacena eventos con hashes para verificación de integridad
 * - Registra estado de anclaje en blockchain
 * - Permite auditoría de datos IoT
 *
 * @param mongoUri - URI de conexión a MongoDB
 */
export class MongoTelemetryStore implements TelemetryStore {
  private readonly client: MongoClient;
  private db: Db | null = null;
  private collection: Collection<TelemetryDocument> | null = null;

  constructor(private readonly mongoUri: string) {
    this.client = new MongoClient(this.mongoUri);
  }

  /**
	 * Extrae el nombre de la base de datos desde la URI.
	 *
	 * @returns Nombre de la base de datos
	 */
	private getDbNameFromUri(): string {
    try {
      const parsed = new URL(this.mongoUri);
      const dbName = parsed.pathname.replace(/^\//, '').trim();
      return dbName || DEFAULT_DB_NAME;
    } catch {
      return DEFAULT_DB_NAME;
    }
  }

  /**
	 * Garantiza que la colección existe y está indexada.
	 * Crea una colección Timeseries si no existe.
	 *
	 * @returns La colección de MongoDB
	 * @async
	 */
	private async ensureCollection(): Promise<Collection<TelemetryDocument>> {
    if (this.collection) {
      return this.collection;
    }

    if (!this.db) {
      await this.client.connect();
      this.db = this.client.db(this.getDbNameFromUri());
    }

    const existing = await this.db.listCollections({ name: TELEMETRY_COLLECTION }).toArray();

    if (existing.length === 0) {
      await this.db.createCollection(TELEMETRY_COLLECTION, {
        timeseries: {
          timeField: 'timestamp',
          metaField: 'metadata',
          granularity: 'seconds',
        },
      });
    }

    this.collection = this.db.collection<TelemetryDocument>(TELEMETRY_COLLECTION);
    await this.collection.createIndex({ 'metadata.ecosystemId': 1, timestamp: -1 });

    return this.collection;
  }

  /**
	 * Guarda un nuevo evento de telemetría.
	 * Genera un ID único y almacena el documento en la colección Timeseries.
	 *
	 * @param input - Datos del evento de telemetría
	 * @returns Promise con el ID generado
	 * @async
	 */
	async save(input: SaveTelemetryInput): Promise<SaveTelemetryResult> {
    const collection = await this.ensureCollection();
    const telemetryId = new (await import('mongodb')).ObjectId().toString();
    const result = await collection.insertOne({
      timestamp: input.timestamp,
      metadata: {
        telemetryId,
        ecosystemId: input.ecosystemId,
        latitude: input.latitude,
        longitude: input.longitude,
        anchorStatus: 'PENDING_ANCHOR',
        signature: input.signature ?? null,
        publicKey: input.publicKey ?? null,
        txId: null,
      },
      payload: input.payload,
      hash: input.hash,
    });

    return {
      id: telemetryId,
    };
  }

  /**
	 * Actualiza el estado de anclaje de un documento.
	 * Utilizado después deAnclar en blockchain.
	 *
	 * @param id - ID del documento
	 * @param anchorStatus - Nuevo estado (PENDING_ANCHOR, ANCHORED, FAILED)
	 * @param signature - Firma digital
	 * @param publicKey - Clave pública
	 * @param txId - ID de transacción (opcional)
	 * @returns Promise<void>
	 * @async
	 */
	async updateAnchorStatus(
    id: string,
    anchorStatus: AnchorStatus,
    signature: string,
    publicKey: string,
    txId?: string,
  ): Promise<void> {
    const collection = await this.ensureCollection();
    
    await collection.updateMany(
      { 'metadata.telemetryId': id },
      {
        $set: {
          'metadata.anchorStatus': anchorStatus,
          'metadata.signature': signature,
          'metadata.publicKey': publicKey,
          ...(txId && { 'metadata.txId': txId }),
        },
      },
    );
  }

  /**
	 * Busca la última interacción de un dispositivo.
	 * Soporta búsqueda por ID, deviceId o dirección MAC.
	 *
	 * @param deviceId - ID, deviceId o MAC del dispositivo
	 * @param ecosystemId - ID del ecosistema (opcional)
	 * @returns Promise con el timestamp o null
	 * @async
	 */
	async findLastInteraction(deviceId: string, ecosystemId?: string): Promise<Date | null> {
    const collection = await this.ensureCollection();

    const normalizedDeviceId = deviceId.trim();
    const searchClauses: Array<Record<string, unknown>> = [
      { 'payload.devices.id': normalizedDeviceId },
      { 'payload.devices.deviceId': normalizedDeviceId },
    ];

    const normalizedMac = normalizedDeviceId.replace(/[^a-fA-F0-9]/g, '').toUpperCase();
    if (/^[A-F0-9]{12}$/.test(normalizedMac)) {
      const macVariants = [
        normalizedMac,
        normalizedMac.match(/.{2}/g)?.join(':') ?? normalizedMac,
        normalizedMac.match(/.{2}/g)?.join('-') ?? normalizedMac,
        normalizedMac.match(/.{2}/g)?.join('.') ?? normalizedMac,
      ];

      searchClauses.push({ 'payload.devices.mac_addr': { $in: macVariants } });
    }

    const query: Record<string, unknown> = { $or: searchClauses };
    if (ecosystemId?.trim()) {
      query['metadata.ecosystemId'] = ecosystemId.trim();
    }

    const document = await collection
      .find(query)
      .sort({ timestamp: -1 })
      .limit(1)
      .project({ timestamp: 1 })
      .next();

    return document?.timestamp ?? null;
  }

  /**
	 * Cierra la conexión a MongoDB.
	 *
	 * @returns Promise<void>
	 * @async
	 */
	async close(): Promise<void> {
    await this.client.close();
  }
}