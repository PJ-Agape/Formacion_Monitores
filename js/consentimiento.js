// Consentimiento de la familia para crear la cuenta de un joven en la app (PDF rellenable).
// La familia lo firma y el equipo lo guarda en el fichero en papel; en la app solo queda
// registrado que se recibió, la fecha y qué autorizaron (honor, cumpleaños, fotos).

import { ID } from "./identidad.js";

const WIN = /[^\n\x20-\x7E\xA0-\xFF–—‘’“”•…€]/g;
const clean = (s) => String(s || "").replace(/[«»]/g, (m) => (m === "«" ? "“" : "”")).replace(WIN, "");

export async function pdfBytes({ nombre = "", etapa = "", correo = "" } = {}) {
  const { PDFDocument, StandardFonts, rgb } = await import("./vendor/pdf-lib.mjs");
  const doc = await PDFDocument.create();
  doc.setTitle(`Consentimiento · Cuenta en la app de ${ID.corto}`); doc.setAuthor(`${ID.nombre}`);
  const page = doc.addPage([612, 792]), form = doc.getForm();
  const F = await doc.embedFont(StandardFonts.Helvetica), B = await doc.embedFont(StandardFonts.HelveticaBold);
  const hex = (h) => rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255);
  const INK = hex("#0b2566"), INK2 = hex("#1351a4"), CORAL = hex("#ef591c"), SUN = hex("#ffba03"), CREAM = hex("#fff6e5"), SOFT = hex("#5a6b8c"), FIELD = hex("#eef6fd");
  const M = 46, W = 612 - M * 2;
  let y = 792 - 40;
  const text = (s, x, yy, { f = F, size = 9.5, color = INK } = {}) => page.drawText(clean(s), { x, y: yy, size, font: f, color });
  const wrap = (s, width, f = F, size = 9.5) => {
    const out = []; let line = "";
    for (const w of clean(s).split(/\s+/).filter(Boolean)) { const t = line ? line + " " + w : w; if (f.widthOfTextAtSize(t, size) > width && line) { out.push(line); line = w; } else line = t; }
    if (line) out.push(line); return out;
  };
  const para = (s, x, w, { f = F, size = 9.5, lh = 12, color = INK } = {}) => { for (const l of wrap(s, w, f, size)) { text(l, x, y, { f, size, color }); y -= lh; } };
  let n = 0;
  const field = (label, x, yy, w, value = "") => {
    text(label, x, yy + 21, { size: 7.5, color: SOFT, f: B });
    const tf = form.createTextField(`c${++n}`);
    tf.addToPage(page, { x, y: yy, width: w, height: 18, borderColor: INK2, borderWidth: 0.8, backgroundColor: FIELD, font: F });
    tf.setFontSize(10); if (value) tf.setText(clean(value));
  };
  const check = (label, yy, strong) => {
    const cb = form.createCheckBox(`k${++n}`);
    cb.addToPage(page, { x: M, y: yy - 2, width: 12, height: 12, borderColor: INK, borderWidth: 1, backgroundColor: hex("#ffffff") });
    let ly = yy; for (const l of wrap(label, W - 22, strong ? B : F, 9.5)) { text(l, M + 20, ly, { f: strong ? B : F }); ly -= 12; }
    return ly;
  };

  try { const png = await fetch(new URL("../icons/icon-192.png", import.meta.url)).then((r) => (r.ok ? r.arrayBuffer() : null)); if (png) page.drawImage(await doc.embedPng(png), { x: M, y: y - 34, width: 42, height: 42 }); } catch {}
  text(`${ID.NOMBRE}`, M + 52, y - 10, { f: B, size: 10 });
  text(`${ID.parroquia} · ${ID.diocesis}`, M + 52, y - 24, { size: 8.5, color: SOFT });
  const tag = "CONSENTIMIENTO", tw = B.widthOfTextAtSize(tag, 9) + 20;
  page.drawRectangle({ x: 612 - M - tw, y: y - 22, width: tw, height: 20, color: SUN, borderColor: INK, borderWidth: 1 });
  text(tag, 612 - M - tw + 10, y - 15.5, { f: B, size: 9 });
  y -= 62;
  text(`Cuenta en la app de ${ID.corto}`, M, y, { f: B, size: 20 }); y -= 18;
  text("Para papás, mamás y apoderados", M, y, { f: B, size: 12, color: CORAL }); y -= 20;

  // Qué es y qué datos guarda
  const items = [
    ["Qué es", "Una app de la pastoral para los jóvenes del grupo: el encuentro de su etapa cada semana, la agenda, la capilla y salas de conversación del grupo."],
    ["Qué datos guarda", "Nombre y apellido (se muestra con nombre e inicial), su etapa, el correo de Google con que entra, su asistencia a los encuentros y los sellos de su pasaporte. Si ustedes lo autorizan, su cumpleaños (solo día y mes)."],
    ["Qué NO guarda", "RUT, dirección, colegio, datos de salud ni teléfonos. Esos datos van solo en la ficha en papel que guarda el equipo coordinador, para emergencias."],
    ["Quién lo ve", "El equipo coordinador y los dirigentes del grupo. Lo que escribe en sus reflexiones personales solo lo lee él o ella. El muro y el chat son grupales y moderados: no hay mensajes privados."],
    ["Retiro y borrado", "Pueden pedir en cualquier momento que se borre su cuenta y sus datos, avisando a la coordinación."],
  ];
  const boxTop = y;
  const lines = items.map(([k, v]) => [k, wrap(v, W - 150, F, 9.2)]);
  const boxH = lines.reduce((s, [, l]) => s + l.length * 11.5 + 6, 0) + 18;
  page.drawRectangle({ x: M, y: boxTop - boxH, width: W, height: boxH, color: CREAM, borderColor: INK, borderWidth: 1.2 });
  let by = boxTop - 16;
  for (const [k, ls] of lines) { text(k, M + 12, by, { f: B, size: 9.2 }); ls.forEach((l, i) => text(l, M + 138, by - i * 11.5, { size: 9.2 })); by -= ls.length * 11.5 + 6; }
  y = boxTop - boxH - 44;

  const G = 12, wA = W * 0.62, wB = W - wA - G;
  field("Nombre del o la joven", M, y, wA, nombre); field("Etapa", M + wA + G, y, wB, etapa); y -= 34;
  field("Correo de Google del o la joven (para entrar a la app)", M, y, W, correo); y -= 34;
  field("Nombre del papá, mamá o apoderado/a", M, y, wA); field("RUT", M + wA + G, y, wB); y -= 34;
  field("Parentesco", M, y, (W - G) / 2); field("Teléfono", M + (W - G) / 2 + G, y, (W - G) / 2); y -= 26;

  text("MARQUE LO QUE AUTORIZA", M, y, { f: B, size: 8, color: CORAL }); y -= 16;
  y = check(`Autorizo que mi hijo/a o pupilo/a tenga una cuenta en la app de ${ID.corto}, en las condiciones descritas arriba. (Necesario para crear la cuenta)`, y, true) - 6;
  y = check("Puede aparecer con su nombre e inicial en el cuadro de honor del grupo (también visible en la página para familias).", y) - 6;
  y = check("Su cumpleaños (día y mes) puede mostrarse en la app a los demás miembros del grupo.", y) - 6;
  y = check("Puede aparecer en fotos de la pastoral, solo en sus canales oficiales.", y) - 36;

  const sw = W * 0.58;
  field("Firma", M, y, sw); field("Fecha", M + sw + G, y, W - sw - G); y -= 24;
  page.drawLine({ start: { x: M, y: 58 }, end: { x: M + W, y: 58 }, thickness: 0.6, color: SOFT });
  text("Este documento lo guarda el equipo coordinador junto a la ficha del joven. En la app solo se registra que fue recibido, la fecha y lo autorizado.", M, 44, { size: 8, color: SOFT });
  form.updateFieldAppearances(F);
  return doc.save();
}

export async function download(info = {}) {
  const bytes = await pdfBytes(info);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
  const slug = String(info.nombre || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  a.download = `consentimiento-app-${ID.prefijo}${slug ? "-" + slug : ""}.pdf`;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
}
