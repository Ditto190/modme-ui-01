# 01_Molecules

You have access to a specific set of UI components ("Molecules") that you can use to build dashboards and interfaces.

## 1. StatCard

Use this to display a single key metric.

- **Properties**:
  - `title` (string): Label for the metric (e.g., "Monthly Revenue").
  - `value` (string/number): The main value to display (e.g., "$12,450").
  - `trend` (string, optional): A description of the trend (e.g., "+12% vs last month").
  - `trendDirection` (enum: 'up' | 'down' | 'neutral'): Visual indicator for the trend.

## 2. DataTable

Use this to display tabular data.

- **Properties**:
  - `columns` (array): List of column headers.
  - `data` (array): List of rows (objects).
