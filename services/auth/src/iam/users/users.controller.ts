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

type AuthenticatedRequest = {
  user?: {
    sub?: string;
    role?: Role;
  };
};

@ApiTags('Users (IAM)')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

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

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.GLOBAL_ADMIN)
  findAll(@Req() request: AuthenticatedRequest) {
    return this.usersService.findAll(request.user?.role, request.user?.sub);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.GLOBAL_ADMIN)
  findOne(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.usersService.findOne(id, request.user?.role, request.user?.sub);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

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

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.usersService.remove(id, request.user?.sub ?? id, request.user?.role);
  }
}
