import { Controller, Get, Post, Body, Patch, Param, Delete, Req, UseGuards } from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { UsersService } from './users.service';
import { ChangeRoleDto } from './dto/change-role.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Roles, JwtAuthGuard, RolesGuard } from '../auth';

/**
 * Tipo para solicitudes autenticadas.
 * Extrae información del usuario desde el token JWT.
 */
type AuthenticatedRequest = {
  user?: {
    sub?: string;
    role?: Role;
  };
};

/**
 * Controlador de gestión de usuarios (IAM).
 * Expone endpoints para CRUD de usuarios con control de acceso basado en roles.
 *
 * Endpoints安全管理ados:
 * - POST /users - Crear usuario (público, rol USER pending)
 * - GET /users - Listar usuarios (solo ADMIN, GLOBAL_ADMIN)
 * - GET /users/:id - Ver usuario (solo ADMIN, GLOBAL_ADMIN)
 * - PATCH /users/:id - Actualizar usuario
 * - PATCH /users/:id/role - Cambiar rol (solo ADMIN, GLOBAL_ADMIN)
 * - PATCH /users/:id/approve - Aprobar usuario (solo ADMIN, GLOBAL_ADMIN)
 * - DELETE /users/:id - Revocar usuario
 *
 * @Controller('users') - Prefijo de ruta: /users
 */
@ApiTags('Users (IAM)')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Endpoint para registrar un nuevo usuario.
   * Crea un usuario con rol USER y estado PENDING, generando contraseña aleatoria.
   *
   * @Roles() - Acceso público (sin autenticación requerida)
   * @param createUserDto - DTO con los datos del nuevo usuario
   * @returns El usuario creado sin el hash de la contraseña
   * @throws ConflictException - Si ya existe un usuario con ese email
   */
  @Post()
  @ApiOperation({ summary: 'Registrar un nuevo usuario (solo USER, PENDING)' })
  @ApiCreatedResponse({
    description: 'Usuario creado exitosamente con password aleatoria, sin el hash de la contraseña.',
  })
  @ApiConflictResponse({ description: 'Ya existe un usuario con ese email.' })
  @ApiInternalServerErrorResponse({
    description: 'Error interno al crear el usuario.',
  })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  /**
   * Endpoint para listar todos los usuarios activos.
   * Solo accesible para administradores.
   *
   * @Roles(Role.ADMIN, Role.GLOBAL_ADMIN)
   * @param request - Solicitud con el usuario autenticado
   * @returns Lista de usuarios
   */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.GLOBAL_ADMIN)
  findAll(@Req() request: AuthenticatedRequest) {
    return this.usersService.findAll(request.user?.role, request.user?.sub);
  }

  /**
   * Endpoint para obtener un usuario por su ID.
   * Solo accesible para administradores.
   *
   * @Roles(Role.ADMIN, Role.GLOBAL_ADMIN)
   * @param id - ID del usuario
   * @param request - Solicitud con el usuario autenticado
   * @returns Los datos del usuario
   * @throws NotFoundException - Si el usuario no existe
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.GLOBAL_ADMIN)
  findOne(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.usersService.findOne(id, request.user?.role, request.user?.sub);
  }

  /**
   * Endpoint para actualizar los datos de un usuario.
   * Permite actualizar email y otros datos.
   *
   * @Roles() - Acceso requiere autenticación JWT
   * @param id - ID del usuario a actualizar
   * @param updateUserDto - Datos a actualizar
   * @returns El usuario actualizado
   */
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  /**
   * Endpoint para cambiar el rol de un usuario.
   * Restringido a administradores.
   *
   * @Roles(Role.ADMIN, Role.GLOBAL_ADMIN)
   * @param id - ID del usuario
   * @param changeRoleDto - Nuevo rol a asignar
   * @param request - Solicitud con el usuario autenticado
   * @returns El usuario con el nuevo rol
   * @throws ForbiddenException - Si no tiene permisos
   */
  @Patch(':id/role')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.GLOBAL_ADMIN)
  changeRole(
    @Param('id') id: string,
    @Body() changeRoleDto: ChangeRoleDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.usersService.changeRole(
      id,
      changeRoleDto.newRole,
      request.user?.sub,
      request.user?.role,
    );
  }

  /**
   * Endpoint para aprobar un usuario pendiente.
   * Genera claves criptográficas Ed25519 y envía email de verificación.
   *
   * @Roles(Role.GLOBAL_ADMIN, Role.ADMIN)
   * @param id - ID del usuario a aprobar
   * @param request - Solicitud con el usuario autenticado
   * @returns El usuario aprobado
   * @throws ConflictException - Si el usuario no está en estado PENDING
   */
  @Patch(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.GLOBAL_ADMIN, Role.ADMIN)
  approveUser(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.usersService.approveUser(
      id,
      request.user?.sub,
      request.user?.role,
    );
  }

  /**
   * Endpoint para revocar (eliminar) un usuario.
   * Cambia el estado a REVOKED y añade a blacklist.
   *
   * @Roles() - Acceso requiere autenticación JWT
   * @param id - ID del usuario a revocar
   * @param request - Solicitud con el usuario autenticado
   * @returns El usuario revocado
   * @throws ForbiddenException - Si no tiene permisos
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.usersService.remove(id, request.user?.sub ?? id, request.user?.role);
  }
}
