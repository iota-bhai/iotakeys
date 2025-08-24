# IotaKeys Production Build Script
Write-Host "🎹 Building IotaKeys..." -ForegroundColor Cyan

if (Test-Path "dist") { Remove-Item -Recurse -Force "dist" }

npm install
npm run build:portable

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Build successful! Check dist/ folder" -ForegroundColor Green
    if (Test-Path "dist") {
        Get-ChildItem "dist" -Filter "*.exe" | ForEach-Object {
            $sizeMB = [math]::round($_.Length/1MB, 1)
            Write-Host "📦 $($_.Name) ($sizeMB MB)" -ForegroundColor Cyan
        }
    }
} else {
    Write-Host "❌ Build failed" -ForegroundColor Red
}
