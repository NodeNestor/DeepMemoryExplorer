"""Async REST client for HiveMindDB."""

from __future__ import annotations

import logging

import httpx

from .models import (
    EntityCreate,
    EntityResponse,
    GraphTraverseNode,
    GraphTraverseResponse,
    MemoryCreate,
    MemoryResponse,
    MemoryUpdate,
    RelationCreate,
    RelationshipResponse,
    SearchRequest,
    SearchResult,
)

logger = logging.getLogger(__name__)


class HiveMindClient:
    """Async client for the HiveMindDB REST API."""

    def __init__(self, base_url: str) -> None:
        self.base_url = base_url.rstrip("/")
        self._client = httpx.AsyncClient(
            base_url=self.base_url,
            timeout=httpx.Timeout(30.0),
        )

    # ------------------------------------------------------------------
    # Health / Status
    # ------------------------------------------------------------------

    async def health(self) -> bool:
        try:
            resp = await self._client.get("/health")
            return resp.status_code == 200
        except httpx.HTTPError:
            return False

    async def get_status(self) -> dict | None:
        try:
            resp = await self._client.get("/api/v1/status")
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPError as exc:
            logger.warning("get_status failed: %s", exc)
            return None

    # ------------------------------------------------------------------
    # Memories
    # ------------------------------------------------------------------

    async def create_memory(self, memory: MemoryCreate) -> MemoryResponse | None:
        try:
            resp = await self._client.post(
                "/api/v1/memories",
                json=memory.model_dump(mode="json"),
            )
            resp.raise_for_status()
            return MemoryResponse.model_validate(resp.json())
        except httpx.HTTPError as exc:
            logger.warning("create_memory failed: %s", exc)
            return None

    async def get_memory(self, memory_id: int) -> MemoryResponse | None:
        try:
            resp = await self._client.get(f"/api/v1/memories/{memory_id}")
            if resp.status_code == 404:
                return None
            resp.raise_for_status()
            return MemoryResponse.model_validate(resp.json())
        except httpx.HTTPError as exc:
            logger.warning("get_memory(%d) failed: %s", memory_id, exc)
            return None

    async def list_memories(
        self,
        agent_id: str | None = None,
        user_id: str | None = None,
        include_invalidated: bool = False,
    ) -> list[MemoryResponse]:
        try:
            params: dict[str, str] = {}
            if agent_id:
                params["agent_id"] = agent_id
            if user_id:
                params["user_id"] = user_id
            if include_invalidated:
                params["include_invalidated"] = "true"
            resp = await self._client.get("/api/v1/memories", params=params)
            resp.raise_for_status()
            return [MemoryResponse.model_validate(m) for m in resp.json()]
        except httpx.HTTPError as exc:
            logger.warning("list_memories failed: %s", exc)
            return []

    async def update_memory(
        self, memory_id: int, update: MemoryUpdate
    ) -> MemoryResponse | None:
        try:
            resp = await self._client.put(
                f"/api/v1/memories/{memory_id}",
                json=update.model_dump(mode="json", exclude_none=True),
            )
            if resp.status_code == 404:
                return None
            resp.raise_for_status()
            return MemoryResponse.model_validate(resp.json())
        except httpx.HTTPError as exc:
            logger.warning("update_memory(%d) failed: %s", memory_id, exc)
            return None

    async def delete_memory(
        self, memory_id: int, reason: str = "", changed_by: str = "user"
    ) -> bool:
        try:
            resp = await self._client.delete(
                f"/api/v1/memories/{memory_id}",
                json={"reason": reason, "changed_by": changed_by},
            )
            return resp.status_code == 200
        except httpx.HTTPError as exc:
            logger.warning("delete_memory(%d) failed: %s", memory_id, exc)
            return False

    async def get_memory_history(self, memory_id: int) -> list[dict]:
        try:
            resp = await self._client.get(f"/api/v1/memories/{memory_id}/history")
            if resp.status_code == 404:
                return []
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPError as exc:
            logger.warning("get_memory_history(%d) failed: %s", memory_id, exc)
            return []

    # ------------------------------------------------------------------
    # Search
    # ------------------------------------------------------------------

    async def search(
        self,
        query: str,
        limit: int = 10,
        tags: list[str] | None = None,
        include_graph: bool = False,
        agent_id: str | None = None,
        user_id: str | None = None,
    ) -> list[SearchResult]:
        try:
            req = SearchRequest(
                query=query,
                limit=limit,
                tags=tags or [],
                include_graph=include_graph,
                agent_id=agent_id,
                user_id=user_id,
            )
            resp = await self._client.post(
                "/api/v1/search",
                json=req.model_dump(mode="json"),
            )
            resp.raise_for_status()
            return [SearchResult.model_validate(r) for r in resp.json()]
        except httpx.HTTPError as exc:
            logger.warning("search failed: %s", exc)
            return []

    # ------------------------------------------------------------------
    # Entities
    # ------------------------------------------------------------------

    async def create_entity(self, entity: EntityCreate) -> EntityResponse | None:
        try:
            resp = await self._client.post(
                "/api/v1/entities",
                json=entity.model_dump(mode="json"),
            )
            resp.raise_for_status()
            return EntityResponse.model_validate(resp.json())
        except httpx.HTTPError as exc:
            logger.warning("create_entity failed: %s", exc)
            return None

    async def get_entity(self, entity_id: int) -> EntityResponse | None:
        try:
            resp = await self._client.get(f"/api/v1/entities/{entity_id}")
            if resp.status_code == 404:
                return None
            resp.raise_for_status()
            return EntityResponse.model_validate(resp.json())
        except httpx.HTTPError as exc:
            logger.warning("get_entity(%d) failed: %s", entity_id, exc)
            return None

    async def find_entity(self, name: str) -> EntityResponse | None:
        try:
            resp = await self._client.post(
                "/api/v1/entities/find",
                json={"name": name},
            )
            if resp.status_code == 404:
                return None
            resp.raise_for_status()
            return EntityResponse.model_validate(resp.json())
        except httpx.HTTPError as exc:
            logger.warning("find_entity(%s) failed: %s", name, exc)
            return None

    async def get_entity_relationships(
        self, entity_id: int
    ) -> list[tuple[dict, EntityResponse | None]]:
        try:
            resp = await self._client.get(
                f"/api/v1/entities/{entity_id}/relationships"
            )
            if resp.status_code == 404:
                return []
            resp.raise_for_status()
            results = []
            for item in resp.json():
                rel = item[0] if isinstance(item, list) else item.get("relationship", item)
                ent_data = item[1] if isinstance(item, list) else item.get("entity")
                ent = EntityResponse.model_validate(ent_data) if ent_data else None
                results.append((rel, ent))
            return results
        except httpx.HTTPError as exc:
            logger.warning("get_entity_relationships(%d) failed: %s", entity_id, exc)
            return []

    # ------------------------------------------------------------------
    # Relationships
    # ------------------------------------------------------------------

    async def create_relation(self, relation: RelationCreate) -> dict | None:
        try:
            resp = await self._client.post(
                "/api/v1/relationships",
                json=relation.model_dump(mode="json"),
            )
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPError as exc:
            logger.warning("create_relation failed: %s", exc)
            return None

    # ------------------------------------------------------------------
    # Graph Traversal
    # ------------------------------------------------------------------

    async def graph_traverse(
        self, entity_id: int, depth: int = 2
    ) -> GraphTraverseResponse:
        try:
            resp = await self._client.post(
                "/api/v1/graph/traverse",
                json={"entity_id": entity_id, "depth": depth},
            )
            resp.raise_for_status()
            raw = resp.json()
            nodes = [
                GraphTraverseNode(entity=item[0], relationships=item[1])
                for item in raw
            ]
            return GraphTraverseResponse(nodes=nodes)
        except httpx.HTTPError as exc:
            logger.warning("graph_traverse(%d) failed: %s", entity_id, exc)
            return GraphTraverseResponse()

    # ------------------------------------------------------------------
    # Bulk Operations
    # ------------------------------------------------------------------

    async def add_memories_bulk(
        self, memories: list[MemoryCreate]
    ) -> list[MemoryResponse]:
        try:
            resp = await self._client.post(
                "/api/v1/bulk/memories",
                json={"memories": [m.model_dump(mode="json") for m in memories]},
            )
            resp.raise_for_status()
            return [MemoryResponse.model_validate(m) for m in resp.json()]
        except httpx.HTTPError as exc:
            logger.warning("add_memories_bulk failed: %s", exc)
            return []

    async def search_bulk(
        self, queries: list[SearchRequest], max_concurrent: int = 10
    ) -> dict:
        try:
            resp = await self._client.post(
                "/api/v1/search/bulk",
                json={
                    "queries": [q.model_dump(mode="json") for q in queries],
                    "max_concurrent": max_concurrent,
                },
            )
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPError as exc:
            logger.warning("search_bulk failed: %s", exc)
            return {"results": [], "total_results": 0, "elapsed_ms": 0}

    # ------------------------------------------------------------------
    # Benchmark
    # ------------------------------------------------------------------

    async def run_benchmark(
        self,
        operations: list[str] | None = None,
        iterations: int = 100,
        concurrency: int = 1,
        cleanup: bool = True,
    ) -> dict:
        try:
            body: dict = {
                "iterations": iterations,
                "concurrency": concurrency,
                "cleanup": cleanup,
            }
            if operations is not None:
                body["operations"] = operations
            resp = await self._client.post(
                "/api/v1/benchmark/run",
                json=body,
                timeout=httpx.Timeout(300.0),
            )
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPError as exc:
            logger.warning("run_benchmark failed: %s", exc)
            return {}

    # ------------------------------------------------------------------
    # System Introspection
    # ------------------------------------------------------------------

    async def get_system_config(self) -> dict:
        try:
            resp = await self._client.get("/api/v1/system/config")
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPError as exc:
            logger.warning("get_system_config failed: %s", exc)
            return {}

    async def get_system_topology(self) -> dict:
        try:
            resp = await self._client.get("/api/v1/system/topology")
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPError as exc:
            logger.warning("get_system_topology failed: %s", exc)
            return {}

    async def get_system_health(self) -> dict:
        try:
            resp = await self._client.get("/api/v1/system/health")
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPError as exc:
            logger.warning("get_system_health failed: %s", exc)
            return {}

    async def get_system_embedding(self) -> dict:
        try:
            resp = await self._client.get("/api/v1/system/embedding")
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPError as exc:
            logger.warning("get_system_embedding failed: %s", exc)
            return {}

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    async def close(self) -> None:
        await self._client.aclose()
