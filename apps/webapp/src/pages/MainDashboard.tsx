import { BarChart3, MapPin, Zap } from 'lucide-react'
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
              Unifica tus indicadores de acceso y telemetría en un único tablero operativo.
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
      </div>
    </div>
  )
}
