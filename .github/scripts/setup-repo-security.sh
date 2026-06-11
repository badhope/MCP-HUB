#!/usr/bin/env bash
# Apply repository security + general settings.
# Requires: gh CLI authenticated with admin access to the repo.
#
# Usage:  .github/scripts/setup-repo-security.sh
#   or:   GITHUB_REPOSITORY=you/MCP-HUB .github/scripts/setup-repo-security.sh

set -euo pipefail

REPO="${GITHUB_REPOSITORY:-badhope/MCP-HUB}"

echo "Applying repo security settings to $REPO..."

gh api \
  --method PATCH \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "/repos/$REPO" \
  --input .github/repo-settings.json

echo "Done."
echo "Verify at: https://github.com/$REPO/settings"
