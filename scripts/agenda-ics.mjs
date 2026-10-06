// Genera agenda.ics (calendario para suscribirse) a partir de la Agenda de Firestore
// y de los encuentros del Camino Ágape. Lo ejecuta cada hora una acción de GitHub.
// Uso: node scripts/agenda-ics.mjs [salida]   (sin dependencias; Node 18+)
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { rrule } from "../js/repeat.js";
import { leerIdentidad } from "./identidad.mjs";
const { ID, errores } = leerIdentidad();
if (!ID) { console.error("parroquia.json:\n  " + errores.join("\n  ")); process.exit(1); }

const OUT = process.argv[2] || "agenda.ics";
// Identidad y proyecto Firebase de esta pastoral (generado desde parroquia.json).
const KEY = ID.firebase?.apiKey;
const PROJECT = ID.firebase?.projectId;
const TZ = "America/Santiago";
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const TYPES = { encuentro: "Encuentro", actividad: "Actividad", liturgia: "Liturgia", equipo: "Equipo", otro: "Otro" };

// --- Firestore (lectura pública de la colección agenda) ---
const val = (v) => v == null ? undefined : "mapValue" in v ? Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, val(x)])) : "nullValue" in v ? null : "arrayValue" in v ? (v.arrayValue.values || []).map(val) : "stringValue" in v ? v.stringValue : "booleanValue" in v ? v.booleanValue
  : "integerValue" in v ? +v.integerValue : "doubleValue" in v ? v.doubleValue : "timestampValue" in v ? v.timestampValue : undefined;
async function agenda() {
  const rows = [];
  let page = "";
  do {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/agenda?pageSize=300&key=${KEY}${page ? "&pageToken=" + page : ""}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Firestore ${r.status}: ${await r.text()}`);
    const j = await r.json();
    for (const d of j.documents || []) {
      const f = Object.fromEntries(Object.entries(d.fields || {}).map(([k, v]) => [k, val(v)]));
      rows.push({ id: d.name.split("/").pop(), ...f, updated: d.updateTime });
    }
    page = j.nextPageToken || "";
  } while (page);
  return rows.filter((e) => /^\d{4}-\d{2}-\d{2}$/.test(e.date || "") && e.title);
}

// --- Camino Ágape (mismo criterio que la Agenda de la app) ---
function camino() {
  if (!existsSync("data/encuentros.json")) return [];
  const d = JSON.parse(readFileSync("data/encuentros.json", "utf8"));
  return d.encuentros.map((e) => {
    const m = String(e.fecha).match(/(\d+) de (\w+) de (\d{4})/);
    if (!m) return null;
    return { id: "camino-" + e.n, date: `${m[3]}-${String(MESES.indexOf(m[2]) + 1).padStart(2, "0")}-${m[1].padStart(2, "0")}`,
      title: `Camino ${ID.corto} · Encuentro ${e.n}: ${e.tema}`, type: "encuentro",
      desc: `${e.domingo}. Evangelio: ${e.evangelio.ref}. El encuentro se realiza durante esta semana; el equipo confirma día y hora.` };
  }).filter(Boolean);
}

// --- iCalendar ---
const esc = (s) => String(s || "").replace(/\\/g, "\\\\").replace(/[,;]/g, (m) => "\\" + m).replace(/\r?\n/g, "\\n");
function fold(line) {
  const out = []; let cur = "", bytes = 0;
  for (const ch of line) {
    const b = Buffer.byteLength(ch);
    if (bytes + b > (out.length ? 74 : 75)) { out.push(cur); cur = ""; bytes = 0; }
    cur += ch; bytes += b;
  }
  out.push(cur);
  return out.join("\r\n ");
}
const ymd = (s) => s.replace(/-/g, "");
const nextDay = (s) => { const [y, m, d] = s.split("-").map(Number); const x = new Date(Date.UTC(y, m - 1, d + 1)); return x.toISOString().slice(0, 10).replace(/-/g, ""); };
const hm = (t) => (/^\d{1,2}:\d{2}$/.test(t || "") ? t.padStart(5, "0").replace(":", "") + "00" : null);
const stamp = (iso) => (iso ? new Date(iso) : new Date()).toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");

function vevent(e, fam = false) {
  const s = hm(e.start), en = hm(e.end) || s;
  const desc = fam
    ? [e.desc, e.auth && e.auth.req ? "Requiere autorización de papás o apoderados: descárgala en la página para familias." : "", `${ID.nombre} · ${ID.urlCorta}familias/`].filter(Boolean).join("\n\n")
    : [e.desc, e.audience ? `Para: ${e.audience}` : "", `Agenda ${ID.corto} · ${ID.urlCorta}#/agenda`].filter(Boolean).join("\n\n");
  return ["BEGIN:VEVENT", `UID:${e.id}@${ID.dominio}`, `DTSTAMP:${stamp(e.updated)}`,
    s ? `DTSTART;TZID=${TZ}:${ymd(e.date)}T${s}` : `DTSTART;VALUE=DATE:${ymd(e.date)}`,
    s ? `DTEND;TZID=${TZ}:${ymd(e.date)}T${en > s ? en : s}` : `DTEND;VALUE=DATE:${nextDay(e.date)}`,
    rrule(e, !s),
    (e.exdates || []).length ? (s ? `EXDATE;TZID=${TZ}:${e.exdates.map((x) => ymd(x) + "T" + s).join(",")}` : `EXDATE;VALUE=DATE:${e.exdates.map(ymd).join(",")}`) : "",
    `SUMMARY:${esc(e.title)}`, e.place ? `LOCATION:${esc(e.place)}` : "", `DESCRIPTION:${esc(desc)}`,
    `CATEGORIES:${esc(TYPES[e.type] || "Otro")}`, s ? "" : "TRANSP:TRANSPARENT", "END:VEVENT"].filter(Boolean);
}

const VTZ = ["BEGIN:VTIMEZONE", `TZID:${TZ}`, "X-LIC-LOCATION:America/Santiago",
  "BEGIN:STANDARD", "TZOFFSETFROM:-0300", "TZOFFSETTO:-0400", "TZNAME:-04", "DTSTART:19700405T000000", "RRULE:FREQ=YEARLY;BYMONTH=4;BYDAY=1SU", "END:STANDARD",
  "BEGIN:DAYLIGHT", "TZOFFSETFROM:-0400", "TZOFFSETTO:-0300", "TZNAME:-03", "DTSTART:19700906T000000", "RRULE:FREQ=YEARLY;BYMONTH=9;BYDAY=1SU", "END:DAYLIGHT",
  "END:VTIMEZONE"];

const own = PROJECT ? await agenda() : []; // sin Firebase: solo los encuentros del Camino
const byDate = (a, b) => (a.date + (a.start || "")).localeCompare(b.date + (b.start || ""));
function write(out, list, name, desc, fam) {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", `PRODID:-//${ID.nombre}//Agenda//ES`, "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    `X-WR-CALNAME:${name}`, `X-WR-CALDESC:${desc}`, `X-WR-TIMEZONE:${TZ}`,
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H", "X-PUBLISHED-TTL:PT1H", ...VTZ, ...list.flatMap((e) => vevent(e, fam)), "END:VCALENDAR"];
  const ics = lines.map(fold).join("\r\n") + "\r\n";
  const prev = existsSync(out) ? readFileSync(out, "utf8") : "";
  // Sin cambios en los eventos: no reescribir (evita commits innecesarios por el DTSTAMP)
  const strip = (t) => t.replace(/^DTSTAMP:.*$/gm, "");
  if (strip(prev) !== strip(ics)) { writeFileSync(out, ics); console.log(`${out}: ${list.length} eventos`); }
  else console.log(`${out} sin cambios`);
}
write(OUT, [...own, ...camino()].sort(byDate), `Agenda ${ID.corto}`, `Agenda oficial ${ID.deNombre} · ${ID.parroquia}`, false);
// Calendario para familias: solo los eventos marcados «Visible para familias».
write(process.argv[3] || "familias.ics", own.filter((e) => e.familias === true).sort(byDate), `${ID.corto} · Familias`, `Actividades ${ID.deNombre} para las familias · ${ID.parroquia}`, true);
