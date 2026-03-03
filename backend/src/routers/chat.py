"""RAG chat endpoint -- searches HiveMindDB then streams LLM response."""

from __future__ import annotations

import json
import logging

from fastapi import APIRouter, Depends, Request
from starlette.responses import StreamingResponse

from ..dependencies import get_hivemind_client, get_llm_client
from ..hivemind import HiveMindClient
from ..llm import LLMClient
from ..models import ChatRequest

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chat", tags=["chat"])

_RAG_SYSTEM_PROMPT = """You are a helpful research assistant with access to a knowledge graph database. \
Below are relevant memories retrieved from past research sessions. Use them to answer the user's question \
accurately and thoroughly.

When referencing information from a specific memory, cite it using [mem:ID] format (e.g. [mem:42]).

If the retrieved memories don't contain relevant information, say so honestly rather than making things up.

---
RETRIEVED MEMORIES:
{context}
---"""


@router.post("")
async def rag_chat(
    req: ChatRequest,
    request: Request,
    hm: HiveMindClient = Depends(get_hivemind_client),
    llm: LLMClient = Depends(get_llm_client),
):
    async def event_stream():
        # Step 1: Search HiveMindDB
        results = await hm.search(query=req.message, limit=12, include_graph=True)

        # Step 2: Emit sources event
        sources = [r.model_dump(mode="json") for r in results]
        yield f"event: sources\ndata: {json.dumps(sources, default=str)}\n\n"

        # Step 3: Build context from memories
        context_parts = []
        for r in results:
            mem = r.memory
            tags_str = ", ".join(mem.tags) if mem.tags else "none"
            context_parts.append(
                f"[mem:{mem.id}] (score: {r.score:.2f}, tags: {tags_str})\n{mem.content}"
            )
        context = "\n\n".join(context_parts) if context_parts else "(No relevant memories found)"

        # Step 4: Build messages
        system_prompt = _RAG_SYSTEM_PROMPT.format(context=context)
        messages: list[dict] = [{"role": "system", "content": system_prompt}]
        for msg in req.history:
            messages.append({"role": msg.role, "content": msg.content})
        messages.append({"role": "user", "content": req.message})

        # Step 5: Stream LLM response
        try:
            async for token in llm.stream_complete(messages):
                yield f"event: token\ndata: {json.dumps(token)}\n\n"
        except Exception as exc:
            logger.error("LLM streaming failed: %s", exc)
            yield f"event: error\ndata: {json.dumps(str(exc))}\n\n"

        # Step 6: Done
        yield "event: done\ndata: {}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
