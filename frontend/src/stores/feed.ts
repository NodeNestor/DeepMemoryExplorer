import { create } from 'zustand'

export interface FeedEvent {
  id: string
  type: string
  timestamp: string
  data: any
}

interface FeedState {
  events: FeedEvent[]
  paused: boolean
  pausedBuffer: FeedEvent[]
  addEvent: (event: any) => void
  pause: () => void
  resume: () => void
  clear: () => void
}

let eventCounter = 0

export const useFeed = create<FeedState>((set, get) => ({
  events: [],
  paused: false,
  pausedBuffer: [],

  addEvent: (rawEvent: any) => {
    const event: FeedEvent = {
      id: `evt-${++eventCounter}`,
      type: rawEvent.type ?? 'unknown',
      timestamp: rawEvent.timestamp ?? new Date().toISOString(),
      data: rawEvent,
    }

    const { paused } = get()
    if (paused) {
      set((s) => ({ pausedBuffer: [event, ...s.pausedBuffer] }))
    } else {
      set((s) => ({ events: [event, ...s.events].slice(0, 500) }))
    }
  },

  pause: () => set({ paused: true }),

  resume: () =>
    set((s) => ({
      paused: false,
      events: [...s.pausedBuffer, ...s.events].slice(0, 500),
      pausedBuffer: [],
    })),

  clear: () => set({ events: [], pausedBuffer: [] }),
}))
