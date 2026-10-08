// Conexión con Firebase: inicio de sesión con Google por invitación,
// sincronización del avance y del cuaderno, contenido publicado,
// constancias verificables y datos del panel de seguimiento.
// Si CONFIG.firebase es null, la app sigue funcionando en modo local.

import { CONFIG } from "./config.js";
import * as S from "./store.js";

export const enabled = !!(CONFIG.firebase && CONFIG.firebase.apiKey);

// Roles de la pastoral
export const ROLES = [
  { key: "admin", label: "Administrador", short: "Admin", desc: "Todo: Gestión completa, cuentas, roles, contenido del curso y seguimiento." },
  { key: "coordinador", label: "Coordinador", short: "Coordinación", desc: "Agenda, Portada de Inicio y moderación del muro y del chat. No cambia roles ni el curso." },
  { key: "dirigente", label: "Dirigente", short: "Dirigente", desc: "Hace el curso, participa en el muro y en sus salas de chat." },
  { key: "aspirante", label: "Aspirante", short: "Aspirante", desc: "Se prepara para ser dirigente: Mi Camino (revista Aspirante), el curso y la sala Aspirantes." },
  { key: "ingreso", label: "Joven · Ingreso", short: "Ingreso", desc: "Joven del grupo: Mi Camino con la revista de Ingreso, agenda, muro, sala general y capilla." },
  { key: "madurez", label: "Joven · Madurez", short: "Madurez", desc: "Joven del grupo: Mi Camino con la revista de Madurez, agenda, muro, sala general y capilla." },
];
export const JOVEN = ["ingreso", "madurez"];
export const isJovenRole = (r) => JOVEN.includes(r);
export const STAFF = ["admin", "coordinador"];
export const roleLabel = (r) => (ROLES.find((x) => x.key === r) || ROLES[2]).label;
export const isStaffRole = (r) => STAFF.includes(r);
// Cuentas protegidas: siempre administradoras, nadie puede quitarles el rol ni pausarlas.
export const isProtected = (email) => (CONFIG.bootstrapAdmins || []).map((e) => String(e).toLowerCase()).includes(String(email || "").toLowerCase());

let fb = null, auth = null, db = null;
let user = null;      // usuario de Firebase Auth
let account = null;   // documento users/{uid}
let status = enabled ? "loading" : "local"; // local | loading | guest | ready | not-invited | inactive | error
let lastError = "";
const listeners = [];
export const onChange = (f) => listeners.push(f);
const emit = () => listeners.forEach((f) => { try { f(); } catch {} });

const withTimeout = (p, ms = 8000) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);
const lower = (e) => String(e || "").trim().toLowerCase();

// «Ver como…»: el equipo puede mirar la app como otro perfil para guiar a alguien.
// Cambia solo lo que se muestra (menú, secciones, bloqueos); sus permisos reales no cambian.
const VA_KEY = "agape_ver_como";
let viewAs = (() => { try { return sessionStorage.getItem(VA_KEY) || ""; } catch { return ""; } })();
const realStaff = () => !!(account && account.active !== false && STAFF.includes(account.role));
export const viewingAs = () => (status === "ready" && realStaff() && viewAs ? viewAs : "");
export function setViewAs(r) {
  viewAs = r || "";
  try { r ? sessionStorage.setItem(VA_KEY, r) : sessionStorage.removeItem(VA_KEY); } catch {}
  emit();
}
export const realRole = () => (account ? account.role : "");
export function state() {
  const va = viewingAs();
  if (va === "visitante") return { enabled, status: "guest", user: null, account: null, error: "", isAdmin: false, isStaff: false, isGuide: false, canSongs: false, role: "", isJoven: false, ready: false, viewAs: va };
  const real = account;
  const account2 = va ? { ...real, role: va } : real;
  return realState(account2, va);
}
function realState(account, va) {
  return {
    enabled, status, user, account, error: lastError, viewAs: va || "",
    isAdmin: !!(account && account.active !== false && account.role === "admin"),
    // Equipo: administradores y coordinadores (moderan muro y chat, editan Agenda y Portada)
    isStaff: !!(account && account.active !== false && STAFF.includes(account.role)),
    // Guías: quienes acompañan a los jóvenes (equipo + dirigentes).
    isGuide: !!(account && account.active !== false && ["admin", "coordinador", "dirigente"].includes(account.role)),
    role: account ? account.role : "",
    // Jóvenes del grupo (Ingreso y Madurez): ven su espacio, no las herramientas del equipo.
    isJoven: !!(account && account.active !== false && ["ingreso", "madurez"].includes(account.role)),
    // Apostolado del cancionero: además del equipo, quienes un administrador habilita.
    canSongs: !!(account && account.active !== false && (STAFF.includes(account.role) || account.cantor === true)),
    ready: status === "ready",
  };
}

// ---------------------------------------------------------------------------
export async function init() {
  if (!enabled) return;
  try {
    fb = await import(CONFIG.firebaseModule || "./vendor/firebase.mjs");
    const app = fb.initializeApp(CONFIG.firebase);
    auth = fb.getAuth(app);
    try {
      db = fb.initializeFirestore(app, { localCache: fb.persistentLocalCache({ tabManager: fb.persistentMultipleTabManager() }) });
    } catch {
      db = fb.initializeFirestore(app, {});
    }
    if (CONFIG.emulators) {
      fb.connectAuthEmulator(auth, CONFIG.emulators.auth, { disableWarnings: true });
      const [h, p] = CONFIG.emulators.firestore.split(":");
      fb.connectFirestoreEmulator(db, h, +p);
    }
    S.setSync(queuePush);
    try { await fb.getRedirectResult(auth); } catch (e) { lastError = e.code || e.message; }
    await new Promise((resolve) => {
      let first = true;
      fb.onAuthStateChanged(auth, async (u) => {
        await handleUser(u);
        if (first) { first = false; resolve(); } else emit();
      });
    });
  } catch (e) {
    console.warn("Firebase:", e);
    status = "error"; lastError = e.message || String(e);
  }
}

async function handleUser(u) {
  user = u; account = null; lastError = "";
  if (!u) { status = "guest"; return; }
  try {
    const email = lower(u.email);
    const uref = fb.doc(db, "users", u.uid);
    let snap = await withTimeout(fb.getDoc(uref));
    if (!snap.exists()) {
      const bootstrap = (CONFIG.bootstrapAdmins || []).map(lower).includes(email);
      let invite = null;
      try { const is = await withTimeout(fb.getDoc(fb.doc(db, "invites", email))); if (is.exists()) invite = is.data(); } catch {}
      if (!invite && !bootstrap) { status = "not-invited"; return; }
      await withTimeout(fb.setDoc(uref, {
        email, name: (invite && invite.name) || u.displayName || email, parish: (invite && invite.parish) || "",
        role: invite ? invite.role : "admin", active: true, createdAt: fb.serverTimestamp(), lastSeen: fb.serverTimestamp(),
        ...(invite && invite.consent ? { consent: invite.consent } : {}),
      }));
      snap = await withTimeout(fb.getDoc(uref));
    }
    account = { uid: u.uid, ...snap.data() };
    if (account.active === false) { status = "inactive"; return; }
    S.saveProfile({ name: account.name, parish: account.parish });
    await pullAndMerge();
    status = "ready";
    fb.updateDoc(uref, { lastSeen: fb.serverTimestamp() }).catch(() => {});
  } catch (e) {
    console.warn("Cuenta:", e);
    status = "error"; lastError = e.code || e.message;
  }
}

export async function signIn() {
  if (!enabled) return;
  const provider = new fb.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  try {
    await fb.signInWithPopup(auth, provider);
  } catch (e) {
    if (["auth/popup-blocked", "auth/operation-not-supported-in-this-environment", "auth/cancelled-popup-request"].includes(e.code)) {
      await fb.signInWithRedirect(auth, provider);
    } else if (e.code !== "auth/popup-closed-by-user") {
      lastError = e.code || e.message; emit(); throw e;
    }
  }
}

export async function signOutUser() {
  if (!enabled) return;
  await flushPush();
  await fb.signOut(auth);
  S.clearUserLocal();
}

// ---------------------------------------------------------------------------
// Sincronización del avance y del cuaderno
// ---------------------------------------------------------------------------
async function pullAndMerge() {
  const uid = user.uid;
  // Si el dispositivo tenía datos de otra persona, se descartan antes de traer los propios.
  const owner = S.localOwner();
  if (owner && owner !== uid) S.clearUserLocal();
  S.setLocalOwner(uid);

  const [ps, ns] = await Promise.all([
    withTimeout(fb.getDoc(fb.doc(db, "progress", uid))).catch(() => null),
    withTimeout(fb.getDoc(fb.doc(db, "notes", uid))).catch(() => null),
  ]);
  const cloudProg = ps && ps.exists() ? safeJSON(ps.data().json, {}) : {};
  const cloudNotes = ns && ns.exists() ? safeJSON(ns.data().json, {}) : {};
  const mergedProg = mergeProgress(cloudProg, S.allProgressRaw());
  const mergedNotes = mergeNotes(cloudNotes, S.allNotesRaw());
  S.setAllProgress(mergedProg, true);
  S.setAllNotes(mergedNotes, true);
  if (JSON.stringify(mergedProg) !== JSON.stringify(cloudProg)) dirty.progress = true;
  if (JSON.stringify(mergedNotes) !== JSON.stringify(cloudNotes)) dirty.notes = true;
  if (dirty.progress || dirty.notes) queuePush();
}
const safeJSON = (s, d) => { try { return JSON.parse(s); } catch { return d; } };

function mergeProgress(a, b) {
  const out = JSON.parse(JSON.stringify(a || {}));
  for (const [cid, p] of Object.entries(b || {})) {
    const o = out[cid] = out[cid] || { phases: {}, read: {}, scores: {} };
    o.phases = { ...(p.phases || {}), ...(o.phases || {}) };
    o.read = { ...(p.read || {}), ...(o.read || {}) };
    o.scores = o.scores || {};
    for (const [k, s] of Object.entries(p.scores || {})) if (!o.scores[k] || s.right > o.scores[k].right) o.scores[k] = s;
    if (!o.completedDate || (p.completedDate && p.completedDate < o.completedDate)) o.completedDate = p.completedDate || o.completedDate || "";
    o.certCode = o.certCode || p.certCode || "";
  }
  return out;
}
function mergeNotes(a, b) {
  const out = JSON.parse(JSON.stringify(a || {}));
  for (const [cid, units] of Object.entries(b || {})) {
    out[cid] = out[cid] || {};
    for (const [k, qs] of Object.entries(units)) {
      out[cid][k] = out[cid][k] || {};
      for (const [qi, t] of Object.entries(qs)) if (!out[cid][k][qi]) out[cid][k][qi] = t;
    }
  }
  return out;
}

const dirty = { progress: false, notes: false };
let pushTimer = null;
function queuePush(kind) {
  if (kind) dirty[kind] = true;
  if (!user || !account) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(flushPush, 1200);
}
export async function flushPush() {
  clearTimeout(pushTimer);
  if (!user || !account || account.active === false) return;
  const uid = user.uid;
  try {
    if (dirty.progress) {
      dirty.progress = false;
      const all = S.allProgressRaw();
      await fb.setDoc(fb.doc(db, "progress", uid), {
        json: JSON.stringify(all), summary: summarize(all),
        name: account.name, parish: account.parish || "", email: account.email, updatedAt: fb.serverTimestamp(),
      });
    }
    if (dirty.notes) {
      dirty.notes = false;
      await fb.setDoc(fb.doc(db, "notes", uid), { json: JSON.stringify(S.allNotesRaw()), updatedAt: fb.serverTimestamp() });
    }
  } catch (e) { console.warn("Sincronización:", e); }
}
window.addEventListener("pagehide", () => { flushPush(); });

// Resumen por curso que usa el panel de seguimiento (sin leer el detalle).
function summarize(all) {
  const out = {};
  for (const [cid, p] of Object.entries(all || {})) {
    out[cid] = {
      units: Object.keys(p.read || {}).length,
      modules: Object.values(p.phases || {}).filter(Boolean).length,
      complete: !!p.completedDate, certCode: p.certCode || "",
    };
  }
  return out;
}

// ---------------------------------------------------------------------------
// Contenido publicado
// ---------------------------------------------------------------------------
export async function fetchContent() {
  if (!enabled || !db) return null;
  try {
    const snap = await withTimeout(fb.getDoc(fb.doc(db, "content", "published")), 6000);
    return snap.exists() ? safeJSON(snap.data().json, null) : null;
  } catch { return null; }
}
export async function publishContent(data) {
  await fb.setDoc(fb.doc(db, "content", "published"), {
    json: JSON.stringify(data), version: data.version || 1, updatedAt: fb.serverTimestamp(), updatedBy: account.email,
  });
}

// ---------------------------------------------------------------------------
// Constancias verificables
// ---------------------------------------------------------------------------
export async function registerCertificate(course, prog) {
  if (!state().ready || !prog.certCode) return;
  try {
    const ref = fb.doc(db, "certificates", prog.certCode);
    if ((await withTimeout(fb.getDoc(ref))).exists()) return; // ya registrada (las constancias no se modifican)
    await fb.setDoc(ref, {
      uid: user.uid, name: account.name, parish: account.parish || "", course: course.title, courseId: course.id,
      date: prog.completedDate || new Date().toISOString(), createdAt: fb.serverTimestamp(),
    });
    await celebrate(course, prog.certCode);
  } catch (e) { console.warn("Constancia:", e); }
}
// Felicitación automática en el muro cuando alguien completa un curso (una por constancia).
async function celebrate(course, code) {
  try {
    const ref = fb.doc(db, "wall", "logro-" + code);
    if ((await withTimeout(fb.getDoc(ref))).exists()) return;
    const first = String(account.name || "").trim().split(/\s+/)[0] || "dirigente";
    await fb.setDoc(ref, {
      type: "logro", certCode: code, title: `¡Felicitaciones, ${first}!`,
      body: `${shortName(account.name)} completó el curso de formación «${course.title}». Su camino de formación ahora se hace servicio en la Pastoral Ágape. ¡Déjale tu saludo aquí abajo!`,
      ...author(), pinned: false, closed: false, hidden: false, likes: {}, reports: {}, replyCount: 0,
      createdAt: fb.serverTimestamp(), lastActivity: fb.serverTimestamp(),
    });
    window.dispatchEvent(new CustomEvent("agape:logro"));
  } catch (e) { console.warn("Logro:", e); }
}
export async function getCertificate(code) {
  if (!enabled || !db) return undefined;
  try {
    const snap = await withTimeout(fb.getDoc(fb.doc(db, "certificates", code)));
    return snap.exists() ? snap.data() : null;
  } catch { return undefined; }
}
export function verifyUrl(code) {
  return `${location.origin}${location.pathname}#/verificar/${encodeURIComponent(code)}`;
}

// ---------------------------------------------------------------------------
// Panel de seguimiento (solo administradores)
// ---------------------------------------------------------------------------
const all = async (name) => (await fb.getDocs(fb.collection(db, name))).docs.map((d) => ({ id: d.id, ...d.data() }));
export async function adminData() {
  const [users, progress, invites] = await Promise.all([all("users"), all("progress"), all("invites")]);
  const prog = Object.fromEntries(progress.map((p) => [p.id, p]));
  const used = new Set(users.map((u) => lower(u.email)));
  return {
    users: users.map((u) => ({ ...u, uid: u.id, progress: prog[u.id] || null })),
    invites: invites.filter((i) => !used.has(i.id)),
  };
}
export async function invite({ email, name, parish, role, consent }) {
  email = lower(email);
  const data = { name, parish: parish || "", role, createdAt: fb.serverTimestamp(), createdBy: account.email };
  if (consent) data.consent = { ...consent, registradoPor: account.email };
  await fb.setDoc(fb.doc(db, "invites", email), data);
}
export const deleteInvite = (email) => fb.deleteDoc(fb.doc(db, "invites", lower(email)));
export const updateUser = (uid, data) => fb.updateDoc(fb.doc(db, "users", uid), data);
export async function updateMyProfile(data) {
  await fb.updateDoc(fb.doc(db, "users", user.uid), data);
  account = { ...account, ...data };
  S.saveProfile({ name: account.name, parish: account.parish });
  dirty.progress = true; queuePush();
}
export function userProgressDetail(p) { return p && p.json ? safeJSON(p.json, {}) : {}; }

// ---------------------------------------------------------------------------
// Muro de la comunidad: anuncios, temas y preguntas con respuestas.
// Todos pueden leer; escriben los usuarios invitados; los administradores moderan.
// ---------------------------------------------------------------------------
// En el muro se muestra solo el nombre y la inicial del apellido ("Camila S.").
export function shortName(name) {
  const p = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!p.length) return "Dirigente";
  return p.length > 1 ? `${p[0]} ${p[p.length - 1][0].toUpperCase()}.` : p[0];
}
const snapRows = (qs) => qs.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) }));
const wallCol = () => fb.collection(db, "wall");
const repliesCol = (pid) => fb.collection(db, "wall", pid, "replies");
// Los administradores ven también lo oculto; el resto, solo lo visible.
const visibleQuery = (col) => (state().isStaff ? col : fb.query(col, fb.where("hidden", "==", false)));

export function watchWall(cb, onErr) {
  if (!enabled || !db) { onErr && onErr(new Error("offline")); return () => {}; }
  return fb.onSnapshot(visibleQuery(wallCol()), (qs) => cb(snapRows(qs)), (e) => { console.warn("Muro:", e); onErr && onErr(e); });
}
export function watchPost(pid, cb, onErr) {
  if (!enabled || !db) { onErr && onErr(new Error("offline")); return () => {}; }
  return fb.onSnapshot(fb.doc(db, "wall", pid),
    (s) => cb(s.exists() ? { id: s.id, ...s.data({ serverTimestamps: "estimate" }) } : null),
    (e) => { console.warn("Tema:", e); onErr && onErr(e); });
}
export function watchReplies(pid, cb, onErr) {
  if (!enabled || !db) return () => {};
  return fb.onSnapshot(visibleQuery(repliesCol(pid)), (qs) => cb(snapRows(qs)), (e) => { console.warn("Respuestas:", e); onErr && onErr(e); });
}
export async function latestWall() {
  if (!enabled || !db) return [];
  try { return snapRows(await withTimeout(fb.getDocs(visibleQuery(wallCol())), 6000)); } catch { return []; }
}
function author() {
  return { authorUid: user.uid, authorName: shortName(account.name), authorRole: account.role, authorAvatar: account.avatar || "" };
}
export async function createPost({ type, title, body, pinned, options }) {
  const ref = fb.doc(wallCol());
  const data = {
    type, title, body, ...author(), pinned: !!pinned, closed: false, hidden: false,
    likes: {}, reports: {}, replyCount: 0, createdAt: fb.serverTimestamp(), lastActivity: fb.serverTimestamp(),
  };
  if (type === "encuesta") { data.options = options; data.votes = {}; }
  await fb.setDoc(ref, data);
  return ref.id;
}
export const votePoll = (pid, i) => fb.updateDoc(fb.doc(db, "wall", pid), { [`votes.${user.uid}`]: i });
export const updatePost = (pid, data) => fb.updateDoc(fb.doc(db, "wall", pid), data);
// Al borrar una publicación se borran también sus respuestas.
export async function deletePost(pid) {
  const rs = await fb.getDocs(visibleQuery(repliesCol(pid)));
  const b = fb.writeBatch(db);
  rs.docs.forEach((d) => b.delete(d.ref));
  b.delete(fb.doc(db, "wall", pid));
  await b.commit();
}
// Moderación: respuestas reportadas u ocultas en todo el muro (solo administradores).
export async function flaggedReplies() {
  try {
    const rows = (await withTimeout(fb.getDocs(fb.collectionGroup(db, "replies")))).docs
      .map((d) => ({ id: d.id, pid: d.ref.parent.parent.id, ...d.data({ serverTimestamps: "estimate" }) }));
    return rows.filter((r) => r.hidden || Object.keys(r.reports || {}).length);
  } catch (e) { console.warn("Moderación:", e); return []; }
}
export async function createReply(pid, body) {
  const b = fb.writeBatch(db);
  b.set(fb.doc(repliesCol(pid)), { body, ...author(), hidden: false, likes: {}, reports: {}, createdAt: fb.serverTimestamp() });
  b.update(fb.doc(db, "wall", pid), { replyCount: fb.increment(1), lastActivity: fb.serverTimestamp() });
  await b.commit();
}
export const updateReply = (pid, rid, data) => fb.updateDoc(fb.doc(db, "wall", pid, "replies", rid), data);
export async function deleteReply(pid, rid) {
  const b = fb.writeBatch(db);
  b.delete(fb.doc(db, "wall", pid, "replies", rid));
  b.update(fb.doc(db, "wall", pid), { replyCount: fb.increment(-1) });
  await b.commit();
}
// Marca o desmarca "me gusta" / "reportar" solo con la clave propia.
export function toggleMark(path, field, on) {
  const ref = fb.doc(db, ...path);
  return fb.updateDoc(ref, { [`${field}.${user.uid}`]: on ? true : fb.deleteField() });
}
export const myUid = () => (user ? user.uid : "");

// ---------------------------------------------------------------------------
// Chat por salas (todas grupales; lo privado queda fuera de la app).
// ---------------------------------------------------------------------------
export const SALAS = [
  { key: "general", name: "Sala general", desc: "Todos los que tienen cuenta en Ágape." },
  { key: "coordinacion", name: "Equipo coordinador", desc: "Asesores y coordinadores." },
  { key: "dirigentes", name: "Dirigentes", desc: "Los dirigentes del grupo." },
  { key: "aspirantes", name: "Aspirantes", desc: "Quienes disciernen servir como dirigentes, con sus acompañantes." },
];
export const defaultSalas = (role) => (STAFF.includes(role) ? ["coordinacion", "dirigentes", "aspirantes"] : role === "aspirante" ? ["aspirantes"] : JOVEN.includes(role) ? [] : ["dirigentes"]);
// Salas creadas por el equipo (colección «salas»). Cada una dice quiénes entran:
// todos («all»), ciertos roles («roles») o personas elegidas («people», mínimo 3).
let custom = null;
export async function loadSalas(force) {
  if (!enabled || !db || !account) return custom || [];
  if (custom && !force) return custom;
  try { custom = snapRows(await withTimeout(fb.getDocs(fb.collection(db, "salas")), 6000)); } catch { custom = custom || []; }
  return custom;
}
export const BUILTIN = SALAS.map((s) => s.key);
export function allSalas() {
  return [...SALAS, ...(custom || []).map((s) => ({ ...s, key: s.id, custom: true }))];
}
export function canSee(s) {
  if (!account || account.active === false) return false;
  if (state().isStaff) return true;
  if (!s.custom) return s.key === "general" || (Array.isArray(account.salas) ? account.salas : defaultSalas(account.role)).includes(s.key);
  if (s.access === "all") return true;
  if (s.access === "roles") return (s.roles || []).includes(account.role);
  return (s.members || []).includes(user.uid);
}
export function mySalas() {
  if (!account) return [];
  return allSalas().filter(canSee).map((s) => s.key);
}
export async function saveSala(id, data) {
  const ref = id ? fb.doc(db, "salas", id) : fb.doc(fb.collection(db, "salas"));
  await fb.setDoc(ref, { ...data, updatedBy: account.email, updatedAt: fb.serverTimestamp() }, );
  custom = null; await loadSalas(true);
  return ref.id;
}
// Borra una sala con sus mensajes y su presencia (lo hace el equipo, que puede borrar mensajes).
export async function deleteSala(id) {
  for (const sub of ["msgs", "presence"]) {
    const qs = await fb.getDocs(fb.collection(db, "chat", id, sub));
    for (const d of qs.docs) await fb.deleteDoc(fb.doc(db, "chat", id, sub, d.id));
  }
  await fb.deleteDoc(fb.doc(db, "salas", id));
  custom = null; await loadSalas(true);
}
// Directorio para elegir integrantes (lo ven administradores y coordinadores).
export async function listPeople() {
  try { return snapRows(await withTimeout(fb.getDocs(fb.collection(db, "users")), 8000)).filter((u) => u.active !== false).map((u) => ({ uid: u.id, name: u.name || u.email, role: u.role })); }
  catch { return []; }
}
// Ajustes del chat (horario y limpieza): content/chat, lo edita un administrador.
export const CHAT_DEFAULT = { desde: "08:00", hasta: "22:30", dias: 90 };
let chatCfg = null;
export async function chatConfig(force) {
  if (!chatCfg || force) chatCfg = { ...CHAT_DEFAULT, ...((await getContent("chat")) || {}) };
  return chatCfg;
}
export async function saveChatConfig(data) { await setContent("chat", data); chatCfg = { ...CHAT_DEFAULT, ...data }; }
// Borra los mensajes más antiguos que el plazo (lo hace el equipo al abrir una sala; hasta 100 por vez).
export async function purgeChat(sala, dias) {
  if (!enabled || !db || !dias) return 0;
  const cut = fb.Timestamp ? fb.Timestamp.fromMillis(Date.now() - dias * 864e5) : new Date(Date.now() - dias * 864e5);
  const qs = await fb.getDocs(fb.query(fb.collection(db, "chat", sala, "msgs"), fb.where("createdAt", "<", cut), fb.orderBy("createdAt", "asc"), fb.limit(100)));
  await Promise.all(qs.docs.map((d) => fb.deleteDoc(fb.doc(db, "chat", sala, "msgs", d.id)).catch(() => {})));
  return qs.docs.length;
}
export function watchChat(sala, cb, onErr, limit = 40) {
  if (!enabled || !db) return () => {};
  const q = fb.query(fb.collection(db, "chat", sala, "msgs"), fb.orderBy("createdAt", "desc"), fb.limit(limit));
  return fb.onSnapshot(q, (qs) => cb(snapRows(qs).reverse()), (e) => { console.warn("Chat:", e); onErr && onErr(e); });
}
export async function lastChat(sala) {
  try {
    const qs = await withTimeout(fb.getDocs(fb.query(fb.collection(db, "chat", sala, "msgs"), fb.orderBy("createdAt", "desc"), fb.limit(1))), 6000);
    return snapRows(qs)[0] || null;
  } catch { return null; }
}
export async function sendChat(sala, text, replyTo) {
  const data = { text, ...author(), reports: {}, reactions: {}, createdAt: fb.serverTimestamp() };
  if (replyTo && replyTo.id) data.replyTo = { id: String(replyTo.id), name: String(replyTo.name || "").slice(0, 60), text: String(replyTo.text || "").slice(0, 140) };
  try { await fb.setDoc(fb.doc(fb.collection(db, "chat", sala, "msgs")), data); }
  catch (e) {
    // Respaldo mientras las reglas nuevas no estén publicadas: mensaje simple como antes.
    if (e && e.code === "permission-denied") {
      const { authorUid, authorName, authorRole } = author();
      await fb.setDoc(fb.doc(fb.collection(db, "chat", sala, "msgs")), { text, authorUid, authorName, authorRole, reports: {}, createdAt: fb.serverTimestamp() });
    } else throw e;
  }
}
// Zumbido: queda como mensaje visible en la sala («X le envió un zumbido a Y»).
export async function sendBuzz(sala, to) {
  await fb.setDoc(fb.doc(fb.collection(db, "chat", sala, "msgs")), {
    text: "le envió un zumbido a " + String(to.name || "").slice(0, 60), kind: "buzz", buzzTo: to.uid, buzzToName: String(to.name || "").slice(0, 60),
    ...author(), reports: {}, reactions: {}, createdAt: fb.serverTimestamp(),
  });
}
export const REACTIONS = ["❤️", "🙏", "😂", "👍", "😮", "🔥"];
export const reactChat = (sala, id, emoji) => fb.updateDoc(fb.doc(db, "chat", sala, "msgs", id), { [`reactions.${user.uid}`]: emoji ? emoji : fb.deleteField() });
// Presencia: quién tiene la sala abierta. Se renueva cada 3 minutos solo si la app está a la vista; al salir se borra.
export function joinRoom(sala) {
  if (!enabled || !db || !user || !account) return () => {};
  const ref = fb.doc(db, "chat", sala, "presence", user.uid);
  let lastBeat = 0;
  const beat = () => {
    if (document.visibilityState === "hidden" || Date.now() - lastBeat < 60000) return;
    lastBeat = Date.now();
    fb.setDoc(ref, { name: shortName(account.name), avatar: account.avatar || "", role: account.role, at: fb.serverTimestamp() }).catch(() => {});
  };
  beat();
  const t = setInterval(beat, 180000);
  const vis = () => { if (document.visibilityState === "visible") beat(); };
  document.addEventListener("visibilitychange", vis);
  const leave = () => { clearInterval(t); document.removeEventListener("visibilitychange", vis); window.removeEventListener("pagehide", leave); fb.deleteDoc(ref).catch(() => {}); };
  window.addEventListener("pagehide", leave);
  return leave;
}
export function watchPresence(sala, cb) {
  if (!enabled || !db) return () => {};
  return fb.onSnapshot(fb.collection(db, "chat", sala, "presence"), (qs) => cb(snapRows(qs)), (e) => console.warn("Presencia:", e));
}
export const deleteChat = (sala, id) => fb.deleteDoc(fb.doc(db, "chat", sala, "msgs", id));
export const reportChat = (sala, id, on) => toggleMark(["chat", sala, "msgs", id], "reports", on);

// ---------------------------------------------------------------------------
// Agenda oficial del grupo: la lee cualquiera, la editan los administradores.
// ---------------------------------------------------------------------------
export function watchAgenda(cb, onErr) {
  if (!enabled || !db) { onErr && onErr(new Error("offline")); return () => {}; }
  return fb.onSnapshot(fb.collection(db, "agenda"), (qs) => cb(snapRows(qs)), (e) => { console.warn("Agenda:", e); onErr && onErr(e); });
}
export async function listAgenda(strict) {
  if (!enabled || !db) return strict ? null : [];
  try { return snapRows(await withTimeout(fb.getDocs(fb.collection(db, "agenda")), 6000)); } catch { return strict ? null : []; }
}
export async function saveEvent(id, data) {
  const ref = id ? fb.doc(db, "agenda", id) : fb.doc(fb.collection(db, "agenda"));
  await fb.setDoc(ref, { ...data, updatedBy: account.email, updatedAt: fb.serverTimestamp() });
  return ref.id;
}
export const deleteEvent = (id) => fb.deleteDoc(fb.doc(db, "agenda", id));
export const patchEvent = (id, data) => fb.updateDoc(fb.doc(db, "agenda", id), data);

// ---------------------------------------------------------------------------
// Portada de Inicio (carrusel). Se guarda como content/portada: la lee cualquiera,
// la editan los administradores (misma regla que el contenido publicado).
// ---------------------------------------------------------------------------
export async function getPortada() {
  if (!enabled || !db) return null;
  try {
    const snap = await withTimeout(fb.getDoc(fb.doc(db, "content", "portada")), 6000);
    return snap.exists() ? safeJSON(snap.data().json, { slides: {} }) : { slides: {} };
  } catch { return null; }
}
export async function savePortada(data) {
  await fb.setDoc(fb.doc(db, "content", "portada"), { json: JSON.stringify(data), updatedAt: fb.serverTimestamp(), updatedBy: account.email });
}

// ---------------------------------------------------------------------------
// Velas de la capilla: intenciones de la comunidad (solo las ven quienes tienen cuenta).
// ---------------------------------------------------------------------------
export function watchVelas(cb, onErr) {
  if (!enabled || !db) { onErr && onErr(new Error("offline")); return () => {}; }
  const q = fb.query(fb.collection(db, "velas"), fb.orderBy("createdAt", "desc"), fb.limit(80));
  return fb.onSnapshot(q, (qs) => cb(snapRows(qs)), (e) => { console.warn("Velas:", e); onErr && onErr(e); });
}
// Últimas velas (una sola lectura, para la campanita de novedades)
export async function recentVelas(n = 20) {
  if (!enabled || !db) return [];
  try { return snapRows(await withTimeout(fb.getDocs(fb.query(fb.collection(db, "velas"), fb.orderBy("createdAt", "desc"), fb.limit(n))), 6000)); } catch { return []; }
}
export async function lightVela(text) {
  await fb.setDoc(fb.doc(fb.collection(db, "velas")), {
    text: String(text || "").slice(0, 1500), authorUid: user.uid, authorName: shortName(account.name), prays: {}, createdAt: fb.serverTimestamp(),
  });
}
export const prayVela = (id, on) => toggleMark(["velas", id], "prays", on);
export const deleteVela = (id) => fb.deleteDoc(fb.doc(db, "velas", id));

// ---------------------------------------------------------------------------
// Cancionero: canciones y repertorios (los ven quienes tienen cuenta; los edita el equipo).
// ---------------------------------------------------------------------------
const watchCol = (name) => (cb, onErr) => {
  if (!enabled || !db) { onErr && onErr(new Error("offline")); return () => {}; }
  return fb.onSnapshot(fb.collection(db, name), (qs) => cb(snapRows(qs)), (e) => { console.warn(name + ":", e); onErr && onErr(e); });
};
const saveIn = (name) => async (id, data) => {
  const ref = id ? fb.doc(db, name, id) : fb.doc(fb.collection(db, name));
  await fb.setDoc(ref, { ...data, updatedBy: account.email, updatedAt: fb.serverTimestamp() });
  return ref.id;
};
export const watchCanciones = watchCol("canciones");
export const saveCancion = saveIn("canciones");
export const deleteCancion = (id) => fb.deleteDoc(fb.doc(db, "canciones", id));
export const watchRepertorios = watchCol("repertorios");
export const saveRepertorio = saveIn("repertorios");
export const deleteRepertorio = (id) => fb.deleteDoc(fb.doc(db, "repertorios", id));

// Archivo de revistas de años anteriores (content/archivo): lo lee cualquiera, lo edita un administrador.
export async function getArchivo() {
  if (!enabled || !db) return null;
  try {
    const snap = await withTimeout(fb.getDoc(fb.doc(db, "content", "archivo")), 6000);
    return snap.exists() ? safeJSON(snap.data().json, { items: [] }) : { items: [] };
  } catch { return null; }
}
export async function saveArchivo(data) {
  await fb.setDoc(fb.doc(db, "content", "archivo"), { json: JSON.stringify(data), updatedAt: fb.serverTimestamp(), updatedBy: account.email });
}

// ---------------------------------------------------------------------------
// Banco de dinámicas (lo ven quienes tienen cuenta; lo alimentan los guías).
// ---------------------------------------------------------------------------
export const watchDinamicas = watchCol("dinamicas");
export const saveDinamica = saveIn("dinamicas");
export const deleteDinamica = (id) => fb.deleteDoc(fb.doc(db, "dinamicas", id));

// ---------------------------------------------------------------------------
// Acompañamiento: jóvenes, sesiones (asistencia), cumpleaños y cuadro de honor.
// Los jóvenes no necesitan cuenta; si la tienen, el equipo la vincula para que vean su pasaporte.
// ---------------------------------------------------------------------------
export const watchJovenes = watchCol("jovenes");
export const watchSesiones = watchCol("sesiones");
export const saveJoven = saveIn("jovenes");
export const patchJoven = (id, data) => fb.updateDoc(fb.doc(db, "jovenes", id), data);
export const deleteJoven = (id) => fb.deleteDoc(fb.doc(db, "jovenes", id));
export const listJovenes = () => all("jovenes");
// Grupo de WhatsApp de la app (privado/whatsapp): lo ven solo cuentas activas; lo edita el equipo.
let waCache;
export async function getGrupoWA(force) {
  if (!enabled || !db || !user) return null;
  if (waCache !== undefined && !force) return waCache;
  try { const s = await withTimeout(fb.getDoc(fb.doc(db, "privado", "whatsapp")), 6000); waCache = s.exists() ? s.data() : null; } catch { waCache = null; }
  return waCache;
}
export async function saveGrupoWA(d) { await fb.setDoc(fb.doc(db, "privado", "whatsapp"), { ...d, updatedAt: fb.serverTimestamp(), updatedBy: account.email }); waCache = d; }
export const saveSesion = (fecha, data) => fb.setDoc(fb.doc(db, "sesiones", fecha), { ...data, by: account.email, at: fb.serverTimestamp() });
export const deleteSesion = (fecha) => fb.deleteDoc(fb.doc(db, "sesiones", fecha));
export async function myJoven() {
  if (!enabled || !db || !user) return null;
  try { const qs = await withTimeout(fb.getDocs(fb.query(fb.collection(db, "jovenes"), fb.where("uid", "==", user.uid))), 6000); return snapRows(qs)[0] || null; }
  catch { return null; }
}
async function getContent(name) {
  if (!enabled || !db) return null;
  try { const snap = await withTimeout(fb.getDoc(fb.doc(db, "content", name)), 6000); return snap.exists() ? safeJSON(snap.data().json, null) : null; } catch { return null; }
}
const setContent = (name, data) => fb.setDoc(fb.doc(db, "content", name), { json: JSON.stringify(data), updatedAt: fb.serverTimestamp(), updatedBy: account.email });
// Cumpleaños: solo para quienes tienen cuenta (ya no en la zona pública «content»).
export async function getCumples() {
  if (!enabled || !db) return null;
  try { const s = await withTimeout(fb.getDoc(fb.doc(db, "privado", "cumples")), 6000); return s.exists() ? safeJSON(s.data().json, null) : null; } catch { return null; }
}
export async function saveCumples(d) {
  await fb.setDoc(fb.doc(db, "privado", "cumples"), { json: JSON.stringify(d), updatedAt: fb.serverTimestamp(), updatedBy: account.email });
  fb.deleteDoc(fb.doc(db, "content", "cumples")).catch(() => {}); // borra la copia pública antigua
}
export const getHonor = () => getContent("honor");
export const saveHonor = (d) => setContent("honor", d);
export const getFamilias = () => getContent("familias");
export const saveFamilias = (d) => setContent("familias", d);
export const getDesafio = () => getContent("desafio");
export const saveDesafio = (d) => setContent("desafio", d);
// Desafío de la semana: quién lo cumplió (cada uno marca el suyo).
export async function listDesafio(key) {
  try { return snapRows(await withTimeout(fb.getDocs(fb.collection(db, "desafios", key, "hechos")), 6000)); } catch { return []; }
}
export async function markDesafio(key, on) {
  const ref = fb.doc(db, "desafios", key, "hechos", user.uid);
  if (on) await fb.setDoc(ref, { n: shortName(account.name), a: account.avatar || "", at: fb.serverTimestamp() });
  else await fb.deleteDoc(ref);
}
