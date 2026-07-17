"""Shared pytest fixtures for scripts/ Python CLIs."""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

SCRIPTS_DIR = Path(__file__).resolve().parent.parent
REPO_ROOT = SCRIPTS_DIR.parent

# Allow `import dsp_cli` after loading module from scripts/dsp-cli.py
sys.path.insert(0, str(SCRIPTS_DIR))


@pytest.fixture
def tmp_dsp_root(tmp_path: Path) -> Path:
    """Empty directory used as DSP project root."""
    return tmp_path


@pytest.fixture
def dsp_engine(tmp_dsp_root: Path):
    """Engine bound to a fresh temporary .dsp/ store."""
    import importlib.util

    spec = importlib.util.spec_from_file_location("dsp_cli", SCRIPTS_DIR / "dsp-cli.py")
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)

    store = module.Store(tmp_dsp_root)
    engine = module.Engine(store)
    engine.init()
    return engine
