import { X, SlidersHorizontal } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface FilterItem {
  key: string
  label: string
  value: string
  onRemove: () => void
}

interface FilterBarProps {
  filters: FilterItem[]
  onClearAll: () => void
  className?: string
}

export function FilterBar({ filters, onClearAll, className }: FilterBarProps) {
  if (filters.length === 0) return null

  return (
    <div
      className={cn(
        'flex items-center gap-2 flex-wrap',
        className
      )}
    >
      <span className="flex items-center gap-1.5 text-xs text-muted shrink-0">
        <SlidersHorizontal size={12} />
        Filters:
      </span>

      <AnimatePresence initial={false}>
        {filters.map(filter => (
          <motion.div
            key={filter.key}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-1 rounded-full bg-raised-panel border border-border px-2.5 py-0.5 text-xs text-ivory"
          >
            <span className="text-muted">{filter.label}:</span>
            <span className="font-medium">{filter.value}</span>
            <button
              onClick={filter.onRemove}
              className="ml-0.5 text-muted hover:text-ivory transition-colors rounded-full p-0.5 hover:bg-border"
              aria-label={`Remove filter ${filter.label}`}
            >
              <X size={10} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>

      {filters.length > 1 && (
        <button
          onClick={onClearAll}
          className="text-xs text-muted hover:text-burnt-red transition-colors ml-1 shrink-0"
        >
          Clear all
        </button>
      )}
    </div>
  )
}
