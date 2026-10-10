import { useEffect } from 'react'
import { useAppStore } from '@/lib/store'

export function useCommandPalette() {
  const { setCommandPaletteOpen } = useAppStore()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setCommandPaletteOpen])
}
