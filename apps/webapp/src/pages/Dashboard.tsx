import { BellRing, House, MapPin, ShieldAlert } from 'lucide-react'
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
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">Resumen operativo</p>
        <h2 className="mt-3 font-heading text-xl font-semibold text-primary">
          Preparado para especialización por rol
        </h2>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-muted">
          Se consolida una vista base unificada para la fase previa a la especialización. En el siguiente
          paso se desplegará contenido diferenciado para USER, AUDITOR, ADMIN y GLOBAL_ADMIN sobre esta
          misma estructura.
        </p>
      </article>

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