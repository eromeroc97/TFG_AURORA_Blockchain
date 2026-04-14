import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Registro Web2 de usuario (sin JWT previo)' })
  @ApiCreatedResponse({ description: 'Usuario registrado correctamente.' })
  @ApiConflictResponse({ description: 'Ya existe un usuario con ese email.' })
  @ApiInternalServerErrorResponse({ description: 'Error interno al registrar usuario.' })
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }
}
