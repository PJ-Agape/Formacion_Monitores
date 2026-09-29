# Configurar cuentas y seguimiento (Firebase)

Con esta configuración los dirigentes ingresan con su cuenta de Google, su avance y su cuaderno los acompañan en cualquier dispositivo, las constancias se pueden verificar con el QR y el equipo coordinador ve el avance de todos en **Gestión → Dirigentes**.

Mientras no hagas estos pasos, la app sigue funcionando como hasta ahora (modo local, sin cuentas).

Usa el **plan gratuito (Spark)** de Firebase: no pide tarjeta y alcanza de sobra para una pastoral (miles de lecturas y escrituras al día).

## 1. Crear el proyecto

1. Entra a <https://console.firebase.google.com> con la cuenta de Google de la pastoral (ideal: una cuenta compartida del equipo, no personal).
2. **Crear un proyecto** → nombre, por ejemplo `pastoral-agape`. Puedes desactivar Google Analytics.

## 2. Activar el ingreso con Google

1. En el menú: **Compilación → Authentication → Comenzar**.
2. Pestaña **Método de acceso** → **Google** → **Habilitar** → elige un correo de asistencia → **Guardar**.
3. Pestaña **Configuración → Dominios autorizados** → **Agregar dominio** → `pj-agape.github.io`.

## 3. Crear la base de datos

1. **Compilación → Firestore Database → Crear base de datos**.
2. Ubicación: la más cercana a Chile que aparezca (por ejemplo `southamerica-west1`, Santiago, o `southamerica-east1`, São Paulo). **No se puede cambiar después.**
3. Elige **modo de producción**.

## 4. Pegar las reglas de seguridad

1. En Firestore Database, pestaña **Reglas**.
2. Borra lo que haya y pega el contenido completo del archivo `firestore.rules` de este repositorio.
3. Reemplaza `tu_correo@gmail.com` por el correo de Google de quien será el **primer administrador** (en minúsculas).
4. **Publicar**.

Las reglas son las que protegen los datos: solo los invitados pueden crear cuenta, cada dirigente escribe solo su propio avance, el cuaderno personal es privado (ni los administradores lo leen) y solo los administradores editan el contenido y ven el seguimiento.

## 5. Conectar la app

1. En Firebase: ícono de engranaje → **Configuración del proyecto** → sección **Tus apps** → ícono web `</>`.
2. Nombre: `Ágape web` (no marques Hosting) → **Registrar app**.
3. Copia el bloque `firebaseConfig` que aparece. Se ve así:

```js
{
  apiKey: "AIza...",
  authDomain: "pastoral-agape.firebaseapp.com",
  projectId: "pastoral-agape",
  storageBucket: "pastoral-agape.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
}
```

4. En `js/config.js` de este repositorio, reemplaza `firebase: null,` por `firebase: { ...lo que copiaste... },` y agrega el mismo correo del paso 4 en `bootstrapAdmins: ["tu_correo@gmail.com"],`.
5. Sube el cambio a GitHub (o pídeselo a Claude).

Estos datos no son secretos: están pensados para ir en la página pública. La seguridad la dan las reglas del paso 4.

## 6. Primer ingreso

1. Abre la app, toca **Ingresar** (arriba a la derecha) → **Continuar con Google** con el correo administrador.
2. Entra a **Gestión → Dirigentes → Invitar** y agrega a cada dirigente con su correo de Google, nombre, parroquia y rol.
3. Usa **Enviar enlace** para mandarle la invitación por WhatsApp. Al entrar con ese correo, su cuenta se crea sola.

## Qué se guarda y dónde

| Dato | Dónde | Quién lo ve |
| --- | --- | --- |
| Nombre, correo, parroquia, rol | `users` | La persona y los administradores |
| Avance en el curso y evaluaciones | `progress` | La persona y los administradores |
| Cuaderno personal (reflexiones) | `notes` | Solo la persona |
| Constancias emitidas | `certificates` | Cualquiera que tenga el código (para verificar) |
| Contenido publicado del curso | `content` | Público |

## Tareas del administrador

- **Pausar una cuenta**: Gestión → Dirigentes → la persona → Poner en pausa. Ya no podrá registrar avance.
- **Dar o quitar el rol de administrador**: en la misma ficha.
- **Publicar cambios de contenido**: Gestión → Publicar → Publicar para todos.
- **Exportar el seguimiento**: Gestión → Dirigentes → Exportar planilla (abre en Excel o Google Sheets).
