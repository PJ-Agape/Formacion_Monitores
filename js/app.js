// Pastoral Juvenil Ágape — aplicación principal (vistas públicas y enrutador).

import { CONFIG } from "./config.js";
import * as S from "./store.js";
import * as cloud from "./cloud.js";
import { esc, rich, plain, icon, toast, initials } from "./util.js";
import qrcode from "./qrcode.mjs";
import { stringToBytes as utf8Bytes } from "./qrcode-utf8.mjs";
import * as wall from "./muro.js";
import * as camino from "./encuentros.js";

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
// Enrutador por hash (#/itinerario, #/unidad/0/1.1, #/cuaderno, #/admin/...)
// ---------------------------------------------------------------------------
const routes = [
  [/^\/$/, viewHome, "inicio"],
  [/^\/muro$/, () => wall.viewWall(), "muro"],
  [/^\/muro\/([^/]+)$/, (id) => wall.viewPost(id), "muro"],
  [/^\/encuentros$/, () => camino.viewHub(), "comunidad"],
  [/^\/encuentros\/([a-z]+)$/, (k) => camino.viewRevista(k), "comunidad"],
  [/^\/comunidad$/, viewCommunity, "comunidad"],
  [/^\/itinerario$/, viewItinerary, "itinerario"],
  [/^\/(?:unidad|encuentro)\/(\d+)\/([^/]+)$/, viewEncounter, "itinerario"],
  [/^\/cuaderno$/, viewNotebook, "itinerario"],
  [/^\/materiales$/, viewMaterials, "materiales"],
  [/^\/oracion$/, viewPrayer, "oracion"],
  [/^\/constancia$/, viewCertificate, "itinerario"],
  [/^\/perfil$/, viewProfile, "perfil"],
  [/^\/verificar\/(.+)$/, viewVerify, "verificar"],
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
  leaveHooks.splice(0).forEach((f) => { try { f(); } catch {} });
  if (!cloud.enabled && section !== "admin" && section !== "perfil" && section !== "verificar" && !S.hasProfile()) {
    location.replace("#/perfil"); return;
  }
  // Con cuentas: el curso pide iniciar sesión; el resto de la app queda abierto.
  if (cloud.enabled && section === "itinerario" && !cloud.state().ready) fn = viewLogin;
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
// Tareas al salir de una vista (p. ej. dejar de escuchar el muro en tiempo real).
const leaveHooks = [];
const onLeave = (f) => leaveHooks.push(f);
window.addEventListener("hashchange", render);

function applyTheme() {
  const c = S.activeCourse();
  document.documentElement.dataset.theme = (c && c.theme) || "amanecer";
  const color = { amanecer: "#1351a4", cenaculo: "#0a2a6e", esperanza: "#0a3a78" }[c?.theme] || "#1351a4";
  $('meta[name="theme-color"]')?.setAttribute("content", color);
}

// ---------------------------------------------------------------------------
// Cabecera, navegación inferior
// ---------------------------------------------------------------------------
const NAV = [
  ["inicio", "#/", "Inicio", "home"],
  ["muro", "#/muro", "Muro", "chat"],
  ["comunidad", "#/comunidad", "Comunidad", "users"],
  ["itinerario", "#/itinerario", "Curso", "route"],
  ["materiales", "#/materiales", "Materiales", "book"],
  ["oracion", "#/oracion", "Oración", "flame"],
];
function renderChrome(section) {
  const cur = (k) => (k === section ? 'aria-current="page"' : "");
  $("#topNav").innerHTML = NAV.map(([k, h, l]) => `<a href="${h}" ${cur(k)}>${l}</a>`).join("");
  $("#bottomNav").innerHTML = NAV.map(([k, h, l, ic]) =>
    `<a href="${h}" ${cur(k)}><span class="ico-wrap">${icon(ic)}</span>${l}</a>`).join("");
  const p = S.getProfile();
  const inAdmin = section === "admin" && (cloud.enabled ? cloud.state().isAdmin : S.isAdmin());
  const guest = cloud.enabled && !cloud.state().ready;
  $("#profileChip").innerHTML = inAdmin
    ? `<span class="avatar">${icon("gear")}</span><span class="name">Gestión</span>`
    : guest ? `<span class="avatar">${icon("users")}</span><span class="name">Ingresar</span>`
    : `<span class="avatar">${esc(initials(p.name))}</span><span class="name">${esc(p.name || "Mi perfil")}</span>`;
  $("#profileChip").setAttribute("href", inAdmin ? "#/admin" : "#/perfil");
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
    return { href: `#/unidad/${st.next.phase}/${encodeURIComponent(st.next.session.id)}`, label: st.readSessions ? "Continuar donde quedé" : "Comenzar el curso" };
  }
  return { href: "#/itinerario", quiz: st.next.phase, label: `Rendir evaluación del módulo ${course.phases[st.next.phase].phaseNum}` };
}

function viewHome() {
  onAfterRender(() => wall.homeHighlight());
  const c = S.content();
  const course = S.activeCourse();
  const st = S.courseState(course);
  const p = S.getProfile();
  const first = (p.name || "").split(" ")[0];
  const nx = nextLink(course, st);

  return `
  <section class="hero">
    <img class="hero-logo" src="icons/logo-320.webp" width="150" height="150" alt="Logo Ágape Joven PJ, Parroquia San Miguel de Yungay">
    <span class="eyebrow">${first ? `Hola, ${esc(first)} · ` : ""}Camino de formación</span>
    <h1>${heroTitle(course.title)}</h1>
    <p class="lead">${esc(course.description)}</p>
    <div class="actions">
      <a class="btn btn-gold" href="${nx.href}" ${nx.quiz != null ? `data-action="goQuiz" data-phase="${nx.quiz}"` : ""}>${esc(nx.label)} ${icon("arrowR")}</a>
      <a class="btn btn-glass" href="#/comunidad">Guía de servicio</a>
    </div>
    <div class="hero-progress">
      <div class="bar"><i style="width:${st.totalSessions ? Math.round((st.readSessions / st.totalSessions) * 100) : 0}%"></i></div>
      <span class="small"><b>${st.readSessions}/${st.totalSessions}</b> unidades</span>
    </div>
  </section>

  <div class="grid grid-4" style="margin-top:20px">
    ${tile("#/comunidad", "users", "Nuestra comunidad", "Identidad, roles, cargos y reuniones.")}
    ${tile("#/itinerario", "route", "Curso", `${st.readSessions} de ${st.totalSessions} unidades completadas.`)}
    ${tile("#/materiales", "book", "Materiales", c.materials.title)}
    ${tile("#/oracion", "flame", "Oración", c.devotional.title)}
  </div>

  ${st.complete ? `
  <a class="card link" href="#/constancia" style="margin-top:16px;display:flex;gap:16px;align-items:center">
    <span class="tile-ico" style="margin:0;background:var(--ok-soft);color:var(--ok)">${icon("award")}</span>
    <span><strong>¡Completaste el curso!</strong><br><span class="muted small">Tu constancia de formación y envío está lista.</span></span>
    <span class="spacer"></span>${icon("right")}
  </a>` : ""}

  <a class="card link camino-banner" href="#/encuentros" style="margin-top:16px">
    <span class="tile-ico tile-brand" style="margin:0">${icon("route")}</span>
    <span style="flex:1"><span class="eyebrow">Encuentros semanales</span><strong>Camino Ágape</strong>
    <span class="muted small">Revista principal, guía de coordinación y revistas de cada etapa.</span></span>${icon("right")}
  </a>
  <div id="wallSlot"></div>
  <div id="installSlot"></div>
  `;
}
function tile(href, ic, title, text) {
  return `<a class="card link" href="${href}">
    <div class="tile-ico tile-brand">${icon(ic)}</div>
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
  <a class="card link camino-banner no-print" href="#/encuentros" style="margin:6px 0 10px">
    <span class="tile-ico tile-brand" style="margin:0">${icon("route")}</span>
    <span style="flex:1"><span class="eyebrow">Encuentros semanales</span><strong>Camino Ágape</strong>
    <span class="muted small">El itinerario del grupo en tres etapas: ingreso, madurez y aspirante.</span></span>${icon("right")}
  </a>

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
// CURSO (módulos y unidades)
// ---------------------------------------------------------------------------
let expanded = {}; // courseId:phaseIdx -> bool
let pendingQuiz = null;

// Convierte texto con párrafos (línea en blanco) y listas ("- ") en HTML seguro.
export function prose(text) {
  return String(text || "").split(/\n\s*\n/).map((block) => {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length && lines.every((l) => /^[-•]\s+/.test(l))) {
      return `<ul class="prose-list">${lines.map((l) => `<li>${rich(l.replace(/^[-•]\s+/, ""))}</li>`).join("")}</ul>`;
    }
    return `<p>${rich(lines.join(" "))}</p>`;
  }).join("");
}
const unitText = (u) => [u.title, u.objective, u.intro, typeof u.bible === "string" ? u.bible : u.bible?.ref, u.dynamic,
  ...(u.sections || []).map((s) => s.title + " " + s.body)].join(" ");

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
  const unitPct = st.totalSessions ? Math.round((st.readSessions / st.totalSessions) * 100) : 0;

  return `
  <header class="page-head">
    <span class="eyebrow">Curso de formación</span>
    <h1>${esc(course.title)}</h1>
    <p>${esc(course.description)}</p>
  </header>

  ${c.courses.length > 1 ? `<div class="course-switch" style="margin:14px 0 4px" aria-label="Elegir curso">
    ${c.courses.map((x) => `<button aria-pressed="${x.id === course.id}" data-action="course" data-id="${esc(x.id)}">${esc(x.title)}</button>`).join("")}
  </div>` : ""}

  <div class="card progress-card" style="margin-top:16px">
    ${ring(unitPct)}
    <div>
      <strong>${st.complete ? "¡Curso completado!" : st.readSessions ? "Vas avanzando a tu ritmo" : "Tu camino comienza aquí"}</strong>
      <p class="muted small" style="margin-top:2px">${st.readSessions} de ${st.totalSessions} unidades completadas · ${st.donePhases} de ${course.phases.length} módulos aprobados</p>
      <div class="row-wrap" style="margin-top:12px">
        ${st.complete ? `<a class="btn btn-sm btn-ok" href="#/constancia">${icon("award")} Mi constancia</a>` : ""}
        <a class="btn btn-sm btn-soft" href="#/cuaderno">${icon("book")} Mi cuaderno</a>
        <button class="btn btn-sm btn-ghost" data-action="shareProgress">${icon("chat")} Enviar avance</button>
        <button class="btn btn-sm btn-ghost" data-action="resetProgress">Reiniciar</button>
      </div>
    </div>
  </div>

  <label class="search" style="display:block;margin:18px 0 22px">
    ${icon("search")}<span class="sr-only">Buscar unidad</span>
    <input id="searchInput" type="search" placeholder="Buscar tema: escucha, Zaqueo, juego, descanso, prevención…" autocomplete="off">
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
  const ready = s.read === s.total;
  return `
  <section class="phase ${cls}" data-phase="${i}">
    <div class="phase-node">${s.done ? icon("check") : s.open ? esc(ph.phaseNum) : icon("lock")}</div>
    <div class="card phase-card" data-expanded="${!!exp}">
      <button class="phase-head" ${s.open ? `data-action="togglePhase" data-key="${esc(key)}"` : "disabled"} aria-expanded="${!!exp}">
        <div style="flex:1;min-width:0">
          <div class="row-wrap" style="gap:6px;margin-bottom:6px">
            <span class="chip ${s.done ? "ok" : s.open ? "accent" : ""}">Módulo ${esc(ph.phaseNum)} · ${s.done ? "Aprobado" : s.open ? "En curso" : "Bloqueado"}</span>
            ${s.open ? `<span class="chip">${s.read}/${s.total} unidades</span>` : ""}
            ${s.score ? `<span class="chip">${s.score.right}/${s.score.total} en evaluación</span>` : ""}
          </div>
          <h3>${esc(ph.title)}</h3>
          <p class="muted small" style="margin-top:4px">${esc(ph.desc)}</p>
          ${s.open ? `<div class="mini-bar"><i style="width:${s.total ? (s.read / s.total) * 100 : 0}%"></i></div>` : ""}
          ${!s.open ? `<p class="xs muted" style="margin-top:8px">Aprueba la evaluación del módulo anterior para desbloquearlo.</p>` : ""}
        </div>
        ${s.open ? `<span class="caret">${icon("down")}</span>` : ""}
      </button>
      ${s.open ? `<div class="phase-body" ${exp ? "" : "hidden"}>
        ${ph.intro ? `<p class="muted small phase-intro">${rich(ph.intro)}</p>` : ""}
        ${ph.sessions.map((se) => {
          const read = st.p.read[S.sessionKey(i, se)];
          return `<a class="session-row ${read ? "read" : ""}" href="#/unidad/${i}/${encodeURIComponent(se.id)}" data-search="${esc(plain(unitText(se)).toLowerCase())}">
            <span class="session-num">${read ? icon("check") : esc(se.id)}</span>
            <span style="min-width:0;flex:1"><h4>${esc(se.title)}</h4><p>${esc(plain(se.objective))}</p></span>
            <span class="xs muted nowrap">${esc(se.time || "")}</span>
            <span class="arrow">${icon("right")}</span></a>`;
        }).join("")}
        <div class="phase-foot">
          <span class="xs muted">${ready ? "Completaste todas las unidades del módulo." : `Completa las ${s.total} unidades para habilitar la evaluación.`}</span>
          ${qn ? `<button class="btn btn-sm ${s.done ? "btn-ghost" : ready ? "btn-primary" : "btn-ghost"}" data-action="quiz" data-phase="${i}" ${ready || s.done ? "" : "disabled"}>
            ${s.done ? "Repasar evaluación" : `${ready ? "" : icon("lock")} Evaluación · ${qn} pregunta${qn > 1 ? "s" : ""}`}</button>` : ""}
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
  if (confirm(`¿Reiniciar tu progreso en "${c.title}"? Se borrarán tus unidades completadas y módulos aprobados. Tu cuaderno se conserva.`)) {
    S.resetProgress(c.id); expanded = {}; render(); toast("Progreso reiniciado");
  }
};
actions.shareProgress = () => {
  const c = S.activeCourse(), st = S.courseState(c), p = S.getProfile();
  const msg = `¡Paz y bien! Soy ${p.name}${p.parish ? ` (${p.parish})` : ""}. Mi avance en el curso "${c.title}" de Ágape: ${st.readSessions} de ${st.totalSessions} unidades completadas y ${st.donePhases} de ${c.phases.length} módulos aprobados.`;
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
    const intro = body.querySelector(".phase-intro");
    if (intro) intro.hidden = !!q;
    if (q) { body.hidden = !any; ph.hidden = !any; ph.querySelector(".phase-card").dataset.expanded = !!any; }
    else { ph.hidden = false; const card = ph.querySelector(".phase-card"); body.hidden = card.dataset.expanded !== "true"; }
  });
});

// ---------------------------------------------------------------------------
// UNIDAD
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
      <h2 class="display">Este módulo aún está bloqueado</h2>
      <p class="muted" style="margin-top:6px">Aprueba la evaluación del módulo anterior para abrir sus unidades.</p>
      <a class="btn btn-primary" style="margin-top:18px" href="#/itinerario">Volver al curso</a></div>`;
  }
  const key = S.sessionKey(i, se);
  const read = !!st.p.read[key];
  const flat = [];
  course.phases.forEach((p, pi) => { if (st.phases[pi].open) p.sessions.forEach((s) => flat.push([pi, s])); });
  const pos = flat.findIndex(([pi, s]) => pi === i && s.id === se.id);
  const prev = flat[pos - 1], next = flat[pos + 1];
  const lastInPhase = ph.sessions[ph.sessions.length - 1].id === se.id;
  const idxInPhase = ph.sessions.findIndex((s) => s.id === se.id) + 1;
  const notes = S.getNotes(course.id, key);
  const sections = se.sections || [];
  const bible = typeof se.bible === "string" ? { ref: "", comment: se.bible } : (se.bible || {});

  // Índice lateral
  const toc = [
    ...sections.map((s, n) => [`u-sec-${n}`, s.title]),
    bible.comment ? ["u-bible", "Palabra de Dios"] : null,
    se.church?.length ? ["u-church", "La Iglesia nos dice"] : null,
    se.questions?.length ? ["u-reflect", "Para tu reflexión"] : null,
    se.activity ? ["u-activity", "Llévalo a tu grupo"] : null,
    se.prayer ? ["u-prayer", "Oración"] : null,
    se.resources?.length ? ["u-resources", "Para profundizar"] : null,
  ].filter(Boolean);

  const completeBtn = (block) => `<button class="btn ${block ? "btn-block" : ""} ${read ? "btn-ok" : "btn-primary"}" data-action="toggleRead" data-key="${esc(key)}">
    ${read ? `${icon("check")} Unidad completada` : "Marcar unidad como completada"}</button>`;

  return `
  <nav class="crumbs no-print"><a href="#/itinerario">Curso</a>${icon("right")}<span>Módulo ${esc(ph.phaseNum)}</span>${icon("right")}<span>Unidad ${esc(se.id)}</span></nav>
  <header class="enc-head">
    <span class="eyebrow">Módulo ${esc(ph.phaseNum)} · ${esc(ph.title)}</span>
    <h1>${esc(se.title)}</h1>
    <div class="row-wrap">
      ${se.time ? `<span class="chip accent">${icon("sparkle")} ${esc(se.time)} de estudio</span>` : ""}
      <span class="chip">Unidad ${idxInPhase} de ${ph.sessions.length}</span>
      ${read ? `<span class="chip ok">${icon("check")} Completada</span>` : ""}
    </div>
  </header>

  <div class="enc-layout" style="margin-top:24px">
    <article class="unit">
      <div class="note accent objective"><b>Objetivo de aprendizaje.</b> ${rich(se.objective)}</div>
      ${se.intro ? `<p class="lead-text">${rich(se.intro)}</p>` : ""}

      ${sections.map((s, n) => `<section class="unit-sec" id="u-sec-${n}"><h2>${esc(s.title)}</h2>${prose(s.body)}</section>`).join("")}
      ${se.dynamic ? `<section class="unit-sec"><h2>Clave para comprender a los jóvenes</h2>${prose(se.dynamic)}</section>` : ""}

      ${bible.comment ? `<section class="unit-sec" id="u-bible"><span class="eyebrow">Palabra de Dios</span>
        <div class="scripture">${bible.ref ? `<div class="ref">${esc(bible.ref)}</div>` : ""}${rich(bible.comment)}</div></section>` : ""}

      ${se.church?.length ? `<section class="unit-sec" id="u-church"><span class="eyebrow">La Iglesia nos dice</span>
        <div class="stack" style="--gap:10px;margin-top:12px">${se.church.map((c) => `
          <div class="church-card"><div class="src">${c.url ? `<a href="${esc(c.url)}" target="_blank" rel="noopener">${esc(c.source)} ${icon("arrowR")}</a>` : esc(c.source)}</div>
          <p>${rich(c.text)}</p></div>`).join("")}</div></section>` : ""}

      ${se.questions?.length ? `<section class="unit-sec" id="u-reflect"><span class="eyebrow">Para tu reflexión · Mi cuaderno</span>
        <p class="xs muted" style="margin-top:6px">Tus respuestas se guardan solas en este dispositivo. Puedes revisarlas y descargarlas en «Mi cuaderno».</p>
        <div class="stack" style="--gap:14px;margin-top:12px">${se.questions.map((q, n) => `
          <label class="field reflect"><span class="q"><b>${n + 1}.</b> ${rich(q)}</span>
            <textarea class="textarea" rows="3" data-note="${esc(key)}" data-qi="${n}" placeholder="Escribe aquí tu reflexión…">${esc(notes[n] || "")}</textarea></label>`).join("")}
        </div><span class="xs muted saved" id="savedFlag" hidden>${icon("check")} Guardado</span></section>` : ""}

      ${se.activity ? `<section class="unit-sec" id="u-activity"><div class="activity-card"><span class="eyebrow">Llévalo a tu grupo</span><p>${rich(se.activity)}</p></div></section>` : ""}

      ${se.prayer ? `<section class="unit-sec" id="u-prayer"><span class="eyebrow">Oración</span><div class="prayer">${rich(se.prayer)}</div></section>` : ""}

      ${se.resources?.length ? `<section class="unit-sec" id="u-resources"><span class="eyebrow">Para profundizar</span>
        <ul class="res-list">${se.resources.map((r) => `<li><a href="${esc(r.url)}" target="_blank" rel="noopener">
          <span class="res-ico">${icon("book")}</span><span><b>${esc(r.title)}</b>${r.note ? `<small>${esc(r.note)}</small>` : ""}</span>${icon("arrowR")}</a></li>`).join("")}</ul></section>` : ""}

      <div class="unit-end no-print">${completeBtn(true)}
        ${lastInPhase && ph.quiz?.questions?.length && !st.phases[i].done ? `<p class="xs muted" style="text-align:center;margin-top:10px">Al completar todas las unidades del módulo se habilita su evaluación.</p>` : ""}
      </div>
    </article>

    <aside class="enc-aside no-print">
      <div class="card stack" style="--gap:12px">
        ${completeBtn(true)}
        <div class="mini-bar"><i style="width:${(st.phases[i].read / st.phases[i].total) * 100}%"></i></div>
        <span class="xs muted">${st.phases[i].read} de ${st.phases[i].total} unidades completadas en este módulo</span>
        ${toc.length ? `<nav class="toc">${toc.map(([id, t]) => `<a href="#" data-action="scrollTo" data-id="${id}">${esc(t)}</a>`).join("")}</nav>` : ""}
        <div class="row" style="gap:8px">
          <button class="btn btn-sm btn-ghost" style="flex:1" data-action="print">${icon("print")} Imprimir</button>
          <button class="btn btn-sm btn-ghost" style="flex:1" data-action="shareEncounter" data-phase="${i}" data-id="${esc(se.id)}">${icon("chat")} Compartir</button>
        </div>
        ${st.phases[i].read === st.phases[i].total && ph.quiz?.questions?.length && !st.phases[i].done ? `<div class="note accent small">Completaste las unidades del módulo. <a href="#" data-action="quiz" data-phase="${i}"><b>Rendir la evaluación →</b></a></div>` : ""}
      </div>
    </aside>
  </div>

  <nav class="enc-nav no-print">
    ${prev ? `<a href="#/unidad/${prev[0]}/${encodeURIComponent(prev[1].id)}"><div class="card"><span class="xs muted">Anterior</span><br><b>${esc(prev[1].title)}</b></div></a>` : "<span></span>"}
    ${lastInPhase && ph.quiz?.questions?.length && !st.phases[i].done
      ? `<a href="#" data-action="quiz" data-phase="${i}"><div class="card next" style="background:var(--accent-soft);border-color:transparent"><span class="xs muted">Siguiente paso</span><br><b>Evaluación del módulo ${esc(ph.phaseNum)}</b></div></a>`
      : next ? `<a href="#/unidad/${next[0]}/${encodeURIComponent(next[1].id)}"><div class="card next"><span class="xs muted">Siguiente</span><br><b>${esc(next[1].title)}</b></div></a>` : "<span></span>"}
  </nav>`;
}
actions.toggleRead = (el) => {
  const course = S.activeCourse();
  const on = S.toggleRead(course.id, el.dataset.key);
  $$(`[data-action="toggleRead"][data-key="${CSS.escape(el.dataset.key)}"]`).forEach((b) => {
    b.className = `btn btn-block ${on ? "btn-ok" : "btn-primary"}`;
    b.innerHTML = on ? `${icon("check")} Unidad completada` : "Marcar unidad como completada";
  });
  const [pi] = el.dataset.key.split(":");
  const s = S.courseState(course).phases[+pi];
  if (on) toast(s.read === s.total ? "¡Módulo listo! Ya puedes rendir su evaluación" : "Unidad completada", "ok", 3500);
  setTimeout(render, 900);
};
actions.scrollTo = (el) => {
  document.getElementById(el.dataset.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
};
actions.print = () => window.print();
actions.shareEncounter = (el) => {
  const c = S.activeCourse();
  const se = c.phases[+el.dataset.phase].sessions.find((s) => s.id === el.dataset.id);
  const bible = typeof se.bible === "string" ? se.bible : se.bible?.ref || "";
  const text = `*${plain(se.title)}* (Unidad ${se.id} · ${c.title})\n\n🎯 ${plain(se.objective)}\n\n📖 ${plain(bible)}\n\n🙏 ${plain(se.prayer)}`;
  if (navigator.share) navigator.share({ title: plain(se.title), text }).catch(() => {});
  else window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
};

// Guardado automático del cuaderno
let noteTimer = null;
document.addEventListener("input", (e) => {
  const t = e.target;
  if (!t.dataset || t.dataset.note == null) return;
  clearTimeout(noteTimer);
  noteTimer = setTimeout(() => {
    S.setNote(S.activeCourse().id, t.dataset.note, +t.dataset.qi, t.value);
    const f = $("#savedFlag"); if (f) { f.hidden = false; clearTimeout(f._t); f._t = setTimeout(() => (f.hidden = true), 1500); }
  }, 400);
});

// ---------------------------------------------------------------------------
// MI CUADERNO
// ---------------------------------------------------------------------------
function viewNotebook() {
  const course = S.activeCourse();
  const p = S.getProfile();
  let count = 0;
  const body = course.phases.map((ph, i) => {
    const units = ph.sessions.map((se) => {
      const notes = S.getNotes(course.id, S.sessionKey(i, se));
      const answered = (se.questions || []).map((q, n) => [q, notes[n]]).filter(([, a]) => a && a.trim());
      if (!answered.length) return "";
      count += answered.length;
      return `<article class="nb-unit"><h3><a href="#/unidad/${i}/${encodeURIComponent(se.id)}">${esc(se.id)} · ${esc(se.title)}</a></h3>
        ${answered.map(([q, a]) => `<p class="nb-q">${rich(q)}</p><p class="nb-a prose-pre">${esc(a)}</p>`).join("")}</article>`;
    }).join("");
    return units ? `<section class="nb-mod"><span class="eyebrow">Módulo ${esc(ph.phaseNum)}</span><h2 class="display">${esc(ph.title)}</h2>${units}</section>` : "";
  }).join("");
  return `
  <nav class="crumbs no-print"><a href="#/itinerario">Curso</a>${icon("right")}<span>Mi cuaderno</span></nav>
  <header class="page-head"><span class="eyebrow">${esc(course.title)}</span><h1>Mi cuaderno</h1>
    <p>Tus reflexiones personales a lo largo del curso${p.name ? `, ${esc(p.name.split(" ")[0])}` : ""}. Se guardan solo en este dispositivo.</p></header>
  <div class="row-wrap no-print" style="margin:8px 0 20px">
    <button class="btn btn-sm btn-primary" data-action="print" ${count ? "" : "disabled"}>${icon("print")} Imprimir o guardar PDF</button>
    <button class="btn btn-sm btn-ghost" data-action="downloadNotes" ${count ? "" : "disabled"}>${icon("dl")} Descargar como texto</button>
  </div>
  ${count ? `<div class="card notebook">${body}</div>` : `<div class="card" style="text-align:center;padding:36px">
    <div class="tile-ico" style="margin:0 auto 12px">${icon("edit")}</div>
    <h2 class="display">Tu cuaderno está vacío</h2>
    <p class="muted" style="margin-top:6px">En cada unidad encontrarás preguntas para tu reflexión. Lo que escribas aparecerá aquí.</p>
    <a class="btn btn-primary" style="margin-top:16px" href="#/itinerario">Ir al curso</a></div>`}`;
}
actions.downloadNotes = () => {
  const course = S.activeCourse(), p = S.getProfile();
  let out = `MI CUADERNO · ${course.title}\n${p.name}${p.parish ? " · " + p.parish : ""}\n${"=".repeat(40)}\n`;
  course.phases.forEach((ph, i) => {
    let block = "";
    ph.sessions.forEach((se) => {
      const notes = S.getNotes(course.id, S.sessionKey(i, se));
      const qa = (se.questions || []).map((q, n) => [q, notes[n]]).filter(([, a]) => a && a.trim());
      if (qa.length) block += `\n${se.id} ${plain(se.title)}\n` + qa.map(([q, a]) => `\n· ${plain(q)}\n${a}\n`).join("");
    });
    if (block) out += `\n\nMÓDULO ${ph.phaseNum}: ${plain(ph.title)}\n${"-".repeat(40)}${block}`;
  });
  const blob = new Blob([out], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "mi-cuaderno-agape.txt";
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
};

// ---------------------------------------------------------------------------
// EVALUACIÓN DE FASE
// ---------------------------------------------------------------------------
let Q = null;
function openQuiz(phaseIdx) {
  const course = S.activeCourse();
  const ph = course.phases[phaseIdx];
  if (!ph?.quiz?.questions?.length) return;
  const ps = S.courseState(course).phases[phaseIdx];
  if (!ps.open) return toast("Este módulo aún está bloqueado", "");
  if (!ps.done && ps.read < ps.total) return toast(`Completa las ${ps.total} unidades del módulo para rendir la evaluación`, "", 3500);
  Q = { course, phaseIdx, quiz: ph.quiz, step: 0, selected: null, answered: false, results: [] };
  const d = $("#quizDialog");
  d.querySelector("[data-q-badge]").textContent = ph.quiz.badge || `Evaluación módulo ${ph.phaseNum}`;
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
      cloud.registerCertificate(Q.course, done);
    }
    body.innerHTML = `${bar}
      <div style="text-align:center;padding:10px 0 4px">
        <div class="score-big" style="color:${passed ? "var(--ok)" : "var(--warn)"}">${right}/${total}</div>
        <h3 class="display" style="font-size:1.5rem;margin-top:10px">${passed ? (finished ? "¡Completaste el curso!" : "¡Módulo aprobado!") : "Casi, vuelve a intentarlo"}</h3>
        <p class="muted" style="margin-top:8px;max-width:44ch;margin-inline:auto">${passed
          ? (finished ? "Has recorrido todo el camino con corazón pastoral. Tu constancia de formación y envío ya está lista." : "Se abrió el siguiente módulo del curso. ¡Sigue adelante!")
          : `Necesitas al menos ${need} respuesta${need > 1 ? "s" : ""} adecuada${need > 1 ? "s" : ""}. Repasa las unidades del módulo y vuelve cuando quieras; lo importante es el discernimiento, no la nota.`}</p>
      </div>`;
    foot.innerHTML = passed
      ? (finished ? `<span class="spacer"></span><button class="btn btn-primary" data-action="quizToCert">${icon("award")} Ver mi constancia</button>`
                  : `<span class="spacer"></span><button class="btn btn-primary" data-action="quizClose">Continuar</button>`)
      : `<button class="btn btn-ghost" data-action="quizClose">Repasar unidades</button><span class="spacer"></span><button class="btn btn-primary" data-action="quizRetry">Intentar de nuevo</button>`;
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
      <p class="muted" style="margin-top:6px">Completa y aprueba los ${course.phases.length} módulos de "${esc(course.title)}" para recibirla. Llevas ${st.donePhases}.</p>
      <a class="btn btn-primary" style="margin-top:18px" href="#/itinerario">Ir al curso</a></div>`;
  }
  const p = S.getProfile();
  const date = new Date(st.p.completedDate || Date.now()).toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" });
  const sessions = st.totalSessions;
  const qr = qrcode(0, "M");
  if (cloud.enabled) { qr.addData(cloud.verifyUrl(st.p.certCode)); cloud.registerCertificate(course, st.p); }
  else qr.addData(`PASTORAL JUVENIL ÁGAPE\nConstancia de Formación y Envío\nCurso: ${course.title}\nDirigente: ${p.name}\nComunidad: ${p.parish}\nCódigo: ${st.p.certCode}\nFecha: ${date}`);
  qr.make();
  const svg = qr.createSvgTag({ cellSize: 3, margin: 0, scalable: true });

  return `
  <nav class="crumbs no-print" style="margin-bottom:14px"><a href="#/itinerario">Curso</a>${icon("right")}<span>Constancia</span></nav>
  <div class="certificate">
    <img class="seal-logo" src="icons/logo-320.webp" width="96" height="96" alt="Logo Ágape Joven PJ">
    <div class="kicker">Pastoral Juvenil Ágape</div>
    <h2>Constancia de Formación y Envío</h2>
    <div class="small" style="color:#6f6a7e">Curso de formación de dirigentes «${esc(course.title)}»</div>
    <div class="to">Otorgada a</div>
    <div class="who">${esc(p.name)}</div>
    <div class="small" style="color:#6f6a7e;font-weight:600">${esc(p.parish)}</div>
    <p class="body">Por haber completado los <b>${course.phases.length} módulos (${sessions} unidades)</b> del curso de formación y sus evaluaciones de discernimiento pastoral, demostrando comprensión del servicio, escucha activa y compromiso evangélico.</p>
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
  const msg = `¡Paz y bien! Comunico que he culminado el curso de formación "${c.title}".\n\n👤 Dirigente: ${p.name}\n⛪ Comunidad: ${p.parish}\n🔑 Código: ${st.p.certCode}`;
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
  const lib = buildLibrary();
  return `<header class="page-head"><span class="eyebrow">Herramientas de la pastoral</span><h1>${esc(m.title)}</h1><p>${esc(m.desc)}</p></header>
    <a class="card link camino-banner" href="#/encuentros" style="margin-top:14px">
      <span class="tile-ico tile-brand" style="margin:0">${icon("route")}</span>
      <span style="flex:1"><span class="eyebrow">Encuentros semanales</span><strong>Revistas Camino Ágape</strong>
      <span class="muted small">Revista principal, guía de coordinación y revistas Ingreso, Madurez y Aspirante, para leer o descargar en PDF.</span></span>${icon("right")}
    </a>
    <nav class="lib-jump row-wrap" style="margin-top:14px">
      <a class="btn btn-sm btn-soft" href="#biblioteca" data-action="scrollTo" data-id="biblioteca">${icon("book")} Biblioteca digital · ${lib.total} recursos</a>
    </nav>
    <div class="grid grid-2" style="margin-top:18px">${m.cards.map((c) => cardHTML(c, "material")).join("")}</div>
    ${libraryHTML(lib)}`;
}

// ---------------------------------------------------------------------------
// BIBLIOTECA DIGITAL: se arma sola con los recursos y documentos citados en los cursos
// ---------------------------------------------------------------------------
const LIB_GROUPS = [
  ["biblia", "Biblia y Catecismo", "Para leer y orar la Palabra, y consultar la fe de la Iglesia."],
  ["magisterio", "Documentos de la Iglesia", "Exhortaciones, encíclicas y documentos del Papa y del Sínodo."],
  ["pj", "Pastoral juvenil", "Orientaciones de la pastoral juvenil latinoamericana y chilena."],
  ["cuidado", "Ambientes sanos y seguros", "Orientaciones y materiales de prevención de la Iglesia en Chile."],
  ["ayuda", "Salud mental y redes de ayuda", "Líneas de apoyo gratuitas y orientación en salud."],
  ["otros", "Otros recursos", ""],
];
function libGroup(url) {
  const u = String(url).toLowerCase();
  if (/catechism|esl0506|biblia/.test(u)) return "biblia";
  if (/prevenirabusos|iglesiadesantiago.*ambientes/.test(u)) return "cuidado";
  if (/minsal|saludresponde|4141/.test(u)) return "ayuda";
  if (/pastoraljuvenil|celam|capym/.test(u)) return "pj";
  if (/vatican\.va/.test(u)) return "magisterio";
  return "otros";
}
// Nombre y descripción de los documentos más citados (si no está aquí, se usa lo que dice la unidad).
const LIB_META = [
  ["christus-vivit", "Christus vivit", "Exhortación del papa Francisco a los jóvenes y a todo el pueblo de Dios (2019)."],
  ["evangelii-gaudium", "Evangelii gaudium", "Exhortación del papa Francisco sobre el anuncio del Evangelio en el mundo actual (2013)."],
  ["gaudete-et-exsultate", "Gaudete et exsultate", "Exhortación del papa Francisco sobre la llamada a la santidad hoy (2018)."],
  ["fratelli-tutti", "Fratelli tutti", "Encíclica del papa Francisco sobre la fraternidad y la amistad social (2020)."],
  ["verbum-domini", "Verbum Domini", "Exhortación de Benedicto XVI sobre la Palabra de Dios; incluye la lectio divina (2010)."],
  ["dilexi-te", "Dilexi te", "Exhortación del papa León XIV sobre el amor a los pobres (2025)."],
  ["veglia-tor-vergata", "León XIV: vigilia con los jóvenes en Tor Vergata", "Discurso del Jubileo de los Jóvenes sobre la amistad en Cristo (2025)."],
  ["synod_doc_20181027", "Documento final del Sínodo sobre los jóvenes", "Los jóvenes, la fe y el discernimiento vocacional (2018)."],
  ["esl0506", "Biblia · El Libro del Pueblo de Dios", "Traducción latinoamericana de la Biblia, en el sitio del Vaticano."],
  ["catechism_sp/p4s1", "Catecismo: La oración cristiana", "Cuarta parte del Catecismo de la Iglesia Católica."],
  ["catechism_sp/index", "Catecismo de la Iglesia Católica", "Índice completo del Catecismo en español."],
  ["capym", "Civilización del Amor. Proyecto y misión", "Orientaciones del CELAM para la Pastoral Juvenil latinoamericana."],
  ["pastoraljuvenil.cl", "Comisión Nacional de Pastoral Juvenil", "Noticias, documentos y subsidios de la Pastoral Juvenil de Chile."],
  ["prevenirabusos/ise", "Integridad en el Servicio Eclesial (ISE)", "Orientaciones de la Conferencia Episcopal de Chile para el servicio pastoral (2020)."],
  ["ise.pdf", "Integridad en el Servicio Eclesial · PDF", "Texto completo para descargar."],
  ["folleto_base", "Ambientes sanos, seguros y de buen trato", "Folleto para responsables de grupos y comunidades."],
  ["recursos_int", "Recursos de prevención de la Iglesia de Chile", "Materiales de difusión y formación en prevención."],
  ["4141", "Línea de apoyo *4141", "Ministerio de Salud. Gratuita, las 24 horas."],
  ["saludresponde", "Salud Responde · 600 360 7777", "Orientación en salud del Ministerio de Salud, incluida salud mental."],
];
const libMeta = (url) => { const u = url.toLowerCase(); return LIB_META.find(([k]) => u.includes(k)); };
const cleanSource = (src) => String(src || "").replace(/\s+\d[\d\s,.\-–y]*$/, "").replace(/\s*\(.*?\)\s*$/, "").trim();
function buildLibrary() {
  const byUrl = new Map();
  S.content().courses.forEach((course) => course.phases.forEach((ph, pi) => ph.sessions.forEach((se) => {
    const cite = { course: course.id, courseTitle: course.title, pi, id: se.id, title: se.title };
    const add = (url, title, note, weight) => {
      if (!url || !/^https?:\/\//.test(url)) return;
      const key = url.replace(/[#?].*$/, "").replace(/\/$/, "");
      let e = byUrl.get(key);
      if (!e) { e = { url, title, note: note || "", weight, cites: [] }; byUrl.set(key, e); }
      if (weight > e.weight && title) { e.title = title; e.weight = weight; }
      if (!e.note && note) e.note = note;
      if (!e.cites.some((c) => c.course === cite.course && c.id === cite.id)) e.cites.push(cite);
    };
    (se.resources || []).forEach((r) => add(r.url, r.title, r.note, 2));
    (se.church || []).forEach((c) => add(c.url, cleanSource(c.source), "", 1));
  })));
  const items = [...byUrl.values()].map((e) => {
    const m = libMeta(e.url);
    const title = m ? m[1] : e.title.replace(/,\s*(capítulo|números?|número)\b.*$/i, "").replace(/:\s*(capítulo|números?)\b.*$/i, "");
    const note = m ? m[2] : (/\b(números?|lee|capítulo)\b/i.test(e.note) ? "" : e.note);
    const cites = [...e.cites].sort((x, y) => x.course.localeCompare(y.course) || x.pi - y.pi || x.id.localeCompare(y.id, "es", { numeric: true }));
    return { ...e, title, note, cites, group: libGroup(e.url) };
  });
  items.sort((a, b) => b.cites.length - a.cites.length || a.title.localeCompare(b.title, "es"));
  return { total: items.length, groups: LIB_GROUPS.map(([k, t, d]) => ({ k, t, d, items: items.filter((i) => i.group === k) })).filter((g) => g.items.length) };
}
function libraryHTML(lib) {
  if (!lib.total) return "";
  const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };
  return `
  <section id="biblioteca" class="library">
    <div class="section-title"><h2>Biblioteca digital</h2></div>
    <p class="muted" style="max-width:62ch">Todos los documentos y recursos que se citan en los cursos, reunidos en un solo lugar para consultarlos cuando quieras. Se abren en su sitio oficial.</p>
    <label class="search" style="display:block;margin:16px 0 8px">
      ${icon("search")}<span class="sr-only">Buscar en la biblioteca</span>
      <input id="libSearch" type="search" placeholder="Buscar: Christus vivit, Catecismo, Biblia, prevención…" autocomplete="off">
    </label>
    ${lib.groups.map((g) => `
      <div class="lib-group" data-lib-group>
        <h3 class="lib-h">${esc(g.t)} <span class="chip">${g.items.length}</span></h3>
        ${g.d ? `<p class="xs muted" style="margin-top:2px">${esc(g.d)}</p>` : ""}
        <div class="lib-list">
          ${g.items.map((it) => `
          <article class="lib-item" data-lib="${esc((it.title + " " + it.note + " " + host(it.url)).toLowerCase())}">
            <a class="lib-link" href="${esc(it.url)}" target="_blank" rel="noopener">
              <span class="res-ico">${icon("book")}</span>
              <span class="lib-body"><b>${esc(it.title)}</b>${it.note ? `<small>${esc(it.note)}</small>` : ""}<small class="lib-host">${esc(host(it.url))}</small></span>
              ${icon("arrowR")}
            </a>
            <div class="lib-cites"><span class="xs muted">Citado en</span>
              ${it.cites.slice(0, 8).map((c) => `<a class="chip accent" href="#/unidad/${c.pi}/${encodeURIComponent(c.id)}" data-action="libOpen" data-course="${esc(c.course)}" data-pi="${c.pi}" data-id="${esc(c.id)}" title="${esc(c.courseTitle + " · " + c.title)}">${esc(c.id)}</a>`).join("")}
              ${it.cites.length > 8 ? `<span class="xs muted">y ${it.cites.length - 8} más</span>` : ""}
            </div>
          </article>`).join("")}
        </div>
      </div>`).join("")}
    <p class="xs muted lib-empty" id="libEmpty" hidden>Nada coincide con la búsqueda.</p>
  </section>`;
}
actions.libOpen = (el) => {
  S.setActiveCourse(el.dataset.course);
  location.hash = `#/unidad/${el.dataset.pi}/${encodeURIComponent(el.dataset.id)}`;
};
document.addEventListener("input", (e) => {
  if (e.target.id !== "libSearch") return;
  const q = e.target.value.trim().toLowerCase();
  let any = 0;
  $$("[data-lib-group]").forEach((g) => {
    let n = 0;
    g.querySelectorAll(".lib-item").forEach((it) => { const hit = !q || it.dataset.lib.includes(q); it.hidden = !hit; if (hit) n++; });
    g.hidden = !n; any += n;
  });
  $("#libEmpty").hidden = !!any;
});
function viewPrayer() {
  const d = S.content().devotional;
  return `<header class="page-head"><span class="eyebrow">Vida de oración</span><h1>${esc(d.title)}</h1><p>${esc(d.desc)}</p></header>
    <div class="grid grid-2" style="margin-top:18px">${d.cards.map((c) => cardHTML(c, "prayer")).join("")}</div>`;
}

// ---------------------------------------------------------------------------
// PERFIL / BIENVENIDA
// ---------------------------------------------------------------------------
function viewProfile() {
  if (cloud.enabled) return viewAccount();
  const p = S.getProfile();
  const isNew = !p.name;
  return `
  <div class="welcome">
    ${isNew ? `<section class="hero" style="margin-bottom:18px;text-align:center">
      <img class="welcome-logo" src="icons/logo-320.webp" width="116" height="116" alt="Logo Ágape Joven PJ">
      <span class="eyebrow">Bienvenido a Ágape</span>
      <h1>Tu camino de <em>formación</em></h1>
      <p class="lead">Cuéntanos quién eres para acompañar tu avance en el curso y preparar tu constancia al final.</p>
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
// CUENTAS (cuando Firebase está configurado)
// ---------------------------------------------------------------------------
function viewLogin() {
  const st = cloud.state();
  const msg = {
    "not-invited": `<h2 class="display">Tu correo aún no está invitado</h2>
      <p class="muted" style="margin-top:8px">Entraste como <b>${esc(st.user?.email || "")}</b>. Pide al equipo coordinador que te invite con ese correo y vuelve a intentarlo.</p>
      <div class="row-wrap" style="justify-content:center;margin-top:18px"><button class="btn btn-ghost" data-action="signOut">Usar otra cuenta</button><button class="btn btn-primary" data-action="retryAccount">Ya me invitaron</button></div>`,
    inactive: `<h2 class="display">Tu cuenta está en pausa</h2>
      <p class="muted" style="margin-top:8px">Conversa con el equipo coordinador para reactivarla.</p>
      <button class="btn btn-ghost" style="margin-top:18px" data-action="signOut">Cerrar sesión</button>`,
    loading: `<h2 class="display">Conectando…</h2>`,
    error: `<h2 class="display">No pudimos conectar tu cuenta</h2>
      <p class="muted" style="margin-top:8px">Revisa tu conexión e inténtalo de nuevo.${st.error ? ` <span class="xs">(${esc(st.error)})</span>` : ""}</p>
      <button class="btn btn-primary" style="margin-top:18px" data-action="signIn">${icon("users")} Reintentar</button>`,
  }[st.status];
  return `<div class="welcome">
    <section class="hero" style="margin-bottom:18px;text-align:center">
      <img class="welcome-logo" src="icons/logo-320.webp" width="116" height="116" alt="Logo Ágape Joven PJ">
      <span class="eyebrow">Curso de formación de dirigentes</span>
      <h1>Tu camino de <em>formación</em></h1>
      <p class="lead">Ingresa con tu cuenta de Google para avanzar a tu ritmo, guardar tu cuaderno y recibir tu constancia. Tu avance te sigue en cualquier dispositivo.</p>
    </section>
    <div class="card" style="text-align:center;padding:28px">
      ${msg || `<button class="btn btn-primary btn-block google-btn" data-action="signIn">${googleIcon()} Continuar con Google</button>
        <p class="xs muted" style="margin-top:12px">Solo pueden ingresar dirigentes invitados por el equipo coordinador.</p>`}
    </div>
  </div>`;
}
const googleIcon = () => `<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>`;
actions.signIn = async () => { try { await cloud.signIn(); } catch { toast("No se pudo iniciar sesión", ""); } };
actions.signOut = async () => {
  if (cloud.state().ready && !confirm("¿Cerrar sesión en este dispositivo? Tu avance queda guardado en tu cuenta.")) return;
  await cloud.signOutUser(); location.hash = "#/"; render();
};
actions.retryAccount = async () => { await cloud.signOutUser(); await cloud.signIn(); };

function viewAccount() {
  const st = cloud.state();
  if (!st.ready) return viewLogin();
  const a = st.account;
  return `<div class="welcome">
    <header class="page-head"><span class="eyebrow">Mi cuenta</span><h1>${esc(a.name)}</h1>
      <p>${esc(a.email)} · <span class="chip ${a.role === "admin" ? "warn" : "accent"}">${a.role === "admin" ? "Administrador" : "Dirigente"}</span></p></header>
    <form class="card stack" id="accountForm" style="--gap:14px">
      <div class="field"><label for="acName">Nombre y apellido</label><input class="input big" id="acName" name="name" required value="${esc(a.name)}"></div>
      <div class="field"><label for="acParish">Capilla o parroquia</label><input class="input big" id="acParish" name="parish" value="${esc(a.parish || "")}"></div>
      <p class="xs muted">Tu nombre aparecerá en la constancia. Tu avance se guarda en tu cuenta; tu cuaderno es privado y solo tú puedes leerlo.</p>
      <button class="btn btn-primary btn-block" type="submit">Guardar cambios</button>
    </form>
    <div class="row-wrap" style="justify-content:center;margin-top:16px">
      ${st.isAdmin ? `<a class="btn btn-soft" href="#/admin">${icon("gear")} Gestión</a>` : ""}
      <button class="btn btn-ghost" data-action="signOut">${icon("out")} Cerrar sesión</button>
    </div>
    <div id="installSlot" style="margin-top:14px"></div>
  </div>`;
}
document.addEventListener("submit", async (e) => {
  if (e.target.id !== "accountForm") return;
  e.preventDefault();
  const f = new FormData(e.target);
  const name = String(f.get("name") || "").trim();
  if (!name) return;
  try { await cloud.updateMyProfile({ name, parish: String(f.get("parish") || "").trim() }); toast("Perfil actualizado"); render(); }
  catch { toast("No se pudo guardar. Revisa tu conexión.", ""); }
});

async function viewVerify(code) {
  const c = cloud.enabled ? await cloud.getCertificate(code) : undefined;
  const ok = c && c.name;
  return `<div style="max-width:520px;margin:5vh auto 0">
    <div class="card" style="text-align:center;padding:32px">
      <div class="tile-ico" style="margin:0 auto 14px;background:${ok ? "var(--ok-soft)" : "var(--surface-2)"};color:${ok ? "var(--ok)" : "var(--ink-3)"}">${icon(ok ? "award" : "x")}</div>
      ${ok ? `<span class="eyebrow">Constancia válida</span>
        <h1 class="display" style="font-size:1.8rem;margin-top:8px">${esc(c.name)}</h1>
        <p class="muted" style="margin-top:6px">${esc(c.parish || "")}</p>
        <p style="margin-top:14px">Completó el curso de formación <b>«${esc(c.course)}»</b> de la Pastoral Juvenil Ágape${c.date ? ` el ${esc(new Date(c.date).toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" }))}` : ""}.</p>
        <p class="xs muted" style="margin-top:14px">Código ${esc(code)}</p>`
      : c === null ? `<h1 class="display" style="font-size:1.6rem">Código no encontrado</h1><p class="muted" style="margin-top:8px">No existe una constancia con el código ${esc(code)}. Revisa que esté bien escrito.</p>`
      : `<h1 class="display" style="font-size:1.6rem">No pudimos verificar</h1><p class="muted" style="margin-top:8px">La verificación necesita conexión a internet. Inténtalo de nuevo.</p>`}
      <a class="btn btn-ghost" style="margin-top:18px" href="#/">Ir a Pastoral Ágape</a>
    </div></div>`;
}

// ---------------------------------------------------------------------------
// GESTIÓN (carga diferida)
// ---------------------------------------------------------------------------
async function viewAdmin(sub = "") {
  const m = await import("./admin.js");
  return m.renderAdmin(sub || "", { actions, render, onAfterRender, cloud });
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
wall.setup({ actions, render: () => render(), onAfterRender, onLeave, cloud });
camino.setup({ actions, render: () => render(), cloud });

async function boot() {
  try {
    if (cloud.enabled) { await cloud.init(); cloud.onChange(render); }
    await S.loadContent(cloud.enabled ? cloud.fetchContent : null);
  } catch (e) {
    viewEl().innerHTML = `<div class="card" style="text-align:center;padding:40px"><h2 class="display">No se pudo cargar el contenido</h2>
      <p class="muted" style="margin-top:8px">Revisa tu conexión e inténtalo de nuevo.</p>
      <button class="btn btn-primary" style="margin-top:16px" onclick="location.reload()">Reintentar</button></div>`;
    return;
  }
  await render();
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    // Si se publica una versión nueva de la app, se recarga una vez para mostrarla.
    const hadController = !!navigator.serviceWorker.controller;
    let reloaded = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!hadController || reloaded) return;
      reloaded = true; location.reload();
    });
    navigator.serviceWorker.register("sw.js", { updateViaCache: "none" })
      .then((r) => r.update().catch(() => {})).catch(() => {});
  }
}
boot();
