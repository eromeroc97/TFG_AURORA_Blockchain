import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import GoDragDropZone from './GoDragDropZone'
import { ContractAPIError } from '../../utils/goParser'

const mockParseGoCodeToFFI = jest.fn()
jest.mock('../../utils/goParser', () => ({
  parseGoCodeToFFI: (...args: unknown[]) => mockParseGoCodeToFFI(...args),
  ContractAPIError: class ContractAPIError extends Error {},
}))

function createMockFile(name: string, content: string, type = 'text/plain'): File {
  const blob = new Blob([content], { type })
  const file = new File([blob], name, { type })
  file.text = jest.fn().mockResolvedValue(content) as File['text']
  return file
}

describe('GoDragDropZone', () => {
  const onJsonGenerated = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the drop zone', () => {
    render(<GoDragDropZone onJsonGenerated={onJsonGenerated} />)
    expect(screen.getByText(/Arrastra un archivo .go aquí/i)).toBeInTheDocument()
  })

  it('handles file selection with .go file', async () => {
    mockParseGoCodeToFFI.mockReturnValue({ ffi: 'test' })
    const { container } = render(<GoDragDropZone onJsonGenerated={onJsonGenerated} />)
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    const file = createMockFile('test.go', 'package main')
    fireEvent.change(input, { target: { files: [file] } })
    await waitFor(() => {
      expect(mockParseGoCodeToFFI).toHaveBeenCalledWith('package main')
    })
    expect(onJsonGenerated).toHaveBeenCalled()
  })

  it('shows error for non-.go file', async () => {
    const { container } = render(<GoDragDropZone onJsonGenerated={onJsonGenerated} />)
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    const file = createMockFile('test.txt', 'not go content')
    fireEvent.change(input, { target: { files: [file] } })
    await waitFor(() => {
      expect(screen.getByText('Solo se admiten archivos .go')).toBeInTheDocument()
    })
  })

  it('handles ContractAPIError', async () => {
    mockParseGoCodeToFFI.mockImplementation(() => { throw new ContractAPIError('not contract API') })
    const { container } = render(<GoDragDropZone onJsonGenerated={onJsonGenerated} />)
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    const file = createMockFile('bad.go', 'package main')
    fireEvent.change(input, { target: { files: [file] } })
    await waitFor(() => {
      expect(screen.getByText(/Hyperledger Fabric/)).toBeInTheDocument()
    })
  })

  it('handles generic parse error', async () => {
    mockParseGoCodeToFFI.mockImplementation(() => { throw new Error('generic') })
    const { container } = render(<GoDragDropZone onJsonGenerated={onJsonGenerated} />)
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    const file = createMockFile('bad.go', 'package main')
    fireEvent.change(input, { target: { files: [file] } })
    await waitFor(() => {
      expect(screen.getByText('Error al procesar el archivo')).toBeInTheDocument()
    })
  })

  it('handles drag over and drag leave', () => {
    render(<GoDragDropZone onJsonGenerated={onJsonGenerated} />)
    const dropZone = screen.getByText(/Arrastra un archivo .go aquí/i).closest('[class*="border-2"]')!
    fireEvent.dragOver(dropZone)
    expect(screen.getByText('Suelta el archivo')).toBeInTheDocument()
    fireEvent.dragLeave(dropZone)
    expect(screen.getByText(/Arrastra un archivo .go aquí/i)).toBeInTheDocument()
  })
})
