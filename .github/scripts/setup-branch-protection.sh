#!/usr/bin/env bash
# Apply branch protection rules to the main branch.
# Requires: gh CLI authenticated with admin access to the repo.
#
# Usage:  .github/scripts/setup-branch-protection.sh
#   or:   GITHUB_REPOSITORY=you/MCP-HUB .github/scripts/setup-branch-protection.sh

set -euo pipefail

REPO="${GITHUB_REPOSITORY:-badhope/MCP-HUB}"

echo "Applying branch protection to $REPO:main..."

gh api \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "/repos/$REPO/branches/main/protection" \
  --input .github/branch-protection-main.json

echo "Done."
echo "Verify at: https://github.com/$REPO/settings/branches"
