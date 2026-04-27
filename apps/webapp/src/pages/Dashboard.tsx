import { BellRing, Check, Copy, Eye, EyeOff, House, MapPin, Plus, ShieldAlert, Users, Zap } from 'lucide-react'
import axios from 'axios'
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
import EcosystemDevicesModal from '../components/dashboard/EcosystemDevicesModal'
import { type AccessMapDevice, type AccessMapEcosystem } from '../components/dashboard/access-map.data'
import { useAuth } from '../context/auth-context'

/**
 * Métrica visual del dashboard.
 */
type DashboardMetric = {
  /** Etiqueta de la métrica */
  label: string
  /** Valor de la métrica */
  value: string
  /** Icono a mostrar */
  icon: typeof House
  /** Indica si el valor debe resaltarse */
  emphasizeValue?: boolean
  /** Clase CSS adicional para el valor */
  valueClassName?: string
}

/**
 * Elemento de navegación rápida.
 */
type QuickNavItem = {
  /** ID único */
  id: string
  /** Etiqueta a mostrar */
  label: string
}

type UserAction = 'approve' | 'revoke'
type AdminRole = 'ADMIN' | 'GLOBAL_ADMIN'
type UserRole = 'USER' | 'AUDITOR' | 'ADMIN' | 'GLOBAL_ADMIN'
type UserStatus = 'ACTIVE' | 'PENDING' | 'PASSBLOCK' | 'REVOKED'
type CreateEcosystemStep = 'form' | 'confirm' | 'result'

type DashboardUser = {
  id: string
  email: string
  role: UserRole
  status: UserStatus
}

type ApiUser = {
  id: string
  email: string
  role: UserRole
  status: UserStatus
}

type ApiEcosystem = {
  id: string
  name: string
  ownerId: string
  did: string | null
  certificateFingerprint: string | null
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REVOKED'
  latitude: number | null
  longitude: number | null
  isOnline: boolean
  lastSeen: string | null
  createdAt: string
  updatedAt: string
}

type ApiDevice = {
  id: string
  name: string
  macAddress: string | null
  vendor: string | null
  ecosystemId: string
  createdAt: string
  updatedAt: string
}

type CreateEcosystemRequest = {
  name: string
  latitude?: number
  longitude?: number
}

type CreateEcosystemResponse = ApiEcosystem & {
  apiKey: string
}

type EcosystemApiKeyResponse = {
  ecosystemId: string
  apiKey: string
}

type UserOwnedEcosystem = AccessMapEcosystem & {
  apiKey: string | null
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

const normalizeApiUser = (user: ApiUser): DashboardUser => ({
  id: user.id,
  email: user.email,
  role: user.role,
  status: user.status,
})

const isVisibleUser = (user: Pick<DashboardUser, 'status'>) => user.status !== 'REVOKED'

const getAssignableRoles = (adminRole: AdminRole) =>
  adminRole === 'GLOBAL_ADMIN' ? (['USER', 'AUDITOR', 'ADMIN'] as const) : (['USER', 'AUDITOR'] as const)

const maskApiKey = (apiKey: string) => `${apiKey.slice(0, 8)}••••••••${apiKey.slice(-6)}`

const mapApiEcosystemToUserOwned = (ecosystem: ApiEcosystem, devices: ApiDevice[] = []): UserOwnedEcosystem => ({
  id: ecosystem.id,
  name: ecosystem.name,
  ownerId: ecosystem.ownerId,
  lat: ecosystem.latitude,
  lng: ecosystem.longitude,
  isShared: false,
  devices,
  apiKey: null,
})

const mapApiEcosystemToAccessMap = (ecosystem: ApiEcosystem, devices: ApiDevice[] = []): AccessMapEcosystem => ({
  id: ecosystem.id,
  name: ecosystem.name,
  ownerId: ecosystem.ownerId,
  lat: ecosystem.latitude,
  lng: ecosystem.longitude,
  isShared: false,
  devices,
})

const loadDevicesForEcosystem = async (ecosystemId: string): Promise<ApiDevice[]> => {
  try {
    const response = await apiClient.get<ApiDevice[]>(`/ecosystems/${ecosystemId}/devices`)
    return response.data
  } catch {
    return []
  }
}

const loadDevicesForEcosystems = async (ecosystems: ApiEcosystem[]) => {
  const results = await Promise.allSettled(
    ecosystems.map((ecosystem) => loadDevicesForEcosystem(ecosystem.id)),
  )

  return ecosystems.reduce<Record<string, ApiDevice[]>>((accumulator, ecosystem, index) => {
    const result = results[index]

    if (result.status === 'fulfilled') {
      accumulator[ecosystem.id] = result.value
    } else {
      accumulator[ecosystem.id] = []
    }

    return accumulator
  }, {})
}

const getEcosystemErrorMessage = (error: unknown, fallbackMessage: string) => {
  if (!axios.isAxiosError(error)) {
    return fallbackMessage
  }

  const status = error.response?.status

  if (status === 403) {
    return 'Tu cuenta no puede completar esta acción. Verifica que esté activa y validada.'
  }

  if (status === 404) {
    return 'El ecosistema solicitado no está disponible.'
  }

  return fallbackMessage
}

export default function Dashboard() {
  const { authClaims } = useAuth()
  const role = (authClaims?.role ?? 'USER').toUpperCase()
  const isAdmin = role === 'ADMIN'
  const isGlobalAdmin = role === 'GLOBAL_ADMIN'
  const canOpenEcosystemDevicesModal = role === 'USER' || role === 'AUDITOR'
  const authenticatedUserId = authClaims?.sub ?? null
  const [dashboardUsers, setDashboardUsers] = useState<DashboardUser[]>([])
  const [userEmailCache, setUserEmailCache] = useState<Record<string, string>>({})
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
  const [allEcosystems, setAllEcosystems] = useState<AccessMapEcosystem[]>([])
  const [userOwnedEcosystems, setUserOwnedEcosystems] = useState<UserOwnedEcosystem[]>(() =>
    [],
  )
  const [isUserEcosystemsLoading, setIsUserEcosystemsLoading] = useState(false)
  const [userEcosystemsError, setUserEcosystemsError] = useState<string | null>(null)
  const [isCreateEcosystemModalOpen, setIsCreateEcosystemModalOpen] = useState(false)
  const [createEcosystemStep, setCreateEcosystemStep] = useState<CreateEcosystemStep>('form')
  const [isCreatingEcosystem, setIsCreatingEcosystem] = useState(false)
  const [createEcosystemError, setCreateEcosystemError] = useState<string | null>(null)
  const [newEcosystemName, setNewEcosystemName] = useState('')
  const [newEcosystemApiKey, setNewEcosystemApiKey] = useState<string | null>(null)
  const [newEcosystemId, setNewEcosystemId] = useState<string | null>(null)
  const [revealedApiKeysByEcosystemId, setRevealedApiKeysByEcosystemId] = useState<Record<string, boolean>>({})
  const [apiKeysByEcosystemId, setApiKeysByEcosystemId] = useState<Record<string, string>>({})
  const [apiKeyLoadingByEcosystemId, setApiKeyLoadingByEcosystemId] = useState<Record<string, boolean>>({})
  const [apiKeyErrorByEcosystemId, setApiKeyErrorByEcosystemId] = useState<Record<string, string | null>>({})
  const [copiedKeyTag, setCopiedKeyTag] = useState<string | null>(null)
  const [selectedEcosystem, setSelectedEcosystem] = useState<AccessMapEcosystem | null>(null)
  const canManageSelectedEcosystem = selectedEcosystem?.ownerId === authenticatedUserId

  const copyToClipboard = async (value: string, tag: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedKeyTag(tag)
      window.setTimeout(() => {
        setCopiedKeyTag((currentTag) => (currentTag === tag ? null : currentTag))
      }, 1500)
    } catch {
      setCopiedKeyTag(null)
    }
  }

  const closeCreateEcosystemModal = () => {
    setIsCreateEcosystemModalOpen(false)
    setCreateEcosystemStep('form')
    setCreateEcosystemError(null)
    setIsCreatingEcosystem(false)
    setNewEcosystemName('')
    setNewEcosystemApiKey(null)
    setNewEcosystemId(null)
  }

  const openCreateEcosystemModal = () => {
    setCreateEcosystemStep('form')
    setCreateEcosystemError(null)
    setIsCreatingEcosystem(false)
    setNewEcosystemName('')
    setNewEcosystemApiKey(null)
    setNewEcosystemId(null)
    setIsCreateEcosystemModalOpen(true)
  }

  const openEcosystemDevicesModal = (ecosystem: AccessMapEcosystem) => {
    if (!canOpenEcosystemDevicesModal) {
      return
    }

    setSelectedEcosystem(ecosystem)
  }

  const closeEcosystemDevicesModal = () => {
    setSelectedEcosystem(null)
  }

  const updateDeviceInState = (updatedDevice: AccessMapDevice) => {
    const updateEcosystems = <T extends AccessMapEcosystem>(ecosystems: T[]): T[] =>
      ecosystems.map((ecosystem) => {
        if (ecosystem.devices.some((device) => device.id === updatedDevice.id)) {
          return {
            ...ecosystem,
            devices: ecosystem.devices.map((device) =>
              device.id === updatedDevice.id ? updatedDevice : device,
            ),
          }
        }

        return ecosystem
      })

    setAllEcosystems((current) => updateEcosystems(current))
    setUserOwnedEcosystems((current) => updateEcosystems(current))

    if (selectedEcosystem?.devices.some((device) => device.id === updatedDevice.id)) {
      setSelectedEcosystem((current) =>
        current
          ? {
              ...current,
              devices: current.devices.map((device) =>
                device.id === updatedDevice.id ? updatedDevice : device,
              ),
            }
          : current,
      )
    }
  }

  const updateEcosystemInState = (updatedEcosystem: AccessMapEcosystem) => {
    const updateEcosystems = <T extends AccessMapEcosystem>(ecosystems: T[]): T[] =>
      ecosystems.map((ecosystem) =>
        ecosystem.id === updatedEcosystem.id ? { ...ecosystem, name: updatedEcosystem.name } : ecosystem,
      )

    setAllEcosystems((current) => updateEcosystems(current))
    setUserOwnedEcosystems((current) => updateEcosystems(current))

    if (selectedEcosystem?.id === updatedEcosystem.id) {
      setSelectedEcosystem(updatedEcosystem)
    }
  }

  const revokeEcosystemFromState = (ecosystemId: string) => {
    setAllEcosystems((current) => current.filter((ecosystem) => ecosystem.id !== ecosystemId))
    setUserOwnedEcosystems((current) => current.filter((ecosystem) => ecosystem.id !== ecosystemId))
    if (selectedEcosystem?.id === ecosystemId) {
      setSelectedEcosystem(null)
    }
  }

  const fetchEcosystemApiKey = async (ecosystemId: string) => {
    const cachedApiKey = apiKeysByEcosystemId[ecosystemId]

    if (cachedApiKey) {
      return cachedApiKey
    }

    setApiKeyLoadingByEcosystemId((currentMap) => ({
      ...currentMap,
      [ecosystemId]: true,
    }))
    setApiKeyErrorByEcosystemId((currentMap) => ({
      ...currentMap,
      [ecosystemId]: null,
    }))

    try {
      const response = await apiClient.get<EcosystemApiKeyResponse>(`/ecosystems/${ecosystemId}/api-key`)
      const recoveredApiKey = response.data.apiKey

      setApiKeysByEcosystemId((currentMap) => ({
        ...currentMap,
        [ecosystemId]: recoveredApiKey,
      }))

      return recoveredApiKey
    } catch (error) {
      const errorMessage = getEcosystemErrorMessage(
        error,
        'No se pudo recuperar la API key del ecosistema.',
      )

      setApiKeyErrorByEcosystemId((currentMap) => ({
        ...currentMap,
        [ecosystemId]: errorMessage,
      }))

      return null
    } finally {
      setApiKeyLoadingByEcosystemId((currentMap) => ({
        ...currentMap,
        [ecosystemId]: false,
      }))
    }
  }

  const handleRegisterEcosystem = async () => {
    const ecosystemName = newEcosystemName.trim()

    if (!ecosystemName || !authenticatedUserId) {
      return
    }

    setIsCreatingEcosystem(true)
    setCreateEcosystemError(null)

    try {
      const payload: CreateEcosystemRequest = {
        name: ecosystemName,
      }

      const response = await apiClient.post<CreateEcosystemResponse>('/ecosystems', payload)
      const createdEcosystem = mapApiEcosystemToUserOwned(response.data)
      const createdMapEcosystem = mapApiEcosystemToAccessMap(response.data)

      setUserOwnedEcosystems((currentEcosystems) => {
        const withoutDuplicates = currentEcosystems.filter(
          (ecosystem) => ecosystem.id !== createdEcosystem.id,
        )

        return [createdEcosystem, ...withoutDuplicates]
      })
      setAllEcosystems((currentEcosystems) => {
        const withoutDuplicates = currentEcosystems.filter(
          (ecosystem) => ecosystem.id !== createdMapEcosystem.id,
        )

        return [createdMapEcosystem, ...withoutDuplicates]
      })
      setApiKeysByEcosystemId((currentMap) => ({
        ...currentMap,
        [createdEcosystem.id]: response.data.apiKey,
      }))
      setNewEcosystemApiKey(response.data.apiKey)
      setNewEcosystemId(createdEcosystem.id)
      setCreateEcosystemStep('result')
    } catch (error) {
      setCreateEcosystemError(
        getEcosystemErrorMessage(error, 'No se pudo registrar el ecosistema. Inténtalo de nuevo.'),
      )
    } finally {
      setIsCreatingEcosystem(false)
    }
  }

  const toggleApiKeyVisibility = async (ecosystemId: string) => {
    const nextIsVisible = !revealedApiKeysByEcosystemId[ecosystemId]

    setRevealedApiKeysByEcosystemId((currentMap) => ({
      ...currentMap,
      [ecosystemId]: nextIsVisible,
    }))

    if (nextIsVisible) {
      await fetchEcosystemApiKey(ecosystemId)
    }
  }

  const handleCopyEcosystemApiKey = async (ecosystemId: string) => {
    const apiKey = apiKeysByEcosystemId[ecosystemId] ?? (await fetchEcosystemApiKey(ecosystemId))

    if (!apiKey) {
      return
    }

    await copyToClipboard(apiKey, `list-${ecosystemId}`)
  }

  const userSharedEcosystems = useMemo<AccessMapEcosystem[]>(() => {
    return []
  }, [])

  const accessibleEcosystems = useMemo(() => {
    const canViewAll = role === 'AUDITOR' || role === 'ADMIN' || role === 'GLOBAL_ADMIN'

    if (canViewAll) {
      return allEcosystems
    }

    return [...userOwnedEcosystems, ...userSharedEcosystems]
  }, [allEcosystems, role, userOwnedEcosystems, userSharedEcosystems])

  const instantiatedEcosystemsCount = useMemo(() => {
    return accessibleEcosystems.length
  }, [accessibleEcosystems])

  const securityAlertsCount = useMemo(() => 0, [])

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
        valueClassName: securityAlertsCount === 0 ? 'text-emerald-600' : 'text-rose-600',
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
        user.email.toLowerCase().includes(normalizedSearchTerm)

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
  const assignableRoles: readonly UserRole[] = canChangeRoles ? getAssignableRoles(role as AdminRole) : []
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
    if (!authenticatedUserId) {
      return
    }

    let isMounted = true

    const loadUserEcosystems = async () => {
      setIsUserEcosystemsLoading(true)
      setUserEcosystemsError(null)

      try {
        const response = await apiClient.get<ApiEcosystem[]>('/ecosystems')

        if (!isMounted) {
          return
        }

        const devicesByEcosystemId = await loadDevicesForEcosystems(response.data)

        const ownedEcosystems = response.data
          .filter((ecosystem) => ecosystem.ownerId === authenticatedUserId)
          .map((ecosystem) => mapApiEcosystemToUserOwned(ecosystem, devicesByEcosystemId[ecosystem.id] || []))
        const mappedEcosystems = response.data.map((ecosystem) =>
          mapApiEcosystemToAccessMap(ecosystem, devicesByEcosystemId[ecosystem.id] || []),
        )

        setAllEcosystems((currentEcosystems) => {
          const nextIds = new Set(mappedEcosystems.map((ecosystem) => ecosystem.id))
          const preserved = currentEcosystems.filter((ecosystem) => !nextIds.has(ecosystem.id))
          return [...preserved, ...mappedEcosystems]
        })
        setUserOwnedEcosystems((currentEcosystems) => {
          const nextIds = new Set(ownedEcosystems.map((ecosystem) => ecosystem.id))
          const preserved = currentEcosystems.filter((ecosystem) => !nextIds.has(ecosystem.id))
          return [...preserved, ...ownedEcosystems]
        })

        const needsUserCache = role === 'ADMIN' || role === 'GLOBAL_ADMIN'

        if (needsUserCache) {
          try {
            const usersResponse = await apiClient.get<ApiUser[]>('/users')
            const newCache: Record<string, string> = {}
            usersResponse.data.forEach((user) => {
              newCache[user.id] = user.email
            })
            setUserEmailCache((current) => ({ ...current, ...newCache }))
          } catch (error) {
            console.error('No se pudo cargar la caché de emails de usuarios.', error)
          }
        }
      } catch {
        if (!isMounted) {
          return
        }

        setAllEcosystems([])
        setUserOwnedEcosystems([])
        setUserEcosystemsError('No se pudieron cargar tus ecosistemas desde el backend.')
      } finally {
        if (isMounted) {
          setIsUserEcosystemsLoading(false)
        }
      }
    }

    void loadUserEcosystems()

    return () => {
      isMounted = false
    }
  }, [authenticatedUserId])

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

        const newCache: Record<string, string> = {}
        response.data.forEach((user) => {
          newCache[user.id] = user.email
        })
        setUserEmailCache((current) => ({ ...current, ...newCache }))
      } catch {
        if (!isMounted) {
          return
        }

        setDashboardUsers([])
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
          ? await apiClient.patch<ApiUser>(`/users/${pendingUserAction.userId}/approve`)
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
        newRole: pendingRoleChange.nextRole,
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
          <button
            type="button"
            onClick={openCreateEcosystemModal}
            aria-label="Registrar ecosistema"
            className="flex size-10 items-center justify-center rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
          >
            <Plus className="size-5" />
          </button>
        </div>
        <p className="mt-3 text-xs text-muted">Ecosistemas que has creado y administras</p>
        {userEcosystemsError ? <p className="mt-2 text-xs text-amber-700">{userEcosystemsError}</p> : null}
        {isUserEcosystemsLoading ? <p className="mt-2 text-xs text-muted">Cargando ecosistemas...</p> : null}

        <div className="mt-6 space-y-3">
          {userOwnedEcosystems.length > 0 ? (
            userOwnedEcosystems.map((ecosystem) => (
              <div
                key={ecosystem.id}
                onClick={() => openEcosystemDevicesModal(ecosystem)}
                className="flex items-center justify-between rounded-lg border border-border/50 bg-surface/30 p-4 hover:border-border hover:bg-surface/50 transition-colors cursor-pointer"
              >
                <div>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      openEcosystemDevicesModal(ecosystem)
                    }}
                    className="font-medium text-primary transition-colors hover:text-accent"
                  >
                    {ecosystem.name}
                  </button>
                  <p className="text-xs text-muted mt-1">{ecosystem.devices.length} dispositivos</p>
                  {apiKeysByEcosystemId[ecosystem.id] ? (
                    <div className="mt-2 flex items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          void toggleApiKeyVisibility(ecosystem.id)
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-border bg-white px-2 py-1 text-muted transition-colors hover:text-primary"
                      >
                        {revealedApiKeysByEcosystemId[ecosystem.id] ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                        {revealedApiKeysByEcosystemId[ecosystem.id]
                          ? apiKeysByEcosystemId[ecosystem.id]
                          : maskApiKey(apiKeysByEcosystemId[ecosystem.id])}
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          void handleCopyEcosystemApiKey(ecosystem.id)
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-border bg-white px-2 py-1 text-muted transition-colors hover:text-primary"
                      >
                        {copiedKeyTag === `list-${ecosystem.id}` ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                        {copiedKeyTag === `list-${ecosystem.id}` ? 'Copiada' : 'Copiar'}
                      </button>
                    </div>
                  ) : (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={apiKeyLoadingByEcosystemId[ecosystem.id]}
                        onClick={(event) => {
                          event.stopPropagation()
                          void fetchEcosystemApiKey(ecosystem.id)
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-border bg-white px-2 py-1 text-xs text-muted transition-colors hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {apiKeyLoadingByEcosystemId[ecosystem.id] ? 'Recuperando API key...' : 'Recuperar API key'}
                      </button>
                      {apiKeyErrorByEcosystemId[ecosystem.id] ? (
                        <p className="text-xs text-rose-600">{apiKeyErrorByEcosystemId[ecosystem.id]}</p>
                      ) : null}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-accent/10 text-accent">
                    {ecosystem.isShared ? 'Compartido' : 'Privado'}
                  </span>
                  <button
                    type="button"
                    onClick={(event) => event.stopPropagation()}
                    aria-label={`Compartir ecosistema ${ecosystem.name}`}
                    className="text-xs font-medium px-2 py-1 rounded-full border border-border bg-white text-primary/80 transition-colors hover:bg-surface/60"
                  >
                    Compartir ecosistema
                  </button>
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
                onClick={() => openEcosystemDevicesModal(ecosystem)}
                className="flex items-center justify-between rounded-lg border border-border/50 bg-surface/30 p-4 hover:border-border hover:bg-surface/50 transition-colors cursor-pointer"
              >
                <div>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      openEcosystemDevicesModal(ecosystem)
                    }}
                    className="font-medium text-primary transition-colors hover:text-accent"
                  >
                    {ecosystem.name}
                  </button>
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

      {isCreateEcosystemModalOpen ? (
        <div className="fixed inset-0 z-[90] h-dvh w-screen flex items-center justify-center bg-black/25 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[1.5rem] border border-border bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                <House className="size-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-primary">Registrar ecosistema</h3>
                <p className="text-sm leading-6 text-muted">
                  {createEcosystemStep === 'form'
                    ? 'Introduce el nombre del nuevo ecosistema.'
                    : createEcosystemStep === 'confirm'
                      ? 'Confirma la creación para generar la API key.'
                      : 'Ecosistema registrado correctamente.'}
                </p>
              </div>
            </div>

            {createEcosystemStep === 'form' ? (
              <div className="mt-6 space-y-2">
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-primary">Nombre del ecosistema</span>
                  <input
                    type="text"
                    value={newEcosystemName}
                    onChange={(event) => setNewEcosystemName(event.target.value)}
                    placeholder="Ej. Mi hogar inteligente"
                    className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-primary outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20"
                  />
                </label>
              </div>
            ) : null}

            {createEcosystemStep === 'confirm' ? (
              <div className="mt-6 rounded-2xl border border-border bg-surface/40 p-4 text-sm text-primary">
                <p>
                  <span className="font-semibold">Nombre:</span> {newEcosystemName.trim()}
                </p>
                <p className="mt-2 text-xs text-muted">
                  Al confirmar, se generará una API key única para este ecosistema.
                </p>
                {createEcosystemError ? <p className="mt-2 text-xs text-rose-600">{createEcosystemError}</p> : null}
              </div>
            ) : null}

            {createEcosystemStep === 'result' ? (
              <div className="mt-6 space-y-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
                <p className="text-sm font-semibold text-emerald-800">API key generada</p>
                {newEcosystemApiKey ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => newEcosystemId && toggleApiKeyVisibility(newEcosystemId)}
                      className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-white px-2 py-1 text-xs text-emerald-800"
                    >
                      {newEcosystemId && revealedApiKeysByEcosystemId[newEcosystemId] ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                      {newEcosystemId && revealedApiKeysByEcosystemId[newEcosystemId]
                        ? newEcosystemApiKey
                        : maskApiKey(newEcosystemApiKey)}
                    </button>
                    <button
                      type="button"
                      onClick={() => void copyToClipboard(newEcosystemApiKey, 'modal-api-key')}
                      className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-white px-2 py-1 text-xs text-emerald-800"
                    >
                      {copiedKeyTag === 'modal-api-key' ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                      {copiedKeyTag === 'modal-api-key' ? 'Copiada' : 'Copiar'}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeCreateEcosystemModal}
                className="inline-flex items-center justify-center rounded-2xl border border-border bg-white px-5 py-3 text-sm font-semibold text-primary transition-colors hover:bg-surface/50"
              >
                {createEcosystemStep === 'result' ? 'Cerrar' : 'Cancelar'}
              </button>

              {createEcosystemStep === 'form' ? (
                <button
                  type="button"
                  disabled={newEcosystemName.trim().length < 3}
                  onClick={() => setCreateEcosystemStep('confirm')}
                  className="inline-flex items-center justify-center rounded-2xl bg-accent px-5 py-3 text-sm font-semibold text-primary transition-colors hover:bg-accent/80 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Continuar
                </button>
              ) : null}

              {createEcosystemStep === 'confirm' ? (
                <button
                  type="button"
                  disabled={isCreatingEcosystem}
                  onClick={() => void handleRegisterEcosystem()}
                  className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isCreatingEcosystem ? 'Creando ecosistema...' : 'Confirmar y generar API key'}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
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
            onClick={() => openEcosystemDevicesModal(ecosystem)}
            className="flex items-center justify-between rounded-lg border border-border/50 bg-surface/30 p-4 hover:border-border hover:bg-surface/50 transition-colors cursor-pointer group"
          >
            <div>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  openEcosystemDevicesModal(ecosystem)
                }}
                className="font-medium text-primary group-hover:text-accent transition-colors"
              >
                {ecosystem.name}
              </button>
              <p className="text-xs text-muted mt-1">
                {ecosystem.devices.length} dispositivos • Propietario: {userEmailCache[ecosystem.ownerId] ?? 'Desconocido'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  openEcosystemDevicesModal(ecosystem)
                }}
                className="text-xs font-medium px-3 py-1.5 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
              >
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
                placeholder="Email"
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
          {allEcosystems.map((ecosystem) => (
            <div
              key={ecosystem.id}
              onClick={() => openEcosystemDevicesModal(ecosystem)}
              className="flex items-center justify-between rounded-lg border border-border/50 bg-surface/30 p-4 hover:border-border hover:bg-surface/50 transition-colors"
            >
              <div>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    openEcosystemDevicesModal(ecosystem)
                  }}
                  className="font-medium text-primary transition-colors hover:text-accent"
                >
                  {ecosystem.name}
                </button>
                <p className="text-xs text-muted mt-1">Propietario: {userEmailCache[ecosystem.ownerId] ?? 'Desconocido'}</p>
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

        <AccessMap ecosystems={accessibleEcosystems} />
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

      {canOpenEcosystemDevicesModal && selectedEcosystem ? (
        <EcosystemDevicesModal
          ecosystem={selectedEcosystem}
          onClose={closeEcosystemDevicesModal}
          onDeviceUpdated={updateDeviceInState}
          onEcosystemUpdated={updateEcosystemInState}
          onEcosystemRevoked={revokeEcosystemFromState}
          canManageEcosystem={canManageSelectedEcosystem}
        />
      ) : null}

      <footer className="rounded-[1.75rem] border border-border bg-white p-6 shadow-aurora">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">
          Entidades participantes
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-4 sm:flex-nowrap sm:justify-between sm:gap-6">
          <img src={auroraLogo} alt="Logotipo de AURORA" className="h-10 sm:h-12 w-auto max-w-[7rem] object-contain" />
          <img src={gsyaLogo} alt="Logotipo de GSYA" className="h-10 sm:h-12 w-auto max-w-[7rem] object-contain" />
          <img src={uclmLogo} alt="Logotipo de UCLM" className="h-10 sm:h-12 w-auto max-w-[7rem] object-contain" />
          <img src={ueLogo} alt="Logotipo de la UE" className="h-10 sm:h-12 w-auto max-w-[7rem] object-contain" />
          <img src={mHaciendaLogo} alt="Logotipo de Ministerio de Hacienda" className="h-10 sm:h-12 w-auto max-w-[7rem] object-contain" />
          <img src={federLogo} alt="Logotipo de FEDER" className="h-10 sm:h-12 w-auto max-w-[7rem] object-contain" />
          <img src={clmLogo} alt="Logotipo de CLM" className="h-10 sm:h-12 w-auto max-w-[7rem] object-contain" />
        </div>
      </footer>
    </section>
  )
}