// Gestión → Inicio y enlaces: el saludo, La Plaza Ágape, Nuestras familias y las radios católicas.
// Lo editan administradores y coordinadores; los cambios se ven al instante, sin «Publicar».
import { esc, icon, toast } from "./util.js";
import { DEFAULTS, DOOR_NAMES, REDES, cfg, savedRaw, adopt } from "./inicio-config.js";

let ctx = null; // { actions, render, onAfterRender, cloud }
export function setup(c) { ctx = c; registerActions(); }
const $ = (s, r = document) => r.querySelector(s);

let radios = null; // copia en edición
const okUrl = (u) => /^https?:\/\/\S+$/i.test(String(u || "").trim());

export function adminView() {
  ctx.onAfterRender(() => ctx.cloud.getInicioCfg?.().then((v) => { if (v && adopt(v) && location.hash.startsWith("#/admin/inicio")) { radios = null; ctx.render(); } }));
  const c = cfg(), isAdmin = ctx.cloud.state().isAdmin;
  if (!radios) radios = c.radios.map((r) => ({ ...r }));
  const f = (name, label, val, ph, max = 120, area = false) => `<div class="field"><label>${label}</label>${area
    ? `<textarea class="textarea" name="${name}" rows="2" maxlength="${max}" placeholder="${esc(ph)}">${esc(val)}</textarea>`
    : `<input class="input" name="${name}" maxlength="${max}" value="${esc(val)}" placeholder="${esc(ph)}">`}</div>`;
  const doors = (sec) => Object.entries(c[sec].doors).map(([k, d]) => {
    const base = DEFAULTS[sec].doors[k];
    return `<fieldset class="p-dates ia-door"><legend>${esc(DOOR_NAMES[k])}</legend>
      <label class="row ia-on"><input type="checkbox" name="${sec}.doors.${k}.on" ${d.on !== false ? "checked" : ""}> Mostrar este acceso</label>
      <div class="ag-form-row">${f(`${sec}.doors.${k}.kicker`, "Línea pequeña", d.kicker, base.kicker, 40)}${f(`${sec}.doors.${k}.title`, "Título", d.title, base.title, 40)}</div>
      ${f(`${sec}.doors.${k}.text`, "Texto", d.text, base.text, 90)}</fieldset>`;
  }).join("");
  const head = (sec) => `<div class="ag-form-row">${f(`${sec}.hand`, "Frase manuscrita", c[sec].hand, DEFAULTS[sec].hand, 40)}${f(`${sec}.title`, "Título", c[sec].title, DEFAULTS[sec].title, 40)}</div>
      <span class="xs muted">En el título, pon entre asteriscos la palabra a resaltar: La Plaza *Ágape*.</span>
      ${f(`${sec}.text`, "Texto", c[sec].text, DEFAULTS[sec].text, 160, true)}`;
  return `<header class="page-head"><span class="eyebrow">Gestión</span><h1>Inicio y enlaces</h1>
    <p>Los textos de las tarjetas de Inicio y Comunidad, y las radios. Lo que dejes en blanco vuelve al texto original. Los cambios se ven al instante, sin pasar por «Publicar».</p></header>
  <div class="row-wrap"><a class="btn btn-ghost btn-sm" href="#/">${icon("eye")} Ver Inicio</a><a class="btn btn-ghost btn-sm" href="#/red">${icon("eye")} Ver Comunidad</a>
    ${isAdmin ? `<a class="btn btn-ghost btn-sm" href="#/podcast">${icon("edit")} Editar el podcast</a>` : ""}</div>
  <form id="iaForm" class="stack ia-form" style="--gap:16px">
    <section class="card ia-sec"><h2>Saludo</h2>
      <p class="muted small">La frase manuscrita sobre «Buenas tardes, …».</p>
      <div class="ag-form-row">${f("saludo.cuenta", "Con cuenta", c.saludo.cuenta, DEFAULTS.saludo.cuenta, 40)}${f("saludo.visita", "Visitantes", c.saludo.visita, DEFAULTS.saludo.visita, 40)}</div></section>

    <section class="card ia-sec"><h2>La Plaza Ágape</h2>${head("plaza")}<div class="ia-doors">${doors("plaza")}</div></section>

    <section class="card ia-sec"><h2>Nuestras familias</h2><p class="muted small">Solo la ven quienes tienen cuenta. «Asistencia» aparece solo a los guías.</p>${head("familias")}<div class="ia-doors">${doors("familias")}</div></section>

    <section class="card ia-sec"><h2>Música y redes sociales</h2>
      <p class="muted small">La playlist aparece en Inicio, junto a las radios y el podcast. Las redes, como botones pequeños en el pie de página de toda la app.</p>
      <div class="ag-form-row">${f("playlist.label", "Nombre de la playlist", c.playlist.label, DEFAULTS.playlist.label, 40)}${f("playlist.url", "Enlace de la playlist", c.playlist.url, DEFAULTS.playlist.url, 300)}</div>
      <div class="ag-form-row">${Object.entries(REDES).map(([k, l]) => f(`redes.${k}`, l, c.redes[k], DEFAULTS.redes[k], 300)).join("")}</div></section>

    <section class="card ia-sec"><h2>Radios católicas</h2><p class="muted small">La franja de radios de Inicio. El nombre corto es el que se ve en el botón.</p>
      <div id="iaRadios" class="stack" style="--gap:10px">${radiosHTML()}</div>
      <button type="button" class="btn btn-soft btn-sm" data-action="iaRadioAdd">${icon("plus")} Agregar radio</button></section>

    <div class="ia-foot"><button type="button" class="btn btn-ghost" data-action="iaReset">${icon("undo")} Volver a los textos originales</button>
      <span class="spacer"></span><button class="btn btn-primary" type="submit">${icon("check")} Guardar cambios</button></div>
  </form>`;
}
function radiosHTML() {
  return radios.map((r, i) => `<div class="ia-radio" data-i="${i}">
    <div class="ag-form-row">
      <div class="field"><label>Nombre</label><input class="input" data-r="name" maxlength="60" value="${esc(r.name || "")}" placeholder="Radio María Chile"></div>
      <div class="field"><label>Nombre corto</label><input class="input" data-r="short" maxlength="24" value="${esc(r.short || "")}" placeholder="Radio María"></div>
    </div>
    <div class="ag-form-row">
      <div class="field"><label>Enlace</label><input class="input" data-r="url" type="url" maxlength="300" value="${esc(r.url || "")}" placeholder="https://…"></div>
      <div class="field"><label>Dónde se escucha (opcional)</label><input class="input" data-r="where" maxlength="90" value="${esc(r.where || "")}" placeholder="89.3 FM · por internet"></div>
    </div>
    <div class="row-wrap" style="gap:6px">
      <button type="button" class="icon-btn" data-action="iaRadioMove" data-i="${i}" data-d="-1" ${i ? "" : "disabled"} aria-label="Subir">${icon("up")}</button>
      <button type="button" class="icon-btn" data-action="iaRadioMove" data-i="${i}" data-d="1" ${i < radios.length - 1 ? "" : "disabled"} aria-label="Bajar">${icon("down")}</button>
      <button type="button" class="btn btn-ghost btn-sm" data-action="iaRadioDel" data-i="${i}">${icon("trash")} Quitar</button></div>
  </div>`).join("") || `<p class="muted small">No hay radios. La franja no se mostrará.</p>`;
}
function readRadios() {
  document.querySelectorAll("#iaRadios .ia-radio").forEach((row) => {
    const r = radios[+row.dataset.i]; if (!r) return;
    row.querySelectorAll("[data-r]").forEach((inp) => { r[inp.dataset.r] = inp.value.trim(); });
  });
}
const paintRadios = () => { const b = $("#iaRadios"); if (b) b.innerHTML = radiosHTML(); };

// Solo se guarda lo que difiere del original (así, si cambia el texto base, se actualiza solo).
function diff(base, val) {
  if (typeof base === "boolean") return val === base ? undefined : val;
  if (typeof base === "string") return !val || val === base ? undefined : val;
  const out = {};
  for (const k of Object.keys(base)) { const d = diff(base[k], val[k]); if (d !== undefined && !(typeof d === "object" && !Object.keys(d).length)) out[k] = d; }
  return Object.keys(out).length ? out : undefined;
}
async function persist(next, msg) {
  const prev = savedRaw();
  adopt(next);
  try { await ctx.cloud.saveInicioCfg(next); toast(msg); }
  catch (e) { console.warn(e); adopt(prev); toast("No se pudo guardar. Revisa tu conexión.", ""); }
  radios = null; ctx.render();
}

function registerActions() {
  const A = ctx.actions;
  A.iaRadioAdd = () => { readRadios(); radios.push({ name: "", short: "", url: "", where: "" }); paintRadios(); };
  A.iaRadioDel = (el) => { readRadios(); radios.splice(+el.dataset.i, 1); paintRadios(); };
  A.iaRadioMove = (el) => { readRadios(); const i = +el.dataset.i, j = i + +el.dataset.d; if (j < 0 || j >= radios.length) return; [radios[i], radios[j]] = [radios[j], radios[i]]; paintRadios(); };
  A.iaReset = () => { if (confirm("¿Volver a todos los textos y radios originales?")) persist({}, "Inicio volvió a los textos originales"); };
  document.addEventListener("submit", (e) => {
    if (e.target.id !== "iaForm") return;
    e.preventDefault(); readRadios();
    const fd = new FormData(e.target), val = (k) => String(fd.get(k) || "").trim();
    const read = (base, path) => Object.fromEntries(Object.entries(base).map(([k, b]) => [k, typeof b === "boolean" ? fd.get(`${path}${k}`) === "on"
      : typeof b === "string" ? val(`${path}${k}`) : read(b, `${path}${k}.`)]));
    const { radios: _r, ...textBase } = DEFAULTS;
    const v = read(textBase, "");
    const badUrl = ["playlist.url", ...Object.keys(REDES).map((k) => `redes.${k}`)].find((k) => val(k) && !okUrl(val(k)));
    if (badUrl) { toast("Revisa los enlaces de la playlist y las redes: deben empezar con https://", ""); return; }
    const bad = radios.find((r) => (r.name || r.url) && (!r.name || !okUrl(r.url)));
    if (bad) { toast("Cada radio necesita nombre y un enlace que empiece con https://", ""); return; }
    const rs = radios.filter((r) => r.name && okUrl(r.url)).map(({ name, short, url, where }) => ({ name, short: short || "", url, where: where || "" }));
    const next = diff(textBase, v) || {};
    if (JSON.stringify(rs) !== JSON.stringify(DEFAULTS.radios.map(({ name, short, url, where }) => ({ name, short: short || "", url, where: where || "" })))) next.radios = rs;
    persist(next, "Inicio actualizado");
  });
}
