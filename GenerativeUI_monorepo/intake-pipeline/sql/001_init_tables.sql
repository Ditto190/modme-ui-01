-- =============================================================
-- Intake Pipeline: Supabase Schema
-- Project: modme-next-forge (ref: aevemmmmouxqlfyxthzf)
-- Purpose: Persist Copilot session events, tool call metrics,
--          and agent/skill popularity from the intake pipeline.
-- =============================================================

-- -------------------------------------------------------
-- 1. Sessions
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS copilot_sessions (
    session_id        TEXT        PRIMARY KEY,
    started_at        TIMESTAMPTZ,
    ended_at          TIMESTAMPTZ,
    model             TEXT,
    reasoning_effort  TEXT,
    branch            TEXT,
    repository        TEXT,
    cwd               TEXT,
    host_type         TEXT,
    producer          TEXT,
    copilot_version   TEXT,
    total_turns       INT         DEFAULT 0,
    total_tool_calls  INT         DEFAULT 0,
    tool_success_count INT        DEFAULT 0,
    tool_failure_count INT        DEFAULT 0,
    duration_ms       BIGINT,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_copilot_sessions_started_at  ON copilot_sessions (started_at);
CREATE INDEX IF NOT EXISTS idx_copilot_sessions_repository  ON copilot_sessions (repository);
CREATE INDEX IF NOT EXISTS idx_copilot_sessions_model       ON copilot_sessions (model);

-- -------------------------------------------------------
-- 2. Tool calls (raw, one row per execution)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS copilot_tool_calls (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id      TEXT        REFERENCES copilot_sessions(session_id) ON DELETE CASCADE,
    tool_call_id    TEXT        UNIQUE,           -- from events data.toolCallId
    tool_name       TEXT        NOT NULL,
    turn_id         TEXT,
    interaction_id  TEXT,
    model           TEXT,
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    duration_ms     BIGINT,
    success         BOOLEAN,
    error_code      TEXT,
    error_message   TEXT,
    arguments       JSONB       DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tool_calls_session_id  ON copilot_tool_calls (session_id);
CREATE INDEX IF NOT EXISTS idx_tool_calls_tool_name   ON copilot_tool_calls (tool_name);
CREATE INDEX IF NOT EXISTS idx_tool_calls_started_at  ON copilot_tool_calls (started_at);
CREATE INDEX IF NOT EXISTS idx_tool_calls_success     ON copilot_tool_calls (success);

-- -------------------------------------------------------
-- 3. Tool metrics (daily aggregates — recomputed by pipeline)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS tool_metrics (
    id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    tool_name       TEXT    NOT NULL,
    metric_date     DATE    NOT NULL,
    invocations     INT     DEFAULT 0,
    success_count   INT     DEFAULT 0,
    failure_count   INT     DEFAULT 0,
    success_rate    FLOAT,
    avg_duration_ms FLOAT,
    p95_duration_ms FLOAT,
    popularity_score FLOAT  DEFAULT 0,
    trending_score  FLOAT   DEFAULT 0,
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (tool_name, metric_date)
);

CREATE INDEX IF NOT EXISTS idx_tool_metrics_tool_name    ON tool_metrics (tool_name);
CREATE INDEX IF NOT EXISTS idx_tool_metrics_date         ON tool_metrics (metric_date);
CREATE INDEX IF NOT EXISTS idx_tool_metrics_popularity   ON tool_metrics (popularity_score DESC);

-- -------------------------------------------------------
-- 4. Agent skills (seeded from .vendor/awesome-copilot)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS agent_skills (
    id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_key       TEXT    UNIQUE NOT NULL,   -- e.g. "SKILL.database-architect"
    name            TEXT    NOT NULL,
    description     TEXT,
    author          TEXT,
    version         TEXT,
    tags            TEXT[],
    source          TEXT    DEFAULT 'awesome-copilot',
    invocations     INT     DEFAULT 0,
    popularity_score FLOAT  DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_skills_skill_key   ON agent_skills (skill_key);
CREATE INDEX IF NOT EXISTS idx_agent_skills_popularity  ON agent_skills (popularity_score DESC);
CREATE INDEX IF NOT EXISTS idx_agent_skills_tags        ON agent_skills USING GIN (tags);

-- -------------------------------------------------------
-- 5. Skill invocations (detected from session events)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS skill_invocations (
    id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id  TEXT    REFERENCES copilot_sessions(session_id) ON DELETE CASCADE,
    skill_key   TEXT    REFERENCES agent_skills(skill_key) ON DELETE SET NULL,
    invoked_at  TIMESTAMPTZ,
    success     BOOLEAN,
    duration_ms BIGINT,
    eval_json   JSONB   DEFAULT '{}',   -- advanced-evaluation scores
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_skill_invocations_session  ON skill_invocations (session_id);
CREATE INDEX IF NOT EXISTS idx_skill_invocations_skill    ON skill_invocations (skill_key);
CREATE INDEX IF NOT EXISTS idx_skill_invocations_at       ON skill_invocations (invoked_at);

-- -------------------------------------------------------
-- 6. Pipeline runs (audit trail for intake pipeline itself)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS intake_pipeline_runs (
    id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    run_at          TIMESTAMPTZ DEFAULT NOW(),
    source_path     TEXT,
    sessions_parsed INT     DEFAULT 0,
    tool_calls_upserted INT DEFAULT 0,
    metrics_written INT     DEFAULT 0,
    errors          INT     DEFAULT 0,
    status          TEXT    DEFAULT 'pending',  -- pending|success|partial|failed
    error_detail    TEXT,
    duration_ms     BIGINT
);

-- -------------------------------------------------------
-- 7. Helper views for dashboards
-- -------------------------------------------------------
CREATE OR REPLACE VIEW popular_tools AS
SELECT
    tool_name,
    SUM(invocations)     AS total_invocations,
    AVG(success_rate)    AS avg_success_rate,
    MAX(popularity_score) AS peak_popularity,
    AVG(avg_duration_ms) AS avg_duration_ms
FROM tool_metrics
GROUP BY tool_name
ORDER BY total_invocations DESC;

CREATE OR REPLACE VIEW trending_tools_7d AS
SELECT
    tool_name,
    SUM(invocations)     AS invocations_7d,
    AVG(success_rate)    AS success_rate_7d,
    AVG(trending_score)  AS avg_trending_score
FROM tool_metrics
WHERE metric_date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY tool_name
ORDER BY invocations_7d DESC;

CREATE OR REPLACE VIEW session_summary AS
SELECT
    s.session_id,
    s.started_at,
    s.model,
    s.branch,
    s.repository,
    s.total_tool_calls,
    s.tool_success_count,
    ROUND(s.tool_success_count::NUMERIC / NULLIF(s.total_tool_calls, 0) * 100, 1) AS success_pct,
    s.duration_ms / 1000 AS duration_seconds
FROM copilot_sessions s
ORDER BY s.started_at DESC;
