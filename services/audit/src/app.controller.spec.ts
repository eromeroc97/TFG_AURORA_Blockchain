import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let controller: AppController;
  let appService: { getHealth: jest.Mock };

  beforeEach(async () => {
    appService = {
      getHealth: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: appService,
        },
      ],
    }).compile();

    controller = module.get<AppController>(AppController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getHealth', () => {
    it('should return health status', () => {
      appService.getHealth.mockReturnValue({ status: 'UP', service: 'audit' });

      const result = controller.getHealth();

      expect(appService.getHealth).toHaveBeenCalled();
      expect(result).toEqual({ status: 'UP', service: 'audit' });
    });
  });
});
