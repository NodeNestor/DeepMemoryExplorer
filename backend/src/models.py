"""API request/response models for all endpoints."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Memory search
# ---------------------------------------------------------------------------

class MemorySearchRequest(BaseModel):
    query: str
    agent_id: str | None = None
    user_id: str | None = None
    tags: list[str] = Field(default_factory=list)
    limit: int = 10
    include_graph: bool = False


class MemorySearchResponse(BaseModel):
    memories: list[dict] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Graph
# ---------------------------------------------------------------------------

class GraphTraverseRequest(BaseModel):
    entity_id: int | None = None
    entity_name: str | None = None
    depth: int = 2


class GraphNode(BaseModel):
    id: int
    name: str
    entity_type: str
    description: str | None = None
    val: int = 1  # relationship count, used by react-force-graph for node size


class GraphLink(BaseModel):
    source: int
    target: int
    relation_type: str
    description: str | None = None
    weight: float = 1.0


class GraphResponse(BaseModel):
    nodes: list[GraphNode] = Field(default_factory=list)
    links: list[GraphLink] = Field(default_factory=list)


class EntitySearchRequest(BaseModel):
    query: str | None = None
    limit: int = 50


# ---------------------------------------------------------------------------
# Chat
# ---------------------------------------------------------------------------

class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = Field(default_factory=list)
    mode: Literal["rag", "agent"] = "rag"
    max_iterations: int | None = None


# ---------------------------------------------------------------------------
# Analysis
# ---------------------------------------------------------------------------

class AnalysisRequest(BaseModel):
    memory_ids: list[int]
    action: Literal["summarize", "contradictions", "explain", "custom"] = "summarize"
    custom_prompt: str | None = None


class AnalysisResponse(BaseModel):
    result: str
    memory_ids: list[int]


# ---------------------------------------------------------------------------
# Settings
# ---------------------------------------------------------------------------

class SettingsUpdate(BaseModel):
    hivemind_url: str | None = None
    llm_api_url: str | None = None
    llm_model: str | None = None
    llm_api_key: str | None = None
    llm_max_tokens: int | None = None
    agent_max_iterations: int | None = None


# ---------------------------------------------------------------------------
# Benchmark
# ---------------------------------------------------------------------------

class BenchmarkRunRequest(BaseModel):
    operations: list[str] | None = None
    iterations: int = 100
    concurrency: int = 1
    cleanup: bool = True


class LatencyStats(BaseModel):
    min_us: float = 0
    max_us: float = 0
    avg_us: float = 0
    p50_us: float = 0
    p95_us: float = 0
    p99_us: float = 0


class BenchmarkOperationResult(BaseModel):
    operation: str
    iterations: int = 0
    total_ms: float = 0
    latency: LatencyStats = Field(default_factory=LatencyStats)
    ops_per_second: float = 0
    errors: int = 0


class BenchmarkSystemInfo(BaseModel):
    memories_before: int = 0
    memories_after: int = 0
    entities_before: int = 0
    entities_after: int = 0
    embedding_provider: str = ""
    embedding_model: str = ""


class BenchmarkRunResponse(BaseModel):
    results: list[BenchmarkOperationResult] = Field(default_factory=list)
    system_info: BenchmarkSystemInfo = Field(default_factory=BenchmarkSystemInfo)
    total_elapsed_ms: float = 0


# ---------------------------------------------------------------------------
# Bulk Search
# ---------------------------------------------------------------------------

class BulkSearchQuery(BaseModel):
    query: str
    tags: list[str] = Field(default_factory=list)
    limit: int = 10


class BulkSearchRequest(BaseModel):
    queries: list[BulkSearchQuery] = Field(default_factory=list)
    max_concurrent: int = 10


class BulkSearchResultItem(BaseModel):
    query_index: int
    query: str
    results: list[dict] = Field(default_factory=list)
    error: str | None = None


class BulkSearchResponse(BaseModel):
    results: list[BulkSearchResultItem] = Field(default_factory=list)
    total_results: int = 0
    elapsed_ms: int = 0


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

class HealthResponse(BaseModel):
    hivemind: str
    llm: str
    hivemind_stats: dict | None = None
