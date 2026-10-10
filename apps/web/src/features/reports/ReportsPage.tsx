import { useState } from 'react'
import { motion } from 'framer-motion'
import { FileText, Grid3x3, Code2, Table2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui'
import { api } from '@/lib/api'
import { cn, downloadBlob } from '@/lib/utils'

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface ExportCardDef {
  icon: React.ReactNode
  title: string
  description: string
  includes: string[]
  buttonLabel: string
  toastLabel: string
  filename: string
  action: () => Promise<Blob>
}

// â”€â”€â”€ Export Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function ExportCard({ def, index }: { def: ExportCardDef; index: number }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleExport() {
    setLoading(true)
    setError(null)
    const toastId = toast.loading(def.toastLabel)
    try {
      const blob = await def.action()
      downloadBlob(blob, def.filename)
      toast.dismiss(toastId)
      toast.success('Export complete')
    } catch (e) {
      toast.dismiss(toastId)
      const msg = e instanceof Error ? e.message : 'Export failed'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.06 }}
      className={cn(
        'bg-warm-surface border border-border rounded-xl p-6',
        'flex flex-col gap-4'
      )}
    >
      {/* Icon + heading */}
      <div className="flex items-start gap-3">
        <div className="p-2.5 bg-copper/10 rounded-lg shrink-0">
          {def.icon}
        </div>
        <div>
          <h3 className="font-display font-semibold text-ivory text-sm leading-snug">
            {def.title}
          </h3>
          <p className="text-muted text-xs mt-1 leading-relaxed">
            {def.description}
          </p>
        </div>
      </div>

      {/* Includes list */}
      <div className="flex-1">
        <p className="text-xs text-muted uppercase tracking-wider font-medium mb-2">
          Includes
        </p>
        <ul className="space-y-1.5">
          {def.includes.map(item => (
            <li key={item} className="flex items-center gap-2 text-xs text-ivory/70">
              <span className="w-1 h-1 rounded-full bg-copper shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Error */}
      {error && (
        <p className="text-burnt-red text-xs bg-burnt-red/10 border border-burnt-red/20 rounded-lg px-3 py-2 leading-relaxed">
          {error}
        </p>
      )}

      {/* Action */}
      <Button loading={loading} onClick={handleExport} className="w-full justify-center">
        {def.buttonLabel}
      </Button>
    </motion.div>
  )
}

// â”€â”€â”€ Card Definitions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const EXPORT_CARDS: ExportCardDef[] = [
  {
    icon: <FileText size={18} className="text-copper" />,
    title: 'Executive PDF Report',
    description:
      'Comprehensive detection coverage analysis with gap rankings and recommendations',
    includes: [
      'Coverage summary',
      'Top 20 gaps',
      'Tactic breakdown',
      'Telemetry status',
      'Validation results',
    ],
    buttonLabel: 'Generate PDF',
    toastLabel: 'Generating PDFâ€¦',
    filename: 'blind-report.pdf',
    action: () => api.exportReport('pdf').then(r => r.data as Blob),
  },
  {
    icon: <Grid3x3 size={18} className="text-copper" />,
    title: 'ATT&CK Navigator Layer',
    description:
      'Import into MITRE ATT&CK Navigator to visualize your detection coverage',
    includes: [
      'All techniques with coverage scores',
      'Color coding by level',
      'Metadata for each technique',
    ],
    buttonLabel: 'Export Navigator Layer',
    toastLabel: 'Exporting Navigator layerâ€¦',
    filename: 'blind-navigator-layer.json',
    action: () => api.exportNavigator().then(r => r.data as Blob),
  },
  {
    icon: <Code2 size={18} className="text-copper" />,
    title: 'JSON Analysis Export',
    description:
      'Complete analysis data in machine-readable format for custom tooling',
    includes: [
      'All coverage results',
      'Gap assessments',
      'Priority factors',
      'Scoring formulas',
    ],
    buttonLabel: 'Export JSON',
    toastLabel: 'Exporting JSONâ€¦',
    filename: 'blind-analysis.json',
    action: () => api.exportReport('json').then(r => r.data as Blob),
  },
  {
    icon: <Table2 size={18} className="text-copper" />,
    title: 'CSV Gap Ranking',
    description:
      'Prioritized gap list ready for ticket creation and team distribution',
    includes: [
      'Technique IDs',
      'Priority scores',
      'Coverage levels',
      'Recommended actions',
    ],
    buttonLabel: 'Export CSV',
    toastLabel: 'Exporting CSVâ€¦',
    filename: 'blind-gaps.csv',
    action: () => api.exportReport('csv').then(r => r.data as Blob),
  },
]

// â”€â”€â”€ Reports Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function ReportsPage() {
  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border shrink-0">
        <h1 className="font-display font-semibold text-ivory text-lg">
          Export &amp; Reports
        </h1>
        <p className="text-xs text-muted mt-0.5">
          Generate analysis exports in multiple formats
        </p>
      </div>

      {/* Grid */}
      <div className="flex-1 p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {EXPORT_CARDS.map((card, i) => (
            <ExportCard key={card.title} def={card} index={i} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default ReportsPage
