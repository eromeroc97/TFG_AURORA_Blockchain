import { render, screen, fireEvent } from '@testing-library/react'
import Select from './Select'

const options = [
  { value: '1', label: 'Option 1' },
  { value: '2', label: 'Option 2' },
  { value: '3', label: 'Option 3' },
]

describe('Select', () => {
  it('renders placeholder when no option matches value', () => {
    render(<Select value="" onChange={jest.fn()} options={options} placeholder="Choose..." />)
    expect(screen.getByText('Choose...')).toBeInTheDocument()
  })

  it('renders selected option label', () => {
    render(<Select value="2" onChange={jest.fn()} options={options} />)
    expect(screen.getByText('Option 2')).toBeInTheDocument()
  })

  it('opens dropdown on click', () => {
    render(<Select value="" onChange={jest.fn()} options={options} />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText('Option 1')).toBeInTheDocument()
  })

  it('calls onChange with selected value', () => {
    const handleChange = jest.fn()
    render(<Select value="" onChange={handleChange} options={options} />)
    fireEvent.click(screen.getByRole('button'))
    fireEvent.click(screen.getByText('Option 2'))
    expect(handleChange).toHaveBeenCalledWith('2')
  })

  it('closes dropdown after selection', () => {
    render(<Select value="" onChange={jest.fn()} options={options} />)
    fireEvent.click(screen.getByRole('button'))
    fireEvent.click(screen.getByText('Option 1'))
    expect(screen.queryByText('Option 2')).not.toBeInTheDocument()
  })

  it('does not open when disabled', () => {
    render(<Select value="" onChange={jest.fn()} options={options} disabled />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.queryByText('Option 1')).not.toBeInTheDocument()
  })

  it('shows placeholder option in dropdown when provided', () => {
    render(<Select value="" onChange={jest.fn()} options={options} placeholder="All" />)
    fireEvent.click(screen.getByRole('button'))
    const buttons = screen.getAllByText('All')
    expect(buttons.length).toBeGreaterThanOrEqual(2)
  })

  it('calls onChange with empty string when placeholder is clicked', () => {
    const handleChange = jest.fn()
    render(<Select value="" onChange={handleChange} options={options} placeholder="All" />)
    fireEvent.click(screen.getByRole('button'))
    const buttons = screen.getAllByText('All')
    fireEvent.click(buttons[1])
    expect(handleChange).toHaveBeenCalledWith('')
  })

  it('applies custom className', () => {
    const { container } = render(<Select value="" onChange={jest.fn()} options={options} className="custom-cls" />)
    expect(container.firstChild).toHaveClass('custom-cls')
  })

  it('highlights selected option in dropdown', () => {
    render(<Select value="2" onChange={jest.fn()} options={options} />)
    fireEvent.click(screen.getByRole('button'))
    const options2 = screen.getAllByText('Option 2')
    const dropdownOption = options2.find(el => el.tagName === 'BUTTON')
    expect(dropdownOption?.className).toContain('bg-accent/10')
  })
})
