@echo off
"C:\Program Files\Git\bin\bash.exe" -l -c "\"$(cygpath -u \"$CLAUDE_PLUGIN_ROOT\")/hooks/session-start.sh\""
exit /b

# Alternate wrapper (same polyglot) for tools that expect a .mc extension
"${CLAUDE_PLUGIN_ROOT}/hooks/session-start.sh"
