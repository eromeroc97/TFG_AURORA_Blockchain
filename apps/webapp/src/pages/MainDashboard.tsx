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
import { BarChart3, MapPin, TrendingUp, Zap } from 'lucide-react'
import AccessMap from '../components/dashboard/AccessMap'
import { useDashboardController } from '../controllers/useDashboardController'
import { useTelemetryController } from '../controllers/useTelemetryController'
import { useUsersController } from '../controllers/useUsersController'
import { useServiceHealthController } from '../controllers/useServiceHealthController'

export default function MainDashboard() {
  const { ecosystems, isLoading: isMapLoading, error: mapError, refreshEcosystems } = useDashboardController()
  const { data, isLoading: isTelemetryLoading, error: telemetryError, refreshMetrics } = useTelemetryController()
  const { users, isLoading: isUsersLoading, refreshUsers } = useUsersController()
  const { services, isLoading: isServiceHealthLoading, refreshServiceHealth } = useServiceHealthController()

  const isLoading = isMapLoading || isTelemetryLoading || isUsersLoading || isServiceHealthLoading

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">AURORA Smart Home</h1>
            <p className="text-slate-600 mt-2">
              Panel de control del sistema.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={isLoading}
              onClick={() => {
                void refreshEcosystems()
                void refreshMetrics()
                void refreshUsers()
                void refreshServiceHealth()
              }}
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? 'Actualizando...' : 'Actualizar panel'}
            </button>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
          <section className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 text-slate-900">
                <MapPin className="h-6 w-6 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-slate-500">Mapa de ecosistemas</p>
                  <h2 className="text-xl font-semibold">Acceso y presencia geográfica</h2>
                </div>
              </div>
              <div className="mt-5">
                {mapError ? (
                  <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
                    <p className="font-semibold">Error al cargar los ecosistemas</p>
                    <p className="mt-2">{mapError}</p>
                  </div>
                ) : isMapLoading ? (
                  <div className="h-[520px] rounded-[1.25rem] bg-slate-100" />
                ) : (
                  <AccessMap ecosystems={ecosystems} />
                )}
              </div>
            </div>

            </section>

          <section className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 text-slate-900">
                <BarChart3 className="h-6 w-6 text-slate-700" />
                <div>
                  <p className="text-sm font-medium text-slate-500">Estado Global</p>
                  <h2 className="text-xl font-semibold">Resumen</h2>
                </div>
              </div>

              {telemetryError ? (
                <div className="mt-6 rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
                  <p className="font-semibold">Error de telemetría</p>
                  <p className="mt-2">{telemetryError}</p>
                </div>
              ) : null}

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2 rounded-3xl border border-slate-200 bg-slate-50 p-5 text-center">
                  <p className="text-sm font-medium text-slate-500">Usuarios existentes</p>
                  <p className="mt-3 text-4xl font-semibold text-slate-900">{users.length}</p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-center">
                  <p className="text-sm font-medium text-slate-500">Ecosistemas instanciados</p>
                  <p className="mt-3 text-4xl font-semibold text-slate-900">{ecosystems.length}</p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-center">
                  <p className="text-sm font-medium text-slate-500">Dispositivos conectados</p>
                  <p className="mt-3 text-4xl font-semibold text-slate-900">{data.totalDevices}</p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 text-slate-900">
                <Zap className="h-6 w-6 text-fuchsia-600" />
                <div>
                  <p className="text-sm font-medium text-slate-500">Estado operativo</p>
                  <h2 className="text-xl font-semibold">Disponibilidad</h2>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {services.map((service) => (
                  <div
                    key={service.id}
                    className="flex items-center justify-between rounded-3xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-700">{service.name}</p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${
                        service.status === 'Online'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {service.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        <div className="mt-6 space-y-6">
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
                  <XAxis dataKey="hour" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }} />
                  <Area type="monotone" dataKey="tx" stroke="#2563eb" fill="url(#volumeGradient)" fillOpacity={1} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
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
        </div>
      </div>
    </div>
  )
}
