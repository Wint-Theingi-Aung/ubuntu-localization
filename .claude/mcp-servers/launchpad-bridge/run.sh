#!/bin/bash
# Launchpad Bridge MCP Server — shell wrapper
# Activates the project venv and runs the Python MCP server
VENV_PYTHON="/home/wint/ubuntu-localization/venv/bin/python"
SERVER="/home/wint/.claude/mcp-servers/launchpad-bridge/server.py"
exec "$VENV_PYTHON" "$SERVER"
