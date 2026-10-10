import { useEffect, useState } from 'react'
import { animate, useReducedMotion } from 'framer-motion'

interface AnimatedCounterProps {
  value: number
  duration?: number
  className?: string
  format?: (n: number) => string
}

export function AnimatedCounter({
  value,
  duration = 1000,
  className,
  format,
}: AnimatedCounterProps) {
  const [display, setDisplay] = useState(0)
  const shouldReduceMotion = useReducedMotion()

  useEffect(() => {
    if (shouldReduceMotion) {
      setDisplay(value)
      return
    }
    const controls = animate(0, value, {
      duration: duration / 1000,
      ease: 'easeOut',
      onUpdate(v) {
        setDisplay(Math.round(v))
      },
    })
    return () => controls.stop()
  }, [value, duration, shouldReduceMotion])

  const formatted = format ? format(display) : String(display)
  return <span className={className}>{formatted}</span>
}
