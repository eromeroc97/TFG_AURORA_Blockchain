import { describe, expect, it } from '@jest/globals';
import { serializeMetadata, deserializeMetadata } from './action-metadata.utils';
import { ActionType } from './action-types.enum';

describe('action-metadata.utils', () => {
  describe('serializeMetadata', () => {
    it('should return empty JSON object for null metadata', () => {
      const result = serializeMetadata(ActionType.ACCOUNT_APPROVE, null as any);
      expect(result).toBe('{}');
    });

    it('should return empty JSON object for empty object metadata', () => {
      const result = serializeMetadata(ActionType.ACCOUNT_APPROVE, {});
      expect(result).toBe('{}');
    });

    it('should serialize metadata with values', () => {
      const result = serializeMetadata(ActionType.ECOSYSTEM_ACCESS_GRANT, {
        ecosystemId: 'eco-1',
        grantedUserId: 'user-1',
      });
      const parsed = JSON.parse(result);
      expect(parsed.ecosystemId).toBe('eco-1');
      expect(parsed.grantedUserId).toBe('user-1');
    });
  });

  describe('deserializeMetadata', () => {
    it('should return null for empty string', () => {
      expect(deserializeMetadata('')).toBeNull();
    });

    it('should return null for empty JSON object', () => {
      expect(deserializeMetadata('{}')).toBeNull();
    });

    it('should deserialize valid JSON', () => {
      const result = deserializeMetadata('{"ecosystemId":"eco-1","grantedUserId":"user-1"}');
      expect(result).toEqual({ ecosystemId: 'eco-1', grantedUserId: 'user-1' });
    });

    it('should return null for invalid JSON', () => {
      const result = deserializeMetadata('invalid-json');
      expect(result).toBeNull();
    });
  });
});
