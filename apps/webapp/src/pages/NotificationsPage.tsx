import { useEffect, useMemo, useState } from 'react'
import { Bell, ChevronLeft, ChevronRight, Check, X, Search } from 'lucide-react'
import {
  acceptNotification,
  getNotifications,
  markAsRead,
  rejectNotification,
  type Notification,
} from '../services/notifications.service'
import Select from '../components/Select'
import { useRefreshNotificationCount } from '../layouts/MainLayout'

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const
const DEFAULT_PAGE_SIZE = 10

const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'PENDING':
      return 'Pendiente'
    case 'READ':
      return 'Leída'
    case 'ACCEPTED':
      return 'Aceptada'
    case 'REJECTED':
      return 'Rechazada'
    default:
      return status
  }
}

const getStatusStyle = (status: string): string => {
  switch (status) {
    case 'PENDING':
      return 'font-semibold text-slate-900'
    case 'READ':
    case 'ACCEPTED':
    case 'REJECTED':
      return 'italic text-slate-500'
    default:
      return 'text-slate-900'
  }
}

const getStatusClass = (status: string): string => {
  switch (status) {
    case 'PENDING':
      return 'bg-amber-100 text-amber-800'
    case 'READ':
      return 'bg-slate-100 text-slate-600'
    case 'ACCEPTED':
      return 'bg-emerald-100 text-emerald-800'
    default:
      return 'bg-rose-100 text-rose-800'
  }
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null)
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const refreshNotificationCount = useRefreshNotificationCount()
const [pageSize, setPageSize] = useState<typeof DEFAULT_PAGE_SIZE>(DEFAULT_PAGE_SIZE)

  const loadNotifications = async () => {
    setIsLoading(true)
    const data = await getNotifications(true)
    setNotifications(data.toSorted((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
    setIsLoading(false)
  }

  useEffect(() => {
    loadNotifications()
  }, [])

  const handleMarkAsRead = async (id: string) => {
    setActionLoading(id)
    const result = await markAsRead(id)
    if (result) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, status: 'READ' as const, readAt: result.readAt } : n)),
      )
      refreshNotificationCount()
    }
    setActionLoading(null)
  }

  const handleAccept = async (id: string) => {
    setActionLoading(id)
    const result = await acceptNotification(id)
    if (result) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, status: 'ACCEPTED' as const, respondedAt: result.respondedAt } : n)),
      )
      refreshNotificationCount()
    }
    setActionLoading(null)
  }

  const handleReject = async (id: string) => {
    setActionLoading(id)
    const result = await rejectNotification(id)
    if (result) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, status: 'REJECTED' as const, respondedAt: result.respondedAt } : n)),
      )
      refreshNotificationCount()
    }
    setActionLoading(null)
  }

  const handleCloseModal = () => {
    if (selectedNotification?.category === 'READ_ONLY' && selectedNotification.status === 'PENDING') {
      handleMarkAsRead(selectedNotification.id)
    }
    setSelectedNotification(null)
  }

  const handleModalAccept = async () => {
    if (selectedNotification) {
      await handleAccept(selectedNotification.id)
      setSelectedNotification(null)
    }
  }

  const handleModalReject = async () => {
    if (selectedNotification) {
      await handleReject(selectedNotification.id)
      setSelectedNotification(null)
    }
  }

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      const matchesSearch =
        searchText === '' ||
        n.title.toLowerCase().includes(searchText.toLowerCase()) ||
        n.message.toLowerCase().includes(searchText.toLowerCase())
      const matchesStatus = statusFilter === 'ALL' || n.status === statusFilter
      const notificationDate = new Date(n.createdAt)
      const matchesStartDate = !startDate || notificationDate >= new Date(startDate)
      const matchesEndDate = !endDate || notificationDate <= new Date(endDate + 'T23:59:59')
      return matchesSearch && matchesStatus && matchesStartDate && matchesEndDate
    })
  }, [notifications, searchText, statusFilter, startDate, endDate])

  const totalPages = Math.ceil(filteredNotifications.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const paginatedNotifications = filteredNotifications.slice(startIndex, startIndex + pageSize)

  if (isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-5xl items-center px-4 py-8 sm:px-6 lg:px-0">
        <div className="rounded-2xl border border-white/20 bg-white/80 px-6 py-5 shadow-aurora backdrop-blur-md">
          Cargando notificaciones...
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-0">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-teal-600">Notificaciones</p>
        <h1 className="text-3xl font-semibold text-slate-900 sm:text-4xl">Centro de notificaciones</h1>
        <p className="max-w-xl text-sm leading-7 text-slate-600">
          Tus alertas y avisos importantes en un solo lugar.
        </p>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por título o mensaje..."
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full rounded-xl border border-border bg-white py-2.5 pl-10 pr-4 text-sm text-primary placeholder:text-slate-400 outline-none transition-colors focus:border-accent"
            />
          </div>

          <Select
            value={statusFilter}
            onChange={(value) => {
              setStatusFilter(value as string)
              setCurrentPage(1)
            }}
            options={[
              { value: 'ALL', label: 'Todos los estados' },
              { value: 'PENDING', label: 'Pendiente' },
              { value: 'READ', label: 'Leída' },
              { value: 'ACCEPTED', label: 'Aceptada' },
              { value: 'REJECTED', label: 'Rechazada' },
            ]}
          />

          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">Desde</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full rounded-xl border border-border bg-white py-2.5 pl-16 pr-4 text-sm text-primary outline-none transition-colors focus:border-accent"
            />
          </div>

          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">Hasta</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full rounded-xl border border-border bg-white py-2.5 pl-16 pr-4 text-sm text-primary outline-none transition-colors focus:border-accent"
            />
          </div>
        </div>
      </div>

      {filteredNotifications.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white/95 p-12 text-center shadow-xl backdrop-blur-sm">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-slate-100">
            <Bell className="size-8 text-slate-400" />
          </div>
          <p className="text-lg font-medium text-slate-700">No tienes notificaciones</p>
          <p className="mt-1 text-sm text-slate-500">Las notificaciones aparecerán aquí cuando existan.</p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm text-slate-700">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.2em] text-slate-500">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Fecha</th>
                    <th className="px-6 py-4 font-semibold">Título</th>
                    <th className="px-6 py-4 font-semibold">Mensaje</th>
                    <th className="px-6 py-4 font-semibold">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {paginatedNotifications.map((notification) => (
                    <tr
                      key={notification.id}
                      className="cursor-pointer hover:bg-slate-50/50"
                      onClick={() => setSelectedNotification(notification)}
                    >
                      <td className="whitespace-nowrap px-6 py-4 text-slate-500">
                        {formatDate(notification.createdAt)}
                      </td>
                      <td className={`px-6 py-4 ${getStatusStyle(notification.status)}`}>{notification.title}</td>
                      <td className={`max-w-md truncate px-6 py-4 ${getStatusStyle(notification.status)}`}>
                        {notification.message}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusClass(notification.status)}`}
                        >
                          {getStatusLabel(notification.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages >= 1 && (
            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-500">Mostrar</span>
                <Select
                  value={pageSize}
                  onChange={(value) => {
                    setPageSize(Number(value) as typeof DEFAULT_PAGE_SIZE)
                    setCurrentPage(1)
                  }}
                  options={PAGE_SIZE_OPTIONS.map((size) => ({ value: size, label: size.toString() }))}
                />
                <span className="text-sm text-slate-500">por página</span>
              </div>
              <p className="text-sm text-slate-500">
                Mostrando {startIndex + 1} a {Math.min(startIndex + pageSize, filteredNotifications.length)} de{' '}
                {filteredNotifications.length} notificaciones
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ChevronLeft className="size-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      page === currentPage
                        ? 'bg-teal-600 text-white'
                        : 'border border-gray-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
            </div>
          )}
        </>
      )}

      {selectedNotification && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/20 px-4 backdrop-blur-sm">
          <div className="w-full max-w-[70%] rounded-2xl border border-gray-100 bg-white/95 shadow-2xl backdrop-blur-sm">
            <div className="border-b border-gray-100 px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-600">Notificación</p>
                  <h3 className="mt-2 text-lg font-semibold text-slate-900">{selectedNotification.title}</h3>
                </div>
                <span
                  className={`inline-flex shrink-0 items-center rounded-full px-3 py-1 text-xs font-medium ${getStatusClass(selectedNotification.status)}`}
                >
                  {getStatusLabel(selectedNotification.status)}
                </span>
              </div>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <span className="font-medium">Fecha:</span>
                <span>{formatDate(selectedNotification.createdAt)}</span>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium text-slate-700">Mensaje</p>
                <div className="rounded-xl border border-gray-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  {selectedNotification.message}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-gray-100 px-6 py-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleCloseModal}
                className="inline-flex items-center justify-center rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                Cerrar
              </button>
              {selectedNotification.category === 'ACTION_EXPECTED' && selectedNotification.status === 'PENDING' && (
                <>
                  <button
                    type="button"
                    onClick={handleModalReject}
                    disabled={actionLoading === selectedNotification.id}
                    className="inline-flex items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <X className="mr-2 size-4" />
                    Rechazar
                  </button>
                  <button
                    type="button"
                    onClick={handleModalAccept}
                    disabled={actionLoading === selectedNotification.id}
                    className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Check className="mr-2 size-4" />
                    Aceptar
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}