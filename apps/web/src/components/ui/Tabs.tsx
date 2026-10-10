import { useId } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface Tab {
  key: string
  label: string
  icon?: React.ReactNode
}

interface TabsProps {
  tabs: Tab[]
  activeKey: string
  onChange: (key: string) => void
  className?: string
}

export function Tabs({ tabs, activeKey, onChange, className }: TabsProps) {
  const layoutId = useId()

  return (
    <div
      className={cn(
        'flex items-center gap-0 border-b border-border',
        className
      )}
      role="tablist"
    >
      {tabs.map(tab => {
        const isActive = tab.key === activeKey
        return (
          <button
            key={tab.key}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.key)}
            className={cn(
              'relative px-4 py-2.5 text-sm font-medium flex items-center gap-1.5 transition-colors',
              isActive ? 'text-ivory' : 'text-muted hover:text-ivory/70'
            )}
          >
            {tab.icon && (
              <span className="shrink-0" aria-hidden="true">
                {tab.icon}
              </span>
            )}
            {tab.label}

            {isActive && (
              <motion.span
                layoutId={layoutId}
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-copper rounded-full"
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
              />
            )}
          </button>
        )
      })}
    </div>
  )
}
