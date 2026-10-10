// Nuestras familias (Comunidad): los 10 grupos pequeños de la pastoral.
// Cada tarjeta: el nombre que eligen sus integrantes, el o los dirigentes a cargo y quiénes la forman.
// El equipo (administradores y coordinadores) arma cada familia; integrantes y dirigentes le ponen nombre.
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

// ---- Armar una familia (equipo) ----
async function editor(id) {
  const f = (rows || []).find((r) => r.id === id) || { id };
  const i = IDS.indexOf(id);
  const [people, jovenes] = await Promise.all([cloud.listPeople().catch(() => []), cloud.listJovenes().catch(() => [])]);
  const guias = people.filter((p) => ["admin", "coordinador", "dirigente"].includes(p.role)).sort((a, b) => a.name.localeCompare(b.name));
  const otros = {}; (rows || []).forEach((r) => { if (r.id !== id) (r.integrantes || []).forEach((j) => { otros[j.id] = IDS.indexOf(r.id) + 1; }); });
  const dirSel = new Set((f.dirigentes || []).map((d) => d.uid)), intSel = new Set((f.integrantes || []).map((j) => j.id));
  const js = jovenes.filter((j) => j.etapa !== "equipo").sort((a, b) => String(a.nombre).localeCompare(String(b.nombre)));
  let dlg = document.getElementById("famDlg");
  if (!dlg) { dlg = document.createElement("dialog"); dlg.id = "famDlg"; dlg.className = "sheet"; document.body.appendChild(dlg); }
  dlg.innerHTML = `<form method="dialog" id="famForm" data-id="${id}">
    <div class="sheet-head"><h2>Familia ${i + 1}</h2><button type="button" class="icon-btn" data-action="famClose" aria-label="Cerrar">${icon("x")}</button></div>
    <div class="sheet-body stack">
      <div class="field"><label>Nombre <span class="muted">(lo pueden poner sus integrantes)</span></label><input class="input" name="nombre" maxlength="40" value="${esc(f.nombre || "")}" placeholder="Familia ${i + 1}"></div>
      <fieldset class="fam-pick"><legend>Dirigente(s) a cargo</legend>
        ${guias.length ? guias.map((g) => `<label><input type="checkbox" name="dir" value="${esc(g.uid)}" data-n="${esc(g.name)}" ${dirSel.has(g.uid) ? "checked" : ""}> ${esc(g.name)}</label>`).join("") : `<p class="xs muted">No hay cuentas de dirigentes todavía.</p>`}</fieldset>
      <fieldset class="fam-pick"><legend>Integrantes</legend>
        ${js.length ? js.map((j) => `<label><input type="checkbox" name="int" value="${esc(j.id)}" data-n="${esc(j.nombre)}" data-uid="${esc(j.uid || "")}" ${intSel.has(j.id) ? "checked" : ""}> ${esc(j.nombre)}${otros[j.id] ? ` <span class="xs muted">· en la familia ${otros[j.id]}</span>` : ""}</label>`).join("")
          : `<p class="xs muted">Primero agrega a los jóvenes en Asistencia → Jóvenes.</p>`}</fieldset>
      <p class="xs muted">De los jóvenes solo se muestra el nombre y la inicial del apellido. Si alguien está en otra familia, al guardarlo aquí se cambia de familia.</p>
    </div>
    <div class="sheet-foot"><span class="spacer"></span><button type="button" class="btn btn-ghost" data-action="famClose">Cancelar</button><button class="btn btn-primary" type="submit">Guardar</button></div></form>`;
  dlg.showModal();
}

async function saveEditor(form) {
  const id = form.dataset.id, fd = new FormData(form);
  const pick = (name) => [...form.querySelectorAll(`input[name=${name}]:checked`)];
  const dirigentes = pick("dir").map((x) => ({ uid: x.value, nombre: x.dataset.n }));
  const integrantes = pick("int").map((x) => ({ id: x.value, nombre: corto(x.dataset.n), uid: x.dataset.uid || "" }));
  const nombre = String(fd.get("nombre") || "").trim().slice(0, 40);
  const uids = [...new Set([...dirigentes.map((d) => d.uid), ...integrantes.map((j) => j.uid)].filter(Boolean))];
  try {
    // quien pasa a esta familia sale de la anterior
    const moved = new Set(integrantes.map((j) => j.id));
    const others = (rows || []).filter((r) => r.id !== id && (r.integrantes || []).some((j) => moved.has(j.id)));
    for (const r of others) {
      const ints = (r.integrantes || []).filter((j) => !moved.has(j.id));
      const u = [...new Set([...(r.dirigentes || []).map((d) => d.uid), ...ints.map((j) => j.uid)].filter(Boolean))];
      await cloud.saveFamilia(r.id, { nombre: r.nombre || "", nombrePor: r.nombrePor || "", dirigentes: r.dirigentes || [], integrantes: ints, uids: u });
    }
    await cloud.saveFamilia(id, { nombre, nombrePor: "", dirigentes, integrantes, uids });
    document.getElementById("famDlg")?.close();
    toast("Familia guardada 👨‍👩‍👧‍👦", "ok"); paint();
  } catch (e) { console.warn(e); toast("No se pudo guardar. Revisa tu conexión.", ""); }
}

let wired = false;
function registerActions() {
  const A = ctx.actions;
  A.famEdit = (el) => editor(el.dataset.id);
  A.famClose = () => document.getElementById("famDlg")?.close();
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
}
