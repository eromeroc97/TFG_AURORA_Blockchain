import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: any;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    };
    guard = new RolesGuard(reflector);
  });

  const createMockContext = (user: any, handler: any = {}, classRef: any = {}) => {
    return {
      getHandler: () => handler,
      getClass: () => classRef,
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  };

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should return true when no roles are required', async () => {
      reflector.getAllAndOverride.mockReturnValue(null);
      const context = createMockContext({ role: 'user' });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return true when user has required role (uppercase)', async () => {
      reflector.getAllAndOverride.mockReturnValue(['ADMIN']);
      const context = createMockContext({ role: 'ADMIN' });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return true when user has required role (case insensitive)', async () => {
      reflector.getAllAndOverride.mockReturnValue(['ADMIN']);
      const context = createMockContext({ role: 'admin' });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return true when user has one of required roles', async () => {
      reflector.getAllAndOverride.mockReturnValue(['ADMIN', 'MODERATOR']);
      const context = createMockContext({ role: 'moderator' });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return false when user does not have required role', async () => {
      reflector.getAllAndOverride.mockReturnValue(['ADMIN']);
      const context = createMockContext({ role: 'user' });

      const result = await guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should return false when user.role is missing', async () => {
      reflector.getAllAndOverride.mockReturnValue(['ADMIN']);
      const context = createMockContext({});

      const result = await guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should return false when user role does not match any required', async () => {
      reflector.getAllAndOverride.mockReturnValue(['ADMIN', 'MODERATOR']);
      const context = createMockContext({ role: 'user' });

      const result = await guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should handle multiple required roles as array', async () => {
      reflector.getAllAndOverride.mockReturnValue(['ADMIN', 'SUPER_ADMIN', 'MODERATOR']);
      const context = createMockContext({ role: 'super_admin' });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });
  });
});