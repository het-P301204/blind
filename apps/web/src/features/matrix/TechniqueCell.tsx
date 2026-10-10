import type { AttackTechnique, CoverageResult } from '@/types/api'
import { cn } from '@/lib/utils'

export const COVERAGE_BG: Record<string, string> = {
  NO_MAPPED_COVERAGE: '#292722',
  LIMITED: '#4A3D1A',
  PARTIAL: '#5C480F',
  STRONG: '#7A4020',
  UNKNOWN: '#292722',
}

interface TechniqueCellProps {
  technique: AttackTechnique
  coverage?: CoverageResult
  isSelected: boolean
  dimmed?: boolean
  isSub?: boolean
  onClick: () => void
}

export function TechniqueCell({
  technique,
  coverage,
  isSelected,
  dimmed = false,
  isSub = false,
  onClick,
}: TechniqueCellProps) {
  const level = coverage?.coverage_level ?? 'NO_MAPPED_COVERAGE'
  const bg = COVERAGE_BG[level] ?? COVERAGE_BG.UNKNOWN
  const score = coverage ? Math.round(coverage.coverage_score * 100) : 0
  const deprecated = technique.is_deprecated || technique.is_revoked

  return (
    <button
      onClick={onClick}
      title={`${technique.id} — ${technique.name}`}
      style={{ backgroundColor: bg, height: 64 }}
      className={cn(
        'w-full flex flex-col justify-between text-left px-2 py-1.5',
        'transition-all duration-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-copper',
        'hover:brightness-125',
        isSelected
          ? 'ring-1 ring-copper border border-copper'
          : 'border border-transparent hover:border-copper/40',
        isSub && 'pl-3',
        deprecated && 'opacity-40',
        dimmed && 'opacity-20',
      )}
    >
      <span className="font-mono text-[10px] text-muted leading-none select-none">
        {technique.id}
      </span>
      <span className="text-[11px] text-ivory leading-tight line-clamp-2 select-none">
        {technique.name}
      </span>
      {score > 0 && (
        <span className="font-mono text-[10px] text-copper self-end leading-none select-none">
          {score}%
        </span>
      )}
    </button>
  )
}
