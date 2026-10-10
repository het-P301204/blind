import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight, Shield } from 'lucide-react'
import { api } from '@/lib/api'
import type { AttackTechnique, SigmaRule } from '@/types/api'
import { SearchInput, EmptyState, ParseBadge, LoadingState } from '@/components/ui'
import { cn, tacticLabel } from '@/lib/utils'

export default function TechniqueContextPage() {
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { data: techniques, isLoading } = useQuery<AttackTechnique[]>({
    queryKey: ['techniques'],
    queryFn: () => api.listTechniques().then(r => r.data.data),
  })

  const { data: selected, isLoading: selectedLoading } = useQuery<AttackTechnique>({
    queryKey: ['technique', selectedId],
    queryFn: () => api.getTechnique(selectedId!).then(r => r.data.technique),
    enabled: !!selectedId,
  })

  const { data: mappedRulesPage } = useQuery({
    queryKey: ['rules', selectedId],
    queryFn: () => api.listRules({ technique_id: selectedId!, limit: 20 }).then(r => r.data),
    enabled: !!selectedId,
  })

  const filtered = useMemo(() => {
    if (!techniques) return []
    const q = search.toLowerCase().trim()
    if (!q) return techniques
    return techniques.filter(
      t =>
        t.id.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q)
    )
  }, [techniques, search])

  const parents = useMemo(
    () => filtered.filter(t => !t.is_subtechnique),
    [filtered]
  )

  function getChildren(parentId: string) {
    return filtered.filter(t => t.is_subtechnique && t.parent_id === parentId)
  }

  const mappedRules: SigmaRule[] = (mappedRulesPage as { data: SigmaRule[] } | undefined)?.data ?? []

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left panel — technique list */}
      <div className="w-72 border-r border-border flex flex-col overflow-hidden shrink-0">
        <div className="px-4 py-4 border-b border-border shrink-0">
          <h2 className="font-display font-semibold text-ivory text-base mb-3">Techniques</h2>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search techniques…"
          />
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {isLoading ? (
            <div className="px-4 py-8 text-center text-xs text-muted">Loading techniques…</div>
          ) : parents.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-muted">No techniques found</div>
          ) : (
            parents.map(parent => {
              const children = getChildren(parent.id)
              const isSelected = selectedId === parent.id
              const deprecated = parent.is_deprecated || parent.is_revoked

              return (
                <div key={parent.id}>
                  <button
                    onClick={() => setSelectedId(isSelected ? null : parent.id)}
                    className={cn(
                      'w-full flex items-center gap-2 px-4 py-2 text-left transition-colors',
                      isSelected
                        ? 'bg-warm-surface border-r-2 border-r-copper text-ivory'
                        : 'hover:bg-warm-surface text-muted hover:text-ivory',
                      deprecated && 'opacity-50',
                    )}
                  >
                    {children.length > 0 && (
                      <ChevronRight size={12} className={cn('flex-shrink-0 transition-transform', isSelected && 'rotate-90')} />
                    )}
                    <span className="font-mono text-[10px] text-copper/80 w-16 flex-shrink-0">{parent.id}</span>
                    <span className="text-xs truncate">{parent.name}</span>
                  </button>

                  {isSelected && children.map(child => (
                    <button
                      key={child.id}
                      onClick={() => setSelectedId(child.id)}
                      className={cn(
                        'w-full flex items-center gap-2 pl-8 pr-4 py-1.5 text-left transition-colors',
                        selectedId === child.id
                          ? 'bg-warm-surface border-r-2 border-r-copper text-ivory'
                          : 'hover:bg-warm-surface text-muted hover:text-ivory',
                      )}
                    >
                      <span className="font-mono text-[10px] text-copper/80 w-16 flex-shrink-0">{child.id}</span>
                      <span className="text-xs truncate">{child.name}</span>
                    </button>
                  ))}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Right panel — technique detail */}
      <div className="flex-1 overflow-y-auto p-6">
        {!selectedId ? (
          <EmptyState
            icon={<Shield size={32} className="text-muted" />}
            title="Select a technique to view its intelligence"
            description="Browse or search the technique list on the left to see ATT&CK context, mapped Sigma rules, and detection guidance."
          />
        ) : selectedLoading ? (
          <LoadingState />
        ) : !selected ? (
          <EmptyState title="Technique not found" description="This technique may not be in the loaded dataset." />
        ) : (
          <div className="max-w-3xl space-y-6">
            {/* Header */}
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="font-mono text-xl text-copper font-semibold">{selected.id}</span>
                {(selected.is_deprecated || selected.is_revoked) && (
                  <span className="text-xs text-burnt-red bg-burnt-red/10 border border-burnt-red/30 px-2 py-0.5 rounded-full">
                    {selected.is_revoked ? 'Revoked' : 'Deprecated'}
                  </span>
                )}
              </div>
              <h1 className="font-display text-2xl font-bold text-ivory">{selected.name}</h1>
            </div>

            {/* Tactics */}
            {selected.tactics.length > 0 && (
              <div>
                <p className="text-xs text-muted uppercase tracking-wide mb-2">Tactics</p>
                <div className="flex flex-wrap gap-2">
                  {selected.tactics.map(t => (
                    <span key={t} className="text-xs text-ivory bg-warm-surface border border-border px-2.5 py-1 rounded-full">
                      {tacticLabel(t)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Platforms */}
            {selected.platforms.length > 0 && (
              <div>
                <p className="text-xs text-muted uppercase tracking-wide mb-2">Platforms</p>
                <div className="flex flex-wrap gap-2">
                  {selected.platforms.map(p => (
                    <span key={p} className="text-xs text-muted bg-graphite border border-border px-2.5 py-1 rounded-full">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {selected.description && (
              <div>
                <p className="text-xs text-muted uppercase tracking-wide mb-2">Description</p>
                <p className="text-sm text-muted leading-relaxed">{selected.description}</p>
              </div>
            )}

            {/* Detection guidance */}
            {selected.detection_guidance && (
              <div>
                <p className="text-xs text-muted uppercase tracking-wide mb-2">Detection Guidance</p>
                <div className="border-l-4 border-copper bg-copper/5 px-4 py-3 rounded-r-card">
                  <p className="text-xs text-muted mb-1.5 italic">ATT&CK Documented</p>
                  <p className="text-sm text-ivory leading-relaxed">{selected.detection_guidance}</p>
                </div>
              </div>
            )}

            {/* Mapped rules */}
            <div>
              <p className="text-xs text-muted uppercase tracking-wide mb-2">
                Mapped Sigma Rules ({mappedRules.length})
              </p>
              {mappedRules.length === 0 ? (
                <p className="text-sm text-muted italic">No rules mapped to this technique.</p>
              ) : (
                <div className="space-y-2">
                  {mappedRules.map(rule => (
                    <div key={rule.id} className="flex items-center gap-3 px-3 py-2 bg-warm-surface border border-border rounded-card">
                      <ParseBadge status={rule.parse_status} />
                      <span className="text-sm text-ivory flex-1 truncate">{rule.title ?? 'Unnamed Rule'}</span>
                      <span className="font-mono text-[10px] text-muted truncate max-w-[120px]">{rule.id.slice(0, 12)}…</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sub-techniques */}
            {selected.subtechnique_ids.length > 0 && (
              <div>
                <p className="text-xs text-muted uppercase tracking-wide mb-2">
                  Sub-techniques ({selected.subtechnique_ids.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {selected.subtechnique_ids.map(id => (
                    <button
                      key={id}
                      onClick={() => setSelectedId(id)}
                      className="font-mono text-xs text-copper bg-copper/10 border border-copper/30 px-2.5 py-1 rounded-full hover:bg-copper/20 transition-colors"
                    >
                      {id}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Parent link for sub-techniques */}
            {selected.is_subtechnique && selected.parent_id && (
              <div>
                <p className="text-xs text-muted uppercase tracking-wide mb-2">Parent Technique</p>
                <button
                  onClick={() => setSelectedId(selected.parent_id!)}
                  className="font-mono text-xs text-copper bg-copper/10 border border-copper/30 px-2.5 py-1 rounded-full hover:bg-copper/20 transition-colors"
                >
                  {selected.parent_id}
                </button>
              </div>
            )}

            {/* Evidence confidence */}
            <div className="border-t border-border pt-4">
              <p className="text-[10px] text-muted italic">
                Evidence confidence: {selected.detection_guidance ? 'ATT&CK Documented' : 'Analyst Assessment'} —
                ATT&CK v{selected.dataset_version}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
