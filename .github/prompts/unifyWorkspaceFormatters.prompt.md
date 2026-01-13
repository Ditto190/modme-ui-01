---
name: unifyWorkspaceFormatters
description: Configure unified formatters and schema validation for JSON, YAML, and Markdown files in a workspace.
argument-hint: Optionally specify file types or schema paths to configure
---

Set up unified formatting and schema validation for this workspace/monorepo:

1. **Identify formatter conflicts**: Check for multiple formatters installed for JSON, YAML, and Markdown files

2. **Create or update `.vscode/settings.json`** to:
   - Set `editor.formatOnSave` to true
   - Configure a single default formatter (e.g., Prettier) for `[json]`, `[jsonc]`, `[yaml]`, and `[markdown]` language modes
   - Enable YAML validation with `yaml.validate: true`

3. **Map YAML schemas** in `yaml.schemas` for project-specific YAML files:
   - Use relative paths like `"./path/to/schema.json": ["path/to/*.yaml"]`
   - Reference remote schemas from schemastore.org where applicable

4. **Add schema headers to portable YAML files** (optional, for files used outside the workspace):
   - Insert `# yaml-language-server: $schema=./relative/path/to/schema.json` at the top

5. **Create JSON Schema files** for custom YAML configurations if they don't exist

6. **Verify the configuration**:
   - Ensure settings.json is valid JSON (single root object)
   - Reload the window or restart language servers to apply changes
   - Confirm no more "multiple formatters" warnings appear

Output a summary of changes made and any manual steps required.
