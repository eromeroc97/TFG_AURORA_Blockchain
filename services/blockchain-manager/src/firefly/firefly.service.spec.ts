import { FireflyService, FireflyNamespace, FireflyIdentity, FireflyPin } from './firefly.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('FireflyService', () => {
  let service: FireflyService;
  let mockAxiosInstance: {
    get: jest.Mock;
    post: jest.Mock;
  };

  beforeEach(() => {
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
    };
    (mockedAxios.create as jest.Mock).mockReturnValue(mockAxiosInstance);
    service = new FireflyService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getNamespaces', () => {
    it('should return namespaces from API', async () => {
      const mockNamespaces = [{ name: 'default', description: 'Default namespace' }];
      mockAxiosInstance.get.mockResolvedValue({ data: mockNamespaces });

      const result = await service.getNamespaces();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/v1/namespaces');
      expect(result).toEqual(mockNamespaces);
    });

    it('should return empty array when no namespaces', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: [] });

      const result = await service.getNamespaces();

      expect(result).toEqual([]);
    });
  });

  describe('getNetworkNodes', () => {
    it('should fetch nodes for default namespace', async () => {
      const mockNodes = [{ id: 'node-1', name: 'Node 1', type: 'node' }];
      mockAxiosInstance.get.mockResolvedValue({ data: mockNodes });

      const result = await service.getNetworkNodes();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/v1/namespaces/default/network/nodes');
      expect(result).toEqual(mockNodes);
    });

    it('should fetch nodes for custom namespace', async () => {
      const mockNodes = [{ id: 'node-2', name: 'Node 2', type: 'node' }];
      mockAxiosInstance.get.mockResolvedValue({ data: mockNodes });

      const result = await service.getNetworkNodes('custom-ns');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/v1/namespaces/custom-ns/network/nodes');
      expect(result).toEqual(mockNodes);
    });
  });

  describe('getOrganizations', () => {
    it('should fetch organizations for default namespace', async () => {
      const mockOrgs = [{ id: 'org-1', name: 'Org 1', type: 'org' }];
      mockAxiosInstance.get.mockResolvedValue({ data: mockOrgs });

      const result = await service.getOrganizations();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/v1/namespaces/default/network/organizations');
      expect(result).toEqual(mockOrgs);
    });

    it('should fetch organizations for custom namespace', async () => {
      const mockOrgs = [{ id: 'org-2', name: 'Org 2', type: 'org' }];
      mockAxiosInstance.get.mockResolvedValue({ data: mockOrgs });

      const result = await service.getOrganizations('custom-ns');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/v1/namespaces/custom-ns/network/organizations');
      expect(result).toEqual(mockOrgs);
    });
  });

  describe('getIdentities', () => {
    it('should fetch identities', async () => {
      const mockIdentities = [{ id: 'id-1', name: 'Identity 1' }];
      mockAxiosInstance.get.mockResolvedValue({ data: mockIdentities });

      const result = await service.getIdentities();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/v1/namespaces/default/identities');
      expect(result).toEqual(mockIdentities);
    });
  });

  describe('getPins', () => {
    it('should fetch pins with default options', async () => {
      const mockPins = [{ hash: 'abc123', sequence: 1 }];
      mockAxiosInstance.get.mockResolvedValue({ data: mockPins });

      const result = await service.getPins();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/api/v1/namespaces/default/pins?sort=-sequence'
      );
      expect(result).toEqual(mockPins);
    });

    it('should fetch pins with custom limit', async () => {
      const mockPins = [{ hash: 'abc123', sequence: 1 }];
      mockAxiosInstance.get.mockResolvedValue({ data: mockPins });

      await service.getPins('default', { limit: 20 });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/api/v1/namespaces/default/pins?limit=20&sort=-sequence'
      );
    });

    it('should fetch pins with custom skip', async () => {
      const mockPins = [{ hash: 'abc123', sequence: 1 }];
      mockAxiosInstance.get.mockResolvedValue({ data: mockPins });

      await service.getPins('default', { skip: 50 });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/api/v1/namespaces/default/pins?skip=50&sort=-sequence'
      );
    });

    it('should fetch pins with custom namespace', async () => {
      const mockPins = [{ hash: 'xyz789', sequence: 5 }];
      mockAxiosInstance.get.mockResolvedValue({ data: mockPins });

      await service.getPins('custom-ns');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/api/v1/namespaces/custom-ns/pins?sort=-sequence'
      );
    });
  });

  describe('getBlockchainEvents', () => {
    it('should fetch events with default options', async () => {
      const mockEvents = [{ id: 'event-1', name: 'Event 1' }];
      mockAxiosInstance.get.mockResolvedValue({ data: mockEvents });

      const result = await service.getBlockchainEvents();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/api/v1/namespaces/default/blockchainevents?sort=-timestamp'
      );
      expect(result).toEqual(mockEvents);
    });

    it('should fetch events without limit param when not provided', async () => {
      const mockEvents = [{ id: 'event-1' }];
      mockAxiosInstance.get.mockResolvedValue({ data: mockEvents });

      await service.getBlockchainEvents('default', { skip: 10 });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/api/v1/namespaces/default/blockchainevents?sort=-timestamp&skip=10'
      );
    });

    it('should fetch events with custom namespace', async () => {
      const mockEvents = [{ id: 'event-2' }];
      mockAxiosInstance.get.mockResolvedValue({ data: mockEvents });

      await service.getBlockchainEvents('custom-ns');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/api/v1/namespaces/custom-ns/blockchainevents?sort=-timestamp'
      );
    });
  });

  describe('getContracts', () => {
    it('should fetch contracts', async () => {
      const mockContracts = [{ id: 'contract-1', name: 'Contract 1' }];
      mockAxiosInstance.get.mockResolvedValue({ data: mockContracts });

      const result = await service.getContracts();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/v1/apis');
      expect(result).toEqual(mockContracts);
    });
  });

  describe('getStatus', () => {
    it('should fetch status for default namespace', async () => {
      const mockStatus = { status: 'ok' };
      mockAxiosInstance.get.mockResolvedValue({ data: mockStatus });

      const result = await service.getStatus();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/v1/namespaces/default/status');
      expect(result).toEqual(mockStatus);
    });

    it('should fetch status for custom namespace', async () => {
      const mockStatus = { status: 'ok' };
      mockAxiosInstance.get.mockResolvedValue({ data: mockStatus });

      await service.getStatus('custom-ns');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/v1/namespaces/custom-ns/status');
    });
  });

  describe('getNetworkChannels', () => {
    it('should return empty items array', async () => {
      const result = await service.getNetworkChannels();

      expect(result).toEqual({ items: [] });
      expect(mockAxiosInstance.get).not.toHaveBeenCalled();
    });

    it('should return empty items for any namespace', async () => {
      const result = await service.getNetworkChannels('any-namespace');

      expect(result).toEqual({ items: [] });
    });
  });

  describe('registerContractInterface', () => {
    it('should post ffi to correct endpoint', async () => {
      const ffi = { name: 'TestFFI', namespace: 'default' };
      mockAxiosInstance.post.mockResolvedValue({ data: { id: 'ffi-123' } });

      const result = await service.registerContractInterface('default', ffi);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/v1/namespaces/default/contracts/interfaces',
        ffi
      );
      expect(result).toEqual({ id: 'ffi-123' });
    });

    it('should post ffi to custom namespace', async () => {
      const ffi = { name: 'TestFFI' };
      mockAxiosInstance.post.mockResolvedValue({ data: { id: 'ffi-456' } });

      await service.registerContractInterface('custom-ns', ffi);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/v1/namespaces/custom-ns/contracts/interfaces',
        ffi
      );
    });
  });

  describe('registerApi', () => {
    it('should post api data to correct endpoint', async () => {
      const apiData = { name: 'TestAPI', interface: { id: 'ffi-123' } };
      mockAxiosInstance.post.mockResolvedValue({ data: { id: 'api-123' } });

      const result = await service.registerApi('default', apiData);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/v1/namespaces/default/apis',
        apiData
      );
      expect(result).toEqual({ id: 'api-123' });
    });
  });

  describe('registerEventListener', () => {
    it('should post listener data to correct endpoint', async () => {
      const listenerData = { name: 'TestListener', topic: 'test-topic' };
      mockAxiosInstance.post.mockResolvedValue({ data: { id: 'listener-123' } });

      const result = await service.registerEventListener('default', listenerData);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/v1/namespaces/default/contracts/listeners',
        listenerData
      );
      expect(result).toEqual({ id: 'listener-123' });
    });
  });

  describe('getContractInterface', () => {
    it('should fetch contract interface swagger', async () => {
      const mockSwagger = { swagger: '2.0', info: { title: 'Test API' } };
      mockAxiosInstance.get.mockResolvedValue({ data: mockSwagger });

      const result = await service.getContractInterface('my-api');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/api/v1/namespaces/default/apis/my-api/api/swagger.json'
      );
      expect(result).toEqual(mockSwagger);
    });

    it('should fetch contract interface from custom namespace', async () => {
      const mockSwagger = { swagger: '2.0' };
      mockAxiosInstance.get.mockResolvedValue({ data: mockSwagger });

      await service.getContractInterface('my-api', 'custom-ns');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/api/v1/namespaces/custom-ns/apis/my-api/api/swagger.json'
      );
    });
  });
});

describe('normalizeFireflyApiUrl', () => {
  let service: FireflyService;
  let mockAxiosInstance: { create: jest.Mock };
  let createMock: jest.Mock;

  beforeEach(() => {
    createMock = jest.fn();
    (mockedAxios.create as jest.Mock) = createMock;
  });

  it('should remove trailing slash', () => {
    createMock.mockReturnValue({
      get: jest.fn(),
      post: jest.fn(),
    });
    process.env.FIREFLY_API_URL = 'http://localhost:5000/';
    service = new FireflyService();
    expect(createMock).toHaveBeenCalled();
    const config = createMock.mock.calls[0][0];
    expect(config.baseURL).toBe('http://localhost:5000');
  });

  it('should remove /api/v1 suffix', () => {
    createMock.mockReturnValue({
      get: jest.fn(),
      post: jest.fn(),
    });
    process.env.FIREFLY_API_URL = 'http://localhost:5000/api/v1';
    service = new FireflyService();
    const config = createMock.mock.calls[0][0];
    expect(config.baseURL).toBe('http://localhost:5000');
  });

  it('should use default URL when not set', () => {
    createMock.mockReturnValue({
      get: jest.fn(),
      post: jest.fn(),
    });
    delete process.env.FIREFLY_API_URL;
    service = new FireflyService();
    const config = createMock.mock.calls[0][0];
    expect(config.baseURL).toBe('http://firefly:5000');
  });

  it('should include API key in headers when provided', () => {
    createMock.mockReturnValue({
      get: jest.fn(),
      post: jest.fn(),
    });
    process.env.FIREFLY_API_URL = 'http://localhost:5000';
    process.env.FIREFLY_API_KEY = 'test-api-key';
    service = new FireflyService();
    const config = createMock.mock.calls[0][0];
    expect(config.headers['x-api-key']).toBe('test-api-key');
  });

  it('should not include API key header when not provided', () => {
    createMock.mockReturnValue({
      get: jest.fn(),
      post: jest.fn(),
    });
    process.env.FIREFLY_API_URL = 'http://localhost:5000';
    delete process.env.FIREFLY_API_KEY;
    service = new FireflyService();
    const config = createMock.mock.calls[0][0];
    expect(config.headers['x-api-key']).toBeUndefined();
  });

  it('should set timeout to 60000ms', () => {
    createMock.mockReturnValue({
      get: jest.fn(),
      post: jest.fn(),
    });
    delete process.env.FIREFLY_API_URL;
    delete process.env.FIREFLY_API_KEY;
    service = new FireflyService();
    const config = createMock.mock.calls[0][0];
    expect(config.timeout).toBe(60000);
  });
});