import { AppService } from './app.service';

describe('AppService', () => {
  let service: AppService;

  beforeEach(() => {
    service = new AppService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getHealth', () => {
    it('should return UP status with audit service name', () => {
      const result = service.getHealth();

      expect(result).toEqual({
        status: 'UP',
        service: 'audit',
      });
    });
  });
});
