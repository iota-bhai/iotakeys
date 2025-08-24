Write-Host "📦 Copying IotaKeys Assets..." -ForegroundColor Cyan
Write-Host ""

# Source paths
$sourceAssets = "C:\Users\Lenovo\Downloads\Iotakeys_final_debug_ready\assets"
$sourceProjects = "C:\Users\Lenovo\Downloads\Iotakeys_final_debug_ready\projects"

# Destination paths
$destAssets = "$PWD\assets"
$destProjects = "$PWD\projects"

# Function to copy with progress
function Copy-WithProgress {
    param([string]$Source, [string]$Destination, [string]$ItemType)
    
    if (Test-Path $Source) {
        Write-Host "📂 Copying $ItemType..." -ForegroundColor Yellow
        Write-Host "   From: $Source" -ForegroundColor Gray
        Write-Host "   To:   $Destination" -ForegroundColor Gray
        
        try {
            # Create destination if it doesn't exist
            if (!(Test-Path $Destination)) {
                New-Item -ItemType Directory -Path $Destination -Force | Out-Null
            }
            
            # Copy all contents
            Copy-Item -Path "$Source\*" -Destination $Destination -Recurse -Force
            
            $fileCount = (Get-ChildItem -Path $Destination -Recurse -File).Count
            Write-Host "   ✅ Copied $fileCount files successfully" -ForegroundColor Green
            return $true
        } catch {
            Write-Host "   ❌ Error copying $ItemType: $($_.Exception.Message)" -ForegroundColor Red
            return $false
        }
    } else {
        Write-Host "❌ Source $ItemType not found: $Source" -ForegroundColor Red
        return $false
    }
}

# Copy assets
$assetsSuccess = Copy-WithProgress -Source $sourceAssets -Destination $destAssets -ItemType "Assets"

# Copy projects  
$projectsSuccess = Copy-WithProgress -Source $sourceProjects -Destination $destProjects -ItemType "Projects"

Write-Host ""
Write-Host "📊 COPY SUMMARY:" -ForegroundColor Cyan

if ($assetsSuccess) {
    Write-Host "✅ Assets copied successfully" -ForegroundColor Green
    
    # Show what was copied
    Write-Host ""
    Write-Host "🎨 Copied Assets:" -ForegroundColor Yellow
    Get-ChildItem -Path $destAssets -Recurse -File | ForEach-Object {
        $relativePath = $_.FullName.Replace("$destAssets\", "")
        $size = if ($_.Length -gt 1MB) { "($([math]::round($_.Length/1MB, 1)) MB)" } 
                elseif ($_.Length -gt 1KB) { "($([math]::round($_.Length/1KB, 0)) KB)" }
                else { "($($_.Length) B)" }
        Write-Host "   $relativePath $size" -ForegroundColor White
    }
} else {
    Write-Host "❌ Assets copy failed" -ForegroundColor Red
}

if ($projectsSuccess) {
    Write-Host ""
    Write-Host "📝 Copied Projects:" -ForegroundColor Yellow  
    Get-ChildItem -Path $destProjects -Recurse -File | ForEach-Object {
        $relativePath = $_.FullName.Replace("$destProjects\", "")
        $size = if ($_.Length -gt 1MB) { "($([math]::round($_.Length/1MB, 1)) MB)" } 
                elseif ($_.Length -gt 1KB) { "($([math]::round($_.Length/1KB, 0)) KB)" }
                else { "($($_.Length) B)" }
        Write-Host "   $relativePath $size" -ForegroundColor White
    }
} else {
    Write-Host "❌ Projects copy failed" -ForegroundColor Red
}

Write-Host ""
if ($assetsSuccess -and $projectsSuccess) {
    Write-Host "🎉 All assets and projects copied successfully!" -ForegroundColor Green
    Write-Host "Ready to build the application!" -ForegroundColor Cyan
} elseif ($assetsSuccess -or $projectsSuccess) {
    Write-Host "⚠️ Partial success - some items copied" -ForegroundColor Yellow
} else {
    Write-Host "💥 Copy operation failed" -ForegroundColor Red
}
