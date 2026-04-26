import { Module } from '@nestjs/common';
import { CryptoService } from './crypto.service';

/**
 * Módulo de criptografía del sistema.
 * Proporciona servicios de cifrado y firmas digitales.
 *
 * Proveedoresexportados:
 * - CryptoService: Servicio de criptografía (Ed25519, AES-256-GCM, SHA-256)
 *
 * @Module
 */
@Module({
  providers: [CryptoService],
  exports: [CryptoService],
})
export class CryptoModule {}