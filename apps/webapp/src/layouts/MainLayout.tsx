import { useEffect, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { apiClient } from '../api/axios'
import Header from '../components/layout/Header'
import { useAuth } from '../context/auth-context'
import { getPendingCount } from '../services/notifications.service'

export default function MainLayout() {
  const navigate = useNavigate()
  const { authClaims, clearSession } = useAuth()
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    const fetchPendingCount = async () => {
      if (authClaims?.sub) {
        const count = await getPendingCount()
        setPendingCount(count)
      }
    }
    fetchPendingCount()
    const interval = setInterval(fetchPendingCount, 30000)
    return () => clearInterval(interval)
  }, [authClaims?.sub])

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
  )
}