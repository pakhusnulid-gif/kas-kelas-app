# Deploy ke Netlify. Jalankan: .\deploy.ps1
# File yang ikut deploy hanya yang didaftarkan di bawah (folder .agents tidak ikut).

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$dist = Join-Path $root 'dist'
$items = @('index.html', 'manifest.webmanifest', 'sw.js', '_headers', 'css', 'js', 'icons')

Remove-Item $dist -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory $dist | Out-Null

foreach ($item in $items) {
    Copy-Item (Join-Path $root $item) $dist -Recurse -Force
}

Write-Host "Isi paket deploy:" -ForegroundColor Cyan
Get-ChildItem $dist -Recurse -File | ForEach-Object {
    Write-Host ('  ' + $_.FullName.Replace($dist, '').TrimStart('\'))
}

npx --yes netlify-cli@latest deploy --prod --dir $dist --site 6bcc131a-f65a-40f2-9d10-45cbd0a4999d
