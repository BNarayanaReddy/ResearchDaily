/* Shared helpers for the VoxCPM2 lesson (arXiv:2606.06928v1). The d1–d6 files hold the drawings,
   one entry per data-draw name, each redrawn on every step and control change.
   Numbers carry a // Table N or // §N comment; "V1" marks the VoxCPM paper (arXiv:2509.24650),
   "code" the OpenBMB/VoxCPM repo at cce58a5, and other names the papers found by us. */
(function () {
  window.RD = window.RD || {}; RD.drawings = RD.drawings || {};
  const V = (RD.vox = {});
  V.W = 640; V.H = 360;

  // A checklist board: rows [question, answer, tone]; row i appears on step i + 1.
  V.board = (c, rows, s, o = {}) => {
    c.clear();
    const n = rows.length, top = o.top ?? 6, rowH = o.rowH ?? Math.min(70, Math.floor((V.H - top - 4) / n)), split = o.split ?? 280;
    rows.forEach(([q, a, tone], i) => {
      if (s < i + 1 && !o.all) return;
      const y = top + i * rowH, now = s === i + 1;
      c.box({ x: 8, y, w: 624, h: rowH - 8, tone: "muted", hl: now, dim: o.all && s < i + 1 });
      c.text(22, y + (rowH - 8) / 2 + 5, q, { size: 14, weight: now ? 700 : 400, maxW: split - 26, lines: 2, valign: "middle", inBox: true });
      c.box({ x: split + 8, y: y + 7, w: 624 - split - 8, h: rowH - 22, label: a, size: 13, tone, hl: now });
    });
  };

  // Horizontal bars from table rows [label, value, hl, dim].
  V.tbars = (c, rows, o = {}) => c.bars({ x: o.x ?? 8, y: o.y ?? 30, w: o.w ?? 624, rowH: o.rowH ?? Math.min(48, Math.floor((o.h ?? 320) / rows.length)),
    labelW: o.labelW ?? 170, max: o.max, fmt: o.fmt || ((v) => String(v)), tones: [o.tone || "paper"],
    rows: rows.map(([label, v, hl, dim]) => ({ label, values: [v], hl, dim })) });

  V.title = (c, str, tone = "muted") => c.text(632, 18, str, { size: 13, anchor: "end", weight: 700, tone });

  // A row of boxes joined by arrows; items [label, sub, tone]; box i is lit on step lit[i].
  V.chain = (c, items, o = {}) => {
    const n = items.length, gap = o.gap ?? 26, x0 = o.x ?? 8, w = o.w ?? Math.floor((624 - gap * (n - 1)) / n), h = o.h ?? 64, y = o.y ?? 40;
    const out = [];
    items.forEach(([label, sub, tone, hl, dim], i) => {
      const b = c.box({ x: x0 + i * (w + gap), y, w, h, label, sub, tone, hl, dim, size: o.size || 14 });
      if (i) c.connect(out[i - 1], b, { tone: "muted", dim });
      out.push(b);
    });
    return out;
  };

  // Mono code lines with highlighted line indexes.
  V.code = (c, lines, hl = [], o = {}) => {
    const x = o.x ?? 16, y0 = o.y ?? 30, lh = o.lh ?? 24;
    c.box({ x: 8, y: y0 - 22, w: 624, h: lines.length * lh + 16, tone: "muted" });
    lines.forEach((l, i) => {
      if (hl.includes(i)) c.box({ x: 12, y: y0 + i * lh - 16, w: 616, h: lh - 2, tone: "predict", hl: true, r: 4 });
      c.text(x + 4, y0 + i * lh, l, { size: o.size || 13, mono: true, inBox: true, maxW: 600, lines: 1, tone: hl.includes(i) ? "ink" : "muted" });
    });
    return y0 + lines.length * lh;
  };

  // Seeded random numbers, so every reader sees the same picture.
  V.rng = (seed) => () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  V.gauss = (r) => Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(2 * Math.PI * r());
})();
