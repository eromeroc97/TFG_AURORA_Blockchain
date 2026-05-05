import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/auth-context'

export default function RequireGlobalAdmin() {
  const { authClaims } = useAuth()
  const role = (authClaims?.role ?? 'USER').toUpperCase()

  if (role !== 'GLOBAL_ADMIN') {
    return <Navigate to="/error" replace />
  }

  return <Outlet />
}