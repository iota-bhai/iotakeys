Write-Host "🚀 Complete IotaKeys Build Process..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Clean
Write-Host "Step 1: Cleaning..." -ForegroundColor Yellow
.\clean-build.ps1

# Step 2: Copy assets (if not already done)
Write-Host ""
Write-Host "Step 2: Ensuring assets are copied..." -ForegroundColor Yellow
if (!(Test-Path "assets") -or !(Test-Path "projects")) {
    Write-Host "Assets/Projects missing, running copy..." -ForegroundColor Yellow
    .\copy-assets.ps1
} else {
    Write-Host "✅ Assets and projects already present" -ForegroundColor Green
}

# Step 3: Install dependencies
Write-Host ""
Write-Host "Step 3: Installing/updating dependencies..." -ForegroundColor Yellow
npm install

# Step 4: Test the app quickly
Write-Host ""
Write-Host "Step 4: Quick app test..." -ForegroundColor Yellow
Write-Host "Starting app for 5 seconds to verify it works..." -ForegroundColor Gray

$testProcess = Start-Process -FilePath "npm" -ArgumentList "start" -PassThru
Start-Sleep -Seconds 5

if (!$testProcess.HasExited) {
    Write-Host "✅ App is running - stopping for build..." -ForegroundColor Green
    $testProcess.Kill()
    Start-Sleep -Seconds 2
} else {
    Write-Host "❌ App failed to start - check for errors" -ForegroundColor Red
    Read-Host "Press Enter to continue anyway or Ctrl+C to abort"
}

# Step 5: Build
Write-Host ""
Write-Host "Step 5: Building executable..." -ForegroundColor Yellow

Write-Host "Building Windows installer..." -ForegroundColor Cyan
npm run build:win

Write-Host ""
Write-Host "Building Windows portable..." -ForegroundColor Cyan  
npm run build:win-portable

# Step 6: Results
Write-Host ""
Write-Host "🎉 BUILD COMPLETE!" -ForegroundColor Green
Write-Host ""

if (Test-Path "dist") {
    Write-Host "📦 Built Files:" -ForegroundColor Cyan
    Get-ChildItem -Path "dist" -Filter "*.exe" | ForEach-Object {
        $size = [math]::round($_.Length/1MB, 1)
        Write-Host "   📁 $($_.Name) ($size MB)" -ForegroundColor White
        
        if ($_.Name -like "*Portable*") {
            Write-Host "      👆 This is your PORTABLE executable!" -ForegroundColor Green
        } elseif ($_.Name -like "*Setup*") {
            Write-Host "      👆 This is your INSTALLER executable!" -ForegroundColor Green
        }
    }
    
    Write-Host ""
    Write-Host "🎯 SUCCESS! Your IotaKeys executables are ready!" -ForegroundColor Green
    Write-Host "The portable version can run on any Windows PC without installation." -ForegroundColor Cyan
    
} else {
    Write-Host "❌ Build failed - no dist folder created" -ForegroundColor Red
    Write-Host "Check the error messages above" -ForegroundColor Yellow
}
