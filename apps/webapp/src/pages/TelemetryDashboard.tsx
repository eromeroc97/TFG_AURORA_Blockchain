import { useMemo } from 'react'
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
import { BarChart3, CircleDashed, ShieldCheck, TrendingUp, Zap } from 'lucide-react'
import { useAuth } from '../context/auth-context'

/**
 * Página de Telemetría - Dashboard de métricas de telemetría.
 * Muestra métricas clave relacionadas con el volumen transaccional,
 * tasa de éxito de anclaje y top ecosistemas.
 */
export default function TelemetryDashboard() {
  const { authClaims } = useAuth()

  const dailyVolume = useMemo(
    () => [
      { hour: '00:00', tx: 240 },
      { hour: '04:00', tx: 420 },
      { hour: '08:00', tx: 680 },
      { hour: '12:00', tx: 920 },
      { hour: '16:00', tx: 760 },
      { hour: '20:00', tx: 880 },
      { hour: '24:00', tx: 1040 },
    ],
    []
  )

  const successRatio = useMemo(
    () => [
      { name: 'Anclajes OK', value: 72 },
      { name: 'Anclajes fallidos', value: 28 },
    ],
    []
  )

  const ecosystemUsage = useMemo(
    () => [
      { name: 'Ethereum', anchors: 36 },
      { name: 'Hyperledger', anchors: 24 },
      { name: 'Polkadot', anchors: 18 },
      { name: 'Corda', anchors: 12 },
    ],
    []
  )

  const badge = authClaims?.role === 'ADMIN' ? 'admin' : authClaims?.role === 'USER' ? 'user' : 'guest'

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
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm">
            <CircleDashed className="mr-2 h-4 w-4 text-slate-500" />
            Rol actual: {badge.toUpperCase()}
          </span>
        </div>

        {/* Cuadrícula de tarjetas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Tarjeta: Volumen Transaccional */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4 text-slate-900">
              <BarChart3 className="h-7 w-7 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-slate-500">Volumen transaccional</p>
                <h2 className="text-xl font-semibold text-slate-900">Últimas 24 horas</h2>
              </div>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyVolume} margin={{ top: 10, right: 18, left: 0, bottom: 0 }}>
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

          {/* Tarjeta: Tasa de Éxito de Anclaje */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4 text-slate-900">
              <TrendingUp className="h-7 w-7 text-emerald-500" />
              <div>
                <p className="text-sm font-medium text-slate-500">Tasa de éxito</p>
                <h2 className="text-xl font-semibold text-slate-900">Anclajes v/s fallos</h2>
              </div>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={successRatio} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={48} paddingAngle={4}>
                    {successRatio.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#14b8a6' : '#f97316'} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }} />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tarjeta: Top Ecosistemas */}
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
                <BarChart data={ecosystemUsage} layout="vertical" margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" />
                  <XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#0f172a', fontSize: 13 }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }} />
                  <Bar dataKey="anchors" radius={[8, 8, 8, 8]} fill="#7c3aed">
                    {ecosystemUsage.map((entry, index) => (
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
  )
}