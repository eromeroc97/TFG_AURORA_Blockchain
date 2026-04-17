import axios from 'axios'
import { ArrowRight, Check, LockKeyhole, LoaderCircle, ShieldAlert, ShieldCheck, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { apiClient } from '../api/axios'
import AuthPageShell from '../components/auth/AuthPageShell'
import PasswordInput from '../components/PasswordInput'

export default function Reset() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [tokenValidationState, setTokenValidationState] = useState<'checking' | 'valid' | 'invalid'>('checking')
  const [hibpState, setHibpState] = useState<'idle' | 'checking' | 'safe' | 'pwned' | 'error'>('idle')
  const [hibpCount, setHibpCount] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const hibpCacheRef = useRef(new Map<string, { state: 'safe' | 'pwned'; count: number | null }>())
  const hibpCheckIdRef = useRef(0)

  const token = (searchParams.get('token') ?? '').trim()
  const hasValidTokenFormat = /^[A-Za-z0-9_-]{20,200}$/.test(token)

  useEffect(() => {
    if (!hasValidTokenFormat) {
      setTokenValidationState('invalid')
      return
    }

    let isMounted = true
    setTokenValidationState('checking')

    void apiClient
      .post(
        '/auth/reset/validate',
        { token },
        {
          skipAuthRefresh: true,
        },
      )
      .then((response) => {
        if (!isMounted) {
          return
        }

        const isValid = response.data?.valid === true
        setTokenValidationState(isValid ? 'valid' : 'invalid')
      })
      .catch(() => {
        if (!isMounted) {
          return
        }

        setTokenValidationState('invalid')
      })

    return () => {
      isMounted = false
    }
  }, [hasValidTokenFormat, token])

  const hasLowercase = /[a-z]/.test(password)
  const hasUppercase = /[A-Z]/.test(password)
  const hasNumber = /\d/.test(password)
  const hasSymbol = /[^A-Za-z0-9]/.test(password)

  const passwordChecks = useMemo(
    () => [
      {
        id: 'length-10',
        label: 'Mínimo 10 caracteres',
        passed: password.length >= 10,
      },
      {
        id: 'lowercase',
        label: 'Al menos una letra minúscula',
        passed: hasLowercase,
      },
      {
        id: 'uppercase',
        label: 'Al menos una letra mayúscula',
        passed: hasUppercase,
      },
      {
        id: 'number',
        label: 'Al menos un número',
        passed: hasNumber,
      },
      {
        id: 'symbol',
        label: 'Al menos un símbolo',
        passed: hasSymbol,
      },
    ],
    [password, hasLowercase, hasUppercase, hasNumber, hasSymbol],
  )

  const isPolicyValid = passwordChecks.every((check) => check.passed)

  const checkPasswordPwned = useCallback(
    async (candidatePassword: string) => {
      if (!candidatePassword || !isPolicyValid) {
        setHibpState('idle')
        setHibpCount(null)
        return 'idle' as const
      }

      const cachedResult = hibpCacheRef.current.get(candidatePassword)
      if (cachedResult) {
        setHibpCount(cachedResult.count)
        setHibpState(cachedResult.state)
        return cachedResult.state
      }

      const checkId = hibpCheckIdRef.current + 1
      hibpCheckIdRef.current = checkId

      setHibpState('checking')
      setHibpCount(null)

      try {
        const digestBuffer = await crypto.subtle.digest(
          'SHA-1',
          new TextEncoder().encode(candidatePassword),
        )
        const hashHex = Array.from(new Uint8Array(digestBuffer))
          .map((byte) => byte.toString(16).padStart(2, '0'))
          .join('')
          .toUpperCase()

        const hashPrefix = hashHex.slice(0, 5)
        const hashSuffix = hashHex.slice(5)

        const response = await fetch(`https://api.pwnedpasswords.com/range/${hashPrefix}`, {
          headers: {
            'Add-Padding': 'true',
          },
        })

        if (!response.ok) {
          throw new Error('HIBP request failed')
        }

        const body = await response.text()
        const match = body
          .split('\n')
          .map((line) => line.trim())
          .find((line) => line.toUpperCase().startsWith(`${hashSuffix}:`))

        if (checkId !== hibpCheckIdRef.current) {
          return 'idle' as const
        }

        if (match) {
          const count = Number(match.split(':')[1] ?? '0')
          const leakedCount = Number.isFinite(count) ? count : null
          hibpCacheRef.current.set(candidatePassword, { state: 'pwned', count: leakedCount })
          setHibpCount(leakedCount)
          setHibpState('pwned')
          return 'pwned' as const
        }

        hibpCacheRef.current.set(candidatePassword, { state: 'safe', count: null })
        setHibpState('safe')
        return 'safe' as const
      } catch {
        if (checkId === hibpCheckIdRef.current) {
          setHibpState('error')
        }

        return 'error' as const
      }
    },
    [isPolicyValid],
  )

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage('')

    if (tokenValidationState !== 'valid') {
      setErrorMessage('El token de recuperación no es válido. Solicita un nuevo enlace.')
      return
    }

    if (!isPolicyValid) {
      setErrorMessage('Revisa los requisitos de contraseña antes de continuar.')
      return
    }

    if (password !== confirmPassword) {
      setErrorMessage('Las contraseñas no coinciden. Revisa ambos campos.')
      return
    }

    const hibpResult = await checkPasswordPwned(password)

    if (hibpResult === 'pwned') {
      setErrorMessage('La contraseña propuesta aparece en filtraciones públicas. Debes elegir una diferente.')
      return
    }

    setIsSubmitting(true)

    try {
      await apiClient.post(
        '/auth/reset',
        { token, password },
        {
          skipAuthRefresh: true,
        },
      )

      navigate('/login', { replace: true })
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 400) {
        setErrorMessage('El token de recuperación es inválido o ha expirado. Solicita uno nuevo.')
      } else {
        setErrorMessage('No se pudo actualizar la contraseña. Inténtalo de nuevo en unos minutos.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!hasValidTokenFormat) {
    return (
      <Navigate
        to="/recover"
        replace
        state={{
          forcedRecoverMessage:
            'El enlace de restablecimiento no es válido o está incompleto. Solicita un nuevo enlace.',
        }}
      />
    )
  }

  if (tokenValidationState === 'checking') {
    return (
      <AuthPageShell>
        <div className="w-full max-w-md rounded-2xl border border-border bg-background px-5 py-6 text-sm text-primary">
          <p className="flex items-center gap-2">
            <LoaderCircle className="size-4 animate-spin" />
            Validando enlace de recuperación...
          </p>
        </div>
      </AuthPageShell>
    )
  }

  if (tokenValidationState === 'invalid') {
    return (
      <Navigate
        to="/recover"
        replace
        state={{
          forcedRecoverMessage:
            'El enlace de restablecimiento no es válido, ha expirado o ya fue utilizado. Solicita uno nuevo.',
        }}
      />
    )
  }

  return (
    <AuthPageShell>
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-6">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-accent">
                  Restablecer contraseña
                </p>
                <h2 className="font-heading text-3xl font-semibold text-primary">
                  Define tu nueva contraseña
                </h2>
                <p className="text-sm leading-6 text-muted">
                  Introduce una nueva contraseña para completar el restablecimiento con tu token de un solo uso.
                </p>
              </div>

              <div className="space-y-4">
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-primary">Contraseña</span>
                  <div className="flex items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3 focus-within:border-accent">
                    <LockKeyhole className="size-4 shrink-0 text-muted" />
                    <PasswordInput
                      name="password"
                      autoComplete="new-password"
                      required
                      value={password}
                      onChange={(event) => {
                        setPassword(event.target.value)
                        setHibpState('idle')
                        setHibpCount(null)
                      }}
                      onBlur={() => {
                        void checkPasswordPwned(password)
                      }}
                      className="w-full border-0 bg-transparent text-sm text-primary outline-none placeholder:text-muted"
                      placeholder="Nueva contraseña"
                    />
                  </div>
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-primary">Confirmar contraseña</span>
                  <div className="flex items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3 focus-within:border-accent">
                    <LockKeyhole className="size-4 shrink-0 text-muted" />
                    <PasswordInput
                      name="confirmPassword"
                      autoComplete="new-password"
                      required
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      className="w-full border-0 bg-transparent text-sm text-primary outline-none placeholder:text-muted"
                      placeholder="Repite la nueva contraseña"
                    />
                  </div>
                </label>
              </div>

              <div className="rounded-2xl border border-border bg-background px-4 py-3 text-xs text-muted">
                <p className="mb-2 font-semibold text-primary">Política de seguridad de contraseña</p>
                <ul className="space-y-2">
                  {passwordChecks.map((check) => (
                    <li key={check.id} className="flex items-center gap-2">
                      {check.passed ? (
                        <Check className="size-4 text-emerald-600" aria-hidden="true" />
                      ) : (
                        <X className="size-4 text-rose-600" aria-hidden="true" />
                      )}
                      <span>{check.label}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-3 rounded-xl border border-border/70 bg-white px-3 py-2">
                  {hibpState === 'checking' ? (
                    <p className="flex items-center gap-2 text-primary">
                      <LoaderCircle className="size-4 animate-spin" />
                      Comprobando filtraciones públicas (HIBP)...
                    </p>
                  ) : null}

                  {hibpState === 'safe' ? (
                    <p className="flex items-center gap-2 text-emerald-700">
                      <ShieldCheck className="size-4" />
                      No se encontraron coincidencias públicas para esta contraseña.
                    </p>
                  ) : null}

                  {hibpState === 'pwned' ? (
                    <p className="flex items-center gap-2 text-rose-700">
                      <ShieldAlert className="size-4" />
                      Esta contraseña aparece en filtraciones públicas
                      {hibpCount !== null ? ` (${hibpCount} veces)` : ''}. Usa otra diferente.
                    </p>
                  ) : null}

                  {hibpState === 'error' ? (
                    <p className="text-amber-700">
                      No se pudo verificar HIBP en este momento. Puedes continuar, pero se recomienda volver
                      a comprobar antes de guardar.
                    </p>
                  ) : null}
                </div>
              </div>

              {errorMessage ? (
                <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {errorMessage}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting || !isPolicyValid || password !== confirmPassword || hibpState === 'checking' || hibpState === 'pwned'}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-accent px-5 py-3 text-sm font-semibold text-primary shadow-aurora disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? 'Aplicando...' : 'Guardar contraseña'}
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
                  Volver a recuperación
                </Link>
              </div>
      </form>
    </AuthPageShell>
  )
}
