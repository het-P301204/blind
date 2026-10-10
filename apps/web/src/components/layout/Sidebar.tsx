import { useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Grid3x3,
  FileText,
  TrendingDown,
  ArrowUpCircle,
  Signal,
  FlaskConical,
  Target,
  Library,
  GitCompare,
  FileDown,
  Database,
  History,
  Settings,
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { Logo } from '@/components/brand/Logo'

interface NavItem {
  label: string
  path: string
  icon: React.ElementType
}

interface NavSection {
  heading: string
  items: NavItem[]
}

const navSections: NavSection[] = [
  {
    heading: 'Overview',
    items: [
      { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    heading: 'Analysis',
    items: [
      { label: 'ATT&CK Matrix', path: '/matrix', icon: Grid3x3 },
      { label: 'Detection Rules', path: '/rules', icon: FileText },
      { label: 'Coverage Gaps', path: '/gaps', icon: TrendingDown },
      { label: 'Prioritization', path: '/prioritization', icon: ArrowUpCircle },
    ],
  },
  {
    heading: 'Validation',
    items: [
      { label: 'Telemetry Inventory', path: '/telemetry', icon: Signal },
      { label: 'Validation Results', path: '/validation', icon: FlaskConical },
    ],
  },
  {
    heading: 'Intelligence',
    items: [
      { label: 'Technique Context', path: '/context', icon: Target },
      { label: 'Corpus Explorer', path: '/corpus', icon: Library },
      { label: 'Change Analysis', path: '/compare', icon: GitCompare },
    ],
  },
  {
    heading: 'Reporting',
    items: [
      { label: 'Reports & Exports', path: '/reports', icon: FileDown },
    ],
  },
  {
    heading: 'System',
    items: [
      { label: 'Data Sources', path: '/data-sources', icon: Database },
      { label: 'Import History', path: '/history', icon: History },
      { label: 'Settings', path: '/settings', icon: Settings },
    ],
  },
]

export default function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { attackVersion, ruleCount, demoLoaded } = useAppStore()

  return (
    <aside className="w-60 flex-shrink-0 bg-graphite border-r border-border flex flex-col overflow-hidden">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-border">
        <Logo size="sm" />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border">
        {navSections.map((section) => (
          <div key={section.heading}>
            <p className="uppercase text-xs text-muted/60 tracking-widest px-3 py-2 mt-4 first:mt-2">
              {section.heading}
            </p>
            {section.items.map((item) => {
              const isActive = location.pathname === item.path
              const Icon = item.icon
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={[
                    'w-full flex items-center gap-2.5 px-3 py-2 rounded-input text-sm transition-colors text-left',
                    isActive
                      ? 'text-ivory bg-warm-surface'
                      : 'text-muted hover:text-ivory hover:bg-warm-surface',
                  ].join(' ')}
                >
                  <Icon
                    size={15}
                    className={isActive ? 'text-copper' : 'text-current'}
                  />
                  <span>{item.label}</span>
                </button>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Footer status */}
      <div className="px-3 py-3 border-t border-border space-y-1">
        {attackVersion && (
          <p className="text-xs text-muted/60 font-mono">
            ATT&amp;CK {attackVersion}
          </p>
        )}
        {ruleCount !== null && (
          <p className="text-xs text-muted/60 font-mono">
            {ruleCount.toLocaleString()} rules
          </p>
        )}
        {demoLoaded && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono font-semibold bg-copper/20 text-copper border border-copper/30">
            DEMO
          </span>
        )}
      </div>
    </aside>
  )
}
