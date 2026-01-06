# GitHub Codespaces Secrets Setup

This guide explains how to configure environment variables in GitHub Codespaces without committing sensitive data.

## 🎯 How It Works

1. **Add secrets in GitHub** (Settings → Codespaces → Secrets)
2. **Secrets are injected** as environment variables when Codespace starts
3. **Automated script** reads env vars and writes to `.env` file
4. **Your app reads** from `.env` as normal

## 📝 Step-by-Step Setup

### 1. Add Codespaces Secrets to Repository

Go to your repository settings:
```
https://github.com/Ditto190/modme-ui-01/settings/secrets/codespaces
```

Or use GitHub CLI:
```bash
# Example: add a single secret
gh secret set GOOGLE_API_KEY --repo Ditto190/modme-ui-01 -b "your_actual_key_here"

# Add multiple secrets interactively
gh secret set COPILOT_CLOUD_API_KEY --repo Ditto190/modme-ui-01
# Paste value when prompted
```

### 2. Bulk Upload from Existing `.env`

**Option A: Use PowerShell script** (from local machine):

```powershell
# Read .env and upload each as Codespaces secret
Get-Content .env |
  Where-Object { $_ -and ($_ -notmatch '^\s*#') -and ($_ -match '=') } |
  ForEach-Object {
    $kv = $_ -split '=', 2
    $key = $kv[0].Trim()
    $value = $kv[1].Trim()
    gh secret set $key --repo Ditto190/modme-ui-01 --body $value
    Write-Host "✓ Added $key" -ForegroundColor Green
  }
```

**Option B: Use Bash script** (from WSL/Linux/macOS):

```bash
# Read .env and upload each as Codespaces secret
while IFS='=' read -r key value; do
  # Skip comments and empty lines
  [[ "$key" =~ ^#.*$ ]] && continue
  [[ -z "$key" ]] && continue
  
  # Trim whitespace
  key=$(echo "$key" | xargs)
  value=$(echo "$value" | xargs)
  
  gh secret set "$key" --repo Ditto190/modme-ui-01 --body "$value"
  echo "✓ Added $key"
done < .env
```

### 3. Supported Secrets

The script automatically loads these variables from Codespaces environment:

| Variable | Description | Required? |
|----------|-------------|-----------|
| `GOOGLE_API_KEY` | Google AI API key for ADK agent | ✅ Yes |
| `COPILOT_CLOUD_API_KEY` | CopilotKit Cloud features | Optional |
| `GITHUB_PERSONAL_ACCESS_TOKEN` | GitHub MCP server access | Optional |
| `GITHUB_TOKEN` | Automatically provided by Codespaces | Auto |
| `VTCODE_MCP_URL` | VT Code MCP integration endpoint | Optional |
| `DATABASE_URL` | Database connection string | Optional |
| `OPENAI_API_KEY` | OpenAI API key | Optional |
| `ANTHROPIC_API_KEY` | Anthropic API key | Optional |
| `AZURE_OPENAI_API_KEY` | Azure OpenAI key | Optional |
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI endpoint | Optional |
| `SUPABASE_URL` | Supabase project URL | Optional |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | Optional |

**To add more secrets**: edit `.devcontainer/load-codespaces-secrets.sh` and add to the `SECRETS_TO_LOAD` array.

### 4. Create a Codespace

Via GitHub UI:
1. Go to https://github.com/Ditto190/modme-ui-01
2. Click **Code** → **Codespaces** → **Create codespace on feature/genui-workbench-refactor**

Via GitHub CLI:
```bash
gh codespace create \
  --repo Ditto190/modme-ui-01 \
  --branch feature/genui-workbench-refactor \
  --machine standardLinux32gb

# Then open in VS Code
gh codespace code --repo Ditto190/modme-ui-01
```

### 5. Verify Setup

Once the Codespace opens, check the terminal output:

```
⚙️  Configuring environment...
   ✓ .env created from .env.example
🔐 Loading Codespaces secrets into .env...
   ✓ Detected GitHub Codespace: modme-ui-01-abcd1234
   ✓ Updated GOOGLE_API_KEY
   ✓ Updated GITHUB_TOKEN
   ✅ Loaded 2 secret(s) from Codespaces environment
```

Then verify `.env` has values:
```bash
cat .env | grep GOOGLE_API_KEY
# Should show: GOOGLE_API_KEY=your_actual_key_here (not placeholder)
```

## 🔐 Security Best Practices

✅ **Do this:**
- Add secrets via GitHub Settings → Codespaces → Secrets
- Use Codespaces secrets for all API keys and credentials
- Commit `.env.example` with placeholder values
- Keep `.env` in `.gitignore`

❌ **Don't do this:**
- Never commit `.env` with real secrets
- Never hardcode API keys in source code
- Never share secrets in issues/PRs/comments

## 🛠️ Advanced: Organization-Level Secrets

For teams, add secrets at organization level:

1. Go to: `https://github.com/organizations/YOUR_ORG/settings/secrets/codespaces`
2. Add secret
3. Choose which repositories can access it

This way, all team members get the same secrets when they create Codespaces.

## 📚 Reference

- [GitHub Codespaces Secrets Docs](https://docs.github.com/en/codespaces/managing-your-codespaces/managing-encrypted-secrets-for-your-codespaces)
- [GitHub CLI Secrets](https://cli.github.com/manual/gh_secret)
- [Codespaces Environment Variables](https://docs.github.com/en/codespaces/developing-in-codespaces/default-environment-variables-for-your-codespace)

## 🔄 Script Details

The automation is handled by:
- `.devcontainer/load-codespaces-secrets.sh` - Reads env vars and updates `.env`
- `.devcontainer/post-create.sh` - Runs the loader after container creation

See the scripts for full implementation details.
