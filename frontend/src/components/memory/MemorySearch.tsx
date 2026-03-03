import { useState } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Slider } from '@/components/ui/Slider'
import { api, type SearchHit } from '@/lib/api'

interface MemorySearchProps {
  onResults: (results: SearchHit[]) => void
  onLoading: (loading: boolean) => void
  onError: (error: string | null) => void
}

export function MemorySearch({ onResults, onLoading, onError }: MemorySearchProps) {
  const [query, setQuery] = useState('')
  const [tags, setTags] = useState('')
  const [limit, setLimit] = useState(20)

  const handleSearch = async () => {
    if (!query.trim()) return
    onLoading(true)
    onError(null)
    try {
      const tagList = tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
      const results = await api.searchMemories(query, {
        tags: tagList.length > 0 ? tagList : undefined,
        limit,
      })
      onResults(results)
    } catch (err: any) {
      onError(err.message || 'Search failed')
      onResults([])
    } finally {
      onLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 p-4 border-b">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search memories..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-9"
          />
        </div>
        <Button onClick={handleSearch}>Search</Button>
      </div>

      <div className="flex items-center gap-4">
        <Input
          placeholder="Filter by tags (comma-separated)"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          className="flex-1"
        />
        <div className="w-48">
          <Slider
            label="Limit"
            min={1}
            max={100}
            value={limit}
            onValueChange={setLimit}
          />
        </div>
      </div>
    </div>
  )
}
