import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { Role } from '@prisma/client';
import { UnauthorizedException } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

describe('AuthController - API Endpoints', () => {
  let controller: AuthController;
  let authService: any;

  const mockUser = {
    id: 'user-123',
    email: 'auth-test@test.test',
    role: Role.USER,
    did: 'did:firefly:custom/user@aurora.local',
  };

  const mockTokens = {
    accessToken: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.mock.signature',
    refreshToken: 'refresh_token_b64url_encoded_here',
    accessTokenExpiresIn: '5m',
    refreshTokenExpiresIn: '24h',
  };

  const mockPublicTokens = {
    accessToken: mockTokens.accessToken,
    accessTokenExpiresIn: mockTokens.accessTokenExpiresIn,
    refreshTokenExpiresIn: mockTokens.refreshTokenExpiresIn,
  };

  const resMock = () => ({
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  }) as any;

  const reqWithCookie = (refreshToken: string = 'cookie_refresh_token') =>
    ({ headers: { cookie: `refreshToken=${refreshToken}` } }) as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            requestPasswordRecovery: jest.fn(),
            resetPasswordWithOneTimeToken: jest.fn(),
            validatePasswordResetToken: jest.fn(),
            validateUser: jest.fn(),
            login: jest.fn(),
            refreshTokens: jest.fn(),
            logout: jest.fn(),
            resolveUserIdFromRefreshToken: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);

    jest.clearAllMocks();
  });

  describe('POST /auth/login', () => {
    it('should return access token metadata on successful login', async () => {
      authService.validateUser.mockResolvedValue(mockUser);
      authService.login.mockResolvedValue(mockTokens);

      const result = await controller.login({
        email: 'auth-test@test.test',
        password: 'password123',
      });

      expect(result).toEqual(mockPublicTokens);
      expect(authService.validateUser).toHaveBeenCalledWith(
        'auth-test@test.test',
        'password123',
      );
      expect(authService.login).toHaveBeenCalledWith(mockUser);
    });

    it('should reject invalid credentials', async () => {
      authService.validateUser.mockRejectedValue(new Error('Invalid credentials'));

      await expect(
        controller.login({
          email: 'wrong@test.test',
          password: 'wrongpass',
        }),
      ).rejects.toThrow();
    });

    it('should set refresh cookie when res is provided', async () => {
      const res = resMock();
      authService.validateUser.mockResolvedValue(mockUser);
      authService.login.mockResolvedValue(mockTokens);

      await controller.login({ email: 'test@test.test', password: 'pass' }, res);

      expect(res.cookie).toHaveBeenCalledWith('refreshToken', mockTokens.refreshToken, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/',
        maxAge: 24 * 60 * 60 * 1000,
      });
    });
  });

  describe('POST /auth/recover', () => {
    it('should trigger password recovery flow with generic response', async () => {
      authService.requestPasswordRecovery.mockResolvedValue(undefined);

      const result = await controller.recover({ email: 'auth-test@test.test' });

      expect(authService.requestPasswordRecovery).toHaveBeenCalledWith('auth-test@test.test');
      expect(result).toEqual(
        expect.objectContaining({
          success: true,
          message: expect.stringContaining('Si la cuenta existe'),
        }),
      );
    });
  });

  describe('POST /auth/reset', () => {
    it('should reset password with one-time token', async () => {
      authService.resetPasswordWithOneTimeToken.mockResolvedValue(undefined);

      const result = await controller.reset({
        token: 'token_1234567890_abcdefghijklmnopqrstuvwxyz',
        password: 'StrongPass123!@#',
      });

      expect(authService.resetPasswordWithOneTimeToken).toHaveBeenCalledWith(
        'token_1234567890_abcdefghijklmnopqrstuvwxyz',
        'StrongPass123!@#',
      );
      expect(result).toEqual(
        expect.objectContaining({
          success: true,
        }),
      );
    });
  });

  describe('POST /auth/reset/validate', () => {
    it('should return token validation result', async () => {
      authService.validatePasswordResetToken.mockResolvedValue({ valid: true });

      const result = await controller.validateResetToken({
        token: 'token_1234567890_abcdefghijklmnopqrstuvwxyz',
      });

      expect(authService.validatePasswordResetToken).toHaveBeenCalledWith(
        'token_1234567890_abcdefghijklmnopqrstuvwxyz',
      );
      expect(result).toEqual({ valid: true });
    });
  });

  describe('POST /auth/refresh', () => {
    it('should return new access token metadata on successful refresh', async () => {
      const newTokens = { ...mockTokens, accessToken: 'new_access_token' };
      authService.refreshTokens.mockResolvedValue(newTokens);

      const expectedPublicTokens = {
        accessToken: newTokens.accessToken,
        accessTokenExpiresIn: newTokens.accessTokenExpiresIn,
        refreshTokenExpiresIn: newTokens.refreshTokenExpiresIn,
      };

      const result = await controller.refresh({
        userId: 'user-123',
        refreshToken: 'refresh_token_b64url_encoded_here',
      }, undefined);

      expect(result).toEqual(expectedPublicTokens);
      expect(authService.refreshTokens).toHaveBeenCalledWith(
        'user-123',
        'refresh_token_b64url_encoded_here',
      );
    });

    it('should reject invalid refresh token', async () => {
      authService.refreshTokens.mockRejectedValue(new Error('Refresh token invalid'));

      await expect(
        controller.refresh({
          userId: 'user-123',
          refreshToken: 'invalid_token',
        }, undefined),
      ).rejects.toThrow();
    });

    it('should throw UnauthorizedException when no refresh token provided', async () => {
      await expect(
        controller.refresh({}, undefined),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('should fall back to cookie when no body refresh token', async () => {
      authService.refreshTokens.mockResolvedValue(mockTokens);

      await controller.refresh(
        { userId: 'user-123' },
        reqWithCookie('cookie_refresh_token'),
      );

      expect(authService.refreshTokens).toHaveBeenCalledWith('user-123', 'cookie_refresh_token');
    });

    it('should resolve userId via service when not in body', async () => {
      authService.resolveUserIdFromRefreshToken.mockResolvedValue('resolved-user-id');
      authService.refreshTokens.mockResolvedValue(mockTokens);

      await controller.refresh(
        { refreshToken: 'some_token' },
        undefined,
      );

      expect(authService.resolveUserIdFromRefreshToken).toHaveBeenCalledWith('some_token');
      expect(authService.refreshTokens).toHaveBeenCalledWith('resolved-user-id', 'some_token');
    });

    it('should set refresh cookie when res is provided', async () => {
      const res = resMock();
      authService.refreshTokens.mockResolvedValue(mockTokens);

      await controller.refresh(
        { userId: 'user-123', refreshToken: 'token' },
        undefined,
        res,
      );

      expect(res.cookie).toHaveBeenCalled();
    });
  });

  describe('POST /auth/logout', () => {
    it('should successfully logout user and blacklist token', async () => {
      authService.logout.mockResolvedValue({ success: true });

      const result = await controller.logout({
        userId: 'user-123',
      }, undefined);

      expect(result).toEqual({ success: true });
      expect(authService.logout).toHaveBeenCalledWith('user-123');
    });

    it('should throw when neither userId nor cookie present', async () => {
      await expect(
        controller.logout({}, undefined),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('should resolve userId from cookie when body userId missing', async () => {
      authService.resolveUserIdFromRefreshToken.mockResolvedValue('cookie-user-id');
      authService.logout.mockResolvedValue({ success: true });

      await controller.logout({}, reqWithCookie('cookie_token'));

      expect(authService.resolveUserIdFromRefreshToken).toHaveBeenCalledWith('cookie_token');
      expect(authService.logout).toHaveBeenCalledWith('cookie-user-id');
    });

    it('should clear cookie when res is provided', async () => {
      const res = resMock();
      authService.logout.mockResolvedValue({ success: true });

      await controller.logout({ userId: 'user-123' }, undefined, res);

      expect(res.clearCookie).toHaveBeenCalledWith('refreshToken', {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/',
      });
    });
  });

  describe('Complete Authentication Scenarios', () => {
    it('COMPLETE FLOW: Login → Refresh → Logout', async () => {
      authService.validateUser.mockResolvedValue(mockUser);
      authService.login.mockResolvedValue(mockTokens);

      const loginResult = await controller.login({
        email: 'auth-test@test.test',
        password: 'password123',
      });

      expect(loginResult).toMatchObject({
        accessToken: expect.any(String),
        accessTokenExpiresIn: expect.any(String),
        refreshTokenExpiresIn: expect.any(String),
      });

      const newTokens = { ...mockTokens, accessToken: 'new_access_token' };
      authService.refreshTokens.mockResolvedValue(newTokens);

      const refreshResult = await controller.refresh({
        userId: 'user-123',
        refreshToken: mockTokens.refreshToken,
      }, undefined);

      expect(refreshResult.accessToken).toBe('new_access_token');

      authService.logout.mockResolvedValue({ success: true });

      const logoutResult = await controller.logout({
        userId: 'user-123',
      }, undefined);

      expect(logoutResult.success).toBe(true);
    });
  });

  describe('Cookie policy configuration', () => {
    const OLD_ENV = { ...process.env };

    afterEach(() => {
      process.env = { ...OLD_ENV };
    });

    it('should honor REFRESH_COOKIE_SECURE=true', async () => {
      process.env.REFRESH_COOKIE_SECURE = 'true';
      const res = resMock();
      authService.validateUser.mockResolvedValue(mockUser);
      authService.login.mockResolvedValue(mockTokens);

      await controller.login({ email: 'a@b.com', password: 'x' }, res);

      expect(res.cookie).toHaveBeenCalledWith(expect.any(String), expect.any(String), expect.objectContaining({
        secure: true,
      }));
    });

    it('should honor REFRESH_COOKIE_SAMESITE=strict', async () => {
      process.env.REFRESH_COOKIE_SAMESITE = 'strict';
      const res = resMock();
      authService.validateUser.mockResolvedValue(mockUser);
      authService.login.mockResolvedValue(mockTokens);

      await controller.login({ email: 'a@b.com', password: 'x' }, res);

      expect(res.cookie).toHaveBeenCalledWith(expect.any(String), expect.any(String), expect.objectContaining({
        sameSite: 'strict',
      }));
    });

    it('should honor REFRESH_COOKIE_SAMESITE=none', async () => {
      process.env.REFRESH_COOKIE_SAMESITE = 'none';
      const res = resMock();
      authService.validateUser.mockResolvedValue(mockUser);
      authService.login.mockResolvedValue(mockTokens);

      await controller.login({ email: 'a@b.com', password: 'x' }, res);

      expect(res.cookie).toHaveBeenCalledWith(expect.any(String), expect.any(String), expect.objectContaining({
        sameSite: 'none',
      }));
    });

    it('should parse plain number refreshTokenExpiresIn', async () => {
      const res = resMock();
      authService.validateUser.mockResolvedValue(mockUser);
      authService.login.mockResolvedValue({ ...mockTokens, refreshTokenExpiresIn: '5000' });

      await controller.login({ email: 'a@b.com', password: 'x' }, res);

      expect(res.cookie).toHaveBeenCalledWith(expect.any(String), expect.any(String), expect.objectContaining({
        maxAge: 5000,
      }));
    });

    it('should parse minutes refreshTokenExpiresIn', async () => {
      const res = resMock();
      authService.validateUser.mockResolvedValue(mockUser);
      authService.login.mockResolvedValue({ ...mockTokens, refreshTokenExpiresIn: '30m' });

      await controller.login({ email: 'a@b.com', password: 'x' }, res);

      expect(res.cookie).toHaveBeenCalledWith(expect.any(String), expect.any(String), expect.objectContaining({
        maxAge: 30 * 60 * 1000,
      }));
    });

    it('should parse seconds refreshTokenExpiresIn', async () => {
      const res = resMock();
      authService.validateUser.mockResolvedValue(mockUser);
      authService.login.mockResolvedValue({ ...mockTokens, refreshTokenExpiresIn: '60s' });

      await controller.login({ email: 'a@b.com', password: 'x' }, res);

      expect(res.cookie).toHaveBeenCalledWith(expect.any(String), expect.any(String), expect.objectContaining({
        maxAge: 60 * 1000,
      }));
    });

    it('should parse days refreshTokenExpiresIn', async () => {
      const res = resMock();
      authService.validateUser.mockResolvedValue(mockUser);
      authService.login.mockResolvedValue({ ...mockTokens, refreshTokenExpiresIn: '1d' });

      await controller.login({ email: 'a@b.com', password: 'x' }, res);

      expect(res.cookie).toHaveBeenCalledWith(expect.any(String), expect.any(String), expect.objectContaining({
        maxAge: 24 * 60 * 60 * 1000,
      }));
    });

    it('should fallback maxAge for invalid expiresIn format', async () => {
      const res = resMock();
      authService.validateUser.mockResolvedValue(mockUser);
      authService.login.mockResolvedValue({ ...mockTokens, refreshTokenExpiresIn: 'invalid' });

      await controller.login({ email: 'a@b.com', password: 'x' }, res);

      expect(res.cookie).toHaveBeenCalledWith(expect.any(String), expect.any(String), expect.objectContaining({
        maxAge: 24 * 60 * 60 * 1000,
      }));
    });

    it('should fallback maxAge for undefined expiresIn', async () => {
      const res = resMock();
      authService.validateUser.mockResolvedValue(mockUser);
      authService.login.mockResolvedValue({ ...mockTokens, refreshTokenExpiresIn: undefined });

      await controller.login({ email: 'a@b.com', password: 'x' }, res);

      expect(res.cookie).toHaveBeenCalledWith(expect.any(String), expect.any(String), expect.objectContaining({
        maxAge: 24 * 60 * 60 * 1000,
      }));
    });

    it('should honor REFRESH_COOKIE_SECURE=false', async () => {
      process.env.REFRESH_COOKIE_SECURE = 'false';
      const res = resMock();
      authService.validateUser.mockResolvedValue(mockUser);
      authService.login.mockResolvedValue(mockTokens);

      await controller.login({ email: 'a@b.com', password: 'x' }, res);

      expect(res.cookie).toHaveBeenCalledWith(expect.any(String), expect.any(String), expect.objectContaining({
        secure: false,
      }));
    });

    it('should fallback secure cookie when env is invalid', async () => {
      process.env.REFRESH_COOKIE_SECURE = 'maybe';
      const res = resMock();
      authService.validateUser.mockResolvedValue(mockUser);
      authService.login.mockResolvedValue(mockTokens);

      await controller.login({ email: 'a@b.com', password: 'x' }, res);

      expect(res.cookie).toHaveBeenCalledWith(expect.any(String), expect.any(String), expect.objectContaining({
        secure: false,
      }));
    });

    it('should parse refreshToken from malformed cookie header', async () => {
      authService.resolveUserIdFromRefreshToken.mockResolvedValue('user-id');
      authService.refreshTokens.mockResolvedValue(mockTokens);

      const req = { headers: { cookie: '=some_value; refreshToken=cookie_token' } } as any;
      await controller.refresh({}, req);

      expect(authService.resolveUserIdFromRefreshToken).toHaveBeenCalledWith('cookie_token');
      expect(authService.refreshTokens).toHaveBeenCalled();
    });
  });
});
