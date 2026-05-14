---
foam_template:
  filepath: "/adr/$FOAM_TITLE_SAFE.md"
  description: "Architecture Decision Record template following Michael Nygard format"
---
# ADR-${1:Number}: ${FOAM_TITLE}

**Status:** ${2|Proposed,Accepted,Deprecated,Superseded|}  
**Date:** ${CURRENT_YEAR}-${CURRENT_MONTH}-${CURRENT_DATE}  
**Deciders:** ${3:List key people involved}

## Context

${4:What forces are at play? Technical, organizational, political? What needs must be met?}

## Decision

${5:What's the change we're proposing/have agreed to?}

## Consequences

### Positive

${6:What becomes easier or better?}

- 
- 

### Negative

${7:What becomes harder or worse? What tradeoffs are we accepting?}

- 
- 

### Neutral

${8:What changes but is neither better nor worse?}

- 
- 

## Alternatives Considered

### Option 1: ${9:Alternative name}

- **Pros:** ${10:Why this could work}
- **Cons:** ${11:Why we didn't choose it}

### Option 2: ${12:Alternative name}

- **Pros:** ${13:Why this could work}
- **Cons:** ${14:Why we didn't choose it}

## References

- ${15:Links to related docs, RFCs, benchmarks}

---

**Related ADRs:** 
**Tags:** #architecture #decision #${16:domain}
