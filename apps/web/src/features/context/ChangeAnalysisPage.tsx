import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartTooltip,
  ResponsiveContainer, Cell, ReferenceLine
} from 'recharts'
import { GitCompare, Plus, Minus, Edit, AlertTriangle } from 'lucide-react'
import { api } from '@/lib/api'
import { Button, EmptyState, LoadingState, ErrorState, ParseBadge } from '@/components/ui'
import { formatDate, tacticLabel } from '@/lib/utils'
import type { CorpusSnapshot, SnapshotDiff, SigmaRule } from '@/types/api'

// ─── Rule card ────────────────────────────────────────────────────────────────

function RuleCard({
  rule,
  type,
}: {
  rule: SigmaRule
  type: 'added' | 'removed' | 'modified'
}) {
  const bg =
    type === 'added'
      ? 'bg-sage/10 border-sage/30'
      : type === 'removed'
      ? 'bg-burnt-red/10 border-burnt-red/30'
      : 'bg-warm-surface border-border'

  return (
    <div className={`flex items-start gap-3 px-3 py-2.5 rounded-card border ${bg}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <ParseBadge status={rule.parse_status} />
          <span className="font-mono text-[10px] text-muted truncate">{rule.id.slice(0, 14)}…</span>
        </div>
        <p className="text-xs text-ivory truncate">{rule.title ?? 'Unnamed Rule'}</p>
        {rule.attack_technique_ids.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {rule.attack_technique_ids.slice(0, 3).map(id => (
              <span key={id} className="font-mono text-[10px] text-copper bg-raised-panel px-1 py-0.5 rounded">
                {id}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ChangeAnalysisPage() {
  const [snapshotA, setSnapshotA] = useState('')
  const [snapshotB, setSnapshotB] = useState('')

  const snapshotsQuery = useQuery<CorpusSnapshot[]>({
    queryKey: ['snapshots'],
    queryFn: () => api.listSnapshots().then(r => r.data.data),
  })

  const compareMutation = useMutation({
    mutationFn: ({ a, b }: { a: string; b: string }) =>
      api.compareSnapshots(a, b).then(r => r.data),
  })

  const diff = compareMutation.data as SnapshotDiff | undefined

  function handleCompare() {
    if (snapshotA && snapshotB && snapshotA !== snapshotB) {
      compareMutation.mutate({ a: snapshotA, b: snapshotB })
    }
  }

  const snapshots = snapshotsQuery.data ?? []

  const tacticDeltaData = diff
    ? Object.entries(diff.coverage_delta_by_tactic).map(([tactic, delta]) => ({
        tactic: tacticLabel(tactic),
        delta: Math.round(delta * 100) / 100,
      }))
    : []

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-ivory mb-1">Change Analysis</h1>
        <p className="text-sm text-muted">Compare two corpus snapshots to see what changed.</p>
      </div>

      {/* Snapshot selectors */}
      <div className="bg-warm-surface border border-border rounded-panel p-5 mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-xs text-muted mb-1.5 uppercase tracking-wide">Snapshot A (before)</label>
            <select
              value={snapshotA}
              onChange={e => setSnapshotA(e.target.value)}
              className="w-full h-9 px-3 text-sm bg-graphite border border-border rounded-input text-ivory focus:outline-none focus:border-copper"
            >
              <option value="">Select snapshot…</option>
              {snapshots.map(s => (
                <option key={s.snapshot_id} value={s.snapshot_id}>
                  {s.label} — {formatDate(s.created_at)} ({s.rule_count} rules)
                </option>
              ))}
            </select>
          </div>

          <div className="flex-shrink-0 text-muted pb-2">→</div>

          <div className="flex-1">
            <label className="block text-xs text-muted mb-1.5 uppercase tracking-wide">Snapshot B (after)</label>
            <select
              value={snapshotB}
              onChange={e => setSnapshotB(e.target.value)}
              className="w-full h-9 px-3 text-sm bg-graphite border border-border rounded-input text-ivory focus:outline-none focus:border-copper"
            >
              <option value="">Select snapshot…</option>
              {snapshots.map(s => (
                <option key={s.snapshot_id} value={s.snapshot_id}>
                  {s.label} — {formatDate(s.created_at)} ({s.rule_count} rules)
                </option>
              ))}
            </select>
          </div>

          <Button
            variant="primary"
            onClick={handleCompare}
            disabled={!snapshotA || !snapshotB || snapshotA === snapshotB || compareMutation.isPending}
            loading={compareMutation.isPending}
            className="flex-shrink-0"
          >
            <GitCompare size={14} className="mr-1.5" />
            Compare
          </Button>
        </div>

        {snapshotA === snapshotB && snapshotA && (
          <p className="text-xs text-burnt-red mt-2 flex items-center gap-1">
            <AlertTriangle size={12} /> Select two different snapshots to compare.
          </p>
        )}

        {snapshotsQuery.isLoading && (
          <p className="text-xs text-muted mt-2">Loading snapshots…</p>
        )}
        {snapshots.length === 0 && !snapshotsQuery.isLoading && (
          <p className="text-xs text-muted mt-2">
            No snapshots available. Create snapshots from the Reports page to enable comparison.
          </p>
        )}
      </div>

      {/* No comparison yet */}
      {!diff && !compareMutation.isPending && !compareMutation.isError && (
        <EmptyState
          icon={<GitCompare size={32} className="text-muted" />}
          title="Select two snapshots to compare"
          description="Choose a before and after snapshot, then click Compare to see what changed in your detection coverage."
        />
      )}

      {/* Loading */}
      {compareMutation.isPending && <LoadingState />}

      {/* Error */}
      {compareMutation.isError && (
        <ErrorState
          message="Failed to compare snapshots"
          onRetry={() => compareMutation.mutate({ a: snapshotA, b: snapshotB })}
        />
      )}

      {/* Diff results */}
      {diff && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-sage/10 border border-sage/30 rounded-card p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Plus size={14} className="text-sage" />
                <span className="text-xs text-muted uppercase tracking-wide">Added Rules</span>
              </div>
              <div className="font-display text-2xl text-sage">{diff.added_rules.length}</div>
            </div>
            <div className="bg-burnt-red/10 border border-burnt-red/30 rounded-card p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Minus size={14} className="text-burnt-red" />
                <span className="text-xs text-muted uppercase tracking-wide">Removed Rules</span>
              </div>
              <div className="font-display text-2xl text-burnt-red">{diff.removed_rules.length}</div>
            </div>
            <div className="bg-warm-surface border border-border rounded-card p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Edit size={14} className="text-amber" />
                <span className="text-xs text-muted uppercase tracking-wide">Modified Rules</span>
              </div>
              <div className="font-display text-2xl text-amber">{diff.modified_rules.length}</div>
            </div>
          </div>

          {/* Coverage delta by tactic */}
          {tacticDeltaData.length > 0 && (
            <div className="bg-warm-surface border border-border rounded-panel p-5">
              <h2 className="font-display text-base font-semibold text-ivory mb-4">
                Coverage Delta by Tactic
              </h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={tacticDeltaData} layout="vertical" margin={{ left: 160, right: 20, top: 0, bottom: 0 }}>
                  <XAxis type="number" domain={['auto', 'auto']} tick={{ fill: '#B8B1A2', fontSize: 10 }} />
                  <YAxis type="category" dataKey="tactic" tick={{ fill: '#B8B1A2', fontSize: 11 }} width={155} />
                  <RechartTooltip
                    contentStyle={{ background: '#292722', border: '1px solid #333330', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: '#F0EBDD' }}
                  />
                  <ReferenceLine x={0} stroke="#333330" />
                  <Bar dataKey="delta" radius={[0, 3, 3, 0]}>
                    {tacticDeltaData.map(entry => (
                      <Cell key={entry.tactic} fill={entry.delta >= 0 ? '#C47D50' : '#A95445'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Newly covered techniques */}
          {diff.newly_covered_techniques.length > 0 && (
            <div>
              <h2 className="font-display text-base font-semibold text-ivory mb-3">
                Newly Covered Techniques ({diff.newly_covered_techniques.length})
              </h2>
              <div className="flex flex-wrap gap-2">
                {diff.newly_covered_techniques.map(id => (
                  <span key={id} className="font-mono text-xs text-sage bg-sage/10 border border-sage/30 px-2.5 py-1 rounded-full">
                    {id}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Newly exposed gaps */}
          {diff.newly_exposed_gaps.length > 0 && (
            <div>
              <h2 className="font-display text-base font-semibold text-ivory mb-3">
                Newly Exposed Gaps ({diff.newly_exposed_gaps.length})
              </h2>
              <div className="flex flex-wrap gap-2">
                {diff.newly_exposed_gaps.map(id => (
                  <span key={id} className="font-mono text-xs text-burnt-red bg-burnt-red/10 border border-burnt-red/30 px-2.5 py-1 rounded-full">
                    {id}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Added rules */}
          {diff.added_rules.length > 0 && (
            <div>
              <h2 className="font-display text-base font-semibold text-ivory mb-3 flex items-center gap-2">
                <Plus size={16} className="text-sage" />
                Added Rules ({diff.added_rules.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {diff.added_rules.map(r => (
                  <RuleCard key={r.id} rule={r} type="added" />
                ))}
              </div>
            </div>
          )}

          {/* Removed rules */}
          {diff.removed_rules.length > 0 && (
            <div>
              <h2 className="font-display text-base font-semibold text-ivory mb-3 flex items-center gap-2">
                <Minus size={16} className="text-burnt-red" />
                Removed Rules ({diff.removed_rules.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {diff.removed_rules.map(r => (
                  <RuleCard key={r.id} rule={r} type="removed" />
                ))}
              </div>
            </div>
          )}

          {/* Modified rules */}
          {diff.modified_rules.length > 0 && (
            <div>
              <h2 className="font-display text-base font-semibold text-ivory mb-3 flex items-center gap-2">
                <Edit size={16} className="text-amber" />
                Modified Rules ({diff.modified_rules.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {diff.modified_rules.map(r => (
                  <RuleCard key={r.id} rule={r} type="modified" />
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}
