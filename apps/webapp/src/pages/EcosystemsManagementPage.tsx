import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Cctv, Check, ChevronLeft, ChevronRight, Copy, Cpu, DoorOpen, Edit3, Eye, EyeOff, Home, House, Info, Key, Lightbulb, Lock, Plus, PlugZap, Radar, Refrigerator, Router, Search, Share2, Speaker, Tablet, Thermometer, Trash2, Tv, Users, Wifi, Wind, Zap } from 'lucide-react'
import { apiClient } from '../api/axios'
import { useAuth } from '../context/auth-context'
import EcosystemDevicesModal from '../components/dashboard/EcosystemDevicesModal'
import { useEcosystemsController } from '../controllers/useEcosystemsController'
import { getCurrentUser, getUserById } from '../services/users.service'
import Select from '../components/Select'
import type { AccessMapEcosystem, AccessMapDevice } from '../services/ecosystems.service'
import type { EcosystemAccess } from '../services/ecosystems.service'
import type { AccessRole } from '../services/ecosystems.service'
import { leaveSharedEcosystem } from '../services/ecosystems.service'

type CreateEcosystemStep = 'form' | 'confirm' | 'result'

const PAGE_SIZES = [10, 25, 50, 100] as const

const DEVICE_CATEGORY_ICONS = {
  SMART_BULB: Lightbulb,
  SMART_PANEL: Tablet,
  SMART_PLUG: PlugZap,
  ENERGY_METER: Zap,
  CAMERA: Cctv,
  SMART_LOCK: Lock,
  CONTACT_SENSOR: DoorOpen,
  MOTION_SENSOR: Radar,
  THERMOSTAT: Thermometer,
  HVAC: Wind,
  SMART_SPEAKER: Speaker,
  SMART_TV: Tv,
  APPLIANCE: Refrigerator,
  ROUTER: Router,
  OTHER: Cpu,
}

const DEVICE_CATEGORY_COLORS: Record<string, string> = {
  SMART_BULB: 'text-amber-400',
  SMART_PANEL: 'text-blue-400',
  SMART_PLUG: 'text-emerald-400',
  ENERGY_METER: 'text-yellow-400',
  CAMERA: 'text-rose-400',
  SMART_LOCK: 'text-purple-400',
  CONTACT_SENSOR: 'text-slate-400',
  MOTION_SENSOR: 'text-cyan-400',
  THERMOSTAT: 'text-orange-400',
  HVAC: 'text-teal-400',
  SMART_SPEAKER: 'text-indigo-400',
  SMART_TV: 'text-violet-400',
  APPLIANCE: 'text-amber-500',
  ROUTER: 'text-blue-500',
  OTHER: 'text-slate-400',
}

const maskApiKey = (key: string) => {
  if (key.length <= 8) return '••••••••'
  return key.slice(0, 4) + '••••••••' + key.slice(-4)
}

const getRoomFromDevice = (device: AccessMapDevice): string => {
  const validRooms = ['Salón', 'Dormitorio', 'Cocina', 'Baño']
  if (device.room && validRooms.includes(device.room)) {
    return device.room
  }
  if (device.room && validRooms.some((r) => device.room!.toLowerCase().includes(r.toLowerCase()))) {
    const found = validRooms.find((r) => device.room!.toLowerCase().includes(r.toLowerCase()))
    return found || device.room
  }
  return device.room || 'Sin categoría'
}

const updateDevicesInEcosystem = (ecosystem: AccessMapEcosystem, device: AccessMapDevice) => ({
  ...ecosystem,
  devices: ecosystem.devices.map((existingDevice) =>
    existingDevice.id === device.id ? { ...existingDevice, ...device } : existingDevice,
  ),
})

interface StatsCardsProps {
  totalEcosystems: number
  sharedEcosystemCount: number
  totalDevicesCount: number
}

function StatsCards({ totalEcosystems, sharedEcosystemCount, totalDevicesCount }: StatsCardsProps) {
  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-3">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-500">Ecosistemas totales</p>
        <p className="mt-2 text-3xl font-semibold text-slate-900">{totalEcosystems}</p>
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
  )
}

interface EcosystemListItemProps {
  ecosystem: AccessMapEcosystem
  isSelected: boolean
  onSelect: (eco: AccessMapEcosystem) => void
  isUser: boolean
  userId: string | undefined
  ownerEmails: Record<string, string>
  apiKeysByEcosystemId: Record<string, string>
  revealedApiKeysByEcosystemId: Record<string, boolean>
  apiKeyLoadingByEcosystemId: Record<string, boolean>
  onToggleApiKey: (ecosystemId: string) => void
  onCopyApiKey: (ecosystemId: string) => void
  onShare: (eco: AccessMapEcosystem) => void
}

function EcosystemApiKeySection({
  ecosystemId,
  hasKey,
  isRevealed,
  isLoadingKey,
  onToggle,
  onCopy,
}: {
  ecosystemId: string
  hasKey: boolean
  isRevealed: boolean
  isLoadingKey: boolean
  onToggle: (id: string) => void
  onCopy: (id: string) => void
}) {
  if (isRevealed || hasKey) {
    return (
      <>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggle(ecosystemId) }}
          className="inline-flex items-center gap-1 rounded-lg border border-border bg-white px-2 py-1 text-xs text-primary"
        >
          {isRevealed ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
          {isRevealed ? maskApiKey(hasKey || '') : 'Ver API Key'}
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onCopy(ecosystemId) }}
          className="inline-flex items-center gap-1 rounded-lg border border-border bg-white px-2 py-1 text-xs text-primary hover:bg-surface/50"
        >
          <Copy className="size-3" />
          Copiar
        </button>
      </>
    )
  }
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onToggle(ecosystemId) }}
      disabled={isLoadingKey}
      className="inline-flex items-center gap-1 rounded-lg border border-border bg-white px-2 py-1 text-xs text-primary hover:bg-surface/50 disabled:opacity-50"
    >
      <Key className="size-3" />
      {isLoadingKey ? 'Cargando...' : 'Recuperar API Key'}
    </button>
  )
}

function EcosystemBadge({ ecosystem }: { ecosystem: AccessMapEcosystem }) {
  if (ecosystem.accessType === 'DELEGATED') {
    return (
      <span className="text-xs font-medium px-2 py-1 rounded-full bg-teal-500/10 text-teal-600">
        {ecosystem.accessRole === 'EDITOR' ? 'Editor' : 'Viewer'}
      </span>
    )
  }
  if (ecosystem.isShared) {
    return (
      <span className="text-xs font-medium px-2 py-1 rounded-full bg-accent/10 text-accent">
        Compartido
      </span>
    )
  }
  return (
    <span className="text-xs font-medium px-2 py-1 rounded-full bg-slate-100 text-slate-600">
      Privado
    </span>
  )
}

function getEcosystemCardClassName(ecosystem: AccessMapEcosystem, isSelected: boolean): string {
  const base = 'w-full cursor-pointer text-left rounded-2xl border p-4 transition'
  if (ecosystem.accessType === 'DELEGATED') {
    return `${base} ${isSelected ? 'border-teal-500 bg-teal-500/5' : 'border-teal-500/30 bg-teal-500/5 hover:border-teal-500/50 hover:bg-teal-500/10'}`
  }
  return `${base} ${isSelected ? 'border-accent bg-accent/5' : 'border-border/50 bg-surface/30 hover:border-border hover:bg-surface/50'}`
}

function EcosystemListItem({
  ecosystem,
  isSelected,
  onSelect,
  isUser,
  userId,
  ownerEmails,
  apiKeysByEcosystemId,
  revealedApiKeysByEcosystemId,
  apiKeyLoadingByEcosystemId,
  onToggleApiKey,
  onCopyApiKey,
  onShare,
}: EcosystemListItemProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => { onSelect(ecosystem) }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect(ecosystem)
        }
      }}
      className={getEcosystemCardClassName(ecosystem, isSelected)}
      aria-label={`Abrir ecosistema ${ecosystem.name}`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <p className="font-medium text-primary">{ecosystem.name}</p>
          {isUser && ecosystem.ownerId === userId && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <EcosystemApiKeySection
                ecosystemId={ecosystem.id}
                hasKey={apiKeysByEcosystemId[ecosystem.id]}
                isRevealed={revealedApiKeysByEcosystemId[ecosystem.id]}
                isLoadingKey={apiKeyLoadingByEcosystemId[ecosystem.id]}
                onToggle={onToggleApiKey}
                onCopy={onCopyApiKey}
              />
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
                onShare(ecosystem)
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-white px-2 py-1 text-xs text-primary hover:bg-surface/50"
            >
              <Share2 className="size-3" />
              Compartir
            </button>
          )}
          <EcosystemBadge ecosystem={ecosystem} />
        </div>
      </div>
    </div>
  )
}

interface EcosystemListPanelProps {
  activeTab: 'my-ecosystems' | 'shared-with-me'
  onTabChange: (tab: 'my-ecosystems' | 'shared-with-me') => void
  role: string
  onOpenCreate: () => void
  sharedWithMeCount: number
  isUser: boolean
  searchTerm: string
  onSearchTermChange: (term: string) => void
  sharedSearchTerm: string
  onSharedSearchTermChange: (term: string) => void
  sharedRoleFilter: 'ALL' | 'VIEWER' | 'EDITOR'
  onSharedRoleFilterChange: (filter: 'ALL' | 'VIEWER' | 'EDITOR') => void
  sharedStatusFilter: 'ALL' | 'SHARED' | 'PRIVATE'
  onSharedStatusFilterChange: (filter: 'ALL' | 'SHARED' | 'PRIVATE') => void
  error: string | null
  isLoading: boolean
  paginatedEcosystems: AccessMapEcosystem[]
  filteredCount: number
  pageSize: number
  onPageSizeChange: (size: number) => void
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  onSetCurrentPage: (page: number) => void
  detailEcosystemId: string | null
  onSelectEcosystem: (eco: AccessMapEcosystem) => void
  userId: string | undefined
  ownerEmails: Record<string, string>
  apiKeysByEcosystemId: Record<string, string>
  revealedApiKeysByEcosystemId: Record<string, boolean>
  apiKeyLoadingByEcosystemId: Record<string, boolean>
  onToggleApiKey: (ecosystemId: string) => void
  onCopyApiKey: (ecosystemId: string) => void
  onShare: (eco: AccessMapEcosystem) => void
}

function EcosystemListPanel({
  activeTab,
  onTabChange,
  role,
  onOpenCreate,
  sharedWithMeCount,
  isUser,
  searchTerm,
  onSearchTermChange,
  sharedSearchTerm,
  onSharedSearchTermChange,
  sharedRoleFilter,
  onSharedRoleFilterChange,
  sharedStatusFilter,
  onSharedStatusFilterChange,
  error,
  isLoading,
  paginatedEcosystems,
  filteredCount,
  pageSize,
  onPageSizeChange,
  currentPage,
  totalPages,
  onPageChange,
  onSetCurrentPage,
  detailEcosystemId,
  onSelectEcosystem,
  userId,
  ownerEmails,
  apiKeysByEcosystemId,
  revealedApiKeysByEcosystemId,
  apiKeyLoadingByEcosystemId,
  onToggleApiKey,
  onCopyApiKey,
  onShare,
}: EcosystemListPanelProps) {
  return (
    <div className="rounded-[1.75rem] border border-border bg-white p-6 shadow-aurora">
      <div className="mb-4 flex items-center gap-2 border-b border-border pb-4">
        <button
          type="button"
          onClick={() => onTabChange('my-ecosystems')}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
            activeTab === 'my-ecosystems'
              ? 'bg-emerald-600 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Home className="size-4" />
          Mis ecosistemas
        </button>
        <button
          type="button"
          onClick={() => onTabChange('shared-with-me')}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
            activeTab === 'shared-with-me'
              ? 'bg-emerald-600 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Users className="size-4" />
          Compartidos conmigo
        </button>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-primary">
          {activeTab === 'my-ecosystems' ? (
            <>
              <House className="size-5 text-accent" />
              <h2 className="font-heading text-xl font-semibold">Ecosistemas Smart Home</h2>
            </>
          ) : (
            <>
              <Users className="size-5 text-teal-500" />
              <h2 className="font-heading text-xl font-semibold text-teal-600">Ecosistemas compartidos conmigo</h2>
            </>
          )}
        </div>
        {activeTab === 'my-ecosystems' && role === 'USER' && (
          <button
            type="button"
            onClick={onOpenCreate}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-emerald-700"
          >
            <Plus className="h-3.5 w-3.5" />
            Añadir ecosistema
          </button>
        )}
        {activeTab === 'shared-with-me' && (
          <div className="text-sm text-slate-500">
            {sharedWithMeCount} ecosistema{sharedWithMeCount !== 1 ? 's' : ''} compartido{sharedWithMeCount !== 1 ? 's' : ''} contigo
          </div>
        )}
      </div>
      <p className="mt-3 text-xs text-muted">
        {activeTab === 'my-ecosystems'
          ? 'Aquí puedes obtener información de tus ecosistemas o añadir nuevos.'
          : 'Ecosistemas que otros usuarios han compartido contigo.'}
      </p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <input
            type="text"
            placeholder={isUser ? 'Buscar por nombre...' : 'Buscar por nombre o propietario...'}
            value={activeTab === 'shared-with-me' ? sharedSearchTerm : searchTerm}
            onChange={(e) => activeTab === 'shared-with-me' ? onSharedSearchTermChange(e.target.value) : onSearchTermChange(e.target.value)}
            className="w-full rounded-xl border border-border bg-white pl-10 pr-4 py-2 text-sm text-primary outline-none transition-colors focus:border-accent"
          />
        </div>
        {activeTab === 'shared-with-me' ? (
          <Select
            value={sharedRoleFilter}
            onChange={(value) => onSharedRoleFilterChange(value as 'ALL' | 'VIEWER' | 'EDITOR')}
            options={[
              { value: 'ALL', label: 'Todos los roles' },
              { value: 'VIEWER', label: 'Viewer' },
              { value: 'EDITOR', label: 'Editor' },
            ]}
            className="w-40"
          />
        ) : (
          <Select
            value={sharedStatusFilter}
            onChange={(value) => onSharedStatusFilterChange(value as 'ALL' | 'SHARED' | 'PRIVATE')}
            options={[
              { value: 'ALL', label: 'Todos los estados' },
              { value: 'PRIVATE', label: 'Privado' },
              { value: 'SHARED', label: 'Compartido' },
            ]}
            className="w-44"
          />
        )}
      </div>

      {error ? (
        <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
          <p className="font-semibold">Error de carga</p>
          <p className="mt-2">{error}</p>
        </div>
      ) : null}

      {(() => {
        if (isLoading) {
          return (
            <div className="mt-6 space-y-4">
              {[1, 2, 3].map((item) => (
                <div key={item} className="h-16 rounded-2xl bg-slate-100" />
              ))}
            </div>
          )
        }
        if (paginatedEcosystems.length === 0) {
          return (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-slate-700">
              <p className="font-medium text-slate-900">No hay ecosistemas disponibles.</p>
            </div>
          )
        }
        return (
          <>
          <div className="mt-6 space-y-3">
            {paginatedEcosystems.map((ecosystem) => (
              <EcosystemListItem
                key={ecosystem.id}
                ecosystem={ecosystem}
                isSelected={detailEcosystemId === ecosystem.id}
                onSelect={onSelectEcosystem}
                isUser={isUser}
                userId={userId}
                ownerEmails={ownerEmails}
                apiKeysByEcosystemId={apiKeysByEcosystemId}
                revealedApiKeysByEcosystemId={revealedApiKeysByEcosystemId}
                apiKeyLoadingByEcosystemId={apiKeyLoadingByEcosystemId}
                onToggleApiKey={onToggleApiKey}
                onCopyApiKey={onCopyApiKey}
                onShare={onShare}
              />
            ))}
          </div>

          {filteredCount > 0 && (
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">Mostrar</span>
                <Select
                  value={String(pageSize)}
                  onChange={(value) => {
                    onPageSizeChange(Number(value) as (typeof PAGE_SIZES)[number])
                    onSetCurrentPage(1)
                  }}
                  options={PAGE_SIZES.map((size) => ({ value: String(size), label: String(size) }))}
                  className="w-20"
                />
                <span className="text-sm text-slate-500">resultados</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onPageChange(currentPage - 1)}
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
                  onClick={() => onPageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center justify-center rounded-lg border border-border bg-white p-2 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          )}
          </>
        )})()}
      </div>
    )
  }
}

interface EcosystemPlanPanelProps {
  detailEcosystem: AccessMapEcosystem | null
  isCollapsed: boolean
  onToggleCollapse: () => void
  availableRooms: string[]
  devicesByRoom: Record<string, AccessMapDevice[]>
  onDeviceClick: (deviceId: string, ecosystem: AccessMapEcosystem) => void
  onOpenEcosystemModal: (ecosystem: AccessMapEcosystem) => void
}

function PlanDeviceIcon({ category }: { category?: string }) {
  const IconComponent = category ? DEVICE_CATEGORY_ICONS[category] : null
  const iconColor = category ? DEVICE_CATEGORY_COLORS[category] : 'text-slate-400'
  return IconComponent ? <IconComponent className={`size-3 ${iconColor}`} /> : <Wifi className="size-3 text-slate-400" />
}

function PlanDeviceCard({
  device,
  ecosystem,
  onClick,
}: {
  device: AccessMapDevice
  ecosystem: AccessMapEcosystem
  onClick: (deviceId: string, eco: AccessMapEcosystem) => void
}) {
  return (
    <div
      key={device.id}
      role="button"
      tabIndex={0}
      onClick={() => { onClick(device.id, ecosystem) }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onClick(device.id, ecosystem)
        }
      }}
      className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-slate-50 border border-slate-100 hover:border-accent/30 hover:bg-accent/5 transition cursor-pointer group"
    >
      <PlanDeviceIcon category={device.category} />
      <span className="text-xs text-slate-700 truncate flex-1 group-hover:text-slate-900">
        {device.name}
      </span>
      {device.isOnline && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
    </div>
  )
}

function PlanPanelHeader({
  isCollapsed,
  detailEcosystem,
  onToggleCollapse,
  onOpenEcosystemModal,
}: {
  isCollapsed: boolean
  detailEcosystem: AccessMapEcosystem
  onToggleCollapse: () => void
  onOpenEcosystemModal: (eco: AccessMapEcosystem) => void
}) {
  return (
    <div className={`flex ${isCollapsed ? 'flex-col gap-2 items-center' : 'items-center justify-between'}`}>
      <div className={`flex items-center gap-3 text-primary ${isCollapsed ? 'flex-col' : ''}`}>
        <House className="size-5 text-accent" />
        {!isCollapsed && <h2 className="font-heading text-xl font-semibold">Plano del Ecosistema</h2>}
      </div>
      <button
        type="button"
        onClick={onToggleCollapse}
        className={`inline-flex items-center justify-center rounded-full border transition hover:bg-slate-100 ${isCollapsed ? 'p-1.5 border-slate-300 text-slate-600' : 'p-1.5 border-slate-200 text-slate-500'}`}
        title={isCollapsed ? 'Mostrar plano' : 'Ocultar plano'}
      >
        {isCollapsed ? <Eye className="size-4" /> : (
          <span className="inline-flex items-center gap-2">
            <EyeOff className="size-4" />
            <span className="text-xs">Ocultar plano</span>
          </span>
        )}
      </button>
      <button
        type="button"
        onClick={() => onOpenEcosystemModal(detailEcosystem)}
        className={`inline-flex items-center gap-2 rounded-full border border-slate-200 bg-emerald-600 text-white shadow-sm transition hover:bg-emerald-700 ${isCollapsed ? 'p-1.5' : 'px-3 py-1.5 text-xs font-medium'}`}
      >
        <Info className={isCollapsed ? 'size-4' : 'h-3.5 w-3.5'} />
        {!isCollapsed && 'Ver detalles'}
      </button>
    </div>
  )
}

function PlanContent({
  detailEcosystem,
  availableRooms,
  devicesByRoom,
  onDeviceClick,
}: {
  detailEcosystem: AccessMapEcosystem
  availableRooms: string[]
  devicesByRoom: Record<string, AccessMapDevice[]>
  onDeviceClick: (deviceId: string, eco: AccessMapEcosystem) => void
}) {
  return (
    <div className="mt-2 -mb-3">
      <svg className="w-full h-12" viewBox="0 0 400 60" preserveAspectRatio="none">
        <path d="M0 60 L200 0 L400 60 Z" fill="#cbd5e1" />
      </svg>
      <div className="-mt-4 flex items-center justify-center">
        <p className="text-xs font-semibold text-slate-600 bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full shadow-sm">
          {detailEcosystem.name} - {detailEcosystem.devices?.length ?? 0} dispositivos
        </p>
      </div>
      <div className="border-4 border-slate-300 bg-slate-50 rounded-b-3xl rounded-t-sm overflow-x-auto">
        <div className="grid grid-cols-2 gap-3 p-4 min-w-[500px]">
          {availableRooms.map((room) => (
            <div key={room} className="border-2 border-dashed border-slate-200 bg-white rounded-xl p-3 min-h-[100px]">
              <p className="text-xs font-semibold text-slate-400 mb-2">{room}</p>
              <div className="space-y-1.5">
                {devicesByRoom[room]?.map((device) => (
                  <PlanDeviceCard key={device.id} device={device} ecosystem={detailEcosystem} onClick={onDeviceClick} />
                ))}
                {(!devicesByRoom[room] || devicesByRoom[room].length === 0) && (
                  <p className="text-xs text-slate-300 italic">Sin dispositivos</p>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="border-t-2 border-dashed border-slate-200 bg-slate-50/50 p-3">
          <p className="text-xs font-semibold text-slate-400 mb-2">Sin categoría</p>
          <div className="flex flex-wrap gap-1.5">
            {devicesByRoom['Sin categoría']?.map((device) => (
              <div
                key={device.id}
                role="button"
                tabIndex={0}
                onClick={() => { onDeviceClick(device.id, detailEcosystem) }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    onDeviceClick(device.id, detailEcosystem)
                  }
                }}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-50 border border-slate-100 hover:border-accent/30 hover:bg-accent/5 transition cursor-pointer group"
              >
                <PlanDeviceIcon category={device.category} />
                <span className="text-xs text-slate-600 truncate max-w-[80px] group-hover:text-slate-900">
                  {device.name}
                </span>
                {device.isOnline && <span className="w-1 h-1 rounded-full bg-emerald-400" />}
              </div>
            ))}
            {(!devicesByRoom['Sin categoría'] || devicesByRoom['Sin categoría'].length === 0) && (
              <p className="text-xs text-slate-300 italic">Sin dispositivos</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function EcosystemPlanPanel({
  detailEcosystem,
  isCollapsed,
  onToggleCollapse,
  availableRooms,
  devicesByRoom,
  onDeviceClick,
  onOpenEcosystemModal,
}: EcosystemPlanPanelProps) {
  return (
    <div className={`rounded-[1.75rem] border border-border bg-white p-6 shadow-aurora ${isCollapsed ? 'py-3 px-2' : ''}`}>
      {detailEcosystem ? (
        <>
          <PlanPanelHeader {...{ isCollapsed, detailEcosystem, onToggleCollapse, onOpenEcosystemModal }} />
          {!isCollapsed && <PlanContent {...{ detailEcosystem, availableRooms, devicesByRoom, onDeviceClick }} />}
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
  )
}

interface CreateEcosystemModalProps {
  isOpen: boolean
  step: CreateEcosystemStep
  onClose: () => void
  onStepChange: (step: CreateEcosystemStep) => void
  ecosystemName: string
  onEcosystemNameChange: (name: string) => void
  error: string | null
  apiKey: string | null
  isApiKeyRevealed: boolean
  onToggleApiKeyReveal: () => void
  isApiKeyCopied: boolean
  onCopyApiKey: () => void
  isCreating: boolean
  onCreateEcosystem: () => void
}

function CreateEcosystemModal({
  isOpen,
  step,
  onClose,
  onStepChange,
  ecosystemName,
  onEcosystemNameChange,
  error,
  apiKey,
  isApiKeyRevealed,
  onToggleApiKeyReveal,
  isApiKeyCopied,
  onCopyApiKey: onCopyApiKeyHandler,
  isCreating,
  onCreateEcosystem,
}: CreateEcosystemModalProps) {
  if (!isOpen) return null

  const stepDescription = step === 'form'
    ? 'Introduce el nombre del nuevo ecosistema.'
    : step === 'confirm'
      ? 'Confirma la creación para generar la API key.'
      : 'Ecosistema registrado correctamente.'

  return (
    <div className="fixed inset-0 z-[90] h-dvh w-screen flex items-center justify-center bg-black/25 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[1.5rem] border border-border bg-white p-6 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <Plus className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-slate-900">Registrar ecosistema</h3>
            <p className="text-sm leading-6 text-slate-500">{stepDescription}</p>
          </div>
        </div>

        {step === 'form' && (
          <div className="mt-6 space-y-2">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-900">Nombre del ecosistema</span>
              <input
                type="text"
                value={ecosystemName}
                onChange={(event) => onEcosystemNameChange(event.target.value)}
                placeholder="Ej. Mi hogar inteligente"
                className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </label>
          </div>
        )}

        {step === 'confirm' && (
          <div className="mt-6 rounded-2xl border border-border bg-slate-50 p-4 text-sm text-slate-900">
            <p>
              <span className="font-semibold">Nombre:</span> {ecosystemName.trim()}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Al confirmar, se generará una API key única para este ecosistema.
            </p>
            {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
          </div>
        )}

        {step === 'result' && (
          <div className="mt-6 space-y-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
            <p className="text-sm font-semibold text-emerald-800">API key generada</p>
            {apiKey && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={onToggleApiKeyReveal}
                  className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-white px-2 py-1 text-xs text-emerald-800"
                >
                  {isApiKeyRevealed ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  {isApiKeyRevealed ? apiKey : maskApiKey(apiKey)}
                </button>
                <button
                  type="button"
                  onClick={onCopyApiKeyHandler}
                  className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-white px-2 py-1 text-xs text-emerald-800"
                >
                  {isApiKeyCopied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  {isApiKeyCopied ? 'Copiada' : 'Copiar'}
                </button>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100"
          >
            {step === 'result' ? 'Cerrar' : 'Cancelar'}
          </button>

          {step === 'form' && (
            <button
              type="button"
              disabled={ecosystemName.trim().length < 3}
              onClick={() => onStepChange('confirm')}
              className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Continuar
            </button>
          )}

          {step === 'confirm' && (
            <button
              type="button"
              disabled={isCreating}
              onClick={onCreateEcosystem}
              className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCreating ? 'Creando ecosistema...' : 'Confirmar y generar API key'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

interface ShareEcosystemModalProps {
  ecosystem: AccessMapEcosystem | null
  onClose: () => void
  email: string
  onEmailChange: (email: string) => void
  role: AccessRole
  onRoleChange: (role: AccessRole) => void
  error: string | null
  sharedUsers: EcosystemAccess[]
  isLoadingUsers: boolean
  onUpdateRole: (ecosystemId: string, userId: string, role: AccessRole) => void
  onRevoke: (ecosystemId: string, userId: string) => void
  revokingUserId: string | null
  updatingUserId: string | null
  isSharing: boolean
  onShare: () => void
}

function ShareEcosystemModal({
  ecosystem,
  onClose,
  email,
  onEmailChange,
  role,
  onRoleChange,
  error,
  sharedUsers,
  isLoadingUsers,
  onUpdateRole,
  onRevoke,
  revokingUserId,
  updatingUserId,
  isSharing,
  onShare,
}: ShareEcosystemModalProps) {
  if (!ecosystem) return null

  return (
    <div className="fixed inset-0 z-[90] h-dvh w-screen flex items-center justify-center bg-black/25 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[1.5rem] border border-border bg-white p-6 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <Share2 className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-slate-900">Compartir ecosistema</h3>
            <p className="text-sm leading-6 text-slate-500">
              Comparte &quot;{ecosystem.name}&quot; con otro usuario.
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div className="space-y-2">
            <label htmlFor="share-email" className="block text-sm font-medium text-slate-900">Email del usuario</label>
            <input
              id="share-email"
              type="email"
              value={email}
              onChange={(event) => onEmailChange(event.target.value)}
              placeholder="usuario@ejemplo.com"
              className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="space-y-2">
            <span className="block text-sm font-medium text-slate-900">Rol de acceso</span>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => onRoleChange('VIEWER')}
                className={`flex-1 rounded-xl border px-4 py-2 text-sm font-medium transition ${
                  role === 'VIEWER'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Eye className="mr-2 inline h-4 w-4" />
                Viewer (solo lectura)
              </button>
              <button
                type="button"
                onClick={() => onRoleChange('EDITOR')}
                className={`flex-1 rounded-xl border px-4 py-2 text-sm font-medium transition ${
                  role === 'EDITOR'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Edit3 className="mr-2 inline h-4 w-4" />
                Editor (puede modificar)
              </button>
            </div>
          </div>

          {error && <p className="text-xs text-rose-600">{error}</p>}

          {sharedUsers.length > 0 && (
            <div className="mt-4 border-t border-border pt-4">
              <h4 className="mb-3 text-sm font-medium text-slate-900">Usuarios con acceso</h4>
              <div className="max-h-48 space-y-2 overflow-y-auto">
                {sharedUsers.map((user) => (
                  <div key={user.userId} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{user.email}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(user.grantedAt).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={user.role}
                        onChange={(e) => onUpdateRole(ecosystem.id, user.userId, e.target.value as AccessRole)}
                        disabled={updatingUserId === user.userId}
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700"
                      >
                        <option value="VIEWER">Viewer</option>
                        <option value="EDITOR">Editor</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => onRevoke(ecosystem.id, user.userId)}
                        disabled={revokingUserId === user.userId}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isLoadingUsers && (
            <div className="mt-4 flex items-center justify-center py-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
              <span className="ml-2 text-sm text-slate-500">Cargando usuarios...</span>
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100"
          >
            Cerrar
          </button>
          <button
            type="button"
            disabled={isSharing || !email.trim()}
            onClick={onShare}
            className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSharing ? 'Compartiendo...' : 'Compartir'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function EcosystemsManagementPage() {
  const { authClaims } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const role = (authClaims?.role ?? 'USER').toUpperCase()
  const userId = authClaims?.sub
  const isUser = role === 'USER'
  const isAdminOrGlobalAdmin = role === 'ADMIN' || role === 'GLOBAL_ADMIN'

  const { myEcosystems, sharedWithMe, isLoading, error, isCreating, refreshMyEcosystems, refreshSharedWithMe, createEcosystem, addAccess, removeAccess, changeAccessRole, fetchAccesses } = useEcosystemsController()
  const [visibleEcosystems, setVisibleEcosystems] = useState<AccessMapEcosystem[]>([])
  const [selectedEcosystem, setSelectedEcosystem] = useState<AccessMapEcosystem | null>(null)
  const [detailEcosystemId, setDetailEcosystemId] = useState<string | null>(null)
  const [selectedDeviceFromPlan, setSelectedDeviceFromPlan] = useState<string | null>(null)

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [createStep, setCreateStep] = useState<CreateEcosystemStep>('form')
  const [newEcosystemName, setNewEcosystemName] = useState('')
  const [newEcosystemApiKey, setNewEcosystemApiKey] = useState<string | null>(null)
  const [, setNewEcosystemId] = useState<string | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)
  const [revealedApiKey, setRevealedApiKey] = useState(false)
  const [copiedKey, setCopiedKey] = useState(false)
  const [apiKeysByEcosystemId, setApiKeysByEcosystemId] = useState<Record<string, string>>({})
  const [revealedApiKeysByEcosystemId, setRevealedApiKeysByEcosystemId] = useState<Record<string, boolean>>({})
  const [apiKeyLoadingByEcosystemId, setApiKeyLoadingByEcosystemId] = useState<Record<string, boolean>>({})
  const [shareModalEcosystem, setShareModalEcosystem] = useState<AccessMapEcosystem | null>(null)
  const [shareEmail, setShareEmail] = useState('')
  const [shareRole, setShareRole] = useState<AccessRole>('VIEWER')
  const [isSharing, setIsSharing] = useState(false)
  const [shareError, setShareError] = useState<string | null>(null)
  const [revokingEcosystemId, setRevokingEcosystemId] = useState<string | null>(null)

  const [activeTab, setActiveTab] = useState<'my-ecosystems' | 'shared-with-me'>('my-ecosystems')
  const ecosystems = activeTab === 'my-ecosystems' ? myEcosystems : sharedWithMe

  useEffect(() => {
    setVisibleEcosystems(ecosystems)
    setCurrentPage(1)
  }, [ecosystems])

  const [sharedUsers, setSharedUsers] = useState<EcosystemAccess[]>([])
  const [loadingSharedUsers, setLoadingSharedUsers] = useState(false)
  const [updatingAccessRole, setUpdatingAccessRole] = useState<string | null>(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [sharedStatusFilter, setSharedStatusFilter] = useState<'ALL' | 'SHARED' | 'PRIVATE'>('ALL')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(10)
  const [ownerEmails, setOwnerEmails] = useState<Record<string, string>>({})
  const [sharedSearchTerm, setSharedSearchTerm] = useState('')
  const [sharedRoleFilter, setSharedRoleFilter] = useState<'ALL' | 'VIEWER' | 'EDITOR'>('ALL')
  const [isPlanCollapsed, setIsPlanCollapsed] = useState(false)

  useEffect(() => {
    const selectedId = location.state?.selectedId as string | undefined
    if (selectedId && ecosystems.length > 0) {
      const ecosystem = ecosystems.find((e) => e.id === selectedId)
      if (ecosystem) {
        setDetailEcosystemId(selectedId)
      }
      navigate('/ecosystems', { replace: true })
    }
  }, [location.state, ecosystems, navigate])

  useEffect(() => {
    const loadOwnerEmails = async () => {
      const uniqueOwnerIds = [...new Set(visibleEcosystems.map((eco) => eco.ownerId).filter(Boolean))]
      const newEmails: Record<string, string> = {}

      const currentUser = await getCurrentUser()

      for (const ownerId of uniqueOwnerIds) {
        if (ownerId && !ownerEmails[ownerId]) {
          let user = null
          if (ownerId === userId) {
            user = currentUser
          } else {
            user = await getUserById(ownerId)
          }
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
  }, [visibleEcosystems.map((e) => e.ownerId).join(','), userId])

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

  const closeShareModal = () => {
    setShareModalEcosystem(null)
    setShareEmail('')
    setShareRole('VIEWER')
    setShareError(null)
    setSharedUsers([])
  }

  const handleShareEcosystem = async () => {
    if (!shareModalEcosystem || !shareEmail.trim()) return

    setIsSharing(true)
    setShareError(null)

    try {
      await addAccess(shareModalEcosystem.id, shareEmail.trim(), shareRole)
      closeShareModal()
      await refreshMyEcosystems()
    } catch {
      setShareError('No se pudo compartir el ecosistema. Verifica el email e intenta de nuevo.')
    } finally {
      setIsSharing(false)
    }
  }

  const handleRevokeSharing = async (ecosystemId: string, userId: string) => {
    setRevokingEcosystemId(ecosystemId)
    try {
      await removeAccess(ecosystemId, userId)
      await refreshMyEcosystems()
      const users = await fetchAccesses(ecosystemId)
      setSharedUsers(users)
    } catch {
      // Ignore errors
    } finally {
      setRevokingEcosystemId(null)
    }
  }

  const handleUpdateRole = async (ecosystemId: string, userId: string, newRole: AccessRole) => {
    setUpdatingAccessRole(userId)
    try {
      await changeAccessRole(ecosystemId, userId, newRole)
      const users = await fetchAccesses(ecosystemId)
      setSharedUsers(users)
    } catch {
      // Ignore errors
    } finally {
      setUpdatingAccessRole(null)
    }
  }

  const openShareModal = async (ecosystem: AccessMapEcosystem) => {
    setShareModalEcosystem(ecosystem)
    setShareEmail('')
    setShareRole('VIEWER')
    setShareError(null)
    setLoadingSharedUsers(true)
    try {
      const users = await fetchAccesses(ecosystem.id)
      setSharedUsers(users)
    } catch {
      setSharedUsers([])
    } finally {
      setLoadingSharedUsers(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'my-ecosystems') {
      void refreshMyEcosystems()
    } else {
      void refreshSharedWithMe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, refreshMyEcosystems, refreshSharedWithMe])

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

  const totalDevicesCount = useMemo(
    () => visibleEcosystems.reduce((sum, eco) => sum + (eco.devices?.length ?? 0), 0),
    [visibleEcosystems],
  )

  const filteredEcosystems = useMemo(
    () =>
      visibleEcosystems.filter((eco) => {
        const isSharedTab = activeTab === 'shared-with-me'
        const currentSearch = isSharedTab ? sharedSearchTerm : searchTerm
        const matchesSearch =
          eco.name.toLowerCase().includes(currentSearch.toLowerCase()) ||
          eco.ownerId?.toLowerCase().includes(currentSearch.toLowerCase())
        
        if (isSharedTab) {
          const matchesRole = sharedRoleFilter === 'ALL' || eco.accessRole === sharedRoleFilter
          return matchesSearch && matchesRole
        }
        
        const matchesSharedStatus =
          sharedStatusFilter === 'ALL' ||
          (sharedStatusFilter === 'SHARED' && eco.isShared) ||
          (sharedStatusFilter === 'PRIVATE' && !eco.isShared)
        return matchesSearch && matchesSharedStatus
      }),
    [visibleEcosystems, searchTerm, sharedSearchTerm, sharedRoleFilter, activeTab, sharedStatusFilter],
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
  }, [searchTerm, sharedSearchTerm, sharedStatusFilter, sharedRoleFilter])

  useEffect(() => {
    setVisibleEcosystems(ecosystems)
  }, [ecosystems])

  const isSharedEcosystem = selectedEcosystem?.isShared ?? false
  const accessRole = selectedEcosystem?.accessRole
  const canManageEcosystem = isSharedEcosystem 
    ? accessRole === 'EDITOR' || accessRole === 'OWNER'
    : role === 'USER' || isAdminOrGlobalAdmin
  
  const canRevokeEcosystem = isSharedEcosystem
    ? false
    : role === 'USER' || isAdminOrGlobalAdmin

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
    const fixedRooms = ['Salón', 'Dormitorio', 'Cocina', 'Baño']
    const grouped: Record<string, AccessMapDevice[]> = {}

    for (const room of fixedRooms) {
      grouped[room] = []
    }
    grouped['Sin categoría'] = []

    if (!detailEcosystem?.devices) return grouped

    for (const device of detailEcosystem.devices) {
      const room = getRoomFromDevice(device)
      if (!grouped[room]) {
        grouped[room] = []
      }
      grouped[room].push(device)
    }

    return grouped
  }, [detailEcosystem])

  const availableRooms = useMemo(() => {
    const fixedRooms = ['Salón', 'Dormitorio', 'Cocina', 'Baño']
    const existingRooms = Object.keys(devicesByRoom).filter((room) => room !== 'Sin categoría')
    const allRooms = new Set([...fixedRooms, ...existingRooms])
    return Array.from(allRooms).sort((a, b) => {
      const aIndex = fixedRooms.indexOf(a)
      const bIndex = fixedRooms.indexOf(b)
      if (aIndex === -1 && bIndex === -1) return a.localeCompare(b)
      if (aIndex === -1) return 1
      if (bIndex === -1) return -1
      return aIndex - bIndex
    })
  }, [devicesByRoom])

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

  const handleLeaveSharedEcosystem = async (ecosystemId: string) => {
    setVisibleEcosystems((current) => current.filter((ecosystem) => ecosystem.id !== ecosystemId))
    if (selectedEcosystem?.id === ecosystemId) {
      setSelectedEcosystem(null)
    }
    try {
      await leaveSharedEcosystem(ecosystemId)
      await refreshSharedWithMe()
    } catch (error) {
      console.error('Error leaving shared ecosystem:', error)
    }
  }

  const handleDeviceUpdated = (device: AccessMapDevice) => {
    const deviceEcosystemId = device.ecosystemId
    setVisibleEcosystems((current) =>
      current.map((ecosystem) =>
        ecosystem.id === deviceEcosystemId ? updateDevicesInEcosystem(ecosystem, device) : ecosystem,
      ),
    )
    if (deviceEcosystemId === detailEcosystemId) {
      setSelectedEcosystem((current) =>
        current ? updateDevicesInEcosystem(current, device) : null,
      )
    }
  }

  const handleDeviceInPlanClick = (deviceId: string, ecosystem: AccessMapEcosystem) => {
    setSelectedDeviceFromPlan(deviceId)
    handleOpenEcosystemModal(ecosystem)
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

        <StatsCards
          totalEcosystems={visibleEcosystems.length}
          sharedEcosystemCount={sharedEcosystemCount}
          totalDevicesCount={totalDevicesCount}
        />

        <div className="grid grid-cols-12 gap-6">
          <div className={`${isPlanCollapsed ? 'col-span-11' : 'col-span-5'} space-y-6 transition-all duration-300`}>
            <EcosystemListPanel
              activeTab={activeTab}
              onTabChange={setActiveTab}
              role={role}
              onOpenCreate={openCreateModal}
              sharedWithMeCount={sharedWithMe.length}
              isUser={isUser}
              searchTerm={searchTerm}
              onSearchTermChange={setSearchTerm}
              sharedSearchTerm={sharedSearchTerm}
              onSharedSearchTermChange={setSharedSearchTerm}
              sharedRoleFilter={sharedRoleFilter}
              onSharedRoleFilterChange={setSharedRoleFilter}
              sharedStatusFilter={sharedStatusFilter}
              onSharedStatusFilterChange={setSharedStatusFilter}
              error={error}
              isLoading={isLoading}
              paginatedEcosystems={paginatedEcosystems}
              filteredCount={filteredEcosystems.length}
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              onSetCurrentPage={setCurrentPage}
              detailEcosystemId={detailEcosystemId}
              onSelectEcosystem={handleSelectEcosystem}
              userId={userId}
              ownerEmails={ownerEmails}
              apiKeysByEcosystemId={apiKeysByEcosystemId}
              revealedApiKeysByEcosystemId={revealedApiKeysByEcosystemId}
              apiKeyLoadingByEcosystemId={apiKeyLoadingByEcosystemId}
              onToggleApiKey={toggleApiKeyVisibility}
              onCopyApiKey={copyEcosystemApiKey}
              onShare={openShareModal}
            />
          </div>

          <div className={`${isPlanCollapsed ? 'col-span-1' : 'col-span-7'} transition-all duration-300`}>
            <EcosystemPlanPanel
              detailEcosystem={detailEcosystem}
              isCollapsed={isPlanCollapsed}
              onToggleCollapse={() => setIsPlanCollapsed(!isPlanCollapsed)}
              availableRooms={availableRooms}
              devicesByRoom={devicesByRoom}
              onDeviceClick={handleDeviceInPlanClick}
              onOpenEcosystemModal={handleOpenEcosystemModal}
            />
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
          onLeaveShared={handleLeaveSharedEcosystem}
          canManageEcosystem={canManageEcosystem}
          canRevokeEcosystem={canRevokeEcosystem}
          initialDeviceId={selectedDeviceFromPlan}
        />
      ) : null}

      <CreateEcosystemModal
        isOpen={isCreateModalOpen}
        step={createStep}
        onClose={closeCreateModal}
        onStepChange={setCreateStep}
        ecosystemName={newEcosystemName}
        onEcosystemNameChange={setNewEcosystemName}
        error={createError}
        apiKey={newEcosystemApiKey}
        isApiKeyRevealed={revealedApiKey}
        onToggleApiKeyReveal={() => setRevealedApiKey(!revealedApiKey)}
        isApiKeyCopied={copiedKey}
        onCopyApiKey={copyApiKey}
        isCreating={isCreating}
        onCreateEcosystem={handleCreateEcosystem}
      />

      <ShareEcosystemModal
        ecosystem={shareModalEcosystem}
        onClose={closeShareModal}
        email={shareEmail}
        onEmailChange={setShareEmail}
        role={shareRole}
        onRoleChange={setShareRole}
        error={shareError}
        sharedUsers={sharedUsers}
        isLoadingUsers={loadingSharedUsers}
        onUpdateRole={handleUpdateRole}
        onRevoke={handleRevokeSharing}
        revokingUserId={revokingEcosystemId}
        updatingUserId={updatingAccessRole}
        isSharing={isSharing}
        onShare={handleShareEcosystem}
      />
    </div>
  )
}
