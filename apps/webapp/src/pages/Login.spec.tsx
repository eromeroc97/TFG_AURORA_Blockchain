import { MemoryRouter } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import { AuthProvider } from '../context/AuthProvider'
import Login from './Login'

describe('Login page', () => {
  it('renders AURORA title and initial meaning text', () => {
    render(
      <AuthProvider>
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      </AuthProvider>,
    )

    expect(screen.getByRole('heading', { name: 'AURORA' })).toBeInTheDocument()
    expect(
      screen.getByText(/Investigación Unificada Avanzada sobre Análisis de Riesgos/i),
    ).toBeInTheDocument()
  })
})
