import {
  BadRequestException,
  InternalServerErrorException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';

@Injectable()
export class DevicesService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly deviceSelect = {
    id: true,
    name: true,
    macAddress: true,
    vendor: true,
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
        ecosystemId: createDeviceDto.ecosystemId,
        macAddress: this.normalizeMacAddress(createDeviceDto.macAddress),
        vendor: createDeviceDto.vendor ?? null,
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
        vendor: true,
      },
    });

    const normalizedVendor = vendor?.trim();

    if (existingDevice) {
      const shouldUpdateVendor =
        typeof normalizedVendor === 'string' && normalizedVendor.length > 0 && normalizedVendor !== existingDevice.vendor;

      if (shouldUpdateVendor) {
        return this.prisma.device.update({
          where: { id: existingDevice.id },
          data: { vendor: normalizedVendor },
          select: this.deviceSelect,
        });
      }

      return existingDevice;
    }

    const name = preferredName?.trim() || 'Nuevo dispositivo';

    return this.prisma.device.create({
      data: {
        ecosystemId,
        name,
        macAddress: normalizedMac,
        vendor: vendor ?? null,
      },
      select: this.deviceSelect,
    });
  }

  async updateVendorIfMissing(ecosystemId: string, macAddress: string, vendor: string) {
    const normalizedMac = this.normalizeMacAddressRequired(macAddress);
    const normalizedVendor = vendor.trim();

    if (!normalizedVendor) {
      return null;
    }

    const existingDevice = await this.prisma.device.findUnique({
      where: {
        ecosystemId_macAddress: {
          ecosystemId,
          macAddress: normalizedMac,
        },
      },
      select: {
        id: true,
        vendor: true,
      },
    });

    if (!existingDevice) {
      throw new NotFoundException('Device not found');
    }

    if (existingDevice.vendor) {
      return existingDevice;
    }

    return this.prisma.device.update({
      where: { id: existingDevice.id },
      data: { vendor: normalizedVendor },
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