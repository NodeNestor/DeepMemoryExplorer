# Multi-stage: build frontend → embed in Python server
FROM node:22-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ ./
RUN npm run build

FROM python:3.12-slim AS runtime
WORKDIR /app

# Install Python dependencies only
COPY backend/pyproject.toml ./
RUN pip install --no-cache-dir \
    "fastapi>=0.115.0" \
    "uvicorn[standard]>=0.32.0" \
    "httpx>=0.27.0" \
    "pydantic>=2.10.0" \
    "pydantic-settings>=2.6.0" \
    "mcp>=1.0.0" \
    "websockets>=13.0" \
    "wsproto>=1.2.0" \
    "sse-starlette>=2.0.0"

# Copy backend source
COPY backend/ ./backend/

# Copy built frontend
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

ENV APP_PORT=3000
EXPOSE 3000
CMD ["python", "-m", "backend.src.main"]
