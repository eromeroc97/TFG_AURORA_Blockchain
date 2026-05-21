import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { apiClient } from '../api/axios'
import Header from '../components/layout/Header'
import { useAuth } from '../context/auth-context'
import { getPendingCount } from '../services/notifications.service'

const NotificationCountContext = createContext<() => void>(() => {})

export const useRefreshNotificationCount = () => useContext(NotificationCountContext)

export default function MainLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { authClaims, clearSession } = useAuth()
  const [pendingCount, setPendingCount] = useState(0)
  const [, setRefreshKey] = useState(0)

  const refreshNotificationCount = useCallback(() => {
    if (authClaims?.sub) {
      getPendingCount().then(setPendingCount)
    }
    setRefreshKey(k => k + 1)
  }, [authClaims?.sub])

  useEffect(() => {
    if (authClaims?.sub) {
      getPendingCount().then(setPendingCount)
    }
  }, [authClaims?.sub, location.pathname])

  const handleSignOut = async () => {
    try {
      await apiClient.post('/auth/logout', undefined, {
        skipAuthRefresh: true,
      })
    } finally {
      clearSession()
      navigate('/login', { replace: true })
    }
  }

  return (
    <NotificationCountContext.Provider value={refreshNotificationCount}>
      <div className="aurora-pattern-bg flex h-screen flex-col overflow-hidden text-primary">
        <Header
          onSignOut={handleSignOut}
          userEmail={authClaims?.email}
          userRole={authClaims?.role}
          pendingCount={pendingCount}
        />
        <main className="min-h-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </NotificationCountContext.Provider>
  )
}