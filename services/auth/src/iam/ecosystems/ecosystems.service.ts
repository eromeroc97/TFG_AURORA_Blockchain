import {
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EcosystemStatus, Prisma, Role, UserStatus } from '@prisma/client';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { FireflyService } from '../../blockchain/firefly.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEcosystemDto } from './dto/create-ecosystem.dto';
import { UpdateEcosystemDto } from './dto/update-ecosystem.dto';

@Injectable()
export class EcosystemsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fireflyService: FireflyService,
  ) {}

  private readonly ecosystemSelect = {
    id: true,
    name: true,
    ownerId: true,
    did: true,
    certificateFingerprint: true,
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
    macAddress: true,
    vendor: true,
    ecosystemId: true,
    createdAt: true,
    updatedAt: true,
  } as const;

  private readonly ecosystemApiKeySelect = {
    id: true,
    did: true,
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
          did: true,
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

      if (!user.did?.trim()) {
        throw new ForbiddenException('El usuario debe estar validado en la blockchain (tener un DID) antes de registrar ecosistemas');
      }

      const ecosystemDid = await this.fireflyService.createChildIdentity({
        name: createEcosystemDto.name,
        parentDid: user.did,
      });

      const apiKey = this.generateApiKey();
      const encryptedApiKey = this.encryptApiKey(apiKey);

      const createdEcosystem = await this.prisma.ecosystem.create({
        data: {
          name: createEcosystemDto.name,
          ownerId: user.id,
          did: ecosystemDid,
          status: EcosystemStatus.ACTIVE,
          latitude: createEcosystemDto.latitude,
          longitude: createEcosystemDto.longitude,
          apiKey: encryptedApiKey.apiKeyCiphertext,
          apiKeyIv: encryptedApiKey.apiKeyIv,
          apiKeyAuthTag: encryptedApiKey.apiKeyAuthTag,
        },
        select: this.ecosystemSelect,
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
          did: ecosystem.did,
          status: ecosystem.status,
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

  findAll() {
    return this.prisma.ecosystem.findMany({
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
    return this.prisma.ecosystem.findUnique({ where: { id }, select: this.ecosystemSelect });
  }

  findDevicesForEcosystem(ecosystemId: string) {
    return this.prisma.device.findMany({
      where: { ecosystemId },
      select: this.ecosystemDeviceSelect,
    });
  }

  update(id: string, updateEcosystemDto: UpdateEcosystemDto) {
    return this.prisma.ecosystem.update({
      where: { id },
      data: updateEcosystemDto,
      select: this.ecosystemSelect,
    });
  }

  remove(id: string) {
    return this.prisma.ecosystem.delete({ where: { id }, select: this.ecosystemSelect });
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
}
