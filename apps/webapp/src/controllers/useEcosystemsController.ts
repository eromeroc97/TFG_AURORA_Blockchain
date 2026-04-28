import { useEffect, useState } from 'react'
import { getEcosystems } from '../services/ecosystems.service'
import type { AccessMapEcosystem } from '../components/dashboard/access-map.data'

export function useEcosystemsController() {
  const [ecosystems, setEcosystems] = useState<AccessMapEcosystem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  useEffect(() => {
    void refreshEcosystems()
  }, [])

  return {
    ecosystems,
    isLoading,
    error,
    refreshEcosystems,
  }
}
