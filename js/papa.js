// Intención de oración del Papa: cada mes, la comunidad suma rosarios por la intención
// que propone el Santo Padre (Red Mundial de Oración del Papa). En Inicio se ve el recuento del mes.
// El equipo puede ajustar el texto y poner una meta en Gestión → Resumen.

import * as cloud from "./cloud.js";
import { esc, toast } from "./util.js";

// Intenciones 2026 del papa León XIV (popesprayer.va). Título y texto de cada mes.
const INT = {
  "2026-01": ["Por la oración con la Palabra de Dios", "Para que la oración con la Palabra de Dios sea alimento y esperanza, y nos ayude a construir una Iglesia más fraterna y misionera."],
  "2026-02": ["Por los niños con enfermedades incurables", "Por los niños con enfermedades incurables y sus familias, para que reciban la atención y el apoyo que necesitan."],
  "2026-03": ["Por el desarme y la paz", "Para que se avance en un desarme efectivo y los gobernantes elijan el diálogo y la diplomacia en lugar de la violencia."],
  "2026-04": ["Por los sacerdotes en crisis", "Por los sacerdotes que pasan por una crisis vocacional, para que encuentren acompañamiento y comunidades que los sostengan."],
  "2026-05": ["Por una alimentación para todos", "Para que todos cuidemos los alimentos, evitemos el desperdicio y nadie quede sin acceso a una buena alimentación."],
  "2026-06": ["Por los valores del deporte", "Para que el deporte sea instrumento de paz, encuentro y diálogo, y promueva el respeto y la solidaridad."],
  "2026-07": ["Por el respeto de la vida humana", "Por el respeto y la protección de la vida humana en todas sus etapas, como un regalo de Dios."],
  "2026-08": ["Por la evangelización en la ciudad", "Para que encontremos nuevas formas de anunciar el Evangelio y hacer comunidad en las grandes ciudades."],
  "2026-09": ["Por el cuidado del agua", "Por una gestión justa y sostenible del agua, para que todos tengan acceso a ella."],
  "2026-10": ["Por la pastoral de la salud mental", "Recemos para que la pastoral de la salud mental se integre en toda la Iglesia, ayudando a superar el estigma y la discriminación hacia las personas con enfermedades mentales."],
  "2026-11": ["Por el buen uso de la riqueza", "Oremos por un buen uso de la riqueza para que, no cediendo a la tentación del egoísmo, esté siempre al servicio del bien común y la solidaridad con los que tienen menos."],
  "2026-12": ["Por las familias monoparentales", "Oremos por las familias que experimentan la ausencia de una madre o de un padre, para que encuentren en la Iglesia apoyo y acompañamiento, y en la fe ayuda y fuerza en los momentos difíciles."],
};
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const pad = (n) => String(n).padStart(2, "0");
export const mesKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
const mesName = (k) => MESES[+k.slice(5) - 1];

let cfg = null, count = null;
async function load(force) {
  if (!cfg || force) cfg = (await cloud.getPapaCfg().catch(() => null)) || {};
  return cfg;
}
// Intención del mes: la del equipo (si la cambió para ese mes) o la oficial
export function intencion(k = mesKey()) {
  const own = cfg && cfg.mes === k && cfg.t ? [cfg.t, cfg.x || ""] : null;
  const it = own || INT[k];
  return it ? { k, t: it[0], x: it[1], mes: mesName(k) } : null;
}
const on = () => !cfg || cfg.on !== false;

// Tarjeta para Inicio
export function homeHTML() { return `<div id="papaSlot"></div>`; }
export async function paintHome() {
  const slot = document.getElementById("papaSlot"); if (!slot) return;
  await load(); const it = intencion();
  if (!on() || !it) { slot.innerHTML = ""; return; }
  count = await cloud.rosariosMes(it.k);
  if (count === null) { slot.innerHTML = ""; return; } // sin conexión o sin permiso de lectura: no se muestra
  const n = count || 0, meta = +(cfg && cfg.meta) || 0, member = cloud.state().ready;
  slot.innerHTML = `<section class="card papa-card">
    <div class="papa-top"><span class="papa-k">🌍 Con el Papa · ${esc(it.mes)}</span></div>
    <h3>${esc(it.t)}</h3>
    <p class="papa-x">${esc(it.x)}</p>
    <div class="papa-n"><b id="papaN">${n}</b><span>${n === 1 ? "rosario rezado" : "rosarios rezados"} por esta intención${n ? " hasta hoy" : ". ¡Sé el primero!"}</span></div>
    ${meta ? `<div class="papa-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${meta}" aria-valuenow="${n}"><i style="width:${Math.min(100, (n / meta) * 100)}%"></i></div><p class="xs muted">Meta del mes: ${meta} rosarios</p>` : ""}
    <div class="row-wrap" style="gap:8px;margin-top:12px">
      <a class="btn btn-gold btn-sm" href="#/oracion/rosario">📿 Rezar el Rosario</a>
      ${member ? `<button class="btn btn-soft btn-sm" data-action="papaSumar">✔ Ya recé uno</button>` : `<span class="xs muted">Para sumar tu rosario, ingresa con tu cuenta.</span>`}
    </div></section>`;
}

// Sumar un rosario (desde Inicio o al terminar el Rosario en la app). Un toque cada 15 minutos por dispositivo.
const LK = "agape_papa_ultimo";
export async function sumar() {
  if (!cloud.state().ready) { toast("Para sumar tu rosario, ingresa con tu cuenta", ""); return false; }
  try { const last = +localStorage.getItem(LK) || 0; if (Date.now() - last < 15 * 60000) { toast("Ya sumaste tu rosario. ¡Gracias! 🙏", ""); return false; } } catch {}
  try {
    await cloud.sumarRosario(mesKey());
    try { localStorage.setItem(LK, String(Date.now())); } catch {}
    const el = document.getElementById("papaN"); if (el) el.textContent = String((+el.textContent || 0) + 1);
    toast("¡Tu rosario se sumó a la intención del Papa! 🙏", "ok");
    return true;
  } catch { toast("No se pudo sumar. Revisa tu conexión.", ""); return false; }
}
// Botón para el final del Rosario
export function finHTML() {
  const it = intencion(); if (!on() || !it || !cloud.state().ready) return "";
  return `<button class="ros-next-pr papa-ros" data-action="papaSumar">🌍 Sumar este rosario a la intención del Papa</button><span class="ros-papa-t">${esc(it.t)}</span>`;
}

// Gestión → Resumen
export async function adminHTML() {
  await load(true); const k = mesKey(), it = intencion(k), n = (await cloud.rosariosMes(k)) || 0;
  return `<section class="card" id="papaAdmin"><h3>🌍 Rosarios por la intención del Papa</h3>
    <p class="muted small" style="margin-top:4px">En Inicio se muestra la intención del mes y cuántos rosarios lleva la comunidad (este mes: <b>${n}</b>). Se suma con «Ya recé uno» o al terminar el Rosario en la app.</p>
    <label class="row" style="gap:8px;margin-top:10px;font-weight:700"><input type="checkbox" id="papaOn" ${on() ? "checked" : ""}> Mostrar en Inicio</label>
    <div class="field" style="margin-top:10px"><label>Intención de ${esc(mesName(k))}</label><input class="input" id="papaT" maxlength="90" value="${esc(it ? it.t : "")}"></div>
    <div class="field"><label>Texto</label><textarea class="textarea" id="papaX" rows="3" maxlength="400">${esc(it ? it.x : "")}</textarea></div>
    <div class="field"><label>Meta del mes <span class="muted">(opcional, 0 = sin meta)</span></label><input class="input" id="papaMeta" type="number" min="0" max="10000" value="${+(cfg && cfg.meta) || 0}" style="max-width:140px"></div>
    <button class="btn btn-primary btn-sm" data-action="papaSave">Guardar</button>
    <p class="xs muted" style="margin-top:8px">Cada mes cambia sola a la intención nueva. Si editas el texto, vale solo para este mes.</p></section>`;
}

export function registerActions(actions) {
  actions.papaSumar = async (el) => { const ok = await sumar(); if (ok && el && el.classList.contains("papa-ros")) { el.disabled = true; el.textContent = "✔ Sumado a la intención del Papa"; } };
  actions.papaSave = async () => {
    const t = (document.getElementById("papaT")?.value || "").trim(), x = (document.getElementById("papaX")?.value || "").trim();
    const k = mesKey(), off = INT[k] || ["", ""];
    const data = { on: !!document.getElementById("papaOn")?.checked, meta: Math.max(0, Math.min(10000, +document.getElementById("papaMeta")?.value || 0)) };
    if (t && (t !== off[0] || x !== off[1])) Object.assign(data, { mes: k, t, x });
    try { await cloud.savePapaCfg(data); cfg = data; toast("Guardado 🙏", "ok"); } catch { toast("No se pudo guardar", ""); }
  };
}
