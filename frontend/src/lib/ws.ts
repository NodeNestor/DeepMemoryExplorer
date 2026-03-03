type WSHandler = (event: any) => void
type StatusHandler = (connected: boolean) => void

export class WSClient {
  private ws: WebSocket | null = null
  private handlers: Set<WSHandler> = new Set()
  private statusHandlers: Set<StatusHandler> = new Set()
  private reconnectDelay = 1000
  private maxDelay = 30000
  private shouldConnect = false
  private _connected = false

  get connected() {
    return this._connected
  }

  connect() {
    this.shouldConnect = true
    this._connect()
  }

  disconnect() {
    this.shouldConnect = false
    this.ws?.close()
    this.ws = null
    this._setConnected(false)
  }

  subscribe(handler: WSHandler) {
    this.handlers.add(handler)
    return () => {
      this.handlers.delete(handler)
    }
  }

  onStatus(handler: StatusHandler) {
    this.statusHandlers.add(handler)
    return () => {
      this.statusHandlers.delete(handler)
    }
  }

  private _setConnected(value: boolean) {
    if (this._connected !== value) {
      this._connected = value
      this.statusHandlers.forEach((h) => h(value))
    }
  }

  private _connect() {
    if (!this.shouldConnect) return
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const url = `${protocol}//${window.location.host}/ws`
    console.log('[WS] Connecting to', url)
    this.ws = new WebSocket(url)

    this.ws.onopen = () => {
      console.log('[WS] Connected')
      this.reconnectDelay = 1000
      this._setConnected(true)
      this.ws!.send(JSON.stringify({ type: 'subscribe', channels: ['global'] }))
    }

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        this.handlers.forEach((h) => h(data))
      } catch {
        // ignore malformed messages
      }
    }

    this.ws.onclose = (event) => {
      console.log('[WS] Closed:', event.code, event.reason)
      this._setConnected(false)
      if (this.shouldConnect) {
        console.log('[WS] Reconnecting in', this.reconnectDelay, 'ms')
        setTimeout(() => {
          this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxDelay)
          this._connect()
        }, this.reconnectDelay)
      }
    }

    this.ws.onerror = (event) => {
      console.error('[WS] Error:', event)
      this.ws?.close()
    }
  }
}

export const wsClient = new WSClient()
