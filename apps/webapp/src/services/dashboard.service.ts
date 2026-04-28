import { apiClient } from '../api/axios'
import { ACCESS_MAP_ECOSYSTEMS_MOCK, type AccessMapEcosystem } from '../components/dashboard/access-map.data'

export async function getMapEcosystems(): Promise<AccessMapEcosystem[]> {
  try {
    const response = await apiClient.get<AccessMapEcosystem[]>('/ecosystems')
    return response.data
  } catch {
    return ACCESS_MAP_ECOSYSTEMS_MOCK
  }
}
