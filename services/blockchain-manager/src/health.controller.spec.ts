import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  describe('getHealth', () => {
    it('should return UP status', () => {
      const result = controller.getHealth();
      expect(result.status).toBe('UP');
    });

    it('should return correct service name', () => {
      const result = controller.getHealth();
      expect(result.service).toBe('blockchain-manager');
    });

    it('should return object with both properties', () => {
      const result = controller.getHealth();
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('service');
    });
  });

  describe('optionsHealth', () => {
    it('should return empty string', () => {
      const result = controller.optionsHealth();
      expect(result).toBe('');
    });
  });
});