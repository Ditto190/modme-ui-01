@echo off
REM ============================================================
REM ModMe GenUI Workbench - Complete Installation Script (Windows)
REM ============================================================

setlocal enabledelayedexpansion

echo.
echo ============================================================
echo   ModMe GenUI Workbench - Installation
echo ============================================================
echo.

REM Navigate to repository root
cd /d "%~dp0\.."
set REPO_ROOT=%CD%

REM Parse arguments
set CHECK_ONLY=false
set SKIP_VALIDATION=false
set FORCE_REINSTALL=false

:parse_args
if "%~1"=="" goto end_parse
if /i "%~1"=="--check-only" set CHECK_ONLY=true
if /i "%~1"=="--skip-validation" set SKIP_VALIDATION=true
if /i "%~1"=="--force" set FORCE_REINSTALL=true
if /i "%~1"=="--help" (
    echo Usage: scripts\install-all.bat [OPTIONS]
    echo.
    echo Options:
    echo   --check-only       Only check prerequisites, don't install
    echo   --skip-validation  Skip validation steps
    echo   --force            Force reinstall even if already installed
    echo   --help             Show this help message
    exit /b 0
)
shift
goto parse_args
:end_parse

REM ============================================================
REM STEP 1: Prerequisites Check
REM ============================================================

echo.
echo [1] Prerequisites Check
echo ============================================================

REM Check Node.js
echo Checking Node.js...
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found!
    echo   Visit: https://nodejs.org/
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo [OK] Node.js %NODE_VERSION%

REM Check npm
echo Checking npm...
where npm >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm not found!
    exit /b 1
)

for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo [OK] npm %NPM_VERSION%

REM Check Python
echo Checking Python...
where python >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found!
    echo   Visit: https://www.python.org/downloads/
    exit /b 1
)

for /f "tokens=2" %%i in ('python --version') do set PYTHON_VERSION=%%i
echo [OK] Python %PYTHON_VERSION%

REM Check uv
echo Checking uv...
where uv >nul 2>&1
if errorlevel 1 (
    echo [WARNING] uv not found - installing...
    pip install uv
    if errorlevel 1 (
        echo [ERROR] Failed to install uv
        exit /b 1
    )
)

for /f "tokens=*" %%i in ('uv --version 2^>^&1') do set UV_VERSION=%%i
echo [OK] %UV_VERSION%

if "%CHECK_ONLY%"=="true" (
    echo.
    echo [SUCCESS] All prerequisites satisfied!
    exit /b 0
)

REM ============================================================
REM STEP 2: Environment Configuration
REM ============================================================

echo.
echo [2] Environment Configuration
echo ============================================================

if not exist .env (
    echo Creating .env from template...
    if exist .env.example (
        copy .env.example .env >nul
        echo [OK] .env created
        echo [WARNING] Please edit .env and add your GOOGLE_API_KEY
        echo   Get key from: https://aistudio.google.com/app/apikey
    ) else (
        echo [ERROR] .env.example not found!
    )
) else (
    echo [INFO] .env already exists
)

REM ============================================================
REM STEP 3: Node.js Dependencies
REM ============================================================

echo.
echo [3] Node.js Dependencies
echo ============================================================

if "%FORCE_REINSTALL%"=="true" (
    if exist node_modules (
        echo Removing existing node_modules...
        rmdir /s /q node_modules
    )
)

if not exist node_modules (
    echo Installing Node.js dependencies...
    call npm install
    if errorlevel 1 (
        echo [ERROR] npm install failed!
        exit /b 1
    )
    echo [OK] Node.js dependencies installed
) else (
    echo [INFO] node_modules exists (use --force to reinstall)
)

REM ============================================================
REM STEP 4: Python Agent Setup
REM ============================================================

echo.
echo [4] Python Agent Setup
echo ============================================================

cd agent

if "%FORCE_REINSTALL%"=="true" (
    if exist .venv (
        echo Removing existing .venv...
        rmdir /s /q .venv
    )
)

if not exist .venv (
    echo Installing Python dependencies with uv...
    call uv sync
    if errorlevel 1 (
        echo [ERROR] uv sync failed!
        exit /b 1
    )
    echo [OK] Python dependencies installed
) else (
    echo [INFO] .venv exists (use --force to reinstall)
)

cd "%REPO_ROOT%"

REM ============================================================
REM STEP 5: Validation
REM ============================================================

if "%SKIP_VALIDATION%"=="false" (
    echo.
    echo [5] Validation
    echo ============================================================
    
    echo Validating toolsets...
    call npm run validate:toolsets
    
    echo Running linter...
    call npm run lint
)

REM ============================================================
REM SUMMARY
REM ============================================================

echo.
echo ============================================================
echo   Installation Complete!
echo ============================================================
echo.
echo Next steps:
echo.
echo 1. Configure API key (if not done):
echo    notepad .env  # Add GOOGLE_API_KEY
echo.
echo 2. Start development servers:
echo    npm run dev
echo.
echo 3. Open browser:
echo    http://localhost:3000 (Next.js UI)
echo    http://localhost:8000/health (Agent health)
echo.
echo [SUCCESS] Ready to build!
echo.

exit /b 0
