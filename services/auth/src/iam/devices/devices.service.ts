import {
  InternalServerErrorException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DeviceStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';

@Injectable()
export class DevicesService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly deviceSelect = {
    id: true,
    name: true,
    fingerprint: true,
    status: true,
    did: true,
    ecosystemId: true,
    createdAt: true,
    updatedAt: true,
  } as const;

  private isNotFoundError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025';
  }

  create(createDeviceDto: CreateDeviceDto) {
    return this.prisma.device.create({
      data: {
        name: createDeviceDto.name,
        fingerprint: createDeviceDto.fingerprint,
        ecosystemId: createDeviceDto.ecosystemId,
        status: createDeviceDto.status ?? DeviceStatus.PENDING,
        did: createDeviceDto.did ?? null,
      },
      select: this.deviceSelect,
    });
  }

  findAll() {
    return this.prisma.device.findMany({
      orderBy: { createdAt: 'desc' },
      select: this.deviceSelect,
    });
  }

  async findOne(id: string) {
    const device = await this.prisma.device.findUnique({
      where: { id },
      select: this.deviceSelect,
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    return device;
  }

  async update(id: string, updateDeviceDto: UpdateDeviceDto) {
    try {
      return await this.prisma.device.update({
        where: { id },
        data: updateDeviceDto,
        select: this.deviceSelect,
      });
    } catch (error) {
      if (this.isNotFoundError(error)) {
        throw new NotFoundException('Device not found');
      }

      throw new InternalServerErrorException('Failed to update device');
    }
  }

  async remove(id: string) {
    try {
      return await this.prisma.device.delete({
        where: { id },
        select: this.deviceSelect,
      });
    } catch (error) {
      if (this.isNotFoundError(error)) {
        throw new NotFoundException('Device not found');
      }

      throw new InternalServerErrorException('Failed to remove device');
    }
  }
}