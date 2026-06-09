import { apiClient } from '../api/axios'

export type AccessMapDevice = {
  id: string
  name: string
  macAddress?: string | null
  vendor?: string | null
  ecosystemId?: string
  createdAt?: string
  updatedAt?: string
  category?: string
  room?: string
  status?: string
  lastSeen?: string | null
  isOnline?: boolean
  payload?: Record<string, unknown>
  type?: string
}

export type AccessMapEcosystem = {
  id: string
  name: string
  ownerId?: string
  lat: number | null
  lng: number | null
  isShared: boolean
  devices: AccessMapDevice[]
  accessType?: 'OWNER' | 'DELEGATED'
  accessRole?: 'VIEWER' | 'EDITOR' | 'OWNER'
  sharedUsers?: EcosystemAccess[]
}

export type EcosystemAccess = {
  userId: string
  userEmail: string
  role: 'VIEWER' | 'EDITOR'
  createdAt: string
  status: string
}

type ApiEcosystem = {
  id: string
  name: string
  ownerId: string
  latitude: number | null
  longitude: number | null
  accessType?: 'OWNER' | 'DELEGATED'
  accessRole?: 'VIEWER' | 'EDITOR'
  isShared?: boolean
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
}

export async function createEcosystem(name: string): Promise<CreateEcosystemResponse> {
  const response = await apiClient.post<CreateEcosystemResponse>('/ecosystems', { name })
  return response.data
}

export type AccessRole = 'VIEWER' | 'EDITOR'

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

export async function leaveSharedEcosystem(ecosystemId: string): Promise<void> {
  await apiClient.delete(`/ecosystems/${ecosystemId}/leave`)
}

export async function getSharedWithMe(): Promise<AccessMapEcosystem[]> {
  try {
    const response = await apiClient.get<Array<{
      ecosystemId: string
      ecosystemName: string
      ecosystemStatus: string
      ecosystemLatitude: number | null
      ecosystemLongitude: number | null
      ecosystemIsOnline: boolean | null
      ecosystemLastSeen: string | null
      ecosystemOwnerId: string | null
      role: string
      accessType: 'DELEGATED'
    }>>('/ecosystems/shared-with-me')

    const ecosystemsWithDevices = await Promise.all(
      response.data.map(async (ecosystem) => {
        try {
          const devicesResponse = await apiClient.get<ApiDevice[]>(`/ecosystems/${ecosystem.ecosystemId}/devices`)
          return {
            id: ecosystem.ecosystemId,
            name: ecosystem.ecosystemName,
            ownerId: ecosystem.ecosystemOwnerId ?? undefined,
            lat: ecosystem.ecosystemLatitude,
            lng: ecosystem.ecosystemLongitude,
            isShared: true,
            accessType: 'DELEGATED' as const,
            accessRole: ecosystem.role as 'VIEWER' | 'EDITOR' | 'OWNER',
            devices: devicesResponse.data.map(mapApiDeviceToAccessMap),
          }
        } catch {
          return {
            id: ecosystem.ecosystemId,
            name: ecosystem.ecosystemName,
            ownerId: ecosystem.ecosystemOwnerId ?? undefined,
            lat: ecosystem.ecosystemLatitude,
            lng: ecosystem.ecosystemLongitude,
            isShared: true,
            accessType: 'DELEGATED' as const,
            accessRole: ecosystem.role as 'VIEWER' | 'EDITOR' | 'OWNER',
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
        const isDelegated = ecosystem.accessType === 'DELEGATED'
        const isShared = isDelegated || ecosystem.isShared === true
        try {
          const devicesResponse = await apiClient.get<ApiDevice[]>(`/ecosystems/${ecosystem.id}/devices`)
          return {
            id: ecosystem.id,
            name: ecosystem.name,
            ownerId: ecosystem.ownerId,
            lat: ecosystem.latitude,
            lng: ecosystem.longitude,
            isShared,
            accessType: ecosystem.accessType ?? 'OWNER',
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
            isShared,
            accessType: ecosystem.accessType ?? 'OWNER',
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

export type UserEcosystem = {
  id: string
  name: string
  ownerId: string
  latitude: number | null
  longitude: number | null
  accessType: 'OWNER' | 'DELEGATED'
  accessRole?: 'VIEWER' | 'EDITOR'
}

export async function getUserEcosystems(userId: string): Promise<UserEcosystem[]> {
  try {
    const response = await apiClient.get<UserEcosystem[]>(`/ecosystems/by-user/${userId}`)
    return response.data
  } catch {
    return []
  }
}