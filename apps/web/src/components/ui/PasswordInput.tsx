import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import type React from 'react';

interface PasswordInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  id: string;
}

export function PasswordInput({ label, id, className = '', ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      {label && (
        <label htmlFor={id} className="block text-xs font-bold text-ink-tertiary uppercase tracking-widest mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          className={`w-full p-4 pr-12 bg-recessed border border-ink-tertiary/10 rounded-xl text-base text-ink-primary focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all placeholder:text-ink-tertiary touch-target ${className}`}
          {...props}
        />
        <button
          type="button"
          aria-label={visible ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe'}
          onClick={() => { setVisible(v => !v); }}
          className="absolute right-0 top-1/2 -translate-y-1/2 text-ink-tertiary hover:text-ink-primary transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
        >
          {visible ? <EyeOff size={18} strokeWidth={1.8} /> : <Eye size={18} strokeWidth={1.8} />}
        </button>
      </div>
    </div>
  );
}
