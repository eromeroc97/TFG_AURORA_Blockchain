import {
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role, UserStatus } from '@prisma/client';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../shared/mail/mail.service';
import { FireflyService } from '../../blockchain/firefly.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly blockchainService: FireflyService,
  ) {}

  private readonly userSelect = {
    id: true,
    email: true,
    role: true,
    status: true,
    isActive: true,
    did: true,
    createdAt: true,
    updatedAt: true,
  } as const;

  private readonly authUserSelect = {
    id: true,
    email: true,
    passwordHash: true,
    role: true,
    status: true,
    isActive: true,
    did: true,
    createdAt: true,
    updatedAt: true,
  } as const;

  private isNotFoundError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025';
  }

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
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: this.userSelect,
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: this.userSelect,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findByEmail(email: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        email,
        status: {
          not: UserStatus.REVOKED,
        },
      },
      select: this.authUserSelect,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    try {
      const { password, ...rest } = updateUserDto;
      const data: Prisma.UserUpdateInput = { ...rest };

      if (password) {
        data.passwordHash = await argon2.hash(password);
      }

      return await this.prisma.user.update({
        where: { id },
        data,
        select: this.userSelect,
      });
    } catch (error) {
      if (this.isNotFoundError(error)) {
        throw new NotFoundException('User not found');
      }

      throw new InternalServerErrorException('Failed to update user');
    }
  }

  async remove(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        status: true,
        did: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.status === UserStatus.REVOKED) {
      throw new ConflictException('El usuario ya ha sido revocado');
    }

    try {
      return await this.prisma.user.update({
        where: { id },
        data: {
          status: UserStatus.REVOKED,
          isActive: false,
          email: `REVOKED_${user.id}`,
          passwordHash: '*REVOKED_ACCOUNT*',
        },
        select: this.userSelect,
      });
    } catch (error) {
      if (this.isNotFoundError(error)) {
        throw new NotFoundException('User not found');
      }

      throw new InternalServerErrorException('Failed to remove user');
    }
  }

  async changeRole(targetUserId: string, newRole: Role) {
    if (newRole === Role.GLOBAL_ADMIN) {
      throw new ForbiddenException(
        'No se puede asignar el rol GLOBAL_ADMIN a través de la API.',
      );
    }

    try {
      return await this.prisma.user.update({
        where: { id: targetUserId },
        data: { role: newRole },
        select: this.userSelect,
      });
    } catch (error) {
      if (this.isNotFoundError(error)) {
        throw new NotFoundException('User not found');
      }

      throw new InternalServerErrorException('Failed to change user role');
    }
  }

  async approveUser(id: string, adminDid: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        status: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.status !== UserStatus.PENDING) {
      throw new ConflictException('El usuario no está en PENDING');
    }

    const userDid = await this.blockchainService.createIdentity({
      name: user.email,
      parent: adminDid,
    });

    const approvedUser = await this.prisma.user.update({
      where: { id },
      data: {
        status: UserStatus.ACTIVE,
        isActive: true,
        did: userDid,
      },
      select: this.userSelect,
    });

    await this.mailService.sendVerifyEmail(
      user.email,
      'http://localhost/reset-password?token=mock-token',
    );

    return approvedUser;
  }
}
