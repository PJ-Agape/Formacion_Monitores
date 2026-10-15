// Liturgia de las Horas guiada (Capilla): Laudes, Vísperas y Completas, paso a paso, con una
// dinámica parecida al Rosario virtual: un arco con cada parte de la oración y el sol (o la luna)
// avanzando. Los textos fijos van aquí; los que cambian cada día (himno, salmos, lectura, preces,
// oración) y los cánticos bíblicos tienen traducción litúrgica protegida: se abren en iBreviary.
import { esc, icon } from "./util.js";
import { ORACIONES } from "./devocionario.js";

const BREV = (s) => `https://www.ibreviary.com/m2/breviario.php?s=${s}&lang=es`;
const ORA = (t) => (ORACIONES.find((o) => o.t === t) || {}).x || "";
const GLORIA = "Gloria al Padre, y al Hijo, y al Espíritu Santo.\nComo era en el principio, ahora y siempre,\npor los siglos de los siglos.\nAmén.";

export const HOURS = {
  laudes: { name: "Laudes", when: "mañana", hand: "el día comienza con Dios", ib: "lodi", sky: ["#8ad2fa", "#ffe9b0"], body: "sun" },
  visperas: { name: "Vísperas", when: "tarde", hand: "damos gracias por el día", ib: "vespri", sky: ["#ef591c", "#ffba03"], body: "sunset" },
  completas: { name: "Completas", when: "noche", hand: "en tus manos, Señor", ib: "compieta", sky: ["#061538", "#1351a4"], body: "moon" },
};
export const hourNow = (d = new Date()) => { const h = d.getHours(); return h >= 4 && h < 12 ? "laudes" : h >= 12 && h < 20 ? "visperas" : "completas"; };

// Pasos de cada hora. x: texto que se reza aquí · ext: se lee en el breviario de hoy · how: cómo se reza
function steps(k, season) {
  const pascua = season === "pascua", cuaresma = season === "cuaresma" || season === "triduo";
  const alleluia = cuaresma ? "" : "\nAleluya.";
  const inv = k === "laudes"
    ? { t: "Invocación", how: "Es la primera oración del día. Al decir la primera línea, haz la señal de la cruz sobre tus labios.", x: `V. Señor, abre mis labios.\nR. Y mi boca proclamará tu alabanza.\n\n${GLORIA}${alleluia}` }
    : { t: "Invocación", how: "Nos santiguamos y pedimos a Dios que nos ayude a rezar.", x: `V. Dios mío, ven en mi auxilio.\nR. Señor, date prisa en socorrerme.\n\n${GLORIA}${alleluia}` };
  const S = [inv];
  if (k === "completas") S.unshift({ t: "Examen del día", how: "Antes de dormir, mira tu día con Jesús, sin apuro: ¿Qué agradezco? ¿Dónde sentí a Dios? ¿Qué no hice bien? Pide perdón y quédate en paz.", x: ORA("Acto de Contrición"), xt: "Acto de Contrición" });
  S.push(
    { t: "Himno", ext: true, how: "Un canto o poema que abre la oración. Léelo con calma, o cántalo si lo conocen." },
    { t: "Salmodia", ext: true, how: k === "completas" ? "Uno o dos salmos para confiar en Dios antes de dormir. Reza también la antífona, antes y después." : "Dos salmos y un cántico, cada uno con su antífona. En grupo, se alternan las estrofas a dos coros. Al final de cada uno se reza el Gloria.", x: GLORIA, xt: "Al final de cada salmo" },
    { t: "Lectura breve", ext: true, how: "Unas pocas líneas de la Biblia. Léelas despacio y guarda un momento de silencio: ¿qué palabra te queda?" },
    { t: "Responsorio", ext: true, how: "Una respuesta breve que repite lo escuchado. Si rezan en grupo, uno dice cada línea y todos responden." },
  );
  const cant = { laudes: ["Cántico de Zacarías", "Benedictus · Lucas 1, 68-79", "Agradece a Dios que viene a visitarnos."], visperas: ["Cántico de María", "Magnificat · Lucas 1, 46-55", "Con María, alaba a Dios por lo que hizo hoy en tu vida."], completas: ["Cántico de Simeón", "Nunc dimittis · Lucas 2, 29-32", "Como el anciano Simeón, descansa en paz porque has visto la luz de Dios."] }[k];
  S.push({ t: cant[0], sub: cant[1], ext: true, how: `Es el momento central. Nos ponemos de pie y nos santiguamos al comenzar. ${cant[2]} Termina con el Gloria y la antífona.` });
  if (k !== "completas") S.push({ t: "Preces", ext: true, how: k === "laudes" ? "Peticiones para consagrar a Dios el día que comienza. Agrega tus propias intenciones." : "Peticiones por la Iglesia, el mundo y los que sufren; la última, siempre por los difuntos. Agrega tus intenciones." },
    { t: "Padre nuestro", how: "Todos juntos, como Jesús nos enseñó.", x: ORA("Padre nuestro") });
  S.push({ t: "Oración", ext: true, how: "La oración propia del día, que recoge todo lo que hemos rezado." });
  S.push(k === "completas"
    ? { t: "Conclusión", how: "Nos santiguamos.", x: "V. El Señor todopoderoso nos conceda una noche tranquila y una santa muerte.\nR. Amén." }
    : { t: "Conclusión", how: "Nos santiguamos. Si hay un sacerdote o diácono, él da la bendición.", x: "V. El Señor nos bendiga, nos guarde de todo mal y nos lleve a la vida eterna.\nR. Amén." });
  if (k === "completas") S.push(pascua
    ? { t: "A la Virgen", how: "Terminamos el día con María. En Pascua se reza el Regina Coeli.", x: ORA("Regina Coeli") }
    : { t: "A la Virgen", how: "Terminamos el día con María.", x: ORA("Salve Regina") || ORA("Salve") });
  S.push({ t: "fin", fin: true });
  return S;
}

// ---------------------------------------------------------------------------
// Vista (ventana sobre la Capilla)
// ---------------------------------------------------------------------------
let H = null; // { k, steps, i, el }
const KEY = "agape_horas_v1";
const todayKey = () => new Date().toISOString().slice(0, 10);
const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ k: H.k, i: H.i, day: todayKey() })); } catch { /* */ } };
const load = (k) => { try { const s = JSON.parse(localStorage.getItem(KEY) || "null"); if (s && s.k === k && s.day === todayKey()) return +s.i || 0; } catch { /* */ } return 0; };
const fmt = (x) => esc(x).split("\n").map((l) => (l === "" ? '<span class="lh-gap"></span>' : /^[VR]\. /.test(l) ? `<span class="lh-vr"><b>${l[0]}.</b> ${l.slice(3)}</span>` : `${l}<br>`)).join("");

function arcSVG(n) {
  // Arco del cielo: cada parte es un punto; el sol, el atardecer o la luna avanza por él.
  const W = 360, Hh = 150, cx = 180, cy = 150, r = 150;
  const pts = [...Array(n)].map((_, i) => { const a = Math.PI - (i / (n - 1)) * Math.PI; return [cx + r * 0.92 * Math.cos(a), cy - r * 0.86 * Math.sin(a)]; });
  return `<svg class="lh-arc" viewBox="0 0 ${W} ${Hh + 12}" aria-hidden="true">
    <path class="lh-path" d="M${pts[0][0]} ${pts[0][1]} A ${r * 0.92} ${r * 0.86} 0 0 1 ${pts[n - 1][0]} ${pts[n - 1][1]}"/>
    <line class="lh-horizon" x1="0" y1="${cy + 1}" x2="${W}" y2="${cy + 1}"/>
    ${pts.map(([x, y], i) => `<g class="lh-pt" data-i="${i}" role="button" tabindex="-1"><circle class="hit" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="12"/><circle class="dot" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="6"/></g>`).join("")}
    <g class="lh-body" id="lhBody"></g>
  </svg>`;
}
function bodySVG(kind) {
  if (kind === "moon") return '<circle r="17" fill="#fff6e5"/><circle r="15" cx="8" cy="-5" fill="var(--lh-sky1)"/>';
  const rays = [...Array(8)].map((_, i) => { const a = (i / 8) * Math.PI * 2; return `<line x1="${(Math.cos(a) * 21).toFixed(1)}" y1="${(Math.sin(a) * 21).toFixed(1)}" x2="${(Math.cos(a) * 28).toFixed(1)}" y2="${(Math.sin(a) * 28).toFixed(1)}"/>`; }).join("");
  return `<g class="lh-rays">${rays}</g><circle r="16" fill="${kind === "sunset" ? "#ffba03" : "#ffd23f"}" stroke="#0b2566" stroke-width="2.5"/>`;
}

export function open(k, season) {
  k = HOURS[k] ? k : hourNow();
  close();
  const el = document.createElement("div");
  el.className = "ros-ov lh-ov"; el.id = "lhOverlay";
  el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-label", "Liturgia de las Horas");
  document.body.appendChild(el);
  document.body.classList.add("cap-quiet");
  H = { k, season, el, steps: steps(k, season), i: load(k) };
  shell(); paint();
  el.querySelector("#lhNext")?.focus();
}
function shell() {
  const { el, k } = H, h = HOURS[k], now = hourNow();
  el.style.setProperty("--lh-sky1", h.sky[0]); el.style.setProperty("--lh-sky2", h.sky[1]);
  el.innerHTML = `<div class="ros-in lh-in">
    <div class="ros-top">
      <div><span class="ros-hand">${esc(h.hand)}</span><h2>Liturgia de las Horas</h2></div>
      <button class="ros-x" data-action="lhClose" aria-label="Cerrar">${icon("x")}</button>
    </div>
    <div class="ros-sets" role="tablist" aria-label="Hora">${Object.entries(HOURS).map(([key, x]) =>
      `<button role="tab" data-action="lhSet" data-k="${key}" aria-selected="${key === k}" title="${esc(x.name)}: ${esc(x.when)}">${esc(x.name)}${key === now ? " · ahora" : ""}</button>`).join("")}</div>
    <div class="lh-stage">${arcSVG(H.steps.length)}</div>
    <div class="lh-card" id="lhCard" aria-live="polite"></div>
    <div class="ros-ctl lh-ctl">
      <button class="btn btn-glass" data-action="lhPrev">${icon("left")} Anterior</button>
      <span class="ros-prog" id="lhProg"></span>
      <button class="btn btn-gold" data-action="lhNext" id="lhNext">Siguiente ${icon("right")}</button>
    </div>
  </div>`;
  el.querySelectorAll(".lh-pt").forEach((g) => g.addEventListener("click", (e) => { e.stopPropagation(); H.i = +g.dataset.i; paint(); }));
  el.querySelector("#lhBody").innerHTML = bodySVG(h.body);
}
function paint() {
  if (!H) return;
  const { el, steps: S, i, k } = H, s = S[i], h = HOURS[k];
  el.querySelectorAll(".lh-pt").forEach((g) => { const n = +g.dataset.i; g.classList.toggle("now", n === i); g.classList.toggle("done", n < i || !!s.fin); });
  const dot = el.querySelector(`.lh-pt[data-i="${i}"] .dot`);
  if (dot) el.querySelector("#lhBody").setAttribute("transform", `translate(${dot.getAttribute("cx")} ${dot.getAttribute("cy")})`);
  const card = el.querySelector("#lhCard");
  if (s.fin) {
    card.innerHTML = `<div class="lh-c-in is-fin"><span class="ros-eb">${esc(h.name)}</span><strong class="lh-t">¡Rezaste con toda la Iglesia!</strong>
      <p class="lh-how">En este mismo momento, en todo el mundo, miles de personas rezan estas mismas palabras. No rezaste solo.</p>
      <p class="lh-how">${k === "laudes" ? "Que tengas un buen día con Dios." : k === "visperas" ? "Que descanses con el corazón agradecido." : "Buenas noches. Duerme en paz."}</p></div>`;
  } else {
    card.innerHTML = `<div class="lh-c-in">
      <span class="ros-eb">${esc(h.name)} · paso ${i + 1} de ${S.length - 1}</span>
      <strong class="lh-t">${esc(s.t)}</strong>${s.sub ? `<span class="lh-sub">${esc(s.sub)}</span>` : ""}
      <p class="lh-how">${esc(s.how)}</p>
      ${s.x ? `${s.xt ? `<span class="lh-xt">${esc(s.xt)}</span>` : ""}<div class="lh-txt">${fmt(s.x)}</div>` : ""}
      ${s.ext ? `<a class="lh-open" href="${BREV(h.ib)}" target="_blank" rel="noopener">${icon("book")} Leer ${s.sub ? "el cántico" : "el texto de hoy"} en el breviario ↗</a>
        <span class="lh-note">Se abre iBreviary, con la ${esc(h.name)} de hoy completa. Busca la parte «${esc(s.t.replace(/^Cántico de .*/, "Cántico evangélico"))}» y vuelve aquí para seguir.</span>` : ""}
    </div>`;
  }
  card.scrollTop = 0;
  el.querySelector("#lhProg").textContent = s.fin ? "Terminado" : `${i + 1} / ${S.length - 1}`;
  el.querySelector("[data-action=lhPrev]").disabled = i === 0;
  el.querySelector("#lhNext").innerHTML = s.fin ? `Volver a empezar ${icon("undo")}` : i === S.length - 2 ? `Terminar ${icon("check")}` : `Siguiente ${icon("right")}`;
  save();
}
function move(d) { if (!H) return; if (d > 0 && H.steps[H.i].fin) H.i = 0; else H.i = Math.max(0, Math.min(H.steps.length - 1, H.i + d)); paint(); }
export function close() {
  document.getElementById("lhOverlay")?.remove();
  if (!document.getElementById("capOverlay") && !document.getElementById("rosOverlay")) document.body.classList.remove("cap-quiet");
  H = null;
}
export function register(A) {
  A.lhClose = () => close();
  A.lhNext = () => move(1);
  A.lhPrev = () => move(-1);
  A.lhSet = (el) => { if (!H || el.dataset.k === H.k) return; H.k = el.dataset.k; H.steps = steps(H.k, H.season); H.i = load(H.k); shell(); paint(); };
  document.addEventListener("keydown", (e) => {
    if (!document.getElementById("lhOverlay")) return;
    if (e.key === "Escape") { e.preventDefault(); close(); }
    else if (e.key === "ArrowRight") { e.preventDefault(); move(1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); move(-1); }
  });
}
