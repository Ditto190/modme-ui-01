#!/bin/bash
# ============================================================
# Load Codespaces Secrets into .env
# ============================================================
# This script reads environment variables (GitHub Codespaces secrets)
# and populates the .env file with values.
# 
# Usage: Run automatically from post-create.sh in Codespaces
# 
# How it works:
# 1. GitHub Codespaces secrets are injected as environment variables
# 2. This script checks for those variables and writes them to .env
# 3. Falls back to .env.example placeholders if secrets aren't set
# ============================================================

set -e

ENV_FILE=".env"
ENV_EXAMPLE=".env.example"

echo "🔐 Loading Codespaces secrets into .env..."

# Check if we're in a Codespace (CODESPACE_NAME is set)
if [ -z "$CODESPACE_NAME" ]; then
    echo "   ℹ️  Not running in GitHub Codespaces - skipping secret loading"
    exit 0
fi

echo "   ✓ Detected GitHub Codespace: $CODESPACE_NAME"

# Create .env from .env.example if it doesn't exist
if [ ! -f "$ENV_FILE" ]; then
    if [ -f "$ENV_EXAMPLE" ]; then
        cp "$ENV_EXAMPLE" "$ENV_FILE"
        echo "   ✓ Created .env from .env.example"
    else
        echo "   ⚠️  .env.example not found - creating empty .env"
        touch "$ENV_FILE"
    fi
fi

# Function to update or add env var in .env
update_env_var() {
    local key="$1"
    local value="$2"
    local env_file="$3"
    
    if [ -z "$value" ]; then
        return  # Skip if value is empty
    fi
    
    # Escape special characters in value for sed
    local escaped_value=$(echo "$value" | sed 's/[\/&]/\\&/g')
    
    # Check if key exists in file
    if grep -q "^${key}=" "$env_file"; then
        # Update existing key
        sed -i "s|^${key}=.*|${key}=${escaped_value}|" "$env_file"
        echo "   ✓ Updated $key"
    else
        # Append new key
        echo "${key}=${escaped_value}" >> "$env_file"
        echo "   ✓ Added $key"
    fi
}

# List of environment variables to check and populate
# Add more as needed for your project
SECRETS_TO_LOAD=(
    "GOOGLE_API_KEY"
    "COPILOT_CLOUD_API_KEY"
    "GITHUB_PERSONAL_ACCESS_TOKEN"
    "GITHUB_TOKEN"
    "VTCODE_MCP_URL"
    "DATABASE_URL"
    "OPENAI_API_KEY"
    "ANTHROPIC_API_KEY"
    "AZURE_OPENAI_API_KEY"
    "AZURE_OPENAI_ENDPOINT"
    "SUPABASE_URL"
    "SUPABASE_ANON_KEY"
)

secrets_loaded=0

# Load each secret from environment
for secret in "${SECRETS_TO_LOAD[@]}"; do
    # Get value from environment variable
    value="${!secret}"
    
    if [ -n "$value" ]; then
        update_env_var "$secret" "$value" "$ENV_FILE"
        secrets_loaded=$((secrets_loaded + 1))
    fi
done

if [ $secrets_loaded -gt 0 ]; then
    echo "   ✅ Loaded $secrets_loaded secret(s) from Codespaces environment"
else
    echo "   ⚠️  No Codespaces secrets found - using .env.example values"
    echo "   📝 Add secrets at: Settings → Secrets and variables → Codespaces"
fi

# Ensure .env is not committed
if ! grep -q "^\.env$" .gitignore 2>/dev/null; then
    echo ".env" >> .gitignore
    echo "   ✓ Added .env to .gitignore"
fi

echo ""
