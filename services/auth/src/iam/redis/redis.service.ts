import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';

/**
 * Servicio de caché Redis.
 * Maneja blacklist de tokens y sesiones.
 *
 * Propósito de seguridad:
 * - Almacena tokens revocados
 * - Gestiona sesiones activas
 */
@Injectable()
export class RedisService {
	private readonly redis: Redis;

	/**
	 * @throws Error si Redis no está disponible
	 */
	constructor() {
		this.redis = new Redis({
			host: process.env.REDIS_HOST ?? 'redis',
			port: +(process.env.REDIS_PORT ?? 6379),
		});
	}

	/**
	 * Genera la clave de blacklist para un usuario.
	 *
	 * @param userId - ID del usuario
	 * @returns Clave formateada
	 */
	private getBlacklistKey(userId: string): string {
		return `blacklist:user:${userId}`;
	}

	/**
	 * Añade un token a la blacklist.
	 *
	 * @param userId - ID del usuario
	 * @param ttlSeconds - Tiempo de vida en segundos
	 */
	async addToBlacklist(userId: string, ttlSeconds: number): Promise<void> {
		await this.redis.set(this.getBlacklistKey(userId), 'revoked', 'EX', ttlSeconds);
	}

	/**
	 * Verifica si un token está en blacklist.
	 *
	 * @param userId - ID del usuario
	 * @returns Promise con true si está en blacklist
	 */
	async isBlacklisted(userId: string): Promise<boolean> {
		const exists = await this.redis.exists(this.getBlacklistKey(userId));
		return exists === 1;
	}
}
