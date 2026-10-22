/* Drawings for the Phonon-40m lesson. One entry per data-draw name.
   Numbers: CALM paper arXiv:2509.06926v3 (// Table N), Phonon card and config (// card, // config),
   runtime and library code (// file). Everything else is illustrative, seeded or live arithmetic. */
(function () {
  window.RD = window.RD || {}; RD.drawings = RD.drawings || {};
  const D = RD.drawings;
  const W = 640, H = 360;

  const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const gauss = (r) => { const u = Math.max(1e-9, r()), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const fmtInt = (v) => Math.round(v).toLocaleString("en-US");

  const hbars = (c, o) => {
    const x0 = o.x + o.labelW, bw = o.w - o.labelW - 70, X = (v) => x0 + (v / o.max) * bw;
    o.rows.forEach((r, i) => {
      const y = o.y + i * o.rowH;
      c.text(x0 - 8, y + o.rowH / 2 + 4, r.label, { anchor: "end", size: 13, weight: r.hl ? 700 : 400, dim: r.dim, inBox: true, maxW: o.labelW - 10, lines: 1 });
      if (!Number.isFinite(r.v)) { c.text(x0 + 4, y + o.rowH / 2 + 4, r.na || "—", { size: 12, tone: "muted", inBox: true, dim: r.dim }); return; }
      c.box({ x: x0, y: y + 5, w: Math.max(3, X(r.v) - x0), h: o.rowH - 10, tone: r.tone || "paper", solid: true, hl: r.hl, dim: r.dim, r: 3 });
      c.text(X(r.v) + 6, y + o.rowH / 2 + 4, (o.fmt || ((v) => v.toFixed(2)))(r.v), { size: 13, mono: true, tone: r.tone || "paper", dim: r.dim, inBox: true });
    });
    c.occupy({ x: o.x, y: o.y, w: o.w, h: o.rows.length * o.rowH });
    return X;
  };

  const board = (c, rows, s, o = {}) => {
    const top = o.top || 12, rh = o.rh || 56, qW = o.qW || 230;
    rows.forEach(([q, a, tone], i) => {
      if (s < i + 1) return;
      const y = top + i * rh, now = s === i + 1;
      const qb = c.box({ x: 16, y, w: qW, h: rh - 12, label: q, size: 14, tone: "muted", hl: now, mono: o.monoQ });
      const ab = c.box({ x: qW + 40, y, w: W - qW - 56, h: rh - 12, label: a, size: 13, tone, hl: now });
      if (now) c.connect(qb, ab, { tone });
    });
  };

  // a strip of small cells (raw rects); vals in [0,1]
  const cells = (c, k, x, y, vals, cw, ch, tone) => {
    vals.forEach((v, i) => c.add(k.h("rect", { x: x + i * cw, y, width: cw - 1, height: ch, rx: 1,
      class: `f-${tone} ${v > 0.66 ? "" : v > 0.33 ? "soft" : "softer"} s-${tone}`, "stroke-width": 0.4 })));
    c.occupy({ x, y, w: vals.length * cw, h: ch });
  };

  // ------------------------------------------------------- toolbox
  D["latents"] = (fig, k) => {
    const m = k.toggle({ label: "metric", options: ["quality", "ABX"], value: "quality" });
    k.follow(m, { 1: "quality", 5: "ABX" });
    const c = k.canvas(W, H);
    const r = rng(3), v32 = Array.from({ length: 32 }, () => r());
    return (s) => {
      c.clear();
      c.text(16, 24, "one 80 ms frame", { size: 14, weight: 700 });
      for (let q = 0; q < 8; q++) c.box({ x: 16, y: 36 + q * 24, w: 150, h: 20, label: `codebook ${q + 1}`, size: 11, tone: "take", hl: s === 1 || s === 2, dim: s >= 3 && s < 5 });
      if (s >= 2) c.text(180, 136, "more codebooks = more bits = more compute", { size: 12, tone: "take", maxW: 150, lines: 3 });
      if (s >= 3) { c.text(350, 24, "VAE: 32 real numbers", { size: 14, weight: 700, tone: "paper" }); cells(c, k, 350, 40, v32, 8.5, 60, "paper"); }
      if (s >= 4) {
        const q = m.value === "quality";
        hbars(c, { x: 16, y: 250, w: 608, labelW: 160, rowH: 40, max: q ? 80 : 12, fmt: (v) => (q ? v.toFixed(1) : `${v}%`),
          rows: [{ label: "Mimi, 8 codebooks", v: q ? 57.7 : 9.4, tone: "take" }, { label: "VAE, 32 dims", v: q ? 66.0 : 8.1, tone: "paper", hl: true }] });   // Table 1
        c.text(16, 240, q ? "acoustic quality (MUSHRA, higher better)" : "ABX phone error (lower better)", { size: 12, tone: "muted" });
      }
    };
  };

  D["codec"] = (fig, k) => {
    const sec = k.slider({ label: "speech", min: 1, max: 10, step: 0.5, value: 3, fmt: (v) => `${v} s` });
    k.follow(sec, { 5: 3 });
    const c = k.canvas(W, H);
    const r = rng(8), wav = Array.from({ length: 300 }, (_, i) => Math.sin(i / 2.1) * (0.3 + 0.7 * r()) * (0.6 + 0.4 * Math.sin(i / 40)));
    return (s) => {
      c.clear();
      const frames = Math.ceil(sec.value * 12.5);
      c.text(16, 22, "320 ms at 24 kHz = 4 frames of 1,920 samples", { size: 13, weight: 700, tone: "bridge" });
      c.path("M" + wav.map((v, i) => `${(16 + i * 2).toFixed(1)},${(70 - v * 26).toFixed(1)}`).join(" L"), { tone: "bridge", width: 1.2 });
      c.occupy({ x: 16, y: 40, w: 600, h: 60 });
      for (let f = 0; f <= 4; f++) c.line(16 + f * 150, 100, 16 + f * 150, 112, { tone: "take", width: 2 });
      if (s >= 2) for (let f = 0; f < 4; f++) { const rr = rng(f + 10); cells(c, k, 22 + f * 150, 124, Array.from({ length: 32 }, () => rr()), 4.3, 40, "paper"); }
      if (s >= 2) c.text(16, 186, "each frame: 32 numbers", { size: 12, tone: "paper", weight: 600 });
      if (s >= 3) c.box({ x: 16, y: 200, w: 296, h: 50, label: "KL → near-Gaussian latents", size: 13, tone: "take", hl: s === 3 });
      if (s >= 4) c.box({ x: 328, y: 200, w: 296, h: 50, label: "WavLM-distilled: knows phones", size: 13, tone: "take", hl: s === 4 });
      if (s >= 5) c.box({ x: 16, y: 270, w: 608, h: 64, label: `${sec.value} s → ${frames} frames × 32 = ${fmtInt(frames * 32)} numbers`, mono: true, size: 15, tone: "predict", hl: true });
    };
  };

  D["ar-vector"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const past = [0, 1, 2, 3].map((i) => c.box({ x: 16 + i * 70, y: 250, w: 60, h: 44, label: `x${i + 1}`, mono: true, tone: "paper" }));
      const bb = c.box({ x: 16, y: 150, w: 270, h: 60, label: "causal backbone", tone: "take", hl: s === 1 });
      past.forEach((p) => c.connect(p, bb, { tone: "muted" }));
      const z = c.box({ x: 330, y: 150, w: 90, h: 60, label: "z", mono: true, size: 20, tone: "take", hl: s === 1 });
      c.connect(bb, z, { tone: "take" });
      if (s >= 2) c.box({ x: 330, y: 40, w: 290, h: 60, label: "softmax over a vocabulary?", sub: "no vocabulary for real numbers", tone: "bad", hl: s === 2, dashed: true });
      if (s >= 3) {
        const hd = c.box({ x: 460, y: 150, w: 160, h: 60, label: "small head", sub: "samples p(x | z)", tone: "predict", hl: s === 3 });
        c.connect(z, hd, { tone: "predict" });
        c.box({ x: 460, y: 250, w: 160, h: 44, label: "x5: 32 numbers", tone: "code" });
      }
      if (s === 4) c.box({ x: 330, y: 300, w: 290, h: 46, label: "diffusion head: many steps per frame", size: 13, tone: "bad", hl: s === 4 });
      if (s >= 5) c.box({ x: 330, y: 300, w: 290, h: 46, label: "CALM head: one step", size: 14, tone: "code", hl: true });
    };
  };

  D["flow"] = (fig, k) => {
    const n = k.slider({ label: "steps", min: 1, max: 20, step: 1, value: 20, fmt: (v) => `${v}` });
    k.follow(n, { 3: 20, 4: 2 });
    const c = k.canvas(W, H);
    // a curved velocity field: data on a ring of radius 1.8
    const r = rng(12), N = 18, x0 = Array.from({ length: N }, () => [gauss(r) * 0.6, gauss(r) * 0.6]);
    const target = (p) => { const a = Math.atan2(p[1], p[0]); return [1.8 * Math.cos(a), 1.8 * Math.sin(a)]; };
    return (s) => {
      c.clear();
      const p = c.plot({ series: [], xmin: -2.6, xmax: 2.6, ymin: -2.3, ymax: 2.3, w: 420, h: 356, y: 2, ml: 30, mb: 24, xFmt: () => "", yFmt: () => "" });
      const steps = n.value;
      x0.forEach((a) => {
        const b = target(a);
        if (s === 1) c.dot(p.X(a[0]), p.Y(a[1]), { r: 4, tone: "muted", noOcc: true });
        if (s === 2) { const m = [0.5 * a[0] + 0.5 * b[0], 0.5 * a[1] + 0.5 * b[1]]; c.dot(p.X(m[0]), p.Y(m[1]), { r: 4, tone: "paper", noOcc: true }); c.line(p.X(a[0]), p.Y(a[1]), p.X(b[0]), p.Y(b[1]), { tone: "muted", dash: true, width: 0.7 }); }
        if (s >= 3) {
          // Euler on a rotating field: v = (target − x) + small swirl; fewer steps overshoot
          let x = a.slice(); const pts = [x.slice()];
          for (let i = 0; i < steps; i++) { const tg = target(x), v = [tg[0] - x[0] - 0.9 * x[1], tg[1] - x[1] + 0.9 * x[0]]; x = [x[0] + v[0] * (1 / steps) * 2.2, x[1] + v[1] * (1 / steps) * 2.2]; pts.push(x.slice()); }
          c.path("M" + pts.map((q) => `${p.X(q[0]).toFixed(1)},${p.Y(q[1]).toFixed(1)}`).join(" L"), { tone: "paper", width: 0.9 });
          c.dot(p.X(x[0]), p.Y(x[1]), { r: 4, tone: steps >= 10 ? "code" : "bad", noOcc: true });
        }
      });
      c.box({ x: 430, y: 20, w: 196, h: 56, label: ["start: noise", "blend noise + data", "follow velocity", "few steps miss"][Math.min(s, 4) - 1], tone: s === 4 ? "bad" : "paper", hl: true });
      if (s >= 4) {
        c.box({ x: 430, y: 96, w: 196, h: 50, label: "4 steps: FAD 28.8", sub: "flow head (Table 9)", tone: "bad", hl: true });
        c.box({ x: 430, y: 160, w: 196, h: 50, label: "100 steps: FAD 0.64", sub: "flow head (Table 9)", tone: "code" });
      }
      c.text(430, 340, "toy 2-D field", { size: 11, tone: "muted" });
    };
  };

  D["one-step"] = (fig, k) => {
    const c = k.canvas(W, H);
    // Table 9 (music): steps, RTF, FAD consistency
    const T9 = [[1, 0.56, 0.83], [4, 0.68, 0.71], [10, 0.92, 0.73], [25, 1.54, 0.96], [50, 2.56, 1.46], [100, 4.55, 2.05]];
    return (s) => {
      c.clear();
      if (s <= 3) {
        const nz = c.box({ x: 16, y: 120, w: 150, h: 60, label: "noise", sub: "t = 1", tone: "muted", hl: s === 3 });
        const mid = c.box({ x: 245, y: 120, w: 150, h: 60, label: "x at time s", sub: "any s < t", tone: "take", hl: s === 2, dim: s < 2 });
        const dt = c.box({ x: 474, y: 120, w: 150, h: 60, label: "clean frame", sub: "s = 0", tone: "code", hl: s >= 1 });
        if (s === 1) c.connect(nz, dt, { tone: "predict", label: "one jump", route: "elbow" });
        if (s === 2) { c.connect(nz, mid, { tone: "take", label: "f(x, t, s)" }); c.connect(mid, dt, { tone: "take" }); }
        if (s === 3) c.connect(nz, dt, { tone: "code", label: "f(ε, 1, 0)", route: "elbow" });
        c.box({ x: 16, y: 230, w: 608, h: 56, label: "f(x, t, s) = x + (s − t) · F(x, t, s)", mono: true, size: 15, tone: "take", hl: s === 2 });
        return;
      }
      const p = c.plot({ series: [{ x: T9.map((t) => t[0]), y: T9.map((t) => t[1]), tone: "predict", dots: true, label: "RTF", labelAt: 5 }], xlog: true, xmin: 1, xmax: 100, ymin: 0, ymax: 5, w: 400, h: 356, y: 2,
        xlabel: "steps per frame", ylabel: "real-time factor (music, Table 9)" });
      c.line(p.X(1), p.Y(1), p.X(100), p.Y(1), { tone: "bad", dash: true });
      c.dot(p.X(1), p.Y(0.56), { r: 7, tone: "code" });
      c.box({ x: 420, y: 20, w: 206, h: 64, label: "1 step: FAD 0.83", sub: "16.7 s for 30 s, RTF 0.56", tone: "code", hl: s === 4 });
      if (s >= 5) c.box({ x: 420, y: 100, w: 206, h: 64, label: "Phonon: 1 LSD step", sub: "lsd_decode_steps = 1", tone: "predict", hl: true });
    };
  };

  // ------------------------------------------------------- recipe
  D["lsd-train"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const x0 = 16, w = 608;
      c.text(16, 22, "one training batch", { size: 13, weight: 700 });
      c.box({ x: x0, y: 32, w: w * 0.75, h: 44, label: "flow matching: 75%", tone: "paper", hl: s === 2 || s === 1 });
      c.box({ x: x0 + w * 0.75, y: 32, w: w * 0.25, h: 44, label: "LSD: 25%", tone: "take", hl: s === 3 || s === 1 });
      if (s >= 2) c.box({ x: 16, y: 96, w: 296, h: 56, label: "match velocity at t", sub: "Eq. 5", tone: "paper", hl: s === 2 });
      if (s >= 3) c.box({ x: 328, y: 96, w: 296, h: 56, label: "∂f/∂s = slope at landing", sub: "Eq. 6", tone: "take", hl: s === 3 });
      if (s >= 4) {
        const xs = [], ys = []; for (let i = 1; i < 100; i++) { const t = i / 100, l = Math.log(t / (1 - t)); xs.push(t); ys.push(Math.exp(-((l - 0.4) ** 2) / 2) / (Math.sqrt(2 * Math.PI) * t * (1 - t))); }
        c.plot({ series: [{ x: xs, y: ys, tone: "predict" }], x: 16, y: 166, w: 300, h: 180, xmin: 0, xmax: 1, ymin: 0, ymax: 3, xlabel: "t = sigmoid(N(0.4, 1))", yFmt: () => "" });
      }
      if (s >= 5) {
        const z = c.box({ x: 360, y: 180, w: 100, h: 56, label: "z", mono: true, size: 18, tone: "take", hl: true });
        for (let i = 0; i < 8; i++) c.box({ x: 480 + (i % 4) * 36, y: 172 + Math.floor(i / 4) * 40, w: 30, h: 32, label: "ε", size: 12, tone: "predict" });
        c.text(360, 280, "one z, 8 noise draws", { size: 12, tone: "predict", weight: 600 });
      }
    };
  };

  D["temperature"] = (fig, k) => {
    const tau = k.slider({ label: "temperature τ", min: 0.1, max: 1, step: 0.1, value: 1, fmt: (v) => v.toFixed(1) });
    k.follow(tau, { 1: 1, 2: 1, 4: 0.3 });
    const read = k.readout("");
    const c = k.canvas(W, H);
    const r = rng(21), pts = Array.from({ length: 160 }, () => [gauss(r), gauss(r)]);
    return (s) => {
      c.clear();
      const sd = Math.sqrt(tau.value);
      read.textContent = `spread √${tau.value.toFixed(1)} = ${sd.toFixed(2)}`;
      const p = c.plot({ series: [], xmin: -3.2, xmax: 3.2, ymin: -3.2, ymax: 3.2, w: 380, h: 356, y: 2, ml: 30, mb: 24, xFmt: () => "", yFmt: () => "" });
      if (s === 1) {
        c.box({ x: p.X(-2.6), y: p.Y(2.6), w: 300, h: 50, label: "text: divide logits by τ", tone: "muted" });
      } else pts.forEach(([a, b]) => c.dot(p.X(a * sd), p.Y(b * sd), { r: 3, tone: "predict", noOcc: true }));
      const ring = (rad, tone) => c.path(`M${p.X(rad)},${p.Y(0)} A${p.X(rad) - p.X(0)},${p.Y(0) - p.Y(rad)} 0 1 1 ${p.X(rad) - 0.01},${p.Y(0)}`, { tone, dash: true });
      if (s >= 2) ring(2 * sd, "predict");
      c.box({ x: 400, y: 20, w: 226, h: 60, label: `τ = ${tau.value.toFixed(1)}`, sub: `noise std ${sd.toFixed(2)}`, mono: true, tone: "predict", hl: s === 2 || s === 4 });
      if (s >= 3) c.box({ x: 400, y: 96, w: 226, h: 56, label: "narrow = safer, less varied", size: 13, tone: "take", hl: s === 3 });
      if (s >= 4) c.box({ x: 400, y: 168, w: 226, h: 56, label: "Phonon runtime: τ = 0.3", sub: "std ≈ 0.55", tone: "code", hl: true });
    };
  };

  D["latent-cfg"] = (fig, k) => {
    const a = k.slider({ label: "α", min: 0, max: 3, step: 0.25, value: 1, fmt: (v) => v.toFixed(2) });
    k.follow(a, { 1: 1, 2: 1.5 });
    const c = k.canvas(W, H);
    const Z0 = [1.2, 0.4], ZC = [1.6, 1.3];   // made up
    return (s) => {
      c.clear();
      const g = [Z0[0] + a.value * (ZC[0] - Z0[0]), Z0[1] + a.value * (ZC[1] - Z0[1])];
      const p = c.plot({ series: [], xmin: -0.3, xmax: 3.5, ymin: -0.5, ymax: 4.5, w: 380, h: 356, y: 2, ml: 30, mb: 24, xFmt: () => "", yFmt: () => "" });
      c.arrow(p.X(0), p.Y(0), p.X(Z0[0]), p.Y(Z0[1]), { tone: "muted", width: 2.4, snap: false });
      c.label(p.X(Z0[0]) + 6, p.Y(Z0[1]) + 14, "Z∅: no text", { size: 12, tone: "muted", weight: 600 });
      c.arrow(p.X(0), p.Y(0), p.X(ZC[0]), p.Y(ZC[1]), { tone: "paper", width: 2.4, snap: false });
      c.label(p.X(ZC[0]) + 6, p.Y(ZC[1]), "Z_C: with text", { size: 12, tone: "paper", weight: 600 });
      if (s >= 2) { c.arrow(p.X(0), p.Y(0), p.X(g[0]), p.Y(g[1]), { tone: "take", width: 3, snap: false }); c.label(p.X(g[0]) + 6, p.Y(g[1]), `α = ${a.value}`, { size: 12, tone: "take", weight: 700 }); }
      c.box({ x: 400, y: 20, w: 226, h: 56, label: s === 1 ? "one step: no path to bend" : "Z∅ + α(Z_C − Z∅)", mono: s >= 2, tone: s === 1 ? "bad" : "take", hl: true });
      if (s >= 3) hbars(c, { x: 400, y: 100, w: 226, labelW: 90, rowH: 38, max: 3, fmt: (v) => v.toFixed(2),
        rows: [{ label: "no CFG", v: 2.39, tone: "muted" }, { label: "α = 1.5", v: 1.81, tone: "code", hl: true }] });   // App. E.5 WER
      if (s >= 3) c.text(400, 194, "WER (App. E.5)", { size: 11, tone: "muted" });
      if (s >= 4) hbars(c, { x: 400, y: 214, w: 226, labelW: 90, rowH: 38, max: 70, fmt: (v) => v.toFixed(1),
        rows: [{ label: "text only", v: 61.1, tone: "code" }, { label: "+ voice", v: 56.2, tone: "bad", hl: true }] });   // App. E.5 MUSHRA
      if (s >= 4) c.text(400, 308, "MUSHRA (App. E.5)", { size: 11, tone: "muted" });
    };
  };

  D["distill"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const t1 = c.box({ x: 16, y: 30, w: 200, h: 50, label: "teacher, with text", sub: "24 layers", tone: "take", hl: s === 1 });
      const t2 = c.box({ x: 16, y: 100, w: 200, h: 50, label: "teacher, no text", sub: "24 layers", tone: "muted", hl: s === 1 });
      const g = c.box({ x: 260, y: 64, w: 150, h: 50, label: "guided Z", sub: "α = 1.5", tone: "take", hl: s === 2 });
      c.connect(t1, g, { tone: "take" }); c.connect(t2, g, { tone: "muted" });
      if (s >= 2) {
        const st = c.box({ x: 260, y: 190, w: 150, h: 60, label: "student", sub: s >= 3 ? "6 layers" : "", tone: "code", hl: s === 2 || s === 3 });
        c.connect(st, g, { tone: "predict", label: "L2" });
        if (s >= 4) {
          const hd = c.box({ x: 460, y: 190, w: 164, h: 60, label: "same head", sub: "copied", tone: "predict", hl: s === 4 });
          c.connect(st, hd, { tone: "predict" });
        }
      }
      if (s >= 5) c.box({ x: 16, y: 280, w: 608, h: 50, label: "Phonon runtime: guidance off, one backbone pass", size: 14, tone: "code", hl: true });
    };
  };

  // ------------------------------------------------------- Phonon's machine
  D["machine"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const tx = c.box({ x: 16, y: 250, w: 190, h: 54, label: "text tokens", sub: "4,001 pieces", tone: "paper", hl: s === 1 });
      const vc = c.box({ x: 222, y: 250, w: 190, h: 54, label: "voice frames", sub: "512 wide", tone: "bridge", hl: s === 2, dim: s < 2 });
      const bb = c.box({ x: 16, y: 150, w: 396, h: 64, label: "backbone: 9 layers × 512", sub: "8 heads · 1 step per 80 ms", tone: "take", hl: s === 3, dim: s < 3 });
      c.connect(tx, bb, { tone: "paper", dim: s < 3 }); c.connect(vc, bb, { tone: "bridge", dim: s < 3 });
      const eo = c.box({ x: 450, y: 250, w: 174, h: 54, label: "end logit", sub: "> +4.0 stops", tone: "bad", hl: s === 4, dim: s < 4 });
      const hd = c.box({ x: 450, y: 150, w: 174, h: 64, label: "LSD head", sub: "6 layers → 32 numbers", tone: "predict", hl: s === 4, dim: s < 4 });
      c.connect(bb, hd, { tone: "take", dim: s < 4 }); c.connect(bb, eo, { tone: "muted", dim: s < 4, route: "elbow" });
      const mm = c.box({ x: 450, y: 40, w: 174, h: 64, label: "Mimi decoder", sub: "→ 24 kHz", tone: "bridge", hl: s === 5, dim: s < 5 });
      c.connect(hd, mm, { tone: "bridge", dim: s < 5 });
      c.box({ x: 16, y: 40, w: 396, h: 64, label: "\"It sold for 3 point 2 million pounds.\"", size: 14, tone: "paper", hl: s === 1 });
    };
  };

  D["params"] = (fig, k) => {
    const c = k.canvas(W, H);
    const bb = 9 * (4 * 512 * 512 + 2 * 512 * 2048), te = 4001 * 512, rest = 40e6 - bb - te;   // config; card 40M
    return (s) => {
      c.clear();
      const rows = [{ label: "backbone, 9 layers", v: bb / 1e6, tone: "take", hl: s === 1 }];
      if (s >= 2) rows.push({ label: "text table", v: te / 1e6, tone: "paper", hl: s === 2 });
      if (s >= 3) rows.push({ label: "heads + projections", v: rest / 1e6, tone: "predict", hl: s === 3 });
      if (s >= 4) rows.push({ label: "codec etc. (file total − 40M)", v: 10.5, tone: "muted", hl: s === 4 });
      hbars(c, { x: 16, y: 30, w: 608, labelW: 220, rowH: 52, max: 30, fmt: (v) => `${v.toFixed(1)}M`, rows });
      c.box({ x: 16, y: 270, w: 608, h: 60, label: s >= 4 ? "card: 40M without codec · file: 50.5M" : "per layer: 4·512² + 2·512·2,048 = 3.15M", mono: true, size: 14, tone: "muted", hl: true });
    };
  };

  D["normalize"] = (fig, k) => {
    const ex = k.toggle({ label: "input", options: ["money", "date"], value: "money" });
    k.follow(ex, { 1: "money", 4: "date" });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const money = ex.value === "money";
      const a = c.box({ x: 16, y: 40, w: 608, h: 60, label: money ? "It sold for £3.2m." : "It's 1:06pm on 20/12/2015.", mono: true, size: 16, tone: "muted", hl: s === 1 || s === 4 });
      if (s >= 2) {
        const b = c.box({ x: 16, y: 150, w: 608, h: 60, label: money ? "It sold for 3 point 2 million pounds." : "It's 1:06pm on 20/12/2015.", mono: true, size: 15, tone: money ? "code" : "predict", hl: s === 2 || s === 4 });
        c.connect(a, b, { tone: "muted", label: "lang = en" });
      }
      if (s >= 3) c.box({ x: 16, y: 250, w: 296, h: 64, label: "\"@\": at (en) · ät (de)", sub: "so lang has no default", size: 14, tone: "bad", hl: s === 3 });
      if (s >= 4) c.box({ x: 328, y: 250, w: 296, h: 64, label: "times, dates: opt-in", sub: "unchanged by default", tone: "predict", hl: true });
    };
  };

  D["prompt"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const items = [];
      for (let i = 0; i < 6; i++) items.push({ t: "audio_prompt", tone: "bridge", hl: s === 1, dim: s > 1 && s < 4 });
      items.push({ t: "…", tone: "bridge", dim: s > 1 && s < 4 });
      if (s >= 2) ["It", "sold", "for", "3", "point", "2", "million", "pounds", "."].forEach((t) => items.push({ t, tone: "paper", hl: s === 2 }));
      if (s >= 3) items.push({ t: "<|audio_bos|>", tone: "predict", hl: s === 3 });
      c.chips({ x: 16, y: 30, items, maxW: 608, size: 13 });
      if (s >= 4) c.box({ x: 16, y: 250, w: 608, h: 64, label: "voice keys and values: computed once, cached", tone: "bridge", hl: true });
      c.text(16, 340, "token pieces shown as words for readability", { size: 11, tone: "muted" });
    };
  };

  D["voices"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      for (let i = 0; i < 20; i++) c.box({ x: 16 + (i % 10) * 40, y: 30 + Math.floor(i / 10) * 40, w: 34, h: 34, tone: "bridge", hl: s === 1 && i === 3 });
      c.text(16, 120, "~100 catalogue voices (20 drawn)", { size: 12, tone: "bridge", weight: 600 });
      if (s >= 2) c.box({ x: 440, y: 30, w: 184, h: 64, label: "speaker encoder", sub: "8-layer Mimi variant", tone: "take", hl: s === 2 });
      if (s >= 3) c.box({ x: 16, y: 150, w: 608, h: 56, label: "Transformers: speaker encoder not released → no cloning", size: 13, tone: "bad", hl: s === 3 });
      if (s >= 4) c.box({ x: 16, y: 226, w: 608, h: 56, label: "cloning + voice design: Gradium studio", size: 14, tone: "predict", hl: true });
    };
  };

  D["conditions"] = (fig, k) => {
    const d = k.slider({ label: "duration_delta", min: -0.5, max: 0.5, step: 0.05, value: 0, fmt: (v) => v.toFixed(2) });
    k.follow(d, { 1: 0, 5: 0 });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      c.box({ x: 16, y: 20, w: 296, h: 50, label: "num_speakers: lookup", sub: "values 0, 1, 2 → 16 numbers", tone: "take", hl: s === 1 || s === 2 });
      c.box({ x: 328, y: 20, w: 296, h: 50, label: "duration_delta: continuous", sub: "× 1,000, sine, 128 numbers", tone: "predict", hl: s === 1 || s === 3 });
      if (s >= 3) {
        // sinusoidal embedding: phase = 1000·δ / 10000^(i/63), [cos, sin]  (modular_gradium_phonon_tts.py)
        const emb = []; for (let i = 0; i < 64; i++) emb.push(Math.cos((1000 * d.value) / 10000 ** (i / 63)));
        for (let i = 0; i < 64; i++) emb.push(Math.sin((1000 * d.value) / 10000 ** (i / 63)));
        const xs = emb.map((_, i) => i);
        c.plot({ series: [{ x: xs, y: emb, tone: "predict" }], x: 16, y: 84, w: 608, h: 150, xmin: 0, xmax: 127, ymin: -1.1, ymax: 1.1, xlabel: "128 embedding numbers (live)" });
      }
      if (s >= 4) c.box({ x: 16, y: 250, w: 608, h: 44, label: "sum added to every generated frame's input", size: 13, tone: "take", hl: s === 4 });
      if (s >= 5) c.box({ x: 16, y: 304, w: 608, h: 44, label: "defaults: 1 speaker, delta 0 · meaning not documented", size: 13, tone: "muted", hl: true });
    };
  };

  D["step"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const prev = c.box({ x: 16, y: 260, w: 140, h: 50, label: "last frame", sub: "32 numbers", tone: "predict", hl: s === 1 });
      const bb = c.box({ x: 16, y: 150, w: 260, h: 60, label: "backbone, 1 new position", sub: "KV cache", tone: "take", hl: s === 2, dim: s < 2 });
      c.connect(prev, bb, { tone: "predict", label: "linear" });
      const h = c.box({ x: 320, y: 150, w: 70, h: 60, label: "h", mono: true, size: 18, tone: "take", dim: s < 2 });
      c.connect(bb, h, { tone: "take", dim: s < 2 });
      if (s >= 3) { const e = c.box({ x: 320, y: 40, w: 150, h: 54, label: "end logit", sub: "> +4.0?", tone: "bad", hl: s === 3 }); c.connect(h, e, { tone: "bad" }); }
      if (s >= 4) c.box({ x: 440, y: 260, w: 184, h: 50, label: "ε ~ N(0, 0.3)", mono: true, tone: "muted", hl: s === 4 });
      if (s >= 5) {
        const hd = c.box({ x: 440, y: 150, w: 184, h: 60, label: "x = ε + v(h, 0, 1, ε)", mono: true, size: 13, tone: "code", hl: true });
        c.connect(h, hd, { tone: "code" });
      }
    };
  };

  D["lsd-steps"] = (fig, k) => {
    const n = k.slider({ label: "head steps N", min: 1, max: 8, step: 1, value: 4, fmt: (v) => `${v}` });
    k.follow(n, { 1: 4, 2: 1, 4: 8 });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const N = n.value, x0 = 40, x1 = 600;
      c.line(x0, 90, x1, 90, { tone: "muted", width: 2 });
      c.text(x0, 70, "noise, t = 0", { size: 12, tone: "muted" });
      c.text(x1, 70, "frame, t = 1", { size: 12, tone: "muted", anchor: "end" });
      for (let i = 0; i <= N; i++) c.dot(x0 + (i / N) * (x1 - x0), 90, { r: 6, tone: i === N ? "code" : "predict" });
      c.box({ x: 40, y: 120, w: 560, h: 50, label: `${N} head call${N > 1 ? "s" : ""} per frame · ${(12.5 * N).toFixed(1)} per second`, mono: true, size: 14, tone: N === 1 ? "code" : "predict", hl: true });
      if (s >= 3) hbars(c, { x: 16, y: 190, w: 608, labelW: 210, rowH: 40, max: 2.5, fmt: (v) => v.toFixed(2),
        rows: [{ label: "music, 1 step: FAD", v: 0.83, tone: "code" }, { label: "music, 4 steps: FAD", v: 0.71, tone: "code", hl: s === 3 }, ...(s >= 4 ? [{ label: "music, 100 steps: FAD", v: 2.05, tone: "bad", hl: true }] : [])] });
    };
  };

  D["eos"] = (fig, k) => {
    const tok = k.slider({ label: "text tokens", min: 3, max: 60, step: 1, value: 12, fmt: (v) => `${v}` });
    k.follow(tok, { 3: 12 });
    const read = k.readout("");
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const cap = Math.ceil((tok.value / 3 + 2) * 12.5);   // plan.rs frame_budget
      read.textContent = `cap: ⌈(${tok.value}/3 + 2) × 12.5⌉ = ${cap} frames = ${(cap * 0.08).toFixed(2)} s`;
      const xs = [], ys = []; for (let f = 0; f <= 60; f++) { xs.push(f); ys.push(-9 + 15 / (1 + Math.exp(-(f - 40) / 3))); }   // made-up logit
      const p = c.plot({ series: [{ x: xs, y: ys, tone: "paper", width: 2 }], xmin: 0, xmax: 60, ymin: -10, ymax: 8, w: 420, h: 356, y: 2, xlabel: "frame", ylabel: "end logit (made up)" });
      c.line(p.X(0), p.Y(4), p.X(60), p.Y(4), { tone: "code", dash: true });
      c.label(p.X(8), p.Y(4.9), "+4.0 Phonon", { size: 12, tone: "code", weight: 700 });
      const stop = xs.find((f) => ys[f] > 4);
      c.dot(p.X(stop), p.Y(4), { r: 6, tone: "code" });
      if (s >= 2) c.box({ x: p.X(stop) - 2, y: p.Y(7.5), w: p.X(stop + 1) - p.X(stop) + 4, h: 18, tone: "predict", hl: true });
      if (s >= 4) {
        c.line(p.X(0), p.Y(-4), p.X(60), p.Y(-4), { tone: "bad", dash: true });
        c.label(p.X(8), p.Y(-3.1), "−4.0 Pocket", { size: 12, tone: "bad", weight: 700 });
        const st2 = xs.find((f) => ys[f] > -4); c.dot(p.X(st2), p.Y(-4), { r: 6, tone: "bad" });
      }
      c.box({ x: 440, y: 20, w: 186, h: 56, label: `stop at frame ${stop}`, sub: "+ 1 tail frame", tone: "code", hl: s <= 2 });
      if (s >= 3) c.box({ x: 440, y: 92, w: 186, h: 56, label: `cap ${cap} frames`, sub: `${tok.value} tokens`, tone: "predict", hl: s === 3 });
      if (s >= 4) c.box({ x: 440, y: 164, w: 186, h: 56, label: "Pocket: −4.0, min 6", sub: "stops earlier", tone: "bad", hl: true });
    };
  };

  D["streaming"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const u = 52, x0 = 110;
      c.text(16, 74, "backbone", { size: 13, weight: 700 });
      c.text(16, 134, "Mimi", { size: 13, weight: 700 });
      for (let f = 0; f < 9; f++) {
        c.box({ x: x0 + f * u, y: 50, w: u - 6, h: 38, label: `f${f + 1}`, size: 12, tone: "take", hl: s === 1 && f === 0 });
        if (s >= 2) c.box({ x: x0 + (f + 1) * u - 26, y: 110, w: u - 6, h: 38, label: `f${f + 1}`, size: 12, tone: "bridge", hl: s === 2 });
      }
      if (s >= 3) c.box({ x: 16, y: 180, w: 296, h: 60, label: "first audio: 7 ms", sub: "M5, 1 core (README)", tone: "code", hl: s === 3 });
      if (s >= 4) {
        [0, 1, 2].forEach((i) => c.box({ x: 328 + i * 100, y: 180, w: 92, h: 60, label: `chunk ${i + 1}`, sub: "≤ 50 tokens", tone: "paper", hl: s === 4 }));
      }
      if (s >= 5) c.box({ x: 16, y: 270, w: 608, h: 56, label: "each chunk starts fresh: prosody does not carry across", size: 13, tone: "bad", hl: true });
    };
  };

  D["quant"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      if (s >= 1) c.box({ x: 16, y: 16, w: 608, h: 50, label: "quantized: backbone linear1, linear2, in_proj, out_proj", size: 13, tone: "take", hl: s === 1 });
      if (s >= 2) hbars(c, { x: 16, y: 86, w: 608, labelW: 180, rowH: 46, max: 130, fmt: (v) => `${v} MB`,
        rows: [{ label: "model.safetensors", v: 121.7, tone: "muted" }, { label: "model.q8.gguf", v: 74.6, tone: "code", hl: s === 2 }, ...(s >= 3 ? [{ label: "model.q4k.gguf", v: 60.4, tone: "predict", hl: s === 3 }] : [])] });
      if (s >= 4) c.box({ x: 16, y: 250, w: 608, h: 56, label: "WebGPU needs q8 · Neural Engine runs fp16", size: 14, tone: "paper", hl: true });
    };
  };

  D["traps"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => { c.clear(); board(c, [
      ["temp: 0.8", "ignored; runtime samples at 0.3", "bad"],
      ["Transformers", "generation_config: 0.3", "predict"],
      ["eos_threshold: 4.0", "+4.0; Pocket uses −4.0", "bad"],
      ["min frames", "Phonon 0 · Pocket 6", "predict"],
    ], s, { rh: 76, monoQ: true }); };
  };

  // ------------------------------------------------------- results
  D["calm-tts"] = (fig, k) => {
    const m = k.toggle({ label: "metric", options: ["WER", "MUSHRA", "SIM", "speaker Elo"], value: "WER" });
    k.follow(m, { 1: "WER", 2: "MUSHRA", 3: "SIM", 4: "speaker Elo" });
    const c = k.canvas(W, H);
    // Table 3: [name, WER, MUSHRA, SIM, speaker Elo]
    const T = [["real speech", 2.23, 61.8, 0.69, 1953], ["F5-TTS (336M)", 2.42, 54.7, 0.66, 2032], ["DSM (750M)", 1.95, 60.2, 0.67, 2112], ["DiTAR (600M)", 2.39, NaN, 0.67, NaN], ["CALM, 1-step LSD", 1.81, 61.1, 0.52, 1966]];
    return (s) => {
      c.clear();
      const j = { WER: 1, MUSHRA: 2, SIM: 3, "speaker Elo": 4 }[m.value];
      const max = { 1: 3, 2: 70, 3: 0.8, 4: 2200 }[j];
      c.text(16, 22, `${m.value} (Table 3)${j === 1 ? ", lower is better" : ""}`, { size: 14, weight: 700 });
      hbars(c, { x: 16, y: 36, w: 608, labelW: 180, rowH: 52, max, fmt: (v) => (j === 4 ? fmtInt(v) : j === 3 ? v.toFixed(2) : v.toFixed(j === 2 ? 1 : 2)),
        rows: T.map((r, i) => ({ label: r[0], v: r[j], tone: i === 4 ? "code" : i === 0 ? "muted" : "paper", hl: i === 4, dim: i === 0, na: "not reported" })) });
    };
  };

  D["ablation"] = (fig, k) => {
    const m = k.toggle({ label: "metric", options: ["WER", "MUSHRA", "SIM"], value: "WER" });
    k.follow(m, { 1: "WER", 2: "MUSHRA", 3: "SIM", 4: "MUSHRA" });
    const c = k.canvas(W, H);
    // App. E.5: [name, WER, MUSHRA, SIM]
    const T = [["LSD, CFG 1.5 text", 1.81, 61.1, 0.52], ["LSD, no CFG", 2.39, 55.5, 0.52], ["LSD, CFG 1.25 text + voice", 1.86, 56.2, 0.54], ["consistency, CFG 1.5", 1.93, 46.8, 0.40]];
    return (s) => {
      c.clear();
      const j = { WER: 1, MUSHRA: 2, SIM: 3 }[m.value];
      c.text(16, 22, `${m.value} (App. E.5)${j === 1 ? ", lower is better" : ""}`, { size: 14, weight: 700 });
      hbars(c, { x: 16, y: 40, w: 608, labelW: 230, rowH: 62, max: { 1: 3, 2: 70, 3: 0.7 }[j], fmt: (v) => (j === 2 ? v.toFixed(1) : v.toFixed(2)),
        rows: T.map((r, i) => ({ label: r[0], v: r[j], tone: i === 0 ? "code" : i === 3 ? "bad" : "paper", hl: (s === 1 && i <= 1) || (s === 2 && (i === 0 || i === 3)) || (s === 3 && i === 3) || (s === 4 && i === 2) })) });
    };
  };

  D["speed-paper"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const bar = (y, label, head, tone) => {
        c.text(16, y + 24, label, { size: 13, weight: 700 });
        const x0 = 210, w = 410;
        c.box({ x: x0, y, w: w * (1 - head), h: 40, label: "backbone", size: 12, tone: "take" });
        c.box({ x: x0 + w * (1 - head), y, w: Math.max(14, w * head), h: 40, label: head > 0.1 ? `head ${(head * 100).toFixed(1)}%` : "", size: 12, tone, hl: true });
      };
      bar(30, "RQ-transformer head", 0.267, "bad");   // Table 2
      if (s >= 2) { bar(100, "one-step head", 0.029, "code"); c.label(560, 160, "2.9%", { size: 13, tone: "code", weight: 700 }); }
      if (s >= 2) c.box({ x: 16, y: 190, w: 296, h: 50, label: "head: 12.3× faster", tone: "code", hl: s === 2 });
      if (s >= 3) c.box({ x: 328, y: 190, w: 296, h: 50, label: "whole model: 1.3× faster", tone: "take", hl: s === 3 });
      if (s >= 4) hbars(c, { x: 16, y: 256, w: 608, labelW: 190, rowH: 40, max: 5, fmt: (v) => v.toFixed(2),
        rows: [{ label: "RQ head, τ 0.8", v: 2.75, tone: "bad" }, { label: "one-step, τ 0.8", v: 3.45, tone: "code", hl: true }] });
    };
  };

  D["pocket"] = (fig, k) => {
    const m = k.toggle({ label: "metric", options: ["WER", "quality Elo", "speaker Elo"], value: "WER" });
    k.follow(m, { 1: "WER", 2: "quality Elo", 3: "speaker Elo" });
    const c = k.canvas(W, H);
    // Table 12: [name, WER, quality, speaker, CPU real-time]
    const T = [["F5-TTS (336M)", 2.21, 1949, 1946, false], ["DSM (750M)", 1.84, 1959, 2037, false], ["Chatterbox Turbo (350M)", 3.24, 2055, 2012, false], ["Kokoro (82M)", 1.93, NaN, NaN, true], ["Pocket TTS (100M)", 1.84, 2016, 1898, true]];
    return (s) => {
      c.clear();
      const j = { WER: 1, "quality Elo": 2, "speaker Elo": 3 }[m.value];
      c.text(16, 22, `${m.value} (Table 12)`, { size: 14, weight: 700 });
      hbars(c, { x: 16, y: 36, w: 608, labelW: 210, rowH: 50, max: j === 1 ? 4 : 2200, fmt: (v) => (j === 1 ? v.toFixed(2) : fmtInt(v)),
        rows: T.map((r, i) => ({ label: r[0], v: r[j], tone: i === 4 ? "code" : "paper", hl: i === 4 || (s === 4 && r[4]), na: "no voice cloning" })) });
      if (s >= 4) c.box({ x: 16, y: 300, w: 608, h: 44, label: "faster than real time on CPU: Kokoro and Pocket TTS only", size: 13, tone: "code", hl: true });
    };
  };

  // card tables: per language [model, Elo, hard WER %, seed WER %]
  const CARD = {
    English: [["phonon-31m-en", 2098, 1.5, 0.51], ["phonon-40m-en", 2117, 2.3, 0.45], ["phonon-40m-multilingual", 2097, 2.0, 0.48], ["Kokoro", 2043, 3.5, 0.45], ["Magpie", 1939, 28, 0.46], ["NeuTTS", 2034, 8.7, 0.62]],
    French: [["phonon-40m-fr", 2072, 2.4, 1.3], ["phonon-40m-multilingual", 2016, 2.7, 1.5], ["Kokoro", 1578, 5.5, 1.8], ["Magpie", 1608, 30, 2.0], ["NeuTTS", 1853, 9.9, 2.7]],
    German: [["phonon-40m-de", 2097, 2.2, 0.83], ["phonon-40m-multilingual", 2046, 2.9, 0.90], ["Magpie", 1640, 29, 1.6], ["NeuTTS", 1768, 9.3, 2.6]],
    Spanish: [["phonon-40m-es", 2103, 2.1, 0.85], ["phonon-40m-multilingual", 2076, 2.6, 1.0], ["Kokoro", 1629, 3.8, 0.93], ["Magpie", 1870, 25, 0.92], ["NeuTTS", 1778, 16, 5.1]],
    Portuguese: [["phonon-40m-pt", 2144, 2.9, 1.1], ["phonon-40m-multilingual", 2048, 3.2, 1.1], ["Kokoro", 1633, 4.1, 1.3]],
  };
  const tone = (n) => (n.includes("multilingual") ? "code" : n.startsWith("phonon") ? "paper" : "muted");

  D["elo"] = (fig, k) => {
    const lang = k.toggle({ label: "language", options: Object.keys(CARD), value: "English" });
    k.follow(lang, { 1: "English", 2: "French", 3: "German", 4: "English" });
    const c = k.canvas(W, H);
    const raters = { English: 468, French: 172, German: 168, Spanish: 201, Portuguese: 171 };   // card
    return (s) => {
      c.clear();
      const rows = CARD[lang.value];
      c.text(16, 22, `${lang.value}: Elo, ${raters[lang.value]} raters (card)`, { size: 14, weight: 700, tone: s === 4 ? "predict" : "ink" });
      hbars(c, { x: 16, y: 36, w: 608, labelW: 210, rowH: Math.min(52, 300 / rows.length), max: 2300, fmt: fmtInt,
        rows: rows.map((r) => ({ label: r[0], v: r[1], tone: tone(r[0]), hl: r[0].includes("multilingual") })) });
    };
  };

  D["hardset"] = (fig, k) => {
    const lang = k.toggle({ label: "language", options: Object.keys(CARD), value: "English" });
    k.follow(lang, { 1: "English", 2: "French", 3: "English", 4: "Spanish" });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const rows = CARD[lang.value];
      c.text(16, 22, `${lang.value}: hard-set WER %, log scale (card)`, { size: 14, weight: 700 });
      const p = c.plot({ series: [], xlog: true, xmin: 1, xmax: 40, ymin: 0, ymax: rows.length, x: 200, y: 30, w: 430, h: 326, ml: 10, mb: 30, yFmt: () => "", xlabel: "WER % (log)" });
      rows.forEach((r, i) => {
        const y = p.Y(rows.length - i - 0.5);
        c.text(196, y + 4, r[0], { anchor: "end", size: 13, weight: r[0].includes("multilingual") ? 700 : 400, inBox: true });
        const t = tone(r[0]), hl = (s === 3 && r[0] === "Magpie") || (s === 4 && r[0] === "Kokoro") || (s === 2 && r[0].includes("multilingual"));
        c.dot(p.X(r[2]), y, { r: hl ? 8 : 6, tone: r[0] === "Magpie" ? "bad" : t });
        c.label(p.X(r[2]) + 10, y - 2, `${r[2]}%`, { size: 12, tone: r[0] === "Magpie" ? "bad" : t, weight: hl ? 700 : 400, anchor: "start" });
      });
      c.occupy({ x: 16, y: 30, w: 184, h: 300 });
    };
  };

  D["mono-multi"] = (fig, k) => {
    const c = k.canvas(W, H);
    const L = Object.keys(CARD).map((l) => { const r = CARD[l]; const mono = r.find((x) => x[0].startsWith("phonon-40m-") && !x[0].includes("multi")); const mu = r.find((x) => x[0].includes("multi")); return [l, mono[1] - mu[1], mu[2] - mono[2]]; });
    return (s) => {
      c.clear();
      c.text(16, 22, s <= 3 ? "Elo lost by the multilingual model (our arithmetic)" : "hard-set WER change, points (our arithmetic)", { size: 14, weight: 700 });
      if (s <= 3) hbars(c, { x: 16, y: 40, w: 608, labelW: 140, rowH: 56, max: 110, fmt: (v) => `−${v}`,
        rows: L.map(([l, de]) => ({ label: l, v: de, tone: de > 50 ? "bad" : "predict", hl: (s === 2 && l === "English") || (s === 3 && l === "Portuguese") })) });
      else {
        const p = c.plot({ series: [], xmin: -0.5, xmax: 1, ymin: 0, ymax: 5, x: 150, y: 36, w: 480, h: 320, ml: 10, mb: 30, yFmt: () => "" });
        c.line(p.X(0), p.Y(0), p.X(0), p.Y(5), { tone: "muted", dash: true });
        L.forEach(([l, , dw], i) => {
          const y = p.Y(4.5 - i);
          c.text(146, y + 4, l, { anchor: "end", size: 13, inBox: true });
          c.box({ x: Math.min(p.X(0), p.X(dw)), y: y - 14, w: Math.abs(p.X(dw) - p.X(0)), h: 28, tone: dw < 0 ? "code" : "bad", solid: true, r: 3 });
          c.label(p.X(dw) + (dw < 0 ? -8 : 8), y - 18, `${dw > 0 ? "+" : ""}${dw.toFixed(1)}`, { size: 12, tone: dw < 0 ? "code" : "bad", weight: 700, anchor: dw < 0 ? "end" : "start" });
        });
        c.occupy({ x: 16, y: 36, w: 134, h: 300 });
      }
    };
  };

  D["speed"] = (fig, k) => {
    const c = k.canvas(W, H);
    // README: [device, speed ×, TTFB ms]
    const R = [["M5, 1 core", 20, 7], ["iPhone 16 Pro, NE", 20, 12], ["Raspberry Pi 5, 1 core", 2.2, 88], ["Kokoro, M5 1 core", 7.3, 776]];
    return (s) => {
      c.clear();
      const show = R.slice(0, Math.min(s, 4));
      const p = c.plot({ series: [], xlog: true, ylog: true, xmin: 1, xmax: 50, ymin: 3, ymax: 2000, w: 620, h: 356, y: 2, xlabel: "× real time (log)", ylabel: "first audio, ms (log)" });
      c.line(p.X(1), p.Y(3), p.X(1), p.Y(2000), { tone: "bad", dash: true });
      show.forEach(([n, x, y], i) => {
        const kok = n.startsWith("Kokoro");
        c.dot(p.X(x), p.Y(y), { r: 7, tone: kok ? "bad" : "code" });
        c.label(p.X(x) + 10, p.Y(y), `${n}: ${x}× · ${y} ms`, { size: 12, tone: kok ? "bad" : "code", weight: i === s - 1 ? 700 : 400, anchor: "start" });
      });
    };
  };

  // ------------------------------------------------------- your move
  D["compare"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const cols = [["Breeze TTS 2", "muted"], ["Ming-3.0-tts-tiny", "take"], ["Phonon-40m", "code"]];
      cols.forEach(([n, t], i) => c.box({ x: 180 + i * 150, y: 12, w: 140, h: 36, label: n, size: 12, tone: t }));
      const rows = [["output per 80 ms", ["codec tokens", "64-dim latent", "32-dim latent"], 1], ["head steps", ["depth decoder", "10 DiT steps", "1 LSD step"], 2],
        ["parameters", ["3.48B total", "1.3B active", "40M"], 3], ["weights licence", ["non-commercial", "MIT", "CC BY-NC"], 4]];
      rows.forEach(([q, vals, at], i) => {
        if (s < at) return;
        const y = 64 + i * 70, now = s === at;
        c.text(170, y + 28, q, { anchor: "end", size: 13, weight: now ? 700 : 400, inBox: true });
        vals.forEach((v, j) => c.box({ x: 180 + j * 150, y, w: 140, h: 52, label: v, size: 13, tone: cols[j][1], hl: now }));
      });
      c.occupy({ x: 16, y: 64, w: 160, h: 280 });
    };
  };

  D["code"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => { c.clear(); board(c, [
      ["pocket-tts/", "flow_lm.py · training/ (LSD)", "code"],
      ["transformers/", "gradium_phonon_tts", "code"],
      ["xn-ptts/", "flow_lm.rs · synth.rs · preprocess.rs", "code"],
      ["Phonon training", "not published", "bad"],
    ], s, { rh: 76, monoQ: true }); };
  };

  D["reviewer"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => { c.clear(); board(c, [
      ["Training data?", "not reported for Phonon", "bad"],
      ["Who benchmarked?", "Gradium; own hard set + LLM scoring", "predict"],
      ["Config = runtime?", "no: temp 0.8 ignored", "predict"],
      ["Clone a voice?", "not with open files", "bad"],
      ["Steelman", "raters, per-language tables, timings", "code"],
    ], s, { rh: 68 }); };
  };

  D["verdict"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => { c.clear(); board(c, [
      ["Your language?", "en, fr, de, es, pt only", "predict"],
      ["Commercial?", "40m: NC · 31m-en: Apache-2.0", "bad"],
      ["Fast enough?", "20× on 1 core · 12 ms on iPhone", "code"],
      ["Custom voice?", "catalogue only (~100)", "predict"],
      ["Verdict", "ship 31m-en; 40m for research", "take"],
    ], s, { rh: 68 }); };
  };
})();
