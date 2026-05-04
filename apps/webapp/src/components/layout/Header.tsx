import { Bell, ChevronDown, LogOut, Shield, UserCircle2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import auroraLogo from '../../assets/aurora-logo.png'

type HeaderProps = {
  onSignOut: () => Promise<void> | void
  userEmail?: string | null
  userRole?: string | null
  pendingCount?: number
}

const navigationItems = [
  { label: 'Dashboard', to: '/dashboard', roles: ['USER', 'AUDITOR', 'ADMIN', 'GLOBAL_ADMIN'] },
  { label: 'Usuarios', to: '/users', roles: ['ADMIN', 'GLOBAL_ADMIN'] },
  { label: 'Ecosistemas', to: '/ecosystems', roles: ['USER', 'AUDITOR', 'ADMIN', 'GLOBAL_ADMIN'] },
] as const

export default function Header({ onSignOut, userEmail, userRole, pendingCount = 0 }: HeaderProps) {
  const location = useLocation()
  const role = (userRole ?? 'USER').toUpperCase()
  const hasPendingNotifications = pendingCount > 0

  const visibleNavigationItems = navigationItems.filter((item) =>
    item.roles.some((r) => r === role),
  )
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const roleLabel = userRole ? userRole.replace(/_/g, ' ') : 'Rol no disponible'
  const emailLocalPart = userEmail?.split('@')[0]?.trim() || 'Sesión activa'

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node

      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) {
        return
      }

      setIsProfileMenuOpen(false)
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsProfileMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  const getLinkClassName = (to: string) => {
    const isActive = location.pathname === to

    return [
      'rounded-full px-4 py-2 text-sm font-medium transition-colors duration-200',
      isActive
        ? 'bg-primary text-surface shadow-aurora'
        : 'text-primary/70 hover:bg-white/70 hover:text-primary',
    ].join(' ')
  }

  const handleSignOut = async () => {
    setIsProfileMenuOpen(false)
    await onSignOut()
  }

  return (
    <header className="sticky top-0 z-50 bg-gradient-to-b from-white/95 to-slate-100/75 shadow-[0_14px_34px_rgba(2,6,23,0.12),0_3px_12px_rgba(2,6,23,0.06)] backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-x-10 -bottom-3 h-6 rounded-full bg-primary/15 blur-xl" />

      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link to="/dashboard" className="flex shrink-0 items-center gap-3">
          <div className="flex flex-col items-center">
            <img
              src={auroraLogo}
              alt="AURORA"
              className="h-11 w-auto drop-shadow-[0_6px_18px_rgba(15,23,42,0.18)]"
            />
            <span className="text-[0.6rem] font-bold tracking-[0.35em] text-primary -mt-1">
              SMART HOME
            </span>
          </div>
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-2 rounded-full bg-white/70 px-3 py-2 shadow-[0_10px_24px_rgba(15,23,42,0.12),inset_0_1px_0_rgba(255,255,255,0.9)] md:flex">
          {visibleNavigationItems.map((item) => (
            <Link key={item.label} to={item.to} className={getLinkClassName(item.to)}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="relative ml-auto" ref={menuRef}>
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setIsProfileMenuOpen((currentValue) => !currentValue)}
            aria-haspopup="menu"
            aria-expanded={isProfileMenuOpen}
            className="inline-flex items-center gap-3 rounded-full bg-white/85 px-3 py-2 text-left shadow-[0_10px_24px_rgba(15,23,42,0.14),inset_0_1px_0_rgba(255,255,255,0.92)] backdrop-blur-md transition-colors hover:bg-white"
          >
            <div className="relative flex size-9 items-center justify-center rounded-full bg-primary text-surface">
              <UserCircle2 className="size-5" />
              {pendingCount > 0 && (
                <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-red-500 text-[0.6rem] font-bold text-white">
                  {pendingCount > 9 ? '9+' : pendingCount}
                </span>
              )}
            </div>
            <div className="hidden text-left sm:block">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-muted">
                {roleLabel}
              </p>
              <p className="max-w-48 truncate text-sm font-medium text-primary">
                {emailLocalPart}
              </p>
            </div>
            <ChevronDown
              className={`size-4 text-muted transition-transform ${
                isProfileMenuOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {isProfileMenuOpen ? (
            <div
              role="menu"
              aria-label="Perfil"
              className="absolute right-0 z-[70] mt-3 w-72 overflow-hidden rounded-3xl bg-white/95 p-2 shadow-[0_24px_50px_rgba(15,23,42,0.20),0_8px_20px_rgba(15,23,42,0.10),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-xl"
            >
              <div className="rounded-2xl bg-background/70 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">
                  Sesión actual
                </p>
                <p className="mt-1 text-sm font-medium text-primary">{userEmail ?? 'Usuario'}</p>
                <p className="mt-1 text-xs text-muted">{userRole ?? 'Rol no disponible'}</p>
              </div>

              <div className="mt-2 grid gap-1">
                <Link
                  to="/account"
                  role="menuitem"
                  onClick={() => setIsProfileMenuOpen(false)}
                  className="inline-flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-primary transition-colors hover:bg-primary/5 hover:text-primary"
                >
                  <Shield className="size-4 text-accent" />
                  Ir a mi perfil
                </Link>

                <Link
                  to="/notifications"
                  role="menuitem"
                  onClick={() => setIsProfileMenuOpen(false)}
                  className="inline-flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-primary transition-colors hover:bg-primary/5 hover:text-primary"
                >
                  <Bell className="size-4 text-accent" />
                  Notificaciones
                  {pendingCount > 0 && (
                    <span className="ml-auto flex size-5 items-center justify-center rounded-full bg-red-500 text-[0.65rem] font-bold text-white">
                      {pendingCount > 9 ? '9+' : pendingCount}
                    </span>
                  )}
                </Link>

                <button
                  type="button"
                  role="menuitem"
                  onClick={handleSignOut}
                  className="inline-flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium text-rose-700 transition-colors hover:bg-rose-50"
                >
                  <LogOut className="size-4" />
                  Cerrar sesión
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  )
}