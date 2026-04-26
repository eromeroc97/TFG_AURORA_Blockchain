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

/**
 * Servicio de gestión de dispositivos Zero-Trust.
 * Maneja el registro y gestión de dispositivos IoT.
 *
 * @Injectable() - Proveído a nivel de módulo
 */
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

  /**
   * Crea un nuevo dispositivo.
   *
   * @param createDeviceDto - Datos del dispositivo
   * @returns El dispositivo creado
   */
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

  /**
   * Verifica si existe un dispositivo por su dirección MAC.
   *
   * @param ecosystemId - ID del ecosistema
   * @param macAddress - Dirección MAC
   * @returns true si existe
   * @async
   */
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

  /**
   * Registra o actualiza un dispositivo desde el proceso de descubrimiento.
   * Utilizado por el agente Zero-Trust.
   *
   * @param ecosystemId - ID del ecosistema
   * @param macAddress - Dirección MAC del dispositivo
   * @param vendor - Fabricante (opcional)
   * @param preferredName - Nombre preferido (opcional)
   * @returns El dispositivo
   * @async
   */
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

  /**
   * Actualiza el vendor de un dispositivo si falta.
   *
   * @param ecosystemId - ID del ecosistema
   * @param macAddress - Dirección MAC
   * @param vendor - Nuevo vendor
   * @returns El dispositivo actualizado o null
   * @throws NotFoundException - Si el dispositivo no existe
   * @async
   */
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

/**
   * Obtiene todos los dispositivos.
   *
   * @returns Lista de dispositivos
   */
  findAll() {

/**
   * Obtiene un dispositivo por ID.
   *
   * @param id - ID del dispositivo
   * @returns El dispositivo
   * @throws NotFoundException - Si no existe
   * @async
   */
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

  /**
   * Actualiza un dispositivo.
   *
   * @param id - ID del dispositivo
   * @param updateDeviceDto - Datos a actualizar
   * @returns El dispositivo actualizado
   * @throws NotFoundException - Si no existe
   * @async
   */
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

  /**
   * Elimina un dispositivo.
   *
   * @param id - ID del dispositivo
   * @returns El dispositivo eliminado
   * @throws NotFoundException - Si no existe
   * @async
   */
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