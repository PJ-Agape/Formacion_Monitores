// Cuaderno de formación para imprimir (Recursos → Para imprimir).
// Arma el curso completo o un módulo como documento carta: portada, índice, cada unidad con su
// oración inicial, texto, Palabra, Iglesia, preguntas con líneas para escribir, misión y oración final,
// y la evaluación de cada módulo. Usa el contenido publicado (el mismo que ven los dirigentes).
import { esc, rich, icon } from "./util.js";
import { ORACIONES } from "./devocionario.js";

let ctx = null; // { actions, onAfterRender, S }
export function setup(c) { ctx = c; registerActions(); }

const VEN = (ORACIONES.find((o) => o.t === "Ven Santo Espíritu") || {}).x || "";
const KEY = "agape_print_curso";
let opt = { lines: true, quiz: true, key: false };
try { opt = { ...opt, ...(JSON.parse(localStorage.getItem(KEY) || "{}") || {}) }; } catch { /* sin almacenamiento */ }
const saveOpt = () => { try { localStorage.setItem(KEY, JSON.stringify(opt)); } catch { /* */ } };

function prose(text) {
  return String(text || "").split(/\n\s*\n/).map((block) => {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length && lines.every((l) => /^[-•]\s+/.test(l))) return `<ul>${lines.map((l) => `<li>${rich(l.replace(/^[-•]\s+/, ""))}</li>`).join("")}</ul>`;
    return `<p>${rich(lines.join(" "))}</p>`;
  }).join("");
}
const nl = (t) => esc(t).replace(/\n/g, "<br>");
const writeLines = (n) => opt.lines ? `<div class="cp-lines">${"<i></i>".repeat(n)}</div>` : "";

function unitHTML(se, ph) {
  const bible = typeof se.bible === "string" ? { ref: "", comment: se.bible } : (se.bible || {});
  return `<article class="cp-unit">
    <header class="cp-uhead"><span>Módulo ${esc(ph.phaseNum)} · Unidad ${esc(se.id)}${se.time ? ` · ${esc(se.time)}` : ""}</span><h2>${esc(se.title)}</h2></header>
    ${VEN ? `<section class="cp-pray"><h4>Oración inicial · Invocación al Espíritu Santo</h4><p>${nl(VEN)}</p></section>` : ""}
    <p class="cp-obj"><b>Objetivo.</b> ${rich(se.objective)}</p>
    ${se.intro ? `<p class="cp-lead">${rich(se.intro)}</p>` : ""}
    ${(se.sections || []).map((s) => `<section class="cp-sec"><h3>${esc(s.title)}</h3>${prose(s.body)}</section>`).join("")}
    ${se.dynamic ? `<section class="cp-sec"><h3>Clave para comprender a los jóvenes</h3>${prose(se.dynamic)}</section>` : ""}
    ${bible.comment ? `<section class="cp-box"><h4>Palabra de Dios${bible.ref ? ` · ${esc(bible.ref)}` : ""}</h4><p>${rich(bible.comment)}</p></section>` : ""}
    ${(se.church || []).length ? `<section class="cp-box"><h4>La Iglesia nos dice</h4>${se.church.map((c) => `<p><b>${esc(c.source)}.</b> ${rich(c.text)}</p>`).join("")}</section>` : ""}
    ${(se.questions || []).length ? `<section class="cp-sec cp-qs"><h3>Para tu reflexión</h3>${se.questions.map((q, n) => `<div class="cp-q"><p><b>${n + 1}.</b> ${rich(q)}</p>${writeLines(4)}</div>`).join("")}</section>` : ""}
    ${se.activity ? `<section class="cp-box cp-act"><h4>Llévalo a tu grupo</h4><p>${rich(se.activity)}</p>${writeLines(2)}</section>` : ""}
    ${se.prayer ? `<section class="cp-pray"><h4>Oración final · Acción de gracias</h4><p>${rich(se.prayer)}</p></section>` : ""}
    ${(se.resources || []).length ? `<section class="cp-res"><h4>Para profundizar</h4><ul>${se.resources.map((r) => `<li><b>${esc(r.title)}</b>${r.note ? ` · ${esc(r.note)}` : ""}</li>`).join("")}</ul></section>` : ""}
  </article>`;
}
function quizHTML(ph) {
  const q = ph.quiz; if (!q || !(q.questions || []).length) return "";
  return `<article class="cp-unit cp-quiz"><header class="cp-uhead"><span>${esc(q.badge || `Evaluación módulo ${ph.phaseNum}`)}</span><h2>${esc(q.title || "Evaluación")}</h2></header>
    <p class="cp-lead">Marca la alternativa que mejor refleja lo aprendido.</p>
    ${q.questions.map((x) => `<div class="cp-qq"><p><b>${rich(x.q)}</b></p><ul class="cp-opts">${x.options.map((o, k) => `<li><span class="cp-box-o">${"ABCD"[k]}</span>${rich(o)}</li>`).join("")}</ul></div>`).join("")}
  </article>`;
}
function keyHTML(phases) {
  const withQ = phases.filter((ph) => ph.quiz && (ph.quiz.questions || []).length);
  if (!withQ.length) return "";
  return `<article class="cp-unit cp-key"><header class="cp-uhead"><span>Para el equipo formador</span><h2>Pauta de respuestas</h2></header>
    ${withQ.map((ph) => `<section class="cp-sec"><h3>Módulo ${esc(ph.phaseNum)} · ${esc(ph.quiz.title || ph.title)}</h3><ol>${ph.quiz.questions.map((x) => `<li><b>${"ABCD"[x.correct]}.</b> ${rich(x.feedback || "")}</li>`).join("")}</ol></section>`).join("")}
  </article>`;
}

export function view(ci = 0, pi = "") {
  document.body.classList.add("cp-printing");
  ctx.onLeave?.(() => document.body.classList.remove("cp-printing"));
  const courses = ctx.S.content().courses || [];
  ci = Math.min(Math.max(0, +ci || 0), Math.max(0, courses.length - 1));
  const c = courses[ci];
  if (!c) return `<p class="muted">No hay cursos para imprimir.</p>`;
  const one = pi !== "" && pi != null && c.phases[+pi] ? +pi : null;
  const phases = one === null ? c.phases : [c.phases[one]];
  const name = (ctx.S.getProfile().name || "").trim();
  const nUnits = phases.reduce((a, p) => a + p.sessions.length, 0);
  const bar = `<div class="cp-bar no-print">
    <a class="imp-back" href="#/materiales">${icon("left")} Recursos</a>
    <h1>Imprimir la formación</h1>
    <p class="muted small">Un cuaderno de trabajo listo para imprimir o guardar como PDF (tamaño carta). Usa el contenido publicado del curso.</p>
    <div class="cp-opts-row">
      <label class="field"><span class="xs muted">Curso</span><select class="select" id="cpCourse">${courses.map((x, i) => `<option value="${i}" ${i === ci ? "selected" : ""}>${esc(x.title)}</option>`).join("")}</select></label>
      <label class="field"><span class="xs muted">Qué imprimir</span><select class="select" id="cpPhase"><option value="">Curso completo</option>${c.phases.map((p, i) => `<option value="${i}" ${one === i ? "selected" : ""}>Módulo ${esc(p.phaseNum)} · ${esc(p.title)}</option>`).join("")}</select></label>
    </div>
    <div class="cp-checks">
      <label><input type="checkbox" data-cp="lines" ${opt.lines ? "checked" : ""}> Líneas para escribir las respuestas</label>
      <label><input type="checkbox" data-cp="quiz" ${opt.quiz ? "checked" : ""}> Incluir las evaluaciones</label>
      <label><input type="checkbox" data-cp="key" ${opt.key ? "checked" : ""}> Pauta de respuestas al final (para el equipo formador)</label>
    </div>
    <button class="btn btn-primary" data-action="print">${icon("print")} Imprimir o guardar PDF</button>
    <p class="xs muted">${phases.length} módulo${phases.length > 1 ? "s" : ""} · ${nUnits} unidades. En el diálogo de impresión elige «Guardar como PDF» si quieres el archivo.</p>
  </div>`;
  return `${bar}
  <div class="cp-doc">
    <section class="cp-cover">
      <img src="icons/logo-320.webp" alt="" class="cp-logo" onerror="this.remove()">
      <span class="cp-kicker">Pastoral Juvenil Ágape · Parroquia San Miguel de Yungay</span>
      <h1>${esc(c.title)}</h1>
      ${one !== null ? `<p class="cp-sub">Módulo ${esc(phases[0].phaseNum)} · ${esc(phases[0].title)}</p>` : `<p class="cp-sub">Cuaderno de formación de dirigentes</p>`}
      ${c.description ? `<p class="cp-desc">${esc(c.description)}</p>` : ""}
      <p class="cp-owner">Cuaderno de: <span>${esc(name)}</span></p>
    </section>
    <section class="cp-toc"><h2>Contenido</h2>${phases.map((ph) => `<div class="cp-toc-m"><b>Módulo ${esc(ph.phaseNum)} · ${esc(ph.title)}</b><ol>${ph.sessions.map((se) => `<li><span>${esc(se.id)}</span> ${esc(se.title)}</li>`).join("")}${opt.quiz && ph.quiz?.questions?.length ? `<li class="cp-toc-q"><span>✓</span> Evaluación del módulo</li>` : ""}</ol></div>`).join("")}</section>
    ${phases.map((ph) => `<section class="cp-module"><header class="cp-mhead"><span>Módulo ${esc(ph.phaseNum)}</span><h2>${esc(ph.title)}</h2>${ph.intro ? `<p>${rich(ph.intro)}</p>` : ""}</header>
      ${ph.sessions.map((se) => unitHTML(se, ph)).join("")}${opt.quiz ? quizHTML(ph) : ""}</section>`).join("")}
    ${opt.quiz && opt.key ? keyHTML(phases) : ""}
  </div>`;
}

function go(ci, pi) { location.hash = `#/imprimir/curso/${ci}${pi !== "" ? "/" + pi : ""}`; }
function registerActions() {
  document.addEventListener("change", (e) => {
    const t = e.target;
    if (t.id === "cpCourse") return go(+t.value, "");
    if (t.id === "cpPhase") return go(+document.getElementById("cpCourse").value, t.value);
    if (t.dataset && t.dataset.cp) { opt[t.dataset.cp] = t.checked; saveOpt(); ctx.render(); }
  });
}
