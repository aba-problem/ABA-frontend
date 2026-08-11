/**
 * @module ds/Pagination
 * @description Simple client-side pagination controls.
 *
 * Purely presentational — the caller owns the current page state and slices
 * its own data array. Keeps large lists (session logs, partner cells) from
 * rendering hundreds of DOM nodes at once, which is what actually causes the
 * page to feel slow, not the network fetch itself.
 *
 * @example
 * ```tsx
 * const [page, setPage] = useState(1)
 * const pageSize = 5
 * const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
 * const visible = items.slice((page - 1) * pageSize, page * pageSize)
 * // ...render `visible`...
 * <Pagination page={page} totalPages={totalPages} onChange={setPage} />
 * ```
 */

import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  page: number
  totalPages: number
  onChange: (page: number) => void
  /** Optional label, e.g. "23 registros" — shown left of the controls. */
  label?: string
}

export function Pagination({ page, totalPages, onChange, label }: PaginationProps) {
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-[var(--aba-border)]">
      {label ? (
        <span className="text-[11px] text-[var(--aba-text-muted)]">{label}</span>
      ) : <span />}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          className="w-7 h-7 rounded-[6px] flex items-center justify-center text-[var(--aba-text-secondary)] hover:text-[var(--aba-text)] hover:bg-[var(--aba-card-hover)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-all cursor-pointer"
          aria-label="Página anterior"
        >
          <ChevronLeft size={14} />
        </button>
        <span className="text-[12px] text-[var(--aba-text-secondary)] font-mono min-w-[48px] text-center">
          {page} / {totalPages}
        </span>
        <button
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages}
          className="w-7 h-7 rounded-[6px] flex items-center justify-center text-[var(--aba-text-secondary)] hover:text-[var(--aba-text)] hover:bg-[var(--aba-card-hover)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-all cursor-pointer"
          aria-label="Página siguiente"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}
