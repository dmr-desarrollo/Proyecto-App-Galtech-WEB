using System;
using System.IO;
using System.Diagnostics;
using System.Reflection;
using System.Security.Cryptography;
using System.Net.Sockets;
using System.Threading;
using System.Windows.Forms;
using Microsoft.Win32;

internal static class Installer
{
    private const string RunKey = @"Software\Microsoft\Windows\CurrentVersion\Run";
    private const string RunName = "Galtech Etiquetas";
    private static readonly string[] Files = { "node.exe", "NODE-LICENSE.txt", "server.cjs", "app.js", "index.html", "styles.css", "ejemplo.csv", "list-printers.ps1", "print-raw.ps1", "network-scan.cjs" };
    private static string ExePath { get { return Assembly.GetExecutingAssembly().Location; } }

    [STAThread]
    private static int Main(string[] args)
    {
        try
        {
            if (args.Length == 2 && args[0] == "--test-extract") { ExtractNewDirectory(args[1]); return 0; }
            if (args.Length == 1 && args[0] == "--start") { StartBridge(); return 0; }
            if (args.Length == 1 && args[0] == "--uninstall") { Uninstall(); return 0; }
            if (args.Length != 0) return 2;
            Application.EnableVisualStyles();
            if (MessageBox.Show("Se instalará el puente de impresión de Galtech para este usuario de Windows.\n\nSe iniciará automáticamente al entrar en Windows. La impresora TSC debe estar instalada con su controlador.\n\n¿Deseás continuar?", "Instalar Galtech Etiquetas", MessageBoxButtons.YesNo, MessageBoxIcon.Information) != DialogResult.Yes) return 0;
            string root = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "GaltechEtiquetas", "versiones", ExeHash());
            if (!Directory.Exists(root)) ExtractNewDirectory(root);
            else VerifyFiles(root);
            string installedExe = Path.Combine(root, "GaltechPuente.exe");
            if (!File.Exists(installedExe)) File.Copy(ExePath, installedExe);
            using (RegistryKey key = Registry.CurrentUser.CreateSubKey(RunKey))
            {
                if (key == null) throw new InvalidOperationException("No se pudo configurar el inicio automático.");
                key.SetValue(RunName, "\"" + installedExe + "\" --start", RegistryValueKind.String);
            }
            if (PortInUse())
            {
                MessageBox.Show("Instalación completada. El puerto del puente ya está ocupado por otro programa. Cerrá el servicio anterior o reiniciá Windows antes de probar la impresión.", "Galtech Etiquetas", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
            else
            {
                Process.Start(new ProcessStartInfo(installedExe, "--start") { UseShellExecute = false, CreateNoWindow = true, WorkingDirectory = root });
                bool running = false;
                for (int i = 0; i < 30 && !running; i++) { Thread.Sleep(250); running = PortInUse(); }
                if (running) MessageBox.Show("Instalación completada y puente iniciado. Se iniciará automáticamente al entrar en Windows.\n\nAbrí la web de Galtech y pulsá 'Buscar impresora instalada'.", "Galtech Etiquetas", MessageBoxButtons.OK, MessageBoxIcon.Information);
                else MessageBox.Show("La instalación se completó, pero el puente no respondió. Reiniciá Windows y contactá al soporte si continúa el problema.", "Galtech Etiquetas", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
            return 0;
        }
        catch (Exception ex)
        {
            if (args.Length == 0 || (args.Length == 1 && args[0] == "--uninstall")) MessageBox.Show("No se pudo completar la operación: " + ex.Message, "Galtech Etiquetas", MessageBoxButtons.OK, MessageBoxIcon.Error);
            return 1;
        }
    }
    private static string ExeHash()
    {
        using (var sha = SHA256.Create()) using (var file = File.OpenRead(ExePath)) return BitConverter.ToString(sha.ComputeHash(file)).Replace("-", "").Substring(0, 16).ToLowerInvariant();
    }
    private static void ExtractNewDirectory(string directory)
    {
        if (Directory.Exists(directory) || File.Exists(directory)) throw new IOException("La carpeta de destino ya existe.");
        Directory.CreateDirectory(directory);
        foreach (string name in Files)
        {
            using (Stream source = Assembly.GetExecutingAssembly().GetManifestResourceStream(name))
            {
                if (source == null) throw new IOException("Falta un componente del instalador: " + name);
                using (FileStream target = new FileStream(Path.Combine(directory, name), FileMode.CreateNew, FileAccess.Write)) source.CopyTo(target);
            }
        }
    }
    private static void VerifyFiles(string directory)
    {
        using (var sha = SHA256.Create()) foreach (string name in Files)
        {
            string path = Path.Combine(directory, name);
            if (!File.Exists(path)) throw new IOException("La instalación anterior está incompleta; contactá al soporte.");
            byte[] expected; byte[] actual;
            using (Stream source = Assembly.GetExecutingAssembly().GetManifestResourceStream(name)) { if (source == null) throw new IOException("Falta un componente."); expected = sha.ComputeHash(source); }
            using (Stream file = File.OpenRead(path)) actual = sha.ComputeHash(file);
            if (BitConverter.ToString(expected) != BitConverter.ToString(actual)) throw new IOException("La instalación anterior fue modificada; contactá al soporte.");
        }
    }
    private static bool PortInUse()
    {
        try { using (var client = new TcpClient()) { var result = client.BeginConnect("127.0.0.1", 4173, null, null); if (!result.AsyncWaitHandle.WaitOne(500)) return false; client.EndConnect(result); return true; } }
        catch (SocketException) { return false; }
    }
    private static void StartBridge()
    {
        if (PortInUse()) return;
        string directory = Path.GetDirectoryName(ExePath);
        string node = Path.Combine(directory, "node.exe"), script = Path.Combine(directory, "server.cjs");
        if (!File.Exists(node) || !File.Exists(script)) throw new IOException("Faltan componentes del puente.");
        Process.Start(new ProcessStartInfo(node, "\"" + script + "\"") { UseShellExecute = false, CreateNoWindow = true, WindowStyle = ProcessWindowStyle.Hidden, WorkingDirectory = directory });
    }
    private static void Uninstall()
    {
        using (RegistryKey key = Registry.CurrentUser.OpenSubKey(RunKey, true)) { if (key != null) key.DeleteValue(RunName, false); }
        MessageBox.Show("Se quitó el inicio automático para este usuario. Si el puente está abierto, se detendrá al cerrar sesión. Los archivos permanecen en la carpeta GaltechEtiquetas de AppData local.", "Galtech Etiquetas", MessageBoxButtons.OK, MessageBoxIcon.Information);
    }
}
