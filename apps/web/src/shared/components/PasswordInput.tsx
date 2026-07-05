import { useId, useState } from 'react'
import type { InputHTMLAttributes } from 'react'
import { Eye, EyeOff } from 'lucide-react'

type PasswordInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type'
> & {
  label?: string
}

export function PasswordInput({
  label,
  className = '',
  id: idProp,
  autoComplete,
  ...props
}: PasswordInputProps) {
  const generatedId = useId()
  const id = idProp ?? generatedId
  const [visible, setVisible] = useState(false)

  return (
    <div>
      {label && (
        <label htmlFor={id} className="form-label">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          {...props}
          id={id}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          className={`input-field pr-11 ${className}`.trim()}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  )
}
