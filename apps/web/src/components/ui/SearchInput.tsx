import { useEffect, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  debounceMs?: number
  className?: string
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search…',
  debounceMs = 300,
  className,
}: SearchInputProps) {
  const [localValue, setLocalValue] = useState(value)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync external value into local state when it changes from outside
  useEffect(() => {
    setLocalValue(value)
  }, [value])

  function handleChange(raw: string) {
    setLocalValue(raw)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      onChange(raw)
    }, debounceMs)
  }

  function handleClear() {
    setLocalValue('')
    if (timerRef.current) clearTimeout(timerRef.current)
    onChange('')
  }

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return (
    <div className={cn('relative flex items-center', className)}>
      <Search
        size={15}
        className="absolute left-3 text-muted pointer-events-none"
        aria-hidden="true"
      />
      <input
        type="text"
        value={localValue}
        onChange={e => handleChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'w-full bg-graphite border border-border rounded-md pl-9 pr-8 py-2',
          'text-sm text-ivory placeholder:text-muted',
          'focus:outline-none focus:border-copper/60 transition-colors'
        )}
      />
      {localValue && (
        <button
          onClick={handleClear}
          className="absolute right-2.5 text-muted hover:text-ivory transition-colors"
          aria-label="Clear search"
        >
          <X size={13} />
        </button>
      )}
    </div>
  )
}
