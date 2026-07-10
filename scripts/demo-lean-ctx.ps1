<#
.SYNOPSIS
Demonstrates lean-ctx memory, knowledge, and adaptive retrieval capabilities.
#>

Write-Host "=========================================="
Write-Host "  Lean-Ctx Demonstration"
Write-Host "==========================================`n"

Write-Host "--- 1. Testing Session Memory ---"
Write-Host "> Initializing new session task, finding, and decision..."
# We wrap in try/catch to suppress errors if session reset fails (e.g. if no session exists yet)
try { lean-ctx session reset 2>&1 | Out-Null } catch {}

lean-ctx session task "Implement adaptive learning demo" | Out-Null
lean-ctx session finding "Lean-ctx supports local CCP session storage" | Out-Null
lean-ctx session decision "Use the CLI to demonstrate memory capabilities" | Out-Null

Write-Host "`n> Current Session Status:"
lean-ctx session status

Write-Host "`n--- 2. Testing Knowledge Base (Lessons Learned) ---"
Write-Host "> Remembering a new best practice for React..."
lean-ctx knowledge remember "Always use functional components in React to maintain pure state." --category best_practice --key react-rules | Out-Null

Write-Host "`n> Recalling knowledge related to 'react':"
lean-ctx knowledge recall "react"

Write-Host "`n--- 3. Testing Adaptive Retrieval ---"
Write-Host "> Running an overview generation for a mock task..."
# Provide a specific mock file or just a general overview if it supports it
lean-ctx overview "React state management"

Write-Host "`n=========================================="
Write-Host "  Demonstration Complete"
Write-Host "=========================================="
