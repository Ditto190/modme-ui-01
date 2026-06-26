# ModMe GenUI Workspace Setup (PowerShell)
# =========================================

Write-Host "🚀 ModMe GenUI Workspace Setup" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host ""

# Function to print colored output
function Print-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Print-Warning {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

function Print-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

# Navigate to repository root
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location (Join-Path $scriptPath "..")

# Check Node.js version
Write-Host "📦 Checking Node.js..."
try {
    $nodeVersion = node --version
    Print-Success "Node.js $nodeVersion found"
    
    # Check if version is >= 22.9.0
    $majorVersion = [int]($nodeVersion -replace 'v', '' -split '\.')[0]
    if ($majorVersion -lt 22) {
        Print-Warning "Node.js version should be 22.9.0 or higher"
        Print-Warning "Current version: $nodeVersion"
        Print-Warning "Consider using nvm-windows to install the correct version:"
        Write-Host "  nvm install 22.9.0"
        Write-Host "  nvm use 22.9.0"
    }
} catch {
    Print-Error "Node.js not found!"
    Write-Host "Please install Node.js 22.9.0 or higher"
    Write-Host "Visit: https://nodejs.org/ or use nvm-windows"
    Write-Host "nvm-windows: https://github.com/coreybutler/nvm-windows"
    exit 1
}

# Check Python version
Write-Host ""
Write-Host "🐍 Checking Python..."
try {
    $pythonVersion = python --version
    Print-Success "$pythonVersion found"
    
    # Check if version is >= 3.12 (major == 3 and minor >= 12)
    $versionString = $pythonVersion -replace '^Python\s+', ''
    $versionParts = $versionString -split '\.'
    if ($versionParts.Length -ge 2) {
        $pythonMajor = [int]$versionParts[0]
        $pythonMinor = [int]$versionParts[1]

        if (($pythonMajor -ne 3) -or ($pythonMinor -lt 12)) {
            Print-Warning "Python version should be 3.12 or higher"
            Print-Warning "Current version: $pythonVersion"
        }
    } else {
        Print-Warning "Unable to parse Python version from: $pythonVersion"
        Print-Warning "Please ensure Python 3.12 or higher is installed."
    }
} catch {
    Print-Error "Python not found!"
    Write-Host "Please install Python 3.12 or higher"
    Write-Host "Visit: https://www.python.org/downloads/"
    exit 1
}

# Check for uv
Write-Host ""
Write-Host "📦 Checking Python package manager..."
$useUv = $false
try {
    $uvVersion = uv --version
    Print-Success "uv $uvVersion found"
    $useUv = $true
} catch {
    Print-Warning "uv not found, will use pip instead"
    Print-Warning "Consider installing uv for faster Python package management:"
    Write-Host "  irm https://astral.sh/uv/install.ps1 | iex"
}

# Install Node.js dependencies
Write-Host ""
Write-Host "📦 Installing Node.js dependencies..."
if (Test-Path "package.json") {
    npm install
    Print-Success "Node.js dependencies installed"
} else {
    Print-Error "package.json not found!"
    exit 1
}

# Set up Python agent environment
Write-Host ""
Write-Host "🤖 Setting up Python agent environment..."
if (Test-Path "agent\pyproject.toml") {
    Push-Location agent
    
    if ($useUv) {
        Write-Host "Using uv for Python package management..."
        uv sync
        Print-Success "Python agent dependencies installed with uv"
    } else {
        Write-Host "Using pip for Python package management..."
        if (-not (Test-Path ".venv")) {
            python -m venv .venv
            Print-Success "Virtual environment created"
        }
        
        & .\.venv\Scripts\Activate.ps1
        python -m pip install --upgrade pip
        pip install -e .
        Print-Success "Python agent dependencies installed with pip"
        deactivate
    }
    
    Pop-Location
} else {
    Print-Error "agent\pyproject.toml not found!"
    exit 1
}

# Create data directory
Write-Host ""
Write-Host "📁 Setting up data directory..."
if (-not (Test-Path "data")) {
    New-Item -ItemType Directory -Path "data" | Out-Null
}
Print-Success "Data directory created"

# Set up environment file
Write-Host ""
Write-Host "📝 Setting up environment file..."
if (-not (Test-Path ".env")) {
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Print-Success ".env file created from .env.example"
        Print-Warning "Please update .env with your configuration (especially GOOGLE_API_KEY)"
    } else {
        Print-Warning ".env.example not found, skipping .env creation"
    }
} else {
    Print-Success ".env file already exists"
}

# Optional: shared LSP multiplexer (rust-analyzer across Cursor + VS Code windows)
Write-Host ""
Write-Host "🔧 Optional: lspmux (shared rust-analyzer daemon)..."
if (Test-Path (Join-Path $scriptPath "lspmux\install.ps1")) {
    Print-Warning "Not installed by default. For multi-window Rust LSP sharing:"
    Write-Host "  .\scripts\lspmux\install.ps1"
    Write-Host "  .\scripts\lspmux\start-daemon.ps1"
    Write-Host "  See docs/lspmux-setup.md"
} else {
    Print-Warning "scripts/lspmux/ not found — skip lspmux setup"
}

# Final instructions
Write-Host ""
Write-Host "==============================" -ForegroundColor Cyan
Print-Success "Setup complete!"
Write-Host ""
Write-Host "📝 Next steps:"
Write-Host "  1. Update .env with your API keys (especially GOOGLE_API_KEY)"
Write-Host "     Get your Google API key from: https://makersuite.google.com/app/apikey"
Write-Host ""
Write-Host "  2. (Optional) Shared LSP for Rust — saves RAM with Cursor + VS Code:"
Write-Host "     .\scripts\lspmux\install.ps1"
Write-Host "     .\scripts\lspmux\start-daemon.ps1"
Write-Host "     See docs/lspmux-setup.md"
Write-Host ""
Write-Host "  3. Start the development servers:"
Write-Host "     npm run dev"
Write-Host ""
Write-Host "  4. Access the application:"
Write-Host "     UI:    http://localhost:3000"
Write-Host "     Agent: http://localhost:8000"
Write-Host ""
Write-Host "Happy coding! 🎉" -ForegroundColor Cyan
