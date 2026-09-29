// Conexión con Firebase: inicio de sesión con Google por invitación,
// sincronización del avance y del cuaderno, contenido publicado,
// constancias verificables y datos del panel de seguimiento.
// Si CONFIG.firebase es null, la app sigue funcionando en modo local.

import { CONFIG } from "./config.js";
import * as S from "./store.js";

export const enabled = !!(CONFIG.firebase && CONFIG.firebase.apiKey);

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

export function state() {
  return {
    enabled, status, user, account, error: lastError,
    isAdmin: !!(account && account.active !== false && account.role === "admin"),
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
  } catch (e) { console.warn("Constancia:", e); }
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
export async function invite({ email, name, parish, role }) {
  email = lower(email);
  await fb.setDoc(fb.doc(db, "invites", email), { name, parish: parish || "", role, createdAt: fb.serverTimestamp(), createdBy: account.email });
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
