// GIF animados del Estudio de difusión: los stickers de Ágape con los monitos en movimiento.
// Cada monito se mueve según su pose: camina, saluda con la mano, celebra con los brazos arriba,
// abre los brazos o se mece al rezar (ver illusAt en ilustraciones.js). Los personajes juveniles
// (llama, zorro, pingüino…) saltan o se balancean enteros.
// Todo se dibuja en el teléfono y se convierte a GIF con gifenc (js/vendor, licencia MIT).
import * as E from "./estudio.js";
import { GIFEncoder, quantize, applyPalette } from "./vendor/gifenc.mjs";

const C = E.C;
export const BGS = [["cream", "Crema", C.cream], ["sky", "Celeste", C.ice], ["sun", "Dorado", C.butter], ["white", "Blanco", C.white], ["clear", "Transparente", null]];
const TAU = Math.PI * 2;
const isPj = (k) => String(k).startsWith("pj:");

// Corazones que suben en los stickers de cariño.
const HEARTS_ON = new Set(["corazon", "tesoro", "amar", "familia", "pj:oso"]);
const HEARTS = [[0.14, 0.0, C.coral], [0.86, 0.33, C.sun], [0.22, 0.62, C.sky], [0.8, 0.8, C.coral]];
function heart(ctx, x, y, r, col) {
  ctx.beginPath(); ctx.moveTo(x, y + r * 0.9);
  ctx.bezierCurveTo(x - r * 1.6, y - r * 0.1, x - r * 0.7, y - r * 1.3, x, y - r * 0.45);
  ctx.bezierCurveTo(x + r * 0.7, y - r * 1.3, x + r * 1.6, y - r * 0.1, x, y + r * 0.9);
  ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = r * 0.22; ctx.strokeStyle = C.navy; ctx.stroke();
}
// Personajes juveniles: el cuerpo entero salta o se balancea.
function pjPose(i, p) {
  const s = Math.sin(TAU * p);
  if (i % 2) { const h = Math.abs(Math.sin(TAU * p)); return { dy: -0.1 * h, r: 0 }; }
  return { dy: 0, r: 0.12 * s };
}

// Cuadros (lienzos de 512) de un sticker: n instantes de una vuelta completa.
const CACHE = new Map();
export async function frames(i, n) {
  const id = `${i}|${n}`;
  if (CACHE.has(id)) return CACHE.get(id);
  const [k, t, c] = E.STICKERS[i];
  let out;
  if (isPj(k)) {
    await E.preload(E.stickerIlls(k, c));
    const base = document.createElement("canvas"); base.width = base.height = 512; E.sticker(base.getContext("2d"), k, t, c);
    out = [...Array(n)].map((_, f) => {
      const cv = document.createElement("canvas"); cv.width = cv.height = 512; const ctx = cv.getContext("2d"), g = pjPose(i, f / n);
      ctx.save(); ctx.translate(256, 470 + g.dy * 512); ctx.rotate(g.r); ctx.drawImage(base, -256, -470); ctx.restore();
      return cv;
    });
  } else {
    const layers = await Promise.all([...Array(n)].map((_, f) => E.stickerLayers(k, c, f / n)));
    // Un mismo recorte para todos los cuadros, así el monito no «salta» de tamaño.
    const boxes = layers.map((l) => E.stickerCrop(l.fill, l.out)).filter(Boolean);
    const box = boxes.reduce((a, b) => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])]);
    out = layers.map((l) => { const cv = document.createElement("canvas"); cv.width = cv.height = 512; E.sticker(cv.getContext("2d"), k, t, c, l, box); return cv; });
  }
  CACHE.set(id, out);
  if (CACHE.size > 40) CACHE.delete(CACHE.keys().next().value);
  return out;
}

// Dibuja el cuadro f de n en un lienzo N×N con el fondo elegido.
export function draw(ctx, N, i, fr, f, bg) {
  const [k] = E.STICKERS[i], n = fr.length, p = f / n;
  ctx.clearRect(0, 0, N, N);
  if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, N, N); }
  if (HEARTS_ON.has(k)) {
    for (const [x, ph, col] of HEARTS) { const q = (p + ph) % 1; ctx.globalAlpha = Math.sin(Math.PI * q); heart(ctx, x * N, N * (0.92 - 0.75 * q), N * 0.042, col); }
    ctx.globalAlpha = 1;
  }
  const sz = N * 0.92;
  ctx.drawImage(fr[f % n], (N - sz) / 2, (N - sz) / 2, sz, sz);
}

// Arma el GIF (Blob).
export async function makeGif(i, bgKey, N = 360, n = 20, delay = 80) {
  const bg = (BGS.find((b) => b[0] === bgKey) || BGS[0])[2];
  const fr = await frames(i, n);
  const cv = document.createElement("canvas"); cv.width = cv.height = N;
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  const gif = GIFEncoder();
  for (let f = 0; f < n; f++) {
    draw(ctx, N, i, fr, f, bg);
    const { data } = ctx.getImageData(0, 0, N, N);
    if (bg) {
      const pal = quantize(data, 256);
      gif.writeFrame(applyPalette(data, pal), N, N, { palette: pal, delay, repeat: 0 });
    } else {
      const pal = quantize(data, 256, { format: "rgba4444", oneBitAlpha: true, clearAlpha: true, clearAlphaThreshold: 100 });
      const ti = pal.findIndex((c) => c[3] === 0);
      gif.writeFrame(applyPalette(data, pal, "rgba4444"), N, N, { palette: pal, delay, repeat: 0, transparent: ti >= 0, transparentIndex: Math.max(0, ti), dispose: 2 });
    }
    if (f % 4 === 3) await new Promise((r) => setTimeout(r));
  }
  gif.finish();
  return new Blob([gif.bytes()], { type: "image/gif" });
}
