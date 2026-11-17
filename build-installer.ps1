$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$compiler = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
$node = (Get-Command node.exe -ErrorAction Stop).Source
if (-not (Test-Path -LiteralPath $compiler)) { throw 'Falta el compilador de .NET Framework para Windows de 64 bits.' }
$nodeVersion = & $node --version
if ($nodeVersion -ne 'v22.19.0') { throw "Se esperaba Node v22.19.0 para coincidir con su licencia; se encontró $nodeVersion." }
$dist = Join-Path $root 'dist'
New-Item -ItemType Directory -Path $dist -Force | Out-Null
$compilerArgs = @('/nologo','/target:winexe','/platform:x64','/reference:System.Windows.Forms.dll',('/out:' + (Join-Path $dist 'Instalar-Galtech-selector-v3.exe')))
$compilerArgs += '/resource:' + $node + ',node.exe'
foreach ($file in @('NODE-LICENSE.txt','server.cjs','app.js','index.html','styles.css','ejemplo.csv','list-printers.ps1','print-raw.ps1','network-scan.cjs')) {
    $compilerArgs += '/resource:' + (Join-Path $root $file) + ',' + $file
}
$compilerArgs += Join-Path $root 'installer\Installer.cs'
& $compiler $compilerArgs
if ($LASTEXITCODE -ne 0) { throw 'No se pudo compilar el instalador.' }
Write-Output ('Instalador creado: ' + (Join-Path $dist 'Instalar-Galtech-selector-v3.exe'))
