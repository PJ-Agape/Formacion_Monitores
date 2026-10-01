// Avatares ilustrados de Ágape (sin fotos): cada persona arma el suyo combinando
// fondo, piel, peinado, color de pelo, cara y un detalle. Se guarda como una clave corta
// («b0s1h2c0f0x3») y se dibuja en SVG con el estilo de los monitos de la página.

import { esc, initials } from "./util.js";

export const BG = ["#8ad2fa", "#ffba03", "#ef591c", "#1351a4", "#fde0d2", "#9be3b0"];
const SHIRT = ["#1351a4", "#0b2566", "#fff6e5", "#ffba03", "#1351a4", "#ef591c"];
export const SKIN = ["#f9dcc4", "#eebf95", "#c98e63", "#8d5a3b"];
export const HAIRC = ["#2b1d14", "#6b4226", "#c58c3f", "#e6e1d6", "#0b2566"];
export const OPTS = {
  b: { label: "Fondo", n: BG.length },
  s: { label: "Piel", n: SKIN.length },
  h: { label: "Peinado", n: 8, names: ["Rapado", "Corto", "Largo", "Rulos", "Moño", "Trenzas", "Jockey", "Parado"] },
  c: { label: "Color de pelo", n: HAIRC.length },
  f: { label: "Cara", n: 3, names: ["Sonrisa", "Feliz", "Guiño"] },
  x: { label: "Detalle", n: 5, names: ["Nada", "Lentes", "Audífonos", "Pañoleta", "Cruz"] },
};
const ORDER = ["b", "s", "h", "c", "f", "x"];

export function parse(key) {
  const m = /^b(\d)s(\d)h(\d)c(\d)f(\d)x(\d)$/.exec(String(key || ""));
  if (!m) return null;
  const v = { b: +m[1], s: +m[2], h: +m[3], c: +m[4], f: +m[5], x: +m[6] };
  return ORDER.every((k) => v[k] < OPTS[k].n) ? v : null;
}
export const keyOf = (v) => ORDER.map((k) => k + v[k]).join("");
export const randomKey = () => keyOf(Object.fromEntries(ORDER.map((k) => [k, Math.floor(Math.random() * OPTS[k].n)])));
export const isValid = (key) => !!parse(key);

const NAVY = "#0b2566";
const S = `stroke="${NAVY}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"`;
function hairBack(v, hc) {
  if (v.h === 2) return `<path d="M14 30 C12 12 52 12 50 30 L51 49 C46 51 42 50 40 47 L40 34 L24 34 L24 47 C22 50 18 51 13 49 Z" fill="${hc}" ${S}/>`;
  if (v.h === 5) return `<path d="M15 33 q-3 7 0 14 q3 4 6 0 q2 -7 -1 -14 Z M49 33 q3 7 0 14 q-3 4 -6 0 q-2 -7 1 -14 Z" fill="${hc}" ${S}/>`;
  return "";
}
function hairFront(v, hc) {
  switch (v.h) {
    case 0: return `<path d="M17.5 25 C18 15 46 15 46.5 25 C42 20 22 20 17.5 25 Z" fill="${hc}" ${S}/>`;
    case 1: case 2: case 5: return `<path d="M16 29 C13 13 51 13 48 29 C46 22 41 19 35 21 C30 22 26 20 22 21 C19 23 17 26 16 29 Z" fill="${hc}" ${S}/>`;
    case 3: return [[19, 22], [23, 16], [30, 13], [37, 13], [43, 16], [46, 22], [17, 28], [47, 28]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5.2" fill="${hc}" ${S}/>`).join("");
    case 4: return `<circle cx="32" cy="10" r="6" fill="${hc}" ${S}/><path d="M16.5 27 C15 14 49 14 47.5 27 C44 20 20 20 16.5 27 Z" fill="${hc}" ${S}/>`;
    case 6: return `<path d="M16 25 C16 10 48 10 48 25 Z" fill="#ef591c" ${S}/><path d="M46 23 L58 25 L47 27.5 Z" fill="#ef591c" ${S}/><circle cx="32" cy="11" r="2" fill="${NAVY}"/>`;
    case 7: return `<path d="M17 25 L19 12 L24 19 L28 8 L33 18 L38 9 L41 19 L46 12 L47 25 C42 21 22 21 17 25 Z" fill="${hc}" ${S}/>`;
    default: return "";
  }
}
function face(v) {
  const eyes = v.f === 1 ? `<path d="M25 29 q2 -2 4 0 M35 29 q2 -2 4 0" fill="none" ${S}/>`
    : v.f === 2 ? `<circle cx="27" cy="29" r="1.7" fill="${NAVY}"/><path d="M35 29 q2 -2 4 0" fill="none" ${S}/>`
    : `<circle cx="27" cy="29" r="1.7" fill="${NAVY}"/><circle cx="37" cy="29" r="1.7" fill="${NAVY}"/>`;
  const mouth = v.f === 1 ? `<path d="M26.5 34 Q32 40 37.5 34 Z" fill="#fff6e5" ${S}/>` : `<path d="M27 34 Q32 38.5 37 34" fill="none" ${S}/>`;
  return eyes + mouth + `<circle cx="23.5" cy="33.5" r="2" fill="#ef591c" opacity=".25"/><circle cx="40.5" cy="33.5" r="2" fill="#ef591c" opacity=".25"/>`;
}
function extra(v) {
  switch (v.x) {
    case 1: return `<circle cx="27" cy="29" r="4.3" fill="none" ${S}/><circle cx="37" cy="29" r="4.3" fill="none" ${S}/><path d="M31.3 29 h1.4" ${S}/>`;
    case 2: return `<path d="M14.5 31 C13 9 51 9 49.5 31" fill="none" stroke="${NAVY}" stroke-width="3"/><rect x="11" y="27" width="6" height="10" rx="3" fill="#ef591c" ${S}/><rect x="47" y="27" width="6" height="10" rx="3" fill="#ef591c" ${S}/>`;
    case 3: return `<path d="M22 45 L42 45 L32 55 Z" fill="${v.b === 1 ? "#ef591c" : "#ffba03"}" ${S}/><circle cx="32" cy="46.5" r="2.2" fill="#fff6e5" ${S}/>`;
    case 4: return `<path d="M32 50 v8 M29 53 h6" stroke="#ffba03" stroke-width="2.6" stroke-linecap="round"/>`;
    default: return "";
  }
}
export function svg(key) {
  const v = parse(key); if (!v) return "";
  const hc = HAIRC[v.c], shirt = SHIRT[v.b];
  return `<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false"><defs><clipPath id="avc"><circle cx="32" cy="32" r="30"/></clipPath></defs>
    <circle cx="32" cy="32" r="30" fill="${BG[v.b]}"/>
    <g clip-path="url(#avc)">
      ${hairBack(v, hc)}
      <path d="M11 66 C11 51 20 45 32 45 C44 45 53 51 53 66 Z" fill="${shirt}" ${S}/>
      <path d="M28 41 h8 v6 q-4 3 -8 0 Z" fill="${SKIN[v.s]}" ${S}/>
      <circle cx="32" cy="29" r="15" fill="${SKIN[v.s]}" ${S}/>
      ${hairFront(v, hc)}${face(v)}${extra(v)}
    </g>
    <circle cx="32" cy="32" r="30" fill="none" stroke="${NAVY}" stroke-width="2.6"/></svg>`;
}

// Avatar listo para usar: el dibujo si la persona eligió uno, si no sus iniciales.
export function avatar(key, name, cls = "") {
  const s = svg(key);
  return s ? `<span class="avatar av-ill ${cls}" title="${esc(name || "")}">${s}</span>`
    : `<span class="avatar ${cls}" title="${esc(name || "")}">${esc(initials(name || "?"))}</span>`;
}
