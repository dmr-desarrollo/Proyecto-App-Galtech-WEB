# Etiquetas Galtech

Inicio de la aplicación web para etiquetas de asistentes de 60 × 40 mm.

Abrí `index.html` en Chrome para usar la aplicación. Cargá `ejemplo.csv` para probarla. Se admiten encabezados Nombre, Apellido y Empresa en cualquier orden; el separador puede ser `;` o `,`. La aplicación procesa el archivo localmente.

La descarga PRN usa una plantilla TSPL de prueba con CODEPAGE 1252. La vista previa es orientativa y no reproduce las fuentes ni posiciones exactas del TSPL. Es necesario calibrar la plantilla en la impresora real antes de utilizarla. La aplicación todavía no envía trabajos directamente a la impresora. El PRN y CSV de artículos compartidos son referencias, no el formato definitivo de asistentes.

Para ejecutar las pruebas: `node --test app.test.cjs`.
