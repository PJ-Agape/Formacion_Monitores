// Guarda en data/evangelio.json el Evangelio de los próximos días (nombre litúrgico del día,
// cita y una frase breve) a partir de evangeliodeldia.org. Lo ejecuta una acción de GitHub cada día.
// La Capilla muestra la frase del día con su cita y un enlace al Evangelio completo.
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const OUT = process.argv[2] || "data/evangelio.json";
const DAYS = 10;
const API = "https://feed.evangelizo.org/v2/reader.php";
const get = async (params) => {
  const r = await fetch(`${API}?${new URLSearchParams({ lang: "SP", ...params })}`, { headers: { "User-Agent": "PastoralAgape/1.0" } });
  if (!r.ok) throw new Error(`${r.status} ${params.type}`);
  return (await r.text()).trim();
};
const clean = (html) => html.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&quot;/g, '"')
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/\s+/g, " ").trim();
const words = (s) => s.split(/\s+/).filter(Boolean).length;
const sentences = (t) => t.split(/(?<=[.!?¡¿»”])\s+(?=[A-ZÁÉÍÓÚÑ¡¿«“])/).map((s) => s.trim()).filter(Boolean);

// Frase breve: de preferencia palabras de Jesús, entre 7 y 28 palabras, que se entiendan solas.
const SAY = /(Jes[uú]s|[ÉE]l|el Señor|les)[^.«»"“”]{0,60}?\b(dijo|dice|respondi[oó]|contest[oó]|dec[ií]a|añadi[oó]|exclam[oó]|ense[ñn]aba|habl[oó])\b[^.«»"“”]{0,40}?[:,]\s*[«"“]/gi;
const GOOD = /\b(les aseguro|les digo|yo soy|felices|bienaventurad|el que|quien|ustedes son|amen|ama|no teman|vengan|s[ií]ganme|mi paz|el reino|padre)\b/i;
const BAD = /\b(matar|matarlo|demonio|satan|condena|ay de|hip[oó]crita|maldit|sodoma|infierno|lobos)\b/i;
function tidy(c) {
  c = c.replace(/^[^«"“]{0,60}?\b(dijo|respondi[oó]|contest[oó]|dec[ií]a|añadi[oó])\b[^:«"“]{0,30}:\s*/i, "");
  c = c.replace(/[«»"“”]/g, "").replace(/^[—–-]\s*/, "").replace(/\s*[:;,]$/, "").trim();
  return c && !/[.!?]$/.test(c) ? c + "." : c;
}
function phrase(text) {
  const t = text.replace(/Copyright.*$/i, "").replace(/Para recibir.*$/i, "").trim();
  const cands = [];
  // Discursos de Jesús: desde la comilla de apertura hasta el cierre (o el final si la fuente no la cierra).
  for (const m of t.matchAll(SAY)) {
    const start = m.index + m[0].length, rest = t.slice(start), end = rest.search(/[»”"]/);
    const speech = end >= 0 ? rest.slice(0, end) : rest;
    sentences(speech).forEach((x, i) => cands.push({ x, w: i === 0 ? 5.2 : 4 - Math.min(i, 3) * 0.3 }));
  }
  for (const m of t.matchAll(/[«“"]([^«»“”"]{20,500})[»”"]/g)) sentences(m[1]).forEach((x) => cands.push({ x, w: 1 }));
  sentences(t).forEach((x) => cands.push({ x, w: 0 }));
  let best = null;
  for (const c of cands) {
    const f = tidy(c.x), n = words(f);
    if (n < 7 || n > 28) continue;
    let score = c.w + (GOOD.test(f) ? 1.5 : 0) - (BAD.test(f) ? 6 : 0) - (/\?$/.test(f) ? 2 : 0) + (n >= 9 && n <= 22 ? 1 : 0) - (/:/.test(f) ? 2 : 0) - (/\bpar[aá]bola\b/i.test(f) ? 2 : 0);
    if (/^(En aquel tiempo|Jes[uú]s (dijo|respondi)|Despu[eé]s de esto)/i.test(f)) score -= 3;
    if (!best || score > best.score) best = { f, score };
  }
  return best ? best.f : "";
}

const prev = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : { days: {} };
const days = {};
const today = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Santiago" }));
for (let i = -1; i < DAYS; i++) {
  const d = new Date(today); d.setDate(d.getDate() + i);
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const date = iso.replace(/-/g, "");
  try {
    const [titulo, cita, texto] = await Promise.all([
      get({ date, type: "liturgic_t" }), get({ date, type: "reading_st", content: "GSP" }), get({ date, type: "reading", content: "GSP" }),
    ]);
    const frase = phrase(clean(texto));
    if (cita) days[iso] = { titulo: clean(titulo).replace(/(\d+)a (semana)/g, "$1.ª $2").replace(/(\d+)o (domingo)/gi, "$1.º $2"), cita: clean(cita).replace(/[.\s]+$/, ""), frase };
  } catch (e) {
    console.warn(iso, e.message);
    if (prev.days && prev.days[iso]) days[iso] = prev.days[iso];
  }
}
const out = { fuente: "evangeliodeldia.org · El Libro del Pueblo de Dios", days };
if (JSON.stringify(out.days) !== JSON.stringify(prev.days)) { writeFileSync(OUT, JSON.stringify(out, null, 1) + "\n"); console.log("evangelio.json:", Object.keys(days).length, "días"); }
else console.log("evangelio.json sin cambios");
