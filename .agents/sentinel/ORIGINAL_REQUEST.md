# Original User Request

## Initial Request — 2026-06-27T07:39:25+10:00

# Teamwork Project Prompt

Research, design, and implement an optimized `lean-ctx` configuration tailored for a monorepo development environment. The setup must specifically incorporate advanced knowledge base features, performance tuning, adaptive learning, and seamless support for multi-agent journeys.

Working directory: c:\Users\dylan\Monorepo_ModMe
Integrity mode: development

## Reference Material
The agent team must research the following official documentation to guide the implementation:
- https://github.com/yvgude/lean-ctx/blob/main/docs/guides/monorepo.md
- https://github.com/yvgude/lean-ctx/blob/main/docs/reference/appendix-cli-map.md
- https://github.com/yvgude/lean-ctx/blob/main/docs/reference/03-memory-and-knowledge.md
- https://github.com/yvgude/lean-ctx/blob/main/docs/reference/08-multi-agent.md
- https://github.com/yvgude/lean-ctx/blob/main/docs/reference/05-advanced.md
- https://github.com/yvgude/lean-ctx/blob/main/docs/reference/04-code-intelligence.md
- https://github.com/yvgude/lean-ctx/blob/main/docs/reference/18-adaptive-learning.md
- https://github.com/yvgude/lean-ctx/blob/main/docs/reference/14-performance-tuning.md
- https://github.com/yvgude/lean-ctx/blob/main/docs/reference/generated/config-keys.md
- https://github.com/yvgude/lean-ctx/blob/main/docs/guides/cursor.md

## Requirements

### R1. Configure for Monorepo & Multi-Agent Workflows
Update configuration files (like `.cursorrules`, `lean-ctx.yml`, or equivalent) based on best practices. Apply performance tuning and ensure hooks/rules support multi-agent workflows across the monorepo.

### R2. Implement Knowledge Base & Adaptive Learning
Set up local file-based storage (e.g., `.lean-ctx/memory/` or similar directory) for the knowledge base. Create any necessary indexing scripts, data structures, and maintenance hooks required to enable adaptive learning features.

### R3. Benchmark Performance
Develop a benchmark script or automated test to measure context load times and verify that performance tuning optimizations and multi-agent context sharing work effectively.

## Acceptance Criteria

### Configuration & Infrastructure
- [ ] Configuration files (`lean-ctx.yml`, `.cursorrules`, etc.) contain specific performance tuning and monorepo directives.
- [ ] Local memory directories are correctly scaffolded for adaptive learning.
- [ ] Required helper/indexing scripts for shared memory are implemented and runnable.

### Verification Benchmark
- [ ] A baseline benchmark test script is created.
- [ ] The benchmark runs successfully and outputs a report demonstrating context load times and context cache performance.
