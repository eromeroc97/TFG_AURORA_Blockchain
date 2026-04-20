import { UnauthorizedException } from '@nestjs/common';
import { generateKeyPairSync } from 'crypto';
import { RedisService } from '../../redis/redis.service';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  const redisServiceMock = {
    isBlacklisted: jest.fn(),
  } as unknown as RedisService;

  const { publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  const payload = {
    sub: 'user-1',
    email: 'user@test.test',
    role: 'USER',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws when JWT public key is missing', () => {
    delete process.env.JWT_PUBLIC_KEY;

    expect(() => new JwtStrategy(redisServiceMock)).toThrow('JWT_PUBLIC_KEY is not configured');
  });

  it('accepts base64 encoded public key', () => {
    process.env.JWT_PUBLIC_KEY = Buffer.from(publicKey).toString('base64');

    expect(() => new JwtStrategy(redisServiceMock)).not.toThrow();
  });

  it('returns payload when token is not blacklisted', async () => {
    process.env.JWT_PUBLIC_KEY = publicKey;
    redisServiceMock.isBlacklisted = jest.fn().mockResolvedValue(false);

    const strategy = new JwtStrategy(redisServiceMock);

    await expect(strategy.validate(payload)).resolves.toEqual(payload);
    expect(redisServiceMock.isBlacklisted).toHaveBeenCalledWith('user-1');
  });

  it('throws UnauthorizedException when token is blacklisted', async () => {
    process.env.JWT_PUBLIC_KEY = publicKey;
    redisServiceMock.isBlacklisted = jest.fn().mockResolvedValue(true);

    const strategy = new JwtStrategy(redisServiceMock);

    await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
    expect(redisServiceMock.isBlacklisted).toHaveBeenCalledWith('user-1');
  });
});
