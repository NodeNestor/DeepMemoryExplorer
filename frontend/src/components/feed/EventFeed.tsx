import { ScrollArea } from '@/components/ui/ScrollArea'
import { EventCard } from './EventCard'
import { useFeed } from '@/stores/feed'

export function EventFeed() {
  const { events } = useFeed()

  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <p className="text-sm">No events yet. Events will appear here in real-time.</p>
      </div>
    )
  }

  return (
    <ScrollArea className="flex-1 p-4">
      <div className="space-y-2">
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </ScrollArea>
  )
}
