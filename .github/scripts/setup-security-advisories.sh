#!/usr/bin/env bash
# Enable GitHub's private vulnerability reporting on the repo.
# This is the recommended replacement for "email the maintainer privately"
# in SECURITY.md — reports go through GitHub's disclosure workflow.
# Requires: gh CLI authenticated with admin access to the repo.
#
# Usage:  .github/scripts/setup-security-advisories.sh

set -euo pipefail

REPO="${GITHUB_REPOSITORY:-badhope/MCP-HUB}"

echo "Enabling private vulnerability reporting on $REPO..."

gh repo edit "$REPO" --enable-vulnerability-alerts
gh repo edit "$REPO" --enable-advanced-security 2>/dev/null || \
  echo "(advanced-security is GitHub Enterprise only; continuing)"

echo "Done."
echo "Verify at: https://github.com/$REPO/security/advisories"
