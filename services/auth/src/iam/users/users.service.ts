import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role, UserStatus } from '@prisma/client';
import axios from 'axios';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'crypto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../shared/mail/mail.service';
import { FireflyService } from '../../blockchain/firefly.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly blockchainService: FireflyService,
    private readonly redisService: RedisService,
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
    hashedRefreshToken: true,
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

  private async assertPasswordNotPwned(password: string) {
    const isPasswordBreachCheckEnabled =
      (process.env.HIBP_PASSWORD_CHECK_ENABLED ?? 'true').toLowerCase() === 'true';

    if (!isPasswordBreachCheckEnabled) {
      return;
    }

    const sha1 = createHash('sha1').update(password, 'utf8').digest('hex').toUpperCase();
    const hashPrefix = sha1.slice(0, 5);
    const hashSuffix = sha1.slice(5);

    const baseUrl = (
      process.env.HIBP_PWNED_PASSWORDS_BASE_URL ?? 'https://api.pwnedpasswords.com/range'
    ).replace(/\/+$/, '');

    const userAgent = process.env.HIBP_USER_AGENT ?? 'AURORA-Auth-Service';
    const timeoutMs = Number(process.env.HIBP_TIMEOUT_MS ?? '5000');
    const failClosed = (process.env.HIBP_FAIL_CLOSED ?? 'false').toLowerCase() === 'true';

    const headers: Record<string, string> = {
      'Add-Padding': 'true',
      'User-Agent': userAgent,
    };

    if (process.env.HIBP_API_KEY) {
      headers['hibp-api-key'] = process.env.HIBP_API_KEY;
    }

    try {
      const response = await axios.get<string>(`${baseUrl}/${hashPrefix}`, {
        headers,
        timeout: Number.isFinite(timeoutMs) ? timeoutMs : 5000,
        responseType: 'text',
      });

      const leakedMatch = response.data
        .split('\n')
        .map((line) => line.trim())
        .find((line) => line.toUpperCase().startsWith(`${hashSuffix}:`));

      if (leakedMatch) {
        const leakedCount = Number(leakedMatch.split(':')[1] ?? '0');

        throw new BadRequestException(
          `La contraseña propuesta aparece en filtraciones públicas (${leakedCount} coincidencias). Elige una contraseña diferente.`,
        );
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      if (failClosed) {
        throw new InternalServerErrorException(
          'No se pudo verificar la seguridad de la contraseña en este momento. Inténtalo de nuevo más tarde.',
        );
      }

      console.warn('[UsersService] HIBP password check unavailable, continuing due to fail-open policy.', error);
    }
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

  async findAuthUserById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: this.authUserSelect,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateRefreshTokenHash(userId: string, hashedRefreshToken: string | null) {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: { hashedRefreshToken },
      });
    } catch (error) {
      if (this.isNotFoundError(error)) {
        throw new NotFoundException('User not found');
      }

      throw new InternalServerErrorException('Failed to update refresh token');
    }
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    try {
      const { password, ...rest } = updateUserDto;
      const data: Prisma.UserUpdateInput = { ...rest };

      if (password) {
        await this.assertPasswordNotPwned(password);
        data.passwordHash = await argon2.hash(password);
        const passwordChangedAt = new Date();
        passwordChangedAt.setHours(0, 0, 0, 0);
        data.passwordChangedAt = passwordChangedAt;
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

  async remove(id: string, requesterId: string = id, requesterRole?: Role) {
    const isAdminRequester =
      requesterRole === Role.ADMIN || requesterRole === Role.GLOBAL_ADMIN;
    const isSelfRequester = requesterId === id;

    if (!isAdminRequester && !isSelfRequester) {
      throw new ForbiddenException('No tienes permisos para revocar esta cuenta');
    }

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
      const revokedUser = await this.prisma.user.update({
        where: { id },
        data: {
          status: UserStatus.REVOKED,
          isActive: false,
          email: `REVOKED_${user.id}`,
          passwordHash: '*REVOKED_ACCOUNT*',
        },
        select: this.userSelect,
      });

      await this.redisService.addToBlacklist(id, 300);
      await this.mailService.sendAccountDeletedEmail(user.email, new Date().toISOString());
      return revokedUser;
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

    const currentUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    if (!currentUser) {
      throw new NotFoundException('User not found');
    }

    try {
      const updatedUser = await this.prisma.user.update({
        where: { id: targetUserId },
        data: { role: newRole },
        select: this.userSelect,
      });

      await this.mailService.sendRoleChangedEmail(
        currentUser.email,
        newRole,
        currentUser.role,
      );

      return updatedUser;
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
