import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/auth-context'

/**
 * Componente de protección de rutas.
 * Redirige a /login si no hay sesión activa.
 * Espera a que termine la hidratación antes de mostrar contenido.
 *
 * @returns Outlet si autenticado, Navigate si no, null si hidrolizando
 */
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