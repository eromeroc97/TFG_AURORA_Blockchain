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

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ecosystemsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateEcosystemDto: UpdateEcosystemDto) {
    return this.ecosystemsService.update(id, updateEcosystemDto);
  }

  @Patch(':id/heartbeat')
  updateHeartbeat(@Param('id') id: string) {
    return this.ecosystemsService.updateHeartbeat(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ecosystemsService.remove(id);
  }
}
