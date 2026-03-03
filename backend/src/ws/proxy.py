"""WebSocket fan-out proxy -- one upstream connection to HiveMindDB, fans out to N browser clients."""

from __future__ import annotations

import asyncio
import json
import logging

import websockets
from fastapi import WebSocket

logger = logging.getLogger(__name__)

_MAX_RECONNECT_DELAY = 30.0


class WSProxy:
    """Maintains one upstream WS to HiveMindDB, broadcasts events to browser clients."""

    def __init__(self, hivemind_ws_url: str) -> None:
        self._upstream_url = hivemind_ws_url
        self._upstream_ws: websockets.WebSocketClientProtocol | None = None
        self._clients: set[WebSocket] = set()
        self._reader_task: asyncio.Task | None = None
        self._reconnect_delay = 1.0

    async def connect_upstream(self) -> None:
        """Connect to HiveMindDB WS and start the reader loop."""
        if self._reader_task and not self._reader_task.done():
            return
        self._reader_task = asyncio.create_task(self._connection_loop())

    async def _connection_loop(self) -> None:
        """Auto-reconnecting connection loop."""
        while True:
            try:
                async with websockets.connect(self._upstream_url) as ws:
                    self._upstream_ws = ws
                    self._reconnect_delay = 1.0
                    logger.info("Connected to HiveMindDB WS at %s", self._upstream_url)

                    # Subscribe to global channel
                    await ws.send(json.dumps({
                        "type": "subscribe",
                        "channels": ["global"],
                        "agent_id": None,
                    }))

                    await self._upstream_reader(ws)

            except (websockets.ConnectionClosed, OSError, ConnectionRefusedError) as exc:
                logger.warning(
                    "HiveMindDB WS disconnected: %s -- reconnecting in %.0fs",
                    exc,
                    self._reconnect_delay,
                )
                self._upstream_ws = None
                await asyncio.sleep(self._reconnect_delay)
                self._reconnect_delay = min(self._reconnect_delay * 2, _MAX_RECONNECT_DELAY)

    async def _upstream_reader(self, ws: websockets.WebSocketClientProtocol) -> None:
        """Read messages from HiveMindDB and broadcast to all browser clients."""
        async for raw_msg in ws:
            await self._broadcast(raw_msg if isinstance(raw_msg, str) else raw_msg.decode())

    async def _broadcast(self, message: str) -> None:
        """Send a message to all connected browser clients."""
        dead: list[WebSocket] = []
        for client in self._clients:
            try:
                await client.send_text(message)
            except Exception:
                dead.append(client)
        for client in dead:
            self._clients.discard(client)

    async def add_client(self, ws: WebSocket) -> None:
        await ws.accept()
        self._clients.add(ws)
        logger.info("Browser WS client added (total: %d)", len(self._clients))

    def remove_client(self, ws: WebSocket) -> None:
        self._clients.discard(ws)
        logger.info("Browser WS client removed (total: %d)", len(self._clients))

    async def shutdown(self) -> None:
        if self._reader_task:
            self._reader_task.cancel()
            try:
                await self._reader_task
            except asyncio.CancelledError:
                pass
        if self._upstream_ws:
            await self._upstream_ws.close()
