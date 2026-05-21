import { BadRequestException, ForbiddenException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EcosystemStatus, AccessRole, Role, UserStatus, NotificationType, NotificationCategory, ReferenceType, Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { CryptoService } from '../../crypto/crypto.service';
import { MailService } from '../../shared/mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EcosystemsService } from './ecosystems.service';
import { ActionsAnchorService } from '../../blockchain/anchoring/actions-anchor.service';

describe('EcosystemsService', () => {
  let service: EcosystemsService;
  const keyBuffer = Buffer.alloc(32, 7);

  const prismaMock = {
    user: { findUnique: jest.fn() as any, findMany: jest.fn() as any },
    identity: { create: jest.fn() as any },
    ecosystem: {
      create: jest.fn() as any,
      findUnique: jest.fn() as any,
      findMany: jest.fn() as any,
      findFirst: jest.fn() as any,
      update: jest.fn() as any,
    },
    ecosystemAccess: {
      findUnique: jest.fn() as any,
      findMany: jest.fn() as any,
      create: jest.fn() as any,
      update: jest.fn() as any,
      delete: jest.fn() as any,
    },
    device: { findMany: jest.fn() as any },
    notification: {
      findFirst: jest.fn() as any,
      create: jest.fn() as any,
    },
  };

  const cryptoMock = {
    generateKeyPair: jest.fn() as any,
    encryptPrivateKey: jest.fn() as any,
    decryptPrivateKey: jest.fn() as any,
    sign: jest.fn() as any,
  };

  const mailMock = {
    sendNewNotificationEmail: jest.fn() as any,
    sendEcosystemDelegationResponseEmail: jest.fn() as any,
  };

  const notificationsMock = { create: jest.fn() as any };
  const anchorMock = { anchorAction: jest.fn() as any };

  beforeEach(async () => {
    process.env.API_KEY_ENCRYPTION_KEY = keyBuffer.toString('base64');
    process.env.AUTH_INTERNAL_TOKEN = 'test-internal-token';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EcosystemsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: CryptoService, useValue: cryptoMock },
        { provide: MailService, useValue: mailMock },
        { provide: NotificationsService, useValue: notificationsMock },
        { provide: ActionsAnchorService, useValue: anchorMock },
      ],
    }).compile();

    service = module.get<EcosystemsService>(EcosystemsService);
    jest.clearAllMocks();
  });

  const activeUser = { id: 'user-1', role: Role.USER, status: UserStatus.ACTIVE, isActive: true, identity: { publicKey: 'pub-key' } };
  const ecosystemSelect = { id: true, name: true, ownerId: true, status: true, latitude: true, longitude: true, isOnline: true, lastSeen: true, createdAt: true, updatedAt: true };

  describe('getApiKeyEncryptionKey', () => {
    it('should throw when API_KEY_ENCRYPTION_KEY is missing', () => {
      delete process.env.API_KEY_ENCRYPTION_KEY;
      expect(() => service['getApiKeyEncryptionKey']()).toThrow(InternalServerErrorException);
    });

    it('should throw when key is not 32 bytes', () => {
      process.env.API_KEY_ENCRYPTION_KEY = Buffer.alloc(16, 1).toString('base64');
      expect(() => service['getApiKeyEncryptionKey']()).toThrow(InternalServerErrorException);
    });
  });

  describe('encryptApiKey / decryptApiKey (round-trip)', () => {
    it('should encrypt and decrypt successfully', () => {
      const apiKey = 'AUR-TEST-ROUNDTRIP';
      const encrypted = service['encryptApiKey'](apiKey);
      const decrypted = service['decryptApiKey']({
        apiKeyCiphertext: encrypted.apiKeyCiphertext,
        apiKeyIv: encrypted.apiKeyIv,
        apiKeyAuthTag: encrypted.apiKeyAuthTag,
      });
      expect(decrypted).toBe(apiKey);
    });
  });

  describe('create', () => {
    it('should throw ForbiddenException when actorId is missing', async () => {
      await expect(service.create({ name: 'test' }, undefined as any)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('should throw NotFoundException when user not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      await expect(service.create({ name: 'test' }, 'actor-id')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should throw ForbiddenException when user role is not USER', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ ...activeUser, role: Role.ADMIN });
      await expect(service.create({ name: 'test' }, 'actor-id')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('should throw ForbiddenException when user not active', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ ...activeUser, isActive: false, status: UserStatus.PENDING });
      await expect(service.create({ name: 'test' }, 'actor-id')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('should throw ForbiddenException when user has no identity', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ ...activeUser, identity: null });
      await expect(service.create({ name: 'test' }, 'actor-id')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('should succeed with identity and apiKey', async () => {
      prismaMock.user.findUnique.mockResolvedValue(activeUser);
      cryptoMock.generateKeyPair.mockReturnValue({ publicKey: 'pub', privateKey: 'priv' });
      cryptoMock.encryptPrivateKey.mockReturnValue({ ciphertext: 'c', iv: 'i', authTag: 'a' });
      prismaMock.identity.create.mockResolvedValue({ id: 'ident-id' });
      prismaMock.ecosystem.create.mockResolvedValue({ id: 'eco-id', name: 'test', ownerId: 'user-1', status: EcosystemStatus.ACTIVE });

      const result = await service.create({ name: 'test', latitude: 1, longitude: 2 }, 'user-1');

      expect(result.name).toBe('test');
      expect(result.apiKey).toBeTruthy();
      expect(anchorMock.anchorAction).toHaveBeenCalled();
    });
  });

  describe('getApiKey', () => {
    it('should throw ForbiddenException when actorId is missing', async () => {
      await expect(service.getApiKey('eco-id', undefined)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('should return decrypted api key for owner', async () => {
      const apiKey = 'AUR-TEST-KEY';
      const encrypted = service['encryptApiKey'](apiKey);
      prismaMock.ecosystem.findUnique.mockResolvedValue({
        id: 'eco-id', ownerId: 'actor-id',
        apiKey: encrypted.apiKeyCiphertext, apiKeyIv: encrypted.apiKeyIv, apiKeyAuthTag: encrypted.apiKeyAuthTag,
      });

      const result = await service.getApiKey('eco-id', 'actor-id');
      expect(result).toEqual({ ecosystemId: 'eco-id', apiKey });
    });

    it('should throw ForbiddenException when owner mismatch', async () => {
      prismaMock.ecosystem.findUnique.mockResolvedValue({ id: 'eco-id', ownerId: 'other-id', apiKey: 'c', apiKeyIv: 'i', apiKeyAuthTag: 'a' });
      await expect(service.getApiKey('eco-id', 'actor-id')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('should throw NotFoundException when encrypted fields missing', async () => {
      prismaMock.ecosystem.findUnique.mockResolvedValue({ id: 'eco-id', ownerId: 'actor-id', apiKey: null, apiKeyIv: null, apiKeyAuthTag: null });
      await expect(service.getApiKey('eco-id', 'actor-id')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should throw NotFoundException when ecosystem not found', async () => {
      prismaMock.ecosystem.findUnique.mockResolvedValue(null);
      await expect(service.getApiKey('eco-id', 'actor-id')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('validateApiKey', () => {
    it('should throw BadRequestException when apiKey is empty', async () => {
      await expect(service.validateApiKey('', 1, 2)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should return valid true and update coordinates when matching', async () => {
      const apiKey = 'AUR-VALID-KEY';
      const encrypted = service['encryptApiKey'](apiKey);
      prismaMock.ecosystem.findMany.mockResolvedValue([{ id: 'eco-id', status: EcosystemStatus.ACTIVE, apiKey: encrypted.apiKeyCiphertext, apiKeyIv: encrypted.apiKeyIv, apiKeyAuthTag: encrypted.apiKeyAuthTag }]);
      prismaMock.ecosystem.update.mockResolvedValue({ id: 'eco-id' });

      const result = await service.validateApiKey(apiKey, 1, 2);
      expect(result).toEqual({ valid: true, ecosystemId: 'eco-id' });
    });

    it('should return valid true without updating when ecosystem not ACTIVE', async () => {
      const apiKey = 'AUR-KEY-INACTIVE';
      const encrypted = service['encryptApiKey'](apiKey);
      prismaMock.ecosystem.findMany.mockResolvedValue([{ id: 'eco-id', status: EcosystemStatus.PENDING, apiKey: encrypted.apiKeyCiphertext, apiKeyIv: encrypted.apiKeyIv, apiKeyAuthTag: encrypted.apiKeyAuthTag }]);

      const result = await service.validateApiKey(apiKey, 1, 2);
      expect(result).toEqual({ valid: true, ecosystemId: 'eco-id' });
      expect(prismaMock.ecosystem.update).not.toHaveBeenCalled();
    });

    it('should return valid false when no matching key exists', async () => {
      prismaMock.ecosystem.findMany.mockResolvedValue([]);
      const result = await service.validateApiKey('AUR-NOT-FOUND', 1, 2);
      expect(result).toEqual({ valid: false });
    });

    it('should skip ecosystems with missing encrypted fields', async () => {
      prismaMock.ecosystem.findMany.mockResolvedValue([{ id: 'eco-id', apiKey: null, apiKeyIv: null, apiKeyAuthTag: null }]);
      const result = await service.validateApiKey('AUR-KEY', 1, 2);
      expect(result).toEqual({ valid: false });
    });
  });

  describe('signHash', () => {
    it('should throw BadRequestException when ecosystem not found', async () => {
      prismaMock.ecosystem.findUnique.mockResolvedValue(null);
      await expect(service.signHash('eco-id', 'hash')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should throw BadRequestException when ecosystem not active', async () => {
      prismaMock.ecosystem.findUnique.mockResolvedValue({ id: 'eco-id', status: EcosystemStatus.REVOKED, identity: {} });
      await expect(service.signHash('eco-id', 'hash')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should throw InternalServerErrorException when identity has no keys', async () => {
      prismaMock.ecosystem.findUnique.mockResolvedValue({ id: 'eco-id', status: EcosystemStatus.ACTIVE, identity: { privateKeyCiphertext: null, privateKeyIv: null, privateKeyAuthTag: null, publicKey: null } });
      await expect(service.signHash('eco-id', 'hash')).rejects.toBeInstanceOf(InternalServerErrorException);
    });

    it('should return signature and publicKey for active ecosystem', async () => {
      prismaMock.ecosystem.findUnique.mockResolvedValue({ id: 'eco-id', status: EcosystemStatus.ACTIVE, identity: { privateKeyCiphertext: 'c', privateKeyIv: 'i', privateKeyAuthTag: 't', publicKey: 'pub-key' } });
      cryptoMock.decryptPrivateKey.mockReturnValue('private-key');
      cryptoMock.sign.mockReturnValue('signed-hash');
      const result = await service.signHash('eco-id', 'some-hash');
      expect(result).toEqual({ signature: 'signed-hash', publicKey: 'pub-key' });
    });
  });

  describe('findAll', () => {
    it('should return all non-revoked ecosystems', async () => {
      const mockEcosystems = [{ ...ecosystemSelect, id: 'eco-1', _count: { devices: 2 } }];
      prismaMock.ecosystem.findMany.mockResolvedValue(mockEcosystems);

      const result = await service.findAll();

      expect(prismaMock.ecosystem.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { status: { not: EcosystemStatus.REVOKED } } }));
      expect(result).toEqual(mockEcosystems);
    });
  });

  describe('findOne', () => {
    it('should return ecosystem when found', async () => {
      prismaMock.ecosystem.findFirst.mockResolvedValue({ id: 'eco-1', name: 'test' });

      const result = await service.findOne('eco-1');

      expect(prismaMock.ecosystem.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'eco-1', status: { not: EcosystemStatus.REVOKED } } }));
      expect(result).toEqual({ id: 'eco-1', name: 'test' });
    });

    it('should return null when not found', async () => {
      prismaMock.ecosystem.findFirst.mockResolvedValue(null);
      expect(await service.findOne('eco-1')).toBeNull();
    });
  });

  describe('findOneWithAccessCheck', () => {
    const ecoData = { id: 'eco-1', name: 'test', ownerId: 'owner-1', accesses: [{ userId: 'user-1' }], status: EcosystemStatus.ACTIVE, latitude: 1, longitude: 2, isOnline: true, lastSeen: new Date(), createdAt: new Date(), updatedAt: new Date() };

    it('should return ecosystem for admin without access check', async () => {
      prismaMock.ecosystem.findFirst.mockResolvedValue({ id: 'eco-1', name: 'test' });
      const result = await service.findOneWithAccessCheck('eco-1', 'user-1', Role.ADMIN);
      expect(result).toEqual({ id: 'eco-1', name: 'test' });
    });

    it('should return ecosystem for GLOBAL_ADMIN without access check', async () => {
      prismaMock.ecosystem.findFirst.mockResolvedValue({ id: 'eco-1' });
      const result = await service.findOneWithAccessCheck('eco-1', 'user-1', Role.GLOBAL_ADMIN);
      expect(result).toEqual({ id: 'eco-1' });
    });

    it('should return ecosystem for owner', async () => {
      prismaMock.ecosystem.findFirst.mockResolvedValue(ecoData);
      const result = await service.findOneWithAccessCheck('eco-1', 'owner-1', Role.USER);
      expect(result).toBeDefined();
      expect((result as any).ownerId).toBeUndefined();
      expect((result as any).accesses).toBeUndefined();
    });

    it('should return ecosystem for user with access', async () => {
      prismaMock.ecosystem.findFirst.mockResolvedValue(ecoData);
      const result = await service.findOneWithAccessCheck('eco-1', 'user-1', Role.USER);
      expect(result).toBeDefined();
    });

    it('should return null for user without access', async () => {
      prismaMock.ecosystem.findFirst.mockResolvedValue(ecoData);
      const result = await service.findOneWithAccessCheck('eco-1', 'stranger', Role.USER);
      expect(result).toBeNull();
    });

    it('should return null when ecosystem not found', async () => {
      prismaMock.ecosystem.findFirst.mockResolvedValue(null);
      const result = await service.findOneWithAccessCheck('eco-1', 'user-1', Role.USER);
      expect(result).toBeNull();
    });
  });

  describe('findDevicesForEcosystem', () => {
    it('should return devices for ecosystem', async () => {
      const devices = [{ id: 'dev-1', name: 'sensor' }];
      prismaMock.device.findMany.mockResolvedValue(devices);
      const result = await service.findDevicesForEcosystem('eco-1');
      expect(result).toEqual(devices);
    });
  });

  describe('findDevicesForEcosystemWithAccessCheck', () => {
    it('should return devices for admin without access check', async () => {
      prismaMock.device.findMany.mockResolvedValue([{ id: 'dev-1' }]);
      const result = await service.findDevicesForEcosystemWithAccessCheck('eco-1', 'user-1', Role.ADMIN);
      expect(result).toEqual([{ id: 'dev-1' }]);
    });

    it('should return devices for owner', async () => {
      prismaMock.ecosystem.findFirst.mockResolvedValue({ ownerId: 'user-1', accesses: [] });
      prismaMock.device.findMany.mockResolvedValue([{ id: 'dev-1' }]);
      const result = await service.findDevicesForEcosystemWithAccessCheck('eco-1', 'user-1', Role.USER);
      expect(result).toEqual([{ id: 'dev-1' }]);
    });

    it('should return devices for user with access', async () => {
      prismaMock.ecosystem.findFirst.mockResolvedValue({ ownerId: 'owner-1', accesses: [{ userId: 'user-1' }] });
      prismaMock.device.findMany.mockResolvedValue([{ id: 'dev-1' }]);
      const result = await service.findDevicesForEcosystemWithAccessCheck('eco-1', 'user-1', Role.USER);
      expect(result).toEqual([{ id: 'dev-1' }]);
    });

    it('should return empty for user without access', async () => {
      prismaMock.ecosystem.findFirst.mockResolvedValue({ ownerId: 'owner-1', accesses: [] });
      const result = await service.findDevicesForEcosystemWithAccessCheck('eco-1', 'stranger', Role.USER);
      expect(result).toEqual([]);
    });

    it('should return empty when ecosystem not found', async () => {
      prismaMock.ecosystem.findFirst.mockResolvedValue(null);
      const result = await service.findDevicesForEcosystemWithAccessCheck('eco-1', 'user-1', Role.USER);
      expect(result).toEqual([]);
    });
  });

  describe('update', () => {
    it('should update ecosystem successfully', async () => {
      prismaMock.ecosystem.findUnique.mockResolvedValue({ id: 'eco-1', name: 'old', ownerId: 'user-1', status: EcosystemStatus.ACTIVE });
      prismaMock.ecosystem.update.mockResolvedValue({ id: 'eco-1', name: 'new' });

      const result = await service.update('eco-1', { name: 'new' }, 'user-1');
      expect(result).toEqual({ id: 'eco-1', name: 'new' });
      expect(anchorMock.anchorAction).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when not owner', async () => {
      prismaMock.ecosystem.findUnique.mockResolvedValue({ id: 'eco-1', ownerId: 'other-user', status: EcosystemStatus.ACTIVE });
      await expect(service.update('eco-1', { name: 'new' }, 'user-1')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('should throw NotFoundException when ecosystem revoked', async () => {
      prismaMock.ecosystem.findUnique.mockResolvedValue(null);
      await expect(service.update('eco-1', { name: 'new' }, 'user-1')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should revoke ecosystem successfully', async () => {
      prismaMock.ecosystem.findUnique.mockResolvedValue({ id: 'eco-1', name: 'test', ownerId: 'user-1', status: EcosystemStatus.ACTIVE });
      prismaMock.ecosystem.update.mockResolvedValue({ id: 'eco-1', status: EcosystemStatus.REVOKED });

      const result = await service.remove('eco-1', 'user-1');
      expect(result).toEqual({ id: 'eco-1', status: EcosystemStatus.REVOKED });
      expect(anchorMock.anchorAction).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when not owner', async () => {
      prismaMock.ecosystem.findUnique.mockResolvedValue({ id: 'eco-1', ownerId: 'other', status: EcosystemStatus.ACTIVE });
      await expect(service.remove('eco-1', 'user-1')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('should throw ForbiddenException when actorId is missing', async () => {
      prismaMock.ecosystem.findUnique.mockResolvedValue({ id: 'eco-1', ownerId: 'user-1', status: EcosystemStatus.ACTIVE });
      await expect(service.remove('eco-1', undefined)).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('updateHeartbeat', () => {
    it('should update heartbeat successfully', async () => {
      prismaMock.ecosystem.update.mockResolvedValue({ id: 'eco-1', isOnline: true });
      const result = await service.updateHeartbeat('eco-1');
      expect(result).toEqual({ id: 'eco-1', isOnline: true });
    });

    it('should throw NotFoundException on P2025', async () => {
      const p2025Error = new Error('Not found') as any as Prisma.PrismaClientKnownRequestError;
      Object.setPrototypeOf(p2025Error, Prisma.PrismaClientKnownRequestError.prototype);
      (p2025Error as any).code = 'P2025';
      prismaMock.ecosystem.update.mockRejectedValue(p2025Error);
      await expect(service.updateHeartbeat('eco-1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should throw InternalServerErrorException on other errors', async () => {
      prismaMock.ecosystem.update.mockRejectedValue(new Error('db error'));
      await expect(service.updateHeartbeat('eco-1')).rejects.toBeInstanceOf(InternalServerErrorException);
    });
  });

  describe('findEcosystemsByOwnerId', () => {
    it('should return ecosystem ids for owner', async () => {
      prismaMock.ecosystem.findMany.mockResolvedValue([{ id: 'eco-1' }, { id: 'eco-2' }]);
      const result = await service.findEcosystemsByOwnerId('owner-1');
      expect(result).toEqual({ ecosystemIds: ['eco-1', 'eco-2'] });
    });
  });

  describe('findAllEcosystemsByUserId', () => {
    it('should return owned and delegated ecosystems', async () => {
      prismaMock.ecosystem.findMany.mockResolvedValue([{ id: 'eco-1', name: 'owned', ownerId: 'user-1', status: EcosystemStatus.ACTIVE }]);
      prismaMock.ecosystemAccess.findMany.mockResolvedValue([
        { role: AccessRole.VIEWER, ecosystem: { id: 'eco-2', name: 'delegated', ownerId: 'other', status: EcosystemStatus.ACTIVE } },
      ]);

      const result = await service.findAllEcosystemsByUserId('user-1');
      expect(result).toHaveLength(2);
      expect(result[0].accessType).toBe('OWNER');
      expect(result[1].accessType).toBe('DELEGATED');
    });
  });

  describe('grantAccess', () => {
    const eco = { id: 'eco-1', name: 'eco-name', ownerId: 'actor-1', status: EcosystemStatus.ACTIVE };

    it('should throw NotFoundException when ecosystem not found', async () => {
      prismaMock.ecosystem.findUnique.mockResolvedValue(null);
      await expect(service.grantAccess('eco-1', 'actor-1', 'user@test.com')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should throw ForbiddenException when not owner', async () => {
      prismaMock.ecosystem.findUnique.mockResolvedValue({ ...eco, ownerId: 'other' });
      await expect(service.grantAccess('eco-1', 'actor-1', 'user@test.com')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('should throw BadRequestException when ecosystem not active', async () => {
      prismaMock.ecosystem.findUnique.mockResolvedValue({ ...eco, status: EcosystemStatus.REVOKED });
      await expect(service.grantAccess('eco-1', 'actor-1', 'user@test.com')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should throw NotFoundException when target user not found', async () => {
      prismaMock.ecosystem.findUnique.mockResolvedValue(eco);
      prismaMock.user.findUnique.mockResolvedValue(null);
      await expect(service.grantAccess('eco-1', 'actor-1', 'missing@test.com')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should throw BadRequestException when targeting self', async () => {
      prismaMock.ecosystem.findUnique.mockResolvedValue(eco);
      prismaMock.user.findUnique.mockResolvedValue({ id: 'actor-1', email: 'self@test.com', status: UserStatus.ACTIVE, isActive: true, role: Role.USER });
      await expect(service.grantAccess('eco-1', 'actor-1', 'self@test.com')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should throw BadRequestException when target user not active', async () => {
      prismaMock.ecosystem.findUnique.mockResolvedValue(eco);
      prismaMock.user.findUnique.mockResolvedValue({ id: 'target-1', email: 'target@test.com', status: UserStatus.PENDING, isActive: false, role: Role.USER });
      await expect(service.grantAccess('eco-1', 'actor-1', 'target@test.com')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should throw BadRequestException when target user is auditor', async () => {
      prismaMock.ecosystem.findUnique.mockResolvedValue(eco);
      prismaMock.user.findUnique.mockResolvedValue({ id: 'target-1', email: 'target@test.com', status: UserStatus.ACTIVE, isActive: true, role: Role.AUDITOR });
      await expect(service.grantAccess('eco-1', 'actor-1', 'target@test.com')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should throw BadRequestException when pending notification exists', async () => {
      prismaMock.ecosystem.findUnique.mockResolvedValue(eco);
      prismaMock.user.findUnique
        .mockResolvedValueOnce({ id: 'target-1', email: 'target@test.com', status: UserStatus.ACTIVE, isActive: true, role: Role.USER })
        .mockResolvedValueOnce({ email: 'actor@test.com' });
      prismaMock.notification.findFirst.mockResolvedValue({ id: 'existing-notif' });

      await expect(service.grantAccess('eco-1', 'actor-1', 'target@test.com')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should succeed and create notification and anchor', async () => {
      prismaMock.ecosystem.findUnique.mockResolvedValue(eco);
      prismaMock.user.findUnique
        .mockResolvedValueOnce({ id: 'target-1', email: 'target@test.com', status: UserStatus.ACTIVE, isActive: true, role: Role.USER })
        .mockResolvedValueOnce({ email: 'actor@test.com' });
      prismaMock.notification.findFirst.mockResolvedValue(null);
      notificationsMock.create.mockResolvedValue({ id: 'notif-1' });

      await service.grantAccess('eco-1', 'actor-1', 'target@test.com');

      expect(notificationsMock.create).toHaveBeenCalled();
      expect(anchorMock.anchorAction).toHaveBeenCalled();
    });
  });

  describe('revokeAccess', () => {
    const eco = { id: 'eco-1', name: 'eco', ownerId: 'actor-1' };

    it('should throw NotFoundException when ecosystem not found', async () => {
      prismaMock.ecosystem.findUnique.mockResolvedValue(null);
      await expect(service.revokeAccess('eco-1', 'actor-1', 'target-1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should throw ForbiddenException when not owner', async () => {
      prismaMock.ecosystem.findUnique.mockResolvedValue({ ...eco, ownerId: 'other' });
      await expect(service.revokeAccess('eco-1', 'actor-1', 'target-1')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('should throw BadRequestException when revoking self', async () => {
      prismaMock.ecosystem.findUnique.mockResolvedValue(eco);
      await expect(service.revokeAccess('eco-1', 'actor-1', 'actor-1')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should throw NotFoundException when access not found', async () => {
      prismaMock.ecosystem.findUnique.mockResolvedValue(eco);
      prismaMock.ecosystemAccess.findUnique.mockResolvedValue(null);
      await expect(service.revokeAccess('eco-1', 'actor-1', 'target-1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should revoke access successfully', async () => {
      prismaMock.ecosystem.findUnique.mockResolvedValue(eco);
      prismaMock.ecosystemAccess.findUnique.mockResolvedValue({ id: 'access-1' });
      prismaMock.ecosystemAccess.delete.mockResolvedValue({ id: 'access-1' });

      await service.revokeAccess('eco-1', 'actor-1', 'target-1');
      expect(prismaMock.ecosystemAccess.delete).toHaveBeenCalledWith({ where: { id: 'access-1' } });
      expect(anchorMock.anchorAction).toHaveBeenCalled();
    });
  });

  describe('updateAccessRole', () => {
    const eco = { id: 'eco-1', name: 'eco', ownerId: 'actor-1' };

    it('should throw NotFoundException when ecosystem not found', async () => {
      prismaMock.ecosystem.findUnique.mockResolvedValue(null);
      await expect(service.updateAccessRole('eco-1', 'actor-1', 'target-1', AccessRole.EDITOR)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should throw ForbiddenException when not owner', async () => {
      prismaMock.ecosystem.findUnique.mockResolvedValue({ ...eco, ownerId: 'other' });
      await expect(service.updateAccessRole('eco-1', 'actor-1', 'target-1', AccessRole.EDITOR)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('should throw NotFoundException when access not found', async () => {
      prismaMock.ecosystem.findUnique.mockResolvedValue(eco);
      prismaMock.ecosystemAccess.findUnique.mockResolvedValue(null);
      await expect(service.updateAccessRole('eco-1', 'actor-1', 'target-1', AccessRole.EDITOR)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should update role successfully', async () => {
      prismaMock.ecosystem.findUnique.mockResolvedValue(eco);
      prismaMock.ecosystemAccess.findUnique.mockResolvedValue({ id: 'access-1', role: AccessRole.VIEWER });
      prismaMock.ecosystemAccess.update.mockResolvedValue({ id: 'access-1', role: AccessRole.EDITOR });

      await service.updateAccessRole('eco-1', 'actor-1', 'target-1', AccessRole.EDITOR);

      expect(prismaMock.ecosystemAccess.update).toHaveBeenCalledWith({ where: { id: 'access-1' }, data: { role: AccessRole.EDITOR } });
      expect(anchorMock.anchorAction).toHaveBeenCalled();
    });
  });

  describe('getEcosystemAccesses', () => {
    const eco = { id: 'eco-1', name: 'eco', ownerId: 'actor-1' };

    it('should throw NotFoundException when ecosystem not found', async () => {
      prismaMock.ecosystem.findUnique.mockResolvedValue(null);
      await expect(service.getEcosystemAccesses('eco-1', 'actor-1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should throw ForbiddenException when not owner', async () => {
      prismaMock.ecosystem.findUnique.mockResolvedValue({ ...eco, ownerId: 'other' });
      await expect(service.getEcosystemAccesses('eco-1', 'actor-1')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('should return mapped accesses', async () => {
      prismaMock.ecosystem.findUnique.mockResolvedValue(eco);
      prismaMock.ecosystemAccess.findMany.mockResolvedValue([
        { id: 'acc-1', role: AccessRole.VIEWER, createdAt: new Date(), updatedAt: new Date(), user: { id: 'user-1', email: 'user@test.com', status: UserStatus.ACTIVE, isActive: true } },
      ]);

      const result = await service.getEcosystemAccesses('eco-1', 'actor-1');
      expect(result).toHaveLength(1);
      expect(result[0].userEmail).toBe('user@test.com');
      expect(result[0].role).toBe(AccessRole.VIEWER);
    });
  });

  describe('getUserAccesses', () => {
    it('should return mapped delegated accesses', async () => {
      prismaMock.ecosystemAccess.findMany.mockResolvedValue([
        { role: AccessRole.VIEWER, ecosystem: { id: 'eco-1', name: 'eco', status: EcosystemStatus.ACTIVE, latitude: 1, longitude: 2, isOnline: true, lastSeen: new Date(), ownerId: 'owner-1' } },
      ]);

      const result = await service.getUserAccesses('user-1');
      expect(result).toHaveLength(1);
      expect(result[0].accessType).toBe('DELEGATED');
      expect(result[0].ecosystemName).toBe('eco');
    });
  });

  describe('getEcosystemsWithAccessType', () => {
    it('should return all active ecosystems for admin', async () => {
      prismaMock.ecosystem.findMany.mockResolvedValue([{ id: 'eco-1', name: 'admin-eco', ownerId: 'other' }]);
      const result = await service.getEcosystemsWithAccessType('admin-1', Role.ADMIN);
      expect(result).toHaveLength(1);
      expect(result[0].accessType).toBe('OWNER');
    });

    it('should return all active ecosystems for GLOBAL_ADMIN', async () => {
      prismaMock.ecosystem.findMany.mockResolvedValue([]);
      const result = await service.getEcosystemsWithAccessType('admin-1', Role.GLOBAL_ADMIN);
      expect(result).toEqual([]);
    });

    it('should return all active ecosystems for AUDITOR', async () => {
      prismaMock.ecosystem.findMany.mockResolvedValue([{ id: 'eco-1' }]);
      const result = await service.getEcosystemsWithAccessType('auditor-1', Role.AUDITOR);
      expect(result).toHaveLength(1);
    });

    it('should return owned and delegated for regular user', async () => {
      prismaMock.ecosystem.findMany.mockResolvedValue([{ id: 'eco-1', name: 'my-eco', ownerId: 'user-1' }]);
      prismaMock.ecosystemAccess.findMany.mockResolvedValue([
        { role: AccessRole.EDITOR, ecosystem: { id: 'eco-2', name: 'shared', ownerId: 'other', status: EcosystemStatus.ACTIVE } },
      ]);

      const result = await service.getEcosystemsWithAccessType('user-1', Role.USER);
      expect(result).toHaveLength(2);
      expect(result[0].accessType).toBe('OWNER');
      expect(result[1].accessType).toBe('DELEGATED');
    });

    it('should return only owned when no delegated', async () => {
      prismaMock.ecosystem.findMany.mockResolvedValue([{ id: 'eco-1' }]);
      prismaMock.ecosystemAccess.findMany.mockResolvedValue([]);
      const result = await service.getEcosystemsWithAccessType('user-1', Role.USER);
      expect(result).toHaveLength(1);
    });
  });

  describe('leaveSharedEcosystem', () => {
    const accessWithEco = { id: 'acc-1', ecosystem: { id: 'eco-1', name: 'eco', ownerId: 'other' } };

    it('should throw NotFoundException when access not found', async () => {
      prismaMock.ecosystemAccess.findUnique.mockResolvedValue(null);
      await expect(service.leaveSharedEcosystem('eco-1', 'user-1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should throw BadRequestException when leaving own ecosystem', async () => {
      prismaMock.ecosystemAccess.findUnique.mockResolvedValue({ ...accessWithEco, ecosystem: { ...accessWithEco.ecosystem, ownerId: 'user-1' } });
      await expect(service.leaveSharedEcosystem('eco-1', 'user-1')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should leave ecosystem successfully', async () => {
      prismaMock.ecosystemAccess.findUnique.mockResolvedValue(accessWithEco);
      prismaMock.user.findUnique
        .mockResolvedValueOnce({ email: 'user@test.com' })
        .mockResolvedValueOnce({ email: 'owner@test.com' });
      prismaMock.ecosystemAccess.delete.mockResolvedValue({ id: 'acc-1' });
      notificationsMock.create.mockResolvedValue({ id: 'notif-1' });
      mailMock.sendNewNotificationEmail.mockResolvedValue(undefined);

      await service.leaveSharedEcosystem('eco-1', 'user-1');

      expect(prismaMock.ecosystemAccess.delete).toHaveBeenCalledWith({ where: { id: 'acc-1' } });
      expect(notificationsMock.create).toHaveBeenCalled();
      expect(mailMock.sendNewNotificationEmail).toHaveBeenCalledWith('owner@test.com', expect.any(String));
    });

    it('should not send email when owner has no email', async () => {
      prismaMock.ecosystemAccess.findUnique.mockResolvedValue(accessWithEco);
      prismaMock.user.findUnique
        .mockResolvedValueOnce({ email: 'user@test.com' })
        .mockResolvedValueOnce({ email: null });
      prismaMock.ecosystemAccess.delete.mockResolvedValue({ id: 'acc-1' });

      await service.leaveSharedEcosystem('eco-1', 'user-1');

      expect(mailMock.sendNewNotificationEmail).not.toHaveBeenCalled();
    });
  });
});
