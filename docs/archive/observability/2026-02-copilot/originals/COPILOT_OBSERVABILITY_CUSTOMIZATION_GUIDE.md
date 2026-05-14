# Copilot Observability Customization Guide

**Purpose**: Enhance the Copilot telemetry system with richer metadata, prompt management, and dataset categorization based on Phoenix/OpenInference best practices.

**Last Updated**: February 8, 2026
**Based on**: Phoenix v8.0+, OpenInference semantic conventions

---

## Table of Contents

1. [Custom Span Attributes & Metadata](#1-custom-span-attributes--metadata)
2. [Prompt Template Integration](#2-prompt-template-integration)
3. [Agent Role & System Prompt Tracking](#3-agent-role--system-prompt-tracking)
4. [Model Information Enhancement](#4-model-information-enhancement)
5. [Dataset Categorization](#5-dataset-categorization)
6. [Annotations & Evaluation](#6-annotations--evaluation)
7. [Implementation Examples](#7-implementation-examples)

---

## 1. Custom Span Attributes & Metadata

### Current Limitations

The current implementation captures basic telemetry but misses important context:

- No user/session tracking
- Limited metadata about conversation context
- No tags for filtering/categorization
- Missing prompt version information

### Phoenix Best Practices

Phoenix provides context propagation utilities for adding custom attributes:

**Available Context Setters:**

- `setSession(context, { sessionId })` - Track multi-turn conversations
- `setUser(context, { userId })` - Track different users
- `setMetadata(context, { key: value })` - Custom operational metadata
- `setTag(context, { tags: ["tag1", "tag2"] })` - Filterable keywords
- `setPromptTemplate(context, { template, version, variables })` - Prompt tracking

### Recommended Enhancements

#### A. Add Session & User Tracking

**Current Code** (`copilot_phoenix_proxy.py` line ~120):

```python
class CopilotTelemetryEvent(BaseModel):
    session_id: Optional[str] = None
    # ...
```

**Enhancement**:

```python
from opentelemetry import context
from openinference.instrumentation import setSession, setUser, setMetadata, setTag

def set_openinference_attributes(span, event: CopilotTelemetryEvent):
    """Enhanced attribute setting with context propagation."""

    # Set session context (for conversation grouping)
    if event.session_id:
        ctx = setSession(context.active(), {"sessionId": event.session_id})
        context.attach(ctx)
        span.set_attribute(SpanAttributes.SESSION_ID, event.session_id)

    # Set user context (hash for privacy as we already do)
    if event.request_id:
        user_hash = hash_user_id(event.request_id)
        ctx = setUser(context.active(), {"userId": user_hash})
        context.attach(ctx)
        span.set_attribute(SpanAttributes.USER_ID, user_hash)

    # Set custom metadata for operational context
    metadata = {
        "copilot.workspace": event.workspace,
        "copilot.event_type": event.event_type,
        "copilot.feedback": event.feedback,
    }
    if event.agent_role:
        metadata["copilot.agent_role"] = event.agent_role

    ctx = setMetadata(context.active(), metadata)
    context.attach(ctx)

    # Add metadata as span attributes (flattened)
    for key, value in metadata.items():
        if value is not None:
            span.set_attribute(f"metadata.{key}", str(value))

    # Set tags for filtering (event type, model family, etc.)
    tags = [event.event_type]
    if event.model:
        # Extract model family (e.g., "gpt-4" from "gpt-4o")
        model_family = event.model.split("-")[0] + "-" + event.model.split("-")[1]
        tags.append(f"model:{model_family}")
    if event.agent_role:
        tags.append(f"role:{event.agent_role}")
    if event.feedback:
        tags.append(f"feedback:{event.feedback}")

    ctx = setTag(context.active(), {"tags": tags})
    context.attach(ctx)
    span.set_attribute("tags", json.dumps(tags))

    # Existing attribute code...
    # (keep all your current set_attribute calls)
```

#### B. Add Tool-Related Metadata

**Enhancement for Tool Tracking**:

```python
def set_openinference_attributes(span, event: CopilotTelemetryEvent):
    # ... existing code ...

    # Tool information (OpenInference semantic conventions)
    if event.tools_available:
        span.set_attribute(
            SpanAttributes.LLM_TOOLS,
            json.dumps([
                {
                    "tool.name": tool_name,
                    "tool.description": f"Available tool: {tool_name}"
                }
                for tool_name in event.tools_available
            ])
        )

    if event.tools_used:
        # Mark which tools were actually invoked
        span.set_attribute("llm.tools_used", json.dumps(event.tools_used))
        span.set_attribute("llm.tool_count", len(event.tools_used))
```

---

## 2. Prompt Template Integration

### Why Track Prompts?

- **Version Control**: Track which prompt version produced which outputs
- **A/B Testing**: Compare prompt variants systematically
- **Reproducibility**: Re-run exact prompts from production
- **Fine-tuning**: Export prompt variations for model training

### Phoenix Prompts Feature

Phoenix v8.0+ includes:

- Prompt versioning with tags (prod/staging/dev)
- Prompt playground for testing variations
- Prompt-to-trace linkage for evaluation
- REST API for programmatic access

### Implementation Strategy

#### A. Capture Agent Instructions as Prompts

**Current Code** (`copilot_phoenix_proxy.py` line ~140):

```python
class CopilotTelemetryEvent(BaseModel):
    instructions: Optional[str] = None  # Agent instructions/system prompt
```

**Enhancement**: Store instructions as prompt template

```python
from openinference.instrumentation import setPromptTemplate

def track_prompt_template(span, event: CopilotTelemetryEvent):
    """Track agent instructions as a versioned prompt template."""

    if not event.instructions:
        return

    # Extract prompt template (system message)
    prompt_template = event.instructions

    # Build variables from context
    prompt_variables = {
        "model": event.model or "unknown",
        "agent_role": event.agent_role or "default",
        "workspace": event.workspace or "unknown"
    }

    # Add any user context
    if event.messages and len(event.messages) > 0:
        user_query = extract_user_prompt(event.messages)
        if user_query:
            prompt_variables["user_query"] = user_query[:100]  # Truncate for brevity

    # Generate version identifier based on content hash
    prompt_version = hashlib.sha256(
        (prompt_template + event.agent_role or "").encode()
    ).hexdigest()[:8]

    # Set prompt context
    ctx = setPromptTemplate(
        context.active(),
        {
            "template": prompt_template,
            "version": prompt_version,
            "variables": prompt_variables
        }
    )
    context.attach(ctx)

    # Also add as span attributes
    span.set_attribute("llm.prompt_template.template", prompt_template)
    span.set_attribute("llm.prompt_template.version", prompt_version)
    span.set_attribute(
        "llm.prompt_template.variables",
        json.dumps(prompt_variables)
    )
```

#### B. Create Prompts in Phoenix via REST API

**New Module**: `agent/observability/copilot_prompts.py`

```python
"""Prompt management for Copilot telemetry."""
import httpx
from typing import Optional, Dict, Any

PHOENIX_BASE_URL = os.getenv("PHOENIX_BASE_URL", "http://localhost:6006")

async def upsert_prompt_to_phoenix(
    name: str,
    instructions: str,
    model: str,
    agent_role: str,
    version_description: Optional[str] = None
) -> Dict[str, Any]:
    """Create or update a prompt in Phoenix."""

    prompt_payload = {
        "name": f"copilot-{agent_role.lower().replace(' ', '-')}",
        "description": f"GitHub Copilot {agent_role} instructions",
        "version": {
            "description": version_description or "Updated from telemetry",
            "modelProvider": "OPENAI",  # Adjust based on actual provider
            "modelName": model,
            "template": [
                {
                    "role": "system",
                    "content": instructions
                },
                {
                    "role": "user",
                    "content": "{{user_query}}"  # Template variable
                }
            ],
            "invocationParameters": {
                "temperature": 0.7  # Default, can be extracted from telemetry
            }
        }
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{PHOENIX_BASE_URL}/v1/prompts",
            json=prompt_payload,
            timeout=10.0
        )
        response.raise_for_status()
        return response.json()
```

**Integration in Proxy**:

```python
@app.post("/telemetry")
async def receive_telemetry(event: CopilotTelemetryEvent):
    # ... existing span creation ...

    # Store prompt in Phoenix if instructions present
    if event.instructions and event.agent_role:
        try:
            await upsert_prompt_to_phoenix(
                name=f"copilot-{event.agent_role}",
                instructions=event.instructions,
                model=event.model or "unknown",
                agent_role=event.agent_role,
                version_description=f"Captured from telemetry at {event.timestamp}"
            )
        except Exception as e:
            logger.warning(f"Failed to store prompt in Phoenix: {e}")

    # ... rest of handling ...
```

---

## 3. Agent Role & System Prompt Tracking

### Current State

The proxy captures `agent_role` and `instructions` but doesn't structure them for evaluation or replay.

### Enhancement: Structured Agent Context

```python
class AgentContext(BaseModel):
    """Structured agent context for evaluation."""
    role: str  # "workspace", "notebook", "terminal", "chat"
    system_prompt: str  # Full instructions
    capabilities: List[str]  # Enabled capabilities
    constraints: List[str]  # Restrictions/safety rules
    examples: Optional[List[Dict[str, str]]] = None  # Few-shot examples

def parse_agent_context(event: CopilotTelemetryEvent) -> AgentContext:
    """Extract structured agent context from telemetry."""

    instructions = event.instructions or ""

    # Parse instructions to extract structure
    # (This is a simplified parser - adjust based on actual format)

    capabilities = []
    if "code generation" in instructions.lower():
        capabilities.append("code_generation")
    if "debugging" in instructions.lower():
        capabilities.append("debugging")
    if "explanation" in instructions.lower():
        capabilities.append("explanation")

    constraints = []
    if "do not" in instructions.lower():
        # Extract constraints (simple heuristic)
        constraints.append("safety_guidelines" )

    return AgentContext(
        role=event.agent_role or "unknown",
        system_prompt=instructions,
        capabilities=capabilities,
        constraints=constraints
    )

def set_agent_context_attributes(span, agent_context: AgentContext):
    """Add agent context as span attributes."""
    span.set_attribute("agent.role", agent_context.role)
    span.set_attribute("agent.system_prompt", agent_context.system_prompt)
    span.set_attribute("agent.capabilities", json.dumps(agent_context.capabilities))
    span.set_attribute("agent.constraints", json.dumps(agent_context.constraints))

    if agent_context.examples:
        span.set_attribute("agent.has_examples", len(agent_context.examples))
```

---

## 4. Model Information Enhancement

### Current State

Model is captured as a string (`event.model`). Enhancement needed for:

- Model family/provider detection
- Model capability tracking
- Cost calculation per model

### Enhancement: Model Registry

**New Module**: `agent/observability/model_registry.py`

```python
"""Model registry for enhanced metadata."""
from typing import Dict, Optional
from dataclasses import dataclass

@dataclass
class ModelInfo:
    """Enhanced model information."""
    provider: str  # "openai", "anthropic", "google"
    family: str  # "gpt-4", "claude-3", "gemini"
    version: str  # "turbo", "opus", "pro"
    context_window: int
    supports_tools: bool
    supports_vision: bool
    cost_per_1k_input: float
    cost_per_1k_output: float

MODEL_REGISTRY: Dict[str, ModelInfo] = {
    "gpt-4o": ModelInfo(
        provider="openai",
        family="gpt-4",
        version="o",
        context_window=128000,
        supports_tools=True,
        supports_vision=True,
        cost_per_1k_input=0.005,  # $5.00 per 1M tokens
        cost_per_1k_output=0.015   # $15.00 per 1M tokens
    ),
    "gpt-4-turbo": ModelInfo(
        provider="openai",
        family="gpt-4",
        version="turbo",
        context_window=128000,
        supports_tools=True,
        supports_vision=True,
        cost_per_1k_input=0.01,
        cost_per_1k_output=0.03
    ),
    "gpt-3.5-turbo": ModelInfo(
        provider="openai",
        family="gpt-3.5",
        version="turbo",
        context_window=16385,
        supports_tools=True,
        supports_vision=False,
        cost_per_1k_input=0.0005,
        cost_per_1k_output=0.0015
    ),
    # Add more models as needed
}

def get_model_info(model_name: str) -> Optional[ModelInfo]:
    """Get enhanced model info from registry."""
    return MODEL_REGISTRY.get(model_name)

def calculate_cost(
    model_name: str,
    input_tokens: int,
    output_tokens: int
) -> Optional[float]:
    """Calculate cost for a model invocation."""
    model_info = get_model_info(model_name)
    if not model_info:
        return None

    input_cost = (input_tokens / 1000) * model_info.cost_per_1k_input
    output_cost = (output_tokens / 1000) * model_info.cost_per_1k_output
    return input_cost + output_cost

def set_model_attributes(span, event: CopilotTelemetryEvent):
    """Add enhanced model metadata to span."""
    if not event.model:
        return

    model_info = get_model_info(event.model)
    if model_info:
        span.set_attribute(SpanAttributes.LLM_MODEL_NAME, event.model)
        span.set_attribute("llm.model.provider", model_info.provider)
        span.set_attribute("llm.model.family", model_info.family)
        span.set_attribute("llm.model.version", model_info.version)
        span.set_attribute("llm.model.context_window", model_info.context_window)
        span.set_attribute("llm.model.supports_tools", model_info.supports_tools)
        span.set_attribute("llm.model.supports_vision", model_info.supports_vision)

        # Calculate and add cost
        if event.input_tokens and event.output_tokens:
            cost = calculate_cost(
                event.model,
                event.input_tokens,
                event.output_tokens
            )
            if cost:
                span.set_attribute("llm.usage.cost_usd", round(cost, 6))
```

---

## 5. Dataset Categorization

### Phoenix Datasets Feature

Phoenix allows:

- Adding spans to datasets via UI or API
- Categorizing examples with metadata
- Using dataset splits (train/test) for experiments
- Exporting datasets for fine-tuning

### Enhancement: Automatic Dataset Ingestion

**Goal**: Automatically add high-value spans to datasets based on criteria

**New Module**: `agent/observability/dataset_manager.py`

```python
"""Automatic dataset creation from telemetry."""
import httpx
from typing import Dict, Any, Optional

PHOENIX_BASE_URL = os.getenv("PHOENIX_BASE_URL", "http://localhost:6006")

class DatasetCriteria:
    """Criteria for auto-adding examples to datasets."""

    @staticmethod
    def is_high_quality(event: CopilotTelemetryEvent) -> bool:
        """Check if event meets quality criteria."""
        # Has user feedback
        if event.feedback == "positive":
            return True

        # Long conversations (more context)
        if event.messages and len(event.messages) >= 4:
            return True

        # Tool usage examples
        if event.tools_used and len(event.tools_used) > 0:
            return True

        return False

    @staticmethod
    def categorize(event: CopilotTelemetryEvent) -> Dict[str, str]:
        """Generate category metadata for dataset example."""
        categories = {
            "event_type": event.event_type,
            "agent_role": event.agent_role or "unknown"
        }

        # Categorize by task type
        if event.instructions:
            instructions_lower = event.instructions.lower()
            if "debug" in instructions_lower:
                categories["task_type"] = "debugging"
            elif "explain" in instructions_lower:
                categories["task_type"] = "explanation"
            elif "refactor" in instructions_lower:
                categories["task_type"] = "refactoring"
            elif "generate" in instructions_lower:
                categories["task_type"] = "generation"
            else:
                categories["task_type"] = "general"

        # Categorize by complexity
        if event.messages:
            turn_count = len([m for m in event.messages if m.role == "user"])
            if turn_count == 1:
                categories["complexity"] = "simple"
            elif turn_count < 4:
                categories["complexity"] = "moderate"
            else:
                categories["complexity"] = "complex"

        # Categorize by outcome
        if event.feedback == "positive":
            categories["outcome"] = "success"
        elif event.feedback == "negative":
            categories["outcome"] = "failure"
        elif event.error_message:
            categories["outcome"] = "error"
        else:
            categories["outcome"] = "unknown"

        return categories

async def add_to_dataset(
    span_id: str,
    event: CopilotTelemetryEvent,
    dataset_name: str = "copilot-production"
) -> Optional[Dict[str, Any]]:
    """Add telemetry event to Phoenix dataset."""

    # Extract input/output for dataset example
    input_data = {
        "user_query": extract_user_prompt(event.messages) if event.messages else "",
        "agent_role": event.agent_role,
        "instructions": event.instructions,
        "tools_available": event.tools_available or []
    }

    output_data = {
        "response": extract_assistant_response(event.messages) if event.messages else "",
        "tools_used": event.tools_used or [],
        "latency_ms": event.latency_ms,
        "tokens_used": event.total_tokens
    }

    # Add metadata for categorization
    metadata = DatasetCriteria.categorize(event)
    metadata.update({
        "span_id": span_id,
        "model": event.model,
        "timestamp": event.timestamp,
        "feedback": event.feedback,
        "workspace": event.workspace
    })

    payload = {
        "dataset_name": dataset_name,
        "examples": [
            {
                "input": input_data,
                "output": output_data,
                "metadata": metadata
            }
        ]
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{PHOENIX_BASE_URL}/v1/datasets/{dataset_name}/examples",
                json=payload,
                timeout=10.0
            )
            response.raise_for_status()
            return response.json()
    except Exception as e:
        logger.error(f"Failed to add to dataset: {e}")
        return None
```

**Integration in Proxy**:

```python
@app.post("/telemetry")
async def receive_telemetry(event: CopilotTelemetryEvent):
    with tracer.start_as_current_span(
        f"copilot.{event.event_type}.{event.agent_role or 'unknown'}"
    ) as span:
        # ... existing span setup ...

        span_id = span.get_span_context().span_id

        # Auto-add high-quality examples to dataset
        if DatasetCriteria.is_high_quality(event):
            asyncio.create_task(
                add_to_dataset(
                    span_id=str(span_id),
                    event=event,
                    dataset_name="copilot-production"
                )
            )

        # ... rest of handling ...
```

---

## 6. Annotations & Evaluation

### Phoenix Annotations Feature

Annotations = labels/scores/explanations attached to spans for evaluation

**Annotation Types:**

- **Human**: Manual feedback from users
- **LLM**: LLM-as-Judge evaluations
- **Code**: Automated checks

### Enhancement: Automatic Annotation Pipeline

**New Module**: `agent/observability/auto_annotate.py`

```python
"""Automatic annotation of spans based on rules."""
from phoenix.client import Client

phoenix_client = Client(endpoint=PHOENIX_BASE_URL)

class AutoAnnotator:
    """Automatic span annotation based on heuristics."""

    @staticmethod
    def annotate_feedback(span_id: str, event: CopilotTelemetryEvent):
        """Add human feedback as annotation."""
        if not event.feedback:
            return

        phoenix_client.annotations.add_span_annotation(
            annotation_name="user_feedback",
            annotator_kind="HUMAN",
            span_id=span_id,
            label=event.feedback,  # "positive" or "negative"
            score=1.0 if event.feedback == "positive" else 0.0,
            explanation=f"User provided {event.feedback} feedback"
        )

    @staticmethod
    def annotate_latency(span_id: str, event: CopilotTelemetryEvent):
        """Add latency-based quality annotation."""
        if not event.latency_ms:
            return

        # Define latency thresholds
        if event.latency_ms < 1000:
            label = "fast"
            score = 1.0
        elif event.latency_ms < 3000:
            label = "acceptable"
            score = 0.7
        else:
            label = "slow"
            score = 0.3

        phoenix_client.annotations.add_span_annotation(
            annotation_name="response_latency",
            annotator_kind="CODE",
            span_id=span_id,
            label=label,
            score=score,
            explanation=f"Response took {event.latency_ms}ms"
        )

    @staticmethod
    def annotate_tool_usage(span_id: str, event: CopilotTelemetryEvent):
        """Add tool usage annotation."""
        if not event.tools_used:
            return

        tool_count = len(event.tools_used)

        phoenix_client.annotations.add_span_annotation(
            annotation_name="tool_usage",
            annotator_kind="CODE",
            span_id=span_id,
            label=f"{tool_count}_tools",
            score=min(1.0, tool_count / 5.0),  # Normalize to 0-1
            explanation=f"Used {tool_count} tools: {', '.join(event.tools_used)}",
            metadata={
                "tools": event.tools_used,
                "available_tools": event.tools_available or []
            }
        )

    @staticmethod
    def annotate_error(span_id: str, event: CopilotTelemetryEvent):
        """Add error annotation."""
        if not event.error_message:
            return

        phoenix_client.annotations.add_span_annotation(
            annotation_name="execution_error",
            annotator_kind="CODE",
            span_id=span_id,
            label="error",
            score=0.0,
            explanation=f"Error: {event.error_message}",
            metadata={
                "error_code": event.error_code,
                "error_message": event.error_message
            }
        )

# Usage in proxy
async def annotate_span(span_id: str, event: CopilotTelemetryEvent):
    """Apply all relevant annotations to span."""
    AutoAnnotator.annotate_feedback(span_id, event)
    AutoAnnotator.annotate_latency(span_id, event)
    AutoAnnotator.annotate_tool_usage(span_id, event)
    AutoAnnotator.annotate_error(span_id, event)
```

---

## 7. Implementation Examples

### Complete Enhanced Telemetry Handler

**File**: `agent/observability/copilot_phoenix_proxy.py` (enhanced)

```python
@app.post("/telemetry")
async def receive_telemetry(event: CopilotTelemetryEvent):
    """Enhanced telemetry endpoint with full Phoenix integration."""

    with tracer.start_as_current_span(
        f"copilot.{event.event_type}.{event.agent_role or 'unknown'}"
    ) as span:
        try:
            # 1. Set core OpenInference attributes (existing)
            set_openinference_attributes(span, event)

            # 2. Add enhanced context propagation (NEW)
            set_enhanced_context(span, event)

            # 3. Track prompt template (NEW)
            if event.instructions:
                track_prompt_template(span, event)

            # 4. Add agent context (NEW)
            agent_context = parse_agent_context(event)
            set_agent_context_attributes(span, agent_context)

            # 5. Add model metadata (NEW)
            set_model_attributes(span, event)

            # 6. Mark span status
            if event.error_message:
                span.set_status(Status(StatusCode.ERROR, event.error_message))
            else:
                span.set_status(Status(StatusCode.OK))

            # Get span ID for post-processing
            span_id = str(span.get_span_context().span_id)

            # 7. Background tasks (non-blocking)
            background_tasks = []

            # Store prompt in Phoenix if new instructions
            if event.instructions and event.agent_role:
                background_tasks.append(
                    upsert_prompt_to_phoenix(
                        name=f"copilot-{event.agent_role}",
                        instructions=event.instructions,
                        model=event.model or "unknown",
                        agent_role=event.agent_role
                    )
                )

            # Add to dataset if high quality
            if DatasetCriteria.is_high_quality(event):
                background_tasks.append(
                    add_to_dataset(span_id, event)
                )

            # Add annotations
            background_tasks.append(
                annotate_span(span_id, event)
            )

            # Execute background tasks
            for task in background_tasks:
                asyncio.create_task(task)

            # Increment success counter
            request_count["success"] += 1

            return {
                "status": "success",
                "message": "Telemetry received and forwarded to Phoenix",
                "event_type": event.event_type,
                "request_id": event.request_id,
                "span_id": span_id,
                "enhancements_applied": [
                    "context_propagation",
                    "prompt_tracking",
                    "agent_context",
                    "model_metadata",
                    "dataset_ingestion" if DatasetCriteria.is_high_quality(event) else None,
                    "annotations"
                ]
            }

        except Exception as e:
            logger.error(f"Error processing telemetry: {e}", exc_info=True)
            span.set_status(Status(StatusCode.ERROR, str(e)))
            span.record_exception(e)
            request_count["error"] += 1
            raise HTTPException(status_code=500, detail=str(e))

def set_enhanced_context(span, event: CopilotTelemetryEvent):
    """Apply all context propagation utilities."""
    from opentelemetry import context as otel_context
    from openinference.instrumentation import (
        setSession, setUser, setMetadata, setTag
    )

    # Session tracking
    if event.session_id:
        ctx = setSession(otel_context.active(), {"sessionId": event.session_id})
        otel_context.attach(ctx)

    # User tracking (hashed)
    if event.request_id:
        user_hash = hash_user_id(event.request_id)
        ctx = setUser(otel_context.active(), {"userId": user_hash})
        otel_context.attach(ctx)

    # Metadata
    metadata = {
        "copilot.workspace": event.workspace,
        "copilot.event_type": event.event_type,
        "copilot.agent_role": event.agent_role,
        "copilot.feedback": event.feedback
    }
    ctx = setMetadata(otel_context.active(), {k: v for k, v in metadata.items() if v})
    otel_context.attach(ctx)

    # Tags for filtering
    tags = [event.event_type]
    if event.model:
        tags.append(f"model:{event.model.split('-')[0]}")
    if event.agent_role:
        tags.append(f"role:{event.agent_role}")
    if event.feedback:
        tags.append(f"feedback:{event.feedback}")

    ctx = setTag(otel_context.active(), {"tags": tags})
    otel_context.attach(ctx)
```

### Configuration Updates

**File**: `.env`

```bash
# Existing
PHOENIX_COLLECTOR_ENDPOINT=http://phoenix:6006/v1/traces
PHOENIX_PROJECT_NAME=copilot-research

# New additions for enhancements
PHOENIX_BASE_URL=http://phoenix:6006
PHOENIX_AUTO_DATASET=true
PHOENIX_AUTO_ANNOTATE=true
PHOENIX_AUTO_PROMPT_STORE=true
COPILOT_DEFAULT_MODEL=gpt-4o
```

### Updated Requirements

**File**: `agent/requirements-phoenix.txt`

```txt
# Existing
fastapi==0.124.0
uvicorn[standard]==0.38.0
opentelemetry-api==1.38.0
opentelemetry-sdk==1.38.0
opentelemetry-exporter-otlp==1.38.0
openinference-semantic-conventions==0.1.9
pydantic==2.11.8

# New additions
arize-phoenix-client>=1.0.0  # For REST API calls
openinference-instrumentation>=0.1.0  # For context utilities
httpx==0.27.2  # For async HTTP
```

---

## Summary of Enhancements

### 🎯 Implemented Features

1. **Context Propagation** - Session, user, metadata, tags via OpenInference utilities
2. **Prompt Management** - Auto-store instructions as versioned prompts in Phoenix
3. **Agent Context Tracking** - Structured agent role, capabilities, constraints
4. **Model Registry** - Enhanced model metadata including cost calculation
5. **Dataset Auto-Ingestion** - Automatically add high-quality examples with categories
6. **Automatic Annotations** - Code-based annotations for latency, tools, errors, feedback

### 📊 Benefits

- **Better Filtering**: Use tags to filter traces (model, role, feedback)
- **Reproducibility**: Track exact prompts and agent configs used
- **Evaluation Ready**: Automatic annotations enable batch evaluation
- **Cost Tracking**: Calculate spend per model/agent role
- **Dataset Growth**: Production data automatically flows into datasets
- **Prompt Evolution**: Track how instructions change over time

### 🚀 Next Steps

1. **Deploy Enhanced Proxy**: Update `copilot_phoenix_proxy.py` with enhancements
2. **Create Prompts**: Run proxy to auto-generate prompts from telemetry
3. **Review Datasets**: Check Phoenix UI for auto-populated datasets
4. **Add Evaluators**: Define custom evaluators for dataset experiments
5. **Monitor Costs**: Track spending by model/agent via dashboards

---

**Questions or need clarification?** This guide provides comprehensive customization options - you can implement them selectively based on your priorities.
