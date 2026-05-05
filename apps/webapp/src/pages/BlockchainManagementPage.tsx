import { useState } from 'react'
import { Cpu, Layers, Network, RefreshCw, Server, Activity, X, ChevronDown, ChevronRight } from 'lucide-react'
import DeploySmartContractModal from '../components/blockchain/DeploySmartContractModal'
import BlockchainTopologyGraph from '../components/blockchain/BlockchainTopologyGraph'
import { useBlockchainController } from '../controllers/useBlockchainController'
import type { Channel } from '../services/blockchain.service'

type ModalType = 'organizations' | 'namespaces' | 'ledger' | null

export default function BlockchainManagementPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [detailModal, setDetailModal] = useState<ModalType>(null)
  const [expandedNamespace, setExpandedNamespace] = useState<string | null>(null)
  const [loadingChannels, setLoadingChannels] = useState<Record<string, boolean>>({})
  const [namespaceChannels, setNamespaceChannels] = useState<Record<string, Channel[]>>({})
  const {
    smartContracts,
    networkNodes,
    organizations,
    namespaces,
    blocks,
    ledgerHeight,
    managerStatus,
    isLoading,
    error,
    deployLoading,
    deploySuccess,
    deploySmartContract,
  } = useBlockchainController()

  const handleDeploy = async (data: { name: string; version: string; channel: string; package: File }) => {
    await deploySmartContract(data)
    setIsModalOpen(false)
  }

  const toggleNamespace = async (namespaceName: string) => {
    if (expandedNamespace === namespaceName) {
      setExpandedNamespace(null)
    } else {
      setExpandedNamespace(namespaceName)
      if (!namespaceChannels[namespaceName] && !loadingChannels[namespaceName]) {
        setLoadingChannels(prev => ({ ...prev, [namespaceName]: true }))
        try {
          const response = await fetch(`/api/blockchain/namespaces/${namespaceName}/channels?namespace=${namespaceName}`)
          const data = await response.json()
          const channels = data.items ?? []
          setNamespaceChannels(prev => ({ ...prev, [namespaceName]: channels }))
        } catch {
          setNamespaceChannels(prev => ({ ...prev, [namespaceName]: [] }))
        } finally {
          setLoadingChannels(prev => ({ ...prev, [namespaceName]: false }))
        }
      }
    }
  }

  const openDetailModal = (type: ModalType) => {
    setDetailModal(type)
  }

  const closeDetailModal = () => {
    setDetailModal(null)
  }

  const cardClasses = "rounded-3xl border border-slate-200 bg-white p-5 shadow-sm cursor-pointer transition-all hover:shadow-md hover:border-teal-300"

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex items-center gap-3">
            <Cpu className="h-6 w-6 text-teal-600" />
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Gestión Blockchain</h1>
              <p className="text-slate-600 mt-2">
                Administra la infraestructura Hyperledger Fabric y monitoriza el ledger.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-2xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent/90"
          >
            <Server className="size-4" />
            Desplegar Smart Contract
          </button>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-amber-600" />
              <p className="text-sm text-slate-500">Blockchain Manager</p>
            </div>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {isLoading ? '...' : managerStatus}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Server className="h-5 w-5 text-emerald-600" />
              <p className="text-sm text-slate-500">Orderer</p>
            </div>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {isLoading ? '...' : networkNodes.length > 0 ? 'Activo' : '-'}
            </p>
          </div>

          <div 
            className={cardClasses}
            onClick={() => openDetailModal('organizations')}
          >
            <div className="flex items-center gap-2">
              <Network className="h-5 w-5 text-sky-600" />
              <p className="text-sm text-slate-500">Organizaciones</p>
            </div>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {isLoading ? '...' : organizations.length > 0 ? organizations.length : '-'}
            </p>
          </div>

          <div 
            className={cardClasses}
            onClick={() => openDetailModal('namespaces')}
          >
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-teal-600" />
              <p className="text-sm text-slate-500">Namespaces</p>
            </div>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {isLoading ? '...' : namespaces.length > 0 ? namespaces.length : '-'}
            </p>
          </div>

          <div 
            className={cardClasses}
            onClick={() => openDetailModal('ledger')}
          >
            <div className="flex items-center gap-2">
              <Cpu className="h-5 w-5 text-teal-600" />
              <p className="text-sm text-slate-500">Ledger Height</p>
            </div>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {isLoading ? '...' : ledgerHeight > 0 ? ledgerHeight.toLocaleString() : '-'}
            </p>
          </div>
        </div>

        <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Topología de Red</h2>
          </div>
          {isLoading ? (
            <div className="flex h-96 items-center justify-center">
              <RefreshCw className="size-8 animate-spin text-slate-400" />
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              {error}
            </div>
          ) : (
            <BlockchainTopologyGraph
              nodes={networkNodes}
              organizations={organizations}
            />
          )}
        </div>

        <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Bloques Recientes</h2>
            <span className="text-xs text-slate-500">
              Mostrando {blocks.length} bloques
            </span>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 rounded-2xl bg-slate-100" />
              ))}
            </div>
          ) : blocks.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
              <Cpu className="mx-auto size-8 text-slate-400" />
              <p className="mt-2 text-sm font-medium text-slate-700">
                No hay bloques en el ledger
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Bloque</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Hash</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">TXs</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {blocks.map((block) => (
                    <tr key={block.blockNumber}>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        #{block.blockNumber}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">
                        {block.blockHash.substring(0, 16)}...
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {block.transactionCount}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {block.createdAt
                          ? new Date(block.createdAt).toLocaleString('es-ES')
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Smart Contracts</h2>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:text-accent/80"
            >
              <Server className="size-4" />
              Desplegar nuevo
            </button>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-2xl bg-slate-100" />
              ))}
            </div>
          ) : smartContracts.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
              <Server className="mx-auto size-8 text-slate-400" />
              <p className="mt-2 text-sm font-medium text-slate-700">
                No hay smart contracts desplegados
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Despliega un nuevo smart contract para comenzar.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Nombre</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Versión</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Canal</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Estado</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {smartContracts.map((contract) => (
                    <tr key={contract.id}>
                      <td className="px-4 py-3 font-medium text-slate-900">{contract.name}</td>
                      <td className="px-4 py-3 text-slate-600">{contract.version}</td>
                      <td className="px-4 py-3 text-slate-600">{contract.channel}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            contract.status === 'active'
                              ? 'bg-emerald-100 text-emerald-700'
                              : contract.status === 'deploying'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {contract.status === 'active'
                            ? 'Activo'
                            : contract.status === 'deploying'
                              ? 'Desplegando'
                              : 'Fallido'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {new Date(contract.createdAt).toLocaleDateString('es-ES')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <DeploySmartContractModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onDeploy={handleDeploy}
        isLoading={deployLoading}
      />

      {deploySuccess && (
        <div className="fixed bottom-6 right-6 z-[80] rounded-2xl border border-accent/30 bg-accent/10 px-4 py-3 shadow-lg">
          <p className="text-sm font-medium text-accent">
            Despliegue iniciado. Esperando consenso de la red...
          </p>
        </div>
      )}

      {detailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={closeDetailModal} />
          <div className="relative z-10 w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <button
              onClick={closeDetailModal}
              className="absolute right-4 top-4 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="size-5" />
            </button>

            {detailModal === 'organizations' && (
              <>
                <h3 className="text-xl font-semibold text-slate-900">Organizaciones</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Total: {organizations.length} organizaciones
                </p>
                <div className="mt-4 max-h-64 space-y-2 overflow-y-auto">
                  {organizations.map((org) => (
                    <div key={org.id} className="rounded-xl border border-slate-200 p-3">
                      <p className="font-medium text-slate-900">{org.name}</p>
                      <p className="text-xs text-slate-500">{org.mspId}</p>
                    </div>
                  ))}
                </div>
              </>
            )}

            {detailModal === 'namespaces' && (
              <>
                <h3 className="text-xl font-semibold text-slate-900">Namespaces</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Total: {namespaces.length} namespaces
                </p>
                <div className="mt-4 max-h-64 space-y-2 overflow-y-auto">
                  {namespaces.map((ns) => (
                    <div key={ns.name}>
                      <button
                        onClick={() => toggleNamespace(ns.name)}
                        className="w-full flex items-center justify-between rounded-xl border border-slate-200 p-3 text-left hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          {loadingChannels[ns.name] ? (
                            <RefreshCw className="size-4 animate-spin text-slate-400" />
                          ) : expandedNamespace === ns.name ? (
                            <ChevronDown className="size-4 text-slate-600" />
                          ) : (
                            <ChevronRight className="size-4 text-slate-400" />
                          )}
                          <span className="font-medium text-slate-900">{ns.name}</span>
                        </div>
                        <span className="text-xs text-slate-500">
                          {namespaceChannels[ns.name]?.length ?? 0} canales
                        </span>
                      </button>
                      {expandedNamespace === ns.name && namespaceChannels[ns.name] && (
                        <div className="ml-6 mt-1 space-y-1 border-l-2 border-slate-200 pl-3">
                          {namespaceChannels[ns.name].length === 0 ? (
                            <p className="text-xs text-slate-400">Sin canales</p>
                          ) : (
                            namespaceChannels[ns.name].map((channel, idx) => (
                              <div key={idx} className="text-sm text-slate-600">
                                {channel.name || `Canal ${idx + 1}`}
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {detailModal === 'ledger' && (
              <>
                <h3 className="text-xl font-semibold text-slate-900">Ledger</h3>
                <div className="mt-4 space-y-3">
                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-sm text-slate-500">Altura actual</p>
                    <p className="text-2xl font-semibold text-slate-900">
                      {ledgerHeight.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-sm text-slate-500">Bloques totales</p>
                    <p className="text-2xl font-semibold text-slate-900">
                      {blocks.length}
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}