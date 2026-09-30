// Chat de Ágape: salas grupales en tiempo real (general, equipo coordinador,
// dirigentes y aspirantes). No hay mensajes privados: lo privado queda fuera de la app.

import { esc, icon, toast, initials } from "./util.js";
import { illus } from "./ilustraciones.js";

let ctx = null; // { actions, render, onAfterRender, onLeave, cloud }
export function setup(c) { ctx = c; registerActions(); }
const $ = (s, r = document) => r.querySelector(s);
const st = () => ctx.cloud.state();
let msgs = null, current = null;
const SALA_ILLUS = { general: "comunidad", coordinacion: "mesa", dirigentes: "equipo", aspirantes: "camino" };
const SALA_COLOR = { general: "#8ad2fa", coordinacion: "#ffba03", dirigentes: "#1351a4", aspirantes: "#ef591c" };

export function tabs(active) {
  return `<nav class="wall-tabs row-wrap" aria-label="Muro y chat">
    <a class="btn btn-sm ${active === "muro" ? "btn-primary" : "btn-ghost"}" href="#/muro">${icon("sparkle")} Muro</a>
    <a class="btn btn-sm ${active === "chat" ? "btn-primary" : "btn-ghost"}" href="#/chat">${icon("chat")} Chat</a>
  </nav>`;
}
function gate() {
  const s = st();
  if (!s.enabled) return `<div class="note">El chat necesita conexión con las cuentas de la pastoral.</div>`;
  if (s.ready) return "";
  if (s.status === "not-invited") return `<div class="note">Entraste con un correo que aún no está invitado. Pide al equipo coordinador que te invite.</div>`;
  if (s.status === "inactive") return `<div class="note">Tu cuenta está en pausa. Conversa con el equipo coordinador.</div>`;
  return `<div class="card wall-join"><span class="tile-ico tile-brand" style="margin:0">${icon("chat")}</span>
    <div style="flex:1"><strong>El chat es para quienes tienen cuenta</strong><p class="muted small">Ingresa con la cuenta con que te invitaron.</p></div>
    <button class="btn btn-primary btn-sm" data-action="signIn">Ingresar</button></div>`;
}
const when = (ts) => {
  const d = ts && ts.toDate ? ts.toDate() : null;
  return d ? d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" }) : "";
};
const dayOf = (ts) => {
  const d = ts && ts.toDate ? ts.toDate() : null;
  if (!d) return "Hoy";
  const t = new Date(); t.setHours(0, 0, 0, 0);
  const x = new Date(d); x.setHours(0, 0, 0, 0);
  const diff = (t - x) / 86400000;
  return diff === 0 ? "Hoy" : diff === 1 ? "Ayer" : d.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" });
};
const linkify = (v) => esc(v).replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)\]])/g, '<a href="$1" target="_blank" rel="noopener">$1</a>').replace(/\n/g, "<br>");

// ---------------------------------------------------------------------------
// Lista de salas  (#/chat)
// ---------------------------------------------------------------------------
export function viewRooms() {
  const g = gate();
  const salas = ctx.cloud.SALAS.filter((s) => ctx.cloud.mySalas().includes(s.key));
  if (!g) ctx.onAfterRender(async () => {
    for (const s of salas) {
      const m = await ctx.cloud.lastChat(s.key);
      const el = document.querySelector(`[data-last="${s.key}"]`);
      if (el) el.textContent = m ? `${m.authorName}: ${m.text.slice(0, 70)}${m.text.length > 70 ? "…" : ""}` : "Aún no hay mensajes. ¡Saluda!";
    }
  });
  return `
  <header class="page-head"><span class="eyebrow">Chat de la comunidad</span><h1>Conversemos <em>juntos</em></h1>
    <p>Salas de grupo para coordinarnos y compartir. Todo lo que se escribe aquí lo ven los integrantes de la sala; para temas personales o privados, usa otro canal con tu acompañante.</p></header>
  ${tabs("chat")}
  ${g || `<div class="chat-rooms">${salas.map((s) => `<a class="card link chat-room" href="#/chat/${s.key}" style="--sc:${SALA_COLOR[s.key]}">
      <span class="chat-room-ill">${illus(SALA_ILLUS[s.key])}</span>
      <span class="chat-room-body"><h3>${esc(s.name)}</h3><span class="muted small">${esc(s.desc)}</span>
      <span class="chat-last small" data-last="${s.key}">…</span></span>${icon("right")}
    </a>`).join("")}</div>
    <p class="xs muted" style="margin-top:16px">¿No ves una sala que te corresponde? El equipo coordinador asigna las salas desde Gestión.</p>`}`;
}

// ---------------------------------------------------------------------------
// Una sala  (#/chat/:sala)
// ---------------------------------------------------------------------------
export function viewRoom(key) {
  const g = gate();
  const sala = ctx.cloud.SALAS.find((s) => s.key === key);
  if (!sala) return null;
  if (!g && !ctx.cloud.mySalas().includes(key)) {
    return `${tabs("chat")}<div class="card" style="text-align:center;padding:32px"><h2 class="display">Esta sala no es para tu cuenta</h2>
      <p class="muted" style="margin-top:8px">Si crees que deberías estar, pídelo al equipo coordinador.</p>
      <a class="btn btn-primary" style="margin-top:14px" href="#/chat">Ver mis salas</a></div>`;
  }
  if (current !== key) { current = key; msgs = null; }
  if (!g) ctx.onAfterRender(() => {
    const stop = ctx.cloud.watchChat(key, (rows) => { msgs = rows; paint(); }, () => { msgs = msgs || []; paint(true); });
    ctx.onLeave(stop);
    paint();
    $("#chatText")?.focus({ preventScroll: true });
  });
  return `
  <div class="chat-head" style="--sc:${SALA_COLOR[key]}">
    <a class="icon-btn" href="#/chat" aria-label="Volver a las salas">${icon("arrowL")}</a>
    <span class="chat-head-dot"></span>
    <div style="flex:1;min-width:0"><h1>${esc(sala.name)}</h1><span class="xs muted">${esc(sala.desc)}</span></div>
  </div>
  ${g || `<div class="chat-box card">
    <div class="chat-list" id="chatList" aria-live="polite"><div class="muted small" style="text-align:center;padding:30px">Cargando…</div></div>
    <form class="chat-compose" id="chatForm" data-sala="${esc(key)}">
      <textarea id="chatText" class="textarea" rows="1" maxlength="1500" placeholder="Escribe un mensaje…" aria-label="Mensaje"></textarea>
      <button class="btn btn-primary" type="submit" aria-label="Enviar">${icon("send")}</button>
    </form>
  </div>
  <p class="xs muted" style="margin-top:10px;text-align:center">Lo que escribes lo ven todos los integrantes de esta sala. Si algo no corresponde, repórtalo desde el menú del mensaje.</p>`}`;
}

function paint(err) {
  const box = $("#chatList");
  if (!box) return;
  if (err && !msgs.length) { box.innerHTML = `<div class="note">No pudimos cargar los mensajes. Revisa tu conexión.</div>`; return; }
  if (!msgs) return;
  const me = ctx.cloud.myUid(), admin = st().isStaff;
  const nearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 120;
  if (!msgs.length) {
    box.innerHTML = `<div class="chat-empty">${illus("amigos")}<p class="muted">Todavía no hay mensajes. ¡Rompe el hielo!</p></div>`;
    return;
  }
  let lastDay = "", lastAuthor = "";
  box.innerHTML = msgs.map((m) => {
    const day = dayOf(m.createdAt);
    const sep = day !== lastDay ? `<div class="chat-day"><span>${esc(day)}</span></div>` : "";
    if (sep) lastAuthor = "";
    lastDay = day;
    const mine = m.authorUid === me;
    const cont = lastAuthor === m.authorUid;
    lastAuthor = m.authorUid;
    const reps = Object.keys(m.reports || {}).length;
    const myRep = !!(m.reports && m.reports[me]);
    const opts = [];
    if (mine || admin) opts.push(`<button data-action="chatDelete" data-id="${esc(m.id)}">${icon("trash")} Borrar</button>`);
    if (!mine) opts.push(`<button data-action="chatReport" data-id="${esc(m.id)}" data-on="${myRep ? 0 : 1}">${icon("x")} ${myRep ? "Quitar mi reporte" : "Reportar"}</button>`);
    return `${sep}<div class="chat-msg ${mine ? "mine" : ""} ${cont ? "cont" : ""}">
      ${!mine && !cont ? `<span class="avatar ${ctx.cloud.isStaffRole(m.authorRole) ? "staff" : ""}">${esc(initials(m.authorName))}</span>` : `<span class="avatar-space"></span>`}
      <div class="chat-bubble">
        ${!mine && !cont ? `<b class="chat-name">${esc(m.authorName)}${ctx.cloud.isStaffRole(m.authorRole) ? ` <span class="chip warn xs-chip">Equipo</span>` : ""}</b>` : ""}
        <div class="chat-text">${linkify(m.text)}</div>
        <span class="chat-meta">${when(m.createdAt)}${admin && reps ? ` · <span class="chip danger xs-chip">Reportado ${reps}</span>` : ""}</span>
      </div>
      <details class="wall-menu chat-menu"><summary class="icon-btn" aria-label="Opciones del mensaje"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg></summary><div class="wall-menu-list">${opts.join("")}</div></details>
    </div>`;
  }).join("");
  if (nearBottom || !box.dataset.ready) { box.scrollTop = box.scrollHeight; box.dataset.ready = "1"; }
}

function registerActions() {
  const A = ctx.actions;
  const close = (el) => { const d = el.closest("details"); if (d) d.open = false; };
  A.chatDelete = (el) => {
    close(el);
    if (!confirm("¿Borrar este mensaje para todos?")) return;
    ctx.cloud.deleteChat(current, el.dataset.id).catch(() => toast("No se pudo borrar", ""));
  };
  A.chatReport = (el) => {
    close(el);
    const on = el.dataset.on === "1";
    if (on && !confirm("¿Reportar este mensaje al equipo coordinador?")) return;
    ctx.cloud.reportChat(current, el.dataset.id, on).then(() => toast(on ? "Gracias. El equipo lo revisará." : "Reporte retirado")).catch(() => toast("No se pudo guardar", ""));
  };
  const send = async (form) => {
    const ta = form.querySelector("textarea");
    const text = ta.value.trim();
    if (!text) return;
    ta.value = ""; ta.style.height = "";
    try { await ctx.cloud.sendChat(form.dataset.sala, text); const b = $("#chatList"); if (b) b.scrollTop = b.scrollHeight; }
    catch (e) { console.warn(e); toast("No se pudo enviar. Revisa tu conexión.", ""); if (!ta.value) ta.value = text; }
  };
  document.addEventListener("submit", (e) => { if (e.target.id === "chatForm") { e.preventDefault(); send(e.target); } });
  document.addEventListener("keydown", (e) => {
    if (e.target.id === "chatText" && e.key === "Enter" && !e.shiftKey && !e.isComposing && matchMedia("(pointer: fine)").matches) {
      e.preventDefault(); send(e.target.form);
    }
  });
  document.addEventListener("input", (e) => {
    if (e.target.id !== "chatText") return;
    e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 140) + "px";
  });
}
