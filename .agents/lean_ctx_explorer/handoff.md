# Handoff Report: lean-ctx configuration and pre-commit automation

## Observation
1. **lean-ctx Initialization & Profiles**: Found in `docs/lean-ctx-guide.md` and by running `lean-ctx help all`. 
   - Initialization runs globally via `lean-ctx init --global`, installing shell aliases for shell compression wrappers (`lean-ctx-on`, `lean-ctx-off`). 
   - Profile settings are managed via `lean-ctx tools <profile>` (e.g., `minimal`, `standard`, `power`) to optimize the MCP context window.
2. **Pre-commit Hooks**: Located in `.githooks/pre-commit`, `.git/hooks/pre-commit`, and `.pre-commit-config.yaml` (for python-based markdown/prettier hooks). The custom script `.githooks/pre-commit` explicitly calls `node scripts/pre-commit-checks.mjs`.
3. **Supabase Parity (Existing Workflow)**: The existing Supabase intake (`scripts/run-intake.mjs` and `yarn intake:orchestrate`) handles `.env` loading, `--dry-run`, and conditionally executes either `inbox-ingest.mjs` or a full `intake-orchestrator.mjs` based on a `--full` flag. The pre-commit checks (`scripts/pre-commit-checks.mjs`) monitor `GenerativeUI_monorepo/docs/inbox/` for modifications.
4. **lean-ctx CLI capabilities**: Running `lean-ctx knowledge` reveals an export function (`lean-ctx knowledge export --format json --output <path>`) and a status function, meaning knowledge bases can be extracted to JSON files (e.g. `knowledge-base.json` found in root).

## Logic Chain
- To match the parity of the Supabase intake approach, `lean-ctx` knowledge synchronization needs a dedicated Node.js script (e.g., `scripts/run-lean-ctx-intake.mjs`) supporting `.env` checks and `--dry-run`/`--full` CLI flags.
- By utilizing `lean-ctx knowledge export --format json --output knowledge-base.json`, the local AI context DB can be serialized and committed to the repository, achieving synchronization parity.
- The entry point for local Git operations is `scripts/pre-commit-checks.mjs`. We can inject a check in this script that monitors `state/lean-ctx-session-markers.jsonl` or `.cursor/hooks/` files. When these files change, the pre-commit script can automatically invoke the new lean-ctx intake script to commit the latest knowledge base JSON.

## Caveats
- `lean-ctx` handles its local data under machine-specific paths (e.g., `~/.config/lean-ctx/config.toml`, `.lean-ctx-id`), meaning the `knowledge-base.json` must be strictly JSON/JSONL format to guarantee cross-machine compatibility when checked into Git.
- We haven't inspected the exact data model of `knowledge-base.json`. Large files might slow down Git if knowledge bases become massive, requiring `.gitattributes` text=auto or Git LFS.

## Conclusion
**Recommended Strategy:**
1. **Configuring lean-ctx Initialization**: Use `lean-ctx init --global` to enable shell wrapping, and set the tool profile using `lean-ctx tools standard`.
2. **Adding a pre-commit step**: Edit `scripts/pre-commit-checks.mjs` to include a new path array (e.g., `const leanCtxPaths = [".cursor/hooks/", "state/lean-ctx-session-markers.jsonl"];`) and call a new node script if modified.
3. **Matching Supabase Data Handling**: Create `scripts/run-lean-ctx-intake.mjs` that mirrors `scripts/run-intake.mjs`. It should parse arguments for `--dry-run` and `--full`, load `.env` variables if required by `lean-ctx`, and execute `lean-ctx knowledge export --format json --output knowledge-base.json` to serialize agent insights. Add a matching `yarn lean-ctx:intake` script in `package.json`.

## Verification Method
- **Verify Configuration**: Run `lean-ctx status` and `lean-ctx doctor` to ensure the standard profile is active.
- **Verify Pre-commit Hook**: Stage a dummy file in `.cursor/hooks/` or run `node scripts/pre-commit-checks.mjs`. It should successfully trigger the `lean-ctx` export log output.
- **Verify Export**: Execute `yarn lean-ctx:intake` and verify that `knowledge-base.json` is updated with valid, formatted JSON.
