import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Plus, ClipboardList, Server, FlaskConical, Tag } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import type { ValidationRecord, ValidationStatus } from '@/types/api'
import {
  Button,
  ValidationBadge,
  Tabs,
  Modal,
  Drawer,
  LoadingState,
  ErrorState,
} from '@/components/ui'

const VALIDATION_STATUSES: ValidationStatus[] = [
  'NOT_TESTED', 'PLANNED', 'TESTED', 'PASSED', 'FAILED', 'INCONCLUSIVE',
]

function statusLabel(s: ValidationStatus): string {
  return s.replace(/_/g, ' ')
}

const EMPTY_FORM: Partial<ValidationRecord> = {
  technique_id: '',
  rule_id: '',
  objective: '',
  prerequisites: [],
  expected_evidence: '',
  expected_detection: '',
  status: 'NOT_TESTED',
  required_telemetry: [],
}

export default function ValidationPage() {
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState('test-plans')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<ValidationRecord | null>(null)
  const [form, setForm] = useState<Partial<ValidationRecord>>({ ...EMPTY_FORM })

  const { data: records, isLoading, isError, refetch } = useQuery<ValidationRecord[]>({
    queryKey: ['validation'],
    queryFn: () => api.listValidation().then(r => r.data.data),
  })

  const { data: techniques } = useQuery<import('@/types/api').AttackTechnique[]>({
    queryKey: ['techniques'],
    queryFn: () => api.listTechniques().then(r => r.data.data),
  })

  const createMutation = useMutation({
    mutationFn: (data: Partial<ValidationRecord>) => api.createValidation(data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['validation'] })
      setShowCreateModal(false)
      setForm({ ...EMPTY_FORM })
      toast.success('Test plan created')
    },
    onError: () => toast.error('Failed to create test plan'),
  })

  const tabs = [
    { key: 'test-plans', label: 'Test Plans', icon: <FlaskConical size={14} /> },
    { key: 'deployment', label: 'Deployment Registry', icon: <Server size={14} /> },
  ]

  if (isLoading) return <LoadingState className="p-6" />
  if (isError) return <ErrorState onRetry={refetch} className="p-6" />

  const allRecords = records ?? []

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
        <div>
          <h1 className="font-display font-semibold text-ivory text-xl">Validation Lab</h1>
          <p className="text-muted text-sm mt-0.5">Test plans and deployment status for detection rules</p>
        </div>
        <Button size="sm" onClick={() => setShowCreateModal(true)}>
          <Plus size={14} />
          Create Test Plan
        </Button>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={tabs}
        activeKey={activeTab}
        onChange={setActiveTab}
        className="px-6 shrink-0"
      />

      {/* Content */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {activeTab === 'test-plans' && (
          <div className="space-y-3">
            {allRecords.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <ClipboardList size={40} className="text-muted/40 mb-4" />
                <p className="text-ivory font-display font-semibold text-base mb-1.5">No test plans yet</p>
                <p className="text-muted text-sm max-w-sm">
                  Create a test plan to track validation coverage for your detection techniques.
                </p>
                <Button size="sm" className="mt-5" onClick={() => setShowCreateModal(true)}>
                  <Plus size={14} />
                  Create Test Plan
                </Button>
              </div>
            ) : allRecords.map(record => (
              <motion.div
                key={record.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-warm-surface border border-border rounded-xl px-5 py-4 cursor-pointer hover:border-copper/40 transition-all"
                onClick={() => setSelectedRecord(record)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="font-mono text-copper text-sm font-semibold">
                        {record.technique_id}
                      </span>
                      {record.rule_id && (
                        <span className="flex items-center gap-1 text-xs text-muted border border-border rounded-full px-2 py-0.5">
                          <Tag size={10} />
                          {record.rule_id}
                        </span>
                      )}
                    </div>
                    <p className="text-ivory text-sm leading-relaxed line-clamp-2">
                      {record.objective}
                    </p>
                    {record.prerequisites.length > 0 && (
                      <p className="text-muted text-xs mt-1.5">
                        {record.prerequisites.length} prerequisite
                        {record.prerequisites.length !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                  <ValidationBadge status={record.status} />
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {activeTab === 'deployment' && (
          <div className="bg-warm-surface border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-raised-panel/40">
                  <th className="text-left px-4 py-3 text-muted font-medium text-xs uppercase tracking-wide">Technique ID</th>
                  <th className="text-left px-4 py-3 text-muted font-medium text-xs uppercase tracking-wide">Objective</th>
                  <th className="text-left px-4 py-3 text-muted font-medium text-xs uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-muted font-medium text-xs uppercase tracking-wide">Tested At</th>
                  <th className="text-right px-4 py-3 text-muted font-medium text-xs uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {allRecords.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-muted text-sm">
                      No validation records found.
                    </td>
                  </tr>
                ) : allRecords.map(record => (
                  <tr
                    key={record.id}
                    className="border-b border-border/50 last:border-0 hover:bg-raised-panel/30 transition-colors cursor-pointer"
                    onClick={() => setSelectedRecord(record)}
                  >
                    <td className="px-4 py-3 font-mono text-copper text-sm">{record.technique_id}</td>
                    <td className="px-4 py-3 text-ivory text-sm max-w-xs truncate">{record.objective}</td>
                    <td className="px-4 py-3"><ValidationBadge status={record.status} /></td>
                    <td className="px-4 py-3 text-muted text-xs font-mono">
                      {record.tested_at?.slice(0, 10) ?? 'â€”'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={e => { e.stopPropagation(); setSelectedRecord(record) }}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Detail Drawer */}
      <Drawer
        open={!!selectedRecord}
        onClose={() => setSelectedRecord(null)}
        title={selectedRecord ? `${selectedRecord.technique_id} â€” Validation Detail` : 'Validation Detail'}
        width="w-[520px]"
      >
        {selectedRecord && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-mono text-copper text-lg font-semibold">
                {selectedRecord.technique_id}
              </span>
              <ValidationBadge status={selectedRecord.status} />
            </div>

            {selectedRecord.rule_id && (
              <div>
                <p className="text-muted text-xs font-medium uppercase tracking-wide mb-1">Rule ID</p>
                <p className="font-mono text-sm text-ivory">{selectedRecord.rule_id}</p>
              </div>
            )}

            <div>
              <p className="text-muted text-xs font-medium uppercase tracking-wide mb-1">Objective</p>
              <p className="text-ivory text-sm leading-relaxed">{selectedRecord.objective}</p>
            </div>

            {selectedRecord.prerequisites.length > 0 && (
              <div>
                <p className="text-muted text-xs font-medium uppercase tracking-wide mb-1.5">Prerequisites</p>
                <ul className="space-y-1.5">
                  {selectedRecord.prerequisites.map((p, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-ivory">
                      <span className="text-copper mt-0.5 shrink-0">â€º</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <p className="text-muted text-xs font-medium uppercase tracking-wide mb-1">Expected Evidence</p>
              <p className="text-ivory text-sm leading-relaxed bg-obsidian rounded-lg px-3 py-2.5 border border-border">
                {selectedRecord.expected_evidence}
              </p>
            </div>

            <div>
              <p className="text-muted text-xs font-medium uppercase tracking-wide mb-1">Expected Detection</p>
              <p className="text-ivory text-sm leading-relaxed bg-obsidian rounded-lg px-3 py-2.5 border border-border">
                {selectedRecord.expected_detection}
              </p>
            </div>

            {selectedRecord.observed_result && (
              <div>
                <p className="text-muted text-xs font-medium uppercase tracking-wide mb-1">Observed Result</p>
                <p className="text-ivory text-sm leading-relaxed">{selectedRecord.observed_result}</p>
              </div>
            )}

            {selectedRecord.analyst_notes && (
              <div>
                <p className="text-muted text-xs font-medium uppercase tracking-wide mb-1">Analyst Notes</p>
                <p className="text-muted text-sm leading-relaxed">{selectedRecord.analyst_notes}</p>
              </div>
            )}

            {selectedRecord.remediation && (
              <div>
                <p className="text-muted text-xs font-medium uppercase tracking-wide mb-1">Remediation</p>
                <p className="text-amber text-sm leading-relaxed">{selectedRecord.remediation}</p>
              </div>
            )}

            {selectedRecord.tested_at && (
              <div>
                <p className="text-muted text-xs font-medium uppercase tracking-wide mb-1">Tested At</p>
                <p className="font-mono text-muted text-sm">{selectedRecord.tested_at}</p>
              </div>
            )}

            {selectedRecord.required_telemetry.length > 0 && (
              <div>
                <p className="text-muted text-xs font-medium uppercase tracking-wide mb-1.5">Required Telemetry</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedRecord.required_telemetry.map((t, i) => (
                    <span
                      key={i}
                      className="text-xs px-2 py-0.5 rounded-full bg-graphite border border-border text-muted"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-1.5 text-xs text-muted border-t border-border pt-3">
              <span>{selectedRecord.is_synthetic ? 'Synthetic' : 'Real-world'} test</span>
            </div>
          </div>
        )}
      </Drawer>

      {/* Create Modal */}
      <Modal
        open={showCreateModal}
        onClose={() => { setShowCreateModal(false); setForm({ ...EMPTY_FORM }) }}
        title="Create Test Plan"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted font-medium block mb-1.5">Technique ID</label>
              <input
                list="technique-datalist"
                className="w-full bg-obsidian border border-border rounded-md px-3 py-2 text-ivory text-sm focus:outline-none focus:border-copper/60 font-mono"
                placeholder="e.g., T1059.001"
                value={form.technique_id ?? ''}
                onChange={e => setForm(f => ({ ...f, technique_id: e.target.value }))}
              />
              <datalist id="technique-datalist">
                {techniques?.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </datalist>
            </div>
            <div>
              <label className="text-xs text-muted font-medium block mb-1.5">Rule ID <span className="text-muted/50">(optional)</span></label>
              <input
                className="w-full bg-obsidian border border-border rounded-md px-3 py-2 text-ivory text-sm focus:outline-none focus:border-copper/60 font-mono"
                placeholder="Sigma rule UUID"
                value={form.rule_id ?? ''}
                onChange={e => setForm(f => ({ ...f, rule_id: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted font-medium block mb-1.5">Objective</label>
            <textarea
              className="w-full bg-obsidian border border-border rounded-md px-3 py-2 text-ivory text-sm focus:outline-none focus:border-copper/60 resize-none"
              rows={2}
              placeholder="Describe what this test plan validatesâ€¦"
              value={form.objective ?? ''}
              onChange={e => setForm(f => ({ ...f, objective: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs text-muted font-medium block mb-1.5">Prerequisites <span className="text-muted/50">(one per line)</span></label>
            <textarea
              className="w-full bg-obsidian border border-border rounded-md px-3 py-2 text-ivory text-sm focus:outline-none focus:border-copper/60 font-mono resize-none"
              rows={3}
              placeholder={'Sysmon installed\nWindows event log 4688 enabled'}
              value={(form.prerequisites ?? []).join('\n')}
              onChange={e =>
                setForm(f => ({ ...f, prerequisites: e.target.value.split('\n').filter(Boolean) }))
              }
            />
          </div>
          <div>
            <label className="text-xs text-muted font-medium block mb-1.5">Expected Evidence</label>
            <textarea
              className="w-full bg-obsidian border border-border rounded-md px-3 py-2 text-ivory text-sm focus:outline-none focus:border-copper/60 resize-none"
              rows={2}
              placeholder="What artifacts should appear in logs?"
              value={form.expected_evidence ?? ''}
              onChange={e => setForm(f => ({ ...f, expected_evidence: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs text-muted font-medium block mb-1.5">Expected Detection</label>
            <textarea
              className="w-full bg-obsidian border border-border rounded-md px-3 py-2 text-ivory text-sm focus:outline-none focus:border-copper/60 resize-none"
              rows={2}
              placeholder="Which alert or rule should fire?"
              value={form.expected_detection ?? ''}
              onChange={e => setForm(f => ({ ...f, expected_detection: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs text-muted font-medium block mb-1.5">Status</label>
            <select
              className="w-full bg-obsidian border border-border rounded-md px-3 py-2 text-ivory text-sm focus:outline-none focus:border-copper/60"
              value={form.status ?? 'NOT_TESTED'}
              onChange={e => setForm(f => ({ ...f, status: e.target.value as ValidationStatus }))}
            >
              {VALIDATION_STATUSES.map(s => (
                <option key={s} value={s}>{statusLabel(s)}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => { setShowCreateModal(false); setForm({ ...EMPTY_FORM }) }}
            >
              Cancel
            </Button>
            <Button
              loading={createMutation.isPending}
              disabled={!form.technique_id || !form.objective}
              onClick={() => createMutation.mutate(form)}
            >
              Create Test Plan
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

