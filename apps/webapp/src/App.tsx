import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthProvider'
import Dashboard from './pages/Dashboard'
import AccountPage from './pages/Account'
import ErrorPage from './pages/Error'
import Login from './pages/Login'
import Recover from './pages/Recover'
import Register from './pages/Register'
import Reset from './pages/Reset'
import MainLayout from './layouts/MainLayout'
import RequireAuth from './components/routes/RequireAuth'

/**
 * Componente raíz de la aplicación web.
 * Configura el routing y el proveedor de autenticación.
 *
 * Rutas públicas:
 * - /login - Inicio de sesión
 * - /register - Registro de usuario
 * - /recover - Recuperación de contraseña
 * - /reset - Restablecimiento de contraseña
 * - /error - Página de error
 *
 * Rutas protegidas (requieren autenticación):
 * - /dashboard - Panel principal
 * - /account - Gestión de cuenta
 *
 * @returns Componente React
 */
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/recover" element={<Recover />} />
          <Route path="/reset" element={<Reset />} />
          <Route path="/error" element={<ErrorPage />} />
          <Route element={<RequireAuth />}>
            <Route element={<MainLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/account" element={<AccountPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
