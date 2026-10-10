import { AlertCircle, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './Button'

interface ErrorStateProps {
  message?: string
  onRetry?: () => void
  className?: string
}

export function ErrorState({
  message = 'Something went wrong. Please try again.',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-16 px-4',
        className
      )}
    >
      <div className="w-12 h-12 rounded-full bg-burnt-red/10 flex items-center justify-center mb-4">
        <AlertCircle size={22} className="text-burnt-red" />
      </div>
      <h3 className="text-ivory font-display font-semibold text-base mb-1.5">
        Failed to load
      </h3>
      <p className="text-muted text-sm max-w-sm leading-relaxed">{message}</p>
      {onRetry && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onRetry}
          className="mt-5 gap-1.5"
        >
          <RotateCcw size={13} />
          Try again
        </Button>
      )}
    </div>
  )
}
