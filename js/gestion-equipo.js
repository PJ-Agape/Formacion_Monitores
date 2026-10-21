// Gestión, etapa 2: lo que antes se hacía en pantallas sueltas, ahora dentro del panel.
//  · Familias en una tabla: las 10 de una vez (nombre, etapa, dirigentes; integrantes salen de la asignación)
//  · Moderación: reportes del muro (publicaciones y respuestas) y del chat en un solo lugar
//  · Consentimientos: qué familias firmaron y qué autorizaron (solo administración)

import * as cloud from "./cloud.js";
import { esc, icon, toast } from "./util.js";
import { IDS, COLORS, ETAPAS, corto, derive, uidsOf, etapaSugerida } from "./familias-ag.js";
import { famIcon } from "./familia-portal.js";

const st = () => cloud.state();
let ctx = null;
export function setup(c) { ctx = c; registerActions(); }

// ---------------------------------------------------------------------------
// Familias en una tabla  (#/admin/grupos)
// ---------------------------------------------------------------------------
let T = null; // { rows, people, jovenes, draft: {fid: {nombre, etapa, dir:Set}} }
export function familiasHTML() {
  setTimeout(paintFam, 0);
  return `<header class="page-head"><span class="eyebrow">Gestión · Personas</span><h1>Las <em>familias</em></h1>
    <p>Las 10 familias en una sola tabla. Elige su etapa y sus dirigentes; los integrantes salen solos de <a href="#/admin/asignar">Asignar jóvenes</a>. Un dirigente está en una sola familia.</p></header>
    <div id="gfBox"><p class="muted" style="padding:24px;text-align:center">Cargando las familias…</p></div>`;
}
async function loadFam() {
  const [rows, people, jovenes] = await Promise.all([cloud.listFamilias(), cloud.listPeople().catch(() => []), cloud.listJovenes().catch(() => [])]);
  const by = Object.fromEntries((rows || []).map((r) => [r.id, r]));
  T = { rows: by, people: people.filter((p) => ["admin", "coordinador", "dirigente"].includes(p.role)).sort((a, b) => a.name.localeCompare(b.name, "es")), jovenes, draft: {} };
  IDS.forEach((id) => { const r = by[id] || {}; T.draft[id] = { nombre: r.nombre || "", etapa: r.etapa || "", dir: new Set((r.dirigentes || []).map((d) => d.uid)) }; });
}
const dirName = (uid) => (T.people.find((p) => p.uid === uid) || {}).name || "";
function intsOf(id) {
  const others = new Set(IDS.filter((x) => x !== id).flatMap((x) => [...T.draft[x].dir]));
  return derive([...T.draft[id].dir], T.jovenes, others);
}
function changed(id) {
  const r = T.rows[id] || {}, d = T.draft[id];
  return (r.nombre || "") !== d.nombre || (r.etapa || "") !== d.etapa || JSON.stringify((r.dirigentes || []).map((x) => x.uid).sort()) !== JSON.stringify([...d.dir].sort());
}
async function paintFam() {
  const box = document.getElementById("gfBox"); if (!box) return;
  if (!T) await loadFam().catch(() => { T = null; });
  if (!T) { box.innerHTML = `<div class="note">No se pudieron cargar las familias. Revisa tu conexión.</div>`; return; }
  const usados = {}; IDS.forEach((id) => T.draft[id].dir.forEach((u) => { usados[u] = id; }));
  const libres = T.people.filter((p) => !usados[p.uid]);
  const nCambios = IDS.filter(changed).length;
  box.innerHTML = `<div class="gf-tablewrap"><table class="gf-table">
    <thead><tr><th>Familia</th><th>Nombre</th><th>Etapa</th><th>Dirigentes</th><th>Integrantes</th></tr></thead>
    <tbody>${IDS.map((id, i) => {
      const d = T.draft[id], ints = intsOf(id), sug = etapaSugerida(T.jovenes, new Set(ints.map((j) => j.id)));
      return `<tr class="${changed(id) ? "dirty" : ""}" style="--fc:${COLORS[i]}">
        <th><span class="gf-n">${famIcon({ ...(T.rows[id] || {}), i })}</span></th>
        <td><input class="input" maxlength="40" data-gf="nombre" data-id="${id}" value="${esc(d.nombre)}" placeholder="Familia ${i + 1}" aria-label="Nombre de la familia ${i + 1}"></td>
        <td><select class="select" data-gf="etapa" data-id="${id}" aria-label="Etapa de la familia ${i + 1}"><option value="">—</option>${Object.entries(ETAPAS).map(([k, v]) => `<option value="${k}" ${d.etapa === k ? "selected" : ""}>${esc(v[0])}</option>`).join("")}</select>
          ${sug && sug !== d.etapa ? `<button class="gf-sug" data-action="gfSug" data-id="${id}" data-e="${sug}" title="La mayoría de sus integrantes">Sugerida: ${esc(ETAPAS[sug][0])}</button>` : ""}</td>
        <td><div class="fam-chips">${[...d.dir].map((u) => `<span class="fam-chip dir">⭐ ${esc(corto(dirName(u)) || "¿?")} <button class="gf-x" data-action="gfDirOut" data-id="${id}" data-u="${esc(u)}" aria-label="Quitar">×</button></span>`).join("")}
          ${libres.length ? `<select class="select gf-add" data-gf="dir" data-id="${id}" aria-label="Agregar dirigente"><option value="">+ dirigente</option>${libres.map((p) => `<option value="${esc(p.uid)}">${esc(p.name)}</option>`).join("")}</select>` : ""}</div></td>
        <td><b>${ints.length}</b> <span class="xs muted">${esc(ints.slice(0, 4).map((j) => j.nombre).join(", "))}${ints.length > 4 ? "…" : ""}</span></td></tr>`;
    }).join("")}</tbody></table></div>
    <div class="row-wrap gf-save"><span class="small">${nCambios ? `<b>${nCambios}</b> familia${nCambios > 1 ? "s" : ""} con cambios` : "Sin cambios"}</span><span class="spacer"></span>
      ${nCambios ? `<button class="btn btn-ghost btn-sm" data-action="gfReset">Deshacer</button>` : ""}<button class="btn btn-primary" data-action="gfSave" ${nCambios ? "" : "disabled"}>${icon("check")} Guardar cambios</button></div>
    <p class="xs muted">${libres.length ? `Dirigentes sin familia: ${esc(libres.map((p) => corto(p.name)).join(", "))}.` : "Todos los dirigentes tienen familia."} Los integrantes y la etapa sugerida se recalculan al instante.</p>`;
}

// ---------------------------------------------------------------------------
// Moderación  (#/admin/moderacion)
// ---------------------------------------------------------------------------
export function moderacionHTML() {
  setTimeout(paintMod, 0);
  return `<header class="page-head"><span class="eyebrow">Gestión · Comunicación</span><h1>Moderación</h1>
    <p>Todo lo reportado del muro y del chat en un solo lugar. Ocultar lo saca de la vista de todos sin borrarlo; el equipo lo sigue viendo.</p></header>
    <div class="row-wrap" style="gap:8px;margin-bottom:12px">
      <a class="btn btn-sm btn-soft" href="#/muro">${icon("chat")} Ir al muro</a><a class="btn btn-sm btn-soft" href="#/chat">${icon("chat")} Ir al chat</a>
      <button class="btn btn-sm btn-soft" data-action="salaNew">${icon("plus")} Nueva sala</button>
      ${st().isAdmin ? `<button class="btn btn-sm btn-soft" data-action="chatCfg">⚙️ Horario y limpieza del chat</button>` : ""}</div>
    <div id="gmBox"><p class="muted" style="padding:24px;text-align:center">Buscando reportes…</p></div>`;
}
let M = null;
async function paintMod() {
  const box = document.getElementById("gmBox"); if (!box) return;
  await cloud.loadSalas().catch(() => {});
  const [wall, reps, chat] = await Promise.all([cloud.latestWall().catch(() => []), cloud.flaggedReplies().catch(() => []), cloud.reportedChat(cloud.allSalas().map((s) => s.key)).catch(() => [])]);
  M = { wall, reps, chat };
  const nrep = (x) => Object.keys(x.reports || {}).length;
  const posts = wall.filter((p) => nrep(p) || p.hidden).sort((a, b) => nrep(b) - nrep(a));
  const salaName = (k) => (cloud.allSalas().find((s) => s.key === k) || {}).name || k;
  const row = (kind, x, txt, extra) => `<div class="card gm-i ${x.hidden ? "off" : ""}"><div style="flex:1;min-width:0">
      <span class="xs muted">${extra} · ${esc(x.authorName || "")}${nrep(x) ? ` · <b class="gm-rep">🚩 ${nrep(x)} reporte${nrep(x) > 1 ? "s" : ""}</b>` : ""}${x.hidden ? " · oculto" : ""}</span>
      <p class="gm-t">${esc(String(txt || "").slice(0, 280))}</p></div>
      <div class="gm-a">${kind !== "chat" ? `<button class="btn btn-sm btn-soft" data-action="gmHide" data-k="${kind}" data-id="${esc(x.id)}" data-p="${esc(x.pid || "")}" data-on="${x.hidden ? "0" : "1"}">${x.hidden ? "Mostrar" : "Ocultar"}</button>` : ""}
        ${nrep(x) && kind !== "chat" ? `<button class="btn btn-sm btn-ghost" data-action="gmClear" data-k="${kind}" data-id="${esc(x.id)}" data-p="${esc(x.pid || "")}">Quitar reportes</button>` : ""}
        <button class="btn btn-sm btn-ghost" data-action="gmDel" data-k="${kind}" data-id="${esc(x.id)}" data-p="${esc(x.pid || x.sala || "")}" aria-label="Borrar">${icon("trash")}</button></div></div>`;
  const n = posts.length + reps.length + chat.length;
  box.innerHTML = n ? `
    ${posts.length ? `<h2 class="mag-hub-sub">Publicaciones del muro · ${posts.length}</h2>${posts.map((p) => row("post", p, `${p.title}${p.body ? " — " + p.body : ""}`, `<a href="#/muro/${esc(p.id)}">Muro</a>`)).join("")}` : ""}
    ${reps.length ? `<h2 class="mag-hub-sub">Respuestas · ${reps.length}</h2>${reps.map((r) => row("reply", r, r.body, `<a href="#/muro/${esc(r.pid)}">Respuesta</a>`)).join("")}` : ""}
    ${chat.length ? `<h2 class="mag-hub-sub">Chat · ${chat.length}</h2>${chat.map((m) => row("chat", m, m.text, `<a href="#/chat/${esc(m.sala)}">${esc(salaName(m.sala))}</a>`)).join("")}` : ""}`
    : `<div class="card gh-ok"><b>✨ Sin reportes</b><p class="muted small">No hay nada reportado ni oculto en el muro o el chat.</p></div>`;
}

// ---------------------------------------------------------------------------
// Consentimientos  (#/admin/consentimientos) — solo administración
// ---------------------------------------------------------------------------
const YOUTH = ["ingreso", "madurez", "aspirante"];
export function consentHTML() {
  setTimeout(paintCons, 0);
  return `<header class="page-head"><span class="eyebrow">Gestión · Personas</span><h1>Consentimientos</h1>
    <p>Qué familias firmaron el consentimiento y qué autorizaron. El papel se guarda en la carpeta de consentimientos; aquí solo queda el registro.</p></header>
    <div class="row-wrap" style="margin-bottom:12px"><button class="btn btn-sm btn-soft" data-action="aConsentPdf">${icon("dl")} Descargar el consentimiento (PDF)</button></div>
    <div id="gcBox"><p class="muted" style="padding:24px;text-align:center">Cargando…</p></div>`;
}
async function paintCons() {
  const box = document.getElementById("gcBox"); if (!box) return;
  const ad = await cloud.adminData().catch(() => null);
  if (!ad) { box.innerHTML = `<div class="note">No se pudo cargar. Revisa tu conexión.</div>`; return; }
  const list = [...ad.users.filter((u) => YOUTH.includes(u.role) && u.active !== false).map((u) => ({ ...u, link: `#/admin/dirigentes/${encodeURIComponent(u.uid)}` })),
    ...ad.invites.filter((i) => YOUTH.includes(i.role)).map((i) => ({ ...i, name: i.name || i.id, pend: true, link: "#/admin/dirigentes" }))]
    .sort((a, b) => (!!a.consent - !!b.consent) || String(a.name).localeCompare(String(b.name), "es"));
  const yes = (v) => (v ? "✓" : "—");
  const falta = list.filter((u) => !u.consent).length;
  box.innerHTML = `${falta ? `<div class="note warn" style="margin-bottom:12px">🖊️ <b>${falta}</b> joven${falta > 1 ? "es" : ""} sin consentimiento registrado.</div>` : `<div class="note" style="margin-bottom:12px">✓ Todos los jóvenes tienen su consentimiento registrado.</div>`}
    <div class="gf-tablewrap"><table class="gf-table gc-table"><thead><tr><th>Joven</th><th>Rol</th><th>Consentimiento</th><th>Cuadro de honor</th><th>Cumpleaños</th><th>Fotos</th><th>Ficha privada</th><th></th></tr></thead>
    <tbody>${list.map((u) => { const c = u.consent || {};
      return `<tr class="${u.consent ? "" : "dirty"}"><th>${esc(corto(u.name))}${u.pend ? ` <span class="chip">Invitación</span>` : ""}</th><td>${esc(cloud.roleLabel(u.role))}</td>
        <td>${!u.consent ? `<b class="gm-rep">Falta</b>` : c.mayor ? "Mayor de 18" : `✓ ${esc(c.fecha || "")}`}</td><td>${c.mayor ? "—" : yes(c.honor)}</td><td>${c.mayor ? "—" : yes(c.cumple)}</td><td>${c.mayor ? "—" : yes(c.fotos)}</td><td>${c.mayor ? "—" : yes(c.ficha)}</td>
        <td><a class="btn btn-sm btn-ghost" href="${u.link}">${icon("edit")}</a></td></tr>`; }).join("") || `<tr><td colspan="8" class="muted">Aún no hay cuentas de jóvenes.</td></tr>`}</tbody></table></div>`;
}

// ---------------------------------------------------------------------------
let wired = false;
function registerActions() {
  const A = ctx.actions;
  A.gfSug = (el) => { T.draft[el.dataset.id].etapa = el.dataset.e; paintFam(); };
  A.gfDirOut = (el) => { T.draft[el.dataset.id].dir.delete(el.dataset.u); paintFam(); };
  A.gfReset = async () => { T = null; paintFam(); };
  A.gfSave = async (el) => {
    el.disabled = true;
    try {
      for (const id of IDS.filter(changed)) {
        const d = T.draft[id], r = T.rows[id] || {}, ints = intsOf(id);
        const dirigentes = [...d.dir].map((uid) => ({ uid, nombre: dirName(uid) }));
        await cloud.saveFamilia(id, { nombre: d.nombre.trim().slice(0, 40), nombrePor: d.nombre === (r.nombre || "") ? r.nombrePor || "" : "", icono: r.icono || "", etapa: d.etapa,
          dirigentes, integrantes: ints, uids: uidsOf(dirigentes, ints) });
      }
      toast("Familias guardadas 👨‍👩‍👧‍👦", "ok"); T = null; paintFam();
    } catch (e) { console.warn(e); toast("No se pudo guardar. Revisa tu conexión.", ""); el.disabled = false; }
  };
  A.gmHide = async (el) => {
    const on = el.dataset.on === "1";
    try { if (el.dataset.k === "post") await cloud.updatePost(el.dataset.id, { hidden: on }); else await cloud.updateReply(el.dataset.p, el.dataset.id, { hidden: on }); toast(on ? "Oculto" : "Visible de nuevo"); paintMod(); }
    catch { toast("No se pudo cambiar", ""); }
  };
  A.gmClear = async (el) => {
    try { if (el.dataset.k === "post") await cloud.updatePost(el.dataset.id, { reports: {} }); else await cloud.updateReply(el.dataset.p, el.dataset.id, { reports: {} }); toast("Reportes quitados"); paintMod(); }
    catch { toast("No se pudo cambiar", ""); }
  };
  A.gmDel = async (el) => {
    if (!confirm("¿Borrar definitivamente? No se puede deshacer.")) return;
    try {
      if (el.dataset.k === "post") await cloud.deletePost(el.dataset.id);
      else if (el.dataset.k === "reply") await cloud.deleteReply(el.dataset.p, el.dataset.id);
      else await cloud.deleteChat(el.dataset.p, el.dataset.id);
      toast("Borrado"); paintMod();
    } catch { toast("No se pudo borrar", ""); }
  };
  if (wired) return; wired = true;
  document.addEventListener("change", (e) => {
    const t = e.target; if (!t.dataset || !t.dataset.gf || !T) return;
    const d = T.draft[t.dataset.id];
    if (t.dataset.gf === "etapa") d.etapa = t.value;
    if (t.dataset.gf === "dir" && t.value) d.dir.add(t.value);
    if (t.dataset.gf !== "nombre") paintFam();
  });
  document.addEventListener("input", (e) => {
    const t = e.target; if (!t.dataset || t.dataset.gf !== "nombre" || !T) return;
    T.draft[t.dataset.id].nombre = t.value;
    const tr = t.closest("tr"); if (tr) tr.classList.toggle("dirty", changed(t.dataset.id));
    const n = IDS.filter(changed).length, b = document.querySelector("[data-action=gfSave]"), s = document.querySelector(".gf-save .small");
    if (b) b.disabled = !n; if (s) s.innerHTML = n ? `<b>${n}</b> familia${n > 1 ? "s" : ""} con cambios` : "Sin cambios";
  });
}
