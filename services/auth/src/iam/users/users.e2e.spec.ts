import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { beforeAll, afterAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
const request = require('supertest');
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController (e2e) - POST /users', () => {
  let app: INestApplication;

  const usersServiceMock = {
    create: jest.fn(async (dto: { email: string }) => ({
      id: '9fdacfd7-31de-4f37-8e4b-cc05c6c416b4',
      email: dto.email,
      role: 'USER',
      isActive: false,
      did: null,
      createdAt: new Date('2026-04-13T12:00:00.000Z'),
      updatedAt: new Date('2026-04-13T12:00:00.000Z'),
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
});
