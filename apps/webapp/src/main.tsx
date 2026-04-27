import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { setupSeqErrorReporting } from './lib/seq'

/**
 * Configura la ruta base de la API dinámicamente.
 * Permite cambiar el API path sin recompilar.
 */
(globalThis as typeof globalThis & { __WEBAPP_API_BASE_PATH__?: string }).__WEBAPP_API_BASE_PATH__ =
  import.meta.env.VITE_API_BASE_PATH || '/api'

/**
 * Configura el reporte de errores global de la aplicación.
 */
setupSeqErrorReporting()

/**
 * Punto de entrada de la aplicación web.
 * Renderiza el árbol de React en el DOM.
 */
void import('./App.tsx').then(({ default: App }) => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
