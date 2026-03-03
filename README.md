# Deep Memory Explorer

A knowledge graph IDE for [HiveMindDB](https://github.com/YOUR_USERNAME/HiveMindDB). Search memories, visualize entity graphs, chat with your knowledge base using RAG or autonomous agents, watch events arrive in real-time, run benchmarks, and inspect system internals -- all from one interface.

Works with any OpenAI-compatible LLM provider (CodeGate, vLLM, Ollama, OpenAI, etc.).

![License](https://img.shields.io/badge/license-MIT-blue.svg)

## Features

- **Memory Search + Analysis** -- Hybrid semantic/keyword search with tag filters. Select memories and run LLM analysis: summarize, find contradictions, explain relationships, or custom prompts.
- **Interactive Graph** -- Force-directed entity graph powered by `react-force-graph-2d`. Click to inspect, double-click to expand, filter by type, adjust traversal depth.
- **Chat (RAG + Agentic)** -- Two modes. Simple RAG injects search results as context. Agentic mode gives the LLM tools to autonomously search, traverse, and explore your knowledge graph across multiple iterations before answering.
- **Real-time Feed** -- WebSocket proxy fans out HiveMindDB events to all connected tabs. Pause, resume, inspect payloads.
- **Benchmarks** -- Run write, bulk write, keyword search, semantic search, entity creation, and graph traversal benchmarks with configurable iterations and concurrency. Results include latency percentiles (p50/p95/p99) and ops/sec.
- **System Introspection** -- View HiveMindDB configuration, topology, health subsystems (embedding, memory store, knowledge graph, tasks, websocket, inverted index).
- **MCP Server** -- Expose all capabilities as MCP tools for Claude Code and other AI agents via stdio.
- **REST API** -- Every feature is available as a JSON API endpoint.

## Quick Start

### Docker (recommended)

```bash
cp .env.example .env
# Edit .env with your HiveMindDB and LLM endpoints
docker compose up -d
```

Open http://localhost:3000.

### Local Development

**Backend:**

```bash
cd backend
pip install -e .
python -m backend.src
```

**Frontend:**

```bash
cd frontend
npm install
npm run dev
```

Frontend dev server runs on http://localhost:5173 with API proxy to the backend on port 3000.

## Configuration

All settings can be configured via environment variables, `.env` file, or the Settings page in the UI (persisted to localStorage and synced to the backend at runtime).

| Variable | Default | Description |
|----------|---------|-------------|
| `HIVEMIND_URL` | `http://localhost:8100` | HiveMindDB instance URL |
| `LLM_API_URL` | `http://localhost:8989/v1` | OpenAI-compatible LLM endpoint (CodeGate default) |
| `LLM_MODEL` | `Qwen/Qwen3.5-0.8B` | Model name |
| `LLM_API_KEY` | *(empty)* | API key (optional for local providers) |
| `LLM_MAX_TOKENS` | `16384` | Max tokens for LLM responses |
| `APP_PORT` | `3000` | Port for the web UI and API |
| `AGENT_MAX_ITERATIONS` | `10` | Default max tool-call loops for agentic chat |

### LLM Provider Examples

Any OpenAI-compatible endpoint works. Set `LLM_API_URL` accordingly:

| Provider | URL |
|----------|-----|
| **CodeGate** (default) | `http://localhost:8989/v1` |
| vLLM | `http://localhost:8000/v1` |
| Ollama | `http://localhost:11434/v1` |
| OpenAI | `https://api.openai.com/v1` |
| LM Studio | `http://localhost:1234/v1` |

## Architecture

```
Browser (:3000)                          External Agents
  |                                          |
  +- /api/memories/*  --+                    +- REST API (same endpoints)
  +- /api/graph/*     --+                    |
  +- /api/chat        --+-- FastAPI -+--> HiveMindDB (:8100)
  +- /api/chat/agent  --+           +--> LLM (any OpenAI-compat)
  +- /api/analysis/*  --+
  +- /api/benchmark/* --+
  +- /api/system/*    --+
  +- /ws              --+-- WS proxy --> HiveMindDB /ws
  +- /* (SPA)         --+-- static files

  MCP (stdio) -- same tools as REST, for Claude Code / AI agents
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/memories/search` | POST | Search memories with filters |
| `/api/memories/{id}` | GET | Get a single memory |
| `/api/memories/{id}/history` | GET | Memory edit history |
| `/api/memories/{id}` | DELETE | Soft-delete a memory |
| `/api/graph/traverse` | POST | Traverse entity graph, returns `{nodes, links}` |
| `/api/graph/entity/{id}` | GET | Get entity details |
| `/api/graph/entity/{id}/relationships` | GET | Entity relationships |
| `/api/graph/entities` | POST | List/search entities |
| `/api/chat` | POST | Simple RAG chat (SSE stream) |
| `/api/chat/agent` | POST | Agentic deep research chat (SSE stream) |
| `/api/analysis/summarize` | POST | Summarize selected memories |
| `/api/analysis/contradictions` | POST | Find contradictions |
| `/api/analysis/explain` | POST | Explain relationships |
| `/api/analysis/custom` | POST | Custom LLM prompt over memories |
| `/api/benchmark/run` | POST | Run performance benchmarks |
| `/api/benchmark/search` | POST | Bulk concurrent search |
| `/api/system/config` | GET | HiveMindDB configuration |
| `/api/system/topology` | GET | Node topology |
| `/api/system/health` | GET | Detailed health status |
| `/api/system/embedding` | GET | Embedding model info |
| `/api/config` | GET/PUT | App settings |
| `/api/health` | GET | Connection health check |
| `/ws` | WS | Real-time event stream |

## MCP Server

Run as an MCP tool server for Claude Code or any MCP-compatible client:

```bash
python -m backend.src mcp
```

**Available tools:** `memory_search`, `memory_analyze`, `graph_explore`, `deep_research_chat`, `health_check`, `bulk_search`, `run_benchmark`, `system_info`

### Claude Code Integration

Add to your MCP config:

```json
{
  "mcpServers": {
    "deep-memory-explorer": {
      "command": "python",
      "args": ["-m", "backend.src", "mcp"],
      "cwd": "/path/to/deep-memory-explorer"
    }
  }
}
```

## Agentic Chat

The agentic mode gives the LLM a toolkit to autonomously explore HiveMindDB:

| Tool | Description |
|------|-------------|
| `memory_search` | Search memories by query and tags |
| `entity_lookup` | Find an entity by name |
| `graph_traverse` | Explore entity neighborhood |
| `get_memory` | Read a full memory by ID |
| `get_relationships` | List entity connections |
| `done` | Return final answer with citations |

The agent loops (up to `AGENT_MAX_ITERATIONS`, configurable per-request) until it has enough context, then streams the final answer. Each step is visible in the UI as collapsible "Research Steps".

## Project Structure

```
deep-memory-explorer/
+-- backend/
|   +-- src/
|   |   +-- main.py              # FastAPI app, lifespan, WS endpoint
|   |   +-- config.py            # Pydantic settings + mutable RuntimeConfig
|   |   +-- models.py            # Request/response models
|   |   +-- dependencies.py      # FastAPI Depends factories
|   |   +-- hivemind/
|   |   |   +-- client.py        # HiveMindDB async REST client
|   |   |   +-- models.py        # HiveMindDB data models
|   |   +-- llm/
|   |   |   +-- client.py        # OpenAI-compatible LLM client
|   |   +-- routers/
|   |   |   +-- memories.py      # Search, get, history, delete
|   |   |   +-- graph.py         # Entities, relationships, traverse
|   |   |   +-- chat.py          # Simple RAG (SSE)
|   |   |   +-- agent.py         # Agentic deep research (SSE)
|   |   |   +-- analysis.py      # LLM analysis endpoints
|   |   |   +-- benchmark.py     # Performance benchmarks
|   |   |   +-- system.py        # System introspection
|   |   |   +-- settings.py      # Config CRUD + health
|   |   +-- ws/
|   |   |   +-- proxy.py         # WS fan-out proxy
|   |   +-- mcp/
|   |       +-- server.py        # MCP tool definitions
|   +-- pyproject.toml
|   +-- Dockerfile
+-- frontend/
|   +-- src/
|   |   +-- pages/               # 7 pages (Memories, Graph, Chat, Feed, Benchmark, System, Settings)
|   |   +-- components/          # UI, layout, feature components
|   |   +-- stores/              # Zustand stores (settings, feed, graph)
|   |   +-- lib/                 # API client, WebSocket, utilities
|   +-- package.json
|   +-- vite.config.ts
|   +-- tailwind.config.ts
+-- docker-compose.yml
+-- .env.example
+-- LICENSE
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, shadcn/ui-style components, Zustand, react-force-graph-2d |
| Backend | Python 3.12, FastAPI, httpx, Pydantic, SSE (sse-starlette) |
| Graph Viz | react-force-graph-2d (d3-force canvas, handles ~2000 nodes) |
| Deploy | Docker multi-stage build (Node + Python) |
| MCP | mcp SDK (stdio transport) |

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a Pull Request

## License

[MIT](LICENSE)
