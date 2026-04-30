import { useEffect, useState, useCallback } from 'react'
import { getEcosystems, getMyEcosystems, getSharedWithMe, createEcosystem as apiCreateEcosystem, grantAccess, revokeAccess, updateAccessRole, getEcosystemAccesses, type AccessRole, type EcosystemAccess } from '../services/ecosystems.service'
import type { AccessMapEcosystem } from '../components/dashboard/access-map.data'

export function useEcosystemsController() {
  const [ecosystems, setEcosystems] = useState<AccessMapEcosystem[]>([])
  const [myEcosystems, setMyEcosystems] = useState<AccessMapEcosystem[]>([])
  const [sharedWithMe, setSharedWithMe] = useState<AccessMapEcosystem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const refreshEcosystems = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const data = await getEcosystems()
      setEcosystems(data)
    } catch {
      setEcosystems([])
      setError('No se han podido cargar los ecosistemas. Intenta de nuevo más tarde.')
    } finally {
      setIsLoading(false)
    }
  }

  const refreshMyEcosystems = useCallback(async () => {
    try {
      const data = await getMyEcosystems()
      setMyEcosystems(data)
    } catch {
      setMyEcosystems([])
    }
  }, [])

  const refreshSharedWithMe = useCallback(async () => {
    try {
      const data = await getSharedWithMe()
      setSharedWithMe(data)
    } catch {
      setSharedWithMe([])
    }
  }, [])

  const createEcosystem = async (name: string) => {
    setIsCreating(true)
    try {
      const created = await apiCreateEcosystem(name)
      const newEcosystem: AccessMapEcosystem = {
        id: created.id,
        name: created.name,
        ownerId: created.ownerId,
        lat: created.latitude,
        lng: created.longitude,
        isShared: false,
        accessType: 'OWNER',
        devices: [],
      }
      setEcosystems((current) => [newEcosystem, ...current])
      await refreshMyEcosystems()
      return created
    } catch (err) {
      throw err
    } finally {
      setIsCreating(false)
    }
  }

  const addAccess = async (ecosystemId: string, email: string, role: AccessRole = 'VIEWER') => {
    await grantAccess(ecosystemId, email, role)
  }

  const removeAccess = async (ecosystemId: string, userId: string) => {
    await revokeAccess(ecosystemId, userId)
  }

  const changeAccessRole = async (ecosystemId: string, userId: string, role: AccessRole) => {
    await updateAccessRole(ecosystemId, userId, role)
  }

  const fetchAccesses = async (ecosystemId: string): Promise<EcosystemAccess[]> => {
    return getEcosystemAccesses(ecosystemId)
  }

  useEffect(() => {
    void refreshEcosystems()
  }, [])

  return {
    ecosystems,
    myEcosystems,
    sharedWithMe,
    isLoading,
    error,
    isCreating,
    refreshEcosystems,
    refreshMyEcosystems,
    refreshSharedWithMe,
    createEcosystem,
    addAccess,
    removeAccess,
    changeAccessRole,
    fetchAccesses,
  }
}
