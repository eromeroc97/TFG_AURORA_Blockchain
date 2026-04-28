import { RefreshCcw, ServerCog, TreeDeciduous } from 'lucide-react'
import { useEcosystemsController } from '../controllers/useEcosystemsController'

export default function EcosystemsManagementPage() {
  const { ecosystems, isLoading, error, refreshEcosystems } = useEcosystemsController()

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex items-center gap-3">
            <ServerCog className="h-6 w-6 text-slate-700" />
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Gestión de ecosistemas</h1>
              <p className="text-slate-600 mt-2">
                Revisa el estado, la geolocalización y la visibilidad de los ecosistemas registrados.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={refreshEcosystems}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <RefreshCcw className="h-4 w-4" />
            Refrescar
          </button>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Ecosistemas totales</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{ecosystems.length}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Ecosistemas compartidos</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{ecosystems.filter((eco) => eco.isShared).length}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Con coordenadas</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{ecosystems.filter((eco) => typeof eco.lat === 'number' && typeof eco.lng === 'number').length}</p>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          {error ? (
            <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
              <p className="font-semibold">Error de carga</p>
              <p className="mt-2">{error}</p>
            </div>
          ) : null}

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((item) => (
                <div key={item} className="h-14 rounded-3xl bg-slate-100" />
              ))}
            </div>
          ) : ecosystems.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-slate-700">
              <p className="font-medium text-slate-900">No hay ecosistemas disponibles.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-3xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm text-slate-700">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.2em] text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Ecosistema</th>
                    <th className="px-6 py-4">Ubicación</th>
                    <th className="px-6 py-4">Compartido</th>
                    <th className="px-6 py-4">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {ecosystems.map((ecosystem) => (
                    <tr key={ecosystem.id}>
                      <td className="px-6 py-4 font-medium text-slate-900">{ecosystem.name}</td>
                      <td className="px-6 py-4">{typeof ecosystem.lat === 'number' && typeof ecosystem.lng === 'number' ? `${ecosystem.lat.toFixed(3)}, ${ecosystem.lng.toFixed(3)}` : 'Sin ubicación'}</td>
                      <td className="px-6 py-4">{ecosystem.isShared ? 'Sí' : 'No'}</td>
                      <td className="px-6 py-4 text-slate-900">Sin dato</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 text-slate-900">
            <TreeDeciduous className="h-6 w-6 text-emerald-500" />
            <div>
              <p className="text-sm font-medium text-slate-500">Información adicional</p>
              <h2 className="text-xl font-semibold">Arquitectura de ecosistemas</h2>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            Esta vista separa la administración de recursos de la operativa del dashboard principal. Utiliza esta sección para auditar y reconciliar cargas de cada ecosistema.
          </p>
        </div>
      </div>
    </div>
  )
}
