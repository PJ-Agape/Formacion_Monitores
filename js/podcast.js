// Podcast Ágape: el espacio para los episodios (por ahora, enlaces a YouTube u otra plataforma).
// Mientras no hay episodios se muestra como «Próximamente». Los administradores agregan
// episodios y el enlace del canal desde esta misma página (se guarda en content/podcast).
import { esc, icon, toast } from "./util.js";
import { okUrl, ytId } from "./portada.js";

let ctx = null; // { actions, render, onAfterRender, cloud }
export function setup(c) { ctx = c; registerActions(); }
const $ = (s, r = document) => r.querySelector(s);
const st = () => ctx.cloud.state();

const CACHE = "agape_podcast_v1";
let data = null; // { name, intro, channel, episodes: [{ id, title, url, date, desc }] }
try { data = JSON.parse(localStorage.getItem(CACHE) || "null"); } catch { data = null; }
const D = () => ({ name: "", intro: "", channel: "", episodes: [], ...(data || {}) });
const episodes = () => (D().episodes || []).filter((e) => e && e.title && okUrl(e.url)).sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
export const hasEpisodes = () => episodes().length > 0;

async function load() {
  if (!ctx.cloud.getPodcast) return false;
  const d = await ctx.cloud.getPodcast(); if (!d) return false;
  const changed = JSON.stringify(d) !== JSON.stringify(data || {});
  data = d; try { localStorage.setItem(CACHE, JSON.stringify(d)); } catch { /* */ }
  return changed;
}
// Para la franja de Inicio: refresca en silencio.
export function refreshQuiet(after) { load().then((c) => { if (c && after) after(); }).catch(() => {}); }

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const fdate = (s) => { if (!/^\d{4}-\d{2}-\d{2}$/.test(s || "")) return ""; const [y, m, d] = s.split("-").map(Number); return `${d} ${MESES[m - 1]} ${y}`; };
const PLAT = { "spotify.com": "Spotify", "youtube.com": "YouTube", "youtu.be": "YouTube", "music.apple.com": "Apple Podcasts", "podcasts.apple.com": "Apple Podcasts", "ivoox.com": "iVoox", "soundcloud.com": "SoundCloud", "instagram.com": "Instagram", "facebook.com": "Facebook", "tiktok.com": "TikTok" };
const host = (u) => { try { const h = new URL(u).hostname.replace(/^www\.|^open\.|^m\./, ""); return PLAT[h] || PLAT[h.split(".").slice(-2).join(".")] || h; } catch { return ""; } };
export const MIC = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0"/><path d="M12 17.5V21M8.5 21h7"/></svg>`;

// ---------------------------------------------------------------------------
// Vista
// ---------------------------------------------------------------------------
export function view() {
  ctx.onAfterRender(() => load().then((c) => { if (c && location.hash.startsWith("#/podcast")) paint(); }));
  return `<div id="podRoot">${inner()}</div>`;
}
function paint() { const r = $("#podRoot"); if (r) r.innerHTML = inner(); }
function inner() {
  const d = D(), eps = episodes(), admin = st().isAdmin;
  const name = d.name || "Podcast Ágape";
  return `<header class="pod-hero">
      <span class="pod-mic" aria-hidden="true">${MIC}</span>
      <div><span class="pod-kicker">${eps.length ? `${eps.length} episodio${eps.length > 1 ? "s" : ""}` : "Próximamente"}</span>
        <h1>${esc(name)}</h1>
        <p>${esc(d.intro || `Conversaciones de jóvenes para jóvenes: fe, vida, preguntas y lo que vivimos en comunidad.${eps.length ? "" : " Muy pronto, el primer episodio."}`)}</p>
        ${okUrl(d.channel) ? `<a class="btn btn-gold" href="${esc(d.channel)}" target="_blank" rel="noopener">${icon("eye")} Ir al canal</a>` : ""}
      </div></header>
    ${admin ? `<div class="row-wrap pod-admin"><button class="btn btn-primary btn-sm" data-action="podEp">${icon("plus")} Agregar episodio</button>
      <button class="btn btn-soft btn-sm" data-action="podCfg">${icon("edit")} Datos del podcast</button></div>` : ""}
    ${eps.length ? `<div class="pod-list">${eps.map((e, i) => epHTML(e, i === 0, admin)).join("")}</div>` : soonHTML()}`;
}
function soonHTML() {
  return `<section class="pod-soon">
    <h2>Estamos preparando el primer episodio</h2>
    <p>¿Tienes un tema que te gustaría escuchar, una pregunta o te animas a participar? Cuéntanos en el muro de la comunidad.</p>
    <a class="btn btn-soft" href="#/muro">${icon("chat")} Proponer un tema</a></section>`;
}
function epHTML(e, latest, admin) {
  const yt = ytId(e.url).replace(/[^\w-]/g, "");
  const open = playing === e.id && yt;
  return `<article class="pod-ep${latest ? " is-new" : ""}">
    ${open ? `<div class="pod-frame"><iframe src="https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&rel=0" title="${esc(e.title)}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe></div>`
      : yt ? `<button class="pod-thumb" data-action="podPlay" data-id="${esc(e.id)}" aria-label="Reproducir ${esc(e.title)}"><img src="https://i.ytimg.com/vi/${yt}/hqdefault.jpg" alt="" loading="lazy"><i class="car-link-play" aria-hidden="true"></i></button>`
      : `<a class="pod-thumb is-link" href="${esc(e.url)}" target="_blank" rel="noopener" aria-label="Escuchar ${esc(e.title)}">${MIC}<small>${esc(host(e.url))}</small></a>`}
    <div class="pod-txt">
      ${latest ? `<span class="pod-badge">Último episodio</span>` : ""}
      <h3>${esc(e.title)}</h3>
      ${e.date ? `<small class="muted">${fdate(e.date)}</small>` : ""}
      ${e.desc ? `<p>${esc(e.desc)}</p>` : ""}
      <div class="row-wrap" style="gap:8px"><a class="btn btn-ghost btn-sm" href="${esc(e.url)}" target="_blank" rel="noopener">Abrir en ${esc(yt ? "YouTube" : host(e.url))} ↗</a>
        ${admin ? `<button class="btn btn-ghost btn-sm" data-action="podEp" data-id="${esc(e.id)}">${icon("edit")} Editar</button>` : ""}</div>
    </div></article>`;
}
let playing = null;

// ---------------------------------------------------------------------------
// Edición (administradores)
// ---------------------------------------------------------------------------
function dialog(html) {
  let d = document.getElementById("podDlg");
  if (!d) { d = document.createElement("dialog"); d.id = "podDlg"; d.className = "sheet"; document.body.appendChild(d); }
  d.innerHTML = html; d.showModal(); return d;
}
const foot = (del) => `<div class="sheet-foot">${del ? `<button type="button" class="btn btn-danger btn-sm" data-action="podDel" data-id="${esc(del)}">${icon("trash")} Borrar</button>` : ""}<span class="spacer"></span>
  <button type="button" class="btn btn-ghost" data-action="podClose">Cancelar</button><button class="btn btn-primary" type="submit">Guardar</button></div>`;
async function save(next, msg) {
  const prev = data; data = next;
  try { await ctx.cloud.savePodcast(next); try { localStorage.setItem(CACHE, JSON.stringify(next)); } catch { /* */ } toast(msg); }
  catch (e) { console.warn(e); data = prev; toast("No se pudo guardar. Revisa tu conexión.", ""); }
  document.getElementById("podDlg")?.close(); paint();
}
function registerActions() {
  const A = ctx.actions;
  A.podClose = () => document.getElementById("podDlg")?.close();
  A.podPlay = (el) => { playing = el.dataset.id; paint(); };
  A.podCfg = () => {
    const d = D();
    dialog(`<form method="dialog" id="podCfgForm"><div class="sheet-head"><div style="flex:1"><span class="eyebrow">Podcast</span><h2>Datos del podcast</h2></div>
      <button type="button" class="icon-btn" data-action="podClose" aria-label="Cerrar">${icon("x")}</button></div>
      <div class="sheet-body stack" style="--gap:12px">
        <div class="field"><label>Nombre</label><input class="input" name="name" maxlength="60" value="${esc(d.name)}" placeholder="Podcast Ágape"></div>
        <div class="field"><label>De qué se trata</label><textarea class="textarea" name="intro" rows="3" maxlength="280" placeholder="Conversaciones de jóvenes para jóvenes…">${esc(d.intro)}</textarea></div>
        <div class="field"><label>Enlace del canal</label><input class="input" name="channel" type="url" maxlength="400" value="${esc(d.channel)}" placeholder="https://youtube.com/@…">
          <span class="xs muted">Cuando exista el canal, pega aquí su enlace. Aparece el botón «Ir al canal».</span></div>
      </div>${foot()}</form>`);
  };
  A.podEp = (el) => {
    const e = (D().episodes || []).find((x) => x.id === el.dataset.id) || { date: new Date().toISOString().slice(0, 10) };
    dialog(`<form method="dialog" id="podEpForm" data-id="${esc(e.id || "")}"><div class="sheet-head"><div style="flex:1"><span class="eyebrow">Podcast</span><h2>${e.id ? "Editar episodio" : "Nuevo episodio"}</h2></div>
      <button type="button" class="icon-btn" data-action="podClose" aria-label="Cerrar">${icon("x")}</button></div>
      <div class="sheet-body stack" style="--gap:12px">
        <div class="field"><label>Título</label><input class="input" name="title" required maxlength="100" value="${esc(e.title || "")}" placeholder="Ep. 1 · ¿Por qué seguir yendo a misa?"></div>
        <div class="field"><label>Enlace</label><input class="input" name="url" type="url" required maxlength="400" value="${esc(e.url || "")}" placeholder="https://youtu.be/… o Spotify, etc.">
          <span class="xs muted">Si es de YouTube, se puede ver aquí mismo en la app.</span></div>
        <div class="field"><label>Fecha</label><input class="input" name="date" type="date" value="${esc(e.date || "")}"></div>
        <div class="field"><label>Descripción breve</label><textarea class="textarea" name="desc" rows="3" maxlength="400">${esc(e.desc || "")}</textarea>
          <span class="xs muted">Si participan jóvenes, solo nombre e inicial del apellido.</span></div>
      </div>${foot(e.id)}</form>`);
  };
  A.podDel = (el) => {
    if (!confirm("¿Borrar este episodio de la app? (El video sigue en YouTube.)")) return;
    const d = D(); save({ ...d, episodes: d.episodes.filter((x) => x.id !== el.dataset.id) }, "Episodio borrado");
  };
  document.addEventListener("submit", (ev) => {
    const f = ev.target;
    if (f.id === "podCfgForm") {
      ev.preventDefault(); const g = (k) => String(new FormData(f).get(k) || "").trim();
      if (g("channel") && !okUrl(g("channel"))) { toast("Revisa el enlace del canal (debe empezar con https://)", ""); return; }
      save({ ...D(), name: g("name"), intro: g("intro"), channel: g("channel") }, "Podcast actualizado");
    }
    if (f.id === "podEpForm") {
      ev.preventDefault(); const g = (k) => String(new FormData(f).get(k) || "").trim();
      if (!g("title") || !okUrl(g("url"))) { toast("Falta el título o el enlace no es válido", ""); return; }
      const d = D(), id = f.dataset.id || "e" + Date.now().toString(36);
      const ep = { id, title: g("title"), url: g("url"), date: g("date"), desc: g("desc") };
      const list = (d.episodes || []).filter((x) => x.id !== id).concat(ep);
      save({ ...d, episodes: list }, f.dataset.id ? "Episodio actualizado" : "Episodio agregado");
    }
  });
}
