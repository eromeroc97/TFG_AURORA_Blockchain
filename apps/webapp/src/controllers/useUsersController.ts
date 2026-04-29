import { useEffect, useState } from 'react'
import { getUsers, approveUser as apiApproveUser, revokeUser as apiRevokeUser, changeUserRole as apiChangeUserRole } from '../services/users.service'
import type { User } from '../components/dashboard/users.data'

export function useUsersController() {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

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

  const approveUser = async (userId: string) => {
    setActionLoading(true)
    try {
      await apiApproveUser(userId)
      await refreshUsers()
    } catch (err) {
      throw err
    } finally {
      setActionLoading(false)
    }
  }

  const revokeUser = async (userId: string) => {
    setActionLoading(true)
    try {
      await apiRevokeUser(userId)
      await refreshUsers()
    } catch (err) {
      throw err
    } finally {
      setActionLoading(false)
    }
  }

  const changeUserRole = async (userId: string, newRole: string) => {
    setActionLoading(true)
    try {
      await apiChangeUserRole(userId, newRole)
      await refreshUsers()
    } catch (err) {
      throw err
    } finally {
      setActionLoading(false)
    }
  }

  useEffect(() => {
    void refreshUsers()
  }, [])

  return {
    users,
    isLoading,
    error,
    actionLoading,
    refreshUsers,
    approveUser,
    revokeUser,
    changeUserRole,
  }
}
