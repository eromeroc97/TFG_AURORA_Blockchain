/**
 * Test Fixtures
 * Datos reutilizables para todos los tests
 * Proporciona usuarios, tokens, y configuración común
 */

import { Role, UserStatus } from '@prisma/client';

export class TestFixtures {
  /**
   * Usuarios de Prueba
   */
  static readonly USERS = {
    ADMIN: {
      id: 'admin-user-id-00000001',
      email: 'admin@test.test',
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
      isActive: true,
      did: 'did:firefly:custom/admin@aurora.local',
      passwordHash: 'hashed_admin_password',
    },
    GLOBAL_ADMIN: {
      id: 'global-admin-id-00000002',
      email: 'global-admin@test.test',
      role: Role.GLOBAL_ADMIN,
      status: UserStatus.ACTIVE,
      isActive: true,
      did: 'did:firefly:custom/global-admin@aurora.local',
      passwordHash: 'hashed_global_password',
    },
    REGULAR_USER: {
      id: 'regular-user-id-000000003',
      email: 'user@test.test',
      role: Role.USER,
      status: UserStatus.ACTIVE,
      isActive: true,
      did: 'did:firefly:custom/user@aurora.local',
      passwordHash: 'hashed_user_password',
    },
    PENDING_USER: {
      id: 'pending-user-id-0000004',
      email: 'pending@test.test',
      role: Role.USER,
      status: UserStatus.PENDING,
      isActive: false,
      did: null,
      passwordHash: 'hashed_pending_password',
    },
    REVOKED_USER: {
      id: 'revoked-user-id-00000005',
      email: 'REVOKED_revoked-user-id-00000005',
      role: Role.USER,
      status: UserStatus.REVOKED,
      isActive: false,
      did: 'did:firefly:custom/revoked@aurora.local',
      passwordHash: 'hashed_revoked_password',
    },
  };

  /**
   * Tokens JWT Mock
   */
  static readonly TOKENS = {
    ADMIN_ACCESS: 'mock-admin-access-token-jwt-rs256-signed',
    ADMIN_REFRESH: 'mock-admin-refresh-token-b64url-encoded',
    USER_ACCESS: 'mock-user-access-token-jwt-rs256-signed',
    USER_REFRESH: 'mock-user-refresh-token-b64url-encoded',
    EXPIRED: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.expired.signature',
    INVALID: 'invalid.jwt.token',
  };

  /**
   * DIDs de Prueba
   */
  static readonly DIDS = {
    ADMIN: 'did:firefly:custom/admin@aurora.local',
    USER: 'did:firefly:custom/user@aurora.local',
    ECOSYSTEM: 'did:firefly:custom/ecosystem@aurora.local',
  };

  /**
   * Emails de Prueba
   */
  static readonly EMAILS = {
    ADMIN: 'admin@test.test',
    USER: 'user@test.test',
    PENDING: 'pending@test.test',
    REVOKED: 'REVOKED_revoked-user-id-00000005',
  };

  /**
   * URLs de Prueba
   */
  static readonly URLS = {
    SET_PASSWORD: 'https://app.aurora.local/auth/set-password?token=test-token-123',
    RESET_PASSWORD: 'https://app.aurora.local/auth/reset-password?token=test-token-456',
    VERIFY_EMAIL: 'https://app.aurora.local/auth/verify-email?token=test-token-789',
  };

  /**
   * Timestamped para tests de revocación
   */
  static readonly TIMESTAMPS = {
    NOW: new Date().toISOString(),
    PAST: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 24h ago
    FUTURE: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h from now
  };

  /**
   * Configuración de SMTP para tests
   */
  static readonly SMTP = {
    HOST: process.env.SMTP_HOST ?? 'mailpit',
    PORT: parseInt(process.env.SMTP_PORT ?? '1025'),
    FROM: process.env.MAIL_FROM ?? 'noreply@aurora.local',
  };

  /**
   * Factory: Crear usuario de prueba personalizado
   */
  static createTestUser(overrides: Partial<typeof TestFixtures.USERS.ADMIN> = {}) {
    return {
      ...TestFixtures.USERS.REGULAR_USER,
      ...overrides,
    };
  }

  /**
   * Factory: Crear JWT payload de prueba
   */
  static createJwtPayload(
    userId: string = TestFixtures.USERS.REGULAR_USER.id,
    email: string = TestFixtures.USERS.REGULAR_USER.email,
    role: Role = Role.USER,
    did: string | null = TestFixtures.USERS.REGULAR_USER.did,
  ) {
    return {
      sub: userId,
      email,
      role,
      did,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 300, // 5 minutes
    };
  }

  /**
   * Factory: Crear request con Bearer token
   */
  static createAuthHeader(token: string): { Authorization: string } {
    return {
      Authorization: `Bearer ${token}`,
    };
  }
}
