import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthProvider'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Recover from './pages/Recover'
import Register from './pages/Register'
import Reset from './pages/Reset'
import MainLayout from './components/layout/MainLayout'
import RequireAuth from './components/routes/RequireAuth'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/recover" element={<Recover />} />
          {/* TODO(auth-reset): Replace open /reset route with one-time token flow from email link. */}
          <Route path="/reset" element={<Reset />} />
          <Route element={<RequireAuth />}>
            <Route element={<MainLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
