/* Drawings for the AudioLBM lesson. One entry per data-draw name. Each is
   redrawn on every step and control change. Numbers from the paper carry a
   // Table N comment; everything else is illustrative layout or live arithmetic. */
(function () {
  window.RD = window.RD || {}; RD.drawings = RD.drawings || {};
  const D = RD.drawings;
  const W = 640, H = 360;

  // ---------------------------------------------------------------- helpers
  const f2 = (v) => v.toFixed(2), f3 = (v) => v.toFixed(3);
  // seeded RNG (mulberry32) and a standard normal draw
  const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const normal = (r) => { const u = Math.max(1e-9, r()), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

  // Bridge-gmax schedule (App. G.2: g² from 0.001 to 1.0; form from Bridge-TTS):
  // f = 0, alpha = 1, sigma_t² = 0.4995 t² + 0.001 t, sigmaBar_t² = sigma_1² - sigma_t².
  const B0 = 0.001, B1 = 1.0;
  const s2 = (t) => 0.5 * (B1 - B0) * t * t + B0 * t;
  const S1 = s2(1);
  const bridgeAt = (t) => {
    const a = s2(t), b = S1 - a;
    return { wHR: b / S1, wLR: a / S1, std: Math.sqrt((a * b) / S1), sig: Math.sqrt(a), sigBar: Math.sqrt(b) };
  };

  // a checklist board: rows [question, answer, tone]; row i is lit on step i+1
  const board = (c, rows, s, o = {}) => {
    const top = o.top || 14, rh = o.rh || 54, qW = o.qW || 250;
    rows.forEach(([q, a, tone], i) => {
      if (s < i + 1) return;
      const y = top + i * rh, now = s === i + 1;
      const qb = c.box({ x: 16, y, w: qW, h: rh - 10, label: q, size: 14, tone: "muted", hl: now });
      const ans = c.box({ x: qW + 34, y, w: W - qW - 50, h: rh - 10, label: a, size: 13, tone, hl: now });
      if (now) c.connect(qb, ans, { tone });
    });
  };

  // ------------------------------------------------------- toolbox: band
  D["band"] = (fig, k) => {
    const rate = k.toggle({ label: "input rate", options: ["8 kHz", "12 kHz", "16 kHz", "24 kHz"], value: "8 kHz" });
    k.follow(rate, { 1: "8 kHz" });
    const read = k.readout("");
    const c = k.canvas(W, H);
    // illustrative speech-like envelope in dB
    const env = (f) => -10 - 18 * Math.log10(1 + f) - 1.2 * f + 6 * Math.exp(-(((f - 6) / 2) ** 2));
    return (s) => {
      c.clear();
      const nyq = parseInt(rate.value, 10) / 2;
      const xmax = s >= 2 ? 24 : Math.max(nyq, 12);
      read.textContent = `missing: ${Math.round(((24 - nyq) / 24) * 100)}% of 0–24 kHz`;
      const p = c.plot({ series: [], xmin: 0, xmax, ymin: -80, ymax: 0, y: 40, h: 320,
        xlabel: "frequency (kHz)", ylabel: "level (dB)", xFmt: (v) => `${v}` });
      const pts = (a, b) => { const out = []; for (let f = a; f <= b + 1e-9; f += 0.1) out.push(`${p.X(f).toFixed(1)},${p.Y(env(f)).toFixed(1)}`); return out; };
      const area = (a, b) => `M${p.X(a)},${p.Y(-80)} L${pts(a, b).join(" L")} L${p.X(b)},${p.Y(-80)} Z`;
      c.path(area(0, nyq), { fill: "bridge", tone: "bridge", soft: true });
      c.text(20, 26, `${rate.value} clip: sound from 0 to ${nyq} kHz`, { size: 15, weight: 700, tone: "bridge" });
      if (s >= 2) {
        c.path(area(nyq, 24), { tone: "bad", dash: true });
        c.label(p.X((nyq + 24) / 2), p.Y(-28), `missing: ${nyq}–24 kHz`, { anchor: "middle", size: 14, tone: "bad", weight: 700 });
        c.line(p.X(nyq), p.Y(0), p.X(nyq), p.Y(-80), { tone: "bridge", width: 2 });
      }
      if (s >= 3) c.box({ x: 360, y: 8, w: 270, h: 34, label: "resampled: 245,760 samples at 48 kHz", size: 13, tone: "muted", hl: s === 3 });
      if (s >= 4) {
        for (let f = 0.5; f < 24; f += 1.5) {
          const inside = f <= nyq;
          c.line(p.X(f), p.Y(env(f) - 2), p.X(f), p.Y(env(f) + 8), { tone: inside ? "bridge" : "predict", dash: !inside, width: 1.6 });
        }
        if (s === 4) c.label(p.X(Math.min(nyq + 5, 20)), p.Y(-10), "guessed harmonics", { anchor: "middle", size: 13, tone: "predict" });
      }
    };
  };

  // ------------------------------------------------------- toolbox: LSD
  D["lsd"] = (fig, k) => {
    const band = k.toggle({ label: "band", options: ["all", "low (L)", "high (H)"], value: "all" });
    k.follow(band, { 1: "all", 2: "high (H)", 3: "low (L)", 4: "all" });
    const c = k.canvas(W, H);
    // made-up 12-bin spectra (dB), bins of 2 kHz; bins 0-1 are the input's 0-4 kHz
    const REF = [-10, -14, -22, -26, -30, -35, -38, -42, -47, -52, -56, -60];
    const OUT = [-10.5, -14.6, -24, -25, -33, -33, -41, -40, -49, -50, -59, -58];
    const lsdOf = (idx) => Math.sqrt(idx.reduce((a, i) => a + ((REF[i] - OUT[i]) / 10) ** 2, 0) / idx.length);
    return (s) => {
      c.clear();
      const sel = band.value === "low (L)" ? [0, 1] : band.value === "high (H)" ? [2, 3, 4, 5, 6, 7, 8, 9, 10, 11] : [...Array(12).keys()];
      const x0 = 56, bw = 30, base = 200, sc = 2.2;
      c.text(16, 24, "reference vs output, one frame, 12 bins", { size: 14, weight: 700 });
      REF.forEach((r, i) => {
        const on = sel.includes(i), x = x0 + i * bw;
        c.add(k.h("rect", { x, y: base - (70 + r) * sc, width: 12, height: (70 + r) * sc, class: `f-muted${on ? "" : " rdx-dim"}` }));
        c.add(k.h("rect", { x: x + 13, y: base - (70 + OUT[i]) * sc, width: 12, height: (70 + OUT[i]) * sc, class: `f-paper${on ? "" : " rdx-dim"}` }));
        const e = ((r - OUT[i]) / 10) ** 2;
        c.add(k.h("rect", { x: x + 4, y: 300 - e * 600, width: 18, height: Math.max(1, e * 600), class: `f-predict${on ? "" : " rdx-dim"}` }));
      });
      c.line(x0 - 4, base, x0 + 12 * bw, base, { tone: "muted" });
      c.line(x0 - 4, 300, x0 + 12 * bw, 300, { tone: "muted" });
      c.text(x0, 222, "0–4 kHz: in the input", { size: 12, tone: "bridge" });
      c.text(x0 + 12 * bw, 222, "4–24 kHz: invented", { size: 12, tone: "muted", anchor: "end" });
      c.text(x0, 322, "(log ratio)² per bin", { size: 12, tone: "predict" });
      c.occupy({ x: x0 - 4, y: 40, w: 12 * bw + 8, h: 262 });
      const v = lsdOf(sel);
      const name = band.value === "all" ? "LSD" : band.value === "low (L)" ? "LSD(L)" : "LSD(H)";
      c.box({ x: 440, y: 40, w: 190, h: 70, label: `${name} = ${f3(v)}`, sub: "√ mean of the amber bars", tone: "predict", hl: s <= 3, mono: true });
      if (s === 3) c.box({ x: 440, y: 122, w: 190, h: 44, label: "real VCTK input: 0.187", size: 13, tone: "bridge" });
      if (s >= 4) {
        c.path(`M${x0 + 4 * bw - 4},44 H${x0 + 7 * bw - 2} V${base + 4} H${x0 + 4 * bw - 4} Z`, { tone: "take", dash: true, width: 2 });
        c.box({ x: 440, y: 122, w: 190, h: 44, label: "SSIM: compare local patches", size: 13, tone: "take", hl: s === 4 });
      }
      if (s >= 5) c.box({ x: 440, y: 180, w: 190, h: 60, label: "SigMOS / ViSQOL", sub: "a model's guess of MOS", tone: "code", hl: true });
      c.text(16, 350, "lower LSD is better", { size: 12, tone: "muted" });
    };
  };

  // ------------------------------------------------------- toolbox: diffusion
  D["diffusion"] = (fig, k) => {
    const c = k.canvas(W, H);
    const r = rng(7);
    const starts = Array.from({ length: 9 }, () => normal(r) * 1.1);
    const ends = starts.map((v, i) => (i % 3 === 0 ? -1.2 : 1.4) + normal(r) * 0.12);
    const wig = starts.map(() => Array.from({ length: 21 }, () => normal(r) * 0.18));
    return (s) => {
      c.clear();
      const p = c.plot({ series: [], xmin: 0, xmax: 1, ymin: -3, ymax: 3, y: 36, h: 324, ml: 40,
        xlabel: "generation: noise (left) → data (right)", ylabel: "one latent value", xFmt: (v) => (v === 0 ? "noise" : v === 1 ? "data" : "") });
      const path = (i) => {
        const pts = [];
        for (let j = 0; j <= 20; j++) { const u = j / 20; const y = (1 - u) * starts[i] + u * ends[i] + wig[i][j] * Math.sin(Math.PI * u); pts.push(`${p.X(u).toFixed(1)},${p.Y(y).toFixed(1)}`); }
        return "M" + pts.join(" L");
      };
      c.text(16, 24, s <= 2 ? "Training: add noise, learn to remove it" : "Generation: start from noise", { size: 15, weight: 700 });
      if (s <= 2) {
        c.dot(p.X(1), p.Y(ends[1]), { tone: "code", r: 6 });
        c.path(path(1), { tone: "muted", dash: true });
        c.arrow(p.X(0.85), p.Y(2.4), p.X(0.2), p.Y(2.4), { tone: "bad", label: "add noise, step by step" });
        c.dot(p.X(0), p.Y(starts[1]), { tone: "muted", r: 6 });
      }
      if (s === 2) c.box({ x: 230, y: 250, w: 220, h: 48, label: "network: predict the noise", sub: "input: noisy value, time t", tone: "take", hl: true });
      if (s >= 3) starts.forEach((_, i) => {
        c.path(path(i), { tone: "paper", width: 1.6 });
        c.dot(p.X(0), p.Y(starts[i]), { tone: "muted", r: 4, hl: s === 5 });
        c.dot(p.X(1), p.Y(ends[i]), { tone: "code", r: 4 });
      });
      if (s >= 4) c.box({ x: 250, y: 44, w: 190, h: 40, label: "condition: low-res clip", size: 13, tone: "bridge", hl: s === 4 });
      if (s >= 5) c.label(p.X(0.02), p.Y(-2.6), "random starts: no clue about the input", { size: 13, tone: "bad", weight: 700 });
    };
  };

  // ------------------------------------------------------- toolbox: bridge
  D["bridge"] = (fig, k) => {
    const tS = k.slider({ label: "t", min: 0, max: 1, step: 0.01, value: 0.5, fmt: (v) => v.toFixed(2) });
    k.follow(tS, { 1: 0.5, 3: 0.71 });
    const c = k.canvas(W, H);
    const zLR = 0.2, zHR = 0.9;
    const r = rng(11), eps = Array.from({ length: 41 }, () => normal(r));
    return (s) => {
      c.clear();
      const t = tS.value, b = bridgeAt(t);
      // x axis is progress u = 1 - t, so sampling runs left to right
      const p = c.plot({ series: [], xmin: 0, xmax: 1, ymin: -0.4, ymax: 1.5, y: 70, h: 290, ml: 44,
        xlabel: "t (sampling runs from t = 1 to t = 0)", ylabel: "one latent value", xFmt: (v) => (1 - v).toFixed(1) });
      const X = (tt) => p.X(1 - tt);
      if (s >= 2) {
        const up = [], dn = [], mid = [];
        for (let j = 0; j <= 50; j++) { const tt = 1 - j / 50, q = bridgeAt(tt), m = q.wHR * zHR + q.wLR * zLR;
          up.push(`${X(tt).toFixed(1)},${p.Y(m + q.std).toFixed(1)}`); dn.unshift(`${X(tt).toFixed(1)},${p.Y(m - q.std).toFixed(1)}`); mid.push(`${X(tt).toFixed(1)},${p.Y(m).toFixed(1)}`); }
        c.path(`M${up.join(" L")} L${dn.join(" L")} Z`, { fill: "take", tone: "take", soft: true, width: 0.8 });
        c.path(`M${mid.join(" L")}`, { tone: "take", width: 2 });
        const m = b.wHR * zHR + b.wLR * zLR;
        c.line(X(t), p.Y(m - b.std), X(t), p.Y(m + b.std), { tone: "predict", width: 3 });
        c.dot(X(t), p.Y(m), { tone: "predict", r: 5 });
      }
      if (s >= 5) {
        const pts = [];
        for (let j = 0; j <= 40; j++) { const tt = 1 - j / 40, q = bridgeAt(tt); pts.push(`${X(tt).toFixed(1)},${p.Y(q.wHR * zHR + q.wLR * zLR + q.std * 0.8 * eps[j] * 0.5).toFixed(1)}`); }
        c.path("M" + pts.join(" L"), { tone: "paper", width: 1.6 });
      }
      c.dot(X(1), p.Y(zLR), { tone: "bridge", r: 7, hl: s === 1 });
      c.dot(X(0), p.Y(zHR), { tone: "code", r: 7, hl: s === 1 });
      c.label(X(1) + 6, p.Y(zLR) + 22, "z_LR (start)", { size: 13, tone: "bridge", weight: 700 });
      c.label(X(0) - 6, p.Y(zHR) - 14, "z_HR (target)", { size: 13, tone: "code", weight: 700, anchor: "end" });
      const head = s === 1 ? "Both ends are fixed points"
        : `t = ${t.toFixed(2)}:  ${f2(b.wHR)}·z_HR + ${f2(b.wLR)}·z_LR,  noise std ${f2(b.std)}`;
      c.text(16, 26, head, { size: 14, weight: 700, mono: s > 1 });
      if (s >= 4) c.text(16, 52, "g²(t) = 0.001 + 0.999·t   (gmax, App. G.2)", { size: 13, mono: true, tone: "muted" });
    };
  };

  // ------------------------------------------------------- machine: whole
  D["machine"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const bx = (x, y, label, sub, tone, step) => c.box({ x, y, w: 140, h: 62, label, sub, tone, hl: s === step, size: 14 });
      const a = bx(16, 20, "8 kHz clip", "5.12 s", "bridge", 1);
      const b = bx(178, 20, "resample", "245,760 samples", "bridge", 1);
      const lp = bx(340, 20, "low-pass", "at 4 kHz", "bridge", 1);
      c.connect(a, b); c.connect(b, lp);
      if (s >= 2) { const e = bx(484, 20, "VAE encoder", "÷ 512", "paper", 2); c.connect(lp, e);
        const zl = bx(484, 140, "z_LR", "64 × 480", "paper", 2); c.connect(e, zl);
        if (s >= 3) { const dit = c.box({ x: 250, y: 132, w: 196, h: 78, label: "bridge DiT, 0.5B", sub: "50 steps", tone: "take", hl: s === 3, size: 15 });
          c.connect(zl, dit); const zh = bx(16, 140, "z_HR", "64 × 480", "take", 3); c.connect(dit, zh);
          if (s >= 4) { const d = bx(16, 262, "VAE decoder", "× 512", "paper", 4); c.connect(zh, d);
            const o = bx(178, 262, "48 kHz clip", "0–24 kHz", "code", 4); c.connect(d, o);
            if (s >= 5) { const n = c.box({ x: 340, y: 262, w: 130, h: 62, label: "96 kHz", sub: "stage 2", tone: "code", dashed: true, hl: true });
              const m = c.box({ x: 500, y: 262, w: 124, h: 62, label: "192 kHz", sub: "stage 3", tone: "code", dashed: true, hl: true });
              c.connect(o, n, { dash: true }); c.connect(n, m, { dash: true }); } } } }
    };
  };

  // ------------------------------------------------------- machine: waveform latent
  D["wave-latent"] = (fig, k) => {
    const sp = k.toggle({ label: "space", options: ["Mel (AudioSR)", "STFT (A2SB)", "Waveform (AudioLBM)"], value: "Mel (AudioSR)" });
    k.follow(sp, { 1: "Mel (AudioSR)", 2: "STFT (A2SB)", 3: "Waveform (AudioLBM)" });
    const c = k.canvas(W, H);
    const r = rng(3);
    const VAL = Array.from({ length: 10 }, () => Array.from({ length: 16 }, () => r()));
    const NOI = Array.from({ length: 10 }, () => Array.from({ length: 16 }, () => r()));
    return (s) => {
      c.clear();
      const wave = sp.value.startsWith("Waveform");
      const grid = (x0, y0, title, mode) => {
        const cw = 15, ch = 18;
        c.text(x0, y0 - 12, title, { size: 14, weight: 700 });
        for (let i = 0; i < 10; i++) for (let j = 0; j < 16; j++) {
          const low = i >= 8; // bottom two rows = 0-4 kHz
          let cls = "f-bridge", op = 0.25 + 0.7 * VAL[i][j];
          if (!wave && !low) { if (mode === "in") { cls = "f-none"; op = 1; } else { cls = "f-muted"; op = 0.15 + 0.85 * NOI[i][j]; } }
          if (wave) op = 0.2 + 0.75 * ((VAL[i][j] + VAL[(i + 3) % 10][(j + 5) % 16]) / 2);
          c.add(k.h("rect", { x: x0 + j * cw, y: y0 + i * ch, width: cw - 2, height: ch - 2, rx: 2, class: cls, "fill-opacity": op.toFixed(2) }));
        }
        if (!wave && mode === "in") c.add(k.h("rect", { x: x0 - 1, y: y0 - 1, width: 16 * cw, height: 8 * ch, rx: 3, class: "f-none s-bad", "stroke-dasharray": "5 4", "stroke-width": 1.5 }));
        c.occupy({ x: x0, y: y0, w: 16 * cw, h: 10 * ch });
      };
      grid(20, 70, wave ? "z_LR: 64 channels × 480 frames" : `${sp.value.split(" ")[0]} of the 8 kHz clip`, "in");
      grid(370, 70, wave ? "start: z_LR itself" : "start: noise on top", "start");
      if (!wave) {
        c.text(20, 290, "rows = frequency; only the bottom 0–4 kHz holds sound", { size: 13, tone: "muted" });
        c.label(150, 150, "empty: 4–24 kHz", { anchor: "middle", size: 14, tone: "bad", weight: 700 });
        c.label(500, 150, "Gaussian noise", { anchor: "middle", size: 14, tone: "muted", weight: 700 });
      } else {
        c.text(20, 290, "rows = learned channels; no row means \"high band\"", { size: 13, tone: "muted" });
      }
      c.arrow(268, 160, 360, 160, { tone: wave ? "bridge" : "muted", label: wave ? "the same draft" : "fill the hole" });
      if (s >= 4 && wave) c.box({ x: 370, y: 266, w: 250, h: 40, label: "every number is a clue to z_HR", size: 13, tone: "take", hl: s === 4 });
      if (s >= 5) c.box({ x: 20, y: 310, w: 600, h: 40, label: "VAE round trip on VCTK: LSD 0.580, best of six codecs", size: 14, tone: "code", hl: true });
    };
  };

  // ------------------------------------------------------- machine: squeeze
  D["squeeze"] = (fig, k) => {
    const rate = k.toggle({ label: "compression r", options: ["2048", "1024", "512", "256"], value: "2048" });
    k.follow(rate, { 1: "2048", 2: "256", 3: "512" });
    const read = k.readout("");
    const c = k.canvas(W, H);
    const R = ["2048", "1024", "512", "256"];
    const GEN = { 2048: 0.730, 1024: 0.714, 512: 0.710, 256: 0.687 };   // Table 4, generation LSD
    const EQ = { 2048: 0.730, 1024: 0.742, 512: 0.711, 256: 0.825 };    // Table 4, trained in equal time
    const RTF = { 2048: 0.18, 1024: 0.37, 512: 0.70, 256: 1.14 };      // Table 4, A800, 100 steps
    return (s) => {
      c.clear();
      read.textContent = `${245760 / +rate.value} frames per 5.12 s clip`;
      const L = s >= 3 ? EQ : GEN;
      c.text(16, 24, s >= 3 ? "LSD, equal training time (lower is better)" : "LSD after full training (lower is better)", { size: 13, weight: 700 });
      c.bars({ x: 16, y: 34, w: 300, rowH: 30, labelW: 70, rows: R.map((r) => ({ label: `r = ${r}`, values: [L[r]], hl: r === rate.value, dim: r !== rate.value && s !== 3 })), tones: ["paper"], max: 0.9, fmt: f3 });
      if (s >= 2) {
        c.text(16, 186, "real-time factor (A800, 100 steps)", { size: 13, weight: 700 });
        c.bars({ x: 16, y: 196, w: 300, rowH: 30, labelW: 70, rows: R.map((r) => ({ label: `r = ${r}`, values: [RTF[r]], hl: r === rate.value, dim: r !== rate.value })), tones: ["predict"], max: 1.2, fmt: f2 });
      }
      if (s >= 4) {
        const KL = [["KL 1e-3", 0.94], ["KL 1e-5", 1.17], ["KL 1e-7", 4.44], ["KL 0", 3.93]];   // Table 5, latent std
        if (s >= 5) KL.push(["KL 0 × 0.25", 3.9313 * 0.25]);
        c.text(346, 24, "latent std by KL weight", { size: 13, weight: 700 });
        c.bars({ x: 346, y: 34, w: 280, rowH: 32, labelW: 96, rows: KL.map(([l, v]) => ({ label: l, values: [v], hl: l.startsWith("KL 0"), dim: !l.startsWith("KL 0") })), tones: ["take"], max: 4.6, fmt: f2 });
        if (s >= 5) c.text(346, 230, "std ≈ 1 keeps the bridge stable", { size: 13, tone: "take" });
      }
    };
  };

  // ------------------------------------------------------- machine: training target
  D["target"] = (fig, k) => {
    const tS = k.slider({ label: "t", min: 0.05, max: 0.95, step: 0.01, value: 0.5, fmt: (v) => v.toFixed(2) });
    k.follow(tS, { 1: 0.5, 4: 0.9 });
    const c = k.canvas(W, H);
    const zLR = 0.2, zHR = 0.9, eps = 0.8;
    return (s) => {
      c.clear();
      const t = tS.value, b = bridgeAt(t);
      const zt = b.wHR * zHR + b.wLR * zLR + b.std * eps;
      const target = (zt - zHR) / b.sig;
      const pull = (b.sig / S1) * (zLR - zHR), noise = (b.sigBar / Math.sqrt(S1)) * eps;
      // number line
      const X = (v) => 60 + ((v + 0.2) / 1.6) * 520;
      c.line(X(-0.2), 120, X(1.4), 120, { tone: "muted" });
      [0, 0.5, 1].forEach((v) => c.text(X(v), 142, String(v), { size: 11, anchor: "middle", tone: "muted" }));
      c.dot(X(zLR), 120, { tone: "bridge", r: 7, hl: s === 1 });
      c.dot(X(zHR), 120, { tone: "code", r: 7, hl: s === 1 });
      c.label(X(zLR), 96, "z_LR", { anchor: "middle", size: 13, tone: "bridge", weight: 700 });
      c.label(X(zHR), 96, "z_HR", { anchor: "middle", size: 13, tone: "code", weight: 700 });
      c.text(16, 26, s === 1 ? "One training pair (illustrative values)" : `t = ${t.toFixed(2)}`, { size: 15, weight: 700 });
      if (s >= 2) {
        c.dot(X(zt), 120, { tone: "predict", r: 7, hl: s === 2 });
        c.label(X(zt), 166, `z_t = ${f3(zt)}`, { anchor: "middle", size: 13, tone: "predict", weight: 700, mono: true });
      }
      if (s >= 3) {
        c.arrow(X(zt), 60, X(zHR), 60, { tone: "take", width: 2 });
        c.text(16, 214, `target = (z_t − z_HR) / σ_t = ${f3(zt - zHR)} / ${f3(b.sig)} = ${f3(target)}`, { size: 14, mono: true, tone: "take" });
      }
      if (s >= 4) {
        const y = 240, sc = 120, x0 = 320;
        c.line(x0, y - 4, x0, y + 60, { tone: "muted" });
        const bar = (v, row, tone, lab) => {
          const x = v >= 0 ? x0 : x0 + v * sc, w = Math.abs(v) * sc;
          c.add(k.h("rect", { x, y: y + row * 30, width: Math.max(2, w), height: 22, class: `f-${tone}` }));
          c.text(v >= 0 ? x0 - 8 : x0 + 8, y + row * 30 + 16, `${lab} ${f3(v)}`, { size: 13, mono: true, tone, anchor: v >= 0 ? "end" : "start" });
        };
        bar(pull, 0, "bridge", "pull toward z_LR");
        bar(noise, 1, "muted", "noise part");
        c.occupy({ x: 16, y: y - 4, w: 610, h: 60 });
      }
      if (s >= 5) c.box({ x: 120, y: 306, w: 400, h: 42, label: "ε_θ(z_t, t, z_LR, f_prior, f_target)", mono: true, size: 14, tone: "take", hl: true });
    };
  };

  // ------------------------------------------------------- machine: sampler
  D["sampler"] = (fig, k) => {
    const nS = k.slider({ label: "steps", min: 2, max: 50, step: 1, value: 50 });
    k.follow(nS, { 1: 50, 4: 5, 5: 50 });
    const c = k.canvas(W, H);
    const zLR = 0.2, zHR = 0.9;
    return (s) => {
      c.clear();
      const N = nS.value;
      const p = c.plot({ series: [], xmin: 0, xmax: 1, ymin: -0.4, ymax: 1.5, y: 40, h: 320, ml: 44,
        xlabel: "t (from 1 to 0)", ylabel: "one latent value", xFmt: (v) => (1 - v).toFixed(1) });
      const X = (tt) => p.X(1 - tt);
      c.text(16, 26, s === 1 ? "Step 0: the input's own latent" : `${N} steps of Eq. 3, perfect guess`, { size: 15, weight: 700 });
      c.dot(X(1), p.Y(zLR), { tone: "bridge", r: 7, hl: s === 1 });
      c.label(X(1) + 6, p.Y(zLR) + 22, "z_LR", { size: 13, tone: "bridge", weight: 700 });
      c.dot(X(0), p.Y(zHR), { tone: "code", r: 7 });
      c.label(X(0) - 8, p.Y(zHR) - 16, "z_HR", { size: 13, tone: "code", weight: 700, anchor: "end" });
      if (s === 2) {
        c.arrow(X(1) + 8, p.Y(zLR) - 6, X(0) - 10, p.Y(zHR) + 6, { tone: "take", dash: true });
        c.label(p.X(0.5), p.Y(0.75), "guess ẑ_HR = z_t − σ_t·ε_θ", { anchor: "middle", size: 14, tone: "take", weight: 700 });
      }
      if (s >= 3) {
        [5, 9, 13, 21].forEach((seed, pi) => {
          const r = rng(seed); let z = zLR; const pts = [`${X(1).toFixed(1)},${p.Y(z).toFixed(1)}`];
          for (let i = 1; i <= N; i++) {
            const sPrev = s2(1 - (i - 1) / N), sNow = s2(1 - i / N), ratio = sNow / sPrev;
            z = ratio * z + (1 - ratio) * zHR + Math.sqrt(sNow) * Math.sqrt(Math.max(0, 1 - ratio)) * normal(r);
            pts.push(`${X(1 - i / N).toFixed(1)},${p.Y(z).toFixed(1)}`);
          }
          c.path("M" + pts.join(" L"), { tone: pi ? "paper" : "take", width: pi ? 1.2 : 2.2 });
        });
      }
      if (s >= 4) c.text(380, 26, `RTF 0.369 at 50 steps`, { size: 13, mono: true, tone: "predict" });
      if (s >= 5) c.box({ x: 430, y: 232, w: 180, h: 40, label: "VAE decoder → 48 kHz", size: 13, tone: "code", hl: true });
    };
  };

  // ------------------------------------------------------- machine: frequency-aware
  D["freq-aware"] = (fig, k) => {
    const OPT = ["48 kHz speech", "sound, real band 16 kHz", "our 8 kHz clip"];
    const ex = k.toggle({ label: "clip", options: OPT, value: OPT[0] });
    k.follow(ex, { 1: OPT[0], 2: OPT[1], 5: OPT[2] });
    const c = k.canvas(W, H);
    // illustrative training draws; inference uses 4 and 24 kHz (§3.2)
    const EX = { [OPT[0]]: [6.5, 24, 24], [OPT[1]]: [5.2, 16, 22.05], [OPT[2]]: [4, 24, 24] };
    const DRAWS = [1.1, 2.8, 7.4, 9.9, 12.6, 3.7];
    return (s) => {
      c.clear();
      const [fp, ft, nyq] = EX[ex.value];
      const X = (f) => 90 + (f / 24) * 530;
      c.text(16, 26, ex.value === OPT[2] ? "Inference: our clip" : "Building one training pair", { size: 15, weight: 700 });
      c.text(16, 62, "target", { size: 13, tone: "muted" });
      c.box({ x: X(0), y: 46, w: X(ft) - X(0), h: 30, label: `f_target = ${ft} kHz`, size: 13, tone: "code", hl: s === 2 });
      if (nyq > ft) c.box({ x: X(ft), y: 46, w: X(nyq) - X(ft), h: 30, label: "noise, unused", size: 12, tone: "bad", dashed: true });
      if (s >= 3 || ex.value === OPT[2]) {
        c.text(16, 122, "input", { size: 13, tone: "muted" });
        c.box({ x: X(0), y: 106, w: X(fp) - X(0), h: 30, label: `f_prior ${fp}`, size: 12, tone: "bridge", hl: s === 3 });
        if (s === 3) DRAWS.filter((d) => d < ft).forEach((d) => c.line(X(d), 142, X(d), 156, { tone: "bridge", width: 2 }));
        if (s === 3) c.text(X(0), 176, "other draws from the same clip", { size: 12, tone: "bridge" });
      }
      [0, 4, 8, 12, 16, 20, 24].forEach((f) => c.text(X(f), 206, `${f}`, { size: 11, anchor: "middle", tone: "muted" }));
      c.text(X(12), 226, "kHz", { size: 11, anchor: "middle", tone: "muted" });
      if (s >= 4) {
        c.text(16, 262, "tokens into the DiT", { size: 13, weight: 700 });
        c.chips({ x: 16, y: 274, size: 13, items: [
          { t: `f_prior ${fp}k`, tone: "bridge", hl: true }, { t: `f_target ${ft}k`, tone: "code", hl: true },
          { t: "z1", tone: "paper" }, { t: "z2", tone: "paper" }, { t: "z3", tone: "paper" }, { t: "…", tone: "muted" }, { t: "z480", tone: "paper" }] });
      }
    };
  };

  // ------------------------------------------------------- machine: effective bandwidth
  D["f-eff"] = (fig, k) => {
    const c = k.canvas(W, H);
    const N = 96, r = rng(17);
    const fq = Array.from({ length: N }, (_, i) => (i / (N - 1)) * 12);
    // made-up log spectrum: speech-like slope, roll-off near 7.5 kHz, flat floor after
    const smooth = fq.map((f) => (f < 7.2 ? -2 - 0.28 * f : -2 - 0.28 * 7.2 - 7 * (1 - Math.exp(-(f - 7.2) * 2.2))));
    const raw = smooth.map((v) => v + normal(r) * 0.45);
    const curv = smooth.map((_, i) => (i < 2 || i > N - 3) ? 0 :
      (-smooth[i + 2] + 16 * smooth[i + 1] - 30 * smooth[i] + 16 * smooth[i - 1] - smooth[i - 2]) / 12);  // footnote 2
    const EPS = 0.03, TAU = -8, KW = 6;
    let iStar = N - 1;
    for (let i = 2; i < N - 3 - KW; i++) {
      const flat = curv.slice(i, i + KW + 1).every((v) => Math.abs(v) < EPS);
      if (flat && smooth[i] < TAU) { iStar = i; break; }
    }
    const fEff = fq[iStar];
    return (s) => {
      c.clear();
      const p = c.plot({ series: [], xmin: 0, xmax: 12, ymin: -11, ymax: 0, y: 30, h: 226, ml: 44,
        xlabel: "frequency (kHz) of a 24 kHz TTS file", ylabel: "log level", yFmt: () => "" });
      const line = (arr) => "M" + arr.map((v, i) => `${p.X(fq[i]).toFixed(1)},${p.Y(v).toFixed(1)}`).join(" L");
      c.text(16, 22, "A TTS output that claims 0–12 kHz", { size: 15, weight: 700 });
      c.path(line(s >= 3 ? smooth : raw), { tone: "paper", width: 2 });
      if (s >= 3) c.path(line(raw), { tone: "muted", width: 0.8, dim: true });
      c.line(p.X(12) - 1, p.Y(0), p.X(12) - 1, p.Y(-11), { tone: "muted", dash: true });
      c.label(p.X(11.6), p.Y(-1), "file's Nyquist", { anchor: "end", size: 12, tone: "muted" });
      if (s === 2) {
        c.path(`M${p.X(fEff)},${p.Y(-10.8)} H${p.X(11.9)} V${p.Y(-0.4)} H${p.X(fEff)} Z`, { tone: "bad", dash: true, width: 2 });
        c.label(p.X((fEff + 12) / 2), p.Y(-4), "no real sound here", { anchor: "middle", size: 13, tone: "bad", weight: 700 });
      }
      if (s >= 4) {
        const q = c.plot({ series: [], xmin: 0, xmax: 12, ymin: -0.15, ymax: 0.15, y: 262, h: 98, ml: 44, mb: 16, mt: 6,
          ylabel: "curvature", xFmt: () => "", yFmt: () => "" });
        c.path("M" + curv.map((v, i) => `${q.X(fq[i]).toFixed(1)},${q.Y(Math.max(-0.15, Math.min(0.15, v))).toFixed(1)}`).join(" L"), { tone: "take", width: 1.6 });
        c.line(p.X(fEff), p.Y(0), p.X(fEff), q.Y(-0.15), { tone: "predict", width: 2.2 });
        c.label(p.X(fEff) + 8, p.Y(-2), `f_eff ≈ ${fEff.toFixed(1)} kHz`, { size: 14, tone: "predict", weight: 700 });
      }
      if (s >= 5) c.box({ x: p.X(0.3), y: p.Y(-7), w: 210, h: 40, label: "low-pass input at f_eff", size: 13, tone: "code", hl: true });
    };
  };

  // ------------------------------------------------------- machine: cascade
  D["cascade"] = (fig, k) => {
    const c = k.canvas(W, H);
    const ST = [
      ["any → 48 kHz", "0.5B · 24 layers", 4470, 0.369],   // §4.1, App. G.2, Table 15, Table 12
      ["48 → 96 kHz", "0.3B · 16 layers", 240, 0.695],
      ["96 → 192 kHz", "0.3B · 16 layers", 15, 1.351],
    ];
    return (s) => {
      c.clear();
      const boxes = ST.map(([t, sub], i) => c.box({ x: 16 + i * 210, y: 20, w: 190, h: 64, label: t, sub: s >= 2 ? sub : undefined, tone: "take", hl: s <= 2 }));
      c.connect(boxes[0], boxes[1]); c.connect(boxes[1], boxes[2]);
      if (s >= 3) {
        c.text(16, 128, "training audio (hours, log scale)", { size: 13, weight: 700 });
        ST.forEach(([, , hrs], i) => {
          const w = Math.max(6, (Math.log10(hrs) / Math.log10(5000)) * 120);
          c.box({ x: 16 + i * 210, y: 138, w, h: 30, tone: "paper", solid: true, hl: s === 3 });
          c.text(16 + i * 210 + w + 6, 158, `${hrs.toLocaleString("en-US")} h`, { size: 13, mono: true, tone: "paper" });
        });
      }
      if (s >= 4) {
        c.box({ x: 226, y: 196, w: 400, h: 44, label: "192 kHz VAE from 48 kHz init: LSD 0.713 vs 0.736", size: 13, tone: "code", hl: s === 4 });
        c.arrow(110, 172, 222, 218, { tone: "code", dash: true });
      }
      if (s >= 5) {
        c.text(16, 280, "real-time factor on an A800", { size: 13, weight: 700 });
        ST.forEach(([, , , rtf], i) => {
          const w = (rtf / 1.4) * 150;
          c.box({ x: 16 + i * 210, y: 292, w, h: 28, tone: "predict", solid: true, hl: true });
          c.text(16 + i * 210 + w + 6, 311, rtf.toFixed(3), { size: 13, mono: true, tone: "predict" });
        });
      }
    };
  };

  // ------------------------------------------------------- machine: prior augmentation
  D["prior-aug"] = (fig, k) => {
    const bS = k.slider({ label: "blur b_r", min: 0.05, max: 1, step: 0.05, value: 0.3, fmt: (v) => v.toFixed(2) });
    k.follow(bS, { 1: 0.3, 3: 0.8, 4: 0.3 });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const a = c.box({ x: 12, y: 20, w: 140, h: 56, label: "stage 1 output", sub: "48 kHz", tone: "bad", hl: s === 1 });
      const b = c.box({ x: 172, y: 20, w: 140, h: 56, label: "cut 20–24 kHz", sub: "sharp low-pass", tone: "bridge", hl: s === 2, dim: s < 2 });
      const e = c.box({ x: 332, y: 20, w: 136, h: 56, label: "encode, blur", sub: `b_r = ${bS.value.toFixed(2)}`, tone: "take", hl: s === 3 || s === 4, dim: s < 3 });
      const d = c.box({ x: 488, y: 20, w: 140, h: 56, label: "stage 2 bridge", sub: "+ b_r token", tone: "take", dim: s < 3 });
      c.connect(a, b); c.connect(b, e); c.connect(e, d);
      if (s === 1) c.text(16, 120, "trained on clean 48 kHz, tested on stage 1's flawed output", { size: 14, tone: "bad" });
      if (s >= 3 && s <= 4) {
        const br = bS.value, w = [-2, -1, 0, 1, 2].map((tau) => Math.exp(-(tau * tau) / (2 * br * br)));
        const Z = w.reduce((x, y) => x + y, 0);
        c.text(16, 120, "5-tap Gaussian along time (Eq. 15)", { size: 14, weight: 700 });
        w.forEach((v, i) => {
          const hh = (v / Z) * 180, x = 140 + i * 76;
          c.box({ x, y: 330 - hh, w: 52, h: Math.max(2, hh), tone: "take", solid: true, hl: i === 2 });
          c.text(x + 26, 322 - hh, `${(100 * v / Z).toFixed(0)}%`, { size: 13, anchor: "middle", mono: true, tone: "take" });
          c.text(x + 26, 350, `τ = ${i - 2}`, { size: 12, anchor: "middle", tone: "muted" });
        });
      }
      if (s === 2) c.text(16, 120, "edge artifacts live just under 24 kHz; remove them first", { size: 14, tone: "bridge" });
      if (s >= 5) {
        c.text(16, 112, "LSD by augmentation (lower is better)", { size: 13, weight: 700 });
        const ROWS = [["latent blur, dynamic", 1.182], ["latent blur, fixed", 1.186], ["none", 1.219], ["waveform blur", 1.234],
          ["latent noise 0.1", 1.381], ["waveform noise", 3.461]];   // Table 10
        c.bars({ x: 16, y: 124, w: 600, rowH: 36, labelW: 170, rows: ROWS.map(([l, v]) => ({ label: l, values: [v], hl: l.startsWith("latent blur") || l === "none" })), tones: ["take"], max: 3.6, fmt: f3 });
      }
    };
  };

  // ------------------------------------------------------- results: VCTK
  D["vctk"] = (fig, k) => {
    const met = k.toggle({ label: "metric", options: ["LSD(H)", "SSIM", "SigMOS"], value: "LSD(H)" });
    k.follow(met, { 1: "LSD(H)", 3: "SSIM", 4: "SigMOS" });
    const c = k.canvas(W, H);
    // Table 1, VCTK 8 → 48 kHz: [LSD(H), SSIM, SigMOS]
    const T = [
      ["8 kHz input", 4.456, 0.519, 3.136], ["UDM+", 1.345, 0.691, 3.068], ["NU-Wave*", 1.544, 0.661, 2.936],
      ["NU-Wave 2", 1.239, 0.654, 2.838], ["NVSR", 1.085, 0.734, 2.831], ["FrePainter", 0.985, 0.755, 2.743],
      ["FlowHigh", 0.889, 0.784, 2.792], ["AP-BWE", 1.093, 0.742, 3.082], ["Bridge-SR*", 1.143, 0.660, 2.998],
      ["AudioSR", 0.994, 0.809, 2.846], ["AudioLBM", 0.724, 0.893, 3.023], ["AudioLBM, VCTK only", 0.712, 0.906, 3.095],
    ];
    const HL = { 1: [], 2: ["AudioLBM", "FlowHigh"], 3: ["AudioLBM", "AudioSR"], 4: ["AudioLBM", "AP-BWE", "8 kHz input", "AudioSR"], 5: ["AudioLBM, VCTK only", "AP-BWE"] };
    return (s) => {
      c.clear();
      const j = ["LSD(H)", "SSIM", "SigMOS"].indexOf(met.value) + 1;
      c.text(16, 20, met.value === "LSD(H)" ? "LSD(H): lower is better" : `${met.value}: higher is better`, { size: 13, weight: 700 });
      const lit = HL[s] || [];
      c.bars({ x: 16, y: 30, w: 610, rowH: 27, labelW: 160, max: j === 1 ? 4.6 : j === 2 ? 1 : 3.3, fmt: (v) => (j === 3 ? v.toFixed(3) : v.toFixed(3)),
        rows: T.map((r) => ({ label: r[0], values: [r[j]], hl: lit.includes(r[0]), dim: lit.length > 0 && !lit.includes(r[0]) })),
        tones: [j === 1 ? "paper" : j === 2 ? "take" : "code"] });
    };
  };

  // ------------------------------------------------------- results: low band
  D["low-band"] = (fig, k) => {
    const c = k.canvas(W, H);
    // Table 1 LSD(L), VCTK 8 → 48 kHz; VAE row is Table 6 LSD-LF (reconstruction only)
    const T = [["8 kHz input", 0.187], ["Bridge-SR*", 0.172], ["FlowHigh", 0.194], ["UDM+", 0.216], ["AP-BWE", 0.224],
      ["NU-Wave*", 0.268], ["FrePainter", 0.272], ["NU-Wave 2", 0.294], ["NVSR", 0.357], ["AudioSR", 0.486], ["VAE round trip", 0.428], ["AudioLBM", 0.773]];
    const HL = { 1: ["8 kHz input"], 2: ["Bridge-SR*", "UDM+"], 3: ["AudioLBM", "VAE round trip"], 4: ["AudioLBM"], 5: ["AudioLBM"] };
    return (s) => {
      c.clear();
      const lit = HL[s];
      const rows = T.filter((r) => r[0] !== "VAE round trip" || s >= 3);
      c.text(16, 20, "LSD(L): error in the band the input had (lower is better)", { size: 13, weight: 700 });
      c.bars({ x: 16, y: 30, w: s >= 4 ? 380 : 610, rowH: 26, labelW: 130, max: 0.85, fmt: f3,
        rows: rows.map((r) => ({ label: r[0], values: [r[1]], hl: lit.includes(r[0]), dim: !lit.includes(r[0]) })),
        tones: [s === 3 ? "bad" : "paper"] });
      if (s >= 4) {
        const a = c.box({ x: 420, y: 40, w: 206, h: 56, label: "paste the input's low band", sub: "low-frequency replacement", tone: "code", hl: s === 4 });
        if (s >= 5) {
          // Table 11: 48 kHz stage, LSD-LF 0–16 kHz, before and after replacement (96Music)
          const b1 = c.box({ x: 420, y: 150, w: 206, h: 44, label: "before: LSD-LF 0.811", size: 13, tone: "bad" });
          const b2 = c.box({ x: 420, y: 240, w: 206, h: 44, label: "after: LSD-LF 0.331", size: 13, tone: "code", hl: true });
          c.connect(a, b1); c.connect(b1, b2);
        }
      }
    };
  };

  // ------------------------------------------------------- results: which part
  D["which-part"] = (fig, k) => {
    const met = k.toggle({ label: "metric", options: ["LSD", "SigMOS"], value: "LSD" });
    k.follow(met, { 1: "LSD", 3: "SigMOS", 4: "LSD" });
    const c = k.canvas(W, H);
    // Table 13: [generator · space, LSD, SigMOS]
    const T = [["Diffusion · mel latent", 0.940, 2.846, "mel"], ["Flow · mel", 0.816, 2.792, "mel"],
      ["Bridge · STFT", 1.295, 2.951, "bridge"], ["Bridge · waveform", 1.037, 2.896, "bridge"],
      ["Diffusion · our latent", 0.758, 2.741, "lat"], ["Flow · our latent", 0.751, 2.892, "lat"], ["Bridge · our latent", 0.742, 3.095, "both"]];
    const lit = (r) => ({ 1: true, 2: r[3] === "lat" || r[3] === "both", 3: r[3] === "lat" || r[3] === "both", 4: r[3] === "bridge" || r[3] === "both", 5: r[3] === "mel" }[c._s]);
    return (s) => {
      c.clear(); c._s = s;
      const j = met.value === "LSD" ? 1 : 2;
      c.text(16, 20, j === 1 ? "LSD (lower is better), same data and steps" : "SigMOS (higher is better), same data and steps", { size: 13, weight: 700 });
      c.bars({ x: 16, y: 34, w: s === 5 ? 470 : 610, rowH: 38, labelW: 190, max: j === 1 ? 1.4 : 3.3, fmt: f3,
        rows: T.map((r) => ({ label: r[0], values: [r[j]], hl: s > 1 && lit(r), dim: s > 1 && !lit(r) })), tones: [j === 1 ? "paper" : "code"] });
      if (s === 5) c.box({ x: 496, y: 34, w: 130, h: 70, label: "= Table 1 rows", sub: "AudioSR, FlowHigh", tone: "predict", hl: true });
    };
  };

  // ------------------------------------------------------- results: frequency ablation
  D["freq-ablation"] = (fig, k) => {
    const ds = k.toggle({ label: "test set", options: ["ESC-50 sound", "SDS music"], value: "ESC-50 sound" });
    k.follow(ds, { 1: "ESC-50 sound", 4: "SDS music", 5: "ESC-50 sound" });
    const c = k.canvas(W, H);
    // Table 2, 16 → 48 kHz LSD: [ESC-50, SDS]
    const T = [["no data filter", 1.366, 1.461], ["+ drop clips < 32 kHz", 1.052, 1.187], ["+ f_prior token", 1.022, 1.166],
      ["+ f_target token", 0.994, 1.124], ["only true 48 kHz data", 1.127, 1.198]];
    const HL = { 1: [0], 2: [1], 3: [2, 3], 4: [3, 4], 5: [] };
    return (s) => {
      c.clear();
      const j = ds.value.startsWith("ESC") ? 1 : 2;
      c.text(16, 20, `LSD on ${ds.value}, 16 → 48 kHz (lower is better)`, { size: 13, weight: 700 });
      c.bars({ x: 16, y: 36, w: 610, rowH: 44, labelW: 190, max: 1.6, fmt: f3,
        rows: T.map((r, i) => ({ label: r[0], values: [r[j]], hl: HL[s].includes(i), dim: s > 1 && s < 5 && !HL[s].includes(i) })),
        tones: ["take"] });
      if (s >= 5) c.box({ x: 210, y: 274, w: 416, h: 44, label: "every bar: 0.2M steps, batch 32, no speech", size: 13, tone: "predict", hl: true });
    };
  };

  // ------------------------------------------------------- results: beyond 48 kHz
  D["beyond48"] = (fig, k) => {
    const OPT = ["16 → 96 kHz", "16 → 192 kHz", "remove one piece"];
    const v = k.toggle({ label: "view", options: OPT, value: OPT[0] });
    k.follow(v, { 1: OPT[0], 3: OPT[1], 4: OPT[2] });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      if (v.value === OPT[0]) {
        c.text(16, 20, "16 → 96 kHz, LSD (lower is better)", { size: 13, weight: 700 });
        c.bars({ x: 16, y: 36, w: 610, rowH: 44, labelW: 130, max: 3.2, fmt: f3, tones: ["paper"],   // Table 3
          rows: [{ label: "input", values: [3.068], dim: s >= 2 }, { label: "direct model", values: [1.406], hl: s >= 1 }, { label: "cascade", values: [1.216], hl: s >= 2, dim: s < 2 }] });
        if (s >= 2) c.box({ x: 146, y: 190, w: 300, h: 44, label: "ViSQOL 3.330 vs 3.010 (direct)", size: 13, tone: "code", hl: true });
        if (s === 1) c.box({ x: 146, y: 190, w: 300, h: 44, label: "no outside baseline exists", size: 13, tone: "predict", hl: true });
      } else if (v.value === OPT[1]) {
        c.text(16, 20, "16 → 192 kHz, LSD: whole band and top band 96–192 kHz", { size: 13, weight: 700 });
        c.bars({ x: 16, y: 36, w: 610, rowH: 60, labelW: 130, max: 3.1, fmt: f3, tones: ["paper", "take"],   // Table 3
          rows: [{ label: "input", values: [2.929, 2.880], dim: true }, { label: "direct model", values: [1.913, 2.244] }, { label: "cascade", values: [1.365, 1.474], hl: true }] });
        c.text(146, 240, "blue: 0–192 kHz   violet: 96–192 kHz", { size: 12, tone: "muted" });
      } else {
        c.text(16, 20, "16 → 96 kHz LSD when one piece is removed (Fig. 4)", { size: 13, weight: 700 });
        const F = [["full system", 1.182, 1.361], ["no dynamic blur", 1.186, 1.377], ["no latent blur", 1.219, 1.405], ["no f_target", 1.229, 1.458],
          ["no f_prior", 1.261, 1.495], ["no waveform cut", 1.411, 1.850], ["no data filter", 1.503, 2.026]];   // Fig. 4 source values
        c.bars({ x: 16, y: 34, w: 610, rowH: 40, labelW: 140, max: 2.2, fmt: f3, tones: ["paper", "take"],
          rows: F.map((r) => ({ label: r[0], values: [r[1], r[2]], hl: r[0] === "no data filter" || r[0] === "full system" })) });
        c.text(156, 330, "blue: 96Audio   violet: 96Music", { size: 12, tone: "muted" });
      }
    };
  };

  // ------------------------------------------------------- your move: reviewer
  D["reviewer"] = (fig, k) => {
    const c = k.canvas(W, H);
    const ROWS = [
      ["Can anyone rerun it?", "no code or weights (Q5)", "bad"],
      ["Whose data?", "4,000 of 4,470 h internal (Table 15)", "bad"],
      ["How noisy are the gaps?", "no error bars (Q7)", "bad"],
      ["Tuned on which clips?", "grid search, set not stated (§3.3)", "predict"],
      ["Are comparisons controlled?", "two Table 13 rows = Table 1", "predict"],
      ["🧠 Steelman", "same-latent rows: bridge wins all three", "code"],
    ];
    return (s) => { c.clear(); board(c, ROWS, s, { rh: 57, qW: 230 }); };
  };

  // ------------------------------------------------------- your move: after
  D["after"] = (fig, k) => {
    const c = k.canvas(W, H);
    const ITEMS = [
      ["2023-12", "Bridge-TTS", "schedule used here", 1, "muted"],
      ["2025-01", "A2SB", "STFT bridge, music", 1, "muted"],
      ["2025-09", "AudioLBM", "this paper", 2, "take"],
      ["2025-09", "VoiceBridge", "one-step latent bridge", 2, "paper"],
      ["2025-10", "UniverSR", "flow matching", 3, "paper"],
      ["2026-04", "LatentFlowSR", "latent flow matching", 3, "paper"],
      ["2026-05", "Survey", "SR and BWE map", 4, "paper"],
      ["2026-08", "AnyBand", "multi-band speech", 5, "paper"],
    ];
    return (s) => {
      c.clear();
      c.line(112, 24, 112, 340, { tone: "muted" });
      ITEMS.forEach(([d, name, note, st, tone], i) => {
        if (s < st && name !== "AudioLBM") return;
        const y = 18 + i * 41, now = st === s;
        c.text(16, y + 21, d, { size: 13, mono: true, tone: "muted" });
        c.dot(112, y + 16, { tone, r: now ? 7 : 5 });
        c.box({ x: 134, y, w: 170, h: 32, label: name, size: 14, tone, hl: now });
        c.text(318, y + 21, note, { size: 13, tone: now ? "ink" : "muted" });
      });
    };
  };

  // ------------------------------------------------------- your move: verdict
  D["verdict"] = (fig, k) => {
    const c = k.canvas(W, H);
    const ROWS = [
      ["Can you download it?", "no: no code, no weights", "bad"],
      ["Does it help TTS output?", "yes: beat AudioSR on MaskGCT (Fig. 1)", "code"],
      ["Is your band really 12 kHz?", "measure f_eff first (App. A.2)", "predict"],
      ["Can you afford it?", "≈ 1.9 s per 5.12 s clip (A800)", "predict"],
      ["🧠 Verdict", "borrow the recipe; train on your 48 kHz", "take"],
    ];
    return (s) => { c.clear(); board(c, ROWS, s, { rh: 66, qW: 230, top: 18 }); };
  };
})();
