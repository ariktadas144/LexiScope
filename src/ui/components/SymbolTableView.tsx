import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp } from 'lucide-react'
import type { SymbolEntry } from '../../core/semantic/symbolTable'

type Column = 'name' | 'type' | 'scope' | 'value'
const columns: { key: Column; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'type', label: 'Type' },
  { key: 'scope', label: 'Scope' },
  { key: 'value', label: 'Value' },
]

export function SymbolTableView({ symbols }: { symbols: SymbolEntry[] }) {
  const [sortBy, setSortBy] = useState<Column>('name')
  const [ascending, setAscending] = useState(true)

  const sorted = useMemo(() => {
    const copy = [...symbols]
    copy.sort((a, b) => {
      const av = String(a[sortBy] ?? '')
      const bv = String(b[sortBy] ?? '')
      return ascending ? av.localeCompare(bv) : bv.localeCompare(av)
    })
    return copy
  }, [symbols, sortBy, ascending])

  if (symbols.length === 0) return <div className="symbol-table empty-hint">No symbols yet</div>

  const toggleSort = (column: Column) => {
    if (column === sortBy) setAscending((v) => !v)
    else {
      setSortBy(column)
      setAscending(true)
    }
  }

  return (
    <div className="symbol-table">
      <div className="symbol-row symbol-head">
        {columns.map(({ key, label }) => (
          <button key={key} type="button" className="symbol-sort" onClick={() => toggleSort(key)}>
            {label}
            {sortBy === key && (ascending ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}
          </button>
        ))}
      </div>
      {sorted.map((symbol) => (
        <div className="symbol-row" key={symbol.uniqueName} title={`declared at line ${symbol.line}`}>
          <b>{symbol.name}</b>
          <span>{symbol.type}</span>
          <span>{symbol.scope}</span>
          <span className="symbol-value">{symbol.value ?? '—'}</span>
        </div>
      ))}
    </div>
  )
}
