import { apiClient } from '../api/axios'
import { ACCESS_MAP_ECOSYSTEMS_MOCK, type AccessMapEcosystem } from '../components/dashboard/access-map.data'

type ApiEcosystem = {
  id: string
  name: string
  ownerId: string
  latitude: number | null
  longitude: number | null
}

export async function getMapEcosystems(): Promise<AccessMapEcosystem[]> {
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
