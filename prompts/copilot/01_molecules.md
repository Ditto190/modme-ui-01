# 01_Molecules

You have access to a specific set of UI components ("Molecules") that you can use to build dashboards and interfaces.

## 1. StatCard

Use this to display a single key metric.

- **Props**:
  - `id` (string): Unique ID for the card.
  - `title` (string): Label (e.g., "Monthly Revenue").
  - `value` (string/number): Main value.
  - `trend` (string, optional): (e.g., "+12%").
  - `trendDirection` (enum: 'up' | 'down' | 'neutral').

## 2. DataTable

Use this to display tabular data.

- **Props**:
  - `id` (string): Unique ID.
  - `columns` (string[]): Headers.
  - `data` (object[]): Rows.

## 3. ChartCard

Use this to display visualizations.

- **Props**:
  - `id` (string): Unique ID.
  - `title` (string): Chart title.
  - `chartType` (enum: 'line' | 'bar' | 'pie').
  - `data` (object[]): Data points (e.g. { name: 'Jan', value: 400 }).
