// Consentimiento de la familia para crear la cuenta de un joven en la app (PDF rellenable).
// La familia lo firma y el equipo lo guarda en la carpeta de consentimientos; en la app solo queda
// registrado que se recibió, la fecha y qué autorizaron (honor, cumpleaños, fotos, ficha privada).
// La página 2 es la ficha del joven (datos para emergencias), ya completa con lo que escribió al pedir
// su cuenta: la familia la revisa, corrige si hace falta y autoriza (o no) que el equipo la guarde.

const WIN = /[^\n\x20-\x7E\xA0-\xFF–—‘’“”•…€]/g;
const clean = (s) => String(s || "").replace(/[«»]/g, (m) => (m === "«" ? "“" : "”")).replace(WIN, "");

export async function pdfBytes({ nombre = "", etapa = "", correo = "", ficha = {} } = {}) {
  const { PDFDocument, StandardFonts, rgb } = await import("./vendor/pdf-lib.mjs");
  const doc = await PDFDocument.create();
  doc.setTitle("Consentimiento · Cuenta en la app de Ágape"); doc.setAuthor("Pastoral Juvenil Ágape");
  let page = doc.addPage([612, 792]);
  const form = doc.getForm();
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
  const field = (label, x, yy, w, value = "", h = 18) => {
    text(label, x, yy + h + 3, { size: 7.5, color: SOFT, f: B });
    const tf = form.createTextField(`c${++n}`);
    if (h > 18) tf.enableMultiline();
    tf.addToPage(page, { x, y: yy, width: w, height: h, borderColor: INK2, borderWidth: 0.8, backgroundColor: FIELD, font: F });
    tf.setFontSize(h > 18 ? 9 : 10); if (value) tf.setText(clean(value));
  };
  const check = (label, yy, strong) => {
    const cb = form.createCheckBox(`k${++n}`);
    cb.addToPage(page, { x: M, y: yy - 2, width: 12, height: 12, borderColor: INK, borderWidth: 1, backgroundColor: hex("#ffffff") });
    let ly = yy; for (const l of wrap(label, W - 22, strong ? B : F, 9.5)) { text(l, M + 20, ly, { f: strong ? B : F }); ly -= 12; }
    return ly;
  };

  try { const png = await fetch(new URL("../icons/icon-192.png", import.meta.url)).then((r) => (r.ok ? r.arrayBuffer() : null)); if (png) page.drawImage(await doc.embedPng(png), { x: M, y: y - 34, width: 42, height: 42 }); } catch {}
  text("PASTORAL JUVENIL ÁGAPE", M + 52, y - 10, { f: B, size: 10 });
  text("Parroquia San Miguel de Yungay · Diócesis San Bartolomé de Chillán", M + 52, y - 24, { size: 8.5, color: SOFT });
  const tag = "CONSENTIMIENTO", tw = B.widthOfTextAtSize(tag, 9) + 20;
  page.drawRectangle({ x: 612 - M - tw, y: y - 22, width: tw, height: 20, color: SUN, borderColor: INK, borderWidth: 1 });
  text(tag, 612 - M - tw + 10, y - 15.5, { f: B, size: 9 });
  y -= 62;
  text("Cuenta en la app de Ágape", M, y, { f: B, size: 20 }); y -= 18;
  text("Para papás, mamás y apoderados", M, y, { f: B, size: 12, color: CORAL }); y -= 20;

  // Qué es y qué datos guarda
  const items = [
    ["Qué es", "Una app de la pastoral para los jóvenes del grupo: el encuentro de su etapa cada semana, la agenda, la capilla y salas de conversación del grupo."],
    ["Qué datos guarda", "Nombre y apellido (se muestra con nombre e inicial), su etapa, el correo de Google con que entra, su asistencia a los encuentros y los sellos de su pasaporte. Si ustedes lo autorizan, su cumpleaños (solo día y mes)."],
    ["Ficha privada", "Si ustedes lo autorizan, los datos de la página 2 (RUT, fecha de nacimiento, dirección, contacto de emergencia, alergias y lo que quieran que sepamos), para cuidarlo en encuentros y salidas. Nunca se publican: solo los ven el equipo coordinador, sus dirigentes y el propio joven."],
    ["Quién lo ve", "El equipo coordinador y los dirigentes del grupo. Lo que escribe en sus reflexiones personales solo lo lee él o ella. El muro y el chat son grupales y moderados: no hay mensajes privados."],
    ["Retiro y borrado", "Pueden pedir en cualquier momento que se corrijan o borren su cuenta y sus datos, incluida la ficha privada, avisando a la coordinación."],
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
  y = check("Autorizo que mi hijo/a o pupilo/a tenga una cuenta en la app de Ágape, en las condiciones descritas arriba. (Necesario para crear la cuenta)", y, true) - 6;
  y = check("Puede aparecer con su nombre e inicial en el cuadro de honor del grupo (también visible en la página para familias).", y) - 6;
  y = check("Su cumpleaños (día y mes) puede mostrarse en la app a los demás miembros del grupo.", y) - 6;
  y = check("Puede aparecer en fotos de la pastoral, solo en sus canales oficiales.", y) - 6;
  y = check("El equipo puede guardar su ficha privada con los datos de la página 2, revisados por mí.", y) - 30;

  const sw = W * 0.58;
  field("Firma", M, y, sw); field("Fecha", M + sw + G, y, W - sw - G); y -= 24;
  page.drawLine({ start: { x: M, y: 58 }, end: { x: M + W, y: 58 }, thickness: 0.6, color: SOFT });
  wrap("El equipo coordinador guarda este documento firmado en la carpeta de consentimientos de la pastoral. En la app solo se registra que fue recibido, la fecha y lo autorizado.", W, F, 8).forEach((l, i) => text(l, M, 46 - i * 10, { size: 8, color: SOFT }));

  // Página 2 · Ficha del joven (datos para emergencias), ya completa con lo que escribió en su solicitud
  page = doc.addPage([612, 792]); y = 792 - 50;
  text("Ficha del joven", M, y, { f: B, size: 20 }); y -= 18;
  text("Datos para cuidarlo en encuentros y salidas · Privada, nunca se publica", M, y, { f: B, size: 11, color: CORAL }); y -= 22;
  para("Estos datos los escribió el o la joven al pedir su cuenta. Por favor, revísenlos: corrijan o completen lo que haga falta directamente aquí o a mano. Si no autorizan que el equipo los guarde en la app, dejen sin marcar la última casilla de la página 1 y la ficha quedará solo en papel.", M, W, { size: 9.2, lh: 11.5, color: SOFT });
  y -= 26;
  const f = ficha || {}, h2 = (W - G) / 2, nac = /^\d{4}-\d{2}-\d{2}$/.test(f.nacimiento || "") ? f.nacimiento.split("-").reverse().join("-") : (f.nacimiento || "");
  field("Nombre completo", M, y, wA, f.nombre || nombre); field("RUT", M + wA + G, y, wB, f.rut); y -= 36;
  field("Fecha de nacimiento (día-mes-año)", M, y, h2, nac); field("Correo", M + h2 + G, y, h2, f.email || correo); y -= 36;
  field("Dirección (calle, número y comuna)", M, y, W, f.direccion); y -= 36;
  field("En una emergencia, avisar a (nombre y parentesco)", M, y, wA, f.emergNombre); field("Teléfono de emergencia", M + wA + G, y, wB, f.emergTel); y -= 58;
  field("Alergias (a alimentos, medicamentos u otras)", M, y, W, f.alergias, 40); y -= 72;
  field("Algo más que la familia quiera que el equipo sepa (salud, medicamentos, cuidados…)", M, y, W, f.notas, 60); y -= 50;
  const sw2 = W * 0.58;
  field("Firma del papá, mamá o apoderado/a", M, y, sw2); field("Fecha", M + sw2 + G, y, W - sw2 - G);
  page.drawLine({ start: { x: M, y: 58 }, end: { x: M + W, y: 58 }, thickness: 0.6, color: SOFT });
  wrap("Estos datos solo los ven el equipo coordinador, los dirigentes del joven y el propio joven. Pueden pedir corregirlos o borrarlos cuando quieran.", W, F, 8).forEach((l, i) => text(l, M, 46 - i * 10, { size: 8, color: SOFT }));
  form.updateFieldAppearances(F);
  return doc.save();
}

export async function download(info = {}) {
  const bytes = await pdfBytes(info);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
  const slug = String(info.nombre || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  a.download = `consentimiento-app-agape${slug ? "-" + slug : ""}.pdf`;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
}
