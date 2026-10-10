import { useState, useCallback } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  Download,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Eye,
  Copy,
  Check,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartTooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import toast from 'react-hot-toast'
import {
  Button,
  TelemetryBadge,
  ValidationBadge,
  CoverageBadge,
  DeploymentBadge,
  EmptyState,
  LoadingState,
  ErrorState,
  Drawer,
} from '@/components/ui'
import { api } from '@/lib/api'
import { tacticLabel } from '@/lib/utils'
import type {
  GapAssessment,
  CoverageLevel,
  TelemetryStatus,
  ValidationStatus,
} from '@/types/api'

// â”€â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const COVERAGE_LEVELS: { value: CoverageLevel | ''; label: string }[] = [
  { value: '', label: 'All Coverage' },
  { value: 'NO_MAPPED_COVERAGE', label: 'No Coverage' },
  { value: 'LIMITED', label: 'Limited' },
  { value: 'PARTIAL', label: 'Partial' },
  { value: 'STRONG', label: 'Strong' },
  { value: 'UNKNOWN', label: 'Unknown' },
]

const TELEMETRY_STATUSES: { value: TelemetryStatus | ''; label: string }[] = [
  { value: '', label: 'All Telemetry' },
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'PARTIAL', label: 'Partial' },
  { value: 'MISSING', label: 'Missing' },
  { value: 'UNKNOWN', label: 'Unknown' },
]

const VALIDATION_STATUSES: { value: ValidationStatus | ''; label: string }[] = [
  { value: '', label: 'All Validation' },
  { value: 'NOT_TESTED', label: 'Not Tested' },
  { value: 'PLANNED', label: 'Planned' },
  { value: 'TESTED', label: 'Tested' },
  { value: 'PASSED', label: 'Passed' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'INCONCLUSIVE', label: 'Inconclusive' },
]

const TACTICS = [
  '',
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
]

type SortKey = 'priority_score' | 'coverage_score' | 'technique_id'
type SortDir = 'asc' | 'desc'

// â”€â”€â”€ Filter State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface GapFilters {
  coverage_level: string
  telemetry_status: string
  validation_status: string
  tactic: string
  min_score: number
}

const DEFAULT_FILTERS: GapFilters = {
  coverage_level: '',
  telemetry_status: '',
  validation_status: '',
  tactic: '',
  min_score: 0,
}

// â”€â”€â”€ Gap Detail Drawer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface GapDetailDrawerProps {
  gap: GapAssessment | null
  onClose: () => void
}

function GapDetailDrawer({ gap, onClose }: GapDetailDrawerProps) {
  const chartData = gap?.priority_factors.map(f => ({
    name: f.name
      .split('_')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' '),
    contribution: parseFloat(f.contribution.toFixed(3)),
    weight: f.weight,
  }))

  return (
    <Drawer
      open={gap !== null}
      onClose={onClose}
      title={gap ? `${gap.technique_id} â€” ${gap.technique_name}` : ''}
      width="w-[600px]"
    >
      {gap && (
        <div className="space-y-5">
          {/* Status badges */}
          <div className="flex flex-wrap gap-2">
            <CoverageBadge level={gap.coverage_level} />
            <TelemetryBadge status={gap.telemetry_status} />
            <ValidationBadge status={gap.validation_status} />
            <DeploymentBadge status={gap.deployment_status} />
          </div>

          {/* Priority Rank */}
          <div className="flex items-center gap-4 bg-warm-surface rounded-lg p-4">
            <div>
              <p className="text-xs text-muted uppercase tracking-wider mb-1">
                Priority Rank
              </p>
              <p className="font-display text-4xl font-bold text-copper">
                #{gap.priority_rank}
              </p>
            </div>
            <div className="w-px h-10 bg-border" />
            <div>
              <p className="text-xs text-muted uppercase tracking-wider mb-1">
                Priority Score
              </p>
              <p className="font-mono text-2xl font-bold text-ivory">
                {gap.priority_score.toFixed(1)}
              </p>
            </div>
            <div className="w-px h-10 bg-border" />
            <div>
              <p className="text-xs text-muted uppercase tracking-wider mb-1">
                Mapped Rules
              </p>
              <p className="font-mono text-2xl font-bold text-ivory">
                {gap.mapped_rule_count}
              </p>
            </div>
          </div>

          {/* Tactics */}
          {gap.tactics.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted uppercase tracking-wider font-medium">
                Tactics
              </p>
              <div className="flex flex-wrap gap-1.5">
                {gap.tactics.map(t => (
                  <span
                    key={t}
                    className="text-xs bg-raised-panel text-muted rounded px-2 py-0.5"
                  >
                    {tacticLabel(t)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Priority Factors Chart */}
          <div className="space-y-2">
            <p className="text-xs text-muted uppercase tracking-wider font-medium">
              Priority Computation
            </p>
            <div className="bg-obsidian rounded-lg p-3">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 0, right: 16, bottom: 0, left: 8 }}
                >
                  <XAxis
                    type="number"
                    domain={[0, 0.35]}
                    tick={{ fontSize: 10, fill: '#B8B1A2' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 10, fill: '#B8B1A2' }}
                    tickLine={false}
                    axisLine={false}
                    width={120}
                  />
                  <RechartTooltip
                    contentStyle={{
                      backgroundColor: '#22211E',
                      border: '1px solid #333330',
                      borderRadius: 6,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: '#F0EBDD' }}
                    itemStyle={{ color: '#C47D50' }}
                    formatter={(val: number) => [val.toFixed(3), 'Contribution']}
                  />
                  <Bar dataKey="contribution" radius={[0, 3, 3, 0]}>
                    {chartData?.map((_, i) => (
                      <Cell key={i} fill="#C47D50" fillOpacity={0.8} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Factor details */}
            <div className="space-y-1">
              {gap.priority_factors.map(f => (
                <div
                  key={f.name}
                  className="flex items-center justify-between text-xs py-1.5 border-b border-border/50 last:border-0"
                >
                  <div className="space-y-0.5">
                    <p className="text-ivory capitalize">
                      {f.name.replace(/_/g, ' ')}
                    </p>
                    <p className="text-muted text-[10px]">{f.description}</p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="font-mono text-copper">{f.contribution.toFixed(3)}</p>
                    <p className="text-muted text-[10px]">
                      w={f.weight} Ã— v={f.value.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Coverage Score */}
          <div className="space-y-1.5">
            <p className="text-xs text-muted uppercase tracking-wider font-medium">
              Coverage Score
            </p>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-graphite rounded-full h-2">
                <div
                  className="bg-copper h-2 rounded-full transition-all"
                  style={{ width: `${gap.coverage_score * 100}%` }}
                />
              </div>
              <span className="font-mono text-sm text-ivory shrink-0">
                {(gap.coverage_score * 100).toFixed(0)}%
              </span>
            </div>
          </div>

          {/* Recommended Action */}
          {gap.recommended_action && (
            <div className="border-l-2 border-copper pl-3 bg-copper/5 rounded-r-lg p-3">
              <p className="text-xs text-copper uppercase tracking-wider font-medium mb-1">
                Recommended Action
              </p>
              <p className="text-sm text-ivory/80 leading-relaxed">
                {gap.recommended_action}
              </p>
            </div>
          )}

          {/* Telemetry Dependencies */}
          {gap.telemetry_dependencies.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted uppercase tracking-wider font-medium">
                Telemetry Dependencies
              </p>
              <ul className="space-y-1">
                {gap.telemetry_dependencies.map((dep, i) => (
                  <li
                    key={i}
                    className="text-xs text-ivory/70 flex items-start gap-1.5"
                  >
                    <span className="text-copper mt-0.5">Â·</span>
                    {dep}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Drawer>
  )
}

// â”€â”€â”€ Filter Bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface FilterBarProps {
  filters: GapFilters
  onChange: (f: GapFilters) => void
  onClear: () => void
}

const selectClass =
  'bg-raised-panel border border-border rounded-md px-3 py-1.5 text-sm text-ivory focus:outline-none focus:border-copper/60 transition-colors'

function GapFilterBar({ filters, onChange, onClear }: FilterBarProps) {
  const hasActive =
    filters.coverage_level ||
    filters.telemetry_status ||
    filters.validation_status ||
    filters.tactic ||
    filters.min_score > 0

  return (
    <div className="flex items-end gap-3 flex-wrap">
      <div>
        <label className="text-xs text-muted block mb-1">Coverage</label>
        <select
          value={filters.coverage_level}
          onChange={e => onChange({ ...filters, coverage_level: e.target.value })}
          className={selectClass}
        >
          {COVERAGE_LEVELS.map(o => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs text-muted block mb-1">Telemetry</label>
        <select
          value={filters.telemetry_status}
          onChange={e => onChange({ ...filters, telemetry_status: e.target.value })}
          className={selectClass}
        >
          {TELEMETRY_STATUSES.map(o => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs text-muted block mb-1">Validation</label>
        <select
          value={filters.validation_status}
          onChange={e =>
            onChange({ ...filters, validation_status: e.target.value })
          }
          className={selectClass}
        >
          {VALIDATION_STATUSES.map(o => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs text-muted block mb-1">Tactic</label>
        <select
          value={filters.tactic}
          onChange={e => onChange({ ...filters, tactic: e.target.value })}
          className={selectClass}
        >
          <option value="">All Tactics</option>
          {TACTICS.filter(Boolean).map(t => (
            <option key={t} value={t}>
              {tacticLabel(t)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs text-muted block mb-1">
          Min Priority: {filters.min_score}
        </label>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={filters.min_score}
          onChange={e =>
            onChange({ ...filters, min_score: Number(e.target.value) })
          }
          className="w-32 accent-copper"
        />
      </div>

      <button
        onClick={onClear}
        disabled={!hasActive}
        className="text-xs text-muted hover:text-ivory disabled:opacity-40 disabled:cursor-not-allowed transition-colors pb-1.5"
      >
        Clear
      </button>
    </div>
  )
}

// â”€â”€â”€ Sort Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface SortHeaderProps {
  label: string
  sortKey: SortKey
  currentKey: SortKey
  currentDir: SortDir
  onSort: (key: SortKey) => void
}

function SortHeader({
  label,
  sortKey,
  currentKey,
  currentDir,
  onSort,
}: SortHeaderProps) {
  const active = sortKey === currentKey
  return (
    <button
      onClick={() => onSort(sortKey)}
      className="flex items-center gap-1 text-xs uppercase tracking-wider font-medium text-muted hover:text-ivory transition-colors"
    >
      {label}
      {active ? (
        currentDir === 'asc' ? (
          <ChevronUp size={12} />
        ) : (
          <ChevronDown size={12} />
        )
      ) : (
        <ChevronsUpDown size={12} className="opacity-40" />
      )}
    </button>
  )
}

// â”€â”€â”€ Gaps Table â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface GapsTableProps {
  gaps: GapAssessment[]
  sortKey: SortKey
  sortDir: SortDir
  onSort: (key: SortKey) => void
  onSelect: (gap: GapAssessment) => void
}

const gapTableVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.03 } },
}

const gapRowVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } },
}

function GapIdChip({ id }: { id: string }) {
  const [copied, setCopied] = useState(false)

  function handleCopy(e: React.MouseEvent) {
    e.stopPropagation()
    navigator.clipboard.writeText(id).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <button
      onClick={handleCopy}
      title="Click to copy"
      className="inline-flex items-center gap-1 font-mono text-xs text-copper hover:bg-copper/10 rounded px-1 py-0.5 transition-colors group/chip"
    >
      {id}
      {copied
        ? <Check size={10} className="text-green-400 shrink-0" />
        : <Copy size={10} className="opacity-0 group-hover/chip:opacity-60 shrink-0 transition-opacity" />
      }
    </button>
  )
}

function GapsTable({ gaps, sortKey, sortDir, onSort, onSelect }: GapsTableProps) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-border">
            <th className="px-4 py-2.5 text-xs text-muted uppercase tracking-wider font-medium">
              Rank
            </th>
            <th className="px-4 py-2.5">
              <SortHeader
                label="Technique"
                sortKey="technique_id"
                currentKey={sortKey}
                currentDir={sortDir}
                onSort={onSort}
              />
            </th>
            <th className="px-4 py-2.5 text-xs text-muted uppercase tracking-wider font-medium">
              Tactics
            </th>
            <th className="px-4 py-2.5">
              <SortHeader
                label="Coverage"
                sortKey="coverage_score"
                currentKey={sortKey}
                currentDir={sortDir}
                onSort={onSort}
              />
            </th>
            <th className="px-4 py-2.5 text-xs text-muted uppercase tracking-wider font-medium">
              Telemetry
            </th>
            <th className="px-4 py-2.5 text-xs text-muted uppercase tracking-wider font-medium">
              Validation
            </th>
            <th className="px-4 py-2.5">
              <SortHeader
                label="Priority"
                sortKey="priority_score"
                currentKey={sortKey}
                currentDir={sortDir}
                onSort={onSort}
              />
            </th>
            <th className="px-4 py-2.5" />
          </tr>
        </thead>
        <motion.tbody
          variants={shouldReduceMotion ? undefined : gapTableVariants}
          initial="hidden"
          animate="visible"
        >
          <AnimatePresence initial={false}>
            {gaps.map((gap, i) => {
              const shouldAnimate = !shouldReduceMotion && i < 25
              return (
              <motion.tr
                key={gap.technique_id}
                variants={shouldAnimate ? gapRowVariants : undefined}
                whileHover={shouldReduceMotion ? undefined : { scale: 1.005 }}
                onClick={() => onSelect(gap)}
                className="border-b border-border/50 hover:bg-raised-panel cursor-pointer transition-colors"
              >
                {/* Rank */}
                <td className="px-4 py-2.5">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-copper/20 text-copper text-xs font-mono font-bold">
                    {gap.priority_rank}
                  </span>
                </td>

                {/* Technique */}
                <td className="px-4 py-2.5">
                  <div>
                    <GapIdChip id={gap.technique_id} />
                    <p className="text-sm text-ivory mt-0.5">{gap.technique_name}</p>
                  </div>
                </td>

                {/* Tactics */}
                <td className="px-4 py-2.5">
                  <div className="flex flex-wrap gap-1">
                    {gap.tactics.slice(0, 2).map(t => (
                      <span
                        key={t}
                        className="text-xs bg-raised-panel text-muted rounded px-1.5 py-0.5"
                      >
                        {tacticLabel(t)}
                      </span>
                    ))}
                    {gap.tactics.length > 2 && (
                      <span className="text-xs text-muted">
                        +{gap.tactics.length - 2}
                      </span>
                    )}
                  </div>
                </td>

                {/* Coverage */}
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2 min-w-[100px]">
                    <div className="flex-1 bg-graphite rounded-full h-1.5 overflow-hidden">
                      <motion.div
                        className="bg-copper h-1.5 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${gap.coverage_score * 100}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut', delay: i * 0.015 }}
                      />
                    </div>
                    <span className="text-xs text-muted font-mono shrink-0">
                      {gap.mapped_rule_count}
                    </span>
                  </div>
                </td>

                {/* Telemetry */}
                <td className="px-4 py-2.5">
                  <TelemetryBadge status={gap.telemetry_status} />
                </td>

                {/* Validation */}
                <td className="px-4 py-2.5">
                  <ValidationBadge status={gap.validation_status} />
                </td>

                {/* Priority Score */}
                <td className="px-4 py-2.5">
                  <span className="font-mono font-bold text-ivory text-sm">
                    {gap.priority_score.toFixed(1)}
                  </span>
                </td>

                {/* View */}
                <td className="px-4 py-2.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={e => {
                      e.stopPropagation()
                      onSelect(gap)
                    }}
                  >
                    <Eye size={13} />
                    View
                  </Button>
                </td>
              </motion.tr>
              )
            })}
          </AnimatePresence>
        </motion.tbody>
      </table>
    </div>
  )
}

// â”€â”€â”€ Gaps Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function GapsPage() {
  const [filters, setFilters] = useState<GapFilters>(DEFAULT_FILTERS)
  const [sortKey, setSortKey] = useState<SortKey>('priority_score')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [selectedGap, setSelectedGap] = useState<GapAssessment | null>(null)
  const [exporting, setExporting] = useState(false)
  const [exportLabel, setExportLabel] = useState('Export CSV')

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['gaps', filters],
    queryFn: () =>
      api
        .listGaps({
          coverage_level: filters.coverage_level || undefined,
          telemetry_status: filters.telemetry_status || undefined,
          validation_status: filters.validation_status || undefined,
          tactic: filters.tactic || undefined,
          min_score: filters.min_score > 0 ? filters.min_score : undefined,
          limit: 500,
        })
        .then(r => r.data),
    placeholderData: keepPreviousData,
  })

  const handleSort = useCallback(
    (key: SortKey) => {
      if (key === sortKey) {
        setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
      } else {
        setSortKey(key)
        setSortDir('desc')
      }
    },
    [sortKey]
  )

  const sortedGaps = [...(data?.data ?? [])].sort((a, b) => {
    let av: string | number = a[sortKey]
    let bv: string | number = b[sortKey]
    if (sortDir === 'asc') return av < bv ? -1 : av > bv ? 1 : 0
    return av > bv ? -1 : av < bv ? 1 : 0
  })

  function handleExport() {
    if (!sortedGaps.length) return
    setExporting(true)
    try {
      const header = 'technique_id,technique_name,tactics,priority_score,coverage_score,coverage_level'
      const rows = sortedGaps.map(gap => [
        gap.technique_id,
        `"${gap.technique_name.replace(/"/g, '""')}"`,
        `"${gap.tactics.join(';')}"`,
        gap.priority_score.toFixed(1),
        gap.coverage_score.toFixed(4),
        gap.coverage_level,
      ].join(','))
      const csv = [header, ...rows].join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const date = new Date().toISOString().slice(0, 10)
      const link = document.createElement('a')
      link.href = url
      link.download = `blind-gaps-${date}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      setExportLabel('Exported!')
      setTimeout(() => setExportLabel('Export CSV'), 2000)
    } catch {
      toast.error('Export failed')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
        <div>
          <h1 className="font-display font-semibold text-ivory text-lg">
            Coverage Gaps
          </h1>
          <p className="text-xs text-muted mt-0.5">
            Prioritised detection blind spots ranked by risk
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          loading={exporting}
          onClick={handleExport}
        >
          <Download size={14} />
          {exportLabel}
        </Button>
      </div>

      {/* Filter bar */}
      <div className="px-6 py-3 border-b border-border shrink-0 bg-graphite">
        <GapFilterBar
          filters={filters}
          onChange={f => setFilters(f)}
          onClear={() => setFilters(DEFAULT_FILTERS)}
        />
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <LoadingState />
        ) : isError ? (
          <ErrorState
            message={
              error instanceof Error ? error.message : 'Failed to load gaps'
            }
          />
        ) : sortedGaps.length === 0 ? (
          <EmptyState
            title="No gaps found"
            description="Adjust your filters or run a coverage analysis to see gaps."
          />
        ) : (
          <>
            <div className="px-6 py-2 text-xs text-muted border-b border-border/50">
              {sortedGaps.length} technique{sortedGaps.length !== 1 ? 's' : ''}{' '}
              Â· sorted by {sortKey.replace(/_/g, ' ')} ({sortDir})
            </div>
            <GapsTable
              gaps={sortedGaps}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={handleSort}
              onSelect={setSelectedGap}
            />
          </>
        )}
      </div>

      <GapDetailDrawer gap={selectedGap} onClose={() => setSelectedGap(null)} />
    </div>
  )
}

