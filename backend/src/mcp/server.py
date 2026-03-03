"""MCP server exposing Deep Memory Explorer tools for Claude Code and other LLMs."""

from __future__ import annotations

import json
import logging

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import TextContent, Tool

from ..config import runtime_config
from ..hivemind import HiveMindClient
from ..hivemind.models import SearchRequest
from ..llm import LLMClient

logger = logging.getLogger(__name__)

mcp = Server("deep-memory-explorer")


@mcp.list_tools()
async def list_tools() -> list[Tool]:
    return [
        Tool(
            name="memory_search",
            description="Search HiveMindDB memories by semantic query and optional tag filter.",
            inputSchema={
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
                        "description": "Max results (default 10)",
                        "default": 10,
                    },
                },
                "required": ["query"],
            },
        ),
        Tool(
            name="memory_analyze",
            description="Analyze a set of memories: summarize, find contradictions, explain relationships, or run a custom prompt.",
            inputSchema={
                "type": "object",
                "properties": {
                    "memory_ids": {
                        "type": "array",
                        "items": {"type": "integer"},
                        "description": "Memory IDs to analyze",
                    },
                    "action": {
                        "type": "string",
                        "enum": ["summarize", "contradictions", "explain", "custom"],
                        "description": "Analysis action",
                        "default": "summarize",
                    },
                    "custom_prompt": {
                        "type": "string",
                        "description": "Custom prompt (required if action=custom)",
                    },
                },
                "required": ["memory_ids"],
            },
        ),
        Tool(
            name="graph_explore",
            description="Traverse the knowledge graph starting from an entity name.",
            inputSchema={
                "type": "object",
                "properties": {
                    "entity_name": {
                        "type": "string",
                        "description": "Entity name to start from",
                    },
                    "depth": {
                        "type": "integer",
                        "description": "Traversal depth (default 2)",
                        "default": 2,
                    },
                },
                "required": ["entity_name"],
            },
        ),
        Tool(
            name="deep_research_chat",
            description="Run the agentic research mode: LLM autonomously explores HiveMindDB to answer a question.",
            inputSchema={
                "type": "object",
                "properties": {
                    "question": {
                        "type": "string",
                        "description": "The research question",
                    },
                    "max_iterations": {
                        "type": "integer",
                        "description": "Max agent iterations (default from config)",
                    },
                },
                "required": ["question"],
            },
        ),
        Tool(
            name="health_check",
            description="Check connectivity to HiveMindDB and the LLM endpoint.",
            inputSchema={"type": "object", "properties": {}},
        ),
        Tool(
            name="bulk_search",
            description="Run multiple searches against HiveMindDB concurrently. Returns all results grouped by query.",
            inputSchema={
                "type": "object",
                "properties": {
                    "queries": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "query": {"type": "string"},
                                "tags": {
                                    "type": "array",
                                    "items": {"type": "string"},
                                },
                                "limit": {"type": "integer", "default": 10},
                            },
                            "required": ["query"],
                        },
                        "description": "List of search queries to execute concurrently",
                    },
                    "max_concurrent": {
                        "type": "integer",
                        "description": "Max concurrent searches (default 10)",
                        "default": 10,
                    },
                },
                "required": ["queries"],
            },
        ),
        Tool(
            name="run_benchmark",
            description="Run performance benchmarks against HiveMindDB. Tests write, search, entity, and graph operations.",
            inputSchema={
                "type": "object",
                "properties": {
                    "operations": {
                        "type": "array",
                        "items": {
                            "type": "string",
                            "enum": [
                                "write",
                                "bulk_write",
                                "keyword_search",
                                "semantic_search",
                                "entity_create",
                                "graph_traverse",
                            ],
                        },
                        "description": "Operations to benchmark (default: all)",
                    },
                    "iterations": {
                        "type": "integer",
                        "description": "Iterations per operation (default 100)",
                        "default": 100,
                    },
                    "concurrency": {
                        "type": "integer",
                        "description": "Concurrency level (default 1)",
                        "default": 1,
                    },
                },
            },
        ),
        Tool(
            name="system_info",
            description="Get HiveMindDB system info: configuration, topology, health status, and embedding details in one call.",
            inputSchema={"type": "object", "properties": {}},
        ),
    ]


@mcp.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    hm = HiveMindClient(runtime_config.hivemind_url)
    llm = LLMClient(
        api_url=runtime_config.llm_api_url,
        model=runtime_config.llm_model,
        api_key=runtime_config.llm_api_key,
        max_tokens=runtime_config.llm_max_tokens,
    )

    try:
        if name == "memory_search":
            results = await hm.search(
                query=arguments["query"],
                tags=arguments.get("tags"),
                limit=arguments.get("limit", 10),
            )
            out = [
                {
                    "id": r.memory.id,
                    "content": r.memory.content,
                    "score": r.score,
                    "tags": r.memory.tags,
                }
                for r in results
            ]
            return [TextContent(type="text", text=json.dumps(out, indent=2, default=str))]

        elif name == "memory_analyze":
            memory_ids = arguments["memory_ids"]
            action = arguments.get("action", "summarize")
            # Fetch memories
            parts = []
            for mid in memory_ids:
                mem = await hm.get_memory(mid)
                if mem:
                    parts.append(f"[mem:{mem.id}]\n{mem.content}")
            if not parts:
                return [TextContent(type="text", text="No valid memories found for the given IDs.")]
            context = "\n\n---\n\n".join(parts)

            prompts = {
                "summarize": "Summarize the following memories clearly and concisely. Cite with [mem:ID].",
                "contradictions": "Find contradictions or inconsistencies between these memories. Cite with [mem:ID].",
                "explain": "Explain the relationships and connections between these memories. Cite with [mem:ID].",
            }
            system = prompts.get(action) or arguments.get("custom_prompt", "Analyze the following memories.")
            if action == "custom" and arguments.get("custom_prompt"):
                system = arguments["custom_prompt"] + " Cite with [mem:ID]."

            result = await llm.complete([
                {"role": "system", "content": system},
                {"role": "user", "content": context},
            ])
            return [TextContent(type="text", text=result)]

        elif name == "graph_explore":
            entity = await hm.find_entity(arguments["entity_name"])
            if not entity:
                return [TextContent(type="text", text=f"Entity '{arguments['entity_name']}' not found.")]

            graph = await hm.graph_traverse(entity.id, depth=arguments.get("depth", 2))
            nodes = []
            for n in graph.nodes:
                nodes.append({
                    "name": n.entity.name,
                    "type": n.entity.entity_type,
                    "description": n.entity.description,
                    "relationships": n.relationships[:10],
                })
            result = {"root_entity": arguments["entity_name"], "nodes": nodes}
            return [TextContent(type="text", text=json.dumps(result, indent=2, default=str))]

        elif name == "deep_research_chat":
            # Import agent tools and execute the agent loop synchronously
            from .._agent_runner import run_agent_loop

            max_iter = arguments.get("max_iterations", runtime_config.agent_max_iterations)
            answer = await run_agent_loop(
                question=arguments["question"],
                hm=hm,
                llm=llm,
                max_iterations=max_iter,
            )
            return [TextContent(type="text", text=answer)]

        elif name == "health_check":
            hm_ok = await hm.health()
            llm_ok = await llm.health()
            hm_stats = await hm.get_status() if hm_ok else None
            result = {
                "hivemind": "ok" if hm_ok else "unreachable",
                "llm": "ok" if llm_ok else "unreachable",
                "hivemind_stats": hm_stats,
            }
            return [TextContent(type="text", text=json.dumps(result, indent=2, default=str))]

        elif name == "bulk_search":
            raw_queries = arguments["queries"]
            queries = [
                SearchRequest(
                    query=q["query"],
                    tags=q.get("tags", []),
                    limit=q.get("limit", 10),
                )
                for q in raw_queries
            ]
            result = await hm.search_bulk(
                queries=queries,
                max_concurrent=arguments.get("max_concurrent", 10),
            )
            return [TextContent(type="text", text=json.dumps(result, indent=2, default=str))]

        elif name == "run_benchmark":
            result = await hm.run_benchmark(
                operations=arguments.get("operations"),
                iterations=arguments.get("iterations", 100),
                concurrency=arguments.get("concurrency", 1),
            )
            return [TextContent(type="text", text=json.dumps(result, indent=2, default=str))]

        elif name == "system_info":
            config = await hm.get_system_config()
            topology = await hm.get_system_topology()
            health = await hm.get_system_health()
            embedding = await hm.get_system_embedding()
            result = {
                "config": config,
                "topology": topology,
                "health": health,
                "embedding": embedding,
            }
            return [TextContent(type="text", text=json.dumps(result, indent=2, default=str))]

        else:
            return [TextContent(type="text", text=f"Unknown tool: {name}")]

    finally:
        await llm.close()
        await hm.close()


async def run_mcp_server() -> None:
    """Run the MCP server over stdio."""
    async with stdio_server() as (read, write):
        await mcp.run(read, write, mcp.create_initialization_options())
