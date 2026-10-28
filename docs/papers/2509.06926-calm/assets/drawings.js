/* Drawings for the CALM lesson (arXiv:2509.06926v3), with the LSD chapter from
   Boffi et al. (arXiv:2505.18825v2) and code facts from pocket-tts at 77c3d76.
   One entry per data-draw name; each is redrawn on every step and control change.
   Numbers from the papers carry a // Table N or // §N comment ("LSD" marks the LSD paper).
   The toy world (two modes at ±1, spread 0.15, noise N(0, 1), time 0 = noise) is computed
   exactly here; everything else is illustrative layout, as each page's caption says. */
(function () {
  window.RD = window.RD || {}; RD.drawings = RD.drawings || {};
  const D = RD.drawings;
  const W = 640, H = 360;

  // ---------------------------------------------------------------- toy world
  const SD = 0.15, X0 = 0.3;
  // exact velocity b_t(x) = (E[x1 | x_t = x] − x) / (1 − t) for the two-mode mixture
  const vel = (x, t) => {
    t = Math.min(t, 0.995);
    const va = (1 - t) ** 2 + t * t * SD * SD;
    let num = 0, den = 0;
    for (const m of [-1, 1]) {
      const w = Math.exp(-((x - t * m) ** 2) / (2 * va));
      num += w * (m + t * SD * SD * (x - t * m) / va); den += w;
    }
    return (num / den - x) / (1 - t);
  };
  // flow map Xₛ,ₜ(x) by RK4
  const flow = (x, s, t, n) => {
    n = n || Math.max(20, Math.ceil(Math.abs(t - s) * 300));
    const h = (t - s) / n;
    for (let i = 0; i < n; i++) {
      const u = s + i * h;
      const k1 = vel(x, u), k2 = vel(x + h / 2 * k1, u + h / 2), k3 = vel(x + h / 2 * k2, u + h / 2), k4 = vel(x + h * k3, u + h);
      x += h / 6 * (k1 + 2 * k2 + 2 * k3 + k4);
    }
    return x;
  };
  const curve = (x, s, t, n = 60) => { const xs = [], ys = []; let y = x; xs.push(s); ys.push(y);
    for (let i = 1; i <= n; i++) { y = flow(y, s + (i - 1) * (t - s) / n, s + i * (t - s) / n, 6); xs.push(s + i * (t - s) / n); ys.push(y); } return { x: xs, y: ys }; };
  const TRAJ = curve(X0, 0, 1, 100);
  const euler = (x, n) => { const xs = [0], ys = [x]; for (let i = 0; i < n; i++) { x += vel(x, i / n) / n; xs.push((i + 1) / n); ys.push(x); } return { x: xs, y: ys }; };
  let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd());
  const f3 = (v) => (v < 0 ? "−" : "") + Math.abs(v).toFixed(3);
  const tplot = (c, o = {}) => c.plot({ series: o.series || [], x: o.x || 0, y: o.y || 0, w: o.w || W, h: o.h || H,
    xmin: o.xmin ?? 0, xmax: o.xmax ?? 1, ymin: o.ymin ?? -1.6, ymax: o.ymax ?? 1.6,
    xlabel: o.xlabel || "time t  (0 = noise, 1 = data)", ylabel: o.ylabel || "position x",
    xFmt: (v) => v.toFixed(1), yFmt: (v) => v.toFixed(1) });

  // a checklist board: rows [question, answer, tone]; row i appears on step i + 1
  const board = (c, rows, s, top = 8, rowH = 68, split = 300) => {
    c.clear();
    rows.forEach(([q, a, tone], i) => {
      if (s < i + 1) return;
      const y = top + i * rowH, now = s === i + 1;
      c.box({ x: 10, y, w: 620, h: rowH - 10, tone: "muted", hl: now });
      c.text(26, y + (rowH - 10) / 2 + 5, q, { size: 14, weight: now ? 700 : 400, maxW: split - 30, lines: 1, inBox: true });
      c.box({ x: split + 10, y: y + 8, w: 616 - split - 10, h: rowH - 26, label: a, size: 13, tone, hl: now });
    });
  };
  // horizontal bars from a table, one value per row
  const tbars = (c, rows, o = {}) => c.bars({ x: 10, y: o.y ?? 26, w: 620, rowH: o.rowH ?? Math.min(56, (o.h ?? 300) / rows.length),
    labelW: o.labelW ?? 150, max: o.max, fmt: o.fmt || ((v) => String(v)), tones: [o.tone || "paper"],
    rows: rows.map(([label, v, hl, dim]) => ({ label, values: [v], hl, dim })) });
  const title = (c, str, tone = "muted") => c.text(620, 16, str, { size: 13, anchor: "end", weight: 700, tone });

  // ======================================================= AUDIO LM TOOLBOX
  D["rvq-cost"] = (fig, k) => {
    const lv = k.slider({ label: "RVQ levels", min: 1, max: 32, step: 1, value: 8 });
    k.follow(lv, { 1: 8, 3: 24, 4: 8 });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const L = lv.value, n = s === 1 ? 1 : 6, ch = Math.min(26, 240 / L);
      for (let f = 0; f < n; f++) {
        const x = 30 + f * 100;
        for (let q = 0; q < L; q++) c.box({ x, y: 290 - (q + 1) * ch, w: 70, h: ch - 2, tone: q === 0 ? "paper" : "bridge", hl: s === 4 && f === 0, r: 2 });
        c.text(x + 35, 312, `frame ${f + 1}`, { size: 12, anchor: "middle", tone: "muted" });
      }
      if (s >= 2) c.text(620, 340, `${L} × 12.5 = ${(L * 12.5).toFixed(1)} tokens/s`, { size: 16, mono: true, anchor: "end", weight: 700, tone: s === 2 ? "predict" : "ink" }); // Table 1
      if (s === 1) c.label(200, 160, "one frame: coarse at the bottom, fine on top", { size: 14, tone: "paper" });
      if (s >= 3) c.text(20, 340, s === 3 ? "deeper stack → finer audio" : "level k waits for levels 1…k−1", { size: 14, weight: 700, tone: s === 3 ? "code" : "bad" });
    };
  };

  D["rq-head"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const past = c.box({ x: 10, y: 20, w: 160, h: 56, label: "frames 1 … s−1", tone: "bridge" });
      const bb = c.box({ x: 210, y: 20, w: 220, h: 56, label: "backbone transformer", tone: "take", hl: s === 1 });
      const z = c.box({ x: 470, y: 20, w: 150, h: 56, label: "z", sub: "one vector", tone: "take", hl: s === 1 });
      c.connect(past, bb, { tone: "bridge" }); c.connect(bb, z, { tone: "take" });
      if (s >= 2) {
        const lin = c.box({ x: 470, y: 120, w: 150, h: 46, label: "linear → token 1", size: 13, tone: "paper", hl: s === 2 });
        c.connect(z, lin, { tone: "take" });
      }
      if (s >= 3) {
        const dt = c.box({ x: 10, y: 120, w: 420, h: 46, label: "depth transformer (RQ-Transformer)", size: 14, tone: "predict", hl: s === 3 });
        c.connect(z, dt, { tone: "take", route: "elbow" });
        c.chips({ x: 10, y: 200, items: [1, 2, 3, 4, 5, 6, 7, 8].map((i) => ({ t: `tok ${i}`, tone: i === 1 ? "paper" : "predict", hl: s === 3 })), size: 14 });
        c.text(10, 262, "one after another, inside every frame", { size: 13, tone: "muted" });
      }
      if (s >= 4) c.box({ x: 10, y: 286, w: 620, h: 56, label: "701M parameters · 26.7% of speech generation time", size: 14, tone: "bad", hl: true }); // Table 14, Table 2
    };
  };

  D["vae-frame"] = (fig, k) => {
    const c = k.canvas(W, H);
    seed = 11; const HB = Array.from({ length: 32 }, () => gauss());
    return (s) => {
      c.clear();
      const au = c.box({ x: 10, y: 14, w: 150, h: 50, label: "80 ms of audio", tone: "bridge" });
      const en = c.box({ x: 200, y: 14, w: 180, h: 50, label: "VAE encoder", sub: "Gaussian latent", tone: "take", hl: s === 1 });
      c.connect(au, en, { tone: "bridge" });
      if (s >= 2) {
        c.text(630, 44, "32 numbers × 12.5 frames/s", { size: 13, weight: 700, anchor: "end", tone: s === 2 ? "predict" : "muted" }); // Table 1
        HB.forEach((v, i) => c.add(k.h("rect", { x: 20 + i * 19, y: v > 0 ? 150 - v * 40 : 150, width: 15, height: Math.abs(v) * 40 + 1, class: `f-paper${s === 2 ? "" : " soft"}` })));
        c.line(16, 150, 624, 150, { tone: "muted", width: 1 });
      }
      if (s >= 3) {
        c.box({ x: 10, y: 236, w: 300, h: 50, label: "MOSNet 3.15 vs 3.11 · ABX 8.1% vs 9.4%", size: 13, tone: "code", hl: s === 3 }); // Table 1
      }
      if (s >= 4) c.box({ x: 330, y: 236, w: 300, h: 50, label: "MUSHRA 66.0 vs 57.7", size: 14, tone: "code", hl: s === 4 }); // Table 1
      if (s >= 5) c.box({ x: 10, y: 300, w: 620, h: 50, label: "no vocabulary → no softmax → how do we sample?", size: 14, tone: "bad", hl: true });
    };
  };

  const mixpdf = (x) => [-1, 1].reduce((a, m) => a + Math.exp(-((x - m) ** 2) / (2 * SD * SD)), 0) / (2 * SD * Math.sqrt(2 * Math.PI));
  D["mean-trap"] = (fig, k) => {
    const c = k.canvas(W, H);
    const xs = Array.from({ length: 161 }, (_, i) => -2 + i * 0.025);
    return (s) => {
      c.clear();
      const p = c.plot({ series: [{ x: xs, y: xs.map(mixpdf), tone: "paper" }], xmin: -2, xmax: 2, ymin: 0, ymax: 3,
        xlabel: "the frame (one number in our toy)", ylabel: "how likely", xFmt: (v) => v.toFixed(1), yFmt: (v) => v.toFixed(0) });
      c.label(p.X(-1), p.Y(2.75), "“ee”", { size: 14, tone: "paper", weight: 700 });
      c.label(p.X(1), p.Y(2.75), "“ah”", { size: 14, tone: "paper", weight: 700 });
      if (s >= 2) c.label(p.X(0), p.Y(2.2), "50% / 50%", { size: 14, tone: "muted", weight: 700 });
      if (s >= 3) { c.dot(p.X(0), p.Y(0.05), { r: 9, tone: "bad" }); c.label(p.X(0), p.Y(0.6), "MSE prediction: 0", { size: 14, tone: "bad", weight: 700 }); }
      if (s >= 4) c.label(p.X(0), p.Y(1.3), "a blend of both = muffled", { size: 13, tone: "bad" });
      if (s >= 5) { c.dot(p.X(-1.04), p.Y(0.05), { r: 8, tone: "code" }); c.dot(p.X(0.97), p.Y(0.05), { r: 8, tone: "code" }); c.label(p.X(1.4), p.Y(1.0), "samples", { size: 13, tone: "code", weight: 700 }); }
    };
  };

  D["mar"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const past = c.box({ x: 10, y: 20, w: 160, h: 54, label: "frames 1 … s−1", tone: "bridge" });
      const bb = c.box({ x: 230, y: 20, w: 180, h: 54, label: "backbone", tone: "take" });
      const z = c.box({ x: 470, y: 20, w: 150, h: 54, label: "z", tone: "take", hl: s === 1 });
      c.connect(past, bb, { tone: "bridge" }); c.connect(bb, z, { tone: "take" });
      if (s >= 2) {
        const nz = c.box({ x: 10, y: 140, w: 160, h: 54, label: "noise ε", tone: "muted", hl: s === 3 });
        const mlp = c.box({ x: 230, y: 140, w: 180, h: 54, label: "small MLP head", sub: "denoiser, given z", size: 14, tone: "predict", hl: s === 2 });
        const out = c.box({ x: 470, y: 140, w: 150, h: 54, label: s >= 3 ? "+1 or −1" : "frame", tone: "code", hl: s === 3 });
        c.connect(nz, mlp, { tone: "muted" }); c.connect(mlp, out, { tone: "predict" }); c.connect(z, mlp, { tone: "take" });
      }
      if (s >= 4) c.box({ x: 10, y: 226, w: 400, h: 46, label: "trained to remove noise from real frames", size: 13, tone: "paper", hl: s === 4 });
      if (s >= 5) c.box({ x: 10, y: 290, w: 620, h: 52, label: "× hundreds of denoising steps per frame (§2)", size: 14, tone: "bad", hl: true });
    };
  };

  // ======================================================= FLOW TOOLBOX
  D["interp"] = (fig, k) => {
    const ts = k.slider({ label: "t", min: 0, max: 1, step: 0.05, value: 0.5, fmt: (v) => v.toFixed(2) });
    k.follow(ts, { 1: 0, 2: 0.5 });
    const c = k.canvas(W, H);
    seed = 3; const PAIRS = Array.from({ length: 14 }, () => [gauss(), (rnd() < 0.5 ? -1 : 1) + SD * gauss()]);
    return (s) => {
      c.clear();
      const p = tplot(c);
      if (s >= 4) PAIRS.forEach(([e0, x1]) => { const e = Math.max(-1.5, Math.min(1.5, e0)); c.line(p.X(0), p.Y(e), p.X(1), p.Y(x1), { tone: "muted", width: 1 }); });
      c.line(p.X(0), p.Y(X0), p.X(1), p.Y(1.0), { tone: "paper", width: s === 3 ? 3 : 2 });
      c.dot(p.X(0), p.Y(X0), { r: 7, tone: "muted" }); c.dot(p.X(1), p.Y(1.0), { r: 7, tone: "code" });
      c.label(p.X(0) + 12, p.Y(X0) + 18, "ε = 0.3", { size: 13, weight: 700 });
      c.label(p.X(1) - 12, p.Y(1.0) - 16, "x₁ = 1.0", { size: 13, weight: 700, tone: "code", anchor: "end" });
      if (s >= 2) { const t = ts.value, y = (1 - t) * X0 + t * 1.0; c.dot(p.X(t), p.Y(y), { r: 8, tone: "predict" });
        c.label(p.X(t), p.Y(y) + 26, `x_t = ${y.toFixed(3)}`, { size: 13, mono: true, tone: "predict", weight: 700 }); }
    };
  };

  D["velocity"] = (fig, k) => {
    const ts = k.slider({ label: "t", min: 0, max: 0.9, step: 0.05, value: 0.5, fmt: (v) => v.toFixed(2) });
    k.follow(ts, { 2: 0.5, 3: 0, 4: 0.85 });
    const c = k.canvas(W, H);
    seed = 5; const PAIRS = Array.from({ length: 12 }, () => [gauss(), (rnd() < 0.5 ? -1 : 1) + SD * gauss()]);
    return (s) => {
      c.clear();
      const p = tplot(c);
      if (s === 1) PAIRS.forEach(([e, x1]) => c.line(p.X(0), p.Y(e), p.X(1), p.Y(x1), { tone: "muted", width: 1 }));
      if (s >= 2) {
        const t = ts.value;
        for (let x = -1.4; x <= 1.41; x += 0.35) {
          const v = vel(x, t), dt = 0.07, dx = Math.max(-0.9, Math.min(0.9, v * dt));
          c.arrow(p.X(t), p.Y(x), p.X(t + dt), p.Y(x + dx), { tone: "take", width: 1.6 });
        }
        c.label(p.X(Math.min(t + 0.14, 0.9)), p.Y(1.5), `t = ${t.toFixed(2)}`, { size: 13, tone: "take", weight: 700 });
      }
      if (s >= 5) {
        c.add(k.h("polyline", { points: TRAJ.x.map((t, i) => `${p.X(t)},${p.Y(TRAJ.y[i])}`).join(" "), class: "f-none s-predict", "stroke-width": 2.6 }));
        c.label(p.X(0.4), p.Y(0.225) + 24, "dips to 0.225", { size: 13, tone: "predict", weight: 700 });
        c.label(p.X(1) - 8, p.Y(0.892) - 16, "0.892", { size: 13, tone: "predict", weight: 700, anchor: "end" });
      }
    };
  };

  D["fm-loss"] = (fig, k) => {
    const c = k.canvas(W, H);
    const T = 0.5, XP = 0.25;
    const sl = (x1) => x1 - (XP - T * x1) / (1 - T);          // slope of the line through (T, XP) ending at x1
    return (s) => {
      c.clear();
      const p = tplot(c);
      const ln = (x1, tone, wdt) => { const e = (XP - T * x1) / (1 - T); c.line(p.X(0), p.Y(e), p.X(1), p.Y(x1), { tone, width: wdt }); };
      ln(1, "paper", s <= 2 ? 2.6 : 1.4);
      c.dot(p.X(T), p.Y(XP), { r: 7, tone: "ink" });
      if (s >= 2) c.label(p.X(0.78), p.Y(1.25), `slope x₁ − ε = ${f3(sl(1))}`, { size: 13, mono: true, tone: "paper", weight: 700 });
      if (s >= 3) { ln(-1, "bad", 1.8); c.label(p.X(0.78), p.Y(-1.25), `slope ${f3(sl(-1))}`, { size: 13, mono: true, tone: "bad", weight: 700 }); }
      if (s >= 4) { const b = vel(XP, T); c.arrow(p.X(T), p.Y(XP), p.X(T + 0.15), p.Y(XP + 0.15 * b), { tone: "take", width: 3 });
        c.label(p.X(0.3), p.Y(0.95), `average: b = ${f3(b)}`, { size: 14, mono: true, tone: "take", weight: 700 }); }
      if (s >= 5) c.label(p.X(0.25), p.Y(-1.3), "target = x − e  (samplers.py)", { size: 13, mono: true, tone: "code" });
    };
  };

  const STEPS = [1, 2, 4, 8, 16];
  D["euler"] = (fig, k) => {
    const ni = k.slider({ label: "Euler steps", min: 0, max: 4, step: 1, value: 2, fmt: (v) => String(STEPS[v]) });
    k.follow(ni, { 2: 2, 3: 3, 4: 1 });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const p = tplot(c, { series: [{ x: TRAJ.x, y: TRAJ.y, tone: "muted", width: 1.6, label: "exact 0.892", labelAt: 100 }] });
      c.dot(p.X(0), p.Y(X0), { r: 6, tone: "muted" });
      if (s >= 2) {
        const n = STEPS[ni.value], e = euler(X0, n);
        c.add(k.h("polyline", { points: e.x.map((t, i) => `${p.X(t)},${p.Y(e.y[i])}`).join(" "), class: "f-none s-predict", "stroke-width": 2.6 }));
        e.x.forEach((t, i) => c.dot(p.X(t), p.Y(e.y[i]), { r: 4, tone: "predict" }));
        c.label(p.X(0.55), p.Y(-1.2), `${n} step${n > 1 ? "s" : ""} → ${e.y[n].toFixed(3)}`, { size: 15, mono: true, weight: 700, tone: "predict" });
        if (s >= 5) c.label(p.X(0.55), p.Y(-0.8), `${n} network call${n > 1 ? "s" : ""}`, { size: 14, weight: 700, tone: "bad" });
      }
    };
  };

  D["one-step"] = (fig, k) => {
    const c = k.canvas(W, H);
    const NZ = [-1.3, -0.8, -0.4, 0.3, 0.7, 1.2];
    return (s) => {
      c.clear();
      const p = tplot(c);
      const show = s === 1 ? [X0] : NZ;
      show.forEach((x) => { c.dot(p.X(0), p.Y(x), { r: 5, tone: "muted" }); c.arrow(p.X(0), p.Y(x), p.X(1), p.Y(0), { tone: s >= 4 ? "muted" : "bad", width: x === X0 ? 2.4 : 1.4 }); });
      c.dot(p.X(1), p.Y(0), { r: 8, tone: "bad" });
      c.label(p.X(1) - 10, p.Y(0) + 22, s === 1 ? "0.3 + (−0.3) = 0" : "all land on 0", { size: 13, tone: "bad", weight: 700, anchor: "end" });
      if (s >= 3) c.label(p.X(0.55), p.Y(-1.4), "the mean frame: muffled", { size: 14, tone: "bad", weight: 700 });
      if (s >= 4) NZ.forEach((x) => { const cv = curve(x, 0, 1, 40); c.add(k.h("polyline", { points: cv.x.map((t, i) => `${p.X(t)},${p.Y(cv.y[i])}`).join(" "), class: "f-none s-code", "stroke-width": 2 })); });
      if (s >= 5) { c.arrow(p.X(0.02), p.Y(X0 + 0.1), p.X(0.97), p.Y(0.892 + 0.1), { tone: "predict", width: 3, dash: true });
        c.label(p.X(0.5), p.Y(1.35), "learn this jump instead", { size: 14, tone: "predict", weight: 700 }); }
    };
  };

  D["step-cost"] = (fig, k) => {
    const N = [1, 4, 10, 25, 50, 100], RTF = [0.56, 0.68, 0.92, 1.54, 2.56, 4.55], TIME = [16.7, 20.4, 27.7, 46.1, 76.8, 136.4]; // Table 9
    const si = k.slider({ label: "head steps", min: 0, max: 5, step: 1, value: 5, fmt: (v) => String(N[v]) });
    k.follow(si, { 2: 5, 3: 2, 4: 0 });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const p = c.plot({ series: s >= 2 ? [{ x: N, y: RTF, tone: "paper", dots: true }] : [], xlog: true, xmin: 1, xmax: 100, ymin: 0, ymax: 5,
        xlabel: "head steps per frame (log)", ylabel: "real-time factor", xFmt: (v) => String(v), yFmt: (v) => v.toFixed(0) });
      c.line(p.X(1), p.Y(1), p.X(100), p.Y(1), { tone: "bad", dash: true });
      c.label(p.X(1.6), p.Y(1) - 14, "RTF = 1: streaming limit", { size: 13, tone: "bad", weight: 700 });
      if (s >= 2) { const i = si.value; c.dot(p.X(N[i]), p.Y(RTF[i]), { r: 9, tone: "predict" });
        c.label(p.X(N[i]) + (i >= 3 ? -10 : 10), p.Y(RTF[i]) - 26, `${N[i]} steps: ${TIME[i]} s for 30 s, RTF ${RTF[i]}`, { size: 13, weight: 700, tone: "predict", anchor: i >= 3 ? "end" : "start" }); }
    };
  };

  // ======================================================= FLOW MAPS AND LSD
  D["flowmap"] = (fig, k) => {
    const ts = k.slider({ label: "jump to t", min: 0.05, max: 1, step: 0.05, value: 0.6, fmt: (v) => v.toFixed(2) });
    k.follow(ts, { 2: 0.6, 3: 1 });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const p = tplot(c, { series: [{ x: TRAJ.x, y: TRAJ.y, tone: "muted", width: 1.4 }] });
      c.dot(p.X(0), p.Y(X0), { r: 7, tone: "muted" });
      if (s >= 2 && s <= 3) {
        const t = ts.value, y = flow(X0, 0, t);
        const cv = curve(X0, 0, t, 40);
        c.add(k.h("polyline", { points: cv.x.map((u, i) => `${p.X(u)},${p.Y(cv.y[i])}`).join(" "), class: "f-none s-predict", "stroke-width": 3 }));
        c.dot(p.X(t), p.Y(y), { r: 8, tone: "predict" });
        c.label(p.X(t) - 8, p.Y(y) - 22, `X(0→${t.toFixed(2)}) = ${y.toFixed(3)}`, { size: 14, mono: true, tone: "predict", weight: 700, anchor: "end" });
      }
      if (s === 1) c.label(p.X(0.5), p.Y(-1.2), "Xₛ,ₜ(x): where the flow takes x from s to t", { size: 14, tone: "take", weight: 700 });
      if (s >= 4) {
        const ym = flow(X0, 0, 0.5);
        c.arrow(p.X(0), p.Y(X0), p.X(0.5), p.Y(ym), { tone: "take", width: 2.4 });
        c.arrow(p.X(0.5), p.Y(ym), p.X(1), p.Y(0.892), { tone: "take", width: 2.4 });
        c.label(p.X(0.5), p.Y(ym) + 26, "two calls", { size: 13, tone: "take", weight: 700 });
      }
      if (s >= 5) c.label(p.X(0.5), p.Y(-1.25), "consistency: only Xₛ,₁ · LSD: every (s, t)", { size: 14, tone: "paper", weight: 700 });
    };
  };

  D["map-rules"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const p = tplot(c, { series: [{ x: TRAJ.x, y: TRAJ.y, tone: "muted", width: 1.4 }] });
      const pt = (t) => [p.X(t), p.Y(flow(X0, 0, t))];
      if (s === 1) { const [x, y] = pt(0.4); c.dot(x, y, { r: 9, tone: "predict" }); c.label(x, y + 28, "Xₛ,ₛ(x) = x", { size: 14, tone: "predict", weight: 700 }); }
      if (s === 2) { const a = pt(0.1), m = pt(0.5), e = pt(0.95);
        c.arrow(...a, ...m, { tone: "take", width: 2.2 }); c.arrow(...m, ...e, { tone: "take", width: 2.2 });
        c.arrow(a[0], a[1] + 14, e[0], e[1] + 14, { tone: "code", width: 2.2, dash: true });
        c.label(m[0], m[1] - 30, "s→u→t equals s→t", { size: 14, tone: "code", weight: 700 }); }
      if (s === 3) { const a = pt(0.95), e = pt(0.15); c.arrow(...a, ...e, { tone: "bad", width: 2.4 });
        c.label(p.X(0.55), p.Y(-1.2), "Xₜ,ₛ runs data back to noise", { size: 14, tone: "bad", weight: 700 }); }
      if (s === 4) { const t = 0.5, y = flow(X0, 0, t), b = vel(y, t);
        c.arrow(p.X(t), p.Y(y), p.X(t + 0.12), p.Y(y + 0.12 * b), { tone: "predict", width: 3 });
        c.label(p.X(t), p.Y(y) + 28, `tiny jump moves at b = ${b.toFixed(3)}`, { size: 14, tone: "predict", weight: 700 }); }
    };
  };

  D["param"] = (fig, k) => {
    const ts = k.slider({ label: "t", min: 0.1, max: 1, step: 0.05, value: 0.6, fmt: (v) => v.toFixed(2) });
    k.follow(ts, { 3: 0.6, 4: 1 });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const p = tplot(c, { series: [{ x: TRAJ.x, y: TRAJ.y, tone: "muted", width: 1.4 }] });
      c.dot(p.X(0), p.Y(X0), { r: 6, tone: "muted" });
      c.label(p.X(0.5), p.Y(-1.15), "Xₛ,ₜ(x) = x + (t − s)·vₛ,ₜ(x)", { size: 15, mono: true, weight: 700, tone: s <= 2 ? "predict" : "take" });
      if (s === 2) c.label(p.X(0.18), p.Y(X0) + 30, "t = s → jump = x", { size: 14, tone: "code", weight: 700 });
      if (s >= 3) {
        const t = ts.value, y = flow(X0, 0, t), v = (y - X0) / t;
        c.line(p.X(0), p.Y(X0), p.X(t), p.Y(y), { tone: "predict", width: 2.6, dash: true });
        c.dot(p.X(t), p.Y(y), { r: 7, tone: "predict" });
        c.label(p.X(t) - 8, p.Y(y) - 22, `chord slope v = ${f3(v)}`, { size: 14, mono: true, weight: 700, tone: "predict", anchor: "end" });
      }
      if (s >= 5) c.label(p.X(0.5), p.Y(1.45), "same information as X, rescaled", { size: 13, tone: "muted", weight: 700 });
    };
  };

  const DL = [0.5, 0.25, 0.1, 0.05, 0.01];
  D["tangent"] = (fig, k) => {
    const di = k.slider({ label: "jump length", min: 0, max: 4, step: 1, value: 0, fmt: (v) => String(DL[v]) });
    k.follow(di, { 2: 0, 3: 2, 4: 4 });
    const c = k.canvas(W, H);
    const S0 = 0.5, XS = flow(X0, 0, S0);
    return (s) => {
      c.clear();
      const p = tplot(c, { series: [{ x: TRAJ.x, y: TRAJ.y, tone: "muted", width: 1.4 }], ymin: -0.4, ymax: 1.2 });
      c.dot(p.X(S0), p.Y(XS), { r: 7, tone: "ink" });
      c.label(p.X(S0) - 10, p.Y(XS) + 24, `s = 0.5, x = ${XS.toFixed(3)}`, { size: 13, weight: 700, anchor: "end" });
      if (s >= 2) {
        const d = DL[di.value], y = flow(XS, S0, S0 + d), sl = (y - XS) / d;
        c.line(p.X(S0), p.Y(XS), p.X(S0 + d), p.Y(y), { tone: "predict", width: 2.6 });
        c.dot(p.X(S0 + d), p.Y(y), { r: 6, tone: "predict" });
        c.label(p.X(0.75), p.Y(-0.25), `length ${d}: slope ${sl.toFixed(3)}`, { size: 15, mono: true, weight: 700, tone: "predict" });
      }
      if (s >= 4) { const b = vel(XS, S0);
        c.line(p.X(S0 - 0.25), p.Y(XS - 0.25 * b), p.X(S0 + 0.3), p.Y(XS + 0.3 * b), { tone: "take", width: 2, dash: true });
        c.label(p.X(0.2), p.Y(1.05), `velocity b = ${b.toFixed(3)}`, { size: 15, mono: true, weight: 700, tone: "take" }); }
      if (s >= 5) c.label(p.X(0.2), p.Y(0.85), "vₜ,ₜ = b_t", { size: 15, mono: true, weight: 700, tone: "code" });
    };
  };

  // the (s, t) square: s on x, t on y; s ≤ t is above the diagonal
  const square = (c, k, o = {}) => {
    const x0 = o.x ?? 150, y0 = o.y ?? 20, L = o.L ?? 300;
    const X = (s) => x0 + s * L, Y = (t) => y0 + L - t * L;
    c.add(k.h("path", { d: `M${X(0)},${Y(0)} L${X(0)},${Y(1)} L${X(1)},${Y(1)} Z`, class: `f-take ${o.hlTri ? "soft" : "softer"}` }));
    c.line(X(0), Y(0), X(1), Y(0), { tone: "muted" }); c.line(X(0), Y(0), X(0), Y(1), { tone: "muted" });
    c.line(X(1), Y(0), X(1), Y(1), { tone: "muted", width: 0.8 }); c.line(X(0), Y(1), X(1), Y(1), { tone: "muted", width: 0.8 });
    c.text(X(0.5), Y(0) + 22, "s (start time)", { size: 12, anchor: "middle", tone: "muted" });
    c.text(X(0) - 10, Y(0.5), "t", { size: 13, anchor: "end", tone: "muted", weight: 700 });
    c.text(X(0) - 6, Y(0) + 4, "0", { size: 11, anchor: "end", tone: "muted" });
    c.text(X(0) - 6, Y(1) + 4, "1", { size: 11, anchor: "end", tone: "muted" });
    c.text(X(1), Y(0) + 14, "1", { size: 11, anchor: "middle", tone: "muted" });
    return { X, Y };
  };

  D["square"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const q = square(c, k, { hlTri: s === 1 });
      if (s === 1) c.label(q.X(0.3), q.Y(0.75), "s < t: forward jumps", { size: 14, tone: "take", weight: 700 });
      c.line(q.X(0), q.Y(0), q.X(1), q.Y(1), { tone: s === 2 ? "code" : "muted", width: s === 2 ? 4 : 1.6 });
      if (s >= 2) c.label(q.X(0.86), q.Y(0.62), "diagonal: flow matching", { size: 14, tone: "code", weight: 700 });
      if (s >= 3) { c.dot(q.X(0.2), q.Y(0.9), { r: 8, tone: "bad" }); c.label(q.X(0.2), q.Y(0.9) + 24, "X₀.₂,₀.₉: no target", { size: 13, tone: "bad", weight: 700 }); }
      if (s >= 4) [0.35, 0.55, 0.75].forEach((u) => c.arrow(q.X(u), q.Y(u), q.X(u - 0.12), q.Y(u + 0.12), { tone: "predict", width: 2 }));
      if (s >= 4) c.label(q.X(0.15), q.Y(0.45), "distil outward", { size: 13, tone: "predict", weight: 700 });
      if (s >= 5) { c.dot(q.X(0), q.Y(1), { r: 10, tone: "predict" }); c.label(q.X(0) + 14, q.Y(1) + 26, "(0, 1): one-step generation", { size: 14, tone: "predict", weight: 700 }); }
    };
  };

  D["three"] = (fig, k) => {
    const c = k.canvas(W, H);
    const COL = [["Lagrangian", "move the end", "∂t X = v(X)", "Eq. 8"], ["Eulerian", "move the start", "∂s X + ∇X·v = 0", "Eq. 9"], ["Semigroup", "split the jump", "X(u→t)∘X(s→u) = X(s→t)", "Eq. 10"]];
    return (s) => {
      c.clear();
      COL.forEach(([n, how, eq], i) => {
        if (s < i + 1) return;
        const x = 10 + i * 210, now = s === i + 1;
        c.box({ x, y: 20, w: 200, h: 56, label: n, sub: how, tone: ["code", "bad", "predict"][i], hl: now });
        c.box({ x, y: 96, w: 200, h: 70, label: eq, mono: true, size: 13, tone: "muted", hl: now });
      });
      if (s >= 4) {
        c.box({ x: 10, y: 200, w: 620, h: 60, label: "correct diagonal + any one check ⇒ the true flow map", size: 15, tone: "take", hl: true });
        c.text(320, 300, "Proposition 2.2 of the LSD paper", { size: 13, anchor: "middle", tone: "muted" });
      }
    };
  };

  D["lagrange"] = (fig, k) => {
    const ts = k.slider({ label: "t", min: 0.1, max: 0.9, step: 0.05, value: 0.5, fmt: (v) => v.toFixed(2) });
    k.follow(ts, { 2: 0.5 });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const p = tplot(c, { series: s >= 2 ? [{ x: TRAJ.x, y: TRAJ.y, tone: "muted", width: 1.4 }] : [] });
      c.dot(p.X(0), p.Y(X0), { r: 8, tone: "ink" });
      c.label(p.X(0) + 12, p.Y(X0) + 22, "s = 0, x = 0.3", { size: 13, weight: 700 });
      if (s >= 2) {
        const t = ts.value, y = flow(X0, 0, t), h = 0.002;
        const speed = (flow(X0, 0, t + h) - flow(X0, 0, t - h)) / (2 * h), b = vel(y, t), dt = 0.1;
        c.dot(p.X(t), p.Y(y), { r: 7, tone: "predict" });
        if (s >= 3) { c.arrow(p.X(t), p.Y(y), p.X(t + dt), p.Y(y + dt * speed), { tone: "predict", width: 3.2 });
          c.label(p.X(0.55), p.Y(-1.0), `∂t X = ${speed.toFixed(3)}`, { size: 15, mono: true, weight: 700, tone: "predict" }); }
        if (s >= 4) { c.arrow(p.X(t), p.Y(y) + 10, p.X(t + dt), p.Y(y + dt * b) + 10, { tone: "take", width: 2, dash: true });
          c.label(p.X(0.55), p.Y(-1.35), `b_t(X) = ${b.toFixed(3)}`, { size: 15, mono: true, weight: 700, tone: "take" }); }
        if (s >= 5) c.label(p.X(0.22), p.Y(1.35), "equal ⇒ residual 0", { size: 15, weight: 700, tone: "code" });
      }
    };
  };

  D["eulerian"] = (fig, k) => {
    const ss = k.slider({ label: "start s", min: 0, max: 0.9, step: 0.05, value: 0.3, fmt: (v) => v.toFixed(2) });
    k.follow(ss, { 1: 0, 2: 0.3, 3: 0.7 });
    const c = k.canvas(W, H);
    const END = flow(X0, 0, 1);
    return (s) => {
      c.clear();
      const p = tplot(c, { series: [{ x: TRAJ.x, y: TRAJ.y, tone: "muted", width: 1.4 }] });
      c.dot(p.X(1), p.Y(END), { r: 9, tone: "code" });
      c.label(p.X(1) - 10, p.Y(END) - 20, `lands at ${END.toFixed(3)}`, { size: 13, tone: "code", weight: 700, anchor: "end" });
      const sv = ss.value, xs = flow(X0, 0, sv);
      c.dot(p.X(sv), p.Y(xs), { r: 7, tone: "bad" });
      c.add(k.h("path", { d: `M${p.X(sv)},${p.Y(xs)} Q${p.X((sv + 1) / 2)},${p.Y(1.45)} ${p.X(1) - 8},${p.Y(END) - 6}`, class: "f-none s-bad", "stroke-width": 2, "stroke-dasharray": "5 4" }));
      if (s >= 3) c.label(p.X(0.4), p.Y(-1.0), "any start on the curve → same end", { size: 14, tone: "code", weight: 700 });
      if (s >= 4) c.label(p.X(0.4), p.Y(-1.35), "∂s X + ∇X · v = 0  (needs ∇X)", { size: 14, mono: true, tone: "bad", weight: 700 });
      if (s >= 5) c.label(p.X(0.25), p.Y(1.35), "consistency models", { size: 14, tone: "paper", weight: 700 });
    };
  };

  D["semigroup"] = (fig, k) => {
    const us = k.slider({ label: "split at u", min: 0.1, max: 0.9, step: 0.05, value: 0.5, fmt: (v) => v.toFixed(2) });
    k.follow(us, { 1: 0.5, 4: 0.3 });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const p = tplot(c, { series: [{ x: TRAJ.x, y: TRAJ.y, tone: "muted", width: 1.4 }] });
      const u = us.value, xu = flow(X0, 0, u), x1 = flow(X0, 0, 1);
      c.arrow(p.X(0), p.Y(X0), p.X(u), p.Y(xu), { tone: "take", width: 2.4 });
      c.arrow(p.X(u), p.Y(xu), p.X(1), p.Y(x1), { tone: "take", width: 2.4 });
      c.dot(p.X(u), p.Y(xu), { r: 6, tone: "take" });
      if (s >= 2) c.arrow(p.X(0), p.Y(X0) + 14, p.X(1), p.Y(x1) + 14, { tone: "code", width: 2.4, dash: true });
      if (s >= 3) { const g = 1 - u, vsu = (xu - X0) / u, vut = (x1 - xu) / (1 - u), vst = x1 - X0;
        c.label(p.X(0.5), p.Y(-1.0), `(1−γ)·${vsu.toFixed(3)} + γ·${vut.toFixed(3)} = ${((1 - g) * vsu + g * vut).toFixed(3)} = v₀,₁`, { size: 13, mono: true, weight: 700, tone: "code" }); }
      if (s >= 4) c.label(p.X(0.5), p.Y(-1.35), "short jumps teach the long one", { size: 14, weight: 700, tone: "predict" });
      if (s >= 5) { c.arrow(p.X(u), p.Y(xu), p.X(1), p.Y(x1 - 0.35), { tone: "bad", width: 2, dash: true });
        c.label(p.X(0.92), p.Y(x1 - 0.55), "error inherited", { size: 13, weight: 700, tone: "bad", anchor: "end" }); }
    };
  };

  D["selfdistill"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      if (s <= 2) {
        const t = c.box({ x: 20, y: 30, w: 250, h: 60, label: "run 1: flow teacher", tone: "muted", hl: s === 1 });
        const st = c.box({ x: 370, y: 30, w: 250, h: 60, label: "run 2: jump student", tone: "take", hl: s === 1 });
        c.connect(t, st, { tone: "muted", label: "frozen" });
      }
      if (s >= 2) c.box({ x: 20, y: s === 2 ? 130 : 30, w: 600, h: 56, label: "loss = | check residual |²", mono: true, size: 15, tone: "predict", hl: s === 2 });
      if (s >= 3) {
        const net = c.box({ x: 170, y: 120, w: 300, h: 64, label: "one network vₛ,ₜ", tone: "take", hl: s === 3 });
        const dg = c.box({ x: 20, y: 220, w: 280, h: 56, label: "diagonal vₜ,ₜ: teacher", size: 14, tone: "code", hl: s === 3 });
        const od = c.box({ x: 340, y: 220, w: 280, h: 56, label: "off-diagonal vₛ,ₜ: student", size: 14, tone: "take", hl: s === 3 });
        c.connect(net, dg, { tone: "code" }); c.connect(net, od, { tone: "take" });
      }
      if (s >= 4) c.text(320, 314, "𝓛_SD = 𝓛_b (diagonal) + 𝓛_D (off-diagonal)", { size: 15, mono: true, anchor: "middle", weight: 700, tone: s === 4 ? "predict" : "ink" });
      if (s >= 5) c.chips({ x: 180, y: 330, items: [{ t: "LSD", tone: "code", hl: true }, { t: "ESD", tone: "bad" }, { t: "PSD", tone: "predict" }], size: 13 });
    };
  };

  D["lsd-loss"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const a = c.box({ x: 10, y: 20, w: 190, h: 56, label: "ε, x₁, s < t", sub: "I_s on their line", tone: "paper", hl: s === 1 });
      if (s >= 2) { const j = c.box({ x: 240, y: 20, w: 390, h: 56, label: "X̂ = I_s + (t − s)·v̂ₛ,ₜ(I_s)", mono: true, size: 14, tone: "take", hl: s === 2 }); c.connect(a, j, { tone: "paper" });
        if (s >= 3) { const sp = c.box({ x: 240, y: 120, w: 180, h: 56, label: "∂t X̂", sub: "landing speed", mono: true, tone: "predict", hl: s === 3 }); c.connect(j, sp, { tone: "take" });
          if (s >= 4) { const tg = c.box({ x: 450, y: 120, w: 180, h: 56, label: "sg[ v̂ₜ,ₜ(X̂) ]", sub: "velocity at landing", mono: true, size: 13, tone: "code", hl: s === 4 }); c.connect(j, tg, { tone: "take" });
            if (s >= 5) { const r = c.box({ x: 240, y: 230, w: 390, h: 60, label: "| ∂t X̂ − sg[ v̂ₜ,ₜ(X̂) ] |²", mono: true, size: 15, tone: "bad", hl: true });
              c.connect(sp, r, { tone: "predict" }); c.connect(tg, r, { tone: "code" }); } } } }
    };
  };

  D["residual"] = (fig, k) => {
    const m = k.toggle({ label: "candidate", options: ["A: straight jump", "B: true map"], value: "A: straight jump" });
    const ts = k.slider({ label: "t", min: 0.1, max: 0.9, step: 0.05, value: 0.5, fmt: (v) => v.toFixed(2) });
    k.follow(m, { 1: "A: straight jump", 4: "B: true map" });
    k.follow(ts, { 1: 0.5, 2: 0.5, 3: 0.75 });
    const c = k.canvas(W, H);
    const B0 = vel(X0, 0);
    return (s) => {
      c.clear();
      const isA = m.value.startsWith("A"), t = ts.value;
      const p = tplot(c, { series: [{ x: TRAJ.x, y: TRAJ.y, tone: "muted", width: 1.4 }] });
      if (isA) c.line(p.X(0), p.Y(X0), p.X(1), p.Y(X0 + B0), { tone: "bad", width: 2.4 });
      const y = isA ? X0 + t * B0 : flow(X0, 0, t);
      const h = 0.002, speed = isA ? B0 : (flow(X0, 0, t + h) - flow(X0, 0, t - h)) / (2 * h), b = vel(y, t), dt = 0.08;
      const clip = (v) => Math.max(-1.2, Math.min(1.2, v * dt));
      c.dot(p.X(t), p.Y(y), { r: 7, tone: isA ? "bad" : "code" });
      c.arrow(p.X(t), p.Y(y), p.X(t + dt), p.Y(y + clip(speed)), { tone: "predict", width: 3 });
      if (s >= 2) c.arrow(p.X(t), p.Y(y), p.X(t + dt), p.Y(y + clip(b)), { tone: "take", width: 2.2, dash: true });
      c.label(p.X(0.5), p.Y(-1.0), `lands ${y.toFixed(3)} · speed ${f3(speed)}`, { size: 14, mono: true, weight: 700, tone: "predict" });
      if (s >= 2) c.label(p.X(0.5), p.Y(-1.35), `flow there ${f3(b)} · residual ${f3(speed - b)}`, { size: 14, mono: true, weight: 700, tone: Math.abs(speed - b) > 0.01 ? "bad" : "code" });
      if (s >= 5) c.label(p.X(0.25), p.Y(1.4), "gradient steps: A → B", { size: 14, weight: 700, tone: "take" });
    };
  };

  D["jvp"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const ins = c.chips({ x: 20, y: 30, items: [{ t: "s", tone: "paper" }, { t: "t", tone: "predict", hl: s === 2 }, { t: "x", tone: "paper" }], size: 16 });
      c.text(20, 22, "inputs", { size: 12, tone: "muted" });
      if (s >= 2) { c.chips({ x: 20, y: 100, items: [{ t: "0", tone: "muted" }, { t: "1", tone: "predict", hl: true }, { t: "0", tone: "muted" }], size: 16 });
        c.text(20, 92, "tangent", { size: 12, tone: "muted" }); }
      const net = c.box({ x: 200, y: 40, w: 180, h: 90, label: "head v(s, t, x)", tone: "take", hl: s === 2 });
      if (s >= 1) c.box({ x: 20, y: 160, w: 360, h: 50, label: "∂t X = v + (t − s)·∂t v", mono: true, size: 15, tone: "predict", hl: s === 1 });
      if (s >= 2) { const o1 = c.box({ x: 430, y: 30, w: 200, h: 46, label: "v", mono: true, tone: "take" }); const o2 = c.box({ x: 430, y: 96, w: 200, h: 46, label: "∂t v", mono: true, tone: "predict" });
        c.connect(net, o1, { tone: "take" }); c.connect(net, o2, { tone: "predict" }); }
      if (s >= 3) c.box({ x: 20, y: 228, w: 610, h: 46, label: "torch.func.jvp(v_t, (s, t, x_s), (0, 1, 0))", mono: true, size: 14, tone: "code", hl: s === 3 });
      if (s >= 4) { c.text(20, 306, "cost", { size: 13, tone: "muted" });
        c.add(k.h("rect", { x: 60, y: 294, width: 160, height: 18, rx: 3, class: "f-muted" })); c.text(226, 308, "forward 1×", { size: 12, inBox: true });
        c.add(k.h("rect", { x: 60, y: 318, width: 240, height: 18, rx: 3, class: `f-predict${s === 4 ? "" : " soft"}` })); c.text(306, 332, "jvp ≈ 1.5×", { size: 12, inBox: true }); }
      if (s >= 5) c.box({ x: 400, y: 292, w: 230, h: 46, label: "custom LayerNorm for jvp", size: 13, tone: "code", hl: true });
    };
  };

  D["stopgrad"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const data = c.box({ x: 10, y: 30, w: 170, h: 56, label: "data slopes x₁ − ε", size: 13, tone: "paper", hl: s === 1 });
      const dg = c.box({ x: 230, y: 30, w: 180, h: 56, label: "diagonal vₜ,ₜ", tone: "code", hl: s === 1 });
      c.connect(data, dg, { tone: "paper", label: "flow matching" });
      if (s >= 2) { const od = c.box({ x: 230, y: 170, w: 180, h: 56, label: "off-diagonal vₛ,ₜ", tone: "take", hl: s === 2 });
        c.connect(dg, od, { tone: "code", label: "teaches" });
        if (s >= 3) { c.arrow(440, 190, 440, 70, { tone: "bad", width: 2, dash: true });
          c.label(470, 128, "✕ no gradient back", { size: 14, tone: "bad", weight: 700 }); } }
      if (s >= 4) c.box({ x: 10, y: 250, w: 620, h: 44, label: "backprop through jvp: unstable on images (App. F.4 LSD)", size: 13, tone: "bad", hl: s === 4 });
      if (s >= 5) c.box({ x: 10, y: 304, w: 620, h: 44, label: "Pocket TTS “minimal”: gradient reaches x, not the target’s weights", size: 13, tone: "code", hl: true });
    };
  };

  D["stability"] = (fig, k) => {
    const c = k.canvas(W, H);
    const it = Array.from({ length: 41 }, (_, i) => i);
    return (s) => {
      c.clear();
      const ser = [];
      if (s >= 1) ser.push({ x: it, y: it.map((i) => 1 + 0.002 * i * i * (s >= 2 ? 1 : 0.4)), tone: "bad", label: "ESD", labelAt: 40, width: s <= 2 ? 3 : 1.6 });
      if (s >= 3) ser.push({ x: it, y: it.map((i) => 1.15 + 0.1 * Math.sin(i / 3)), tone: "predict", label: "PSD", labelAt: 20, width: s === 3 ? 3 : 1.6 });
      if (s >= 4) ser.push({ x: it, y: it.map((i) => 0.8 + 0.06 * Math.sin(i / 4)), tone: "code", label: "LSD", labelAt: 30, width: 3 });
      c.plot({ series: ser, xmin: 0, xmax: 40, ymin: 0, ymax: 4.5, xlabel: "training iterations (schematic)", ylabel: "parameter gradient norm", xFmt: () => "", yFmt: () => "" });
      if (s >= 2) c.label(560, 40, "diverged", { size: 14, tone: "bad", weight: 700 });
      if (s >= 3) c.label(300, 200, "PSD: errors compound, no bound", { size: 13, tone: "predict" });
      if (s >= 5) c.label(200, 300, "CALM: LSD “more stable at training” (§3.2)", { size: 13, tone: "code", weight: 700 });
    };
  };

  D["bound"] = (fig, k) => {
    const L = k.slider({ label: "L̂ (Lipschitz)", min: 0, max: 3, step: 0.1, value: 1, fmt: (v) => v.toFixed(1) });
    const E = k.slider({ label: "loss ε", min: 0.001, max: 0.05, step: 0.001, value: 0.01, fmt: (v) => v.toFixed(3) });
    k.follow(L, { 1: 1, 3: 2.5 });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const fac = (l) => 4 * Math.exp(1 + 2 * l);
      if (s >= 2) {
        const ls = Array.from({ length: 31 }, (_, i) => i / 10);
        const p = c.plot({ series: [{ x: ls, y: ls.map(fac), tone: "take" }], x: 0, y: 90, w: 640, h: 270, ylog: true, xmin: 0, xmax: 3, ymin: 1, ymax: 10000,
          xlabel: "L̂", ylabel: "factor 4e^{1+2L̂}", xFmt: (v) => v.toFixed(1), yFmt: (v) => String(v) });
        c.dot(p.X(L.value), p.Y(fac(L.value)), { r: 8, tone: "predict" });
      }
      c.text(320, 34, `W₂² ≤ 4·e^(1+2·${L.value.toFixed(1)}) · ${E.value.toFixed(3)} = ${(fac(L.value) * E.value).toFixed(3)}`, { size: 17, mono: true, anchor: "middle", weight: 700, tone: s === 3 ? "bad" : "predict" });
      if (s >= 4) c.text(320, 66, "PSD: no such bound found (§2.3 LSD)", { size: 14, anchor: "middle", tone: "bad", weight: 700 });
    };
  };

  D["weight"] = (fig, k) => {
    const lv = k.slider({ label: "loss 𝓛 at this (s, t)", min: -2, max: 2, step: 0.1, value: 0.7, fmt: (v) => (10 ** v).toFixed(v < 0 ? 3 : 1) });
    const c = k.canvas(W, H);
    const RAW = [["(0.1, 0.2)", 0.04], ["(0.3, 0.9)", 2.5], ["(0.5, 0.6)", 0.3], ["(0.0, 1.0)", 6.0]];   // illustrative
    return (s) => {
      c.clear();
      if (s === 1 || s === 4) {
        tbars(c, RAW.map(([l, v]) => [l, s === 1 ? v : 1, false]), { max: s === 1 ? 7 : 2, labelW: 120, fmt: (v) => v.toFixed(2), h: 260 });
        title(c, s === 1 ? "raw loss at four (s, t) pairs" : "weighted: e^(−w)·𝓛 at w = log 𝓛 → 1 each");
        return;
      }
      if (s === 5) { c.box({ x: 120, y: 60, w: 400, h: 60, label: "wₛ,ₜ = MLP(s, t)", mono: true, size: 16, tone: "take", hl: true });
        c.box({ x: 120, y: 150, w: 400, h: 50, label: "2 → 32 → 32 → 32 → 1, zero-initialized", size: 14, tone: "code" });
        c.text(320, 250, "samplers.py, class LSD, w_s_t", { size: 13, anchor: "middle", tone: "muted", mono: true }); return; }
      const Lval = 10 ** lv.value, ws = Array.from({ length: 81 }, (_, i) => -4 + i * 0.1);
      const p = c.plot({ series: [{ x: ws, y: ws.map((w) => Math.exp(-w) * Lval + w), tone: "take" }], xmin: -4, xmax: 4, ymin: -1, ymax: 8,
        xlabel: "learned w", ylabel: "e^(−w)·𝓛 + w", xFmt: (v) => v.toFixed(0), yFmt: (v) => v.toFixed(0) });
      if (s >= 3) { const wb = Math.log(Lval); c.dot(p.X(wb), p.Y(1 + wb), { r: 8, tone: "predict" });
        c.label(p.X(wb), p.Y(1 + wb) + 28, `best w = log 𝓛 = ${wb.toFixed(2)}`, { size: 14, mono: true, tone: "predict", weight: 700 }); }
    };
  };

  D["times"] = (fig, k) => {
    const m = k.toggle({ label: "sampling", options: ["LSD paper", "Pocket TTS"], value: "LSD paper" });
    k.follow(m, { 1: "LSD paper", 2: "LSD paper", 3: "Pocket TTS" });
    const c = k.canvas(W, H);
    const sig = (z) => 1 / (1 + Math.exp(-z));
    return (s) => {
      c.clear();
      const q = square(c, k, {});
      c.line(q.X(0), q.Y(0), q.X(1), q.Y(1), { tone: "muted", width: 1.2 });
      seed = 21;
      const code = m.value === "Pocket TTS";
      for (let i = 0; i < 300; i++) {
        let a, b;
        if (code) { const z1 = gauss() + 0.4, z2 = gauss() + 0.4; a = sig(Math.min(z1, z2)); b = sig(Math.max(z1, z2)); }
        else { a = rnd(); b = rnd(); if (a > b) [a, b] = [b, a]; }
        const diag = i < 225;                                   // η = 0.75
        if (diag) { const t = code ? sig(gauss() + 0.4) : rnd(); c.dot(q.X(t), q.Y(t), { r: 2.2, tone: "code" }); }
        else if (s >= 2) c.dot(q.X(a), q.Y(b), { r: 2.6, tone: s === 4 ? "predict" : "take" });
      }
      c.text(462, 60, "225 diagonal (η 0.75)", { size: 12, tone: "code", weight: 700 });
      if (s >= 2) c.text(462, 84, "75 off-diagonal", { size: 12, tone: "take", weight: 700 });
      if (s >= 3) c.text(462, 120, code ? "logit-normal μ 0.4" : "uniform", { size: 12, tone: "predict", weight: 700 });
      if (s >= 4) c.text(462, 144, "s = min, t = max", { size: 12, tone: "predict", weight: 700 });
    };
  };

  D["lsd-cost"] = (fig, k) => {
    const eta = k.slider({ label: "η (diagonal share)", min: 0, max: 1, step: 0.05, value: 0.75, fmt: (v) => v.toFixed(2) });
    const c = k.canvas(W, H);
    const C = 1.5;                                               // App. F.3 LSD
    return (s) => {
      c.clear();
      const e = eta.value, sd = (1 - e) * (1 + C) + e;
      const rows = [["flow matching", 1, s === 1]];
      if (s >= 2) rows.push(["LSD term alone", 1 + C, s === 2]);
      if (s >= 3) rows.push([`mix at η = ${e.toFixed(2)}`, sd, s === 3]);
      tbars(c, rows, { max: 3, labelW: 150, fmt: (v) => `${v.toFixed(2)} B`, h: 200 });
      title(c, "forward evaluations per batch of B");
      if (s >= 4) c.box({ x: 10, y: 260, w: 620, h: 60, label: "Pocket TTS: distil term on 1 step in 4, ×4 weight → ~9% faster", size: 14, tone: "code", hl: true });
    };
  };

  D["lsd-sample"] = (fig, k) => {
    const N = [1, 2, 4];
    const ni = k.slider({ label: "steps", min: 0, max: 2, step: 1, value: 0, fmt: (v) => String(N[v]) });
    k.follow(ni, { 1: 0, 3: 2 });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      if (s === 5) {
        tbars(c, [["1 step", 12.22, true], ["2 steps", 5.74], ["4 steps", 3.18], ["8 steps", 2.18], ["16 steps", 1.96]], { max: 14, labelW: 100, fmt: (v) => v.toFixed(2), h: 290 }); // Table 1 LSD (CelebA-64)
        title(c, "LSD on CelebA-64: FID (lower is better)"); return;
      }
      const p = tplot(c, { series: [{ x: TRAJ.x, y: TRAJ.y, tone: "muted", width: 1.4 }] });
      const n = N[ni.value]; let x = X0;
      for (let i = 0; i < n; i++) { const y = flow(x, i / n, (i + 1) / n); c.arrow(p.X(i / n), p.Y(x), p.X((i + 1) / n), p.Y(y), { tone: "take", width: 2.6 }); x = y; }
      c.dot(p.X(1), p.Y(x), { r: 8, tone: "code" });
      c.label(p.X(0.5), p.Y(-1.1), `${n} call${n > 1 ? "s" : ""} → ${x.toFixed(3)}`, { size: 15, mono: true, weight: 700, tone: "take" });
      if (s >= 2) c.label(p.X(0.5), p.Y(-1.4), "x₁ = ε + v(0, 1, ε)", { size: 14, mono: true, tone: "code", weight: 700 });
      if (s >= 4) c.label(p.X(0.3), p.Y(1.4), "exact map: every step count agrees", { size: 14, tone: "predict", weight: 700 });
    };
  };

  D["family"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => board(c, [
      ["Consistency models", "Eulerian · Xₛ,₁ only", "bad"],
      ["sCM (CALM's first head)", "Eulerian · continuous time", "bad"],
      ["MeanFlow", "Eulerian · trained directly", "bad"],
      ["Shortcut models", "Semigroup · discrete split", "predict"],
      ["LSD", "Lagrangian · self-distilled", "code"],
    ], s);                                                       // App. B–D LSD
  };

  D["lsd-results"] = (fig, k) => {
    const SN = ["1", "2", "4", "8", "16"];
    const st = k.toggle({ label: "steps", options: SN, value: "1" });
    k.follow(st, { 1: "1", 4: "16" });
    const T = {                                                  // Table 1 LSD (FID)
      "CIFAR · LSD": [8.10, 4.37, 3.34, 3.33, 3.57], "CIFAR · PSD-M": [12.81, 8.43, 5.96, 5.07, 4.64], "CIFAR · PSD-U": [13.61, 7.95, 6.03, 5.32, 5.16],
      "CelebA · LSD": [12.22, 5.74, 3.18, 2.18, 1.96], "CelebA · PSD-M": [19.64, 11.75, 7.89, 6.06, 5.09], "CelebA · PSD-U": [18.81, 11.02, 7.47, 6.00, 5.63],
      "AFHQ · LSD": [11.19, 7.78, 7.00, 5.89, 5.61], "AFHQ · PSD-M": [18.86, 14.75, 14.40, 13.26, 11.07], "AFHQ · PSD-U": [14.50, 10.73, 10.99, 12.02, 11.47] };
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const j = SN.indexOf(st.value), focus = ["CIFAR", "CelebA", "AFHQ"][s - 1];
      c.bars({ x: 10, y: 24, w: 620, rowH: 36, labelW: 130, max: 20, fmt: (v) => v.toFixed(2), tones: ["paper"],
        rows: Object.entries(T).map(([l, v]) => ({ label: l, values: [v[j]], hl: l.endsWith("LSD") && (!focus || l.startsWith(focus)), dim: focus && !l.startsWith(focus) })) });
      title(c, `FID at ${st.value} step${st.value === "1" ? "" : "s"} (lower is better)`);
    };
  };

  D["notation"] = (fig, k) => {
    const c = k.canvas(W, H);
    const R = [["noise at", "t = 0", "t = 1"], ["the jump", "x + (t − s)·vₛ,ₜ", "x + (s − t)·F(x, t, s)"], ["LSD loss", "∂t X vs vₜ,ₜ(X)", "∂s f vs F⁻(f, s, s)"], ["one step", "X₀,₁(ε)", "f(ε, 1, 0)"], ["name", "Lagrangian", "“Latent” (§3.2) / Lagrangian"]];
    return (s) => {
      c.clear();
      c.text(240, 22, "LSD paper · Pocket TTS", { size: 13, anchor: "middle", weight: 700, tone: "code" });
      c.text(500, 22, "CALM App. A", { size: 13, anchor: "middle", weight: 700, tone: "predict" });
      R.forEach(([a, b, d], i) => {
        if (s < i + 1) return;
        const y = 36 + i * 62, now = s === i + 1;
        c.text(16, y + 32, a, { size: 13, weight: 700, maxW: 100, lines: 1 });
        c.box({ x: 120, y, w: 240, h: 50, label: b, mono: true, size: 13, tone: "code", hl: now });
        c.box({ x: 380, y, w: 250, h: 50, label: d, mono: true, size: 13, tone: i === 4 ? "bad" : "predict", hl: now });
      });
    };
  };

  // ======================================================= THE CALM MACHINE
  D["machine"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const au = c.box({ x: 10, y: 20, w: 130, h: 50, label: "audio", tone: "bridge" });
      const en = c.box({ x: 170, y: 20, w: 150, h: 50, label: "VAE encoder", tone: "bridge", hl: s === 1 });
      const fr = c.box({ x: 350, y: 20, w: 280, h: 50, label: "frames: 32 numbers / 80 ms", size: 14, tone: "paper", hl: s === 1 });
      c.connect(au, en, { tone: "bridge" }); c.connect(en, fr, { tone: "bridge" });
      if (s >= 2) { const bb = c.box({ x: 350, y: 110, w: 280, h: 56, label: "causal backbone", sub: "text + past frames → z", tone: "take", hl: s === 2 }); c.connect(fr, bb, { tone: "paper" });
        if (s >= 3) { const sc = c.box({ x: 10, y: 110, w: 300, h: 56, label: "short-context transformer", sub: "last K clean frames (music)", size: 13, tone: "muted", dashed: true, hl: s === 3 }); c.connect(fr, sc, { tone: "muted", dash: true, route: "elbow" }); }
        if (s >= 4) { const hd = c.box({ x: 350, y: 206, w: 280, h: 56, label: "one-step head", sub: "noise + z → next frame", tone: "predict", hl: s === 4 }); c.connect(bb, hd, { tone: "take" });
          if (s >= 5) { const de = c.box({ x: 350, y: 296, w: 280, h: 50, label: "VAE decoder → 80 ms audio", size: 14, tone: "bridge", hl: true }); c.connect(hd, de, { tone: "predict" });
            c.text(170, 330, "frame fed back each step", { size: 13, anchor: "middle", tone: "take", weight: 700 }); } } }
    };
  };

  D["vae"] = (fig, k) => {
    const sec = k.slider({ label: "audio", min: 1, max: 10, step: 1, value: 1, fmt: (v) => `${v} s` });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const S = sec.value;
      c.box({ x: 10, y: 14, w: 620, h: 46, label: `${(24000 * S).toLocaleString()} samples at 24 kHz`, size: 14, tone: "bridge", hl: s === 1 }); // Table 13
      if (s >= 2) { c.chips({ x: 10, y: 80, items: ["×6", "×5", "×4", "×4", "×4"].map((t) => ({ t, tone: "predict", hl: s === 2 })), size: 15 });
        c.text(630, 104, "6·5·4·4·4 = 1,920 samples = 80 ms", { size: 14, mono: true, anchor: "end", weight: 700, tone: "predict" }); }
      if (s >= 3) { const n = Math.round(12.5 * S), show = Math.min(n, 25), w = 600 / 25;
        for (let i = 0; i < show; i++) c.box({ x: 10 + i * w, y: 140, w: w - 3, h: 60, tone: "paper", hl: s === 3, r: 3 });
        c.text(630, 226, `${(12.5 * S).toFixed(1)} frames × 32 = ${(400 * S).toLocaleString()} numbers`, { size: 14, mono: true, anchor: "end", weight: 700, tone: "paper" }); }
      if (s >= 4) c.box({ x: 10, y: 248, w: 400, h: 44, label: "8 encoder + 8 decoder transformer layers", size: 13, tone: "take", hl: s === 4 });
      if (s >= 5) c.box({ x: 10, y: 304, w: 620, h: 44, label: "music VAE: 32 kHz · 25 Hz · 128 numbers per frame", size: 13, tone: "muted", hl: true });
    };
  };

  D["vae-loss"] = (fig, k) => {
    const c = k.canvas(W, H);
    const T = [["time recon.", 0, 4], ["freq. recon.", 0, 4], ["adversarial", 1, 1], ["feature match", 1, 1], ["KL (0.01)", 0.4, 2], ["WavLM distil (25)", 1.6, 3]]; // Eq. 2, Table 13
    return (s) => {
      c.clear();
      tbars(c, T.map(([l, v, st]) => [l, s >= st ? (st === 4 ? 0.02 : v) : 0.02, s === st]), { max: 2, labelW: 150, fmt: (v) => (v < 0.05 ? (s >= 4 ? "off" : "") : ""), h: 270 });
      title(c, "speech VAE losses (heights schematic)");
      if (s >= 5) c.text(20, 340, "Mimi distils codebook 1 only; this VAE distils all 32 numbers", { size: 13, tone: "code", weight: 700 });
    };
  };

  D["backbone"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const items = [{ t: "▁Hello", tone: "paper" }, { t: "▁world", tone: "paper" }, { t: ".", tone: "paper" }];
      if (s >= 2) for (let i = 1; i <= 5; i++) items.push({ t: `f${i}`, tone: "bridge", hl: s === 2 });
      c.chips({ x: 10, y: 20, items, size: 15 });
      c.text(10, 14, "input sequence", { size: 12, tone: "muted" });
      if (s >= 3) { const bb = c.box({ x: 10, y: 90, w: 620, h: 60, label: "causal transformer: step s sees text + frames 1…s−1", size: 14, tone: "take", hl: s === 3 }); }
      if (s >= 4) { c.chips({ x: 10, y: 176, items: [1, 2, 3, 4, 5, 6].map((i) => ({ t: `z${i}`, tone: "take", hl: s === 4 })), size: 15 });
        c.box({ x: 10, y: 226, w: 620, h: 46, label: "TTS: 24 layers · width 1024 · 16 heads · 302M", size: 14, tone: "take", hl: s === 4 }); }
      if (s >= 5) c.box({ x: 10, y: 290, w: 300, h: 50, label: "linear → end-of-speech?", size: 14, tone: "bad", hl: true });
    };
  };

  D["noise-inj"] = (fig, k) => {
    const kk = k.slider({ label: "noise k", min: 0, max: 1, step: 0.05, value: 0.5, fmt: (v) => v.toFixed(2) });
    k.follow(kk, { 1: 0, 2: 0.5, 4: 0 });
    const c = k.canvas(W, H);
    seed = 31; const XF = Array.from({ length: 24 }, () => gauss()), EP = Array.from({ length: 24 }, () => gauss());
    return (s) => {
      c.clear();
      const K = kk.value, Y = XF.map((x, i) => Math.sqrt(K) * EP[i] + Math.sqrt(1 - K) * x);
      const row = (vals, y0, tone, lab) => { c.text(10, y0 - 50, lab, { size: 13, weight: 700, tone });
        vals.forEach((v, i) => c.add(k.h("rect", { x: 30 + i * 24, y: v > 0 ? y0 - v * 22 : y0, width: 18, height: Math.abs(v) * 22 + 1, class: `f-${tone}` })));
        c.line(26, y0, 610, y0, { tone: "muted", width: 1 }); };
      row(XF, 100, "paper", "clean past frame");
      if (s >= 2) row(Y, 240, "bad", s === 4 ? "inference: clean (k = 0)" : `backbone sees: √${K.toFixed(2)}·ε + √${(1 - K).toFixed(2)}·x`);
      if (s >= 3) c.text(620, 340, `variance ${K.toFixed(2)} + ${(1 - K).toFixed(2)} = 1`, { size: 15, mono: true, anchor: "end", weight: 700, tone: "code" });
      if (s >= 5) c.text(20, 340, "speech models: not used (§5.1)", { size: 14, weight: 700, tone: "muted" });
    };
  };

  D["short-ctx"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      if (s === 5) { tbars(c, [["K = 5", 0.85], ["K = 10", 0.76, true], ["K = 20", 0.73], ["K = 40", 0.78]], { max: 1, labelW: 90, fmt: (v) => v.toFixed(2), h: 260 }); // Table 8
        title(c, "FAD after 500k steps (lower is better)"); return; }
      for (let i = 0; i < 24; i++) c.box({ x: 10 + i * 25.5, y: 30, w: 22, h: 40, tone: i >= 14 && s >= 2 ? "code" : "muted", hl: i >= 14 && s === 3, r: 3 });
      const lg = c.box({ x: 10, y: 120, w: 300, h: 56, label: "backbone: all frames, noisy", size: 14, tone: "take", dim: s === 1 ? false : true });
      if (s === 1) c.label(450, 150, "fades after 10–15 s", { size: 14, tone: "bad", weight: 700 });
      if (s >= 2) { const sh = c.box({ x: 330, y: 120, w: 300, h: 56, label: "short transformer: last K, clean", size: 14, tone: "code", hl: s === 2 });
        if (s >= 3) c.text(630, 98, "K = 10 frames = 0.4 s · 4 layers", { size: 13, anchor: "end", weight: 700, tone: "code" });
        if (s >= 4) { const sum = c.box({ x: 170, y: 240, w: 300, h: 56, label: "Z = z_long + z_short → head", mono: true, size: 14, tone: "predict", hl: true }); c.connect(lg, sum, { tone: "take" }); c.connect(sh, sum, { tone: "code" }); } }
    };
  };

  D["cm-head"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const ts = Array.from({ length: 51 }, (_, i) => i / 50 * Math.PI / 2), xd = 0.9, ep = -1.1;
      const p = c.plot({ series: s >= 3 ? [{ x: ts, y: ts.map((t) => Math.cos(t) * xd + Math.sin(t) * ep), tone: "muted" }] : [], xmin: 0, xmax: Math.PI / 2, ymin: -1.6, ymax: 1.6,
        xlabel: "diffusion time t (0 = data, π/2 = noise)", ylabel: "position", xFmt: (v) => v.toFixed(1), yFmt: (v) => v.toFixed(1) });
      c.dot(p.X(0), p.Y(xd), { r: 8, tone: "code" }); c.label(p.X(0) + 12, p.Y(xd) - 16, "clean frame", { size: 13, tone: "code", weight: 700 });
      [0.4, 0.8, 1.2, 1.5].forEach((t) => { const y = Math.cos(t) * xd + Math.sin(t) * ep; c.dot(p.X(t), p.Y(y), { r: 5, tone: "paper" }); if (s >= 1) c.arrow(p.X(t), p.Y(y), p.X(0) + 8, p.Y(xd), { tone: "take", width: 1.4 }); });
      if (s >= 2) c.label(p.X(0.75), p.Y(1.35), "f = c_skip·x_t + c_out·F", { size: 13, mono: true, tone: "take", weight: 700, anchor: "middle" });
      if (s >= 3) c.label(p.X(1.1), p.Y(-1.4), "x_t = cos t·x + sin t·ε", { size: 14, mono: true, tone: "muted", weight: 700 });
      if (s >= 4) c.label(p.X(0.9), p.Y(1.0), "loss uses df/dt (Eq. 3)", { size: 14, tone: "predict", weight: 700 });
      if (s >= 5) c.label(p.X(0.5), p.Y(-1.0), "Eulerian family (page 32)", { size: 14, tone: "bad", weight: 700 });
    };
  };

  D["lsd-head"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const z = c.box({ x: 10, y: 14, w: 140, h: 44, label: "z (backbone)", size: 13, tone: "take", hl: s === 1 });
      const sb = c.box({ x: 170, y: 14, w: 90, h: 44, label: "s", tone: "paper", hl: s === 1 });
      const tb = c.box({ x: 280, y: 14, w: 90, h: 44, label: "t", tone: "paper", hl: s === 1 });
      const xb = c.box({ x: 470, y: 14, w: 160, h: 44, label: "x (32 numbers)", size: 13, tone: "bridge", hl: s === 1 });
      if (s >= 2) { const cond = c.box({ x: 10, y: 100, w: 360, h: 50, label: "cond = proj(z) + (emb(s) + emb(t)) / 2", mono: true, size: 13, tone: "predict", hl: s === 2 });
        c.connect(z, cond, { tone: "take" }); c.connect(sb, cond, { tone: "paper" }); c.connect(tb, cond, { tone: "paper" });
        if (s >= 3) { const rb = c.box({ x: 330, y: 190, w: 300, h: 60, label: "residual MLP blocks, AdaLN", tone: "take", hl: s === 3 });
          c.connect(cond, rb, { tone: "predict", route: "elbow" }); c.connect(xb, rb, { tone: "bridge" });
          if (s >= 4) c.text(480, 274, "6 blocks · 512 wide · ~10M params", { size: 13, anchor: "middle", weight: 700, tone: "take" });
          if (s >= 5) { const o = c.box({ x: 330, y: 290, w: 300, h: 50, label: "vₛ,ₜ: 32 numbers", mono: true, tone: "code", hl: true }); c.connect(rb, o, { tone: "take" }); } } }
    };
  };

  D["head-step"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      c.chips({ x: 10, y: 14, items: [1, 2, 3, 4, 5, 6, 7].map((i) => ({ t: `f${i}`, tone: "bridge" })).concat(s >= 4 ? [{ t: "f8", tone: "code", hl: s === 4 }] : []), size: 14 });
      const bb = c.box({ x: 10, y: 70, w: 260, h: 54, label: "backbone (cached) → z", size: 14, tone: "take", hl: s === 1 });
      if (s >= 2) { const nz = c.box({ x: 370, y: 70, w: 260, h: 54, label: "ε ~ N(0, τ·I), 32 numbers", mono: true, size: 13, tone: "muted", hl: s === 2 }); }
      if (s >= 3) { const hd = c.box({ x: 120, y: 160, w: 400, h: 60, label: "x = ε + v(0, 1, ε | z)", mono: true, size: 16, tone: "predict", hl: s === 3 }); c.connect(bb, hd, { tone: "take" }); }
      if (s >= 4) c.text(320, 250, "frame 8 joins the input for step 9", { size: 14, anchor: "middle", weight: 700, tone: "code" });
      if (s >= 5) { c.box({ x: 120, y: 272, w: 400, h: 50, label: "VAE decoder → 1,920 samples (80 ms)", size: 14, tone: "bridge", hl: true });
        for (let i = 0; i < 60; i++) c.line(130 + i * 6.5, 340, 130 + i * 6.5, 340 - 10 * Math.abs(Math.sin(i * 0.7)), { tone: "bridge", width: 2 }); }
    };
  };

  D["head-mult"] = (fig, k) => {
    const n = k.slider({ label: "multiplier N", min: 1, max: 8, step: 1, value: 8 });
    k.follow(n, { 2: 4, 3: 8, 5: 4 });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      if (s === 4) { tbars(c, [["with N = 8", 0.93, true], ["without", 1.32]], { max: 1.5, labelW: 120, fmt: (v) => v.toFixed(2), h: 180 }); // Table 5
        title(c, "music FAD after 250k steps (lower is better)"); return; }
      const bb = c.box({ x: 10, y: 30, w: 240, h: 120, label: "backbone → z", sub: "expensive: once", tone: "take", hl: s === 1 });
      const N = n.value;
      for (let i = 0; i < N; i++) c.box({ x: 330, y: 20 + i * 40, w: 300, h: 32, label: s >= 3 ? `head: t, ε draw ${i + 1}` : `head copy ${i + 1}`, size: 12, tone: "predict", hl: s === 3 });
      c.text(130, 190, `${N} head losses per z`, { size: 15, anchor: "middle", weight: 700, tone: "predict" });
      if (s >= 5) c.text(130, 220, "Pocket TTS recipe: 4", { size: 14, anchor: "middle", weight: 700, tone: "code" });
    };
  };

  D["temp"] = (fig, k) => {
    const tau = k.slider({ label: "temperature τ", min: 0.1, max: 1, step: 0.05, value: 1, fmt: (v) => v.toFixed(2) });
    k.follow(tau, { 1: 1, 3: 0.3, 4: 0.7 });
    const c = k.canvas(W, H);
    seed = 41; const G = Array.from({ length: 2000 }, () => gauss());
    return (s) => {
      c.clear();
      const T = tau.value, sd = Math.sqrt(T), bins = new Array(30).fill(0);
      G.forEach((g) => { const b = Math.floor((g * sd + 3) / 0.2); if (b >= 0 && b < 30) bins[b]++; });
      const p = c.plot({ series: [], xmin: -3, xmax: 3, ymin: 0, ymax: 0.8, xlabel: "starting noise value", ylabel: "density", xFmt: (v) => v.toFixed(0), yFmt: (v) => v.toFixed(1) });
      bins.forEach((v, i) => c.add(k.h("rect", { x: p.X(-3 + i * 0.2) + 1, y: p.Y(v / 2000 / 0.2), width: p.X(0.2) - p.X(0) - 2, height: p.Y(0) - p.Y(v / 2000 / 0.2), class: "f-paper soft" })));
      const xs = Array.from({ length: 61 }, (_, i) => -3 + i * 0.1);
      c.add(k.h("polyline", { points: xs.map((x) => `${p.X(x)},${p.Y(Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI))}`).join(" "), class: "f-none s-muted", "stroke-width": 1.6, "stroke-dasharray": "5 4" }));
      c.label(p.X(1.8), p.Y(0.7), `std = √${T.toFixed(2)} = ${sd.toFixed(3)}`, { size: 15, mono: true, weight: 700, tone: "predict" });
      if (s >= 2) c.label(p.X(-1.9), p.Y(0.7), "N(0, 1)^(1/τ) ∝ N(0, τ)", { size: 14, mono: true, tone: "take", weight: 700 });
      if (s >= 5) c.label(p.X(-1.9), p.Y(0.45), "higher τ → more varied voices", { size: 13, tone: "code", weight: 700 });
    };
  };

  D["latent-cfg"] = (fig, k) => {
    const al = k.slider({ label: "α", min: 0, max: 3, step: 0.05, value: 1.5, fmt: (v) => v.toFixed(2) });
    k.follow(al, { 3: 1.5 });
    const c = k.canvas(W, H);
    const Z0 = [0.25, 0.35], ZC = [0.5, 0.6];                    // illustrative
    return (s) => {
      c.clear();
      if (s === 5) { tbars(c, [["no CFG", 2.39], ["latent CFG, α = 1.5", 1.81, true]], { max: 3, labelW: 170, fmt: (v) => v.toFixed(2), h: 180 }); // App. E.5
        title(c, "TTS word error rate (%)"); return; }
      const p = c.plot({ series: [], xmin: 0, xmax: 1.4, ymin: 0, ymax: 1.4, xlabel: "z dimension 1 (toy)", ylabel: "z dimension 2 (toy)", xFmt: (v) => v.toFixed(1), yFmt: (v) => v.toFixed(1) });
      if (s >= 2) { c.dot(p.X(Z0[0]), p.Y(Z0[1]), { r: 7, tone: "muted" }); c.label(p.X(Z0[0]) + 12, p.Y(Z0[1]) + 18, "Z without text", { size: 13, weight: 700 });
        c.dot(p.X(ZC[0]), p.Y(ZC[1]), { r: 7, tone: "paper" }); c.label(p.X(ZC[0]) - 10, p.Y(ZC[1]) - 16, "Z with text", { size: 13, tone: "paper", weight: 700, anchor: "end" }); }
      if (s >= 3) { const a = al.value, Z = [Z0[0] + a * (ZC[0] - Z0[0]), Z0[1] + a * (ZC[1] - Z0[1])];
        c.line(p.X(Z0[0]), p.Y(Z0[1]), p.X(Z[0]), p.Y(Z[1]), { tone: "predict", width: 1.6, dash: true });
        c.dot(p.X(Z[0]), p.Y(Z[1]), { r: 9, tone: "predict" });
        c.label(p.X(Z[0]) + 12, p.Y(Z[1]) + 20, `Z_cfg, α = ${a.toFixed(2)}`, { size: 14, weight: 700, tone: "predict" });
        if (s >= 4) c.label(p.X(1.05), p.Y(0.2), "→ head", { size: 14, weight: 700, tone: "take" }); }
      if (s === 1) c.label(p.X(0.7), p.Y(0.7), "one call: no path to steer", { size: 14, weight: 700, tone: "bad" });
    };
  };

  D["latent-distill"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const tc = c.box({ x: 10, y: 20, w: 280, h: 50, label: "teacher 24 layers, with text", size: 13, tone: "take", hl: s === 1 });
      const tu = c.box({ x: 10, y: 84, w: 280, h: 50, label: "teacher 24 layers, no text", size: 13, tone: "muted", hl: s === 1 });
      const zc = c.box({ x: 350, y: 50, w: 280, h: 54, label: "Z_cfg = Z∅ + α(Z_C − Z∅)", mono: true, size: 13, tone: "predict" });
      c.connect(tc, zc, { tone: "take" }); c.connect(tu, zc, { tone: "muted" });
      if (s >= 2) { const st = c.box({ x: 10, y: 180, w: 280, h: 56, label: s >= 4 ? "student: 6 layers" : "student backbone", tone: "code", hl: s === 2 || s === 4 });
        const l2 = c.box({ x: 350, y: 180, w: 280, h: 56, label: "ℓ2 to Z_cfg", tone: "bad", hl: s === 2 });
        c.connect(st, l2, { tone: "code" }); c.connect(zc, l2, { tone: "predict" }); }
      if (s >= 3) c.box({ x: 10, y: 262, w: 620, h: 44, label: "MLP head: copied from the teacher, unchanged", size: 14, tone: "take", hl: s === 3 });
      if (s >= 5) c.text(320, 340, "repo recipe today: distill_cfg_coef 2.0 (paper: α = 1.5)", { size: 13, anchor: "middle", weight: 700, tone: "code" });
    };
  };

  D["monologue"] = (fig, k) => {
    const c = k.canvas(W, H);
    const WORDS = ["so", "the", "plan", "is", "—", "—", "—", "—"];
    return (s) => {
      c.clear();
      const bb = c.box({ x: 10, y: 14, w: 620, h: 46, label: "Helium-1 backbone (2B text LM, trained on speech)", size: 14, tone: "take", hl: s === 1 });
      if (s >= 2) { c.text(10, 92, "text", { size: 13, weight: 700, tone: "paper" });
        WORDS.forEach((w, i) => c.box({ x: 70 + i * 70, y: 74, w: 62, h: 32, label: w, size: 13, tone: "paper", hl: s === 2, dim: w === "—" })); }
      if (s >= 3) { c.text(10, 150, "audio", { size: 13, weight: 700, tone: "bridge" });
        for (let i = 0; i < 8; i++) c.box({ x: 70 + (i + 2) * 70, y: 132, w: 62, h: 32, label: i < 6 ? `f${i + 1}` : "", size: 12, tone: "bridge", hl: s === 3, dim: i >= 6 });
        c.text(70, 190, "audio lags text by 2 frames = 160 ms", { size: 13, weight: 700, tone: "predict" }); }
      if (s >= 4) { const t = c.box({ x: 10, y: 220, w: 300, h: 50, label: "z → text logits", tone: "paper", hl: s === 4 }); const h = c.box({ x: 330, y: 220, w: 300, h: 50, label: "z → consistency head", tone: "predict", hl: s === 4 }); }
      if (s >= 5) c.text(320, 310, "2.2B backbone · 10M head", { size: 15, anchor: "middle", weight: 700, tone: "take" });
    };
  };

  D["tts-setup"] = (fig, k) => {
    const c = k.canvas(W, H);
    const DS = ["AMI", "Earnings-22", "GigaSpeech", "SPGISpeech", "TED-LIUM", "VoxPopuli", "LibriHeavy", "Emilia"]; // App. D
    return (s) => {
      c.clear();
      c.box({ x: 10, y: 14, w: 300, h: 56, label: "backbone 302M", tone: "take", hl: s === 1 }); c.box({ x: 330, y: 14, w: 300, h: 56, label: "LSD head 10M", tone: "predict", hl: s === 1 });
      if (s >= 2) c.box({ x: 10, y: 86, w: 620, h: 44, label: "text prefix (4k SentencePiece) + voice prompt audio", size: 14, tone: "paper", hl: s === 2 });
      if (s >= 3) { c.chips({ x: 10, y: 150, items: DS.map((t) => ({ t, tone: "bridge", hl: s === 3 })), size: 13, maxW: 620 });
        c.text(630, 236, "88k hours in total", { size: 15, anchor: "end", weight: 700, tone: "bridge" }); }
      if (s >= 4) c.box({ x: 10, y: 250, w: 300, h: 44, label: "lr 1e-4 · 24 layers · 16 heads", size: 13, tone: "take", hl: s === 4 });
      if (s >= 5) c.box({ x: 330, y: 250, w: 300, h: 44, label: "steps, batch, compute: not reported", size: 13, tone: "bad", hl: true });
    };
  };

  // ======================================================= DOES IT WORK?
  D["vae-table"] = (fig, k) => {
    const M = { "MOSNet ↑": [3.11, 3.15, 4], "ABX ↓ (%)": [9.4, 8.1, 12], "PESQ ↑": [2.13, 2.42, 3], "STOI ↑": [0.87, 0.90, 1], "MUSHRA ↑": [57.7, 66.0, 80] }; // Table 1
    const m = k.toggle({ label: "metric", options: ["frame rate", ...Object.keys(M)], value: "frame rate" });
    k.follow(m, { 1: "frame rate", 2: "MOSNet ↑", 3: "ABX ↓ (%)", 4: "PESQ ↑", 5: "MUSHRA ↑" });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      if (m.value === "frame rate") { tbars(c, [["Mimi, 8 RVQ", 12.5], ["VAE, 32 dims", 12.5, true]], { max: 15, labelW: 140, fmt: (v) => `${v} Hz`, h: 200 }); title(c, "frames per second"); return; }
      const [a, b, mx] = M[m.value];
      tbars(c, [["Mimi, 8 RVQ", a], ["VAE, 32 dims", b, true]], { max: mx, labelW: 140, fmt: (v) => String(v), h: 200 });
      title(c, m.value);
    };
  };

  D["cont-table"] = (fig, k) => {
    const tt = k.toggle({ label: "temperature", options: ["0.8", "1.0"], value: "0.8" });
    k.follow(tt, { 1: "0.8", 4: "1.0", 5: "0.8" });
    const c = k.canvas(W, H);
    const R = { "0.8": { rq: [26.8, 33.1, 2.75, 1870], calm: [23.8, 31.2, 3.45, 2023] }, "1.0": { rq: [52.4, 36.3, 2.42, 1841], calm: [42.9, 34.3, 2.82, 1947] } }; // Table 2
    const REF = [20.2, 25.2, 4.02, 2180];
    return (s) => {
      c.clear();
      const r = R[tt.value], col = s <= 3 ? [0, 2, 3][s - 1] : 2;
      const fmt = (v) => (v >= 100 ? String(v) : v.toFixed(v < 10 ? 2 : 1));
      c.matrix({ x: 200, y: 60, cell: 104, cellH: 56, data: [s >= 5 ? REF : [NaN, NaN, NaN, NaN], r.rq, r.calm], fmt: (v) => (Number.isFinite(v) ? fmt(v) : ""),
        tone: (i, j) => (j === col ? (i === 2 ? "code" : "predict") : "muted"), rowLabels: ["real speech", "RQ 8 RVQ", "CALM 1 step"], colLabels: ["PPX ↓", "VERT ↓", "quality ↑", "Elo ↑"], rowLabelW: 180 });
      c.text(320, 280, `temperature ${tt.value}`, { size: 15, anchor: "middle", weight: 700, tone: "predict" });
    };
  };

  D["amdahl"] = (fig, k) => {
    const p = k.slider({ label: "head share", min: 0.05, max: 0.95, step: 0.001, value: 0.267, fmt: (v) => `${(v * 100).toFixed(1)}%` });
    const S = k.slider({ label: "head speedup", min: 1, max: 30, step: 0.1, value: 12.3, fmt: (v) => `${v.toFixed(1)}×` });
    k.follow(p, { 1: 0.267, 4: 0.577 }); k.follow(S, { 1: 1, 2: 12.3, 4: 19.3 });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const P = p.value, Sp = s === 1 ? 1 : S.value, after = (1 - P) + P / Sp;
      const bar = (y, a, b, lab) => { c.text(10, y - 8, lab, { size: 13, weight: 700 });
        c.add(k.h("rect", { x: 10, y, width: 600 * a, height: 44, class: "f-take soft" }));
        c.add(k.h("rect", { x: 10 + 600 * a, y, width: Math.max(1, 600 * b), height: 44, class: "f-predict" }));
        c.text(18, y + 28, `backbone ${(a * 100).toFixed(1)}%`, { size: 12, inBox: true }); };
      bar(40, 1 - P, P, "before (= 1.000)");
      if (s >= 2) bar(140, 1 - P, P / Sp, `after: ${(1 - P).toFixed(3)} + ${(P / Sp).toFixed(3)} = ${after.toFixed(3)}`);
      if (s >= 3) c.text(620, 250, `overall ${(1 / after).toFixed(2)}× faster`, { size: 20, mono: true, anchor: "end", weight: 700, tone: "code" });
      if (s >= 5) c.text(620, 290, `head now ${((P / Sp) / after * 100).toFixed(1)}% of time`, { size: 16, mono: true, anchor: "end", weight: 700, tone: "predict" });
    };
  };

  D["tts-table"] = (fig, k) => {
    const M = { "WER ↓": [["F5-TTS (32 steps)", 2.42], ["DSM", 1.95], ["DiTAR (10 steps)", 2.39], ["CALM LSD (1 step)", 1.81]],
      "MUSHRA ↑": [["reference", 61.8], ["F5-TTS (32 steps)", 54.7], ["DSM", 60.2], ["CALM LSD (1 step)", 61.1]],
      "params (M)": [["F5-TTS", 336], ["DSM", 750], ["DiTAR", 600], ["SALAD", 350], ["CALM LSD", 313]],
      "SIM ↑": [["reference", 0.69], ["F5-TTS", 0.66], ["DSM", 0.67], ["DiTAR", 0.67], ["SALAD", 0.54], ["CALM LSD", 0.52]] }; // Table 3
    const MX = { "WER ↓": 3, "MUSHRA ↑": 70, "params (M)": 800, "SIM ↑": 0.8 };
    const m = k.toggle({ label: "metric", options: Object.keys(M), value: "WER ↓" });
    k.follow(m, { 1: "WER ↓", 2: "WER ↓", 3: "MUSHRA ↑", 4: "params (M)", 5: "SIM ↑" });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      tbars(c, M[m.value].map(([l, v]) => [l, v, l.startsWith("CALM"), s === 2 && !/steps/.test(l)]), { max: MX[m.value], labelW: 170, fmt: (v) => String(v), h: 300 });
      title(c, `${m.value} · LibriSpeech test-clean`);
    };
  };

  D["spk-puzzle"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      if (s >= 4) { tbars(c, [["reference", 1953], ["F5-TTS", 2032], ["DSM", 2112], ["CALM LSD", 1966, true]], { max: 2200, labelW: 130, fmt: (v) => String(v), h: 240 }); // Table 3
        title(c, "human speaker-similarity Elo ↑");
        if (s >= 5) c.text(20, 330, "same VAE: best on Table 1, worst on WavLM similarity", { size: 13, weight: 700, tone: "bad" }); return; }
      const rows = [["reference", 0.69, false], ["reference via VAE", 0.57, s === 2], ["CALM LSD", 0.52, s >= 1]];
      tbars(c, rows.filter((_, i) => s >= 2 || i !== 1), { max: 0.8, labelW: 160, fmt: (v) => v.toFixed(2), h: 220 }); // Table 3
      title(c, "WavLM speaker similarity ↑");
      if (s >= 3) c.text(20, 300, "0.52 sits just under the VAE's own 0.57 ceiling", { size: 14, weight: 700, tone: "predict" });
    };
  };

  D["lsd-vs-cm"] = (fig, k) => {
    const V = [["LSD, α = 1.5 (text)", 1.81, 0.52, 61.1], ["LSD, no CFG", 2.39, 0.52, 55.5], ["LSD, α = 1.25 (text + audio)", 1.86, 0.54, 56.2], ["consistency, α = 1.5", 1.93, 0.40, 46.8]]; // App. E.5
    const m = k.toggle({ label: "metric", options: ["MUSHRA ↑", "SIM ↑", "WER ↓"], value: "MUSHRA ↑" });
    k.follow(m, { 1: "MUSHRA ↑", 2: "SIM ↑", 3: "WER ↓", 4: "WER ↓", 5: "SIM ↑" });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const j = { "WER ↓": 1, "SIM ↑": 2, "MUSHRA ↑": 3 }[m.value], mx = { 1: 3, 2: 0.7, 3: 70 }[j];
      const focus = s <= 3 ? [0, 3] : s === 4 ? [0, 1] : [0, 2];
      tbars(c, V.map((r, i) => [r[0], r[j], i === 0, !focus.includes(i)]), { max: mx, labelW: 220, fmt: (v) => String(v), h: 280 });
      title(c, `${m.value} · same 313M TTS, one step, τ = 0.7`);
    };
  };

  D["music"] = (fig, k) => {
    const R = [["RQ 32 RVQ", 1.06, 2.85, 1824], ["RQ 16 RVQ", 1.43, 2.76, 1781], ["CALM CM 1 step", 0.83, 2.90, 1857], ["CALM CM 4 steps", 0.71, 3.07, 1847], ["CALM TrigFlow 100", 0.64, 3.12, 1921], ["MusicGen Medium", 1.72, 2.62, 1761]]; // Table 4
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      if (s === 5) { tbars(c, [["RQ 32 RVQ (CFG 3)", 0.93], ["CALM CM 4 steps (CFG 2)", 0.91, true], ["MusicGen Medium", 1.93]], { max: 2.2, labelW: 200, fmt: (v) => v.toFixed(2), h: 220 }); // Table 6
        title(c, "text-to-music FAD ↓ (Table 6)"); return; }
      const j = s === 4 ? 3 : s === 2 ? 2 : 1, mx = [0, 2, 4, 2000][j];
      const hl = { 1: [2], 2: [3], 3: [4], 4: [2, 0] }[s];
      tbars(c, R.map((r, i) => [r[0], r[j], hl.includes(i)]), { max: mx, labelW: 170, fmt: (v) => String(v), h: 300 });
      title(c, ["", "FAD ↓", "acoustic quality ↑ (1–5)", "enjoyment Elo ↑"][j] + " · music continuation");
    };
  };

  D["ablation"] = (fig, k) => {
    const R = [["full CALM (4 steps)", 0.93], ["− head multiplier", 1.32], ["− noise injection", 1.63], ["− short context", 4.03], ["− all three (≈ MAR)", 8.38]]; // Table 5
    const c = k.canvas(W, H);
    return (s) => { c.clear(); tbars(c, R.slice(0, s).map((r, i) => [r[0], r[1], i === s - 1]), { max: 9, labelW: 190, fmt: (v) => v.toFixed(2), h: 300 }); title(c, "FAD ↓ after 250k steps"); };
  };

  D["more-steps"] = (fig, k) => {
    const N = [1, 4, 10, 25, 50, 100], TF = [NaN, 28.83, 4.62, 0.79, 0.74, 0.64], CM = [0.83, 0.71, 0.73, 0.96, 1.46, 2.05]; // Table 9
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const ser = [];
      if (s === 1 || s >= 3) ser.push({ x: N.slice(1), y: TF.slice(1), tone: "take", dots: true, label: "TrigFlow (flow)", labelAt: 1, width: s === 1 ? 3 : 1.8 });
      if (s >= 2) ser.push({ x: N, y: CM, tone: "predict", dots: true, label: "consistency", labelAt: 5, width: s === 2 ? 3 : 1.8 });
      const p = c.plot({ series: ser, xlog: true, ylog: true, xmin: 1, xmax: 100, ymin: 0.5, ymax: 40, xlabel: "head steps (log)", ylabel: "FAD ↓ (log)", xFmt: (v) => String(v), yFmt: (v) => String(v) });
      if (s >= 3) { c.add(k.h("rect", { x: p.X(1), y: p.Y(40), width: p.X(10) - p.X(1), height: p.Y(0.5) - p.Y(40), class: "f-code softer" }));
        c.label(p.X(3), p.Y(20), "RTF < 1 zone", { size: 13, tone: "code", weight: 700 }); }
      if (s >= 4) c.label(p.X(30), p.Y(15), "LSD head: steps not tested in CALM", { size: 13, tone: "muted", weight: 700 });
    };
  };

  D["scale"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const R = [["CALM 1.3B", 0.71, 2], ["CALM 3B", 0.62, 2], ["RQ 32 RVQ 1.3B", 1.06, 3], ["RQ 32 RVQ 3B", 0.98, 3]]; // Table 10
      tbars(c, R.map(([l, v, st]) => [l, s >= st || s === 4 ? v : 0, s === st]), { max: 1.2, labelW: 160, fmt: (v) => (v ? v.toFixed(2) : ""), h: 260 });
      title(c, "music FAD ↓, 4 consistency steps");
      if (s === 1) c.text(20, 330, "3B: width 2048 · 32 heads · 48 layers", { size: 14, weight: 700, tone: "take" });
      if (s >= 4) c.text(20, 330, "−13% (CALM) vs −8% (RQ)", { size: 14, weight: 700, tone: "code" });
    };
  };

  D["pocket"] = (fig, k) => {
    const M = { "params (M)": [["F5-TTS", 336], ["DSM", 750], ["Chatterbox Turbo", 350], ["Kokoro", 82], ["Pocket TTS", 100]],
      "WER ↓": [["F5-TTS", 2.21], ["DSM", 1.84], ["Chatterbox Turbo", 3.24], ["Kokoro", 1.93], ["Pocket TTS", 1.84]],
      "audio Elo ↑": [["F5-TTS", 1949], ["DSM", 1959], ["Chatterbox Turbo", 2055], ["Pocket TTS", 2016]],
      "speaker Elo ↑": [["F5-TTS", 1946], ["DSM", 2037], ["Chatterbox Turbo", 2012], ["Pocket TTS", 1898]] }; // Table 12
    const MX = { "params (M)": 800, "WER ↓": 3.5, "audio Elo ↑": 2100, "speaker Elo ↑": 2100 };
    const m = k.toggle({ label: "metric", options: Object.keys(M), value: "params (M)" });
    k.follow(m, { 1: "params (M)", 2: "WER ↓", 3: "audio Elo ↑", 4: "speaker Elo ↑", 5: "params (M)" });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      tbars(c, M[m.value].map(([l, v]) => [l, v, l === "Pocket TTS"]), { max: MX[m.value], labelW: 160, fmt: (v) => String(v), h: 280 });
      title(c, m.value + " · LibriSpeech test-clean (enhanced)");
      if (s >= 5) c.text(20, 340, "faster than real time on CPU: Pocket TTS and Kokoro only", { size: 13, weight: 700, tone: "code" });
    };
  };

  // ======================================================= YOUR MOVE
  D["code-map"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => board(c, [
      ["LSD loss", "training/modules/samplers.py", "code"],
      ["sampling", "pocket_tts/models/flow_lm.py", "code"],
      ["LSD head", "pocket_tts/modules/mlp.py", "code"],
      ["latent CFG distil", "training/modules/model.py", "code"],
      ["recipes", "training/configs/*.yaml", "code"],
    ], s, 8, 68, 230);
  };

  D["code-diff"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => board(c, [
      ["diagonal / distil split", "every sample, 0.75 / 0.25", "predict"],
      ["distil term", "1 step in 4, ×4", "predict"],
      ["time sampling", "logit-normal, mean 0.4", "predict"],
      ["head multiplier", "4 (paper: 8)", "predict"],
      ["τ and CFG", "0.3 and 2.0 (paper: 0.7, 1.5)", "predict"],
    ], s, 8, 68, 250);
  };

  D["recipe"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => board(c, [
      ["quickstart data", "200 h English, ~15 GB", "paper"],
      ["parity data", "≥ 2,000 h", "paper"],
      ["teacher training", "400k steps, batch 64", "take"],
      ["GPU memory", "~56 GB, or 16 × 4 in ~16 GB", "take"],
      ["distil 24 → 6", "WER parity by ~50k steps", "code"],
    ], s, 8, 68, 230);
  };

  D["reviewer"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => board(c, [
      ["Where is LSD?", "App. A only; TTS only", "bad"],
      ["Labels", "“Latent”, wrong table ref", "predict"],
      ["Speaker SIM", "VAE puzzle unresolved", "bad"],
      ["Speech ablations", "“no gains”, no numbers", "predict"],
      ["Steelman", "humans, code, model released", "code"],
    ], s, 8, 68, 230);
  };

  D["verdict"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => board(c, [
      ["Intelligible?", "yes: WER 1.84 at 100M", "code"],
      ["Fast on CPU?", "yes: 1 head call / 80 ms", "code"],
      ["Trainable by you?", "yes: ~2,000 h, one big GPU", "code"],
      ["Voice match?", "weakest: speaker Elo 1898", "bad"],
      ["🧠 Your language", "test the codec first", "take"],
    ], s, 8, 68, 230);                                           // Table 12, App. F, code README
  };

  D["ideas"] = (fig, k) => {
    const c = k.canvas(W, H);
    const I = [["two LSD steps", 0.1, 0.55], ["toy LSD replica", 0.3, 0.75], ["LSD music head", 0.85, 0.85], ["speaker-SIM probe", 0.45, 0.35]];
    return (s) => {
      c.clear();
      const p = c.plot({ series: [], xmin: 0, xmax: 1, ymin: 0, ymax: 1, xlabel: "effort →", ylabel: "what you learn →", xFmt: () => "", yFmt: () => "" });
      I.forEach(([l, x, y], i) => { if (s < i + 1) return; const now = s === i + 1;
        c.dot(p.X(x), p.Y(y), { r: now ? 9 : 6, tone: now ? "predict" : "take" });
        c.label(p.X(x) + 14, p.Y(y) - 12, l, { size: 14, weight: now ? 700 : 400, tone: now ? "predict" : "ink" }); });
    };
  };
})();
