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

// Frase breve: de preferencia algo que dice Jesús (texto entre comillas), entre 6 y 26 palabras.
function phrase(text) {
  const t = text.replace(/Copyright.*$/i, "").replace(/Para recibir.*$/i, "").trim();
  const quoted = [...t.matchAll(/[«“"]([^«»“”"]{20,400})[»”"]/g)].map((m) => m[1].trim());
  const pick = (list) => {
    for (const q of list) for (const s of sentences(q)) {
      const c = s.replace(/^[—–-]\s*/, "").replace(/[:;,]$/, ".").trim();
      if (words(c) >= 6 && words(c) <= 26 && !/^(Y|Pero|Entonces)\s+(Jesús|él)\s+(les|le)\s+dijo/i.test(c)) return /[.!?]$/.test(c) ? c : c + ".";
    }
    return "";
  };
  return pick(quoted) || pick(sentences(t).slice(1)) || "";
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
    if (cita) days[iso] = { titulo: clean(titulo).replace(/(\d+)a (semana|domingo)/g, "$1.ª $2"), cita: clean(cita), frase };
  } catch (e) {
    console.warn(iso, e.message);
    if (prev.days && prev.days[iso]) days[iso] = prev.days[iso];
  }
}
const out = { fuente: "evangeliodeldia.org · El Libro del Pueblo de Dios", days };
if (JSON.stringify(out.days) !== JSON.stringify(prev.days)) { writeFileSync(OUT, JSON.stringify(out, null, 1) + "\n"); console.log("evangelio.json:", Object.keys(days).length, "días"); }
else console.log("evangelio.json sin cambios");
