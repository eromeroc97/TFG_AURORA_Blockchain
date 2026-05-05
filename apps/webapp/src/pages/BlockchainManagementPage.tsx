import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Cpu, Layers, Network, RefreshCw, Server, Activity, X } from 'lucide-react'
import DeploySmartContractModal from '../components/blockchain/DeploySmartContractModal'
import BlockchainTopologyGraph from '../components/blockchain/BlockchainTopologyGraph'
import Select from '../components/Select'
import { useBlockchainController } from '../controllers/useBlockchainController'

type ModalType = 'organizations' | 'namespaces' | 'ledger' | null

export default function BlockchainManagementPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [detailModal, setDetailModal] = useState<ModalType>(null)
  const {
    smartContracts,
    networkNodes,
    organizations,
    namespaces,
    blocks,
    ledgerHeight,
    blockPage,
    blockPageSize,
    setBlockPage,
    setBlockPageSize,
    fetchRecentBlocks,
    managerStatus,
    isLoading,
    error,
    deployLoading,
    deploySuccess,
    deploySmartContract,
  } = useBlockchainController()

  const [blockFilters, setBlockFilters] = useState({
    blockNumber: '',
    hash: '',
    txCount: '',
    startDate: '',
    endDate: '',
  })

  const handleDeploy = async (data: { name: string; version: string; channel: string; package: File }) => {
    await deploySmartContract(data)
    setIsModalOpen(false)
  }

  const openDetailModal = (type: ModalType) => {
    setDetailModal(type)
  }

  const closeDetailModal = () => {
    setDetailModal(null)
  }

  const handleBlockFilterChange = (field: keyof typeof blockFilters, value: string) => {
    setBlockFilters(prev => ({ ...prev, [field]: value }))
  }

  const handlePageSizeChange = async (value: number) => {
    setBlockPageSize(value)
    setBlockPage(1)
    await fetchRecentBlocks(value, 1)
  }

  const handlePageChange = async (newPage: number) => {
    if (newPage < 1) return
    setBlockPage(newPage)
    await fetchRecentBlocks(blockPageSize, newPage)
  }

  const filteredBlocks = useMemo(() => {
    return blocks.filter((block) => {
      const blockNumberMatch = blockFilters.blockNumber
        ? block.blockNumber.toString().includes(blockFilters.blockNumber)
        : true
      const hashMatch = blockFilters.hash
        ? block.blockHash.toLowerCase().includes(blockFilters.hash.toLowerCase())
        : true
      const txCountMatch = blockFilters.txCount
        ? block.transactionCount.toString().includes(blockFilters.txCount)
        : true
      const createdAt = block.createdAt ? new Date(block.createdAt) : null
      const startDateMatch = blockFilters.startDate
        ? Boolean(createdAt && createdAt >= new Date(blockFilters.startDate))
        : true
      const endDateMatch = blockFilters.endDate
        ? Boolean(createdAt && createdAt <= new Date(`${blockFilters.endDate}T23:59:59`))
        : true

      return blockNumberMatch && hashMatch && txCountMatch && startDateMatch && endDateMatch
    })
  }, [blocks, blockFilters])

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
              {isLoading ? '...' : ledgerHeight != null ? ledgerHeight.toLocaleString() : '-'}
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
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Bloques Recientes</h2>
                <span className="text-xs text-slate-500">
                  Mostrando {blocks.length} bloques
                </span>
              </div>
            </div>
          <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <label className="block text-sm text-slate-600">
              Bloque
              <input
                value={blockFilters.blockNumber}
                onChange={(e) => handleBlockFilterChange('blockNumber', e.target.value)}
                placeholder="Filtrar por número"
                className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm text-slate-700 outline-none focus:border-accent"
              />
            </label>
            <label className="block text-sm text-slate-600">
              Hash
              <input
                value={blockFilters.hash}
                onChange={(e) => handleBlockFilterChange('hash', e.target.value)}
                placeholder="Filtrar por hash"
                className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm text-slate-700 outline-none focus:border-accent"
              />
            </label>
            <label className="block text-sm text-slate-600">
              TXs
              <input
                value={blockFilters.txCount}
                onChange={(e) => handleBlockFilterChange('txCount', e.target.value)}
                placeholder="Filtrar por transacciones"
                className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm text-slate-700 outline-none focus:border-accent"
              />
            </label>
            <label className="block text-sm text-slate-600">
              Fecha
              <div className="mt-1 grid gap-2 sm:grid-cols-2">
                <input
                  type="date"
                  value={blockFilters.startDate}
                  onChange={(e) => handleBlockFilterChange('startDate', e.target.value)}
                  placeholder="Inicio"
                  className="w-full rounded-xl border border-border px-3 py-2 text-sm text-slate-700 outline-none focus:border-accent"
                />
                <input
                  type="date"
                  value={blockFilters.endDate}
                  onChange={(e) => handleBlockFilterChange('endDate', e.target.value)}
                  placeholder="Fin"
                  className="w-full rounded-xl border border-border px-3 py-2 text-sm text-slate-700 outline-none focus:border-accent"
                />
              </div>
            </label>
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
            <>
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
                    {filteredBlocks.map((block) => (
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

              <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">Mostrar</span>
                  <Select
                    value={String(blockPageSize)}
                    onChange={(value) => void handlePageSizeChange(Number(value))}
                    options={[
                      { value: '10', label: '10' },
                      { value: '25', label: '25' },
                      { value: '50', label: '50' },
                    ]}
                    className="w-20"
                  />
                  <span className="text-sm text-slate-500">resultados</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handlePageChange(blockPage - 1)}
                    disabled={blockPage === 1 || isLoading}
                    className="inline-flex items-center justify-center rounded-lg border border-border bg-white p-2 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  <span className="text-sm text-slate-600">
                    Página {blockPage} de {Math.max(1, Math.ceil((ledgerHeight ?? 0) / blockPageSize))}
                  </span>
                  <button
                    type="button"
                    onClick={() => void handlePageChange(blockPage + 1)}
                    disabled={blocks.length < blockPageSize || isLoading}
                    className="inline-flex items-center justify-center rounded-lg border border-border bg-white p-2 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              </div>
            </>
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
                      {ledgerHeight != null ? ledgerHeight.toLocaleString() : '-'}
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