// Gestión → Saludos para WhatsApp: el saludo de buenos días y el de buenas noches de cada fecha,
// con su imagen, listos para enviar al grupo desde el celular (menú «Compartir» del teléfono).

import { esc, icon, toast } from "./util.js";

let data = null, sel = null;
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
  return `<header class="page-head"><span class="eyebrow">Gestión</span><h1>Saludos para <em>WhatsApp</em></h1>
    <p>Buenos días con el Evangelio y buenas noches con las Vísperas, del ${esc(d.dias[0].fecha.toLowerCase())} al ${esc(d.dias[d.dias.length - 1].fecha.toLowerCase())}. Desde el celular, «Enviar a WhatsApp» abre el menú para compartir: eliges WhatsApp y el grupo, y la imagen va con su texto.</p></header>
  <div class="sal-days" role="list">${d.dias.map((y) => `<button role="listitem" class="sal-day ${y.iso === sel ? "on" : ""} ${y.iso === t ? "today" : ""} ${y.iso < t ? "past" : ""}" data-action="salPick" data-iso="${y.iso}" title="${esc(y.titulo)}"><small>${esc(y.fecha.split(" ")[0].slice(0, 3))}</small><b>${+y.iso.slice(8)}</b><small>${["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"][+y.iso.slice(5, 7) - 1]}</small></button>`).join("")}</div>
  <section class="card sal-card"><div class="sal-top"><h2>${sel === t ? "Hoy · " : ""}${esc(x.fecha)}</h2><span class="muted small">${esc(x.titulo)}</span></div>
    <div class="sal-grid">${(night ? ["noche", "dia"] : ["dia", "noche"]).map((k) => part(x, k)).join("")}</div></section>
  <p class="xs muted">Los versículos de la noche vienen del salmo de Vísperas de cada día, en traducción sencilla. Para la antífona oficial, revisa la Liturgia de las Horas.</p>`;
}

function pick(iso, k) { const x = data && data.dias.find((y) => y.iso === iso); return x ? { x, text: k === "noche" ? x.noche : x.dia } : null; }

export function registerActions(actions, render) {
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
