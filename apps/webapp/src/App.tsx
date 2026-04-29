import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthProvider'
import AccountPage from './pages/Account'
import EcosystemsManagementPage from './pages/EcosystemsManagementPage'
import ErrorPage from './pages/Error'
import Login from './pages/Login'
import MainDashboard from './pages/MainDashboard'
import Recover from './pages/Recover'
import Register from './pages/Register'
import Reset from './pages/Reset'
import RequireAuth from './components/routes/RequireAuth'
import RequireAdmin from './components/routes/RequireAdmin'
import UsersManagementPage from './pages/UsersManagementPage'
import MainLayout from './layouts/MainLayout'

/**
 * Componente raíz de la aplicación.
 * Configura rutas, autenticación y navegación.
 *
 * Rutas públicas:
 * - /login - Inicio de sesión
 * - /register - Registro de usuario
 * - /recover - Recuperación de contraseña
 * - /reset - Restablecimiento de contraseña
 * - /error - Página de error
 *
 * Rutas protegidas:
 * - /dashboard - Panel principal
 * - /account - Gestión de cuenta
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
          <Route path="/reset-password" element={<Reset />} />
          <Route path="/auth/reset-password" element={<Reset />} />
          <Route path="/error" element={<ErrorPage />} />
          <Route element={<RequireAuth />}>
            <Route element={<MainLayout />}>
              <Route path="/dashboard" element={<MainDashboard />} />
              <Route element={<RequireAdmin />}>
                <Route path="/users" element={<UsersManagementPage />} />
              </Route>
              <Route path="/ecosystems" element={<EcosystemsManagementPage />} />
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
