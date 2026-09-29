# Formación de Monitores · Pastoral Juvenil Ágape

Aula virtual para la formación de dirigentes: curso de 5 módulos y 21 unidades que cada dirigente avanza a su ritmo, con lecturas, Palabra de Dios, documentos de la Iglesia, cuaderno personal de reflexión, evaluaciones por módulo y constancia con QR. Incluye además la guía de servicio, materiales y oraciones. Se instala en el celular como app y funciona sin internet.

## Estructura

| Ruta | Qué contiene |
| --- | --- |
| `index.html` | La página (estructura básica) |
| `data/contenido.json` | **Todo el contenido**: cursos, módulos, unidades, evaluaciones, materiales, oraciones y guía de comunidad |
| `css/app.css` | Diseño |
| `js/app.js` | Vistas públicas y navegación |
| `js/admin.js` | Panel de Gestión |
| `js/store.js` | Guardado de datos (aquí se conectará la base de datos) |
| `js/config.js` | Ajustes: planilla de Google, porcentaje de aprobación |
| `sw.js`, `manifest.webmanifest`, `icons/` | App instalable y uso sin conexión |

## Editar contenido

1. Entra a la página y abre **Gestión** (pie de página). Contraseña inicial: `agape2026` — cámbiala en Gestión → Ajustes.
2. Edita cursos, módulos, unidades, evaluaciones, materiales, oraciones o la guía de comunidad.
3. Revisa con **Vista previa**.
4. En **Publicar**, descarga `contenido.json` y súbelo a la carpeta `data/` de este repositorio.

## Cambios en el código

Si modificas archivos de `css/` o `js/`, sube el número de `VERSION` en `sw.js` para que los celulares con la app instalada reciban la actualización.
