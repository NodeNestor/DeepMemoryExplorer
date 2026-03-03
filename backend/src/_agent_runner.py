"""Standalone agent loop used by the MCP server (non-streaming version)."""

from __future__ import annotations

import json
import logging

from .hivemind import HiveMindClient
from .llm import LLMClient
from .routers.agent import AGENT_TOOLS, _AGENT_SYSTEM_PROMPT, _execute_tool

logger = logging.getLogger(__name__)


async def run_agent_loop(
    question: str,
    hm: HiveMindClient,
    llm: LLMClient,
    max_iterations: int = 10,
) -> str:
    """Run the agent tool-calling loop and return the final answer string."""
    memories_read: list[dict] = []
    conversation: list[dict] = [
        {"role": "system", "content": _AGENT_SYSTEM_PROMPT},
        {"role": "user", "content": question},
    ]

    for iteration in range(max_iterations):
        try:
            response = await llm.complete_with_tools(
                messages=conversation,
                tools=AGENT_TOOLS,
            )
        except Exception as exc:
            logger.error("Agent LLM call failed at iteration %d: %s", iteration, exc)
            return f"Agent failed at iteration {iteration}: {exc}"

        tool_calls = response.get("tool_calls")

        if not tool_calls:
            # Model responded directly
            return response.get("content", "")

        conversation.append(response)

        for tc in tool_calls:
            fn_name = tc["function"]["name"]
            try:
                fn_args = json.loads(tc["function"]["arguments"])
            except json.JSONDecodeError:
                fn_args = {}
            tc_id = tc.get("id", f"call_{iteration}")

            if fn_name == "done":
                return fn_args.get("answer", "")

            result = await _execute_tool(fn_name, fn_args, hm, memories_read)
            result_summary = result if len(result) < 4000 else result[:4000] + "...(truncated)"
            conversation.append({
                "role": "tool",
                "tool_call_id": tc_id,
                "content": result_summary,
            })

    # Max iterations - ask for final summary
    conversation.append({
        "role": "user",
        "content": "You've reached the maximum number of steps. Provide your best answer now.",
    })
    try:
        return await llm.complete(conversation)
    except Exception as exc:
        return f"Agent reached max iterations and final summary failed: {exc}"
