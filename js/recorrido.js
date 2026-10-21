// Guía de agAPPe (#/recorrido): la puerta de entrada a la app, para todos.
// Un recorrido en historias (se pasa tocando, como los estados) y un mapa de la app que dice
// qué hay en cada pestaña y qué se abre con cuenta. Dos vistas: «Sin cuenta» y «Con cuenta».
import { esc, icon } from "./util.js";
import { illus } from "./ilustraciones.js";

let ctx = null; // { actions, render, onAfterRender, onLeave, cloud }
export function setup(c) { ctx = c; registerActions(); }
const $ = (s, r = document) => r.querySelector(s);
const st = () => (ctx.cloud.enabled ? ctx.cloud.state() : { ready: true, enabled: false });
const em = (t) => esc(t).replace(/\*(.+?)\*/g, "<em>$1</em>");

// Vista elegida: parte según si la persona ingresó; se puede cambiar para ver la otra.
let mode = null;
const curMode = () => mode || (st().ready ? "cuenta" : "visita");

// ---------------------------------------------------------------------------
// El recorrido: una historia por parada
// ---------------------------------------------------------------------------
// c: fondo · ink: color del texto · ill: ilustración · go: [texto, enlace]
// v/a: lo que cambia sin cuenta (visita) o con cuenta (a)
const NAV_MOCK = `<div class="rc-mock-nav" aria-hidden="true">
  <span class="on">${icon("home")}<b>Inicio</b></span><span>${icon("route")}<b>Formación</b></span>
  <span>${icon("users")}<b>Comunidad</b></span><span>${icon("flame")}<b>Espiritualidad</b></span></div>`;
const tags = (list, m) => `<div class="rc-tags" aria-hidden="true">${list.map(([t, lock]) => `<span class="${lock && m === "visita" ? "is-lock" : ""}">${lock && m === "visita" ? icon("lock") : ""}${esc(t)}</span>`).join("")}</div>`;

const STOPS = [
  { k: "hola", c: "#0b2566", ink: "#fff6e5", pop: "#ffba03", ill: "celular", hand: "bienvenido a casa", t: "Esto es *agAPPe*",
    p: ["El espacio virtual de encuentro de la Pastoral Juvenil Ágape.", "Aquí rezamos, nos encontramos y crecemos juntos, estés donde estés."],
    foot: "Parroquia San Miguel de Yungay" },
  { k: "moverte", c: "#8ad2fa", ink: "#0b2566", pop: "#ef591c", ill: "camino", hand: "cómo moverte", t: "Cuatro pestañas, *todo a mano*",
    p: ["En el celular están abajo; en el computador, arriba.", "La lupa busca en toda la app: una canción, una oración o un juego."],
    mock: () => NAV_MOCK },
  { k: "inicio", c: "#ffba03", ink: "#0b2566", pop: "#ef591c", ill: "luz", hand: "inicio", t: "Lo de hoy, *de un vistazo*",
    p: ["El Evangelio del día, las novedades de la pastoral, lo que viene en la agenda y radios católicas en vivo."],
    mock: (m) => tags([["Evangelio de hoy"], ["Novedades"], ["Agenda"], ["Radios"], ["Desafío de la semana", 1]], m), go: ["Ir a Inicio", "#/"] },
  { k: "espiritu", c: "#fff0c2", ink: "#0b2566", pop: "#c98a00", ill: "oracion", hand: "espiritualidad", t: "Un lugar para *estar con Jesús*",
    p: ["La Capilla Ágape: el Evangelio con un video breve, el Rosario paso a paso, Oremus y un rato de oración."],
    v: "Está abierta para todos, también para tu familia.",
    a: "Con tu cuenta compartes tus intenciones, rezas por las de otros y abres todo el cancionero.",
    mock: (m) => tags([["Evangelio"], ["Rosario"], ["Oremus"], ["Un rato con Jesús"], ["Intenciones", 1], ["Cancionero", 1]], m), go: ["Entrar a la Capilla", "#/oracion"] },
  { k: "comunidad", c: "#ef591c", ink: "#fff6e5", pop: "#ffba03", ill: "amigos", hand: "comunidad", t: "La Plaza *Ágape*",
    p: ["Lo que vivimos y conversamos como grupo, y todo lo que viene en la agenda."],
    v: "Sin cuenta puedes jugar (prueba Emaús) y ver la agenda. El muro, el chat y los momentos son de la comunidad con cuenta.",
    a: "Publica en el muro, conversa en las salas, sube momentos y suma sellos en tu pasaporte.",
    mock: (m) => tags([["Juegos"], ["Agenda"], ["Momentos", 1], ["Muro", 1], ["Chat", 1], ["Mi pasaporte", 1]], m), go: ["Ir a Comunidad", "#/red"] },
  { k: "formacion", c: "#e1f3fd", ink: "#0b2566", pop: "#1351a4", ill: "apostoles", hand: "formación", t: "Para *crecer* en la fe",
    p: ["Esta guía, las credenciales para los encuentros y «Sé puente», si te tinca ser dirigente."],
    v: "Con cuenta, cada joven tiene Mi Camino: el encuentro de su etapa, semana a semana.",
    a: "Mi Camino te muestra el encuentro de tu etapa. Los dirigentes tienen sus cursos, la Revista y los materiales.",
    mock: (m) => tags([["Guía de agAPPe"], ["Credenciales"], ["Sé puente"], ["Mi Camino", 1], ["Cursos", 1]], m), go: ["Ir a Formación", "#/formacion"] },
  { k: "cuenta", c: "#0b2566", ink: "#fff6e5", pop: "#8ad2fa", ill: "acogida",
    hand: { v: "tu cuenta", a: "tu perfil" }, t: { v: "¿Quieres *tu cuenta*?", a: "Esta app *es tuya*" },
    p: { v: ["Pídele a tu dirigente que te invite con tu correo de Google.", "Después toca «Ingresar» arriba y elige ese correo. ¡Listo!"],
      a: ["Arma tu avatar en Mi perfil y mira tu pasaporte.", "En la campana te avisamos lo nuevo, sin molestar."] },
    go: { v: ["Ingresar", "#/perfil"], a: ["Ir a Mi perfil", "#/perfil"] } },
  { k: "llevala", c: "#8ad2fa", ink: "#0b2566", pop: "#ffba03", ill: "escuchar", hand: "llévala contigo", t: "En tu celular, *como una app*",
    p: ["Android: menú ⋮ → «Instalar app».", "iPhone: Compartir → «Agregar a inicio».", "¿Dudas? Toca el botón ? en cualquier pantalla."],
    foot: "En Accesibilidad puedes agrandar la letra o hacer que te lea en voz alta." },
  { k: "fin", c: "#0b2566", ink: "#fff6e5", pop: "#ffba03", ill: "eucaristia", hand: "nos vemos", t: "La app es *una puerta*",
    p: ["El encuentro de verdad es con Jesús y en la comunidad, en la Eucaristía y en cada encuentro.", "¡Te esperamos!"],
    go: ["Ver el mapa de la app", "#/recorrido?mapa"], end: true },
];
const pick = (x, m) => (x && typeof x === "object" && !Array.isArray(x) && ("v" in x || "a" in x) ? x[m === "visita" ? "v" : "a"] : x);

function stopHTML(s, i, m) {
  const p = pick(s.p, m), go = pick(s.go, m), extra = m === "visita" ? s.v : s.a;
  return `<section class="rc-stop" style="--sb:${s.c};--si:${s.ink};--sp:${s.pop}" aria-roledescription="historia" aria-label="${i + 1} de ${STOPS.length}">
    <div class="rc-stop-art"><i class="rc-sun"></i>${illus(s.ill, "rc-stop-il")}</div>
    <div class="rc-stop-txt">
      <span class="rc-hand">${esc(pick(s.hand, m))}</span>
      <h2>${em(pick(s.t, m))}</h2>
      ${p.map((x) => `<p>${esc(x)}</p>`).join("")}
      ${s.mock ? s.mock(m) : ""}
      ${extra ? `<p class="rc-extra">${m === "visita" ? icon("lock") : icon("check")}<span>${esc(extra)}</span></p>` : ""}
      ${s.foot ? `<p class="rc-foot">${esc(s.foot)}</p>` : ""}
      ${go ? `<a class="btn rc-go" href="${go[1]}" data-action="rcGo">${esc(go[0])} ${icon("arrowR")}</a>` : ""}
    </div>
  </section>`;
}

// Reproductor a pantalla completa: toca a la derecha para seguir y a la izquierda para volver.
let at = 0;
function openPlayer(i = 0) {
  closePlayer();
  at = Math.max(0, Math.min(STOPS.length - 1, i));
  const d = document.createElement("div");
  d.id = "rcPlay"; d.className = "rc-play"; d.setAttribute("role", "dialog"); d.setAttribute("aria-modal", "true"); d.setAttribute("aria-label", "Recorrido por agAPPe");
  d.innerHTML = `<div class="rc-bars" aria-hidden="true">${STOPS.map(() => "<i><b></b></i>").join("")}</div>
    <button class="rc-x" data-action="rcClose" aria-label="Cerrar el recorrido">${icon("x")}</button>
    <div class="rc-stage" id="rcStage" aria-live="polite"></div>
    <div class="rc-ctrl">
      <button class="rc-arrow" data-action="rcStep" data-d="-1" aria-label="Anterior">${icon("arrowL")}</button>
      <span class="rc-count" id="rcCount"></span>
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
  d.style.setProperty("--sb", s.c); d.style.setProperty("--si", s.ink); d.style.setProperty("--sp", s.pop);
  d.querySelectorAll(".rc-bars i").forEach((b, k) => { b.className = k < at ? "done" : k === at ? "on" : ""; });
  $("#rcStage").innerHTML = stopHTML(s, at, curMode());
  $("#rcCount").textContent = `${at + 1} / ${STOPS.length}`;
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
// El mapa de la app: qué hay en cada pestaña y quién lo ve
// ---------------------------------------------------------------------------
// q: quién · todos | cuenta | jovenes (jóvenes y aspirantes) | dirigentes | equipo
const Q = { todos: "Para todos", cuenta: "Con cuenta", jovenes: "Jóvenes con cuenta", dirigentes: "Dirigentes", equipo: "Equipo" };
const MAP = [
  { t: "Inicio", hand: "lo de hoy", c: "#0b2566", s: "#e8eef9", ico: "home", href: "#/", items: [
    ["Evangelio de hoy", "La frase del día. Tócala para leerlo entero.", "#/evangelio", "todos"],
    ["Novedades", "Las diapositivas con lo que está pasando en la pastoral.", "#/", "todos"],
    ["Cuentas regresivas y agenda", "Lo que viene: encuentros, misas y actividades.", "#/agenda", "todos"],
    ["Radios y podcast", "Radios católicas en vivo y nuestro podcast.", "#/oracion/radio", "todos"],
    ["Desafío de la semana", "Un gesto concreto para vivir lo del encuentro.", "#/", "cuenta"],
  ] },
  { t: "Formación", hand: "para crecer", c: "#1351a4", s: "#e1f3fd", ico: "route", href: "#/formacion", items: [
    ["Guía de agAPPe", "Este recorrido y el mapa de la app.", "#/recorrido", "todos"],
    ["Credenciales", "Tarjetas con tu foto y nombre para los encuentros.", "#/credenciales", "todos"],
    ["¿Quieres ser dirigente?", "La presentación «Sé puente».", "presentaciones/se-puente.html", "todos"],
    ["Mi Camino", "El encuentro de tu etapa, semana a semana.", "#/mi-camino", "jovenes"],
    ["Cursos de formación", "Unidades, evaluaciones y tu avance.", "#/itinerario", "dirigentes"],
    ["Materiales y dinámicas", "Nuestra Revista, presentaciones, guías y juegos para preparar.", "#/materiales", "dirigentes"],
  ] },
  { t: "Comunidad", hand: "para encontrarnos", c: "#ef591c", s: "#fde0d2", ico: "users", href: "#/red", items: [
    ["Juegos", "Emaús, Trivia Ágape, ¡En la frente!, El Impostor y más.", "#/juegos", "todos"],
    ["Agenda", "El calendario de la pastoral. Puedes sumarlo a tu celular.", "#/agenda", "todos"],
    ["Momentos", "Las fotos de lo que vivimos juntos.", "#/momentos", "cuenta"],
    ["Muro", "Avisos, preguntas, encuestas y logros del grupo.", "#/muro", "cuenta"],
    ["Chat", "Salas para conversar en grupo.", "#/chat", "cuenta"],
    ["Nuestras familias y pasaporte", "Tu grupo pequeño, tus encuentros y tus sellos.", "#/nuestras-familias", "cuenta"],
    ["Estudio de difusión", "Marco de foto, historias y stickers para invitar.", "#/difusion", "cuenta"],
  ] },
  { t: "Espiritualidad", hand: "para rezar", c: "#c98a00", s: "#fff0c2", ico: "flame", href: "#/oracion", items: [
    ["Capilla Ágape", "El Evangelio del día con un video breve.", "#/oracion", "todos"],
    ["Rezar el Rosario", "Paso a paso, cuenta a cuenta, con María.", "#/oracion/rosario", "todos"],
    ["Oremus", "Nuestras oraciones y las de siempre.", "#/oremus", "todos"],
    ["Un rato con Jesús", "Oración personal en casa o ante el Santísimo.", "#/oracion/silencio", "todos"],
    ["Intenciones", "Comparte por quién rezas y reza por los demás.", "#/oracion/velas", "cuenta"],
    ["Cancionero", "Canciones con acordes. Sin cuenta ves las originales de Ágape.", "#/cancionero", "cuenta"],
  ] },
  { t: "Siempre a mano", hand: "en cualquier pantalla", c: "#0b2566", s: "#fff6e5", ico: "sparkle", items: [
    ["La lupa", "Busca en toda la app.", "#/buscar", "todos"],
    ["El botón ?", "Respuestas cortas a «¿cómo hago…?» y te muestra dónde tocar.", "#/ayuda", "todos"],
    ["Accesibilidad", "Letra más grande, lectura fácil y «Escuchar».", "#/accesibilidad", "todos"],
    ["Para las familias", "Una página para papás, mamás y apoderados.", "familias/", "todos"],
    ["Mi perfil", "Tu avatar, tu pasaporte y tus datos.", "#/perfil", "cuenta"],
    ["La campana", "Te avisa lo nuevo: avisos, intenciones y respuestas.", "", "cuenta"],
  ] },
];
const canSee = (q, m) => {
  if (q === "todos") return true;
  if (m === "visita") return false;
  if (!ctx.cloud.enabled) return true;
  const s = st();
  if (!s.ready) return true; // está mirando la vista «Con cuenta» sin haber ingresado
  if (q === "jovenes") return !!s.isJoven || s.role === "aspirante";
  if (q === "dirigentes") return !s.isJoven && s.role !== "aspirante";
  if (q === "equipo") return !!s.isStaff;
  return true;
};
function mapHTML(m) {
  return `<div class="rc-map">${MAP.map((b) => `<section class="rc-blk" style="--bc:${b.c};--bs:${b.s}">
    <header>${b.href ? `<a href="${b.href}" class="rc-blk-h">` : `<span class="rc-blk-h">`}<span class="rc-blk-ico">${icon(b.ico)}</span>
      <span><small>${esc(b.hand)}</small><strong>${esc(b.t)}</strong></span>${b.href ? `${icon("right")}</a>` : "</span>"}</header>
    <ul>${b.items.map(([t, d, href, q]) => {
      const ok = canSee(q, m), lock = !ok;
      const tag = q === "todos" ? "" : `<span class="rc-q ${lock ? "is-lock" : ""}">${lock ? icon("lock") : ""}${esc(Q[q])}</span>`;
      const inner = `<span class="rc-it"><span class="rc-it-t"><strong>${esc(t)}</strong>${tag}</span><span class="rc-it-d">${esc(d)}</span></span>`;
      const ext = href && !href.startsWith("#");
      return `<li class="${lock ? "is-lock" : ""}">${href && ok ? `<a href="${href}" ${ext ? 'target="_blank" rel="noopener"' : ""}>${inner}${icon("right")}</a>` : `<div>${inner}</div>`}</li>`;
    }).join("")}</ul>
  </section>`).join("")}</div>`;
}

// ---------------------------------------------------------------------------
// La página
// ---------------------------------------------------------------------------
export function view(q = "") {
  const m = curMode(), s = st();
  ctx.onLeave(closePlayer);
  if (/(^|&)play\b/.test(q)) ctx.onAfterRender(() => openPlayer(0));
  if (/(^|&)mapa\b/.test(q)) ctx.onAfterRender(() => document.getElementById("rcMapa")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  let seen = 0; try { seen = +localStorage.getItem("agape_recorrido") || 0; } catch {}
  return `<div class="rc">
  <section class="rc-hero" aria-labelledby="rcT">
    <div class="rc-hero-txt">
      <span class="eyebrow">Guía de agAPPe · para todos</span>
      <span class="rc-hand">bienvenido a casa</span>
      <h1 id="rcT">Tu espacio para <em>encontrarnos</em></h1>
      <p>agAPPe es la casa virtual de la Pastoral Juvenil Ágape. En dos minutos te mostramos todo lo que hay y cómo moverte.</p>
      <div class="rc-hero-btns">
        <button class="btn btn-gold" data-action="rcPlay" data-i="0">${icon("arrowR")} ${seen ? "Ver el recorrido otra vez" : "Comenzar el recorrido"}</button>
        <a class="btn rc-btn-line" href="#/recorrido?mapa" data-action="rcMapa">Ver el mapa de la app</a>
      </div>
    </div>
    <div class="rc-hero-art" aria-hidden="true"><i class="rc-sun"></i>${illus("celular", "rc-hero-il")}</div>
  </section>

  <nav class="rc-reel" aria-label="Paradas del recorrido">
    ${STOPS.map((x, i) => `<button class="rc-reel-it" data-action="rcPlay" data-i="${i}" style="--sb:${x.c};--si:${x.ink};--sp:${x.pop}">
      <span class="rc-reel-ring${i <= seen && seen ? " is-seen" : ""}"><span>${illus(x.ill, "rc-reel-il")}</span></span>
      <span class="rc-reel-l">${esc(pick(x.hand, m))}</span></button>`).join("")}
  </nav>

  <section class="rc-sec" id="rcMapa" aria-labelledby="rcMT">
    <div class="rc-sec-head">
      <div><span class="rc-hand">manual de navegación</span><h2 id="rcMT">El mapa de <em>agAPPe</em></h2>
      <p class="muted">Qué hay en cada pestaña y qué se abre con tu cuenta.</p></div>
      <div class="rc-switch" role="radiogroup" aria-label="Ver la app">
        <button role="radio" aria-checked="${m === "visita"}" data-action="rcMode" data-m="visita">${icon("eye")} Sin cuenta</button>
        <button role="radio" aria-checked="${m === "cuenta"}" data-action="rcMode" data-m="cuenta">${icon("users")} Con cuenta</button>
      </div>
    </div>
    ${mapHTML(m)}
  </section>

  ${m === "visita" ? `<section class="rc-sec rc-steps" aria-labelledby="rcCT">
    <div><span class="rc-hand">sin cuenta también puedes rezar y jugar</span><h2 id="rcCT">¿Cómo tengo <em>mi cuenta</em>?</h2></div>
    <ol>
      <li><b>1</b><span><strong>Habla con tu dirigente</strong>Pídele que te invite con tu correo de Google.</span></li>
      <li><b>2</b><span><strong>Toca «Ingresar»</strong>Arriba a la derecha, con ese mismo correo.</span></li>
      <li><b>3</b><span><strong>¡Bienvenido!</strong>Arma tu avatar y date una vuelta por la Plaza.</span></li>
    </ol>
    ${ctx.cloud.enabled && !s.ready ? `<button class="btn btn-primary" data-action="signIn">Ingresar</button>` : ""}
  </section>` : ""}

  <section class="rc-end">
    <div><span class="rc-hand">¿te quedó alguna duda?</span>
    <p>Toca el botón <b class="rc-q-dot">?</b> en cualquier pantalla: te respondemos corto y te mostramos dónde tocar.</p></div>
    <a class="btn btn-ghost" href="#/ayuda">Abrir la ayuda ${icon("arrowR")}</a>
  </section>
  </div>`;
}

// Tarjeta grande para Formación y la diapositiva de Inicio
export function bannerHTML() {
  let seen = 0; try { seen = +localStorage.getItem("agape_recorrido") || 0; } catch {}
  return `<section class="hub-cbanner rc-banner" aria-labelledby="rcBT">
    <div class="hub-cb-txt">
      <span class="eyebrow">Guía de agAPPe · para todos</span>
      <span class="hub-cb-hand">${seen ? "date otra vuelta" : "empieza por aquí"}</span>
      <h2 id="rcBT">Recorre agAPPe en dos minutos</h2>
      <p class="hub-cb-meta">Qué hay en cada pestaña, qué puedes hacer sin cuenta y qué se abre con ella.</p>
      <div class="hub-cb-btns"><a class="btn btn-gold" href="#/recorrido?play">${seen ? "Ver el recorrido" : "Comenzar el recorrido"} ${icon("arrowR")}</a><a class="btn btn-ghost" href="#/recorrido?mapa">Mapa de la app</a></div>
    </div>
    <div class="hub-cb-art" aria-hidden="true"><i class="hub-cb-sun"></i>${illus("celular", "hub-cb-il")}</div>
  </section>`;
}

function registerActions() {
  const A = ctx.actions;
  A.rcPlay = (el) => openPlayer(+el.dataset.i || 0);
  A.rcClose = () => closePlayer();
  A.rcStep = (el) => step(+el.dataset.d);
  A.rcGo = (el) => { const h = el.getAttribute("href"); closePlayer(); location.hash = h.replace(/^#/, ""); if (h === "#/recorrido?mapa") ctx.render(); };
  A.rcMapa = () => document.getElementById("rcMapa")?.scrollIntoView({ behavior: "smooth", block: "start" });
  A.rcMode = (el) => {
    mode = el.dataset.m; const y = window.scrollY;
    Promise.resolve(ctx.render()).then(() => window.scrollTo(0, y));
  };
}
