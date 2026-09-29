// Pastoral Juvenil Ágape — aplicación principal (vistas públicas y enrutador).

import { CONFIG } from "./config.js";
import * as S from "./store.js";
import { esc, rich, plain, icon, toast, initials } from "./util.js";
import qrcode from "./qrcode.mjs";
import { stringToBytes as utf8Bytes } from "./qrcode-utf8.mjs";

qrcode.stringToBytes = utf8Bytes;

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const viewEl = () => $("#view");

// ---------------------------------------------------------------------------
// Acciones: cualquier elemento con data-action="nombre" dispara actions.nombre
// ---------------------------------------------------------------------------
export const actions = {};
document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-action]");
  if (!t) return;
  const fn = actions[t.dataset.action];
  if (!fn) return;
  e.preventDefault();
  fn(t, e);
});

// ---------------------------------------------------------------------------
// Enrutador por hash (#/itinerario, #/encuentro/0/0.1, #/admin/...)
// ---------------------------------------------------------------------------
const routes = [
  [/^\/$/, viewHome, "inicio"],
  [/^\/comunidad$/, viewCommunity, "comunidad"],
  [/^\/itinerario$/, viewItinerary, "itinerario"],
  [/^\/encuentro\/(\d+)\/([^/]+)$/, viewEncounter, "itinerario"],
  [/^\/materiales$/, viewMaterials, "materiales"],
  [/^\/oracion$/, viewPrayer, "oracion"],
  [/^\/constancia$/, viewCertificate, "itinerario"],
  [/^\/perfil$/, viewProfile, "perfil"],
  [/^\/admin(?:\/(.*))?$/, viewAdmin, "admin"],
];

let lastPath = null;
export async function render() {
  const path = decodeURIComponent(location.hash.replace(/^#/, "")) || "/";
  let match = null, fn = viewNotFound, section = "";
  for (const [re, f, sec] of routes) {
    const m = path.match(re);
    if (m) { match = m; fn = f; section = sec; break; }
  }
  if (section !== "admin" && section !== "perfil" && !S.hasProfile()) {
    location.replace("#/perfil"); return;
  }
  document.body.classList.toggle("is-admin", section === "admin");
  applyTheme();
  renderChrome(section);
  const html = await fn(...(match ? match.slice(1) : []));
  if (html == null) return;
  const v = viewEl();
  v.innerHTML = (section !== "admin" && S.isPreview() ? previewBanner() : "") + html;
  v.classList.remove("view-enter"); void v.offsetWidth; v.classList.add("view-enter");
  if (path !== lastPath) window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  lastPath = path;
  updateInstallSlot();
  afterRender.splice(0).forEach((f) => f());
}
const afterRender = [];
export const onAfterRender = (f) => afterRender.push(f);
window.addEventListener("hashchange", render);

function applyTheme() {
  const c = S.activeCourse();
  document.documentElement.dataset.theme = (c && c.theme) || "amanecer";
  const color = { amanecer: "#2a247f", cenaculo: "#3b0764", esperanza: "#064e3b" }[c?.theme] || "#2a247f";
  $('meta[name="theme-color"]')?.setAttribute("content", color);
}

// ---------------------------------------------------------------------------
// Cabecera, navegación inferior
// ---------------------------------------------------------------------------
const NAV = [
  ["inicio", "#/", "Inicio", "home"],
  ["comunidad", "#/comunidad", "Comunidad", "users"],
  ["itinerario", "#/itinerario", "Itinerario", "route"],
  ["materiales", "#/materiales", "Materiales", "book"],
  ["oracion", "#/oracion", "Oración", "flame"],
];
function renderChrome(section) {
  const cur = (k) => (k === section ? 'aria-current="page"' : "");
  $("#topNav").innerHTML = NAV.map(([k, h, l]) => `<a href="${h}" ${cur(k)}>${l}</a>`).join("");
  $("#bottomNav").innerHTML = NAV.map(([k, h, l, ic]) =>
    `<a href="${h}" ${cur(k)}><span class="ico-wrap">${icon(ic)}</span>${l}</a>`).join("");
  const p = S.getProfile();
  $("#profileChip").innerHTML = section === "admin" && S.isAdmin()
    ? `<span class="avatar">${icon("gear")}</span><span class="name">Gestión</span>`
    : `<span class="avatar">${esc(initials(p.name))}</span><span class="name">${esc(p.name || "Mi perfil")}</span>`;
  $("#profileChip").setAttribute("href", section === "admin" && S.isAdmin() ? "#/admin" : "#/perfil");
}

function previewBanner() {
  return `<div class="draft-bar no-print" style="margin-bottom:18px">
    ${icon("eye")} Estás viendo la vista previa del borrador. Los dirigentes aún ven la versión publicada.
    <span class="spacer"></span>
    <a class="btn btn-sm btn-ghost" href="#/admin/publicar">Volver a Gestión</a>
  </div>`;
}

// ---------------------------------------------------------------------------
// INICIO
// ---------------------------------------------------------------------------
function heroTitle(t) {
  const words = esc(t).split(" ");
  if (words.length < 2) return words.join(" ");
  const last = words.pop();
  return `${words.join(" ")} <em>${last}</em>`;
}
function nextLink(course, st) {
  if (st.complete) return { href: "#/constancia", label: "Ver mi constancia" };
  if (!st.next) return { href: "#/itinerario", label: "Ver itinerario" };
  if (st.next.type === "session") {
    return { href: `#/encuentro/${st.next.phase}/${encodeURIComponent(st.next.session.id)}`, label: st.readSessions ? "Continuar donde quedé" : "Comenzar el itinerario" };
  }
  return { href: "#/itinerario", quiz: st.next.phase, label: `Rendir evaluación de la fase ${course.phases[st.next.phase].phaseNum}` };
}

function viewHome() {
  const c = S.content();
  const course = S.activeCourse();
  const st = S.courseState(course);
  const p = S.getProfile();
  const first = p.name.split(" ")[0];
  const nx = nextLink(course, st);

  return `
  <section class="hero">
    <svg class="hero-cross" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M12 2v20M5 8h14"/></svg>
    <span class="eyebrow">Hola, ${esc(first)} · Camino de formación</span>
    <h1>${heroTitle(course.title)}</h1>
    <p class="lead">${esc(course.description)}</p>
    <div class="actions">
      <a class="btn btn-gold" href="${nx.href}" ${nx.quiz != null ? `data-action="goQuiz" data-phase="${nx.quiz}"` : ""}>${esc(nx.label)} ${icon("arrowR")}</a>
      <a class="btn btn-glass" href="#/comunidad">Guía de servicio</a>
    </div>
    <div class="hero-progress">
      <div class="bar"><i style="width:${st.pct}%"></i></div>
      <span class="small"><b>${st.donePhases}/${course.phases.length}</b> fases</span>
    </div>
  </section>

  <div class="grid grid-4" style="margin-top:20px">
    ${tile("#/comunidad", "👥", "Nuestra comunidad", "Identidad, roles, cargos y reuniones.")}
    ${tile("#/itinerario", "🧭", "Itinerario", `${st.readSessions} de ${st.totalSessions} encuentros preparados.`)}
    ${tile("#/materiales", "🧰", "Materiales", c.materials.title)}
    ${tile("#/oracion", "🕊️", "Oración", c.devotional.title)}
  </div>

  ${st.complete ? `
  <a class="card link" href="#/constancia" style="margin-top:16px;display:flex;gap:16px;align-items:center">
    <span class="tile-ico" style="margin:0;background:var(--ok-soft);color:var(--ok)">${icon("award")}</span>
    <span><strong>¡Completaste el itinerario!</strong><br><span class="muted small">Tu constancia de formación y envío está lista.</span></span>
    <span class="spacer"></span>${icon("right")}
  </a>` : ""}

  <div id="installSlot"></div>
  `;
}
function tile(href, emoji, title, text) {
  return `<a class="card link" href="${href}">
    <div class="tile-ico">${emoji}</div>
    <h3>${esc(title)}</h3>
    <p class="muted small" style="margin-top:6px">${esc(text)}</p>
  </a>`;
}

// ---------------------------------------------------------------------------
// COMUNIDAD
// ---------------------------------------------------------------------------
let selectedRole = 0;
function viewCommunity() {
  const c = S.content();
  const a = c.about || {};
  return `
  <header class="page-head">
    <span class="eyebrow">Bases de nuestra comunidad</span>
    <h1>Guía de servicio pastoral</h1>
    <p>${esc(a.intro || "")}</p>
  </header>

  <div class="section-title"><span class="num">01</span><h2>Identidad y propósito</h2></div>
  <div class="grid grid-3">
    ${(a.identity || []).map((x) => `<article class="card">
      <span class="chip accent">${esc(x.tag)}</span>
      <h3 style="margin-top:12px">${esc(x.title)}</h3>
      <p class="muted small" style="margin-top:6px">${rich(x.text)}</p></article>`).join("")}
  </div>

  <div class="section-title"><span class="num">02</span><h2>Cómo trabajamos</h2></div>
  <div class="grid grid-3">
    ${(a.methods || []).map((x) => `<article class="card">
      <div class="row"><span class="tile-ico" style="margin:0">${esc(x.icon || "✦")}</span><span class="chip">${esc(x.tag)}</span></div>
      <h3 style="margin-top:14px">${esc(x.title)}</h3>
      <p class="muted small" style="margin-top:6px">${rich(x.text)}</p></article>`).join("")}
  </div>

  <div class="section-title"><span class="num">03</span><h2>Roles y responsabilidades</h2></div>
  <div class="role-tabs" role="tablist">
    ${c.roles.map((r, i) => `<button class="role-tab" role="tab" aria-selected="${i === selectedRole}" data-action="role" data-i="${i}">
      <strong>${esc(r.title.replace(/\s*\(.*\)/, ""))}</strong><span>${esc(r.subtitle)}</span></button>`).join("")}
  </div>
  <div id="roleDetail" class="role-detail">${roleDetail(c.roles[selectedRole])}</div>

  <div class="section-title"><span class="num">04</span><h2>Cargos y su duración</h2></div>
  <div class="grid grid-4 ladder">
    ${(a.cargos || []).map((x) => `<article class="card">
      <span class="chip">${esc(x.tag)}</span>
      <h3 style="margin-top:12px">${esc(x.title)}</h3>
      <p class="muted small" style="margin-top:6px">${rich(x.text)}</p>
      ${x.note ? `<div class="note accent xs" style="margin-top:12px">${rich(x.note)}</div>` : ""}</article>`).join("")}
  </div>

  <div class="section-title"><span class="num">05</span><h2>Reuniones y encuentros</h2></div>
  <div class="stack" style="--gap:12px">
    ${(a.meetings || []).map((x) => `<article class="card meeting">
      <div class="freq">${esc(x.freq)}</div>
      <div style="flex:1">
        <h3>${esc(x.title)}</h3>
        <p class="muted small" style="margin-top:4px">${rich(x.text)}</p>
        <div class="chip accent" style="margin-top:10px">${icon("users")} ${esc(x.who)}</div>
      </div></article>`).join("")}
  </div>`;
}
function roleDetail(r) {
  if (!r) return "";
  return `<article class="card">
    <div class="row-wrap">
      <span class="eyebrow">${esc(r.tag)}</span>
      <span class="spacer"></span>
      <span class="chip warn">${esc(r.badge)}</span>
      <span class="chip">${esc(r.duration)}</span>
    </div>
    <h3 class="display" style="font-size:1.6rem;margin-top:10px">${esc(r.title)}</h3>
    <p style="margin-top:8px">${rich(r.responsibility)}</p>
    <ul class="fn-list">${(r.functions || []).map((f) => `<li>${rich(f)}</li>`).join("")}</ul>
  </article>`;
}
actions.role = (el) => {
  selectedRole = +el.dataset.i;
  $$(".role-tab").forEach((b, i) => b.setAttribute("aria-selected", i === selectedRole));
  $("#roleDetail").innerHTML = roleDetail(S.content().roles[selectedRole]);
};

// ---------------------------------------------------------------------------
// ITINERARIO
// ---------------------------------------------------------------------------
let expanded = {}; // courseId:phaseIdx -> bool
let pendingQuiz = null;

function ring(pct) {
  const r = 40, c = 2 * Math.PI * r;
  return `<div class="ring"><svg viewBox="0 0 92 92">
    <circle cx="46" cy="46" r="${r}" fill="none" stroke="var(--line)" stroke-width="8"/>
    <circle cx="46" cy="46" r="${r}" fill="none" stroke="var(--accent)" stroke-width="8" stroke-linecap="round"
      stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - pct / 100)}"/></svg>
    <span class="val">${pct}%</span></div>`;
}

function viewItinerary() {
  const c = S.content();
  const course = S.activeCourse();
  const st = S.courseState(course);
  if (pendingQuiz != null) { const q = pendingQuiz; pendingQuiz = null; onAfterRender(() => openQuiz(q)); }

  return `
  <header class="page-head">
    <span class="eyebrow">Itinerario formativo</span>
    <h1>${esc(course.title)}</h1>
    <p>${esc(course.description)}</p>
  </header>

  ${c.courses.length > 1 ? `<div class="course-switch" style="margin:14px 0 4px" aria-label="Elegir itinerario">
    ${c.courses.map((x) => `<button aria-pressed="${x.id === course.id}" data-action="course" data-id="${esc(x.id)}">${esc(x.title)}</button>`).join("")}
  </div>` : ""}

  <div class="card progress-card" style="margin-top:16px">
    ${ring(st.pct)}
    <div>
      <strong>${st.complete ? "¡Itinerario completado!" : st.donePhases ? "Vas muy bien" : "Tu camino comienza aquí"}</strong>
      <p class="muted small" style="margin-top:2px">${st.donePhases} de ${course.phases.length} fases aprobadas · ${st.readSessions} de ${st.totalSessions} encuentros preparados</p>
      <div class="row-wrap" style="margin-top:12px">
        ${st.complete ? `<a class="btn btn-sm btn-ok" href="#/constancia">${icon("award")} Mi constancia</a>` : ""}
        <button class="btn btn-sm btn-soft" data-action="shareProgress">${icon("chat")} Enviar avance</button>
        <button class="btn btn-sm btn-ghost" data-action="resetProgress">Reiniciar</button>
      </div>
    </div>
  </div>

  <label class="search" style="display:block;margin:18px 0 22px">
    ${icon("search")}<span class="sr-only">Buscar encuentro</span>
    <input id="searchInput" type="search" placeholder="Buscar tema: acogida, Zaqueo, juego, descanso…" autocomplete="off">
  </label>

  <div class="path" id="path">
    ${course.phases.map((ph, i) => phaseBlock(course, ph, i, st)).join("")}
  </div>`;
}

function phaseBlock(course, ph, i, st) {
  const s = st.phases[i];
  const key = course.id + ":" + i;
  const isCurrent = st.next && st.next.phase === i;
  const exp = s.open && (expanded[key] ?? isCurrent);
  const cls = s.done ? "is-done" : s.open ? "is-open" : "is-locked";
  const qn = ph.quiz?.questions?.length || 0;
  return `
  <section class="phase ${cls}" data-phase="${i}">
    <div class="phase-node">${s.done ? icon("check") : s.open ? esc(ph.phaseNum) : icon("lock")}</div>
    <div class="card phase-card" data-expanded="${!!exp}">
      <button class="phase-head" ${s.open ? `data-action="togglePhase" data-key="${esc(key)}"` : "disabled"} aria-expanded="${!!exp}">
        <div>
          <div class="row-wrap" style="gap:6px;margin-bottom:6px">
            <span class="chip ${s.done ? "ok" : s.open ? "accent" : ""}">Fase ${esc(ph.phaseNum)} · ${s.done ? "Aprobada" : s.open ? "En curso" : "Bloqueada"}</span>
            ${s.score ? `<span class="chip">${s.score.right}/${s.score.total} en evaluación</span>` : ""}
          </div>
          <h3>${esc(ph.title)}</h3>
          <p class="muted small" style="margin-top:4px">${esc(ph.desc)}</p>
          ${!s.open ? `<p class="xs muted" style="margin-top:8px">Aprueba la evaluación de la fase anterior para desbloquearla.</p>` : ""}
        </div>
        ${s.open ? `<span class="caret">${icon("down")}</span>` : ""}
      </button>
      ${s.open ? `<div class="phase-body" ${exp ? "" : "hidden"}>
        ${ph.sessions.map((se) => {
          const read = st.p.read[S.sessionKey(i, se)];
          return `<a class="session-row ${read ? "read" : ""}" href="#/encuentro/${i}/${encodeURIComponent(se.id)}" data-search="${esc(plain([se.title, se.objective, se.bible, se.dynamic].join(" ")).toLowerCase())}">
            <span class="session-num">${read ? icon("check") : esc(se.id)}</span>
            <span style="min-width:0"><h4>${esc(se.title)}</h4><p>${esc(se.objective)}</p></span>
            <span class="arrow">${icon("right")}</span></a>`;
        }).join("")}
        <div class="phase-foot">
          <span class="xs muted">${s.read} de ${s.total} encuentros preparados</span>
          ${qn ? `<button class="btn btn-sm ${s.done ? "btn-ghost" : "btn-primary"}" data-action="quiz" data-phase="${i}">
            ${s.done ? "Repasar evaluación" : `Rendir evaluación · ${qn} pregunta${qn > 1 ? "s" : ""}`}</button>` : ""}
        </div>
      </div>` : ""}
    </div>
  </section>`;
}

actions.togglePhase = (el) => {
  const card = el.closest(".phase-card");
  const open = card.dataset.expanded !== "true";
  card.dataset.expanded = open;
  el.setAttribute("aria-expanded", open);
  card.querySelector(".phase-body").hidden = !open;
  expanded[el.dataset.key] = open;
};
actions.course = (el) => { S.setActiveCourse(el.dataset.id); render(); };
actions.quiz = (el) => openQuiz(+el.dataset.phase);
actions.goQuiz = (el) => { pendingQuiz = +el.dataset.phase; location.hash = "#/itinerario"; };
actions.resetProgress = () => {
  const c = S.activeCourse();
  if (confirm(`¿Reiniciar tu progreso en "${c.title}"? Se borrarán tus fases aprobadas y encuentros marcados.`)) {
    S.resetProgress(c.id); expanded = {}; render(); toast("Progreso reiniciado");
  }
};
actions.shareProgress = () => {
  const c = S.activeCourse(), st = S.courseState(c), p = S.getProfile();
  const msg = `¡Paz y bien! Soy ${p.name}${p.parish ? ` (${p.parish})` : ""}. Mi avance en el itinerario "${c.title}" de Ágape: ${st.donePhases} de ${c.phases.length} fases aprobadas y ${st.readSessions} de ${st.totalSessions} encuentros preparados.`;
  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
};

document.addEventListener("input", (e) => {
  if (e.target.id !== "searchInput") return;
  const q = e.target.value.trim().toLowerCase();
  $$(".phase").forEach((ph) => {
    const body = ph.querySelector(".phase-body");
    if (!body) { ph.hidden = !!q; return; }
    let any = 0;
    body.querySelectorAll(".session-row").forEach((r) => {
      const hit = !q || r.dataset.search.includes(q);
      r.hidden = !hit; if (hit) any++;
    });
    if (q) { body.hidden = !any; ph.hidden = !any; ph.querySelector(".phase-card").dataset.expanded = !!any; }
    else { ph.hidden = false; const card = ph.querySelector(".phase-card"); body.hidden = card.dataset.expanded !== "true"; }
  });
});

// ---------------------------------------------------------------------------
// ENCUENTRO
// ---------------------------------------------------------------------------
function viewEncounter(phaseIdx, sid) {
  const course = S.activeCourse();
  const i = +phaseIdx;
  const ph = course.phases[i];
  const se = ph && ph.sessions.find((s) => s.id === sid);
  if (!se) return viewNotFound();
  const st = S.courseState(course);
  if (!st.phases[i].open) {
    return `<div class="card" style="text-align:center;padding:40px">
      <div class="tile-ico" style="margin:0 auto 12px">${icon("lock")}</div>
      <h2 class="display">Esta fase aún está bloqueada</h2>
      <p class="muted" style="margin-top:6px">Aprueba la evaluación de la fase anterior para abrir sus encuentros.</p>
      <a class="btn btn-primary" style="margin-top:18px" href="#/itinerario">Volver al itinerario</a></div>`;
  }
  const key = S.sessionKey(i, se);
  const read = !!st.p.read[key];
  const flat = [];
  course.phases.forEach((p, pi) => { if (st.phases[pi].open) p.sessions.forEach((s) => flat.push([pi, s])); });
  const pos = flat.findIndex(([pi, s]) => pi === i && s.id === se.id);
  const prev = flat[pos - 1], next = flat[pos + 1];
  const lastInPhase = ph.sessions[ph.sessions.length - 1].id === se.id;
  const idxInPhase = ph.sessions.findIndex((s) => s.id === se.id) + 1;

  return `
  <nav class="crumbs no-print"><a href="#/itinerario">Itinerario</a>${icon("right")}<span>Fase ${esc(ph.phaseNum)}</span>${icon("right")}<span>Encuentro ${esc(se.id)}</span></nav>
  <header class="enc-head">
    <h1>${esc(se.title)}</h1>
    <div class="row-wrap"><span class="chip accent">${esc(se.time || "60 min")}</span><span class="chip">${esc(ph.title)}</span></div>
  </header>

  <div class="enc-layout" style="margin-top:24px">
    <article>
      <section class="enc-block"><span class="eyebrow">Objetivo del encuentro</span><p>${rich(se.objective)}</p></section>
      <section class="enc-block"><span class="eyebrow">Palabra de Dios y mensaje de fe</span><div class="scripture">${rich(se.bible)}</div></section>
      <section class="enc-block"><span class="eyebrow">Clave para comprender a los jóvenes</span><p>${rich(se.dynamic)}</p></section>
      <section class="enc-block"><span class="eyebrow">Preguntas para conversar</span>
        <ol class="q-list">${(se.questions || []).map((q) => `<li>${rich(q)}</li>`).join("")}</ol></section>
      <section class="enc-block"><span class="eyebrow">Oración y compromiso final</span><div class="prayer">${rich(se.prayer)}</div></section>
    </article>

    <aside class="enc-aside no-print">
      <div class="card stack" style="--gap:12px">
        <div class="row"><span class="xs muted">Encuentro ${idxInPhase} de ${ph.sessions.length} en esta fase</span></div>
        <button class="btn btn-block ${read ? "btn-ok" : "btn-primary"}" data-action="toggleRead" data-key="${esc(key)}">
          ${read ? `${icon("check")} Preparado` : "Marcar como preparado"}</button>
        <div class="row" style="gap:8px">
          <button class="btn btn-sm btn-ghost" style="flex:1" data-action="print">${icon("print")} Imprimir</button>
          <button class="btn btn-sm btn-ghost" style="flex:1" data-action="shareEncounter" data-phase="${i}" data-id="${esc(se.id)}">${icon("chat")} Compartir</button>
        </div>
        ${lastInPhase && ph.quiz?.questions?.length && !st.phases[i].done ? `<div class="note accent small">Terminaste los encuentros de esta fase. <a href="#" data-action="quiz" data-phase="${i}"><b>Rendir la evaluación →</b></a></div>` : ""}
      </div>
    </aside>
  </div>

  <nav class="enc-nav no-print">
    ${prev ? `<a href="#/encuentro/${prev[0]}/${encodeURIComponent(prev[1].id)}"><div class="card"><span class="xs muted">${icon("arrowL", "inline")} Anterior</span><br><b>${esc(prev[1].title)}</b></div></a>` : "<span></span>"}
    ${lastInPhase && ph.quiz?.questions?.length && !st.phases[i].done
      ? `<a href="#" data-action="quiz" data-phase="${i}"><div class="card next" style="background:var(--accent-soft);border-color:transparent"><span class="xs muted">Siguiente paso</span><br><b>Evaluación de la fase ${esc(ph.phaseNum)}</b></div></a>`
      : next ? `<a href="#/encuentro/${next[0]}/${encodeURIComponent(next[1].id)}"><div class="card next"><span class="xs muted">Siguiente</span><br><b>${esc(next[1].title)}</b></div></a>` : "<span></span>"}
  </nav>`;
}
actions.toggleRead = (el) => {
  const on = S.toggleRead(S.activeCourse().id, el.dataset.key);
  el.className = "btn btn-block " + (on ? "btn-ok" : "btn-primary");
  el.innerHTML = on ? `${icon("check")} Preparado` : "Marcar como preparado";
  if (on) toast("Encuentro marcado como preparado");
};
actions.print = () => window.print();
actions.shareEncounter = (el) => {
  const c = S.activeCourse();
  const se = c.phases[+el.dataset.phase].sessions.find((s) => s.id === el.dataset.id);
  const text = `*${plain(se.title)}* (Encuentro ${se.id})\n\n🎯 ${plain(se.objective)}\n\n📖 ${plain(se.bible)}\n\n🙏 ${plain(se.prayer)}`;
  if (navigator.share) navigator.share({ title: plain(se.title), text }).catch(() => {});
  else window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
};

// ---------------------------------------------------------------------------
// EVALUACIÓN DE FASE
// ---------------------------------------------------------------------------
let Q = null;
function openQuiz(phaseIdx) {
  const course = S.activeCourse();
  const ph = course.phases[phaseIdx];
  if (!ph?.quiz?.questions?.length) return;
  if (!S.courseState(course).phases[phaseIdx].open) return toast("Esta fase aún está bloqueada", "");
  Q = { course, phaseIdx, quiz: ph.quiz, step: 0, selected: null, answered: false, results: [] };
  const d = $("#quizDialog");
  d.querySelector("[data-q-badge]").textContent = ph.quiz.badge || `Evaluación fase ${ph.phaseNum}`;
  d.querySelector("[data-q-title]").textContent = ph.quiz.title || "Discernimiento pastoral";
  renderQuiz();
  d.showModal();
}
function renderQuiz() {
  const d = $("#quizDialog");
  const body = d.querySelector(".sheet-body");
  const foot = d.querySelector(".sheet-foot");
  const qs = Q.quiz.questions;
  const bar = `<div class="quiz-progress">${qs.map((_, i) => {
    const r = Q.results[i]; return `<i class="${r === true ? "right" : r === false ? "wrong" : i === Q.step ? "done" : ""}"></i>`;
  }).join("")}</div>`;

  if (Q.step >= qs.length) {
    const right = Q.results.filter(Boolean).length, total = qs.length;
    const need = Math.ceil(total * CONFIG.passRate);
    const passed = right >= need;
    const prog = S.recordQuiz(Q.course.id, Q.phaseIdx, right, total, passed);
    const isLast = Q.phaseIdx === Q.course.phases.length - 1;
    let finished = false;
    if (passed && isLast) {
      const before = prog.completedDate;
      const done = S.completeCourse(Q.course.id);
      finished = true;
      if (!before) sendCompletion(Q.course, done);
    }
    body.innerHTML = `${bar}
      <div style="text-align:center;padding:10px 0 4px">
        <div class="score-big" style="color:${passed ? "var(--ok)" : "var(--warn)"}">${right}/${total}</div>
        <h3 class="display" style="font-size:1.5rem;margin-top:10px">${passed ? (finished ? "¡Completaste el itinerario!" : "¡Fase aprobada!") : "Casi, vuelve a intentarlo"}</h3>
        <p class="muted" style="margin-top:8px;max-width:44ch;margin-inline:auto">${passed
          ? (finished ? "Has recorrido todo el camino con corazón pastoral. Tu constancia de formación y envío ya está lista." : "Se abrió la siguiente fase del itinerario. ¡Sigue adelante!")
          : `Necesitas al menos ${need} respuesta${need > 1 ? "s" : ""} adecuada${need > 1 ? "s" : ""}. Repasa los encuentros de la fase y vuelve cuando quieras; lo importante es el discernimiento, no la nota.`}</p>
      </div>`;
    foot.innerHTML = passed
      ? (finished ? `<span class="spacer"></span><button class="btn btn-primary" data-action="quizToCert">${icon("award")} Ver mi constancia</button>`
                  : `<span class="spacer"></span><button class="btn btn-primary" data-action="quizClose">Continuar</button>`)
      : `<button class="btn btn-ghost" data-action="quizClose">Repasar encuentros</button><span class="spacer"></span><button class="btn btn-primary" data-action="quizRetry">Intentar de nuevo</button>`;
    return;
  }

  const q = qs[Q.step];
  body.innerHTML = `${bar}
    <p class="quiz-q">${rich(q.q.replace(/^\s*\d+\.\s*/, ""))}</p>
    <div class="opts" role="radiogroup">
      ${q.options.map((o, i) => {
        let cls = "";
        if (Q.answered) { if (i === q.correct) cls = "is-right"; else if (i === Q.selected) cls = "is-wrong"; }
        return `<button class="opt ${cls}" role="radio" aria-checked="${i === Q.selected}" data-action="quizPick" data-i="${i}" ${Q.answered ? "disabled" : ""}>
          <span class="letter">${"ABCDEFG"[i]}</span><span>${rich(o)}</span></button>`;
      }).join("")}
    </div>
    ${Q.answered ? `<div class="note ${Q.selected === q.correct ? "ok" : "warn"} feedback"><b>${Q.selected === q.correct ? "Respuesta adecuada." : "Orientación pastoral."}</b> ${rich(q.feedback)}</div>` : ""}`;
  foot.innerHTML = `<span class="xs muted">Pregunta ${Q.step + 1} de ${qs.length}</span><span class="spacer"></span>
    ${Q.answered
      ? `<button class="btn btn-primary" data-action="quizNext">${Q.step + 1 < qs.length ? "Siguiente" : "Ver resultado"} ${icon("arrowR")}</button>`
      : `<button class="btn btn-primary" data-action="quizAnswer" ${Q.selected == null ? "disabled" : ""}>Responder</button>`}`;
}
actions.quizPick = (el) => { if (Q.answered) return; Q.selected = +el.dataset.i; renderQuiz(); };
actions.quizAnswer = () => {
  if (Q.selected == null) return;
  Q.answered = true; Q.results[Q.step] = Q.selected === Q.quiz.questions[Q.step].correct; renderQuiz();
};
actions.quizNext = () => { Q.step++; Q.selected = null; Q.answered = false; renderQuiz(); $("#quizDialog .sheet-body").scrollTop = 0; };
actions.quizRetry = () => { Q.step = 0; Q.selected = null; Q.answered = false; Q.results = []; renderQuiz(); };
actions.quizClose = () => { $("#quizDialog").close(); };
actions.quizToCert = () => { $("#quizDialog").close(); location.hash = "#/constancia"; };
$("#quizDialog")?.addEventListener("close", () => { if (Q) { Q = null; if (!location.hash.startsWith("#/constancia")) render(); } });

function sendCompletion(course, prog) {
  if (!CONFIG.sheetsUrl) return;
  const p = S.getProfile();
  fetch(CONFIG.sheetsUrl, {
    method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain" },
    body: JSON.stringify({ name: p.name, parish: p.parish, course: course.title, certCode: prog.certCode, result: "Completado" }),
  }).catch(() => {});
}

// ---------------------------------------------------------------------------
// CONSTANCIA
// ---------------------------------------------------------------------------
function viewCertificate() {
  const course = S.activeCourse();
  const st = S.courseState(course);
  if (!st.complete) {
    return `<div class="card" style="text-align:center;padding:40px;max-width:560px;margin:4vh auto">
      <div class="tile-ico" style="margin:0 auto 12px">${icon("award")}</div>
      <h2 class="display">Tu constancia te espera</h2>
      <p class="muted" style="margin-top:6px">Aprueba las ${course.phases.length} fases de "${esc(course.title)}" para recibirla. Llevas ${st.donePhases}.</p>
      <a class="btn btn-primary" style="margin-top:18px" href="#/itinerario">Ir al itinerario</a></div>`;
  }
  const p = S.getProfile();
  const date = new Date(st.p.completedDate || Date.now()).toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" });
  const sessions = st.totalSessions;
  const qr = qrcode(0, "M");
  qr.addData(`PASTORAL JUVENIL ÁGAPE\nConstancia de Formación y Envío\nItinerario: ${course.title}\nDirigente: ${p.name}\nComunidad: ${p.parish}\nCódigo: ${st.p.certCode}\nFecha: ${date}`);
  qr.make();
  const svg = qr.createSvgTag({ cellSize: 3, margin: 0, scalable: true });

  return `
  <nav class="crumbs no-print" style="margin-bottom:14px"><a href="#/itinerario">Itinerario</a>${icon("right")}<span>Constancia</span></nav>
  <div class="certificate">
    <svg class="seal" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="32" cy="32" r="29"/><circle cx="32" cy="32" r="24" stroke-dasharray="2 3"/><path d="M32 16v32M22 26h20" stroke-width="3" stroke-linecap="round"/></svg>
    <div class="kicker">Pastoral Juvenil Ágape</div>
    <h2>Constancia de Formación y Envío</h2>
    <div class="small" style="color:#6f6a7e">Itinerario formativo «${esc(course.title)}»</div>
    <div class="to">Otorgada a</div>
    <div class="who">${esc(p.name)}</div>
    <div class="small" style="color:#6f6a7e;font-weight:600">${esc(p.parish)}</div>
    <p class="body">Por haber completado las <b>${course.phases.length} fases (${sessions} encuentros)</b> y sus evaluaciones de discernimiento pastoral, demostrando comprensión del servicio, escucha activa y compromiso evangélico.</p>
    <div class="meta">
      <div class="qr">${svg}</div>
      <div class="code">Código<br><b>${esc(st.p.certCode)}</b><br><br>Fecha<br><b>${esc(date)}</b></div>
    </div>
    <div class="signs"><div><b>Equipo de Asesores</b><br>Pastoral Parroquial</div><div><b>Coordinación General</b><br>Pastoral Ágape</div></div>
  </div>
  <div class="row-wrap no-print" style="justify-content:center;margin-top:20px">
    <button class="btn btn-primary" data-action="print">${icon("print")} Imprimir o guardar PDF</button>
    <button class="btn btn-soft" data-action="shareCompletion">${icon("chat")} Avisar por WhatsApp</button>
  </div>`;
}
actions.shareCompletion = () => {
  const c = S.activeCourse(), st = S.courseState(c), p = S.getProfile();
  const msg = `¡Paz y bien! Comunico que he culminado el itinerario "${c.title}".\n\n👤 Dirigente: ${p.name}\n⛪ Comunidad: ${p.parish}\n🔑 Código: ${st.p.certCode}`;
  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
};

// ---------------------------------------------------------------------------
// MATERIALES Y ORACIÓN
// ---------------------------------------------------------------------------
function cardHTML(c, kind) {
  const tag = `<span class="chip ${c.type === "crisis" ? "danger" : "accent"}">${esc(c.tag || "")}</span>`;
  const head = `${tag}<h3 style="margin-top:12px">${esc(c.title)}</h3>`;
  if (c.type === "list") {
    return `<article class="card">${head}<ul class="fn-list" style="grid-template-columns:1fr">${(c.items || []).map((i) => `<li class="rich">${rich(i)}</li>`).join("")}</ul></article>`;
  }
  if (c.type === "crisis") {
    const tones = ["ok", "warn", "danger"];
    return `<article class="card">${head}<div class="stack" style="--gap:8px;margin-top:14px">
      ${(c.items || []).map((i, n) => `<div class="note ${tones[n] === "danger" ? "" : tones[n]} rich small" ${tones[n] === "danger" ? 'style="background:var(--danger-soft);color:var(--danger);border-color:transparent"' : ""}>${rich(i)}</div>`).join("")}
    </div></article>`;
  }
  if (c.type === "action") {
    const has = !!(c.url && /^https?:\/\//.test(c.url));
    return `<article class="card" style="display:flex;flex-direction:column">${head}
      <p class="muted small" style="margin:8px 0 16px">${rich(c.text)}</p><span class="spacer"></span>
      ${has ? `<a class="btn btn-primary btn-block" href="${esc(c.url)}" target="_blank" rel="noopener">${esc(c.btnText || "Abrir")} ${icon("arrowR")}</a>`
            : `<button class="btn btn-ghost btn-block" disabled>${esc(c.btnText || "Abrir")} · próximamente</button>`}
    </article>`;
  }
  if (kind === "prayer") {
    return `<article class="card">${head}<div class="prayer prose-pre" style="text-align:left;font-size:1.08rem">${rich(c.text)}</div></article>`;
  }
  return `<article class="card">${head}<p class="muted small rich prose-pre" style="margin-top:8px">${rich(c.text)}</p></article>`;
}
function viewMaterials() {
  const m = S.content().materials;
  return `<header class="page-head"><span class="eyebrow">Herramientas de la pastoral</span><h1>${esc(m.title)}</h1><p>${esc(m.desc)}</p></header>
    <div class="grid grid-2" style="margin-top:18px">${m.cards.map((c) => cardHTML(c, "material")).join("")}</div>`;
}
function viewPrayer() {
  const d = S.content().devotional;
  return `<header class="page-head"><span class="eyebrow">Vida de oración</span><h1>${esc(d.title)}</h1><p>${esc(d.desc)}</p></header>
    <div class="grid grid-2" style="margin-top:18px">${d.cards.map((c) => cardHTML(c, "prayer")).join("")}</div>`;
}

// ---------------------------------------------------------------------------
// PERFIL / BIENVENIDA
// ---------------------------------------------------------------------------
function viewProfile() {
  const p = S.getProfile();
  const isNew = !p.name;
  return `
  <div class="welcome">
    ${isNew ? `<section class="hero" style="margin-bottom:18px">
      <span class="eyebrow">Bienvenido a Ágape</span>
      <h1>Tu camino de <em>formación</em></h1>
      <p class="lead">Cuéntanos quién eres para acompañar tu avance y preparar tu constancia al final del itinerario.</p>
    </section>` : `<header class="page-head"><span class="eyebrow">Mi perfil</span><h1>${esc(p.name)}</h1></header>`}
    <form class="card stack" id="profileForm" style="--gap:14px">
      <div class="field"><label for="pfName">Nombre y apellido</label>
        <input class="input big" id="pfName" name="name" required autocomplete="name" value="${esc(p.name)}" placeholder="Ej: Camila Soto"></div>
      <div class="field"><label for="pfParish">Capilla o parroquia</label>
        <input class="input big" id="pfParish" name="parish" value="${esc(p.parish)}" placeholder="Ej: Parroquia San José"></div>
      <p class="xs muted">Tus datos y tu avance se guardan en este dispositivo. Tu nombre aparecerá en la constancia.</p>
      <button class="btn btn-primary btn-block" type="submit">${isNew ? "Comenzar" : "Guardar cambios"}</button>
    </form>
    ${!isNew ? `<div id="installSlot" style="margin-top:14px"></div>
      <p class="xs muted" style="text-align:center;margin-top:18px">¿Eres del equipo coordinador? <a href="#/admin">Entrar a Gestión</a></p>` : ""}
  </div>`;
}
document.addEventListener("submit", (e) => {
  if (e.target.id !== "profileForm") return;
  e.preventDefault();
  const f = new FormData(e.target);
  const name = String(f.get("name") || "").trim();
  if (!name) return;
  const wasNew = !S.hasProfile();
  S.saveProfile({ name, parish: String(f.get("parish") || "").trim() });
  toast(wasNew ? `¡Bienvenido, ${name.split(" ")[0]}!` : "Perfil actualizado");
  location.hash = wasNew ? "#/" : "#/perfil";
  if (!wasNew) render();
});

function viewNotFound() {
  return `<div class="card" style="text-align:center;padding:40px"><h2 class="display">No encontramos esta página</h2>
    <a class="btn btn-primary" style="margin-top:16px" href="#/">Volver al inicio</a></div>`;
}

// ---------------------------------------------------------------------------
// GESTIÓN (carga diferida)
// ---------------------------------------------------------------------------
async function viewAdmin(sub = "") {
  const m = await import("./admin.js");
  return m.renderAdmin(sub || "", { actions, render, onAfterRender });
}

// ---------------------------------------------------------------------------
// App instalable (PWA)
// ---------------------------------------------------------------------------
let deferredInstall = null;
function updateInstallSlot() { const s = $("#installSlot"); if (s) s.innerHTML = installCard(); }
window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferredInstall = e; updateInstallSlot(); });
window.addEventListener("appinstalled", () => { deferredInstall = null; updateInstallSlot(); toast("App instalada"); });
const isStandalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
function installCard() {
  if (isStandalone()) return "";
  if (deferredInstall) {
    return `<div class="card install-bar" style="margin-top:16px">
      <span class="tile-ico" style="margin:0">${icon("phone")}</span>
      <div style="flex:1"><strong>Lleva Ágape en tu celular</strong><p class="muted small">Instálala y úsala incluso sin internet.</p></div>
      <button class="btn btn-primary btn-sm" data-action="install">Instalar</button></div>`;
  }
  if (isIOS()) {
    return `<div class="card install-bar" style="margin-top:16px">
      <span class="tile-ico" style="margin:0">${icon("phone")}</span>
      <div style="flex:1"><strong>Agrégala a tu pantalla de inicio</strong><p class="muted small">En Safari toca Compartir y luego «Agregar a inicio».</p></div></div>`;
  }
  return "";
}
actions.install = async () => {
  if (!deferredInstall) return;
  deferredInstall.prompt();
  await deferredInstall.userChoice.catch(() => {});
  deferredInstall = null; updateInstallSlot();
};
// ---------------------------------------------------------------------------
// Arranque
// ---------------------------------------------------------------------------
async function boot() {
  try {
    await S.loadContent();
  } catch (e) {
    viewEl().innerHTML = `<div class="card" style="text-align:center;padding:40px"><h2 class="display">No se pudo cargar el contenido</h2>
      <p class="muted" style="margin-top:8px">Revisa tu conexión e inténtalo de nuevo.</p>
      <button class="btn btn-primary" style="margin-top:16px" onclick="location.reload()">Reintentar</button></div>`;
    return;
  }
  await render();
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}
boot();
