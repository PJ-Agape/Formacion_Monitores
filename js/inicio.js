// Inicio ordenado en tres bloques (Formación · Comunidad · Espiritualidad), sus páginas
// de bloque (#/formacion y #/red) y el buscador de toda la app (#/buscar).

import * as S from "./store.js";
import * as cloud from "./cloud.js";
import { esc, icon } from "./util.js";
import { illus } from "./ilustraciones.js";
import { ORACIONES } from "./devocionario.js";
import { BANCO } from "./dinamicas-banco.js";
import { songList } from "./cancionero.js";
import { helpFor, perfil } from "./ayuda.js";
import { todayGospel } from "./capilla.js";

let ctx = null; // { actions, onAfterRender, render }
export function setup(c) { ctx = c; registerActions(); }

// ---------------------------------------------------------------------------
// Quién eres (decide qué se muestra)
// ---------------------------------------------------------------------------
function who() {
  const s = cloud.enabled ? cloud.state() : { ready: true, role: "admin", isGuide: true };
  const joven = cloud.enabled && !!s.isJoven, asp = !!s.ready && s.role === "aspirante";
  return {
    s, joven, asp, guest: cloud.enabled && !s.ready,
    curso: !cloud.enabled || (!!s.ready && !joven),          // curso de dirigentes y cuaderno
    equipo: !cloud.enabled || (!!s.ready && !joven && !asp), // revistas, materiales, dinámicas, guía
    guia: !cloud.enabled || !!s.isGuide,
    cuenta: !cloud.enabled || !!s.ready,
    camino: joven || asp,                                    // Mi Camino (encuentros por etapa)
  };
}

// ---------------------------------------------------------------------------
// Los tres bloques y todo lo que hay dentro
// ---------------------------------------------------------------------------
export const BLOCKS = {
  formacion: { t: "Formación", hand: "para crecer", href: "#/formacion", ill: "apostoles", c: "#1351a4", soft: "#e1f3fd",
    d: "El curso de dirigentes, los encuentros del Camino Ágape y los recursos para preparar." },
  red: { t: "Comunidad", hand: "para encontrarnos", href: "#/red", ill: "amigos", c: "#ef591c", soft: "#fde0d2",
    d: "El muro, el chat, la agenda y todo lo que compartimos como grupo." },
  espiritu: { t: "Espiritualidad", hand: "para rezar", href: "#/oracion", ill: "jesus", c: "#c98a00", soft: "#fff0c2",
    d: "La Capilla: el Evangelio del día, intenciones, oraciones, cantos y radios católicas." },
};
// e: emoji · t: título · d: descripción · kw: palabras para el buscador · ok: quién lo ve
const ITEMS = [
  { b: "formacion", e: "🧭", t: "Mi Camino", d: "El encuentro de tu etapa de esta semana.", href: "#/mi-camino", kw: "etapa ingreso madurez encuentro semana", ok: (w) => w.camino },
  { b: "formacion", e: "🎓", t: "Curso de dirigentes", d: "Unidades, evaluaciones y tu avance.", href: "#/itinerario", kw: "curso formacion itinerario unidades modulos evaluacion el arte de encontrarnos", ok: (w) => w.curso },
  { b: "formacion", e: "📓", t: "Mi cuaderno", d: "Lo que escribiste en las reflexiones.", href: "#/cuaderno", kw: "cuaderno notas reflexion respuestas", ok: (w) => w.curso, hub: false },
  { b: "formacion", e: "📰", t: "Nuestra Revista", d: "Camino Ágape: los encuentros semana a semana.", href: "#/encuentros", kw: "revista encuentros semanales coordinacion etapas camino", ok: (w) => w.equipo },
  { b: "formacion", e: "🧰", t: "Materiales y dinámicas", d: "Recursos para preparar y juegos, rompehielos y dinámicas de oración.", href: "#/materiales", kw: "materiales recursos documentos biblioteca links", ok: (w) => w.equipo,
    links: [["🧰 Materiales", "#/materiales"], ["🎲 Dinámicas", "#/dinamicas"]] },
  { b: "formacion", e: "🎲", t: "Dinámicas", d: "Juegos, rompehielos y dinámicas de oración.", href: "#/dinamicas", kw: "dinamicas juegos rompehielos actividades", ok: (w) => w.equipo, hub: false },
  { b: "formacion", e: "🌉", t: "¿Quieres ser dirigente?", d: "Presentación «Sé puente».", href: "presentaciones/se-puente.html", ext: true, kw: "dirigente se puente vocacion servir", ok: (w) => w.guest || w.joven },
  { b: "red", e: "📌", t: "Muro", d: "Avisos, logros y conversaciones del grupo.", href: "#/muro", kw: "muro avisos publicaciones noticias logros encuesta", ok: () => true },
  { b: "red", e: "💬", t: "Chat", d: "Salas para conversar en grupo.", href: "#/chat", kw: "chat salas mensajes conversar zumbido", ok: () => true },
  { b: "red", e: "📅", t: "Agenda", d: "Encuentros, misas y actividades.", href: "#/agenda", kw: "agenda calendario actividades fechas misa retiro", ok: () => true },
  { b: "red", e: "👥", t: "Nuestros grupos", d: "Familias y comunidades: tu pasaporte y la asistencia de cada encuentro.", href: "#/pasaporte", kw: "grupos familias comunidades", ok: (w) => w.cuenta && cloud.enabled,
    links: [["🛂 Mi pasaporte", "#/pasaporte", (w) => w.cuenta], ["🤝 Asistencia", "#/acompanar", (w) => w.guia]] },
  { b: "red", e: "🛂", t: "Mi pasaporte", d: "Tus encuentros, tu racha y tus sellos.", href: "#/pasaporte", kw: "pasaporte sellos racha asistencia", ok: (w) => w.cuenta && cloud.enabled, hub: false },
  { b: "red", e: "🤝", t: "Asistencia", d: "Pasar lista y acompañar a los jóvenes.", href: "#/acompanar", kw: "acompanar lista asistencia jovenes guia sellos", ok: (w) => w.guia && cloud.enabled, hub: false },
  // El equipo encuentra la difusión y la guía de servicio en Materiales; los jóvenes (sin Materiales) siguen viendo la difusión aquí.
  { b: "red", e: "📣", t: "Estudio de difusión", d: "Marco de foto, historias, fondos y stickers.", href: "#/difusion", kw: "difusion stickers fondos de pantalla marco foto historias invitacion afiche", ok: (w) => w.cuenta, hub: (w) => !w.equipo },
  { b: "red", e: "🏛️", t: "Guía de servicio", d: "Presentación: identidad, roles, cargos y reuniones.", href: "presentaciones/guia-de-servicio.html", ext: true, kw: "guia servicio pastoral identidad roles cargos reuniones comunidad presentacion", ok: (w) => w.equipo, hub: false },
  { b: "espiritu", e: "⛪", t: "Nuestra Capilla", d: "Silencio, intenciones, la Palabra y María: un lugar para estar con Jesús.", href: "#/oracion", kw: "capilla oracion rezar velas intenciones espiritualidad", ok: () => true },
  { b: "espiritu", e: "📖", t: "Evangelio del día", d: "La Palabra de hoy.", href: "#/evangelio", kw: "evangelio palabra lectura hoy biblia", ok: () => true },
  { b: "espiritu", e: "🙏", t: "Oraciones de siempre", d: "Padre nuestro, Ave María, Credo y más.", href: "#/oracion/siempre", kw: "oraciones devocionario rezar", ok: () => true },
  { b: "espiritu", e: "🌹", t: "Con María", d: "El Rosario y oraciones a la Virgen.", href: "#/oracion/maria", kw: "maria virgen rosario misterios", ok: () => true },
  { b: "espiritu", e: "🕯️", t: "Nuestras intenciones", d: "Comparte tu intención y reza por las de otros.", href: "#/oracion/velas", kw: "vela intencion rezar por", ok: () => true },
  { b: "espiritu", e: "🎶", t: "Cancionero", d: "Canciones con acordes para la misa.", href: "#/cancionero", kw: "cancionero canciones acordes misa cantos guitarra", ok: () => true },
  { b: "espiritu", e: "📻", t: "Radios católicas", d: "Radio María, El Sembrador y Regina Coeli.", href: "#/oracion/radio", kw: "radio maria sembrador regina coeli escuchar", ok: () => true },
  { b: "espiritu", e: "🤫", t: "Silencio", d: "Un momento de pausa con Jesús.", href: "#/oracion/silencio", kw: "silencio pausa calma respirar", ok: () => true },
];
const descFor = (k, w) => k !== "formacion" ? BLOCKS[k].d
  : w.equipo ? BLOCKS.formacion.d
  : w.camino ? (w.curso ? "Tu Camino Ágape y el curso de dirigentes." : "Tu Camino Ágape: el encuentro de tu etapa, semana a semana.")
  : "Crecer en la fe y aprender a acompañar a otros.";
export const itemsFor = (b) => { const w = who(); return ITEMS.filter((x) => x.b === b && x.ok(w)); };
const inHub = (x) => { const h = x.hub; return h === undefined ? true : typeof h === "function" ? h(who()) : h; };
const itemCard = (x) => x.links ? `<div class="card hub-item hub-multi">
    <span class="hub-e" aria-hidden="true">${x.e}</span><span><strong>${esc(x.t)}</strong><span class="muted small">${esc(x.d)}</span>
    <span class="hub-links">${x.links.filter((l) => !l[2] || l[2](who())).map(([l, h]) => `<a class="chip-link" href="${esc(h)}">${esc(l)} ${icon("right")}</a>`).join("")}</span></span></div>`
  : `<a class="card link hub-item" href="${esc(x.href)}" ${x.ext ? 'target="_blank" rel="noopener"' : ""}>
    <span class="hub-e" aria-hidden="true">${x.e}</span><span><strong>${esc(x.t)}</strong><span class="muted small">${esc(x.d)}</span></span>${icon("right")}</a>`;

// ---------------------------------------------------------------------------
// Inicio: saludo + buscador + los tres bloques
// ---------------------------------------------------------------------------
// Cita del Evangelio del día bajo el saludo
export async function paintGospel() {
  const el = document.getElementById("homeGospel"); if (!el) return;
  const g = await todayGospel().catch(() => null);
  if (!g || !g.cita) return;
  el.innerHTML = `<span class="hg-k">📖 Evangelio de hoy · ${esc(g.cita)}</span>${g.frase ? `<span class="hg-f">«${esc(g.frase)}»</span>` : ""}<span class="hg-go">Leer ${icon("arrowR")}</span>`;
  el.hidden = false;
}
export function greetHTML() {
  const w = who();
  const name = (cloud.enabled ? (w.s.account || {}).name : S.getProfile().name) || "";
  const first = String(name).split(" ")[0];
  const h = new Date().getHours(), saludo = h < 12 ? "Buenos días" : h < 20 ? "Buenas tardes" : "Buenas noches";
  return `<section class="home-hi">
    <span class="home-hand">${w.guest ? "bienvenido a casa" : "qué bueno verte"}</span>
    <h1>${esc(saludo)}${first ? `, <em>${esc(first)}</em>` : ""} 👋</h1>
    <a class="home-gospel" id="homeGospel" href="#/evangelio" hidden></a>
  </section>`;
}
const searchBox = (id, val = "") => `<form class="home-search" role="search" data-search="${id}" onsubmit="return false">
    ${icon("search")}<input id="${id}" type="search" placeholder="Buscar en agAPPe: canción, oración, unidad…" autocomplete="off" value="${esc(val)}" aria-label="Buscar en la app">
  </form><div class="search-res" id="${id}Res" aria-live="polite"></div>`;

// Puertas a los tres bloques (Inicio): grandes, de color, a un toque
export function doorsHTML() {
  return `<nav class="doors" aria-label="Bloques de agAPPe">${["formacion", "red", "espiritu"].map((k) => { const b = BLOCKS[k];
    return `<a class="door" href="${b.href}" style="--bc:${b.c};--bs:${b.soft}"><span class="door-ill">${illus(b.ill, "")}</span><span class="door-h">${esc(b.hand)}</span><strong>${esc(b.t)}</strong></a>`; }).join("")}</nav>`;
}
export function blocksHTML() {
  const w = who(), course = S.activeCourse(), st = S.courseState(course);
  const status = {
    formacion: w.camino && !w.curso ? "Tu encuentro de esta semana te espera"
      : w.curso ? `<span class="blk-bar"><i style="width:${st.totalSessions ? Math.round((st.readSessions / st.totalSessions) * 100) : 0}%"></i></span>${st.readSessions}/${st.totalSessions} unidades del curso`
      : "Ingresa para empezar tu camino",
    red: `<span id="blkRed">${w.cuenta ? "Lo que pasa en el grupo" : "La agenda está abierta para todos"}</span>`,
    espiritu: `<span id="blkGospel">Pasa, Él te espera</span>`,
  };
  ctx.onAfterRender(async () => {
    const g = await todayGospel().catch(() => null);
    const el = document.getElementById("blkGospel"); if (el && g && g.cita) el.textContent = `Evangelio de hoy · ${g.cita}`;
  });
  return `<div class="blocks">${Object.entries(BLOCKS).map(([k, b]) => {
    const chips = itemsFor(k).slice(0, 4);
    return `<section class="blk" style="--bc:${b.c};--bs:${b.soft}">
      <a class="blk-main" href="${b.href}">
        <span class="blk-ill">${illus(b.ill)}</span>
        <span class="blk-txt"><span class="blk-hand">${esc(b.hand)}</span><strong class="blk-t">${esc(b.t)}</strong>
        <span class="blk-d">${esc(descFor(k, w))}</span><span class="blk-st">${status[k]}</span></span>
        <span class="blk-go" aria-hidden="true">${icon("arrowR")}</span>
      </a>
      <nav class="blk-chips" aria-label="${esc(b.t)}">${chips.map((x) => `<a href="${esc(x.href)}" ${x.ext ? 'target="_blank" rel="noopener"' : ""}><span aria-hidden="true">${x.e}</span> ${esc(x.t)}</a>`).join("")}</nav>
    </section>`;
  }).join("")}</div>`;
}

// ---------------------------------------------------------------------------
// Páginas de bloque
// ---------------------------------------------------------------------------
export function viewFormacion() {
  const w = who(), course = S.activeCourse(), st = S.courseState(course);
  const b = BLOCKS.formacion;
  if (w.camino) ctx.onAfterRender(() => ctx.camJ.homeCard());
  return `<header class="page-head hub-head" style="--bc:${b.c}"><span class="eyebrow">Bloque 1 · ${esc(b.hand)}</span><h1>Formación</h1><p>${esc(descFor("formacion", w))}</p></header>
  ${w.camino ? `<div id="mcSlot"></div>` : ""}
  ${w.curso ? `<a class="card link hub-course" href="#/itinerario">
      <span class="eyebrow">Curso de formación de dirigentes</span><strong>${esc(course.title)}</strong>
      <span class="hub-prog"><i style="width:${st.totalSessions ? Math.round((st.readSessions / st.totalSessions) * 100) : 0}%"></i></span>
      <span class="muted small"><b>${st.readSessions}/${st.totalSessions}</b> unidades · ${st.complete ? "¡Curso completado! 🎉" : "sigue donde quedaste"}</span></a>` : ""}
  <div class="hub-grid">${itemsFor("formacion").filter((x) => inHub(x) && x.href !== "#/itinerario" && x.href !== "#/mi-camino").map(itemCard).join("")}</div>
  ${w.guest ? `<p class="muted small" style="margin-top:14px">Para ver el curso y los encuentros, <a href="#/perfil">ingresa con tu cuenta</a>.</p>` : ""}`;
}
export function viewRed() {
  const w = who(), b = BLOCKS.red;
  ctx.onAfterRender(() => { ctx.agenda.homeNext(); ctx.wall.homeHighlight(); });
  return `<header class="page-head hub-head" style="--bc:${b.c}"><span class="eyebrow">Bloque 2 · ${esc(b.hand)}</span><h1>Comunidad</h1><p>${esc(b.d)}</p></header>
  <div class="hub-grid">${itemsFor("red").filter(inHub).map(itemCard).join("")}</div>
  <div id="acHomeSlot"></div>
  <div id="desafioSlot"></div>
  <div id="agendaSlot" style="margin-top:16px"></div>
  ${w.cuenta ? `<div id="wallSlot"></div>` : ""}`;
}

// ---------------------------------------------------------------------------
// Buscador
// ---------------------------------------------------------------------------
const norm = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
let agendaCache = null;
function index() {
  const w = who(), out = [];
  const add = (g, e, t, d, href, kw = "", ext = false) => out.push({ g, e, t, d, href, ext, s: norm(`${t} ${kw}`), sd: norm(d) });
  ITEMS.filter((x) => x.ok(w)).forEach((x) => add("Secciones", x.e, x.t, `${BLOCKS[x.b].t} · ${x.d}`, x.href, x.kw, x.ext));
  add("Secciones", "👤", "Mi perfil y avatar", "Tu cuenta, tu avatar y tu tema.", "#/perfil", "perfil cuenta avatar foto nombre tema oscuro");
  add("Secciones", "❓", "Ayuda", "Respuestas cortas: ¿cómo hago…?", "#/ayuda", "ayuda como hago tutorial");
  add("Secciones", "♿", "Accesibilidad", "Tamaño de letra y lectura en voz alta.", "#/accesibilidad", "accesibilidad letra grande leer voz");
  if (w.curso) {
    const c = S.activeCourse();
    (c.phases || []).forEach((p, pi) => (p.sessions || []).forEach((s) => add("Unidades del curso", "🎓", `${s.id} ${s.title}`, p.title, `#/unidad/${pi}/${encodeURIComponent(s.id)}`, s.summary || "")));
  }
  ORACIONES.forEach((o) => add("Oraciones", "🙏", o.t, o.note || "Oraciones de siempre", "#/oracion/siempre"));
  try { songList().forEach((s) => add("Canciones", "🎶", s.title, s.author || "Cancionero", `#/cancionero/${encodeURIComponent(s.id)}`, (s.momentos || []).join(" "))); } catch {}
  if (w.equipo) BANCO.forEach((d) => add("Dinámicas", "🎲", d.title, d.objetivo, `#/dinamicas/${encodeURIComponent(d.id)}`, (d.tags || []).join(" ")));
  helpFor(perfil()).forEach((h) => add("Ayuda", "❓", h.q, h.a[0] || "", `#/ayuda?t=${h.t}`));
  (agendaCache || []).forEach((e) => add("Agenda", "📅", e.title, `${e.date || ""}${e.place ? " · " + e.place : ""}`, e.date ? `#/agenda/${e.date}` : "#/agenda", `${e.type || ""} ${e.desc || ""}`));
  return out;
}
export function search(q, max = 40) {
  const words = norm(q).split(/\s+/).filter((x) => x.length > 1);
  if (!words.length) return [];
  return index().map((x) => {
    let sc = 0;
    for (const wd of words) {
      const start = x.s.startsWith(wd) || x.s.includes(" " + wd), inT = start || (wd.length > 3 && x.s.includes(wd));
      const inD = x.sd.startsWith(wd) || x.sd.includes(" " + wd) || (wd.length > 3 && x.sd.includes(wd));
      if (inT) sc += start ? 3 : 2; else if (inD) sc += 1; else return null;
    }
    return { ...x, sc: sc + (x.g === "Secciones" ? 2 : 0) };
  }).filter(Boolean).sort((a, b) => b.sc - a.sc).slice(0, max);
}
function resultsHTML(q, list, full) {
  if (!q.trim()) return "";
  if (!list.length) return `<p class="search-empty">No encontramos «${esc(q)}». Prueba con otra palabra, o mira la <a href="#/ayuda">Ayuda</a>.</p>`;
  const groups = {};
  list.forEach((x) => (groups[x.g] = groups[x.g] || []).push(x));
  const rows = Object.entries(groups).map(([g, xs]) => `<div class="sr-g"><span class="sr-gt">${esc(g)}</span>${xs.slice(0, full ? 20 : 4).map((x) => `<a class="sr-i" href="${esc(x.href)}" ${x.ext ? 'target="_blank" rel="noopener"' : ""}>
      <span class="sr-e" aria-hidden="true">${x.e}</span><span><b>${esc(x.t)}</b><small>${esc(String(x.d).slice(0, 90))}</small></span></a>`).join("")}</div>`).join("");
  return rows + (full ? "" : `<a class="sr-all" href="#/buscar?q=${encodeURIComponent(q)}">Ver todos los resultados ${icon("arrowR")}</a>`);
}
async function loadAgenda() {
  if (agendaCache) return;
  try { agendaCache = (await cloud.listAgenda()).filter((e) => e.title); } catch { agendaCache = []; }
}
export function viewBuscar(q = "") {
  ctx.onAfterRender(() => { const i = document.getElementById("pageQ"); if (i) { i.focus(); paint("pageQ", true); } });
  return `<header class="page-head"><span class="eyebrow">Buscar</span><h1>¿Qué estás <em>buscando</em>?</h1>
    <p>Secciones, unidades del curso, canciones, oraciones, dinámicas, actividades y ayuda.</p></header>
    <div class="search-page">${searchBox("pageQ", q)}</div>`;
}
function paint(id, full) {
  const i = document.getElementById(id), box = document.getElementById(id + "Res");
  if (!i || !box) return;
  const q = i.value;
  box.innerHTML = resultsHTML(q, search(q, full ? 80 : 30), full);
  box.classList.toggle("on", !!q.trim());
}
function registerActions() {
  let t = null;
  document.addEventListener("input", (e) => {
    const f = e.target.closest && e.target.closest("[data-search]"); if (!f) return;
    const id = f.dataset.search;
    loadAgenda().then(() => paint(id, id === "pageQ"));
    clearTimeout(t); t = setTimeout(() => paint(id, id === "pageQ"), 120);
    if (id === "pageQ") history.replaceState(null, "", `#/buscar?q=${encodeURIComponent(e.target.value)}`);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const f = e.target.closest && e.target.closest("[data-search]"); if (!f) return;
    e.target.value = ""; paint(f.dataset.search, false);
  });
}
