# Makefile — MCP Hub (Phase 6+ static SPA + build-time data pipeline)
#
# Single source of truth for the most common dev/CI commands.
# `make help` for the full list.

# ---------------------------------------------------------------------------
# Meta
# ---------------------------------------------------------------------------
SHELL := /usr/bin/env bash
.SHELLFLAGS := -eu -o pipefail -c
.DEFAULT_GOAL := help

# Prefer python3.11 if present, fall back to python3
PY ?= python3

# ---------------------------------------------------------------------------
# Targets
# ---------------------------------------------------------------------------
.PHONY: help
help:  ## Show this help.
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# --- install ---------------------------------------------------------------
.PHONY: install-frontend install-pytest
install-frontend:  ## Install frontend deps.
	cd frontend && npm ci

install-pytest:  ## Install pytest (only needed for `make test`).
	$(PY) -m pip install pytest

# --- run -------------------------------------------------------------------
.PHONY: frontend
frontend:  ## Run the Vite dev server on :5173.
	cd frontend && npm run dev

# --- quality ---------------------------------------------------------------
.PHONY: lint lint-py lint-frontend format format-check typecheck secret-scan
lint: lint-py lint-frontend  ## Run all linters.

lint-py:  ## black --check + isort --check (Python).
	black --check --diff .
	isort --check-only --diff --profile=black .

lint-frontend:  ## TypeScript type check (no emit).
	cd frontend && npm run check

format:  ## Auto-format Python + frontend.
	black .
	isort --profile=black .
	cd frontend && npm run format || true

format-check:  ## Verify formatting (CI friendly).
	black --check .
	isort --check-only --profile=black .

typecheck: lint-frontend  ## Alias for `make lint-frontend`.

secret-scan:  ## Scan the working tree for accidentally committed secrets.
	$(PY) tools/secret_scanner.py .

# --- test ------------------------------------------------------------------
.PHONY: test test-fast
test:  ## Run the data-pipeline test suite.
	$(PY) -m pytest tests/ -v

test-fast:  ## Run pytest, stop on first failure.
	$(PY) -m pytest tests/ -x --timeout 30

# --- data ------------------------------------------------------------------
.PHONY: data sync
data:  ## Build frontend/public/servers-index.json from upstream.
	$(PY) tools/sync_index.py
	$(PY) tools/gen_static_data.py

sync: data  ## Alias.

# --- build & deploy --------------------------------------------------------
.PHONY: build build-frontend build-data deploy
build: build-data build-frontend  ## Full build: data + frontend.

build-frontend:  ## Build the Vite SPA into frontend/dist.
	cd frontend && npm run build
	# GitHub Pages SPA fallback + disable Jekyll
	touch frontend/dist/.nojekyll
	cp frontend/dist/index.html frontend/dist/404.html

build-data: data  ## Alias for `make data`.

deploy: build  ## Push to main; .github/workflows/frontend-deploy.yml handles Pages.
	@echo "Push to main to deploy; see .github/workflows/frontend-deploy.yml."

# --- cleanup ---------------------------------------------------------------
.PHONY: clean clean-py clean-frontend clean-all
clean: clean-py clean-frontend  ## Remove all build artefacts and caches.

clean-py:  ## Remove Python build / test artefacts.
	rm -rf .pytest_cache .mypy_cache .ruff_cache .coverage
	find . -type d -name '__pycache__' -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name '*.py[cod]' -delete

clean-frontend:  ## Remove frontend build artefacts.
	rm -rf frontend/dist frontend/.vite frontend/node_modules/.cache

clean-all: clean  ## Alias.
