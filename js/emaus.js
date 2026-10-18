// Emaús: juego de rol de agAPPe. Un pueblo, un camino y un caminante que acompaña.
// Recorres el pueblo invitando a los que están solos (comunidad), encuentras las páginas
// perdidas de la Biblia (formación) y subes al cerro a rezar (oración). Al atardecer, en la capilla,
// el caminante parte el pan y lo reconoces: es Jesús (Lc 24,13-35). Cristo en el centro.
// Se juega sin cuenta ni internet; el avance queda en este teléfono.
// Invitar a alguien es un regalo, no una obligación: suma un compañero de camino que da pistas.

import { esc } from "./util.js";
import { stickerSrc } from "./stickers-img.js";

let ctx = null;
export function setup(c) { ctx = c; registerActions(); }
const $ = (s, r = document) => r.querySelector(s);
const APP = "https://pj-agape.github.io/Formacion_Monitores/";
const KEY = "agape_emaus";

// ---------------------------------------------------------------------------
// Paleta del logo
// ---------------------------------------------------------------------------
const K = { navy: "#0b2566", blue: "#1351a4", sky: "#8ad2fa", orange: "#ef591c", yellow: "#ffba03", cream: "#fff6e5", white: "#ffffff",
  grass: "#bfe3a6", grass2: "#a9d68d", path: "#f3dfb3", path2: "#e8cd95", water: "#6cc3f0", water2: "#9bdaf8", stone: "#d9d4cc", wood: "#b5793f", roof: "#ef591c", dark: "#3e4a6b" };

// ---------------------------------------------------------------------------
// El mapa: se arma con rectángulos para que sea fácil de leer y de cambiar
// ---------------------------------------------------------------------------
const W = 44, H = 34, T = 32;
const SOLID = new Set(["T", "H", "F", "B", "#", "S", "C", "+", "~", "R", "X", "k"]);
let map = [];
const set = (x, y, c) => { if (x >= 0 && y >= 0 && x < W && y < H) map[y][x] = c; };
const rect = (x, y, w, h, c) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) set(i, j, c); };
function buildMap() {
  map = Array.from({ length: H }, () => Array(W).fill("."));
  // bosque alrededor
  rect(0, 0, W, 1, "T"); rect(0, H - 1, W, 1, "T"); rect(0, 0, 1, H, "T"); rect(W - 1, 0, 1, H, "T");
  [[2, 2], [3, 9], [2, 22], [15, 3], [27, 3], [42, 12], [41, 30], [16, 30], [25, 31], [13, 9], [30, 20], [33, 31], [3, 31], [11, 31]].forEach(([x, y]) => set(x, y, "T"));
  rect(1, 1, 2, 2, "T"); rect(41, 1, 2, 2, "T"); rect(1, 26, 1, 4, "T");
  // caminos principales: norte-sur hacia la capilla y oeste-este
  rect(21, 6, 2, 27, ":"); rect(3, 18, 38, 2, ":");
  // flores
  [[19, 8], [24, 9], [19, 12], [25, 14], [18, 22], [25, 23], [6, 13], [14, 21], [33, 21], [10, 28], [32, 28]].forEach(([x, y]) => set(x, y, "f"));
  // CAPILLA (norte, al centro)
  rect(17, 1, 10, 5, "C"); set(21, 5, "c"); set(22, 5, "c"); rect(21, 0, 2, 1, "+");
  // PUEBLO (sur): casas con su puerta
  for (const [x, y] of [[6, 23], [13, 26], [27, 24], [33, 23]]) { rect(x, y, 4, 3, "H"); set(x + 1, y + 2, "D"); }
  rect(23, 28, 6, 1, ":"); rect(28, 27, 1, 1, ":"); rect(8, 21, 1, 2, ":"); rect(14, 20, 1, 6, ":"); rect(34, 20, 1, 3, ":");
  // arbustos donde se esconde Canela
  rect(4, 29, 3, 2, "k"); set(5, 31, "."); rect(9, 30, 2, 2, "k");
  // PLAZA (oeste): pileta y bancos
  rect(4, 11, 11, 7, "p"); rect(8, 13, 3, 2, "F"); set(5, 12, "B"); set(13, 12, "B"); set(5, 16, "B"); set(13, 16, "B");
  // TORRE (noroeste) con su escalera
  rect(3, 3, 5, 5, "R"); set(5, 7, "s"); rect(5, 8, 1, 3, ":");
  // BIBLIOTECA (este): fachada y patio con estantes
  rect(29, 9, 12, 2, "X"); set(34, 10, "e"); set(35, 10, "e");
  rect(29, 11, 12, 6, "p"); rect(30, 12, 4, 1, "S"); rect(36, 12, 4, 1, "S"); rect(30, 14, 3, 1, "S"); rect(35, 14, 5, 1, "S"); rect(34, 17, 1, 1, ":");
  // RÍO (este) con su puente
  rect(37, 19, 2, 14, "~"); rect(37, 18, 2, 2, "w"); rect(37, 20, 2, 1, "~");
  // CERRO (noreste): sendero oscuro hasta la cruz
  rect(29, 1, 12, 7, "h"); rect(33, 7, 1, 2, "d"); set(33, 6, "d"); rect(33, 4, 1, 2, "d"); rect(34, 3, 4, 1, "d");
  set(38, 2, "+"); set(37, 3, "B"); rect(29, 1, 1, 7, "T"); rect(40, 1, 1, 7, "T"); rect(30, 7, 3, 1, "T"); rect(34, 7, 6, 1, "T"); rect(30, 1, 3, 2, "T");
  // muro que separa capilla y cerro
  rect(27, 1, 2, 7, "T"); rect(15, 1, 2, 7, "T"); rect(9, 1, 6, 1, "T");
}
const tile = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? "T" : map[y][x]);
function solid(tx, ty) {
  const c = tile(tx, ty);
  if (c === "d") return !S.lamp; // el sendero del cerro se ve recién con la lámpara de la Palabra
  if (c === "c") return true; // la puerta de la capilla se abre en la escena final
  return SOLID.has(c);
}

// ---------------------------------------------------------------------------
// Estado de la partida
// ---------------------------------------------------------------------------
const FRESH = () => ({ v: 1, name: "", look: 0, x: 29.5 * T, y: 29.5 * T, dir: 0, started: false,
  friends: [], dog: 0, bags: 0, pages: [], quiz: 0, lamp: false, prayed: false, met: 0, done: false, invited: "", ally: false, talked: {} });
let S = FRESH();
function load() { try { const s = JSON.parse(localStorage.getItem(KEY) || "null"); if (s && s.v === 1) S = { ...FRESH(), ...s }; } catch { /* */ } }
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* */ } }
const value = { comunidad: () => S.friends.length >= 3, formacion: () => S.lamp, oracion: () => S.prayed };
const progress = () => ["comunidad", "formacion", "oracion"].filter((k) => value[k]()).length;

// Apariencias del personaje (pelo, piel, polera)
const LOOKS = [
  { hair: "#3b2a1f", skin: "#f2c9a0", shirt: K.orange },
  { hair: "#1d1d2b", skin: "#c98e63", shirt: K.blue },
  { hair: "#a8622e", skin: "#f6d3b3", shirt: K.yellow },
  { hair: "#5a3a26", skin: "#8d5b3d", shirt: "#3aa57a" },
];

// ---------------------------------------------------------------------------
// Personajes
// ---------------------------------------------------------------------------
const NPC = [
  { id: "sofi", n: "Sofi", x: 26, y: 29, look: { hair: "#6b3a22", skin: "#f1c7a1", shirt: K.sky }, st: "amigos" },
  { id: "tomas", n: "Tomás", x: 13, y: 15, look: { hair: "#222", skin: "#d8a77e", shirt: "#7d6bd6" }, st: "acogida", sit: true },
  { id: "ana", n: "Ana", x: 6, y: 15, look: { hair: "#c2732f", skin: "#f6d3b3", shirt: "#e66b9a" }, st: "amigos" },
  { id: "lucho", n: "Don Lucho", x: 11, y: 19, look: { hair: "#e8e8e8", skin: "#e2b48c", shirt: "#8a6b4a" }, st: "acogida", old: true },
  { id: "marta", n: "Profe Marta", x: 35, y: 16, look: { hair: "#4a2f20", skin: "#c48a64", shirt: "#3aa57a" }, st: "biblia" },
  { id: "camin", n: "Caminante", x: 23, y: 17, look: { hair: "#4b3426", skin: "#d7a77c", shirt: "#f3efe6" }, st: "emaus", robe: true },
  { id: "sacri", n: "Pepe, el sacristán", x: 23, y: 7, look: { hair: "#777", skin: "#e2b48c", shirt: K.navy }, st: "eucaristia", old: true },
];
const DOG = { x: 5, y: 30 };
const PAGES = [
  { id: 0, x: 38, y: 13, where: "entre los estantes" },
  { id: 1, x: 40, y: 27, where: "a la orilla del río" },
  { id: 2, x: 5, y: 8, where: "al pie de la torre" },
];
const PAGE_TXT = [
  { ref: "Salmo 119,105", t: "Tu Palabra es una lámpara para mis pasos y una luz en mi camino.",
    q: "¿Qué es la Palabra de Dios para nuestros pasos, según el Salmo?", o: ["Una lámpara que ilumina", "Un mapa con atajos", "Una muralla que protege"], c: 0 },
  { ref: "Juan 15,15", t: "Jesús dice: ya no los llamo servidores, los llamo amigos.",
    q: "¿Cómo nos llama Jesús en el Evangelio de Juan?", o: ["Servidores", "Amigos", "Desconocidos"], c: 1 },
  { ref: "Mateo 18,20", t: "Donde dos o tres se reúnen en mi nombre, ahí estoy yo en medio de ellos.",
    q: "¿Dónde está Jesús, según Mateo 18,20?", o: ["Solo en los templos grandes", "Donde dos o tres se reúnen en su nombre", "Muy lejos, en el cielo"], c: 1 },
];
const AT = (o) => ({ x: (o.x + 0.5) * T, y: (o.y + 0.5) * T });
const near = (o, d = 1.6) => { const p = AT(o); return Math.hypot(p.x - S.x, p.y - S.y) < d * T; };

// ---------------------------------------------------------------------------
// Diálogos
// ---------------------------------------------------------------------------
let dlg = null; // { q: [ {who, st, t, ch:[[label, fn]]} ], i }
function say(lines, done) { dlg = { q: lines, i: 0, done }; paintDlg(); }
function next() {
  if (!dlg) return;
  const l = dlg.q[dlg.i]; if (l && l.ch) return;
  dlg.i++;
  if (dlg.i >= dlg.q.length) { const d = dlg.done; dlg = null; paintDlg(); save(); d && d(); return; }
  paintDlg();
}
function choose(n) {
  const l = dlg && dlg.q[dlg.i]; if (!l || !l.ch) return;
  const fn = l.ch[n][1]; dlg = null; paintDlg(); fn && fn(); save();
}
const L = (who, t, extra = {}) => ({ who, t, ...extra });
const me = () => S.name || "Tú";

function talk(npc) {
  S.talked[npc.id] = (S.talked[npc.id] || 0) + 1;
  const F = S.friends;
  switch (npc.id) {
    case "sofi":
      if (!S.met) {
        S.met = 1;
        return say([L(npc, `¡Hola${S.name ? ", " + S.name : ""}! Te vi medio aburrido estos días.`), L(npc, "Hoy al atardecer celebramos la misa en la capilla, la del cerrito al norte. ¿Vienes?"),
          L(npc, "Mientras tanto, ¿me ayudas? En la plaza hay gente que anda sola. Vamos a invitarlos."),
          L(npc, "Y la Profe Marta perdió unas páginas de su Biblia. Está en la biblioteca, al este."),
          L(npc, "Nos vemos en la capilla. ¡Nadie camina solo!")]);
      }
      return say([L(npc, progress() < 3 ? "Todavía queda tiempo antes de la misa. ¡Ánimo!" : "¡Ya va a empezar! Vamos a la capilla.")]);
    case "tomas":
      if (F.includes("tomas")) return say([L(npc, "Gracias por invitarme. No conocía a nadie aquí.")]);
      return say([L(npc, "…"), L(npc, "Llegué hace poco al pueblo. Todos parecen tener su grupo."),
        { who: npc, t: "¿Qué le dices?", ch: [
          ["«¿Te vienes con nosotros? Esta tarde hay misa y después compartimos.»", () => { F.push("tomas"); say([L(npc, "¿En serio? ¡Bueno, vamos!"), L(null, "Tomás se suma al grupo. A veces basta una invitación.")]); }],
          ["«Ánimo, ya vas a encontrar amigos.»", () => say([L(npc, "Sí, puede ser…"), L(null, "Tomás sigue solo. Quizás puedes invitarlo de verdad.")])],
        ] }]);
    case "ana":
      if (F.includes("ana")) return say([L(npc, "Canela está feliz. ¡Y yo también!")]);
      if (S.dog === 2) { F.push("ana"); return say([L(npc, "¡Canela! ¡La encontraste!"), L(npc, "Gracias. ¿Puedo ir con ustedes a la misa?"), L(null, "Ana se suma al grupo.")]); }
      S.dog = Math.max(S.dog, 1);
      return say([L(npc, "¿Has visto a Canela? Es mi perrita café. Se arrancó hacia el pueblo, por los arbustos del sur."), L(null, "Busca a Canela entre los arbustos del pueblo.")]);
    case "lucho":
      if (F.includes("lucho")) return say([L(npc, "Gracias por la ayuda. Nos vemos en la misa.")]);
      if (S.bags === 2) { F.push("lucho"); return say([L(npc, "¡Llegaron mis bolsas! Muchas gracias."), L(npc, "Desde que murió mi señora casi no salgo. Hoy voy a ir a misa con ustedes."), L(null, "Don Lucho se suma al grupo.")]); }
      if (S.bags === 1) return say([L(npc, "Mi casa es la de la puerta azul, al suroeste. Déjalas en la puerta, por favor.")]);
      S.bags = 1;
      return say([L(npc, "Ay, estas bolsas pesan mucho para mis años."), L(npc, "¿Me las llevas a mi casa? Es la del suroeste, por el camino de la plaza."), L(null, "Llevas las bolsas de Don Lucho. Déjalas en su puerta.")]);
    case "marta": {
      if (S.lamp) return say([L(npc, "La Palabra ilumina el camino. Ahora puedes subir al cerro, al noreste: el sendero ya se ve.")]);
      const got = S.pages.length;
      if (got < 3) return say([L(npc, "¡Hola! Se me volaron tres páginas de mi Biblia con el viento."),
        L(npc, `Llevas ${got} de 3. Busca ${PAGES.filter((p) => !S.pages.includes(p.id)).map((p) => p.where).join(", ")}.`)]);
      return quiz(npc);
    }
    case "camin": {
      const p = progress();
      if (S.done) return say([L(npc, "…")]);
      const intro = [L(npc, "Hola. ¿De qué venías conversando por el camino? Te noto pensativo."),
        L({ n: me() }, "De muchas cosas. A veces siento que me falta algo y no sé qué es."),
        L(npc, "Sigue caminando. Lo que buscas está más cerca de lo que crees.")];
      const mid = [
        [L(npc, "Desde el principio, Dios quiso caminar con su pueblo. Nunca nos dejó solos.")],
        [L(npc, "Los profetas anunciaban a alguien que vendría a dar su vida por sus amigos.")],
        [L(npc, "El que viene a servir y da su vida… ¿no te arde el corazón cuando lo escuchas?")],
        [L(npc, "Ya está atardeciendo. Te acompaño hasta la capilla.")],
      ];
      if ((S.talked.camin || 0) === 1) return say(intro);
      return say(mid[p]);
    }
    case "sacri":
      if (progress() < 3) return say([L(npc, "La misa es al atardecer. Todavía falta un poco."), L(npc, `Te esperamos. Vienen tus amigos: ${progress()} de 3 cosas listas antes de la misa.`)]);
      return finale();
  }
}

function quiz(npc) {
  const ask = (i) => {
    if (i >= 3) {
      S.lamp = true; S.quiz = 3;
      return say([L(npc, "¡Muy bien! La Palabra no es solo para saberla: es para vivirla."), L(npc, "Toma esta lámpara. Con ella se ve el sendero del cerro, al noreste."),
        L(null, "Recibes la Lámpara de la Palabra. Formación: completa.")]);
    }
    const p = PAGE_TXT[i];
    say([L(npc, `Página ${i + 1}: «${p.t}» (${p.ref}).`), { who: npc, t: p.q, ch: p.o.map((o, k) => [o, () => (k === p.c ? say([L(npc, "¡Exacto!")], () => ask(i + 1)) : say([L(npc, "Casi. Léela otra vez con calma.")], () => ask(i)))]) }]);
  };
  say([L(npc, "¡Encontraste las tres páginas! Gracias."), L(npc, "Leamos juntos lo que dicen.")], () => ask(0));
}

function pray() {
  if (S.prayed) return say([L(null, "Aquí, frente a la cruz, se está en paz. Puedes volver cuando quieras.")]);
  say([L(null, "Llegas a la cima. Hay una cruz, una banca y mucho silencio."),
    L(null, "Rezar no es difícil: es conversar con Jesús como con un amigo. Él ya está aquí."),
    { who: null, t: "¿Qué quieres decirle?", ch: [
      ["Gracias por…", () => stay("Le das gracias por las personas que hoy pusiste en tu camino.")],
      ["Te pido por…", () => stay("Le pides por alguien que lo necesita. Él lo escucha.")],
      ["Perdóname por…", () => stay("Le pides perdón. Su mirada es de misericordia, no de reproche.")],
    ] }]);
  function stay(t) {
    say([L(null, t), L(null, "Quédate un momento con Él, sin apuro."), { who: null, t: "", quiet: 8 }, L(null, "«Señor, gracias por estar conmigo.»"),
      L(null, "Bajas del cerro con el corazón en paz. Oración: completa.")], () => { S.prayed = true; save(); });
  }
}

function finale() {
  S.done = true; save();
  const P = (st, t) => ({ who: { n: "", st, big: true }, t });
  say([
    L(NPC[6], "¡Ya es la hora! Pasen, pasen."),
    P("comunidad", "Entras a la capilla con Sofi, Tomás, Ana y Don Lucho. El Caminante también entró y se sienta contigo."),
    P("emaus", "Le dices: «Quédate con nosotros, que ya es tarde». Él se queda."),
    P("eucaristia", "En la misa, el sacerdote toma el pan, da gracias, lo parte y lo reparte."),
    P("emaus", "Entonces se te abren los ojos y lo reconoces: el Caminante era Jesús. Siempre estuvo contigo en el camino."),
    P("jesus", "«¿No ardía nuestro corazón mientras nos hablaba en el camino?» (cf. Lc 24,32)"),
    P("eucaristia", "Jesús sigue partiendo el pan en cada misa. Lo encuentras en la Eucaristía, en su Palabra y en la comunidad."),
    P("amigos", "Y como los discípulos de Emaús, sales corriendo a contarlo a los demás."),
  ], () => { showEnd(); });
}

// ---------------------------------------------------------------------------
// Movimiento y colisiones
// ---------------------------------------------------------------------------
const keys = new Set();
let pad = { x: 0, y: 0 }, target = null, last = 0, raf = 0, trail = [], anim = 0, canvas = null, g2 = null, vp = { w: 0, h: 0 }, dpr = 1;
const R = 10; // radio del personaje
function free(px, py) {
  for (const [dx, dy] of [[-R, -R], [R, -R], [-R, R], [R, R], [0, R], [0, -R]]) if (solid(Math.floor((px + dx) / T), Math.floor((py + dy) / T))) return false;
  for (const n of NPC) { if ((n.id === "camin" && S.done) || S.friends.includes(n.id)) continue; const p = AT(n); if (Math.hypot(p.x - px, p.y - py) < R + 9) return false; }
  return true;
}
function step(dt) {
  if (dlg || !S.started || $(".em-end")) return;
  let vx = 0, vy = 0;
  if (keys.has("ArrowLeft") || keys.has("a")) vx -= 1;
  if (keys.has("ArrowRight") || keys.has("d")) vx += 1;
  if (keys.has("ArrowUp") || keys.has("w")) vy -= 1;
  if (keys.has("ArrowDown") || keys.has("s")) vy += 1;
  vx += pad.x; vy += pad.y;
  if (!vx && !vy && target) {
    const dx = target.x - S.x, dy = target.y - S.y, d = Math.hypot(dx, dy);
    if (d < 4) { target = null; } else { vx = dx / d; vy = dy / d; }
  } else if (vx || vy) target = null;
  const m = Math.hypot(vx, vy);
  if (!m) { anim = 0; return; }
  vx /= m; vy /= m;
  const sp = 125 * dt;
  const nx = S.x + vx * sp, ny = S.y + vy * sp;
  let moved = false;
  if (free(nx, S.y)) { S.x = nx; moved = true; }
  if (free(S.x, ny)) { S.y = ny; moved = true; }
  if (!moved && target) target = null;
  S.dir = Math.abs(vx) > Math.abs(vy) ? (vx < 0 ? 1 : 2) : vy < 0 ? 3 : 0;
  anim += dt * 8;
  trail.unshift({ x: S.x, y: S.y }); if (trail.length > 140) trail.length = 140;
  events();
}
// Lo que pasa al pisar ciertos lugares
function events() {
  const tx = Math.floor(S.x / T), ty = Math.floor(S.y / T);
  if (S.dog === 1 && Math.hypot(DOG.x - tx, DOG.y - ty) <= 1.6) { S.dog = 2; say([L({ n: "Canela", dog: true }, "¡Guau!"), L(null, "Encontraste a Canela. Llévala de vuelta con Ana, en la plaza.")]); }
  for (const p of PAGES) if (!S.pages.includes(p.id) && Math.hypot(p.x - tx, p.y - ty) < 1) {
    S.pages.push(p.id); say([L(null, `Encontraste una página de la Biblia (${S.pages.length} de 3): «${PAGE_TXT[p.id].t}» (${PAGE_TXT[p.id].ref}).`)]);
  }
  if (S.bags === 1 && tx === 7 && (ty === 25 || ty === 26)) { S.bags = 2; say([L(null, "Dejas las bolsas en la puerta de Don Lucho. Vuelve a contarle, está en la plaza.")]); }
  if (!S.prayed && S.lamp && tx >= 36 && tx <= 38 && ty <= 4) pray();
}
function action() {
  if (dlg) return next();
  const n = NPC.find((x) => !(x.id === "camin" && S.done) && near(x));
  if (n) return talk(n);
  if (S.lamp && Math.hypot(38 - S.x / T, 3 - S.y / T) < 2.2) return pray();
}

// ---------------------------------------------------------------------------
// Dibujo
// ---------------------------------------------------------------------------
function sky() { // del mediodía al atardecer, según lo avanzado
  const p = S.done ? 3 : progress();
  return [null, "rgba(255,186,3,.06)", "rgba(239,89,28,.12)", "rgba(239,89,28,.2)"][p];
}
function drawTile(c, x, y) {
  const X = x * T, Y = y * T;
  const base = (col) => { g2.fillStyle = col; g2.fillRect(X, Y, T, T); };
  const alt = (x + y) % 2;
  switch (c) {
    case ".": case "f": base(alt ? K.grass : K.grass2);
      if (c === "f") { for (const [a, b, col] of [[8, 10, K.orange], [22, 8, K.yellow], [14, 22, "#e66b9a"]]) { g2.fillStyle = col; g2.beginPath(); g2.arc(X + a, Y + b, 3, 0, 7); g2.fill(); } }
      break;
    case ":": case "s": base(alt ? K.path : K.path2); break;
    case "p": base(alt ? "#ece6da" : "#e2dccf"); g2.strokeStyle = "rgba(11,37,102,.08)"; g2.strokeRect(X + .5, Y + .5, T - 1, T - 1); break;
    case "h": base(alt ? "#cfe0b7" : "#c3d7aa"); break;
    case "d": base(S.lamp ? (alt ? K.path : K.path2) : "#4a5a7a"); if (!S.lamp) { g2.fillStyle = "rgba(11,37,102,.35)"; g2.fillRect(X, Y, T, T); } break;
    case "~": base(alt ? K.water : K.water2); g2.strokeStyle = "rgba(255,255,255,.6)"; g2.beginPath(); g2.moveTo(X + 6, Y + 14); g2.quadraticCurveTo(X + 12, Y + 10, X + 18, Y + 14); g2.stroke(); break;
    case "w": base(K.wood); g2.strokeStyle = "#8a5a2c"; for (let i = 4; i < T; i += 8) { g2.beginPath(); g2.moveTo(X, Y + i); g2.lineTo(X + T, Y + i); g2.stroke(); } break;
    case "T": base(alt ? K.grass : K.grass2); g2.fillStyle = "#8a5a2c"; g2.fillRect(X + 13, Y + 18, 6, 12);
      g2.fillStyle = "#4f9a5a"; g2.strokeStyle = K.navy; g2.lineWidth = 2; g2.beginPath(); g2.arc(X + 16, Y + 13, 11, 0, 7); g2.fill(); g2.stroke(); break;
    case "k": base(K.grass2); g2.fillStyle = "#6fb36a"; g2.strokeStyle = K.navy; g2.lineWidth = 1.5;
      for (const [a, b] of [[10, 16], [22, 14], [16, 22]]) { g2.beginPath(); g2.arc(X + a, Y + b, 8, 0, 7); g2.fill(); g2.stroke(); } break;
    case "H": base("#fbe9cf"); g2.strokeStyle = K.navy; g2.lineWidth = 2; g2.strokeRect(X + 1, Y + 1, T - 2, T - 2);
      if (tile(x, y - 1) !== "H") { g2.fillStyle = K.roof; g2.fillRect(X, Y, T, 12); g2.strokeRect(X, Y, T, 12); } break;
    case "D": base("#fbe9cf"); g2.fillStyle = x === 7 ? K.blue : "#8a5a2c"; g2.fillRect(X + 8, Y + 6, 16, 26); g2.strokeStyle = K.navy; g2.strokeRect(X + 8, Y + 6, 16, 26); break;
    case "F": base("#ece6da"); g2.fillStyle = K.water; g2.strokeStyle = K.navy; g2.lineWidth = 2; g2.fillRect(X + 2, Y + 2, T - 4, T - 4); g2.strokeRect(X + 2, Y + 2, T - 4, T - 4); break;
    case "B": base(y < 5 ? "#c3d7aa" : "#ece6da"); g2.fillStyle = K.wood; g2.fillRect(X + 4, Y + 12, 24, 8); g2.strokeStyle = K.navy; g2.strokeRect(X + 4, Y + 12, 24, 8); break;
    case "R": base(K.stone); g2.strokeStyle = "rgba(11,37,102,.25)"; for (let i = 8; i < T; i += 8) { g2.beginPath(); g2.moveTo(X, Y + i); g2.lineTo(X + T, Y + i); g2.stroke(); } break;
    case "X": base("#fbe9cf"); if (tile(x, y - 1) !== "X") { g2.fillStyle = K.blue; g2.fillRect(X, Y, T, 12); } g2.fillStyle = K.sky; g2.fillRect(X + 10, Y + 16, 12, 10); g2.strokeStyle = K.navy; g2.strokeRect(X + 10, Y + 16, 12, 10); break;
    case "e": base("#fbe9cf"); g2.fillStyle = K.navy; g2.fillRect(X + 4, Y + 4, T - 8, T - 4); break;
    case "S": base("#ece6da"); g2.fillStyle = K.wood; g2.fillRect(X + 1, Y + 4, T - 2, 24); g2.strokeStyle = K.navy; g2.strokeRect(X + 1, Y + 4, T - 2, 24);
      for (let i = 0; i < 4; i++) { g2.fillStyle = [K.orange, K.blue, K.yellow, "#3aa57a"][(i + x) % 4]; g2.fillRect(X + 4 + i * 6, Y + 8, 4, 16); } break;
    case "C": base("#fff6e5"); g2.strokeStyle = K.navy; g2.lineWidth = 2; g2.strokeRect(X + 1, Y + 1, T - 2, T - 2);
      if (y === 1) { g2.fillStyle = K.blue; g2.fillRect(X, Y, T, 10); }
      if (y === 3 && (x === 18 || x === 25)) { g2.fillStyle = K.yellow; g2.beginPath(); g2.arc(X + 16, Y + 16, 7, 0, 7); g2.fill(); g2.stroke(); } break;
    case "c": base("#fff6e5"); g2.fillStyle = S.done ? K.yellow : "#8a5a2c"; g2.fillRect(X + (x === 21 ? 6 : 0), Y + 2, T - 6, T - 2); g2.strokeStyle = K.navy; g2.lineWidth = 2; g2.strokeRect(X + (x === 21 ? 6 : 0), Y + 2, T - 6, T - 2); break;
    case "+": base(y === 0 ? K.grass2 : "#c3d7aa"); g2.fillStyle = y === 0 ? K.yellow : K.wood; g2.strokeStyle = K.navy; g2.lineWidth = 2;
      g2.fillRect(X + 13, Y + 2, 6, 28); g2.strokeRect(X + 13, Y + 2, 6, 28); g2.fillRect(X + 6, Y + 9, 20, 6); g2.strokeRect(X + 6, Y + 9, 20, 6); break;
    default: base(K.grass);
  }
}
function person(x, y, look, o = {}) {
  const b = o.walk ? Math.sin(o.walk) * 1.6 : 0;
  g2.save(); g2.translate(Math.round(x), Math.round(y + b)); g2.lineWidth = 2; g2.strokeStyle = K.navy;
  g2.fillStyle = "rgba(11,37,102,.18)"; g2.beginPath(); g2.ellipse(0, 13 - b, 9, 3, 0, 0, 7); g2.fill();
  if (o.robe) { g2.fillStyle = look.shirt; g2.beginPath(); g2.moveTo(-8, -2); g2.lineTo(8, -2); g2.lineTo(10, 13); g2.lineTo(-10, 13); g2.closePath(); g2.fill(); g2.stroke();
    g2.fillStyle = "#c98e63"; g2.fillRect(-2, -2, 4, 14); }
  else {
    // piernas y cuerpo
    const lg = o.sit ? 0 : Math.sin(o.walk || 0) * 3;
    g2.beginPath(); g2.moveTo(-3, 6); g2.lineTo(-3 + lg, 12); g2.moveTo(3, 6); g2.lineTo(3 - lg, 12); g2.stroke();
    g2.fillStyle = look.shirt; g2.beginPath(); g2.roundRect ? g2.roundRect(-7, -3, 14, 11, 4) : g2.rect(-7, -3, 14, 11); g2.fill(); g2.stroke();
  }
  // cabeza (redonda, como los monos de la app)
  g2.fillStyle = look.skin; g2.beginPath(); g2.arc(0, -10, 8, 0, 7); g2.fill(); g2.stroke();
  g2.fillStyle = look.hair; g2.beginPath(); g2.arc(0, -12, 8, Math.PI * 1.05, Math.PI * 1.95); g2.fill();
  if (o.robe) { g2.beginPath(); g2.arc(0, -12, 8.5, Math.PI * .9, Math.PI * 2.1); g2.stroke(); }
  if (o.dir !== 3) { g2.fillStyle = K.navy; const ex = o.dir === 1 ? -2 : o.dir === 2 ? 2 : 0; g2.fillRect(-3 + ex, -10, 2, 2); g2.fillRect(2 + ex, -10, 2, 2);
    g2.strokeStyle = K.navy; g2.lineWidth = 1.2; g2.beginPath(); g2.arc(ex + .5, -7, 2.2, .2, Math.PI - .2); g2.stroke(); }
  if (o.old) { g2.strokeStyle = K.navy; g2.lineWidth = 1; g2.strokeRect(-5, -11.5, 4, 3); g2.strokeRect(1, -11.5, 4, 3); }
  g2.restore();
}
function dog(x, y, t) {
  g2.save(); g2.translate(x, y + Math.sin(t * 6) * 1); g2.lineWidth = 2; g2.strokeStyle = K.navy; g2.fillStyle = "#b5793f";
  g2.beginPath(); g2.ellipse(0, 4, 9, 6, 0, 0, 7); g2.fill(); g2.stroke(); g2.beginPath(); g2.arc(8, -2, 5, 0, 7); g2.fill(); g2.stroke();
  g2.fillStyle = K.navy; g2.fillRect(9, -3, 2, 2); g2.restore();
}
function sparkle(x, y, t, col = K.yellow) {
  g2.save(); g2.translate(x, y - 6 + Math.sin(t * 3) * 3); g2.fillStyle = col; g2.strokeStyle = K.navy; g2.lineWidth = 1.5;
  g2.beginPath(); for (let i = 0; i < 8; i++) { const r = i % 2 ? 3 : 8, a = (i * Math.PI) / 4; g2.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g2.closePath(); g2.fill(); g2.stroke(); g2.restore();
}
function page(x, y, t) {
  g2.save(); g2.translate(x, y + Math.sin(t * 3) * 2); g2.rotate(-.15); g2.fillStyle = K.white; g2.strokeStyle = K.navy; g2.lineWidth = 2;
  g2.fillRect(-7, -9, 14, 18); g2.strokeRect(-7, -9, 14, 18); g2.strokeStyle = K.blue; g2.lineWidth = 1;
  for (let i = -5; i < 6; i += 3) { g2.beginPath(); g2.moveTo(-4, i); g2.lineTo(4, i); g2.stroke(); } g2.restore();
}
function draw(t) {
  if (!g2) return;
  const vw = vp.w, vh = vp.h;
  const cx = Math.max(0, Math.min(W * T - vw, S.x - vw / 2)), cy = Math.max(0, Math.min(H * T - vh, S.y - vh / 2));
  g2.setTransform(dpr, 0, 0, dpr, 0, 0);
  g2.fillStyle = K.grass; g2.fillRect(0, 0, vw, vh);
  g2.save(); g2.translate(-Math.round(cx), -Math.round(cy));
  const x0 = Math.floor(cx / T), y0 = Math.floor(cy / T), x1 = Math.ceil((cx + vw) / T), y1 = Math.ceil((cy + vh) / T);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (x >= 0 && y >= 0 && x < W && y < H) drawTile(map[y][x], x, y);
  // objetos
  for (const p of PAGES) if (!S.pages.includes(p.id) && S.met) { const a = AT(p); page(a.x, a.y, t); }
  if (S.dog === 1) { const a = AT(DOG); dog(a.x, a.y, t); }
  if (S.lamp && !S.prayed) sparkle(38.5 * T, 2.5 * T - 8, t, K.yellow);
  if (S.bags === 1) sparkle(7.5 * T, 26.5 * T - 10, t, K.sky);
  // personajes, de arriba hacia abajo
  const list = NPC.filter((n) => !(S.friends.includes(n.id)) && !(n.id === "camin" && S.done)).map((n) => ({ y: AT(n).y, f: () => {
    const a = AT(n); person(a.x, a.y, n.look, { robe: n.robe, old: n.old, sit: n.sit, dir: 0 });
    if (near(n, 2.2) && !dlg) { g2.fillStyle = K.white; g2.strokeStyle = K.navy; g2.lineWidth = 2; g2.beginPath(); g2.arc(a.x + 12, a.y - 26, 8, 0, 7); g2.fill(); g2.stroke(); g2.fillStyle = K.navy; g2.font = "bold 11px sans-serif"; g2.textAlign = "center"; g2.fillText("…", a.x + 12, a.y - 23); }
  } }));
  // los amigos que se suman caminan detrás (la comunidad se nota)
  const followers = [...(S.ally ? ["ally"] : []), ...S.friends];
  followers.forEach((id, i) => {
    const p = trail.length > 14 * (i + 1) ? trail[14 * (i + 1)] : { x: S.x - 12 * (i + 1) * (S.dir === 2 ? 1 : S.dir === 1 ? -1 : 0), y: S.y + 14 * (i + 1) * (S.dir === 3 ? 1 : S.dir === 0 ? -1 : 0) };
    const look = id === "ally" ? { hair: "#3b2a1f", skin: "#e9b98f", shirt: K.yellow } : (NPC.find((n) => n.id === id) || {}).look;
    list.push({ y: p.y, f: () => person(p.x, p.y, look, { walk: anim ? anim + i : 0, old: id === "lucho" }) });
    if (id === "ana") list.push({ y: p.y + 1, f: () => dog(p.x + 14, p.y + 6, t) });
  });
  list.push({ y: S.y, f: () => person(S.x, S.y, LOOKS[S.look] || LOOKS[0], { walk: anim, dir: S.dir }) });
  list.sort((a, b) => a.y - b.y).forEach((o) => o.f());
  // brújula del compañero de camino (premio por invitar)
  if (S.ally && !dlg) {
    const goal = nextGoal();
    if (goal && goal.at) { const a = Math.atan2(goal.at.y * T - S.y, goal.at.x * T - S.x);
      g2.save(); g2.translate(S.x + Math.cos(a) * 26, S.y + Math.sin(a) * 26 - 4); g2.rotate(a); g2.fillStyle = K.yellow; g2.strokeStyle = K.navy; g2.lineWidth = 1.5;
      g2.beginPath(); g2.moveTo(8, 0); g2.lineTo(-5, -6); g2.lineTo(-5, 6); g2.closePath(); g2.fill(); g2.stroke(); g2.restore(); }
  }
  g2.restore();
  const tint = sky(); if (tint) { g2.fillStyle = tint; g2.fillRect(0, 0, vw, vh); }
}
function loop(ts) {
  const dt = Math.min(0.05, (ts - (last || ts)) / 1000); last = ts;
  step(dt); draw(ts / 1000);
  raf = requestAnimationFrame(loop);
}

// ---------------------------------------------------------------------------
// Objetivo del momento
// ---------------------------------------------------------------------------
function nextGoal() {
  if (!S.met) return { t: "Habla con Sofi, aquí cerca.", at: { x: 26, y: 29 } };
  if (S.friends.length < 3) {
    if (!S.friends.includes("tomas")) return { t: "Invita a los que están solos en la plaza.", at: { x: 13, y: 15 } };
    if (!S.friends.includes("ana")) return S.dog === 1 ? { t: "Busca a Canela entre los arbustos del pueblo.", at: DOG } : { t: "Ana, en la plaza, necesita ayuda.", at: { x: 6, y: 15 } };
    if (!S.friends.includes("lucho")) return S.bags === 1 ? { t: "Lleva las bolsas a la puerta azul de Don Lucho.", at: { x: 7, y: 26 } } : { t: "Don Lucho, en la plaza, necesita una mano.", at: { x: 11, y: 19 } };
  }
  if (!S.lamp) { const p = PAGES.find((x) => !S.pages.includes(x.id)); return p ? { t: `Busca las páginas de la Biblia (${S.pages.length} de 3).`, at: p } : { t: "Lleva las páginas a la Profe Marta, en la biblioteca.", at: { x: 35, y: 16 } }; }
  if (!S.prayed) return { t: "Sube al cerro con la lámpara y reza frente a la cruz.", at: { x: 37, y: 4 } };
  if (!S.done) return { t: "Atardece: ve a la capilla, es la hora de la misa.", at: { x: 23, y: 7 } };
  return { t: "Camino completado.", at: null };
}

// ---------------------------------------------------------------------------
// Pantalla
// ---------------------------------------------------------------------------
export const artSvg = () => `<svg viewBox="0 0 64 64" width="100%" height="100%"><path d="M4 58 Q24 40 32 30 T60 8" fill="none" stroke="#f3dfb3" stroke-width="10" stroke-linecap="round"/>
  <path d="M4 58 Q24 40 32 30 T60 8" fill="none" stroke="#0b2566" stroke-width="2" stroke-dasharray="3 5"/><circle cx="52" cy="12" r="7" fill="#ffba03" stroke="#0b2566" stroke-width="2"/>
  <circle cx="20" cy="40" r="5" fill="#f2c9a0" stroke="#0b2566" stroke-width="2"/><rect x="15" y="45" width="10" height="9" rx="3" fill="#ef591c" stroke="#0b2566" stroke-width="2"/>
  <circle cx="31" cy="34" r="5" fill="#d7a77c" stroke="#0b2566" stroke-width="2"/><path d="M25 50 L31 39 L37 50 Z" fill="#f3efe6" stroke="#0b2566" stroke-width="2"/></svg>`;

let invitedBy = "";
export function view(q = "") {
  load();
  const de = new URLSearchParams(q).get("de");
  if (de) { invitedBy = de.replace(/[^\p{L} ]/gu, "").trim().slice(0, 20); if (!S.started) { S.invited = invitedBy || "un amigo"; S.ally = true; save(); } }
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
  dpr = Math.min(2, window.devicePixelRatio || 1);
  vp.w = root.clientWidth; vp.h = root.clientHeight;
  canvas.width = vp.w * dpr; canvas.height = vp.h * dpr; canvas.style.width = vp.w + "px"; canvas.style.height = vp.h + "px";
}
function mount() {
  // Fuera del contenedor de la página (que se anima con transform): así ocupa toda la pantalla.
  const rootEl = $("#emRoot"); if (rootEl && rootEl.parentElement !== document.body) document.body.appendChild(rootEl);
  buildMap();
  canvas = $("#emCanvas"); g2 = canvas.getContext("2d"); resize();
  window.addEventListener("resize", resize); window.addEventListener("keydown", kd); window.addEventListener("keyup", ku);
  const padEl = $("#emPad");
  const padSet = (e) => { const r = padEl.getBoundingClientRect(), t = e.touches ? e.touches[0] : e; const dx = t.clientX - (r.left + r.width / 2), dy = t.clientY - (r.top + r.height / 2), m = Math.hypot(dx, dy) || 1; pad = m < 8 ? { x: 0, y: 0 } : { x: dx / m, y: dy / m }; };
  padEl.addEventListener("pointerdown", (e) => { padEl.setPointerCapture(e.pointerId); padSet(e); });
  padEl.addEventListener("pointermove", (e) => { if (e.buttons) padSet(e); });
  const padEnd = () => { pad = { x: 0, y: 0 }; };
  padEl.addEventListener("pointerup", padEnd); padEl.addEventListener("pointercancel", padEnd);
  canvas.addEventListener("pointerdown", (e) => {
    if (dlg) return next();
    const r = canvas.getBoundingClientRect(), cx = Math.max(0, Math.min(W * T - vp.w, S.x - vp.w / 2)), cy = Math.max(0, Math.min(H * T - vp.h, S.y - vp.h / 2));
    const wx = e.clientX - r.left + cx, wy = e.clientY - r.top + cy;
    const n = NPC.find((x) => !(x.id === "camin" && S.done) && !S.friends.includes(x.id) && Math.hypot(AT(x).x - wx, AT(x).y - wy) < 22);
    if (n && near(n, 2.2)) return talk(n);
    target = { x: wx, y: wy };
  });
  $("#emAct").addEventListener("click", action);
  $("#emDlg").addEventListener("click", (e) => { if (!e.target.closest("button")) next(); });
  paintHud(); paintDlg();
  if (!S.started) startScreen();
  last = 0; raf = requestAnimationFrame(loop);
  window.__emaus = { S, talk: (id) => talk(NPC.find((n) => n.id === id)), next, choose, tp: (x, y) => { S.x = (x + .5) * T; S.y = (y + .5) * T; trail = []; events(); }, goal: nextGoal };
}
function unmount() {
  cancelAnimationFrame(raf); window.removeEventListener("resize", resize); window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku);
  keys.clear(); pad = { x: 0, y: 0 }; dlg = null; save(); delete window.__emaus;
  document.querySelectorAll("body > #emRoot").forEach((n) => n.remove());
}
function kd(e) {
  if (!$("#emRoot") || $(".em-start") || $(".em-end")) return;
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "Enter"].includes(k)) e.preventDefault();
  if (k === " " || k === "Enter" || k === "e") { action(); return; }
  if (dlg && dlg.q[dlg.i] && dlg.q[dlg.i].ch && /^[1-3]$/.test(k)) { choose(+k - 1); return; }
  if (k === "Escape") { toggleMenu(); return; }
  keys.add(k);
}
const ku = (e) => keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key);

function paintHud() {
  const h = $("#emHud"); if (!h) return;
  const g = nextGoal();
  const v = (k, label) => `<span class="em-v ${value[k]() ? "on" : ""}" title="${label}">${ICON[k]}<small>${label}</small></span>`;
  h.innerHTML = `<div class="em-vals">${v("comunidad", "Comunidad")}${v("formacion", "Formación")}${v("oracion", "Oración")}
      <span class="em-v center ${S.done ? "on" : ""}" title="Cristo en el centro">${ICON.centro}<small>Cristo</small></span></div>
    <p class="em-goal">${esc(g.t)}</p>
    <button class="em-menu-btn" data-action="emMenu" aria-label="Menú">Menú</button>`;
}
const ICON = {
  comunidad: `<svg viewBox="0 0 24 24"><circle cx="8" cy="9" r="3"/><circle cx="16" cy="9" r="3"/><path d="M3 19c1-3 3-4 5-4s4 1 5 4M11 19c1-3 3-4 5-4s4 1 5 4"/></svg>`,
  formacion: `<svg viewBox="0 0 24 24"><path d="M12 3c2 3 4 5 4 8a4 4 0 0 1-8 0c0-3 2-5 4-8z"/><path d="M9 18h6M10 21h4"/></svg>`,
  oracion: `<svg viewBox="0 0 24 24"><path d="M12 3v18M7 8h10"/></svg>`,
  centro: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 7v10M8.5 10.5h7"/></svg>`,
};
let lastHud = "";
setInterval(() => { if (!$("#emHud")) return; const k = JSON.stringify([progress(), nextGoal().t, S.done]); if (k !== lastHud) { lastHud = k; paintHud(); } }, 400);

function portrait(w) {
  if (!w) return "";
  if (w.dog) return `<span class="em-face em-dog"></span>`;
  if (w.big) return "";
  const look = w.look || (w.n === me() ? LOOKS[S.look] : null);
  if (look) return `<span class="em-face" style="--skin:${look.skin};--hair:${look.hair};--shirt:${look.shirt}"><i></i></span>`;
  return "";
}
function paintDlg() {
  const d = $("#emDlg"); if (!d) return;
  if (!dlg) { d.hidden = true; d.innerHTML = ""; return; }
  const l = dlg.q[dlg.i]; d.hidden = false;
  const w = l.who;
  if (l.quiet) {
    d.innerHTML = `<div class="em-quiet"><p>En silencio, con Él.</p><div class="em-bar"><i style="animation-duration:${l.quiet}s"></i></div></div>`;
    setTimeout(() => { if (dlg && dlg.q[dlg.i] === l) next(); }, l.quiet * 1000); return;
  }
  d.innerHTML = `${w && w.big ? `<img class="em-scene" src="${stickerSrc(w.st, "#ffba03")}" alt="">` : ""}
    <div class="em-box">${portrait(w)}<div class="em-txt">${w && w.n ? `<b>${esc(w.n)}</b>` : ""}<p>${esc(l.t)}</p>
    ${l.ch ? `<div class="em-ch">${l.ch.map((c, i) => `<button data-action="emChoose" data-i="${i}">${esc(c[0])}</button>`).join("")}</div>` : `<span class="em-more">Toca para seguir</span>`}</div></div>`;
}

function startScreen() {
  const el = $("#emStart");
  el.innerHTML = `<div class="em-start"><div class="em-card">
    <img src="${stickerSrc("emaus", "#ffba03")}" alt="" class="em-hero">
    <h1>Emaús</h1><p class="em-sub">Un juego de agAPPe. Recorre el pueblo, invita a los que están solos, busca la Palabra y sube a rezar. Al atardecer, alguien te espera en la capilla.</p>
    ${S.invited ? `<p class="em-inv">Te invitó ${esc(S.invited)}: empiezas con un compañero de camino que te muestra hacia dónde ir.</p>` : ""}
    <label class="em-lbl">Tu nombre <small>(solo el nombre, queda en este teléfono)</small><input id="emName" maxlength="16" value="${esc(S.name)}" placeholder="Ej: Cami"></label>
    <div class="em-looks">${LOOKS.map((l, i) => `<button data-action="emLook" data-i="${i}" class="${S.look === i ? "on" : ""}" aria-label="Personaje ${i + 1}"><span class="em-face" style="--skin:${l.skin};--hair:${l.hair};--shirt:${l.shirt}"><i></i></span></button>`).join("")}</div>
    <button class="btn btn-primary" data-action="emGo">Comenzar el camino</button>
    <p class="em-help">Muévete con las flechas, el control de la pantalla o tocando donde quieres ir. Para hablar, acércate y toca «Hablar».</p>
    <a class="em-back" href="#/juegos">Volver a los juegos</a></div></div>`;
}
function toggleMenu() {
  const m = $("#emMenu"); if (!m) return;
  if (!m.hidden) { m.hidden = true; return; }
  m.hidden = false;
  m.innerHTML = `<div class="em-card"><h2>Emaús</h2>
    <p class="small">Llevas ${progress()} de 3 y ${S.friends.length} amigos en el camino.</p>
    <button class="btn btn-gold" data-action="emInvite">Invitar a alguien a jugar</button>
    <p class="xs muted">${S.ally ? "Ya tienes un compañero de camino: la flecha amarilla te muestra hacia dónde ir." : "Al invitar a alguien, se suma un compañero de camino que te muestra hacia dónde ir. Es un regalo, no hace falta para terminar."}</p>
    <button class="btn btn-soft" data-action="emMenu">Seguir jugando</button>
    <button class="btn btn-ghost btn-sm" data-action="emReset">Empezar de nuevo</button>
    <a class="btn btn-ghost btn-sm" href="#/juegos">Salir</a></div>`;
}
function showEnd() {
  const el = $("#emStart");
  el.innerHTML = `<div class="em-start em-end"><div class="em-card">
    <img src="${stickerSrc("eucaristia", "#ffba03")}" alt="" class="em-hero">
    <h1>Lo reconocieron al partir el pan</h1>
    <p class="em-sub">Jesús camina contigo aunque no siempre lo reconozcas. Lo encuentras en la misa, en su Palabra y en una comunidad que no deja a nadie solo.</p>
    <p class="small">Inspirado en Lucas 24,13-35.</p>
    <a class="btn btn-primary" href="#/oracion">Entrar a la Capilla Ágape</a>
    <button class="btn btn-gold" data-action="emInvite">Invitar a alguien a hacer el camino</button>
    <a class="btn btn-soft" href="familias/">Conocer la Pastoral Juvenil Ágape</a>
    <button class="btn btn-ghost btn-sm" data-action="emReset">Jugar otra vez</button>
    <a class="em-back" href="#/juegos">Volver a los juegos</a></div></div>`;
}

function registerActions() {
  const A = ctx.actions;
  A.emChoose = (el) => choose(+el.dataset.i);
  A.emLook = (el) => { S.look = +el.dataset.i; save(); document.querySelectorAll(".em-looks button").forEach((b, i) => b.classList.toggle("on", i === S.look)); };
  A.emGo = () => {
    S.name = ($("#emName")?.value || "").replace(/[^\p{L} ]/gu, "").trim().slice(0, 16);
    S.started = true; save(); $("#emStart").innerHTML = ""; paintHud();
    say([L(null, `${S.name ? S.name + ", hoy" : "Hoy"} es sábado. Hace días que sientes que te falta algo.`), L(null, "Tu amiga Sofi te está esperando cerca de tu casa. Ve a saludarla.")]);
  };
  A.emMenu = () => toggleMenu();
  A.emReset = () => {
    if (!confirm("¿Empezar el camino de nuevo? Se borra el avance de este teléfono.")) return;
    const keep = { ally: S.ally, invited: S.invited, look: S.look, name: S.name };
    S = { ...FRESH(), ...keep }; save(); trail = []; $("#emMenu").hidden = true; startScreen(); paintHud();
  };
  A.emInvite = async () => {
    const url = `${APP}emaus/${S.name ? "?de=" + encodeURIComponent(S.name) : ""}`;
    const text = "Te invito a jugar «Emaús», el juego de la Pastoral Juvenil Ágape. Un camino para encontrarte con Jesús y con amigos:";
    let ok = false;
    try { if (navigator.share) { await navigator.share({ title: "Emaús · agAPPe", text, url }); ok = true; } } catch (e) { if (e && e.name === "AbortError") return; }
    if (!ok) { try { await navigator.clipboard.writeText(`${text}\n${url}`); ok = true; alertSoft("Enlace copiado. Pégalo en WhatsApp para invitar."); } catch { alertSoft(url); } }
    if (ok && !S.ally) { S.ally = true; save(); say([L(null, "Gracias por invitar. Se suma un compañero de camino: la flecha amarilla te mostrará hacia dónde ir.")]); }
    const m = $("#emMenu"); if (m) m.hidden = true;
  };
}
function alertSoft(t) { const d = document.createElement("div"); d.className = "em-toast"; d.textContent = t; $("#emRoot")?.appendChild(d); setTimeout(() => d.remove(), 3000); }
