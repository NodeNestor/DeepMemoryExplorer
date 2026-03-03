import { useState } from 'react'
import { Loader2, Play, Timer, Zap, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import type { BenchmarkResponse, BenchmarkOpResult } from '@/lib/api'

const ALL_OPERATIONS = [
  { id: 'write', label: 'Write' },
  { id: 'bulk_write', label: 'Bulk Write' },
  { id: 'keyword_search', label: 'Keyword Search' },
  { id: 'semantic_search', label: 'Semantic Search' },
  { id: 'entity_create', label: 'Entity Create' },
  { id: 'graph_traverse', label: 'Graph Traverse' },
]

function formatUs(us: number): string {
  if (us < 1000) return `${us.toFixed(0)} us`
  if (us < 1_000_000) return `${(us / 1000).toFixed(2)} ms`
  return `${(us / 1_000_000).toFixed(2)} s`
}

function latencyColor(avgUs: number): string {
  if (avgUs < 1000) return 'text-green-400'
  if (avgUs < 10000) return 'text-yellow-400'
  return 'text-red-400'
}

function latencyBgColor(avgUs: number): string {
  if (avgUs < 1000) return 'bg-green-500/10 border-green-500/20'
  if (avgUs < 10000) return 'bg-yellow-500/10 border-yellow-500/20'
  return 'bg-red-500/10 border-red-500/20'
}

export function BenchmarkPage() {
  const [selectedOps, setSelectedOps] = useState<Set<string>>(
    new Set(ALL_OPERATIONS.map((o) => o.id))
  )
  const [iterations, setIterations] = useState(100)
  const [concurrency, setConcurrency] = useState(1)
  const [cleanup, setCleanup] = useState(true)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<BenchmarkResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const toggleOp = (id: string) => {
    setSelectedOps((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const runBenchmark = async () => {
    if (selectedOps.size === 0) return
    setRunning(true)
    setError(null)
    setResult(null)
    try {
      const res = await api.runBenchmark({
        operations: Array.from(selectedOps),
        iterations,
        concurrency,
        cleanup,
      })
      setResult(res)
    } catch (err: any) {
      setError(err.message || 'Benchmark failed')
    } finally {
      setRunning(false)
    }
  }

  const totalOps = result
    ? result.results.reduce((sum, r) => sum + r.iterations, 0)
    : 0

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Benchmark</h1>
          <Badge variant="outline" className="text-xs">
            Performance Testing
          </Badge>
        </div>

        {/* Config */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Operations */}
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">Operations</label>
              <div className="flex flex-wrap gap-2">
                {ALL_OPERATIONS.map((op) => (
                  <button
                    key={op.id}
                    onClick={() => toggleOp(op.id)}
                    className={cn(
                      'px-3 py-1.5 rounded-md text-xs font-medium border transition-colors',
                      selectedOps.has(op.id)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-secondary/50 text-muted-foreground border-border hover:bg-secondary'
                    )}
                  >
                    {op.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Params */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Iterations</label>
                <Input
                  type="number"
                  min={1}
                  max={10000}
                  value={iterations}
                  onChange={(e) => setIterations(parseInt(e.target.value) || 100)}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Concurrency</label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={concurrency}
                  onChange={(e) => setConcurrency(parseInt(e.target.value) || 1)}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Cleanup</label>
                <button
                  onClick={() => setCleanup(!cleanup)}
                  className={cn(
                    'h-9 w-full rounded-md border text-sm font-medium transition-colors',
                    cleanup
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-secondary/50 text-muted-foreground border-border'
                  )}
                >
                  {cleanup ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            </div>

            {/* Run button */}
            <Button
              onClick={runBenchmark}
              disabled={running || selectedOps.size === 0}
              size="lg"
              className="w-full"
            >
              {running ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Running benchmarks...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Run Benchmark
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Error */}
        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-4 w-4" />
                <p className="text-sm">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading */}
        {running && (
          <Card>
            <CardContent className="py-12">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Running benchmarks...</p>
                <p className="text-xs text-muted-foreground">
                  {selectedOps.size} operation(s) x {iterations} iterations
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {result && !running && (
          <>
            {/* Summary bar */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <Timer className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Total Elapsed</p>
                      <p className="text-lg font-semibold">{result.total_elapsed_ms.toFixed(0)} ms</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Total Operations</p>
                      <p className="text-lg font-semibold">{totalOps.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Operations Tested</p>
                      <p className="text-lg font-semibold">{result.results.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Results table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-2 pr-4 text-xs font-medium text-muted-foreground">Operation</th>
                        <th className="pb-2 pr-4 text-xs font-medium text-muted-foreground text-right">Iters</th>
                        <th className="pb-2 pr-4 text-xs font-medium text-muted-foreground text-right">Total (ms)</th>
                        <th className="pb-2 pr-4 text-xs font-medium text-muted-foreground text-right">Avg Latency</th>
                        <th className="pb-2 pr-4 text-xs font-medium text-muted-foreground text-right">P50</th>
                        <th className="pb-2 pr-4 text-xs font-medium text-muted-foreground text-right">P95</th>
                        <th className="pb-2 pr-4 text-xs font-medium text-muted-foreground text-right">P99</th>
                        <th className="pb-2 pr-4 text-xs font-medium text-muted-foreground text-right">Ops/sec</th>
                        <th className="pb-2 text-xs font-medium text-muted-foreground text-right">Errors</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.results.map((row: BenchmarkOpResult) => (
                        <tr
                          key={row.operation}
                          className={cn(
                            'border-b last:border-0',
                            latencyBgColor(row.latency.avg_us)
                          )}
                        >
                          <td className="py-2.5 pr-4 font-medium">{row.operation}</td>
                          <td className="py-2.5 pr-4 text-right tabular-nums">{row.iterations}</td>
                          <td className="py-2.5 pr-4 text-right tabular-nums">{row.total_ms.toFixed(1)}</td>
                          <td className={cn('py-2.5 pr-4 text-right tabular-nums font-medium', latencyColor(row.latency.avg_us))}>
                            {formatUs(row.latency.avg_us)}
                          </td>
                          <td className="py-2.5 pr-4 text-right tabular-nums text-muted-foreground">
                            {formatUs(row.latency.p50_us)}
                          </td>
                          <td className="py-2.5 pr-4 text-right tabular-nums text-muted-foreground">
                            {formatUs(row.latency.p95_us)}
                          </td>
                          <td className="py-2.5 pr-4 text-right tabular-nums text-muted-foreground">
                            {formatUs(row.latency.p99_us)}
                          </td>
                          <td className="py-2.5 pr-4 text-right tabular-nums font-medium">
                            {row.ops_per_second.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </td>
                          <td className="py-2.5 text-right tabular-nums">
                            {row.errors > 0 ? (
                              <Badge variant="destructive" className="text-[10px]">{row.errors}</Badge>
                            ) : (
                              <span className="text-green-400">0</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Legend */}
                <div className="mt-4 flex items-center gap-4 text-[10px] text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <span className="inline-block w-2 h-2 rounded-full bg-green-400" />
                    {'< 1ms avg'}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="inline-block w-2 h-2 rounded-full bg-yellow-400" />
                    1ms - 10ms avg
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="inline-block w-2 h-2 rounded-full bg-red-400" />
                    {'> 10ms avg'}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* System info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">System Info</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground font-medium">Before / After</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Memories:</span>
                        <span className="tabular-nums">
                          {result.system_info.memories_before} → {result.system_info.memories_after}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Entities:</span>
                        <span className="tabular-nums">
                          {result.system_info.entities_before} → {result.system_info.entities_after}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground font-medium">Embedding</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Provider:</span>
                        <span>{result.system_info.embedding_provider}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Model:</span>
                        <span className="truncate ml-2">{result.system_info.embedding_model}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
