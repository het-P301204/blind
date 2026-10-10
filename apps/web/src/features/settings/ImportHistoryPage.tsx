import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { History, RefreshCw } from 'lucide-react'
import { Button, EmptyState } from '@/components/ui'
import { cn, formatDate } from '@/lib/utils'
import { getHistory } from './DataSourcesPage'
import type { IngestionJob } from '@/types/api'

// â”€â”€â”€ Status Badge â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function StatusBadge({ status }: { status: IngestionJob['status'] }) {
  const config: Record<IngestionJob['status'], { label: string; classes: string }> = {
    completed: { label: 'Completed', classes: 'text-sage bg-sage/10' },
    failed: { label: 'Failed', classes: 'text-burnt-red bg-burnt-red/10' },
    running: { label: 'Running', classes: 'text-amber bg-amber/10' },
    pending: { label: 'Pending', classes: 'text-muted bg-raised-panel' },
  }
  const { label, classes } = config[status]

  return (
    <span
      className={cn(
        'inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full',
        classes
      )}
    >
      {label}
    </span>
  )
}

// â”€â”€â”€ Mini Progress Bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function MiniProgress({ pct }: { pct: number }) {
  const clamped = Math.min(100, Math.max(0, pct))
  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <div className="flex-1 h-1.5 bg-graphite rounded-full overflow-hidden">
        <div
          className="h-full bg-copper rounded-full transition-all duration-500"
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className="text-xs text-muted tabular-nums w-8 text-right">{clamped}%</span>
    </div>
  )
}

// â”€â”€â”€ Import History Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function ImportHistoryPage() {
  const [jobs, setJobs] = useState<IngestionJob[]>([])

  function loadHistory() {
    setJobs(getHistory())
  }

  useEffect(() => {
    loadHistory()
  }, [])

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
        <div>
          <h1 className="font-display font-semibold text-ivory text-lg">
            Import History
          </h1>
          <p className="text-xs text-muted mt-0.5">
            Past ingestion jobs â€” stored locally
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={loadHistory} className="gap-1.5">
          <RefreshCw size={13} />
          Refresh
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {jobs.length === 0 ? (
          <EmptyState
            icon={<History size={32} />}
            title="No import history"
            description="Ingestion jobs will appear here after you run an import from the Data Sources page."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-5 py-3 text-xs text-muted uppercase tracking-wider font-medium whitespace-nowrap">
                    Status
                  </th>
                  <th className="px-5 py-3 text-xs text-muted uppercase tracking-wider font-medium whitespace-nowrap">
                    Job ID
                  </th>
                  <th className="px-5 py-3 text-xs text-muted uppercase tracking-wider font-medium whitespace-nowrap">
                    Stage
                  </th>
                  <th className="px-5 py-3 text-xs text-muted uppercase tracking-wider font-medium whitespace-nowrap">
                    Progress
                  </th>
                  <th className="px-5 py-3 text-xs text-muted uppercase tracking-wider font-medium whitespace-nowrap">
                    Created
                  </th>
                  <th className="px-5 py-3 text-xs text-muted uppercase tracking-wider font-medium whitespace-nowrap">
                    Rules Parsed
                  </th>
                  <th className="px-5 py-3 text-xs text-muted uppercase tracking-wider font-medium whitespace-nowrap">
                    ATT&amp;CK Mapped
                  </th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job, i) => (
                  <motion.tr
                    key={job.job_id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15, delay: Math.min(i * 0.03, 0.4) }}
                    className="border-b border-border/50 hover:bg-raised-panel/50 transition-colors"
                  >
                    {/* Status */}
                    <td className="px-5 py-3">
                      <StatusBadge status={job.status} />
                    </td>

                    {/* Job ID */}
                    <td className="px-5 py-3">
                      <span className="font-mono text-xs text-muted" title={job.job_id}>
                        {job.job_id.slice(0, 12)}â€¦
                      </span>
                    </td>

                    {/* Stage */}
                    <td className="px-5 py-3">
                      <span className="text-xs text-ivory/70 max-w-[160px] block truncate">
                        {job.progress_stage || 'â€”'}
                      </span>
                    </td>

                    {/* Progress */}
                    <td className="px-5 py-3">
                      <MiniProgress pct={job.progress_pct} />
                    </td>

                    {/* Created at */}
                    <td className="px-5 py-3 whitespace-nowrap">
                      <span className="text-xs text-muted">
                        {formatDate(job.created_at)}
                      </span>
                    </td>

                    {/* Rules Parsed */}
                    <td className="px-5 py-3">
                      <span className="text-xs text-ivory/70">
                        {job.summary
                          ? job.summary.successfully_parsed.toLocaleString()
                          : 'â€”'}
                      </span>
                    </td>

                    {/* ATT&CK Mapped */}
                    <td className="px-5 py-3">
                      <span className="text-xs text-ivory/70">
                        {job.summary
                          ? job.summary.rules_with_attack_tags.toLocaleString()
                          : 'â€”'}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default ImportHistoryPage
