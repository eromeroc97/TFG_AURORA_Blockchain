import { useState, useCallback, useMemo, useEffect } from 'react'
import { Virtuoso } from 'react-virtuoso'
import { Filter, X, Calendar, ChevronDown } from 'lucide-react'
import { getAuditTimeline, type AuditFilters, type AuditAnchor } from '../../services/audit.service'
import AuditEventCard from './AuditEventCard'
import type { AuditEvent } from './types'

const transformToAuditEvent = (item: AuditAnchor): AuditEvent => ({
  eventId: item.eventId,
  timestamp: item.timestamp,
  action: item.action,
  actorName: item.actorName,
  type: item.type,
  integrityStatus: item.integrityStatus,
  blockchainTxId: item.blockchainTxId,
  details: {
    blockchainRecord: {
      eventId: item.eventId,
      timestamp: item.timestamp,
      txId: item.blockchainTxId,
      telemetryHash: item.telemetryHash,
      ecosystemId: item.ecosystemId,
      ingestId: item.ingestId,
    },
    databaseRecord: {},
  },
})

export default function AuditTimeline() {
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [filters, setFilters] = useState<AuditFilters>({
    startDate: '',
    endDate: '',
    eventType: undefined,
    limit: 50,
    offset: 0,
  })
  
  const [showFilters, setShowFilters] = useState(false)
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null)

  const fetchEvents = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await getAuditTimeline(filters)
      const transformed = response.timeline.map(transformToAuditEvent)
      setEvents(transformed)
    } catch (err) {
      setError('Error al cargar los eventos de auditoría')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  const handleToggle = (eventId: string) => {
    setExpandedEventId(expandedEventId === eventId ? null : eventId)
  }

  const handleFilterChange = (key: keyof AuditFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value || undefined }))
  }

  const handleApplyFilters = () => {
    fetchEvents()
    setShowFilters(false)
  }

  const handleClearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      eventType: undefined,
      limit: 50,
      offset: 0,
    })
  }

  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (filters.startDate) count++
    if (filters.endDate) count++
    if (filters.eventType) count++
    return count
  }, [filters])

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Línea de Tiempo de Auditoría</h2>
          <p className="text-sm text-slate-500 mt-1">
            {isLoading ? 'Cargando...' : `${events.length} eventos`}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
              showFilters || activeFiltersCount > 0
                ? 'bg-teal-50 border-teal-200 text-teal-700'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Filter className="size-4" />
            Filtros
            {activeFiltersCount > 0 && (
              <span className="ml-1 flex size-5 items-center justify-center rounded-full bg-teal-600 text-xs text-white">
                {activeFiltersCount}
              </span>
            )}
          </button>
          
          <button
            type="button"
            onClick={fetchEvents}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Sincronizar
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 mb-2">
                Fecha Desde
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                <input
                  type="date"
                  value={filters.startDate || ''}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  className="w-full rounded-xl border border-border px-3 py-2 pl-10 text-sm text-slate-700 outline-none focus:border-accent"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 mb-2">
                Fecha Hasta
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                <input
                  type="date"
                  value={filters.endDate || ''}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  className="w-full rounded-xl border border-border px-3 py-2 pl-10 text-sm text-slate-700 outline-none focus:border-accent"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 mb-2">
                Tipo de Evento
              </label>
              <div className="relative">
                <select
                  value={filters.eventType || 'ALL'}
                  onChange={(e) => handleFilterChange('eventType', e.target.value === 'ALL' ? '' : e.target.value)}
                  className="w-full rounded-xl border border-border px-3 py-2 text-sm text-slate-700 outline-none focus:border-accent appearance-none bg-white"
                >
                  <option value="ALL">Todos</option>
                  <option value="TELEMETRY">Telemetría</option>
                  <option value="ADMIN">Administrativo</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
            
            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={handleApplyFilters}
                className="flex-1 inline-flex items-center justify-center rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 transition-colors"
              >
                Aplicar
              </button>
              <button
                type="button"
                onClick={handleClearFilters}
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50 transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center">
            <p className="text-sm text-red-700">{error}</p>
            <button
              onClick={fetchEvents}
              className="mt-2 text-sm font-medium text-red-600 hover:text-red-700"
            >
              Reintentar
            </button>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-slate-500">No hay eventos para los filtros seleccionados</p>
          </div>
        ) : (
          <Virtuoso
            style={{ height: '500px' }}
            totalCount={events.length}
            itemContent={(index) => {
              const event = events[index]
              return (
                <AuditEventCard
                  key={event.eventId}
                  event={event}
                  isExpanded={expandedEventId === event.eventId}
                  onToggle={() => handleToggle(event.eventId)}
                />
              )
            }}
          />
        )}
      </div>
    </div>
  )
}