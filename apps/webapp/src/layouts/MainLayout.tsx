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
    <div className="relative isolate flex h-screen flex-col overflow-hidden bg-background text-primary">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage:
            "radial-gradient(circle at 18% 16%, rgba(10, 37, 64, 0.11), transparent 40%), radial-gradient(circle at 82% 86%, rgba(20, 184, 166, 0.14), transparent 42%), url(\"data:image/svg+xml,%3Csvg width='36' height='36' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='9' cy='9' r='1.6' fill='%230A2540' fill-opacity='0.24'/%3E%3Ccircle cx='27' cy='27' r='1.6' fill='%2314B8A6' fill-opacity='0.28'/%3E%3C/svg%3E\")",
          backgroundSize: 'auto, auto, 36px 36px',
        }}
      />
      <Header
        onSignOut={handleSignOut}
        userEmail={authClaims?.email}
        userRole={authClaims?.role}
      />
      <main className="min-h-0 flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}