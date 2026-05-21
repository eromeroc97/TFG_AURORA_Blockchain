import { useMemo, useState } from 'react'
import { Cpu, Layers, Network, RefreshCw, Activity, X, Server, Search, ChevronLeft, ChevronRight, Filter, XCircle, Pencil, Trash2 } from 'lucide-react'
import { useAuth } from '../context/auth-context'
import BlockchainTopologyGraph from '../components/blockchain/BlockchainTopologyGraph'
import RegisterChaincodeModal from '../components/blockchain/RegisterChaincodeModal'
import DeploymentHelpModal from '../components/blockchain/DeploymentHelpModal'
import Select from '../components/Select'
import { useBlockchainController } from '../controllers/useBlockchainController'
import { getContractInterface, deleteChaincode, type SmartContract, type BlockchainEvent } from '../services/blockchain.service'

const PAGE_SIZES = [10, 25, 50] as const

type ModalType = 'organizations' | 'namespaces' | 'ledger' | 'event' | null

export default function BlockchainManagementPage() {
  const [detailModal, setDetailModal] = useState<ModalType>(null)
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false)
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; name: string }>({ open: false, name: '' })
  const [selectedEvent, setSelectedEvent] = useState<BlockchainEvent | null>(null)
  const [eventsSearchTerm, setEventsSearchTerm] = useState('')
  const [eventsPageSize, setEventsPageSize] = useState<(typeof PAGE_SIZES)[number]>(10)
  const [eventsCurrentPage, setEventsCurrentPage] = useState(1)
  const [eventsNamespaceFilter, setEventsNamespaceFilter] = useState('')
  const [eventsSourceFilter, setEventsSourceFilter] = useState('')
  const [eventsTxFilter, setEventsTxFilter] = useState('')
  const [eventsDateFrom, setEventsDateFrom] = useState('')
  const [eventsDateTo, setEventsDateTo] = useState('')
  const [showEventsFilters, setShowEventsFilters] = useState(false)
  const [contractsSearchTerm, setContractsSearchTerm] = useState('')
  const [contractStatusFilter, setContractStatusFilter] = useState('')
  const [contractChannelFilter, setContractChannelFilter] = useState('')
  const [showContractFilters, setShowContractFilters] = useState(false)
  const [contractsPageSize, setContractsPageSize] = useState<(typeof PAGE_SIZES)[number]>(10)
  const [contractsCurrentPage, setContractsCurrentPage] = useState(1)
  const [selectedContract, setSelectedContract] = useState<SmartContract | null>(null)
  const [contractInterfaceJson, setContractInterfaceJson] = useState<string | null>(null)
  const [contractDetailLoading, setContractDetailLoading] = useState(false)
  const {
    smartContracts,
    contractVersions,
    networkNodes,
    organizations,
    namespaces,
    events,
    managerStatus,
    isLoading,
    error,
    refreshNetworkData,
  } = useBlockchainController()

  const { authClaims } = useAuth()
  const role = (authClaims?.role ?? 'USER').toUpperCase()
  const isGlobalAdmin = role === 'GLOBAL_ADMIN'
  const isAdmin = role === 'ADMIN'

  const openDetailModal = (type: ModalType) => {
    setDetailModal(type)
  }

  const closeDetailModal = () => {
    setDetailModal(null)
  }

  const cardClasses = "rounded-3xl border border-slate-200 bg-white p-5 shadow-sm cursor-pointer transition-all hover:shadow-md hover:border-teal-300"

  const filteredContracts = useMemo(() => {
    return smartContracts.filter((contract) => {
      const searchLower = contractsSearchTerm.toLowerCase()
      const matchesSearch = !contractsSearchTerm ||
        contract.name.toLowerCase().includes(searchLower) ||
        contract.channel.toLowerCase().includes(searchLower)

      const matchesStatus = !contractStatusFilter || contract.status === contractStatusFilter
      const matchesChannel = !contractChannelFilter || contract.channel === contractChannelFilter

      return matchesSearch && matchesStatus && matchesChannel
    })
  }, [smartContracts, contractsSearchTerm, contractStatusFilter, contractChannelFilter])

  const totalContractsPages = Math.ceil(filteredContracts.length / contractsPageSize)
  const paginatedContracts = useMemo(() => {
    const start = (contractsCurrentPage - 1) * contractsPageSize
    return filteredContracts.slice(start, start + contractsPageSize)
  }, [filteredContracts, contractsCurrentPage, contractsPageSize])

  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      if (eventsSearchTerm && !event.name.toLowerCase().includes(eventsSearchTerm.toLowerCase()) &&
          !event.id.toLowerCase().includes(eventsSearchTerm.toLowerCase())) {
        return false
      }
      if (eventsNamespaceFilter && event.namespace !== eventsNamespaceFilter) {
        return false
      }
      if (eventsSourceFilter && event.source !== eventsSourceFilter) {
        return false
      }
      if (eventsTxFilter) {
        const txId = event.tx?.blockchainId || ''
        if (!txId.toLowerCase().includes(eventsTxFilter.toLowerCase())) {
          return false
        }
      }
      if (eventsDateFrom || eventsDateTo) {
        if (!event.timestamp) return false
        const eventDate = new Date(event.timestamp)
        if (eventsDateFrom) {
          const from = new Date(eventsDateFrom)
          from.setHours(0, 0, 0, 0)
          if (eventDate < from) return false
        }
        if (eventsDateTo) {
          const to = new Date(eventsDateTo)
          to.setHours(23, 59, 59, 999)
          if (eventDate > to) return false
        }
      }
      return true
    })
  }, [events, eventsSearchTerm, eventsNamespaceFilter, eventsSourceFilter, eventsTxFilter, eventsDateFrom, eventsDateTo])

  const totalEventsPages = Math.ceil(filteredEvents.length / eventsPageSize)
  const paginatedEvents = useMemo(() => {
    const start = (eventsCurrentPage - 1) * eventsPageSize
    return filteredEvents.slice(start, start + eventsPageSize)
  }, [filteredEvents, eventsCurrentPage, eventsPageSize])

  const lastHourEvents = useMemo(() => {
    const oneHourAgo = new Date()
    oneHourAgo.setHours(oneHourAgo.getHours() - 1)
    return events.filter(event => {
      if (!event.timestamp) return false
      const eventDate = new Date(event.timestamp)
      return eventDate >= oneHourAgo
    }).length
  }, [events])

  const clearContractFilters = () => {
    setContractsSearchTerm('')
    setContractStatusFilter('')
    setContractChannelFilter('')
    setContractsCurrentPage(1)
  }

  const handleEventsPageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalEventsPages) {
      setEventsCurrentPage(newPage)
    }
  }

  const handleEventsPageSizeChange = (newSize: (typeof PAGE_SIZES)[number]) => {
    setEventsPageSize(newSize)
    setEventsCurrentPage(1)
  }

  const clearEventsFilters = () => {
    setEventsSearchTerm('')
    setEventsNamespaceFilter('')
    setEventsSourceFilter('')
    setEventsTxFilter('')
    setEventsDateFrom('')
    setEventsDateTo('')
    setEventsCurrentPage(1)
  }

  const handleContractsPageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalContractsPages) {
      setContractsCurrentPage(newPage)
    }
  }

  const handleContractsPageSizeChange = (newSize: (typeof PAGE_SIZES)[number]) => {
    setContractsPageSize(newSize)
    setContractsCurrentPage(1)
  }

  const handleContractClick = async (contract: SmartContract) => {
    setSelectedContract(contract)
    setContractDetailLoading(true)
    setContractInterfaceJson(null)

    try {
      const response = await getContractInterface(contract.name)
      setContractInterfaceJson(JSON.stringify(response, null, 2))

      const info = response.info as { version?: string } | undefined
      if (info?.version && info.version !== undefined) {
        setSelectedContract(prev => prev ? { ...prev, version: info.version as string } : null)
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
            role="button"
            tabIndex={0}
            aria-label="Ver organizaciones"
            onClick={() => openDetailModal('organizations')}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetailModal('organizations') } }}
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
            role="button"
            tabIndex={0}
            aria-label="Ver namespaces"
            onClick={() => openDetailModal('namespaces')}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetailModal('namespaces') } }}
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
            role="button"
            tabIndex={0}
            aria-label="Ver eventos"
            onClick={() => openDetailModal('ledger')}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetailModal('ledger') } }}
          >
            <div className="flex items-center gap-2">
              <Cpu className="h-5 w-5 text-teal-600" />
              <p className="text-sm text-slate-500">Eventos</p>
            </div>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {isLoading ? '...' : events.length > 0 ? events.length.toLocaleString() : '0'}
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
            <h2 className="text-lg font-semibold text-slate-900">Eventos Recientes</h2>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center rounded-2xl border border-border bg-slate-50 px-3 py-2">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={eventsSearchTerm}
                  onChange={(e) => {
                    setEventsSearchTerm(e.target.value)
                    setEventsCurrentPage(1)
                  }}
                  placeholder="Buscar eventos..."
                  className="ml-2 w-40 border-none bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                />
              </div>
              <Select
                value={eventsPageSize}
                onChange={(value) => handleEventsPageSizeChange(Number(value) as typeof PAGE_SIZES[number])}
                options={PAGE_SIZES.map((size) => ({ value: size, label: size.toString() }))}
              />
              <button
                type="button"
                onClick={() => setShowEventsFilters(!showEventsFilters)}
                className="inline-flex items-center gap-1 rounded-2xl border border-border px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
              >
                <Filter className="size-4" />
                Filtros
              </button>
            </div>
          </div>

          {showEventsFilters && (
            <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="grid grid-cols-6 gap-4">
                <div>
                  <label htmlFor="events-namespace" className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 mb-2">
                    Namespace
                  </label>
                  <select
                    id="events-namespace"
                    value={eventsNamespaceFilter}
                    onChange={(e) => {
                      setEventsNamespaceFilter(e.target.value)
                      setEventsCurrentPage(1)
                    }}
                    className="w-full rounded-xl border border-border px-3 py-2 text-sm text-slate-700 outline-none focus:border-accent"
                  >
                    <option value="">Todos</option>
                    {namespaces.map((ns) => (
                      <option key={ns.name} value={ns.name}>{ns.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="events-source" className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 mb-2">
                    Fuente
                  </label>
                  <select
                    id="events-source"
                    value={eventsSourceFilter}
                    onChange={(e) => {
                      setEventsSourceFilter(e.target.value)
                      setEventsCurrentPage(1)
                    }}
                    className="w-full rounded-xl border border-border px-3 py-2 text-sm text-slate-700 outline-none focus:border-accent"
                  >
                    <option value="">Todas</option>
                    <option value="fabric">fabric</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="events-tx" className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 mb-2">
                    TX
                  </label>
                  <input
                    id="events-tx"
                    type="text"
                    value={eventsTxFilter}
                    onChange={(e) => {
                      setEventsTxFilter(e.target.value)
                      setEventsCurrentPage(1)
                    }}
                    placeholder="Buscar TX..."
                    className="w-full rounded-xl border border-border px-3 py-2 text-sm text-slate-700 outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label htmlFor="events-date-from" className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 mb-2">
                    Desde
                  </label>
                  <input
                    id="events-date-from"
                    type="date"
                    value={eventsDateFrom}
                    onChange={(e) => {
                      setEventsDateFrom(e.target.value)
                      setEventsCurrentPage(1)
                    }}
                    className="w-full rounded-xl border border-border px-3 py-2 text-sm text-slate-700 outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label htmlFor="events-date-to" className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 mb-2">
                   Hasta
                  </label>
                  <input
                    id="events-date-to"
                    type="date"
                    value={eventsDateTo}
                    onChange={(e) => {
                      setEventsDateTo(e.target.value)
                      setEventsCurrentPage(1)
                    }}
                    className="w-full rounded-xl border border-border px-3 py-2 text-sm text-slate-700 outline-none focus:border-accent"
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={clearEventsFilters}
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
          ) : filteredEvents.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
              <Cpu className="mx-auto size-8 text-slate-400" />
              <p className="mt-2 text-sm font-medium text-slate-700">
                {eventsSearchTerm || eventsNamespaceFilter || eventsSourceFilter || eventsTxFilter || eventsDateFrom || eventsDateTo
                  ? 'No hay eventos para los filtros seleccionados'
                  : 'No hay eventos en el ledger'}
              </p>
            </div>
          ) : (
            <>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span>
                  Mostrando {paginatedEvents.length} de {filteredEvents.length} evento
                  {filteredEvents.length === 1 ? '' : 's'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleEventsPageChange(eventsCurrentPage - 1)}
                    disabled={eventsCurrentPage === 1}
                    className="rounded-lg p-1 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span>
                    Página {eventsCurrentPage} de {totalEventsPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleEventsPageChange(eventsCurrentPage + 1)}
                    disabled={eventsCurrentPage === totalEventsPages}
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
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Evento</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Namespace</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Fuente</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">TX</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Fecha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {paginatedEvents.map((event) => (
                      <tr
                        key={event.id}
                        onClick={() => {
                          setSelectedEvent(event)
                          setDetailModal('event')
                        }}
                        className="cursor-pointer hover:bg-slate-50"
                      >
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {event.name}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">
                          {event.namespace || '-'}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {event.source}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-500">
                          {event.tx?.blockchainId
                            ? event.tx.blockchainId.substring(0, 12) + '...'
                            : '-'}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                        {event.timestamp
                          ? new Date(event.timestamp).toLocaleString('es-ES')
: '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span>
                  Mostrando {paginatedEvents.length} de {filteredEvents.length} evento
                  {filteredEvents.length === 1 ? '' : 's'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleEventsPageChange(eventsCurrentPage - 1)}
                    disabled={eventsCurrentPage === 1}
                    className="rounded-lg p-1 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span>
                    Página {eventsCurrentPage} de {totalEventsPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleEventsPageChange(eventsCurrentPage + 1)}
                    disabled={eventsCurrentPage === totalEventsPages}
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
          <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              Smart Contracts
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              {(isGlobalAdmin || isAdmin) && (
                <button
                  type="button"
                  onClick={() => !isAdmin && setIsRegisterModalOpen(true)}
                  disabled={isAdmin}
                  className={`inline-flex items-center gap-1 text-sm font-medium transition-colors ${isAdmin ? 'cursor-not-allowed text-slate-300' : 'text-accent hover:text-accent/80'}`}
                >
                  <Layers className="size-4" />
                  Registrar Smart Contract
                </button>
              )}
              <DeploymentHelpModal disabled={isAdmin} />
            </div>
          </div>

          <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div />
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center rounded-2xl border border-border bg-slate-50 px-3 py-2">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={contractsSearchTerm}
                  onChange={(e) => {
                    setContractsSearchTerm(e.target.value)
                    setContractsCurrentPage(1)
                  }}
                  placeholder="Buscar por nombre o namespace..."
                  className="ml-2 w-40 border-none bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                />
              </div>
              <Select
                value={contractsPageSize}
                onChange={(value) => handleContractsPageSizeChange(Number(value) as typeof PAGE_SIZES[number])}
                options={PAGE_SIZES.map((size) => ({ value: size, label: size.toString() }))}
              />
              <button
                type="button"
                onClick={() => setShowContractFilters(!showContractFilters)}
                className="inline-flex items-center gap-1 rounded-2xl border border-border px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
              >
                <Filter className="size-4" />
                Filtros
              </button>
            </div>
          </div>

          {showContractFilters && (
            <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label htmlFor="contract-status" className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 mb-2">
                    Estado
                  </label>
                  <select
                    id="contract-status"
                    value={contractStatusFilter}
                    onChange={(e) => {
                      setContractStatusFilter(e.target.value)
                      setContractsCurrentPage(1)
                    }}
                    className="w-full rounded-xl border border-border px-3 py-2 text-sm text-slate-700 outline-none focus:border-accent"
                  >
                    <option value="">Todos</option>
                    <option value="active">Activo</option>
                    <option value="deploying">Desplegando</option>
                    <option value="failed">Fallido</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="contract-namespace" className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 mb-2">
                    Namespace
                  </label>
                  <select
                    id="contract-namespace"
                    value={contractChannelFilter}
                    onChange={(e) => {
                      setContractChannelFilter(e.target.value)
                      setContractsCurrentPage(1)
                    }}
                    className="w-full rounded-xl border border-border px-3 py-2 text-sm text-slate-700 outline-none focus:border-accent"
                  >
                    <option value="">Todos</option>
                    {namespaces.map((ns) => (
                      <option key={ns.name} value={ns.name}>{ns.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={clearContractFilters}
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
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-2xl bg-slate-100" />
              ))}
            </div>
          ) : filteredContracts.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
              <Server className="mx-auto size-8 text-slate-400" />
              <p className="mt-2 text-sm font-medium text-slate-700">
                No hay smart contracts para los filtros seleccionados
              </p>
            </div>
          ) : (
            <>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span>
                  Mostrando {paginatedContracts.length} de {filteredContracts.length} smart contract
                  {filteredContracts.length === 1 ? '' : 's'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleContractsPageChange(contractsCurrentPage - 1)}
                    disabled={contractsCurrentPage === 1}
                    className="rounded-lg p-1 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span>
                    Página {contractsCurrentPage} de {totalContractsPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleContractsPageChange(contractsCurrentPage + 1)}
                    disabled={contractsCurrentPage === totalContractsPages}
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
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Nombre</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Versión</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Namespace</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Estado</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Fecha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {paginatedContracts.map((contract) => (
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
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${contract.status === 'active'
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
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span>
                  Mostrando {paginatedContracts.length} de {filteredContracts.length} smart contract
                  {filteredContracts.length === 1 ? '' : 's'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleContractsPageChange(contractsCurrentPage - 1)}
                    disabled={contractsCurrentPage === 1}
                    className="rounded-lg p-1 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span>
                    Página {contractsCurrentPage} de {totalContractsPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleContractsPageChange(contractsCurrentPage + 1)}
                    disabled={contractsCurrentPage === totalContractsPages}
                    className="rounded-lg p-1 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {detailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" role="button" tabIndex={0} aria-label="Cerrar" onClick={closeDetailModal} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); closeDetailModal() } }} />
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
                <h3 className="text-xl font-semibold text-slate-900">Eventos</h3>
                <div className="mt-4 space-y-3">
                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-sm text-slate-500">Eventos totales</p>
                    <p className="text-2xl font-semibold text-slate-900">
                      {events.length > 0 ? events.length.toLocaleString() : '-'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-sm text-slate-500">Eventos última hora</p>
                    <p className="text-2xl font-semibold text-slate-900">
                      {lastHourEvents}
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

      {detailModal === 'event' && selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" role="button" tabIndex={0} aria-label="Cerrar" onClick={() => setDetailModal(null)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDetailModal(null) } }} />
          <div className="relative z-10 w-[80vw] max-h-[90vh] overflow-hidden rounded-3xl bg-white p-6 shadow-2xl flex flex-col">
            <button
              onClick={() => setDetailModal(null)}
              className="absolute right-4 top-4 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="size-5" />
            </button>

            <h3 className="text-xl font-semibold text-slate-900">Detalle del Evento</h3>
            
            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs font-medium text-slate-500">Nombre</p>
                <p className="text-sm font-semibold text-slate-900">{selectedEvent.name}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-medium text-slate-500">ID</p>
                  <p className="text-xs font-mono text-slate-700 text-break">{selectedEvent.id}</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-medium text-slate-500">Namespace</p>
                  <p className="text-sm text-slate-900">{selectedEvent.namespace}</p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs font-medium text-slate-500">Protocol ID</p>
                <p className="text-xs font-mono text-slate-700 text-break">
                  {selectedEvent.protocolId || '-'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-medium text-slate-500">Fuente</p>
                  <p className="text-sm text-slate-900">{selectedEvent.source}</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-medium text-slate-500">Timestamp</p>
                  <p className="text-sm text-slate-900">
                    {selectedEvent.timestamp
                      ? new Date(selectedEvent.timestamp).toLocaleString('es-ES')
                      : '-'}
                  </p>
                </div>
              </div>

              {selectedEvent.tx && (
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-medium text-slate-500">Transacción</p>
                  <p className="text-xs font-mono text-slate-700 text-break">
                    {selectedEvent.tx.blockchainId || '-'}
                  </p>
                </div>
              )}

              {selectedEvent.listener && (
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-medium text-slate-500">Listener</p>
                  <p className="text-xs font-mono text-slate-700 text-break">{selectedEvent.listener}</p>
                </div>
              )}

              {selectedEvent.output && Object.keys(selectedEvent.output).length > 0 && (
                <div className="rounded-xl border border-slate-200 p-4 flex-1 overflow-auto">
                  <p className="text-xs font-medium text-slate-500 mb-2">Output</p>
                  <pre className="text-xs font-mono text-slate-700 whitespace-pre-wrap break-all">
                    {JSON.stringify(selectedEvent.output, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" role="button" tabIndex={0} aria-label="Cerrar" onClick={() => setSelectedContract(null)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedContract(null) } }} />
          <div className="relative z-10 w-[80vw] max-h-[90vh] overflow-hidden rounded-3xl bg-white p-6 shadow-2xl flex flex-col">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">Detalle de Smart Contract</h3>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedContract.name}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isGlobalAdmin && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setIsUpgradeModalOpen(true)
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-100"
                    >
                      <Pencil className="size-4" />
                      Actualizar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmDelete({ open: true, name: selectedContract.name })
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 transition-colors hover:bg-rose-100"
                    >
                      <Trash2 className="size-4" />
                      Eliminar
                    </button>
                  </>
                )}
                <button
                  onClick={() => setSelectedContract(null)}
                  className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="size-5" />
                </button>
              </div>
            </div>

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
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${selectedContract.status === 'active'
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

      {confirmDelete.open && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" role="button" tabIndex={0} aria-label="Cerrar" onClick={() => setConfirmDelete({ open: false, name: '' })} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setConfirmDelete({ open: false, name: '' }) } }} />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-rose-200 bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-900">Eliminar Smart Contract</h3>
            <p className="mt-2 text-sm text-slate-600">
              ¿Estás seguro de que quieres eliminar <strong>{confirmDelete.name}</strong>? Esta acción eliminará la API y todos los listeners asociados en FireFly.
            </p>
            <p className="mt-2 text-xs text-rose-500">
              Esta acción no se puede deshacer.
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setConfirmDelete({ open: false, name: '' })}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await deleteChaincode(confirmDelete.name)
                    setConfirmDelete({ open: false, name: '' })
                    setSelectedContract(null)
                    refreshNetworkData()
                  } catch {
                    setConfirmDelete({ open: false, name: '' })
                  }
                }}
                className="inline-flex items-center justify-center rounded-2xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-700"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      <RegisterChaincodeModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        onSuccess={() => refreshNetworkData()}
      />

      <RegisterChaincodeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        onSuccess={() => {
          setIsUpgradeModalOpen(false)
          setSelectedContract(null)
          refreshNetworkData()
        }}
        initialContract={selectedContract ?? undefined}
      />

    </div>
  )
}