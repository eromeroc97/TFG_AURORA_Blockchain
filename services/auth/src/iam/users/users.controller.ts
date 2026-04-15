import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { ApproveUserDto } from './dto/approve-user.dto';
import { ChangeRoleDto } from './dto/change-role.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

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
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Patch(':id/role')
  changeRole(@Param('id') id: string, @Body() changeRoleDto: ChangeRoleDto) {
    return this.usersService.changeRole(id, changeRoleDto.newRole);
  }

  @Patch(':id/approve')
  // TODO: Activar @Roles(Role.GLOBAL_ADMIN, Role.ADMIN) cuando se integre el módulo de auth/JWT.
  approveUser(@Param('id') id: string, @Body() approveUserDto: ApproveUserDto) {
    return this.usersService.approveUser(id, approveUserDto.adminDid);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
