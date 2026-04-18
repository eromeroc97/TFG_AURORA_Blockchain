import { Activity, Cookie, ShieldCheck, Sparkles } from 'lucide-react'

const metrics = [
  { label: 'Session transport', value: 'HttpOnly cookies', icon: Cookie },
  { label: 'Router surface', value: 'Traefik /api', icon: ShieldCheck },
  { label: 'Theme policy', value: 'Light only', icon: Sparkles },
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
          El frontend no guarda tokens en localStorage ni sessionStorage. La autenticación
          se apoya en cookies HttpOnly y el cliente solo mantiene estado efímero para la
          navegación entre login y dashboard.
        </p>
      </article>

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
    </section>
  )
}