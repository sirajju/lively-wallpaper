# Package Aurora Desk for Lively Wallpaper (.zip import)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$outZip = Join-Path $root 'aurora-desk.lively.zip'

& (Join-Path $PSScriptRoot 'make-thumbnail.ps1')

$include = @(
  'index.html',
  'style.css',
  'script.js',
  'LivelyInfo.json',
  'LivelyProperties.json',
  'assets',
  'js',
  'presets'
)

$staging = Join-Path $env:TEMP 'aurora-desk-lively-staging'
if (Test-Path $staging) { Remove-Item $staging -Recurse -Force }
New-Item -ItemType Directory -Path $staging | Out-Null

foreach ($item in $include) {
  $src = Join-Path $root $item
  if (Test-Path $src) {
    Copy-Item $src (Join-Path $staging $item) -Recurse -Force
  }
}

if (Test-Path $outZip) { Remove-Item $outZip -Force }
Compress-Archive -Path (Join-Path $staging '*') -DestinationPath $outZip -Force
Remove-Item $staging -Recurse -Force

Write-Host "Created: $outZip"
Write-Host "Import in Lively: drag this .zip into Lively, or Add Wallpaper -> Open -> select the zip."
