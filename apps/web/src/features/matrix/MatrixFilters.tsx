import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export const TACTIC_ORDER = [
  'reconnaissance',
  'resource-development',
  'initial-access',
  'execution',
  'persistence',
  'privilege-escalation',
  'defense-evasion',
  'credential-access',
  'discovery',
  'lateral-movement',
  'collection',
  'command-and-control',
  'exfiltration',
  'impact',
] as const

const COVERAGE_LEVELS = [
  { value: 'NO_MAPPED_COVERAGE', label: 'No Coverage' },
  { value: 'LIMITED', label: 'Limited' },
  { value: 'PARTIAL', label: 'Partial' },
  { value: 'STRONG', label: 'Strong' },
] as const

const PLATFORMS = [
  'Windows',
  'Linux',
  'macOS',
  'Network',
  'Cloud',
  'Containers',
  'Azure AD',
  'Office 365',
  'SaaS',
  'IaaS',
] as const

interface MatrixFiltersProps {
  search: string
  onSearchChange: (v: string) => void
  platform: string
  onPlatformChange: (v: string) => void
  coverageLevel: string
  onCoverageLevelChange: (v: string) => void
  activeTactic: string
  onActiveTacticChange: (v: string) => void
  listView: boolean
  onListViewToggle: () => void
}

export default function MatrixFilters({
  search,
  onSearchChange,
  platform,
  onPlatformChange,
  coverageLevel,
  onCoverageLevelChange,
  activeTactic,
  onActiveTacticChange,
  listView,
  onListViewToggle,
}: MatrixFiltersProps) {
  const selectBase =
    'h-8 px-3 text-sm bg-warm-surface border border-border rounded-lg text-ivory focus:outline-none focus:border-copper transition-colors appearance-none cursor-pointer'

  return (
    <div className="flex flex-col gap-2.5">
      {/* Row 1: search + dropdowns + view toggle */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative">
          <Search
            size={13}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
          />
          <input
            type="text"
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Search techniques…"
            className="h-8 pl-8 pr-8 text-sm bg-warm-surface border border-border rounded-lg text-ivory placeholder-muted/60 focus:outline-none focus:border-copper transition-colors w-52"
          />
          {search && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-ivory transition-colors"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Platform dropdown */}
        <select
          value={platform}
          onChange={e => onPlatformChange(e.target.value)}
          className={selectBase}
        >
          <option value="">All Platforms</option>
          {PLATFORMS.map(p => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        {/* Coverage level dropdown */}
        <select
          value={coverageLevel}
          onChange={e => onCoverageLevelChange(e.target.value)}
          className={selectBase}
        >
          <option value="">All Coverage Levels</option>
          {COVERAGE_LEVELS.map(l => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>

        {/* List view toggle */}
        <button
          onClick={onListViewToggle}
          className={cn(
            'h-8 px-3 text-sm rounded-lg border transition-colors font-medium',
            listView
              ? 'bg-copper text-obsidian border-copper'
              : 'bg-warm-surface text-muted border-border hover:text-ivory hover:border-copper',
          )}
        >
          List View
        </button>
      </div>

      {/* Row 2: tactic pills */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => onActiveTacticChange('')}
          className={cn(
            'px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
            activeTactic === ''
              ? 'bg-copper text-obsidian'
              : 'bg-warm-surface text-muted border border-border hover:text-ivory hover:border-copper',
          )}
        >
          All Tactics
        </button>
        {TACTIC_ORDER.map(tactic => (
          <button
            key={tactic}
            onClick={() => onActiveTacticChange(tactic === activeTactic ? '' : tactic)}
            className={cn(
              'px-2.5 py-1 rounded-full text-xs font-medium transition-colors capitalize',
              activeTactic === tactic
                ? 'bg-copper text-obsidian'
                : 'bg-warm-surface text-muted border border-border hover:text-ivory hover:border-copper',
            )}
          >
            {tactic.replace(/-/g, ' ')}
          </button>
        ))}
      </div>
    </div>
  )
}
