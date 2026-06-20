@echo off
setlocal
set "BIN_PATH=%~dp0.tools\agenttrace.exe"

if not exist "%BIN_PATH%" (
    echo agenttrace.exe not found at %BIN_PATH%. Please run scripts\install-agenttrace.ps1
    exit /b 1
)

"%BIN_PATH%" %*
