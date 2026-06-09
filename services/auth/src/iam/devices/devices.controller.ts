import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { DevicesService } from './devices.service';

type AuthenticatedRequest = {
  user?: {
    sub?: string;
    role?: Role;
  };
};

@ApiTags('Devices (IAM)')
@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.GLOBAL_ADMIN)
  @ApiOperation({ summary: 'Registrar un nuevo dispositivo Zero-Trust' })
  @ApiCreatedResponse({ description: 'Dispositivo creado correctamente.' })
  create(@Body() createDeviceDto: CreateDeviceDto, @Req() request: AuthenticatedRequest) {
    return this.devicesService.create(createDeviceDto, request.user?.sub);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.GLOBAL_ADMIN)
  findAll() {
    return this.devicesService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.devicesService.findOneForUser(id, request.user?.sub ?? '', request.user?.role);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() updateDeviceDto: UpdateDeviceDto, @Req() request: AuthenticatedRequest) {
    return this.devicesService.update(id, updateDeviceDto, request.user?.sub, request.user?.role);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.devicesService.remove(id, request.user?.sub, request.user?.role);
  }
}