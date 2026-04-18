import { BellRing, House, MapPin, Plus, ShieldAlert, Users, Zap } from 'lucide-react'
import { useMemo } from 'react'
import auroraLogo from '../assets/aurora-logo.png'
import gsyaLogo from '../assets/gsya_logo.png'
import uclmLogo from '../assets/uclm_logo.png'
import ueLogo from '../assets/UE.png'
import mHaciendaLogo from '../assets/MHacienda.png'
import federLogo from '../assets/FEDER.png'
import clmLogo from '../assets/CLM.png'
import AccessMap from '../components/dashboard/AccessMap'
import { ACCESS_MAP_ECOSYSTEMS_MOCK } from '../components/dashboard/access-map.data'
import { SECURITY_ALERTS_MOCK } from '../components/dashboard/dashboard.data'
import { USERS_MOCK } from '../components/dashboard/users.data'
import { useAuth } from '../context/auth-context'

type DashboardMetric = {
  label: string
  value: string
  icon: typeof House
  emphasizeValue?: boolean
  valueClassName?: string
}

export default function Dashboard() {
  const { authClaims } = useAuth()
  const role = (authClaims?.role ?? 'USER').toUpperCase()

  const accessibleEcosystems = useMemo(() => {
    const canViewAll = role === 'AUDITOR' || role === 'ADMIN' || role === 'GLOBAL_ADMIN'

    if (canViewAll) {
      return ACCESS_MAP_ECOSYSTEMS_MOCK
    }

    return ACCESS_MAP_ECOSYSTEMS_MOCK.filter(
      (ecosystem) => ecosystem.ownerId === authClaims?.sub || ecosystem.isShared,
    )
  }, [authClaims?.sub, role])

  const instantiatedEcosystemsCount = useMemo(() => {
    return accessibleEcosystems.length
  }, [accessibleEcosystems])

  const securityAlertsCount = useMemo(() => {
    const canViewAll = role === 'AUDITOR' || role === 'ADMIN' || role === 'GLOBAL_ADMIN'

    if (canViewAll) {
      return SECURITY_ALERTS_MOCK.length
    }

    const accessibleEcosystemIds = new Set(accessibleEcosystems.map((ecosystem) => ecosystem.id))

    return SECURITY_ALERTS_MOCK.filter((alert) => accessibleEcosystemIds.has(alert.ecosystemId)).length
  }, [accessibleEcosystems, role])

  const metrics: DashboardMetric[] = useMemo(
    () => [
      {
        label: 'Ecosistemas instanciados',
        value: String(instantiatedEcosystemsCount),
        icon: House,
      },
      {
        label: 'Alertas de Seguridad',
        value: String(securityAlertsCount),
        icon: BellRing,
        emphasizeValue: true,
        valueClassName: 'text-rose-600',
      },
      {
        label: 'Threat Intelligence',
        value: 'OFFLINE',
        icon: ShieldAlert,
        emphasizeValue: true,
        valueClassName: 'text-rose-600',
      },
    ],
    [instantiatedEcosystemsCount, securityAlertsCount],
  )

  // USER Dashboard: Mis ecosistemas + Compartidos conmigo
  const userOwnedEcosystems = useMemo(() => {
    return ACCESS_MAP_ECOSYSTEMS_MOCK.filter((ecosystem) => ecosystem.ownerId === authClaims?.sub)
  }, [authClaims?.sub])

  const userSharedEcosystems = useMemo(() => {
    return ACCESS_MAP_ECOSYSTEMS_MOCK.filter((ecosystem) => ecosystem.isShared && ecosystem.ownerId !== authClaims?.sub)
  }, [authClaims?.sub])

  // AUDITOR Dashboard: Todos los ecosistemas
  const allEcosystems = useMemo(() => {
    return ACCESS_MAP_ECOSYSTEMS_MOCK
  }, [])

  // ADMIN Dashboard: Usuarios
  const users = useMemo(() => {
    return USERS_MOCK
  }, [])

  const renderUserDashboard = () => (
    <>
      <article className="scroll-mt-28 rounded-[1.75rem] border border-border bg-white p-6 shadow-aurora">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-primary">
            <House className="size-5 text-accent" />
            <h2 className="font-heading text-xl font-semibold">Mis ecosistemas instanciados</h2>
          </div>
          <button className="flex size-10 items-center justify-center rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors">
            <Plus className="size-5" />
          </button>
        </div>
        <p className="mt-3 text-xs text-muted">Ecosistemas que has creado y administras</p>

        <div className="mt-6 space-y-3">
          {userOwnedEcosystems.length > 0 ? (
            userOwnedEcosystems.map((ecosystem) => (
              <div
                key={ecosystem.id}
                className="flex items-center justify-between rounded-lg border border-border/50 bg-surface/30 p-4 hover:border-border hover:bg-surface/50 transition-colors cursor-pointer"
              >
                <div>
                  <p className="font-medium text-primary">{ecosystem.name}</p>
                  <p className="text-xs text-muted mt-1">{ecosystem.devices.length} dispositivos</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-accent/10 text-accent">
                    {ecosystem.isShared ? 'Compartido' : 'Privado'}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-surface/20 p-6 text-center">
              <p className="text-sm text-muted">No tienes ecosistemas creados aún</p>
              <p className="text-xs text-muted/70 mt-1">Usa el botón + para crear tu primer ecosistema</p>
            </div>
          )}
        </div>
      </article>

      <article className="scroll-mt-28 rounded-[1.75rem] border border-border bg-white p-6 shadow-aurora">
        <div className="flex items-center gap-3 text-primary">
          <Zap className="size-5 text-accent" />
          <h2 className="font-heading text-xl font-semibold">Compartidos conmigo</h2>
        </div>
        <p className="mt-3 text-xs text-muted">Ecosistemas que otros usuarios han compartido contigo</p>

        <div className="mt-6 space-y-3">
          {userSharedEcosystems.length > 0 ? (
            userSharedEcosystems.map((ecosystem) => (
              <div
                key={ecosystem.id}
                className="flex items-center justify-between rounded-lg border border-border/50 bg-surface/30 p-4 hover:border-border hover:bg-surface/50 transition-colors cursor-pointer"
              >
                <div>
                  <p className="font-medium text-primary">{ecosystem.name}</p>
                  <p className="text-xs text-muted mt-1">{ecosystem.devices.length} dispositivos • Compartido por otro usuario</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-teal-100 text-teal-700">
                    Acceso de lectura
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-surface/20 p-6 text-center">
              <p className="text-sm text-muted">No tienes ecosistemas compartidos aún</p>
              <p className="text-xs text-muted/70 mt-1">Los ecosistemas que compartan contigo aparecerán aquí</p>
            </div>
          )}
        </div>
      </article>
    </>
  )

  const renderAuditorDashboard = () => (
    <article className="scroll-mt-28 rounded-[1.75rem] border border-border bg-white p-6 shadow-aurora">
      <div className="flex items-center gap-3 text-primary">
        <Zap className="size-5 text-accent" />
        <h2 className="font-heading text-xl font-semibold">Todos los ecosistemas</h2>
      </div>
      <p className="mt-3 text-xs text-muted">Vista completa de todos los ecosistemas instanciados en AURORA</p>

      <div className="mt-6 space-y-3">
        {allEcosystems.map((ecosystem) => (
          <div
            key={ecosystem.id}
            className="flex items-center justify-between rounded-lg border border-border/50 bg-surface/30 p-4 hover:border-border hover:bg-surface/50 transition-colors cursor-pointer group"
          >
            <div>
              <p className="font-medium text-primary group-hover:text-accent transition-colors">{ecosystem.name}</p>
              <p className="text-xs text-muted mt-1">{ecosystem.devices.length} dispositivos • Propietario: {USERS_MOCK.find((u) => u.id === ecosystem.ownerId)?.name}</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="text-xs font-medium px-3 py-1.5 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors">
                Ver detalles
              </button>
            </div>
          </div>
        ))}
      </div>
    </article>
  )

  const renderAdminDashboard = () => (
    <>
      <article className="scroll-mt-28 rounded-[1.75rem] border border-border bg-white p-6 shadow-aurora">
        <div className="flex items-center gap-3 text-primary">
          <Users className="size-5 text-accent" />
          <h2 className="font-heading text-xl font-semibold">Gestión de usuarios</h2>
        </div>
        <p className="mt-3 text-xs text-muted">Administración de usuarios y permisos en la plataforma</p>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="pb-3 text-left font-semibold text-muted">Usuario</th>
                <th className="pb-3 text-left font-semibold text-muted">Email</th>
                <th className="pb-3 text-left font-semibold text-muted">Rol</th>
                <th className="pb-3 text-left font-semibold text-muted">Estado</th>
                <th className="pb-3 text-left font-semibold text-muted">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-surface/30 transition-colors">
                  <td className="py-3 font-medium text-primary">{user.name}</td>
                  <td className="py-3 text-muted">{user.email}</td>
                  <td className="py-3">
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary/10 text-primary">
                      {user.role}
                    </span>
                  </td>
                  <td className="py-3">
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${
                        user.status === 'active'
                          ? 'bg-emerald-100 text-emerald-700'
                          : user.status === 'inactive'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {user.status === 'active' ? 'Activo' : user.status === 'inactive' ? 'Inactivo' : 'Revocado'}
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="flex gap-2">
                      {user.status !== 'revoked' && (
                        <button className="text-xs px-2 py-1 rounded hover:bg-rose-100 hover:text-rose-700 transition-colors text-rose-600">
                          Revocar
                        </button>
                      )}
                      {user.status === 'inactive' && (
                        <button className="text-xs px-2 py-1 rounded hover:bg-emerald-100 hover:text-emerald-700 transition-colors text-emerald-600">
                          Activar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      <article className="scroll-mt-28 rounded-[1.75rem] border border-border bg-white p-6 shadow-aurora">
        <div className="flex items-center gap-3 text-primary">
          <House className="size-5 text-accent" />
          <h2 className="font-heading text-xl font-semibold">Ecosistemas instanciados</h2>
        </div>
        <p className="mt-3 text-xs text-muted">Lista general de ecosistemas (sin información de dispositivos)</p>

        <div className="mt-6 space-y-3">
          {ACCESS_MAP_ECOSYSTEMS_MOCK.map((ecosystem) => (
            <div
              key={ecosystem.id}
              className="flex items-center justify-between rounded-lg border border-border/50 bg-surface/30 p-4 hover:border-border hover:bg-surface/50 transition-colors"
            >
              <div>
                <p className="font-medium text-primary">{ecosystem.name}</p>
                <p className="text-xs text-muted mt-1">Propietario: {USERS_MOCK.find((u) => u.id === ecosystem.ownerId)?.name}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-accent/10 text-accent">
                  {ecosystem.isShared ? 'Compartido' : 'Privado'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </article>
    </>
  )

  return (
    <section className="space-y-8 px-10 py-8 sm:px-12 lg:px-16 xl:px-20">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-accent">
          Proyecto de Investigación SBPLY/24/180225/000074
        </p>
        <h1 className="font-heading text-4xl font-semibold text-primary">
          <b>A</b>dvanced and <b>U</b>nified <b>R</b>esearch <b>O</b>n cybersecurity <b>R</b>isk <b>A</b>nalysis
        </h1>
        <p className="max-w-4xl text-base leading-7 text-muted text-justify">
          AURORA desarrolla un framework sostenible de gestión de riesgos de ciberseguridad para
          hogares inteligentes, con foco en zonas rurales. Combina ontologías, inteligencia de
          enjambre, blockchain, machine learning y computación cuántica.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {metrics.map(({ label, value, icon: Icon, valueClassName, emphasizeValue }) => (
          <article key={label} className="rounded-[1.5rem] border border-border bg-surface p-5 shadow-aurora">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/5 text-primary">
                <Icon className="size-5" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">
                {label}
              </p>
            </div>
            <p
              className={`mt-4 font-semibold text-primary ${
                /^\d+$/.test(value) || emphasizeValue ? 'text-center text-5xl leading-none' : 'text-lg'
              } ${valueClassName ?? ''}`}
            >
              {value}
            </p>
          </article>
        ))}
      </div>

      <article className="rounded-[1.75rem] border border-border bg-white p-6 shadow-aurora">
        <div className="flex items-center gap-3 text-primary">
          <MapPin className="size-5 text-accent" />
          <h2 className="font-heading text-xl font-semibold">Geoespacio AURORA</h2>
        </div>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-muted">
          Vista geoespacial de ecosistemas instanciados en AURORA.
        </p>

        <AccessMap ecosystems={ACCESS_MAP_ECOSYSTEMS_MOCK} />
      </article>

      <article
        id="ecosistemas"
        className="scroll-mt-28 rounded-[1.75rem] border border-border bg-white p-6 shadow-aurora"
      >
        <div id="auditoria" className="scroll-mt-28" />
      </article>

      {role === 'USER' && renderUserDashboard()}
      {role === 'AUDITOR' && renderAuditorDashboard()}
      {(role === 'ADMIN' || role === 'GLOBAL_ADMIN') && renderAdminDashboard()}

      <footer className="rounded-[1.75rem] border border-border bg-white p-6 shadow-aurora">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">
          Entidades participantes
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-6">
          <img src={auroraLogo} alt="Logotipo de AURORA" className="h-12 w-auto object-contain" />
          <img src={gsyaLogo} alt="Logotipo de GSYA" className="h-12 w-auto object-contain" />
          <img src={uclmLogo} alt="Logotipo de UCLM" className="h-12 w-auto object-contain" />
          <img src={ueLogo} alt="Logotipo de la UE" className="h-12 w-auto object-contain" />
          <img src={mHaciendaLogo} alt="Logotipo de Ministerio de Hacienda" className="h-12 w-auto object-contain" />
          <img src={federLogo} alt="Logotipo de FEDER" className="h-12 w-auto object-contain" />
          <img src={clmLogo} alt="Logotipo de CLM" className="h-12 w-auto object-contain" />
        </div>
      </footer>
    </section>
  )
}