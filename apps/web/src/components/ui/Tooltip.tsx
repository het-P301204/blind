import { useState, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface TooltipProps {
  content: string
  children: React.ReactNode
  className?: string
}

export function Tooltip({ content, children, className }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function show() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setVisible(true), 200)
  }

  function hide() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setVisible(false)
  }

  return (
    <span
      className={cn('relative inline-flex', className)}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}

      <AnimatePresence>
        {visible && (
          <motion.div
            role="tooltip"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.12 }}
            className={cn(
              'absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50',
              'rounded-md bg-raised-panel border border-border',
              'px-2.5 py-1.5 text-xs text-ivory whitespace-nowrap shadow-lg',
              'pointer-events-none'
            )}
          >
            {content}
            {/* Arrow */}
            <span
              className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-raised-panel"
              aria-hidden="true"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  )
}
