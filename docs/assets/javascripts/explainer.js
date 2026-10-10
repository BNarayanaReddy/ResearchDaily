/* Research Daily explainer engine + drawing kit.            RD_ENGINE 2.0
 *
 * Turns the <article class="rd-page"> blocks of a paper page into a click-through
 * lesson that fits ONE screen: the question and its drawing on the left, the
 * steps on the right, Next at the bottom. Next reveals a step and redraws the
 * figure; after the last step it moves to the next page. The page itself never
 * scrolls (only the step panel may, internally).
 *
 * Paper drawings live in the paper folder (assets/drawings.js) and register:
 *
 *   window.RD = window.RD || {}; RD.drawings = RD.drawings || {};
 *   RD.drawings["my-figure"] = function (fig, k) {
 *     const c = k.canvas(640, 360);             // theme-aware SVG canvas (16:9 fits best)
 *     return function render(step) {            // called on every step and control change
 *       c.clear();
 *       const a = c.box({ x: 20, y: 40, w: 160, h: 60, label: "Encoder", tone: "take", hl: step === 2 });
 *       const b = c.box({ x: 260, y: 40, w: 160, h: 60, label: "Decoder", tone: "paper" });
 *       c.connect(a, b, { label: "1,500 × 512" });
 *     };
 *   };
 *
 * Layout safety built into the kit (so drawings stay clean without hand-tuning):
 *   - text is MEASURED (canvas metrics), never guessed from character counts;
 *   - box labels shrink, then wrap, to fit their box; failures are reported;
 *   - boxes and chips are opaque, so lines behind them never show through;
 *   - drawing order is layered: connectors < shapes < free labels (with a halo);
 *   - arrows are snapped to box edges, so arrowheads never sit inside a box;
 *   - c.label() places a label in the first free spot near its anchor.
 * check_site.py then lints every step in a real browser for anything left over.
 *
 * Without JavaScript the pages simply stack, with every step visible.
 */
(function () {
  "use strict";
  const ENGINE = "2.0";
  const RD = (window.RD = window.RD || {});
  RD.drawings = RD.drawings || {};
  RD.engine = ENGINE;
  const NS = "http://www.w3.org/2000/svg";
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } },
  };

  // ------------------------------------------------------------ helpers
  function h(tag, attrs, kids) {
    const svgTags = /^(svg|g|path|line|rect|circle|ellipse|text|tspan|polyline|polygon|defs|marker|title)$/;
    const n = svgTags.test(tag) ? document.createElementNS(NS, tag) : document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === undefined || v === null || v === false) continue;
      if (k === "text") n.textContent = v;
      else if (k === "html") n.innerHTML = v;
      else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? "" : v);
    }
    [].concat(kids || []).forEach((c) => c != null && n.appendChild(typeof c === "string" ? document.createTextNode(c) : c));
    return n;
  }
  const fmtNum = (v) => {
    const a = Math.abs(v);
    if (a >= 1e12) return +(v / 1e12).toPrecision(3) + "T";
    if (a >= 1e9) return +(v / 1e9).toPrecision(3) + "B";
    if (a >= 1e6) return +(v / 1e6).toPrecision(3) + "M";
    if (a >= 1e4) return +(v / 1e3).toPrecision(3) + "k";
    if (a < 1e-2 && v !== 0) return v.toExponential(0);
    return +v.toFixed(3) + "";
  };
  const small = () => window.matchMedia("(max-width: 44em)").matches;
  let uid = 0;

  // ------------------------------------------------------ text measuring
  // Real glyph widths from a 2-D canvas, using the fonts the SVG actually uses.
  const meas = { ctx: null, cache: new Map(), fam: null };
  function families(svg) {
    if (meas.fam) return meas.fam;
    const t1 = h("text", { x: -999, y: -999, text: "x" }), t2 = h("text", { x: -999, y: -999, class: "mono", text: "x" });
    svg.append(t1, t2);
    meas.fam = { text: getComputedStyle(t1).fontFamily || "sans-serif", mono: getComputedStyle(t2).fontFamily || "monospace" };
    t1.remove(); t2.remove();
    return meas.fam;
  }
  function measure(svg, str, size, o = {}) {
    const fam = families(svg)[o.mono ? "mono" : "text"];
    const key = `${o.weight || 400}|${size}|${fam}|${str}`;
    let w = meas.cache.get(key);
    if (w === undefined) {
      if (!meas.ctx) meas.ctx = document.createElement("canvas").getContext("2d");
      meas.ctx.font = `${o.weight || 400} ${size}px ${fam}`;
      w = meas.ctx.measureText(String(str)).width;
      meas.cache.set(key, w);
    }
    return w;
  }
  function wrapWords(svg, str, maxW, size, o) {
    const words = String(str).split(/\s+/).filter(Boolean), lines = [];
    let line = "";
    words.forEach((w) => {
      const t = line ? line + " " + w : w;
      if (line && measure(svg, t, size, o) > maxW) { lines.push(line); line = w; } else line = t;
    });
    if (line) lines.push(line);
    return lines.length ? lines : [""];
  }
  // Shrink, then wrap, then (last resort) ellipsize. Returns {lines, size, ok}.
  function fitText(svg, str, maxW, size, o = {}) {
    const maxLines = o.maxLines || 1, min = Math.min(size, o.min || 11);
    const fits = (ls, s) => ls.length <= maxLines && ls.every((l) => measure(svg, l, s, o) <= maxW + 0.5);
    for (let s = size; s >= Math.max(min, size * 0.86) - 1e-6; s -= 0.5) if (fits([String(str)], s)) return { lines: [String(str)], size: s, ok: true };
    if (maxLines > 1) for (let s = size; s >= min - 1e-6; s -= 0.5) { const ls = wrapWords(svg, str, maxW, s, o); if (fits(ls, s)) return { lines: ls, size: s, ok: true }; }
    for (let s = Math.max(min, size * 0.86); s >= min - 1e-6; s -= 0.5) if (fits([String(str)], s)) return { lines: [String(str)], size: s, ok: true };
    let ls = maxLines > 1 ? wrapWords(svg, str, maxW, min, o).slice(0, maxLines) : [String(str)];
    const last = ls.length - 1;
    while (ls[last].length > 1 && measure(svg, ls[last] + "…", min, o) > maxW) ls[last] = ls[last].slice(0, -1);
    ls[last] = ls[last].replace(/\s+$/, "") + "…";
    return { lines: ls, size: min, ok: false };
  }
  const overlaps = (a, b, pad = 0) => a.x < b.x + b.w + pad && b.x < a.x + a.w + pad && a.y < b.y + b.h + pad && b.y < a.y + a.h + pad;

  // ---------------------------------------------------------- the canvas
  // All colours come from CSS classes in extra.css, so drawings follow the
  // light/dark toggle without redrawing. Tones: ink, muted, paper (blue),
  // code (green), take (violet), predict (amber), bridge (teal), bad (red).
  function makeCanvas(fig, w, hgt, kit) {
    const id = "rdc" + ++uid;
    const svg = h("svg", { class: "rd-svg rdx-svg", viewBox: `0 0 ${w} ${hgt}`, role: "img", preserveAspectRatio: "xMidYMid meet",
      "aria-label": fig.getAttribute("aria-label") || "Drawing" });
    const defs = h("defs");
    const L = { back: h("g", { class: "rdx-L0" }), mid: h("g", { class: "rdx-L1" }), front: h("g", { class: "rdx-L2" }) };
    svg.append(defs, L.back, L.mid, L.front);
    fig.appendChild(svg);
    const fs = () => (kit.narrow ? 1.22 : 1);
    const dimCls = (o) => (o.dim ? " rdx-dim" : "") + (o.hl ? " rdx-hl" : "") + (o.cls ? " " + o.cls : "");
    const marker = (tone) => {
      const mid = `${id}-a-${tone}`;
      if (!defs.querySelector("#" + mid)) {
        defs.appendChild(h("marker", { id: mid, viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse" },
          [h("path", { d: "M0,0 L10,5 L0,10 z", class: `f-${tone}` })]));
      }
      return `url(#${mid})`;
    };
    const layerOf = (o, dflt) => L[o.layer] || L[dflt];
    let occ = [], arrows = [], labels = [], halos = [];
    const c = {
      svg, w, h: hgt, issues: [],
      clear() { Object.values(L).forEach((g) => { while (g.firstChild) g.removeChild(g.firstChild); }); occ = []; arrows = []; labels = []; halos = []; c.issues = []; return c; },
      add(node, g) { (g || L.mid).appendChild(node); return node; },
      group(o = {}) { return c.add(h("g", { class: dimCls(o).trim() || undefined, transform: o.transform }), o.g || layerOf(o, "mid")); },
      measure: (str, size = 14, o = {}) => measure(svg, str, size * fs(), o),
      fit: (str, maxW, size = 14, o = {}) => fitText(svg, str, maxW, size * fs(), { ...o, min: o.min || 11 }),
      // Free space check, for drawings that place things themselves.
      isFree: (r, pad = 2) => !occ.some((b) => overlaps(r, b, pad)),
      occupy(r) { occ.push(r); return r; },

      // text(x, y, str, {size, anchor, tone, mono, weight, maxW, lines, valign, halo, g, dim, hl})
      // With maxW the text shrinks and wraps (up to `lines`, default 3) to stay inside maxW.
      text(x, y, str, o = {}) {
        const size0 = (o.size || 14) * fs();
        const mo = { mono: o.mono, weight: o.weight || (o.bold ? 700 : 400) };
        let lines = [String(str)], size = size0, ok = true;
        if (o.maxW) ({ lines, size, ok } = fitText(svg, str, o.maxW, size0, { ...mo, maxLines: o.lines || 3, min: o.min || 11 }));
        const lh = size * (o.lh || 1.22);
        const top = o.valign === "middle" ? y - ((lines.length - 1) * lh) / 2 : y;
        const halo = o.halo ?? !o.inBox;
        const el = h("text", { x, y: top, "text-anchor": o.anchor || "start", "font-size": +size.toFixed(2), "font-weight": o.weight || (o.bold ? 700 : undefined),
          class: `${o.tone ? "t-" + o.tone : ""}${o.mono ? " mono" : ""}${halo ? " halo" : ""}${dimCls(o)}`.trim() || undefined });
        if (lines.length === 1) el.textContent = lines[0];
        else lines.forEach((l, i) => el.appendChild(h("tspan", { x, dy: i ? +lh.toFixed(2) : 0, text: l })));
        if (!ok) { el.setAttribute("data-rdx-clip", String(str)); c.issues.push(`text "${str}" was cut to fit ${Math.round(o.maxW)}px`); }
        const tw = Math.max(...lines.map((l) => measure(svg, l, size, mo)));
        const ax = o.anchor === "middle" ? x - tw / 2 : o.anchor === "end" ? x - tw : x;
        el._r = { x: ax, y: top - size * 0.8, w: tw, h: size * 0.98 + (lines.length - 1) * lh, kind: "text" };
        if (!o.inBox && !o.noOcc) occ.push(el._r);
        if (halo) halos.push(el);
        return c.add(el, o.g || layerOf(o, "front"));
      },
      // lines(x, y, str, maxW, o): a wrapped paragraph. Returns the y below it.
      lines(x, y, str, maxW, o = {}) {
        const el = c.text(x, y, str, { ...o, maxW, lines: o.lines || 6 });
        return el._r.y + el._r.h + 4;
      },

      // box({x, y, w, h, label, sub, tone, hl, dim, dashed, mono, size, solid, fill, r, g})
      // Opaque, so whatever is behind it stays behind it. The label shrinks and
      // wraps to fit; returns the group with .bx = {x, y, w, h, cx, cy, l, r, t, b}.
      box(o) {
        const tone = o.tone || "muted", r = o.r ?? 8;
        const g = c.group({ g: o.g, dim: o.dim, hl: o.hl, layer: o.layer });
        g.setAttribute("data-rdx-box", o.label != null ? String(o.label) : "");
        c.add(h("rect", { x: o.x, y: o.y, width: o.w, height: o.h, rx: r, class: "f-figbg rdx-under" }), g);
        c.add(h("rect", { x: o.x, y: o.y, width: o.w, height: o.h, rx: r,
          class: `f-${o.fill || tone} ${o.solid ? "" : o.hl ? "soft" : "softer"} s-${tone}`, "stroke-width": o.hl ? 2.4 : 1.2,
          "stroke-dasharray": o.dashed ? "5 4" : undefined }), g);
        const pad = Math.min(10, o.w * 0.08), avail = Math.max(10, o.w - 2 * pad);
        const lsz = (o.size || 15) * fs(), ssz = (o.subSize || 12) * fs();
        const subH = o.sub != null ? ssz * 1.25 : 0;
        const room = o.h - 8 - subH;
        const L1 = o.label != null ? fitText(svg, o.label, avail, lsz, { mono: o.mono, weight: 600, maxLines: room >= lsz * 2.3 ? 2 : 1, min: 11 }) : null;
        const S1 = o.sub != null ? fitText(svg, o.sub, avail, ssz, { mono: o.monoSub ?? true, maxLines: 1, min: 9.5 }) : null;
        const lh = L1 ? L1.size * 1.15 : 0;
        const blockH = (L1 ? L1.size * 0.75 + (L1.lines.length - 1) * lh : 0) + (S1 ? (L1 ? 6 : 0) + S1.size * 0.75 : 0);
        let y = o.y + (o.h - blockH) / 2;
        const cx = o.x + o.w / 2;
        if (L1) {
          y += L1.size * 0.75;
          const t = h("text", { x: cx, y, "text-anchor": "middle", "font-size": +L1.size.toFixed(2), "font-weight": 600, class: `${o.mono ? "mono" : ""}${o.labelTone ? " t-" + o.labelTone : ""}`.trim() || undefined });
          if (L1.lines.length === 1) t.textContent = L1.lines[0];
          else L1.lines.forEach((l, i) => t.appendChild(h("tspan", { x: cx, dy: i ? +lh.toFixed(2) : 0, text: l })));
          if (!L1.ok) { t.setAttribute("data-rdx-clip", String(o.label)); c.issues.push(`box label "${o.label}" does not fit a ${o.w}×${o.h} box`); }
          c.add(t, g); y += (L1.lines.length - 1) * lh;
        }
        if (S1) {
          y += (L1 ? 6 : 0) + S1.size * 0.75 + (L1 ? 2 : 0);
          const t = h("text", { x: cx, y, "text-anchor": "middle", "font-size": +S1.size.toFixed(2), class: `t-muted${(o.monoSub ?? true) ? " mono" : ""}`, text: S1.lines[0] });
          if (!S1.ok) { t.setAttribute("data-rdx-clip", String(o.sub)); c.issues.push(`box sub-label "${o.sub}" does not fit a ${o.w}px box`); }
          c.add(t, g);
        }
        g.bx = { x: o.x, y: o.y, w: o.w, h: o.h, cx, cy: o.y + o.h / 2, l: o.x, r: o.x + o.w, t: o.y, b: o.y + o.h };
        occ.push({ ...g.bx, kind: "box" });
        return g;
      },
      line(x1, y1, x2, y2, o = {}) {
        return c.add(h("line", { x1, y1, x2, y2, class: `s-${o.tone || "muted"}${dimCls(o)}`, "stroke-width": o.width || 1.5,
          "stroke-dasharray": o.dash ? "5 4" : undefined }), o.g || layerOf(o, "mid"));
      },
      // Arrows sit below boxes, and their ends are snapped to the edge of any box
      // they start or end inside (after the whole drawing is made).
      arrow(x1, y1, x2, y2, o = {}) {
        const tone = o.tone || "muted";
        const g = c.group({ g: o.g, dim: o.dim, hl: o.hl, layer: o.layer || "back" });
        const ln = c.add(h("line", { x1, y1, x2, y2, class: `s-${tone}`, "stroke-width": o.width || 1.6, "marker-end": marker(tone),
          "marker-start": o.both ? marker(tone) : undefined, "stroke-dasharray": o.dash ? "5 4" : undefined }), g);
        arrows.push({ ln, x1, y1, x2, y2, snap: o.snap !== false });
        if (o.label) c.label((x1 + x2) / 2 + (o.dx || 0), (y1 + y2) / 2 + (o.dy ?? -8), o.label, { anchor: "middle", size: o.size || 12, tone: o.labelTone || "muted", dim: o.dim, near: true });
        return g;
      },
      // connect(a, b, {tone, label, route: "straight"|"elbow", gap}) between two boxes (from c.box).
      connect(a, b, o = {}) {
        const A = a.bx || a, B = b.bx || b, gap = o.gap ?? 4;
        const dx = B.cx - A.cx, dy = B.cy - A.cy;
        const horiz = o.side ? o.side === "h" : Math.abs(dx) / (A.w + B.w) >= Math.abs(dy) / (A.h + B.h);
        let p;
        if (horiz) {
          const sx = dx >= 0 ? A.r + gap : A.l - gap, ex = dx >= 0 ? B.l - gap : B.r + gap;
          const yA = Math.max(A.t + 6, Math.min(A.b - 6, B.cy)), yB = Math.max(B.t + 6, Math.min(B.b - 6, A.cy));
          const yy = (o.route === "elbow") ? null : (yA + yB) / 2;
          p = yy != null && yy >= Math.max(A.t, B.t) && yy <= Math.min(A.b, B.b) ? [sx, yy, ex, yy] : [sx, A.cy, ex, B.cy];
        } else {
          const sy = dy >= 0 ? A.b + gap : A.t - gap, ey = dy >= 0 ? B.t - gap : B.b + gap;
          const xx = (Math.max(A.l, B.l) + Math.min(A.r, B.r)) / 2;
          p = o.route !== "elbow" && xx >= Math.max(A.l, B.l) + 4 && xx <= Math.min(A.r, B.r) - 4 ? [xx, sy, xx, ey] : [A.cx, sy, B.cx, ey];
        }
        if (o.route === "elbow" && (p[0] !== p[2] && p[1] !== p[3])) {
          const tone = o.tone || "muted";
          const d = horiz ? `M${p[0]},${p[1]} H${(p[0] + p[2]) / 2} V${p[3]} H${p[2]}` : `M${p[0]},${p[1]} V${(p[1] + p[3]) / 2} H${p[2]} V${p[3]}`;
          const g = c.group({ g: o.g, dim: o.dim, hl: o.hl, layer: "back" });
          c.add(h("path", { d, class: `f-none s-${tone}`, "stroke-width": o.width || 1.6, "marker-end": marker(tone), "stroke-dasharray": o.dash ? "5 4" : undefined }), g);
          if (o.label) c.label((p[0] + p[2]) / 2, (p[1] + p[3]) / 2 - 8, o.label, { anchor: "middle", size: o.size || 12, tone: "muted", dim: o.dim, near: true });
          return g;
        }
        return c.arrow(p[0], p[1], p[2], p[3], { ...o, snap: false });
      },
      path(d, o = {}) {
        return c.add(h("path", { d, class: `${o.fill ? "f-" + o.fill : "f-none"} s-${o.tone || "muted"}${o.soft ? " soft" : ""}${dimCls(o)}`,
          "stroke-width": o.width || 1.6, "stroke-dasharray": o.dash ? "5 4" : undefined, "marker-end": o.arrow ? marker(o.tone || "muted") : undefined }), o.g || layerOf(o, "mid"));
      },
      dot(x, y, o = {}) {
        const r = o.r || 4;
        if (!o.g && !o.noOcc) occ.push({ x: x - r, y: y - r, w: 2 * r, h: 2 * r, kind: "dot" });
        return c.add(h("circle", { cx: x, cy: y, r, class: `f-${o.tone || "paper"}${o.ring ? " s-bg" : ""}${dimCls(o)}`, "stroke-width": o.ring ? 2 : undefined }), o.g || layerOf(o, "mid"));
      },
      // label(x, y, str, o): like text, but placed in the first free spot near (x, y),
      // with a thin leader line when it had to move. Resolved after the drawing is made.
      label(x, y, str, o = {}) {
        const el = c.text(x, y, str, { ...o, noOcc: true });
        labels.push({ el, x, y, o });
        return el;
      },
      // Row of token chips that wraps at maxW. items: [{t, tone, dashed, dim, hl}]
      chips(o) {
        const size = (o.size || 13) * fs(), hh = o.h || 26 * fs(), gap = o.gap || 6, maxW = o.maxW || c.w - o.x - 10;
        let x = o.x, y = o.y; const out = [];
        o.items.forEach((it) => {
          const tw = measure(svg, it.t, size, { mono: true }) + 16;
          if (x + tw > o.x + maxW && x > o.x) { x = o.x; y += hh + gap; }
          const g = c.group({ g: o.g, dim: it.dim, hl: it.hl });
          c.add(h("rect", { x, y, width: tw, height: hh, rx: 5, class: "f-figbg rdx-under" }), g);
          c.add(h("rect", { x, y, width: tw, height: hh, rx: 5, class: `f-${it.tone || "muted"} ${it.hl ? "soft" : "softer"} s-${it.tone || "muted"}`,
            "stroke-dasharray": it.dashed ? "4 3" : undefined, "stroke-width": it.hl ? 2 : 1 }), g);
          c.add(h("text", { x: x + tw / 2, y: y + hh / 2 + size * 0.36, "text-anchor": "middle", "font-size": size, class: `mono ${it.tone ? "t-" + it.tone : ""}`.trim(), text: it.t }), g);
          const r = { x, y, w: tw, h: hh }; occ.push({ ...r, kind: "box" }); out.push(r); x += tw + gap;
        });
        out.bottom = y + hh; out.right = Math.max(...out.map((r) => r.x + r.w)); return out;
      },
      // Grid of numbers. data: 2-D array. tone(i, j, v) -> tone name or null.
      matrix(o) {
        const cw = o.cell || 44, ch = o.cellH || 30, fmt = o.fmt || ((v) => (typeof v === "number" ? v.toFixed(2) : v));
        const g = c.group({ g: o.g });
        (o.colLabels || []).forEach((t, j) => c.text(o.x + j * cw + cw / 2, o.y - 8, t, { anchor: "middle", size: 11, tone: "muted", mono: true, maxW: cw - 2, lines: 1, min: 9, inBox: true, g }));
        o.data.forEach((row, i) => {
          if (o.rowLabels) c.text(o.x - 8, o.y + i * ch + ch / 2 + 4, o.rowLabels[i], { anchor: "end", size: 12, mono: true, inBox: true, maxW: o.rowLabelW || o.x - 10, lines: 1, g });
          row.forEach((v, j) => {
            const tone = o.tone ? o.tone(i, j, v) : null;
            c.add(h("rect", { x: o.x + j * cw + 1, y: o.y + i * ch + 1, width: cw - 2, height: ch - 2, rx: 3, class: "f-figbg rdx-under" }), g);
            c.add(h("rect", { x: o.x + j * cw + 1, y: o.y + i * ch + 1, width: cw - 2, height: ch - 2, rx: 3,
              class: tone ? `f-${tone} soft s-${tone}` : "f-muted softer s-faint", "stroke-width": 1 }), g);
            c.text(o.x + j * cw + cw / 2, o.y + i * ch + ch / 2 + 4, v === null ? "" : fmt(v, i, j), { anchor: "middle", size: o.size || 11, mono: true, inBox: true, maxW: cw - 6, lines: 1, min: 8.5, g });
          });
        });
        occ.push({ x: o.x, y: o.y - (o.colLabels ? 20 : 0), w: o.data[0].length * cw, h: o.data.length * ch + (o.colLabels ? 20 : 0), kind: "box" });
        return g;
      },
      // Horizontal bars. rows: [{label, values: [...], dim, hl}]; tones: one per value series.
      bars(o) {
        const rowH = o.rowH || 30, lw = o.labelW || 140, W = o.w || c.w - o.x - 10;
        const fmt = o.fmt || fmtNum;
        const n = o.rows[0].values.length, barH = (rowH - 8) / n, max = o.max || Math.max(...o.rows.flatMap((r) => r.values.filter(Number.isFinite)));
        const valW = Math.max(...o.rows.flatMap((r) => r.values.filter(Number.isFinite).map((v) => measure(svg, fmt(v), 11 * fs(), { mono: true })))) + 8;
        const bw = Math.max(40, W - lw - valW);
        const g = c.group({ g: o.g });
        o.rows.forEach((r, i) => {
          const y = o.y + i * rowH;
          c.text(o.x + lw - 8, y + rowH / 2 + 4, r.label, { anchor: "end", size: 12, dim: r.dim, weight: r.hl ? 700 : undefined, maxW: lw - 12, lines: 1, min: 10, inBox: true, g });
          r.values.forEach((v, k) => {
            if (!Number.isFinite(v)) return;
            const tone = (o.tones || ["muted", "paper", "code"])[k];
            c.add(h("rect", { x: o.x + lw, y: y + 3 + k * barH, width: Math.max(1, (v / max) * bw), height: Math.max(2, barH - 2),
              class: `f-${tone}${r.dim ? " rdx-dim" : ""}${r.hl ? " rdx-hl" : ""}` }), g);
            c.text(o.x + lw + (v / max) * bw + 5, y + 3 + k * barH + barH / 2 + 3.5, fmt(v), { size: Math.min(11, barH * 0.9 + 3), tone, mono: true, dim: r.dim, inBox: true, g });
          });
        });
        occ.push({ x: o.x, y: o.y, w: W, h: o.rows.length * rowH, kind: "box" });
        return g;
      },
      // Line/scatter plot with optional log axes. series: [{x:[], y:[], tone, dots, dash, label}]
      // Returns {X, Y, g, area} so annotations can be placed in data coordinates.
      plot(o) {
        const X0 = o.x || 0, Y0 = o.y || 0, W = o.w || c.w - X0, H = o.h || c.h - Y0;
        const m = { l: o.ml ?? 58, r: o.mr ?? 16, t: o.mt ?? 14, b: o.mb ?? 44 };
        const xlog = !!o.xlog, ylog = !!o.ylog;
        const vals = (k, log) => o.series.flatMap((s) => s[k]).filter((v) => Number.isFinite(v) && (!log || v > 0));
        const tx = xlog ? Math.log10 : (v) => v, ty = ylog ? Math.log10 : (v) => v;
        const x0 = tx(o.xmin ?? Math.min(...vals("x", xlog))), x1 = tx(o.xmax ?? Math.max(...vals("x", xlog)));
        const y0 = ty(o.ymin ?? Math.min(...vals("y", ylog))), y1 = ty(o.ymax ?? Math.max(...vals("y", ylog)));
        const X = (v) => X0 + m.l + ((tx(v) - x0) / (x1 - x0 || 1)) * (W - m.l - m.r);
        const Y = (v) => Y0 + H - m.b - ((ty(v) - y0) / (y1 - y0 || 1)) * (H - m.t - m.b);
        const ticks = (a, b, log) => {
          if (log) { const t = []; for (let e = Math.ceil(a - 1e-9); e <= Math.floor(b + 1e-9); e++) t.push(10 ** e); return t; }
          const raw = (b - a) / 5, p = 10 ** Math.floor(Math.log10(raw || 1)), s = [1, 2, 5, 10].map((q) => q * p).find((q) => (b - a) / q <= 6) || p * 10;
          const t = []; for (let v = Math.ceil(a / s) * s; v <= b + 1e-9; v += s) t.push(+v.toFixed(10)); return t;
        };
        const g = c.group({ g: o.g });
        const tf = o.tickFmt || fmtNum;
        // x tick labels: drop every other one until they no longer collide
        let xt = ticks(x0, x1, xlog);
        const tw = (v) => measure(svg, (o.xFmt || tf)(v), 11 * fs()) + 10;
        while (xt.length > 2 && xt.some((v, i) => i && X(v) - X(xt[i - 1]) < (tw(v) + tw(xt[i - 1])) / 2)) xt = xt.filter((_, i) => i % 2 === 0);
        xt.forEach((v) => { c.line(X(v), Y0 + m.t, X(v), Y0 + H - m.b, { tone: "faint", width: 0.6, g }); c.text(X(v), Y0 + H - m.b + 16, (o.xFmt || tf)(v), { anchor: "middle", size: 11, tone: "muted", inBox: true, g }); });
        ticks(y0, y1, ylog).forEach((v) => { c.line(X0 + m.l, Y(v), X0 + W - m.r, Y(v), { tone: "faint", width: 0.6, g }); c.text(X0 + m.l - 6, Y(v) + 4, (o.yFmt || tf)(v), { anchor: "end", size: 11, tone: "muted", inBox: true, g }); });
        c.line(X0 + m.l, Y0 + H - m.b, X0 + W - m.r, Y0 + H - m.b, { tone: "muted", width: 1, g });
        if (o.xlabel) c.text(X0 + (m.l + W - m.r) / 2, Y0 + H - 8, o.xlabel, { anchor: "middle", size: 12, inBox: true, maxW: W - m.l - m.r, lines: 1, g });
        if (o.ylabel) c.add(h("text", { x: X0 + 14, y: Y0 + (m.t + H - m.b) / 2, "text-anchor": "middle", "font-size": 12 * fs(),
          transform: `rotate(-90 ${X0 + 14} ${Y0 + (m.t + H - m.b) / 2})`, text: o.ylabel }), g);
        o.series.forEach((s) => {
          const pts = s.x.map((xv, i) => [xv, s.y[i]]).filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b));
          if (!s.dotsOnly) c.add(h("polyline", { points: pts.map(([a, b]) => `${X(a).toFixed(2)},${Y(b).toFixed(2)}`).join(" "), class: `f-none s-${s.tone || "paper"}${s.dim ? " rdx-dim" : ""}${s.hl ? " rdx-hl" : ""}`,
            "stroke-width": s.width || 2.2, "stroke-dasharray": s.dash ? "6 4" : undefined }), g);
          if (s.dots || s.dotsOnly) pts.forEach(([a, b]) => c.dot(X(a), Y(b), { tone: s.tone || "paper", r: 3.6, dim: s.dim, g }));
          if (s.label && pts.length) {
            const at = s.labelAt != null ? pts[Math.max(0, Math.min(pts.length - 1, s.labelAt))] : pts[pts.length - 1];
            c.label(X(at[0]) - 4, Y(at[1]) - 9, s.label, { anchor: "end", size: 12, tone: s.tone || "paper", dim: s.dim, weight: 600 });
          }
        });
        const area = { x: X0 + m.l, y: Y0 + m.t, w: W - m.l - m.r, h: H - m.t - m.b };
        occ.push({ x: X0, y: Y0 + H - m.b, w: W, h: m.b, kind: "axis" }, { x: X0, y: Y0, w: m.l, h: H, kind: "axis" });
        return { X, Y, g, area };
      },

      // ---- called by the engine after every render ---------------------------
      _finish() {
        // 1. snap arrow ends that start or end inside a box to its edge
        const boxes = occ.filter((b) => b.kind === "box");
        const inside = (x, y, b) => x > b.x + 0.5 && x < b.x + b.w - 0.5 && y > b.y + 0.5 && y < b.y + b.h - 0.5;
        const exitT = (x1, y1, x2, y2, b) => { // largest t in [0,1] where segment is still inside b, scanning from start
          let lo = 0, hi = 1;
          for (let i = 0; i < 24; i++) { const mid = (lo + hi) / 2; if (inside(x1 + (x2 - x1) * mid, y1 + (y2 - y1) * mid, b)) lo = mid; else hi = mid; }
          return hi;
        };
        arrows.forEach((a) => {
          if (!a.snap) return;
          let { x1, y1, x2, y2 } = a;
          const len = Math.hypot(x2 - x1, y2 - y1) || 1, gap = 4 / len;
          const bs = boxes.find((b) => inside(x1, y1, b)), be = boxes.find((b) => inside(x2, y2, b));
          if (bs && bs !== be) { const t = Math.min(0.45, exitT(x1, y1, x2, y2, bs) + gap); x1 += (x2 - a.x1) * t; y1 += (y2 - a.y1) * t; }
          if (be && be !== bs) { const t = Math.min(0.45, exitT(x2, y2, a.x1, a.y1, be) + gap); x2 += (a.x1 - x2) * t; y2 += (a.y1 - y2) * t; }
          a.ln.setAttribute("x1", +x1.toFixed(2)); a.ln.setAttribute("y1", +y1.toFixed(2));
          a.ln.setAttribute("x2", +x2.toFixed(2)); a.ln.setAttribute("y2", +y2.toFixed(2));
        });
        // 2. a halo only helps on the open background: drop it on text that sits on a box or bar
        const solid = occ.filter((b) => b.kind === "box");
        halos.forEach((el) => {
          const r = el._r, a = r.w * r.h || 1;
          if (solid.some((b) => { const ix = Math.max(0, Math.min(r.x + r.w, b.x + b.w) - Math.max(r.x, b.x)), iy = Math.max(0, Math.min(r.y + r.h, b.y + b.h) - Math.max(r.y, b.y)); return ix * iy > 0.3 * a; }))
            el.classList.remove("halo");
        });
        // 3. place labels in free space
        labels.forEach(({ el, o }) => {
          const r = el._r, step = r.h + 3, side = r.w / 2 + 6;
          const cands = [[0, 0], [0, -step], [0, step], [-side, 0], [side, 0], [0, -2 * step], [0, 2 * step], [-side, -step], [side, -step], [-side, step], [side, step]];
          const inCanvas = (q) => q.x >= 2 && q.y >= 2 && q.x + q.w <= c.w - 2 && q.y + q.h <= c.h - 2;
          let best = null;
          for (const [dx, dy] of cands) {
            const q = { x: r.x + dx, y: r.y + dy, w: r.w, h: r.h };
            if (inCanvas(q) && !occ.some((b) => overlaps(q, b, 1))) { best = [dx, dy, q]; break; }
          }
          if (!best) best = [0, 0, r];
          const [dx, dy, q] = best;
          if (dx || dy) {
            const nx = +el.getAttribute("x") + dx, ny = +el.getAttribute("y") + dy;
            el.setAttribute("x", nx); el.setAttribute("y", ny);
            el.querySelectorAll("tspan").forEach((t) => t.setAttribute("x", nx));
            if (!o.near && Math.hypot(dx, dy) > 14) {
              const lx = Math.max(q.x, Math.min(q.x + q.w, r.x + r.w / 2 - dx * 0)), ly = dy < 0 ? q.y + q.h : dy > 0 ? q.y : q.y + q.h / 2;
              el.parentNode.insertBefore(h("line", { x1: r.x + r.w / 2, y1: r.y + r.h / 2, x2: lx, y2: ly, class: `s-${o.tone || "muted"}${o.dim ? " rdx-dim" : ""}`, "stroke-width": 0.8 }), el);
            }
          }
          occ.push({ ...q, kind: "text" });
        });
      },
    };
    return c;
  }

  // ----------------------------------------------------------- the kit
  function makeKit(page, fig, ctl) {
    const kit = {
      step: 1, steps: 1, narrow: false, canvases: [],
      canvas: (w, hgt) => { const c = makeCanvas(fig, w, hgt, kit); kit.canvases.push(c); return c; },
      on: (n) => kit.step >= n,
      is: (...ns) => ns.includes(kit.step),
      fmt: fmtNum,
      h,
      redraw: () => kit._render && kit._draw(kit.step, false),
      slider(o) {
        const input = h("input", { type: "range", min: o.min, max: o.max, step: o.step || 1, value: o.value, "aria-label": o.label });
        const out = h("output", { class: "rdx-read" });
        const show = () => (out.textContent = o.fmt ? o.fmt(+input.value) : input.value);
        input.addEventListener("input", () => { show(); o.onInput && o.onInput(+input.value); kit.redraw(); });
        ctl.appendChild(h("label", { class: "rdx-slider" }, [h("span", { text: o.label }), input, out]));
        ctl.hidden = false; show();
        return { get value() { return +input.value; }, set value(v) { input.value = v; show(); }, input };
      },
      toggle(o) {
        let value = o.value ?? o.options[0];
        const wrap = h("div", { class: "rdx-seg", role: "group", "aria-label": o.label || "Options" });
        if (o.label) ctl.appendChild(h("span", { class: "rdx-seglabel", text: o.label }));
        const btns = o.options.map((opt) => h("button", { type: "button", text: opt, "aria-pressed": String(opt === value),
          onclick: () => { value = opt; btns.forEach((b) => b.setAttribute("aria-pressed", String(b.textContent === opt))); o.onChange && o.onChange(opt); kit.redraw(); } }));
        btns.forEach((b) => wrap.appendChild(b));
        ctl.appendChild(wrap); ctl.hidden = false;
        const set = (v) => { value = v; btns.forEach((b) => b.setAttribute("aria-pressed", String(b.textContent === v))); };
        return { get value() { return value; }, set value(v) { set(v); } };
      },
      // Let the step sequence drive a control while the reader can still override it:
      //   const lang = k.toggle({...}); k.follow(lang, { 1: "English", 4: "Telugu" });
      follow(control, byStep) { (kit._follow = kit._follow || []).push([control, byStep]); },
      _applyFollow(step) {
        (kit._follow || []).forEach(([control, byStep]) => {
          const keys = Object.keys(byStep).map(Number).filter((n) => n <= step).sort((a, b) => b - a);
          if (keys.length) control.value = byStep[keys[0]];
        });
      },
      readout(text) { const s = h("span", { class: "rdx-read", text: text || "" }); ctl.appendChild(s); ctl.hidden = false; return s; },
      html(el) { fig.appendChild(el); return el; },
      // Render, then let each canvas tidy up (snap arrows, place labels) and,
      // on a step change, fade in what is new since the previous step.
      _draw(step, stepped) {
        const before = stepped ? kit.canvases.map((c) => sigs(c.svg)) : null;
        try { kit._render(step); } catch (e) { console.error(e); fig.dataset.rdxError = String(e.message || e); }
        kit.canvases.forEach((c, i) => {
          try { c._finish(); } catch (e) { console.error(e); }
          if (stepped && before) {
            const old = before[i];
            topLevel(c.svg).forEach((n) => { if (!old.has(sig(n))) n.classList.add("rdx-new"); });
            c.svg.classList.remove("rdx-stepped"); void c.svg.getBoundingClientRect(); c.svg.classList.add("rdx-stepped");
          }
        });
      },
    };
    return kit;
  }
  const topLevel = (svg) => Array.from(svg.querySelectorAll(".rdx-L0 > *, .rdx-L1 > *, .rdx-L2 > *"));
  const sig = (n) => n.outerHTML.replace(/ ?rdx-new/g, "").replace(/ ?rdx-hl/g, "").replace(/ ?rdx-dim/g, "");
  const sigs = (svg) => new Set(topLevel(svg).map(sig));

  // ------------------------------------------------------------- engine
  function init() {
    const content = document.querySelector(".md-content__inner") || document.querySelector("article.md-content__inner");
    if (!content || content.dataset.rdx) return;
    const pages = Array.from(content.querySelectorAll("article.rd-page"));
    if (!pages.length) return;
    content.dataset.rdx = "1";
    const cover = content.querySelector(".rd-cover");
    const paperId = (cover && cover.dataset.arxiv) || location.pathname;
    const key = (k) => `rd:x:${paperId}:${k}`;
    let seen = {}; try { seen = JSON.parse(store.get(key("seen")) || "{}"); } catch (e) { seen = {}; }

    // app shell: a fixed frame under the site header. Nothing outside it scrolls.
    const app = h("div", { class: "rdx", "data-mode": store.get(key("mode")) || "full" });
    const menuBtn = h("button", { type: "button", class: "rdx-menubtn", "aria-expanded": "false", "aria-controls": "rdx-drawer", html: "<span aria-hidden='true'>☰</span> Pages" });
    const where = h("span", { class: "rdx-where" });
    const counter = h("span", { class: "rdx-count" });
    const modeBtn = h("button", { type: "button", class: "rdx-modebtn" });
    const allBtn = h("button", { type: "button", class: "rdx-allbtn", text: "Read as one page" });
    const bar = h("div", { class: "rdx-bar" }, [menuBtn, where, h("span", { class: "rdx-spacer" }), modeBtn, allBtn, counter]);
    const progress = h("div", { class: "rdx-progress" }, [h("i")]);
    const q = h("input", { type: "search", class: "rdx-find", placeholder: "Find a page", "aria-label": "Find a page" });
    const navList = h("div", { class: "rdx-navlist" });
    const drawer = h("aside", { class: "rdx-drawer", id: "rdx-drawer", "aria-label": "Pages", hidden: true }, [
      h("div", { class: "rdx-drawer-head" }, [h("b", { text: (cover && cover.querySelector("h1") ? cover.querySelector("h1").textContent : document.title).trim() }), q]),
      navList,
      h("p", { class: "rdx-keys", html: "<kbd>←</kbd> <kbd>→</kbd> step · <kbd>↑</kbd> <kbd>↓</kbd> page · <kbd>p</kbd> pages" }),
    ]);
    const stage = h("div", { class: "rdx-stage" });
    pages[0].parentNode.insertBefore(app, pages[0]);
    app.append(bar, progress, stage, drawer);
    pages.forEach((p) => stage.appendChild(p));
    document.body.classList.add("rdx-on");

    // lay out every page
    const model = pages.map((p, i) => layout(p, i));
    function layout(p, i) {
      if (!p.id) p.id = "page-" + (i + 1);
      const isCover = p.classList.contains("rd-cover");
      const isQuiz = p.hasAttribute("data-quiz");
      const qh = p.querySelector("h2");
      if (isCover) return { el: p, cover: true, steps: 1, part: p.dataset.part || "Start", title: "Start" };
      const crumb = p.querySelector(".rd-crumb");
      const cap = p.querySelector(".rd-cap");
      const take = p.querySelector(".rd-take");
      const stat = p.querySelector(".rd-static");
      const ol = Array.from(p.children).find((n) => n.tagName === "OL");
      const quizList = isQuiz ? p.querySelector("ul.task-list, ul") : null;
      if (isQuiz) p.classList.add("is-quiz");

      const main = h("div", { class: "rdx-main" });
      const rail = h("aside", { class: "rdx-rail" });
      const figbox = h("div", { class: "rdx-figbox" });
      const ctl = h("div", { class: "rdx-ctl", hidden: true });
      const fig = h("div", { class: "rdx-fig", "aria-label": p.dataset.alt || (qh ? qh.textContent.replace("¶", "").trim() : "Drawing") });
      const head = h("div", { class: "rdx-head" });
      if (crumb) head.appendChild(crumb);
      if (qh) head.appendChild(qh);
      main.appendChild(head);
      if (p.dataset.draw || stat) {
        figbox.append(ctl, fig);
        if (p.dataset.draw) fig.addEventListener("click", (e) => {
          if (!small() || e.target.closest("button, input, a")) return;
          fig.classList.toggle("is-zoomed");
        });
        if (stat) { fig.appendChild(stat); fig.classList.add("is-static"); }
        if (cap) figbox.appendChild(cap);
        main.appendChild(figbox);
      } else if (cap) main.appendChild(cap);

      let steps = [];
      if (isQuiz && quizList) {
        const opts = Array.from(quizList.querySelectorAll(":scope > li"));
        const box = h("div", { class: "rdx-quiz" });
        opts.forEach((li) => {
          const correct = !!li.querySelector("input[checked], input:checked");
          li.querySelectorAll("input, label.task-list-control").forEach((n) => n.remove());
          const btn = h("button", { type: "button", class: "rdx-opt", html: li.innerHTML.trim() });
          btn.addEventListener("click", () => {
            box.querySelectorAll(".rdx-opt").forEach((b) => (b.disabled = true));
            btn.classList.add(correct ? "is-right" : "is-wrong");
            box.querySelectorAll(".rdx-opt").forEach((b, k) => { if (opts[k].dataset.correct === "1") b.classList.add("is-right"); });
            if (take) { take.hidden = false; take.classList.add("is-shown"); }
          });
          li.dataset.correct = correct ? "1" : "0";
          box.appendChild(btn);
        });
        quizList.remove();
        main.appendChild(box);
        if (take) { take.hidden = true; main.appendChild(take); }
        steps = [null];
      } else if (ol) {
        ol.classList.add("rdx-steps");
        steps = Array.from(ol.children);
        steps.forEach((li, k) => {
          li.dataset.n = k + 1;
          // order matters: text transforms first, then voice tags, then listeners
          stats(li);
          wrapRefs(li);
          const lead = li.textContent.trim();
          if (lead.startsWith("🧠")) li.classList.add("is-take");
          if (lead.startsWith("💻")) li.classList.add("is-code");
          stripLeadEmoji(li);
          const title = li.querySelector("strong");
          if (title) {
            if (title.parentElement !== li) li.insertBefore(title, li.querySelector(".rdx-voice") ? li.querySelector(".rdx-voice").nextSibling : li.firstChild);
            const body = h("div", { class: "rdx-sb" });
            Array.from(li.childNodes).forEach((n) => { if (n !== title && !(n.classList && n.classList.contains("rdx-voice"))) body.appendChild(n); });
            const t0 = document.createTreeWalker(body, NodeFilter.SHOW_TEXT).nextNode();
            if (t0) t0.textContent = t0.textContent.replace(/^[\s.:—–-]+/, "");
            // trim the trailing "." or ":" on the last text node only, so math and links inside survive
            const tw = document.createTreeWalker(title, NodeFilter.SHOW_TEXT); let lastT = null;
            while (tw.nextNode()) if (tw.currentNode.textContent.trim()) lastT = tw.currentNode;
            if (lastT && !lastT.parentElement.closest(".arithmatex, code")) lastT.textContent = lastT.textContent.replace(/[.:]\s*$/, "");
            li.appendChild(body);
            title.classList.add("rdx-st");
            title.setAttribute("role", "button");
            title.tabIndex = 0;
            title.addEventListener("click", () => go(i, k + 1));
            title.addEventListener("keydown", (e) => { if (e.key === "Enter") go(i, k + 1); });
          }
        });
        rail.appendChild(ol);
        if (take) rail.appendChild(take);
      } else {
        steps = [null];
        if (take) rail.appendChild(take);
      }
      const dots = h("div", { class: "rdx-dots", role: "group", "aria-label": "Steps" });
      steps.forEach((_, k) => { if (steps.length > 1) dots.appendChild(h("button", { type: "button", "aria-label": `Step ${k + 1}`, text: String(k + 1), onclick: () => go(i, k + 1) })); });
      const nav = h("div", { class: "rdx-nav" }, [
        h("span", { class: "rdx-pos" }),
        dots,
        h("button", { type: "button", class: "rdx-back", text: "Back", "aria-label": "Back", onclick: back }),
        h("button", { type: "button", class: "rdx-next", text: "Next", onclick: next }),
      ]);
      rail.appendChild(nav);
      if (cap) wrapRefs(cap);
      Array.from(p.childNodes).forEach((n) => { if (n !== main && n !== rail && (n.nodeType !== 1 || !n.matches("script"))) { if (n.nodeType === 1 && n.textContent.trim()) main.appendChild(n); else if (n.nodeType === 3) n.remove(); } });
      p.append(main, rail);
      p.querySelectorAll(":scope > p:empty").forEach((n) => n.remove());
      return { el: p, steps: Math.max(1, steps.length), stepEls: steps, quiz: isQuiz, part: p.dataset.part || "", fast: p.hasAttribute("data-fast"),
        title: qh ? qh.textContent.replace("¶", "").trim() : p.id, fig, ctl, draw: p.dataset.draw, take, rail, ol: ol || null, kit: null, render: null };
    }
    function stripLeadEmoji(li) {
      const walker = document.createTreeWalker(li, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const t = walker.currentNode;
        if (!t.textContent.trim()) continue;
        const m = t.textContent.match(/^\s*(🧠|💻|📄)\s*/u);
        if (m) {
          t.textContent = t.textContent.slice(m[0].length);
          const tag = { "🧠": "Our take", "💻": "The code", "📄": "The paper" }[m[1]];
          li.insertBefore(h("span", { class: "rdx-voice", text: tag }), li.firstChild);
        }
        break;
      }
    }
    function wrapRefs(root) {
      const re = /\((?:§|Eq\.|Table|Fig\.|App\.|Alg\.|Algorithm)[^()]{0,40}\)/g;
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach((t) => {
        if (!re.test(t.textContent) || t.parentElement.closest("code, .arithmatex")) return;
        re.lastIndex = 0;
        const frag = document.createDocumentFragment(); let last = 0, m;
        while ((m = re.exec(t.textContent))) {
          frag.appendChild(document.createTextNode(t.textContent.slice(last, m.index)));
          frag.appendChild(h("span", { class: "rdx-ref", text: m[0] }));
          last = m.index + m[0].length;
        }
        frag.appendChild(document.createTextNode(t.textContent.slice(last)));
        t.parentNode.replaceChild(frag, t);
      });
    }
    function stats(li) {
      // [[1,500 | encoder positions]] -> a big-number block. Walks text nodes
      // (no innerHTML) so typeset math and listeners survive.
      const re = /\[\[([^|\]]+)\|([^\]]+)\]\]/g;
      const walker = document.createTreeWalker(li, NodeFilter.SHOW_TEXT);
      const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach((t) => {
        if (!t.textContent.includes("[[")) return;
        const frag = document.createDocumentFragment(); let last = 0, m; re.lastIndex = 0;
        while ((m = re.exec(t.textContent))) {
          frag.appendChild(document.createTextNode(t.textContent.slice(last, m.index)));
          frag.appendChild(h("span", { class: "rdx-stat" }, [h("b", { text: m[1].trim() }), h("span", { text: m[2].trim() })]));
          last = m.index + m[0].length;
        }
        frag.appendChild(document.createTextNode(t.textContent.slice(last)));
        t.parentNode.replaceChild(frag, t);
      });
    }

    // page drawer: chapters, seen marks, quick-tour marks, find
    const links = [];
    let lastPart = null, n = 0;
    model.forEach((m, i) => {
      if (m.part !== lastPart) { navList.appendChild(h("div", { class: "rdx-part", text: m.part || " " })); lastPart = m.part; n = 0; }
      const a = h("a", { href: `#${m.el.id}`, class: "rdx-link", "data-i": i, html: `<em>${m.cover ? "·" : ++n}</em><span></span>${m.fast ? "<i title='On the quick tour'>⚡</i>" : ""}` });
      a.querySelector("span").textContent = m.cover ? "Start" : m.title;
      a.addEventListener("click", (e) => { e.preventDefault(); closeDrawer(); go(i, 1); });
      navList.appendChild(a); links[i] = a;
    });
    const openDrawer = () => { drawer.hidden = false; app.classList.add("drawer-open"); menuBtn.setAttribute("aria-expanded", "true"); links[cur] && links[cur].scrollIntoView({ block: "nearest" }); };
    const closeDrawer = () => { drawer.hidden = true; app.classList.remove("drawer-open"); menuBtn.setAttribute("aria-expanded", "false"); };
    menuBtn.addEventListener("click", () => (drawer.hidden ? openDrawer() : closeDrawer()));
    app.addEventListener("click", (e) => { if (!drawer.hidden && !e.target.closest(".rdx-drawer, .rdx-menubtn")) closeDrawer(); });
    q.addEventListener("input", () => {
      const v = q.value.trim().toLowerCase();
      links.forEach((a, i) => { a.hidden = !!v && !(model[i].title + " " + model[i].el.textContent).toLowerCase().includes(v); });
    });
    q.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { const a = links.find((x) => !x.hidden && +x.dataset.i > 0); if (a) a.click(); }
      if (e.key === "Escape") { q.value = ""; q.dispatchEvent(new Event("input")); closeDrawer(); }
    });

    // state
    let cur = 0, step = 1;
    const visible = () => model.map((m, i) => i).filter((i) => app.dataset.mode !== "quick" || model[i].cover || model[i].fast);

    function ensureDrawing(m) {
      if (m.kit || !m.draw) return;
      const factory = RD.drawings[m.draw];
      m.kit = makeKit(m.el, m.fig, m.ctl);
      m.kit.steps = m.steps;
      m.kit.narrow = small();
      if (!factory) { m.fig.appendChild(h("p", { class: "rdx-missing", text: `Drawing "${m.draw}" is missing.` })); console.error(`RD: drawing "${m.draw}" is not registered`); return; }
      try { m.render = factory(m.fig, m.kit) || (() => {}); m.kit._render = m.render; }
      catch (e) { m.fig.appendChild(h("p", { class: "rdx-missing", text: "This drawing failed: " + e.message })); console.error(e); }
    }

    function show(stepped) {
      const m = model[cur];
      model.forEach((x, i) => x.el.classList.toggle("is-on", i === cur));
      if (m.stepEls) m.stepEls.forEach((li, k) => { if (!li) return; li.classList.toggle("is-done", k + 1 < step); li.classList.toggle("is-cur", k + 1 === step); li.classList.toggle("is-todo", k + 1 > step); });
      if (m.take && !m.quiz) m.take.classList.toggle("is-shown", step >= m.steps);
      m.el.querySelectorAll(".rdx-dots button").forEach((b, k) => { b.classList.toggle("is-cur", k + 1 === step); b.classList.toggle("is-done", k + 1 < step); });
      ensureDrawing(m);
      if (m.render) {
        const changed = m.kit.step !== step || !m._shown;
        m.kit.step = step; m._shown = true;
        if (changed) m.kit._applyFollow(step);
        m.kit._draw(step, changed && stepped !== false);
      }
      const vis = visible(), pos = vis.indexOf(cur);
      const isLastPage = pos === vis.length - 1;
      m.el.querySelectorAll(".rdx-pos").forEach((x) => (x.textContent = m.cover || m.steps < 2 ? "" : `Step ${step} of ${m.steps}`));
      m.el.querySelectorAll(".rdx-back").forEach((b) => (b.disabled = pos <= 0 && step <= 1));
      m.el.querySelectorAll(".rdx-next").forEach((b) => { b.textContent = step < m.steps ? "Next" : isLastPage ? "Finish" : "Next page"; b.classList.toggle("is-page", step >= m.steps); });
      counter.textContent = m.cover ? "" : `${pos} / ${vis.length - 1}`;
      where.textContent = m.cover ? "" : m.part;
      progress.firstChild.style.width = `${((pos + step / m.steps) / vis.length) * 100}%`;
      modeBtn.textContent = app.dataset.mode === "quick" ? (small() ? "⚡ Quick" : "⚡ Quick tour") : (small() ? "Full" : "Full lesson");
      modeBtn.title = app.dataset.mode === "quick" ? "Showing the quick tour. Click for the full lesson." : "Showing the full lesson. Click for the quick tour.";
      links.forEach((a, i) => { a.classList.toggle("is-cur", i === cur); a.classList.toggle("is-seen", !!seen[model[i].el.id]); a.classList.toggle("is-off", !vis.includes(i)); });
      // keep the current step in view inside the panel (the page itself never scrolls)
      if (m.ol && m.stepEls[step - 1]) {
        const li = m.stepEls[step - 1], ol = m.ol;
        const top = li.offsetTop - ol.offsetTop;
        if (top < ol.scrollTop || top + li.offsetHeight > ol.scrollTop + ol.clientHeight) ol.scrollTop = Math.max(0, top - 8);
      }
      const hash = `#${m.el.id}${step > 1 ? "/" + step : ""}`;
      if (location.hash !== hash) history.replaceState(null, "", hash);
      if (!m.cover) { store.set(key("pos"), `${m.el.id}/${step}`); if (step >= m.steps && !seen[m.el.id]) { seen[m.el.id] = 1; store.set(key("seen"), JSON.stringify(seen)); } }
      if (isLastPage && step >= m.steps) store.set(`rd:done:${paperId}`, "1");
      document.dispatchEvent(new CustomEvent("rd:page", { detail: { page: cur, step, id: m.el.id, steps: m.steps } }));
    }
    function go(p, s) {
      if (p < 0 || p >= model.length) return;
      const samePage = p === cur;
      cur = p; step = Math.max(1, Math.min(s || 1, model[p].steps));
      if (!samePage) model[p].el.scrollTop = 0;
      show(samePage);
      if (app.dataset.layout === "all") model[p].el.scrollIntoView({ block: "start" });
    }
    function next() {
      const vis = visible(), pos = vis.indexOf(cur);
      if (step < model[cur].steps) return go(cur, step + 1);
      if (pos < vis.length - 1) go(vis[pos + 1], 1);
      else show();
    }
    function back() {
      const vis = visible(), pos = vis.indexOf(cur);
      if (step > 1) return go(cur, step - 1);
      if (pos > 0) { const p = vis[pos - 1]; go(p, model[p].steps); }
    }
    function page(d) { const vis = visible(), pos = vis.indexOf(cur); const t = vis[Math.max(0, Math.min(vis.length - 1, pos + d))]; if (t !== cur) go(t, 1); }
    modeBtn.addEventListener("click", () => { app.dataset.mode = app.dataset.mode === "quick" ? "full" : "quick"; store.set(key("mode"), app.dataset.mode); if (!visible().includes(cur)) cur = 0; show(); });
    allBtn.addEventListener("click", () => {
      const all = app.dataset.layout !== "all";
      app.dataset.layout = all ? "all" : "";
      document.body.classList.toggle("rdx-all", all);
      allBtn.textContent = all ? "One screen at a time" : "Read as one page";
      if (all) model.forEach((m) => { ensureDrawing(m); if (m.render) { m.kit.step = m.steps; m.kit._draw(m.steps, false); } if (m.take) m.take.classList.add("is-shown"); });
      else { window.scrollTo(0, 0); show(); }
    });
    document.addEventListener("keydown", (e) => {
      if (app.dataset.layout === "all" || e.target.closest("input, textarea, select, [contenteditable]") || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); next(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); back(); }
      else if (e.key === "ArrowDown" || e.key === "PageDown") { e.preventDefault(); page(1); }
      else if (e.key === "ArrowUp" || e.key === "PageUp") { e.preventDefault(); page(-1); }
      else if (e.key === "p") { e.preventDefault(); drawer.hidden ? (openDrawer(), q.focus()) : closeDrawer(); }
      else if (e.key === "Escape") closeDrawer();
    });
    // swipe on phones: left = next, right = back (ignored on controls and when zoomed)
    let tx0 = null, ty0 = null;
    stage.addEventListener("touchstart", (e) => { if (e.target.closest("input, button, .is-zoomed, .rdx-steps, .rd-static")) { tx0 = null; return; } tx0 = e.touches[0].clientX; ty0 = e.touches[0].clientY; }, { passive: true });
    stage.addEventListener("touchend", (e) => {
      if (tx0 == null || app.dataset.layout === "all") return;
      const dx = e.changedTouches[0].clientX - tx0, dy = e.changedTouches[0].clientY - ty0; tx0 = null;
      if (Math.abs(dx) > 60 && Math.abs(dx) > 2 * Math.abs(dy)) (dx < 0 ? next : back)();
    }, { passive: true });
    // redraw when the screen class changes (phone <-> desktop) or fonts arrive
    let wasSmall = small(), rt = 0;
    window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => {
      const s = small(); if (s === wasSmall) return; wasSmall = s;
      model.forEach((m) => { if (m.kit) m.kit.narrow = s; }); const m = model[cur]; if (m.kit && m.render) m.kit._draw(step, false);
    }, 150); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { meas.cache.clear(); meas.fam = null; const m = model[cur]; if (m.kit && m.render) m.kit._draw(step, false); });

    // cover buttons
    if (cover) {
      cover.querySelectorAll("[data-rdx-start]").forEach((b) => b.addEventListener("click", () => {
        app.dataset.mode = b.dataset.rdxStart; store.set(key("mode"), app.dataset.mode);
        const v = visible(); go(v[1] ?? 0, 1);
      }));
      const saved = store.get(key("pos"));
      const cont = cover.querySelector("[data-rdx-continue]");
      if (cont && saved) {
        const [pid, s] = saved.split("/"); const idx = model.findIndex((m) => m.el.id === pid);
        if (idx > 0) { cont.hidden = false; cont.textContent = `Continue: page ${idx}, "${model[idx].title}"`; cont.addEventListener("click", () => go(idx, +s || 1)); }
      }
    }

    // public API (used by check_site.py and for debugging)
    RD.x = { engine: ENGINE, pages: model.map((m) => ({ id: m.el.id, steps: m.steps, draw: m.draw || null, quiz: !!m.quiz, cover: !!m.cover, fast: m.fast, part: m.part, title: m.title })),
      go, next, back, current: () => ({ page: cur, step }),
      issues: () => { const m = model[cur]; return m.kit ? m.kit.canvases.flatMap((c) => c.issues) : []; } };

    window.addEventListener("hashchange", () => {
      const hm = location.hash.match(/^#([^/]+)(?:\/(\d+))?$/);
      if (!hm) return;
      const at = model.findIndex((x) => x.el.id === decodeURIComponent(hm[1]));
      if (at >= 0 && (at !== cur || (+hm[2] || 1) !== step)) go(at, +hm[2] || 1);
    });

    const m0 = location.hash.match(/^#([^/]+)(?:\/(\d+))?$/);
    const idx = m0 ? model.findIndex((x) => x.el.id === decodeURIComponent(m0[1])) : -1;
    cur = -1;
    go(idx >= 0 ? idx : 0, m0 && m0[2] ? +m0[2] : 1);
  }

  if (typeof document$ !== "undefined") document$.subscribe(init);
  else if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
