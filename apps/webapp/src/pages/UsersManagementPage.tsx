import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, RefreshCcw, Search, Users } from 'lucide-react'
import { useUsersController } from '../controllers/useUsersController'
import { useAuth } from '../context/auth-context'

const USER_ROLES = ['ALL', 'USER', 'AUDITOR', 'ADMIN'] as const
const USER_STATUSES = ['ALL', 'ACTIVE', 'PENDING', 'PASSBLOCK'] as const
const PAGE_SIZES = [10, 25, 50, 100] as const

export default function UsersManagementPage() {
  const { users, isLoading, error, refreshUsers } = useUsersController()
  const { authClaims } = useAuth()
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

  const handleShowUserInfo = (user: { email: string; role: string; status: string }) => {
    window.alert(`Usuario: ${user.email}\nRol: ${user.role}\nEstado: ${user.status}`)
  }

  const handleRoleChange = (user: { email: string; role: string }) => {
    const nextRole = window.prompt(`Nuevo rol para ${user.email} (USER/AUDITOR/ADMIN):`, user.role)

    if (!nextRole) {
      return
    }

    if (!['USER', 'AUDITOR', 'ADMIN'].includes(nextRole.toUpperCase())) {
      window.alert('Rol inválido. Usa USER, AUDITOR o ADMIN.')
      return
    }

    window.alert(`Cambio de rol solicitado para ${user.email}: ${nextRole.toUpperCase()}`)
  }

  const handleUserAction = (user: { email: string }, action: 'approve' | 'revoke') => {
    window.alert(`${action === 'approve' ? 'Aprobar' : 'Revocar'} usuario ${user.email}`)
  }

  const filteredUsers = useMemo(
    () =>
      users.filter((user) => {
        const matchesRole = roleFilter === 'ALL' || user.role === roleFilter
        const matchesStatus = statusFilter === 'ALL' || user.status === statusFilter
        const matchesSearch =
          user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.name.toLowerCase().includes(searchTerm.toLowerCase())

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
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-violet-600" />
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Gestión de usuarios</h1>
              <p className="text-slate-600 mt-2">
                Administra el acceso y el estado de los usuarios que interactúan con los ecosistemas.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={refreshUsers}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <RefreshCcw className="h-4 w-4" />
            Refrescar
          </button>
        </div>

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

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 grid gap-3 md:grid-cols-3">
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
              <select
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value as typeof USER_ROLES[number])}
                className="w-full rounded-3xl border border-border bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-accent"
              >
                {USER_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role === 'ALL' ? 'Todos' : role}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Estado</span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as typeof USER_STATUSES[number])}
                className="w-full rounded-3xl border border-border bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-accent"
              >
                {USER_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status === 'ALL' ? 'Todos' : status}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Resultados</span>
              <div className="flex gap-1">
                {PAGE_SIZES.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => handlePageSizeChange(size)}
                    className={`rounded-lg px-2 py-1 text-xs font-medium transition ${
                      pageSize === size
                        ? 'bg-slate-800 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </label>
          </div>

          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
            <span>
              Mostrando {paginatedUsers.length} de {filteredUsers.length} usuario
              {filteredUsers.length === 1 ? '' : 's'}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handlePageChange(currentPage - 1)}
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
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="rounded-lg p-1 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

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
          ) : filteredUsers.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-slate-700">
              <p className="font-medium text-slate-900">No se encontraron usuarios para los filtros actuales.</p>
            </div>
          ) : (
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
                          className={`text-xs font-medium px-2 py-1 rounded-full ${
                            user.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-700'
                              : user.status === 'PENDING'
                                ? 'bg-amber-100 text-amber-700'
                                : user.status === 'PASSBLOCK'
                                  ? 'bg-slate-100 text-slate-700'
                                  : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          {canViewUserInfo(user) && (
                            <button
                              type="button"
                              onClick={() => handleShowUserInfo(user)}
                              className="text-xs px-2 py-1 rounded hover:bg-sky-100 hover:text-sky-700 transition-colors text-sky-600"
                            >
                              Ver información
                            </button>
                          )}
                          {canChangeUserRole(user) && (
                            <button
                              type="button"
                              onClick={() => handleRoleChange(user)}
                              className="text-xs px-2 py-1 rounded hover:bg-slate-100 hover:text-slate-700 transition-colors text-slate-600"
                            >
                              Cambiar rol
                            </button>
                          )}
                          {user.status === 'PENDING' && (
                            <button
                              type="button"
                              onClick={() => handleUserAction(user, 'approve')}
                              className="text-xs px-2 py-1 rounded hover:bg-emerald-100 hover:text-emerald-700 transition-colors text-emerald-600"
                            >
                              Aprobar
                            </button>
                          )}
                          {canRevokeUser(user) && (
                            <button
                              type="button"
                              onClick={() => handleUserAction(user, 'revoke')}
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
          )}
        </div>
      </div>
    </div>
  )
}
