"""System introspection endpoints (proxied to HiveMindDB)."""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException

from ..config import runtime_config
from ..hivemind import HiveMindClient

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/system", tags=["system"])


@router.get("/config")
async def system_config():
    """Get HiveMindDB system configuration."""
    hm = HiveMindClient(runtime_config.hivemind_url)
    try:
        result = await hm.get_system_config()
        if not result:
            raise HTTPException(status_code=502, detail="HiveMindDB system config unavailable")
        return result
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("System config fetch failed")
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    finally:
        await hm.close()


@router.get("/topology")
async def system_topology():
    """Get HiveMindDB system topology."""
    hm = HiveMindClient(runtime_config.hivemind_url)
    try:
        result = await hm.get_system_topology()
        if not result:
            raise HTTPException(status_code=502, detail="HiveMindDB topology unavailable")
        return result
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("System topology fetch failed")
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    finally:
        await hm.close()


@router.get("/health")
async def system_health():
    """Get detailed HiveMindDB system health."""
    hm = HiveMindClient(runtime_config.hivemind_url)
    try:
        result = await hm.get_system_health()
        if not result:
            raise HTTPException(status_code=502, detail="HiveMindDB health unavailable")
        return result
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("System health fetch failed")
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    finally:
        await hm.close()


@router.get("/embedding")
async def system_embedding():
    """Get HiveMindDB embedding info."""
    hm = HiveMindClient(runtime_config.hivemind_url)
    try:
        result = await hm.get_system_embedding()
        if not result:
            raise HTTPException(status_code=502, detail="HiveMindDB embedding info unavailable")
        return result
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("System embedding fetch failed")
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    finally:
        await hm.close()
