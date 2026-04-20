import { BellRing, House, MapPin, Plus, ShieldAlert, Users, Zap } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import auroraLogo from '../assets/aurora-logo.png'
import gsyaLogo from '../assets/gsya_logo.png'
import uclmLogo from '../assets/uclm_logo.png'
import ueLogo from '../assets/UE.png'
import mHaciendaLogo from '../assets/MHacienda.png'
import federLogo from '../assets/FEDER.png'
import clmLogo from '../assets/CLM.png'
import { apiClient } from '../api/axios'
import AccessMap from '../components/dashboard/AccessMap'
import { ACCESS_MAP_ECOSYSTEMS_MOCK } from '../components/dashboard/access-map.data'
import { SECURITY_ALERTS_MOCK } from '../components/dashboard/dashboard.data'
import { USERS_MOCK } from '../components/dashboard/users.data'
import { useAuth } from '../context/auth-context'

type DashboardMetric = {
  label: string
  value: string
  icon: typeof House
  emphasizeValue?: boolean
  valueClassName?: string
}

type QuickNavItem = {
  id: string
  label: string
}

type UserAction = 'approve' | 'revoke'
type AdminRole = 'ADMIN' | 'GLOBAL_ADMIN'
type UserRole = 'USER' | 'AUDITOR' | 'ADMIN' | 'GLOBAL_ADMIN'
type UserStatus = 'ACTIVE' | 'PENDING' | 'PASSBLOCK' | 'REVOKED'

type DashboardUser = {
  id: string
  email: string
  role: UserRole
  status: UserStatus
  did?: string | null
}

type ApiUser = {
  id: string
  email: string
  role: UserRole
  status: UserStatus
  did?: string | null
}

type UserRoleFilter = 'ALL' | 'USER' | 'AUDITOR' | 'ADMIN'
type UserStatusFilter = 'ALL' | 'ACTIVE' | 'PENDING' | 'PASSBLOCK'

const MAX_VISIBLE_USER_ROWS = 15
const USER_TABLE_HEADER_HEIGHT_PX = 48
const USER_TABLE_ROW_HEIGHT_PX = 48
const MAX_SEARCH_TERM_LENGTH = 120
const ALLOWED_USER_ROLE_FILTERS: UserRoleFilter[] = ['ALL', 'USER', 'AUDITOR', 'ADMIN']
const ALLOWED_USER_STATUS_FILTERS: UserStatusFilter[] = ['ALL', 'ACTIVE', 'PENDING', 'PASSBLOCK']

const ROLE_LABELS: Record<UserRole, string> = {
  USER: 'USER',
  AUDITOR: 'AUDITOR',
  ADMIN: 'ADMIN',
  GLOBAL_ADMIN: 'GLOBAL_ADMIN',
}

const USER_STATUS_LABELS: Record<UserStatus, string> = {
  ACTIVE: 'Activo',
  PENDING: 'Pendiente',
  PASSBLOCK: 'Bloqueado',
  REVOKED: 'Revocado',
}

const mapMockUserToDashboardUser = (user: (typeof USERS_MOCK)[number]): DashboardUser => ({
  id: user.id,
  email: user.email,
  role: user.role,
  status: user.status,
})

const normalizeApiUser = (user: ApiUser): DashboardUser => ({
  id: user.id,
  email: user.email,
  role: user.role,
  status: user.status,
  did: user.did,
})

const isVisibleUser = (user: Pick<DashboardUser, 'status'>) => user.status !== 'REVOKED'

const getAssignableRoles = (adminRole: AdminRole) =>
  adminRole === 'GLOBAL_ADMIN' ? (['USER', 'AUDITOR', 'ADMIN'] as const) : (['USER', 'AUDITOR'] as const)

export default function Dashboard() {
  const { authClaims } = useAuth()
  const role = (authClaims?.role ?? 'USER').toUpperCase()
  const isAdmin = role === 'ADMIN'
  const isGlobalAdmin = role === 'GLOBAL_ADMIN'
  const authenticatedUserId = authClaims?.sub ?? null
  const [dashboardUsers, setDashboardUsers] = useState<DashboardUser[]>(() =>
    USERS_MOCK.map(mapMockUserToDashboardUser).filter(isVisibleUser),
  )
  const [adminError, setAdminError] = useState<string | null>(null)
  const [pendingUserAction, setPendingUserAction] = useState<{
    userId: string
    userEmail: string
    action: UserAction
  } | null>(null)
  const [pendingRoleChange, setPendingRoleChange] = useState<{
    userId: string
    userEmail: string
    currentRole: UserRole
    nextRole: UserRole
  } | null>(null)
  const [pendingUserInfo, setPendingUserInfo] = useState<DashboardUser | null>(null)
  const [userSearchTerm, setUserSearchTerm] = useState('')
  const [userRoleFilter, setUserRoleFilter] = useState<UserRoleFilter>('ALL')
  const [userStatusFilter, setUserStatusFilter] = useState<UserStatusFilter>('ALL')

  const accessibleEcosystems = useMemo(() => {
    const canViewAll = role === 'AUDITOR' || role === 'ADMIN' || role === 'GLOBAL_ADMIN'

    if (canViewAll) {
      return ACCESS_MAP_ECOSYSTEMS_MOCK
    }

    return ACCESS_MAP_ECOSYSTEMS_MOCK.filter(
      (ecosystem) => ecosystem.ownerId === authClaims?.sub || ecosystem.isShared,
    )
  }, [authClaims?.sub, role])

  const instantiatedEcosystemsCount = useMemo(() => {
    return accessibleEcosystems.length
  }, [accessibleEcosystems])

  const securityAlertsCount = useMemo(() => {
    const canViewAll = role === 'AUDITOR' || role === 'ADMIN' || role === 'GLOBAL_ADMIN'

    if (canViewAll) {
      return SECURITY_ALERTS_MOCK.length
    }

    const accessibleEcosystemIds = new Set(accessibleEcosystems.map((ecosystem) => ecosystem.id))

    return SECURITY_ALERTS_MOCK.filter((alert) => accessibleEcosystemIds.has(alert.ecosystemId)).length
  }, [accessibleEcosystems, role])

  const metrics: DashboardMetric[] = useMemo(
    () => [
      {
        label: 'Ecosistemas instanciados',
        value: String(instantiatedEcosystemsCount),
        icon: House,
      },
      {
        label: 'Alertas de Seguridad',
        value: String(securityAlertsCount),
        icon: BellRing,
        emphasizeValue: true,
        valueClassName: 'text-rose-600',
      },
      {
        label: 'Threat Intelligence',
        value: 'OFFLINE',
        icon: ShieldAlert,
        emphasizeValue: true,
        valueClassName: 'text-rose-600',
      },
    ],
    [instantiatedEcosystemsCount, securityAlertsCount],
  )

  // USER Dashboard: Mis ecosistemas + Compartidos conmigo
  const userOwnedEcosystems = useMemo(() => {
    return ACCESS_MAP_ECOSYSTEMS_MOCK.filter((ecosystem) => ecosystem.ownerId === authClaims?.sub)
  }, [authClaims?.sub])

  const userSharedEcosystems = useMemo(() => {
    return ACCESS_MAP_ECOSYSTEMS_MOCK.filter((ecosystem) => ecosystem.isShared && ecosystem.ownerId !== authClaims?.sub)
  }, [authClaims?.sub])

  // AUDITOR Dashboard: Todos los ecosistemas
  const allEcosystems = useMemo(() => {
    return ACCESS_MAP_ECOSYSTEMS_MOCK
  }, [])

  // ADMIN Dashboard: Usuarios
  const users = useMemo(() => {
    return dashboardUsers
      .filter(isVisibleUser)
      .filter((user) => user.id !== authenticatedUserId)
      .filter((user) => (isAdmin ? user.role !== 'GLOBAL_ADMIN' : true))
  }, [authenticatedUserId, dashboardUsers, isAdmin])

  const normalizedRoleFilter: UserRoleFilter = ALLOWED_USER_ROLE_FILTERS.includes(userRoleFilter)
    ? userRoleFilter
    : 'ALL'
  const normalizedStatusFilter: UserStatusFilter = ALLOWED_USER_STATUS_FILTERS.includes(userStatusFilter)
    ? userStatusFilter
    : 'ALL'
  const normalizedSearchTerm = userSearchTerm.trim().slice(0, MAX_SEARCH_TERM_LENGTH).toLowerCase()

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        normalizedSearchTerm.length === 0 ||
        user.email.toLowerCase().includes(normalizedSearchTerm) ||
        user.id.toLowerCase().includes(normalizedSearchTerm) ||
        (user.did ?? '').toLowerCase().includes(normalizedSearchTerm)

      const matchesRole = normalizedRoleFilter === 'ALL' || user.role === normalizedRoleFilter
      const matchesStatus = normalizedStatusFilter === 'ALL' || user.status === normalizedStatusFilter

      return matchesSearch && matchesRole && matchesStatus
    })
  }, [normalizedRoleFilter, normalizedSearchTerm, normalizedStatusFilter, users])

  const userStats = useMemo(
    () => ({
      active: users.filter((user) => user.status === 'ACTIVE').length,
      pending: users.filter((user) => user.status === 'PENDING').length,
      blocked: users.filter((user) => user.status === 'PASSBLOCK').length,
    }),
    [users],
  )

  const canManageAdministratorUser = (user: DashboardUser) => isGlobalAdmin || user.role !== 'ADMIN'
  const canViewUserInfo = (user: DashboardUser) => user.status === 'ACTIVE' || user.status === 'PENDING'
  const canRevokeUser = (user: DashboardUser) => user.status !== 'REVOKED' && canManageAdministratorUser(user)
  const canChangeUserRole = (user: DashboardUser) => user.status === 'ACTIVE' && canManageAdministratorUser(user)

  const resolveManagedUser = (userId: string) => users.find((user) => user.id === userId) ?? null

  const canChangeRoles = role === 'ADMIN' || role === 'GLOBAL_ADMIN'
  const assignableRoles = canChangeRoles ? getAssignableRoles(role as AdminRole) : []
  const canManageUsers = canChangeRoles
  const userTableMaxHeight = USER_TABLE_HEADER_HEIGHT_PX + MAX_VISIBLE_USER_ROWS * USER_TABLE_ROW_HEIGHT_PX

  const quickNavItems = useMemo<QuickNavItem[]>(() => {
    if (role === 'USER') {
      return [
        { id: 'mis-ecosistemas', label: 'Mis ecosistemas' },
        { id: 'compartidos-conmigo', label: 'Compartidos conmigo' },
      ]
    }

    if (role === 'AUDITOR') {
      return [{ id: 'todos-ecosistemas', label: 'Todos los ecosistemas' }]
    }

    if (role === 'ADMIN' || role === 'GLOBAL_ADMIN') {
      return [
        { id: 'gestion-usuarios', label: 'Gestión de usuarios' },
        { id: 'ecosistemas-admin', label: 'Ecosistemas instanciados' },
      ]
    }

    return []
  }, [role])

  useEffect(() => {
    if (!canManageUsers) {
      return
    }

    let isMounted = true

    const loadUsers = async () => {
      try {
        const response = await apiClient.get<ApiUser[]>('/users')

        if (!isMounted) {
          return
        }

        setDashboardUsers(response.data.map(normalizeApiUser).filter(isVisibleUser))
      } catch {
        if (!isMounted) {
          return
        }

        setDashboardUsers(USERS_MOCK.map(mapMockUserToDashboardUser).filter(isVisibleUser))
      }
    }

    void loadUsers()

    return () => {
      isMounted = false
    }
  }, [canManageUsers])

  const handleOpenUserAction = (userId: string, userEmail: string, action: UserAction) => {
    const targetUser = resolveManagedUser(userId)

    if (userId === authenticatedUserId) {
      setAdminError('No puedes gestionar tu propio usuario desde esta vista.')
      return
    }

    if (!targetUser) {
      setAdminError('Usuario objetivo no permitido o no disponible.')
      return
    }

    if (action === 'approve' && targetUser.status !== 'PENDING') {
      setAdminError('Solo puedes aprobar usuarios pendientes.')
      return
    }

    if (action === 'revoke' && !canRevokeUser(targetUser)) {
      setAdminError('No puedes revocar cuentas de administradores.')
      return
    }

    setAdminError(null)
    setPendingUserAction({ userId, userEmail, action })
  }

  const handleOpenRoleChange = (userId: string, userEmail: string, currentRole: UserRole) => {
    if (!canChangeRoles) {
      return
    }

    if (userId === authenticatedUserId) {
      setAdminError('No puedes gestionar tu propio usuario desde esta vista.')
      return
    }

    const targetUser = resolveManagedUser(userId)

    if (!targetUser) {
      setAdminError('Usuario objetivo no permitido o no disponible.')
      return
    }

    if (isAdmin && currentRole === 'ADMIN') {
      setAdminError('No puedes modificar el rol de usuarios administradores.')
      return
    }

    if (!canChangeUserRole(targetUser)) {
      setAdminError('No puedes modificar el rol de este usuario.')
      return
    }

    setAdminError(null)
    setPendingRoleChange({
      userId,
      userEmail,
      currentRole,
      nextRole: assignableRoles[0],
    })
  }

  const handleOpenUserInfo = (user: DashboardUser) => {
    if (user.id === authenticatedUserId) {
      setAdminError('No puedes gestionar tu propio usuario desde esta vista.')
      return
    }

    const targetUser = resolveManagedUser(user.id)

    if (!targetUser || !canViewUserInfo(targetUser)) {
      setAdminError('La información de este usuario no está disponible.')
      return
    }

    setAdminError(null)
    setPendingUserInfo(targetUser)
  }

  const handleConfirmUserAction = async () => {
    if (!pendingUserAction) {
      return
    }

    if (pendingUserAction.userId === authenticatedUserId) {
      setPendingUserAction(null)
      setAdminError('No puedes gestionar tu propio usuario desde esta vista.')
      return
    }

    const targetUser = resolveManagedUser(pendingUserAction.userId)

    if (!targetUser) {
      setPendingUserAction(null)
      setAdminError('Usuario objetivo no permitido o no disponible.')
      return
    }

    if (pendingUserAction.action === 'approve' && targetUser.status !== 'PENDING') {
      setPendingUserAction(null)
      setAdminError('Solo puedes aprobar usuarios pendientes.')
      return
    }

    if (pendingUserAction.action === 'revoke' && !canRevokeUser(targetUser)) {
      setPendingUserAction(null)
      setAdminError('No puedes revocar cuentas de administradores.')
      return
    }

    try {
      setAdminError(null)

      const updatedUser =
        pendingUserAction.action === 'approve'
          ? await apiClient.patch<ApiUser>(`/users/${pendingUserAction.userId}/approve`, {
              adminDid: authClaims?.did,
            })
          : await apiClient.delete<ApiUser>(`/users/${pendingUserAction.userId}`)

      setDashboardUsers((currentUsers) =>
        currentUsers.map((user) => (user.id === updatedUser.data.id ? normalizeApiUser(updatedUser.data) : user)),
      )
      setPendingUserAction(null)
    } catch {
      setAdminError('No se pudo completar la acción sobre el usuario.')
    }
  }

  const handleConfirmRoleChange = async () => {
    if (!pendingRoleChange) {
      return
    }

    if (pendingRoleChange.userId === authenticatedUserId) {
      setPendingRoleChange(null)
      setAdminError('No puedes gestionar tu propio usuario desde esta vista.')
      return
    }

    const targetUser = resolveManagedUser(pendingRoleChange.userId)

    if (!targetUser) {
      setPendingRoleChange(null)
      setAdminError('Usuario objetivo no permitido o no disponible.')
      return
    }

    if (!canChangeUserRole(targetUser)) {
      setPendingRoleChange(null)
      setAdminError('No puedes modificar el rol de este usuario.')
      return
    }

    if (!assignableRoles.includes(pendingRoleChange.nextRole)) {
      setPendingRoleChange(null)
      setAdminError('El rol seleccionado no está permitido para tu perfil.')
      return
    }

    try {
      setAdminError(null)

      const updatedUser = await apiClient.patch<ApiUser>(`/users/${pendingRoleChange.userId}/role`, {
        role: pendingRoleChange.nextRole,
      })

      setDashboardUsers((currentUsers) =>
        currentUsers.map((user) => (user.id === updatedUser.data.id ? normalizeApiUser(updatedUser.data) : user)),
      )
      setPendingRoleChange(null)
    } catch {
      setAdminError('No se pudo actualizar el rol del usuario.')
    }
  }

  const renderUserDashboard = () => (
    <>
      <article id="mis-ecosistemas" className="scroll-mt-28 rounded-[1.75rem] border border-border bg-white p-6 shadow-aurora">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-primary">
            <House className="size-5 text-accent" />
            <h2 className="font-heading text-xl font-semibold">Mis ecosistemas instanciados</h2>
          </div>
          <button className="flex size-10 items-center justify-center rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors">
            <Plus className="size-5" />
          </button>
        </div>
        <p className="mt-3 text-xs text-muted">Ecosistemas que has creado y administras</p>

        <div className="mt-6 space-y-3">
          {userOwnedEcosystems.length > 0 ? (
            userOwnedEcosystems.map((ecosystem) => (
              <div
                key={ecosystem.id}
                className="flex items-center justify-between rounded-lg border border-border/50 bg-surface/30 p-4 hover:border-border hover:bg-surface/50 transition-colors cursor-pointer"
              >
                <div>
                  <p className="font-medium text-primary">{ecosystem.name}</p>
                  <p className="text-xs text-muted mt-1">{ecosystem.devices.length} dispositivos</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-accent/10 text-accent">
                    {ecosystem.isShared ? 'Compartido' : 'Privado'}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-surface/20 p-6 text-center">
              <p className="text-sm text-muted">No tienes ecosistemas creados aún</p>
              <p className="text-xs text-muted/70 mt-1">Usa el botón + para crear tu primer ecosistema</p>
            </div>
          )}
        </div>
      </article>

      <article id="compartidos-conmigo" className="scroll-mt-28 rounded-[1.75rem] border border-border bg-white p-6 shadow-aurora">
        <div className="flex items-center gap-3 text-primary">
          <Zap className="size-5 text-accent" />
          <h2 className="font-heading text-xl font-semibold">Compartidos conmigo</h2>
        </div>
        <p className="mt-3 text-xs text-muted">Ecosistemas que otros usuarios han compartido contigo</p>

        <div className="mt-6 space-y-3">
          {userSharedEcosystems.length > 0 ? (
            userSharedEcosystems.map((ecosystem) => (
              <div
                key={ecosystem.id}
                className="flex items-center justify-between rounded-lg border border-border/50 bg-surface/30 p-4 hover:border-border hover:bg-surface/50 transition-colors cursor-pointer"
              >
                <div>
                  <p className="font-medium text-primary">{ecosystem.name}</p>
                  <p className="text-xs text-muted mt-1">
                    {ecosystem.devices.length} dispositivos • Compartido por otro usuario
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-teal-100 text-teal-700">
                    Compartido
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-surface/20 p-6 text-center">
              <p className="text-sm text-muted">No tienes ecosistemas compartidos</p>
            </div>
          )}
        </div>
      </article>
    </>
  )

  const renderAuditorDashboard = () => (
    <article id="todos-ecosistemas" className="scroll-mt-28 rounded-[1.75rem] border border-border bg-white p-6 shadow-aurora">
      <div className="flex items-center gap-3 text-primary">
        <Zap className="size-5 text-accent" />
        <h2 className="font-heading text-xl font-semibold">Todos los ecosistemas</h2>
      </div>
      <p className="mt-3 text-xs text-muted">Vista completa de todos los ecosistemas instanciados en AURORA</p>

      <div className="mt-6 space-y-3">
        {allEcosystems.map((ecosystem) => (
          <div
            key={ecosystem.id}
            className="flex items-center justify-between rounded-lg border border-border/50 bg-surface/30 p-4 hover:border-border hover:bg-surface/50 transition-colors cursor-pointer group"
          >
            <div>
              <p className="font-medium text-primary group-hover:text-accent transition-colors">{ecosystem.name}</p>
              <p className="text-xs text-muted mt-1">
                {ecosystem.devices.length} dispositivos • Propietario: {USERS_MOCK.find((u) => u.id === ecosystem.ownerId)?.name}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button className="text-xs font-medium px-3 py-1.5 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors">
                Ver detalles
              </button>
            </div>
          </div>
        ))}
      </div>
    </article>
  )

  const renderAdminDashboard = () => (
    <>
      <article id="gestion-usuarios" className="scroll-mt-28 rounded-[1.75rem] border border-border bg-white p-6 shadow-aurora">
        <div className="flex items-center gap-3 text-primary">
          <Users className="size-5 text-accent" />
          <h2 className="font-heading text-xl font-semibold">Gestión de usuarios</h2>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-emerald-700">Usuarios activos</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-800">{userStats.active}</p>
          </div>
          <div className="rounded-xl border border-amber-100 bg-amber-50/60 px-4 py-3">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-amber-700">Usuarios pendientes</p>
            <p className="mt-1 text-2xl font-semibold text-amber-800">{userStats.pending}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-slate-700">Usuarios bloqueados</p>
            <p className="mt-1 text-2xl font-semibold text-slate-800">{userStats.blocked}</p>
          </div>
        </div>
        {adminError ? <p className="mt-3 text-sm text-rose-600">{adminError}</p> : null}

        <div className="mt-6 overflow-x-auto">
          <div className="mb-4 grid gap-3 md:grid-cols-3">
            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Buscar</span>
              <input
                type="text"
                value={userSearchTerm}
                onChange={(event) => setUserSearchTerm(event.target.value.slice(0, MAX_SEARCH_TERM_LENGTH))}
                placeholder="Email, ID o DID"
                className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-primary outline-none transition-colors focus:border-accent"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Rol</span>
              <select
                value={userRoleFilter}
                onChange={(event) => {
                  const nextValue = event.target.value as UserRoleFilter
                  setUserRoleFilter(ALLOWED_USER_ROLE_FILTERS.includes(nextValue) ? nextValue : 'ALL')
                }}
                className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-primary outline-none transition-colors focus:border-accent"
              >
                <option value="ALL">Todos</option>
                <option value="USER">USER</option>
                <option value="AUDITOR">AUDITOR</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Estado</span>
              <select
                value={userStatusFilter}
                onChange={(event) => {
                  const nextValue = event.target.value as UserStatusFilter
                  setUserStatusFilter(ALLOWED_USER_STATUS_FILTERS.includes(nextValue) ? nextValue : 'ALL')
                }}
                className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-primary outline-none transition-colors focus:border-accent"
              >
                <option value="ALL">Todos</option>
                <option value="ACTIVE">Activo</option>
                <option value="PENDING">Pendiente</option>
                <option value="PASSBLOCK">Bloqueado</option>
              </select>
            </label>
          </div>

          <div className="mb-3 text-xs text-muted">
            Mostrando {filteredUsers.length} usuario{filteredUsers.length === 1 ? '' : 's'}
          </div>

          <div className="overflow-auto rounded-xl border border-border/70" style={{ maxHeight: `${userTableMaxHeight}px` }}>
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-white">
                <tr className="border-b border-border">
                  <th className="px-3 py-3 text-left font-semibold text-muted">Email</th>
                  <th className="px-3 py-3 text-left font-semibold text-muted">Rol</th>
                  <th className="px-3 py-3 text-left font-semibold text-muted">Estado</th>
                  <th className="px-3 py-3 text-left font-semibold text-muted">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredUsers.map((user) => (
                <tr key={user.id} className="h-12 hover:bg-surface/30 transition-colors">
                  <td className="px-3 py-0 text-muted align-middle">{user.email}</td>
                  <td className="px-3 py-0 align-middle">
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary/10 text-primary">
                      {user.role}
                    </span>
                  </td>
                  <td className="px-3 py-0 align-middle">
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
                      {USER_STATUS_LABELS[user.status]}
                    </span>
                  </td>
                  <td className="px-3 py-0 align-middle">
                    <div className="flex gap-2">
                      {canViewUserInfo(user) && (
                        <button
                          type="button"
                          onClick={() => handleOpenUserInfo(user)}
                          className="text-xs px-2 py-1 rounded hover:bg-sky-100 hover:text-sky-700 transition-colors text-sky-600"
                        >
                          Ver información
                        </button>
                      )}
                      {canChangeUserRole(user) && (
                        <button
                          type="button"
                          onClick={() => handleOpenRoleChange(user.id, user.email, user.role as UserRole)}
                          className="text-xs px-2 py-1 rounded hover:bg-slate-100 hover:text-slate-700 transition-colors text-slate-600"
                        >
                          Cambiar rol
                        </button>
                      )}
                      {user.status === 'PENDING' && (
                        <button
                          type="button"
                          onClick={() => handleOpenUserAction(user.id, user.email, 'approve')}
                          className="text-xs px-2 py-1 rounded hover:bg-emerald-100 hover:text-emerald-700 transition-colors text-emerald-600"
                        >
                          Aprobar
                        </button>
                      )}
                      {canRevokeUser(user) && (
                        <button
                          type="button"
                          onClick={() => handleOpenUserAction(user.id, user.email, 'revoke')}
                          className="text-xs px-2 py-1 rounded hover:bg-rose-100 hover:text-rose-700 transition-colors text-rose-600"
                        >
                          Revocar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                ))}
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-sm text-muted">
                      No hay usuarios que coincidan con los filtros.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </article>

      {pendingUserAction ? (
        <div className="fixed inset-0 z-[90] h-dvh w-screen flex items-center justify-center bg-black/25 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[1.5rem] border border-border bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                <ShieldAlert className="size-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-primary">Confirmación requerida</h3>
                <p className="text-sm leading-6 text-muted">
                  {pendingUserAction.action === 'approve'
                    ? `¿Quieres aprobar a ${pendingUserAction.userEmail}?`
                    : `¿Quieres revocar a ${pendingUserAction.userEmail}?`}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setPendingUserAction(null)}
                className="inline-flex items-center justify-center rounded-2xl border border-border bg-white px-5 py-3 text-sm font-semibold text-primary transition-colors hover:bg-surface/50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmUserAction}
                className={`inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold text-white transition-colors ${
                  pendingUserAction.action === 'approve'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {pendingUserAction.action === 'approve' ? 'Confirmar aprobación' : 'Confirmar revocación'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {pendingUserInfo ? (
        <div className="fixed inset-0 z-[90] h-dvh w-screen flex items-center justify-center bg-black/25 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[1.5rem] border border-border bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
                <Users className="size-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-primary">Información de usuario</h3>
                <p className="text-sm leading-6 text-muted">Detalle de la cuenta seleccionada.</p>
              </div>
            </div>

            <div className="mt-6 space-y-3 rounded-2xl border border-border bg-surface/30 p-4 text-sm text-primary">
              <p>
                <span className="font-semibold">Email:</span> {pendingUserInfo.email}
              </p>
              <p>
                <span className="font-semibold">Rol:</span> {ROLE_LABELS[pendingUserInfo.role]}
              </p>
              <p>
                <span className="font-semibold">Estado:</span> {USER_STATUS_LABELS[pendingUserInfo.status]}
              </p>
              <p>
                <span className="font-semibold">DID:</span> {pendingUserInfo.did?.trim() ? pendingUserInfo.did : 'No disponible'}
              </p>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setPendingUserInfo(null)}
                className="inline-flex items-center justify-center rounded-2xl border border-border bg-white px-5 py-3 text-sm font-semibold text-primary transition-colors hover:bg-surface/50"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {pendingRoleChange ? (
        <div className="fixed inset-0 z-[90] h-dvh w-screen flex items-center justify-center bg-black/25 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[1.5rem] border border-border bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                <Users className="size-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-primary">Cambiar rol de usuario</h3>
                <p className="text-sm leading-6 text-muted">
                  Selecciona el nuevo rol para {pendingRoleChange.userEmail}. El rol actual es {ROLE_LABELS[pendingRoleChange.currentRole]}.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-primary">Nuevo rol</span>
                <select
                  value={pendingRoleChange.nextRole}
                  onChange={(event) =>
                    setPendingRoleChange((current) =>
                      current
                        ? {
                            ...current,
                            nextRole: event.target.value as UserRole,
                          }
                        : current,
                    )
                  }
                  className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-primary outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20"
                >
                  {assignableRoles.map((assignableRole) => (
                    <option key={assignableRole} value={assignableRole}>
                      {ROLE_LABELS[assignableRole]}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setPendingRoleChange(null)}
                className="inline-flex items-center justify-center rounded-2xl border border-border bg-white px-5 py-3 text-sm font-semibold text-primary transition-colors hover:bg-surface/50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmRoleChange}
                className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
              >
                Confirmar cambio de rol
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <article id="ecosistemas-admin" className="scroll-mt-28 rounded-[1.75rem] border border-border bg-white p-6 shadow-aurora">
        <div className="flex items-center gap-3 text-primary">
          <House className="size-5 text-accent" />
          <h2 className="font-heading text-xl font-semibold">Ecosistemas instanciados</h2>
        </div>
        <p className="mt-3 text-xs text-muted">Lista general de ecosistemas (sin información de dispositivos)</p>

        <div className="mt-6 space-y-3">
          {ACCESS_MAP_ECOSYSTEMS_MOCK.map((ecosystem) => (
            <div
              key={ecosystem.id}
              className="flex items-center justify-between rounded-lg border border-border/50 bg-surface/30 p-4 hover:border-border hover:bg-surface/50 transition-colors"
            >
              <div>
                <p className="font-medium text-primary">{ecosystem.name}</p>
                <p className="text-xs text-muted mt-1">Propietario: {USERS_MOCK.find((u) => u.id === ecosystem.ownerId)?.name}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-accent/10 text-accent">
                  {ecosystem.isShared ? 'Compartido' : 'Privado'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </article>
    </>
  )

  return (
    <section className="space-y-8 px-10 py-8 sm:px-12 lg:px-16 xl:px-20">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-accent">
          Proyecto de Investigación SBPLY/24/180225/000074
        </p>
        <h1 className="font-heading text-4xl font-semibold text-primary">
          <b>A</b>dvanced and <b>U</b>nified <b>R</b>esearch <b>O</b>n cybersecurity <b>R</b>isk <b>A</b>nalysis
        </h1>
        <p className="max-w-4xl text-base leading-7 text-muted text-justify">
          AURORA desarrolla un framework sostenible de gestión de riesgos de ciberseguridad para
          hogares inteligentes, con foco en zonas rurales. Combina ontologías, inteligencia de
          enjambre, blockchain, machine learning y computación cuántica.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {metrics.map(({ label, value, icon: Icon, valueClassName, emphasizeValue }) => (
          <article key={label} className="rounded-[1.5rem] border border-border bg-surface p-5 shadow-aurora">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/5 text-primary">
                <Icon className="size-5" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">
                {label}
              </p>
            </div>
            <p
              className={`mt-4 font-semibold text-primary ${
                /^\d+$/.test(value) || emphasizeValue ? 'text-center text-5xl leading-none' : 'text-lg'
              } ${valueClassName ?? ''}`}
            >
              {value}
            </p>
          </article>
        ))}
      </div>

      <article className="rounded-[1.75rem] border border-border bg-white p-6 shadow-aurora">
        <div className="flex items-center gap-3 text-primary">
          <MapPin className="size-5 text-accent" />
          <h2 className="font-heading text-xl font-semibold">Geoespacio AURORA</h2>
        </div>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-muted">
          Vista geoespacial de ecosistemas instanciados en AURORA.
        </p>

        <AccessMap ecosystems={ACCESS_MAP_ECOSYSTEMS_MOCK} />
      </article>

      <article className="scroll-mt-28 rounded-[1.75rem] border border-border bg-white p-6 shadow-aurora">
        <div className="overflow-x-auto">
          <div className="flex min-w-max items-center justify-center gap-3">
            {quickNavItems.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="inline-flex whitespace-nowrap items-center rounded-2xl border border-border bg-surface px-4 py-2 text-sm font-medium text-primary transition-colors hover:border-accent hover:text-accent"
              >
                {item.label}
              </a>
            ))}
          </div>
        </div>
      </article>

      {role === 'USER' && renderUserDashboard()}
      {role === 'AUDITOR' && renderAuditorDashboard()}
      {(role === 'ADMIN' || role === 'GLOBAL_ADMIN') && renderAdminDashboard()}

      <footer className="rounded-[1.75rem] border border-border bg-white p-6 shadow-aurora">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">
          Entidades participantes
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-6">
          <img src={auroraLogo} alt="Logotipo de AURORA" className="h-12 w-auto object-contain" />
          <img src={gsyaLogo} alt="Logotipo de GSYA" className="h-12 w-auto object-contain" />
          <img src={uclmLogo} alt="Logotipo de UCLM" className="h-12 w-auto object-contain" />
          <img src={ueLogo} alt="Logotipo de la UE" className="h-12 w-auto object-contain" />
          <img src={mHaciendaLogo} alt="Logotipo de Ministerio de Hacienda" className="h-12 w-auto object-contain" />
          <img src={federLogo} alt="Logotipo de FEDER" className="h-12 w-auto object-contain" />
          <img src={clmLogo} alt="Logotipo de CLM" className="h-12 w-auto object-contain" />
        </div>
      </footer>
    </section>
  )
}