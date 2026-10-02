// «Mi Camino»: el espacio de los jóvenes (Ingreso, Madurez y Aspirantes) en la app.
// Muestra la revista de SU etapa encuentro por encuentro, y se va abriendo según el
// calendario del Camino Ágape: cada encuentro se abre la semana de su domingo.
// Antes del encuentro solo se ve el tema y el Evangelio (las dinámicas son sorpresa);
// al marcar «Ya viví este encuentro» se abren la frase, las preguntas y el desafío.

import { esc, icon, toast } from "./util.js";
import { illus } from "./ilustraciones.js";

let ctx = null; // { actions, render, cloud, S }
export function setup(c) { ctx = c; registerActions(); }
const st = () => ctx.cloud.state();

export const ETAPAS = {
  ingreso: { name: "Ingreso", color: "#8ad2fa", ill: "acogida" },
  madurez: { name: "Madurez", color: "#ffba03", ill: "camino" },
  aspirante: { name: "Aspirante", color: "#ef591c", ill: "servir" },
};
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => iso(new Date());
const parseFecha = (s) => { const m = String(s).match(/(\d+) de (\w+) de (\d{4})/); return m ? new Date(+m[3], MESES.indexOf(m[2]), +m[1], 12) : null; };
const shift = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const longD = (d) => d.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" });

let DATA = null;
async function load() {
  if (DATA) return DATA;
  try { DATA = await fetch("data/encuentros.json", { cache: "no-cache" }).then((r) => r.json()); } catch { DATA = null; }
  return DATA;
}

// Etapa de quien mira: la de su rol; el equipo puede previsualizar cualquiera.
let preview = "ingreso";
export function etapaOf(role) { return ETAPAS[role] ? role : null; }
function myEtapa() { const e = etapaOf(st().role); return e || preview; }
const canPreview = () => !etapaOf(st().role);

// Avance: «ya viví este encuentro» se guarda como nota (viaja con la cuenta).
const NOTE_COURSE = () => `camino-${(DATA && DATA.version) || "2027"}`;
const vividos = (et) => ctx.S.getNotes(NOTE_COURSE(), `vividos-${et}`);
const setVivido = (et, n, on) => ctx.S.setNote(NOTE_COURSE(), `vividos-${et}`, n, on ? "1" : "");

function enriched(d) {
  return (d.encuentros || []).map((e) => {
    const f = parseFecha(e.fecha);
    return { ...e, date: f, opens: f ? shift(f, -6) : null };
  }).filter((e) => e.date);
}
function currentIdx(list) {
  const t = new Date(); t.setHours(12, 0, 0, 0);
  let k = -1;
  list.forEach((e, i) => { if (e.opens <= t) k = i; });
  return k;
}

// ---------------------------------------------------------------------------
export async function view(nArg) {
  const d = await load();
  if (!d) return `<div class="card" style="padding:30px;text-align:center"><p class="muted">No pudimos cargar el Camino Ágape. Revisa tu conexión.</p></div>`;
  const et = myEtapa(), E = ETAPAS[et];
  const list = enriched(d), cur = currentIdx(list), done = vividos(et);
  const vivCount = Object.keys(done).length;
  const sel = nArg != null ? list.findIndex((e) => String(e.n) === String(nArg)) : cur;
  const head = `<header class="page-head mc-head" style="--c:${E.color}">
      <span class="eyebrow">Mi Camino · Etapa ${esc(E.name)}</span>
      <h1>${esc(d.title || "Camino Ágape")}</h1>
      <p>${esc((d.etapas || []).find((x) => x.key === et)?.lema || "")}${d.ciclo ? ` · ${esc(d.ciclo)}` : ""}</p>
      ${canPreview() ? `<div class="mc-prev"><span class="xs muted">Vista previa del equipo:</span>${Object.entries(ETAPAS).map(([k, v]) => `<button class="chip ${k === et ? "accent" : ""}" data-action="mcPreview" data-e="${k}">${esc(v.name)}</button>`).join("")}</div>` : ""}
    </header>`;
  const progress = `<div class="mc-prog"><div class="mc-bar"><i style="width:${Math.round((Math.max(0, cur + 1) / list.length) * 100)}%"></i></div>
    <span class="small"><b>${vivCount}</b> encuentro${vivCount === 1 ? "" : "s"} vivido${vivCount === 1 ? "" : "s"} · ${Math.max(0, cur + 1)} de ${list.length} abiertos</span>
    <a class="small" href="#/pasaporte">${icon("award")} Mi pasaporte</a></div>`;

  // Antes de que empiece el año
  if (cur < 0) {
    const first = list[0], days = Math.ceil((first.opens - new Date()) / 86400000);
    return `${head}
      <section class="card mc-wait"><div><span class="eyebrow">Muy pronto</span>
        <h2>El Camino ${esc(String(first.date.getFullYear()))} empieza el ${esc(longD(first.date))}</h2>
        <p class="muted">Faltan <b>${days}</b> días. Cada semana se abrirá aquí el encuentro de tu etapa: el tema, el Evangelio, una frase para llevar, preguntas para pensar y el desafío de la semana.</p></div>
        ${illus(E.ill)}</section>
      <h2 class="mc-h2">Así será el año</h2>
      <div class="mc-tramos">${(d.tramos || []).map((t) => `<div class="mc-tramo"><b>${esc(t.name)}</b><span class="xs">${esc(t.fechas)}</span><p class="small">${esc(t.tono)}</p></div>`).join("")}</div>`;
  }

  const e = list[Math.max(0, sel)] || list[cur];
  const idx = list.indexOf(e);
  const open = idx <= cur, isCur = idx === cur;
  const vivido = !!done[e.n];
  const x = (e.etapas || {})[et] || {};
  const tramo = (d.tramos || []).find((t) => t.key === e.tramo);
  const notes = ctx.S.getNotes(NOTE_COURSE(), `${et}:${e.n}`);
  const card = !open ? `<section class="card mc-locked">${icon("lock")}<div><h2>Encuentro ${e.n} · se abre el ${esc(longD(e.opens))}</h2><p class="muted">Tema: <b>${esc(e.tema)}</b>. Vuelve esa semana para ver el encuentro de tu etapa.</p></div></section>` : `
    <section class="card mc-enc" style="--c:${E.color}">
      <div class="mc-enc-top">
        <div><span class="eyebrow">${isCur ? "Esta semana" : "Encuentro anterior"} · Encuentro ${e.n}${tramo ? ` · ${esc(tramo.name)}` : ""}</span>
          <h2>${esc(x.titulo || e.tema)}</h2>
          <p class="mc-tema">Tema del grupo: <b>${esc(e.tema)}</b> · ${esc(e.domingo || "")}</p></div>
        <div class="mc-ill">${illus(E.ill)}</div>
      </div>
      ${x.intro ? `<p class="mc-intro">${esc(x.intro)}</p>` : ""}
      ${e.evangelio ? `<div class="mc-word"><span class="eyebrow">📖 Evangelio · ${esc(e.evangelio.ref)}</span><p>${esc(e.evangelio.resumen || "")}</p></div>` : ""}
      ${vivido ? `
        ${x.frase ? `<p class="mc-frase">«${esc(x.frase)}»</p>` : ""}
        ${(x.preguntas || []).length ? `<div class="mc-qs"><span class="eyebrow">✍️ Para pensar · solo tú lo lees</span>${x.preguntas.map((q, k) => `<label class="field"><span>${esc(q)}</span>
          <textarea class="textarea" rows="2" data-mcnote="${esc(`${et}:${e.n}`)}" data-qi="${k}" placeholder="Escribe aquí…">${esc(notes[k] || "")}</textarea></label>`).join("")}</div>` : ""}
        ${x.desafio ? `<div class="mc-reto"><span class="eyebrow">🎯 Tu desafío de la semana</span><p>${esc(x.desafio)}</p>
          ${st().ready ? `<button class="btn btn-gold btn-sm" data-action="mcReto" data-n="${e.n}">¡Lo cumplí!</button>` : ""}</div>` : ""}
        <button class="btn btn-ghost btn-sm" data-action="mcVivido" data-n="${e.n}" data-on="0">Desmarcar «ya lo viví»</button>`
      : `<div class="mc-gate"><p>${isCur ? "¿Ya fuiste al encuentro de esta semana?" : "¿Viviste este encuentro?"} Al marcarlo se abren la frase para llevar, las preguntas para pensar y tu desafío.</p>
          <button class="btn btn-primary" data-action="mcVivido" data-n="${e.n}" data-on="1">${icon("check")} Ya viví este encuentro</button></div>`}
    </section>`;

  const tl = `<h2 class="mc-h2">Todos los encuentros</h2><div class="mc-tl">${list.map((y, i) => {
    const o = i <= cur, v = !!done[y.n];
    return `<a class="mc-dot ${o ? "open" : "lock"} ${v ? "done" : ""} ${i === idx ? "sel" : ""}" ${o ? `href="#/mi-camino/${y.n}"` : ""} title="${esc(`Encuentro ${y.n}: ${y.tema}`)}">
      <b>${y.n}</b><span>${o ? esc(((y.etapas || {})[et] || {}).titulo || y.tema) : esc(`${y.date.getDate()} ${MESES[y.date.getMonth()].slice(0, 3)}`)}</span>${v ? "✓" : o ? "" : icon("lock")}</a>`;
  }).join("")}</div>`;
  return `${head}${progress}${card}
    <div class="row-wrap" style="margin-top:12px">${idx > 0 ? `<a class="btn btn-ghost btn-sm" href="#/mi-camino/${list[idx - 1].n}">${icon("left")} Anterior</a>` : ""}
      ${idx < cur ? `<a class="btn btn-ghost btn-sm" href="#/mi-camino/${list[idx + 1].n}">Siguiente ${icon("right")}</a>` : ""}
      ${!isCur ? `<a class="btn btn-soft btn-sm" href="#/mi-camino">Ir a esta semana</a>` : ""}</div>
    ${tl}`;
}

// Tarjeta de Inicio para jóvenes
export async function homeCard() {
  const slot = document.getElementById("mcSlot"); if (!slot) return;
  const d = await load(); if (!d || !document.getElementById("mcSlot")) return;
  const et = myEtapa(), E = ETAPAS[et], list = enriched(d), cur = currentIdx(list);
  const e = list[cur], x = e ? (e.etapas || {})[et] || {} : null;
  document.getElementById("mcSlot").innerHTML = `<a class="card link camino-banner mc-home" href="#/mi-camino" style="margin-top:16px;--c:${E.color}">
    <span class="tile-ico tile-brand" style="margin:0">${icon("route")}</span>
    <span style="flex:1"><span class="eyebrow">Mi Camino · ${esc(E.name)}</span><strong>${e ? `Esta semana: ${esc(x.titulo || e.tema)}` : "El Camino empieza pronto"}</strong>
    <span class="muted small">${e ? `Encuentro ${e.n} · ${esc(e.tema)}` : `Primer encuentro: ${esc(longD(list[0].date))}`}</span></span>${icon("right")}</a>`;
}

let noteT = null;
function registerActions() {
  const A = ctx.actions;
  A.mcPreview = (el) => { preview = el.dataset.e; ctx.render(); };
  A.mcVivido = (el) => {
    const on = el.dataset.on === "1";
    setVivido(myEtapa(), el.dataset.n, on);
    if (on) toast("¡Bien! Se abrió tu desafío de la semana");
    ctx.render();
  };
  A.mcReto = async (el) => {
    try { await ctx.cloud.markDesafio(`e-${el.dataset.n}`, true); el.textContent = "✓ ¡Lo cumplí!"; el.disabled = true; toast("🎯 ¡Desafío cumplido!"); }
    catch { toast("No se pudo guardar", ""); }
  };
  document.addEventListener("input", (e) => {
    const t = e.target; if (!t.dataset || t.dataset.mcnote == null) return;
    clearTimeout(noteT);
    noteT = setTimeout(() => ctx.S.setNote(NOTE_COURSE(), t.dataset.mcnote, +t.dataset.qi, t.value), 400);
  });
}
