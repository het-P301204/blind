import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Database, ChevronRight, Clock, CheckCircle2, AlertTriangle } from 'lucide-react'
import { api } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import { MetricPanel, AnimatedCounter, EmptyState, ErrorState, Button } from '@/components/ui'
import type { CoverageResult, GapAssessment, HealthResponse, PaginatedResponse } from '@/types/api'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function coverageByTactic(data: CoverageResult[]) {
  const map: Record<string, { total: number; count: number }> = {}
  for (const r of data) {
    for (const tactic of r.tactics) {
      if (!map[tactic]) map[tactic] = { total: 0, count: 0 }
      map[tactic].total += r.coverage_score
      map[tactic].count += 1
    }
  }
  return Object.entries(map)
    .map(([tactic, { total, count }]) => ({
      tactic: tactic.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      avg: Math.round(total / count),
    }))
    .sort((a, b) => b.avg - a.avg)
}

// ─── Animation variants ───────────────────────────────────────────────────────

const pageVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07, ease: 'easeOut' },
  },
}

const itemVariant = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
}

// ─── Bar color by coverage score ─────────────────────────────────────────────

function tacticBarColor(avg: number): string {
  if (avg >= 60) return '#C47D50'
  if (avg >= 30) return '#C47D1E'
  return '#A95445'
}

// ─── Custom tooltip for recharts ─────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: {
  active?: boolean
  payload?: { value: number }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-raised-panel border border-border rounded-lg px-3 py-2 text-xs">
      <p className="text-muted mb-0.5">{label}</p>
      <p className="text-ivory font-mono font-semibold">{payload[0].value}% avg score</p>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const navigate = useNavigate()
  const { demoLoaded, setDemoLoaded } = useAppStore()

  const coverageQuery = useQuery<CoverageResult[]>({
    queryKey: ['coverage'],
    queryFn: () => api.getCoverage().then(r => r.data.data),
    enabled: demoLoaded,
  })

  const gapsQuery = useQuery<PaginatedResponse<GapAssessment>>({
    queryKey: ['gaps', 5],
    queryFn: () => api.listGaps({ limit: 5 }).then(r => r.data),
    enabled: demoLoaded,
  })

  const healthQuery = useQuery<HealthResponse>({
    queryKey: ['health'],
    queryFn: () => api.health().then(r => r.data),
  })

  async function handleLoadDemo() {
    try {
      await api.startIngest({ path: '', type: 'demo' })
      setDemoLoaded(true)
    } catch (e) {
      console.error('Demo load failed:', e)
    }
  }

  // ── Empty state ──────────────────────────────────────────────────────────
  if (!demoLoaded) {
    return (
      <div className="h-full flex items-center justify-center p-12">
        <EmptyState
          icon={<Database size={40} />}
          title="No corpus loaded"
          description="Load the demo dataset to see your detection coverage dashboard, or import your own Sigma rule corpus."
          action={{ label: 'Load Demo Data', onClick: handleLoadDemo }}
        />
      </div>
    )
  }

  // ── Error state ──────────────────────────────────────────────────────────
  if (coverageQuery.isError) {
    return (
      <div className="p-8">
        <ErrorState
          message="Failed to load coverage data. Check that the API is running."
          onRetry={() => coverageQuery.refetch()}
        />
      </div>
    )
  }

  // ── Derived values ───────────────────────────────────────────────────────
  const loading = coverageQuery.isLoading
  const coverage = Array.isArray(coverageQuery.data) ? coverageQuery.data : []
  const gaps = gapsQuery.data?.data ?? []
  const health = healthQuery.data

  const rulesIngested = coverage.reduce((acc, r) => acc + r.mapped_rule_count, 0)
  const attackMapped = coverage.filter(r => r.mapped_rule_count > 0).length
  const techniquesCovered = coverage.filter(r => r.coverage_level !== 'NO_MAPPED_COVERAGE').length
  const detectionGaps = coverage.filter(r => r.coverage_level === 'NO_MAPPED_COVERAGE').length
  const tacticChartData = coverageByTactic(coverage)

  return (
    <motion.div
      className="p-6 space-y-6 max-w-screen-2xl"
      variants={pageVariants}
      initial="hidden"
      animate="show"
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <motion.div variants={itemVariant}>
        <h1 className="font-display text-2xl font-semibold text-ivory">
          Detection Coverage Dashboard
        </h1>
        <p className="text-muted text-sm mt-1">
          Sigma rule corpus mapped against MITRE ATT&CK — coverage assessed across five dimensions.
        </p>
      </motion.div>

      {/* ── Metric panels ───────────────────────────────────────────────── */}
      <motion.div variants={itemVariant} className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricPanel
          label="Rules Ingested"
          value={loading ? '—' : <AnimatedCounter value={rulesIngested} />}
          description="Rules with ATT&CK mappings"
          loading={loading}
        />
        <MetricPanel
          label="ATT&CK Mapped"
          value={loading ? '—' : <AnimatedCounter value={attackMapped} />}
          description="Techniques with at least one rule"
          loading={loading}
        />
        <MetricPanel
          label="Techniques Covered"
          value={loading ? '—' : <AnimatedCounter value={techniquesCovered} />}
          description="Above NO_MAPPED_COVERAGE threshold"
          loading={loading}
        />
        <MetricPanel
          label="Detection Gaps"
          value={loading ? '—' : <AnimatedCounter value={detectionGaps} />}
          description="Techniques with no mapped rules"
          loading={loading}
        />
      </motion.div>

      {/* ── Charts row ──────────────────────────────────────────────────── */}
      <motion.div variants={itemVariant} className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Coverage by tactic bar chart */}
        <motion.div
          className="xl:col-span-2 bg-warm-surface border border-border rounded-xl p-5"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="font-display text-sm font-semibold text-ivory mb-5 uppercase tracking-wide">
            Coverage by Tactic
          </h2>
          {loading ? (
            <div className="h-72 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-copper border-t-transparent rounded-full animate-spin" />
            </div>
          ) : tacticChartData.length === 0 ? (
            <div className="h-72 flex items-center justify-center text-muted text-sm">
              No tactic data available.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(280, tacticChartData.length * 28)}>
              <BarChart
                data={tacticChartData}
                layout="vertical"
                margin={{ top: 0, right: 24, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#333330"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tick={{
                    fill: '#B8B1A2',
                    fontSize: 11,
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                  tickLine={false}
                  axisLine={{ stroke: '#333330' }}
                  tickFormatter={(v: number) => `${v}%`}
                />
                <YAxis
                  type="category"
                  dataKey="tactic"
                  width={170}
                  tick={{ fill: '#B8B1A2', fontSize: 11, fontFamily: 'Inter, sans-serif' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(196,125,80,0.06)' }} />
                <Bar dataKey="avg" radius={[0, 4, 4, 0]} maxBarSize={20}>
                  {tacticChartData.map((entry, i) => (
                    <Cell key={i} fill={tacticBarColor(entry.avg)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        {/* Top Priority Gaps */}
        <div className="bg-warm-surface border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-sm font-semibold text-ivory uppercase tracking-wide">
              Top Priority Gaps
            </h2>
            <button
              className="text-xs text-muted hover:text-copper transition-colors flex items-center gap-1"
              onClick={() => navigate('/gaps')}
            >
              View all <ChevronRight size={13} />
            </button>
          </div>
          <div className="space-y-2.5">
            {gapsQuery.isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 bg-raised-panel rounded-lg animate-pulse" />
              ))
            ) : gaps.length === 0 ? (
              <p className="text-muted text-sm text-center py-10">No gaps found.</p>
            ) : (
              gaps.map((gap, i) => (
                <motion.button
                  key={gap.technique_id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  onClick={() => navigate('/gaps')}
                  className="w-full text-left bg-raised-panel hover:bg-graphite border border-border hover:border-copper/40 rounded-lg px-3 py-2.5 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="font-mono text-[10px] text-copper bg-copper/10 rounded px-1.5 py-0.5 leading-none">
                      {gap.technique_id}
                    </span>
                    <span className="font-mono text-[10px] text-muted shrink-0">
                      {gap.priority_score.toFixed(1)}
                    </span>
                  </div>
                  <p className="text-xs text-ivory truncate mb-1.5">{gap.technique_name}</p>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {gap.tactics.slice(0, 2).map(t => (
                      <span
                        key={t}
                        className="text-[9px] bg-graphite text-muted rounded-full px-1.5 py-0.5 leading-none"
                      >
                        {t.replace(/-/g, ' ')}
                      </span>
                    ))}
                  </div>
                  <div className="h-1 bg-graphite rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-copper rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${gap.priority_score}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut', delay: i * 0.08 + 0.1 }}
                    />
                  </div>
                </motion.button>
              ))
            )}
          </div>
          {gaps.length > 0 && (
            <Button
              variant="secondary"
              size="sm"
              className="w-full mt-4"
              onClick={() => navigate('/gaps')}
            >
              View All Gaps
            </Button>
          )}
        </div>
      </motion.div>

      {/* ── Health card ─────────────────────────────────────────────────── */}
      <motion.div variants={itemVariant}>
        <div className="bg-warm-surface border border-border rounded-xl p-5">
          <h2 className="font-display text-sm font-semibold text-ivory uppercase tracking-wide mb-4">
            Ingestion Health
          </h2>
          {healthQuery.isLoading ? (
            <div className="flex gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-5 w-32 bg-raised-panel rounded animate-pulse" />
              ))}
            </div>
          ) : health ? (
            <div className="flex items-center gap-8 flex-wrap">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-sage" />
                <span className="text-sm text-muted">Status</span>
                <span className="font-mono text-xs text-sage bg-sage/10 px-2 py-0.5 rounded-full">
                  {health.status}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-muted" />
                <span className="text-sm text-muted">Version</span>
                <span className="font-mono text-xs text-ivory">{health.version}</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle
                  size={14}
                  className={health.demo_loaded ? 'text-amber' : 'text-muted'}
                />
                <span className="text-sm text-muted">Dataset</span>
                <span
                  className={`font-mono text-xs ${
                    health.demo_loaded ? 'text-amber' : 'text-muted'
                  }`}
                >
                  {health.demo_loaded ? 'Demo loaded' : 'No dataset'}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-muted text-sm">Health check unavailable.</p>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
