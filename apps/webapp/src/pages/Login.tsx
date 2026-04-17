import { useState, type FormEvent } from 'react'
import axios from 'axios'
import { ArrowRight, LockKeyhole, Mail } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { apiClient } from '../api/axios'
import PasswordInput from '../components/PasswordInput'
import { useAuth } from '../context/auth-context'
import auroraLogo from '../assets/aurora-logo.png'
import gsyaLogo from '../assets/gsya_logo.png'
import uclmLogo from '../assets/uclm_logo.png'
import fundingLogos from '../assets/MostrarUE-MA-Feder-Innocam.jpg'

const logoSrc = auroraLogo

const auroraMeaning =
  'Advanced and Unified Research On cybersecurity Risk Analysis and sustainability in smart homes'

export default function Login() {
  const navigate = useNavigate()
  const { setSession } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [, setLogoFailed] = useState(false)

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
        navigate('/recover', {
          replace: true,
          state: {
            prefillEmail: email,
            forcedRecoverMessage:
              'Tu contraseña lleva demasiado tiempo sin cambiarse. Debes iniciar el proceso de recuperación para definir una nueva.',
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
    <main className="min-h-screen px-6 py-10 text-primary">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center">
        <section className="grid w-full overflow-hidden rounded-[2rem] border border-border bg-white shadow-aurora lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col justify-between gap-8 bg-primary p-8 text-surface sm:p-10 lg:p-12">
            <div className="max-w-lg space-y-6">
              <div className="flex items-center gap-4">
                <a
                  href="https://gsya.esi.uclm.es/AURORA/"
                  target="_blank"
                  rel="noreferrer"
                  className="transition-opacity hover:opacity-85"
                >
                  <img
                    src={logoSrc}
                    alt="Logotipo de AURORA"
                    className="h-14 w-auto rounded-2xl bg-white/90 p-2 shadow-lg shadow-black/10"
                    onError={() => setLogoFailed(true)}
                  />
                </a>

                <a
                  href="https://gsya.esi.uclm.es/"
                  target="_blank"
                  rel="noreferrer"
                  className="transition-opacity hover:opacity-85"
                >
                  <img
                    src={gsyaLogo}
                    alt="Logotipo de GSYA"
                    className="h-14 w-auto rounded-2xl bg-white/90 p-2 shadow-lg shadow-black/10"
                  />
                </a>

                <a
                  href="https://www.uclm.es/"
                  target="_blank"
                  rel="noreferrer"
                  className="transition-opacity hover:opacity-85"
                >
                  <img
                    src={uclmLogo}
                    alt="Logotipo de UCLM"
                    className="h-14 w-auto rounded-2xl bg-white/90 p-2 shadow-lg shadow-black/10"
                  />
                </a>

              </div>

              <div className="space-y-4">
                <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-primary/80">
                  Proyecto de Investigación <b>SBPLY/24/180225/000074</b>
                </span>
                <h1 className="font-heading text-2xl font-semibold leading-tight text-primary/95 sm:text-3xl">
                  <a
                    href="https://gsya.esi.uclm.es/AURORA/"
                    target="_blank"
                    rel="noreferrer"
                    className="transition-opacity hover:opacity-85"
                  >
                    {auroraMeaning}
                  </a>
                </h1>
              </div>
            </div>

            <div className="rounded-2xl border border-white/15 bg-white/10 p-3">
              <img
                src={fundingLogos}
                alt="Logotipos de cofinanciación: Unión Europea, Ministerio de Hacienda, Fondos Europeos e INNOCAM"
                className="h-20 w-full rounded-xl object-contain sm:h-24"
              />
            </div>
          </div>

          <div className="flex items-center justify-center p-8 sm:p-10 lg:p-12">
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
          </div>
        </section>
      </div>
    </main>
  )
}