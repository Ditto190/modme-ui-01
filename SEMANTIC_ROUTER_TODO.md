# Semantic Router Integration Roadmap

## Overview

This document outlines the phased integration of semantic routing into the ModMe GenUI Workbench. The router provides intelligent intent classification for multi-agent orchestration, enabling sophisticated query routing and agent coordination.

---

## Phase 1: Core Infrastructure ✅ (COMPLETED)

**Timeline**: Initial PR  
**Status**: ✅ COMPLETE

### Completed Tasks

- [x] Install semantic-router dependencies in pyproject.toml
- [x] Create route definitions with 8 agent types (agent/routes/definitions.py)
- [x] Implement ModMeSemanticRouter class with singleton pattern (agent/routes/router.py)
- [x] Add routes package initialization (agent/routes/**init**.py)
- [x] Create comprehensive documentation (agent/routes/README.md)
- [x] Set up test infrastructure (agent/tests/**init**.py)
- [x] Implement test suite with >80% coverage (agent/tests/test_semantic_router.py)
- [x] Update .env.example with semantic router configuration
- [x] Create this integration roadmap (SEMANTIC_ROUTER_TODO.md)
- [x] Update agent README with architecture overview

### Deliverables

- ✅ Functional semantic router with local/cloud mode support
- ✅ 8 route definitions with diverse utterances
- ✅ Comprehensive test suite (unit tests)
- ✅ Documentation for developers

---

## Phase 2: Agent Orchestration (Next 2 Weeks)

**Timeline**: Week 2-3  
**Goal**: Connect routes to actual agent functions and integrate with ADK

### Tasks

#### 2.1 Agent Function Mapping

- [ ] Create `agent/tools/agent_map.py`
  - Map route names to agent functions
  - Define agent function signatures
  - Document expected inputs/outputs for each agent

```python
# Example structure:
AGENT_MAP = {
    "dashboard": dashboard_agent,
    "data_query": data_query_agent,
    "visualization": visualization_agent,
    # ... etc
}
```

#### 2.2 Implement Agent Functions

Create individual agent functions in `agent/tools/`:

- [ ] `dashboard_agent.py` - Dashboard generation logic
  - Parse dashboard requirements from query
  - Generate dashboard layout configuration
  - Return element definitions for canvas

- [ ] `data_query_agent.py` - Data fetching/SQL generation
  - Parse data query requirements
  - Generate SQL or data fetching logic
  - Validate against available data sources
  - Return structured data results

- [ ] `visualization_agent.py` - Chart/graph generation
  - Parse chart requirements (type, data, axes)
  - Generate chart configuration
  - Return chart element definition

- [ ] `component_agent.py` - Component registry access
  - List available components
  - Provide component documentation
  - Generate component configuration

- [ ] `analysis_agent.py` - Analytical operations
  - Implement trend analysis
  - Correlation detection
  - Statistical summaries
  - Outlier detection

- [ ] `audit_agent.py` - Compliance logging
  - Log actions to audit trail
  - Generate audit reports
  - Compliance checking

- [ ] `multimodal_agent.py` - Image/document processing
  - Image analysis integration
  - Document text extraction
  - OCR functionality (if applicable)

- [ ] `chitchat_agent.py` - Conversational fallback
  - Handle greetings
  - Provide help information
  - General conversation

#### 2.3 ADK Integration

- [ ] Update `agent/main.py` to integrate semantic routing
  - Add semantic routing tool to ADK agent
  - Create routing decision function
  - Bridge routing results to appropriate agent

```python
# Example integration:
def route_and_execute(tool_context: ToolContext, query: str) -> Dict[str, Any]:
    """Route query to appropriate agent and execute."""
    from routes.router import get_router
    from tools.agent_map import AGENT_MAP

    router = get_router()
    route = router.route(query)

    if route and route.name in AGENT_MAP:
        agent_func = AGENT_MAP[route.name]
        return agent_func(tool_context, query)

    return {"error": "No matching agent found"}
```

#### 2.4 State Bridge

- [ ] Add routing state to callback context
  - Track which agent handled each query
  - Store routing confidence scores
  - Log routing decisions for debugging

#### 2.5 Testing

- [ ] Unit tests for each agent function
- [ ] Integration tests for route → agent flow
- [ ] Test ensemble routing with multiple agents
- [ ] Test error handling and fallbacks

**Files to Create/Modify:**

- `agent/tools/agent_map.py` (new)
- `agent/tools/dashboard_agent.py` (new)
- `agent/tools/data_query_agent.py` (new)
- `agent/tools/visualization_agent.py` (new)
- `agent/tools/component_agent.py` (new)
- `agent/tools/analysis_agent.py` (new)
- `agent/tools/audit_agent.py` (new)
- `agent/tools/multimodal_agent.py` (new)
- `agent/tools/chitchat_agent.py` (new)
- `agent/main.py` (modify)
- `agent/tests/test_agent_orchestration.py` (new)

**Performance Targets:**

- Routing + execution: <500ms for simple queries
- Ensemble routing: <1s for complex queries
- Agent execution logging for debugging

---

## Phase 3: Frontend Integration (Week 3-4)

**Timeline**: Week 4-5  
**Goal**: Visualize routing decisions and agent coordination in UI

### Tasks

#### 3.1 TypeScript Type Definitions

- [ ] Create `src/lib/types.ts` additions for routing state

```typescript
// Example types:
interface RoutingDecision {
  query: string;
  selectedRoute: string;
  confidence: number;
  timestamp: string;
  agentUsed?: string;
  executionTime?: number;
}

interface EnsembleRouting {
  query: string;
  routes: Array<{ name: string; score: number }>;
  selectedRoute: string;
}
```

#### 3.2 Debug Visualization Component

- [ ] Create `src/components/SemanticRouterDebug.tsx`
  - Display routing decisions in real-time
  - Show confidence scores
  - Visualize ensemble routing results
  - Color-code by agent type
  - Toggle visibility (dev mode only)

#### 3.3 Canvas Integration

- [ ] Update `src/app/canvas/page.tsx`
  - Display active agent badge
  - Show routing history
  - Add debug panel toggle

#### 3.4 CopilotKit State Bridge

- [ ] Bridge routing state from Python to React
  - Use `useCoAgent` hook to sync state
  - Update canvas state with routing info
  - Enable real-time routing visualization

#### 3.5 Testing

- [ ] E2E tests for routing visualization
- [ ] Test state synchronization
- [ ] Test debug panel functionality

**Files to Create/Modify:**

- `src/lib/types.ts` (modify)
- `src/components/SemanticRouterDebug.tsx` (new)
- `src/app/canvas/page.tsx` (modify)
- `src/components/registry/` (add new components as needed)

**UX Requirements:**

- Subtle routing indicators (don't overwhelm users)
- Clear agent identification
- Debug mode for developers
- Accessibility compliance

---

## Phase 4: Advanced Features (Month 1-2)

**Timeline**: Week 5-8  
**Goal**: Production-ready features and optimization

### Tasks

#### 4.1 Continuous Learning Pipeline

- [ ] Create `agent/routes/learning.py`
  - Track misrouted queries
  - Suggest new utterances based on usage
  - Admin interface for utterance approval
  - Automatic retraining triggers

```python
# Example:
class RoutingFeedback:
    def record_misroute(query: str, expected_route: str, actual_route: str)
    def suggest_utterances() -> List[Tuple[str, str]]
    def approve_utterance(route_name: str, utterance: str)
```

#### 4.2 Semantic Tool Search

- [ ] Create `agent/tools/semantic_search.py`
  - Search available tools by semantic similarity
  - Recommend tools based on query intent
  - Auto-suggest agent combinations

#### 4.3 Ensemble Weighting

- [ ] Implement confidence-weighted ensemble execution
  - Run top-k agents in parallel
  - Merge results based on confidence
  - Handle conflicting agent outputs

#### 4.4 Monitoring Dashboard

- [ ] Create admin dashboard for routing analytics
  - Route usage statistics
  - Confidence score distributions
  - Misroute detection
  - Performance metrics

#### 4.5 Performance Optimization

- [ ] Optimize embedding computation
  - Cache embeddings for common queries
  - Batch processing for multiple queries
  - Pre-compute route embeddings at startup
  - Benchmark and profile routing latency

**Files to Create:**

- `agent/routes/learning.py` (new)
- `agent/tools/semantic_search.py` (new)
- `agent/routes/ensemble.py` (new)
- `src/app/admin/routing-analytics/page.tsx` (new)

**Performance Targets:**

- <50ms routing latency (p95)
- > 95% routing accuracy
- Support for 100+ concurrent users

---

## Integration Checklist

Use this checklist to verify successful integration at each phase:

### Phase 1 ✅

- [x] Router initializes in local mode without internet
- [x] All 8 routes have 5-10 diverse utterances
- [x] Tests pass with >80% coverage
- [x] Documentation complete

### Phase 2

- [ ] All 8 agent functions implemented
- [ ] Route → Agent mapping works correctly
- [ ] State bridge synchronizes routing decisions
- [ ] Error handling for unknown routes
- [ ] Logging captures routing decisions
- [ ] Performance meets <500ms target

### Phase 3

- [ ] Routing state visible in frontend
- [ ] Debug panel shows routing decisions
- [ ] Real-time state synchronization works
- [ ] UI updates on agent changes
- [ ] E2E tests pass

### Phase 4

- [ ] Continuous learning captures feedback
- [ ] Ensemble routing produces merged results
- [ ] Monitoring dashboard shows analytics
- [ ] Performance optimized (<50ms p95)
- [ ] Production deployment successful

---

## Testing Strategy

### Unit Tests (Phase 1) ✅

- Router initialization
- Route matching
- Ensemble routing
- Continuous learning

### Integration Tests (Phase 2)

- Route → Agent execution
- State management
- Error handling
- Multi-agent coordination

### E2E Tests (Phase 3)

- User query → Agent → UI update flow
- Debug panel functionality
- State synchronization

### Performance Tests (Phase 4)

- Routing latency benchmarks
- Concurrent user load testing
- Memory usage profiling

---

## Privacy & Security Considerations

### Local-First Design

- ✅ Default to local mode (no external API calls)
- ✅ HuggingFace encoder runs locally
- ✅ No external vector database
- [ ] Audit all network calls in agent functions
- [ ] Verify data stays on localhost

### Security

- [ ] Validate and sanitize all user queries
- [ ] Prevent injection attacks in agent functions
- [ ] Rate limiting on routing requests
- [ ] Audit logging for sensitive operations

### Compliance

- [ ] GDPR compliance for data processing
- [ ] User consent for cloud mode
- [ ] Data retention policies
- [ ] Audit trail for all actions

---

## Performance Targets

| Metric                | Phase 1 | Phase 2 | Phase 3 | Phase 4 |
| --------------------- | ------- | ------- | ------- | ------- |
| Routing Latency (p50) | 20ms    | 30ms    | 30ms    | 20ms    |
| Routing Latency (p95) | 50ms    | 100ms   | 100ms   | 50ms    |
| Agent Execution (p50) | -       | 200ms   | 200ms   | 150ms   |
| Agent Execution (p95) | -       | 500ms   | 500ms   | 300ms   |
| End-to-End (p95)      | -       | 600ms   | 800ms   | 400ms   |
| Routing Accuracy      | 80%     | 90%     | 92%     | 95%     |
| Test Coverage         | 80%     | 85%     | 85%     | 90%     |

---

## Monitoring & Observability

### Metrics to Track

- Routing accuracy (per route)
- Confidence score distributions
- Agent execution times
- Error rates by agent
- User satisfaction indicators

### Logging

- All routing decisions with confidence
- Agent execution details
- Errors and exceptions
- Performance bottlenecks

### Alerting

- Routing accuracy drops below threshold
- Latency exceeds targets
- High error rates

---

## Dependencies

### Phase 1 ✅

- semantic-router>=0.1.0
- sentence-transformers (via semantic-router[local])
- pytest (for testing)

### Phase 2

- No new dependencies expected
- May need: pandas, numpy for analytics agent

### Phase 3

- No new dependencies expected
- Leverage existing CopilotKit infrastructure

### Phase 4

- Potential: prometheus-client (monitoring)
- Potential: ray (parallel execution)

---

## Risk Mitigation

### Technical Risks

1. **Risk**: Routing accuracy insufficient for production
   - **Mitigation**: Extensive utterance collection, continuous learning

2. **Risk**: Latency exceeds targets
   - **Mitigation**: Caching, embedding pre-computation, profiling

3. **Risk**: State synchronization issues
   - **Mitigation**: Thorough testing, fallback mechanisms

### Operational Risks

1. **Risk**: Incomplete agent implementations
   - **Mitigation**: Phased rollout, fallback to existing tools

2. **Risk**: User confusion with routing
   - **Mitigation**: Clear UI indicators, debug mode, documentation

---

## Success Criteria

### Phase 1 ✅

- ✅ Router functional with local mode
- ✅ Tests pass
- ✅ Documentation complete

### Phase 2

- All agents implemented
- 90%+ routing accuracy
- <500ms execution time

### Phase 3

- UI shows routing decisions
- Real-time state sync works
- Positive developer feedback

### Phase 4

- Production-ready performance
- 95%+ routing accuracy
- Monitoring and alerting active

---

## Timeline Summary

| Phase     | Duration    | Key Deliverables                 |
| --------- | ----------- | -------------------------------- |
| Phase 1   | 1 week      | Router infrastructure ✅         |
| Phase 2   | 2 weeks     | Agent functions + integration    |
| Phase 3   | 2 weeks     | Frontend visualization           |
| Phase 4   | 4 weeks     | Advanced features + optimization |
| **Total** | **9 weeks** | Production-ready system          |

---

## Next Steps

### Immediate (After Phase 1 Merge)

1. Review and merge Phase 1 PR
2. Create Phase 2 feature branch
3. Begin agent function implementations
4. Set up integration test framework

### Short Term (Next Sprint)

1. Complete dashboard_agent implementation
2. Complete data_query_agent implementation
3. Begin ADK integration
4. Design state bridge architecture

### Medium Term (Month 1)

1. Complete all agent implementations
2. Frontend integration
3. E2E testing
4. Internal beta testing

### Long Term (Month 2+)

1. Advanced features
2. Performance optimization
3. Production deployment
4. User training and documentation

---

## Questions & Discussion

### Open Questions

1. Which agents should be prioritized for Phase 2?
   - **Recommendation**: dashboard, data_query, visualization (most common)

2. Should ensemble routing run agents in parallel or sequentially?
   - **Recommendation**: Parallel with timeout, merge results

3. How to handle conflicting agent outputs in ensemble mode?
   - **Recommendation**: Confidence-weighted voting, user disambiguation

4. What level of debug information to show in production?
   - **Recommendation**: Dev mode only, with opt-in for power users

### Design Decisions Needed

- Agent function interface standardization
- Error handling strategy across agents
- State management approach for routing history
- UI/UX for routing visualization

---

## Resources

### Documentation

- [Semantic Router Docs](https://docs.aurelio.ai/semantic-router/)
- [Google ADK Documentation](https://google.github.io/adk-docs/)
- [CopilotKit Integration Guide](https://docs.copilotkit.ai)

### Code References

- `agent/routes/` - Core routing implementation
- `agent/main.py` - ADK agent entry point
- `src/app/canvas/` - Frontend canvas component

### Contact

- Technical questions: Review CONTRIBUTING.md
- Architecture discussions: Create GitHub issue with "architecture" label
- Bug reports: Create GitHub issue with "bug" label

---

**Document Version**: 1.0  
**Last Updated**: Initial PR  
**Next Review**: After Phase 2 completion
