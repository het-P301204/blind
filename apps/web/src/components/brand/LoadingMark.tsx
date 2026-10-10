import { motion } from 'framer-motion'

interface LoadingMarkProps {
  size?: number
}

export function LoadingMark({ size = 40 }: LoadingMarkProps) {
  return (
    <div className="flex items-center justify-center">
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        aria-label="Loading"
        role="status"
      >
        {/* Static dim background ring */}
        <circle cx="20" cy="20" r="16" stroke="#333330" strokeWidth="2" />
        {/* Animated copper arc */}
        <motion.circle
          cx="20"
          cy="20"
          r="16"
          stroke="#C47D50"
          strokeWidth="2"
          strokeDasharray="30 70"
          strokeLinecap="round"
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
          style={{ transformOrigin: '20px 20px' }}
        />
      </svg>
    </div>
  )
}
