// Recordatorios suaves de Ágape (lo corre GitHub Actions una vez al día).
// A quien lleve 2 días o más sin entrar a la app —o, si es dirigente o aspirante, sin avanzar
// en la formación— le envía una notificación a su celular; si no la activó, un correo.
// SOLO a quien los activó en Mi cuenta (vienen apagados); como máximo un aviso cada 3 días.
//
// Secretos (GitHub → Settings → Secrets and variables → Actions):
//   FIREBASE_SERVICE_ACCOUNT  JSON de la cuenta de servicio de Firebase (obligatorio)
//   VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY  certificado Web Push (para notificaciones)
//   MAIL_USER / MAIL_PASS     correo de Gmail de la pastoral y su «contraseña de aplicación» (para correos)
// Sin los secretos de notificaciones o de correo, ese canal simplemente no se usa.
// DRY_RUN=1 muestra a quién le tocaría sin enviar nada.

import admin from "firebase-admin";
import webpush from "web-push";
import nodemailer from "nodemailer";

const DAY = 864e5, AFTER = 2, EVERY = 3;
const APP = "https://pj-agape.github.io/Formacion_Monitores/";
const COURSE = "curso-dirigentes-agape";
const DRY = process.env.DRY_RUN === "1";
const env = (k) => (process.env[k] || "").trim();

if (!env("FIREBASE_SERVICE_ACCOUNT")) { console.log("Falta el secreto FIREBASE_SERVICE_ACCOUNT: no hay nada que hacer todavía."); process.exit(0); }
admin.initializeApp({ credential: admin.credential.cert(JSON.parse(env("FIREBASE_SERVICE_ACCOUNT"))) });
const db = admin.firestore();

const canPush = !!(env("VAPID_PUBLIC_KEY") && env("VAPID_PRIVATE_KEY"));
if (canPush) webpush.setVapidDetails("mailto:" + (env("MAIL_USER") || "pastoral@example.com"), env("VAPID_PUBLIC_KEY"), env("VAPID_PRIVATE_KEY"));
const mailer = env("MAIL_USER") && env("MAIL_PASS")
  ? nodemailer.createTransport({ service: "gmail", auth: { user: env("MAIL_USER"), pass: env("MAIL_PASS") } }) : null;

const ms = (t) => (t && t.toMillis ? t.toMillis() : t ? +new Date(t) : 0);
const days = (t) => (ms(t) ? (Date.now() - ms(t)) / DAY : Infinity);
const first = (n) => String(n || "").trim().split(/\s+/)[0] || "";

const MSG = {
  app: (n) => ({ title: "¡Te extrañamos en Ágape! 💙", body: `${n ? n + ", h" : "H"}ace unos días que no pasas por la app. Tu comunidad y la Capilla te esperan.`, url: "./" }),
  curso: (n) => ({ title: "Tu formación te espera 📖", body: `${n ? n + ", u" : "U"}nos minutos hoy en «El Arte de Encontrarnos» y das un paso más. ¡Tú puedes!`, url: "./#/itinerario" }),
};
const html = (m) => `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;background:#fff6e5;border-radius:18px;color:#0b2566">
  <h2 style="margin:0 0 10px">${m.title}</h2><p style="font-size:16px;line-height:1.5">${m.body}</p>
  <p style="margin:22px 0"><a href="${new URL(m.url, APP).href}" style="background:#1351a4;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:bold">Entrar a la app</a></p>
  <p style="font-size:12px;color:#4a5d7a">Pastoral Juvenil Ágape · Parroquia San Miguel de Yungay.<br>Recibes esto porque activaste los recordatorios. Puedes apagarlos en la app, en «Mi cuenta» → Recordatorios.</p></div>`;

const [users, progress, avisos] = await Promise.all(["users", "progress", "avisos"].map(async (c) => {
  const qs = await db.collection(c).get(); return new Map(qs.docs.map((d) => [d.id, d.data()]));
}));

let push = 0, mail = 0, skip = 0;
for (const [uid, u] of users) {
  if (u.active === false || ["admin", "coordinador"].includes(u.role)) continue;
  const a = avisos.get(uid) || {};
  if (a.on !== true) continue;                 // voluntario: solo quien lo pidió
  if (days(a.last) < EVERY) { skip++; continue; }
  const p = progress.get(uid) || {}, sum = (p.summary || {})[COURSE] || {};
  const formRole = ["dirigente", "aspirante"].includes(u.role || "dirigente");
  let kind = null;
  if (days(u.lastSeen) >= AFTER) kind = "app";
  else if (formRole && !sum.complete && days(p.updatedAt) >= AFTER) kind = "curso";
  if (!kind) continue;
  const m = MSG[kind](first(u.name));
  let sent = false;
  // 1) Notificación a los dispositivos activados
  const alive = [];
  for (const raw of a.subs || []) {
    if (!canPush) { alive.push(raw); continue; }
    try {
      if (!DRY) await webpush.sendNotification(JSON.parse(raw), JSON.stringify({ ...m, tag: "agape-" + kind }), { TTL: 86400 });
      alive.push(raw); sent = true;
    } catch (e) { if (![404, 410].includes(e.statusCode)) { alive.push(raw); console.warn("Push", uid, e.statusCode || e.message); } }
  }
  // 2) Si no hubo notificación, correo
  if (!sent && mailer && u.email) {
    try { if (!DRY) await mailer.sendMail({ from: `"Pastoral Juvenil Ágape" <${env("MAIL_USER")}>`, to: u.email, subject: m.title, text: `${m.body}\n\n${new URL(m.url, APP).href}`, html: html(m) }); sent = true; mail++; }
    catch (e) { console.warn("Correo", uid, e.message); }
  } else if (sent) push++;
  console.log(`${DRY ? "[prueba] " : ""}${kind} → ${first(u.name) || uid}: ${sent ? "enviado" : "sin canal disponible"}`);
  if (sent && !DRY) await db.collection("avisos").doc(uid).set({ last: admin.firestore.FieldValue.serverTimestamp(), lastKind: kind, ...((a.subs || []).length !== alive.length ? { subs: alive } : {}) }, { merge: true });
}
console.log(`Listo: ${push} notificaciones, ${mail} correos, ${skip} omitidos (pausa de ${EVERY} días).`);
process.exit(0);
