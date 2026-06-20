# Markdown Grammar & Formatting Automation

This project uses automated tools to enforce consistent markdown grammar and formatting across all `.md` files.

## Tools Used

### 1. **markdownlint-cli**

- Enforces markdown style rules (60+ rules)
- Handles the MD060 error (table column style with spaces)
- Can auto-fix many issues

### 2. **Prettier**

- Formats markdown for consistency
- Auto-aligns tables
- Handles spacing and line breaks

## Setup Files

- **`.markdownlint.json`** - Configuration for markdownlint rules
- **`.markdownlintignore`** - Files/directories to ignore
- **`.prettierrc.json`** - Prettier formatting configuration
- **`.pre-commit-config.yaml`** - Pre-commit hooks for local enforcement

## Usage

### Local Development

```bash
# Check markdown for errors
npm run lint:md

# Auto-fix markdown errors
npm run lint:md:fix

# Format markdown with Prettier
npm run format:md

# Run all linting and formatting
npm run check
```

### Pre-commit Hooks (Recommended)

Install pre-commit hooks to automatically check/fix markdown before commits:

```bash
# Install pre-commit (requires Python)
pip install pre-commit

# Install the hooks
pre-commit install

# Test the hooks
pre-commit run --all-files
```

## GitHub Actions Workflows

### 1. Markdown Lint (`.github/workflows/markdown-lint.yml`)

**Triggers:** Push or PR with markdown changes

**Actions:**

- Validates markdown against style rules
- Checks formatting consistency
- Fails if issues found

### 2. Auto-fix Markdown (`.github/workflows/markdown-fix.yml`)

**Triggers:** Push to `feature/**` or `fix/**` branches

**Actions:**

- Automatically fixes markdown issues
- Formats with Prettier
- Commits changes back to branch
- Skips CI on auto-commits

## Common Issues & Fixes

### MD060: Table Column Style

**Error:** `Table pipe is missing space to the right for style "compact"`

**Fix:** Tables need consistent spacing around pipes:

```markdown
<!-- Bad -->

| a   |  b  | c   |
| :-- | :-: | :-- |

<!-- Good -->

| a   |  b  |   c |
| :-- | :-: | --: |
```

Auto-fixed with: `npm run lint:md:fix`

### MD047: Single Trailing Newline

**Error:** `Files should end with a single newline character`

**Fix:** Ensure each markdown file ends with exactly one blank line.
Auto-fixed with: `npm run lint:md:fix`

### Line Length (MD013)

**Disabled** by default in this project to allow flexibility with long URLs and tables.

## Configuration Details

### markdownlint Rules

- See [`.markdownlint.json`](.markdownlint.json) for rule configuration
- MD060 set to "compact" style for consistent table formatting
- MD013 (line length) disabled for flexibility
- MD041 (first-line-heading) disabled for files with front matter

### Prettier Settings

- Prose wrap: `preserve` (keeps manual line breaks)
- Print width: 100 characters
- Tab width: 2 spaces
- No tabs, spaces only

## Ignoring Files

Add patterns to `.markdownlintignore`:

```text
node_modules/
.venv/
*.min.md
CHANGELOG.md
```

## CI/CD Integration

The markdown linting runs on:

- Every push to any branch (with `.md` changes)
- Every pull request (with `.md` changes)
- Pre-commit (if hooks installed locally)

Auto-fixing runs on:

- Pushes to `feature/**` or `fix/**` branches
- Automatically commits fixes back

## Troubleshooting

### "markdownlint: command not found"

```bash
npm install -g markdownlint-cli
# or use npx
npx markdownlint '**/*.md'
```

### Pre-commit hooks not running

```bash
pre-commit install
pre-commit run --all-files
```

### GitHub Actions not triggering

- Ensure workflows are in `.github/workflows/`
- Check that markdown files are being modified in the commit
- Verify branch name matches patterns in workflow files

## References

- [markdownlint Rules](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md)
- [Prettier Markdown Options](https://prettier.io/docs/en/options.html)
- [Pre-commit Documentation](https://pre-commit.com/)
