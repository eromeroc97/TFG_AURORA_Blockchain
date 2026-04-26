import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

/**
 * Servicio de acceso a la base de datos via Prisma ORM.
 * Proporciona cliente de Prisma con conexión a PostgreSQL.
 *
 * @throws Error si DATABASE_URL no está definida
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  /**
   * @throws Error si DATABASE_URL no está definida
   */
  constructor() {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error('DATABASE_URL is not defined in environment variables.');
    }

    const adapter = new PrismaPg({ connectionString: databaseUrl });

    super({ adapter });
  }

  /**
   * Conecta a la base de datos al iniciar el módulo.
   */
  async onModuleInit() {
    await this.$connect();
  }
}
