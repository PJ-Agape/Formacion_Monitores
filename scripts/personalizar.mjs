// Personaliza la app con la identidad de parroquia.json.
// Lo ejecuta solo una acción de GitHub cada vez que alguien cambia parroquia.json o sube logo.png.
// También se puede correr a mano:  node scripts/personalizar.mjs
//
// Qué hace:
//  1. Revisa parroquia.json y explica en palabras simples cualquier error.
//  2. Escribe js/identidad.js (los textos y datos que usa la app).
//  3. Ajusta index.html, familias/, manifest.webmanifest y firestore.rules.
//  4. Cambia la paleta de colores en estilos, código y presentaciones.
//  5. Si hay un logo.png en la raíz, genera todos los íconos (necesita "sharp").
//  6. Sube la versión del service worker para que los celulares reciban el cambio.
// Es idempotente: correrlo dos veces seguidas no cambia nada la segunda vez.

import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const P = (f) => join(ROOT, f);
const read = (f) => readFileSync(P(f), "utf8");
const changed = [];
function write(f, text) {
  if (existsSync(P(f)) && read(f) === text) return;
  writeFileSync(P(f), text);
  changed.push(f);
}

// Paleta original de Ágape: es la que trae el código si nunca se ha personalizado.
const PALETA_BASE = { principal: "#1351a4", oscuro: "#0b2566", acento: "#ef591c", destacado: "#ffba03", suave: "#8ad2fa", fondo: "#fff6e5" };

// ---------------------------------------------------------------------------
// 1. Leer y revisar parroquia.json
// ---------------------------------------------------------------------------
const errores = [];
let cfg;
try { cfg = JSON.parse(read("parroquia.json")); }
catch (e) {
  console.error(`\n✗ parroquia.json no se puede leer: ${e.message}\n  Revisa que cada texto esté entre comillas "así", que haya una coma entre líneas y que no sobre una coma antes de "}".\n`);
  process.exit(1);
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
if (url && !/^https:\/\/[^\s]+$/.test(url)) errores.push("«direccionWeb» debe empezar con https:// (por ejemplo https://pj-sanjuan.github.io/app/).");
if (url && !url.endsWith("/")) url += "/";
const repo = txt("repositorio", 100);
if (repo && !/^[\w.-]+\/[\w.-]+$/.test(repo)) errores.push("«repositorio» debe ser «cuenta/nombre-del-repositorio», como aparece en GitHub.");
const prefijo = txt("prefijo", 20);
if (prefijo && !/^[a-z][a-z0-9]{1,19}$/.test(prefijo)) errores.push("«prefijo» debe ser una sola palabra en minúsculas, sin tildes, espacios ni guiones (por ejemplo sanjuan).");

const colores = { ...PALETA_BASE, ...(cfg.colores || {}) };
for (const [k, v] of Object.entries(colores)) {
  if (!/^#[0-9a-fA-F]{6}$/.test(v)) errores.push(`El color «${k}» debe escribirse como #RRGGBB (por ejemplo #1351a4).`);
  else colores[k] = v.toLowerCase();
}
if (new Set(Object.values(colores)).size !== Object.keys(colores).length) errores.push("Los seis colores deben ser distintos entre sí.");

const admins = Array.isArray(cfg.administradores) ? cfg.administradores.map((e) => String(e).trim().toLowerCase()).filter(Boolean) : [];
if (!admins.length) errores.push("Pon al menos un correo de Google en «administradores».");
for (const e of admins) if (!/^[^\s@"']+@[^\s@"']+\.[a-z]{2,}$/.test(e)) errores.push(`«${e}» no parece un correo válido.`);

const fb = cfg.firebase || null;
const fbOn = !!(fb && fb.apiKey && !/^PEGA/i.test(fb.apiKey));
if (fbOn) for (const k of ["apiKey", "authDomain", "projectId", "appId"]) if (!fb[k] || /^PEGA/i.test(fb[k])) errores.push(`Falta firebase.${k} (cópialo desde la consola de Firebase, paso 5 de la guía).`);

const radios = Array.isArray(cfg.radios) ? cfg.radios.filter((r) => r && r.name && /^https:\/\//.test(r.url || "")) : [];
const planilla = typeof cfg.planillaAvisos === "string" && /^https:\/\//.test(cfg.planillaAvisos) ? cfg.planillaAvisos : "";

if (errores.length) {
  console.error("\n✗ Hay que corregir parroquia.json:\n" + errores.map((e) => "  • " + e).join("\n") + "\n");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 2. js/identidad.js
// ---------------------------------------------------------------------------
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

// Paleta aplicada la vez anterior (la que hoy está escrita en el código).
let antes = PALETA_BASE;
if (existsSync(P("js/identidad.js"))) {
  const m = read("js/identidad.js").match(/\/\* paleta-aplicada (\{.*?\}) \*\//);
  if (m) try { antes = JSON.parse(m[1]); } catch {}
}

write("js/identidad.js", `// Identidad de esta pastoral. Archivo GENERADO desde parroquia.json por scripts/personalizar.mjs:
// no lo edites a mano, cambia parroquia.json.
/* paleta-aplicada ${JSON.stringify(colores)} */
export const ID = ${JSON.stringify(ID, null, 2)};
`);

// ---------------------------------------------------------------------------
// 3. HTML, manifest y reglas
// ---------------------------------------------------------------------------
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const lugar = [nombre, parroquia, diocesis].map(esc).join(" · ");
function patch(file, pairs) {
  if (!existsSync(P(file))) return;
  let s = read(file);
  for (const [re, rep] of pairs) {
    if (!re.test(s)) { console.warn(`  ! ${file}: no encontré ${re} (¿cambió el archivo?)`); continue; }
    s = s.replace(re, rep);
  }
  write(file, s);
}
patch("index.html", [
  [/<title>[^<]*<\/title>/, `<title>${esc(nombre)} · Formación de dirigentes</title>`],
  [/(<meta name="description" content=")[^"]*/, `$1Itinerario de formación, guía de servicio, materiales y oraciones para los dirigentes ${esc(ID.deNombre)}.`],
  [/(<meta name="apple-mobile-web-app-title" content=")[^"]*/, `$1${esc(corto)}`],
  [/(<a class="brand" href="#\/" aria-label=")[^"]*/, `$1${esc(marca)}, inicio`],
  [/(<span class="brand-name">)[^<]*/, `$1${esc(marca)}`],
  [/(<span class="brand-sub">)[^<]*/, `$1${esc(subMarca)}`],
  [/(<footer class="app-footer">\s*<strong>)[^<]*(<\/strong><br>\s*)[^<]*?( · <a href="#\/ayuda">)/, `$1${esc(nombre)}$2${esc(frase)}$3`],
]);
patch("familias/index.html", [
  [/<title>[^<]*<\/title>/, `<title>Para las familias · ${esc(nombre)}</title>`],
  [/(<meta name="description" content=")[^"]*/, `$1${esc(nombre)}, ${esc(parroquia)}: quiénes somos, próximas actividades, autorizaciones y contacto para las familias.`],
  [/(<meta property="og:title" content=")[^"]*/, `$1${esc(nombre)} · Para las familias`],
  [/(<header class="fam-top">\s*<img src="[^"]*" alt=")[^"]*/, `$1Logo ${esc(nombre)}`],
  [/(<span><b>)[^<]*(<\/b><small>)[^<]*(<\/small><\/span>)/, `$1${esc(nombre)}$2${esc(parroquia)}$3`],
  [/(<footer class="fam-foot">)[^<]*(<br>\s*¿Eres parte del grupo\? <a href="..\/">)[^<]*/, `$1${lugar}$2Entra a la app de ${esc(corto)}`],
]);
{
  const m = JSON.parse(read("manifest.webmanifest"));
  m.name = nombre; m.short_name = corto.slice(0, 12);
  m.description = `La casa digital ${ID.deNombre}: agenda, muro y chat, curso de dirigentes, capilla, cancionero y materiales.`;
  write("manifest.webmanifest", JSON.stringify(m, null, 2) + "\n");
}
const lista = admins.map((e) => `'${e}'`).join(", ");
patch("firestore.rules", [
  [/(function bootstrapAdmin\(\) \{ return signedIn\(\) && myEmail\(\) in \[)[^\]]*/, `$1${lista}`],
  [/(function protectedEmail\(e\) \{ return e in \[)[^\]]*/, `$1${lista}`],
]);

// ---------------------------------------------------------------------------
// 4. Paleta de colores (cambia los seis colores de marca en un solo paso)
// ---------------------------------------------------------------------------
const swap = {};
for (const k of Object.keys(PALETA_BASE)) if (antes[k] && antes[k] !== colores[k]) swap[antes[k]] = colores[k];
if (Object.keys(swap).length) {
  const re = new RegExp(Object.keys(swap).join("|"), "gi");
  const files = ["css/app.css", "index.html", "familias/index.html", "manifest.webmanifest",
    ...readdirSync(P("js")).filter((f) => f.endsWith(".js") && f !== "identidad.js").map((f) => "js/" + f),
    ...(existsSync(P("presentaciones")) ? readdirSync(P("presentaciones")).filter((f) => f.endsWith(".html")).map((f) => "presentaciones/" + f) : [])];
  for (const f of files) write(f, read(f).replace(re, (h) => swap[h.toLowerCase()]));
}
// Contraste: el color principal lleva texto blanco encima.
const lum = (h) => { const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const contraste = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
if (contraste(colores.principal, "#ffffff") < 4.5) console.warn(`  ! El color principal ${colores.principal} es claro: el texto blanco encima se leerá mal. Elige uno más oscuro.`);
if (contraste(colores.oscuro, colores.fondo) < 7) console.warn(`  ! El color oscuro y el de fondo tienen poco contraste: los textos se leerán mal.`);

// ---------------------------------------------------------------------------
// 5. Íconos desde logo.png (opcional)
// ---------------------------------------------------------------------------
if (existsSync(P("logo.png"))) {
  let sharp = null;
  try { sharp = (await import("sharp")).default; } catch { console.warn("  ! Hay un logo.png pero no está instalado «sharp»; la acción de GitHub lo instala sola."); }
  if (sharp) {
    const src = readFileSync(P("logo.png"));
    const bg = colores.fondo;
    const out = async (file, buf) => { const old = existsSync(P(file)) ? readFileSync(P(file)) : null; if (!old || !old.equals(buf)) { writeFileSync(P(file), buf); changed.push(file); } };
    const fit = (n) => sharp(src).resize(n, n, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } });
    const onBg = async (n, pad) => {
      const inner = Math.round(n * (1 - 2 * pad));
      const logo = await fit(inner).png().toBuffer();
      return sharp({ create: { width: n, height: n, channels: 4, background: bg } }).composite([{ input: logo, gravity: "center" }]).png().toBuffer();
    };
    for (const n of [160, 320, 512]) await out(`icons/logo-${n}.webp`, await fit(n).webp({ quality: 90 }).toBuffer());
    await out("icons/favicon-64.png", await fit(64).png().toBuffer());
    await out("icons/icon-192.png", await onBg(192, 0.06));
    await out("icons/icon-512.png", await onBg(512, 0.06));
    await out("icons/icon-maskable-512.png", await onBg(512, 0.16));
    await out("icons/apple-touch-icon.png", await onBg(180, 0.08));
  }
}

// ---------------------------------------------------------------------------
// 6. Service worker: prefijo propio y versión nueva si algo cambió
// ---------------------------------------------------------------------------
{
  const s = read("sw.js");
  const m = s.match(/const VERSION = "([a-z0-9]+)-v(\d+)";/);
  if (!m) console.warn("  ! sw.js: no encontré la línea VERSION.");
  else {
    const n = +m[2] + (changed.length || m[1] !== prefijo ? 1 : 0);
    write("sw.js", s.replace(m[0], `const VERSION = "${prefijo}-v${n}";`));
  }
}

console.log(changed.length ? `✓ Personalizado para «${nombre}». Archivos actualizados:\n  ${changed.join("\n  ")}` : `✓ Nada que cambiar: la app ya tiene la identidad de «${nombre}».`);
