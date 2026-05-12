import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';

jest.mock('./jwt-key.util', () => ({
  getJwtPublicKey: () => '-----BEGIN PUBLIC KEY-----\ntest\n-----END PUBLIC KEY-----',
}));

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(() => {
    strategy = new JwtStrategy();
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should return payload when role is present', async () => {
      const payload = { sub: 'user-123', role: 'admin' };

      const result = await strategy.validate(payload as any);

      expect(result).toEqual(payload);
    });

    it('should throw UnauthorizedException when role is missing', async () => {
      const payload = { sub: 'user-123' };

      await expect(strategy.validate(payload as any)).rejects.toThrow(
        new UnauthorizedException('Token inválido: sin rol')
      );
    });

    it('should throw UnauthorizedException when role is empty string', async () => {
      const payload = { sub: 'user-123', role: '' };

      await expect(strategy.validate(payload as any)).rejects.toThrow(
        new UnauthorizedException('Token inválido: sin rol')
      );
    });

    it('should throw UnauthorizedException when role is null', async () => {
      const payload = { sub: 'user-123', role: null };

      await expect(strategy.validate(payload as any)).rejects.toThrow(
        new UnauthorizedException('Token inválido: sin rol')
      );
    });

    it('should throw UnauthorizedException when role is undefined', async () => {
      const payload = { sub: 'user-123', role: undefined };

      await expect(strategy.validate(payload as any)).rejects.toThrow(
        new UnauthorizedException('Token inválido: sin rol')
      );
    });
  });
});