import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import DeploymentHelpModal from './DeploymentHelpModal'

Object.assign(navigator, {
  clipboard: { writeText: jest.fn() },
})

describe('DeploymentHelpModal', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the trigger button', () => {
    render(<DeploymentHelpModal />)
    expect(screen.getByText(/¿Cómo despliego un Smart Contract/i)).toBeInTheDocument()
  })

  it('opens modal on click', () => {
    render(<DeploymentHelpModal />)
    fireEvent.click(screen.getByText(/¿Cómo despliego un Smart Contract/i))
    expect(screen.getByText('Guía de Despliegue de Chaincodes (CLI)')).toBeInTheDocument()
  })

  it('copies command to clipboard', async () => {
    const writeTextMock = navigator.clipboard.writeText as jest.Mock
    writeTextMock.mockResolvedValueOnce(undefined)
    render(<DeploymentHelpModal />)
    fireEvent.click(screen.getByText(/¿Cómo despliego un Smart Contract/i))
    const copyButtons = screen.getAllByText('Copiar')
    fireEvent.click(copyButtons[0])
    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith(expect.stringContaining('go mod tidy'))
    })
    expect(await screen.findByText('¡Copiado!')).toBeInTheDocument()
  })

  it('closes modal when clicking backdrop', () => {
    render(<DeploymentHelpModal />)
    fireEvent.click(screen.getByText(/¿Cómo despliego un Smart Contract/i))
    expect(screen.getByText('Guía de Despliegue de Chaincodes (CLI)')).toBeInTheDocument()
    fireEvent.click(document.querySelector('.fixed.inset-0.z-50 .absolute.inset-0')!)
    expect(screen.queryByText('Guía de Despliegue de Chaincodes (CLI)')).not.toBeInTheDocument()
  })

  it('closes modal with Cerrar button', () => {
    render(<DeploymentHelpModal />)
    fireEvent.click(screen.getByText(/¿Cómo despliego un Smart Contract/i))
    fireEvent.click(screen.getByText('Cerrar'))
    expect(screen.queryByText('Guía de Despliegue de Chaincodes (CLI)')).not.toBeInTheDocument()
  })

  it('disables button when disabled prop is true', () => {
    render(<DeploymentHelpModal disabled />)
    expect(screen.getByText(/¿Cómo despliego un Smart Contract/i)).toBeDisabled()
  })
})
