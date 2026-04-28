# Aurora Design System

Esta carpeta contiene los tokens y la configuración básica que permiten reutilizar el estilo de `apps/webapp` en otro proyecto React + Tailwind.

## Qué incluye

- `src/design-system/theme.ts`
  - Exporta los tokens de color, tipografía y sombra usados en el proyecto.
- `tailwind.config.js`
  - Ya exporta un token `auroraTheme` reutilizable.
- `src/index.css`
  - Contiene las reglas globales e importación de Tailwind.
  - Incluye el fondo de patrón reusable `.aurora-pattern-bg`.

## Cómo usarlo en otro proyecto React + Tailwind

1. Instala dependencias:

```bash
npm install tailwindcss@4 @tailwindcss/vite
```

2. Copia estos archivos al nuevo proyecto en las mismas rutas relativas:

- `apps/webapp/tailwind.config.js` → `/tailwind.config.js`
- `apps/webapp/vite.config.ts` → `/vite.config.ts`
- `apps/webapp/src/index.css` → `/src/index.css`
- `apps/webapp/src/design-system/theme.ts` → `/src/design-system/theme.ts`

3. Instala las dependencias necesarias en el proyecto nuevo:

```bash
npm install -D tailwindcss@4 @tailwindcss/vite @vitejs/plugin-react
npm install react react-dom
```

4. Configura Vite en `/vite.config.ts`:

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

5. Importa los estilos globales en `src/main.tsx` o `src/index.tsx`:

```ts
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

6. Ejecuta los comandos para iniciar y verificar la plantilla:

```bash
npm run dev
npm run build
```

7. Usa las clases y tokens del tema:

- `<div className="aurora-pattern-bg">...` para el fondo de patrón
- `bg-surface`, `text-primary`, `border-border`, `shadow-aurora`, `font-heading`
- `text-muted` para texto secundario

## Tokens principales

- Colores:
  - `primary` → `#0A2540`
  - `accent` → `#14B8A6`
  - `background` → `#F9FAFB`
  - `surface` → `#FFFFFF`
  - `muted` → `#64748B`
  - `border` → `#D9E2EC`

- Tipografía:
  - `sans`: `Manrope`
  - `heading`: `Space Grotesk`

- Sombra:
  - `shadow-aurora`: `0 20px 60px rgba(10, 37, 64, 0.10)`

## Recomendación

Mantén los componentes de página usando:
- `rounded-3xl`, `rounded-[1.75rem]`
- `border border-border`
- `bg-white` / `bg-surface`
- `text-primary`, `text-muted`
- `shadow-sm` / `shadow-aurora`

Esto asegura que la plantilla permanezca consistente y fácil de migrar.
