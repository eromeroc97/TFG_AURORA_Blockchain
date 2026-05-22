import {
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AccessRole, EcosystemStatus, Prisma, Role, UserStatus } from '@prisma/client';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { ActionsAnchorService } from '../../blockchain/anchoring/actions-anchor.service';
import { ActionType } from '../../blockchain/anchoring/action-types.enum';
import { CryptoService } from '../../crypto/crypto.service';
import { MailService } from '../../shared/mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationCategory, NotificationType, ReferenceType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEcosystemDto } from './dto/create-ecosystem.dto';
import { UpdateEcosystemDto } from './dto/update-ecosystem.dto';
import { CreateNotificationDto } from '../notifications/dto/create-notification.dto';

/**
 * Servicio de gestión de ecosistemas.
 * Maneja CRUD de ecosistemas y API keys.
 *
 * Propósito de seguridad:
 * - cifrado AES-256-GCM para API keys
 * - Asociación con usuarios y dispositivos
 * - Auditoría en blockchain
 *
 * @Roles ADMIN, USER
 */
@Injectable()
export class EcosystemsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly anchoringService: ActionsAnchorService,
    private readonly cryptoService: CryptoService,
    private readonly mailService: MailService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private readonly ecosystemSelect = {
    id: true,
    name: true,
    ownerId: true,
    status: true,
    latitude: true,
    longitude: true,
    isOnline: true,
    lastSeen: true,
    createdAt: true,
    updatedAt: true,
  } as const;

  private readonly ecosystemDeviceSelect = {
    id: true,
    name: true,
    category: true,
    room: true,
    macAddress: true,
    vendor: true,
    ecosystemId: true,
    createdAt: true,
    updatedAt: true,
  } as const;

  private readonly ecosystemApiKeySelect = {
    id: true,
    status: true,
    apiKey: true,
    apiKeyIv: true,
    apiKeyAuthTag: true,
  } as const;

  private getApiKeyEncryptionKey(): Buffer {
    const rawKey = process.env.API_KEY_ENCRYPTION_KEY;

    if (!rawKey) {
      throw new InternalServerErrorException('API key encryption key is not configured');
    }

    const parsedKey = Buffer.from(rawKey, 'base64');

    if (parsedKey.length !== 32) {
      throw new InternalServerErrorException('API key encryption key must decode to 32 bytes');
    }

    return parsedKey;
  }

  private generateApiKey(): string {
    return `AUR-${randomBytes(32).toString('base64url')}`;
  }

  private encryptApiKey(apiKey: string): {
    apiKeyCiphertext: string;
    apiKeyIv: string;
    apiKeyAuthTag: string;
  } {
    const encryptionKey = this.getApiKeyEncryptionKey();
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', encryptionKey, iv);

    const encrypted = Buffer.concat([cipher.update(apiKey, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
      apiKeyCiphertext: encrypted.toString('base64'),
      apiKeyIv: iv.toString('base64'),
      apiKeyAuthTag: authTag.toString('base64'),
    };
  }

  private decryptApiKey(payload: {
    apiKeyCiphertext: string;
    apiKeyIv: string;
    apiKeyAuthTag: string;
  }): string {
    const encryptionKey = this.getApiKeyEncryptionKey();
    const decipher = createDecipheriv(
      'aes-256-gcm',
      encryptionKey,
      Buffer.from(payload.apiKeyIv, 'base64'),
    );
    decipher.setAuthTag(Buffer.from(payload.apiKeyAuthTag, 'base64'));

    return Buffer.concat([
      decipher.update(Buffer.from(payload.apiKeyCiphertext, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  }

  async create(createEcosystemDto: CreateEcosystemDto, actorId?: string) {
    if (!actorId) {
      throw new ForbiddenException('No se pudo identificar al usuario autenticado');
    }

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: actorId },
        select: {
          id: true,
          role: true,
          status: true,
          isActive: true,
          identity: {
            select: {
              publicKey: true,
            },
          },
        },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (user.role !== Role.USER) {
        throw new ForbiddenException('Solo los investigadores con rol USER pueden registrar ecosistemas');
      }

      if (!user.isActive || user.status !== UserStatus.ACTIVE) {
        throw new ForbiddenException('Solo usuarios activos pueden registrar ecosistemas');
      }

      if (!user.identity?.publicKey) {
        throw new ForbiddenException('El usuario debe tener identidad criptográfica para registrar ecosistemas');
      }

      const keyPair = this.cryptoService.generateKeyPair();
      const encrypted = this.cryptoService.encryptPrivateKey(keyPair.privateKey);

      const identity = await this.prisma.identity.create({
        data: {
          type: 'ECOSYSTEM',
          publicKey: keyPair.publicKey,
          privateKeyCiphertext: encrypted.ciphertext,
          privateKeyIv: encrypted.iv,
          privateKeyAuthTag: encrypted.authTag,
        },
      });

      const apiKey = this.generateApiKey();
      const encryptedApiKey = this.encryptApiKey(apiKey);

      const createdEcosystem = await this.prisma.ecosystem.create({
        data: {
          name: createEcosystemDto.name,
          ownerId: user.id,
          identityId: identity.id,
          status: EcosystemStatus.ACTIVE,
          latitude: createEcosystemDto.latitude,
          longitude: createEcosystemDto.longitude,
          apiKey: encryptedApiKey.apiKeyCiphertext,
          apiKeyIv: encryptedApiKey.apiKeyIv,
          apiKeyAuthTag: encryptedApiKey.apiKeyAuthTag,
        },
        select: this.ecosystemSelect,
      });

      await this.anchoringService.anchorAction({
        actionType: ActionType.ECOSYSTEM_CREATE,
        actorId,
        targetId: createdEcosystem.id,
        readableDescription: `Ecosystem "${createdEcosystem.name}" created`,
      });

      return {
        ...createdEcosystem,
        apiKey,
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException || error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException('Failed to create ecosystem');
    }
  }

  async getApiKey(ecosystemId: string, actorId?: string) {
    if (!actorId) {
      throw new ForbiddenException('No se pudo identificar al usuario autenticado');
    }

    const ecosystem = await this.prisma.ecosystem.findUnique({
      where: { id: ecosystemId },
      select: {
        id: true,
        ownerId: true,
        apiKey: true,
        apiKeyIv: true,
        apiKeyAuthTag: true,
      },
    });

    if (!ecosystem) {
      throw new NotFoundException('Ecosystem not found');
    }

    if (ecosystem.ownerId !== actorId) {
      throw new ForbiddenException('No tienes permisos para recuperar la API key de este ecosistema');
    }

    if (!ecosystem.apiKey || !ecosystem.apiKeyIv || !ecosystem.apiKeyAuthTag) {
      throw new NotFoundException('Ecosystem API key not found');
    }

    const apiKey = this.decryptApiKey({
      apiKeyCiphertext: ecosystem.apiKey,
      apiKeyIv: ecosystem.apiKeyIv,
      apiKeyAuthTag: ecosystem.apiKeyAuthTag,
    });

    return {
      ecosystemId: ecosystem.id,
      apiKey,
    };
  }

  async validateApiKey(apiKey: string, latitude: number, longitude: number) {
    const normalizedApiKey = apiKey.trim();

    if (!normalizedApiKey) {
      throw new BadRequestException('API key is required');
    }

    const ecosystems = await this.prisma.ecosystem.findMany({
      orderBy: { createdAt: 'desc' },
      select: this.ecosystemApiKeySelect,
    });

    for (const ecosystem of ecosystems) {
      if (!ecosystem.apiKey || !ecosystem.apiKeyIv || !ecosystem.apiKeyAuthTag) {
        continue;
      }

      try {
        const decodedApiKey = this.decryptApiKey({
          apiKeyCiphertext: ecosystem.apiKey,
          apiKeyIv: ecosystem.apiKeyIv,
          apiKeyAuthTag: ecosystem.apiKeyAuthTag,
        });

        if (decodedApiKey !== normalizedApiKey) {
          continue;
        }

        if (ecosystem.status === EcosystemStatus.ACTIVE) {
          await this.prisma.ecosystem.update({
            where: { id: ecosystem.id },
            data: {
              latitude,
              longitude,
            },
            select: { id: true },
          });
        }

        return {
          valid: true,
          ecosystemId: ecosystem.id,
        };
      } catch (error) {
        if (error instanceof BadRequestException) {
          throw error;
        }

        continue;
      }
    }

    return {
      valid: false,
    };
  }

  async signHash(ecosystemId: string, hash: string): Promise<{ signature: string; publicKey: string }> {
    const ecosystem = await this.prisma.ecosystem.findUnique({
      where: { id: ecosystemId },
      include: { identity: true },
    });

    if (!ecosystem || !ecosystem.identity) {
      throw new BadRequestException('Ecosistema no encontrado');
    }

    if (ecosystem.status !== EcosystemStatus.ACTIVE) {
      throw new BadRequestException('El ecosistema no está activo');
    }

    const { privateKeyCiphertext, privateKeyIv, privateKeyAuthTag, publicKey } = ecosystem.identity;

    if (!privateKeyCiphertext || !privateKeyIv || !privateKeyAuthTag || !publicKey) {
      throw new InternalServerErrorException('El ecosistema no tiene claves criptográficas');
    }

    const privateKeyPem = this.cryptoService.decryptPrivateKey({
      ciphertext: privateKeyCiphertext,
      iv: privateKeyIv,
      authTag: privateKeyAuthTag,
    });

    const signature = this.cryptoService.sign(hash, privateKeyPem);

    return {
      signature,
      publicKey,
    };
  }

  findAll() {
    return this.prisma.ecosystem.findMany({
      where: {
        status: {
          not: EcosystemStatus.REVOKED,
        },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        ...this.ecosystemSelect,
        _count: {
          select: {
            devices: true,
          },
        },
      },
    });
  }

  findOne(id: string) {
    return this.prisma.ecosystem.findFirst({
      where: {
        id,
        status: {
          not: EcosystemStatus.REVOKED,
        },
      },
      select: this.ecosystemSelect,
    });
  }

  async findOneWithAccessCheck(id: string, userId: string, userRole?: Role) {
    const isAdmin = userRole === Role.ADMIN || userRole === Role.GLOBAL_ADMIN;
    
    if (isAdmin) {
      return this.findOne(id);
    }

    const ecosystem = await this.prisma.ecosystem.findFirst({
      where: {
        id,
        status: {
          not: EcosystemStatus.REVOKED,
        },
      },
      select: {
        ...this.ecosystemSelect,
        ownerId: true,
        accesses: {
          select: { userId: true },
        },
      },
    });

    if (!ecosystem) {
      return null;
    }

    const isOwner = ecosystem.ownerId === userId;
    const hasAccess = ecosystem.accesses.some((a) => a.userId === userId);

    if (!isOwner && !hasAccess) {
      return null;
    }

    const { ownerId: _ownerId, accesses: _accesses, ...ecosystemData } = ecosystem as typeof ecosystem & { ownerId: string; accesses: { userId: string }[] };
    return ecosystemData;
  }

  async findDevicesForEcosystemWithAccessCheck(ecosystemId: string, userId: string, userRole?: Role) {
    const isAdmin = userRole === Role.ADMIN || userRole === Role.GLOBAL_ADMIN;
    
    if (isAdmin) {
      return this.findDevicesForEcosystem(ecosystemId);
    }

    const ecosystem = await this.prisma.ecosystem.findFirst({
      where: {
        id: ecosystemId,
        status: {
          not: EcosystemStatus.REVOKED,
        },
      },
      select: {
        ownerId: true,
        accesses: {
          select: { userId: true },
        },
      },
    });

    if (!ecosystem) {
      return [];
    }

    const isOwner = ecosystem.ownerId === userId;
    const hasAccess = ecosystem.accesses.some((a) => a.userId === userId);

    if (!isOwner && !hasAccess) {
      return [];
    }

    return this.prisma.device.findMany({
      where: {
        ecosystemId,
        ecosystem: {
          status: {
            not: EcosystemStatus.REVOKED,
          },
        },
      },
      select: this.ecosystemDeviceSelect,
    });
  }

  findDevicesForEcosystem(ecosystemId: string) {
    return this.prisma.device.findMany({
      where: {
        ecosystemId,
        ecosystem: {
          status: {
            not: EcosystemStatus.REVOKED,
          },
        },
      },
      select: this.ecosystemDeviceSelect,
    });
  }

  private async getActiveEcosystem(id: string) {
    const ecosystem = await this.prisma.ecosystem.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        ownerId: true,
        status: true,
      },
    });

    if (!ecosystem || ecosystem.status === EcosystemStatus.REVOKED) {
      throw new NotFoundException('Ecosystem not found');
    }

    return ecosystem;
  }

  async update(id: string, updateEcosystemDto: UpdateEcosystemDto, actorId?: string) {
    const ecosystem = await this.getActiveEcosystem(id);

    if (!actorId || ecosystem.ownerId !== actorId) {
      throw new ForbiddenException('No tienes permisos para modificar este ecosistema');
    }

    const updated = await this.prisma.ecosystem.update({
      where: { id },
      data: updateEcosystemDto,
      select: this.ecosystemSelect,
    });

    await this.anchoringService.anchorAction({
        actionType: ActionType.ECOSYSTEM_UPDATE,
      actorId: actorId!,
      targetId: id,
      readableDescription: `Ecosystem "${ecosystem.name}" updated`,
    });

    return updated;
  }

  async remove(id: string, actorId?: string) {
    const ecosystem = await this.getActiveEcosystem(id);

    if (!actorId || ecosystem.ownerId !== actorId) {
      throw new ForbiddenException('No tienes permisos para dar de baja este ecosistema');
    }

    const removed = await this.prisma.ecosystem.update({
      where: { id },
      data: {
        status: EcosystemStatus.REVOKED,
        name: `REVOKED_${id}`,
        latitude: null,
        longitude: null,
        apiKey: null,
        apiKeyIv: null,
        apiKeyAuthTag: null,
        isOnline: false,
        lastSeen: null,
      },
      select: this.ecosystemSelect,
    });

    await this.anchoringService.anchorAction({
        actionType: ActionType.ECOSYSTEM_REVOKE,
      actorId: actorId!,
      targetId: id,
      readableDescription: `Ecosystem "${ecosystem.name}" revoked`,
    });

    return removed;
  }

  async updateHeartbeat(id: string) {
    try {
      return await this.prisma.ecosystem.update({
        where: { id },
        data: {
          isOnline: true,
          lastSeen: new Date(),
        },
        select: this.ecosystemSelect,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Ecosystem not found');
      }

      throw new InternalServerErrorException('Failed to update heartbeat');
    }
  }

  async findEcosystemsByOwnerId(ownerId: string): Promise<{ ecosystemIds: string[] }> {
    const ecosystems = await this.prisma.ecosystem.findMany({
      where: { ownerId },
      select: { id: true },
    });
    return { ecosystemIds: ecosystems.map(e => e.id) };
  }

  async findAllEcosystemsByUserId(userId: string) {
    const ownedEcosystems = await this.prisma.ecosystem.findMany({
      where: { ownerId: userId, status: EcosystemStatus.ACTIVE },
      select: {
        id: true,
        name: true,
        status: true,
        latitude: true,
        longitude: true,
        isOnline: true,
        lastSeen: true,
        createdAt: true,
        updatedAt: true,
        ownerId: true,
      },
    });

    const delegatedEcosystems = await this.prisma.ecosystemAccess.findMany({
      where: { userId },
      include: {
        ecosystem: {
          select: {
            id: true,
            name: true,
            status: true,
            latitude: true,
            longitude: true,
            isOnline: true,
            lastSeen: true,
            createdAt: true,
            updatedAt: true,
            ownerId: true,
          },
        },
      },
    });

    const ownerResult = ownedEcosystems.map((eco) => ({
      ...eco,
      accessType: 'OWNER' as const,
    }));

    const delegatedResult = delegatedEcosystems
      .filter((access) => access.ecosystem.status === EcosystemStatus.ACTIVE)
      .map((access) => ({
        id: access.ecosystem.id,
        name: access.ecosystem.name,
        status: access.ecosystem.status,
        latitude: access.ecosystem.latitude,
        longitude: access.ecosystem.longitude,
        isOnline: access.ecosystem.isOnline,
        lastSeen: access.ecosystem.lastSeen,
        createdAt: access.ecosystem.createdAt,
        updatedAt: access.ecosystem.updatedAt,
        ownerId: access.ecosystem.ownerId,
        accessType: 'DELEGATED' as const,
        accessRole: access.role,
      }));

    return [...ownerResult, ...delegatedResult];
  }

  async grantAccess(ecosystemId: string, actorId: string, email: string, role?: AccessRole): Promise<void> {
    const ecosystem = await this.prisma.ecosystem.findUnique({
      where: { id: ecosystemId },
    });

    if (!ecosystem) {
      throw new NotFoundException('Ecosistema no encontrado');
    }

    if (ecosystem.ownerId !== actorId) {
      throw new ForbiddenException('Solo el propietario puede delegar accesos');
    }

    if (ecosystem.status !== EcosystemStatus.ACTIVE) {
      throw new BadRequestException('No se puede delegar acceso a un ecosistema inactivo');
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!targetUser) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (targetUser.id === actorId) {
      throw new BadRequestException('No puedes delegarte acceso a ti mismo');
    }

    if (targetUser.status !== UserStatus.ACTIVE || !targetUser.isActive) {
      throw new BadRequestException('El usuario debe estar activo para recibir accesos');
    }

    if (targetUser.role === Role.AUDITOR) {
      throw new BadRequestException('No puedes compartir ecosistemas con auditores');
    }

    const owner = await this.prisma.user.findUnique({
      where: { id: actorId },
      select: { email: true },
    });

    const existingPendingNotification = await this.prisma.notification.findFirst({
      where: {
        userId: targetUser.id,
        referenceId: ecosystemId,
        type: NotificationType.ECOSYSTEM_DELEGATION_REQUEST,
        status: { in: ['PENDING', 'ACCEPTED', 'REJECTED'] },
      },
    });

    if (existingPendingNotification) {
      throw new BadRequestException('Ya existe una petición pendiente para este ecosistema');
    }

    await this.notificationsService.create({
      category: NotificationCategory.ACTION_EXPECTED,
      type: NotificationType.ECOSYSTEM_DELEGATION_REQUEST,
      targetType: 'INDIVIDUAL',
      actorType: 'USER',
      actorId: actorId,
      userId: targetUser.id,
      referenceId: ecosystemId,
      referenceType: ReferenceType.ECOSYSTEM,
      title: 'Petición de acceso a ecosistema',
      message: `${owner?.email ?? 'Un usuario'} te ha invitaro a gestionar el ecosistema "${ecosystem.name}" como ${role ?? AccessRole.VIEWER}`,
      metadata: {
        ecosystemId,
        targetUserId: targetUser.id,
        role: role ?? AccessRole.VIEWER,
      },
    });

    await this.anchoringService.anchorAction({
        actionType: ActionType.ECOSYSTEM_ACCESS_GRANT,
      actorId,
      targetId: ecosystemId,
      readableDescription: `Ecosystem access granted: user ${targetUser.email} as ${role ?? AccessRole.VIEWER} on "${ecosystem.name}"`,
      metadata: {
        ecosystemId,
        grantedUserId: targetUser.id,
      },
    });
  }

  async revokeAccess(ecosystemId: string, actorId: string, targetUserId: string): Promise<void> {
    const ecosystem = await this.prisma.ecosystem.findUnique({
      where: { id: ecosystemId },
    });

    if (!ecosystem) {
      throw new NotFoundException('Ecosistema no encontrado');
    }

    if (ecosystem.ownerId !== actorId) {
      throw new ForbiddenException('Solo el propietario puede revocar accesos');
    }

    if (targetUserId === actorId) {
      throw new BadRequestException('No puedes revoke tu propio acceso de propietario');
    }

    const access = await this.prisma.ecosystemAccess.findUnique({
      where: {
        ecosystemId_userId: {
          ecosystemId,
          userId: targetUserId,
        },
      },
    });

    if (!access) {
      throw new NotFoundException('El usuario no tiene acceso a este ecosistema');
    }

    await this.prisma.ecosystemAccess.delete({
      where: { id: access.id },
    });

    await this.anchoringService.anchorAction({
        actionType: ActionType.ECOSYSTEM_ACCESS_REVOKE,
      actorId,
      targetId: ecosystemId,
      readableDescription: `Ecosystem access revoked: user ${targetUserId} from ecosystem ${ecosystemId}`,
      metadata: {
        ecosystemId,
        revokedUserId: targetUserId,
      },
    });
  }

  async updateAccessRole(ecosystemId: string, actorId: string, targetUserId: string, newRole: AccessRole): Promise<void> {
    const ecosystem = await this.prisma.ecosystem.findUnique({
      where: { id: ecosystemId },
    });

    if (!ecosystem) {
      throw new NotFoundException('Ecosistema no encontrado');
    }

    if (ecosystem.ownerId !== actorId) {
      throw new ForbiddenException('Solo el propietario puede modificar roles de acceso');
    }

    const access = await this.prisma.ecosystemAccess.findUnique({
      where: {
        ecosystemId_userId: {
          ecosystemId,
          userId: targetUserId,
        },
      },
    });

    if (!access) {
      throw new NotFoundException('El usuario no tiene acceso a este ecosistema');
    }

    const oldRole = access.role;

    await this.prisma.ecosystemAccess.update({
      where: { id: access.id },
      data: { role: newRole },
    });

    await this.anchoringService.anchorAction({
        actionType: ActionType.ECOSYSTEM_ACCESS_UPDATE,
      actorId,
      targetId: ecosystemId,
      readableDescription: `Ecosystem access role updated: user ${targetUserId} from ${oldRole} to ${newRole}`,
      metadata: {
        ecosystemId,
        updatedUserId: targetUserId,
        oldRole,
        newRole,
      },
    });
  }

  async getEcosystemAccesses(ecosystemId: string, actorId: string) {
    const ecosystem = await this.prisma.ecosystem.findUnique({
      where: { id: ecosystemId },
    });

    if (!ecosystem) {
      throw new NotFoundException('Ecosistema no encontrado');
    }

    if (ecosystem.ownerId !== actorId) {
      throw new ForbiddenException('Solo el propietario puede ver los accesos');
    }

    const accesses = await this.prisma.ecosystemAccess.findMany({
      where: { ecosystemId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            status: true,
            isActive: true,
          },
        },
      },
    });

    return accesses.map((access) => ({
      id: access.id,
      userId: access.user.id,
      userEmail: access.user.email,
      userStatus: access.user.status,
      userIsActive: access.user.isActive,
      role: access.role,
      createdAt: access.createdAt,
      updatedAt: access.updatedAt,
    }));
  }

  async getUserAccesses(userId: string) {
    const accesses = await this.prisma.ecosystemAccess.findMany({
      where: { userId },
      include: {
        ecosystem: {
          select: {
            id: true,
            name: true,
            status: true,
            latitude: true,
            longitude: true,
            isOnline: true,
            lastSeen: true,
            ownerId: true,
          },
        },
      },
    });

    return accesses.map((access) => ({
      ecosystemId: access.ecosystem.id,
      ecosystemName: access.ecosystem.name,
      ecosystemStatus: access.ecosystem.status,
      ecosystemLatitude: access.ecosystem.latitude,
      ecosystemLongitude: access.ecosystem.longitude,
      ecosystemIsOnline: access.ecosystem.isOnline,
      ecosystemLastSeen: access.ecosystem.lastSeen,
      ecosystemOwnerId: access.ecosystem.ownerId,
      role: access.role,
      accessType: 'DELEGATED' as const,
    }));
  }

  async getEcosystemsWithAccessType(userId: string, userRole?: Role) {
    const isAdminOrAuditor = userRole === Role.ADMIN || userRole === Role.GLOBAL_ADMIN || userRole === Role.AUDITOR;

    if (isAdminOrAuditor) {
      const allEcosystems = await this.prisma.ecosystem.findMany({
        where: { status: EcosystemStatus.ACTIVE },
        select: {
          id: true,
          name: true,
          status: true,
          latitude: true,
          longitude: true,
          isOnline: true,
          lastSeen: true,
          createdAt: true,
          updatedAt: true,
          ownerId: true,
        },
      });
      return allEcosystems.map((eco) => ({
        ...eco,
        accessType: 'OWNER' as const,
      }));
    }

    const ownedEcosystems = await this.prisma.ecosystem.findMany({
      where: { ownerId: userId, status: EcosystemStatus.ACTIVE },
      select: {
        id: true,
        name: true,
        status: true,
        latitude: true,
        longitude: true,
        isOnline: true,
        lastSeen: true,
        createdAt: true,
        updatedAt: true,
        ownerId: true,
      },
    });

    const delegatedEcosystems = await this.prisma.ecosystemAccess.findMany({
      where: { userId },
      include: {
        ecosystem: {
          select: {
            id: true,
            name: true,
            status: true,
            latitude: true,
            longitude: true,
            isOnline: true,
            lastSeen: true,
            createdAt: true,
            updatedAt: true,
            ownerId: true,
          },
        },
      },
    });

    const ownerResult = ownedEcosystems.map((eco) => ({
      ...eco,
      accessType: 'OWNER' as const,
    }));

    const delegatedResult = delegatedEcosystems
      .filter((access) => access.ecosystem.status === EcosystemStatus.ACTIVE)
      .map((access) => ({
        id: access.ecosystem.id,
        name: access.ecosystem.name,
        status: access.ecosystem.status,
        latitude: access.ecosystem.latitude,
        longitude: access.ecosystem.longitude,
        isOnline: access.ecosystem.isOnline,
        lastSeen: access.ecosystem.lastSeen,
        createdAt: access.ecosystem.createdAt,
        updatedAt: access.ecosystem.updatedAt,
        ownerId: access.ecosystem.ownerId,
        accessType: 'DELEGATED' as const,
        accessRole: access.role,
      }));

    return [...ownerResult, ...delegatedResult];
  }

  async leaveSharedEcosystem(ecosystemId: string, userId: string): Promise<void> {
    const access = await this.prisma.ecosystemAccess.findUnique({
      where: {
        ecosystemId_userId: {
          ecosystemId,
          userId,
        },
      },
      include: {
        ecosystem: true,
      },
    });

    if (!access) {
      throw new NotFoundException('No tienes acceso a este ecosistema');
    }

    if (access.ecosystem.ownerId === userId) {
      throw new BadRequestException('No puedes abandonar tu propio ecosistema');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    const owner = await this.prisma.user.findUnique({
      where: { id: access.ecosystem.ownerId },
      select: { email: true },
    });

    await this.prisma.ecosystemAccess.delete({
      where: { id: access.id },
    });

    await this.anchoringService.anchorAction({
        actionType: ActionType.ECOSYSTEM_LEAVE,
      actorId: userId,
      targetId: ecosystemId,
      readableDescription: `User left ecosystem: "${access.ecosystem.name}"`,
      metadata: { ecosystemId },
    });

    await this.notificationsService.create({
      category: NotificationCategory.READ_ONLY,
      type: NotificationType.ECOSYSTEM_DELEGATION_RESPONSE,
      targetType: 'INDIVIDUAL',
      actorType: 'USER',
      actorId: userId,
      userId: access.ecosystem.ownerId,
      referenceId: ecosystemId,
      referenceType: ReferenceType.ECOSYSTEM,
      title: 'Usuario ha dejado de ver el ecosistema',
      message: `${user?.email ?? 'Un usuario'} ha decidido dejar de ver el ecosistema "${access.ecosystem.name}"`,
      metadata: {
        ecosystemId,
        ecosystemName: access.ecosystem.name,
        responderId: userId,
        responderEmail: user?.email,
        result: 'DELEGATE_LEFT',
      },
    } as CreateNotificationDto);

    if (owner?.email) {
      await this.mailService.sendNewNotificationEmail(
        owner.email,
        'Un usuario ha dejado de ver tu ecosistema',
      );
    }
  }
}
