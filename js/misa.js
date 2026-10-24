// La Misa del día para seguirla en orden: lo que dice el sacerdote, lo que respondemos, las
// oraciones de todos y las lecturas completas del día en su lugar. Cada momento tiene una
// explicación breve («¿Qué pasa aquí?») y cantos sugeridos. Con el modo «Seguir paso a paso»
// se destaca el momento en que vamos. Se hojea como librito y se imprime en PDF.

import { esc, icon, toast, fetchJSON } from "./util.js";
import { season } from "./capilla.js";
import { GRUPOS, PARTES } from "./misa-partes.js";
import { ORDINARIO } from "./misa-ordinario.js";
import { createBook, splitByHeight } from "./libro.js";
import { songList } from "./cancionero.js";

let ctx = null; // { actions, render, onAfterRender, onLeave, cloud }
export function setup(c) { ctx = c; registerActions(); }
const $ = (s, r = document) => r.querySelector(s);

const isoOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const dateOf = (iso) => new Date(iso + "T12:00");
const largo = (iso) => dateOf(iso).toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" });
const cap1 = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const store = { get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };

let data = null, gospel = null, dia = "", songs = [];
async function load() {
  if (!data) data = await fetchJSON("data/misa.json", 30 * 60 * 1000).catch(() => ({ days: {} }));
  if (!gospel) gospel = await fetchJSON("data/evangelio.json", 30 * 60 * 1000).catch(() => ({ days: {} }));
}
const dias = () => [...new Set([...Object.keys(data?.days || {}), ...Object.keys(gospel?.days || {})])].sort();
const diaData = (iso) => (data?.days || {})[iso] || null;

// Cantos sugeridos: canciones del cancionero con la etiqueta de cada momento (cambian según el día).
const SLOT = { entrada: ["entrada"], perdon: ["perdon"], gloria: ["gloria"], aleluya: ["aleluya", "aclamacion"], ofertorio: ["ofertorio"], santo: ["santo"],
  padrenuestro: ["padrenuestro"], cordero: ["cordero"], comunion: ["comunion", "meditacion"], accion: ["accion", "meditacion"], maria: ["maria"] };
function cantos(slot, iso, n = 3) {
  const keys = SLOT[slot] || [slot];
  const todas = [...songList(), ...songs].filter((x, i, a) => a.findIndex((y) => y.id === x.id) === i); // originales de Ágape + las de la comunidad
  let l = todas.filter((s) => (s.momentos || []).some((m) => keys.includes(m)));
  if (slot === "aleluya" && season(dateOf(iso)).key === "cuaresma") l = l.filter((s) => !/aleluya/i.test(s.title)); // en Cuaresma no se canta el Aleluya
  if (!l.length) return [];
  l.sort((a, b) => a.title.localeCompare(b.title, "es"));
  const seed = Math.floor(dateOf(iso).getTime() / 864e5);
  return Array.from({ length: Math.min(n, l.length) }, (_, i) => l[(seed * 7 + i * 5) % l.length]).filter((x, i, a) => a.indexOf(x) === i);
}

// Qué momentos van este día: el Gloria, el Credo y la segunda lectura no van siempre.
function momentos(iso) {
  const d = diaData(iso), g = (gospel?.days || {})[iso];
  const tit = d?.titulo || g?.titulo || "", key = season(dateOf(iso)).key;
  const dom = dateOf(iso).getDay() === 0 || /domingo/i.test(tit);
  const solemne = /solemnidad|natividad del señor|santa maría, madre de dios|ascensión|pentecost|santísima trinidad|cuerpo y la sangre|sagrado corazón|asunción|todos los santos|inmaculada|san josé|san pedro y san pablo|cristo, rey/i.test(tit);
  const fiesta = solemne || /fiesta|octava/i.test(tit);
  const ok = { gloria: (dom && key !== "adviento" && key !== "cuaresma") || fiesta, credo: dom || solemne, segunda: d ? !!d.segunda : dom };
  return ORDINARIO.filter((m) => !m.solo || ok[m.solo]);
}
const infoDe = (k) => PARTES.find((p) => p.k === k) || {};

// ---------------------------------------------------------------------------
// Vista  (#/misa  o  #/misa/AAAA-MM-DD)
// ---------------------------------------------------------------------------
let seguir = store.get("agape_misa_seguir", false), letra = store.get("agape_misa_letra", 0), mi = 0, diaPaso = "";
export function view(iso) {
  dia = /^\d{4}-\d{2}-\d{2}$/.test(iso || "") ? iso : isoOf(new Date());
  if (diaPaso !== dia) { mi = 0; diaPaso = dia; }
  ctx.onAfterRender(async () => {
    if (ctx.cloud.enabled && ctx.cloud.state().ready) {
      const stop = ctx.cloud.watchCanciones((r) => { songs = r; paintCantos(); }, () => {});
      ctx.onLeave(stop);
    }
    ctx.onLeave(() => document.body.classList.remove("ms-siguiendo"));
    await load(); paint();
  });
  return `<div id="misaBox"><p class="muted" style="padding:30px;text-align:center">Cargando…</p></div>`;
}

const parrafos = (t) => String(t || "").split(/\n\s*\n/).map((b) => `<p>${b.split("\n").map((l) => esc(l.trim())).filter(Boolean).join("<br>")}</p>`).join("");
// Oración de todos: las indicaciones entre corchetes van como rúbrica.
const oracion = (t) => String(t).split(/\n\s*\n/).map((b) => `<p>${b.split("\n").map((l) => /^\[.*\]$/.test(l) ? `<i class="ms-in">${esc(l.slice(1, -1))}</i>` : esc(l)).join("<br>")}</p>`).join("");
const evangelista = (d) => { const m = /según\s+(san\s+\S+)/i.exec(d?.evangelio?.cita || ""); return m ? m[1].replace(/^San/, "san") : "san N."; };
const cuaresma = () => season(dateOf(dia)).key === "cuaresma";

const LECT = { primera: "Primera lectura", salmo: "Salmo responsorial", segunda: "Segunda lectura", evangelio: "Evangelio" };
function lecturaHTML(k, d) {
  const x = d && d[k];
  if (!x) return `<div class="ms-lec ms-lec-falta"><p>Las lecturas completas de este día aún no están en la app.</p>
    <a class="btn btn-sm btn-ghost" href="https://evangeliodeldia.org/SP/gospel/${dia}" target="_blank" rel="noopener">Leerlas en evangeliodeldia.org</a></div>`;
  return `<div class="ms-lec ms-lec-${k}"><p class="ms-cita">${esc(x.cita || LECT[k])}</p><div class="ms-ltxt">${parrafos(x.texto)}</div></div>`;
}
function lineaHTML([t, a, b], d) {
  if (t === "s") return `<p class="ms-l ms-s"><span class="ms-who">S.</span><span>${esc(a)}</span></p>`;
  if (t === "l") return `<p class="ms-l ms-s"><span class="ms-who">L.</span><span>${esc(a)}</span></p>`;
  if (t === "p") return `<p class="ms-l ms-p"><span class="ms-who">Todos</span><b>${esc(a)}</b></p>`;
  if (t === "t") return `<div class="ms-l ms-t"><span class="ms-who">Todos</span><div>${oracion(a)}</div></div>`;
  if (t === "r") return `<p class="ms-rub">${esc(a)}</p>`;
  if (t === "alt") return `<details class="ms-alt"><summary>${esc(b)}</summary><div class="ms-t"><div>${oracion(a)}</div></div></details>`;
  if (t === "lec") return lecturaHTML(a, d);
  if (t === "evg") return lineaHTML(["s", `Lectura del santo Evangelio según ${evangelista(d)}`]);
  if (t === "aleluya") return cuaresma()
    ? `<p class="ms-rub">En Cuaresma no se canta el Aleluya. Aclamamos:</p>${lineaHTML(["p", "Gloria y honor a ti, Señor Jesús."])}`
    : `${lineaHTML(["p", "Aleluya, aleluya, aleluya."])}<p class="ms-rub">El salmista canta un versículo y repetimos el Aleluya.</p>`;
  return "";
}
const cantosHTML = (m) => {
  const cs = m.canto ? cantos(m.canto, dia) : [];
  return cs.length ? `<p class="ms-cantos"><span>Cantos sugeridos</span>${cs.map((x) => `<a class="chip" href="#/cancionero/${encodeURIComponent(x.id)}">${esc(x.title)}</a>`).join("")}</p>` : "";
};
function momentoHTML(m, i, d) {
  const inf = infoDe(m.info);
  return `<section class="ms-mo${i === mi ? " on" : ""}${inf.cristo ? " is-cristo" : ""}" id="ms-m-${i}" data-i="${i}">
    <header class="ms-mh"><h3>${esc(m.t)}</h3><span class="ms-post">${esc(m.postura || "")}</span></header>
    ${inf.que ? `<details class="ms-info"><summary>¿Qué pasa aquí?</summary><p>${esc(inf.que)}</p>${inf.cristo ? `<p class="ms-cr"><span>Cristo presente</span>${esc(inf.cristo)}</p>` : ""}${inf.nota ? `<p class="ms-nota">${esc(inf.nota)}</p>` : ""}</details>` : ""}
    <div class="ms-lines">${m.l.map((x) => lineaHTML(x, d)).join("")}</div>
    <div class="ms-cbox" data-m="${i}">${cantosHTML(m)}</div>
  </section>`;
}
function santos(t) { return String(t || "").split(/\s*·\s*|\s+(?=(?:San|Santa|Santo|Santos|Santas|Beato|Beata|Beatos|Beatas|Venerable|Nuestra Señora)\s)/).map((x) => x.trim()).filter(Boolean); }

function paint() {
  const box = $("#misaBox"); if (!box) return;
  const d = diaData(dia), g = (gospel?.days || {})[dia], s = season(dateOf(dia));
  const all = dias(), i = all.indexOf(dia), prev = all[i - 1], next = all[i + 1];
  const titulo = d?.titulo || g?.titulo || "Liturgia del día";
  const hoy = dia === isoOf(new Date());
  const corto = (x) => esc(cap1(dateOf(x).toLocaleDateString("es-CL", { weekday: "short", day: "numeric" })));
  const ms = momentos(dia); mi = Math.max(0, Math.min(mi, ms.length - 1));
  const santo = d?.santo ? santos(d.santo)[0] : "";
  box.innerHTML = `
  <nav class="crumbs no-print"><a href="#/oracion">Capilla</a>${icon("right")}<span>La Misa</span></nav>
  <header class="cap-arch ms-arch" style="--season:${s.hex}">
    ${caliz("ms-caliz")}
    <span class="cap-hand">${hoy ? "la Misa de hoy" : esc(cap1(largo(dia)))}</span>
    <h1 class="cap-title ms-title">${esc(titulo)}</h1>
    <div class="cap-chips"><span class="cap-season"><i></i>${esc(s.name)} · color ${esc(s.color)}</span><span class="cap-date">${esc(largo(dia))}</span></div>
    ${santo ? `<p class="ms-santo-h">Hoy recordamos a ${esc(santo)}</p>` : ""}
    <div class="ms-dias no-print">
      ${prev ? `<a class="ms-dia" href="#/misa/${prev}">${icon("left")} ${corto(prev)}</a>` : "<span></span>"}
      ${hoy ? "" : `<a class="ms-dia" href="#/misa">Hoy</a>`}
      ${next ? `<a class="ms-dia" href="#/misa/${next}">${corto(next)} ${icon("right")}</a>` : "<span></span>"}
    </div>
  </header>
  <div class="ms-bar no-print">
    <button class="ms-seguir${seguir ? " on" : ""}" data-action="msSeguir" aria-pressed="${seguir}">${icon(seguir ? "check" : "eye")} ${seguir ? "Siguiendo" : "Seguir paso a paso"}</button>
    <span class="ms-letra" role="group" aria-label="Tamaño de la letra"><button data-action="msLetra" data-d="-1" aria-label="Letra más chica">A</button><button data-action="msLetra" data-d="1" aria-label="Letra más grande">A</button></span>
    <a class="ms-bb" href="#/misa/libro/${dia}" title="Librito">${icon("book")}<span>Librito</span></a>
    <button class="ms-bb" data-action="msPdf" title="Imprimir">${icon("print")}<span>Imprimir</span></button>
  </div>
  <nav class="ms-partes-nav no-print" aria-label="Partes de la Misa">
    ${GRUPOS.map((gr, n) => `<a href="#ms-g-${gr.k}" data-action="msIr" data-id="ms-g-${gr.k}"><b>${n + 1}</b>${esc(gr.t)}</a>`).join("")}
  </nav>
  <p class="ms-leyenda"><span><i class="ms-who">S.</i> dice el sacerdote</span><span><i class="ms-who ms-wp">Todos</i> <b>respondemos todos</b></span><span><i class="ms-rub-i">en cursiva:</i> qué hacer</span></p>
  <div class="ms-flujo" style="--ms-fs:${1 + letra * 0.1}">
    ${GRUPOS.map((gr, n) => `<h2 class="ms-gh" id="ms-g-${gr.k}"><b>${n + 1}</b><span>${esc(gr.t)}<small>${esc(gr.d)}</small></span></h2>
      ${ms.map((m, j) => m.g === gr.k ? momentoHTML(m, j, d) : "").join("")}`).join("")}
    ${d ? `<p class="xs muted ms-fuente">${esc(data.fuente || "")}</p>` : ""}
  </div>
  <p class="cap-foot">«Hagan esto en memoria mía»<span>Lc 22,19</span></p>
  <div class="ms-follow no-print" id="msFollow" ${seguir ? "" : "hidden"}>
    <button class="btn btn-ghost" data-action="msPaso" data-d="-1">${icon("left")}<span>Anterior</span></button>
    <span class="ms-fnow" id="msNow"></span>
    <button class="btn btn-gold" data-action="msPaso" data-d="1"><span>Siguiente</span>${icon("right")}</button>
  </div>`;
  document.body.classList.toggle("ms-siguiendo", seguir);
  marcar(false);
}
function paintCantos() {
  const ms = momentos(dia);
  document.querySelectorAll(".ms-cbox").forEach((el) => { const m = ms[+el.dataset.m]; if (m) el.innerHTML = cantosHTML(m); });
}
// Destaca el momento actual y lo trae a la vista.
function marcar(scroll = true) {
  const ms = momentos(dia);
  document.querySelectorAll(".ms-mo").forEach((el) => el.classList.toggle("on", seguir && +el.dataset.i === mi));
  const now = $("#msNow");
  if (now) now.innerHTML = `<small>${mi + 1} de ${ms.length}</small>${esc(ms[mi]?.t || "")}`;
  const p = $("#msFollow");
  if (p) { p.querySelector("[data-d='-1']").disabled = mi <= 0; p.querySelector("[data-d='1']").disabled = mi >= ms.length - 1; }
  if (scroll && seguir) { const el = document.getElementById("ms-m-" + mi); if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - topOff(), behavior: "smooth" }); }
}

// Cuánto tapa arriba la barra fija, para que el título del momento quede a la vista.
const topOff = () => { const b = $(".ms-bar"); return b ? b.getBoundingClientRect().bottom + 10 : 80; };

// Un cáliz con la Hostia, en línea, como la lira de los Salmos.
function caliz(cls) {
  return `<svg class="${cls}" viewBox="0 0 120 120" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <circle class="mc-host" cx="60" cy="26" r="15"/><path class="mc-host" d="M60 17 V35 M51 26 H69" stroke-width="2.6"/>
    <path d="M30 48 H90 C 90 70, 78 84, 60 86 C 42 84, 30 70, 30 48 Z"/><path d="M60 86 V100 M44 108 C 46 102, 52 100, 60 100 C 68 100, 74 102, 76 108 Z"/>
    <path d="M18 30 l-6 -4 M102 30 l6 -4 M24 16 l-4 -6 M96 16 l4 -6" stroke-width="2.6"/></svg>`;
}

// ---------------------------------------------------------------------------
// Librito  (#/misa/libro/AAAA-MM-DD) y PDF
// ---------------------------------------------------------------------------
let book = null;
export function viewLibro(iso) {
  dia = /^\d{4}-\d{2}-\d{2}$/.test(iso || "") ? iso : isoOf(new Date());
  ctx.onAfterRender(async () => {
    if (ctx.cloud.enabled && ctx.cloud.state().ready) { const stop = ctx.cloud.watchCanciones((r) => { songs = r; }, () => {}); ctx.onLeave(stop); }
    await load(); buildLibro();
  });
  return `
  <nav class="crumbs no-print"><a href="#/oracion">Capilla</a>${icon("right")}<a href="#/misa/${dia}">La Misa</a>${icon("right")}<span>Librito</span></nav>
  <div class="cl-bar" role="toolbar" aria-label="Opciones del libro">
    <button class="btn btn-sm btn-ghost" data-action="msLGo" data-p="1">${icon("grid")} Índice</button>
    <span class="cl-nav"><button class="icon-btn ms-turn" data-action="msLTurn" data-d="-1" aria-label="Página anterior">${icon("left")}</button>
      <span class="cl-pg" id="msLPg" aria-live="polite"></span>
      <button class="icon-btn ms-turn" data-action="msLTurn" data-d="1" aria-label="Página siguiente">${icon("right")}</button></span>
    <span class="spacer"></span>
    <button class="btn btn-sm btn-ghost" data-action="msPdf">${icon("print")} PDF</button>
  </div>
  <div class="cl-wrap"><div class="cl-stage" id="msLibroSt" aria-roledescription="libro"></div></div>
  <p class="xs muted cl-help">Desliza la página o toca sus bordes para avanzar. En el computador, usa las flechas del teclado.</p>`;
}
function portada(n) {
  const d = diaData(dia), g = (gospel?.days || {})[dia];
  const rays = [...Array(24)].map((_, i) => { const a = (Math.PI * 2 * i) / 24, r1 = 58, r2 = i % 2 ? 78 : 92;
    return `<path d="M${(100 + Math.cos(a) * r1).toFixed(1)} ${(100 + Math.sin(a) * r1).toFixed(1)} L${(100 + Math.cos(a) * r2).toFixed(1)} ${(100 + Math.sin(a) * r2).toFixed(1)}"/>`; }).join("");
  return `<div class="cl-page cl-cover"><div class="cl-cov">
    <span class="cl-cov-spine" aria-hidden="true"></span><span class="cl-cov-frame" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span class="cl-cov-ribbon" aria-hidden="true"></span>
    <span class="cl-cov-k">Pastoral Juvenil Ágape · Yungay</span>
    <div class="cl-cov-medal"><svg class="cl-cov-rays" viewBox="0 0 200 200" aria-hidden="true">${rays}</svg><img src="icons/logo-320.webp" alt="" width="320" height="320"></div>
    <h2><span>La Santa</span><em>Misa</em></h2>
    ${caliz("ms-cov-caliz")}
    <div class="cl-cov-foot">
      <p class="cl-cov-v">${esc(d?.titulo || g?.titulo || "")}</p>
      ${n ? `<button class="cl-cov-go" data-action="msLGo" data-p="1">Abrir el índice ${icon("arrowR")}</button>` : ""}
      <p class="cl-cov-n">${esc(cap1(largo(dia)))}</p>
    </div></div></div>`;
}
// Bloques del librito: la Misa en orden, con las lecturas en su lugar. Las oraciones largas se
// cortan en trozos para que el libro pueda pasar de página entre ellos.
function bloques() {
  const d = diaData(dia), out = [];
  const trozos = (t, n = 9) => { const ls = String(t).split("\n").filter((x) => x.trim()); const r = []; for (let i = 0; i < ls.length; i += n) r.push(ls.slice(i, i + n)); return r; };
  const lin = (l) => /^\[.*\]$/.test(l) ? `<i class="ml-in">${esc(l.slice(1, -1))}</i>` : esc(l);
  const linea = ([t, a, b]) => {
    if (t === "s" || t === "l") return [`<p class="ml-s"><i>${t === "s" ? "S." : "L."}</i> ${esc(a)}</p>`];
    if (t === "p") return [`<p class="ml-r"><i>Todos:</i> <b>${esc(a)}</b></p>`];
    if (t === "t") return trozos(a).map((ls, i) => `<p class="ml-o">${i ? "" : "<i>Todos:</i><br>"}${ls.map(lin).join("<br>")}</p>`);
    if (t === "r") return [`<p class="ml-rub">${esc(a)}</p>`];
    if (t === "alt") return [`<p class="ml-rub">${esc(b)}:</p>`, ...trozos(a).map((ls) => `<p class="ml-o ml-o2">${ls.map(lin).join("<br>")}</p>`)];
    if (t === "evg") return linea(["s", `Lectura del santo Evangelio según ${evangelista(d)}`]);
    if (t === "aleluya") return cuaresma() ? [`<p class="ml-rub">En Cuaresma no se canta el Aleluya.</p>`, ...linea(["p", "Gloria y honor a ti, Señor Jesús."])] : linea(["p", "Aleluya, aleluya, aleluya."]);
    if (t === "lec") {
      const x = d && d[a];
      if (!x) return [`<p class="ml-rub">Las lecturas de este día aún no están en la app.</p>`];
      return [`<p class="ml-t">${esc(x.cita || LECT[a])}</p>`, ...String(x.texto || "").split(/\n\s*\n/).flatMap((b2) => trozos(b2, 6).map((ls) => `<p class="ml-p">${ls.map((y) => esc(y.trim())).join("<br>")}</p>`))];
    }
    return [];
  };
  const ms = momentos(dia);
  GRUPOS.forEach((gr, gi) => {
    out.push({ html: `<h3 class="ml-h" data-sec="${esc(gr.t)}">${gi + 1}. ${esc(gr.t)}</h3>` });
    ms.filter((m) => m.g === gr.k).forEach((m) => {
      out.push({ html: `<p class="ml-pt">${esc(m.t)}${m.postura ? ` <span>${esc(m.postura)}</span>` : ""}</p>` });
      m.l.forEach((x) => linea(x).forEach((h) => out.push({ html: h })));
      const cs = m.canto ? cantos(m.canto, dia) : [];
      if (cs.length) out.push({ html: `<p class="ml-c">Cantos: ${cs.map((s) => esc(s.title)).join(" · ")}</p>` });
    });
  });
  return out;
}
const pageOf = ({ head = "", body = "", foot = "" }) => `<div class="cl-page ml-page"><div class="cl-in">${head}<div class="cl-body">${body}</div></div>${foot ? `<div class="cl-foot">${foot}</div>` : ""}</div>`;
const footOf = (l, n, r = "") => `<span class="cl-f-l">${l}</span><span class="cl-f-n">${n}</span><span class="cl-f-r">${r}</span>`;
function buildLibro() {
  const stage = document.getElementById("msLibroSt"); if (!stage) return;
  if (!book) book = createBook({ stage: "msLibroSt", label: "msLPg", key: "agape_misa_libro", buttons: ".ms-turn" });
  const bl = bloques();
  const m = document.createElement("div"); m.className = "cl-leaf cl-measure"; stage.appendChild(m);
  m.innerHTML = pageOf({ body: bl.map((b) => b.html).join(""), foot: footOf("x", 0) });
  const body = m.querySelector(".cl-body");
  const parts = splitByHeight([...body.children], body.clientHeight, body.clientHeight, (el) => el.classList.contains("ml-h") || el.classList.contains("ml-pt") || el.classList.contains("ml-t"));
  // índice: en qué página empieza cada sección (su título lleva data-sec)
  const kids = [...body.children], secPage = {};
  kids.forEach((el, n) => { if (el.dataset.sec) secPage[el.dataset.sec] = parts.findIndex(([a, z]) => n >= a && n < z); });
  m.remove();
  const off = 2;
  const pages = [{ k: "cover", html: portada(1) }];
  pages.push({ k: "ix", html: pageOf({ head: `<header class="cl-head"><span class="eyebrow">La Santa Misa</span><h2>Índice</h2></header>`,
    body: Object.entries(secPage).map(([t, pi]) => `<button class="cl-ix" data-action="msLGo" data-p="${off + pi}"><span class="cl-ix-t">${esc(t)}</span><span class="cl-ix-d" aria-hidden="true"></span><span class="cl-ix-n">${off + pi}</span></button>`).join("")
      + `<p class="ml-rub" style="margin-top:1em"><i>S.</i> dice el sacerdote · <b>en negrita</b>, respondemos todos · en cursiva, qué hacer.</p>`,
    foot: footOf("", 1) }) });
  parts.forEach(([a, z], i) => pages.push({ k: "p" + i, html: pageOf({ body: kids.slice(a, z).map((x) => x.outerHTML).join(""), foot: footOf(`<button class="cl-f-ix" data-action="msLGo" data-p="1">Índice</button>`, off + i) }) }));
  book.setPages(pages, 0);
}

function pdf() {
  if (!data) { toast("Cargando… intenta de nuevo en un momento", ""); return; }
  let el = document.getElementById("misaBook");
  if (!el) { el = document.createElement("div"); el.id = "misaBook"; document.body.appendChild(el); }
  el.innerHTML = `<section class="sb-cover">${portada(0)}</section><section class="mb-body"><p class="ml-rub"><i>S.</i> dice el sacerdote · <b>en negrita</b>, respondemos todos · en cursiva, qué hacer.</p>${bloques().map((b) => b.html).join("")}</section>
    <p class="sb-fuente">${esc(data.fuente || "")} · Textos de la Misa: Misal Romano.</p>`;
  document.body.classList.add("misa-printing");
  const done = () => { document.body.classList.remove("misa-printing"); window.removeEventListener("afterprint", done); };
  window.addEventListener("afterprint", done);
  setTimeout(() => window.print(), 300);
}

function registerActions() {
  const A = ctx.actions;
  A.msPdf = () => pdf();
  A.msSeguir = () => {
    seguir = !seguir; store.set("agape_misa_seguir", seguir);
    paint(); if (seguir) marcar(true);
  };
  A.msLetra = (el) => { letra = Math.max(-1, Math.min(4, letra + +el.dataset.d)); store.set("agape_misa_letra", letra); $(".ms-flujo")?.style.setProperty("--ms-fs", 1 + letra * 0.1); };
  A.msPaso = (el) => { const n = momentos(dia).length; mi = Math.max(0, Math.min(n - 1, mi + +el.dataset.d)); marcar(true); };
  A.msIr = (el, e) => { e && e.preventDefault && e.preventDefault(); const t = document.getElementById(el.dataset.id); if (t) window.scrollTo({ top: t.getBoundingClientRect().top + window.scrollY - topOff(), behavior: "smooth" }); };
  // En modo «seguir», tocar un momento lo marca como el actual.
  document.addEventListener("click", (e) => {
    if (!seguir) return;
    const sec = e.target.closest && e.target.closest(".ms-mo");
    if (!sec || e.target.closest("a, button, summary, details[open] > *:not(summary)")) return;
    mi = +sec.dataset.i; marcar(false);
  });
  document.addEventListener("keydown", (e) => {
    if (!seguir || !$(".ms-flujo") || /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || "")) return;
    const d = ["ArrowRight", "PageDown", "MediaTrackNext"].includes(e.key) ? 1 : ["ArrowLeft", "PageUp", "MediaTrackPrevious"].includes(e.key) ? -1 : 0;
    if (d) { e.preventDefault(); const n = momentos(dia).length; mi = Math.max(0, Math.min(n - 1, mi + d)); marcar(true); }
  });
  A.msLTurn = (el) => book && book.turn(+el.dataset.d);
  A.msLGo = (el) => book && book.go(+el.dataset.p);
  let rz = 0; window.addEventListener("resize", () => { if (document.getElementById("msLibroSt")) { clearTimeout(rz); rz = setTimeout(buildLibro, 200); } });
}
