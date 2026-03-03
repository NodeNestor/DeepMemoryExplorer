"""Agentic deep research chat -- LLM autonomously explores HiveMindDB via tool calls."""

from __future__ import annotations

import json
import logging

from fastapi import APIRouter, Depends, Request
from starlette.responses import StreamingResponse

from ..config import runtime_config
from ..dependencies import get_hivemind_client, get_llm_client
from ..hivemind import HiveMindClient
from ..llm import LLMClient
from ..models import ChatRequest

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chat", tags=["agent"])

_AGENT_SYSTEM_PROMPT = """You are a knowledge graph research agent. You have access to a HiveMindDB instance \
containing memories, entities, and relationships from past research sessions.

Your job is to thoroughly explore the knowledge graph to answer the user's question. You have these tools:

- memory_search: Search for memories by query and optional tags
- entity_lookup: Find an entity by name
- graph_traverse: Explore the graph neighborhood around an entity
- get_memory: Read the full content of a specific memory
- get_relationships: Get all relationships for an entity

Strategy:
1. Start by searching for memories related to the question
2. Look up relevant entities mentioned in those memories
3. Traverse the graph to discover connections
4. Read specific memories for detailed information
5. When you have enough context, call done() with your comprehensive answer

Always cite memories using [mem:ID] format. Be thorough -- explore multiple angles before answering.
Call done(answer="your answer here") when you're ready to give your final answer."""

AGENT_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "memory_search",
            "description": "Search for memories by semantic query and optional tag filter.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Search query"},
                    "tags": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Optional tag filters",
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Max results to return",
                        "default": 10,
                    },
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "entity_lookup",
            "description": "Find an entity by name.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "Entity name to look up"},
                },
                "required": ["name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "graph_traverse",
            "description": "Explore the graph neighborhood around an entity.",
            "parameters": {
                "type": "object",
                "properties": {
                    "entity_id": {"type": "integer", "description": "Entity ID to start from"},
                    "depth": {
                        "type": "integer",
                        "description": "Traversal depth",
                        "default": 2,
                    },
                },
                "required": ["entity_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_memory",
            "description": "Read the full content of a specific memory by ID.",
            "parameters": {
                "type": "object",
                "properties": {
                    "id": {"type": "integer", "description": "Memory ID"},
                },
                "required": ["id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_relationships",
            "description": "Get all relationships for an entity.",
            "parameters": {
                "type": "object",
                "properties": {
                    "entity_id": {"type": "integer", "description": "Entity ID"},
                },
                "required": ["entity_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "done",
            "description": "Return your final comprehensive answer with citations.",
            "parameters": {
                "type": "object",
                "properties": {
                    "answer": {
                        "type": "string",
                        "description": "Your final answer with [mem:ID] citations",
                    },
                },
                "required": ["answer"],
            },
        },
    },
]


async def _execute_tool(
    tool_name: str,
    args: dict,
    hm: HiveMindClient,
    memories_read: list[dict],
) -> str:
    """Execute a single agent tool and return JSON result string."""
    try:
        if tool_name == "memory_search":
            results = await hm.search(
                query=args["query"],
                tags=args.get("tags"),
                limit=args.get("limit", 10),
            )
            out = []
            for r in results:
                mem = r.memory
                memories_read.append(r.model_dump(mode="json"))
                out.append({
                    "id": mem.id,
                    "content": mem.content[:500],
                    "score": r.score,
                    "tags": mem.tags,
                })
            return json.dumps(out, default=str)

        elif tool_name == "entity_lookup":
            entity = await hm.find_entity(args["name"])
            if not entity:
                return json.dumps({"error": f"Entity '{args['name']}' not found"})
            return json.dumps(entity.model_dump(mode="json"), default=str)

        elif tool_name == "graph_traverse":
            graph = await hm.graph_traverse(
                entity_id=args["entity_id"],
                depth=args.get("depth", 2),
            )
            nodes = []
            for n in graph.nodes:
                nodes.append({
                    "entity": {
                        "id": n.entity.id,
                        "name": n.entity.name,
                        "type": n.entity.entity_type,
                        "description": n.entity.description,
                    },
                    "relationship_count": len(n.relationships),
                    "relationships": n.relationships[:10],
                })
            return json.dumps(nodes, default=str)

        elif tool_name == "get_memory":
            mem = await hm.get_memory(args["id"])
            if not mem:
                return json.dumps({"error": f"Memory {args['id']} not found"})
            mem_dict = mem.model_dump(mode="json")
            memories_read.append({"memory": mem_dict, "score": 1.0})
            return json.dumps(mem_dict, default=str)

        elif tool_name == "get_relationships":
            rels = await hm.get_entity_relationships(args["entity_id"])
            out = []
            for rel, ent in rels:
                out.append({
                    "relationship": rel,
                    "connected_entity": ent.model_dump(mode="json") if ent else None,
                })
            return json.dumps(out, default=str)

        else:
            return json.dumps({"error": f"Unknown tool: {tool_name}"})

    except Exception as exc:
        logger.error("Tool %s execution failed: %s", tool_name, exc)
        return json.dumps({"error": str(exc)})


@router.post("/agent", name="agent_chat")
async def agent_chat(
    req: ChatRequest,
    request: Request,
    hm: HiveMindClient = Depends(get_hivemind_client),
    llm: LLMClient = Depends(get_llm_client),
):
    # max_iterations from request body, then runtime config
    max_iterations = req.max_iterations or runtime_config.agent_max_iterations

    async def event_stream():
        memories_read: list[dict] = []

        # Build initial conversation
        conversation: list[dict] = [
            {"role": "system", "content": _AGENT_SYSTEM_PROMPT},
        ]
        for msg in req.history:
            conversation.append({"role": msg.role, "content": msg.content})
        conversation.append({"role": "user", "content": req.message})

        for iteration in range(max_iterations):
            try:
                response = await llm.complete_with_tools(
                    messages=conversation,
                    tools=AGENT_TOOLS,
                )
            except Exception as exc:
                logger.error("Agent LLM call failed at iteration %d: %s", iteration, exc)
                yield f"event: error\ndata: {json.dumps({'error': str(exc), 'iteration': iteration})}\n\n"
                yield "event: done\ndata: {}\n\n"
                return

            tool_calls = response.get("tool_calls")

            if not tool_calls:
                # Model responded with text directly
                content = response.get("content", "")
                if content:
                    # Emit any accumulated sources
                    if memories_read:
                        yield f"event: sources\ndata: {json.dumps(memories_read, default=str)}\n\n"
                    # Stream the text content as tokens
                    # Since we got it non-streaming, emit in one chunk
                    yield f"event: token\ndata: {json.dumps(content)}\n\n"
                yield "event: done\ndata: {}\n\n"
                return

            # Process tool calls
            # Append assistant message with tool calls to conversation
            conversation.append(response)

            for tc in tool_calls:
                fn_name = tc["function"]["name"]
                try:
                    fn_args = json.loads(tc["function"]["arguments"])
                except json.JSONDecodeError:
                    fn_args = {}
                tc_id = tc.get("id", f"call_{iteration}")

                yield f"event: tool_call\ndata: {json.dumps({'tool': fn_name, 'args': fn_args, 'iteration': iteration})}\n\n"

                # Handle done() tool
                if fn_name == "done":
                    answer = fn_args.get("answer", "")
                    if memories_read:
                        yield f"event: sources\ndata: {json.dumps(memories_read, default=str)}\n\n"
                    yield f"event: token\ndata: {json.dumps(answer)}\n\n"
                    yield "event: done\ndata: {}\n\n"
                    return

                # Execute tool
                result = await _execute_tool(fn_name, fn_args, hm, memories_read)

                # Truncate large results for the conversation context
                result_summary = result if len(result) < 4000 else result[:4000] + "...(truncated)"

                yield f"event: tool_result\ndata: {json.dumps({'tool': fn_name, 'result_preview': result_summary[:200]})}\n\n"

                # Append tool result to conversation
                conversation.append({
                    "role": "tool",
                    "tool_call_id": tc_id,
                    "content": result_summary,
                })

        # Max iterations reached
        yield f"event: max_iterations\ndata: {json.dumps({'iterations': max_iterations})}\n\n"

        # Final call without tools to get a summary
        try:
            conversation.append({
                "role": "user",
                "content": "You've reached the maximum number of exploration steps. "
                "Please provide your best answer based on what you've found so far. "
                "Cite memories with [mem:ID].",
            })
            if memories_read:
                yield f"event: sources\ndata: {json.dumps(memories_read, default=str)}\n\n"
            async for token in llm.stream_complete(conversation):
                yield f"event: token\ndata: {json.dumps(token)}\n\n"
        except Exception as exc:
            logger.error("Final summary generation failed: %s", exc)
            yield f"event: error\ndata: {json.dumps({'error': str(exc)})}\n\n"

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
