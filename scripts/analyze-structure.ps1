function Get-DirectoryStructure {
    param(
        [string]$Path = ".",
        [int]$MaxDepth = 3,
        [int]$CurrentDepth = 0,
        [string]$Prefix = ""
    )
    
    if ($CurrentDepth -gt $MaxDepth) { return }
    
    try {
        $items = Get-ChildItem -Path $Path -Force | Where-Object { 
            $_.Name -notlike "node_modules" -and 
            $_.Name -notlike ".git" -and
            $_.Name -notlike "*.log"
        } | Sort-Object @{Expression={$_.PSIsContainer}; Descending=$true}, Name
        
        foreach ($item in $items) {
            $isLast = $item -eq $items[-1]
            $currentPrefix = if ($isLast) { "└── " } else { "├── " }
            $nextPrefix = if ($isLast) { "    " } else { "│   " }
            
            Write-Host "$Prefix$currentPrefix$($item.Name)" -ForegroundColor $(if ($item.PSIsContainer) { "Cyan" } else { "White" })
            
            if ($item.PSIsContainer -and $CurrentDepth -lt $MaxDepth) {
                Get-DirectoryStructure -Path $item.FullName -MaxDepth $MaxDepth -CurrentDepth ($CurrentDepth + 1) -Prefix "$Prefix$nextPrefix"
            }
        }
    }
    catch {
        Write-Host "$Prefix└── [Error reading directory]" -ForegroundColor Red
    }
}

Write-Host "🏗️ IOTAKEYS PROJECT STRUCTURE" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Get-DirectoryStructure -MaxDepth 4

# Also check key files existence
Write-Host "`n📊 KEY FILES ANALYSIS:" -ForegroundColor Yellow
$keyFiles = @(
    "package.json",
    "src/main.js", 
    "src/renderer/index.html",
    "src/styles/main.css",
    "src/components/app.js",
    "assets/icons/icon.ico",
    "projects/WhenImGone/project.json"
)

foreach ($file in $keyFiles) {
    $exists = Test-Path $file
    $status = if ($exists) { "✅ EXISTS" } else { "❌ MISSING" }
    $color = if ($exists) { "Green" } else { "Red" }
    Write-Host "$status : $file" -ForegroundColor $color
}

Write-Host "`n📈 DIRECTORY SIZES:" -ForegroundColor Yellow
$dirs = @("src", "assets", "projects", "node_modules", "dist")
foreach ($dir in $dirs) {
    if (Test-Path $dir) {
        $size = (Get-ChildItem -Path $dir -Recurse -File | Measure-Object -Property Length -Sum).Sum
        $sizeStr = if ($size -gt 1GB) { "{0:N2} GB" -f ($size/1GB) } elseif ($size -gt 1MB) { "{0:N2} MB" -f ($size/1MB) } else { "{0:N2} KB" -f ($size/1KB) }
        Write-Host "$dir : $sizeStr" -ForegroundColor Cyan
    }
}
