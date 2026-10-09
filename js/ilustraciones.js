// Ilustraciones propias de Camino Ágape: dibujos de trazo simple, hechos a mano
// alzada con monitos de palitos, para acompañar cada encuentro. Son SVG en línea,
// usan el color del texto (currentColor) y un filtro que imita el trazo de lápiz.

let uid = 0;
const P = (d, extra = "") => `<path d="${d}" ${extra}/>`;
const C = (cx, cy, r, extra = "") => `<circle cx="${cx}" cy="${cy}" r="${r}" ${extra}/>`;
const FILL = 'fill="currentColor" stroke="none"';
const POP = 'fill="var(--il-pop, #ffba03)" stroke="currentColor"';

// Monito: x = centro, y = pies. arms: down | up | out | pray | give | wave | hold | hug
// Cuerpo «relleno»: cabeza grande, torso redondeado y brazos y piernas como tubos con contorno.
function fig(x, y, { arms = "down", legs = "stand", face = "smile", s = 1, flip = 1 } = {}) {
  s *= 1.22; // monitos protagonistas: más grandes que el resto de la escena
  const X = (dx) => +(x + dx * s * flip).toFixed(1), Y = (dy) => +(y - dy * s).toFixed(1);
  const k = (v) => +(v * s).toFixed(2);
  const tube = (d) => P(d, `stroke-width="${k(10.5)}"`) + P(d, `stroke="var(--il-bg, #fff)" stroke-width="${k(5.6)}"`);
  const L = {
    stand: `M${X(-4)} ${Y(21)} L${X(-7)} ${Y(4)} M${X(4)} ${Y(21)} L${X(7)} ${Y(4)}`,
    walk: `M${X(-3)} ${Y(21)} L${X(-7)} ${Y(12)} L${X(-14)} ${Y(4)} M${X(3)} ${Y(21)} L${X(9)} ${Y(11)} L${X(14)} ${Y(4)}`,
    kneel: `M${X(2)} ${Y(21)} L${X(13)} ${Y(13)} L${X(13)} ${Y(4)} M${X(-2)} ${Y(21)} L${X(-5)} ${Y(9)} L${X(-16)} ${Y(5)}`,
    sit: `M${X(0)} ${Y(21)} L${X(16)} ${Y(21)} L${X(18)} ${Y(4)}`,
    jump: `M${X(-4)} ${Y(21)} L${X(-12)} ${Y(10)} M${X(4)} ${Y(21)} L${X(12)} ${Y(10)}`,
  };
  const A = {
    down: `M${X(-8)} ${Y(41)} L${X(-14)} ${Y(27)} M${X(8)} ${Y(41)} L${X(14)} ${Y(27)}`,
    up: `M${X(-8)} ${Y(42)} L${X(-18)} ${Y(66)} M${X(8)} ${Y(42)} L${X(18)} ${Y(66)}`,
    out: `M${X(-8)} ${Y(42)} L${X(-23)} ${Y(44)} M${X(8)} ${Y(42)} L${X(23)} ${Y(44)}`,
    pray: `M${X(-8)} ${Y(41)} L${X(-4)} ${Y(34)} M${X(8)} ${Y(41)} L${X(4)} ${Y(34)}`,
    give: `M${X(6)} ${Y(41)} L${X(15)} ${Y(37)} L${X(25)} ${Y(41)} M${X(-5)} ${Y(40)} L${X(11)} ${Y(32)} L${X(22)} ${Y(36)}`,
    wave: `M${X(-8)} ${Y(41)} L${X(-14)} ${Y(27)} M${X(8)} ${Y(42)} L${X(16)} ${Y(54)} L${X(19)} ${Y(68)}`,
    hold: `M${X(-8)} ${Y(41)} L${X(-14)} ${Y(32)} M${X(8)} ${Y(41)} L${X(14)} ${Y(32)}`,
    hug: `M${X(-8)} ${Y(42)} L${X(-21)} ${Y(39)} M${X(8)} ${Y(42)} L${X(21)} ${Y(39)}`,
  };
  const front = arms === "pray" || arms === "give";
  let out = tube(L[legs] || L.stand);
  if (!front) out += tube(A[arms] || A.down);
  // torso redondeado
  out += P(`M${X(-9.5)} ${Y(43)} Q${X(-10)} ${Y(49)} ${X(0)} ${Y(49)} Q${X(10)} ${Y(49)} ${X(9.5)} ${Y(43)} L${X(9)} ${Y(25)} Q${X(9)} ${Y(18)} ${X(0)} ${Y(18)} Q${X(-9)} ${Y(18)} ${X(-9)} ${Y(25)} Z`, 'fill="var(--il-bg, #fff)"');
  if (front) out += tube(A[arms]);
  if (arms === "pray") out += P(`M${X(0)} ${Y(48)} C${X(-5)} ${Y(44)} ${X(-5)} ${Y(34)} ${X(0)} ${Y(32)} C${X(5)} ${Y(34)} ${X(5)} ${Y(44)} ${X(0)} ${Y(48)} Z M${X(0)} ${Y(46)} L${X(0)} ${Y(34)}`, 'fill="var(--il-bg, #fff)" stroke-width="2.4"');
  // cabeza y cara
  out += C(X(0), Y(62), k(15.5), 'fill="var(--il-bg, #fff)"');
  const eyes = C(X(-5), Y(64), k(1.7), FILL) + C(X(5), Y(64), k(1.7), FILL);
  out += C(X(-8.5), Y(59), k(2.2), 'fill="#ef591c" stroke="none" opacity=".28"') + C(X(8.5), Y(59), k(2.2), 'fill="#ef591c" stroke="none" opacity=".28"');
  if (face === "smile") out += eyes + P(`M${X(-5.5)} ${Y(58.5)} Q${X(0)} ${Y(53.5)} ${X(5.5)} ${Y(58.5)}`);
  if (face === "calm") out += P(`M${X(-7.5)} ${Y(64)} q2.5 -2.4 5 0 M${X(2.5)} ${Y(64)} q2.5 -2.4 5 0 M${X(-4.5)} ${Y(57.5)} Q${X(0)} ${Y(54)} ${X(4.5)} ${Y(57.5)}`);
  if (face === "wow") out += eyes + C(X(0), Y(56), k(2.8));
  if (face === "worry") out += eyes + P(`M${X(-5.5)} ${Y(55)} Q${X(0)} ${Y(59.5)} ${X(5.5)} ${Y(55)}`);
  return out;
}
// Jesús: mismo estilo de monito, con túnica larga, estola, cabello a los hombros, barba y aureola.
const HAIR = 'fill="#8a5a3c" stroke="currentColor"';
function jesus(x, y, { arms = "out", face = "smile", s = 1, flip = 1 } = {}) {
  s *= 1.22;
  const X = (dx) => +(x + dx * s * flip).toFixed(1), Y = (dy) => +(y - dy * s).toFixed(1);
  const k = (v) => +(v * s).toFixed(2);
  const tube = (d) => P(d, `stroke-width="${k(10.5)}"`) + P(d, `stroke="var(--il-bg, #fff)" stroke-width="${k(5.6)}"`);
  const A = {
    out: `M${X(-8)} ${Y(43)} L${X(-24)} ${Y(48)} M${X(8)} ${Y(43)} L${X(24)} ${Y(48)}`,
    open: `M${X(-8)} ${Y(43)} L${X(-22)} ${Y(56)} M${X(8)} ${Y(43)} L${X(22)} ${Y(56)}`,
    hug: `M${X(-8)} ${Y(42)} L${X(-21)} ${Y(39)} M${X(8)} ${Y(42)} L${X(21)} ${Y(39)}`,
    give: `M${X(-8)} ${Y(41)} L${X(-12)} ${Y(29)} M${X(8)} ${Y(42)} L${X(25)} ${Y(42)}`,
    bless: `M${X(-8)} ${Y(41)} L${X(-12)} ${Y(29)} M${X(8)} ${Y(42)} L${X(16)} ${Y(54)} L${X(18)} ${Y(66)}`,
    hold: `M${X(-8)} ${Y(41)} L${X(-14)} ${Y(32)} M${X(8)} ${Y(41)} L${X(14)} ${Y(32)}`,
    down: `M${X(-8)} ${Y(41)} L${X(-13)} ${Y(26)} M${X(8)} ${Y(41)} L${X(13)} ${Y(26)}`,
  };
  let out = C(X(0), Y(63), k(22), 'stroke="var(--il-pop, #ffba03)" stroke-width="' + k(3.2) + '" fill="var(--il-bg, #fff)"');
  out += P(`M${X(0)} ${Y(85)} L${X(0)} ${Y(80)} M${X(-22)} ${Y(63)} L${X(-18)} ${Y(63)} M${X(22)} ${Y(63)} L${X(18)} ${Y(63)}`, `stroke="var(--il-pop, #ffba03)" stroke-width="${k(2.4)}"`);
  // cabello largo (detrás)
  out += P(`M${X(-16)} ${Y(66)} Q${X(-18)} ${Y(50)} ${X(-15)} ${Y(42)} L${X(15)} ${Y(42)} Q${X(18)} ${Y(50)} ${X(16)} ${Y(66)} Z`, HAIR);
  out += tube(A[arms] || A.out);
  // túnica larga y pies
  out += C(X(-6), Y(3), k(3.2), 'fill="var(--il-bg, #fff)"') + C(X(6), Y(3), k(3.2), 'fill="var(--il-bg, #fff)"');
  out += P(`M${X(-9.5)} ${Y(44)} Q${X(-10)} ${Y(49)} ${X(0)} ${Y(49)} Q${X(10)} ${Y(49)} ${X(9.5)} ${Y(44)} L${X(15)} ${Y(6)} Q${X(0)} ${Y(3)} ${X(-15)} ${Y(6)} Z`, 'fill="var(--il-bg, #fff)"');
  out += P(`M${X(-6)} ${Y(47)} L${X(9)} ${Y(14)}`, `stroke="#e48a68" stroke-width="${k(4)}"`);
  // cabeza, cabello y barba
  out += C(X(0), Y(62), k(15.5), 'fill="var(--il-bg, #fff)"');
  out += P(`M${X(-15.5)} ${Y(64)} A${k(15.5)} ${k(15.5)} 0 0 ${flip > 0 ? 1 : 0} ${X(15.5)} ${Y(64)} Q${X(9)} ${Y(72)} ${X(1)} ${Y(70)} Q${X(-7)} ${Y(73)} ${X(-15.5)} ${Y(64)} Z`, HAIR);
  out += P(`M${X(-12.5)} ${Y(55)} Q${X(-11)} ${Y(46)} ${X(0)} ${Y(45.5)} Q${X(11)} ${Y(46)} ${X(12.5)} ${Y(55)} Q${X(6)} ${Y(50.5)} ${X(0)} ${Y(51)} Q${X(-6)} ${Y(50.5)} ${X(-12.5)} ${Y(55)} Z`, HAIR);
  out += C(X(-8.5), Y(59), k(2), 'fill="#ef591c" stroke="none" opacity=".25"') + C(X(8.5), Y(59), k(2), 'fill="#ef591c" stroke="none" opacity=".25"');
  if (face === "calm") out += P(`M${X(-7.5)} ${Y(63)} q2.5 -2.4 5 0 M${X(2.5)} ${Y(63)} q2.5 -2.4 5 0`);
  else out += C(X(-5), Y(63), k(1.7), FILL) + C(X(5), Y(63), k(1.7), FILL);
  out += P(`M${X(-4)} ${Y(57.5)} Q${X(0)} ${Y(54.5)} ${X(4)} ${Y(57.5)}`);
  return out;
}
// Personajes de la fe (María, José, santos): mismo monito, con vestimenta propia.
// robe: color de la túnica (larga) · len: dónde termina (0 = a los pies; >0 deja ver piernas)
// veil: color del manto/velo sobre la cabeza · band: franja del velo (Teresa de Calcuta)
// hair/beard/cap: cabello, barba, solideo · shirt/pants: ropa moderna (sin túnica) · stars: aureola con estrellas
function person(x, y, o = {}) {
  const { arms = "down", face = "smile", s0 = 1, flip = 1, robe = null, len = 0, veil = null, band = null, hair = "#8a5a3c", long = false,
    beard = null, cap = null, halo = true, stars = false, sash = null, shirt = null, pants = null, belt = null, cape = null, collar = null } = o;
  const s = s0 * 1.22;
  const X = (dx) => +(x + dx * s * flip).toFixed(1), Y = (dy) => +(y - dy * s).toFixed(1);
  const k = (v) => +(v * s).toFixed(2);
  const tube = (d, c = "var(--il-bg, #fff)") => P(d, `stroke-width="${k(10.5)}"`) + P(d, `stroke="${c}" stroke-width="${k(5.6)}"`);
  const F = (c) => `fill="${c}" stroke="currentColor"`;
  const A = {
    down: `M${X(-8)} ${Y(41)} L${X(-13)} ${Y(26)} M${X(8)} ${Y(41)} L${X(13)} ${Y(26)}`,
    out: `M${X(-8)} ${Y(43)} L${X(-24)} ${Y(48)} M${X(8)} ${Y(43)} L${X(24)} ${Y(48)}`,
    open: `M${X(-8)} ${Y(43)} L${X(-22)} ${Y(56)} M${X(8)} ${Y(43)} L${X(22)} ${Y(56)}`,
    up: `M${X(-8)} ${Y(42)} L${X(-18)} ${Y(66)} M${X(8)} ${Y(42)} L${X(18)} ${Y(66)}`,
    hug: `M${X(-8)} ${Y(42)} L${X(-21)} ${Y(39)} M${X(8)} ${Y(42)} L${X(21)} ${Y(39)}`,
    hold: `M${X(-8)} ${Y(41)} L${X(-14)} ${Y(32)} M${X(8)} ${Y(41)} L${X(14)} ${Y(32)}`,
    give: `M${X(-8)} ${Y(41)} L${X(-12)} ${Y(29)} M${X(8)} ${Y(42)} L${X(25)} ${Y(42)}`,
    wave: `M${X(-8)} ${Y(41)} L${X(-13)} ${Y(27)} M${X(8)} ${Y(42)} L${X(16)} ${Y(54)} L${X(19)} ${Y(68)}`,
    raise: `M${X(-8)} ${Y(41)} L${X(-16)} ${Y(34)} M${X(8)} ${Y(42)} L${X(14)} ${Y(58)} L${X(13)} ${Y(74)}`,
    pray: `M${X(-8)} ${Y(41)} L${X(-4)} ${Y(34)} M${X(8)} ${Y(41)} L${X(4)} ${Y(34)}`,
  };
  const armC = shirt || robe || "var(--il-bg, #fff)";
  let out = "";
  if (halo) {
    out += C(X(0), Y(63), k(22), `stroke="var(--il-pop, #ffba03)" stroke-width="${k(3.2)}" fill="var(--il-bg, #fff)"`);
    if (stars) out += [...Array(12)].map((_, i) => { const a = Math.PI * (0.1 + i * 0.8 / 11); return C(+(X(0) - Math.cos(a) * k(22)).toFixed(1), +(Y(63) - Math.sin(a) * k(22)).toFixed(1), k(1.6), 'fill="var(--il-pop, #ffba03)" stroke="currentColor" stroke-width="1"'); }).join("");
  }
  if (cape) out += P(`M${X(-10)} ${Y(46)} L${X(-19)} ${Y(8)} L${X(19)} ${Y(8)} L${X(10)} ${Y(46)} Z`, F(cape));
  if (veil) out += P(`M${X(-14)} ${Y(72)} Q${X(-22)} ${Y(50)} ${X(-20)} ${Y(len ? 30 : 12)} L${X(20)} ${Y(len ? 30 : 12)} Q${X(22)} ${Y(50)} ${X(14)} ${Y(72)} Z`, F(veil));
  else if (long && hair) out += P(`M${X(-16)} ${Y(66)} Q${X(-18)} ${Y(50)} ${X(-15)} ${Y(42)} L${X(15)} ${Y(42)} Q${X(18)} ${Y(50)} ${X(16)} ${Y(66)} Z`, F(hair));
  const front = arms === "pray";
  if (!front) out += tube(A[arms] || A.down, armC);
  // piernas o pies
  if (!robe || len) out += tube(`M${X(-4)} ${Y(21)} L${X(-6)} ${Y(4)} M${X(4)} ${Y(21)} L${X(6)} ${Y(4)}`, pants || "var(--il-bg, #fff)");
  else out += C(X(-6), Y(3), k(3.2), 'fill="var(--il-bg, #fff)"') + C(X(6), Y(3), k(3.2), 'fill="var(--il-bg, #fff)"');
  // cuerpo
  if (robe) { const b = len ? len : 6, w = len ? 12 : 15;
    out += P(`M${X(-9.5)} ${Y(44)} Q${X(-10)} ${Y(49)} ${X(0)} ${Y(49)} Q${X(10)} ${Y(49)} ${X(9.5)} ${Y(44)} L${X(w)} ${Y(b)} Q${X(0)} ${Y(b - 3)} ${X(-w)} ${Y(b)} Z`, F(robe)); }
  else out += P(`M${X(-9.5)} ${Y(43)} Q${X(-10)} ${Y(49)} ${X(0)} ${Y(49)} Q${X(10)} ${Y(49)} ${X(9.5)} ${Y(43)} L${X(9)} ${Y(23)} Q${X(9)} ${Y(18)} ${X(0)} ${Y(18)} Q${X(-9)} ${Y(18)} ${X(-9)} ${Y(23)} Z`, F(shirt || "var(--il-bg, #fff)"));
  if (band && robe) out += P(`M${X(-14)} ${Y(10)} Q${X(0)} ${Y(7)} ${X(14)} ${Y(10)}`, `stroke="${band}" stroke-width="${k(2.4)}"`);
  if (sash) out += P(`M${X(-6)} ${Y(47)} L${X(9)} ${Y(14)}`, `stroke="${sash}" stroke-width="${k(4)}"`);
  if (belt) out += P(`M${X(-9.6)} ${Y(30)} L${X(9.6)} ${Y(30)}`, `stroke="${belt}" stroke-width="${k(3)}"`);
  if (collar) out += P(`M${X(-3)} ${Y(48)} L${X(3)} ${Y(48)}`, `stroke="${collar}" stroke-width="${k(3)}"`);
  if (front) out += tube(A.pray, armC) + P(`M${X(0)} ${Y(48)} C${X(-5)} ${Y(44)} ${X(-5)} ${Y(34)} ${X(0)} ${Y(32)} C${X(5)} ${Y(34)} ${X(5)} ${Y(44)} ${X(0)} ${Y(48)} Z`, 'fill="var(--il-bg, #fff)" stroke-width="2.4"');
  // cabeza
  out += C(X(0), Y(62), k(15.5), 'fill="var(--il-bg, #fff)"');
  const sw = flip > 0 ? 1 : 0;
  if (veil) out += P(`M${X(-16.5)} ${Y(60)} A${k(16.5)} ${k(16.5)} 0 0 ${sw} ${X(16.5)} ${Y(60)} Q${X(9)} ${Y(73)} ${X(0)} ${Y(72.5)} Q${X(-9)} ${Y(73)} ${X(-16.5)} ${Y(60)} Z`, F(veil))
    + (band ? P(`M${X(-14.5)} ${Y(61)} Q${X(-8)} ${Y(71)} ${X(0)} ${Y(70.5)} Q${X(8)} ${Y(71)} ${X(14.5)} ${Y(61)}`, `stroke="${band}" stroke-width="${k(2.2)}"`) : "");
  else if (hair) out += P(`M${X(-15.5)} ${Y(64)} A${k(15.5)} ${k(15.5)} 0 0 ${sw} ${X(15.5)} ${Y(64)} Q${X(9)} ${Y(72)} ${X(1)} ${Y(70)} Q${X(-7)} ${Y(73)} ${X(-15.5)} ${Y(64)} Z`, F(hair));
  if (cap) out += P(`M${X(-9)} ${Y(74.5)} Q${X(0)} ${Y(82)} ${X(9)} ${Y(74.5)} Z`, F(cap));
  if (beard) out += P(`M${X(-12.5)} ${Y(55)} Q${X(-11)} ${Y(46)} ${X(0)} ${Y(45.5)} Q${X(11)} ${Y(46)} ${X(12.5)} ${Y(55)} Q${X(6)} ${Y(50.5)} ${X(0)} ${Y(51)} Q${X(-6)} ${Y(50.5)} ${X(-12.5)} ${Y(55)} Z`, F(beard));
  out += C(X(-8.5), Y(59), k(2), 'fill="#ef591c" stroke="none" opacity=".25"') + C(X(8.5), Y(59), k(2), 'fill="#ef591c" stroke="none" opacity=".25"');
  if (face === "calm") out += P(`M${X(-7.5)} ${Y(63)} q2.5 -2.4 5 0 M${X(2.5)} ${Y(63)} q2.5 -2.4 5 0`);
  else out += C(X(-5), Y(63), k(1.7), FILL) + C(X(5), Y(63), k(1.7), FILL);
  out += P(`M${X(-4.5)} ${Y(57.5)} Q${X(0)} ${Y(54)} ${X(4.5)} ${Y(57.5)}`);
  return out;
}
const MANTO = "#8ad2fa", CAFE = "#8a5a3c", CANA = "#d9d4cc", ROJO = "#e48a68", NAVY = "#1d2c55";
const lily = (x, y, h = 46) => P(`M${x} ${y} L${x} ${y - h}`, 'stroke-width="2.4"') + P(`M${x} ${y - h} q-8 -4 -6 -12 q4 4 6 4 q2 0 6 -4 q2 8 -6 12 Z`, 'fill="var(--il-bg,#fff)"') + P(`M${x} ${y - h * .55} q-8 -2 -10 -8 M${x} ${y - h * .4} q8 -2 10 -8`, 'stroke-width="2"');
const mountains = () => P("M0 168 L50 96 L80 128 L120 70 L160 120 L190 94 L240 168", 'fill="var(--il-bg,#fff)"') + P("M108 86 L120 70 L132 86 Q120 82 108 86 Z M182 104 L190 94 L198 104 Q190 101 182 104 Z", 'fill="var(--il-bg,#fff)" stroke-width="2"');
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
  // María, José y la Sagrada Familia
  virgen: () => person(120, 170, { arms: "pray", robe: "var(--il-bg,#fff)", veil: MANTO, stars: true, face: "calm" }) + sparkle(70, 70, 5) + sparkle(186, 60) + P("M150 168 q6 -16 14 -6 q6 -12 12 2 q-4 8 -12 4 q-8 6 -14 0 Z M70 168 q6 -14 12 -4 q6 -10 10 2 q-6 6 -11 3 q-6 4 -11 -1 Z", POP) + ground(),
  jose: () => person(110, 170, { arms: "hold", robe: "#d7c49e", hair: CAFE, beard: CAFE, sash: "#9bbf8a" }) + lily(136, 150) + sparkle(186, 64, 5) + ground(),
  sagradafamilia: () => person(70, 170, { arms: "hug", robe: "#d7c49e", hair: CAFE, beard: CAFE, s0: .9 }) + person(170, 170, { arms: "hug", robe: "var(--il-bg,#fff)", veil: MANTO, flip: -1, s0: .9 }) + person(120, 170, { arms: "up", robe: "var(--il-bg,#fff)", sash: ROJO, hair: CAFE, s0: .55 }) + heart(120, 34, 8) + ground(),
  apostoles: () => [42, 82, 158, 198].map((x, i) => person(x, 170, { arms: i === 0 ? "hold" : i === 3 ? "wave" : "down", robe: ["#d7c49e", "#cfe6c4", "#f3dc9f", "#fde0d2"][i], beard: i % 2 ? null : CAFE, hair: i === 2 ? "#3b2a20" : CAFE, halo: false, flip: x > 120 ? -1 : 1, s0: .72 })).join("")
    + jesus(120, 170, { arms: "open", s: .85 }) + P("M50 128 a5 5 0 1 0 10 0 a5 5 0 1 0 -10 0 M55 133 l0 14 l4 0 M55 142 l4 0", 'stroke="var(--il-pop,#ffba03)" stroke-width="2.6"') + ground(),
  // Santos
  sanmiguel: () => P("M100 118 q-44 -20 -60 -56 q30 6 44 24 q-14 -16 -8 -34 q22 18 30 52 Z M140 118 q44 -20 60 -56 q-30 6 -44 24 q14 -16 8 -34 q-22 18 -30 52 Z", 'fill="var(--il-bg,#fff)"')
    + person(120, 170, { arms: "raise", robe: MANTO, len: 0, hair: "#e0b04a", belt: "var(--il-pop,#ffba03)", cape: ROJO })
    + P("M136 80 L150 22 M142 84 L132 80 M145 70 l-10 -3", 'stroke-width="3.5"') + P("M150 22 L147 34", 'stroke="#fff" stroke-width="1.6"') + P("M84 120 q12 -6 22 0 l-2 22 q-9 8 -18 0 Z", 'fill="var(--il-pop,#ffba03)" stroke="currentColor"') + P("M95 124 L95 140 M89 130 L101 130", 'stroke-width="2.2"') + ground(),
  sansebastian: () => P("M196 168 L196 60 M196 92 l-18 -20 M196 80 l16 -14", 'stroke-width="5"') + person(110, 170, { arms: "hold", robe: "#f3dc9f", len: 20, hair: CAFE, cape: ROJO, belt: CAFE, pants: "var(--il-bg,#fff)" })
    + P("M88 128 q-14 -26 -6 -52 M88 128 q-4 -24 8 -44", 'stroke="#5e9a5a" stroke-width="2.6"') + P("M84 96 l-8 -2 M86 108 l-9 0 M90 100 l8 -6", 'stroke="#5e9a5a" stroke-width="2"')
    + P("M128 136 L150 92 M132 138 L158 98", 'stroke-width="2.2"') + P("M150 92 l-6 2 l4 -7 Z M158 98 l-6 2 l4 -7 Z", 'fill="currentColor"') + ground(),
  juanpablo: () => person(110, 170, { arms: "wave", robe: "var(--il-bg,#fff)", hair: CANA, cap: "var(--il-bg,#fff)", sash: null, flip: -1 }) + P("M86 168 L86 66 M86 70 q-8 -4 -12 2 M86 70 q8 -4 12 2 M80 78 L92 78", 'stroke-width="3"') + C(86, 66, 3, POP) + heart(160, 60, 8) + sparkle(190, 90, 5) + ground(),
  teresacalcuta: () => person(100, 170, { arms: "pray", robe: "var(--il-bg,#fff)", veil: "var(--il-bg,#fff)", band: "#3d7fd1", face: "calm" }) + fig(166, 168, { arms: "hug", s: .55, flip: -1 }) + heart(140, 70, 9) + ground(),
  carloacutis: () => person(100, 170, { arms: "hold", shirt: "#e05a4f", pants: "#5b86c5", hair: "#3b2a20", halo: true })
    + P("M112 118 h40 v28 h-40 Z", 'fill="var(--il-bg,#fff)"') + P("M106 146 h52 l-4 6 h-44 Z", 'fill="var(--il-bg,#fff)"') + C(132, 132, 7, POP) + P("M128 132 h8 M132 128 v8", 'stroke-width="1.6"')
    + P("M86 120 q-6 2 -8 12", 'stroke-width="2"') + sparkle(186, 70) + ground(),
  // Santos de Chile
  teresaandes: () => mountains() + person(120, 172, { arms: "pray", robe: "#9b7a5a", veil: NAVY, collar: "#fff", face: "calm" }) + sparkle(200, 50, 5) + sparkle(40, 60, 5),
  albertohurtado: () => person(80, 170, { arms: "give", robe: NAVY, hair: "#3b2a20", collar: "#fff" }) + fig(126, 168, { arms: "up", s: .55, flip: -1 })
    + P("M150 168 L150 132 L188 132 L200 146 L216 148 L216 168 Z", 'fill="#9bbf8a" stroke="currentColor"') + P("M190 136 L198 146 L190 146 Z", 'fill="var(--il-bg,#fff)"') + C(162, 168, 7, 'fill="var(--il-bg,#fff)"') + C(204, 168, 7, 'fill="var(--il-bg,#fff)"') + heart(168, 118, 6) + ground(),
  lauravicuna: () => person(110, 170, { arms: "hold", robe: NAVY, len: 22, hair: "#3b2a20", long: true, collar: "#fff", pants: "var(--il-bg,#fff)" }) + lily(140, 150, 50) + sparkle(70, 60) + sparkle(180, 70, 5) + ground(),
  santoschile: () => mountains() + person(80, 172, { arms: "pray", robe: "#9b7a5a", veil: NAVY, collar: "#fff", face: "calm", s0: .82 }) + person(162, 172, { arms: "wave", robe: NAVY, hair: "#3b2a20", collar: "#fff", s0: .82, flip: -1 }),
  virgencarmen: () => P("M196 168 L196 66", 'stroke-width="3"') + P("M196 68 h40 v13 h-40 Z", 'fill="var(--il-bg,#fff)"') + P("M196 81 h40 v13 h-40 Z", 'fill="#e05a4f" stroke="currentColor"') + P("M196 68 h14 v13 h-14 Z", 'fill="#3d6fc4" stroke="currentColor"') + C(203, 74.5, 2.2, 'fill="#fff" stroke="none"')
    + person(104, 170, { arms: "hold", robe: "#8a5a3c", veil: "var(--il-bg,#fff)", stars: true, face: "calm" }) + person(126, 134, { arms: "open", robe: "var(--il-bg,#fff)", hair: CAFE, s0: .42 })
    + P("M92 70 L95 58 L101 65 L104 54 L107 65 L113 58 L116 70 Z", POP) + P("M70 120 h12 v14 h-12 Z M70 120 q6 -10 12 0", 'fill="#8a5a3c" stroke="currentColor" stroke-width="2"') + ground(10, 180),
  fraiandresito: () => person(96, 170, { arms: "hold", robe: "#8a6a4a", hair: CANA, beard: CANA, belt: "#f3e6c8", halo: false })
    + P("M108 126 q14 -2 22 6 l-4 22 q-12 6 -22 -2 Z", 'fill="#d7c49e" stroke="currentColor"') + P("M112 126 q4 -10 14 -4", 'stroke-width="2"') + fig(166, 168, { arms: "out", s: .55, flip: -1 }) + heart(150, 76, 8) + ground(),
  ceferino: () => P("M190 168 L190 74", 'stroke-width="4"') + P("M172 76 q18 -16 36 0 M168 94 q22 -14 44 0 M164 112 q26 -14 52 0 M160 130 q30 -14 60 0", 'stroke="#5e9a5a" stroke-width="3.2"')
    + person(104, 170, { arms: "pray", robe: "#2a2a33", hair: "#1b1410", collar: "#fff", face: "calm" }) + sparkle(50, 60) + sparkle(150, 46, 5) + ground(),
  donbosco: () => person(84, 170, { arms: "open", robe: "#2a2a33", hair: "#3b2a20", collar: "#fff" }) + fig(148, 168, { arms: "up", legs: "jump", face: "wow", s: .55, flip: -1 }) + fig(192, 168, { arms: "wave", s: .5, flip: -1 })
    + C(170, 70, 8, POP) + P("M164 66 q6 4 12 0 M170 62 L170 78", 'stroke-width="1.5"') + sparkle(40, 50, 5) + ground(),
  domingosavio: () => person(108, 170, { arms: "pray", shirt: "#2a2a33", pants: "#2a2a33", hair: "#3b2a20", collar: "#fff", face: "calm" }) + lily(154, 158, 56) + sparkle(60, 64) + sparkle(190, 60, 5) + ground(),
  franciscoasis: () => person(100, 170, { arms: "open", robe: "#8a6a4a", hair: CAFE, beard: CAFE, belt: "#f3e6c8" }) + dove(196, 70) + P("M60 168 q4 -14 10 -4 q4 -12 10 2 Z M170 168 q4 -14 10 -4 q4 -12 10 2 Z", 'fill="#9bbf8a" stroke="currentColor"') + sun(40, 46, 9) + ground(),
  rosalima: () => person(110, 170, { arms: "hold", robe: "var(--il-bg,#fff)", veil: "#2a2a33", face: "calm" })
    + [[96, 79], [102, 75], [110, 73], [118, 75], [124, 79]].map(([x, y]) => C(x, y, 3.6, 'fill="#e05a6a" stroke="currentColor" stroke-width="1.4"')).join("")
    + [[126, 128], [134, 124], [130, 134]].map(([x, y]) => C(x, y, 4.6, 'fill="#e05a6a" stroke="currentColor" stroke-width="1.6"')).join("") + P("M128 136 L122 150", 'stroke="#5e9a5a" stroke-width="2.4"') + sparkle(60, 60) + sparkle(186, 70, 5) + ground(),
  frassati: () => mountains() + person(112, 172, { arms: "raise", shirt: "#5e7a5a", pants: "#8a6a4a", hair: "#3b2a20" }) + P("M128 84 L140 168", 'stroke-width="3"') + P("M124 82 l10 -4", 'stroke-width="3"') + sun(206, 36, 9),
  teresita: () => person(104, 170, { arms: "hold", robe: "#8a6a4a", veil: "#2a2a33", collar: "#fff", face: "calm" }) + P("M120 116 L120 146 M112 124 L128 124", 'stroke-width="3"')
    + [[60, 50], [180, 44], [196, 82], [48, 96], [164, 110], [142, 58]].map(([x, y]) => C(x, y, 4.4, 'fill="#e05a6a" stroke="currentColor" stroke-width="1.6"')).join("") + ground(),
  guadalupe: () => [...Array(18)].map((_, i) => { const a = Math.PI * 2 * i / 18; return P(`M${(120 + Math.cos(a) * 40).toFixed(1)} ${(108 + Math.sin(a) * 64).toFixed(1)} L${(120 + Math.cos(a) * 54).toFixed(1)} ${(108 + Math.sin(a) * 80).toFixed(1)}`, 'stroke="var(--il-pop,#ffba03)" stroke-width="3"'); }).join("")
    + person(120, 166, { arms: "pray", robe: "#f2b8a8", veil: "#3f8f7f", stars: false, face: "calm" }) + [[104, 112], [136, 112], [102, 130], [138, 130], [106, 148], [134, 148]].map(([x, y]) => C(x, y, 1.8, 'fill="var(--il-pop,#ffba03)" stroke="none"')).join("")
    + P("M98 170 q22 12 44 0 q-22 4 -44 0 Z", 'fill="#2a2a33" stroke="currentColor"'),
  // Jesús
  jesus: () => jesus(120, 170, { arms: "open" }) + sparkle(56, 60) + sparkle(186, 52, 5) + heart(190, 110, 8) + ground(),
  emaus: () => road() + fig(62, 168, { arms: "out", legs: "walk", s: .75 }) + jesus(118, 150, { arms: "give", s: .78 }) + fig(176, 136, { arms: "down", legs: "walk", s: .65, flip: -1 }) + sun(206, 34, 9),
  dejadlos: () => jesus(120, 170, { arms: "hug" }) + fig(72, 168, { arms: "up", s: .55 }) + fig(168, 168, { arms: "wave", s: .55, flip: -1 }) + fig(196, 168, { arms: "up", s: .45, flip: -1 }) + heart(120, 34, 8) + ground(),
  buenpastor: () => jesus(96, 170, { arms: "hold" }) + sheep(104, 144) + sheep(160, 166) + sheep(200, 160) + sparkle(190, 60) + ground(),
  sagradocorazon: () => jesus(120, 170, { arms: "bless" }) + heart(120, 122, 10) + flame(120, 112, .4) + sparkle(60, 70) + sparkle(182, 70, 5) + ground(),
  // llegar, acogida, puerta abierta
  acogida: () => P("M150 168 L150 70 L205 70 L205 168", 'fill="var(--il-bg,#fff)"') + P("M150 70 L128 82 L128 176 L150 168", 'fill="var(--il-pop,#ffba03)" stroke="currentColor"') + fig(178, 166, { arms: "out" }) + fig(80, 168, { arms: "wave", legs: "walk" }) + heart(115, 60, 10) + ground(10, 130),
  corazon: () => fig(120, 168, { arms: "hold" }) + heart(120, 128, 22) + sparkle(70, 70) + sparkle(178, 56, 5) + ground(),
  luz: () => fig(96, 168, { arms: "give" }) + P("M128 118 l0 -10 l14 0 l0 10 l-3 18 l-8 0 Z", 'fill="var(--il-bg,#fff)"') + flame(135, 130, .7) + P("M150 110 l20 -8 M152 124 l24 0 M150 138 l20 8 M128 100 l-6 -14 M142 100 l6 -14", 'stroke-width="2"') + ground(),
  trigo: () => P("M120 168 L120 70", 'stroke-width="3"') + [0, 1, 2, 3, 4].map((i) => P(`M120 ${80 + i * 14} q-14 -4 -16 -16 q12 2 16 12 M120 ${80 + i * 14} q14 -4 16 -16 q-12 2 -16 12`, POP)).join("") + P("M60 168 q10 -26 30 -30 M60 168 q-6 -18 -20 -22", 'stroke-width="2.5"') + ground(),
  ramos: () => fig(70, 168, { arms: "up" }) + fig(170, 168, { arms: "up", flip: -1 }) + P("M54 98 q-16 -40 6 -64 M54 98 q-6 -30 18 -50", 'stroke-width="2.5"') + P("M186 98 q16 -40 -6 -64 M186 98 q6 -30 -18 -50", 'stroke-width="2.5"') + [0, 1, 2, 3].map((i) => P(`M${48 - i * 2} ${80 - i * 12} l-10 -4 M${190 + i * 2} ${80 - i * 12} l10 -4`, 'stroke-width="2"')).join("") + P("M100 110 L120 90 L140 110", 'stroke-width="2"') + ground(),
  duda: () => fig(80, 168, { arms: "hold", face: "worry" }) + jesus(165, 170, { arms: "open" }) + P("M60 44 q0 -18 14 -18 q14 0 12 14 q-2 8 -10 10 l0 8 M76 66 l0 2", 'stroke-width="3"') + heart(165, 56, 7) + ground(),
  mesa: () => P("M40 130 L200 130 M60 130 L60 168 M180 130 L180 168", 'stroke-width="3"') + fig(80, 128, { arms: "hold", s: .75 }) + fig(160, 128, { arms: "hold", s: .75 }) + jesus(120, 129, { arms: "give", s: .78 }) + bread(140, 126, 10) + C(96, 124, 6, 'fill="var(--il-bg,#fff)"') + sparkle(120, 30, 5),
  pastor: () => jesus(70, 170, { arms: "hold" }) + P("M88 168 L88 92 q0 -14 12 -12 q8 2 6 12", 'stroke-width="3"') + sheep(140, 166) + sheep(190, 160) + sheep(165, 138) + ground(),
  vid: () => P("M30 60 C 80 40, 150 80, 210 50", 'stroke-width="3.5"') + [50, 90, 130, 170].map((x, i) => P(`M${x} ${56 + (i % 2) * 8} q-6 16 4 26`) + [0, 1, 2, 3, 4, 5].map((j) => C(x + 4 + (j % 3) * 7 - 7, 88 + Math.floor(j / 3) * 7 + (i % 2) * 8, 4, POP)).join("") + P(`M${x + 8} ${54 + (i % 2) * 8} q12 -12 20 0 q-8 10 -20 0`, 'fill="var(--il-bg,#fff)"')).join("") + fig(120, 172, { arms: "up", s: .7 }),
  amigos: () => fig(90, 168, { arms: "hug" }) + fig(150, 168, { arms: "hug", flip: -1 }) + heart(120, 60, 12) + ground(),
  envio: () => P("M20 168 L90 80 L130 128 L160 96 L230 168", 'fill="var(--il-bg,#fff)"') + fig(92, 80, { arms: "wave", s: .7 }) + P("M110 44 l40 -10 M112 30 l30 -18", 'stroke-width="2"') + sun(190, 40, 10),
  espiritu: () => dove(130, 50) + [70, 120, 170].map((x) => fig(x, 168, { arms: "up", s: .85 }) + flame(x, 84, .45)).join(""),
  comunidad: () => [60, 100, 140, 180].map((x, i) => fig(x, 168, { arms: "out", s: .85, face: i % 2 ? "smile" : "calm" })).join("") + sun(120, 42, 12) + ground(),
  eucaristia: () => P("M100 90 L140 90 L132 128 L108 128 Z M120 128 L120 150 M104 152 L136 152", 'fill="var(--il-bg,#fff)"') + C(120, 70, 16, POP) + P("M112 70 L128 70 M120 62 L120 78", 'stroke-width="2"') + fig(60, 168, { arms: "pray", legs: "kneel", face: "calm" }) + fig(185, 168, { arms: "pray", legs: "kneel", face: "calm", flip: -1 }) + ground(),
  familia: () => P("M60 168 L60 96 L120 56 L180 96 L180 168", 'fill="var(--il-bg,#fff)"') + fig(100, 168, { arms: "hug", s: .8 }) + fig(140, 168, { arms: "hug", s: .8, flip: -1 }) + fig(120, 168, { arms: "up", s: .5 }) + heart(120, 84, 8),
  semilla: () => fig(60, 168, { arms: "give", legs: "walk" }) + [120, 150, 180, 210].map((x, i) => P(`M${x} 168 l0 ${-8 - i * 10}`) + P(`M${x} ${160 - i * 10} q-10 -6 -12 -14 q10 0 12 10 M${x} ${160 - i * 10} q10 -6 12 -14 q-10 0 -12 10`, POP)).join("") + [84, 92, 100].map((x) => C(x, 132 + (x - 84) / 2, 1.8, FILL)).join("") + ground(),
  tormenta: () => wave(150) + wave(162) + P("M60 140 L180 140 L160 162 L80 162 Z", 'fill="var(--il-bg,#fff)"') + fig(100, 140, { arms: "up", s: .7, face: "worry" }) + jesus(148, 141, { arms: "open", s: .66, face: "calm" }) + P("M120 140 L120 70 M120 76 L160 128 L120 128", 'fill="var(--il-bg,#fff)"') + cloud(52, 58) + P("M42 64 l-6 12 l6 0 l-6 12", 'stroke-width="2.5"'),
  levantate: () => jesus(86, 170, { arms: "give" }) + fig(150, 150, { arms: "up", legs: "sit", s: .8, flip: -1 }) + P("M120 160 L190 160", 'stroke-width="2"') + sparkle(170, 70) + ground(),
  descanso: () => P("M170 168 L170 100", 'stroke-width="5"') + C(170, 80, 36, 'fill="var(--il-bg,#fff)"') + fig(120, 168, { arms: "down", legs: "sit", face: "calm" }) + sun(50, 44, 10) + ground(),
  panes: () => P("M70 150 q50 30 100 0 L160 130 L80 130 Z", 'fill="var(--il-bg,#fff)"') + [95, 120, 145].map((x) => bread(x, 130, 12)).join("") + bread(108, 118, 11) + bread(132, 118, 11) + fish(100, 96) + fish(142, 90) + sparkle(60, 60) + sparkle(190, 60, 5),
  camino: () => road() + fig(70, 150, { arms: "down", legs: "walk", s: .7 }) + fig(100, 128, { arms: "out", legs: "walk", s: .6 }) + sun(200, 40, 10) + flame(210, 100, .5),
  maria: () => person(158, 170, { arms: "pray", robe: "var(--il-bg,#fff)", veil: MANTO, stars: true, face: "calm", s0: .86 })
    + fig(72, 168, { arms: "give", face: "smile", s: .8 }) + P("M100 132 l8 -18 M104 134 l14 -14 M98 128 l2 -20", 'stroke="#5e9a5a" stroke-width="2.4"')
    + C(108, 112, 5, 'fill="#e05a6a" stroke="currentColor" stroke-width="1.6"') + C(119, 118, 5, 'fill="var(--il-bg,#fff)" stroke="currentColor" stroke-width="1.6"') + C(100, 106, 5, 'fill="var(--il-pop,#ffba03)" stroke="currentColor" stroke-width="1.6"')
    + heart(118, 60, 8) + sparkle(40, 56, 5) + ground(),
  eleccion: () => fig(120, 168, { arms: "out", face: "wow" }) + P("M40 168 L100 120 M200 168 L140 120", 'stroke-dasharray="3 8"') + heart(56, 80, 10) + P("M180 70 l0 24 M168 82 l24 0", 'stroke-width="3"'),
  corazonlimpio: () => fig(120, 168, { arms: "hold" }) + heart(120, 128, 20) + P("M74 62 q6 -10 12 0 M156 50 q6 -10 12 0 M186 88 q6 -10 12 0", 'stroke-width="2"') + P("M60 100 q20 -30 40 0", 'stroke-dasharray="2 6"'),
  escuchar: () => fig(90, 168, { arms: "wave", face: "calm" }) + P("M112 100 q10 0 10 10 M112 90 q20 0 20 20", 'stroke-width="2"') + fig(165, 168, { arms: "give", flip: -1 }) + P("M150 70 q-8 -12 4 -18 q12 -4 14 8", 'stroke-width="2"') + ground(),
  pregunta: () => fig(120, 168, { arms: "down", face: "calm" }) + P("M70 60 q0 -18 14 -18 q14 0 12 14 q-2 8 -10 10 l0 8 M86 82 l0 2", 'stroke-width="3"') + crossHill(180, 168).replace(/stroke-width="4"/, 'stroke-width="3"'),
  equipo: () => [70, 120, 170].map((x, i) => fig(x, 168, { arms: i === 1 ? "up" : "hug", s: .85, flip: i === 2 ? -1 : 1 })).join("") + sparkle(120, 50) + ground(),
  ninos: () => fig(100, 168, { arms: "hug" }) + fig(140, 168, { arms: "up", s: .55 }) + fig(160, 168, { arms: "wave", s: .5 }) + heart(130, 70, 10) + ground(),
  tesoro: () => fig(80, 168, { arms: "give", face: "calm" }) + P("M140 150 L200 150 L200 168 L140 168 Z", 'fill="var(--il-bg,#fff)"') + P("M140 150 q30 -26 60 0", 'fill="var(--il-pop,#ffba03)" stroke="currentColor"') + sparkle(170, 110) + ground(),
  servir: () => fig(80, 168, { arms: "give", legs: "kneel" }) + P("M110 160 q20 14 40 0 L146 150 L114 150 Z", 'fill="var(--il-bg,#fff)"') + fig(170, 168, { arms: "down", legs: "sit", s: .85, flip: -1 }) + P("M118 146 q4 -8 8 0 M128 142 q4 -8 8 0", 'stroke-width="1.5"') + ground(),
  bartimeo: () => fig(84, 168, { arms: "up", legs: "jump", face: "wow" }) + jesus(170, 170, { arms: "give", flip: -1, s: .9 }) + P("M24 150 q20 -20 40 -6 q-10 16 -40 6 Z", 'fill="var(--il-pop,#ffba03)" stroke="currentColor"') + sparkle(170, 60) + sparkle(70, 70, 5) + ground(),
  amar: () => fig(70, 168, { arms: "up" }) + fig(170, 168, { arms: "up", flip: -1 }) + heart(120, 70, 18) + P("M92 100 l12 -10 M148 100 l-12 -10", 'stroke-width="2"') + ground(),
  moneda: () => P("M100 60 q14 -10 30 0 l-4 14 l-22 0 Z", 'fill="var(--il-bg,#fff)"') + C(108, 100, 7, POP) + C(126, 112, 7, POP) + P("M80 150 L160 150 L152 168 L88 168 Z", 'fill="var(--il-bg,#fff)"') + fig(190, 168, { arms: "give", s: .8, flip: -1, face: "calm" }),
  futuro: () => sun(120, 110, 22) + P("M20 150 q50 -20 100 0 t100 0", 'stroke-width="3"') + fig(60, 150, { arms: "up", s: .6 }) + P("M150 60 q6 -10 12 0 M180 80 q6 -10 12 0", 'stroke-width="2"'),
  rey: () => P("M98 74 L102 48 L112 61 L120 40 L128 61 L138 48 L142 74 Z", 'fill="var(--il-pop,#ffba03)" stroke="currentColor"') + jesus(120, 178, { arms: "open", face: "calm", s: .85 }) + P("M70 176 L170 176", 'stroke-width="2"') + sparkle(60, 60) + sparkle(185, 56, 5),
  oracion: () => fig(110, 168, { arms: "pray", legs: "kneel", face: "calm" }) + candle(170, 168) + sparkle(60, 60, 5) + ground(),
  santos: () => [60, 100, 140, 180].map((x, i) => fig(x, 168, { arms: i % 2 ? "up" : "out", s: .85, face: i === 1 ? "calm" : "smile" }) + P(`M${x - 11} ${+(168 - 81 * .85 * 1.22).toFixed(1)} a11 4 0 1 0 22 0 a11 4 0 1 0 -22 0`, 'stroke="var(--il-pop, #ffba03)" stroke-width="3"')).join("") + sparkle(30, 50, 6) + sparkle(210, 40, 7) + sparkle(120, 28, 5) + ground(),
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
const NAMES = { jesus: "Jesús", emaus: "Jesús en Emaús", dejadlos: "Jesús y los niños", buenpastor: "Buen Pastor", sagradocorazon: "Sagrado Corazón", corazonlimpio: "Corazón limpio", eucaristia: "Eucaristía", espiritu: "Espíritu Santo", maria: "María", oracion: "Oración", acogida: "Acogida", levantate: "Levántate", eleccion: "Elección", uncion: "Unción", ninos: "Niños", rey: "Cristo Rey", virgen: "Virgen María", jose: "San José", sagradafamilia: "Sagrada Familia", apostoles: "Los apóstoles", sanmiguel: "San Miguel Arcángel", sansebastian: "San Sebastián", juanpablo: "San Juan Pablo II", teresacalcuta: "Santa Teresa de Calcuta", carloacutis: "San Carlo Acutis", teresaandes: "Santa Teresa de los Andes", albertohurtado: "San Alberto Hurtado", lauravicuna: "Beata Laura Vicuña", santoschile: "Santos de Chile", virgencarmen: "Virgen del Carmen", fraiandresito: "Venerable Fray Andresito", ceferino: "Beato Ceferino Namuncurá", donbosco: "San Juan Bosco", domingosavio: "Santo Domingo Savio", franciscoasis: "San Francisco de Asís", rosalima: "Santa Rosa de Lima", frassati: "San Pier Giorgio Frassati", teresita: "Santa Teresita", guadalupe: "Virgen de Guadalupe" };
export const sceneLabel = (k) => NAMES[k] || k.charAt(0).toUpperCase() + k.slice(1);
export function illus(key, cls = "") {
  const f = SCENES[key];
  if (!f) return "";
  const id = "rough" + (++uid);
  return `<svg class="z-illus ${cls}" viewBox="0 0 240 180" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">
    <g data-k="${id}">${f()}</g></svg>`;
}
export const illusFor = (e, cls) => illus(BY_N[e.n] || "camino", cls);
