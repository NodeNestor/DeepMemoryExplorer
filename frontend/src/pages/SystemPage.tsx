import { useState, useEffect, useCallback } from 'react'
import { Loader2, RefreshCw, Server, Database, Network, Cpu, Plug, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import type { SystemConfig, SystemTopology, SystemHealth } from '@/lib/api'

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  const parts: string[] = []
  if (d > 0) parts.push(`${d}d`)
  if (h > 0) parts.push(`${h}h`)
  if (m > 0) parts.push(`${m}m`)
  parts.push(`${s}s`)
  return parts.join(' ')
}

interface KvRowProps {
  label: string
  value: React.ReactNode
}

function KvRow({ label, value }: KvRowProps) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium tabular-nums">{value}</span>
    </div>
  )
}

function TaskBar({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <Badge variant="outline" className={cn('text-[10px] min-w-[70px] justify-center', color)}>
        {label}
      </Badge>
      <span className="text-sm font-medium tabular-nums">{count}</span>
    </div>
  )
}

export function SystemPage() {
  const [config, setConfig] = useState<SystemConfig | null>(null)
  const [topology, setTopology] = useState<SystemTopology | null>(null)
  const [health, setHealth] = useState<SystemHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(false)

  const fetchAll = useCallback(async () => {
    setError(null)
    try {
      const [cfg, topo, hlth] = await Promise.all([
        api.getSystemConfig(),
        api.getSystemTopology(),
        api.getSystemHealth(),
      ])
      setConfig(cfg)
      setTopology(topo)
      setHealth(hlth)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch system info')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(fetchAll, 5000)
    return () => clearInterval(interval)
  }, [autoRefresh, fetchAll])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">System</h1>
          <div className="flex items-center gap-2">
            <Button
              variant={autoRefresh ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
            </Button>
            <Button variant="outline" size="sm" onClick={fetchAll}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Refresh
            </Button>
          </div>
        </div>

        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-4">
              <p className="text-sm text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Overview */}
        {health && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm">Overview</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex flex-col items-center gap-1 p-3 rounded-md bg-secondary/30">
                  <span className="text-xs text-muted-foreground">Status</span>
                  <Badge
                    variant={health.status === 'ok' || health.status === 'healthy' ? 'default' : 'destructive'}
                  >
                    {health.status}
                  </Badge>
                </div>
                <div className="flex flex-col items-center gap-1 p-3 rounded-md bg-secondary/30">
                  <span className="text-xs text-muted-foreground">Uptime</span>
                  <span className="text-sm font-semibold tabular-nums">
                    {formatUptime(health.uptime_seconds)}
                  </span>
                </div>
                <div className="flex flex-col items-center gap-1 p-3 rounded-md bg-secondary/30">
                  <span className="text-xs text-muted-foreground">Role</span>
                  <span className="text-sm font-semibold">{topology?.role ?? '-'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Config */}
          {config && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-sm">Configuration</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <KvRow label="Listen Address" value={config.listen_addr} />
                <KvRow label="Data Directory" value={config.data_dir} />
                <KvRow label="Embedding Model" value={config.embedding_model} />
                <KvRow label="Embedding Pool Size" value={config.embedding_pool_size} />
                <KvRow label="LLM Provider" value={config.llm_provider} />
                <KvRow label="LLM Model" value={config.llm_model} />
                <KvRow label="Snapshot Interval" value={`${config.snapshot_interval}s`} />
                <KvRow
                  label="Replication"
                  value={
                    <Badge variant={config.replication_enabled ? 'default' : 'secondary'} className="text-[10px]">
                      {config.replication_enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  }
                />
              </CardContent>
            </Card>
          )}

          {/* Topology */}
          {topology && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Network className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-sm">Topology</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <KvRow label="Node ID" value={<span className="font-mono text-xs">{topology.node_id}</span>} />
                <KvRow label="Listen Address" value={topology.listen_addr} />
                <KvRow label="RTDB URL" value={topology.rtdb_url} />
                <KvRow label="Role" value={topology.role} />
                <KvRow
                  label="Replication"
                  value={
                    <Badge variant={topology.replication_enabled ? 'default' : 'secondary'} className="text-[10px]">
                      {topology.replication_enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  }
                />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Health details */}
        {health && (
          <>
            <h2 className="text-sm font-semibold text-muted-foreground pt-2">Health Details</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Embedding */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Plug className="h-4 w-4 text-muted-foreground" />
                      <CardTitle className="text-sm">Embedding</CardTitle>
                    </div>
                    <span
                      className={cn(
                        'inline-block w-2.5 h-2.5 rounded-full',
                        health.embedding.available ? 'bg-green-500' : 'bg-red-500'
                      )}
                      title={health.embedding.available ? 'Available' : 'Unavailable'}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <KvRow label="Provider" value={health.embedding.provider} />
                  <KvRow label="Model" value={health.embedding.model} />
                  <KvRow label="Dimensions" value={health.embedding.dimensions} />
                  <KvRow label="Indexed Count" value={health.embedding.indexed_count.toLocaleString()} />
                  <KvRow label="Pool Size" value={health.embedding.pool_size} />
                </CardContent>
              </Card>

              {/* Memory Store */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-sm">Memory Store</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <KvRow label="Total Memories" value={health.memory_store.total_memories.toLocaleString()} />
                  <KvRow label="Valid" value={health.memory_store.valid_memories.toLocaleString()} />
                  <KvRow label="Invalidated" value={health.memory_store.invalidated_memories.toLocaleString()} />
                  <KvRow label="History Entries" value={health.memory_store.history_entries.toLocaleString()} />
                </CardContent>
              </Card>

              {/* Knowledge Graph */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Network className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-sm">Knowledge Graph</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <KvRow label="Entities" value={health.knowledge_graph.entities.toLocaleString()} />
                  <KvRow label="Relationships" value={health.knowledge_graph.relationships.toLocaleString()} />
                </CardContent>
              </Card>

              {/* Tasks */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Cpu className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-sm">Tasks</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-1.5">
                  <TaskBar label="Total" count={health.tasks.total} color="text-foreground" />
                  <TaskBar label="Pending" count={health.tasks.pending} color="text-yellow-500" />
                  <TaskBar label="In Progress" count={health.tasks.in_progress} color="text-blue-500" />
                  <TaskBar label="Completed" count={health.tasks.completed} color="text-green-500" />
                  <TaskBar label="Failed" count={health.tasks.failed} color="text-red-500" />
                </CardContent>
              </Card>

              {/* WebSocket */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Plug className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-sm">WebSocket</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <KvRow label="Active Connections" value={health.websocket.active_connections} />
                </CardContent>
              </Card>

              {/* Inverted Index */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-sm">Inverted Index</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <KvRow label="Unique Words" value={health.inverted_index.unique_words.toLocaleString()} />
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
