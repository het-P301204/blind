import { useRef, useMemo, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Column<T> {
  key: string
  header: string
  render: (row: T) => React.ReactNode
  sortable?: boolean
  width?: string
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  loading?: boolean
  emptyState?: React.ReactNode
  onRowClick?: (row: T) => void
  getRowKey: (row: T) => string
  virtualized?: boolean
}

type SortDir = 'asc' | 'desc'

function SkeletonRow({ colCount }: { colCount: number }) {
  return (
    <tr>
      {Array.from({ length: colCount }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div
            className={cn(
              'h-4 rounded bg-raised-panel animate-pulse',
              i === 0 ? 'w-28' : 'w-20'
            )}
          />
        </td>
      ))}
    </tr>
  )
}

export function DataTable<T>({
  data,
  columns,
  loading = false,
  emptyState,
  onRowClick,
  getRowKey,
  virtualized = false,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const containerRef = useRef<HTMLDivElement>(null)

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sortedData = useMemo(() => {
    if (!sortKey) return data
    return [...data].sort((a, b) => {
      const av = (a as Record<string, unknown>)[sortKey]
      const bv = (b as Record<string, unknown>)[sortKey]
      if (av === bv) return 0
      const order = av! < bv! ? -1 : 1
      return sortDir === 'asc' ? order : -order
    })
  }, [data, sortKey, sortDir])

  const rowVirtualizer = useVirtualizer({
    count: sortedData.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 48,
    enabled: virtualized,
  })

  const virtualItems = virtualized ? rowVirtualizer.getVirtualItems() : null

  const headerRow = (
    <thead>
      <tr className="border-b border-border">
        {columns.map(col => (
          <th
            key={col.key}
            className={cn(
              'px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wide',
              col.width && `w-[${col.width}]`,
              col.sortable && 'cursor-pointer select-none hover:text-ivory transition-colors'
            )}
            onClick={col.sortable ? () => handleSort(col.key) : undefined}
          >
            <span className="flex items-center gap-1">
              {col.header}
              {col.sortable && (
                <span className="text-muted/60">
                  {sortKey === col.key ? (
                    sortDir === 'asc' ? (
                      <ChevronUp size={13} className="text-copper" />
                    ) : (
                      <ChevronDown size={13} className="text-copper" />
                    )
                  ) : (
                    <ChevronsUpDown size={13} />
                  )}
                </span>
              )}
            </span>
          </th>
        ))}
      </tr>
    </thead>
  )

  if (loading) {
    return (
      <div className="overflow-auto">
        <table className="w-full border-collapse">
          {headerRow}
          <tbody>
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonRow key={i} colCount={columns.length} />
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (!loading && sortedData.length === 0) {
    return (
      <div>
        <div className="overflow-auto">
          <table className="w-full border-collapse">
            {headerRow}
          </table>
        </div>
        {emptyState && <div className="py-12">{emptyState}</div>}
      </div>
    )
  }

  if (virtualized) {
    return (
      <div ref={containerRef} className="overflow-auto max-h-[600px]">
        <table className="w-full border-collapse">
          {headerRow}
          <tbody
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              position: 'relative',
            }}
          >
            {virtualItems!.map(virtualRow => {
              const row = sortedData[virtualRow.index]
              return (
                <tr
                  key={getRowKey(row)}
                  data-index={virtualRow.index}
                  ref={rowVirtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  className={cn(
                    'border-b border-border/50 transition-colors',
                    onRowClick && 'cursor-pointer hover:bg-raised-panel'
                  )}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map(col => (
                    <td key={col.key} className="px-4 py-3 text-sm text-ivory">
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="overflow-auto">
      <table className="w-full border-collapse">
        {headerRow}
        <tbody>
          {sortedData.map(row => (
            <tr
              key={getRowKey(row)}
              className={cn(
                'border-b border-border/50 transition-colors',
                onRowClick && 'cursor-pointer hover:bg-raised-panel'
              )}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map(col => (
                <td key={col.key} className="px-4 py-3 text-sm text-ivory">
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
