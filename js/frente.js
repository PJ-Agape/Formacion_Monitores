// ¡En la frente! Mímicas con el celular en la frente.
// Quien tiene el teléfono se lo pone en la frente con la pantalla hacia los demás; ellos actúan
// la palabra sin hablar. Inclinar la pantalla hacia el suelo = ¡adivinó! (+1); hacia el techo = paso.
// También se puede tocar: mitad derecha = adivinó, mitad izquierda = paso.
// Funciona sin internet; nada se guarda en la nube.
import { esc, icon } from "./util.js";

let ctx = null; // { actions, onAfterRender, onLeave }
export function setup(c) { ctx = c; registerActions(); }
const $ = (s, r = document) => r.querySelector(s);

// Palabras pensadas para actuarlas.
export const TEMAS = {
  biblia: { l: "Escenas de la Biblia", w: ["Arca de Noé", "David y Goliat", "Jonás y la ballena", "Moisés abre el mar", "Zaqueo sube al árbol", "Jesús lava los pies",
    "Multiplicación de los panes", "Jesús camina sobre el agua", "Pesca milagrosa", "Hijo pródigo", "Buen samaritano", "Torre de Babel", "Adán y Eva",
    "Daniel y los leones", "Sansón", "Los Reyes Magos", "Pastores de Belén", "Última Cena", "Bodas de Caná", "Oveja perdida", "Ciego que vuelve a ver",
    "Bajan al paralítico por el techo", "Pedro niega a Jesús", "Tomás toca las heridas", "Pentecostés", "Anunciación", "Diez mandamientos", "Los muros de Jericó"] },
  misa: { l: "En la misa y la parroquia", w: ["Tocar las campanas", "Monaguillo", "Dar la paz", "Arrodillarse", "Comulgar", "Persignarse", "Echar incienso",
    "Leer en misa", "Cantar en el coro", "Tocar guitarra", "Pasar la colecta", "Bendecir con agua", "Procesión", "Rezar el rosario", "Bautizo",
    "Encender el cirio", "Dormirse en la homilía", "Llegar atrasado a misa", "Aplaudir en la canción", "Abrazo de la paz", "Ensayar los cantos", "Matrimonio",
    "Primera comunión", "Peregrinación"] },
  grupo: { l: "Vida de grupo", w: ["Armar la carpa", "Fogata", "Meterse al saco de dormir", "Viaje en bus", "Mochila de misión", "Dinámica", "Foto grupal",
    "Completada", "Olla común", "Visitar a los abuelitos", "Pintar la sede", "Partido de fútbol", "Tomar once", "Abrazo de grupo", "Tallarinata",
    "Cantar junto al fuego", "Rifa", "Retiro en silencio", "Lavar la loza", "Hacer guardia en la noche", "Repartir volantes", "Kermés", "Mes de María"] },
  animales: { l: "Animales de la Biblia", w: ["Burro", "Paloma", "Oveja", "León", "Ballena", "Serpiente", "Camello", "Gallo", "Pez", "Cordero", "Cuervo", "Rana",
    "Langosta", "Buey", "Águila", "Cerdo", "Caballo", "Lobo", "Perro", "Gorrión"] },
  diario: { l: "Todos los días", w: ["Lavarse los dientes", "Andar en bicicleta", "Sacarse una selfie", "Hacer sopaipillas", "Bailar cueca", "Hacer las tareas",
    "Pasear al perro", "Tomar la micro", "Andar en skate", "Quedarse dormido", "Ver una película de terror", "Hacer un queque", "Cortar el pasto",
    "Tender la ropa", "Jugar a la pelota", "Pescar", "Nadar", "Manejar", "Pintar un cuadro", "Cocinar huevos", "Cargar el celular", "Ponerse zapatos",
    "Barrer", "Llorar viendo una película", "Hacer ejercicio", "Elevar un volantín"] },
};
const TIEMPOS = [45, 60, 90];

// ---------------------------------------------------------------------------
// Ajustes (solo en este teléfono)
// ---------------------------------------------------------------------------
const KEY = "agape_frente";
const saved = (() => { try { return JSON.parse(localStorage.getItem(KEY) || "null") || {}; } catch { return {}; } })();
const cfg = { teams: Math.min(4, Math.max(1, saved.teams || 2)), names: Array.isArray(saved.names) ? saved.names.slice(0, 4) : [], cat: saved.cat || "mix", time: saved.time || 60 };
let used = Array.isArray(saved.used) ? saved.used : [];
const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ ...cfg, used: used.slice(-80) })); } catch { /* sin almacenamiento */ } };
const teamName = (i) => (cfg.names[i] || "").trim() || (cfg.teams === 1 ? "Ustedes" : `Equipo ${i + 1}`);
const rnd = (n) => { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % n; };

let game = null; // { scores:[], turn, rounds, phase: "turn"|"summary"|"final", last:{ok:[],pass:[]} }
let play = null; // ronda en curso (pantalla completa)

function deck() {
  const pool = cfg.cat === "mix" ? Object.values(TEMAS).flatMap((t) => t.w) : TEMAS[cfg.cat].w;
  let fresh = pool.filter((w) => !used.includes(w));
  if (fresh.length < 12) { used = used.filter((u) => !pool.includes(u)); fresh = pool.slice(); }
  for (let i = fresh.length - 1; i > 0; i--) { const j = rnd(i + 1); [fresh[i], fresh[j]] = [fresh[j], fresh[i]]; }
  return fresh;
}

// ---------------------------------------------------------------------------
// Vistas
// ---------------------------------------------------------------------------
export function view() {
  ctx.onLeave(() => endPlay(true));
  ctx.onAfterRender(paint);
  return `<div class="imp" id="frRoot"></div>`;
}
function paint() {
  const root = $("#frRoot"); if (!root) return;
  root.innerHTML = !game ? setupHTML() : game.phase === "turn" ? turnHTML() : game.phase === "summary" ? summaryHTML() : finalHTML();
  root.scrollIntoView({ block: "start" });
}

export { frenteArt as artSvg } from "./juegos-arte.js";
import { frenteArt as artSvg } from "./juegos-arte.js";

function setupHTML() {
  const cats = [...Object.entries(TEMAS), ["mix", { l: "Mezcla" }]];
  return `<a class="imp-back" href="#/juegos">${icon("left")} Juegos</a>
  <header class="imp-hero fr-hero">
    <span class="imp-mask" aria-hidden="true">${artSvg()}</span>
    <div><h1>¡En la <em>frente</em>!</h1><p>Ponte el celular en la frente sin mirar. Tus amigos actúan la palabra, sin hablar, hasta que la adivines.</p></div>
  </header>
  <details class="imp-how"><summary>¿Cómo se juega?</summary>
    <ol><li>Quien adivina se pone el celular en la frente, acostado y con la pantalla hacia los demás.</li>
      <li>Los demás hacen mímica de la palabra. ¡Nada de hablar!</li>
      <li><b>¿Adivinaste?</b> Inclina la pantalla hacia el suelo: un punto. <b>¿Muy difícil?</b> Inclínala hacia el techo para pasar.</li>
      <li>Si no funciona la inclinación, toca la mitad derecha para «adivinó» y la izquierda para «paso».</li></ol></details>

  <form id="frSetup" class="imp-setup">
    <section><h2>Equipos</h2>
      <div class="imp-step"><button type="button" class="imp-pm" data-action="fteTeams" data-d="-1" aria-label="Un equipo menos">−</button>
        <output id="frTeamsN">${cfg.teams}</output><button type="button" class="imp-pm" data-action="fteTeams" data-d="1" aria-label="Un equipo más">+</button></div>
      <p class="muted small">De a dos, deja 1 equipo. Para competir, de 2 a 4.</p>
      <div class="imp-names" id="frNames">${namesHTML()}</div></section>
    <section><h2>Tema</h2><div class="imp-chips">
      ${cats.map(([k, t]) => `<label class="imp-chip"><input type="radio" name="cat" value="${k}" ${cfg.cat === k ? "checked" : ""}><span><b>${t.l}</b></span></label>`).join("")}</div></section>
    <section class="imp-opts"><label class="imp-opt"><span>Tiempo por turno</span>
      <select name="time">${TIEMPOS.map((v) => `<option value="${v}" ${cfg.time === v ? "selected" : ""}>${v} segundos</option>`).join("")}</select></label></section>
    <button class="btn btn-primary imp-go" type="submit">${icon("check")} Empezar</button>
  </form>`;
}
const namesHTML = () => cfg.teams === 1 ? "" : Array.from({ length: cfg.teams }, (_, i) =>
  `<input name="tm" maxlength="18" autocomplete="off" placeholder="Equipo ${i + 1}" value="${esc(cfg.names[i] || "")}" aria-label="Nombre del equipo ${i + 1}">`).join("");

const boardHTML = () => cfg.teams === 1 ? "" : `<ol class="fr-board">${game.scores.map((s, i) =>
  `<li class="${i === game.turn % cfg.teams && game.phase === "turn" ? "is-now" : ""}"><span>${esc(teamName(i))}</span><b>${s}</b></li>`).join("")}</ol>`;

function turnHTML() {
  const t = game.turn % cfg.teams;
  return `<div class="imp-stage">
    ${boardHTML()}
    <h2 class="imp-big">${cfg.teams === 1 ? "¿Están listos?" : `Turno de<br><b>${esc(teamName(t))}</b>`}</h2>
    <p>Elijan quién adivina. Esa persona se pone el celular <b>en la frente, acostado</b>, con la pantalla hacia los demás.</p>
    <div class="fr-legend"><span class="is-ok">Pantalla al suelo<br><b>¡Adivinó!</b></span><span class="is-pass">Pantalla al techo<br><b>Paso</b></span></div>
    <button class="btn btn-primary imp-go" data-action="fteGo">${icon("check")} ¡Vamos! (${cfg.time} s)</button>
    <button class="btn btn-ghost btn-sm" data-action="fteEnd">${game.rounds ? "Terminar y ver resultados" : "Cambiar ajustes"}</button></div>`;
}
function summaryHTML() {
  const { ok, pass } = game.last, t = (game.turn - 1) % cfg.teams;
  return `<div class="imp-stage">
    <h2 class="imp-big">${ok.length ? `¡${ok.length} punto${ok.length > 1 ? "s" : ""}!` : "¡Casi!"}<br><b>${esc(teamName(t))}</b></h2>
    <div class="fr-words">
      ${ok.map((w) => `<span class="is-ok">${icon("check")} ${esc(w)}</span>`).join("")}
      ${pass.map((w) => `<span class="is-pass">${esc(w)}</span>`).join("")}
    </div>
    ${boardHTML()}
    <button class="btn btn-primary imp-go" data-action="fteNext">${cfg.teams === 1 ? "Otra ronda" : `Sigue ${esc(teamName(game.turn % cfg.teams))}`}</button>
    <button class="btn btn-ghost btn-sm" data-action="fteEnd">Terminar y ver resultados</button></div>`;
}
function finalHTML() {
  const max = Math.max(...game.scores), top = game.scores.map((s, i) => (s === max ? i : -1)).filter((i) => i >= 0);
  const head = cfg.teams === 1 ? `¡${max} punto${max === 1 ? "" : "s"}!` : top.length > 1 ? "¡Empate!" : `¡Ganó ${esc(teamName(top[0]))}!`;
  return `<div class="imp-stage">
    <h2 class="imp-big imp-result is-win">${head}</h2>
    ${cfg.teams === 1 ? `<p>En ${game.rounds} ronda${game.rounds === 1 ? "" : "s"}. ¿Se atreven a superarlo?</p>` : boardHTML()}
    <button class="btn btn-primary imp-go" data-action="fteRestart">${icon("undo")} Jugar otra vez</button>
    <button class="btn btn-ghost btn-sm" data-action="fteQuit">Cambiar ajustes</button></div>`;
}

// ---------------------------------------------------------------------------
// La ronda: pantalla completa, cuenta regresiva, palabras e inclinación
// ---------------------------------------------------------------------------
let audio = null;
function beep(f, ms, type = "sine", vol = 0.25) {
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    const o = audio.createOscillator(), g = audio.createGain();
    o.type = type; o.frequency.value = f; g.gain.value = vol; o.connect(g); g.connect(audio.destination);
    const t = audio.currentTime; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + ms / 1000);
    o.start(t); o.stop(t + ms / 1000);
  } catch { /* sin sonido */ }
}
const buzz = (ms) => { try { navigator.vibrate?.(ms); } catch { /* sin vibración */ } };

async function startPlay() {
  // Permiso para la inclinación (iPhone lo pide; tiene que ser al tocar un botón).
  let tilt = typeof DeviceOrientationEvent !== "undefined";
  try { if (tilt && typeof DeviceOrientationEvent.requestPermission === "function") tilt = (await DeviceOrientationEvent.requestPermission()) === "granted"; } catch { tilt = false; }
  beep(1, 1, "sine", 0.0001); // despierta el audio en el mismo toque
  const el = document.createElement("div");
  el.className = "fr-play"; el.id = "frPlay";
  el.innerHTML = `<div class="fr-top"><span id="frClock">${cfg.time}</span><span id="frPts">0</span><button class="fr-x" data-action="fteStop" aria-label="Terminar la ronda">${icon("x")}</button></div>
    <div class="fr-word" id="frWord" aria-live="assertive">Ponte el celular<br>en la frente</div>
    <div class="fr-zones" aria-hidden="true"><span>Paso</span><span>¡Adivinó!</span></div>`;
  document.body.appendChild(el);
  try { await el.requestFullscreen?.({ navigationUI: "hide" }); } catch { /* no hay pantalla completa */ }
  try { await screen.orientation?.lock?.("landscape"); } catch { /* no se puede girar */ }
  try { play && play.lock && play.lock.release(); } catch { /* */ }
  play = { el, words: deck(), i: 0, ok: [], pass: [], left: cfg.time, armed: false, busy: false, tilt, lock: null, iv: null, cd: null };
  try { play.lock = await navigator.wakeLock?.request("screen"); } catch { /* la pantalla podría apagarse */ }
  el.addEventListener("pointerdown", onTap);
  if (tilt) window.addEventListener("deviceorientation", onTilt);
  // Cuenta regresiva
  let n = 3; const w = $("#frWord");
  w.innerHTML = `<small>Ponte el celular en la frente</small><b class="fr-cd">${n}</b>`; beep(520, 150);
  play.cd = setInterval(() => {
    n--;
    if (n > 0) { w.querySelector(".fr-cd").textContent = n; beep(520, 150); return; }
    clearInterval(play.cd); play.cd = null; beep(880, 250);
    showWord();
    play.iv = setInterval(tick, 1000);
  }, 1000);
}
function showWord() {
  if (!play) return;
  if (play.i >= play.words.length) { play.words = play.words.concat(deck()); }
  const w = play.words[play.i];
  $("#frWord").innerHTML = `<b>${esc(w)}</b>`;
  play.el.classList.remove("is-ok", "is-pass");
  play.armed = false; play.busy = false;
}
function tick() {
  if (!play) return;
  play.left--; const c = $("#frClock"); if (c) c.textContent = play.left;
  if (play.left <= 5 && play.left > 0) beep(660, 120);
  if (play.left <= 0) finishPlay();
}
function mark(ok) {
  if (!play || play.busy || play.cd) return;
  play.busy = true;
  const w = play.words[play.i];
  (ok ? play.ok : play.pass).push(w); used.push(w);
  play.el.classList.add(ok ? "is-ok" : "is-pass");
  $("#frWord").innerHTML = `<b>${ok ? "¡Bien!" : "Paso"}</b>`;
  $("#frPts").textContent = play.ok.length;
  if (ok) { beep(988, 120); setTimeout(() => beep(1319, 180), 110); buzz(80); } else { beep(220, 220, "triangle"); buzz([40, 40, 40]); }
  play.i++;
  setTimeout(() => { if (play && play.left > 0) showWord(); }, 800);
}
function onTap(e) {
  if (e.target.closest(".fr-x")) return;
  mark(e.clientX > window.innerWidth / 2);
}
// La pantalla hacia el suelo o hacia el techo, sin importar cómo se tome el teléfono.
function onTilt(e) {
  if (!play || play.cd || e.beta == null || e.gamma == null) return;
  const b = Math.abs(e.beta), g = Math.abs(e.gamma);
  const landscape = window.innerWidth > window.innerHeight;
  let dir = 0;
  if (landscape) { if (g > 62) dir = 0; else if (g < 32) dir = b > 90 ? 1 : -1; else dir = 2; }
  else { if (e.beta > 60 && e.beta < 120) dir = 0; else if (e.beta >= 145 || e.beta <= -145) dir = 1; else if (e.beta >= -30 && e.beta <= 35) dir = -1; else dir = 2; }
  if (dir === 0) { play.armed = true; return; }
  if (!play.armed || dir === 2 || play.busy) return;
  play.armed = false;
  mark(dir === 1);
}
function endPlay(silent) {
  if (!play) return;
  clearInterval(play.iv); clearInterval(play.cd);
  window.removeEventListener("deviceorientation", onTilt);
  try { play.lock && play.lock.release(); } catch { /* */ }
  try { screen.orientation?.unlock?.(); } catch { /* */ }
  try { if (document.fullscreenElement) document.exitFullscreen(); } catch { /* */ }
  play.el.remove();
  const res = { ok: play.ok, pass: play.pass };
  play = null;
  if (!silent) return res;
  return null;
}
function finishPlay() {
  if (!play) return;
  beep(330, 500, "square", 0.15); buzz(400);
  const res = endPlay(false);
  const t = game.turn % cfg.teams;
  game.scores[t] += res.ok.length; game.last = res; game.turn++; game.rounds++;
  game.phase = "summary"; save(); paint();
}

// ---------------------------------------------------------------------------
// Acciones
// ---------------------------------------------------------------------------
function readNames() { const ins = document.querySelectorAll("#frNames input"); if (ins.length) cfg.names = [...ins].map((x) => x.value.trim()); }
const newGame = () => { game = { scores: Array(cfg.teams).fill(0), turn: 0, rounds: 0, phase: "turn", last: null }; };
function registerActions() {
  const A = ctx.actions;
  A.fteTeams = (el) => { readNames(); cfg.teams = Math.min(4, Math.max(1, cfg.teams + Number(el.dataset.d))); $("#frTeamsN").textContent = cfg.teams; $("#frNames").innerHTML = namesHTML(); };
  A.fteGo = () => startPlay();
  A.fteStop = () => finishPlay();
  A.fteNext = () => { game.phase = "turn"; paint(); };
  A.fteEnd = () => { if (!game.rounds) { game = null; } else game.phase = "final"; paint(); };
  A.fteRestart = () => { newGame(); paint(); };
  A.fteQuit = () => { game = null; paint(); };
  document.addEventListener("submit", (e) => {
    if (e.target.id !== "frSetup") return;
    e.preventDefault(); readNames();
    const f = new FormData(e.target);
    cfg.cat = String(f.get("cat") || "mix"); cfg.time = Number(f.get("time") || 60);
    save(); newGame(); paint();
  });
}
