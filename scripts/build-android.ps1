$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$androidRoot = Join-Path $projectRoot 'android'
$sourceApk = Join-Path $androidRoot 'app\build\outputs\apk\release\app-release.apk'
$outputDirectory = Join-Path $projectRoot 'output\apk'
$outputApk = Join-Path $outputDirectory 'Network_Diagnostics_Suite-v1.0.apk'

Push-Location $androidRoot
try {
    # VisionCamera publica sus cabeceras Prefab antes de que CMake configure la app.
    & .\gradlew.bat :react-native-vision-camera:prefabReleasePackage --no-daemon
    if ($LASTEXITCODE -ne 0) { throw 'Falló la preparación nativa de VisionCamera.' }

    & .\gradlew.bat assembleRelease --no-daemon
    if ($LASTEXITCODE -ne 0) { throw 'Falló el build release de Android.' }
}
finally {
    Pop-Location
}

New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null
Copy-Item -LiteralPath $sourceApk -Destination $outputApk -Force
$hash = Get-FileHash -LiteralPath $outputApk -Algorithm SHA256

Write-Host "APK: $outputApk"
Write-Host "SHA-256: $($hash.Hash)"
