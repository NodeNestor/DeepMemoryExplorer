export interface Memory {
  id: number
  content: string
  memory_type: string
  agent_id?: string
  user_id?: string
  confidence: number
  tags: string[]
  created_at: string
  updated_at: string
  source: string
  metadata: Record<string, any>
}

export interface SearchHit {
  memory: Memory
  score: number
  related_entities: Entity[]
  related_relationships: any[]
}

export interface Entity {
  id: number
  name: string
  entity_type: string
  description?: string
  created_at: string
  metadata: Record<string, any>
}

export interface GraphNode {
  id: number
  name: string
  entity_type: string
  description?: string
  val: number
}

export interface GraphLink {
  source: number
  target: number
  relation_type: string
  description?: string
  weight: number
}

export interface GraphData {
  nodes: GraphNode[]
  links: GraphLink[]
}

export interface HealthStatus {
  hivemind: string
  llm: string
  hivemind_stats?: {
    total_memories: number
    total_entities: number
    total_relationships: number
  }
}

export interface AppConfig {
  hivemind_url: string
  llm_api_url: string
  llm_model: string
  llm_api_key: string
  llm_max_tokens: number
  agent_max_iterations: number
}

export interface MemoryHistory {
  id: number
  memory_id: number
  operation: string
  old_content?: string
  new_content: string
  reason: string
  changed_by: string
  timestamp: string
}

export interface BenchmarkRequest {
  operations?: string[]
  iterations?: number
  concurrency?: number
  cleanup?: boolean
}

export interface LatencyStats {
  min_us: number
  max_us: number
  avg_us: number
  p50_us: number
  p95_us: number
  p99_us: number
}

export interface BenchmarkOpResult {
  operation: string
  iterations: number
  total_ms: number
  latency: LatencyStats
  ops_per_second: number
  errors: number
}

export interface BenchmarkResponse {
  results: BenchmarkOpResult[]
  system_info: {
    memories_before: number
    memories_after: number
    entities_before: number
    entities_after: number
    embedding_provider: string
    embedding_model: string
  }
  total_elapsed_ms: number
}

export interface SystemConfig {
  listen_addr: string
  data_dir: string
  embedding_model: string
  embedding_pool_size: number
  llm_provider: string
  llm_model: string
  snapshot_interval: number
  replication_enabled: boolean
}

export interface SystemTopology {
  node_id: string
  listen_addr: string
  rtdb_url: string
  replication_enabled: boolean
  role: string
}

export interface SystemHealth {
  status: string
  uptime_seconds: number
  embedding: {
    available: boolean
    provider: string
    model: string
    indexed_count: number
    dimensions: number
    pool_size: number
  }
  inverted_index: { unique_words: number }
  memory_store: {
    total_memories: number
    valid_memories: number
    invalidated_memories: number
    history_entries: number
  }
  knowledge_graph: {
    entities: number
    relationships: number
  }
  tasks: {
    total: number
    pending: number
    in_progress: number
    completed: number
    failed: number
  }
  websocket: { active_connections: number }
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`)
  return res.json()
}

export const api = {
  // Memories
  searchMemories: (
    query: string,
    opts?: { tags?: string[]; limit?: number; agent_id?: string; user_id?: string }
  ) =>
    fetchJson<SearchHit[]>('/api/memories/search', {
      method: 'POST',
      body: JSON.stringify({ query, ...opts }),
    }),

  getMemory: (id: number) => fetchJson<Memory>(`/api/memories/${id}`),

  getMemoryHistory: (id: number) =>
    fetchJson<MemoryHistory[]>(`/api/memories/${id}/history`),

  deleteMemory: (id: number, reason: string) =>
    fetchJson<Memory>(`/api/memories/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason, changed_by: 'explorer-ui' }),
    }),

  // Graph
  traverseGraph: (params: {
    entity_id?: number
    entity_name?: string
    depth?: number
  }) =>
    fetchJson<GraphData>('/api/graph/traverse', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  getFullGraph: (opts?: { depth?: number; max_nodes?: number }) => {
    const params = new URLSearchParams()
    if (opts?.depth) params.set('depth', String(opts.depth))
    if (opts?.max_nodes) params.set('max_nodes', String(opts.max_nodes))
    const qs = params.toString()
    return fetchJson<GraphData>(`/api/graph/full${qs ? `?${qs}` : ''}`)
  },

  getEntity: (id: number) => fetchJson<Entity>(`/api/graph/entity/${id}`),

  getEntityRelationships: (id: number) =>
    fetchJson<any[]>(`/api/graph/entity/${id}/relationships`),

  listEntities: (query?: string, limit?: number) =>
    fetchJson<Entity[]>('/api/graph/entities', {
      method: 'POST',
      body: JSON.stringify({ query, limit }),
    }),

  // Analysis
  summarize: (memoryIds: number[]) =>
    fetchJson<{ result: string }>('/api/analysis/summarize', {
      method: 'POST',
      body: JSON.stringify({ memory_ids: memoryIds }),
    }),

  contradictions: (memoryIds: number[]) =>
    fetchJson<{ result: string }>('/api/analysis/contradictions', {
      method: 'POST',
      body: JSON.stringify({ memory_ids: memoryIds }),
    }),

  explain: (memoryIds: number[]) =>
    fetchJson<{ result: string }>('/api/analysis/explain', {
      method: 'POST',
      body: JSON.stringify({ memory_ids: memoryIds }),
    }),

  customAnalysis: (memoryIds: number[], prompt: string) =>
    fetchJson<{ result: string }>('/api/analysis/custom', {
      method: 'POST',
      body: JSON.stringify({ memory_ids: memoryIds, prompt }),
    }),

  // Settings
  getConfig: () => fetchJson<AppConfig>('/api/config'),

  updateConfig: (config: Partial<AppConfig>) =>
    fetchJson<AppConfig>('/api/config', {
      method: 'PUT',
      body: JSON.stringify(config),
    }),

  getHealth: () => fetchJson<HealthStatus>('/api/health'),

  // Benchmark
  runBenchmark: (req: BenchmarkRequest) =>
    fetchJson<BenchmarkResponse>('/api/benchmark/run', {
      method: 'POST',
      body: JSON.stringify(req),
    }),

  bulkSearch: (queries: Array<{ query: string; limit?: number }>, maxConcurrent?: number) =>
    fetchJson<any>('/api/benchmark/search', {
      method: 'POST',
      body: JSON.stringify({ queries, max_concurrent: maxConcurrent }),
    }),

  // System
  getSystemConfig: () => fetchJson<SystemConfig>('/api/system/config'),
  getSystemTopology: () => fetchJson<SystemTopology>('/api/system/topology'),
  getSystemHealth: () => fetchJson<SystemHealth>('/api/system/health'),
  getSystemEmbedding: () => fetchJson<any>('/api/system/embedding'),
}

export async function* streamChat(
  endpoint: '/api/chat' | '/api/chat/agent',
  body: {
    message: string
    history?: Array<{ role: string; content: string }>
    max_iterations?: number
  }
): AsyncGenerator<{ event: string; data: any }> {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`)

  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    const lines = buffer.split('\n')
    buffer = lines.pop()!

    let currentEvent = 'message'
    for (const line of lines) {
      if (line.startsWith('event: ')) {
        currentEvent = line.slice(7).trim()
      } else if (line.startsWith('data: ')) {
        const data = line.slice(6)
        try {
          yield { event: currentEvent, data: JSON.parse(data) }
        } catch {
          yield { event: currentEvent, data }
        }
        currentEvent = 'message'
      }
    }
  }
}
