import { useState } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { Calendar, Hash } from 'lucide-react'
import { api } from '@/lib/api'
import type { SigmaRule, ParseStatus } from '@/types/api'
import {
  MetricPanel,
  SearchInput,
  ParseBadge,
  Drawer,
  LoadingState,
  ErrorState,
} from '@/components/ui'
import { useAppStore } from '@/lib/store'

const PARSE_STATUSES: ParseStatus[] = [
  'PARSED', 'PARSED_WITH_WARNINGS', 'INVALID', 'UNSUPPORTED', 'DUPLICATE',
]

const PAGE_SIZE = 50

export default function CorpusExplorerPage() {
  const { corpusId } = useAppStore()
  const [search, setSearch] = useState('')
  const [parseFilter, setParseFilter] = useState('')
  const [page, setPage] = useState(1)
  const [selectedRule, setSelectedRule] = useState<SigmaRule | null>(null)

  const { data: rulesData, isLoading, isError, refetch } = useQuery({
    queryKey: ['corpus-rules', search, parseFilter, page] as const,
    queryFn: () =>
      api
        .listRules({
          search: search || undefined,
          parse_status: parseFilter ? (parseFilter as ParseStatus) : undefined,
          skip: (page - 1) * PAGE_SIZE,
          limit: PAGE_SIZE,
        })
        .then(r => r.data),
    placeholderData: keepPreviousData,
  })

  const rules: SigmaRule[] = rulesData?.data ?? []
  const total: number = rulesData?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  // Compute counts from the current page for the stat tiles
  const parsedOnPage = rules.filter(r => r.parse_status === 'PARSED').length
  const attackTaggedOnPage = rules.filter(r => r.attack_technique_ids.length > 0).length

  if (isLoading && !rulesData) return <LoadingState className="p-6" />
  if (isError) return <ErrorState onRetry={refetch} className="p-6" />

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border shrink-0">
        <h1 className="font-display font-semibold text-ivory text-xl">Corpus Explorer</h1>
        <p className="text-muted text-sm mt-0.5">
          Browse and inspect every rule across ingested corpora
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-6 py-4 shrink-0">
        <MetricPanel
          label="Total Rules"
          value={total.toLocaleString()}
          description="In current corpus"
        />
        <MetricPanel
          label="Parsed (this page)"
          value={parsedOnPage}
          description={`of ${rules.length} shown`}
        />
        <MetricPanel
          label="ATT&CK Tagged"
          value={attackTaggedOnPage}
          description="This page"
        />
        <MetricPanel
          label="Corpus ID"
          value={corpusId ? corpusId.slice(0, 8) + 'â€¦' : 'â€”'}
          description="Active corpus"
        />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 px-6 pb-4 shrink-0">
        <SearchInput
          value={search}
          onChange={v => { setSearch(v); setPage(1) }}
          placeholder="Search by title, author, tag, file pathâ€¦"
          className="flex-1"
        />
        <select
          className="bg-graphite border border-border rounded-md px-3 py-2 text-ivory text-sm focus:outline-none focus:border-copper/60 shrink-0"
          value={parseFilter}
          onChange={e => { setParseFilter(e.target.value); setPage(1) }}
        >
          <option value="">All statuses</option>
          {PARSE_STATUSES.map(s => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-6 pb-6">
        <div className="bg-warm-surface border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-raised-panel/40">
                <th className="text-left px-4 py-3 text-muted font-medium text-xs uppercase tracking-wide w-2/5">Title</th>
                <th className="text-left px-4 py-3 text-muted font-medium text-xs uppercase tracking-wide">Author</th>
                <th className="text-left px-4 py-3 text-muted font-medium text-xs uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-muted font-medium text-xs uppercase tracking-wide">ATT&CK</th>
                <th className="text-left px-4 py-3 text-muted font-medium text-xs uppercase tracking-wide">Ingested</th>
              </tr>
            </thead>
            <tbody>
              {rules.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted text-sm">
                    {search || parseFilter
                      ? 'No rules match the current filters.'
                      : 'No rules in corpus. Ingest a Sigma rule set to get started.'}
                  </td>
                </tr>
              ) : rules.map(rule => (
                <tr
                  key={rule.id}
                  className="border-b border-border/50 last:border-0 hover:bg-raised-panel/30 transition-colors cursor-pointer"
                  onClick={() => setSelectedRule(rule)}
                >
                  <td className="px-4 py-3">
                    <div className="text-ivory text-sm font-medium truncate max-w-xs">
                      {rule.title ?? rule.id}
                    </div>
                    <div className="font-mono text-muted text-xs mt-0.5 truncate max-w-xs">
                      {rule.file_path}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted text-sm truncate max-w-[120px]">
                    {rule.author ?? 'â€”'}
                  </td>
                  <td className="px-4 py-3">
                    <ParseBadge status={rule.parse_status} />
                  </td>
                  <td className="px-4 py-3">
                    {rule.attack_technique_ids.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {rule.attack_technique_ids.slice(0, 2).map(id => (
                          <span
                            key={id}
                            className="font-mono text-xs px-1.5 py-0.5 rounded bg-copper/10 text-copper border border-copper/20"
                          >
                            {id}
                          </span>
                        ))}
                        {rule.attack_technique_ids.length > 2 && (
                          <span className="text-xs text-muted px-1 py-0.5">
                            +{rule.attack_technique_ids.length - 2}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted text-xs">â€”</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted text-xs font-mono">
                    {rule.ingested_at?.slice(0, 10) ?? 'â€”'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 text-sm text-muted">
            <span>
              {total.toLocaleString()} total rules â€” page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1.5 rounded-md bg-graphite border border-border hover:border-copper/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-ivory"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 rounded-md bg-graphite border border-border hover:border-copper/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-ivory"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Rule detail drawer */}
      <Drawer
        open={!!selectedRule}
        onClose={() => setSelectedRule(null)}
        title={selectedRule?.title ?? 'Rule Detail'}
        width="w-[520px]"
      >
        {selectedRule && (
          <div className="space-y-5">
            {/* Status + corpus */}
            <div className="flex items-center gap-2 flex-wrap">
              <ParseBadge status={selectedRule.parse_status} />
              {selectedRule.corpus_id && (
                <span className="font-mono text-xs text-muted px-2 py-0.5 rounded-full bg-graphite border border-border">
                  corpus: {selectedRule.corpus_id.slice(0, 8)}â€¦
                </span>
              )}
              {selectedRule.is_demo && (
                <span className="text-xs text-amber px-2 py-0.5 rounded-full bg-amber/10 border border-amber/20">
                  Demo
                </span>
              )}
            </div>

            {/* File path */}
            <div>
              <p className="text-muted text-xs font-medium uppercase tracking-wide mb-1">File Path</p>
              <p className="font-mono text-ivory text-xs break-all">{selectedRule.file_path}</p>
            </div>

            {/* Description */}
            {selectedRule.description && (
              <div>
                <p className="text-muted text-xs font-medium uppercase tracking-wide mb-1">Description</p>
                <p className="text-ivory text-sm leading-relaxed">{selectedRule.description}</p>
              </div>
            )}

            {/* Author */}
            {selectedRule.author && (
              <div>
                <p className="text-muted text-xs font-medium uppercase tracking-wide mb-1">Author</p>
                <p className="text-ivory text-sm">{selectedRule.author}</p>
              </div>
            )}

            {/* ATT&CK Techniques */}
            {selectedRule.attack_technique_ids.length > 0 && (
              <div>
                <p className="text-muted text-xs font-medium uppercase tracking-wide mb-1.5">ATT&CK Techniques</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedRule.attack_technique_ids.map(id => (
                    <span
                      key={id}
                      className="font-mono text-xs px-2 py-0.5 rounded-full bg-copper/10 border border-copper/20 text-copper"
                    >
                      {id}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Tactic tags */}
            {selectedRule.attack_tactic_tags.length > 0 && (
              <div>
                <p className="text-muted text-xs font-medium uppercase tracking-wide mb-1.5">Tactic Tags</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedRule.attack_tactic_tags.map(t => (
                    <span
                      key={t}
                      className="text-xs px-2 py-0.5 rounded-full bg-graphite border border-border text-muted"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Log source */}
            {selectedRule.logsource && (
              <div>
                <p className="text-muted text-xs font-medium uppercase tracking-wide mb-1.5">Log Source</p>
                <div className="bg-obsidian border border-border rounded-lg px-3 py-2.5 space-y-1 font-mono text-xs text-ivory/80">
                  {selectedRule.logsource.category && (
                    <div><span className="text-muted">category: </span>{selectedRule.logsource.category}</div>
                  )}
                  {selectedRule.logsource.product && (
                    <div><span className="text-muted">product: </span>{selectedRule.logsource.product}</div>
                  )}
                  {selectedRule.logsource.service && (
                    <div><span className="text-muted">service: </span>{selectedRule.logsource.service}</div>
                  )}
                </div>
              </div>
            )}

            {/* Detection condition */}
            {selectedRule.detection_condition && (
              <div>
                <p className="text-muted text-xs font-medium uppercase tracking-wide mb-1.5">Detection Condition</p>
                <pre className="bg-obsidian border border-border rounded-lg px-3 py-2.5 text-xs text-ivory/80 font-mono overflow-x-auto whitespace-pre-wrap">
                  {selectedRule.detection_condition}
                </pre>
              </div>
            )}

            {/* Parse warnings */}
            {selectedRule.parse_warnings.length > 0 && (
              <div>
                <p className="text-muted text-xs font-medium uppercase tracking-wide mb-1.5">Parse Warnings</p>
                <ul className="space-y-1">
                  {selectedRule.parse_warnings.map((w, i) => (
                    <li key={i} className="text-amber text-xs">{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* References */}
            {selectedRule.references.length > 0 && (
              <div>
                <p className="text-muted text-xs font-medium uppercase tracking-wide mb-1.5">References</p>
                <ul className="space-y-1">
                  {selectedRule.references.map((ref, i) => (
                    <li key={i}>
                      <a
                        href={ref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-copper text-xs hover:underline break-all"
                      >
                        {ref}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center gap-4 text-muted text-xs border-t border-border pt-3">
              <span className="flex items-center gap-1">
                <Calendar size={11} />
                {selectedRule.ingested_at?.slice(0, 10) ?? 'â€”'}
              </span>
              <span className="flex items-center gap-1 font-mono">
                <Hash size={11} />
                {selectedRule.content_hash.slice(0, 12)}â€¦
              </span>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  )
}

