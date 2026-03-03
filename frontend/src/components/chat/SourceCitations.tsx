import { Badge } from '@/components/ui/Badge'
import type { SearchHit } from '@/lib/api'
import { cn } from '@/lib/utils'

interface SourceCitationsProps {
  sources: SearchHit[]
  onMemoryClick?: (id: number) => void
}

export function SourceCitations({ sources, onMemoryClick }: SourceCitationsProps) {
  if (sources.length === 0) return null

  return (
    <div>
      <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
        Sources
      </span>
      <div className="mt-1 space-y-1">
        {sources.map((hit) => {
          const confidenceColor =
            hit.memory.confidence > 0.8
              ? 'text-green-400'
              : hit.memory.confidence > 0.5
                ? 'text-yellow-400'
                : 'text-red-400'

          return (
            <button
              key={hit.memory.id}
              onClick={() => onMemoryClick?.(hit.memory.id)}
              className="w-full text-left bg-background/50 rounded px-2 py-1.5 hover:bg-background/80 transition-colors"
            >
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] text-muted-foreground">#{hit.memory.id}</span>
                <span className={cn('text-[10px]', confidenceColor)}>
                  {(hit.memory.confidence * 100).toFixed(0)}%
                </span>
                {hit.memory.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="outline" className="text-[8px] px-1 py-0 h-3">
                    {tag}
                  </Badge>
                ))}
              </div>
              <p className="text-xs line-clamp-2 text-muted-foreground">
                {hit.memory.content}
              </p>
            </button>
          )
        })}
      </div>
    </div>
  )
}
