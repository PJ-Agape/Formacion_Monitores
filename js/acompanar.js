// Acompañar: la lista de jóvenes del grupo, la asistencia a cada encuentro, avisos
// discretos para el equipo cuando alguien deja de venir, el pasaporte de cada joven con
// sus sellos, el cuadro de honor del mes y los cumpleaños. Lo usan los guías
// (administradores, coordinadores y dirigentes). Cada joven con cuenta ve su pasaporte.

import { esc, icon, toast, initials } from "./util.js";
import { svg as avatarSvg } from "./avatares.js";

let ctx = null; // { actions, render, onAfterRender, onLeave, cloud }
export function setup(c) { ctx = c; registerActions(); }
const $ = (s, r = document) => r.querySelector(s);
const st = () => ctx.cloud.state();
const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayIso = () => iso(new Date());
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const fdate = (s) => { if (!s) return ""; const [y, m, d] = s.split("-").map(Number); return `${d} ${MESES[m - 1].slice(0, 3)}`; };
const longDate = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" }); };

export const ETAPAS = {
  ingreso: { l: "Ingreso", c: "#8ad2fa" }, madurez: { l: "Madurez", c: "#1351a4" }, aspirante: { l: "Aspirante", c: "#ef591c" }, equipo: { l: "Equipo", c: "#ffba03" },
};
const PORTADAS = ["#1351a4", "#ef591c", "#0b2566", "#3f8f4e", "#7b4fa3", "#c58c3f"];
// Sellos: los automáticos se ganan con la asistencia; los manuales los entrega un guía.
export const SELLOS = [
  { k: "primer", e: "🌱", l: "Primer encuentro", auto: true },
  { k: "a5", e: "⭐", l: "5 encuentros", auto: true },
  { k: "a10", e: "🌟", l: "10 encuentros", auto: true },
  { k: "a20", e: "🏅", l: "20 encuentros", auto: true },
  { k: "racha4", e: "🔥", l: "Racha de 4 seguidos", auto: true },
  { k: "mes", e: "🎯", l: "Mes perfecto", auto: true },
  { k: "anima", e: "🎤", l: "Animó un encuentro" },
  { k: "liturgia", e: "🎶", l: "Animó la misa" },
  { k: "retiro", e: "⛰️", l: "Retiro" },
  { k: "servicio", e: "🤝", l: "Servicio solidario" },
  { k: "maria", e: "🌹", l: "Mes de María" },
  { k: "mision", e: "✝️", l: "Misión" },
  { k: "confirmacion", e: "🕊️", l: "Confirmación" },
  { k: "etapa", e: "🚪", l: "Paso de etapa" },
];
const SELLO = Object.fromEntries(SELLOS.map((s) => [s.k, s]));

// ---------------------------------------------------------------------------
// Datos
// ---------------------------------------------------------------------------
let jovenes = null, sesiones = null;
let repaint = () => {};
function watch() {
  const a = ctx.cloud.watchJovenes((r) => { jovenes = r; repaint(); }, () => { jovenes = jovenes || []; repaint(); });
  const b = ctx.cloud.watchSesiones((r) => { sesiones = r; repaint(); }, () => { sesiones = sesiones || []; repaint(); });
  ctx.onLeave(() => { a(); b(); });
}
const activos = () => (jovenes || []).filter((j) => j.activo !== false).sort((a, b) => String(a.nombre).localeCompare(String(b.nombre), "es"));
const sesAsc = () => (sesiones || []).map((s) => s.id).sort();
const fechasOf = (j) => [...new Set(j.fechas || [])].sort();
// Desde cuándo participa: el día en que se agregó o su primera asistencia registrada (si es anterior).
const desdeOf = (j) => [j.desde, fechasOf(j)[0]].filter(Boolean).sort()[0] || "0000";

// Sellos automáticos calculados a partir de la asistencia: { clave: fecha en que se ganó }
export function autoSellos(j, sessions) {
  const f = fechasOf(j), out = {};
  if (f[0]) out.primer = f[0];
  if (f[4]) out.a5 = f[4];
  if (f[9]) out.a10 = f[9];
  if (f[19]) out.a20 = f[19];
  const set = new Set(f), desde = desdeOf(j);
  let run = 0;
  for (const s of sessions) { if (s < desde) continue; run = set.has(s) ? run + 1 : 0; if (run >= 4 && !out.racha4) out.racha4 = s; }
  const byMonth = {};
  sessions.filter((s) => s >= desde).forEach((s) => (byMonth[s.slice(0, 7)] = byMonth[s.slice(0, 7)] || []).push(s));
  for (const m of Object.keys(byMonth).sort()) {
    const list = byMonth[m];
    if (list.length >= 3 && list.every((s) => set.has(s))) { out.mes = list[list.length - 1]; break; }
  }
  return out;
}
function rachaActual(j, sessions) {
  const set = new Set(fechasOf(j)); let n = 0;
  for (const s of [...sessions].reverse()) { if (s < desdeOf(j)) break; if (set.has(s)) n++; else break; }
  return n;
}
function faltasSeguidas(j, sessions) {
  const set = new Set(fechasOf(j)); let n = 0;
  for (const s of [...sessions].reverse()) { if (s < desdeOf(j)) break; if (set.has(s)) break; n++; }
  return n;
}
const allSellos = (j) => ({ ...(j.auto || {}), ...(j.sellos || {}) });
const shortName = (n) => ctx.cloud.shortName(n);
const av = (j, cls = "") => {
  const s = j.avatar && avatarSvg(j.avatar);
  const bg = (ETAPAS[j.etapa] || {}).c || "#e1edfb", dark = bg === "#1351a4" || bg === "#ef591c";
  return s ? `<span class="avatar av-ill ${cls}">${s}</span>` : `<span class="avatar ${cls}" style="background:${bg};color:${dark ? "#fff6e5" : "#0b2566"}">${esc(initials(j.nombre || "?"))}</span>`;
};

// Cumpleaños para Inicio (solo con autorización de la familia): nombre corto y día/mes.
async function rebuildCumples() {
  const items = (jovenes || []).filter((j) => j.activo !== false && j.publico && /^\d{2}-\d{2}$/.test(j.cumple || "")).map((j) => ({ n: shortName(j.nombre), md: j.cumple }));
  try { await ctx.cloud.saveCumples({ items }); } catch (e) { console.warn("Cumpleaños:", e); }
}

// ---------------------------------------------------------------------------
// Vista principal  (#/acompanar, #/acompanar/jovenes, #/acompanar/honor)
// ---------------------------------------------------------------------------
let tab = "asistencia", fecha = todayIso(), titulo = "Encuentro semanal", etapaF = "", draft = null, draftFor = "", qJ = "";
const gate = () => {
  const s = st();
  if (!s.ready) return `<div class="card wall-join"><span class="tile-ico tile-brand" style="margin:0">${icon("users")}</span><div style="flex:1"><strong>Acompañar es para los guías</strong><p class="muted small">Ingresa con tu cuenta.</p></div>${s.enabled ? `<button class="btn btn-primary btn-sm" data-action="signIn">Ingresar</button>` : ""}</div>`;
  if (!s.isGuide) return `<div class="card" style="text-align:center;padding:30px"><h2 class="display">Esta sección es para los guías</h2><p class="muted" style="margin-top:6px">¿Quieres ver tu pasaporte?</p><a class="btn btn-primary" style="margin-top:12px" href="#/pasaporte">Ver mi pasaporte</a></div>`;
  return "";
};
export function viewMain(t) {
  if (t) tab = t;
  const g = gate();
  if (!g) ctx.onAfterRender(() => { repaint = paintMain; watch(); paintMain(); });
  const TABS = [["asistencia", "Asistencia", "check"], ["jovenes", "Jóvenes", "users"], ["honor", "Cuadro de honor", "award"]];
  return `
  <header class="page-head"><span class="eyebrow">Para los guías</span><h1>Acompañar a <em>cada uno</em></h1>
    <p>Pasa lista, mira quién necesita un llamado y celebra los pasos de cada joven. Lo que se registra aquí lo ve solo el equipo.</p></header>
  ${g || `<nav class="wall-tabs row-wrap" aria-label="Acompañar">${TABS.map(([k, l, ic]) => `<a class="btn btn-sm ${tab === k ? "btn-primary" : "btn-ghost"}" href="#/acompanar/${k}">${icon(ic)} ${l}</a>`).join("")}</nav>
  <div id="acBody"><p class="muted" style="padding:30px;text-align:center">Cargando…</p></div>`}`;
}
function paintMain() {
  const box = $("#acBody"); if (!box) return;
  if (jovenes === null || sesiones === null) return;
  box.innerHTML = tab === "jovenes" ? jovenesHTML() : tab === "honor" ? honorHTML() : asistenciaHTML();
}

// ---------- Asistencia ----------
function asistenciaHTML() {
  const list = activos().filter((j) => !etapaF || j.etapa === etapaF);
  if (draftFor !== fecha) { draft = new Set(activos().filter((j) => fechasOf(j).includes(fecha)).map((j) => j.id)); draftFor = fecha; const s = (sesiones || []).find((x) => x.id === fecha); if (s && s.titulo) titulo = s.titulo; }
  const sessions = sesAsc(), saved = sessions.includes(fecha);
  const alerts = activos().map((j) => ({ j, n: faltasSeguidas(j, sessions) })).filter((x) => x.n >= 3 && !(x.j.contactado && x.j.contactado >= sessions[sessions.length - 1]))
    .sort((a, b) => b.n - a.n);
  const presentes = list.filter((j) => draft.has(j.id)).length;
  return `
  ${alerts.length ? `<section class="card ac-alerts"><h3>${icon("users")} Para acompañar esta semana</h3>
    <p class="muted small">Faltaron a los últimos encuentros. Un mensaje o una llamada puede hacer la diferencia.</p>
    <div class="ac-alert-list">${alerts.map(({ j, n }) => `<div class="ac-alert">${av(j)}<div style="flex:1"><b>${esc(j.nombre)}</b><span class="xs muted">Faltó a los últimos ${n} encuentros${fechasOf(j).length ? ` · vino por última vez el ${fdate(fechasOf(j).slice(-1)[0])}` : ""}</span></div>
      <button class="btn btn-sm btn-soft" data-action="acContacted" data-id="${esc(j.id)}">${icon("check")} Ya lo contacté</button></div>`).join("")}</div></section>` : ""}
  <section class="card ac-take">
    <div class="ac-take-head">
      <div class="field"><label>Fecha</label><input class="input" type="date" id="acFecha" value="${esc(fecha)}" max="${todayIso()}"></div>
      <div class="field" style="flex:2"><label>Encuentro</label><input class="input" id="acTitulo" maxlength="80" value="${esc(titulo)}"></div>
    </div>
    <div class="can-chips" style="margin:6px 0 10px"><button class="chip ${etapaF ? "" : "accent"}" data-action="acEtapa" data-e="">Todas</button>${Object.entries(ETAPAS).map(([k, e]) => `<button class="chip ${etapaF === k ? "accent" : ""}" data-action="acEtapa" data-e="${k}">${e.l}</button>`).join("")}</div>
    ${list.length ? `<div class="ac-roll">${list.map((j) => `<button class="ac-p ${draft.has(j.id) ? "on" : ""}" data-action="acToggle" data-id="${esc(j.id)}" aria-pressed="${draft.has(j.id)}">
        ${av(j)}<span class="ac-p-n">${esc(j.nombre)}<small>${esc((ETAPAS[j.etapa] || {}).l || "")}</small></span><span class="ac-check">${draft.has(j.id) ? "✓" : ""}</span></button>`).join("")}</div>`
      : `<div class="note">Aún no hay jóvenes en la lista. <a href="#/acompanar/jovenes">Agrégalos aquí</a>.</div>`}
    <div class="row-wrap ac-save"><b>${presentes} de ${list.length} presentes</b>${saved ? ` <span class="chip ok">Guardada</span>` : ""}<span class="spacer"></span>
      ${list.length ? `<button class="btn btn-sm btn-ghost" data-action="acAll">Marcar a todos</button><button class="btn btn-primary" data-action="acSave">${icon("check")} Guardar asistencia</button>` : ""}</div>
  </section>
  ${sessions.length ? `<section class="ac-hist"><h3 class="mag-hub-sub">Encuentros registrados</h3><div class="can-chips">${[...sessions].reverse().slice(0, 12).map((s) => {
      const x = (sesiones || []).find((y) => y.id === s) || {};
      return `<button class="chip ${s === fecha ? "accent" : ""}" data-action="acDate" data-f="${s}">${fdate(s)} · ${x.presentes ?? "?"}/${x.total ?? "?"}</button>`; }).join("")}</div>
    ${st().isStaff && saved ? `<button class="btn btn-sm btn-ghost" style="margin-top:8px" data-action="acDelSes">${icon("trash")} Borrar el registro del ${fdate(fecha)}</button>` : ""}</section>` : ""}`;
}
async function saveAttendance() {
  const sessions = [...new Set([...sesAsc(), fecha])].sort();
  const all = activos();
  const writes = [];
  for (const j of all) {
    const f = fechasOf(j), has = f.includes(fecha), want = draft.has(j.id);
    const nf = want === has ? f : want ? [...f, fecha].sort() : f.filter((x) => x !== fecha);
    const auto = autoSellos({ ...j, fechas: nf }, sessions);
    if (nf !== f || JSON.stringify(auto) !== JSON.stringify(j.auto || {})) writes.push(ctx.cloud.patchJoven(j.id, { fechas: nf, auto }));
  }
  const total = all.length, presentes = all.filter((j) => draft.has(j.id)).length;
  await Promise.all(writes);
  await ctx.cloud.saveSesion(fecha, { fecha, titulo: titulo || "Encuentro", presentes, total });
}

// ---------- Jóvenes ----------
function jovenesHTML() {
  const sessions = sesAsc(), last8 = sessions.slice(-8);
  const q = qJ.trim().toLowerCase();
  const me = ctx.cloud.myUid(), hasMine = (jovenes || []).some((j) => j.guia === me || j.guia2 === me);
  const list = (jovenes || []).filter((j) => !q || String(j.nombre).toLowerCase().includes(q)).filter((j) => !soloMios || !hasMine || j.guia === me || j.guia2 === me).sort((a, b) => (a.activo === false) - (b.activo === false) || String(a.nombre).localeCompare(String(b.nombre), "es"));
  const groups = Object.entries(ETAPAS).map(([k, e]) => ({ k, e, list: list.filter((j) => j.etapa === k && j.activo !== false) })).filter((g) => g.list.length);
  const off = list.filter((j) => j.activo === false);
  const row = (j) => {
    const f = new Set(fechasOf(j)), own = last8.filter((s) => s >= desdeOf(j)), pct = own.length ? Math.round((own.filter((s) => f.has(s)).length / own.length) * 100) : null;
    return `<a class="card link ac-j" href="#/acompanar/joven/${encodeURIComponent(j.id)}">${av(j)}
      <span class="can-main"><strong>${esc(j.nombre)}</strong><span class="xs muted">${f.size} encuentro${f.size === 1 ? "" : "s"}${pct != null ? ` · ${pct}% en los últimos ${own.length}` : ""}${j.uid ? " · con cuenta" : ""}${j.guia ? ` · 🤝 ${j.guia === me || j.guia2 === me ? "<b>te lo asignaron</b>" : esc([j.guiaNombre, j.guia2Nombre].filter(Boolean).map((n) => n.split(" ")[0]).join(" y "))}` : ""}</span>
      <span class="ac-mini-sellos">${Object.keys(allSellos(j)).slice(0, 8).map((k) => (SELLO[k] || {}).e || "").join(" ")}</span></span>${icon("right")}</a>`;
  };
  return `<div class="row-wrap" style="margin:6px 0 12px"><input class="input" id="acSearch" placeholder="Buscar por nombre…" value="${esc(qJ)}" style="flex:1;min-width:200px">
      ${hasMine ? `<button class="chip ${soloMios ? "accent" : ""}" data-action="acMios">🤝 Mis jóvenes</button>` : ""}
      <button class="btn btn-gold btn-sm" data-action="acNew">${icon("plus")} Agregar joven</button></div>
    ${groups.map((g) => `<h3 class="mag-hub-sub"><span class="ac-dot" style="background:${g.e.c}"></span>${g.e.l} · ${g.list.length}</h3><div class="ac-jlist">${g.list.map(row).join("")}</div>`).join("") || `<div class="card" style="text-align:center;padding:26px"><p class="muted">Agrega a los jóvenes de tu grupo para empezar a pasar lista.</p></div>`}
    ${off.length ? `<h3 class="mag-hub-sub">En pausa · ${off.length}</h3><div class="ac-jlist">${off.map(row).join("")}</div>` : ""}
    <p class="xs muted" style="margin-top:14px">Los jóvenes no necesitan cuenta para estar en la lista. Si tienen cuenta, un administrador o coordinador la vincula para que vean su pasaporte.</p>`;
}
let people = null, soloMios = false;
async function jovenEditor(j) {
  if (st().isStaff && !people) people = await ctx.cloud.listPeople();
  let d = document.getElementById("acDlg");
  if (!d) { d = document.createElement("dialog"); d.id = "acDlg"; d.className = "sheet"; document.body.appendChild(d); }
  const v = j || { nombre: "", etapa: "ingreso", cumple: "", publico: false, activo: true, uid: "" };
  const [mm, dd] = /^\d{2}-\d{2}$/.test(v.cumple || "") ? v.cumple.split("-") : ["", ""];
  d.innerHTML = `<form method="dialog" id="acForm" data-id="${esc(j ? j.id : "")}">
    <div class="sheet-head"><div style="flex:1"><span class="eyebrow">Acompañar</span><h2>${j ? "Editar datos" : "Agregar joven"}</h2></div>
      <button type="button" class="icon-btn" data-action="acClose" aria-label="Cerrar">${icon("x")}</button></div>
    <div class="sheet-body stack" style="--gap:12px">
      <div class="field"><label>Nombre y apellido</label><input class="input" name="nombre" required maxlength="80" value="${esc(v.nombre)}"></div>
      <div class="ag-form-row">
        <div class="field"><label>Etapa</label><select class="select" name="etapa">${Object.entries(ETAPAS).map(([k, e]) => `<option value="${k}" ${v.etapa === k ? "selected" : ""}>${e.l}</option>`).join("")}</select></div>
        <div class="field"><label>Cumpleaños (opcional)</label><div class="row" style="gap:6px">
          <select class="select" name="dd"><option value="">Día</option>${Array.from({ length: 31 }, (_, i) => pad(i + 1)).map((x) => `<option ${x === dd ? "selected" : ""}>${x}</option>`).join("")}</select>
          <select class="select" name="mm"><option value="">Mes</option>${MESES.map((m, i) => `<option value="${pad(i + 1)}" ${pad(i + 1) === mm ? "selected" : ""}>${m}</option>`).join("")}</select></div></div>
      </div>
      <label class="row" style="gap:8px;align-items:flex-start"><input type="checkbox" name="publico" ${v.publico ? "checked" : ""} style="margin-top:4px"> <span>La familia autorizó mostrar su <b>nombre</b> (nombre e inicial) en el <b>cuadro de honor</b> y su <b>cumpleaños</b> en Inicio.</span></label>
      ${st().isStaff ? `<div class="field"><label>Cuenta en la página (opcional)</label><select class="select" name="uid"><option value="">Sin cuenta vinculada</option>${(people || []).sort((a, b) => String(a.name).localeCompare(String(b.name), "es")).map((u) => `<option value="${esc(u.uid)}" ${v.uid === u.uid ? "selected" : ""}>${esc(u.name)}</option>`).join("")}</select><span class="xs muted">Si tiene cuenta, podrá ver y personalizar su pasaporte.</span></div>` : ""}
      ${j ? `<label class="row" style="gap:8px"><input type="checkbox" name="activo" ${v.activo !== false ? "checked" : ""}> Participa actualmente (desmarca para dejarlo en pausa)</label>` : ""}
      <p class="xs muted">Guarda solo lo necesario para acompañar. Nada de esto se publica sin la autorización de arriba.</p>
    </div>
    <div class="sheet-foot">${j && st().isStaff ? `<button type="button" class="btn btn-danger btn-sm" data-action="acDel" data-id="${esc(j.id)}">${icon("trash")} Quitar de la lista</button>` : ""}<span class="spacer"></span>
      <button type="button" class="btn btn-ghost" data-action="acClose">Cancelar</button><button class="btn btn-primary" type="submit">Guardar</button></div>
  </form>`;
  d.showModal();
}

// ---------- Pasaporte ----------
export function viewJoven(id) {
  const g = gate();
  if (!g) ctx.onAfterRender(() => { repaint = () => paintPass(id); watch(); paintPass(id); });
  return g || `<nav class="crumbs"><a href="#/acompanar/jovenes">Jóvenes</a>${icon("right")}<span id="acCrumb">Pasaporte</span></nav><div id="acPass"><p class="muted" style="padding:30px;text-align:center">Cargando…</p></div>`;
}
function paintPass(id) {
  const box = $("#acPass"); if (!box || jovenes === null || sesiones === null) return;
  const j = jovenes.find((x) => x.id === id);
  if (!j) { box.innerHTML = `<div class="card" style="text-align:center;padding:30px"><p class="muted">No encontramos a esta persona.</p></div>`; return; }
  const c = $("#acCrumb"); if (c) c.textContent = j.nombre;
  box.innerHTML = passportHTML(j, { guide: true, sessions: sesAsc() });
}
function passportHTML(j, { guide = false, own = false, sessions = null } = {}) {
  const got = allSellos(j), f = fechasOf(j);
  const racha = sessions ? rachaActual(j, sessions) : null;
  const color = PORTADAS[+j.portada || 0] || PORTADAS[0];
  return `<article class="pass" style="--pc:${color}">
    <div class="pass-cover">
      <span class="pass-k">Pasaporte Ágape</span>
      <div class="pass-id">${av(j, "pass-av")}<div><h1>${esc(j.nombre)}</h1><span class="pass-etapa">${esc((ETAPAS[j.etapa] || {}).l || "")}</span>
        ${j.lema ? `<p class="pass-lema">«${esc(j.lema)}»</p>` : own ? `<p class="pass-lema muted">Escribe tu lema ✍️</p>` : ""}</div></div>
      <div class="pass-stats"><span><b>${f.length}</b>encuentros</span>${racha != null ? `<span><b>${racha}</b>racha actual</span>` : ""}<span><b>${Object.keys(got).length}</b>sellos</span></div>
      ${own ? `<button class="btn btn-sm btn-glass" data-action="passEdit">${icon("edit")} Personalizar</button>` : ""}
    </div>
    <div class="pass-page">
      <h2>Mis sellos</h2>
      <div class="pass-grid">${SELLOS.map((s) => {
        const d = got[s.k], can = guide && !s.auto;
        return `<${can ? "button" : "div"} class="stamp ${d ? "on" : ""} ${can ? "can" : ""}" ${can ? `data-action="acSello" data-id="${esc(j.id)}" data-k="${s.k}"` : ""} title="${esc(s.l)}${d ? " · " + fdate(d) : ""}">
          <span class="stamp-e">${s.e}</span><span class="stamp-l">${esc(s.l)}</span><span class="stamp-d">${d ? fdate(d) : s.auto ? "con tu asistencia" : can ? "tocar para entregar" : "por ganar"}</span></${can ? "button" : "div"}>`;
      }).join("")}</div>
      ${guide ? `<div class="row-wrap" style="margin-top:14px"><button class="btn btn-sm btn-soft" data-action="acEdit" data-id="${esc(j.id)}">${icon("edit")} Editar datos</button>
        <span class="xs muted">Los sellos con 🎯🔥⭐ se ganan solos con la asistencia; los demás los entrega un guía.</span></div>` : ""}
    </div>
  </article>`;
}

// Pasaporte propio  (#/pasaporte)
let mine = undefined;
export function viewMine() {
  const s = st();
  if (!s.ready) return gate();
  ctx.onAfterRender(async () => {
    mine = await ctx.cloud.myJoven();
    // Lleva su avatar al pasaporte
    if (mine && s.account.avatar && mine.avatar !== s.account.avatar) { try { await ctx.cloud.patchJoven(mine.id, { avatar: s.account.avatar }); mine.avatar = s.account.avatar; } catch {} }
    paintMine();
  });
  return `<header class="page-head"><span class="eyebrow">Mi camino en Ágape</span><h1>Mi <em>pasaporte</em></h1><p>Cada encuentro, servicio y celebración deja un sello. ¡Sigue sumando!</p></header><div id="passMine"><p class="muted" style="padding:30px;text-align:center">Cargando…</p></div>`;
}
function paintMine() {
  const box = $("#passMine"); if (!box) return;
  box.innerHTML = mine ? passportHTML(mine, { own: true })
    : `<div class="card" style="text-align:center;padding:30px"><h2 class="display">Tu pasaporte aún no está listo</h2><p class="muted" style="margin-top:6px">Pide a tu guía que te agregue a la lista del grupo y vincule tu cuenta.</p></div>`;
}
function passEditor() {
  if (!mine) return;
  let d = document.getElementById("passDlg");
  if (!d) { d = document.createElement("dialog"); d.id = "passDlg"; d.className = "sheet"; document.body.appendChild(d); }
  d.innerHTML = `<form method="dialog" id="passForm"><div class="sheet-head"><div style="flex:1"><span class="eyebrow">Mi pasaporte</span><h2>Personalizar</h2></div>
      <button type="button" class="icon-btn" data-action="passClose" aria-label="Cerrar">${icon("x")}</button></div>
    <div class="sheet-body stack" style="--gap:12px">
      <div class="field"><label>Mi lema</label><input class="input" name="lema" maxlength="60" value="${esc(mine.lema || "")}" placeholder="Una frase que te represente"></div>
      <div class="field"><label>Color de la portada</label><div class="can-chips">${PORTADAS.map((c, i) => `<label class="av-sw sala-sw" style="--c:${c}"><input type="radio" name="portada" value="${i}" ${(+mine.portada || 0) === i ? "checked" : ""}></label>`).join("")}</div></div>
      <p class="xs muted">Tu avatar es el mismo de tu cuenta: lo cambias en Mi cuenta.</p>
    </div>
    <div class="sheet-foot"><span class="spacer"></span><button type="button" class="btn btn-ghost" data-action="passClose">Cancelar</button><button class="btn btn-primary" type="submit">Guardar</button></div></form>`;
  d.showModal();
}

// ---------- Cuadro de honor ----------
let honorMes = todayIso().slice(0, 7);
function honorData(mes) {
  const sessions = sesAsc(), inMonth = sessions.filter((s) => s.startsWith(mes));
  return activos().map((j) => {
    const f = new Set(fechasOf(j)), own = inMonth.filter((s) => s >= desdeOf(j));
    const perfect = own.length >= 2 && own.every((s) => f.has(s));
    const nuevos = Object.entries(allSellos(j)).filter(([, d]) => d && d.startsWith(mes)).map(([k]) => k);
    return { j, perfect, nuevos, asist: own.filter((s) => f.has(s)).length, de: own.length };
  }).filter((x) => x.perfect || x.nuevos.length).sort((a, b) => (b.perfect - a.perfect) || b.nuevos.length - a.nuevos.length || String(a.j.nombre).localeCompare(String(b.j.nombre), "es"));
}
function honorHTML() {
  const months = []; const d = new Date(); d.setDate(1);
  for (let i = 0; i < 6; i++) { months.push(iso(d).slice(0, 7)); d.setMonth(d.getMonth() - 1); }
  const data = honorData(honorMes), [y, m] = honorMes.split("-").map(Number);
  return `<div class="row-wrap" style="margin:6px 0 12px"><select class="select" id="acMes" style="width:auto">${months.map((x) => { const [yy, mm] = x.split("-").map(Number); return `<option value="${x}" ${x === honorMes ? "selected" : ""}>${MESES[mm - 1]} ${yy}</option>`; }).join("")}</select>
      <span class="spacer"></span>${st().isStaff ? `<button class="btn btn-gold btn-sm" data-action="acPublish">${icon("send")} Publicar en Inicio</button>` : ""}</div>
    <section class="honor">
      <span class="honor-k">Cuadro de honor</span><h2>${MESES[m - 1]} ${y}</h2>
      ${data.length ? `<div class="honor-list">${data.map((x) => `<div class="honor-i ${x.j.publico ? "" : "priv"}">${av(x.j)}<div style="flex:1"><b>${esc(shortName(x.j.nombre))}</b>
        <span class="honor-m">${x.perfect ? `<span class="chip ok">🎯 Asistencia perfecta</span>` : ""}${x.nuevos.map((k) => `<span class="chip">${(SELLO[k] || {}).e || ""} ${esc((SELLO[k] || {}).l || k)}</span>`).join("")}</span></div>
        ${x.j.publico ? "" : `<span class="xs muted">Sin autorización: no se publica</span>`}</div>`).join("")}</div>`
        : `<p class="muted">Aún no hay logros este mes. Se llenará con la asistencia y los sellos que entreguen.</p>`}
    </section>
    <p class="xs muted" style="margin-top:10px">Aparecen quienes tuvieron asistencia perfecta (al menos 2 encuentros en el mes) o ganaron sellos. Al publicar, solo se muestran quienes tienen autorización de su familia, con nombre e inicial.</p>`;
}

// ---------------------------------------------------------------------------
// Tarjetas de Inicio: cumpleaños del mes y cuadro de honor
// ---------------------------------------------------------------------------
export async function homeCards() {
  const slot = document.getElementById("acHomeSlot"); if (!slot || !ctx.cloud.enabled) return;
  const [cum, hon] = await Promise.all([st().ready ? ctx.cloud.getCumples() : null, ctx.cloud.getHonor()]);
  const now = new Date(), mm = pad(now.getMonth() + 1), dd = pad(now.getDate());
  const items = ((cum && cum.items) || []).filter((x) => x.md.startsWith(mm + "-")).sort((a, b) => a.md.localeCompare(b.md));
  const cur = iso(now).slice(0, 7), prev = (() => { const p = new Date(now); p.setDate(1); p.setMonth(p.getMonth() - 1); return iso(p).slice(0, 7); })();
  const showHon = hon && (hon.mes === cur || hon.mes === prev) && (hon.items || []).length;
  if (!items.length && !showHon) return;
  const s = document.getElementById("acHomeSlot"); if (!s) return;
  s.innerHTML = `<div class="grid grid-2" style="margin-top:16px">
    ${items.length ? `<section class="card home-cumple"><span class="eyebrow">🎂 Cumpleaños de ${MESES[now.getMonth()]}</span>
      <ul>${items.map((x) => { const d = x.md.slice(3), today = d === dd; return `<li class="${today ? "today" : ""}"><b>${+d}</b> ${esc(x.n)}${today ? " · ¡hoy! 🎉" : ""}</li>`; }).join("")}</ul>
      ${items.some((x) => x.md.slice(3) === dd) ? `<a class="btn btn-sm btn-gold" href="#/chat/general">Saludar en el chat</a>` : ""}</section>` : ""}
    ${showHon ? `<section class="card home-honor"><span class="eyebrow">🏆 Cuadro de honor · ${esc(hon.titulo || "")}</span>
      <ul>${hon.items.slice(0, 8).map((x) => `<li><b>${esc(x.n)}</b> <span>${esc((x.m || []).join(" · "))}</span></li>`).join("")}</ul>
      ${hon.items.length > 8 ? `<span class="xs muted">y ${hon.items.length - 8} más</span>` : ""}</section>` : ""}
  </div>`;
}

// ---------------------------------------------------------------------------
function registerActions() {
  const A = ctx.actions;
  A.acMios = () => { soloMios = !soloMios; paintMain(); };
  A.acEtapa = (el) => { etapaF = el.dataset.e; paintMain(); };
  A.acToggle = (el) => { const id = el.dataset.id; if (draft.has(id)) draft.delete(id); else draft.add(id); paintMain(); };
  A.acAll = () => { activos().filter((j) => !etapaF || j.etapa === etapaF).forEach((j) => draft.add(j.id)); paintMain(); };
  A.acDate = (el) => { fecha = el.dataset.f; draftFor = ""; paintMain(); };
  A.acSave = async (el) => {
    el.disabled = true;
    try { await saveAttendance(); toast("Asistencia guardada"); } catch (e) { console.warn(e); toast("No se pudo guardar. Revisa tu conexión.", ""); }
    el.disabled = false;
  };
  A.acDelSes = async () => {
    if (!confirm(`¿Borrar el registro de asistencia del ${longDate(fecha)}?`)) return;
    try {
      const sessions = sesAsc().filter((s) => s !== fecha);
      await Promise.all(activos().filter((j) => fechasOf(j).includes(fecha)).map((j) => { const nf = fechasOf(j).filter((x) => x !== fecha); return ctx.cloud.patchJoven(j.id, { fechas: nf, auto: autoSellos({ ...j, fechas: nf }, sessions) }); }));
      await ctx.cloud.deleteSesion(fecha); draftFor = ""; toast("Registro borrado");
    } catch { toast("No se pudo borrar", ""); }
  };
  A.acContacted = async (el) => { try { await ctx.cloud.patchJoven(el.dataset.id, { contactado: todayIso() }); toast("Gracias por acompañar 💛"); } catch { toast("No se pudo guardar", ""); } };
  A.acNew = () => jovenEditor(null);
  A.acEdit = (el) => jovenEditor((jovenes || []).find((j) => j.id === el.dataset.id));
  A.acClose = () => document.getElementById("acDlg")?.close();
  A.acDel = async (el) => {
    if (!confirm("¿Quitar a esta persona de la lista? Se pierde su asistencia y sus sellos. Si solo dejó de venir, mejor déjala en pausa.")) return;
    try { await ctx.cloud.deleteJoven(el.dataset.id); document.getElementById("acDlg")?.close(); toast("Quitado de la lista"); location.hash = "#/acompanar/jovenes"; setTimeout(rebuildCumples, 800); } catch { toast("No se pudo quitar", ""); }
  };
  A.acSello = async (el) => {
    const j = (jovenes || []).find((x) => x.id === el.dataset.id), k = el.dataset.k; if (!j) return;
    const has = !!(j.sellos || {})[k], s = SELLO[k];
    if (!confirm(has ? `¿Quitar el sello «${s.l}»?` : `¿Entregar el sello «${s.l}» a ${j.nombre}?`)) return;
    const sellos = { ...(j.sellos || {}) }; if (has) delete sellos[k]; else sellos[k] = todayIso();
    try { await ctx.cloud.patchJoven(j.id, { sellos }); toast(has ? "Sello quitado" : `${s.e} ¡Sello entregado!`); } catch { toast("No se pudo guardar", ""); }
  };
  A.acPublish = async () => {
    const [y, m] = honorMes.split("-").map(Number);
    const items = honorData(honorMes).filter((x) => x.j.publico).map((x) => ({ n: shortName(x.j.nombre), m: [...(x.perfect ? ["🎯 Asistencia perfecta"] : []), ...x.nuevos.map((k) => `${(SELLO[k] || {}).e || ""} ${(SELLO[k] || {}).l || k}`)] }));
    if (!items.length) { toast("No hay nadie con autorización para publicar este mes", ""); return; }
    if (!confirm(`¿Publicar en Inicio el cuadro de honor de ${MESES[m - 1]} con ${items.length} persona${items.length > 1 ? "s" : ""}?`)) return;
    try { await ctx.cloud.saveHonor({ mes: honorMes, titulo: `${MESES[m - 1]} ${y}`, items }); toast("🏆 Cuadro de honor publicado en Inicio"); } catch { toast("No se pudo publicar", ""); }
  };
  A.passEdit = () => passEditor();
  A.passClose = () => document.getElementById("passDlg")?.close();
  document.addEventListener("change", (e) => {
    if (e.target.id === "acFecha") { fecha = e.target.value || todayIso(); draftFor = ""; paintMain(); }
    if (e.target.id === "acMes") { honorMes = e.target.value; paintMain(); }
  });
  document.addEventListener("input", (e) => {
    if (e.target.id === "acTitulo") titulo = e.target.value;
    if (e.target.id === "acSearch") { qJ = e.target.value; const pos = e.target.selectionStart; paintMain(); const i = $("#acSearch"); if (i) { i.focus(); i.setSelectionRange(pos, pos); } }
  });
  document.addEventListener("submit", async (e) => {
    if (e.target.id === "acForm") {
      e.preventDefault();
      const f = new FormData(e.target), id = e.target.dataset.id || null, old = id && (jovenes || []).find((x) => x.id === id);
      const dd = String(f.get("dd") || ""), mm = String(f.get("mm") || "");
      const data = { ...(old || { fechas: [], sellos: {}, auto: {}, desde: todayIso(), lema: "", portada: 0, avatar: "" }),
        nombre: String(f.get("nombre") || "").trim(), etapa: String(f.get("etapa") || "ingreso"), cumple: dd && mm ? `${mm}-${dd}` : "",
        publico: f.get("publico") === "on", activo: old ? f.get("activo") === "on" : true, uid: st().isStaff ? String(f.get("uid") || "") : (old ? old.uid || "" : "") };
      delete data.id; delete data.updatedAt; delete data.updatedBy;
      if (!data.nombre) return;
      try { const nid = await ctx.cloud.saveJoven(id, data); document.getElementById("acDlg")?.close(); toast(id ? "Datos guardados" : "Agregado a la lista");
        setTimeout(rebuildCumples, 800); if (!id) location.hash = "#/acompanar/joven/" + encodeURIComponent(nid); }
      catch (err) { console.warn(err); toast("No se pudo guardar. Revisa tu conexión.", ""); }
    }
    if (e.target.id === "passForm") {
      e.preventDefault();
      const f = new FormData(e.target);
      const data = { lema: String(f.get("lema") || "").trim().slice(0, 60), portada: +f.get("portada") || 0 };
      try { await ctx.cloud.patchJoven(mine.id, data); Object.assign(mine, data); document.getElementById("passDlg")?.close(); paintMine(); toast("¡Pasaporte actualizado!"); }
      catch { toast("No se pudo guardar", ""); }
    }
  });
}
