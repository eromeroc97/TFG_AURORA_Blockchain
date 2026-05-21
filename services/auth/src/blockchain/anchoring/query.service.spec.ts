import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { ActionsQueryService } from './query.service';
import { ActionType } from './action-types.enum';

describe('ActionsQueryService', () => {
  let service: ActionsQueryService;

  const httpServiceMock = { post: jest.fn() };

  beforeEach(async () => {
    process.env.FIREFLY_API_URL = 'http://firefly.local';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActionsQueryService,
        { provide: HttpService, useValue: httpServiceMock },
      ],
    }).compile();

    service = module.get<ActionsQueryService>(ActionsQueryService);
    jest.clearAllMocks();
  });

  const mockAnchor = {
    action_id: 'action-1',
    actor_id: 'actor-1',
    target_id: 'target-1',
    action_type: ActionType.ACCOUNT_APPROVE,
    parent_action_id: '',
    readable_description: 'test',
    signature: 'sig',
    public_key: 'key',
    nonce: 'nonce',
    metadata: {},
    anchor_tx_id: 'tx-1',
    anchored_at: '2026-01-01T00:00:00.000Z',
  };

  describe('getAction', () => {
    it('should return action when found', async () => {
      httpServiceMock.post.mockReturnValue(of({ data: mockAnchor }));

      const result = await service.getAction('action-1');

      expect(httpServiceMock.post).toHaveBeenCalledWith(
        'http://firefly.local/namespaces/default/apis/aurora-actions-api/invoke/GetAction',
        { input: { actionID: 'action-1' } },
        { params: { confirm: 'true' } },
      );
      expect(result).toEqual(mockAnchor);
    });

    it('should return null on error', async () => {
      httpServiceMock.post.mockReturnValue(throwError(() => new Error('not found')));

      const result = await service.getAction('missing');

      expect(result).toBeNull();
    });
  });

  describe('getActionsByActor', () => {
    it('should return actions for actor', async () => {
      httpServiceMock.post.mockReturnValue(of({ data: [mockAnchor] }));

      const result = await service.getActionsByActor('actor-1');

      expect(httpServiceMock.post).toHaveBeenCalledWith(
        expect.stringContaining('GetActionsByActor'),
        { input: { actorID: 'actor-1' } },
        expect.any(Object),
      );
      expect(result).toEqual([mockAnchor]);
    });

    it('should return empty array on error', async () => {
      httpServiceMock.post.mockReturnValue(throwError(() => new Error('fail')));

      const result = await service.getActionsByActor('actor-1');

      expect(result).toEqual([]);
    });

    it('should return empty array when data is null', async () => {
      httpServiceMock.post.mockReturnValue(of({ data: null }));

      const result = await service.getActionsByActor('actor-1');

      expect(result).toEqual([]);
    });
  });

  describe('getActionsByActorAndType', () => {
    it('should return actions filtered by actor and type', async () => {
      httpServiceMock.post.mockReturnValue(of({ data: [mockAnchor] }));

      const result = await service.getActionsByActorAndType('actor-1', ActionType.ACCOUNT_APPROVE);

      expect(httpServiceMock.post).toHaveBeenCalledWith(
        expect.stringContaining('GetActionsByActorAndType'),
        { input: { actorID: 'actor-1', actionType: ActionType.ACCOUNT_APPROVE } },
        expect.any(Object),
      );
      expect(result).toEqual([mockAnchor]);
    });

    it('should return empty array on error', async () => {
      httpServiceMock.post.mockReturnValue(throwError(() => new Error('fail')));

      const result = await service.getActionsByActorAndType('actor-1', ActionType.ACCOUNT_APPROVE);

      expect(result).toEqual([]);
    });
  });

  describe('getActionsByActorAndTypeAndTarget', () => {
    it('should return actions filtered by actor, type and target', async () => {
      httpServiceMock.post.mockReturnValue(of({ data: [mockAnchor] }));

      const result = await service.getActionsByActorAndTypeAndTarget(
        'actor-1',
        ActionType.ECOSYSTEM_ACCESS_GRANT,
        'target-1',
      );

      expect(httpServiceMock.post).toHaveBeenCalledWith(
        expect.stringContaining('GetActionsByActorAndTypeAndTarget'),
        {
          input: {
            actorID: 'actor-1',
            actionType: ActionType.ECOSYSTEM_ACCESS_GRANT,
            targetID: 'target-1',
          },
        },
        expect.any(Object),
      );
      expect(result).toEqual([mockAnchor]);
    });

    it('should return empty array on error', async () => {
      httpServiceMock.post.mockReturnValue(throwError(() => new Error('fail')));

      const result = await service.getActionsByActorAndTypeAndTarget(
        'actor-1',
        ActionType.ECOSYSTEM_ACCESS_GRANT,
        'target-1',
      );

      expect(result).toEqual([]);
    });
  });

  describe('getActionsByType', () => {
    it('should return actions filtered by type', async () => {
      httpServiceMock.post.mockReturnValue(of({ data: [mockAnchor] }));

      const result = await service.getActionsByType(ActionType.ECOSYSTEM_CREATE);

      expect(httpServiceMock.post).toHaveBeenCalledWith(
        expect.stringContaining('GetActionsByType'),
        { input: { actionType: ActionType.ECOSYSTEM_CREATE } },
        expect.any(Object),
      );
      expect(result).toEqual([mockAnchor]);
    });

    it('should return empty array on error', async () => {
      httpServiceMock.post.mockReturnValue(throwError(() => new Error('fail')));

      const result = await service.getActionsByType(ActionType.ECOSYSTEM_CREATE);

      expect(result).toEqual([]);
    });
  });

  describe('getActionChildren', () => {
    it('should return child actions', async () => {
      httpServiceMock.post.mockReturnValue(of({ data: [mockAnchor] }));

      const result = await service.getActionChildren('parent-1');

      expect(httpServiceMock.post).toHaveBeenCalledWith(
        expect.stringContaining('GetActionChildren'),
        { input: { parentActionID: 'parent-1' } },
        expect.any(Object),
      );
      expect(result).toEqual([mockAnchor]);
    });

    it('should return empty array on error', async () => {
      httpServiceMock.post.mockReturnValue(throwError(() => new Error('fail')));

      const result = await service.getActionChildren('parent-1');

      expect(result).toEqual([]);
    });
  });

  describe('getActionsByTarget', () => {
    it('should return actions for target', async () => {
      httpServiceMock.post.mockReturnValue(of({ data: [mockAnchor] }));

      const result = await service.getActionsByTarget('target-1');

      expect(httpServiceMock.post).toHaveBeenCalledWith(
        expect.stringContaining('GetActionsByTarget'),
        { input: { targetID: 'target-1' } },
        expect.any(Object),
      );
      expect(result).toEqual([mockAnchor]);
    });

    it('should return empty array on error', async () => {
      httpServiceMock.post.mockReturnValue(throwError(() => new Error('fail')));

      const result = await service.getActionsByTarget('target-1');

      expect(result).toEqual([]);
    });
  });

  describe('findGrantAccessAction', () => {
    it('should find matching grant action', async () => {
      const grantMock = {
        ...mockAnchor,
        metadata: { grantedUserId: 'user-1' },
      };
      const otherMock = {
        ...mockAnchor,
        metadata: { grantedUserId: 'user-2' },
      };
      httpServiceMock.post.mockReturnValue(of({ data: [grantMock, otherMock] }));

      const result = await service.findGrantAccessAction('actor-1', 'eco-1', 'user-1');

      expect(result).toEqual(grantMock);
    });

    it('should return null when no matching grant', async () => {
      httpServiceMock.post.mockReturnValue(of({ data: [] }));

      const result = await service.findGrantAccessAction('actor-1', 'eco-1', 'user-1');

      expect(result).toBeNull();
    });
  });

  describe('missing FIREFLY_API_URL', () => {
    beforeEach(() => {
      delete process.env.FIREFLY_API_URL;
    });

    it('should return null in getAction when base url missing', async () => {
      const result = await service.getAction('action-1');
      expect(result).toBeNull();
    });

    it('should handle missing url gracefully in getActionsByActor (empty result)', async () => {
      await expect(service.getActionsByActor('actor-1')).resolves.toEqual([]);
    });
  });
});
