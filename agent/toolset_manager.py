"""
Toolset Management for ModMe GenUI Agent

This module provides functions for loading, validating, and resolving toolsets
based on the GitHub MCP server pattern.

Features:
- Load toolsets from JSON configuration
- Resolve deprecated toolset names via aliases
- Log deprecation warnings to stderr
- Dynamic toolset registration
"""

import json
import sys
from pathlib import Path
from typing import Dict, List, Optional, Any
from datetime import datetime
import logging

# Configure logging
logger = logging.getLogger(__name__)

# Paths
AGENT_DIR = Path(__file__).parent
TOOLSETS_FILE = AGENT_DIR / "toolsets.json"
ALIASES_FILE = AGENT_DIR / "toolset_aliases.json"


class ToolsetManager:
    """Manages toolset loading, validation, and deprecation resolution."""
    
    def __init__(self):
        self.toolsets: Dict[str, Dict] = {}
        self.aliases: Dict[str, str] = {}
        self.deprecation_metadata: Dict[str, Dict] = {}
        self._load_configuration()
    
    def _load_configuration(self):
        """Load toolsets and aliases from JSON files."""
        # Load toolsets
        if TOOLSETS_FILE.exists():
            try:
                with open(TOOLSETS_FILE, 'r') as f:
                    config = json.load(f)
                    for toolset in config.get('toolsets', []):
                        self.toolsets[toolset['id']] = toolset
                logger.info(f"Loaded {len(self.toolsets)} toolsets from {TOOLSETS_FILE}")
            except Exception as e:
                logger.error(f"Failed to load toolsets: {e}")
        
        # Load aliases
        if ALIASES_FILE.exists():
            try:
                with open(ALIASES_FILE, 'r') as f:
                    config = json.load(f)
                    self.aliases = config.get('aliases', {})
                    self.deprecation_metadata = config.get('deprecation_metadata', {})
                logger.info(f"Loaded {len(self.aliases)} deprecation aliases")
            except Exception as e:
                logger.error(f"Failed to load aliases: {e}")
    
    def resolve_toolset(self, toolset_id: str) -> Optional[str]:
        """
        Resolve toolset ID, handling deprecated names via aliases.
        
        If toolset_id is deprecated, returns canonical name and logs warning.
        Otherwise, returns toolset_id unchanged.
        
        Args:
            toolset_id: Toolset identifier (may be deprecated name)
            
        Returns:
            Canonical toolset ID, or None if not found
        """
        # Check if this is a deprecated name
        if toolset_id in self.aliases:
            canonical_id = self.aliases[toolset_id]
            self._log_deprecation_warning(toolset_id, canonical_id)
            return canonical_id
        
        # Return as-is if it exists
        if toolset_id in self.toolsets:
            return toolset_id
        
        logger.warning(f"Toolset not found: {toolset_id}")
        return None
    
    def _log_deprecation_warning(self, old_id: str, new_id: str):
        """
        Log deprecation warning to stderr (GitHub MCP pattern).
        
        Args:
            old_id: Deprecated toolset name
            new_id: Canonical toolset name
        """
        metadata = self.deprecation_metadata.get(old_id, {})
        removal_date = metadata.get('removal_date', 'unknown')
        reason = metadata.get('reason', 'Toolset deprecated')
        migration_guide = metadata.get('migration_guide', '')
        
        warning = (
            f"\n⚠️  Toolset '{old_id}' is deprecated. Use '{new_id}' instead.\n"
            f"    Reason: {reason}\n"
            f"    Removal planned for: {removal_date}\n"
        )
        
        if migration_guide:
            warning += f"    See migration guide: {migration_guide}\n"
        
        # Write to stderr (standard for deprecation warnings)
        sys.stderr.write(warning)
        sys.stderr.flush()
    
    def get_toolset(self, toolset_id: str) -> Optional[Dict]:
        """
        Get toolset definition by ID.
        
        Args:
            toolset_id: Toolset identifier (may be deprecated name)
            
        Returns:
            Toolset definition dict, or None if not found
        """
        canonical_id = self.resolve_toolset(toolset_id)
        if canonical_id:
            return self.toolsets.get(canonical_id)
        return None
    
    def list_toolsets(self, include_deprecated: bool = False) -> List[Dict]:
        """
        List all available toolsets.
        
        Args:
            include_deprecated: Whether to include deprecated toolsets
            
        Returns:
            List of toolset definitions
        """
        toolsets = list(self.toolsets.values())
        
        if not include_deprecated:
            toolsets = [
                ts for ts in toolsets
                if not ts.get('metadata', {}).get('deprecated', False)
            ]
        
        return toolsets
    
    def get_toolset_tools(self, toolset_id: str) -> List[str]:
        """
        Get list of tool names in a toolset.
        
        Args:
            toolset_id: Toolset identifier
            
        Returns:
            List of tool names, or empty list if toolset not found
        """
        toolset = self.get_toolset(toolset_id)
        if toolset:
            return toolset.get('tools', [])
        return []
    
    def is_deprecated(self, toolset_id: str) -> bool:
        """
        Check if a toolset is deprecated.
        
        Args:
            toolset_id: Toolset identifier
            
        Returns:
            True if deprecated, False otherwise
        """
        return toolset_id in self.aliases
    
    def get_deprecation_info(self, toolset_id: str) -> Optional[Dict]:
        """
        Get deprecation metadata for a toolset.
        
        Args:
            toolset_id: Deprecated toolset identifier
            
        Returns:
            Deprecation metadata dict, or None if not deprecated
        """
        return self.deprecation_metadata.get(toolset_id)


# Global manager instance
_toolset_manager: Optional[ToolsetManager] = None


def get_toolset_manager() -> ToolsetManager:
    """Get or create global ToolsetManager instance."""
    global _toolset_manager
    if _toolset_manager is None:
        _toolset_manager = ToolsetManager()
    return _toolset_manager


# Convenience functions
def resolve_toolset(toolset_id: str) -> Optional[str]:
    """Resolve toolset ID (convenience function)."""
    return get_toolset_manager().resolve_toolset(toolset_id)


def get_toolset(toolset_id: str) -> Optional[Dict]:
    """Get toolset definition (convenience function)."""
    return get_toolset_manager().get_toolset(toolset_id)


def list_toolsets(include_deprecated: bool = False) -> List[Dict]:
    """List all toolsets (convenience function)."""
    return get_toolset_manager().list_toolsets(include_deprecated)


def get_toolset_tools(toolset_id: str) -> List[str]:
    """Get tools in toolset (convenience function)."""
    return get_toolset_manager().get_toolset_tools(toolset_id)


# Example usage in agent startup
def initialize_toolsets():
    """Initialize toolset system on agent startup."""
    manager = get_toolset_manager()
    logger.info(f"Toolset system initialized with {len(manager.toolsets)} toolsets")
    
    if manager.aliases:
        logger.info(f"Loaded {len(manager.aliases)} deprecation aliases:")
        for old_id, new_id in manager.aliases.items():
            logger.info(f"  {old_id} -> {new_id}")


if __name__ == "__main__":
    # Test toolset loading
    initialize_toolsets()
    
    manager = get_toolset_manager()
    
    print("\n=== Available Toolsets ===")
    for toolset in manager.list_toolsets():
        print(f"\nID: {toolset['id']}")
        print(f"Name: {toolset['name']}")
        print(f"Description: {toolset['description']}")
        print(f"Tools: {', '.join(toolset['tools'])}")
    
    print("\n=== Testing Deprecation Resolution ===")
    # Test with a deprecated name (if any exist)
    if manager.aliases:
        old_name = list(manager.aliases.keys())[0]
        print(f"\nResolving deprecated toolset: {old_name}")
        canonical = manager.resolve_toolset(old_name)
        print(f"Resolved to: {canonical}")
