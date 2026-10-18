// Gestión → Cursos de la comunidad: los cursos que importan los administradores y los formadores
// (marca «formador» en Gestión → Personas). Viven en la colección «cursos», aparte del contenido oficial,
// así quien los prepara puede publicarlos sin tocar nada más de la app.

import { esc, icon, toast, slug } from "./util.js";
import * as S from "./store.js";
import * as importar from "./importar-curso.js";

let api = null, list = null, loading = false, failed = "";
const fmt = (ms) => (ms ? new Date(ms).toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" }) : "");

async function load(force) {
  if (loading || (list && !force)) return list;
  loading = true; failed = "";
  const l = await api.cloud.getCursos();
  loading = false;
  if (l === null) { failed = "No se pudieron cargar los cursos. Si es la primera vez, falta publicar las reglas de Firestore que habilitan los cursos de la comunidad."; list = list || []; }
  else { list = l; if (S.setExtraCourses(l)) { /* la app ya los muestra */ } }
  return list;
}

export async function view(sub) {
  const parts = sub.split("/").filter(Boolean); // ["formacion", "importar"|"actualizar", id]
  await load();
  if (parts[1] === "importar") return importar.view(S.PARA);
  if (parts[1] === "actualizar") {
    const c = (list || []).find((x) => x.id === parts[2]);
    if (!c) { location.hash = "#/admin/formacion"; return ""; }
    return importar.view(S.PARA, { update: { id: c.id, title: c.title, para: c.para } });
  }
  const rows = list || [];
  return `<header class="page-head row-wrap" style="align-items:flex-end">
    <div><span class="eyebrow">Gestión · Formación</span><h1>Cursos de la <em>comunidad</em></h1>
    <p>Cursos preparados por el equipo a partir de un documento (Word, PDF o texto). Quedan ocultos hasta que los publiques, y se corrigen subiendo el documento de nuevo.</p></div>
    <span class="spacer"></span>
    <a class="btn btn-primary" href="#/admin/formacion/importar">${icon("ul")} Importar un curso</a>
  </header>
  ${failed ? `<div class="note">${esc(failed)}</div>` : ""}
  ${rows.length ? `<div class="stack" style="--gap:12px">${rows.map((c) => {
    const nU = (c.phases || []).reduce((a, ph) => a + (ph.sessions || []).length, 0);
    const para = S.paraDe(c).map((k) => (S.PARA.find((x) => x[0] === k) || [k, k])[1]);
    return `<article class="card cc-row">
      <div class="cc-main"><h3>${esc(c.title)}</h3>
        <p class="small muted">${(c.phases || []).length} módulos · ${nU} unidades · ${para.length ? "para " + esc(para.join(", ").toLowerCase()) : "para todos"}${c._meta && c._meta.by ? ` · ${esc(c._meta.by)}` : ""}${c._meta && c._meta.updatedAt ? `, ${esc(fmt(c._meta.updatedAt))}` : ""}</p>
        <span class="chip ${c.hidden ? "" : "accent"}">${c.hidden ? "Oculto" : "Publicado"}</span></div>
      <div class="row-wrap" style="gap:6px">
        <button class="btn btn-sm btn-soft" data-action="ccPreview" data-id="${esc(c.id)}">${icon("eye")} Vista previa</button>
        <button class="btn btn-sm ${c.hidden ? "btn-primary" : "btn-ghost"}" data-action="ccToggle" data-id="${esc(c.id)}">${c.hidden ? `${icon("send")} Publicar` : "Ocultar"}</button>
        <a class="btn btn-sm btn-ghost" href="#/admin/formacion/actualizar/${encodeURIComponent(c.id)}">${icon("ul")} Actualizar</a>
        <button class="btn btn-sm btn-ghost" data-action="ccDelete" data-id="${esc(c.id)}">Eliminar</button>
      </div>
      <details class="cc-para"><summary class="small">Dirigido a</summary>
        <div class="row-wrap" style="gap:10px;margin-top:6px">${S.PARA.map(([k, l]) => `<label class="small"><input type="checkbox" data-cc-para="${k}" ${c.para && c.para[k] ? "checked" : ""}> ${esc(l)}</label>`).join("")}
        <button class="btn btn-sm btn-soft" data-action="ccPara" data-id="${esc(c.id)}">Guardar</button></div>
        <p class="xs muted">Sin marcar, es para todos los que tienen cuenta.</p></details></article>`;
  }).join("")}</div>` : `<div class="card" style="text-align:center;padding:28px"><p class="muted">${failed ? "" : "Todavía no hay cursos de la comunidad."}</p>
    <a class="btn btn-primary" style="margin-top:10px" href="#/admin/formacion/importar">${icon("ul")} Importar el primero</a></div>`}
  <p class="xs muted" style="margin-top:14px">Quienes pueden importar y publicar: los administradores y las personas con la marca «Prepara cursos de formación» (Gestión → Personas).</p>`;
}

export function setup(_api) {
  api = _api;
  const A = api.actions;
  const save = async (c, msg) => {
    try { await api.cloud.saveCurso(c); await load(true); toast(msg, "ok"); api.render(); return true; }
    catch (e) { toast("No se pudo guardar: " + (e.code === "permission-denied" ? "falta el permiso (reglas de Firestore o marca de formador)" : e.code || e.message), ""); return false; }
  };
  const find = (id) => (list || []).find((x) => x.id === id);
  importar.registerActions(A, {
    render: () => api.render(), PARA: S.PARA,
    createCourse: async (c, updateId) => {
      if (updateId) {
        const old = find(updateId); if (!old) return false;
        Object.assign(c, { id: old.id, theme: old.theme || "amanecer", hidden: !!old.hidden });
        if (!c.para && old.para) c.para = old.para;
        const ok = await save(c, "Curso actualizado");
        if (ok) location.hash = "#/admin/formacion";
        return ok;
      }
      c.id = "com-" + slug(c.title).slice(0, 40) + "-" + Date.now().toString(36); c.theme = "amanecer"; c.hidden = true;
      const ok = await save(c, "Curso creado (oculto). Revísalo con «Vista previa» y publícalo cuando esté listo.");
      if (ok) location.hash = "#/admin/formacion";
      return ok;
    },
  });
  A.ccPreview = (el) => { S.setActiveCourse(el.dataset.id); location.hash = "#/itinerario"; };
  A.ccToggle = async (el) => {
    const c = find(el.dataset.id); if (!c) return;
    if (c.hidden && !confirm(`¿Publicar «${c.title}»? Lo verán ${S.paraDe(c).length ? "las personas a quienes está dirigido" : "todos los que tienen cuenta"}.`)) return;
    el.disabled = true;
    await save({ ...c, hidden: !c.hidden }, c.hidden ? "Curso publicado" : "Curso oculto");
  };
  A.ccPara = async (el) => {
    const c = find(el.dataset.id); if (!c) return;
    const para = {};
    el.closest(".cc-para").querySelectorAll("[data-cc-para]").forEach((x) => { if (x.checked) para[x.dataset.ccPara] = true; });
    const next = { ...c }; if (Object.keys(para).length) next.para = para; else delete next.para;
    await save(next, "Listo: ya está dirigido a quienes marcaste");
  };
  A.ccDelete = async (el) => {
    const c = find(el.dataset.id); if (!c) return;
    if (!confirm(`¿Eliminar «${c.title}»? Quienes lo estén haciendo dejarán de verlo. No se puede deshacer.`)) return;
    try { await api.cloud.deleteCurso(c.id); await load(true); S.setExtraCourses(list); toast("Curso eliminado", "ok"); api.render(); }
    catch (e) { toast("No se pudo eliminar: " + (e.code || e.message), ""); }
  };
}
