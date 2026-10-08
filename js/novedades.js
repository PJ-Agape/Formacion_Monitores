// Campanita de novedades: un punto rojo en la cabecera cuando hay algo nuevo desde tu última
// visita (velas encendidas, publicaciones del muro, actividades de la agenda). Todo queda en la
// app: no hay notificaciones del teléfono ni correos. Lo «ya visto» se guarda en este dispositivo.

import * as cloud from "./cloud.js";
import { esc, icon } from "./util.js";

const DAY = 86400000;
let items = [], lastFetch = 0, loading = null, open = false;
const key = () => `agape_novedades_${cloud.myUid()}`;
const ms = (t) => (t && t.toDate ? t.toDate().getTime() : t && t.seconds ? t.seconds * 1000 : typeof t === "string" ? Date.parse(t) || 0 : 0);
function seen() {
  try { const v = +localStorage.getItem(key()); if (v) return v; } catch {}
  return Date.now() - 3 * DAY; // la primera vez, muestra lo de los últimos 3 días
}
function markSeen() { try { localStorage.setItem(key(), String(Date.now())); } catch {} }
const unread = () => { const s = seen(); return items.filter((x) => x.ts > s); };
const ago = (t) => {
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 2) return "recién"; if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60); if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24); return d === 1 ? "ayer" : `hace ${d} días`;
};
const short = (t, n = 70) => { t = String(t || "").replace(/\s+/g, " ").trim(); return t.length > n ? t.slice(0, n - 1) + "…" : t; };

async function fetchAll() {
  const me = cloud.myUid(), since = Date.now() - 14 * DAY;
  const [velas, wall, agenda] = await Promise.all([cloud.recentVelas(20), cloud.latestWall(), cloud.listAgenda()]);
  const out = [];
  velas.forEach((v) => { const ts = ms(v.createdAt); if (ts > since && v.authorUid !== me) out.push({ ts, e: "🕯️", href: "#/oracion/velas", vela: true,
    t: `${v.authorName || "Alguien"} encendió una vela`, d: v.text ? `«${short(v.text)}»` : "Una intención en silencio. ¿Rezas por ella?" }); });
  wall.filter((p) => !p.hidden).forEach((p) => { const ts = ms(p.createdAt); if (ts > since && p.authorUid !== me) out.push({ ts, e: p.type === "anuncio" ? "📢" : p.type === "logro" ? "🏅" : p.type === "encuesta" ? "📊" : "💬",
    href: `#/muro/${encodeURIComponent(p.id)}`, t: p.type === "anuncio" ? "Nuevo aviso en el muro" : p.type === "logro" ? "Un nuevo logro en el muro" : p.type === "encuesta" ? "Nueva encuesta" : `${p.authorName || "Alguien"} publicó en el muro`, d: short(p.title || p.body) }); });
  agenda.forEach((e) => { const ts = ms(e.updatedAt); if (ts > since && e.title && (!e.date || e.date >= new Date(Date.now() - DAY).toISOString().slice(0, 10))) out.push({ ts, e: "📅", href: e.date ? `#/agenda/${e.date}` : "#/agenda",
    t: "Novedad en la agenda", d: short(`${e.title}${e.date ? " · " + e.date.split("-").reverse().join("/") : ""}`) }); });
  items = out.sort((a, b) => b.ts - a.ts).slice(0, 25);
}
export async function refresh(force) {
  if (!cloud.enabled || !cloud.state().ready) { items = []; paint(); return; }
  if (!force && Date.now() - lastFetch < 3 * 60000) { paint(); return; }
  if (loading) return loading;
  lastFetch = Date.now();
  loading = fetchAll().catch(() => {}).finally(() => { loading = null; paint(); });
  return loading;
}

// Botón en la cabecera (lo llama renderChrome en cada vista)
export function mount() {
  const chip = document.getElementById("profileChip"); if (!chip) return;
  let b = document.getElementById("bellBtn");
  const show = cloud.enabled && cloud.state().ready;
  if (!show) { if (b) b.remove(); document.getElementById("bellPanel")?.remove(); return; }
  if (!b) {
    const anchor = document.getElementById("hdrSearch") || chip;
    anchor.insertAdjacentHTML("beforebegin", `<button class="hdr-bell" id="bellBtn" type="button" aria-haspopup="true" aria-expanded="false" aria-label="Novedades">${bellSVG}<span class="bell-dot" hidden></span></button>`);
    b = document.getElementById("bellBtn");
    b.addEventListener("click", (e) => { e.stopPropagation(); toggle(); });
  }
  closePanel();
  paint();
  refresh();
}
const bellSVG = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>`;
function paint() {
  const n = unread().length, b = document.getElementById("bellBtn");
  if (b) {
    const dot = b.querySelector(".bell-dot");
    dot.hidden = !n; dot.textContent = n > 9 ? "9+" : String(n);
    b.setAttribute("aria-label", n ? `Novedades: ${n} sin ver` : "Novedades");
  }
  const strip = document.getElementById("velaStrip");
  if (strip) {
    const v = unread().filter((x) => x.vela);
    strip.innerHTML = v.length ? `<a class="card link vela-strip" href="#/oracion/velas"><span class="vela-strip-e" aria-hidden="true">🕯️</span>
      <span style="flex:1;min-width:0"><strong>${v.length === 1 ? "Hay una vela nueva encendida" : `Hay ${v.length} velas nuevas encendidas`}</strong>
      <span class="muted small">${esc(v[0].d)}</span></span><span class="btn btn-sm btn-gold">Rezar 🙏</span></a>` : "";
  }
}
function toggle() { open ? closePanel() : openPanel(); }
function openPanel() {
  const b = document.getElementById("bellBtn"); if (!b) return;
  const s = seen();
  let p = document.getElementById("bellPanel");
  if (!p) { p = document.createElement("div"); p.id = "bellPanel"; p.className = "bell-panel"; p.setAttribute("role", "dialog"); p.setAttribute("aria-label", "Novedades"); document.body.appendChild(p); }
  p.innerHTML = `<div class="bell-head"><strong>Novedades</strong><button type="button" class="bell-x" aria-label="Cerrar">${icon("x")}</button></div>
    ${items.length ? `<div class="bell-list">${items.slice(0, 15).map((x) => `<a class="bell-i ${x.ts > s ? "new" : ""}" href="${esc(x.href)}">
      <span class="bell-e" aria-hidden="true">${x.e}</span><span><b>${esc(x.t)}</b><small>${esc(x.d)}</small><em>${ago(x.ts)}</em></span></a>`).join("")}</div>`
      : `<p class="bell-empty">${loading ? "Buscando novedades…" : "Todo tranquilo por ahora. Cuando alguien encienda una vela o publique algo, lo verás aquí."}</p>`}`;
  p.querySelector(".bell-x").onclick = closePanel;
  p.querySelectorAll(".bell-i").forEach((a) => a.addEventListener("click", closePanel));
  const r = b.getBoundingClientRect();
  p.style.top = `${r.bottom + 8}px`; const w = Math.min(380, innerWidth - 16); p.style.left = `${Math.max(8, Math.min(innerWidth - w - 8, r.right - w + 8))}px`;
  p.hidden = false; open = true; b.setAttribute("aria-expanded", "true");
  markSeen(); paint();
}
function closePanel() {
  const p = document.getElementById("bellPanel"); if (p) p.hidden = true;
  open = false; document.getElementById("bellBtn")?.setAttribute("aria-expanded", "false");
}
document.addEventListener("click", (e) => { if (open && !e.target.closest("#bellPanel")) closePanel(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && open) closePanel(); });
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") refresh(); });
setInterval(() => { if (document.visibilityState === "visible") refresh(); }, 5 * 60000);
// Al encender tu propia vela o publicar, vuelve a mirar al rato
export const poke = () => { lastFetch = 0; };
