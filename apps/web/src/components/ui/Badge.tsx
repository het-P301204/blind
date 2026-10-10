import type { CoverageLevel, TelemetryStatus, ValidationStatus, ParseStatus, DeploymentStatus } from '@/types/api'
import {
  Circle,
  CircleAlert,
  Activity,
  CircleCheck,
  CircleDashed,
  Signal,
  SignalLow,
  SignalZero,
  Clock,
  CalendarClock,
  FlaskConical,
  CheckCircle,
  XCircle,
  HelpCircle,
  AlertTriangle,
  Ban,
  Copy,
  Server,
  PowerOff,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface BadgeConfig {
  label: string
  className: string
  Icon: LucideIcon
}

// ─── Coverage ────────────────────────────────────────────────────────────────

const coverageConfig: Record<CoverageLevel, BadgeConfig> = {
  NO_MAPPED_COVERAGE: {
    label: 'No Coverage',
    className: 'bg-graphite text-muted',
    Icon: Circle,
  },
  LIMITED: {
    label: 'Limited',
    className: 'bg-amber/20 text-amber',
    Icon: CircleAlert,
  },
  PARTIAL: {
    label: 'Partial',
    className: 'bg-amber/30 text-amber',
    Icon: Activity,
  },
  STRONG: {
    label: 'Strong',
    className: 'bg-copper/20 text-copper',
    Icon: CircleCheck,
  },
  UNKNOWN: {
    label: 'Unknown',
    className: 'bg-graphite text-muted',
    Icon: CircleDashed,
  },
}

interface CoverageBadgeProps {
  level: CoverageLevel
  className?: string
}

export function CoverageBadge({ level, className }: CoverageBadgeProps) {
  const { label, className: base, Icon } = coverageConfig[level]
  return (
    <span
      className={cn(
        'rounded-full px-2.5 py-0.5 text-xs font-medium flex items-center gap-1.5 w-fit',
        base,
        className
      )}
    >
      <Icon size={11} className="shrink-0" />
      {label}
    </span>
  )
}

// ─── Telemetry ────────────────────────────────────────────────────────────────

const telemetryConfig: Record<TelemetryStatus, BadgeConfig> = {
  AVAILABLE: {
    label: 'Available',
    className: 'bg-sage/20 text-sage',
    Icon: Signal,
  },
  PARTIAL: {
    label: 'Partial',
    className: 'bg-amber/20 text-amber',
    Icon: SignalLow,
  },
  MISSING: {
    label: 'Missing',
    className: 'bg-burnt-red/20 text-burnt-red',
    Icon: SignalZero,
  },
  UNKNOWN: {
    label: 'Unknown',
    className: 'bg-graphite text-muted',
    Icon: CircleDashed,
  },
}

interface TelemetryBadgeProps {
  status: TelemetryStatus
  className?: string
}

export function TelemetryBadge({ status, className }: TelemetryBadgeProps) {
  const { label, className: base, Icon } = telemetryConfig[status]
  return (
    <span
      className={cn(
        'rounded-full px-2.5 py-0.5 text-xs font-medium flex items-center gap-1.5 w-fit',
        base,
        className
      )}
    >
      <Icon size={11} className="shrink-0" />
      {label}
    </span>
  )
}

// ─── Validation ───────────────────────────────────────────────────────────────

const validationConfig: Record<ValidationStatus, BadgeConfig> = {
  NOT_TESTED: {
    label: 'Not Tested',
    className: 'bg-graphite text-muted',
    Icon: Clock,
  },
  PLANNED: {
    label: 'Planned',
    className: 'bg-amber/10 text-amber',
    Icon: CalendarClock,
  },
  TESTED: {
    label: 'Tested',
    className: 'bg-sage/10 text-sage',
    Icon: FlaskConical,
  },
  PASSED: {
    label: 'Passed',
    className: 'bg-sage/20 text-sage',
    Icon: CheckCircle,
  },
  FAILED: {
    label: 'Failed',
    className: 'bg-burnt-red/20 text-burnt-red',
    Icon: XCircle,
  },
  INCONCLUSIVE: {
    label: 'Inconclusive',
    className: 'bg-graphite text-muted',
    Icon: HelpCircle,
  },
}

interface ValidationBadgeProps {
  status: ValidationStatus
  className?: string
}

export function ValidationBadge({ status, className }: ValidationBadgeProps) {
  const { label, className: base, Icon } = validationConfig[status]
  return (
    <span
      className={cn(
        'rounded-full px-2.5 py-0.5 text-xs font-medium flex items-center gap-1.5 w-fit',
        base,
        className
      )}
    >
      <Icon size={11} className="shrink-0" />
      {label}
    </span>
  )
}

// ─── Parse ────────────────────────────────────────────────────────────────────

const parseConfig: Record<ParseStatus, BadgeConfig> = {
  PARSED: {
    label: 'Parsed',
    className: 'bg-sage/20 text-sage',
    Icon: CheckCircle,
  },
  PARSED_WITH_WARNINGS: {
    label: 'Warnings',
    className: 'bg-amber/20 text-amber',
    Icon: AlertTriangle,
  },
  INVALID: {
    label: 'Invalid',
    className: 'bg-burnt-red/20 text-burnt-red',
    Icon: XCircle,
  },
  UNSUPPORTED: {
    label: 'Unsupported',
    className: 'bg-graphite text-muted',
    Icon: Ban,
  },
  DUPLICATE: {
    label: 'Duplicate',
    className: 'bg-graphite text-muted',
    Icon: Copy,
  },
}

interface ParseBadgeProps {
  status: ParseStatus
  className?: string
}

export function ParseBadge({ status, className }: ParseBadgeProps) {
  const { label, className: base, Icon } = parseConfig[status]
  return (
    <span
      className={cn(
        'rounded-full px-2.5 py-0.5 text-xs font-medium flex items-center gap-1.5 w-fit',
        base,
        className
      )}
    >
      <Icon size={11} className="shrink-0" />
      {label}
    </span>
  )
}

// ─── Deployment ───────────────────────────────────────────────────────────────

const deploymentConfig: Record<DeploymentStatus, BadgeConfig> = {
  NOT_CONFIGURED: {
    label: 'Not Configured',
    className: 'bg-graphite text-muted',
    Icon: Server,
  },
  PLANNED: {
    label: 'Planned',
    className: 'bg-amber/10 text-amber',
    Icon: CalendarClock,
  },
  DEPLOYED: {
    label: 'Deployed',
    className: 'bg-sage/20 text-sage',
    Icon: CheckCircle,
  },
  DISABLED: {
    label: 'Disabled',
    className: 'bg-graphite text-muted',
    Icon: PowerOff,
  },
  UNKNOWN: {
    label: 'Unknown',
    className: 'bg-graphite text-muted',
    Icon: CircleDashed,
  },
}

interface DeploymentBadgeProps {
  status: DeploymentStatus
  className?: string
}

export function DeploymentBadge({ status, className }: DeploymentBadgeProps) {
  const { label, className: base, Icon } = deploymentConfig[status]
  return (
    <span
      className={cn(
        'rounded-full px-2.5 py-0.5 text-xs font-medium flex items-center gap-1.5 w-fit',
        base,
        className
      )}
    >
      <Icon size={11} className="shrink-0" />
      {label}
    </span>
  )
}
