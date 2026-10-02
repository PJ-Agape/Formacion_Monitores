// Capa de datos. Hoy guarda todo en este dispositivo (localStorage) y lee el
// contenido publicado desde data/contenido.json. Cuando se conecte una base de
// datos, solo este archivo tendrá que cambiar.

import { CONFIG } from "./config.js";
import { clone } from "./util.js";

const K = {
  profile: "agape_candidate",
  progress: "agape_progress_v2",
  oldProgress: "agape_all_progress",
  activeCourse: "agape_active_course_id",
  draft: "agape_draft_content",
  adminHash: "agape_admin_hash",
  oldAdminPin: "agape_admin_pin",
  mode: "agape_color_mode",
  cache: "agape_content_cache",
  notes: "agape_notes_v1",
  owner: "agape_local_owner",
};

// Aviso a la nube cuando cambia el avance o el cuaderno (lo registra cloud.js).
let syncHandler = null;
export const setSync = (f) => { syncHandler = f; };
const synced = (kind) => { if (syncHandler) syncHandler(kind); };

const read = (k, fallback = null) => {
  try { const v = localStorage.getItem(k); return v == null ? fallback : JSON.parse(v); }
  catch { return fallback; }
};
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const del = (k) => { try { localStorage.removeItem(k); } catch {} };

// ---------------- Contenido ----------------
let published = null;

export async function loadContent(fromCloud) {
  if (fromCloud) {
    const c = await fromCloud();
    if (c && Array.isArray(c.courses)) { published = c; write(K.cache, c); return published; }
  }
  try {
    const res = await fetch(CONFIG.contentUrl, { cache: "no-cache" });
    if (!res.ok) throw new Error(res.status);
    published = await res.json();
    write(K.cache, published);
  } catch (e) {
    published = read(K.cache);
    if (!published) throw e;
  }
  return published;
}

export const isPreview = () => sessionStorage.getItem("agape_preview") === "1" && !!read(K.draft);
export function setPreview(on) {
  if (on) sessionStorage.setItem("agape_preview", "1");
  else sessionStorage.removeItem("agape_preview");
}

// Contenido que ven los dirigentes (o el borrador, si el admin está en vista previa).
export function content() {
  return isPreview() ? read(K.draft) : published;
}
export const publishedContent = () => published;
export function setPublished(c) { published = c; write(K.cache, c); }

// Borrador del administrador
export const getDraft = () => read(K.draft);
export const hasDraft = () => !!read(K.draft);
export function ensureDraft() {
  let d = read(K.draft);
  if (!d) { d = clone(published); write(K.draft, d); }
  return d;
}
export const saveDraft = (d) => write(K.draft, d);
export const discardDraft = () => { del(K.draft); setPreview(false); };
export function draftIsDirty() {
  const d = read(K.draft);
  if (!d) return false;
  const strip = (o) => { const c = clone(o); delete c.version; delete c.updatedAt; return JSON.stringify(c); };
  return strip(d) !== strip(published);
}

// Contenido editado con la versión anterior de la página (vivía solo en el navegador).
export function legacyContent() {
  const catalog = read("agape_courses_catalog");
  const materials = read("agape_global_materials");
  const devotional = read("agape_global_devotional");
  if (!catalog && !materials && !devotional) return null;
  return { catalog, materials, devotional };
}
export function clearLegacy() {
  ["agape_courses_catalog", "agape_global_materials", "agape_global_devotional"].forEach(del);
}

// ---------------- Perfil del dirigente ----------------
const DEFAULT_NAME = "Dirigente en Formación";

export function getProfile() {
  const p = read(K.profile) || {};
  if (p.name === DEFAULT_NAME) p.name = "";
  if (p.parish === "Comunidad Parroquial") p.parish = "";
  return { name: p.name || "", parish: p.parish || "", certCode: p.certCode || newCode() };
}
export function saveProfile(p) {
  const cur = getProfile();
  write(K.profile, { ...cur, ...p });
}
export const hasProfile = () => !!getProfile().name;
function newCode() {
  const code = "AGP-" + Math.random().toString(36).slice(2, 7).toUpperCase();
  const p = read(K.profile) || {};
  p.certCode = code; write(K.profile, p);
  return code;
}

// ---------------- Itinerario activo ----------------
export function activeCourse() {
  const c = content();
  const id = read(K.activeCourse) ?? localStorage.getItem(K.activeCourse);
  return c.courses.find((x) => x.id === id) || c.courses[0];
}
export const setActiveCourse = (id) => write(K.activeCourse, id);

// ---------------- Progreso ----------------
function allProgress() {
  let p = read(K.progress);
  if (!p) {
    // Migración desde la versión anterior: { id: { completedPhases: [true, ...] } }
    p = {};
    const old = read(K.oldProgress) || {};
    for (const [id, v] of Object.entries(old)) {
      const phases = {};
      (v.completedPhases || []).forEach((done, i) => { if (done) phases[i] = true; });
      p[id] = { phases, read: {}, scores: {} };
    }
    write(K.progress, p);
  }
  return p;
}
export function progress(courseId) {
  const p = allProgress()[courseId] || {};
  return { phases: p.phases || {}, read: p.read || {}, scores: p.scores || {}, completedDate: p.completedDate || "", certCode: p.certCode || "" };
}
function saveProgress(courseId, prog) {
  const all = allProgress(); all[courseId] = prog; write(K.progress, all); synced("progress");
}
export const allProgressRaw = () => allProgress();
export function setAllProgress(obj, silent) { write(K.progress, obj || {}); if (!silent) synced("progress"); }
export function toggleRead(courseId, sessionKey) {
  const p = progress(courseId);
  if (p.read[sessionKey]) delete p.read[sessionKey]; else p.read[sessionKey] = true;
  saveProgress(courseId, p);
  return !!p.read[sessionKey];
}
export function markRead(courseId, sessionKey) {
  const p = progress(courseId);
  if (!p.read[sessionKey]) { p.read[sessionKey] = true; saveProgress(courseId, p); }
}
export function recordQuiz(courseId, phaseIdx, right, total, passed) {
  const p = progress(courseId);
  const prev = p.scores[phaseIdx];
  if (!prev || right >= prev.right) p.scores[phaseIdx] = { right, total, date: new Date().toISOString() };
  if (passed) p.phases[phaseIdx] = true;
  saveProgress(courseId, p);
  return p;
}
export function completeCourse(courseId) {
  const p = progress(courseId);
  if (!p.completedDate) p.completedDate = new Date().toISOString();
  if (!p.certCode) p.certCode = getProfile().certCode + "-" + Math.random().toString(36).slice(2, 5).toUpperCase();
  saveProgress(courseId, p);
  return p;
}
export function resetProgress(courseId) {
  const all = allProgress(); delete all[courseId]; write(K.progress, all); synced("progress");
}

// «Ver como…»: mientras el equipo mira la app como otro perfil, todos los módulos se pueden recorrer.
let PREVIEW_OPEN = false;
export const setPreviewOpen = (v) => { PREVIEW_OPEN = !!v; };
// Estado derivado útil para las vistas
export function courseState(course) {
  const p = progress(course.id);
  const phases = course.phases.map((ph, i) => {
    const done = !!p.phases[i];
    const open = PREVIEW_OPEN || i === 0 || !!p.phases[i - 1];
    const read = ph.sessions.filter((s) => p.read[sessionKey(i, s)]).length;
    return { done, open, read, total: ph.sessions.length, score: p.scores[i] };
  });
  const donePhases = phases.filter((x) => x.done).length;
  const totalSessions = phases.reduce((a, x) => a + x.total, 0);
  const readSessions = phases.reduce((a, x) => a + x.read, 0);
  const pct = course.phases.length ? Math.round((donePhases / course.phases.length) * 100) : 0;
  const complete = donePhases === course.phases.length && course.phases.length > 0;
  // Siguiente paso sugerido
  let next = null;
  for (let i = 0; i < course.phases.length && !next; i++) {
    if (!phases[i].open || phases[i].done) continue;
    const s = course.phases[i].sessions.find((s) => !p.read[sessionKey(i, s)]);
    next = s ? { type: "session", phase: i, session: s } : { type: "quiz", phase: i };
  }
  return { p, phases, donePhases, totalSessions, readSessions, pct, complete, next };
}
export const sessionKey = (phaseIdx, s) => `${phaseIdx}:${s.id}`;

// ---------------- Cuaderno personal ----------------
// { courseId: { "fase:unidad": { indicePregunta: "texto" } } }
export function getNotes(courseId, key) {
  const all = read(K.notes) || {};
  return (all[courseId] && all[courseId][key]) || {};
}
export function setNote(courseId, key, qi, text) {
  const all = read(K.notes) || {};
  all[courseId] = all[courseId] || {};
  all[courseId][key] = all[courseId][key] || {};
  if (text && text.trim()) all[courseId][key][qi] = text; else delete all[courseId][key][qi];
  write(K.notes, all); synced("notes");
}
export const allNotesRaw = () => read(K.notes) || {};
export function setAllNotes(obj, silent) { write(K.notes, obj || {}); if (!silent) synced("notes"); }

// Dueño de los datos locales (en modo con cuentas) y limpieza al cerrar sesión.
export const localOwner = () => localStorage.getItem(K.owner) || "";
export const setLocalOwner = (uid) => localStorage.setItem(K.owner, uid);
export function clearUserLocal() {
  [K.progress, K.notes, K.profile, K.owner, K.oldProgress].forEach(del);
}

// ---------------- Administración ----------------
export function adminHash() {
  return read(K.adminHash) || CONFIG.defaultAdminHash;
}
export const setAdminHash = (h) => write(K.adminHash, h);
export const oldAdminPin = () => localStorage.getItem(K.oldAdminPin);
export const clearOldAdminPin = () => del(K.oldAdminPin);
export const isAdmin = () => sessionStorage.getItem("agape_admin") === "1";
export function setAdmin(on) {
  if (on) sessionStorage.setItem("agape_admin", "1");
  else { sessionStorage.removeItem("agape_admin"); setPreview(false); }
}

// ---------------- Preferencias ----------------
export const getMode = () => localStorage.getItem(K.mode) || "auto";
export const setMode = (m) => localStorage.setItem(K.mode, m);
