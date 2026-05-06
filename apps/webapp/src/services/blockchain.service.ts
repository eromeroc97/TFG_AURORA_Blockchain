import { apiClient } from '../api/axios'

export interface SmartContract {
  id: string
  name: string
  version: string
  channel: string
  status: 'deploying' | 'active' | 'failed'
  createdAt: string
}

export interface DeploySmartContractRequest {
  name: string
  version: string
  channel: string
  package: File
}

export interface NetworkNode {
  id: string
  name: string
  organization: string
  status: string
  url?: string
}

export interface Organization {
  id: string
  name: string
  description?: string
  message?: string
}

export interface ChannelNamespace {
  name: string
  description?: string
  type: string
  created?: string
}

export interface Transaction {
  id: string
  type: string
  blockNumber?: number
  createdAt: string
  status: string
  from?: string
  to?: string
}

export interface BlockInfo {
  blockNumber: number
  blockHash: string
  previousBlockHash: string
  dataHash: string
  transactionCount: number
  createdAt: string
  transactions: Transaction[]
}

export interface Channel {
  name: string
  description?: string
}

export async function getChannels(namespace: string): Promise<Channel[]> {
  try {
    const response = await apiClient.get<{ items: Channel[] }>(
      `/blockchain/namespaces/${namespace}/channels`,
      { params: { namespace } }
    )
    return response.data.items ?? []
  } catch {
    return []
  }
}

function normalizeSmartContract(item: any): SmartContract {
  const normalizedStatus = ['deploying', 'active', 'failed'].includes(item?.status)
    ? item.status
    : 'active'

  return {
    id: String(item?.id ?? item?.name ?? ''),
    name: String(item?.name ?? item?.interface?.name ?? 'Desconocido'),
    version: String(item?.version ?? item?.interface?.version ?? '-'),
    channel: String(item?.channel ?? item?.namespace ?? 'default'),
    status: normalizedStatus as SmartContract['status'],
    createdAt: String(item?.createdAt ?? item?.created ?? new Date().toISOString()),
  }
}

function extractSmartContractItems(responseData: any): SmartContract[] {
  if (Array.isArray(responseData)) {
    return responseData.map(normalizeSmartContract)
  }

  if (responseData && typeof responseData === 'object') {
    const payload = Array.isArray(responseData.items)
      ? responseData.items
      : Array.isArray(responseData.data)
      ? responseData.data
      : []

    if (Array.isArray(payload)) {
      return payload.map(normalizeSmartContract)
    }
  }

  return []
}

export async function getSmartContracts(): Promise<SmartContract[]> {
  try {
    const response = await apiClient.get('/blockchain/contracts')
    return extractSmartContractItems(response.data)
  } catch {
    return []
  }
}

export async function deploySmartContract(data: DeploySmartContractRequest): Promise<{ id: string }> {
  const formData = new FormData()
  formData.append('name', data.name)
  formData.append('version', data.version)
  formData.append('channel', data.channel)
  formData.append('package', data.package)

  const response = await apiClient.post<{ id: string }>('/blockchain/contracts/deploy', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })

  return response.data
}

export async function getNetworkNodes(): Promise<NetworkNode[]> {
  try {
    const response = await apiClient.get<{ items: NetworkNode[] }>('/blockchain/network/nodes')
    return response.data.items ?? []
  } catch {
    return []
  }
}

export async function getOrganizations(): Promise<Organization[]> {
  try {
    const response = await apiClient.get<{ items: Organization[] }>('/blockchain/network/organizations')
    return response.data.items ?? []
  } catch {
    return []
  }
}

export async function getNamespaces(): Promise<ChannelNamespace[]> {
  try {
    const response = await apiClient.get<{ items: ChannelNamespace[] }>('/blockchain/namespaces')
    return response.data.items ?? []
  } catch {
    return []
  }
}

export async function getRecentBlocks(limit = 10): Promise<BlockInfo[]> {
  try {
    const response = await apiClient.get<BlockInfo[]>('/blockchain/blocks', {
      params: { limit },
    })
    return response.data
  } catch {
    return []
  }
}

export async function getRecentTransactions(limit = 20): Promise<Transaction[]> {
  try {
    const response = await apiClient.get<{ items: Transaction[] }>('/blockchain/transactions', {
      params: { limit },
    })
    return response.data.items ?? []
  } catch {
    return []
  }
}

export async function getLedgerInfo(): Promise<{ height: number; lastBlockTime: string }> {
  try {
    const response = await apiClient.get<{ height: number; lastBlockTime: string }>('/blockchain/ledger/info')
    return response.data
  } catch {
    return { height: 0, lastBlockTime: '' }
  }
}

export async function getBlockchainManagerStatus(): Promise<'Online' | 'Offline'> {
  try {
    const response = await apiClient.get<{ status: string }>('/blockchain/health')
    return response.data.status === 'UP' ? 'Online' : 'Offline'
  } catch {
    return 'Offline'
  }
}

export interface RegisterChaincodeRequest {
  apiName: string
  channel: string
  chaincodeName: string
  ffiJson: string
}

export interface RegisterChaincodeResponse {
  success: boolean
  message: string
  ffiId?: string
}

export async function registerChaincode(
  data: RegisterChaincodeRequest
): Promise<RegisterChaincodeResponse> {
  const response = await apiClient.post<RegisterChaincodeResponse>(
    '/blockchain/register-chaincode',
    data
  )
  return response.data
}

export interface ContractInterfaceResponse {
  id?: string
  name?: string
  version?: string
  description?: string
  methods?: unknown[]
  events?: unknown[]
  [key: string]: unknown
}

export async function getContractInterface(name: string): Promise<ContractInterfaceResponse> {
  const response = await apiClient.get<ContractInterfaceResponse>(
    '/blockchain/contracts/interface',
    { params: { name } }
  )
  return response.data
}

export async function getContractVersions(contracts: SmartContract[]): Promise<Record<string, string>> {
  const versions: Record<string, string> = {}
  
  await Promise.allSettled(
    contracts.map(async (contract) => {
      try {
        const response = await getContractInterface(contract.name)
        if (response?.info?.version) {
          versions[contract.id] = response.info.version
        }
      } catch {
        // Ignore errors for individual contracts
      }
    })
  )
  
  return versions
}