// Agenda oficial de la Pastoral Juvenil Ágape: calendario tipo planner con los
// encuentros y actividades del grupo, más las últimas noticias del muro.
// La ve cualquiera; la editan los administradores. Los encuentros de Camino Ágape
// aparecen solos a partir del programa del año.

import { esc, icon, toast } from "./util.js";
import { illus, SCENE_KEYS } from "./ilustraciones.js";

let ctx = null; // { actions, render, onAfterRender, onLeave, cloud }
export function setup(c) { ctx = c; registerActions(); }
const $ = (s, r = document) => r.querySelector(s);

export const TYPES = {
  encuentro: { label: "Encuentro", color: "#8ad2fa" },
  actividad: { label: "Actividad", color: "#ef591c" },
  liturgia: { label: "Liturgia", color: "#ffba03" },
  equipo: { label: "Equipo", color: "#1351a4" },
  otro: { label: "Otro", color: "#9aa7c2" },
};
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const DIAS = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];
const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const todayIso = () => iso(new Date());
const longDate = (s) => parse(s).toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" });

let events = null, camino = [], showCamino = true, month = null, selDay = null, openId = null, news = [];

// Encuentros de Camino Ágape a partir del programa (se muestran el domingo de cada semana).
async function loadCamino() {
  if (camino.length) return;
  try {
    const d = await fetch("data/encuentros.json", { cache: "no-cache" }).then((r) => r.json());
    camino = d.encuentros.map((e) => {
      const m = String(e.fecha).match(/(\d+) de (\w+) de (\d{4})/);
      if (!m) return null;
      return {
        id: "camino-" + e.n, camino: true, type: "encuentro",
        date: `${m[3]}-${pad(MESES.indexOf(m[2]) + 1)}-${pad(+m[1])}`,
        title: `Camino Ágape · Encuentro ${e.n}: ${e.tema}`,
        desc: `${e.domingo}. Evangelio: ${e.evangelio.ref}. El encuentro se realiza durante esta semana; el equipo confirma día y hora.`,
        audience: "Todas las etapas",
      };
    }).filter(Boolean);
  } catch { camino = []; }
}
function all() {
  const own = (events || []).filter((e) => e.date);
  return [...own, ...(showCamino ? camino : [])].sort((a, b) => (a.date + (a.start || "")).localeCompare(b.date + (b.start || "")));
}
const byDay = () => all().reduce((m, e) => ((m[e.date] = m[e.date] || []).push(e), m), {});

// ---------------------------------------------------------------------------
export function viewAgenda(day) {
  const now = new Date();
  if (day) { const d = parse(day); month = new Date(d.getFullYear(), d.getMonth(), 1); selDay = day; }
  if (!month) month = new Date(now.getFullYear(), now.getMonth(), 1);
  ctx.onAfterRender(async () => {
    await loadCamino();
    const stop = ctx.cloud.watchAgenda((rows) => { events = rows; paint(); }, () => { events = events || []; paint(); });
    ctx.onLeave(stop);
    ctx.cloud.latestWall && ctx.cloud.latestWall().then((rows) => {
      news = rows.filter((p) => !p.hidden && p.type === "anuncio").sort((a, b) => (b.pinned === true) - (a.pinned === true) || (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)).slice(0, 3);
      paintNews();
    });
    paint();
  });
  const admin = ctx.cloud.state().isStaff;
  return `
  <header class="page-head"><span class="eyebrow">Ventana oficial del grupo</span><h1>Agenda <em>Ágape</em></h1>
    <p>Encuentros, celebraciones y actividades de la pastoral, siempre al día. Lo que está aquí es lo oficial.</p></header>
  <div class="row-wrap" style="margin:14px 0 4px">
    ${admin ? `<button class="btn btn-primary btn-sm" data-action="agNew">${icon("plus")} Nuevo evento</button>` : ""}
    <label class="chip ag-toggle"><input type="checkbox" id="agCamino" ${showCamino ? "checked" : ""}> Mostrar encuentros Camino Ágape</label>
  </div>
  <div class="ag-layout">
    <section class="card ag-cal" aria-label="Calendario">
      <div class="ag-cal-head">
        <button class="icon-btn" data-action="agMonth" data-d="-1" aria-label="Mes anterior">${icon("left")}</button>
        <h2 id="agMonthName"></h2>
        <button class="icon-btn" data-action="agMonth" data-d="1" aria-label="Mes siguiente">${icon("right")}</button>
        <button class="btn btn-sm btn-ghost" data-action="agToday">Hoy</button>
      </div>
      <div class="ag-grid" id="agGrid"></div>
      <div class="ag-legend">${Object.entries(TYPES).map(([k, t]) => `<span><i style="background:${t.color}"></i>${t.label}</span>`).join("")}</div>
    </section>
    <aside class="ag-side">
      <section class="card ag-list-card"><h3 id="agListTitle">Próximas fechas</h3><div id="agList" class="ag-list"><p class="muted small">Cargando…</p></div></section>
      <section class="card ag-news"><h3>${icon("sparkle")} Noticias</h3><div id="agNews"><p class="muted small">Cargando…</p></div>
        <a class="btn btn-sm btn-ghost" href="#/muro" style="margin-top:10px">Ver el muro</a></section>
    </aside>
  </div>`;
}

function paint() {
  const grid = $("#agGrid");
  if (!grid) return;
  $("#agMonthName").textContent = `${MESES[month.getMonth()]} ${month.getFullYear()}`;
  const map = byDay();
  const first = new Date(month); const offset = (first.getDay() + 6) % 7;
  const start = new Date(first); start.setDate(1 - offset);
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    const key = iso(d), evs = map[key] || [];
    const out = d.getMonth() !== month.getMonth();
    if (i >= 35 && out && cells.length >= 35) break;
    cells.push(`<button class="ag-day${out ? " out" : ""}${key === todayIso() ? " today" : ""}${key === selDay ? " sel" : ""}" data-action="agDay" data-day="${key}" aria-label="${esc(longDate(key))}${evs.length ? `, ${evs.length} evento${evs.length > 1 ? "s" : ""}` : ""}">
      <span class="ag-n">${d.getDate()}</span>
      <span class="ag-dots">${evs.slice(0, 3).map((e) => `<i style="background:${(TYPES[e.type] || TYPES.otro).color}" title="${esc(e.title)}"></i>`).join("")}${evs.length > 3 ? `<b>+${evs.length - 3}</b>` : ""}</span>
      <span class="ag-titles">${evs.slice(0, 2).map((e) => `<span style="--c:${(TYPES[e.type] || TYPES.otro).color}">${esc(e.title.replace(/^Camino Ágape · /, ""))}</span>`).join("")}</span>
    </button>`);
  }
  grid.innerHTML = DIAS.map((d) => `<span class="ag-dow">${d}</span>`).join("") + cells.join("");
  paintList();
}
function paintList() {
  const box = $("#agList"); if (!box) return;
  let list, title;
  if (selDay) { list = all().filter((e) => e.date === selDay); title = longDate(selDay); }
  else { const t = todayIso(); list = all().filter((e) => e.date >= t).slice(0, 8); title = "Próximas fechas"; }
  $("#agListTitle").innerHTML = `${esc(title)}${selDay ? ` <button class="btn btn-sm btn-ghost" data-action="agDay" data-day="">Ver próximas</button>` : ""}`;
  if (!list.length) { box.innerHTML = `<div class="ag-empty">${illus("descanso")}<p class="muted small">${selDay ? "Nada agendado este día." : "No hay fechas próximas agendadas."}</p></div>`; return; }
  const admin = ctx.cloud.state().isStaff;
  box.innerHTML = list.map((e) => {
    const t = TYPES[e.type] || TYPES.otro, d = parse(e.date), open = openId === e.id;
    return `<article class="ag-ev${open ? " open" : ""}" style="--c:${t.color}">
      <button class="ag-ev-head" data-action="agOpen" data-id="${esc(e.id)}" aria-expanded="${open}">
        <span class="ag-date"><b>${d.getDate()}</b><small>${MESES[d.getMonth()].slice(0, 3)}</small></span>
        <span class="ag-ev-main"><span class="ag-type">${t.label}${e.camino ? " · Camino" : ""}${e.feat ? ` · <span class="ag-feat">${icon("sparkle")} En Inicio</span>` : ""}</span><strong>${esc(e.title)}</strong>
          <span class="muted small">${[e.start ? `${esc(e.start)}${e.end ? `–${esc(e.end)}` : ""}` : "", esc(e.place || e.audience || "")].filter(Boolean).join(" · ")}</span></span>
      </button>
      ${open ? `<div class="ag-ev-body">
        ${e.desc ? `<p>${esc(e.desc)}</p>` : ""}
        ${e.audience && !e.camino ? `<p class="small"><b>Para:</b> ${esc(e.audience)}</p>` : ""}
        ${e.place ? `<p class="small"><b>Lugar:</b> ${esc(e.place)}</p>` : ""}
        <div class="row-wrap" style="margin-top:8px">
          <button class="btn btn-sm btn-ghost" data-action="agIcs" data-id="${esc(e.id)}">${icon("dl")} Agregar a mi calendario</button>
          ${admin && !e.camino ? `<button class="btn btn-sm btn-soft" data-action="agEdit" data-id="${esc(e.id)}">${icon("edit")} Editar</button>
            <button class="btn btn-sm btn-danger" data-action="agDel" data-id="${esc(e.id)}">${icon("trash")} Borrar</button>` : ""}
        </div></div>` : ""}
    </article>`;
  }).join("");
}
function paintNews() {
  const box = $("#agNews"); if (!box) return;
  box.innerHTML = news.length ? news.map((p) => `<a class="ag-news-item" href="#/muro"><strong>${esc(p.title)}</strong>${p.body ? `<span class="muted small">${esc(p.body.slice(0, 110))}${p.body.length > 110 ? "…" : ""}</span>` : ""}</a>`).join("")
    : `<p class="muted small">Sin anuncios por ahora.</p>`;
}

// ---------------------------------------------------------------------------
// Formulario (solo administradores)
// ---------------------------------------------------------------------------
function openForm(ev) {
  const e = ev || { date: selDay || todayIso(), type: "actividad" };
  let dlg = document.getElementById("agDialog");
  if (!dlg) { dlg = document.createElement("dialog"); dlg.id = "agDialog"; dlg.className = "sheet"; document.body.appendChild(dlg); }
  dlg.innerHTML = `<form method="dialog" id="agForm" data-id="${esc(ev ? ev.id : "")}">
    <div class="sheet-head"><div style="flex:1"><span class="eyebrow">Agenda</span><h2>${ev ? "Editar evento" : "Nuevo evento"}</h2></div>
      <button type="button" class="icon-btn" data-action="agClose" aria-label="Cerrar">${icon("x")}</button></div>
    <div class="sheet-body stack" style="--gap:12px">
      <div class="field"><label>Título</label><input class="input" name="title" required maxlength="120" value="${esc(e.title || "")}" placeholder="Ej: Encuentro semanal, Misa juvenil, Retiro"></div>
      <div class="ag-form-row">
        <div class="field"><label>Fecha</label><input class="input" type="date" name="date" required value="${esc(e.date)}"></div>
        <div class="field"><label>Desde</label><input class="input" type="time" name="start" value="${esc(e.start || "")}"></div>
        <div class="field"><label>Hasta</label><input class="input" type="time" name="end" value="${esc(e.end || "")}"></div>
      </div>
      <div class="ag-form-row">
        <div class="field"><label>Tipo</label><select class="select" name="type">${Object.entries(TYPES).map(([k, t]) => `<option value="${k}" ${e.type === k ? "selected" : ""}>${t.label}</option>`).join("")}</select></div>
        <div class="field"><label>Para quiénes</label><input class="input" name="audience" maxlength="80" value="${esc(e.audience || "")}" placeholder="Todos, Dirigentes, Aspirantes…"></div>
      </div>
      <div class="field"><label>Lugar</label><input class="input" name="place" maxlength="120" value="${esc(e.place || "")}" placeholder="Ej: Salón parroquial"></div>
      <div class="field"><label>Detalle</label><textarea class="textarea" name="desc" maxlength="1500" placeholder="Qué traer, a qué hora termina, a quién consultar…">${esc(e.desc || "")}</textarea></div>
      <fieldset class="p-dates ag-feat-box">
        <label class="row" style="gap:8px;font-weight:800"><input type="checkbox" name="feat" id="agFeat" ${e.feat ? "checked" : ""}> ${icon("sparkle")} Destacar en Inicio</label>
        <span class="xs muted">Aparece como diapositiva en el carrusel de bienvenida entre las fechas que elijas.</span>
        <div class="stack" id="agFeatOpts" style="--gap:10px;margin-top:10px" ${e.feat ? "" : "hidden"}>
          <div class="ag-form-row">
            <div class="field"><label>Mostrar desde</label><input class="input" type="date" name="featFrom" value="${esc(e.featFrom || todayIso())}"></div>
            <div class="field"><label>Mostrar hasta (incluido)</label><input class="input" type="date" name="featTo" value="${esc(e.featTo || "")}"><span class="xs muted">En blanco: hasta el día del evento.</span></div>
          </div>
          <div class="ag-form-row">
            <div class="field"><label>Frase manuscrita</label><input class="input" name="featHand" maxlength="40" value="${esc(e.featHand || "")}" placeholder="¡no te lo pierdas!"></div>
            <div class="field"><label>Ilustración</label><select class="select" name="featIllus"><option value="">Automática según el tipo</option>${SCENE_KEYS.map((k) => `<option value="${k}" ${e.featIllus === k ? "selected" : ""}>${k.charAt(0).toUpperCase() + k.slice(1)}</option>`).join("")}</select></div>
          </div>
        </div>
      </fieldset>
    </div>
    <div class="sheet-foot"><span class="spacer"></span><button type="button" class="btn btn-ghost" data-action="agClose">Cancelar</button>
      <button class="btn btn-primary" type="submit">Guardar</button></div>
  </form>`;
  dlg.showModal();
}

function ics(e) {
  const d = e.date.replace(/-/g, "");
  const t = (s) => s.replace(":", "") + "00";
  const esc2 = (s) => String(s || "").replace(/[\\,;]/g, (m) => "\\" + m).replace(/\n/g, "\\n");
  const next = new Date(parse(e.date)); next.setDate(next.getDate() + 1);
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Pastoral Juvenil Agape//Agenda//ES", "BEGIN:VEVENT",
    `UID:${e.id}@pj-agape`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
    e.start ? `DTSTART;TZID=America/Santiago:${d}T${t(e.start)}` : `DTSTART;VALUE=DATE:${d}`,
    e.start ? `DTEND;TZID=America/Santiago:${d}T${t(e.end || e.start)}` : `DTEND;VALUE=DATE:${iso(next).replace(/-/g, "")}`,
    `SUMMARY:${esc2(e.title)}`, e.place ? `LOCATION:${esc2(e.place)}` : "", e.desc ? `DESCRIPTION:${esc2(e.desc)}` : "",
    "END:VEVENT", "END:VCALENDAR"].filter(Boolean);
  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `agape-${e.date}.ics`;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

// Próximas fechas para Inicio
export async function homeNext() {
  const slot = document.getElementById("agendaSlot");
  if (!slot) return;
  await loadCamino();
  const own = await ctx.cloud.listAgenda();
  const t = todayIso();
  const list = [...own, ...camino].filter((e) => e.date >= t).sort((a, b) => (a.date + (a.start || "")).localeCompare(b.date + (b.start || ""))).slice(0, 3);
  if (!list.length || !document.getElementById("agendaSlot")) return;
  document.getElementById("agendaSlot").innerHTML = `<a class="card link ag-home" href="#/agenda">
    <span class="eyebrow">${icon("grid")} Agenda Ágape</span>
    <div class="ag-home-list">${list.map((e) => { const d = parse(e.date); return `<span class="ag-home-ev" style="--c:${(TYPES[e.type] || TYPES.otro).color}"><b>${d.getDate()} ${MESES[d.getMonth()].slice(0, 3)}</b>${esc(e.title.replace(/^Camino Ágape · /, ""))}${e.start ? ` · ${esc(e.start)}` : ""}</span>`; }).join("")}</div>
    <span class="go">Ver la agenda completa ${icon("arrowR")}</span></a>`;
}

function registerActions() {
  const A = ctx.actions;
  A.agMonth = (el) => { month = new Date(month.getFullYear(), month.getMonth() + +el.dataset.d, 1); selDay = null; paint(); };
  A.agToday = () => { const n = new Date(); month = new Date(n.getFullYear(), n.getMonth(), 1); selDay = todayIso(); paint(); };
  A.agDay = (el) => { selDay = el.dataset.day || null; openId = null; paint(); if (selDay && matchMedia("(max-width: 900px)").matches) $("#agList")?.scrollIntoView({ behavior: "smooth", block: "start" }); };
  A.agOpen = (el) => { openId = openId === el.dataset.id ? null : el.dataset.id; paintList(); };
  A.agNew = () => openForm(null);
  A.agEdit = (el) => openForm((events || []).find((e) => e.id === el.dataset.id));
  A.agClose = () => document.getElementById("agDialog")?.close();
  A.agDel = async (el) => {
    if (!confirm("¿Borrar este evento de la agenda?")) return;
    try { await ctx.cloud.deleteEvent(el.dataset.id); openId = null; toast("Evento borrado"); } catch { toast("No se pudo borrar", ""); }
  };
  A.agIcs = (el) => { const e = all().find((x) => x.id === el.dataset.id); if (e) ics(e); };
  document.addEventListener("change", (e) => {
    if (e.target.id === "agCamino") { showCamino = e.target.checked; paint(); }
    if (e.target.id === "agFeat") { const o = $("#agFeatOpts"); if (o) o.hidden = !e.target.checked; }
  });
  document.addEventListener("submit", async (e) => {
    if (e.target.id !== "agForm") return;
    e.preventDefault();
    const f = new FormData(e.target);
    const data = Object.fromEntries(["title", "date", "start", "end", "type", "audience", "place", "desc"].map((k) => [k, String(f.get(k) || "").trim()]));
    if (!data.title || !data.date) return;
    data.feat = f.get("feat") === "on";
    for (const k of ["featFrom", "featTo", "featHand", "featIllus"]) data[k] = data.feat ? String(f.get(k) || "").trim() : "";
    if (data.feat && !data.featFrom) data.featFrom = todayIso();
    if (data.feat && data.featTo && data.featTo < data.featFrom) { toast("«Mostrar hasta» es anterior a «Mostrar desde»", ""); return; }
    const old = e.target.dataset.id && (events || []).find((x) => x.id === e.target.dataset.id);
    if (old && old.featOrder != null) data.featOrder = old.featOrder;
    try {
      const id = await ctx.cloud.saveEvent(e.target.dataset.id || null, data);
      document.getElementById("agDialog")?.close();
      const d = parse(data.date); month = new Date(d.getFullYear(), d.getMonth(), 1); selDay = data.date; openId = id;
      toast(data.feat ? "Guardado y destacado en Inicio" : "Guardado en la agenda"); paint();
    } catch (err) { console.warn(err); toast("No se pudo guardar. Revisa tu conexión.", ""); }
  });
}
