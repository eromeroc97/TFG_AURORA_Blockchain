import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  const reflectorMock = {
    getAllAndOverride: jest.fn(),
  } as unknown as Reflector;

  const makeContext = (user?: { role: Role }): ExecutionContext => {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows request when endpoint has no required roles', () => {
    const guard = new RolesGuard(reflectorMock);
    reflectorMock.getAllAndOverride = jest.fn().mockReturnValue(undefined);

    const result = guard.canActivate(makeContext());

    expect(reflectorMock.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, expect.any(Array));
    expect(result).toBe(true);
  });

  it('denies request when roles are required but user is missing', () => {
    const guard = new RolesGuard(reflectorMock);
    reflectorMock.getAllAndOverride = jest.fn().mockReturnValue([Role.ADMIN]);

    const result = guard.canActivate(makeContext(undefined));

    expect(result).toBe(false);
  });

  it('denies request when user role is not allowed', () => {
    const guard = new RolesGuard(reflectorMock);
    reflectorMock.getAllAndOverride = jest.fn().mockReturnValue([Role.ADMIN]);

    const result = guard.canActivate(makeContext({ role: Role.USER }));

    expect(result).toBe(false);
  });

  it('allows request when user role is included in required roles', () => {
    const guard = new RolesGuard(reflectorMock);
    reflectorMock.getAllAndOverride = jest.fn().mockReturnValue([Role.USER, Role.ADMIN]);

    const result = guard.canActivate(makeContext({ role: Role.USER }));

    expect(result).toBe(true);
  });
});
