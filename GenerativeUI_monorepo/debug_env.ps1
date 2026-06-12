Get-ChildItem -Path . -Directory | Select-Object Name > debug_output.txt
Write-Output "--- Apps ---" >> debug_output.txt
if (Test-Path "apps") {
    Get-ChildItem -Path apps -Directory | Select-Object Name >> debug_output.txt
} else {
    Write-Output "apps dir not found" >> debug_output.txt
}

Write-Output "--- Python ---" >> debug_output.txt
Get-Command python | Select-Object Source >> debug_output.txt

Write-Output "--- Node ---" >> debug_output.txt
Get-Command node | Select-Object Source >> debug_output.txt
