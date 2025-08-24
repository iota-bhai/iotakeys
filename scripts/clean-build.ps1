Write-Host "🧹 Force Clean Build Process..." -ForegroundColor Cyan
Write-Host ""

# Kill any running electron processes
Write-Host "🔄 Stopping any running Electron processes..." -ForegroundColor Yellow
try {
    Get-Process -Name "electron" -ErrorAction SilentlyContinue | Stop-Process -Force
    Get-Process -Name "iotakeys*" -ErrorAction SilentlyContinue | Stop-Process -Force
    Write-Host "✅ Processes stopped" -ForegroundColor Green
} catch {
    Write-Host "ℹ️ No processes to stop" -ForegroundColor Gray
}

Start-Sleep -Seconds 2

# Force remove dist folder
Write-Host "🗑️ Force cleaning dist folder..." -ForegroundColor Yellow
if (Test-Path "dist") {
    try {
        # Try normal removal first
        Remove-Item -Path "dist" -Recurse -Force -ErrorAction Stop
        Write-Host "✅ Dist folder cleaned" -ForegroundColor Green
    } catch {
        # Force removal using cmd
        Write-Host "🔨 Using force removal..." -ForegroundColor Yellow
        cmd /c "rmdir /s /q dist"
        if (!(Test-Path "dist")) {
            Write-Host "✅ Dist folder force cleaned" -ForegroundColor Green
        } else {
            Write-Host "❌ Could not clean dist folder" -ForegroundColor Red
        }
    }
} else {
    Write-Host "ℹ️ Dist folder doesn't exist" -ForegroundColor Gray
}

# Clean npm cache
Write-Host "🧽 Cleaning npm cache..." -ForegroundColor Yellow
npm cache clean --force

Write-Host ""
Write-Host "✨ Clean complete! Ready for fresh build." -ForegroundColor Green
