import { fireEvent, render, screen } from '@testing-library/react'
import PasswordInput from './PasswordInput'

describe('PasswordInput', () => {
  it('toggles password visibility', () => {
    render(<PasswordInput placeholder="Password" />)

    const input = screen.getByPlaceholderText('Password')
    const toggleButton = screen.getByRole('button', { name: /Mostrar contraseña/i })

    expect(input).toHaveAttribute('type', 'password')

    fireEvent.click(toggleButton)

    expect(input).toHaveAttribute('type', 'text')
    expect(screen.getByRole('button', { name: /Ocultar contraseña/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })
})