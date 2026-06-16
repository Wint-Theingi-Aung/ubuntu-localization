"""Vercel entry point — FastAPI app for Ubuntu Localization Tool."""

import sys
from pathlib import Path

# Ensure project root is on sys.path for Vercel runtime
sys.path.insert(0, str(Path(__file__).resolve().parent))

from backend.main import app
