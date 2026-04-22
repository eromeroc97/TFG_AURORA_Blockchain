import {
  BadRequestException,
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
    macAddress: true,
    vendor: true,
    status: true,
    did: true,
    ecosystemId: true,
    createdAt: true,
    updatedAt: true,
  } as const;

  private normalizeMacAddress(rawMacAddress: string | null | undefined): string | null {
    if (!rawMacAddress?.trim()) {
      return null;
    }

    const cleaned = rawMacAddress.trim().replace(/[^a-fA-F0-9]/g, '').toUpperCase();
    if (!/^[A-F0-9]{12}$/.test(cleaned)) {
      throw new BadRequestException(`Invalid MAC address format: ${rawMacAddress}`);
    }

    return cleaned.match(/.{2}/g)!.join(':');
  }

  private normalizeMacAddressRequired(rawMacAddress: string): string {
    const normalized = this.normalizeMacAddress(rawMacAddress);
    if (!normalized) {
      throw new BadRequestException(`Invalid MAC address format: ${rawMacAddress}`);
    }
    return normalized;
  }

  private isNotFoundError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025';
  }

  create(createDeviceDto: CreateDeviceDto) {
    return this.prisma.device.create({
      data: {
        name: createDeviceDto.name,
        fingerprint: createDeviceDto.fingerprint,
        ecosystemId: createDeviceDto.ecosystemId,
        macAddress: this.normalizeMacAddress(createDeviceDto.macAddress),
        vendor: createDeviceDto.vendor ?? null,
        status: createDeviceDto.status ?? DeviceStatus.PENDING,
        did: createDeviceDto.did ?? null,
      },
      select: this.deviceSelect,
    });
  }

  async existsByMacAddress(ecosystemId: string, macAddress: string): Promise<boolean> {
    const normalizedMac = this.normalizeMacAddressRequired(macAddress);
    const device = await this.prisma.device.findUnique({
      where: {
        ecosystemId_macAddress: {
          ecosystemId,
          macAddress: normalizedMac,
        },
      },
      select: {
        id: true,
      },
    });

    return device !== null;
  }

  async registerFromDiscovery(
    ecosystemId: string,
    macAddress: string,
    vendor?: string,
    preferredName?: string,
  ) {
    const normalizedMac = this.normalizeMacAddressRequired(macAddress);
    const existingDevice = await this.prisma.device.findUnique({
      where: {
        ecosystemId_macAddress: {
          ecosystemId,
          macAddress: normalizedMac,
        },
      },
      select: {
        id: true,
      },
    });

    if (existingDevice) {
      return existingDevice;
    }

    const name = preferredName?.trim() || normalizedMac;

    return this.prisma.device.create({
      data: {
        ecosystemId,
        name,
        fingerprint: normalizedMac,
        macAddress: normalizedMac,
        vendor: vendor ?? null,
        status: DeviceStatus.PENDING,
        did: null,
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
    const normalizedMacAddress = updateDeviceDto.macAddress
      ? this.normalizeMacAddress(updateDeviceDto.macAddress)
      : undefined;

    try {
      return await this.prisma.device.update({
        where: { id },
        data: {
          ...updateDeviceDto,
          ...(normalizedMacAddress && { macAddress: normalizedMacAddress }),
        },
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