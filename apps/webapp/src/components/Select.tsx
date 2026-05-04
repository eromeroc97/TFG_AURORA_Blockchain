import { useState } from 'react'

interface SelectOption {
  value: string | number
  label: string
}

interface SelectProps {
  value: string | number
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  className?: string
  disabled?: boolean
}

export default function Select({ value, onChange, options, placeholder, className = '', disabled }: SelectProps) {
  const [isOpen, setIsOpen] = useState(false)

  const selectedOption = options.find((opt) => String(opt.value) === String(value))

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-primary outline-none transition-colors focus:border-accent flex items-center justify-between disabled:bg-slate-50 disabled:cursor-not-allowed"
      >
        <span className="truncate">{selectedOption?.label || placeholder}</span>
        {!disabled && (
          <svg className={`size-4 text-slate-400 transition-transform shrink-0 ml-2 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 min-w-[120px] rounded-xl border border-border bg-white py-1 shadow-lg max-h-60 overflow-y-auto">
          {placeholder && (
            <button
              type="button"
              onClick={() => {
                onChange('')
                setIsOpen(false)
              }}
              className="w-full px-3 py-2 text-left text-sm text-slate-500 hover:bg-slate-50"
            >
              {placeholder}
            </button>
          )}
          {options.map((opt) => (
            <button
              key={String(opt.value)}
              type="button"
              onClick={() => {
                onChange(String(opt.value))
                setIsOpen(false)
              }}
              className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                String(value) === String(opt.value) ? 'bg-accent/10 text-primary font-medium' : 'text-primary'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}