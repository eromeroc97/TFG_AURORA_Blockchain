import { Outlet, useNavigate } from 'react-router-dom'
import { apiClient } from '../api/axios'
import Header from '../components/layout/Header'
import { useAuth } from '../context/auth-context'

export default function MainLayout() {
  const navigate = useNavigate()
  const { authClaims, clearSession } = useAuth()

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
    <div className="flex min-h-screen flex-col bg-background text-primary">
      <Header
        onSignOut={handleSignOut}
        userEmail={authClaims?.email}
        userRole={authClaims?.role}
      />
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}