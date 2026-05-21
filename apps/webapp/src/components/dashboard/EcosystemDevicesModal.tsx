import { useEffect, useMemo, useState } from 'react'
import {
  Bed,
  Cctv,
  Cpu,
  DoorOpen,
  Droplets,
  Flame,
  Home,
  Lightbulb,
  Lock,
  Pencil,
  PlugZap,
  Radar,
  Refrigerator,
  Router,
  Speaker,
  Sun,
  Tablet,
  Thermometer,
  Tv,
  UserMinus,
  Wind,
  X,
  Zap,
} from 'lucide-react'
import { apiClient } from '../../api/axios'
import { useAuth } from '../../context/auth-context'
import type { AccessMapDevice, AccessMapEcosystem } from '../../services/ecosystems.service'
import { getDeviceDetails } from '../../services/device-details.service'

type EcosystemDevicesModalProps = {
  ecosystem: AccessMapEcosystem
  onClose: () => void
  onDeviceUpdated: (device: AccessMapDevice) => void
  onEcosystemUpdated: (ecosystem: AccessMapEcosystem) => void
  onEcosystemRevoked: (ecosystemId: string) => void
  onLeaveShared: (ecosystemId: string) => Promise<void>
  canManageEcosystem: boolean
  canRevokeEcosystem: boolean
  initialDeviceId?: string | null
}

const DEVICE_CATEGORIES: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  SMART_BULB: { label: 'Bombilla Inteligente', icon: Lightbulb },
  SMART_PANEL: { label: 'Panel Inteligente', icon: Tablet },
  SMART_PLUG: { label: 'Enchufe Inteligente', icon: PlugZap },
  ENERGY_METER: { label: 'Medidor de Consumo', icon: Zap },
  CAMERA: { label: 'Cámara IP', icon: Cctv },
  SMART_LOCK: { label: 'Cerradura', icon: Lock },
  CONTACT_SENSOR: { label: 'Sensor de Contacto', icon: DoorOpen },
  MOTION_SENSOR: { label: 'Sensor de Movimiento', icon: Radar },
  THERMOSTAT: { label: 'Termostato', icon: Thermometer },
  HVAC: { label: 'Climatización', icon: Wind },
  SMART_SPEAKER: { label: 'Altavoz Inteligente', icon: Speaker },
  SMART_TV: { label: 'Smart TV', icon: Tv },
  APPLIANCE: { label: 'Electrodomésticos', icon: Refrigerator },
  ROUTER: { label: 'Hub / Router', icon: Router },
  OTHER: { label: 'Otro', icon: Cpu },
}

const DEVICE_LOCATIONS: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  SALON: { label: 'Salón', icon: Tv },
  COCINA: { label: 'Cocina', icon: Flame },
  HABITACION: { label: 'Dormitorio', icon: Bed },
  BAÑO: { label: 'Baño', icon: Droplets },
  EXTERIOR: { label: 'Exterior', icon: Sun },
  OTRO: { label: 'Otro...', icon: Home },
}

function CategorySelect({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)

  const selectedCategory = DEVICE_CATEGORIES[value]
  const SelectedIcon = selectedCategory?.icon

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-primary outline-none transition-colors focus:border-accent flex items-center justify-between disabled:bg-slate-50 disabled:cursor-not-allowed"
      >
        <span className="flex items-center gap-2">
          {SelectedIcon && <SelectedIcon className="size-4 text-slate-500" />}
          {selectedCategory?.label || 'Seleccionar...'}
        </span>
        {!disabled && (
          <svg className={`size-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-white py-1 shadow-lg max-h-60 overflow-y-auto">
          <button
            type="button"
            onClick={() => {
              onChange('')
              setIsOpen(false)
            }}
            className="w-full px-4 py-2 text-left text-sm text-slate-500 hover:bg-slate-50"
          >
            Seleccionar...
          </button>
          {Object.entries(DEVICE_CATEGORIES).map(([key, { label, icon: Icon }]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                onChange(key)
                setIsOpen(false)
              }}
              className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 ${
                value === key ? 'bg-accent/10 text-primary font-medium' : 'text-primary'
              }`}
            >
              <Icon className="size-4 text-slate-500" />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function LocationSelect({
  value,
  onChange,
  disabled,
  onSelectOther,
  customRooms = [],
}: {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  onSelectOther?: () => void
  customRooms?: string[]
}) {
  const [isOpen, setIsOpen] = useState(false)

  const selectedLocation = DEVICE_LOCATIONS[value]
  const isCustomValue = !selectedLocation && value
  const SelectedIcon = selectedLocation?.icon || Home

  const handleSelect = (key: string) => {
    if (key === 'OTRO' && onSelectOther) {
      setIsOpen(false)
      onSelectOther()
    } else {
      onChange(key)
      setIsOpen(false)
    }
  }

  const handleSelectCustomRoom = (room: string) => {
    onChange(room)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-primary outline-none transition-colors focus:border-accent flex items-center justify-between disabled:bg-slate-50 disabled:cursor-not-allowed"
      >
        <span className="flex items-center gap-2">
          {SelectedIcon && <SelectedIcon className="size-4 text-slate-500" />}
          {isCustomValue ? value : (selectedLocation?.label || 'Seleccionar...')}
        </span>
        {!disabled && (
          <svg className={`size-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-white py-1 shadow-lg max-h-60 overflow-y-auto">
          <button
            type="button"
            onClick={() => {
              onChange('')
              setIsOpen(false)
            }}
            className="w-full px-4 py-2 text-left text-sm text-slate-500 hover:bg-slate-50"
          >
            Seleccionar...
          </button>
          {Object.entries(DEVICE_LOCATIONS).filter(([key]) => key !== 'OTRO').map(([key, { label, icon: Icon }]) => (
            <button
              key={key}
              type="button"
              onClick={() => handleSelect(key)}
              className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 ${
                value === key ? 'bg-accent/10 text-primary font-medium' : 'text-primary'
              }`}
            >
              <Icon className="size-4 text-slate-500" />
              {label}
            </button>
          ))}
          {customRooms.map((room) => (
            <button
              key={room}
              type="button"
              onClick={() => handleSelectCustomRoom(room)}
              className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 ${
                value === room ? 'bg-accent/10 text-primary font-medium' : 'text-primary'
              }`}
            >
              <Home className="size-4 text-slate-500" />
              {room}
            </button>
          ))}
          {Object.entries(DEVICE_LOCATIONS).filter(([key]) => key === 'OTRO').map(([key, { label, icon: Icon }]) => (
            <button
              key={key}
              type="button"
              onClick={() => handleSelect(key)}
              className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 ${
                value === key ? 'bg-accent/10 text-primary font-medium' : 'text-primary'
              }`}
            >
              <Icon className="size-4 text-slate-500" />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function CompactLocationSelect({
  value,
  onChange,
  customRooms,
}: {
  value: string
  onChange: (value: string) => void
  customRooms: string[]
}) {
  const [isOpen, setIsOpen] = useState(false)

  const selectedLocation = DEVICE_LOCATIONS[value]
  const SelectedIcon = selectedLocation?.icon

  const predefinedOptions = Object.entries(DEVICE_LOCATIONS)
    .filter(([key]) => key !== 'OTRO')
    .map(([key, { label, icon: Icon }]) => ({
      key,
      label,
      icon: Icon,
    }))

  const customOptions = customRooms.map((room) => ({
    key: room,
    label: room,
    icon: Home,
  }))

  const displayLabel = selectedLocation?.label || customOptions.find(o => o.key === value)?.label || 'Habitación'
  const DisplayIcon = SelectedIcon || customOptions.find(o => o.key === value)?.icon

  return (
    <div className="relative flex-1">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full rounded-xl border border-border bg-white px-2 py-1.5 text-xs text-primary outline-none transition-colors focus:border-accent flex items-center justify-between"
      >
        <span className="flex items-center gap-1.5 truncate">
          {DisplayIcon && <DisplayIcon className="size-3 text-slate-500 shrink-0" />}
          <span className="truncate">{displayLabel}</span>
        </span>
        <svg className={`size-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''} shrink-0 ml-1`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-white py-1 shadow-lg max-h-48 overflow-y-auto">
          <button
            type="button"
            onClick={() => {
              onChange('')
              setIsOpen(false)
            }}
            className="w-full px-2 py-1.5 text-left text-xs text-slate-500 hover:bg-slate-50"
          >
            Todas las habitaciones
          </button>
          {predefinedOptions.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                onChange(key)
                setIsOpen(false)
              }}
              className={`w-full px-2 py-1.5 text-left text-xs hover:bg-slate-50 flex items-center gap-1.5 ${
                value === key ? 'bg-accent/10 text-primary font-medium' : 'text-primary'
              }`}
            >
              <Icon className="size-3 text-slate-500" />
              {label}
            </button>
          ))}
          {customOptions.length > 0 && (
            <>
              <div className="my-1 border-t border-border" />
              {customOptions.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    onChange(key)
                    setIsOpen(false)
                  }}
                  className={`w-full px-2 py-1.5 text-left text-xs hover:bg-slate-50 flex items-center gap-1.5 ${
                    value === key ? 'bg-accent/10 text-primary font-medium' : 'text-primary'
                  }`}
                >
                  <Home className="size-3 text-slate-500" />
                  {label}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function CompactCategorySelect({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false)

  const selectedCategory = DEVICE_CATEGORIES[value]
  const SelectedIcon = selectedCategory?.icon

  return (
    <div className="relative flex-1">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full rounded-xl border border-border bg-white px-2 py-1.5 text-xs text-primary outline-none transition-colors focus:border-accent flex items-center justify-between"
      >
        <span className="flex items-center gap-1.5 truncate">
          {SelectedIcon && <SelectedIcon className="size-3 text-slate-500 shrink-0" />}
          <span className="truncate">{selectedCategory?.label || 'Categoría'}</span>
        </span>
        <svg className={`size-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''} shrink-0 ml-1`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-white py-1 shadow-lg max-h-48 overflow-y-auto">
          <button
            type="button"
            onClick={() => {
              onChange('')
              setIsOpen(false)
            }}
            className="w-full px-2 py-1.5 text-left text-xs text-slate-500 hover:bg-slate-50"
          >
            Todas las categorías
          </button>
          {Object.entries(DEVICE_CATEGORIES).map(([key, { label, icon: Icon }]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                onChange(key)
                setIsOpen(false)
              }}
              className={`w-full px-2 py-1.5 text-left text-xs hover:bg-slate-50 flex items-center gap-1.5 ${
                value === key ? 'bg-accent/10 text-primary font-medium' : 'text-primary'
              }`}
            >
              <Icon className="size-3 text-slate-500" />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ConfirmRevokeDialog({
  ecosystemName,
  isRevoking,
  onConfirm,
  onCancel,
}: {
  ecosystemName: string
  isRevoking: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  if (!ecosystemName) return null
  return (
    <div className="absolute inset-0 z-[95] flex items-center justify-center bg-black/20 px-4 py-6">
      <div className="w-full max-w-lg rounded-[1.5rem] border border-border bg-white p-6 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-700">
            <X className="size-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-primary">Confirmar baja de ecosistema</h3>
            <p className="text-sm leading-6 text-muted">
              ¿Estás seguro de que quieres dar de baja el ecosistema <strong>{ecosystemName}</strong>? Esta acción lo eliminará de tu lista.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center justify-center rounded-2xl border border-border bg-white px-5 py-3 text-sm font-semibold text-primary transition-colors hover:bg-surface/50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isRevoking}
            className="inline-flex items-center justify-center rounded-2xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isRevoking ? 'Dando de baja...' : 'Confirmar baja'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ConfirmLeaveDialog({
  ecosystemName,
  isLeaving,
  onConfirm,
  onCancel,
}: {
  ecosystemName: string
  isLeaving: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  if (!ecosystemName) return null
  return (
    <div className="absolute inset-0 z-[95] flex items-center justify-center bg-black/20 px-4 py-6">
      <div className="w-full max-w-lg rounded-[1.5rem] border border-border bg-white p-6 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <UserMinus className="size-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-primary">Dejar de ver el ecosistema</h3>
            <p className="text-sm leading-6 text-muted">
              ¿Estás seguro de que quieres dejar de ver el ecosistema <strong>{ecosystemName}</strong>? El propietario será notificado de tu decisión.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center justify-center rounded-2xl border border-border bg-white px-5 py-3 text-sm font-semibold text-primary transition-colors hover:bg-surface/50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLeaving}
            className="inline-flex items-center justify-center rounded-2xl bg-amber-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLeaving ? 'Abandonando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function CustomRoomDialog({
  value,
  onChange,
  onConfirm,
  onCancel,
}: {
  value: string
  onChange: (v: string) => void
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="absolute inset-0 z-[95] flex items-center justify-center bg-black/20 px-4 py-6">
      <div className="w-full max-w-md rounded-[1.5rem] border border-border bg-white p-6 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-accent/10 text-accent">
            <Home className="size-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-primary">Nueva habitación</h3>
            <p className="text-sm leading-6 text-muted">
              Introduce el nombre de la nueva habitación o ubicación.
            </p>
          </div>
        </div>

        <div className="mt-4">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Ej: Terraza, Trastero, Garaje..."
            className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-primary outline-none transition-colors focus:border-accent"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') onConfirm()
            }}
          />
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center justify-center rounded-2xl border border-border bg-white px-5 py-3 text-sm font-semibold text-primary transition-colors hover:bg-surface/50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!value.trim()}
            className="inline-flex items-center justify-center rounded-2xl bg-accent px-5 py-3 text-sm font-semibold text-primary transition-colors hover:bg-accent/80 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}

function EcosystemHeader({
  ecosystemName,
  isEditing,
  editedName,
  onEditedNameChange,
  isSaving,
  onSave,
  onCancelEdit,
  onStartEdit,
  canManage,
  canRevoke,
  isShared,
  onRevoke,
  onLeave,
  error,
  saveMessage,
}: {
  ecosystemName: string
  isEditing: boolean
  editedName: string
  onEditedNameChange: (v: string) => void
  isSaving: boolean
  onSave: () => void
  onCancelEdit: () => void
  onStartEdit: () => void
  canManage: boolean
  canRevoke: boolean
  isShared?: boolean
  onRevoke: () => void
  onLeave: () => void
  error: string | null
  saveMessage: string | null
}) {
  return (
    <div className="min-w-0">
      <h3 className="text-lg font-semibold text-primary">Dispositivos del ecosistema</h3>
      {isEditing ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            type="text"
            aria-label="Nombre del ecosistema"
            value={editedName}
            onChange={(event) => onEditedNameChange(event.target.value)}
            className="w-full max-w-md rounded-2xl border border-border bg-white px-4 py-3 text-sm text-primary outline-none transition-colors focus:border-accent"
          />
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving || editedName.trim().length === 0 || editedName.trim() === ecosystemName}
            className="inline-flex items-center justify-center rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-primary transition-colors hover:bg-accent/80 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? 'Guardando...' : 'Guardar nombre ecosistema'}
          </button>
          <button
            type="button"
            onClick={onCancelEdit}
            className="inline-flex items-center justify-center rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-primary transition-colors hover:bg-surface/50"
          >
            Cancelar
          </button>
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <p className="text-sm text-muted">{ecosystemName}</p>
          {canManage && (
            <button
              type="button"
              onClick={onStartEdit}
              className="inline-flex items-center gap-2 rounded-2xl border border-border bg-white px-3 py-2 text-sm font-semibold text-primary transition-colors hover:bg-surface/70"
            >
              <Pencil className="size-4" />
              Editar ecosistema
            </button>
          )}
          {canRevoke && (
            <button
              type="button"
              onClick={onRevoke}
              className="inline-flex items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-100"
            >
              Dar de baja ecosistema
            </button>
          )}
          {isShared && (
            <button
              type="button"
              onClick={onLeave}
              className="inline-flex items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700 transition-colors hover:bg-amber-100"
            >
              Quiero dejar de ver este ecosistema
            </button>
          )}
        </div>
      )}
      {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}
      {saveMessage ? <p className="mt-2 text-sm text-emerald-700">{saveMessage}</p> : null}
    </div>
  )
}

function DeviceListPanel({
  customRooms,
  filterRoom,
  onFilterRoomChange,
  filterCategory,
  onFilterCategoryChange,
  filteredDevices,
  selectedDeviceId,
  onSelectDevice,
  totalDevicesCount,
}: {
  customRooms: string[]
  filterRoom: string
  onFilterRoomChange: (v: string) => void
  filterCategory: string
  onFilterCategoryChange: (v: string) => void
  filteredDevices: AccessMapDevice[]
  selectedDeviceId: string | null
  onSelectDevice: (device: AccessMapDevice) => void
  totalDevicesCount: number
}) {
  return (
    <div className="rounded-3xl border border-border bg-surface/60 p-4 overflow-hidden">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Lista de dispositivos</p>
      <div className="mt-3 flex gap-2">
        <div className="w-40 shrink-0">
          <CompactLocationSelect value={filterRoom} onChange={onFilterRoomChange} customRooms={customRooms} />
        </div>
        <div className="flex-1 min-w-0">
          <CompactCategorySelect value={filterCategory} onChange={onFilterCategoryChange} />
        </div>
      </div>
      <div className="mt-3 max-h-[calc(100vh-22rem)] overflow-y-auto pr-2 space-y-2">
        {filteredDevices.length > 0 ? (
          filteredDevices.map((device) => (
            <button
              key={device.id}
              type="button"
              onClick={() => onSelectDevice(device)}
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
            {totalDevicesCount === 0
              ? 'No hay dispositivos registrados para este ecosistema.'
              : 'No hay dispositivos que coincidan con los filtros seleccionados.'}
          </div>
        )}
      </div>
    </div>
  )
}

function DeviceDetailsPanel({
  displayedDevice,
  isDeviceLoading,
  isUser,
  editedDeviceName,
  onEditedDeviceNameChange,
  editedDeviceRoom,
  onEditedDeviceRoomChange,
  editedDeviceCategory,
  onEditedDeviceCategoryChange,
  isSavingDeviceName,
  onSaveDevice,
  onClose,
  deviceStatusClassName,
  deviceStatusLabel,
  lastInteractionAt,
  deviceStatusError,
  modalError,
  saveMessage,
  ecosystemName,
  customRooms,
  onCustomRoomOpen,
}: {
  displayedDevice: AccessMapDevice | null
  isDeviceLoading: boolean
  isUser: boolean
  editedDeviceName: string
  onEditedDeviceNameChange: (v: string) => void
  editedDeviceRoom: string
  onEditedDeviceRoomChange: (v: string) => void
  editedDeviceCategory: string
  onEditedDeviceCategoryChange: (v: string) => void
  isSavingDeviceName: boolean
  onSaveDevice: () => void
  onClose: () => void
  deviceStatusClassName: string
  deviceStatusLabel: string
  lastInteractionAt: string | null
  deviceStatusError: string | null
  modalError: string | null
  saveMessage: string | null
  ecosystemName: string
  customRooms: string[]
  onCustomRoomOpen: () => void
}) {
  return (
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

      {(() => {
        if (isDeviceLoading && !displayedDevice) {
          return <div className="mt-6 rounded-2xl border border-border bg-white px-4 py-6 text-sm text-muted">Cargando datos del dispositivo...</div>
        }
        if (displayedDevice) {
          return (
            <DeviceInfoFields
              displayedDevice={displayedDevice}
              isUser={isUser}
              editedDeviceName={editedDeviceName}
              onEditedDeviceNameChange={onEditedDeviceNameChange}
              editedDeviceRoom={editedDeviceRoom}
              onEditedDeviceRoomChange={onEditedDeviceRoomChange}
              editedDeviceCategory={editedDeviceCategory}
              onEditedDeviceCategoryChange={onEditedDeviceCategoryChange}
              ecosystemName={ecosystemName}
              customRooms={customRooms}
              onCustomRoomOpen={onCustomRoomOpen}
            />
          )
        }
        return (
          <div className="mt-6 rounded-2xl border border-border bg-white px-4 py-6 text-sm text-muted">
            Selecciona un dispositivo para ver su información.
          </div>
        )
      })()}

      {displayedDevice && (
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
              disabled={isSavingDeviceName || (editedDeviceName.trim() === displayedDevice.name && !editedDeviceCategory && !editedDeviceRoom)}
              onClick={onSaveDevice}
              className="inline-flex items-center justify-center rounded-2xl bg-accent px-5 py-3 text-sm font-semibold text-primary transition-colors hover:bg-accent/80 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSavingDeviceName ? 'Guardando...' : 'Guardar'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function DeviceInfoFields({
  displayedDevice,
  isUser,
  editedDeviceName,
  onEditedDeviceNameChange,
  editedDeviceRoom,
  onEditedDeviceRoomChange,
  editedDeviceCategory,
  onEditedDeviceCategoryChange,
  ecosystemName,
  customRooms,
  onCustomRoomOpen,
}: {
  displayedDevice: AccessMapDevice
  isUser: boolean
  editedDeviceName: string
  onEditedDeviceNameChange: (v: string) => void
  editedDeviceRoom: string
  onEditedDeviceRoomChange: (v: string) => void
  editedDeviceCategory: string
  onEditedDeviceCategoryChange: (v: string) => void
  ecosystemName: string
  customRooms: string[]
  onCustomRoomOpen: () => void
}) {
  return (
    <div className="mt-6 space-y-4 max-h-[calc(100vh-22rem)] overflow-y-auto pr-2">
      <label className="block space-y-2">
        <span className="text-sm font-medium text-primary">Nombre del dispositivo</span>
        {isUser ? (
          <input
            type="text"
            value={editedDeviceName}
            onChange={(event) => onEditedDeviceNameChange(event.target.value)}
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
          <span className="text-sm font-medium text-primary">Habitación</span>
          {isUser ? (
            <LocationSelect value={editedDeviceRoom} onChange={onEditedDeviceRoomChange} onSelectOther={onCustomRoomOpen} customRooms={customRooms} />
          ) : (
            <div className="rounded-2xl border border-border bg-slate-50 px-4 py-3 text-sm text-primary">
              {displayedDevice.room && DEVICE_LOCATIONS[displayedDevice.room]
                ? DEVICE_LOCATIONS[displayedDevice.room].label
                : displayedDevice.room || 'No disponible'}
            </div>
          )}
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-primary">Categoría</span>
          {isUser ? (
            <CategorySelect value={editedDeviceCategory} onChange={onEditedDeviceCategoryChange} />
          ) : (
            <div className="rounded-2xl border border-border bg-slate-50 px-4 py-3 text-sm text-primary">
              {displayedDevice.category && DEVICE_CATEGORIES[displayedDevice.category]
                ? DEVICE_CATEGORIES[displayedDevice.category].label
                : displayedDevice.category || 'No disponible'}
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
          <p className="mt-2 text-sm text-primary">{ecosystemName}</p>
        </div>
        <div className="rounded-2xl border border-border bg-white p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-muted">Última actualización</p>
          <p className="mt-2 text-sm text-primary">{displayedDevice.updatedAt ? new Date(displayedDevice.updatedAt).toLocaleString() : '-'}</p>
        </div>
      </div>

      <PayloadSection payload={displayedDevice.payload} />
    </div>
  )
}

function formatPayloadValue(value: unknown): string {
  if (typeof value === 'boolean') return value ? 'Sí' : 'No'
  if (typeof value === 'number') return value.toString()
  if (typeof value === 'string') return value
  if (value === null || value === undefined) return '-'
  return String(value)
}

function PayloadSection({ payload }: { payload: Record<string, unknown> | undefined }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent mb-3">Información adicional</p>
      {payload && Object.keys(payload).length > 0 ? (
        <div className="grid gap-2">
          {Object.entries(payload).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
              <span className="text-xs text-slate-500 capitalize">{key.replace(/_/g, ' ')}</span>
              <span className="text-sm font-medium text-primary">{formatPayloadValue(value)}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-400 italic">No hay información adicional disponible</p>
      )}
    </div>
  )
}

export default function EcosystemDevicesModal({
  ecosystem,
  onClose,
  onDeviceUpdated,
  onEcosystemUpdated,
  onEcosystemRevoked,
  onLeaveShared,
  canManageEcosystem,
  canRevokeEcosystem,
  initialDeviceId,
}: EcosystemDevicesModalProps) {
  const { authClaims } = useAuth()
  const role = (authClaims?.role ?? 'USER').toUpperCase()
  const isUser = role === 'USER'
  
  const devices = ecosystem.devices ?? []

  const REVERSE_ROOM_MAPPING: Record<string, string> = {
    'Salón': 'SALON',
    'Cocina': 'COCINA',
    'Dormitorio': 'HABITACION',
    'Baño': 'BAÑO',
    'Otro / Exterior': 'OTRO',
    'Exterior': 'EXTERIOR',
  }

  const predefinedSpanish = ['Salón', 'Dormitorio', 'Cocina', 'Baño', 'Exterior', 'Otro / Exterior']
  const isCustomRoomName = (room: string) => {
    const mapped = REVERSE_ROOM_MAPPING[room]
    return mapped ? !['SALON', 'COCINA', 'HABITACION', 'BAÑO', 'EXTERIOR', 'OTRO'].includes(mapped) : !predefinedSpanish.includes(room)
  }
  const customRooms = useMemo(() => {
    const rooms = new Set<string>()
    for (const device of devices) {
      if (device.room && isCustomRoomName(device.room)) rooms.add(device.room)
    }
    return Array.from(rooms).sort((a, b) => a.localeCompare(b, 'es-ES'))
  }, [devices])

  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(devices[0]?.id ?? null)
  const [selectedDevice, setSelectedDevice] = useState<AccessMapDevice | null>(devices[0] ?? null)
  const [editedDeviceName, setEditedDeviceName] = useState<string>(devices[0]?.name ?? '')
  const [editedDeviceRoom, setEditedDeviceRoom] = useState<string>(devices[0]?.room ?? '')
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
  const [isConfirmingLeave, setIsConfirmingLeave] = useState(false)
  const [isRevoking, setIsRevoking] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [ecosystemError, setEcosystemError] = useState<string | null>(null)
  const [ecosystemSaveMessage, setEcosystemSaveMessage] = useState<string | null>(null)
  const [filterRoom, setFilterRoom] = useState<string>('')
  const [filterCategory, setFilterCategory] = useState<string>('')
  const [isCustomRoomModalOpen, setIsCustomRoomModalOpen] = useState(false)
  const [customRoomInput, setCustomRoomInput] = useState('')

  useEffect(() => {
    const initialDevice = initialDeviceId
      ? devices.find((d) => d.id === initialDeviceId)
      : devices[0]
    setSelectedDeviceId(initialDevice?.id ?? null)
    setSelectedDevice(initialDevice ?? null)
    setEditedDeviceName(initialDevice?.name ?? '')
    const initialRoom = initialDevice?.room ?? ''
    const mappedRoom = REVERSE_ROOM_MAPPING[initialRoom] || initialRoom
    setEditedDeviceRoom(mappedRoom)
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
      setEditedDeviceRoom('')
      setEditedDeviceCategory('')
      return
    }

    const loadDeviceDetails = async () => {
      setIsDeviceLoading(true)
      setModalError(null)

      try {
        const response = await apiClient.get<AccessMapDevice>(`/devices/${selectedDeviceId}`)
        const deviceDetails = response.data
        const mappedRoom = deviceDetails.room ? (REVERSE_ROOM_MAPPING[deviceDetails.room] || deviceDetails.room) : ''

        let devicePayload: Record<string, unknown> | undefined = undefined
        if (deviceDetails.macAddress && ecosystem.id) {
          try {
            const payloadResponse = await getDeviceDetails(ecosystem.id, deviceDetails.macAddress)
            devicePayload = payloadResponse.payload ?? undefined
          } catch {
            // Silently fail - payload is optional
          }
        }

        setSelectedDevice({ ...deviceDetails, payload: devicePayload })
        setEditedDeviceName(deviceDetails.name)
        setEditedDeviceRoom(mappedRoom)
        setEditedDeviceCategory(deviceDetails.category ?? '')
      } catch {
        const persistedDevice = ecosystem.devices.find((device) => device.id === selectedDeviceId) ?? null
        const persistedRoom = persistedDevice?.room ?? ''
        const mappedPersistedRoom = REVERSE_ROOM_MAPPING[persistedRoom] || persistedRoom
        setSelectedDevice(persistedDevice)
        setEditedDeviceName(persistedDevice?.name ?? '')
        setEditedDeviceRoom(mappedPersistedRoom)
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

  const ROOM_KEY_TO_NAME: Record<string, string> = {
    SALON: 'Salón',
    COCINA: 'Cocina',
    HABITACION: 'Dormitorio',
    BAÑO: 'Baño',
    EXTERIOR: 'Exterior',
    OTRO: 'Otro / Exterior',
  }

  const filteredDevices = useMemo(() => {
    return devices.filter((device) => {
      if (filterRoom) {
        const normalizedFilterRoom = ROOM_KEY_TO_NAME[filterRoom] || filterRoom
        if (device.room !== normalizedFilterRoom) {
          return false
        }
      }
      if (filterCategory && device.category !== filterCategory) {
        return false
      }
      return true
    })
  }, [devices, filterRoom, filterCategory])

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
    const trimmedName = editedDeviceName.trim()
    if (!displayedDevice || (trimmedName.length === 0 && !editedDeviceCategory && !editedDeviceRoom)) return

    setIsSavingDeviceName(true)
    setModalError(null)

    const ROOM_MAPPING: Record<string, string> = {
      SALON: 'Salón',
      COCINA: 'Cocina',
      HABITACION: 'Dormitorio',
      BAÑO: 'Baño',
      EXTERIOR: 'Exterior',
      OTRO: 'Otro / Exterior',
    }

    try {
      const response = await apiClient.patch<AccessMapDevice>(`/devices/${displayedDevice.id}`, {
        ...(trimmedName.length > 0 && trimmedName !== displayedDevice.name && { name: trimmedName }),
        ...(editedDeviceCategory && { category: editedDeviceCategory }),
        ...(editedDeviceRoom && { room: ROOM_MAPPING[editedDeviceRoom] || editedDeviceRoom }),
      })

      setSelectedDevice(response.data)
      onDeviceUpdated(response.data)
      setSaveMessage('Datos actualizados correctamente.')
    } catch {
      setModalError('No se pudo actualizar los datos del dispositivo. Inténtalo de nuevo.')
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

  const handleLeaveShared = async () => {
    if (!ecosystem.id) return
    setIsLeaving(true)
    try {
      await onLeaveShared(ecosystem.id)
      setIsConfirmingLeave(false)
      onClose()
    } catch {
      setModalError('No se pudo abandonar el ecosistema. Inténtalo de nuevo.')
    } finally {
      setIsLeaving(false)
    }
  }

  const getDeviceStatusLabel = () => {
    if (isDeviceStatusLoading) return 'Verificando estado'
    if (isDeviceOnline === true) return 'ONLINE'
    if (isDeviceOnline === false) return 'OFFLINE'
    return 'Desconocido'
  }

  const getDeviceStatusClassName = () => {
    if (isDeviceStatusLoading) return 'border border-accent/20 bg-accent/10 text-accent'
    if (isDeviceOnline === true) return 'border border-emerald-200 bg-emerald-100 text-emerald-700'
    if (isDeviceOnline === false) return 'border border-rose-200 bg-rose-50 text-rose-700'
    return 'border border-slate-200 bg-slate-100 text-slate-700'
  }

  const handleConfirmCustomRoom = () => {
    const trimmed = customRoomInput.trim()
    if (trimmed) {
      const normalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase()
      setEditedDeviceRoom(normalized)
    }
    setIsCustomRoomModalOpen(false)
    setCustomRoomInput('')
  }

  return (
    <div className="fixed inset-0 z-[90] h-dvh w-screen flex items-center justify-center bg-black/25 px-4 backdrop-blur-sm">
      <div className="w-full max-w-6xl max-h-[calc(100vh-4rem)] overflow-hidden rounded-[1.5rem] border border-border bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <EcosystemHeader
            ecosystemName={ecosystem.name}
            isEditing={isEditingEcosystemName}
            editedName={editedEcosystemName}
            onEditedNameChange={setEditedEcosystemName}
            isSaving={isSavingEcosystemName}
            onSave={handleSaveEcosystemName}
            onCancelEdit={() => {
              setIsEditingEcosystemName(false)
              setEditedEcosystemName(ecosystem.name)
              setEcosystemError(null)
              setEcosystemSaveMessage(null)
            }}
            onStartEdit={() => setIsEditingEcosystemName(true)}
            canManage={canManageEcosystem}
            canRevoke={canRevokeEcosystem}
            isShared={ecosystem.isShared}
            onRevoke={() => setIsConfirmingRevoke(true)}
            onLeave={() => setIsConfirmingLeave(true)}
            error={ecosystemError}
            saveMessage={ecosystemSaveMessage}
          />
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
          <DeviceListPanel
            customRooms={customRooms}
            filterRoom={filterRoom}
            onFilterRoomChange={setFilterRoom}
            filterCategory={filterCategory}
            onFilterCategoryChange={setFilterCategory}
            filteredDevices={filteredDevices}
            selectedDeviceId={selectedDeviceId}
            onSelectDevice={handleSelectDevice}
            totalDevicesCount={ecosystem.devices.length}
          />
          <DeviceDetailsPanel
            displayedDevice={displayedDevice}
            isDeviceLoading={isDeviceLoading}
            isUser={isUser}
            editedDeviceName={editedDeviceName}
            onEditedDeviceNameChange={setEditedDeviceName}
            editedDeviceRoom={editedDeviceRoom}
            onEditedDeviceRoomChange={setEditedDeviceRoom}
            editedDeviceCategory={editedDeviceCategory}
            onEditedDeviceCategoryChange={setEditedDeviceCategory}
            isSavingDeviceName={isSavingDeviceName}
            onSaveDevice={handleSaveDeviceName}
            onClose={onClose}
            deviceStatusClassName={getDeviceStatusClassName()}
            deviceStatusLabel={getDeviceStatusLabel()}
            lastInteractionAt={lastInteractionAt}
            deviceStatusError={deviceStatusError}
            modalError={modalError}
            saveMessage={saveMessage}
            ecosystemName={ecosystem.name}
            customRooms={customRooms}
            onCustomRoomOpen={() => setIsCustomRoomModalOpen(true)}
          />
        </div>

        {isConfirmingRevoke && (
          <ConfirmRevokeDialog
            ecosystemName={ecosystem.name}
            isRevoking={isRevoking}
            onConfirm={handleConfirmRevoke}
            onCancel={() => setIsConfirmingRevoke(false)}
          />
        )}

        {isConfirmingLeave && (
          <ConfirmLeaveDialog
            ecosystemName={ecosystem.name}
            isLeaving={isLeaving}
            onConfirm={handleLeaveShared}
            onCancel={() => setIsConfirmingLeave(false)}
          />
        )}

        {isCustomRoomModalOpen && (
          <CustomRoomDialog
            value={customRoomInput}
            onChange={setCustomRoomInput}
            onConfirm={handleConfirmCustomRoom}
            onCancel={() => {
              setIsCustomRoomModalOpen(false)
              setCustomRoomInput('')
            }}
          />
        )}
      </div>
    </div>
  )
}
