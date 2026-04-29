import { apiClient } from '../api/axios'
import { ACCESS_MAP_ECOSYSTEMS_MOCK, type AccessMapEcosystem, type AccessMapDevice } from '../components/dashboard/access-map.data'

type ApiEcosystem = {
  id: string
  name: string
  ownerId: string
  latitude: number | null
  longitude: number | null
}

type ApiDevice = {
  id: string
  name: string
  type: string
  status: string
  lastSeen: string | null
}

type CreateEcosystemResponse = {
  id: string
  name: string
  ownerId: string
  apiKey: string
  latitude: number | null
  longitude: number | null
}

const mapApiDeviceToAccessMap = (device: ApiDevice): AccessMapDevice => ({
  id: device.id,
  name: device.name,
  type: device.type,
  status: device.status,
  lastSeen: device.lastSeen,
  isOnline: device.status === 'ONLINE',
})

export async function getEcosystems(): Promise<AccessMapEcosystem[]> {
  try {
    const response = await apiClient.get<ApiEcosystem[]>('/ecosystems')

    const ecosystemsWithDevices = await Promise.all(
      response.data.map(async (ecosystem) => {
        try {
          const devicesResponse = await apiClient.get<ApiDevice[]>(`/ecosystems/${ecosystem.id}/devices`)
          return {
            id: ecosystem.id,
            name: ecosystem.name,
            ownerId: ecosystem.ownerId,
            lat: ecosystem.latitude,
            lng: ecosystem.longitude,
            isShared: false,
            devices: devicesResponse.data.map(mapApiDeviceToAccessMap),
          }
        } catch {
          return {
            id: ecosystem.id,
            name: ecosystem.name,
            ownerId: ecosystem.ownerId,
            lat: ecosystem.latitude,
            lng: ecosystem.longitude,
            isShared: false,
            devices: [],
          }
        }
      }),
    )

    return ecosystemsWithDevices
  } catch {
    return ACCESS_MAP_ECOSYSTEMS_MOCK
  }
}

export async function createEcosystem(name: string): Promise<CreateEcosystemResponse> {
  const response = await apiClient.post<CreateEcosystemResponse>('/ecosystems', { name })
  return response.data
}
