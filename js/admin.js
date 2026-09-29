// Panel de Gestión: edición de itinerarios, evaluaciones, materiales, oraciones
// y guía de comunidad. Todo se edita en un borrador y se publica al final.

import * as S from "./store.js";
import { esc, icon, toast, sha256, download, clone, slug, getPath, setPath, plain } from "./util.js";

const $ = (s, r = document) => r.querySelector(s);
let api;          // { actions, render, onAfterRender }
let undo = null;  // copia del borrador antes de la última eliminación

const THEMES = [["amanecer", "Amanecer · luz y calidez"], ["cenaculo", "Cenáculo · oración"], ["esperanza", "Esperanza · vida"]];

// ---------------------------------------------------------------------------
export async function renderAdmin(sub, _api) {
  api = _api;
  bindActions();
  if (!S.isAdmin()) return loginView();
  const draft = S.ensureDraft();
  const parts = sub.split("/").filter(Boolean);
  const page = parts[0] || "resumen";
  let body = "";
  switch (page) {
    case "resumen": body = summaryView(draft); break;
    case "itinerarios": body = parts[1] != null ? courseView(draft, +parts[1]) : coursesView(draft); break;
    case "materiales": body = cardsView(draft, "materials"); break;
    case "oracion": body = cardsView(draft, "devotional"); break;
    case "comunidad": body = communityView(draft); break;
    case "publicar": body = publishView(draft); break;
    case "ajustes": body = settingsView(); break;
    default: body = summaryView(draft);
  }
  return shell(page, body);
}

function shell(page, body) {
  const dirty = S.draftIsDirty();
  const link = (k, href, label, ic, extra = "") =>
    `<a href="${href}" ${page === k ? 'aria-current="page"' : ""}>${icon(ic)} ${label}${extra}</a>`;
  return `
  <div class="admin-shell">
    <nav class="admin-side" aria-label="Gestión">
      ${link("resumen", "#/admin", "Resumen", "grid")}
      ${link("itinerarios", "#/admin/itinerarios", "Cursos", "route")}
      ${link("materiales", "#/admin/materiales", "Materiales", "book")}
      ${link("oracion", "#/admin/oracion", "Oración", "flame")}
      ${link("comunidad", "#/admin/comunidad", "Comunidad", "users")}
      ${link("publicar", "#/admin/publicar", "Publicar", "send", dirty ? '<span class="count">!</span>' : "")}
      ${link("ajustes", "#/admin/ajustes", "Ajustes", "gear")}
      <div class="side-extra">
        <a href="#" data-action="aPreview">${icon("eye")} Vista previa</a>
        <a href="#" data-action="aLogout">${icon("out")} Salir de Gestión</a>
      </div>
    </nav>
    <div class="stack" style="--gap:18px;min-width:0">
      ${draftBar(dirty)}
      ${body}
    </div>
  </div>`;
}

function draftBar(dirty) {
  if (!dirty && !undo) return "";
  return `<div class="draft-bar">
    ${dirty ? `${icon("edit")} Tienes cambios sin publicar. Los dirigentes aún ven la versión anterior.` : "Cambio aplicado."}
    <span class="spacer"></span>
    ${undo ? `<button class="btn btn-sm btn-ghost" data-action="aUndo">${icon("undo")} Deshacer</button>` : ""}
    ${dirty ? `<button class="btn btn-sm btn-ghost" data-action="aPreview">${icon("eye")} Vista previa</button>
    <a class="btn btn-sm btn-primary" href="#/admin/publicar">Publicar</a>` : ""}
  </div>`;
}

// ---------------------------------------------------------------------------
// Acceso
// ---------------------------------------------------------------------------
function loginView() {
  api.onAfterRender(() => $("#adminPass")?.focus());
  return `<div style="max-width:420px;margin:6vh auto 0">
    <form class="card stack" id="loginForm" style="--gap:14px;padding:28px">
      <div class="tile-ico" style="margin:0 auto">${icon("lock")}</div>
      <div style="text-align:center"><h1 class="display" style="font-size:1.7rem">Gestión de la pastoral</h1>
        <p class="muted small" style="margin-top:6px">Espacio del equipo coordinador para editar cursos, evaluaciones, materiales y oraciones.</p></div>
      <div class="field"><label for="adminPass">Contraseña</label>
        <input class="input big" type="password" id="adminPass" autocomplete="current-password" required></div>
      <button class="btn btn-primary btn-block" type="submit">Entrar</button>
      <a class="xs muted" style="text-align:center" href="#/">Volver al inicio</a>
    </form></div>`;
}
async function doLogin(pass) {
  const h = await sha256(pass);
  let ok = h === S.adminHash();
  const old = S.oldAdminPin();
  if (!ok && old && pass === old) { ok = true; S.setAdminHash(h); }
  if (old) S.clearOldAdminPin();
  if (!ok) { toast("Contraseña incorrecta", ""); return; }
  S.setAdmin(true);
  api.render();
}

// ---------------------------------------------------------------------------
// Resumen
// ---------------------------------------------------------------------------
function summaryView(d) {
  const phases = d.courses.reduce((a, c) => a + c.phases.length, 0);
  const sessions = d.courses.reduce((a, c) => a + c.phases.reduce((b, p) => b + p.sessions.length, 0), 0);
  const questions = d.courses.reduce((a, c) => a + c.phases.reduce((b, p) => b + (p.quiz?.questions?.length || 0), 0), 0);
  const legacy = legacyDiff(d);
  const stat = (n, l) => `<div class="card stat"><b>${n}</b><span class="muted small">${l}</span></div>`;
  return `
  <header class="page-head"><span class="eyebrow">Gestión</span><h1>Resumen</h1>
    <p>Todo lo que edites queda en un borrador en este dispositivo. Cuando esté listo, lo publicas y todos los dirigentes lo verán.</p></header>
  ${legacy ? `<div class="card" style="border-color:var(--gold)">
    <h3>Encontramos contenido editado con la versión anterior</h3>
    <p class="muted small" style="margin-top:6px">Este navegador guarda cambios hechos con el panel antiguo (${legacy.join(", ")}). ¿Quieres traerlos al borrador para publicarlos?</p>
    <div class="row-wrap" style="margin-top:12px"><button class="btn btn-sm btn-primary" data-action="aImportLegacy">Traer al borrador</button>
    <button class="btn btn-sm btn-ghost" data-action="aDropLegacy">Ignorar</button></div></div>` : ""}
  <div class="grid grid-4">
    ${stat(d.courses.length, "cursos")}${stat(phases, "módulos")}${stat(sessions, "unidades")}${stat(questions, "preguntas de evaluación")}
  </div>
  <div class="card">
    <h3>Cómo publicar cambios</h3>
    <ol class="steps muted">
      <li><b>Edita</b> en Cursos, Materiales, Oración o Comunidad. Se guarda solo.</li>
      <li><b>Revisa</b> con «Vista previa»: ves la página tal como la verán los dirigentes.</li>
      <li><b>Publica</b>: descargas <span class="kbd">contenido.json</span> y lo subes a la carpeta <span class="kbd">data</span> del repositorio.</li>
    </ol>
  </div>
  <div class="card" style="background:var(--surface-2)">
    <span class="chip">Próximamente</span>
    <h3 style="margin-top:10px">Usuarios y seguimiento</h3>
    <p class="muted small" style="margin-top:6px">Crear cuentas de dirigentes y ver el avance de todos requiere conectar una base de datos. La app ya está ordenada para sumarlo sin rehacer nada.</p>
  </div>`;
}
function legacyDiff(d) {
  const l = S.legacyContent();
  if (!l) return null;
  const pub = S.publishedContent();
  const out = [];
  if (l.catalog && JSON.stringify(l.catalog) !== JSON.stringify(pub.courses)) out.push("cursos");
  if (l.materials && JSON.stringify(l.materials) !== JSON.stringify(pub.materials)) out.push("materiales");
  if (l.devotional && JSON.stringify(l.devotional) !== JSON.stringify(pub.devotional)) out.push("oraciones");
  if (!out.length) { S.clearLegacy(); return null; }
  return out;
}

// ---------------------------------------------------------------------------
// Itinerarios
// ---------------------------------------------------------------------------
function coursesView(d) {
  return `
  <header class="page-head row-wrap" style="align-items:flex-end">
    <div><span class="eyebrow">Gestión</span><h1>Cursos</h1><p>Cada curso tiene módulos, unidades de estudio y una evaluación por módulo.</p></div>
    <span class="spacer"></span>
    <button class="btn btn-primary" data-action="aNewCourse">${icon("plus")} Nuevo curso</button>
  </header>
  <div class="stack" style="--gap:12px">
    ${d.courses.map((c, i) => {
      const n = c.phases.reduce((a, p) => a + p.sessions.length, 0);
      return `<div class="card row" style="padding:16px 18px">
        <span class="tile-ico" style="margin:0;background:var(--accent-soft);color:var(--accent-text)">${icon("route")}</span>
        <a href="#/admin/itinerarios/${i}" style="flex:1;min-width:0;text-decoration:none;color:inherit">
          <strong style="display:block">${esc(c.title)}</strong>
          <span class="muted small">${c.phases.length} módulos · ${n} unidades · tema ${esc(c.theme)}</span></a>
        <div class="row" style="gap:4px">
          ${iconBtn("up", "aMoveCourse", `data-i="${i}" data-d="-1"`, "Subir", i === 0)}
          ${iconBtn("down", "aMoveCourse", `data-i="${i}" data-d="1"`, "Bajar", i === d.courses.length - 1)}
          ${iconBtn("copy", "aDupCourse", `data-i="${i}"`, "Duplicar")}
          ${d.courses.length > 1 ? iconBtn("trash", "aDelCourse", `data-i="${i}"`, "Eliminar", false, "danger") : ""}
          <a class="btn btn-sm btn-soft" href="#/admin/itinerarios/${i}">Editar</a>
        </div></div>`;
    }).join("")}
  </div>`;
}
function iconBtn(ic, action, attrs, label, disabled = false, cls = "") {
  return `<button class="icon-btn ${cls}" data-action="${action}" ${attrs} title="${label}" aria-label="${label}" ${disabled ? "disabled style='opacity:.3'" : ""}>${icon(ic)}</button>`;
}

function courseView(d, ci) {
  const c = d.courses[ci];
  if (!c) { location.hash = "#/admin/itinerarios"; return ""; }
  return `
  <nav class="crumbs"><a href="#/admin/itinerarios">Cursos</a>${icon("right")}<span>${esc(c.title)}</span></nav>
  <div class="card">
    <div class="row-wrap" style="align-items:flex-start">
      <div style="flex:1;min-width:220px">
        <span class="chip accent">Tema ${esc(c.theme)}</span>
        <h1 class="display" style="font-size:1.9rem;margin-top:8px">${esc(c.title)}</h1>
        <p class="muted small" style="margin-top:6px">${esc(c.description)}</p>
      </div>
      <button class="btn btn-sm btn-soft" data-action="aEditCourse" data-ci="${ci}">${icon("edit")} Editar datos</button>
    </div>
  </div>

  <div class="tree">
    ${c.phases.map((p, pi) => `
    <section class="tree-phase">
      <div class="tree-phase-head">
        <span class="badge">${esc(p.phaseNum)}</span>
        <div class="ttl"><strong>${esc(p.title)}</strong><span class="xs muted">${esc(p.desc)}</span></div>
        <div class="tools">
          ${iconBtn("up", "aMovePhase", `data-ci="${ci}" data-pi="${pi}" data-d="-1"`, "Subir módulo", pi === 0)}
          ${iconBtn("down", "aMovePhase", `data-ci="${ci}" data-pi="${pi}" data-d="1"`, "Bajar módulo", pi === c.phases.length - 1)}
          ${iconBtn("edit", "aEditPhase", `data-ci="${ci}" data-pi="${pi}"`, "Editar módulo")}
          ${c.phases.length > 1 ? iconBtn("trash", "aDelPhase", `data-ci="${ci}" data-pi="${pi}"`, "Eliminar módulo", false, "danger") : ""}
        </div>
      </div>
      <div class="tree-items">
        ${p.sessions.map((s, si) => `
        <div class="tree-item">
          <span class="session-num" style="width:36px;height:36px;font-size:.75rem">${esc(s.id)}</span>
          <div class="t" data-action="aEditSession" data-ci="${ci}" data-pi="${pi}" data-si="${si}">
            <strong>${esc(s.title)}</strong><span>${esc(plain(s.objective).slice(0, 90))}</span></div>
          <div class="tools">
            ${iconBtn("up", "aMoveSession", `data-ci="${ci}" data-pi="${pi}" data-si="${si}" data-d="-1"`, "Subir", si === 0)}
            ${iconBtn("down", "aMoveSession", `data-ci="${ci}" data-pi="${pi}" data-si="${si}" data-d="1"`, "Bajar", si === p.sessions.length - 1)}
            ${iconBtn("copy", "aDupSession", `data-ci="${ci}" data-pi="${pi}" data-si="${si}"`, "Duplicar")}
            ${p.sessions.length > 1 ? iconBtn("trash", "aDelSession", `data-ci="${ci}" data-pi="${pi}" data-si="${si}"`, "Eliminar", false, "danger") : ""}
          </div>
        </div>`).join("")}
      </div>
      <div class="tree-add">
        <button class="btn btn-sm btn-ghost" data-action="aAddSession" data-ci="${ci}" data-pi="${pi}">${icon("plus")} Unidad</button>
        <button class="btn btn-sm btn-soft" data-action="aEditQuiz" data-ci="${ci}" data-pi="${pi}">${icon("check")} Evaluación · ${p.quiz?.questions?.length || 0} pregunta${(p.quiz?.questions?.length || 0) === 1 ? "" : "s"}</button>
      </div>
    </section>`).join("")}
  </div>
  <button class="btn btn-ghost btn-block" data-action="aAddPhase" data-ci="${ci}">${icon("plus")} Agregar módulo</button>`;
}

// Mantiene la numeración coherente: módulo N → unidades N.1, N.2…
function renumber(course) {
  const base = course.phases[0] && Number(course.phases[0].phaseNum) === 1 ? 1 : 0;
  course.phases.forEach((p, i) => {
    p.phaseNum = i + base;
    p.sessions.forEach((s, j) => { s.id = `${p.phaseNum}.${j + 1}`; });
  });
}
const blankSession = () => ({ id: "", title: "Nueva unidad", time: "45 min", objective: "", intro: "", sections: [{ title: "", body: "" }],
  bible: { ref: "", comment: "" }, church: [], questions: [""], activity: "", prayer: "", resources: [] });
// Adapta unidades con el formato anterior (encuentros) al formato de aula virtual.
function normalizeUnit(u) {
  const o = clone(u);
  if (typeof o.bible === "string") o.bible = { ref: "", comment: o.bible };
  o.bible = o.bible || { ref: "", comment: "" };
  o.sections = o.sections || [];
  if (o.dynamic) { o.sections.push({ title: "Clave para comprender a los jóvenes", body: o.dynamic }); delete o.dynamic; }
  ["church", "resources"].forEach((k) => { o[k] = o[k] || []; });
  ["intro", "activity"].forEach((k) => { o[k] = o[k] || ""; });
  return o;
}
const blankQuestion = () => ({ q: "", options: ["", "", ""], correct: 0, feedback: "" });
const blankPhase = (n) => ({ phaseNum: n, title: "Nuevo módulo", desc: "", intro: "", sessions: [blankSession()], quiz: { badge: `Evaluación módulo ${n}`, title: "Discernimiento", questions: [blankQuestion()] } });

// ---------------------------------------------------------------------------
// Materiales y Oración
// ---------------------------------------------------------------------------
const TYPE_LABEL = { text: "Texto", list: "Lista de puntos", crisis: "Semáforo de ayuda", action: "Botón / enlace" };
function cardsView(d, key) {
  const box = d[key];
  const isMat = key === "materials";
  return `
  <header class="page-head row-wrap" style="align-items:flex-end">
    <div><span class="eyebrow">Gestión</span><h1>${isMat ? "Materiales" : "Oración"}</h1>
    <p>${isMat ? "Guías, esquemas y fichas para todas las reuniones." : "Oraciones y métodos de oración para el equipo."}</p></div>
    <span class="spacer"></span>
    <button class="btn btn-ghost" data-action="aEditBox" data-k="${key}">${icon("edit")} Título de la sección</button>
    <button class="btn btn-primary" data-action="aAddCard" data-k="${key}">${icon("plus")} ${isMat ? "Nuevo recurso" : "Nueva oración"}</button>
  </header>
  <div class="card" style="padding:6px">
    ${box.cards.map((c, i) => `
    <div class="tree-item">
      <span class="chip ${c.type === "crisis" ? "danger" : "accent"}" style="min-width:108px;justify-content:center">${TYPE_LABEL[c.type] || "Texto"}</span>
      <div class="t" data-action="aEditCard" data-k="${key}" data-i="${i}"><strong>${esc(c.title)}</strong><span>${esc(c.tag || "")}</span></div>
      <div class="tools">
        ${iconBtn("up", "aMoveCard", `data-k="${key}" data-i="${i}" data-d="-1"`, "Subir", i === 0)}
        ${iconBtn("down", "aMoveCard", `data-k="${key}" data-i="${i}" data-d="1"`, "Bajar", i === box.cards.length - 1)}
        ${box.cards.length > 1 ? iconBtn("trash", "aDelCard", `data-k="${key}" data-i="${i}"`, "Eliminar", false, "danger") : ""}
      </div>
    </div>`).join("")}
  </div>
  <p class="xs muted">Tip: en los textos puedes usar <span class="kbd">&lt;strong&gt;negrita&lt;/strong&gt;</span> para destacar palabras.</p>`;
}

// ---------------------------------------------------------------------------
// Comunidad
// ---------------------------------------------------------------------------
function communityView(d) {
  const a = d.about;
  const list = (key, label, items, titleOf) => `
    <section class="tree-phase">
      <div class="tree-phase-head"><div class="ttl"><strong>${label}</strong></div>
        <div class="tools"><button class="btn btn-sm btn-ghost" data-action="aAddAbout" data-k="${key}">${icon("plus")} Agregar</button></div></div>
      <div class="tree-items">${items.map((x, i) => `
        <div class="tree-item">
          <div class="t" data-action="aEditAbout" data-k="${key}" data-i="${i}"><strong>${esc(titleOf(x))}</strong><span>${esc(plain(x.text || x.responsibility || "").slice(0, 80))}</span></div>
          <div class="tools">
            ${iconBtn("up", "aMoveAbout", `data-k="${key}" data-i="${i}" data-d="-1"`, "Subir", i === 0)}
            ${iconBtn("down", "aMoveAbout", `data-k="${key}" data-i="${i}" data-d="1"`, "Bajar", i === items.length - 1)}
            ${iconBtn("trash", "aDelAbout", `data-k="${key}" data-i="${i}"`, "Eliminar", false, "danger")}
          </div></div>`).join("")}</div>
    </section>`;
  return `
  <header class="page-head"><span class="eyebrow">Gestión</span><h1>Comunidad</h1><p>La guía de servicio pastoral: identidad, métodos, roles, cargos y reuniones.</p></header>
  <div class="card row-wrap"><div style="flex:1;min-width:220px"><span class="label">Introducción</span><p class="muted small" style="margin-top:4px">${esc(a.intro)}</p></div>
    <button class="btn btn-sm btn-soft" data-action="aEditIntro">${icon("edit")} Editar</button></div>
  <div class="tree">
    ${list("identity", "Identidad y propósito", a.identity, (x) => x.title)}
    ${list("methods", "Cómo trabajamos", a.methods, (x) => `${x.icon || ""} ${x.title}`)}
    ${list("roles", "Roles y responsabilidades", d.roles, (x) => x.title)}
    ${list("cargos", "Cargos y duración", a.cargos, (x) => x.title)}
    ${list("meetings", "Reuniones", a.meetings, (x) => `${x.freq} · ${x.title}`)}
  </div>`;
}
const aboutArr = (d, k) => (k === "roles" ? d.roles : d.about[k]);

// ---------------------------------------------------------------------------
// Publicar
// ---------------------------------------------------------------------------
function publishView(d) {
  const dirty = S.draftIsDirty();
  const pub = S.publishedContent();
  const repoUpload = "https://github.com/PJ-Agape/Formacion_Monitores/upload/main/data";
  return `
  <header class="page-head"><span class="eyebrow">Gestión</span><h1>Publicar cambios</h1>
    <p>La página lee su contenido desde <span class="kbd">data/contenido.json</span>. Publicar es reemplazar ese archivo por tu borrador.</p></header>
  <div class="card ${dirty ? "" : ""}">
    <div class="row-wrap"><span class="chip ${dirty ? "warn" : "ok"}">${dirty ? "Borrador con cambios" : "Sin cambios pendientes"}</span>
      <span class="xs muted">Versión publicada: ${esc(pub.version || 1)} · ${esc(pub.updatedAt || "")}</span></div>
    <ol class="steps" style="margin-top:16px">
      <li><button class="btn btn-sm btn-ghost" data-action="aPreview">${icon("eye")} Revisar en vista previa</button></li>
      <li><button class="btn btn-sm btn-primary" data-action="aDownload">${icon("dl")} Descargar contenido.json</button></li>
      <li>Abre <a href="${repoUpload}" target="_blank" rel="noopener">la carpeta data en GitHub</a>, arrastra el archivo y confirma con «Commit changes». En uno o dos minutos todos verán los cambios.</li>
    </ol>
  </div>
  <div class="card">
    <h3>Otras acciones</h3>
    <div class="row-wrap" style="margin-top:12px">
      <label class="btn btn-sm btn-ghost">${icon("ul")} Importar un contenido.json<input type="file" accept="application/json,.json" id="importFile" hidden></label>
      <button class="btn btn-sm btn-danger" data-action="aDiscard" ${dirty ? "" : "disabled"}>${icon("undo")} Descartar borrador</button>
    </div>
    <p class="xs muted" style="margin-top:10px">Importar sirve para retomar un respaldo o seguir editando en otro computador.</p>
  </div>`;
}

// ---------------------------------------------------------------------------
// Ajustes
// ---------------------------------------------------------------------------
function settingsView() {
  return `
  <header class="page-head"><span class="eyebrow">Gestión</span><h1>Ajustes</h1></header>
  <form class="card stack" id="passForm" style="--gap:14px;max-width:480px">
    <h3>Cambiar contraseña</h3>
    <div class="field"><label>Contraseña actual</label><input class="input" type="password" name="cur" required autocomplete="current-password"></div>
    <div class="field"><label>Nueva contraseña</label><input class="input" type="password" name="n1" required minlength="6" autocomplete="new-password"><span class="hint">Mínimo 6 caracteres.</span></div>
    <div class="field"><label>Repetir nueva contraseña</label><input class="input" type="password" name="n2" required minlength="6" autocomplete="new-password"></div>
    <button class="btn btn-primary" type="submit">Guardar contraseña</button>
    <p class="xs muted">La contraseña se guarda en este dispositivo. Hasta conectar una base de datos, el panel evita ediciones accidentales, pero no es una protección fuerte.</p>
  </form>`;
}

// ---------------------------------------------------------------------------
// Editor genérico (diálogo) con formularios descritos por "specs"
// ---------------------------------------------------------------------------
const SPECS = {
  course: () => [["title", "Título del curso", "text"], ["theme", "Tema de color", "select", THEMES], ["description", "Descripción / propósito", "textarea"]],
  phase: () => [["title", "Título del módulo", "text"], ["desc", "Descripción breve", "text", null, "Ej: 4 unidades · Acogida y confianza"],
    ["intro", "Presentación del módulo", "textarea"]],
  session: () => [
    ["title", "Título de la unidad", "text"], ["time", "Tiempo de estudio", "text", null, "Ej: 45 min"],
    ["objective", "Objetivo de aprendizaje", "textarea"], ["intro", "Introducción", "textarea"],
    ["sections", "Contenido de estudio (secciones)", "objlist", [["title", "Título de la sección", "text"], ["body", "Texto", "textarea"]], "Sección", "Separa párrafos con una línea en blanco. Una línea que empieza con «- » se muestra como lista. Usa &lt;strong&gt;…&lt;/strong&gt; para destacar."],
    ["", "Palabra de Dios", "heading"],
    ["bible.ref", "Cita bíblica", "text", null, "Ej: Lucas 24,13-35 · Los discípulos de Emaús"], ["bible.comment", "Comentario", "textarea"],
    ["church", "La Iglesia nos dice", "objlist", [["source", "Documento y número", "text", "Ej: Christus vivit 206"], ["text", "Idea o cita breve", "textarea"], ["url", "Enlace a la fuente", "text", "https://www.vatican.va/…"]], "Referencia"],
    ["questions", "Preguntas para la reflexión personal (cuaderno)", "list", null, "Pregunta"],
    ["activity", "Llévalo a tu grupo (práctica)", "textarea"],
    ["prayer", "Oración", "textarea"],
    ["resources", "Para profundizar (recursos)", "objlist", [["title", "Título", "text"], ["url", "Enlace", "text", "https://…"], ["note", "Nota breve", "text"]], "Recurso"]],
  quiz: () => [["badge", "Etiqueta", "text"], ["title", "Título de la evaluación", "text"], ["questions", "Preguntas", "questions"]],
  card: (o, key) => {
    const types = key === "materials" ? Object.entries(TYPE_LABEL) : [["text", "Texto de oración"], ["list", "Pasos (uno por línea)"]];
    const f = [["tag", "Etiqueta", "text"], ["title", "Título", "text"], ["type", "Tipo de contenido", "select", types]];
    if (o.type === "list" || o.type === "crisis") f.push(["items", o.type === "crisis" ? "Niveles (verde, amarillo, rojo)" : "Puntos", "list", null, "Punto"]);
    else f.push(["text", "Texto", "textarea"]);
    if (o.type === "action") f.push(["btnText", "Texto del botón", "text"], ["url", "Enlace (https://…)", "text", null, "https://drive.google.com/…"]);
    return f;
  },
  box: () => [["title", "Título de la sección", "text"], ["desc", "Descripción", "textarea"]],
  intro: () => [["intro", "Introducción de la guía", "textarea"]],
  identity: () => [["tag", "Etiqueta", "text"], ["title", "Título", "text"], ["text", "Texto", "textarea"]],
  methods: () => [["icon", "Emoji", "text", null, "🏡"], ["tag", "Etiqueta", "text"], ["title", "Título", "text"], ["text", "Texto", "textarea"]],
  cargos: () => [["tag", "Duración / etiqueta", "text"], ["title", "Cargo", "text"], ["text", "Descripción", "textarea"], ["note", "Requisito o nota", "text"]],
  meetings: () => [["freq", "Frecuencia", "text", null, "Mensual"], ["title", "Título", "text"], ["text", "Descripción", "textarea"], ["who", "Participantes", "text"]],
  roles: () => [["title", "Rol", "text"], ["subtitle", "Subtítulo", "text"], ["tag", "Etiqueta", "text"], ["duration", "Duración", "text"], ["badge", "Requisito / distintivo", "text"],
    ["responsibility", "Responsabilidad", "textarea"], ["functions", "Tareas principales", "list", null, "Tarea"]],
};

let E = null; // { title, spec, specArgs, obj, onSave, isNew }
function openEditor({ title, spec, specArg, obj, onSave, onDelete }) {
  E = { title, spec, specArg, obj: clone(obj), onSave, onDelete };
  const d = $("#editDialog");
  d.querySelector("[data-e-title]").textContent = title;
  renderEditor();
  d.showModal();
  autosize(d);
  setTimeout(() => d.querySelector(".sheet-body input, .sheet-body textarea")?.focus(), 50);
}
function renderEditor() {
  const d = $("#editDialog");
  const fields = SPECS[E.spec](E.obj, E.specArg);
  d.querySelector(".sheet-body").innerHTML = `<div class="stack" style="--gap:16px">${fields.map((f) => fieldHTML(f)).join("")}</div>`;
  d.querySelector(".sheet-foot").innerHTML = `
    ${E.onDelete ? `<button class="btn btn-sm btn-danger" data-action="eDelete">${icon("trash")} Eliminar</button>` : ""}
    <span class="spacer"></span>
    <button class="btn btn-ghost" data-action="eCancel">Cancelar</button>
    <button class="btn btn-primary" data-action="eSave">Guardar</button>`;
  autosize(d);
}
function autosize(root) {
  root.querySelectorAll("textarea").forEach((t) => { t.style.height = "auto"; t.style.height = Math.max(t.scrollHeight + 2, 44) + "px"; });
}
function fieldHTML([key, label, type, opts, ph, hint]) {
  const v = key ? getPath(E.obj, key) : null;
  const id = "f_" + key.replace(/\./g, "_");
  if (type === "heading") return `<h3 class="ed-heading">${label}</h3>`;
  if (type === "objlist") {
    const arr = Array.isArray(v) ? v : [];
    return `<div class="stack" style="--gap:10px"><h3 class="ed-heading">${label}</h3>${hint ? `<span class="hint xs muted">${hint}</span>` : ""}
      ${arr.map((item, i) => `<div class="qcard stack" style="--gap:8px">
        <div class="row"><strong class="small">${esc(ph || "Elemento")} ${i + 1}</strong><span class="spacer"></span>${listTools(key, i, arr.length)}</div>
        ${opts.map(([sk, sl, st, sph]) => st === "textarea"
          ? `<div class="field"><label>${sl}</label><textarea class="textarea" rows="${sk === "body" ? 6 : 2}" data-f="${key}.${i}.${sk}">${esc(item[sk] ?? "")}</textarea></div>`
          : `<div class="field"><label>${sl}</label><input class="input" data-f="${key}.${i}.${sk}" value="${esc(item[sk] ?? "")}" placeholder="${esc(sph || "")}"></div>`).join("")}
      </div>`).join("")}
      <button class="btn btn-sm btn-soft" data-action="eAdd" data-l="${key}" data-kind="obj" data-keys="${opts.map((o) => o[0]).join(",")}" style="justify-self:start">${icon("plus")} Agregar ${esc((ph || "elemento").toLowerCase())}</button></div>`;
  }
  if (type === "text") return `<div class="field"><label for="${id}">${label}</label><input class="input" id="${id}" data-f="${key}" value="${esc(v ?? "")}" placeholder="${esc(ph || "")}"></div>`;
  if (type === "textarea") return `<div class="field"><label for="${id}">${label}</label><textarea class="textarea" id="${id}" data-f="${key}" rows="3">${esc(v ?? "")}</textarea></div>`;
  if (type === "select") return `<div class="field"><label for="${id}">${label}</label><select class="select" id="${id}" data-f="${key}" data-rerender="1">
      ${opts.map(([val, l]) => `<option value="${esc(val)}" ${v === val ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></div>`;
  if (type === "list") {
    const arr = Array.isArray(v) ? v : [];
    return `<div class="field"><span class="label">${label}</span><div class="list-editor">
      ${arr.map((x, i) => `<div class="li"><textarea class="textarea" rows="1" data-f="${key}.${i}" placeholder="${esc(ph || "")} ${i + 1}">${esc(x)}</textarea>
        ${listTools(key, i, arr.length)}</div>`).join("")}
      <button class="btn btn-sm btn-ghost" data-action="eAdd" data-l="${key}" style="justify-self:start">${icon("plus")} Agregar</button></div></div>`;
  }
  if (type === "questions") {
    const qs = v || [];
    return `<div class="stack" style="--gap:12px"><span class="label">${label} · marca con el círculo la respuesta adecuada</span>
      ${qs.map((q, qi) => `<div class="qcard stack" style="--gap:10px">
        <div class="row"><strong>Pregunta ${qi + 1}</strong><span class="spacer"></span>${listTools(key, qi, qs.length)}</div>
        <textarea class="textarea" rows="2" data-f="${key}.${qi}.q" placeholder="Escribe la pregunta o situación…">${esc(q.q.replace(/^\s*\d+\.\s*/, ""))}</textarea>
        <div class="stack" style="--gap:8px">
          ${q.options.map((o, oi) => `<div class="opt-editor">
            <input type="radio" name="correct_${qi}" ${q.correct === oi ? "checked" : ""} data-correct="${qi}" value="${oi}" title="Respuesta adecuada" aria-label="Marcar opción ${oi + 1} como adecuada">
            <input class="input" data-f="${key}.${qi}.options.${oi}" value="${esc(o)}" placeholder="Opción ${"ABCDEF"[oi]}">
            ${q.options.length > 2 ? `<button class="icon-btn danger" data-action="eDel" data-l="${key}.${qi}.options" data-i="${oi}" title="Quitar opción" aria-label="Quitar opción">${icon("x")}</button>` : ""}
          </div>`).join("")}
          ${q.options.length < 6 ? `<button class="btn btn-sm btn-ghost" data-action="eAdd" data-l="${key}.${qi}.options" style="justify-self:start">${icon("plus")} Opción</button>` : ""}
        </div>
        <div class="field"><label>Orientación pastoral (se muestra al responder)</label>
          <textarea class="textarea" rows="2" data-f="${key}.${qi}.feedback">${esc(q.feedback)}</textarea></div>
      </div>`).join("")}
      <button class="btn btn-soft" data-action="eAdd" data-l="${key}" data-kind="question">${icon("plus")} Agregar pregunta</button></div>`;
  }
  return "";
}
function listTools(path, i, n) {
  return `<div class="row" style="gap:4px">
    ${iconBtn("up", "eMove", `data-l="${path}" data-i="${i}" data-d="-1"`, "Subir", i === 0)}
    ${iconBtn("down", "eMove", `data-l="${path}" data-i="${i}" data-d="1"`, "Bajar", i === n - 1)}
    ${iconBtn("trash", "eDel", `data-l="${path}" data-i="${i}"`, "Quitar", false, "danger")}</div>`;
}

document.addEventListener("input", (e) => {
  if (!E) return;
  const t = e.target;
  if (t.dataset.f) { setPath(E.obj, t.dataset.f, t.value); if (t.tagName === "TEXTAREA") autosize(t.parentElement); }
});
document.addEventListener("change", (e) => {
  if (!E) return;
  const t = e.target;
  if (t.dataset.correct != null) E.obj.questions[+t.dataset.correct].correct = +t.value;
  if (t.dataset.rerender) { setPath(E.obj, t.dataset.f, t.value); renderEditor(); }
});

// ---------------------------------------------------------------------------
// Acciones
// ---------------------------------------------------------------------------
function commit(mutator, { snapshot = false, msg } = {}) {
  const d = S.ensureDraft();
  undo = snapshot ? clone(d) : null;
  mutator(d);
  S.saveDraft(d);
  if (msg) toast(msg);
  api.render();
}
const move = (arr, i, dir) => { const j = i + dir; if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; };

let bound = false;
function bindActions() {
  if (bound) return; bound = true;
  const A = api.actions;

  document.addEventListener("submit", async (e) => {
    if (e.target.id === "loginForm") { e.preventDefault(); await doLogin($("#adminPass").value); }
    if (e.target.id === "passForm") {
      e.preventDefault();
      const f = new FormData(e.target);
      if ((await sha256(f.get("cur"))) !== S.adminHash()) return toast("La contraseña actual no coincide", "");
      if (f.get("n1") !== f.get("n2")) return toast("Las contraseñas nuevas no coinciden", "");
      S.setAdminHash(await sha256(f.get("n1"))); e.target.reset(); toast("Contraseña actualizada");
    }
  });
  document.addEventListener("change", async (e) => {
    if (e.target.id !== "importFile") return;
    const file = e.target.files[0]; if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const c = data.courses ? data : data.catalog ? { ...S.publishedContent(), courses: data.catalog, materials: data.materials || S.publishedContent().materials, devotional: data.devotional || S.publishedContent().devotional } : null;
      if (!c || !Array.isArray(c.courses)) throw new Error();
      if (!confirm("¿Reemplazar tu borrador con el archivo importado?")) return;
      S.saveDraft(c); toast("Contenido importado al borrador"); api.render();
    } catch { toast("El archivo no tiene un formato válido", ""); }
  });

  A.aLogout = () => { S.setAdmin(false); location.hash = "#/"; };
  A.aPreview = () => { S.ensureDraft(); S.setPreview(true); location.hash = "#/"; };
  A.aUndo = () => { if (!undo) return; S.saveDraft(undo); undo = null; toast("Cambio deshecho"); api.render(); };
  A.aDiscard = () => {
    if (!confirm("¿Descartar todos los cambios sin publicar? Esta acción no se puede deshacer.")) return;
    S.discardDraft(); undo = null; toast("Borrador descartado"); api.render();
  };
  A.aDownload = () => {
    const d = S.ensureDraft();
    const pub = S.publishedContent();
    d.version = (Number(pub.version) || 1) + 1;
    d.updatedAt = new Date().toISOString().slice(0, 10);
    S.saveDraft(d);
    download("contenido.json", JSON.stringify(d, null, 2));
    toast("Descargado. Ahora súbelo a la carpeta data en GitHub.", "ok", 4500);
  };
  A.aImportLegacy = () => commit((d) => {
    const l = S.legacyContent();
    if (Array.isArray(l.catalog)) d.courses = l.catalog;
    if (l.materials?.cards) d.materials = l.materials;
    if (l.devotional?.cards) d.devotional = l.devotional;
    S.clearLegacy();
  }, { msg: "Contenido anterior traído al borrador" });
  A.aDropLegacy = () => { S.clearLegacy(); api.render(); };

  // Itinerarios
  A.aNewCourse = () => openEditor({
    title: "Nuevo curso", spec: "course", obj: { title: "", theme: "amanecer", description: "" },
    onSave: (o) => commit((d) => {
      const c = { id: slug(o.title) + "-" + Date.now().toString(36), title: o.title || "Curso sin título", theme: o.theme, description: o.description, phases: [blankPhase(1)] };
      renumber(c); d.courses.push(c);
      setTimeout(() => (location.hash = `#/admin/itinerarios/${d.courses.length - 1}`));
    }, { msg: "Curso creado" }),
  });
  A.aEditCourse = (el) => {
    const ci = +el.dataset.ci, c = S.ensureDraft().courses[ci];
    openEditor({ title: "Datos del curso", spec: "course", obj: c, onSave: (o) => commit((d) => Object.assign(d.courses[ci], { title: o.title, theme: o.theme, description: o.description })) });
  };
  A.aMoveCourse = (el) => commit((d) => move(d.courses, +el.dataset.i, +el.dataset.d));
  A.aDupCourse = (el) => commit((d) => {
    const c = clone(d.courses[+el.dataset.i]); c.id = slug(c.title) + "-" + Date.now().toString(36); c.title += " (copia)";
    d.courses.splice(+el.dataset.i + 1, 0, c);
  }, { msg: "Curso duplicado" });
  A.aDelCourse = (el) => {
    const c = S.ensureDraft().courses[+el.dataset.i];
    if (confirm(`¿Eliminar el curso "${c.title}" con todos sus módulos?`)) commit((d) => d.courses.splice(+el.dataset.i, 1), { snapshot: true, msg: "Curso eliminado" });
  };

  // Módulos
  A.aAddPhase = (el) => commit((d) => { const c = d.courses[+el.dataset.ci]; c.phases.push(blankPhase(c.phases.length)); renumber(c); }, { msg: "Módulo agregado" });
  A.aEditPhase = (el) => {
    const ci = +el.dataset.ci, pi = +el.dataset.pi, p = S.ensureDraft().courses[ci].phases[pi];
    openEditor({ title: `Módulo ${p.phaseNum}`, spec: "phase", obj: { title: p.title, desc: p.desc, intro: p.intro || "" }, onSave: (o) => commit((d) => Object.assign(d.courses[ci].phases[pi], { title: o.title, desc: o.desc, intro: o.intro })) });
  };
  A.aMovePhase = (el) => commit((d) => { const c = d.courses[+el.dataset.ci]; move(c.phases, +el.dataset.pi, +el.dataset.d); renumber(c); });
  A.aDelPhase = (el) => {
    const p = S.ensureDraft().courses[+el.dataset.ci].phases[+el.dataset.pi];
    if (confirm(`¿Eliminar el módulo "${p.title}" con sus ${p.sessions.length} unidades y su evaluación?`))
      commit((d) => { const c = d.courses[+el.dataset.ci]; c.phases.splice(+el.dataset.pi, 1); renumber(c); }, { snapshot: true, msg: "Módulo eliminado" });
  };

  // Unidades
  const sessionEditor = (ci, pi, si, isNew) => {
    const p = S.ensureDraft().courses[ci].phases[pi];
    const s = isNew ? blankSession() : normalizeUnit(p.sessions[si]);
    openEditor({
      title: isNew ? "Nueva unidad" : `Unidad ${s.id}`, spec: "session", obj: s,
      onSave: (o) => commit((d) => {
        const c = d.courses[ci]; o.questions = (o.questions || []).filter((x) => x.trim());
        o.sections = (o.sections || []).filter((x) => x.title.trim() || x.body.trim());
        o.church = (o.church || []).filter((x) => x.source.trim() || x.text.trim());
        o.resources = (o.resources || []).filter((x) => x.title.trim() && x.url.trim());
        if (isNew) c.phases[pi].sessions.push(o); else c.phases[pi].sessions[si] = o;
        renumber(c);
      }, { msg: isNew ? "Unidad agregada" : "Unidad guardada" }),
      onDelete: !isNew && p.sessions.length > 1 ? () => commit((d) => { const c = d.courses[ci]; c.phases[pi].sessions.splice(si, 1); renumber(c); }, { snapshot: true, msg: "Unidad eliminada" }) : null,
    });
  };
  A.aEditSession = (el) => sessionEditor(+el.dataset.ci, +el.dataset.pi, +el.dataset.si, false);
  A.aAddSession = (el) => sessionEditor(+el.dataset.ci, +el.dataset.pi, -1, true);
  A.aMoveSession = (el) => commit((d) => { const c = d.courses[+el.dataset.ci]; move(c.phases[+el.dataset.pi].sessions, +el.dataset.si, +el.dataset.d); renumber(c); });
  A.aDupSession = (el) => commit((d) => {
    const c = d.courses[+el.dataset.ci], arr = c.phases[+el.dataset.pi].sessions, s = clone(arr[+el.dataset.si]);
    s.title += " (copia)"; arr.splice(+el.dataset.si + 1, 0, s); renumber(c);
  }, { msg: "Unidad duplicada" });
  A.aDelSession = (el) => {
    const s = S.ensureDraft().courses[+el.dataset.ci].phases[+el.dataset.pi].sessions[+el.dataset.si];
    if (confirm(`¿Eliminar la unidad "${s.title}"?`))
      commit((d) => { const c = d.courses[+el.dataset.ci]; c.phases[+el.dataset.pi].sessions.splice(+el.dataset.si, 1); renumber(c); }, { snapshot: true, msg: "Unidad eliminada" });
  };

  // Evaluación
  A.aEditQuiz = (el) => {
    const ci = +el.dataset.ci, pi = +el.dataset.pi, p = S.ensureDraft().courses[ci].phases[pi];
    const quiz = p.quiz || { badge: `Evaluación módulo ${p.phaseNum}`, title: "Discernimiento", questions: [] };
    if (!quiz.questions.length) quiz.questions.push(blankQuestion());
    openEditor({
      title: `Evaluación · Módulo ${p.phaseNum}`, spec: "quiz", obj: quiz,
      onSave: (o) => {
        const bad = o.questions.findIndex((q) => !q.q.trim() || q.options.some((x) => !x.trim()));
        if (bad >= 0) { toast(`Completa la pregunta ${bad + 1} y todas sus opciones`, ""); return false; }
        o.questions.forEach((q, i) => { q.q = `${i + 1}. ${q.q.replace(/^\s*\d+\.\s*/, "").trim()}`; if (q.correct >= q.options.length) q.correct = 0; });
        commit((d) => { d.courses[ci].phases[pi].quiz = o; }, { msg: "Evaluación guardada" });
      },
    });
  };

  // Materiales / Oración
  A.aEditBox = (el) => {
    const k = el.dataset.k, b = S.ensureDraft()[k];
    openEditor({ title: "Encabezado de la sección", spec: "box", obj: { title: b.title, desc: b.desc }, onSave: (o) => commit((d) => Object.assign(d[k], o)) });
  };
  const cardEditor = (k, i, isNew) => {
    const box = S.ensureDraft()[k];
    const c = isNew ? { tag: "", title: "", type: "text", text: "", items: [] } : box.cards[i];
    openEditor({
      title: isNew ? (k === "materials" ? "Nuevo recurso" : "Nueva oración") : c.title, spec: "card", specArg: k, obj: c,
      onSave: (o) => commit((d) => {
        if (o.items) o.items = o.items.filter((x) => x.trim());
        if (isNew) d[k].cards.push(o); else d[k].cards[i] = o;
      }, { msg: "Guardado" }),
      onDelete: !isNew && box.cards.length > 1 ? () => commit((d) => d[k].cards.splice(i, 1), { snapshot: true, msg: "Eliminado" }) : null,
    });
  };
  A.aAddCard = (el) => cardEditor(el.dataset.k, -1, true);
  A.aEditCard = (el) => cardEditor(el.dataset.k, +el.dataset.i, false);
  A.aMoveCard = (el) => commit((d) => move(d[el.dataset.k].cards, +el.dataset.i, +el.dataset.d));
  A.aDelCard = (el) => {
    const c = S.ensureDraft()[el.dataset.k].cards[+el.dataset.i];
    if (confirm(`¿Eliminar "${c.title}"?`)) commit((d) => d[el.dataset.k].cards.splice(+el.dataset.i, 1), { snapshot: true, msg: "Eliminado" });
  };

  // Comunidad
  A.aEditIntro = () => openEditor({ title: "Introducción", spec: "intro", obj: { intro: S.ensureDraft().about.intro }, onSave: (o) => commit((d) => { d.about.intro = o.intro; }) });
  const aboutEditor = (k, i, isNew) => {
    const arr = aboutArr(S.ensureDraft(), k);
    const blank = k === "roles" ? { key: "rol-" + Date.now().toString(36), title: "", subtitle: "", tag: "", duration: "", badge: "", responsibility: "", functions: [""] } : {};
    openEditor({
      title: isNew ? "Agregar" : (arr[i].title || "Editar"), spec: k, obj: isNew ? blank : arr[i],
      onSave: (o) => commit((d) => {
        if (o.functions) o.functions = o.functions.filter((x) => x.trim());
        const a = aboutArr(d, k); if (isNew) a.push(o); else a[i] = o;
      }, { msg: "Guardado" }),
    });
  };
  A.aAddAbout = (el) => aboutEditor(el.dataset.k, -1, true);
  A.aEditAbout = (el) => aboutEditor(el.dataset.k, +el.dataset.i, false);
  A.aMoveAbout = (el) => commit((d) => move(aboutArr(d, el.dataset.k), +el.dataset.i, +el.dataset.d));
  A.aDelAbout = (el) => {
    const x = aboutArr(S.ensureDraft(), el.dataset.k)[+el.dataset.i];
    if (confirm(`¿Eliminar "${x.title}"?`)) commit((d) => aboutArr(d, el.dataset.k).splice(+el.dataset.i, 1), { snapshot: true, msg: "Eliminado" });
  };

  // Diálogo del editor
  A.eCancel = () => { $("#editDialog").close(); };
  A.eSave = () => {
    if (!E) return;
    const r = E.onSave(E.obj);
    if (r === false) return;
    $("#editDialog").close();
  };
  A.eDelete = () => {
    if (!E?.onDelete) return;
    if (!confirm("¿Eliminar este elemento?")) return;
    const f = E.onDelete; $("#editDialog").close(); f();
  };
  A.eAdd = (el) => {
    const arr = getPath(E.obj, el.dataset.l) || (setPath(E.obj, el.dataset.l, []), getPath(E.obj, el.dataset.l));
    arr.push(el.dataset.kind === "question" ? blankQuestion()
      : el.dataset.kind === "obj" ? Object.fromEntries(el.dataset.keys.split(",").map((k) => [k, ""])) : "");
    renderEditor();
    const n = getPath(E.obj, el.dataset.l).length - 1;
    const sel = el.dataset.kind === "question" ? `[data-f="${el.dataset.l}.${n}.q"]`
      : el.dataset.kind === "obj" ? `[data-f^="${el.dataset.l}.${n}."]` : `[data-f="${el.dataset.l}.${n}"]`;
    const f = $("#editDialog .sheet-body").querySelector(sel);
    f?.focus(); f?.scrollIntoView({ block: "center" });
  };
  A.eDel = (el) => {
    const arr = getPath(E.obj, el.dataset.l), i = +el.dataset.i;
    arr.splice(i, 1);
    // Ajustar la respuesta correcta al quitar una opción
    const m = el.dataset.l.match(/^questions\.(\d+)\.options$/);
    if (m) { const q = E.obj.questions[+m[1]]; if (q.correct === i) q.correct = 0; else if (q.correct > i) q.correct--; }
    renderEditor();
  };
  A.eMove = (el) => { move(getPath(E.obj, el.dataset.l), +el.dataset.i, +el.dataset.d); renderEditor(); };

  $("#editDialog").addEventListener("close", () => { E = null; });
  $("#editDialog").addEventListener("cancel", (e) => { if (E && !confirm("¿Cerrar sin guardar?")) e.preventDefault(); });
}
