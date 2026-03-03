"""FastAPI application -- REST API, WebSocket proxy, and MCP server entry."""

from __future__ import annotations

import asyncio
import logging
import sys
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import runtime_config, settings
from .ws.proxy import WSProxy

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
# Enable debug logging for uvicorn WebSocket to diagnose connection issues
logging.getLogger("uvicorn.error").setLevel(logging.DEBUG)
logging.getLogger("uvicorn.protocols").setLevel(logging.DEBUG)
logger = logging.getLogger(__name__)

# WebSocket proxy singleton
_ws_proxy: WSProxy | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _ws_proxy
    logger.info("Deep Memory Explorer starting")
    logger.info("  HiveMindDB: %s", runtime_config.hivemind_url)
    logger.info("  LLM API: %s (%s)", runtime_config.llm_api_url, runtime_config.llm_model)
    logger.info("  Agent max iterations: %d", runtime_config.agent_max_iterations)

    # Start WS proxy to HiveMindDB
    ws_url = runtime_config.hivemind_url.replace("http://", "ws://").replace("https://", "wss://")
    _ws_proxy = WSProxy(f"{ws_url}/ws")
    await _ws_proxy.connect_upstream()

    yield

    logger.info("Deep Memory Explorer shutting down")
    if _ws_proxy:
        await _ws_proxy.shutdown()


app = FastAPI(
    title="Deep Memory Explorer",
    description="Explore and query a HiveMindDB knowledge graph",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# Debug middleware: log all incoming ASGI scopes
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp, Receive, Scope, Send


class _WSDebugMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] == "websocket":
            path = scope.get("path", "?")
            headers = dict(scope.get("headers", []))
            origin = headers.get(b"origin", b"?").decode()
            logger.info("WS scope: path=%s origin=%s", path, origin)
        await self.app(scope, receive, send)


app.add_middleware(_WSDebugMiddleware)

# Include routers
from .routers.memories import router as memories_router
from .routers.graph import router as graph_router
from .routers.chat import router as chat_router
from .routers.agent import router as agent_router
from .routers.analysis import router as analysis_router
from .routers.settings import router as settings_router
from .routers.benchmark import router as benchmark_router
from .routers.system import router as system_router

app.include_router(memories_router)
app.include_router(graph_router)
app.include_router(chat_router)
app.include_router(agent_router)
app.include_router(analysis_router)
app.include_router(settings_router)
app.include_router(benchmark_router)
app.include_router(system_router)


# Simple WebSocket test page (visit /ws-test in browser to diagnose WS issues)
@app.get("/ws-test")
async def ws_test_page():
    from fastapi.responses import HTMLResponse
    return HTMLResponse("""<!DOCTYPE html><html><body>
<h3>WebSocket Test</h3><pre id="log"></pre>
<script>
const log = document.getElementById('log');
function append(msg) { log.textContent += msg + '\\n'; }
append('Connecting to ' + location.origin.replace('http','ws') + '/ws ...');
const ws = new WebSocket(location.origin.replace('http','ws') + '/ws');
ws.onopen = () => { append('CONNECTED'); ws.send(JSON.stringify({type:'subscribe',channels:['global']})); };
ws.onmessage = (e) => append('MSG: ' + e.data.slice(0,200));
ws.onerror = (e) => append('ERROR: ' + JSON.stringify(e));
ws.onclose = (e) => append('CLOSED code=' + e.code + ' reason=' + e.reason);
</script></body></html>""")


# WebSocket endpoint -- proxy to HiveMindDB
@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    if not _ws_proxy:
        await ws.close(code=1013, reason="WS proxy not initialized")
        return
    await _ws_proxy.add_client(ws)
    try:
        while True:
            # Keep connection alive; client messages are ignored for now
            await ws.receive_text()
    except WebSocketDisconnect:
        _ws_proxy.remove_client(ws)
    except Exception as exc:
        logger.warning("WebSocket error: %s", exc)
        _ws_proxy.remove_client(ws)


# Serve frontend static files in production (SPA with client-side routing)
_frontend_dist = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if _frontend_dist.is_dir():
    # Serve /assets/* as static files
    _assets_dir = _frontend_dist / "assets"
    if _assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=str(_assets_dir)), name="assets")

    # Catch-all: return index.html for any non-API, non-WS path (SPA routing)
    from fastapi.responses import HTMLResponse
    from fastapi import HTTPException as _HTTPException

    _index_html = (_frontend_dist / "index.html").read_text()

    from starlette.responses import Response as _Response

    # Also serve static files from the dist root (favicon, manifest, etc.)
    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa_fallback(full_path: str):
        # Don't intercept API or WebSocket paths
        if full_path.startswith("api/") or full_path == "ws":
            raise _HTTPException(status_code=404)
        return _Response(
            content=_index_html,
            media_type="text/html",
            headers={"Cache-Control": "no-cache, no-store, must-revalidate"},
        )


# MCP mode entry
def run_mcp():
    from .mcp.server import run_mcp_server
    asyncio.run(run_mcp_server())


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "mcp":
        run_mcp()
    else:
        import uvicorn
        uvicorn.run(app, host="0.0.0.0", port=settings.app_port, ws="wsproto")
