import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { BarChart3, TrendingUp, Zap } from 'lucide-react'
import { useAuth } from '../context/auth-context'
import { useTelemetryController } from '../controllers/useTelemetryController'
import auroraLogo from '../assets/aurora-logo.png'
import gsyaLogo from '../assets/gsya_logo.png'
import uclmLogo from '../assets/uclm_logo.png'
import ueLogo from '../assets/UE.png'
import mHaciendaLogo from '../assets/MHacienda.png'
import federLogo from '../assets/FEDER.png'
import clmLogo from '../assets/CLM.png'

/**
 * Página de Telemetría - Dashboard de métricas de telemetría.
 * Muestra métricas clave relacionadas con el volumen transaccional,
 * tasa de éxito de anclaje y top ecosistemas.
 */
export default function TelemetryDashboard() {
  const { authClaims } = useAuth()
  const isUser = authClaims?.role === 'USER'
  const { data, isLoading, error, refreshMetrics } = useTelemetryController()

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Telemetría</h1>
            <p className="text-slate-600 mt-2">
              Monitorea el rendimiento y las métricas clave de tu ecosistema blockchain.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={refreshMetrics}
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Actualizar
            </button>
          </div>
        </div>

        {error ? (
          <div className="mb-6 rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 shadow-sm">
            <p className="font-semibold text-red-800">Error al cargar métricas</p>
            <p className="mt-2 text-red-700">{error}</p>
          </div>
        ) : null}

        {authClaims && isUser ? (
          <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 text-sm text-slate-700 shadow-sm">
            <p className="font-semibold text-slate-900">Métricas de tus ecosistemas</p>
            <p className="mt-2 text-slate-600">
              Estas métricas están filtradas para los ecosistemas asociados a tu usuario.
            </p>
          </div>
        ) : null}

        {!error ? (
          !isLoading && data.dailyVolume.length === 0 && data.successRatio.length === 0 && data.ecosystemUsage.length === 0 ? (
            <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-8 text-slate-700 shadow-sm">
              <p className="text-lg font-semibold text-slate-900">Sin métricas disponibles</p>
              <p className="mt-2 text-slate-600">
                No se ha registrado telemetría en las últimas 24 horas para los ecosistemas disponibles.
              </p>
            </div>
          ) : isLoading ? (
            <div className="space-y-6">
              {[1, 2, 3].map((item) => (
                <div key={item} className="animate-pulse rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="mb-6 h-6 w-40 rounded-full bg-slate-200" />
                  <div className="space-y-3">
                    <div className="h-48 rounded-3xl bg-slate-100" />
                    <div className="h-4 w-3/4 rounded-full bg-slate-200" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4 text-slate-900">
                  <div className="flex items-center gap-3">
                    <BarChart3 className="h-7 w-7 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-slate-500">Volumen transaccional</p>
                      <h2 className="text-xl font-semibold text-slate-900">Últimas 24 horas</h2>
                    </div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    <p className="font-medium text-slate-900">Total dispositivos</p>
                    <p className="mt-1 text-lg font-semibold">{data.totalDevices}</p>
                  </div>
                </div>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.dailyVolume} margin={{ top: 10, right: 18, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" />
                      <XAxis dataKey="timestamp" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }} />
                      <Area type="monotone" dataKey="tx" stroke="#2563eb" fill="url(#volumeGradient)" fillOpacity={1} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4 text-slate-900">
                  <TrendingUp className="h-7 w-7 text-emerald-500" />
                  <div>
                    <p className="text-sm font-medium text-slate-500">Tasa de éxito</p>
                    <h2 className="text-xl font-semibold text-slate-900">Anclajes vs fallos</h2>
                  </div>
                </div>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={data.successRatio} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={48} paddingAngle={4}>
                        {data.successRatio.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.name === 'Anclajes OK' ? '#14b8a6' : entry.name === 'Fallidos' ? '#f97316' : '#a855f7'}
                          />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }} />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4 text-slate-900">
                  <Zap className="h-7 w-7 text-violet-600" />
                  <div>
                    <p className="text-sm font-medium text-slate-500">Top ecosistemas</p>
                    <h2 className="text-xl font-semibold text-slate-900">Anclajes por red</h2>
                  </div>
                </div>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.ecosystemUsage} layout="vertical" margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" />
                      <XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#0f172a', fontSize: 13 }} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }} />
                      <Bar dataKey="anchors" radius={[8, 8, 8, 8]} fill="#7c3aed">
                        {data.ecosystemUsage.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#7c3aed' : '#a855f7'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )
        ) : null}

        <footer className="mt-6 rounded-[1.75rem] border border-border bg-white p-6 shadow-aurora">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">
            Entidades participantes
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-4 sm:flex-nowrap sm:justify-between sm:gap-6">
            <img src={auroraLogo} alt="Logotipo de AURORA" className="h-10 sm:h-12 w-auto max-w-[7rem] object-contain" />
            <img src={gsyaLogo} alt="Logotipo de GSYA" className="h-10 sm:h-12 w-auto max-w-[7rem] object-contain" />
            <img src={uclmLogo} alt="Logotipo de UCLM" className="h-10 sm:h-12 w-auto max-w-[7rem] object-contain" />
            <img src={ueLogo} alt="Logotipo de la UE" className="h-10 sm:h-12 w-auto max-w-[7rem] object-contain" />
            <img src={mHaciendaLogo} alt="Logotipo de Ministerio de Hacienda" className="h-10 sm:h-12 w-auto max-w-[7rem] object-contain" />
            <img src={federLogo} alt="Logotipo de FEDER" className="h-10 sm:h-12 w-auto max-w-[7rem] object-contain" />
            <img src={clmLogo} alt="Logotipo de CLM" className="h-10 sm:h-12 w-auto max-w-[7rem] object-contain" />
          </div>
        </footer>
      </div>
    </div>
  )
}