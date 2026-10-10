// Registro de las familias (solo guías): la asistencia de cada fecha, el encuentro que tocaba,
// el pasaporte de cada joven, el cuadro de honor del mes anterior y el historial, por familia y
// consolidado, con planillas descargables. Usa los mismos datos de Acompañar (jovenes.fechas y
// sesiones), así que pasar lista aquí o allá es lo mismo.
// Los integrantes son los de la asignación actual (si alguien cambió de familia, su historia viaja con él).

import * as cloud from "./cloud.js";
import { esc, icon, toast, download } from "./util.js";
import { autoSellos, SELLOS } from "./acompanar.js";
import { IDS, COLORS, SOFT, ETAPAS, corto, revistaHref, loadCal, fechaDe, MESES } from "./familias-ag.js";

let ctx = null;
export function setup(c) { ctx = c; registerActions(); }
const st = () => cloud.state();
const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const hoyIso = () => iso(new Date());
const dIso = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const corta = (s) => { const d = dIso(s); return `${d.getDate()} ${MESES[d.getMonth()].slice(0, 3)}`; };
const larga = (s) => { const t = dIso(s).toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long", year: "numeric" }); return t.charAt(0).toUpperCase() + t.slice(1); };
const SELLO = Object.fromEntries(SELLOS.map((s) => [s.k, s]));

// ---------------------------------------------------------------------------
// Datos (se cargan una vez por visita y se refrescan al guardar)
// ---------------------------------------------------------------------------
export let D = null; // { J, ses, fams, cal, honor }
export async function load(force) {
  if (D && !force) return D;
  const guia = !cloud.enabled || st().isGuide; // la asistencia solo la leen los guías
  const [J, ses, fams, cal, honor] = await Promise.all([
    guia ? cloud.listJovenes().catch(() => null) : null, guia ? cloud.listSesiones().catch(() => null) : null, cloud.listFamilias(), loadCal(), cloud.getHonor().catch(() => null)]);
  D = { J: J || [], ses: ses || [], fams: fams || [], cal, honor, ok: !!(J && ses) };
  return D;
}
const fechasOf = (j) => [...new Set(j.fechas || [])].sort();
const desdeOf = (j) => [j.desde, fechasOf(j)[0]].filter(Boolean).sort()[0] || "0000";
const sesIds = () => (D ? D.ses.map((s) => s.id) : []).sort();
const sesOf = (f) => (D ? D.ses.find((s) => s.id === f) : null);
const activosAll = () => (D ? D.J : []).filter((j) => j.activo !== false); // igual que Acompañar
export function famOf(id) { const i = IDS.indexOf(id); const r = (D && D.fams.find((x) => x.id === id)) || {}; return { id, i, ...r }; }
const famNombre = (f) => f.nombre || `Familia ${f.i + 1}`;
// Integrantes actuales con sus datos de asistencia
export function miembros(f) {
  const by = Object.fromEntries((D ? D.J : []).map((j) => [j.id, j]));
  return (f.integrantes || []).map((x) => by[x.id]).filter((j) => j && j.activo !== false);
}
// El encuentro del calendario de la semana de esa fecha (del lunes anterior al domingo del encuentro)
export function encDe(f) {
  if (!D || !D.cal) return null;
  const t = dIso(f).getTime();
  return (D.cal.encuentros || []).map((e) => ({ ...e, date: fechaDe(e.fecha) })).find((e) => e.date && t <= e.date.getTime() && t >= e.date.getTime() - 6 * 86400000) || null;
}
const calIsos = () => (D && D.cal ? D.cal.encuentros.map((e) => fechaDe(e.fecha)).filter(Boolean).map(iso) : []);
// Fechas para revisar: las listas registradas y los encuentros del calendario hasta el próximo
export function fechas() {
  const hoy = hoyIso(), cal = calIsos(), prox = cal.find((x) => x >= hoy);
  return [...new Set([...sesIds(), ...cal.filter((x) => x <= hoy), ...(prox ? [prox] : [])])].sort().reverse();
}
export function fechaPorDefecto() {
  const hoy = hoyIso(), f = fechas();
  const prox = calIsos().find((x) => x >= hoy);
  return f.find((x) => x <= hoy && sesOf(x)) || prox || f[0] || hoy;
}
// Asistencia de una familia en una fecha
export function asis(f, fecha) {
  const reg = !!sesOf(fecha);
  const ms = miembros(f).filter((j) => desdeOf(j) <= fecha);
  const pres = ms.filter((j) => fechasOf(j).includes(fecha)), aus = ms.filter((j) => !fechasOf(j).includes(fecha));
  return { reg, pres, aus, total: ms.length };
}
const pasaporte = (j) => `#/acompanar/joven/${encodeURIComponent(j.id)}`;
const jChip = (j, cls) => `<a class="fam-chip ${cls}" href="${pasaporte(j)}" title="Ver su pasaporte">${cls === "pres" ? "✓" : "✗"} ${esc(corto(j.nombre))}</a>`;

// Resumen compacto para la tarjeta de Nuestras familias (vista por fecha)
export function cardAsis(f, fecha) {
  if (!D || !D.ok) return "";
  const a = asis(f, fecha);
  if (!a.total) return "";
  if (!a.reg) return `<div class="fam-asis none"><span>📋 ${fecha > hoyIso() ? "Aún no llega esta fecha" : "Sin lista ese día"}</span><a href="#/nuestras-familias/${f.id}/${fecha}">${fecha > hoyIso() ? "Ver familia" : "Pasar lista"} ${icon("right")}</a></div>`;
  return `<div class="fam-asis"><span class="fam-asis-n"><b>${a.pres.length}</b> de ${a.total} presentes</span>
    <div class="fam-chips">${a.pres.map((j) => jChip(j, "pres")).join("")}${a.aus.map((j) => jChip(j, "aus")).join("")}</div></div>`;
}
// Cuadro de honor del mes anterior (publicado), solo con los integrantes de la familia
export function cardHonor(f) {
  const h = D && D.honor; if (!h || !(h.items || []).length) return "";
  const now = new Date(), prev = new Date(now.getFullYear(), now.getMonth() - 1, 1), cur = iso(now).slice(0, 7);
  if (h.mes !== iso(prev).slice(0, 7) && h.mes !== cur) return "";
  const nombres = new Set((f.integrantes || []).map((x) => x.nombre));
  const it = h.items.filter((x) => nombres.has(x.n));
  return it.length ? `<div class="fam-honor">🏆 <b>Cuadro de honor · ${esc(h.titulo || "")}:</b> ${it.map((x) => esc(x.n)).join(", ")}</div>` : "";
}

// Cuadro de honor calculado (para el equipo): asistencia perfecta o sellos nuevos en el mes
function honorMes(js, mes) {
  const inMonth = sesIds().filter((s) => s.startsWith(mes));
  return js.map((j) => {
    const f = new Set(fechasOf(j)), own = inMonth.filter((s) => s >= desdeOf(j));
    const perfect = own.length >= 2 && own.every((s) => f.has(s));
    const nuevos = Object.entries({ ...(j.auto || {}), ...(j.sellos || {}) }).filter(([, d]) => d && String(d).startsWith(mes)).map(([k]) => k);
    return { j, perfect, nuevos };
  }).filter((x) => x.perfect || x.nuevos.length);
}
function statsJ(j, dates) {
  const f = new Set(fechasOf(j)), own = dates.filter((s) => s >= desdeOf(j));
  const n = own.filter((s) => f.has(s)).length;
  let faltas = 0; for (const s of [...own].reverse()) { if (f.has(s)) break; faltas++; }
  return { n, de: own.length, pct: own.length ? Math.round((n / own.length) * 100) : null, faltas };
}

// ---------------------------------------------------------------------------
// Una familia  (#/nuestras-familias/f3  ·  #/nuestras-familias/f3/2027-03-07)
// ---------------------------------------------------------------------------
let sel = { fid: "", fecha: "", roll: null };
const gate = () => {
  const s = st();
  if (cloud.enabled && !s.ready) return `<div class="card"><p>Ingresa con tu cuenta para ver tu familia.</p><a class="btn btn-primary" href="#/perfil" style="margin-top:10px">Ingresar</a></div>`;
  if (cloud.enabled && !s.isGuide) return `<div class="card" style="text-align:center;padding:26px"><h2 class="display">El registro es para los guías</h2><p class="muted" style="margin-top:6px">Tu asistencia y tus sellos están en tu pasaporte.</p><a class="btn btn-primary" style="margin-top:12px" href="#/pasaporte">Ver mi pasaporte</a></div>`;
  return "";
};
export function viewFamilia(fid, fecha) {
  if (!IDS.includes(fid)) return null;
  const g = gate();
  if (!g) ctx.onAfterRender(async () => { await load(true); if (!sel.fecha || sel.fid !== fid || fecha) { sel.fecha = fecha || fechaPorDefecto(); } sel.fid = fid; sel.roll = null; paintFam(); });
  return `<nav class="crumbs"><a href="#/nuestras-familias">Nuestras familias</a>${icon("right")}<span id="frCrumb">Familia ${IDS.indexOf(fid) + 1}</span></nav>
    ${g || `<div id="frBody"><p class="muted" style="padding:30px;text-align:center">Cargando el registro…</p></div>`}`;
}
function navFechas(cur, action) {
  const list = fechas(), i = list.indexOf(cur);
  const opt = (x) => { const e = encDe(x), s = sesOf(x); return `<option value="${x}" ${x === cur ? "selected" : ""}>${corta(x)}${e ? ` · N° ${e.n}` : ""}${s ? " · ✓ lista" : x > hoyIso() ? " · próximo" : ""}</option>`; };
  const all = list.includes(cur) ? list : [cur, ...list];
  return `<div class="fr-nav"><button class="btn btn-sm btn-ghost" data-action="${action}" data-f="${all[i + 1] || ""}" ${all[i + 1] ? "" : "disabled"} aria-label="Fecha anterior">${icon("left")}</button>
    <select class="select" data-frsel="${action}" aria-label="Fecha">${all.map(opt).join("")}</select>
    <button class="btn btn-sm btn-ghost" data-action="${action}" data-f="${i > 0 ? all[i - 1] : ""}" ${i > 0 ? "" : "disabled"} aria-label="Fecha siguiente">${icon("right")}</button></div>`;
}
function encBox(f, fecha) {
  const e = encDe(fecha);
  if (!e) return `<p class="muted small">No hay un encuentro del calendario en esta fecha.${sesOf(fecha) && sesOf(fecha).titulo ? ` Se registró: <b>${esc(sesOf(fecha).titulo)}</b>.` : ""}</p>`;
  const et = ETAPAS[f.etapa], x = (e.etapas || {})[f.etapa] || {};
  return `<div class="fr-enc"><span class="eyebrow">Encuentro N° ${e.n} del año · ${esc(e.domingo)}</span>
    <h3>${esc(x.titulo || e.tema)}</h3><p class="small muted">Tema del grupo: <b>${esc(e.tema)}</b> · 📖 ${esc(e.evangelio?.ref || "")}</p>
    ${et ? `<a class="chip-link" href="${revistaHref(f.etapa, e.n)}">📰 Abrir en la Revista ${esc(et[0])} ${icon("right")}</a>` : `<span class="xs muted">Define la etapa de la familia para enlazar su revista.</span>`}</div>`;
}
function paintFam() {
  const box = document.getElementById("frBody"); if (!box) return;
  if (!D.ok) { box.innerHTML = `<div class="note">No se pudo cargar la asistencia. Revisa tu conexión.</div>`; return; }
  const f = famOf(sel.fid), fecha = sel.fecha, c = COLORS[f.i], soft = SOFT[f.i];
  const cr = document.getElementById("frCrumb"); if (cr) cr.textContent = famNombre(f);
  const ms = miembros(f), a = asis(f, fecha), futuro = fecha > hoyIso();
  const dates = sesIds();
  const mPrev = (() => { const d = dIso(fecha); return iso(new Date(d.getFullYear(), d.getMonth() - 1, 1)).slice(0, 7); })();
  const hon = honorMes(ms, mPrev), [hy, hm] = mPrev.split("-").map(Number);
  const roll = sel.roll;
  const histDates = dates.filter((s) => ms.some((j) => s >= desdeOf(j))).slice(-16);
  box.innerHTML = `
  <header class="fr-head" style="--fc:${c};--fs:${soft}"><span class="fam-n">${f.i + 1}</span>
    <div style="flex:1"><h1>${esc(famNombre(f))}</h1><div class="fam-etapa">${ETAPAS[f.etapa] ? `<span class="fam-et" style="--ec:${ETAPAS[f.etapa][2]}">${esc(ETAPAS[f.etapa][0])}</span>` : ""}
      <span class="small">⭐ ${(f.dirigentes || []).map((d) => esc(corto(d.nombre))).join(", ") || "Sin dirigente"} · ${ms.length} integrante${ms.length === 1 ? "" : "s"}</span></div></div>
    <button class="btn btn-sm btn-soft" data-action="frCsvFam">${icon("dl")} Planilla</button></header>
  ${navFechas(fecha, "frGo")}
  <p class="fr-date">${esc(larga(fecha))}</p>
  <section class="card">${encBox(f, fecha)}</section>
  <section class="card fr-asis"><div class="row-wrap" style="align-items:center"><h2 class="fr-h">📋 Asistencia</h2><span class="spacer"></span>
    ${roll ? "" : !ms.length ? "" : futuro ? `<span class="xs muted">Se pasa lista ese día</span>` : `<button class="btn btn-sm ${a.reg ? "btn-ghost" : "btn-primary"}" data-action="frRoll">${icon(a.reg ? "edit" : "check")} ${a.reg ? "Corregir lista" : "Pasar lista"}</button>`}</div>
    ${!ms.length ? `<p class="muted small">Esta familia aún no tiene integrantes. Se asignan en Gestión → Asignar jóvenes.</p>`
      : roll ? `<p class="small muted">Toca a quienes vinieron.</p><div class="ac-roll">${ms.map((j) => `<button class="ac-p ${roll.has(j.id) ? "on" : ""}" data-action="frToggle" data-id="${esc(j.id)}" aria-pressed="${roll.has(j.id)}"><span class="ac-p-n">${esc(corto(j.nombre))}</span><span class="ac-check">${roll.has(j.id) ? "✓" : ""}</span></button>`).join("")}</div>
        <div class="row-wrap ac-save"><b>${roll.size} de ${ms.length} presentes</b><span class="spacer"></span><button class="btn btn-sm btn-ghost" data-action="frRollCancel">Cancelar</button><button class="btn btn-sm btn-ghost" data-action="frRollAll">Todos</button><button class="btn btn-primary" data-action="frRollSave">${icon("check")} Guardar</button></div>`
      : a.reg ? `<p class="fr-count"><b>${a.pres.length}</b> de ${a.total} presentes${a.total ? ` · ${Math.round((a.pres.length / a.total) * 100)}%` : ""}</p>
        <div class="fr-cols"><div><span class="fam-k">Vinieron</span><div class="fam-chips">${a.pres.map((j) => jChip(j, "pres")).join("") || `<span class="xs muted">Nadie</span>`}</div></div>
          <div><span class="fam-k">Faltaron</span><div class="fam-chips">${a.aus.map((j) => jChip(j, "aus")).join("") || `<span class="xs muted">¡Nadie faltó! 🎉</span>`}</div></div></div>
        <p class="xs muted">Toca un nombre para ver su pasaporte.</p>`
      : `<p class="muted small">${futuro ? "Este encuentro aún no llega." : "Ese día no se pasó lista."}</p>`}
  </section>
  <section class="card"><h2 class="fr-h">🏆 Cuadro de honor · ${MESES[hm - 1]} ${hy}</h2>
    ${hon.length ? `<div class="honor-list">${hon.map((x) => `<a class="honor-i" href="${pasaporte(x.j)}"><div style="flex:1"><b>${esc(corto(x.j.nombre))}</b>
      <span class="honor-m">${x.perfect ? `<span class="chip ok">🎯 Asistencia perfecta</span>` : ""}${x.nuevos.map((k) => `<span class="chip">${(SELLO[k] || {}).e || ""} ${esc((SELLO[k] || {}).l || k)}</span>`).join("")}</span></div></a>`).join("")}</div>`
      : `<p class="muted small">Nadie de la familia tuvo asistencia perfecta ni sellos nuevos ese mes.</p>`}</section>
  <section class="card"><h2 class="fr-h">👥 Integrantes</h2>
    <div class="fr-ints">${ms.map((j) => { const s = statsJ(j, dates); return `<a class="fr-int" href="${pasaporte(j)}"><b>${esc(corto(j.nombre))}</b>
      <span class="xs muted">${s.n} de ${s.de} encuentros${s.pct != null ? ` · ${s.pct}%` : ""}</span>${s.faltas >= 3 ? `<span class="chip warn">Faltó a los últimos ${s.faltas}</span>` : ""}<span class="fr-pass">🛂 Pasaporte ${icon("right")}</span></a>`; }).join("") || `<p class="muted small">Sin integrantes.</p>`}</div></section>
  ${histDates.length && ms.length ? `<section class="card"><h2 class="fr-h">🗓️ Historial</h2><div class="fr-tablewrap"><table class="fr-table">
    <thead><tr><th>Joven</th>${histDates.map((s) => `<th><button data-action="frGo" data-f="${s}" class="${s === fecha ? "on" : ""}">${corta(s)}${encDe(s) ? `<small>N°${encDe(s).n}</small>` : ""}</button></th>`).join("")}<th>%</th></tr></thead>
    <tbody>${ms.map((j) => { const fs = new Set(fechasOf(j)), s = statsJ(j, histDates); return `<tr><th>${esc(corto(j.nombre))}</th>${histDates.map((d) => `<td class="${d < desdeOf(j) ? "na" : fs.has(d) ? "p" : "a"}">${d < desdeOf(j) ? "" : fs.has(d) ? "✓" : "·"}</td>`).join("")}<td>${s.pct ?? ""}</td></tr>`; }).join("")}
    <tr class="tot"><th>Presentes</th>${histDates.map((d) => { const x = asis(f, d); return `<td>${x.pres.length}/${x.total}</td>`; }).join("")}<td></td></tr></tbody></table></div>
    <p class="xs muted">Últimos ${histDates.length} encuentros con lista. ✓ vino · · faltó · vacío: aún no participaba.</p></section>` : ""}`;
}

// ---------------------------------------------------------------------------
// Consolidado  (#/nuestras-familias/registro)
// ---------------------------------------------------------------------------
let regYear = null;
export function viewRegistro() {
  const g = gate();
  if (!g) ctx.onAfterRender(async () => { await load(true); paintReg(); });
  return `<nav class="crumbs"><a href="#/nuestras-familias">Nuestras familias</a>${icon("right")}<span>Registro</span></nav>
    <header class="page-head"><span class="eyebrow">Para los guías</span><h1>Registro de <em>asistencia</em></h1>
    <p>Quiénes vienen y quiénes faltan, familia por familia y encuentro por encuentro. Sirve para acompañar y para programar los encuentros.</p></header>
    ${g || `<div id="frReg"><p class="muted" style="padding:30px;text-align:center">Cargando…</p></div>`}`;
}
const famsList = () => IDS.map(famOf).filter((f) => (f.integrantes || []).length);
const datesYear = (y) => sesIds().filter((s) => s.startsWith(String(y)));
function paintReg() {
  const box = document.getElementById("frReg"); if (!box) return;
  if (!D.ok) { box.innerHTML = `<div class="note">No se pudo cargar la asistencia. Revisa tu conexión.</div>`; return; }
  const years = [...new Set(sesIds().map((s) => s.slice(0, 4)))].sort().reverse();
  if (!regYear || !years.includes(regYear)) regYear = years[0] || String(new Date().getFullYear());
  const dates = datesYear(regYear), fams = famsList();
  const cellPct = (a) => (a.total ? Math.round((a.pres.length / a.total) * 100) : null);
  const tone = (p) => (p == null ? "" : p >= 80 ? "hi" : p >= 60 ? "mid" : "lo");
  // promedios por familia y por encuentro
  const famStats = fams.map((f) => {
    const ps = dates.map((d) => asis(f, d)).filter((a) => a.total);
    const avg = ps.length ? Math.round(ps.reduce((s, a) => s + a.pres.length / a.total, 0) / ps.length * 100) : null;
    const last = ps.slice(-4), avg4 = last.length ? Math.round(last.reduce((s, a) => s + a.pres.length / a.total, 0) / last.length * 100) : null;
    return { f, avg, avg4 };
  });
  const encStats = dates.map((d) => {
    const as = fams.map((f) => asis(f, d)).filter((a) => a.total), p = as.reduce((s, a) => s + a.pres.length, 0), t = as.reduce((s, a) => s + a.total, 0);
    return { d, e: encDe(d), p, t, pct: t ? Math.round((p / t) * 100) : null };
  }).filter((x) => x.t);
  const best = [...encStats].sort((a, b) => b.pct - a.pct)[0], worst = [...encStats].sort((a, b) => a.pct - b.pct)[0];
  const gen = encStats.length ? Math.round(encStats.reduce((s, x) => s + x.pct, 0) / encStats.length) : null;
  const apoyo = famStats.filter((x) => x.avg4 != null && x.avg4 < 60);
  const lbl = (x) => `${corta(x.d)}${x.e ? ` · N° ${x.e.n} «${esc(x.e.tema)}»` : ""}`;
  box.innerHTML = `
  <div class="row-wrap" style="gap:8px;margin-bottom:12px">
    ${years.length > 1 ? `<select class="select" id="frYear" style="width:auto">${years.map((y) => `<option ${y === regYear ? "selected" : ""}>${y}</option>`).join("")}</select>` : `<span class="chip">${esc(regYear)}</span>`}
    <span class="spacer"></span>
    <button class="btn btn-sm btn-soft" data-action="frCsvJ">${icon("dl")} Planilla por joven</button>
    <button class="btn btn-sm btn-soft" data-action="frCsvE">${icon("dl")} Resumen por encuentro</button></div>
  ${!dates.length ? `<div class="card" style="text-align:center;padding:26px"><p class="muted">Aún no hay listas registradas en ${esc(regYear)}. Se pasa lista desde cada familia o en Acompañar.</p></div>` : `
  <section class="fr-kpis">
    <div class="card"><span class="fam-k">Asistencia promedio</span><b class="fr-big">${gen ?? "–"}%</b><span class="xs muted">${encStats.length} encuentros con lista</span></div>
    ${best ? `<div class="card"><span class="fam-k">Más asistencia</span><b>${best.pct}%</b><span class="xs">${lbl(best)}</span></div>` : ""}
    ${worst && worst !== best ? `<div class="card"><span class="fam-k">Menos asistencia</span><b>${worst.pct}%</b><span class="xs">${lbl(worst)}</span></div>` : ""}
    <div class="card"><span class="fam-k">Familias para apoyar</span><b>${apoyo.length}</b><span class="xs">${apoyo.length ? apoyo.map((x) => esc(famNombre(x.f))).join(", ") + " · bajo 60% en los últimos 4" : "Todas sobre 60% en los últimos 4"}</span></div>
  </section>
  <section class="card"><h2 class="fr-h">Por familia y fecha</h2><div class="fr-tablewrap"><table class="fr-table fr-reg">
    <thead><tr><th>Fecha</th>${fams.map((f) => `<th><a href="#/nuestras-familias/${f.id}" style="--fc:${COLORS[f.i]}"><span class="fr-dot"></span>${esc(famNombre(f))}</a></th>`).join("")}<th>Total</th></tr></thead>
    <tbody>${[...dates].reverse().map((d) => { const x = encStats.find((y) => y.d === d); return `<tr><th>${corta(d)}${encDe(d) ? `<small>N° ${encDe(d).n} · ${esc(encDe(d).tema)}</small>` : ""}</th>${fams.map((f) => { const a = asis(f, d), p = cellPct(a);
      return `<td class="${tone(p)}"><a href="#/nuestras-familias/${f.id}/${d}">${a.total ? `${a.pres.length}/${a.total}` : ""}</a></td>`; }).join("")}<td class="${tone(x && x.pct)}">${x ? `${x.p}/${x.t}` : ""}</td></tr>`; }).join("")}
    <tr class="tot"><th>Promedio</th>${famStats.map((x) => `<td class="${tone(x.avg)}">${x.avg ?? ""}${x.avg != null ? "%" : ""}</td>`).join("")}<td>${gen ?? ""}${gen != null ? "%" : ""}</td></tr></tbody></table></div>
    <p class="xs muted">Toca una celda para ver quiénes vinieron y quiénes faltaron. Verde: 80% o más · amarillo: 60–79% · rojo: menos de 60%.</p></section>`}
  <p class="xs muted">Las planillas se abren en Excel o Google Sheets. Por cuidado de los datos de menores, los jóvenes aparecen con nombre e inicial del apellido.</p>`;
}

// ---------------------------------------------------------------------------
// Planillas (CSV con «;», se abren directo en Excel en español)
// ---------------------------------------------------------------------------
const cell = (v) => { const s = String(v ?? ""); return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const csv = (rows) => "﻿" + rows.map((r) => r.map(cell).join(";")).join("\r\n");
function filasJovenes(fams, dates) {
  const head = ["Familia", "Etapa de la familia", "Joven", "Dirigente(s)", ...dates.map((d) => `${d.slice(8)}-${d.slice(5, 7)}${encDe(d) ? ` N°${encDe(d).n}` : ""}`), "Asistencias", "Encuentros posibles", "% asistencia", "Faltas seguidas"];
  const rows = [head];
  for (const f of fams) {
    for (const j of miembros(f)) {
      const fs = new Set(fechasOf(j)), s = statsJ(j, dates);
      rows.push([famNombre(f), ETAPAS[f.etapa] ? ETAPAS[f.etapa][0] : "", corto(j.nombre), (f.dirigentes || []).map((d) => corto(d.nombre)).join(", "),
        ...dates.map((d) => (d < desdeOf(j) ? "" : fs.has(d) ? "P" : "A")), s.n, s.de, s.pct ?? "", s.faltas]);
    }
  }
  return rows;
}
function filasEncuentros(fams, dates) {
  const rows = [["Fecha", "Encuentro N°", "Tema del grupo", "Familia", "Etapa", "Título del encuentro (etapa)", "Presentes", "Ausentes", "Integrantes", "% asistencia", "Quiénes faltaron"]];
  for (const d of dates) {
    const e = encDe(d);
    for (const f of fams) {
      const a = asis(f, d); if (!a.total) continue;
      rows.push([d, e ? e.n : "", e ? e.tema : (sesOf(d) || {}).titulo || "", famNombre(f), ETAPAS[f.etapa] ? ETAPAS[f.etapa][0] : "",
        e ? (((e.etapas || {})[f.etapa] || {}).titulo || "") : "", a.pres.length, a.aus.length, a.total, Math.round((a.pres.length / a.total) * 100), a.aus.map((j) => corto(j.nombre)).join(", ")]);
    }
  }
  return rows;
}
const slugF = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function registerActions() {
  const A = ctx.actions;
  A.frGo = (el) => { if (!el.dataset.f) return; sel.fecha = el.dataset.f; sel.roll = null; history.replaceState(null, "", `#/nuestras-familias/${sel.fid}/${sel.fecha}`); paintFam(); };
  A.frRoll = () => { const f = famOf(sel.fid); sel.roll = new Set(miembros(f).filter((j) => fechasOf(j).includes(sel.fecha)).map((j) => j.id)); paintFam(); };
  A.frToggle = (el) => { const id = el.dataset.id; if (sel.roll.has(id)) sel.roll.delete(id); else sel.roll.add(id); paintFam(); };
  A.frRollAll = () => { miembros(famOf(sel.fid)).forEach((j) => sel.roll.add(j.id)); paintFam(); };
  A.frRollCancel = () => { sel.roll = null; paintFam(); };
  A.frRollSave = async (el) => {
    el.disabled = true;
    try { await saveRoll(famOf(sel.fid), sel.fecha, sel.roll); sel.roll = null; await load(true); toast("Asistencia guardada ✓", "ok"); paintFam(); }
    catch (e) { console.warn(e); toast("No se pudo guardar. Revisa tu conexión.", ""); el.disabled = false; }
  };
  A.frCsvFam = () => { const f = famOf(sel.fid), dates = sesIds(); download(`asistencia-${slugF(famNombre(f))}.csv`, csv(filasJovenes([f], dates)), "text/csv;charset=utf-8"); };
  A.frCsvJ = () => download(`asistencia-por-joven-${regYear}.csv`, csv(filasJovenes(famsList(), datesYear(regYear))), "text/csv;charset=utf-8");
  A.frCsvE = () => download(`asistencia-por-encuentro-${regYear}.csv`, csv(filasEncuentros(famsList(), datesYear(regYear))), "text/csv;charset=utf-8");
  document.addEventListener("change", (e) => {
    if (e.target.dataset && e.target.dataset.frsel === "frGo") A.frGo({ dataset: { f: e.target.value } });
    if (e.target.id === "frYear") { regYear = e.target.value; paintReg(); }
  });
}

// Guarda la lista de una familia: solo toca a sus integrantes; la sesión del día queda con el total del grupo.
async function saveRoll(f, fecha, presentes) {
  const sessions = [...new Set([...sesIds(), fecha])].sort();
  const ms = miembros(f), writes = [];
  for (const j of ms) {
    const fs = fechasOf(j), has = fs.includes(fecha), want = presentes.has(j.id);
    if (has === want) continue;
    const nf = want ? [...fs, fecha].sort() : fs.filter((x) => x !== fecha);
    j.fechas = nf;
    writes.push(cloud.patchJoven(j.id, { fechas: nf, auto: autoSellos({ ...j, fechas: nf }, sessions) }));
  }
  await Promise.all(writes);
  const all = activosAll(), e = encDe(fecha), prev = sesOf(fecha);
  await cloud.saveSesion(fecha, { fecha, titulo: (prev && prev.titulo) || (e ? `Encuentro N° ${e.n} · ${e.tema}` : "Encuentro semanal"),
    presentes: all.filter((j) => fechasOf(j).includes(fecha)).length, total: all.length });
}
