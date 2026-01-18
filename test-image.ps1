[System.Reflection.Assembly]::LoadWithPartialName('System.Drawing') | Out-Null
[System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms') | Out-Null

# Create a simple blue image
$img = New-Object System.Drawing.Bitmap(100, 100)
$graphics = [System.Drawing.Graphics]::FromImage($img)
$brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::Blue)
$graphics.FillRectangle($brush, 0, 0, 100, 100)
$graphics.Dispose()
$brush.Dispose()

# Set to clipboard
[System.Windows.Forms.Clipboard]::SetImage($img)
Write-Host "Image set to clipboard"
$img.Dispose()
