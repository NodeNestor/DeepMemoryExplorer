"""Benchmark and bulk search endpoints (proxied to HiveMindDB)."""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException

from ..config import runtime_config
from ..hivemind import HiveMindClient
from ..hivemind.models import SearchRequest
from ..models import (
    BenchmarkRunRequest,
    BenchmarkRunResponse,
    BulkSearchRequest,
    BulkSearchResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/benchmark", tags=["benchmark"])


@router.post("/run", response_model=BenchmarkRunResponse)
async def run_benchmark(req: BenchmarkRunRequest):
    """Run HiveMindDB performance benchmarks."""
    hm = HiveMindClient(runtime_config.hivemind_url)
    try:
        result = await hm.run_benchmark(
            operations=req.operations,
            iterations=req.iterations,
            concurrency=req.concurrency,
            cleanup=req.cleanup,
        )
        if not result:
            raise HTTPException(status_code=502, detail="HiveMindDB benchmark returned empty response")
        return BenchmarkRunResponse.model_validate(result)
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Benchmark run failed")
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    finally:
        await hm.close()


@router.post("/search", response_model=BulkSearchResponse)
async def bulk_search(req: BulkSearchRequest):
    """Run concurrent bulk search against HiveMindDB."""
    hm = HiveMindClient(runtime_config.hivemind_url)
    try:
        queries = [
            SearchRequest(query=q.query, tags=q.tags, limit=q.limit)
            for q in req.queries
        ]
        result = await hm.search_bulk(
            queries=queries,
            max_concurrent=req.max_concurrent,
        )
        return BulkSearchResponse.model_validate(result)
    except Exception as exc:
        logger.exception("Bulk search failed")
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    finally:
        await hm.close()
