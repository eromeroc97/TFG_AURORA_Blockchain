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
import { FireflyService, AnchorPayload } from '../../blockchain/firefly.service';
import { CryptoService } from '../../crypto/crypto.service';
import { RedisService } from '../redis/redis.service';

/**
 * Acciones de auditoría para gestión de usuarios.
 */
export enum AuditAction {
  /** Aprobación de usuario */
  USER_APPROVE = 'USER_APPROVE',
  /** Revocación de usuario */
  USER_REVOKE = 'USER_REVOKE',
  /** Cambio de rol */
  ROLE_CHANGE = 'ROLE_CHANGE',
}

/**
 * Servicio de gestión de usuarios.
 * Maneja CRUD de usuarios, roles, aprobación y auditoría.
 *
 * Propósito de seguridad:
 * - Hashes Argon2 para contraseñas
 * - Aprobación manual de usuarios
 * - Auditoría en blockchain
 *
 * @Roles ADMIN
 */
@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly blockchainService: FireflyService,
    private readonly cryptoService: CryptoService,
    private readonly redisService: RedisService,
  ) {}

  private readonly userSelect = {
    id: true,
    email: true,
    role: true,
    status: true,
    isActive: true,
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
    identity: {
      select: {
        publicKey: true,
        privateKeyCiphertext: true,
        privateKeyIv: true,
        privateKeyAuthTag: true,
      },
    },
    createdAt: true,
    updatedAt: true,
  } as const;

  private isNotFoundError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025';
  }

  private isAdminRole(role?: Role): boolean {
    return role === Role.ADMIN || role === Role.GLOBAL_ADMIN;
  }

  private assertPrivilegedRole(role?: Role) {
    if (!this.isAdminRole(role)) {
      throw new ForbiddenException('No tienes permisos para gestionar usuarios');
    }
  }

  private assertCanViewTarget(actorRole: Role | undefined, actorId: string | undefined, target: { id: string; role: Role }) {
    this.assertPrivilegedRole(actorRole);

    if (target.id === actorId) {
      throw new ForbiddenException('No puedes gestionar tu propio usuario desde esta vista');
    }

    if (actorRole === Role.ADMIN && target.role === Role.GLOBAL_ADMIN) {
      throw new ForbiddenException('No tienes permisos para gestionar este usuario');
    }
  }

  private assertCanManageRoleChange(actorRole: Role | undefined, targetRole: Role, newRole: Role) {
    this.assertPrivilegedRole(actorRole);

    if (newRole === Role.GLOBAL_ADMIN) {
      throw new ForbiddenException(
        'No se puede asignar el rol GLOBAL_ADMIN a través de la API.',
      );
    }

    if (actorRole === Role.ADMIN) {
      if (targetRole === Role.ADMIN || targetRole === Role.GLOBAL_ADMIN) {
        throw new ForbiddenException('No puedes modificar el rol de usuarios administradores');
      }

      if (newRole === Role.ADMIN) {
        throw new ForbiddenException('No tienes permisos para asignar el rol ADMIN');
      }
    }
  }

  private assertCanRevoke(actorRole: Role | undefined, targetRole: Role) {
    if (actorRole === Role.ADMIN && (targetRole === Role.ADMIN || targetRole === Role.GLOBAL_ADMIN)) {
      throw new ForbiddenException('No puedes revocar cuentas de administradores');
    }
  }

  private async resolveActorPublicKey(actorId: string): Promise<string> {
    const actor = await this.prisma.user.findUnique({
      where: { id: actorId },
      select: {
        identity: {
          select: {
            publicKey: true,
          },
        },
      },
    });

    if (!actor) {
      throw new NotFoundException('User not found');
    }

    if (!actor.identity?.publicKey) {
      throw new BadRequestException('El usuario aprobador debe tener claves criptográficas');
    }

    return actor.identity.publicKey;
  }

  private async getActorPrivateKey(actorId: string): Promise<string> {
    const actor = await this.prisma.user.findUnique({
      where: { id: actorId },
      select: {
        identity: {
          select: {
            privateKeyCiphertext: true,
            privateKeyIv: true,
            privateKeyAuthTag: true,
          },
        },
      },
    });

    if (!actor?.identity) {
      throw new BadRequestException('El usuario aprobador no tiene identidad criptográfica');
    }

    const { privateKeyCiphertext, privateKeyIv, privateKeyAuthTag } = actor.identity;
    if (!privateKeyCiphertext || !privateKeyIv || !privateKeyAuthTag) {
      throw new BadRequestException('El usuario aprobador no tiene claves privadas');
    }

    const encryptedPayload = {
      ciphertext: privateKeyCiphertext,
      iv: privateKeyIv,
      authTag: privateKeyAuthTag,
    };
    return this.cryptoService.decryptPrivateKey(encryptedPayload);
  }

  private async buildAnchorPayload(
    action: AuditAction,
    targetUserId: string,
    actorId: string,
    additionalData?: Record<string, unknown>,
  ): Promise<AnchorPayload> {
    const timestamp = new Date().toISOString();
    const targetData = JSON.stringify({
      action,
      targetUserId,
      timestamp,
      ...additionalData,
    });
    const originalHash = this.cryptoService.hashSha256(targetData);
    const publicKey = await this.resolveActorPublicKey(actorId);
    const privateKey = await this.getActorPrivateKey(actorId);
    const signature = this.cryptoService.sign(targetData, privateKey);

    return {
      actionId: action,
      originalHash,
      signature,
      signerPublicKey: publicKey,
      timestamp,
    };
  }

  private async anchorAction(
    action: AuditAction,
    targetUserId: string,
    actorId: string,
    additionalData?: Record<string, unknown>,
  ): Promise<void> {
    try {
      const payload = await this.buildAnchorPayload(action, targetUserId, actorId, additionalData);
      await this.blockchainService.broadcastAnchor(payload);
    } catch (error) {
      console.error(`[UsersService] Anchoring failed for ${action}:`, error);
    }
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

    let baseUrl = process.env.HIBP_PWNED_PASSWORDS_BASE_URL ?? 'https://api.pwnedpasswords.com/range';
    while (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
    }

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

  private readonly resetTokenTtlMinutes = 10;

  private getResetTokenTtlMs(): number {
    return this.resetTokenTtlMinutes * 60 * 1000;
  }

  private getResetTokenValidSince(referenceDate: Date): Date {
    return new Date(referenceDate.getTime() - this.getResetTokenTtlMs());
  }

  private buildTokenFingerprint(rawToken: string): string {
    return createHash('sha256').update(rawToken, 'utf8').digest('hex');
  }

  private createResetActionUrl(rawToken: string): string {
    let baseUrl = process.env.PASSWORD_RESET_ACTION_URL ?? 'http://localhost:5173/reset';
    while (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
    }

    return `${baseUrl}?token=${encodeURIComponent(rawToken)}`;
  }

  private async generateUniqueResetTokenCandidate(maxAttempts = 5): Promise<{
    rawToken: string;
    tokenFingerprint: string;
  }> {
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const rawToken = randomBytes(32).toString('base64url');
      const tokenFingerprint = this.buildTokenFingerprint(rawToken);

      const existingToken = await this.prisma.passwordResetToken.findUnique({
        where: { tokenFingerprint },
        select: { id: true },
      });

      if (!existingToken) {
        return { rawToken, tokenFingerprint };
      }
    }

    throw new InternalServerErrorException('No se pudo generar un token de recuperación único');
  }

  private async resolveValidPasswordResetToken(rawToken: string, referenceDate = new Date()) {
    const tokenFingerprint = this.buildTokenFingerprint(rawToken);

    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { tokenFingerprint },
      select: {
        id: true,
        userId: true,
        tokenHash: true,
        createdAt: true,
        usedAt: true,
      },
    });

    if (!resetToken) {
      throw new BadRequestException('Token de recuperación inválido o expirado.');
    }

    if (resetToken.usedAt) {
      throw new BadRequestException('Este token de recuperación ya fue utilizado.');
    }

    const validSince = this.getResetTokenValidSince(referenceDate);
    if (resetToken.createdAt < validSince) {
      throw new BadRequestException('Token de recuperación inválido o expirado.');
    }

    const tokenMatches = await argon2.verify(resetToken.tokenHash, rawToken);
    if (!tokenMatches) {
      throw new BadRequestException('Token de recuperación inválido o expirado.');
    }

    return resetToken;
  }

  async validatePasswordResetToken(rawToken: string): Promise<{ valid: boolean }> {
    try {
      await this.resolveValidPasswordResetToken(rawToken);
      return { valid: true };
    } catch (error) {
      if (error instanceof BadRequestException) {
        return { valid: false };
      }

      throw error;
    }
  }

  async createPasswordResetToken(email: string): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: {
        email,
        isActive: true,
        status: {
          not: UserStatus.REVOKED,
        },
      },
      select: {
        id: true,
        email: true,
      },
    });

    // Evita enumeración de cuentas: la respuesta de recover no debe revelar existencia del usuario.
    if (!user) {
      return;
    }

    const actionUrl = await this.issuePasswordResetActionUrl(user.id, {
      blockLoginUntilPasswordReset: true,
    });
    await this.mailService.sendRecoverEmail(user.email, actionUrl);
  }

  private async issuePasswordResetActionUrl(
    userId: string,
    options?: {
      blockLoginUntilPasswordReset?: boolean;
    },
  ): Promise<string> {
    const { rawToken, tokenFingerprint } = await this.generateUniqueResetTokenCandidate();
    const tokenHash = await argon2.hash(rawToken);
    const now = new Date();

    const operations: Prisma.PrismaPromise<unknown>[] = [
      this.prisma.passwordResetToken.updateMany({
        where: {
          userId,
          usedAt: null,
        },
        data: {
          usedAt: now,
        },
      }),
      this.prisma.passwordResetToken.create({
        data: {
          userId,
          tokenHash,
          tokenFingerprint,
          createdAt: now,
        },
      }),
    ];

    if (options?.blockLoginUntilPasswordReset) {
      operations.push(
        this.prisma.user.update({
          where: { id: userId },
          data: {
            status: UserStatus.PASSBLOCK,
          },
        }),
      );
    }

    await this.prisma.$transaction(operations);

    return this.createResetActionUrl(rawToken);
  }

  async consumePasswordResetToken(rawToken: string, newPassword: string): Promise<void> {
    const now = new Date();
    const validSince = this.getResetTokenValidSince(now);
    const resetToken = await this.resolveValidPasswordResetToken(rawToken, now);

    const tokenOwner = await this.prisma.user.findUnique({
      where: { id: resetToken.userId },
      select: {
        id: true,
        isActive: true,
      },
    });

    if (!tokenOwner || !tokenOwner.isActive) {
      throw new ForbiddenException('La cuenta no está activa para actualizar contraseña');
    }

    await this.assertPasswordNotPwned(newPassword);

    const passwordHash = await argon2.hash(newPassword);
    const passwordChangedAt = new Date();
    passwordChangedAt.setHours(0, 0, 0, 0);

    await this.prisma.$transaction(async (tx) => {
      const consumeResult = await tx.passwordResetToken.updateMany({
        where: {
          id: resetToken.id,
          usedAt: null,
          createdAt: {
            gte: validSince,
          },
        },
        data: {
          usedAt: now,
        },
      });

      if (consumeResult.count !== 1) {
        throw new BadRequestException('Token de recuperación inválido o expirado.');
      }

      await tx.user.update({
        where: { id: resetToken.userId },
        data: {
          passwordHash,
          passwordChangedAt,
          status: UserStatus.ACTIVE,
          isActive: true,
          hashedRefreshToken: null,
        },
      });

      await tx.passwordResetToken.updateMany({
        where: {
          userId: resetToken.userId,
          usedAt: null,
        },
        data: {
          usedAt: now,
        },
      });
    });
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

  findAll(actorRole?: Role, actorId?: string) {
    this.assertPrivilegedRole(actorRole);

    const where: Prisma.UserWhereInput = {
      status: {
        not: UserStatus.REVOKED,
      },
      id: actorId
        ? {
            not: actorId,
          }
        : undefined,
      role:
        actorRole === Role.ADMIN
          ? {
              not: Role.GLOBAL_ADMIN,
            }
          : undefined,
    };

    return this.prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: this.userSelect,
    });
  }

  async findOne(id: string, actorRole?: Role, actorId?: string) {
    this.assertPrivilegedRole(actorRole);

    const user = await this.prisma.user.findUnique({
      where: { id },
      select: this.userSelect,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.status === UserStatus.REVOKED) {
      throw new NotFoundException('User not found');
    }

    this.assertCanViewTarget(actorRole, actorId, {
      id: user.id,
      role: user.role,
    });

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
        (data as Prisma.UserUpdateInput & { passwordChangedAt?: Date }).passwordChangedAt =
          passwordChangedAt;
        data.status = UserStatus.ACTIVE;
        data.isActive = true;
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

    if (isAdminRequester && isSelfRequester) {
      throw new ForbiddenException('No puedes revocar tu propia cuenta desde este endpoint');
    }

    if (!isAdminRequester && !isSelfRequester) {
      throw new ForbiddenException('No tienes permisos para revocar esta cuenta');
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        status: true,
        role: true,
        identity: {
          select: {
            publicKey: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.status === UserStatus.REVOKED) {
      throw new ConflictException('El usuario ya ha sido revocado');
    }

    if (isAdminRequester) {
      this.assertCanRevoke(requesterRole, user.role);
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

      const targetUserPublicKey = user.identity?.publicKey;
      await this.anchorAction(
        AuditAction.USER_REVOKE,
        id,
        requesterId,
        { targetUserPublicKey },
      );

      await this.mailService.sendAccountDeletedEmail(user.email, new Date().toISOString());
      return revokedUser;
    } catch (error) {
      if (this.isNotFoundError(error)) {
        throw new NotFoundException('User not found');
      }

      throw new InternalServerErrorException('Failed to remove user');
    }
  }

  async changeRole(targetUserId: string, newRole: Role, actorId?: string, actorRole?: Role) {
    this.assertPrivilegedRole(actorRole);

    if (!actorId) {
      throw new ForbiddenException('No se pudo identificar al usuario autenticado');
    }

    if (targetUserId === actorId) {
      throw new ForbiddenException('No puedes modificar tu propio rol');
    }

    const currentUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
      },
    });

    if (!currentUser) {
      throw new NotFoundException('User not found');
    }

    if (currentUser.status === UserStatus.REVOKED) {
      throw new ConflictException('No se puede modificar el rol de un usuario revocado');
    }

    this.assertCanManageRoleChange(actorRole, currentUser.role, newRole);

    try {
      const updatedUser = await this.prisma.user.update({
        where: { id: targetUserId },
        data: { role: newRole },
        select: this.userSelect,
      });

      await this.anchorAction(
        AuditAction.ROLE_CHANGE,
        targetUserId,
        actorId!,
        { oldRole: currentUser.role, newRole },
      );

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

  async approveUser(id: string, actorId?: string, actorRole?: Role) {
    this.assertPrivilegedRole(actorRole);

    if (!actorId) {
      throw new ForbiddenException('No se pudo identificar al usuario autenticado');
    }

    if (id === actorId) {
      throw new ForbiddenException('No puedes aprobar tu propia cuenta');
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        status: true,
        role: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.status !== UserStatus.PENDING) {
      throw new ConflictException('El usuario no está en PENDING');
    }

    if (actorRole === Role.ADMIN && (user.role === Role.ADMIN || user.role === Role.GLOBAL_ADMIN)) {
      throw new ForbiddenException('No puedes aprobar cuentas de administradores');
    }

    const keyPair = this.cryptoService.generateKeyPair();
    const encrypted = this.cryptoService.encryptPrivateKey(keyPair.privateKey);

    const identity = await this.prisma.identity.create({
      data: {
        type: 'USER',
        publicKey: keyPair.publicKey,
        privateKeyCiphertext: encrypted.ciphertext,
        privateKeyIv: encrypted.iv,
        privateKeyAuthTag: encrypted.authTag,
        keyRotationTimestamp: new Date(),
      },
    });

    const approvedUser = await this.prisma.user.update({
      where: { id },
      data: {
        identityId: identity.id,
        status: UserStatus.ACTIVE,
        isActive: true,
      },
      select: this.userSelect,
    });

    await this.anchorAction(AuditAction.USER_APPROVE, id, actorId);

    const actionUrl = await this.issuePasswordResetActionUrl(user.id);
    await this.mailService.sendVerifyEmail(user.email, actionUrl);

    return approvedUser;
  }

  async getUserTelemetryVolume(userId: string): Promise<{ volume: number }> {
    const iotManagerUrl = process.env.IOT_MANAGER_URL;

    if (!iotManagerUrl) {
      throw new InternalServerErrorException('IOT_MANAGER_URL not configured');
    }

    const ecosystems = await this.prisma.ecosystem.findMany({
      where: { ownerId: userId },
      select: { id: true },
    });

    if (ecosystems.length === 0) {
      return { volume: 0 };
    }

    const ecosystemIds = ecosystems.map((e) => e.id);
    const iotManagerInternalToken = process.env.IOT_MANAGER_INTERNAL_TOKEN;

    try {
      const response = await axios.get<{ volume: number }>(`${iotManagerUrl}/api/telemetry/v1/volume`, {
        params: { ecosystemIds: ecosystemIds.join(',') },
        headers: iotManagerInternalToken
          ? { Authorization: `Bearer ${iotManagerInternalToken}` }
          : undefined,
      });
      return { volume: response.data.volume ?? 0 };
    } catch {
      return { volume: 0 };
    }
  }
}
