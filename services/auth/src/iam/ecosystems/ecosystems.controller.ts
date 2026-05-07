import { Controller, Get, Post, Body, Patch, Param, Delete, Req, UseGuards } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { EcosystemsService } from './ecosystems.service';
import { CreateEcosystemDto } from './dto/create-ecosystem.dto';
import { UpdateEcosystemDto } from './dto/update-ecosystem.dto';
import { GrantAccessDto } from './dto/grant-access.dto';
import { RevokeAccessDto } from './dto/revoke-access.dto';
import { UpdateAccessDto } from './dto/update-access.dto';
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

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER, Role.ADMIN, Role.GLOBAL_ADMIN, Role.AUDITOR)
  findAll(@Req() request: AuthenticatedRequest) {
    return this.ecosystemsService.getEcosystemsWithAccessType(request.user?.sub!, request.user?.role);
  }

  @Get('shared-with-me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER, Role.ADMIN, Role.GLOBAL_ADMIN, Role.AUDITOR)
  getSharedWithMe(@Req() request: AuthenticatedRequest) {
    return this.ecosystemsService.getUserAccesses(request.user?.sub!);
  }

  @Get('my-ecosystems')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER, Role.ADMIN, Role.GLOBAL_ADMIN, Role.AUDITOR)
  getMyEcosystems(@Req() request: AuthenticatedRequest) {
    return this.ecosystemsService.getEcosystemsWithAccessType(request.user?.sub!, request.user?.role);
  }

  @Get('by-user/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.GLOBAL_ADMIN)
  getEcosystemsByUserId(@Param('userId') userId: string) {
    return this.ecosystemsService.findAllEcosystemsByUserId(userId);
  }

  @Get(':id/api-key')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER)
  getApiKey(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.ecosystemsService.getApiKey(id, request.user?.sub);
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

  @Post(':id/accesses')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER)
  grantAccess(
    @Param('id') id: string,
    @Body() grantAccessDto: GrantAccessDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.ecosystemsService.grantAccess(id, request.user?.sub!, grantAccessDto.email, grantAccessDto.role);
  }

  @Get(':id/accesses')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER)
  getAccesses(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.ecosystemsService.getEcosystemAccesses(id, request.user?.sub!);
  }

  @Delete(':id/accesses/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER)
  revokeAccess(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.ecosystemsService.revokeAccess(id, request.user?.sub!, userId);
  }

  @Patch(':id/accesses/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER)
  updateAccessRole(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() updateAccessDto: UpdateAccessDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.ecosystemsService.updateAccessRole(id, request.user?.sub!, userId, updateAccessDto.role);
  }

  @Delete(':id/leave')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER, Role.ADMIN, Role.GLOBAL_ADMIN, Role.AUDITOR)
  @ApiOperation({ summary: 'Abandonar un ecosistema compartido (dejar de verlo)' })
  leaveSharedEcosystem(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.ecosystemsService.leaveSharedEcosystem(id, request.user?.sub!);
  }
}
