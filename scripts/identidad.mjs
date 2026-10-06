// Lee y revisa parroquia.json, y arma la identidad (ID) que usan la app y los scripts.
// Uso: import { leerIdentidad, PALETA_BASE } from "./identidad.mjs";
//      const { ID, errores } = leerIdentidad();   // errores: lista en palabras simples

import { readFileSync } from "node:fs";
import { join } from "node:path";

export const RAIZ = new URL("..", import.meta.url).pathname;

// Paleta original de Ágape: la que trae el código.
export const PALETA_BASE = { principal: "#1351a4", oscuro: "#0b2566", acento: "#ef591c", destacado: "#ffba03", suave: "#8ad2fa", fondo: "#fff6e5" };

export function leerIdentidad(raiz = RAIZ) {
  const errores = [];
  let cfg;
  try { cfg = JSON.parse(readFileSync(join(raiz, "parroquia.json"), "utf8")); }
  catch (e) {
    return { ID: null, errores: [`parroquia.json no se puede leer (${e.message}). Revisa que cada texto esté entre comillas "así", que haya una coma al final de cada línea menos la última de cada bloque, y que no falte ni sobre ninguna llave { }.`] };
  }
  const txt = (k, max = 120) => {
    const v = cfg[k];
    if (typeof v !== "string" || !v.trim()) errores.push(`Falta «${k}».`);
    else if (v.length > max) errores.push(`«${k}» es muy largo (máximo ${max} caracteres).`);
    return typeof v === "string" ? v.trim() : "";
  };
  const nombre = txt("nombre", 60), corto = txt("nombreCorto", 24), marca = txt("marca", 30), subMarca = txt("subtituloMarca", 30), frase = txt("frase", 90);
  const parroquia = txt("parroquia", 80), comuna = txt("comuna", 40), diocesis = txt("diocesis", 80);
  const art = String(cfg.articulo || "la").toLowerCase(), artP = String(cfg.articuloParroquia || "la").toLowerCase();
  for (const [k, v] of [["articulo", art], ["articuloParroquia", artP]]) if (!["el", "la", "los", "las"].includes(v)) errores.push(`«${k}» debe ser el, la, los o las.`);

  let url = txt("direccionWeb", 200);
  if (url && !/^https:\/\/\S+$/.test(url)) errores.push("«direccionWeb» debe empezar con https:// (por ejemplo https://pj-sanjuan.github.io/app/).");
  if (url && !url.endsWith("/")) url += "/";
  const repo = txt("repositorio", 100);
  if (repo && !/^[\w.-]+\/[\w.-]+$/.test(repo)) errores.push("«repositorio» debe ser «cuenta/nombre», tal como aparece arriba en GitHub.");
  const prefijo = txt("prefijo", 20);
  if (prefijo && !/^[a-z][a-z0-9]{1,19}$/.test(prefijo)) errores.push("«prefijo» debe ser una sola palabra en minúsculas, sin tildes, espacios ni guiones (por ejemplo sanjuan).");

  const colores = { ...PALETA_BASE, ...(cfg.colores || {}) };
  for (const [k, v] of Object.entries(colores)) {
    if (!/^#[0-9a-fA-F]{6}$/.test(v)) errores.push(`El color «${k}» debe escribirse como #RRGGBB (por ejemplo #1351a4).`);
    else colores[k] = v.toLowerCase();
  }
  if (new Set(Object.values(colores)).size !== Object.keys(colores).length) errores.push("Los seis colores deben ser distintos entre sí.");
  for (const [k, v] of Object.entries(colores)) {
    const otro = Object.keys(PALETA_BASE).find((b) => b !== k && PALETA_BASE[b] === v);
    if (otro) errores.push(`El color «${k}» (${v}) es el «${otro}» original: elige un tono un poco distinto (por ejemplo cambia la última cifra).`);
  }

  const admins = Array.isArray(cfg.administradores) ? cfg.administradores.map((e) => String(e).trim().toLowerCase()).filter(Boolean) : [];
  if (!admins.length) errores.push("Pon al menos un correo de Google en «administradores».");
  for (const e of admins) if (!/^[^\s@"']+@[^\s@"']+\.[a-z]{2,}$/.test(e)) errores.push(`«${e}» no parece un correo válido.`);

  const fb = cfg.firebase || null;
  const pendiente = (v) => !v || /^PEGA/i.test(String(v));
  const fbOn = !!(fb && !pendiente(fb.apiKey));
  if (fbOn) for (const k of ["apiKey", "authDomain", "projectId", "appId"]) if (pendiente(fb[k])) errores.push(`Falta firebase.${k} (cópialo desde la consola de Firebase; paso 5 de la guía).`);

  const radios = Array.isArray(cfg.radios) ? cfg.radios.filter((r) => r && r.name && /^https:\/\//.test(r.url || "")) : [];
  const planilla = typeof cfg.planillaAvisos === "string" && /^https:\/\//.test(cfg.planillaAvisos) ? cfg.planillaAvisos : "";

  if (errores.length) return { ID: null, errores };

  const de = (a, x) => ({ el: `del ${x}`, la: `de la ${x}`, los: `de los ${x}`, las: `de las ${x}` }[a]);
  const up = (s) => s.toLocaleUpperCase("es");
  const i = nombre.lastIndexOf(corto);
  const ID = {
    nombre, nombreCorto: corto, corto, marca, subtituloMarca: subMarca, frase,
    NOMBRE: up(nombre), CORTO: up(corto),
    nombreMarcado: i >= 0 ? nombre.slice(0, i) + "*" + corto + "*" + nombre.slice(i + corto.length) : `*${nombre}*`,
    elNombre: `${art} ${nombre}`, deNombre: de(art, nombre),
    parroquia, PARROQUIA: up(parroquia), deParroquia: de(artP, parroquia),
    comuna, COMUNA: up(comuna), diocesis,
    url, urlCorta: url.replace(/^https:\/\//, ""), repositorio: repo, dominio: repo.split("/")[0].toLowerCase(), prefijo,
    colores, administradores: admins,
    firebase: fbOn ? { apiKey: fb.apiKey, authDomain: fb.authDomain, projectId: fb.projectId, storageBucket: fb.storageBucket || "", messagingSenderId: fb.messagingSenderId || "", appId: fb.appId } : null,
    planillaAvisos: planilla, radios,
  };
  return { ID, errores: [] };
}
