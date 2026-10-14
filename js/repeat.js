// Eventos que se repiten (Agenda). Funciones puras: las usan la app, la Portada
// y el generador del calendario suscrito (scripts/agenda-ics.mjs).
// Un evento repetido guarda: date (primera fecha), repeat, until (opcional) y exdates (fechas saltadas).

export const REPEATS = {
  "": "No se repite",
  daily: "Cada día",
  weekdays: "De lunes a viernes",
  weekly: "Cada semana",
  biweekly: "Cada 2 semanas",
  monthly: "Cada mes",
  monthlyNth: "Cada mes, mismo día de la semana",
  yearly: "Cada año",
};
// «3er sábado», «último viernes»: qué semana del mes es una fecha (la 5ª se toma como «la última»).
const ORD = ["1er", "2º", "3er", "4º", "último"];
const DIA1 = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
export function nthOf(iso) {
  const [y, m, d] = String(iso || "").split("-").map(Number); if (!y) return null;
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay(), n = Math.ceil(d / 7);
  return { wd, n: n >= 5 ? -1 : n, label: `${ORD[(n >= 5 ? 5 : n) - 1]} ${DIA1[wd]}` };
}
// Fecha del n-ésimo día «wd» del mes (n = -1: el último).
function nthDay(y, m, wd, n) {
  if (n > 0) { const first = new Date(Date.UTC(y, m, 1)).getUTCDay(); return Date.UTC(y, m, 1 + ((wd - first + 7) % 7) + (n - 1) * 7); }
  const lastD = new Date(Date.UTC(y, m + 1, 0)), back = (lastD.getUTCDay() - wd + 7) % 7;
  return Date.UTC(y, m, lastD.getUTCDate() - back);
}
const DIAS = ["domingos", "lunes", "martes", "miércoles", "jueves", "viernes", "sábados"];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const DAY = 86400000;
const toUTC = (s) => { const [y, m, d] = s.split("-").map(Number); return Date.UTC(y, m - 1, d); };
const toIso = (t) => new Date(t).toISOString().slice(0, 10);

export const isRepeat = (e) => !!(e && e.repeat && REPEATS[e.repeat] && e.repeat !== "");

// Fechas (AAAA-MM-DD) del evento entre from y to, ambas incluidas.
export function occurrences(e, from, to, max = 800) {
  if (!e || !/^\d{4}-\d{2}-\d{2}$/.test(e.date || "")) return [];
  if (!isRepeat(e)) return e.date >= from && e.date <= to ? [e.date] : [];
  const start = toUTC(e.date), end = Math.min(toUTC(to), e.until ? toUTC(e.until) : Infinity), lo = toUTC(from);
  const skip = new Set(e.exdates || []);
  const out = [];
  const push = (t) => { const d = toIso(t); if (t >= lo && t <= end && !skip.has(d)) out.push(d); };
  if (end < start) return out;
  if (["daily", "weekdays", "weekly", "biweekly"].includes(e.repeat)) {
    const step = e.repeat === "weekly" ? 7 : e.repeat === "biweekly" ? 14 : 1;
    let k = Math.max(0, Math.floor((lo - start) / (step * DAY)));
    for (let t = start + k * step * DAY; t <= end && out.length < max; t += step * DAY) {
      if (e.repeat === "weekdays") { const wd = new Date(t).getUTCDay(); if (wd === 0 || wd === 6) continue; }
      push(t);
    }
  } else if (e.repeat === "monthlyNth") {
    const s = new Date(start), y0 = s.getUTCFullYear(), m0 = s.getUTCMonth(), { wd, n } = nthOf(e.date);
    const lo0 = new Date(lo), k0 = Math.max(0, (lo0.getUTCFullYear() - y0) * 12 + lo0.getUTCMonth() - m0 - 1);
    for (let k = k0; out.length < max; k++) {
      const t = nthDay(y0, m0 + k, wd, n);
      if (t > end) break;
      if (t >= start) push(t);
    }
  } else {
    const s = new Date(start), y0 = s.getUTCFullYear(), m0 = s.getUTCMonth(), d0 = s.getUTCDate();
    const stepM = e.repeat === "yearly" ? 12 : 1;
    const lo0 = new Date(lo), k0 = Math.max(0, Math.floor(((lo0.getUTCFullYear() - y0) * 12 + lo0.getUTCMonth() - m0) / stepM) - 1);
    for (let k = k0; out.length < max; k++) {
      const t = Date.UTC(y0, m0 + k * stepM, d0);
      if (t > end) break;
      if (new Date(t).getUTCDate() !== d0) continue; // p. ej. día 31 en un mes de 30: ese mes no hay
      push(t);
    }
  }
  return out;
}

// Próxima fecha desde «today» (incluida), o null si ya terminó.
export function nextOn(e, today) {
  if (!isRepeat(e)) return e.date >= today ? e.date : null;
  const far = toIso(toUTC(today) + 800 * DAY);
  return occurrences(e, today, far, 1)[0] || null;
}

// Texto para mostrar: «Cada semana, los martes», «Cada mes, el día 15»…
export function describe(e) {
  if (!isRepeat(e)) return "";
  const t = toUTC(e.date), d = new Date(t);
  const base = {
    daily: "Cada día",
    weekdays: "De lunes a viernes",
    weekly: `Cada semana, los ${DIAS[d.getUTCDay()]}`,
    biweekly: `Cada 2 semanas, los ${DIAS[d.getUTCDay()]}`,
    monthly: `Cada mes, el día ${d.getUTCDate()}`,
    monthlyNth: `Cada ${nthOf(e.date).label} del mes`,
    yearly: `Cada año, el ${d.getUTCDate()} de ${MESES[d.getUTCMonth()]}`,
  }[e.repeat];
  if (!e.until) return base;
  const u = new Date(toUTC(e.until));
  return `${base}, hasta el ${u.getUTCDate()} de ${MESES[u.getUTCMonth()]}${u.getUTCFullYear() !== d.getUTCFullYear() ? " de " + u.getUTCFullYear() : ""}`;
}

// Regla para iCalendar (RRULE). allDay: el evento no tiene hora.
export function rrule(e, allDay) {
  if (!isRepeat(e)) return "";
  const f = { daily: "FREQ=DAILY", weekdays: "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR", weekly: "FREQ=WEEKLY", biweekly: "FREQ=WEEKLY;INTERVAL=2", monthly: "FREQ=MONTHLY", yearly: "FREQ=YEARLY",
    monthlyNth: (() => { const x = nthOf(e.date); return `FREQ=MONTHLY;BYDAY=${x.n}${["SU", "MO", "TU", "WE", "TH", "FR", "SA"][x.wd]}`; })() }[e.repeat];
  // Con hora: fin del día «hasta» en Chile (UTC−3/−4) expresado en UTC, es decir, la madrugada del día siguiente.
  const until = e.until ? `;UNTIL=${allDay ? e.until.replace(/-/g, "") : toIso(toUTC(e.until) + DAY).replace(/-/g, "") + "T035959Z"}` : "";
  return `RRULE:${f}${until}`;
}
