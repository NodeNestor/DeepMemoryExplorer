import { Pause, Play, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useFeed } from '@/stores/feed'

export function FeedControls() {
  const { events, paused, pausedBuffer, pause, resume, clear } = useFeed()

  return (
    <div className="flex items-center justify-between p-4 border-b">
      <div className="flex items-center gap-2">
        <h2 className="font-semibold text-sm">Event Feed</h2>
        <span className="text-xs text-muted-foreground">
          {events.length} events
        </span>
      </div>

      <div className="flex items-center gap-2">
        {paused && pausedBuffer.length > 0 && (
          <span className="text-xs bg-primary text-primary-foreground rounded-full px-2 py-0.5">
            {pausedBuffer.length} new
          </span>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={paused ? resume : pause}
        >
          {paused ? (
            <>
              <Play className="h-3 w-3 mr-1" />
              Resume
            </>
          ) : (
            <>
              <Pause className="h-3 w-3 mr-1" />
              Pause
            </>
          )}
        </Button>
        <Button variant="outline" size="sm" onClick={clear}>
          <Trash2 className="h-3 w-3 mr-1" />
          Clear
        </Button>
      </div>
    </div>
  )
}
