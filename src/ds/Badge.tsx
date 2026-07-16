export type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'outline'
export type BadgeSize = 'xs' | 'sm' | 'md'

interface BadgeProps {
  variant?: BadgeVariant
  size?: BadgeSize
  dot?: boolean
  children: React.ReactNode
  className?: string
}

const variantStyles: Record<BadgeVariant, { bg: string; text: string; border: string }> = {
  default:  { bg: '#27272A', text: '#A1A1AA', border: '#2B2D31' },
  primary:  { bg: '#1E2D4A', text: '#60A5FA', border: '#1E3A6E' },
  success:  { bg: '#14291E', text: '#4ADE80', border: '#14522D' },
  warning:  { bg: '#2A2008', text: '#FCD34D', border: '#422006' },
  danger:   { bg: '#2A1010', text: '#F87171', border: '#7F1D1D' },
  info:     { bg: '#1E2D4A', text: '#93C5FD', border: '#1E3A6E' },
  outline:  { bg: 'transparent', text: '#A1A1AA', border: '#2B2D31' },
}

const dotColors: Record<BadgeVariant, string> = {
  default: '#71717A',
  primary: '#3B82F6',
  success: '#22C55E',
  warning: '#EAB308',
  danger:  '#EF4444',
  info:    '#3B82F6',
  outline: '#71717A',
}

const sizeStyles: Record<BadgeSize, string> = {
  xs: 'px-1.5 py-0 text-[10px] rounded-[4px] h-4',
  sm: 'px-2 py-0.5 text-[11px] rounded-[6px]',
  md: 'px-2.5 py-1 text-[12px] rounded-[6px]',
}

export function Badge({ variant = 'default', size = 'sm', dot = false, children, className = '' }: BadgeProps) {
  const s = variantStyles[variant]
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium border ${sizeStyles[size]} ${className}`}
      style={{ backgroundColor: s.bg, color: s.text, borderColor: s.border }}
    >
      {dot && (
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: dotColors[variant] }}
        />
      )}
      {children}
    </span>
  )
}

/* Status Indicator (dot only, no label) */
export function StatusDot({ variant = 'default', pulse = false }: { variant?: BadgeVariant; pulse?: boolean }) {
  return (
    <span className="relative inline-flex">
      <span
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: dotColors[variant] }}
      />
      {pulse && (
        <span
          className="absolute inset-0 rounded-full animate-ping opacity-75"
          style={{ backgroundColor: dotColors[variant] }}
        />
      )}
    </span>
  )
}
