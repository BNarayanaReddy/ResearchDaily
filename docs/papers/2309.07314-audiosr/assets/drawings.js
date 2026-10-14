/* Drawings for the AudioSR lesson. One entry per data-draw name. Each is
   redrawn on every step and control change. Numbers from the paper carry a
   // Table N comment; everything else is illustrative layout or live arithmetic. */
(function () {
  window.RD = window.RD || {}; RD.drawings = RD.drawings || {};
  const D = RD.drawings;
  const W = 640, H = 360;

  // ---------------------------------------------------------------- helpers
  const f2 = (v) => v.toFixed(2), f3 = (v) => v.toFixed(3);
  const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const normal = (r) => { const u = Math.max(1e-9, r()), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

  // librosa's default (Slaney) mel scale, as in the code: 256 bins, 20 Hz to 24 kHz
  const slaney = (f) => (f < 1000 ? f / (200 / 3) : 15 + Math.log(f / 1000) / (Math.log(6.4) / 27));
  const melFrac = (f) => (slaney(f) - slaney(20)) / (slaney(24000) - slaney(20));

  // the code's schedules, 1,000 steps: cosine (used) and linear 0.0015-0.0195 (left in the config)
  const T = 1000;
  const cosAbar = (() => { const s = 0.008, f = (t) => Math.cos(((t / T + s) / (1 + s)) * Math.PI / 2) ** 2; const out = [1]; let p = 1;
    for (let i = 0; i < T; i++) { const b = Math.min(1 - f(i + 1) / f(i), 0.999); p *= 1 - b; out.push(p); } return out; })();
  const linAbar = (() => { const a = Math.sqrt(0.0015), b = Math.sqrt(0.0195), out = [1]; let p = 1;
    for (let i = 0; i < T; i++) { const be = (a + ((b - a) * i) / (T - 1)) ** 2; p *= 1 - be; out.push(p); } return out; })();

  // horizontal bars we can annotate: returns X(value)
  const hbars = (c, o) => {
    const x0 = o.x + o.labelW, bw = o.w - o.labelW - 52, X = (v) => x0 + (v / o.max) * bw;
    o.rows.forEach((r, i) => {
      const y = o.y + i * o.rowH;
      c.text(x0 - 8, y + o.rowH / 2 + 4, r.label, { anchor: "end", size: 13, weight: r.hl ? 700 : 400, dim: r.dim, inBox: true });
      c.box({ x: x0, y: y + 5, w: Math.max(3, X(r.v) - x0), h: o.rowH - 10, tone: r.tone || "paper", solid: true, hl: r.hl, dim: r.dim, r: 3 });
      c.text(X(r.v) + 6, y + o.rowH / 2 + 4, (o.fmt || f2)(r.v), { size: 13, mono: true, tone: r.tone || "paper", dim: r.dim });
    });
    c.occupy({ x: o.x, y: o.y, w: x0 - o.x, h: o.rows.length * o.rowH });
    return X;
  };

  // a checklist board: rows [question, answer, tone]; row i appears on step i+1
  const board = (c, rows, s, o = {}) => {
    const top = o.top || 14, rh = o.rh || 54, qW = o.qW || 250;
    rows.forEach(([q, a, tone], i) => {
      if (s < i + 1) return;
      const y = top + i * rh, now = s === i + 1;
      const qb = c.box({ x: 16, y, w: qW, h: rh - 10, label: q, size: 14, tone: "muted", hl: now, mono: o.monoQ });
      const ab = c.box({ x: qW + 34, y, w: W - qW - 50, h: rh - 10, label: a, size: 13, tone, hl: now });
      if (now) c.connect(qb, ab, { tone });
    });
  };

  // ------------------------------------------------------- toolbox: band
  D["band"] = (fig, k) => {
    const rate = k.slider({ label: "input rate", min: 4, max: 32, step: 1, value: 8, fmt: (v) => `${v} kHz` });
    k.follow(rate, { 1: 8 });
    const read = k.readout("");
    const c = k.canvas(W, H);
    const env = (f) => -10 - 18 * Math.log10(1 + f) - 1.2 * f + 6 * Math.exp(-(((f - 6) / 2) ** 2));
    return (s) => {
      c.clear();
      const nyq = rate.value / 2;
      read.textContent = `missing: ${Math.round(((24 - nyq) / 24) * 100)}% of 0–24 kHz`;
      const p = c.plot({ series: [], xmin: 0, xmax: 24, ymin: -80, ymax: 0, y: 40, h: 320, xlabel: "frequency (kHz)", ylabel: "level (dB)" });
      const pts = (a, b) => { const o = []; for (let f = a; f <= b + 1e-9; f += 0.1) o.push(`${p.X(f).toFixed(1)},${p.Y(env(f)).toFixed(1)}`); return o; };
      const area = (a, b) => `M${p.X(a)},${p.Y(-80)} L${pts(a, b).join(" L")} L${p.X(b)},${p.Y(-80)} Z`;
      c.path(area(0, nyq), { fill: "bridge", tone: "bridge", soft: true });
      c.text(20, 26, `${rate.value} kHz clip: sound from 0 to ${nyq} kHz`, { size: 15, weight: 700, tone: "bridge" });
      if (s >= 2) {
        c.path(area(nyq, 24), { tone: "bad", dash: true });
        c.label(p.X((nyq + 24) / 2), p.Y(-30), `to estimate: ${nyq}–24 kHz`, { anchor: "middle", size: 14, tone: "bad", weight: 700 });
      }
      if (s === 3) [[4, "phone"], [11, "22 kHz TTS"], [16, "MP3"]].forEach(([f, t]) => {
        c.line(p.X(f), p.Y(-62), p.X(f), p.Y(-80), { tone: "predict", width: 2.4 });
        c.label(p.X(f), p.Y(-66), t, { anchor: "middle", size: 12, tone: "predict", weight: 600 });
      });
      if (s >= 4) {
        c.box({ x: p.X(2), y: p.Y(-71), w: p.X(16) - p.X(2), h: 22, label: "AudioSR's input band: 2–16 kHz", size: 12, tone: "code", hl: true });
      }
    };
  };

  // ------------------------------------------------------- toolbox: mel
  D["mel"] = (fig, k) => {
    const ax = k.toggle({ label: "axis", options: ["Hz", "mel"], value: "Hz" });
    k.follow(ax, { 1: "Hz", 3: "mel" });
    const c = k.canvas(W, H);
    const r = rng(5), cells = Array.from({ length: 30 * 20 }, () => r());
    return (s) => {
      c.clear();
      const mel = ax.value === "mel";
      const pos = (f) => (mel ? melFrac(f) : f / 24000);
      const X0 = 70, Y0 = 30, GW = 300, GH = 300;
      const yOf = (f) => Y0 + GH - pos(f) * GH;
      const edge = yOf(4000);
      // filled low band (our 4 kHz clip) and empty top
      const nr = 20, nc = 30, ch = GH / nr, cw = GW / nc;
      for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++) {
        const yc = Y0 + i * ch;
        if (yc + ch <= edge + 0.5) continue;
        c.add(k.h("rect", { x: X0 + j * cw, y: yc, width: cw - 1, height: ch - 1, class: "f-bridge", "fill-opacity": (0.25 + 0.7 * cells[i * nc + j]).toFixed(2) }));
      }
      c.add(k.h("rect", { x: X0, y: Y0, width: GW, height: edge - Y0, class: "f-none s-bad", "stroke-dasharray": "5 4", "stroke-width": 1.5 }));
      c.occupy({ x: X0, y: Y0, w: GW, h: GH });
      [1000, 4000, 8000, 16000, 24000].forEach((f) => {
        c.line(X0 - 6, yOf(f), X0, yOf(f), { tone: "muted" });
        c.text(X0 - 10, yOf(f) + 4, `${f / 1000}k`, { anchor: "end", size: 12, tone: f === 4000 ? "bridge" : "muted", weight: f === 4000 ? 700 : 400 });
      });
      c.text(X0, Y0 + GH + 22, s >= 2 ? "512 frames (10 ms each)" : "time →", { size: 12, tone: "muted" });
      c.text(400, 50, mel ? "mel axis: 256 bins" : "Hz axis: 0–24 kHz", { size: 16, weight: 700, maxW: 224, lines: 1 });
      const share = Math.round(pos(4000) * 100);
      c.text(400, 84, `0–4 kHz fills ${share}% of the height`, { size: 14, tone: "bridge", weight: 600, maxW: 224, lines: 2 });
      if (s >= 2) c.box({ x: 400, y: 104, w: 224, h: 44, label: "hop 480, 256 bins, 20 Hz–24 kHz", size: 12, tone: "muted", hl: s === 2 });
      if (s >= 4 && mel) c.box({ x: 400, y: 160, w: 224, h: 56, label: `≈ ${Math.round(melFrac(4000) * 256)} of 256 bins filled`, sub: "our arithmetic", tone: "bridge", hl: s === 4 });
      if (s >= 5) {
        const top = 24000, m1 = slaney(top) - (slaney(24000) - slaney(20)) / 257;
        const fLow = 1000 * Math.exp((m1 - 15) * (Math.log(6.4) / 27));
        c.box({ x: 400, y: 228, w: 224, h: 56, label: `top bin ≈ ${Math.round(top - fLow)} Hz wide`, sub: `vs ≈ ${Math.round(((slaney(24000) - slaney(20)) / 257) * (200 / 3))} Hz below 1 kHz`, tone: "predict", hl: true });
      }
      c.label(X0 + GW / 2, (Y0 + edge) / 2, "empty: to estimate", { anchor: "middle", size: 13, tone: "bad", weight: 700 });
    };
  };

  // ------------------------------------------------------- toolbox: LSD
  D["lsd"] = (fig, k) => {
    const g = k.slider({ label: "gain a", min: 0.5, max: 2, step: 0.05, value: 1.65, fmt: (v) => `${v.toFixed(2)}×` });
    k.follow(g, { 3: 1.65 });
    const c = k.canvas(W, H);
    const REF = [-10, -14, -22, -26, -30, -35, -38, -42, -47, -52, -56, -60];   // made-up dB per bin
    const OUT = [-10.5, -14.6, -24, -25, -33, -33, -41, -40, -49, -50, -59, -58];
    return (s) => {
      c.clear();
      const gain = s >= 3;
      const out = gain ? REF.map((v) => v + 20 * Math.log10(g.value)) : OUT;
      const lsd = Math.sqrt(REF.reduce((a, v, i) => a + ((v - out[i]) / 10) ** 2, 0) / REF.length);
      const p = c.plot({ series: [
        { x: REF.map((_, i) => i * 2 + 1), y: REF, tone: "muted", dots: true, label: "reference" },
        { x: REF.map((_, i) => i * 2 + 1), y: out, tone: "paper", dots: true, label: gain ? `${g.value.toFixed(2)}× louder` : "output", labelAt: 4 },
      ], xmin: 0, xmax: 24, ymin: -70, ymax: 10, w: 400, h: 330, y: 30, xlabel: "frequency (kHz)", ylabel: "level (dB)" });
      c.text(16, 20, gain ? "Same clip, only louder" : "One frame, 12 bins (made up)", { size: 14, weight: 700 });
      c.box({ x: 420, y: 36, w: 206, h: 66, label: `LSD = ${f3(lsd)}`, sub: gain ? "= 2·|log10 a|" : "√ mean((Δ dB / 10)²)", mono: true, tone: "predict", hl: s === 1 || s === 3 });
      if (s >= 2) c.box({ x: 420, y: 114, w: 206, h: 44, label: "raw 8 kHz VCTK: 5.15", size: 13, tone: "bad", hl: s === 2 });
      if (s >= 4) c.box({ x: 420, y: 170, w: 206, h: 56, label: "energy-matched: 1.596 → 1.362", sub: "repo note, 2025", size: 12, tone: "code", hl: s === 4 });
      if (s >= 5) c.box({ x: 420, y: 238, w: 206, h: 56, label: "listeners: 1 to 5", sub: "Mechanical Turk", tone: "take", hl: true });
      if (!p) return;
    };
  };

  // ------------------------------------------------------- toolbox: vocoder
  D["vocoder"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const a = c.box({ x: 16, y: 24, w: 140, h: 60, label: "48 kHz audio", tone: "bridge" });
      const m = c.box({ x: 176, y: 24, w: 130, h: 60, label: "mel", sub: "256 bins, no phase", tone: "paper", hl: s === 1 });
      const v = c.box({ x: 322, y: 18, w: 184, h: 72, label: "HiFi-GAN 48 kHz", sub: s >= 3 ? "multi-res discriminator" : "trained on 48 kHz", monoSub: false, tone: "take", hl: s === 2 || s === 3, dim: s < 2 });
      const o = c.box({ x: 524, y: 24, w: 102, h: 60, label: "audio again", tone: "bridge", dim: s < 2 });
      c.connect(a, m); c.connect(m, v, { dim: s < 2 }); c.connect(v, o, { dim: s < 2 });
      if (s === 1) c.text(176, 120, "a mel has magnitudes only: you cannot play it", { size: 14, tone: "paper" });
      if (s === 2) c.text(176, 120, "it learned what 4–24 kHz sounds like", { size: 14, tone: "take" });
      if (s >= 4) {
        c.text(16, 140, "round trip alone, LSD (lower is better)", { size: 13, weight: 700 });
        const rows = [{ label: "speech (VCTK)", v: 0.64, tone: "paper" }, { label: "music", v: 0.61, tone: "paper" }, { label: "sound (ESC-50)", v: 0.84, tone: "paper" }];   // Table 1, GT-Mel
        if (s >= 5) rows.push({ label: "best speech output", v: 0.69, tone: "code", hl: true });   // Table 1, AudioSR-Speech 12 kHz
        hbars(c, { x: 16, y: 152, w: 610, labelW: 160, rowH: 44, max: 1, rows });
      }
    };
  };

  // ------------------------------------------------------- toolbox: diffusion
  D["diffusion"] = (fig, k) => {
    const kS = k.slider({ label: "step k", min: 0, max: 1000, step: 10, value: 250 });
    k.follow(kS, { 1: 250, 2: 600, 3: 1000, 5: 0 });
    const c = k.canvas(W, H);
    const nr = 12, nc = 24, r = rng(9);
    // a toy "spectrogram": harmonic rows fading upward
    const X0 = Array.from({ length: nr * nc }, (_, q) => { const i = Math.floor(q / nc), j = q % nc; const row = nr - 1 - i;
      return (row % 3 === 0 ? 0.9 : 0.25) * Math.exp(-row / 8) * (0.7 + 0.3 * Math.sin(j / 3)); });
    const EPS = X0.map(() => normal(r));
    return (s) => {
      c.clear();
      const kk = kS.value, ab = cosAbar[kk];
      const a = Math.sqrt(ab), b = Math.sqrt(1 - ab);
      const cw = 15, ch = 16, gx = 16, gy = 50;
      for (let q = 0; q < nr * nc; q++) {
        const i = Math.floor(q / nc), j = q % nc, v = a * X0[q] + b * 0.45 * EPS[q];
        c.add(k.h("rect", { x: gx + j * cw, y: gy + i * ch, width: cw - 1, height: ch - 1, class: v >= 0 ? "f-paper" : "f-bad", "fill-opacity": Math.min(1, Math.abs(v) * 1.1).toFixed(2) }));
      }
      c.occupy({ x: gx, y: gy, w: nc * cw, h: nr * ch });
      c.text(16, 30, `step ${kk}: ${f2(a)}·clean + ${f2(b)}·noise`, { size: 15, weight: 700, mono: true });
      if (s >= 2) c.box({ x: 400, y: 50, w: 226, h: 56, label: "network: predict what was added", sub: "input: noisy latent, k", tone: "take", hl: s === 2 });
      if (s >= 3) { c.arrow(330, 268, 30, 268, { tone: "code", width: 2 }); c.label(180, 290, "generation: from step 1,000 down to 0", { anchor: "middle", size: 13, tone: "code", weight: 600 }); }
      if (s >= 4) c.box({ x: 400, y: 120, w: 226, h: 56, label: "in a VAE latent", sub: "16 × 64 × 32", tone: "paper", hl: s === 4 });
      if (s >= 5) c.box({ x: 400, y: 190, w: 226, h: 56, label: "condition: low-res mel", sub: "AudioLDM used a caption", tone: "bridge", hl: true });
    };
  };

  // ------------------------------------------------------- machine: whole
  D["machine"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const B = (x, y, label, sub, tone, step, o = {}) => c.box({ x, y, w: 136, h: 62, label, sub, tone, hl: s === step, size: 14, ...o });
      const a = B(16, 20, "8 kHz clip", "5.12 s", "bridge", 1);
      const b = B(174, 20, "resample", "to 48 kHz", "bridge", 1);
      const cc = B(332, 20, "find cutoff", "low-pass at it", "bridge", 1);
      c.connect(a, b); c.connect(b, cc);
      if (s < 2) return;
      const m = B(490, 20, "mel", "512 × 256", "paper", 2); c.connect(cc, m);
      const e = B(490, 140, "VAE encoder", "16 × 64 × 32", "paper", 2); c.connect(m, e);
      if (s < 3) return;
      const d = B(332, 140, "diffusion", "starts from noise", "take", 3); c.connect(e, d, { label: "steers" });
      if (s < 4) return;
      const dec = B(174, 140, "VAE decoder", "mel estimate", "paper", 4); c.connect(d, dec);
      const p1 = B(16, 140, "paste low bins", "mel, below cutoff", "code", 4); c.connect(dec, p1);
      if (s < 5) return;
      const v = B(16, 262, "HiFi-GAN", "48 kHz", "take", 5); c.connect(p1, v);
      const p2 = B(174, 262, "paste low band", "STFT, below cutoff", "code", 5); c.connect(v, p2);
      const o = B(332, 262, "48 kHz clip", "0–24 kHz", "code", 5); c.connect(p2, o);
    };
  };

  // ------------------------------------------------------- machine: latent
  D["latent"] = (fig, k) => {
    const c = k.canvas(W, H);
    const stack = (x, y, w, h, tone, label, hl) => {
      for (let i = 3; i >= 1; i--) c.add(k.h("rect", { x: x + i * 6, y: y - i * 6, width: w, height: h, rx: 4, class: `f-${tone} softer s-${tone}`, "stroke-width": 1 }));
      return c.box({ x, y, w, h, label, tone, hl, size: 13 });
    };
    return (s) => {
      c.clear();
      const mel = c.box({ x: 16, y: 40, w: 150, h: 150, label: "mel", sub: "512 × 256", tone: "bridge", hl: s === 1 });
      c.text(16, 220, "131,072 numbers", { size: 13, mono: true, tone: "bridge" });
      if (s >= 2) {
        const z = stack(236, 80, 96, 76, "paper", "16 × 64 × 32", s === 2);
        c.connect(mel, z, { label: "÷8 ÷8" });
        c.text(236, 220, "32,768 numbers", { size: 13, mono: true, tone: "paper" });
      }
      if (s >= 3) {
        const n = stack(430, 30, 96, 60, "muted", "noisy latent", s === 3);
        const cnd = stack(430, 130, 96, 60, "bridge", "low-res latent", s === 3);
        const u = c.box({ x: 400, y: 260, w: 226, h: 56, label: "UNet: 32 ch in, 16 out", sub: "stacked as channels", tone: "take", hl: s === 3 });
        c.connect(cnd, u);
        c.text(560, 66, "+", { size: 22, weight: 700, anchor: "middle" });
      }
      if (s >= 4) c.box({ x: 16, y: 262, w: 360, h: 56, label: "start = noise; the condition only steers", sub: "a bridge would start from it", tone: "predict", hl: true });
    };
  };

  // ------------------------------------------------------- machine: schedule
  D["schedule"] = (fig, k) => {
    const sch = k.toggle({ label: "schedule", options: ["linear", "cosine"], value: "linear" });
    k.follow(sch, { 1: "linear", 4: "cosine" });
    const c = k.canvas(W, H);
    const ks = Array.from({ length: 101 }, (_, i) => i * 10);
    return (s) => {
      c.clear();
      const cos = sch.value === "cosine";
      const p = c.plot({ series: [
        { x: ks, y: ks.map((q) => Math.max(1e-5, Math.sqrt(linAbar[q]))), tone: "bad", dim: cos, label: "linear", labelAt: 60 },
        { x: ks, y: ks.map((q) => Math.max(1e-5, Math.sqrt(cosAbar[q]))), tone: "code", dim: !cos, label: "cosine", labelAt: 85 },
      ], xmin: 0, xmax: 1000, ymin: 1e-5, ymax: 1, ylog: true, y: 30, h: 330, xlabel: "diffusion step k", ylabel: "signal left, √ᾱ (log)", yFmt: (v) => (v >= 0.01 ? `${v * 100}%` : `${+(v * 100).toPrecision(1)}%`) });
      c.text(16, 20, cos ? "Cosine: the last step is pure noise" : "Linear: the last step still holds signal", { size: 14, weight: 700 });
      const last = Math.sqrt((cos ? cosAbar : linAbar)[T]);
      if (s >= 2) {
        c.dot(p.X(1000), p.Y(Math.max(1e-5, last)), { tone: cos ? "code" : "bad", r: 6 });
        c.label(p.X(1000) - 10, p.Y(Math.max(1e-5, last)) - 14, `${(last * 100).toPrecision(2)}% left`, { anchor: "end", size: 13, tone: cos ? "code" : "bad", weight: 700 });
      }
      if (s === 3) c.box({ x: 120, y: 230, w: 300, h: 44, label: "sampling starts from 0% signal", size: 13, tone: "predict", hl: true });
      if (s >= 5) c.box({ x: 90, y: 230, w: 360, h: 44, label: "target v = √ᾱ·ε − √(1−ᾱ)·z₀", mono: true, size: 13, tone: "take", hl: true });
    };
  };

  // ------------------------------------------------------- machine: guidance
  D["guidance"] = (fig, k) => {
    const w = k.slider({ label: "w", min: 1, max: 6, step: 0.5, value: 1 });
    k.follow(w, { 1: 1, 3: 2, 4: 3.5 });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      if (s === 1) {
        c.text(16, 30, "Training batches", { size: 15, weight: 700 });
        const items = Array.from({ length: 10 }, (_, i) => ({ t: i === 6 ? "∅ empty" : "low-res", tone: i === 6 ? "predict" : "bridge", hl: i === 6 }));
        c.chips({ x: 16, y: 50, items, size: 13 });
        c.text(16, 190, "1 in 10 sees no condition, so the model also learns to generate unconditionally", { size: 13, tone: "muted", maxW: 600 });
        return;
      }
      const O = [110, 320], U = [160, -40], C = [190, -80];
      const G = [U[0] + w.value * (C[0] - U[0]), U[1] + w.value * (C[1] - U[1])];
      const P = (v) => [O[0] + v[0], O[1] + v[1]];
      c.dot(O[0], O[1], { tone: "ink", r: 5 });
      c.label(O[0] - 8, O[1] + 18, "current latent", { size: 12, tone: "muted", anchor: "end" });
      c.arrow(O[0], O[1], ...P(U), { tone: "muted", width: 2 });
      c.label(P(U)[0] + 10, P(U)[1] + 6, "without condition", { size: 13, tone: "muted" });
      c.arrow(O[0], O[1], ...P(C), { tone: "paper", width: 2 });
      c.label(P(C)[0] + 10, P(C)[1] + 4, "with condition", { size: 13, tone: "paper" });
      if (s >= 3) {
        c.arrow(O[0], O[1], ...P(G), { tone: "predict", width: 2.6 });
        c.label(P(G)[0] + 10, P(G)[1], `guided, w = ${w.value}`, { size: 14, tone: "predict", weight: 700 });
        c.text(330, 300, "u + w·(c − u)", { size: 15, mono: true, tone: "predict" });
      }
      if (s >= 4) c.box({ x: 400, y: 30, w: 226, h: 44, label: "code default: w = 3.5", size: 13, tone: "code", hl: s === 4 });
      if (s >= 5) c.box({ x: 400, y: 86, w: 226, h: 56, label: "far past the cue", sub: "risk: over-boosted highs", tone: "bad", hl: true, dashed: true });
    };
  };

  // ------------------------------------------------------- machine: cutoff
  D["cutoff"] = (fig, k) => {
    const pc = k.slider({ label: "energy point", min: 0.9, max: 0.999, step: 0.001, value: 0.99, fmt: (v) => `${(v * 100).toFixed(1)}%` });
    k.follow(pc, { 1: 0.99, 3: 0.985 });
    const c = k.canvas(W, H);
    const N = 96, r = rng(21);
    const fq = Array.from({ length: N }, (_, i) => ((i + 0.5) / N) * 24);
    const mag = fq.map((f) => (f < 4 ? 1.0 * Math.exp(-f / 1.6) * (0.8 + 0.4 * r()) : 0.00015 * (0.5 + r())));   // made up: band ends at 4 kHz, faint noise above
    const cum = []; mag.reduce((a, v, i) => (cum[i] = a + v), 0);
    return (s) => {
      c.clear();
      const tot = cum[N - 1], idx = cum.findIndex((v) => v >= pc.value * tot), fc = fq[idx];
      const p = c.plot({ series: [{ x: fq, y: cum.map((v) => v / tot), tone: "paper", label: "running total", labelAt: 70 }],
        xmin: 0, xmax: 24, ymin: 0, ymax: 1, y: 40, h: 320, xlabel: "frequency (kHz)", ylabel: "share of energy", yFmt: (v) => `${Math.round(v * 100)}%` });
      fq.forEach((f, i) => c.add(k.h("rect", { x: p.X(f) - 1.4, y: p.Y(mag[i] * 0.8), width: 2.8, height: p.Y(0) - p.Y(mag[i] * 0.8), class: "f-bridge", "fill-opacity": "0.7" })));
      c.text(16, 26, "Our clip's spectrum and its running total", { size: 14, weight: 700 });
      if (s >= 2) {
        c.line(p.X(0), p.Y(pc.value), p.X(24), p.Y(pc.value), { tone: "predict", dash: true });
        c.line(p.X(fc), p.Y(0), p.X(fc), p.Y(1), { tone: "predict", width: 2 });
        c.label(p.X(fc) + 8, p.Y(0.55), `cutoff ≈ ${fc.toFixed(2)} kHz`, { size: 14, tone: "predict", weight: 700 });
      }
      if (s >= 4) c.box({ x: p.X(9), y: p.Y(0.42), w: 230, h: 44, label: "order-8 low-pass at the cutoff", size: 13, tone: "code", hl: s === 4 });
      if (s >= 5) c.box({ x: p.X(9), y: p.Y(0.25), w: 230, h: 44, label: "type: random of 4 (code)", size: 13, tone: "take", hl: true });
    };
  };

  // ------------------------------------------------------- machine: replace
  D["replace"] = (fig, k) => {
    const t = k.toggle({ label: "paste", options: ["off", "on"], value: "off" });
    k.follow(t, { 1: "off", 3: "on" });
    const c = k.canvas(W, H);
    const r = rng(13), A = Array.from({ length: 12 * 14 }, () => r()), Bv = Array.from({ length: 12 * 14 }, () => r());
    const grid = (x, y, mode, title, hl) => {
      const nr = 12, nc = 14, cw = 12, ch = 12, low = 5;   // bottom 5 rows: below the cutoff
      c.text(x, y - 10, title, { size: 13, weight: 700 });
      for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++) {
        const isLow = i >= nr - low;
        let cls = "f-take", op = 0.25 + 0.65 * Bv[i * nc + j];
        if (mode === "input") { if (!isLow) continue; cls = "f-bridge"; op = 0.25 + 0.65 * A[i * nc + j]; }
        if (mode === "pasted" && isLow) { cls = "f-bridge"; op = 0.25 + 0.65 * A[i * nc + j]; }
        c.add(k.h("rect", { x: x + j * cw, y: y + i * ch, width: cw - 1, height: ch - 1, class: cls, "fill-opacity": op.toFixed(2) }));
      }
      c.add(k.h("rect", { x: x - 2, y: y - 2, width: nc * cw + 2, height: nr * ch + 2, rx: 3, class: `f-none s-${hl ? "predict" : "muted"}`, "stroke-width": hl ? 2 : 1 }));
      c.occupy({ x, y, w: nc * cw, h: nr * ch });
      return { bx: { x, y, w: nc * cw, h: nr * ch, cx: x + (nc * cw) / 2, cy: y + (nr * ch) / 2, l: x, r: x + nc * cw, t: y, b: y + nr * ch } };
    };
    return (s) => {
      c.clear();
      const on = t.value === "on";
      const a = grid(16, 40, "input", "input mel", s === 1);
      const b = grid(240, 40, on ? "pasted" : "model", on ? "estimate, low bins pasted" : "model's estimate", s >= 2 && s <= 3);
      c.connect(a, b, { label: on ? "copy low bins" : "" });
      c.text(16, 214, "teal = from the input   violet = generated", { size: 12, tone: "muted" });
      if (s >= 4) {
        const v = c.box({ x: 464, y: 40, w: 160, h: 64, label: "HiFi-GAN", sub: "48 kHz audio", tone: "take" });
        c.connect(b, v);
        c.box({ x: 464, y: 120, w: 160, h: 64, label: "paste STFT low band", sub: "energy-matched (code)", tone: "code", hl: s === 4 });
      }
      if (s >= 5) {
        c.text(16, 252, "low-band LSD, measured by others (lower is better)", { size: 13, weight: 700 });
        hbars(c, { x: 16, y: 262, w: 610, labelW: 150, rowH: 40, max: 0.6, fmt: f3,   // arXiv 2509.17609, Table 1, VCTK 8→48
          rows: [{ label: "raw 8 kHz input", v: 0.187, tone: "bridge" }, { label: "AudioSR", v: 0.486, tone: "bad", hl: true }] });
      }
    };
  };

  // ------------------------------------------------------- machine: data
  D["data"] = (fig, k) => {
    const fc = k.slider({ label: "cutoff", min: 2, max: 16, step: 0.5, value: 6, fmt: (v) => `${v} kHz` });
    const ty = k.toggle({ label: "filter", options: ["Butterworth", "Chebyshev"], value: "Butterworth" });
    const od = k.toggle({ label: "order", options: ["2", "10"], value: "2" });
    k.follow(fc, { 2: 6 }); k.follow(ty, { 1: "Butterworth", 3: "Chebyshev" }); k.follow(od, { 1: "2", 3: "10" });
    const c = k.canvas(W, H);
    const cheb = (n, x) => (x <= 1 ? Math.cos(n * Math.acos(x)) : Math.cosh(n * Math.acosh(x)));
    return (s) => {
      c.clear();
      const n = +od.value, cut = fc.value, e2 = 10 ** (0.1 / 10) - 1;   // 0.1 dB ripple, as in the code's cheby1
      const resp = (f) => { const x = f / cut; const g2 = ty.value === "Butterworth" ? 1 / (1 + x ** (2 * n)) : 1 / (1 + e2 * cheb(n, x) ** 2); return Math.max(-80, 10 * Math.log10(g2)); };
      const xs = Array.from({ length: 241 }, (_, i) => i * 0.1);
      c.text(16, 24, s === 1 ? "~7,000 h: music stems, FreeSound, OpenSLR speech" : `${ty.value}, order ${n}, cutoff ${cut} kHz`, { size: 14, weight: 700 });
      c.plot({ series: [{ x: xs, y: xs.map(resp), tone: "paper", dim: s === 1 }], xmin: 0, xmax: 24, ymin: -80, ymax: 5, y: 40, h: 320, xlabel: "frequency (kHz)", ylabel: "filter gain (dB)" });
      if (s >= 4) c.box({ x: 360, y: 60, w: 260, h: 44, label: "AudioSR-Speech: speech fine-tune", size: 13, tone: "take", hl: s === 4 });
      if (s >= 5) c.box({ x: 360, y: 116, w: 260, h: 56, label: "44.1 kHz source: empty above 22 kHz", sub: "even after resampling", tone: "bad", hl: true, dashed: true });
    };
  };

  // ------------------------------------------------------- results: VCTK
  D["vctk"] = (fig, k) => {
    const cut = k.toggle({ label: "input cutoff", options: ["4 kHz", "8 kHz", "12 kHz"], value: "4 kHz" });
    k.follow(cut, { 1: "4 kHz", 3: "8 kHz", 4: "12 kHz", 5: "4 kHz" });
    const c = k.canvas(W, H);
    // Table 1, VCTK LSD at 4 / 8 / 12 kHz cutoff
    const T1 = [["NuWave", [1.42, 1.36, 1.22]], ["NVSR", [0.91, 0.81, 0.70]], ["AudioSR", [1.30, 1.11, 0.94]], ["AudioSR-Speech", [1.03, 0.82, 0.69]]];
    const HL = { 1: [], 2: ["NVSR", "AudioSR"], 3: ["NVSR", "AudioSR-Speech"], 4: ["NVSR", "AudioSR-Speech"], 5: ["NuWave"] };
    return (s) => {
      c.clear();
      const j = ["4 kHz", "8 kHz", "12 kHz"].indexOf(cut.value), lit = HL[s];
      c.text(16, 22, `VCTK, ${cut.value} cutoff: LSD (lower is better). Raw input: ${[5.15, 4.85, 3.84][j]}`, { size: 13, weight: 700 });
      const X = hbars(c, { x: 16, y: 44, w: 610, labelW: 150, rowH: 64, max: 1.5,
        rows: T1.map(([l, v]) => ({ label: l, v: v[j], tone: l.startsWith("AudioSR") ? "code" : "paper", hl: lit.includes(l), dim: lit.length > 0 && !lit.includes(l) })) });
      c.line(X(0.64), 40, X(0.64), 306, { tone: "predict", dash: true, width: 1.5 });
      c.label(X(0.64), 326, "vocoder floor 0.64", { anchor: "middle", size: 12, tone: "predict" });
    };
  };

  // ------------------------------------------------------- results: music and sound
  D["music-sound"] = (fig, k) => {
    const ds = k.toggle({ label: "test set", options: ["music", "sound"], value: "music" });
    k.follow(ds, { 1: "music", 3: "sound" });
    const c = k.canvas(W, H);
    // Table 1, LSD at 4 / 8 / 16 kHz cutoffs: [NVSR-DNN, NVSR-ResUNet, AudioSR]
    const M = { music: [[1.67, 1.70, 0.99], [1.49, 1.34, 0.74], [1.13, 0.95, 0.73]], sound: [[1.64, 1.80, 1.74], [1.59, 1.69, 1.57], [1.76, 1.67, 1.35]] };
    const GT = { music: 0.61, sound: 0.84 };
    const HL = { 1: [0, 1, 2], 2: [1, 2], 3: [1, 2], 4: [0] };
    return (s) => {
      c.clear();
      const d = ds.value;
      c.text(16, 22, `${d === "music" ? "AudioStock music" : "ESC-50 sound"}: LSD (lower is better), vocoder floor ${GT[d]}`, { size: 13, weight: 700 });
      c.text(16, 44, "grey NVSR-DNN · blue NVSR-ResUNet · green AudioSR", { size: 12, tone: "muted" });
      c.bars({ x: 16, y: 58, w: 610, rowH: 92, labelW: 110, max: 2, fmt: f2, tones: ["muted", "paper", "code"],
        rows: ["4 kHz", "8 kHz", "16 kHz"].map((l, i) => ({ label: `${l} cutoff`, values: M[d][i], hl: HL[s].includes(i), dim: !HL[s].includes(i) })) });
    };
  };

  // ------------------------------------------------------- results: LSD vs listeners
  D["ears"] = (fig, k) => {
    const c = k.canvas(W, H);
    // Table 1, ESC-50 at 4 kHz cutoff: [name, LSD, listener score]
    const P = [["unprocessed", 3.90, 3.01, "muted"], ["NVSR-DNN", 1.64, 2.84, "bad"], ["NVSR-ResUNet", 1.80, 3.16, "paper"], ["AudioSR", 1.74, 4.01, "code"], ["GT-Mel", 0.84, 4.35, "take"]];
    const SHOW = { 1: ["unprocessed", "GT-Mel"], 2: ["unprocessed", "GT-Mel", "NVSR-DNN", "NVSR-ResUNet", "AudioSR"] };
    return (s) => {
      c.clear();
      const p = c.plot({ series: [], xmin: 0.5, xmax: 5.2, ymin: 2.5, ymax: 4.6, y: 30, h: 330, xlabel: "LSD (lower is better) →", ylabel: "listener score, 1–5" });
      c.text(16, 20, "ESC-50 sound effects, 4 kHz cutoff", { size: 14, weight: 700 });
      const shown = s === 1 ? SHOW[1] : SHOW[2];
      const lit = { 1: [], 2: ["NVSR-DNN"], 3: ["NVSR-DNN"], 4: ["AudioSR", "NVSR-DNN"], 5: ["AudioSR", "NVSR-DNN"] }[s];
      P.filter((q) => shown.includes(q[0])).forEach(([n, x, y, tone]) => {
        const on = lit.includes(n) || s === 1;
        c.dot(p.X(x), p.Y(y), { tone, r: on ? 8 : 6, dim: !on && s > 1 && !["unprocessed", "GT-Mel"].includes(n) });
        const lab = s >= 3 || n === "unprocessed" || n === "GT-Mel" ? `${n} (${x}, ${y})` : `${n} (${x})`;
        c.label(p.X(x) + 10, p.Y(y) - 10, lab, { size: 13, tone, weight: on ? 700 : 400 });
      });
      if (s >= 3) c.arrow(p.X(1.64) + 4, p.Y(2.95), p.X(3.8), p.Y(2.97), { tone: "bad", dash: true });
      if (s >= 5) c.box({ x: 330, y: 70, w: 290, h: 44, label: "authors: LSD may not suit sound (§5)", size: 13, tone: "predict", hl: true });
    };
  };

  // ------------------------------------------------------- results: plug-in
  D["plug-in"] = (fig, k) => {
    const g = k.toggle({ label: "generator", options: ["AudioLDM", "MusicGen", "FastSpeech 2"], value: "AudioLDM" });
    k.follow(g, { 3: "AudioLDM", 4: "MusicGen", 5: "FastSpeech 2" });
    const c = k.canvas(W, H);
    // Fig. 1, read off the plot by us: [without, no clear difference, with] in %
    const F = { AudioLDM: [24, 22, 54, 50], MusicGen: [21, 27, 52, 50], "FastSpeech 2": [17, 14, 69, 20] };
    return (s) => {
      c.clear();
      if (s <= 2) {
        Object.entries(F).forEach(([n, v], i) => c.box({ x: 16 + i * 206, y: 30, w: 196, h: 60, label: n, sub: `${v[3]} clips`, tone: "paper", hl: s === 1 }));
        if (s === 2) ["without", "no clear difference", "with AudioSR"].forEach((t, i) => c.box({ x: 16 + i * 206, y: 150, w: 196, h: 52, label: t, size: 14, tone: ["muted", "predict", "code"][i], hl: true }));
        return;
      }
      c.text(16, 22, "Listener preference (%), read off Fig. 1", { size: 13, weight: 700 });
      c.text(16, 44, "grey without · amber no clear difference · green with AudioSR", { size: 12, tone: "muted" });
      c.bars({ x: 16, y: 60, w: 610, rowH: 92, labelW: 120, max: 75, fmt: (v) => `${v}%`, tones: ["muted", "predict", "code"],
        rows: Object.entries(F).map(([n, v]) => ({ label: n, values: v.slice(0, 3), hl: n === g.value, dim: n !== g.value })) });
    };
  };

  // ------------------------------------------------------- your move: code
  D["code"] = (fig, k) => {
    const c = k.canvas(W, H);
    const ROWS = [
      ["utils.py", "lowpass_filtering_prepare_inference: 98.5%", "code"],
      ["utils.py", "get_basic_config: v, cosine, 0.1, 3.5", "code"],
      ["ddpm.py", "mel_replace_ops + postprocessing", "code"],
      ["README", "training code: Drive zip, Dec 2024", "predict"],
      ["LICENSE + card", "code MIT text · weights Apache-2.0", "paper"],
    ];
    return (s) => { c.clear(); board(c, ROWS, s, { rh: 66, qW: 170, top: 18, monoQ: true }); };
  };

  // ------------------------------------------------------- your move: reviewer
  D["reviewer"] = (fig, k) => {
    const c = k.canvas(W, H);
    const ROWS = [
      ["How noisy are the gaps?", "no error bars; one win is 0.01", "bad"],
      ["How many listened?", "not reported; one MOS condition", "bad"],
      ["Is the recipe in the paper?", "steps, guidance, size: code only", "predict"],
      ["Whose music test?", "100 tracks hand-picked by authors", "predict"],
      ["Does it hold up elsewhere?", "SigMOS 2.846 < raw input 3.136", "bad"],
      ["🧠 Steelman", "open weights, general audio, listeners", "code"],
    ];
    return (s) => { c.clear(); board(c, ROWS, s, { rh: 57, qW: 230 }); };
  };

  // ------------------------------------------------------- your move: after
  D["after"] = (fig, k) => {
    const c = k.canvas(W, H);
    const ITEMS = [
      ["2022-03", "NVSR", "mel + vocoder recipe", 1, "muted"],
      ["2023-01", "AudioLDM", "the latent diffusion", 1, "muted"],
      ["2023-09", "AudioSR", "this paper", 0, "take"],
      ["2025-01", "FLowHigh", "one-step flow matching", 2, "paper"],
      ["2025-01", "FlashSR", "AudioSR distilled, ~22× faster", 2, "paper"],
      ["2025-01", "A2SB", "STFT bridge", 3, "paper"],
      ["2025-09", "AudioLBM", "latent bridge; beats it", 3, "code"],
      ["2025-10", "UniverSR", "no separate vocoder", 5, "paper"],
    ];
    return (s) => {
      c.clear();
      c.line(112, 24, 112, 340, { tone: "muted" });
      ITEMS.forEach(([d, name, note, st, tone], i) => {
        if (s < st) return;
        const y = 18 + i * 41, now = st === s || (s === 4 && name === "AudioLBM");
        c.text(16, y + 21, d, { size: 13, mono: true, tone: "muted" });
        c.dot(112, y + 16, { tone, r: now ? 7 : 5 });
        c.box({ x: 134, y, w: 150, h: 32, label: name, size: 14, tone, hl: now });
        c.text(298, y + 21, s === 4 && name === "AudioLBM" ? "LSD(H) 0.724 vs AudioSR 0.994" : note, { size: 13, tone: now ? "ink" : "muted" });
      });
    };
  };

  // ------------------------------------------------------- your move: verdict
  D["verdict"] = (fig, k) => {
    const c = k.canvas(W, H);
    const ROWS = [
      ["Can you download it?", "yes: Apache-2.0 weights, pip install", "code"],
      ["Do listeners like it on TTS?", "69% prefer FastSpeech 2 with it", "code"],
      ["Is it fast enough?", "RTF 0.948 on an A800: offline only", "predict"],
      ["Will your audio suit it?", "low-pass first; MP3 edges break it", "predict"],
      ["🧠 Verdict", "try it offline; judge by ear", "take"],
    ];
    return (s) => { c.clear(); board(c, ROWS, s, { rh: 66, qW: 230, top: 18 }); };
  };
})();
