"""Test configuration for message ingestion tests"""

import sys
from pathlib import Path

# Add agent directory to path
agent_dir = Path(__file__).parent.parent.parent / "agent"
sys.path.insert(0, str(agent_dir))
