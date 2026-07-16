import type { ButtonHTMLAttributes } from 'react'
import { Loader2 } from 'lucide-react'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'success'
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  iconLeft?: React.ReactNode
  iconRight?: React.ReactNode
  fullWidth?: boolean
}

/* Variant token map — base / hover / active / disabled / focus-ring color */
const variantMap: Record<ButtonVariant, { base: string; hover: string; active: string; disabled: string; ring: string }> = {
  primary: {
    base:     'bg-[#3B82F6] text-white border-transparent shadow-[0_1px_2px_rgba(0,0,0,0.4)]',
    hover:    'hover:bg-[#2563EB] hover:shadow-[0_2px_6px_rgba(59,130,246,0.35)]',
    active:   'active:bg-[#1D4ED8] active:scale-[0.98] active:shadow-none',
    disabled: 'disabled:bg-[#1E2D4A] disabled:text-[#52525B] disabled:shadow-none',
    ring:     'focus-visible:ring-[#3B82F6]',
  },
  secondary: {
    base:     'bg-[#18181B] text-[#F5F5F5] border-[#2B2D31]',
    hover:    'hover:bg-[#1C1C1F] hover:border-[#3F4146] hover:text-white',
    active:   'active:bg-[#111217] active:scale-[0.98]',
    disabled: 'disabled:bg-[#111217] disabled:text-[#52525B] disabled:border-[#1F2024]',
    ring:     'focus-visible:ring-[#3B82F6]',
  },
  ghost: {
    base:     'bg-transparent text-[#A1A1AA] border-transparent',
    hover:    'hover:bg-[#18181B] hover:text-[#F5F5F5]',
    active:   'active:bg-[#111217] active:scale-[0.98]',
    disabled: 'disabled:text-[#52525B]',
    ring:     'focus-visible:ring-[#3B82F6]',
  },
  danger: {
    base:     'bg-[#EF4444] text-white border-transparent shadow-[0_1px_2px_rgba(0,0,0,0.4)]',
    hover:    'hover:bg-[#DC2626] hover:shadow-[0_2px_6px_rgba(239,68,68,0.35)]',
    active:   'active:bg-[#B91C1C] active:scale-[0.98] active:shadow-none',
    disabled: 'disabled:bg-[#2A1010] disabled:text-[#52525B] disabled:shadow-none',
    ring:     'focus-visible:ring-[#EF4444]',
  },
  outline: {
    base:     'bg-transparent text-[#3B82F6] border-[#3B82F6]',
    hover:    'hover:bg-[#1E2D4A] hover:border-[#60A5FA]',
    active:   'active:bg-[#162344] active:scale-[0.98]',
    disabled: 'disabled:text-[#52525B] disabled:border-[#1F2024]',
    ring:     'focus-visible:ring-[#3B82F6]',
  },
  success: {
    base:     'bg-[#22C55E] text-white border-transparent shadow-[0_1px_2px_rgba(0,0,0,0.4)]',
    hover:    'hover:bg-[#16A34A] hover:shadow-[0_2px_6px_rgba(34,197,94,0.35)]',
    active:   'active:bg-[#15803D] active:scale-[0.98] active:shadow-none',
    disabled: 'disabled:bg-[#14291E] disabled:text-[#52525B] disabled:shadow-none',
    ring:     'focus-visible:ring-[#22C55E]',
  },
}

const sizeMap: Record<ButtonSize, string> = {
  xs: 'h-6 px-2.5 text-[11px] gap-1 rounded-[6px]',
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-[8px]',
  md: 'h-9 px-4 text-[14px] gap-2 rounded-[10px]',
  lg: 'h-11 px-5 text-[15px] gap-2.5 rounded-[12px]',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  iconLeft,
  iconRight,
  fullWidth = false,
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps) {
  const v = variantMap[variant]
  return (
    <button
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={[
        'inline-flex items-center justify-center font-medium border transition-all duration-150 select-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090B]',
        v.base, v.hover, v.active, v.disabled, v.ring,
        sizeMap[size],
        fullWidth ? 'w-full' : '',
        (disabled || loading) ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
        className,
      ].filter(Boolean).join(' ')}
      {...props}
    >
      {loading ? (
        <Loader2 size={size === 'lg' ? 16 : 13} className="animate-spin shrink-0" aria-hidden="true" />
      ) : iconLeft ? (
        <span className="shrink-0" aria-hidden="true">{iconLeft}</span>
      ) : null}
      {children && <span>{children}</span>}
      {!loading && iconRight && <span className="shrink-0" aria-hidden="true">{iconRight}</span>}
    </button>
  )
}

/* Icon-only square button */
const iconSizeMap = {
  xs: 'h-6 w-6 rounded-[6px]',
  sm: 'h-8 w-8 rounded-[8px]',
  md: 'h-9 w-9 rounded-[10px]',
  lg: 'h-11 w-11 rounded-[12px]',
}

export function IconButton({
  variant = 'secondary',
  size = 'md',
  loading = false,
  children,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  const v = variantMap[variant]
  return (
    <button
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={[
        'inline-flex items-center justify-center border transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090B]',
        v.base, v.hover, v.active, v.disabled, v.ring,
        iconSizeMap[size ?? 'md'],
        (disabled || loading) ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
        className,
      ].filter(Boolean).join(' ')}
      {...props}
    >
      {loading ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : children}
    </button>
  )
}
