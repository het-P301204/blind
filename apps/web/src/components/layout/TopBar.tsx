import { Search } from 'lucide-react'
import { useAppStore } from '@/lib/store'

export default function TopBar() {
  const { setCommandPaletteOpen } = useAppStore()

  return (
    <header className="h-14 bg-graphite border-b border-border flex items-center justify-between px-6 flex-shrink-0">
      {/* Brand */}
      <span className="font-display font-semibold text-ivory text-base tracking-wide">
        BLIND
      </span>

      {/* Search trigger */}
      <button
        onClick={() => setCommandPaletteOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-input bg-warm-surface border border-border text-muted hover:text-ivory hover:border-border/80 transition-colors"
        aria-label="Open command palette"
      >
        <Search size={14} />
        <span className="text-xs text-muted/70 font-mono">⌘K</span>
      </button>
    </header>
  )
}
