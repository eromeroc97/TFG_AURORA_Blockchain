import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/auth-context'

export default function RequireAuth() {
  const { isAuthenticated, isHydrating } = useAuth()

  if (isHydrating) {
    return null
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}