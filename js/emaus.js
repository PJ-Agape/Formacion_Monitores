// Emaús · El arte de encontrarnos: juego de rol de agAPPe en seis capítulos, uno por módulo del curso
// «El Arte de Encontrarnos». Llegas al pueblo sintiéndote solo, encuentras una comunidad, aprendes a
// acoger, a escuchar, a jugar y a cuidar, y terminas siendo enviado. En cada encuentro del grupo te
// acompaña un Caminante que ilumina lo vivido con la Palabra; en la misa del último capítulo, al partir
// el pan, lo reconoces (Lc 24,13-35). Se juega sin cuenta ni internet; el avance queda en este teléfono.
// Invitar a alguien es un regalo, no una obligación: suma un compañero de camino que muestra hacia dónde ir.

import { esc } from "./util.js";
import { stickerSrc } from "./stickers-img.js";

let ctx = null;
export function setup(c) { ctx = c; registerActions(); }
const $ = (s, r = document) => r.querySelector(s);
const APP = "https://pj-agape.github.io/Formacion_Monitores/";
const KEY = "agape_emaus2";

const K = { navy: "#0b2566", blue: "#1351a4", sky: "#8ad2fa", orange: "#ef591c", yellow: "#ffba03", cream: "#fff6e5", white: "#ffffff",
  grass: "#bfe3a6", grass2: "#a9d68d", path: "#f3dfb3", path2: "#e8cd95", water: "#6cc3f0", water2: "#9bdaf8", stone: "#d9d4cc", wood: "#b5793f", roof: "#ef591c" };

// ---------------------------------------------------------------------------
// El pueblo (se arma con rectángulos para que sea fácil de leer y de cambiar)
// ---------------------------------------------------------------------------
const W = 44, H = 34, T = 32;
const SOLID = new Set(["T", "H", "F", "B", "#", "S", "C", "+", "~", "R", "X", "k", "L", "l", "c"]);
let map = [];
const set = (x, y, c) => { if (x >= 0 && y >= 0 && x < W && y < H) map[y][x] = c; };
const rect = (x, y, w, h, c) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) set(i, j, c); };
function buildMap() {
  map = Array.from({ length: H }, () => Array(W).fill("."));
  rect(0, 0, W, 1, "T"); rect(0, H - 1, W, 1, "T"); rect(0, 0, 1, H, "T"); rect(W - 1, 0, 1, H, "T");
  [[2, 2], [3, 9], [2, 22], [27, 3], [42, 12], [41, 30], [16, 30], [13, 9], [30, 20], [3, 31], [11, 31]].forEach(([x, y]) => set(x, y, "T"));
  rect(1, 1, 2, 2, "T"); rect(41, 1, 2, 2, "T"); rect(1, 26, 1, 4, "T");
  rect(21, 6, 2, 27, ":"); rect(3, 18, 38, 2, ":");
  [[19, 8], [24, 9], [19, 12], [25, 14], [18, 22], [25, 23], [6, 13], [14, 21], [33, 21], [10, 28], [8, 7], [15, 7]].forEach(([x, y]) => set(x, y, "f"));
  // CAPILLA (norte)
  rect(17, 1, 10, 5, "C"); set(21, 5, "c"); set(22, 5, "c"); rect(21, 0, 2, 1, "+");
  // SALÓN PARROQUIAL (noroeste): aquí se juntan los encuentros
  rect(9, 2, 6, 3, "L"); set(11, 4, "l"); set(12, 4, "l"); rect(11, 5, 2, 6, ":");
  // PUEBLO (sur)
  for (const [x, y] of [[6, 23], [13, 26], [27, 24], [33, 23]]) { rect(x, y, 4, 3, "H"); set(x + 1, y + 2, "D"); }
  rect(23, 27, 6, 1, ":"); rect(8, 21, 1, 2, ":"); rect(14, 20, 1, 6, ":"); rect(34, 20, 1, 3, ":");
  rect(4, 29, 3, 2, "k"); rect(9, 30, 2, 2, "k");
  // CANCHA (sureste)
  rect(23, 29, 11, 4, "g");
  // PLAZA (oeste)
  rect(4, 11, 11, 7, "p"); rect(8, 13, 3, 2, "F"); set(5, 12, "B"); set(13, 12, "B"); set(5, 16, "B"); set(13, 16, "B");
  // TORRE (noroeste)
  rect(3, 3, 5, 5, "R"); set(5, 7, "s"); rect(5, 8, 1, 3, ":");
  // BIBLIOTECA (este)
  rect(29, 9, 12, 2, "X"); set(34, 10, "e"); set(35, 10, "e");
  rect(29, 11, 12, 6, "p"); rect(30, 12, 4, 1, "S"); rect(36, 12, 4, 1, "S"); rect(30, 14, 3, 1, "S"); rect(35, 14, 5, 1, "S"); rect(34, 17, 1, 1, ":");
  // RÍO con su puente
  rect(37, 19, 2, 14, "~"); rect(37, 18, 2, 2, "w");
  // CERRO (noreste): el sendero se ve con la lámpara de la Palabra
  rect(29, 1, 12, 7, "h"); rect(33, 7, 1, 2, "d"); set(33, 6, "d"); rect(33, 4, 1, 2, "d"); rect(34, 3, 4, 1, "d");
  set(38, 2, "+"); set(37, 3, "B"); rect(29, 1, 1, 7, "T"); rect(40, 1, 1, 7, "T"); rect(30, 7, 3, 1, "T"); rect(34, 7, 6, 1, "T"); rect(30, 1, 3, 2, "T");
  rect(27, 1, 2, 7, "T"); rect(15, 1, 2, 4, "T"); rect(9, 1, 6, 1, "T");
}
const tile = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? "T" : map[y][x]);
const solid = (tx, ty) => { const c = tile(tx, ty); if (c === "d") return !S.lamp; return SOLID.has(c); };

// ---------------------------------------------------------------------------
// Personajes del pueblo
// ---------------------------------------------------------------------------
const PEOPLE = {
  sofi: { n: "Sofi", look: { hair: "#6b3a22", skin: "#f1c7a1", shirt: K.sky } },
  tomas: { n: "Tomás", look: { hair: "#222", skin: "#d8a77e", shirt: "#7d6bd6" } },
  ana: { n: "Ana", look: { hair: "#c2732f", skin: "#f6d3b3", shirt: "#e66b9a" } },
  lucho: { n: "Don Lucho", look: { hair: "#e8e8e8", skin: "#e2b48c", shirt: "#8a6b4a" }, old: true },
  marta: { n: "Profe Marta", look: { hair: "#4a2f20", skin: "#c48a64", shirt: "#3aa57a" } },
  benja: { n: "Benja", look: { hair: "#111", skin: "#b9805a", shirt: "#555b6e" } },
  martina: { n: "Martina", look: { hair: "#e0b04a", skin: "#f6d3b3", shirt: "#ff8f6b" } },
  nico: { n: "Nico", look: { hair: "#7a4a2a", skin: "#f0c49a", shirt: "#2f8fd8" } },
  joaco: { n: "Joaquín", look: { hair: "#3b2a1f", skin: "#e9b98f", shirt: K.yellow }, kid: true },
  carmen: { n: "Tía Carmen", look: { hair: "#5a3a26", skin: "#d7a77c", shirt: "#c0397a" }, old: true },
  padre: { n: "Padre Andrés", look: { hair: "#444", skin: "#e2b48c", shirt: "#222" }, priest: true },
  pepe: { n: "Pepe, el sacristán", look: { hair: "#777", skin: "#e2b48c", shirt: K.navy }, old: true },
  pato: { n: "Don Pato, el de los completos", look: { hair: "#5b4636", skin: "#d9a57b", shirt: "#ffffff" }, old: true },
  camin: { n: "Caminante", look: { hair: "#4b3426", skin: "#d7a77c", shirt: "#f3efe6" }, robe: true },
};
const LOOKS = [
  { hair: "#3b2a1f", skin: "#f2c9a0", shirt: K.orange },
  { hair: "#1d1d2b", skin: "#c98e63", shirt: K.blue },
  { hair: "#a8622e", skin: "#f6d3b3", shirt: K.yellow },
  { hair: "#5a3a26", skin: "#8d5b3d", shirt: "#3aa57a" },
];

// ---------------------------------------------------------------------------
// Estado
// ---------------------------------------------------------------------------
const START = { x: 28.5 * T, y: 27.5 * T };
const FRESH = () => ({ v: 2, name: "", look: 0, ch: 1, cd: [], q: {}, x: START.x, y: START.y, dir: 0, started: false, invited: "", ally: false, lamp: false, inCh: false });
let S = FRESH();
function load() { try { const s = JSON.parse(localStorage.getItem(KEY) || "null"); if (s && s.v === 2) S = { ...FRESH(), ...s }; } catch { /* */ } }
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* */ } }
const Q = () => S.q;
const party = () => Q().party || (Q().party = []);
const join = (id) => { if (!party().includes(id)) party().push(id); };

// ---------------------------------------------------------------------------
// Diálogos (líneas, elecciones, silencio y ordenar)
// ---------------------------------------------------------------------------
let dlg = null;
const L = (who, t, extra = {}) => ({ who, t, ...extra });
const P = (id) => ({ id, ...PEOPLE[id] });
const N = null; // narrador
const meW = () => ({ n: S.name || "Tú", look: LOOKS[S.look] });
function say(lines, done) { dlg = { q: lines, i: 0, done, pick: [] }; paintDlg(); }
function next() {
  if (!dlg) return;
  const l = dlg.q[dlg.i]; if (l && (l.ch || l.order)) return;
  dlg.i++;
  if (dlg.i >= dlg.q.length) { const d = dlg.done; dlg = null; paintDlg(); save(); paintHud(); d && d(); return; }
  paintDlg();
}
function choose(n) {
  const l = dlg && dlg.q[dlg.i]; if (!l || !l.ch) return;
  const fn = l.ch[n][1]; dlg = null; paintDlg(); fn && fn(); save(); paintHud();
}
// Una elección con respuesta «buena» y otras que enseñan: las no buenas vuelven a preguntar
function ask(who, t, opts, good, after) {
  say([{ who, t, ch: opts.map((o, i) => [o[0], () => (i === good ? say(o[1], after) : say(o[1], () => ask(who, t, opts, good, after)))]) }]);
}
// Ordenar: el jugador toca las opciones en el orden correcto
function order(who, t, items, ok, hint) { say([{ who, t, order: items, hint }], ok); }

// ---------------------------------------------------------------------------
// Capítulos: uno por módulo de «El Arte de Encontrarnos»
// ---------------------------------------------------------------------------
const AT = (o) => ({ x: (o.x + 0.5) * T, y: (o.y + 0.5) * T });
const SALON = { x: 11.5, y: 5 };
const goalsLeft = () => CH().quests.filter((q) => !q.done()).length;

const CHAPTERS = [
  // ------------------------------------------------------------------ 1
  { n: 1, title: "Puente y amigo", mod: "Módulo 1 · Identidad del dirigente y mirada de fe", st: "emaus", badge: "Puente",
    intro: [L(N, "Es sábado. Llegaste hace poco al pueblo y todavía no conoces a casi nadie."), L(N, "Sofi, tu vecina, te está esperando cerca de tu casa.")],
    npcs: () => [{ id: "sofi", x: 26, y: 28 }, { id: "benja", x: 14, y: 14, sit: true, hide: party().includes("benja") }, { id: "ana", x: 6, y: 15, hide: party().includes("ana") }, { id: "lucho", x: 11, y: 19, hide: party().includes("lucho") }, { id: "camin", x: 23, y: 17 }],
    items: () => [{ id: "dog", x: 5, y: 30, kind: "dog", show: Q().dog === 1 }, { id: "door", x: 7, y: 26, kind: "spark", show: Q().bags === 1 }],
    quests: [
      { t: "Mira a Benja con los ojos de Jesús", u: "1.2", done: () => party().includes("benja"), at: { x: 14, y: 14 } },
      { t: "Escucha a Ana y busca a Canela", u: "1.3", done: () => party().includes("ana"), at: () => (Q().dog === 1 ? { x: 5, y: 30 } : { x: 6, y: 15 }) },
      { t: "Ayuda a Don Lucho", u: "1.4", done: () => party().includes("lucho"), at: () => (Q().bags === 1 ? { x: 7, y: 26 } : { x: 11, y: 19 }) },
    ],
    start: () => !Q().met && { t: "Habla con Sofi, aquí cerca.", at: { x: 26, y: 28 } },
    talk: {
      sofi: () => { if (Q().met) return say([L(P("sofi"), goalsLeft() ? "En la plaza hay gente que anda sola. ¡Vamos a invitarlos!" : "¡Vamos al salón, ya empieza el encuentro!")]);
        Q().met = 1; say([L(P("sofi"), `¡Hola${S.name ? ", " + S.name : ""}! Hoy en la tarde hay encuentro del grupo en el salón parroquial, al noroeste.`),
          L(P("sofi"), "¿Me acompañas a invitar a los que andan solos por la plaza? Un buen amigo es como un puente: acerca a los demás.")]); },
      benja: () => {
        if (!Q().warned) { Q().warned = 1; return say([L(N, "Un chico con capucha mira el suelo. Alguien pasa y murmura: «Ese es el Benja, dicen que es problemático»."), L(N, "Habla con él.")]); }
        ask(P("benja"), "¿Qué quieres?", [
          ["«Hola, soy " + (S.name || "nuevo aquí") + ". ¿Qué estás escuchando?»", [L(P("benja"), "…Una canción que estoy sacando en la guitarra."), L(P("benja"), "Nadie me había preguntado eso. ¿Encuentro del grupo? Bueno, voy."), L(N, "Detrás de una capucha había alguien con un don. Jesús mira el corazón, no la fama (Sal 139).")]],
          ["Mejor no acercarse: dicen que es problemático.", [L(P("camin"), "Dios lo conoce por su nombre y lo mira con cariño. ¿Le darías una oportunidad?")]],
        ], 0, () => join("benja"));
      },
      ana: () => {
        if (Q().dog === 2) { join("ana"); return say([L(P("ana"), "¡Canela! ¡La encontraste!"), L(P("ana"), "Gracias por escucharme de verdad. Voy con ustedes.")]); }
        if (Q().dog === 1) return say([L(P("ana"), "Se fue hacia los arbustos del sur del pueblo.")]);
        ask(P("ana"), "Estoy muy preocupada… mi perrita Canela se arrancó y no la encuentro.", [
          ["«Cuéntame qué pasó. ¿Hacia dónde se fue?»", [L(P("ana"), "Gracias por preguntar. Se fue corriendo hacia los arbustos del sur."), L(N, "Escuchar es más que oír: es dejar lo tuyo y hacerle espacio al otro.")]],
          ["«Tranquila, ya va a aparecer.»", [L(P("ana"), "…Sí, puede ser."), L(N, "Ana sigue preocupada. A veces la prisa por consolar no deja escuchar.")]],
        ], 0, () => { Q().dog = 1; });
      },
      lucho: () => {
        if (Q().bags === 2) { join("lucho"); return say([L(P("lucho"), "¡Llegaron mis bolsas! Gracias."), L(P("lucho"), "Los jóvenes de antes y los de ahora se necesitan. Voy al encuentro con ustedes.")]); }
        if (Q().bags === 1) return say([L(P("lucho"), "Mi casa es la de la puerta azul, al suroeste.")]);
        Q().bags = 1; say([L(P("lucho"), "Estas bolsas pesan mucho para mis años. ¿Me las llevas a mi casa? Es la de la puerta azul."), L(N, "Nadie hace todo solo: en una comunidad cada uno aporta lo suyo.")]);
      },
      camin: () => say([L(P("camin"), "Hola. ¿De qué vienes conversando por el camino? Te noto pensativo."), L(meW(), "Llegué hace poco. A veces siento que me falta algo."), L(P("camin"), "Sigue caminando. Nos vemos en el encuentro.")]),
    },
    tile: (tx, ty) => {
      if (Q().dog === 1 && Math.hypot(5 - tx, 30 - ty) <= 1.6) { Q().dog = 2; say([L({ n: "Canela", dog: true }, "¡Guau!"), L(N, "Encontraste a Canela. Llévala con Ana, en la plaza. Como el pastor que busca a la oveja perdida (Lc 15,4-7).")]); }
      if (Q().bags === 1 && tx === 7 && (ty === 25 || ty === 26)) { Q().bags = 2; say([L(N, "Dejas las bolsas en la puerta azul. Vuelve a contarle a Don Lucho.")]); }
    },
    end: { word: "Lc 24,13-35", lines: [L(P("camin"), "En el camino a Emaús, Jesús no llegó dando un discurso: caminó al lado, preguntó y escuchó."),
      L(P("camin"), "Eso es ser puente: acercarse, mirar con cariño, escuchar y no dejar a nadie solo.")],
      idea: "Un dirigente es puente y amigo: se acerca, mira con los ojos de Jesús y escucha de verdad." } },

  // ------------------------------------------------------------------ 2
  { n: 2, title: "Un hogar acogedor", mod: "Módulo 2 · Un hogar acogedor y fraterno", st: "acogida", badge: "Hogar",
    intro: [L(N, "Otro sábado. Ya conoces a varios del grupo y empiezas a sentirte en casa."), L(N, "Sofi te llama: llega alguien nueva al salón.")],
    npcs: () => [{ id: "sofi", x: 26, y: 28 }, { id: "martina", x: 13, y: 6, hide: party().includes("martina") }, { id: "benja", x: 17, y: 19 }, { id: "ana", x: 7, y: 16 }, { id: "tomas", x: 25, y: 19 }, { id: "nico", x: 13, y: 9, tree: true, hide: party().includes("nico") }],
    quests: [
      { t: "Acoge a Martina en los primeros minutos", u: "2.2", done: () => party().includes("martina"), at: { x: 13, y: 6 } },
      { t: "Dale a cada uno una tarea", u: "2.3", done: () => (Q().tasks || 0) >= 3, at: () => [{ x: 17, y: 19 }, { x: 7, y: 16 }, { x: 25, y: 19 }][Q().tasks || 0] },
      { t: "Mira hacia arriba: alguien observa desde un árbol", u: "2.4", done: () => party().includes("nico"), at: { x: 13, y: 9 } },
    ],
    start: () => !Q().met && { t: "Habla con Sofi, aquí cerca.", at: { x: 26, y: 28 } },
    talk: {
      sofi: () => { if (Q().met) return say([L(P("sofi"), "¡Rápido, que Martina no se vaya sola!")]);
        Q().met = 1; Q().timer = Date.now() + 70000;
        say([L(P("sofi"), "¡Hoy llega Martina al salón por primera vez y no conoce a nadie!"), L(P("sofi"), "Los primeros minutos son clave. ¡Corre a recibirla, antes de que se vaya!"), L(N, "Tienes poco más de un minuto. Primerear es tomar la iniciativa del amor.")]); },
      martina: () => ask(P("martina"), "Hola… ¿aquí es el grupo? No conozco a nadie.", [
        ["«¡Hola, bienvenida! Soy " + (S.name || "del grupo") + ". ¿Cómo te llamas? Ven, te presento a los demás.»", [L(P("martina"), "¡Martina! Gracias… ya me siento mejor."), L(N, "Saludar por el nombre y presentar a otros: así se siente uno en casa.")]],
        ["«Sí, espera ahí que ya van a llegar.»", [L(P("martina"), "Ah… bueno."), L(N, "Martina queda sola en la puerta. ¿Cómo te gustaría que te recibieran a ti?")]],
      ], 0, () => { join("martina"); Q().timer = 0; }),
      benja: () => taskFor("benja", 0), ana: () => taskFor("ana", 1), tomas: () => taskFor("tomas", 2),
      nico: () => ask(P("nico"), "(Desde arriba del árbol) …Solo estaba mirando.", [
        ["«¡Nico, baja! Hoy queremos que estés con nosotros.»", [L(P("nico"), "¿Yo? ¿En serio?"), L(N, "Nico baja del árbol. Jesús miró hacia arriba, llamó a Zaqueo por su nombre y fue a su casa (Lc 19,1-10).")]],
        ["Seguir de largo: si quisiera, vendría.", [L(N, "Muchos miran desde lejos esperando que alguien los invite. Jesús se detuvo y miró hacia arriba.")]],
      ], 0, () => join("nico")),
    },
    timer: () => {
      if (!party().includes("martina") && Q().timer && Date.now() > Q().timer) {
        Q().timer = Date.now() + 70000;
        say([L(N, "Martina se fue a su casa sin que nadie la saludara."), L(N, "El próximo sábado vuelve a intentarlo. Esta vez, sal a su encuentro. Tienes otro minuto.")]);
      }
    },
    end: { word: "Jn 13,1-15 · Lc 19,1-10", lines: [L(P("camin"), "Jesús se agachó a lavar los pies de sus amigos y miró hacia arriba para llamar a Zaqueo."),
      L(P("camin"), "Un hogar se hace así: saliendo primero al encuentro, dando a cada uno su lugar y no dejando a nadie mirando desde lejos.")],
      idea: "El grupo es un hogar: se acoge en los primeros minutos, cada uno tiene una tarea y nadie queda afuera." } },

  // ------------------------------------------------------------------ 3
  { n: 3, title: "Mirar, sentir y escuchar", mod: "Módulo 3 · El arte de mirar, sentir y escuchar", st: "bartimeo", badge: "Mirada",
    intro: [L(N, "Un sábado distinto. En el pueblo hay gente que lo está pasando mal."), L(N, "La Profe Marta, además, perdió unas páginas de su Biblia con el viento.")],
    npcs: () => [{ id: "joaco", x: 18, y: 25, hide: Q().joaco }, { id: "ana", x: 13, y: 15, sit: true }, { id: "marta", x: 35, y: 16 }, { id: "lucho", x: 5, y: 16, sit: true }, { id: "carmen", x: 10, y: 6 }],
    items: () => PAGES.filter((p) => !(Q().pages || []).includes(p.id)).map((p) => ({ ...p, kind: "page", show: true })),
    quests: [
      { t: "Ayuda a Joaquín, que se cayó", u: "3.1", done: () => !!Q().joaco, at: { x: 18, y: 25 } },
      { t: "Pregúntale a Ana qué le pasa", u: "3.2", done: () => !!Q().ana, at: { x: 13, y: 15 } },
      { t: "Encuentra las páginas de la Biblia", u: "3.3", done: () => S.lamp, at: () => { const p = PAGES.find((x) => !(Q().pages || []).includes(x.id)); return p || { x: 35, y: 16 }; } },
      { t: "Acompaña a Don Lucho", u: "3.4", done: () => !!Q().lucho, at: { x: 5, y: 16 } },
    ],
    talk: {
      joaco: () => ask(P("joaco"), "(Llorando) Me caí de la bici…", [
        ["Agacharte a su altura, mirarlo y tenderle la mano: «¿Te duele? Te ayudo».", [L(P("joaco"), "Me duele la rodilla, pero ya estoy mejor."), L(N, "Jesús se conmovió, extendió la mano y tocó al leproso (Mc 1,41). Los gestos sencillos dicen mucho.")]],
        ["Decirle desde lejos: «¡Arriba, no fue nada!»", [L(P("joaco"), "…"), L(N, "Joaquín sigue en el suelo. A veces hace falta acercarse más.")]],
      ], 0, () => { Q().joaco = 1; }),
      ana: () => {
        if (Q().ana) return say([L(P("ana"), "Gracias por preguntar. Ya hablé con la Tía Carmen y me siento más acompañada.")]);
        say([L(P("ana"), "…"), L(meW(), "Te noto callada. ¿Qué quieres que haga por ti?"), L(P("ana"), "En mi casa mis papás discuten mucho. No puedo concentrarme en nada.")], () =>
          ask(meW(), "¿Qué crees que siente Ana?", [
            ["Preocupación y pena", [L(P("ana"), "Sí… es eso. Me hace bien ponerle nombre."), L(N, "Las emociones no son buenas ni malas: ponerles nombre ayuda. Como Jesús con Bartimeo: «¿Qué quieres que haga por ti?» (Mc 10,51)."),
              L(meW(), "¿Quieres que lo conversemos con la Tía Carmen? Ella nos puede ayudar."), L(P("ana"), "Sí, me gustaría.")]],
            ["Está exagerando", [L(N, "Lo que alguien siente no se discute: se acoge. Vuelve a escucharla.")]],
          ], 0, () => { Q().ana = 1; }));
      },
      marta: () => {
        if (S.lamp) return say([L(P("marta"), "La Palabra ilumina el camino. Con la lámpara se ve el sendero del cerro.")]);
        const got = (Q().pages || []).length;
        if (got < 3) return say([L(P("marta"), `Se me volaron tres páginas de la Biblia. Llevas ${got} de 3: busca entre los estantes, a la orilla del río y al pie de la torre.`)]);
        quiz();
      },
      lucho: () => {
        if (Q().lucho) return say([L(P("lucho"), "Gracias por quedarte conmigo.")]);
        say([L(P("lucho"), "Hoy se cumple un año desde que partió mi señora. La echo mucho de menos.")], () =>
          ask(meW(), "¿Qué le dices?", [
            ["«Lo siento mucho, Don Lucho. ¿Me cuenta cómo era ella?» Y te sientas a su lado.", [L(P("lucho"), "Era alegre, cantaba todo el día… Gracias por preguntar."), { who: N, t: "", quiet: 6, msg: "Se quedan un rato juntos, en silencio." },
              L(N, "Jesús lloró por su amigo Lázaro (Jn 11,35). Acompañar no es tener respuestas: es estar.")]],
            ["«No esté triste, ella está mejor ahora.»", [L(P("lucho"), "…Sí, eso dicen."), L(N, "Las frases hechas a veces apuran el dolor. Quédate, escucha y pregunta.")]],
          ], 0, () => { Q().lucho = 1; }));
      },
      carmen: () => say([L(P("carmen"), "Hola. Soy asesora del grupo. Si alguien necesita conversar algo difícil, aquí estoy.")]),
    },
    tile: (tx, ty) => {
      for (const p of PAGES) if (!(Q().pages || []).includes(p.id) && Math.hypot(p.x - tx, p.y - ty) < 1) {
        (Q().pages = Q().pages || []).push(p.id);
        say([L(N, `Encontraste una página (${Q().pages.length} de 3): «${PAGE_TXT[p.id].t}» (${PAGE_TXT[p.id].ref}).`)]);
      }
    },
    end: { word: "Mc 10,46-52", lines: [L(P("camin"), "Jesús se detuvo ante Bartimeo y le preguntó: «¿Qué quieres que haga por ti?»."),
      L(P("camin"), "Mirar lo que no se dice, ponerle nombre a lo que sentimos y quedarse con el que sufre: así mira el corazón de Dios.")],
      idea: "Compasión es acercarse, preguntar y acompañar; y cuando algo es difícil, buscar juntos a un adulto de confianza." } },

  // ------------------------------------------------------------------ 4
  { n: 4, title: "Aprender jugando", mod: "Módulo 4 · Aprender jugando y viviendo", st: "panes", badge: "Alegría",
    intro: [L(N, "Hoy el grupo arma una once en la cancha, al sureste del pueblo."), L(N, "Pero cada uno trajo muy poquito…")],
    npcs: () => [{ id: "sofi", x: 28, y: 30 }, { id: "marta", x: 35, y: 16 }, { id: "benja", x: 31, y: 31 }, { id: "nico", x: 25, y: 31 }],
    items: () => FOOD.filter((f) => !(Q().food || []).includes(f.id)).map((f) => ({ ...f, show: !!Q().met })),
    quests: [
      { t: "Junta los panes y los peces que trajo cada uno", u: "4.2", done: () => (Q().food || []).length >= FOOD.length, at: () => FOOD.find((f) => !(Q().food || []).includes(f.id)) || { x: 28, y: 30 } },
      { t: "Celebren juntos en la cancha", u: "4.1", done: () => !!Q().party1, at: { x: 28, y: 30 } },
      { t: "Planifica el próximo encuentro con la Profe Marta", u: "4.3", done: () => !!Q().plan, at: { x: 35, y: 16 } },
      { t: "Al atardecer, sube al cerro a mirar el día", u: "4.4", done: () => !!Q().examen, at: { x: 36, y: 3 } },
    ],
    start: () => !Q().met && { t: "Habla con Sofi en la cancha.", at: { x: 28, y: 30 } },
    talk: {
      sofi: () => {
        if (!Q().met) { Q().met = 1; return say([L(P("sofi"), "¡Bienvenido a la once! El problema: cada uno trajo poquito."), L(P("sofi"), "Repartidos por el pueblo hay cinco panes y dos peces que dejaron los chiquillos. Si juntamos lo de todos, alcanza."), L(N, "Como el muchacho de los cinco panes y dos peces (Jn 6,9).")]); }
        if ((Q().food || []).length < FOOD.length) return say([L(P("sofi"), `Llevas ${(Q().food || []).length} de ${FOOD.length}. ¡Nadie se queda sin comer!`)]);
        if (!Q().party1) { Q().party1 = 1; return say([L(P("sofi"), "¡Alcanzó para todos y sobró!"), { who: { n: "", st: "panes", big: true }, t: "Comen, ríen y juegan a la pinta. Hasta Don Lucho se suma. «Comamos y celebremos» (Lc 15,23)." },
          L(N, "Dios celebra. La alegría y el juego también son camino para encontrarse.")]); }
        return say([L(P("sofi"), "Qué rico estuvo. ¡Ahora a preparar el próximo encuentro!")]);
      },
      benja: () => say([L(P("benja"), "En los juegos cooperativos nadie pierde. Me gusta eso: nadie se queda atrás.")]),
      nico: () => say([L(P("nico"), "Antes no me gustaba jugar porque siempre perdía. Aquí jugamos juntos.")]),
      marta: () => {
        if (Q().plan) return say([L(P("marta"), "Con ese orden, el encuentro parte de la vida y vuelve a la vida.")]);
        order(P("marta"), "Para el próximo encuentro usamos el método del grupo. Toca los pasos en orden:",
          ["Vivir", "Conversar", "Iluminar", "Actuar"], () => { Q().plan = 1; say([L(P("marta"), "¡Así es! Partimos de lo que vivimos, lo conversamos, lo iluminamos con la Palabra y lo llevamos a la vida."), L(N, "Como Jesús en Emaús: primero escuchó, después explicó las Escrituras (Lc 24,25-27).")]); },
          "Empieza por lo que vive el grupo y termina en un compromiso.");
      },
    },
    tile: (tx, ty) => {
      for (const f of FOOD) if (Q().met && !(Q().food || []).includes(f.id) && Math.hypot(f.x - tx, f.y - ty) < 1) {
        (Q().food = Q().food || []).push(f.id); say([L(N, `${f.kind === "fish" ? "Un pez" : "Un pan"} (${Q().food.length} de ${FOOD.length}). Poco, pero juntos alcanza.`)]);
      }
      if (S.lamp && !Q().examen && tx >= 36 && tx <= 38 && ty <= 4) examen();
    },
    end: { word: "Jn 6,1-13", lines: [L(P("camin"), "Cinco panes y dos peces parecían nada. En manos de Jesús alcanzó para miles."),
      L(P("camin"), "Cuando el juego une y nadie queda atrás, cuando partimos de la vida, Dios se deja descubrir en lo que vivimos.")],
      idea: "Jugar y celebrar también es camino: cooperar para que nadie quede atrás y descubrir a Dios en lo vivido." } },

  // ------------------------------------------------------------------ 5
  { n: 5, title: "Cuidado y envío", mod: "Módulo 5 · Cuidado personal, cuidado mutuo y envío", st: "levantate", badge: "Enviado",
    intro: [L(N, "Llevas semanas sirviendo en el grupo. Estás contento… y bien cansado."), L(N, "Hoy el Padre Andrés quiere enviar a los nuevos dirigentes.")],
    npcs: () => [{ id: "sofi", x: 19, y: 18 }, { id: "tomas", x: 30, y: 19 }, { id: "benja", x: 34, y: 22 }, { id: "nico", x: 6, y: 28, sit: true, hide: !!Q().nico }, { id: "ana", x: 15, y: 25 }, { id: "padre", x: 13, y: 6 }],
    quests: [
      { t: "Descansa en el Señor en el cerro", u: "5.1", done: () => !!Q().rest, at: { x: 36, y: 3 } },
      { t: "Ayuda a Sofi a sostener la carga", u: "5.2", done: () => !!Q().held, at: () => (Q().help || []).length >= 2 ? { x: 19, y: 18 } : (Q().help || []).includes("tomas") ? { x: 34, y: 22 } : { x: 30, y: 19 } },
      { t: "Nico volvió agotado de la misión: comparte con él", u: "5.4", done: () => !!Q().nico, at: () => (Q().nicoSeen && !Q().bread ? { x: 15, y: 25 } : { x: 6, y: 28 }) },
    ],
    talk: {
      sofi: () => {
        if (Q().held) return say([L(P("sofi"), "Gracias. Sola no podía.")]);
        if ((Q().help || []).length >= 2) { Q().held = 1; return say([L(P("sofi"), "¡Llegaron Tomás y Benja! Entre todos se puede."), L(N, "Cuando a Moisés se le cansaban los brazos, Aarón y Jur se los sostuvieron (Éx 17,12). En comunidad nos sostenemos.")]); }
        if (!Q().asked) { Q().asked = 1; return say([L(P("sofi"), "Uf, me ofrecí para llevar todos los materiales de la misión y no puedo más."), L(N, "Busca a Tomás y a Benja, al este del pueblo, para que ayuden a Sofi.")]); }
        return say([L(P("sofi"), "Busca a Tomás y a Benja, al este.")]);
      },
      tomas: () => { if (!Q().asked) return say([L(P("tomas"), "¡Hola! Hoy es el envío.")]); (Q().help = Q().help || []).includes("tomas") || Q().help.push("tomas"); say([L(P("tomas"), "¿Sofi necesita ayuda? ¡Voy altiro!")]); },
      benja: () => { if (!Q().asked) return say([L(P("benja"), "Estoy ensayando la canción del envío.")]); (Q().help = Q().help || []).includes("benja") || Q().help.push("benja"); say([L(P("benja"), "Dejo la guitarra y voy a ayudar.")]); },
      nico: () => {
        if (Q().bread) {
          Q().nico = 1; join("nico");
          return say([L(P("nico"), "¿Pan y agua? ¡Gracias! Con la misión se me olvidó comer."), L(P("nico"), "Uno a veces se olvida de cuidarse. Ya me siento mejor: ¿vamos juntos al envío?"),
            L(N, "El ángel le dijo a Elías: «Levántate y come, que el camino es largo» (1 Re 19,7). Cuidarnos también es fijarnos en el cansancio del otro.")]);
        }
        Q().nicoSeen = 1;
        say([L(N, "Nico está sentado a la sombra de un arbusto, como el profeta Elías en el camino."), L(P("nico"), "Estoy reventado. Cargué cosas toda la mañana para la misión y no he comido nada."), L(N, "Ana, en el pueblo, tiene pan y agua.")]);
      },
      ana: () => { if (Q().nicoSeen && !Q().bread) { Q().bread = 1; return say([L(P("ana"), "¿Para Nico? Toma, lleva pan y agua. ¡Y que descanse un rato!")]); } say([L(P("ana"), "Hoy es el envío. ¡Qué emoción!")]); },
      padre: () => {
        if (goalsLeft()) return say([L(P("padre"), `El envío es en el encuentro. Antes, termina lo que falta (${goalsLeft()}).`)]);
        say([L(P("padre"), "¡Ya están todos! Vamos al salón para el envío.")]);
      },
    },
    tile: (tx, ty) => { if (S.lamp && !Q().rest && tx >= 36 && tx <= 38 && ty <= 4) rest(); },
    end: { word: "Jn 20,19-23", lines: [L(P("padre"), "Jesús resucitado se puso en medio de sus discípulos y les dijo: «Como el Padre me envió, así los envío yo»."),
      L(P("camin"), "Para ser enviado hay que descansar en Él, dejarse sostener y cuidar a los demás. Nadie es enviado solo."),
      { who: { n: "", st: "levantate", big: true }, t: "El Padre Andrés te entrega una pequeña cruz. Desde hoy eres dirigente de Ágape." }],
      idea: "Cuidarse y cuidarnos es parte de la misión: descansar en el Señor, sostenernos y fijarnos en el cansancio del otro." } },

  // ------------------------------------------------------------------ 6
  { n: 6, title: "Lo reconocieron al partir el pan", mod: "Módulo 6 · La Eucaristía, corazón de nuestra Pastoral Juvenil", st: "eucaristia", badge: "Eucaristía",
    intro: [L(N, "Es domingo. Hoy el grupo anima la misa en la capilla."), L(N, "Pero no todos tienen ganas de ir…")],
    npcs: () => [{ id: "tomas", x: 26, y: 28 }, { id: "pepe", x: 23, y: 7 }, { id: "pato", x: 26, y: 8 }, { id: "ana", x: 19, y: 9 }, { id: "benja", x: 24, y: 10 }, { id: "martina", x: 19, y: 13 }, { id: "nico", x: 25, y: 13 }, { id: "camin", x: 23, y: 17 }],
    quests: [
      { t: "Tomás dice que la misa es fome: acompáñalo", u: "6.1", done: () => party().includes("tomas"), at: { x: 26, y: 28 } },
      { t: "Ayuda a Pepe a preparar la misa", u: "6.2", done: () => !!Q().steps, at: { x: 23, y: 7 } },
      { t: "Cada uno anima un servicio", u: "6.3", done: () => (Q().roles || 0) >= 4, at: () => [{ x: 19, y: 9 }, { x: 24, y: 10 }, { x: 19, y: 13 }, { x: 25, y: 13 }][Q().roles || 0] },
    ],
    talk: {
      tomas: () => ask(P("tomas"), "¿Misa? Nah… es fome, no entiendo nada.", [
        ["«A veces a mí también me cuesta. ¿Vamos juntos y después conversamos qué te pareció?»", [L(P("tomas"), "Bueno… si vamos juntos."), L(N, "También a Jesús lo dejaron algunos. Pedro respondió: «Señor, ¿a quién iremos?» (Jn 6,68). Acompañar convence más que sermonear.")]],
        ["«Tienes que ir: es obligación.»", [L(P("tomas"), "…Ya, otro sermón."), L(N, "Tomás se cierra. ¿Y si lo invitas a ir contigo?")]],
      ], 0, () => join("tomas")),
      pepe: () => {
        if (Q().steps) return say([L(P("pepe"), "Todo listo. Ahora, que cada uno asuma su servicio.")]);
        order(P("pepe"), "Ordenemos las partes de la misa para preparar todo. Tócalas en orden:",
          ["Ritos iniciales", "Liturgia de la Palabra", "Liturgia eucarística", "Rito de despedida"], () => { Q().steps = 1; say([L(P("pepe"), "¡Perfecto! Nos reúne el Señor, nos habla, se entrega y nos envía.")]); },
          "El Señor nos reúne, nos habla, se entrega y nos envía.");
      },
      ana: () => role(0, "ana", "Ana lee muy claro y despacio.", ["Proclamar la primera lectura", "Llevar las ofrendas", "Recibir en la puerta"]),
      benja: () => role(1, "benja", "Benja toca la guitarra.", ["Recibir en la puerta", "Animar el canto", "Proclamar la lectura"]),
      martina: () => role(2, "martina", "Martina quiere ayudar, pero es tímida.", ["Llevar las ofrendas de pan y vino", "Hacer la homilía", "Animar el canto"]),
      nico: () => role(3, "nico", "Nico sabe lo que es llegar y no conocer a nadie.", ["Proclamar la lectura", "Animar el canto", "Recibir a los que llegan en la puerta"]),
      camin: () => say([L(P("camin"), goalsLeft() ? "Ya casi es la hora. Te acompaño hasta la capilla." : "¿Entramos? Quédate conmigo, que ya es tarde.")]),
      pato: () => say([L(P("pato"), "¡Hola! Los completos son después de la misa, como siempre. Italianos, con harta palta."), L(P("pato"), "Primero lo primero: el Pan de la misa. Después, el pan de los completos. ¡Los espero a todos!")]),
    },
    end: null, // la escena final es la misa
  },
];
const ROLE_GOOD = [0, 1, 0, 2];
function role(i, id, intro, opts) {
  const done = Q().roles || 0;
  if (i < done) return say([L(P(id), "¡Listo! Ya sé qué me toca.")]);
  if (!Q().steps) return say([L(P(id), "Primero hay que ayudar a Pepe a preparar la misa.")]);
  if (i > done) return say([L(N, "Propón los servicios en orden: Ana, Benja, Martina y Nico.")]);
  ask(P(id), intro + " ¿Qué servicio le propones?", opts.map((o, k) => [o, k === ROLE_GOOD[i]
    ? [L(P(id), "¡Me gusta! Lo hago con gusto."), L(N, "Participar plena, consciente y activamente: cada uno pone su don al servicio de la celebración.")]
    : [L(P(id), "Mmm… no sé si eso es lo mío."), L(N, "¿Y si aprovechas lo que le gusta o lo que vive?")]]), ROLE_GOOD[i], () => { Q().roles = done + 1; });
}
function taskFor(id, i) {
  const done = Q().tasks || 0;
  if (!Q().met) return say([L(P(id), "¡Hola! ¿Viste a Sofi?")]);
  if (i < done) return say([L(P(id), "¡Ya sé qué me toca!")]);
  if (i > done) return say([L(N, "Sofi te pidió repartir las tareas en orden: Benja, Ana y Tomás.")]);
  const T3 = [["Benja toca la guitarra.", ["Animar los cantos", "Ordenar las sillas", "Hacer la oración"], 0],
    ["Ana es cariñosa y conversadora.", ["Llevar la cuenta de la colecta", "Recibir a los que llegan", "Afinar la guitarra"], 1],
    ["A Tomás le encanta dibujar.", ["Hacer el afiche del próximo encuentro", "Cantar solo", "Leer en voz alta"], 0]][i];
  ask(P(id), T3[0] + " ¿Qué tarea le das?", T3[1].map((o, k) => [o, k === T3[2]
    ? [L(P(id), "¡Me encanta!"), L(N, "Cuando cada uno pone su don, el grupo se vuelve comunidad. Jesús lavó los pies: servir es el camino (Jn 13).")]
    : [L(P(id), "Mmm… no es lo mío."), L(N, "¿Y si aprovechas lo que le gusta?")]]), T3[2], () => { Q().tasks = done + 1; });
}

const PAGES = [{ id: 0, x: 38, y: 13 }, { id: 1, x: 40, y: 27 }, { id: 2, x: 5, y: 8 }];
const PAGE_TXT = [
  { ref: "Salmo 119,105", t: "Tu Palabra es una lámpara para mis pasos y una luz en mi camino.", q: "¿Qué es la Palabra de Dios para nuestros pasos, según el Salmo?", o: ["Una lámpara que ilumina", "Un mapa con atajos", "Una muralla que protege"], c: 0 },
  { ref: "Juan 15,15", t: "Jesús dice: ya no los llamo servidores, los llamo amigos.", q: "¿Cómo nos llama Jesús en el Evangelio de Juan?", o: ["Servidores", "Amigos", "Desconocidos"], c: 1 },
  { ref: "Mateo 18,20", t: "Donde dos o tres se reúnen en mi nombre, ahí estoy yo en medio de ellos.", q: "¿Dónde está Jesús, según Mateo 18,20?", o: ["Solo en los templos grandes", "Donde dos o tres se reúnen en su nombre", "Muy lejos, en el cielo"], c: 1 },
];
const FOOD = [{ id: 0, x: 8, y: 20, kind: "bread" }, { id: 1, x: 17, y: 28, kind: "bread" }, { id: 2, x: 40, y: 22, kind: "fish" }, { id: 3, x: 31, y: 13, kind: "bread" },
  { id: 4, x: 12, y: 7, kind: "bread" }, { id: 5, x: 26, y: 12, kind: "fish" }, { id: 6, x: 35, y: 27, kind: "bread" }];

function quiz() {
  const M = P("marta");
  const q = (i) => {
    if (i >= 3) { S.lamp = true; return say([L(M, "¡Muy bien! La Palabra no es solo para saberla: es para orarla y vivirla."), L(M, "Toma esta lámpara. Con ella se ve el sendero del cerro, al noreste."), L(N, "Recibes la Lámpara de la Palabra.")]); }
    const p = PAGE_TXT[i];
    say([L(M, `Página ${i + 1}: «${p.t}» (${p.ref}).`), { who: M, t: p.q, ch: p.o.map((o, k) => [o, () => (k === p.c ? say([L(M, "¡Exacto!")], () => q(i + 1)) : say([L(M, "Casi. Léela otra vez con calma.")], () => q(i)))]) }]);
  };
  say([L(M, "¡Encontraste las tres páginas! Gracias. Leámoslas juntos, despacio, como en la lectura orante.")], () => q(0));
}
function examen() {
  Q().examen = 1;
  say([L(N, "Desde el cerro se ve todo el pueblo al atardecer. Frente a la cruz, miras el día con Jesús."),
    { who: N, t: "¿Dónde viste a Dios hoy?", ch: [["En la alegría de la once", null], ["En que alcanzó para todos", null], ["En los amigos que juegan juntos", null]].map(([o]) => [o, () => say([L(N, "Dios se deja descubrir en lo que vivimos. Dale gracias por eso."), { who: N, t: "", quiet: 6, msg: "Te quedas un momento con Él, mirando el día." }, L(N, "«Gracias, Señor, por este día.»")])]) }]);
}
function rest() {
  Q().rest = 1;
  say([L(N, "Subes al cerro. Te sientas en la banca, frente a la cruz. Estás cansado."),
    L(N, "Jesús dijo a sus amigos: «Vengan a un lugar apartado y descansen un poco» (Mc 6,31)."),
    { who: N, t: "", quiet: 8, msg: "Le entregas a Jesús tu cansancio. No hay que hacer nada más: Él te sostiene." },
    L(N, "Bajas con más paz. Servir también es saber descansar en Él.")]);
}

// ---------------------------------------------------------------------------
// Capítulo en curso
// ---------------------------------------------------------------------------
const CH = () => CHAPTERS[(S.ch || 1) - 1];
function npcsNow() { return CH().npcs().filter((n) => !n.hide); }
function nextGoal() {
  if (!S.inCh) return { t: "", at: null };
  const c = CH(), st = c.start && c.start();
  if (st) return st;
  const q = c.quests.find((x) => !x.done());
  if (q) { const at = typeof q.at === "function" ? q.at() : q.at; return { t: q.t, at, u: q.u }; }
  if (c.n === 6) return { t: "Todo listo: entra a la capilla para la misa.", at: { x: 22, y: 6 } };
  return { t: "Ve al salón parroquial: empieza el encuentro.", at: SALON };
}
function startChapter(n) {
  S.ch = n; S.q = {}; S.inCh = true; S.x = START.x; S.y = START.y; trail = [];
  S.lamp = n > 3; // la lámpara se recibe en el capítulo 3
  save(); hideCards(); paintHud();
  say(CH().intro);
}
function finishChapter() {
  const c = CH();
  if (!S.cd.includes(c.n)) S.cd.push(c.n);
  S.inCh = false; save();
  if (c.n === 6) return finale();
  say([L(N, "Llegas al salón. El grupo se sienta en círculo. El Caminante también está ahí, escuchando."), ...c.end.lines], () => chapterCard(c));
}
// Escena final: la misa
function finale() {
  const B = (st, t) => ({ who: { n: "", st, big: true }, t });
  say([
    L(P("pepe"), "¡Ya es la hora! Pasen."),
    B("comunidad", "Entran todos: Sofi, Tomás, Ana, Benja, Martina, Nico, Don Lucho… El Caminante entra contigo y se sienta a tu lado."),
    B("biblia", "Ana proclama la lectura. Benja anima el canto. Todo lo que el grupo vivió en estos sábados parece encajar."),
    B("eucaristia", "Martina lleva el pan y el vino al altar. El sacerdote toma el pan, da gracias, lo parte y lo reparte."),
    B("emaus", "Entonces se te abren los ojos y lo reconoces: el Caminante era Jesús. Estuvo contigo en cada encuentro, en cada camino."),
    B("jesus", "«¿No ardía nuestro corazón mientras nos hablaba en el camino?» (cf. Lc 24,32)"),
    B("eucaristia", "Después de la comunión se quedan un momento en silencio. Lo miras y te dejas mirar por Él."),
    B("amigos", "«Pueden ir en paz.» Y como los discípulos de Emaús, salen a contarlo y a servir a los demás."),
    B("comunidad", "Afuera, Don Pato ya tiene listo el carrito de completos. Italianos para todos, conversación, risas y un par de abrazos: después de la misa, a los completos."),
    B("amigos", "Porque la comunidad que se reúne en torno al altar sigue compartiendo la mesa afuera. Así se vive Ágape."),
  ], () => endScreen());
}

// ---------------------------------------------------------------------------
// Movimiento
// ---------------------------------------------------------------------------
const keys = new Set();
let pad = { x: 0, y: 0 }, target = null, last = 0, raf = 0, trail = [], anim = 0, canvas = null, g2 = null, vp = { w: 0, h: 0 }, dpr = 1;
const R = 10;
function free(px, py) {
  for (const [dx, dy] of [[-R, -R], [R, -R], [-R, R], [R, R], [0, R], [0, -R]]) if (solid(Math.floor((px + dx) / T), Math.floor((py + dy) / T))) return false;
  if (S.inCh) for (const n of npcsNow()) { if (n.tree) continue; const p = AT(n); if (Math.hypot(p.x - px, p.y - py) < R + 9) return false; }
  return true;
}
function step(dt) {
  if (dlg || !S.started || !S.inCh || $(".em-start")) return;
  CH().timer && CH().timer();
  let vx = 0, vy = 0;
  if (keys.has("ArrowLeft") || keys.has("a")) vx -= 1;
  if (keys.has("ArrowRight") || keys.has("d")) vx += 1;
  if (keys.has("ArrowUp") || keys.has("w")) vy -= 1;
  if (keys.has("ArrowDown") || keys.has("s")) vy += 1;
  vx += pad.x; vy += pad.y;
  if (!vx && !vy && target) { const dx = target.x - S.x, dy = target.y - S.y, d = Math.hypot(dx, dy); if (d < 4) target = null; else { vx = dx / d; vy = dy / d; } }
  else if (vx || vy) target = null;
  const m = Math.hypot(vx, vy);
  if (!m) { anim = 0; return; }
  vx /= m; vy /= m;
  const sp = 130 * dt, nx = S.x + vx * sp, ny = S.y + vy * sp;
  let moved = false;
  if (free(nx, S.y)) { S.x = nx; moved = true; }
  if (free(S.x, ny)) { S.y = ny; moved = true; }
  if (!moved && target) target = null;
  S.dir = Math.abs(vx) > Math.abs(vy) ? (vx < 0 ? 1 : 2) : vy < 0 ? 3 : 0;
  anim += dt * 8;
  trail.unshift({ x: S.x, y: S.y }); if (trail.length > 160) trail.length = 160;
  events();
}
function events() {
  const tx = Math.floor(S.x / T), ty = Math.floor(S.y / T);
  CH().tile && CH().tile(tx, ty);
}
const near = (o, d = 1.7) => { const p = AT(o); return Math.hypot(p.x - S.x, p.y - S.y) < d * T; };
function action() {
  if (dlg) return next();
  if (!S.inCh) return;
  const n = npcsNow().find((x) => near(x, x.tree ? 2.2 : 1.7));
  if (n) return talkTo(n.id);
  // puertas del salón y de la capilla
  if (Math.hypot(SALON.x * T - S.x, (SALON.y + .5) * T - S.y) < 1.6 * T && CH().n < 6) return door();
  if (Math.hypot(22 * T - S.x, 6.5 * T - S.y) < 1.8 * T && CH().n === 6) return door();
  if (S.lamp && Math.hypot(38 - S.x / T, 3 - S.y / T) < 2.4) return CH().tile && CH().tile(37, 3);
}
function talkTo(id) { const f = CH().talk[id]; if (f) f(); }
function door() {
  const left = goalsLeft();
  if (CH().start && CH().start()) return say([L(N, "Primero habla con quien te está esperando.")]);
  if (left) return say([L(N, CH().n === 6 ? `La misa todavía no empieza: falta preparar ${left === 1 ? "una cosa" : left + " cosas"}.` : `El encuentro empieza cuando estén todos. Falta ${left === 1 ? "una cosa" : left + " cosas"}.`)]);
  finishChapter();
}

// ---------------------------------------------------------------------------
// Dibujo
// ---------------------------------------------------------------------------
function sky() { if (!S.inCh) return null; const c = CH(), done = c.quests.filter((q) => q.done()).length / c.quests.length; return done >= 1 ? "rgba(239,89,28,.18)" : done > .5 ? "rgba(239,89,28,.1)" : done > 0 ? "rgba(255,186,3,.06)" : null; }
function drawTile(c, x, y) {
  const X = x * T, Y = y * T, alt = (x + y) % 2;
  const base = (col) => { g2.fillStyle = col; g2.fillRect(X, Y, T, T); };
  g2.lineWidth = 2; g2.strokeStyle = K.navy;
  switch (c) {
    case ".": case "f": base(alt ? K.grass : K.grass2);
      if (c === "f") for (const [a, b, col] of [[8, 10, K.orange], [22, 8, K.yellow], [14, 22, "#e66b9a"]]) { g2.fillStyle = col; g2.beginPath(); g2.arc(X + a, Y + b, 3, 0, 7); g2.fill(); }
      break;
    case ":": case "s": base(alt ? K.path : K.path2); break;
    case "g": base(alt ? "#9fd17f" : "#95c975"); g2.strokeStyle = "rgba(255,255,255,.75)"; if (y === 29 || y === 32) { g2.beginPath(); g2.moveTo(X, Y + (y === 29 ? 2 : T - 2)); g2.lineTo(X + T, Y + (y === 29 ? 2 : T - 2)); g2.stroke(); } if (x === 28) { g2.beginPath(); g2.moveTo(X + 16, Y); g2.lineTo(X + 16, Y + T); g2.stroke(); } break;
    case "p": base(alt ? "#ece6da" : "#e2dccf"); g2.strokeStyle = "rgba(11,37,102,.08)"; g2.lineWidth = 1; g2.strokeRect(X + .5, Y + .5, T - 1, T - 1); break;
    case "h": base(alt ? "#cfe0b7" : "#c3d7aa"); break;
    case "d": base(S.lamp ? (alt ? K.path : K.path2) : "#4a5a7a"); if (!S.lamp) { g2.fillStyle = "rgba(11,37,102,.35)"; g2.fillRect(X, Y, T, T); } break;
    case "~": base(alt ? K.water : K.water2); g2.strokeStyle = "rgba(255,255,255,.6)"; g2.beginPath(); g2.moveTo(X + 6, Y + 14); g2.quadraticCurveTo(X + 12, Y + 10, X + 18, Y + 14); g2.stroke(); break;
    case "w": base(K.wood); g2.strokeStyle = "#8a5a2c"; for (let i = 4; i < T; i += 8) { g2.beginPath(); g2.moveTo(X, Y + i); g2.lineTo(X + T, Y + i); g2.stroke(); } break;
    case "T": base(alt ? K.grass : K.grass2); g2.fillStyle = "#8a5a2c"; g2.fillRect(X + 13, Y + 18, 6, 12); g2.fillStyle = "#4f9a5a"; g2.beginPath(); g2.arc(X + 16, Y + 13, 11, 0, 7); g2.fill(); g2.stroke(); break;
    case "k": base(K.grass2); g2.fillStyle = "#6fb36a"; g2.lineWidth = 1.5; for (const [a, b] of [[10, 16], [22, 14], [16, 22]]) { g2.beginPath(); g2.arc(X + a, Y + b, 8, 0, 7); g2.fill(); g2.stroke(); } break;
    case "H": base("#fbe9cf"); g2.strokeRect(X + 1, Y + 1, T - 2, T - 2); if (tile(x, y - 1) !== "H") { g2.fillStyle = K.roof; g2.fillRect(X, Y, T, 12); g2.strokeRect(X, Y, T, 12); } break;
    case "D": base("#fbe9cf"); g2.fillStyle = x === 7 ? K.blue : "#8a5a2c"; g2.fillRect(X + 8, Y + 6, 16, 26); g2.strokeRect(X + 8, Y + 6, 16, 26); break;
    case "L": base("#e8f4fc"); g2.strokeRect(X + 1, Y + 1, T - 2, T - 2); if (tile(x, y - 1) !== "L") { g2.fillStyle = K.yellow; g2.fillRect(X, Y, T, 12); g2.strokeRect(X, Y, T, 12); } else { g2.fillStyle = K.sky; g2.fillRect(X + 9, Y + 8, 14, 12); g2.strokeRect(X + 9, Y + 8, 14, 12); } break;
    case "l": base("#e8f4fc"); g2.fillStyle = K.orange; g2.fillRect(X + (x === 11 ? 6 : 0), Y + 2, T - 6, T - 2); g2.strokeRect(X + (x === 11 ? 6 : 0), Y + 2, T - 6, T - 2); break;
    case "F": base("#ece6da"); g2.fillStyle = K.water; g2.fillRect(X + 2, Y + 2, T - 4, T - 4); g2.strokeRect(X + 2, Y + 2, T - 4, T - 4); break;
    case "B": base(y < 5 ? "#c3d7aa" : "#ece6da"); g2.fillStyle = K.wood; g2.fillRect(X + 4, Y + 12, 24, 8); g2.strokeRect(X + 4, Y + 12, 24, 8); break;
    case "R": base(K.stone); g2.strokeStyle = "rgba(11,37,102,.25)"; for (let i = 8; i < T; i += 8) { g2.beginPath(); g2.moveTo(X, Y + i); g2.lineTo(X + T, Y + i); g2.stroke(); } break;
    case "X": base("#fbe9cf"); if (tile(x, y - 1) !== "X") { g2.fillStyle = K.blue; g2.fillRect(X, Y, T, 12); } g2.fillStyle = K.sky; g2.fillRect(X + 10, Y + 16, 12, 10); g2.strokeRect(X + 10, Y + 16, 12, 10); break;
    case "e": base("#fbe9cf"); g2.fillStyle = K.navy; g2.fillRect(X + 4, Y + 4, T - 8, T - 4); break;
    case "S": base("#ece6da"); g2.fillStyle = K.wood; g2.fillRect(X + 1, Y + 4, T - 2, 24); g2.strokeRect(X + 1, Y + 4, T - 2, 24); for (let i = 0; i < 4; i++) { g2.fillStyle = [K.orange, K.blue, K.yellow, "#3aa57a"][(i + x) % 4]; g2.fillRect(X + 4 + i * 6, Y + 8, 4, 16); } break;
    case "C": base(K.cream); g2.strokeRect(X + 1, Y + 1, T - 2, T - 2); if (y === 1) { g2.fillStyle = K.blue; g2.fillRect(X, Y, T, 10); } if (y === 3 && (x === 18 || x === 25)) { g2.fillStyle = K.yellow; g2.beginPath(); g2.arc(X + 16, Y + 16, 7, 0, 7); g2.fill(); g2.stroke(); } break;
    case "c": base(K.cream); g2.fillStyle = S.ch === 6 && !goalsLeftSafe() ? K.yellow : "#8a5a2c"; g2.fillRect(X + (x === 21 ? 6 : 0), Y + 2, T - 6, T - 2); g2.strokeRect(X + (x === 21 ? 6 : 0), Y + 2, T - 6, T - 2); break;
    case "+": base(y === 0 ? K.grass2 : "#c3d7aa"); g2.fillStyle = y === 0 ? K.yellow : K.wood; g2.fillRect(X + 13, Y + 2, 6, 28); g2.strokeRect(X + 13, Y + 2, 6, 28); g2.fillRect(X + 6, Y + 9, 20, 6); g2.strokeRect(X + 6, Y + 9, 20, 6); break;
    default: base(K.grass);
  }
}
const goalsLeftSafe = () => { try { return goalsLeft(); } catch { return 1; } };
function person(x, y, look, o = {}) {
  const b = o.walk ? Math.sin(o.walk) * 1.6 : 0, s = o.kid ? .8 : 1;
  g2.save(); g2.translate(Math.round(x), Math.round(y + b)); g2.scale(s, s); g2.lineWidth = 2; g2.strokeStyle = K.navy;
  g2.fillStyle = "rgba(11,37,102,.18)"; g2.beginPath(); g2.ellipse(0, 13 - b, 9, 3, 0, 0, 7); g2.fill();
  if (o.robe) { g2.fillStyle = look.shirt; g2.beginPath(); g2.moveTo(-8, -2); g2.lineTo(8, -2); g2.lineTo(10, 13); g2.lineTo(-10, 13); g2.closePath(); g2.fill(); g2.stroke(); g2.fillStyle = "#c98e63"; g2.fillRect(-2, -2, 4, 14); }
  else {
    const lg = o.sit ? 0 : Math.sin(o.walk || 0) * 3;
    g2.beginPath(); if (o.sit) { g2.moveTo(-3, 6); g2.lineTo(-7, 8); g2.moveTo(3, 6); g2.lineTo(7, 8); } else { g2.moveTo(-3, 6); g2.lineTo(-3 + lg, 12); g2.moveTo(3, 6); g2.lineTo(3 - lg, 12); } g2.stroke();
    g2.fillStyle = look.shirt; g2.beginPath(); if (g2.roundRect) g2.roundRect(-7, -3, 14, 11, 4); else g2.rect(-7, -3, 14, 11); g2.fill(); g2.stroke();
    if (o.priest) { g2.fillStyle = K.white; g2.fillRect(-2, -3, 4, 3); }
  }
  g2.fillStyle = look.skin; g2.beginPath(); g2.arc(0, -10, 8, 0, 7); g2.fill(); g2.stroke();
  g2.fillStyle = look.hair; g2.beginPath(); g2.arc(0, -12, 8, Math.PI * 1.05, Math.PI * 1.95); g2.fill();
  if (o.robe) { g2.beginPath(); g2.arc(0, -12, 8.5, Math.PI * .9, Math.PI * 2.1); g2.stroke(); }
  if (o.dir !== 3) { g2.fillStyle = K.navy; const ex = o.dir === 1 ? -2 : o.dir === 2 ? 2 : 0; g2.fillRect(-3 + ex, -10, 2, 2); g2.fillRect(2 + ex, -10, 2, 2);
    g2.lineWidth = 1.2; g2.beginPath(); if (o.sad) g2.arc(ex + .5, -4.5, 2.2, Math.PI + .3, -.3); else g2.arc(ex + .5, -7, 2.2, .2, Math.PI - .2); g2.stroke(); }
  if (o.old) { g2.lineWidth = 1; g2.strokeRect(-5, -11.5, 4, 3); g2.strokeRect(1, -11.5, 4, 3); }
  g2.restore();
}
function dog(x, y, t) { g2.save(); g2.translate(x, y + Math.sin(t * 6)); g2.lineWidth = 2; g2.strokeStyle = K.navy; g2.fillStyle = "#b5793f"; g2.beginPath(); g2.ellipse(0, 4, 9, 6, 0, 0, 7); g2.fill(); g2.stroke(); g2.beginPath(); g2.arc(8, -2, 5, 0, 7); g2.fill(); g2.stroke(); g2.fillStyle = K.navy; g2.fillRect(9, -3, 2, 2); g2.restore(); }
function sparkle(x, y, t, col = K.yellow) { g2.save(); g2.translate(x, y - 6 + Math.sin(t * 3) * 3); g2.fillStyle = col; g2.strokeStyle = K.navy; g2.lineWidth = 1.5; g2.beginPath(); for (let i = 0; i < 8; i++) { const r = i % 2 ? 3 : 8, a = (i * Math.PI) / 4; g2.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g2.closePath(); g2.fill(); g2.stroke(); g2.restore(); }
function pageIco(x, y, t) { g2.save(); g2.translate(x, y + Math.sin(t * 3) * 2); g2.rotate(-.15); g2.fillStyle = K.white; g2.strokeStyle = K.navy; g2.lineWidth = 2; g2.fillRect(-7, -9, 14, 18); g2.strokeRect(-7, -9, 14, 18); g2.strokeStyle = K.blue; g2.lineWidth = 1; for (let i = -5; i < 6; i += 3) { g2.beginPath(); g2.moveTo(-4, i); g2.lineTo(4, i); g2.stroke(); } g2.restore(); }
function food(x, y, t, fish) {
  g2.save(); g2.translate(x, y + Math.sin(t * 3) * 2); g2.lineWidth = 2; g2.strokeStyle = K.navy;
  if (fish) { g2.fillStyle = K.sky; g2.beginPath(); g2.ellipse(-2, 0, 9, 5, 0, 0, 7); g2.fill(); g2.stroke(); g2.beginPath(); g2.moveTo(6, 0); g2.lineTo(12, -5); g2.lineTo(12, 5); g2.closePath(); g2.fill(); g2.stroke(); }
  else { g2.fillStyle = "#e3a857"; g2.beginPath(); g2.ellipse(0, 0, 10, 7, 0, 0, 7); g2.fill(); g2.stroke(); g2.beginPath(); g2.moveTo(-4, -4); g2.lineTo(-2, 2); g2.moveTo(2, -5); g2.lineTo(4, 1); g2.stroke(); }
  g2.restore();
}
function cart(x, y) { // carrito de completos con su quitasol
  g2.save(); g2.translate(x, y); g2.lineWidth = 2; g2.strokeStyle = K.navy;
  g2.fillStyle = "#e8e8ee"; g2.fillRect(-18, -6, 36, 18); g2.strokeRect(-18, -6, 36, 18);
  g2.fillStyle = K.orange; g2.fillRect(-18, -6, 36, 6); g2.strokeRect(-18, -6, 36, 6);
  g2.fillStyle = K.white; g2.font = "bold 7px sans-serif"; g2.textAlign = "center"; g2.fillText("COMPLETOS", 0, 9);
  g2.fillStyle = "#555"; g2.beginPath(); g2.arc(-11, 14, 4, 0, 7); g2.fill(); g2.stroke(); g2.beginPath(); g2.arc(11, 14, 4, 0, 7); g2.fill(); g2.stroke();
  g2.beginPath(); g2.moveTo(0, -6); g2.lineTo(0, -22); g2.stroke();
  for (let i = 0; i < 4; i++) { g2.fillStyle = i % 2 ? K.yellow : K.orange; g2.beginPath(); g2.moveTo(0, -30); g2.lineTo(-22 + i * 11, -20); g2.lineTo(-11 + i * 11, -20); g2.closePath(); g2.fill(); g2.stroke(); }
  g2.restore();
}
function bubble(x, y) { g2.fillStyle = K.white; g2.strokeStyle = K.navy; g2.lineWidth = 2; g2.beginPath(); g2.arc(x + 12, y - 26, 8, 0, 7); g2.fill(); g2.stroke(); g2.fillStyle = K.navy; g2.font = "bold 11px sans-serif"; g2.textAlign = "center"; g2.fillText("…", x + 12, y - 23); }
function draw(t) {
  if (!g2) return;
  const vw = vp.w, vh = vp.h;
  const cx = Math.max(0, Math.min(W * T - vw, S.x - vw / 2)), cy = Math.max(0, Math.min(H * T - vh, S.y - vh / 2));
  g2.setTransform(dpr, 0, 0, dpr, 0, 0);
  g2.fillStyle = K.grass; g2.fillRect(0, 0, vw, vh);
  g2.save(); g2.translate(-Math.round(cx), -Math.round(cy));
  const x0 = Math.floor(cx / T), y0 = Math.floor(cy / T), x1 = Math.ceil((cx + vw) / T), y1 = Math.ceil((cy + vh) / T);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (x >= 0 && y >= 0 && x < W && y < H) drawTile(map[y][x], x, y);
  const list = [];
  if (S.inCh) {
    for (const it of (CH().items ? CH().items() : [])) {
      if (!it.show) continue; const a = AT(it);
      if (it.kind === "dog") dog(a.x, a.y, t); else if (it.kind === "page") pageIco(a.x, a.y, t); else if (it.kind === "spark") sparkle(a.x, a.y, t, K.sky); else food(a.x, a.y, t, it.kind === "fish");
    }
    if (S.lamp && ((S.ch === 4 && !Q().examen && Q().plan) || (S.ch === 5 && !Q().rest))) sparkle(38.5 * T, 2.5 * T - 8, t);
    { const a = AT({ x: 27, y: 8 }); list.push({ y: a.y, f: () => cart(a.x, a.y) }); } // el carrito de completos: parte del pueblo
    for (const n of npcsNow()) {
      const p = PEOPLE[n.id], a = AT(n), yy = n.tree ? a.y - 14 : a.y;
      list.push({ y: a.y, f: () => { person(a.x, yy, p.look, { robe: p.robe, old: p.old, kid: p.kid, priest: p.priest, sit: n.sit, sad: n.sit && (n.id === "nico" || n.id === "lucho"), dir: 0 }); if (near(n, n.tree ? 2.2 : 1.7) && !dlg) bubble(a.x, yy); } });
    }
  }
  const fol = [...(S.ally ? ["ally"] : []), ...(S.inCh ? party() : [])];
  fol.forEach((id, i) => {
    const p = trail.length > 14 * (i + 1) ? trail[14 * (i + 1)] : { x: S.x - 12 * (i + 1) * (S.dir === 2 ? 1 : S.dir === 1 ? -1 : 0), y: S.y + 14 * (i + 1) * (S.dir === 3 ? 1 : S.dir === 0 ? -1 : 0) };
    const look = id === "ally" ? { hair: "#3b2a1f", skin: "#e9b98f", shirt: K.yellow } : PEOPLE[id].look;
    list.push({ y: p.y, f: () => person(p.x, p.y, look, { walk: anim ? anim + i : 0, old: PEOPLE[id] && PEOPLE[id].old }) });
    if (id === "ana" && S.ch === 1) list.push({ y: p.y + 1, f: () => dog(p.x + 14, p.y + 6, t) });
  });
  list.push({ y: S.y, f: () => person(S.x, S.y, LOOKS[S.look] || LOOKS[0], { walk: anim, dir: S.dir }) });
  list.sort((a, b) => a.y - b.y).forEach((o) => o.f());
  if (S.ally && !dlg && S.inCh) {
    const goal = nextGoal();
    if (goal && goal.at) { const a = Math.atan2((goal.at.y + .5) * T - S.y, (goal.at.x + .5) * T - S.x);
      g2.save(); g2.translate(S.x + Math.cos(a) * 26, S.y + Math.sin(a) * 26 - 4); g2.rotate(a); g2.fillStyle = K.yellow; g2.strokeStyle = K.navy; g2.lineWidth = 1.5;
      g2.beginPath(); g2.moveTo(8, 0); g2.lineTo(-5, -6); g2.lineTo(-5, 6); g2.closePath(); g2.fill(); g2.stroke(); g2.restore(); }
  }
  g2.restore();
  const tint = sky(); if (tint) { g2.fillStyle = tint; g2.fillRect(0, 0, vw, vh); }
}
function loop(ts) { const dt = Math.min(0.05, (ts - (last || ts)) / 1000); last = ts; step(dt); draw(ts / 1000); raf = requestAnimationFrame(loop); }

// ---------------------------------------------------------------------------
// Pantalla
// ---------------------------------------------------------------------------
export const artSvg = () => `<svg viewBox="0 0 64 64" width="100%" height="100%"><path d="M4 58 Q24 40 32 30 T60 8" fill="none" stroke="#f3dfb3" stroke-width="10" stroke-linecap="round"/>
  <path d="M4 58 Q24 40 32 30 T60 8" fill="none" stroke="#0b2566" stroke-width="2" stroke-dasharray="3 5"/><circle cx="52" cy="12" r="7" fill="#ffba03" stroke="#0b2566" stroke-width="2"/>
  <circle cx="20" cy="40" r="5" fill="#f2c9a0" stroke="#0b2566" stroke-width="2"/><rect x="15" y="45" width="10" height="9" rx="3" fill="#ef591c" stroke="#0b2566" stroke-width="2"/>
  <circle cx="31" cy="34" r="5" fill="#d7a77c" stroke="#0b2566" stroke-width="2"/><path d="M25 50 L31 39 L37 50 Z" fill="#f3efe6" stroke="#0b2566" stroke-width="2"/></svg>`;

export function view(q = "") {
  load();
  const de = new URLSearchParams(q).get("de");
  if (de !== null) { const who = de.replace(/[^\p{L} ]/gu, "").trim().slice(0, 20); if (!S.started) { S.invited = who || "un amigo"; S.ally = true; save(); } }
  ctx.onAfterRender(() => { document.body.classList.add("solo-on"); mount(); });
  ctx.onLeave(() => { document.body.classList.remove("solo-on"); unmount(); });
  return `<div class="em" id="emRoot">
    <canvas id="emCanvas" aria-label="Mapa del juego Emaús"></canvas>
    <div class="em-hud" id="emHud"></div>
    <div class="em-pad" id="emPad" aria-hidden="true"><span data-d="u"></span><span data-d="l"></span><span data-d="r"></span><span data-d="d"></span></div>
    <button class="em-act" id="emAct" aria-label="Hablar">Hablar</button>
    <div class="em-dlg" id="emDlg" hidden></div>
    <div class="em-menu" id="emMenu" hidden></div>
    <div id="emStart"></div>
  </div>`;
}
function resize() {
  const root = $("#emRoot"); if (!root || !canvas) return;
  dpr = Math.min(2, window.devicePixelRatio || 1); vp.w = root.clientWidth; vp.h = root.clientHeight;
  canvas.width = vp.w * dpr; canvas.height = vp.h * dpr; canvas.style.width = vp.w + "px"; canvas.style.height = vp.h + "px";
}
function mount() {
  const rootEl = $("#emRoot"); if (rootEl && rootEl.parentElement !== document.body) document.body.appendChild(rootEl);
  buildMap();
  canvas = $("#emCanvas"); g2 = canvas.getContext("2d"); resize();
  window.addEventListener("resize", resize); window.addEventListener("keydown", kd); window.addEventListener("keyup", ku);
  const padEl = $("#emPad");
  const padSet = (e) => { const r = padEl.getBoundingClientRect(); const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2), m = Math.hypot(dx, dy) || 1; pad = m < 8 ? { x: 0, y: 0 } : { x: dx / m, y: dy / m }; };
  padEl.addEventListener("pointerdown", (e) => { padEl.setPointerCapture(e.pointerId); padSet(e); });
  padEl.addEventListener("pointermove", (e) => { if (e.buttons) padSet(e); });
  const padEnd = () => { pad = { x: 0, y: 0 }; };
  padEl.addEventListener("pointerup", padEnd); padEl.addEventListener("pointercancel", padEnd);
  canvas.addEventListener("pointerdown", (e) => {
    if (dlg) return next();
    if (!S.inCh) return;
    const r = canvas.getBoundingClientRect(), cx = Math.max(0, Math.min(W * T - vp.w, S.x - vp.w / 2)), cy = Math.max(0, Math.min(H * T - vp.h, S.y - vp.h / 2));
    const wx = e.clientX - r.left + cx, wy = e.clientY - r.top + cy;
    const n = npcsNow().find((x) => Math.hypot(AT(x).x - wx, AT(x).y - wy) < 22);
    if (n && near(n, n.tree ? 2.2 : 1.9)) return talkTo(n.id);
    target = { x: wx, y: wy };
  });
  $("#emAct").addEventListener("click", action);
  $("#emDlg").addEventListener("click", (e) => { if (!e.target.closest("button")) next(); });
  paintHud(); paintDlg();
  if (!S.started) startScreen(); else if (!S.inCh) chaptersScreen();
  last = 0; raf = requestAnimationFrame(loop);
  window.__emaus = { get S() { return S; }, talk: talkTo, next, choose, act: action, start: startChapter, tp: (x, y) => { S.x = (x + .5) * T; S.y = (y + .5) * T; trail = []; events(); }, goal: nextGoal, door };
}
function unmount() {
  cancelAnimationFrame(raf); window.removeEventListener("resize", resize); window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku);
  keys.clear(); pad = { x: 0, y: 0 }; dlg = null; save(); delete window.__emaus;
  document.querySelectorAll("body > #emRoot").forEach((n) => n.remove());
}
function kd(e) {
  if (!$("#emRoot") || $(".em-start")) return;
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "Enter"].includes(k)) e.preventDefault();
  if (k === " " || k === "Enter" || k === "e") { action(); return; }
  if (dlg && dlg.q[dlg.i] && dlg.q[dlg.i].ch && /^[1-4]$/.test(k)) { choose(+k - 1); return; }
  if (k === "Escape") { toggleMenu(); return; }
  keys.add(k);
}
const ku = (e) => keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key);

function paintHud() {
  const h = $("#emHud"); if (!h) return;
  if (!S.inCh) { h.innerHTML = `<button class="em-menu-btn" data-action="emMenu" aria-label="Menú">Menú</button>`; return; }
  const c = CH(), g = nextGoal(), tleft = Q().timer ? Math.max(0, Math.ceil((Q().timer - Date.now()) / 1000)) : 0;
  h.innerHTML = `<div class="em-chap"><b>Capítulo ${c.n}</b> · ${esc(c.title)}
      <span class="em-qs">${c.quests.map((q) => `<i class="${q.done() ? "on" : ""}" title="${esc(q.t)}"></i>`).join("")}</span></div>
    <p class="em-goal">${esc(g.t)}${tleft ? ` <span class="em-timer">${tleft} s</span>` : ""}</p>
    <button class="em-menu-btn" data-action="emMenu" aria-label="Menú">Menú</button>`;
}
let lastHud = "";
setInterval(() => { if (!$("#emHud") || !S.inCh) return; const k = JSON.stringify([nextGoal().t, CH().quests.map((q) => q.done()), Q().timer && Math.ceil((Q().timer - Date.now()) / 1000)]); if (k !== lastHud) { lastHud = k; paintHud(); } }, 300);

function portrait(w) {
  if (!w || w.big) return "";
  if (w.dog) return `<span class="em-face em-dog"></span>`;
  const look = w.look; if (!look) return "";
  return `<span class="em-face" style="--skin:${look.skin};--hair:${look.hair};--shirt:${look.shirt}"><i></i></span>`;
}
function paintDlg() {
  const d = $("#emDlg"); if (!d) return;
  if (!dlg) { d.hidden = true; d.innerHTML = ""; return; }
  const l = dlg.q[dlg.i]; d.hidden = false;
  const w = l.who;
  if (l.quiet) {
    d.innerHTML = `<div class="em-quiet"><p>${esc(l.msg || "En silencio, con Él.")}</p><div class="em-bar"><i style="animation-duration:${l.quiet}s"></i></div></div>`;
    setTimeout(() => { if (dlg && dlg.q[dlg.i] === l) next(); }, l.quiet * 1000); return;
  }
  if (l.order) {
    if (!l.shuffled) { l.shuffled = l.order.map((x, i) => [x, i]).sort(() => Math.random() - .5); if (l.shuffled.every(([, i], k) => i === k)) l.shuffled.reverse(); }
    const got = dlg.pick;
    d.innerHTML = `<div class="em-box">${portrait(w)}<div class="em-txt">${w && w.n ? `<b>${esc(w.n)}</b>` : ""}<p>${esc(l.t)}</p>
      <ol class="em-ord">${got.map((i) => `<li>${esc(l.order[i])}</li>`).join("")}</ol>
      <div class="em-ch em-ch-grid">${l.shuffled.filter(([, i]) => !got.includes(i)).map(([x, i]) => `<button data-action="emOrder" data-i="${i}">${esc(x)}</button>`).join("")}</div>
      ${dlg.miss ? `<p class="em-hint">${esc(l.hint || "Inténtalo otra vez.")}</p>` : ""}</div></div>`;
    return;
  }
  d.innerHTML = `${w && w.big ? `<img class="em-scene" src="${stickerSrc(w.st, "#ffba03")}" alt="">` : ""}
    <div class="em-box">${portrait(w)}<div class="em-txt">${w && w.n ? `<b>${esc(w.n)}</b>` : ""}<p>${esc(l.t)}</p>
    ${l.ch ? `<div class="em-ch">${l.ch.map((c, i) => `<button data-action="emChoose" data-i="${i}">${esc(c[0])}</button>`).join("")}</div>` : `<span class="em-more">Toca para seguir</span>`}</div></div>`;
}
function pickOrder(i) {
  const l = dlg && dlg.q[dlg.i]; if (!l || !l.order) return;
  const want = dlg.pick.length;
  if (i !== want) { dlg.pick = []; dlg.miss = true; paintDlg(); return; }
  dlg.pick.push(i); dlg.miss = false;
  if (dlg.pick.length === l.order.length) { paintDlg(); setTimeout(() => { const d = dlg.done; dlg = null; paintDlg(); save(); paintHud(); d && d(); }, 500); return; }
  paintDlg();
}

const hideCards = () => { const el = $("#emStart"); if (el) el.innerHTML = ""; };
function startScreen() {
  $("#emStart").innerHTML = `<div class="em-start"><div class="em-card">
    <img src="${stickerSrc("emaus", "#ffba03")}" alt="" class="em-hero">
    <h1>Emaús</h1><p class="em-k">El arte de encontrarnos · 6 capítulos</p>
    <p class="em-sub">Llegas a un pueblo donde no conoces a nadie. Sábado a sábado encuentras amigos, aprendes a acoger, a escuchar y a cuidar… y un Caminante te acompaña en cada encuentro.</p>
    ${S.invited ? `<p class="em-inv">Te invitó ${esc(S.invited)}: empiezas con un compañero de camino que te muestra hacia dónde ir.</p>` : ""}
    <label class="em-lbl">Tu nombre <small>(solo el nombre, queda en este teléfono)</small><input id="emName" maxlength="16" value="${esc(S.name)}" placeholder="Ej: Cami"></label>
    <div class="em-looks">${LOOKS.map((l, i) => `<button data-action="emLook" data-i="${i}" class="${S.look === i ? "on" : ""}" aria-label="Personaje ${i + 1}"><span class="em-face" style="--skin:${l.skin};--hair:${l.hair};--shirt:${l.shirt}"><i></i></span></button>`).join("")}</div>
    <button class="btn btn-primary" data-action="emGo">Comenzar el camino</button>
    <p class="em-help">Muévete con las flechas, el control de la pantalla o tocando donde quieres ir. Para hablar, acércate y toca «Hablar».</p>
    <a class="em-back" href="#/juegos">Volver a los juegos</a></div></div>`;
}
function chaptersScreen() {
  const nextN = Math.min(6, (S.cd.length ? Math.max(...S.cd) : 0) + 1);
  $("#emStart").innerHTML = `<div class="em-start"><div class="em-card em-chaps">
    <h1>Emaús</h1><p class="em-k">El arte de encontrarnos</p>
    <ol class="em-list">${CHAPTERS.map((c) => {
      const done = S.cd.includes(c.n), open = done || c.n <= nextN;
      return `<li><button data-action="emChap" data-n="${c.n}" ${open ? "" : "disabled"} class="${done ? "done" : ""} ${c.n === nextN && !done ? "next" : ""}">
        <img src="${stickerSrc(c.st, done ? "#ffba03" : "#8ad2fa")}" alt=""><span><small>Capítulo ${c.n}${done ? " · completado" : open ? "" : " · bloqueado"}</small><b>${esc(c.title)}</b><em>${esc(c.mod)}</em></span></button></li>`;
    }).join("")}</ol>
    <button class="btn btn-gold btn-sm" data-action="emInvite">Invitar a alguien a jugar</button>
    <a class="em-back" href="#/juegos">Volver a los juegos</a></div></div>`;
}
function chapterCard(c) {
  const nxt = CHAPTERS[c.n];
  $("#emStart").innerHTML = `<div class="em-start"><div class="em-card">
    <img src="${stickerSrc(c.st, "#ffba03")}" alt="" class="em-hero">
    <p class="em-k">Capítulo ${c.n} completado · ${esc(c.badge)}</p>
    <h1 class="em-h2">${esc(c.title)}</h1>
    <p class="em-sub">${esc(c.end.idea)}</p>
    <p class="small">Palabra: ${esc(c.end.word)}. Basado en el ${esc(c.mod.split(" · ")[0].toLowerCase())} del curso «El Arte de Encontrarnos».</p>
    ${nxt ? `<button class="btn btn-primary" data-action="emChap" data-n="${nxt.n}">Capítulo ${nxt.n}: ${esc(nxt.title)}</button>` : ""}
    <button class="btn btn-soft btn-sm" data-action="emChapters">Ver los capítulos</button>
    <button class="btn btn-gold btn-sm" data-action="emInvite">Invitar a alguien a jugar</button></div></div>`;
}
function endScreen() {
  $("#emStart").innerHTML = `<div class="em-start em-end"><div class="em-card">
    <img src="${stickerSrc("eucaristia", "#ffba03")}" alt="" class="em-hero">
    <h1 class="em-h2">Lo reconocieron al partir el pan</h1>
    <p class="em-sub">Jesús camina contigo aunque no siempre lo reconozcas. Lo encuentras en la misa, en su Palabra y en una comunidad que no deja a nadie solo. Y desde ahí, te envía.</p>
    <p class="small">Inspirado en Lucas 24,13-35 y en el curso «El Arte de Encontrarnos».</p>
    <a class="btn btn-primary" href="#/oracion">Entrar a la Capilla Ágape</a>
    <button class="btn btn-gold" data-action="emInvite">Invitar a alguien a hacer el camino</button>
    <a class="btn btn-soft" href="familias/">Conocer la Pastoral Juvenil Ágape</a>
    <button class="btn btn-ghost btn-sm" data-action="emChapters">Ver los capítulos</button></div></div>`;
}
function toggleMenu() {
  const m = $("#emMenu"); if (!m) return;
  if (!m.hidden) { m.hidden = true; return; }
  m.hidden = false;
  m.innerHTML = `<div class="em-card"><h2>Emaús</h2>
    ${S.inCh ? `<p class="small">Capítulo ${CH().n}: ${esc(CH().title)}</p><ul class="em-ql">${CH().quests.map((q) => `<li class="${q.done() ? "on" : ""}">${esc(q.t)} <small>(unidad ${esc(q.u)})</small></li>`).join("")}</ul>` : ""}
    <button class="btn btn-gold" data-action="emInvite">Invitar a alguien a jugar</button>
    <p class="xs muted">${S.ally ? "Ya tienes un compañero de camino: la flecha amarilla te muestra hacia dónde ir." : "Al invitar a alguien se suma un compañero de camino que muestra hacia dónde ir. Es un regalo: no hace falta para terminar."}</p>
    <button class="btn btn-soft" data-action="emMenu">Seguir jugando</button>
    <button class="btn btn-ghost btn-sm" data-action="emChapters">Capítulos</button>
    <a class="btn btn-ghost btn-sm" href="#/juegos">Salir</a></div>`;
}

function registerActions() {
  const A = ctx.actions;
  A.emChoose = (el) => choose(+el.dataset.i);
  A.emOrder = (el) => pickOrder(+el.dataset.i);
  A.emLook = (el) => { S.look = +el.dataset.i; save(); document.querySelectorAll(".em-looks button").forEach((b, i) => b.classList.toggle("on", i === S.look)); };
  A.emGo = () => { S.name = ($("#emName")?.value || "").replace(/[^\p{L} ]/gu, "").trim().slice(0, 16); S.started = true; save(); startChapter(1); };
  A.emChap = (el) => { $("#emMenu").hidden = true; startChapter(+el.dataset.n); };
  A.emChapters = () => { $("#emMenu").hidden = true; dlg = null; paintDlg(); S.inCh = false; save(); paintHud(); chaptersScreen(); };
  A.emMenu = () => toggleMenu();
  A.emInvite = async () => {
    const url = `${APP}emaus/${S.name ? "?de=" + encodeURIComponent(S.name) : ""}`;
    const text = "Te invito a jugar «Emaús», el juego de la Pastoral Juvenil Ágape: un camino para encontrarte con Jesús y con amigos.";
    let ok = false;
    try { if (navigator.share) { await navigator.share({ title: "Emaús · agAPPe", text, url }); ok = true; } } catch (e) { if (e && e.name === "AbortError") return; }
    if (!ok) { try { await navigator.clipboard.writeText(`${text}\n${url}`); ok = true; toastEm("Enlace copiado. Pégalo en WhatsApp para invitar."); } catch { toastEm(url); } }
    if (ok && !S.ally) { S.ally = true; save(); toastEm("Se suma un compañero de camino: la flecha amarilla te muestra hacia dónde ir."); }
    const m = $("#emMenu"); if (m) m.hidden = true;
  };
}
function toastEm(t) { const d = document.createElement("div"); d.className = "em-toast"; d.textContent = t; $("#emRoot")?.appendChild(d); setTimeout(() => d.remove(), 3200); }
