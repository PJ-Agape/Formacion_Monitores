// Credenciales para encuentros (tarjetas de solapa o portacredencial).
// No necesita cuenta: el equipo arma la credencial de cada participante (foto, nombre o apodo,
// parroquia y rol), las va sumando a una lista y las imprime todas juntas en hojas tamaño carta,
// a la medida exacta del portacredencial. Fotos y nombres quedan solo en este dispositivo.
import * as E from "./estudio.js";
import { esc, icon, toast } from "./util.js";

let ctx = null; // { actions, onAfterRender }
export function setup(c) { ctx = c; registerActions(); }
const $ = (s, r = document) => r.querySelector(s);
const C = E.C;

// Tamaños (mm) y su equivalente a 300 ppp.
export const SIZES = {
  cr80: { l: "Tarjeta (5,4 × 8,6 cm)", d: "Como una credencial o carnet. Caben 9 por hoja.", w: 54, h: 85.6, cols: 3, rows: 3 },
  grande: { l: "Portacredencial grande (9 × 13 cm)", d: "Para fundas grandes de lanyard. Caben 4 por hoja.", w: 90, h: 130, cols: 2, rows: 2 },
};
const PX = 300 / 25.4;
const ROLES = {
  participante: { l: "Participante", bg: C.sky, ink: C.navy },
  animador: { l: "Animador", bg: C.sun, ink: C.navy },
  equipo: { l: "Equipo", bg: C.coral, ink: C.white },
  asesor: { l: "Asesor", bg: C.navy, ink: C.sun },
  invitado: { l: "Invitado", bg: C.white, ink: C.navy },
};
const THEMES = { navy: ["Azul noche", C.navy], blue: ["Azul", C.blue], coral: ["Naranja", C.coral], sun: ["Dorado", C.sun] };

// ---------------------------------------------------------------------------
// Datos (solo en este dispositivo)
// ---------------------------------------------------------------------------
const KEY = "agape_credenciales_v1";
const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || "null") || {}; } catch { return {}; } };
const saved = load();
const ev = { title: "Encuentro Ágape", sub: "", theme: "navy", size: "cr80", fill: false, ...(saved.ev || {}) };
let list = Array.isArray(saved.list) ? saved.list : [];
const blank = () => ({ id: "", name: "", parish: "", role: "participante", photo: "", zoom: 1, dx: 0, dy: 0 });
let cur = blank();
const imgCache = new Map();
function persist() {
  try { localStorage.setItem(KEY, JSON.stringify({ ev, list })); return true; }
  catch { toast("No queda espacio en este dispositivo para más fotos. Imprime y borra la lista para seguir.", ""); return false; }
}
const photoImg = (src) => {
  if (!src) return Promise.resolve(null);
  if (imgCache.has(src)) return imgCache.get(src);
  const p = new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; });
  imgCache.set(src, p); return p;
};
// La foto se achica (máx. 640 px) antes de guardarla.
async function readPhoto(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = url; });
    const k = Math.min(1, 640 / Math.max(img.width, img.height));
    const cv = document.createElement("canvas"); cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
    cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
    return cv.toDataURL("image/jpeg", 0.82);
  } finally { URL.revokeObjectURL(url); }
}

// ---------------------------------------------------------------------------
// Dibujo de la credencial
// ---------------------------------------------------------------------------
function fitText(c, text, maxW, size, min, weight = 800, family = "Bricolage") {
  let s = size; c.font = `${weight} ${s}px ${family}`;
  while (c.measureText(text).width > maxW && s > min) { s -= 2; c.font = `${weight} ${s}px ${family}`; }
  return s;
}
function wrap2(c, text, maxW) {
  const words = String(text || "").split(/\s+/).filter(Boolean), lines = [];
  let line = "";
  for (const w of words) { const t = line ? line + " " + w : w; if (c.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }
  if (line) lines.push(line);
  if (lines.length > 2) { lines[1] = lines.slice(1).join(" "); while (c.measureText(lines[1] + "…").width > maxW && lines[1].length > 1) lines[1] = lines[1].slice(0, -1); lines.length = 2; lines[1] += "…"; }
  return lines;
}
export function draw(c, p, photo, e = ev) {
  const S = SIZES[e.size] || SIZES.cr80, W = Math.round(S.w * PX), H = Math.round(S.h * PX), u = W / 100;
  c.canvas.width = W; c.canvas.height = H;
  const theme = (THEMES[e.theme] || THEMES.navy)[1], onTheme = theme === C.sun ? C.navy : C.white, accent = theme === C.sun ? C.coral : C.sun;
  const role = ROLES[p.role] || ROLES.participante;
  // fondo
  c.fillStyle = C.cream; c.fillRect(0, 0, W, H);
  // banda superior con el logo y el encuentro
  const bandH = H * 0.25;
  c.fillStyle = theme; c.beginPath(); c.moveTo(0, 0); c.lineTo(W, 0); c.lineTo(W, bandH - 6 * u); c.quadraticCurveTo(W / 2, bandH + 6 * u, 0, bandH - 6 * u); c.closePath(); c.fill();
  E.blob(c, W * 0.95, bandH * 0.12, 13 * u, accent);
  const ls = 21 * u;
  c.save(); c.beginPath(); c.arc(7 * u + ls / 2, 6 * u + ls / 2, ls / 2 + 1.4 * u, 0, Math.PI * 2); c.fillStyle = C.cream; c.fill(); c.restore();
  E.logo(c, 7 * u, 6 * u, ls);
  const tx = 7 * u + ls + 4 * u, tw = W - tx - 6 * u;
  c.fillStyle = onTheme; c.textBaseline = "alphabetic";
  const title = e.title || "Encuentro Ágape";
  let ts = 8.4 * u; c.font = `800 ${ts}px Bricolage`;
  let tl = wrap2(c, title, tw);
  while (tl.some((l) => c.measureText(l).width > tw) && ts > 4.6 * u) { ts -= u * 0.3; c.font = `800 ${ts}px Bricolage`; tl = wrap2(c, title, tw); }
  const ty0 = tl.length > 1 ? 13.5 * u : 17 * u;
  tl.forEach((l, k) => c.fillText(l, tx, ty0 + k * ts * 1.02));
  if (e.sub) { c.font = `700 ${4.4 * u}px Jakarta`; c.fillStyle = theme === C.sun ? C.navy : C.sky; fitText(c, e.sub, tw, 4.4 * u, 3 * u, 700, "Jakarta"); c.fillText(e.sub, tx, ty0 + tl.length * ts * 1.02 + 0.6 * u); }
  // medidas: primero el texto de abajo, la foto ocupa lo que queda
  const bandB = H * 0.11, by = H - bandB, name = p.blank ? "" : (p.name || "Tu nombre").trim();
  const ns = fitText(c, name, W * 0.88, 13 * u, 6 * u);
  c.font = `700 ${4.8 * u}px Jakarta`;
  const pl = p.parish ? wrap2(c, p.parish, W * 0.86) : [];
  const textH = ns * 0.95 + (pl.length ? 6.5 * u + pl.length * 5.6 * u : 0);
  const top = bandH - 2 * u, room = by - top - textH - 9 * u;
  const ps = Math.min(W * 0.62, room), px = (W - ps) / 2, py = top;
  // foto
  E.rr(c, px + 2.4 * u, py + 2.4 * u, ps, ps, 7 * u); c.fillStyle = accent; c.fill();
  c.save(); E.rr(c, px, py, ps, ps, 7 * u); c.clip();
  c.fillStyle = C.white; c.fillRect(px, py, ps, ps);
  if (photo) {
    const iw = photo.naturalWidth || photo.width, ih = photo.naturalHeight || photo.height;
    const k = Math.max(ps / iw, ps / ih) * (p.zoom || 1), w = iw * k, h = ih * k;
    c.drawImage(photo, px + (ps - w) / 2 + (p.dx || 0) * ps * 0.5, py + (ps - h) / 2 + (p.dy || 0) * ps * 0.5, w, h);
  } else {
    // silueta de ejemplo
    c.fillStyle = C.ice; c.fillRect(px, py, ps, ps); c.fillStyle = C.sky;
    c.beginPath(); c.arc(W / 2, py + ps * 0.4, ps * 0.17, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(W / 2, py + ps * 0.98, ps * 0.32, ps * 0.33, 0, Math.PI, 0); c.fill();
  }
  c.restore();
  c.lineWidth = 1.3 * u; c.strokeStyle = C.navy; E.rr(c, px, py, ps, ps, 7 * u); c.stroke();
  // nombre o apodo y parroquia, centrados en el espacio que queda
  const free = by - (py + ps + 2.4 * u), y0 = py + ps + 2.4 * u + (free - textH) / 2;
  c.fillStyle = C.navy; c.textAlign = "center"; c.font = `800 ${ns}px Bricolage`;
  if (p.blank) { c.fillRect(W * 0.14, y0 + ns * 0.85, W * 0.72, 0.5 * u); c.font = `700 ${3.4 * u}px Jakarta`; c.fillStyle = C.coral; c.fillText("ESCRIBE TU NOMBRE", W / 2, y0 + ns * 0.85 + 5 * u); }
  else c.fillText(name, W / 2, y0 + ns * 0.78);
  if (pl.length) {
    c.font = `800 ${3.4 * u}px Jakarta`; c.fillStyle = C.coral;
    c.fillText("PARROQUIA".split("").join(String.fromCharCode(8202)), W / 2, y0 + ns * 0.95 + 4 * u);
    c.font = `700 ${4.8 * u}px Jakarta`; c.fillStyle = C.navy;
    pl.forEach((l, k) => c.fillText(l, W / 2, y0 + ns * 0.95 + 9.6 * u + k * 5.6 * u));
  }
  // banda del rol
  c.fillStyle = role.bg; c.fillRect(0, by, W, bandB);
  c.fillStyle = C.navy; c.fillRect(0, by, W, 0.9 * u);
  c.fillStyle = role.ink; c.font = `800 ${6.2 * u}px Bricolage`;
  c.fillText(role.l.toUpperCase(), W / 2, by + bandB / 2 + 2.2 * u);
  c.textAlign = "left";
  // borde fino para recortar
  c.lineWidth = 0.5 * u; c.strokeStyle = "rgba(11,37,102,.35)"; c.strokeRect(0, 0, W, H);
}

// ---------------------------------------------------------------------------
// Vista
// ---------------------------------------------------------------------------
export function view() {
  ctx.onAfterRender(async () => { await E.ready(); paint(); paintList(); });
  return `<header class="page-head"><span class="eyebrow">Para encuentros</span><h1>Credenciales</h1>
      <p>Tarjetas de solapa o portacredencial con foto, nombre y parroquia. Arma la de cada participante, súmala a la lista y al final imprímelas todas juntas.</p></header>
    <div class="dif-grid cred-grid">
      <div class="dif-prev cred-prev"><canvas id="credCanvas" aria-label="Vista previa de la credencial"></canvas></div>
      <div class="stack" style="--gap:14px">
        <form class="card stack" id="credEv" onsubmit="return false" style="--gap:10px">
          <h2 class="cred-h">El encuentro</h2>
          <div class="field"><label>Nombre del encuentro</label><input class="input" data-ev="title" maxlength="50" value="${esc(ev.title)}" placeholder="Ej: Retiro de Primavera"></div>
          <div class="field"><label>Fecha o lugar (opcional)</label><input class="input" data-ev="sub" maxlength="50" value="${esc(ev.sub)}" placeholder="Ej: 25 de octubre · Yungay"></div>
          <div class="ag-form-row">
            <div class="field"><label>Color</label><select class="select" data-ev="theme">${Object.entries(THEMES).map(([k, [l]]) => `<option value="${k}" ${ev.theme === k ? "selected" : ""}>${l}</option>`).join("")}</select></div>
            <div class="field"><label>Tamaño</label><select class="select" data-ev="size">${Object.entries(SIZES).map(([k, s]) => `<option value="${k}" ${ev.size === k ? "selected" : ""}>${s.l}</option>`).join("")}</select></div>
          </div>
          <span class="xs muted" id="credSizeHint">${esc(SIZES[ev.size].d)}</span>
        </form>
        <form class="card stack" id="credForm" onsubmit="return false" style="--gap:10px">
          <h2 class="cred-h" id="credFormH">${cur.id ? "Editar credencial" : "Nueva credencial"}</h2>
          <label class="btn btn-soft dif-file">${icon("ul")} <span id="credPhotoL">${cur.photo ? "Cambiar foto" : "Elegir foto"}</span><input type="file" accept="image/*" id="credPhoto" class="sr-only"></label>
          <div id="credAdj" class="stack" style="--gap:8px" ${cur.photo ? "" : "hidden"}>
            <div class="field"><label>Acercar</label><input type="range" min="1" max="3" step="0.02" value="${cur.zoom}" data-cp="zoom"></div>
            <div class="field"><label>Mover</label><div class="row" style="gap:10px"><input type="range" min="-1" max="1" step="0.01" value="${cur.dx}" data-cp="dx" aria-label="Mover a los lados"><input type="range" min="-1" max="1" step="0.01" value="${cur.dy}" data-cp="dy" aria-label="Mover arriba o abajo"></div></div>
          </div>
          <div class="field"><label>Nombre o apodo</label><input class="input" data-cp="name" maxlength="28" value="${esc(cur.name)}" placeholder="Ej: Coni"></div>
          <div class="field"><label>Parroquia de origen</label><input class="input" data-cp="parish" maxlength="70" value="${esc(cur.parish)}" placeholder="Ej: San Miguel de Yungay"></div>
          <div class="field"><label>Rol</label><select class="select" data-cp="role">${Object.entries(ROLES).map(([k, r]) => `<option value="${k}" ${cur.role === k ? "selected" : ""}>${r.l}</option>`).join("")}</select></div>
          <div class="row-wrap" style="gap:8px">
            <button type="button" class="btn btn-primary" data-action="credAdd">${icon("plus")} <span id="credAddL">${cur.id ? "Guardar cambios" : "Agregar a la lista"}</span></button>
            <button type="button" class="btn btn-ghost" data-action="credPng">${icon("dl")} Descargar esta</button>
            <button type="button" class="btn btn-ghost" data-action="credNew" id="credNewB" ${cur.id ? "" : "hidden"}>Nueva</button>
          </div>
          <p class="xs muted">Las fotos y los nombres quedan solo en este dispositivo: no se suben a internet. Si son menores de edad, pide permiso a sus papás para usar su foto.</p>
        </form>
        <section class="card stack" style="--gap:10px">
          <div class="row-wrap" style="gap:8px;align-items:center"><h2 class="cred-h" style="flex:1">Lista para imprimir <small class="muted" id="credCount"></small></h2>
            <button type="button" class="btn btn-gold btn-sm" data-action="credPrint">${icon("print")} Imprimir todas</button></div>
          <div class="field"><label>En cada hoja carta</label><div class="seg" role="radiogroup" aria-label="Cuántas por hoja">${Object.entries(SIZES).map(([k, z]) => `<label><input type="radio" name="credPer" value="${k}" ${ev.size === k ? "checked" : ""}><span>${z.cols * z.rows} por hoja · ${z.l.match(/\(([^)]+)\)/)[1]}</span></label>`).join("")}</div></div>
          <label class="row" style="gap:8px"><input type="checkbox" id="credFill" ${ev.fill ? "checked" : ""}> Completar la última hoja con credenciales en blanco (para quienes lleguen sin inscribirse)</label>
          <p class="small cred-sum" id="credSum"></p>
          <div id="credList" class="cred-list"></div>
          <button type="button" class="btn btn-ghost btn-sm" data-action="credClear" style="justify-self:start">${icon("trash")} Borrar la lista</button>
        </section>
      </div>
    </div>`;
}
let painting = 0;
async function paint() {
  const cv = $("#credCanvas"); if (!cv) return;
  const id = ++painting, img = await photoImg(cur.photo); if (id !== painting) return;
  draw(cv.getContext("2d"), cur, img);
}
async function paintList() {
  const box = $("#credList"); if (!box) return;
  $("#credCount").textContent = list.length ? `· ${list.length}` : "";
  const sum = $("#credSum");
  if (sum) { const z = SIZES[ev.size], per = z.cols * z.rows, pages = Math.ceil(list.length / per), free = pages * per - list.length;
    sum.textContent = list.length ? `${list.length} credencial${list.length > 1 ? "es" : ""} → ${pages} hoja${pages > 1 ? "s" : ""} carta${free ? (free > 1 ? ` · quedan ${free} espacios libres${ev.fill ? " (irán en blanco)" : ""}` : ` · queda 1 espacio libre${ev.fill ? " (irá en blanco)" : ""}`) : ""}.` : ""; }
  if (!list.length) { box.innerHTML = `<p class="muted small">Todavía no hay credenciales. Arma una y toca «Agregar a la lista».</p>`; return; }
  box.innerHTML = list.map((p) => `<div class="cred-item${p.id === cur.id ? " on" : ""}"><canvas data-cred="${esc(p.id)}" aria-hidden="true"></canvas>
    <div class="cred-item-t"><b>${esc(p.name || "Sin nombre")}</b><small>${esc(ROLES[p.role]?.l || "")}${p.parish ? " · " + esc(p.parish) : ""}</small></div>
    <button type="button" class="icon-btn" data-action="credEdit" data-id="${esc(p.id)}" aria-label="Editar">${icon("edit")}</button>
    <button type="button" class="icon-btn" data-action="credDel" data-id="${esc(p.id)}" aria-label="Quitar">${icon("x")}</button></div>`).join("");
  for (const p of list) {
    const c = box.querySelector(`[data-cred="${CSS.escape(p.id)}"]`); if (!c) continue;
    const big = document.createElement("canvas"); draw(big.getContext("2d"), p, await photoImg(p.photo));
    c.width = 108; c.height = Math.round(108 * big.height / big.width); c.getContext("2d").drawImage(big, 0, 0, c.width, c.height);
  }
}
const syncForm = () => {
  const h = $("#credFormH"), a = $("#credAddL"), n = $("#credNewB"), l = $("#credPhotoL"), adj = $("#credAdj");
  if (h) h.textContent = cur.id ? "Editar credencial" : "Nueva credencial";
  if (a) a.textContent = cur.id ? "Guardar cambios" : "Agregar a la lista";
  if (n) n.hidden = !cur.id; if (l) l.textContent = cur.photo ? "Cambiar foto" : "Elegir foto"; if (adj) adj.hidden = !cur.photo;
  document.querySelectorAll("#credForm [data-cp]").forEach((x) => { x.value = cur[x.dataset.cp] ?? ""; });
};

// ---------------------------------------------------------------------------
// Imprimir: hojas tamaño carta con las credenciales a su medida real
// ---------------------------------------------------------------------------
async function printAll(items) {
  const S = SIZES[ev.size] || SIZES.cr80, per = S.cols * S.rows;
  const all = [...items];
  const free = (per - (all.length % per)) % per;
  if (ev.fill) for (let k = 0; k < free; k++) all.push({ ...blank(), blank: true, role: "participante" });
  toast("Preparando las credenciales…");
  const imgs = [];
  for (const p of all) { const cv = document.createElement("canvas"); draw(cv.getContext("2d"), p, await photoImg(p.photo)); imgs.push(cv.toDataURL("image/png")); await new Promise((r) => setTimeout(r)); }
  const pages = [];
  for (let k = 0; k < imgs.length; k += per) pages.push(imgs.slice(k, k + per));
  const fr = document.createElement("iframe");
  fr.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  document.body.appendChild(fr);
  const d = fr.contentDocument;
  d.open();
  // Sin separación entre tarjetas: los cortes se comparten y basta una línea por fila y columna.
  d.write(`<!doctype html><html><head><meta charset="utf-8"><title>Credenciales · ${esc(ev.title)}</title><style>
    @page { size: letter; margin: 8mm; }
    html, body { margin: 0; padding: 0; }
    .page { display: grid; grid-template-columns: repeat(${S.cols}, ${S.w}mm); grid-auto-rows: ${S.h}mm; justify-content: center; align-content: start; break-after: page; }
    .page:last-child { break-after: auto; }
    img { width: ${S.w}mm; height: ${S.h}mm; display: block; outline: .15mm dashed #9aa6bf; outline-offset: -.075mm; }
  </style></head><body>${pages.map((pg) => `<div class="page">${pg.map((src) => `<img src="${src}" alt="">`).join("")}</div>`).join("")}</body></html>`);
  d.close();
  await Promise.all([...d.images].map((im) => (im.complete ? 0 : new Promise((ok) => { im.onload = im.onerror = ok; }))));
  fr.contentWindow.focus(); fr.contentWindow.print();
  setTimeout(() => fr.remove(), 60000);
}

function registerActions() {
  const A = ctx.actions;
  A.credAdd = () => {
    if (!cur.name.trim()) { toast("Escribe el nombre o apodo", ""); $("[data-cp=name]")?.focus(); return; }
    const isNew = !cur.id; if (isNew) cur.id = "c" + Date.now().toString(36);
    const prev = list; list = isNew ? [...list, { ...cur }] : list.map((x) => (x.id === cur.id ? { ...cur } : x));
    if (!persist()) { list = prev; if (isNew) cur.id = ""; return; }
    toast(isNew ? `Listo: ${cur.name} ya está en la lista` : "Credencial actualizada");
    // lista para la siguiente persona: se mantiene la parroquia y el rol
    cur = { ...blank(), parish: cur.parish, role: cur.role };
    const f = $("#credPhoto"); if (f) f.value = "";
    syncForm(); paint(); paintList(); $("[data-cp=name]")?.focus();
  };
  A.credNew = () => { cur = blank(); syncForm(); paint(); paintList(); };
  A.credEdit = (el) => { const p = list.find((x) => x.id === el.dataset.id); if (!p) return; cur = { ...p }; syncForm(); paint(); paintList(); $("#credForm")?.scrollIntoView({ behavior: "smooth", block: "start" }); };
  A.credDel = (el) => { list = list.filter((x) => x.id !== el.dataset.id); if (cur.id === el.dataset.id) cur = blank(); persist(); syncForm(); paint(); paintList(); };
  A.credClear = () => { if (!list.length || !confirm("¿Borrar todas las credenciales de la lista? (Las fotos se borran de este dispositivo.)")) return; list = []; cur = blank(); persist(); syncForm(); paint(); paintList(); toast("Lista borrada"); };
  A.credPng = async () => {
    const cv = document.createElement("canvas"); draw(cv.getContext("2d"), cur, await photoImg(cur.photo));
    cv.toBlob((b) => { const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = `credencial-${(cur.name || "agape").toLowerCase().replace(/[^a-z0-9ñáéíóú]+/gi, "-")}.png`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }, "image/png");
  };
  A.credPrint = () => {
    if (!list.length) { toast(cur.name ? "Primero toca «Agregar a la lista»" : "La lista está vacía", ""); return; }
    printAll(list).catch((e) => { console.warn(e); toast("No se pudo preparar la impresión", ""); });
  };
  document.addEventListener("input", (e) => {
    const t = e.target;
    if (t.dataset && t.dataset.cp) { const k = t.dataset.cp; cur[k] = ["zoom", "dx", "dy"].includes(k) ? +t.value : t.value; paint(); }
    if (t.dataset && t.dataset.ev && t.tagName === "INPUT") { ev[t.dataset.ev] = t.value; persist(); paint(); }
  });
  document.addEventListener("change", async (e) => {
    const t = e.target;
    if (t.name === "credPer") { ev.size = t.value; persist(); const sel = $("[data-ev=size]"); if (sel) sel.value = ev.size; const h = $("#credSizeHint"); if (h) h.textContent = SIZES[ev.size].d; paint(); paintList(); return; }
    if (t.id === "credFill") { ev.fill = t.checked; persist(); paintList(); return; }
    if (t.dataset && t.dataset.ev && t.tagName === "SELECT") { ev[t.dataset.ev] = t.value; persist(); document.querySelectorAll("input[name=credPer]").forEach((r) => { r.checked = r.value === ev.size; }); const h = $("#credSizeHint"); if (h) h.textContent = SIZES[ev.size].d; paint(); paintList(); }
    if (t.dataset && t.dataset.cp === "role") { cur.role = t.value; paint(); }
    if (t.id === "credPhoto" && t.files[0]) {
      try { cur.photo = await readPhoto(t.files[0]); cur.zoom = 1; cur.dx = cur.dy = 0; syncForm(); paint(); }
      catch { toast("No pude abrir esa imagen. Prueba con una foto JPG o PNG.", ""); }
    }
  });
}
