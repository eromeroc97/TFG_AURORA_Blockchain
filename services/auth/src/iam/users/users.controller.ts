import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@ApiTags('Users (IAM)')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // TODO: [CU-05] Proteger este endpoint con JwtAuthGuard y RolesGuard (Solo GLOBAL_ADMIN)
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
    return this.usersService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(+id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }
}
