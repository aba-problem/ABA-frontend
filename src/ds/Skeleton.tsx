/**
 * @module ds/Skeleton
 * @description ABA Design System loading skeleton components.
 *
 * Three components for displaying animated loading placeholders:
 * - {@link Skeleton} — Generic rectangular placeholder
 * - {@link SkeletonText} — Multi-line text placeholder (last line shorter)
 * - {@link SkeletonCard} — Card-shaped placeholder with icon + text areas
 *
 * All use the `aba-skeleton` CSS class which applies a shimmer gradient
 * animation (`aba-shimmer` keyframes in `index.css`).
 *
 * @example
 * ```tsx
 * <Skeleton width="200px" height="24px" />
 * <SkeletonText lines={4} />
 * <SkeletonCard />
 * ```
 *
 * @see index.css — aba-shimmer animation keyframes
 * @see pages/dashboard/Overview.tsx — Usage in dashboard
 */

/** Props for the base Skeleton component. */
interface SkeletonProps {
  className?: string
  width?: string
  height?: string
}

export function Skeleton({ className = '', width, height }: SkeletonProps) {
  return (
    <div
      className={`aba-skeleton rounded-[8px] ${className}`}
      style={{ width, height }}
    />
  )
}

export function SkeletonText({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2.5 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height="12px"
          width={i === lines - 1 ? '60%' : '100%'}
        />
      ))}
    </div>
  )
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`rounded-[14px] border border-[#2B2D31] bg-[#18181B] p-6 ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <Skeleton width="36px" height="36px" className="rounded-[10px]" />
        <div className="flex-1">
          <Skeleton height="14px" width="50%" className="mb-2" />
          <Skeleton height="10px" width="30%" />
        </div>
      </div>
      <SkeletonText lines={2} />
    </div>
  )
}
