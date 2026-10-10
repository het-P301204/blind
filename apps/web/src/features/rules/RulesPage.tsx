import { useState, useCallback, useEffect } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  Copy,
  ExternalLink,
  ChevronDown,
  AlertTriangle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  Button,
  SearchInput,
  ParseBadge,
  EmptyState,
  LoadingState,
  ErrorState,
  Drawer,
} from '@/components/ui'
import { api } from '@/lib/api'
import { formatDate, truncate } from '@/lib/utils'
import type { SigmaRule, ParseStatus } from '@/types/api'

// â”€â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const PARSE_STATUSES: { value: ParseStatus | ''; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'PARSED', label: 'Parsed' },
  { value: 'PARSED_WITH_WARNINGS', label: 'Parsed with Warnings' },
  { value: 'INVALID', label: 'Invalid' },
  { value: 'UNSUPPORTED', label: 'Unsupported' },
  { value: 'DUPLICATE', label: 'Duplicate' },
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

const PAGE_SIZE = 50

// â”€â”€â”€ Filter State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface Filters {
  search: string
  technique_id: string
  tactic: string
  product: string
  parse_status: string
}

const DEFAULT_FILTERS: Filters = {
  search: '',
  technique_id: '',
  tactic: '',
  product: '',
  parse_status: '',
}

// â”€â”€â”€ Rule Detail Drawer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface RuleDetailDrawerProps {
  rule: SigmaRule | null
  onClose: () => void
}

function RuleDetailDrawer({ rule, onClose }: RuleDetailDrawerProps) {
  function copyId(id: string) {
    navigator.clipboard.writeText(id).then(() => toast.success('Copied!'))
  }

  return (
    <Drawer
      open={rule !== null}
      onClose={onClose}
      title={rule?.title || 'Unnamed Rule'}
      width="w-[560px]"
    >
      {rule && (
        <div className="space-y-5">
          {/* ID + Parse Status */}
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1.5">
              <p className="text-xs text-muted uppercase tracking-wider font-medium">
                Rule ID
              </p>
              <button
                onClick={() => copyId(rule.id)}
                className="flex items-center gap-1.5 group"
                title="Click to copy"
              >
                <span className="font-mono text-xs text-muted group-hover:text-ivory transition-colors break-all text-left">
                  {rule.id}
                </span>
                <Copy
                  size={12}
                  className="shrink-0 text-muted group-hover:text-copper transition-colors"
                />
              </button>
            </div>
            <ParseBadge status={rule.parse_status} />
          </div>

          {/* Description */}
          {rule.description && (
            <div className="space-y-1.5">
              <p className="text-xs text-muted uppercase tracking-wider font-medium">
                Description
              </p>
              <p className="text-sm text-ivory/80 leading-relaxed">
                {rule.description}
              </p>
            </div>
          )}

          {/* Metadata grid */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 bg-warm-surface rounded-lg p-3">
            {rule.author && (
              <div>
                <p className="text-xs text-muted mb-0.5">Author</p>
                <p className="text-sm text-ivory">{rule.author}</p>
              </div>
            )}
            {rule.status && (
              <div>
                <p className="text-xs text-muted mb-0.5">Rule Status</p>
                <p className="text-sm text-ivory capitalize">{rule.status}</p>
              </div>
            )}
            {rule.date && (
              <div>
                <p className="text-xs text-muted mb-0.5">Created</p>
                <p className="text-sm text-ivory">{formatDate(rule.date)}</p>
              </div>
            )}
            {rule.modified && (
              <div>
                <p className="text-xs text-muted mb-0.5">Modified</p>
                <p className="text-sm text-ivory">{formatDate(rule.modified)}</p>
              </div>
            )}
          </div>

          {/* ATT&CK Techniques */}
          {rule.attack_technique_ids.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted uppercase tracking-wider font-medium">
                ATT&CK Techniques
              </p>
              <div className="flex flex-wrap gap-1.5">
                {rule.attack_technique_ids.map(id => (
                  <button
                    key={id}
                    onClick={() =>
                      window.open(
                        `https://attack.mitre.org/techniques/${id.replace('.', '/')}`,
                        '_blank'
                      )
                    }
                    className="font-mono text-xs text-copper bg-copper/10 hover:bg-copper/20 rounded px-2 py-0.5 flex items-center gap-1 transition-colors"
                  >
                    {id}
                    <ExternalLink size={10} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Log Source */}
          {rule.logsource && (
            <div className="space-y-2">
              <p className="text-xs text-muted uppercase tracking-wider font-medium">
                Log Source
              </p>
              <div className="bg-obsidian rounded-lg p-3 font-mono text-xs space-y-0.5">
                {rule.logsource.product && (
                  <p>
                    <span className="text-muted">product: </span>
                    <span className="text-ivory">{rule.logsource.product}</span>
                  </p>
                )}
                {rule.logsource.category && (
                  <p>
                    <span className="text-muted">category: </span>
                    <span className="text-ivory">{rule.logsource.category}</span>
                  </p>
                )}
                {rule.logsource.service && (
                  <p>
                    <span className="text-muted">service: </span>
                    <span className="text-ivory">{rule.logsource.service}</span>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Detection Condition */}
          {rule.detection_condition && (
            <div className="space-y-2">
              <p className="text-xs text-muted uppercase tracking-wider font-medium">
                Detection Condition
              </p>
              <pre className="bg-obsidian rounded-lg p-3 font-mono text-xs text-ivory whitespace-pre-wrap overflow-x-auto">
                {rule.detection_condition}
              </pre>
            </div>
          )}

          {/* Parse Warnings */}
          {rule.parse_warnings.length > 0 && (
            <div className="border-l-2 border-amber pl-3 bg-amber/5 rounded-r-lg p-3 space-y-1.5">
              <div className="flex items-center gap-1.5 text-amber">
                <AlertTriangle size={13} />
                <p className="text-xs font-medium uppercase tracking-wider">
                  Parse Warnings
                </p>
              </div>
              <ul className="space-y-1">
                {rule.parse_warnings.map((w, i) => (
                  <li key={i} className="text-xs text-amber/80">
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* False Positives */}
          {rule.falsepositives.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted uppercase tracking-wider font-medium">
                False Positives
              </p>
              <ul className="space-y-1 list-disc list-inside">
                {rule.falsepositives.map((fp, i) => (
                  <li key={i} className="text-sm text-ivory/70">
                    {fp}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* References */}
          {rule.references.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted uppercase tracking-wider font-medium">
                References
              </p>
              <ul className="space-y-1">
                {rule.references.map((ref, i) => (
                  <li key={i}>
                    <a
                      href={ref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-copper hover:text-amber transition-colors flex items-center gap-1 break-all"
                    >
                      <ExternalLink size={10} className="shrink-0" />
                      {ref}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Tags */}
          {rule.tags.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted uppercase tracking-wider font-medium">
                Tags
              </p>
              <div className="flex flex-wrap gap-1.5">
                {rule.tags.map(tag => (
                  <span
                    key={tag}
                    className="text-xs text-muted bg-raised-panel rounded px-2 py-0.5 font-mono"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Drawer>
  )
}

// â”€â”€â”€ Filter Sidebar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface FilterSidebarProps {
  filters: Filters
  onChange: (filters: Filters) => void
  onClear: () => void
}

function FilterSidebar({ filters, onChange, onClear }: FilterSidebarProps) {
  const hasActive =
    filters.search ||
    filters.technique_id ||
    filters.tactic ||
    filters.product ||
    filters.parse_status

  return (
    <aside className="w-64 shrink-0 bg-graphite border-r border-border flex flex-col h-full overflow-y-auto">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="font-display font-semibold text-ivory text-sm">Filters</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Search */}
        <div>
          <label className="text-xs text-muted uppercase tracking-wider mb-1.5 block">
            Search
          </label>
          <SearchInput
            value={filters.search}
            onChange={v => onChange({ ...filters, search: v })}
            placeholder="Title or contentâ€¦"
          />
        </div>

        {/* Technique ID */}
        <div>
          <label className="text-xs text-muted uppercase tracking-wider mb-1.5 block">
            Technique ID
          </label>
          <input
            type="text"
            value={filters.technique_id}
            onChange={e => onChange({ ...filters, technique_id: e.target.value })}
            placeholder="e.g. T1059.001"
            className="w-full bg-warm-surface border border-border rounded-md px-3 py-2 text-sm text-ivory placeholder:text-muted focus:outline-none focus:border-copper/60 transition-colors font-mono"
          />
        </div>

        {/* Tactic */}
        <div>
          <label className="text-xs text-muted uppercase tracking-wider mb-1.5 block">
            Tactic
          </label>
          <select
            value={filters.tactic}
            onChange={e => onChange({ ...filters, tactic: e.target.value })}
            className="w-full bg-warm-surface border border-border rounded-md px-3 py-2 text-sm text-ivory focus:outline-none focus:border-copper/60 transition-colors"
          >
            <option value="">All Tactics</option>
            {TACTICS.filter(Boolean).map(t => (
              <option key={t} value={t}>
                {t
                  .split('-')
                  .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                  .join(' ')}
              </option>
            ))}
          </select>
        </div>

        {/* Product */}
        <div>
          <label className="text-xs text-muted uppercase tracking-wider mb-1.5 block">
            Product
          </label>
          <input
            type="text"
            value={filters.product}
            onChange={e => onChange({ ...filters, product: e.target.value })}
            placeholder="e.g. windows, linux"
            className="w-full bg-warm-surface border border-border rounded-md px-3 py-2 text-sm text-ivory placeholder:text-muted focus:outline-none focus:border-copper/60 transition-colors"
          />
        </div>

        {/* Parse Status */}
        <div>
          <label className="text-xs text-muted uppercase tracking-wider mb-1.5 block">
            Parse Status
          </label>
          <select
            value={filters.parse_status}
            onChange={e => onChange({ ...filters, parse_status: e.target.value })}
            className="w-full bg-warm-surface border border-border rounded-md px-3 py-2 text-sm text-ivory focus:outline-none focus:border-copper/60 transition-colors"
          >
            {PARSE_STATUSES.map(s => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Clear */}
      <div className="px-4 py-3 border-t border-border">
        <button
          onClick={onClear}
          disabled={!hasActive}
          className="text-xs text-muted hover:text-ivory disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Clear filters
        </button>
      </div>
    </aside>
  )
}

// â”€â”€â”€ Rules Table â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface RulesTableProps {
  rules: SigmaRule[]
  onSelectRule: (rule: SigmaRule) => void
}

const tableVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.03 } },
}

const rowVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } },
}

function RulesTable({ rules, onSelectRule }: RulesTableProps) {
  const shouldReduceMotion = useReducedMotion()

  function handleCopyId(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    navigator.clipboard.writeText(id).then(() => toast.success('Copied!'))
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-border">
            <th className="px-4 py-2.5 text-xs text-muted uppercase tracking-wider font-medium whitespace-nowrap">
              Status
            </th>
            <th className="px-4 py-2.5 text-xs text-muted uppercase tracking-wider font-medium">
              Title
            </th>
            <th className="px-4 py-2.5 text-xs text-muted uppercase tracking-wider font-medium whitespace-nowrap">
              ID
            </th>
            <th className="px-4 py-2.5 text-xs text-muted uppercase tracking-wider font-medium whitespace-nowrap">
              ATT&CK IDs
            </th>
            <th className="px-4 py-2.5 text-xs text-muted uppercase tracking-wider font-medium whitespace-nowrap">
              Log Source
            </th>
            <th className="px-4 py-2.5 text-xs text-muted uppercase tracking-wider font-medium whitespace-nowrap">
              Modified
            </th>
          </tr>
        </thead>
        <motion.tbody
          variants={shouldReduceMotion ? undefined : tableVariants}
          initial="hidden"
          animate="visible"
        >
          <AnimatePresence initial={false}>
            {rules.map((rule, i) => {
              const shouldAnimate = !shouldReduceMotion && i < 25
              return (
              <motion.tr
                key={rule.id}
                variants={shouldAnimate ? rowVariants : undefined}
                onClick={() => onSelectRule(rule)}
                className="border-b border-border/50 hover:bg-raised-panel cursor-pointer transition-colors group"
              >
                {/* Parse Status */}
                <td className="px-4 py-2.5">
                  <ParseBadge status={rule.parse_status} />
                </td>

                {/* Title */}
                <td className="px-4 py-2.5 max-w-xs">
                  <span className="text-sm text-ivory">
                    {truncate(rule.title || 'Unnamed Rule', 60)}
                  </span>
                </td>

                {/* ID */}
                <td className="px-4 py-2.5">
                  <button
                    onClick={e => handleCopyId(e, rule.id)}
                    className="font-mono text-xs text-muted hover:text-ivory flex items-center gap-1 group/id transition-colors"
                    title="Click to copy"
                  >
                    {truncate(rule.id, 20)}
                    <Copy
                      size={10}
                      className="opacity-0 group-hover/id:opacity-100 transition-opacity"
                    />
                  </button>
                </td>

                {/* ATT&CK IDs */}
                <td className="px-4 py-2.5">
                  <div className="flex flex-wrap gap-1">
                    {rule.attack_technique_ids.slice(0, 3).map(id => (
                      <span
                        key={id}
                        className="font-mono text-xs text-copper bg-copper/10 rounded px-1.5 py-0.5"
                      >
                        {id}
                      </span>
                    ))}
                    {rule.attack_technique_ids.length > 3 && (
                      <span className="text-xs text-muted">
                        +{rule.attack_technique_ids.length - 3}
                      </span>
                    )}
                    {rule.attack_technique_ids.length === 0 && (
                      <span className="text-xs text-muted">â€”</span>
                    )}
                  </div>
                </td>

                {/* Log Source */}
                <td className="px-4 py-2.5">
                  {rule.logsource ? (
                    <span className="text-xs text-muted">
                      {[rule.logsource.product, rule.logsource.category]
                        .filter(Boolean)
                        .join(' / ')}
                    </span>
                  ) : (
                    <span className="text-xs text-muted">â€”</span>
                  )}
                </td>

                {/* Modified */}
                <td className="px-4 py-2.5">
                  <span className="text-xs text-muted whitespace-nowrap">
                    {formatDate(rule.modified)}
                  </span>
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

// â”€â”€â”€ Rules Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function RulesPage() {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [skip, setSkip] = useState(0)
  const [allRules, setAllRules] = useState<SigmaRule[]>([])
  const [selectedRule, setSelectedRule] = useState<SigmaRule | null>(null)

  const queryKey = ['rules', filters, skip]

  const { data, isLoading, isError, error } = useQuery({
    queryKey,
    queryFn: () =>
      api
        .listRules({
          skip,
          limit: PAGE_SIZE,
          search: filters.search || undefined,
          technique_id: filters.technique_id || undefined,
          tactic: filters.tactic || undefined,
          product: filters.product || undefined,
          parse_status: filters.parse_status || undefined,
        })
        .then(r => r.data),
    placeholderData: keepPreviousData,
  })

  // Accumulate pages into allRules
  useEffect(() => {
    if (!data) return
    if (skip === 0) {
      setAllRules(data.data)
    } else {
      setAllRules(prev => [...prev, ...data.data])
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  const handleFilterChange = useCallback((f: Filters) => {
    setFilters(f)
    setSkip(0)
    setAllRules([])
  }, [])

  const handleClearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
    setSkip(0)
    setAllRules([])
  }, [])

  const handleLoadMore = () => {
    setSkip(prev => prev + PAGE_SIZE)
  }

  const total = data?.total ?? 0
  const hasMore = allRules.length < total

  return (
    <div className="flex h-full">
      <FilterSidebar
        filters={filters}
        onChange={handleFilterChange}
        onClear={handleClearFilters}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h1 className="font-display font-semibold text-ivory text-lg">
              Detection Rules
            </h1>
            <p className="text-xs text-muted mt-0.5">
              Sigma rule corpus â€” parsed and indexed
            </p>
          </div>
          {data && (
            <span className="text-xs text-muted">
              Showing {allRules.length} of {total}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && skip === 0 ? (
            <LoadingState />
          ) : isError ? (
            <ErrorState
              message={
                error instanceof Error ? error.message : 'Failed to load rules'
              }
            />
          ) : allRules.length === 0 ? (
            <EmptyState
              title="No rules found"
              description="Adjust your filters or ingest a corpus to see detection rules."
            />
          ) : (
            <>
              <RulesTable rules={allRules} onSelectRule={setSelectedRule} />
              {hasMore && (
                <div className="flex justify-center py-6">
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={isLoading}
                    onClick={handleLoadMore}
                  >
                    Load More
                    <ChevronDown size={14} />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <RuleDetailDrawer
        rule={selectedRule}
        onClose={() => setSelectedRule(null)}
      />
    </div>
  )
}

