# Etiquetas Galtech

Inicio de la aplicación web para etiquetas de asistentes de 60 × 40 mm.

En Windows, abrí la terminal de VS Code en esta carpeta y ejecutá `node server.cjs`. Dejá la terminal abierta y visitá http://127.0.0.1:4173 en Chrome o Edge. Cargá `ejemplo.csv` para probarla. Se admiten encabezados Nombre, Apellido y Empresa en cualquier orden; el separador puede ser `;` o `,`. La aplicación procesa el archivo localmente.

El servicio busca colas de impresoras TSC instaladas en puertos USB de Windows. Si hay una, la selecciona; si hay varias, el operador debe elegir. La detección identifica la cola instalada, pero no garantiza que la impresora esté encendida, conectada o tenga etiquetas. La elección dura mientras la página está abierta. El botón envía la plantilla TSPL con CODEPAGE 1252 como trabajo RAW a la cola elegida. La vista previa es orientativa y no reproduce las fuentes ni posiciones exactas del TSPL. El envío a la cola no confirma la impresión física. Probá primero con una etiqueta y calibrá la plantilla. El servicio escucha solo en este equipo y debe permanecer abierto; abrir el HTML directamente no permite imprimir.

Para ejecutar las pruebas: `node --test app.test.cjs`.
