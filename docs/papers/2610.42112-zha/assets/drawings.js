/* Drawings for the ZHA lesson (arXiv:2610.42112v2).
   One entry per data-draw name; each is redrawn on every step and control change.
   Numbers from the paper carry a // Fig. N, Table N, Eq. N or § comment.
   Toy vectors, scores and the 256-token routing cache are ours, computed live here;
   values marked ≈ are read off the paper's figures by us. */
(function () {
  window.RD = window.RD || {}; RD.drawings = RD.drawings || {};
  const D = RD.drawings;
  const W = 640, H = 360;

  // ------------------------------------------------------------- helpers
  const f2 = (v) => (v < 0 ? "−" : "") + Math.abs(v).toFixed(2);
  const f1 = (v) => (v < 0 ? "−" : "") + Math.abs(v).toFixed(1);
  const comma = (v) => Math.round(v).toLocaleString("en-US");
  const big = (v) => { const f = (x, u) => (x >= 100 ? x.toFixed(0) : x.toFixed(1).replace(/\.0$/, "")) + u; return v >= 1e12 ? f(v / 1e12, "T") : v >= 1e9 ? f(v / 1e9, "B") : v >= 1e6 ? f(v / 1e6, "M") : v >= 1e3 ? f(v / 1e3, "K") : String(Math.round(v)); };
  const sm = (z) => { const m = Math.max(...z), e = z.map((v) => Math.exp(v - m)), s = e.reduce((a, b) => a + b, 0); return e.map((v) => v / s); };
  const lse = (z) => { const m = Math.max(...z); return m + Math.log(z.reduce((a, v) => a + Math.exp(v - m), 0)); };
  const dot2 = (a, b) => a[0] * b[0] + a[1] * b[1];
  const pol = (deg, r = 1) => [r * Math.cos((deg * Math.PI) / 180), r * Math.sin((deg * Math.PI) / 180)];
  const rot = (v, a) => [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a)];
  const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const rect = (c, k, x, y, w, h, tone, soft = "", extra = {}) => c.add(k.h("rect", { x, y, width: Math.max(0.5, w), height: Math.max(0.5, h), rx: extra.rx ?? 2, class: `f-${tone}${soft ? " " + soft : ""}${extra.dim ? " rdx-dim" : ""}`, "stroke-dasharray": extra.dash ? "3 2" : undefined }));
  const occupy = (c, x, y, w, h) => c.occupy({ x, y, w, h, kind: "box" });

  // checklist board: rows [question, answer, tone]; row i appears on step i + 1
  const board = (c, rows, s, top = 6, rowH = 68, split = 300) => {
    c.clear();
    rows.forEach(([q, a, tone], i) => {
      if (s < i + 1) return;
      const y = top + i * rowH, now = s === i + 1;
      c.box({ x: 10, y, w: 620, h: rowH - 10, tone: "muted", hl: now });
      c.text(24, y + (rowH - 10) / 2 + 5, q, { size: 14, weight: now ? 700 : 400, maxW: split - 28, lines: 2, valign: "middle", inBox: true });
      c.box({ x: split + 10, y: y + 7, w: 616 - split - 10, h: rowH - 24, label: a, size: 13, tone, hl: now });
    });
  };
  // horizontal grouped bars with our own scale. rows: [{label, values, hl, dim}]
  const hbars = (c, k, o) => {
    const x0 = o.x ?? 10, y0 = o.y ?? 30, lw = o.labelW ?? 150, bw = o.barW ?? 380, rh = o.rowH ?? 40, max = o.max, tones = o.tones, fmt = o.fmt || ((v) => String(v));
    const n = o.rows[0].values.length, bh = (rh - 10) / n;
    const X = (v) => x0 + lw + (Math.min(v, max) / max) * bw;
    o.rows.forEach((r, i) => {
      const y = y0 + i * rh;
      c.text(x0 + lw - 8, y + rh / 2 + 2, r.label, { anchor: "end", size: 12, weight: r.hl ? 700 : 400, dim: r.dim, maxW: lw - 12, lines: 1, inBox: true });
      r.values.forEach((v, j) => {
        if (v == null) return;
        const yy = y + 4 + j * bh;
        c.add(k.h("rect", { x: x0 + lw, y: yy, width: Math.max(1.5, X(v) - x0 - lw), height: Math.max(2, bh - 2), rx: 2, class: `f-${tones[j]}${r.dim ? " rdx-dim" : ""}${r.hl ? " rdx-hl" : ""}` }));
        c.text(X(v) + 5, yy + bh / 2 + 3, fmt(v, j), { size: Math.min(11, bh + 2), mono: true, tone: tones[j], dim: r.dim, inBox: true });
      });
    });
    occupy(c, x0, y0, lw + bw + 60, o.rows.length * rh);
    return X;
  };
  const legend = (c, x, y, items, size = 12) => {
    let xx = x;
    items.forEach(([t, tone]) => {
      c.dot(xx + 5, y - 4, { r: 5, tone, noOcc: true });
      const el = c.text(xx + 14, y, t, { size, inBox: true });
      xx += 14 + el._r.w + 16;
    });
    occupy(c, x, y - 12, xx - x, 16);
  };
  // a 2-D vector panel: origin (ox, oy), sc px per unit
  const axes2 = (c, ox, oy, r) => { c.line(ox - r, oy, ox + r, oy, { tone: "faint", width: 1 }); c.line(ox, oy - r, ox, oy + r, { tone: "faint", width: 1 }); };
  const vec = (c, ox, oy, sc, v, tone, label, o = {}) => {
    const x2 = ox + v[0] * sc, y2 = oy - v[1] * sc;
    c.arrow(ox, oy, x2, y2, { tone, width: o.width || 2.4, dim: o.dim, snap: false });
    if (label) c.label(x2 + (v[0] >= 0 ? 10 : -10), y2 + (v[1] >= 0 ? -6 : 14), label, { size: 13, tone, weight: 700, anchor: v[0] >= 0 ? "start" : "end", dim: o.dim });
  };

  // ======================================================= ATTENTION TOOLBOX
  const STORY = ["The", "guard", "said", "the", "code", "is", "7392", ".", "…", "What", "is", "the", "code", "?"];

  D["next-token"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const items = STORY.map((t, i) => ({ t, tone: i === 6 ? "predict" : i >= 9 ? "paper" : "muted", hl: s === 1 && i >= 9 }));
      if (s >= 5) items.push({ t: "7", tone: "code", hl: true });
      const ch = c.chips({ x: 20, y: 14, items, size: 14, gap: 7, maxW: 600 });
      if (s >= 2) {
        const r = ch[12];
        const v = c.box({ x: 20, y: 78, w: 300, h: 40, label: "“code” → [0.21, −1.30, 0.72, …]", size: 13, mono: true, tone: "paper", hl: s === 2 });
        c.arrow(r.x + r.w / 2, r.y + r.h + 2, v.bx.r - 40, v.bx.t, { tone: "paper" });
      }
      if (s >= 3) {
        const L = c.box({ x: 20, y: 140, w: 300, h: 46, label: "many layers; attention mixes tokens", size: 13, tone: "take", hl: s === 3 });
        if (s >= 2) c.text(330, 168, "every vector updated by the others", { size: 12, tone: "muted" });
        L.bx && 0;
      }
      if (s >= 4) {
        hbars(c, k, { x: 20, y: 206, labelW: 90, barW: 380, rowH: 32, max: 1, tones: ["predict"], fmt: (v) => v.toFixed(2),
          rows: [["“7”", 0.82], ["“3”", 0.06], ["“The”", 0.04], ["“I”", 0.03]].map(([l, v], i) => ({ label: l, values: [v], hl: i === 0 && s === 4 })) });
        c.text(520, 222, "next-token", { size: 12, tone: "muted" });
        c.text(520, 238, "probabilities", { size: 12, tone: "muted" });
      }
      if (s >= 5) c.text(520, 300, "append “7”, run again", { size: 12, tone: "code", weight: 700, maxW: 115, lines: 2 });
    };
  };

  D["qkv"] = (fig, k) => {
    const c = k.canvas(W, H);
    const T = ["guard", "code", "is", "7392", "code?"];
    return (s) => {
      c.clear();
      const tb = T.map((t, i) => c.box({ x: 20 + i * 122, y: 20, w: 108, h: 40, label: t, mono: true, tone: i === 4 ? "predict" : "muted", hl: (s === 2 && i === 4) || (s === 3 && i === 3) }));
      if (s >= 2) { const q = c.box({ x: 20 + 4 * 122, y: 100, w: 108, h: 44, label: "query q", sub: "what I want", tone: "predict", hl: s === 2 }); c.connect(tb[4], q, { tone: "predict" }); }
      if (s >= 3) for (let i = 0; i < 4; i++) { const kk = c.box({ x: 20 + i * 122, y: 100, w: 108, h: 44, label: "key k", sub: "what I hold", tone: "paper", hl: s === 3 && i === 3 }); c.connect(tb[i], kk, { tone: "paper" }); }
      if (s >= 4) for (let i = 0; i < 4; i++) { const vv = c.box({ x: 20 + i * 122, y: 180, w: 108, h: 44, label: "value v", sub: "what I give", tone: "code", hl: s === 4 && i === 3 }); }
      if (s <= 4) c.box({ x: 20, y: 270, w: 600, h: 60, label: "library: question  ·  spine label  ·  book content", sub: "query · key · value", size: 14, tone: "muted", hl: s === 1 });
      else c.box({ x: 20, y: 270, w: 600, h: 60, label: "q = x·W_Q    k = x·W_K    v = x·W_V", sub: "three learned matrices, one token vector x", mono: true, size: 14, tone: "take", hl: true });
    };
  };

  D["dot"] = (fig, k) => {
    const sl = k.slider({ label: "query angle", min: 0, max: 355, step: 5, value: 100, fmt: (v) => `${v}°` });
    k.follow(sl, { 1: 100, 2: 30, 3: 210 });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const ox = 170, oy = 185, sc = 62;
      axes2(c, ox, oy, 150);
      const kv = pol(30, 2), qv = pol(sl.value, 2);
      vec(c, ox, oy, sc, kv, "paper", "key k");
      vec(c, ox, oy, sc, qv, "predict", "query q");
      const d = dot2(qv, kv);
      let y = 60;
      c.text(360, y, `q = [${f2(qv[0])}, ${f2(qv[1])}]`, { size: 14, mono: true, tone: "predict" }); y += 26;
      c.text(360, y, `k = [${f2(kv[0])}, ${f2(kv[1])}]`, { size: 14, mono: true, tone: "paper" }); y += 34;
      c.text(360, y, `q·k = ${f2(qv[0])}×${f2(kv[0])} + ${f2(qv[1])}×${f2(kv[1])}`, { size: 13, mono: true }); y += 26;
      c.text(360, y, `    = ${f2(d)}`, { size: 18, mono: true, weight: 700, tone: d > 0.5 ? "code" : d < -0.5 ? "bad" : "ink" }); y += 40;
      const tag = d > 3.5 ? "aligned: biggest score" : d < -3.5 ? "opposite: most negative" : Math.abs(d) < 0.4 ? "right angle: zero" : d > 0 ? "partly aligned" : "partly opposite";
      c.text(360, y, tag, { size: 14, weight: 700, tone: d > 0 ? "code" : "bad" });
      if (s >= 4) {
        c.box({ x: 350, y: 270, w: 270, h: 70, label: "real heads: d = 256", sub: "score = q·k / √256 = q·k / 16", tone: "take", hl: true, size: 14 });
      }
    };
  };

  D["softmax"] = (fig, k) => {
    const sl = k.slider({ label: "sharpness", min: 0.2, max: 3, step: 0.1, value: 1, fmt: (v) => `×${v.toFixed(1)}` });
    k.follow(sl, { 1: 1, 3: 3, 4: 0.3 });
    const c = k.canvas(W, H);
    const TOK = ["7392", "code", "is", "the", "guard", "said"], S0 = [2.0, 1.0, 0.5, 0.2, -0.5, -1.0];
    return (s) => {
      c.clear();
      const z = S0.map((v) => v * sl.value), e = z.map(Math.exp), tot = e.reduce((a, b) => a + b, 0), w = e.map((v) => v / tot);
      const bx = (i) => 80 + i * 92, base = 250;
      c.text(10, 300, "token", { size: 12, tone: "muted" });
      c.text(10, 322, "score s", { size: 12, tone: "muted" });
      c.text(10, 344, "e^s", { size: 12, tone: "muted" });
      TOK.forEach((t, i) => {
        c.text(bx(i) + 30, 300, t, { size: 13, anchor: "middle", mono: true });
        c.text(bx(i) + 30, 322, f2(z[i]), { size: 13, anchor: "middle", mono: true, tone: "paper" });
        c.text(bx(i) + 30, 344, e[i] >= 100 ? e[i].toFixed(0) : e[i].toFixed(2), { size: 13, anchor: "middle", mono: true, tone: s === 1 ? "predict" : "ink" });
        if (s >= 2) {
          const h = w[i] * 210;
          rect(c, k, bx(i), base - h, 60, h, "take");
          c.text(bx(i) + 30, base - h - 6, w[i].toFixed(2), { size: 12, anchor: "middle", mono: true, tone: "take" });
        }
      });
      if (s >= 2) { c.line(70, base, 630, base, { tone: "muted", width: 1 }); occupy(c, 80, 30, 550, base - 30); }
      if (s >= 2) c.text(630, 22, `weights = e^s / ${tot.toFixed(2)}   (sum = 1)`, { size: 13, anchor: "end", mono: true, tone: "take", weight: 700 });
      else c.text(630, 22, "exponentiate each score", { size: 13, anchor: "end", tone: "predict", weight: 700 });
    };
  };

  // toy attention for page 5: 2-D keys/values, query "code?"
  const AQ = [1.6, 1.2];
  const AK = [[0.2, -0.8], [-0.6, 0.3], [0.9, 0.4], [-0.3, -0.2], [2.0, 1.4]];
  const AV = [[0.1, 0.9], [0.8, 0.2], [0.3, 0.3], [0.5, 0.6], [1.0, -0.6]];
  const ATOK = ["guard", "said", "code", "is", "7392"];
  D["attn-out"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const sc = AK.map((kk) => dot2(AQ, kk) / Math.SQRT2), w = sm(sc);
      const out = [0, 1].map((d) => w.reduce((a, wi, i) => a + wi * AV[i][d], 0));
      const data = ATOK.map((_, i) => [sc[i], s >= 2 ? w[i] : null, s >= 3 ? `[${AV[i][0].toFixed(1)}, ${AV[i][1].toFixed(1)}]` : null]);
      c.box({ x: 20, y: 12, w: 600, h: 34, label: `query “code?”  q = [${AQ[0]}, ${AQ[1]}]`, mono: true, size: 13, tone: "predict" });
      c.matrix({ x: 150, y: 86, data, cell: 130, cellH: 34, rowLabels: ATOK, rowLabelW: 120, colLabels: ["score q·k/√2", "weight", "value v"],
        fmt: (v) => (typeof v === "number" ? v.toFixed(2) : v), size: 13,
        tone: (i, j) => (i === 4 && j === s - 1 ? "predict" : j === 0 ? "paper" : j === 1 ? "take" : "code") });
      if (s >= 3) c.box({ x: 150, y: 266, w: 390, h: 36, label: `output = Σ weight × value = [${out[0].toFixed(2)}, ${out[1].toFixed(2)}]`, mono: true, size: 13, tone: "code", hl: s === 3 });
      if (s >= 4) c.box({ x: 150, y: 314, w: 390, h: 36, label: "softmax(q·Kᵀ/√d) · V", mono: true, size: 14, tone: "take", hl: true });
    };
  };

  D["causal"] = (fig, k) => {
    const sl = k.slider({ label: "tokens T", min: 4, max: 16, step: 1, value: 8 });
    k.follow(sl, { 1: 8, 4: 16 });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const T = sl.value, cell = Math.floor(320 / T), x0 = 24, y0 = 20, r = rng(7);
      for (let i = 0; i < T; i++) {
        const raw = Array.from({ length: T }, () => r());
        const vis = raw.slice(0, i + 1), sum = vis.reduce((a, b) => a + b, 0);
        for (let j = 0; j < T; j++) {
          const masked = j > i && s >= 2, hlRow = s === 1 && i === 2;
          const op = masked ? 0 : Math.min(1, (j <= i ? raw[j] / sum : 1 / T) * 1.6 + 0.08);
          c.add(k.h("rect", { x: x0 + j * cell + 1, y: y0 + i * cell + 1, width: cell - 2, height: cell - 2, rx: 2,
            class: masked ? "f-muted softer" : `f-${hlRow ? "predict" : "take"}`, "fill-opacity": masked ? undefined : op.toFixed(2) }));
        }
      }
      occupy(c, x0, y0, T * cell, T * cell);
      c.text(x0 + (T * cell) / 2, y0 + T * cell + 18, "keys (earlier tokens) →", { size: 12, anchor: "middle", tone: "muted" });
      const tx = x0 + T * cell + 30;
      if (s === 1) c.text(tx, 60, "row 3: token 3's weights", { size: 14, tone: "predict", weight: 700 });
      if (s >= 2) c.text(tx, 60, "upper triangle masked:", { size: 14, weight: 700 });
      if (s >= 2) c.text(tx, 82, "no looking at the future", { size: 14, tone: "muted" });
      if (s >= 3) {
        const pairs = (T * (T + 1)) / 2;
        c.text(tx, 140, `pairs scored = T(T+1)/2`, { size: 14, mono: true });
        c.text(tx, 166, `= ${pairs}`, { size: 22, mono: true, weight: 700, tone: "take" });
        c.text(tx, 196, `≈ T²/2 = ${(T * T) / 2}`, { size: 14, mono: true, tone: "muted" });
      }
      if (s >= 4) c.text(tx, 250, `vs 8 tokens: ×${((T * (T + 1)) / 2 / 36).toFixed(1)} the pairs`, { size: 14, weight: 700, tone: "predict" });
    };
  };

  D["heads-gqa"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const qx = (i) => 16 + i * 38;
      const qs = Array.from({ length: 16 }, (_, i) => c.box({ x: qx(i), y: 30, w: 32, h: 34, label: `q${i + 1}`, size: 11, tone: "predict", hl: s === 1 || (s === 4 && i < 8) }));
      c.text(320, 18, "16 query heads in one attention layer", { size: 12, anchor: "middle", tone: "muted" });
      if (s === 2) {
        for (let i = 0; i < 16; i++) { const kv = c.box({ x: qx(i), y: 170, w: 32, h: 34, label: `kv`, size: 11, tone: "bad", dashed: true }); c.connect(qs[i], kv, { tone: "bad" }); }
        c.text(320, 250, "one key/value head each: 16 sets to store", { size: 14, anchor: "middle", tone: "bad", weight: 700 });
      }
      if (s >= 3) {
        const kv = [0, 1].map((g) => c.box({ x: 16 + g * 304, y: 170, w: 298, h: 44, label: `key/value head ${g + 1}`, tone: "paper", hl: s === 3 || (s === 4 && g === 0) }));
        for (let i = 0; i < 16; i++) c.arrow(qx(i) + 16, 66, 16 + Math.floor(i / 8) * 304 + 30 + (i % 8) * 34, 168, { tone: "muted", width: 1.2, dim: s === 4 && i >= 8 });
        if (s >= 4) c.text(165, 236, "8 query heads per group", { size: 13, anchor: "middle", tone: "predict", weight: 700 });
        if (s >= 5) [0, 1].forEach((g) => { const t = c.box({ x: 16 + g * 304, y: 280, w: 298, h: 50, label: `one ZHA tree`, sub: `for KV head ${g + 1}`, tone: "take", hl: true }); c.connect(kv[g], t, { tone: "take" }); });
      }
    };
  };

  D["rope"] = (fig, k) => {
    const sl = k.slider({ label: "key position n", min: 0, max: 20, step: 1, value: 6 });
    k.follow(sl, { 1: 6, 2: 6, 3: 2 });
    const c = k.canvas(W, H);
    const TH = 0.3, m = 10, q0 = [1.8, 0.5], k0 = [1.6, 0.9];
    return (s) => {
      c.clear();
      const n = sl.value, ox = 165, oy = 185, sc = 70;
      axes2(c, ox, oy, 150);
      const rotOn = s >= 2;
      const q = rotOn ? rot(q0, m * TH) : q0, kk = rotOn ? rot(k0, n * TH) : k0;
      vec(c, ox, oy, sc, q, "predict", rotOn ? `q at ${m}` : "q");
      vec(c, ox, oy, sc, kk, "paper", rotOn ? `k at ${n}` : "k");
      const sc0 = dot2(q, kk);
      let y = 56;
      if (!rotOn) {
        c.text(350, y, "no position information:", { size: 14, weight: 700, maxW: 280, lines: 1 }); y += 28;
        c.text(350, y, `score = ${f2(sc0)} anywhere`, { size: 14, mono: true }); y += 28;
        c.text(350, y, "shuffle the story: same score", { size: 14, tone: "bad", maxW: 280, lines: 1 });
      } else {
        c.text(350, y, `query at ${m}: turned ${m} × 0.3 rad`, { size: 13, mono: true, tone: "predict", maxW: 280, lines: 1 }); y += 26;
        c.text(350, y, `key at ${n}: turned ${n} × 0.3 rad`, { size: 13, mono: true, tone: "paper", maxW: 280, lines: 1 }); y += 36;
        c.text(350, y, `score = ${f2(sc0)}`, { size: 20, mono: true, weight: 700, tone: "take" }); y += 30;
        c.text(350, y, `depends only on m − n = ${m - n}`, { size: 14, weight: 700, maxW: 280, lines: 1 });
      }
      if (s >= 4) c.box({ x: 340, y: 250, w: 280, h: 70, label: "NoPE: no rotation at all", sub: "e.g. Nemotron-3.5-Lightning", tone: "muted", hl: true });
    };
  };

  D["kv-cache"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const n = [6, 6, 11, 11][s - 1], cw = 40, x0 = 70;
      c.text(14, 76, "keys", { size: 13, tone: "paper", weight: 700 });
      c.text(14, 126, "values", { size: 13, tone: "code", weight: 700 });
      for (let i = 0; i < n; i++) {
        const isNew = s >= 3 && i >= 6;
        rect(c, k, x0 + i * cw, 54, cw - 6, 34, "paper", isNew ? "" : "soft");
        rect(c, k, x0 + i * cw, 104, cw - 6, 34, "code", isNew ? "" : "soft");
        c.text(x0 + i * cw + (cw - 6) / 2, 30, `t${i + 1}`, { size: 11, anchor: "middle", mono: true, tone: "muted" });
      }
      occupy(c, x0, 22, n * cw, 120);
      if (s === 1) c.text(x0, 180, "past keys and values never change", { size: 14, weight: 700 });
      if (s >= 2) c.box({ x: x0 - 8, y: 46, w: n * cw + 4, h: 100, tone: "take", dashed: true, label: "", hl: s === 2 }) && 0;
      if (s === 2) c.text(x0, 180, "the KV cache: stored once, reused", { size: 14, weight: 700, tone: "take" });
      if (s >= 3) {
        const qb = c.box({ x: x0 + n * cw + 20, y: 180, w: 90, h: 40, label: "new q", tone: "predict", hl: s === 3 });
        for (let i = 0; i < n; i++) c.arrow(qb.bx.l, qb.bx.cy, x0 + i * cw + 17, 92, { tone: "predict", width: 1, dim: s > 3 });
        c.text(x0, 250, `step ${n}: the new query reads all ${n} keys`, { size: 14, weight: 700, tone: "predict" });
      }
      if (s >= 4) c.box({ x: 20, y: 282, w: 600, h: 66, label: "≈ 20 KB per token × 262,144 tokens ≈ 5.4 GB", sub: "10 layers × 2 KV heads × 256 dims × (k+v) × 2 bytes", mono: true, size: 15, tone: "bad", hl: true });
    };
  };

  D["quadratic"] = (fig, k) => {
    const sl = k.slider({ label: "context T", min: 3, max: 6.3, step: 0.05, value: 4, fmt: (v) => big(10 ** v) + " tokens" });
    k.follow(sl, { 1: 4, 3: 6 });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const T = 10 ** sl.value, xs = [], pre = [], dec = [];
      for (let e = 3; e <= 6.31; e += 0.1) { xs.push(10 ** e); pre.push((10 ** e) ** 2 / 2); dec.push(10 ** e); }
      const series = [{ x: xs, y: pre, tone: "bad", label: "prefill pairs ≈ T²/2", labelAt: 22 }];
      if (s >= 2) series.push({ x: xs, y: dec, tone: "predict", label: "keys read per new token = T", labelAt: 25 });
      const p = c.plot({ x: 0, y: 0, w: 420, h: 360, xlog: true, ylog: true, xmin: 1e3, xmax: 2e6, ymin: 1e3, ymax: 1e13, series,
        xlabel: "context length T (tokens)", ylabel: "work per head", xFmt: big, yFmt: big, ml: 64 });
      c.dot(p.X(T), p.Y(T * T / 2), { r: 6, tone: "bad" });
      if (s >= 2) c.dot(p.X(T), p.Y(T), { r: 6, tone: "predict" });
      c.text(440, 50, `T = ${comma(T)}`, { size: 15, mono: true, weight: 700, maxW: 185, lines: 1 });
      c.text(440, 84, "prefill pairs", { size: 13, tone: "bad" });
      c.text(440, 116, big(T * T / 2), { size: 20, mono: true, weight: 700, tone: "bad" });
      if (s >= 2) { c.text(440, 150, "per decoded token", { size: 13, tone: "predict" }); c.text(440, 182, big(T) + " keys", { size: 20, mono: true, weight: 700, tone: "predict" }); }
      if (s >= 4) c.box({ x: 432, y: 230, w: 196, h: 86, label: "goal: read ≪ T keys, and find them cheaply", size: 13, tone: "code", hl: true });
    };
  };

  // ======================================================= LONG-CONTEXT TOOLBOX
  const STORY2 = ["The", "guard", "said", "the", "code", "is", "7392", ".", "Then", "rain", "fell", "for", "hours", "and", "the", "town", "slept", ".", "What", "is", "the", "code", "?"];
  D["fixed-state"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const n = STORY2.length, win = 4;
      const ch = c.chips({ x: 14, y: 16, size: 13, gap: 6, maxW: 610, items: STORY2.map((t, i) => ({ t, tone: i === 6 ? (s >= 3 ? "bad" : "predict") : i >= n - win ? "take" : "muted", hl: (i >= n - win && s <= 2) || (i === 6 && s === 3) })) });
      c.box({ x: 150, y: 120, w: 340, h: 56, label: "fixed state: 4 slots", sub: s >= 2 ? "new tokens overwrite old content" : "same size at any length", tone: "take", hl: s <= 2 });
      if (s >= 3) c.text(320, 214, "“7392” fell out of the 4-token window", { size: 14, anchor: "middle", tone: "bad", weight: 700 });
      if (s >= 4) {
        const L = ["Mamba", "Mamba", "Mamba", "attention", "Mamba", "Mamba", "Mamba", "attention"];
        L.forEach((t, i) => c.box({ x: 14 + i * 77, y: 250, w: 71, h: 46, label: t, size: 12, tone: t === "attention" ? "bad" : "take", hl: t === "attention" }));
        c.text(320, 326, "hybrid: at long context the attention layers dominate again", { size: 13, anchor: "middle", tone: "bad" });
      }
    };
  };

  D["sparse-attn"] = (fig, k) => {
    const c = k.canvas(W, H);
    const r = rng(3), sc = Array.from({ length: 48 }, () => r()), top = [...sc.keys()].sort((a, b) => sc[b] - sc[a]).slice(0, 6);
    return (s) => {
      c.clear();
      const x0 = 20, cw = 12.5;
      c.text(x0, 30, "full KV cache: every key kept", { size: 13, weight: 700 });
      for (let i = 0; i < 48; i++) {
        const sel = s >= 3 && top.includes(i);
        rect(c, k, x0 + i * cw, 42, cw - 2, 34, sel ? "predict" : "paper", sel ? "" : s === 2 ? "soft" : "softer");
      }
      occupy(c, x0, 42, 48 * cw, 34);
      if (s >= 2) {
        const ib = c.box({ x: 20, y: 130, w: 260, h: 54, label: "indexer scores all T keys", sub: "cheap per key, but T of them", tone: "bad", hl: s === 2 || s === 4 });
        c.arrow(150, 128, 150, 80, { tone: "bad" });
      }
      if (s >= 3) {
        const ab = c.box({ x: 340, y: 130, w: 280, h: 54, label: "real attention on top K", sub: "fixed K, e.g. 16 × 128 = 2,048", tone: "predict", hl: s === 3 });
        c.arrow(480, 80, 480, 128, { tone: "predict" });
      }
      if (s >= 4) {
        c.text(20, 236, "time in a sparse layer near 1M tokens:", { size: 13, weight: 700 });
        rect(c, k, 20, 250, 360, 40, "bad");
        rect(c, k, 380, 250, 180, 40, "bad", "soft", { dash: true });
        rect(c, k, 560, 250, 60, 40, "predict");
        occupy(c, 20, 250, 600, 40);
        c.text(200, 312, "indexing: 60–90%", { size: 13, anchor: "middle", tone: "bad", weight: 700 });
        c.text(590, 312, "attention", { size: 12, anchor: "middle", tone: "predict" });
      }
    };
  };

  const HEADS = {
    medium: [0.30, 0.20, 0.13, 0.09, 0.07, 0.06, 0.05, 0.04, 0.03, 0.015, 0.01, 0.005],
    flat: [0.11, 0.105, 0.10, 0.095, 0.09, 0.085, 0.08, 0.075, 0.07, 0.065, 0.065, 0.06],
    peaked: [0.80, 0.12, 0.03, 0.015, 0.01, 0.008, 0.006, 0.004, 0.003, 0.002, 0.001, 0.001],
  };
  const topP = (w, p) => { let cum = 0; for (let i = 0; i < w.length; i++) { cum += w[i]; if (cum >= p - 1e-9) return i + 1; } return w.length; };
  D["topk-topp"] = (fig, k) => {
    const tg = k.toggle({ label: "head", options: ["medium", "flat", "peaked"], value: "medium" });
    const sl = k.slider({ label: "p", min: 0.5, max: 0.99, step: 0.01, value: 0.9, fmt: (v) => v.toFixed(2) });
    k.follow(tg, { 1: "medium", 4: "flat", 5: "peaked" });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const w = HEADS[tg.value], mx = Math.max(...w), base = 240, x0 = 30;
      const nP = topP(w, sl.value), massK = w.slice(0, 4).reduce((a, b) => a + b, 0), massP = w.slice(0, nP).reduce((a, b) => a + b, 0);
      w.forEach((v, i) => {
        const h = (v / mx) * 190, inK = s >= 2 && i < 4, inP = s >= 3 && i < nP;
        rect(c, k, x0 + i * 50, base - h, 40, h, inP ? "predict" : inK ? "code" : "muted", inP || inK ? "" : "soft");
        c.text(x0 + i * 50 + 20, base - h - 5, v.toFixed(v < 0.01 ? 3 : 2), { size: 11, anchor: "middle", mono: true, tone: "muted" });
      });
      c.line(x0 - 6, base, x0 + 12 * 50, base, { tone: "muted", width: 1 });
      occupy(c, x0, 30, 600, base - 30);
      c.text(x0, 22, "keys sorted by attention weight", { size: 13, tone: "muted", weight: 700 });
      if (s >= 2) { c.line(x0, 262, x0 + 4 * 50 - 10, 262, { tone: "code", width: 3 }); c.text(x0, 284, `top-K = 4 keys: ${(massK * 100).toFixed(0)}% of mass`, { size: 13, tone: "code", weight: 700 }); }
      if (s >= 3) { c.line(x0, 304, x0 + nP * 50 - 10, 304, { tone: "predict", width: 3 }); c.text(x0, 328, `top-p (p = ${sl.value.toFixed(2)}) = ${nP} keys: ${(massP * 100).toFixed(0)}% of mass`, { size: 13, tone: "predict", weight: 700 }); }
      occupy(c, x0, 258, 600, 8); occupy(c, x0, 300, 600, 8);
    };
  };

  D["tree-search"] = (fig, k) => {
    const sl = k.slider({ label: "items N", min: 4, max: 20, step: 1, value: 4, fmt: (v) => comma(2 ** v) });
    k.follow(sl, { 1: 4, 3: 20 });
    const c = k.canvas(W, H);
    const target = 11;
    return (s) => {
      c.clear();
      const depthShown = s === 1 ? 0 : s === 2 ? 2 : 4;
      const pos = (d, i) => [20 + (600 / 2 ** d) * (i + 0.5), 24 + d * 54];
      for (let d = 0; d <= 4; d++) {
        for (let i = 0; i < 2 ** d; i++) {
          const onPath = i === target >> (4 - d), [x, y] = pos(d, i);
          const parentOnPath = d === 0 || (i >> 1) === target >> (5 - d);
          const scored = d <= depthShown && parentOnPath;
          const pruned = d > 0 && d <= depthShown && !parentOnPath;
          const bw = d === 4 ? 30 : 40;
          if (d > 0) { const [px, py] = pos(d - 1, i >> 1); c.line(px, py + 22, x, y, { tone: "muted", width: 1, dim: pruned || d > depthShown + 1 }); }
          const isBad = s === 4 && d === 4 && i === 5;
          c.box({ x: x - bw / 2, y, w: bw, h: 22, label: d === 4 ? String(i + 1) : "", size: 11, tone: isBad ? "bad" : onPath && d <= depthShown ? "predict" : scored ? "paper" : "muted",
            hl: isBad || (onPath && d === depthShown), dim: !isBad && (pruned || (d > depthShown && !(s >= 3))), solid: false });
        }
      }
      if (s === 4) c.text(20, 300, "bad summary: the true answer (6) sat in a pruned branch", { size: 13, tone: "bad", weight: 700, maxW: 600, lines: 1 });
      const N = 2 ** sl.value;
      c.text(20, 330, s >= 3 ? `${comma(N)} items → ${sl.value} questions` : s === 2 ? "2 answers: 12 of 16 leaves discarded unseen" : "find leaf 12: ask “left or right?”", { size: 15, weight: 700, tone: "predict" });
    };
  };

  D["power-law"] = (fig, k) => {
    const sl = k.slider({ label: "exponent α", min: 0.2, max: 1.2, step: 0.05, value: 0.5, fmt: (v) => v.toFixed(2) });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const a = sl.value, log = s >= 3, xs = [], y1 = [], ya = [];
      if (log) for (let e = 0; e <= 4.01; e += 0.1) xs.push(10 ** e); else for (let t = 1; t <= 100; t += 1) xs.push(t);
      xs.forEach((t) => { y1.push(t); ya.push(t ** a); });
      const series = [{ x: xs, y: y1, tone: "muted", dash: true, label: "α = 1 (linear)", labelAt: Math.floor(xs.length * 0.8) }];
      if (s >= 2) series.push({ x: xs, y: ya, tone: "take", label: `α = ${a.toFixed(2)}`, labelAt: xs.length - 1 });
      const p = c.plot({ x: 0, y: 0, w: 430, h: 360, xlog: log, ylog: log, xmin: log ? 1 : 0, xmax: log ? 1e4 : 100, ymin: log ? 1 : 0, ymax: log ? 1e4 : Math.max(100, 100 ** a), series,
        xlabel: log ? "T (log axis)" : "T", ylabel: log ? "y (log axis)" : "y = T^α", xFmt: big, yFmt: big });
      c.text(450, 60, "2T → y × 2^α", { size: 14, mono: true });
      c.text(450, 90, `= × ${(2 ** a).toFixed(2)}`, { size: 22, mono: true, weight: 700, tone: "take" });
      c.text(450, 130, a < 1 ? "sublinear" : a > 1 ? "superlinear" : "linear", { size: 15, weight: 700, tone: a < 1 ? "code" : "bad" });
      if (log) c.text(450, 190, "straight line", { size: 14, weight: 700 });
      if (log) c.text(450, 212, `slope = α = ${a.toFixed(2)}`, { size: 14, mono: true, tone: "take" });
      if (s >= 4) c.box({ x: 446, y: 250, w: 182, h: 70, label: "paper fits slopes like this", sub: "Eq. 6, Fig. 1", size: 13, tone: "paper", hl: true });
    };
  };

  // ======================================================= MATH TOOLBOX
  D["lse"] = (fig, k) => {
    const sl = k.slider({ label: "top score boost", min: 0, max: 4, step: 0.1, value: 0, fmt: (v) => "+" + v.toFixed(1) });
    k.follow(sl, { 1: 0, 4: 4 });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const z = [1.0 + sl.value, 0.6, 0.3, 0.0], L = lse(z), M = Math.max(...z);
      const X = (v) => 40 + ((v + 0.5) / 6.5) * 560, y0 = 200;
      c.line(X(-0.5), y0, X(6), y0, { tone: "muted", width: 1.2 });
      for (let v = 0; v <= 6; v++) { c.line(X(v), y0 - 4, X(v), y0 + 4, { tone: "muted" }); c.text(X(v), y0 + 22, String(v), { size: 11, anchor: "middle", tone: "muted", inBox: true }); }
      occupy(c, X(-0.5), y0 - 4, 560, 30);
      z.forEach((v, i) => { c.dot(X(v), y0 - 18 - i * 22, { r: 6, tone: "paper" }); c.text(X(v) + 10, y0 - 13 - i * 22, `s${i + 1} = ${v.toFixed(1)}`, { size: 12, mono: true, tone: "paper" }); });
      if (s >= 2) {
        const e = z.map(Math.exp), tot = e.reduce((a, b) => a + b, 0);
        c.text(40, 40, `Σ e^s = ${e.map((v) => v.toFixed(2)).join(" + ")} = ${tot.toFixed(2)}`, { size: 13, mono: true });
      }
      if (s >= 3) {
        c.line(X(L), y0 - 110, X(L), y0 + 34, { tone: "take", width: 2.4 });
        c.label(L > 3 ? X(L) - 6 : X(L) + 6, y0 + 52, `LSE = log ${Math.exp(L).toFixed(2)} = ${L.toFixed(2)}`, { size: 14, mono: true, tone: "take", weight: 700, anchor: L > 3 ? "end" : "start" });
        c.line(X(M), y0 - 110, X(M), y0 - 96, { tone: "muted", width: 2 });
        c.text(40, 80, `max = ${M.toFixed(2)}   gap LSE − max = ${(L - M).toFixed(2)}`, { size: 14, mono: true, weight: 700, tone: s >= 4 ? "code" : "ink" });
      }
      if (s >= 4) c.text(40, 330, L - M < 0.1 ? "one dominant score: LSE ≈ max" : "scores close together: LSE well above max", { size: 14, weight: 700, tone: "code" });
    };
  };

  // 1-D convex function: LSE over three toy "keys" along one query direction
  const TA = [-1, 0.3, 1.2], TC = [0, 0.5, -0.5];
  const f1d = (x) => lse(TA.map((a, j) => a * x + TC[j]));
  const g1d = (x) => { const w = sm(TA.map((a, j) => a * x + TC[j])); return w.reduce((acc, wi, j) => acc + wi * TA[j], 0); };
  D["tangent"] = (fig, k) => {
    const sl = k.slider({ label: "touch point", min: -2.5, max: 2.5, step: 0.1, value: 0, fmt: (v) => v.toFixed(1) });
    k.follow(sl, { 2: 0, 3: 0 });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const xs = []; for (let x = -3; x <= 3.001; x += 0.05) xs.push(x);
      const series = [{ x: xs, y: xs.map(f1d), tone: "paper", label: "LSE (convex)", labelAt: 110, width: 3 }];
      const clip = (v) => (v < -1 || v > 4.5 ? NaN : v);
      const tan = (x0) => xs.map((x) => clip(f1d(x0) + g1d(x0) * (x - x0)));
      if (s === 2 || s === 3) series.push({ x: xs, y: tan(sl.value), tone: "take", label: "tangent" , labelAt: 10 });
      if (s >= 4) {
        [-2, 0, 2].forEach((x0) => series.push({ x: xs, y: tan(x0), tone: "muted", dash: true }));
        series.push({ x: xs, y: xs.map((x) => clip(Math.max(...[-2, 0, 2].map((x0) => f1d(x0) + g1d(x0) * (x - x0))))), tone: "take", label: "max of 3 tangents", labelAt: 15, width: 2.4 });
      }
      const p = c.plot({ x: 0, y: 0, w: 640, h: 360, xmin: -3, xmax: 3, ymin: -1, ymax: 4.5, series, xlabel: "query (along one direction)", ylabel: "log attention mass", xFmt: (v) => v.toFixed(0), yFmt: (v) => v.toFixed(0) });
      if (s === 2 || s === 3) c.dot(p.X(sl.value), p.Y(f1d(sl.value)), { r: 6, tone: "take" });
      if (s === 3) {
        const xf = sl.value + 2.5 > 3 ? sl.value - 2.5 : sl.value + 2.5, gap = f1d(xf) - (f1d(sl.value) + g1d(sl.value) * (xf - sl.value));
        c.line(p.X(xf), p.Y(f1d(xf)), p.X(xf), p.Y(f1d(xf) - gap), { tone: "bad", width: 3 });
        c.label(p.X(xf) + 8, p.Y(f1d(xf) - gap / 2), `far away: ${gap.toFixed(2)} too low`, { size: 13, tone: "bad", weight: 700, anchor: xf > 0 ? "end" : "start" });
      }
      if (s >= 4) [-2, 0, 2].forEach((x0) => c.dot(p.X(x0), p.Y(f1d(x0)), { r: 5, tone: "take" }));
    };
  };

  D["kl"] = (fig, k) => {
    const sl = k.slider({ label: "guess for chunk 1", min: 0.02, max: 0.9, step: 0.01, value: 0.3, fmt: (v) => v.toFixed(2) });
    k.follow(sl, { 1: 0.3, 3: 0.05, 4: 0.5 });
    const c = k.canvas(W, H);
    const P = [0.5, 0.2, 0.15, 0.1, 0.05];
    return (s) => {
      c.clear();
      const g = sl.value, Q = [g, ...[0.3, 0.3, 0.2, 0.2].map((v) => v * (1 - g))];
      const KL = P.reduce((a, p, i) => a + p * Math.log(p / Q[i]), 0), base = 270;
      P.forEach((p, i) => {
        const x = 40 + i * 76;
        rect(c, k, x, base - p * 300, 30, p * 300, "paper");
        rect(c, k, x + 32, base - Q[i] * 300, 30, Q[i] * 300, "take", s === 1 ? "soft" : "");
        c.text(x + 31, base + 18, `chunk ${i + 1}`, { size: 11, anchor: "middle", tone: "muted" });
      });
      c.line(30, base, 420, base, { tone: "muted", width: 1 });
      occupy(c, 40, 0, 380, base);
      legend(c, 40, 316, [["true p (dense attention)", "paper"], ["guess p̂", "take"]]);
      if (s >= 2) {
        c.text(440, 70, "KL(p ‖ p̂) =", { size: 15, mono: true });
        c.text(440, 106, `${KL.toFixed(3)} nats`, { size: 24, mono: true, weight: 700, tone: KL > 0.5 ? "bad" : "code" });
        c.text(440, 140, "zero only if p̂ = p", { size: 13, tone: "muted" });
      }
      if (s >= 3) c.text(440, 190, g < 0.15 ? "true top chunk starved: KL jumps" : "guess closer: KL falls", { size: 13, weight: 700, tone: g < 0.15 ? "bad" : "code", maxW: 190, lines: 2 });
      if (s >= 4) c.box({ x: 436, y: 240, w: 192, h: 60, label: "distillation", sub: "student copies teacher", tone: "take", hl: true });
    };
  };

  // ======================================================= THE EVIDENCE
  D["topp-growth"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const xs = []; for (let e = 0; e <= 5.42; e += 0.1) xs.push(10 ** e);
      const series = [];
      if (s >= 2) series.push({ x: xs, y: xs, tone: "muted", dash: true, label: "p = 1: all T keys", labelAt: 40 });
      if (s >= 3) [[0.99, 0.85], [0.9, 0.62], [0.5, 0.4], [0.1, 0.2]].forEach(([p, a], i) =>
        series.push({ x: xs, y: xs.map((t) => t ** a), tone: "paper", dim: s === 4 && i < 2, label: `p = ${p}`, labelAt: 54 }));
      const p = c.plot({ x: 0, y: 0, w: 640, h: 360, xlog: true, ylog: true, xmin: 1, xmax: 3e5, ymin: 1, ymax: 3e5, series,
        xlabel: "context length T (tokens)", ylabel: "top-p set size (keys)", xFmt: big, yFmt: big, mr: 70 });
      c.label(p.X(20), p.Y(3e4), "Qwen3.6-35B-A3B, six fiction books", { size: 13, weight: 700, anchor: "start" });
      if (s >= 3) c.label(p.X(3e3), p.Y(4), "slopes below 1: sublinear (illustrative)", { size: 13, tone: "paper", anchor: "start" });
      if (s >= 4) c.label(p.X(4e3), p.Y(2e4), "lower p → flatter line", { size: 13, tone: "take", weight: 700, anchor: "start" });
    };
  };

  D["union"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const xs = []; for (let e = 2; e <= 5.001; e += 0.1) xs.push(10 ** e);
      const cur = (y0, y1, mid) => xs.map((x) => { const t = (Math.log10(x) - 2) / 3; return y0 + (y1 - y0) / (1 + Math.exp(-(t - mid) * 6)); });
      const series = [];
      const CUR = [["p = 0.99", 80, 100.5, 0.1], ["p = 0.9", 40, 100.5, 0.35], ["p = 0.5", 5, 80, 0.8], ["p = 0.1", 0.5, 18, 1.1]];
      if (s >= 3) CUR.forEach(([l, a, b, m]) => series.push({ x: xs, y: cur(a, b, m).map((v) => Math.min(100, v)), tone: "paper", label: l, labelAt: 12 }));
      const p = c.plot({ x: 0, y: 0, w: 640, h: 360, xlog: true, xmin: 100, xmax: 1e5, ymin: 0, ymax: 100, series,
        xlabel: "number of recent queries W", ylabel: "share of older keys used (%)", xFmt: big, mr: 34, yFmt: (v) => v.toFixed(0) });
      c.box({ x: 360, y: 230, w: 260, h: 54, label: "one book: 261,548 tokens", sub: "Qwen3.6-35B-A3B", tone: "muted", hl: s === 1 });
      if (s === 2) { c.dot(p.X(100), p.Y(3), { r: 7, tone: "predict" }); c.label(p.X(100) + 14, p.Y(12), "one query: a sliver", { size: 13, tone: "predict", weight: 700, anchor: "start" }); }
      if (s >= 4) c.box({ x: 360, y: 160, w: 260, h: 54, label: "eviction fails: keep the cache", tone: "bad", hl: true });
    };
  };

  D["two-props"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => board(c, [
      ["Property 1", "each query picks its own keys", "paper"],
      ["Property 2", "state grows, sublinearly", "paper"],
      ["Fixed state (Mamba, sliding window)", "✗ 1   ✗ 2", "bad"],
      ["Top-K sparse (DSA, MSA)", "✓ 1   ✗ 2 (indexer reads all)", "predict"],
      ["ZHA", "✓ 1   ✓ 2 (tree search)", "code"],
    ], s, 6, 69);
  };

  // ======================================================= THE MACHINE
  D["machine"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const cache = c.box({ x: 20, y: 30, w: 180, h: 60, label: "KV cache", sub: "every key kept", tone: "paper", hl: s === 1 });
      if (s >= 2) { const tree = c.box({ x: 230, y: 30, w: 180, h: 60, label: "summary tree", sub: "built online", tone: "take", hl: s === 2 }); c.connect(cache, tree, { tone: "take" }); }
      if (s >= 3) {
        const q = c.box({ x: 440, y: 30, w: 180, h: 60, label: "query “code?”", tone: "predict", hl: s === 3 });
        const r = c.box({ x: 230, y: 150, w: 180, h: 60, label: "route down", sub: "top-p at each level", tone: "predict", hl: s === 3 });
        c.connect({ bx: { x: 230, y: 30, w: 180, h: 60, cx: 320, cy: 60, l: 230, r: 410, t: 30, b: 90 } }, r, { tone: "take" });
        c.arrow(530, 92, 400, 150, { tone: "predict" });
      }
      if (s >= 4) {
        const a = c.box({ x: 230, y: 270, w: 180, h: 60, label: "exact attention", sub: "chunks reached", tone: "code", hl: s === 4 });
        c.arrow(320, 212, 320, 268, { tone: "predict", label: "chunk with “7392”", dx: 70 });
        c.arrow(110, 92, 228, 290, { tone: "paper", dash: true });
        const o = c.box({ x: 440, y: 270, w: 180, h: 60, label: "output", sub: "≈ dense attention", tone: "code" });
        c.connect(a, o, { tone: "code" });
      }
      if (s >= 5) c.box({ x: 20, y: 150, w: 180, h: 70, label: "only learned part:", sub: "reference queries", tone: "take", hl: true });
      if (s >= 5) c.text(20, 250, "10 of Qwen's 40 layers", { size: 12, tone: "muted" });
    };
  };

  const GEO = { "deep C4 L6": [4, 6], "wide C256 L1": [256, 1] };
  D["tree-shape"] = (fig, k) => {
    const tg = k.toggle({ label: "paper tree", options: Object.keys(GEO), value: "deep C4 L6" });
    k.follow(tg, { 4: "deep C4 L6", 5: "wide C256 L1" });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const x0 = 70, Wd = 560, rows = [["keys", 256, 222], ["level 1", 64, 168], ["level 2", 16, 114], ["level 3", 4, 60]];
      rows.forEach(([lab, n, y], ri) => {
        if (ri >= 2 && s < 2) return;
        if (ri === 1 && s < 1) return;
        const cw = Wd / n;
        for (let i = 0; i < n; i++) rect(c, k, x0 + i * cw + (n > 100 ? 0 : 1), y, Math.max(0.6, cw - (n > 100 ? 0.6 : 2)), ri === 0 ? 30 : 38, ri === 0 ? "paper" : "take", ri === 3 && s >= 3 && i === 1 ? "" : "soft");
        occupy(c, x0, y, Wd, ri === 0 ? 30 : 38);
        c.text(x0 - 8, y + 22, lab, { size: 12, anchor: "end", tone: "muted", inBox: true });
      });
      c.text(x0, 278, "toy: C = 4, L = 3 over 256 keys; a top node spans 4³ = 64 keys", { size: 12, tone: "muted" });
      if (s >= 3) {
        for (let r = 0; r < 4; r++) rect(c, k, x0 + 140 + 8 + r * 5, 22 - r * 4, 120, 30, "take", "soft");
        c.text(x0 + 140 + 150, 18, "R summaries per node", { size: 12, tone: "take", weight: 700 });
      }
      if (s >= 4) {
        const [C, L] = GEO[tg.value], T = 262144;
        const counts = []; for (let l = 1; l <= L; l++) counts.push(comma(T / C ** l));
        c.box({ x: 10, y: 296, w: 620, h: 54, label: `${tg.value} at 262,144 tokens: top node spans ${comma(C ** L)} keys`, sub: `nodes per level: ${counts.join(" · ")}`, size: 13, tone: "predict", hl: true });
      }
    };
  };

  // the toy chunk: four 2-D keys around 40°, |k| = 2; d = 2
  const CK = [[25, 2.0], [38, 2.2], [52, 1.9], [70, 2.1]].map(([a, r]) => pol(a, r));
  const RT2 = Math.SQRT2;
  const Fc = (q) => lse(CK.map((kk) => dot2(q, kk) / RT2));
  const summ = (qr, keys = CK) => { const w = sm(keys.map((kk) => dot2(qr, kk) / RT2)); const kh = [0, 1].map((d) => w.reduce((a, wi, j) => a + wi * keys[j][d], 0)); const F = lse(keys.map((kk) => dot2(qr, kk) / RT2)); return { w, kh, b: F - dot2(qr, kh) / RT2, F, H: -w.reduce((a, v) => a + v * Math.log(v), 0) }; };
  const QR = 2.0;
  const panelChunk = (c, ox, oy, sc, qAng, extra) => {
    axes2(c, ox, oy, 120);
    CK.forEach((kk, i) => vec(c, ox, oy, sc, kk, "paper", i === 3 ? "chunk keys" : null, { width: 1.8 }));
    if (qAng != null) vec(c, ox, oy, sc, pol(qAng, QR), "predict", "query");
    if (extra) extra();
  };
  const massPlot = (c, x, y, w, h, series, ymin = -4, ymax = 5) => c.plot({ x, y, w, h, xmin: 0, xmax: 360, ymin, ymax, series, xlabel: "query angle (°)", ylabel: "log attention mass", xFmt: (v) => v.toFixed(0), yFmt: (v) => v.toFixed(0), ml: 46 });
  const ANG = []; for (let a = 0; a <= 360; a += 3) ANG.push(a);

  D["chunk-mass"] = (fig, k) => {
    const sl = k.slider({ label: "query angle", min: 0, max: 360, step: 3, value: 150, fmt: (v) => `${v}°` });
    k.follow(sl, { 1: 150, 3: 45 });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const q = pol(sl.value, QR);
      panelChunk(c, 130, 170, 50, sl.value);
      if (s >= 2) c.text(10, 330, `F_C(q) = LSE(q·k/√2) = ${f2(Fc(q))}`, { size: 14, mono: true, weight: 700, tone: "take" });
      if (s >= 3) {
        const p = massPlot(c, 270, 0, 370, 300, [{ x: ANG, y: ANG.map((a) => Fc(pol(a, QR))), tone: "take", width: 2.6 }]);
        c.dot(p.X(sl.value), p.Y(Fc(q)), { r: 6, tone: "predict" });
      }
      if (s >= 4) c.text(290, 330, "exact F_C costs C dot products", { size: 13, tone: "bad", weight: 700 });
      if (s >= 5) c.text(290, 350, "want: a few stored numbers → F_C(q)", { size: 13, tone: "code", weight: 700 });
    };
  };

  D["one-ref"] = (fig, k) => {
    const sl = k.slider({ label: "query angle", min: 0, max: 360, step: 3, value: 45, fmt: (v) => `${v}°` });
    k.follow(sl, { 1: 45, 4: 120 });
    const c = k.canvas(W, H);
    const REF = 45;
    return (s) => {
      c.clear();
      const qr = pol(REF, QR), S = summ(qr), q = pol(sl.value, QR);
      panelChunk(c, 130, 150, 46, s >= 4 ? sl.value : null, () => {
        vec(c, 130, 150, 46, qr, "take", "reference q̂", { width: 2 });
        if (s >= 2) vec(c, 130, 150, 46, S.kh, "code", "k̂", { width: 3 });
      });
      let y = 296;
      if (s >= 2) { c.text(10, y, `weights ${S.w.map((v) => v.toFixed(2)).join(" ")} → k̂ = [${f2(S.kh[0])}, ${f2(S.kh[1])}]`, { size: 12, mono: true, tone: "code" }); y += 22; }
      if (s >= 3) { c.text(10, y, `b̂ = F(q̂) − q̂·k̂/√2 = ${f2(S.b)}   entropy = ${f2(S.H)}`, { size: 12, mono: true, tone: "take", weight: 700 }); y += 22; }
      if (s >= 4) {
        const t = (a) => dot2(pol(a, QR), S.kh) / RT2 + S.b;
        const p = massPlot(c, 300, 0, 340, 280, [{ x: ANG, y: ANG.map((a) => Fc(pol(a, QR))), tone: "take", width: 2.6, label: "true F_C", labelAt: 30 }, { x: ANG, y: ANG.map(t), tone: "code", label: "tangent", labelAt: 75 }]);
        c.dot(p.X(REF), p.Y(Fc(qr)), { r: 5, tone: "take" });
        c.dot(p.X(sl.value), p.Y(Fc(q)), { r: 5, tone: "predict" });
        c.text(10, y, `at this query: true ${f2(Fc(q))}, tangent ${f2(t(sl.value))}`, { size: 12, mono: true, weight: 700, tone: "predict" });
      }
      if (s >= 5) c.text(10, 18, "stored per reference: 1 key + 1 number", { size: 13, weight: 700, tone: "code" });
    };
  };

  D["many-refs"] = (fig, k) => {
    const sl = k.slider({ label: "references R", min: 1, max: 8, step: 1, value: 1 });
    k.follow(sl, { 1: 1, 2: 2, 3: 6 });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const R = sl.value, refs = Array.from({ length: R }, (_, i) => 45 + (360 * i) / R), Ss = refs.map((a) => summ(pol(a, QR)));
      const sc = (a) => Math.max(...Ss.map((S) => dot2(pol(a, QR), S.kh) / RT2 + S.b));
      const tru = ANG.map((a) => Fc(pol(a, QR))), apx = ANG.map(sc), gaps = tru.map((v, i) => v - apx[i]);
      const series = [{ x: ANG, y: tru, tone: "take", width: 2.8, label: "true F_C", labelAt: 18 }, { x: ANG, y: apx, tone: "code", label: `max of ${R} tangents`, labelAt: 100 }];
      const p = massPlot(c, 0, 0, 640, 300, series);
      refs.forEach((a) => c.dot(p.X(a % 360), p.Y(Fc(pol(a, QR))), { r: 5, tone: "code" }));
      const mg = Math.max(...gaps), at = ANG[gaps.indexOf(mg)];
      if (s >= 1) c.line(p.X(at), p.Y(tru[gaps.indexOf(mg)]), p.X(at), p.Y(apx[gaps.indexOf(mg)]), { tone: "bad", width: 3 });
      c.text(20, 330, `R = ${R}: worst gap ${mg.toFixed(2)}, mean gap ${(gaps.reduce((a, b) => a + b, 0) / gaps.length).toFixed(2)}`, { size: 14, mono: true, weight: 700, tone: "bad" });
      if (s >= 4) c.text(620, 330, "paper: R = 16, shared", { size: 13, anchor: "end", tone: "take", weight: 700 });
    };
  };

  // merge: 16 keys in 4 children, one reference; parent from children equals direct summary
  const MK = (() => { const r = rng(11); return Array.from({ length: 16 }, (_, i) => pol(20 + i * 4 + r() * 30, 1.4 + r())); })();
  D["merge"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const qr = pol(50, QR), kids = [0, 1, 2, 3].map((g) => summ(qr, MK.slice(4 * g, 4 * g + 4)));
      for (let i = 0; i < 16; i++) rect(c, k, 20 + i * 38.5, 310, 32, 26, "paper", "soft");
      occupy(c, 20, 310, 616, 26);
      c.text(20, 302, "16 raw keys", { size: 12, tone: "muted" });
      const kb = kids.map((S, g) => c.box({ x: 20 + g * 154, y: 200, w: 140, h: 56, label: `child ${g + 1}`, sub: `k̂ [${f1(S.kh[0])}, ${f1(S.kh[1])}] b̂ ${f2(S.b)}`, size: 13, tone: "take", hl: s === 1 }));
      if (s >= 2) kids.forEach((S, g) => c.text(90 + g * 154, 186, `score ${f2(dot2(qr, S.kh) / RT2 + S.b)}`, { size: 12, anchor: "middle", mono: true, tone: "predict", weight: s === 2 ? 700 : 400 }));
      if (s >= 3) {
        const u = kids.map((S) => dot2(qr, S.kh) / RT2 + S.b), w = sm(u);
        const kh = [0, 1].map((d) => w.reduce((a, wi, g) => a + wi * kids[g].kh[d], 0)), F = lse(u), b = F - dot2(qr, kh) / RT2;
        const pb = c.box({ x: 20, y: 40, w: 300, h: 64, label: "parent from children", sub: `k̂ [${f2(kh[0])}, ${f2(kh[1])}]  b̂ ${f2(b)}`, tone: "code", hl: s === 3 });
        kb.forEach((x) => c.connect(x, pb, { tone: "muted" }));
        if (s >= 4) { const S = summ(qr, MK); c.box({ x: 340, y: 40, w: 280, h: 64, label: "direct from 16 raw keys", sub: `k̂ [${f2(S.kh[0])}, ${f2(S.kh[1])}]  b̂ ${f2(S.b)}`, tone: "code", hl: true }); c.text(480, 124, "identical", { size: 14, anchor: "middle", weight: 700, tone: "code" }); }
      }
    };
  };

  D["rope-fix"] = (fig, k) => {
    const c = k.canvas(W, H);
    const TH = 0.2;
    return (s) => {
      c.clear();
      const x0 = 30, cw = 36;
      for (let i = 0; i < 16; i++) {
        const cx = x0 + i * cw + 15, cy = 300, a = i * TH * (s >= 1 ? 1 : 0);
        c.arrow(cx - 11 * Math.cos(a), cy + 11 * Math.sin(a), cx + 11 * Math.cos(a), cy - 11 * Math.sin(a), { tone: "paper", width: 1.6, snap: false });
        c.text(cx, 336, String(i), { size: 11, anchor: "middle", tone: "muted", mono: true });
      }
      c.text(x0, 270, "keys at positions 0–15, each rotated by its position", { size: 12, tone: "muted" });
      const dial = (x, y, ang, tone, label, hl) => { c.box({ x: x - 70, y: y - 40, w: 140, h: 86, tone, hl, label: "" }); c.arrow(x - 22 * Math.cos(ang), y + 6 + 22 * Math.sin(ang), x + 22 * Math.cos(ang), y + 6 - 22 * Math.sin(ang), { tone, width: 2.4, snap: false }); c.text(x, y - 22, label, { size: 12, anchor: "middle", weight: 700, inBox: true }); };
      if (s >= 2) { dial(170, 190, 7 * TH, "take", "child 1 ref @ 7", s === 2); dial(450, 190, 15 * TH, "take", "child 2 ref @ 15", s === 2); }
      if (s >= 3) dial(310, 60, 15 * TH, "predict", "parent ref @ 15", s === 3);
      if (s >= 3) c.text(170, 252, "rotated 8 steps less than the parent", { size: 12, anchor: "middle", tone: "bad", weight: s === 3 ? 700 : 400 });
      if (s >= 4) {
        const r = rng(5), kc = [0.9 + r(), 0.3 + r()], qc = rot([1.4, 0.6], 7 * TH), qp = rot([1.4, 0.6], 15 * TH);
        const corr = dot2(kc, [qp[0] - qc[0], qp[1] - qc[1]]) / RT2;
        c.box({ x: 400, y: 24, w: 230, h: 76, label: `child 1 correction ${f2(corr)}`, sub: "⟨k̂_c, q̂_P − q̂_c⟩ / √d", tone: "predict", hl: s === 4, size: 13 });
      }
      if (s >= 5) c.box({ x: 10, y: 24, w: 210, h: 76, label: "result: a lower bound", sub: "not an exact tangent", tone: "bad", hl: true, size: 13 });
    };
  };

  D["update"] = (fig, k) => {
    const sl = k.slider({ label: "tokens decoded", min: 1, max: 80, step: 1, value: 3 });
    k.follow(sl, { 1: 3, 2: 8, 3: 64, 4: 80 });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const t = sl.value, cw = 7.5, x0 = 30;
      const rows = [["keys", 1, 230, "paper"], ["level 1 (every 4)", 4, 170, "take"], ["level 2 (every 16)", 16, 110, "take"], ["level 3 (every 64)", 64, 50, "predict"]];
      rows.forEach(([lab, span, y, tone], ri) => {
        const n = Math.floor(t / span);
        for (let i = 0; i < n; i++) rect(c, k, x0 + i * span * cw + 0.5, y, span * cw - 1.5, 34, tone, ri === 0 ? "soft" : "");
        if (ri === 0) { const b0 = Math.floor(t / 4) * 4; for (let i = b0; i < t; i++) rect(c, k, x0 + i * cw + 0.5, y, cw - 1.5, 34, "predict"); }
        c.text(x0, y - 6, lab, { size: 12, tone: "muted" });
      });
      occupy(c, x0, 44, 600, 230);
      c.text(x0, 300, `decoded ${t} tokens: ${Math.floor(t / 4)} level-1, ${Math.floor(t / 16)} level-2, ${Math.floor(t / 64)} level-3 nodes`, { size: 13, mono: true, weight: 700 });
      c.text(x0, 324, `buffer (amber): ${t % 4} key${t % 4 === 1 ? "" : "s"} waiting for a full chunk`, { size: 13, tone: "predict" });
      if (s >= 4) c.text(x0, 348, "upkeep ≈ 1% of latency or less (modeled, Eq. 43)", { size: 13, tone: "code", weight: 700 });
    };
  };

  // ---------------------------------------------------------- routing toy
  const NCH = 64;
  const toyMass = (task, seed = 21) => {
    const r = rng(seed), m = Array.from({ length: NCH }, () => (0.12 / NCH) * (0.4 + 1.2 * r()));
    for (let i = 60; i < 64; i++) m[i] += 0.3 * Math.exp((i - 63) / 1.2) / 2.0;
    if (task === "one needle") m[41] += 0.55;
    else [[9, 0.07], [22, 0.08], [30, 0.07], [41, 0.2], [50, 0.08], [57, 0.07]].forEach(([i, v]) => { m[i] += v * (0.85 + 0.3 * r()); });
    const tot = m.reduce((a, b) => a + b, 0); return m.map((v) => v / tot);
  };
  const route = (m, p) => {
    const mass = (lvl, i) => { const span = 4 ** (lvl - 1); let a = 0; for (let j = i * span; j < (i + 1) * span; j++) a += m[j]; return a; };
    const pick = (lvl, cands) => { const ms = cands.map((i) => mass(lvl, i)), tot = ms.reduce((a, b) => a + b, 0); const ord = cands.map((i, j) => [i, ms[j]]).sort((a, b) => b[1] - a[1]); const out = []; let cum = 0; for (const [i, v] of ord) { out.push(i); cum += v; if (cum >= p * tot - 1e-12) break; } return out; };
    const c3 = [0, 1, 2, 3], s3 = pick(3, c3);
    const c2 = s3.flatMap((i) => [0, 1, 2, 3].map((j) => 4 * i + j)), s2 = pick(2, c2);
    const c1 = s2.flatMap((i) => [0, 1, 2, 3].map((j) => 4 * i + j)), s1 = pick(1, c1);
    const got = s1.reduce((a, i) => a + m[i], 0);
    return { cand: { 3: c3, 2: c2, 1: c1 }, sel: { 3: s3, 2: s2, 1: s1 }, got };
  };
  D["routing"] = (fig, k) => {
    const tg = k.toggle({ label: "task", options: ["one needle", "many look-alikes"], value: "one needle" });
    const sl = k.slider({ label: "p", min: 0.5, max: 0.99, step: 0.01, value: 0.9, fmt: (v) => v.toFixed(2) });
    k.follow(tg, { 1: "one needle", 5: "many look-alikes" });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const m = toyMass(tg.value), R = route(m, sl.value), x0 = 70, Wd = 560;
      const shownLvl = s === 1 ? 3 : s === 2 ? 3 : s === 3 ? 2 : 1;
      [[3, 4, 40], [2, 16, 110], [1, 64, 180]].forEach(([lvl, n, y]) => {
        const cw = Wd / n;
        c.text(x0 - 8, y + 24, `level ${lvl}`, { size: 12, anchor: "end", tone: "muted", inBox: true });
        for (let i = 0; i < n; i++) {
          const cand = lvl >= shownLvl && R.cand[lvl].includes(i), sel = cand && R.sel[lvl].includes(i) && (lvl > shownLvl || s >= 2 || lvl < 3);
          const isSel = cand && R.sel[lvl].includes(i) && !(lvl === 3 && s === 1) && !(lvl === shownLvl && s === 3 && lvl === 2 && false);
          const tone = isSel ? "paper" : cand ? "muted" : "faint";
          c.add(k.h("rect", { x: x0 + i * cw + 1, y, width: cw - 2, height: 38, rx: 2, class: isSel ? "f-paper" : cand ? "f-muted soft s-muted" : "f-muted softer", "stroke-width": cand && !isSel ? 1 : undefined, "stroke-dasharray": !cand ? "2 2" : undefined }));
          if (lvl === 1 && (i === 41 || (tg.value !== "one needle" && [9, 22, 30, 50, 57].includes(i)))) c.dot(x0 + i * cw + cw / 2, y + 48, { r: 3, tone: i === 41 ? "code" : "bad", noOcc: true });
        }
        occupy(c, x0, y, Wd, 52);
      });
      c.text(x0, 250, "dark = scored and kept   grey = scored, pruned   dashed = never scored", { size: 11, tone: "muted", maxW: 560, lines: 1 });
      const scored = 4 + (shownLvl <= 2 ? R.cand[2].length : 0) + (shownLvl <= 1 ? R.cand[1].length : 0);
      if (s >= 4) {
        c.text(20, 286, `scored ${scored} nodes, read ${R.sel[1].length} chunks (${R.sel[1].length * 4}/256 keys)`, { size: 13, mono: true, weight: 700, tone: "paper" });
        c.text(20, 310, `true mass captured: ${(R.got * 100).toFixed(0)}%   needle chunk found: ${R.sel[1].includes(41) ? "yes" : "no"}`, { size: 13, mono: true, tone: R.sel[1].includes(41) ? "code" : "bad", weight: 700, maxW: 560, lines: 1 });
      } else c.text(x0, 286, `level ${shownLvl}: ${R.cand[shownLvl].length} candidates scored, ${s === 1 ? "?" : R.sel[shownLvl].length} kept`, { size: 13, mono: true, weight: 700, tone: "paper" });
      c.text(x0, 336, "green dot: the chunk holding “7392”" + (tg.value === "one needle" ? "" : "   red: look-alike needles"), { size: 12, tone: "muted", maxW: 560, lines: 1 });
    };
  };

  D["final-set"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const m = toyMass("one needle"), R = route(m, 0.9), x0 = 20, cw = 600 / 65;
      c.text(x0, 26, "256 cached keys as 64 chunks, plus the current chunk", { size: 12, tone: "muted" });
      for (let i = 0; i < 65; i++) {
        const sel = i < 64 && R.sel[1].includes(i), cur = i === 64;
        const tone = cur ? (s >= 3 ? "predict" : "muted") : sel ? "paper" : "muted";
        rect(c, k, x0 + i * cw + 0.5, 40, cw - 1.5, 40, tone, (sel && s >= 1) || (cur && s >= 3) ? "" : "softer");
      }
      if (s >= 2) rect(c, k, x0 + 0.5, 40, 2.2, 40, "bridge");
      occupy(c, x0, 40, 600, 40);
      if (s >= 2) c.label(x0 + 4, 104, "token 0: attention sink", { size: 12, tone: "bridge", weight: 700, anchor: "start" });
      if (s >= 3) c.label(600, 104, "current chunk", { size: 12, tone: "predict", weight: 700, anchor: "end" });
      const nKeys = 1 + R.sel[1].length * 4 + 3;
      if (s >= 4) c.box({ x: 20, y: 130, w: 600, h: 48, label: `exact softmax attention over ${nKeys} of 259 keys`, sub: "sink + selected chunks + current chunk", tone: "code", hl: s === 4 });
      if (s >= 5) {
        const heads = [12, 27, 50, 33].map((j, h) => { const m2 = toyMass("one needle", 21 + h); m2[j] += 0.15; const t = m2.reduce((a, b) => a + b, 0); return route(m2.map((v) => v / t), 0.9).sel[1]; });
        const uni = [...new Set(heads.flat())];
        [...heads, uni].forEach((sel, h) => {
          const y = 200 + h * 30;
          c.text(x0 + 96, y + 15, h < 4 ? `head ${h + 1}` : "loaded once", { size: 12, anchor: "end", tone: h < 4 ? "muted" : "take", weight: h < 4 ? 400 : 700, inBox: true });
          for (let i = 0; i < 64; i++) rect(c, k, x0 + 104 + i * 7.8, y, 6.6, 22, h < 4 ? "paper" : "take", sel.includes(i) ? "" : "softer");
          occupy(c, x0 + 104, y, 500, 22);
        });
      }
    };
  };

  D["train"] = (fig, k) => {
    const c = k.canvas(W, H);
    const P = [0.05, 0.62, 0.08, 0.25], Q = [0.09, 0.5, 0.13, 0.28];
    const mini = (x, y, v, tone) => { v.forEach((p, i) => rect(c, k, x + i * 26, y + 70 - p * 90, 20, p * 90, tone)); occupy(c, x, y, 104, 72); };
    return (s) => {
      c.clear();
      const fm = c.box({ x: 20, y: 20, w: 250, h: 70, label: "Qwen3.6-35B-A3B", sub: "frozen: 34.66B weights", tone: "muted", hl: s === 1 });
      c.text(145, 108, "🔒 no weight changes", { size: 12, anchor: "middle", tone: "muted" });
      if (s >= 2) { const t = c.box({ x: 20, y: 140, w: 250, h: 110, label: "", tone: "paper", hl: s === 2 }); c.text(30, 162, "true chunk shares p_ℓ", { size: 12, weight: 700, tone: "paper", inBox: true }); mini(80, 170, P, "paper"); c.connect(fm, t, { tone: "paper", label: "dense attention" }); }
      if (s >= 3) {
        const rq = c.box({ x: 370, y: 20, w: 250, h: 70, label: "reference queries", sub: "the only trainable part", tone: "take", hl: s === 3 });
        const pr = c.box({ x: 370, y: 140, w: 250, h: 110, label: "", tone: "take", hl: s === 3 }); c.text(380, 162, "predicted shares p̂_ℓ", { size: 12, weight: 700, tone: "take", inBox: true }); mini(430, 170, Q, "take");
        c.connect(rq, pr, { tone: "take", label: "softmax of s" });
      }
      if (s >= 4) { const kl = c.box({ x: 195, y: 280, w: 250, h: 50, label: "Σ_ℓ KL(p_ℓ ‖ p̂_ℓ)", sub: "every level, query, head, layer", tone: "bad", hl: s === 4, mono: true }); c.arrow(150, 252, 250, 278, { tone: "bad" }); c.arrow(490, 252, 400, 278, { tone: "bad" }); c.arrow(450, 278, 560, 92, { tone: "take", dash: true, label: "gradient" }); }
      if (s >= 5) c.box({ x: 282, y: 96, w: 82, h: 36, label: "81,920", size: 14, mono: true, tone: "code", hl: true });
    };
  };

  const TKL = { Qwen: { deep: [0.021, 0.097, 0.180, 0.253, 0.302, 0.319], wide: 0.242 }, Nemotron: { deep: [0.016, 0.069, 0.137, 0.192, 0.217, 0.221], wide: 0.179 } }; // Table III
  D["train-kl"] = (fig, k) => {
    const tg = k.toggle({ label: "model", options: ["Qwen", "Nemotron"], value: "Qwen" });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const d = TKL[tg.value], spans = [4, 16, 64, 256, 1024, 4096];
      const hl = (i) => (s === 1 && i === 0) || (s === 2 && i === 5) || (s === 3 && (i === 4 || i === 5)) || (s === 4 && i === 6);
      const rows = d.deep.map((v, i) => ({ label: `deep level ${i + 1} · ${comma(spans[i])} keys`, values: [v, null], hl: hl(i), dim: s <= 4 && !hl(i) && s !== 5 }));
      rows.push({ label: "wide level 1 · 256 keys", values: [null, d.wide], hl: hl(6), dim: s <= 4 && !hl(6) });
      hbars(c, k, { x: 10, y: 20, labelW: 220, barW: 330, rowH: 42, max: 0.35, tones: ["paper", "take"], fmt: (v) => v.toFixed(3), rows });
      c.text(10, 340, "final training KL per level (Table III)", { size: 12, tone: "muted" });
      if (s >= 5) c.text(630, 340, "aggregated differently: compare with care", { size: 12, anchor: "end", tone: "bad", weight: 700 });
    };
  };

  D["why-topp"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const rows = [["RULER", 2.3, 0.44, 80], ["SWE-bench Verified", 11.7, 5.0, 78], ["fiction books", 15.0, 7.4, 78]]; // §VI-A
      const X = hbars(c, k, { x: 10, y: 50, labelW: 150, barW: 380, rowH: 66, max: 16, tones: ["paper", "take"], fmt: (v) => v + "%",
        rows: rows.map(([l, a, b], i) => ({ label: l, values: [a, s >= 3 ? b : null], hl: (s === 1 && i === 0) || (s === 2 && i > 0), dim: (s === 1 && i > 0) })) });
      legend(c, 160, 18, [["chunks holding 90% of dense mass", "paper"]]); if (s >= 3) legend(c, 160, 40, [["chunks ZHA keeps (p = 0.9)", "take"]]);
      if (s >= 4) rows.forEach(([, , , m], i) => c.text(630, 50 + i * 66 + 50, `captures ${m}%`, { size: 12, anchor: "end", tone: "take", weight: 700 }));
      if (s >= 5) {
        c.line(X(5), 48, X(5), 250, { tone: "bad", dash: true, width: 2 });
        c.text(X(5), 274, "a fixed top-K budget (illustrative 5%)", { size: 12, anchor: "middle", tone: "bad", weight: 700 });
        c.text(X(5), 294, "too big for RULER, too small for books", { size: 12, anchor: "middle", tone: "bad" });
      }
    };
  };

  D["sublinear"] = (fig, k) => {
    const sl = k.slider({ label: "exponent α", min: 0.3, max: 1, step: 0.05, value: 0.6, fmt: (v) => v.toFixed(2) });
    const tg = k.toggle({ label: "show", options: ["per token", "whole sequence"], value: "per token" });
    k.follow(tg, { 1: "per token", 4: "whole sequence" });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const a = sl.value, xs = []; for (let e = 3; e <= 9.001; e += 0.1) xs.push(10 ** e);
      const whole = tg.value === "whole sequence";
      const dense = xs.map((t) => (whole ? t * t / 2 : t)), zha = xs.map((t) => (whole ? 30 * t ** (1 + a) : 30 * t ** a));
      const series = [{ x: xs, y: dense, tone: "bad", label: whole ? "dense ≈ T²/2" : "dense reads T", labelAt: 50 }];
      if (s >= 2) series.push({ x: xs, y: zha, tone: "code", label: whole ? `ZHA ≈ T^${(1 + a).toFixed(2)}` : `ZHA ≈ T^${a.toFixed(2)}`, labelAt: 58 });
      c.plot({ x: 0, y: 0, w: 640, h: 300, xlog: true, ylog: true, xmin: 1e3, xmax: 1e9, ymin: whole ? 1e4 : 1e2, ymax: whole ? 1e18 : 1e9, series,
        xlabel: "context length T", ylabel: whole ? "total work" : "keys touched per token", xFmt: big, yFmt: (v) => "1e" + Math.round(Math.log10(v)) });
      if (s >= 3) c.text(20, 330, "fixed depth: top nodes = T / C^L grow linearly → add a level as T grows", { size: 13, tone: "take", weight: 700 });
      if (s >= 4) c.text(20, 352, `at T = 1e9: dense/ZHA = ${big((1e18 / 2) / (30 * 1e9 ** (1 + a)))}×  (made-up constant 30)`, { size: 13, mono: true, tone: "code" });
    };
  };

  // ======================================================= DOES IT WORK?
  const M4 = ["muted", "paper", "take", "bad"];
  const LEG4 = [["dense", "muted"], ["ZHA deep C4 L6", "paper"], ["ZHA wide C256 L1", "take"], ["MSA", "bad"]];
  D["reasoning"] = (fig, k) => {
    const c = k.canvas(W, H);
    const R = [["AIME 2026", [93.1, 91.2, 90.8, 89.6]], ["SWE-bench Verified", [67.4, 67.4, 68.4, 65.6]], ["Terminal-Bench 2.1", [49.9, 46.7, 53.3, 45.4]], ["MMLU-Pro", [84.9, 85.3, 85.2, 85.4]], ["GPQA Diamond", [84.8, 85.0, 85.0, 83.3]]]; // Fig. 5(a)
    return (s) => {
      c.clear();
      legend(c, 10, 16, LEG4);
      const on = (i) => s === 1 || (s === 2 && i === 0) || (s === 3 && (i === 1 || i === 2)) || (s === 4 && i >= 3) || s === 5;
      hbars(c, k, { x: 10, y: 30, labelW: 150, barW: 400, rowH: 60, max: 100, tones: M4, fmt: (v) => v.toFixed(1) + "%",
        rows: R.map(([l, v], i) => ({ label: l, values: s === 5 ? v : v, hl: on(i) && s > 1, dim: !on(i) })) });
      if (s === 5) c.text(630, 352, "MSA (red) within ~4 points everywhere here", { size: 12, anchor: "end", tone: "bad", weight: 700 });
    };
  };

  D["retrieval"] = (fig, k) => {
    const c = k.canvas(W, H);
    const R = [["RULER-13 (256K)", [96.0, 93.3, 96.2, 77.1]], ["LongBench v2", [58.0, 63.4, 62.4, 50.7]]]; // Fig. 5(b)
    return (s) => {
      c.clear();
      legend(c, 10, 16, LEG4);
      hbars(c, k, { x: 10, y: 36, labelW: 130, barW: 420, rowH: 120, max: 100, tones: M4, fmt: (v) => v.toFixed(1) + "%",
        rows: R.map(([l, v], i) => ({ label: l, values: v, hl: (s <= 3 && i === 0) || (s >= 4 && i === 1), dim: (s <= 3 && i === 1) || (s >= 4 && i === 0) })) });
      if (s >= 2 && s <= 3) c.text(630, 300, "deep reads ≈ 2.8% of decode keys (Fig. 14)", { size: 12, anchor: "end", tone: "paper", weight: 700 });
      if (s === 3) c.text(630, 322, "MSA: 77.1%, 18.9 points below dense", { size: 12, anchor: "end", tone: "bad", weight: 700 });
      if (s >= 5) { c.text(630, 300, "deep 1.1% of keys vs MSA ≈ 1%: +12.7 points", { size: 13, anchor: "end", tone: "paper", weight: 700 }); }
      if (s === 4) c.text(630, 300, "both ZHA trees beat dense here", { size: 13, anchor: "end", tone: "code", weight: 700 });
    };
  };

  const KS = { // Fig. 14: decode keys attended (%), [p0.95, p0.9, p0.8]
    deep: { AIME: [5.7, 2.2, 0.52], "MMLU-Pro": [16, 8.6, 3.6], GPQA: [9, 3.9, 1.1], RULER: [2.8, 0.87, 0.13], LongBench: [1.1, 0.31, 0.074] },
    wide: { AIME: [47, 35, 23], "MMLU-Pro": [81, 72, 59], GPQA: [60, 48, 34], RULER: [42, 30, 18], LongBench: [21, 13, 6.6] },
    msa: { AIME: 8.6, "MMLU-Pro": 85, GPQA: 21, RULER: 0.76, LongBench: 1 },
  };
  D["key-share"] = (fig, k) => {
    const tg = k.toggle({ label: "p", options: ["0.95", "0.9", "0.8"], value: "0.95" });
    k.follow(tg, { 1: "0.95", 3: "0.8" });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const pi = ["0.95", "0.9", "0.8"].indexOf(tg.value), names = Object.keys(KS.msa);
      legend(c, 10, 16, [["ZHA deep", "paper"], ["ZHA wide", "take"], ["MSA (16 × 128 keys)", "bad"]]);
      const fmt = (v) => (v < 1 ? v.toString() : v.toFixed(v < 10 ? 1 : 0)) + "%";
      hbars(c, k, { x: 10, y: 30, labelW: 100, barW: 440, rowH: 60, max: 100, tones: ["paper", "take", "bad"], fmt,
        rows: names.map((n) => ({ label: n, values: [KS.deep[n][pi], KS.wide[n][pi], KS.msa[n]], hl: (s === 1 && (n === "AIME" || n === "LongBench")) || (s === 5 && (n === "MMLU-Pro" || n === "RULER")), dim: s === 5 && !(n === "MMLU-Pro" || n === "RULER") })) });
      if (s === 4) c.text(630, 352, `deep ÷ wide on AIME: ${(KS.deep.AIME[pi] / KS.wide.AIME[pi] * 100).toFixed(0)}% of wide's keys`, { size: 12, anchor: "end", tone: "paper", weight: 700 });
    };
  };

  D["geometry"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const xs = []; for (let e = -1.5; e <= 2.001; e += 0.05) xs.push(10 ** e);
      const curve = (knee, drop) => xs.map((x) => Math.max(60, 96 - drop * Math.max(0, Math.log10(knee) - Math.log10(x)) ** 1.6));
      const series = [];
      if (s >= 2) series.push({ x: xs, y: curve(8, 18), tone: "muted", label: "shallow, high compression", labelAt: 30 });
      if (s >= 3) series.push({ x: xs, y: curve(1.2, 12), tone: "paper", label: "deeper, same C^L", labelAt: 18 });
      series.push({ x: [0.03, 100], y: [96.0, 96.0], tone: "muted", dash: true });
      const p = c.plot({ x: 0, y: 0, w: 400, h: 360, xlog: true, xmin: 0.03, xmax: 100, ymin: 60, ymax: 100, series,
        xlabel: "decode keys attended (%)", ylabel: "RULER-13 at 256K (%)", xFmt: (v) => (v < 1 ? v.toString() : v.toFixed(0)), yFmt: (v) => v.toFixed(0) });
      c.label(p.X(0.08), p.Y(97.5), "dense 96.0%", { size: 12, tone: "muted", anchor: "start" });
      if (s >= 2) c.add(k.h("rect", { x: p.X(10), y: p.Y(100), width: p.X(30) - p.X(10), height: p.Y(60) - p.Y(100), class: "f-code softer" }));
      if (s === 2) c.label(p.X(17), p.Y(70), "10–30%: all fine", { size: 12, tone: "code", weight: 700 });
      if (s >= 4) { c.dot(p.X(0.38), p.Y(95.8), { r: 7, tone: "predict" }); c.label(p.X(0.38) + 10, p.Y(92), "R16 C4 L2: 95.8% at 0.38%", { size: 12, tone: "predict", weight: 700, anchor: "start" }); }
      if (s >= 5) {
        c.text(420, 40, "modeled speedup, p = 0.7", { size: 12, weight: 700 });
        [["R4 C16 L1", "96.4%", "1.93×"], ["R4 C64 L1", "95.5%", "2.15×"], ["R1 C8 L2", "92.7%", "2.28×"]].forEach(([g, a, v], i) =>
          c.box({ x: 420, y: 56 + i * 60, w: 210, h: 50, label: `${g}: ${v}`, sub: `RULER ${a}`, tone: i === 2 ? "code" : "take", hl: i === 2, size: 13 }));
      }
      if (s < 2) c.text(420, 60, "28 geometries", { size: 14, weight: 700 });
      if (s < 2) c.text(420, 84, "× p ∈ {0.7 … 0.99}", { size: 13, mono: true });
      if (s < 2) c.text(420, 106, "× 64K, 128K, 256K", { size: 13, mono: true });
      if (s >= 2 && s <= 3) c.text(420, 320, "curve shapes illustrative", { size: 12, tone: "muted" });
    };
  };

  const PGEO = { "C4 L6": [4, 6], "C16 L3": [16, 3], "C64 L2": [64, 2] };
  D["predict-acc"] = (fig, k) => {
    const tg = k.toggle({ label: "tree (top span 4,096)", options: Object.keys(PGEO), value: "C16 L3" });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const parts = [["A_dense", 1], ["× Π_ℓ", 4], ["exp[ −a", 2], ["(1−p)^b", 3], ["d_ℓ^h ]", 2]];
      let x = 12;
      parts.forEach(([t, st], i) => { const w = c.measure(t, 15, { mono: true }) + 26; c.box({ x, y: 20, w, h: 46, label: t, mono: true, size: 15, tone: st === s ? "predict" : "muted", hl: st === s }); x += w + 8; });
      c.box({ x: 12, y: 80, w: 330, h: 44, label: "d_ℓ = log(1 + C^ℓ / R^r)", mono: true, size: 15, tone: s === 2 ? "predict" : "muted", hl: s === 2 });
      const [C, L] = PGEO[tg.value];
      c.text(12, 156, `node span per level, ${tg.value} (log scale):`, { size: 12, tone: "muted", weight: 700 });
      for (let l = 1; l <= L; l++) {
        const y = 166 + (l - 1) * 28, w = (Math.log(C ** l) / Math.log(4096)) * 420;
        rect(c, k, 100, y, w, 22, "take", s === 2 ? "" : "soft");
        c.text(92, y + 16, `level ${l}`, { size: 12, anchor: "end", tone: "muted", inBox: true });
        c.text(106 + w, y + 16, comma(C ** l), { size: 11, mono: true, tone: "take", inBox: true });
      }
      occupy(c, 100, 166, 470, L * 28);
      if (s >= 5) c.box({ x: 380, y: 80, w: 248, h: 44, label: "held-out length: RMSE 1.44 pts", size: 13, tone: "code", hl: true });
    };
  };

  D["failures"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => board(c, [
      ["No positional encoding (Nemotron-3.5)", "RULER −25.3 deep, −10.2 wide", "bad"],
      ["Deep C4 L6 at p = 0.7", "AIME 44.0% vs 93.1% dense", "bad"],
      ["Models under 1B parameters", "retrieval struggled", "predict"],
      ["Contexts beyond 256K", "accuracy never measured", "predict"],
    ], s, 10, 86);
  };

  D["ref-structure"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const ox = 150, oy = 200;
      const angs = s === 1 ? Array(16).fill(0) : Array.from({ length: 16 }, (_, i) => -86 + (172 * i) / 15);
      angs.forEach((a, i) => { const v = pol(a + 90, 1); c.arrow(ox, oy, ox + v[0] * (110 + (i % 3) * 12), oy - v[1] * (110 + (i % 3) * 12), { tone: s === 1 ? "bad" : "take", width: 1.6, snap: false }); });
      c.text(ox, 340, s === 1 ? "collapsed: 16 copies of one direction" : "a cone: mean cosine 0.44", { size: 12, anchor: "middle", tone: s === 1 ? "bad" : "take", weight: 700 });
      occupy(c, 20, 60, 260, 150);
      if (s >= 3) {
        c.text(330, 30, "selection share by rank (illustrative)", { size: 12, tone: "muted", maxW: 300, lines: 1 });
        [["top level", (r) => Math.exp(-r / 2.2)], ["leaf level", (r) => Math.exp(-r / 12)]].forEach(([lab, f], li) => {
          const vals = Array.from({ length: 16 }, (_, r) => f(r)), tot = vals.reduce((a, b) => a + b, 0), y0 = 120 + li * 100;
          vals.forEach((v, r) => rect(c, k, 400 + r * 14, y0 - (v / tot) * 220, 11, (v / tot) * 220, li ? "paper" : "predict"));
          c.text(392, y0 - 4, lab, { size: 12, anchor: "end", tone: "muted", inBox: true });
          occupy(c, 400, y0 - 80, 230, 80);
        });
      }
      if (s >= 4) { c.box({ x: 330, y: 240, w: 300, h: 44, label: "leaf vs top ranking: ρ = 0.12", sub: "outliers: −0.35 and 0.86", tone: "predict", hl: s === 4, size: 13 }); }
      if (s >= 5) c.box({ x: 330, y: 296, w: 300, h: 50, label: "C4 L6 · C8 L4 · C16 L3 · C64 L2", sub: "learn matching references", tone: "code", hl: true, size: 13 });
    };
  };

  // ======================================================= HOW FAST?
  D["roofline"] = (fig, k) => {
    const c = k.canvas(W, H);
    const PEAK = 989, BW = 3.35; // H100 SXM BF16 dense TFLOP/s and TB/s (NVIDIA spec, found by us)
    return (s) => {
      c.clear();
      if (s <= 3) {
        const xs = []; for (let e = 0; e <= 3.001; e += 0.05) xs.push(10 ** e);
        const p = c.plot({ x: 0, y: 0, w: 640, h: 360, xlog: true, ylog: true, xmin: 1, xmax: 1000, ymin: 1, ymax: 2000, series: [{ x: xs, y: xs.map((i) => Math.min(PEAK, BW * i)), tone: "paper", width: 3 }],
          xlabel: "operations per byte read", ylabel: "attainable TFLOP/s", xFmt: big, yFmt: big });
        c.label(p.X(3), p.Y(25), "memory-bound: 3.35 TB/s × ops/byte", { size: 12, tone: "paper", anchor: "start" });
        c.label(p.X(330), p.Y(1300), "compute-bound: 989 TFLOP/s", { size: 12, tone: "paper", anchor: "middle" });
        if (s >= 2) { c.dot(p.X(8), p.Y(BW * 8), { r: 7, tone: "bad" }); c.label(p.X(8) + 10, p.Y(BW * 8) + 30, "decode attention: 8 ops/byte → 27 TFLOP/s", { size: 13, tone: "bad", weight: 700, anchor: "start" }); }
        if (s >= 3) { c.line(p.X(295), p.Y(1), p.X(295), p.Y(800), { tone: "predict", dash: true, width: 2 }); c.label(p.X(295), p.Y(3), "ridge ≈ 295", { size: 13, tone: "predict", weight: 700, anchor: "middle" }); }
      } else {
        c.text(20, 28, "an H100 has 132 SMs; a small tree level launches 20 tiles", { size: 13, weight: 700 });
        for (let i = 0; i < 132; i++) { const x = 20 + (i % 22) * 27, y = 50 + Math.floor(i / 22) * 40; rect(c, k, x, y, 22, 32, i < 20 ? "code" : "muted", i < 20 ? "" : "softer"); }
        occupy(c, 20, 50, 594, 240);
        c.text(20, 320, "20 busy, 112 idle: this wave is mostly waiting (Eq. 5)", { size: 14, tone: "bad", weight: 700 });
      }
    };
  };

  D["exponents"] = (fig, k) => {
    const sp = k.slider({ label: "p", min: 0.7, max: 0.95, step: 0.05, value: 0.8, fmt: (v) => v.toFixed(2) });
    const sL = k.slider({ label: "depth L", min: 2, max: 10, step: 1, value: 6 });
    const c = k.canvas(W, H);
    const F7 = [0.32, 0.39, 0.49, 0.6, 0.73, 0.89]; // ≈ Fig. 7(f), depth 6, levels 1..6, p = 0.8, read off by us
    return (s) => {
      c.clear();
      const p = sp.value, L = sL.value, bc = 0.3736 + 0.5536 * p, bl = 0.3429 + 0.4129 * p + (0.007697 + 0.03518 * p) * L; // Eq. 58
      const pl = c.plot({ x: 0, y: 0, w: 330, h: 330, xmin: 1, xmax: 6, ymin: 0, ymax: 1.1, series: s >= 2 ? [{ x: [1, 2, 3, 4, 5, 6], y: F7, tone: "paper", dots: true, label: "≈ C4 L6, p = 0.8", labelAt: 2 }, { x: [1, 6], y: [1, 1], tone: "bad", dash: true }] : [{ x: [1, 6], y: [1, 1], tone: "bad", dash: true }],
        xlabel: "tree level (1 = leaves)", ylabel: "growth exponent α_ℓ", xFmt: (v) => v.toFixed(0), yFmt: (v) => v.toFixed(1) });
      c.label(pl.X(1.5), pl.Y(1.05), "linear = 1", { size: 12, tone: "bad", anchor: "start" });
      if (s === 1) c.text(350, 60, "nodes kept ≈ c · T^α", { size: 14, mono: true, weight: 700 });
      if (s >= 3) {
        c.text(350, 50, "β = 0.3736 + 0.5536·p", { size: 12, mono: true });
        c.text(350, 76, `= ${bc.toFixed(3)}`, { size: 20, mono: true, weight: 700, tone: "take" });
        c.text(350, 102, `double T → top level × ${(2 ** bc).toFixed(2)}`, { size: 13, mono: true, tone: "take", maxW: 280, lines: 1 });
      }
      if (s >= 4) {
        c.text(350, 146, `β_lin(L = ${L}) adds (0.0077 + 0.0352p)·L`, { size: 12, mono: true, maxW: 280, lines: 1 });
        c.text(350, 172, `= ${bl.toFixed(3)}`, { size: 20, mono: true, weight: 700, tone: bl < 1 ? "predict" : "bad" });
        c.text(350, 198, bl < 1 ? "still sublinear" : "no longer sublinear", { size: 13, weight: 700, tone: bl < 1 ? "code" : "bad" });
      }
      if (s >= 5) c.box({ x: 350, y: 240, w: 278, h: 56, label: "fit on 20 measurements", sub: "5 depths × 4 values of p", tone: "bad", hl: true, size: 13 });
    };
  };

  // sketch through the paper's four reported numbers (§V-C): crossovers 48K and 0.48M, 373–417× and 52–58× at 1e9
  const tZ = (T) => 0.045 + 4.34e-6 * T ** 0.62, tD = (T) => 0.012 + 7e-7 * T, tM = (T) => 0.012 + 1e-7 * T;
  D["crossover"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const xs = []; for (let e = 3; e <= 9.001; e += 0.05) xs.push(10 ** e);
      const series = [{ x: xs, y: xs.map(tZ), tone: "code", label: "ZHA R1 C8, p = 0.75", labelAt: 110, width: 3 }];
      if (s >= 2) series.push({ x: xs, y: xs.map(tD), tone: "bad", dash: true, label: "dense", labelAt: 100 });
      if (s >= 3) series.push({ x: xs, y: xs.map(tM), tone: "predict", dash: true, label: "MSA", labelAt: 118 });
      const p = c.plot({ x: 0, y: 0, w: 640, h: 360, xlog: true, ylog: true, xmin: 1e3, xmax: 1e9, ymin: 0.01, ymax: 2000, series,
        xlabel: "context length (tokens)", ylabel: "decode latency per token, one layer (ms)", xFmt: big, yFmt: (v) => (v < 1 ? v.toString() : big(v)) });
      if (s >= 2) { c.dot(p.X(4.8e4), p.Y(tZ(4.8e4)), { r: 6, tone: "bad" }); c.label(p.X(4.8e4), p.Y(tZ(4.8e4)) - 26, "≈ 48K: passes dense", { size: 12, tone: "bad", weight: 700, anchor: "middle" }); }
      if (s >= 3) { c.dot(p.X(4.8e5), p.Y(tZ(4.8e5)), { r: 6, tone: "predict" }); c.label(p.X(4.8e5), p.Y(tZ(4.8e5)) + 30, "≈ 0.48M: passes MSA", { size: 12, tone: "predict", weight: 700, anchor: "middle" }); }
      if (s >= 4) c.label(p.X(3e7), p.Y(300), "at 1e9: 373–417× vs dense, 52–58× vs MSA", { size: 13, weight: 700, tone: "code", anchor: "middle" });
      if (s >= 5) c.label(p.X(3e3), p.Y(400), "MODELED, not measured", { size: 15, weight: 700, tone: "bad", anchor: "start" });
    };
  };

  D["p-depth"] = (fig, k) => {
    const sL = k.slider({ label: "depth L", min: 1, max: 20, step: 1, value: 6 });
    const sp = k.slider({ label: "p", min: 0.7, max: 0.99, step: 0.01, value: 0.9, fmt: (v) => v.toFixed(2) });
    k.follow(sL, { 1: 6, 2: 20 }); k.follow(sp, { 1: 0.9 });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const p = sp.value, L = sL.value, xs = Array.from({ length: 20 }, (_, i) => i + 1);
      const series = [{ x: xs, y: xs.map((l) => p ** l), tone: "bad", dots: true, label: "mass kept ≤ p^L", labelAt: 16 }];
      if (s >= 3) series.push({ x: xs, y: xs.map((l) => p ** (1 / l)), tone: "predict", dots: true, label: "per-level p for total p: p^(1/L)", labelAt: 9 });
      const pl = c.plot({ x: 0, y: 0, w: 640, h: 300, xmin: 1, xmax: 20, ymin: 0, ymax: 1.05, series, xlabel: "tree depth L", ylabel: "fraction", xFmt: (v) => v.toFixed(0), yFmt: (v) => v.toFixed(1) });
      c.dot(pl.X(L), pl.Y(p ** L), { r: 7, tone: "bad" });
      c.text(20, 330, `p = ${p.toFixed(2)}, L = ${L}: p^L = ${(p ** L).toFixed(2)}` + (s >= 3 ? `   per-level p^(1/L) = ${(p ** (1 / L)).toFixed(3)}` : ""), { size: 14, mono: true, weight: 700 });
      if (s >= 4) c.text(20, 352, "needed: a p schedule between the two curves, set by the data", { size: 13, tone: "take", weight: 700 });
    };
  };

  // ======================================================= YOUR MOVE
  D["reviewer"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => board(c, [
      ["Was latency measured?", "no: roofline model, no kernels", "bad"],
      ["Accuracy beyond 256K?", "untested", "bad"],
      ["Was the MSA baseline fair?", "authors' own 40B-token run", "predict"],
      ["Are the extrapolations solid?", "20 points, loose bounds", "predict"],
      ["🧠 Steelman", "frozen 35B kept its scores", "code"],
    ], s, 6, 69);
  };

  D["landscape"] = (fig, k) => {
    const c = k.canvas(W, H);
    const ITEMS = [
      ["Mamba, sliding window", "fixed state", 30, 250, "muted"],
      ["DSA, MSA", "top-K, full indexer", 300, 60, "bad"],
      ["NSA, Hu et al.", "one-level chunks", 300, 160, "predict"],
      ["HiP, PISA", "multi-level, log-linear", 30, 140, "take"],
      ["ZHA", "multi-level + top-p", 400, 260, "code"],
    ];
    return (s) => {
      c.clear();
      c.line(20, 340, 630, 340, { tone: "muted", width: 1 }); c.line(20, 340, 20, 20, { tone: "muted", width: 1 });
      c.text(630, 356, "→ keeps retrieval at long context (our sketch)", { size: 11, anchor: "end", tone: "muted", inBox: true });
      c.text(28, 32, "↑ search cost grows slower than T", { size: 11, tone: "muted", inBox: true });
      occupy(c, 20, 18, 230, 20); occupy(c, 300, 344, 330, 16);
      const pos = { 0: [30, 260], 1: [400, 250], 2: [250, 200], 3: [60, 80], 4: [410, 60] };
      ITEMS.forEach(([n, sub, , , tone], i) => { if (s < i + 1) return; const [x, y] = pos[i]; c.box({ x, y, w: 200, h: 56, label: n, sub, tone, hl: s === i + 1, size: 14 }); });
    };
  };

  D["verdict"] = (fig, k) => {
    const sh = k.slider({ label: "hours of audio", min: 0.5, max: 48, step: 0.5, value: 1, fmt: (v) => v + " h" });
    const tr = k.toggle({ label: "tokens per second", options: ["12.5", "25", "50"], value: "12.5" });
    k.follow(sh, { 1: 1, 2: 1, 3: 8, 4: 48 }); k.follow(tr, { 1: "12.5" });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const T = sh.value * 3600 * +tr.value, X = (t) => 20 + ((Math.log10(t) - 3) / 6) * 600, y = 120;
      [[1e3, 4.8e4, "dense fastest", "bad"], [4.8e4, 4.8e5, "ZHA > dense", "predict"], [4.8e5, 1e9, "ZHA fastest", "code"]].forEach(([a, b, lab, tone]) => {
        c.box({ x: X(a), y, w: X(b) - X(a), h: 50, label: lab, sub: tone === "predict" ? "MSA fastest" : undefined, size: 13, tone, hl: s >= 2 && T >= a && T < b });
      });
      [1e3, 1e4, 1e5, 1e6, 1e7, 1e8, 1e9].forEach((t) => c.text(X(t), y + 72, big(t), { size: 11, anchor: "middle", tone: "muted" }));
      c.line(X(2.56e5), y - 34, X(2.56e5), y - 4, { tone: "paper", width: 2 });
      c.text(X(2.56e5), y - 40, "accuracy tested up to 256K", { size: 11, anchor: "middle", tone: "paper" });
      c.dot(X(Math.min(T, 1e9)), y + 25, { r: 8, tone: "ink" });
      c.text(20, 46, `${sh.value} h × 3,600 s × ${tr.value} tokens/s = ${comma(T)} tokens`, { size: 15, mono: true, weight: 700, maxW: 600, lines: 1 });
      if (s >= 5) c.box({ x: 20, y: 230, w: 600, h: 90, label: "🧠 watch, don't build yet", sub: "untested on speech · no kernels · accuracy only to 256K", tone: "take", hl: true, size: 16 });
      else c.text(20, 260, "regimes are the paper's modeled crossovers (§V-C)", { size: 12, tone: "muted" });
    };
  };

  D["try-next"] = (fig, k) => {
    const c = k.canvas(W, H);
    const IDEAS = [["top-p growth on audio", 40, 220, "code"], ["tangent summaries in NumPy", 250, 160, "paper"], ["recency-biased tree", 380, 70, "take"], ["value summaries", 160, 50, "predict"]];
    return (s) => {
      c.clear();
      c.line(20, 340, 630, 340, { tone: "muted", width: 1 }); c.line(20, 340, 20, 20, { tone: "muted", width: 1 });
      c.text(630, 356, "effort →", { size: 11, anchor: "end", tone: "muted", inBox: true });
      c.text(28, 32, "↑ what you learn", { size: 11, tone: "muted", inBox: true });
      occupy(c, 20, 18, 130, 20); occupy(c, 560, 344, 70, 16);
      IDEAS.forEach(([n, x, y, tone], i) => { if (s < i + 1) return; c.box({ x, y, w: 210, h: 52, label: n, tone, hl: s === i + 1, size: 14 }); });
    };
  };
})();
