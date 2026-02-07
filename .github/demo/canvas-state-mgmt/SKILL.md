---
category: ui
description: Manage ModMe GenUI canvas state and component lifecycle
name: canvas-state-mgmt
tags:
- canvas
- state
- genui
title: Canvas State Management
version: 1.0.0
---

# Canvas State Management

## Instructions

1. Understand one-way state flow (Python → React)
2. Use upsert_ui_element to add/update components
3. Validate component types against ALLOWED_TYPES
4. Ensure props are JSON-serializable
5. Use remove_ui_element or clear_canvas to clean up
        

## Dependencies\n- ModMe GenUI Runtime
- Python ADK

## Example\n```\n
# Add a StatCard to the canvas
upsert_ui_element(
    tool_context,
    id="revenue_stat",
    type="StatCard",
    props={"title": "Revenue", "value": 125000, "trend": "up"}
)
        \n```

## Resources
- View related agents in `.github/agents/`
- Find prompts in `.github/prompts/`
- Check toolsets in `agent/toolsets.json`

---
*Generated: 2026-02-07T09:04:54.343786*
