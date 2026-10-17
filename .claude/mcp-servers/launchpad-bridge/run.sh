#!/bin/bash
# Launchpad Bridge MCP Server — shell wrapper
# Activates the project venv and runs the Python MCP server
set -euo pipefail
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
VENV_PYTHON="$PROJECT_ROOT/venv/bin/python"
SERVER="$PROJECT_ROOT/.claude/mcp-servers/launchpad-bridge/server.py"
exec "$VENV_PYTHON" "$SERVER"
