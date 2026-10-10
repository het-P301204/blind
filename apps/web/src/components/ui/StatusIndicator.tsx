import { cn } from '@/lib/utils'

interface StatusIndicatorProps {
  status: string
  label: string
  size?: 'sm' | 'md'
}

interface StatusStyle {
  dot: string
  text: string
}

const statusStyleMap: Record<string, StatusStyle> = {
  // Coverage
  NO_MAPPED_COVERAGE: { dot: 'bg-muted', text: 'text-muted' },
  LIMITED: { dot: 'bg-amber', text: 'text-amber' },
  PARTIAL: { dot: 'bg-amber', text: 'text-amber' },
  STRONG: { dot: 'bg-copper', text: 'text-copper' },

  // Telemetry
  AVAILABLE: { dot: 'bg-sage', text: 'text-sage' },
  MISSING: { dot: 'bg-burnt-red', text: 'text-burnt-red' },

  // Validation
  NOT_TESTED: { dot: 'bg-muted', text: 'text-muted' },
  PLANNED: { dot: 'bg-amber', text: 'text-amber' },
  TESTED: { dot: 'bg-sage', text: 'text-sage' },
  PASSED: { dot: 'bg-sage', text: 'text-sage' },
  FAILED: { dot: 'bg-burnt-red', text: 'text-burnt-red' },
  INCONCLUSIVE: { dot: 'bg-muted', text: 'text-muted' },

  // Parse
  PARSED: { dot: 'bg-sage', text: 'text-sage' },
  PARSED_WITH_WARNINGS: { dot: 'bg-amber', text: 'text-amber' },
  INVALID: { dot: 'bg-burnt-red', text: 'text-burnt-red' },
  UNSUPPORTED: { dot: 'bg-muted', text: 'text-muted' },
  DUPLICATE: { dot: 'bg-muted', text: 'text-muted' },

  // Deployment
  NOT_CONFIGURED: { dot: 'bg-muted', text: 'text-muted' },
  DEPLOYED: { dot: 'bg-sage', text: 'text-sage' },
  DISABLED: { dot: 'bg-muted', text: 'text-muted' },

  // Fallback
  UNKNOWN: { dot: 'bg-muted', text: 'text-muted' },
}

export function StatusIndicator({
  status,
  label,
  size = 'md',
}: StatusIndicatorProps) {
  const style = statusStyleMap[status] ?? statusStyleMap['UNKNOWN']

  const dotSize = size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2'
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm'

  return (
    <span className={cn('inline-flex items-center gap-1.5', textSize, style.text)}>
      <span
        className={cn('rounded-full shrink-0', dotSize, style.dot)}
        aria-hidden="true"
      />
      {label}
    </span>
  )
}
