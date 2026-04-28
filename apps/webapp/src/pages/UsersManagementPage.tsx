import { useMemo, useState } from 'react'
import { RefreshCcw, Search, Users } from 'lucide-react'
import { useUsersController } from '../controllers/useUsersController'

const USER_ROLES = ['ALL', 'USER', 'AUDITOR', 'ADMIN'] as const
const USER_STATUSES = ['ALL', 'ACTIVE', 'PENDING', 'PASSBLOCK'] as const

export default function UsersManagementPage() {
  const { users, isLoading, error, refreshUsers } = useUsersController()
  const [roleFilter, setRoleFilter] = useState<(typeof USER_ROLES)[number]>('ALL')
  const [statusFilter, setStatusFilter] = useState<(typeof USER_STATUSES)[number]>('ALL')
  const [searchTerm, setSearchTerm] = useState('')

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

  return (
    <div className="min-h-screen bg-slate-50 p-6">
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
          <div className="mb-6 grid gap-4 md:grid-cols-3">
            <label className="block text-sm font-medium text-slate-700">
              Buscar usuarios
              <div className="mt-2 flex items-center rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Buscar por nombre o correo"
                  className="ml-2 w-full border-none bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                />
              </div>
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Filtrar por rol
              <select
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value as typeof USER_ROLES[number])}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm"
              >
                {USER_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Filtrar por estado
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as typeof USER_STATUSES[number])}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm"
              >
                {USER_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
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
                    <th className="px-6 py-4">Nombre</th>
                    <th className="px-6 py-4">Correo</th>
                    <th className="px-6 py-4">Rol</th>
                    <th className="px-6 py-4">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 font-medium text-slate-900">{user.name}</td>
                      <td className="px-6 py-4">{user.email}</td>
                      <td className="px-6 py-4">{user.role}</td>
                      <td className="px-6 py-4">{user.status}</td>
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
