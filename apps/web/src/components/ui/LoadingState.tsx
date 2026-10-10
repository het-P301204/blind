import { cn } from '@/lib/utils'

interface LoadingStateProps {
  className?: string
}

function SkeletonLine({ className }: { className?: string }) {
  return (
    <div className={cn('rounded bg-raised-panel animate-pulse', className)} />
  )
}

function SkeletonMetricCard() {
  return (
    <div className="bg-warm-surface border border-border rounded-xl p-5 space-y-3">
      <SkeletonLine className="h-3 w-20" />
      <SkeletonLine className="h-9 w-14" />
      <SkeletonLine className="h-3 w-28" />
    </div>
  )
}

function SkeletonTableRow({ cols = 4 }: { cols?: number }) {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-border/50">
      {Array.from({ length: cols }).map((_, i) => (
        <SkeletonLine
          key={i}
          className={cn(
            'h-4',
            i === 0 ? 'w-32' : i === cols - 1 ? 'w-16' : 'w-24'
          )}
        />
      ))}
    </div>
  )
}

export function LoadingState({ className }: LoadingStateProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Metric panel row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonMetricCard key={i} />
        ))}
      </div>

      {/* Table skeleton */}
      <div className="bg-warm-surface border border-border rounded-xl overflow-hidden">
        {/* Fake table header */}
        <div className="flex items-center gap-4 px-4 py-3 border-b border-border bg-raised-panel/40">
          {[32, 24, 20, 16].map((w, i) => (
            <SkeletonLine key={i} className={`h-3 w-${w}`} />
          ))}
        </div>
        {/* Fake rows */}
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonTableRow key={i} cols={4} />
        ))}
      </div>
    </div>
  )
}

// Compact inline variant — just a row of skeleton cells
export function LoadingRows({
  count = 5,
  cols = 4,
  className,
}: {
  count?: number
  cols?: number
  className?: string
}) {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonTableRow key={i} cols={cols} />
      ))}
    </div>
  )
}
