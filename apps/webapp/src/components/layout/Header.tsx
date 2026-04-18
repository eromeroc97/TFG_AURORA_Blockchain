import { ChevronDown, LogOut, Shield, Sparkles, UserCircle2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

type HeaderProps = {
  onSignOut: () => Promise<void> | void
  userEmail?: string | null
  userRole?: string | null
}

const navigationItems = [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Ecosistemas', to: '/dashboard#ecosistemas' },
  { label: 'Auditoría', to: '/dashboard#auditoria' },
] as const

export default function Header({ onSignOut, userEmail, userRole }: HeaderProps) {
  const location = useLocation()
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

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
    const isDashboard = to === '/dashboard'
    const isActive = isDashboard
      ? location.pathname === '/dashboard'
      : `${location.pathname}${location.hash}` === to

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
    <header className="sticky top-0 z-50 border-b border-white/15 bg-white/70 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link to="/dashboard" className="flex shrink-0 items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-surface shadow-aurora">
            <Sparkles className="size-5" />
          </div>
          <div className="hidden sm:block">
            <p className="font-heading text-sm font-semibold tracking-[0.24em] text-primary">
              AURORA
            </p>
            <p className="text-xs text-muted">Navigation shell</p>
          </div>
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-2 md:flex">
          {navigationItems.map((item) => (
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
            className="inline-flex items-center gap-3 rounded-full border border-white/20 bg-white/70 px-3 py-2 text-left shadow-sm backdrop-blur-md transition-colors hover:border-white/30 hover:bg-white/90"
          >
            <div className="flex size-9 items-center justify-center rounded-full bg-primary text-surface">
              <UserCircle2 className="size-5" />
            </div>
            <div className="hidden text-left sm:block">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-muted">
                Perfil
              </p>
              <p className="max-w-48 truncate text-sm font-medium text-primary">
                {userEmail ?? 'Sesión activa'}
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
              className="absolute right-0 mt-3 w-72 overflow-hidden rounded-3xl border border-white/20 bg-white/95 p-2 shadow-aurora backdrop-blur-xl"
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