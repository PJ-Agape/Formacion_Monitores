// Camino Ágape: encuentros semanales del grupo.
// Revista principal (el marco), guía de coordinación y revista del joven
// en tres etapas (ingreso, madurez, aspirante). Cada revista se lee en la app
// y se imprime o guarda como PDF con formato de revista.

import { esc, icon } from "./util.js";

let ctx = null; // { actions, render, cloud }
let data = null, loading = null;
export function setup(c) {
  ctx = c;
  ctx.actions.magPrint = () => window.print();
}

async function load() {
  if (data) return data;
  if (!loading) loading = fetch("data/encuentros.json", { cache: "no-cache" }).then((r) => r.json()).then((d) => (data = d));
  return loading;
}

const STAGE_COLOR = { ingreso: "#8ad2fa", madurez: "#1351a4", aspirante: "#ef591c" };
const REVISTAS = {
  principal: { name: "Revista principal", kicker: "La columna vertebral del grupo", color: "#0b2566", for: "Todo el grupo y sus familias" },
  coordinacion: { name: "Guía de coordinación", kicker: "Para quienes preparan los encuentros", color: "#ffba03", for: "Coordinadores, animadores y dirigentes" },
  ingreso: { name: "Revista Ingreso", kicker: "Etapa 1 · Bienvenido a casa", color: STAGE_COLOR.ingreso, for: "Jóvenes terminando su Confirmación" },
  madurez: { name: "Revista Madurez", kicker: "Etapa 2 · Mi fe en primera persona", color: STAGE_COLOR.madurez, for: "Jóvenes confirmados" },
  aspirante: { name: "Revista Aspirante", kicker: "Etapa 3 · Llamados a servir", color: STAGE_COLOR.aspirante, for: "Jóvenes que disciernen servir como dirigentes" },
};
const para = (arr) => (arr || []).map((p) => `<p>${esc(p)}</p>`).join("");
const lines = (n) => `<div class="mag-lines" aria-hidden="true">${"<i></i>".repeat(n)}</div>`;
const canSeeGuide = () => !ctx.cloud.enabled || ctx.cloud.state().ready;

// ---------------------------------------------------------------------------
// Portada de la sección  (#/encuentros)
// ---------------------------------------------------------------------------
export async function viewHub() {
  const d = await load();
  const card = (k) => {
    const r = REVISTAS[k];
    const locked = k === "coordinacion" && !canSeeGuide();
    return `<a class="card link mag-card" href="#/encuentros/${k}" style="--mc:${r.color}">
      <span class="mag-card-cover"><b>${esc(d.title)}</b><span>${esc(r.name)}</span></span>
      <span class="mag-card-body"><span class="eyebrow">${esc(r.kicker)}</span><h3>${esc(r.name)}</h3>
      <span class="muted small">${esc(r.for)}</span>${locked ? `<span class="chip" style="margin-top:8px">${icon("lock")} Con tu cuenta</span>` : ""}</span>
    </a>`;
  };
  return `
  <header class="page-head"><span class="eyebrow">${esc(d.ciclo)}</span><h1>${esc(d.title.split(" ")[0])} <em>${esc(d.title.split(" ").slice(1).join(" "))}</em></h1>
    <p>${esc(d.subtitle)}. ${esc(d.claim)}</p></header>
  ${d.pilot ? `<div class="note accent" style="margin-top:12px">${icon("sparkle")} ${esc(d.pilot)}</div>` : ""}
  <div class="grid grid-2" style="margin-top:18px">${card("principal")}${card("coordinacion")}</div>
  <h2 class="mag-hub-sub">Revistas del joven</h2>
  <div class="grid grid-3">${card("ingreso")}${card("madurez")}${card("aspirante")}</div>
  <h2 class="mag-hub-sub">Próximos encuentros</h2>
  <div class="stack" style="--gap:10px">${d.encuentros.map((e) => `<div class="card mag-next">
    <span class="mag-num">${e.n}</span>
    <div style="flex:1"><strong>${esc(e.tema)}</strong><div class="muted small">${esc(e.domingo)} · ${esc(e.fecha)} · ${esc(e.evangelio.ref)}</div></div>
  </div>`).join("")}</div>`;
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
  const body = k === "principal" ? principal(d) : k === "coordinacion" ? coordinacion(d) : joven(d, k);
  return `
  <div class="row-wrap no-print" style="margin-bottom:14px">
    <a class="btn btn-sm btn-ghost" href="#/encuentros">${icon("arrowL")} Camino Ágape</a><span class="spacer"></span>
    <button class="btn btn-sm btn-primary" data-action="magPrint">${icon("dl")} Descargar PDF</button>
  </div>
  <article class="mag" style="--mc:${r.color}" data-rev="${k}">
    <section class="mag-cover">
      <img src="icons/logo-320.webp" alt="Logo Ágape Joven PJ" width="120" height="120">
      <span class="mag-kicker">${esc(r.kicker)}</span>
      <h1>${esc(d.title)}</h1>
      <p class="mag-cover-name">${esc(r.name)}</p>
      <p class="mag-cover-claim">${esc(d.claim)}</p>
      <p class="mag-cover-foot">Pastoral Juvenil Ágape · Parroquia San Miguel de Yungay<br>${esc(d.ciclo)}</p>
    </section>
    ${body}
  </article>`;
}

// ----- Revista principal -----
function principal(d) {
  const toc = d.principal.map((s, i) => `<li><a href="#/encuentros/principal" data-action="scrollTo" data-id="p-${s.id}"><b>${String(i + 1).padStart(2, "0")}</b> ${esc(s.title)}</a></li>`).join("");
  const sec = (s, i) => {
    let extra = "";
    if (s.id === "etapas") extra = `<div class="mag-stages">${d.etapas.map((e) => `
      <div class="mag-stage" style="--sc:${STAGE_COLOR[e.key]}">
        <span class="mag-stage-n">Año ${d.etapas.indexOf(e) + 1}</span>
        <h3>${esc(e.name)}</h3><p class="mag-stage-lema">${esc(e.lema)}</p>
        <p><b>Quiénes:</b> ${esc(e.who)}</p>
        <p><b>Meta:</b> ${esc(e.goal)}</p>
        <p class="small"><b>Los cuatro bloques del año:</b> ${e.bloques.map(esc).join(" · ")}</p>
        <p class="small"><b>Para pasar de etapa:</b> ${esc(e.paso)}</p>
        <p class="small muted">${esc(e.signo)}</p>
      </div>`).join("")}</div>`;
    if (s.id === "encuentro") extra = timeline(d.estructura);
    if (s.items) extra += `<div class="mag-items">${s.items.map((it) => `<div><h4>${esc(it.title)}</h4><p>${esc(it.text)}</p></div>`).join("")}</div>`;
    if (s.prayer) extra += `<blockquote class="mag-prayer">${esc(s.prayer).replace(/\n/g, "<br>")}</blockquote>`;
    return `<section class="mag-sec${["etapas", "anio", "encuentro", "oracion"].includes(s.id) ? " mag-break" : ""}" id="p-${s.id}">
      <span class="mag-kicker">${String(i + 1).padStart(2, "0")} · ${esc(s.kicker)}</span>
      <h2>${esc(s.title)}</h2>${para(s.body)}${extra}</section>`;
  };
  return `<section class="mag-sec mag-toc"><span class="mag-kicker">Contenido</span><h2>En esta revista</h2><ol>${toc}</ol></section>
    ${d.principal.map(sec).join("")}`;
}
function timeline(est) {
  let t = 0;
  return `<ol class="mag-timeline">${est.map((m) => {
    const from = t; t += m.min;
    return `<li><span class="mag-time">${from}–${t}′</span><div><h4>${esc(m.name)} <span class="muted small">· ${esc(m.who)}</span></h4><p>${esc(m.text)}</p></div></li>`;
  }).join("")}</ol>`;
}

// ----- Guía de coordinación -----
function coordinacion(d) {
  const intro = `<section class="mag-sec">
    <span class="mag-kicker">Antes de empezar</span><h2>Cómo usar esta guía</h2>
    <p>Esta guía desglosa cada encuentro desde la mirada de quienes lo preparan. En la reunión quincenal se reparten los encuentros: quién anima los momentos comunes y quién acompaña a cada etapa. Cada responsable lee su parte con tiempo y consigue los materiales.</p>
    <p>La estructura es siempre la misma, para que los jóvenes la hagan suya:</p>
    ${timeline(d.estructura)}</section>`;
  const enc = (e) => {
    let t = 0;
    const slot = (i) => { const from = t; t += d.estructura[i].min; return `${from}–${t}′`; };
    const times = d.estructura.map((_, i) => slot(i));
    return `<section class="mag-sec mag-enc" id="enc-${e.n}">
      ${encHead(e)}
      <div class="mag-box"><h4>Objetivo</h4><p>${esc(e.objetivo)}</p></div>
      <div class="mag-cols">
        <div><h4>Preparar antes</h4><ul class="mag-check">${e.preparar.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>
        <div><h4>Materiales</h4><ul>${e.materiales.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>
      </div>
      <h3 class="mag-h3">Desarrollo</h3>
      <div class="mag-step"><span class="mag-time">${times[0]}</span><div><h4>Acogida · ${esc(e.acogida.name)}</h4><p>${esc(e.acogida.text)}</p></div></div>
      <div class="mag-step"><span class="mag-time">${times[1]}</span><div><h4>Oración inicial</h4><p>${esc(e.oracion)}</p></div></div>
      <div class="mag-step"><span class="mag-time">${times[2]}</span><div><h4>Palabra del domingo · ${esc(e.evangelio.ref)}</h4>
        <p>Se lee el Evangelio en la Biblia del grupo y se deja un minuto de silencio. Idea para el comentario:</p>
        <p class="mag-quote">${esc(e.comentario)}</p></div></div>
      <div class="mag-step"><span class="mag-time">${times[3]}</span><div><h4>Trabajo por etapa</h4><p>Cada etapa se reúne con su acompañante.</p></div></div>
      <div class="mag-stagegrid">${d.etapas.map((st) => {
        const x = e.etapas[st.key];
        return `<div class="mag-stagework" style="--sc:${STAGE_COLOR[st.key]}">
          <span class="mag-stage-tag">${esc(st.name)}</span>
          <h4>${esc(x.titulo)}</h4>
          <p class="small"><b>Objetivo:</b> ${esc(x.objetivo)}</p>
          <p class="small"><b>Dinámica: ${esc(x.dinamica.name)}</b></p>
          <ol class="small">${x.dinamica.pasos.map((p) => `<li>${esc(p)}</li>`).join("")}</ol>
          <p class="small"><b>Preguntas:</b></p><ul class="small">${x.preguntas.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>
          <p class="small"><b>Desafío:</b> ${esc(x.desafio)}</p>
        </div>`;
      }).join("")}</div>
      <div class="mag-step"><span class="mag-time">${times[4]}</span><div><h4>Plenario y envío</h4><p>${esc(e.plenario)}</p><p>${esc(e.envio)}</p></div></div>
      <div class="mag-step"><span class="mag-time">${times[5]}</span><div><h4>Convivencia</h4><p>${esc(d.estructura[5].text)}</p></div></div>
      <div class="mag-cols">
        <div class="mag-box"><h4>Para evaluar después</h4><ul>${e.evaluar.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>
        <div class="mag-box soft"><h4>Consejos</h4><ul>${e.tips.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>
      </div>
    </section>`;
  };
  return intro + d.encuentros.map(enc).join("");
}
function encHead(e) {
  return `<header class="mag-enc-head">
    <span class="mag-num big">${e.n}</span>
    <div><span class="mag-kicker">Encuentro ${e.n} · ${esc(e.domingo)} · ${esc(e.fecha)}</span>
    <h2>${esc(e.tema)}</h2><p class="mag-lema">«${esc(e.lema)}» · ${esc(e.evangelio.ref)}</p></div>
  </header>`;
}

// ----- Revista del joven -----
function joven(d, k) {
  const st = d.etapas.find((x) => x.key === k);
  const intro = `<section class="mag-sec">
    <span class="mag-kicker">Tu etapa</span><h2>${esc(st.lema)}</h2>
    <p class="mag-lead">${esc(st.goal)}</p>
    <p>Esta revista es tuya. Tráela a cada encuentro, escribe en ella, subraya lo que te toque. Cada semana leemos juntos el Evangelio del domingo y, después, tu grupo trabaja un tema pensado para esta etapa del camino.</p>
    <div class="mag-items"><div><h4>Este año recorreremos</h4><ol>${st.bloques.map((b) => `<li>${esc(b)}</li>`).join("")}</ol></div>
    <div><h4>Cómo es cada encuentro</h4><ol>${d.estructura.map((m) => `<li>${esc(m.name)}</li>`).join("")}</ol></div></div>
    <div class="mag-me"><h4>Esta revista es de</h4>${lines(1)}<h4>Mi grupo y mi acompañante</h4>${lines(1)}</div>
  </section>`;
  const enc = (e) => {
    const x = e.etapas[k];
    return `<section class="mag-sec mag-enc" id="enc-${e.n}">
      ${encHead(e)}
      <h3 class="mag-h3">${esc(x.titulo)}</h3>
      <p class="mag-lead">${esc(x.intro)}</p>
      <div class="mag-word"><span class="mag-kicker">La Palabra del domingo</span>
        <h4>Lee en tu Biblia: ${esc(e.evangelio.ref)}</h4><p>${esc(e.evangelio.resumen)}</p></div>
      <blockquote class="mag-frase">${esc(x.frase)}</blockquote>
      <h4 class="mag-h4">Para conversar</h4>
      <ol class="mag-qs">${x.preguntas.map((q) => `<li><p>${esc(q)}</p>${lines(2)}</li>`).join("")}</ol>
      <div class="mag-box"><h4>${icon("sparkle")} El desafío de la semana</h4><p>${esc(x.desafio)}</p>
        <label class="mag-done"><span class="mag-tick"></span> ¡Lo hice!</label></div>
      <h4 class="mag-h4">Mi oración</h4>${lines(2)}
    </section>`;
  };
  return intro + d.encuentros.map(enc).join("") +
    `<section class="mag-sec mag-break"><span class="mag-kicker">Para rezar siempre</span><h2>Oración del Camino</h2>
      <blockquote class="mag-prayer">${esc(d.principal.find((s) => s.prayer).prayer).replace(/\n/g, "<br>")}</blockquote></section>`;
}
