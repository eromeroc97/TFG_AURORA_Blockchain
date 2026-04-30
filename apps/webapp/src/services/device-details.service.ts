import { apiClient } from '../api/axios'

type DeviceDetailsResponse = {
  payload: Record<string, unknown> | null
}

export async function getDeviceDetails(
  ecosystemId: string,
  macAddress: string,
): Promise<DeviceDetailsResponse> {
  try {
    const response = await apiClient.get<DeviceDetailsResponse>('/iot/devices/device-details', {
      params: { ecosystemId, macAddress },
    })
    return response.data
  } catch {
    return { payload: null }
  }
}