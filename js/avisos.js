// Recordatorios suaves: si alguien lleva 2 días o más sin entrar, la tarea diaria
// (scripts/recordatorios.mjs) le manda una notificación a su celular o, si no la activó,
// un correo. Aquí cada uno activa las notificaciones en su dispositivo o apaga los avisos.

import { CONFIG } from "./config.js";
import * as cloud from "./cloud.js";
import { toast } from "./util.js";

const DISMISS = "agape_avisos_banner";
const supported = () => !!(CONFIG.vapidPublicKey && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window);
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const standalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
let prefs = null;

function b64(s) { const p = "=".repeat((4 - (s.length % 4)) % 4); const r = atob((s + p).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from([...r].map((c) => c.charCodeAt(0))); }

// Pide permiso (tiene que ser tras un toque) y guarda la suscripción de este dispositivo.
export async function activar() {
  if (!supported()) { toast(isIOS() && !standalone() ? "En iPhone, primero agrega la app a tu pantalla de inicio" : "Este navegador no permite notificaciones", ""); return false; }
  const perm = await Notification.requestPermission();
  if (perm !== "granted") { toast("Sin permiso no podemos avisarte. Puedes activarlo cuando quieras.", ""); return false; }
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(CONFIG.vapidPublicKey) });
    const json = JSON.stringify(sub.toJSON());
    prefs = prefs || (await cloud.getAvisos()) || {};
    const subs = [json, ...(prefs.subs || []).filter((x) => x !== json)].slice(0, 5);
    await cloud.saveAvisos({ on: true, subs });
    prefs = { ...prefs, on: true, subs };
    toast("¡Listo! Te avisaremos con cariño si te extrañamos 💙", "ok");
    return true;
  } catch (e) { console.warn("Avisos:", e); toast("No pudimos activar las notificaciones", ""); return false; }
}

// Tarjeta para Mi perfil / Mi cuenta
export function panelHTML() {
  const s = cloud.state();
  if (!cloud.enabled || !s.ready) return "";
  const perm = "Notification" in window ? Notification.permission : "unsupported";
  return `<section class="card av-card" id="avisosPanel">
    <h2 style="font-size:1.2rem">🔔 Recordatorios</h2>
    <p class="muted small">Si llevas 2 días o más sin pasar por la app, te mandamos un aviso suave (como máximo uno cada 3 días, de día). Si no activas las notificaciones, te llega por correo.</p>
    <label class="a11y-opt" style="margin-top:10px"><input type="checkbox" id="avisosOn" ${prefs && prefs.on === false ? "" : "checked"}><span><b>Quiero recibir recordatorios</b></span></label>
    ${supported() ? (perm === "granted" ? `<p class="small" style="margin-top:8px">✅ Notificaciones activadas en este dispositivo.</p>` : perm === "denied"
      ? `<p class="small muted" style="margin-top:8px">Bloqueaste las notificaciones en este navegador. Puedes permitirlas desde los ajustes del sitio (el candado junto a la dirección).</p>`
      : `<button type="button" class="btn btn-primary btn-sm" style="margin-top:8px" data-avisos-on>🔔 Activar notificaciones en este dispositivo</button>`)
      : CONFIG.vapidPublicKey && isIOS() && !standalone() ? `<p class="small muted" style="margin-top:8px">En iPhone, primero agrega la app a tu pantalla de inicio (Compartir → «Agregar a inicio») y ábrela desde ahí.</p>` : ""}
  </section>`;
}

// Aviso en Inicio para quienes aún no activan las notificaciones (una vez cada 14 días).
export async function afterRender(section) {
  const s = cloud.state();
  document.getElementById("avisosBanner")?.remove();
  if (!cloud.enabled || !s.ready) return;
  if (!prefs) { prefs = (await cloud.getAvisos()) || {}; const t = document.getElementById("avisosOn"); if (t) t.checked = prefs.on !== false; }
  if (section !== "inicio" || !supported() || Notification.permission !== "default" || prefs.on === false) return;
  let last = 0; try { last = +localStorage.getItem(DISMISS) || 0; } catch {}
  if (Date.now() - last < 14 * 864e5) return;
  const v = document.getElementById("view"); if (!v) return;
  const b = document.createElement("div");
  b.id = "avisosBanner"; b.className = "card avisos-banner";
  b.innerHTML = `<span class="avisos-ico" aria-hidden="true">🔔</span><div style="flex:1;min-width:200px"><strong>¿Te avisamos cuando haya novedades?</strong>
    <p class="small muted">Un recordatorio suave si llevas días sin pasar por Ágape. Nada de spam.</p></div>
    <div class="row-wrap" style="gap:6px"><button type="button" class="btn btn-primary btn-sm" data-avisos-on>Sí, avísame</button><button type="button" class="btn btn-ghost btn-sm" data-avisos-later>Ahora no</button></div>`;
  v.prepend(b);
}

document.addEventListener("click", async (e) => {
  if (e.target.closest("[data-avisos-on]")) { e.preventDefault(); if (await activar()) { document.getElementById("avisosBanner")?.remove(); const p = document.getElementById("avisosPanel"); if (p) p.outerHTML = panelHTML(); } }
  if (e.target.closest("[data-avisos-later]")) { try { localStorage.setItem(DISMISS, String(Date.now())); } catch {} document.getElementById("avisosBanner")?.remove(); }
});
document.addEventListener("change", async (e) => {
  if (e.target.id !== "avisosOn") return;
  try { await cloud.saveAvisos({ on: e.target.checked }); prefs = { ...(prefs || {}), on: e.target.checked }; toast(e.target.checked ? "Recordatorios activados" : "Ya no te enviaremos recordatorios", "ok"); }
  catch { toast("No se pudo guardar", ""); e.target.checked = !e.target.checked; }
});
