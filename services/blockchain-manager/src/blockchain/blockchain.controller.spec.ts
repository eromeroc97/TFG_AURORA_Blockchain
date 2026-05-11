import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { BlockchainController } from './blockchain.controller';
import { FireflyService, FireflyNamespace, FireflyIdentity, FireflyPin } from '../firefly/firefly.service';
import { normalizeListResponse } from './blockchain.controller';

describe('BlockchainController', () => {
  let controller: BlockchainController;
  let mockFireflyService: {
    getNetworkNodes: jest.Mock;
    getOrganizations: jest.Mock;
    getNamespaces: jest.Mock;
    getPins: jest.Mock;
    getBlockchainEvents: jest.Mock;
    getContracts: jest.Mock;
    getNetworkChannels: jest.Mock;
    registerContractInterface: jest.Mock;
    registerApi: jest.Mock;
    registerEventListener: jest.Mock;
    getContractInterface: jest.Mock;
    deleteContractApi: jest.Mock;
    getContractListenersByLocation: jest.Mock;
    deleteContractListener: jest.Mock;
  };

  beforeEach(async () => {
    mockFireflyService = {
      getNetworkNodes: jest.fn(),
      getOrganizations: jest.fn(),
      getNamespaces: jest.fn(),
      getPins: jest.fn(),
      getBlockchainEvents: jest.fn(),
      getContracts: jest.fn(),
      getNetworkChannels: jest.fn(),
      registerContractInterface: jest.fn(),
      registerApi: jest.fn(),
      registerEventListener: jest.fn(),
      getContractInterface: jest.fn(),
      deleteContractApi: jest.fn(),
      getContractListenersByLocation: jest.fn(),
      deleteContractListener: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BlockchainController],
      providers: [
        {
          provide: FireflyService,
          useValue: mockFireflyService,
        },
      ],
    }).compile();

    controller = module.get<BlockchainController>(BlockchainController);
  });

  describe('normalizeListResponse', () => {
    it('should return array as-is when response is array', () => {
      const input = [{ id: '1' }, { id: '2' }];
      const result = normalizeListResponse<{ id: string }>(input);
      expect(result).toEqual(input);
    });

    it('should extract items from object with items property', () => {
      const input = { items: [{ id: '1' }, { id: '2' }] };
      const result = normalizeListResponse<{ id: string }>(input);
      expect(result).toEqual([{ id: '1' }, { id: '2' }]);
    });

    it('should extract data from object with data property', () => {
      const input = { data: [{ id: '1' }, { id: '2' }] };
      const result = normalizeListResponse<{ id: string }>(input);
      expect(result).toEqual([{ id: '1' }, { id: '2' }]);
    });

    it('should return empty array for null', () => {
      const result = normalizeListResponse<{ id: string }>(null);
      expect(result).toEqual([]);
    });

    it('should return empty array for undefined', () => {
      const result = normalizeListResponse<{ id: string }>(undefined);
      expect(result).toEqual([]);
    });

    it('should return empty array for object without items or data', () => {
      const result = normalizeListResponse<{ id: string }>({ foo: 'bar' });
      expect(result).toEqual([]);
    });

    it('should return empty array for object with empty items', () => {
      const result = normalizeListResponse<{ id: string }>({ items: [] });
      expect(result).toEqual([]);
    });
  });

  describe('getNamespaceChannels', () => {
    it('should return network channels', async () => {
      const mockResponse = { items: [{ name: 'channel-1' }] };
      mockFireflyService.getNetworkChannels.mockResolvedValue(mockResponse);

      const result = await controller.getNamespaceChannels('default');

      expect(mockFireflyService.getNetworkChannels).toHaveBeenCalledWith('default');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getNetworkNodes', () => {
    it('should return filtered nodes for default namespace', async () => {
      const mockIdentities = [
        { id: 'node-1', name: 'Node 1', type: 'node', did: 'did:node1' },
        { id: 'org-1', name: 'Org 1', type: 'org' },
      ];
      mockFireflyService.getNetworkNodes.mockResolvedValue(mockIdentities);

      const result = await controller.getNetworkNodes();

      expect(mockFireflyService.getNetworkNodes).toHaveBeenCalledWith('default');
      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('node-1');
      expect(result.items[0].type).toBe('node');
    });

    it('should return filtered nodes for custom namespace', async () => {
      const mockIdentities = [
        { id: 'node-2', name: 'Node 2', type: 'node' },
      ];
      mockFireflyService.getNetworkNodes.mockResolvedValue(mockIdentities);

      const result = await controller.getNetworkNodes('custom-ns');

      expect(mockFireflyService.getNetworkNodes).toHaveBeenCalledWith('custom-ns');
      expect(result.items).toHaveLength(1);
    });

    it('should handle nodes with missing optional fields', async () => {
      const mockIdentities = [
        { id: 'node-1', name: 'Node 1', type: 'node' },
      ];
      mockFireflyService.getNetworkNodes.mockResolvedValue(mockIdentities);

      const result = await controller.getNetworkNodes();

      expect(result.items[0].did).toBeUndefined();
    });
  });

  describe('getOrganizations', () => {
    it('should return filtered organizations', async () => {
      const mockIdentities = [
        { id: 'org-1', name: 'Organization 1', type: 'org', description: 'Org Desc' },
        { id: 'node-1', name: 'Node 1', type: 'node' },
      ];
      mockFireflyService.getOrganizations.mockResolvedValue(mockIdentities);

      const result = await controller.getOrganizations();

      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('org-1');
      expect(result.items[0].description).toBe('Org Desc');
    });
  });

  describe('getNamespaces', () => {
    it('should return normalized namespaces', async () => {
      const mockNamespaces = [
        { name: 'default', description: 'Default namespace', created: '2024-01-01' },
        { name: 'custom', description: 'Custom namespace' },
      ];
      mockFireflyService.getNamespaces.mockResolvedValue(mockNamespaces);

      const result = await controller.getNamespaces();

      expect(result.items).toHaveLength(2);
      expect(result.items[0].name).toBe('default');
      expect(result.items[0].description).toBe('Default namespace');
    });
  });

  describe('getBlocks', () => {
    it('should return formatted blocks', async () => {
      const mockPins = [
        { hash: 'abc123', sequence: 1, created: '2024-01-01T00:00:00Z', parent: 'parent-hash' },
        { hash: 'def456', sequence: 2, created: '2024-01-02T00:00:00Z', parent: 'abc123' },
      ];
      mockFireflyService.getPins.mockResolvedValue(mockPins);

      const result = await controller.getBlocks();

      expect(result).toHaveLength(2);
      expect(result[0].blockNumber).toBe(1);
      expect(result[0].blockHash).toBe('abc123');
      expect(result[0].previousBlockHash).toBe('parent-hash');
      expect(result[0].transactionCount).toBe(0);
    });

    it('should apply limit and skip params', async () => {
      const mockPins = [{ hash: 'abc123', sequence: 1 }];
      mockFireflyService.getPins.mockResolvedValue(mockPins);

      await controller.getBlocks('default', '5', '10');

      expect(mockFireflyService.getPins).toHaveBeenCalledWith('default', {
        limit: 5,
        skip: 10,
      });
    });

    it('should handle pins with missing sequence', async () => {
      const mockPins = [{ hash: 'abc123' }];
      mockFireflyService.getPins.mockResolvedValue(mockPins);

      const result = await controller.getBlocks();

      expect(result[0].blockNumber).toBe(0);
    });

    it('should handle pins with missing hash', async () => {
      const mockPins = [{ sequence: 1 }];
      mockFireflyService.getPins.mockResolvedValue(mockPins);

      const result = await controller.getBlocks();

      expect(result[0].blockHash).toBe('');
    });
  });

  describe('getEvents', () => {
    it('should return normalized events', async () => {
      const mockEvents = { items: [{ id: 'event-1', name: 'Event 1' }] };
      mockFireflyService.getBlockchainEvents.mockResolvedValue(mockEvents);

      const result = await controller.getEvents('default', undefined, '0');

      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('event-1');
    });

    it('should handle direct array response', async () => {
      const mockEvents = [{ id: 'event-1' }, { id: 'event-2' }];
      mockFireflyService.getBlockchainEvents.mockResolvedValue(mockEvents);

      const result = await controller.getEvents('default', undefined, '0');

      expect(result.items).toHaveLength(2);
    });

    it('should apply limit and skip params', async () => {
      mockFireflyService.getBlockchainEvents.mockResolvedValue({ items: [] });

      await controller.getEvents('default', '20', '5');

      expect(mockFireflyService.getBlockchainEvents).toHaveBeenCalledWith('default', {
        limit: 20,
        skip: 5,
      });
    });

    it('should handle undefined limit', async () => {
      mockFireflyService.getBlockchainEvents.mockResolvedValue({ items: [] });

      await controller.getEvents('default', undefined, '0');

      expect(mockFireflyService.getBlockchainEvents).toHaveBeenCalledWith('default', {
        limit: undefined,
        skip: 0,
      });
    });
  });

  describe('getContracts', () => {
    it('should return contracts from service', async () => {
      const mockContracts = [{ id: 'contract-1', name: 'Contract 1' }];
      mockFireflyService.getContracts.mockResolvedValue(mockContracts);

      const result = await controller.getContracts();

      expect(mockFireflyService.getContracts).toHaveBeenCalled();
      expect(result).toEqual(mockContracts);
    });
  });

  describe('getHealth', () => {
    it('should return healthy status', async () => {
      const result = await controller.getHealth();

      expect(result).toEqual({
        status: 'UP',
        service: 'blockchain-manager',
      });
    });
  });

  describe('getLedgerInfo', () => {
    it('should return ledger info with height from latest pin', async () => {
      const mockPins = [{ sequence: 100, created: '2024-01-01T00:00:00Z', hash: 'abc123' }];
      mockFireflyService.getPins.mockResolvedValue(mockPins);

      const result = await controller.getLedgerInfo('default');

      expect(result.height).toBe(100);
      expect(result.lastBlockTime).toBe('2024-01-01T00:00:00Z');
    });

    it('should return height 0 when no pins', async () => {
      mockFireflyService.getPins.mockResolvedValue([]);

      const result = await controller.getLedgerInfo('default');

      expect(result.height).toBe(0);
      expect(result.lastBlockTime).toBeDefined();
    });

    it('should return height 0 when response is empty object', async () => {
      mockFireflyService.getPins.mockResolvedValue({});

      const result = await controller.getLedgerInfo('default');

      expect(result.height).toBe(0);
    });

    it('should use custom namespace', async () => {
      mockFireflyService.getPins.mockResolvedValue([{ sequence: 50 }]);

      await controller.getLedgerInfo('custom-ns');

      expect(mockFireflyService.getPins).toHaveBeenCalledWith('custom-ns', { limit: 1, skip: 0 });
    });
  });

  describe('registerChaincode', () => {
    const validDto = {
      apiName: 'my-api',
      channel: 'my-channel',
      chaincodeName: 'my-chaincode',
      ffiJson: JSON.stringify({ name: 'TestFFI', namespace: 'default' }),
      eventName: 'TelemetryAnchored',
      topic: 'auditoria-iot',
    };

    it('should throw ForbiddenException for non-GLOBAL_ADMIN', async () => {
      const mockRequest = { user: { role: 'ADMIN' } };

      await expect(controller.registerChaincode(validDto, mockRequest as any))
        .rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException for USER role', async () => {
      const mockRequest = { user: { role: 'USER' } };

      await expect(controller.registerChaincode(validDto, mockRequest as any))
        .rejects.toThrow(ForbiddenException);
    });

    it('should register chaincode with listener for GLOBAL_ADMIN when eventName is provided', async () => {
      const mockRequest = { user: { role: 'GLOBAL_ADMIN' } };
      mockFireflyService.registerContractInterface.mockResolvedValue({ id: 'ffi-123' });
      mockFireflyService.registerApi.mockResolvedValue({ id: 'api-123' });
      mockFireflyService.registerEventListener.mockResolvedValue({ id: 'listener-123' });

      const result = await controller.registerChaincode(validDto, mockRequest as any);

      expect(mockFireflyService.registerContractInterface).toHaveBeenCalledWith(
        'default',
        expect.any(Object)
      );
      expect(mockFireflyService.registerApi).toHaveBeenCalledWith(
        'default',
        expect.objectContaining({ name: 'my-api' })
      );
      expect(mockFireflyService.registerEventListener).toHaveBeenCalledWith(
        'default',
        expect.objectContaining({
          name: expect.stringContaining('listener-my-api-'),
          topic: 'auditoria-iot',
          event: expect.objectContaining({ name: 'TelemetryAnchored' }),
        })
      );
      expect(result.success).toBe(true);
      expect(result.ffiId).toBe('ffi-123');
    });

    it('should register chaincode without listener when eventName is not provided', async () => {
      const dtoWithoutEvent = {
        apiName: 'my-api',
        channel: 'my-channel',
        chaincodeName: 'my-chaincode',
        ffiJson: JSON.stringify({ name: 'TestFFI', namespace: 'default' }),
      };
      const mockRequest = { user: { role: 'GLOBAL_ADMIN' } };
      mockFireflyService.registerContractInterface.mockResolvedValue({ id: 'ffi-456' });
      mockFireflyService.registerApi.mockResolvedValue({ id: 'api-456' });

      const result = await controller.registerChaincode(dtoWithoutEvent, mockRequest as any);

      expect(mockFireflyService.registerContractInterface).toHaveBeenCalled();
      expect(mockFireflyService.registerApi).toHaveBeenCalled();
      expect(mockFireflyService.registerEventListener).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should use default topic when eventName is provided but topic is not', async () => {
      const dtoWithEventOnly = {
        apiName: 'my-api',
        channel: 'my-channel',
        chaincodeName: 'my-chaincode',
        ffiJson: JSON.stringify({ name: 'TestFFI', namespace: 'default' }),
        eventName: 'ActionAnchored',
      };
      const mockRequest = { user: { role: 'GLOBAL_ADMIN' } };
      mockFireflyService.registerContractInterface.mockResolvedValue({ id: 'ffi-789' });
      mockFireflyService.registerApi.mockResolvedValue({ id: 'api-789' });
      mockFireflyService.registerEventListener.mockResolvedValue({ id: 'listener-789' });

      await controller.registerChaincode(dtoWithEventOnly, mockRequest as any);

      expect(mockFireflyService.registerEventListener).toHaveBeenCalledWith(
        'default',
        expect.objectContaining({
          name: expect.stringContaining('listener-my-api-'),
          topic: 'default',
          event: expect.objectContaining({ name: 'ActionAnchored' }),
        })
      );
    });

    it('should throw error for invalid JSON in ffiJson', async () => {
      const invalidDto = { ...validDto, ffiJson: 'not-valid-json' };
      const mockRequest = { user: { role: 'GLOBAL_ADMIN' } };

      await expect(controller.registerChaincode(invalidDto, mockRequest as any))
        .rejects.toThrow();
    });

    it('should throw ForbiddenException when user is undefined', async () => {
      const mockRequest = { user: undefined };

      await expect(controller.registerChaincode(validDto, mockRequest as any))
        .rejects.toThrow(ForbiddenException);
    });
  });

  describe('deleteChaincode', () => {
    it('should delete chaincode and associated listeners for GLOBAL_ADMIN', async () => {
      const mockRequest = { user: { role: 'GLOBAL_ADMIN' } };
      mockFireflyService.getContracts.mockResolvedValue({
        items: [{
          id: 'contract-id',
          name: 'my-contract',
          location: { channel: 'firefly', chaincode: 'my-chaincode' },
        }],
      });
      mockFireflyService.getContractListenersByLocation.mockResolvedValue([
        { id: 'listener-1', name: 'listener-1' },
        { id: 'listener-2', name: 'listener-2' },
      ]);
      mockFireflyService.deleteContractListener.mockResolvedValue(undefined);
      mockFireflyService.deleteContractApi.mockResolvedValue(undefined);

      const result = await controller.deleteChaincode('my-contract', mockRequest as any);

      expect(mockFireflyService.getContracts).toHaveBeenCalled();
      expect(mockFireflyService.getContractListenersByLocation).toHaveBeenCalledWith(
        'default',
        { channel: 'firefly', chaincode: 'my-chaincode' }
      );
      expect(mockFireflyService.deleteContractListener).toHaveBeenCalledTimes(2);
      expect(mockFireflyService.deleteContractListener).toHaveBeenCalledWith('default', 'listener-1');
      expect(mockFireflyService.deleteContractListener).toHaveBeenCalledWith('default', 'listener-2');
      expect(mockFireflyService.deleteContractApi).toHaveBeenCalledWith('my-contract', 'default');
      expect(result).toEqual({
        success: true,
        message: "Chaincode 'my-contract' deleted successfully",
      });
    });

    it('should delete chaincode even if no listeners exist', async () => {
      const mockRequest = { user: { role: 'GLOBAL_ADMIN' } };
      mockFireflyService.getContracts.mockResolvedValue({
        items: [{
          id: 'contract-id',
          name: 'orphan-contract',
          location: { channel: 'firefly', chaincode: 'orphan-chaincode' },
        }],
      });
      mockFireflyService.getContractListenersByLocation.mockResolvedValue([]);
      mockFireflyService.deleteContractApi.mockResolvedValue(undefined);

      const result = await controller.deleteChaincode('orphan-contract', mockRequest as any);

      expect(mockFireflyService.getContractListenersByLocation).toHaveBeenCalled();
      expect(mockFireflyService.deleteContractListener).not.toHaveBeenCalled();
      expect(mockFireflyService.deleteContractApi).toHaveBeenCalledWith('orphan-contract', 'default');
      expect(result.success).toBe(true);
    });

    it('should throw ForbiddenException for non-GLOBAL_ADMIN', async () => {
      const mockRequest = { user: { role: 'ADMIN' } };

      await expect(controller.deleteChaincode('my-contract', mockRequest as any))
        .rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException for USER role', async () => {
      const mockRequest = { user: { role: 'USER' } };

      await expect(controller.deleteChaincode('my-contract', mockRequest as any))
        .rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when chaincode is not found', async () => {
      const mockRequest = { user: { role: 'GLOBAL_ADMIN' } };
      mockFireflyService.getContracts.mockResolvedValue({ items: [] });

      await expect(controller.deleteChaincode('non-existent', mockRequest as any))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when contracts response has no items', async () => {
      const mockRequest = { user: { role: 'GLOBAL_ADMIN' } };
      mockFireflyService.getContracts.mockResolvedValue({});

      await expect(controller.deleteChaincode('non-existent', mockRequest as any))
        .rejects.toThrow(NotFoundException);
    });

    it('should use default location when contract has no location', async () => {
      const mockRequest = { user: { role: 'GLOBAL_ADMIN' } };
      mockFireflyService.getContracts.mockResolvedValue({
        items: [{ id: 'contract-id', name: 'my-contract' }],
      });
      mockFireflyService.getContractListenersByLocation.mockResolvedValue([]);
      mockFireflyService.deleteContractApi.mockResolvedValue(undefined);

      await controller.deleteChaincode('my-contract', mockRequest as any);

      expect(mockFireflyService.getContractListenersByLocation).toHaveBeenCalledWith(
        'default',
        { channel: 'firefly', chaincode: 'my-contract' }
      );
    });

    it('should continue deleting other listeners if one fails', async () => {
      const mockRequest = { user: { role: 'GLOBAL_ADMIN' } };
      mockFireflyService.getContracts.mockResolvedValue({
        items: [{
          id: 'contract-id',
          name: 'my-contract',
          location: { channel: 'firefly', chaincode: 'my-chaincode' },
        }],
      });
      mockFireflyService.getContractListenersByLocation.mockResolvedValue([
        { id: 'listener-1', name: 'listener-1' },
        { id: 'listener-2', name: 'listener-2' },
      ]);
      mockFireflyService.deleteContractListener
        .mockRejectedValueOnce(new Error('listener already gone'))
        .mockResolvedValueOnce(undefined);
      mockFireflyService.deleteContractApi.mockResolvedValue(undefined);

      const result = await controller.deleteChaincode('my-contract', mockRequest as any);

      expect(mockFireflyService.deleteContractListener).toHaveBeenCalledTimes(2);
      expect(mockFireflyService.deleteContractApi).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });

  describe('getContractInterface', () => {
    it('should return contract interface from service', async () => {
      const mockSwagger = { swagger: '2.0', info: { title: 'Test API' } };
      mockFireflyService.getContractInterface.mockResolvedValue(mockSwagger);

      const result = await controller.getContractInterface('my-api');

      expect(mockFireflyService.getContractInterface).toHaveBeenCalledWith('my-api');
      expect(result).toEqual(mockSwagger);
    });
  });
});