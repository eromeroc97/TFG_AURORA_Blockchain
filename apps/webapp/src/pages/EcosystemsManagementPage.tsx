import { useEffect, useMemo, useState } from 'react'
import { Check, Copy, Eye, EyeOff, House, Key, Plus, Share2, TreeDeciduous, UserMinus, X } from 'lucide-react'
import { apiClient } from '../api/axios'
import { useAuth } from '../context/auth-context'
import EcosystemDevicesModal from '../components/dashboard/EcosystemDevicesModal'
import { useEcosystemsController } from '../controllers/useEcosystemsController'
import type { AccessMapEcosystem } from '../components/dashboard/access-map.data'

type CreateEcosystemStep = 'form' | 'confirm' | 'result'

export default function EcosystemsManagementPage() {
  const { authClaims } = useAuth()
  const role = (authClaims?.role ?? 'USER').toUpperCase()
  const userId = authClaims?.sub
  const isUser = role === 'USER'
  const isAdminOrGlobalAdmin = role === 'ADMIN' || role === 'GLOBAL_ADMIN'

  const { ecosystems, isLoading, error, isCreating, refreshEcosystems, createEcosystem } = useEcosystemsController()
  const [visibleEcosystems, setVisibleEcosystems] = useState<AccessMapEcosystem[]>(ecosystems)
  const [selectedEcosystem, setSelectedEcosystem] = useState<AccessMapEcosystem | null>(null)

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [createStep, setCreateStep] = useState<CreateEcosystemStep>('form')
  const [newEcosystemName, setNewEcosystemName] = useState('')
  const [newEcosystemApiKey, setNewEcosystemApiKey] = useState<string | null>(null)
  const [newEcosystemId, setNewEcosystemId] = useState<string | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)
  const [revealedApiKey, setRevealedApiKey] = useState(false)
  const [copiedKey, setCopiedKey] = useState(false)
  const [apiKeysByEcosystemId, setApiKeysByEcosystemId] = useState<Record<string, string>>({})
  const [revealedApiKeysByEcosystemId, setRevealedApiKeysByEcosystemId] = useState<Record<string, boolean>>({})
  const [apiKeyLoadingByEcosystemId, setApiKeyLoadingByEcosystemId] = useState<Record<string, boolean>>({})
  const [shareModalEcosystem, setShareModalEcosystem] = useState<AccessMapEcosystem | null>(null)
  const [shareEmail, setShareEmail] = useState('')
  const [isSharing, setIsSharing] = useState(false)
  const [shareError, setShareError] = useState<string | null>(null)
  const [revokingEcosystemId, setRevokingEcosystemId] = useState<string | null>(null)

  useEffect(() => {
    setVisibleEcosystems(ecosystems)
  }, [ecosystems])

  const fetchEcosystemApiKey = async (ecosystemId: string) => {
    if (apiKeysByEcosystemId[ecosystemId]) {
      return apiKeysByEcosystemId[ecosystemId]
    }

    setApiKeyLoadingByEcosystemId((current) => ({ ...current, [ecosystemId]: true }))
    try {
      const response = await apiClient.get<{ apiKey: string }>(`/ecosystems/${ecosystemId}/api-key`)
      const apiKey = response.data.apiKey
      setApiKeysByEcosystemId((current) => ({ ...current, [ecosystemId]: apiKey }))
      return apiKey
    } catch {
      return null
    } finally {
      setApiKeyLoadingByEcosystemId((current) => ({ ...current, [ecosystemId]: false }))
    }
  }

  const toggleApiKeyVisibility = async (ecosystemId: string) => {
    const nextIsVisible = !revealedApiKeysByEcosystemId[ecosystemId]
    setRevealedApiKeysByEcosystemId((current) => ({ ...current, [ecosystemId]: nextIsVisible }))

    if (nextIsVisible) {
      await fetchEcosystemApiKey(ecosystemId)
    }
  }

  const copyEcosystemApiKey = async (ecosystemId: string) => {
    const apiKey = await fetchEcosystemApiKey(ecosystemId)
    if (apiKey) {
      await navigator.clipboard.writeText(apiKey)
      setTimeout(() => {
        setApiKeysByEcosystemId((current) => ({ ...current, [ecosystemId]: '' }))
      }, 1500)
    }
  }

  const openShareModal = (ecosystem: AccessMapEcosystem) => {
    setShareModalEcosystem(ecosystem)
    setShareEmail('')
    setShareError(null)
  }

  const closeShareModal = () => {
    setShareModalEcosystem(null)
    setShareEmail('')
    setShareError(null)
  }

  const handleShareEcosystem = async () => {
    if (!shareModalEcosystem || !shareEmail.trim()) return

    setIsSharing(true)
    setShareError(null)

    try {
      await apiClient.post(`/ecosystems/${shareModalEcosystem.id}/share`, {
        email: shareEmail.trim(),
      })
      closeShareModal()
      await refreshEcosystems()
    } catch {
      setShareError('No se pudo compartir el ecosistema. Verifica el email e intenta de nuevo.')
    } finally {
      setIsSharing(false)
    }
  }

  const handleRevokeSharing = async (ecosystemId: string) => {
    setRevokingEcosystemId(ecosystemId)
    try {
      await apiClient.delete(`/ecosystems/${ecosystemId}/share`)
      await refreshEcosystems()
    } catch {
    } finally {
      setRevokingEcosystemId(null)
    }
  }

  const maskApiKey = (key: string) => {
    if (key.length <= 8) return '••••••••'
    return key.slice(0, 4) + '••••••••' + key.slice(-4)
  }

  const closeCreateModal = () => {
    setIsCreateModalOpen(false)
    setCreateStep('form')
    setNewEcosystemName('')
    setNewEcosystemApiKey(null)
    setNewEcosystemId(null)
    setCreateError(null)
    setRevealedApiKey(false)
    setCopiedKey(false)
  }

  const openCreateModal = () => {
    setCreateStep('form')
    setNewEcosystemName('')
    setNewEcosystemApiKey(null)
    setNewEcosystemId(null)
    setCreateError(null)
    setRevealedApiKey(false)
    setCopiedKey(false)
    setIsCreateModalOpen(true)
  }

  const handleCreateEcosystem = async () => {
    const name = newEcosystemName.trim()
    if (!name) return

    try {
      const created = await createEcosystem(name)
      setNewEcosystemApiKey(created.apiKey)
      setNewEcosystemId(created.id)
      setCreateStep('result')
    } catch {
      setCreateError('No se pudo crear el ecosistema. Inténtalo de nuevo.')
    }
  }

  const copyApiKey = async () => {
    if (newEcosystemApiKey) {
      await navigator.clipboard.writeText(newEcosystemApiKey)
      setCopiedKey(true)
      setTimeout(() => setCopiedKey(false), 1500)
    }
  }

  const sharedEcosystemCount = useMemo(
    () => visibleEcosystems.filter((eco) => eco.isShared).length,
    [visibleEcosystems],
  )

  const ecosystemsSharedWithMe = useMemo(
    () => visibleEcosystems.filter((eco) => eco.isShared && eco.ownerId !== userId),
    [visibleEcosystems, userId],
  )

  const totalDevicesCount = useMemo(
    () => visibleEcosystems.reduce((sum, eco) => sum + (eco.devices?.length ?? 0), 0),
    [visibleEcosystems],
  )

  const canManageEcosystem = role === 'USER'
  const canRevokeEcosystem = role === 'USER' || isAdminOrGlobalAdmin

  const handleOpenEcosystemModal = (ecosystem: AccessMapEcosystem) => {
    setSelectedEcosystem((current) =>
      current?.id === ecosystem.id ? current : ecosystem,
    )
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
            <p className="text-sm text-slate-500">Dispositivos totales</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{totalDevicesCount}</p>
          </div>
        </div>

<div className="rounded-[1.75rem] border border-border bg-white p-6 shadow-aurora">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-primary">
              <House className="size-5 text-accent" />
              <h2 className="font-heading text-xl font-semibold">Ecosistemas Smart Home</h2>
            </div>
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-emerald-700"
            >
              <Plus className="h-3.5 w-3.5" />
              Añadir ecosistema
            </button>
          </div>
          <p className="mt-3 text-xs text-muted">Aquí puedes obtener informacion de tus ecosistemas o añadir nuevos.</p>

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
                <article
                  key={ecosystem.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleOpenEcosystemModal(ecosystem)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      handleOpenEcosystemModal(ecosystem)
                    }
                  }}
                  className="w-full cursor-pointer text-left rounded-2xl border border-border/50 bg-surface/30 p-4 transition hover:border-border hover:bg-surface/50 focus:outline-none focus:ring-2 focus:ring-accent/30"
                  aria-label={`Abrir ecosistema ${ecosystem.name}`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-medium text-primary">{ecosystem.name}</p>
                      {isUser && ecosystem.ownerId === userId && (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {apiKeysByEcosystemId[ecosystem.id] || revealedApiKeysByEcosystemId[ecosystem.id] ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleApiKeyVisibility(ecosystem.id)
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-border bg-white px-2 py-1 text-xs text-primary"
                            >
                              {revealedApiKeysByEcosystemId[ecosystem.id] ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                              {revealedApiKeysByEcosystemId[ecosystem.id]
                                ? maskApiKey(apiKeysByEcosystemId[ecosystem.id] || '')
                                : 'Ver API Key'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleApiKeyVisibility(ecosystem.id)
                              }}
                              disabled={apiKeyLoadingByEcosystemId[ecosystem.id]}
                              className="inline-flex items-center gap-1 rounded-lg border border-border bg-white px-2 py-1 text-xs text-primary hover:bg-surface/50 disabled:opacity-50"
                            >
                              <Key className="size-3" />
                              {apiKeyLoadingByEcosystemId[ecosystem.id] ? 'Cargando...' : 'Recuperar API Key'}
                            </button>
                          )}
                          {(apiKeysByEcosystemId[ecosystem.id] || revealedApiKeysByEcosystemId[ecosystem.id]) && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                copyEcosystemApiKey(ecosystem.id)
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-border bg-white px-2 py-1 text-xs text-primary hover:bg-surface/50"
                            >
                              <Copy className="size-3" />
                              Copiar
                            </button>
                          )}
                        </div>
                      )}
                      {!isUser && (
                        <p className="text-xs text-muted mt-1">Propietario: {ecosystem.ownerId ?? 'Desconocido'}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {isUser && ecosystem.ownerId === userId && !ecosystem.isShared && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            openShareModal(ecosystem)
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-border bg-white px-2 py-1 text-xs text-primary hover:bg-surface/50"
                        >
                          <Share2 className="size-3" />
                          Compartir
                        </button>
                      )}
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-accent/10 text-accent">
                        {ecosystem.isShared ? 'Compartido' : 'Privado'}
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 rounded-[1.75rem] border border-border bg-white p-6 shadow-aurora">
          <div className="flex items-center gap-3 text-primary">
            <Share2 className="size-5 text-accent" />
            <h2 className="font-heading text-xl font-semibold">Ecosistemas compartidos conmigo</h2>
          </div>
          <p className="mt-3 text-xs text-muted">Ecosistemas que otros usuarios han compartido contigo.</p>

          {ecosystemsSharedWithMe.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-slate-700">
              <p className="font-medium text-slate-900">No hay ecosistemas compartidos contigo.</p>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {ecosystemsSharedWithMe.map((ecosystem) => (
                <article
                  key={ecosystem.id}
                  className="w-full rounded-2xl border border-border/50 bg-surface/30 p-4 transition hover:border-border hover:bg-surface/50"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-medium text-primary">{ecosystem.name}</p>
                      <p className="text-xs text-muted mt-1">Propietario: {ecosystem.ownerId ?? 'Desconocido'}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRevokeSharing(ecosystem.id)}
                      disabled={revokingEcosystemId === ecosystem.id}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-600 hover:bg-rose-100 disabled:opacity-50"
                    >
                      {revokingEcosystemId === ecosystem.id ? (
                        <>Revocando...</>
                      ) : (
                        <>
                          <UserMinus className="size-3" />
                          Dejar de compartir
                        </>
                      )}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
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
          canRevokeEcosystem={canRevokeEcosystem}
        />
      ) : null}

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[90] h-dvh w-screen flex items-center justify-center bg-black/25 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[1.5rem] border border-border bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <Plus className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-slate-900">Registrar ecosistema</h3>
                <p className="text-sm leading-6 text-slate-500">
                  {createStep === 'form'
                    ? 'Introduce el nombre del nuevo ecosistema.'
                    : createStep === 'confirm'
                      ? 'Confirma la creación para generar la API key.'
                      : 'Ecosistema registrado correctamente.'}
                </p>
              </div>
            </div>

            {createStep === 'form' && (
              <div className="mt-6 space-y-2">
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-900">Nombre del ecosistema</span>
                  <input
                    type="text"
                    value={newEcosystemName}
                    onChange={(event) => setNewEcosystemName(event.target.value)}
                    placeholder="Ej. Mi hogar inteligente"
                    className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </label>
              </div>
            )}

            {createStep === 'confirm' && (
              <div className="mt-6 rounded-2xl border border-border bg-slate-50 p-4 text-sm text-slate-900">
                <p>
                  <span className="font-semibold">Nombre:</span> {newEcosystemName.trim()}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  Al confirmar, se generará una API key única para este ecosistema.
                </p>
                {createError && <p className="mt-2 text-xs text-rose-600">{createError}</p>}
              </div>
            )}

            {createStep === 'result' && (
              <div className="mt-6 space-y-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
                <p className="text-sm font-semibold text-emerald-800">API key generada</p>
                {newEcosystemApiKey && (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setRevealedApiKey(!revealedApiKey)}
                      className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-white px-2 py-1 text-xs text-emerald-800"
                    >
                      {revealedApiKey ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                      {revealedApiKey ? newEcosystemApiKey : maskApiKey(newEcosystemApiKey)}
                    </button>
                    <button
                      type="button"
                      onClick={copyApiKey}
                      className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-white px-2 py-1 text-xs text-emerald-800"
                    >
                      {copiedKey ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                      {copiedKey ? 'Copiada' : 'Copiar'}
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeCreateModal}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100"
              >
                {createStep === 'result' ? 'Cerrar' : 'Cancelar'}
              </button>

              {createStep === 'form' && (
                <button
                  type="button"
                  disabled={newEcosystemName.trim().length < 3}
                  onClick={() => setCreateStep('confirm')}
                  className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Continuar
                </button>
              )}

              {createStep === 'confirm' && (
                <button
                  type="button"
                  disabled={isCreating}
                  onClick={handleCreateEcosystem}
                  className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isCreating ? 'Creando ecosistema...' : 'Confirmar y generar API key'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {shareModalEcosystem && (
        <div className="fixed inset-0 z-[90] h-dvh w-screen flex items-center justify-center bg-black/25 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[1.5rem] border border-border bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <Share2 className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-slate-900">Compartir ecosistema</h3>
                <p className="text-sm leading-6 text-slate-500">
                  Comparte "{shareModalEcosystem.name}" con otro usuario.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-900">Email del usuario</span>
                <input
                  type="email"
                  value={shareEmail}
                  onChange={(event) => setShareEmail(event.target.value)}
                  placeholder="usuario@ejemplo.com"
                  className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </label>
              {shareError && <p className="text-xs text-rose-600">{shareError}</p>}
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeShareModal}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSharing || !shareEmail.trim()}
                onClick={handleShareEcosystem}
                className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSharing ? 'Compartiendo...' : 'Compartir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
