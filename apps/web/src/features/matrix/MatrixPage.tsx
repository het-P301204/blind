import { useState, useMemo, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import { EmptyState, LoadingState, ErrorState } from '@/components/ui'
import type { AttackTechnique, CoverageResult } from '@/types/api'
import { TACTIC_ORDER, tacticLabel } from '@/lib/utils'
import { TechniqueCell } from './TechniqueCell'
import MatrixFilters from './MatrixFilters'
import TechniqueDetailsPanel from './TechniqueDetailsPanel'
import MatrixLegend from './MatrixLegend'

// ─── Hover tooltip types ─────────────────────────────────────────────────────

interface HoveredTech {
  technique: AttackTechnique
  coverage: CoverageResult | null
  cellRect: DOMRect
}

// ─── Coverage colour map ─────────────────────────────────────────────────────

export const COVERAGE_COLORS: Record<string, string> = {
  NO_MAPPED_COVERAGE: '#292722',
  LIMITED: '#4A3D1A',
  PARTIAL: '#5C480F',
  STRONG: '#7A4020',
  UNKNOWN: '#292722',
}

// ─── Build tactic → technique map ────────────────────────────────────────────

function buildTacticMap(techniques: AttackTechnique[]) {
  const map: Record<string, AttackTechnique[]> = {}
  for (const t of techniques) {
    for (const tactic of t.tactics) {
      const key = tactic.toLowerCase().replace(/\s+/g, '-')
      if (!map[key]) map[key] = []
      map[key].push(t)
    }
  }
  return map
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MatrixPage() {
  const { selectedTechniqueId, setSelectedTechnique } = useAppStore()

  const [search, setSearch] = useState('')
  const [platform, setPlatform] = useState('')
  const [coverageLevel, setCoverageLevel] = useState('')
  const [activeTactic, setActiveTactic] = useState('')
  const [listView, setListView] = useState(false)
  const [hoveredTech, setHoveredTech] = useState<HoveredTech | null>(null)
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const techniquesQuery = useQuery<AttackTechnique[]>({
    queryKey: ['techniques'],
    queryFn: () => api.listTechniques().then(r => r.data.data),
  })

  const coverageQuery = useQuery<CoverageResult[]>({
    queryKey: ['coverage'],
    queryFn: () => api.getCoverage().then(r => r.data.data),
  })

  const coverageMap = useMemo(() => {
    const map = new Map<string, CoverageResult>()
    for (const c of coverageQuery.data ?? []) {
      map.set(c.technique_id, c)
    }
    return map
  }, [coverageQuery.data])

  const filteredTechniques = useMemo(() => {
    const all = techniquesQuery.data ?? []
    return all.filter(t => {
      if (t.is_deprecated || t.is_revoked) return false
      if (platform && !t.platforms.includes(platform)) return false
      if (coverageLevel) {
        const cov = coverageMap.get(t.id)
        if (!cov || cov.coverage_level !== coverageLevel) return false
      }
      return true
    })
  }, [techniquesQuery.data, platform, coverageLevel, coverageMap])

  // Search matched IDs
  const searchMatchedIds = useMemo(() => {
    if (!search.trim()) return null
    const q = search.toLowerCase()
    const matched = new Set<string>()
    for (const t of filteredTechniques) {
      if (t.id.toLowerCase().includes(q) || t.name.toLowerCase().includes(q)) {
        matched.add(t.id)
      }
    }
    return matched
  }, [search, filteredTechniques])

  const tacticMap = useMemo(() => buildTacticMap(filteredTechniques), [filteredTechniques])

  const activeTactics = useMemo(() => {
    if (activeTactic) return [activeTactic]
    return TACTIC_ORDER.filter(t => (tacticMap[t]?.length ?? 0) > 0)
  }, [activeTactic, tacticMap])

  const selectedCoverage = useMemo(() => {
    if (!selectedTechniqueId) return undefined
    return coverageMap.get(selectedTechniqueId)
  }, [selectedTechniqueId, coverageMap])

  const selectedTechnique = useMemo(() => {
    if (!selectedTechniqueId) return undefined
    return (techniquesQuery.data ?? []).find(t => t.id === selectedTechniqueId)
  }, [selectedTechniqueId, techniquesQuery.data])

  function handleCellHover(e: React.MouseEvent, tech: AttackTechnique) {
    if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current)
    const rect = e.currentTarget.getBoundingClientRect()
    setHoveredTech({
      technique: tech,
      coverage: coverageMap.get(tech.id) ?? null,
      cellRect: rect,
    })
  }

  function handleCellLeave() {
    leaveTimerRef.current = setTimeout(() => setHoveredTech(null), 100)
  }

  function handleTooltipEnter() {
    if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current)
  }

  if (techniquesQuery.isLoading || coverageQuery.isLoading) return <LoadingState />

  if (techniquesQuery.isError) {
    return (
      <ErrorState
        message="Failed to load ATT&CK techniques"
        onRetry={() => { techniquesQuery.refetch(); coverageQuery.refetch() }}
      />
    )
  }

  const isEmpty = (techniquesQuery.data ?? []).length === 0

  if (isEmpty) {
    return (
      <div className="p-6">
        <EmptyState
          title="No techniques loaded"
          description="Load the demo dataset or import your Sigma rules to see the ATT&CK matrix."
          action={{ label: 'Load Demo Data', onClick: () => api.startIngest({ path: '', type: 'demo' }) }}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Filters */}
      <div className="flex-shrink-0 px-6 pt-5 pb-3 border-b border-border bg-graphite">
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-display text-xl font-semibold text-ivory">ATT&CK Matrix</h1>
          <span className="text-xs text-muted font-mono">
            {activeTactics.length} tactics · {filteredTechniques.length} techniques
          </span>
        </div>
        <MatrixFilters
          search={search}
          onSearchChange={setSearch}
          platform={platform}
          onPlatformChange={setPlatform}
          coverageLevel={coverageLevel}
          onCoverageLevelChange={setCoverageLevel}
          activeTactic={activeTactic}
          onActiveTacticChange={setActiveTactic}
          listView={listView}
          onListViewToggle={() => setListView(v => !v)}
        />
      </div>

      {/* Matrix content */}
      {!listView ? (
        <div className="flex-1 overflow-x-auto overflow-y-auto">
          <div className="flex gap-px min-w-max p-4">
            <AnimatePresence mode="sync">
              {activeTactics.map(tactic => {
                const techniques = tacticMap[tactic] ?? []
                const parents = techniques.filter(t => !t.is_subtechnique)
                const childrenByParent: Record<string, AttackTechnique[]> = {}
                for (const c of techniques.filter(t => t.is_subtechnique)) {
                  if (c.parent_id) {
                    if (!childrenByParent[c.parent_id]) childrenByParent[c.parent_id] = []
                    childrenByParent[c.parent_id].push(c)
                  }
                }

                return (
                  <motion.div
                    key={tactic}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col flex-shrink-0"
                    style={{ width: 168 }}
                  >
                    {/* Tactic header */}
                    <div className="bg-raised-panel border border-border rounded-t-lg px-2 py-2 mb-px">
                      <div className="text-xs font-display font-semibold text-ivory leading-tight">
                        {tacticLabel(tactic)}
                      </div>
                      <div className="text-[10px] text-muted font-mono mt-0.5">
                        {parents.length} techniques
                      </div>
                    </div>

                    {/* Technique cells */}
                    <div className="flex flex-col gap-px">
                      {parents.map(tech => {
                        const coverage = coverageMap.get(tech.id)
                        const subs = childrenByParent[tech.id] ?? []
                        const isSelected = selectedTechniqueId === tech.id
                        const dimmed = searchMatchedIds !== null && !searchMatchedIds.has(tech.id)

                        return (
                          <div key={tech.id}>
                            <div
                              onMouseEnter={e => handleCellHover(e, tech)}
                              onMouseLeave={handleCellLeave}
                            >
                              <TechniqueCell
                                technique={tech}
                                coverage={coverage}
                                isSelected={isSelected}
                                dimmed={dimmed}
                                onClick={() => setSelectedTechnique(isSelected ? null : tech.id)}
                              />
                            </div>
                            {subs.map(sub => {
                              const subCoverage = coverageMap.get(sub.id)
                              const subSelected = selectedTechniqueId === sub.id
                              const subDimmed = searchMatchedIds !== null && !searchMatchedIds.has(sub.id)
                              return (
                                <div
                                  key={sub.id}
                                  onMouseEnter={e => handleCellHover(e, sub)}
                                  onMouseLeave={handleCellLeave}
                                >
                                  <TechniqueCell
                                    technique={sub}
                                    coverage={subCoverage}
                                    isSelected={subSelected}
                                    dimmed={subDimmed}
                                    isSub
                                    onClick={() => setSelectedTechnique(subSelected ? null : sub.id)}
                                  />
                                </div>
                              )
                            })}
                          </div>
                        )
                      })}
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        </div>
      ) : (
        /* List view */
        <div className="flex-1 overflow-y-auto p-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left pb-2 text-xs text-muted font-medium px-2">ID</th>
                <th className="text-left pb-2 text-xs text-muted font-medium px-2">Name</th>
                <th className="text-left pb-2 text-xs text-muted font-medium px-2">Tactics</th>
                <th className="text-left pb-2 text-xs text-muted font-medium px-2">Coverage</th>
                <th className="text-left pb-2 text-xs text-muted font-medium px-2">Score</th>
              </tr>
            </thead>
            <tbody>
              {filteredTechniques
                .filter(t => {
                  if (!search.trim()) return true
                  const q = search.toLowerCase()
                  return t.id.toLowerCase().includes(q) || t.name.toLowerCase().includes(q)
                })
                .map(t => {
                  const cov = coverageMap.get(t.id)
                  return (
                    <tr
                      key={t.id}
                      className="border-b border-border-subtle hover:bg-warm-surface cursor-pointer transition-colors"
                      onClick={() => setSelectedTechnique(t.id)}
                    >
                      <td className="px-2 py-2 font-mono text-xs text-copper">{t.id}</td>
                      <td className="px-2 py-2 text-ivory text-xs">{t.name}</td>
                      <td className="px-2 py-2">
                        <div className="flex flex-wrap gap-1">
                          {t.tactics.slice(0, 2).map(tc => (
                            <span key={tc} className="text-[10px] text-muted bg-graphite px-1.5 py-0.5 rounded-full">
                              {tacticLabel(tc)}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-2 py-2 text-xs text-muted">{cov?.coverage_level ?? '—'}</td>
                      <td className="px-2 py-2 font-mono text-xs text-copper">
                        {cov ? `${Math.round(cov.coverage_score * 100)}%` : '—'}
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      )}

      {/* Legend */}
      <MatrixLegend />

      {/* Detail panel */}
      <TechniqueDetailsPanel
        techniqueId={selectedTechniqueId}
        coverage={selectedCoverage}
        technique={selectedTechnique}
        onClose={() => setSelectedTechnique(null)}
      />

      {/* Hover tooltip */}
      <AnimatePresence>
        {hoveredTech && (() => {
          const { technique, coverage, cellRect } = hoveredTech
          const TOOLTIP_W = 240
          const ESTIMATED_H = 220
          const left = Math.max(
            8,
            Math.min(cellRect.left + cellRect.width / 2 - TOOLTIP_W / 2, window.innerWidth - TOOLTIP_W - 8)
          )
          const topAbove = cellRect.top - ESTIMATED_H - 8
          const top = topAbove >= 8 ? topAbove : cellRect.bottom + 8
          return (
            <motion.div
              key="technique-tooltip"
              initial={{ opacity: 0, scale: 0.95, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 4 }}
              transition={{ duration: 0.12 }}
              onMouseEnter={handleTooltipEnter}
              onMouseLeave={() => setHoveredTech(null)}
              className="fixed z-50 bg-raised-panel border border-border rounded-panel p-3 shadow-xl pointer-events-auto"
              style={{ top, left, width: TOOLTIP_W, maxWidth: TOOLTIP_W }}
            >
              <p className="font-mono text-[10px] text-copper mb-0.5">{technique.id}</p>
              <p className="text-xs text-ivory font-semibold mb-2 leading-snug">{technique.name}</p>
              {coverage && (
                <>
                  <div className="flex items-baseline gap-1.5 mb-2">
                    <span className="font-mono text-2xl text-ivory font-bold leading-none">
                      {Math.round(coverage.coverage_score)}
                    </span>
                    <span className="text-muted text-xs">/ 100</span>
                    <span className="ml-auto text-xs text-muted font-mono">
                      {coverage.mapped_rule_count} rules
                    </span>
                  </div>
                  <div className="h-1 bg-graphite rounded-full overflow-hidden mb-2">
                    <div
                      className="h-full bg-copper rounded-full"
                      style={{ width: `${Math.min(coverage.coverage_score, 100)}%` }}
                    />
                  </div>
                </>
              )}
              {technique.tactics.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {technique.tactics.slice(0, 3).map(t => (
                    <span
                      key={t}
                      className="text-[9px] bg-graphite text-muted rounded-full px-1.5 py-0.5"
                    >
                      {tacticLabel(t)}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          )
        })()}
      </AnimatePresence>
    </div>
  )
}
