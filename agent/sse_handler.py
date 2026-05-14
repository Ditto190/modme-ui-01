"""Server-Sent Events (SSE) handler for real-time agent updates.

Integrates patterns from OpenWork for streaming agent progress,
intermediate results, and thinking steps to the frontend.
"""

from __future__ import annotations

import asyncio
import json
from datetime import datetime
from typing import Any, AsyncIterator, Dict, List, Optional
from uuid import uuid4

from fastapi import Request
from fastapi.responses import StreamingResponse


class SSEMessage:
    """A Server-Sent Event message."""

    def __init__(
        self,
        event: str,
        data: Dict[str, Any],
        id: Optional[str] = None,
        retry: Optional[int] = None,
    ):
        """Initialize SSE message.

        Args:
            event: Event type
            data: Event data (will be JSON serialized)
            id: Optional event ID
            retry: Optional retry interval in milliseconds
        """
        self.event = event
        self.data = data
        self.id = id or str(uuid4())
        self.retry = retry
        self.timestamp = datetime.utcnow().isoformat()

    def format(self) -> str:
        """Format message as SSE protocol string."""
        lines = []

        if self.id:
            lines.append(f"id: {self.id}")

        if self.event:
            lines.append(f"event: {self.event}")

        if self.retry:
            lines.append(f"retry: {self.retry}")

        # Add timestamp to data
        data_with_timestamp = {**self.data, "timestamp": self.timestamp}
        data_json = json.dumps(data_with_timestamp)
        lines.append(f"data: {data_json}")

        lines.append("")  # Empty line to mark end of message
        return "\n".join(lines) + "\n"


class SSEEventBus:
    """Event bus for managing SSE connections and broadcasting events."""

    def __init__(self):
        """Initialize event bus."""
        self.subscribers: Dict[str, List[asyncio.Queue]] = {}
        self.message_history: List[SSEMessage] = []
        self.max_history = 100

    async def subscribe(self, channel: str = "default") -> AsyncIterator[SSEMessage]:
        """Subscribe to SSE events on a channel.

        Args:
            channel: Channel name

        Yields:
            SSE messages
        """
        queue: asyncio.Queue = asyncio.Queue()

        # Register subscriber
        if channel not in self.subscribers:
            self.subscribers[channel] = []
        self.subscribers[channel].append(queue)

        try:
            # Send recent history to new subscriber
            for msg in self.message_history[-10:]:  # Last 10 messages
                yield msg

            # Stream new messages
            while True:
                msg = await queue.get()
                yield msg

        finally:
            # Cleanup on disconnect
            self.subscribers[channel].remove(queue)
            if not self.subscribers[channel]:
                del self.subscribers[channel]

    async def publish(self, message: SSEMessage, channel: str = "default"):
        """Publish an SSE message to a channel.

        Args:
            message: SSE message to publish
            channel: Channel name
        """
        # Add to history
        self.message_history.append(message)
        if len(self.message_history) > self.max_history:
            self.message_history.pop(0)

        # Broadcast to all subscribers on channel
        if channel in self.subscribers:
            for queue in self.subscribers[channel]:
                await queue.put(message)

    async def publish_tool_start(
        self, tool_name: str, args: Dict[str, Any], channel: str = "default"
    ):
        """Publish tool execution start event.

        Args:
            tool_name: Name of the tool
            args: Tool arguments
            channel: Channel name
        """
        msg = SSEMessage(
            event="tool_start",
            data={"tool_name": tool_name, "args": args, "status": "started"},
        )
        await self.publish(msg, channel)

    async def publish_tool_progress(
        self, tool_name: str, progress: str, channel: str = "default"
    ):
        """Publish tool execution progress event.

        Args:
            tool_name: Name of the tool
            progress: Progress message
            channel: Channel name
        """
        msg = SSEMessage(
            event="tool_progress",
            data={"tool_name": tool_name, "progress": progress, "status": "running"},
        )
        await self.publish(msg, channel)

    async def publish_tool_complete(
        self, tool_name: str, result: Dict[str, Any], channel: str = "default"
    ):
        """Publish tool execution complete event.

        Args:
            tool_name: Name of the tool
            result: Tool result
            channel: Channel name
        """
        msg = SSEMessage(
            event="tool_complete",
            data={"tool_name": tool_name, "result": result, "status": "completed"},
        )
        await self.publish(msg, channel)

    async def publish_tool_error(
        self, tool_name: str, error: str, channel: str = "default"
    ):
        """Publish tool execution error event.

        Args:
            tool_name: Name of the tool
            error: Error message
            channel: Channel name
        """
        msg = SSEMessage(
            event="tool_error",
            data={"tool_name": tool_name, "error": error, "status": "error"},
        )
        await self.publish(msg, channel)

    async def publish_agent_thinking(
        self, thought: str, channel: str = "default"
    ):
        """Publish agent thinking/reasoning event.

        Args:
            thought: Thought or reasoning step
            channel: Channel name
        """
        msg = SSEMessage(
            event="agent_thinking", data={"thought": thought, "status": "thinking"}
        )
        await self.publish(msg, channel)

    async def publish_state_update(
        self, state: Dict[str, Any], channel: str = "default"
    ):
        """Publish state update event.

        Args:
            state: Updated state
            channel: Channel name
        """
        msg = SSEMessage(event="state_update", data={"state": state})
        await self.publish(msg, channel)


# Global event bus instance
_event_bus: Optional[SSEEventBus] = None


def get_event_bus() -> SSEEventBus:
    """Get or create the global SSE event bus."""
    global _event_bus
    if _event_bus is None:
        _event_bus = SSEEventBus()
    return _event_bus


async def sse_stream(request: Request, channel: str = "default") -> StreamingResponse:
    """Create SSE streaming response.

    Args:
        request: FastAPI request
        channel: Channel to subscribe to

    Returns:
        StreamingResponse with SSE stream
    """
    event_bus = get_event_bus()

    async def event_generator():
        """Generate SSE events."""
        try:
            async for message in event_bus.subscribe(channel):
                # Check if client disconnected
                if await request.is_disconnected():
                    break

                yield message.format()

        except asyncio.CancelledError:
            # Client disconnected
            pass

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable buffering in nginx
        },
    )


def sse_enabled(func):
    """Decorator to enable SSE events for a tool function."""

    async def async_wrapper(tool_context, *args, **kwargs):
        event_bus = get_event_bus()
        tool_name = func.__name__

        # Publish tool start
        await event_bus.publish_tool_start(
            tool_name=tool_name, args={"args": args, "kwargs": kwargs}
        )

        try:
            # Execute tool
            result = func(tool_context, *args, **kwargs)

            # Handle async functions
            if asyncio.iscoroutine(result):
                result = await result

            # Publish tool complete
            await event_bus.publish_tool_complete(tool_name=tool_name, result=result)

            return result

        except Exception as e:
            # Publish tool error
            await event_bus.publish_tool_error(tool_name=tool_name, error=str(e))
            raise

    def sync_wrapper(tool_context, *args, **kwargs):
        # For synchronous execution, run async wrapper in event loop
        try:
            loop = asyncio.get_event_loop()
            return loop.run_until_complete(
                async_wrapper(tool_context, *args, **kwargs)
            )
        except RuntimeError:
            # No event loop, just execute without SSE
            return func(tool_context, *args, **kwargs)

    return sync_wrapper
