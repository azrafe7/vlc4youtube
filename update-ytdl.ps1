$ErrorActionPreference = "Stop"
Clear

# check tools' paths and versions
Write-Host "Checking tools..." -ForegroundColor Yellow

$sevenZipExe = "$($Env:ProgramFiles)\7-Zip\7z.exe"
Write-Host "7z.exe " -ForegroundColor Green
& $sevenZipExe > $null

Write-Host "node " -NoNewline -ForegroundColor Green
& node -v

Write-Host "npm " -NoNewline -ForegroundColor Green
& npm -v

$npmGlobalPackages = npm list -g --depth=0

$npmPackage = "browserify"
$npmCommand = "browserify"
Write-Host "  $npmPackage " -NoNewline -ForegroundColor Green
& where.exe $npmCommand > $null
if (-Not $?) {
    Write-Error "'$npmPackage' (command: $npmCommand) not found" }
else {
    $verRegex = "(?ms)^.*$npmPackage@(\S+).*$"
    $npmPackageVersion = [regex]::Match($npmGlobalPackages, $verRegex).Groups[1]
    Write-Host "$npmPackageVersion"
}

$npmPackage = "uglify-es"
$npmCommand = "uglifyjs"
Write-Host "  $npmPackage " -NoNewline -ForegroundColor Green
& where.exe $npmCommand > $null
if (-Not $?) {
    Write-Error "'$npmPackage' (command: $npmCommand) not found" }
else {
    $verRegex = "(?ms)^.*$npmPackage@(\S+).*$"
    $npmPackageVersion = [regex]::Match($npmGlobalPackages, $verRegex).Groups[1]
    Write-Host "$npmPackageVersion"
}

#Break

# download node-ytdl-core
$nodeYtdlFolder = "node-ytdl-core-master"
Write-Host ""
Write-Host "Downloading node-ytdl-core master into '$nodeYtdlFolder' folder..." -NoNewline -ForegroundColor Yellow
$url = "https://github.com/fent/node-ytdl-core/archive/master.zip"
$ytdlZipFile = "$nodeYtdlFolder\master.zip"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
Invoke-WebRequest -Uri $url -OutFile $ytdlZipFile
Write-Host " [DONE]"

# extract zip contents
$command = $sevenZipExe
$arguments = "x", $ytdlZipFile, "-aoa", "$nodeYtdlFolder/*.json", "$nodeYtdlFolder/lib"
Write-Host ""
Write-Host "Extracting files..." -ForegroundColor Yellow
Write-Host "$command $arguments" -ForegroundColor Green
& $command $arguments
#Write-Host "[DONE]"

# enter note-ytdl-core folder
pushd $nodeYtdlFolder
try {
    # install node modules
    Write-Host ""
    Write-Host "Installing node modules..." -ForegroundColor Yellow
    & "npm" "install"

    # browserify
    $browserifiedOutputFile = "browser/ytdl.js"
    $command = "browserify"
    $arguments = "main.js", "-o", $browserifiedOutputFile
    Write-Host "Browserifying node-ytdl-core into '$browserifiedOutputFile'..." -ForegroundColor Yellow
    Write-Host "$command $arguments" -ForegroundColor Green
    & $command $arguments

    # minify
    $minifiedOutputFile = "../js/ytdl.min.js"
    $command = "uglifyjs"
    $arguments = $browserifiedOutputFile, "--compress", "-o", $minifiedOutputFile
    Write-Host ""
    Write-Host "Minifying node-ytdl-core into '$minifiedOutputFile'..." -ForegroundColor Yellow
    Write-Host "$command $arguments" -ForegroundColor Green
    & $command $arguments

    Write-Host ""
} finally {
    # exit note-ytdl-core folder
    popd
}
