// Solicitar una cuenta (#/solicitar): quien quiere formar parte de Ágape, o ya participa, entra con
// su cuenta de Google y deja su nombre, edad y parroquia o capilla. Un administrador la revisa en
// Gestión → Cuentas e invitaciones y le da acceso (todas las cuentas nuevas parten como Joven · Ingreso).
import { esc, icon, toast } from "./util.js";
import { illus } from "./ilustraciones.js";

let ctx = null; // { actions, render, onAfterRender, cloud }
export function setup(c) { ctx = c; registerActions(); }
const $ = (s, r = document) => r.querySelector(s);
const st = () => ctx.cloud.state();
let editing = false;

// Tarjeta de Inicio para quien no tiene cuenta
export function homeCard() {
  if (!ctx.cloud.enabled || st().ready || st().status === "inactive") return "";
  return `<section class="hub-cbanner sol-banner" aria-labelledby="solHT">
    <div class="hub-cb-txt">
      <span class="hub-cb-hand">nos encantaría conocerte</span>
      <h2 id="solHT">¿Quieres formar parte o ya participas de la PJ Ágape?</h2>
      <p class="hub-cb-meta">Solicita tu cuenta con un formulario corto: tu nombre, tu edad, tu correo de Google y tu parroquia o capilla.</p>
      <div class="hub-cb-btns"><a class="btn btn-gold" href="#/solicitar">Solicitar mi cuenta ${icon("arrowR")}</a></div>
    </div>
    <div class="hub-cb-art" aria-hidden="true"><i class="hub-cb-sun"></i>${illus("acogida", "hub-cb-il")}</div>
  </section>`;
}

const head = `<header class="page-head"><span class="eyebrow">Tu cuenta en agAPPe</span><h1>Solicita tu <em>cuenta</em></h1>
  <p>Si quieres formar parte o ya participas de la Pastoral Juvenil Ágape, déjanos tus datos. El equipo revisará tu solicitud y te dará acceso.</p></header>`;
const GOOGLE = `<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>`;

export function view() {
  if (!ctx.cloud.enabled) return `${head}<div class="card"><p class="muted">Las cuentas no están activas en esta versión de la app.</p></div>`;
  const s = st();
  if (s.ready) return `${head}<div class="card sol-card" style="text-align:center">${illus("acogida", "sol-il")}
    <h2 class="display">Ya tienes tu cuenta</h2><p class="muted">Entraste como <b>${esc(s.account?.email || "")}</b>.</p>
    <a class="btn btn-primary" style="margin-top:14px" href="#/">Ir a Inicio</a></div>`;
  if (s.status === "loading") return `${head}<div class="card"><p class="muted">Conectando…</p></div>`;
  if (s.status === "inactive") return `${head}<div class="card"><p>Tu cuenta está en pausa. Conversa con el equipo coordinador para reactivarla.</p></div>`;
  if (!s.user) return `${head}
    <div class="card sol-card">
      <ol class="sol-steps">
        <li><b>1</b><span><strong>Entra con tu cuenta de Google</strong>Puede ser tu Gmail. Así podrás ingresar a la app cuando te den acceso.</span></li>
        <li><b>2</b><span><strong>Completa tus datos</strong>Tu nombre, tu edad y tu parroquia o capilla.</span></li>
        <li><b>3</b><span><strong>El equipo te da acceso</strong>Revisamos cada solicitud con cariño y te avisamos.</span></li>
      </ol>
      <button class="btn btn-primary btn-block google-btn" data-action="signIn">${GOOGLE} Continuar con Google</button>
    </div>`;
  editing = false;
  ctx.onAfterRender(paint);
  return `${head}<div id="solBox" class="card sol-card"><p class="muted">Un momento…</p></div>`;
}

async function paint() {
  const box = $("#solBox"); if (!box) return;
  const sol = await ctx.cloud.getMySolicitud();
  box.innerHTML = sol && !editing ? sentHTML(sol) : formHTML(sol);
}
function formHTML(sol) {
  const u = st().user || {};
  return `<form id="solForm" class="stack" style="--gap:14px">
    <div class="field"><label for="solName">Nombre y apellido</label><input class="input big" id="solName" name="name" required maxlength="80" autocomplete="name" value="${esc(sol?.name || u.displayName || "")}"></div>
    <div class="field"><label for="solEdad">Edad</label><input class="input" id="solEdad" name="edad" type="number" inputmode="numeric" min="8" max="99" required value="${esc(sol?.edad ?? "")}" style="max-width:140px"></div>
    <div class="field"><label>Correo de Google</label><input class="input" value="${esc(u.email || "")}" readonly>
      <span class="xs muted">Con este correo entrarás a la app. ¿No es el tuyo? <a href="#" data-action="solOtra">Usar otra cuenta</a></span></div>
    <div class="field"><label for="solPar">Parroquia o capilla de la que vienes</label><input class="input" id="solPar" name="parish" required maxlength="120" list="solParList" value="${esc(sol?.parish || "")}">
      <datalist id="solParList"><option value="Parroquia San Miguel de Yungay"></option></datalist></div>
    <p class="xs muted">Tus datos solo los ve el equipo que administra la app. En la comunidad aparecerás con tu nombre y la inicial de tu apellido.</p>
    <div class="row-wrap"><button class="btn btn-primary" type="submit">${icon("send")} ${sol ? "Guardar cambios" : "Enviar solicitud"}</button>
      ${sol ? `<button class="btn btn-ghost" type="button" data-action="solCancel">Cancelar</button>` : ""}</div>
  </form>`;
}
function sentHTML(sol) {
  const first = String(sol.name || "").split(" ")[0];
  return `<div style="text-align:center">${illus("acogida", "sol-il")}
    <span class="hub-cb-hand">¡gracias${first ? ", " + esc(first) : ""}!</span>
    <h2 class="display" style="margin-top:4px">Recibimos tu solicitud</h2>
    <p class="muted" style="margin:8px auto 0;max-width:46ch">El equipo la revisará pronto. Cuando te den acceso, vuelve a abrir la app y entrarás directamente.</p>
    ${+sol.edad < 18 ? `<div class="note sol-auth" style="margin:16px auto 0;max-width:54ch;text-align:left">
      <strong>Falta un paso: la autorización de tu familia</strong>
      <p style="margin:6px 0 0">Como eres menor de edad, tu papá, mamá o apoderado tiene que firmar una autorización. Descárgala, imprímela, pídele que la firme y entrégasela a tu dirigente. Con eso el equipo activa tu cuenta.</p>
      <button class="btn btn-gold" style="margin-top:12px" data-action="solPdf">${icon("dl")} Descargar la autorización (PDF)</button>
    </div>` : ""}
    <div class="row-wrap" style="justify-content:center;margin-top:18px">
      <button class="btn btn-primary" data-action="solCheck">${icon("undo")} Revisar si ya tengo acceso</button>
      <button class="btn btn-ghost" data-action="solEdit">${icon("edit")} Corregir mis datos</button></div>
  </div>`;
}

function registerActions() {
  const A = ctx.actions;
  A.solEdit = () => { editing = true; paint(); };
  A.solPdf = async (el) => {
    el.disabled = true;
    const sol = await ctx.cloud.getMySolicitud();
    try { const m = await import("./consentimiento.js"); await m.download({ nombre: sol?.name || "", etapa: "Ingreso", correo: sol?.email || st().user?.email || "" }); }
    catch (e) { console.warn(e); toast("No se pudo crear el PDF. Inténtalo de nuevo.", ""); }
    el.disabled = false;
  };
  A.solCancel = () => { editing = false; paint(); };
  A.solOtra = async () => { await ctx.cloud.signOutUser(); await ctx.cloud.signIn(); };
  A.solCheck = async (el) => {
    el.disabled = true;
    await ctx.cloud.recheck();
    if (st().ready) { toast("¡Bienvenido a agAPPe!", "ok"); location.hash = "#/"; }
    else { el.disabled = false; toast("Todavía no tienes acceso. Te avisamos apenas el equipo revise tu solicitud.", "", 4500); }
  };
  document.addEventListener("submit", async (e) => {
    if (e.target.id !== "solForm") return;
    e.preventDefault();
    const fd = new FormData(e.target), name = String(fd.get("name") || "").trim().replace(/\s+/g, " "), parish = String(fd.get("parish") || "").trim(), edad = +fd.get("edad");
    if (name.split(" ").length < 2) { toast("Escribe tu nombre y tu apellido", ""); return; }
    if (!(edad >= 8 && edad <= 99)) { toast("Revisa tu edad", ""); return; }
    if (!parish) { toast("Cuéntanos de qué parroquia o capilla vienes", ""); return; }
    const btn = e.target.querySelector("[type=submit]"); btn.disabled = true;
    try { await ctx.cloud.saveSolicitud({ name, edad, parish }); editing = false; toast("¡Solicitud enviada!", "ok"); paint(); }
    catch (err) { console.warn(err); btn.disabled = false; toast("No se pudo enviar. Revisa tu conexión e inténtalo de nuevo.", ""); }
  });
}
