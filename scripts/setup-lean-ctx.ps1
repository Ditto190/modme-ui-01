# scripts/setup-lean-ctx.ps1
Write-Host "Configuring lean-ctx initialization and profile settings..."
npx --yes lean-ctx init --global
npx --yes lean-ctx tools standard
Write-Host "lean-ctx setup complete."
