import { useEffect, useMemo, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, Copy, Eye, EyeOff, House, Info, Key, Lightbulb, Plus, Search, Share2, Thermometer, UserMinus, Wifi } from 'lucide-react'
import { apiClient } from '../api/axios'
import { useAuth } from '../context/auth-context'
import EcosystemDevicesModal from '../components/dashboard/EcosystemDevicesModal'
import { useEcosystemsController } from '../controllers/useEcosystemsController'
import { getUserById } from '../services/users.service'
import Select from '../components/Select'
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
  const [detailEcosystemId, setDetailEcosystemId] = useState<string | null>(null)
  const [selectedDeviceFromPlan, setSelectedDeviceFromPlan] = useState<string | null>(null)

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [createStep, setCreateStep] = useState<CreateEcosystemStep>('form')
  const [newEcosystemName, setNewEcosystemName] = useState('')
  const [newEcosystemApiKey, setNewEcosystemApiKey] = useState<string | null>(null)
  const [setNewEcosystemId] = useState<string | null>(null)
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

  const PAGE_SIZES = [10, 25, 50, 100] as const

  const [searchTerm, setSearchTerm] = useState('')
  const [sharedStatusFilter, setSharedStatusFilter] = useState<'ALL' | 'SHARED' | 'PRIVATE'>('ALL')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(10)
  const [ownerEmails, setOwnerEmails] = useState<Record<string, string>>({})
  const [sharedSearchTerm, setSharedSearchTerm] = useState('')
  const [sharedCurrentPage, setSharedCurrentPage] = useState(1)
  const [sharedPageSize, setSharedPageSize] = useState<(typeof PAGE_SIZES)[number]>(10)

  useEffect(() => {
    const loadOwnerEmails = async () => {
      const uniqueOwnerIds = [...new Set(visibleEcosystems.map((eco) => eco.ownerId).filter(Boolean))]
      const newEmails: Record<string, string> = {}
      for (const ownerId of uniqueOwnerIds) {
        if (ownerId && !ownerEmails[ownerId]) {
          const user = await getUserById(ownerId)
          if (user?.email) {
            newEmails[ownerId] = user.email
          }
        }
      }
      if (Object.keys(newEmails).length > 0) {
        setOwnerEmails((prev) => ({ ...prev, ...newEmails }))
      }
    }
    loadOwnerEmails()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleEcosystems.map((e) => e.ownerId).join(',')])

  useEffect(() => {
    setVisibleEcosystems(ecosystems)
  }, [ecosystems])

  useEffect(() => {
    if (!detailEcosystemId && visibleEcosystems.length > 0) {
      setDetailEcosystemId(visibleEcosystems[0].id)
    }
  }, [visibleEcosystems, detailEcosystemId])

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

  const filteredSharedEcosystems = useMemo(
    () =>
      ecosystemsSharedWithMe.filter((eco) => {
        const matchesSearch =
          eco.name.toLowerCase().includes(sharedSearchTerm.toLowerCase()) ||
          (eco.ownerId && eco.ownerId.toLowerCase().includes(sharedSearchTerm.toLowerCase()))
        return matchesSearch
      }),
    [ecosystemsSharedWithMe, sharedSearchTerm],
  )

  const sharedTotalPages = Math.ceil(filteredSharedEcosystems.length / sharedPageSize)
  const paginatedSharedEcosystems = useMemo(
    () => {
      const start = (sharedCurrentPage - 1) * sharedPageSize
      return filteredSharedEcosystems.slice(start, start + sharedPageSize)
    },
    [filteredSharedEcosystems, sharedCurrentPage, sharedPageSize],
  )

  const handleSharedPageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= sharedTotalPages) {
      setSharedCurrentPage(newPage)
    }
  }

  useEffect(() => {
    setSharedCurrentPage(1)
  }, [sharedSearchTerm])

  const totalDevicesCount = useMemo(
    () => visibleEcosystems.reduce((sum, eco) => sum + (eco.devices?.length ?? 0), 0),
    [visibleEcosystems],
  )

  const filteredEcosystems = useMemo(
    () =>
      visibleEcosystems.filter((eco) => {
        const matchesSearch =
          eco.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (eco.ownerId && eco.ownerId.toLowerCase().includes(searchTerm.toLowerCase()))
        const matchesSharedStatus =
          sharedStatusFilter === 'ALL' ||
          (sharedStatusFilter === 'SHARED' && eco.isShared) ||
          (sharedStatusFilter === 'PRIVATE' && !eco.isShared)
        return matchesSearch && matchesSharedStatus
      }),
    [visibleEcosystems, searchTerm, sharedStatusFilter],
  )

  const totalPages = Math.ceil(filteredEcosystems.length / pageSize)
  const paginatedEcosystems = useMemo(
    () => {
      const start = (currentPage - 1) * pageSize
      return filteredEcosystems.slice(start, start + pageSize)
    },
    [filteredEcosystems, currentPage, pageSize],
  )

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
    }
  }

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, sharedStatusFilter])

  const ROOM_ORDER = ['Salón', 'Dormitorio', 'Cocina', 'Baño', 'Otro']

  const getRoomFromDevice = (device: AccessMapDevice): string => {
    if (device.room && ROOM_ORDER.includes(device.room)) {
      return device.room
    }
    if (device.location && ROOM_ORDER.slice(0, -1).some((r) => device.location!.toLowerCase().includes(r.toLowerCase()))) {
      const found = ROOM_ORDER.slice(0, -1).find((r) => device.location!.toLowerCase().includes(r.toLowerCase()))
      return found || 'Otro'
    }
    return 'Otro'
  }

  const canManageEcosystem = role === 'USER'
  const canRevokeEcosystem = role === 'USER' || isAdminOrGlobalAdmin

  const handleOpenEcosystemModal = (ecosystem: AccessMapEcosystem) => {
    setSelectedEcosystem((current) =>
      current?.id === ecosystem.id ? current : ecosystem,
    )
  }

  const handleSelectEcosystem = (ecosystem: AccessMapEcosystem) => {
    setDetailEcosystemId((current) => (current === ecosystem.id ? null : ecosystem.id))
  }

  const detailEcosystem = useMemo(
    () => visibleEcosystems.find((eco) => eco.id === detailEcosystemId) ?? null,
    [visibleEcosystems, detailEcosystemId],
  )

  const devicesByRoom = useMemo(() => {
    if (!detailEcosystem?.devices) return {}

    const grouped: Record<string, AccessMapDevice[]> = {}
    for (const room of ROOM_ORDER) {
      grouped[room] = []
    }

    for (const device of detailEcosystem.devices) {
      const room = getRoomFromDevice(device)
      grouped[room].push(device)
    }

    return grouped
  }, [detailEcosystem])

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

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-5 space-y-6">
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

              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre o propietario..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-xl border border-border bg-white pl-10 pr-4 py-2 text-sm text-primary outline-none transition-colors focus:border-accent"
                  />
                </div>
                <Select
                  value={sharedStatusFilter}
                  onChange={(value) => setSharedStatusFilter(value as 'ALL' | 'SHARED' | 'PRIVATE')}
                  options={[
                    { value: 'ALL', label: 'Todos los estados' },
                    { value: 'PRIVATE', label: 'Privado' },
                    { value: 'SHARED', label: 'Compartido' },
                  ]}
                  className="w-44"
                />
              </div>

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
              ) : paginatedEcosystems.length === 0 ? (
                <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-slate-700">
                  <p className="font-medium text-slate-900">No hay ecosistemas disponibles.</p>
                </div>
              ) : (
                <>
                  <div className="mt-6 space-y-3">
                    {paginatedEcosystems.map((ecosystem) => (
                    <article
                      key={ecosystem.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        handleSelectEcosystem(ecosystem)
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          handleSelectEcosystem(ecosystem)
                        }
                      }}
                      className={`w-full cursor-pointer text-left rounded-2xl border p-4 transition ${
                        detailEcosystemId === ecosystem.id
                          ? 'border-accent bg-accent/5'
                          : 'border-border/50 bg-surface/30 hover:border-border hover:bg-surface/50'
                      }`}
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
                            <p className="text-xs text-muted mt-1">
                              Propietario: {ecosystem.ownerId ? ownerEmails[ecosystem.ownerId] ?? ecosystem.ownerId : 'Desconocido'}
                            </p>
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

                {filteredEcosystems.length > 0 && (
                  <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-500">Mostrar</span>
                      <Select
                        value={String(pageSize)}
                        onChange={(value) => {
                          setPageSize(Number(value) as typeof pageSize)
                          setCurrentPage(1)
                        }}
                        options={PAGE_SIZES.map((size) => ({ value: String(size), label: String(size) }))}
                        className="w-20"
                      />
                      <span className="text-sm text-slate-500">resultados</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="inline-flex items-center justify-center rounded-lg border border-border bg-white p-2 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <ChevronLeft className="size-4" />
                      </button>
                      <span className="text-sm text-slate-600">
                        Página {currentPage} de {totalPages}
                      </span>
                      <button
                        type="button"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="inline-flex items-center justify-center rounded-lg border border-border bg-white p-2 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <ChevronRight className="size-4" />
                      </button>
                    </div>
                  </div>
                )}
                </>
              )}
            </div>

            {isUser && (
            <div className="rounded-[1.75rem] border border-border bg-white p-6 shadow-aurora">
              <div className="flex items-center gap-3 text-primary">
                <Share2 className="size-5 text-accent" />
                <h2 className="font-heading text-xl font-semibold">Ecosistemas compartidos conmigo</h2>
              </div>
              <p className="mt-3 text-xs text-muted">Ecosistemas que otros usuarios han compartido contigo.</p>

              <div className="mt-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre o propietario..."
                    value={sharedSearchTerm}
                    onChange={(e) => setSharedSearchTerm(e.target.value)}
                    className="w-full rounded-xl border border-border bg-white pl-10 pr-4 py-2 text-sm text-primary outline-none transition-colors focus:border-accent"
                  />
                </div>
              </div>

              {filteredSharedEcosystems.length === 0 ? (
                <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-slate-700">
                  <p className="font-medium text-slate-900">No hay ecosistemas compartidos contigo.</p>
                </div>
              ) : (
                <>
                  <div className="mt-6 space-y-3">
                    {paginatedSharedEcosystems.map((ecosystem) => (
                      <article
                        key={ecosystem.id}
                        className="w-full rounded-2xl border border-border/50 bg-surface/30 p-4 transition hover:border-border hover:bg-surface/50"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1">
                            <p className="font-medium text-primary">{ecosystem.name}</p>
                            <p className="text-xs text-muted mt-1">
                              Propietario: {ecosystem.ownerId ? ownerEmails[ecosystem.ownerId] ?? ecosystem.ownerId : 'Desconocido'}
                            </p>
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

                  {filteredSharedEcosystems.length > 0 && (
                    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-500">Mostrar</span>
                        <Select
                          value={String(sharedPageSize)}
                          onChange={(value) => {
                            setSharedPageSize(Number(value) as typeof sharedPageSize)
                            setSharedCurrentPage(1)
                          }}
                          options={PAGE_SIZES.map((size) => ({ value: String(size), label: String(size) }))}
                          className="w-20"
                        />
                        <span className="text-sm text-slate-500">resultados</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSharedPageChange(sharedCurrentPage - 1)}
                          disabled={sharedCurrentPage === 1}
                          className="inline-flex items-center justify-center rounded-lg border border-border bg-white p-2 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <ChevronLeft className="size-4" />
                        </button>
                        <span className="text-sm text-slate-600">
                          Página {sharedCurrentPage} de {sharedTotalPages}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleSharedPageChange(sharedCurrentPage + 1)}
                          disabled={sharedCurrentPage === sharedTotalPages}
                          className="inline-flex items-center justify-center rounded-lg border border-border bg-white p-2 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <ChevronRight className="size-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            )}

          </div>

          <div className="col-span-7">
            <div className="rounded-[1.75rem] border border-border bg-white p-6 shadow-aurora">
              {detailEcosystem ? (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-primary">
                      <House className="size-5 text-accent" />
                      <h2 className="font-heading text-xl font-semibold">Plano del Ecosistema</h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenEcosystemModal(detailEcosystem)}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-emerald-700"
                    >
                      <Info className="h-3.5 w-3.5" />
                      Ver detalles
                    </button>
                  </div>
                  <div className="mt-2 -mb-3">
                    <svg className="w-full h-12" viewBox="0 0 400 60" preserveAspectRatio="none">
                      <path d="M0 60 L200 0 L400 60 Z" fill="#cbd5e1" />
                    </svg>
                    <div className="-mt-4 flex items-center justify-center">
                      <p className="text-xs font-semibold text-slate-600 bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full shadow-sm">
                        {detailEcosystem.name} - {detailEcosystem.devices?.length ?? 0} dispositivos
                      </p>
                    </div>
                    <div className="border-4 border-slate-300 bg-slate-50 rounded-b-3xl rounded-t-sm overflow-hidden">
                      <div className="grid grid-cols-2 gap-3 p-4">
                        {ROOM_ORDER.slice(0, -1).map((room) => (
                          <div
                            key={room}
                            className="border-2 border-dashed border-slate-200 bg-white rounded-xl p-3 min-h-[100px]"
                          >
                            <p className="text-xs font-semibold text-slate-400 mb-2">{room}</p>
                            <div className="space-y-1.5">
                              {devicesByRoom[room]?.map((device) => (
                                <div
                                  key={device.id}
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => {
                                    setSelectedDeviceFromPlan(device.id)
                                    handleOpenEcosystemModal(detailEcosystem!)
                                  }}
                                  onKeyDown={(event) => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                      event.preventDefault()
                                      setSelectedDeviceFromPlan(device.id)
                                      handleOpenEcosystemModal(detailEcosystem!)
                                    }
                                  }}
                                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-slate-50 border border-slate-100 hover:border-accent/30 hover:bg-accent/5 transition cursor-pointer group"
                                >
                                  {device.category?.toLowerCase().includes('temperature') ||
                                  device.category?.toLowerCase().includes('termometro') ? (
                                    <Thermometer className="size-3 text-rose-400" />
                                  ) : device.category?.toLowerCase().includes('light') ||
                                    device.category?.toLowerCase().includes('luz') ? (
                                    <Lightbulb className="size-3 text-amber-400" />
                                  ) : device.category?.toLowerCase().includes('wifi') ||
                                    device.category?.toLowerCase().includes('sensor') ? (
                                    <Wifi className="size-3 text-blue-400" />
                                  ) : (
                                    <Wifi className="size-3 text-slate-400" />
                                  )}
                                  <span className="text-xs text-slate-700 truncate flex-1 group-hover:text-slate-900">
                                    {device.name}
                                  </span>
                                  {device.isOnline && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                                </div>
                              ))}
                              {(!devicesByRoom[room] || devicesByRoom[room].length === 0) && (
                                <p className="text-xs text-slate-300 italic">Sin dispositivos</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="border-t-2 border-dashed border-slate-200 bg-slate-50/50 p-3">
                        <p className="text-xs font-semibold text-slate-400 mb-2">Otro / Exterior</p>
                        <div className="flex flex-wrap gap-1.5">
                          {devicesByRoom['Otro']?.map((device) => (
                            <div
                              key={device.id}
                              role="button"
                              tabIndex={0}
                              onClick={() => {
                                setSelectedDeviceFromPlan(device.id)
                                handleOpenEcosystemModal(detailEcosystem!)
                              }}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault()
                                  setSelectedDeviceFromPlan(device.id)
                                  handleOpenEcosystemModal(detailEcosystem!)
                                }
                              }}
                              className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-50 border border-slate-100 hover:border-accent/30 hover:bg-accent/5 transition cursor-pointer group"
                            >
                              <Wifi className="size-3 text-slate-400" />
                              <span className="text-xs text-slate-600 truncate max-w-[80px] group-hover:text-slate-900">
                                {device.name}
                              </span>
                              {device.isOnline && <span className="w-1 h-1 rounded-full bg-emerald-400" />}
                            </div>
                          ))}
                          {(!devicesByRoom['Otro'] || devicesByRoom['Otro'].length === 0) && (
                            <p className="text-xs text-slate-300 italic">Sin dispositivos</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex h-full min-h-[400px] items-center justify-center">
                  <div className="text-center">
                    <House className="mx-auto h-12 w-12 text-slate-300" />
                    <p className="mt-4 text-slate-500">Selecciona un ecosistema para ver su plano</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {selectedEcosystem ? (
        <EcosystemDevicesModal
          ecosystem={selectedEcosystem}
          onClose={() => {
            handleCloseEcosystemModal()
            setSelectedDeviceFromPlan(null)
          }}
          onDeviceUpdated={handleDeviceUpdated}
          onEcosystemUpdated={handleEcosystemUpdated}
          onEcosystemRevoked={handleEcosystemRevoked}
          canManageEcosystem={canManageEcosystem}
          canRevokeEcosystem={canRevokeEcosystem}
          initialDeviceId={selectedDeviceFromPlan}
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
