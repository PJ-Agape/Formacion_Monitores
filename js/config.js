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
};
