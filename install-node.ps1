# Node.js and NPM installer script for Workspace
$url = "https://nodejs.org/dist/v20.12.2/node-v20.12.2-win-x64.zip"
$zipPath = "C:\Users\dylan\Monorepo_ModMe\node.zip"
$tempExtractPath = "C:\Users\dylan\Monorepo_ModMe\node-temp"
$finalDestPath = "C:\Users\dylan\Monorepo_ModMe\.node"

Write-Output "Downloading Node.js LTS (v20.12.2)..."
Invoke-WebRequest -Uri $url -OutFile $zipPath -UseBasicParsing

Write-Output "Extracting archive..."
if (Test-Path $tempExtractPath) { Remove-Item -Recurse -Force $tempExtractPath }
New-Item -ItemType Directory -Path $tempExtractPath | Out-Null
Expand-Archive -Path $zipPath -DestinationPath $tempExtractPath -Force

Write-Output "Moving files to final destination..."
if (Test-Path $finalDestPath) { Remove-Item -Recurse -Force $finalDestPath }
Move-Item -Path "$tempExtractPath\node-v20.12.2-win-x64" -Destination $finalDestPath -Force

Write-Output "Cleaning up temporary files..."
Remove-Item -Force $zipPath
Remove-Item -Recurse -Force $tempExtractPath

# Add to User PATH
Write-Output "Updating User PATH environment variable..."
$userPath = [System.Environment]::GetEnvironmentVariable("PATH", "User")
if ($userPath -notlike "*$finalDestPath*") {
    $newUserPath = $userPath + ";" + $finalDestPath
    [System.Environment]::SetEnvironmentVariable("PATH", $newUserPath, "User")
    Write-Output "Successfully added Node.js to User PATH: $finalDestPath"
} else {
    Write-Output "Node.js is already in the User PATH."
}

Write-Output "Node.js installation completed!"
