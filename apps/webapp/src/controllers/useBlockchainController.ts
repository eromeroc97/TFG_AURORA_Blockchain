import { useEffect, useState } from 'react'
import {
  deploySmartContract as apiDeploySmartContract,
  getSmartContracts,
  getNetworkNodes,
  getOrganizations,
  getNamespaces,
  getRecentBlocks,
  getBlockchainEvents,
  getLedgerInfo,
  getBlockchainManagerStatus,
  getChannels,
  getContractVersions,
  type DeploySmartContractRequest,
  type SmartContract,
  type NetworkNode,
  type Organization,
  type ChannelNamespace,
  type BlockInfo,
  type BlockchainEvent,
  type Channel,
} from '../services/blockchain.service'

export function useBlockchainController(enabled = true) {
  const [smartContracts, setSmartContracts] = useState<SmartContract[]>([])
  const [contractVersions, setContractVersions] = useState<Record<string, string>>({})
  const [networkNodes, setNetworkNodes] = useState<NetworkNode[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [namespaces, setNamespaces] = useState<ChannelNamespace[]>([])
  const [blocks, setBlocks] = useState<BlockInfo[]>([])
  const [events, setEvents] = useState<BlockchainEvent[]>([])
  const [ledgerHeight, setLedgerHeight] = useState(0)
  const [ledgerLastBlockTime, setLedgerLastBlockTime] = useState('')
  const [managerStatus, setManagerStatus] = useState<'Online' | 'Offline'>('Offline')
  const [namespaceChannels, setNamespaceChannels] = useState<Record<string, Channel[]>>({})

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deployLoading, setDeployLoading] = useState(false)
  const [deploySuccess, setDeploySuccess] = useState(false)

  const fetchNamespaceChannels = async (namespaceName: string) => {
    if (namespaceChannels[namespaceName]) {
      return namespaceChannels[namespaceName]
    }
    const channels = await getChannels(namespaceName)
    setNamespaceChannels(prev => ({ ...prev, [namespaceName]: channels }))
    return channels
  }

  const refreshNetworkData = async () => {
    if (!enabled) {
      setSmartContracts([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    const results = await Promise.allSettled([
      getSmartContracts(),
      getNetworkNodes(),
      getOrganizations(),
      getNamespaces(),
      getRecentBlocks(10),
      getBlockchainEvents('default'),
      getLedgerInfo(),
      getBlockchainManagerStatus(),
    ])

    const [contractsResult, nodesResult, orgsResult, namespacesResult, blocksResult, eventsResult, ledgerResult, statusResult] = results

    const handleResult = <T,>(result: PromiseSettledResult<T>, onSuccess: (v: T) => void): boolean => {
      if (result.status === 'fulfilled') {
        onSuccess(result.value)
        return false
      }
      return true
    }

    let hasError = false

    if (contractsResult.status === 'fulfilled') {
      const contracts = Array.isArray(contractsResult.value) ? contractsResult.value : []
      setSmartContracts(contracts)
      if (contracts.length > 0) {
        const versions = await getContractVersions(contracts)
        setContractVersions(versions)
      }
    } else {
      setSmartContracts([])
      hasError = true
    }

    hasError = handleResult(nodesResult, v => setNetworkNodes(Array.isArray(v) ? v : [])) || hasError
    hasError = handleResult(orgsResult, v => setOrganizations(Array.isArray(v) ? v : [])) || hasError
    hasError = handleResult(namespacesResult, v => setNamespaces(Array.isArray(v) ? v : [])) || hasError
    hasError = handleResult(blocksResult, v => setBlocks(Array.isArray(v) ? v : [])) || hasError
    handleResult(eventsResult, v => setEvents(Array.isArray(v) ? v : []))
    hasError = handleResult(ledgerResult, v => {
      setLedgerHeight(typeof v?.height === 'number' ? v.height : 0)
      setLedgerLastBlockTime(String(v?.lastBlockTime ?? ''))
    }) || hasError
    hasError = handleResult(statusResult, v => setManagerStatus(v)) || hasError

    if (hasError) {
      setError('No se ha podido cargar completamente la información de la blockchain. Algunos datos pueden no estar disponibles.')
    }

    setIsLoading(false)
  }

  const deploySmartContract = async (data: DeploySmartContractRequest) => {
    setDeployLoading(true)
    setDeploySuccess(false)
    setError(null)

    try {
      await apiDeploySmartContract(data)
      setDeploySuccess(true)
      setTimeout(() => setDeploySuccess(false), 5000)
      await refreshNetworkData()
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      throw new Error(message || 'Error al desplegar el smart contract.')
    } finally {
      setDeployLoading(false)
    }
  }

  useEffect(() => {
    void refreshNetworkData()
  }, [enabled])

  return {
    smartContracts,
    contractVersions,
    networkNodes,
    organizations,
    namespaces,
    blocks,
    events,
    ledgerHeight,
    ledgerLastBlockTime,
    managerStatus,
    namespaceChannels,
    fetchNamespaceChannels,
    isLoading,
    error,
    deployLoading,
    deploySuccess,
    refreshNetworkData,
    deploySmartContract,
  }
}