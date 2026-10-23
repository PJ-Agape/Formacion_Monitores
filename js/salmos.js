// Oremos con los salmos: un salmo para cada momento del alma (la idea de San Atanasio en su
// «Carta a Marcelino») y una forma sencilla de rezarlo, paso a paso (Lectio Divina).
// Las fichas son nuestras. El texto completo de cada salmo se carga desde Gestión cuando la
// editorial lo autorice (content/salmos); mientras tanto, «Leer el salmo» abre una Biblia católica en línea.

import { esc, icon, toast } from "./util.js";

let ctx = null; // { actions, render, onAfterRender, cloud }
export function setup(c) { ctx = c; registerActions(); }
const $ = (s, r = document) => r.querySelector(s);
const st = () => ctx.cloud.state();

// ---------------------------------------------------------------------------
// Cómo llegas hoy
// ---------------------------------------------------------------------------
export const ESTADOS = [
  ["alegre", "Estoy alegre"], ["gracias", "Quiero dar gracias"], ["miedo", "Tengo miedo"], ["triste", "Estoy triste"],
  ["solo", "Me siento solo"], ["cansado", "Estoy cansado o inquieto"], ["perdon", "Quiero pedir perdón"],
  ["buscar", "Busco a Dios o no sé qué hacer"], ["creacion", "Me asombra lo que Dios hizo"], ["comunidad", "Por mis amigos y mi comunidad"],
];
const ELABEL = Object.fromEntries(ESTADOS);
// Estados en que, además del salmo, conviene recordar que no se camina solo.
const CUIDADO = ["triste", "solo", "miedo", "cansado"];

// ---------------------------------------------------------------------------
// Los salmos (numeración de la Biblia; entre paréntesis, la de la liturgia)
// t: título · e: estados · intro: de qué habla · v: un verso para quedarse · p: pregunta para conversar con Dios
// ---------------------------------------------------------------------------
export const SALMOS = [
  { n: 1, t: "Los dos caminos", e: ["buscar"], v: "Es como un árbol plantado junto al agua", ref: "Sal 1,3",
    intro: "El primer salmo es una puerta de entrada: muestra dos caminos y nos invita a elegir el que da vida. Quien se alimenta de la Palabra de Dios es como un árbol que no se seca.",
    p: "¿Qué camino estoy eligiendo en estos días? ¿De qué me estoy alimentando?" },
  { n: 4, t: "Me acuesto en paz", e: ["cansado", "miedo"], v: "En paz me acuesto y enseguida me duermo", ref: "Sal 4,9",
    intro: "Una oración para la noche. Alguien que tuvo un día difícil le entrega a Dios sus preocupaciones y descubre que puede descansar, porque Él lo cuida.",
    p: "¿Qué preocupación de hoy quiero dejar en las manos de Dios antes de dormir?" },
  { n: 8, t: "¿Qué es el hombre para que te acuerdes de él?", e: ["creacion", "alegre"], v: "¡Qué admirable es tu nombre en toda la tierra!", ref: "Sal 8,2",
    intro: "Mirando el cielo de noche, el salmista se siente pequeño. Y sin embargo descubre algo increíble: Dios se acuerda de cada uno y le confía su creación.",
    p: "¿Cuándo fue la última vez que me asombré de algo que Dios hizo? ¿Me sé valioso para Él?" },
  { n: 13, t: "¿Hasta cuándo, Señor?", e: ["triste", "solo"], v: "Yo confío en tu amor", ref: "Sal 13,6",
    intro: "Este salmo se atreve a reclamarle a Dios: «¿hasta cuándo?». Enseña que podemos decirle todo, incluso la tristeza y el cansancio. Y termina, poco a poco, en confianza.",
    p: "¿Qué le quiero decir a Dios con total sinceridad, aunque sea un reclamo?" },
  { n: 16, t: "Tú eres mi bien", e: ["alegre", "buscar"], alt: "15", v: "Me enseñarás el camino de la vida", ref: "Sal 16,11",
    intro: "Una oración de alguien que encontró lo más importante: Dios es su herencia y su alegría. Los primeros cristianos lo leyeron pensando en Jesús resucitado.",
    p: "¿Qué cosas ocupan el centro de mi vida? ¿Qué lugar tiene Dios entre ellas?" },
  { n: 19, t: "El cielo cuenta la gloria de Dios", e: ["creacion"], alt: "18", v: "El cielo proclama la gloria de Dios", ref: "Sal 19,2",
    intro: "El sol, el día y la noche hablan de Dios sin palabras. Y su Palabra es todavía más luminosa: alegra el corazón y da luz a los ojos.",
    p: "¿Dónde me habla Dios sin palabras? ¿Le doy tiempo a su Palabra?" },
  { n: 22, t: "Dios mío, ¿por qué me has abandonado?", e: ["triste", "solo"], alt: "21", v: "Tú, Señor, no te quedes lejos", ref: "Sal 22,20",
    intro: "Jesús rezó este salmo en la cruz. Empieza con un grito de dolor y termina con esperanza. Cuando sufrimos, no estamos solos: Jesús pasó por ahí antes que nosotros.",
    p: "¿Qué dolor quiero poner junto a la cruz de Jesús?" },
  { n: 23, t: "El Señor es mi pastor", e: ["miedo", "cansado", "solo"], alt: "22", v: "El Señor es mi pastor, nada me falta", ref: "Sal 23,1",
    intro: "El salmo más conocido. Dios es como un pastor que conoce a cada oveja por su nombre, la lleva a descansar y la acompaña incluso por las quebradas oscuras. Jesús dijo: «Yo soy el Buen Pastor».",
    p: "¿En qué parte del camino estoy hoy: en el pasto verde o en la quebrada oscura? ¿Siento que Él va conmigo?" },
  { n: 25, t: "A ti, Señor, levanto mi alma", e: ["buscar", "perdon"], alt: "24", v: "Muéstrame, Señor, tus caminos", ref: "Sal 25,4",
    intro: "La oración de alguien que no sabe bien por dónde ir y le pide a Dios que le enseñe. También le pide que no se acuerde de sus errores, sino de su amor.",
    p: "¿En qué decisión necesito que Dios me muestre el camino?" },
  { n: 27, t: "El Señor es mi luz", e: ["miedo"], alt: "26", v: "El Señor es mi luz y mi salvación, ¿a quién temeré?", ref: "Sal 27,1",
    intro: "Un salmo para cuando hay miedo. No niega que hay peligros, pero pone la mirada en Dios, que es luz. Termina con una invitación: «Espera en el Señor, ten ánimo».",
    p: "¿A qué le tengo miedo hoy? ¿Qué cambia si Dios es mi luz?" },
  { n: 30, t: "Cambiaste mi luto en danza", e: ["gracias", "alegre"], alt: "29", v: "Cambiaste mi luto en danza", ref: "Sal 30,12",
    intro: "Alguien que pasó por un momento muy difícil mira hacia atrás y da gracias: el llanto duró una noche, pero en la mañana volvió la alegría.",
    p: "¿De qué momento difícil me sacó Dios? ¿Le he dado gracias?" },
  { n: 32, t: "Feliz el que es perdonado", e: ["perdon"], alt: "31", v: "Feliz el que ha sido perdonado", ref: "Sal 32,1",
    intro: "Callar los errores pesa por dentro. Este salmo cuenta la liberación de quien se atreve a reconocerlos ante Dios y descubre su perdón. Es un buen salmo antes de confesarse.",
    p: "¿Qué llevo guardado que me pesa? ¿Me atrevo a contárselo a Dios?" },
  { n: 34, t: "Gusten y vean qué bueno es el Señor", e: ["gracias", "alegre", "miedo"], alt: "33", v: "Gusten y vean qué bueno es el Señor", ref: "Sal 34,9",
    intro: "Una invitación a probar la bondad de Dios, como quien prueba algo rico. Dice también que el Señor está cerca de los que tienen el corazón roto.",
    p: "¿Dónde he «probado» la bondad de Dios esta semana?" },
  { n: 40, t: "Esperé en el Señor", e: ["gracias", "cansado"], alt: "39", v: "Puso en mi boca un canto nuevo", ref: "Sal 40,4",
    intro: "Después de esperar con paciencia, Dios se inclinó y escuchó. Este salmo cuenta cómo nos saca del barro y nos pone de pie, con un canto nuevo.",
    p: "¿Qué estoy esperando de Dios? ¿Qué «canto nuevo» me ha regalado?" },
  { n: 42, t: "Como busca la cierva", e: ["triste", "buscar"], alt: "41", v: "Mi alma tiene sed de Dios", ref: "Sal 42,3",
    intro: "Una cierva busca agua con sed. Así busca a Dios alguien que lo extraña y está triste. Se pregunta: «¿por qué te acongojas, alma mía?», y se responde: «espera en Dios».",
    p: "¿De qué tengo sed de verdad? ¿Dónde estoy buscando calmarla?" },
  { n: 46, t: "Dios es nuestro refugio", e: ["miedo", "cansado"], alt: "45", v: "Quédense quietos y sepan que yo soy Dios", ref: "Sal 46,11",
    intro: "Aunque tiemble la tierra y se agite el mar, Dios es un refugio seguro. En medio del ruido, nos invita a detenernos y reconocerlo.",
    p: "¿Qué ruido o qué tormenta hay hoy en mi vida? ¿Puedo quedarme quieto un minuto con Él?" },
  { n: 51, t: "Ten piedad de mí", e: ["perdon"], alt: "50", v: "Crea en mí, Dios mío, un corazón puro", ref: "Sal 51,12",
    intro: "La oración de David después de haber fallado gravemente. Es el gran salmo del perdón: no se queda en la culpa, sino que pide un corazón nuevo y la alegría de la salvación.",
    p: "¿Qué parte de mi corazón necesita que Dios la haga nueva?" },
  { n: 62, t: "Solo en Dios descansa mi alma", e: ["cansado", "buscar"], alt: "61", v: "Solo en Dios descansa mi alma", ref: "Sal 62,2",
    intro: "Cuando todo nos agita, este salmo nos lleva a lo esencial: el descanso verdadero está en Dios. Invita a abrirle el corazón, como quien se desahoga con un amigo.",
    p: "¿Dónde busco descanso? ¿Qué le quiero desahogar a Dios hoy?" },
  { n: 63, t: "Mi alma tiene sed de ti", e: ["buscar", "solo"], alt: "62", v: "Tu amor vale más que la vida", ref: "Sal 63,4",
    intro: "Escrito en el desierto, este salmo dice que buscamos a Dios como la tierra seca busca la lluvia. Es una oración para comenzar el día buscándolo.",
    p: "¿Qué lugar le doy a Dios en el comienzo de mi día?" },
  { n: 91, t: "Bajo tus alas", e: ["miedo"], alt: "90", v: "Me cubrirá con sus alas", ref: "Sal 91,4",
    intro: "Una oración de confianza: Dios cuida como un ave que cubre a sus pollitos con las alas. Se suele rezar al terminar el día, antes de dormir.",
    p: "¿Qué me da inseguridad? ¿Puedo imaginarme bajo el cuidado de Dios?" },
  { n: 95, t: "Vengan, cantemos al Señor", e: ["alegre", "comunidad"], alt: "94", v: "Ojalá escuchen hoy su voz", ref: "Sal 95,7",
    intro: "Una invitación a reunirnos para alabar a Dios juntos. Y una advertencia cariñosa: no endurezcamos el corazón cuando Él nos habla.",
    p: "¿Hay algo que Dios me está diciendo y que me cuesta escuchar?" },
  { n: 100, t: "Aclamen al Señor", e: ["alegre", "gracias", "comunidad"], alt: "99", v: "Sirvan al Señor con alegría", ref: "Sal 100,2",
    intro: "Un salmo cortito y lleno de alegría: somos su pueblo, su rebaño, y entramos a su casa dando gracias. Ideal para comenzar un encuentro.",
    p: "¿Qué me alegra de pertenecer a Dios y a esta comunidad?" },
  { n: 103, t: "Bendice, alma mía, al Señor", e: ["gracias", "perdon"], alt: "102", v: "Bendice, alma mía, al Señor, y no olvides sus beneficios", ref: "Sal 103,2",
    intro: "Una lista de motivos para dar gracias: Dios perdona, sana, rescata y llena de bien. Su amor es como el de un padre que se compadece de sus hijos.",
    p: "Si tuviera que escribir mi propia lista de beneficios de Dios, ¿qué pondría?" },
  { n: 104, t: "¡Qué grande eres, Señor!", e: ["creacion"], alt: "103", v: "¡Qué numerosas son tus obras, Señor!", ref: "Sal 104,24",
    intro: "Un recorrido por toda la creación: montañas, ríos, animales, el sol y la luna. Todo vive gracias al Espíritu de Dios. Muy lindo para rezar al aire libre.",
    p: "¿Cómo cuido lo que Dios creó? ¿Qué parte de la creación me habla de Él?" },
  { n: 121, t: "Levanto los ojos a los montes", e: ["miedo", "buscar"], alt: "120", v: "Mi ayuda viene del Señor", ref: "Sal 121,2",
    intro: "Los peregrinos lo rezaban camino a Jerusalén. Dios no se duerme: cuida nuestras salidas y nuestras llegadas. Un buen salmo para antes de un viaje o de algo nuevo.",
    p: "¿Qué camino nuevo estoy empezando? ¿Le pido a Dios que me acompañe?" },
  { n: 130, t: "Desde lo hondo", e: ["perdon", "triste"], alt: "129", v: "En ti, Señor, está el perdón", ref: "Sal 130,4",
    intro: "Una oración desde el fondo del pozo. Quien reza no esconde su pecado ni su pena, pero espera en Dios más que el centinela espera la aurora.",
    p: "¿Qué espero de Dios en este momento? ¿Creo que su perdón es más grande que mis errores?" },
  { n: 131, t: "Como un niño en brazos de su madre", e: ["cansado"], alt: "130", v: "Tengo mi alma en paz y en silencio", ref: "Sal 131,2",
    intro: "Uno de los salmos más cortos y tiernos. No hace falta entenderlo todo: basta descansar en Dios como un niño en brazos de su madre.",
    p: "¿Qué estoy tratando de controlar que podría dejar en las manos de Dios?" },
  { n: 133, t: "Qué bueno es vivir unidos", e: ["comunidad", "alegre"], alt: "132", v: "¡Qué bueno y qué agradable es que los hermanos vivan unidos!", ref: "Sal 133,1",
    intro: "Un salmo pequeño sobre la alegría de la comunidad. La unidad entre hermanos es una bendición que Dios derrama sobre todos.",
    p: "¿Qué puedo hacer esta semana para cuidar la unidad en mi grupo o mi familia?" },
  { n: 136, t: "Porque es eterno su amor", e: ["gracias", "comunidad"], alt: "135", v: "Den gracias al Señor, porque es bueno, porque es eterno su amor", ref: "Sal 136,1",
    intro: "Una letanía: después de cada motivo de gratitud se repite «porque es eterno su amor». Se puede rezar en grupo, con uno que lee y todos respondiendo.",
    p: "Si escribiera mi propia letanía, ¿qué momentos de mi vida pondría antes de «porque es eterno su amor»?" },
  { n: 139, t: "Señor, tú me conoces", e: ["solo", "buscar"], alt: "138", v: "Te doy gracias porque me hiciste maravillosamente", ref: "Sal 139,14",
    intro: "Dios me conoce mejor que nadie: cuando me siento y me levanto, lo que pienso y lo que siento. Me formó desde el vientre de mi madre. No hay lugar donde Él no esté.",
    p: "¿Me miro como Dios me mira? ¿Qué me cuesta aceptar de mí mismo?" },
  { n: 145, t: "Te ensalzaré, Dios mío", e: ["alegre", "gracias"], alt: "144", v: "El Señor es bueno con todos", ref: "Sal 145,9",
    intro: "Una alabanza que va de generación en generación: el Señor es compasivo, levanta a los que caen y está cerca de quienes lo invocan.",
    p: "¿A quién le puedo contar hoy algo bueno que Dios hizo por mí?" },
  { n: 150, t: "Todo lo que respira alabe al Señor", e: ["alegre", "comunidad"], v: "Todo lo que respira alabe al Señor", ref: "Sal 150,6",
    intro: "El último salmo es una gran fiesta: trompetas, guitarras, tambores y danza. Todo el libro termina en alabanza. Cantar y tocar también es orar.",
    p: "¿Cómo puedo alabar a Dios hoy con lo que sé hacer?" },
];
const byN = (n) => SALMOS.find((s) => s.n === +n);
// Biblia católica en línea (Biblia de Navarra, sitio de EWTN): mientras no tengamos el texto autorizado.
const linkOf = (n) => `https://www.ewtn.com/es/biblia/63-salmo/${n}`;

// Los cinco pasos (Lectio Divina sencilla)
const PASOS = [
  ["Prepárate", "Busca un lugar tranquilo. Respira hondo tres veces, haz la señal de la cruz y dile a Jesús: «Aquí estoy, quiero escucharte»."],
  ["Lee despacio", "Lee el salmo completo, sin apuro, mejor en voz baja. Son palabras que Jesús también rezó."],
  ["Quédate con un verso", "Vuelve a leer y quédate con la frase que más te tocó. Repítela varias veces, como quien saborea algo."],
  ["Habla con Dios", "Cuéntale qué te provoca ese verso. No necesitas palabras bonitas: háblale como a un amigo."],
  ["Llévalo contigo", "Escribe el verso o guárdalo en tu teléfono, y repítelo durante el día. Termina con un Padre Nuestro."],
];

// ---------------------------------------------------------------------------
// Textos completos (content/salmos): { fuente, textos: { "23": "…" } }
// ---------------------------------------------------------------------------
let textos = null;
async function loadTextos(force) {
  if (textos && !force) return textos;
  textos = (ctx.cloud.enabled && (await ctx.cloud.getSalmos().catch(() => null))) || { fuente: "", textos: {} };
  textos.textos = textos.textos || {};
  return textos;
}
const textoDe = (n) => (textos && textos.textos && String(textos.textos[n] || "").trim()) || "";
const fuente = () => (textos && textos.fuente) || "";

// ---------------------------------------------------------------------------
// Lista  (#/salmos)
// ---------------------------------------------------------------------------
let estado = "", q = "";
export function viewList() {
  ctx.onAfterRender(() => { paintList(); loadTextos().then(paintList); });
  return `
  <header class="page-head"><span class="eyebrow">Capilla Ágape</span><h1>Oremos con los <em>salmos</em></h1>
    <p>Los salmos son las oraciones que Jesús aprendió de niño y rezó toda su vida. En ellos cabe todo lo que sentimos: la alegría, el miedo, la tristeza, las ganas de dar gracias. Elige cómo llegas hoy y reza con el que te toque.</p></header>
  <section class="sal-como">
    <h2 class="sal-h">¿Cómo llegas hoy?</h2>
    <div class="sal-estados" role="group" aria-label="Cómo llegas hoy">
      <button class="chip ${estado ? "" : "accent"}" data-action="salEst" data-e="">Todos</button>
      ${ESTADOS.map(([k, l]) => `<button class="chip ${estado === k ? "accent" : ""}" data-action="salEst" data-e="${k}">${esc(l)}</button>`).join("")}
    </div>
    <div id="salCuidado"></div>
  </section>
  <input class="input sal-search" id="salSearch" placeholder="Buscar por número o palabra…" value="${esc(q)}" aria-label="Buscar salmo">
  <div id="salList" class="sal-list"></div>
  <details class="card sal-metodo"><summary><b>¿Cómo se reza un salmo?</b> <span class="muted small">Cinco pasos, unos diez minutos</span></summary>
    <ol class="sal-pasos">${PASOS.map(([t, d]) => `<li><b>${esc(t)}</b><span>${esc(d)}</span></li>`).join("")}</ol>
    <p class="xs muted">Es la Lectio Divina, la forma más antigua de orar con la Biblia. La idea de buscar un salmo para cada momento del alma es de San Atanasio (siglo IV), en su «Carta a Marcelino».</p>
  </details>`;
}
function paintList() {
  const box = $("#salList"); if (!box) return;
  const t = q.trim().toLowerCase();
  const list = SALMOS.filter((s) => (!estado || s.e.includes(estado)) && (!t || String(s.n) === t || (s.t + " " + s.intro + " " + s.v).toLowerCase().includes(t)));
  box.innerHTML = list.length ? list.map((s) => `<a class="card link sal-item" href="#/salmos/${s.n}">
      <span class="sal-num"><b>${s.n}</b>${s.alt ? `<small>(${s.alt})</small>` : ""}</span>
      <span class="sal-main"><strong>${esc(s.t)}</strong><span class="sal-v">«${esc(s.v)}»</span>
        <span class="sal-tags">${s.e.map((k) => `<span class="chip">${esc(ELABEL[k])}</span>`).join("")}</span></span>
      ${icon("right")}</a>`).join("")
    : `<div class="card" style="text-align:center;padding:24px"><p class="muted">No encontramos un salmo con esa búsqueda.</p></div>`;
  const c = $("#salCuidado");
  if (c) c.innerHTML = CUIDADO.includes(estado) ? cuidadoHTML() : "";
}
const cuidadoHTML = () => `<p class="sal-cuidado">Dios escucha todo lo que le cuentes. Y si esto que sientes pesa mucho o lleva días, conversa también con alguien de confianza: tu familia, tu dirigente o un sacerdote. No tienes que cargarlo solo.</p>`;

// ---------------------------------------------------------------------------
// Un salmo  (#/salmos/:n)
// ---------------------------------------------------------------------------
let cur = null;
export function viewOne(n) {
  const s = byN(n);
  if (!s) return `<div class="card" style="text-align:center;padding:30px"><h2 class="display">No encontramos ese salmo</h2><a class="btn btn-primary" style="margin-top:12px" href="#/salmos">Ver los salmos</a></div>`;
  cur = s;
  ctx.onAfterRender(() => { paintOne(); loadTextos().then(paintOne); });
  return `<div id="salOne"></div>`;
}
function textoHTML(txt) {
  return txt.split(/\n\s*\n/).map((b) => `<p>${b.split("\n").map((l) => esc(l.trim())).filter(Boolean).join("<br>")}</p>`).join("");
}
function paintOne() {
  const box = $("#salOne"); if (!box || !cur) return;
  const s = cur, txt = textoDe(s.n), admin = ctx.cloud.enabled && st().isAdmin;
  const i = SALMOS.indexOf(s), prev = SALMOS[i - 1], next = SALMOS[i + 1];
  box.innerHTML = `
  <nav class="crumbs no-print"><a href="#/oracion">Capilla</a>${icon("right")}<a href="#/salmos">Salmos</a>${icon("right")}<span>Salmo ${s.n}</span></nav>
  <header class="can-head"><span class="eyebrow">Salmo ${s.n}${s.alt ? ` (${s.alt})` : ""} · ${s.e.map((k) => esc(ELABEL[k])).join(" · ")}</span>
    <h1>${esc(s.t)}</h1></header>
  <div class="sal-ficha">
    <p class="sal-intro">${esc(s.intro)}</p>
    <blockquote class="sal-verso">«${esc(s.v)}»<cite>${esc(s.ref)}</cite></blockquote>
    <div class="row-wrap no-print">
      <button class="btn btn-primary" data-action="salOrar">${icon("eye")} Rezarlo paso a paso</button>
      ${txt ? "" : `<a class="btn btn-gold" href="${linkOf(s.n)}" target="_blank" rel="noopener">${icon("book")} Leer el salmo completo</a>`}
      <button class="btn btn-ghost" data-action="salShare">${icon("send")} Llevarme el verso</button>
      <button class="btn btn-ghost" data-action="print">${icon("print")} Imprimir</button>
    </div>
    ${s.e.includes("triste") || s.e.includes("solo") ? cuidadoHTML() : ""}
    ${txt ? `<article class="card sal-texto"><h2 class="sal-h">Salmo ${s.n}</h2>${textoHTML(txt)}${fuente() ? `<p class="xs muted sal-fuente">${esc(fuente())}</p>` : ""}</article>` : ""}
    <section class="card sal-conversa"><h2 class="sal-h">Para conversar con Dios</h2><p>${esc(s.p)}</p></section>
    <details class="card sal-metodo"><summary><b>Cómo rezarlo</b> <span class="muted small">Cinco pasos</span></summary>
      <ol class="sal-pasos">${PASOS.map(([t, d]) => `<li><b>${esc(t)}</b><span>${esc(d)}</span></li>`).join("")}</ol></details>
    ${admin ? `<details class="card sal-admin no-print"><summary><b>Texto completo del salmo</b> <span class="muted small">Solo administradores</span></summary>
      <p class="xs muted">Pega aquí el texto autorizado del salmo. Deja una línea en blanco entre estrofas. Si lo dejas vacío, se muestra el botón para leerlo en línea.</p>
      <textarea class="textarea" id="salTxt" rows="12">${esc(txt)}</textarea>
      <div class="field"><label>Fuente y derechos (para todos los salmos)</label><input class="input" id="salFuente" maxlength="300" value="${esc(fuente())}" placeholder="Texto bíblico: La Biblia, Libro del Pueblo de Dios. © … Usado con autorización."></div>
      <button class="btn btn-primary btn-sm" data-action="salSaveTxt">Guardar</button></details>` : ""}
  </div>
  <div class="row-wrap no-print" style="margin-top:14px">
    ${prev ? `<a class="btn btn-ghost" href="#/salmos/${prev.n}">${icon("arrowL")} Salmo ${prev.n}</a>` : ""}<span class="spacer"></span>
    ${next ? `<a class="btn btn-ghost" href="#/salmos/${next.n}">Salmo ${next.n} ${icon("arrowR")}</a>` : ""}
  </div>`;
}

// ---------------------------------------------------------------------------
// Rezarlo paso a paso (pantalla completa, tranquila; sirve también para proyectar en grupo)
// ---------------------------------------------------------------------------
let ov = null; // { slides, i }
function orarSlides(s) {
  const txt = textoDe(s.n), out = [{ k: "tit", title: `Salmo ${s.n}`, sub: s.t }];
  out.push({ k: "paso", n: 1, t: PASOS[0][0], d: PASOS[0][1] });
  out.push({ k: "paso", n: 2, t: PASOS[1][0], d: txt ? "Lee despacio, en voz baja. Avanza cuando termines cada parte." : "Toca el botón para abrir el salmo y léelo con calma. Después vuelve aquí.", link: txt ? "" : linkOf(s.n) });
  if (txt) {
    const lines = txt.split("\n").map((l) => l.trim());
    let chunk = [];
    const flush = () => { if (chunk.length) out.push({ k: "txt", lines: chunk }); chunk = []; };
    for (const l of lines) { if (!l) { flush(); continue; } chunk.push(l); if (chunk.length >= 6) flush(); }
    flush();
  }
  out.push({ k: "paso", n: 3, t: PASOS[2][0], d: PASOS[2][1], verso: `«${s.v}» (${s.ref})` });
  out.push({ k: "paso", n: 4, t: PASOS[3][0], d: s.p });
  out.push({ k: "paso", n: 5, t: PASOS[4][0], d: PASOS[4][1], verso: `«${s.v}»` });
  return out;
}
function orar() {
  if (!cur) return;
  ov = { slides: orarSlides(cur), i: 0 };
  let el = document.getElementById("salProj");
  if (!el) { el = document.createElement("div"); el.id = "salProj"; document.body.appendChild(el); }
  el.className = "can-proj sal-proj"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-label", "Rezar el salmo");
  try { el.requestFullscreen && el.requestFullscreen().catch(() => {}); } catch {}
  paintOrar();
}
function paintOrar() {
  const el = document.getElementById("salProj"); if (!el || !ov) return;
  const s = ov.slides[ov.i] || {};
  const body = s.k === "tit" ? `<span class="can-proj-mom">Oremos con los salmos</span><h2 class="can-proj-title">${esc(s.title)}</h2><p class="can-proj-sub">${esc(s.sub)}</p>`
    : s.k === "txt" ? `<p class="can-proj-txt sal-proj-txt">${s.lines.map(esc).join("<br>")}</p>`
    : `<span class="can-proj-mom">Paso ${s.n} de 5 · ${esc(s.t)}</span><p class="sal-proj-d">${esc(s.d)}</p>
       ${s.verso ? `<p class="sal-proj-v">${esc(s.verso)}</p>` : ""}
       ${s.link ? `<a class="btn btn-gold" href="${s.link}" target="_blank" rel="noopener">${icon("book")} Abrir el salmo</a>` : ""}`;
  el.innerHTML = `<div class="can-proj-in">${body}</div>
  <div class="can-proj-ctrl"><button class="icon-btn" data-action="salPrev" aria-label="Anterior">${icon("left")}</button>
    <span>${ov.i + 1} / ${ov.slides.length}</span>
    <button class="icon-btn" data-action="salNext" aria-label="Siguiente">${icon("right")}</button>
    <button class="btn btn-sm btn-glass" data-action="salClose">${ov.i === ov.slides.length - 1 ? "Amén" : "Salir"}</button></div>`;
}
function closeOrar() {
  ov = null; document.getElementById("salProj")?.remove();
  try { if (document.fullscreenElement) document.exitFullscreen(); } catch {}
}

function registerActions() {
  const A = ctx.actions;
  A.salEst = (el) => { estado = el.dataset.e; document.querySelectorAll("[data-action=salEst]").forEach((b) => b.classList.toggle("accent", b.dataset.e === estado)); paintList(); };
  A.salOrar = () => orar();
  A.salPrev = () => { if (ov) { ov.i = Math.max(0, ov.i - 1); paintOrar(); } };
  A.salNext = () => { if (ov) { ov.i = Math.min(ov.slides.length - 1, ov.i + 1); paintOrar(); } };
  A.salClose = () => closeOrar();
  A.salShare = async () => {
    if (!cur) return;
    const text = `«${cur.v}» (${cur.ref})\n\nOremos con los salmos · Pastoral Juvenil Ágape`;
    try {
      if (navigator.share) { await navigator.share({ text }); return; }
      await navigator.clipboard.writeText(text); toast("Verso copiado. Pégalo donde quieras.");
    } catch {}
  };
  A.salSaveTxt = async () => {
    if (!cur) return;
    await loadTextos(true);
    const data = { fuente: String($("#salFuente")?.value || "").trim(), textos: { ...textos.textos, [cur.n]: String($("#salTxt")?.value || "").replace(/\r/g, "").trim() } };
    if (!data.textos[cur.n]) delete data.textos[cur.n];
    try { await ctx.cloud.saveSalmos(data); textos = data; toast("Salmo guardado", "ok"); paintOne(); }
    catch (err) { console.warn(err); toast("No se pudo guardar. Revisa tu conexión.", ""); }
  };
  window.addEventListener("hashchange", () => { if (ov) closeOrar(); });
  document.addEventListener("input", (e) => { if (e.target.id === "salSearch") { q = e.target.value; paintList(); } });
  document.addEventListener("keydown", (e) => {
    if (!document.getElementById("salProj")) return;
    if (["ArrowRight", "PageDown", " "].includes(e.key)) { e.preventDefault(); A.salNext(); }
    else if (["ArrowLeft", "PageUp"].includes(e.key)) { e.preventDefault(); A.salPrev(); }
    else if (e.key === "Escape") closeOrar();
  });
}
