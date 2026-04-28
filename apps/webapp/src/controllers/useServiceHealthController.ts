import { useCallback, useEffect, useState } from 'react'

type ServiceHealth = {
  id: string
  name: string
  url: string
  status: 'Online' | 'Offline'
  message?: string
}

const serviceDefinitions = [
  {
    id: 'firefly',
    name: 'Blockchain Fabric',
    envKey: 'VITE_FIREFLY_HEALTH_URL',
  },
  {
    id: 'threadIntelligence',
    name: 'Thread Intelligence',
    envKey: 'VITE_THREAD_INTELLIGENCE_HEALTH_URL',
  },
  {
    id: 'iotManager',
    name: 'Ingesta y Descubrimiento',
    envKey: 'VITE_IOT_MANAGER_HEALTH_URL',
  },
  {
    id: 'auth',
    name: 'Autenticación',
    envKey: 'VITE_AUTH_HEALTH_URL',
  },
  {
    id: 'audit',
    name: 'Auditoría',
    envKey: 'VITE_AUDIT_HEALTH_URL',
  },
]

const getHealthUrl = (envKey: string) => (import.meta.env as Record<string, string | undefined>)[envKey] ?? ''

const checkServiceHealth = async (url: string): Promise<{ status: 'Online' | 'Offline'; message?: string }> => {
  if (!url) {
    return { status: 'Offline', message: 'Ruta de health no configurada' }
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      return { status: 'Offline', message: `HTTP ${response.status}` }
    }

    const data = await response.json().catch(() => null)
    if (data && typeof data.status === 'string') {
      return data.status.toUpperCase() === 'UP'
        ? { status: 'Online' }
        : { status: 'Offline', message: `Estado ${data.status}` }
    }

    return { status: 'Online' }
  } catch (error) {
    return { status: 'Offline', message: 'No disponible' }
  }
}

export function useServiceHealthController() {
  const [services, setServices] = useState<ServiceHealth[]>(
    serviceDefinitions.map((service) => ({
      id: service.id,
      name: service.name,
      url: getHealthUrl(service.envKey),
      status: 'Offline',
      message: 'Sin verificar',
    })),
  )
  const [isLoading, setIsLoading] = useState(true)

  const refreshServiceHealth = useCallback(async () => {
    setIsLoading(true)
    const healthChecks = await Promise.all(
      serviceDefinitions.map(async (service) => {
        const url = getHealthUrl(service.envKey)
        const health = await checkServiceHealth(url)

        return {
          id: service.id,
          name: service.name,
          url,
          status: health.status,
          message: health.message,
        }
      }),
    )

    setServices(healthChecks)
    setIsLoading(false)
  }, [])

  useEffect(() => {
    void refreshServiceHealth()
  }, [refreshServiceHealth])

  return {
    services,
    isLoading,
    refreshServiceHealth,
  }
}
