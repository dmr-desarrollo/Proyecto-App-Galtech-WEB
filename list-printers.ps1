$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
Add-Type -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.ComponentModel;
public static class GaltechPrinterLookup {
    [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
    private struct PrinterInfo4 { public IntPtr PrinterName; public IntPtr ServerName; public uint Attributes; }
    [DllImport("winspool.drv", EntryPoint="EnumPrintersW", CharSet=CharSet.Unicode, SetLastError=true)]
    private static extern bool EnumPrinters(uint flags, string name, uint level, IntPtr buffer, uint bufferSize, out uint needed, out uint returned);
    public static string[] GetInstalledPrinterNames() {
        const uint flags = 0x2 | 0x4;
        uint needed, returned;
        bool first = EnumPrinters(flags, null, 4, IntPtr.Zero, 0, out needed, out returned);
        if (needed == 0) { if (!first && Marshal.GetLastWin32Error() != 0) throw new Win32Exception(Marshal.GetLastWin32Error()); return new string[0]; }
        IntPtr buffer = Marshal.AllocHGlobal(checked((int)needed));
        try {
            if (!EnumPrinters(flags, null, 4, buffer, needed, out needed, out returned)) throw new Win32Exception(Marshal.GetLastWin32Error());
            var names = new List<string>();
            int size = Marshal.SizeOf(typeof(PrinterInfo4));
            for (int i = 0; i < returned; i++) {
                var info = (PrinterInfo4)Marshal.PtrToStructure(IntPtr.Add(buffer, i * size), typeof(PrinterInfo4));
                string name = Marshal.PtrToStringUni(info.PrinterName);
                if (!String.IsNullOrEmpty(name)) names.Add(name);
            }
            return names.ToArray();
        } finally { Marshal.FreeHGlobal(buffer); }
    }
}
'@
$printers = @([GaltechPrinterLookup]::GetInstalledPrinterNames() | Sort-Object | ForEach-Object {
    [pscustomobject]@{ name = $_; connection = 'Windows'; address = '' }
})
ConvertTo-Json -InputObject $printers -Compress
