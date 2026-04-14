import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: {
    create: ReturnType<typeof jest.fn>;
    findAll: ReturnType<typeof jest.fn>;
    findOne: ReturnType<typeof jest.fn>;
    update: ReturnType<typeof jest.fn>;
    remove: ReturnType<typeof jest.fn>;
  };

  const usersServiceMock = {
    create: jest.fn(),
    findAll: jest.fn(() => []),
    findOne: jest.fn((id: number) => ({ id })),
    update: jest.fn((id: number, dto: UpdateUserDto) => ({ id, ...dto })),
    remove: jest.fn((id: number) => ({ id })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: usersServiceMock,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get(UsersService) as unknown as typeof usersService;
    jest.clearAllMocks();
  });

  it('create should call UsersService.create with dto and return service response', async () => {
    const dto: CreateUserDto = {
      email: 'owner@aurora.local',
    };

    const serviceResponse = {
      id: '2f1c4f9a-3c5f-4a26-8a7b-2df34d00f6e8',
      email: dto.email,
      role: 'USER',
      did: null,
      isActive: false,
    };

    usersService.create.mockResolvedValue(serviceResponse);

    const result = await controller.create(dto);

    expect(usersService.create).toHaveBeenCalledWith(dto);
    expect(usersService.create).toHaveBeenCalledTimes(1);
    expect(result).toEqual(serviceResponse);
  });

  describe('findAll', () => {
    it('should call UsersService.findAll', () => {
      controller.findAll();

      expect(usersService.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should call UsersService.findOne', () => {
      controller.findOne('1');

      expect(usersService.findOne).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should call UsersService.update', () => {
      const dto: UpdateUserDto = {};

      controller.update('1', dto);

      expect(usersService.update).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should call UsersService.remove', () => {
      controller.remove('1');

      expect(usersService.remove).toHaveBeenCalled();
    });
  });
});
