# Agent Codeowners Review Routing (plan copy)

> Executable summary of the approved plan. Operator runbook: [`docs/devops/agent-review-routing.md`](../devops/agent-review-routing.md).  
> Do not treat this file as the Cursor plan UI source of truth.

## Goal

Stop every cloud reviewer from reviewing every PR. Route agents by path/role like GitLab multiple approval rules; agents are approvers via required checks; Trunk/`merge_group` is the merge gate. Humans are not required CODEOWNERS.

## Control plane

1. `.github/agent-codeowners.yml` — SoT paths → roles → checks → citizens
2. `agent-review-dispatch.yml` — apply `review:*` labels + matrix
3. `_agent-role-review.yml` — publish `modme/agent-<role>` (+ skip-success)
4. SaaS gates: `.coderabbit.yaml`, `cubic.yaml`; disable Gemini before 2026-07-17
5. `ci.yml` / `preflight-ci.yml` — `merge_group: checks_requested`
6. Citizens in `data/agent-citizens/`; `routeContracts()` in polis-router
7. Copilot: `worktree-bootstrap.ps1` + `session:review` / `-AgentRole review`
8. Dependabot multi-ecosystem; `mise.toml` pins

## Smoke

| Paths           | Expect                                     |
| --------------- | ------------------------------------------ |
| `docs/**` only  | docs advisory; required roles skip-success |
| `next-forge/**` | forge + merge; generative skip             |
| `.github/**`    | devops + Cubic                             |

## Ruleset ops

Add required checks on **CodeReview_Ruleset** (id `11504025`): `modme/agent-forge|generative|devops|security|merge`.
