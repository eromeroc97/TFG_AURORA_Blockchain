import { Test, TestingModule } from '@nestjs/testing';
import Redis from 'ioredis';
import { RedisService } from './redis.service';

jest.mock('ioredis', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      set: jest.fn(),
      exists: jest.fn().mockResolvedValue(0),
    })),
  };
});

describe('RedisService', () => {
  let service: RedisService;

  beforeEach(async () => {
    jest.clearAllMocks();
    delete process.env.REDIS_HOST;
    delete process.env.REDIS_PORT;

    const module: TestingModule = await Test.createTestingModule({
      providers: [RedisService],
    }).compile();

    service = module.get<RedisService>(RedisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('uses default redis host and port when env is missing', () => {
    const RedisMock = Redis as unknown as jest.Mock;
    expect(RedisMock).toHaveBeenCalledWith({ host: 'redis', port: 6379 });
  });

  it('uses redis host and port from env when configured', async () => {
    process.env.REDIS_HOST = 'localhost';
    process.env.REDIS_PORT = '6380';

    const module: TestingModule = await Test.createTestingModule({
      providers: [RedisService],
    }).compile();

    module.get<RedisService>(RedisService);

    const RedisMock = Redis as unknown as jest.Mock;
    expect(RedisMock).toHaveBeenLastCalledWith({ host: 'localhost', port: 6380 });
  });

  it('addToBlacklist stores a revoked marker with ttl', async () => {
    const RedisMock = Redis as unknown as jest.Mock;
    const redisClient = RedisMock.mock.results[0].value;

    await service.addToBlacklist('user-1', 300);

    expect(redisClient.set).toHaveBeenCalledWith('blacklist:user:user-1', 'revoked', 'EX', 300);
  });

  it('isBlacklisted returns true when key exists', async () => {
    const RedisMock = Redis as unknown as jest.Mock;
    const redisClient = RedisMock.mock.results[0].value;
    redisClient.exists.mockResolvedValueOnce(1);

    await expect(service.isBlacklisted('user-2')).resolves.toBe(true);
    expect(redisClient.exists).toHaveBeenCalledWith('blacklist:user:user-2');
  });

  it('isBlacklisted returns false when key does not exist', async () => {
    const RedisMock = Redis as unknown as jest.Mock;
    const redisClient = RedisMock.mock.results[0].value;
    redisClient.exists.mockResolvedValueOnce(0);

    await expect(service.isBlacklisted('user-3')).resolves.toBe(false);
    expect(redisClient.exists).toHaveBeenCalledWith('blacklist:user:user-3');
  });
});
