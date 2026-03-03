"""Memory browsing and management endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from ..dependencies import get_hivemind_client
from ..hivemind import HiveMindClient
from ..models import MemorySearchRequest

router = APIRouter(prefix="/api/memories", tags=["memories"])


@router.post("/search")
async def search_memories(
    req: MemorySearchRequest,
    hm: HiveMindClient = Depends(get_hivemind_client),
):
    results = await hm.search(
        query=req.query,
        limit=req.limit,
        tags=req.tags if req.tags else None,
        include_graph=req.include_graph,
        agent_id=req.agent_id,
        user_id=req.user_id,
    )
    return [r.model_dump(mode="json") for r in results]


@router.get("/{memory_id}")
async def get_memory(
    memory_id: int,
    hm: HiveMindClient = Depends(get_hivemind_client),
):
    memory = await hm.get_memory(memory_id)
    if not memory:
        raise HTTPException(status_code=404, detail="Memory not found")
    return memory.model_dump(mode="json")


@router.get("/{memory_id}/history")
async def get_memory_history(
    memory_id: int,
    hm: HiveMindClient = Depends(get_hivemind_client),
):
    history = await hm.get_memory_history(memory_id)
    return history


@router.delete("/{memory_id}")
async def delete_memory(
    memory_id: int,
    hm: HiveMindClient = Depends(get_hivemind_client),
):
    ok = await hm.delete_memory(memory_id, reason="User deleted via explorer", changed_by="explorer-user")
    if not ok:
        raise HTTPException(status_code=404, detail="Memory not found or already invalidated")
    return {"status": "deleted", "id": memory_id}
