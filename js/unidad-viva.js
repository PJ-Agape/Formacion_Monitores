// Unidad interactiva («Vivir la unidad»): convierte cada unidad del curso en una
// presentación con láminas, tarjetas que se dan vuelta, quiz, verdadero o falso,
// términos pareados, ordenar pasos, cuaderno, misión y oración, con puntos y estrellas.
// El texto completo de la unidad sigue disponible como complemento (#/unidad/...).
// Las láminas salen solas del contenido; las actividades extra vienen de data/interactivo.json.

import { esc, rich, plain, icon, toast } from "./util.js";
import { illus } from "./ilustraciones.js";

let ctx = null; // { actions, render, onLeave, S }
export function setup(c) { ctx = c; registerActions(); }

let EXTRA = null;
async function extras() {
  if (EXTRA) return EXTRA;
  try { EXTRA = await fetch("data/interactivo.json", { cache: "no-cache" }).then((r) => (r.ok ? r.json() : {})); } catch { EXTRA = {}; }
  return EXTRA;
}

// ---------------------------------------------------------------------------
// Puntaje guardado (mejor resultado por unidad)
// ---------------------------------------------------------------------------
const LS = "agape_uv_v1";
const loadBest = () => { try { return JSON.parse(localStorage.getItem(LS) || "{}"); } catch { return {}; } };
export function best(courseId, key) { return loadBest()[`${courseId}|${key}`] || null; }
function saveBest(courseId, key, r) {
  try { const all = loadBest(), k = `${courseId}|${key}`; if (!all[k] || r.xp >= all[k].xp) all[k] = { ...r, at: new Date().toISOString() }; localStorage.setItem(LS, JSON.stringify(all)); } catch {}
}

// ---------------------------------------------------------------------------
// Construcción de las láminas
// ---------------------------------------------------------------------------
const THEMES = ["cream", "sun", "white", "sky", "coral", "cream", "white", "sky"];
const ILL = ["corazon", "camino", "escuchar", "equipo", "acogida", "amigos", "semilla", "luz", "levantate", "biblia", "servir", "pastor"];
function blocks(body) {
  return String(body || "").split(/\n\s*\n/).map((b) => {
    const lines = b.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length && lines.every((l) => /^[-•]\s+/.test(l))) return { list: lines.map((l) => l.replace(/^[-•]\s+/, "")) };
    return { p: lines.join(" ") };
  }).filter((x) => x.list || x.p);
}
// Viñetas que empiezan con <strong>…</strong> → tarjetas para dar vuelta
function asCards(list) {
  const out = [];
  for (const l of list) {
    const m = /^<strong>(.+?)<\/strong>\s*[:,.—–-]?\s*(.*)$/.exec(l);
    if (!m) return null;
    out.push({ front: m[1].replace(/[:,]$/, ""), back: m[2] ? m[2].charAt(0).toUpperCase() + m[2].slice(1) : "" });
  }
  return out.every((c) => c.back) ? out : null;
}

function build(course, ph, pi, se, ex) {
  const S = [];
  const add = (type, o = {}) => S.push({ type, ...o });
  const acts = (ex && ex.actividades) || [];
  const at = (k) => acts.filter((a) => String(a.after) === String(k)).forEach((a) => add(a.type, { a }));
  add("cover");
  add("goal");
  at("inicio");
  (se.sections || []).forEach((sec, n) => {
    const bl = blocks(sec.body);
    let chunk = [], len = 0, part = 0;
    const flush = () => { if (chunk.length) { add("read", { sec, n, part: part++, items: chunk }); chunk = []; len = 0; } };
    for (const b of bl) {
      if (b.list) {
        // una frase corta que presenta la lista («…algunas imágenes:») va como bajada de la lámina
        let lead = "";
        if (chunk.length && /:\s*$/.test(plain(chunk[chunk.length - 1])) && plain(chunk[chunk.length - 1]).length < 220) lead = chunk.pop();
        const cards = asCards(b.list);
        flush();
        if (cards && cards.length >= 2) { add("flip", { sec, n, cards, lead }); continue; }
        add("list", { sec, n, items: b.list, lead }); continue;
      }
      const L = plain(b.p).length;
      if (len && len + L > 620) flush();
      chunk.push(b.p); len += L;
    }
    flush();
    at(n);
  });
  if (se.dynamic) add("read", { sec: { title: "Clave para comprender a los jóvenes" }, n: 99, part: 0, items: blocks(se.dynamic).map((b) => b.p || b.list.join(" · ")) });
  const bible = typeof se.bible === "string" ? { ref: "", comment: se.bible } : se.bible || {};
  if (bible.comment) add("bible", { bible });
  if ((se.church || []).length) add("church", { church: se.church });
  at("final");
  if ((se.questions || []).length) add("notebook");
  if (se.activity) add("mission");
  if (se.prayer) add("prayer");
  add("end");
  return S;
}

// ---------------------------------------------------------------------------
// Estado de la sesión de juego
// ---------------------------------------------------------------------------
let G = null; // { course, ph, pi, se, key, slides, cur, xp, max, done:Set }
const POINTS = { quiz: 10, vf: 5, pairs: 12, order: 10, cards: 2, flip: 2, notebook: 5, mission: 10, prayer: 5, church: 2 };
function maxXP(slides, se) {
  let m = 0;
  for (const s of slides) {
    if (s.type === "quiz") m += POINTS.quiz;
    else if (s.type === "vf") m += POINTS.vf * s.a.items.length;
    else if (s.type === "pairs") m += POINTS.pairs;
    else if (s.type === "order") m += POINTS.order;
    else if (s.type === "cards") m += POINTS.cards * s.a.cards.length;
    else if (s.type === "flip") m += POINTS.flip * s.cards.length;
    else if (s.type === "church") m += POINTS.church * s.church.length;
    else if (s.type === "notebook") m += POINTS.notebook * (se.questions || []).length;
    else if (s.type === "mission") m += POINTS.mission;
    else if (s.type === "prayer") m += POINTS.prayer;
  }
  return m;
}
function gain(id, pts, el) {
  if (!G || G.done.has(id) || pts <= 0) return;
  G.done.add(id); G.xp += pts;
  const pill = document.getElementById("uvXp");
  if (pill) { pill.querySelector("b").textContent = G.xp; pill.classList.remove("bump"); void pill.offsetWidth; pill.classList.add("bump"); }
  if (el) {
    const r = el.getBoundingClientRect(), f = document.createElement("span");
    f.className = "uv-float"; f.textContent = `+${pts}`; f.style.left = `${r.left + r.width / 2}px`; f.style.top = `${r.top}px`;
    document.body.appendChild(f); setTimeout(() => f.remove(), 1100);
  }
}
const stars = () => { const p = G.max ? G.xp / G.max : 1; return p >= 0.85 ? 3 : p >= 0.6 ? 2 : 1; };

// ---------------------------------------------------------------------------
// Vista
// ---------------------------------------------------------------------------
export async function view(phaseIdx, sid) {
  const S = ctx.S, course = S.activeCourse(), pi = +phaseIdx, ph = course.phases[pi];
  const se = ph && ph.sessions.find((s) => s.id === sid);
  if (!se) return null;
  const st = S.courseState(course);
  if (!st.phases[pi].open) { location.replace(`#/unidad/${pi}/${encodeURIComponent(sid)}`); return null; }
  const ex = ((await extras())[course.id] || {})[se.id] || null;
  const slides = build(course, ph, pi, se, ex);
  const key = S.sessionKey(pi, se);
  // Si la misma unidad ya está abierta (por ejemplo, llegó una sincronización), no se redibuja.
  if (G && G.key === key && G.course.id === course.id && document.getElementById("uv")) {
    document.body.classList.add("uv-open"); document.addEventListener("keydown", onKey);
    ctx.onLeave(() => { document.body.classList.remove("uv-open"); document.removeEventListener("keydown", onKey); });
    return null;
  }
  if (!G || G.key !== key || G.course.id !== course.id) G = { course, ph, pi, se, key, slides, cur: 0, xp: 0, done: new Set(), max: maxXP(slides, se), answers: {} };
  else { G.slides = slides; G.max = maxXP(slides, se); }
  const m = /[?&]s=(\d+)/.exec(location.hash); if (m) G.cur = Math.min(slides.length - 1, Math.max(0, +m[1] - 1));
  document.body.classList.add("uv-open");
  ctx.onLeave(() => { document.body.classList.remove("uv-open"); document.removeEventListener("keydown", onKey); });
  document.addEventListener("keydown", onKey);
  setTimeout(() => enter(G.cur), 30);
  return `<div class="uv" id="uv" aria-roledescription="presentación">
    <header class="uv-top">
      <a class="uv-x" href="#/itinerario" aria-label="Salir al curso">${icon("x")}</a>
      <span class="uv-where"><b>Unidad ${esc(se.id)}</b><span>${esc(se.title)}</span></span>
      <span class="uv-xp" id="uvXp" title="Puntos de esta unidad">⭐ <b>${G.xp}</b></span>
      <a class="uv-txt" href="#/unidad/${pi}/${encodeURIComponent(se.id)}" title="Ver el texto completo de la unidad">📄 <span>Texto completo</span></a>
    </header>
    <div class="uv-bar"><i id="uvFill"></i></div>
    <main class="uv-deck" id="uvDeck">${slides.map((s, i) => `<section class="uv-s t-${slideTheme(s, i)}${i === G.cur ? " on" : ""}" data-i="${i}" aria-hidden="${i === G.cur ? "false" : "true"}">${deco(i)}<div class="uv-in">${slideHTML(s, i)}</div></section>`).join("")}</main>
    <nav class="uv-nav">
      <button class="uv-btn" id="uvPrev" data-action="uvGo" data-d="-1" aria-label="Anterior">${icon("left")}</button>
      <span class="uv-count" id="uvCount"></span>
      <button class="uv-btn next" id="uvNext" data-action="uvGo" data-d="1" aria-label="Siguiente">${icon("right")}</button>
    </nav>
  </div>`;
}
function slideTheme(s, i) {
  return { cover: "cream", goal: "sun", bible: "blue", church: "white", notebook: "sky", mission: "coral", prayer: "blue", end: "cream", quiz: "coral", vf: "sky", pairs: "white", order: "sun", cards: "cream" }[s.type] || THEMES[(s.n || 0) % THEMES.length];
}
const deco = (i) => { const k = i % 3; return `<div class="uv-deco" aria-hidden="true"><i class="b1 k${k}"></i><i class="b2 k${k}"></i><i class="b3 k${k}"></i></div>`; };

function slideHTML(s, i) {
  const se = G.se, ph = G.ph;
  switch (s.type) {
    case "cover": return `<div class="uv-cover"><div>
        <span class="uv-label">Módulo ${esc(ph.phaseNum)} · ${esc(ph.title)}</span>
        <h1 class="uv-mega">${esc(se.title)}</h1>
        <div class="uv-chips">${se.time ? `<span>⏱ ${esc(se.time)}</span>` : ""}<span>🧩 ${G.slides.length} láminas</span><span>⭐ hasta ${G.max} puntos</span></div>
        <button class="btn btn-gold uv-start" data-action="uvGo" data-d="1">Comenzar ${icon("arrowR")}</button>
        ${(() => { const b = best(G.course.id, G.key); return b ? `<p class="uv-best">Tu mejor resultado: ${"★".repeat(b.stars)}${"☆".repeat(3 - b.stars)} · ${b.xp} puntos</p>` : ""; })()}
      </div><div class="uv-ill">${illus(ILL[(se.id.charCodeAt(2) || 0) % ILL.length])}</div></div>`;
    case "goal": return `<div class="uv-split"><div><span class="uv-label">Tu meta de hoy</span><h2 class="uv-big">🎯 Al terminar podrás…</h2>
        <p class="uv-bubble">${rich(se.objective)}</p></div>
        <div>${se.intro ? `<span class="uv-hand">para empezar</span><p class="uv-note">${rich(se.intro)}</p>` : ""}</div></div>`;
    case "read": return `<div class="uv-read"><span class="uv-label">${esc(s.sec.title)}${s.part ? " · sigue" : ""}</span>
        ${s.part ? "" : `<h2 class="uv-big">${esc(s.sec.title)}</h2>`}
        <div class="uv-text">${s.items.map((p) => `<p>${rich(p)}</p>`).join("")}</div></div>`;
    case "list": return `<div class="uv-read"><span class="uv-label">${esc(s.sec.title)}</span><h2 class="uv-mid">${s.lead ? rich(s.lead.replace(/:\s*$/, "")) : "Tócalos uno a uno"}</h2>${s.lead ? `<p class="xs uv-help">Tócalos uno a uno.</p>` : ""}
        <ul class="uv-reveal">${s.items.map((l, k) => `<li><button data-action="uvReveal" data-id="${i}-${k}"><span class="n">${k + 1}</span><span class="t">${rich(l)}</span></button></li>`).join("")}</ul></div>`;
    case "flip": return cardsHTML(i, s.sec.title, s.lead ? plain(s.lead).replace(/:\s*$/, "") : "Da vuelta cada tarjeta", s.cards, "flip", s.lead ? "Da vuelta cada tarjeta." : "");
    case "cards": return cardsHTML(i, s.a.title || "Tarjetas", s.a.subtitle || "Da vuelta cada tarjeta", s.a.cards, "cards");
    case "quiz": return quizHTML(i, s.a);
    case "vf": return vfHTML(i, s.a);
    case "pairs": return pairsHTML(i, s.a);
    case "order": return orderHTML(i, s.a);
    case "bible": return `<div class="uv-split"><div><span class="uv-label">Palabra de Dios</span>
        <h2 class="uv-big">📖 ${esc(s.bible.ref || "Escucha")}</h2><p class="uv-scripture">${rich(s.bible.comment)}</p></div>
        <div class="uv-ill">${illus("biblia")}</div></div>`;
    case "church": return cardsHTML(i, "La Iglesia nos dice", "Toca cada documento para leerlo", s.church.map((c) => ({ front: `📜 ${c.source}`, back: c.text, url: c.url })), "church");
    case "notebook": {
      const notes = ctx.S.getNotes(G.course.id, G.key);
      return `<div class="uv-read"><span class="uv-label">Mi cuaderno · solo tú lo lees</span><h2 class="uv-mid">✍️ Para tu reflexión</h2>
        <div class="uv-qs">${se.questions.map((q, k) => `<label class="uv-q"><span><b>${k + 1}.</b> ${rich(q)}</span>
          <textarea class="textarea" rows="2" data-note="${esc(G.key)}" data-qi="${k}" data-uvq="${i}-${k}" placeholder="Escribe aquí…">${esc(notes[k] || "")}</textarea></label>`).join("")}</div>
        <p class="xs muted" style="margin-top:8px">Se guarda solo. Lo encuentras después en «Mi cuaderno».</p></div>`;
    }
    case "mission": return `<div class="uv-split"><div><span class="uv-label">Tu misión para el grupo</span><h2 class="uv-big">🚀 Llévalo a tu grupo</h2>
        <div class="uv-mission"><p>${rich(se.activity)}</p></div>
        <button class="btn btn-gold" data-action="uvMission" data-id="${i}">${G.done.has("m" + i) ? "✓ ¡Desafío aceptado!" : "¡Acepto el desafío!"}</button></div>
        <div class="uv-ill">${illus("envio")}</div></div>`;
    case "prayer": return `<div class="uv-pray"><span class="uv-label">Oración</span><h2 class="uv-mid">🙏 Terminemos rezando</h2>
        <p class="uv-prayer">${rich(se.prayer)}</p>
        <button class="btn btn-gold" data-action="uvAmen" data-id="${i}">${G.done.has("p" + i) ? "✓ Amén" : "Amén"}</button></div>`;
    case "end": return `<div class="uv-end" id="uvEnd"></div>`;
  }
  return "";
}
function endHTML() {
  const s = stars(), read = !!ctx.S.progress(G.course.id).read[G.key];
  const flat = [];
  const st = ctx.S.courseState(G.course);
  G.course.phases.forEach((p, pi) => { if (st.phases[pi].open) p.sessions.forEach((x) => flat.push([pi, x])); });
  const pos = flat.findIndex(([pi, x]) => pi === G.pi && x.id === G.se.id), next = flat[pos + 1];
  const last = G.ph.sessions[G.ph.sessions.length - 1].id === G.se.id;
  return `<canvas class="uv-confetti" id="uvConf"></canvas>
    <span class="uv-label">¡Unidad terminada!</span>
    <h2 class="uv-mega">${s === 3 ? "¡Excelente!" : s === 2 ? "¡Muy bien!" : "¡Bien hecho!"}</h2>
    <div class="uv-stars">${[1, 2, 3].map((k) => `<span class="${k <= s ? "on" : ""}" style="--d:${k}">★</span>`).join("")}</div>
    <p class="uv-score"><b>${G.xp}</b> de ${G.max} puntos</p>
    <div class="uv-end-btns">
      ${read ? `<span class="chip ok">${icon("check")} Unidad completada</span>` : `<button class="btn btn-primary" data-action="uvComplete">${icon("check")} Marcar unidad como completada</button>`}
      ${last && G.ph.quiz && G.ph.quiz.questions && G.ph.quiz.questions.length ? `<a class="btn btn-gold" href="#/itinerario">Ir a la evaluación del módulo</a>` : next ? `<a class="btn btn-gold" href="#/vivir/${next[0]}/${encodeURIComponent(next[1].id)}">Siguiente: ${esc(next[1].title)} ${icon("arrowR")}</a>` : ""}
      <button class="btn btn-ghost" data-action="uvRestart">Jugar de nuevo</button>
      <a class="btn btn-ghost" href="#/unidad/${G.pi}/${encodeURIComponent(G.se.id)}">📄 Texto completo y recursos</a>
    </div>`;
}
function cardsHTML(i, title, sub, cards, kind, help = "") {
  return `<div class="uv-read"><span class="uv-label">${esc(title)}</span><h2 class="uv-mid">${esc(sub)}</h2>${help ? `<p class="xs uv-help">${esc(help)}</p>` : ""}
    <div class="uv-cards n${Math.min(cards.length, 6)}">${cards.map((c, k) => `<div class="uv-card" role="button" tabindex="0" data-action="uvFlip" data-id="${i}-${k}" data-kind="${kind}">
      <span class="f">${rich(c.front)}<small>toca para ver</small></span><span class="b">${rich(c.back)}${c.url ? `<a href="${esc(c.url)}" target="_blank" rel="noopener" class="uv-src">Leer el documento ↗</a>` : ""}</span></div>`).join("")}</div></div>`;
}
function quizHTML(i, a) {
  return `<div class="uv-read"><span class="uv-label">${esc(a.label || "¿Qué harías?")}</span><h2 class="uv-mid">${rich(a.q)}</h2>
    <div class="uv-opts" data-q="${i}">${a.options.map((o, k) => `<button class="uv-opt" data-action="uvQuiz" data-i="${i}" data-k="${k}"><span class="l">${"ABCDE"[k]}</span>${rich(o)}</button>`).join("")}</div>
    <p class="uv-fb" id="uvFb${i}" aria-live="polite"></p></div>`;
}
function vfHTML(i, a) {
  return `<div class="uv-read"><span class="uv-label">${esc(a.label || "¿Verdadero o falso?")}</span><h2 class="uv-mid">${esc(a.title || "¿Verdadero o falso?")}</h2>
    <div class="uv-vf">${a.items.map((it, k) => `<div class="uv-vf-i" data-id="${i}-${k}"><p>${rich(it.t)}</p>
      <div class="uv-vf-b"><button data-action="uvVF" data-i="${i}" data-k="${k}" data-v="1">Verdadero</button><button data-action="uvVF" data-i="${i}" data-k="${k}" data-v="0">Falso</button></div>
      <p class="uv-vf-why" hidden>${rich(it.why || "")}</p></div>`).join("")}</div></div>`;
}
const shuffle = (arr, seed) => { const a = arr.map((x, k) => [x, k]); let s = seed || 7; for (let k = a.length - 1; k > 0; k--) { s = (s * 9301 + 49297) % 233280; const j = Math.floor((s / 233280) * (k + 1)); [a[k], a[j]] = [a[j], a[k]]; } return a; };
function pairsHTML(i, a) {
  const left = a.pairs.map((p, k) => [p[0], k]);
  let right = shuffle(a.pairs.map((p) => p[1]), i + 3);
  if (right.every(([, k], n) => k === n)) right = [...right.slice(1), right[0]];
  return `<div class="uv-read"><span class="uv-label">${esc(a.label || "Términos pareados")}</span><h2 class="uv-mid">${esc(a.title || "Une cada concepto con su pareja")}</h2>
    <p class="xs uv-help">Toca uno de la izquierda y luego su pareja a la derecha.</p>
    <div class="uv-pairs" data-i="${i}"><div class="col">${left.map(([t, k]) => `<button class="uv-pair L" data-action="uvPair" data-i="${i}" data-side="L" data-k="${k}">${rich(t)}</button>`).join("")}</div>
      <div class="col">${right.map(([t, k]) => `<button class="uv-pair R" data-action="uvPair" data-i="${i}" data-side="R" data-k="${k}">${rich(t)}</button>`).join("")}</div></div>
    <p class="uv-fb" id="uvFb${i}" aria-live="polite"></p></div>`;
}
function orderHTML(i, a) {
  let items = shuffle(a.items, i + 11);
  if (items.every(([, k], n) => k === n)) items = [...items.slice(1), items[0]];
  return `<div class="uv-read"><span class="uv-label">${esc(a.label || "Ordena")}</span><h2 class="uv-mid">${esc(a.title || "Ponlo en orden")}</h2>
    <p class="xs uv-help">Usa las flechas para mover cada paso. Cuando esté listo, toca «Revisar».</p>
    <ol class="uv-order" id="uvOrd${i}">${items.map(([t, k]) => `<li data-k="${k}"><span class="t">${rich(t)}</span>
      <span class="mv"><button data-action="uvMove" data-i="${i}" data-d="-1" aria-label="Subir">${icon("up")}</button><button data-action="uvMove" data-i="${i}" data-d="1" aria-label="Bajar">${icon("down")}</button></span></li>`).join("")}</ol>
    <button class="btn btn-primary" data-action="uvCheckOrder" data-i="${i}">Revisar</button>
    <p class="uv-fb" id="uvFb${i}" aria-live="polite"></p></div>`;
}

// ---------------------------------------------------------------------------
// Navegación
// ---------------------------------------------------------------------------
function enter(i) {
  const deck = document.getElementById("uvDeck"); if (!deck || !G) return;
  G.cur = i;
  deck.querySelectorAll(".uv-s").forEach((s) => { const on = +s.dataset.i === i; s.classList.toggle("on", on); s.setAttribute("aria-hidden", on ? "false" : "true"); if (on) s.scrollTop = 0; });
  const fill = document.getElementById("uvFill"); if (fill) fill.style.width = `${((i + 1) / G.slides.length) * 100}%`;
  const c = document.getElementById("uvCount"); if (c) c.textContent = `${i + 1} / ${G.slides.length}`;
  const p = document.getElementById("uvPrev"), n = document.getElementById("uvNext");
  if (p) p.disabled = i === 0; if (n) n.disabled = i === G.slides.length - 1;
  const s = G.slides[i];
  if (s.type === "end") finish();
  try { history.replaceState(null, "", `#/vivir/${G.pi}/${encodeURIComponent(G.se.id)}?s=${i + 1}`); } catch {}
}
function go(d) { if (!G) return; const i = Math.max(0, Math.min(G.slides.length - 1, G.cur + d)); if (i !== G.cur) enter(i); }
function onKey(e) {
  if ((e.key === "Enter" || e.key === " ") && e.target.classList && e.target.classList.contains("uv-card")) { e.preventDefault(); e.target.click(); return; }
  if (!G || e.altKey || e.ctrlKey || e.metaKey || /input|textarea|select/i.test(e.target.tagName)) return;
  if (e.key === "ArrowRight" || e.key === "PageDown") { e.preventDefault(); go(1); }
  else if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); go(-1); }
}
let sx = null, sy = null;
document.addEventListener("touchstart", (e) => { if (!document.getElementById("uv")) return; sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
document.addEventListener("touchend", (e) => {
  if (sx == null || !document.getElementById("uv")) return;
  if (e.target.closest(".uv-pairs, .uv-order, textarea, .uv-cards")) { sx = null; return; }
  const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
  if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1);
  sx = sy = null;
}, { passive: true });

function finish() {
  const box = document.getElementById("uvEnd"); if (!box) return;
  // las reflexiones escritas cuentan al llegar al final
  document.querySelectorAll("[data-uvq]").forEach((t) => { if (t.value.trim()) gain("q" + t.dataset.uvq, POINTS.notebook); });
  box.innerHTML = endHTML();
  saveBest(G.course.id, G.key, { xp: G.xp, max: G.max, stars: stars() });
  confetti();
}
function confetti() {
  const cv = document.getElementById("uvConf"); if (!cv || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const cx = cv.getContext("2d"), dpr = Math.min(2, devicePixelRatio || 1);
  cv.width = cv.clientWidth * dpr; cv.height = cv.clientHeight * dpr; cx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const cols = ["#ffba03", "#ef591c", "#8ad2fa", "#0b2566", "#1351a4"];
  let parts = Array.from({ length: 120 }, () => ({ x: cv.clientWidth * (0.3 + Math.random() * 0.4), y: cv.clientHeight * 0.45, vx: (Math.random() - .5) * 13, vy: -7 - Math.random() * 11, s: 5 + Math.random() * 6, r: Math.random() * 6, vr: (Math.random() - .5) * .3, c: cols[(Math.random() * 5) | 0] }));
  const tick = () => {
    cx.clearRect(0, 0, cv.clientWidth, cv.clientHeight);
    parts.forEach((p) => { p.vy += .3; p.x += p.vx; p.y += p.vy; p.r += p.vr; cx.save(); cx.translate(p.x, p.y); cx.rotate(p.r); cx.fillStyle = p.c; cx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); cx.restore(); });
    parts = parts.filter((p) => p.y < cv.clientHeight + 30);
    if (parts.length && document.getElementById("uvConf")) requestAnimationFrame(tick);
  };
  tick();
}

// ---------------------------------------------------------------------------
// Acciones
// ---------------------------------------------------------------------------
const pairSel = {};
function registerActions() {
  const A = ctx.actions;
  A.uvGo = (el) => go(+el.dataset.d);
  A.uvReveal = (el) => { el.classList.add("on"); };
  A.uvFlip = (el, e) => {
    // El enlace «Leer el documento» va dentro de la tarjeta: el clic global cancela la navegación, así que se abre aquí.
    const link = e && e.target.closest("a[href]");
    if (link) { window.open(link.href, "_blank", "noopener"); return; }
    el.classList.toggle("on");
    const pts = el.dataset.kind === "church" ? POINTS.church : el.dataset.kind === "cards" ? POINTS.cards : POINTS.flip;
    if (el.classList.contains("on")) gain("f" + el.dataset.id, pts, el);
  };
  A.uvQuiz = (el) => {
    const i = +el.dataset.i, a = G.slides[i].a, k = +el.dataset.k, box = el.parentElement;
    if (box.dataset.done) return;
    const ok = k === a.correct;
    if (ok) {
      box.dataset.done = "1"; el.classList.add("right");
      box.querySelectorAll(".uv-opt").forEach((b) => (b.disabled = true));
      gain("z" + i, G.answers[i] ? Math.round(POINTS.quiz / 2) : POINTS.quiz, el);
      document.getElementById("uvFb" + i).innerHTML = `<b>${G.answers[i] ? "¡Ahora sí!" : "¡Eso!"}</b> ${rich(a.feedback || "")}`;
    } else {
      G.answers[i] = (G.answers[i] || 0) + 1; el.classList.add("wrong"); el.disabled = true;
      document.getElementById("uvFb" + i).innerHTML = `<b>Casi.</b> ${rich(a.hint || "Piénsalo de nuevo e intenta otra opción.")}`;
    }
  };
  A.uvVF = (el) => {
    const i = +el.dataset.i, k = +el.dataset.k, it = G.slides[i].a.items[k];
    const row = el.closest(".uv-vf-i"); if (row.dataset.done) return;
    row.dataset.done = "1";
    const ok = (el.dataset.v === "1") === !!it.v;
    row.classList.add(ok ? "ok" : "ko");
    row.querySelectorAll("button").forEach((b) => { b.disabled = true; if ((b.dataset.v === "1") === !!it.v) b.classList.add("right"); });
    const why = row.querySelector(".uv-vf-why"); if (why && why.textContent.trim()) { why.hidden = false; why.insertAdjacentHTML("afterbegin", `<b>${ok ? "¡Bien!" : "Ojo:"}</b> `); }
    if (ok) gain(`v${i}-${k}`, POINTS.vf, el);
  };
  A.uvPair = (el) => {
    const i = el.dataset.i, side = el.dataset.side, k = el.dataset.k;
    if (el.classList.contains("done")) return;
    const st = (pairSel[i] = pairSel[i] || { L: null, R: null, miss: 0, n: 0 });
    const wrap = el.closest(".uv-pairs");
    wrap.querySelectorAll(`.uv-pair.${side}.sel`).forEach((b) => b.classList.remove("sel"));
    el.classList.add("sel"); st[side] = k;
    if (st.L != null && st.R != null) {
      const L = wrap.querySelector(`.uv-pair.L[data-k="${st.L}"]`), R = wrap.querySelector(`.uv-pair.R[data-k="${st.R}"]`);
      if (st.L === st.R) {
        st.n++; const col = st.n % 5;
        [L, R].forEach((b) => { b.classList.remove("sel"); b.classList.add("done", "c" + col); });
        const total = G.slides[+i].a.pairs.length;
        if (st.n === total) {
          const pts = Math.max(4, POINTS.pairs - st.miss * 2);
          gain("p" + i, pts, R);
          document.getElementById("uvFb" + i).innerHTML = `<b>${st.miss ? "¡Listo!" : "¡Perfecto!"}</b> ${rich(G.slides[+i].a.feedback || "Todas las parejas están unidas.")}`;
        }
      } else {
        st.miss++; [L, R].forEach((b) => { b.classList.add("shake"); setTimeout(() => b.classList.remove("shake", "sel"), 450); });
      }
      st.L = st.R = null;
    }
  };
  A.uvMove = (el) => {
    const li = el.closest("li"), d = +el.dataset.d;
    const ol = li.parentElement; ol.classList.remove("bad");
    if (d < 0 && li.previousElementSibling) ol.insertBefore(li, li.previousElementSibling);
    if (d > 0 && li.nextElementSibling) ol.insertBefore(li.nextElementSibling, li);
  };
  A.uvCheckOrder = (el) => {
    const i = +el.dataset.i, ol = document.getElementById("uvOrd" + i), a = G.slides[i].a;
    const ok = [...ol.children].every((li, n) => +li.dataset.k === n);
    if (ok) {
      ol.classList.add("good"); el.disabled = true;
      gain("o" + i, G.answers["o" + i] ? Math.round(POINTS.order / 2) : POINTS.order, el);
      document.getElementById("uvFb" + i).innerHTML = `<b>¡Así es!</b> ${rich(a.feedback || "")}`;
    } else {
      G.answers["o" + i] = 1; ol.classList.add("bad");
      [...ol.children].forEach((li, n) => li.classList.toggle("okpos", +li.dataset.k === n));
      document.getElementById("uvFb" + i).innerHTML = `<b>Todavía no.</b> Los que están en su lugar quedaron marcados. Mueve los demás y revisa otra vez.`;
    }
  };
  A.uvMission = (el) => { gain("m" + el.dataset.id, POINTS.mission, el); el.textContent = "✓ ¡Desafío aceptado!"; };
  A.uvAmen = (el) => { gain("p" + el.dataset.id, POINTS.prayer, el); el.textContent = "✓ Amén"; };
  A.uvComplete = (el) => {
    ctx.S.markRead(G.course.id, G.key);
    el.outerHTML = `<span class="chip ok">${icon("check")} Unidad completada</span>`;
    const s = ctx.S.courseState(G.course).phases[G.pi];
    toast(s.read === s.total ? "¡Módulo listo! Ya puedes rendir su evaluación" : "Unidad completada", "ok", 3500);
  };
  A.uvRestart = () => {
    const pi = G.pi, id = G.se.id; G = null; Object.keys(pairSel).forEach((x) => delete pairSel[x]);
    document.getElementById("uv")?.remove(); location.hash = `#/vivir/${pi}/${encodeURIComponent(id)}?s=1`; ctx.render();
  };
}
