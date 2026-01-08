# ✅ Toolset Management System - Installation Checklist

Use this checklist to ensure the toolset management system is fully operational.

---

## Phase 1: Prerequisites ✅

### Node.js Dependencies

- [ ] Install `ajv`: `npm install ajv --save-dev`
- [ ] Install `ajv-formats`: `npm install ajv-formats --save-dev`
- [ ] Verify installation: `npm list ajv ajv-formats`

### Verify Environment

- [ ] Node.js 22.9.0+ installed: `node --version`
- [ ] Python 3.12+ installed: `python --version`
- [ ] Git repository initialized
- [ ] GitHub Actions enabled in repository settings

---

## Phase 2: Configuration ✅

### Review Configuration Files

- [ ] Review [agent/toolsets.json](agent/toolsets.json)
  - [ ] Verify current toolsets are correct
  - [ ] Add any missing toolsets
  - [ ] Update descriptions as needed

- [ ] Review [agent/toolset-schema.json](agent/toolset-schema.json)
  - [ ] Confirm validation rules match requirements
  - [ ] Check category enum includes all needed categories

- [ ] Review [agent/toolset_aliases.json](agent/toolset_aliases.json)
  - [ ] Confirm empty initially (or populated if migrating)

### Customize Workflows

- [ ] Review [.github/workflows/toolset-update.yml](.github/workflows/toolset-update.yml)
  - [ ] Set `AUTO_COMMIT` preference (true/false)
  - [ ] Configure notification settings
  - [ ] Adjust validation strictness if needed

- [ ] Review [.github/workflows/toolset-deprecate.yml](.github/workflows/toolset-deprecate.yml)
  - [ ] Set default `DEPRECATION_PERIOD_DAYS` (default: 180)
  - [ ] Configure issue labels
  - [ ] Set up Slack webhook (optional)

- [ ] Review [.github/workflows/toolset-validate.yml](.github/workflows/toolset-validate.yml)
  - [ ] Configure Codecov token (optional)
  - [ ] Adjust security scan severity levels
  - [ ] Review validation job requirements

- [ ] Review [.github/workflows/toolset-docs.yml](.github/workflows/toolset-docs.yml)
  - [ ] Configure GitHub Pages (optional)
  - [ ] Set documentation schedule (default: weekly)
  - [ ] Adjust commit message format

---

## Phase 3: Testing ✅

### Validate Current State

- [ ] Run validation: `npm run validate:toolsets`
  - [ ] All checks pass (schema, naming, references)
  - [ ] No errors reported
  - [ ] Review any warnings

- [ ] Run change detection: `npm run detect:changes`
  - [ ] Review detected toolsets
  - [ ] Verify groupings make sense
  - [ ] Check for any unexpected changes

### Test Scripts Individually

- [ ] Test detection: `node scripts/toolset-management/detect-toolset-changes.js`
  - [ ] Output JSON is valid
  - [ ] new_toolsets array accurate
  - [ ] modified_toolsets array accurate

- [ ] Test validation: `node scripts/toolset-management/validate-toolsets.js`
  - [ ] Schema validation passes
  - [ ] Naming convention checks work
  - [ ] Tool references verified

### Test Workflows Locally

- [ ] Install actionlint: <https://github.com/rhysd/actionlint>
- [ ] Lint workflows: `actionlint .github/workflows/toolset-*.yml`
  - [ ] No syntax errors
  - [ ] No undefined variables
  - [ ] All job dependencies valid

---

## Phase 4: Integration ✅

### Python Agent Integration

- [ ] Review [agent/INTEGRATION_EXAMPLE.py](agent/INTEGRATION_EXAMPLE.py)

- [ ] Update [agent/main.py](agent/main.py):
  - [ ] Import toolset_manager: `from toolset_manager import initialize_toolsets`
  - [ ] Call initialization: `initialize_toolsets()` on startup
  - [ ] Add toolset resolution in system instructions
  - [ ] Test deprecation warning logging

- [ ] Test Python integration:

  ```bash
  cd agent
  python toolset_manager.py
  ```

  - [ ] Toolsets load successfully
  - [ ] Aliases resolve correctly
  - [ ] Deprecation warnings log to stderr

### Verify End-to-End Flow

- [ ] Make small change to agent/main.py
- [ ] Commit and push to main
- [ ] Check GitHub Actions:
  - [ ] toolset-update workflow triggers
  - [ ] All validation jobs pass
  - [ ] Registry updates (if changes detected)
  - [ ] Documentation generates

---

## Phase 5: Create Test Deprecation ✅

### Manual Deprecation Test

- [ ] Create test toolsets in toolsets.json:

  ```json
  {
    "id": "test_old_feature",
    "name": "Old Feature (Test)",
    "description": "Test toolset for deprecation",
    "tools": ["test_tool_old"]
  },
  {
    "id": "test_new_feature",
    "name": "New Feature (Test)",
    "description": "Replacement test toolset",
    "tools": ["test_tool_new"]
  }
  ```

- [ ] Trigger deprecation workflow:

  ```bash
  gh workflow run toolset-deprecate.yml \
    -f old_toolset=test_old_feature \
    -f new_toolset=test_new_feature \
    -f reason="Testing deprecation system" \
    -f create_issue=false
  ```

- [ ] Verify workflow execution:
  - [ ] Alias created in toolset_aliases.json
  - [ ] Migration guide generated
  - [ ] Tests pass
  - [ ] Documentation updated

- [ ] Test alias resolution:

  ```python
  from toolset_manager import resolve_toolset
  canonical = resolve_toolset("test_old_feature")
  # Should log warning and return "test_new_feature"
  ```

- [ ] Clean up test:
  - [ ] Remove test toolsets from toolsets.json
  - [ ] Remove alias from toolset_aliases.json
  - [ ] Delete migration guide

---

## Phase 6: Documentation ✅

### Review Documentation

- [ ] Read [docs/TOOLSET_MANAGEMENT.md](docs/TOOLSET_MANAGEMENT.md)
  - [ ] Understand architecture
  - [ ] Review workflow descriptions
  - [ ] Familiarize with troubleshooting

- [ ] Read [docs/TOOLSET_QUICKSTART.md](docs/TOOLSET_QUICKSTART.md)
  - [ ] Understand quick start process
  - [ ] Review examples
  - [ ] Note best practices

- [ ] Review [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)
  - [ ] Understand what was created
  - [ ] Check system status
  - [ ] Review next steps

### Update Project Documentation

- [ ] Add link to toolset docs in main README
- [ ] Update CONTRIBUTING.md with toolset procedures
- [ ] Add section to Project_Overview.md if applicable

---

## Phase 7: Team Setup ✅

### GitHub Repository Settings

- [ ] Enable GitHub Actions
- [ ] Configure branch protection rules:
  - [ ] Require status checks (toolset-validate)
  - [ ] Require PR reviews
  - [ ] Restrict who can push to main

- [ ] Set up secrets (optional):
  - [ ] SLACK_WEBHOOK for notifications
  - [ ] CODECOV_TOKEN for coverage

- [ ] Configure GitHub Pages (optional):
  - [ ] Enable in settings
  - [ ] Set source to gh-pages branch
  - [ ] Configure custom domain if needed

### Team Training

- [ ] Share documentation with team
- [ ] Demonstrate deprecation workflow
- [ ] Establish review procedures
- [ ] Define who can approve deprecations

### Establish Procedures

- [ ] Document toolset naming conventions
- [ ] Define deprecation approval process
- [ ] Set up regular toolset audits
- [ ] Create template for deprecation requests

---

## Phase 8: Ongoing Maintenance ✅

### Regular Tasks

- [ ] Schedule weekly toolset reviews
- [ ] Monitor deprecation tracking issues
- [ ] Update migration guide examples
- [ ] Audit unused toolsets quarterly

### Monitoring

- [ ] Set up alerts for workflow failures
- [ ] Track toolset adoption metrics
- [ ] Monitor deprecation warning frequency
- [ ] Review user feedback and issues

### Continuous Improvement

- [ ] Collect team feedback on workflows
- [ ] Refine validation rules as needed
- [ ] Update documentation based on questions
- [ ] Add new scripts for common tasks

---

## 🎉 Completion Criteria

### System is Production-Ready When

- [x] All Node.js dependencies installed
- [x] All workflows lint without errors
- [x] Validation passes for current toolsets
- [x] Python integration tested successfully
- [x] End-to-end flow verified (code change → update)
- [x] Test deprecation completed successfully
- [x] Team trained on procedures
- [x] Documentation reviewed and understood

---

## 🚨 Troubleshooting

### Common Issues

**Issue: npm ERR! code ENOENT when running scripts**

- **Solution:** Ensure you're in project root: `cd c:\Users\dylan\modme-ui-01`

**Issue: Workflow fails with "permission denied"**

- **Solution:**
  - Check Actions are enabled in repository settings
  - Verify workflows have write permissions
  - Check branch protection rules

**Issue: Validation fails with "tool not found"**

- **Solution:**
  - Ensure tool function exists in agent/main.py
  - Check function name matches exactly
  - Verify function has ToolContext parameter

**Issue: Python import error for toolset_manager**

- **Solution:**
  - Ensure toolset_manager.py is in agent/ directory
  - Check Python path includes agent directory
  - Verify no syntax errors in toolset_manager.py

**Issue: Deprecation warning not showing**

- **Solution:**
  - Check stderr output (warnings go to stderr, not stdout)
  - Verify alias exists in toolset_aliases.json
  - Ensure resolve_toolset() is called

---

## 📞 Getting Help

If you encounter issues not covered here:

1. Check [docs/TOOLSET_MANAGEMENT.md](docs/TOOLSET_MANAGEMENT.md) troubleshooting section
2. Review workflow logs in GitHub Actions
3. Search existing GitHub issues
4. Create new issue with:
   - Error message
   - Steps to reproduce
   - Environment details (Node/Python versions)
   - Relevant configuration files

---

## 📊 Checklist Summary

**Quick Status Check:**

| Phase | Items | Status |
|-------|-------|--------|
| Prerequisites | 4 | ⬜ Not Started |
| Configuration | 8 | ⬜ Not Started |
| Testing | 8 | ⬜ Not Started |
| Integration | 5 | ⬜ Not Started |
| Test Deprecation | 6 | ⬜ Not Started |
| Documentation | 5 | ⬜ Not Started |
| Team Setup | 7 | ⬜ Not Started |
| Maintenance | 4 | ⬜ Not Started |
| **Total** | **47** | **0% Complete** |

---

**Update this file as you complete items!**

Replace ⬜ with ✅ for completed items, and track your progress.

---

_Last updated: 2025-01-01_
