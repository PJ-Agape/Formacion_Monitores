// Un libro que se hojea: una página a la vez, con volteo animado, deslizando con el dedo,
// tocando los bordes o con el teclado. Es el mismo libro del cancionero, para usarlo en otras
// partes (por ahora, el librito de los Salmos). Usa los estilos .cl-* del cancionero.

const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

// opts: { stage: id del contenedor, label: id del texto «3 de 40», key: localStorage para recordar la página,
//         prev/next: selector de los botones de avance, onShow(i) }
export function createBook(opts) {
  const B = { pages: [], at: 0, busy: false, justDragged: false };
  const $stage = () => document.getElementById(opts.stage);
  const leaf = (i, extra = "") => `<div class="cl-leaf ${extra}" data-i="${i}">${B.pages[i]?.html || ""}${extra.includes("cl-turn") ? `<div class="cl-back" aria-hidden="true"></div>` : `<div class="cl-shade" aria-hidden="true"></div>`}</div>`;

  function show(i) {
    const stage = $stage(); if (!stage) return;
    B.at = Math.max(0, Math.min(i, B.pages.length - 1));
    stage.innerHTML = leaf(B.at);
    const pg = opts.label && document.getElementById(opts.label);
    if (pg) pg.textContent = B.at === 0 ? "Portada" : `${B.at} de ${B.pages.length - 1}`;
    if (opts.buttons) document.querySelectorAll(opts.buttons).forEach((b) => { b.disabled = +b.dataset.d < 0 ? B.at === 0 : B.at >= B.pages.length - 1; });
    if (opts.key) { try { localStorage.setItem(opts.key, JSON.stringify(B.pages[B.at]?.k ?? B.at)); } catch {} }
    opts.onShow && opts.onShow(B.at);
  }
  function stageTurn(from, to) {
    const stage = $stage(), fwd = to > from;
    stage.innerHTML = leaf(fwd ? to : from) + leaf(fwd ? from : to, "cl-turn");
    const under = stage.querySelector(".cl-leaf:not(.cl-turn)"), turning = stage.querySelector(".cl-turn");
    return { fwd, turning, shade: under.querySelector(".cl-shade") };
  }
  const ANG = (fwd, p) => (fwd ? -180 * p : -180 * (1 - p));
  function setTurn(t, p) {
    t.turning.style.transform = `rotateY(${ANG(t.fwd, p)}deg)`;
    t.shade.style.opacity = String(0.55 * (1 - p));
    t.turning.style.setProperty("--lit", String(Math.sin(Math.PI * p)));
  }
  function finishTurn(t, from, to, p0, done) {
    const dur = reduceMotion() ? 0 : Math.max(120, 620 * (done ? 1 - p0 : p0));
    const end = done ? 1 : 0;
    if (!dur) { B.busy = false; show(done ? to : from); return; }
    const start = performance.now(), ease = (x) => 1 - Math.pow(1 - x, 3);
    const step = (now) => {
      const k = Math.min(1, (now - start) / dur);
      setTurn(t, p0 + (end - p0) * ease(k));
      if (k < 1) requestAnimationFrame(step); else { B.busy = false; show(done ? to : from); }
    };
    requestAnimationFrame(step);
  }
  function go(to) {
    to = Math.max(0, Math.min(to, B.pages.length - 1));
    const from = B.at;
    if (to === from || B.busy || !$stage()) return;
    if (reduceMotion()) { show(to); return; }
    B.busy = true;
    const t = stageTurn(from, to);
    setTurn(t, 0);
    finishTurn(t, from, to, 0, true);
  }
  const turn = (d) => go(B.at + d);

  // Deslizar con el dedo o el mouse
  let drag = null;
  document.addEventListener("pointerdown", (e) => {
    const stage = e.target.closest?.("#" + opts.stage);
    if (!stage || B.busy || e.button > 0) return;
    drag = { x: e.clientX, y: e.clientY, w: stage.clientWidth, left: stage.getBoundingClientRect().left, t: null, id: e.pointerId, stage, t0: performance.now(), onCtl: !!e.target.closest("a,button,input,select") };
  });
  document.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.t) {
      if (Math.abs(dx) < 12 || Math.abs(dx) < Math.abs(dy) * 1.2) { if (Math.abs(dy) > 12) drag = null; return; }
      const to = B.at + (dx < 0 ? 1 : -1);
      if (to < 0 || to >= B.pages.length || reduceMotion()) { drag = null; return; }
      drag.to = to; drag.from = B.at; B.busy = true;
      drag.t = stageTurn(drag.from, to);
      try { drag.stage.setPointerCapture(e.pointerId); } catch {}
    }
    const p = Math.max(0, Math.min(1, drag.t.fwd ? -dx / drag.w : dx / drag.w));
    drag.p = p; setTurn(drag.t, p);
  });
  const endDrag = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag; drag = null;
    if (d.t) {
      B.justDragged = true; setTimeout(() => { B.justDragged = false; }, 0);
      const fast = performance.now() - d.t0 < 260 && d.p > 0.08;
      finishTurn(d.t, d.from, d.to, d.p || 0, e.type !== "pointercancel" && (d.p > 0.3 || fast));
      return;
    }
    if (e.type === "pointerup" && !d.onCtl) {
      const fx = (e.clientX - d.left) / d.w;
      if (fx > 0.72) turn(1); else if (fx < 0.28) turn(-1);
    }
  };
  document.addEventListener("pointerup", endDrag);
  document.addEventListener("pointercancel", endDrag);
  document.addEventListener("click", (e) => { if (e.target.closest?.("#" + opts.stage) && B.justDragged) { e.preventDefault(); e.stopPropagation(); } }, true);
  document.addEventListener("keydown", (e) => {
    if (!$stage() || e.altKey || e.ctrlKey || e.metaKey || /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || "") || document.querySelector("dialog[open]")) return;
    if (["ArrowRight", "PageDown"].includes(e.key)) { e.preventDefault(); turn(1); }
    else if (["ArrowLeft", "PageUp"].includes(e.key)) { e.preventDefault(); turn(-1); }
  });

  // Página guardada (por su clave «k», si la tiene)
  function saved() { try { return JSON.parse(localStorage.getItem(opts.key) || "null"); } catch { return null; } }
  function setPages(pages, at) {
    B.pages = pages;
    if (at == null) { const k = saved(); const j = pages.findIndex((p) => p.k === k); at = j >= 0 ? j : 0; }
    show(at);
  }
  return { setPages, go, turn, show, get at() { return B.at; }, get busy() { return B.busy; }, get pages() { return B.pages; } };
}

// Reparte elementos ya dibujados según el alto disponible (primera página y siguientes).
// soft(el): elementos que no deben quedar solos al pie (títulos de estrofa, espacios).
export function splitByHeight(kids, availFirst, availNext, soft = () => false) {
  const out = []; let start = 0, avail = availFirst, i = 0;
  if (!kids.length) return [[0, 0]];
  let base = kids[0].offsetTop;
  while (i < kids.length) {
    const bottom = kids[i].offsetTop + kids[i].offsetHeight - base;
    if (bottom > avail && i > start) {
      let cut = i;
      while (cut - 1 > start && soft(kids[cut - 1])) cut--;
      out.push([start, cut]);
      start = i = cut; base = kids[cut].offsetTop; avail = availNext;
      continue;
    }
    i++;
  }
  out.push([start, kids.length]);
  return out;
}
