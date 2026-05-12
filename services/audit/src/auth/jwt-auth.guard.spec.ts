import { UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(() => {
    guard = new JwtAuthGuard();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('handleRequest', () => {
    it('should return user when valid', () => {
      const user = { sub: 'user-123', role: 'admin' };
      const err = null;
      const info = null;

      const result = guard.handleRequest(err, user, info);

      expect(result).toEqual(user);
    });

    it('should throw UnauthorizedException when user is null', () => {
      const err = null;
      const user = null;
      const info = null;

      expect(() => guard.handleRequest(err, user, info)).toThrow(
        new UnauthorizedException('Token inválido o expirado')
      );
    });

    it('should throw UnauthorizedException when user is undefined', () => {
      const err = null;
      const user = undefined;
      const info = null;

      expect(() => guard.handleRequest(err, user, info)).toThrow(
        new UnauthorizedException('Token inválido o expirado')
      );
    });

    it('should throw error when err is present', () => {
      const err = new Error('Token expired');
      const user = null;
      const info = null;

      expect(() => guard.handleRequest(err, user, info)).toThrow('Token expired');
    });

    it('should throw UnauthorizedException when user is false', () => {
      const err = null;
      const user = false;
      const info = null;

      expect(() => guard.handleRequest(err, user, info)).toThrow(
        new UnauthorizedException('Token inválido o expirado')
      );
    });

    it('should throw custom error combined with UnauthorizedException when both exist', () => {
      const err = new Error('Custom error');
      const user = null;
      const info = null;

      expect(() => guard.handleRequest(err, user, info)).toThrow('Custom error');
    });
  });
});