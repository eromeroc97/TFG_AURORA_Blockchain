import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/auth-context'

export default function RequireAdmin() {
  const { authClaims } = useAuth()
  const role = (authClaims?.role ?? 'USER').toUpperCase()
  const isAdminOrGlobalAdmin = role === 'ADMIN' || role === 'GLOBAL_ADMIN'

  if (!isAdminOrGlobalAdmin) {
    return <Navigate to={role === 'AUDITOR' ? '/audit' : '/dashboard'} replace />
  }

  return <Outlet />
}