import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FolderOpen, Play, Database, XCircle, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button, MetricPanel, ErrorState } from '@/components/ui'
import { api } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { useIngestionPoller } from '@/hooks/useIngestionPoller'
import type { IngestionJob } from '@/types/api'

// â”€â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const HISTORY_KEY = 'blind_ingestion_history'

const STAGE_LABELS: Record<string, string> = {
  DISCOVERING_FILES: 'Discovering Files',
  PARSING_RULES: 'Parsing Rules',
  VALIDATING_METADATA: 'Validating Metadata',
  RESOLVING_ATTACK_IDS: 'Resolving ATT&CK IDs',
  CALCULATING_COVERAGE: 'Calculating Coverage',
  BUILDING_REPORT: 'Building Report',
}

// â”€â”€â”€ History Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function getHistory(): IngestionJob[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    return raw ? (JSON.parse(raw) as IngestionJob[]) : []
  } catch {
    return []
  }
}

function saveToHistory(job: IngestionJob) {
  try {
    const existing = getHistory()
    const updated = [job, ...existing.filter(j => j.job_id !== job.job_id)]
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated.slice(0, 100)))
  } catch {
    // localStorage may be unavailable
  }
}

// â”€â”€â”€ Progress Section â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface ProgressSectionProps {
  job: IngestionJob
  onCancel: () => void
}

function ProgressSection({ job, onCancel }: ProgressSectionProps) {
  const stageLabel =
    STAGE_LABELS[job.progress_stage] ?? job.progress_stage ?? 'Processingâ€¦'
  const isRunning = job.status === 'running' || job.status === 'queued'
  const isFailed = job.status === 'failed'
  const isCompleted = job.status === 'completed'

  return (
    <section>
      <h2 className="font-display font-semibold text-ivory text-sm mb-3">
        Ingestion Progress
      </h2>

      {isFailed && (
        <ErrorState
          message={`Ingestion failed during: ${stageLabel}`}
          onRetry={onCancel}
        />
      )}

      {isRunning && (
        <div className="bg-warm-surface border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-display font-semibold text-ivory text-lg">
                {stageLabel}
              </p>
              <p className="text-muted text-xs mt-0.5 font-mono">
                {job.job_id.slice(0, 16)}â€¦
              </p>
            </div>
            <span className="text-copper font-display font-semibold text-2xl shrink-0">
              {job.progress_pct}%
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2 bg-graphite rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-copper rounded-full"
              animate={{ width: `${job.progress_pct}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>

          <div className="flex justify-end">
            <button
              onClick={onCancel}
              className="flex items-center gap-1.5 text-xs text-muted hover:text-burnt-red transition-colors"
            >
              <XCircle size={13} />
              Cancel
            </button>
          </div>
        </div>
      )}

      {isCompleted && job.summary && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sage text-sm font-medium mb-1">
            <CheckCircle size={15} />
            Ingestion completed successfully
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <MetricPanel
              label="Files Discovered"
              value={job.summary.files_discovered.toLocaleString()}
            />
            <MetricPanel
              label="Successfully Parsed"
              value={job.summary.successfully_parsed.toLocaleString()}
            />
            <MetricPanel
              label="Parsed w/ Warnings"
              value={job.summary.parsed_with_warnings.toLocaleString()}
            />
            <MetricPanel
              label="Invalid Files"
              value={job.summary.invalid_files.toLocaleString()}
            />
            <MetricPanel
              label="ATT&CK Tagged"
              value={job.summary.rules_with_attack_tags.toLocaleString()}
            />
            <MetricPanel
              label="Total Rules"
              value={job.summary.total_rules.toLocaleString()}
            />
          </div>
        </div>
      )}
    </section>
  )
}

// â”€â”€â”€ Data Sources Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function DataSourcesPage() {
  const [inputPath, setInputPath] = useState('')
  const [inputError, setInputError] = useState<string | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const [startingAnalysis, setStartingAnalysis] = useState(false)
  const [startingDemo, setStartingDemo] = useState(false)

  const { corpusId, ruleCount, attackVersion, setCorpusId, setRuleCount, setDemoLoaded } =
    useAppStore()

  const job = useIngestionPoller(jobId)
  const notifiedStatusRef = useRef<string | null>(null)

  // Update store and history when job reaches a terminal state
  useEffect(() => {
    if (!job) return
    if (
      job.status === notifiedStatusRef.current ||
      (job.status !== 'completed' && job.status !== 'failed')
    )
      return

    notifiedStatusRef.current = job.status
    saveToHistory(job)

    if (job.status === 'completed') {
      if (job.summary) {
        setCorpusId(job.summary.corpus_id)
        setRuleCount(job.summary.total_rules)
        setDemoLoaded(true)
      }
      toast.success('Ingestion complete')
    } else {
      toast.error('Ingestion failed')
    }
  }, [job, setCorpusId, setRuleCount, setDemoLoaded])

  async function handleStartAnalysis() {
    if (!inputPath.trim()) {
      setInputError('Please enter a path to your Sigma rules directory')
      return
    }
    setInputError(null)
    setStartingAnalysis(true)
    try {
      const res = await api.startIngest({ path: inputPath.trim(), type: 'directory' })
      notifiedStatusRef.current = null
      setJobId(res.data.job_id)
    } catch (e) {
      setInputError(e instanceof Error ? e.message : 'Failed to start ingestion')
    } finally {
      setStartingAnalysis(false)
    }
  }

  async function handleLoadDemo() {
    setStartingDemo(true)
    try {
      const res = await api.startIngest({ path: '', type: 'demo' })
      notifiedStatusRef.current = null
      setJobId(res.data.job_id)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load demo data')
    } finally {
      setStartingDemo(false)
    }
  }

  function handleCancel() {
    setJobId(null)
    notifiedStatusRef.current = null
  }

  const isRunning = job?.status === 'running' || job?.status === 'queued'
  const hasActiveJob = job !== null && (isRunning || job.status === 'completed' || job.status === 'failed')

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border shrink-0">
        <h1 className="font-display font-semibold text-ivory text-lg">Data Sources</h1>
        <p className="text-xs text-muted mt-0.5">
          Ingest and manage your Sigma rule corpus
        </p>
      </div>

      <div className="flex-1 p-6 space-y-6 max-w-3xl">
        {/* â”€â”€ Current Corpus â”€â”€ */}
        <section>
          <h2 className="font-display font-semibold text-ivory text-sm mb-3">
            Current Corpus
          </h2>
          {corpusId ? (
            <div className="bg-warm-surface border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2.5">
                <Database size={15} className="text-copper shrink-0" />
                <span className="font-mono text-xs text-ivory">{corpusId}</span>
              </div>
              <div className={cn('grid gap-4 text-xs', attackVersion ? 'grid-cols-3' : 'grid-cols-2')}>
                <div>
                  <p className="text-muted mb-0.5">Rule Count</p>
                  <p className="text-ivory font-medium">{ruleCount.toLocaleString()}</p>
                </div>
                {attackVersion && (
                  <div>
                    <p className="text-muted mb-0.5">ATT&CK Version</p>
                    <p className="text-ivory font-medium">{attackVersion}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-warm-surface border border-border rounded-xl p-4">
              <p className="text-sm text-muted">
                No corpus loaded. Import a rule set below to get started.
              </p>
            </div>
          )}
        </section>

        {/* â”€â”€ Import Local Rules â”€â”€ */}
        <section>
          <h2 className="font-display font-semibold text-ivory text-sm mb-3">
            Import Local Rules
          </h2>
          <div className="bg-warm-surface border border-border rounded-xl p-5 space-y-4">
            {/* Path input */}
            <div>
              <label className="text-xs text-muted uppercase tracking-wider font-medium block mb-1.5">
                Path to Sigma rules directory
              </label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <FolderOpen
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
                  />
                  <input
                    type="text"
                    value={inputPath}
                    onChange={e => {
                      setInputPath(e.target.value)
                      setInputError(null)
                    }}
                    onKeyDown={e => e.key === 'Enter' && handleStartAnalysis()}
                    placeholder="/path/to/sigma/rules"
                    className="w-full bg-obsidian border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-ivory placeholder:text-muted focus:outline-none focus:border-copper/60 transition-colors font-mono"
                  />
                </div>
                <Button
                  loading={startingAnalysis}
                  disabled={isRunning || startingDemo}
                  onClick={handleStartAnalysis}
                >
                  <Play size={14} />
                  Start Analysis
                </Button>
              </div>
              {inputError && (
                <p className="text-burnt-red text-xs mt-1.5">{inputError}</p>
              )}
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <Button
              variant="secondary"
              loading={startingDemo}
              disabled={isRunning || startingAnalysis}
              onClick={handleLoadDemo}
              className="w-full justify-center"
            >
              Load Demo Data
            </Button>
          </div>
        </section>

        {/* â”€â”€ Progress â”€â”€ */}
        <AnimatePresence>
          {hasActiveJob && job && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <ProgressSection job={job} onCancel={handleCancel} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* â”€â”€ Demo Description â”€â”€ */}
        <section>
          <h2 className="font-display font-semibold text-ivory text-sm mb-3">
            Demo Dataset
          </h2>
          <div className="bg-warm-surface border border-border rounded-xl p-5">
            <p className="text-sm text-ivory/70 leading-relaxed mb-4">
              The BLIND demo dataset includes a curated set of Sigma rules mapped to ATT&amp;CK
              techniques, covering a representative cross-section of tactics and coverage
              levels â€” including deliberate gaps. Use it to explore the full platform without
              importing your own rules.
            </p>
            <Button
              variant="secondary"
              loading={startingDemo}
              disabled={isRunning || startingAnalysis}
              onClick={handleLoadDemo}
            >
              Load Demo
            </Button>
          </div>
        </section>
      </div>
    </div>
  )
}

export default DataSourcesPage
