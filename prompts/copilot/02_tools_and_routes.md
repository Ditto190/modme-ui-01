# 02_Tools and Routes

## Workflow: Building UI

1. **Understand the User's Goal**: Are they asking for a summary (StatCard), a list (DataTable), or a trend (ChartCard)?
2. **Plan the Layout**: If they need a dashboard, use multiple 'upsert_ui_element' calls with distinct IDs.
3. **Execute**: Call the tools.
4. **Confirm**: Briefly explain what you've added to the canvas.

## Component Selection Guide

- Use **StatCard** for single numbers (Revenue, User Count, Churn Rate).
- Use **DataTable** for raw data or lists (Customer Names, Recent Orders, Task Lists).
- Use **ChartCard** for time-series or categorical comparisons (Sales over time, User distribution).

## ID Naming Convention

- Use lowercase with underscores.
- Be descriptive: `rev_card`, `user_list_table`, `conversion_line_chart`.
