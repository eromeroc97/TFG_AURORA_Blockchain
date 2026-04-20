import { AlertTriangle, CheckCircle2, LockKeyhole, Shield, User } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/auth-context'

type UserAccount = {
  email: string
  role: string
}

export default function AccountPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { authClaims, isHydrating } = useAuth()
  const [user, setUser] = useState<UserAccount | null>(null)
  const [uuidFromUrl, setUuidFromUrl] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const hasCapturedUuidRef = useRef(false)
  const timeoutRef = useRef<number | null>(null)

  useEffect(() => {
    if (authClaims) {
      setUser({
        email: authClaims.email,
        role: authClaims.role,
      })
    }
  }, [authClaims])

  useEffect(() => {
    const uuid = (searchParams.get('uuid') ?? searchParams.get('id') ?? '').trim()

    if (uuid && !hasCapturedUuidRef.current) {
      setUuidFromUrl(uuid)
      hasCapturedUuidRef.current = true
      navigate('/account', { replace: true })
      return
    }

    if (!uuid && !hasCapturedUuidRef.current) {
      setUuidFromUrl('')
    }
  }, [navigate, searchParams])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  if (!isHydrating && !authClaims) {
    return <Navigate to="/login" replace />
  }

  if (!user) {
    return (
      <div className="mx-auto flex w-full max-w-2xl items-center px-4 py-8 sm:px-6 lg:px-0">
        <div className="rounded-2xl border border-white/20 bg-white/80 px-6 py-5 shadow-aurora backdrop-blur-md">
          Cargando información de cuenta...
        </div>
      </div>
    )
  }

  const roleLabel = user.role.replace('_', ' ')

  const handleRequestPasswordChange = () => {
    setFeedbackMessage('')
    setIsModalOpen(true)
  }

  const handleConfirmPasswordChange = () => {
    setIsSubmitting(true)
    setFeedbackMessage('')

    timeoutRef.current = window.setTimeout(() => {
      setIsSubmitting(false)
      setIsModalOpen(false)
      setFeedbackMessage('Se ha enviado el enlace de recuperación y la sesión actual se cerrará por seguridad.')
      navigate('/login', { replace: true })
    }, 1000)
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8 sm:px-6 lg:px-0">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-teal-600">
          Gestión de Cuenta
        </p>
        <h1 className="text-3xl font-semibold text-slate-900 sm:text-4xl">
          Perfil y seguridad de AURORA
        </h1>
        <p className="max-w-xl text-sm leading-7 text-slate-600">
          Gestiona la identidad institucional y las opciones de seguridad desde un entorno claro y
          centralizado.
        </p>
      </div>

      {/* TODO: implementar dashboards específicos por rol (Investigador/Admin). */}

      {uuidFromUrl ? (
        <div className="flex items-center gap-2 rounded-2xl border border-teal-100 bg-teal-50 px-4 py-3 text-sm text-teal-800 shadow-sm">
          <CheckCircle2 className="size-4 shrink-0" />
          Se ha detectado un identificador de cuenta en la URL y se ha limpiado automáticamente.
        </div>
      ) : null}

      {feedbackMessage ? (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-sm">
          <CheckCircle2 className="size-4 shrink-0" />
          {feedbackMessage}
        </div>
      ) : null}

      <section className="rounded-2xl border border-gray-100 bg-white/95 shadow-xl backdrop-blur-sm">
        <div className="border-b border-gray-100 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
                <User className="size-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Información de Identidad</h2>
                <p className="text-sm text-slate-500">Datos institucionales y rol actual</p>
              </div>
            </div>
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${
                user.role === 'ADMIN' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              {roleLabel}
            </span>
          </div>
        </div>

        <div className="space-y-4 px-6 py-6">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Email Institucional</span>
            <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-slate-50 px-4 py-3 text-slate-500 shadow-sm">
              <LockKeyhole className="size-4 shrink-0 text-slate-400" />
              <input
                type="email"
                value={user.email}
                readOnly
                disabled
                aria-readonly="true"
                className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-100"
              />
            </div>
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-100 bg-white/95 shadow-xl backdrop-blur-sm">
        <div className="border-b border-gray-100 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
              <Shield className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Seguridad de la Cuenta</h2>
              <p className="text-sm text-slate-500">Cambia la contraseña sin exponer información sensible</p>
            </div>
          </div>
        </div>

        <div className="space-y-5 px-6 py-6">
          <p className="text-sm leading-7 text-slate-600">
            Solicitar un cambio de contraseña forzará el cierre de sesión en todos los dispositivos por
            seguridad y enviará un enlace de recuperación al correo institucional.
          </p>

          <button
            type="button"
            onClick={handleRequestPasswordChange}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-600/20 transition-colors hover:bg-teal-700"
          >
            <LockKeyhole className="size-4" />
            Solicitar Cambio de Contraseña
          </button>
        </div>
      </section>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-gray-100 bg-white/95 shadow-2xl backdrop-blur-sm">
            <div className="border-b border-gray-100 px-6 py-5">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex size-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                  <AlertTriangle className="size-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Confirmación de seguridad</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    ¿Estás seguro? Se enviará un enlace de recuperación a tu correo y tu sesión actual se
                    cerrará por seguridad.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 px-6 py-6 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  if (!isSubmitting) {
                    setIsModalOpen(false)
                  }
                }}
                className="inline-flex items-center justify-center rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmPasswordChange}
                disabled={isSubmitting}
                className="inline-flex items-center justify-center rounded-2xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? 'Procesando...' : 'Confirmar y Cerrar Sesión'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
