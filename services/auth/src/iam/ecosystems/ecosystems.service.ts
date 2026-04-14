import {
  InternalServerErrorException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EcosystemStatus, Prisma } from '@prisma/client';
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

  async create(createEcosystemDto: CreateEcosystemDto, ownerId: string) {
    try {
      const did = await this.fireflyService.getOrganizationDid();

      return await this.prisma.ecosystem.create({
        data: {
          name: createEcosystemDto.name,
          ownerId,
          did,
          status: EcosystemStatus.ACTIVE,
          latitude: createEcosystemDto.latitude,
          longitude: createEcosystemDto.longitude,
        },
      });
    } catch {
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
