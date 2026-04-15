import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Role } from '@prisma/client';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { ApproveUserDto } from './dto/approve-user.dto';
import { ChangeRoleDto } from './dto/change-role.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: {
    create: ReturnType<typeof jest.fn>;
    findAll: ReturnType<typeof jest.fn>;
    findOne: ReturnType<typeof jest.fn>;
    update: ReturnType<typeof jest.fn>;
    changeRole: ReturnType<typeof jest.fn>;
    approveUser: ReturnType<typeof jest.fn>;
    remove: ReturnType<typeof jest.fn>;
  };

  const usersServiceMock = {
    create: jest.fn(),
    findAll: jest.fn(() => []),
    findOne: jest.fn((id: string) => ({ id })),
    update: jest.fn((id: string, dto: UpdateUserDto) => ({ id, ...dto })),
    changeRole: jest.fn((id: string, newRole: Role) => ({ id, role: newRole })),
    approveUser: jest.fn((id: string) => ({ id, status: 'ACTIVE' })),
    remove: jest.fn((id: string, requesterId: string, requesterRole?: Role) => ({
      id,
      requesterId,
      requesterRole,
    })),
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
      controller.findOne('11111111-1111-1111-1111-111111111111');

      expect(usersService.findOne).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should call UsersService.update', () => {
      const dto: UpdateUserDto = {};

      controller.update('11111111-1111-1111-1111-111111111111', dto);

      expect(usersService.update).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should call UsersService.remove with self requester by default', () => {
      controller.remove('11111111-1111-1111-1111-111111111111');

      expect(usersService.remove).toHaveBeenCalledWith(
        '11111111-1111-1111-1111-111111111111',
        '11111111-1111-1111-1111-111111111111',
        undefined,
      );
    });
  });

  describe('changeRole', () => {
    it('should call UsersService.changeRole', () => {
      const dto: ChangeRoleDto = { newRole: Role.ADMIN };

      controller.changeRole('11111111-1111-1111-1111-111111111111', dto);

      expect(usersService.changeRole).toHaveBeenCalledWith(
        '11111111-1111-1111-1111-111111111111',
        Role.ADMIN,
      );
    });
  });

  describe('approveUser', () => {
    it('should call UsersService.approveUser', () => {
      const dto: ApproveUserDto = { adminDid: 'did:firefly:custom/admin@aurora.local' };

      controller.approveUser('11111111-1111-1111-1111-111111111111', dto);

      expect(usersService.approveUser).toHaveBeenCalledWith(
        '11111111-1111-1111-1111-111111111111',
        'did:firefly:custom/admin@aurora.local',
      );
    });
  });
});
