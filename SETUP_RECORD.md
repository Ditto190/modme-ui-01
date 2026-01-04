# Setup Record - ModMe UI 01

**Date:** January 1, 2026

## Actions Performed

### 1. Node.js Version Management Setup

- **Tool Used:** nvm (Node Version Manager for Windows)
- **Version Detected:** nvm v1.1.12
- **Actions:**
  - Checked existing Node.js versions: v21.7.3 (previously active), v21.6.2
  - Installed Node.js v22.9.0 (recommended version for full package compatibility)
  - Switched to Node.js v22.9.0
  - Verified installation: `node --version` → v22.9.0
  - Verified npm installation: `npm --version` → v10.8.3

### 2. Package Dependency Fixes

- **Issue:** Multiple packages required Node.js `^20.17.0 || >=22.9.0` but system was running v21.7.3
- **Resolution:** Upgraded to Node.js v22.9.0, which eliminated all EBADENGINE warnings
- **Remaining Vulnerabilities:**
  - 4 moderate severity vulnerabilities related to `prismjs` (<1.30.0)
  - Affects dependency chain: `prismjs` → `refractor` → `react-syntax-highlighter` → `@copilotkit/react-ui`
  - Fix available via `npm audit fix --force` (requires manual intervention due to breaking changes)
  - Breaking change: Would upgrade `@copilotkit/react-ui` from current version to v0.2.0

### 3. Additional Packages Installed

- **supabase:** Installed as dev dependency (`npm install supabase --save-dev`)
- **next:** Updated to latest version (`npm install next@latest`)

### 4. Documentation Updates

- **File:** [README.md](README.md)
- **Changes:**
  - Added nvm setup instructions in Prerequisites section
  - Reorganized "Getting Started" section with numbered subsections:
    1. Set up Node.js with nvm (Recommended)
    2. Install Dependencies
    3. Install Python Dependencies for the ADK Agent
    4. Set Up Your Google API Key
    5. Start the Development Server
  - Added specific nvm commands for installing and using Node.js v22.9.0
  - Clarified that Node.js 22.9.0+ is recommended for full compatibility

### 5. MCP Configuration

- **File:** `mcp.json` (located in VS Code user settings)
- **Requested Action:** Comment out the `com.supabase/mcp` server configuration (lines 33-52)
- **Reason:** Better Supabase MCP version available; local version may be used later
- **Status:** Manual edit required (file outside workspace)

**Commented-out configuration for manual application:**

```jsonc
// "com.supabase/mcp": {
//  "type": "stdio",
//  "command": "npx",
//  "args": [
//   "--project-ref",
//   "${input:project-ref}",
//   "--read-only",
//   "${input:read-only}",
//   "--features",
//   "${input:features}",
//   "--api-url",
//   "${input:api-url}",
//   "@supabase/mcp-server-supabase@0.5.10"
//  ],
//  "env": {
//   "SUPABASE_ACCESS_TOKEN": "${input:SUPABASE_ACCESS_TOKEN}"
//  },
//  "gallery": "https://api.mcp.github.com",
//  "version": "0.5.10"
// }
```

## Current System Configuration

- **Node.js:** v22.9.0
- **npm:** v10.8.3
- **Python:** 3.12+ (as per project requirements)
- **Package Manager:** npm (flexible - supports pnpm, yarn, bun)
- **nvm:** v1.1.12 (Windows)

## Verification Commands

To verify the setup, run:

```bash
# Check Node.js version
node --version  # Should show v22.9.0

# Check npm version
npm --version   # Should show v10.8.3

# Check nvm version
nvm --version   # Should show 1.1.12

# List installed Node.js versions
nvm list
```

## Next Steps (Optional)

1. **Address Remaining Vulnerabilities:**

   ```bash
   npm audit fix --force
   ```

   - **Warning:** This will upgrade `@copilotkit/react-ui` to v0.2.0 (breaking change)
   - Review [CopilotKit documentation](https://docs.copilotkit.ai) for migration guide

2. **Apply MCP Configuration Changes:**
   - Open `%APPDATA%\Code\User\mcp.json`
   - Comment out the `com.supabase/mcp` server configuration (lines 33-52)
   - Use the provided commented-out configuration above

3. **Test the Setup:**

   ```bash
   npm run dev
   ```

   - This should start both the UI (port 3000) and agent (port 8000) servers
   - Verify no Node.js engine warnings appear

## Package Manager Notes

- Lock files (package-lock.json, yarn.lock, pnpm-lock.yaml, bun.lockb) are intentionally ignored
- Generate your own lock file with your preferred package manager
- Remove the relevant entry from `.gitignore` before committing if using a specific package manager

## Environment Variables Required

```bash
# Google API Key for ADK agent
export GOOGLE_API_KEY="your-google-api-key-here"

# Get your key from: https://makersuite.google.com/app/apikey
```

## Troubleshooting

### If you need to switch Node.js versions

```bash
# List available versions
nvm list

# Switch to a specific version
nvm use 22.9.0
```

### If you encounter package installation issues

```bash
# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules
npm install
```

### If the agent server fails to start

```bash
# Verify Python virtual environment
cd agent
source .venv/bin/activate  # Unix/macOS
# or
.venv\Scripts\activate     # Windows

# Reinstall Python dependencies
pip install -r requirements.txt
```
