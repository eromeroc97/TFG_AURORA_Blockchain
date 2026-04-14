import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import * as argon2 from 'argon2';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async register(registerDto: RegisterDto) {
    try {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: registerDto.email },
      });

      if (existingUser) {
        throw new ConflictException('A user with this email already exists');
      }

      const passwordHash = await argon2.hash(registerDto.password);

      const createdUser = await this.prisma.user.create({
        data: {
          email: registerDto.email,
          passwordHash,
          status: UserStatus.PENDING,
          did: null,
        },
      });

      const { passwordHash: _, ...sanitizedUser } = createdUser;
      return sanitizedUser;
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }

      throw new InternalServerErrorException('Failed to register user');
    }
  }
}
