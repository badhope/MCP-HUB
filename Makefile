# Makefile — MCP Hub
# Single source of truth for the most common dev/CI commands.
# `make help` for the full list.

# ---------------------------------------------------------------------------
# Meta
# ---------------------------------------------------------------------------
# Some recipes (e.g. `make deploy-ghpages`) use bash-only features like
# `pipefail`. Force bash everywhere so the Makefile works on Debian/Ubuntu
# where /bin/sh is dash.
SHELL := /usr/bin/env bash
.SHELLFLAGS := -eu -o pipefail -c
.DEFAULT_GOAL := help

# Detect the active python (prefer python3.11)
PY ?= python3
PIP ?= $(PY) -m pip

# ---------------------------------------------------------------------------
# Targets
# ---------------------------------------------------------------------------
.PHONY: help
help:  ## Show this help.
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# --- install ---------------------------------------------------------------
.PHONY: install install-dev install-frontend
install:  ## Install backend runtime deps (pip install -r requirements.txt).
	$(PIP) install -r requirements.txt

install-dev:  ## Install backend + dev + test deps (editable).
	$(PIP) install -e '.[dev,test]'

install-frontend:  ## Install frontend deps.
	cd frontend && npm ci

# --- run -------------------------------------------------------------------
.PHONY: dev run frontend
dev:  ## Run the FastAPI backend on :8080 (reload on file change).
	$(PY) main.py

run: dev  ## Alias for `make dev`.

frontend:  ## Run the Vite dev server on :5173.
	cd frontend && npm run dev

# --- quality ---------------------------------------------------------------
.PHONY: lint lint-py lint-frontend format format-check typecheck secret-scan
lint: lint-py lint-frontend  ## Run all linters.

lint-py:  ## flake8 + black --check + isort --check (Python).
	flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics
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
.PHONY: test test-fast test-cov
test:  ## Run the full pytest suite.
	$(PY) -m pytest tests/ -v

test-fast:  ## Run pytest, stop on first failure.
	$(PY) -m pytest tests/ -x --timeout 30

test-cov:  ## Run pytest with HTML + terminal coverage report.
	$(PY) -m pytest tests/ --cov=. --cov-report=term-missing --cov-report=html

# --- static data -----------------------------------------------------------
.PHONY: data static-data
data static-data:  ## Regenerate frontend/public/static-data/*.json.
	$(PY) tools/gen_static_data.py

# --- build & deploy --------------------------------------------------------
.PHONY: build build-frontend build-data deploy-ghpages deploy
build: build-data build-frontend  ## Full build: data + frontend.

build-frontend:  ## Build the Vite SPA into frontend/dist.
	cd frontend && npm run build
	# GitHub Pages SPA fallback + disable Jekyll
	touch frontend/dist/.nojekyll
	cp frontend/dist/index.html frontend/dist/404.html

build-data: data  ## Alias for `make data`.

deploy-ghpages: build  ## Publish frontend/dist/ to the gh-pages branch.
	@if [ -z "$$GITHUB_TOKEN" ] && [ -z "$$GH_TOKEN" ]; then \
	  echo "ERROR: set GITHUB_TOKEN (with repo: write) to deploy" >&2; exit 1; \
	fi
	@tmpdir=$$(mktemp -d) && \
	git worktree add $$tmpdir origin/gh-pages && \
	cd $$tmpdir && \
	git checkout gh-pages && \
	find . -maxdepth 1 -mindepth 1 ! -name '.git' -exec rm -rf {} + && \
	cp -r $(CURDIR)/frontend/dist/. . && \
	git add -A && \
	git -c user.name='github-actions[bot]' -c user.email='github-actions[bot]@users.noreply.github.com' \
	  commit -m "deploy: $$(date -u +%Y-%m-%dT%H:%M:%SZ)" && \
	git push https://x-access-token:$${GITHUB_TOKEN:-$$GH_TOKEN}@github.com/badhope/MCP-HUB.git gh-pages
	git worktree remove $$tmpdir --force
	git worktree prune

deploy: deploy-ghpages  ## Alias for `make deploy-ghpages`.

# --- docker ----------------------------------------------------------------
.PHONY: docker-build docker-run docker-up docker-down
docker-build:  ## Build the production image.
	docker build -t mcp-hub:latest .

docker-run:  ## Run the image on :8080.
	docker run --rm -p 8080:8080 --name mcp-hub mcp-hub:latest

docker-up:  ## docker compose up -d (detached).
	docker compose up -d

docker-down:  ## docker compose down.
	docker compose down

# --- cleanup ---------------------------------------------------------------
.PHONY: clean clean-py clean-frontend clean-all
clean: clean-py clean-frontend  ## Remove all build artefacts and caches.

clean-py:  ## Remove Python build / test artefacts.
	rm -rf .pytest_cache .mypy_cache .ruff_cache htmlcov .coverage
	find . -type d -name '__pycache__' -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name '*.py[cod]' -delete

clean-frontend:  ## Remove frontend build artefacts.
	rm -rf frontend/dist frontend/.vite frontend/node_modules/.cache

clean-all: clean  ## Alias.
