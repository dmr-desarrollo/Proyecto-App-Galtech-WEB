# Etiquetas Galtech

Inicio de la aplicación web para etiquetas de asistentes de 60 × 40 mm.

En Windows, abrí la terminal de VS Code en esta carpeta y ejecutá `node server.cjs`. Dejá la terminal abierta y visitá http://127.0.0.1:4173 en Chrome o Edge. Cargá `ejemplo.csv` para probarla. Se admiten encabezados Nombre, Apellido y Empresa en cualquier orden; el separador puede ser `;` o `,`. La aplicación procesa el archivo localmente.

También se puede abrir https://galtech-etiquetas.netlify.app/ mientras el servicio local está ejecutándose en esa misma computadora. En la web, pulsá «Buscar impresora instalada» y permití el acceso a la red local si el navegador lo solicita. Solo ese sitio y la página local tienen acceso desde el navegador al puente. Cada computadora necesita una copia actualizada del servicio, Node.js, el controlador TSC y la impresora instalada. Una actualización de la web no actualiza automáticamente el servicio local.

El servicio busca colas TSC instaladas en Windows por USB o puerto TCP/IP. Si hay una, la selecciona; si hay varias, el operador debe elegir. La detección identifica la cola instalada, pero no garantiza que la impresora esté encendida, conectada o tenga etiquetas. La elección dura mientras la página está abierta. El botón envía la plantilla TSPL con CODEPAGE 1252 como trabajo RAW a la cola elegida. La vista previa es orientativa y no reproduce las fuentes ni posiciones exactas del TSPL. El envío a la cola no confirma la impresión física. Probá primero con una etiqueta y calibrá la plantilla. El servicio escucha solo en este equipo y debe permanecer abierto; abrir el HTML directamente no permite imprimir.

La búsqueda opcional de red revisa el puerto TCP 9100 en hasta cuatro subredes IPv4 privadas directamente conectadas, como máximo 254 direcciones por subred. Detecta puertos abiertos, no identifica el fabricante ni instala impresoras. Para imprimir se debe instalar en Windows una cola TSC con el driver y la IP correspondiente.

Para ejecutar las pruebas: `node --test app.test.cjs network-scan.test.cjs`.
