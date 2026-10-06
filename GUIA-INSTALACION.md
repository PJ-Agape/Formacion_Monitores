# La app de Ágape para tu parroquia · Guía de instalación de una tarde

Esta guía deja funcionando una copia de la app de la Pastoral Juvenil Ágape con el nombre, el logo y los colores de **tu** pastoral: agenda, muro y chat grupales, curso de dirigentes con constancias, capilla, cancionero, estudio de difusión y página para las familias.

**No necesitas saber programar.** Todo se hace desde el navegador, copiando y pegando. Calcula una tarde (unas 3 a 4 horas), idealmente con otra persona del equipo al lado.

| Paso | Qué haces | Tiempo |
| --- | --- | --- |
| 0 | Reunir lo necesario | 15 min |
| 1 | Crear la cuenta de GitHub de la pastoral | 15 min |
| 2 | Copiar la app | 10 min |
| 3 | Poner el nombre, el logo y los colores | 30 min |
| 4 | Publicar el sitio | 10 min |
| 5 | Conectar las cuentas (Firebase) | 45 min |
| 6 | Primer ingreso | 10 min |
| 7 | Adaptar el contenido | 60 min o más |
| 8 | Antes de invitar a los jóvenes | 15 min |

> **Lo más importante, antes de empezar:** la app guarda datos de menores. Instálala **con el conocimiento y el visto bueno del párroco**, a nombre de la pastoral (no de una persona) y con al menos **dos administradores**.

---

## Paso 0 · Reunir lo necesario (15 min)

- **Una cuenta de Google de la pastoral**, por ejemplo `pastoraljuvenil.sanjuan@gmail.com`. Úsala para GitHub y para Firebase. Así, si alguien deja el equipo, la app no se va con esa persona.
- **Los correos de Google de los administradores** (dos, idealmente). Pueden ser personales: son los que entrarán a Gestión.
- **El logo** en formato PNG, **cuadrado**, de al menos 512 × 512 píxeles, ojalá con fondo transparente. Llámalo `logo.png`.
- **Los colores** de tu pastoral (opcional). Si no los tienes, la app se queda con los de Ágape.
- Un computador con Chrome, Edge o Firefox.

---

## Paso 1 · Crear la cuenta de GitHub de la pastoral (15 min)

GitHub es donde vive la app. Es gratis.

1. Entra a <https://github.com/signup> con el correo de la pastoral.
2. Elige un **nombre de usuario** con cuidado: **será parte de la dirección de la app**. Por ejemplo, `pj-sanjuan` da `https://pj-sanjuan.github.io/…`. Usa minúsculas y guiones; evita tildes.
3. Confirma el correo.

> **Una cuenta por parroquia.** GitHub no permite tener dos copias de la misma app en una cuenta. Si la diócesis instala varias parroquias, cada una necesita su propia cuenta.

---

## Paso 2 · Copiar la app (10 min)

1. Con la sesión de la pastoral abierta, entra a <https://github.com/PJ-Agape/Formacion_Monitores>.
2. Arriba a la derecha, toca **Fork**.
3. En **Repository name** escribe un nombre corto, por ejemplo `app`. La dirección final será `https://pj-sanjuan.github.io/app/`.
4. Deja marcada la opción **Copy the main branch only** y toca **Create fork**.
5. Ya en tu copia, entra a la pestaña **Actions** y toca el botón verde **I understand my workflows, go ahead and enable them**.
6. Siempre en **Actions**, revisa en la lista de la izquierda **Calendario Agenda Ágape** y **Evangelio del día**. Si alguna muestra un aviso de que está desactivada, entra en ella y toca **Enable workflow**.

> ¿Por qué un *fork* y no descargar los archivos? Porque así tu copia queda conectada a la de Ágape y **recibe las mejoras con un clic** (ver «Recibir mejoras», al final).

---

## Paso 3 · Poner el nombre, el logo y los colores (30 min)

Toda la identidad de tu pastoral está en **un solo archivo**: `parroquia.json`.

1. En tu copia, abre el archivo `parroquia.json` y toca el ícono del **lápiz** (Edit this file).
2. Cambia **solo lo que está a la derecha de los dos puntos**, siempre entre comillas. Ejemplo:

```json
  "nombre": "Jóvenes San Juan",
  "articulo": "los",
  "nombreCorto": "San Juan",
```

3. Cuando termines, toca **Commit changes…** y otra vez **Commit changes**.

### Qué va en cada línea

| Línea | Qué es | Ejemplo |
| --- | --- | --- |
| `nombre` | Nombre completo de la pastoral | `Jóvenes San Juan` |
| `articulo` | Cómo se nombra en una frase: `el`, `la`, `los` o `las` | `los` → «la agenda **de los** Jóvenes San Juan» |
| `nombreCorto` | Nombre corto (aparece en «Camino San Juan», «Cancionero San Juan», etc.) | `San Juan` |
| `marca` | Lo que se ve arriba, junto al logo | `Jóvenes San Juan` |
| `subtituloMarca` | La línea pequeña bajo la marca | `Pastoral juvenil` |
| `frase` | Lema que va al pie de la página | `Discípulos misioneros en Talca` |
| `parroquia` | Nombre de la parroquia o capilla | `Parroquia San Juan Bautista` |
| `articuloParroquia` | `el` o `la` (para «de la Parroquia…» o «del Santuario…») | `la` |
| `comuna` | Comuna o ciudad (sirve para el mapa de la página para familias) | `Talca` |
| `diocesis` | Diócesis | `Diócesis de Talca` |
| `direccionWeb` | La dirección de tu app: `https://` + usuario + `.github.io/` + nombre de la copia + `/` | `https://pj-sanjuan.github.io/app/` |
| `repositorio` | Usuario y nombre de la copia, como aparecen arriba en GitHub | `pj-sanjuan/app` |
| `prefijo` | Una palabra en minúsculas, sin tildes ni espacios | `sanjuan` |
| `colores` | Seis colores en formato `#RRGGBB` (ver abajo) | `"principal": "#1d6b47"` |
| `administradores` | Correos de Google de los administradores, entre comillas y separados por coma | `["ana@gmail.com", "pedro@gmail.com"]` |
| `firebase` | Se completa en el paso 5. **Por ahora** cambia solo el valor de `apiKey` por `PEGA_AQUI` (así la app no intenta conectarse al Firebase de Ágape) | `"apiKey": "PEGA_AQUI",` |
| `planillaAvisos` | Opcional. Déjalo vacío: `""` | |
| `radios` | Radios católicas que aparecen en la Capilla. Cambia las de la diócesis de Chillán por las de la tuya, o deja solo Radio María | |

### Los colores

| Nombre | Para qué se usa | Ágape |
| --- | --- | --- |
| `principal` | Botones, títulos, encabezados (lleva texto blanco encima, así que debe ser **oscuro**) | `#1351a4` azul |
| `oscuro` | Textos y bordes | `#0b2566` azul noche |
| `acento` | Detalles y subrayados | `#ef591c` naranja |
| `destacado` | Etiquetas y llamados de atención | `#ffba03` dorado |
| `suave` | Fondos de tarjetas y dibujos | `#8ad2fa` celeste |
| `fondo` | Fondo general (claro) | `#fff6e5` crema |

Para elegir colores puedes usar <https://htmlcolorcodes.com/es/>. Copia el código que empieza con `#`. Los seis deben ser distintos entre sí.

### El logo

1. En la página principal de tu copia, toca **Add file → Upload files**.
2. Arrastra tu `logo.png` (tiene que llamarse exactamente así) y toca **Commit changes**.

Con ese archivo se generan solos todos los íconos: el de la pestaña del navegador, el del celular al instalar la app y el que aparece en la portada.

### Si algo quedó mal escrito

No pasa nada: la app no se rompe. En la pestaña **Actions**, la acción **Publicar sitio** queda con una ✗ roja. Al abrirla, en el paso «Aplicar la identidad de parroquia.json» aparece en palabras simples qué corregir. Por ejemplo:

```
✗ Hay que corregir parroquia.json:
  • «prefijo» debe ser una sola palabra en minúsculas, sin tildes, espacios ni guiones.
```

Los errores más comunes son una **coma** que falta al final de una línea, o que sobra antes de un `}`, y las **comillas** que faltan alrededor de un texto.

---

## Paso 4 · Publicar el sitio (10 min)

1. En tu copia, ve a **Settings → Pages**.
2. En **Build and deployment → Source**, elige **GitHub Actions**.
3. Ve a **Actions → Publicar sitio → Run workflow → Run workflow**.
4. En uno o dos minutos aparece un ✓ verde. Abre tu dirección (`https://pj-sanjuan.github.io/app/`).

Deberías ver la app con tu nombre, tu logo y tus colores. Por ahora funciona en **modo local**: cada persona usa la app en su teléfono, sin cuentas. Las cuentas, el muro, el chat y el seguimiento se activan en el paso siguiente.

> Desde ahora, **cada vez que guardes un cambio** en `parroquia.json` o en `logo.png`, el sitio se vuelve a publicar solo.

---

## Paso 5 · Conectar las cuentas: Firebase (45 min)

Firebase guarda las cuentas, el avance, el muro y el chat. Usa el **plan gratuito (Spark)**: no pide tarjeta y alcanza de sobra para una pastoral.

### 5.1 Crear el proyecto

1. Entra a <https://console.firebase.google.com> **con la cuenta de Google de la pastoral**.
2. **Crear un proyecto** → nombre, por ejemplo `pastoral-sanjuan`. Puedes desactivar Google Analytics.

### 5.2 Activar el ingreso con Google

1. Menú **Compilación → Authentication → Comenzar**.
2. Pestaña **Método de acceso → Google → Habilitar**, elige el correo de asistencia y toca **Guardar**.
3. Pestaña **Configuración → Dominios autorizados → Agregar dominio**: escribe tu dominio **sin** `https://` ni lo que va después de `.io`. Ejemplo: `pj-sanjuan.github.io`.

### 5.3 Crear la base de datos

1. **Compilación → Firestore Database → Crear base de datos**.
2. Ubicación: **`southamerica-west1` (Santiago)**. **No se puede cambiar después.**
3. Elige **modo de producción**.

### 5.4 Registrar la app y copiar sus datos

1. Ícono de engranaje → **Configuración del proyecto** → sección **Tus apps** → ícono web `</>`.
2. Ponle un nombre (por ejemplo `app web`), **no** marques Hosting y toca **Registrar app**.
3. Aparece un bloque `firebaseConfig`. Copia sus seis valores en la sección `firebase` de tu `parroquia.json` (con el lápiz, como en el paso 3). Fíjate en que aquí **todo va entre comillas**, también los nombres:

```json
  "firebase": {
    "apiKey": "AIzaSy...",
    "authDomain": "pastoral-sanjuan.firebaseapp.com",
    "projectId": "pastoral-sanjuan",
    "storageBucket": "pastoral-sanjuan.firebasestorage.app",
    "messagingSenderId": "123456789",
    "appId": "1:123456789:web:abc123"
  },
```

4. **Commit changes** y espera el ✓ verde en **Actions → Publicar sitio**.

Estos datos no son secretos: están pensados para ir en una página pública. Lo que protege la información son las reglas del paso siguiente.

### 5.5 Pegar las reglas de seguridad (¡no te lo saltes!)

Las reglas son las que cuidan a los jóvenes: solo entra quien fue invitado, no se puede invitar a un menor sin registrar la autorización de su familia, el chat es solo grupal y el cuaderno personal es privado.

1. Abre en el navegador **tu dirección + `reglas-firestore.txt`**. Ejemplo: `https://pj-sanjuan.github.io/app/reglas-firestore.txt`. Ese archivo ya trae los correos de tus administradores.
2. Selecciona todo (Ctrl+A o Cmd+A) y cópialo.
3. En Firebase: **Firestore Database → pestaña Reglas**. Borra lo que haya, pega y toca **Publicar**.

> **Cada vez que cambies la lista de administradores** en `parroquia.json`, repite este paso 5.5. Lo mismo cuando una actualización de Ágape traiga reglas nuevas (se avisará en las notas de la mejora).

---

## Paso 6 · Primer ingreso (10 min)

1. Abre tu app, toca **Ingresar** (arriba a la derecha) y luego **Continuar con Google**, con uno de los correos de `administradores`.
2. Entra a **Gestión** (al pie de la página). Si la ves, ya eres administrador. 🎉
3. En el celular, abre la dirección y usa **Agregar a pantalla de inicio** para instalarla como app.

Si dice que tu cuenta no tiene acceso, revisa que el correo esté escrito igual en `parroquia.json` y que hayas pegado las reglas **después** de que el sitio se publicó con ese correo (paso 5.5).

---

## Paso 7 · Adaptar el contenido (60 min o más)

La app llega con todo lo que Ágape ha preparado. Parte sirve tal cual y parte conviene revisarla:

| Qué | Dónde se cambia | Qué revisar |
| --- | --- | --- |
| **Portada de Inicio** | Gestión → Portada | Las diapositivas de bienvenida, con la historia de tu pastoral |
| **Página para las familias** | Gestión → Familias | Quiénes son, contacto (teléfono, WhatsApp, Instagram), carta a los papás |
| **Curso de dirigentes** | Gestión → Cursos, y luego Publicar → **Publicar para todos** | Es formación general y sirve en cualquier parroquia; revisa las menciones a Ágape |
| **Camino de encuentros** | Archivo `data/encuentros.json` | Es el itinerario anual de Ágape, alineado con las prioridades de la Diócesis de Chillán. Úsalo como modelo o pide ayuda para adaptarlo |
| **Presentaciones** | Carpeta `presentaciones/` | Son materiales de Ágape, con su logo. Úsalos con su crédito o bórralos |
| **Cancionero** | En la app, Cancionero → Agregar | Las canciones originales de Ágape («Amor que transforma», «Aleluya Ágape») se mantienen con su autoría y son libres para la comunidad. Agrega las que canta tu grupo |
| **Agenda** | En la app, Agenda | Los encuentros y actividades de tu pastoral |

**Lo que publiques desde Gestión siempre manda** sobre el curso que viene de Ágape. Mientras no publiques nada propio, ves el curso de Ágape actualizado.

---

## Paso 8 · Antes de invitar a los jóvenes (15 min)

- [ ] El párroco conoce la app y dio su visto bueno.
- [ ] Hay **dos administradores** y la cuenta de GitHub y la de Firebase son **de la pastoral**.
- [ ] Las reglas de seguridad están pegadas (paso 5.5).
- [ ] La página para las familias tiene los datos de contacto correctos.
- [ ] Hay un protocolo de ambiente sano conocido por los dirigentes (quién modera el muro y el chat, qué hacer ante un reporte).
- [ ] Para los menores de 18: la autorización de su familia. La app genera el documento en **Gestión → Dirigentes → Invitar**.

Después: **Gestión → Dirigentes → Invitar** para cada persona, y **Enviar enlace** para mandarle la invitación por WhatsApp.

---

## Recibir mejoras de Ágape

Cuando Ágape mejora la app, tu copia puede recibir esos cambios:

1. Entra a la página principal de tu copia en GitHub.
2. Si ves el aviso **This branch is X commits behind**, toca **Sync fork → Update branch**.
3. El sitio se vuelve a publicar solo, con tu nombre, tu logo y tus colores.

Esto funciona sin choques porque **tu copia solo se diferencia de la de Ágape en `parroquia.json`, `logo.png` y lo que tú agregues**. Por eso: **no edites los archivos de código** (`js/`, `css/`, `index.html`). Si GitHub ofrece **Discard commits** en vez de **Update branch**, no lo aceptes: pide ayuda.

---

## Problemas frecuentes

| Qué pasa | Qué hacer |
| --- | --- |
| La acción **Publicar sitio** está en rojo | Ábrela y lee el paso «Aplicar la identidad»: dice qué corregir en `parroquia.json` |
| El error dice «Get Pages site failed» | Falta el paso 4.2: Settings → Pages → Source: **GitHub Actions** |
| La dirección muestra «404» | Espera dos minutos; revisa que la dirección termine en `/` |
| «Continuar con Google» muestra un error de dominio | Falta el paso 5.2.3: agregar tu dominio en Firebase → Authentication → Dominios autorizados |
| Entro con Google pero dice que no tengo acceso | El correo no está en `administradores`, o no se pegaron las reglas después de publicar (paso 5.5) |
| El celular sigue mostrando lo anterior | Cierra la app del todo y ábrela de nuevo; los cambios llegan en la siguiente apertura |
| La acción dice que «firebase» tiene los datos de Ágape | Cambia el valor de `apiKey` por `PEGA_AQUI` hasta hacer el paso 5 |
| La acción dice que «repositorio» debe ser otro | Copia el valor exacto que indica el mensaje |

---

*Esta app nació en la Pastoral Juvenil Ágape de la Parroquia San Miguel de Yungay (Diócesis San Bartolomé de Chillán) como un servicio a la Iglesia. Si la instalas, cuéntanos cómo les va: así aprendemos todos.*
