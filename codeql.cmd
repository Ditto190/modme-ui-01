@echo off
REM Wrapper to call CodeQL installed in user roaming folder
set CODEQL_PATH=%USERPROFILE%\AppData\Roaming\Code\User\codeql\codeql.exe
if exist "%CODEQL_PATH%" (
  "%CODEQL_PATH%" %*
) else (
  echo CodeQL not found at %CODEQL_PATH%
  exit /b 1
)
