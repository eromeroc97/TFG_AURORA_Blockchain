import { useMemo } from 'react'
import {
  Line,
  LineChart,
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
import { Activity, BarChart3, Database, MapPin, TrendingUp, Trophy } from 'lucide-react'
import { type TelemetryRange } from '../services/telemetry.service'
import { useAuth } from '../context/auth-context'
import AccessMap from '../components/dashboard/AccessMap'
import { useDashboardController } from '../controllers/useDashboardController'
import { useTelemetryController } from '../controllers/useTelemetryController'
import { useUsersController } from '../controllers/useUsersController'
import { useServiceHealthController } from '../controllers/useServiceHealthController'

export default function MainDashboard() {
  const { authClaims } = useAuth()
  const role = (authClaims?.role ?? 'USER').toUpperCase()
  const isAdminOrGlobalAdmin = role === 'ADMIN' || role === 'GLOBAL_ADMIN'
  const canViewUserCount = role !== 'USER'

  const { ecosystems, isLoading: isMapLoading, error: mapError } = useDashboardController()
  const { data, error: telemetryError, range, changeRange } = useTelemetryController()
  const { users } = useUsersController(canViewUserCount)
  const { services } = useServiceHealthController()

  const ranges: TelemetryRange[] = ['30m', '1h', '12h', '24h', '1w', '1M', '1y']

  const totalInformationBytes = (data.rawDailyVolume ?? data.dailyVolume).reduce((sum, item) => sum + item.tx, 0)

  const formatBytes = (bytes: number) => {
    const absBytes = Math.max(0, bytes)
    if (absBytes < 1024) {
      return `${absBytes} B`
    }

    const units = ['KB', 'MB', 'GB', 'TB']
    let value = absBytes / 1024
    let unitIndex = 0

    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024
      unitIndex += 1
    }

    return `${value.toFixed(1)} ${units[unitIndex]}`
  }

  const totalDevicesCount = useMemo(
    () => ecosystems.reduce((sum, eco) => sum + (eco.devices?.length ?? 0), 0),
    [ecosystems],
  )

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

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 text-slate-900">
                <Database className="h-6 w-6 text-violet-600" />
                <div>
                  <p className="text-sm font-medium text-slate-500">Volumen de información generado</p>
                </div>
              </div>
              <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5 text-center">
                <p className="text-sm text-slate-500">Rango actual: {range === '30m'
                  ? 'Últimos 30 minutos'
                  : range === '1h'
                    ? 'Última hora'
                    : range === '12h'
                      ? 'Últimas 12 horas'
                      : range === '24h'
                        ? 'Últimas 24 horas'
                        : range === '1w'
                          ? 'Última semana'
                          : range === '1M'
                            ? 'Último mes'
                            : 'Último año'}</p>
                <p className="mt-3 text-4xl font-semibold text-slate-900">{formatBytes(totalInformationBytes)}</p>
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 text-slate-900">
                <BarChart3 className="h-6 w-6 text-slate-700" />
                <div>
                  <p className="text-sm font-medium text-slate-500">Estado Global</p>
                </div>
              </div>

              {telemetryError && telemetryError !== 'NO_DATA' ? (
                <div className="mt-6 rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
                  <p className="font-semibold">Error de telemetría</p>
                  <p className="mt-2">{telemetryError}</p>
                </div>
              ) : telemetryError === 'NO_DATA' ? (
                <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                  <p className="font-semibold">Tus ecosistemas aún no han enviado ningún dato.</p>
                </div>
              ) : null}

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {canViewUserCount && isAdminOrGlobalAdmin && (
                  <a href="/users" className="sm:col-span-2" text-decoration="none">
                    <div className="sm:col-span-2 rounded-3xl border border-slate-200 bg-slate-50 p-5 text-center">
                      <p className="text-sm font-medium text-slate-500">Usuarios existentes</p>
                      <p className="mt-3 text-4xl font-semibold text-slate-900">{users.length}</p>
                    </div>
                  </a>
                )}
                {canViewUserCount && !isAdminOrGlobalAdmin && (
                  <div className="sm:col-span-2 rounded-3xl border border-slate-200 bg-slate-50 p-5 text-center">
                    <p className="text-sm font-medium text-slate-500">Usuarios existentes</p>
                    <p className="mt-3 text-4xl font-semibold text-slate-900">{users.length}</p>
                  </div>
                )}
                <a href="/ecosystems" style={{ textDecoration: 'none' }}>
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-center">
                    <p className="text-sm font-medium text-slate-500">Ecosistemas instanciados</p>
                    <p className="mt-3 text-4xl font-semibold text-slate-900">{ecosystems.length}</p>
                  </div>
                </a>
                <a href="/ecosystems" style={{ textDecoration: 'none' }}>
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-center">
                    <p className="text-sm font-medium text-slate-500">Dispositivos conectados</p>
                    <p className="mt-3 text-4xl font-semibold text-slate-900">{totalDevicesCount}</p>
                  </div>
                </a>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 text-slate-900">
                <Activity className="h-6 w-6 text-fuchsia-600" />
                <div>
                  <p className="text-sm font-medium text-slate-500">Estado operativo</p>
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
                      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${service.status === 'Online'
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
                  <h2 className="text-xl font-semibold text-slate-900">
                    {range === '30m'
                      ? 'Últimos 30 minutos'
                      : range === '1h'
                        ? 'Última hora'
                        : range === '12h'
                          ? 'Últimas 12 horas'
                          : range === '24h'
                            ? 'Últimas 24 horas'
                            : range === '1w'
                              ? 'Última semana'
                              : range === '1M'
                                ? 'Último mes'
                                : 'Último año'}
                  </h2>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {ranges.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => changeRange(r)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${range === r
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.dailyVolume} margin={{ top: 10, right: 18, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="timestamp"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    tickFormatter={(value) => {
                      const date = new Date(value)
                      if (isNaN(date.getTime())) return ''
                      return date.toLocaleString('es-ES', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    }}
                    type="category"
                    allowDuplicatedCategory={false}
                  />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }}
                    labelFormatter={(value) => {
                      const date = new Date(value)
                      return date.toLocaleString('es-ES', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })
                    }}
                    formatter={(value: number) => [`${value} transacciones`, 'Volumen']}
                  />
                  <Line type="monotone" dataKey="tx" stroke="#2563eb" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4 text-slate-900">
                <TrendingUp className="h-7 w-7 text-emerald-500" />
                <div>
                  <p className="text-sm font-medium text-slate-500">Tasa de éxito</p>
                  <h2 className="text-xl font-semibold text-slate-900">Anclajes en Blockchain</h2>
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
                <Trophy className="h-7 w-7 text-violet-600" />
                <div>
                  <p className="text-sm font-medium text-slate-500">Top ecosistemas</p>
                  <h2 className="text-xl font-semibold text-slate-900">Anclajes por ecosistema</h2>
                </div>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.ecosystemUsage} margin={{ top: 10, right: 18, left: 0, bottom: 30 }}>
                    <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#0f172a', fontSize: 12 }} interval={0} angle={-45} textAnchor="end" />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }} />
                    <Bar dataKey="anchors" radius={[4, 4, 0, 0]} fill="#7c3aed">
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
