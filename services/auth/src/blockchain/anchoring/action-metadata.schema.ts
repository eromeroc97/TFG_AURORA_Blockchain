import { ActionType } from './action-types.enum';

export interface EcosystemAccessGrantMetadata {
  ecosystemId: string;
  grantedUserId: string;
}

export interface EcosystemAccessRevokeMetadata {
  ecosystemId: string;
  revokedUserId: string;
}

export interface EcosystemAccessUpdateMetadata {
  ecosystemId: string;
  updatedUserId: string;
  oldRole: string;
  newRole: string;
}

export interface EcosystemLeaveMetadata {
  ecosystemId: string;
}

export interface DeviceMetadata {
  deviceId: string;
  ecosystemId: string;
}

export interface AccountInitMetadata {
  emailDomain: string;
}

export interface NotificationSentMetadata {
  notificationId: string;
  notificationType: string;
  recipientId: string;
  recipientRole?: string;
}

export interface NotificationReadMetadata {
  notificationId: string;
}

export type MetadataByActionType = {
  [ActionType.ECOSYSTEM_ACCESS_GRANT]: EcosystemAccessGrantMetadata;
  [ActionType.ECOSYSTEM_ACCESS_REVOKE]: EcosystemAccessRevokeMetadata;
  [ActionType.ECOSYSTEM_ACCESS_UPDATE]: EcosystemAccessUpdateMetadata;
  [ActionType.ECOSYSTEM_LEAVE]: EcosystemLeaveMetadata;
  [ActionType.DEVICE_REGISTER]: DeviceMetadata;
  [ActionType.DEVICE_UPDATE]: DeviceMetadata;
  [ActionType.DEVICE_REMOVE]: DeviceMetadata;
  [ActionType.ACCOUNT_INIT]: AccountInitMetadata;
  [ActionType.NOTIFICATION_SENT]: NotificationSentMetadata;
  [ActionType.NOTIFICATION_READ]: NotificationReadMetadata;
};

export type NoMetadata = Record<string, never>;

export type ActionMetadata<T extends ActionType> =
  T extends keyof MetadataByActionType ? MetadataByActionType[T] : NoMetadata;

export const METADATA_KEYS: Record<ActionType, string[]> = {
  [ActionType.ECOSYSTEM_ACCESS_GRANT]: ['ecosystemId', 'grantedUserId'],
  [ActionType.ECOSYSTEM_ACCESS_REVOKE]: ['ecosystemId', 'revokedUserId'],
  [ActionType.ECOSYSTEM_ACCESS_UPDATE]: ['ecosystemId', 'updatedUserId', 'oldRole', 'newRole'],
  [ActionType.ECOSYSTEM_LEAVE]: ['ecosystemId'],
  [ActionType.DEVICE_REGISTER]: ['deviceId', 'ecosystemId'],
  [ActionType.DEVICE_UPDATE]: ['deviceId', 'ecosystemId'],
  [ActionType.DEVICE_REMOVE]: ['deviceId', 'ecosystemId'],
  [ActionType.ACCOUNT_INIT]: ['emailDomain'],
  [ActionType.NOTIFICATION_SENT]: ['notificationId', 'notificationType', 'recipientId', 'recipientRole'],
  [ActionType.NOTIFICATION_READ]: ['notificationId'],
  [ActionType.ACCOUNT_APPROVE]: [],
  [ActionType.ROLE_CHANGE]: [],
  [ActionType.ACCOUNT_REVOKE]: [],
  [ActionType.ACCOUNT_PASSBLOCK]: [],
  [ActionType.ECOSYSTEM_CREATE]: [],
  [ActionType.ECOSYSTEM_UPDATE]: [],
  [ActionType.ECOSYSTEM_REVOKE]: [],
  [ActionType.ECOSYSTEM_ACCESS_ACCEPT]: [],
  [ActionType.ECOSYSTEM_ACCESS_REJECT]: [],
  [ActionType.AUTH_LOGIN]: [],
  [ActionType.AUTH_LOGOUT]: [],
  [ActionType.AUTH_SESSION_REVOKE]: [],
};
