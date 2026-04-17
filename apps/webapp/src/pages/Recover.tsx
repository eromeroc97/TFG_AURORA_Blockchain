import axios from 'axios'
import { ArrowRight, Info, Mail, X } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { apiClient } from '../api/axios'
import auroraLogo from '../assets/aurora-logo.png'
import gsyaLogo from '../assets/gsya_logo.png'
import uclmLogo from '../assets/uclm_logo.png'
import fundingLogos from '../assets/MostrarUE-MA-Feder-Innocam.jpg'

const auroraMeaning =
  'Advanced and Unified Research On cybersecurity Risk Analysis and sustainability in smart homes'

export default function Recover() {
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [toastMessage, setToastMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [, setLogoFailed] = useState(false)

  useEffect(() => {
    const state = location.state as
      | { forcedRecoverMessage?: string; prefillEmail?: string }
      | null
      | undefined

    if (state?.forcedRecoverMessage) {
      setToastMessage(state.forcedRecoverMessage)
      setErrorMessage(state.forcedRecoverMessage)
    }

    if (state?.prefillEmail) {
      setEmail(state.prefillEmail)
    }
  }, [location.state])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')
    setIsSubmitting(true)

    try {
      await apiClient.post(
        '/auth/recover',
        { email },
        {
          skipAuthRefresh: true,
        },
      )
      setSuccessMessage('Si el correo existe, recibirás instrucciones para recuperar tu acceso.')
      setEmail('')
    } catch (error) {
      if (axios.isAxiosError(error) && !error.response) {
        setErrorMessage(
          'No se pudo contactar con el servicio de recuperación. Revisa la conexión e inténtalo de nuevo.',
        )
      } else {
        setErrorMessage('No se pudo procesar la recuperación ahora mismo. Inténtalo de nuevo en unos minutos.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen px-6 py-10 text-primary">
      {toastMessage ? (
        <div className="fixed right-6 top-6 z-50 max-w-md rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-aurora">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 size-4 shrink-0" />
            <p className="leading-5">{toastMessage}</p>
            <button
              type="button"
              onClick={() => setToastMessage('')}
              className="ml-auto rounded-lg p-1 text-amber-700 transition-colors hover:bg-amber-100"
              aria-label="Cerrar aviso"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      ) : null}

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
                    src={auroraLogo}
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
                  Recuperar Acceso
                </p>
                <h2 className="font-heading text-3xl font-semibold text-primary">
                  He olvidado mi contraseña
                </h2>
                <p className="text-sm leading-6 text-muted">
                  Te enviaremos un enlace para restablecer la contraseña y recuperar el acceso a tu
                  cuenta.
                </p>
              </div>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-primary">Email de la cuenta</span>
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
                {isSubmitting ? 'Enviando...' : 'Enviar enlace de recuperacion'}
                <ArrowRight className="size-4" />
              </button>

              <div className="grid grid-cols-2 gap-3 text-xs text-muted">
                <Link to="/login" className="underline-offset-2 transition-colors hover:text-accent hover:underline">
                  Iniciar sesión
                </Link>
                <Link
                  to="/register"
                  className="text-right underline-offset-2 transition-colors hover:text-accent hover:underline"
                >
                  Crear cuenta
                </Link>
              </div>
            </form>
          </div>
        </section>
      </div>
    </main>
  )
}
