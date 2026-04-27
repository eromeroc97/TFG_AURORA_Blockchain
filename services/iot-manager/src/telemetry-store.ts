import { MongoClient, type Db, type Collection } from 'mongodb';

/**
 * Estado del anclaje en blockchain.
 */
export type AnchorStatus = 'PENDING_ANCHOR' | 'ANCHORED' | 'FAILED';

/**
 * Metadatos de telemetría almacenada.
 */
export type TelemetryMetadata = {
  /** ID único de telemetría */
  telemetryId: string;
  /** ID del ecosistema */
  ecosystemId: string;
  /** Latitud de la lectura */
  latitude: number;
  /** Longitud de la lectura */
  longitude: number;
  /** Estado del anclaje blockchain */
  anchorStatus: AnchorStatus;
  /** Firma digital (opcional) */
  signature: string | null;
  /** Clave pública del firmante (opcional) */
  publicKey: string | null;
  /** ID de transacción en blockchain (opcional) */
  txId: string | null;
};

/**
 * Documento de telemetría en MongoDB.
 */
export type TelemetryDocument = {
  /** Timestamp de la lectura */
  timestamp: Date;
  /** Metadatos del evento */
  metadata: TelemetryMetadata;
  /** Payload del sensor */
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
  /** Payload del sensor */
  payload: Record<string, unknown>;
  /** Hash SHA-256 */
  hash: string;
  /** Firma digital (opcional) */
  signature?: string;
  /** Clave pública (opcional) */
  publicKey?: string;
  /** Timestamp de la lectura */
  timestamp: Date;
};

/**
 * Resultado de guardar telemetría.
 */
export type SaveTelemetryResult = {
  /** ID generado del documento */
  id: string;
};

/**
 * Interfaz para almacenamiento de telemetría.
 * Abstrae el backend (MongoDB).
 */
export type TelemetryDailyVolumeMetric = {
  hour: string;
  tx: number;
};

export type TelemetrySuccessRatioMetric = {
  name: AnchorStatus;
  value: number;
};

export type TelemetryEcosystemUsageMetric = {
  name: string;
  anchors: number;
};

export type TelemetryMetricsResult = {
  dailyVolume: TelemetryDailyVolumeMetric[];
  successRatio: TelemetrySuccessRatioMetric[];
  ecosystemUsage: TelemetryEcosystemUsageMetric[];
  totalDevices: number;
};

export type TelemetryMetricsQuery = {
  from: Date;
  ecosystemIds?: string[];
};

export interface TelemetryStore {
  /**
   * Guarda telemetría en el almacenamiento.
   *
   * @param input - Datos a guardar
   * @returns Promise con el ID generado
   */
  save(input: SaveTelemetryInput): Promise<SaveTelemetryResult>;

  /**
   * Actualiza el estado de anclaje.
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
   * @returns Promise con la fecha o null
   */
  findLastInteraction(deviceId: string, ecosystemId?: string): Promise<Date | null>;

  /**
   * Obtiene métricas de telemetría para el dashboard.
   *
   * @param query - Parámetros de consulta de métricas
   */
  getMetrics(query: TelemetryMetricsQuery): Promise<TelemetryMetricsResult>;

  /**
   * Cierra la conexión al armazenamento.
   */
  close(): Promise<void>;
}

const DEFAULT_DB_NAME = 'iot_data';
const TELEMETRY_COLLECTION = 'telemetry_events';

/**
 * Implementación de TelemetryStore usando MongoDB.
 * Almacena eventos de telemetría con metadatos de anclaje blockchain.
 */
export class MongoTelemetryStore implements TelemetryStore {
  private readonly client: MongoClient;
  private db: Db | null = null;
  private collection: Collection<TelemetryDocument> | null = null;

  /**
   * @param mongoUri - URI de conexión a MongoDB
   */
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
   * Obtiene o crea la colección de telemetría.
   *
   * @returns Promise con la colección
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
   * Guarda un documento de telemetría.
   *
   * @param input - Datos a guardar
   * @returns Promise con el ID generado
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
   *
   * @param id - ID del documento
   * @param anchorStatus - Nuevo estado
   * @param signature - Firma digital
   * @param publicKey - Clave pública
   * @param txId - ID de transacción (opcional)
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
   *
   * @param deviceId - ID o MAC del dispositivo
   * @param ecosystemId - ID del ecosistema (opcional)
   * @returns Promise con la fecha o null
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

  async getMetrics(query: TelemetryMetricsQuery): Promise<TelemetryMetricsResult> {
    const collection = await this.ensureCollection();
    const filters: Record<string, unknown> = {
      timestamp: { $gte: query.from },
    };

    if (query.ecosystemIds?.length) {
      filters['metadata.ecosystemId'] = { $in: query.ecosystemIds };
    }

    const aggregation = await collection
      .aggregate([
        { $match: filters },
        {
          $facet: {
            dailyVolume: [
              {
                $group: {
                  _id: {
                    $dateTrunc: {
                      date: '$timestamp',
                      unit: 'hour',
                    },
                  },
                  tx: { $sum: 1 },
                },
              },
              {
                $project: {
                  _id: 0,
                  hour: {
                    $dateToString: {
                      format: '%H:00',
                      date: '$_id',
                    },
                  },
                  tx: 1,
                },
              },
              { $sort: { hour: 1 } },
            ],
            successRatio: [
              {
                $group: {
                  _id: '$metadata.anchorStatus',
                  value: { $sum: 1 },
                },
              },
              {
                $project: {
                  _id: 0,
                  name: '$_id',
                  value: 1,
                },
              },
            ],
            ecosystemUsage: [
              {
                $group: {
                  _id: '$metadata.ecosystemId',
                  anchors: { $sum: 1 },
                },
              },
              { $sort: { anchors: -1 } },
              { $limit: 5 },
              {
                $project: {
                  _id: 0,
                  name: '$_id',
                  anchors: 1,
                },
              },
            ],
            totalDevices: [
              { $unwind: '$payload.devices' },
              {
                $project: {
                  deviceIdentifier: {
                    $ifNull: ['$payload.devices.deviceId', '$payload.devices.mac_addr'],
                  },
                },
              },
              {
                $match: {
                  deviceIdentifier: { $exists: true, $nin: [null, ''] },
                },
              },
              {
                $group: {
                  _id: '$deviceIdentifier',
                },
              },
              {
                $count: 'value',
              },
            ],
          },
        },
      ])
      .toArray();

    const facet = aggregation[0] ?? {
      dailyVolume: [],
      successRatio: [],
      ecosystemUsage: [],
      totalDevices: [],
    };

    return {
      dailyVolume: facet.dailyVolume,
      successRatio: facet.successRatio,
      ecosystemUsage: facet.ecosystemUsage,
      totalDevices: facet.totalDevices?.[0]?.value ?? 0,
    };
  }

  /**
   * Cierra la conexión a MongoDB.
   */
  async close(): Promise<void> {
    await this.client.close();
  }
}