import { useEffect, useState } from 'react'
import { getMapEcosystems } from '../services/dashboard.service'
import type { AccessMapEcosystem } from '../services/ecosystems.service'

export function useDashboardController(enabled = true) {
  const [ecosystems, setEcosystems] = useState<AccessMapEcosystem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadEcosystems = async () => {
    if (!enabled) {
      setEcosystems([])
      setIsLoading(false)
      return
    }

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
  }, [enabled])

  return {
    ecosystems,
    isLoading,
    error,
    refreshEcosystems: loadEcosystems,
  }
}
