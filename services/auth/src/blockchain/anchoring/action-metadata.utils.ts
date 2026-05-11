import { ActionType } from './action-types.enum';
import { ActionMetadata } from './action-metadata.schema';

export function serializeMetadata<T extends ActionType>(
  _actionType: T,
  metadata: ActionMetadata<T>,
): string {
  if (!metadata || (typeof metadata === 'object' && Object.keys(metadata).length === 0)) {
    return '{}';
  }
  return JSON.stringify(metadata);
}

export function deserializeMetadata(
  json: string,
): Record<string, string> | null {
  if (!json || json === '{}') {
    return null;
  }
  try {
    return JSON.parse(json) as Record<string, string>;
  } catch {
    return null;
  }
}
