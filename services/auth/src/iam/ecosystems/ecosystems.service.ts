import {
  ForbiddenException,
  InternalServerErrorException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EcosystemStatus, Prisma, Role } from '@prisma/client';
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

  async create(createEcosystemDto: CreateEcosystemDto) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: createEcosystemDto.ownerId },
        select: {
          id: true,
          role: true,
          did: true,
        },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (user.role !== Role.USER) {
        throw new ForbiddenException('Solo los investigadores con rol USER pueden registrar ecosistemas');
      }

      if (!user.did?.trim()) {
        throw new ForbiddenException('El usuario debe estar validado en la blockchain (tener un DID) antes de registrar ecosistemas');
      }

      const ecosystemDid = await this.fireflyService.createChildIdentity({
        name: createEcosystemDto.name,
        parentDid: user.did,
      });

      return await this.prisma.ecosystem.create({
        data: {
          name: createEcosystemDto.name,
          ownerId: createEcosystemDto.ownerId,
          did: ecosystemDid,
          status: EcosystemStatus.ACTIVE,
          latitude: createEcosystemDto.latitude,
          longitude: createEcosystemDto.longitude,
        },
      });
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }

      throw new InternalServerErrorException('Failed to create ecosystem');
    }
  }

  findAll() {
    return this.prisma.ecosystem.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: string) {
    return this.prisma.ecosystem.findUnique({ where: { id } });
  }

  update(id: string, updateEcosystemDto: UpdateEcosystemDto) {
    return this.prisma.ecosystem.update({
      where: { id },
      data: updateEcosystemDto,
    });
  }

  remove(id: string) {
    return this.prisma.ecosystem.delete({ where: { id } });
  }

  async updateHeartbeat(id: string) {
    try {
      return await this.prisma.ecosystem.update({
        where: { id },
        data: {
          isOnline: true,
          lastSeen: new Date(),
        },
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
