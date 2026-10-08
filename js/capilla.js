// Capilla Ágape: la sección de oración como una capilla virtual.
// Rincones: entrada (oración según la hora y tiempo litúrgico), un minuto de silencio,
// velas de la comunidad, la Palabra, María (misterios del día) y oraciones.

import { esc, rich, icon, toast } from "./util.js";
import { ORACIONES } from "./devocionario.js";

let ctx = null; // { actions, render, onAfterRender, onLeave, cloud, content }
export function setup(c) { ctx = c; registerActions(); }
const $ = (s, r = document) => r.querySelector(s);
const st = () => ctx.cloud.state();

// ---------------------------------------------------------------------------
// Calendario: tiempo litúrgico aproximado (para el color y el saludo)
// ---------------------------------------------------------------------------
function easter(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(y, month - 1, day);
}
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export function season(now = new Date()) {
  const t = new Date(now.getFullYear(), now.getMonth(), now.getDate()), y = t.getFullYear();
  const xmas = new Date(y, 11, 25);
  const adv = addDays(xmas, -(((xmas.getDay() + 6) % 7) + 1) - 21); // 4.º domingo antes de Navidad
  const e = easter(y), ash = addDays(e, -46), pent = addDays(e, 49);
  const ep = new Date(y, 0, 6), bapt = addDays(ep, 7 - ep.getDay() || 7); // domingo después de Epifanía (aprox.)
  if (t >= adv && t < xmas) return { key: "adviento", name: "Adviento", color: "morado", hex: "#7b4fa3", hint: "Preparamos el corazón para recibir a Jesús." };
  if (t >= xmas || t <= bapt) return { key: "navidad", name: "Navidad", color: "blanco", hex: "#ffba03", hint: "Dios se hizo uno de nosotros." };
  if (t >= ash && t < addDays(e, -3)) return { key: "cuaresma", name: "Cuaresma", color: "morado", hex: "#7b4fa3", hint: "Tiempo para volver a Dios con todo el corazón." };
  if (t >= addDays(e, -3) && t < e) return { key: "triduo", name: "Triduo Pascual", color: "rojo", hex: "#c62f2f", hint: "Acompañamos a Jesús en su entrega por amor." };
  if (t >= e && t <= pent) return { key: "pascua", name: "Pascua", color: "blanco", hex: "#ffba03", hint: "¡Cristo vive! Y nos quiere vivos." };
  return { key: "ordinario", name: "Tiempo Ordinario", color: "verde", hex: "#3f8f4e", hint: "Jesús camina con nosotros en lo de cada día." };
}

// Oración según el momento del día
const MOMENTS = [
  { from: 5, to: 12, key: "manana", label: "Oración de la mañana", hand: "buenos días, Señor",
    text: "Señor, te entrego este día que comienza.\nMis manos, para servir.\nMis ojos, para mirar con cariño.\nMi corazón, para amar como Tú.\nAmén." },
  { from: 12, to: 15, key: "mediodia", label: "Al mediodía, con María", hand: "un alto en el camino",
    text: "El ángel del Señor anunció a María,\ny concibió por obra del Espíritu Santo.\n\nMaría, enséñame a decir como tú:\n«Aquí estoy, hágase en mí según tu palabra».\nAmén." },
  { from: 15, to: 20, key: "tarde", label: "Oración de la tarde", hand: "sigue conmigo",
    text: "Señor, en medio de lo que estoy viviendo,\nquiero detenerme un momento contigo.\nDame paciencia con los demás y conmigo,\ny fuerza para terminar bien este día.\nAmén." },
  { from: 20, to: 29, key: "noche", label: "Oración de la noche", hand: "en tus manos",
    text: "Gracias, Señor, por este día.\nPerdona lo que no hice bien.\nCuida a los que amo y a los que me cuesta amar.\nDame un descanso en paz.\nEn tus manos me pongo.\nAmén." },
];
const moment = (d = new Date()) => { const h = d.getHours() < 5 ? d.getHours() + 24 : d.getHours(); return MOMENTS.find((m) => h >= m.from && h < m.to) || MOMENTS[3]; };

// Palabra para el silencio (una por día)
const VERSES = [
  ["Vengan a mí todos los que están cansados, y yo los aliviaré.", "Mt 11,28"],
  ["Permanezcan en mi amor.", "Jn 15,9"],
  ["No temas, porque yo estoy contigo.", "Is 41,10"],
  ["Yo estoy con ustedes todos los días.", "Mt 28,20"],
  ["El Señor es mi pastor, nada me falta.", "Sal 23,1"],
  ["Ya no los llamo siervos, los llamo amigos.", "Jn 15,15"],
  ["Quédate con nosotros, Señor.", "Lc 24,29"],
  ["Ustedes son la luz del mundo.", "Mt 5,14"],
  ["Ámense los unos a los otros como yo los he amado.", "Jn 13,34"],
  ["Habla, Señor, que tu siervo escucha.", "1 Sam 3,9"],
];
const dayIndex = (n) => { const d = new Date(); return (d.getFullYear() * 400 + d.getMonth() * 31 + d.getDate()) % n; };

// Misterios del Rosario según el día
const MYST = {
  gozosos: { name: "Misterios gozosos", items: ["La Anunciación del ángel a María", "La Visitación de María a su prima Isabel", "El Nacimiento de Jesús en Belén", "La Presentación de Jesús en el Templo", "Jesús perdido y hallado en el Templo"] },
  luminosos: { name: "Misterios luminosos", items: ["El Bautismo de Jesús en el Jordán", "Jesús en las bodas de Caná", "Jesús anuncia el Reino de Dios", "La Transfiguración", "Jesús nos deja la Eucaristía"] },
  dolorosos: { name: "Misterios dolorosos", items: ["Jesús ora en el huerto", "Jesús es azotado", "Jesús es coronado de espinas", "Jesús carga la cruz", "Jesús muere en la cruz"] },
  gloriosos: { name: "Misterios gloriosos", items: ["La Resurrección de Jesús", "La Ascensión de Jesús al cielo", "La venida del Espíritu Santo", "La Asunción de María", "María, Reina del cielo y de la tierra"] },
};
const MYST_BY_DAY = ["gloriosos", "gozosos", "dolorosos", "gloriosos", "luminosos", "dolorosos", "gozosos"]; // dom..sáb
const DAYNAME = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

// Oraciones base (las usa el Rosario virtual)
const CLASSIC = [
  ["Padre nuestro", "Padre nuestro, que estás en el cielo,\nsantificado sea tu Nombre;\nvenga a nosotros tu reino;\nhágase tu voluntad en la tierra como en el cielo.\nDanos hoy nuestro pan de cada día;\nperdona nuestras ofensas,\ncomo también nosotros perdonamos a los que nos ofenden;\nno nos dejes caer en la tentación,\ny líbranos del mal.\nAmén."],
  ["Ave María", "Dios te salve, María, llena eres de gracia,\nel Señor es contigo.\nBendita tú eres entre todas las mujeres,\ny bendito es el fruto de tu vientre, Jesús.\nSanta María, Madre de Dios,\nruega por nosotros, pecadores,\nahora y en la hora de nuestra muerte.\nAmén."],
  ["Gloria", "Gloria al Padre, y al Hijo, y al Espíritu Santo.\nComo era en el principio, ahora y siempre,\npor los siglos de los siglos.\nAmén."],
  ["Ven, Espíritu Santo", "Ven, Espíritu Santo,\nllena los corazones de tus fieles\ny enciende en ellos el fuego de tu amor.\nEnvía tu Espíritu, y todo será creado,\ny renovarás la faz de la tierra."],
  ["Ángel de la guarda", "Ángel de mi guarda,\ndulce compañía,\nno me desampares\nni de noche ni de día.\nNo me dejes solo,\nque me perdería."],
  ["Salve", "Dios te salve, Reina y Madre de misericordia,\nvida, dulzura y esperanza nuestra.\nDios te salve.\nA ti llamamos los desterrados hijos de Eva;\na ti suspiramos, gimiendo y llorando\nen este valle de lágrimas.\nEa, pues, Señora, abogada nuestra,\nvuelve a nosotros esos tus ojos misericordiosos;\ny después de este destierro muéstranos a Jesús,\nfruto bendito de tu vientre.\n¡Oh clementísima, oh piadosa, oh dulce Virgen María!\nRuega por nosotros, santa Madre de Dios,\npara que seamos dignos de alcanzar\nlas promesas de nuestro Señor Jesucristo.\nAmén."],
];

// Devocionario completo (js/devocionario.js), en el orden de Vatican News
const prayerHTML = (x) => esc(x).split("\n").map((l) => l === "" ? "<span class=\"cap-gap\"></span>"
  : /^[VR]\. /.test(l) ? `<span class="cap-vr"><b>${l[0]}.</b> ${l.slice(3)}</span>` : /^Oremos: /.test(l) ? `<span class="cap-vr"><b>Oremos:</b> ${l.slice(8)}</span>` : `${l}<br>`).join("");
// Radios católicas: siempre enlazamos a la página oficial de cada una (no a señales de terceros).
const RADIOS = [
  { name: "Radio María Chile", where: "89.3 FM Santiago · a todo Chile por internet", url: "https://radiomaria.cl/" },
  { name: "Radio El Sembrador", where: "104.7 FM Chillán · Diócesis de Chillán · en su Facebook", url: "https://www.facebook.com/ElSembrador1047/" },
  { name: "Radio Regina Coeli", where: "Los Ángeles · Diócesis Santa María de Los Ángeles", url: "https://reinadelcielo.cl/radio/" },
];

function devocionarioHTML() {
  const item = (o) => `<details class="card cap-pr" data-dq="${esc((o.t + " " + (o.x || "") + " " + (o.note || "")).toLowerCase())}">
    <summary><span>${esc(o.t)}</span>${icon("down")}</summary>
    <div class="cap-pr-body">
      ${o.note ? `<p class="cap-pr-note">${esc(o.note)}</p>` : ""}
      ${o.x ? `<p class="cap-prayer">${prayerHTML(o.x)}</p>` : ""}
      ${o.url ? `<a class="btn btn-sm btn-soft" href="${o.url}" target="_blank" rel="noopener">${icon("book")} Rezarla en Vatican News</a>` : ""}
      ${o.go ? `<button type="button" class="btn btn-sm btn-gold" data-action="capRosario">${icon("right")} Rezarlo con el rosario virtual</button>` : ""}
    </div></details>`;
  return `<label class="cap-dsearch"><span class="sr-only">Buscar una oración</span>${icon("search")}<input class="input" type="search" id="capDq" placeholder="Buscar una oración…" autocomplete="off"></label>
    <div class="cap-classic" id="capDev">${ORACIONES.map(item).join("")}</div>
    <p class="muted small cap-dnone" id="capDnone" hidden>No encontramos esa oración.</p>
    <p class="muted small" style="margin-top:12px">En el orden del devocionario de <a href="https://www.vaticannews.va/es/oraciones.html" target="_blank" rel="noopener">Vatican News</a>.</p>`;
}

// ---------------------------------------------------------------------------
// Dibujos
// ---------------------------------------------------------------------------
function roseWindow() {
  const petals = Array.from({ length: 8 }, (_, i) => {
    const fill = ["#8ad2fa", "#ffba03", "#1351a4", "#ef591c"][i % 4];
    return `<path d="M100 100 C 86 72, 86 40, 100 22 C 114 40, 114 72, 100 100 Z" fill="${fill}" transform="rotate(${i * 45} 100 100)"/>`;
  }).join("");
  const dots = Array.from({ length: 16 }, (_, i) => {
    const a = (i * 22.5 + 11.25) * Math.PI / 180;
    return `<circle cx="${100 + Math.sin(a) * 84}" cy="${100 - Math.cos(a) * 84}" r="6" fill="${i % 2 ? "#fff6e5" : "#8ad2fa"}"/>`;
  }).join("");
  return `<svg class="cap-rose" viewBox="0 0 200 200" aria-hidden="true">
    <defs><radialGradient id="capGlow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff6e5"/><stop offset="1" stop-color="#fde7b0"/></radialGradient></defs>
    <circle cx="100" cy="100" r="96" fill="url(#capGlow)" stroke="#0b2566" stroke-width="4"/>
    <circle cx="100" cy="100" r="74" fill="#fff6e5" stroke="#0b2566" stroke-width="3"/>
    <g stroke="#0b2566" stroke-width="3" stroke-linejoin="round">${petals}</g>
    <g stroke="#0b2566" stroke-width="2.5">${dots}</g>
    <circle cx="100" cy="100" r="20" fill="#fff6e5" stroke="#0b2566" stroke-width="3"/>
    <path d="M100 86 L100 114 M89 96 L111 96" stroke="#0b2566" stroke-width="4" stroke-linecap="round"/>
  </svg>`;
}
const candleSVG = (lit = true, cls = "") => `<svg class="cap-candle ${lit ? "lit" : ""} ${cls}" viewBox="0 0 60 120" aria-hidden="true">
    <ellipse class="glow" cx="30" cy="30" rx="26" ry="30" fill="#ffba03" opacity=".22"/>
    <path class="flame" d="M30 8 C 38 22, 40 32, 30 44 C 20 32, 22 22, 30 8 Z" fill="#ffba03" stroke="#ef591c" stroke-width="2.5"/>
    <path class="flame-in" d="M30 24 C 34 31, 34 36, 30 41 C 26 36, 26 31, 30 24 Z" fill="#fff6e5"/>
    <path d="M30 44 L30 52" stroke="#0b2566" stroke-width="2.5" stroke-linecap="round"/>
    <rect x="17" y="52" width="26" height="58" rx="5" fill="#fff6e5" stroke="#0b2566" stroke-width="3"/>
    <path d="M17 64 Q 24 70 26 62" fill="none" stroke="#0b2566" stroke-width="2"/>
    <rect x="10" y="108" width="40" height="8" rx="4" fill="#1351a4" stroke="#0b2566" stroke-width="3"/>
  </svg>`;

// ---------------------------------------------------------------------------
// Vista
// ---------------------------------------------------------------------------
let velas = null;
export function view(opt = {}) {
  const d = ctx.content().devotional || { title: "", desc: "", cards: [] };
  const s = season(), m = moment(), now = new Date();
  const [vt, vr] = VERSES[dayIndex(VERSES.length)];
  const mk = MYST_BY_DAY[now.getDay()], my = MYST[mk];
  const cards = d.cards || [];
  const lectio = cards.find((c) => c.type === "list" && /palabra|biblia/i.test((c.title || "") + (c.tag || "")));
  const own = cards.filter((c) => c !== lectio);
  const member = st().ready;
  ctx.onAfterRender(() => {
    loadGospel().then(() => {
      paintGospel();
      if (!opt.focus) return;
      const box = document.getElementById(opt.focus === "gospel" ? "capGospel" : "cap-" + opt.focus); if (!box) return;
      if (opt.focus !== "gospel") { box.scrollIntoView({ behavior: "auto", block: "start" }); return; }
      box.scrollIntoView({ behavior: "auto", block: "center" });
      box.classList.add("cap-flash"); setTimeout(() => box.classList.remove("cap-flash"), 2600);
    });
    if (!member) return;
    const stop = ctx.cloud.watchVelas((rows) => { velas = rows; paintVelas(); }, () => { velas = velas || []; paintVelas(true); });
    ctx.onLeave(stop);
    paintVelas();
  });
  const rincones = [["silencio", "Silencio"], ["velas", "Velas"], ["palabra", "Palabra"], ["maria", "María"], ["siempre", "Oraciones de siempre"], ["nuestras", "Nuestras oraciones"], ["cantar", "Cantar"], ["radio", "Radios"]];
  return `
  <section class="cap-hero" style="--season:${s.hex}">
    <div class="cap-arch">
      ${roseWindow()}
      <span class="cap-hand">pasa, Él te espera</span>
      <h1 class="cap-title">Capilla <em>Ágape</em></h1>
      <p class="cap-sub">Un lugar tranquilo para estar con Jesús, solo o en comunidad.</p>
      <div class="cap-chips">
        <span class="cap-season"><i></i>${esc(s.name)} · color ${esc(s.color)}</span>
        <span class="cap-date">${esc(now.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" }))}</span>
      </div>
      <div class="cap-gospel" id="capGospel">${gospelHTML(s)}</div>
    </div>
    <article class="cap-moment">
      <span class="eyebrow">${esc(m.label)}</span>
      <span class="cap-hand sm">${esc(m.hand)}</span>
      <p class="cap-prayer">${esc(m.text).replace(/\n/g, "<br>")}</p>
    </article>
  </section>

  <nav class="cap-nav" aria-label="Rincones de la capilla"><a href="#" class="cap-nav-ros" data-action="capRosario" data-set="${mk}">${rosaryIcon()} Rosario</a>${rincones.map(([k, l]) => `<a href="#" data-action="capGo" data-k="${k}">${esc(l)}</a>`).join("")}</nav>

  <section class="cap-room" id="cap-silencio">
    <div class="cap-room-head"><span class="cap-num">01</span><h2>Un minuto con <em>Jesús</em></h2></div>
    <div class="card cap-silence">
      ${candleSVG(true)}
      <div style="flex:1;min-width:220px">
        <p class="cap-verse">«${esc(vt)}»</p><span class="cap-ref">${esc(vr)}</span>
        <p class="muted small" style="margin-top:12px">Apaga lo que te distrae, respira hondo y quédate en silencio. Deja que esta frase te acompañe.</p>
        <div class="row-wrap" style="margin-top:14px">
          ${[1, 3, 5].map((n) => `<button class="btn ${n === 1 ? "btn-primary" : "btn-ghost"}" data-action="capSilence" data-min="${n}">${n} minuto${n > 1 ? "s" : ""}</button>`).join("")}
        </div>
      </div>
    </div>
  </section>

  <section class="cap-room" id="cap-velas">
    <div class="cap-room-head"><span class="cap-num">02</span><h2>Velas de la <em>comunidad</em></h2></div>
    <p class="cap-lead">Enciende una vela por una intención y reza por las de los demás. Cada vela queda encendida una semana.</p>
    ${member ? `<form class="card cap-vela-form" id="velaForm">
        ${candleSVG(false, "sm")}
        <div style="flex:1;min-width:200px">
          <label class="xs muted" for="velaText">Mi intención (opcional)</label>
          <textarea id="velaText" class="textarea cap-vela-ta" rows="4" maxlength="400" placeholder="Por mi abuela que está enferma… Por mi curso… Por la paz…"></textarea>
          <span class="xs muted cap-vela-n" id="velaN">0/400</span>
          <div class="row-wrap" style="margin-top:8px;justify-content:space-between">
            <span class="xs muted">La ven solo quienes tienen cuenta. Lo muy personal, mejor conversarlo con tu acompañante.</span>
            <button class="btn btn-gold" type="submit">${icon("flame")} Encender vela</button>
          </div>
        </div>
      </form>
      <div class="cap-velas" id="velaList"><p class="muted small">Encendiendo…</p></div>`
    : `<div class="card cap-vela-guest">${candleSVG(true, "sm")}<div style="flex:1"><strong>Las velas son para quienes tienen cuenta</strong>
        <p class="muted small">Ingresa con la cuenta con que te invitaron para encender una vela y rezar por las intenciones de la comunidad.</p></div>
        ${ctx.cloud.enabled ? `<button class="btn btn-primary btn-sm" data-action="signIn">Ingresar</button>` : ""}</div>`}
  </section>

  <section class="cap-room" id="cap-palabra">
    <div class="cap-room-head"><span class="cap-num">03</span><h2>La <em>Palabra</em> de hoy</h2></div>
    <div class="grid grid-2">
      <a class="card link cap-word" href="https://www.vaticannews.va/es/evangelio-de-hoy.html" target="_blank" rel="noopener">
        <span class="eyebrow" id="capWordRef">Evangelio del día</span>
        <strong>Lee lo que Jesús nos dice hoy</strong>
        <span class="muted small">Las lecturas de la misa de hoy, en Vatican News.</span>
        <span class="go">Abrir el Evangelio ${icon("arrowR")}</span>
      </a>
      ${lectio ? `<article class="card cap-lectio"><span class="eyebrow">${esc(lectio.tag || "Orar con la Biblia")}</span><strong>${esc(lectio.title)}</strong>
        <ol class="cap-steps">${(lectio.items || []).map((i) => `<li>${rich(String(i).replace(/<strong>\s*\d+\.\s*/i, "<strong>"))}</li>`).join("")}</ol></article>` : ""}
    </div>
  </section>

  <section class="cap-room" id="cap-maria">
    <div class="cap-room-head"><span class="cap-num">04</span><h2>Con <em>María</em></h2></div>
    <div class="grid grid-2">
      <article class="card cap-myst">
        <span class="eyebrow">Hoy, ${esc(DAYNAME[now.getDay()])}, rezamos los</span>
        <strong class="cap-myst-name">${esc(my.name)}</strong>
        <ol>${my.items.map((x) => `<li>${esc(x)}</li>`).join("")}</ol>
        <button class="btn btn-primary cap-ros-btn" data-action="capRosario" data-set="${mk}">${rosaryIcon()} Rezar el Rosario</button>
        <details class="cap-how"><summary>Cómo rezar el Rosario</summary>
          <ol class="small"><li>Haz la señal de la cruz y reza el Credo o un Padre nuestro.</li>
          <li>En cada misterio: anúncialo, reza un Padre nuestro, diez Ave María y un Gloria.</li>
          <li>Al terminar los cinco misterios, reza la Salve.</li></ol>
          <p class="xs muted">Si tienes poco tiempo, reza un solo misterio: también es Rosario hecho con amor.</p></details>
      </article>
      <div class="stack" style="--gap:12px">
        <a class="card link camino-banner" href="presentaciones/mes-de-maria.html" target="_blank" rel="noopener">
          <span class="tile-ico tile-brand" style="margin:0">${icon("sparkle")}</span>
          <span style="flex:1"><span class="eyebrow">8 de noviembre al 8 de diciembre</span><strong>Mes de María: Con María, puente hacia Jesús</strong>
          <span class="muted small">31 días con oración, Rosario, motivación y un desafío diario.</span></span>${icon("right")}
        </a>
        <a class="card link camino-banner" href="presentaciones/mes-de-maria.pdf" download>
          <span class="tile-ico tile-brand" style="margin:0">${icon("print")}</span>
          <span style="flex:1"><span class="eyebrow">Para imprimir</span><strong>Mes de María en PDF</strong>
          <span class="muted small">Tamaño carta, una página por día.</span></span>${icon("dl")}
        </a>
      </div>
    </div>
  </section>

  <section class="cap-room" id="cap-siempre">
    <div class="cap-room-head"><span class="cap-num">05</span><h2>Oraciones de <em>siempre</em></h2></div>
    <p class="cap-lead">El devocionario de la Iglesia: las oraciones que rezamos en todo el mundo. Toca una para abrirla.</p>
    ${devocionarioHTML()}
  </section>

  <section class="cap-room" id="cap-nuestras">
    <div class="cap-room-head"><span class="cap-num">06</span><h2>Nuestras <em>oraciones</em></h2></div>
    <p class="cap-lead">${esc(d.desc || "Oraciones de la comunidad para antes y después de cada encuentro.")}</p>
    <div class="cap-own">${own.map((c) => `<article class="card cap-card ${c.type === "list" ? "is-list" : ""}">
        <span class="eyebrow">${esc(c.tag || "")}</span><h3>${esc(c.title)}</h3>
        ${c.type === "list" ? `<ol class="cap-steps">${(c.items || []).map((i) => `<li>${rich(String(i).replace(/<strong>\s*\d+\.\s*/i, "<strong>"))}</li>`).join("")}</ol>`
          : `<p class="cap-prayer">${rich(String(c.text || "").replace(/^«|»$/g, "")).replace(/\n/g, "<br>")}</p>`}
      </article>`).join("")}</div>
  </section>

  <section class="cap-room" id="cap-cantar">
    <div class="cap-room-head"><span class="cap-num">07</span><h2>Cantar es rezar <em>dos veces</em></h2></div>
    <a class="card link cap-sing" href="#/cancionero">
      <span class="cap-notes" aria-hidden="true">♪ ♫</span>
      <span style="flex:1"><strong>Cancionero Ágape</strong>
      <span class="muted small">Canciones con acordes para cada momento de la misa, en el tono que necesites, y los repertorios de cada celebración.</span></span>${icon("right")}
    </a>
  </section>

  <section class="cap-room" id="cap-radio">
    <div class="cap-room-head"><span class="cap-num">08</span><h2>Radios <em>católicas</em></h2></div>
    <p class="cap-lead">Para rezar, cantar y escuchar la Palabra durante el día. Se abren en la página de cada radio.</p>
    <div class="cap-radios">${RADIOS.map((r) => `<a class="card link cap-radio" href="${r.url}" target="_blank" rel="noopener">
        <span class="cap-radio-ico" aria-hidden="true">📻</span>
        <span style="flex:1"><strong>${esc(r.name)}</strong><span class="muted small">${esc(r.where)}</span></span>
        <span class="go">Escuchar en vivo ${icon("arrowR")}</span>
      </a>`).join("")}</div>
  </section>

  <p class="cap-foot">«Donde dos o tres se reúnen en mi nombre, ahí estoy yo en medio de ellos» <span>Mt 18,20</span></p>`;
}

// ---------------------------------------------------------------------------
// Evangelio del día (data/evangelio.json, lo actualiza cada día una acción de GitHub)
// ---------------------------------------------------------------------------
let gospel = null;
try { gospel = JSON.parse(localStorage.getItem("agape_evangelio") || "null"); } catch {}
const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
async function loadGospel() {
  try {
    const g = await fetch("data/evangelio.json", { cache: "no-cache" }).then((r) => (r.ok ? r.json() : null));
    if (g && g.days) { gospel = g; try { localStorage.setItem("agape_evangelio", JSON.stringify(g)); } catch {} }
  } catch {}
}
const READ_URL = "https://www.vaticannews.va/es/evangelio-de-hoy.html";
// Para Inicio: la cita y la frase del Evangelio de hoy (o null)
export async function todayGospel() {
  const pick = () => (gospel && gospel.days && gospel.days[todayKey()]) || null;
  if (pick()) return pick();
  await loadGospel(); return pick();
}
function gospelHTML(s) {
  const g = gospel && gospel.days && gospel.days[todayKey()];
  if (!g || !g.frase) return `<p class="cap-hint">${esc(s.hint)}</p>`;
  return `<a class="cap-gq" href="${READ_URL}" target="_blank" rel="noopener">
      <span class="cap-gq-t">${esc(g.titulo || "Evangelio del día")}</span>
      <span class="cap-gq-f">«${esc(g.frase)}»</span>
      <span class="cap-gq-r">${esc(g.cita)} · Leer el Evangelio completo ↗</span></a>`;
}
function paintGospel() {
  const box = document.getElementById("capGospel"); if (box) box.innerHTML = gospelHTML(season());
  const g = gospel && gospel.days && gospel.days[todayKey()];
  const ref = document.getElementById("capWordRef"); if (ref && g) ref.textContent = `Evangelio del día · ${g.cita}`;
}

// ---------------------------------------------------------------------------
// Velas
// ---------------------------------------------------------------------------
const ago = (ts) => {
  const d = ts && ts.toDate ? ts.toDate() : null; if (!d) return "recién";
  const h = Math.floor((Date.now() - d) / 3600000);
  return h < 1 ? "recién" : h < 24 ? `hace ${h} h` : `hace ${Math.floor(h / 24)} día${h >= 48 ? "s" : ""}`;
};
function paintVelas(err) {
  const box = $("#velaList"); if (!box) return;
  if (!velas) return;
  const week = Date.now() - 7 * 86400000;
  const list = velas.filter((v) => { const d = v.createdAt && v.createdAt.toDate ? v.createdAt.toDate() : new Date(); return d.getTime() >= week; });
  if (err && !list.length) { box.innerHTML = `<div class="note">No pudimos cargar las velas. Revisa tu conexión.</div>`; return; }
  if (!list.length) { box.innerHTML = `<p class="muted small cap-empty">Aún no hay velas encendidas esta semana. Enciende la primera.</p>`; return; }
  const me = ctx.cloud.myUid(), staff = st().isStaff;
  box.innerHTML = `<p class="xs muted cap-count">${list.length} vela${list.length > 1 ? "s" : ""} encendida${list.length > 1 ? "s" : ""} esta semana</p>` + list.map((v) => {
    const n = Object.keys(v.prays || {}).length, mine = !!(v.prays && v.prays[me]);
    return `<article class="cap-vela">
      ${candleSVG(true, "xs")}
      <div class="cap-vela-body">
        ${v.text ? `<p>${esc(v.text)}</p>` : `<p class="muted"><i>Una intención en silencio</i></p>`}
        <span class="xs muted">${esc(v.authorName || "Alguien")} · ${ago(v.createdAt)}</span>
        <div class="row-wrap" style="margin-top:6px;gap:6px">
          <button class="btn btn-sm ${mine ? "btn-soft" : "btn-ghost"}" data-action="capPray" data-id="${esc(v.id)}" data-on="${mine ? 0 : 1}" aria-pressed="${mine}">🙏 ${mine ? "Estoy rezando" : "Rezo por esto"}${n ? ` · ${n}` : ""}</button>
          ${v.authorUid === me || staff ? `<button class="btn btn-sm btn-ghost" data-action="capVelaDel" data-id="${esc(v.id)}" aria-label="Apagar vela">${icon("x")}</button>` : ""}
        </div>
      </div>
    </article>`;
  }).join("");
}

// ---------------------------------------------------------------------------
// Silencio guiado
// ---------------------------------------------------------------------------
let silTimer = null, audio = null;
function bell() {
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    const t = audio.currentTime;
    [523.25, 784, 1046.5].forEach((f, i) => {
      const o = audio.createOscillator(), g = audio.createGain();
      o.type = "sine"; o.frequency.value = f; o.connect(g); g.connect(audio.destination);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18 / (i + 1), t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 4);
      o.start(t); o.stop(t + 4.1);
    });
  } catch {}
}
function silence(min) {
  const [vt, vr] = VERSES[dayIndex(VERSES.length)];
  let ov = document.getElementById("capOverlay");
  if (!ov) { ov = document.createElement("div"); ov.id = "capOverlay"; document.body.appendChild(ov); }
  ov.className = "cap-overlay";
  ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true"); ov.setAttribute("aria-label", "Un momento de silencio");
  ov.innerHTML = `<div class="cap-ov-in">
    ${candleSVG(true, "big")}
    <div class="cap-breath" aria-hidden="true"><i></i></div>
    <p class="cap-breath-t" id="capBreathT">Inhala…</p>
    <p class="cap-verse">«${esc(vt)}»</p><span class="cap-ref">${esc(vr)}</span>
    <p class="cap-left" id="capLeft"></p>
    <button class="btn btn-glass" data-action="capStop">Terminar</button></div>`;
  document.body.classList.add("cap-quiet");
  bell();
  const end = Date.now() + min * 60000;
  let k = 0;
  const tick = () => {
    const left = Math.max(0, end - Date.now()), s = Math.ceil(left / 1000);
    const el = document.getElementById("capLeft"); if (el) el.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
    const bt = document.getElementById("capBreathT"); if (bt) bt.textContent = Math.floor(k / 4) % 2 ? "Exhala…" : "Inhala…";
    k++;
    if (!left) { stopSilence(true); }
  };
  clearInterval(silTimer); silTimer = setInterval(tick, 1000); tick();
  ov.querySelector("button").focus();
}
function stopSilence(done) {
  clearInterval(silTimer); silTimer = null;
  const ov = document.getElementById("capOverlay");
  if (done) {
    bell();
    if (ov) ov.querySelector(".cap-ov-in").innerHTML = `${candleSVG(true, "big")}<p class="cap-verse">Gracias por este momento.</p><p class="muted" style="color:#fff6e5;opacity:.85">Lleva esta paz a lo que viene.</p><button class="btn btn-gold" data-action="capStop">Volver a la capilla</button>`;
    return;
  }
  if (ov) ov.remove();
  document.body.classList.remove("cap-quiet");
}

// ---------------------------------------------------------------------------
// Rosario virtual (popup): un rosario dibujado; en el centro se lee el misterio
// y la oración de cada cuenta. Se avanza tocando el centro o «Siguiente».
// ---------------------------------------------------------------------------
const ROS_CITES = {
  gozosos: ["Lc 1,26-38", "Lc 1,39-56", "Lc 2,1-20", "Lc 2,22-40", "Lc 2,41-52"],
  luminosos: ["Mt 3,13-17", "Jn 2,1-11", "Mc 1,14-15", "Lc 9,28-36", "Lc 22,14-20"],
  dolorosos: ["Mt 26,36-46", "Jn 19,1", "Mt 27,27-31", "Jn 19,16-17", "Lc 23,33-46"],
  gloriosos: ["Lc 24,1-12", "Hch 1,6-11", "Hch 2,1-13", "Lc 1,46-55", "Ap 12,1"],
};
const ORD = ["Primer", "Segundo", "Tercer", "Cuarto", "Quinto"];
const ADJ = { gozosos: "gozoso", luminosos: "luminoso", dolorosos: "doloroso", gloriosos: "glorioso" };
const PR = {
  cruz: ["Señal de la cruz", "Por la señal de la Santa Cruz,\nde nuestros enemigos líbranos, Señor, Dios nuestro.\nEn el nombre del Padre, y del Hijo, y del Espíritu Santo.\nAmén."],
  credo: ["Credo", "Creo en Dios, Padre todopoderoso, Creador del cielo y de la tierra.\nCreo en Jesucristo, su único Hijo, nuestro Señor, que fue concebido por obra y gracia del Espíritu Santo, nació de Santa María Virgen, padeció bajo el poder de Poncio Pilato, fue crucificado, muerto y sepultado, descendió a los infiernos, al tercer día resucitó de entre los muertos, subió a los cielos y está sentado a la derecha de Dios, Padre todopoderoso. Desde allí ha de venir a juzgar a vivos y muertos.\nCreo en el Espíritu Santo, la santa Iglesia católica, la comunión de los santos, el perdón de los pecados, la resurrección de la carne y la vida eterna.\nAmén."],
  pn: ["Padre nuestro", CLASSIC[0][1]],
  am: ["Ave María", CLASSIC[1][1]],
  gl: ["Gloria", CLASSIC[2][1]],
  oj: ["Oh Jesús mío", "Oh Jesús mío, perdona nuestros pecados,\nlíbranos del fuego del infierno,\nlleva al cielo a todas las almas,\nespecialmente a las más necesitadas de tu misericordia."],
  sa: ["Salve", CLASSIC[5][1]],
  fin: ["¡Rezaste el Rosario!", "María lleva tus intenciones a Jesús.\n\nEn el nombre del Padre, y del Hijo, y del Espíritu Santo.\nAmén."],
};

function rosSteps(set) {
  const S = [{ b: "cross", k: "cruz" }, { b: "cross", k: "credo" }, { b: "p0", k: "pn" }];
  ["por la fe", "por la esperanza", "por la caridad"].forEach((n, i) => S.push({ b: "p" + (i + 1), k: "am", note: n, i: i + 1, of: 3 }));
  S.push({ b: "p3", k: "gl" });
  for (let d = 0; d < 5; d++) {
    S.push({ b: "B" + d, k: "mys", d }, { b: "B" + d, k: "pn", d });
    for (let i = 1; i <= 10; i++) S.push({ b: `d${d}-${i}`, k: "am", d, i, of: 10 });
    S.push({ b: `d${d}-10`, k: "gl", d }, { b: `d${d}-10`, k: "oj", d });
  }
  S.push({ b: "medal", k: "sa" }, { b: "medal", k: "fin" });
  return S;
}

const RW = 360, RH = 524, RCX = 180, RCY = 176, RR = 158;
function rosarySVG() {
  // Vuelta del rosario: la medalla abajo; las decenas suben por la derecha.
  const loop = [];
  for (let d = 0; d < 5; d++) { if (d) loop.push({ id: "B" + d, big: true }); for (let i = 1; i <= 10; i++) loop.push({ id: `d${d}-${i}` }); }
  const gap = 3.4, total = loop.reduce((s, x) => s + (x.big ? 1.9 : 1), 0) + gap, u = 360 / total;
  let acc = gap / 2;
  const beads = loop.map((x) => {
    const w = x.big ? 1.9 : 1, a = (90 - (acc + w / 2) * u) * Math.PI / 180; acc += w;
    return { ...x, x: RCX + RR * Math.cos(a), y: RCY + RR * Math.sin(a) };
  });
  const my = RCY + RR;
  const pend = [{ id: "B0", big: true, y: my + 34 }, { id: "p3", y: my + 60 }, { id: "p2", y: my + 80 }, { id: "p1", y: my + 100 }, { id: "p0", big: true, y: my + 128 }]
    .map((b) => ({ ...b, x: RCX }));
  const bead = (b) => `<g class="rb ${b.big ? "big" : ""}" data-b="${b.id}" role="button" tabindex="-1" aria-label="${b.big ? "Padre nuestro" : "Ave María"}">
      <circle class="hit" cx="${b.x.toFixed(1)}" cy="${b.y.toFixed(1)}" r="${b.big ? 13 : 9}"/>
      <circle class="dot" cx="${b.x.toFixed(1)}" cy="${b.y.toFixed(1)}" r="${b.big ? 9.5 : 6.4}"/></g>`;
  const cy = my + 150;
  return `<svg class="ros-svg" viewBox="0 0 ${RW} ${RH}" aria-hidden="false">
    <defs><radialGradient id="rosGlow"><stop offset="0" stop-color="#ffba03" stop-opacity=".55"/><stop offset="1" stop-color="#ffba03" stop-opacity="0"/></radialGradient></defs>
    <circle class="ros-chain" cx="${RCX}" cy="${RCY}" r="${RR}"/>
    <path class="ros-chain" d="M${RCX} ${my} V${cy}"/>
    ${beads.map(bead).join("")}${pend.map(bead).join("")}
    <g class="rb medal" data-b="medal" role="button" tabindex="-1" aria-label="Medalla · Salve">
      <ellipse class="hit" cx="${RCX}" cy="${my}" rx="17" ry="20"/>
      <ellipse class="dot" cx="${RCX}" cy="${my}" rx="12.5" ry="15.5"/>
      <text x="${RCX}" y="${my + 5.5}" text-anchor="middle">M</text></g>
    <g class="rb cross" data-b="cross" role="button" tabindex="-1" aria-label="Cruz · Credo">
      <rect class="hit" x="${RCX - 22}" y="${cy - 4}" width="44" height="58"/>
      <path class="dot" d="M${RCX - 5} ${cy} h10 v12 h12 v10 h-12 v26 h-10 v-26 h-12 v-10 h12 Z"/></g>
  </svg>`;
}

const rosaryIcon = () => `<svg width="1.15em" height="1.15em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="8.5" r="6"/><path d="M12 14.5v3M12 18v4M10 20h4"/><circle cx="12" cy="2.5" r=".6" fill="currentColor"/><circle cx="6" cy="8.5" r=".6" fill="currentColor"/><circle cx="18" cy="8.5" r=".6" fill="currentColor"/></svg>`;
let ros = null; // { set, steps, i, el }
const ROS_KEY = "agape_rosario_v1";
function rosSave() { try { localStorage.setItem(ROS_KEY, JSON.stringify({ set: ros.set, i: ros.i, day: todayKey() })); } catch {} }
function rosLoad(set) {
  try { const s = JSON.parse(localStorage.getItem(ROS_KEY) || "null"); if (s && s.set === set && s.day === todayKey()) return +s.i || 0; } catch {}
  return 0;
}
function openRosary(set) {
  set = MYST[set] ? set : MYST_BY_DAY[new Date().getDay()];
  closeRosary();
  const el = document.createElement("div");
  el.className = "ros-ov"; el.id = "rosOverlay";
  el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-label", "Santo Rosario");
  const today = MYST_BY_DAY[new Date().getDay()];
  el.innerHTML = `<div class="ros-in">
    <div class="ros-top">
      <div><span class="ros-hand">reza con María</span><h2>Santo Rosario</h2></div>
      <button class="ros-x" data-action="rosClose" aria-label="Cerrar el Rosario">${icon("x")}</button>
    </div>
    <div class="ros-sets" role="tablist" aria-label="Misterios">${Object.keys(MYST).map((k) =>
      `<button role="tab" data-action="rosSet" data-set="${k}" aria-selected="${k === set}">${esc(MYST[k].name.replace("Misterios ", ""))}${k === today ? " · hoy" : ""}</button>`).join("")}</div>
    <div class="ros-stage">
      ${rosarySVG()}
      <div class="ros-center" data-action="rosNext" aria-live="polite"></div>
    </div>
    <div class="ros-ctl">
      <button class="btn btn-glass" data-action="rosPrev">${icon("left")} Anterior</button>
      <span class="ros-prog" id="rosProg"></span>
      <button class="btn btn-gold" data-action="rosNext" id="rosNextBtn">Siguiente ${icon("right")}</button>
    </div>
  </div>`;
  document.body.appendChild(el);
  document.body.classList.add("cap-quiet");
  ros = { set, steps: rosSteps(set), i: rosLoad(set), el };
  el.querySelectorAll(".rb").forEach((g) => g.addEventListener("click", (e) => {
    e.stopPropagation();
    const id = g.dataset.b, idx = ros.steps.findIndex((s) => s.b === id);
    if (idx >= 0) { ros.i = idx; rosPaint(); }
  }));
  rosPaint();
  el.querySelector("#rosNextBtn").focus();
}
function closeRosary() {
  document.getElementById("rosOverlay")?.remove();
  if (!document.getElementById("capOverlay")) document.body.classList.remove("cap-quiet");
  ros = null;
}
function rosPaint() {
  if (!ros) return;
  const { steps, i, el, set } = ros, s = steps[i], my = MYST[set];
  // Cuentas: rezadas, la actual y las que faltan.
  const last = {}; steps.forEach((x, n) => { last[x.b] = n; });
  el.querySelectorAll(".rb").forEach((g) => {
    const id = g.dataset.b;
    g.classList.toggle("now", s.b === id);
    g.classList.toggle("done", last[id] < i || (s.k === "fin"));
  });
  const [title, text] = s.k === "mys" ? [my.items[s.d], ""] : PR[s.k];
  let eyebrow = "", extra = "";
  if (s.d != null) eyebrow = `${ORD[s.d]} misterio ${ADJ[set]}`;
  else if (s.k === "credo" || s.k === "cruz") eyebrow = "Para comenzar";
  else if (s.k === "sa") eyebrow = "Para terminar";
  else if (s.k !== "fin") eyebrow = "Introducción";
  if (s.k === "mys") extra = `<span class="ros-cite">${esc(ROS_CITES[set][s.d])}</span><p class="ros-txt">Contemplamos este misterio en silencio, junto a María. Puedes ofrecer esta decena por alguien.</p>`;
  // Al llegar a la última Ave María (y luego al Gloria) aparece el botón de la oración que sigue.
  const nk = steps[i + 1] && steps[i + 1].k, nextK = (s.k === "am" && s.i === s.of && nk === "gl") || (s.k === "gl" && nk === "oj") ? nk : "";
  const count = s.k === "am" ? `<span class="ros-count">${s.i} de ${s.of}${s.note ? " · " + esc(s.note) : ""}</span>` : "";
  const mystLine = s.d != null && s.k !== "mys" ? `<span class="ros-myl">${esc(my.items[s.d])}</span>` : "";
  el.querySelector(".ros-center").innerHTML = `<div class="ros-c-in ${nextK ? "has-next" : ""} ${s.k === "mys" ? "is-mys" : ""} ${s.k === "fin" ? "is-fin" : ""}">
      ${eyebrow ? `<span class="ros-eb">${esc(eyebrow)}</span>` : ""}${mystLine}
      <strong class="ros-t">${esc(title)}</strong>${count}${extra}
      ${text ? `<p class="ros-txt">${esc(s.k === "fin" ? text : text.replace(/\n\n/g, "¶").replace(/\n/g, " ").replace(/¶/g, "\n\n")).replace(/\n/g, "<br>")}</p>` : ""}
      ${nextK ? `<button class="ros-next-pr" data-action="rosNext">${esc(PR[nextK][0])} ${icon("right")}</button>` : ""}
    </div>`;
  el.querySelector(".ros-center").scrollTop = 0;
  const decade = s.d != null ? `Decena ${s.d + 1} de 5` : s.k === "fin" ? "Terminado" : s.k === "sa" ? "Salve" : "Inicio";
  el.querySelector("#rosProg").textContent = decade;
  el.querySelector("[data-action=rosPrev]").disabled = i === 0;
  const nb = el.querySelector("#rosNextBtn");
  nb.innerHTML = s.k === "fin" ? `Volver a empezar ${icon("undo")}` : `${nextK ? esc(PR[nextK][0]) : "Siguiente"} ${icon("right")}`;
  rosSave();
}
function rosMove(n) {
  if (!ros) return;
  if (n > 0 && ros.steps[ros.i].k === "fin") ros.i = 0;
  else ros.i = Math.max(0, Math.min(ros.steps.length - 1, ros.i + n));
  rosPaint();
}

function registerActions() {
  const A = ctx.actions;
  // Buscador del devocionario
  document.addEventListener("input", (e) => {
    if (e.target.id !== "capDq") return;
    const fold = (t) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const q = fold(e.target.value.trim().toLowerCase());
    let n = 0;
    document.querySelectorAll("#capDev .cap-pr").forEach((d) => { const ok = !q || fold(d.dataset.dq).includes(q); d.hidden = !ok; if (ok) n++; });
    const none = document.getElementById("capDnone"); if (none) none.hidden = n > 0;
  });
  A.capRosario = (el) => openRosary(el.dataset.set);
  A.rosClose = () => closeRosary();
  A.rosNext = () => rosMove(1);
  A.rosPrev = () => rosMove(-1);
  A.rosSet = (el) => { if (!ros || el.dataset.set === ros.set) return; ros.set = el.dataset.set; ros.steps = rosSteps(ros.set); ros.i = 0;
    ros.el.querySelectorAll(".ros-sets button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.set === ros.set))); rosPaint(); };
  document.addEventListener("keydown", (e) => {
    if (!document.getElementById("rosOverlay")) return;
    if (e.key === "Escape") { e.preventDefault(); closeRosary(); }
    else if (e.key === "ArrowRight" || (e.key === " " && e.target === document.body)) { e.preventDefault(); rosMove(1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); rosMove(-1); }
  });
  A.capGo = (el) => { document.getElementById("cap-" + el.dataset.k)?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }); };
  A.capSilence = (el) => silence(+el.dataset.min || 1);
  A.capStop = () => stopSilence(false);
  A.capPray = (el) => {
    const on = el.dataset.on === "1";
    ctx.cloud.prayVela(el.dataset.id, on).then(() => { if (on) toast("Gracias por rezar 🙏"); }).catch(() => toast("No se pudo guardar", ""));
  };
  A.capVelaDel = (el) => {
    if (!confirm("¿Apagar esta vela?")) return;
    ctx.cloud.deleteVela(el.dataset.id).catch(() => toast("No se pudo apagar", ""));
  };
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && document.getElementById("capOverlay")) stopSilence(false); });
  document.addEventListener("input", (e) => { if (e.target.id === "velaText") { const n = $("#velaN"); if (n) n.textContent = `${e.target.value.length}/400`; } });
  document.addEventListener("submit", async (e) => {
    if (e.target.id !== "velaForm") return;
    e.preventDefault();
    const ta = $("#velaText"), btn = e.target.querySelector("[type=submit]");
    btn.disabled = true;
    try {
      await ctx.cloud.lightVela(ta.value.trim());
      ta.value = ""; toast("Tu vela está encendida 🕯️");
      e.target.querySelector(".cap-candle")?.classList.add("lit");
      const n = $("#velaN"); if (n) n.textContent = "0/400";
    } catch (err) { console.warn(err); toast("No se pudo encender. Revisa tu conexión.", ""); }
    btn.disabled = false;
  });
}
