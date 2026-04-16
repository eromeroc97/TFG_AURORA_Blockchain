import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { Role } from '@prisma/client';

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            validateUser: jest.fn(),
            login: jest.fn(),
            refreshTokens: jest.fn(),
            logout: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);

    jest.clearAllMocks();
  });

  describe('POST /auth/login', () => {
    it('should return access and refresh tokens on successful login', async () => {
      authService.validateUser.mockResolvedValue(mockUser);
      authService.login.mockResolvedValue(mockTokens);

      const result = await controller.login({
        email: 'auth-test@test.test',
        password: 'password123',
      });

      expect(result).toEqual(mockTokens);
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
  });

  describe('POST /auth/refresh', () => {
    it('should return new tokens on successful refresh', async () => {
      const newTokens = { ...mockTokens, accessToken: 'new_access_token' };
      authService.refreshTokens.mockResolvedValue(newTokens);

      const result = await controller.refresh({
        userId: 'user-123',
        refreshToken: 'refresh_token_b64url_encoded_here',
      }, undefined);

      expect(result).toEqual(newTokens);
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
  });

  describe('Complete Authentication Scenarios', () => {
    it('COMPLETE FLOW: Login → Refresh → Logout', async () => {
      // 1. Login
      authService.validateUser.mockResolvedValue(mockUser);
      authService.login.mockResolvedValue(mockTokens);

      const loginResult = await controller.login({
        email: 'auth-test@test.test',
        password: 'password123',
      });

      expect(loginResult).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
      });

      // 2. Refresh
      const newTokens = { ...mockTokens, accessToken: 'new_access_token' };
      authService.refreshTokens.mockResolvedValue(newTokens);

      const refreshResult = await controller.refresh({
        userId: 'user-123',
        refreshToken: loginResult.refreshToken,
      }, undefined);

      expect(refreshResult.accessToken).toBe('new_access_token');

      // 3. Logout
      authService.logout.mockResolvedValue({ success: true });

      const logoutResult = await controller.logout({
        userId: 'user-123',
      }, undefined);

      expect(logoutResult.success).toBe(true);
    });
  });
});

