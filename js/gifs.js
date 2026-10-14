// GIF animados del Estudio de difusión: los stickers de Ágape con movimiento
// (saltar, latir, saludar, flotar…) y algunos con corazones o destellos.
// Todo se dibuja en el teléfono y se convierte a GIF con gifenc (js/vendor, licencia MIT).
import * as E from "./estudio.js";
import { GIFEncoder, quantize, applyPalette } from "./vendor/gifenc.mjs";

const C = E.C;
// Movimiento de cada uno (por defecto, según su posición en la lista).
const MOTION = {
  corazon: "late", tesoro: "late", amar: "late", familia: "late", "pj:oso": "late",
  jesus: "flota", virgen: "flota", maria: "flota", espiritu: "flota", luz: "flota", santos: "flota", oracion: "flota", "pj:panda": "flota", descanso: "flota",
  amigos: "salta", juego: "salta", levantate: "salta", equipo: "salta", bartimeo: "salta", envio: "salta", "pj:llama": "salta", "pj:zorro": "salta",
  acogida: "saluda", comunidad: "saluda", futuro: "saluda", flores: "saluda", emaus: "saluda", camino: "saluda",
  duda: "tiembla", pregunta: "tiembla", "pj:pinguino": "tiembla", celular: "tiembla",
  sanmiguel: "aparece", carloacutis: "aparece", servir: "aparece", eucaristia: "aparece", panes: "aparece", mesa: "aparece", biblia: "aparece",
};
const ORDER = ["salta", "late", "saluda", "flota", "aparece", "tiembla"];
// Adornos: corazones que suben o destellos que brillan.
const FX = {
  corazon: "hearts", tesoro: "hearts", amar: "hearts", familia: "hearts", amigos: "hearts", "pj:oso": "hearts", flores: "hearts",
  luz: "sparks", santos: "sparks", espiritu: "sparks", envio: "sparks", bartimeo: "sparks", jesus: "sparks", virgen: "sparks", sanmiguel: "sparks", futuro: "sparks",
};
export const motionOf = (k, i) => MOTION[k] || ORDER[i % ORDER.length];
export const MOTION_LABEL = { salta: "Salta", late: "Late", saluda: "Saluda", flota: "Flota", aparece: "Aparece", tiembla: "Tiembla" };
export const BGS = [["cream", "Crema", C.cream], ["sky", "Celeste", C.ice], ["sun", "Dorado", C.butter], ["white", "Blanco", C.white], ["clear", "Transparente", null]];

// Cada sticker se dibuja una sola vez en su propio lienzo.
const CACHE = new Map();
export async function prepare() {
  await E.preload(E.STICKERS.flatMap(([k, , c]) => E.stickerIlls(k, c)));
}
export function base(i) {
  if (CACHE.has(i)) return CACHE.get(i);
  const [k, t, c] = E.STICKERS[i];
  const cv = document.createElement("canvas"); cv.width = cv.height = 512;
  E.sticker(cv.getContext("2d"), k, t, c);
  CACHE.set(i, cv); return cv;
}

const TAU = Math.PI * 2;
// Pose del sticker en el instante p (0..1, vuelve al inicio en 1 para que el GIF no salte).
function pose(m, p) {
  const s = Math.sin(TAU * p), c = Math.cos(TAU * p);
  switch (m) {
    case "salta": { const h = Math.abs(Math.sin(Math.PI * p * 2)); const squash = p % 0.5 < 0.06 || p % 0.5 > 0.44 ? 0.06 : 0; return { dy: -0.13 * h, sx: 1 + squash, sy: 1 - squash, r: 0 }; }
    case "late": { const b = Math.max(0, Math.sin(TAU * p * 2)) ** 3; return { dy: 0, sx: 1 + 0.09 * b, sy: 1 + 0.09 * b, r: 0 }; }
    case "saluda": return { dy: 0, sx: 1, sy: 1, r: 0.16 * s, ox: 0.5, oy: 0.92 };
    case "flota": return { dy: -0.05 * s, sx: 1, sy: 1, r: 0.04 * c };
    case "aparece": { const q = p < 0.35 ? p / 0.35 : 1; const e = q < 1 ? 1 - Math.pow(1 - q, 3) * Math.cos(q * 9) : 1; const out = p > 0.9 ? (1 - p) / 0.1 : 1; const k = Math.max(0.01, e * out); return { dy: 0, sx: k, sy: k, r: (1 - Math.min(1, q)) * -0.5 }; }
    case "tiembla": { const w = p < 0.5 ? Math.sin(TAU * p * 8) * (1 - p * 2) : 0; return { dy: 0, sx: 1, sy: 1, r: 0.07 * w, dx: 0.02 * w }; }
    default: return { dy: 0, sx: 1, sy: 1, r: 0 };
  }
}
function heart(ctx, x, y, r, col) {
  ctx.beginPath(); ctx.moveTo(x, y + r * 0.9);
  ctx.bezierCurveTo(x - r * 1.6, y - r * 0.1, x - r * 0.7, y - r * 1.3, x, y - r * 0.45);
  ctx.bezierCurveTo(x + r * 0.7, y - r * 1.3, x + r * 1.6, y - r * 0.1, x, y + r * 0.9);
  ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = r * 0.22; ctx.strokeStyle = C.navy; ctx.stroke();
}
function spark(ctx, x, y, r, col) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU, rr = i % 2 ? r * 0.32 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  ctx.closePath(); ctx.fillStyle = col; ctx.fill();
}
const HEARTS = [[0.16, 0.0, C.coral], [0.84, 0.33, C.sun], [0.26, 0.6, C.sky], [0.74, 0.8, C.coral]];
const SPARKS = [[0.14, 0.2, 0.0, C.sun], [0.86, 0.28, 0.25, C.coral], [0.2, 0.78, 0.5, C.sky], [0.84, 0.74, 0.75, C.sun], [0.5, 0.08, 0.4, C.sky]];

// Dibuja el cuadro p (0..1) del sticker i en un lienzo de N×N.
export function frame(ctx, N, i, p, bg) {
  const [k] = E.STICKERS[i];
  ctx.clearRect(0, 0, N, N);
  if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, N, N); }
  const fx = FX[k];
  if (fx === "hearts") for (const [x, ph, col] of HEARTS) { const q = (p + ph) % 1; ctx.globalAlpha = Math.sin(Math.PI * q); heart(ctx, x * N, N * (0.95 - 0.8 * q), N * 0.045, col); }
  if (fx === "sparks") for (const [x, y, ph, col] of SPARKS) { const q = Math.max(0, Math.sin(TAU * (p + ph))); ctx.globalAlpha = q; spark(ctx, x * N, y * N, N * 0.05 * (0.4 + q), col); }
  ctx.globalAlpha = 1;
  const g = pose(motionOf(k, i), p), img = base(i), sz = N * 0.84;
  const ox = (g.ox ?? 0.5) * sz, oy = (g.oy ?? 0.5) * sz;
  ctx.save();
  ctx.translate((N - sz) / 2 + ox + (g.dx || 0) * N, (N - sz) / 2 + oy + g.dy * N);
  ctx.rotate(g.r); ctx.scale(g.sx, g.sy);
  ctx.drawImage(img, -ox, -oy, sz, sz);
  ctx.restore();
}

// Arma el GIF (Blob). Fondo transparente: se usa un color clave para los píxeles vacíos.
export async function makeGif(i, bgKey, N = 360, frames = 24, delay = 60) {
  const bg = (BGS.find((b) => b[0] === bgKey) || BGS[0])[2];
  const cv = document.createElement("canvas"); cv.width = cv.height = N;
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  const gif = GIFEncoder();
  for (let f = 0; f < frames; f++) {
    frame(ctx, N, i, f / frames, bg);
    const { data } = ctx.getImageData(0, 0, N, N);
    if (bg) {
      const pal = quantize(data, 256);
      gif.writeFrame(applyPalette(data, pal), N, N, { palette: pal, delay, repeat: 0 });
    } else {
      const pal = quantize(data, 256, { format: "rgba4444", oneBitAlpha: true, clearAlpha: true, clearAlphaThreshold: 100 });
      const index = applyPalette(data, pal, "rgba4444");
      const ti = pal.findIndex((c) => c[3] === 0);
      gif.writeFrame(index, N, N, { palette: pal, delay, repeat: 0, transparent: ti >= 0, transparentIndex: Math.max(0, ti), dispose: 2 });
    }
    if (f % 4 === 3) await new Promise((r) => setTimeout(r));
  }
  gif.finish();
  return new Blob([gif.bytes()], { type: "image/gif" });
}
