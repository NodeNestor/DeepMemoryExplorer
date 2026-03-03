import { useState } from 'react'
import { Search, RotateCcw, Maximize2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Slider } from '@/components/ui/Slider'
import { Card, CardContent } from '@/components/ui/Card'
import { useGraph } from '@/stores/graph'
import { api } from '@/lib/api'

const ENTITY_TYPES = [
  'person',
  'organization',
  'location',
  'concept',
  'technology',
  'event',
  'product',
  'paper',
]

interface GraphControlsProps {
  onFitView?: () => void
}

export function GraphControls({ onFitView }: GraphControlsProps) {
  const { mergeGraph, reset, nodes } = useGraph()
  const [searchName, setSearchName] = useState('')
  const [depth, setDepth] = useState(2)
  const [loading, setLoading] = useState(false)
  const [typeFilters, setTypeFilters] = useState<Set<string>>(new Set())

  const handleSearch = async () => {
    if (!searchName.trim()) return
    setLoading(true)
    try {
      const data = await api.traverseGraph({ entity_name: searchName, depth })
      mergeGraph(data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  const handleReloadAll = async () => {
    setLoading(true)
    try {
      const data = await api.getFullGraph({ depth })
      useGraph.getState().setGraph(data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  const toggleType = (type: string) => {
    setTypeFilters((prev) => {
      const next = new Set(prev)
      if (next.has(type)) {
        next.delete(type)
      } else {
        next.add(type)
      }
      return next
    })
  }

  return (
    <Card className="w-64 shadow-lg">
      <CardContent className="p-3 space-y-3">
        <div className="flex gap-1">
          <Input
            placeholder="Search entity..."
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="text-xs h-8"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={handleSearch}
            disabled={loading}
            className="h-8 w-8 p-0"
          >
            <Search className="h-3 w-3" />
          </Button>
        </div>

        <Slider
          label="Depth"
          min={1}
          max={10}
          value={depth}
          onValueChange={setDepth}
        />

        <Button
          variant="outline"
          size="sm"
          onClick={handleReloadAll}
          disabled={loading}
          className="w-full text-xs"
        >
          <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Loading...' : `Reload All (depth ${depth})`}
        </Button>

        {nodes.length > 0 && (
          <span className="text-[10px] text-muted-foreground block text-center">
            {nodes.length} nodes loaded
          </span>
        )}

        <div>
          <span className="text-xs text-muted-foreground mb-1 block">Filter types</span>
          <div className="flex flex-wrap gap-1">
            {ENTITY_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => toggleType(type)}
                className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                  typeFilters.has(type)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-input hover:bg-accent'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-1">
          <Button variant="outline" size="sm" onClick={reset} className="flex-1 text-xs">
            <RotateCcw className="h-3 w-3 mr-1" />
            Reset
          </Button>
          <Button variant="outline" size="sm" onClick={onFitView} className="flex-1 text-xs">
            <Maximize2 className="h-3 w-3 mr-1" />
            Fit View
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
