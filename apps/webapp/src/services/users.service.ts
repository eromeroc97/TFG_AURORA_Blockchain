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
