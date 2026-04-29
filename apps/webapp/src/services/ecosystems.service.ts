import { apiClient } from '../api/axios'
import { ACCESS_MAP_ECOSYSTEMS_MOCK, type AccessMapEcosystem } from '../components/dashboard/access-map.data'

type ApiEcosystem = {
  id: string
  name: string
  ownerId: string
  latitude: number | null
  longitude: number | null
}

type CreateEcosystemResponse = {
  id: string
  name: string
  ownerId: string
  apiKey: string
  latitude: number | null
  longitude: number | null
}

export async function getEcosystems(): Promise<AccessMapEcosystem[]> {
  try {
    const response = await apiClient.get<ApiEcosystem[]>('/ecosystems')

    return response.data.map((ecosystem) => ({
      id: ecosystem.id,
      name: ecosystem.name,
      ownerId: ecosystem.ownerId,
      lat: ecosystem.latitude,
      lng: ecosystem.longitude,
      isShared: false,
      devices: [],
    }))
  } catch {
    return ACCESS_MAP_ECOSYSTEMS_MOCK
  }
}

export async function createEcosystem(name: string): Promise<CreateEcosystemResponse> {
  const response = await apiClient.post<CreateEcosystemResponse>('/ecosystems', { name })
  return response.data
}
