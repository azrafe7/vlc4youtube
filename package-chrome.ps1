$ErrorActionPreference = "Stop"
Clear

$browserSuffix = ".chrome"   # <- JUST CHANGE THIS (".chrome" or ".firefox")
$packageOutputFolder = "package"
$packageFileList = "$packageOutputFolder/package-list.txt"
$manifestFile = "manifest$browserSuffix.json"
$packageName = "vlc4youtube"

#Break

# check tools' paths and versions
Write-Host "Checking tools..." -ForegroundColor Yellow

$sevenZipExe = "$($Env:ProgramFiles)\7-Zip\7z.exe"
Write-Host "7z.exe " -ForegroundColor Green
& $sevenZipExe > $null

#Break

# find extension version in manifest file
$manifestContent = Get-Content $manifestFile -Raw
Write-Host ""
Write-Host "Retrieving extension version from '$manifestFile'..." -ForegroundColor Yellow
#Write-Host $manifestContent
$verRegex = '"version".*(\d+\.\d+\.\d+)'
$extensionVersion = [regex]::Match($manifestContent, $verRegex).Groups[1]
if ([string]::IsNullOrWhiteSpace($extensionVersion)) {
    Write-Error "Unable to find version from '$manifestFile'"
}
Write-Host "$extensionVersion" -ForegroundColor Green

$packageOutputFile = "$packageOutputFolder/$packageName$browserSuffix-$extensionVersion.zip"

# delete package file if exists
if (Test-Path $packageOutputFile) {
  Remove-Item $packageOutputFile
}

# zip files into extension package
$command = $sevenZipExe
$arguments = "a", "-tzip", $packageOutputFile, "@$packageFileList"
Write-Host ""
Write-Host "Reading list from '$packageFileList' and packaging into '$packageOutputFile'..." -ForegroundColor Yellow
Write-Host "$command $arguments" -ForegroundColor Green
& $command $arguments

# rename manifest file inside zipped package (if needed)
if (-Not [string]::IsNullOrWhiteSpace($browserSuffix)) {
    $command = $sevenZipExe
    Write-Host ""
    $arguments = "a", "-tzip", $packageOutputFile, $manifestFile
    Write-Host "Add '$manifestFile' to '$packageOutputFile'..." -ForegroundColor Yellow
    Write-Host "$command $arguments" -ForegroundColor Green
    & $command $arguments
    $arguments = "rn", $packageOutputFile, $manifestFile, "manifest.json"
    Write-Host "Rename '$manifestFile' to 'manifest.json' inside '$packageOutputFile'..." -ForegroundColor Yellow
    Write-Host "$command $arguments" -ForegroundColor Green
    & $command $arguments
}

Write-Host ""
