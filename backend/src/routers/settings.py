"""Settings and health check endpoints."""

from __future__ import annotations

import logging

from fastapi import APIRouter

from ..config import runtime_config
from ..hivemind import HiveMindClient
from ..llm import LLMClient
from ..models import HealthResponse, SettingsUpdate

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["settings"])


@router.get("/config")
async def get_config():
    return {
        "hivemind_url": runtime_config.hivemind_url,
        "llm_api_url": runtime_config.llm_api_url,
        "llm_model": runtime_config.llm_model,
        "llm_api_key": "***" if runtime_config.llm_api_key else "",
        "llm_max_tokens": runtime_config.llm_max_tokens,
        "agent_max_iterations": runtime_config.agent_max_iterations,
    }


@router.put("/config")
async def update_config(update: SettingsUpdate):
    runtime_config.update(**update.model_dump(exclude_none=True))
    logger.info("Runtime config updated: %s", update.model_dump(exclude_none=True))
    return {"status": "updated"}


@router.get("/health", response_model=HealthResponse)
async def health_check():
    hm_client = HiveMindClient(runtime_config.hivemind_url)
    llm_client = LLMClient(
        api_url=runtime_config.llm_api_url,
        model=runtime_config.llm_model,
        api_key=runtime_config.llm_api_key,
    )

    try:
        hm_health = await hm_client.get_system_health()
        hm_ok = bool(hm_health and hm_health.get("status") == "healthy")
        hm_stats = hm_health if hm_ok else await hm_client.get_status()
    except Exception:
        hm_ok = False
        hm_stats = None
    finally:
        await hm_client.close()

    try:
        llm_ok = await llm_client.health()
    except Exception:
        llm_ok = False
    finally:
        await llm_client.close()

    return HealthResponse(
        hivemind="ok" if hm_ok else "unreachable",
        llm="ok" if llm_ok else "unreachable",
        hivemind_stats=hm_stats,
    )
