import { ActionType } from './action-types.enum';

export interface AuroraActionAnchor {
  action_id: string;
  actor_id: string;
  target_id: string;
  action_type: ActionType;
  parent_action_id: string;
  readable_description: string;
  signature: string;
  public_key: string;
  nonce: string;
  metadata: Record<string, string>;
  anchor_tx_id: string;
  anchored_at: string;
}

export interface ActionAnchorResponse {
  id: string;
  hash: string;
  blockNumber?: number;
}

export interface AnchorParams {
  actionId: string;
  actionType: ActionType;
  actorId: string;
  targetId: string;
  parentActionId?: string;
  readableDescription: string;
  signature: string;
  publicKey: string;
  nonce: string;
  metadata?: Record<string, string>;
}
