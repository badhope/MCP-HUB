#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────
#  Setup GitHub repository settings for MCP-HUB
# ─────────────────────────────────────────────────────────────────────
#
#  One-shot script that applies:
#   1. Repo-level security + general settings (.github/repo-settings.json)
#   2. Branch protection on main (.github/branch-protection-main.json)
#   3. Issue / PR labels (.github/labels.yml)
#
#  Prerequisites:
#   - gh CLI installed and authenticated
#   - Admin access to badhope/MCP-HUB
#
#  Usage:
#     .github/scripts/setup-github.sh
#
#  To target a fork, export GITHUB_REPOSITORY first:
#     GITHUB_REPOSITORY=you/MCP-HUB .github/scripts/setup-github.sh
# ─────────────────────────────────────────────────────────────────────
set -euo pipefail

REPO="${GITHUB_REPOSITORY:-badhope/MCP-HUB}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/../.."

echo "▶ Target repo: $REPO"
echo

# Sanity check
if ! command -v gh >/dev/null 2>&1; then
  echo "✗ gh CLI not found. Install: https://cli.github.com/" >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "✗ Not authenticated. Run: gh auth login" >&2
  exit 1
fi

# 1. Repo-level settings
echo "1/3 Applying repo settings..."
gh api --method PATCH \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "/repos/$REPO" \
  --input .github/repo-settings.json

# 2. Branch protection
echo "2/3 Applying branch protection on main..."
gh api --method PUT \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "/repos/$REPO/branches/main/protection" \
  --input .github/branch-protection-main.json

# 3. Labels
echo "3/3 Syncing labels..."
gh label sync -f .github/labels.yml --repo "$REPO"

echo
echo "✓ Done."
echo
echo "Verify:"
echo "  - https://github.com/$REPO/settings"
echo "  - https://github.com/$REPO/settings/branches"
echo "  - https://github.com/$REPO/labels"
