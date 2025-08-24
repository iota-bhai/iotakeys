<#
production-build.ps1 (rewritten to avoid PowerShell npm wrapper issues)
Uses cmd /c to invoke npm.cmd and npx.cmd so PowerShell wrappers (npm.ps1/npx.ps1) are bypassed.
#>
param()
function Fail($msg) { Write-Error $msg; exit 1 }

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

Write-Host "Running production build (via npm.cmd / npx.cmd through cmd.exe)..."

# Run npm install via cmd to avoid PowerShell wrapper issues
$rc = Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm.cmd install" -NoNewWindow -Wait -PassThru
if ($rc.ExitCode -ne 0) { Write-Warning "npm install (cmd) returned exit code $($rc.ExitCode). Proceeding but packaging may fail." }

# Run electron-builder install-app-deps via npx.cmd
$rc2 = Start-Process -FilePath "cmd.exe" -ArgumentList "/c npx.cmd electron-builder install-app-deps" -NoNewWindow -Wait -PassThru
if ($rc2.ExitCode -ne 0) { Write-Warning "npx electron-builder install-app-deps returned $($rc2.ExitCode)." }

# Run electron-builder to create Windows portable
$rc3 = Start-Process -FilePath "cmd.exe" -ArgumentList "/c npx.cmd electron-builder -w -c.win.target=portable" -NoNewWindow -Wait -PassThru
if ($rc3.ExitCode -ne 0) { Fail "electron-builder (cmd) failed with exit code $($rc3.ExitCode)." }

Write-Host "Packaging complete. Check dist\ for artifacts."