// Configuración general de la app.
// Cuando se conecte una base de datos (usuarios y seguimiento), sus datos irán aquí.

export const CONFIG = {
  appName: "Pastoral Juvenil Ágape",
  // Contenido publicado (itinerarios, recursos, oraciones). El administrador
  // lo edita desde el panel y lo reemplaza en el repositorio con "Publicar".
  contentUrl: "data/contenido.json",

  // Planilla de Google que recibe un aviso cuando alguien completa un itinerario.
  sheetsUrl: "https://script.google.com/macros/s/AKfycbwfChJaWzClUzdZebm4mWg0LOyqkjI3-KkHZxj1NN7nSUSW3-K-DtJD2HjcpxcrQNUo/exec",

  // Porcentaje mínimo de respuestas adecuadas para aprobar una evaluación de fase.
  passRate: 0.6,

  // Huella (SHA-256) de la contraseña inicial del panel: "agape2026".
  // Cámbiala desde Gestión → Ajustes. Mientras no haya servidor, el panel
  // protege contra ediciones accidentales, no contra alguien con conocimientos técnicos.
  defaultAdminHash: "759aa99668fbfe8167eb6c524004699da9ee172a7cf0c459f47cde3ca73f2d3d",

  // ---- Cuentas y seguimiento (Firebase) ----
  // Mientras sea null, la app funciona en modo local (sin cuentas).
  // Configuración web del proyecto Firebase "pastoral-agape" (ver CONFIGURAR-FIREBASE.md).
  // No es secreta: la seguridad la dan las reglas de firestore.rules.
  firebase: {
    apiKey: "AIzaSyBMJBH1HTZYgDDHd0z0jtR528j2ODJKAxQ",
    authDomain: "pastoral-agape.firebaseapp.com",
    projectId: "pastoral-agape",
    storageBucket: "pastoral-agape.firebasestorage.app",
    messagingSenderId: "1060050673929",
    appId: "1:1060050673929:web:04504eae425c6114e833d8",
  },

  // Correos que se convierten en administradores la primera vez que entran,
  // aunque nadie los haya invitado. Deben coincidir con la lista de firestore.rules.
  bootstrapAdmins: ["iperezconus84@gmail.com"],
};
