import { MongoClient, type Db, type Collection } from 'mongodb';

export type TelemetryDocument = {
  timestamp: Date;
  metadata: {
    ecosystemId: string;
    latitude: number;
    longitude: number;
  };
  payload: Record<string, unknown>;
  hash: string;
  blockchainStatus: 'PENDING' | 'CONFIRMED' | 'FAILED';
  txId: string | null;
};

export type SaveTelemetryInput = {
  ecosystemId: string;
  latitude: number;
  longitude: number;
  payload: Record<string, unknown>;
  hash: string;
  timestamp: Date;
};

export type SaveTelemetryResult = {
  id: string;
};

export interface TelemetryStore {
  save(input: SaveTelemetryInput): Promise<SaveTelemetryResult>;
  findLastInteraction(deviceId: string, ecosystemId?: string): Promise<Date | null>;
  close(): Promise<void>;
}

const DEFAULT_DB_NAME = 'aurora_telemetry';
const TELEMETRY_COLLECTION = 'telemetry_events';

export class MongoTelemetryStore implements TelemetryStore {
  private readonly client: MongoClient;
  private db: Db | null = null;
  private collection: Collection<TelemetryDocument> | null = null;

  constructor(private readonly mongoUri: string) {
    this.client = new MongoClient(this.mongoUri);
  }

  private getDbNameFromUri(): string {
    try {
      const parsed = new URL(this.mongoUri);
      const dbName = parsed.pathname.replace(/^\//, '').trim();
      return dbName || DEFAULT_DB_NAME;
    } catch {
      return DEFAULT_DB_NAME;
    }
  }

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

  async save(input: SaveTelemetryInput): Promise<SaveTelemetryResult> {
    const collection = await this.ensureCollection();
    const result = await collection.insertOne({
      timestamp: input.timestamp,
      metadata: {
        ecosystemId: input.ecosystemId,
        latitude: input.latitude,
        longitude: input.longitude,
      },
      payload: input.payload,
      hash: input.hash,
      blockchainStatus: 'PENDING',
      txId: null,
    });

    return {
      id: result.insertedId.toString(),
    };
  }

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

  async close(): Promise<void> {
    await this.client.close();
  }
}
