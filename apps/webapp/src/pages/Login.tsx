import { useState, type FormEvent } from 'react'
import axios from 'axios'
import { ArrowRight, LockKeyhole, Mail } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { apiClient } from '../api/axios'
import PasswordInput from '../components/PasswordInput'
import AuthPageShell from '../components/auth/AuthPageShell'
import { useAuth } from '../context/auth-context'

export default function Login() {
  const navigate = useNavigate()
  const { setSession } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const response = await apiClient.post('/auth/login', { email, password })
      setSession(response.data.accessToken)
      navigate('/dashboard', { replace: true })
    } catch (error) {
      const backendMessage =
        axios.isAxiosError<{ message?: string | string[] }>(error) && error.response?.data?.message
          ? error.response.data.message
          : ''
      const normalizedMessage = Array.isArray(backendMessage)
        ? backendMessage.join(' ')
        : backendMessage

      if (normalizedMessage.includes('PASSBLOCK')) {
        const recoveredMessage = normalizedMessage.replace(/^PASSBLOCK:\s*/i, '')
        navigate('/recover', {
          replace: true,
          state: {
            prefillEmail: email,
            forcedRecoverMessage: recoveredMessage,
          },
        })
        return
      }

      setErrorMessage('No se pudo iniciar sesión. Revisa tus credenciales e inténtalo de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthPageShell>
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-6">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-accent">
                  Bienvenido de nuevo
                </p>
                <h2 className="font-heading text-3xl font-semibold text-primary">
                  Accede al panel de AURORA
                </h2>
                <p className="text-sm leading-6 text-muted">
                  Usa tus credenciales para acceder a la plataforma. Si aún no tienes cuenta, puedes registrar una nueva cuenta.
                </p>
              </div>

              <div className="space-y-4">
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-primary">Email</span>
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

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-primary">Contraseña</span>
                  <div className="flex items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3 focus-within:border-accent">
                    <LockKeyhole className="size-4 shrink-0 text-muted" />
                    <PasswordInput
                      name="password"
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="w-full border-0 bg-transparent text-sm text-primary outline-none placeholder:text-muted"
                      placeholder="Tu contraseña"
                    />
                  </div>
                </label>
              </div>

              {errorMessage ? (
                <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {errorMessage}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-accent px-5 py-3 text-sm font-semibold text-primary shadow-aurora disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? 'Entrando...' : 'Entrar'}
                <ArrowRight className="size-4" />
              </button>

              <div className="grid grid-cols-2 gap-3 text-xs text-muted">
                <Link to="/register" className="underline-offset-2 transition-colors hover:text-accent hover:underline">
                  Registrarse
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