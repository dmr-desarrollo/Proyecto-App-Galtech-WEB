# Puente de impresión Galtech para Windows

El instalador incluye Node.js y los archivos del puente. No es necesario instalar Node.js ni descargar el repositorio en la computadora que imprime.

## Prueba en otra computadora

1. Usar Windows de 64 bits y comprobar que la impresora TSC esté instalada en Windows y tenga su controlador, por USB o por IP.
2. Copiar `Instalar-Galtech-selector-v2.exe` a esa computadora y abrirlo. El ejecutable es una versión de prueba sin firma digital; Windows o la política de la empresa pueden bloquearlo. No desactivar las protecciones del equipo: consultar con soporte si aparece un bloqueo.
3. Confirmar la instalación. Se instala para el usuario actual en `%LOCALAPPDATA%\GaltechEtiquetas\versiones` y configura el inicio automático de ese mismo usuario. No modifica los controladores ni configura las impresoras.
4. Abrir https://galtech-etiquetas.netlify.app/ en Chrome o Edge. Pulsar **Buscar impresora instalada** y permitir el acceso a la red local si el navegador lo solicita.
5. Cargar el CSV, elegir la impresora y probar una sola etiqueta antes de imprimir varias.
6. Cerrar sesión y volver a entrar en Windows, abrir la web y repetir la búsqueda para verificar el inicio automático. Si otros usuarios de Windows usan la misma computadora, cada uno debe instalar el puente para su propia cuenta.

Si el instalador indica que el puerto está ocupado, hay otro programa escuchando en `127.0.0.1:4173`; no se detiene automáticamente. Consultar con soporte o reiniciar Windows antes de probar para evitar usar una versión anterior.

El puente solo acepta solicitudes desde la aplicación local y `https://galtech-etiquetas.netlify.app`. No habilita la versión de prueba con otra dirección. Si la web o el servicio cambian, se debe distribuir una nueva versión del instalador; no se actualiza automáticamente.

## Desactivar el inicio automático

Desde la configuración de aplicaciones de inicio de Windows, desactivar **Galtech Etiquetas**. La desactivación no elimina los archivos. Para detener un puente que ya esté funcionando, cerrar la sesión de Windows. Eliminar archivos solo después de confirmar que no se necesitan.

## Para el equipo técnico

En la carpeta del proyecto, con Node.js v22.19.0 y el compilador de .NET Framework disponibles, ejecutar `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\build-installer.ps1`. El resultado queda en `dist\Instalar-Galtech-selector-v2.exe`. El instalador incorpora la licencia de Node.js. Para comprobar el paquete, con el puerto 4173 libre, ejecutar `node --test installer.test.cjs app.test.cjs network-scan.test.cjs list-printers.test.cjs`. La comparación con Java es opcional y requiere Java disponible durante las pruebas; no se instala Java en los equipos de los usuarios.
