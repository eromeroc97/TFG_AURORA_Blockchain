import { MongoTelemetryStore } from './telemetry-store';

describe('MongoTelemetryStore', () => {
  const mockTimestamp = new Date('2025-01-01T12:00:00.000Z');
  const mockCursor = {
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    project: jest.fn().mockReturnThis(),
    next: jest.fn().mockResolvedValue({ timestamp: mockTimestamp }),
  } as const;

  const createMockCollection = () => ({
    insertOne: jest.fn().mockResolvedValue({ insertedId: 'mongo-id' }),
    updateMany: jest.fn().mockResolvedValue(undefined),
    find: jest.fn().mockReturnValue(mockCursor),
    aggregate: jest.fn().mockReturnValue({
      toArray: jest.fn().mockResolvedValue([
        {
          dailyVolume: [{ hour: '12:00', tx: 2 }],
          successRatio: [{ name: 'ANCHORED', value: 3 }],
          ecosystemUsage: [{ name: 'eco-1', anchors: 4 }],
          totalDevices: [{ value: 5 }],
        },
      ]),
    }),
  }) as const;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('extracts database name from valid mongo URI', () => {
    const store = new MongoTelemetryStore('mongodb://localhost:27017/test-db');
    expect((store as any).getDbNameFromUri()).toBe('test-db');
  });

  it('falls back to default db name when mongo URI is invalid', () => {
    const store = new MongoTelemetryStore('mongodb://localhost:27017/test-db');
    (store as any).mongoUri = 'not-a-valid-uri';
    expect((store as any).getDbNameFromUri()).toBe('iot_data');
  });

  it('save() inserts telemetry document and returns generated id', async () => {
    const collection = createMockCollection();
    const store = new MongoTelemetryStore('mongodb://localhost:27017/test-db');
    jest.spyOn(store as any, 'ensureCollection').mockResolvedValue(collection as any);

    const result = await store.save({
      ecosystemId: 'eco-123',
      latitude: 1.23,
      longitude: 4.56,
      payload: { temperature: 22 },
      hash: 'hash-123',
      timestamp: mockTimestamp,
    });

    expect(result.id).toEqual(expect.any(String));
    expect(collection.insertOne).toHaveBeenCalledWith({
      timestamp: mockTimestamp,
      metadata: {
        telemetryId: expect.any(String),
        ecosystemId: 'eco-123',
        latitude: 1.23,
        longitude: 4.56,
        anchorStatus: 'PENDING_ANCHOR',
        signature: null,
        publicKey: null,
        txId: null,
      },
      payload: { temperature: 22 },
      hash: 'hash-123',
      sizeBytes: 0,
    });
  });

  it('updateAnchorStatus() updates with txId when provided', async () => {
    const collection = createMockCollection();
    const store = new MongoTelemetryStore('mongodb://localhost:27017/test-db');
    jest.spyOn(store as any, 'ensureCollection').mockResolvedValue(collection as any);

    await store.updateAnchorStatus('my-id', 'ANCHORED', 'sign', 'pub', 'tx-1');

    expect(collection.updateMany).toHaveBeenCalledWith(
      { 'metadata.telemetryId': 'my-id' },
      {
        $set: {
          'metadata.anchorStatus': 'ANCHORED',
          'metadata.signature': 'sign',
          'metadata.publicKey': 'pub',
          'metadata.txId': 'tx-1',
        },
      },
    );
  });

  it('updateAnchorStatus() updates without txId when none is provided', async () => {
    const collection = createMockCollection();
    const store = new MongoTelemetryStore('mongodb://localhost:27017/test-db');
    jest.spyOn(store as any, 'ensureCollection').mockResolvedValue(collection as any);

    await store.updateAnchorStatus('my-id', 'FAILED', 'sig', 'pub');

    expect(collection.updateMany).toHaveBeenCalledWith(
      { 'metadata.telemetryId': 'my-id' },
      {
        $set: {
          'metadata.anchorStatus': 'FAILED',
          'metadata.signature': 'sig',
          'metadata.publicKey': 'pub',
        },
      },
    );
  });

  it('findLastInteraction() queries both device id and normalized MAC variants', async () => {
    const collection = createMockCollection();
    const store = new MongoTelemetryStore('mongodb://localhost:27017/test-db');
    jest.spyOn(store as any, 'ensureCollection').mockResolvedValue(collection as any);

    const result = await store.findLastInteraction('AA:BB:CC:DD:EE:FF', ' eco-123 ');

    expect(result).toBe(mockTimestamp);
    expect(collection.find).toHaveBeenCalledWith(
      expect.objectContaining({
        'metadata.ecosystemId': 'eco-123',
        $or: expect.arrayContaining([
          { 'payload.devices.id': 'AA:BB:CC:DD:EE:FF' },
          { 'payload.devices.deviceId': 'AA:BB:CC:DD:EE:FF' },
          { 'payload.devices.mac_addr': { $in: expect.any(Array) } },
        ]),
      }),
    );
  });

  it('getMetrics() maps aggregation facet to a typed result', async () => {
    const collection = createMockCollection();
    const store = new MongoTelemetryStore('mongodb://localhost:27017/test-db');
    jest.spyOn(store as any, 'ensureCollection').mockResolvedValue(collection as any);

    const result = await store.getMetrics({ from: new Date('2025-01-01T00:00:00.000Z'), ecosystemIds: ['eco-123'] });

    expect(result).toEqual({
      dailyVolume: [{ hour: '12:00', tx: 2 }],
      successRatio: [{ name: 'ANCHORED', value: 3 }],
      ecosystemUsage: [{ name: 'eco-1', anchors: 4 }],
      totalDevices: 5,
    });
    expect(collection.aggregate).toHaveBeenCalledWith([
      expect.objectContaining({ $match: expect.any(Object) }),
      expect.any(Object),
    ]);
  });

  it('getMetrics() returns zero totalDevices when facet is empty', async () => {
    const collection = createMockCollection();
    (collection.aggregate as jest.Mock).mockReturnValueOnce({ toArray: jest.fn().mockResolvedValue([]) });

    const store = new MongoTelemetryStore('mongodb://localhost:27017/test-db');
    jest.spyOn(store as any, 'ensureCollection').mockResolvedValue(collection as any);

    const result = await store.getMetrics({ from: new Date('2025-01-01T00:00:00.000Z') });

    expect(result.totalDevices).toBe(0);
  });

  it('close() closes the MongoDB client', async () => {
    const store = new MongoTelemetryStore('mongodb://localhost:27017/test-db');
    const closeSpy = jest.spyOn((store as any).client, 'close').mockResolvedValue(undefined);

    await store.close();

    expect(closeSpy).toHaveBeenCalled();
  });

  it('ensureCollection() creates timeseries collection when not exists', async () => {
    const mockDb = {
      listCollections: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue([]) }),
      createCollection: jest.fn().mockResolvedValue(undefined),
      collection: jest.fn().mockReturnValue({
        createIndex: jest.fn().mockResolvedValue(undefined),
      }),
    } as any;

    const store = new MongoTelemetryStore('mongodb://localhost:27017/test-db');
    (store as any).client = { connect: jest.fn().mockResolvedValue(undefined), close: jest.fn() };
    (store as any).db = mockDb;

    const collection = await (store as any).ensureCollection();

    expect(mockDb.listCollections).toHaveBeenCalledWith({ name: 'telemetry_events' });
    expect(mockDb.createCollection).toHaveBeenCalledWith('telemetry_events', {
      timeseries: {
        timeField: 'timestamp',
        metaField: 'metadata',
        granularity: 'seconds',
      },
    });
    expect(collection.createIndex).toHaveBeenCalledWith({ 'metadata.ecosystemId': 1, timestamp: -1 });
  });

  it('ensureCollection() reuses existing collection', async () => {
    const mockCollection = { createIndex: jest.fn().mockResolvedValue(undefined) } as any;
    const mockDb = {
      listCollections: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue([{ name: 'telemetry_events' }]) }),
      createCollection: jest.fn(),
      collection: jest.fn().mockReturnValue(mockCollection),
    } as any;

    const store = new MongoTelemetryStore('mongodb://localhost:27017/test-db');
    (store as any).client = { connect: jest.fn().mockResolvedValue(undefined), close: jest.fn() };
    (store as any).db = mockDb;
    (store as any).collection = mockCollection;

    const collection = await (store as any).ensureCollection();

    expect(mockDb.createCollection).not.toHaveBeenCalled();
    expect(collection).toBe(mockCollection);
  });

  it('findLatestPayload() returns payload for valid MAC', async () => {
    const mockCursor = {
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      project: jest.fn().mockReturnThis(),
      next: jest.fn().mockResolvedValue({
        payload: {
          devices: [
            { mac_addr: 'AABBCCDDEEFF', temperature: 25 },
            { mac_addr: '112233445566', humidity: 60 },
          ],
        },
      }),
    } as any;

    const collection = createMockCollection();
    (collection.find as jest.Mock).mockReturnValue(mockCursor);

    const store = new MongoTelemetryStore('mongodb://localhost:27017/test-db');
    jest.spyOn(store as any, 'ensureCollection').mockResolvedValue(collection as any);

    const result = await store.findLatestPayload('AA:BB:CC:DD:EE:FF', 'eco-123');

    expect(result).toEqual({ temperature: 25 });
  });

  it('findLatestPayload() returns null for invalid MAC format', async () => {
    const store = new MongoTelemetryStore('mongodb://localhost:27017/test-db');
    jest.spyOn(store as any, 'ensureCollection').mockResolvedValue({} as any);

    const result = await store.findLatestPayload('invalid-mac', 'eco-123');

    expect(result).toBeNull();
  });

  it('findLatestPayload() returns null when no matching device', async () => {
    const mockCursor = {
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      project: jest.fn().mockReturnThis(),
      next: jest.fn().mockResolvedValue({
        payload: {
          devices: [{ mac_addr: '112233445566', temperature: 25 }],
        },
      }),
    } as any;

    const collection = createMockCollection();
    (collection.find as jest.Mock).mockReturnValue(mockCursor);

    const store = new MongoTelemetryStore('mongodb://localhost:27017/test-db');
    jest.spyOn(store as any, 'ensureCollection').mockResolvedValue(collection as any);

    const result = await store.findLatestPayload('AABBCCDDEEFF', 'eco-123');

    expect(result).toBeNull();
  });

  it('getVolumeByEcosystemIds() calculates total bytes', async () => {
    const collection = createMockCollection();
    (collection.aggregate as jest.Mock).mockReturnValue({
      toArray: jest.fn().mockResolvedValue([{ _id: null, total: 1024 }]),
    });

    const store = new MongoTelemetryStore('mongodb://localhost:27017/test-db');
    (store as any).collection = collection as any;

    const result = await store.getVolumeByEcosystemIds(['eco-1', 'eco-2']);

    expect(result).toBe(1024);
    expect(collection.aggregate).toHaveBeenCalledWith([
      { $match: { 'metadata.ecosystemId': { $in: ['eco-1', 'eco-2'] } } },
      { $group: { _id: null, total: { $sum: { $ifNull: ['$sizeBytes', 0] } } } },
    ]);
  });

  it('getVolumeByEcosystemIds() returns 0 when no results', async () => {
    const collection = createMockCollection();
    (collection.aggregate as jest.Mock).mockReturnValue({
      toArray: jest.fn().mockResolvedValue([]),
    });

    const store = new MongoTelemetryStore('mongodb://localhost:27017/test-db');
    (store as any).collection = collection as any;

    const result = await store.getVolumeByEcosystemIds(['eco-1']);

    expect(result).toBe(0);
  });
});
