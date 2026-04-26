import type { ReactNode } from 'react'
import auroraLogo from '../../assets/aurora-logo.png'
import gsyaLogo from '../../assets/gsya_logo.png'
import uclmLogo from '../../assets/uclm_logo.png'
import ueLogo from '../../assets/UE.png'
import mHaciendaLogo from '../../assets/MHacienda.png'
import federLogo from '../../assets/FEDER.png'
import clmLogo from '../../assets/CLM.png'

/**
 * Shell (contenedor) para páginas de autenticación.
 * Muestra el branding del proyecto AURORA y logotipos de financiación.
 *
 * @param children - Contenido de la página
 * @returns Componente React
 */
export default function AuthPageShell({ children }: { children: ReactNode }) {
  return (
    <main className="aurora-pattern-bg min-h-screen px-6 py-10 text-primary">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center">
        <section className="grid w-full overflow-hidden rounded-[2rem] border border-border bg-white shadow-aurora lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col justify-between gap-8 bg-primary p-8 text-surface sm:p-10 lg:p-12">
            <div className="max-w-lg space-y-6">
              <div className="inline-flex items-center gap-3 rounded-2xl bg-white/90 p-2 shadow-lg shadow-black/10">
                <a
                  href="https://gsya.esi.uclm.es/AURORA/"
                  target="_blank"
                  rel="noreferrer"
                  className="transition-opacity hover:opacity-85"
                >
                  <img src={auroraLogo} alt="Logotipo de AURORA" className="h-14 w-auto object-contain" />
                </a>

                <a
                  href="https://gsya.esi.uclm.es/"
                  target="_blank"
                  rel="noreferrer"
                  className="transition-opacity hover:opacity-85"
                >
                  <img src={gsyaLogo} alt="Logotipo de GSYA" className="h-14 w-auto object-contain" />
                </a>

                <a
                  href="https://www.uclm.es/"
                  target="_blank"
                  rel="noreferrer"
                  className="transition-opacity hover:opacity-85"
                >
                  <img src={uclmLogo} alt="Logotipo de UCLM" className="h-14 w-auto object-contain" />
                </a>
              </div>

              <div className="space-y-4">
                <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-primary/80">
                  Proyecto de Investigación <b>SBPLY/24/180225/000074</b>
                </span>
                <h1 className="text-justify font-heading text-2xl font-semibold leading-tight text-primary/95 sm:text-3xl">
                  <a
                    href="https://gsya.esi.uclm.es/AURORA/"
                    target="_blank"
                    rel="noreferrer"
                    className="transition-opacity hover:opacity-85"
                  >
                    <b>A</b>dvanced and <b>U</b>nified <b>R</b>esearch <b>O</b>n cybersecurity <b>R</b>isk <b>A</b>nalysis and sustainability in smart homes
                  </a>
                </h1>
              </div>
            </div>

            <div className="rounded-2xl border border-white/15 bg-white/10 p-3">
              <div className="flex items-center justify-center gap-2 rounded-xl bg-white/90 px-2 py-2">
                <img src={ueLogo} alt="Logotipo de la UE" className="h-8 w-auto object-contain" />
                <img
                  src={mHaciendaLogo}
                  alt="Logotipo de Ministerio de Hacienda"
                  className="h-8 w-auto object-contain"
                />
                <img src={federLogo} alt="Logotipo de FEDER" className="h-8 w-auto object-contain" />
                <img src={clmLogo} alt="Logotipo de CLM" className="h-8 w-auto object-contain" />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center p-8 sm:p-10 lg:p-12">{children}</div>
        </section>
      </div>
    </main>
  )
}