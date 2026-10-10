import { useState } from 'react'
import { X, Copy, ExternalLink, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { CoverageResult, AttackTechnique } from '@/types/api'
import {
  CoverageBadge,
  TelemetryBadge,
  ValidationBadge,
  DeploymentBadge,
} from '@/components/ui'

// ─── Copyable rule-id tag ─────────────────────────────────────────────────────

function CopyTag({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <button
      onClick={handleCopy}
      title={`Copy ${value}`}
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-mono text-[11px] bg-raised-panel text-copper border border-border hover:border-copper/60 transition-colors group"
    >
      {value}
      {copied ? (
        <Check size={10} className="text-sage" />
      ) : (
        <Copy size={10} className="text-muted group-hover:text-copper transition-colors" />
      )}
    </button>
  )
}

// ─── Panel ────────────────────────────────────────────────────────────────────

interface TechniqueDetailsPanelProps {
  techniqueId: string | null
  coverage?: CoverageResult
  technique?: AttackTechnique
  onClose: () => void
}

export default function TechniqueDetailsPanel({
  techniqueId,
  coverage,
  technique,
  onClose,
}: TechniqueDetailsPanelProps) {
  const tactics = coverage?.tactics ?? technique?.tactics ?? []
  const name = technique?.name ?? coverage?.technique_name ?? '—'

  return (
    <AnimatePresence>
      {techniqueId && (
        <>
          {/* Backdrop overlay (mobile) */}
          <motion.div
            key="panel-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-30 bg-obsidian/50 md:hidden"
          />

          {/* Panel */}
          <motion.aside
            key="details-panel"
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="fixed right-0 top-0 h-full w-full md:w-96 bg-graphite border-l border-border z-40 flex flex-col shadow-2xl"
          >
            {/* Header — sticky */}
            <div className="flex items-start justify-between p-5 border-b border-border bg-graphite sticky top-0 z-10 shrink-0">
              <div className="min-w-0 pr-3">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-mono text-copper text-base font-semibold">{techniqueId}</p>
                  {techniqueId && <CopyTag value={techniqueId} />}
                </div>
                <h2 className="font-display text-lg text-ivory leading-snug">{name}</h2>
              </div>
              <button
                onClick={onClose}
                className="text-muted hover:text-ivory transition-colors shrink-0 mt-0.5"
                aria-label="Close details"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 p-5 space-y-6">
              {/* Status badges */}
              {coverage && (
                <div className="flex flex-wrap gap-2">
                  <CoverageBadge level={coverage.coverage_level} />
                  <TelemetryBadge status={coverage.telemetry_status} />
                  <ValidationBadge status={coverage.validation_status} />
                  <DeploymentBadge status={coverage.deployment_status} />
                </div>
              )}

              {/* Coverage score */}
              {coverage && (
                <div className="bg-warm-surface border border-border rounded-lg p-4">
                  <p className="text-[10px] text-muted uppercase tracking-wide mb-2">Coverage Score</p>
                  <div className="flex items-baseline gap-2">
                    <p className="font-mono text-3xl text-ivory font-bold leading-none">
                      {Math.round(coverage.coverage_score)}
                    </p>
                    <p className="text-muted text-sm">/ 100</p>
                  </div>
                  <div className="mt-3 h-1.5 bg-raised-panel rounded-full overflow-hidden">
                    <div
                      className="h-full bg-copper rounded-full transition-all"
                      style={{ width: `${Math.min(coverage.coverage_score, 100)}%` }}
                    />
                  </div>
                  {coverage.scoring_formula && (
                    <p className="font-mono text-[10px] text-muted/70 mt-2 break-all leading-relaxed">
                      {coverage.scoring_formula}
                    </p>
                  )}
                </div>
              )}

              {/* Tactics */}
              {tactics.length > 0 && (
                <div>
                  <p className="text-[10px] text-muted uppercase tracking-wide mb-2">Tactics</p>
                  <div className="flex flex-wrap gap-1.5">
                    {tactics.map(t => (
                      <span
                        key={t}
                        className="px-2 py-0.5 rounded-full text-xs bg-raised-panel text-muted border border-border capitalize"
                      >
                        {t.replace(/-/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Mapped rule count + IDs */}
              {coverage && coverage.mapped_rule_count > 0 && (
                <div>
                  <p className="text-[10px] text-muted uppercase tracking-wide mb-2">
                    Mapped Rules ({coverage.mapped_rule_count})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {coverage.mapped_rule_ids.slice(0, 24).map(id => (
                      <CopyTag key={id} value={id} />
                    ))}
                    {coverage.mapped_rule_ids.length > 24 && (
                      <span className="text-xs text-muted self-center">
                        +{coverage.mapped_rule_ids.length - 24} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Detection guidance */}
              {technique?.detection_guidance && (
                <div>
                  <p className="text-[10px] text-muted uppercase tracking-wide mb-2">
                    Detection Guidance
                  </p>
                  <p className="text-xs text-ivory/80 leading-relaxed bg-warm-surface border border-border rounded-lg p-3">
                    {technique.detection_guidance}
                  </p>
                </div>
              )}

              {/* Description */}
              {technique?.description && (
                <div>
                  <p className="text-[10px] text-muted uppercase tracking-wide mb-2">Description</p>
                  <p className="text-xs text-muted leading-relaxed line-clamp-8">
                    {technique.description}
                  </p>
                </div>
              )}

              {/* Platforms */}
              {technique?.platforms && technique.platforms.length > 0 && (
                <div>
                  <p className="text-[10px] text-muted uppercase tracking-wide mb-2">Platforms</p>
                  <div className="flex flex-wrap gap-1.5">
                    {technique.platforms.map(p => (
                      <span
                        key={p}
                        className="px-2 py-0.5 rounded-full text-xs bg-raised-panel text-muted border border-border"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Deprecated notice */}
              {(technique?.is_deprecated || technique?.is_revoked) && (
                <div className="bg-burnt-red/10 border border-burnt-red/30 rounded-lg px-3 py-2">
                  <p className="text-xs text-burnt-red">
                    {technique.is_revoked ? 'This technique has been revoked.' : 'This technique is deprecated.'}
                  </p>
                </div>
              )}

              {/* External link */}
              <a
                href={`https://attack.mitre.org/techniques/${techniqueId?.replace('.', '/')}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs text-muted hover:text-copper transition-colors"
              >
                <ExternalLink size={12} />
                View on ATT&CK Navigator
              </a>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
