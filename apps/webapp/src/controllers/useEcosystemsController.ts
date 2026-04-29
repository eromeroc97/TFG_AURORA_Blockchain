import { useEffect, useState } from 'react'
import { getEcosystems, createEcosystem as apiCreateEcosystem } from '../services/ecosystems.service'
import type { AccessMapEcosystem } from '../components/dashboard/access-map.data'

export function useEcosystemsController() {
  const [ecosystems, setEcosystems] = useState<AccessMapEcosystem[]>([])
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
        devices: [],
      }
      setEcosystems((current) => [newEcosystem, ...current])
      return created
    } catch (err) {
      throw err
    } finally {
      setIsCreating(false)
    }
  }

  useEffect(() => {
    void refreshEcosystems()
  }, [])

  return {
    ecosystems,
    isLoading,
    error,
    isCreating,
    refreshEcosystems,
    createEcosystem,
  }
}
