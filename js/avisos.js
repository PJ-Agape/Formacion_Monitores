// Avisos del equipo (#/avisos): un apoyo a la comunicación, no un chat.
// La coordinación (administradores y coordinadores) envía avisos o tareas a una persona, a varias o a todos
// los dirigentes. Cada uno marca «Recibido» y, si es tarea, «Listo»; la coordinación ve quién lo leyó.
// No hay respuestas en la app: si hay que conversar, se sigue por WhatsApp, como acordamos.

import { esc, icon, toast } from "./util.js";

let ctx = null;
export function setup(c) { ctx = c; registerActions(); }
const $ = (s, r = document) => r.querySelector(s);
const st = () => ctx.cloud.state();
const me = () => ctx.cloud.myUid();

let mine = null, sent = null, people = null, tab = "recibidos", compose = null, stopMine = null, stopSent = null;
const ROLE = { admin: "Administración", coordinador: "Coordinación", dirigente: "Dirigente" };
const TEAM = ["admin", "coordinador", "dirigente"];
const ms = (t) => (t && t.toDate ? t.toDate().getTime() : t && t.seconds ? t.seconds * 1000 : 0);
const fecha = (t) => { const d = new Date(ms(t) || Date.now()); return d.toLocaleDateString("es-CL", { weekday: "short", day: "numeric", month: "short" }); };
const dueTxt = (d) => (d ? new Date(d + "T12:00").toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" }) : "");
const ack = (a, uid = me()) => (a.acks && a.acks[uid]) || {};
const pending = (a) => { const k = ack(a); return !k.r || (a.kind === "tarea" && !k.d); };

function watch() {
  if (!stopMine) stopMine = ctx.cloud.watchMyAvisos((r) => { mine = r; paint(); }, () => { mine = mine || []; paint(); });
  if (st().isStaff && !stopSent) stopSent = ctx.cloud.watchSentAvisos((r) => { sent = r; paint(); }, () => { sent = sent || []; paint(); });
}
function stop() { stopMine && stopMine(); stopSent && stopSent(); stopMine = stopSent = null; }

export function view() {
  const s = st();
  if (!s.enabled) return `<div class="note">Los avisos necesitan conexión con las cuentas de la pastoral.</div>`;
  if (!s.ready) return `<div class="card" style="max-width:480px;margin:6vh auto;text-align:center;padding:28px"><h1 class="display" style="font-size:1.5rem">Avisos del equipo</h1>
    <p class="muted">Ingresa con tu cuenta para ver tus avisos.</p><button class="btn btn-primary" style="margin-top:12px" data-action="signIn">Ingresar</button></div>`;
  if (!TEAM.includes(s.role)) return `<div class="note">Los avisos son para el equipo de servicio: dirigentes, coordinadores y administradores.</div>`;
  ctx.onAfterRender(() => { watch(); paint(); });
  ctx.onLeave(stop);
  return `<header class="page-head row-wrap" style="align-items:flex-end"><div><span class="eyebrow">Equipo de servicio</span><h1>Avisos del <em>equipo</em></h1>
      <p>Recordatorios, encargos y tareas de la coordinación. Marca «Recibido» al leerlos. Si necesitas conversarlo, sigue por WhatsApp.</p></div>
      <span class="spacer"></span>${s.isStaff ? `<button class="btn btn-primary" data-action="avNew">${icon("plus")} Nuevo aviso</button>` : ""}</header>
    <div id="avBody"><p class="muted">Cargando…</p></div>`;
}

function card(a) {
  const k = ack(a), tarea = a.kind === "tarea";
  return `<article class="card av-card ${pending(a) ? "is-new" : ""}">
    <div class="av-top"><span class="chip ${tarea ? "warn" : "accent"}">${tarea ? "Tarea" : "Aviso"}</span><span class="muted small">${esc(a.byName || "Coordinación")} · ${esc(fecha(a.createdAt))}</span></div>
    <h3>${esc(a.title)}</h3>${a.text ? `<p>${esc(a.text).replace(/\n/g, "<br>")}</p>` : ""}
    ${tarea && a.due ? `<p class="av-due">Para el ${esc(dueTxt(a.due))}</p>` : ""}
    <div class="row-wrap" style="gap:8px">
      ${!k.r ? `<button class="btn btn-sm btn-primary" data-action="avAck" data-id="${a.id}">${icon("check")} Recibido</button>` : `<span class="av-ok">${icon("check")} Recibido</span>`}
      ${tarea ? (!k.d ? `<button class="btn btn-sm ${k.r ? "btn-gold" : "btn-ghost"}" data-action="avDone" data-id="${a.id}">Listo, hecho</button>` : `<span class="av-ok">${icon("check")} Hecho</span>`) : ""}
    </div></article>`;
}
function sentCard(a) {
  const to = a.to || [], names = a.toNames || {};
  const r = to.filter((u) => ack(a, u).r), d = to.filter((u) => ack(a, u).d), tarea = a.kind === "tarea";
  return `<article class="card av-card">
    <div class="av-top"><span class="chip ${tarea ? "warn" : "accent"}">${tarea ? "Tarea" : "Aviso"}</span><span class="muted small">${esc(fecha(a.createdAt))}${a.by !== me() ? ` · ${esc(a.byName || "")}` : ""}</span></div>
    <h3>${esc(a.title)}</h3>
    <div class="av-bar"><i style="width:${to.length ? Math.round((100 * r.length) / to.length) : 0}%"></i></div>
    <p class="small"><b>${r.length} de ${to.length}</b> lo recibieron${tarea ? ` · <b>${d.length}</b> lo marcaron hecho` : ""}${tarea && a.due ? ` · para el ${esc(dueTxt(a.due))}` : ""}</p>
    <details><summary class="small">Ver quiénes</summary><ul class="av-who">${to.map((u) => { const k = ack(a, u);
      return `<li><span>${esc(names[u] || "Integrante")}</span><span class="${k.r ? "ok" : ""}">${tarea ? (k.d ? "Hecho" : k.r ? "Recibido" : "Pendiente") : k.r ? "Recibido" : "Pendiente"}</span></li>`; }).join("")}</ul>
      ${a.text ? `<p class="small muted" style="margin-top:6px">${esc(a.text).replace(/\n/g, "<br>")}</p>` : ""}
      <button class="btn btn-sm btn-ghost" data-action="avDel" data-id="${a.id}">Borrar aviso</button></details></article>`;
}
function composeHTML() {
  const c = compose, ppl = (people || []).filter((p) => TEAM.includes(p.role) && p.uid !== me()).sort((a, b) => a.name.localeCompare(b.name));
  const group = (k, l) => `<button type="button" class="chip ${c.group === k ? "accent" : ""}" data-action="avGroup" data-g="${k}">${l}</button>`;
  return `<section class="card stack av-new" style="--gap:10px">
    <h2 style="font-size:1.1rem">Nuevo aviso</h2>
    <div class="seg" role="radiogroup" aria-label="Tipo"><label><input type="radio" name="avKind" value="aviso" ${c.kind === "aviso" ? "checked" : ""}><span>Aviso</span></label><label><input type="radio" name="avKind" value="tarea" ${c.kind === "tarea" ? "checked" : ""}><span>Tarea</span></label></div>
    <div class="field"><label>Título</label><input class="input" id="avTitle" maxlength="120" value="${esc(c.title)}" placeholder="Ej: Traer las autorizaciones del retiro"></div>
    <div class="field"><label>Detalle <span class="muted">(opcional)</span></label><textarea class="input" id="avText" rows="3" maxlength="2000">${esc(c.text)}</textarea></div>
    ${c.kind === "tarea" ? `<div class="field"><label>Para cuándo <span class="muted">(opcional)</span></label><input class="input" type="date" id="avDue" value="${esc(c.due)}"></div>` : ""}
    <div class="field"><label>Para</label>
      <div class="row-wrap" style="gap:6px">${group("dirigentes", "Todos los dirigentes")}${group("coordinacion", "Coordinación")}${group("todos", "Todo el equipo")}</div>
      ${people === null ? `<p class="muted small">Cargando el equipo…</p>` : `<div class="av-people">${ppl.map((p) => `<label><input type="checkbox" data-av-to="${p.uid}" ${c.to.has(p.uid) ? "checked" : ""}> ${esc(p.name)} <small>${esc(ROLE[p.role] || "")}</small></label>`).join("")}</div>`}
      <p class="xs muted">${c.to.size} ${c.to.size === 1 ? "persona" : "personas"}</p></div>
    <div class="row-wrap" style="gap:8px"><button class="btn btn-primary" data-action="avSend">${icon("send")} Enviar</button><button class="btn btn-ghost btn-sm" data-action="avCancel">Cancelar</button></div>
  </section>`;
}
function paint() {
  const box = $("#avBody"); if (!box) return;
  const s = st();
  if (compose) { box.innerHTML = composeHTML(); return; }
  const recv = (mine || []).slice().sort((a, b) => (pending(b) - pending(a)) || (ms(b.createdAt) - ms(a.createdAt)));
  const pend = recv.filter(pending), old = recv.filter((a) => !pending(a));
  const tabs = s.isStaff ? `<nav class="row-wrap" style="gap:6px;margin-bottom:12px">
      <button class="btn btn-sm ${tab === "recibidos" ? "btn-primary" : "btn-ghost"}" data-action="avTab" data-t="recibidos">Para mí${pend.length ? ` (${pend.length})` : ""}</button>
      <button class="btn btn-sm ${tab === "enviados" ? "btn-primary" : "btn-ghost"}" data-action="avTab" data-t="enviados">Enviados</button></nav>` : "";
  if (s.isStaff && tab === "enviados") {
    box.innerHTML = tabs + (sent === null ? `<p class="muted">Cargando…</p>` : sent.length ? `<div class="stack" style="--gap:12px">${sent.map(sentCard).join("")}</div>` : `<div class="card" style="text-align:center;padding:24px"><p class="muted">Aún no hay avisos enviados.</p></div>`);
    return;
  }
  box.innerHTML = tabs + (mine === null ? `<p class="muted">Cargando…</p>`
    : !recv.length ? `<div class="card" style="text-align:center;padding:24px"><p class="muted">No tienes avisos. Cuando la coordinación te envíe uno, aparecerá aquí y en la campanita.</p></div>`
    : `${pend.length ? `<div class="stack" style="--gap:12px">${pend.map(card).join("")}</div>` : `<p class="note small">Estás al día.</p>`}
       ${old.length ? `<details class="av-old" ${pend.length ? "" : "open"}><summary>Anteriores (${old.length})</summary><div class="stack" style="--gap:10px;margin-top:10px">${old.slice(0, 30).map(card).join("")}</div></details>` : ""}`);
}

function readForm() {
  if (!compose) return;
  compose.title = $("#avTitle")?.value ?? compose.title; compose.text = $("#avText")?.value ?? compose.text; compose.due = $("#avDue")?.value ?? compose.due;
}
function registerActions() {
  const A = ctx.actions;
  A.avTab = (el) => { tab = el.dataset.t; paint(); };
  A.avAck = async (el) => { el.disabled = true; try { await ctx.cloud.ackAviso(el.dataset.id, false); } catch (e) { el.disabled = false; toast("No se pudo marcar: " + (e.code || e.message), ""); } };
  A.avDone = async (el) => { el.disabled = true; try { await ctx.cloud.ackAviso(el.dataset.id, true); toast("¡Gracias!", "ok"); } catch (e) { el.disabled = false; toast("No se pudo marcar: " + (e.code || e.message), ""); } };
  A.avDel = async (el) => { if (!confirm("¿Borrar este aviso? Desaparece también para quienes lo recibieron.")) return; try { await ctx.cloud.deleteAviso(el.dataset.id); toast("Aviso borrado"); } catch (e) { toast("No se pudo borrar: " + (e.code || e.message), ""); } };
  A.avNew = async () => {
    compose = { kind: "aviso", title: "", text: "", due: "", to: new Set(), group: "" }; paint();
    if (people === null) { people = await ctx.cloud.listPeople().catch(() => []); paint(); }
  };
  A.avCancel = () => { compose = null; paint(); };
  A.avGroup = (el) => {
    readForm(); const g = el.dataset.g;
    const roles = g === "dirigentes" ? ["dirigente"] : g === "coordinacion" ? ["admin", "coordinador"] : TEAM;
    compose.group = g; compose.to = new Set((people || []).filter((p) => roles.includes(p.role) && p.uid !== me()).map((p) => p.uid)); paint();
  };
  document.addEventListener("change", (e) => {
    if (!compose) return;
    if (e.target.name === "avKind") { readForm(); compose.kind = e.target.value; paint(); }
    if (e.target.dataset && e.target.dataset.avTo) { readForm(); e.target.checked ? compose.to.add(e.target.dataset.avTo) : compose.to.delete(e.target.dataset.avTo); compose.group = ""; paint(); }
  });
  A.avSend = async (el) => {
    readForm(); const c = compose;
    if (!c.title.trim()) return toast("Escribe un título", "");
    if (!c.to.size) return toast("Elige a quién enviarlo", "");
    const toNames = {}; (people || []).forEach((p) => { if (c.to.has(p.uid)) toNames[p.uid] = String(p.name || "").slice(0, 60); });
    el.disabled = true;
    try { await ctx.cloud.createAviso({ kind: c.kind, title: c.title.trim(), text: c.text.trim(), due: c.kind === "tarea" ? c.due : "", to: [...c.to], toNames });
      compose = null; tab = "enviados"; toast("Aviso enviado", "ok"); paint(); }
    catch (e) { el.disabled = false; toast("No se pudo enviar: " + (e.code === "permission-denied" ? "faltan las reglas de Firestore" : e.code || e.message), ""); }
  };
}
