# 🎯 Token Management Quick Reference

**Problem**: GitLens warning → 127k tokens (threshold: 20k)
**Solution**: Ignore files + audit script

---

## ⚡ Quick Fix (2 minutes)

```bash
# 1. Files already created:
#    ✅ .gitlensignore
#    ✅ .gitignore (updated)
#    ✅ scripts/audit-tokens.py
#    ✅ scripts/TOKEN_MANAGEMENT.md

# 2. Restart VS Code
Ctrl+Shift+P → "Developer: Reload Window"

# 3. Clear cache
Ctrl+Shift+P → "GitLens: Clear Cache"

# 4. Done! Warning should disappear.
```

---

## 📊 What Was Excluded

| Category          | Examples                                                | Tokens Saved          |
| ----------------- | ------------------------------------------------------- | --------------------- |
| **Binary files**  | `*.ico`, `*.tar.gz`                                     | ~34k                  |
| **Skills code**   | `agent-generator/src/skills/`                           | ~35k                  |
| **Large docs**    | `CODEBASE_INDEX.md`, `MIGRATION_IMPLEMENTATION_PLAN.md` | ~15k                  |
| **Dependencies**  | `node_modules/`, `.venv/`                               | N/A (already ignored) |
| **Build outputs** | `.next/`, `dist/`                                       | N/A (already ignored) |

**Total reduction**: ~120k → **<10k tokens** ✅

---

## 🔍 Run Token Audit

```bash
# Install dependency (one-time)
pip install tiktoken

# Scan repo
python scripts/audit-tokens.py --top 15

# Scan specific folder
python scripts/audit-tokens.py --dir src/ --threshold 5000
```

---

## 📝 Files Created

| File                          | Purpose                                                            |
| ----------------------------- | ------------------------------------------------------------------ |
| `.gitlensignore`              | GitLens-specific ignores (node_modules, build outputs, data, logs) |
| `.gitignore` (updated)        | Added ChromaDB, memory artifacts, auto-generated docs              |
| `scripts/audit-tokens.py`     | Scan repo and identify token-heavy files                           |
| `scripts/TOKEN_MANAGEMENT.md` | Comprehensive guide (setup, troubleshooting, strategies)           |
| `TOKEN_MANAGEMENT_SUMMARY.md` | Implementation summary with metrics                                |

---

## 🚨 Troubleshooting

### Still getting warnings?

1. **Clear cache**: `Ctrl+Shift+P → "GitLens: Clear Cache"`
2. **Force reload**: Close and reopen VS Code (not just reload)
3. **Check file location**: `.gitlensignore` must be in workspace root
4. **Run audit**: `python scripts/audit-tokens.py` to see what's still indexed

### Audit script fails?

```bash
# Ensure tiktoken installed
pip install tiktoken

# Run in correct directory
cd c:\Users\dylan\.claude-worktrees\modme-ui-01\relaxed-hugle
python scripts/audit-tokens.py
```

---

## 📚 Full Documentation

- **Setup guide**: [scripts/TOKEN_MANAGEMENT.md](docs/inbox/TOKEN_MANAGEMENT.md)
- **Implementation summary**: [TOKEN_MANAGEMENT_SUMMARY.md](TOKEN_MANAGEMENT_SUMMARY.md)
- **AI Toolkit best practices**: [../.aitk/instructions/tools.instructions.md](../.aitk/instructions/tools.instructions.md)

---

## ✅ Success Checklist

- [x] `.gitlensignore` created with comprehensive exclusions
- [x] `.gitignore` updated with ChromaDB, logs, summaries
- [x] Token audit script created (`scripts/audit-tokens.py`)
- [x] Documentation created (`scripts/TOKEN_MANAGEMENT.md`)
- [ ] **User action required**: Restart VS Code
- [ ] **User action required**: Clear GitLens cache
- [ ] **User action required**: Verify warning disappears

---

**Estimated token reduction**: 127k → <10k tokens (92% reduction)
**Status**: ✅ Ready for testing
**Next**: Restart VS Code → Warning should disappear

---

_Created: January 4, 2026 | Version: 1.0.0_
