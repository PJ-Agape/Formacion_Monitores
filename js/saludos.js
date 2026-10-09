// Gestión → Saludos para WhatsApp: el saludo de buenos días y el de buenas noches de cada fecha,
// con su imagen, listos para enviar al grupo desde el celular (menú «Compartir» del teléfono).

import { esc, icon, toast } from "./util.js";
import * as cloud from "./cloud.js";
import * as E from "./estudio.js";

let data = null, sel = null;

// --- Bienvenida a quienes se suman al grupo -------------------------------
const APP = "https://pj-agape.github.io/Formacion_Monitores/";
export const BIENV_DEFAULT = `*¡{bienvenido}, {nombre}!* 🙌💛
Qué alegría que te sumes a la Pastoral Juvenil Ágape. Aquí hay un lugar para ti, tal como eres.

En este grupo compartimos:
☀️ el saludo de buenos días con el Evangelio
🌙 una oración para cerrar el día
📅 las actividades y encuentros

📲 La formación y la comunidad están en nuestra app *agAPPe*: ${APP}
Para entrar, pídenos tu invitación.

Cualquier duda, pregunta con confianza. ¡Caminamos juntos! 🙏
_Pastoral Juvenil Ágape · Parroquia San Miguel de Yungay_`;
const BV = { o: ["Bienvenido", "Bienvenida", "Bienvenidos", "Bienvenidas"], l: ["Él", "Ella", "Varios", "Varias"] };
const bv = { tpl: null, saved: null, nombre: "", g: 0, open: false };
function bienvText() {
  const n = bv.nombre.trim();
  let t = (bv.tpl ?? BIENV_DEFAULT).replace(/\{bienvenido\}/g, BV.o[bv.g]);
  t = n ? t.replace(/\{nombre\}/g, n) : t.replace(/,?\s*\{nombre\}/g, "");
  return t;
}
const bienvPiece = () => ({ kicker: "Nuevo en el grupo", title: bv.nombre.trim() ? `¡${BV.o[bv.g]}, *${bv.nombre.trim()}*!` : `¡${BV.o[bv.g]} *a casa*!`, hand: "Hay un lugar para ti", sub: "Pastoral Juvenil Ágape · Parroquia San Miguel de Yungay", ill: "acogida" });
async function paintBienv() {
  const cv = document.getElementById("bvCanvas"); if (!cv) return;
  await E.ready(); const d = bienvPiece(); await E.preload(E.illsFor("cielo", d));
  cv.width = cv.height = 1080; E.piece(cv.getContext("2d"), 1080, 1080, "cielo", d);
}
async function bienvHTML() {
  if (bv.saved === null) { const c = await cloud.getBienvenida().catch(() => null); bv.saved = (c && c.texto) || ""; if (bv.tpl === null) bv.tpl = bv.saved || BIENV_DEFAULT; }
  const admin = cloud.state().isAdmin;
  if (bv.open) setTimeout(paintBienv, 30);
  return `<details class="card sal-bv" ${bv.open ? "open" : ""} id="bvBox"><summary><h2 style="display:inline">👋 Bienvenida a quienes se suman</h2> <span class="muted small">Imagen y mensaje para recibir a alguien nuevo en el grupo</span></summary>
    <div class="sal-bv-grid">
      <div><canvas id="bvCanvas" class="sal-img" aria-label="Imagen de bienvenida"></canvas></div>
      <div class="stack">
        <div class="field"><label>Nombre <span class="muted">(o nombres: «Sofi y Mati»)</span></label><input class="input" id="bvNombre" maxlength="40" value="${esc(bv.nombre)}" placeholder="Ej: Sofi"></div>
        <div class="field"><label>Para</label><div class="seg" role="radiogroup" aria-label="Para quién">${BV.l.map((l, i) => `<label><input type="radio" name="bvG" value="${i}" ${bv.g === i ? "checked" : ""}><span>${l}</span></label>`).join("")}</div></div>
        <div class="row-wrap" style="gap:8px">
          <button class="btn btn-gold" data-action="bvShare">📤 Enviar a WhatsApp</button>
          <button class="btn btn-soft btn-sm" data-action="bvCopy">${icon("copy")} Copiar texto</button>
          <button class="btn btn-ghost btn-sm" data-action="bvSave">${icon("dl")} Guardar imagen</button></div>
        <div class="sal-wa" id="bvPrev">${wa(bienvText())}</div>
        <details class="dif-more"><summary>✏️ Editar el mensaje</summary>
          <p class="xs muted" style="margin-top:6px">Usa <b>{nombre}</b> y <b>{bienvenido}</b>: se cambian solos. Entre *asteriscos* va en negrita en WhatsApp y entre _guiones bajos_ en cursiva.</p>
          <textarea class="input" id="bvTpl" rows="12" maxlength="1500">${esc(bv.tpl)}</textarea>
          <div class="row-wrap" style="gap:8px;margin-top:8px">
            ${admin ? `<button class="btn btn-primary btn-sm" data-action="bvStore">💾 Guardar para todo el equipo</button>` : `<span class="xs muted">Tus cambios valen para este envío. Para dejarlos fijos, pídeselo a un administrador.</span>`}
            <button class="btn btn-ghost btn-sm" data-action="bvReset">↩️ Volver al original</button></div>
        </details>
      </div></div></details>`;
}
const pad = (n) => String(n).padStart(2, "0");
const hoy = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const wa = (t) => esc(t).replace(/\*([^*\n]+)\*/g, "<b>$1</b>").replace(/(^|\s)_([^_\n]+)_/g, "$1<i>$2</i>").replace(/\n/g, "<br>");
const img = (k, iso) => `saludos/${k === "noche" ? "noche" : "manana"}/${iso}.jpg`;

async function load() {
  if (data) return data;
  try { data = await fetch("saludos/saludos.json", { cache: "no-cache" }).then((r) => (r.ok ? r.json() : null)); } catch { data = null; }
  return data;
}

const part = (x, k) => `<article class="sal-part ${k}">
    <h3>${k === "noche" ? "🌙 Buenas noches" : "☀️ Buenos días"} <small>${esc(k === "noche" ? `${x.ref} · ${x.salmo}` : `Evangelio · ${x.cita}`)}</small></h3>
    <img class="sal-img" src="${img(k, x.iso)}" alt="Imagen de ${k === "noche" ? "buenas noches" : "buenos días"} del ${esc(x.fecha)}" loading="lazy">
    <div class="row-wrap" style="gap:8px">
      <button class="btn btn-gold" data-action="salShare" data-iso="${x.iso}" data-k="${k}">📤 Enviar a WhatsApp</button>
      <button class="btn btn-soft btn-sm" data-action="salCopy" data-iso="${x.iso}" data-k="${k}">${icon("copy")} Copiar texto</button>
      <a class="btn btn-ghost btn-sm" href="${img(k, x.iso)}" download="agAPPe-${k === "noche" ? "buenas-noches" : "buenos-dias"}-${x.iso}.jpg">${icon("dl")} Guardar imagen</a>
    </div>
    <div class="sal-wa">${wa(k === "noche" ? x.noche : x.dia)}</div>
  </article>`;

export async function adminView() {
  const d = await load();
  if (!d) return `<header class="page-head"><span class="eyebrow">Gestión</span><h1>Saludos para WhatsApp</h1></header><div class="note">No se pudieron cargar los saludos. Revisa tu conexión.</div>`;
  const t = hoy();
  if (!sel || !d.dias.some((x) => x.iso === sel)) sel = (d.dias.find((x) => x.iso >= t) || d.dias[d.dias.length - 1]).iso;
  const x = d.dias.find((y) => y.iso === sel);
  const night = new Date().getHours() >= 17 && sel === t;
  setTimeout(() => document.querySelector(".sal-day.on")?.scrollIntoView({ block: "nearest", inline: "center" }), 50);
  const bienv = await bienvHTML();
  return `<header class="page-head"><span class="eyebrow">Gestión</span><h1>Saludos para <em>WhatsApp</em></h1>
    <p>Buenos días con el Evangelio y buenas noches con las Vísperas, del ${esc(d.dias[0].fecha.toLowerCase())} al ${esc(d.dias[d.dias.length - 1].fecha.toLowerCase())}. Desde el celular, «Enviar a WhatsApp» abre el menú para compartir: eliges WhatsApp y el grupo, y la imagen va con su texto.</p></header>
  ${bienv}
  <div class="sal-days" role="list">${d.dias.map((y) => `<button role="listitem" class="sal-day ${y.iso === sel ? "on" : ""} ${y.iso === t ? "today" : ""} ${y.iso < t ? "past" : ""}" data-action="salPick" data-iso="${y.iso}" title="${esc(y.titulo)}"><small>${esc(y.fecha.split(" ")[0].slice(0, 3))}</small><b>${+y.iso.slice(8)}</b><small>${["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"][+y.iso.slice(5, 7) - 1]}</small></button>`).join("")}</div>
  <section class="card sal-card"><div class="sal-top"><h2>${sel === t ? "Hoy · " : ""}${esc(x.fecha)}</h2><span class="muted small">${esc(x.titulo)}</span></div>
    <div class="sal-grid">${(night ? ["noche", "dia"] : ["dia", "noche"]).map((k) => part(x, k)).join("")}</div></section>
  <p class="xs muted">Los versículos de la noche vienen del salmo de Vísperas de cada día, en traducción sencilla. Para la antífona oficial, revisa la Liturgia de las Horas.</p>`;
}

function pick(iso, k) { const x = data && data.dias.find((y) => y.iso === iso); return x ? { x, text: k === "noche" ? x.noche : x.dia } : null; }

async function shareImg(blob, name, text) {
  try { await navigator.clipboard.writeText(text); } catch {}
  try {
    const file = new File([blob], name, { type: blob.type || "image/jpeg" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text }); return; }
    if (navigator.share) { await navigator.share({ text }); toast("Se envió el texto. La imagen la guardas con «Guardar imagen».", ""); return; }
    toast("En el computador: guarda la imagen y pega el texto (ya está copiado).", "");
  } catch (e) { if (e && e.name !== "AbortError") toast("No se pudo abrir el menú para compartir. El texto quedó copiado.", ""); }
}
const bvBlob = () => new Promise((ok) => document.getElementById("bvCanvas").toBlob(ok, "image/png"));
let bvT = 0;
function bvRefresh(img) {
  const p = document.getElementById("bvPrev"); if (p) p.innerHTML = wa(bienvText());
  if (img) { clearTimeout(bvT); bvT = setTimeout(paintBienv, 250); }
}
let bvWired = false;
function wireBienv() {
  if (bvWired) return; bvWired = true;
  document.addEventListener("input", (e) => {
    if (e.target.id === "bvNombre") { bv.nombre = e.target.value; bvRefresh(true); }
    if (e.target.id === "bvTpl") { bv.tpl = e.target.value; bvRefresh(false); }
  });
  document.addEventListener("change", (e) => { if (e.target.name === "bvG") { bv.g = +e.target.value; bvRefresh(true); } });
  document.addEventListener("toggle", (e) => { if (e.target.id === "bvBox") { bv.open = e.target.open; if (bv.open) paintBienv(); } }, true);
}

export function registerActions(actions, render) {
  wireBienv();
  const fname = () => `agAPPe-bienvenida${bv.nombre.trim() ? "-" + bv.nombre.trim().toLowerCase().replace(/[^a-z0-9áéíóúñ]+/gi, "-") : ""}.png`;
  actions.bvShare = async () => shareImg(await bvBlob(), fname(), bienvText());
  actions.bvCopy = async () => { try { await navigator.clipboard.writeText(bienvText()); toast("Texto copiado 📋", "ok"); } catch { toast("No se pudo copiar", ""); } };
  actions.bvSave = async () => { const b = await bvBlob(), a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = fname(); document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); };
  actions.bvStore = async () => {
    const t = (bv.tpl || "").trim(); if (!t) return toast("El mensaje está vacío", "");
    try { await cloud.saveBienvenida({ texto: t === BIENV_DEFAULT ? "" : t }); bv.saved = t === BIENV_DEFAULT ? "" : t; toast("Mensaje guardado para todo el equipo 💾", "ok"); }
    catch { toast("No se pudo guardar. Revisa tu conexión.", ""); }
  };
  actions.bvReset = () => { bv.tpl = BIENV_DEFAULT; const ta = document.getElementById("bvTpl"); if (ta) ta.value = bv.tpl; bvRefresh(false); toast("Volviste al mensaje original. Para dejarlo fijo, guárdalo.", ""); };
  actions.salPick = (el) => { sel = el.dataset.iso; render(); };
  actions.salCopy = async (el) => {
    const p = pick(el.dataset.iso, el.dataset.k); if (!p) return;
    try { await navigator.clipboard.writeText(p.text); toast("Texto copiado 📋", "ok"); } catch { toast("No se pudo copiar", ""); }
  };
  actions.salShare = async (el) => {
    const p = pick(el.dataset.iso, el.dataset.k); if (!p) return;
    try { await navigator.clipboard.writeText(p.text); } catch {}
    try {
      const blob = await fetch(img(el.dataset.k, p.x.iso)).then((r) => r.blob());
      const file = new File([blob], `agAPPe-${el.dataset.k === "noche" ? "buenas-noches" : "buenos-dias"}-${p.x.iso}.jpg`, { type: "image/jpeg" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text: p.text }); return; }
      if (navigator.share) { await navigator.share({ text: p.text }); toast("Se envió el texto. La imagen la guardas con «Guardar imagen».", ""); return; }
      toast("En el computador: guarda la imagen y pega el texto (ya está copiado).", "");
    } catch (e) { if (e && e.name !== "AbortError") toast("No se pudo abrir el menú para compartir. El texto quedó copiado.", ""); }
  };
}
