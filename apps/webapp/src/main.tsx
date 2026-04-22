import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

(globalThis as typeof globalThis & { __WEBAPP_API_BASE_PATH__?: string }).__WEBAPP_API_BASE_PATH__ =
  import.meta.env.VITE_API_BASE_PATH || '/api'

// Load App after configuring API base path so axios picks the correct prefix.
void import('./App.tsx').then(({ default: App }) => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
