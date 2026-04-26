import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

/**
 * Servicio de base de datos Prisma.
 * Extiende PrismaClient para integración con NestJS.
 *
 * Propósito de seguridad:
 * - Gestiona la conexión a la base de datos PostgreSQL
 * - Proporciona типобезопасный acceso a los datos
 *
 * @Injectable() - Proveído a nivel de módulo
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
	constructor() {
		const databaseUrl = process.env.DATABASE_URL;

		if (!databaseUrl) {
			throw new Error('DATABASE_URL is not defined in environment variables.');
		}

		const adapter = new PrismaPg({ connectionString: databaseUrl });

		super({ adapter });
	}

	/**
	 * Se ejecuta al inicial el módulo.
	 * Establece la conexión a la base de datos.
	 *
	 * @async
	 */
	async onModuleInit() {
		await this.$connect();
	}
}
