import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';

/**
 * Servicio Redis para gestión de blacklist de sesiones.
 * Almacena tokens revocados para invalidar sesiones cerradas.
 *
 * @Injectable() - Proveído a nivel de módulo
 */
@Injectable()
export class RedisService {
	private readonly redis: Redis;

	constructor() {
		this.redis = new Redis({
			host: process.env.REDIS_HOST ?? 'redis',
			port: +(process.env.REDIS_PORT ?? 6379),
		});
	}

	/**
	 * Genera la key de blacklist para un usuario.
	 *
	 * @param userId - ID del usuario
	 * @returns La clave de Redis
	 */
	private getBlacklistKey(userId: string): string {
		return `blacklist:user:${userId}`;
	}

	/**
	 * Añade un usuario a la blacklist.
	 *
	 * @param userId - ID del usuario
	 * @param ttlSeconds - Tiempo de vida en segundos
	 * @returns Promise<void>
	 * @async
	 */
	async addToBlacklist(userId: string, ttlSeconds: number): Promise<void> {
		await this.redis.set(this.getBlacklistKey(userId), 'revoked', 'EX', ttlSeconds);
	}

	/**
	 * Verifica si un usuario está en la blacklist.
	 *
	 * @param userId - ID del usuario
	 * @returns true si está en blacklist
	 * @async
	 */
	async isBlacklisted(userId: string): Promise<boolean> {
		const exists = await this.redis.exists(this.getBlacklistKey(userId));
		return exists === 1;
	}
}
