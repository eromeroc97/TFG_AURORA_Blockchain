import { ConflictException, InternalServerErrorException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as argon2 from 'argon2';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { UsersService } from './users.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { MailService } from '../../shared/mail/mail.service';
import { randomBytes } from 'crypto';

jest.mock('argon2', () => ({
  hash: jest.fn(),
}));

jest.mock('crypto', () => ({
  ...(jest.requireActual('crypto') as typeof import('crypto')),
  randomBytes: jest.fn(),
}));

describe('UsersService', () => {
  let service: UsersService;
  let prismaServiceMock: {
    user: {
      findUnique: ReturnType<typeof jest.fn>;
      create: ReturnType<typeof jest.fn>;
    };
    findAll: ReturnType<typeof jest.fn>;
    findOne: ReturnType<typeof jest.fn>;
    update: ReturnType<typeof jest.fn>;
    remove: ReturnType<typeof jest.fn>;
  };
  let mailServiceMock: {
    sendWelcomeEmail: ReturnType<typeof jest.fn>;
  };
  const mockHash = argon2.hash as jest.MockedFunction<typeof argon2.hash>;
  const mockRandomBytes = randomBytes as jest.MockedFunction<typeof randomBytes>;
  const generatedPasswordBuffer = Buffer.from('temporary-password-123456');
  const generatedPassword = generatedPasswordBuffer.toString('base64url');

  const createUserDto: CreateUserDto = {
    email: 'admin@aurora.local',
  };

  const createdUserRecord = {
    id: 'a4a98bc5-a6a3-4e13-8cb7-4f2cbf3a4c75',
    email: createUserDto.email,
    passwordHash: 'hashed_password',
    role: 'USER',
    did: null,
    isActive: false,
    createdAt: new Date('2026-04-13T10:00:00.000Z'),
    updatedAt: new Date('2026-04-13T10:00:00.000Z'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useFactory: () => ({
            user: {
              findUnique: jest.fn(),
              create: jest.fn(),
            },
            findAll: jest.fn(() => []),
            findOne: jest.fn((id: number) => `mock findOne #${id}`),
            update: jest.fn((id: number, payload: UpdateUserDto) => ({ id, ...payload })),
            remove: jest.fn((id: number) => `mock remove #${id}`),
          }),
        },
        {
          provide: MailService,
          useFactory: () => ({
            sendWelcomeEmail: jest.fn(),
          }),
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prismaServiceMock = module.get(PrismaService) as unknown as typeof prismaServiceMock;
    mailServiceMock = module.get(MailService) as unknown as typeof mailServiceMock;
    jest.clearAllMocks();
  });

  it('should hash password and create user', async () => {
    prismaServiceMock.user.findUnique.mockResolvedValue(null);
    mockHash.mockResolvedValue('hashed_password' as never);
    mockRandomBytes.mockReturnValue(generatedPasswordBuffer as never);
    prismaServiceMock.user.create.mockResolvedValue(createdUserRecord);
    mailServiceMock.sendWelcomeEmail.mockResolvedValue(undefined);

    const result = await service.create(createUserDto);

    expect(prismaServiceMock.user.findUnique).toHaveBeenCalledWith({
      where: { email: createUserDto.email },
    });
    expect(mockRandomBytes).toHaveBeenCalledWith(24);
    expect(mockHash).toHaveBeenCalledWith(generatedPassword);
    expect(prismaServiceMock.user.create).toHaveBeenCalledWith({
      data: {
        email: createUserDto.email,
        passwordHash: 'hashed_password',
        role: 'USER',
        did: null,
        isActive: false,
        status: 'PENDING',
      },
    });
    expect(mailServiceMock.sendWelcomeEmail).toHaveBeenCalledWith(createUserDto.email);

    const findUniqueCallOrder = prismaServiceMock.user.findUnique.mock.invocationCallOrder[0];
    const randomBytesCallOrder = mockRandomBytes.mock.invocationCallOrder[0];
    const hashCallOrder = mockHash.mock.invocationCallOrder[0];
    const createCallOrder = prismaServiceMock.user.create.mock.invocationCallOrder[0];
    const mailCallOrder = mailServiceMock.sendWelcomeEmail.mock.invocationCallOrder[0];

    expect(findUniqueCallOrder).toBeLessThan(randomBytesCallOrder);
    expect(randomBytesCallOrder).toBeLessThan(hashCallOrder);
    expect(hashCallOrder).toBeLessThan(createCallOrder);
    expect(createCallOrder).toBeLessThan(mailCallOrder);

    const prismaCreateArg = prismaServiceMock.user.create.mock.calls[0][0];
    expect(prismaCreateArg.data.passwordHash).not.toBe(generatedPassword);

    expect(result).not.toHaveProperty('passwordHash');
    expect(result).toMatchObject({
      id: createdUserRecord.id,
      email: createdUserRecord.email,
      role: createdUserRecord.role,
      did: createdUserRecord.did,
      isActive: createdUserRecord.isActive,
    });
  });

  it('should throw ConflictException', async () => {
    prismaServiceMock.user.findUnique.mockResolvedValue(createdUserRecord);

    await expect(service.create(createUserDto)).rejects.toBeInstanceOf(ConflictException);

    expect(prismaServiceMock.user.create).not.toHaveBeenCalled();
    expect(mockHash).not.toHaveBeenCalled();
    expect(mailServiceMock.sendWelcomeEmail).not.toHaveBeenCalled();
  });

  it('should throw InternalServerErrorException when database creation fails', async () => {
    prismaServiceMock.user.findUnique.mockResolvedValue(null);
    mockRandomBytes.mockReturnValue(generatedPasswordBuffer as never);
    mockHash.mockResolvedValue('hashed_password' as never);
    prismaServiceMock.user.create.mockRejectedValue(new Error('database unavailable'));

    await expect(service.create(createUserDto)).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });

  describe('findAll', () => {
    it('should call findAll', () => {
      const findAllSpy = jest.spyOn(service, 'findAll');

      const result = service.findAll();

      expect(findAllSpy).toHaveBeenCalled();
      expect(result).toBe('This action returns all users');
    });
  });

  describe('findOne', () => {
    it('should call findOne', () => {
      const findOneSpy = jest.spyOn(service, 'findOne');

      const result = service.findOne(1);

      expect(findOneSpy).toHaveBeenCalled();
      expect(result).toBe('This action returns a #1 user');
    });
  });

  describe('update', () => {
    it('should call update', () => {
      const dto: UpdateUserDto = {};
      const updateSpy = jest.spyOn(service, 'update');

      const result = service.update(1, dto);

      expect(updateSpy).toHaveBeenCalled();
      expect(result).toBe('This action updates a #1 user');
    });
  });

  describe('remove', () => {
    it('should call remove', () => {
      const removeSpy = jest.spyOn(service, 'remove');

      const result = service.remove(1);

      expect(removeSpy).toHaveBeenCalled();
      expect(result).toBe('This action removes a #1 user');
    });
  });
});
