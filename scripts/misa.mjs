// Guarda en data/misa.json la liturgia de los próximos días: nombre del día, santo y las
// lecturas completas (primera lectura, salmo, segunda lectura si hay y Evangelio), desde el
// servicio de evangeliodeldia.org (Evangelizo). Lo ejecuta la misma acción del Evangelio.
// Solo pide a la fuente los días que aún no tiene guardados, para no recargarla.
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const OUT = process.argv[2] || "data/misa.json";
const DAYS = +process.env.DIAS_MISA || 8;
const API = "https://feed.evangelizo.org/v2/reader.php";
const get = async (params) => {
  const r = await fetch(`${API}?${new URLSearchParams({ lang: "SP", ...params })}`, { headers: { "User-Agent": "PastoralAgape/1.0" } });
  if (!r.ok) throw new Error(`${r.status} ${params.type} ${params.content || ""}`);
  return (await r.text()).trim();
};
// Texto limpio conservando los saltos de línea (los versos del salmo, los párrafos).
const clean = (html) => String(html || "").replace(/\r/g, "").replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n\n").replace(/<[^>]+>/g, "")
  .replace(/&nbsp;/g, " ").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
  .replace(/[ \t]+/g, " ").replace(/ *\n */g, "\n").replace(/\n{3,}/g, "\n\n").trim();
const sinCopy = (t) => t.replace(/\n?\s*Copyright[\s\S]*$/i, "").replace(/\n?\s*Para recibir[\s\S]*$/i, "").trim();

const prev = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : { days: {} };
const days = {};
const today = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Santiago" }));
const PARTES = [["FR", "primera"], ["PS", "salmo"], ["SR", "segunda"], ["GSP", "evangelio"]];
for (let i = -1; i < DAYS; i++) {
  const d = new Date(today); d.setDate(d.getDate() + i);
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  if (prev.days && prev.days[iso] && prev.days[iso].evangelio) { days[iso] = prev.days[iso]; continue; }
  const date = iso.replace(/-/g, "");
  try {
    const dia = { titulo: clean(await get({ date, type: "liturgic_t" })).replace(/(\d+)a (semana)/g, "$1.ª $2").replace(/(\d+)o (domingo)/gi, "$1.º $2") };
    try { dia.santo = clean(await get({ date, type: "saint" })).replace(/\n+/g, " · ").slice(0, 300); } catch {}
    for (const [c, k] of PARTES) {
      let texto = "";
      try { texto = sinCopy(clean(await get({ date, type: "reading", content: c }))); } catch {}
      if (!texto) continue;
      const cita = clean(await get({ date, type: "reading_st", content: c }).catch(() => "")).replace(/[.\s]+$/, "");
      const titulo = clean(await get({ date, type: "reading_lt", content: c }).catch(() => ""));
      dia[k] = { cita, titulo, texto: texto.slice(0, 9000) };
    }
    if (dia.evangelio) days[iso] = dia;
  } catch (e) {
    console.warn(iso, e.message);
    if (prev.days && prev.days[iso]) days[iso] = prev.days[iso];
  }
}
const out = { fuente: "Textos litúrgicos: © Evangelizo.org (evangeliodeldia.org)", days };
if (JSON.stringify(out.days) !== JSON.stringify(prev.days)) { writeFileSync(OUT, JSON.stringify(out, null, 1) + "\n"); console.log("misa.json:", Object.keys(days).length, "días"); }
else console.log("misa.json sin cambios");
