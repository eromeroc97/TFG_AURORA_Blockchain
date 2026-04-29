import { useEffect, useMemo, useState } from 'react'
import { Pencil, X } from 'lucide-react'
import { apiClient } from '../../api/axios'
import { useAuth } from '../../context/auth-context'
import type { AccessMapDevice, AccessMapEcosystem } from './access-map.data'

type EcosystemDevicesModalProps = {
  ecosystem: AccessMapEcosystem
  onClose: () => void
  onDeviceUpdated: (device: AccessMapDevice) => void
  onEcosystemUpdated: (ecosystem: AccessMapEcosystem) => void
  onEcosystemRevoked: (ecosystemId: string) => void
  canManageEcosystem: boolean
  canRevokeEcosystem: boolean
  initialDeviceId?: string | null
}

export default function EcosystemDevicesModal({
  ecosystem,
  onClose,
  onDeviceUpdated,
  onEcosystemUpdated,
  onEcosystemRevoked,
  canManageEcosystem,
  canRevokeEcosystem,
  initialDeviceId,
}: EcosystemDevicesModalProps) {
  const { authClaims } = useAuth()
  const role = (authClaims?.role ?? 'USER').toUpperCase()
  const isUser = role === 'USER'
  const isAdminOrGlobalAdmin = role === 'ADMIN' || role === 'GLOBAL_ADMIN'

  const devices = ecosystem.devices ?? []
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(devices[0]?.id ?? null)
  const [selectedDevice, setSelectedDevice] = useState<AccessMapDevice | null>(devices[0] ?? null)
  const [editedDeviceName, setEditedDeviceName] = useState<string>(devices[0]?.name ?? '')
  const [editedDeviceLocation, setEditedDeviceLocation] = useState<string>(devices[0]?.location ?? '')
  const [editedDeviceCategory, setEditedDeviceCategory] = useState<string>(devices[0]?.category ?? '')
  const [editedEcosystemName, setEditedEcosystemName] = useState<string>(ecosystem.name)
  const [isDeviceLoading, setIsDeviceLoading] = useState(false)
  const [isDeviceStatusLoading, setIsDeviceStatusLoading] = useState(false)
  const [isDeviceOnline, setIsDeviceOnline] = useState<boolean | null>(null)
  const [lastInteractionAt, setLastInteractionAt] = useState<string | null>(null)
  const [deviceStatusError, setDeviceStatusError] = useState<string | null>(null)
  const [isSavingDeviceName, setIsSavingDeviceName] = useState(false)
  const [isEditingEcosystemName, setIsEditingEcosystemName] = useState(false)
  const [isSavingEcosystemName, setIsSavingEcosystemName] = useState(false)
  const [isConfirmingRevoke, setIsConfirmingRevoke] = useState(false)
  const [isRevoking, setIsRevoking] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [ecosystemError, setEcosystemError] = useState<string | null>(null)
  const [ecosystemSaveMessage, setEcosystemSaveMessage] = useState<string | null>(null)
  const [filterLocation, setFilterLocation] = useState<string>('')
  const [filterCategory, setFilterCategory] = useState<string>('')

  useEffect(() => {
    const initialDevice = initialDeviceId
      ? devices.find((d) => d.id === initialDeviceId)
      : devices[0]
    setSelectedDeviceId(initialDevice?.id ?? null)
    setSelectedDevice(initialDevice ?? null)
    setEditedDeviceName(initialDevice?.name ?? '')
    setEditedDeviceLocation(initialDevice?.location ?? '')
    setEditedDeviceCategory(initialDevice?.category ?? '')
    setEditedEcosystemName(ecosystem.name)
    setIsEditingEcosystemName(false)
    setEcosystemError(null)
    setModalError(null)
    setSaveMessage(null)
  }, [ecosystem.id, initialDeviceId])

  useEffect(() => {
    if (!selectedDeviceId) {
      setSelectedDevice(null)
      setEditedDeviceName('')
      setEditedDeviceLocation('')
      setEditedDeviceCategory('')
      return
    }

    const loadDeviceDetails = async () => {
      setIsDeviceLoading(true)
      setModalError(null)

      try {
        const response = await apiClient.get<AccessMapDevice>(`/devices/${selectedDeviceId}`)
        const deviceDetails = response.data

        setSelectedDevice(deviceDetails)
        setEditedDeviceName(deviceDetails.name)
        setEditedDeviceLocation(deviceDetails.location ?? '')
        setEditedDeviceCategory(deviceDetails.category ?? '')
      } catch {
        const persistedDevice = ecosystem.devices.find((device) => device.id === selectedDeviceId) ?? null
        setSelectedDevice(persistedDevice)
        setEditedDeviceName(persistedDevice?.name ?? '')
        setEditedDeviceLocation(persistedDevice?.location ?? '')
        setEditedDeviceCategory(persistedDevice?.category ?? '')
        setModalError('No se pudo cargar información detallada del dispositivo. Se muestra la información disponible.')
      } finally {
        setIsDeviceLoading(false)
      }
    }

    void loadDeviceDetails()
  }, [selectedDeviceId, ecosystem.devices])

  const displayedDevice = useMemo(() => {
    return selectedDevice ?? devices.find((device) => device.id === selectedDeviceId) ?? null
  }, [devices, selectedDevice, selectedDeviceId])

  const filteredDevices = useMemo(() => {
    return devices.filter((device) => {
      const matchesLocation = !filterLocation || device.location === filterLocation
      const matchesCategory = !filterCategory || device.category === filterCategory
      return matchesLocation && matchesCategory
    })
  }, [devices, filterLocation, filterCategory])

  useEffect(() => {
    if (!selectedDeviceId) {
      setLastInteractionAt(null)
      setIsDeviceOnline(null)
      setDeviceStatusError(null)
      return
    }

    if (!displayedDevice?.macAddress) {
      setLastInteractionAt(null)
      setIsDeviceOnline(null)
      setDeviceStatusError('No se encontró la MAC del dispositivo para consultar el estado.')
      return
    }

    const loadDeviceStatus = async () => {
      setIsDeviceStatusLoading(true)
      setDeviceStatusError(null)

      try {
        const response = await apiClient.get<{ lastInteractionAt: string }>(
          '/iot/devices/last-interaction',
          {
            params: {
              macAddress: displayedDevice.macAddress,
              ecosystemId: ecosystem.id,
            },
          },
        )
        const interactionAt = response.data.lastInteractionAt
        setLastInteractionAt(interactionAt)

        const lastInteractionDate = new Date(interactionAt).getTime()
        const currentTime = Date.now()
        setIsDeviceOnline(currentTime - lastInteractionDate <= 5 * 60 * 1000)
      } catch {
        setLastInteractionAt(null)
        setIsDeviceOnline(null)
        setDeviceStatusError('No se pudo calcular el estado de conexión del dispositivo.')
      } finally {
        setIsDeviceStatusLoading(false)
      }
    }

    void loadDeviceStatus()
  }, [selectedDeviceId, displayedDevice?.macAddress, ecosystem.id])

  const handleSelectDevice = (device: AccessMapDevice) => {
    setSelectedDeviceId(device.id)
    setSaveMessage(null)
    setModalError(null)
  }

  const handleSaveDeviceName = async () => {
    if (!displayedDevice) {
      return
    }

    const trimmedName = editedDeviceName.trim()
    if (trimmedName.length === 0 || trimmedName === displayedDevice.name) {
      return
    }

    setIsSavingDeviceName(true)
    setModalError(null)

    try {
      const response = await apiClient.patch<AccessMapDevice>(`/devices/${displayedDevice.id}`, {
        name: trimmedName,
      })

      setSelectedDevice(response.data)
      onDeviceUpdated(response.data)
      setSaveMessage('Nombre actualizado correctamente.')
    } catch {
      setModalError('No se pudo actualizar el nombre del dispositivo. Inténtalo de nuevo.')
    } finally {
      setIsSavingDeviceName(false)
    }
  }

  const handleSaveEcosystemName = async () => {
    const trimmedName = editedEcosystemName.trim()
    if (trimmedName.length === 0 || trimmedName === ecosystem.name) {
      return
    }

    setIsSavingEcosystemName(true)
    setEcosystemError(null)

    try {
      const response = await apiClient.patch<Partial<AccessMapEcosystem>>(`/ecosystems/${ecosystem.id}`, {
        name: trimmedName,
      })

      onEcosystemUpdated({
        ...ecosystem,
        ...response.data,
        devices: ecosystem.devices,
      })
      setEcosystemSaveMessage('Nombre del ecosistema actualizado correctamente.')
      setIsEditingEcosystemName(false)
    } catch {
      setEcosystemError('No se pudo actualizar el nombre del ecosistema. Inténtalo de nuevo.')
    } finally {
      setIsSavingEcosystemName(false)
    }
  }

  const handleConfirmRevoke = async () => {
    setIsRevoking(true)
    setModalError(null)

    try {
      await apiClient.post(`/ecosystems/${ecosystem.id}/revoke`)
      onEcosystemRevoked(ecosystem.id)
      setIsConfirmingRevoke(false)
      onClose()
    } catch {
      setModalError('No se pudo dar de baja el ecosistema. Inténtalo de nuevo.')
    } finally {
      setIsRevoking(false)
    }
  }

  const deviceStatusLabel = isDeviceStatusLoading
    ? 'Verificando estado'
    : isDeviceOnline === true
      ? 'ONLINE'
      : isDeviceOnline === false
        ? 'OFFLINE'
        : 'Desconocido'

  const deviceStatusClassName = isDeviceStatusLoading
    ? 'border border-accent/20 bg-accent/10 text-accent'
    : isDeviceOnline === true
      ? 'border border-emerald-200 bg-emerald-100 text-emerald-700'
      : isDeviceOnline === false
        ? 'border border-rose-200 bg-rose-50 text-rose-700'
        : 'border border-slate-200 bg-slate-100 text-slate-700'

  return (
    <div className="fixed inset-0 z-[90] h-dvh w-screen flex items-center justify-center bg-black/25 px-4 backdrop-blur-sm">
      <div className="w-full max-w-6xl max-h-[calc(100vh-4rem)] overflow-hidden rounded-[1.5rem] border border-border bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-primary">Dispositivos del ecosistema</h3>
            {isEditingEcosystemName ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  aria-label="Nombre del ecosistema"
                  value={editedEcosystemName}
                  onChange={(event) => setEditedEcosystemName(event.target.value)}
                  className="w-full max-w-md rounded-2xl border border-border bg-white px-4 py-3 text-sm text-primary outline-none transition-colors focus:border-accent"
                />
                <button
                  type="button"
                  onClick={handleSaveEcosystemName}
                  disabled={
                    isSavingEcosystemName || editedEcosystemName.trim().length === 0 || editedEcosystemName.trim() === ecosystem.name
                  }
                  className="inline-flex items-center justify-center rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-primary transition-colors hover:bg-accent/80 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingEcosystemName ? 'Guardando...' : 'Guardar nombre ecosistema'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingEcosystemName(false)
                    setEditedEcosystemName(ecosystem.name)
                    setEcosystemError(null)
                    setEcosystemSaveMessage(null)
                  }}
                  className="inline-flex items-center justify-center rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-primary transition-colors hover:bg-surface/50"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <p className="text-sm text-muted">{ecosystem.name}</p>
                {canManageEcosystem && (
                  <button
                    type="button"
                    onClick={() => setIsEditingEcosystemName(true)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-border bg-white px-3 py-2 text-sm font-semibold text-primary transition-colors hover:bg-surface/70"
                  >
                    <Pencil className="size-4" />
                    Editar ecosistema
                  </button>
                )}
                {canRevokeEcosystem && (
                  <button
                    type="button"
                    onClick={() => setIsConfirmingRevoke(true)}
                    className="inline-flex items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-100"
                  >
                    Dar de baja ecosistema
                  </button>
                )}
              </div>
            )}
            {ecosystemError ? <p className="mt-2 text-sm text-rose-600">{ecosystemError}</p> : null}
            {ecosystemSaveMessage ? <p className="mt-2 text-sm text-emerald-700">{ecosystemSaveMessage}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal de dispositivos"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-primary transition-colors hover:bg-surface/70"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="rounded-3xl border border-border bg-surface/60 p-4 overflow-hidden">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Lista de dispositivos</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <select
                value={filterLocation}
                onChange={(event) => setFilterLocation(event.target.value)}
                className="flex-1 rounded-xl border border-border bg-white px-2 py-1.5 text-xs text-primary outline-none focus:border-accent"
              >
                <option value="">Todas las ubicaciones</option>
                <option value="SALON">Salón</option>
                <option value="COCINA">Cocina</option>
                <option value="HABITACION">Habitación</option>
                <option value="BAÑO">Baño</option>
                <option value="OTRO">Otro</option>
              </select>
              <select
                value={filterCategory}
                onChange={(event) => setFilterCategory(event.target.value)}
                className="flex-1 rounded-xl border border-border bg-white px-2 py-1.5 text-xs text-primary outline-none focus:border-accent"
              >
                <option value="">Todas las categorías</option>
                <option value="BOMBILLA">Bombilla</option>
                <option value="PANEL_INTELIGENTE">Panel</option>
                <option value="ENCHUFE_INTELIGENTE">Enchufe</option>
                <option value="OTRO">Otro</option>
              </select>
            </div>
            <div className="mt-3 max-h-[calc(100vh-22rem)] overflow-y-auto pr-2 space-y-2">
              {filteredDevices.length > 0 ? (
                filteredDevices.map((device) => (
                  <button
                    key={device.id}
                    type="button"
                    onClick={() => handleSelectDevice(device)}
                    className={`w-full rounded-2xl px-4 py-3 text-left transition-all border-2 ${
                      device.id === selectedDeviceId ? 'border-primary bg-primary/10 text-primary shadow-sm' : 'border-transparent bg-white text-primary/80 hover:bg-surface/80'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium">{device.name}</span>
                      <span className="text-[0.65rem] uppercase tracking-[0.2em] text-muted">ID</span>
                    </div>
                    <p className="mt-1 text-xs text-muted">{device.vendor ?? 'Sin vendor'}</p>
                  </button>
                ))
              ) : (
                <div className="rounded-2xl border border-border bg-white px-4 py-6 text-sm text-muted">
                  {ecosystem.devices.length === 0
                    ? 'No hay dispositivos registrados para este ecosistema.'
                    : 'No hay dispositivos que coincidan con los filtros seleccionados.'}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-surface/60 p-6 overflow-hidden">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Detalles del dispositivo</p>
                <p className="mt-1 text-sm text-muted">Selecciona un dispositivo para ver la información completa.</p>
              </div>
              <div className={`rounded-full px-3 py-1 text-[0.65rem] uppercase tracking-[0.2em] ${deviceStatusClassName}`}>
                {deviceStatusLabel}
              </div>
            </div>
            {lastInteractionAt ? (
              <p className="mt-2 text-xs uppercase tracking-[0.2em] text-muted">
                Última interacción: {new Date(lastInteractionAt).toLocaleString()}
              </p>
            ) : null}
            {deviceStatusError ? <p className="mt-2 text-sm text-rose-600">{deviceStatusError}</p> : null}
            {modalError ? <p className="mt-4 text-sm text-rose-600">{modalError}</p> : null}
            {saveMessage ? <p className="mt-4 text-sm text-emerald-700">{saveMessage}</p> : null}

            {isDeviceLoading && !displayedDevice ? (
              <div className="mt-6 rounded-2xl border border-border bg-white px-4 py-6 text-sm text-muted">Cargando datos del dispositivo...</div>
            ) : displayedDevice ? (
              <div className="mt-6 space-y-4 max-h-[calc(100vh-22rem)] overflow-y-auto pr-2">
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-primary">Nombre del dispositivo</span>
                  {isUser ? (
                    <input
                      type="text"
                      value={editedDeviceName}
                      onChange={(event) => setEditedDeviceName(event.target.value)}
                      className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-primary outline-none transition-colors focus:border-accent"
                    />
                  ) : (
                    <div className="rounded-2xl border border-border bg-slate-50 px-4 py-3 text-sm text-primary">
                      {displayedDevice.name}
                    </div>
                  )}
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-primary">Localización</span>
                    {isUser ? (
                      <select
                        value={editedDeviceLocation}
                        onChange={(event) => setEditedDeviceLocation(event.target.value)}
                        className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-primary outline-none transition-colors focus:border-accent"
                      >
                        <option value="">Seleccionar...</option>
                        <option value="SALON">Salón</option>
                        <option value="COCINA">Cocina</option>
                        <option value="HABITACION">Habitación</option>
                        <option value="BAÑO">Baño</option>
                        <option value="OTRO">Otro</option>
                      </select>
                    ) : (
                      <div className="rounded-2xl border border-border bg-slate-50 px-4 py-3 text-sm text-primary">
                        {displayedDevice.location || 'No disponible'}
                      </div>
                    )}
                  </label>
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-primary">Categoría</span>
                    {isUser ? (
                      <select
                        value={editedDeviceCategory}
                        onChange={(event) => setEditedDeviceCategory(event.target.value)}
                        className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-primary outline-none transition-colors focus:border-accent"
                      >
                        <option value="">Seleccionar...</option>
                        <option value="BOMBILLA">Bombilla</option>
                        <option value="PANEL_INTELIGENTE">Panel Inteligente</option>
                        <option value="ENCHUFE_INTELIGENTE">Enchufe Inteligente</option>
                        <option value="OTRO">Otro</option>
                      </select>
                    ) : (
                      <div className="rounded-2xl border border-border bg-slate-50 px-4 py-3 text-sm text-primary">
                        {displayedDevice.category || 'No disponible'}
                      </div>
                    )}
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-border bg-white p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted">Mac address</p>
                    <p className="mt-2 text-sm text-primary">{displayedDevice.macAddress ?? 'No disponible'}</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-white p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted">Vendor</p>
                    <p className="mt-2 text-sm text-primary">{displayedDevice.vendor ?? 'No disponible'}</p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-border bg-white p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted">Ecosistema</p>
                    <p className="mt-2 text-sm text-primary">{ecosystem.name}</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-white p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted">Última actualización</p>
                    <p className="mt-2 text-sm text-primary">{new Date(displayedDevice.updatedAt).toLocaleString()}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-white p-4 text-sm text-muted">
                  <p className="font-semibold text-primary">Información adicional</p>
                  <p className="mt-2">
                    Para ver datos de telemetría y metadatos extendidos desde Mongo / el microservicio IoT, se requiere una integración de backend adicional.
                  </p>
                </div>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex items-center justify-center rounded-2xl border border-border bg-white px-5 py-3 text-sm font-semibold text-primary transition-colors hover:bg-surface/50"
                  >
                    Cerrar
                  </button>
                  {isUser && (
                    <button
                      type="button"
                      disabled={isSavingDeviceName || editedDeviceName.trim().length === 0 || editedDeviceName.trim() === displayedDevice.name}
                      onClick={handleSaveDeviceName}
                      className="inline-flex items-center justify-center rounded-2xl bg-accent px-5 py-3 text-sm font-semibold text-primary transition-colors hover:bg-accent/80 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSavingDeviceName ? 'Guardando...' : 'Guardar'}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-border bg-white px-4 py-6 text-sm text-muted">
                Selecciona un dispositivo para ver su información.
              </div>
            )}
          </div>
        </div>
        {isConfirmingRevoke ? (
          <div className="absolute inset-0 z-[95] flex items-center justify-center bg-black/20 px-4 py-6">
            <div className="w-full max-w-lg rounded-[1.5rem] border border-border bg-white p-6 shadow-2xl">
              <div className="flex items-start gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-700">
                  <X className="size-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-primary">Confirmar baja de ecosistema</h3>
                  <p className="text-sm leading-6 text-muted">
                    ¿Estás seguro de que quieres dar de baja el ecosistema <strong>{ecosystem.name}</strong>? Esta acción lo eliminará de tu lista.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setIsConfirmingRevoke(false)}
                  className="inline-flex items-center justify-center rounded-2xl border border-border bg-white px-5 py-3 text-sm font-semibold text-primary transition-colors hover:bg-surface/50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRevoke}
                  disabled={isRevoking}
                  className="inline-flex items-center justify-center rounded-2xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isRevoking ? 'Dando de baja...' : 'Confirmar baja'}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
