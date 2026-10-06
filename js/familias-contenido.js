// Contenido base de la página para familias. El equipo lo edita desde Gestión → Familias
// (se guarda en content/familias) y lo que no se edite usa estos textos.

import { ID } from "./identidad.js";

export const DEF = {
  bienvenida: `Somos ${ID.elNombre} ${ID.deParroquia}. Acompañamos a adolescentes y jóvenes a encontrarse con Jesús, en un grupo donde cada uno es acogido tal como es.`,
  horario: "Nos reunimos una vez por semana en la parroquia. El día y la hora de cada encuentro están en «Próximas actividades».",
  cuidado: [
    "Cada encuentro lo acompañan dirigentes formados y un equipo coordinador adulto.",
    `Seguimos las orientaciones de la ${ID.diocesis} para ambientes sanos y seguros.`,
    "Las salidas y retiros piden siempre una autorización firmada por la familia.",
    "No publicamos fotos ni datos de los jóvenes sin permiso de su familia.",
    "Los chats del grupo son salas comunitarias, moderadas por el equipo.",
  ],
  faq: [
    { q: "¿Quiénes pueden participar?", a: "Adolescentes y jóvenes que quieran conocer a Jesús y hacer comunidad. Basta con llegar a un encuentro." },
    { q: "¿Hay algún costo?", a: "Los encuentros semanales no tienen costo. Algunas salidas o retiros piden un aporte, que siempre se avisa con tiempo." },
    { q: "¿Tiene que estar confirmado o confirmada?", a: `No. ${ID.corto} es un lugar para acercarse a Jesús y a la comunidad, en cualquier momento del camino de fe.` },
    { q: "¿Cómo me entero de las actividades?", a: "En esta página y en el calendario para el celular. Cuando una salida requiere autorización, aquí mismo se descarga." },
  ],
  carta: { titulo: "", texto: "", firma: "", hasta: "" },
  contacto: { nombre: `Coordinación ${ID.nombre}`, telefono: "", whatsapp: "", correo: "", direccion: `${ID.parroquia}`, instagram: "", facebook: "" },
};

export function merge(saved) {
  const s = saved || {};
  return {
    bienvenida: s.bienvenida || DEF.bienvenida,
    horario: s.horario || DEF.horario,
    cuidado: Array.isArray(s.cuidado) && s.cuidado.length ? s.cuidado : DEF.cuidado,
    faq: Array.isArray(s.faq) && s.faq.length ? s.faq : DEF.faq,
    carta: { ...DEF.carta, ...(s.carta || {}) },
    contacto: { ...DEF.contacto, ...(s.contacto || {}) },
  };
}
