#!/bin/bash
set -euo pipefail

# Only run in remote (web) environments
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"

echo "Installing root project dependencies..."
cd "$PROJECT_DIR"
npm install

echo "Installing ai-adoption-survey dependencies..."
cd "$PROJECT_DIR/ai-adoption-survey"
npm install

echo "Session start setup complete."
