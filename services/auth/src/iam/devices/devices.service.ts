import {
  BadRequestException,
  InternalServerErrorException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';

/**
 * Servicio de gestión de dispositivos IoT.
 * Maneja registro, actualización y lookup de dispositivos.
 *
 * Propósito de seguridad:
 * - Registro de dispositivos por MAC
 * - Association con ecosistemas
 * - Resolver vendors por MAC
 *
 * @Roles ADMIN, USER
 */
@Injectable()
export class DevicesService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly deviceSelect = {
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
        category: createDeviceDto.category as any ?? null,
        room: createDeviceDto.room ?? null,
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
      const currentVendor = existingDevice.vendor?.trim() || '';
      const shouldUpdateVendor =
        typeof normalizedVendor === 'string' &&
        normalizedVendor.length > 0 &&
        (currentVendor === '' || currentVendor === 'Generic Device');

      if (shouldUpdateVendor) {
        return this.prisma.device.update({
          where: { id: existingDevice.id },
          data: { vendor: normalizedVendor },
          select: this.deviceSelect,
        });
      }

      return existingDevice;
    }

    const name = preferredName?.trim() || await this.generateNextDefaultName(ecosystemId);

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

  private async generateNextDefaultName(ecosystemId: string): Promise<string> {
    const ecosystem = await this.prisma.ecosystem.findUnique({
      where: { id: ecosystemId },
      select: { ownerId: true },
    });

    if (!ecosystem) {
      return 'Nuevo dispositivo 1';
    }

    const devices = await this.prisma.device.findMany({
      where: {
        ecosystem: {
          ownerId: ecosystem.ownerId,
        },
        name: {
          startsWith: 'Nuevo dispositivo ',
        },
      },
      select: { name: true },
    });

    let maxNumber = 0;
    for (const device of devices) {
      const match = device.name.match(/^Nuevo dispositivo (\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNumber) {
          maxNumber = num;
        }
      }
    }

    return `Nuevo dispositivo ${maxNumber + 1}`;
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

    const currentVendor = existingDevice.vendor?.trim() || '';
    if (currentVendor !== '' && currentVendor !== 'Generic Device') {
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

  async findOneForUser(id: string, userId: string, userRole?: Role) {
    const isAdmin = userRole === Role.ADMIN || userRole === Role.GLOBAL_ADMIN;
    
    if (isAdmin) {
      return this.findOne(id);
    }

    const device = await this.prisma.device.findUnique({
      where: { id },
      select: {
        ...this.deviceSelect,
        ecosystem: {
          select: {
            id: true,
            ownerId: true,
            accesses: {
              select: { userId: true },
            },
          },
        },
      },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    const isOwner = device.ecosystem.ownerId === userId;
    const hasAccess = device.ecosystem.accesses.some((a) => a.userId === userId);

    if (!isOwner && !hasAccess) {
      throw new NotFoundException('Device not found');
    }

    const { ecosystem: _ecosystem, ...deviceData } = device as typeof device & { ecosystem: { id: string; ownerId: string; accesses: { userId: string }[] } };
    return deviceData;
  }

  async update(id: string, updateDeviceDto: UpdateDeviceDto) {
    const normalizedMacAddress = updateDeviceDto.macAddress
      ? this.normalizeMacAddress(updateDeviceDto.macAddress)
      : undefined;

    const { ecosystemId: _ignore, ...updateData } = updateDeviceDto;

    try {
      return await this.prisma.device.update({
        where: { id },
        data: {
          ...updateData,
          category: updateData.category as any,
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