"""OpenAI-compatible async LLM client with streaming and tool-calling support."""

from __future__ import annotations

import asyncio
import json
import logging
from typing import AsyncGenerator

import httpx

logger = logging.getLogger(__name__)

_RETRY_ATTEMPTS = 3
_TIMEOUT = 120.0


class LLMClient:
    """Async LLM client for OpenAI-compatible endpoints (vLLM, OpenAI, Ollama)."""

    def __init__(
        self,
        api_url: str,
        model: str,
        api_key: str = "",
        max_tokens: int = 16384,
    ) -> None:
        self.api_url = api_url.rstrip("/")
        self.model = model
        self.max_tokens = max_tokens
        headers: dict[str, str] = {"Content-Type": "application/json"}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
        self._http = httpx.AsyncClient(
            headers=headers,
            timeout=httpx.Timeout(_TIMEOUT, connect=10.0),
        )

    # ------------------------------------------------------------------
    # Non-streaming completion
    # ------------------------------------------------------------------

    async def complete(
        self,
        messages: list[dict],
        max_tokens: int | None = None,
        temperature: float = 0.3,
    ) -> str:
        max_tokens = max_tokens or self.max_tokens
        url = f"{self.api_url}/chat/completions"
        body = {
            "model": self.model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
        }
        return await self._post_with_retry(url, body)

    # ------------------------------------------------------------------
    # Streaming completion
    # ------------------------------------------------------------------

    async def stream_complete(
        self,
        messages: list[dict],
        max_tokens: int | None = None,
        temperature: float = 0.3,
    ) -> AsyncGenerator[str, None]:
        max_tokens = max_tokens or self.max_tokens
        url = f"{self.api_url}/chat/completions"
        body = {
            "model": self.model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "stream": True,
        }
        async with self._http.stream("POST", url, json=body) as resp:
            resp.raise_for_status()
            async for line in resp.aiter_lines():
                if not line.startswith("data: "):
                    continue
                data = line[6:]
                if data.strip() == "[DONE]":
                    break
                try:
                    chunk = json.loads(data)
                    delta = chunk["choices"][0].get("delta", {})
                    content = delta.get("content")
                    if content:
                        yield content
                except (json.JSONDecodeError, KeyError, IndexError):
                    continue

    # ------------------------------------------------------------------
    # Tool-calling completion (for agent mode)
    # ------------------------------------------------------------------

    async def complete_with_tools(
        self,
        messages: list[dict],
        tools: list[dict],
        max_tokens: int | None = None,
        temperature: float = 0.3,
    ) -> dict:
        """Returns the full assistant message dict including any tool_calls."""
        max_tokens = max_tokens or self.max_tokens
        url = f"{self.api_url}/chat/completions"
        body = {
            "model": self.model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "tools": tools,
        }
        last_err: Exception | None = None
        for attempt in range(_RETRY_ATTEMPTS):
            try:
                resp = await self._http.post(url, json=body)
                resp.raise_for_status()
                data = resp.json()
                return data["choices"][0]["message"]
            except (httpx.HTTPStatusError, httpx.RequestError, KeyError, IndexError) as exc:
                last_err = exc
                wait = 2**attempt
                logger.warning(
                    "complete_with_tools failed (attempt %d/%d): %s -- retrying in %ds",
                    attempt + 1,
                    _RETRY_ATTEMPTS,
                    exc,
                    wait,
                )
                if attempt < _RETRY_ATTEMPTS - 1:
                    await asyncio.sleep(wait)
        raise RuntimeError(
            f"complete_with_tools failed after {_RETRY_ATTEMPTS} attempts: {last_err}"
        )

    # ------------------------------------------------------------------
    # Health check
    # ------------------------------------------------------------------

    async def health(self) -> bool:
        try:
            resp = await self._http.get(f"{self.api_url}/models")
            return resp.status_code == 200
        except httpx.HTTPError:
            return False

    # ------------------------------------------------------------------
    # Retry logic
    # ------------------------------------------------------------------

    async def _post_with_retry(self, url: str, body: dict) -> str:
        last_err: Exception | None = None
        for attempt in range(_RETRY_ATTEMPTS):
            try:
                resp = await self._http.post(url, json=body)
                resp.raise_for_status()
                data = resp.json()
                return data["choices"][0]["message"]["content"]
            except (httpx.HTTPStatusError, httpx.RequestError, KeyError, IndexError) as exc:
                last_err = exc
                wait = 2**attempt
                logger.warning(
                    "LLM request failed (attempt %d/%d): %s -- retrying in %ds",
                    attempt + 1,
                    _RETRY_ATTEMPTS,
                    exc,
                    wait,
                )
                if attempt < _RETRY_ATTEMPTS - 1:
                    await asyncio.sleep(wait)
        raise RuntimeError(
            f"LLM request failed after {_RETRY_ATTEMPTS} attempts: {last_err}"
        )

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    async def close(self) -> None:
        await self._http.aclose()
