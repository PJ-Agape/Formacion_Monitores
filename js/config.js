// Configuración general de la app.
// Los datos propios de cada pastoral (nombre, Firebase, administradores, planilla)
// vienen de parroquia.json, a través de js/identidad.js. Ver GUIA-INSTALACION.md.

import { ID } from "./identidad.js";

export const CONFIG = {
  appName: ID.nombre,
  // Contenido publicado (itinerarios, recursos, oraciones). El administrador
  // lo edita desde el panel y lo reemplaza en el repositorio con "Publicar".
  contentUrl: "data/contenido.json",

  // Planilla de Google que recibe un aviso cuando alguien completa un itinerario (opcional).
  sheetsUrl: ID.planillaAvisos || "",

  // Porcentaje mínimo de respuestas adecuadas para aprobar una evaluación de fase.
  passRate: 0.6,

  // Solo para el modo local (sin Firebase): huella SHA-256 de la contraseña inicial del panel.
  // Con Firebase configurado, a Gestión se entra con la cuenta de Google y esta clave no se usa.
  // Cámbiala desde Gestión → Ajustes.
  defaultAdminHash: "759aa99668fbfe8167eb6c524004699da9ee172a7cf0c459f47cde3ca73f2d3d",

  // ---- Cuentas y seguimiento (Firebase) ----
  // Mientras sea null, la app funciona en modo local (sin cuentas).
  // No es secreta: la seguridad la dan las reglas de firestore.rules.
  firebase: ID.firebase,

  // Correos que se convierten en administradores la primera vez que entran,
  // aunque nadie los haya invitado. Deben coincidir con la lista de firestore.rules
  // (scripts/personalizar.mjs los escribe en ambos lados).
  bootstrapAdmins: ID.administradores,
};
