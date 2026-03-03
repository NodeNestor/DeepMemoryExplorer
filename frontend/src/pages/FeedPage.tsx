import { useEffect, useState } from 'react'
import { FeedControls } from '@/components/feed/FeedControls'
import { EventFeed } from '@/components/feed/EventFeed'
import { wsClient } from '@/lib/ws'
import { useFeed } from '@/stores/feed'

export function FeedPage() {
  const addEvent = useFeed((s) => s.addEvent)
  const [connected, setConnected] = useState(wsClient.connected)

  useEffect(() => {
    wsClient.connect()
    const unsub = wsClient.subscribe(addEvent)
    const unsubStatus = wsClient.onStatus(setConnected)
    return () => {
      unsub()
      unsubStatus()
      wsClient.disconnect()
    }
  }, [addEvent])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 pt-3">
        <div
          className={`h-2 w-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}
        />
        <span className="text-xs text-muted-foreground">
          {connected ? 'Connected to HiveMindDB' : 'Disconnected — reconnecting...'}
        </span>
      </div>
      <FeedControls />
      <EventFeed />
    </div>
  )
}
