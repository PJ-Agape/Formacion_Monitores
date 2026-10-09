// Editor de la imagen de fondo de la cuenta regresiva (Agenda): el equipo sube una foto o un logo
// y lo encuadra aquí mismo. Sale una imagen 1800×600 (3:1) liviana que se guarda con el evento.
// Guías: el tercio central es lo que se ve bien en computador (entre el título y los números).

const W = 1800, H = 600;
let value = "", src = null;
const o = { mode: "foto", zoom: 1, x: 0, y: 0, color: "#000000" };
const $ = (s) => document.querySelector(s);

export const get = () => value;
export function init(v) { value = v || ""; src = null; }

export function html() {
  return `<div class="fc-box">
    <div class="row-wrap" style="gap:8px;align-items:center">
      <label class="btn btn-soft btn-sm">🖼️ <span id="fcPickL">${value ? "Cambiar imagen" : "Elegir imagen"}</span><input type="file" accept="image/*" id="fcFile" class="sr-only"></label>
      <button type="button" class="btn btn-ghost btn-sm" id="fcAdjust" ${value ? "" : "hidden"}>✂️ Ajustar</button>
      <button type="button" class="btn btn-ghost btn-sm" id="fcDel" ${value ? "" : "hidden"}>Quitar</button>
    </div>
    <div id="fcPrev" class="fc-prev" ${value ? "" : "hidden"}>${previews()}</div>
    <div id="fcEd" class="fc-ed" hidden>
      <canvas id="fcCanvas" width="${W}" height="${H}" aria-label="Encuadre de la imagen"></canvas>
      <p class="xs muted">La zona marcada al centro es la que se ve bien en el computador. En el celular se ve la imagen completa como franja arriba.</p>
      <div class="seg" role="radiogroup" aria-label="Tipo de imagen">
        <label><input type="radio" name="fcMode" value="foto" ${o.mode === "foto" ? "checked" : ""}><span>📷 Foto que llena todo</span></label>
        <label><input type="radio" name="fcMode" value="logo" ${o.mode === "logo" ? "checked" : ""}><span>🔤 Logo al centro</span></label></div>
      <div class="fc-sl">
        <label>Tamaño <input type="range" id="fcZoom" min="0.4" max="3" step="0.01" value="${o.zoom}"></label>
        <label>↔ Mover <input type="range" id="fcX" min="-1" max="1" step="0.01" value="${o.x}"></label>
        <label>↕ Mover <input type="range" id="fcY" min="-1" max="1" step="0.01" value="${o.y}"></label>
        <label id="fcColorL" ${o.mode === "logo" ? "" : "hidden"}>Color de fondo <input type="color" id="fcColor" value="${o.color}"></label>
      </div>
      <div class="row-wrap" style="gap:8px"><button type="button" class="btn btn-primary btn-sm" id="fcOk">✔ Listo</button><button type="button" class="btn btn-ghost btn-sm" id="fcReset">Volver a centrar</button></div>
    </div></div>`;
}

const previews = () => value ? `<div class="fc-mock"><small>Computador</small><div class="fc-desk" style="--fc:url('${value}')"><b>Título del evento</b><i>15 · 06 · 38 · 09</i></div></div>
  <div class="fc-mock"><small>Celular</small><div class="fc-mob"><img src="${value}" alt=""><b>Título del evento</b><i>15 · 06 · 38 · 09</i></div></div>` : "";

function draw(guides) {
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const c = cv.getContext("2d");
  c.fillStyle = o.mode === "logo" ? o.color : "#0b2566"; c.fillRect(0, 0, W, H);
  if (src) {
    const base = o.mode === "logo" ? Math.min((W * 0.29) / src.width, (H * 0.5) / src.height) : Math.max(W / src.width, H / src.height);
    const k = base * o.zoom, w = src.width * k, h = src.height * k;
    const rx = o.mode === "logo" ? W / 2 : Math.max(0, (w - W) / 2) + W * 0.15, ry = o.mode === "logo" ? H / 2 : Math.max(0, (h - H) / 2) + H * 0.15;
    c.drawImage(src, (W - w) / 2 + o.x * rx, (H - h) / 2 + o.y * ry, w, h);
  }
  const out = cv;
  const show = $("#fcCanvas");
  if (show) {
    const s = show.getContext("2d"); s.drawImage(out, 0, 0);
    if (guides) {
      s.save(); s.setLineDash([18, 14]); s.lineWidth = 5; s.strokeStyle = "rgba(255,186,3,.95)";
      s.strokeRect(W * 0.355, H * 0.25, W * 0.29, H * 0.5); s.restore();
      s.fillStyle = "rgba(11,37,102,.35)"; s.fillRect(0, 0, W * 0.34, H); s.fillRect(W * 0.66, 0, W * 0.34, H);
      s.fillStyle = "#fff"; s.font = "700 34px sans-serif"; s.fillText("título", 40, H / 2); s.fillText("números", W * 0.66 + 40, H / 2);
    }
  }
  return out;
}
function exportValue() {
  const cv = draw(false);
  let q = 0.82, d = cv.toDataURL("image/jpeg", q);
  while (d.length > 260000 && q > 0.4) { q -= 0.08; d = cv.toDataURL("image/jpeg", q); }
  return d;
}
function corner(img) {
  try { const c = document.createElement("canvas"); c.width = c.height = 1; const x = c.getContext("2d"); x.drawImage(img, 0, 0, 1, 1, 0, 0, 1, 1); const [r, g, b] = x.getImageData(0, 0, 1, 1).data; return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join(""); } catch { return "#000000"; }
}
function openEditor(img) {
  src = img;
  // Imagen muy ancha (logo o texto) → modo logo con el color de su borde; foto → llenar.
  o.mode = img.width / img.height > 2.2 ? "logo" : "foto"; o.zoom = 1; o.x = 0; o.y = 0; o.color = corner(img);
  const box = $(".fc-box"); if (!box) return;
  box.outerHTML = html();
  $("#fcEd").hidden = false; $("#fcPrev").hidden = true;
  draw(true);
}
function loadSrc(url) {
  return new Promise((ok, fail) => { const i = new Image(); i.onload = () => ok(i); i.onerror = fail; i.src = url; });
}
function refreshButtons() {
  const has = !!value;
  const a = $("#fcAdjust"), d = $("#fcDel"), l = $("#fcPickL"), p = $("#fcPrev");
  if (a) a.hidden = !has; if (d) d.hidden = !has; if (l) l.textContent = has ? "Cambiar imagen" : "Elegir imagen";
  if (p) { p.innerHTML = previews(); p.hidden = !has; }
}

let wired = false;
export function wire(toast) {
  if (wired) return; wired = true;
  document.addEventListener("change", (e) => {
    const t = e.target;
    if (t.id === "fcFile" && t.files[0]) {
      const url = URL.createObjectURL(t.files[0]);
      loadSrc(url).then(openEditor).catch(() => toast("No pude abrir esa imagen", ""));
    }
    if (t.name === "fcMode") { o.mode = t.value; o.zoom = 1; o.x = o.y = 0; const l = $("#fcColorL"); if (l) l.hidden = o.mode !== "logo"; ["fcZoom", "fcX", "fcY"].forEach((id) => { const r = $("#" + id); if (r) r.value = id === "fcZoom" ? 1 : 0; }); draw(true); }
  });
  document.addEventListener("input", (e) => {
    const t = e.target;
    if (t.id === "fcZoom") o.zoom = +t.value; else if (t.id === "fcX") o.x = +t.value; else if (t.id === "fcY") o.y = +t.value; else if (t.id === "fcColor") o.color = t.value; else return;
    draw(true);
  });
  document.addEventListener("click", (e) => {
    const t = e.target.closest("#fcOk,#fcReset,#fcAdjust,#fcDel"); if (!t) return;
    e.preventDefault();
    if (t.id === "fcOk") { value = exportValue(); $("#fcEd").hidden = true; refreshButtons(); toast("Imagen lista. Recuerda guardar el evento.", ""); }
    if (t.id === "fcReset") { o.zoom = 1; o.x = o.y = 0; ["fcZoom", "fcX", "fcY"].forEach((id) => { const r = $("#" + id); if (r) r.value = id === "fcZoom" ? 1 : 0; }); draw(true); }
    if (t.id === "fcAdjust" && value) loadSrc(value).then((img) => { openEditor(img); o.mode = "foto"; const r = document.querySelector('input[name="fcMode"][value="foto"]'); if (r) r.checked = true; const l = $("#fcColorL"); if (l) l.hidden = true; draw(true); });
    if (t.id === "fcDel") { value = ""; src = null; const ed = $("#fcEd"); if (ed) ed.hidden = true; refreshButtons(); }
  });
}
