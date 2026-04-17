import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

(globalThis as typeof globalThis & { __WEBAPP_API_BASE_PATH__?: string }).__WEBAPP_API_BASE_PATH__ =
  import.meta.env.VITE_API_BASE_PATH

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
