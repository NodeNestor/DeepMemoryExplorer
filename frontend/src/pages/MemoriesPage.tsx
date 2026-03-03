import { useState } from 'react'
import { MemorySearch } from '@/components/memory/MemorySearch'
import { MemoryCard } from '@/components/memory/MemoryCard'
import { MemoryDetail } from '@/components/memory/MemoryDetail'
import { AnalysisPanel } from '@/components/memory/AnalysisPanel'
import { Loader2 } from 'lucide-react'
import type { SearchHit } from '@/lib/api'

export function MemoriesPage() {
  const [results, setResults] = useState<SearchHit[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedMemoryId, setSelectedMemoryId] = useState<number | null>(null)
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set())

  const toggleChecked = (id: number) => {
    setCheckedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleDeleted = (id: number) => {
    setResults((prev) => prev.filter((r) => r.memory.id !== id))
    setCheckedIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col min-w-0">
        <MemorySearch onResults={setResults} onLoading={setLoading} onError={setError} />

        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <div className="p-4">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {!loading && !error && results.length > 0 && (
          <div className="flex-1 overflow-auto p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {results.map((hit) => (
                <MemoryCard
                  key={hit.memory.id}
                  hit={hit}
                  selected={checkedIds.has(hit.memory.id)}
                  onSelect={toggleChecked}
                  onClick={setSelectedMemoryId}
                />
              ))}
            </div>

            <AnalysisPanel selectedIds={Array.from(checkedIds)} />
          </div>
        )}

        {!loading && !error && results.length === 0 && (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <p className="text-sm">Search for memories to get started.</p>
          </div>
        )}
      </div>

      {selectedMemoryId !== null && (
        <div className="w-80 border-l bg-card flex-shrink-0">
          <MemoryDetail
            memoryId={selectedMemoryId}
            onClose={() => setSelectedMemoryId(null)}
            onDeleted={handleDeleted}
          />
        </div>
      )}
    </div>
  )
}
