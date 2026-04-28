import { BarChart3, MapPin, Sparkles, Users as UsersIcon, Zap } from 'lucide-react'
import AccessMap from '../components/dashboard/AccessMap'
import { useAuth } from '../context/auth-context'
import { useDashboardController } from '../controllers/useDashboardController'
import { useTelemetryController } from '../controllers/useTelemetryController'

export default function MainDashboard() {
  const { authClaims } = useAuth()
  const isUser = authClaims?.role === 'USER'
  const { ecosystems, isLoading: isMapLoading, error: mapError, refreshEcosystems } = useDashboardController()
  const { data, isLoading: isTelemetryLoading, error: telemetryError, refreshMetrics } = useTelemetryController()

  const isLoading = isMapLoading || isTelemetryLoading
  const hasData = !telemetryError && data.dailyVolume.length > 0

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Panel de control</h1>
            <p className="text-slate-600 mt-2">
              Unifica tus indicadores de acceso y telemetría en un único tablero operativo.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                void refreshEcosystems()
                void refreshMetrics()
              }}
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Actualizar panel
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

            <div className="grid gap-4 sm:grid-cols-2">
              <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3 text-slate-900">
                  <Sparkles className="h-6 w-6 text-emerald-500" />
                  <div>
                    <p className="text-sm font-medium text-slate-500">Ecosistemas visibles</p>
                    <p className="mt-1 text-3xl font-semibold text-slate-900">{ecosystems.length}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-500">
                  Ecosistemas visibles según el rol del usuario y los permisos asignados.
                </p>
              </article>

              <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3 text-slate-900">
                  <UsersIcon className="h-6 w-6 text-violet-600" />
                  <div>
                    <p className="text-sm font-medium text-slate-500">Visibilidad de roles</p>
                    <p className="mt-1 text-3xl font-semibold text-slate-900">{isUser ? 'Usuario' : authClaims?.role ?? 'N/D'}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-500">
                  Acceso condicionado por tu rol de sesión actual.
                </p>
              </article>
            </div>
          </section>

          <section className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-slate-900">
                  <BarChart3 className="h-6 w-6 text-slate-700" />
                  <div>
                    <p className="text-sm font-medium text-slate-500">Telemetría</p>
                    <h2 className="text-xl font-semibold">Resumen rápido</h2>
                  </div>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  {isLoading ? 'Actualizando' : 'En tiempo real'}
                </span>
              </div>

              {telemetryError ? (
                <div className="mt-6 rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
                  <p className="font-semibold">Error de telemetría</p>
                  <p className="mt-2">{telemetryError}</p>
                </div>
              ) : (
                <div className="mt-6 space-y-4">
                  <div className="rounded-3xl bg-slate-50 p-5">
                    <p className="text-sm font-medium text-slate-500">Dispositivos conectados</p>
                    <p className="mt-2 text-4xl font-semibold text-slate-900">{data.totalDevices}</p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-3xl border border-slate-200 bg-white p-5">
                      <p className="text-sm font-medium text-slate-500">Datos de actividad</p>
                      <p className="mt-3 text-lg text-slate-700">
                        {hasData ? `${data.dailyVolume.length} puntos` : 'Sin registros recientes'}
                      </p>
                    </div>
                    <div className="rounded-3xl border border-slate-200 bg-white p-5">
                      <p className="text-sm font-medium text-slate-500">Anclajes por ecosistema</p>
                      <p className="mt-3 text-lg text-slate-700">
                        {hasData ? `${data.ecosystemUsage.length} ecosistemas` : 'Sin métricas disponibles'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 text-slate-900">
                <Zap className="h-6 w-6 text-fuchsia-600" />
                <div>
                  <p className="text-sm font-medium text-slate-500">Estado operativo</p>
                  <h2 className="text-xl font-semibold">Resumen de disponibilidad</h2>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-600">
                Este panel centraliza la visibilidad de usuarios, ecosistemas y telemetría. Navega a las secciones de administración para gestionar usuarios y recursos.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
