$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$releaseDir = Join-Path $root "release"
$releaseRepo = Join-Path $releaseDir "BookMD-Reader-win-x64"
$stageDir = Join-Path $releaseDir "__msi-x64"
$appOutDir = Join-Path $releaseDir "win-unpacked"
$finalMsiPath = Join-Path $releaseDir "BookMD-Reader-1.0.0.msi"

$wixBase = Join-Path $env:LOCALAPPDATA "electron-builder\Cache\wix-4.0.0.5512.2"
$candle = Join-Path $wixBase "candle.exe"
$light = Join-Path $wixBase "light.exe"

if (-not (Test-Path (Join-Path $stageDir "project.wxs"))) {
    Write-Host "Generating project.wxs and win-unpacked with electron-builder..."
    New-Item -ItemType Directory -Path $stageDir -Force | Out-Null
    & npx electron-builder --win msi
}

Write-Host "Compiling WiX XML with candle.exe..."
Push-Location $stageDir
try {
    & $candle -arch x64 -pedantic "-dappDir=$appOutDir" project.wxs
    if ($LASTEXITCODE -ne 0) { throw "candle.exe failed with exit code $LASTEXITCODE" }

    Write-Host "Linking WiX Object with light.exe to: $finalMsiPath"
    & $light -out $finalMsiPath -spdb -sw1076 "-dappDir=$appOutDir" -b $appOutDir -ext WixUIExtension project.wixobj
    if ($LASTEXITCODE -ne 0) { throw "light.exe failed with exit code $LASTEXITCODE" }
} finally {
    Pop-Location
}

if (Test-Path $finalMsiPath) {
    $sizeMb = [Math]::Round((Get-Item $finalMsiPath).Length / 1MB, 2)
    Write-Host "`n🎉 MSI installer successfully created at: $finalMsiPath ($sizeMb MB)" -ForegroundColor Green

    if (Test-Path $releaseRepo) {
        $repoMsi = Join-Path $releaseRepo "BookMD-Reader-1.0.0.msi"
        Copy-Item -Path $finalMsiPath -Destination $repoMsi -Force
        Write-Host "Copied MSI to release repo: $repoMsi"
    }
} else {
    Write-Error "MSI file not found at expected path: $finalMsiPath"
}
