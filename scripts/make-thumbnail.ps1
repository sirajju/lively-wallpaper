Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$assets = Join-Path $root 'assets'
$out = Join-Path $assets 'thumbnail.png'

$bmp = New-Object System.Drawing.Bitmap 400, 225
$g = [System.Drawing.Graphics]::FromImage($bmp)
$rect = New-Object System.Drawing.Rectangle 0, 0, 400, 225
$brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
  $rect,
  [System.Drawing.Color]::FromArgb(255, 224, 231, 255),
  [System.Drawing.Color]::FromArgb(255, 251, 207, 232),
  45
)
$g.FillRectangle($brush, $rect)
$g.FillRectangle((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(180, 255, 255, 255))), 30, 40, 120, 60)
$g.FillRectangle((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(160, 255, 255, 255))), 170, 30, 200, 80)
$font = New-Object System.Drawing.Font 'Segoe UI', 14
$g.DrawString('Aurora Desk', $font, (New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 99, 102, 241))), 130, 190)
$g.Dispose()
$bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Copy-Item $out (Join-Path $assets 'preview.png') -Force
Write-Host "Created $out"
