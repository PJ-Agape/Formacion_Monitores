// Pastoral Juvenil Ágape — aplicación principal (vistas públicas y enrutador).

import { CONFIG } from "./config.js";
import * as S from "./store.js";
import * as cloud from "./cloud.js";
import { esc, rich, plain, icon, toast, initials } from "./util.js";
import qrcode from "./qrcode.mjs";
import { stringToBytes as utf8Bytes } from "./qrcode-utf8.mjs";
import * as wall from "./muro.js";
import * as camino from "./encuentros.js";
import * as chat from "./chat.js";
import * as agenda from "./agenda.js";
import * as portada from "./portada.js";
import * as familiasAdmin from "./familias-admin.js";
import * as capilla from "./capilla.js";
import * as cancionero from "./cancionero.js";
import * as AV from "./avatares.js";
import * as dinamicas from "./dinamicas.js";
import * as acompanar from "./acompanar.js";
import * as desafio from "./desafio.js";
import * as viva from "./unidad-viva.js";
import * as camJ from "./mi-camino.js";
import * as ayuda from "./ayuda.js";
import * as cuenta from "./cuenta.js";
import * as difusion from "./difusion.js";
import * as a11y from "./accesible.js";
import * as grupo from "./grupo.js";
import * as inicio from "./inicio.js";
import * as novedades from "./novedades.js";
import * as papa from "./papa.js";
import { illus } from "./ilustraciones.js";

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
  [/^\/agenda$/, () => agenda.viewAgenda(), "agenda"],
  [/^\/agenda\/(\d{4}-\d{2}-\d{2})$/, (d) => agenda.viewAgenda(d), "agenda"],
  [/^\/chat$/, () => chat.viewRooms(), "muro"],
  [/^\/chat\/([A-Za-z0-9_-]+)$/, (k) => chat.viewRoom(k), "muro"],
  [/^\/muro\/([^/]+)$/, (id) => wall.viewPost(id), "muro"],
  [/^\/encuentros$/, () => camino.viewHub(), "comunidad"],
  [/^\/encuentros\/([a-z]+)$/, (k) => camino.viewRevista(k), "comunidad"],
  [/^\/archivo\/(\d{4})$/, async (y) => (await camino.viewHub(y)) ?? viewNotFound(), "materiales"],
  [/^\/archivo\/(\d{4})\/([a-z]+)$/, async (y, k) => (await camino.viewRevista(k, y)) ?? viewNotFound(), "materiales"],
  [/^\/comunidad$/, viewCommunity, "comunidad"],
  [/^\/itinerario$/, viewItinerary, "itinerario"],
  [/^\/(?:unidad|encuentro)\/(\d+)\/([^/]+)$/, viewEncounter, "itinerario"],
  [/^\/vivir\/(\d+)\/([^/?]+)(?:\?s=\d+)?$/, async (p, id) => (await viva.view(p, id)) ?? null, "itinerario"],
  [/^\/cuaderno$/, viewNotebook, "itinerario"],
  [/^\/materiales$/, viewMaterials, "materiales"],
  [/^\/oracion$/, () => capilla.view(), "oracion"],
  [/^\/evangelio$/, () => capilla.view({ focus: "gospel" }), "oracion"],
  [/^\/oracion\/([a-z]+)$/, (k) => capilla.view({ focus: k }), "oracion"],
  [/^\/oracion\/velas\/([^/?]+)$/, (id) => capilla.view({ focus: "velas", vela: id }), "oracion"],
  [/^\/formacion$/, () => inicio.viewFormacion(), "formacion"],
  [/^\/red$/, () => { onAfterRender(() => { acompanar.homeCards(); desafio.homeCard(); }); return inicio.viewRed(); }, "red"],
  [/^\/buscar(?:\?q=(.*))?$/, (q) => inicio.viewBuscar(q || ""), "buscar"],
  [/^\/mi-camino$/, () => camJ.view(), "camino"],
  [/^\/ayuda(?:\?t=([a-z]+))?$/, (t) => ayuda.view(t), "ayuda"],
  [/^\/difusion$/, () => difusion.view(), "difusion"],
  [/^\/accesibilidad$/, () => a11y.viewPage(), "perfil"],
  [/^\/mi-camino\/(\d+)$/, (n) => camJ.view(n), "camino"],
  [/^\/cancionero$/, () => cancionero.viewList(), "oracion"],
  [/^\/dinamicas$/, () => dinamicas.viewList(), "materiales"],
  [/^\/acompanar$/, () => acompanar.viewMain(), "comunidad"],
  [/^\/acompanar\/(asistencia|jovenes|honor)$/, (t) => acompanar.viewMain(t), "comunidad"],
  [/^\/acompanar\/joven\/([^/?]+)$/, (id) => acompanar.viewJoven(id), "comunidad"],
  [/^\/pasaporte$/, () => acompanar.viewMine(), "perfil"],
  [/^\/dinamicas\/([^/?]+)$/, (id) => dinamicas.viewOne(id), "materiales"],
  [/^\/cancionero\/misa\/([^/?]+)$/, (id) => cancionero.viewMisa(id), "oracion"],
  [/^\/cancionero\/([^/?]+)(?:\?misa=([^&]+))?$/, (id, m) => cancionero.viewSong(id, m), "oracion"],
  [/^\/constancia$/, viewCertificate, "itinerario"],
  [/^\/perfil$/, viewProfile, "perfil"],
  [/^\/verificar\/(.+)$/, viewVerify, "verificar"],
  [/^\/admin(?:\/(.*))?$/, viewAdmin, "admin"],
];

let lastPath = null;
export async function render() {
  if (!S.content()) return; // aún cargando: el arranque dibuja apenas termina
  S.setPreviewOpen(cloud.enabled && !!cloud.viewingAs());
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
  // Formación, Materiales y revistas del Camino Ágape: solo para cuentas invitadas.
  const recursos = section === "materiales" || /^\/encuentros(\/|$)/.test(path);
  // Jóvenes de Ingreso y Madurez: las secciones del equipo quedan fuera de su espacio.
  if (cloud.enabled && cloud.state().isJoven && (section === "itinerario" || section === "comunidad" || recursos)) fn = viewSoloEquipo;
  if (cloud.enabled && (section === "itinerario" || section === "muro" || recursos) && !cloud.state().ready) fn = () => viewLogin(recursos ? "recursos" : section === "muro" ? "muro" : "curso");
  document.body.classList.toggle("is-admin", section === "admin");
  applyTheme();
  renderChrome(section);
  const html = await fn(...(match ? match.slice(1) : []));
  if (html == null) return;
  const v = viewEl();
  v.innerHTML = (section !== "admin" && S.isPreview() ? previewBanner() : "") + html;
  decorate(v, section);
  v.classList.remove("view-enter"); void v.offsetWidth; v.classList.add("view-enter");
  if (path !== lastPath) window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  lastPath = path;
  updateInstallSlot();
  afterRender.splice(0).forEach((f) => f());
  ayuda.afterRender();
  a11y.afterRender();
  grupo.afterRender(section);
  helpFab(section);
}
// Botón flotante «?»: abre la Ayuda en el tema de la sección donde estás.
function helpFab(section) {
  let b = document.getElementById("helpFab");
  if (section === "ayuda" || section === "admin" && !cloud.state().isStaff) { if (b) b.remove(); return; }
  if (!b) { b = document.createElement("a"); b.id = "helpFab"; b.className = "help-fab"; b.setAttribute("aria-label", "Ayuda"); b.title = "Ayuda: ¿cómo hago…?"; b.textContent = "?"; document.body.appendChild(b); }
  const t = { muro: "muro", red: "muro", agenda: "agenda", oracion: "oracion", itinerario: "itinerario", formacion: "itinerario", comunidad: "comunidad", camino: "camino", admin: "admin" }[section] || "inicio";
  b.href = `#/ayuda?t=${t}`;
}
// Identidad visual: ilustración de trazo simple en el encabezado de cada sección.
const HEAD_ILLUS = { formacion: "apostoles", red: "amigos", buscar: "pregunta", camino: "camino", agenda: "futuro", comunidad: "equipo", itinerario: "camino", materiales: "biblia", oracion: "jesus", muro: "amigos", perfil: "acogida", verificar: "envio", difusion: "envio" };
function decorate(v, section) {
  const hero = v.querySelector(".hero");
  if (hero && !hero.querySelector(".z-illus")) {
    hero.insertAdjacentHTML("afterbegin", '<i class="hero-blob b1"></i><i class="hero-blob b2"></i><i class="hero-blob b3"></i>');
    if (!hero.style.textAlign) hero.insertAdjacentHTML("beforeend", illus("emaus", "hero-illus"));
  }
  const head = v.querySelector(".page-head");
  const key = HEAD_ILLUS[section];
  if (head && key && !head.querySelector(".z-illus") && !v.querySelector(".zine")) {
    head.classList.add("has-illus");
    head.insertAdjacentHTML("beforeend", illus(key, "head-illus"));
  }
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
// Navegación en tres bloques: Formación · Comunidad · Espiritualidad
const NAV = [
  ["inicio", "#/", "Inicio", "home"],
  ["formacion", "#/formacion", "Formación", "route"],
  ["red", "#/red", "Comunidad", "users"],
  ["oracion", "#/oracion", "Espiritualidad", "flame"],
];
// Cada sección se marca en su bloque
const TAB_OF = { itinerario: "formacion", materiales: "formacion", camino: "formacion", muro: "red", agenda: "red", comunidad: "red", difusion: "red" };
const navFor = () => NAV;
// Franja «Ver como…» (solo equipo): recuerda que es una vista de prueba y cómo volver.
const VER_COMO = [["visitante", "Visitante sin cuenta"], ["ingreso", "Joven · Ingreso"], ["madurez", "Joven · Madurez"], ["aspirante", "Aspirante"], ["dirigente", "Dirigente"], ["coordinador", "Coordinador"]];
function viewAsBar() {
  let bar = document.getElementById("viewAsBar");
  const va = cloud.enabled && cloud.viewingAs();
  if (!va) { if (bar) bar.remove(); document.body.classList.remove("has-va"); return; }
  if (!bar) { bar = document.createElement("div"); bar.id = "viewAsBar"; bar.className = "va-bar"; document.body.prepend(bar); }
  document.body.classList.add("has-va");
  const lab = (VER_COMO.find((x) => x[0] === va) || [va, va])[1];
  bar.innerHTML = `<span>${icon("eye")} Estás viendo la app como <b>${esc(lab)}</b>. Tus permisos no cambian: lo que hagas se guarda como tú.</span>
    <span class="va-btns"><button class="btn btn-sm btn-ghost" data-action="vaOpen">Cambiar</button><button class="btn btn-sm btn-gold" data-action="vaSet" data-r="">Volver a mi vista</button></span>`;
}
function vaDialog() {
  let d = document.getElementById("vaDlg");
  if (!d) { d = document.createElement("dialog"); d.id = "vaDlg"; d.className = "sheet"; document.body.appendChild(d); }
  const cur = cloud.viewingAs(), coord = cloud.realRole() === "coordinador";
  d.innerHTML = `<div class="sheet-head"><div style="flex:1"><span class="eyebrow">Para guiar a alguien</span><h2>Ver la app como…</h2></div>
      <button type="button" class="icon-btn" data-action="vaClose" aria-label="Cerrar">${icon("x")}</button></div>
    <div class="sheet-body stack" style="--gap:12px">
      <p class="small muted">Cambia el menú y las secciones para que veas lo mismo que esa persona. No cambia tus permisos ni los datos: si publicas o editas algo, queda a tu nombre.</p>
      <div class="va-opts">${VER_COMO.filter(([k]) => !(coord && k === "coordinador")).map(([k, l]) => `<button class="btn ${cur === k ? "btn-primary" : "btn-soft"}" data-action="vaSet" data-r="${k}">${esc(l)}</button>`).join("")}</div>
      ${cur ? `<button class="btn btn-ghost" data-action="vaSet" data-r="">Volver a mi vista</button>` : ""}
    </div>`;
  d.showModal();
}
actions.vaOpen = () => vaDialog();
actions.vaClose = () => document.getElementById("vaDlg")?.close();
actions.vaSet = (el) => {
  document.getElementById("vaDlg")?.close();
  cloud.setViewAs(el.dataset.r || "");
  toast(el.dataset.r ? "Vista de prueba activada" : "Volviste a tu vista");
  location.hash = "#/";
};
function renderChrome(section) {
  viewAsBar();
  const tab = TAB_OF[section] || section;
  const cur = (k) => (k === tab ? 'aria-current="page"' : "");
  const NAV = navFor();
  $("#topNav").innerHTML = NAV.map(([k, h, l]) => `<a href="${h}" data-k="${k}" ${cur(k)}>${l}</a>`).join("");
  $("#bottomNav").innerHTML = NAV.filter((n) => n[4] !== "top").map(([k, h, l, ic]) =>
    `<a href="${h}" data-k="${k}" ${cur(k)}><span class="ico-wrap">${icon(ic)}</span>${l}</a>`).join("");
  const p = S.getProfile();
  const inAdmin = section === "admin" && (cloud.enabled ? cloud.state().isStaff : S.isAdmin());
  const guest = cloud.enabled && !cloud.state().ready;
  $("#profileChip").innerHTML = inAdmin
    ? `<span class="avatar">${icon("gear")}</span><span class="name">Gestión</span>`
    : guest ? `<span class="avatar">${icon("users")}</span><span class="name">Ingresar</span>`
    : `${cloud.enabled && AV.isValid((cloud.state().account || {}).avatar) ? `<span class="chip-av">${AV.svg(cloud.state().account.avatar)}</span>` : `<span class="avatar">${esc(initials(p.name))}</span>`}<span class="name">${esc(p.name || "Mi perfil")}</span>`;
  $("#profileChip").setAttribute("href", inAdmin ? "#/admin" : "#/perfil");
  if (!$("#hdrSearch")) $("#profileChip").insertAdjacentHTML("beforebegin", `<a class="hdr-search" id="hdrSearch" href="#/buscar" aria-label="Buscar en la app" title="Buscar">${icon("search")}</a>`);
  $("#hdrSearch").toggleAttribute("hidden", section === "buscar");
  novedades.mount();
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
    return { href: `#/vivir/${st.next.phase}/${encodeURIComponent(st.next.session.id)}`, label: st.readSessions ? "Continuar donde quedé" : "Comenzar el curso" };
  }
  return { href: "#/itinerario", quiz: st.next.phase, label: `Rendir evaluación del módulo ${course.phases[st.next.phase].phaseNum}` };
}

function viewHome() {
  onAfterRender(() => { novedades.refresh(); inicio.paintGospel(); agenda.homeNext(); });
  const course = S.activeCourse();
  const st = S.courseState(course);
  const p = S.getProfile();
  const first = (p.name || "").split(" ")[0];
  const nx = nextLink(course, st);

  const courseSlide = `<article class="car-slide" data-theme-c="blue" aria-roledescription="diapositiva">
      <i class="hero-blob b1"></i><i class="hero-blob b3"></i>
      <div class="car-body">
        <span class="eyebrow">${first ? `Hola, ${esc(first)} · ` : ""}Curso de formación de dirigentes</span>
        <h2 class="car-title">${heroTitle(course.title)}</h2>
        <p class="lead">${esc(course.description)}</p><button type="button" class="car-more" data-action="carLead">Leer más</button>
        <div class="actions">
          <a class="btn btn-gold" href="${nx.href}" ${nx.quiz != null ? `data-action="goQuiz" data-phase="${nx.quiz}"` : ""}>${esc(nx.label)} ${icon("arrowR")}</a>
        </div>
        <div class="hero-progress">
          <div class="bar"><i style="width:${st.totalSessions ? Math.round((st.readSessions / st.totalSessions) * 100) : 0}%"></i></div>
          <span class="small"><b>${st.readSessions}/${st.totalSessions}</b> unidades</span>
        </div>
      </div>
      ${illus("apostoles", "car-illus")}
    </article>`;
  const carousel = () => {
    const slides = [...portada.current()];
    if (papa.enCarrusel()) slides.splice(Math.min(1, slides.length), 0, { papa: true, label: "Con el Papa" });
    return `<section class="carousel" id="homeCarousel" aria-roledescription="carrusel" aria-label="Bienvenida">
    <div class="car-track" id="carTrack">${slides.map((x) => (x.papa ? papa.slideHTML() : x.course ? courseSlide : portada.slideHTML(x))).join("")}</div>
    ${slides.length > 1 ? `<div class="car-ctrl">
      <button class="icon-btn" data-action="carGo" data-d="-1" aria-label="Anterior">${icon("left")}</button>
      <div class="car-dots" role="tablist">${slides.map((x, i) => `<button role="tab" aria-label="${esc((x.label || x.title || "").replace(/\*/g, ""))}" data-action="carTo" data-i="${i}" class="${i ? "" : "on"}"></button>`).join("")}</div>
      <button class="icon-btn" data-action="carGo" data-d="1" aria-label="Siguiente">${icon("right")}</button>
    </div>` : ""}
  </section>`;
  };
  onAfterRender(() => portada.refresh().then((changed) => {
    const el = document.getElementById("homeCarousel");
    if (!changed || !el) return;
    el.outerHTML = carousel(); startCarousel();
  }));
  onAfterRender(startCarousel);

  onAfterRender(() => papa.paintHome().then((r) => {
    // si el equipo la ocultó (o la apagó en Gestión), se rehace el carrusel sin ella
    const has = !!document.querySelector(".papa-slide");
    if (r && has !== (r.on && !!r.it)) { const el = document.getElementById("homeCarousel"); if (el) { el.outerHTML = carousel(); startCarousel(); papa.paintHome(); } }
  }));
  onAfterRender(async () => {
    const list = cuenta.pickAll(await cloud.listAgenda(), 3);
    const slot = document.getElementById("countSlot");
    if (list.length && slot) { slot.innerHTML = list.map((e) => cuenta.html(e, { href: `#/agenda/${e.when}` })).join(""); cuenta.start(); }
  });
  // Inicio liviano: saludo + Evangelio, lo destacado (diapositivas), cuentas regresivas, la intención del Papa y la agenda.
  // El resto vive en las pestañas de abajo (Formación, Comunidad, Espiritualidad).
  return `
  ${inicio.greetHTML()}
  ${inicio.doorsHTML()}
  <section class="home-news">${carousel()}</section>
  <div id="countSlot"></div>
  <div id="agendaSlot" style="margin-top:16px"></div>
  ${cloud.enabled && !cloud.state().ready ? `<a class="card link camino-banner" href="presentaciones/se-puente.html" target="_blank" rel="noopener" style="margin-top:16px">
    <span class="tile-ico tile-brand" style="margin:0">${icon("sparkle")}</span>
    <span style="flex:1"><span class="eyebrow">¿Quieres ser dirigente?</span><strong>Sé puente</strong>
    <span class="muted small">Una presentación corta sobre qué es ser dirigente en Ágape y cómo es el curso.</span></span>${icon("right")}</a>` : ""}
  <div id="installSlot"></div>
  `;
}
let carTimer = null, carI = 0;
function startCarousel() {
  const track = document.getElementById("carTrack");
  clearInterval(carTimer);
  if (!track) return;
  carI = 0;
  const n = track.children.length;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const show = (i) => {
    carI = (i + n) % n;
    track.style.transform = `translateX(${-carI * 100}%)`;
    [...track.children].forEach((s, k) => { s.setAttribute("aria-hidden", k !== carI); s.inert = k !== carI; });
    document.querySelectorAll(".car-dots button").forEach((b, k) => { b.classList.toggle("on", k === carI); b.setAttribute("aria-selected", k === carI); });
  };
  const play = () => { clearInterval(carTimer); if (!reduce && n > 1) carTimer = setInterval(() => { if (!document.getElementById("carTrack")) return clearInterval(carTimer); show(carI + 1); }, 7000); };
  actions.carGo = (el) => { show(carI + +el.dataset.d); play(); };
  // «Leer más» en una diapositiva: abre el texto completo y detiene el carrusel mientras se lee
  actions.carLead = (el) => { const p = el.previousElementSibling; if (!p) return; const o = p.classList.toggle("open"); el.textContent = o ? "Mostrar menos" : "Leer más"; clearInterval(carTimer); if (!o) play(); };
  actions.carTo = (el) => { show(+el.dataset.i); play(); };
  const box = track.parentElement;
  box.onmouseenter = () => clearInterval(carTimer);
  box.onmouseleave = play;
  box.addEventListener("focusin", () => clearInterval(carTimer));
  let sx = null;
  box.addEventListener("touchstart", (e) => { sx = e.touches[0].clientX; }, { passive: true });
  box.addEventListener("touchend", (e) => { if (sx == null) return; const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) { show(carI + (dx < 0 ? 1 : -1)); play(); } sx = null; }, { passive: true });
  show(0); play();
  // «Leer más» solo donde el texto quedó cortado
  requestAnimationFrame(() => track.querySelectorAll(".car-more").forEach((b) => { const p = b.previousElementSibling; if (p && !p.classList.contains("open")) b.hidden = p.scrollHeight <= p.clientHeight + 2; }));
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
          const read = st.p.read[S.sessionKey(i, se)], pos = !read && S.getPos(course.id, S.sessionKey(i, se));
          return `<a class="session-row ${read ? "read" : ""}" href="#/vivir/${i}/${encodeURIComponent(se.id)}" data-search="${esc(plain(unitText(se)).toLowerCase())}">
            <span class="session-num">${read ? icon("check") : esc(se.id)}</span>
            <span style="min-width:0;flex:1"><h4>${esc(se.title)}</h4><p>${esc(plain(se.objective))}</p>${pos && pos.s > 0 ? `<span class="resume-chip">▶ Vas en la lámina ${pos.s + 1}${pos.n ? ` de ${pos.n}` : ""}</span>` : ""}</span>
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
  <nav class="crumbs no-print"><a href="#/itinerario">Formación</a>${icon("right")}<span>Módulo ${esc(ph.phaseNum)}</span>${icon("right")}<span>Unidad ${esc(se.id)}</span></nav>
  <header class="enc-head">
    <span class="eyebrow">Módulo ${esc(ph.phaseNum)} · ${esc(ph.title)}</span>
    <h1>${esc(se.title)}</h1>
    <div class="row-wrap">
      ${se.time ? `<span class="chip accent">${icon("sparkle")} ${esc(se.time)} de estudio</span>` : ""}
      <span class="chip">Unidad ${idxInPhase} de ${ph.sessions.length}</span>
      ${read ? `<span class="chip ok">${icon("check")} Completada</span>` : ""}
    </div>
  </header>

  <a class="uv-banner no-print" href="#/vivir/${i}/${encodeURIComponent(se.id)}"><span class="uv-banner-ico">▶</span>
    <span><b>Vivir la unidad en modo interactivo</b><small>Láminas, tarjetas, desafíos y puntos. Este texto queda como complemento para leer con calma.</small></span>${icon("arrowR")}</a>
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
  <nav class="crumbs no-print"><a href="#/itinerario">Formación</a>${icon("right")}<span>Mi cuaderno</span></nav>
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
  <nav class="crumbs no-print" style="margin-bottom:14px"><a href="#/itinerario">Formación</a>${icon("right")}<span>Constancia</span></nav>
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
  const row = (href, ic, title, sub, ext) => `<a class="fi-row" href="${href}"${ext ? ' target="_blank" rel="noopener"' : ""}>
      <span class="fi-ico">${icon(ic)}</span><span class="fi-txt"><b>${esc(title)}</b>${sub ? `<small>${esc(sub)}</small>` : ""}</span>${icon(ext ? "arrowR" : "right")}</a>`;
  const guide = (c) => {
    if (c.type === "action") {
      const has = !!(c.url && /^https?:\/\//.test(c.url));
      return has ? row(esc(c.url), "print", c.title, c.tag || "", true)
        : `<div class="fi-row is-off"><span class="fi-ico">${icon("print")}</span><span class="fi-txt"><b>${esc(c.title)}</b><small>Próximamente</small></span></div>`;
    }
    return `<details class="fi-det"><summary class="fi-row"><span class="fi-ico">${icon(c.type === "list" ? "route" : c.type === "crisis" ? "users" : "edit")}</span>
      <span class="fi-txt"><b>${esc(c.title)}</b>${c.tag ? `<small>${esc(c.tag)}</small>` : ""}</span>${icon("down")}</summary>
      <div class="fi-open">${cardHTML(c, "material")}</div></details>`;
  };
  const guides = (m.cards || []).filter((c) => c.type !== "action"), prints = (m.cards || []).filter((c) => c.type === "action");
  const FILES = [
    ["revistas", "Revistas", "#1351a4", "Las revistas del Camino Ágape, archivadas año tras año.", [archivoHTML()], null],
    ["presentaciones", "Presentaciones", "#ef591c", "Para proyectar a pantalla completa.", [
      row("presentaciones/se-puente.html", "sparkle", "Sé puente", "Para invitar a futuros dirigentes al curso", true),
      row("presentaciones/el-arte-de-encontrarnos.html", "grid", "El Arte de Encontrarnos", "Para el consejo pastoral, el párroco y las familias", true),
      row("presentaciones/mes-de-maria.html", "flame", "Mes de María", "Con María, puente hacia Jesús · 31 días", true),
      row("presentaciones/sacramentos.html", "sparkle", "Los Sacramentos", "Qué es un sacramento y los siete, explicados en simple", true),
    ]],
    ["musica", "Música", "#ffba03", "Para animar las celebraciones.", [
      row("#/cancionero", "book", "Cancionero Ágape", "Acordes, cambio de tono, proyección y repertorios"),
    ]],
    ["guias", "Guías para el encuentro", "#8ad2fa", "Pautas breves para preparar y acompañar cada reunión.", [
      row("#/dinamicas", "sparkle", "Banco de dinámicas", "Rompehielos, juegos, oración y reflexión, por para qué sirven"), ...guides.map(guide)]],
    ["imprimir", "Para imprimir", "#fde0d2", "Listos para llevar en papel.", [
      row("#/encuentros", "print", "Revistas Camino Ágape", "Se imprimen completas o solo el encuentro de la semana"),
      row("#/cancionero", "print", "Cancionero en PDF", "Desde el cancionero: Exportar → PDF"),
      ...prints.map(guide),
    ]],
  ].filter((f) => f[4].length);
  const nav = [...FILES.map(([k, t]) => [k, t]), ["biblioteca", "Biblioteca"]];
  onAfterRender(() => loadArchivo().then((ch) => { const b = $("#fiArchivo"); if (ch && b) b.outerHTML = archivoHTML(); }));
  return `<header class="page-head"><span class="eyebrow">Herramientas de la pastoral</span><h1>${esc(m.title)}</h1><p>${esc(m.desc)}</p></header>
    <nav class="cap-nav" aria-label="Ficheros">${nav.map(([k, t]) => `<a href="#" data-action="fiGo" data-k="${k}">${esc(t)}</a>`).join("")}</nav>
    <div class="fi-grid">${FILES.map(([k, t, col, d, items, count], i) => `
      <section class="fichero" id="fi-${k}" style="--fi:${col}">
        <span class="fi-tab">Fichero ${String(i + 1).padStart(2, "0")}</span>
        <header class="fi-head"><h2>${esc(t)}</h2>${count === null ? "" : `<span class="fi-count">${items.length}</span>`}</header>
        <p class="fi-desc">${esc(d)}</p>
        <div class="fi-list">${items.join("")}</div>
      </section>`).join("")}
    </div>
    ${libraryHTML(lib, FILES.length + 1)}`;
}
// Revistas por año: las ediciones del Camino Ágape (en la app) y lo que el equipo archiva con enlace.
let archivo = null;
try { archivo = JSON.parse(localStorage.getItem("agape_archivo") || "null"); } catch {}
async function loadArchivo() {
  const a = cloud.getArchivo ? await cloud.getArchivo() : null;
  if (!a) return false;
  const ch = JSON.stringify(a) !== JSON.stringify(archivo);
  archivo = a; try { localStorage.setItem("agape_archivo", JSON.stringify(a)); } catch {}
  return ch;
}
const REV_SHORT = [["principal", "Principal"], ["coordinacion", "Coordinación"], ["ingreso", "Ingreso"], ["madurez", "Madurez"], ["aspirante", "Aspirante"]];
function archivoHTML() {
  const admin = cloud.enabled && cloud.state().isAdmin;
  const years = new Map();
  camino.EDICIONES.forEach((e) => { const y = years.get(e.year) || { year: e.year, items: [] }; y.items.push({ ed: e }); years.set(e.year, y); });
  ((archivo && archivo.items) || []).forEach((it, i) => { const y = years.get(+it.year) || { year: +it.year, items: [] }; y.items.push({ link: it, i }); years.set(+it.year, y); });
  const list = [...years.values()].sort((a, b) => b.year - a.year);
  return `<div id="fiArchivo" class="fi-years">
    ${list.map((y) => `<div class="fi-year"><span class="fi-y">${y.year}</span><div class="fi-y-items">${y.items.map((x) => x.ed ? `
      <a class="fi-row" href="${x.ed.actual ? "#/encuentros" : `#/archivo/${x.ed.year}`}"><span class="fi-txt"><b>Camino Ágape ${x.ed.year} · ${esc(x.ed.ciclo)}</b>
        <small>${x.ed.actual ? "Edición actual · " : ""}${esc(x.ed.rango)}</small></span>${icon("right")}</a>
      <div class="fi-revs">${REV_SHORT.map(([k, l]) => `<a class="chip" href="${x.ed.actual ? "#/encuentros" : `#/archivo/${x.ed.year}`}/${k}">${l}</a>`).join("")}</div>`
      : `<div class="fi-row-wrap"><a class="fi-row" href="${esc(x.link.url)}" target="_blank" rel="noopener"><span class="fi-txt"><b>${esc(x.link.title)}</b>${x.link.note ? `<small>${esc(x.link.note)}</small>` : ""}</span>${icon("arrowR")}</a>
        ${admin ? `<button class="icon-btn fi-del" data-action="arcDel" data-i="${x.i}" aria-label="Quitar del archivo">${icon("x")}</button>` : ""}</div>`).join("")}</div></div>`).join("")}
    ${admin ? `<button class="btn btn-sm btn-ghost" style="margin-top:10px" data-action="arcNew">${icon("plus")} Archivar una revista</button>` : ""}
  </div>`;
}
actions.arcNew = () => {
  let d = document.getElementById("arcDlg");
  if (!d) { d = document.createElement("dialog"); d.id = "arcDlg"; d.className = "sheet"; document.body.appendChild(d); }
  d.innerHTML = `<form method="dialog" id="arcForm">
    <div class="sheet-head"><div style="flex:1"><span class="eyebrow">Materiales · Revistas</span><h2>Archivar una revista</h2></div>
      <button type="button" class="icon-btn" data-action="arcClose" aria-label="Cerrar">${icon("x")}</button></div>
    <div class="sheet-body stack" style="--gap:12px">
      <div class="ag-form-row">
        <div class="field"><label>Año</label><input class="input" type="number" name="year" min="1990" max="2100" required value="${new Date().getFullYear()}"></div>
        <div class="field"><label>Título</label><input class="input" name="title" required maxlength="120" placeholder="Revista Madurez 2026 (impresa)"></div>
      </div>
      <div class="field"><label>Enlace</label><input class="input" name="url" required maxlength="500" placeholder="https://drive.google.com/…"><span class="xs muted">Un PDF o una carpeta de Drive con permiso de lectura para quien tenga el enlace.</span></div>
      <div class="field"><label>Nota (opcional)</label><input class="input" name="note" maxlength="140" placeholder="Encuentros de marzo a noviembre"></div>
    </div>
    <div class="sheet-foot"><span class="spacer"></span><button type="button" class="btn btn-ghost" data-action="arcClose">Cancelar</button><button class="btn btn-primary" type="submit">Archivar</button></div>
  </form>`;
  d.showModal();
};
actions.arcClose = () => document.getElementById("arcDlg")?.close();
actions.arcDel = async (el) => {
  if (!confirm("¿Quitar esta revista del archivo? El archivo original no se borra.")) return;
  const items = [...((archivo && archivo.items) || [])]; items.splice(+el.dataset.i, 1);
  try { await cloud.saveArchivo({ items }); archivo = { items }; render(); toast("Quitada del archivo"); } catch { toast("No se pudo guardar", ""); }
};
document.addEventListener("submit", async (e) => {
  if (e.target.id !== "arcForm") return;
  e.preventDefault();
  const f = new FormData(e.target);
  const it = { year: +f.get("year"), title: String(f.get("title") || "").trim(), url: String(f.get("url") || "").trim(), note: String(f.get("note") || "").trim() };
  if (!/^https?:\/\//.test(it.url)) { toast("El enlace debe empezar con https://", ""); return; }
  const items = [...((archivo && archivo.items) || []), it];
  try { await cloud.saveArchivo({ items }); archivo = { items }; document.getElementById("arcDlg")?.close(); render(); toast("Revista archivada"); }
  catch { toast("No se pudo guardar. Revisa tu conexión.", ""); }
});
actions.fiGo = (el) => document.getElementById("fi-" + el.dataset.k)?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });

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
function libraryHTML(lib, num = 6) {
  if (!lib.total) return "";
  const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };
  return `
  <section id="fi-biblioteca" class="fichero fi-lib" style="--fi:#0b2566">
    <span class="fi-tab">Fichero ${String(num).padStart(2, "0")}</span>
    <header class="fi-head"><h2>Biblioteca digital</h2><span class="fi-count">${lib.total}</span></header>
    <p class="fi-desc">Los documentos que citan los cursos, cada uno con el enlace a su fuente oficial.</p>
    <label class="search" style="display:block;margin:12px 0 4px">
      ${icon("search")}<span class="sr-only">Buscar en la biblioteca</span>
      <input id="libSearch" type="search" placeholder="Buscar: Christus vivit, Catecismo, Biblia…" autocomplete="off">
    </label>
    <div class="lib-cols">${lib.groups.map((g) => `
      <div class="lib-group" data-lib-group>
        <h3 class="lib-h">${esc(g.t)}</h3>
        <ul class="lib-simple">${g.items.map((it) => `<li class="lib-item" data-lib="${esc((it.title + " " + host(it.url)).toLowerCase())}">
          <a href="${esc(it.url)}" target="_blank" rel="noopener"><b>${esc(it.title)}</b><span>${esc(host(it.url))} ↗</span></a></li>`).join("")}</ul>
      </div>`).join("")}</div>
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
    ${!isNew ? `${a11y.panelHTML()}<div id="installSlot" style="margin-top:14px"></div>
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
function viewSoloEquipo() {
  return `<div class="card" style="max-width:520px;margin:6vh auto 0;text-align:center;padding:32px">
    ${illus("camino", "")}
    <h1 class="display" style="font-size:1.6rem;margin-top:10px">Esto es para el equipo de dirigentes</h1>
    <p class="muted" style="margin-top:8px">Tu espacio está en <b>Mi Camino</b>: el encuentro de tu etapa de cada semana, tu desafío y tu pasaporte.</p>
    <a class="btn btn-primary" style="margin-top:16px" href="#/mi-camino">Ir a Mi Camino</a></div>`;
}
function viewLogin(kind = "curso") {
  const st = cloud.state();
  const R = kind === "recursos", MU = kind === "muro";
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
      <span class="eyebrow">${MU ? "Muro y chat" : R ? "Materiales y revistas" : "Curso de formación de dirigentes"}</span>
      <h1>${MU ? `Lo que conversa el <em>grupo</em>` : R ? `Recursos para <em>dirigentes</em>` : `Tu camino de <em>formación</em>`}</h1>
      <p class="lead">${MU ? "El muro y el chat son del grupo: para cuidar a los jóvenes, solo los ven quienes tienen cuenta. Ingresa con tu cuenta de Google." : R ? "Las revistas del Camino Ágape, las presentaciones, las guías y el banco de dinámicas son para quienes tienen cuenta. Ingresa con tu cuenta de Google para verlos." : "Ingresa con tu cuenta de Google para avanzar a tu ritmo, guardar tu cuaderno y recibir tu constancia. Tu avance te sigue en cualquier dispositivo."}</p>
    </section>
    <div class="card" style="text-align:center;padding:28px">
      ${msg || `<button class="btn btn-primary btn-block google-btn" data-action="signIn">${googleIcon()} Continuar con Google</button>
        <p class="xs muted" style="margin-top:12px">Solo pueden ingresar quienes fueron invitados por el equipo coordinador.</p>`}
      <p class="small" style="margin-top:14px">¿Aún no eres dirigente? <a href="presentaciones/se-puente.html" target="_blank" rel="noopener"><b>Mira «Sé puente»</b></a></p>
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
      <p>${esc(a.email)} · <span class="chip ${cloud.isStaffRole(a.role) ? "warn" : "accent"}">${esc(cloud.roleLabel(a.role))}</span></p></header>
    <form class="card stack" id="accountForm" style="--gap:14px">
      <div class="field"><label for="acName">Nombre y apellido</label><input class="input big" id="acName" name="name" required value="${esc(a.name)}"></div>
      <div class="field"><label for="acParish">Capilla o parroquia</label><input class="input big" id="acParish" name="parish" value="${esc(a.parish || "")}"></div>
      <p class="xs muted">Tu nombre aparecerá en la constancia. Tu avance se guarda en tu cuenta; tu cuaderno es privado y solo tú puedes leerlo.</p>
      <button class="btn btn-primary btn-block" type="submit">Guardar cambios</button>
    </form>
    <section class="card av-card" id="avCard">${avPicker()}</section>
    ${a11y.panelHTML()}
    <div class="row-wrap" style="justify-content:center;margin-top:14px">
      <a class="btn btn-soft" href="#/pasaporte">${icon("award")} Mi pasaporte</a>
      ${st.isGuide ? `<a class="btn btn-soft" href="#/acompanar">${icon("check")} Acompañar</a>` : ""}
    </div>
    <div class="row-wrap" style="justify-content:center;margin-top:16px">
      ${st.isStaff ? `<a class="btn btn-soft" href="#/admin${st.isAdmin ? "" : "/portada"}">${icon("gear")} Gestión</a>
        <button class="btn btn-soft" data-action="vaOpen">${icon("eye")} Ver como…</button>` : ""}
      <a class="btn btn-soft" href="#/ayuda">? Ayuda</a>
      <button class="btn btn-ghost" data-action="signOut">${icon("out")} Cerrar sesión</button>
    </div>
    <div id="installSlot" style="margin-top:14px"></div>
  </div>`;
}
// Selector de avatar (Mi cuenta): arma tu monito, elige un personaje o un sticker de la comunidad
let avDraft = null, avKey = null, avTab = null;
function avPicker() {
  const a = cloud.state().account || {};
  if (!avDraft) avDraft = AV.parse(a.avatar) || AV.parse(AV.randomKey());
  if (!avTab) avTab = AV.kind(a.avatar) || "m";
  if (!avKey) avKey = AV.isValid(a.avatar) ? a.avatar : AV.keyOf(avDraft);
  const key = avKey, saved = a.avatar === key;
  const swatch = (k, colors) => colors.map((c, i) => `<button class="av-sw ${avDraft[k] === i ? "on" : ""}" style="--c:${c}" data-action="avSet" data-k="${k}" data-v="${i}" aria-label="${AV.OPTS[k].label} ${i + 1}"></button>`).join("");
  const mini = (k) => Array.from({ length: AV.OPTS[k].n }, (_, i) => `<button class="av-mini ${avDraft[k] === i ? "on" : ""}" data-action="avSet" data-k="${k}" data-v="${i}" title="${esc(AV.OPTS[k].names[i])}">${AV.svg(AV.keyOf({ ...avDraft, [k]: i }))}</button>`).join("");
  const grid = (pre, keys, names) => `<div class="av-grid">${keys.map((k) => `<button class="av-pick ${key === pre + k ? "on" : ""}" data-action="avPick" data-key="${pre}${k}" title="${esc(names[k])}">${AV.svg(pre + k)}<small>${esc(names[k])}</small></button>`).join("")}</div>`;
  const tab = (t, l) => `<button class="av-tab ${avTab === t ? "on" : ""}" data-action="avTab" data-t="${t}" role="tab" aria-selected="${avTab === t}">${l}</button>`;
  const body = avTab === "j" ? `<p class="muted small">Personajes con onda para representarte.</p>${grid("j:", AV.PJ_KEYS, Object.fromEntries(AV.PJ_KEYS.map((k) => [k, AV.PJ[k][0]])))}`
    : avTab === "k" ? `<p class="muted small">Los mismos dibujos de nuestros stickers: Jesús, María, los santos y la comunidad.</p>${grid("k:", AV.STK_KEYS, AV.STK)}`
    : `<div class="av-row"><span>${AV.OPTS.h.label}</span><div>${mini("h")}</div></div>
    <div class="av-row"><span>${AV.OPTS.c.label}</span><div>${swatch("c", AV.HAIRC)}</div></div>
    <div class="av-row"><span>${AV.OPTS.s.label}</span><div>${swatch("s", AV.SKIN)}</div></div>
    <div class="av-row"><span>${AV.OPTS.f.label}</span><div>${mini("f")}</div></div>
    <div class="av-row"><span>${AV.OPTS.x.label}</span><div>${mini("x")}</div></div>
    <div class="av-row"><span>${AV.OPTS.r.label}</span><div>${mini("r")}</div></div>
    <div class="av-row"><span>${AV.OPTS.b.label}</span><div>${mini("b")}</div></div>`;
  return `<div class="av-head"><div class="av-big">${AV.svg(key)}</div>
      <div style="flex:1;min-width:180px"><h3>Mi avatar</h3><p class="muted small">Aparece junto a tu nombre en el chat, el muro y la lista de quienes están en línea.</p>
        <div class="row-wrap" style="margin-top:10px">${avTab === "m" ? `<button class="btn btn-sm btn-ghost" data-action="avRandom">🎲 Al azar</button>` : ""}
        <button class="btn btn-sm ${saved ? "btn-soft" : "btn-primary"}" data-action="avSave" ${saved ? "disabled" : ""}>${saved ? "Guardado ✓" : "Guardar avatar"}</button></div></div></div>
    <div class="av-tabs" role="tablist">${tab("m", "🧑 Arma tu monito")}${tab("j", "🦙 Personajes")}${tab("k", "✨ Stickers")}</div>
    ${body}`;
}
const repaintAv = () => { const c = $("#avCard"); if (c) c.innerHTML = avPicker(); };
actions.avSet = (el) => { avDraft = { ...avDraft, [el.dataset.k]: +el.dataset.v }; avKey = AV.keyOf(avDraft); repaintAv(); };
actions.avRandom = () => { avDraft = AV.parse(AV.randomKey()); avKey = AV.keyOf(avDraft); repaintAv(); };
actions.avTab = (el) => { avTab = el.dataset.t; if (avTab === "m") avKey = AV.keyOf(avDraft); repaintAv(); };
actions.avPick = (el) => { avKey = el.dataset.key; repaintAv(); };
actions.avSave = async () => {
  try { await cloud.updateMyProfile({ avatar: avKey }); toast("¡Avatar guardado!"); render(); }
  catch { toast("No se pudo guardar. Revisa tu conexión.", ""); }
};
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
      <a class="btn btn-ghost" style="margin-top:18px" href="#/">Ir al inicio de agAPPe</a>
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
window.addEventListener("agape:logro", () => toast("🎉 ¡Felicitaciones! Compartimos tu logro en el muro de la comunidad", "ok", 6000));
camino.setup({ actions, render: () => render(), cloud });
chat.setup({ actions, render: () => render(), onAfterRender, onLeave, cloud });
agenda.setup({ actions, render: () => render(), onAfterRender, onLeave, cloud });
portada.setup({ actions, render: () => render(), onAfterRender, cloud });
familiasAdmin.setup({ actions, render: () => render(), onAfterRender, cloud });
cancionero.setup({ actions, render: () => render(), onAfterRender, onLeave, cloud });
dinamicas.setup({ actions, render: () => render(), onAfterRender, onLeave, cloud });
acompanar.setup({ actions, render: () => render(), onAfterRender, onLeave, cloud });
difusion.setup({ actions, onAfterRender });
viva.setup({ actions, render: () => render(), onLeave, S });
camJ.setup({ actions, render: () => render(), cloud, S });
ayuda.setup({ actions, render: () => render(), onAfterRender, cloud });
desafio.setup({ actions, render: () => render(), cloud });
inicio.setup({ actions, render: () => render(), onAfterRender, camJ, agenda, wall });
papa.registerActions(actions);
capilla.setup({ actions, render: () => render(), onAfterRender, onLeave, cloud, content: () => S.content() });

async function boot() {
  try {
    if (cloud.enabled) await cloud.init();
    await S.loadContent(cloud.enabled ? cloud.fetchContent : null);
    if (cloud.enabled) cloud.onChange(render); // después de cargar el contenido, para no dibujar sin datos
    if (cloud.enabled) setTimeout(() => cloud.countVisit(), 5000); // una visita por dispositivo y día (sin datos personales)
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
