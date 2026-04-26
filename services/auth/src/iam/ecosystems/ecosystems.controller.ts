import { Controller, Get, Post, Body, Patch, Param, Delete, Req, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { EcosystemsService } from './ecosystems.service';
import { CreateEcosystemDto } from './dto/create-ecosystem.dto';
import { UpdateEcosystemDto } from './dto/update-ecosystem.dto';
import { Roles, JwtAuthGuard, RolesGuard } from '../auth';

type AuthenticatedRequest = {
  user?: {
    sub?: string;
    role?: Role;
  };
};

@Controller('ecosystems')
export class EcosystemsController {
  constructor(private readonly ecosystemsService: EcosystemsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER)
  create(@Body() createEcosystemDto: CreateEcosystemDto, @Req() request: AuthenticatedRequest) {
    return this.ecosystemsService.create(createEcosystemDto, request.user?.sub);
  }

  @Get(':id/api-key')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER)
  getApiKey(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.ecosystemsService.getApiKey(id, request.user?.sub);
  }

  @Get()
  findAll() {
    return this.ecosystemsService.findAll();
  }

  @Get(':id/devices')
  findDevices(@Param('id') id: string) {
    return this.ecosystemsService.findDevicesForEcosystem(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ecosystemsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER)
  update(@Param('id') id: string, @Body() updateEcosystemDto: UpdateEcosystemDto, @Req() request: AuthenticatedRequest) {
    return this.ecosystemsService.update(id, updateEcosystemDto, request.user?.sub);
  }

  @Patch(':id/heartbeat')
  updateHeartbeat(@Param('id') id: string) {
    return this.ecosystemsService.updateHeartbeat(id);
  }

  @Post(':id/revoke')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER)
  revoke(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.ecosystemsService.remove(id, request.user?.sub);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER)
  remove(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.ecosystemsService.remove(id, request.user?.sub);
  }
}
