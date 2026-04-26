import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Módulo global de base de datos Prisma.
 * Disponibile en toda la aplicación sin necesidad de importarlo explícitamente.
 *
 * Proveedoresexportados:
 * - PrismaService: Cliente de base de datos
 *
 * @Module
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
