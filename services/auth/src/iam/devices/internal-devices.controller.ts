import { BadRequestException, Body, Controller, ForbiddenException, Headers, Post } from '@nestjs/common';
import { DevicesService } from './devices.service';
import { InternalDeviceExistsDto } from './dto/internal-device-exists.dto';
import { InternalDeviceRegisterDto } from './dto/internal-device-register.dto';
import { InternalDeviceVendorUpdateDto } from './dto/internal-device-vendor-update.dto';

@Controller('internal/auth/devices')
export class InternalDevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post('exists')
  async exists(
    @Headers('authorization') authorization: string | undefined,
    @Body() internalDeviceExistsDto: InternalDeviceExistsDto,
  ) {
    const expectedInternalToken = process.env.AUTH_INTERNAL_TOKEN?.trim();

    if (expectedInternalToken) {
      const bearerToken = authorization?.trim().startsWith('Bearer ')
        ? authorization.trim().slice('Bearer '.length).trim()
        : undefined;

      if (bearerToken !== expectedInternalToken) {
        throw new ForbiddenException('No tienes permisos para usar esta ruta');
      }
    }

    return {
      exists: await this.devicesService.existsByMacAddress(
        internalDeviceExistsDto.ecosystemId,
        internalDeviceExistsDto.macAddress,
      ),
    };
  }

  @Post('register')
  async register(
    @Headers('authorization') authorization: string | undefined,
    @Body() internalDeviceRegisterDto: InternalDeviceRegisterDto,
  ) {
    const expectedInternalToken = process.env.AUTH_INTERNAL_TOKEN?.trim();

    if (expectedInternalToken) {
      const bearerToken = authorization?.trim().startsWith('Bearer ')
        ? authorization.trim().slice('Bearer '.length).trim()
        : undefined;

      if (bearerToken !== expectedInternalToken) {
        throw new ForbiddenException('No tienes permisos para usar esta ruta');
      }
    }

    if (!internalDeviceRegisterDto.macAddress?.trim()) {
      throw new BadRequestException('macAddress is required');
    }

    await this.devicesService.registerFromDiscovery(
      internalDeviceRegisterDto.ecosystemId,
      internalDeviceRegisterDto.macAddress,
      internalDeviceRegisterDto.vendor,
      internalDeviceRegisterDto.preferredName,
    );

    return { success: true };
  }

  @Post('vendor')
  async updateVendor(
    @Headers('authorization') authorization: string | undefined,
    @Body() internalDeviceVendorUpdateDto: InternalDeviceVendorUpdateDto,
  ) {
    const expectedInternalToken = process.env.AUTH_INTERNAL_TOKEN?.trim();

    if (expectedInternalToken) {
      const bearerToken = authorization?.trim().startsWith('Bearer ')
        ? authorization.trim().slice('Bearer '.length).trim()
        : undefined;

      if (bearerToken !== expectedInternalToken) {
        throw new ForbiddenException('No tienes permisos para usar esta ruta');
      }
    }

    if (!internalDeviceVendorUpdateDto.macAddress?.trim()) {
      throw new BadRequestException('macAddress is required');
    }

    if (!internalDeviceVendorUpdateDto.vendor?.trim()) {
      throw new BadRequestException('vendor is required');
    }

    await this.devicesService.updateVendorIfMissing(
      internalDeviceVendorUpdateDto.ecosystemId,
      internalDeviceVendorUpdateDto.macAddress,
      internalDeviceVendorUpdateDto.vendor,
    );

    return { success: true };
  }
}
