// Camino Ágape: encuentros semanales del grupo.
// Cinco revistas con un mismo diseño tipo "zine": la revista principal (el marco),
// la guía de coordinación y la revista del joven en tres etapas (ingreso, madurez,
// aspirante), cada una con su color. Se leen en la app (un encuentro a la vez)
// y se imprimen o guardan como PDF: la revista completa o solo un encuentro.

import { esc, icon } from "./util.js";

let ctx = null; // { actions, render, cloud }
let data = null, loading = null;
let sel = { rev: null, n: 0 }; // encuentro visible en la app (0 = portada e introducción)

export function setup(c) {
  ctx = c;
  ctx.actions.magPrint = (el) => {
    document.body.classList.toggle("print-one", el.dataset.scope === "one");
    const done = () => { document.body.classList.remove("print-one"); window.removeEventListener("afterprint", done); };
    window.addEventListener("afterprint", done);
    window.print();
  };
  ctx.actions.zineGo = (el) => { sel.n = +el.dataset.n; paintSel(); document.querySelector(".z-nav")?.scrollIntoView({ behavior: "smooth", block: "start" }); };
  ctx.actions.zineTramo = (el) => {
    const first = data.encuentros.find((e) => e.tramo === el.dataset.t);
    if (first) { sel.n = first.n; paintSel(); }
  };
}
function paintSel() {
  const art = document.querySelector(".zine");
  if (!art) return;
  art.classList.toggle("show-intro", sel.n === 0);
  art.querySelectorAll("[data-zenc]").forEach((x) => x.classList.toggle("on", +x.dataset.zenc === sel.n));
  art.querySelectorAll("[data-first]").forEach((x) => x.classList.toggle("on", +x.dataset.first === sel.n));
  const nav = document.querySelector(".z-nav");
  if (nav) nav.outerHTML = navHTML(data, sel.n);
}

async function load() {
  if (data) return data;
  if (!loading) loading = fetch("data/encuentros.json", { cache: "no-cache" }).then((r) => r.json()).then((d) => (data = d));
  return loading;
}

// Colores: cada revista tiene el suyo; las etapas se distinguen por color.
const REVISTAS = {
  principal: { name: "Revista principal", short: "Principal", kicker: "La columna vertebral del grupo", for: "Todo el grupo y sus familias", bg: "#0b2566", ink: "#ffffff", pop: "#ffba03", soft: "#e1edfb" },
  coordinacion: { name: "Guía de coordinación", short: "Coordinación", kicker: "Para quienes preparan los encuentros", for: "Coordinadores, animadores y dirigentes", bg: "#ffba03", ink: "#0b2566", pop: "#ef591c", soft: "#fff1cc" },
  ingreso: { name: "Revista Ingreso", short: "Ingreso", kicker: "Etapa 1 · Bienvenido a casa", for: "Jóvenes terminando su Confirmación", bg: "#8ad2fa", ink: "#0b2566", pop: "#ef591c", soft: "#e3f4fe", n: 1 },
  madurez: { name: "Revista Madurez", short: "Madurez", kicker: "Etapa 2 · Mi fe en primera persona", for: "Jóvenes confirmados", bg: "#1351a4", ink: "#ffffff", pop: "#ffba03", soft: "#e1edfb", n: 2 },
  aspirante: { name: "Revista Aspirante", short: "Aspirante", kicker: "Etapa 3 · Llamados a servir", for: "Jóvenes que disciernen servir como dirigentes", bg: "#ef591c", ink: "#ffffff", pop: "#ffba03", soft: "#fde9df", n: 3 },
};
const STAGES = ["ingreso", "madurez", "aspirante"];
const zvars = (r) => `--zb:${r.bg};--zi:${r.ink};--zp:${r.pop};--zs:${r.soft}`;
const canSeeGuide = () => !ctx.cloud.enabled || ctx.cloud.state().ready;
const pad = (n) => String(n).padStart(2, "0");
const write = (n) => `<span class="z-write">${"<i></i>".repeat(n)}</span>`;
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
function dateOf(s) {
  const m = String(s).match(/(\d+) de (\w+) de (\d{4})/);
  return m ? new Date(+m[3], MESES.indexOf(m[2]), +m[1]) : null;
}
const shortDate = (s) => { const m = String(s).match(/(\d+) de (\w+)/); return m ? `${m[1]} ${m[2].slice(0, 3)}` : s; };
const SVG = {
  book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6.5C10 5 7.5 4.5 4 4.5v14c3.5 0 6 .5 8 2 2-1.5 4.5-2 8-2v-14c-3.5 0-6 .5-8 2Z"/><path d="M12 6.5v14"/></svg>',
  scissors: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.1 15.9M14.5 14.5 20 20M8.1 8.1 12 12"/></svg>',
  pen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z"/></svg>',
};
const STEP_ICONS = ["☺", "✦", "✚", "◎", "↗", "☕"];

// ---------------------------------------------------------------------------
// Portada de la sección  (#/encuentros)
// ---------------------------------------------------------------------------
export async function viewHub() {
  const d = await load();
  const card = (k) => {
    const r = REVISTAS[k];
    const locked = k === "coordinacion" && !canSeeGuide();
    return `<a class="card link mag-card" href="#/encuentros/${k}" style="${zvars(r)}">
      <span class="mag-card-cover"><b>${esc(d.title)}</b><span>${esc(r.name)}</span></span>
      <span class="mag-card-body"><span class="eyebrow">${esc(r.kicker)}</span><h3>${esc(r.name)}</h3>
      <span class="muted small">${esc(r.for)}</span>${locked ? `<span class="chip" style="margin-top:8px">${icon("lock")} Con tu cuenta</span>` : ""}</span>
    </a>`;
  };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  let next = d.encuentros.filter((e) => (dateOf(e.fecha) || 0) >= today).slice(0, 4);
  if (!next.length) next = d.encuentros.slice(-4);
  return `
  <header class="page-head"><span class="eyebrow">${esc(d.ciclo)}</span><h1>Camino <em>Ágape</em></h1>
    <p>${esc(d.subtitle)}. ${esc(d.claim)}</p></header>
  <div class="grid grid-2" style="margin-top:18px">${card("principal")}${card("coordinacion")}</div>
  <h2 class="mag-hub-sub">Revistas del joven</h2>
  <div class="grid grid-3">${STAGES.map(card).join("")}</div>
  <h2 class="mag-hub-sub">Próximos encuentros</h2>
  <div class="stack" style="--gap:10px">${next.map((e) => `<div class="card mag-next">
    <span class="mag-num">${e.n}</span>
    <div style="flex:1"><strong>${esc(e.tema)}</strong><div class="muted small">${esc(e.domingo)} · ${esc(e.fecha)} · ${esc(e.evangelio.ref)}</div></div>
  </div>`).join("")}</div>
  <p class="xs muted" style="margin-top:14px">${d.encuentros.length} encuentros en ${d.tramos.length} tramos, de Adviento 2026 a Cristo Rey 2027.</p>`;
}

// ---------------------------------------------------------------------------
// Una revista  (#/encuentros/:k)
// ---------------------------------------------------------------------------
export async function viewRevista(k) {
  const d = await load();
  const r = REVISTAS[k];
  if (!r) return null;
  if (k === "coordinacion" && !canSeeGuide()) {
    return `<a class="btn btn-sm btn-ghost" href="#/encuentros">${icon("arrowL")} Camino Ágape</a>
      <div class="card" style="text-align:center;padding:32px;margin-top:14px">
      <div class="tile-ico tile-brand" style="margin:0 auto 12px">${icon("lock")}</div>
      <h2 class="display">La guía de coordinación es para el equipo</h2>
      <p class="muted" style="margin-top:8px">Ingresa con la cuenta con que te invitaron para verla.</p>
      <button class="btn btn-primary" style="margin-top:16px" data-action="signIn">Ingresar</button></div>`;
  }
  if (sel.rev !== k) sel = { rev: k, n: 0 };
  const paged = k !== "principal";
  const front = cover(d, k) + (k === "principal" ? principalPages(d) : k === "coordinacion" ? guideIntro(d) : stageIntro(d, k));
  const body = paged ? d.tramos.map((t) => {
    const encs = d.encuentros.filter((e) => e.tramo === t.key);
    return tramoPage(d, t, encs) + encs.map((e) => `<div class="z-enc${e.n === sel.n ? " on" : ""}" data-zenc="${e.n}">${k === "coordinacion" ? guidePages(d, e) : stagePages(e, k)}</div>`).join("");
  }).join("") : "";
  const back = k === "coordinacion" ? "" : backPage(d);
  return `
  <div class="row-wrap no-print" style="margin-bottom:12px">
    <a class="btn btn-sm btn-ghost" href="#/encuentros">${icon("arrowL")} Camino Ágape</a><span class="spacer"></span>
    ${paged ? `<button class="btn btn-sm btn-soft" data-action="magPrint" data-scope="one">${icon("print")} Solo este encuentro</button>` : ""}
    <button class="btn btn-sm btn-primary" data-action="magPrint" data-scope="all">${icon("dl")} Revista completa (PDF)</button>
  </div>
  ${paged ? navHTML(d, sel.n) : ""}
  <article class="zine${paged ? "" : " all"}${sel.n === 0 ? " show-intro" : ""}" style="${zvars(r)}" data-rev="${k}">
    <div class="z-front">${front}</div>
    ${body}
    ${back ? `<div class="z-end">${back}</div>` : ""}
  </article>`;
}

function navHTML(d, n) {
  const cur = d.encuentros.find((e) => e.n === n);
  const tr = cur ? cur.tramo : null;
  const list = cur ? d.encuentros.filter((e) => e.tramo === tr) : [];
  const i = d.encuentros.findIndex((e) => e.n === n);
  const prev = n === 0 ? null : i > 0 ? d.encuentros[i - 1].n : 0;
  const next = n === 0 ? d.encuentros[0].n : i < d.encuentros.length - 1 ? d.encuentros[i + 1].n : null;
  return `<nav class="z-nav no-print" aria-label="Encuentros">
    <div class="z-tabs">
      <button data-action="zineGo" data-n="0" class="${n === 0 ? "on" : ""}">Inicio</button>
      ${d.tramos.map((t, ti) => `<button data-action="zineTramo" data-t="${t.key}" class="${tr === t.key ? "on" : ""}"><b>${ti + 1}</b> ${esc(t.name)}</button>`).join("")}
    </div>
    ${list.length ? `<div class="z-tabs z-sub">${list.map((e) => `<button data-action="zineGo" data-n="${e.n}" class="${e.n === n ? "on" : ""}"><b>${e.n}</b> ${esc(e.tema)}</button>`).join("")}</div>` : ""}
    <div class="z-pager">
      ${prev != null ? `<button class="btn btn-sm btn-ghost" data-action="zineGo" data-n="${prev}">${icon("arrowL")} Anterior</button>` : "<span></span>"}
      ${cur ? `<span class="small muted">${esc(cur.fecha)}</span>` : ""}
      ${next != null ? `<button class="btn btn-sm btn-ghost" data-action="zineGo" data-n="${next}">${n === 0 ? "Primer encuentro" : "Siguiente"} ${icon("arrowR")}</button>` : "<span></span>"}
    </div>
  </nav>`;
}

// ----- Piezas comunes -----
function cover(d, k) {
  const r = REVISTAS[k];
  const st = d.etapas.find((x) => x.key === k);
  const big = st ? st.lema : k === "principal" ? "Crecer juntos" : "Preparar el encuentro";
  const hand = st ? `tu revista · etapa ${r.n}` : k === "principal" ? "la revista principal" : "guía de coordinación";
  return `<section class="z-page z-cover">
      <i class="z-blob b1"></i><i class="z-blob b2"></i><i class="z-blob b3"></i>
      <div class="z-cover-top"><span>Camino Ágape</span><img src="icons/logo-320.webp" alt="Logo Ágape Joven PJ" width="130" height="130"></div>
      <span class="z-hand z-tilt">${esc(hand)}</span>
      <h1 class="z-mega">${esc(big)}</h1>
      <div class="z-cover-card"><b>${esc(st ? st.name : r.short)}</b><span>${esc(d.ciclo)}</span></div>
      <p class="z-cover-foot">Pastoral Juvenil Ágape · Parroquia San Miguel de Yungay</p>
    </section>`;
}
function tramoPage(d, t, encs) {
  const i = d.tramos.indexOf(t) + 1;
  const first = encs.length ? encs[0].n : -1;
  return `<div class="z-tramo${first === sel.n ? " on" : ""}" data-first="${first}">
    <section class="z-page z-divider">
      <i class="z-blob b1"></i><i class="z-blob b3"></i>
      <span class="z-hand z-tilt">tramo ${i} de ${d.tramos.length}</span>
      <h2 class="z-mega">${esc(t.name)}</h2>
      <span class="z-chip">${esc(t.fechas)}</span>
      <p class="z-divider-tono">${esc(t.tono)}</p>
      <ol class="z-divider-list">${encs.map((e) => `<li><b>${e.n}</b><span>${esc(e.tema)}<small>${esc(e.fecha)}</small></span></li>`).join("")}</ol>
    </section></div>`;
}
function heroTop(e) {
  return `<div class="z-hero-top">
      <span class="z-num">${pad(e.n)}</span>
      <span class="z-chip">${esc(e.domingo)}<br><b>${esc(e.fecha)}</b></span>
    </div>
    <h2 class="z-mega z-tema">${esc(e.tema)}</h2>
    <span class="z-hand z-lema z-tilt">${esc(e.lema)}</span>`;
}
function wordCard(e, label = "Lee en tu Biblia") {
  return `<div class="z-word">
      <span class="z-word-ico">${SVG.book}</span>
      <div><small>${esc(label)}</small><b>${esc(e.evangelio.ref)}</b><p>${esc(e.evangelio.resumen)}</p></div>
    </div>`;
}
function stepsGrid(d) {
  return `<div class="z-steps">${d.estructura.map((m, i) => `<div class="z-step"><span class="z-step-ico">${STEP_ICONS[i] || "•"}</span><b>${esc(m.name)}</b><small>${m.min}′ · ${esc(m.who)}</small></div>`).join("")}</div>`;
}
function roadHTML(stops) {
  return `<div class="z-road" style="--stops:${stops.length}">
      <svg class="z-road-line" viewBox="0 0 600 120" preserveAspectRatio="none" aria-hidden="true"><path d="M20 90 C 140 -10, 220 150, 320 60 S 520 0, 585 70" fill="none" stroke="currentColor" stroke-width="6" stroke-dasharray="2 14" stroke-linecap="round"/></svg>
      ${stops.map((b, i) => `<div class="z-stop"><b>${i + 1}</b><span>${esc(b)}</span></div>`).join("")}
    </div>`;
}
function backPage(d) {
  const prayer = d.principal.find((s) => s.prayer).prayer;
  return `<section class="z-page z-back">
      <span class="z-hand z-tilt">para rezar siempre</span>
      <h2 class="z-mega">Oración del Camino</h2>
      <p class="z-prayer">${esc(prayer).replace(/\n/g, "<br>")}</p>
      <img src="icons/logo-320.webp" alt="" width="90" height="90">
    </section>`;
}
function calendarPage(d) {
  return `<section class="z-page z-cal">
      <h2 class="z-h">El año en <span class="z-mark">${d.encuentros.length} encuentros</span></h2>
      <div class="z-cal-grid">${d.tramos.map((t, i) => `<div class="z-cal-t">
        <h3><b>${i + 1}</b> ${esc(t.name)}</h3>
        <ul>${d.encuentros.filter((e) => e.tramo === t.key).map((e) => `<li><span>${esc(shortDate(e.fecha))}</span> ${esc(e.tema)}</li>`).join("")}</ul>
      </div>`).join("")}</div>
      <div class="z-pausas">${d.pausas.map((p) => `<div><b>${esc(p.que)}</b><small>${esc(p.cuando)}</small><span>${esc(p.texto)}</span></div>`).join("")}</div>
    </section>`;
}

// ----- Revista principal -----
function principalPages(d) {
  const S = Object.fromEntries(d.principal.map((s) => [s.id, s]));
  const bubble = (txt) => `<div class="z-bubble"><p>${esc(txt)}</p></div>`;
  const cards = (items) => `<div class="z-cards">${items.map((it, i) => `<div class="z-card"><span class="z-card-n">${i + 1}</span><h3>${esc(it.title)}</h3><p>${esc(it.text)}</p></div>`).join("")}</div>`;
  const page = (s, inner) => `<section class="z-page z-sec" id="p-${s.id}">
      <span class="z-hand z-tilt">${esc(s.kicker)}</span>
      <h2 class="z-h z-h-big">${esc(s.title)}</h2>${inner}</section>`;
  const rest = (s) => s.body.slice(1).map((p) => `<p class="z-text">${esc(p)}</p>`).join("");
  return [
    page(S.bienvenida, bubble(S.bienvenida.body[0]) + rest(S.bienvenida)),
    page(S.identidad, bubble(S.identidad.body[0]) + rest(S.identidad) + cards(S.identidad.items)),
    page(S.etapas, bubble(S.etapas.body[0]) + `<div class="z-stages">${d.etapas.map((e, i) => `
      <div class="z-stagecard" style="${zvars(REVISTAS[e.key])}">
        <span class="z-stage-n">Año ${i + 1}</span><h3>${esc(e.name)}</h3><span class="z-hand">${esc(e.lema)}</span>
        <p><b>Quiénes:</b> ${esc(e.who)}</p><p><b>Meta:</b> ${esc(e.goal)}</p>
        <p class="z-small"><b>Para pasar de etapa:</b> ${esc(e.paso)}</p><p class="z-small">${esc(e.signo)}</p>
      </div>`).join("")}</div>`),
    page(S.anio, bubble(S.anio.body[0]) + roadHTML(d.tramos.map((t) => t.name)) + cards(S.anio.items)),
    calendarPage(d),
    page(S.encuentro, bubble(S.encuentro.body[0]) + stepsGrid(d)),
    page(S.acompanan, bubble(S.acompanan.body[0]) + cards(S.acompanan.items)),
    page(S.paso, bubble(S.paso.body[0]) + rest(S.paso) + `<div class="z-signos">${d.etapas.map((e) => `<div style="${zvars(REVISTAS[e.key])}"><b>${esc(e.name)}</b><span>${esc(e.signo)}</span></div>`).join("")}</div>`),
    page(S.cuidado, bubble(S.cuidado.body[0]) + rest(S.cuidado)),
  ].join("");
}

// ----- Guía de coordinación -----
function guideIntro(d) {
  return `<section class="z-page z-sec">
      <span class="z-hand z-tilt">antes de empezar</span>
      <h2 class="z-h z-h-big">Cómo usar esta guía</h2>
      <div class="z-bubble"><p>Cada encuentro viene en tres páginas: la ficha para prepararlo, los momentos que se viven todos juntos y el trabajo de cada etapa. En la reunión quincenal se reparten: quién anima los momentos comunes y quién acompaña a cada etapa.</p></div>
      <h3 class="z-h">Los 90 minutos</h3>
      ${stepsGrid(d)}
      <div class="z-legend">${STAGES.map((k) => `<span style="${zvars(REVISTAS[k])}"><i></i>${esc(REVISTAS[k].short)}</span>`).join("")}</div>
    </section>` + calendarPage(d);
}
function guidePages(d, e) {
  let t = 0;
  const times = d.estructura.map((m) => { const a = t; t += m.min; return `${a}–${t}′`; });
  const step = (i, title, text) => `<div class="z-tl"><span class="z-time">${times[i]}</span><div><h4>${esc(title)}</h4>${text}</div></div>`;
  return `
    <section class="z-page z-hero">
      ${heroTop(e)}
      <div class="z-bubble"><h3>Objetivo</h3><p>${esc(e.objetivo)}</p></div>
      ${wordCard(e, "Palabra del domingo")}
      <div class="z-note-card"><small>Idea para el comentario</small><p>${esc(e.comentario)}</p></div>
      <div class="z-two">
        <div class="z-list"><h4>Preparar antes</h4><ul class="z-check">${e.preparar.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>
        <div class="z-list"><h4>Materiales</h4><ul>${e.materiales.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>
      </div>
    </section>
    <section class="z-page z-work">
      <h2 class="z-h">Momentos <span class="z-mark">juntos</span> <small class="z-h-sub">Encuentro ${e.n} · ${esc(e.tema)}</small></h2>
      <div class="z-timeline">
        ${step(0, `Acogida · ${e.acogida.name}`, `<p>${esc(e.acogida.text)}</p>`)}
        ${step(1, "Oración inicial", `<p>${esc(e.oracion)}</p>`)}
        ${step(2, `Palabra · ${e.evangelio.ref}`, `<p>Lectura en la Biblia del grupo, un minuto de silencio y el comentario de la ficha.</p>`)}
        ${step(3, "Trabajo por etapa", `<p>Cada etapa con su acompañante (página siguiente).</p>`)}
        ${step(4, "Plenario y envío", `<p>${esc(e.plenario)}</p><p>${esc(e.envio)}</p>`)}
        ${step(5, "Convivencia", `<p>${esc(d.estructura[5].text)}</p>`)}
      </div>
      <div class="z-two">
        <div class="z-list z-eval"><h4>Para evaluar después</h4><ul>${e.evaluar.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>
        <div class="z-list z-tips"><h4>Consejos</h4><ul>${e.tips.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>
      </div>
    </section>
    <section class="z-page z-stagepage">
      <h2 class="z-h">Trabajo <span class="z-mark">por etapa</span> <small class="z-h-sub">35 minutos · Encuentro ${e.n}</small></h2>
      <div class="z-stagecols">${STAGES.map((k) => {
        const x = e.etapas[k];
        return `<div class="z-stagework" style="${zvars(REVISTAS[k])}">
          <span class="z-stage-tag">${esc(REVISTAS[k].short)}</span>
          <h3>${esc(x.titulo)}</h3>
          <p class="z-small">${esc(x.objetivo)}</p>
          <h4>${esc(x.dinamica.name)}</h4>
          <ol>${x.dinamica.pasos.map((p) => `<li>${esc(p)}</li>`).join("")}</ol>
          <h4>Preguntas</h4><ul>${x.preguntas.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>
          <div class="z-mini-coupon"><b>Desafío</b> ${esc(x.desafio)}</div>
        </div>`;
      }).join("")}</div>
    </section>`;
}

// ----- Revista del joven -----
function stageIntro(d, k) {
  const st = d.etapas.find((x) => x.key === k);
  return `<section class="z-page z-intro">
      <div class="z-sticker z-tilt-r">Esta revista es de<br>${write(1)}</div>
      <h2 class="z-h">Tu año en <span class="z-mark">${st.bloques.length} paradas</span></h2>
      ${roadHTML(st.bloques)}
      <h2 class="z-h">Así es cada encuentro</h2>
      ${stepsGrid(d)}
      <p class="z-hand z-note">Tráela cada semana. Raya, subraya, dibuja: es tuya.</p>
    </section>`;
}
function stagePages(e, k) {
  const x = e.etapas[k];
  return `
    <section class="z-page z-hero" id="enc-${e.n}">
      ${heroTop(e)}
      <div class="z-bubble"><h3>${esc(x.titulo)}</h3><p>${esc(x.intro)}</p></div>
      ${wordCard(e)}
      <blockquote class="z-quote z-tilt-r">${esc(x.frase)}</blockquote>
    </section>
    <section class="z-page z-work">
      <h2 class="z-h">Para <span class="z-mark">conversar</span></h2>
      <div class="z-qs">${x.preguntas.map((q, i) => `<div class="z-q"><span class="z-qn">${i + 1}</span><p>${esc(q)}</p>${write(2)}</div>`).join("")}</div>
      <div class="z-coupon">
        <span class="z-scissors">${SVG.scissors}</span>
        <small>Desafío de la semana</small>
        <p>${esc(x.desafio)}</p>
        <div class="z-coupon-foot"><span class="z-box"></span> ¡Lo hice! <span class="spacer"></span> Día: ______</div>
      </div>
      <div class="z-pray"><h3>${SVG.pen} Mi oración</h3>${write(3)}<span class="z-doodle">✦</span><span class="z-doodle d2">♡</span></div>
    </section>`;
}
