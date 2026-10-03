// Fondos de pantalla y protectores de pantalla de Ágape (celular y PC), sin textos.
// Se dibujan en canvas con la paleta del logo; los usa la pestaña «Fondos» del Estudio
// de difusión y el exportador del paquete de archivos.

import { C, preload, illCard, card } from "./estudio.js";

export const SIZES = { celular: [1080, 2340, "Celular"], pc: [2560, 1440, "PC"] };
const BASE = new URL("../", import.meta.url).href;
let LOGO = null;
export async function ready() {
  if (!LOGO) LOGO = await new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = BASE + "icons/logo-512.webp"; });
  await preload(MONITOS.map((k) => [k, C.navy, C.cream, C.sun]));
}
const MONITOS = ["corazon", "oracion", "amigos", "biblia", "espiritu", "maria", "juego", "servir", "familia", "luz", "semilla", "escuchar", "camino", "eucaristia", "flores", "comunidad"];

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const pick = (r, a) => a[Math.floor(r() * a.length)];
const TAU = Math.PI * 2;
function grad(ctx, W, H, stops, x0 = 0, y0 = 0, x1 = 0, y1 = H) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1); stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
function glow(ctx, x, y, r, color, a = 1) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, hexA(color, a)); g.addColorStop(1, hexA(color, 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
}
function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }
function heartPath(ctx, x, y, s) {
  // corazón centrado en (x, y), ancho s
  const w = s / 2, h = s * 0.92;
  ctx.beginPath();
  ctx.moveTo(x, y + h * 0.5);
  ctx.bezierCurveTo(x - w * 0.15, y + h * 0.36, x - w, y + h * 0.08, x - w, y - h * 0.2);
  ctx.bezierCurveTo(x - w, y - h * 0.5, x - w * 0.5, y - h * 0.58, x, y - h * 0.3);
  ctx.bezierCurveTo(x + w * 0.5, y - h * 0.58, x + w, y - h * 0.5, x + w, y - h * 0.2);
  ctx.bezierCurveTo(x + w, y + h * 0.08, x + w * 0.15, y + h * 0.36, x, y + h * 0.5);
  ctx.closePath();
}
const heart = (ctx, x, y, s, fill) => { heartPath(ctx, x, y, s); ctx.fillStyle = fill; ctx.fill(); };
function cross(ctx, x, y, s, fill, rot = 0) {
  const t = s * 0.26;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.fillStyle = fill;
  ctx.beginPath(); ctx.roundRect(-t / 2, -s / 2, t, s, t * 0.3); ctx.roundRect(-s * 0.36, -s * 0.22, s * 0.72, t, t * 0.3); ctx.fill(); ctx.restore();
}
function star(ctx, x, y, r, fill, rot = 0, n = 5, inner = 0.45) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.beginPath();
  for (let i = 0; i < n * 2; i++) { const a = (i * Math.PI) / n - Math.PI / 2, rr = i % 2 ? r * inner : r; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.restore();
}
function sparkle(ctx, x, y, r, fill) { star(ctx, x, y, r, fill, 0, 4, 0.28); }
function bird(ctx, x, y, s, color, lw) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = "round"; ctx.beginPath();
  ctx.moveTo(x - s, y - s * 0.15); ctx.quadraticCurveTo(x - s * 0.45, y - s * 0.55, x, y);
  ctx.quadraticCurveTo(x + s * 0.45, y - s * 0.55, x + s, y - s * 0.15); ctx.stroke(); ctx.restore();
}
function cloud(ctx, x, y, s, fill) {
  ctx.fillStyle = fill; ctx.beginPath();
  [[0, 0, 0.5], [0.42, 0.08, 0.38], [-0.45, 0.1, 0.34], [0.15, -0.25, 0.4], [-0.2, -0.18, 0.32]].forEach(([dx, dy, r]) => { ctx.moveTo(x + dx * s + r * s, y + dy * s); ctx.arc(x + dx * s, y + dy * s, r * s, 0, TAU); });
  ctx.fill();
}
function squiggle(ctx, x, y, s, color, lw, rot) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = "round"; ctx.beginPath();
  ctx.moveTo(-s, 0); for (let i = 0; i < 4; i++) ctx.quadraticCurveTo(-s + s * 0.25 + i * s * 0.5, i % 2 ? s * 0.35 : -s * 0.35, -s + (i + 1) * s * 0.5, 0);
  ctx.stroke(); ctx.restore();
}
// Logo en círculo con aro y sombra suave
function logo(ctx, x, y, r, { ring = C.white, rw = 0.06, shadow = C.navy, sa = 0.18, line = 0 } = {}) {
  ctx.save();
  if (shadow) { ctx.shadowColor = hexA(shadow, sa); ctx.shadowBlur = r * 0.25; ctx.shadowOffsetY = r * 0.05; }
  if (ring) { ctx.beginPath(); ctx.arc(x, y, r * (1 + rw), 0, TAU); ctx.fillStyle = ring; ctx.fill(); }
  ctx.restore();
  if (line) { ctx.beginPath(); ctx.arc(x, y, r * (1 + rw) + line / 2, 0, TAU); ctx.strokeStyle = C.navy; ctx.lineWidth = line; ctx.stroke(); }
  if (LOGO) ctx.drawImage(LOGO, x - r, y - r, r * 2, r * 2);
  else { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = C.sky; ctx.fill(); }
}
// Dónde va el logo: en el celular, bajo el reloj de la pantalla bloqueada; en el PC, al centro.
function spot(W, H, { y = 0.6, x = 0.5, ly = 0.5, lx = 0.5, size = 1 } = {}) {
  const port = H > W, m = Math.min(W, H);
  return { port, m, U: m / 1080, x: W * (port ? x : lx), y: H * (port ? y : ly), r: m * (port ? 0.22 : 0.2) * size };
}

// ---------------------------------------------------------------------------
// Los 20 diseños
// ---------------------------------------------------------------------------
const D = {};

D.amanecer = (ctx, W, H) => {
  const p = spot(W, H);
  grad(ctx, W, H, [C.ice, "#fdf4e3", C.butter]);
  ctx.save(); ctx.translate(p.x, p.y);
  for (let i = 0; i < 36; i++) { ctx.rotate(TAU / 36); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.max(W, H) * 1.2, -p.m * 0.035); ctx.lineTo(Math.max(W, H) * 1.2, p.m * 0.035); ctx.closePath(); ctx.fillStyle = hexA(C.sun, i % 2 ? 0.1 : 0.18); ctx.fill(); }
  ctx.restore();
  [2.6, 2.0, 1.55].forEach((k, i) => { ctx.beginPath(); ctx.arc(p.x, p.y, p.r * k, 0, TAU); ctx.fillStyle = hexA(C.sun, 0.12 + i * 0.1); ctx.fill(); });
  logo(ctx, p.x, p.y, p.r, { shadow: C.coral, sa: 0.25 });
};

D.corazon = (ctx, W, H) => {
  const p = spot(W, H), r = rng(2);
  ctx.fillStyle = C.cream; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 70; i++) { const x = r() * W, y = r() * H; if (Math.hypot(x - p.x, y - p.y) < p.r * 3) continue; heart(ctx, x, y, p.m * (0.03 + r() * 0.05), hexA(pick(r, [C.coral, C.sun, C.sky]), 0.35)); }
  heart(ctx, p.x, p.y + p.r * 0.15, p.r * 4.2, C.coral);
  heart(ctx, p.x, p.y + p.r * 0.15, p.r * 3.5, "#f47a45");
  logo(ctx, p.x, p.y, p.r, { line: 0 });
};

D.rayos = (ctx, W, H) => {
  const p = spot(W, H), n = 28, R = Math.hypot(W, H);
  ctx.fillStyle = C.ice; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < n; i += 2) { const a0 = (i / n) * TAU, a1 = ((i + 1) / n) * TAU; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.arc(p.x, p.y, R, a0, a1); ctx.closePath(); ctx.fillStyle = C.sky; ctx.fill(); }
  glow(ctx, p.x, p.y, p.r * 3.2, C.white, 0.9);
  logo(ctx, p.x, p.y, p.r, { line: 8 * p.U });
};

D.confeti = (ctx, W, H) => {
  const p = spot(W, H), r = rng(4), n = Math.round((W * H) / 16000);
  ctx.fillStyle = C.cream; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < n; i++) {
    const x = r() * W, y = r() * H; if (Math.hypot(x - p.x, y - p.y) < p.r * 1.7) continue;
    const s = p.U * (22 + r() * 30), c = pick(r, [C.coral, C.sun, C.sky, C.blue, C.rose]), k = r(), rot = r() * TAU;
    if (k < 0.2) heart(ctx, x, y, s * 1.2, c); else if (k < 0.35) cross(ctx, x, y, s * 1.3, c, rot * 0.2 - 0.3);
    else if (k < 0.55) { ctx.beginPath(); ctx.arc(x, y, s * 0.4, 0, TAU); ctx.fillStyle = c; ctx.fill(); }
    else if (k < 0.7) star(ctx, x, y, s * 0.6, c, rot);
    else if (k < 0.85) squiggle(ctx, x, y, s * 0.8, c, p.U * 7, rot);
    else { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.fillStyle = c; ctx.fillRect(-s * 0.5, -s * 0.18, s, s * 0.36); ctx.restore(); }
  }
  logo(ctx, p.x, p.y, p.r, { line: 8 * p.U });
};

D.olas = (ctx, W, H) => {
  const p = spot(W, H, { y: 0.5, ly: 0.42 });
  grad(ctx, W, H, [C.white, C.ice]);
  const cols = [C.sky, "#5fb3e8", C.blue, C.navy], base = H * (p.port ? 0.7 : 0.68);
  cols.forEach((c, i) => {
    const y0 = base + i * H * (p.port ? 0.07 : 0.08), amp = p.m * 0.035, len = W / (p.port ? 1.3 : 2.4), ph = i * 1.7;
    ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(0, y0);
    for (let x = 0; x <= W + 10; x += 10) ctx.lineTo(x, y0 + Math.sin((x / len) * TAU + ph) * amp);
    ctx.lineTo(W, H); ctx.closePath(); ctx.fillStyle = c; ctx.fill();
  });
  ctx.beginPath(); ctx.arc(W * (p.port ? 0.82 : 0.86), H * (p.port ? 0.3 : 0.2), p.m * 0.07, 0, TAU); ctx.fillStyle = C.sun; ctx.fill();
  logo(ctx, p.x, p.y, p.r);
};

D.vuelo = (ctx, W, H) => {
  const p = spot(W, H), r = rng(6);
  grad(ctx, W, H, [C.ice, C.white]);
  for (let i = 0; i < (p.port ? 7 : 9); i++) cloud(ctx, r() * W, r() * H, p.m * (0.12 + r() * 0.12), hexA(C.white, 0.95));
  for (let i = 0; i < (p.port ? 26 : 40); i++) { const x = r() * W, y = r() * H; if (Math.hypot(x - p.x, y - p.y) < p.r * 1.6) continue; bird(ctx, x, y, p.U * (16 + r() * 26), hexA(C.blue, 0.35 + r() * 0.4), p.U * 5); }
  logo(ctx, p.x, p.y, p.r);
};

D.cruz = (ctx, W, H) => {
  const p = spot(W, H, { y: 0.55 });
  ctx.fillStyle = C.cream; ctx.fillRect(0, 0, W, H);
  glow(ctx, p.x, p.y, p.m * 0.9, C.sun, 0.35);
  cross(ctx, p.x, p.y + (p.port ? -p.r * 0.2 : 0), (p.port ? H * 0.78 : H * 0.92), hexA(C.sun, 0.5));
  for (let i = 0; i < 18; i++) { const a = (i / 18) * TAU, d1 = p.r * 1.55, d2 = p.r * (i % 2 ? 1.9 : 2.2); ctx.beginPath(); ctx.moveTo(p.x + Math.cos(a) * d1, p.y + Math.sin(a) * d1); ctx.lineTo(p.x + Math.cos(a) * d2, p.y + Math.sin(a) * d2); ctx.strokeStyle = C.sun; ctx.lineWidth = p.U * 10; ctx.lineCap = "round"; ctx.stroke(); }
  logo(ctx, p.x, p.y, p.r);
};

D.lunares = (ctx, W, H) => {
  const p = spot(W, H), g = p.U * 90;
  ctx.fillStyle = C.white; ctx.fillRect(0, 0, W, H);
  for (let j = 0, y = 0; y < H + g; j++, y += g * 0.866) for (let x = (j % 2) * g / 2; x < W + g; x += g) { ctx.beginPath(); ctx.arc(x, y, g * 0.2, 0, TAU); ctx.fillStyle = (j + Math.round(x / g)) % 7 === 0 ? hexA(C.sun, 0.7) : hexA(C.sky, 0.55); ctx.fill(); }
  ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 1.45, 0, TAU); ctx.fillStyle = C.white; ctx.fill();
  logo(ctx, p.x, p.y, p.r, { ring: C.coral, rw: 0.08 });
};

D.mosaico = (ctx, W, H) => {
  const p = spot(W, H), r = rng(9), cols = p.port ? 6 : 12, g = W / cols, gap = g * 0.08;
  ctx.fillStyle = C.white; ctx.fillRect(0, 0, W, H);
  const pal = [C.ice, C.ice, C.butter, C.rose, C.cream, C.sky, C.sky, C.sun, C.coral, C.blue];
  for (let y = 0; y < H; y += g) for (let x = 0; x < W; x += g) {
    const c = pick(r, pal); ctx.beginPath(); ctx.roundRect(x + gap / 2, y + gap / 2, g - gap, g - gap, g * 0.22); ctx.fillStyle = c; ctx.fill();
    const k = r(); if (k < 0.12) heart(ctx, x + g / 2, y + g / 2, g * 0.45, C.white); else if (k < 0.2) cross(ctx, x + g / 2, y + g / 2, g * 0.45, C.white); else if (k < 0.28) { ctx.beginPath(); ctx.arc(x + g / 2, y + g / 2, g * 0.16, 0, TAU); ctx.fillStyle = C.white; ctx.fill(); }
  }
  ctx.beginPath(); ctx.roundRect(p.x - p.r * 1.5, p.y - p.r * 1.5, p.r * 3, p.r * 3, p.r * 0.5); ctx.fillStyle = C.white; ctx.fill();
  logo(ctx, p.x, p.y, p.r, { shadow: 0 });
};

D.monitos = (ctx, W, H) => {
  const p = spot(W, H), r = rng(10), w = p.U * (p.port ? 300 : 330), cols = Math.ceil(W / (w * 1.05)) + 1, rows = Math.ceil(H / (w * 0.95)) + 1;
  ctx.fillStyle = C.cream; ctx.fillRect(0, 0, W, H);
  let k = 0;
  for (let j = -1; j < rows; j++) for (let i = -1; i < cols; i++) {
    const x = i * w * 1.08 + (j % 2) * w * 0.5 + (r() - 0.5) * w * 0.1, y = j * w * 0.95 + (r() - 0.5) * w * 0.1;
    if (Math.hypot(x + w / 2 - p.x, y + w * 0.4 - p.y) < p.r * 1.7) { k++; continue; }
    illCard(ctx, MONITOS[k++ % MONITOS.length], x, y, w * 0.9, { bg: C.cream, rot: (r() - 0.5) * 10, shadow: w * 0.03, r: w * 0.08 });
  }
  ctx.fillStyle = hexA(C.cream, 0.2); ctx.fillRect(0, 0, W, H);
  logo(ctx, p.x, p.y, p.r, { line: 8 * p.U });
};

D.rosario = (ctx, W, H) => {
  const p = spot(W, H, { y: 0.52, ly: 0.4 }), R = p.r * (p.port ? 1.75 : 1.45);
  grad(ctx, W, H, [C.butter, C.cream]);
  glow(ctx, p.x, p.y, R * 1.8, C.white, 0.8);
  const n = 59, pts = [];
  for (let i = 0; i < n; i++) { const a = Math.PI / 2 + 0.22 + (i / (n - 1)) * (TAU - 0.44); pts.push([p.x + Math.cos(a) * R, p.y + Math.sin(a) * R * 1.06]); }
  ctx.strokeStyle = hexA(C.navy, 0.5); ctx.lineWidth = p.U * 3; ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  const bx = p.x, by = p.y + R * 1.06 + p.r * 0.25; ctx.lineTo(bx, by); ctx.closePath(); ctx.stroke();
  pts.forEach(([x, y], i) => { const big = i % 11 === 5; ctx.beginPath(); ctx.arc(x, y, p.U * (big ? 20 : 13), 0, TAU); ctx.fillStyle = big ? C.coral : C.blue; ctx.fill(); });
  ctx.beginPath(); ctx.arc(bx, by, p.U * 20, 0, TAU); ctx.fillStyle = C.sun; ctx.fill();
  const tail = [[0.42, false], [0.62, true], [0.78, false], [0.9, false], [1.02, false], [1.2, true]];
  const tk = p.port ? 1 : 0.55;
  ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, by + p.r * 1.35 * tk); ctx.stroke();
  tail.forEach(([k, big]) => { ctx.beginPath(); ctx.arc(bx, by + p.r * k * tk, p.U * (big ? 20 : 13), 0, TAU); ctx.fillStyle = big ? C.coral : C.blue; ctx.fill(); });
  cross(ctx, bx, by + p.r * 1.6 * tk, p.U * (p.port ? 110 : 80), C.sun);
  logo(ctx, p.x, p.y, p.r);
};

D.estrellas = (ctx, W, H) => {
  const p = spot(W, H), r = rng(12);
  grad(ctx, W, H, [C.sky, C.ice, C.white]);
  for (let i = 0; i < (W * H) / 9000; i++) { const x = r() * W, y = r() * H * 0.95; if (Math.hypot(x - p.x, y - p.y) < p.r * 1.6) continue; const s = p.U * (6 + r() * 22); r() < 0.6 ? sparkle(ctx, x, y, s, hexA(C.white, 0.9)) : star(ctx, x, y, s * 0.8, hexA(C.sun, 0.85), r() * TAU); }
  glow(ctx, p.x, p.y, p.r * 2.4, C.white, 0.8);
  logo(ctx, p.x, p.y, p.r);
};

D.zine = (ctx, W, H) => {
  const p = spot(W, H), r = rng(13), g = p.U * 54;
  ctx.fillStyle = C.white; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = C.ice; ctx.lineWidth = p.U * 2.5;
  for (let x = 0; x < W; x += g) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += g) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  for (let i = 0; i < (W * H) / 70000; i++) {
    const x = r() * W, y = r() * H; if (Math.hypot(x - p.x, y - p.y) < p.r * 2) continue;
    const c = pick(r, [C.coral, C.blue, C.sun, C.sky]), s = p.U * (40 + r() * 40), k = r();
    ctx.lineWidth = p.U * 7; ctx.strokeStyle = c; ctx.lineCap = "round"; ctx.lineJoin = "round";
    if (k < 0.3) { heartPath(ctx, x, y, s); ctx.stroke(); } else if (k < 0.55) squiggle(ctx, x, y, s, c, p.U * 7, r() * TAU);
    else if (k < 0.75) { ctx.save(); ctx.translate(x, y); ctx.rotate(r()); ctx.beginPath(); for (let t = 0; t < 4; t++) { ctx.moveTo(0, 0); ctx.lineTo(0, -s * 0.5); ctx.rotate(Math.PI / 2); } ctx.stroke(); ctx.restore(); }
    else { ctx.save(); ctx.translate(x, y); ctx.rotate(r() - 0.5); ctx.fillStyle = hexA(pick(r, [C.butter, C.rose, C.ice]), 0.95); ctx.fillRect(-s * 0.9, -s * 0.25, s * 1.8, s * 0.5); ctx.restore(); }
  }
  card(ctx, p.x - p.r * 1.35, p.y - p.r * 1.35, p.r * 2.7, p.r * 2.7, { r: p.r * 0.2, fill: C.cream, bw: p.U * 6, shadow: p.U * 18, rot: -3 });
  logo(ctx, p.x, p.y, p.r * 1.05, { ring: 0, shadow: 0 });
  [[-1, -1, -35], [1, 1, -35]].forEach(([sx, sy, a]) => { ctx.save(); ctx.translate(p.x + sx * p.r * 1.3, p.y + sy * p.r * 1.3); ctx.rotate((a * Math.PI) / 180); ctx.fillStyle = hexA(C.sun, 0.8); ctx.fillRect(-p.r * 0.4, -p.r * 0.11, p.r * 0.8, p.r * 0.22); ctx.restore(); });
};

D.corazones = (ctx, W, H) => {
  const p = spot(W, H), g = p.U * 110, rows = Math.ceil(H / g) + 1, pal = [C.sky, C.ice, C.rose, C.coral, C.sun, C.butter];
  ctx.fillStyle = C.white; ctx.fillRect(0, 0, W, H);
  for (let j = 0; j < rows; j++) for (let x = (j % 2) * g / 2; x < W + g; x += g) heart(ctx, x, j * g, g * 0.55, hexA(pal[Math.floor((j / rows) * pal.length)], 0.75));
  ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 1.5, 0, TAU); ctx.fillStyle = C.white; ctx.fill();
  logo(ctx, p.x, p.y, p.r, { line: 8 * p.U });
};

D.aros = (ctx, W, H) => {
  const p = spot(W, H), pal = [C.sky, C.ice, C.white, C.butter, C.cream, C.rose, C.white, C.ice];
  const R = Math.hypot(Math.max(p.x, W - p.x), Math.max(p.y, H - p.y)), step = p.r * 0.42;
  for (let i = Math.ceil(R / step); i >= 0; i--) { ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 1.1 + i * step, 0, TAU); ctx.fillStyle = pal[i % pal.length]; ctx.fill(); }
  logo(ctx, p.x, p.y, p.r);
};

D.camino = (ctx, W, H) => {
  const p = spot(W, H, { y: 0.38, ly: 0.36, lx: 0.3, size: 0.85 });
  grad(ctx, W, H, [C.ice, C.white, C.butter]);
  const sx = W * (p.port ? 0.72 : 0.72), sy = H * (p.port ? 0.5 : 0.42);
  glow(ctx, sx, sy, p.m * 0.35, C.sun, 0.45); ctx.beginPath(); ctx.arc(sx, sy, p.m * 0.09, 0, TAU); ctx.fillStyle = C.sun; ctx.fill();
  const hills = [[0.62, C.sky, 0.2], [0.7, "#5fb3e8", 1.4], [0.8, C.blue, 2.6]];
  hills.forEach(([hy, c, ph]) => { ctx.beginPath(); ctx.moveTo(0, H); for (let x = 0; x <= W + 10; x += 10) ctx.lineTo(x, H * hy + Math.sin(x / W * Math.PI * (p.port ? 1.6 : 2.2) + ph) * H * 0.04); ctx.lineTo(W, H); ctx.closePath(); ctx.fillStyle = c; ctx.fill(); });
  // camino
  const top = [W * 0.62, H * 0.665];
  ctx.beginPath(); ctx.moveTo(W * 0.3, H); ctx.bezierCurveTo(W * 0.8, H * 0.92, W * 0.3, H * 0.78, top[0] - W * 0.006, top[1]); ctx.lineTo(top[0] + W * 0.006, top[1]);
  ctx.bezierCurveTo(W * 0.42, H * 0.78, W * 0.95, H * 0.92, W * 0.62, H); ctx.closePath(); ctx.fillStyle = C.cream; ctx.fill();
  cross(ctx, top[0], top[1] - p.m * 0.07, p.m * 0.13, C.navy);
  [[0.15, 0.2], [0.24, 0.24], [0.85, 0.12]].forEach(([bx, by]) => bird(ctx, W * bx + (p.port ? 0 : W * 0.25), H * by, p.U * 22, hexA(C.blue, 0.6), p.U * 5));
  logo(ctx, p.x, p.y, p.r);
};

D.velas = (ctx, W, H) => {
  const p = spot(W, H, { y: 0.47, ly: 0.36, size: 0.85 });
  ctx.fillStyle = C.cream; ctx.fillRect(0, 0, W, H);
  const by = H * (p.port ? 0.86 : 0.93), u = p.U * (p.port ? 1 : 0.78), gap = u * 230;
  glow(ctx, p.x, by - u * 420, u * 900, C.sun, 0.35);
  [[-1, 300], [0, 420], [1, 260]].forEach(([i, h]) => {
    const x = p.x + i * gap, top = by - u * h, w = u * 120;
    glow(ctx, x, top - u * 60, u * 180, C.sun, 0.55);
    ctx.beginPath(); ctx.roundRect(x - w / 2, top, w, by - top, u * 22); ctx.fillStyle = C.white; ctx.fill(); ctx.lineWidth = u * 7; ctx.strokeStyle = C.navy; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, top - u * 22); ctx.strokeStyle = C.navy; ctx.lineWidth = u * 5; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, top - u * 120); ctx.bezierCurveTo(x + u * 48, top - u * 60, x + u * 34, top - u * 18, x, top - u * 18); ctx.bezierCurveTo(x - u * 34, top - u * 18, x - u * 48, top - u * 60, x, top - u * 120); ctx.fillStyle = C.sun; ctx.fill();
    ctx.beginPath(); ctx.ellipse(x, top - u * 45, u * 13, u * 24, 0, 0, TAU); ctx.fillStyle = C.coral; ctx.fill();
  });
  ctx.fillStyle = C.navy; ctx.beginPath(); ctx.roundRect(p.x - gap * 1.6, by, gap * 3.2, u * 18, u * 9); ctx.fill();
  logo(ctx, p.x, p.y - (p.port ? 0 : 0), p.r);
};

D.diagonal = (ctx, W, H) => {
  const p = spot(W, H), s = p.U * 120, D2 = W + H;
  ctx.fillStyle = C.cream; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(-Math.PI / 4);
  for (let x = -D2, i = 0; x < D2; x += s, i++) { ctx.fillStyle = i % 2 ? C.butter : C.cream; ctx.fillRect(x, -D2, s, D2 * 2); if (i % 4 === 0) { ctx.fillStyle = hexA(C.coral, 0.6); ctx.fillRect(x + s * 0.45, -D2, s * 0.1, D2 * 2); } }
  ctx.restore();
  ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 1.45, 0, TAU); ctx.fillStyle = C.sky; ctx.fill();
  logo(ctx, p.x, p.y, p.r, { line: 8 * p.U });
};

D.burbujas = (ctx, W, H) => {
  const p = spot(W, H), r = rng(19);
  ctx.fillStyle = C.white; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 14; i++) glow(ctx, r() * W, r() * H, p.m * (0.35 + r() * 0.5), pick(r, [C.sky, C.rose, C.butter, C.sun, C.sky]), 0.55);
  for (let i = 0; i < 40; i++) { const x = r() * W, y = r() * H; ctx.beginPath(); ctx.arc(x, y, p.U * (8 + r() * 40), 0, TAU); ctx.strokeStyle = hexA(C.white, 0.9); ctx.lineWidth = p.U * 4; ctx.stroke(); }
  logo(ctx, p.x, p.y, p.r);
};

D.atardecer = (ctx, W, H) => {
  const p = spot(W, H, { y: 0.4, ly: 0.36, lx: 0.5, size: 0.9 });
  grad(ctx, W, H, [C.ice, C.rose, C.butter]);
  const hy = H * (p.port ? 0.78 : 0.76);
  glow(ctx, W / 2, hy, p.m * 0.8, C.sun, 0.6);
  ctx.beginPath(); ctx.arc(W / 2, hy, p.m * 0.22, Math.PI, 0); ctx.fillStyle = C.sun; ctx.fill();
  for (let i = 0; i < 4; i++) { ctx.fillStyle = hexA(C.coral, 0.25 + i * 0.1); ctx.fillRect(W / 2 - p.m * 0.22, hy - p.m * (0.04 + i * 0.045), p.m * 0.44, p.m * 0.012); }
  ctx.beginPath(); ctx.moveTo(0, H); for (let x = 0; x <= W + 10; x += 10) ctx.lineTo(x, hy + Math.sin(x / W * Math.PI * 3) * H * 0.012); ctx.lineTo(W, H); ctx.closePath(); ctx.fillStyle = C.blue; ctx.fill();
  ctx.beginPath(); ctx.moveTo(0, H); for (let x = 0; x <= W + 10; x += 10) ctx.lineTo(x, hy + H * 0.06 + Math.sin(x / W * Math.PI * 2 + 1) * H * 0.02); ctx.lineTo(W, H); ctx.closePath(); ctx.fillStyle = C.navy; ctx.fill();
  [[0.2, 0.62], [0.27, 0.6], [0.78, 0.55], [0.84, 0.58]].forEach(([bx, by]) => bird(ctx, W * bx, H * by, p.U * 24, hexA(C.navy, 0.6), p.U * 5));
  logo(ctx, p.x, p.y, p.r);
};

export const FONDOS = [
  ["amanecer", "Amanecer"], ["corazon", "Corazón"], ["rayos", "Rayos"], ["confeti", "Confeti"], ["olas", "Olas"],
  ["vuelo", "Vuelo"], ["cruz", "Cruz de luz"], ["lunares", "Lunares"], ["mosaico", "Mosaico"], ["monitos", "Monitos"],
  ["rosario", "Rosario"], ["estrellas", "Estrellas"], ["zine", "Cuaderno"], ["corazones", "Corazones"], ["aros", "Aros"],
  ["camino", "Camino"], ["velas", "Velas"], ["diagonal", "Rayas"], ["burbujas", "Burbujas"], ["atardecer", "Atardecer"],
];
export function fondo(ctx, W, H, id) {
  ctx.save(); ctx.clearRect(0, 0, W, H);
  (D[id] || D.amanecer)(ctx, W, H);
  ctx.restore();
}
