import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';

jest.mock('./jwt-key.util', () => ({
  getJwtPublicKey: jest.fn(() => 'mock-public-key'),
}));

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(() => {
    strategy = new JwtStrategy();
  });

  describe('validate', () => {
    it('should return payload for GLOBAL_ADMIN role', async () => {
      const payload = { sub: 'user-123', role: 'GLOBAL_ADMIN' };
      const result = await strategy.validate(payload);
      expect(result).toEqual(payload);
    });

    it('should return payload for ADMIN role', async () => {
      const payload = { sub: 'user-456', role: 'ADMIN' };
      const result = await strategy.validate(payload);
      expect(result).toEqual(payload);
    });

    it('should throw UnauthorizedException for USER role', async () => {
      const payload = { sub: 'user-789', role: 'USER' };
      await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for unknown role', async () => {
      const payload = { sub: 'user-101', role: 'UNKNOWN_ROLE' };
      await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when role is missing', async () => {
      const payload = { sub: 'user-101' } as { sub: string; role: string };
      await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException with specific message', async () => {
      const payload = { sub: 'user-123', role: 'USER' };
      try {
        await strategy.validate(payload);
        fail('Expected UnauthorizedException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedException);
        expect((error as UnauthorizedException).message).toBe(
          'Only GLOBAL_ADMIN or ADMIN role can access this service'
        );
      }
    });
  });
});