import { useEffect, useState } from 'react'
import { Bell, ChevronLeft, ChevronRight, Check, X } from 'lucide-react'
import {
  acceptNotification,
  getNotifications,
  markAsRead,
  rejectNotification,
  type Notification,
} from '../services/notifications.service'

const PAGE_SIZE = 10

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

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const loadNotifications = async () => {
    setIsLoading(true)
    const data = await getNotifications(true)
    setNotifications(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
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
    }
    setActionLoading(null)
  }

  const totalPages = Math.ceil(notifications.length / PAGE_SIZE)
  const startIndex = (currentPage - 1) * PAGE_SIZE
  const paginatedNotifications = notifications.slice(startIndex, startIndex + PAGE_SIZE)

  const canShowActionButtons = (notification: Notification): boolean => {
    if (notification.category === 'READ_ONLY') {
      return notification.status === 'PENDING'
    }
    if (notification.category === 'ACTION_EXPECTED') {
      return notification.status === 'PENDING'
    }
    return false
  }

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

      {notifications.length === 0 ? (
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
                    <th className="px-6 py-4 font-semibold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {paginatedNotifications.map((notification) => (
                    <tr key={notification.id} className="hover:bg-slate-50/50">
                      <td className="whitespace-nowrap px-6 py-4 text-slate-500">
                        {formatDate(notification.createdAt)}
                      </td>
                      <td className={`px-6 py-4 ${getStatusStyle(notification.status)}`}>{notification.title}</td>
                      <td className={`max-w-xs truncate px-6 py-4 ${getStatusStyle(notification.status)}`}>
                        {notification.message}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            notification.status === 'PENDING'
                              ? 'bg-amber-100 text-amber-800'
                              : notification.status === 'READ'
                                ? 'bg-slate-100 text-slate-600'
                                : notification.status === 'ACCEPTED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {getStatusLabel(notification.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {canShowActionButtons(notification) ? (
                          <div className="flex items-center justify-end gap-2">
                            {notification.category === 'READ_ONLY' && (
                              <button
                                onClick={() => handleMarkAsRead(notification.id)}
                                disabled={actionLoading === notification.id}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <Check className="size-3.5" />
                                Marcar como leída
                              </button>
                            )}
                            {notification.category === 'ACTION_EXPECTED' && (
                              <>
                                <button
                                  onClick={() => handleAccept(notification.id)}
                                  disabled={actionLoading === notification.id}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  <Check className="size-3.5" />
                                  Aceptar
                                </button>
                                <button
                                  onClick={() => handleReject(notification.id)}
                                  disabled={actionLoading === notification.id}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-rose-100 px-3 py-1.5 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-200 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  <X className="size-3.5" />
                                  Rechazar
                                </button>
                              </>
                            )}
                          </div>
                        ) : (
                          <span className={getStatusStyle(notification.status)}>{getStatusLabel(notification.status)}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">
                Mostrando {startIndex + 1} a {Math.min(startIndex + PAGE_SIZE, notifications.length)} de{' '}
                {notifications.length} notificaciones
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
          )}
        </>
      )}
    </div>
  )
}