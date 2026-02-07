-- GreptimeDB Schema for Agent Observability
-- Created: 2026-02-08
-- Purpose: Store and analyze AI agent conversations across multiple providers

-- ============================================================================
-- Table 1: agent_conversations
-- Stores all agent interactions with full context and metrics
-- ============================================================================

CREATE TABLE IF NOT EXISTS agent_conversations (
  -- Identifiers
  conversation_id STRING,
  message_id STRING,
  timestamp TIMESTAMP(9) TIME INDEX,

  -- Provider information
  provider STRING TAG,  -- 'adk-agent', 'copilot', 'claude', 'antigravity'
  model STRING TAG,     -- 'gemini-2.0-flash-exp', 'gpt-4', 'claude-3-opus', etc.

  -- Conversation content
  user_query TEXT,
  agent_response TEXT,
  system_prompt TEXT,   -- Optional: system message/context

  -- Tool usage (JSON format)
  tool_calls JSON,      -- Array of {name, params, timestamp}
  tool_results JSON,    -- Array of {name, result, duration_ms}

  -- Token metrics
  tokens_input INT,
  tokens_output INT,
  tokens_total INT,

  -- Performance metrics
  latency_ms FLOAT,
  cost_usd FLOAT,       -- Optional: calculated cost

  -- Classification and outcomes
  intent STRING TAG,    -- Detected user intent
  outcome STRING TAG,   -- 'success', 'failure', 'partial'
  error_message TEXT,   -- If outcome = 'failure'

  -- Context metadata
  user_id STRING TAG,
  session_id STRING,
  environment STRING TAG, -- 'development', 'staging', 'production'

  -- Additional metadata (JSON for flexibility)
  metadata JSON,

  PRIMARY KEY (conversation_id, message_id, timestamp)
)
PARTITION BY RANGE COLUMNS (timestamp) (
  PARTITION p_2026_02 VALUES LESS THAN ('2026-03-01'),
  PARTITION p_2026_03 VALUES LESS THAN ('2026-04-01'),
  PARTITION p_2026_04 VALUES LESS THAN ('2026-05-01'),
  PARTITION p_2026_05 VALUES LESS THAN ('2026-06-01')
);

-- Create indexes for common queries
CREATE INDEX idx_conversation_provider ON agent_conversations(provider, timestamp);
CREATE INDEX idx_conversation_user ON agent_conversations(user_id, timestamp);
CREATE INDEX idx_conversation_outcome ON agent_conversations(outcome, timestamp);

-- ============================================================================
-- Table 2: agent_evaluations
-- Stores evaluation results from Azure AI Evaluation SDK
-- ============================================================================

CREATE TABLE IF NOT EXISTS agent_evaluations (
  -- Identifiers
  evaluation_id STRING,
  conversation_id STRING,
  message_id STRING,
  timestamp TIMESTAMP(9) TIME INDEX,

  -- Evaluation scores (typically 1-5 scale)
  task_adherence_score FLOAT,
  intent_resolution_score FLOAT,
  tool_accuracy_score FLOAT,

  -- Detailed reasoning (from LLM evaluator)
  task_adherence_reasoning TEXT,
  intent_resolution_reasoning TEXT,
  tool_accuracy_reasoning TEXT,

  -- Aggregate metrics
  overall_score FLOAT,
  pass_threshold BOOLEAN,

  -- Metadata
  evaluator_model STRING TAG,  -- Model used for evaluation (e.g., 'gpt-4')
  evaluation_version STRING,   -- Evaluator version for tracking changes
  evaluation_config JSON,      -- Configuration used

  PRIMARY KEY (evaluation_id, timestamp)
);

CREATE INDEX idx_evaluation_conversation ON agent_evaluations(conversation_id, timestamp);

-- ============================================================================
-- Table 3: tool_usage_metrics
-- Aggregated tool statistics for monitoring
-- ============================================================================

CREATE TABLE IF NOT EXISTS tool_usage_metrics (
  timestamp TIMESTAMP(9) TIME INDEX,
  tool_name STRING TAG,
  provider STRING TAG,

  -- Counters (use for rate calculations)
  invocation_count INT,
  success_count INT,
  failure_count INT,

  -- Performance metrics
  avg_duration_ms FLOAT,
  min_duration_ms FLOAT,
  max_duration_ms FLOAT,
  p50_duration_ms FLOAT,  -- Median
  p95_duration_ms FLOAT,
  p99_duration_ms FLOAT,

  -- Error tracking
  error_types JSON,  -- {error_type: count}

  PRIMARY KEY (tool_name, provider, timestamp)
);

-- ============================================================================
-- Table 4: conversation_sessions
-- Track multi-turn conversation sessions
-- ============================================================================

CREATE TABLE IF NOT EXISTS conversation_sessions (
  session_id STRING,
  timestamp TIMESTAMP(9) TIME INDEX,

  -- Session metadata
  provider STRING TAG,
  user_id STRING TAG,
  environment STRING TAG,

  -- Session statistics
  message_count INT,
  total_tokens INT,
  total_cost_usd FLOAT,
  avg_latency_ms FLOAT,

  -- Session duration
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  duration_minutes FLOAT,

  -- Session outcome
  completion_status STRING TAG,  -- 'completed', 'abandoned', 'error'
  final_intent STRING TAG,

  PRIMARY KEY (session_id, timestamp)
);

-- ============================================================================
-- View 1: conversation_summary
-- Daily summary of conversations by provider
-- ============================================================================

CREATE VIEW IF NOT EXISTS conversation_summary AS
SELECT
  DATE_TRUNC('day', timestamp) as date,
  provider,
  COUNT(*) as total_conversations,
  COUNT(DISTINCT conversation_id) as unique_conversations,
  COUNT(DISTINCT user_id) as unique_users,
  AVG(latency_ms) as avg_latency_ms,
  AVG(tokens_total) as avg_tokens,
  SUM(tokens_total) as total_tokens,
  SUM(cost_usd) as total_cost_usd,
  SUM(CASE WHEN outcome = 'success' THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as success_rate_pct
FROM agent_conversations
GROUP BY date, provider;

-- ============================================================================
-- View 2: evaluation_summary
-- Evaluation metrics aggregated by provider and time period
-- ============================================================================

CREATE VIEW IF NOT EXISTS evaluation_summary AS
SELECT
  DATE_TRUNC('day', e.timestamp) as date,
  c.provider,
  COUNT(*) as evaluations_count,
  AVG(e.task_adherence_score) as avg_task_adherence,
  AVG(e.intent_resolution_score) as avg_intent_resolution,
  AVG(e.tool_accuracy_score) as avg_tool_accuracy,
  AVG(e.overall_score) as avg_overall_score,
  SUM(CASE WHEN e.pass_threshold THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as pass_rate_pct
FROM agent_evaluations e
JOIN agent_conversations c ON e.conversation_id = c.conversation_id
GROUP BY date, c.provider;

-- ============================================================================
-- Sample Queries
-- ============================================================================

-- Query 1: Recent conversations with evaluation scores
-- SELECT
--   c.timestamp,
--   c.provider,
--   c.user_query,
--   LEFT(c.agent_response, 100) as response_preview,
--   c.latency_ms,
--   e.task_adherence_score,
--   e.intent_resolution_score
-- FROM agent_conversations c
-- LEFT JOIN agent_evaluations e ON c.conversation_id = e.conversation_id
-- WHERE c.timestamp > NOW() - INTERVAL '1 hour'
-- ORDER BY c.timestamp DESC
-- LIMIT 20;

-- Query 2: Provider performance comparison
-- SELECT
--   provider,
--   COUNT(*) as total_conversations,
--   AVG(latency_ms) as avg_latency,
--   AVG(tokens_total) as avg_tokens,
--   SUM(cost_usd) as total_cost,
--   SUM(CASE WHEN outcome = 'success' THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as success_rate
-- FROM agent_conversations
-- WHERE timestamp > NOW() - INTERVAL '24 hours'
-- GROUP BY provider;

-- Query 3: Tool usage ranking
-- SELECT
--   tool_name,
--   SUM(invocation_count) as total_invocations,
--   AVG(avg_duration_ms) as avg_duration,
--   AVG(success_count * 100.0 / invocation_count) as success_rate
-- FROM tool_usage_metrics
-- WHERE timestamp > NOW() - INTERVAL '7 days'
-- GROUP BY tool_name
-- ORDER BY total_invocations DESC;

-- Query 4: Conversations requiring evaluation
-- SELECT
--   c.conversation_id,
--   c.timestamp,
--   c.provider,
--   c.user_query
-- FROM agent_conversations c
-- LEFT JOIN agent_evaluations e ON c.conversation_id = e.conversation_id
-- WHERE c.timestamp > NOW() - INTERVAL '24 hours'
--   AND e.evaluation_id IS NULL
-- ORDER BY c.timestamp DESC;
