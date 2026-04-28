import { useEffect, useState } from 'react'
import { getMapEcosystems } from '../services/dashboard.service'
import type { AccessMapEcosystem } from '../components/dashboard/access-map.data'

export function useDashboardController() {
  const [ecosystems, setEcosystems] = useState<AccessMapEcosystem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadEcosystems = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const nextEcosystems = await getMapEcosystems()
      setEcosystems(nextEcosystems)
    } catch {
      setEcosystems([])
      setError('No se han podido cargar los ecosistemas del panel principal.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadEcosystems()
  }, [])

  return {
    ecosystems,
    isLoading,
    error,
    refreshEcosystems: loadEcosystems,
  }
}
