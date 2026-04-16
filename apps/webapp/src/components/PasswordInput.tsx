import { useState, type InputHTMLAttributes } from 'react'
import { Eye, EyeOff } from 'lucide-react'

type PasswordInputProps = InputHTMLAttributes<HTMLInputElement>

export default function PasswordInput({
  type: _type,
  className = '',
  ...props
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="relative w-full">
      <input
        {...props}
        type={showPassword ? 'text' : 'password'}
        className={`${className} pr-10`}
      />
      <button
        type="button"
        onClick={() => setShowPassword((previous) => !previous)}
        className="absolute right-0 top-1/2 -translate-y-1/2 px-3 text-muted transition-colors hover:text-primary"
        aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        aria-pressed={showPassword}
      >
        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  )
}