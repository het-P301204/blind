import { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

/* ------------------------------------------------------------------ */
/*  TechniqueIcon — target / crosshair                                  */
/* ------------------------------------------------------------------ */
export function TechniqueIcon({ size = 16, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <circle cx="8" cy="8" r="6" />
      <circle cx="8" cy="8" r="2.5" />
      <line x1="8" y1="1" x2="8" y2="4" />
      <line x1="8" y1="12" x2="8" y2="15" />
      <line x1="1" y1="8" x2="4" y2="8" />
      <line x1="12" y1="8" x2="15" y2="8" />
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/*  TacticIcon — layered chevrons                                       */
/* ------------------------------------------------------------------ */
export function TacticIcon({ size = 16, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <polyline points="3,4 8,8 13,4" />
      <polyline points="3,8 8,12 13,8" />
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/*  SigmaRuleIcon — simplified Σ                                        */
/* ------------------------------------------------------------------ */
export function SigmaRuleIcon({ size = 16, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <polyline points="12,2 4,2 9,8 4,14 12,14" />
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/*  CoverageIcon — filled arc / progress ring                           */
/* ------------------------------------------------------------------ */
export function CoverageIcon({ size = 16, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      aria-hidden="true"
      {...props}
    >
      {/* Background ring */}
      <circle cx="8" cy="8" r="6" strokeOpacity="0.25" />
      {/* 75% coverage arc (270deg → ending at top-left) */}
      <path
        d="M8 2 A6 6 0 1 1 2 8"
        strokeDasharray="28.27"
        strokeDashoffset="0"
      />
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/*  GapIcon — broken ring                                               */
/* ------------------------------------------------------------------ */
export function GapIcon({ size = 16, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      aria-hidden="true"
      {...props}
    >
      {/* Left arc segment */}
      <path d="M8 2 A6 6 0 0 0 2 8" />
      {/* Bottom arc segment */}
      <path d="M2 8 A6 6 0 0 0 8 14" />
      {/* Gap on right — just a small arc */}
      <path d="M11.5 4.5 A6 6 0 0 1 14 8" strokeOpacity="0.3" />
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/*  TelemetryIcon — signal bars                                         */
/* ------------------------------------------------------------------ */
export function TelemetryIcon({ size = 16, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
      {...props}
    >
      <rect x="1" y="10" width="3" height="4" rx="0.5" />
      <rect x="5.5" y="7" width="3" height="7" rx="0.5" />
      <rect x="10" y="4" width="3" height="10" rx="0.5" fillOpacity="0.4" />
      <rect x="10" y="4" width="3" height="10" rx="0.5" stroke="currentColor" strokeWidth="0.5" fill="none" />
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/*  ValidationIcon — checkmark in circle                                */
/* ------------------------------------------------------------------ */
export function ValidationIcon({ size = 16, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <circle cx="8" cy="8" r="6" />
      <polyline points="5,8 7,10 11,6" />
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/*  EvidenceIcon — document with magnifier                              */
/* ------------------------------------------------------------------ */
export function EvidenceIcon({ size = 16, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {/* Document */}
      <path d="M3 2h7l3 3v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" />
      <path d="M10 2v3h3" />
      {/* Magnifier */}
      <circle cx="7.5" cy="8.5" r="2" />
      <line x1="9" y1="10" x2="11" y2="12" />
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/*  PriorityIcon — arrow up in diamond                                  */
/* ------------------------------------------------------------------ */
export function PriorityIcon({ size = 16, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M8 1 L15 8 L8 15 L1 8 Z" />
      <line x1="8" y1="10.5" x2="8" y2="5.5" />
      <polyline points="5.5,8 8,5.5 10.5,8" />
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/*  DataSourceIcon — database stack                                     */
/* ------------------------------------------------------------------ */
export function DataSourceIcon({ size = 16, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <ellipse cx="8" cy="4" rx="5" ry="2" />
      <path d="M3 4v4c0 1.1 2.24 2 5 2s5-.9 5-2V4" />
      <path d="M3 8v4c0 1.1 2.24 2 5 2s5-.9 5-2V8" />
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/*  ExportIcon — arrow leaving box                                      */
/* ------------------------------------------------------------------ */
export function ExportIcon({ size = 16, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {/* Box */}
      <path d="M6 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V9" />
      {/* Arrow */}
      <line x1="9" y1="2" x2="14" y2="2" />
      <line x1="14" y1="2" x2="14" y2="7" />
      <line x1="8" y1="8" x2="14" y2="2" />
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/*  CorpusIcon — stacked documents                                      */
/* ------------------------------------------------------------------ */
export function CorpusIcon({ size = 16, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {/* Back page */}
      <rect x="4" y="1" width="9" height="11" rx="1" strokeOpacity="0.4" />
      {/* Front page */}
      <rect x="2" y="3" width="9" height="11" rx="1" />
      {/* Lines */}
      <line x1="4.5" y1="7" x2="8.5" y2="7" />
      <line x1="4.5" y1="9.5" x2="8.5" y2="9.5" />
    </svg>
  )
}
