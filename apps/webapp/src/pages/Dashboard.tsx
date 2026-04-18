import { Activity, Cookie, ShieldCheck, Sparkles } from 'lucide-react'
import auroraLogo from '../assets/aurora-logo.png'
import gsyaLogo from '../assets/gsya_logo.png'
import uclmLogo from '../assets/uclm_logo.png'
import fundingLogos from '../assets/MostrarUE-MA-Feder-Innocam.jpg'
import AccessMap from '../components/dashboard/AccessMap'

const metrics = [
  { label: 'Session transport', value: 'HttpOnly cookies', icon: Cookie },
  { label: 'Router surface', value: 'Traefik /api', icon: ShieldCheck },
  { label: 'Theme policy', value: 'Light only', icon: Sparkles },
]

const quickHighlights = [
  {
    title: 'Estado de plataforma',
    description: 'Todos los servicios críticos reportan disponibilidad dentro del umbral esperado.',
  },
  {
    title: 'Integración IoT',
    description: 'Canales de telemetría en fase de calibración para reglas de riesgo personalizadas.',
  },
  {
    title: 'Gobernanza de datos',
    description: 'Controles de trazabilidad preparados para auditar cambios en identidades y dispositivos.',
  },
]

const roadmapMock = [
  { phase: 'Fase 1', milestone: 'Consolidar identidades y perfiles', status: 'Completada' },
  { phase: 'Fase 2', milestone: 'Habilitar paneles de ecosistemas', status: 'En progreso' },
  { phase: 'Fase 3', milestone: 'Activar auditoría avanzada', status: 'Planificada' },
]

const moduleActivity = [
  { module: 'Auth', owner: 'Equipo IAM', lastUpdate: 'Hace 2 horas', state: 'Estable' },
  { module: 'IoT Manager', owner: 'Equipo Edge', lastUpdate: 'Hace 5 horas', state: 'Monitorizando' },
  { module: 'Blockchain', owner: 'Equipo Ledger', lastUpdate: 'Hace 1 día', state: 'Estable' },
]

export default function Dashboard() {
  return (
    <section className="space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-accent">
          Dashboard provisional
        </p>
        <h1 className="font-heading text-4xl font-semibold text-primary">
          Panel principal de AURORA
        </h1>
        <p className="max-w-3xl text-base leading-7 text-muted">
          Esta ruta ya está protegida de forma provisional por el router del frontend y
          preparada para funcionar con sesión por cookies cuando el backend exponga la
          validación completa.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {metrics.map(({ label, value, icon: Icon }) => (
          <article
            key={label}
            className="rounded-[1.5rem] border border-border bg-surface p-5 shadow-aurora"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/5 text-primary">
                <Icon className="size-5" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">
                {label}
              </p>
            </div>
            <p className="mt-4 text-lg font-semibold text-primary">{value}</p>
          </article>
        ))}
      </div>

      <article className="rounded-[1.75rem] border border-border bg-white p-6 shadow-aurora">
        <div className="flex items-center gap-3 text-primary">
          <Activity className="size-5 text-accent" />
          <h2 className="font-heading text-xl font-semibold">Arquitectura de acceso</h2>
        </div>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-muted">
          Vista geoespacial de ecosistemas con control de visibilidad por rol en frontend.
          USER y AUDITOR pueden consultar dispositivos según permisos, mientras que
          ADMIN/GLOBAL_ADMIN visualizan el estado sin detalle sensible.
        </p>

        <AccessMap />
      </article>

      <section className="grid gap-4 lg:grid-cols-3">
        {quickHighlights.map((item) => (
          <article
            key={item.title}
            className="rounded-[1.5rem] border border-border bg-white p-5 shadow-aurora"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">Resumen</p>
            <h3 className="mt-2 font-heading text-lg font-semibold text-primary">{item.title}</h3>
            <p className="mt-3 text-sm leading-7 text-muted">{item.description}</p>
          </article>
        ))}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section
          id="ecosistemas"
          className="scroll-mt-28 rounded-[1.75rem] border border-border bg-white p-6 shadow-aurora"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">
            Ecosistemas
          </p>
          <h2 className="mt-3 font-heading text-xl font-semibold text-primary">
            Visión de módulos y dominios
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted">
            Punto de entrada para los módulos funcionales del ecosistema AURORA. Aquí se agruparán las
            vistas operativas por dominio y capacidad.
          </p>
        </section>

        <section
          id="auditoria"
          className="scroll-mt-28 rounded-[1.75rem] border border-border bg-white p-6 shadow-aurora"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">
            Auditoría
          </p>
          <h2 className="mt-3 font-heading text-xl font-semibold text-primary">
            Trazabilidad y supervisión
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted">
            Sección reservada para eventos, revisiones y controles de seguridad. Encaja con el header
            superior y deja preparada la arquitectura para futuras vistas de auditoría.
          </p>
        </section>
      </div>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-[1.75rem] border border-border bg-white p-6 shadow-aurora">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">Roadmap mock</p>
          <h2 className="mt-3 font-heading text-xl font-semibold text-primary">Hoja de ruta operativa</h2>
          <ul className="mt-5 space-y-4">
            {roadmapMock.map((item) => (
              <li key={item.phase} className="rounded-2xl border border-border bg-surface px-4 py-3">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-semibold text-primary">{item.phase}</p>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    {item.status}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted">{item.milestone}</p>
              </li>
            ))}
          </ul>
        </article>

        <article className="rounded-[1.75rem] border border-border bg-white p-6 shadow-aurora">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">
            Actividad de módulos
          </p>
          <h2 className="mt-3 font-heading text-xl font-semibold text-primary">Pulso del ecosistema</h2>
          <div className="mt-5 space-y-3">
            {moduleActivity.map((moduleItem) => (
              <div key={moduleItem.module} className="rounded-2xl border border-border bg-surface p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-primary">{moduleItem.module}</p>
                  <span className="text-xs font-semibold text-accent">{moduleItem.state}</span>
                </div>
                <p className="mt-2 text-xs text-muted">Responsable: {moduleItem.owner}</p>
                <p className="mt-1 text-xs text-muted">Última actualización: {moduleItem.lastUpdate}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <footer className="rounded-[1.75rem] border border-border bg-white p-6 shadow-aurora">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">
          Entidades participantes
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-6">
          <img src={auroraLogo} alt="Logotipo de AURORA" className="h-12 w-auto object-contain" />
          <img src={gsyaLogo} alt="Logotipo de GSYA" className="h-12 w-auto object-contain" />
          <img src={uclmLogo} alt="Logotipo de UCLM" className="h-12 w-auto object-contain" />
          {/* TODO: separar los logotipos incluidos en MostrarUE-MA-Feder-Innocam.jpg en assets individuales. */}
          <img
            src={fundingLogos}
            alt="Logotipos MostrarUE"
            className="h-14 w-auto rounded-md object-contain"
          />
        </div>
      </footer>
    </section>
  )
}