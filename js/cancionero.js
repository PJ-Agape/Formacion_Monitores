// Cancionero Ágape: canciones con acordes por momento de la misa, cambio de tono,
// notación americana o latina, modo proyección y repertorios para cada celebración.
// Las canciones originales de Ágape vienen incluidas; el equipo agrega las que canta la comunidad.

import { esc, icon, toast } from "./util.js";
import { ID } from "./identidad.js";

let ctx = null; // { actions, render, onAfterRender, onLeave, cloud }
export function setup(c) { ctx = c; registerActions(); }
const $ = (s, r = document) => r.querySelector(s);
const st = () => ctx.cloud.state();
const canEdit = () => !!st().canSongs; // equipo + apostolado del cancionero

export const MOMENTOS = [
  ["entrada", "Entrada"], ["perdon", "Perdón"], ["gloria", "Gloria"], ["salmo", "Salmo"], ["aleluya", "Aleluya"],
  ["ofertorio", "Ofertorio"], ["santo", "Santo"], ["paz", "Paz"], ["cordero", "Cordero"], ["comunion", "Comunión"],
  ["accion", "Acción de gracias"], ["maria", "María"], ["salida", "Salida y envío"], ["adoracion", "Adoración"], ["juvenil", "Juvenil y animación"],
];
const MLABEL = Object.fromEntries(MOMENTOS);
const SLOTS = ["entrada", "perdon", "gloria", "salmo", "aleluya", "ofertorio", "santo", "paz", "cordero", "comunion", "comunion2", "accion", "maria", "salida"];
const slotLabel = (k) => (k === "comunion2" ? "Comunión (2)" : MLABEL[k]);

// ---------------------------------------------------------------------------
// Canciones originales de la Pastoral Juvenil Ágape (libres para la comunidad)
// ---------------------------------------------------------------------------
const ORIGINALES = [
  { id: "ag-himno", builtin: true, title: "Amor que transforma", author: "Himno Ágape · original de la pastoral", momentos: ["entrada", "juvenil", "salida"],
    body: `Estrofa 1:
[G]Somos jóvenes de [D]Yungay
[Em]caminando junto a [C]Ti,
[G]con la mochila de [D]la fe
[C]y un corazón que quiere ser[D]vir.

Coro:
[G]Amor que trans[D]forma,
[Em]amor que se [C]da,
[G]Ágape es tu [D]nombre,
[C]Jesús, nuestro ho[D]gar.
[G]Amor que trans[D]forma,
[Em]nos hace her[C]manos,
[G]tómanos las [D]manos,
[C]llévanos a a[D]mar. [G]

Estrofa 2:
[G]Cuando el camino se hace [D]largo
[Em]y no sé hacia dónde [C]ir,
[G]Tú me miras con [D]cariño
[C]y me enseñas a se[D]guir.

Estrofa 3:
[G]Puente quiero ser, Se[D]ñor,
[Em]entre Tú y mi a[C]migo:
[G]que en mi forma de [D]mirar
[C]te descubra a Ti con[D]migo.` },
  { id: "ag-aleluya", builtin: true, title: "Aleluya Ágape", author: "Original de la pastoral", momentos: ["aleluya"],
    body: `Coro:
[G]Ale[D]luya, [Em]ale[C]luya,
[G]ale[D]luya, a[C]le[D]lu[G]ya.

Estrofa:
[Em]Tu Palabra es [C]luz, Señor,
[G]que ilumina mi ca[D]mino;
[Em]hoy la quiero es[C]cuchar
[G]con el cora[D]zón abier[G]to.` },
  { id: "ag-ofrenda", builtin: true, title: "Te ofrecemos", author: "Original de la pastoral", momentos: ["ofertorio"],
    body: `Estrofa 1:
[D]Pan y vino te trae[A]mos,
[Bm]fruto de la tierra y del tra[G]bajo;
[D]con ellos va nuestra se[A]mana,
[G]lo que reímos y llo[A]ramos.

Coro:
[D]Te ofrecemos, Se[A]ñor, lo que somos,
[Bm]nuestras manos, nuestra juven[G]tud;
[D]todo es tuyo, re[A]cíbelo,
[G]hazlo nuevo con tu a[A]mor. [D]

Estrofa 2:
[D]Te traemos a los a[A]migos,
[Bm]a los que hoy no pudieron ve[G]nir;
[D]pon en ellos tu ca[A]riño,
[G]que también te puedan sen[A]tir.` },
];

// ---------------------------------------------------------------------------
// Acordes: lectura en notación americana (C, Am7, F#m, Bb, D/F#) o latina (Do, Lam, Sol7, Sib)
// ---------------------------------------------------------------------------
const SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11, DO: 0, RE: 2, MI: 4, FA: 5, SOL: 7, LA: 9, SI: 11 };
const NAMES = { us: ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "G#", "A", "Bb", "B"], lat: ["Do", "Do#", "Re", "Mib", "Mi", "Fa", "Fa#", "Sol", "Sol#", "La", "Sib", "Si"] };
function parseNote(s) {
  const m = /^(Do|Re|Mi|Fa|Sol|La|Si)(#|b)?(.*)$/i.exec(s) || /^([A-G])(#|b)?(.*)$/.exec(s);
  if (!m) return null;
  let n = SEMI[m[1].toUpperCase()]; if (n == null) return null;
  if (m[2] === "#") n++; if (m[2] === "b") n--;
  return { n: (n + 12) % 12, rest: m[3] };
}
function chordName(raw, shift, nota) {
  return raw.split("/").map((part, i) => {
    const p = parseNote(part.trim());
    if (!p) return part;
    return NAMES[nota][(p.n + shift + 120) % 12] + (i === 0 ? p.rest : "");
  }).join("/");
}
const firstChord = (body) => { const m = /\[([^\]]+)\]/.exec(body || ""); return m ? m[1] : ""; };

// ---------------------------------------------------------------------------
// Preferencias de lectura (por dispositivo)
// ---------------------------------------------------------------------------
const PK = `${ID.prefijo}_cancionero`;
let prefs = { nota: "us", chords: true, size: 1, shift: {} };
try { prefs = { ...prefs, ...JSON.parse(localStorage.getItem(PK) || "{}") }; } catch {}
const savePrefs = () => { try { localStorage.setItem(PK, JSON.stringify(prefs)); } catch {} };

// ---------------------------------------------------------------------------
// Datos
// ---------------------------------------------------------------------------
let songs = null, misas = null, query = "", momento = "", tab = "canciones";
const all = () => [...ORIGINALES, ...(songs || [])].sort((a, b) => a.title.localeCompare(b.title, "es"));
const byId = (id) => all().find((s) => s.id === id);
function watchAll() {
  if (!st().ready) return;
  const a = ctx.cloud.watchCanciones((r) => { songs = r; repaint(); }, () => { songs = songs || []; repaint(); });
  const b = ctx.cloud.watchRepertorios((r) => { misas = r; repaint(); }, () => { misas = misas || []; repaint(); });
  ctx.onLeave(() => { a(); b(); });
}
let repaint = () => {};

const gate = () => {
  const s = st();
  if (s.ready) return "";
  return `<div class="card wall-join"><span class="tile-ico tile-brand" style="margin:0">${icon("book")}</span>
    <div style="flex:1"><strong>Las canciones de la comunidad son para quienes tienen cuenta</strong>
    <p class="muted small">Aquí ves las canciones originales de ${ID.corto}. Ingresa para ver todo el cancionero y los repertorios de cada misa.</p></div>
    ${s.enabled ? `<button class="btn btn-primary btn-sm" data-action="signIn">Ingresar</button>` : ""}</div>`;
};

// ---------------------------------------------------------------------------
// Lista  (#/cancionero)
// ---------------------------------------------------------------------------
export function viewList() {
  const staff = canEdit();
  ctx.onAfterRender(() => { repaint = paintList; watchAll(); paintList(); });
  return `
  <header class="page-head"><span class="eyebrow">Para animar nuestras celebraciones</span><h1>Cancionero <em>${ID.corto}</em></h1>
    <p>Canciones con acordes para cada momento de la misa, en el tono que necesites. Ideal para ensayar y para proyectar.</p></header>
  <nav class="wall-tabs row-wrap" aria-label="Cancionero">
    <button class="btn btn-sm ${tab === "canciones" ? "btn-primary" : "btn-ghost"}" data-action="canTab" data-t="canciones">${icon("book")} Canciones</button>
    <button class="btn btn-sm ${tab === "misas" ? "btn-primary" : "btn-ghost"}" data-action="canTab" data-t="misas">${icon("grid")} Misas y celebraciones</button>
    <span class="spacer"></span><button class="btn btn-sm btn-ghost" data-action="canExport">${icon("dl")} Exportar</button>
    ${staff ? `<button class="btn btn-sm btn-gold" data-action="${tab === "misas" ? "canNewMisa" : "canNew"}">${icon("plus")} ${tab === "misas" ? "Nueva celebración" : "Nueva canción"}</button>` : ""}
  </nav>
  <div class="can-wip">
    <span class="can-wip-tag" aria-hidden="true">🚧</span>
    <div><strong>En construcción</strong>
      <p class="small">Lo vamos armando entre todos, canción por canción. ${canEdit() ? "Gracias por sumarte a este apostolado." : "¿Te gustaría ayudar a completarlo? Pídeselo al equipo."}</p></div>
  </div>
  ${gate()}
  ${tab === "canciones" ? `
  <div class="can-tools">
    <input class="input" id="canSearch" placeholder="Buscar por título, autor o una frase…" value="${esc(query)}" aria-label="Buscar canción">
    <div class="can-chips" role="group" aria-label="Momento">
      <button class="chip ${momento ? "" : "accent"}" data-action="canMom" data-m="">Todas</button>
      ${MOMENTOS.map(([k, l]) => `<button class="chip ${momento === k ? "accent" : ""}" data-action="canMom" data-m="${k}">${esc(l)}</button>`).join("")}
    </div>
  </div>
  <div id="canList" class="can-list"></div>` : `<div id="canMisas" class="can-misas"></div>`}`;
}
function paintList() {
  const box = $("#canList");
  if (box) {
    const q = query.trim().toLowerCase();
    const list = all().filter((s) => (!momento || (s.momentos || []).includes(momento))
      && (!q || (s.title + " " + (s.author || "") + " " + (s.body || "").replace(/\[[^\]]*\]/g, "")).toLowerCase().includes(q)));
    box.innerHTML = list.length ? list.map((s) => `<a class="card link can-item" href="#/cancionero/${encodeURIComponent(s.id)}">
        <span class="can-key">${esc(chordName(firstChord(s.body), prefs.shift[s.id] || 0, prefs.nota) || "♪")}</span>
        <span class="can-main"><strong>${esc(s.title)}</strong><span class="muted small">${esc(s.author || "")}</span>
          <span class="can-moms">${(s.momentos || []).map((m) => `<span class="chip">${esc(MLABEL[m] || m)}</span>`).join("")}${s.builtin ? `<span class="chip warn">Original ${ID.corto}</span>` : ""}</span></span>
        ${icon("right")}</a>`).join("")
      : `<div class="card" style="text-align:center;padding:28px"><p class="muted">${songs === null && st().ready ? "Cargando canciones…" : "No hay canciones con ese filtro."}</p>
         ${canEdit() ? `<button class="btn btn-primary btn-sm" style="margin-top:10px" data-action="canNew">${icon("plus")} Agregar una canción</button>` : ""}</div>`;
  }
  const mb = $("#canMisas");
  if (mb) {
    if (!st().ready) { mb.innerHTML = ""; return; }
    const list = (misas || []).slice().sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
    mb.innerHTML = list.length ? list.map((r) => `<a class="card link can-misa" href="#/cancionero/misa/${encodeURIComponent(r.id)}">
        <span class="can-date">${r.date ? `<b>${esc(r.date.slice(8, 10))}</b><small>${esc(new Date(r.date + "T12:00").toLocaleDateString("es-CL", { month: "short" }))}</small>` : "♪"}</span>
        <span class="can-main"><strong>${esc(r.name)}</strong><span class="muted small">${(r.slots || []).filter((x) => x.id).length} canciones${r.note ? ` · ${esc(r.note)}` : ""}</span></span>${icon("right")}</a>`).join("")
      : `<div class="card" style="text-align:center;padding:28px"><p class="muted">${misas === null ? "Cargando…" : "Aún no hay repertorios. Arma el de la próxima misa y todos lo tendrán en su teléfono."}</p>
         ${canEdit() ? `<button class="btn btn-primary btn-sm" style="margin-top:10px" data-action="canNewMisa">${icon("plus")} Nueva celebración</button>` : ""}</div>`;
  }
}

// ---------------------------------------------------------------------------
// Una canción  (#/cancionero/:id)
// ---------------------------------------------------------------------------
let cur = null, fromMisa = null;
export function viewSong(id, misaId) {
  fromMisa = misaId || null;
  ctx.onAfterRender(() => { repaint = () => paintSong(id); watchAll(); paintSong(id); });
  return `<div id="canSong"><p class="muted" style="padding:30px;text-align:center">Cargando…</p></div>`;
}
function songBody(s, shift, chords = prefs.chords) {
  const lines = String(s.body || "").split("\n");
  return lines.map((ln) => {
    const t = ln.trim();
    if (!t) return `<div class="can-gap"></div>`;
    if (/^[^\[\]]{1,30}:$/.test(t)) return `<div class="can-sec">${esc(t.slice(0, -1))}</div>`;
    if (!chords || !/\[/.test(ln)) return `<div class="can-line">${esc(ln.replace(/\[[^\]]*\]/g, "")) || "&nbsp;"}</div>`;
    const parts = ln.split(/\[([^\]]+)\]/);
    let html = parts[0] ? `<span class="can-seg"><b class="can-ch">&nbsp;</b><span>${esc(parts[0])}</span></span>` : "";
    for (let i = 1; i < parts.length; i += 2) {
      html += `<span class="can-seg"><b class="can-ch">${esc(chordName(parts[i], shift, prefs.nota))}</b><span>${esc(parts[i + 1] || "") || "&nbsp;"}</span></span>`;
    }
    return `<div class="can-line has-ch">${html}</div>`;
  }).join("");
}
function paintSong(id) {
  const box = $("#canSong"); if (!box) return;
  const s = byId(id);
  if (!s) {
    box.innerHTML = songs === null && st().ready ? `<p class="muted" style="padding:30px;text-align:center">Cargando…</p>`
      : `<div class="card" style="text-align:center;padding:30px"><h2 class="display">No encontramos esta canción</h2>${st().ready ? "" : `<p class="muted">Puede que necesites ingresar con tu cuenta.</p>`}<a class="btn btn-primary" style="margin-top:12px" href="#/cancionero">Volver al cancionero</a></div>`;
    return;
  }
  cur = s;
  const shift = prefs.shift[s.id] || 0, key = chordName(firstChord(s.body), shift, prefs.nota);
  const m = fromMisa && (misas || []).find((r) => r.id === fromMisa);
  const seq = m ? (m.slots || []).filter((x) => x.id && byId(x.id)) : [];
  const pos = seq.findIndex((x) => x.id === s.id);
  const prev = pos > 0 ? seq[pos - 1] : null, next = pos >= 0 && pos < seq.length - 1 ? seq[pos + 1] : null;
  box.innerHTML = `
  <nav class="crumbs no-print"><a href="#/cancionero">Cancionero</a>${m ? `${icon("right")}<a href="#/cancionero/misa/${encodeURIComponent(m.id)}">${esc(m.name)}</a>` : ""}${icon("right")}<span>${esc(s.title)}</span></nav>
  <header class="can-head">
    ${m && pos >= 0 ? `<span class="eyebrow">${esc(slotLabel(seq[pos].m))} · ${pos + 1} de ${seq.length}</span>` : `<span class="eyebrow">${(s.momentos || []).map((x) => esc(MLABEL[x] || x)).join(" · ")}</span>`}
    <h1>${esc(s.title)}</h1>
    ${s.author ? `<p class="muted">${esc(s.author)}</p>` : ""}
  </header>
  <div class="can-bar no-print" role="toolbar" aria-label="Opciones de lectura">
    <div class="can-grp" aria-label="Tono"><button class="icon-btn" data-action="canShift" data-d="-1" aria-label="Bajar medio tono">−</button>
      <span class="can-tono">Tono <b>${esc(key || "—")}</b>${shift ? ` <small>(${shift > 0 ? "+" : ""}${shift})</small>` : ""}</span>
      <button class="icon-btn" data-action="canShift" data-d="1" aria-label="Subir medio tono">+</button></div>
    <button class="btn btn-sm btn-ghost" data-action="canNota">${prefs.nota === "us" ? "C D E → Do Re Mi" : "Do Re Mi → C D E"}</button>
    <button class="btn btn-sm ${prefs.chords ? "btn-soft" : "btn-ghost"}" data-action="canChords" aria-pressed="${prefs.chords}">${prefs.chords ? "Ocultar acordes" : "Mostrar acordes"}</button>
    <div class="can-grp"><button class="icon-btn" data-action="canSize" data-d="-1" aria-label="Letra más chica">A−</button><button class="icon-btn" data-action="canSize" data-d="1" aria-label="Letra más grande">A+</button></div>
    <button class="btn btn-sm btn-primary" data-action="canProject" data-scope="song">${icon("eye")} Proyectar</button>
  </div>
  <article class="card can-sheet" style="--can-size:${prefs.size}">${songBody(s, shift)}</article>
  <div class="row-wrap no-print" style="margin-top:14px">
    ${prev ? `<a class="btn btn-ghost" href="#/cancionero/${encodeURIComponent(prev.id)}?misa=${encodeURIComponent(m.id)}">${icon("arrowL")} ${esc(byId(prev.id).title)}</a>` : ""}
    <span class="spacer"></span>
    ${next ? `<a class="btn btn-gold" href="#/cancionero/${encodeURIComponent(next.id)}?misa=${encodeURIComponent(m.id)}">${esc(slotLabel(next.m))}: ${esc(byId(next.id).title)} ${icon("arrowR")}</a>` : ""}
  </div>
  <div class="row-wrap no-print" style="margin-top:10px">
    ${s.link && /^https?:\/\//.test(s.link) ? `<a class="btn btn-sm btn-ghost" href="${esc(s.link)}" target="_blank" rel="noopener">${icon("right")} Escucharla</a>` : ""}
    <button class="btn btn-sm btn-ghost" data-action="print">${icon("print")} Imprimir</button>
    ${canEdit() && !s.builtin ? `<span class="spacer"></span><button class="btn btn-sm btn-soft" data-action="canEdit" data-id="${esc(s.id)}">${icon("edit")} Editar</button>
      ${st().isStaff ? `<button class="btn btn-sm btn-danger" data-action="canDel" data-id="${esc(s.id)}">${icon("trash")} Borrar</button>` : ""}` : ""}
  </div>`;
}

// ---------------------------------------------------------------------------
// Un repertorio  (#/cancionero/misa/:id)
// ---------------------------------------------------------------------------
export function viewMisa(id) {
  ctx.onAfterRender(() => { repaint = () => paintMisa(id); watchAll(); paintMisa(id); });
  return `${gate()}<div id="canMisa"><p class="muted" style="padding:30px;text-align:center">Cargando…</p></div>`;
}
function paintMisa(id) {
  const box = $("#canMisa"); if (!box) return;
  if (!st().ready) { box.innerHTML = ""; return; }
  const r = (misas || []).find((x) => x.id === id);
  if (!r) { box.innerHTML = misas === null ? `<p class="muted" style="padding:30px;text-align:center">Cargando…</p>` : `<div class="card" style="text-align:center;padding:30px"><h2 class="display">No encontramos este repertorio</h2><a class="btn btn-primary" style="margin-top:12px" href="#/cancionero">Volver</a></div>`; return; }
  const slots = (r.slots || []).filter((x) => x.id);
  box.innerHTML = `
  <nav class="crumbs"><a href="#/cancionero">Cancionero</a>${icon("right")}<span>${esc(r.name)}</span></nav>
  <header class="can-head"><span class="eyebrow">${r.date ? esc(new Date(r.date + "T12:00").toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" })) : "Repertorio"}</span>
    <h1>${esc(r.name)}</h1>${r.note ? `<p class="muted">${esc(r.note)}</p>` : ""}</header>
  <div class="row-wrap" style="margin-bottom:14px">
    ${slots.length ? `<button class="btn btn-primary" data-action="canProject" data-scope="misa" data-id="${esc(r.id)}">${icon("eye")} Proyectar toda la misa</button>
    <a class="btn btn-gold" href="#/cancionero/${encodeURIComponent(slots[0].id)}?misa=${encodeURIComponent(r.id)}">Empezar con ${esc(slotLabel(slots[0].m))} ${icon("arrowR")}</a>` : ""}
    <button class="btn btn-ghost" data-action="canExport" data-misa="${esc(r.id)}">${icon("dl")} Exportar</button>
    ${canEdit() ? `<span class="spacer"></span><button class="btn btn-sm btn-soft" data-action="canEditMisa" data-id="${esc(r.id)}">${icon("edit")} Editar</button>
      ${st().isStaff ? `<button class="btn btn-sm btn-danger" data-action="canDelMisa" data-id="${esc(r.id)}">${icon("trash")} Borrar</button>` : ""}` : ""}
  </div>
  <ol class="can-setlist">${slots.map((x) => { const s = byId(x.id); return `<li>
      <span class="can-slot">${esc(slotLabel(x.m))}</span>
      ${s ? `<a href="#/cancionero/${encodeURIComponent(s.id)}?misa=${encodeURIComponent(r.id)}"><strong>${esc(s.title)}</strong> <span class="muted small">${esc(chordName(firstChord(s.body), prefs.shift[s.id] || 0, prefs.nota))}</span></a>` : `<span class="muted">Canción borrada</span>`}
    </li>`; }).join("") || `<li class="muted">Aún no tiene canciones.</li>`}</ol>`;
}

// ---------------------------------------------------------------------------
// Proyección a pantalla completa (sin acordes, una estrofa por pantalla)
// ---------------------------------------------------------------------------
let slides = [], si = 0;
function stanzas(s) {
  const out = [{ title: s.title, sub: s.author || "" }];
  String(s.body || "").split(/\n\s*\n/).forEach((blk) => {
    const lines = blk.split("\n").map((l) => l.replace(/\[[^\]]*\]/g, "").trim()).filter(Boolean);
    if (!lines.length) return;
    let label = "";
    if (/^[^:]{1,30}:$/.test(lines[0])) label = lines.shift().slice(0, -1);
    if (lines.length) out.push({ label, lines });
  });
  return out;
}
function project(list) {
  slides = list.flatMap((x) => stanzas(x.song).map((sl) => ({ ...sl, moment: x.m ? slotLabel(x.m) : "" })));
  si = 0;
  let ov = document.getElementById("canProj");
  if (!ov) { ov = document.createElement("div"); ov.id = "canProj"; document.body.appendChild(ov); }
  ov.className = "can-proj"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true"); ov.setAttribute("aria-label", "Proyección de la letra");
  document.body.classList.add("cap-quiet");
  try { ov.requestFullscreen && ov.requestFullscreen().catch(() => {}); } catch {}
  paintProj();
}
function paintProj() {
  const ov = document.getElementById("canProj"); if (!ov) return;
  const s = slides[si] || {};
  ov.innerHTML = `<div class="can-proj-in">
    ${s.title ? `<span class="can-proj-mom">${esc(s.moment || "")}</span><h2 class="can-proj-title">${esc(s.title)}</h2>${s.sub ? `<p class="can-proj-sub">${esc(s.sub)}</p>` : ""}`
      : `${s.label ? `<span class="can-proj-mom">${esc(s.label)}</span>` : ""}<p class="can-proj-txt">${(s.lines || []).map(esc).join("<br>")}</p>`}
  </div>
  <div class="can-proj-ctrl"><button class="icon-btn" data-action="canPrev" aria-label="Anterior">${icon("left")}</button>
    <span>${si + 1} / ${slides.length}</span>
    <button class="icon-btn" data-action="canNext" aria-label="Siguiente">${icon("right")}</button>
    <button class="btn btn-sm btn-glass" data-action="canProjClose">Salir</button></div>`;
}
function closeProj() {
  const ov = document.getElementById("canProj"); if (ov) ov.remove();
  document.body.classList.remove("cap-quiet");
  try { if (document.fullscreenElement) document.exitFullscreen(); } catch {}
}

// ---------------------------------------------------------------------------
// Editores (equipo)
// ---------------------------------------------------------------------------
function dialog(id) {
  let d = document.getElementById(id);
  if (!d) { d = document.createElement("dialog"); d.id = id; d.className = "sheet p-sheet"; document.body.appendChild(d); }
  return d;
}
function songEditor(s) {
  const d = dialog("canDlg"), v = s || { title: "", author: "", momentos: [], body: "", link: "" };
  d.innerHTML = `<form method="dialog" id="canForm" data-id="${esc(s ? s.id : "")}">
    <div class="sheet-head"><div style="flex:1"><span class="eyebrow">Cancionero</span><h2>${s ? "Editar canción" : "Nueva canción"}</h2></div>
      <button type="button" class="icon-btn" data-action="canClose" aria-label="Cerrar">${icon("x")}</button></div>
    <div class="sheet-body stack" style="--gap:12px">
      <div class="ag-form-row">
        <div class="field"><label>Título</label><input class="input" name="title" required maxlength="120" value="${esc(v.title)}"></div>
        <div class="field"><label>Autor o fuente</label><input class="input" name="author" maxlength="120" value="${esc(v.author || "")}" placeholder="Quién la compuso o de dónde la sacamos"></div>
      </div>
      <fieldset class="p-dates"><legend>Momentos en que se canta</legend>
        <div class="can-chips">${MOMENTOS.map(([k, l]) => `<label class="chip"><input type="checkbox" name="m" value="${k}" ${(v.momentos || []).includes(k) ? "checked" : ""}> ${esc(l)}</label>`).join("")}</div>
      </fieldset>
      <div class="field"><label>Letra con acordes</label>
        <textarea class="textarea can-ta" name="body" rows="14" maxlength="20000" placeholder="Coro:\n[G]Amor que trans[D]forma,\n[Em]amor que se [C]da…">${esc(v.body || "")}</textarea>
        <span class="xs muted">Escribe cada acorde entre corchetes justo antes de la sílaba donde cambia: <code>[G]Amor que trans[D]forma</code>. Sirve <code>[Am]</code> o <code>[Lam]</code>. Una línea que termina en dos puntos (<code>Coro:</code>) es un título. Deja una línea en blanco entre estrofas.</span></div>
      <div class="field"><label>Enlace para escucharla (opcional)</label><input class="input" name="link" maxlength="400" value="${esc(v.link || "")}" placeholder="https://youtube.com/…"></div>
      <p class="xs muted">Carga solo canciones que la comunidad canta, para uso interno. Las letras se ven solo con cuenta.</p>
    </div>
    <div class="sheet-foot"><span class="spacer"></span><button type="button" class="btn btn-ghost" data-action="canClose">Cancelar</button><button class="btn btn-primary" type="submit">Guardar</button></div>
  </form>`;
  d.showModal();
}
function misaEditor(r) {
  const d = dialog("canMisaDlg"), v = r || { name: "", date: "", note: "", slots: [] };
  const pick = Object.fromEntries((v.slots || []).map((x) => [x.m, x.id]));
  const list = all();
  const opts = (slot) => {
    const m = slot === "comunion2" ? "comunion" : slot;
    const fit = list.filter((s) => (s.momentos || []).includes(m)), rest = list.filter((s) => !(s.momentos || []).includes(m));
    const o = (s) => `<option value="${esc(s.id)}" ${pick[slot] === s.id ? "selected" : ""}>${esc(s.title)}</option>`;
    return `<option value="">—</option>${fit.length ? `<optgroup label="Para ${esc(MLABEL[m])}">${fit.map(o).join("")}</optgroup>` : ""}<optgroup label="Otras">${rest.map(o).join("")}</optgroup>`;
  };
  d.innerHTML = `<form method="dialog" id="canMisaForm" data-id="${esc(r ? r.id : "")}">
    <div class="sheet-head"><div style="flex:1"><span class="eyebrow">Cancionero</span><h2>${r ? "Editar celebración" : "Nueva celebración"}</h2></div>
      <button type="button" class="icon-btn" data-action="canClose" aria-label="Cerrar">${icon("x")}</button></div>
    <div class="sheet-body stack" style="--gap:12px">
      <div class="ag-form-row">
        <div class="field"><label>Nombre</label><input class="input" name="name" required maxlength="120" value="${esc(v.name)}" placeholder="Misa juvenil · Todos los Santos"></div>
        <div class="field"><label>Fecha</label><input class="input" type="date" name="date" value="${esc(v.date || "")}"></div>
      </div>
      <div class="field"><label>Nota (opcional)</label><input class="input" name="note" maxlength="140" value="${esc(v.note || "")}" placeholder="Ensayo el sábado 18:00 · Guitarra: Cami"></div>
      <div class="can-slots">${SLOTS.map((k) => `<div class="field"><label>${esc(slotLabel(k))}</label><select class="select" name="s_${k}">${opts(k)}</select></div>`).join("")}</div>
      <p class="xs muted">Deja en «—» los momentos que se rezan sin canto.</p>
    </div>
    <div class="sheet-foot"><span class="spacer"></span><button type="button" class="btn btn-ghost" data-action="canClose">Cancelar</button><button class="btn btn-primary" type="submit">Guardar</button></div>
  </form>`;
  d.showModal();
}

// ---------------------------------------------------------------------------
// Exportar: PDF (impresión sin cortar canciones), PowerPoint y texto
// ---------------------------------------------------------------------------
function exportSet(o) {
  if (o.misa) {
    const r = (misas || []).find((x) => x.id === o.misa);
    const items = r ? (r.slots || []).filter((x) => x.id && byId(x.id)).map((x) => ({ m: x.m, song: byId(x.id) })) : [];
    return { title: r ? r.name : "Celebración", sub: r && r.date ? new Date(r.date + "T12:00").toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "", items, groups: null };
  }
  const order = Object.fromEntries(MOMENTOS.map(([k], i) => [k, i]));
  const firstM = (s) => (s.momentos || []).slice().sort((a, b) => order[a] - order[b])[0] || "zz";
  let list = all().filter((s) => !o.momento || (s.momentos || []).includes(o.momento));
  list.sort((a, b) => (order[o.momento || firstM(a)] ?? 99) - (order[o.momento || firstM(b)] ?? 99) || a.title.localeCompare(b.title, "es"));
  const items = list.map((song) => ({ m: o.momento || firstM(song), song }));
  items.forEach((x, i) => (x.n = i + 1));
  const groups = MOMENTOS.map(([k, l]) => ({ l, list: items.filter((x) => (x.song.momentos || []).includes(k)) })).filter((g) => g.list.length);
  const loose = items.filter((x) => !(x.song.momentos || []).length);
  if (loose.length) groups.push({ l: "Otras", list: loose });
  return { title: o.momento ? `Cancionero ${ID.corto} · ${MLABEL[o.momento]}` : `Cancionero ${ID.corto}`, sub: `${ID.nombre} · ${ID.parroquia}`, items, groups };
}
const shiftOf = (o, s) => (o.tono ? prefs.shift[s.id] || 0 : 0);

function exportDialog(misaId) {
  const d = dialog("canExpDlg");
  d.innerHTML = `<form method="dialog" id="canExpForm" data-misa="${esc(misaId || "")}">
    <div class="sheet-head"><div style="flex:1"><span class="eyebrow">Cancionero</span><h2>Exportar ${misaId ? "esta celebración" : "el cancionero"}</h2></div>
      <button type="button" class="icon-btn" data-action="canClose" aria-label="Cerrar">${icon("x")}</button></div>
    <div class="sheet-body stack" style="--gap:14px">
      <fieldset class="p-dates"><legend>Formato</legend>
        <div class="can-fmt">
          <label class="card can-fmt-o"><input type="radio" name="fmt" value="pdf" checked><strong>PDF para imprimir</strong><span class="muted small">Con portada e índice. Cada canción queda entera en su página o columna.</span></label>
          <label class="card can-fmt-o"><input type="radio" name="fmt" value="pptx"><strong>PowerPoint</strong><span class="muted small">Una estrofa por diapositiva, letra grande, para proyectar o editar.</span></label>
          <label class="card can-fmt-o"><input type="radio" name="fmt" value="txt"><strong>Texto</strong><span class="muted small">Archivo .txt para editar en Word, Docs o el bloc de notas.</span></label>
        </div>
      </fieldset>
      ${misaId ? "" : `<div class="field"><label>Qué canciones</label><select class="select" name="momento"><option value="">Todo el cancionero</option>${MOMENTOS.map(([k, l]) => `<option value="${k}">Solo ${esc(l)}</option>`).join("")}</select></div>`}
      <div class="can-opts">
        <label class="chip"><input type="checkbox" name="chords" checked> Con acordes</label>
        <label class="chip"><input type="checkbox" name="tono" checked> En el tono que elegí</label>
        <label class="chip" data-only="pdf"><input type="checkbox" name="cols"> Dos columnas</label>
      </div>
      <p class="xs muted">PDF: en la ventana de impresión elige «Guardar como PDF». Las canciones largas que no caben en una página siguen en la siguiente. En PowerPoint no van los acordes.</p>
    </div>
    <div class="sheet-foot"><span class="spacer"></span><button type="button" class="btn btn-ghost" data-action="canClose">Cancelar</button><button class="btn btn-primary" type="submit">${icon("dl")} Exportar</button></div>
  </form>`;
  d.showModal();
}

function exportPDF(set, o) {
  let book = document.getElementById("canBook");
  if (!book) { book = document.createElement("div"); book.id = "canBook"; document.body.appendChild(book); }
  book.className = `can-book${o.cols ? " cols-2" : ""}`;
  const today = new Date().toLocaleDateString("es-CL", { month: "long", year: "numeric" });
  const head = (x, i) => `<header class="cb-head"><span class="cb-n">${x.n || i + 1}</span><div><h2>${esc(x.song.title)}</h2>
      <span class="cb-meta">${[set.groups ? "" : slotLabel(x.m), x.song.author || "", o.chords ? "Tono " + chordName(firstChord(x.song.body), shiftOf(o, x.song), prefs.nota) : ""].filter(Boolean).map(esc).join(" · ")}</span></div></header>`;
  book.innerHTML = `
    <section class="cb-cover"><img src="icons/logo-320.webp" alt="" width="160" height="160">
      <h1>${esc(set.title)}</h1><p class="cb-sub">${esc(set.sub)}</p><p class="cb-date">Edición ${esc(today)}</p></section>
    ${set.groups ? `<section class="cb-index"><h2>Índice</h2>${set.groups.map((g) => `<div class="cb-ig"><h3>${esc(g.l)}</h3><ol>${g.list.map((x) => `<li><b>${x.n}</b> ${esc(x.song.title)}</li>`).join("")}</ol></div>`).join("")}</section>`
      : `<section class="cb-index"><h2>Orden de la celebración</h2><ol class="cb-order">${set.items.map((x, i) => `<li><b>${esc(slotLabel(x.m))}</b> ${esc(x.song.title)}</li>`).join("")}</ol></section>`}
    <section class="cb-songs">${set.items.map((x, i) => `<article class="cb-song">${head(x, i)}<div class="can-sheet cb-body">${songBody(x.song, shiftOf(o, x.song), o.chords)}</div></article>`).join("")}</section>`;
  document.body.classList.add("can-printing");
  const done = () => { document.body.classList.remove("can-printing"); window.removeEventListener("afterprint", done); };
  window.addEventListener("afterprint", done);
  setTimeout(() => window.print(), 300);
}

function chordOverLyric(ln, shift) {
  const parts = ln.split(/\[([^\]]+)\]/);
  let text = parts[0], ch = "";
  for (let i = 1; i < parts.length; i += 2) {
    let pos = text.length;
    if (ch.length && ch.length >= pos) { pos = ch.length + 1; text = text.padEnd(pos); }
    ch = ch.padEnd(pos) + chordName(parts[i], shift, prefs.nota);
    text += parts[i + 1] || "";
  }
  return ch.trimEnd() + "\n" + text.trimEnd();
}
function exportTXT(set, o) {
  const out = [set.title.toUpperCase(), set.sub, ""];
  if (set.groups) {
    out.push("ÍNDICE");
    set.groups.forEach((g) => { out.push("", g.l + ":"); g.list.forEach((x) => out.push(`  ${String(x.n).padStart(3)}. ${x.song.title}`)); });
  } else set.items.forEach((x) => out.push(`${slotLabel(x.m)}: ${x.song.title}`));
  set.items.forEach((x, i) => {
    out.push("", "", "=".repeat(48), `${set.groups ? (x.n || i + 1) + ". " : slotLabel(x.m).toUpperCase() + " · "}${x.song.title}`);
    const meta = [x.song.author || "", o.chords ? "Tono " + chordName(firstChord(x.song.body), shiftOf(o, x.song), prefs.nota) : ""].filter(Boolean).join(" · ");
    if (meta) out.push(meta);
    out.push("=".repeat(48), "");
    String(x.song.body || "").split("\n").forEach((ln) => {
      out.push(o.chords && /\[/.test(ln) ? chordOverLyric(ln, shiftOf(o, x.song)) : ln.replace(/\[[^\]]*\]/g, ""));
    });
  });
  const blob = new Blob(["\ufeff" + out.join("\n").replace(/\n/g, "\r\n")], { type: "text/plain;charset=utf-8" });
  save(blob, fileBase(set) + ".txt");
}
const fileBase = (set) => set.title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "cancionero";
function save(blob, name) {
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
}
function loadPptx() {
  if (window.PptxGenJS) return Promise.resolve(window.PptxGenJS);
  return new Promise((res, rej) => {
    const sc = document.createElement("script"); sc.src = "js/vendor/pptxgen.bundle.js";
    sc.onload = () => res(window.PptxGenJS); sc.onerror = () => rej(new Error("No se pudo cargar PowerPoint"));
    document.head.appendChild(sc);
  });
}
async function exportPPTX(set) {
  toast("Preparando la presentación…");
  const P = await loadPptx();
  const pptx = new P();
  pptx.layout = "LAYOUT_WIDE"; pptx.title = set.title; pptx.company = `${ID.nombre}`;
  const BG = "0B2566", CREAM = "FFF6E5", GOLD = "FFBA03";
  const cover = pptx.addSlide(); cover.background = { color: BG };
  cover.addText(set.title, { x: 0.6, y: 2.4, w: 12.1, h: 1.6, fontFace: "Arial", fontSize: 54, bold: true, color: CREAM, align: "center" });
  cover.addText(set.sub || "", { x: 0.6, y: 4.0, w: 12.1, h: 0.8, fontFace: "Arial", fontSize: 22, color: GOLD, align: "center" });
  set.items.forEach((x) => {
    stanzas(x.song).forEach((sl) => {
      const s = pptx.addSlide(); s.background = { color: BG };
      if (sl.title) {
        if (x.m && !set.groups) s.addText(slotLabel(x.m), { x: 0.6, y: 2.0, w: 12.1, h: 0.7, fontFace: "Arial", fontSize: 26, italic: true, color: GOLD, align: "center" });
        s.addText(sl.title, { x: 0.6, y: 2.7, w: 12.1, h: 1.6, fontFace: "Arial", fontSize: 54, bold: true, color: CREAM, align: "center", fit: "shrink" });
        if (sl.sub) s.addText(sl.sub, { x: 0.6, y: 4.3, w: 12.1, h: 0.6, fontFace: "Arial", fontSize: 18, color: CREAM, align: "center", transparency: 30 });
      } else {
        const n = sl.lines.length, size = n <= 4 ? 40 : n <= 6 ? 34 : n <= 8 ? 28 : 22;
        if (sl.label) s.addText(sl.label, { x: 0.6, y: 0.35, w: 12.1, h: 0.6, fontFace: "Arial", fontSize: 22, italic: true, color: GOLD, align: "center" });
        s.addText(sl.lines.join("\n"), { x: 0.6, y: 1.0, w: 12.1, h: 6.0, fontFace: "Arial", fontSize: size, bold: true, color: CREAM, align: "center", valign: "middle", lineSpacingMultiple: 1.15, fit: "shrink" });
        s.addText(x.song.title, { x: 0.6, y: 7.0, w: 12.1, h: 0.4, fontFace: "Arial", fontSize: 12, color: CREAM, align: "right", transparency: 50 });
      }
    });
  });
  await pptx.writeFile({ fileName: fileBase(set) + ".pptx" });
}

function registerActions() {
  const A = ctx.actions;
  A.canTab = (el) => { tab = el.dataset.t; ctx.render(); };
  A.canMom = (el) => { momento = el.dataset.m; document.querySelectorAll("[data-action=canMom]").forEach((b) => b.classList.toggle("accent", b.dataset.m === momento)); paintList(); };
  A.canShift = (el) => { if (!cur) return; prefs.shift[cur.id] = ((prefs.shift[cur.id] || 0) + +el.dataset.d + 18) % 12 - 6 || 0; savePrefs(); paintSong(cur.id); };
  A.canNota = () => { prefs.nota = prefs.nota === "us" ? "lat" : "us"; savePrefs(); cur && paintSong(cur.id); };
  A.canChords = () => { prefs.chords = !prefs.chords; savePrefs(); cur && paintSong(cur.id); };
  A.canSize = (el) => { prefs.size = Math.min(1.8, Math.max(.8, Math.round((prefs.size + +el.dataset.d * .1) * 10) / 10)); savePrefs(); const s = $(".can-sheet"); if (s) s.style.setProperty("--can-size", prefs.size); };
  A.canProject = (el) => {
    if (el.dataset.scope === "misa") {
      const r = (misas || []).find((x) => x.id === el.dataset.id); if (!r) return;
      project((r.slots || []).filter((x) => x.id && byId(x.id)).map((x) => ({ m: x.m, song: byId(x.id) })));
    } else if (cur) project([{ song: cur }]);
  };
  A.canPrev = () => { si = Math.max(0, si - 1); paintProj(); };
  A.canNext = () => { si = Math.min(slides.length - 1, si + 1); paintProj(); };
  A.canProjClose = () => closeProj();
  A.canNew = () => songEditor(null);
  A.canEdit = (el) => songEditor(byId(el.dataset.id));
  A.canNewMisa = () => misaEditor(null);
  A.canEditMisa = (el) => misaEditor((misas || []).find((x) => x.id === el.dataset.id));
  A.canClose = () => { ["canDlg", "canMisaDlg", "canExpDlg"].forEach((k) => document.getElementById(k)?.close()); };
  A.canExport = (el) => exportDialog(el.dataset.misa || "");
  A.canDel = async (el) => {
    if (!confirm("¿Borrar esta canción del cancionero?")) return;
    try { await ctx.cloud.deleteCancion(el.dataset.id); toast("Canción borrada"); location.hash = "#/cancionero"; } catch { toast("No se pudo borrar", ""); }
  };
  A.canDelMisa = async (el) => {
    if (!confirm("¿Borrar este repertorio?")) return;
    try { await ctx.cloud.deleteRepertorio(el.dataset.id); toast("Repertorio borrado"); location.hash = "#/cancionero"; } catch { toast("No se pudo borrar", ""); }
  };
  document.addEventListener("input", (e) => { if (e.target.id === "canSearch") { query = e.target.value; paintList(); } });
  document.addEventListener("keydown", (e) => {
    if (!document.getElementById("canProj")) return;
    if (["ArrowRight", "PageDown", " ", "Enter"].includes(e.key)) { e.preventDefault(); A.canNext(); }
    else if (["ArrowLeft", "PageUp"].includes(e.key)) { e.preventDefault(); A.canPrev(); }
    else if (e.key === "Escape") closeProj();
  });
  let sx = null;
  document.addEventListener("touchstart", (e) => { if (document.getElementById("canProj")) sx = e.touches[0].clientX; }, { passive: true });
  document.addEventListener("touchend", (e) => { if (sx == null) return; const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) (dx < 0 ? A.canNext : A.canPrev)(); sx = null; }, { passive: true });
  document.addEventListener("fullscreenchange", () => { if (!document.fullscreenElement && document.getElementById("canProj")) { /* sigue abierto sin pantalla completa */ } });
  document.addEventListener("submit", async (e) => {
    if (e.target.id === "canExpForm") {
      e.preventDefault();
      const f = new FormData(e.target);
      const o = { misa: e.target.dataset.misa || "", momento: String(f.get("momento") || ""), chords: f.get("chords") === "on", tono: f.get("tono") === "on", cols: f.get("cols") === "on" };
      const set = exportSet(o);
      if (!set.items.length) { toast("No hay canciones para exportar", ""); return; }
      document.getElementById("canExpDlg")?.close();
      const fmt = f.get("fmt");
      try {
        if (fmt === "pdf") exportPDF(set, o);
        else if (fmt === "txt") { exportTXT(set, o); toast("Texto descargado"); }
        else { await exportPPTX(set); toast("Presentación descargada"); }
      } catch (err) { console.warn(err); toast("No se pudo exportar. Revisa tu conexión.", ""); }
      return;
    }
    if (e.target.id === "canForm") {
      e.preventDefault();
      const f = new FormData(e.target);
      const data = { title: String(f.get("title") || "").trim(), author: String(f.get("author") || "").trim(), momentos: f.getAll("m").map(String),
        body: String(f.get("body") || "").replace(/\r/g, ""), link: String(f.get("link") || "").trim() };
      if (!data.title) return;
      try { const id = await ctx.cloud.saveCancion(e.target.dataset.id || null, data); document.getElementById("canDlg")?.close(); toast("Canción guardada"); location.hash = "#/cancionero/" + encodeURIComponent(id); }
      catch (err) { console.warn(err); toast("No se pudo guardar. Revisa tu conexión.", ""); }
    }
    if (e.target.id === "canMisaForm") {
      e.preventDefault();
      const f = new FormData(e.target);
      const data = { name: String(f.get("name") || "").trim(), date: String(f.get("date") || ""), note: String(f.get("note") || "").trim(),
        slots: SLOTS.map((k) => ({ m: k, id: String(f.get("s_" + k) || "") })).filter((x) => x.id) };
      if (!data.name) return;
      try { const id = await ctx.cloud.saveRepertorio(e.target.dataset.id || null, data); document.getElementById("canMisaDlg")?.close(); toast("Celebración guardada"); location.hash = "#/cancionero/misa/" + encodeURIComponent(id); }
      catch (err) { console.warn(err); toast("No se pudo guardar. Revisa tu conexión.", ""); }
    }
  });
}
