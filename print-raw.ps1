$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class RawPrinter {
    [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)] public class DOCINFO { public string pDocName; public string pOutputFile; public string pDataType; }
    [DllImport("winspool.drv", CharSet=CharSet.Unicode, SetLastError=true)] public static extern bool OpenPrinter(string name, out IntPtr handle, IntPtr defaults);
    [DllImport("winspool.drv", SetLastError=true)] public static extern bool ClosePrinter(IntPtr handle);
    [DllImport("winspool.drv", CharSet=CharSet.Unicode, SetLastError=true)] public static extern int StartDocPrinter(IntPtr handle, int level, [In] DOCINFO info);
    [DllImport("winspool.drv", SetLastError=true)] public static extern bool EndDocPrinter(IntPtr handle);
    [DllImport("winspool.drv", SetLastError=true)] public static extern bool StartPagePrinter(IntPtr handle);
    [DllImport("winspool.drv", SetLastError=true)] public static extern bool EndPagePrinter(IntPtr handle);
    [DllImport("winspool.drv", SetLastError=true)] public static extern bool WritePrinter(IntPtr handle, byte[] bytes, int count, out int written);
    static void Check(bool ok) { if (!ok) throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error()); }
    public static void Send(string name, byte[] bytes) {
        IntPtr h; Check(OpenPrinter(name, out h, IntPtr.Zero));
        try { if (StartDocPrinter(h,1,new DOCINFO {pDocName="Etiquetas Galtech",pDataType="RAW"}) == 0) throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());
          try { Check(StartPagePrinter(h)); try { int written; Check(WritePrinter(h,bytes,bytes.Length,out written)); if (written != bytes.Length) throw new Exception("Envío incompleto a la cola."); } finally { EndPagePrinter(h); } } finally { EndDocPrinter(h); }
        } finally { ClosePrinter(h); }
    }
}
'@
$payload = [Console]::In.ReadToEnd()
$bytes = [Convert]::FromBase64String($payload)
[RawPrinter]::Send('TSC TE210 (Copiar 1)', $bytes)
