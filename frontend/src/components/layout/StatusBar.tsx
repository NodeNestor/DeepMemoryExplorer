import { useState, useEffect } from 'react'
import { api, type HealthStatus } from '@/lib/api'

export function StatusBar() {
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let mounted = true
    const fetchHealth = async () => {
      try {
        const data = await api.getHealth()
        if (mounted) {
          setHealth(data)
          setError(false)
        }
      } catch {
        if (mounted) setError(true)
      }
    }
    fetchHealth()
    const interval = setInterval(fetchHealth, 30000)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  const hivemindOk = health?.hivemind === 'ok'
  const llmOk = health?.llm === 'ok'

  return (
    <div className="flex items-center gap-6 border-t bg-card px-4 py-1.5 text-xs text-muted-foreground">
      <div className="flex items-center gap-2">
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            error ? 'bg-red-500' : hivemindOk ? 'bg-green-500' : 'bg-yellow-500'
          }`}
        />
        <span>HiveMindDB {error ? 'unreachable' : hivemindOk ? 'connected' : 'disconnected'}</span>
      </div>

      <div className="flex items-center gap-2">
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            error ? 'bg-red-500' : llmOk ? 'bg-green-500' : 'bg-yellow-500'
          }`}
        />
        <span>LLM {error ? 'unreachable' : llmOk ? 'connected' : 'disconnected'}</span>
      </div>

      {health?.hivemind_stats && (
        <div className="ml-auto flex items-center gap-4">
          <span>{health.hivemind_stats.total_memories} memories</span>
          <span>{health.hivemind_stats.total_entities} entities</span>
          <span>{health.hivemind_stats.total_relationships} relationships</span>
        </div>
      )}
    </div>
  )
}
