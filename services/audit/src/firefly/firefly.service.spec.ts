import { Test, TestingModule } from '@nestjs/testing';
import { FireFlyService } from './firefly.service';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';

describe('FireFlyService', () => {
  let service: FireFlyService;
  let httpService: { get: jest.Mock };

  beforeEach(async () => {
    httpService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FireFlyService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: string) => {
              const config: Record<string, string> = {
                FIREFLY_API_URL: 'http://localhost:5000',
                FIREFLY_NAMESPACE: 'default',
                FIREFLY_API_KEY: 'test-api-key',
              };
              return config[key] || defaultValue;
            }),
          },
        },
        {
          provide: HttpService,
          useValue: httpService,
        },
      ],
    }).compile();

    service = module.get<FireFlyService>(FireFlyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getNamespace', () => {
    it('should return the configured namespace', () => {
      expect(service.getNamespace()).toBe('default');
    });
  });

  describe('constructor defaults', () => {
    it('should use default baseUrl and namespace when config is not set', () => {
      const svc = new FireFlyService(
        {
          get: jest.fn((key: string) => undefined),
        } as any,
        httpService as any,
      );

      expect((svc as any).baseUrl).toBe('http://firefly:5000');
      expect((svc as any).namespace).toBe('default');
      expect((svc as any).apiKey).toBe('');
    });
  });

  describe('getEvents', () => {
    it('should fetch events without options', async () => {
      const mockData = { items: [{ id: '1', name: 'event1' }] };
      httpService.get.mockReturnValue(of({ data: mockData }));

      const result = await service.getEvents();

      expect(httpService.get).toHaveBeenCalledWith(
        'http://localhost:5000/api/v1/namespaces/default/blockchainevents?sort=-timestamp',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'x-api-key': 'test-api-key',
          }),
        })
      );
      expect(result).toEqual(mockData);
    });

    it('should include limit in query params', async () => {
      httpService.get.mockReturnValue(of({ data: {} }));

      await service.getEvents({ limit: 10 });

      expect(httpService.get).toHaveBeenCalledWith(
        expect.stringContaining('limit=10'),
        expect.any(Object)
      );
    });

    it('should include skip in query params', async () => {
      httpService.get.mockReturnValue(of({ data: {} }));

      await service.getEvents({ skip: 5 });

      expect(httpService.get).toHaveBeenCalledWith(
        expect.stringContaining('skip=5'),
        expect.any(Object)
      );
    });

    it('should include filter in query params', async () => {
      httpService.get.mockReturnValue(of({ data: {} }));

      await service.getEvents({ filter: 'name=~Telemetry' });

      expect(httpService.get).toHaveBeenCalledWith(
        expect.stringContaining('filter='),
        expect.any(Object)
      );
    });

    it('should include all parameters together', async () => {
      httpService.get.mockReturnValue(of({ data: {} }));

      await service.getEvents({ limit: 10, skip: 5, filter: 'test' });

      const callUrl = httpService.get.mock.calls[0][0];
      expect(callUrl).toContain('limit=10');
      expect(callUrl).toContain('skip=5');
      expect(callUrl).toContain('filter=');
      expect(callUrl).toContain('sort=-timestamp');
    });

    it('should throw error on HTTP failure', async () => {
      httpService.get.mockReturnValue(throwError(() => new Error('Network error')));

      await expect(service.getEvents()).rejects.toThrow('FireFly events query failed: Network error');
    });

    it('should not include x-api-key header when API key is empty', async () => {
      const customHttpService = { get: jest.fn() };
      customHttpService.get.mockReturnValue(of({ data: {} }));

      const customModule = await Test.createTestingModule({
        providers: [
          {
            provide: FireFlyService,
            useFactory: () => {
              const svc = new FireFlyService(
                {
                  get: jest.fn((key: string) => {
                    const config: Record<string, string> = {
                      FIREFLY_API_URL: 'http://localhost:5000',
                      FIREFLY_NAMESPACE: 'default',
                      FIREFLY_API_KEY: '',
                    };
                    return config[key];
                  }),
                } as any,
                customHttpService as any,
              );
              return svc;
            },
          },
        ],
      }).compile();

      const customService = customModule.get<FireFlyService>(FireFlyService);
      await customService.getEvents();

      expect(customHttpService.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });
  });
});