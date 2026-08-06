# Builds the installable add-on package.
#
# An .xpi is a plain zip whose manifest.json sits at the ROOT of the archive, so the contents of
# the source folder are zipped, never the folder itself. Everything that is only useful while
# developing is left out: shipping the repository would leak nothing secret, but it does bloat the
# download and gives the add-on reviewers more to read than necessary.
#
#   .\build.ps1              -> dist\smartreply-ai.xpi
#   .\build.ps1 -Bump patch  -> bumps the version in manifest.json first, then builds

param(
    [ValidateSet('none', 'patch', 'minor', 'major')]
    [string]$Bump = 'none'
)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$dist = Join-Path $root 'dist'
$staging = Join-Path $dist 'staging'
$manifestPath = Join-Path $root 'manifest.json'

# --- optional version bump -------------------------------------------------
if ($Bump -ne 'none') {
    $manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
    $parts = $manifest.version.Split('.')
    $major = [int]$parts[0]; $minor = [int]$parts[1]; $patch = [int]$parts[2]

    switch ($Bump) {
        'major' { $major++; $minor = 0; $patch = 0 }
        'minor' { $minor++; $patch = 0 }
        'patch' { $patch++ }
    }

    $new = "$major.$minor.$patch"
    # Rewriting the single line rather than re-serialising the whole file: ConvertTo-Json would
    # reorder keys and reformat everything, turning every build into a noisy diff.
    $updated = (Get-Content $manifestPath -Raw) -replace '("version"\s*:\s*)"[^"]+"', "`$1`"$new`""

    # Written through .NET with an explicit BOM-less encoder: Set-Content -Encoding utf8 emits a
    # BOM on Windows PowerShell, which makes manifest.json invalid JSON for every strict parser.
    [System.IO.File]::WriteAllText($manifestPath, $updated, (New-Object System.Text.UTF8Encoding($false)))
    Write-Host "Version bumped to $new" -ForegroundColor Cyan
}

$version = (Get-Content $manifestPath -Raw | ConvertFrom-Json).version
$addonId = (Get-Content $manifestPath -Raw | ConvertFrom-Json).applications.gecko.id

# --- stage the files that actually ship ------------------------------------
if (Test-Path $staging) { Remove-Item $staging -Recurse -Force }
New-Item -ItemType Directory -Path $staging -Force | Out-Null

$ship = @(
    'manifest.json',
    'background.js', 'popup.js', 'popup.html', 'popup.css',
    'options.js', 'options.html',
    'history.js', 'history-ui.js', 'history.html', 'history.css',
    'LICENSE'
)

foreach ($file in $ship) {
    $source = Join-Path $root $file
    if (-not (Test-Path $source)) { throw "Missing file listed in the ship list: $file" }
    Copy-Item $source -Destination $staging
}

Copy-Item (Join-Path $root 'icons') -Destination $staging -Recurse

# --- package ---------------------------------------------------------------
# Versioned filename: each build gets its own artifact, so a previously built file being held open
# by another process cannot fail the build, and a release asset can never be mistaken for another
# version's.
$xpi = Join-Path $dist "smartreply-ai-$version.xpi"
if (Test-Path $xpi) { Remove-Item $xpi -Force }

# Built entry by entry instead of with Compress-Archive, which writes nested paths as
# "icons\icon.svg". The ZIP format requires forward slashes, and Thunderbird resolves the icon
# paths from the manifest literally: with backslashes every icon silently fails to load.
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$archive = [System.IO.Compression.ZipFile]::Open($xpi, 'Create')
try {
    $prefix = $staging.TrimEnd('\') + '\'

    Get-ChildItem $staging -Recurse -File | ForEach-Object {
        $entryName = $_.FullName.Substring($prefix.Length).Replace('\', '/')
        [void][System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
            $archive, $_.FullName, $entryName, [System.IO.Compression.CompressionLevel]::Optimal)
    }
}
finally {
    $archive.Dispose()
}

Remove-Item $staging -Recurse -Force

# Cheap guard against the failure mode above coming back unnoticed.
$check = [System.IO.Compression.ZipFile]::OpenRead($xpi)
try {
    $bad = $check.Entries | Where-Object { $_.FullName -like '*\*' }
    $hasManifest = $check.Entries | Where-Object { $_.FullName -eq 'manifest.json' }

    if ($bad) { throw "Archive contains backslash paths: $($bad[0].FullName)" }
    if (-not $hasManifest) { throw 'manifest.json is not at the root of the archive' }
}
finally {
    $check.Dispose()
}

$size = [math]::Round((Get-Item $xpi).Length / 1KB, 1)
Write-Host ""
Write-Host "Built $xpi ($size KB)" -ForegroundColor Green
Write-Host "  id      $addonId"
Write-Host "  version $version"
Write-Host ""
Write-Host "To publish this version so installed copies update themselves:" -ForegroundColor Yellow
Write-Host "  1. gh release create v$version `"$xpi`" --title `"v$version`" --notes `"...`""
Write-Host "  2. point updates.json at v$version and this asset name, then commit and push"
Write-Host "     (Thunderbird reads updates.json straight from the main branch)"
