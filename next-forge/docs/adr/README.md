# Architecture Decision Records (ADRs)

This directory contains Architecture Decision Records for the **next-forge** monorepo. ADRs capture significant architectural and technical decisions, their context, rationale, and consequences.

## Purpose

Architecture Decision Records provide:
- **Historical context** for why technical decisions were made
- **Rationale** explaining trade-offs considered and why alternatives were rejected
- **Consequences** (positive and negative) of the decision
- **Reference** for onboarding new team members
- **Accountability** by documenting decision makers and dates
- **Reversibility** assessment for each decision

## Index

| # | Title | Status | Date | Area |
|---|-------|--------|------|------|
| **0001** | [Supabase Local Development with Hybrid Cloud Architecture](./0001-supabase-local-development-with-hybrid-cloud.md) | **Superseded** | 2026-06-20 | Database & Infrastructure |
| **0002** | [Cloud-First Supabase with Prisma](./0002-cloud-first-supabase-with-prisma.md) | **Accepted** | 2026-06-20 | Database & Infrastructure |

## Creating a New ADR

### Step 1: Identify Need

Create an ADR when you're making a decision that:
- Affects multiple systems or teams
- Has significant long-term consequences
- Involves trade-offs between alternatives
- Should be documented for future reference

**Skip ADR for**:
- Bug fixes and patches
- Minor configuration changes
- Routine maintenance
- Implementation details

### Step 2: Gather Context

Before writing, collect:
- Problem statement and constraints
- Alternative solutions considered
- Team input and concerns
- Related prior decisions
- Timeline and urgency

### Step 3: Write the ADR

1. Copy the template (below) to a new file: `NNNN-title-with-dashes.md`
2. Number sequentially (0002, 0003, etc.)
3. Fill in all required sections
4. Include examples and code where applicable
5. Link related ADRs and documentation

### Step 4: Review Process

- [ ] Share draft with team leads
- [ ] Gather feedback in PR
- [ ] Address concerns and update rationale
- [ ] Get approvals from affected stakeholders
- [ ] Merge to `main` once accepted
- [ ] Update this index

## ADR Status Lifecycle

```
┌─────────────┐
│  Proposed   │  Initial draft, under review
└──────┬──────┘
       │
       ├─────────────────┐
       │                 │
       ▼                 ▼
   Accepted         Rejected
   (decision made)  (not adopted)
       │
       ├─────────────────┐
       │                 │
       ▼                 ▼
  Deprecated        Superseded
  (no longer)       (replaced by
   relevant)        another ADR)
```

### Status Definitions

- **Proposed**: Under review, not yet decided
- **Accepted**: Decision made, implementing or implemented
- **Rejected**: Considered but not adopted (keep for historical reference)
- **Deprecated**: Was accepted, no longer relevant or used
- **Superseded**: Replaced by another ADR (always link to successor)

## Template (MADR Format)

Use this template for new ADRs:

```markdown
# ADR-NNNN: Title of Decision

## Status

**[Proposed | Accepted | Rejected | Deprecated | Superseded by ADR-XXXX]**

## Context

[Describe the issue or problem that led to this decision. What were the drivers?
What constraints exist? What's the business/technical background?]

## Decision Drivers

* Driver 1: [What made this decision important?]
* Driver 2: [What were the constraints?]
* Driver 3: [What's the priority?]

## Considered Options

### Option 1: [Short name]

Description and approach.

**Pros**:
- Advantage 1
- Advantage 2

**Cons**:
- Disadvantage 1
- Disadvantage 2

### Option 2: [Short name]

...

## Decision

We will use/adopt/implement **[selected option]** because...

## Rationale

Why this decision was made over alternatives...

## Consequences

### Positive
- Benefit 1
- Benefit 2

### Negative
- Cost/Risk 1
- Cost/Risk 2

### Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Risk 1 | High | Mitigation approach |

## Implementation

Key steps, commands, configuration, and technical details for implementing
this decision.

## Related Decisions

- **ADR-XXXX**: [Relationship] - [Description]
- **ADR-YYYY**: [Relationship] - [Description]

## References

- [Link to relevant documentation]
- [Link to tools or resources]

---

**ADR Created**: YYYY-MM-DD
**Last Updated**: YYYY-MM-DD
**Status**: [Current Status]
```

## Writing Tips

### Do's ✅

- **Write early**: Document decisions before implementation
- **Be specific**: Use concrete examples and numbers
- **Include context**: Future readers need background
- **Be honest**: Include real cons and trade-offs
- **Link relationships**: Connect to related ADRs
- **Update status**: Deprecate or supersede when appropriate
- **Keep focused**: One decision per ADR

### Don'ts ❌

- **Don't rewrite accepted ADRs**: Supersede them instead
- **Don't skip alternatives**: Show your reasoning
- **Don't hide negatives**: Honest trade-offs are valuable
- **Don't make it too long**: 1-3 pages is ideal
- **Don't skip consequences**: Good and bad outcomes matter
- **Don't forget rationale**: Why this choice beats alternatives?

## Maintenance

### Updating an ADR

If circumstances change:

1. **Minor updates** (spelling, links, formatting): Update in place
2. **Major updates** (status, rationale): Create new ADR that supersedes
3. **Full deprecation**: Mark as "Deprecated", explain why in new decision
4. **Supersession**: Reference new ADR at top of old one

### Superseding an ADR

When creating a new ADR that replaces an old one:

```markdown
# ADR-0005: Migrate from Neo to PostgreSQL

## Status

**Accepted** (Supersedes ADR-0001)

## Context

[Explain why original decision is no longer valid...]

---

**Supersedes**: ADR-0001: Neo Database for Core Services
**Related PR**: #123
```

Then update ADR-0001's header:

```markdown
## Status

**Deprecated** (Superseded by ADR-0005)
```

## Tools & Automation

### Manual ADR Management

```bash
# Verify ADR numbering is sequential
ls next-forge/docs/adr/00*.md

# Search ADRs
grep -r "PostgreSQL" next-forge/docs/adr/
```

### Optional: adr-tools

For larger organizations, consider [adr-tools](https://github.com/npryce/adr-tools):

```bash
# Initialize
adr init next-forge/docs/adr

# Create new ADR
adr new "Use PostgreSQL as Primary Database"

# Supersede an ADR
adr new -s 1 "Migrate from Neo to PostgreSQL"

# Generate index
adr generate toc > next-forge/docs/adr/README.md
```

## Integration with Development

### Pre-Commit Checks

Consider adding a pre-commit hook to:
- Verify ADR numbering is sequential
- Ensure new ADRs have required sections
- Check that supersessions are properly linked

### PR Review

When reviewing ADRs:
- [ ] Problem/context is clear
- [ ] All viable options considered
- [ ] Pros/cons are balanced and honest
- [ ] Consequences (good and bad) documented
- [ ] Related ADRs are linked
- [ ] Decision rationale is compelling
- [ ] Implementation plan is realistic
- [ ] Risks and mitigations are identified

### CI Integration

Optionally validate ADRs in CI:
```yaml
- name: Validate ADRs
  run: |
    # Check sequential numbering
    # Verify required sections
    # Link validation
    # Spell check
```

## Questions?

- **How formal should ADRs be?** As formal as your team needs. Start simple, evolve based on needs.
- **How long should ADRs be?** Aim for 1-3 pages. Longer is OK if justified.
- **Who should create ADRs?** Anyone making significant decisions. Often tech leads or architects.
- **Who should review?** At least 2 senior engineers familiar with the area.
- **How often should we create ADRs?** Typically 2-4 per quarter for active projects.

## References

- [Documenting Architecture Decisions by Michael Nygard (original concept)](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
- [MADR: Markdown Architecture Decision Records](https://adr.github.io/madr/)
- [ADR GitHub Organization](https://adr.github.io/)
- [adr-tools](https://github.com/npryce/adr-tools)
- [Architecture Decision Records Wikipedia](https://en.wikipedia.org/wiki/Architectural_decision)

---

**Last Updated**: 2026-06-20  
**Maintainer**: next-forge team  
**Questions/Feedback**: Create an issue or discussion in the repository
