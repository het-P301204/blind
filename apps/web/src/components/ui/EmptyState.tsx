import { cn } from '@/lib/utils'
import { Button } from './Button'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description: string
  action?: { label: string; onClick: () => void }
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-16 px-4',
        className
      )}
    >
      {icon && (
        <div className="text-muted/50 mb-4">{icon}</div>
      )}
      <h3 className="text-ivory font-display font-semibold text-base mb-1.5">
        {title}
      </h3>
      <p className="text-muted text-sm max-w-sm leading-relaxed">
        {description}
      </p>
      {action && (
        <Button
          variant="secondary"
          size="sm"
          onClick={action.onClick}
          className="mt-5"
        >
          {action.label}
        </Button>
      )}
    </div>
  )
}
