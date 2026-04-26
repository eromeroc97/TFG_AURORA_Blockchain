import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { FireflyService } from './firefly.service';

/**
 * Módulo de integración con blockchain (FireFly).
 * Importa HttpModule para llamadas HTTP a la API de FireFly.
 *
 * Proveedoresexportados:
 * - FireflyService: Servicio de blockchain
 * - HttpModule: Módulo HTTP de Axios
 *
 * @Module
 */
@Module({
  imports: [
    HttpModule.registerAsync({
      useFactory: () => ({
        timeout: 30000,
      }),
    }),
  ],
  providers: [FireflyService],
  exports: [FireflyService, HttpModule],
})
export class BlockchainModule {}