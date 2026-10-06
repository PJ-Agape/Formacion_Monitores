# Formación de Monitores · Pastoral Juvenil Ágape

Aula virtual para la formación de dirigentes: curso de 5 módulos y 21 unidades que cada dirigente avanza a su ritmo, con lecturas, Palabra de Dios, documentos de la Iglesia, cuaderno personal de reflexión, evaluaciones por módulo y constancia con QR. Incluye además la guía de servicio, materiales y oraciones. Se instala en el celular como app y funciona sin internet.

## ¿La quieres para tu parroquia?

Esta app se puede instalar en cualquier pastoral juvenil, con su nombre, su logo y sus colores, en una tarde y sin programar: **[Guía de instalación](GUIA-INSTALACION.md)**.

Toda la identidad de la pastoral está en **`parroquia.json`** (nombre, parroquia, diócesis, dirección, colores, administradores y Firebase). En las copias parroquiales, la acción **Publicar sitio** aplica esa identidad al publicar, sin modificar el código, para que cada copia reciba las mejoras de Ágape con **Sync fork**.

## Estructura

| Ruta | Qué contiene |
| --- | --- |
| `index.html` | La página (estructura básica) |
| `data/contenido.json` | **Todo el contenido**: cursos, módulos, unidades, evaluaciones, materiales, oraciones y guía de comunidad |
| `css/app.css` | Diseño |
| `js/app.js` | Vistas públicas y navegación |
| `js/admin.js` | Panel de Gestión |
| `js/store.js` | Guardado de datos (aquí se conectará la base de datos) |
| `parroquia.json` | **Identidad de la pastoral**: nombre, parroquia, colores, administradores, Firebase |
| `js/identidad.js` | Generado desde `parroquia.json` con `node scripts/personalizar.mjs` (no editar a mano) |
| `js/config.js` | Ajustes: porcentaje de aprobación (lee lo demás de la identidad) |
| `scripts/personalizar.mjs` | Aplica la identidad: textos, colores, íconos, reglas. En las copias lo corre la acción «Publicar sitio» |
| `sw.js`, `manifest.webmanifest`, `icons/` | App instalable y uso sin conexión |

## Editar contenido

1. Entra a la página, ingresa con tu cuenta de Google de administrador y abre **Gestión** (pie de página).
2. Edita cursos, módulos, unidades, evaluaciones, materiales, oraciones o la guía de comunidad.
3. Revisa con **Vista previa**.
4. En **Publicar**, toca **Publicar para todos**.

## Cambios en el código

Si modificas archivos de `css/` o `js/`, sube el número de `VERSION` en `sw.js` para que los celulares con la app instalada reciban la actualización.

Para que las copias parroquiales sigan funcionando con cada mejora:

- **Textos con el nombre de la pastoral, la parroquia o la diócesis**: usa `ID` (`import { ID } from "./identidad.js"`), por ejemplo `` `Cancionero ${ID.corto}` `` o `` `la agenda ${ID.deNombre}` ``. No escribas «Ágape» ni «Yungay» en el código.
- **Colores de marca**: usa los seis de la paleta (`#1351a4`, `#0b2566`, `#ef591c`, `#ffba03`, `#8ad2fa`, `#fff6e5`) tal cual; en cada copia se cambian solos por los suyos.
- Si cambias `parroquia.json`, corre `node scripts/personalizar.mjs` y sube también los archivos que cambien.
