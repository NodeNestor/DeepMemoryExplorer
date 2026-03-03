import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent } from '@/components/ui/Card'
import { timeAgo } from '@/lib/utils'
import type { FeedEvent } from '@/stores/feed'

const TYPE_STYLES: Record<string, string> = {
  memory_added: 'bg-green-500/20 text-green-400 border-green-500/30',
  memory_updated: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  memory_invalidated: 'bg-red-500/20 text-red-400 border-red-500/30',
  entity_updated: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
}

function getPreview(event: FeedEvent): string {
  const d = event.data
  if (d.content) return d.content.slice(0, 120)
  if (d.memory?.content) return d.memory.content.slice(0, 120)
  if (d.entity?.name) return `Entity: ${d.entity.name}`
  if (d.message) return d.message.slice(0, 120)
  return JSON.stringify(d).slice(0, 120)
}

interface EventCardProps {
  event: FeedEvent
}

export function EventCard({ event }: EventCardProps) {
  const [expanded, setExpanded] = useState(false)
  const style = TYPE_STYLES[event.type] ?? 'bg-muted text-muted-foreground'

  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge className={`text-[10px] ${style}`}>{event.type}</Badge>
            <span className="text-[10px] text-muted-foreground">
              {timeAgo(event.timestamp)}
            </span>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
        </div>

        <p className="text-xs mt-1.5 text-muted-foreground">
          {getPreview(event)}
          {!expanded && getPreview(event).length >= 120 && '...'}
        </p>

        {expanded && (
          <pre className="mt-2 text-[10px] bg-muted rounded p-2 overflow-auto max-h-48">
            {JSON.stringify(event.data, null, 2)}
          </pre>
        )}
      </CardContent>
    </Card>
  )
}
