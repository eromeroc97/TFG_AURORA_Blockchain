import { Outlet, useNavigate } from 'react-router-dom'
import { apiClient } from '../api/axios'
import Header from '../components/layout/Header'
import { useAuth } from '../context/auth-context'

/**
 * Layout principal de la aplicación autenticada.
 * Incluye la cabecera y maneja el cierre de sesión.
 *
 * @returns Componente React
 */
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
    <div className="aurora-pattern-bg flex h-screen flex-col overflow-hidden text-primary">
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