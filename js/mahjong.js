// Mahjong solitario con los personajes de la app: junta parejas de fichas iguales que estén libres
// (sin otra ficha encima y con un lado libre, a la izquierda o a la derecha).
// Las fichas se reparten de modo que siempre haya una forma de terminar.
import { icon } from "./util.js";
import { stickerSrc, stickerName, celebrate, closeWin, record, getRecord, fmtTime, shuffle, rnd } from "./stickers-img.js";

let ctx = null; // { actions, onAfterRender, onLeave }
export function setup(c) { ctx = c; registerActions(); }
const $ = (s, r = document) => r.querySelector(s);

// 21 tipos de ficha × 4 = 84 fichas
const TYPES = ["pj:llama", "pj:zorro", "pj:pinguino", "pj:gato", "pj:quiltro", "pj:oso", "pj:pudu", "pj:panda", "pj:conejo", "pj:buho", "pj:ballena", "pj:abeja", "pj:paloma", "pj:dino", "pj:astronauta", "pj:robot", "pj:sol", "pj:cactus", "pj:taza", "pj:guitarra", "heart"];

// Pirámide: [x, y, z] en unidades de ficha (puede haber medias).
function layout() {
  const P = [];
  for (let y = 0; y < 8; y++) for (let x = 0; x < 6; x++) P.push([x, y, 0]);
  for (let y = 1; y < 7; y++) for (let x = 1; x < 5; x++) P.push([x, y, 1]);
  for (let y = 2; y < 6; y++) for (let x = 2; x < 4; x++) P.push([x, y, 2]);
  P.push([2.5, 3, 3], [2.5, 4, 3]);
  P.push([-1, 3.5, 0], [6, 3.5, 0]);
  return P.map(([x, y, z], id) => ({ id, x, y, z }));
}
const over = (a, b) => Math.abs(a.x - b.x) < 1 && Math.abs(a.y - b.y) < 1;
function isFree(t, live) {
  let left = false, right = false;
  for (const o of live) {
    if (o === t) continue;
    if (o.z > t.z && over(o, t)) return false;
    if (o.z === t.z && Math.abs(o.y - t.y) < 1) {
      if (Math.abs(o.x - (t.x - 1)) < 0.01) left = true;
      if (Math.abs(o.x - (t.x + 1)) < 0.01) right = true;
    }
  }
  return !(left && right);
}
// Reparte tipos simulando una partida resuelta: se sacan de a dos fichas libres y se les da el mismo tipo.
function deal(tiles, pairs) {
  for (let tries = 0; tries < 300; tries++) {
    const live = tiles.slice(), bag = shuffle(pairs.slice()), out = new Map();
    let ok = true;
    while (live.length) {
      const free = live.filter((t) => isFree(t, live));
      if (free.length < 2) { ok = false; break; }
      const a = free.splice(rnd(free.length), 1)[0], b = free[rnd(free.length)], k = bag.pop();
      out.set(a.id, k); out.set(b.id, k);
      live.splice(live.indexOf(a), 1); live.splice(live.indexOf(b), 1);
    }
    if (ok) { for (const t of tiles) t.k = out.get(t.id); return true; }
  }
  return false;
}

let g = null, tick = null;
export const artSvg = () => `<svg viewBox="0 0 64 64" width="100%" height="100%"><rect x="8" y="22" width="22" height="28" rx="4" fill="#fff6e5" stroke="#0b2566" stroke-width="2.5"/><rect x="5" y="25" width="22" height="28" rx="4" fill="#fff" stroke="#0b2566" stroke-width="2.5"/>
  <rect x="34" y="14" width="22" height="28" rx="4" fill="#fff6e5" stroke="#0b2566" stroke-width="2.5"/><rect x="31" y="17" width="22" height="28" rx="4" fill="#fff" stroke="#0b2566" stroke-width="2.5"/>
  <circle cx="16" cy="39" r="6" fill="#ef591c"/><circle cx="42" cy="31" r="6" fill="#ef591c"/><path d="M22 18 q8 -10 16 -2" fill="none" stroke="#ffba03" stroke-width="2.5" stroke-linecap="round"/></svg>`;

export function view() {
  ctx.onAfterRender(() => document.body.classList.add("solo-on"));
  ctx.onLeave(() => { document.body.classList.remove("solo-on"); stop(); closeWin(); window.removeEventListener("resize", fit); });
  ctx.onAfterRender(() => { paint(); window.addEventListener("resize", fit); });
  return `<div class="solo" id="mjRoot"></div>`;
}
function stop() { if (tick) clearInterval(tick); tick = null; }
const secs = () => (g && g.start ? Math.floor(((g.end || Date.now()) - g.start) / 1000) : 0);
function startTick() { if (tick || !g.start || g.end) return; tick = setInterval(() => { const t = $("#mjTime"); if (!t) return stop(); t.textContent = fmtTime(secs()); }, 1000); }

function newGame() {
  stop(); closeWin();
  const tiles = layout(), pairs = [];
  for (const k of TYPES) pairs.push(k, k);
  deal(tiles, pairs);
  g = { tiles, sel: null, hist: [], start: 0, end: 0, hint: null, shuffles: 0 };
}
const live = () => g.tiles.filter((t) => !t.gone);
function moves() {
  const L = live(), free = L.filter((t) => isFree(t, L)), seen = new Map();
  for (const t of free) { if (seen.has(t.k)) return [seen.get(t.k), t]; seen.set(t.k, t); }
  return null;
}
function paint() {
  const root = $("#mjRoot"); if (!root) return;
  if (!g) newGame();
  const best = getRecord("mahjong", "piramide");
  root.innerHTML = `<a class="imp-back" href="#/juegos">${icon("left")} Juegos</a>
    <header class="solo-head"><h1>Mahjong</h1><p>Junta parejas iguales que estén libres: nada encima y un lado despejado.</p></header>
    <div class="solo-bar"><span>Quedan <b id="mjLeft"></b></span><span>Tiempo <b id="mjTime">${fmtTime(secs())}</b></span>${best != null ? `<span>Récord <b>${fmtTime(best)}</b></span>` : ""}</div>
    <div class="solo-tools">
      <button class="btn btn-soft btn-sm" data-action="mjUndo">Deshacer</button>
      <button class="btn btn-soft btn-sm" data-action="mjHint">Pista</button>
      <button class="btn btn-soft btn-sm" data-action="mjShuffle">Revolver</button>
      <button class="btn btn-ghost btn-sm" data-action="mjNew">Nuevo</button></div>
    <div class="mj-wrap"><div class="mj-board" id="mjBoard"></div></div>
    <p class="xs muted solo-note" id="mjMsg"></p>`;
  board(); startTick();
}
let TW = 50, TH = 62;
function fit() {
  const wrap = $(".mj-wrap"); if (!wrap) return;
  const bottom = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--bottom-h")) || 0;
  const w = wrap.clientWidth, h = Math.max(320, window.innerHeight - wrap.getBoundingClientRect().top - window.scrollY - bottom - 40);
  TW = Math.max(34, Math.min(64, Math.floor((w - 12) / 8.4), Math.floor(h / (8.4 * 1.25))));
  TH = Math.round(TW * 1.25);
  board();
}
function board() {
  const b = $("#mjBoard"); if (!b) return;
  if (!b.dataset.fit) { b.dataset.fit = "1"; requestAnimationFrame(fit); }
  const L = live(), D = Math.max(3, Math.round(TW * 0.09));
  b.style.width = `${TW * 8 + D * 4}px`; b.style.height = `${TH * 8 + D * 4}px`;
  const order = L.slice().sort((a, c) => a.z - c.z || a.y - c.y || a.x - c.x);
  b.innerHTML = order.map((t) => {
    const free = isFree(t, L);
    const x = (t.x + 1) * TW + D * (4 - t.z) - D, y = t.y * TH + D * (4 - t.z) - D;
    return `<button class="mj-tile${free ? " free" : ""}${g.sel === t.id ? " sel" : ""}${g.hint && g.hint.includes(t.id) ? " hint" : ""}" style="left:${x}px;top:${y}px;width:${TW}px;height:${TH}px;--d:${D}px;z-index:${t.z * 1000 + Math.round(t.y * 40 + (t.x + 1) * 4) + 10}"
      data-action="mjTap" data-id="${t.id}" aria-label="${stickerName(t.k)}${free ? "" : " (bloqueada)"}"><img src="${stickerSrc(t.k)}" alt="" draggable="false"></button>`;
  }).join("");
  const left = $("#mjLeft"); if (left) left.textContent = L.length;
}
function msg(t) { const m = $("#mjMsg"); if (m) m.textContent = t || ""; }
function tap(id) {
  const t = g.tiles[id], L = live();
  if (!t || t.gone) return;
  if (!isFree(t, L)) { msg("Esa ficha está bloqueada: necesita un lado libre y nada encima."); shake(id); return; }
  if (!g.start) { g.start = Date.now(); startTick(); }
  g.hint = null; msg("");
  if (g.sel === null) { g.sel = id; board(); return; }
  if (g.sel === id) { g.sel = null; board(); return; }
  const s = g.tiles[g.sel];
  if (s.k !== t.k) { g.sel = id; board(); return; }
  s.gone = t.gone = true; g.hist.push([s.id, t.id]); g.sel = null;
  board(); check();
}
function shake(id) { const el = document.querySelector(`.mj-tile[data-id="${id}"]`); if (!el) return; el.classList.remove("no"); void el.offsetWidth; el.classList.add("no"); }
function check() {
  const L = live();
  if (!L.length) {
    g.end = Date.now(); stop();
    const r = record("mahjong", "piramide", secs());
    setTimeout(() => celebrate({ title: "¡Tablero limpio!", sticker: "pj:panda", text: `Tiempo: ${fmtTime(secs())}${r.isNew ? "<br><b>¡Nuevo récord!</b>" : r.first ? "" : `<br>Tu récord: ${fmtTime(r.best)}`}`,
      actions: `<button class="btn btn-primary" data-action="mjNew" data-close>Jugar otra vez</button><a class="btn btn-ghost" href="#/juegos" data-close>Otros juegos</a>` }), 300);
    return;
  }
  if (!moves()) msg("No quedan parejas libres. Toca «Revolver» para reordenar las fichas que quedan.");
}
function reshuffle() {
  const L = live(), ks = L.map((t) => t.k), pairs = [];
  const count = {}; for (const k of ks) count[k] = (count[k] || 0) + 1;
  for (const [k, n] of Object.entries(count)) for (let i = 0; i < n / 2; i++) pairs.push(k);
  if (deal(L, pairs)) { g.shuffles++; g.sel = null; g.hint = null; board(); msg("Fichas revueltas."); }
  else msg("No se pudo revolver. Prueba con «Deshacer».");
}

function registerActions() {
  const A = ctx.actions;
  A.mjTap = (el) => tap(+el.dataset.id);
  A.mjNew = () => { newGame(); paint(); };
  A.mjUndo = () => { const last = g && g.hist.pop(); if (!last) return; for (const id of last) g.tiles[id].gone = false; g.sel = null; g.hint = null; board(); msg(""); };
  A.mjHint = () => { const m = moves(); if (!m) { msg("No quedan parejas libres. Toca «Revolver»."); return; } g.hint = m.map((t) => t.id); board(); };
  A.mjShuffle = () => reshuffle();
}
