import type { ReactNode } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MetricPanelProps {
  label: string
  value: ReactNode
  description?: string
  trend?: { value: number; label: string }
  loading?: boolean
  className?: string
}

export function MetricPanel({
  label,
  value,
  description,
  trend,
  loading = false,
  className,
}: MetricPanelProps) {
  if (loading) {
    return (
      <div
        className={cn(
          'bg-warm-surface border border-border rounded-xl p-5 space-y-3',
          className
        )}
      >
        <div className="h-3 w-24 bg-raised-panel rounded animate-pulse" />
        <div className="h-9 w-16 bg-raised-panel rounded animate-pulse" />
        <div className="h-3 w-32 bg-raised-panel rounded animate-pulse" />
      </div>
    )
  }

  const trendPositive = trend && trend.value > 0
  const trendNegative = trend && trend.value < 0

  return (
    <div
      className={cn(
        'bg-warm-surface border border-border rounded-xl p-5',
        className
      )}
    >
      <p className="text-muted text-xs font-medium uppercase tracking-wide mb-1.5">
        {label}
      </p>
      <p className="text-3xl font-display text-ivory font-semibold leading-none mb-1">
        {value}
      </p>
      {description && (
        <p className="text-muted text-xs mt-1">{description}</p>
      )}
      {trend && (
        <div
          className={cn(
            'flex items-center gap-1 text-xs font-medium mt-2',
            trendPositive && 'text-sage',
            trendNegative && 'text-burnt-red',
            !trendPositive && !trendNegative && 'text-muted'
          )}
        >
          {trendPositive && <TrendingUp size={13} />}
          {trendNegative && <TrendingDown size={13} />}
          <span>
            {trend.value > 0 ? '+' : ''}
            {trend.value}
          </span>
          <span className="text-muted font-normal">{trend.label}</span>
        </div>
      )}
    </div>
  )
}
