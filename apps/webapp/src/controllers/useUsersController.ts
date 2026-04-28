import { useEffect, useState } from 'react'
import { getUsers } from '../services/users.service'
import type { User } from '../components/dashboard/users.data'

export function useUsersController() {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshUsers = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const data = await getUsers()
      setUsers(data)
    } catch {
      setUsers([])
      setError('No se ha podido cargar la lista de usuarios. Intenta de nuevo más tarde.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void refreshUsers()
  }, [])

  return {
    users,
    isLoading,
    error,
    refreshUsers,
  }
}
