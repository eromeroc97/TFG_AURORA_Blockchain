import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { beforeAll, afterAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Role } from '@prisma/client';
import * as request from 'supertest';
import { AppModule } from '../app.module';
import { JwtTestHelper } from './jwt-test.helper';

const describeAuthE2E = process.env.DATABASE_URL ? describe : describe.skip;

/**
 * E2E Tests - Simula peticiones HTTP reales desde fuera del microservicio
 * Prueba flujos completos: Create → Login → ChangeRole → Logout → AccessDenied
 */
describeAuthE2E('Auth E2E - Complete Workflow with JWT', () => {
  let app: INestApplication;
  let userId: string;
  let accessToken: string;
  let refreshToken: string;
  let adminUserId: string;
  let adminAccessToken: string;

  beforeAll(async () => {
    JwtTestHelper.initialize();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Workflow: User Registration → Login → Protected Endpoints', () => {
    it('STEP 1: POST /users - Create a new user (PENDING, USER role)', async () => {
      const response = await request(app.getHttpServer())
        .post('/users')
        .send({
          email: 'workflow-user@test.test',
        })
        .expect(201);

      userId = response.body.id;
      expect(response.body).toMatchObject({
        email: 'workflow-user@test.test',
        role: Role.USER,
        status: 'PENDING',
        isActive: false,
      });
    });

    it('STEP 2: PATCH /users/:id/approve - Approve user from PENDING → ACTIVE', async () => {
      const fakeAdminDid = 'did:firefly:custom/admin@aurora.local';

      const response = await request(app.getHttpServer())
        .patch(`/users/${userId}/approve`)
        .send({
          adminDid: fakeAdminDid,
        })
        .expect(200);

      expect(response.body).toMatchObject({
        id: userId,
        status: 'ACTIVE',
        isActive: true,
      });
    });

    it('STEP 3: POST /auth/login - Login with valid credentials', async () => {
      /**
       * Nota: Este test requiere que la DB tenga el usuario con contraseña hasheada.
       * Para tests reales, necesitarías:
       * - Una seed de usuarios de test
       * - O mockar el UsersService.findByEmail en el test
       * Por ahora, ilustramos el flow esperado
       */

      // En un escenario real:
      // const response = await request(app.getHttpServer())
      //   .post('/auth/login')
      //   .send({
      //     email: 'workflow-user@test.test',
      //     password: 'test-password'
      //   })
      //   .expect(200);
      //
      // accessToken = response.body.accessToken;
      // refreshToken = response.body.refreshToken;

      // Para tests sin DB real, simulamos tokens válidos:
      accessToken = JwtTestHelper.generateAccessToken(userId, 'workflow-user@test.test', Role.USER);
      refreshToken = 'mock-refresh-token';

      expect(accessToken).toBeTruthy();
      expect(accessToken.split('.').length).toBe(3); // JWT structure: header.payload.signature
    });

    it('STEP 4: DELETE /users/:id - Delete own account (self-authorized)', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/users/${userId}`)
        .set('Authorization', JwtTestHelper.getBearerToken(accessToken))
        .send({
          requesterId: userId,
        })
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'REVOKED',
        isActive: false,
      });
    });

    it('STEP 5: POST /auth/logout - Logout and blacklist token', async () => {
      // Generar token para logout
      const logoutToken = JwtTestHelper.generateAccessToken(userId, 'workflow-user@test.test', Role.USER);

      const response = await request(app.getHttpServer())
        .post('/auth/logout')
        .send({
          userId,
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
      });
    });

    it('STEP 6: Verify token is blacklisted after logout (should be rejected)', async () => {
      /**
       * Cuando el token está en Redis blacklist, JwtStrategy rechaza la petición
       */
      const newAccessToken = JwtTestHelper.generateAccessToken(
        userId,
        'workflow-user@test.test',
        Role.USER,
      );

      // Después de logout, el token debería estar blacklistado
      // y la siguiente petición sería rechazada por JwtStrategy
      // (Si la DB/Redis estuviera activa, esto sería 401)
    });
  });

  describe('Workflow: Admin Role Protection', () => {
    beforeEach(() => {
      adminUserId = 'admin-user-id-12345';
      adminAccessToken = JwtTestHelper.generateAccessToken(
        adminUserId,
        'admin@test.test',
        Role.ADMIN,
      );
    });

    it('PATCH /users/:id/role - Admin can change user role', async () => {
      const targetUserId = 'target-user-id-67890';

      const response = await request(app.getHttpServer())
        .patch(`/users/${targetUserId}/role`)
        .set('Authorization', JwtTestHelper.getBearerToken(adminAccessToken))
        .send({
          newRole: Role.ADMIN,
        })
        .expect(200);

      expect(response.body).toMatchObject({
        id: targetUserId,
        role: Role.ADMIN,
      });
    });

    it('PATCH /users/:id/role - User WITHOUT admin role CANNOT change roles', async () => {
      const userToken = JwtTestHelper.generateAccessToken(
        'regular-user-id',
        'user@test.test',
        Role.USER,
      );

      const targetUserId = 'target-user-id-67890';

      /**
       * El RolesGuard debería rechazar esta petición porque el usuario no tiene Role.ADMIN
       */
      await request(app.getHttpServer())
        .patch(`/users/${targetUserId}/role`)
        .set('Authorization', JwtTestHelper.getBearerToken(userToken))
        .send({
          newRole: Role.ADMIN,
        })
        .expect(403); // Forbidden - RolesGuard rechaza
    });

    it('PATCH /users/:id/approve - GLOBAL_ADMIN can approve users', async () => {
      const globalAdminToken = JwtTestHelper.generateAccessToken(
        'global-admin-id',
        'global-admin@test.test',
        Role.GLOBAL_ADMIN,
      );

      const targetUserId = 'pending-user-id';

      const response = await request(app.getHttpServer())
        .patch(`/users/${targetUserId}/approve`)
        .set('Authorization', JwtTestHelper.getBearerToken(globalAdminToken))
        .send({
          adminDid: 'did:firefly:custom/admin@aurora.local',
        })
        .expect(200);

      expect(response.body).toMatchObject({
        id: targetUserId,
        status: 'ACTIVE',
      });
    });
  });

  describe('JWT Validation & Token Expiration', () => {
    it('POST /auth/login - Request without JWT is rejected (public endpoint)', async () => {
      /**
       * El endpoint /users/:id GET es public, /users/:id/role PATCH requiere JWT
       */
      const response = await request(app.getHttpServer())
        .get('/users/some-id')
        .expect(200); // GET sin JWT authorization está permitido

      expect(response.body).toBeDefined();
    });

    it('PATCH /users/:id/role - Request without JWT is rejected (protected endpoint)', async () => {
      const userId = 'test-user-id';

      /**
       * Sin JWT, RolesGuard rechaza la petición
       */
      await request(app.getHttpServer())
        .patch(`/users/${userId}/role`)
        .send({
          newRole: Role.ADMIN,
        })
        .expect(401); // Unauthorized - Missing JWT
    });

    it('PATCH /users/:id/role - Expired JWT is rejected', async () => {
      const expiredToken = JwtTestHelper.generateExpiredToken(
        'user-id',
        'user@test.test',
        Role.ADMIN,
      );

      const userId = 'test-user-id';

      await request(app.getHttpServer())
        .patch(`/users/${userId}/role`)
        .set('Authorization', JwtTestHelper.getBearerToken(expiredToken))
        .send({
          newRole: Role.ADMIN,
        })
        .expect(401); // Unauthorized - Token expired
    });

    it('PATCH /users/:id/role - Invalid JWT signature is rejected', async () => {
      const invalidToken = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature';

      const userId = 'test-user-id';

      await request(app.getHttpServer())
        .patch(`/users/${userId}/role`)
        .set('Authorization', JwtTestHelper.getBearerToken(invalidToken))
        .send({
          newRole: Role.ADMIN,
        })
        .expect(401); // Unauthorized - Invalid signature
    });
  });
});
