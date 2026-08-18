$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$releaseDir = Join-Path $root "release"
$releaseRepo = Join-Path $releaseDir "BookMD-Reader-win-x64"
$finalMsiPath = Join-Path $releaseDir "BookMD-Reader-1.0.0.msi"

Write-Host "Building MSI installer with electron-builder..."
& npx electron-builder --win msi

# Locate generated MSI
$builtMsi = Get-ChildItem -Path $releaseDir -Filter "*.msi" | Sort-Object LastWriteTime -Descending | Select-Object -First 1

if ($builtMsi) {
    if ($builtMsi.FullName -ne $finalMsiPath) {
        Copy-Item -Path $builtMsi.FullName -Destination $finalMsiPath -Force
    }

    $sizeMb = [Math]::Round((Get-Item $finalMsiPath).Length / 1MB, 2)
    Write-Host "`n🎉 MSI installer successfully created at: $finalMsiPath ($sizeMb MB)" -ForegroundColor Green

    if (Test-Path $releaseRepo) {
        $repoReleaseSubdir = Join-Path $releaseRepo "release"
        if (-not (Test-Path $repoReleaseSubdir)) {
            New-Item -ItemType Directory -Path $repoReleaseSubdir -Force | Out-Null
        }
        $repoMsi = Join-Path $repoReleaseSubdir "BookMD-Reader-1.0.0.msi"
        Copy-Item -Path $finalMsiPath -Destination $repoMsi -Force
        Write-Host "Copied MSI to release subfolder: $repoMsi"
    }
} else {
    Write-Error "Failed to locate generated MSI installer in $releaseDir"
}
