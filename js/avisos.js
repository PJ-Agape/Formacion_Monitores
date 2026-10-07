// Recordatorios suaves y VOLUNTARIOS: vienen apagados. Solo quien los activa en Mi cuenta
// recibe un aviso si lleva 2 días o más sin entrar (scripts/recordatorios.mjs): al celular si
// activó las notificaciones, o si no, a su correo. La app nunca los ofrece por su cuenta.

import { CONFIG } from "./config.js";
import * as cloud from "./cloud.js";
import { toast } from "./util.js";

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
    <p class="muted small">Opcional y apagado de fábrica. Si lo activas y llevas 2 días o más sin pasar por la app, te mandamos un aviso suave (como máximo uno cada 3 días, de día): al celular si activas las notificaciones, o si no, a tu correo.</p>
    <label class="a11y-opt" style="margin-top:10px"><input type="checkbox" id="avisosOn" ${prefs && prefs.on === true ? "checked" : ""}><span><b>Quiero recibir recordatorios</b></span></label>
    ${prefs && prefs.on === true && supported() ? (perm === "granted" ? `<p class="small" style="margin-top:8px">✅ Notificaciones activadas en este dispositivo.</p>` : perm === "denied"
      ? `<p class="small muted" style="margin-top:8px">Bloqueaste las notificaciones en este navegador. Puedes permitirlas desde los ajustes del sitio (el candado junto a la dirección).</p>`
      : `<button type="button" class="btn btn-primary btn-sm" style="margin-top:8px" data-avisos-on>🔔 Activar notificaciones en este dispositivo</button>`)
      : prefs && prefs.on === true && CONFIG.vapidPublicKey && isIOS() && !standalone() ? `<p class="small muted" style="margin-top:8px">En iPhone, primero agrega la app a tu pantalla de inicio (Compartir → «Agregar a inicio») y ábrela desde ahí.</p>` : ""}
  </section>`;
}

// Solo carga las preferencias para Mi cuenta: no se muestra nada en Inicio.
export async function afterRender() {
  const s = cloud.state();
  if (!cloud.enabled || !s.ready || !document.getElementById("avisosPanel")) return;
  if (!prefs) prefs = (await cloud.getAvisos()) || {};
  const p = document.getElementById("avisosPanel"); if (p) p.outerHTML = panelHTML();
}

document.addEventListener("click", async (e) => {
  if (e.target.closest("[data-avisos-on]")) { e.preventDefault(); if (await activar()) { const p = document.getElementById("avisosPanel"); if (p) p.outerHTML = panelHTML(); } }
});
document.addEventListener("change", async (e) => {
  if (e.target.id !== "avisosOn") return;
  try { await cloud.saveAvisos({ on: e.target.checked }); prefs = { ...(prefs || {}), on: e.target.checked }; toast(e.target.checked ? "Recordatorios activados" : "Ya no te enviaremos recordatorios", "ok"); const p = document.getElementById("avisosPanel"); if (p) p.outerHTML = panelHTML(); }
  catch { toast("No se pudo guardar", ""); e.target.checked = !e.target.checked; }
});
