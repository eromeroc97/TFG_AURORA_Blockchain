import { Controller, Get, Post, Body, Patch, Param, Delete, Req, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { EcosystemsService } from './ecosystems.service';
import { CreateEcosystemDto } from './dto/create-ecosystem.dto';
import { UpdateEcosystemDto } from './dto/update-ecosystem.dto';
import { Roles, JwtAuthGuard, RolesGuard } from '../auth';

/**
 * Tipo para solicitudes autenticadas.
 */
type AuthenticatedRequest = {
  user?: {
    sub?: string;
    role?: Role;
  };
};

/**
 * Controlador de gestión de ecosistemas.
 * Expone endpoints para CRUD de ecosistemas y gestión de API keys.
 *
 * @Controller('ecosystems') - Prefijo de ruta: /ecosystems
 */
@Controller('ecosystems')
export class EcosystemsController {
  constructor(private readonly ecosystemsService: EcosystemsService) {}

  /**
   * Endpoint para crear un nuevo ecosistema.
   *
   * @Roles(Role.USER)
   * @param createEcosystemDto - Datos del ecosistema
   * @param request - Solicitud autenticada
   * @returns El ecosistema creado
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER)
  create(@Body() createEcosystemDto: CreateEcosystemDto, @Req() request: AuthenticatedRequest) {
    return this.ecosystemsService.create(createEcosystemDto, request.user?.sub);
  }

  /**
   * Endpoint para obtener la API key de un ecosistema.
   *
   * @Roles(Role.USER)
   * @param id - ID del ecosistema
   * @param request - Solicitud autenticada
   * @returns La API key
   */
  @Get(':id/api-key')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER)
  getApiKey(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.ecosystemsService.getApiKey(id, request.user?.sub);
  }

  /**
   * Endpoint para listar todos los ecosistemas.
   *
   * @returns Lista de ecosistemas
   */
  @Get()
  findAll() {
    return this.ecosystemsService.findAll();
  }

  /**
   * Endpoint para listar dispositivos de un ecosistema.
   *
   * @param id - ID del ecosistema
   * @returns Lista de dispositivos
   */
  @Get(':id/devices')
  findDevices(@Param('id') id: string) {
    return this.ecosystemsService.findDevicesForEcosystem(id);
  }

  /**
   * Endpoint para obtener un ecosistema por ID.
   *
   * @param id - ID del ecosistema
   * @returns El ecosistema
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ecosystemsService.findOne(id);
  }

  /**
   * Endpoint para actualizar un ecosistema.
   *
   * @Roles(Role.USER)
   * @param id - ID del ecosistema
   * @param updateEcosystemDto - Datos a actualizar
   * @returns El ecosistema actualizado
   */
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
