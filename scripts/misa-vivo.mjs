// Misa en vivo: busca en la lista pública (RSS) del canal de YouTube de Magnificat TV la Misa de
// cada día y la guarda en data/misa-vivo.json, para que el botón de la Capilla lleve a la de hoy.
// Lo ejecuta cada hora la misma acción del Evangelio. No usa claves ni cuentas.
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const OUT = process.argv[2] || "data/misa-vivo.json";
const HANDLE = process.env.CANAL_MISA || "@magnificat.tv-fm";
const UA = { "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36", "Accept-Language": "es-CL,es;q=0.9", Cookie: "CONSENT=YES+1; SOCS=CAI" };
// Si algo falla, se deja anotado en el archivo (sin borrar los días que ya había).
const falla = (msg) => { console.warn(msg); const o = { ...prev, handle: HANDLE, error: msg, revisado: new Date().toISOString().slice(0, 13) }; if (JSON.stringify(o.error) !== JSON.stringify(prev.error)) writeFileSync(OUT, JSON.stringify(o, null, 1) + "\n"); process.exit(0); };
const prev = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : {};
const tz = (d) => new Date(d.toLocaleString("en-US", { timeZone: "America/Santiago" }));
const isoOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const dec = (s) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

// El ID del canal se saca una vez de su página y se guarda.
let channelId = prev.handle === HANDLE ? prev.channelId : "";
if (!channelId) {
  const r = await fetch(`https://www.youtube.com/${HANDLE}`, { headers: UA }).catch((e) => ({ ok: false, status: e.message, text: async () => "" }));
  const html = await r.text();
  channelId = (html.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[\w-]{22})"/) || html.match(/"externalId":"(UC[\w-]{22})"/) || html.match(/"(?:channelId|browseId)":"(UC[\w-]{22})"/) || [])[1] || "";
  if (!channelId) falla(`No se encontró el canal ${HANDLE} (${r.status}, ${html.length} bytes, ${(html.match(/<title>([^<]*)/) || [])[1] || ""})`);
}
// Los videos: primero la lista RSS del canal; si YouTube no la entrega, la página de transmisiones.
let items = [], via = "rss";
const rss = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`, { headers: UA }).catch(() => ({ ok: false, status: "red" }));
if (rss.ok) {
  items = (await rss.text()).split("<entry>").slice(1).map((e) => ({ id: (e.match(/<yt:videoId>([^<]+)</) || [])[1], title: dec((e.match(/<title>([^<]+)</) || [])[1] || ""), pub: (e.match(/<published>([^<]+)</) || [])[1] }));
} else {
  via = `streams (rss ${rss.status})`;
  const h = await (await fetch(`https://www.youtube.com/${HANDLE}/streams`, { headers: UA })).text().catch(() => "");
  for (const m of h.matchAll(/"videoRenderer":\{"videoId":"([\w-]{11})".*?"title":\{"runs":\[\{"text":"((?:[^"\\]|\\.)*)"/g)) {
    if (!items.some((x) => x.id === m[1])) items.push({ id: m[1], title: JSON.parse(`"${m[2]}"`), pub: "" });
  }
  if (!items.length) falla(`Sin videos: ${via}, página ${h.length} bytes`);
}
const days = { ...(prev.days || {}) };
for (const { id, title, pub } of items) {
  console.log("·", pub, title);
  if (!id || !/\bmisa\b/i.test(title) || /rosario/i.test(title)) continue;
  // La fecha: la del título («23 de octubre de 2026») o, si no trae, la de publicación (hora de Chile).
  const s = title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace("setiembre", "septiembre");
  const m = s.match(/\b(\d{1,2})\s+de\s+([a-z]+)(?:\s+(?:de|del)\s+(\d{4}))?/);
  // Sin fecha de publicación (página de transmisiones), solo vale la fecha del título o el primero = hoy.
  if (!pub && !m && Object.values(days).some((x) => x.id === id)) continue;
  const p = tz(pub ? new Date(pub) : new Date());
  const iso = m && MESES.includes(m[2]) ? `${m[3] || p.getFullYear()}-${String(MESES.indexOf(m[2]) + 1).padStart(2, "0")}-${String(+m[1]).padStart(2, "0")}` : isoOf(p);
  if (!days[iso]) days[iso] = { id, title }; // el RSS viene del más nuevo al más antiguo
}
// Solo los últimos 10 días.
const desde = isoOf(new Date(tz(new Date()).getTime() - 10 * 864e5));
for (const k of Object.keys(days)) if (k < desde) delete days[k];
const out = { handle: HANDLE, channelId, via, vistos: items.slice(0, 8).map((x) => x.title), fuente: "Magnificat TV (YouTube)", days };
if (JSON.stringify(out) !== JSON.stringify(prev)) { writeFileSync(OUT, JSON.stringify(out, null, 1) + "\n"); console.log("misa-vivo.json:", Object.keys(days).join(", ")); }
else console.log("misa-vivo.json sin cambios");
