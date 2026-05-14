"""Permission management system for agent actions.

Integrates patterns from OpenWork for granular permission controls.
Ensures safe AI agent operations, especially for sensitive data and destructive actions.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Set

from google.adk.tools import ToolContext


class PermissionLevel(str, Enum):
    """Permission levels for agent actions."""

    READ = "read"  # Read-only operations (safe)
    WRITE = "write"  # Write operations (modify state)
    EXECUTE = "execute"  # Code execution
    NETWORK = "network"  # Network access
    DESTRUCTIVE = "destructive"  # Destructive operations (delete, clear)
    FILE_SYSTEM = "file_system"  # File system access


@dataclass
class PermissionRequest:
    """A request for permission to perform an action."""

    tool_name: str
    level: PermissionLevel
    description: str
    context: Dict[str, Any]
    auto_approve: bool = False


@dataclass
class PermissionPolicy:
    """Permission policy configuration."""

    # Set of permission levels that are auto-approved
    auto_approve_levels: Set[PermissionLevel]

    # Set of specific tools that are always auto-approved
    auto_approve_tools: Set[str]

    # Set of specific tools that are always denied
    deny_tools: Set[str]

    # Whether to default to approval or denial for unknown cases
    default_allow: bool = False


class PermissionManager:
    """Manages permission requests and policies."""

    def __init__(self, policy: Optional[PermissionPolicy] = None):
        """Initialize permission manager.

        Args:
            policy: Permission policy (defaults to development policy)
        """
        if policy is None:
            # Development policy: auto-approve read operations
            policy = PermissionPolicy(
                auto_approve_levels={PermissionLevel.READ},
                auto_approve_tools=set(),
                deny_tools=set(),
                default_allow=True,  # Development mode
            )

        self.policy = policy
        self.pending_requests: List[PermissionRequest] = []
        self.approved_requests: List[PermissionRequest] = []
        self.denied_requests: List[PermissionRequest] = []

    def request_permission(
        self,
        tool_name: str,
        level: PermissionLevel,
        description: str,
        context: Dict[str, Any],
    ) -> bool:
        """Request permission for an action.

        Args:
            tool_name: Name of the tool requesting permission
            level: Permission level required
            description: Human-readable description of the action
            context: Additional context (e.g., parameters)

        Returns:
            True if permission granted, False otherwise
        """
        request = PermissionRequest(
            tool_name=tool_name,
            level=level,
            description=description,
            context=context,
        )

        # Check deny list first
        if tool_name in self.policy.deny_tools:
            self.denied_requests.append(request)
            return False

        # Check auto-approve conditions
        if self._should_auto_approve(request):
            request.auto_approve = True
            self.approved_requests.append(request)
            return True

        # Add to pending requests for user review
        self.pending_requests.append(request)

        # In development mode, auto-approve if default_allow is True
        if self.policy.default_allow:
            return self.approve_request(request)

        return False

    def _should_auto_approve(self, request: PermissionRequest) -> bool:
        """Check if a request should be auto-approved.

        Args:
            request: Permission request

        Returns:
            True if should auto-approve
        """
        # Check if tool is in auto-approve list
        if request.tool_name in self.policy.auto_approve_tools:
            return True

        # Check if permission level is auto-approved
        if request.level in self.policy.auto_approve_levels:
            return True

        return False

    def approve_request(self, request: PermissionRequest) -> bool:
        """Approve a pending permission request.

        Args:
            request: Permission request to approve

        Returns:
            True if approved successfully
        """
        if request in self.pending_requests:
            self.pending_requests.remove(request)
            self.approved_requests.append(request)
            return True
        return False

    def deny_request(self, request: PermissionRequest) -> bool:
        """Deny a pending permission request.

        Args:
            request: Permission request to deny

        Returns:
            True if denied successfully
        """
        if request in self.pending_requests:
            self.pending_requests.remove(request)
            self.denied_requests.append(request)
            return True
        return False

    def get_pending_requests(self) -> List[PermissionRequest]:
        """Get all pending permission requests."""
        return self.pending_requests.copy()

    def clear_history(self):
        """Clear approved and denied request history."""
        self.approved_requests.clear()
        self.denied_requests.clear()

    def save_policy(self, path: Path):
        """Save permission policy to JSON file.

        Args:
            path: Path to save policy
        """
        policy_dict = {
            "auto_approve_levels": [level.value for level in self.policy.auto_approve_levels],
            "auto_approve_tools": list(self.policy.auto_approve_tools),
            "deny_tools": list(self.policy.deny_tools),
            "default_allow": self.policy.default_allow,
        }
        path.write_text(json.dumps(policy_dict, indent=2))

    @classmethod
    def load_policy(cls, path: Path) -> PermissionManager:
        """Load permission policy from JSON file.

        Args:
            path: Path to load policy from

        Returns:
            PermissionManager with loaded policy
        """
        policy_dict = json.loads(path.read_text())
        policy = PermissionPolicy(
            auto_approve_levels={
                PermissionLevel(level) for level in policy_dict["auto_approve_levels"]
            },
            auto_approve_tools=set(policy_dict["auto_approve_tools"]),
            deny_tools=set(policy_dict["deny_tools"]),
            default_allow=policy_dict["default_allow"],
        )
        return cls(policy=policy)


# Global permission manager instance
_permission_manager: Optional[PermissionManager] = None


def get_permission_manager() -> PermissionManager:
    """Get or create the global permission manager."""
    global _permission_manager
    if _permission_manager is None:
        _permission_manager = PermissionManager()
    return _permission_manager


def requires_permission(
    level: PermissionLevel, description: Optional[str] = None
) -> Callable:
    """Decorator to require permission for a tool function.

    Args:
        level: Permission level required
        description: Optional description (uses docstring if not provided)

    Returns:
        Decorator function
    """

    def decorator(func: Callable) -> Callable:
        def wrapper(tool_context: ToolContext, *args, **kwargs):
            manager = get_permission_manager()
            tool_name = func.__name__
            desc = description or func.__doc__ or f"Execute {tool_name}"

            # Request permission
            granted = manager.request_permission(
                tool_name=tool_name,
                level=level,
                description=desc,
                context={"args": args, "kwargs": kwargs},
            )

            if not granted:
                # Store pending request in tool_context state for frontend
                if "pending_permissions" not in tool_context.state:
                    tool_context.state["pending_permissions"] = []

                tool_context.state["pending_permissions"].append(
                    {
                        "tool_name": tool_name,
                        "level": level.value,
                        "description": desc,
                        "status": "pending",
                    }
                )

                return {
                    "status": "permission_denied",
                    "message": f"Permission required: {desc}",
                    "level": level.value,
                }

            # Execute the tool
            return func(tool_context, *args, **kwargs)

        return wrapper

    return decorator


# Production permission policy
def create_production_policy() -> PermissionManager:
    """Create a production permission policy with strict controls."""
    policy = PermissionPolicy(
        auto_approve_levels={PermissionLevel.READ},  # Only auto-approve reads
        auto_approve_tools={"health_check", "list_toolsets"},  # Safe tools
        deny_tools=set(),  # No blanket denials
        default_allow=False,  # Require explicit approval
    )
    return PermissionManager(policy=policy)
