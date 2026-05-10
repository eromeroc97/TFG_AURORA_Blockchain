import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { AuthModule } from './auth/auth.module';
import { BlockchainController } from './blockchain/blockchain.controller';
import { AuthModule as AuthModuleRef } from './auth/auth.module';
import { BlockchainModule } from './blockchain/blockchain.module';
import { JwtStrategy } from './auth/jwt.strategy';
import { PassportModule } from '@nestjs/passport';

jest.mock('./auth/jwt-key.util', () => ({
  getJwtPublicKey: jest.fn(() => 'mock-public-key'),
}));

describe('AppModule', () => {
  let module: TestingModule;

  it('should compile the module', async () => {
    module = await Test.createTestingModule({
      imports: [
        PassportModule,
        AuthModuleRef,
        BlockchainModule,
      ],
      controllers: [HealthController],
      providers: [JwtStrategy],
    }).compile();

    expect(module).toBeDefined();
  });

  it('should have HealthController', () => {
    const controller = module.get(HealthController);
    expect(controller).toBeDefined();
  });

  it('should have BlockchainController', () => {
    const controller = module.get(BlockchainController);
    expect(controller).toBeDefined();
  });

  it('should have JwtStrategy', () => {
    const strategy = module.get(JwtStrategy);
    expect(strategy).toBeDefined();
  });
});