"""Pydantic models for HiveMindDB API requests and responses."""

from __future__ import annotations

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class MemoryType(str, Enum):
    FACT = "fact"
    EPISODIC = "episodic"
    PROCEDURAL = "procedural"
    SEMANTIC = "semantic"


# ---------------------------------------------------------------------------
# Memory models
# ---------------------------------------------------------------------------

class MemoryCreate(BaseModel):
    content: str
    memory_type: MemoryType = MemoryType.FACT
    agent_id: str | None = None
    user_id: str | None = None
    session_id: str | None = None
    tags: list[str] = Field(default_factory=list)
    metadata: dict = Field(default_factory=dict)


class MemoryResponse(BaseModel):
    id: int
    content: str
    memory_type: MemoryType
    agent_id: str | None = None
    user_id: str | None = None
    session_id: str | None = None
    confidence: float = 0.9
    tags: list[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime
    valid_from: datetime
    valid_until: datetime | None = None
    source: str = ""
    metadata: dict = Field(default_factory=dict)


class MemoryUpdate(BaseModel):
    content: str | None = None
    tags: list[str] | None = None
    confidence: float | None = None
    metadata: dict | None = None


# ---------------------------------------------------------------------------
# Search models
# ---------------------------------------------------------------------------

class SearchRequest(BaseModel):
    query: str
    agent_id: str | None = None
    user_id: str | None = None
    tags: list[str] = Field(default_factory=list)
    limit: int = 10
    include_graph: bool = False


class SearchResult(BaseModel):
    memory: MemoryResponse
    score: float
    related_entities: list[EntityResponse] = Field(default_factory=list)
    related_relationships: list[dict] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Entity models
# ---------------------------------------------------------------------------

class EntityCreate(BaseModel):
    name: str
    entity_type: str
    description: str | None = None
    agent_id: str | None = None
    metadata: dict = Field(default_factory=dict)


class EntityResponse(BaseModel):
    id: int
    name: str
    entity_type: str
    description: str | None = None
    agent_id: str | None = None
    created_at: datetime
    updated_at: datetime
    metadata: dict = Field(default_factory=dict)


# ---------------------------------------------------------------------------
# Relationship models
# ---------------------------------------------------------------------------

class RelationCreate(BaseModel):
    source_entity_id: int
    target_entity_id: int
    relation_type: str
    description: str | None = None
    weight: float = 1.0
    created_by: str = "deep-memory-explorer"
    metadata: dict = Field(default_factory=dict)


class RelationshipResponse(BaseModel):
    id: int
    source_entity_id: int
    target_entity_id: int
    relation_type: str
    description: str | None = None
    weight: float = 1.0
    created_by: str = ""
    created_at: datetime
    metadata: dict = Field(default_factory=dict)


# ---------------------------------------------------------------------------
# Graph traversal models
# ---------------------------------------------------------------------------

class GraphTraverseRequest(BaseModel):
    entity_id: int
    depth: int = 2


class GraphTraverseNode(BaseModel):
    entity: EntityResponse
    relationships: list[dict] = Field(default_factory=list)


class GraphTraverseResponse(BaseModel):
    nodes: list[GraphTraverseNode] = Field(default_factory=list)


# Forward-ref update (SearchResult references EntityResponse)
SearchResult.model_rebuild()
