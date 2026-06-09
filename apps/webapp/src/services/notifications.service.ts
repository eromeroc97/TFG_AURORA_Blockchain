import { apiClient } from '../api/axios'

export type NotificationCategory = 'READ_ONLY' | 'ACTION_EXPECTED'
export type NotificationStatus = 'PENDING' | 'READ' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED'
export type NotificationType = 'ECOSYSTEM_DELEGATION_REQUEST' | 'ADMINISTRATOR_NOTIFICATION'
export type TargetType = 'INDIVIDUAL' | 'GLOBAL'
export type ActorType = 'USER' | 'SYSTEM'

export interface Notification {
  id: string
  category: NotificationCategory
  type: NotificationType
  targetType: TargetType
  actorType: ActorType
  actorId: string | null
  actorEmail: string | null
  userId: string | null
  title: string
  message: string
  status: NotificationStatus
  actionUrl: string | null
  metadata: Record<string, unknown> | null
  readAt: string | null
  respondedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface NotificationCount {
  count: number
}

export async function getNotifications(includeRead = true): Promise<Notification[]> {
  try {
    const response = await apiClient.get<Notification[]>('/notifications', {
      params: { includeRead: includeRead.toString() },
    })
    return response.data
  } catch {
    return []
  }
}

export async function getPendingCount(): Promise<number> {
  try {
    const response = await apiClient.get<{ count?: number } | number>('/notifications/count')
    const data = response.data
    return typeof data === 'number' ? data : data?.count ?? 0
  } catch {
    return 0
  }
}

export async function markAsRead(id: string): Promise<Notification | null> {
  try {
    const response = await apiClient.patch<Notification>(`/notifications/${id}/read`)
    return response.data
  } catch {
    return null
  }
}

export async function acceptNotification(id: string): Promise<Notification | null> {
  try {
    const response = await apiClient.patch<Notification>(`/notifications/${id}/accept`)
    return response.data
  } catch {
    return null
  }
}

export async function rejectNotification(id: string): Promise<Notification | null> {
  try {
    const response = await apiClient.patch<Notification>(`/notifications/${id}/reject`)
    return response.data
  } catch {
    return null
  }
}

export interface SendToUserPayload {
  userId: string
  title: string
  message: string
}

export interface SendToRolesPayload {
  roles: string[]
  title: string
  message: string
}

export interface SendNotificationResponse {
  id: string
}

export interface SendToRolesResponse {
  count: number
}

export async function sendNotificationToUser(payload: SendToUserPayload): Promise<SendNotificationResponse> {
  const response = await apiClient.post<SendNotificationResponse>('/notifications/send-to-user', payload)
  return response.data
}

export async function sendNotificationToRoles(payload: SendToRolesPayload): Promise<SendToRolesResponse> {
  const response = await apiClient.post<SendToRolesResponse>('/notifications/send-to-roles', payload)
  return response.data
}