// Gestión → Cursos → Importar: convierte un Word (.docx), un PDF o un texto en un curso de la app,
// con sus módulos, unidades, evaluaciones y diapositivas, sin pasar por nadie más.
// Todo ocurre en el navegador: el archivo no se sube a ningún servicio.
//
// Reglas de lectura (pensadas para documentos escritos «a mano», no solo para la plantilla):
// - «Módulo 1: …» (o Tema, Capítulo, Parte) abre un módulo; «Unidad 1.1: …» (o Sesión, Lección, Clase) abre una unidad.
//   Si el documento no las nombra, se usan sus títulos (Título 1 → módulo, Título 2 → unidad).
// - Dentro de la unidad, rótulos como «Objetivo», «Introducción», «Palabra de Dios», «La Iglesia nos dice»,
//   «Preguntas», «Actividad», «Oración final» y «Para profundizar» van a su lugar; los demás títulos son secciones.
// - «Evaluación» abre las preguntas del módulo: «1. ¿…?», opciones «a) …» y la correcta marcada con * o «(correcta)».

import { esc, icon, toast } from "./util.js";

const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
const plainOf = (h) => String(h || "").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').trim();
const words = (s) => plainOf(s).split(/\s+/).filter(Boolean).length;

// ---------------------------------------------------------------------------
// 1) Del archivo a una lista de bloques: { k: "h1"|"h2"|"h3"|"p"|"li", t: texto con <strong>/<em> }
// ---------------------------------------------------------------------------
export function htmlToBlocks(html) {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const out = [];
  const inline = (el) => {
    let s = "";
    el.childNodes.forEach((n) => {
      if (n.nodeType === 3) s += n.textContent.replace(/</g, "&lt;").replace(/>/g, "&gt;");
      else if (n.nodeType === 1) {
        const tg = n.tagName.toLowerCase(), inner = inline(n), css = (n.getAttribute("style") || "").toLowerCase();
        // Google Docs marca la negrita y la cursiva con estilos (y envuelve todo en un <b style="font-weight:normal">)
        const w = (/font-weight:\s*(\d+|bold|normal)/.exec(css) || [])[1];
        const bold = w ? (w === "bold" || +w >= 600) : (tg === "strong" || tg === "b");
        const ital = /font-style:\s*italic/.test(css) || tg === "em" || tg === "i";
        if (tg === "a") {
          let h = n.getAttribute("href") || "";
          const g = /^https?:\/\/(?:www\.)?google\.[a-z.]+\/url\?q=([^&]+)/.exec(h); if (g) h = decodeURIComponent(g[1]);
          s += /^https?:/.test(h) && !inner.includes(h) ? `${inner} ${h}` : inner;
        }
        else if (bold && inner.trim()) s += `<strong>${inner}</strong>`;
        else if (ital && inner.trim()) s += `<em>${inner}</em>`;
        else if (tg === "br") s += " ";
        else s += inner;
      }
    });
    return s.replace(/<\/strong>(\s*)<strong>/g, "$1").replace(/<strong>(\s*)<\/strong>/g, "$1").replace(/\s+/g, " ");
  };
  const walk = (el) => {
    el.childNodes.forEach((n) => {
      if (n.nodeType !== 1) return;
      const tg = n.tagName.toLowerCase();
      if (/^h[1-6]$/.test(tg)) { const t = inline(n).trim(); if (t) out.push({ k: tg === "h1" ? "h1" : tg === "h2" ? "h2" : "h3", t: plainOf(t) }); }
      else if (tg === "p") { const t = inline(n).trim(); if (t) out.push({ k: "p", t }); }
      else if (tg === "ul" || tg === "ol") n.querySelectorAll(":scope > li").forEach((li, i) => {
        const sub = li.querySelector("ul,ol"); if (sub) sub.remove();
        const t = inline(li).trim(); if (t) out.push({ k: "li", t, n: tg === "ol" ? i + 1 : 0 });
        if (sub) walk({ childNodes: [sub] });
      });
      else if (tg === "table") n.querySelectorAll("tr").forEach((tr) => { const t = [...tr.children].map((c) => inline(c).trim()).filter(Boolean).join(" · "); if (t) out.push({ k: "p", t }); });
      else walk(n);
    });
  };
  walk(doc.body.firstChild);
  return out;
}

function textToBlocks(txt) {
  const out = [];
  let para = [];
  const md = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/(^|[\s(])_(.+?)_(?=[\s.,;:)]|$)/g, "$1<em>$2</em>");
  const flush = () => { if (para.length) { out.push({ k: "p", t: md(para.join(" ")) }); para = []; } };
  for (const raw of String(txt).replace(/\r/g, "").split("\n")) {
    const l = raw.trim();
    if (!l) { flush(); continue; }
    let m;
    if ((m = /^(#{1,6})\s+(.*)$/.exec(l))) { flush(); out.push({ k: m[1].length === 1 ? "h1" : m[1].length === 2 ? "h2" : "h3", t: m[2].replace(/\*\*/g, "") }); continue; }
    if ((m = /^[-•*–●▪◦‣■]\s*(.*)$/.exec(l)) && !/^[-*]{2,}/.test(l)) { flush(); out.push({ k: "li", t: md(m[1]), n: 0 }); continue; }
    // «1. …» o «a) …»: los dejamos como párrafos sueltos; los reconoce la evaluación o la lista de preguntas
    if (/^(\d{1,2}[.)]|[a-hA-H][).])\s+/.test(l)) { flush(); out.push({ k: "p", t: md(l) }); continue; }
    // Rótulo en su propia línea («Objetivo:», «MÓDULO 2») o línea corta sin punto final → la tratamos como línea suelta
    if (/:$/.test(l) || /^(m[oó]dulo|tema|cap[ií]tulo|parte|unidad|sesi[oó]n|lecci[oó]n|clase|evaluaci[oó]n|cuestionario)\b/i.test(l)) { flush(); out.push({ k: "p", t: md(l) }); continue; }
    // Texto sin líneas en blanco: cada rótulo («Objetivo: …»), cada título corto y cada línea que cierra una frase va aparte.
    const titleLike = !/https?:\/\//.test(l) && l.split(/\s+/).length <= 8 && !/[.,;:?!»”")]$/.test(l) && /^[A-ZÁÉÍÓÚÑ¿¡«"]/.test(l) && l.length < 70;
    const labelLike = /^[^:]{2,40}:/.test(l) && labelOf(l);
    if (para.length && (labelLike || titleLike || /[.!?»”:]$/.test(para[para.length - 1]))) flush();
    para.push(l);
    if (titleLike) flush();
  }
  flush();
  return out;
}

async function pdfToBlocks(buf) {
  const pdfjs = await import("./vendor/pdf.min.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("./vendor/pdf.worker.min.mjs", import.meta.url).href;
  const pdf = await pdfjs.getDocument({ data: buf }).promise;
  const lines = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p), tc = await page.getTextContent();
    let cur = null;
    for (const it of tc.items) {
      if (!("str" in it)) continue;
      const y = Math.round(it.transform[5]), h = Math.abs(it.transform[3]) || it.height || 10;
      const bold = /bold|black|heavy|semibold/i.test((tc.styles[it.fontName] || {}).fontFamily || it.fontName || "");
      if (!cur || Math.abs(cur.y - y) > h * 0.5) { if (cur) lines.push(cur); cur = { y, h, t: "", bold, page: p }; }
      cur.t += it.str; cur.h = Math.max(cur.h, h); cur.bold = cur.bold && bold;
      if (it.hasEOL) { lines.push(cur); cur = null; }
    }
    if (cur) lines.push(cur);
  }
  const body = lines.filter((l) => l.t.trim());
  const sizes = body.map((l) => l.h).sort((a, b) => a - b), med = sizes[Math.floor(sizes.length / 2)] || 10;
  // Las líneas se vuelven a armar en párrafos; las más grandes que el texto normal son títulos.
  let txt = "", prevY = null, prevT = "";
  for (const l of body) {
    const t = l.t.replace(/\s+/g, " ").trim();
    if (/^\d{1,3}$/.test(t)) continue; // números de página
    const big = l.h > med * 1.18;
    const gap = prevY != null && Math.abs(prevY - l.y) > l.h * 1.8;
    const starts = /^([-•*–●▪◦‣■]\s?|\d{1,2}[.)]\s|[a-hA-H][).]\s|(explicaci[oó]n|respuesta|retroalimentaci[oó]n)\b)/i.test(t) || RE_MOD.test(t) || RE_UNIT.test(t) || RE_QUIZ.test(t) || (/^[^:]{2,40}:/.test(t) && labelOf(t));
    const prevEnds = /:$/.test(prevT) && prevT.length < 60;
    if (big) txt += `\n\n${l.h > med * 1.5 ? "#" : "##"} ${t}\n\n`;
    else if (l.bold && t.length < 70 && !/[.,;]$/.test(t)) txt += `\n\n### ${t}\n\n`;
    else if (/https?:\/\/\S+$/.test(prevT) && !/\s/.test(t) && /[\/\-_.]$|[a-z0-9]$/i.test(prevT)) txt += t; // enlace cortado en dos líneas
    else txt += (gap || starts || prevEnds || !prevT ? "\n\n" : " ") + t;
    prevY = l.y; prevT = big ? "" : t;
  }
  return textToBlocks(txt);
}

export async function fileToBlocks(file) {
  const name = (file.name || "").toLowerCase();
  if (name.endsWith(".docx")) {
    if (!window.mammoth) await new Promise((ok, no) => { const s = document.createElement("script"); s.src = "js/vendor/mammoth.browser.min.js"; s.onload = ok; s.onerror = no; document.head.appendChild(s); });
    const r = await window.mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() }, {
      styleMap: ["p[style-name='Title'] => h1:fresh", "p[style-name='Título'] => h1:fresh", "p[style-name='Subtitle'] => p:fresh"],
    });
    return htmlToBlocks(r.value);
  }
  if (name.endsWith(".pdf")) return pdfToBlocks(await file.arrayBuffer());
  if (name.endsWith(".doc")) throw new Error("doc");
  return textToBlocks(await file.text());
}

// ---------------------------------------------------------------------------
// 2) De los bloques al curso
// ---------------------------------------------------------------------------
const RE_MOD = /^(m[oó]dulo|tema|cap[ií]tulo|parte|bloque|eje)\s*(\d+|[ivxl]+)?\b\s*[:.\-–—]?\s*(.*)$/i;
const RE_UNIT = /^(unidad|sesi[oó]n|lecci[oó]n|clase|encuentro|semana|ficha)\s*(\d+(?:[.,]\d+)?)?\b\s*[:.\-–—]?\s*(.*)$/i;
const RE_QUIZ = /^(evaluaci[oó]n|cuestionario|autoevaluaci[oó]n|prueba|quiz|test)\b\s*(del\s+m[oó]dulo\s*\d*|final)?\s*[:.\-–—]?\s*(.*)$/i;
const LABELS = [
  ["objective", /^(objetivos?|objetivo de aprendizaje|meta|prop[oó]sito)\b/],
  ["time", /^(duraci[oó]n|tiempo( estimado)?)\b/],
  ["intro", /^(introducci[oó]n|presentaci[oó]n|para empezar|motivaci[oó]n|inicio)\b/],
  ["bible", /^(palabra de dios|lectura( b[ií]blica)?|texto b[ií]blico|cita b[ií]blica|evangelio|biblia|iluminaci[oó]n b[ií]blica|escuchamos la palabra)\b/],
  ["church", /^(la iglesia( nos dice| ensena| nos ensena)?|magisterio|catecismo|documentos? de la iglesia|voz de la iglesia)\b/],
  ["questions", /^(preguntas( para (reflexionar|la reflexion|compartir|el dialogo|pensar|conversar|dialogar))?|para (reflexionar|tu reflexion|pensar|compartir|conversar|dialogar)|conversemos|compartimos|reflexion( personal)?|mi cuaderno|cuaderno)\b/],
  ["activity", /^(actividad|compromiso|tarea|llevalo a tu grupo|mision|dinamica|para la vida|desafio)\b/],
  ["prayer", /^(oracion( final| de cierre| de accion de gracias)?|accion de gracias|para rezar|oremos|rezamos)\b/],
  ["resources", /^(recursos|para profundizar|bibliografia|enlaces|materiales?( complementarios?)?|lecturas recomendadas)\b/],
];
const labelOf = (plain) => { const n = norm(plain).replace(/^[\d.]+\s*/, ""); for (const [k, re] of LABELS) { const m = re.exec(n); if (m && n.length - m[0].length < 160) return k; } return null; };
const isShortTitle = (b) => !/https?:\/\//.test(b.t) && ((b.k === "p" && /^<strong>[^<]{2,90}<\/strong>:?$/.test(b.t.trim())) || (b.k === "p" && words(b.t) <= 9 && !/[.,;?!»”")]$/.test(plainOf(b.t)) && /^[A-ZÁÉÍÓÚÑ¿¡«"]/.test(plainOf(b.t)) && plainOf(b.t).length < 70 && !/^\d/.test(plainOf(b.t))));

const BIBLE_REF = /^((?:[1-3]\s?)?[A-ZÁÉÍÓÚ][a-záéíóúñ]{1,14}\.?\s+\d{1,3}(?:\s*[,:]\s*\d{1,3}[a-z]?(?:\s*[-–]\s*\d{1,3}[a-z]?)?(?:\s*[.;]\s*\d{1,3}(?:\s*[-–]\s*\d{1,3})?)*)?)/;

export function buildCourse(blocks, opts = {}) {
  const warn = [];
  const course = { title: "", description: "", phases: [] };
  let mod = null, unit = null, field = null, sec = null, quiz = null, q = null;
  let introDone = false;
  const pre = [];

  // ¿Cómo marca el documento los módulos y las unidades?
  const hasModWord = blocks.some((b) => RE_MOD.test(plainOf(b.t)) && (b.k !== "p" || words(b.t) <= 14));
  const hasUnitWord = blocks.some((b) => RE_UNIT.test(plainOf(b.t)) && (b.k !== "p" || words(b.t) <= 14));
  const h1s = blocks.filter((b) => b.k === "h1").length, h2s = blocks.filter((b) => b.k === "h2").length;
  const firstIsTitle = blocks[0] && (blocks[0].k === "h1" || isShortTitle(blocks[0])) && !RE_MOD.test(plainOf(blocks[0].t)) && !RE_UNIT.test(plainOf(blocks[0].t));
  const modByH1 = !hasModWord && h1s - (firstIsTitle && blocks[0].k === "h1" ? 1 : 0) >= 2;
  const unitByH = !hasUnitWord ? (modByH1 || hasModWord ? "h2" : h1s - (firstIsTitle ? 1 : 0) >= 2 ? "h1" : h2s ? "h2" : null) : null;

  const newMod = (title) => {
    closeUnit();
    mod = { phaseNum: course.phases.length + 1, title: title || `Módulo ${course.phases.length + 1}`, desc: "", intro: "", sessions: [] };
    course.phases.push(mod); quiz = null; q = null; field = null;
  };
  const ensureMod = () => { if (!mod) newMod(course.title || "Módulo 1"); };
  const newUnit = (title) => {
    ensureMod(); closeUnit();
    unit = { id: `${mod.phaseNum}.${mod.sessions.length + 1}`, title: title || `Unidad ${mod.phaseNum}.${mod.sessions.length + 1}`, time: "40 min", objective: "", intro: "", sections: [], bible: { ref: "", comment: "" }, church: [], questions: [], activity: "", prayer: "", resources: [] };
    mod.sessions.push(unit); field = "intro"; sec = null; quiz = null; q = null;
  };
  function closeUnit() {
    if (!unit) return;
    unit.sections = unit.sections.filter((s) => s.body.trim());
    unit = null; sec = null; field = null;
  }
  const add = (cur, t) => (cur ? cur + "\n\n" + t : t);
  const addLi = (cur, t) => (cur ? cur + (/^- /m.test(cur.split("\n\n").pop()) ? "\n" : "\n\n") + "- " + t : "- " + t);

  const pushToField = (b) => {
    const t = b.t.trim(); if (!t) return;
    switch (field) {
      case "objective": unit.objective = add(unit.objective, plainOf(t) ? t : ""); break;
      case "time": { const m = /(\d{1,3})\s*(min|minutos|h|hora)/i.exec(plainOf(t)); if (m) unit.time = /^h/i.test(m[2]) ? `${m[1]} h` : `${m[1]} min`; break; }
      case "intro": unit.intro = add(unit.intro, t); break;
      case "bible": {
        const p = plainOf(t);
        if (!unit.bible.ref) {
          const m = BIBLE_REF.exec(p);
          if (m && m[1].length < 40) {
            let rest = p.slice(m[1].length).replace(/^\s*[·.\-–—:|]\s*/, "").trim();
            const titleCut = /^([^.]{3,70})\s*[.·\-–—:]\s+(.{20,})$/.exec(rest);
            unit.bible.ref = m[1].trim() + (titleCut && words(titleCut[1]) <= 9 ? ` · ${titleCut[1]}` : "");
            rest = titleCut && words(titleCut[1]) <= 9 ? titleCut[2] : rest;
            unit.bible.comment = add(unit.bible.comment, rest); break;
          }
        }
        unit.bible.comment = add(unit.bible.comment, t); break;
      }
      case "church": {
        const p = plainOf(t), url = (p.match(/https?:\/\/\S+/) || [])[0] || "";
        const clean = p.replace(/https?:\/\/\S+/, "").trim();
        const m = /^([^:—–]{3,60})\s*[:—–]\s*(.+)$/.exec(clean);
        if (m) unit.church.push({ source: m[1].trim(), text: m[2].trim(), url });
        else if (unit.church.length && !url) unit.church[unit.church.length - 1].text += " " + clean;
        else unit.church.push({ source: "La Iglesia nos dice", text: clean, url });
        break;
      }
      case "questions": {
        const p = plainOf(t).replace(/^(\d{1,2}[.)]|[-•])\s*/, "").trim();
        if (b.k === "li" || /\?\s*$/.test(p) || /^\d{1,2}[.)]\s/.test(plainOf(t))) unit.questions.push(p);
        else if (unit.questions.length) unit.questions[unit.questions.length - 1] += " " + p; else unit.questions.push(p);
        break;
      }
      case "activity": unit.activity = b.k === "li" ? addLi(unit.activity, t) : add(unit.activity, t); break;
      case "prayer": unit.prayer = add(unit.prayer, plainOf(t)); break;
      case "resources": {
        const p = plainOf(t), url = (p.match(/https?:\/\/\S+/) || [])[0];
        if (url) { const title = p.replace(url, "").replace(/[\s:—–-]+$/, "").trim() || url; unit.resources.push({ title, url, note: "" }); }
        else if (unit.resources.length) unit.resources[unit.resources.length - 1].note = add(unit.resources[unit.resources.length - 1].note, p);
        else if (p) warn.push(`Unidad ${unit.id}: el recurso «${p.slice(0, 50)}» no tiene enlace (https://…) y se omitió.`);
        break;
      }
      default: {
        if (!sec) { sec = { title: unit.sections.length ? "Para seguir" : "Contenido", body: "" }; unit.sections.push(sec); }
        sec.body = b.k === "li" ? addLi(sec.body, t) : add(sec.body, t);
      }
    }
  };

  // Evaluación: «1. ¿…?», «a) …», correcta con * o (correcta) o en negrita, o «Respuesta: b»
  const quizLine = (b) => {
    const raw = b.t.trim(), p = plainOf(raw);
    let m;
    if ((m = /^(?:pregunta\s*)?(\d{1,2})\s*[.):-]\s*(.+)$/i.exec(p)) && !/^[a-h][).]/i.test(p)) {
      q = { q: `${m[1]}. ${m[2].trim()}`, options: [], correct: -1, feedback: "" }; quiz.questions.push(q); return;
    }
    if (!q) { if (/\?\s*$/.test(p)) { q = { q: `${quiz.questions.length + 1}. ${p}`, options: [], correct: -1, feedback: "" }; quiz.questions.push(q); } return; }
    if ((m = /^(?:respuesta( correcta)?|correcta|clave)\s*[:.\-]\s*\(?([a-h])\)?/i.exec(p))) { q.correct = m[2].toLowerCase().charCodeAt(0) - 97; return; }
    if ((m = /^(?:explicaci[oó]n|retroalimentaci[oó]n|comentario|porque|feedback)\s*[:.\-]\s*(.+)$/i.exec(p))) { q.feedback = m[1].trim(); return; }
    if ((m = /^([a-h])\s*[).:-]\s*(.+)$/i.exec(p)) || (b.k === "li" && (m = [null, null, p]))) {
      let opt = m[2].trim();
      const mark = /(\s*\*+\s*$|\s*\((correcta|correct[oa]|verdadera|x)\)\s*$|\s*[✓✔]\s*$)/i;
      const boldOnly = /^<strong>[\s\S]+<\/strong>$/.test(raw.replace(/^[a-h]\s*[).:-]\s*/i, "").trim()) || /^(?:<strong>)?[a-h]\s*[).:-]\s*<strong>[\s\S]+<\/strong>$/i.test(raw);
      if (mark.test(opt) || boldOnly) { q.correct = q.options.length; opt = opt.replace(mark, "").trim(); }
      q.options.push(opt); return;
    }
    if (q.options.length) q.feedback = add(q.feedback, p); else q.q += " " + p;
  };

  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i], p = plainOf(b.t);
    if (!p) continue;
    const heading = b.k === "h1" || b.k === "h2" || b.k === "h3" || isShortTitle(b);
    // Título del curso
    if (!introDone && i === 0 && firstIsTitle) { course.title = p.replace(/:$/, ""); continue; }
    let m;
    // Módulo
    if ((heading || words(b.t) <= 14) && (m = RE_MOD.exec(p)) && (hasModWord)) { introDone = true; newMod(m[3] ? m[3].replace(/^[:.\-–—\s]+/, "") : ""); continue; }
    if (modByH1 && b.k === "h1") { introDone = true; newMod(p); continue; }
    // Unidad
    if ((heading || words(b.t) <= 14) && (m = RE_UNIT.exec(p)) && hasUnitWord) { introDone = true; newUnit(m[3] ? m[3].replace(/^[:.\-–—\s]+/, "") : ""); continue; }
    if (unitByH && b.k === unitByH) { introDone = true; newUnit(p); continue; }
    // Evaluación del módulo
    if ((heading || words(b.t) <= 8) && RE_QUIZ.test(p) && !/\?/.test(p)) {
      ensureMod(); closeUnit();
      mod.quiz = mod.quiz || { badge: `Evaluación Módulo ${mod.phaseNum}`, title: mod.title, questions: [] };
      quiz = mod.quiz; q = null; continue;
    }
    if (quiz) { quizLine(b); continue; }
    // Antes del primer módulo/unidad: descripción del curso (o del módulo)
    if (!unit) {
      if (!introDone && !mod) { if (!/^c[oó]mo usar esta plantilla/i.test(p)) pre.push(p); continue; }
      if (mod) { mod.intro = add(mod.intro, p); continue; }
    }
    // Rótulos dentro de la unidad
    const lab = (heading || /^<strong>[^<]{2,60}<\/strong>/.test(b.t) || /^[^:]{2,40}:/.test(p)) ? labelOf(p) : null;
    if (lab && lab === field && b.k === "p" && !/^<strong>/.test(b.t) && /^[^:]{2,60}:\s*\S/.test(p)) { pushToField(b); continue; }
    if (lab) {
      field = lab; sec = null;
      const rest = /:/.test(p.slice(0, 50)) ? b.t.replace(/^[\s\S]*?:\s*(<\/strong>)?\s*/, "").replace(/^<\/strong>/, "").trim() : "";
      if (rest && plainOf(rest)) pushToField({ k: "p", t: rest });
      continue;
    }
    if (heading && b.k !== "p" || (isShortTitle(b) && field !== "questions")) {
      // Un título que no es rótulo conocido: nueva sección de contenido
      field = "section"; sec = { title: p.replace(/:$/, ""), body: "" }; unit.sections.push(sec); continue;
    }
    if (field === "intro" && unit.intro && words(unit.intro) > 70) { field = "section"; sec = null; }
    pushToField(b);
  }
  closeUnit();

  // Descripción del curso
  course.description = pre.join(" ").slice(0, 600);
  if (!course.title) course.title = (course.phases[0] && course.phases[0].title) || "Curso nuevo";

  // Revisión y valores por defecto
  if (!course.phases.length || !course.phases.some((ph) => ph.sessions.length)) warn.push("No encontré unidades. Revisa que cada unidad empiece con «Unidad 1.1: título» o con un título de Word (Título 2).");
  course.phases = course.phases.filter((ph) => ph.sessions.length || (ph.quiz && ph.quiz.questions.length));
  course.phases.forEach((ph, i) => {
    ph.phaseNum = i + 1;
    ph.sessions.forEach((s, k) => { s.id = `${i + 1}.${k + 1}`; });
    ph.desc = `${ph.sessions.length} ${ph.sessions.length === 1 ? "unidad" : "unidades"}`;
    if (!ph.sessions.length) warn.push(`El módulo ${i + 1} («${ph.title}») no tiene unidades.`);
    for (const s of ph.sessions) {
      if (!s.objective) {
        const first = plainOf(s.intro || (s.sections[0] && s.sections[0].body) || "").split(/(?<=[.!?])\s/)[0] || "";
        if (first) { s.objective = first; warn.push(`Unidad ${s.id}: no tenía objetivo; usé la primera frase. Revísalo.`); }
        else warn.push(`Unidad ${s.id}: falta el objetivo.`);
      }
      if (!s.intro && s.sections.length) { const b0 = s.sections[0]; const parts = b0.body.split("\n\n"); if (!/^- /.test(parts[0])) { s.intro = parts.shift(); b0.body = parts.join("\n\n"); if (!b0.body.trim()) s.sections.shift(); } }
      // Una sección hecha solo de preguntas pasa a «Para tu reflexión»
      if (!s.questions.length) {
        const qi = s.sections.findIndex((x) => { const ls = x.body.split(/\n+/).map((l) => plainOf(l).replace(/^- /, "").trim()).filter(Boolean); return ls.length && ls.every((l) => /\?$/.test(l)); });
        if (qi >= 0) { s.questions = s.sections[qi].body.split(/\n+/).map((l) => plainOf(l).replace(/^- /, "").trim()).filter(Boolean); s.sections.splice(qi, 1); }
      }
      if (!s.sections.length) warn.push(`Unidad ${s.id}: no tiene contenido aparte de la introducción.`);
      if (!s.bible.ref && !s.bible.comment) { delete s.bible; warn.push(`Unidad ${s.id}: no tiene Palabra de Dios.`); }
      else if (!s.bible.ref) warn.push(`Unidad ${s.id}: la Palabra de Dios no trae una cita reconocible (ej.: «Mc 10,35-45»).`);
      if (!s.prayer && opts.autoPrayer !== false) { s.prayer = `Gracias, Señor, por lo que me has enseñado en «${plainOf(s.title)}». Te ofrezco lo que descubrí y mi servicio en tu Iglesia: que sepa vivirlo con mi grupo y responder con alegría a tu llamado. Amén.`; s.autoPrayer = true; }
    }
    if (ph.quiz) {
      ph.quiz.questions = ph.quiz.questions.filter((x) => x.options.length >= 2);
      ph.quiz.questions.forEach((x, n) => {
        if (x.correct < 0 || x.correct >= x.options.length) { x.correct = 0; warn.push(`Evaluación del módulo ${i + 1}, pregunta ${n + 1}: no encontré la respuesta correcta; quedó marcada la primera. Corrígela en el editor.`); }
        if (!x.feedback) x.feedback = "";
      });
      if (!ph.quiz.questions.length) delete ph.quiz;
    }
    if (!ph.quiz) warn.push(`El módulo ${i + 1} no tiene evaluación: se completa al leer todas sus unidades.`);
  });
  return { course, warn };
}

// ---------------------------------------------------------------------------
// 3) Pantalla: Gestión → Cursos → Importar
// ---------------------------------------------------------------------------
const st = { result: null, file: "", busy: false, para: {}, autoPrayer: true, blocks: null, update: "", html: "" };
const chip = (ok, t) => `<span class="imp-chip ${ok ? "ok" : "no"}">${ok ? "✓" : "–"} ${esc(t)}</span>`;

// opts.update = { id, title }: se reemplaza el contenido de un curso ya publicado (se conserva su id,
// así quienes lo están haciendo no pierden su avance si las unidades mantienen su número).
export function view(PARA, opts = {}) {
  const up = opts.update || null;
  if ((up ? up.id : "") !== st.update) { st.update = up ? up.id : ""; st.result = null; st.file = ""; st.blocks = null; st.para = up && up.para ? { ...up.para } : {}; }
  const r = st.result;
  return `<nav class="crumbs"><a href="#/admin/formacion">Cursos de la comunidad</a>${icon("right")}<span>${up ? "Actualizar" : "Importar"}</span></nav>
  <header class="page-head"><span class="eyebrow">Gestión · Formación</span>${up ? `<h1>Actualizar <em>${esc(up.title)}</em></h1>
    <p>Sube la versión corregida del documento. El curso conserva su lugar y su estado (oculto o publicado). Si mantienes la numeración de las unidades, nadie pierde su avance.</p>`
    : `<h1>Importar un <em>curso</em></h1>
    <p>Sube el documento del curso (Word, PDF o texto) y la app lo convierte en módulos, unidades y diapositivas. El curso queda <b>oculto</b> hasta que lo revises y lo publiques.</p>`}</header>
  <section class="card stack" style="--gap:12px">
    <h2 style="font-size:1.1rem">1. El documento</h2>
    <label class="imp-drop" id="impDrop">
      <input type="file" id="impFile" accept=".docx,.pdf,.txt,.md,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" hidden>
      ${icon("ul")} <b>${st.busy ? "Leyendo…" : st.file ? esc(st.file) : "Elige o arrastra un archivo"}</b>
      <small>Word (.docx), PDF o texto (.txt). Desde Google Docs, pégalo abajo. Mejor en Word o Google Docs: los títulos se reconocen solos.</small>
    </label>
    <details ${st.html ? "open" : ""}><summary class="small"><b>¿Está en Google Docs?</b> Cópialo y pégalo aquí</summary>
      <p class="xs muted" style="margin:6px 0">En Google Docs: selecciona todo (Ctrl+A o «Seleccionar todo»), copia y pega en este recuadro. Se conservan los títulos, las negritas y las listas. También puedes descargarlo con <i>Archivo → Descargar → Microsoft Word (.docx)</i> y subir ese archivo.</p>
      <textarea class="input" id="impText" rows="8" placeholder="Pega aquí el documento (de Google Docs, Word o un texto)…"></textarea>
      ${st.html ? `<p class="xs" style="margin-top:4px">Pegado con formato: se reconocerán los títulos del documento.</p>` : ""}
      <button class="btn btn-soft btn-sm" style="margin-top:8px" data-action="impPaste">Leer lo pegado</button></details>
    <details class="small"><summary>¿Cómo escribir el documento?</summary>
      <ul class="prose-list" style="margin-top:8px">
        <li>Arriba, el <b>nombre del curso</b> y, si quieres, un párrafo que lo presente.</li>
        <li><b>Módulo 1: título</b> abre un módulo, y <b>Unidad 1.1: título</b> abre una unidad. También sirven los títulos de Word (Título 1 y Título 2).</li>
        <li>Dentro de cada unidad, estos rótulos van a su lugar: <b>Objetivo</b>, <b>Introducción</b>, <b>Palabra de Dios</b> (con la cita al comienzo, ej. «Mc 10,35-45»), <b>La Iglesia nos dice</b> («Catecismo 1324: texto…»), <b>Preguntas</b>, <b>Actividad</b>, <b>Oración final</b> y <b>Para profundizar</b> (con enlaces).</li>
        <li>Cualquier otro subtítulo se vuelve una sección de contenido, con sus diapositivas.</li>
        <li>Al final de cada módulo, <b>Evaluación</b>: preguntas numeradas («1. ¿…?»), opciones «a) …» y la correcta marcada con <b>*</b> al final, o en negrita.</li>
        <li>La invocación al Espíritu Santo se agrega sola. Si una unidad no trae oración final, la app puede poner una de acción de gracias.</li>
      </ul>
      <a class="btn btn-ghost btn-sm" href="docs/plantilla-curso.docx" download>${icon("dl")} Descargar la plantilla en Word</a></details>
  </section>
  ${r ? previewHTML(r, PARA) : ""}`;
}

function previewHTML(r, PARA) {
  const c = r.course, nU = c.phases.reduce((a, ph) => a + ph.sessions.length, 0), nQ = c.phases.reduce((a, ph) => a + (ph.quiz ? ph.quiz.questions.length : 0), 0);
  return `<section class="card stack" style="--gap:12px;margin-top:14px">
    <h2 style="font-size:1.1rem">2. Revisa lo que encontré</h2>
    <div class="field"><label>Nombre del curso</label><input class="input" id="impTitle" value="${esc(c.title)}" maxlength="90"></div>
    <div class="field"><label>Descripción</label><textarea class="input" id="impDesc" rows="3" maxlength="600">${esc(c.description || `${c.phases.length} módulos y ${nU} unidades.`)}</textarea></div>
    <div class="field"><label>Dirigido a <span class="muted">(sin marcar = para todos)</span></label>
      <div class="row-wrap" style="gap:12px">${PARA.map(([k, l]) => `<label class="small"><input type="checkbox" data-imp-para="${k}" ${st.para[k] ? "checked" : ""}> ${esc(l)}</label>`).join("")}</div></div>
    <label class="small"><input type="checkbox" id="impAutoPrayer" ${st.autoPrayer ? "checked" : ""}> Agregar una oración final de acción de gracias en las unidades que no la tengan</label>
    <p class="small"><b>${c.phases.length}</b> ${c.phases.length === 1 ? "módulo" : "módulos"} · <b>${nU}</b> ${nU === 1 ? "unidad" : "unidades"} · <b>${nQ}</b> preguntas de evaluación</p>
    ${r.warn.length ? `<details class="note" ${r.warn.length < 6 ? "open" : ""}><summary><b>${r.warn.length} ${r.warn.length === 1 ? "cosa para revisar" : "cosas para revisar"}</b> (puedes corregirlas después en el editor)</summary><ul class="prose-list small">${r.warn.map((w) => `<li>${esc(w)}</li>`).join("")}</ul></details>` : `<p class="note small">Todo en orden.</p>`}
    <div class="stack" style="--gap:10px">${c.phases.map((ph) => `
      <details class="imp-mod"><summary><b>Módulo ${ph.phaseNum}</b> · ${esc(ph.title)} <span class="muted small">${ph.sessions.length} u.${ph.quiz ? ` · evaluación de ${ph.quiz.questions.length}` : " · sin evaluación"}</span></summary>
        <ul class="imp-units">${ph.sessions.map((s) => `<li><b>${esc(s.id)}</b> ${esc(s.title)}
          <div class="imp-chips">${chip(!!s.objective, "objetivo")}${chip(!!s.intro, "introducción")}${chip(s.sections.length > 0, `${s.sections.length} ${s.sections.length === 1 ? "sección" : "secciones"}`)}${chip(!!(s.bible && s.bible.ref), "Palabra")}${chip(s.church.length > 0, "Iglesia")}${chip(s.questions.length > 0, `${s.questions.length} preguntas`)}${chip(!!s.activity, "actividad")}${chip(!!s.prayer, s.autoPrayer ? "oración (automática)" : "oración")}</div></li>`).join("")}</ul></details>`).join("")}</div>
    <div class="row-wrap" style="gap:8px"><button class="btn btn-primary" data-action="impCreate" ${nU ? "" : "disabled"}>${st.update ? `${icon("check")} Actualizar el curso` : `${icon("plus")} Crear el curso (oculto)`}</button>
      <button class="btn btn-ghost btn-sm" data-action="impReset">Empezar de nuevo</button></div>
    <p class="xs muted">${st.update ? "El curso se reemplaza por esta versión." : "Se crea oculto: solo lo ven los administradores y formadores. Míralo con «Vista previa» y, cuando esté listo, publícalo con un toque."} Para corregir algo, arréglalo en el documento y vuelve a subirlo con «Actualizar».</p>
  </section>`;
}

export function registerActions(A, { render, createCourse, PARA }) {
  const run = async (getBlocks, label) => {
    st.busy = true; st.file = label; render();
    try {
      st.blocks = await getBlocks();
      st.result = buildCourse(st.blocks, { autoPrayer: st.autoPrayer });
      if (!st.blocks.length) toast("El archivo no tiene texto que se pueda leer.", "");
    } catch (e) {
      console.warn(e);
      toast(e && e.message === "doc" ? "Los archivos .doc antiguos no se pueden leer: guárdalo como .docx desde Word." : "No pude leer el archivo. Prueba guardarlo como .docx o pegar el texto.", "");
      st.result = null;
    }
    st.busy = false; render();
  };
  document.addEventListener("change", (e) => {
    if (e.target.id === "impFile" && e.target.files[0]) { const f = e.target.files[0]; run(() => fileToBlocks(f), f.name); }
    if (e.target.id === "impAutoPrayer") { st.autoPrayer = e.target.checked; if (st.blocks) { st.result = buildCourse(st.blocks, { autoPrayer: st.autoPrayer }); render(); } }
    if (e.target.dataset && e.target.dataset.impPara) st.para[e.target.dataset.impPara] = e.target.checked;
  });
  document.addEventListener("dragover", (e) => { if (e.target.closest && e.target.closest("#impDrop")) e.preventDefault(); });
  document.addEventListener("drop", (e) => {
    if (!(e.target.closest && e.target.closest("#impDrop"))) return;
    e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) run(() => fileToBlocks(f), f.name);
  });
  // Al pegar desde Google Docs (o Word, o una página) llega también el HTML: así se conservan los títulos.
  document.addEventListener("paste", (e) => {
    if (!e.target || e.target.id !== "impText") return;
    const html = e.clipboardData && e.clipboardData.getData("text/html");
    st.html = html && /<(h[1-6]|p|li|span)\b/i.test(html) ? html : "";
  });
  document.addEventListener("input", (e) => { if (e.target && e.target.id === "impText" && !e.target.value.trim()) st.html = ""; });
  A.impPaste = () => {
    const t = document.getElementById("impText")?.value || "";
    if (!t.trim()) return toast("Pega el documento primero", "");
    const html = st.html;
    run(async () => (html ? htmlToBlocks(html) : textToBlocks(t)), /docs-internal-guid/.test(html) ? "Pegado desde Google Docs" : "Texto pegado");
  };
  A.impReset = () => { st.result = null; st.file = ""; st.blocks = null; st.html = ""; render(); };
  A.impCreate = async () => {
    const r = st.result; if (!r) return;
    const c = JSON.parse(JSON.stringify(r.course));
    c.title = (document.getElementById("impTitle")?.value || c.title).trim() || "Curso nuevo";
    c.description = (document.getElementById("impDesc")?.value || c.description).trim();
    const para = {}; for (const [k] of PARA) if (st.para[k]) para[k] = true;
    if (Object.keys(para).length) c.para = para;
    c.phases.forEach((ph) => ph.sessions.forEach((s) => { delete s.autoPrayer; }));
    const done = await createCourse(c, st.update);
    if (done !== false) { st.result = null; st.file = ""; st.blocks = null; st.para = {}; st.update = ""; }
  };
}
