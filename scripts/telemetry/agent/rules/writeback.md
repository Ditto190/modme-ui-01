# Writeback

After a successful `report` run:

- Insert `output_schemas` row `schema_type: observability-report` (when Supabase available).
- Insert `output_artefacts` with HTML path `reports/observability/latest.html`.
- Append `[Unreleased]` changelog entry when shipping user-visible pipeline changes.
