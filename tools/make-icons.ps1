# Draws the JARVIS app icon (arc-reactor style) as PNGs in public/icons.
# Run: powershell -ExecutionPolicy Bypass -File tools\make-icons.ps1
Add-Type -AssemblyName System.Drawing
$out = Join-Path $PSScriptRoot '..\public\icons'
New-Item -ItemType Directory -Force $out | Out-Null

function New-Icon([int]$S, [string]$path, [double]$scale = 1.0) {
  $bmp = New-Object System.Drawing.Bitmap $S, $S
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $g.InterpolationMode = 'HighQualityBicubic'
  $c = $S / 2.0
  $u = $S / 100.0 * $scale   # 1 unit = 1% of the icon (scaled for maskable safe zone)

  # background: deep navy with a soft cyan radial glow
  $g.Clear([System.Drawing.Color]::FromArgb(255, 2, 7, 13))
  $gp = New-Object System.Drawing.Drawing2D.GraphicsPath
  $gp.AddEllipse([float]($c - 60 * $u), [float]($c - 60 * $u), [float](120 * $u), [float](120 * $u))
  $pg = New-Object System.Drawing.Drawing2D.PathGradientBrush $gp
  $pg.CenterColor = [System.Drawing.Color]::FromArgb(110, 0, 229, 255)
  $pg.SurroundColors = @([System.Drawing.Color]::FromArgb(0, 0, 229, 255))
  $g.FillEllipse($pg, [float]($c - 60 * $u), [float]($c - 60 * $u), [float](120 * $u), [float](120 * $u))

  $cyan = [System.Drawing.Color]::FromArgb(255, 0, 229, 255)
  function Ring($r, $w, $alpha) {
    $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb($alpha, 0, 229, 255)), ([float]($w * $u))
    $g.DrawEllipse($pen, [float]($c - $r * $u), [float]($c - $r * $u), [float](2 * $r * $u), [float](2 * $r * $u))
    $pen.Dispose()
  }
  # glow passes then crisp rings
  foreach ($a in @(@(40, 7), @(70, 4))) { Ring 38 $a[1] $a[0] }
  Ring 38 1.6 255
  Ring 26 1.2 200

  # segmented outer ring: 10 arc segments
  $segPen = New-Object System.Drawing.Pen $cyan, ([float](5 * $u))
  $glowPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(60, 0, 229, 255)), ([float](10 * $u))
  $r = 32
  for ($i = 0; $i -lt 10; $i++) {
    $start = $i * 36 - 90 + 4
    $g.DrawArc($glowPen, [float]($c - $r * $u), [float]($c - $r * $u), [float](2 * $r * $u), [float](2 * $r * $u), [float]$start, [float]26)
    $g.DrawArc($segPen, [float]($c - $r * $u), [float]($c - $r * $u), [float](2 * $r * $u), [float](2 * $r * $u), [float]$start, [float]26)
  }

  # hexagon (core housing)
  $hex = @()
  for ($k = 0; $k -lt 6; $k++) {
    $ang = (-90 + $k * 60) * [Math]::PI / 180
    $hex += New-Object System.Drawing.PointF ([float]($c + 18 * $u * [Math]::Cos($ang))), ([float]($c + 18 * $u * [Math]::Sin($ang)))
  }
  $hexPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(230, 0, 229, 255)), ([float](1.8 * $u))
  $g.DrawPolygon($hexPen, $hex)

  # HUD reticle ticks outside the rings (top, right, bottom, left)
  $tickPen = New-Object System.Drawing.Pen $cyan, ([float](2.2 * $u))
  foreach ($deg in @(0, 90, 180, 270)) {
    $a = $deg * [Math]::PI / 180
    $g.DrawLine($tickPen, [float]($c + 42 * $u * [Math]::Cos($a)), [float]($c + 42 * $u * [Math]::Sin($a)), [float]($c + 47 * $u * [Math]::Cos($a)), [float]($c + 47 * $u * [Math]::Sin($a)))
  }

  # glowing core
  foreach ($step in @(@(16, 30), @(12, 60), @(9, 120))) {
    $b = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb($step[1], 0, 229, 255))
    $g.FillEllipse($b, [float]($c - $step[0] * $u), [float]($c - $step[0] * $u), [float](2 * $step[0] * $u), [float](2 * $step[0] * $u))
    $b.Dispose()
  }
  $core = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 210, 252, 255))
  $g.FillEllipse($core, [float]($c - 6 * $u), [float]($c - 6 * $u), [float](12 * $u), [float](12 * $u))

  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
}

New-Icon 180 (Join-Path $out 'apple-touch-icon.png')
New-Icon 192 (Join-Path $out 'icon-192.png')
New-Icon 512 (Join-Path $out 'icon-512.png')
New-Icon 512 (Join-Path $out 'maskable-512.png') 0.8
New-Icon 32  (Join-Path $out 'favicon-32.png')
Write-Output "Icons written to $out"
