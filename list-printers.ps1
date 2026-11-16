$ErrorActionPreference = 'Stop'
$ports = @{}
Get-PrinterPort | ForEach-Object { $ports[$_.Name] = $_ }
$printers = @(Get-Printer | Where-Object { $_.DriverName -match 'TSC' -or $_.Name -match 'TSC' } | Sort-Object Name | ForEach-Object {
    $port = $ports[$_.PortName]
    if ($_.PortName -match '^USB') {
        [pscustomobject]@{ name = $_.Name; port = $_.PortName; connection = 'USB'; address = '' }
    } elseif ($port -and $port.PrinterHostAddress -and $port.PrinterHostAddress -match '^\d{1,3}(\.\d{1,3}){3}$') {
        [pscustomobject]@{ name = $_.Name; port = $_.PortName; connection = 'Red'; address = $port.PrinterHostAddress }
    }
})
ConvertTo-Json -InputObject $printers -Compress
