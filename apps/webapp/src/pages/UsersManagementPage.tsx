import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, ChevronLeft, ChevronRight, Search, Users, X } from 'lucide-react'
import Select from '../components/Select'
import { useUsersController } from '../controllers/useUsersController'
import { useAuth } from '../context/auth-context'
import { getUserEcosystems, type UserEcosystem } from '../services/ecosystems.service'
import { getUserById } from '../services/users.service'
import { getUserTelemetryVolume } from '../services/users.service'
import { sendNotificationToUser, sendNotificationToRoles } from '../services/notifications.service'
import type { User } from '../components/dashboard/users.data'

const USER_ROLES = ['ALL', 'USER', 'AUDITOR', 'ADMIN'] as const
const USER_STATUSES = ['ALL', 'ACTIVE', 'PENDING', 'PASSBLOCK'] as const
const PAGE_SIZES = [10, 25, 50, 100] as const
const ECOSYSTEMS_PAGE_SIZE = 5

const getUserStatusClass = (status: string): string => {
  switch (status) {
    case 'ACTIVE':
      return 'bg-emerald-100 text-emerald-700'
    case 'PENDING':
      return 'bg-amber-100 text-amber-700'
    case 'PASSBLOCK':
      return 'bg-slate-100 text-slate-700'
    default:
      return 'bg-rose-100 text-rose-700'
  }
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

function UsersHeader() {
  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="flex items-center gap-3">
        <Users className="h-6 w-6 text-violet-600" />
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Gestión de usuarios</h1>
          <p className="text-slate-600 mt-2">
            Administra el acceso y el estado de los usuarios.
          </p>
        </div>
      </div>
    </div>
  )
}

function StatsCards({ users }: { users: User[] }) {
  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-3">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-500">Usuarios totales</p>
        <p className="mt-2 text-3xl font-semibold text-slate-900">{users.length}</p>
      </div>
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-500">Usuarios activos</p>
        <p className="mt-2 text-3xl font-semibold text-slate-900">{users.filter((user) => user.status === 'ACTIVE').length}</p>
      </div>
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-500">Usuarios pendientes</p>
        <p className="mt-2 text-3xl font-semibold text-slate-900">{users.filter((user) => user.status === 'PENDING').length}</p>
      </div>
    </div>
  )
}

function FilterBar({
  searchTerm,
  setSearchTerm,
  roleFilter,
  setRoleFilter,
  statusFilter,
  setStatusFilter,
  pageSize,
  onPageSizeChange,
  role,
  onOpenGlobalNotification,
}: {
  searchTerm: string
  setSearchTerm: (value: string) => void
  roleFilter: string
  setRoleFilter: (value: string) => void
  statusFilter: string
  setStatusFilter: (value: string) => void
  pageSize: number
  onPageSizeChange: (value: number) => void
  role: string
  onOpenGlobalNotification: () => void
}) {
  return (
    <div className="mb-6 grid gap-3 md:grid-cols-5">
      <label className="block space-y-1">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Buscar</span>
        <div className="flex items-center rounded-3xl border border-border bg-slate-50 px-3 py-2">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar por correo"
            className="ml-2 w-full border-none bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
          />
        </div>
      </label>

      <label className="block space-y-1">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Rol</span>
        <Select
          value={roleFilter}
          onChange={(value) => setRoleFilter(value as (typeof USER_ROLES)[number])}
          options={USER_ROLES.map((role) => ({ value: role, label: role === 'ALL' ? 'Todos' : role }))}
        />
      </label>

      <label className="block space-y-1">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Estado</span>
        <Select
          value={statusFilter}
          onChange={(value) => setStatusFilter(value as (typeof USER_STATUSES)[number])}
          options={USER_STATUSES.map((status) => ({ value: status, label: status === 'ALL' ? 'Todos' : status }))}
        />
      </label>

      <label className="block space-y-1">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Resultados</span>
        <Select
          value={pageSize}
          onChange={(value) => onPageSizeChange(Number(value) as (typeof PAGE_SIZES)[number])}
          options={PAGE_SIZES.map((size) => ({ value: size, label: size.toString() }))}
        />
      </label>

      {(role === 'ADMIN' || role === 'GLOBAL_ADMIN') && (
        <span className="block space-y-1">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Administración</span>
          <button
            type="button"
            onClick={onOpenGlobalNotification}
            className="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-700"
          >
            <Bell className="size-4" />
            Enviar notificación global
          </button>
        </span>
      )}
    </div>
  )
}

function PaginationBar({
  currentPage,
  totalPages,
  onPageChange,
  count,
  total,
}: {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  count: number
  total: number
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
      <span>
        Mostrando {count} de {total} usuario
        {total === 1 ? '' : 's'}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="rounded-lg p-1 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span>
          Página {currentPage} de {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="rounded-lg p-1 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

function ErrorState({ error }: { error: string }) {
  return (
    <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
      <p className="font-semibold">Error de carga</p>
      <p className="mt-2">{error}</p>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((item) => (
        <div key={item} className="h-14 rounded-3xl bg-slate-100" />
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-slate-700">
      <p className="font-medium text-slate-900">No se encontraron usuarios para los filtros actuales.</p>
    </div>
  )
}

function UsersTable({
  paginatedUsers,
  canViewUserInfo,
  onShowUserInfo,
  canChangeUserRole,
  onOpenRoleChange,
  onUserAction,
  role,
  onOpenUserNotification,
  canRevokeUser,
}: {
  paginatedUsers: User[]
  canViewUserInfo: (user: User) => boolean
  onShowUserInfo: (user: User) => void
  canChangeUserRole: (user: User) => boolean
  onOpenRoleChange: (user: User) => void
  onUserAction: (user: User, action: 'approve' | 'revoke') => void
  role: string
  onOpenUserNotification: (user: User) => void
  canRevokeUser: (user: User) => boolean
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200 text-sm text-slate-700">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.2em] text-slate-500">
          <tr>
            <th className="px-6 py-4">Correo</th>
            <th className="px-6 py-4">Rol</th>
            <th className="px-6 py-4">Estado</th>
            <th className="px-6 py-4">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {paginatedUsers.map((user) => (
            <tr key={user.id}>
              <td className="px-6 py-4 font-medium text-slate-900">{user.email}</td>
              <td className="px-6 py-4">
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary/10 text-primary">
                  {user.role}
                </span>
              </td>
              <td className="px-6 py-4">
                <span
                  className={`text-xs font-medium px-2 py-1 rounded-full ${getUserStatusClass(user.status)}`}
                >
                  {user.status}
                </span>
              </td>
              <td className="px-6 py-4">
                <div className="flex flex-wrap gap-2">
                  {canViewUserInfo(user) && (
                    <button
                      type="button"
                      onClick={() => onShowUserInfo(user)}
                      className="text-xs px-2 py-1 rounded hover:bg-sky-100 hover:text-sky-700 transition-colors text-sky-600"
                    >
                      Ver información
                    </button>
                  )}
                  {canChangeUserRole(user) && (
                    <button
                      type="button"
                      onClick={() => onOpenRoleChange(user)}
                      className="text-xs px-2 py-1 rounded hover:bg-slate-100 hover:text-slate-700 transition-colors text-slate-600"
                    >
                      Cambiar rol
                    </button>
                  )}
                  {user.status === 'PENDING' && (
                    <button
                      type="button"
                      onClick={() => onUserAction(user, 'approve')}
                      className="text-xs px-2 py-1 rounded hover:bg-emerald-100 hover:text-emerald-700 transition-colors text-emerald-600"
                    >
                      Aprobar
                    </button>
                  )}
                  {(role === 'ADMIN' || role === 'GLOBAL_ADMIN') && user.status === 'ACTIVE' && (
                    <button
                      type="button"
                      onClick={() => onOpenUserNotification(user)}
                      className="text-xs px-2 py-1 rounded hover:bg-teal-100 hover:text-teal-700 transition-colors text-teal-600"
                    >
                      Enviar notificación
                    </button>
                  )}
                  {canRevokeUser(user) && (
                    <button
                      type="button"
                      onClick={() => onUserAction(user, 'revoke')}
                      className="text-xs px-2 py-1 rounded hover:bg-rose-100 hover:text-rose-700 transition-colors text-rose-600"
                    >
                      Revocar
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function UserActionModal({
  pendingUserAction,
  actionLoading,
  onCancel,
  onConfirm,
}: {
  pendingUserAction: { userEmail: string; action: 'approve' | 'revoke' }
  actionLoading: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div className="fixed inset-0 z-[90] h-dvh w-screen flex items-center justify-center bg-black/25 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[1.5rem] border border-border bg-white p-6 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <Users className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-slate-900">Confirmación requerida</h3>
            <p className="text-sm leading-6 text-slate-500">
              {pendingUserAction.action === 'approve'
                ? `¿Quieres aprobar a ${pendingUserAction.userEmail}?`
                : `¿Quieres revocar a ${pendingUserAction.userEmail}?`}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={actionLoading}
            className={`inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold text-white transition-colors ${pendingUserAction.action === 'approve'
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-rose-600 hover:bg-rose-700'
              } ${actionLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {pendingUserAction.action === 'approve' ? 'Confirmar aprobación' : 'Confirmar revocación'}
          </button>
        </div>
      </div>
    </div>
  )
}

function RoleChangeModal({
  pendingRoleChange,
  actionLoading,
  onCancel,
  onRoleSelectChange,
  onConfirm,
}: {
  pendingRoleChange: { userEmail: string; currentRole: string; nextRole: string }
  actionLoading: boolean
  onCancel: () => void
  onRoleSelectChange: (value: string) => void
  onConfirm: () => void
}) {
  return (
    <div className="fixed inset-0 z-[90] h-dvh w-screen flex items-center justify-center bg-black/25 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[1.5rem] border border-border bg-white p-6 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
            <Users className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-slate-900">Cambiar rol de usuario</h3>
            <p className="text-sm leading-6 text-slate-500">
              Selecciona el nuevo rol para {pendingRoleChange.userEmail}. El rol actual es {pendingRoleChange.currentRole}.
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-900">Nuevo rol</span>
            <Select
              value={pendingRoleChange.nextRole}
              onChange={onRoleSelectChange}
              options={['USER', 'AUDITOR', 'ADMIN'].map((role) => ({ value: role, label: role }))}
            />
          </label>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={actionLoading}
            className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {actionLoading ? 'Procesando...' : 'Confirmar cambio de rol'}
          </button>
        </div>
      </div>
    </div>
  )
}

function RoleChangeConfirmModal({
  roleChangeConfirmation,
  actionLoading,
  onCancel,
  onConfirm,
}: {
  roleChangeConfirmation: { userEmail: string; currentRole: string; nextRole: string }
  actionLoading: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div className="fixed inset-0 z-[90] h-dvh w-screen flex items-center justify-center bg-black/25 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[1.5rem] border border-border bg-white p-6 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <Users className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-slate-900">Confirmación requerida</h3>
            <p className="text-sm leading-6 text-slate-500">
              ¿Estás seguro de cambiar el rol de {roleChangeConfirmation.userEmail} de {roleChangeConfirmation.currentRole} a {roleChangeConfirmation.nextRole}?
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={actionLoading}
            className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {actionLoading ? 'Procesando...' : 'Confirmar cambio'}
          </button>
        </div>
      </div>
    </div>
  )
}

function UserInfoModal({
  selectedUserInfo,
  userEcosystems,
  ownerEmails,
  telemetryVolume,
  ecosystemsPage,
  onEcosystemsPageChange,
  loadingEcosystems,
  onClose,
  onShowUserInfo,
  users,
}: {
  selectedUserInfo: User
  userEcosystems: UserEcosystem[]
  ownerEmails: Record<string, string>
  telemetryVolume: number
  ecosystemsPage: number
  onEcosystemsPageChange: (page: number | ((prev: number) => number)) => void
  loadingEcosystems: boolean
  onClose: () => void
  onShowUserInfo: (user: User) => void
  users: User[]
}) {
  const navigate = useNavigate()
  const totalEcosystemPages = Math.ceil(userEcosystems.length / ECOSYSTEMS_PAGE_SIZE)

  return (
    <div className="fixed inset-0 z-[90] h-dvh w-screen flex items-center justify-center bg-black/25 px-4 backdrop-blur-sm overflow-auto">
      <div className="w-full max-w-2xl rounded-[1.5rem] border border-border bg-white p-6 shadow-2xl my-8">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
            <Users className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-slate-900">Información de usuario</h3>
            <p className="text-sm leading-6 text-slate-500">Detalle de la cuenta seleccionada.</p>
          </div>
        </div>

        <div className="mt-6 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <p>
            <span className="font-semibold">Email:</span> {selectedUserInfo.email}
          </p>
          <p>
            <span className="font-semibold">Rol:</span> {selectedUserInfo.role}
          </p>
          <p>
            <span className="font-semibold">Estado:</span> {selectedUserInfo.status}
          </p>
          <p>
            <span className="font-semibold">Fecha de registro:</span> {selectedUserInfo.createdAt ? new Date(selectedUserInfo.createdAt).toLocaleDateString('es-ES') : '-'}
          </p>
          <p>
            <span className="font-semibold">Volumen de telemetría:</span> {formatBytes(telemetryVolume)}
          </p>
        </div>

        <div className="mt-6">
          <h4 className="text-sm font-semibold text-slate-900 mb-3">Ecosistemas asociados</h4>
          {(() => {
            if (loadingEcosystems) return <p className="text-sm text-slate-500">Cargando ecosistemas...</p>
            if (userEcosystems.length === 0) return <p className="text-sm text-slate-500">No hay ecosistemas asociados a este usuario.</p>
            return (
            <>
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">Ecosistema</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">Rol</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">Propietario</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userEcosystems
                      .slice((ecosystemsPage - 1) * ECOSYSTEMS_PAGE_SIZE, ecosystemsPage * ECOSYSTEMS_PAGE_SIZE)
                      .map((eco) => (
                        <tr key={eco.id} className="border-t border-slate-200">
                          <td className="px-3 py-2">
                            <a
                              className="font-medium text-sky-700 hover:underline cursor-pointer"
                              onClick={() => navigate('/ecosystems', { state: { selectedId: eco.id } })}
                            >
                              {eco.ecosystemName}
                            </a>
                          </td>
                          <td className="px-3 py-2">
                            {eco.accessType === 'OWNER'
                              ? eco.accessRole ?? 'VIEWER'
                              : `${eco.accessType === 'DELEGATED' ? 'DELEGATED-' : ''}${eco.accessRole ?? 'VIEWER'}`}
                          </td>
                          <td className="px-3 py-2">
                            {eco.accessType === 'DELEGATED' && eco.ownerId ? (
                              <div className="flex items-center gap-2">
                                <span>Propietario: {ownerEmails[eco.ownerId] ?? eco.ownerId}</span>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const ownerEmail = ownerEmails[eco.ownerId]
                                    if (ownerEmail) {
                                      const owner = users.find((u) => u.email === ownerEmail)
                                      if (owner) {
                                        onShowUserInfo(owner)
                                      }
                                    }
                                  }}
                                  className="p-1 rounded hover:bg-slate-100 text-slate-500"
                                  title="Ver propietario"
                                >
                                  <Search className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ) : (
                              '-'
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              {userEcosystems.length > ECOSYSTEMS_PAGE_SIZE && (
                <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                  <span>
                    Mostrando {Math.min((ecosystemsPage - 1) * ECOSYSTEMS_PAGE_SIZE + 1, userEcosystems.length)} -{' '}
                    {Math.min(ecosystemsPage * ECOSYSTEMS_PAGE_SIZE, userEcosystems.length)} de {userEcosystems.length}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onEcosystemsPageChange((p: number) => Math.max(1, p - 1))}
                      disabled={ecosystemsPage === 1}
                      className="rounded-lg p-1 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span>
                      Página {ecosystemsPage} de {totalEcosystemPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => onEcosystemsPageChange((p: number) => Math.min(totalEcosystemPages, p + 1))}
                      disabled={ecosystemsPage >= totalEcosystemPages}
                      className="rounded-lg p-1 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )})()}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

function NotificationFormModal({
  notificationModal,
  notificationForm,
  onFormChange,
  onClose,
  onContinue,
}: {
  notificationModal: { type: 'user' | 'global'; userId?: string; userEmail?: string }
  notificationForm: { title: string; message: string; roles: string[] }
  onFormChange: (updater: (prev: { title: string; message: string; roles: string[] }) => { title: string; message: string; roles: string[] }) => void
  onClose: () => void
  onContinue: () => void
}) {
  const handleRoleToggle = (role: string) => {
    onFormChange((prev) => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter((r) => r !== role)
        : [...prev.roles, role],
    }))
  }

  const canContinue =
    notificationForm.title.trim() &&
    notificationForm.message.trim() &&
    (notificationModal.type !== 'global' || notificationForm.roles.length > 0)

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/25 px-4 backdrop-blur-sm">
      <div className="w-[70%] max-w-4xl rounded-2xl border border-border bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
              <Bell className="size-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                {notificationModal.type === 'global' ? 'Enviar notificación global' : 'Enviar notificación'}
              </h3>
              <p className="text-sm text-slate-500">
                {notificationModal.type === 'global'
                  ? 'Envía una notificación a todos los usuarios de los roles seleccionados'
                  : `Envía una notificación a ${notificationModal.userEmail}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <label htmlFor="notification-title" className="block text-sm font-medium text-slate-700">Título</label>
            <input
              id="notification-title"
              type="text"
              value={notificationForm.title}
              onChange={(e) => onFormChange((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Título de la notificación"
              className="mt-1 w-full rounded-xl border border-border px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-accent"
            />
          </div>

          <div>
            <label htmlFor="notification-message" className="block text-sm font-medium text-slate-700">Mensaje</label>
            <textarea
              id="notification-message"
              value={notificationForm.message}
              onChange={(e) => onFormChange((prev) => ({ ...prev, message: e.target.value }))}
              placeholder="Escribe el mensaje de la notificación..."
              rows={8}
              className="mt-1 w-full max-h-60 rounded-xl border border-border px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-accent resize-none overflow-y-auto"
            />
          </div>

          {notificationModal.type === 'global' && (
            <div>
              <span className="block text-sm font-medium text-slate-700">Roles destinatarios</span>
              <div className="mt-2 flex flex-wrap gap-3">
                {['USER', 'AUDITOR', 'ADMIN'].map((r) => (
                  <label key={r} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notificationForm.roles.includes(r)}
                      onChange={() => handleRoleToggle(r)}
                      className="size-4 rounded border-border text-teal-600 focus:ring-teal-500"
                    />
                    <span className="text-sm text-slate-700">{r}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onContinue}
            disabled={!canContinue}
            className="inline-flex items-center justify-center rounded-2xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Continuar
          </button>
        </div>
      </div>
    </div>
  )
}

function NotificationConfirmModal({
  notificationModal,
  notificationForm,
  notificationSending,
  onBack,
  onSend,
}: {
  notificationModal: { type: 'user' | 'global'; userId?: string; userEmail?: string }
  notificationForm: { title: string; message: string; roles: string[] }
  notificationSending: boolean
  onBack: () => void
  onSend: () => void
}) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/25 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border bg-white p-6 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <Bell className="size-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Confirmar envío</h3>
            <p className="mt-1 text-sm text-slate-500">
              ¿Estás seguro de que deseas enviar esta notificación?
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-700">{notificationForm.title}</p>
          <p className="mt-1 text-sm text-slate-500">{notificationForm.message}</p>
          {notificationModal.type === 'global' && (
            <p className="mt-2 text-xs text-slate-400">Roles: {notificationForm.roles.join(', ')}</p>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100"
          >
            Volver
          </button>
          <button
            type="button"
            onClick={onSend}
            disabled={notificationSending}
            className="inline-flex items-center justify-center rounded-2xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {notificationSending ? 'Enviando...' : 'Confirmar y enviar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function UsersManagementPage() {
  const { users, isLoading, error, actionLoading, approveUser, revokeUser, changeUserRole } = useUsersController()
  const { authClaims } = useAuth()
  const [selectedUserInfo, setSelectedUserInfo] = useState<User | null>(null)
  const [userEcosystems, setUserEcosystems] = useState<UserEcosystem[]>([])
  const [ownerEmails, setOwnerEmails] = useState<Record<string, string>>({})
  const [telemetryVolume, setTelemetryVolume] = useState<number>(0)
  const [ecosystemsPage, setEcosystemsPage] = useState(1)
  const [loadingEcosystems, setLoadingEcosystems] = useState(false)
  const [pendingUserAction, setPendingUserAction] = useState<{
    userEmail: string
    action: 'approve' | 'revoke'
  } | null>(null)
  const [pendingRoleChange, setPendingRoleChange] = useState<{
    userEmail: string
    currentRole: string
    nextRole: string
  } | null>(null)
  const [roleChangeConfirmation, setRoleChangeConfirmation] = useState<{
    userEmail: string
    currentRole: string
    nextRole: string
  } | null>(null)
  const [notificationModal, setNotificationModal] = useState<{
    type: 'user' | 'global'
    userId?: string
    userEmail?: string
  } | null>(null)
  const [notificationForm, setNotificationForm] = useState({
    title: '',
    message: '',
    roles: [] as string[],
  })
  const [notificationSending, setNotificationSending] = useState(false)
  const [notificationConfirm, setNotificationConfirm] = useState(false)
  const role = (authClaims?.role ?? 'USER').toUpperCase()
  const isGlobalAdmin = role === 'GLOBAL_ADMIN'
  const [roleFilter, setRoleFilter] = useState<(typeof USER_ROLES)[number]>('ALL')
  const [statusFilter, setStatusFilter] = useState<(typeof USER_STATUSES)[number]>('ALL')
  const [searchTerm, setSearchTerm] = useState('')
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(10)
  const [currentPage, setCurrentPage] = useState(1)

  const canManageAdministratorUser = (user: { role: string }) => isGlobalAdmin || user.role !== 'ADMIN'
  const canViewUserInfo = (user: { status: string }) => user.status === 'ACTIVE' || user.status === 'PENDING'
  const canRevokeUser = (user: { status: string; role: string }) => user.status !== 'REVOKED' && canManageAdministratorUser(user)
  const canChangeUserRole = (user: { status: string; role: string }) => user.status === 'ACTIVE' && canManageAdministratorUser(user)

  const handleShowUserInfo = async (user: User) => {
    setSelectedUserInfo(user)
    setUserEcosystems([])
    setOwnerEmails({})
    setTelemetryVolume(0)
    setEcosystemsPage(1)
    setLoadingEcosystems(true)

    try {
      const ecosystems = await getUserEcosystems(user.id)
      setUserEcosystems(ecosystems)

      const ownedEcosystems = ecosystems.filter((e) => e.accessType === 'OWNER')
      if (ownedEcosystems.length > 0) {
        const volume = await getUserTelemetryVolume(user.id)
        setTelemetryVolume(volume)
      }

      const delegatedEcosystems = ecosystems.filter((e) => e.accessType === 'DELEGATED' && e.ownerId)
      const uniqueOwnerIds = [...new Set(delegatedEcosystems.map((e) => e.ownerId))]
      const emails: Record<string, string> = {}
      for (const ownerId of uniqueOwnerIds) {
        if (ownerId) {
          try {
            const ownerResponse = await getUserById(ownerId)
            if (ownerResponse) {
              emails[ownerId] = ownerResponse.email
            }
          } catch {
            // Ignore errors
          }
        }
      }
      setOwnerEmails(emails)
    } catch {
      // Ignore errors
    } finally {
      setLoadingEcosystems(false)
    }
  }

  const handleOpenRoleChange = (user: { email: string; role: string }) => {
    setPendingRoleChange({
      userEmail: user.email,
      currentRole: user.role,
      nextRole: user.role,
    })
  }

  const handleUserAction = (user: { email: string }, action: 'approve' | 'revoke') => {
    setPendingUserAction({
      userEmail: user.email,
      action,
    })
  }

  const handleConfirmUserAction = async () => {
    if (!pendingUserAction) return

    const user = users.find((u) => u.email === pendingUserAction.userEmail)
    if (!user) {
      setPendingUserAction(null)
      return
    }

    try {
      if (pendingUserAction.action === 'approve') {
        await approveUser(user.id)
      } else {
        await revokeUser(user.id)
      }
    } catch {
      // Error handling without alert
    } finally {
      setPendingUserAction(null)
    }
  }

  const handleConfirmRoleChange = () => {
    if (!pendingRoleChange) return

    setRoleChangeConfirmation(pendingRoleChange)
    setPendingRoleChange(null)
  }

  const handleExecuteRoleChange = async () => {
    if (!roleChangeConfirmation) return

    const user = users.find((u) => u.email === roleChangeConfirmation.userEmail)
    if (!user) {
      setRoleChangeConfirmation(null)
      return
    }

    try {
      await changeUserRole(user.id, roleChangeConfirmation.nextRole)
    } catch {
      // Error handling without alert
    } finally {
      setRoleChangeConfirmation(null)
    }
  }

  const handleOpenUserNotification = (user: User) => {
    setNotificationModal({ type: 'user', userId: user.id, userEmail: user.email })
  }

  const handleNotificationContinue = () => {
    if (!notificationForm.title.trim() || !notificationForm.message.trim()) return
    if (notificationModal && notificationModal.type === 'global' && notificationForm.roles.length === 0) return
    setNotificationConfirm(true)
  }

  const handleNotificationSend = async () => {
    if (!notificationModal) return
    setNotificationSending(true)
    try {
      if (notificationModal.type === 'user' && notificationModal.userId) {
        await sendNotificationToUser({
          userId: notificationModal.userId,
          title: notificationForm.title,
          message: notificationForm.message,
        })
      } else if (notificationModal.type === 'global') {
        const roles = notificationForm.roles.includes('ADMIN')
          ? [...new Set([...notificationForm.roles, 'ADMIN', 'GLOBAL_ADMIN'])]
          : notificationForm.roles
        await sendNotificationToRoles({
          roles,
          title: notificationForm.title,
          message: notificationForm.message,
        })
      }
      setNotificationModal(null)
      setNotificationConfirm(false)
      setNotificationForm({ title: '', message: '', roles: [] })
    } catch (error) {
      console.error('Error sending notification:', error)
    } finally {
      setNotificationSending(false)
    }
  }

  const filteredUsers = useMemo(
    () =>
      users.filter((user) => {
        const matchesRole = roleFilter === 'ALL' || user.role === roleFilter
        const matchesStatus = statusFilter === 'ALL' || user.status === statusFilter
        const searchLower = searchTerm?.toLowerCase() || ''
        const matchesSearch =
          (user.email?.toLowerCase() || '').includes(searchLower) ||
          (user.name?.toLowerCase() || '').includes(searchLower)

        return matchesRole && matchesStatus && matchesSearch
      }),
    [users, roleFilter, statusFilter, searchTerm],
  )

  const totalPages = Math.ceil(filteredUsers.length / pageSize)
  const paginatedUsers = useMemo(
    () => {
      const start = (currentPage - 1) * pageSize
      return filteredUsers.slice(start, start + pageSize)
    },
    [filteredUsers, currentPage, pageSize],
  )

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
    }
  }

  const handlePageSizeChange = (newSize: (typeof PAGE_SIZES)[number]) => {
    setPageSize(newSize)
    setCurrentPage(1)
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <UsersHeader />

        <StatsCards users={users} />

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <FilterBar
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            roleFilter={roleFilter}
            setRoleFilter={setRoleFilter}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            pageSize={pageSize}
            onPageSizeChange={handlePageSizeChange}
            role={role}
            onOpenGlobalNotification={() => setNotificationModal({ type: 'global' })}
          />

          <div className="mb-3">
            <PaginationBar
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              count={paginatedUsers.length}
              total={filteredUsers.length}
            />
          </div>

          {error ? <ErrorState error={error} /> : null}

          {(() => {
            if (isLoading) return <LoadingState />
            if (filteredUsers.length === 0) return <EmptyState />
            return (
            <>
              <UsersTable
                paginatedUsers={paginatedUsers}
                canViewUserInfo={canViewUserInfo}
                onShowUserInfo={handleShowUserInfo}
                canChangeUserRole={canChangeUserRole}
                onOpenRoleChange={handleOpenRoleChange}
                onUserAction={handleUserAction}
                role={role}
                onOpenUserNotification={handleOpenUserNotification}
                canRevokeUser={canRevokeUser}
              />
              <div className="mt-4">
                <PaginationBar
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  count={paginatedUsers.length}
                  total={filteredUsers.length}
                />
              </div>
            </>
          })()}
        </div>
      </div>

      {selectedUserInfo ? (
        <UserInfoModal
          selectedUserInfo={selectedUserInfo}
          userEcosystems={userEcosystems}
          ownerEmails={ownerEmails}
          telemetryVolume={telemetryVolume}
          ecosystemsPage={ecosystemsPage}
          onEcosystemsPageChange={setEcosystemsPage}
          loadingEcosystems={loadingEcosystems}
          onClose={() => setSelectedUserInfo(null)}
          onShowUserInfo={handleShowUserInfo}
          users={users}
        />
      ) : null}

      {pendingUserAction ? (
        <UserActionModal
          pendingUserAction={pendingUserAction}
          actionLoading={actionLoading}
          onCancel={() => setPendingUserAction(null)}
          onConfirm={handleConfirmUserAction}
        />
      ) : null}

      {pendingRoleChange ? (
        <RoleChangeModal
          pendingRoleChange={pendingRoleChange}
          actionLoading={actionLoading}
          onCancel={() => setPendingRoleChange(null)}
          onRoleSelectChange={(value) =>
            setPendingRoleChange((current) =>
              current ? { ...current, nextRole: value } : current,
            )
          }
          onConfirm={handleConfirmRoleChange}
        />
      ) : null}

      {roleChangeConfirmation ? (
        <RoleChangeConfirmModal
          roleChangeConfirmation={roleChangeConfirmation}
          actionLoading={actionLoading}
          onCancel={() => setRoleChangeConfirmation(null)}
          onConfirm={handleExecuteRoleChange}
        />
      ) : null}

      {notificationModal && !notificationConfirm ? (
        <NotificationFormModal
          notificationModal={notificationModal}
          notificationForm={notificationForm}
          onFormChange={setNotificationForm}
          onClose={() => setNotificationModal(null)}
          onContinue={handleNotificationContinue}
        />
      ) : null}

      {notificationModal && notificationConfirm ? (
        <NotificationConfirmModal
          notificationModal={notificationModal}
          notificationForm={notificationForm}
          notificationSending={notificationSending}
          onBack={() => setNotificationConfirm(false)}
          onSend={handleNotificationSend}
        />
      ) : null}
    </div>
  )
}
