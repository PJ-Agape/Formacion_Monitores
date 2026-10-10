// Nuestras familias (Comunidad): los 10 grupos pequeños de la pastoral.
// Cada tarjeta: el nombre que eligen sus integrantes, el o los dirigentes a cargo y quiénes la forman.
// El equipo elige el o los dirigentes de cada familia; los integrantes salen solos de la asignación
// de jóvenes a dirigentes que ya existe (Gestión → Asignar jóvenes: «a cargo» y «apoyo»).
// Integrantes y dirigentes le ponen el nombre.
// De los jóvenes solo se guarda el nombre corto (nombre + inicial del apellido).

import * as cloud from "./cloud.js";
import { esc, icon, toast } from "./util.js";

const N = 10;
const IDS = Array.from({ length: N }, (_, i) => `f${i + 1}`);
const COLORS = ["#1351a4", "#ef591c", "#c98a00", "#2e8b57", "#7b4fc4", "#d6336c", "#0f8a8a", "#8a5a3c", "#3d7fd1", "#e48a68"];
const SOFT = ["#e1f3fd", "#fde0d2", "#fff0c2", "#dcf3e4", "#ece3fa", "#fbe0ea", "#d8f2f2", "#efe3d6", "#dfeafb", "#fde8de"];
let rows = null, ctx = null;

export function setup(c) { ctx = c; registerActions(); }
const corto = (n) => { const p = String(n || "").trim().split(/\s+/); return p.length > 1 ? `${p[0]} ${p[1][0].toUpperCase()}.` : p[0] || ""; };
const st = () => cloud.state();
const activos = (js) => (js || []).filter((j) => j.activo !== false && j.etapa !== "equipo");
// Integrantes de una familia = jóvenes cuyo dirigente a cargo (o de apoyo) es uno de los suyos. Si alguien queda
// en dos familias (a cargo en una y apoyo en otra), cuenta en la del dirigente a cargo.
function derive(dirUids, js, otherDir = new Set()) {
  const d = new Set(dirUids);
  return activos(js).filter((j) => d.has(j.guia) || (d.has(j.guia2) && !otherDir.has(j.guia)))
    .sort((a, b) => String(a.nombre).localeCompare(String(b.nombre), "es"))
    .map((j) => ({ id: j.id, nombre: corto(j.nombre), uid: j.uid || "" }));
}
const uidsOf = (dir, ints) => [...new Set([...dir.map((d) => d.uid), ...ints.map((j) => j.uid)].filter(Boolean))];
const same = (a, b) => JSON.stringify((a || []).map((x) => x.id)) === JSON.stringify((b || []).map((x) => x.id));
// Recalcula los integrantes de todas las familias (lo llama el equipo al abrir la página y al guardar la asignación).
export async function sync(jovenes) {
  if (!cloud.enabled || !st().isStaff) return 0;
  const fams = rows || (await cloud.listFamilias()) || [];
  const js = jovenes || (await cloud.listJovenes().catch(() => null)); if (!js) return 0;
  let n = 0;
  for (const f of fams) {
    const dir = f.dirigentes || [];
    const others = new Set(fams.filter((x) => x.id !== f.id).flatMap((x) => (x.dirigentes || []).map((d) => d.uid)));
    const ints = derive(dir.map((d) => d.uid), js, others);
    if (same(ints, f.integrantes) && JSON.stringify(uidsOf(dir, ints)) === JSON.stringify(f.uids || [])) continue;
    await cloud.saveFamilia(f.id, { nombre: f.nombre || "", nombrePor: f.nombrePor || "", dirigentes: dir, integrantes: ints, uids: uidsOf(dir, ints) }).catch(() => {});
    n++;
  }
  if (n) rows = null;
  return n;
}
const mine = (f) => (f.uids || []).includes(cloud.myUid());

export function view() {
  const s = st();
  if (cloud.enabled && !s.ready) return `<header class="page-head"><span class="eyebrow">Comunidad</span><h1>Nuestras <em>familias</em></h1></header>
    <div class="card"><p>Las familias son para quienes tienen cuenta.</p><a class="btn btn-primary" href="#/perfil" style="margin-top:10px">${icon("users")} Ingresar</a></div>`;
  ctx.onAfterRender(paint);
  return `<header class="page-head"><span class="eyebrow">Comunidad · nuestros grupos</span><h1>Nuestras <em>familias</em></h1>
    <p>Cada familia es un grupo pequeño que camina junto, con su dirigente a cargo. El nombre lo eligen sus integrantes.</p></header>
    <div class="row-wrap" style="gap:8px;margin-bottom:14px">
      <a class="chip-link" href="#/pasaporte">🛂 Mi pasaporte ${icon("right")}</a>
      ${s.isGuide ? `<a class="chip-link" href="#/acompanar">🤝 Asistencia ${icon("right")}</a>` : ""}
    </div>
    <div class="fam-grid" id="famGrid"><p class="muted">Cargando las familias…</p></div>`;
}

async function paint() {
  const box = document.getElementById("famGrid"); if (!box) return;
  rows = await cloud.listFamilias();
  if (rows && st().isStaff && (await sync())) rows = await cloud.listFamilias();
  if (rows === null) { box.innerHTML = `<div class="note">No se pudieron cargar las familias. Revisa tu conexión.</div>`; return; }
  const by = Object.fromEntries(rows.map((r) => [r.id, r]));
  const list = IDS.map((id, i) => ({ id, i, ...(by[id] || {}) }));
  // la tuya primero
  list.sort((a, b) => (mine(b) - mine(a)) || a.i - b.i);
  box.innerHTML = list.map(card).join("");
}

function card(f) {
  const c = COLORS[f.i], soft = SOFT[f.i], yo = mine(f);
  const dir = f.dirigentes || [], int = f.integrantes || [];
  return `<article class="fam-card ${yo ? "is-mine" : ""}" style="--fc:${c};--fs:${soft}" id="fam-${f.id}">
    <div class="fam-top"><span class="fam-n">${f.i + 1}</span>${yo ? `<span class="fam-yo">Tu familia</span>` : ""}
      ${st().isStaff ? `<button class="fam-edit" data-action="famEdit" data-id="${f.id}" aria-label="Armar la familia ${f.i + 1}">${icon("edit")}</button>` : ""}</div>
    <h3 class="fam-name">${f.nombre ? esc(f.nombre) : `<span class="muted">Familia ${f.i + 1}</span>`}</h3>
    ${!f.nombre ? `<p class="xs muted">${mine(f) ? "Aún no tiene nombre: ¡pónganle uno entre todos!" : st().isStaff ? "Aún no tiene nombre. Ármala con el lápiz." : "Aún no tiene nombre."}</p>` : ""}
    ${mine(f) ? `<form class="fam-nf" data-id="${f.id}" onsubmit="return false"><input class="input" maxlength="40" placeholder="Nombre de la familia" value="${esc(f.nombre || "")}" aria-label="Nombre de la familia ${f.i + 1}"><button class="btn btn-sm btn-soft" data-action="famName" data-id="${f.id}">Guardar</button></form>` : ""}
    <div class="fam-sec"><span class="fam-k">Dirigente${dir.length === 1 ? "" : "s"} a cargo</span>
      <div class="fam-chips">${dir.length ? dir.map((d) => `<span class="fam-chip dir">⭐ ${esc(corto(d.nombre))}</span>`).join("") : `<span class="xs muted">Por asignar</span>`}</div></div>
    <div class="fam-sec"><span class="fam-k">Integrantes · ${int.length}</span>
      <div class="fam-chips">${int.length ? int.map((j) => `<span class="fam-chip">${esc(j.nombre)}</span>`).join("") : `<span class="xs muted">Por asignar</span>`}</div></div>
  </article>`;
}

// ---- Armar una familia (equipo): se eligen sus dirigentes; los integrantes vienen de la asignación ----
let edJovenes = [];
async function editor(id) {
  const f = (rows || []).find((r) => r.id === id) || { id };
  const i = IDS.indexOf(id);
  const [people, jovenes] = await Promise.all([cloud.listPeople().catch(() => []), cloud.listJovenes().catch(() => [])]);
  edJovenes = jovenes;
  const guias = people.filter((p) => ["admin", "coordinador", "dirigente"].includes(p.role)).sort((a, b) => a.name.localeCompare(b.name));
  const enOtra = {}; (rows || []).forEach((r) => { if (r.id !== id) (r.dirigentes || []).forEach((d) => { enOtra[d.uid] = IDS.indexOf(r.id) + 1; }); });
  const dirSel = new Set((f.dirigentes || []).map((d) => d.uid));
  let dlg = document.getElementById("famDlg");
  if (!dlg) { dlg = document.createElement("dialog"); dlg.id = "famDlg"; dlg.className = "sheet"; document.body.appendChild(dlg); }
  dlg.innerHTML = `<form method="dialog" id="famForm" data-id="${id}">
    <div class="sheet-head"><h2>Familia ${i + 1}</h2><button type="button" class="icon-btn" data-action="famClose" aria-label="Cerrar">${icon("x")}</button></div>
    <div class="sheet-body stack">
      <div class="field"><label>Nombre <span class="muted">(lo pueden poner sus integrantes)</span></label><input class="input" name="nombre" maxlength="40" value="${esc(f.nombre || "")}" placeholder="Familia ${i + 1}"></div>
      <fieldset class="fam-pick"><legend>Dirigente(s) a cargo</legend>
        ${guias.length ? guias.map((g) => `<label><input type="checkbox" name="dir" value="${esc(g.uid)}" data-n="${esc(g.name)}" ${dirSel.has(g.uid) ? "checked" : ""}> ${esc(g.name)}${enOtra[g.uid] ? ` <span class="xs muted">· ya en la familia ${enOtra[g.uid]}</span>` : ""}</label>`).join("") : `<p class="xs muted">No hay cuentas de dirigentes todavía.</p>`}</fieldset>
      <div class="fam-pick" id="famInts" aria-live="polite"></div>
      <p class="xs muted">Los integrantes salen solos de <a href="#/admin/asignar" data-action="famClose">Gestión → Asignar jóvenes</a>: son los jóvenes que tienen a estos dirigentes «a cargo» o «de apoyo». Para mover a alguien de familia, cámbiale el dirigente ahí.</p>
    </div>
    <div class="sheet-foot"><span class="spacer"></span><button type="button" class="btn btn-ghost" data-action="famClose">Cancelar</button><button class="btn btn-primary" type="submit">Guardar</button></div></form>`;
  previewInts();
  dlg.showModal();
}
function selectedDir(form) { return [...form.querySelectorAll("input[name=dir]:checked")].map((x) => ({ uid: x.value, nombre: x.dataset.n })); }
function othersDir(id) { return new Set((rows || []).filter((r) => r.id !== id).flatMap((r) => (r.dirigentes || []).map((d) => d.uid))); }
function previewInts() {
  const form = document.getElementById("famForm"), box = document.getElementById("famInts"); if (!form || !box) return;
  const ints = derive(selectedDir(form).map((d) => d.uid), edJovenes, othersDir(form.dataset.id));
  box.innerHTML = `<strong style="font-size:.9rem">Integrantes · ${ints.length}</strong>
    <div class="fam-chips" style="margin-top:6px">${ints.length ? ints.map((j) => `<span class="fam-chip" style="--fc:#1351a4">${esc(j.nombre)}</span>`).join("") : `<span class="xs muted">${selectedDir(form).length ? "Estos dirigentes aún no tienen jóvenes asignados." : "Elige uno o más dirigentes."}</span>`}</div>`;
}
async function saveEditor(form) {
  const id = form.dataset.id;
  const dirigentes = selectedDir(form);
  const integrantes = derive(dirigentes.map((d) => d.uid), edJovenes, othersDir(id));
  const nombre = String(new FormData(form).get("nombre") || "").trim().slice(0, 40);
  try {
    // un dirigente está en una sola familia: si estaba en otra, sale de ella
    const mine = new Set(dirigentes.map((d) => d.uid));
    for (const r of (rows || []).filter((r) => r.id !== id && (r.dirigentes || []).some((d) => mine.has(d.uid)))) {
      const dir = (r.dirigentes || []).filter((d) => !mine.has(d.uid));
      await cloud.saveFamilia(r.id, { nombre: r.nombre || "", nombrePor: r.nombrePor || "", dirigentes: dir, integrantes: r.integrantes || [], uids: r.uids || [] });
    }
    await cloud.saveFamilia(id, { nombre, nombrePor: "", dirigentes, integrantes, uids: uidsOf(dirigentes, integrantes) });
    document.getElementById("famDlg")?.close();
    rows = await cloud.listFamilias(); await sync(edJovenes);
    toast("Familia guardada 👨‍👩‍👧‍👦", "ok"); paint();
  } catch (e) { console.warn(e); toast("No se pudo guardar. Revisa tu conexión.", ""); }
}

let wired = false;
function registerActions() {
  const A = ctx.actions;
  A.famEdit = (el) => editor(el.dataset.id);
  A.famClose = (el) => { document.getElementById("famDlg")?.close(); if (el && el.tagName === "A") location.hash = el.getAttribute("href"); };
  A.famName = async (el) => {
    const form = el.closest("form"), v = (form.querySelector("input").value || "").trim().slice(0, 40);
    if (!v) return toast("Escribe un nombre", "");
    const f = (rows || []).find((r) => r.id === el.dataset.id);
    try {
      if (f) await cloud.nombrarFamilia(el.dataset.id, v);
      else await cloud.saveFamilia(el.dataset.id, { nombre: v, nombrePor: "", dirigentes: [], integrantes: [], uids: [] });
      toast("¡Nombre guardado! 🎉", "ok"); paint();
    }
    catch { toast("No se pudo guardar el nombre", ""); }
  };
  if (wired) return; wired = true;
  document.addEventListener("submit", (e) => { if (e.target.id === "famForm") { e.preventDefault(); saveEditor(e.target); } });
  document.addEventListener("change", (e) => { if (e.target.name === "dir" && e.target.closest("#famForm")) previewInts(); });
}
