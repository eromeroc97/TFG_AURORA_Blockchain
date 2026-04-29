import { apiClient } from '../api/axios'
import type { User } from '../components/dashboard/users.data'

export async function getUserById(userId: string): Promise<User | null> {
  try {
    const response = await apiClient.get<User>(`/users/${userId}`)
    return response.data
  } catch {
    return null
  }
}

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

export async function changeUserRole(userId: string, newRole: string): Promise<User> {
  const response = await apiClient.patch<User>(`/users/${userId}/role`, { newRole })
  return response.data
}
