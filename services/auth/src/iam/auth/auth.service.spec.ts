import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { UserStatus, Role } from '@prisma/client';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service';
import { RedisService } from '../redis/redis.service';
import { UsersService } from '../users/users.service';

jest.mock('argon2');

describe('AuthService - Complete Authentication Flows', () => {
  let service: AuthService;
  let usersService: any;
  let jwtService: any;
  let redisService: any;

  const mockUser = {
    id: 'user-123',
    email: 'auth-test@test.test',
    passwordHash: 'hashed_password',
    role: Role.USER,
    status: UserStatus.ACTIVE,
    isActive: true,
    did: 'did:firefly:custom/user@aurora.local',
    hashedRefreshToken: 'hashed_refresh_token',
  };

  beforeEach(async () => {
    process.env.JWT_PUBLIC_KEY = '-----BEGIN PUBLIC KEY-----\\nmock-key\\n-----END PUBLIC KEY-----';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            createPasswordResetToken: jest.fn(),
            consumePasswordResetToken: jest.fn(),
            validatePasswordResetToken: jest.fn(),
            findByEmail: jest.fn(),
            findAuthUserById: jest.fn(),
            updateRefreshTokenHash: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
            verifyAsync: jest.fn(),
          },
        },
        {
          provide: RedisService,
          useValue: {
            addToBlacklist: jest.fn(),
            isBlacklisted: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
    redisService = module.get(RedisService);

    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    it('should validate user with correct credentials', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      (argon2.verify as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('auth-test@test.test', 'password123');

      expect(result).toEqual(mockUser);
      expect(usersService.findByEmail).toHaveBeenCalledWith('auth-test@test.test');
    });

    it('should reject pending users', async () => {
      const pendingUser = { ...mockUser, status: UserStatus.PENDING };
      usersService.findByEmail.mockResolvedValue(pendingUser);

      await expect(
        service.validateUser('auth-test@test.test', 'password123'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject revoked users', async () => {
      const revokedUser = { ...mockUser, status: UserStatus.REVOKED };
      usersService.findByEmail.mockResolvedValue(revokedUser);

      await expect(
        service.validateUser('auth-test@test.test', 'password123'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject passblocked users', async () => {
      const passblockedUser = { ...mockUser, status: UserStatus.PASSBLOCK };
      usersService.findByEmail.mockResolvedValue(passblockedUser);

      await expect(
        service.validateUser('auth-test@test.test', 'password123'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject inactive users', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      usersService.findByEmail.mockResolvedValue(inactiveUser);

      await expect(
        service.validateUser('auth-test@test.test', 'password123'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject wrong password', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      (argon2.verify as jest.Mock).mockResolvedValue(false);

      await expect(
        service.validateUser('auth-test@test.test', 'wrongpassword'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject non-existent users', async () => {
      usersService.findByEmail.mockRejectedValue(new Error('User not found'));

      await expect(
        service.validateUser('nonexistent@test.test', 'password123'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('password reset delegation', () => {
    it('should delegate recovery request to UsersService', async () => {
      usersService.createPasswordResetToken.mockResolvedValue(undefined);

      await service.requestPasswordRecovery('auth-test@test.test');

      expect(usersService.createPasswordResetToken).toHaveBeenCalledWith('auth-test@test.test');
    });

    it('should delegate reset consumption to UsersService', async () => {
      usersService.consumePasswordResetToken.mockResolvedValue(undefined);

      await service.resetPasswordWithOneTimeToken('raw-reset-token', 'StrongPass123!');

      expect(usersService.consumePasswordResetToken).toHaveBeenCalledWith(
        'raw-reset-token',
        'StrongPass123!',
      );
    });

    it('should delegate reset token validation to UsersService', async () => {
      usersService.validatePasswordResetToken.mockResolvedValue({ valid: true });

      const result = await service.validatePasswordResetToken('raw-reset-token');

      expect(usersService.validatePasswordResetToken).toHaveBeenCalledWith('raw-reset-token');
      expect(result).toEqual({ valid: true });
    });
  });

  describe('generateTokens', () => {
    it('should generate access and refresh tokens', async () => {
      jwtService.signAsync
        .mockResolvedValueOnce('access_token_1')
        .mockResolvedValueOnce('refresh_token_1');

      const result = await service.generateTokens(mockUser);

      expect(result).toMatchObject({
        accessToken: 'access_token_1',
        refreshToken: 'refresh_token_1',
        accessTokenExpiresIn: expect.any(String),
        refreshTokenExpiresIn: expect.any(String),
      });
    });
  });

  describe('login', () => {
    it('should complete full login flow', async () => {
      jwtService.signAsync
        .mockResolvedValueOnce('access_token')
        .mockResolvedValueOnce('refresh_token');
      usersService.updateRefreshTokenHash.mockResolvedValue(undefined);
      (argon2.hash as jest.Mock).mockResolvedValue('hashed_refresh_token');

      const result = await service.login(mockUser);

      expect(result).toMatchObject({
        accessToken: 'access_token',
        refreshToken: expect.any(String),
      });
      expect(usersService.updateRefreshTokenHash).toHaveBeenCalledWith(
        mockUser.id,
        'hashed_refresh_token',
      );
    });
  });

  describe('refreshTokens', () => {
    it('should refresh tokens with valid refresh token', async () => {
      const userForRefresh = { ...mockUser, hashedRefreshToken: 'hashed_token' };
      usersService.findAuthUserById.mockResolvedValue(userForRefresh);
      (argon2.verify as jest.Mock).mockResolvedValue(true);
      jwtService.verifyAsync.mockResolvedValue({ sub: mockUser.id, type: 'refresh' });
      jwtService.signAsync
        .mockResolvedValueOnce('new_access_token')
        .mockResolvedValueOnce('new_refresh_token');

      const result = await service.refreshTokens(mockUser.id, 'raw_refresh_token');

      expect(result).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
      });
      expect(usersService.updateRefreshTokenHash).toHaveBeenCalled();
    });

    it('should reject refresh when user is pending', async () => {
      const pendingUser = { ...mockUser, status: UserStatus.PENDING };
      usersService.findAuthUserById.mockResolvedValue(pendingUser);
      jwtService.verifyAsync.mockResolvedValue({ sub: mockUser.id, type: 'refresh' });

      await expect(service.refreshTokens(mockUser.id, 'token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should reject refresh when user is revoked', async () => {
      const revokedUser = { ...mockUser, status: UserStatus.REVOKED };
      usersService.findAuthUserById.mockResolvedValue(revokedUser);
      jwtService.verifyAsync.mockResolvedValue({ sub: mockUser.id, type: 'refresh' });

      await expect(service.refreshTokens(mockUser.id, 'token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should reject refresh when user is passblocked', async () => {
      const passblockedUser = { ...mockUser, status: UserStatus.PASSBLOCK };
      usersService.findAuthUserById.mockResolvedValue(passblockedUser);
      jwtService.verifyAsync.mockResolvedValue({ sub: mockUser.id, type: 'refresh' });

      await expect(service.refreshTokens(mockUser.id, 'token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should reject refresh when refresh token is invalid', async () => {
      usersService.findAuthUserById.mockResolvedValue(mockUser);
      (argon2.verify as jest.Mock).mockResolvedValue(false);
      jwtService.verifyAsync.mockResolvedValue({ sub: mockUser.id, type: 'refresh' });

      await expect(service.refreshTokens(mockUser.id, 'invalid_token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should reject refresh when user has no refresh token hash', async () => {
      const userNoRefresh = { ...mockUser, hashedRefreshToken: null };
      usersService.findAuthUserById.mockResolvedValue(userNoRefresh);
      jwtService.verifyAsync.mockResolvedValue({ sub: mockUser.id, type: 'refresh' });

      await expect(service.refreshTokens(mockUser.id, 'token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('should logout user and add token to blacklist', async () => {
      usersService.updateRefreshTokenHash.mockResolvedValue(undefined);
      redisService.addToBlacklist.mockResolvedValue(undefined);

      const result = await service.logout(mockUser.id);

      expect(result).toEqual({ success: true });
      expect(usersService.updateRefreshTokenHash).toHaveBeenCalledWith(mockUser.id, null);
      expect(redisService.addToBlacklist).toHaveBeenCalledWith(mockUser.id, 300);
    });
  });

  describe('Complete workflows', () => {
    it('SCENARIO: Login → Refresh → Logout', async () => {
      // 1. Login
      jwtService.signAsync
        .mockResolvedValueOnce('access_token_1')
        .mockResolvedValueOnce('refresh_token_1');
      usersService.updateRefreshTokenHash.mockResolvedValue(undefined);

      const loginResult = await service.login(mockUser);
      expect(loginResult.accessToken).toBeDefined();

      // 2. Refresh
      const userWithRefresh = { ...mockUser, hashedRefreshToken: 'some_hash' };
      usersService.findAuthUserById.mockResolvedValue(userWithRefresh);
      (argon2.verify as jest.Mock).mockResolvedValue(true);
      jwtService.verifyAsync.mockResolvedValue({ sub: mockUser.id, type: 'refresh' });
      jwtService.signAsync
        .mockResolvedValueOnce('access_token_2')
        .mockResolvedValueOnce('refresh_token_2');

      const refreshResult = await service.refreshTokens(mockUser.id, loginResult.refreshToken);
      expect(refreshResult.accessToken).toBeDefined();

      // 3. Logout
      redisService.addToBlacklist.mockResolvedValue(undefined);
      const logoutResult = await service.logout(mockUser.id);
      expect(logoutResult.success).toBe(true);
    });
  });

  describe('resolveUserIdFromRefreshToken', () => {
    it('should return user id when refresh token is valid', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: mockUser.id, type: 'refresh' });

      const userId = await service.resolveUserIdFromRefreshToken('refresh_token');

      expect(userId).toBe(mockUser.id);
    });

    it('should reject when token type is not refresh', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: mockUser.id, type: 'access' });

      await expect(service.resolveUserIdFromRefreshToken('refresh_token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});

