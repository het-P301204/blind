interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
}

export function Logo({ size = 'md' }: LogoProps) {
  const sizes = { sm: 24, md: 32, lg: 48 }
  const s = sizes[size]

  return (
    <div className="flex items-center gap-2">
      <svg width={s} height={s} viewBox="0 0 32 32" fill="none" aria-hidden="true">
        {/* Outer dashed circle — faint right-side indication */}
        <circle
          cx="16"
          cy="16"
          r="13"
          stroke="#C47D50"
          strokeWidth="1.5"
          strokeDasharray="4 2"
        />
        {/* Left half filled arc (soft) */}
        <path
          d="M16 3 A13 13 0 0 0 16 29"
          fill="#C47D50"
          opacity="0.3"
        />
        {/* Left half arc stroke */}
        <path
          d="M16 3 A13 13 0 0 0 16 29"
          stroke="#C47D50"
          strokeWidth="2"
          fill="none"
        />
        {/* Horizontal dividing line */}
        <line
          x1="3"
          y1="16"
          x2="29"
          y2="16"
          stroke="#C47D50"
          strokeWidth="1.5"
        />
      </svg>
      <span
        className="font-display font-bold text-ivory"
        style={{ fontSize: Math.round(s * 0.56) }}
      >
        BLIND
      </span>
    </div>
  )
}
