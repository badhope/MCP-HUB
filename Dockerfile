# MCP Hub Backend - Production Dockerfile
# Multi-stage build for security and performance
FROM python:3.14-slim as base

# Create non-root user for security
RUN useradd -m -u 1000 mcp-hub
WORKDIR /app

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

# Install production dependencies
FROM base as builder
COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# Final stage - minimal production image
FROM base as production
COPY --from=builder /root/.local /home/mcp-hub/.local
ENV PATH=/home/mcp-hub/.local/bin:$PATH

# Copy application code. The backend is a multi-file FastAPI app
# (main.py + api.py + services.py + query.py + user_data.py + core/),
# plus the data index and templates. All of them must be in the image
# or `python main.py` will ImportError on first request.
COPY --chown=mcp-hub:mcp-hub main.py api.py services.py query.py user_data.py ./
COPY --chown=mcp-hub:mcp-hub core/ ./core/
COPY --chown=mcp-hub:mcp-hub templates/ ./templates/
COPY --chown=mcp-hub:mcp-hub servers-index.json market-config.json ./

# Run as non-root user
USER mcp-hub
EXPOSE 8080

# Healthcheck — hits the lightweight /health liveness probe.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8080/health')"

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]


# Development stage
FROM base as development
COPY --chown=mcp-hub:mcp-hub requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt
COPY --chown=mcp-hub:mcp-hub . .
USER mcp-hub
EXPOSE 8080
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080", "--reload"]
