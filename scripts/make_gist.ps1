# Script to gather ONLY critical files for IotaKeys functionality diagnosis
$outputFile = "iotakeys-critical-files-only.txt"
$rootPath = "C:\Users\Lenovo\IotaKeys"

Write-Host "🎯 Gathering ONLY critical files for functionality diagnosis..." -ForegroundColor Green

# Function to get file content safely
function Get-SafeFileContent {
    param($filePath)
    try {
        if (!(Test-Path $filePath)) { return "[FILE NOT FOUND]" }
        if ((Get-Item $filePath).Length -gt 50KB) {
            return "[FILE TOO LARGE - $('{0:N0}' -f (Get-Item $filePath).Length) bytes] - First 2000 chars:`n" + (Get-Content $filePath -Raw -ErrorAction Stop).Substring(0, 2000)
        }
        return Get-Content $filePath -Raw -ErrorAction Stop
    } catch {
        return "[ERROR: $($_.Exception.Message)]"
    }
}

$content = @"
IOTAKEYS CRITICAL FILES FOR FUNCTIONALITY DIAGNOSIS
===================================================
Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
Issue: App opens, buttons click, but functionality not working

"@

# CRITICAL FILES - Only what's needed to diagnose functionality issues
$criticalFiles = @(
    'package.json',
    'main.js',
    'src/main.js', 
    'src/preload.js',
    'src/renderer.js',
    'src/index.html',
    'src/renderer/index.html',
    'src/components/app.js',
    'src/components/piano.js',
    'src/components/practice-engine.js',
    'src/components/midi-handler.js'
)

foreach ($file in $criticalFiles) {
    $fullPath = Join-Path $rootPath $file
    $content += "`n`n" + "="*60 + "`n"
    $content += "FILE: $file`n"
    $content += "="*60 + "`n"
    $content += Get-SafeFileContent $fullPath
}

# Console errors check - if you have any error logs
$errorLogFiles = @(
    'iotakeys-debug-20250818-035908.txt',
    'iotakeys-complete-debug.txt'
)

$content += "`n`n" + "="*60 + "`n"
$content += "ERROR LOGS (IF ANY)`n"
$content += "="*60 + "`n"

foreach ($logFile in $errorLogFiles) {
    $fullPath = Join-Path $rootPath $logFile
    if (Test-Path $fullPath) {
        $content += "`n--- LOG: $logFile ---`n"
        $content += Get-SafeFileContent $fullPath
    }
}

# Write output
$content | Out-File -FilePath $outputFile -Encoding UTF8

Write-Host "✅ Critical files extracted: $outputFile" -ForegroundColor Green
Write-Host "📊 Size: $([math]::Round((Get-Item $outputFile).Length / 1KB, 1)) KB" -ForegroundColor Yellow

# Quick file check
Write-Host "`n📋 FILE STATUS CHECK:" -ForegroundColor Cyan
foreach ($file in $criticalFiles) {
    $fullPath = Join-Path $rootPath $file
    $status = if (Test-Path $fullPath) { "✅ EXISTS" } else { "❌ MISSING" }
    Write-Host "   $status : $file" -ForegroundColor $(if (Test-Path $fullPath) { "Green" } else { "Red" })
}

Write-Host "`n📤 Upload this smaller file to gist and share the link!" -ForegroundColor Yellow