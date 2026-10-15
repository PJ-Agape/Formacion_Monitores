// Crucigrama con palabras de la fe y de la comunidad. Cada partida arma una grilla nueva.
// Se escribe con el teclado de la pantalla (o el del computador).
import { esc, icon, toast } from "./util.js";
import { CRUCI, norm } from "./palabras.js";
import { celebrate, closeWin, record, getRecord, fmtTime, shuffle, rnd, POPS } from "./stickers-img.js";

let ctx = null; // { actions, onAfterRender, onLeave }
export function setup(c) { ctx = c; registerActions(); }
const $ = (s, r = document) => r.querySelector(s);

export const LEVELS = { facil: { l: "Fácil", n: 6 }, medio: { l: "Medio", n: 9 }, dificil: { l: "Difícil", n: 12 } };
const MAXW = 12, MAXH = 12;
let cfg = { level: "medio" };
try { cfg = { ...cfg, ...(JSON.parse(localStorage.getItem("agape_cruci") || "{}") || {}) }; } catch { /* */ }
if (!LEVELS[cfg.level]) cfg.level = "medio";
let g = null, tick = null;

export const artSvg = () => `<svg viewBox="0 0 64 64" width="100%" height="100%"><g stroke="#0b2566" stroke-width="2.2">
  <rect x="8" y="22" width="12" height="12" fill="#fff"/><rect x="20" y="22" width="12" height="12" fill="#ffba03"/><rect x="32" y="22" width="12" height="12" fill="#fff"/><rect x="44" y="22" width="12" height="12" fill="#fff"/>
  <rect x="20" y="10" width="12" height="12" fill="#fff"/><rect x="20" y="34" width="12" height="12" fill="#fff"/><rect x="20" y="46" width="12" height="12" fill="#fff"/><rect x="44" y="34" width="12" height="12" fill="#fff"/></g>
  <g font-family="sans-serif" font-weight="800" font-size="9" fill="#0b2566" text-anchor="middle"><text x="26" y="31">A</text><text x="14" y="31">P</text><text x="38" y="31">Z</text><text x="26" y="43">M</text></g></svg>`;

// ---------------------------------------------------------------------------
// Armado de la grilla
// ---------------------------------------------------------------------------
function attempt(pool, want) {
  const cells = new Map(), placed = [];
  const at = (x, y) => cells.get(x + "," + y);
  let minX = 0, maxX = 0, minY = 0, maxY = 0;
  const fits = (u, x, y, d) => {
    const dx = d === "a" ? 1 : 0, dy = 1 - dx;
    if (at(x - dx, y - dy) || at(x + dx * u.length, y + dy * u.length)) return -1;
    let cross = 0;
    for (let i = 0; i < u.length; i++) {
      const cx = x + dx * i, cy = y + dy * i, c = at(cx, cy);
      if (c) { if (c.l !== u[i] || c[d] !== undefined) return -1; cross++; }
      else if (at(cx + dy, cy + dx) || at(cx - dy, cy - dx)) return -1;
    }
    const nx0 = Math.min(minX, x), nx1 = Math.max(maxX, x + dx * (u.length - 1)), ny0 = Math.min(minY, y), ny1 = Math.max(maxY, y + dy * (u.length - 1));
    if (nx1 - nx0 + 1 > MAXW || ny1 - ny0 + 1 > MAXH) return -1;
    return cross;
  };
  const put = (w, x, y, d) => {
    const dx = d === "a" ? 1 : 0, dy = 1 - dx;
    for (let i = 0; i < w.u.length; i++) {
      const k = (x + dx * i) + "," + (y + dy * i), c = cells.get(k) || { l: w.u[i] };
      c[d] = placed.length; cells.set(k, c);
    }
    placed.push({ ...w, x, y, d });
    minX = Math.min(minX, x); maxX = Math.max(maxX, x + dx * (w.u.length - 1)); minY = Math.min(minY, y); maxY = Math.max(maxY, y + dy * (w.u.length - 1));
  };
  const first = pool.find((w) => w.u.length >= 5 && w.u.length <= 9) || pool[0];
  put(first, 0, 0, "a");
  for (const w of pool) {
    if (placed.length >= want) break;
    if (placed.some((p) => p.u === w.u)) continue;
    let best = null;
    for (const [k, c] of cells) {
      const [cx, cy] = k.split(",").map(Number);
      for (let i = 0; i < w.u.length; i++) {
        if (w.u[i] !== c.l) continue;
        for (const d of ["a", "d"]) {
          if (c[d] !== undefined) continue;
          const x = d === "a" ? cx - i : cx, y = d === "a" ? cy : cy - i, s = fits(w.u, x, y, d);
          if (s > 0 && (!best || s > best.s || (s === best.s && rnd(2)))) best = { x, y, d, s };
        }
      }
    }
    if (best) put(w, best.x, best.y, best.d);
  }
  return { placed, w: maxX - minX + 1, h: maxY - minY + 1, minX, minY };
}
function build() {
  const want = LEVELS[cfg.level].n;
  let best = null;
  for (let t = 0; t < 30; t++) {
    const pool = shuffle(CRUCI.map(([w, clue]) => ({ w, u: norm(w), clue })).filter((x) => x.u.length >= 3 && x.u.length <= MAXW));
    const r = attempt(pool, want);
    if (!best || r.placed.length > best.placed.length || (r.placed.length === best.placed.length && r.w * r.h < best.w * best.h)) best = r;
    if (best.placed.length >= want && best.w * best.h <= want * 14) break;
  }
  // normaliza coordenadas y numera
  const words = best.placed.map((p) => ({ ...p, x: p.x - best.minX, y: p.y - best.minY }));
  const starts = [...new Set(words.map((p) => p.y * 100 + p.x))].sort((a, b) => a - b);
  for (const p of words) p.num = starts.indexOf(p.y * 100 + p.x) + 1;
  const grid = Array.from({ length: best.h }, () => Array(best.w).fill(null));
  words.forEach((p, i) => {
    const dx = p.d === "a" ? 1 : 0, dy = 1 - dx;
    for (let k = 0; k < p.u.length; k++) {
      const x = p.x + dx * k, y = p.y + dy * k;
      const c = grid[y][x] || (grid[y][x] = { l: p.u[k], v: "", w: {} });
      c.w[p.d] = i;
    }
  });
  for (const p of words) grid[p.y][p.x].num = p.num;
  return { words, grid, W: best.w, H: best.h };
}

// ---------------------------------------------------------------------------
// Vista
// ---------------------------------------------------------------------------
export function view() {
  ctx.onAfterRender(() => document.body.classList.add("solo-on"));
  ctx.onLeave(() => { document.body.classList.remove("solo-on"); stop(); closeWin(); document.removeEventListener("keydown", onKey); });
  ctx.onAfterRender(() => { paint(); document.addEventListener("keydown", onKey); });
  return `<div class="solo" id="cwRoot"></div>`;
}
function stop() { if (tick) clearInterval(tick); tick = null; }
const secs = () => (g && g.start ? Math.floor(((g.end || Date.now()) - g.start) / 1000) : 0);
function startTick() { if (tick || !g.start || g.end) return; tick = setInterval(() => { const t = $("#cwTime"); if (!t) return stop(); t.textContent = fmtTime(secs()); }, 1000); }
function newGame() {
  stop(); closeWin();
  g = { ...build(), cur: 0, pos: 0, start: 0, end: 0, hints: 0, checked: false };
}
function paint() {
  const root = $("#cwRoot"); if (!root) return;
  if (!g) newGame();
  const best = getRecord("cruci", cfg.level);
  const across = g.words.map((w, i) => [w, i]).filter(([w]) => w.d === "a").sort((a, b) => a[0].num - b[0].num);
  const down = g.words.map((w, i) => [w, i]).filter(([w]) => w.d === "d").sort((a, b) => a[0].num - b[0].num);
  const clue = ([w, i]) => `<li data-action="cwPick" data-i="${i}" class="${i === g.cur ? "on" : ""}${solved(w) ? " ok" : ""}"><b>${w.num}</b> ${esc(w.clue)} <small>(${w.u.length})</small></li>`;
  root.innerHTML = `<a class="imp-back" href="#/juegos">${icon("left")} Juegos</a>
    <header class="solo-head"><h1>Crucigrama</h1><p>Toca una casilla o una pista y escribe la palabra. Sin tildes: la grilla las ignora.</p></header>
    <div class="solo-opts"><div class="solo-seg" role="group" aria-label="Nivel">${Object.entries(LEVELS).map(([k, s]) => `<button class="${cfg.level === k ? "on" : ""}" data-action="cwLevel" data-k="${k}">${esc(s.l)}</button>`).join("")}</div></div>
    <div class="solo-bar"><span>Palabras <b id="cwDone"></b></span><span>Tiempo <b id="cwTime">${fmtTime(secs())}</b></span>${best != null ? `<span>Récord <b>${fmtTime(best)}</b></span>` : ""}
      <button class="btn btn-ghost btn-sm" data-action="cwNew">${icon("undo")} Nuevo</button></div>
    <div class="cw-wrap"><div class="cw-grid" id="cwGrid" style="--w:${g.W};--h:${g.H}"></div></div>
    <div class="cw-dock">
      <div class="cw-clue" id="cwClue"></div>
      <div class="cw-kb" id="cwKb">${["QWERTYUIOP", "ASDFGHJKLÑ", "ZXCVBNM"].map((r, i) => `<div>${r.split("").map((c) => `<button data-action="cwKey" data-k="${c}">${c}</button>`).join("")}${i === 2 ? `<button class="wide" data-action="cwKey" data-k="BS" aria-label="Borrar">⌫</button>` : ""}</div>`).join("")}</div>
      <div class="solo-tools"><button class="btn btn-soft btn-sm" data-action="cwCheck">${icon("check")} Revisar</button><button class="btn btn-soft btn-sm" data-action="cwHint">${icon("sparkle")} Pista: una letra</button></div>
    </div>
    <div class="cw-clues"><section><h2>Horizontales</h2><ol>${across.map(clue).join("")}</ol></section><section><h2>Verticales</h2><ol>${down.map(clue).join("")}</ol></section></div>`;
  grid(); startTick();
}
const cellsOf = (w) => Array.from({ length: w.u.length }, (_, k) => [w.x + (w.d === "a" ? k : 0), w.y + (w.d === "d" ? k : 0)]);
const solved = (w) => cellsOf(w).every(([x, y]) => g.grid[y][x].v === g.grid[y][x].l);
function grid() {
  const el = $("#cwGrid"); if (!el) return;
  const w = g.words[g.cur], cur = cellsOf(w), [px, py] = cur[g.pos] || cur[0];
  const inCur = new Set(cur.map(([x, y]) => x + "," + y));
  let h = "";
  for (let y = 0; y < g.H; y++) for (let x = 0; x < g.W; x++) {
    const c = g.grid[y][x];
    if (!c) { h += `<span class="cw-x"></span>`; continue; }
    const bad = g.checked && c.v && c.v !== c.l;
    h += `<button class="cw-c${inCur.has(x + "," + y) ? " in" : ""}${x === px && y === py ? " at" : ""}${bad ? " bad" : ""}${c.hint ? " hint" : ""}" data-action="cwCell" data-x="${x}" data-y="${y}" aria-label="Casilla">${c.num ? `<i>${c.num}</i>` : ""}${c.v || ""}</button>`;
  }
  el.innerHTML = h;
  const cl = $("#cwClue"); if (cl) cl.innerHTML = `<b>${w.num} ${w.d === "a" ? "horizontal" : "vertical"}</b> ${esc(w.clue)}`;
  document.querySelectorAll(".cw-clues li").forEach((li) => { const i = +li.dataset.i; li.classList.toggle("on", i === g.cur); li.classList.toggle("ok", solved(g.words[i])); });
  const d = $("#cwDone"); if (d) d.textContent = `${g.words.filter(solved).length}/${g.words.length}`;
}
function pickCell(x, y) {
  const c = g.grid[y][x]; if (!c) return;
  const w = g.words[g.cur], here = cellsOf(w).findIndex(([a, b]) => a === x && b === y);
  if (here >= 0 && here === g.pos && c.w.a !== undefined && c.w.d !== undefined) g.cur = w.d === "a" ? c.w.d : c.w.a;
  else if (here < 0) g.cur = c.w[w.d] !== undefined ? c.w[w.d] : (c.w.a ?? c.w.d);
  g.pos = cellsOf(g.words[g.cur]).findIndex(([a, b]) => a === x && b === y);
  grid();
}
function type(k) {
  if (g.end) return;
  if (!g.start) { g.start = Date.now(); startTick(); }
  const cs = cellsOf(g.words[g.cur]);
  if (k === "BS") {
    const [x, y] = cs[g.pos], c = g.grid[y][x];
    if (c.v && !c.hint) c.v = "";
    else if (g.pos > 0) { g.pos--; const [x2, y2] = cs[g.pos]; if (!g.grid[y2][x2].hint) g.grid[y2][x2].v = ""; }
    g.checked = false; grid(); return;
  }
  const [x, y] = cs[g.pos], c = g.grid[y][x];
  if (!c.hint) c.v = k;
  g.checked = false;
  // siguiente casilla vacía de la palabra; si no hay, la siguiente
  let n = cs.findIndex(([a, b], i) => i > g.pos && !g.grid[b][a].v);
  if (n < 0) n = Math.min(g.pos + 1, cs.length - 1);
  g.pos = n;
  if (solved(g.words[g.cur])) {
    const next = g.words.findIndex((w, i) => i !== g.cur && !solved(w));
    if (next >= 0 && cs.every(([a, b]) => g.grid[b][a].v)) { g.cur = next; g.pos = Math.max(0, cellsOf(g.words[next]).findIndex(([a, b]) => !g.grid[b][a].v)); }
  }
  grid(); checkWin();
}
function checkWin() {
  if (!g.words.every(solved)) return;
  g.end = Date.now(); stop();
  const r = g.hints ? null : record("cruci", cfg.level, secs());
  setTimeout(() => celebrate({ title: "¡Crucigrama completo!", sticker: "pj:buho", pop: POPS[2],
    text: `Tiempo: ${fmtTime(secs())}${g.hints ? ` · ${g.hints} pista${g.hints > 1 ? "s" : ""}` : ""}${r && r.isNew ? "<br><b>¡Nuevo récord!</b>" : r && !r.first ? `<br>Tu récord: ${fmtTime(r.best)}` : ""}`,
    actions: `<button class="btn btn-primary" data-action="cwNew" data-close>Otro crucigrama</button><a class="btn btn-ghost" href="#/juegos" data-close>Otros juegos</a>` }), 400);
}
function onKey(e) {
  if (!$("#cwGrid") || e.ctrlKey || e.metaKey || e.altKey || /input|textarea|select/i.test(e.target.tagName)) return;
  if (e.key === "Backspace") { e.preventDefault(); type("BS"); return; }
  const k = norm(e.key);
  if (k.length === 1 && e.key.length === 1) { e.preventDefault(); type(k); }
}
const saveCfg = () => { try { localStorage.setItem("agape_cruci", JSON.stringify(cfg)); } catch { /* */ } };

function registerActions() {
  const A = ctx.actions;
  A.cwNew = () => { newGame(); paint(); };
  A.cwLevel = (el) => { cfg.level = el.dataset.k; saveCfg(); newGame(); paint(); };
  A.cwCell = (el) => pickCell(+el.dataset.x, +el.dataset.y);
  A.cwPick = (el) => { g.cur = +el.dataset.i; const cs = cellsOf(g.words[g.cur]); g.pos = Math.max(0, cs.findIndex(([a, b]) => !g.grid[b][a].v)); grid(); $("#cwGrid")?.scrollIntoView({ block: "nearest", behavior: "smooth" }); };
  A.cwKey = (el) => type(el.dataset.k);
  A.cwCheck = () => { g.checked = true; grid(); const bad = g.grid.flat().filter((c) => c && c.v && c.v !== c.l).length; toast(bad ? `${bad} letra${bad > 1 ? "s" : ""} por corregir` : "Todo bien hasta ahora"); };
  A.cwHint = () => {
    if (g.end) return;
    const cs = cellsOf(g.words[g.cur]);
    let i = cs.findIndex(([a, b]) => g.grid[b][a].v !== g.grid[b][a].l);
    if (i < 0) return;
    const [x, y] = cs[i], c = g.grid[y][x];
    c.v = c.l; c.hint = true; g.hints++; g.pos = i;
    if (!g.start) { g.start = Date.now(); startTick(); }
    grid(); checkWin();
  };
}
