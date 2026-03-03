"""Memory analysis endpoints -- LLM-powered summarization, contradiction detection, etc."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException

from ..dependencies import get_hivemind_client, get_llm_client
from ..hivemind import HiveMindClient
from ..llm import LLMClient
from ..models import AnalysisRequest, AnalysisResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/analysis", tags=["analysis"])


async def _fetch_memories_text(memory_ids: list[int], hm: HiveMindClient) -> str:
    """Fetch memories and format them as numbered text for LLM context."""
    parts = []
    for mid in memory_ids:
        mem = await hm.get_memory(mid)
        if mem:
            tags = ", ".join(mem.tags) if mem.tags else "none"
            parts.append(f"[mem:{mem.id}] (tags: {tags})\n{mem.content}")
    if not parts:
        raise HTTPException(status_code=404, detail="No valid memories found for the given IDs")
    return "\n\n---\n\n".join(parts)


@router.post("/summarize", response_model=AnalysisResponse)
async def summarize(
    req: AnalysisRequest,
    hm: HiveMindClient = Depends(get_hivemind_client),
    llm: LLMClient = Depends(get_llm_client),
):
    context = await _fetch_memories_text(req.memory_ids, hm)
    messages = [
        {
            "role": "system",
            "content": "You are an expert research analyst. Summarize the following memories "
            "into a clear, well-structured summary. Cite specific memories using [mem:ID] format.",
        },
        {"role": "user", "content": context},
    ]
    result = await llm.complete(messages)
    return AnalysisResponse(result=result, memory_ids=req.memory_ids)


@router.post("/contradictions", response_model=AnalysisResponse)
async def find_contradictions(
    req: AnalysisRequest,
    hm: HiveMindClient = Depends(get_hivemind_client),
    llm: LLMClient = Depends(get_llm_client),
):
    context = await _fetch_memories_text(req.memory_ids, hm)
    messages = [
        {
            "role": "system",
            "content": "You are an expert fact-checker. Analyze the following memories and identify "
            "any contradictions, inconsistencies, or conflicting claims between them. "
            "Cite specific memories using [mem:ID] format. If no contradictions are found, say so.",
        },
        {"role": "user", "content": context},
    ]
    result = await llm.complete(messages)
    return AnalysisResponse(result=result, memory_ids=req.memory_ids)


@router.post("/explain", response_model=AnalysisResponse)
async def explain_relationships(
    req: AnalysisRequest,
    hm: HiveMindClient = Depends(get_hivemind_client),
    llm: LLMClient = Depends(get_llm_client),
):
    context = await _fetch_memories_text(req.memory_ids, hm)
    messages = [
        {
            "role": "system",
            "content": "You are an expert research analyst. Explain the relationships and connections "
            "between the following memories. How do they relate to each other? What themes or patterns "
            "emerge? Cite specific memories using [mem:ID] format.",
        },
        {"role": "user", "content": context},
    ]
    result = await llm.complete(messages)
    return AnalysisResponse(result=result, memory_ids=req.memory_ids)


@router.post("/custom", response_model=AnalysisResponse)
async def custom_analysis(
    req: AnalysisRequest,
    hm: HiveMindClient = Depends(get_hivemind_client),
    llm: LLMClient = Depends(get_llm_client),
):
    if not req.custom_prompt:
        raise HTTPException(status_code=400, detail="custom_prompt is required for custom analysis")
    context = await _fetch_memories_text(req.memory_ids, hm)
    messages = [
        {
            "role": "system",
            "content": f"{req.custom_prompt}\n\nCite specific memories using [mem:ID] format.",
        },
        {"role": "user", "content": context},
    ]
    result = await llm.complete(messages)
    return AnalysisResponse(result=result, memory_ids=req.memory_ids)
