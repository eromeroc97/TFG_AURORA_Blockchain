import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

/**
 * Configura la ruta base de la API antes de cargar la app.
 * Usado para inyección en build (Vite).
 */
(globalThis as typeof globalThis & { __WEBAPP_API_BASE_PATH__?: string }).__WEBAPP_API_BASE_PATH__ =
  import.meta.env.VITE_API_BASE_PATH || '/api'

/**
 * Punto de entrada de la aplicación React.
 * Carga el App de forma dinámica tras configurar la API.
 */
void import('./App.tsx').then(({ default: App }) => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
