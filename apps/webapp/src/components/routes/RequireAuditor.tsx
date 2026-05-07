import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/auth-context'

export default function RequireAuditor() {
  const { authClaims } = useAuth()
  const role = (authClaims?.role ?? 'USER').toUpperCase()
  const isAuditor = role === 'AUDITOR' || role === 'ADMIN' || role === 'GLOBAL_ADMIN'

  if (!isAuditor) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}