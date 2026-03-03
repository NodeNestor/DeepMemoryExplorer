"""FastAPI Depends factories."""

from __future__ import annotations

from typing import AsyncGenerator

from .config import runtime_config
from .hivemind import HiveMindClient
from .llm import LLMClient


async def get_hivemind_client() -> AsyncGenerator[HiveMindClient, None]:
    client = HiveMindClient(runtime_config.hivemind_url)
    try:
        yield client
    finally:
        await client.close()


async def get_llm_client() -> AsyncGenerator[LLMClient, None]:
    client = LLMClient(
        api_url=runtime_config.llm_api_url,
        model=runtime_config.llm_model,
        api_key=runtime_config.llm_api_key,
        max_tokens=runtime_config.llm_max_tokens,
    )
    try:
        yield client
    finally:
        await client.close()
