"""Allow running as `python -m backend.src`."""
from .main import app, run_mcp, settings
import sys

if len(sys.argv) > 1 and sys.argv[1] == "mcp":
    run_mcp()
else:
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=settings.app_port, ws="wsproto")
