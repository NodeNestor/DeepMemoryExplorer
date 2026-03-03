import { Badge } from '@/components/ui/Badge'
import { Card, CardContent } from '@/components/ui/Card'
import { cn, timeAgo } from '@/lib/utils'
import type { SearchHit } from '@/lib/api'

interface MemoryCardProps {
  hit: SearchHit
  selected?: boolean
  onSelect?: (id: number) => void
  onClick?: (id: number) => void
}

export function MemoryCard({ hit, selected, onSelect, onClick }: MemoryCardProps) {
  const { memory, score } = hit
  const truncated =
    memory.content.length > 200
      ? memory.content.slice(0, 200) + '...'
      : memory.content

  const confidenceColor =
    memory.confidence > 0.8
      ? 'bg-green-500/20 text-green-400 border-green-500/30'
      : memory.confidence > 0.5
        ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
        : 'bg-red-500/20 text-red-400 border-red-500/30'

  return (
    <Card
      className={cn(
        'cursor-pointer transition-colors hover:bg-accent/50',
        selected && 'ring-1 ring-primary'
      )}
      onClick={() => onClick?.(memory.id)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="text-[10px]">
              {memory.memory_type}
            </Badge>
            <Badge className={cn('text-[10px]', confidenceColor)}>
              {(memory.confidence * 100).toFixed(0)}%
            </Badge>
          </div>
          {onSelect && (
            <input
              type="checkbox"
              checked={selected}
              onChange={(e) => {
                e.stopPropagation()
                onSelect(memory.id)
              }}
              onClick={(e) => e.stopPropagation()}
              className="h-4 w-4 rounded border-input accent-primary"
            />
          )}
        </div>

        <p className="text-sm leading-relaxed mb-3">{truncated}</p>

        <div className="flex items-center justify-between">
          <div className="flex gap-1 flex-wrap">
            {memory.tags.slice(0, 5).map((tag) => (
              <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">
                {tag}
              </Badge>
            ))}
            {memory.tags.length > 5 && (
              <span className="text-[10px] text-muted-foreground">
                +{memory.tags.length - 5}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground shrink-0">
            <span>score: {score.toFixed(3)}</span>
            <span>{timeAgo(memory.created_at)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
