Write-Host "🔍 Checking IotaKeys Asset Contents..." -ForegroundColor Cyan
Write-Host ""

# Check assets folder
$assetsPath = "C:\Users\Lenovo\Downloads\Iotakeys_final_debug_ready\assets"
if (Test-Path $assetsPath) {
    Write-Host "📁 ASSETS FOLDER CONTENTS:" -ForegroundColor Yellow
    Write-Host "Path: $assetsPath" -ForegroundColor Gray
    Write-Host ""
    
    Get-ChildItem -Path $assetsPath -Recurse | ForEach-Object {
        $indent = "   " * ($_.FullName.Split('\').Count - $assetsPath.Split('\').Count - 1)
        $size = if ($_.PSIsContainer) { "[DIR]" } else { 
            if ($_.Length -gt 1MB) { "[$([math]::round($_.Length/1MB, 1)) MB]" } 
            elseif ($_.Length -gt 1KB) { "[$([math]::round($_.Length/1KB, 0)) KB]" }
            else { "[$($_.Length) B]" }
        }
        Write-Host "$indent$($_.Name) $size" -ForegroundColor White
    }
    Write-Host ""
} else {
    Write-Host "❌ Assets folder not found at: $assetsPath" -ForegroundColor Red
}

# Check projects folder  
$projectsPath = "C:\Users\Lenovo\Downloads\Iotakeys_final_debug_ready\projects"
if (Test-Path $projectsPath) {
    Write-Host "📁 PROJECTS FOLDER CONTENTS:" -ForegroundColor Yellow
    Write-Host "Path: $projectsPath" -ForegroundColor Gray
    Write-Host ""
    
    Get-ChildItem -Path $projectsPath -Recurse | ForEach-Object {
        $indent = "   " * ($_.FullName.Split('\').Count - $projectsPath.Split('\').Count - 1)
        $size = if ($_.PSIsContainer) { "[DIR]" } else { 
            if ($_.Length -gt 1MB) { "[$([math]::round($_.Length/1MB, 1)) MB]" } 
            elseif ($_.Length -gt 1KB) { "[$([math]::round($_.Length/1KB, 0)) KB]" }
            else { "[$($_.Length) B]" }
        }
        Write-Host "$indent$($_.Name) $size" -ForegroundColor White
    }
    Write-Host ""
} else {
    Write-Host "❌ Projects folder not found at: $projectsPath" -ForegroundColor Red
}

Write-Host "📊 SUMMARY:" -ForegroundColor Green
if (Test-Path $assetsPath) {
    $assetCount = (Get-ChildItem -Path $assetsPath -Recurse -File).Count
    Write-Host "   Assets: $assetCount files" -ForegroundColor White
}
if (Test-Path $projectsPath) {
    $projectCount = (Get-ChildItem -Path $projectsPath -Recurse -File).Count  
    Write-Host "   Projects: $projectCount files" -ForegroundColor White
}
