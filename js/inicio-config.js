// Textos y enlaces de Inicio que el equipo puede cambiar desde Gestión → Inicio y enlaces:
// el saludo, La Plaza Ágape, Nuestras familias y las radios católicas.
// Se guarda en el mismo documento de la Portada (content/portada, campo «inicio»), que editan
// administradores y coordinadores. Lo que no se cambia usa el texto original de abajo.
import { RADIOS as RADIOS_BASE } from "./capilla.js";

export const DEFAULTS = {
  saludo: { cuenta: "qué bueno verte", visita: "bienvenido a casa" },
  plaza: {
    hand: "donde nos encontramos", title: "La Plaza *Ágape*",
    text: "Lo que vivimos, lo que conversamos y lo que nos decimos: todo en un mismo lugar.",
    doors: {
      momentos: { kicker: "Lo que vivimos", title: "Momentos", text: "Las fotos del grupo, para reaccionar y comentar.", on: true },
      muro: { kicker: "Lo que conversamos", title: "Muro", text: "Avisos, temas, preguntas y encuestas.", on: true },
      chat: { kicker: "Lo que nos decimos", title: "Chat", text: "Salas para conversar en grupo.", on: true },
      juegos: { kicker: "Lo que jugamos", title: "Juegos", text: "El Impostor, mímicas, trivia y más.", on: true },
    },
  },
  familias: {
    hand: "nadie camina solo", title: "Nuestras *familias*",
    text: "Los grupos pequeños de la pastoral: su nombre, su dirigente y quiénes la forman.",
    doors: {
      familias: { kicker: "Nuestro grupo", title: "Ver las familias", text: "Cada familia con su muro y su agenda.", on: true },
      pasaporte: { kicker: "Mi camino", title: "Mi pasaporte", text: "Tus encuentros, tu racha y tus sellos.", on: true },
      asistencia: { kicker: "Para guías", title: "Asistencia", text: "Pasar lista y acompañar a los jóvenes.", on: true },
    },
  },
  radios: RADIOS_BASE.map((r) => ({ ...r })),
};
export const DOOR_NAMES = { momentos: "Momentos", muro: "Muro", chat: "Chat", juegos: "Juegos", familias: "Ver las familias", pasaporte: "Mi pasaporte", asistencia: "Asistencia" };

const KEY = "agape_inicio_cfg_v1";
let saved = {};
try { saved = JSON.parse(localStorage.getItem(KEY) || "null") || {}; } catch { saved = {}; }

const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);
function merge(base, over) {
  if (!isObj(base) || !isObj(over)) return over === undefined || over === null || over === "" ? base : over;
  const out = { ...base };
  for (const k of Object.keys(over)) out[k] = k in base ? merge(base[k], over[k]) : over[k];
  return out;
}
// Configuración efectiva (original + cambios del equipo).
export function cfg() {
  const c = merge(DEFAULTS, saved);
  const radios = Array.isArray(saved.radios) ? saved.radios.filter((r) => r && r.name && /^https?:\/\//i.test(r.url || "")) : DEFAULTS.radios;
  return { ...c, radios };
}
export const savedRaw = () => saved;
export function adopt(v) {
  const next = isObj(v) ? v : {};
  const changed = JSON.stringify(next) !== JSON.stringify(saved);
  saved = next;
  try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch { /* sin almacenamiento */ }
  return changed;
}
