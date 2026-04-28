import { useEffect, useMemo, useState } from 'react'
import { House, RefreshCcw, TreeDeciduous } from 'lucide-react'
import EcosystemDevicesModal from '../components/dashboard/EcosystemDevicesModal'
import { useEcosystemsController } from '../controllers/useEcosystemsController'
import type { AccessMapEcosystem } from '../components/dashboard/access-map.data'

export default function EcosystemsManagementPage() {
  const { ecosystems, isLoading, error, refreshEcosystems } = useEcosystemsController()
  const [visibleEcosystems, setVisibleEcosystems] = useState<AccessMapEcosystem[]>(ecosystems)
  const [selectedEcosystem, setSelectedEcosystem] = useState<AccessMapEcosystem | null>(null)

  useEffect(() => {
    setVisibleEcosystems(ecosystems)
  }, [ecosystems])

  const sharedEcosystemCount = useMemo(
    () => visibleEcosystems.filter((eco) => eco.isShared).length,
    [visibleEcosystems],
  )

  const geolocatedEcosystemCount = useMemo(
    () => visibleEcosystems.filter((eco) => typeof eco.lat === 'number' && typeof eco.lng === 'number').length,
    [visibleEcosystems],
  )

  const canManageEcosystem = true

  const handleOpenEcosystemModal = (ecosystem: AccessMapEcosystem) => {
    setSelectedEcosystem(ecosystem)
  }

  const handleCloseEcosystemModal = () => {
    setSelectedEcosystem(null)
  }

  const handleEcosystemUpdated = (ecosystem: AccessMapEcosystem) => {
    setVisibleEcosystems((current) => current.map((item) => (item.id === ecosystem.id ? ecosystem : item)))
    if (selectedEcosystem?.id === ecosystem.id) {
      setSelectedEcosystem(ecosystem)
    }
  }

  const handleEcosystemRevoked = (ecosystemId: string) => {
    setVisibleEcosystems((current) => current.filter((ecosystem) => ecosystem.id !== ecosystemId))
    if (selectedEcosystem?.id === ecosystemId) {
      setSelectedEcosystem(null)
    }
  }

  const handleDeviceUpdated = (device: { id: string }) => {
    if (!selectedEcosystem) return
    setVisibleEcosystems((current) =>
      current.map((ecosystem) =>
        ecosystem.id === selectedEcosystem.id
          ? {
              ...ecosystem,
              devices: ecosystem.devices.map((existingDevice) =>
                existingDevice.id === device.id ? { ...existingDevice, ...device } : existingDevice,
              ),
            }
          : ecosystem,
      ),
    )
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex items-center gap-3">
            <House className="h-6 w-6 text-emerald-500" />
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Gestión de ecosistemas</h1>
              <p className="text-slate-600 mt-2">
                Lista general de ecosistemas registrados y acceso rápido a sus detalles operativos.
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
            <p className="mt-2 text-3xl font-semibold text-slate-900">{visibleEcosystems.length}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Ecosistemas compartidos</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{sharedEcosystemCount}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Con coordenadas</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{geolocatedEcosystemCount}</p>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-border bg-white p-6 shadow-aurora">
          <div className="flex items-center gap-3 text-primary">
            <House className="size-5 text-accent" />
            <h2 className="font-heading text-xl font-semibold">Ecosistemas instanciados</h2>
          </div>
          <p className="mt-3 text-xs text-muted">Lista general de ecosistemas (sin información de dispositivos)</p>

          {error ? (
            <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
              <p className="font-semibold">Error de carga</p>
              <p className="mt-2">{error}</p>
            </div>
          ) : null}

          {isLoading ? (
            <div className="mt-6 space-y-4">
              {[1, 2, 3].map((item) => (
                <div key={item} className="h-16 rounded-2xl bg-slate-100" />
              ))}
            </div>
          ) : visibleEcosystems.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-slate-700">
              <p className="font-medium text-slate-900">No hay ecosistemas disponibles.</p>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {visibleEcosystems.map((ecosystem) => (
                <button
                  key={ecosystem.id}
                  type="button"
                  onClick={() => handleOpenEcosystemModal(ecosystem)}
                  className="w-full text-left rounded-2xl border border-border/50 bg-surface/30 p-4 transition hover:border-border hover:bg-surface/50"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium text-primary">{ecosystem.name}</p>
                      <p className="text-xs text-muted mt-1">Propietario: {ecosystem.ownerId ?? 'Desconocido'}</p>
                    </div>
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-accent/10 text-accent">
                      {ecosystem.isShared ? 'Compartido' : 'Privado'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 text-slate-900">
            <TreeDeciduous className="h-6 w-6 text-emerald-500" />
            <div>
              <p className="text-sm font-medium text-slate-500">Información adicional</p>
              <h2 className="text-xl font-semibold">Administración alineada</h2>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            Esta vista está pensada para la auditoría y el mantenimiento de los ecosistemas registrados. Selecciona un ecosistema para ver y editar sus dispositivos, nombre o revocarlo.
          </p>
        </div>
      </div>

      {selectedEcosystem ? (
        <EcosystemDevicesModal
          ecosystem={selectedEcosystem}
          onClose={handleCloseEcosystemModal}
          onDeviceUpdated={handleDeviceUpdated}
          onEcosystemUpdated={handleEcosystemUpdated}
          onEcosystemRevoked={handleEcosystemRevoked}
          canManageEcosystem={canManageEcosystem}
        />
      ) : null}
    </div>
  )
}
