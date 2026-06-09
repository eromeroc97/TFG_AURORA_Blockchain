import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/auth-context'

export default function RequireNonAuditor() {
  const { authClaims } = useAuth()
  const role = (authClaims?.role ?? '').toUpperCase()

  if (role === 'AUDITOR') {
    return <Navigate to="/audit" replace />
  }

  return <Outlet />
}
