$ErrorActionPreference = 'Stop'
$printers = @(Get-Printer | Where-Object { ($_.DriverName -match 'TSC' -or $_.Name -match 'TSC') -and $_.PortName -match '^USB' } | Sort-Object Name | ForEach-Object { [pscustomobject]@{ name = $_.Name; port = $_.PortName } })
ConvertTo-Json -InputObject $printers -Compress
