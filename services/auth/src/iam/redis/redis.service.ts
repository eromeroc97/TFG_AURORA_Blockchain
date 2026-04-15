import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService {
	private readonly redis: Redis;

	constructor() {
		this.redis = new Redis({
			host: process.env.REDIS_HOST ?? 'redis',
			port: +(process.env.REDIS_PORT ?? 6379),
		});
	}

	private getBlacklistKey(userId: string): string {
		return `blacklist:user:${userId}`;
	}

	async addToBlacklist(userId: string, ttlSeconds: number): Promise<void> {
		await this.redis.set(this.getBlacklistKey(userId), 'revoked', 'EX', ttlSeconds);
	}

	async isBlacklisted(userId: string): Promise<boolean> {
		const exists = await this.redis.exists(this.getBlacklistKey(userId));
		return exists === 1;
	}
}
