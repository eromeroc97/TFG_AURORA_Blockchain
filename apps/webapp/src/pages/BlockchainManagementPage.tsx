import { useMemo, useState } from 'react'
import { Cpu, Layers, Network, RefreshCw, Activity, X, Server, Search, ChevronLeft, ChevronRight, Filter, XCircle } from 'lucide-react'
import BlockchainTopologyGraph from '../components/blockchain/BlockchainTopologyGraph'
import RegisterChaincodeModal from '../components/blockchain/RegisterChaincodeModal'
import DeploymentHelpModal from '../components/blockchain/DeploymentHelpModal'
import Select from '../components/Select'
import { useBlockchainController } from '../controllers/useBlockchainController'
import { getContractInterface, type SmartContract } from '../services/blockchain.service'

const PAGE_SIZES = [10, 25, 50] as const

type ModalType = 'organizations' | 'namespaces' | 'ledger' | null

export default function BlockchainManagementPage() {
  const [detailModal, setDetailModal] = useState<ModalType>(null)
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false)
  const [blocksPageSize, setBlocksPageSize] = useState<(typeof PAGE_SIZES)[number]>(10)
  const [blocksCurrentPage, setBlocksCurrentPage] = useState(1)
  const [blocksSearchTerm, setBlocksSearchTerm] = useState('')
  const [blocksMinTxs, setBlocksMinTxs] = useState<number | ''>('')
  const [blocksMaxTxs, setBlocksMaxTxs] = useState<number | ''>('')
  const [blocksDateFrom, setBlocksDateFrom] = useState('')
  const [blocksDateTo, setBlocksDateTo] = useState('')
  const [showBlocksFilters, setShowBlocksFilters] = useState(false)
  const [selectedContract, setSelectedContract] = useState<SmartContract | null>(null)
  const [contractInterfaceJson, setContractInterfaceJson] = useState<string | null>(null)
  const [contractDetailLoading, setContractDetailLoading] = useState(false)
  const {
    smartContracts,
    contractVersions,
    networkNodes,
    organizations,
    namespaces,
    blocks,
    ledgerHeight,
    managerStatus,
    isLoading,
    error,
    refreshNetworkData,
  } = useBlockchainController()

  const openDetailModal = (type: ModalType) => {
    setDetailModal(type)
  }

  const closeDetailModal = () => {
    setDetailModal(null)
  }

  const cardClasses = "rounded-3xl border border-slate-200 bg-white p-5 shadow-sm cursor-pointer transition-all hover:shadow-md hover:border-teal-300"

  const filteredBlocks = useMemo(() => {
    return blocks.filter((block) => {
      const searchLower = blocksSearchTerm.toLowerCase()
      const matchesSearch = !blocksSearchTerm || 
        block.blockHash.toLowerCase().includes(searchLower) ||
        block.blockNumber.toString().includes(searchLower)

      const minTxs = blocksMinTxs !== '' ? Number(blocksMinTxs) : null
      const maxTxs = blocksMaxTxs !== '' ? Number(blocksMaxTxs) : null
      const matchesTxs = (!minTxs || block.transactionCount >= minTxs) && 
                         (!maxTxs || block.transactionCount <= maxTxs)

      const blockDate = block.createdAt ? new Date(block.createdAt) : null
      const matchesDateFrom = !blocksDateFrom || (blockDate && blockDate >= new Date(blocksDateFrom))
      const matchesDateTo = !blocksDateTo || (blockDate && blockDate <= new Date(blocksDateTo + 'T23:59:59'))

      return matchesSearch && matchesTxs && matchesDateFrom && matchesDateTo
    })
  }, [blocks, blocksSearchTerm, blocksMinTxs, blocksMaxTxs, blocksDateFrom, blocksDateTo])

  const totalBlocksPages = Math.ceil(filteredBlocks.length / blocksPageSize)
  const paginatedBlocks = useMemo(() => {
    const start = (blocksCurrentPage - 1) * blocksPageSize
    return filteredBlocks.slice(start, start + blocksPageSize)
  }, [filteredBlocks, blocksCurrentPage, blocksPageSize])

  const handleBlocksPageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalBlocksPages) {
      setBlocksCurrentPage(newPage)
    }
  }

  const handleBlocksPageSizeChange = (newSize: (typeof PAGE_SIZES)[number]) => {
    setBlocksPageSize(newSize)
    setBlocksCurrentPage(1)
  }

  const clearBlocksFilters = () => {
    setBlocksSearchTerm('')
    setBlocksMinTxs('')
    setBlocksMaxTxs('')
    setBlocksDateFrom('')
    setBlocksDateTo('')
    setBlocksCurrentPage(1)
  }

  const handleContractClick = async (contract: SmartContract) => {
    setSelectedContract(contract)
    setContractDetailLoading(true)
    setContractInterfaceJson(null)
    
    try {
      const response = await getContractInterface(contract.name)
      setContractInterfaceJson(JSON.stringify(response, null, 2))
      
      if (response?.info?.version) {
        setSelectedContract(prev => prev ? { ...prev, version: response.info.version } : null)
      }
    } catch (err) {
      setContractInterfaceJson(JSON.stringify({ error: 'Error al obtener la interfaz del contrato' }, null, 2))
    } finally {
      setContractDetailLoading(false)
    }
  }

  const syntaxHighlightJson = (json: string): string => {
    return json
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
        let cls = 'text-amber-600'
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = 'text-sky-600'
            match = match.replace(/:$/, '')
            return `<span class="${cls}">${match}</span>:`
          } else {
            cls = 'text-emerald-600'
          }
        } else if (/true|false/.test(match)) {
          cls = 'text-purple-600'
        } else if (/null/.test(match)) {
          cls = 'text-rose-600'
        }
        return `<span class="${cls}">${match}</span>`
      })
  }

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
              <p className="text-sm text-slate-500">Bloques totales</p>
            </div>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {isLoading ? '...' : blocks.length > 0 ? blocks.length.toLocaleString() : '0'}
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
          <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Bloques Recientes</h2>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center rounded-2xl border border-border bg-slate-50 px-3 py-2">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={blocksSearchTerm}
                  onChange={(e) => {
                    setBlocksSearchTerm(e.target.value)
                    setBlocksCurrentPage(1)
                  }}
                  placeholder="Buscar por hash o número..."
                  className="ml-2 w-40 border-none bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                />
              </div>
              <Select
                value={blocksPageSize}
                onChange={(value) => handleBlocksPageSizeChange(Number(value) as typeof PAGE_SIZES[number])}
                options={PAGE_SIZES.map((size) => ({ value: size, label: size.toString() }))}
              />
              <button
                type="button"
                onClick={() => setShowBlocksFilters(!showBlocksFilters)}
                className="inline-flex items-center gap-1 rounded-2xl border border-border px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
              >
                <Filter className="size-4" />
                Filtros
              </button>
            </div>
          </div>

          {showBlocksFilters && (
            <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 mb-2">
                    TXs Mínimo
                  </label>
                  <input
                    type="number"
                    value={blocksMinTxs}
                    onChange={(e) => {
                      setBlocksMinTxs(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))
                      setBlocksCurrentPage(1)
                    }}
                    placeholder="0"
                    min="0"
                    className="w-full rounded-xl border border-border px-3 py-2 text-sm text-slate-700 outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 mb-2">
                    TXs Máximo
                  </label>
                  <input
                    type="number"
                    value={blocksMaxTxs}
                    onChange={(e) => {
                      setBlocksMaxTxs(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))
                      setBlocksCurrentPage(1)
                    }}
                    placeholder="Sin límite"
                    min="0"
                    className="w-full rounded-xl border border-border px-3 py-2 text-sm text-slate-700 outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 mb-2">
                    Desde
                  </label>
                  <input
                    type="date"
                    value={blocksDateFrom}
                    onChange={(e) => {
                      setBlocksDateFrom(e.target.value)
                      setBlocksCurrentPage(1)
                    }}
                    className="w-full rounded-xl border border-border px-3 py-2 text-sm text-slate-700 outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 mb-2">
                    Hasta
                  </label>
                  <input
                    type="date"
                    value={blocksDateTo}
                    onChange={(e) => {
                      setBlocksDateTo(e.target.value)
                      setBlocksCurrentPage(1)
                    }}
                    className="w-full rounded-xl border border-border px-3 py-2 text-sm text-slate-700 outline-none focus:border-accent"
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={clearBlocksFilters}
                  className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200"
                >
                  <XCircle className="size-4" />
                  Limpiar
                </button>
              </div>
            </div>
          )}

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
          ) : filteredBlocks.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
              <Cpu className="mx-auto size-8 text-slate-400" />
              <p className="mt-2 text-sm font-medium text-slate-700">
                No hay bloques para los filtros seleccionados
              </p>
            </div>
          ) : (
            <>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span>
                  Mostrando {paginatedBlocks.length} de {filteredBlocks.length} bloque
                  {filteredBlocks.length === 1 ? '' : 's'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleBlocksPageChange(blocksCurrentPage - 1)}
                    disabled={blocksCurrentPage === 1}
                    className="rounded-lg p-1 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span>
                    Página {blocksCurrentPage} de {totalBlocksPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleBlocksPageChange(blocksCurrentPage + 1)}
                    disabled={blocksCurrentPage === totalBlocksPages}
                    className="rounded-lg p-1 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
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
                    {paginatedBlocks.map((block) => (
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
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span>
                  Mostrando {paginatedBlocks.length} de {filteredBlocks.length} bloque
                  {filteredBlocks.length === 1 ? '' : 's'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleBlocksPageChange(blocksCurrentPage - 1)}
                    disabled={blocksCurrentPage === 1}
                    className="rounded-lg p-1 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span>
                    Página {blocksCurrentPage} de {totalBlocksPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleBlocksPageChange(blocksCurrentPage + 1)}
                    disabled={blocksCurrentPage === totalBlocksPages}
                    className="rounded-lg p-1 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              {smartContracts.length === 1 ? 'Smart Contract' : 'Smart Contracts'}
            </h2>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsRegisterModalOpen(true)}
                className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:text-accent/80"
              >
                <Layers className="size-4" />
                Registrar Smart Contract
              </button>
              <DeploymentHelpModal />
            </div>
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
                No hay smart contracts disponibles en la red.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Nombre</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Versión</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Namespace</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Estado</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {smartContracts.map((contract) => (
                    <tr 
                      key={contract.id} 
                      onClick={() => handleContractClick(contract)}
                      className="cursor-pointer hover:bg-slate-50"
                    >
                      <td className="px-4 py-3 font-medium text-slate-900">{contract.name}</td>
                      <td className="px-4 py-3 text-slate-600">{contractVersions[contract.id] || contract.version}</td>
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
                      <p className="text-xs text-slate-500">
                        {org.description ?? org.id}
                      </p>
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
                    <div key={ns.name} className="rounded-xl border border-slate-200 p-3">
                      <p className="font-medium text-slate-900">{ns.name}</p>
                      <p className="text-xs text-slate-500">
                        {ns.description ?? 'Sin descripción'}
                      </p>
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
                      {ledgerHeight > 0 ? ledgerHeight.toLocaleString() : '-'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-sm text-slate-500">Bloques recientes</p>
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

      <RegisterChaincodeModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        onSuccess={() => refreshNetworkData()}
      />

      {selectedContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelectedContract(null)} />
          <div className="relative z-10 w-[80vw] max-h-[90vh] overflow-hidden rounded-3xl bg-white p-6 shadow-2xl flex flex-col">
            <button
              onClick={() => setSelectedContract(null)}
              className="absolute right-4 top-4 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="size-5" />
            </button>

            <h3 className="text-xl font-semibold text-slate-900">Detalle de Smart Contract</h3>
            <p className="mt-1 text-sm text-slate-500">
              {selectedContract.name}
            </p>

            <div className="mt-4 space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-slate-500">Versión</p>
                  <p className="text-sm text-slate-900">{selectedContract.version}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Namespace</p>
                  <p className="text-sm text-slate-900">{selectedContract.channel}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Estado</p>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      selectedContract.status === 'active'
                        ? 'bg-emerald-100 text-emerald-700'
                        : selectedContract.status === 'deploying'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {selectedContract.status === 'active'
                      ? 'Activo'
                      : selectedContract.status === 'deploying'
                        ? 'Desplegando'
                        : 'Fallido'}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Fecha</p>
                  <p className="text-sm text-slate-900">
                    {new Date(selectedContract.createdAt).toLocaleDateString('es-ES')}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 flex-1 min-h-0 flex flex-col">
              <p className="text-xs font-medium text-slate-500 mb-2">Interfaz (Swagger JSON)</p>
              {contractDetailLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="size-6 animate-spin text-slate-400" />
                </div>
              ) : contractInterfaceJson ? (
                <div className="flex-1 overflow-x-auto overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <pre 
                    className="text-xs font-mono text-slate-700 whitespace-pre"
                    dangerouslySetInnerHTML={{ __html: syntaxHighlightJson(contractInterfaceJson) }}
                  />
                </div>
              ) : (
                <p className="text-sm text-slate-500">No se pudo cargar la interfaz</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}