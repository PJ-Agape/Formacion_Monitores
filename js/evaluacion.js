// Evaluación de cada encuentro: 5 preguntas de sí o no y un comentario corto (150 caracteres).
// La responde cada integrante de una familia, una vez por encuentro (la puede cambiar).
// Se guarda en familias/{fid}/evals/{año}-{n}-{uid}. Los dirigentes de la familia y el equipo ven
// los resultados juntos y los comentarios sin nombre; cada joven ve solo lo suyo.

import * as cloud from "./cloud.js";
import { esc, toast } from "./util.js";

export const PREGUNTAS = [
  ["inicio", "¿Te gustó la actividad de inicio?"],
  ["oracion", "¿La oración te ayudó a conectar con Dios?"],
  ["palabra", "¿Entendiste lo que nos dice el Evangelio?"],
  ["grupo", "¿Sentiste que te escucharon en tu grupo?"],
  ["desafio", "¿Te quedó claro tu desafío de la semana?"],
];
export const MAXC = 150;
const st = () => cloud.state();
const evId = (year, n, uid) => `${year}-${n}-${uid}`;
let ctx = null, famCache = null;
export function setup(c) { ctx = c; registerActions(); }

// Familia de quien está mirando (la que tiene su cuenta entre sus integrantes)
async function miFamilia() {
  if (!famCache) famCache = (await cloud.listFamilias()) || [];
  const me = cloud.myUid();
  return famCache.find((f) => (f.uids || []).includes(me)) || null;
}

// Tarjeta para responder. slot: <div class="ev-slot" data-ev-n="12" data-ev-year="2027" [data-ev-fid="f3"] [data-ev-tema="…"]>
export async function mount(root = document) {
  const slots = [...root.querySelectorAll(".ev-slot:not([data-ev-ok])")];
  if (!slots.length || !cloud.enabled || !st().ready) return;
  for (const s of slots) {
    s.dataset.evOk = "1";
    const fid = s.dataset.evFid || (await miFamilia())?.id;
    if (!fid) { s.remove(); continue; }
    const n = +s.dataset.evN, year = +s.dataset.evYear, id = evId(year, n, cloud.myUid());
    const prev = await cloud.getFamEval(fid, id).catch(() => null);
    s.innerHTML = formHTML({ fid, n, year, tema: s.dataset.evTema || "", prev });
  }
}
function formHTML({ fid, n, year, tema, prev }) {
  const r = (prev && prev.r) || [];
  return `<form class="card ev-card" data-fid="${esc(fid)}" data-n="${n}" data-year="${year}" onsubmit="return false">
    <span class="eyebrow">⭐ Evalúa el encuentro N° ${n}${tema ? ` · ${esc(tema)}` : ""}</span>
    <h3>${prev ? "¡Gracias por tu evaluación! Puedes cambiarla." : "¿Cómo te fue en el encuentro?"}</h3>
    <ol class="ev-qs">${PREGUNTAS.map(([k, q], i) => `<li><span>${esc(q)}</span>
      <span class="ev-yn" role="radiogroup" aria-label="${esc(q)}">
        <label><input type="radio" name="q${i}" value="1" ${r[i] === true ? "checked" : ""}><span>👍 Sí</span></label>
        <label><input type="radio" name="q${i}" value="0" ${r[i] === false ? "checked" : ""}><span>👎 No</span></label></span></li>`).join("")}</ol>
    <label class="field"><span>¿Algo que quieras contarnos? <span class="muted">(opcional)</span></span>
      <textarea class="textarea" name="c" maxlength="${MAXC}" rows="2" placeholder="Lo que más te gustó, lo que cambiarías…">${esc((prev && prev.c) || "")}</textarea>
      <span class="xs muted ev-cnt">${((prev && prev.c) || "").length}/${MAXC}</span></label>
    <div class="row-wrap"><span class="xs muted">Tus dirigentes ven los resultados juntos y los comentarios sin tu nombre.</span><span class="spacer"></span>
      <button class="btn btn-primary btn-sm" data-action="evSend">${prev ? "Actualizar" : "Enviar"}</button></div>
  </form>`;
}

// ---- Resultados (dirigentes de la familia y equipo) ----
export async function results(fid, year, n) {
  const all = (await cloud.listFamEvals(fid).catch(() => null)) || [];
  return all.filter((x) => +x.year === +year && +x.n === +n);
}
export function resultsHTML(rows) {
  if (!rows.length) return `<p class="muted small">Aún nadie ha evaluado este encuentro.</p>`;
  const bar = (i) => {
    const ans = rows.filter((r) => typeof (r.r || [])[i] === "boolean"), si = ans.filter((r) => r.r[i]).length;
    const p = ans.length ? Math.round((si / ans.length) * 100) : 0;
    return `<li><span>${esc(PREGUNTAS[i][1])}</span><span class="ev-bar"><i style="width:${p}%"></i></span><b>${ans.length ? p + "%" : "–"}</b><small>${si} de ${ans.length} dijeron sí</small></li>`;
  };
  const coms = rows.map((r) => (r.c || "").trim()).filter(Boolean);
  return `<p class="small"><b>${rows.length}</b> respuesta${rows.length === 1 ? "" : "s"}</p>
    <ul class="ev-res">${PREGUNTAS.map((_, i) => bar(i)).join("")}</ul>
    ${coms.length ? `<span class="fam-k">Comentarios</span><ul class="ev-coms">${coms.map((c) => `<li>«${esc(c)}»</li>`).join("")}</ul>` : `<p class="xs muted">Sin comentarios.</p>`}`;
}
// Planilla de evaluaciones (sin nombres)
export function csvRows(fams, cal) {
  const head = ["Familia", "Año", "Encuentro N°", "Tema", "Respuestas", ...PREGUNTAS.map(([k]) => `% sí · ${k}`), "Comentarios"];
  const out = [head];
  for (const { f, rows } of fams) {
    const by = {};
    rows.forEach((r) => { const k = `${r.year}-${r.n}`; (by[k] = by[k] || []).push(r); });
    for (const k of Object.keys(by).sort((a, b) => a.localeCompare(b, "es", { numeric: true }))) {
      const rs = by[k], [y, n] = k.split("-"), e = cal && +cal.year === +y ? (cal.encuentros || []).find((x) => x.n === +n) : null;
      out.push([f.nombre || `Familia ${f.i + 1}`, y, n, e ? e.tema : "", rs.length,
        ...PREGUNTAS.map((_, i) => { const a = rs.filter((r) => typeof (r.r || [])[i] === "boolean"); return a.length ? Math.round((a.filter((r) => r.r[i]).length / a.length) * 100) : ""; }),
        rs.map((r) => (r.c || "").trim()).filter(Boolean).join(" | ")]);
    }
  }
  return out;
}

let wired = false;
function registerActions() {
  ctx.actions.evSend = async (el) => {
    const form = el.closest("form.ev-card"); if (!form) return;
    const fd = new FormData(form);
    const r = PREGUNTAS.map((_, i) => (fd.get("q" + i) == null ? null : fd.get("q" + i) === "1"));
    if (r.some((x) => x === null)) return toast("Responde las 5 preguntas 🙂", "");
    const c = String(fd.get("c") || "").trim().slice(0, MAXC);
    const fid = form.dataset.fid, n = +form.dataset.n, year = +form.dataset.year;
    el.disabled = true;
    try {
      await cloud.saveFamEval(fid, evId(year, n, cloud.myUid()), { n, year, r, c, uid: cloud.myUid() });
      toast("¡Gracias! Tu evaluación nos ayuda a preparar mejores encuentros 💛", "ok");
      form.querySelector("h3").textContent = "¡Gracias por tu evaluación! Puedes cambiarla.";
      el.textContent = "Actualizar";
    } catch (e) { console.warn(e); toast("No se pudo enviar. Revisa tu conexión.", ""); }
    el.disabled = false;
  };
  if (wired) return; wired = true;
  document.addEventListener("input", (e) => {
    if (e.target.name === "c" && e.target.closest(".ev-card")) { const s = e.target.closest(".field").querySelector(".ev-cnt"); if (s) s.textContent = `${e.target.value.length}/${MAXC}`; }
  });
}
