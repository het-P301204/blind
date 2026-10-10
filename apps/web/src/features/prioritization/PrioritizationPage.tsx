import { useState, useCallback } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Download,
  RefreshCw,
  RotateCcw,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  Button,
  TelemetryBadge,
  ValidationBadge,
  EmptyState,
  ErrorState,
} from '@/components/ui'
import { api } from '@/lib/api'
import { cn, downloadBlob, tacticLabel } from '@/lib/utils'
import type { GapAssessment } from '@/types/api'

// â”€â”€â”€ Default Weights â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface FactorWeight {
  key: string
  label: string
  description: string
  value: number
  default: number
}

const DEFAULT_WEIGHTS: FactorWeight[] = [
  {
    key: 'coverage_gap',
    label: 'Coverage Gap',
    description: 'Weight for lack of mapped detection rules',
    value: 0.3,
    default: 0.3,
  },
  {
    key: 'telemetry_readiness',
    label: 'Telemetry Readiness',
    description: 'Weight for available telemetry to support detection',
    value: 0.25,
    default: 0.25,
  },
  {
    key: 'deployment_confidence',
    label: 'Deployment Confidence',
    description: 'Weight for confidence rules are actually deployed',
    value: 0.2,
    default: 0.2,
  },
  {
    key: 'validation_confidence',
    label: 'Validation Confidence',
    description: 'Weight for validated rule effectiveness',
    value: 0.15,
    default: 0.15,
  },
  {
    key: 'business_criticality',
    label: 'Business Criticality',
    description: 'Weight for asset and process criticality',
    value: 0.05,
    default: 0.05,
  },
  {
    key: 'threat_relevance',
    label: 'Threat Relevance',
    description: 'Weight for threat actor relevance to your environment',
    value: 0.05,
    default: 0.05,
  },
]

// â”€â”€â”€ Sort types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type SortKey = 'priority_score' | 'coverage_score' | 'technique_id'
type SortDir = 'asc' | 'desc'

// â”€â”€â”€ Weight Editor â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface WeightEditorProps {
  weights: FactorWeight[]
  onChange: (updated: FactorWeight[]) => void
  onRecalculate: () => void
  onReset: () => void
  isDirty: boolean
  isLoading: boolean
}

function WeightEditor({
  weights,
  onChange,
  onRecalculate,
  onReset,
  isDirty,
  isLoading,
}: WeightEditorProps) {
  function updateWeight(key: string, value: number) {
    onChange(weights.map(w => (w.key === key ? { ...w, value } : w)))
  }

  const totalWeight = weights.reduce((acc, w) => acc + w.value, 0)

  return (
    <div className="w-80 shrink-0 bg-graphite border-r border-border flex flex-col h-full overflow-hidden">
      <div className="px-5 py-4 border-b border-border shrink-0">
        <h2 className="font-display font-semibold text-ivory text-sm">
          Priority Weights
        </h2>
        <p className="text-xs text-muted mt-1 leading-relaxed">
          Adjust factor weights to reflect your threat model
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {weights.map(w => (
          <div key={w.key} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs text-ivory font-medium">{w.label}</label>
              <span className="font-mono text-xs text-copper tabular-nums">
                {w.value.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={w.value}
              onChange={e => updateWeight(w.key, parseFloat(e.target.value))}
              className="w-full accent-copper"
            />
            <p className="text-[10px] text-muted leading-relaxed">
              {w.description}
            </p>
          </div>
        ))}

        {/* Total Weight Indicator */}
        <div
          className={cn(
            'rounded-lg p-3 text-xs border',
            Math.abs(totalWeight - 1) < 0.001
              ? 'bg-sage/10 border-sage/30 text-sage'
              : 'bg-amber/10 border-amber/30 text-amber'
          )}
        >
          <div className="flex items-center gap-1.5">
            {Math.abs(totalWeight - 1) >= 0.001 && (
              <AlertCircle size={12} className="shrink-0" />
            )}
            <span className="font-mono font-medium">
              Î£ weights = {totalWeight.toFixed(2)}
            </span>
          </div>
          {Math.abs(totalWeight - 1) >= 0.001 && (
            <p className="mt-1 text-[10px] opacity-80">
              Weights are normalised automatically in the formula.
            </p>
          )}
        </div>

        {/* Formula */}
        <div className="space-y-2">
          <p className="text-xs text-muted uppercase tracking-wider font-medium">
            Formula
          </p>
          <pre className="bg-obsidian rounded-lg p-3 font-mono text-xs text-ivory whitespace-pre-wrap">
            {'Priority =\n  Î£(factor_value Ã— weight)\n  â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€\n        Î£(weights)'}
          </pre>
          <p className="text-[10px] text-muted leading-relaxed italic">
            Unknown data is excluded from calculation â€” never filled with zeros or
            maximums.
          </p>
        </div>

        {/* Exclusion note */}
        <div className="bg-raised-panel border border-border rounded-lg px-3 py-2 flex items-start gap-2">
          <AlertCircle size={12} className="text-muted shrink-0 mt-0.5" />
          <p className="text-[10px] text-muted leading-relaxed">
            Unknown data: excluded from calculation
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="px-5 py-4 border-t border-border space-y-2 shrink-0">
        <Button
          variant="primary"
          size="sm"
          className="w-full"
          loading={isLoading}
          onClick={onRecalculate}
        >
          <RefreshCw size={13} />
          Recalculate
        </Button>
        <button
          onClick={onReset}
          disabled={!isDirty}
          className="w-full text-xs text-muted hover:text-ivory disabled:opacity-40 disabled:cursor-not-allowed transition-colors py-1"
        >
          <span className="flex items-center justify-center gap-1">
            <RotateCcw size={11} />
            Reset to defaults
          </span>
        </button>
      </div>
    </div>
  )
}

// â”€â”€â”€ Results Table â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface ResultsTableProps {
  gaps: GapAssessment[]
  sortKey: SortKey
  sortDir: SortDir
  onSort: (key: SortKey) => void
  isLoading: boolean
}

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

function ResultsTable({
  gaps,
  sortKey,
  sortDir,
  onSort,
  isLoading,
}: ResultsTableProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={24} className="text-copper animate-spin" />
          <p className="text-sm text-muted">Recalculating prioritiesâ€¦</p>
        </div>
      </div>
    )
  }

  if (gaps.length === 0) {
    return (
      <EmptyState
        title="No results"
        description="Click Recalculate to compute gaps with your current weights."
      />
    )
  }

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
          </tr>
        </thead>
        <tbody>
          <AnimatePresence initial={false}>
            {gaps.map((gap, i) => (
              <motion.tr
                key={gap.technique_id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.12, delay: Math.min(i * 0.01, 0.3) }}
                className="border-b border-border/50 hover:bg-raised-panel transition-colors"
              >
                {/* Rank */}
                <td className="px-4 py-2.5">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-copper/20 text-copper text-xs font-mono font-bold">
                    {gap.priority_rank}
                  </span>
                </td>

                {/* Technique */}
                <td className="px-4 py-2.5">
                  <span className="font-mono text-xs text-copper block">
                    {gap.technique_id}
                  </span>
                  <span className="text-sm text-ivory">{gap.technique_name}</span>
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
                  <div className="flex items-center gap-2 min-w-[90px]">
                    <div className="flex-1 bg-graphite rounded-full h-1.5">
                      <div
                        className="bg-copper h-1.5 rounded-full"
                        style={{ width: `${gap.coverage_score * 100}%` }}
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
              </motion.tr>
            ))}
          </AnimatePresence>
        </tbody>
      </table>
    </div>
  )
}

// â”€â”€â”€ Prioritization Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function weightsToRecord(factors: FactorWeight[]): Record<string, number> {
  return Object.fromEntries(factors.map(f => [f.key, f.value]))
}

function weightsAreDirty(factors: FactorWeight[]): boolean {
  return factors.some(f => Math.abs(f.value - f.default) > 0.001)
}

export default function PrioritizationPage() {
  const [weights, setWeights] = useState<FactorWeight[]>(DEFAULT_WEIGHTS)
  const [activeWeights, setActiveWeights] = useState<Record<string, number>>(
    weightsToRecord(DEFAULT_WEIGHTS)
  )
  const [sortKey, setSortKey] = useState<SortKey>('priority_score')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [exporting, setExporting] = useState(false)

  const isDirty = weightsAreDirty(weights)

  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ['gaps-prioritized', activeWeights],
    queryFn: () =>
      api
        .listGaps({ limit: 500 })
        .then(r => r.data),
    placeholderData: keepPreviousData,
  })

  function handleRecalculate() {
    setActiveWeights(weightsToRecord(weights))
  }

  function handleReset() {
    setWeights(DEFAULT_WEIGHTS)
  }

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
    const av: string | number = a[sortKey]
    const bv: string | number = b[sortKey]
    if (sortDir === 'asc') return av < bv ? -1 : av > bv ? 1 : 0
    return av > bv ? -1 : av < bv ? 1 : 0
  })

  async function handleExport() {
    try {
      setExporting(true)
      const res = await api.exportReport('csv')
      downloadBlob(res.data as Blob, 'blind-prioritization.csv')
      toast.success('Report exported')
    } catch {
      toast.error('Export failed')
    } finally {
      setExporting(false)
    }
  }

  const isRecalculated = isDirty

  return (
    <div className="flex h-full overflow-hidden">
      <WeightEditor
        weights={weights}
        onChange={setWeights}
        onRecalculate={handleRecalculate}
        onReset={handleReset}
        isDirty={isDirty}
        isLoading={isFetching}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="font-display font-semibold text-ivory text-lg">
                Prioritization Workspace
              </h1>
              <p className="text-xs text-muted mt-0.5">
                Model-driven gap prioritisation with configurable weights
              </p>
            </div>
            <AnimatePresence>
              {isRecalculated && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="text-xs text-amber bg-amber/10 border border-amber/20 rounded-full px-2.5 py-0.5 font-medium"
                >
                  Weights modified
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-2">
            {data && (
              <span className="text-xs text-muted">
                {sortedGaps.length} technique
                {sortedGaps.length !== 1 ? 's' : ''}
              </span>
            )}
            <Button
              variant="secondary"
              size="sm"
              loading={exporting}
              onClick={handleExport}
            >
              <Download size={14} />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {isError ? (
            <ErrorState
              message={
                error instanceof Error
                  ? error.message
                  : 'Failed to load gap data'
              }
            />
          ) : (
            <ResultsTable
              gaps={sortedGaps}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={handleSort}
              isLoading={isLoading || isFetching}
            />
          )}
        </div>
      </div>
    </div>
  )
}

