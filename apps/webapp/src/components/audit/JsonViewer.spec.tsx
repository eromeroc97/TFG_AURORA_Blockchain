import { render, screen } from '@testing-library/react'
import JsonViewer from './JsonViewer'

describe('JsonViewer', () => {
  it('renders title and data', () => {
    const data = { key: 'value', num: 42 }
    render(<JsonViewer data={data} title="Test JSON" />)
    expect(screen.getByText('Test JSON')).toBeInTheDocument()
    expect(screen.getByText(/"key"/)).toBeInTheDocument()
    expect(screen.getByText(/"value"/)).toBeInTheDocument()
  })
})
