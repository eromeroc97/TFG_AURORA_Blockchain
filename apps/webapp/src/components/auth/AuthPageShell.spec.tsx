import { render, screen } from '@testing-library/react'
import AuthPageShell from './AuthPageShell'

describe('AuthPageShell', () => {
  it('renders children', () => {
    render(<AuthPageShell><div>child content</div></AuthPageShell>)
    expect(screen.getByText('child content')).toBeInTheDocument()
  })

  it('renders logos and project info', () => {
    render(<AuthPageShell><div>content</div></AuthPageShell>)
    expect(screen.getByAltText('Logotipo de AURORA')).toBeInTheDocument()
    expect(screen.getByAltText('Logotipo de GSYA')).toBeInTheDocument()
    expect(screen.getByAltText('Logotipo de UCLM')).toBeInTheDocument()
    expect(screen.getByText(/Proyecto de Investigación/)).toBeInTheDocument()
  })

  it('renders funding logos', () => {
    render(<AuthPageShell><div>content</div></AuthPageShell>)
    expect(screen.getByAltText('Logotipo de la UE')).toBeInTheDocument()
    expect(screen.getByAltText('Logotipo de FEDER')).toBeInTheDocument()
    expect(screen.getByAltText('Logotipo de CLM')).toBeInTheDocument()
  })

  it('has links to AURORA project page', () => {
    render(<AuthPageShell><div>content</div></AuthPageShell>)
    const links = screen.getAllByRole('link')
    expect(links.some(l => l.getAttribute('href') === 'https://gsya.esi.uclm.es/AURORA/')).toBe(true)
  })
})
