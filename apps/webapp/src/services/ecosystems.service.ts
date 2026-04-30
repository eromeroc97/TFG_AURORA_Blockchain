import { apiClient } from '../api/axios'
import { ACCESS_MAP_ECOSYSTEMS_MOCK, type AccessMapEcosystem, type AccessMapDevice } from '../components/dashboard/access-map.data'

type ApiEcosystem = {
  id: string
  name: string
  ownerId: string
  latitude: number | null
  longitude: number | null
  accessType?: 'OWNER' | 'DELEGATED'
  accessRole?: 'VIEWER' | 'EDITOR'
}

type ApiDevice = {
  id: string
  name: string
  category: string | null
  room: string | null
  type: string
  status: string
  lastSeen: string | null
  vendor: string | null
  macAddress: string | null
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
  category: device.category ?? undefined,
  room: device.room ?? undefined,
  type: device.type,
  status: device.status,
  lastSeen: device.lastSeen,
  isOnline: device.status === 'ONLINE',
  vendor: device.vendor,
  macAddress: device.macAddress,
})

export async function getEcosystems(): Promise<AccessMapEcosystem[]> {
  try {
    const response = await apiClient.get<ApiEcosystem[]>('/ecosystems')

    const ecosystemsWithDevices = await Promise.all(
      response.data.map(async (ecosystem) => {
        const isDelegated = ecosystem.accessType === 'DELEGATED'
        try {
          const devicesResponse = await apiClient.get<ApiDevice[]>(`/ecosystems/${ecosystem.id}/devices`)
          return {
            id: ecosystem.id,
            name: ecosystem.name,
            ownerId: ecosystem.ownerId,
            lat: ecosystem.latitude,
            lng: ecosystem.longitude,
            isShared: isDelegated,
            accessType: ecosystem.accessType,
            accessRole: ecosystem.accessRole,
            devices: devicesResponse.data.map(mapApiDeviceToAccessMap),
          }
        } catch {
          return {
            id: ecosystem.id,
            name: ecosystem.name,
            ownerId: ecosystem.ownerId,
            lat: ecosystem.latitude,
            lng: ecosystem.longitude,
            isShared: isDelegated,
            accessType: ecosystem.accessType,
            accessRole: ecosystem.accessRole,
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

export type AccessRole = 'VIEWER' | 'EDITOR'

export type EcosystemAccess = {
  userId: string
  email: string
  role: AccessRole
  grantedAt: string
}

export async function grantAccess(ecosystemId: string, email: string, role: AccessRole = 'VIEWER'): Promise<void> {
  await apiClient.post(`/ecosystems/${ecosystemId}/accesses`, { email, role })
}

export async function revokeAccess(ecosystemId: string, userId: string): Promise<void> {
  await apiClient.delete(`/ecosystems/${ecosystemId}/accesses/${userId}`)
}

export async function updateAccessRole(ecosystemId: string, userId: string, role: AccessRole): Promise<void> {
  await apiClient.patch(`/ecosystems/${ecosystemId}/accesses/${userId}`, { role })
}

export async function getEcosystemAccesses(ecosystemId: string): Promise<EcosystemAccess[]> {
  const response = await apiClient.get<EcosystemAccess[]>(`/ecosystems/${ecosystemId}/accesses`)
  return response.data
}

export async function getSharedWithMe(): Promise<AccessMapEcosystem[]> {
  try {
    const response = await apiClient.get<ApiEcosystem[]>('/ecosystems/shared-with-me')

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
            isShared: true,
            accessType: 'DELEGATED' as const,
            accessRole: ecosystem.accessRole,
            devices: devicesResponse.data.map(mapApiDeviceToAccessMap),
          }
        } catch {
          return {
            id: ecosystem.id,
            name: ecosystem.name,
            ownerId: ecosystem.ownerId,
            lat: ecosystem.latitude,
            lng: ecosystem.longitude,
            isShared: true,
            accessType: 'DELEGATED' as const,
            accessRole: ecosystem.accessRole,
            devices: [],
          }
        }
      }),
    )

    return ecosystemsWithDevices
  } catch {
    return []
  }
}

export async function getMyEcosystems(): Promise<AccessMapEcosystem[]> {
  try {
    const response = await apiClient.get<ApiEcosystem[]>('/ecosystems/my-ecosystems')

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
            accessType: 'OWNER' as const,
            accessRole: ecosystem.accessRole,
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
            accessType: 'OWNER' as const,
            accessRole: ecosystem.accessRole,
            devices: [],
          }
        }
      }),
    )

    return ecosystemsWithDevices
  } catch {
    return []
  }
}
