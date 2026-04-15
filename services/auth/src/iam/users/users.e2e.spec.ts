import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { beforeAll, afterAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Role } from '@prisma/client';
const request = require('supertest');
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController (e2e)', () => {
  let app: INestApplication;

  const usersServiceMock = {
    create: jest.fn(async (dto: { email: string }) => ({
      id: '9fdacfd7-31de-4f37-8e4b-cc05c6c416b4',
      email: dto.email,
      role: 'USER',
      status: 'PENDING',
      isActive: false,
      did: null,
      createdAt: new Date('2026-04-13T12:00:00.000Z'),
      updatedAt: new Date('2026-04-13T12:00:00.000Z'),
    })),
    changeRole: jest.fn(async (id: string, newRole: Role) => ({
      id,
      email: 'owner@aurora.local',
      role: newRole,
      status: 'PENDING',
      isActive: false,
      did: null,
    })),
    approveUser: jest.fn(async (id: string, adminDid: string) => ({
      id,
      email: 'owner@aurora.local',
      role: 'USER',
      status: 'ACTIVE',
      isActive: true,
      did: 'did:firefly:custom/owner@aurora.local',
      approvedBy: adminDid,
    })),
    remove: jest.fn(async (id: string, requesterId: string, requesterRole?: Role) => ({
      id,
      requesterId,
      requesterRole,
      status: 'REVOKED',
      isActive: false,
    })),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: usersServiceMock,
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();

    // Igual que en runtime real: validaciones DTO aplicadas globalmente.
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /users (Success) should return 201', async () => {
    const payload = {
      email: 'owner@aurora.local',
    };

    const response = await request(app.getHttpServer()).post('/users').send(payload).expect(201);

    expect(usersServiceMock.create).toHaveBeenCalledTimes(1);
    expect(response.body).toMatchObject({
      email: payload.email,
      role: 'USER',
      isActive: false,
      did: null,
    });
  });

  it('POST /users (Fail - Invalid Email) should return 400', async () => {
    const payload = {
      email: 'owner-aurora.local',
    };

    await request(app.getHttpServer()).post('/users').send(payload).expect(400);

    expect(usersServiceMock.create).not.toHaveBeenCalled();
  });

  it('PATCH /users/:id/role (Success) should return 200', async () => {
    const userId = '9fdacfd7-31de-4f37-8e4b-cc05c6c416b4';
    const payload = { newRole: 'ADMIN' };

    const response = await request(app.getHttpServer())
      .patch(`/users/${userId}/role`)
      .send(payload)
      .expect(200);

    expect(usersServiceMock.changeRole).toHaveBeenCalledWith(userId, Role.ADMIN);
    expect(response.body).toMatchObject({
      id: userId,
      role: 'ADMIN',
    });
  });

  it('PATCH /users/:id/role (Fail - Invalid Role) should return 400', async () => {
    const userId = '9fdacfd7-31de-4f37-8e4b-cc05c6c416b4';
    const payload = { newRole: 'SUPER_ADMIN' };

    await request(app.getHttpServer()).patch(`/users/${userId}/role`).send(payload).expect(400);

    expect(usersServiceMock.changeRole).not.toHaveBeenCalled();
  });

  it('PATCH /users/:id/approve (Success with adminDid) should return 200', async () => {
    const userId = '9fdacfd7-31de-4f37-8e4b-cc05c6c416b4';
    const payload = { adminDid: 'did:firefly:custom/admin@aurora.local' };

    const response = await request(app.getHttpServer())
      .patch(`/users/${userId}/approve`)
      .send(payload)
      .expect(200);

    expect(usersServiceMock.approveUser).toHaveBeenCalledWith(userId, payload.adminDid);
    expect(response.body).toMatchObject({
      id: userId,
      status: 'ACTIVE',
    });
  });

  it('PATCH /users/:id/approve (Fail - Missing adminDid) should return 400', async () => {
    const userId = '9fdacfd7-31de-4f37-8e4b-cc05c6c416b4';

    await request(app.getHttpServer()).patch(`/users/${userId}/approve`).send({}).expect(400);

    expect(usersServiceMock.approveUser).not.toHaveBeenCalled();
  });

  it('PATCH /users/:id/approve (Fail - Invalid adminDid type) should return 400', async () => {
    const userId = '9fdacfd7-31de-4f37-8e4b-cc05c6c416b4';

    await request(app.getHttpServer())
      .patch(`/users/${userId}/approve`)
      .send({ adminDid: 12345 })
      .expect(400);

    expect(usersServiceMock.approveUser).not.toHaveBeenCalled();
  });

  it('DELETE /users/:id (Success self) should return 200', async () => {
    const userId = '9fdacfd7-31de-4f37-8e4b-cc05c6c416b4';

    const response = await request(app.getHttpServer())
      .delete(`/users/${userId}`)
      .send({ requesterId: userId })
      .expect(200);

    expect(usersServiceMock.remove).toHaveBeenCalledWith(userId, userId, undefined);
    expect(response.body).toMatchObject({
      id: userId,
      status: 'REVOKED',
    });
  });
});
