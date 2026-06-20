# Quick Reference: Markdown Linting & Formatting

## Commands

```bash
# Check markdown for errors
npm run lint:md

# Auto-fix markdown errors
npm run lint:md:fix

# Format markdown with Prettier
npm run format:md

# Run all checks (includes markdown)
npm run lint
npm run check
```

## Common Fixes

### MD060: Table Spacing

```markdown
<!-- ❌ Bad -->

| a   |  b  | c   |
| :-- | :-: | :-- |

<!-- ✅ Good -->

| a   |  b  |   c |
| :-- | :-: | --: |
```

### MD047: Trailing Newline

Ensure files end with one blank line.

### MD001: Heading Levels

```markdown
<!-- ❌ Bad -->

# Title

### Skipped H2

<!-- ✅ Good -->

# Title

## Section

### Subsection
```

## Ignoring Rules

### Inline

```markdown
<!-- markdownlint-disable MD013 -->

This is a very long line that exceeds the limit but won't be flagged.

<!-- markdownlint-enable MD013 -->
```

### File-level

```markdown
<!-- markdownlint-disable MD013 MD033 -->
```

### Config file

Edit `.markdownlint.json`:

```json
{
  "MD013": false
}
```

## Resources

- [Full Documentation](./MARKDOWN_AUTOMATION.md)
- [markdownlint Rules](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md)
- [Prettier Options](https://prettier.io/docs/en/options.html)
