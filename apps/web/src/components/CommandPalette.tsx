import { useEffect, useState, useCallback } from 'react'
import { Command } from 'cmdk'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  LayoutDashboard,
  Grid3x3,
  TrendingDown,
  FileDown,
  ArrowUpCircle,
  Signal,
  FlaskConical,
  Play,
  FileText,
  Search,
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { api } from '@/lib/api'
import { useDebounce } from '@/hooks/useDebounce'
import type { AttackTechnique } from '@/types/api'
import { downloadBlob } from '@/lib/utils'

interface NavEntry {
  label: string
  path: string
  icon: React.ElementType
}

const NAV_ITEMS: NavEntry[] = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'ATT&CK Matrix', path: '/matrix', icon: Grid3x3 },
  { label: 'Gap Explorer', path: '/gaps', icon: TrendingDown },
  { label: 'Reports', path: '/reports', icon: FileDown },
  { label: 'Prioritization', path: '/prioritization', icon: ArrowUpCircle },
  { label: 'Telemetry', path: '/telemetry', icon: Signal },
  { label: 'Validation', path: '/validation', icon: FlaskConical },
]

export default function CommandPalette() {
  const { isCommandPaletteOpen, setCommandPaletteOpen } = useAppStore()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [techniques, setTechniques] = useState<AttackTechnique[]>([])
  const [loadingTechniques, setLoadingTechniques] = useState(false)

  // Fetch techniques when debounced search changes
  useEffect(() => {
    if (!debouncedSearch.trim()) {
      setTechniques([])
      return
    }
    let cancelled = false
    setLoadingTechniques(true)
    api
      .listTechniques()
      .then((r) => {
        if (!cancelled) {
          const q = debouncedSearch.toLowerCase()
          const filtered = (r.data ?? [])
            .filter(t => t.id.toLowerCase().includes(q) || t.name.toLowerCase().includes(q))
            .slice(0, 6)
          setTechniques(filtered)
        }
      })
      .catch(() => {
        if (!cancelled) setTechniques([])
      })
      .finally(() => {
        if (!cancelled) setLoadingTechniques(false)
      })
    return () => {
      cancelled = true
    }
  }, [debouncedSearch])

  const close = useCallback(() => {
    setCommandPaletteOpen(false)
    setSearch('')
    setTechniques([])
  }, [setCommandPaletteOpen])

  function handleNav(path: string) {
    navigate(path)
    close()
  }

  async function handleLoadDemo() {
    close()
    try {
      await api.startIngest({ path: '', type: 'demo' })
      toast.success('Demo data loading…')
      navigate('/dashboard')
    } catch {
      toast.error('Failed to load demo data')
    }
  }

  async function handleExportNavigator() {
    close()
    try {
      const r = await api.exportNavigator()
      downloadBlob(r.data as Blob, 'blind-navigator-layer.json')
      toast.success('Navigator layer exported')
    } catch {
      toast.error('Export failed')
    }
  }

  function handleGenerateReport() {
    close()
    navigate('/reports')
  }

  function handleStartIngestion() {
    close()
    navigate('/data-sources')
  }

  if (!isCommandPaletteOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh]"
      style={{ background: 'rgba(17,17,16,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={close}
    >
      <div
        className="w-full max-w-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <Command
          className="bg-graphite border border-border rounded-panel shadow-2xl overflow-hidden"
          shouldFilter={false}
          onKeyDown={(e) => {
            if (e.key === 'Escape') close()
          }}
        >
          {/* Search input */}
          <div className="flex items-center gap-2 px-4 border-b border-border">
            <Search size={14} className="text-muted flex-shrink-0" />
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder="Search commands or techniques…"
              className="flex-1 bg-transparent py-3.5 text-sm text-ivory placeholder:text-muted/50 outline-none"
              autoFocus
            />
          </div>

          <Command.List className="max-h-96 overflow-y-auto py-1">
            <Command.Empty className="py-8 text-center text-sm text-muted/60">
              {loadingTechniques ? 'Searching…' : 'No results found'}
            </Command.Empty>

            {/* Navigate group */}
            <Command.Group
              heading="Navigate"
              className="[&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-muted/60 [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:px-4 [&_[cmdk-group-heading]]:py-2"
            >
              {NAV_ITEMS.filter(
                (item) =>
                  !search ||
                  item.label.toLowerCase().includes(search.toLowerCase()),
              ).map((item) => {
                const Icon = item.icon
                return (
                  <Command.Item
                    key={item.path}
                    value={item.label}
                    onSelect={() => handleNav(item.path)}
                    className="flex items-center gap-2.5 px-4 py-2 text-sm text-muted hover:text-ivory hover:bg-warm-surface cursor-pointer rounded-sm mx-1 transition-colors aria-selected:bg-warm-surface aria-selected:text-ivory"
                  >
                    <Icon size={14} className="text-muted/70 flex-shrink-0" />
                    <span>{item.label}</span>
                  </Command.Item>
                )
              })}
            </Command.Group>

            {/* Actions group */}
            <Command.Group
              heading="Actions"
              className="[&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-muted/60 [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:px-4 [&_[cmdk-group-heading]]:py-2"
            >
              {(!search || 'load demo data'.includes(search.toLowerCase())) && (
                <Command.Item
                  value="Load Demo Data"
                  onSelect={handleLoadDemo}
                  className="flex items-center gap-2.5 px-4 py-2 text-sm text-muted hover:text-ivory hover:bg-warm-surface cursor-pointer rounded-sm mx-1 transition-colors aria-selected:bg-warm-surface aria-selected:text-ivory"
                >
                  <Play size={14} className="text-copper flex-shrink-0" />
                  <span>Load Demo Data</span>
                </Command.Item>
              )}
              {(!search || 'start ingestion'.includes(search.toLowerCase())) && (
                <Command.Item
                  value="Start Ingestion"
                  onSelect={handleStartIngestion}
                  className="flex items-center gap-2.5 px-4 py-2 text-sm text-muted hover:text-ivory hover:bg-warm-surface cursor-pointer rounded-sm mx-1 transition-colors aria-selected:bg-warm-surface aria-selected:text-ivory"
                >
                  <Signal size={14} className="text-muted/70 flex-shrink-0" />
                  <span>Start Ingestion</span>
                </Command.Item>
              )}
              {(!search || 'export navigator layer'.includes(search.toLowerCase())) && (
                <Command.Item
                  value="Export Navigator Layer"
                  onSelect={handleExportNavigator}
                  className="flex items-center gap-2.5 px-4 py-2 text-sm text-muted hover:text-ivory hover:bg-warm-surface cursor-pointer rounded-sm mx-1 transition-colors aria-selected:bg-warm-surface aria-selected:text-ivory"
                >
                  <FileDown size={14} className="text-muted/70 flex-shrink-0" />
                  <span>Export Navigator Layer</span>
                </Command.Item>
              )}
              {(!search || 'generate pdf report'.includes(search.toLowerCase())) && (
                <Command.Item
                  value="Generate PDF Report"
                  onSelect={handleGenerateReport}
                  className="flex items-center gap-2.5 px-4 py-2 text-sm text-muted hover:text-ivory hover:bg-warm-surface cursor-pointer rounded-sm mx-1 transition-colors aria-selected:bg-warm-surface aria-selected:text-ivory"
                >
                  <FileText size={14} className="text-muted/70 flex-shrink-0" />
                  <span>Generate PDF Report</span>
                </Command.Item>
              )}
            </Command.Group>

            {/* Technique search results */}
            {techniques.length > 0 && (
              <Command.Group
                heading="Techniques"
                className="[&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-muted/60 [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:px-4 [&_[cmdk-group-heading]]:py-2"
              >
                {techniques.map((t) => (
                  <Command.Item
                    key={t.id}
                    value={`${t.id} ${t.name}`}
                    onSelect={() => handleNav(`/context?id=${t.id}`)}
                    className="flex items-center gap-2.5 px-4 py-2 text-sm text-muted hover:text-ivory hover:bg-warm-surface cursor-pointer rounded-sm mx-1 transition-colors aria-selected:bg-warm-surface aria-selected:text-ivory"
                  >
                    <span className="font-mono text-xs text-copper/80 w-20 flex-shrink-0">
                      {t.id}
                    </span>
                    <span className="truncate">{t.name}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </Command.List>
        </Command>
      </div>
    </div>
  )
}
