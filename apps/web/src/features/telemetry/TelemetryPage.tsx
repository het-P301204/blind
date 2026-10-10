import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Upload, Save, Pencil, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import type { TelemetrySource, TelemetryStatus } from '@/types/api'
import {
  Button,
  TelemetryBadge,
  Modal,
  LoadingState,
  ErrorState,
} from '@/components/ui'

const STATUS_CYCLE: TelemetryStatus[] = ['AVAILABLE', 'PARTIAL', 'MISSING', 'UNKNOWN']

function cycleStatus(current: TelemetryStatus): TelemetryStatus {
  const idx = STATUS_CYCLE.indexOf(current)
  return STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length]
}

interface EditRow {
  name: string
  platform: string
  collection_status: TelemetryStatus
  coverage_scope: string
  last_verified: string
  owner: string
  notes: string
}

export default function TelemetryPage() {
  const qc = useQueryClient()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<EditRow | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState<Partial<TelemetrySource>>({
    name: '',
    platform: '',
    collection_status: 'UNKNOWN',
    coverage_scope: '',
    owner: '',
    notes: '',
  })
  const fileRef = useRef<HTMLInputElement>(null)

  const { data: sources, isLoading, isError, refetch } = useQuery<TelemetrySource[]>({
    queryKey: ['telemetry'],
    queryFn: () => api.listTelemetry().then(r => r.data.data),
  })

  const upsertMutation = useMutation({
    mutationFn: (data: Partial<TelemetrySource>) => api.upsertTelemetry(data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['telemetry'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteTelemetry(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['telemetry'] }),
  })

  function startEdit(source: TelemetrySource) {
    setEditingId(source.id)
    setEditValues({
      name: source.name,
      platform: source.platform,
      collection_status: source.collection_status,
      coverage_scope: source.coverage_scope ?? '',
      last_verified: source.last_verified ?? '',
      owner: source.owner ?? '',
      notes: source.notes ?? '',
    })
  }

  async function saveEdit(source: TelemetrySource) {
    if (!editValues) return
    try {
      await upsertMutation.mutateAsync({ ...source, ...editValues })
      setEditingId(null)
      setEditValues(null)
      toast.success('Source updated')
    } catch {
      toast.error('Failed to save changes')
    }
  }

  async function deleteSource(id: string) {
    try {
      await deleteMutation.mutateAsync(id)
      toast.success('Source removed')
    } catch {
      toast.error('Failed to delete source')
    }
  }

  async function handleAddSubmit() {
    try {
      await upsertMutation.mutateAsync(addForm)
      setShowAddModal(false)
      setAddForm({ name: '', platform: '', collection_status: 'UNKNOWN', coverage_scope: '', owner: '', notes: '' })
      toast.success('Source added')
    } catch {
      toast.error('Failed to add source')
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const items: TelemetrySource[] = JSON.parse(text)
      for (const item of items) {
        await api.upsertTelemetry(item)
      }
      await qc.invalidateQueries({ queryKey: ['telemetry'] })
      toast.success(`Imported ${items.length} sources`)
    } catch {
      toast.error('Failed to import JSON â€” check file format')
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  function cycleSourceStatus(source: TelemetrySource) {
    upsertMutation.mutate({ ...source, collection_status: cycleStatus(source.collection_status) })
  }

  const counts: Record<TelemetryStatus, number> = {
    AVAILABLE: sources?.filter(s => s.collection_status === 'AVAILABLE').length ?? 0,
    PARTIAL: sources?.filter(s => s.collection_status === 'PARTIAL').length ?? 0,
    MISSING: sources?.filter(s => s.collection_status === 'MISSING').length ?? 0,
    UNKNOWN: sources?.filter(s => s.collection_status === 'UNKNOWN').length ?? 0,
  }

  if (isLoading) return <LoadingState className="p-6" />
  if (isError) return <ErrorState onRetry={refetch} className="p-6" />

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
        <div>
          <h1 className="font-display font-semibold text-ivory text-xl">Telemetry Inventory</h1>
          <p className="text-muted text-sm mt-0.5">Track data source availability and coverage scope</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImport}
          />
          <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
            <Upload size={14} />
            Import JSON
          </Button>
          <Button size="sm" onClick={() => setShowAddModal(true)}>
            <Plus size={14} />
            Add Source
          </Button>
        </div>
      </div>

      {/* Summary counts */}
      <div className="grid grid-cols-4 gap-3 px-6 py-4 shrink-0">
        {(
          [
            { key: 'AVAILABLE' as const, label: 'Available', color: 'text-sage', bg: 'bg-sage/10 border border-sage/20' },
            { key: 'PARTIAL' as const, label: 'Partial', color: 'text-amber', bg: 'bg-amber/10 border border-amber/20' },
            { key: 'MISSING' as const, label: 'Missing', color: 'text-burnt-red', bg: 'bg-burnt-red/10 border border-burnt-red/20' },
            { key: 'UNKNOWN' as const, label: 'Unknown', color: 'text-muted', bg: 'bg-graphite border border-border' },
          ]
        ).map(({ key, label, color, bg }) => (
          <div key={key} className={`rounded-lg px-4 py-3 ${bg}`}>
            <p className={`text-2xl font-display font-semibold ${color}`}>{counts[key]}</p>
            <p className="text-muted text-xs mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-6 pb-6">
        <div className="bg-warm-surface border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-raised-panel/40">
                <th className="text-left px-4 py-3 text-muted font-medium text-xs uppercase tracking-wide">Source Name</th>
                <th className="text-left px-4 py-3 text-muted font-medium text-xs uppercase tracking-wide">Platform</th>
                <th className="text-left px-4 py-3 text-muted font-medium text-xs uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-muted font-medium text-xs uppercase tracking-wide">Coverage Scope</th>
                <th className="text-left px-4 py-3 text-muted font-medium text-xs uppercase tracking-wide">Last Verified</th>
                <th className="text-left px-4 py-3 text-muted font-medium text-xs uppercase tracking-wide">Owner</th>
                <th className="text-right px-4 py-3 text-muted font-medium text-xs uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
                {sources?.map(source => {
                  const isEditing = editingId === source.id
                  return (
                    <motion.tr
                      key={source.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="border-b border-border/50 last:border-0 hover:bg-raised-panel/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input
                            className="w-full bg-graphite border border-border rounded px-2 py-1 text-ivory text-sm focus:outline-none focus:border-copper/60"
                            value={editValues?.name ?? ''}
                            onChange={e => setEditValues(v => v ? { ...v, name: e.target.value } : v)}
                          />
                        ) : (
                          <span className="text-ivory font-medium">{source.name}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input
                            className="w-full bg-graphite border border-border rounded px-2 py-1 text-ivory text-sm focus:outline-none focus:border-copper/60"
                            value={editValues?.platform ?? ''}
                            onChange={e => setEditValues(v => v ? { ...v, platform: e.target.value } : v)}
                          />
                        ) : (
                          <span className="text-muted">{source.platform}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <select
                            className="bg-graphite border border-border rounded px-2 py-1 text-ivory text-sm focus:outline-none focus:border-copper/60"
                            value={editValues?.collection_status ?? source.collection_status}
                            onChange={e =>
                              setEditValues(v => v ? { ...v, collection_status: e.target.value as TelemetryStatus } : v)
                            }
                          >
                            {STATUS_CYCLE.map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        ) : (
                          <button
                            onClick={() => cycleSourceStatus(source)}
                            title="Click to cycle status"
                            className="cursor-pointer hover:opacity-80 transition-opacity"
                          >
                            <TelemetryBadge status={source.collection_status} />
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input
                            className="w-full bg-graphite border border-border rounded px-2 py-1 text-ivory text-sm focus:outline-none focus:border-copper/60"
                            value={editValues?.coverage_scope ?? ''}
                            onChange={e => setEditValues(v => v ? { ...v, coverage_scope: e.target.value } : v)}
                          />
                        ) : (
                          <span className="text-muted text-xs">{source.coverage_scope ?? 'â€”'}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input
                            type="date"
                            className="bg-graphite border border-border rounded px-2 py-1 text-ivory text-sm focus:outline-none focus:border-copper/60"
                            value={editValues?.last_verified ?? ''}
                            onChange={e => setEditValues(v => v ? { ...v, last_verified: e.target.value } : v)}
                          />
                        ) : (
                          <span className="text-muted text-xs font-mono">{source.last_verified ?? 'â€”'}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input
                            className="w-full bg-graphite border border-border rounded px-2 py-1 text-ivory text-sm focus:outline-none focus:border-copper/60"
                            value={editValues?.owner ?? ''}
                            onChange={e => setEditValues(v => v ? { ...v, owner: e.target.value } : v)}
                          />
                        ) : (
                          <span className="text-muted text-xs">{source.owner ?? 'â€”'}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-end">
                          {isEditing ? (
                            <>
                              <Button
                                size="sm"
                                variant="primary"
                                loading={upsertMutation.isPending}
                                onClick={() => saveEdit(source)}
                              >
                                <Save size={12} />
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => { setEditingId(null); setEditValues(null) }}
                              >
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button size="sm" variant="ghost" onClick={() => startEdit(source)}>
                                <Pencil size={12} />
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="danger"
                                loading={deleteMutation.isPending}
                                onClick={() => deleteSource(source.id)}
                              >
                                <Trash2 size={12} />
                                Delete
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  )
                })}
              </AnimatePresence>
              {(sources?.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted text-sm">
                    No telemetry sources configured. Click "Add Source" to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Source Modal */}
      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Telemetry Source"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs text-muted font-medium block mb-1.5">Source Name</label>
            <input
              className="w-full bg-obsidian border border-border rounded-md px-3 py-2 text-ivory text-sm focus:outline-none focus:border-copper/60"
              placeholder="e.g., Windows Security Event Log"
              value={addForm.name ?? ''}
              onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs text-muted font-medium block mb-1.5">Platform</label>
            <input
              className="w-full bg-obsidian border border-border rounded-md px-3 py-2 text-ivory text-sm focus:outline-none focus:border-copper/60"
              placeholder="e.g., Windows, Linux, AWS"
              value={addForm.platform ?? ''}
              onChange={e => setAddForm(f => ({ ...f, platform: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs text-muted font-medium block mb-1.5">Status</label>
            <select
              className="w-full bg-obsidian border border-border rounded-md px-3 py-2 text-ivory text-sm focus:outline-none focus:border-copper/60"
              value={addForm.collection_status ?? 'UNKNOWN'}
              onChange={e => setAddForm(f => ({ ...f, collection_status: e.target.value as TelemetryStatus }))}
            >
              {STATUS_CYCLE.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted font-medium block mb-1.5">Coverage Scope</label>
            <input
              className="w-full bg-obsidian border border-border rounded-md px-3 py-2 text-ivory text-sm focus:outline-none focus:border-copper/60"
              placeholder="e.g., Process creation, Network connections"
              value={addForm.coverage_scope ?? ''}
              onChange={e => setAddForm(f => ({ ...f, coverage_scope: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs text-muted font-medium block mb-1.5">Owner</label>
            <input
              className="w-full bg-obsidian border border-border rounded-md px-3 py-2 text-ivory text-sm focus:outline-none focus:border-copper/60"
              placeholder="e.g., SOC Team, Detection Engineering"
              value={addForm.owner ?? ''}
              onChange={e => setAddForm(f => ({ ...f, owner: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs text-muted font-medium block mb-1.5">Notes</label>
            <textarea
              className="w-full bg-obsidian border border-border rounded-md px-3 py-2 text-ivory text-sm focus:outline-none focus:border-copper/60 resize-none"
              rows={3}
              placeholder="Optional notes about this data sourceâ€¦"
              value={addForm.notes ?? ''}
              onChange={e => setAddForm(f => ({ ...f, notes: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button
              loading={upsertMutation.isPending}
              disabled={!addForm.name || !addForm.platform}
              onClick={handleAddSubmit}
            >
              Add Source
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

