import { apiClient } from '../api/axios'

export type NotificationCategory = 'READ_ONLY' | 'ACTION_EXPECTED'
export type NotificationStatus = 'PENDING' | 'READ' | 'ACCEPTED' | 'REJECTED'
export type NotificationType = 'ECOSYSTEM_DELEGATION_REQUEST'
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
    const response = await apiClient.get<NotificationCount>('/notifications/count')
    return response.data.count ?? 0
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