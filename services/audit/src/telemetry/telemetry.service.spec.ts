import { Test, TestingModule } from '@nestjs/testing';
import { TelemetryService } from './telemetry.service';
import { getModelToken } from '@nestjs/mongoose';
import { Telemetry } from './telemetry.schema';

describe('TelemetryService', () => {
  let service: TelemetryService;
  let mockModel: any;
  let mockExec: jest.Mock;

  beforeEach(async () => {
    mockExec = jest.fn();
    mockModel = {
      findOne: jest.fn().mockReturnValue({ exec: mockExec }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelemetryService,
        {
          provide: getModelToken(Telemetry.name),
          useValue: mockModel,
        },
      ],
    }).compile();

    service = module.get<TelemetryService>(TelemetryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('stableSortObject', () => {
    it('should sort object keys alphabetically', () => {
      const unsorted = { z: 1, a: 2, m: 3 };
      const sorted = (service as any).stableSortObject(unsorted);
      expect(Object.keys(sorted)).toEqual(['a', 'm', 'z']);
    });

    it('should sort nested objects', () => {
      const unsorted = { z: { c: 1, a: 2 }, a: 1 };
      const sorted = (service as any).stableSortObject(unsorted);
      expect(Object.keys(sorted)).toEqual(['a', 'z']);
      expect(Object.keys(sorted.z)).toEqual(['a', 'c']);
    });

    it('should handle arrays', () => {
      const unsorted = [{ z: 1 }, { a: 2 }];
      const sorted = (service as any).stableSortObject(unsorted);
      expect(sorted).toEqual([{ z: 1 }, { a: 2 }]);
    });

    it('should return primitives unchanged', () => {
      expect((service as any).stableSortObject('string')).toBe('string');
      expect((service as any).stableSortObject(123)).toBe(123);
      expect((service as any).stableSortObject(null)).toBe(null);
    });
  });

  describe('calculateHash', () => {
    it('should calculate consistent SHA256 hash', () => {
      const payload = { temperature: 25, humidity: 60 };
      const hash1 = (service as any).calculateHash(payload, 40.0, -3.0);
      const hash2 = (service as any).calculateHash(payload, 40.0, -3.0);
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
    });

    it('should produce different hashes for different coordinates', () => {
      const payload = { temperature: 25 };
      const hash1 = (service as any).calculateHash(payload, 40.0, -3.0);
      const hash2 = (service as any).calculateHash(payload, 41.0, -3.0);
      expect(hash1).not.toBe(hash2);
    });

    it('should produce different hashes for different payloads', () => {
      const hash1 = (service as any).calculateHash({ temp: 25 }, 40.0, -3.0);
      const hash2 = (service as any).calculateHash({ temp: 26 }, 40.0, -3.0);
      expect(hash1).not.toBe(hash2);
    });

    it('should sort payload keys before hashing', () => {
      const hash1 = (service as any).calculateHash({ b: 1, a: 2 }, 40.0, -3.0);
      const hash2 = (service as any).calculateHash({ a: 2, b: 1 }, 40.0, -3.0);
      expect(hash1).toBe(hash2);
    });
  });

  describe('findByIngestId', () => {
    it('should query telemetry by ingest ID', async () => {
      const mockTelemetry = { _doc: { metadata: { telemetryId: 'test-123' } } };
      mockExec.mockResolvedValue(mockTelemetry);

      const result = await service.findByIngestId('test-123');

      expect(mockModel.findOne).toHaveBeenCalledWith({ 'metadata.telemetryId': 'test-123' });
      expect(result).toEqual(mockTelemetry);
    });

    it('should return null when telemetry not found', async () => {
      mockExec.mockResolvedValue(null);

      const result = await service.findByIngestId('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('verifyIntegrity', () => {
    it('should return true when hashes match', async () => {
      const mockTelemetry = {
        payload: { temperature: 25 },
        metadata: { latitude: 40.0, longitude: -3.0 },
        hash: 'abc123',
      };
      mockExec.mockResolvedValue(mockTelemetry);

      const expectedHash = (service as any).calculateHash(
        { temperature: 25 },
        40.0,
        -3.0
      );

      const result = await service.verifyIntegrity(expectedHash, 'test-123');
      expect(result).toBe(true);
    });

    it('should return false when telemetry not found', async () => {
      mockExec.mockResolvedValue(null);

      const result = await service.verifyIntegrity('any-hash', 'nonexistent');

      expect(result).toBe(false);
    });

    it('should return false when hashes do not match', async () => {
      const mockTelemetry = {
        payload: { temperature: 25 },
        metadata: { latitude: 40.0, longitude: -3.0 },
      };
      mockExec.mockResolvedValue(mockTelemetry);

      const result = await service.verifyIntegrity('wrong-hash', 'test-123');

      expect(result).toBe(false);
    });
  });
});