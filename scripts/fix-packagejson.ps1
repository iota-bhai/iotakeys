Write-Host "🔧 Fixing package.json BOM and configuration..." -ForegroundColor Yellow

# Read the current package.json without BOM
$packageJsonPath = ".\package.json"
$content = Get-Content -Path $packageJsonPath -Raw -Encoding UTF8

# Remove BOM if present
if ($content.StartsWith([char]0xFEFF)) {
    $content = $content.Substring(1)
}

# Create the corrected package.json content
$packageJson = @"
{
  "name": "iotakeys",
  "version": "2.0.0",
  "description": "App tool to learn, practice, evaluate and skill up on any song on a digital piano",
  "main": "src/main.js",
  "scripts": {
    "start": "electron .",
    "dev": "electron . --dev",
    "build": "electron-builder --publish=never",
    "build-win": "electron-builder --win --publish=never",
    "build-all": "electron-builder --win --mac --linux --publish=never",
    "pack": "electron-builder --dir",
    "clean": "rimraf dist build node_modules/.cache",
    "rebuild": "npm run clean && npm install && npm run build",
    "test": "echo \"No tests specified\" && exit 0"
  },
  "build": {
    "appId": "com.iotakeys.app",
    "productName": "IotaKeys Piano Learning",
    "copyright": "Copyright © 2025 IotaKeys",
    "directories": {
      "output": "dist",
      "buildResources": "build"
    },
    "files": [
      "src/**/*",
      "assets/**/*",
      "projects/**/*",
      "package.json",
      "!node_modules/**/*",
      "node_modules/electron/**/*"
    ],
    "extraResources": [
      {
        "from": "assets",
        "to": "assets",
        "filter": ["**/*"]
      },
      {
        "from": "projects",
        "to": "projects",
        "filter": ["**/*"]
      }
    ],
    "win": {
      "target": [
        {
          "target": "nsis",
          "arch": ["x64"]
        },
        {
          "target": "portable",
          "arch": ["x64"]
        }
      ],
      "icon": "assets/icons/icon.ico",
      "artifactName": "${productName}-${version}-${arch}.${ext}",
      "requestedExecutionLevel": "asInvoker"
    },
    "nsis": {
      "oneClick": false,
      "perMachine": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true,
      "shortcutName": "IotaKeys"
    },
    "portable": {
      "artifactName": "IotaKeys-Portable-${version}.exe"
    },
    "mac": {
      "target": "dmg",
      "icon": "assets/icons/icon.icns",
      "category": "public.app-category.music"
    },
    "linux": {
      "target": "AppImage",
      "icon": "assets/icons/icon.png",
      "category": "Audio"
    }
  },
  "keywords": [
    "piano",
    "music",
    "learning",
    "education",
    "electron",
    "midi",
    "digital piano"
  ],
  "author": "IotaKeys Team",
  "license": "MIT",
  "devDependencies": {
    "electron": "^28.0.0",
    "electron-builder": "^24.13.3",
    "rimraf": "^5.0.0"
  },
  "dependencies": {
    "electron-store": "^8.1.0",
    "fs-extra": "^11.0.0"
  },
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  }
}
"@

# Write the corrected package.json without BOM
[System.IO.File]::WriteAllText($packageJsonPath, $packageJson, [System.Text.UTF8Encoding]::new($false))

Write-Host "✅ package.json fixed and updated" -ForegroundColor Green
