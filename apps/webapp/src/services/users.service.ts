import { apiClient } from '../api/axios'
import type { User } from '../components/dashboard/users.data'

export async function getUsers(): Promise<User[]> {
  try {
    const response = await apiClient.get<User[]>('/users')
    return response.data
  } catch {
    return []
  }
}

export async function approveUser(userId: string): Promise<User> {
  const response = await apiClient.patch<User>(`/users/${userId}/approve`)
  return response.data
}

export async function revokeUser(userId: string): Promise<void> {
  await apiClient.delete(`/users/${userId}`)
}
