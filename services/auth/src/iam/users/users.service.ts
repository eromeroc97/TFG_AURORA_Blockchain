import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { Role, UserStatus } from '@prisma/client';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../shared/mail/mail.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async create(createUserDto: CreateUserDto) {
    try {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: createUserDto.email },
      });

      if (existingUser) {
        throw new ConflictException('A user with this email already exists');
      }

      const generatedPassword = randomBytes(24).toString('base64url');
      const passwordHash = await argon2.hash(generatedPassword);

      const createdUser = await this.prisma.user.create({
        data: {
          email: createUserDto.email,
          passwordHash,
          role: Role.USER,
          status: UserStatus.PENDING,
          did: null,
          isActive: false,
        },
      });

      try {
        await this.mailService.sendWelcomeEmail(createUserDto.email);
      } catch (mailError) {
        console.warn('[UsersService] No se pudo enviar el email de bienvenida:', mailError);
      }

      const { passwordHash: _, ...sanitizedUser } = createdUser;
      return sanitizedUser;
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }

      console.error('[UsersService] Error real al crear usuario:', error);
      throw new InternalServerErrorException('Failed to create user');
    }
  }

  findAll() {
    return `This action returns all users`;
  }

  findOne(id: number) {
    return `This action returns a #${id} user`;
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
