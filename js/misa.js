// La Misa de hoy: la liturgia del día (lecturas completas, santo, tiempo litúrgico) y la Misa
// paso a paso (qué pasa, Cristo presente, qué hace el sacerdote, qué hacemos, cantos sugeridos).
// Se lee en la app, se hojea como librito y se imprime en PDF.

import { esc, icon, toast, fetchJSON } from "./util.js";
import { season } from "./capilla.js";
import { GRUPOS, PARTES } from "./misa-partes.js";
import { createBook, splitByHeight } from "./libro.js";
import { songList } from "./cancionero.js";

let ctx = null; // { actions, render, onAfterRender, onLeave, cloud }
export function setup(c) { ctx = c; registerActions(); }
const $ = (s, r = document) => r.querySelector(s);

const isoOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const dateOf = (iso) => new Date(iso + "T12:00");
const largo = (iso) => dateOf(iso).toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" });
const cap1 = (t) => t.charAt(0).toUpperCase() + t.slice(1);

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

// ---------------------------------------------------------------------------
// Vista  (#/misa  o  #/misa/AAAA-MM-DD)
// ---------------------------------------------------------------------------
export function view(iso) {
  dia = /^\d{4}-\d{2}-\d{2}$/.test(iso || "") ? iso : isoOf(new Date());
  ctx.onAfterRender(async () => {
    if (ctx.cloud.enabled && ctx.cloud.state().ready) {
      const stop = ctx.cloud.watchCanciones((r) => { songs = r; paint(); }, () => {});
      ctx.onLeave(stop);
    }
    await load(); paint();
  });
  return `<div id="misaBox"><p class="muted" style="padding:30px;text-align:center">Cargando…</p></div>`;
}
const LECT = [["primera", "Primera lectura"], ["salmo", "Salmo responsorial"], ["segunda", "Segunda lectura"], ["evangelio", "Evangelio"]];
function textoLectura(t, salmo) {
  return String(t || "").split(/\n\s*\n/).map((b) => `<p>${b.split("\n").map((l) => {
    const x = esc(l.trim());
    return salmo && /^R\.?\s*[\/.]?\s*/.test(l.trim()) ? `<b class="ms-r">${x}</b>` : x;
  }).filter(Boolean).join("<br>")}</p>`).join("");
}
function paint() {
  const box = $("#misaBox"); if (!box) return;
  const d = diaData(dia), g = (gospel?.days || {})[dia], s = season(dateOf(dia));
  const all = dias(), i = all.indexOf(dia), prev = all[i - 1], next = all[i + 1];
  const titulo = d?.titulo || g?.titulo || "Liturgia del día";
  const hoy = dia === isoOf(new Date());
  box.innerHTML = `
  <nav class="crumbs no-print"><a href="#/oracion">Capilla</a>${icon("right")}<span>La Misa de ${hoy ? "hoy" : "cada día"}</span></nav>
  <section class="cap-hero ms-hero" style="--season:${s.hex}">
    <div class="cap-arch">
      ${caliz("ms-caliz")}
      <span class="cap-hand">${hoy ? "la Misa de hoy" : esc(cap1(largo(dia)))}</span>
      <h1 class="cap-title ms-title">${esc(titulo)}</h1>
      <div class="cap-chips"><span class="cap-season"><i></i>${esc(s.name)} · color ${esc(s.color)}</span><span class="cap-date">${esc(largo(dia))}</span></div>
      <div class="ms-dias no-print">
        ${prev ? `<a class="ms-dia" href="#/misa/${prev}">${icon("left")} ${esc(cap1(dateOf(prev).toLocaleDateString("es-CL", { weekday: "short", day: "numeric" })))}</a>` : "<span></span>"}
        ${hoy ? "" : `<a class="ms-dia" href="#/misa">Hoy</a>`}
        ${next ? `<a class="ms-dia" href="#/misa/${next}">${esc(cap1(dateOf(next).toLocaleDateString("es-CL", { weekday: "short", day: "numeric" })))} ${icon("right")}</a>` : "<span></span>"}
      </div>
    </div>
    <div class="cap-moment ms-libro">
      <span class="eyebrow">Para llevar a la Misa</span>
      <span class="cap-hand sm">el librito</span>
      <p>Las lecturas de este día y la Misa paso a paso, para hojear en el teléfono o imprimir y entregar en una Misa juvenil.</p>
      <div class="cap-moment-btns">
        <a class="btn cap-oremus" href="#/misa/libro/${dia}">${icon("book")} Hojear el librito</a>
        <button class="btn cap-oremus" data-action="msPdf">${icon("print")} Imprimir</button>
      </div>
    </div>
  </section>

  <section class="cap-room" id="ms-lecturas">
    <div class="cap-room-head"><h2>Las lecturas <em>de ${hoy ? "hoy" : "este día"}</em></h2></div>
    ${d?.santo ? `<p class="ms-santo"><b>Santo del día:</b> ${esc(d.santo)}</p>` : ""}
    ${d ? `<div class="ms-lects">${LECT.filter(([k]) => d[k]).map(([k, l], n) => `<details class="ms-lect" ${n === 0 && !d.primera ? "open" : ""}${k === "evangelio" ? " open" : ""}>
        <summary><span class="ms-lk">${l}</span><b>${esc(d[k].cita || "")}</b>${icon("down")}</summary>
        <div class="ms-ltxt">${textoLectura(d[k].texto, k === "salmo")}
          <p class="ms-resp">${k === "evangelio" ? "Palabra del Señor. <b>Gloria a ti, Señor Jesús.</b>" : k === "salmo" ? "" : "Palabra de Dios. <b>Te alabamos, Señor.</b>"}</p></div></details>`).join("")}</div>
      <p class="xs muted ms-fuente">${esc(data.fuente || "")}</p>`
      : g ? `<div class="card ms-falta"><p>Evangelio: <b>${esc(g.cita)}</b>. ${g.frase ? `«${esc(g.frase)}»` : ""}</p><p class="small muted">Las lecturas completas de este día aún no están disponibles en la app.</p>
          <a class="btn btn-sm btn-ghost" href="https://evangeliodeldia.org/SP/gospel/${dia}" target="_blank" rel="noopener">Leer las lecturas en evangeliodeldia.org</a></div>`
      : `<div class="card ms-falta"><p class="muted">Aún no tenemos la liturgia de este día.</p></div>`}
  </section>

  <section class="cap-room" id="ms-pasos">
    <div class="cap-room-head"><h2>La Misa <em>paso a paso</em></h2></div>
    <p class="cap-lead">Qué está pasando en cada momento, dónde está Cristo presente, qué hace el sacerdote y qué hacemos nosotros. Toca cada parte para abrirla.</p>
    <div class="ms-cristo card"><b>Cristo está presente en la Misa de cuatro maneras:</b> en la comunidad reunida, en el sacerdote que actúa en su nombre, en su Palabra y, sobre todo, en el pan y el vino consagrados, que son su Cuerpo y su Sangre (Concilio Vaticano II, Sacrosanctum Concilium 7).</div>
    ${GRUPOS.map((gr, gi) => `<div class="ms-grupo"><h3><span>${gi + 1}</span>${esc(gr.t)}</h3><p class="ms-gd">${esc(gr.d)}</p>
      <div class="ms-partes">${PARTES.filter((p) => p.g === gr.k).map((p) => parteHTML(p, d)).join("")}</div></div>`).join("")}
  </section>
  <p class="cap-foot">«Hagan esto en memoria mía»<span>Lc 22,19</span></p>`;
}
function parteHTML(p, d) {
  if (p.lectura === "segunda" && d && !d.segunda) return "";
  const cs = p.canto ? cantos(p.canto, dia) : [];
  const lec = p.lectura && d && d[p.lectura] ? `<a class="ms-cita" href="#ms-lecturas">${esc(d[p.lectura].cita)}</a>` : "";
  return `<details class="ms-parte${p.cristo ? " is-cristo" : ""}">
    <summary><span class="ms-pt">${esc(p.t)}</span>${lec}<span class="ms-post">${esc(p.postura || "")}</span>${icon("down")}</summary>
    <div class="ms-pin">
      <p>${esc(p.que)}</p>
      ${p.cristo ? `<p class="ms-cr"><span>Cristo presente</span>${esc(p.cristo)}</p>` : ""}
      <p><b>El sacerdote:</b> ${esc(p.sacerdote)}</p>
      <p><b>Nosotros:</b> ${esc(p.nosotros)}</p>
      ${p.nota ? `<p class="ms-nota">${esc(p.nota)}</p>` : ""}
      ${cs.length ? `<p class="ms-cantos"><b>Cantos sugeridos:</b> ${cs.map((s) => `<a href="#/cancionero/${encodeURIComponent(s.id)}">${esc(s.title)}</a>`).join(" · ")}</p>` : ""}
    </div></details>`;
}
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
// Bloques del librito: las lecturas y cada parte de la Misa, en orden.
function bloques() {
  const d = diaData(dia), out = [];
  out.push({ html: `<h3 class="ml-h" data-sec="Las lecturas">Las lecturas</h3>${d?.santo ? `<p class="ml-santo">${esc(d.santo)}</p>` : ""}` });
  if (d) LECT.filter(([k]) => d[k]).forEach(([k, l]) => {
    out.push({ html: `<p class="ml-k">${l}</p><p class="ml-t">${esc(d[k].cita || "")}</p>` });
    String(d[k].texto || "").split(/\n\s*\n/).forEach((b) => out.push({ html: `<p class="ml-p">${b.split("\n").map((x) => esc(x.trim())).filter(Boolean).join("<br>")}</p>` }));
  });
  else out.push({ html: `<p class="ml-p">Las lecturas de este día aún no están disponibles en la app.</p>` });
  GRUPOS.forEach((gr, gi) => {
    out.push({ html: `<h3 class="ml-h" data-sec="${esc(gr.t)}">${gi + 1}. ${esc(gr.t)}</h3><p class="ml-gd">${esc(gr.d)}</p>` });
    PARTES.filter((p) => p.g === gr.k && !(p.lectura === "segunda" && d && !d.segunda)).forEach((p) => {
      const cs = p.canto ? cantos(p.canto, dia) : [];
      out.push({ html: `<div class="ml-parte"><p class="ml-pt">${esc(p.t)}${p.postura ? ` <span>${esc(p.postura)}</span>` : ""}</p><p class="ml-p">${esc(p.que)}</p>
        ${p.cristo ? `<p class="ml-cr">${esc(p.cristo)}</p>` : ""}<p class="ml-p"><b>Nosotros:</b> ${esc(p.nosotros)}</p>
        ${cs.length ? `<p class="ml-c">Cantos: ${cs.map((s) => esc(s.title)).join(" · ")}</p>` : ""}</div>` });
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
  const parts = splitByHeight([...body.children], body.clientHeight, body.clientHeight, (el) => el.classList.contains("ml-h") || el.classList.contains("ml-k"));
  // índice: en qué página empieza cada sección (su título lleva data-sec)
  const kids = [...body.children], secPage = {};
  kids.forEach((el, n) => { if (el.dataset.sec) secPage[el.dataset.sec] = parts.findIndex(([a, z]) => n >= a && n < z); });
  m.remove();
  const off = 2;
  const pages = [{ k: "cover", html: portada(1) }];
  pages.push({ k: "ix", html: pageOf({ head: `<header class="cl-head"><span class="eyebrow">La Santa Misa</span><h2>Índice</h2></header>`,
    body: Object.entries(secPage).map(([t, pi]) => `<button class="cl-ix" data-action="msLGo" data-p="${off + pi}"><span class="cl-ix-t">${esc(t)}</span><span class="cl-ix-d" aria-hidden="true"></span><span class="cl-ix-n">${off + pi}</span></button>`).join(""),
    foot: footOf("", 1) }) });
  parts.forEach(([a, z], i) => pages.push({ k: "p" + i, html: pageOf({ body: kids.slice(a, z).map((x) => x.outerHTML).join(""), foot: footOf(`<button class="cl-f-ix" data-action="msLGo" data-p="1">Índice</button>`, off + i) }) }));
  book.setPages(pages, 0);
}

function pdf() {
  if (!data) { toast("Cargando… intenta de nuevo en un momento", ""); return; }
  let el = document.getElementById("misaBook");
  if (!el) { el = document.createElement("div"); el.id = "misaBook"; document.body.appendChild(el); }
  el.innerHTML = `<section class="sb-cover">${portada(0)}</section><section class="mb-body">${bloques().map((b) => b.html).join("")}</section>
    <p class="sb-fuente">${esc(data.fuente || "")} · La Misa paso a paso: Pastoral Juvenil Ágape.</p>`;
  document.body.classList.add("misa-printing");
  const done = () => { document.body.classList.remove("misa-printing"); window.removeEventListener("afterprint", done); };
  window.addEventListener("afterprint", done);
  setTimeout(() => window.print(), 300);
}

function registerActions() {
  const A = ctx.actions;
  A.msPdf = () => pdf();
  A.msLTurn = (el) => book && book.turn(+el.dataset.d);
  A.msLGo = (el) => book && book.go(+el.dataset.p);
  let rz = 0; window.addEventListener("resize", () => { if (document.getElementById("msLibroSt")) { clearTimeout(rz); rz = setTimeout(buildLibro, 200); } });
}
