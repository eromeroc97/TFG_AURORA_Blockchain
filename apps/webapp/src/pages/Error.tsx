import { AlertTriangle, ArrowLeft, House } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/auth-context'

/**
 * Página de errores genéricos.
 * Muestra mensajes de error cuando no se puede completar una acción.
 *
 * @returns Componente React
 */
export default function ErrorPage() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  const fallbackPath = useMemo(() => (isAuthenticated ? '/dashboard' : '/login'), [isAuthenticated])

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }

    navigate(fallbackPath, { replace: true })
  }

  return (
    <main className="aurora-pattern-bg min-h-screen px-6 py-10 text-primary">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center">
        <section
          className="w-full max-w-2xl space-y-8 rounded-[2rem] border border-border bg-white p-8 shadow-aurora sm:p-10"
          aria-labelledby="error-title"
        >
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-accent">
              Error de navegación
            </p>
            <h2 id="error-title" className="font-heading text-3xl font-semibold text-primary sm:text-4xl">
              No pudimos completar la acción
            </h2>
            <p className="max-w-xl text-sm leading-7 text-muted sm:text-base">
              Se produjo un problema al procesar tu solicitud. Inténtalo de nuevo o vuelve a la pantalla
              anterior para continuar de forma segura.
            </p>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <p className="flex items-center gap-2">
              <AlertTriangle className="size-4" />
              Si crees que esto es un error, puedes contactar con un administrador.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-accent bg-accent px-5 py-3 text-sm font-semibold text-primary shadow-aurora transition-opacity hover:opacity-90"
            >
              <ArrowLeft className="size-4" />
              Volver atrás
            </button>

            <Link
              to={fallbackPath}
              replace
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-primary/20 bg-surface px-5 py-3 text-sm font-semibold text-primary shadow-aurora transition-colors hover:border-accent hover:text-accent"
            >
              <House className="size-4" />
              Ir al inicio
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}
