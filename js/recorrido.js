// Guía de agAPPe (#/recorrido): la puerta de entrada a la app, para todos.
// Una carta de bienvenida, un recorrido corto que se pasa tocando la pantalla
// y un mapa de la casa con lo que hay en cada pestaña.
import { esc, icon } from "./util.js";
import { illus } from "./ilustraciones.js";

let ctx = null; // { actions, render, onAfterRender, onLeave, cloud }
export function setup(c) { ctx = c; registerActions(); }
const $ = (s, r = document) => r.querySelector(s);
const st = () => (ctx.cloud.enabled ? ctx.cloud.state() : { ready: true });
const guest = () => ctx.cloud.enabled && !st().ready;

// ---------------------------------------------------------------------------
// El recorrido: una idea por pantalla
// ---------------------------------------------------------------------------
// bg: fondo · ink: texto · sun: círculo detrás del dibujo
const NAVY = "#0b2566", CREAM = "#fff6e5";
const NAV_MOCK = `<div class="rc-mock-nav" aria-hidden="true">
  <span>${icon("home")}<b>Inicio</b></span><span>${icon("route")}<b>Formación</b></span>
  <span>${icon("users")}<b>Comunidad</b></span><span>${icon("flame")}<b>Espiritualidad</b></span></div>`;

const STOPS = [
  { bg: NAVY, ink: CREAM, sun: "#ffba03", ill: "acogida", hand: "hola",
    t: "Te estábamos esperando",
    p: "Esta es agAPPe, la casa virtual de la Pastoral Juvenil Ágape. Acompáñanos a conocerla por dentro." },
  { bg: CREAM, ink: NAVY, sun: "#8ad2fa", ill: "camino", hand: "para moverte",
    t: "Cuatro puertas",
    p: "Inicio, Formación, Comunidad y Espiritualidad. En el celular están abajo; en el computador, arriba.",
    extra: () => NAV_MOCK },
  { bg: "#fff0c2", ink: NAVY, sun: "#ffba03", ill: "luz", hand: "inicio",
    t: "Cada día, algo nuevo",
    p: "Al entrar te recibe el Evangelio del día y lo que está pasando en la pastoral.",
    go: ["Ir a Inicio", "#/"] },
  { bg: "#fff6e5", ink: NAVY, sun: "#f6d77a", ill: "oracion", hand: "espiritualidad",
    t: "Un lugar para rezar",
    p: "La Capilla siempre está abierta: la Palabra de cada día, el Rosario y un rato de silencio con Jesús.",
    go: ["Entrar a la Capilla", "#/oracion"] },
  { bg: "#fde0d2", ink: NAVY, sun: "#ef591c", ill: "amigos", hand: "comunidad",
    t: "Donde nos encontramos",
    p: "Las fotos de lo que vivimos, el muro, el chat, la agenda y algunos juegos para compartir.",
    go: ["Ir a Comunidad", "#/red"] },
  { bg: "#e1f3fd", ink: NAVY, sun: "#8ad2fa", ill: "apostoles", hand: "formación",
    t: "Para seguir creciendo",
    p: "Los encuentros de cada etapa y la formación de quienes acompañan a otros.",
    go: ["Ir a Formación", "#/formacion"] },
  { bg: NAVY, ink: CREAM, sun: "#8ad2fa", ill: "escuchar",
    hand: { g: "tu cuenta", a: "tu perfil" },
    t: { g: "Tu lugar te espera", a: "Tu rincón en la casa" },
    p: { g: "Pide a tu dirigente que te invite con tu correo de Google. Con tu cuenta se abren el muro, el chat y tus encuentros.",
      a: "En Mi perfil puedes armar tu avatar y ver tu pasaporte con los encuentros a los que has ido." },
    go: { g: ["Ingresar", "#/perfil"], a: ["Ir a Mi perfil", "#/perfil"] } },
  { bg: NAVY, ink: CREAM, sun: "#ffba03", ill: "eucaristia", hand: "nos vemos",
    t: "Esto es solo una puerta",
    p: "El encuentro verdadero es con Jesús, en la Eucaristía y en la comunidad. Te esperamos.",
    go: ["Ver el mapa de la casa", "#/recorrido?mapa"], end: true },
];
const pick = (x) => (x && typeof x === "object" && !Array.isArray(x) && "g" in x ? x[guest() ? "g" : "a"] : x);

function stopHTML(s, i) {
  const go = pick(s.go);
  return `<section class="rc-stop" aria-roledescription="pantalla" aria-label="${i + 1} de ${STOPS.length}">
    <div class="rc-stop-art"><i class="rc-sun"></i>${illus(s.ill, "rc-stop-il")}</div>
    <div class="rc-stop-txt">
      <span class="rc-hand">${esc(pick(s.hand))}</span>
      <h2>${esc(pick(s.t))}</h2>
      <p>${esc(pick(s.p))}</p>
      ${s.extra ? s.extra() : ""}
      ${go ? `<a class="rc-go" href="${go[1]}" data-action="rcGo">${esc(go[0])} ${icon("arrowR")}</a>` : ""}
    </div>
  </section>`;
}

// Pantalla completa: se toca a la derecha para seguir y a la izquierda para volver.
let at = 0;
function openPlayer(i = 0) {
  closePlayer();
  at = Math.max(0, Math.min(STOPS.length - 1, i));
  const d = document.createElement("div");
  d.id = "rcPlay"; d.className = "rc-play"; d.setAttribute("role", "dialog"); d.setAttribute("aria-modal", "true"); d.setAttribute("aria-label", "Recorrido por agAPPe");
  d.innerHTML = `<div class="rc-bars" aria-hidden="true">${STOPS.map(() => "<i><b></b></i>").join("")}</div>
    <button class="rc-x" data-action="rcClose" aria-label="Cerrar">${icon("x")}</button>
    <div class="rc-stage" id="rcStage" aria-live="polite"></div>
    <div class="rc-ctrl">
      <button class="rc-arrow" data-action="rcStep" data-d="-1" aria-label="Anterior">${icon("arrowL")}</button>
      <button class="rc-arrow is-next" data-action="rcStep" data-d="1" aria-label="Siguiente">${icon("arrowR")}</button>
    </div>`;
  document.body.appendChild(d);
  document.body.classList.add("rc-lock");
  paintStop();
  d.addEventListener("pointerdown", onDown);
  d.addEventListener("pointerup", onUp);
  document.addEventListener("keydown", onKey);
  setTimeout(() => d.querySelector(".is-next")?.focus(), 50);
}
function paintStop() {
  const d = $("#rcPlay"); if (!d) return;
  const s = STOPS[at];
  d.style.setProperty("--sb", s.bg); d.style.setProperty("--si", s.ink); d.style.setProperty("--sp", s.sun);
  d.querySelectorAll(".rc-bars i").forEach((b, k) => { b.className = k < at ? "done" : k === at ? "on" : ""; });
  $("#rcStage").innerHTML = stopHTML(s, at);
  d.querySelector('[data-d="-1"]').disabled = at === 0;
  const nx = d.querySelector(".is-next");
  nx.innerHTML = s.end ? icon("check") : icon("arrowR");
  nx.setAttribute("aria-label", s.end ? "Terminar" : "Siguiente");
  try { localStorage.setItem("agape_recorrido", String(Math.max(at, +localStorage.getItem("agape_recorrido") || 0))); } catch {}
}
function step(dlt) {
  if (dlt > 0 && at === STOPS.length - 1) { closePlayer(); return; }
  at = Math.max(0, Math.min(STOPS.length - 1, at + dlt));
  paintStop();
}
export function closePlayer() {
  $("#rcPlay")?.remove();
  document.body.classList.remove("rc-lock");
  document.removeEventListener("keydown", onKey);
}
const onKey = (e) => {
  if (e.key === "Escape") closePlayer();
  else if (e.key === "ArrowRight") step(1);
  else if (e.key === "ArrowLeft") step(-1);
};
let down = null;
const onDown = (e) => { down = { x: e.clientX, y: e.clientY, t: e.target }; };
const onUp = (e) => {
  if (!down) return;
  const dx = e.clientX - down.x, dy = e.clientY - down.y, t = down.t; down = null;
  if (t.closest("a,button")) return;
  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) { step(dx < 0 ? 1 : -1); return; }
  if (Math.abs(dx) < 10 && Math.abs(dy) < 10) step(e.clientX < window.innerWidth * 0.3 ? -1 : 1);
};

// ---------------------------------------------------------------------------
// El mapa de la casa
// ---------------------------------------------------------------------------
// q: quién lo ve · todos | cuenta | jovenes (jóvenes y aspirantes) | dirigentes
const ROOMS = [
  { t: "Inicio", hand: "la entrada", ill: "luz", c: "#0b2566", s: "#fff0c2", href: "#/",
    d: "Lo primero que ves al abrir la app. Aquí te espera la Palabra del día y lo que se viene.",
    items: [["El Evangelio del día", "#/evangelio", "todos"], ["Las novedades de la pastoral", "#/", "todos"],
      ["La agenda de las próximas semanas", "#/agenda", "todos"], ["Radios católicas y nuestro podcast", "#/oracion/radio", "todos"],
      ["El desafío de la semana", "#/", "cuenta"]] },
  { t: "Espiritualidad", hand: "la capilla", ill: "oracion", c: "#c98a00", s: "#fff6e5", href: "#/oracion",
    d: "Un lugar tranquilo para estar con Jesús, cuando quieras y desde donde estés. Abierto también para tu familia.",
    items: [["El Evangelio con un video breve", "#/oracion", "todos"], ["El Rosario, paso a paso", "#/oracion/rosario", "todos"],
      ["Oremus: nuestras oraciones", "#/oremus", "todos"], ["Un rato con Jesús", "#/oracion/silencio", "todos"],
      ["Las intenciones de la comunidad", "#/oracion/velas", "cuenta"], ["El cancionero completo", "#/cancionero", "cuenta"]] },
  { t: "Comunidad", hand: "la plaza", ill: "amigos", c: "#ef591c", s: "#fde0d2", href: "#/red",
    d: "Donde compartimos lo que vivimos entre un encuentro y otro.",
    items: [["La agenda de la pastoral", "#/agenda", "todos"], ["Juegos, como Emaús o la Trivia", "#/juegos", "todos"],
      ["Momentos: nuestras fotos", "#/momentos", "cuenta"], ["El muro del grupo", "#/muro", "cuenta"],
      ["El chat", "#/chat", "cuenta"], ["Tu familia de Ágape y tu pasaporte", "#/nuestras-familias", "cuenta"]] },
  { t: "Formación", hand: "el taller", ill: "apostoles", c: "#1351a4", s: "#e1f3fd", href: "#/formacion",
    d: "Para seguir creciendo en la fe y aprender a acompañar a otros.",
    items: [["Esta guía", "#/recorrido", "todos"], ["Credenciales para los encuentros", "#/credenciales", "todos"],
      ["«Sé puente»: ser dirigente en Ágape", "presentaciones/se-puente.html", "todos"],
      ["Mi Camino: el encuentro de tu etapa", "#/mi-camino", "jovenes"],
      ["Cursos, revistas y materiales", "#/materiales", "dirigentes"]] },
];
const canSee = (q) => {
  if (q === "todos" || !ctx.cloud.enabled) return true;
  const s = st();
  if (!s.ready) return false;
  if (q === "jovenes") return !!s.isJoven || s.role === "aspirante";
  if (q === "dirigentes") return !s.isJoven && s.role !== "aspirante";
  return true;
};
function roomsHTML() {
  const g = guest();
  return ROOMS.map((r, i) => {
    const list = r.items.filter(([, , q]) => g || canSee(q));
    return `<section class="rc-room${i % 2 ? " is-alt" : ""}" style="--bc:${r.c};--bs:${r.s}">
      <div class="rc-room-art" aria-hidden="true">${illus(r.ill, "rc-room-il")}</div>
      <div class="rc-room-txt">
        <span class="rc-hand">${esc(r.hand)}</span>
        <h3>${esc(r.t)}</h3>
        <p>${esc(r.d)}</p>
        <ul>${list.map(([t, href, q]) => {
          const lock = !canSee(q), ext = !href.startsWith("#");
          return lock ? `<li class="is-lock">${icon("lock")}<span>${esc(t)}</span></li>`
            : `<li><a href="${href}" ${ext ? 'target="_blank" rel="noopener"' : ""}>${esc(t)}</a></li>`;
        }).join("")}</ul>
        <a class="rc-room-go" href="${r.href}">Entrar ${icon("arrowR")}</a>
      </div>
    </section>`;
  }).join("");
}

// ---------------------------------------------------------------------------
// La página
// ---------------------------------------------------------------------------
export function view(q = "") {
  const g = guest();
  ctx.onLeave(closePlayer);
  if (/(^|&)play\b/.test(q)) ctx.onAfterRender(() => openPlayer(0));
  if (/(^|&)mapa\b/.test(q)) ctx.onAfterRender(() => document.getElementById("rcMapa")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  return `<div class="rc">
  <section class="rc-letter" aria-labelledby="rcT">
    <div class="rc-letter-art" aria-hidden="true"><i class="rc-sun"></i>${illus("acogida", "rc-letter-il")}</div>
    <div class="rc-letter-txt">
      <span class="rc-hand">hola, qué alegría que estés aquí</span>
      <h1 id="rcT">Bienvenido a agAPPe</h1>
      <p>Esta es la casa virtual de la Pastoral Juvenil Ágape. La hicimos pensando en ti, para que podamos rezar juntos, compartir lo que vivimos y seguir creciendo en la fe, también entre un encuentro y otro.</p>
      <p>Pasa, ponte cómodo y recórrela con calma.</p>
      <span class="rc-sign">Tus dirigentes de Ágape</span>
      <div class="rc-letter-btns">
        <button class="btn btn-primary" data-action="rcPlay" data-i="0">Recorrer la casa ${icon("arrowR")}</button>
        <button class="btn btn-ghost" data-action="rcMapa">Ver el mapa</button>
      </div>
    </div>
  </section>

  <section class="rc-sec rc-move" aria-labelledby="rcNT">
    <span class="rc-hand">antes de empezar</span>
    <h2 id="rcNT">Cómo moverte</h2>
    <p class="rc-lead">Toda la app está ordenada en cuatro pestañas. En el celular las encuentras abajo; en el computador, arriba.</p>
    ${NAV_MOCK}
    <div class="rc-tips">
      <div><span class="rc-tip-ico">${icon("search")}</span><p><strong>La lupa</strong> busca en toda la app: una canción, una oración o un juego.</p></div>
      <div><span class="rc-tip-ico rc-tip-q">?</span><p><strong>El botón de ayuda</strong> responde dudas y te muestra dónde tocar.</p></div>
      <div><span class="rc-tip-ico">${icon("eye")}</span><p><strong>Accesibilidad</strong> agranda la letra o lee los textos en voz alta.</p></div>
    </div>
  </section>

  <section class="rc-sec" id="rcMapa" aria-labelledby="rcMT">
    <span class="rc-hand">qué hay en cada lugar</span>
    <h2 id="rcMT">El mapa de la casa</h2>
    ${g ? `<p class="rc-lead">Sin cuenta ya puedes rezar, jugar y ver la agenda. Lo que tiene un candado ${icon("lock")} se abre cuando ingresas.</p>` : ""}
    <div class="rc-rooms">${roomsHTML()}</div>
  </section>

  ${g ? `<section class="rc-sec rc-join" aria-labelledby="rcCT">
    <span class="rc-hand">tu lugar te espera</span>
    <h2 id="rcCT">Cómo tener tu cuenta</h2>
    <ol>
      <li><b>1</b><p>Conversa con tu dirigente y pídele que te invite con tu correo de Google.</p></li>
      <li><b>2</b><p>Toca «Ingresar», arriba a la derecha, y elige ese mismo correo.</p></li>
      <li><b>3</b><p>Arma tu avatar y pasa a saludar a la comunidad.</p></li>
    </ol>
    ${ctx.cloud.enabled ? `<button class="btn btn-primary" data-action="signIn">Ingresar</button>` : ""}
  </section>` : ""}

  <section class="rc-sec rc-install" aria-labelledby="rcIT">
    <h2 id="rcIT">Tenla en tu celular</h2>
    <p class="rc-lead">Puedes dejar agAPPe en tu pantalla de inicio y abrirla como cualquier aplicación.</p>
    <div class="rc-tips">
      <div><span class="rc-tip-ico">${icon("phone")}</span><p><strong>Android</strong> En Chrome, abre el menú ⋮ y elige «Instalar app».</p></div>
      <div><span class="rc-tip-ico">${icon("phone")}</span><p><strong>iPhone</strong> En Safari, toca Compartir y luego «Agregar a inicio».</p></div>
    </div>
  </section>

  <section class="rc-close">
    ${illus("eucaristia", "rc-close-il")}
    <p>Que esta casa nos ayude a encontrarnos con Jesús y entre nosotros.<br>Nos vemos en el próximo encuentro.</p>
    <span class="rc-sign">Pastoral Juvenil Ágape</span>
  </section>
  </div>`;
}

// Tarjeta para Formación
export function bannerHTML() {
  return `<section class="hub-cbanner rc-banner" aria-labelledby="rcBT">
    <div class="hub-cb-txt">
      <span class="eyebrow">Guía de agAPPe</span>
      <span class="hub-cb-hand">empieza por aquí</span>
      <h2 id="rcBT">Bienvenido a agAPPe</h2>
      <p class="hub-cb-meta">Te mostramos la casa por dentro: qué hay en cada pestaña y cómo moverte.</p>
      <div class="hub-cb-btns"><a class="btn btn-gold" href="#/recorrido?play">Recorrer la casa ${icon("arrowR")}</a><a class="btn btn-ghost" href="#/recorrido">Ver la guía</a></div>
    </div>
    <div class="hub-cb-art" aria-hidden="true"><i class="hub-cb-sun"></i>${illus("acogida", "hub-cb-il")}</div>
  </section>`;
}

function registerActions() {
  const A = ctx.actions;
  A.rcPlay = (el) => openPlayer(+el.dataset.i || 0);
  A.rcClose = () => closePlayer();
  A.rcStep = (el) => step(+el.dataset.d);
  A.rcGo = (el) => {
    const h = el.getAttribute("href"); closePlayer();
    if (h === "#/recorrido?mapa" && location.hash.startsWith("#/recorrido")) { document.getElementById("rcMapa")?.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
    location.hash = h.replace(/^#/, "");
  };
  A.rcMapa = () => document.getElementById("rcMapa")?.scrollIntoView({ behavior: "smooth", block: "start" });
}
