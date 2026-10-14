// Gestión → Hoy: el tablero de pendientes. Junta en un solo lugar lo que pide atención del equipo
// (o del dirigente, solo lo de su familia), cada cosa con su botón para resolverla.
// No guarda nada propio: lee lo que ya existe (cuentas, asistencia, familias, muro, honor, Papa, revista).

import * as cloud from "./cloud.js";
import { esc, icon } from "./util.js";
import * as reg from "./familias-registro.js";
import * as papa from "./papa.js";
import { MESES, corto, fechaDe } from "./familias-ag.js";

const st = () => cloud.state();
const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const hoyIso = () => iso(new Date());
const dIso = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const corta = (s) => { const d = dIso(s); return `${d.getDate()} ${MESES[d.getMonth()].slice(0, 3)}`; };

// Un pendiente: nivel (urgente · revisar · info), ícono, título, detalle, acción
const item = (lvl, ico, t, det, href, btn) => ({ lvl, ico, t, det, href, btn });
const ORD = { urgente: 0, revisar: 1, info: 2 };

export function html() {
  setTimeout(paint, 0);
  const s = st(), quien = s.isAdmin ? "administración" : s.isStaff ? "coordinación" : "tu familia";
  const hoy = new Date().toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" });
  return `<header class="page-head"><span class="eyebrow">Gestión · ${esc(quien)}</span><h1>Hoy, <em>${esc(hoy)}</em></h1>
    <p>Lo que pide atención ahora. Cada pendiente tiene su botón para resolverlo.</p></header>
    <div id="ghList" class="gh-list"><p class="muted" style="padding:24px;text-align:center">Revisando pendientes…</p></div>`;
}

async function paint() {
  const box = document.getElementById("ghList"); if (!box) return;
  let items = [];
  try { items = await pendientes(); } catch (e) { console.warn("Hoy:", e); }
  if (!document.getElementById("ghList")) return;
  items.sort((a, b) => ORD[a.lvl] - ORD[b.lvl]);
  const grupo = (lvl, titulo) => { const xs = items.filter((x) => x.lvl === lvl); return xs.length ? `<h2 class="mag-hub-sub gh-h ${lvl}">${titulo} · ${xs.length}</h2>${xs.map(card).join("")}` : ""; };
  box.innerHTML = items.filter((x) => x.lvl !== "info").length
    ? grupo("urgente", "Para hoy") + grupo("revisar", "Para revisar") + grupo("info", "Para tener en cuenta")
    : `<div class="card gh-ok"><b>✨ Todo al día</b><p class="muted small">No hay pendientes. Buen momento para preparar el próximo encuentro.</p></div>${grupo("info", "Para tener en cuenta")}`;
}
const card = (x) => `<div class="card gh-i ${x.lvl}"><span class="gh-ico" aria-hidden="true">${x.ico}</span>
  <div class="gh-txt"><b>${esc(x.t)}</b>${x.det ? `<span class="small muted">${x.det}</span>` : ""}</div>
  ${x.href ? `<a class="btn btn-sm ${x.lvl === "urgente" ? "btn-primary" : "btn-soft"}" href="${x.href}">${esc(x.btn || "Ver")}</a>` : ""}</div>`;

async function pendientes() {
  const s = st(), me = cloud.myUid(), out = [];
  const D = await reg.load(true).catch(() => null);
  const fams = (D && D.fams) || [];
  const misFams = s.isStaff ? fams : fams.filter((f) => (f.uids || []).includes(me));
  const hoy = hoyIso();

  // 1) Cuentas: invitaciones que nadie ha usado (administración)
  if (s.isAdmin) {
    const ad = await cloud.adminData().catch(() => null);
    const inv = ad ? ad.invites : [];
    if (inv.length) out.push(item("revisar", "✉️", `${inv.length} invitación${inv.length > 1 ? "es" : ""} sin usar`,
      `${inv.slice(0, 3).map((i) => esc(i.name || i.id)).join(", ")}${inv.length > 3 ? "…" : ""}. Recuérdales entrar con su cuenta de Google.`, "#/admin/dirigentes", "Ver cuentas"));
  }

  if (D && D.ok) {
    // 2) Lista del último encuentro (familias con integrantes y nadie marcado presente)
    const cal = (D.cal && D.cal.encuentros || []).map((e) => ({ ...e, date: fechaDe(e.fecha) })).filter((e) => e.date);
    const ult = cal.filter((e) => iso(e.date) <= hoy).pop();
    if (ult && (dIso(hoy) - ult.date) / 86400000 <= 6) {
      const f0 = iso(ult.date);
      const sin = misFams.map((r) => reg.famOf(r.id)).filter((f) => { const a = reg.asis(f, f0); return a.total && !a.pres.length; });
      sin.forEach((f) => out.push(item("urgente", "📋", `Pasar lista · ${f.nombre || `Familia ${f.i + 1}`}`, `Encuentro N° ${ult.n} del ${corta(f0)}: aún no hay nadie marcado presente.`, `#/nuestras-familias/${f.id}/registro/${f0}`, "Pasar lista")));
    }
    // 3) Jóvenes que faltaron a 3 o más encuentros seguidos y nadie ha contactado
    const ses = D.ses.map((x) => x.id).sort(), last = ses[ses.length - 1];
    const mios = s.isStaff ? D.J : D.J.filter((j) => j.guia === me || j.guia2 === me);
    const faltan = mios.filter((j) => j.activo !== false && j.etapa !== "equipo").map((j) => {
      const f = new Set(j.fechas || []), desde = [j.desde, [...f].sort()[0]].filter(Boolean).sort()[0] || "0000"; let n = 0;
      for (const x of [...ses].reverse()) { if (x < desde || f.has(x)) break; n++; }
      return { j, n };
    }).filter((x) => x.n >= 3 && !(x.j.contactado && x.j.contactado >= last));
    if (faltan.length) out.push(item("urgente", "🤝", `${faltan.length} joven${faltan.length > 1 ? "es" : ""} para llamar`,
      faltan.slice(0, 4).map((x) => `${esc(corto(x.j.nombre))} (${x.n} seguidos)`).join(", ") + (faltan.length > 4 ? "…" : ""), "#/acompanar/asistencia", "Acompañar"));
    // 4) Evaluaciones de la última semana
    const ev = await Promise.all(misFams.map((f) => cloud.listFamEvals(f.id).catch(() => [])));
    const semana = Date.now() - 7 * 86400000;
    const nuevas = ev.flat().filter((r) => { const t = r.at && (r.at.toDate ? r.at.toDate().getTime() : r.at.seconds * 1000 || r.at.__ts); return t && t >= semana; });
    if (nuevas.length) {
      const coms = nuevas.filter((r) => (r.c || "").trim()).length;
      out.push(item("revisar", "⭐", `${nuevas.length} evaluación${nuevas.length > 1 ? "es" : ""} nueva${nuevas.length > 1 ? "s" : ""} esta semana`, coms ? `${coms} con comentario.` : "", ult ? `#/nuestras-familias/${(misFams[0] || {}).id || "f1"}/registro/${iso(ult.date)}` : "#/nuestras-familias", "Ver resultados"));
    }
  }

  // 5) Moderación: publicaciones y respuestas reportadas (equipo)
  if (s.isStaff) {
    const [wall, flag] = await Promise.all([cloud.latestWall().catch(() => []), s.isAdmin ? cloud.flaggedReplies().catch(() => []) : []]);
    const rep = wall.filter((p) => Object.keys(p.reports || {}).length && !p.hidden).length + flag.filter((r) => !r.hidden).length;
    if (rep) out.push(item("urgente", "🚩", `${rep} reporte${rep > 1 ? "s" : ""} en el muro`, "Alguien marcó una publicación o respuesta. Revísala y ocúltala si corresponde.", "#/muro", "Moderar"));
    // 6) Cuadro de honor del mes anterior
    const h = D && D.honor, now = new Date(), prev = iso(new Date(now.getFullYear(), now.getMonth() - 1, 1)).slice(0, 7);
    if (!h || (h.mes !== prev && h.mes !== iso(now).slice(0, 7))) out.push(item("revisar", "🏆", `Publicar el cuadro de honor de ${MESES[+prev.slice(5) - 1]}`, "Asistencia perfecta y sellos del mes. Solo aparece quien tiene autorización de su familia.", "#/acompanar/honor", "Cuadro de honor"));
    // 7) Intención del Papa del mes
    if (!(await papa.intencionCargada())) out.push(item("revisar", "🙏", "Falta la intención del Papa de este mes", "Cárgala para que salga en Inicio y en el rosario.", "#/admin/resumen", "Cargar"));
    // 8) La revista del año siguiente (de agosto en adelante)
    const y = D && D.cal && D.cal.year, mes = now.getMonth() + 1;
    if (y && y <= now.getFullYear() && mes >= 8) out.push(item(mes >= 11 ? "urgente" : "revisar", "📰", `Preparar la revista ${now.getFullYear() + 1}`, mes >= 11 ? "Se publica en diciembre, después de Cristo Rey. Pídesela a Claude." : "Agosto: calendario · septiembre: lema · octubre: redacción · noviembre: revisión.", "#/encuentros", "Ver revista"));
    // 9) Saludos de WhatsApp
    out.push(item("info", "☀️", "Saludos de hoy listos para WhatsApp", "Buenos días y buenas noches, con su imagen.", "#/admin/saludos", "Abrir"));
  }
  // 10) Cumpleaños de la semana (autorizados)
  const cum = await cloud.getCumples().catch(() => null);
  if (cum && cum.items) {
    const dias = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i); return `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; });
    const c = cum.items.filter((x) => dias.includes(x.md)).sort((a, b) => dias.indexOf(a.md) - dias.indexOf(b.md));
    if (c.length) out.push(item("info", "🎂", `Cumpleaños esta semana`, c.map((x) => `${esc(x.n)} (${+x.md.slice(3)}/${+x.md.slice(0, 2)})`).join(", "), "#/chat/general", "Saludar"));
  }
  if (!s.isStaff && !misFams.length) out.push(item("info", "👨‍👩‍👧‍👦", "Aún no tienes una familia asignada", "El equipo te asigna en Nuestras familias.", "#/nuestras-familias", "Ver familias"));
  return out;
}
