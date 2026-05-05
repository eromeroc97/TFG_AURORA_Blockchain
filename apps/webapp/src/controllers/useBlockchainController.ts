import { useEffect, useState } from 'react'
import {
  deploySmartContract as apiDeploySmartContract,
  getSmartContracts,
  getNetworkNodes,
  getOrganizations,
  getNamespaces,
  getRecentBlocks,
  getLedgerInfo,
  type DeploySmartContractRequest,
  type SmartContract,
  type NetworkNode,
  type Organization,
  type ChannelNamespace,
  type BlockInfo,
} from '../services/blockchain.service'

export function useBlockchainController(enabled = true) {
  const [smartContracts, setSmartContracts] = useState<SmartContract[]>([])
  const [networkNodes, setNetworkNodes] = useState<NetworkNode[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [namespaces, setNamespaces] = useState<ChannelNamespace[]>([])
  const [blocks, setBlocks] = useState<BlockInfo[]>([])
  const [ledgerHeight, setLedgerHeight] = useState(0)
  const [ledgerLastBlockTime, setLedgerLastBlockTime] = useState('')

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deployLoading, setDeployLoading] = useState(false)
  const [deploySuccess, setDeploySuccess] = useState(false)

  const refreshNetworkData = async () => {
    if (!enabled) {
      setSmartContracts([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const [contracts, nodes, orgs, ns, recentBlocks, ledger] = await Promise.all([
        getSmartContracts(),
        getNetworkNodes(),
        getOrganizations(),
        getNamespaces(),
        getRecentBlocks(10),
        getLedgerInfo(),
      ])

      setSmartContracts(contracts)
      setNetworkNodes(nodes)
      setOrganizations(orgs)
      setNamespaces(ns)
      setBlocks(recentBlocks)
      setLedgerHeight(ledger.height)
      setLedgerLastBlockTime(ledger.lastBlockTime)
    } catch {
      setError('No se ha podido cargar la información de la blockchain.')
    } finally {
      setIsLoading(false)
    }
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
    networkNodes,
    organizations,
    namespaces,
    blocks,
    ledgerHeight,
    ledgerLastBlockTime,
    isLoading,
    error,
    deployLoading,
    deploySuccess,
    refreshNetworkData,
    deploySmartContract,
  }
}