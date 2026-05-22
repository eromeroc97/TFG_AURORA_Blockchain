import { FileSearch } from 'lucide-react'
import { AuditTimeline } from '../components/audit'
import { useState, useEffect, useMemo } from 'react'
import { getAuditTimeline, type AuditAnchor } from '../services/audit.service'

export default function AuditDashboardPage() {
  const [events, setEvents] = useState<AuditAnchor[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await getAuditTimeline({ limit: 50, offset: 0 })
        setEvents(response.timeline)
      } catch (err) {
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchEvents()
  }, [])

  const summaryCards = useMemo(() => {
    const now = new Date()
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    
    const telemetryEvents = events.filter((e) => e.type === 'TELEMETRY')
    const totalTelemetry = telemetryEvents.length
    
    const discrepancyCount = telemetryEvents.filter(
      (e) => e.integrityStatus === 'DISCREPANCY'
    ).length
    
    const percentage = totalTelemetry > 0 
      ? Math.round((discrepancyCount / totalTelemetry) * 100) 
      : 0
    
    const discrepanciesLast24h = telemetryEvents.filter((e) => {
      const eventTime = new Date(e.timestamp)
      return eventTime >= last24h && e.integrityStatus === 'DISCREPANCY'
    }).length

    return {
      discrepancyCount,
      percentage,
      discrepanciesLast24h,
      totalTelemetry,
    }
  }, [events])

  let percentageColorClass: string
  if (summaryCards.percentage === 0) {
    percentageColorClass = 'text-emerald-600'
  } else if (summaryCards.percentage < 50) {
    percentageColorClass = 'text-amber-600'
  } else {
    percentageColorClass = 'text-rose-600'
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex items-center gap-3">
            <FileSearch className="h-6 w-6 text-teal-600" />
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Auditoría Blockchain</h1>
              <p className="text-slate-600 mt-2">
                Consulta y verifica los anclajes de telemetría en el ledger.
              </p>
            </div>
          </div>
        </div>

        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 rounded-xl border bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Porcentaje de Discrepancias Global
            </p>
            <p className={`mt-2 text-2xl font-bold ${percentageColorClass}`}>
              {isLoading ? '-' : `${summaryCards.percentage}%`}
            </p>
          </div>
          
          <div className="flex-1 rounded-xl border bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Discrepancias Últimas 24h
            </p>
            <p className={`mt-2 text-2xl font-bold ${
              summaryCards.discrepanciesLast24h > 0 ? 'text-rose-600' : 'text-slate-700'
            }`}>
              {isLoading ? '-' : summaryCards.discrepanciesLast24h}
            </p>
          </div>
        </div>

        <AuditTimeline />
      </div>
    </div>
  )
}