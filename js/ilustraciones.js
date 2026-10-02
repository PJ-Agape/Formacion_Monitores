// Ilustraciones propias de Camino Ágape: dibujos de trazo simple, hechos a mano
// alzada con monitos de palitos, para acompañar cada encuentro. Son SVG en línea,
// usan el color del texto (currentColor) y un filtro que imita el trazo de lápiz.

let uid = 0;
const P = (d, extra = "") => `<path d="${d}" ${extra}/>`;
const C = (cx, cy, r, extra = "") => `<circle cx="${cx}" cy="${cy}" r="${r}" ${extra}/>`;
const FILL = 'fill="currentColor" stroke="none"';
const POP = 'fill="var(--il-pop, #ffba03)" stroke="currentColor"';

// Monito: x = centro, y = pies. arms: down | up | out | pray | give | wave | hold | hug
function fig(x, y, { arms = "down", legs = "stand", face = "smile", s = 1, flip = 1 } = {}) {
  const k = (v) => +(v * s).toFixed(1);
  const X = (dx) => +(x + dx * s * flip).toFixed(1), Y = (dy) => +(y - dy * s).toFixed(1);
  const hy = Y(62), r = k(10);
  let out = C(X(0), hy, r, 'fill="var(--il-bg, #fff)"');
  if (face === "smile") out += P(`M${X(-4)} ${Y(59)} Q${X(0)} ${Y(55)} ${X(4)} ${Y(59)}`) + C(X(-3.5), Y(64), 0.9, FILL) + C(X(3.5), Y(64), 0.9, FILL);
  if (face === "calm") out += P(`M${X(-5)} ${Y(64)} q2 1.5 4 0 M${X(1)} ${Y(64)} q2 1.5 4 0 M${X(-3)} ${Y(58)} Q${X(0)} ${Y(56)} ${X(3)} ${Y(58)}`);
  if (face === "wow") out += C(X(0), Y(58), 1.8) + C(X(-3.5), Y(64), 0.9, FILL) + C(X(3.5), Y(64), 0.9, FILL);
  if (face === "worry") out += P(`M${X(-4)} ${Y(57)} Q${X(0)} ${Y(60)} ${X(4)} ${Y(57)}`) + C(X(-3.5), Y(64), 0.9, FILL) + C(X(3.5), Y(64), 0.9, FILL);
  out += P(`M${X(0)} ${Y(52)} L${X(0)} ${Y(22)}`);
  out += legs === "walk" ? P(`M${X(-12)} ${Y(0)} L${X(-4)} ${Y(12)} L${X(0)} ${Y(22)} L${X(8)} ${Y(10)} L${X(14)} ${Y(2)}`)
    : legs === "kneel" ? P(`M${X(0)} ${Y(22)} L${X(12)} ${Y(12)} L${X(12)} ${Y(0)} M${X(0)} ${Y(22)} L${X(-4)} ${Y(8)} L${X(-16)} ${Y(4)}`)
    : legs === "sit" ? P(`M${X(0)} ${Y(22)} L${X(16)} ${Y(22)} L${X(18)} ${Y(4)}`)
    : legs === "jump" ? P(`M${X(-10)} ${Y(8)} L${X(0)} ${Y(22)} L${X(10)} ${Y(8)}`)
    : P(`M${X(-9)} ${Y(0)} L${X(0)} ${Y(22)} L${X(9)} ${Y(0)}`);
  const A = {
    down: `M${X(-12)} ${Y(28)} L${X(0)} ${Y(44)} L${X(12)} ${Y(28)}`,
    up: `M${X(-16)} ${Y(70)} L${X(0)} ${Y(44)} L${X(16)} ${Y(70)}`,
    out: `M${X(-20)} ${Y(46)} L${X(0)} ${Y(44)} L${X(20)} ${Y(46)}`,
    pray: `M${X(0)} ${Y(44)} L${X(-6)} ${Y(36)} L${X(1)} ${Y(49)} M${X(0)} ${Y(44)} L${X(6)} ${Y(36)} L${X(1)} ${Y(49)}`,
    give: `M${X(0)} ${Y(44)} L${X(14)} ${Y(38)} L${X(24)} ${Y(42)} M${X(0)} ${Y(44)} L${X(12)} ${Y(34)} L${X(22)} ${Y(38)}`,
    wave: `M${X(-12)} ${Y(28)} L${X(0)} ${Y(44)} L${X(14)} ${Y(56)} L${X(18)} ${Y(70)}`,
    hold: `M${X(-14)} ${Y(34)} L${X(0)} ${Y(44)} L${X(14)} ${Y(34)}`,
    hug: `M${X(-18)} ${Y(40)} L${X(0)} ${Y(44)} L${X(18)} ${Y(40)}`,
  };
  out += P(A[arms] || A.down);
  return out;
}
const ground = (x1 = 10, x2 = 230, y = 168) => P(`M${x1} ${y} q30 -3 60 0 t60 0 t60 0 t40 0`);
const sparkle = (x, y, r = 6) => P(`M${x} ${y - r} L${x} ${y + r} M${x - r} ${y} L${x + r} ${y} M${x - r * .6} ${y - r * .6} L${x + r * .6} ${y + r * .6} M${x - r * .6} ${y + r * .6} L${x + r * .6} ${y - r * .6}`, 'stroke-width="2"');
const heart = (x, y, w = 20, extra = POP) => P(`M${x} ${y + w * .8} C${x - w * 1.3} ${y - w * .1} ${x - w * .5} ${y - w * .9} ${x} ${y - w * .25} C${x + w * .5} ${y - w * .9} ${x + w * 1.3} ${y - w * .1} ${x} ${y + w * .8} Z`, extra);
const sun = (x, y, r = 14) => C(x, y, r, POP) + [0, 45, 90, 135, 180, 225, 270, 315].map((a) => { const t = a * Math.PI / 180; return P(`M${(x + Math.cos(t) * (r + 5)).toFixed(1)} ${(y + Math.sin(t) * (r + 5)).toFixed(1)} L${(x + Math.cos(t) * (r + 12)).toFixed(1)} ${(y + Math.sin(t) * (r + 12)).toFixed(1)}`); }).join("");
const cloud = (x, y) => P(`M${x} ${y} q-14 0 -12 -12 q2 -12 16 -8 q6 -12 20 -6 q14 -2 14 12 q10 4 2 14 Z`);
const candle = (x, y) => P(`M${x - 6} ${y} L${x - 6} ${y - 26} L${x + 6} ${y - 26} L${x + 6} ${y} Z`, 'fill="var(--il-bg,#fff)"') + P(`M${x} ${y - 30} q-6 -8 0 -16 q6 8 0 16 Z`, POP);
const book = (x, y, w = 40) => P(`M${x - w} ${y} Q${x - w / 2} ${y - 10} ${x} ${y} Q${x + w / 2} ${y - 10} ${x + w} ${y} L${x + w} ${y - 26} Q${x + w / 2} ${y - 36} ${x} ${y - 26} Q${x - w / 2} ${y - 36} ${x - w} ${y - 26} Z M${x} ${y} L${x} ${y - 26}`, 'fill="var(--il-bg,#fff)"') + P(`M${x - w + 8} ${y - 18} q10 -5 22 0 M${x + 8} ${y - 18} q10 -5 22 0`, 'stroke-width="1.5"');
const sheep = (x, y) => P(`M${x - 14} ${y - 10} q-6 -10 4 -14 q4 -8 14 -4 q10 -4 12 6 q8 4 2 12 q-4 6 -14 4 q-10 4 -18 -4 Z`, 'fill="var(--il-bg,#fff)"') + P(`M${x + 14} ${y - 16} q8 -2 10 4 q-2 6 -8 4`) + P(`M${x - 8} ${y - 6} L${x - 8} ${y + 2} M${x + 6} ${y - 6} L${x + 6} ${y + 2}`);
const bread = (x, y, w = 16) => P(`M${x - w} ${y} q0 -12 ${w} -12 q${w} 0 ${w} 12 Z`, POP) + P(`M${x - w / 2} ${y - 8} l3 -3 M${x} ${y - 9} l3 -3 M${x + w / 2} ${y - 8} l3 -3`, 'stroke-width="1.5"');
const fish = (x, y) => P(`M${x - 14} ${y} q14 -12 26 0 q-12 12 -26 0 Z M${x + 12} ${y} l8 -6 l0 12 Z`, 'fill="var(--il-bg,#fff)"') + C(x - 6, y - 2, 1, FILL);
const crossHill = (x, y) => P(`M${x - 70} ${y} Q${x} ${y - 50} ${x + 70} ${y}`) + P(`M${x} ${y - 36} L${x} ${y - 96} M${x - 18} ${y - 80} L${x + 18} ${y - 80}`, 'stroke-width="4"');
const dove = (x, y) => P(`M${x - 30} ${y} q20 -4 30 -18 q6 -8 14 -6 q6 2 4 8 l8 2 l-8 4 q-6 14 -24 16 q-14 2 -24 -6 Z`, 'fill="var(--il-bg,#fff)"') + P(`M${x - 6} ${y - 4} q-4 -22 -22 -30 q12 20 4 30`, 'fill="var(--il-bg,#fff)"') + C(x + 13, y - 18, 1.2, FILL);
const flame = (x, y, s = 1) => P(`M${x} ${y} q${-10 * s} ${-10 * s} 0 ${-24 * s} q${10 * s} ${14 * s} 0 ${24 * s} Z`, POP);
const drop = (x, y) => P(`M${x} ${y - 6} q-5 8 0 10 q5 -2 0 -10 Z`, 'fill="#8ad2fa" stroke="currentColor" stroke-width="1.8"');
const wave = (y) => P(`M0 ${y} q15 -8 30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0`);
const road = () => P("M20 172 C 70 150, 60 120, 110 110 S 190 90, 220 60", 'stroke-dasharray="3 9" stroke-width="3"');

const SCENES = {
  // llegar, acogida, puerta abierta
  acogida: () => P("M150 168 L150 70 L205 70 L205 168", 'fill="var(--il-bg,#fff)"') + P("M150 70 L128 82 L128 176 L150 168", 'fill="var(--il-pop,#ffba03)" stroke="currentColor"') + fig(178, 166, { arms: "out" }) + fig(80, 168, { arms: "wave", legs: "walk" }) + heart(115, 60, 10) + ground(10, 130),
  corazon: () => fig(120, 168, { arms: "hold" }) + heart(120, 128, 22) + sparkle(70, 70) + sparkle(178, 56, 5) + ground(),
  luz: () => fig(96, 168, { arms: "give" }) + P("M128 118 l0 -10 l14 0 l0 10 l-3 18 l-8 0 Z", 'fill="var(--il-bg,#fff)"') + flame(135, 130, .7) + P("M150 110 l20 -8 M152 124 l24 0 M150 138 l20 8 M128 100 l-6 -14 M142 100 l6 -14", 'stroke-width="2"') + ground(),
  trigo: () => P("M120 168 L120 70", 'stroke-width="3"') + [0, 1, 2, 3, 4].map((i) => P(`M120 ${80 + i * 14} q-14 -4 -16 -16 q12 2 16 12 M120 ${80 + i * 14} q14 -4 16 -16 q-12 2 -16 12`, POP)).join("") + P("M60 168 q10 -26 30 -30 M60 168 q-6 -18 -20 -22", 'stroke-width="2.5"') + ground(),
  ramos: () => fig(70, 168, { arms: "up" }) + fig(170, 168, { arms: "up", flip: -1 }) + P("M54 98 q-16 -40 6 -64 M54 98 q-6 -30 18 -50", 'stroke-width="2.5"') + P("M186 98 q16 -40 -6 -64 M186 98 q6 -30 -18 -50", 'stroke-width="2.5"') + [0, 1, 2, 3].map((i) => P(`M${48 - i * 2} ${80 - i * 12} l-10 -4 M${190 + i * 2} ${80 - i * 12} l10 -4`, 'stroke-width="2"')).join("") + P("M100 110 L120 90 L140 110", 'stroke-width="2"') + ground(),
  duda: () => fig(80, 168, { arms: "hold", face: "worry" }) + fig(165, 168, { arms: "out" }) + P("M60 70 q0 -18 14 -18 q14 0 12 14 q-2 8 -10 10 l0 8 M76 92 l0 2", 'stroke-width="3"') + P("M160 98 q4 -8 10 0", 'stroke-width="2"') + heart(165, 150, 6) + ground(),
  mesa: () => P("M40 130 L200 130 M60 130 L60 168 M180 130 L180 168", 'stroke-width="3"') + fig(80, 128, { arms: "hold", s: .75 }) + fig(160, 128, { arms: "hold", s: .75 }) + fig(120, 128, { arms: "give", s: .8 }) + bread(120, 126, 12) + C(96, 124, 6, 'fill="var(--il-bg,#fff)"') + sparkle(120, 50, 5),
  pastor: () => fig(70, 168, { arms: "hold" }) + P("M84 168 L84 90 q0 -14 12 -12 q8 2 6 12", 'stroke-width="3"') + sheep(140, 166) + sheep(190, 160) + sheep(165, 138) + ground(),
  vid: () => P("M30 60 C 80 40, 150 80, 210 50", 'stroke-width="3.5"') + [50, 90, 130, 170].map((x, i) => P(`M${x} ${56 + (i % 2) * 8} q-6 16 4 26`) + [0, 1, 2, 3, 4, 5].map((j) => C(x + 4 + (j % 3) * 7 - 7, 88 + Math.floor(j / 3) * 7 + (i % 2) * 8, 4, POP)).join("") + P(`M${x + 8} ${54 + (i % 2) * 8} q12 -12 20 0 q-8 10 -20 0`, 'fill="var(--il-bg,#fff)"')).join("") + fig(120, 172, { arms: "up", s: .7 }),
  amigos: () => fig(90, 168, { arms: "hug" }) + fig(150, 168, { arms: "hug", flip: -1 }) + heart(120, 60, 12) + ground(),
  envio: () => P("M20 168 L90 80 L130 128 L160 96 L230 168", 'fill="var(--il-bg,#fff)"') + fig(92, 80, { arms: "wave", s: .7 }) + P("M110 44 l40 -10 M112 30 l30 -18", 'stroke-width="2"') + sun(190, 40, 10),
  espiritu: () => dove(130, 70) + [70, 120, 170].map((x) => fig(x, 168, { arms: "up", s: .85 }) + flame(x, 100, .45)).join(""),
  comunidad: () => [60, 100, 140, 180].map((x, i) => fig(x, 168, { arms: "out", s: .85, face: i % 2 ? "smile" : "calm" })).join("") + sun(120, 42, 12) + ground(),
  eucaristia: () => P("M100 90 L140 90 L132 128 L108 128 Z M120 128 L120 150 M104 152 L136 152", 'fill="var(--il-bg,#fff)"') + C(120, 70, 16, POP) + P("M112 70 L128 70 M120 62 L120 78", 'stroke-width="2"') + fig(60, 168, { arms: "pray", legs: "kneel", face: "calm" }) + fig(185, 168, { arms: "pray", legs: "kneel", face: "calm", flip: -1 }) + ground(),
  familia: () => P("M60 168 L60 96 L120 56 L180 96 L180 168", 'fill="var(--il-bg,#fff)"') + fig(100, 168, { arms: "hug", s: .8 }) + fig(140, 168, { arms: "hug", s: .8, flip: -1 }) + fig(120, 168, { arms: "up", s: .5 }) + heart(120, 84, 8),
  semilla: () => fig(60, 168, { arms: "give", legs: "walk" }) + [120, 150, 180, 210].map((x, i) => P(`M${x} 168 l0 ${-8 - i * 10}`) + P(`M${x} ${160 - i * 10} q-10 -6 -12 -14 q10 0 12 10 M${x} ${160 - i * 10} q10 -6 12 -14 q-10 0 -12 10`, POP)).join("") + [84, 92, 100].map((x) => C(x, 132 + (x - 84) / 2, 1.8, FILL)).join("") + ground(),
  tormenta: () => wave(150) + wave(162) + P("M60 140 L180 140 L160 162 L80 162 Z", 'fill="var(--il-bg,#fff)"') + fig(100, 140, { arms: "up", s: .7, face: "worry" }) + fig(145, 140, { arms: "out", s: .7, face: "calm" }) + P("M120 140 L120 70 M120 76 L160 128 L120 128", 'fill="var(--il-bg,#fff)"') + cloud(52, 58) + P("M42 64 l-6 12 l6 0 l-6 12", 'stroke-width="2.5"'),
  levantate: () => fig(90, 168, { arms: "give" }) + fig(150, 150, { arms: "up", legs: "sit", s: .8, flip: -1 }) + P("M120 160 L190 160", 'stroke-width="2"') + sparkle(170, 70) + ground(),
  descanso: () => P("M170 168 L170 100", 'stroke-width="5"') + C(170, 80, 36, 'fill="var(--il-bg,#fff)"') + fig(120, 168, { arms: "down", legs: "sit", face: "calm" }) + sun(50, 44, 10) + ground(),
  panes: () => P("M70 150 q50 30 100 0 L160 130 L80 130 Z", 'fill="var(--il-bg,#fff)"') + [95, 120, 145].map((x) => bread(x, 130, 12)).join("") + bread(108, 118, 11) + bread(132, 118, 11) + fish(100, 96) + fish(142, 90) + sparkle(60, 60) + sparkle(190, 60, 5),
  camino: () => road() + fig(70, 150, { arms: "down", legs: "walk", s: .7 }) + fig(100, 128, { arms: "out", legs: "walk", s: .6 }) + sun(200, 40, 10) + flame(210, 100, .5),
  maria: () => fig(110, 168, { arms: "pray", face: "calm" }) + P("M86 110 q24 -40 48 0 L140 168 L80 168 Z", 'fill="none" stroke-dasharray="1 7" stroke-width="2.5"') + [0, 1, 2, 3, 4].map((i) => C(150 + i * 12, 50 + Math.sin(i) * 6, 3, POP)).join("") + sparkle(60, 60),
  eleccion: () => fig(120, 168, { arms: "out", face: "wow" }) + P("M40 168 L100 120 M200 168 L140 120", 'stroke-dasharray="3 8"') + heart(56, 80, 10) + P("M180 70 l0 24 M168 82 l24 0", 'stroke-width="3"'),
  corazonlimpio: () => fig(120, 168, { arms: "hold" }) + heart(120, 128, 20) + P("M74 62 q6 -10 12 0 M156 50 q6 -10 12 0 M186 88 q6 -10 12 0", 'stroke-width="2"') + P("M60 100 q20 -30 40 0", 'stroke-dasharray="2 6"'),
  escuchar: () => fig(90, 168, { arms: "wave", face: "calm" }) + P("M112 100 q10 0 10 10 M112 90 q20 0 20 20", 'stroke-width="2"') + fig(165, 168, { arms: "give", flip: -1 }) + P("M150 70 q-8 -12 4 -18 q12 -4 14 8", 'stroke-width="2"') + ground(),
  pregunta: () => fig(120, 168, { arms: "down", face: "calm" }) + P("M70 60 q0 -18 14 -18 q14 0 12 14 q-2 8 -10 10 l0 8 M86 82 l0 2", 'stroke-width="3"') + crossHill(180, 168).replace(/stroke-width="4"/, 'stroke-width="3"'),
  equipo: () => [70, 120, 170].map((x, i) => fig(x, 168, { arms: i === 1 ? "up" : "hug", s: .85, flip: i === 2 ? -1 : 1 })).join("") + sparkle(120, 50) + ground(),
  ninos: () => fig(100, 168, { arms: "hug" }) + fig(140, 168, { arms: "up", s: .55 }) + fig(160, 168, { arms: "wave", s: .5 }) + heart(130, 70, 10) + ground(),
  tesoro: () => fig(80, 168, { arms: "give", face: "calm" }) + P("M140 150 L200 150 L200 168 L140 168 Z", 'fill="var(--il-bg,#fff)"') + P("M140 150 q30 -26 60 0", 'fill="var(--il-pop,#ffba03)" stroke="currentColor"') + sparkle(170, 110) + ground(),
  servir: () => fig(80, 168, { arms: "give", legs: "kneel" }) + P("M110 160 q20 14 40 0 L146 150 L114 150 Z", 'fill="var(--il-bg,#fff)"') + fig(170, 168, { arms: "down", legs: "sit", s: .85, flip: -1 }) + P("M118 146 q4 -8 8 0 M128 142 q4 -8 8 0", 'stroke-width="1.5"') + ground(),
  bartimeo: () => fig(120, 168, { arms: "up", legs: "jump", face: "wow" }) + P("M60 150 q20 -20 40 -6 q-10 16 -40 6 Z", 'fill="var(--il-pop,#ffba03)" stroke="currentColor"') + sparkle(170, 60) + sparkle(70, 70, 5) + ground(),
  amar: () => fig(70, 168, { arms: "up" }) + fig(170, 168, { arms: "up", flip: -1 }) + heart(120, 70, 18) + P("M92 100 l12 -10 M148 100 l-12 -10", 'stroke-width="2"') + ground(),
  moneda: () => P("M100 60 q14 -10 30 0 l-4 14 l-22 0 Z", 'fill="var(--il-bg,#fff)"') + C(108, 100, 7, POP) + C(126, 112, 7, POP) + P("M80 150 L160 150 L152 168 L88 168 Z", 'fill="var(--il-bg,#fff)"') + fig(190, 168, { arms: "give", s: .8, flip: -1, face: "calm" }),
  futuro: () => sun(120, 110, 22) + P("M20 150 q50 -20 100 0 t100 0", 'stroke-width="3"') + fig(60, 150, { arms: "up", s: .6 }) + P("M150 60 q6 -10 12 0 M180 80 q6 -10 12 0", 'stroke-width="2"'),
  rey: () => P("M90 110 L96 70 L110 90 L120 60 L130 90 L144 70 L150 110 Z", 'fill="var(--il-pop,#ffba03)" stroke="currentColor"') + fig(120, 176, { arms: "out", face: "calm", s: .9 }) + P("M70 176 L170 176", 'stroke-width="2"') + sparkle(60, 60) + sparkle(185, 56, 5),
  oracion: () => fig(110, 168, { arms: "pray", legs: "kneel", face: "calm" }) + candle(170, 168) + sparkle(60, 60, 5) + ground(),
  santos: () => [60, 100, 140, 180].map((x, i) => fig(x, 168, { arms: i % 2 ? "up" : "out", s: .85, face: i === 1 ? "calm" : "smile" }) + P(`M${x - 11} ${168 - 66 * .85 - 11} a11 4 0 1 0 22 0 a11 4 0 1 0 -22 0`, 'stroke="var(--il-pop, #ffba03)" stroke-width="3"')).join("") + sparkle(30, 50, 6) + sparkle(210, 40, 7) + sparkle(120, 28, 5) + ground(),
  flores: () => fig(90, 168, { arms: "give" }) + [0, 1, 2].map((i) => P(`M${122 + i * 14} 132 l${-4 + i * 4} -30`, 'stroke-width="2.5"') + C(118 + i * 18, 98 - (i % 2) * 8, 7, POP) + C(118 + i * 18, 98 - (i % 2) * 8, 2.5, FILL)).join("") + P("M150 168 L150 80 q0 -16 14 -16 q14 0 14 16 L178 168 Z", 'fill="var(--il-bg,#fff)"') + fig(164, 150, { arms: "pray", s: .55, face: "calm" }) + sparkle(200, 50, 6) + ground(),
  bautismo: () => fig(150, 168, { arms: "pray", legs: "kneel", face: "calm" }) + fig(78, 168, { arms: "wave" }) + P("M96 92 q12 -18 30 -6 q-12 12 -30 6 Z", POP) + [[132, 92], [138, 102], [131, 110]].map(([x, y]) => drop(x, y)).join("") + wave(178).replace(/M0 178/, "M20 178") + sparkle(196, 70) + sparkle(60, 52, 5),
  uncion: () => fig(172, 168, { arms: "down", legs: "sit", face: "calm", flip: -1 }) + P("M140 146 L200 146 L200 168 M140 146 L140 168", 'stroke-width="2.5"') + fig(84, 168, { arms: "give" }) + P("M104 122 l8 0 l2 10 l-12 0 Z", 'fill="var(--il-bg,#fff)"') + drop(122, 112) + heart(170, 56, 8) + sparkle(60, 60, 5) + ground(),
  matrimonio: () => fig(96, 168, { arms: "hug" }) + fig(144, 168, { arms: "hug", flip: -1 }) + C(112, 58, 11, 'stroke="var(--il-pop, #ffba03)" stroke-width="4.5"') + C(128, 58, 11, 'stroke="currentColor" stroke-width="3"') + sparkle(70, 54, 5) + sparkle(172, 48, 6) + ground(),
  juego: () => fig(70, 168, { arms: "up", legs: "jump", face: "wow" }) + fig(170, 168, { arms: "up", flip: -1 }) + P("M86 98 Q120 26 154 98", 'stroke-dasharray="3 8"') + C(120, 58, 11, POP) + P("M112 54 q8 6 16 0 M114 64 q6 -6 12 0", 'stroke-width="1.6"') + sparkle(60, 60, 5) + sparkle(190, 64, 5) + ground(),
  celular: () => fig(96, 168, { arms: "hold", legs: "sit", face: "smile" }) + P("M104 118 h20 v30 h-20 Z", 'fill="var(--il-bg,#fff)"') + P("M110 144 h8", 'stroke-width="1.6"') + P("M146 70 h46 q6 0 6 6 v16 q0 6 -6 6 h-34 l-10 9 v-9 q-8 0 -8 -6 v-16 q0 -6 6 -6 Z", 'fill="var(--il-bg,#fff)"') + heart(169, 82, 6) + P("M150 118 h34 q5 0 5 5 v10 q0 5 -5 5 h-24 l-8 7 v-7 q-7 0 -7 -5 v-10 q0 -5 5 -5 Z", POP) + ground(),
  pizarra: () => P("M118 48 h96 v70 h-96 Z", 'fill="var(--il-bg,#fff)"') + P("M166 118 l-14 40 M166 118 l14 40", 'stroke-width="2.2"') + P("M130 64 h40 M130 78 h60 M130 92 h30", 'stroke-width="2"') + C(196, 92, 7, POP) + P("M192 92 l3 3 l6 -7", 'stroke-width="1.8"') + fig(70, 168, { arms: "give" }) + ground(),
  biblia: () => fig(80, 168, { arms: "hold", legs: "sit" }) + book(140, 130, 32) + sparkle(140, 70) + ground(),
};
// Encuentro → escena
const BY_N = {
  1: "corazon", 2: "trigo", 3: "ramos", 4: "duda", 5: "mesa", 6: "pastor", 7: "vid", 8: "amigos", 9: "envio", 10: "espiritu",
  11: "comunidad", 12: "eucaristia", 13: "familia", 14: "semilla", 15: "tormenta", 16: "levantate", 17: "descanso", 18: "panes",
  19: "biblia", 20: "camino", 21: "maria", 22: "eleccion", 23: "corazonlimpio", 24: "escuchar", 25: "pregunta", 26: "equipo",
  27: "ninos", 28: "tesoro", 29: "servir", 30: "bartimeo", 31: "amar", 32: "moneda", 33: "futuro", 34: "rey",
};
export const SCENE_KEYS = Object.keys(SCENES);
export function illus(key, cls = "") {
  const f = SCENES[key];
  if (!f) return "";
  const id = "rough" + (++uid);
  return `<svg class="z-illus ${cls}" viewBox="0 0 240 180" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
    <defs><filter id="${id}"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="${uid % 9}"/><feDisplacementMap in="SourceGraphic" scale="2.2"/></filter></defs>
    <g filter="url(#${id})">${f()}</g></svg>`;
}
export const illusFor = (e, cls) => illus(BY_N[e.n] || "camino", cls);
