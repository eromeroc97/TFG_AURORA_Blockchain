import { useEffect, useState, type FormEvent } from 'react'
import axios from 'axios'
import { ArrowRight, Mail } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { apiClient } from '../api/axios'
import AuthPageShell from '../components/auth/AuthPageShell'
import { useAuth } from '../context/auth-context'

export default function Register() {
  const navigate = useNavigate()
  const { isAuthenticated, isHydrating, authClaims } = useAuth()
  const [email, setEmail] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!isHydrating && isAuthenticated) {
      const role = (authClaims?.role ?? '').toUpperCase()
      navigate(role === 'AUDITOR' ? '/audit' : '/dashboard', { replace: true })
    }
  }, [isAuthenticated, isHydrating, navigate, authClaims])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')
    setIsSubmitting(true)

    try {
      await apiClient.post('/users', { email })
      setSuccessMessage(
        'Solicitud enviada. Revisa tu correo para continuar con la activacion de tu cuenta.',
      )
      setEmail('')
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        setErrorMessage('Ya existe un usuario con ese email. Intenta iniciar sesion o recuperar acceso.')
      } else {
        setErrorMessage('No se pudo procesar el registro ahora mismo. Intentalo de nuevo en unos minutos.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthPageShell>
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-6">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-accent">
                  Crear Solicitud
                </p>
                <h2 className="font-heading text-3xl font-semibold text-primary">Registro de cuenta</h2>
                <p className="text-sm leading-6 text-muted">
                  Introduce tu email. El equipo administrador validara la solicitud y te enviara los
                  siguientes pasos para activar el acceso.
                </p>
              </div>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-primary">Email corporativo</span>
                <div className="flex items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3 focus-within:border-accent">
                  <Mail className="size-4 shrink-0 text-muted" />
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full border-0 bg-transparent text-sm text-primary outline-none placeholder:text-muted"
                    placeholder="tu@email.com"
                  />
                </div>
              </label>

              {errorMessage ? (
                <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {errorMessage}
                </p>
              ) : null}

              {successMessage ? (
                <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {successMessage}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-accent px-5 py-3 text-sm font-semibold text-primary shadow-aurora disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? 'Enviando solicitud...' : 'Solicitar registro'}
                <ArrowRight className="size-4" />
              </button>

              <div className="grid grid-cols-2 gap-3 text-xs text-muted">
                <Link to="/login" className="underline-offset-2 transition-colors hover:text-accent hover:underline">
                  Iniciar sesión
                </Link>
                <Link
                  to="/recover"
                  className="text-right underline-offset-2 transition-colors hover:text-accent hover:underline"
                >
                  He olvidado mi contraseña
                </Link>
              </div>

      </form>
    </AuthPageShell>
  )
}
