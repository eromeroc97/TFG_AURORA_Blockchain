import { LogOut, Sparkles } from 'lucide-react'
import { Link, Outlet, useNavigate } from 'react-router-dom'
import { apiClient } from '../../api/axios'
import { useAuth } from '../../context/auth-context'

export default function MainLayout() {
  const navigate = useNavigate()
  const { clearSession } = useAuth()

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
    <div className="min-h-screen bg-background text-primary">
      <header className="border-b border-border bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 lg:px-8">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-surface shadow-aurora">
              <Sparkles className="size-5" />
            </div>
            <div>
              <p className="font-heading text-sm font-semibold tracking-[0.24em] text-primary">
                AURORA
              </p>
              <p className="text-xs text-muted">Cookie-based access shell</p>
            </div>
          </Link>

          <nav className="flex items-center gap-3 text-sm font-medium text-primary">
            <Link
              to="/dashboard"
              className="rounded-full px-4 py-2 hover:bg-background/80 hover:text-primary"
            >
              Dashboard
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-sm font-semibold text-primary hover:border-accent hover:text-accent"
            >
              <LogOut className="size-4" />
              Cerrar sesión
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8 lg:px-8">
        <Outlet />
      </main>
    </div>
  )
}