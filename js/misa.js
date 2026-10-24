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
let mtab = "pasos", mstep = 0;
const momentos = (d) => PARTES.filter((p) => !(p.lectura === "segunda" && d && !d.segunda));
// Las respuestas del pueblo (entre «») se destacan.
const conResp = (t) => esc(t).replace(/«([^»]+)»/g, '<b class="ms-q">«$1»</b>');
function paint() {
  const box = $("#misaBox"); if (!box) return;
  const d = diaData(dia), g = (gospel?.days || {})[dia], s = season(dateOf(dia));
  const all = dias(), i = all.indexOf(dia), prev = all[i - 1], next = all[i + 1];
  const titulo = d?.titulo || g?.titulo || "Liturgia del día";
  const hoy = dia === isoOf(new Date());
  const corto = (x) => esc(cap1(dateOf(x).toLocaleDateString("es-CL", { weekday: "short", day: "numeric" })));
  box.innerHTML = `
  <nav class="crumbs no-print"><a href="#/oracion">Capilla</a>${icon("right")}<span>La Misa</span></nav>
  <header class="cap-arch ms-arch" style="--season:${s.hex}">
    ${caliz("ms-caliz")}
    <span class="cap-hand">${hoy ? "la Misa de hoy" : esc(cap1(largo(dia)))}</span>
    <h1 class="cap-title ms-title">${esc(titulo)}</h1>
    <div class="cap-chips"><span class="cap-season"><i></i>${esc(s.name)} · color ${esc(s.color)}</span><span class="cap-date">${esc(largo(dia))}</span></div>
    <div class="ms-dias no-print">
      ${prev ? `<a class="ms-dia" href="#/misa/${prev}">${icon("left")} ${corto(prev)}</a>` : "<span></span>"}
      ${hoy ? "" : `<a class="ms-dia" href="#/misa">Hoy</a>`}
      ${next ? `<a class="ms-dia" href="#/misa/${next}">${corto(next)} ${icon("right")}</a>` : "<span></span>"}
    </div>
  </header>
  <div class="ms-tabs" role="tablist" aria-label="La Misa">
    <button role="tab" aria-selected="${mtab === "pasos"}" data-action="msTab" data-t="pasos"><b>1</b> <span>La Misa paso a paso</span></button>
    <button role="tab" aria-selected="${mtab === "lecturas"}" data-action="msTab" data-t="lecturas"><b>2</b> <span>Las lecturas de ${hoy ? "hoy" : "este día"}</span></button>
    <button role="tab" aria-selected="${mtab === "libro"}" data-action="msTab" data-t="libro"><b>3</b> <span>El librito</span></button>
  </div>
  <div id="msPanel">${mtab === "lecturas" ? lecturasHTML(d, g, hoy) : mtab === "libro" ? libroHTML() : pasosHTML(d)}</div>
  <p class="cap-foot">«Hagan esto en memoria mía»<span>Lc 22,19</span></p>`;
}
function lecturasHTML(d, g, hoy) {
  if (!d) return g ? `<div class="card ms-falta"><p>Evangelio: <b>${esc(g.cita)}</b>. ${g.frase ? `«${esc(g.frase)}»` : ""}</p><p class="small muted">Las lecturas completas de este día aún no están disponibles en la app.</p>
      <a class="btn btn-sm btn-ghost" href="https://evangeliodeldia.org/SP/gospel/${dia}" target="_blank" rel="noopener">Leer las lecturas en evangeliodeldia.org</a></div>`
    : `<div class="card ms-falta"><p class="muted">Aún no tenemos la liturgia de este día.</p></div>`;
  const ls = LECT.filter(([k]) => d[k]);
  return `<p class="ms-intro">Son las lecturas que se proclaman ${hoy ? "hoy" : "este día"} en todas las Misas del mundo. Léelas antes de ir: así llegas sabiendo lo que Dios te quiere decir.</p>
    ${d.santo ? santoHTML(d.santo) : ""}
    <ol class="ms-indice">${ls.map(([k, l], n) => `<li><a href="#ms-l-${k}" data-action="msIr" data-id="ms-l-${k}"><b>${n + 1}</b>${l}<small>${esc(d[k].cita || "")}</small></a></li>`).join("")}</ol>
    ${ls.map(([k, l], n) => `<article class="ms-lec ms-lec-${k}" id="ms-l-${k}">
      <header><span class="ms-ln">${n + 1}</span><div><span class="ms-lk">${l}</span><h3>${esc(d[k].cita || "")}</h3></div></header>
      <div class="ms-ltxt">${textoLectura(d[k].texto, k === "salmo")}</div>
      ${k === "salmo" ? "" : `<p class="ms-resp">${k === "evangelio" ? "Palabra del Señor. <b>— Gloria a ti, Señor Jesús.</b>" : "Palabra de Dios. <b>— Te alabamos, Señor.</b>"}</p>`}
    </article>`).join("")}
    <p class="xs muted ms-fuente">${esc(data.fuente || "")}</p>`;
}
// La fuente trae todos los santos del día seguidos: se muestra el principal y se cuentan los demás.
function santos(t) { return String(t || "").split(/\s*·\s*|\s+(?=(?:San|Santa|Santo|Santos|Santas|Beato|Beata|Beatos|Beatas|Venerable|Nuestra Señora)\s)/).map((x) => x.trim()).filter(Boolean); }
function santoHTML(t) { const l = santos(t); return `<p class="ms-santo"><span>Santo del día</span>${esc(l[0] || "")}${l.length > 1 ? ` <small>· y ${l.length - 1} santo${l.length > 2 ? "s" : ""} más</small>` : ""}</p>`; }
function libroHTML() {
  return `<div class="ms-libro-tab">
    <div class="card ms-lb"><span class="cap-hand sm">para el teléfono</span><h3>Hojear el librito</h3><p>La portada, las lecturas de este día y la Misa paso a paso, página por página.</p>
      <a class="btn btn-primary" href="#/misa/libro/${dia}">${icon("book")} Abrir el librito</a></div>
    <div class="card ms-lb"><span class="cap-hand sm">para una Misa juvenil</span><h3>Imprimir</h3><p>En hoja carta, a dos columnas, con los cantos sugeridos. Se puede entregar a cada joven al llegar.</p>
      <button class="btn btn-gold" data-action="msPdf">${icon("print")} Imprimir o guardar PDF</button></div>
  </div>`;
}
function pasosHTML(d) {
  const ms = momentos(d);
  mstep = Math.max(0, Math.min(mstep, ms.length - 1));
  const p = ms[mstep], gi = GRUPOS.findIndex((g) => g.k === p.g), gr = GRUPOS[gi];
  const inG = ms.filter((x) => x.g === p.g), posG = inG.indexOf(p) + 1;
  const cs = p.canto ? cantos(p.canto, dia) : [];
  const lec = p.lectura && d && d[p.lectura];
  const prev = ms[mstep - 1], next = ms[mstep + 1];
  return `
  <div class="ms-mapa" role="list" aria-label="Las cinco partes de la Misa">
    ${GRUPOS.map((g, n) => `<button role="listitem" class="ms-m ${n === gi ? "on" : n < gi ? "ok" : ""}" data-action="msParte" data-g="${g.k}"><b>${n + 1}</b><span>${esc(g.t)}</span></button>`).join("")}
  </div>
  <div class="ms-prog" aria-hidden="true"><i style="width:${Math.round(((mstep + 1) / ms.length) * 100)}%"></i></div>
  <article class="ms-card${p.cristo ? " is-cristo" : ""}" aria-live="polite">
    <header class="ms-ch">
      <span class="ms-parte-n">Parte ${gi + 1} · ${esc(gr.t)} · ${posG} de ${inG.length}</span>
      <h2>${esc(p.t)}</h2>
      <span class="ms-post">${esc(p.postura || "")}</span>
    </header>
    ${posG === 1 ? `<p class="ms-gd">${esc(gr.d)}</p>` : ""}
    <section class="ms-que"><h3>¿Qué está pasando?</h3><p>${esc(p.que)}</p></section>
    ${p.cristo ? `<section class="ms-cr"><h3>Cristo presente</h3><p>${esc(p.cristo)}</p></section>` : ""}
    <div class="ms-dos">
      <section class="ms-quien"><h3>El sacerdote</h3><p>${conResp(p.sacerdote)}</p></section>
      <section class="ms-quien ms-nos"><h3>Nosotros</h3><p>${conResp(p.nosotros)}</p></section>
    </div>
    ${p.nota ? `<p class="ms-nota">${esc(p.nota)}</p>` : ""}
    ${lec ? `<p class="ms-lecbtn"><button class="btn btn-sm btn-soft" data-action="msLeer" data-k="${p.lectura}">${icon("book")} Leer la lectura de hoy: ${esc(lec.cita)}</button></p>` : ""}
    ${cs.length ? `<div class="ms-cantos"><h3>Cantos sugeridos</h3><div>${cs.map((x) => `<a class="chip" href="#/cancionero/${encodeURIComponent(x.id)}">${esc(x.title)}</a>`).join("")}</div></div>` : ""}
  </article>
  <div class="ms-nav">
    <button class="btn btn-ghost" data-action="msPaso" data-d="-1" ${prev ? "" : "disabled"}>${icon("left")} <span class="ms-nx">${prev ? esc(prev.t) : "Anterior"}</span><span class="ms-nc">Anterior</span></button>
    <span class="ms-cnt">${mstep + 1} / ${ms.length}</span>
    <button class="btn btn-gold" data-action="msPaso" data-d="1" ${next ? "" : "disabled"}><span class="ms-nx">${next ? esc(next.t) : "Fin"}</span><span class="ms-nc">${next ? "Siguiente" : "Fin"}</span> ${icon("right")}</button>
  </div>
  <details class="ms-todo"><summary>Ver todos los momentos de la Misa</summary>
    ${GRUPOS.map((g, n) => `<div class="ms-tg"><h4><b>${n + 1}</b>${esc(g.t)}</h4><ol>${ms.filter((x) => x.g === g.k).map((x) => `<li><button data-action="msIrPaso" data-i="${ms.indexOf(x)}" class="${x === p ? "on" : ""}">${esc(x.t)}${x.cristo ? ' <span class="ms-dot" title="Cristo presente"></span>' : ""}</button></li>`).join("")}</ol></div>`).join("")}
    <p class="ms-cristo"><b>Cristo está presente en la Misa de cuatro maneras:</b> en la comunidad reunida, en el sacerdote, en su Palabra y, sobre todo, en el pan y el vino consagrados (Concilio Vaticano II, Sacrosanctum Concilium 7). Los momentos con punto dorado lo destacan.</p>
  </details>`;
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
  out.push({ html: `<h3 class="ml-h" data-sec="Las lecturas">Las lecturas</h3>${d?.santo ? `<p class="ml-santo">Santo del día: ${esc(santos(d.santo)[0] || "")}</p>` : ""}` });
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
  A.msTab = (el) => { mtab = el.dataset.t; paint(); };
  A.msPaso = (el) => { mstep += +el.dataset.d; paint(); $(".ms-mapa")?.scrollIntoView({ block: "start", behavior: "smooth" }); };
  A.msIrPaso = (el) => { mstep = +el.dataset.i; paint(); $(".ms-mapa")?.scrollIntoView({ block: "start", behavior: "smooth" }); };
  A.msParte = (el) => { const ms = momentos(diaData(dia)); mstep = Math.max(0, ms.findIndex((x) => x.g === el.dataset.g)); paint(); };
  A.msLeer = (el) => { mtab = "lecturas"; paint(); setTimeout(() => document.getElementById("ms-l-" + el.dataset.k)?.scrollIntoView({ block: "start", behavior: "smooth" }), 50); };
  A.msIr = (el, e) => { e && e.preventDefault && e.preventDefault(); document.getElementById(el.dataset.id)?.scrollIntoView({ block: "start", behavior: "smooth" }); };
  document.addEventListener("keydown", (e) => {
    if (mtab !== "pasos" || !$(".ms-card") || /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || "")) return;
    if (e.key === "ArrowRight") { const b = $("[data-action=msPaso][data-d='1']"); if (b && !b.disabled) b.click(); }
    else if (e.key === "ArrowLeft") { const b = $("[data-action=msPaso][data-d='-1']"); if (b && !b.disabled) b.click(); }
  });
  A.msLTurn = (el) => book && book.turn(+el.dataset.d);
  A.msLGo = (el) => book && book.go(+el.dataset.p);
  let rz = 0; window.addEventListener("resize", () => { if (document.getElementById("msLibroSt")) { clearTimeout(rz); rz = setTimeout(buildLibro, 200); } });
}
