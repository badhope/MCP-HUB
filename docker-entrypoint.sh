#!/bin/sh
# Docker entrypoint for the MCP-HUB backend.
#
# Resolves the historical conflict where the runtime needed
# `servers-index.json` but `.dockerignore` excluded it from the build
# context (so `docker build` would either fail to COPY it or ship an
# empty data set). Strategy:
#
#   1. If /app/servers-index.json is already present (mount, prior run,
#      or a pre-baked layer) use it as-is.
#   2. Otherwise, run `tools/sync_index.py` to pull a fresh snapshot
#      from the upstream `Rodert/awesome-mcp` index.
#   3. If sync fails (offline, rate-limited, etc.) start the server
#      anyway with whatever data we have — the API will surface
#      `/health` as healthy and `/stats` will report zeros instead of
#      refusing to start, so the container can be debugged via
#      `docker exec` without indefinite restart loops.
#
# Environment variables:
#   MCP_HUB_SKIP_SYNC=1  — never auto-sync, even if the index is missing.
#                          Useful in CI / hermetic tests.

set -e

INDEX=/app/servers-index.json

if [ ! -s "$INDEX" ]; then
  echo "[entrypoint] $INDEX not found or empty."
  if [ "${MCP_HUB_SKIP_SYNC:-0}" = "1" ]; then
    echo "[entrypoint] MCP_HUB_SKIP_SYNC=1 — starting with empty index."
  else
    echo "[entrypoint] Running tools/sync_index.py to fetch upstream index..."
    if python tools/sync_index.py; then
      echo "[entrypoint] Index synced successfully."
    else
      echo "[entrypoint] Sync failed; starting with whatever data is available." >&2
    fi
  fi
else
  echo "[entrypoint] Using existing $INDEX ($(wc -c < "$INDEX") bytes)."
fi

# Hand off to the CMD (default: uvicorn main:app).
exec "$@"
