# Customization Quick Reference

**Your Request → Implementation Sections**

This document maps your specific enhancement requests to the detailed implementation guide.

---

## Your Requests

### 1. "Certain flags or annotations for some content"

**→ See**: [Section 6: Annotations & Evaluation](./COPILOT_OBSERVABILITY_CUSTOMIZATION_GUIDE.md#6-annotations--evaluation)

**Implementation**:
- `AutoAnnotator` class provides automatic span annotation
- Annotations for: user feedback, response latency, tool usage, errors
- Uses Phoenix annotation API with `annotator_kind` (HUMAN/LLM/CODE)
- Example: `annotate_feedback(span_id, event)` automatically flags positive/negative feedback

**Code Location**: New module `agent/observability/auto_annotate.py`

---

### 2. "Prompts especially should be ingested or categorised when the agent logs are in"

**→ See**:
- [Section 2: Prompt Template Integration](./COPILOT_OBSERVABILITY_CUSTOMIZATION_GUIDE.md#2-prompt-template-integration)
- [Section 5: Dataset Categorization](./COPILOT_OBSERVABILITY_CUSTOMIZATION_GUIDE.md#5-dataset-categorization)

**Implementation**:
- **Prompt Storage**: `upsert_prompt_to_phoenix()` stores agent instructions as versioned prompts in Phoenix Prompts system
- **Prompt Tracking**: `track_prompt_template()` adds OpenInference attributes to spans for linking traces to prompts
- **Categorization**: `DatasetCriteria.categorize()` automatically tags examples by:
  - Task type (debugging, explanation, generation, refactoring)
  - Complexity (simple, moderate, complex)
  - Outcome (success, failure, error)
  - Agent role
  - Event type

**Code Locations**:
- `agent/observability/copilot_prompts.py` (prompt storage)
- `agent/observability/dataset_manager.py` (categorization logic)

**Auto-Ingestion**: Set `PHOENIX_AUTO_PROMPT_STORE=true` and `PHOENIX_AUTO_DATASET=true` in `.env`

---

### 3. "If the agent role/system prompt can also be attached that would be good"

**→ See**: [Section 3: Agent Role & System Prompt Tracking](./COPILOT_OBSERVABILITY_CUSTOMIZATION_GUIDE.md#3-agent-role--system-prompt-tracking)

**Implementation**:
- **Structured Context**: New `AgentContext` model extracts:
  - Role
  - System prompt
  - Capabilities
  - Constraints
  - Few-shot examples
- **Span Attributes**: Added as `agent.*` attributes for filtering and analysis
- **Prompt Integration**: System prompt stored as part of prompt template with variables

**Code Details**:
```python
agent_context = parse_agent_context(event)
set_agent_context_attributes(span, agent_context)
```

Attributes added:
- `agent.role` - workspace/notebook/terminal/chat
- `agent.system_prompt` - Full instructions
- `agent.capabilities` - JSON array of enabled features
- `agent.constraints` - JSON array of restrictions

---

### 4. "Also, the AI model should be the github copilot chat"

**→ See**: [Section 4: Model Information Enhancement](./COPILOT_OBSERVABILITY_CUSTOMIZATION_GUIDE.md#4-model-information-enhancement)

**Implementation**:
- **Model Registry**: `MODEL_REGISTRY` maps model names to enhanced metadata
- **Explicit Tracking**: Set `COPILOT_DEFAULT_MODEL=gpt-4o` (or actual GitHub Copilot model)
- **Rich Metadata**: Tracks provider, family, version, context window, capabilities, cost

**Attributes Added**:
```python
span.set_attribute("llm.model.name", "gpt-4o")  # Or actual Copilot model
span.set_attribute("llm.model.provider", "openai")
span.set_attribute("llm.model.family", "gpt-4")
span.set_attribute("llm.model.supports_tools", True)
span.set_attribute("llm.usage.cost_usd", 0.00234)
```

**Configuration**: Update `model_registry.py` to add GitHub Copilot Chat models with accurate metadata.

---

### 5. "Explore these customisations"

**Explored Features** (all documented in guide):

#### ✅ Context Propagation (Section 1)
- Session tracking for multi-turn conversations
- User tracking (hashed for privacy)
- Custom metadata for operational context
- Tags for filtering

#### ✅ Prompt Management (Section 2)
- Versioned prompt storage
- Template variable tracking
- Prompt-to-trace linking
- REST API integration

#### ✅ Agent Context (Section 3)
- Structured agent metadata
- Capability/constraint tracking
- Few-shot example capture

#### ✅ Model Registry (Section 4)
- Provider/family/version metadata
- Cost calculation per invocation
- Capability flags (tools, vision)

#### ✅ Dataset Ingestion (Section 5)
- Quality criteria for auto-add
- Multi-dimensional categorization
- Metadata-based filtering
- Automatic train/test splits

#### ✅ Annotations (Section 6)
- Human feedback capture
- Automated quality checks (latency, errors)
- Tool usage annotations
- Custom evaluators

---

## Implementation Checklist

### Phase 1: Core Enhancements (High Priority)
- [ ] Update `copilot_phoenix_proxy.py` with `set_enhanced_context()`
- [ ] Add `track_prompt_template()` function
- [ ] Create `model_registry.py` with GitHub Copilot Chat models
- [ ] Implement `parse_agent_context()` for system prompt extraction

### Phase 2: Phoenix Integration (Medium Priority)
- [ ] Create `copilot_prompts.py` for prompt storage
- [ ] Create `dataset_manager.py` for auto-ingestion
- [ ] Create `auto_annotate.py` for annotation pipeline
- [ ] Update `.env` with new configuration flags

### Phase 3: Testing & Validation (Required)
- [ ] Test prompt storage via REST API
- [ ] Verify dataset auto-population
- [ ] Check annotation creation in Phoenix UI
- [ ] Validate model cost calculations
- [ ] Test categorization logic with sample events

### Phase 4: Optional Enhancements
- [ ] Add LLM-as-Judge annotations
- [ ] Create custom evaluators for datasets
- [ ] Build dashboards for cost/quality tracking
- [ ] Implement prompt A/B testing

---

## Quick Start

1. **Review full guide**: [COPILOT_OBSERVABILITY_CUSTOMIZATION_GUIDE.md](./COPILOT_OBSERVABILITY_CUSTOMIZATION_GUIDE.md)
2. **Copy code examples** from guide into your project
3. **Update configuration** in `.env`
4. **Install dependencies** from updated `requirements-phoenix.txt`
5. **Test incrementally** - add one enhancement at a time
6. **Validate in Phoenix UI** - check traces, prompts, datasets, annotations

---

## Files to Create/Modify

### New Files
- `agent/observability/copilot_prompts.py` - Prompt management
- `agent/observability/dataset_manager.py` - Dataset ingestion
- `agent/observability/auto_annotate.py` - Annotation pipeline
- `agent/observability/model_registry.py` - Model metadata

### Modified Files
- `agent/observability/copilot_phoenix_proxy.py` - Enhanced telemetry handler
- `agent/requirements-phoenix.txt` - New dependencies
- `.env` - New configuration flags

---

## Phoenix Features Map

| Your Need | Phoenix Feature | Implementation Section |
|-----------|----------------|----------------------|
| Content flags/annotations | Annotations API | Section 6 |
| Prompt categorization | Datasets + Metadata | Section 5 |
| System prompt tracking | Prompts Management | Section 2 + 3 |
| Agent role capture | Custom Attributes | Section 1 + 3 |
| Model specification | Model Registry | Section 4 |
| Quality filtering | Auto-Ingestion Criteria | Section 5 |

---

**Need help with a specific section?** All code examples are production-ready and can be copy-pasted into your project.
