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
      getBlockchainEvents('default', 10),
      getLedgerInfo(),
      getBlockchainManagerStatus(),
    ])

    const [contractsResult, nodesResult, orgsResult, namespacesResult, blocksResult, eventsResult, ledgerResult, statusResult] = results
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

    if (nodesResult.status === 'fulfilled') {
      setNetworkNodes(Array.isArray(nodesResult.value) ? nodesResult.value : [])
    } else {
      setNetworkNodes([])
      hasError = true
    }

    if (orgsResult.status === 'fulfilled') {
      setOrganizations(Array.isArray(orgsResult.value) ? orgsResult.value : [])
    } else {
      setOrganizations([])
      hasError = true
    }

    if (namespacesResult.status === 'fulfilled') {
      setNamespaces(Array.isArray(namespacesResult.value) ? namespacesResult.value : [])
    } else {
      setNamespaces([])
      hasError = true
    }

    if (blocksResult.status === 'fulfilled') {
      setBlocks(Array.isArray(blocksResult.value) ? blocksResult.value : [])
    } else {
      setBlocks([])
      hasError = true
    }

    if (eventsResult.status === 'fulfilled') {
      const eventsArray = eventsResult.value as BlockchainEvent[]
      setEvents(Array.isArray(eventsArray) ? eventsArray : [])
    } else {
      setEvents([])
    }

    if (ledgerResult.status === 'fulfilled') {
      setLedgerHeight(typeof ledgerResult.value?.height === 'number' ? ledgerResult.value.height : 0)
      setLedgerLastBlockTime(String(ledgerResult.value?.lastBlockTime ?? ''))
    } else {
      setLedgerHeight(0)
      setLedgerLastBlockTime('')
      hasError = true
    }

    if (statusResult.status === 'fulfilled') {
      setManagerStatus(statusResult.value)
    } else {
      setManagerStatus('Offline')
      hasError = true
    }

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