/* Drawings: "TTS: vocoders and voices" (part 5).
   HG = HiFi-GAN paper, arXiv:2010.05646, Table 1 (LJSpeech, one V100 GPU), found by us (FBU).
   Other FBU sources: Parallel WaveGAN arXiv:1910.11480, WaveGlow arXiv:1811.00002, DiffWave arXiv:2009.09761,
   WaveGrad arXiv:2009.00713, SpeechSplit arXiv:2004.11284. EX = illustrative running example (RD.sdr.EX). */
(function () {
  const D = RD.drawings, V = RD.sdr, W = V.W, H = V.H, EX = V.EX;
  const P = (V.p5 = {});
  const nf = (v) => Math.round(v).toLocaleString("en-US");

  // A waveform path through x..x+w around baseline y, from fn(t in 0..1) in -1..1.
  P.wave = (c, x, y, w, amp, fn, o = {}) => {
    const n = o.n || 160; let d = "";
    for (let i = 0; i <= n; i++) { const t = i / n; d += `${i ? "L" : "M"}${(x + t * w).toFixed(1)},${(y - amp * fn(t)).toFixed(1)} `; }
    return c.path(d, { tone: o.tone || "bridge", width: o.width || 1.6, dash: o.dash, dim: o.dim });
  };
  P.vowel = (t) => 0.6 * Math.sin(2 * Math.PI * 9 * t) + 0.3 * Math.sin(2 * Math.PI * 18 * t + 0.6) + 0.12 * Math.sin(2 * Math.PI * 27 * t + 1.1);
  P.time = (s) => (s < 1 ? `${(s * 1000).toFixed(s < 0.01 ? 1 : 0)} ms` : s < 120 ? `${s.toFixed(1)} s` : `${(s / 60).toFixed(1)} min`);

  // ---------------------------------------------------------------- why-vocoder
  D["why-vocoder"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const am = c.box({ x: 8, y: 24, w: 130, h: 60, label: "acoustic model", tone: "take", hl: s === 1 });
      const mel = c.box({ x: 170, y: 24, w: 140, h: 60, label: "mel", sub: `${EX.mels} × ${EX.frames}`, tone: "paper", hl: s === 2 || s === 3 });
      const voc = c.box({ x: 342, y: 24, w: 110, h: 60, label: s >= 4 ? "vocoder" : "vocoder ?", tone: "predict", hl: s === 1 || s === 4 });
      const wav = c.box({ x: 484, y: 24, w: 148, h: 60, label: "waveform", sub: `${nf(EX.samples)} samples`, tone: "bridge", hl: s === 2 });
      c.connect(am, mel); c.connect(mel, voc); c.connect(voc, wav);
      if (s === 1) c.text(320, 140, "Fig. 14 splits TTS into text analysis, acoustic model and vocoder", { anchor: "middle", size: 14, maxW: 600, tone: "muted" });
      if (s === 2) {
        V.tbars(c, [["mel numbers", EX.mels * EX.frames, true], ["waveform samples", EX.samples, true]],
          { y: 130, h: 120, labelW: 150, max: 80000, fmt: nf });
        c.text(320, 300, `${nf(EX.samples)} ÷ ${nf(EX.mels * EX.frames)} ≈ ${(EX.samples / (EX.mels * EX.frames)).toFixed(1)}× more numbers to make`, { anchor: "middle", size: 14, mono: true, tone: "predict" });
      }
      if (s === 3) {
        P.wave(c, 40, 200, 560, 50, P.vowel, { tone: "bridge" });
        P.wave(c, 40, 200, 560, 50, (t) => 0.6 * Math.sin(2 * Math.PI * 9 * t + 1.9) + 0.3 * Math.sin(2 * Math.PI * 18 * t + 2.8) + 0.12 * Math.sin(2 * Math.PI * 27 * t), { tone: "bad", dash: true });
        c.text(320, 300, "same energy per band, different phase: the same mel", { anchor: "middle", size: 14, tone: "bad" });
      }
      if (s === 4) {
        const a = c.box({ x: 40, y: 150, w: 170, h: 54, label: "guess phase", tone: "muted" });
        const b = c.box({ x: 235, y: 150, w: 170, h: 54, label: "inverse STFT", tone: "muted" });
        const d = c.box({ x: 430, y: 150, w: 170, h: 54, label: "STFT, keep magnitude", tone: "muted" });
        c.connect(a, b); c.connect(b, d);
        c.path("M515,208 L515,250 L125,250 L125,208", { tone: "predict", arrow: true });
        c.text(320, 280, "Griffin-Lim: repeat until consistent (found by us)", { anchor: "middle", size: 14, tone: "predict" });
      }
      if (s === 5) {
        V.tbars(c, [["real audio", 4.45, false], ["HiFi-GAN V1 on real mels", 4.36, true]], // HG Table 1
          { y: 130, h: 120, labelW: 200, max: 5, fmt: (v) => v.toFixed(2), tone: "code" });
        c.text(320, 300, "MOS (1–5): the vocoder alone already costs 0.09", { anchor: "middle", size: 14, tone: "predict" });
      }
    };
  };

  // ---------------------------------------------------------------- wavenet-cost
  const SPEED = { "WaveNet": 0.07, "WaveGlow": 501, "MelGAN": 14238, "HiFi-GAN V1": 3701 }; // HG Table 1, GPU kHz
  D["wavenet-cost"] = (fig, k) => {
    const m = k.toggle({ label: "vocoder", options: Object.keys(SPEED), value: "WaveNet" });
    k.follow(m, { 1: "WaveNet", 4: "HiFi-GAN V1", 5: "WaveNet", 6: "HiFi-GAN V1" });
    const len = k.slider({ label: "clip", min: 1, max: 10, step: 0.1, value: EX.sec, fmt: (v) => `${v.toFixed(1)} s` });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      // a serial chain of samples
      for (let i = 0; i < 14; i++) {
        const x = 30 + i * 42;
        c.dot(x, 40, { r: 7, tone: i === 13 ? "predict" : "bridge" });
        if (i) c.arrow(x - 36, 40, x - 8, 40, { tone: "muted", snap: false });
      }
      c.text(620, 45, "…", { size: 18, anchor: "end", tone: "muted" });
      c.text(30, 74, "each sample waits for every earlier one", { size: 13, tone: "muted" });
      const samples = Math.round(len.value * EX.sr), sec = samples / (SPEED[m.value] * 1000);
      if (s >= 2) c.text(30, 108, `${len.value.toFixed(1)} s × 22,050 Hz = ${nf(samples)} serial steps`, { size: 15, mono: true, tone: s === 2 ? "predict" : "ink" });
      if (s >= 3) {
        c.text(30, 136, `${nf(samples)} ÷ ${nf(SPEED[m.value] * 1000)} per s = ${P.time(sec)}  (${m.value})`, { size: 15, mono: true, tone: "predict", maxW: 590, lines: 1 });
        // log time axis 1 ms .. 10^4 s
        const X = (v) => 170 + ((Math.log10(v) + 3) / 7) * 440;
        [1e-3, 1e-1, 1, 10, 100, 1e4].forEach((v) => {
          c.line(X(v), 168, X(v), 264, { tone: "faint", width: 0.6 });
          c.text(X(v), 280, v < 1 ? `${v * 1000} ms` : v >= 100 ? `${v / 60 >= 1 ? Math.round(v / 60) + " min" : v + " s"}` : `${v} s`, { size: 11, anchor: "middle", tone: "muted", inBox: true });
        });
        c.text(160, 194, "audio length", { size: 12, anchor: "end", inBox: true });
        c.text(160, 240, "compute time", { size: 12, anchor: "end", inBox: true });
        c.box({ x: 170, y: 178, w: Math.max(4, X(len.value) - 170), h: 26, tone: "bridge", solid: false });
        c.box({ x: 170, y: 224, w: Math.max(4, X(Math.max(sec, 1.2e-3)) - 170), h: 26, tone: sec > len.value ? "bad" : "code", hl: true });
      }
      if (s === 5) c.box({ x: 30, y: 300, w: 580, h: 44, label: "WaveRNN · LPCNet · SampleRNN: smaller steps, still serial", tone: "take", hl: true });
      if (s === 6) c.text(320, 300, `first 0.5 s chunk ready in ${P.time(0.5 * EX.sr / (SPEED[m.value] * 1000))}`, { size: 14, mono: true, anchor: "middle", tone: "predict" });
      if (s === 6) c.text(320, 330, `RTF = ${P.time(sec)} ÷ ${len.value.toFixed(1)} s = ${(sec / len.value).toPrecision(2)}  ${sec < len.value ? "(keeps up)" : "(falls behind)"}`, { size: 15, mono: true, anchor: "middle", tone: sec < len.value ? "code" : "bad" });
    };
  };

  // ---------------------------------------------------------------- gan-vocoders
  D["gan-vocoders"] = (fig, k) => {
    const per = k.toggle({ label: "MPD period", options: ["2", "3", "5", "7", "11"], value: "3" });
    k.follow(per, { 1: "3", 3: "3" });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const p = +per.value;
      const mel = c.box({ x: 8, y: 14, w: 120, h: 50, label: "mel frame", tone: "paper" });
      const g = c.box({ x: 160, y: 14, w: 150, h: 50, label: "generator", sub: "upsample ×256", tone: "take", hl: s === 1 });
      c.connect(mel, g);
      const wb = c.box({ x: 342, y: 14, w: 290, h: 50, tone: "bridge" });
      c.connect(g, wb);
      P.wave(c, 352, 39, 270, 16, P.vowel, { n: 120 });
      if (s >= 2) {
        c.text(14, 98, "multi-scale (MelGAN)", { size: 13, weight: 700, tone: s === 2 ? "predict" : "ink" });
        [["raw", 1], ["×2 pooled", 2], ["×4 pooled", 4]].forEach(([lab, f], i) => {
          const y = 128 + i * 38;
          c.text(14, y + 4, lab, { size: 12, tone: "muted" });
          P.wave(c, 96, y, 200, 12, (t) => P.vowel(t), { n: Math.round(120 / f), tone: "bridge", dim: s > 2 && s !== 2 });
        });
      }
      if (s >= 3) {
        c.text(330, 98, `multi-period (HiFi-GAN): p = ${p}`, { size: 13, weight: 700, tone: s === 3 ? "predict" : "ink" });
        const n = 44;
        for (let i = 0; i < n; i++) {
          const x = 338 + i * 6.6, v = P.vowel(i / n);
          c.dot(x, 150 - v * 22, { r: 2.6, tone: i % p === 0 ? "predict" : "muted", noOcc: true });
        }
        c.text(330, 205, `fold T samples into T/${p} rows × ${p} columns;`, { size: 12, tone: "muted" });
        c.text(330, 222, "each column is judged on its own", { size: 12, tone: "muted" });
      }
      if (s >= 4) {
        const L = [["adversarial", "", "bad"], ["feature match", "L1 · ×2", "take"], ["mel loss", "L1 · ×45", "paper"]];
        L.forEach(([a, b, t], i) => c.box({ x: 8 + i * 150, y: 250, w: 138, h: 50, label: a, sub: b || undefined, tone: t, hl: s === 4 }));
      }
      if (s >= 5) c.box({ x: 466, y: 250, w: 166, h: 50, label: "multi-res STFT", sub: "Parallel WaveGAN", tone: "code", hl: true });
      if (s >= 4) c.text(320, 330, s >= 5 ? "Parallel WaveGAN: 1.44 M params, 28.68× real time at 24 kHz" : "generator loss = adversarial + 2·FM + 45·mel (HiFi-GAN Eq. 5)",
        { size: 13, anchor: "middle", tone: "predict", maxW: 620, lines: 1 });
    };
  };

  // ---------------------------------------------------------------- flow-diffusion-vocoders
  D["flow-diffusion-vocoders"] = (fig, k) => {
    const n = k.slider({ label: "diffusion steps", min: 1, max: 50, value: 6 });
    k.follow(n, { 3: 20, 4: 50, 5: 6 });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      c.text(8, 20, "flow: one invertible pass", { size: 13, weight: 700, tone: s <= 2 ? "predict" : "muted" });
      const z = c.box({ x: 8, y: 34, w: 90, h: 50, label: "noise z", tone: "muted", dim: s > 2 });
      let prev = z;
      for (let i = 0; i < 4; i++) {
        const b = c.box({ x: 130 + i * 92, y: 34, w: 72, h: 50, label: `f${i + 1}`, tone: "take", hl: s === 1, dim: s > 2 });
        c.arrow(prev.bx.r + 4, 59, b.bx.l - 4, 59, { tone: "muted", both: true, snap: false });
        prev = b;
      }
      const w1 = c.box({ x: 510, y: 34, w: 122, h: 50, label: "waveform", tone: "bridge", dim: s > 2 });
      c.arrow(prev.bx.r + 4, 59, w1.bx.l - 4, 59, { tone: "muted", both: true, snap: false });
      if (s >= 2) c.text(8, 112, "WaveGlow: > 500 kHz on a V100 · 87.73 M params · MOS 3.81", { size: 13, mono: true, tone: s === 2 ? "predict" : "muted", maxW: 620, lines: 1 });
      if (s >= 3) {
        const steps = n.value;
        c.text(8, 160, `diffusion: ${steps} denoising pass${steps > 1 ? "es" : ""}`, { size: 13, weight: 700, tone: "predict" });
        const z2 = c.box({ x: 8, y: 176, w: 90, h: 50, label: s >= 6 ? "shaped noise" : "noise", tone: s >= 6 ? "predict" : "muted", hl: s >= 6 });
        const show = Math.min(steps, 10);
        const bw = Math.min(60, Math.floor(380 / show) - 8);
        let pv = z2;
        for (let i = 0; i < show; i++) {
          const lab = steps > 10 && i === show - 2 ? "…" : steps > 10 && i === show - 1 ? `${steps}` : `${i + 1}`;
          const b = c.box({ x: 120 + i * (bw + 8), y: 176, w: bw, h: 50, label: lab, tone: "take", size: 12 });
          if (i === 0) c.connect(pv, b);
          pv = b;
        }
        const w2 = c.box({ x: 510, y: 176, w: 122, h: 50, label: "waveform", tone: "bridge" });
        c.connect(pv, w2);
        c.text(8, 256, `cost ≈ ${steps} × one network pass`, { size: 14, mono: true, tone: "ink" });
      }
      if (s === 4) c.text(8, 296, "DiffWave MOS 4.44 vs WaveNet vocoder 4.43", { size: 14, mono: true, tone: "code" });
      if (s === 5) c.text(8, 296, "WaveGrad: as few as 6 passes", { size: 14, mono: true, tone: "code", maxW: 600, lines: 2 });
      if (s === 6) c.text(8, 296, "PriorGrad, SpecGrad: noise shaped like the mel", { size: 14, mono: true, tone: "code", maxW: 600, lines: 2 });
    };
  };

  // ---------------------------------------------------------------- vocoder-families
  const FAM = [ // HG Table 1: [name, MOS, CPU ×RT, GPU ×RT, params M, family]
    ["WaveNet", 4.02, null, 0.003, 24.73, "AR"], ["WaveGlow", 3.81, 0.21, 22.75, 87.73, "flow"], ["MelGAN", 3.79, 6.59, 645.73, 4.26, "GAN"],
    ["HiFi-GAN V1", 4.36, 1.43, 167.86, 13.92, "GAN"], ["HiFi-GAN V2", 4.23, 9.74, 764.8, 0.92, "GAN"], ["HiFi-GAN V3", 4.05, 13.44, 1186.8, 1.46, "GAN"]];
  D["vocoder-families"] = (fig, k) => {
    const hw = k.toggle({ label: "hardware", options: ["GPU", "CPU"], value: "GPU" });
    k.follow(hw, { 1: "GPU" });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const j = hw.value === "GPU" ? 3 : 2;
      const p = c.plot({ series: [], xlog: true, xmin: 0.001, xmax: 10000, ymin: 3.7, ymax: 4.55, h: 340, y: 20,
        xlabel: `× faster than real time (${hw.value}, log)`, ylabel: "MOS", xFmt: (v) => (v < 1 ? String(v) : k.fmt(v)) });
      c.line(p.X(0.001), p.Y(4.45), p.X(10000), p.Y(4.45), { tone: "code", dash: true, width: 1.2 });
      c.label(p.X(0.004), p.Y(4.45) - 10, "real audio 4.45", { size: 12, tone: "code" });
      c.line(p.X(1), p.Y(3.7), p.X(1), p.Y(4.55), { tone: "bad", dash: true, width: 1.2 });
      c.label(p.X(1) + 6, p.Y(3.74), "real time", { size: 12, tone: "bad" });
      const lit = { 1: ["WaveNet"], 2: ["WaveGlow"], 3: ["MelGAN"], 4: ["HiFi-GAN V1", "HiFi-GAN V2", "HiFi-GAN V3"], 5: [], 6: ["MelGAN", "HiFi-GAN V1", "HiFi-GAN V2", "HiFi-GAN V3"] }[s];
      FAM.forEach((r) => {
        if (r[j] == null) return;
        const on = lit.includes(r[0]);
        const tone = { AR: "muted", flow: "take", GAN: "paper" }[r[5]];
        c.dot(p.X(r[j]), p.Y(r[1]), { r: on ? 8 : 5, tone: on ? "predict" : tone });
        c.label(p.X(r[j]), p.Y(r[1]) - 14, `${r[0]} ${r[1].toFixed(2)}`, { size: 12, anchor: "middle", weight: on ? 700 : 400, dim: lit.length > 0 && !on });
      });
      if (j === 2) c.label(p.X(0.003), p.Y(4.02), "WaveNet: no CPU figure", { size: 11, tone: "muted" });
      if (s === 5) c.label(p.X(0.05), p.Y(4.3), "diffusion: not in this table", { size: 13, tone: "predict", weight: 700 });
      if (s === 6) c.label(p.X(0.05), p.Y(4.3), "streaming: vocode mel chunk by chunk", { size: 13, tone: "predict", weight: 700 });
    };
  };

  // ---------------------------------------------------------------- gst-prosody
  const GSTW = { calm: [0.42, 0.08, 0.05, 0.3, 0.1, 0.05], urgent: [0.05, 0.38, 0.32, 0.05, 0.05, 0.15] }; // illustrative
  D["gst-prosody"] = (fig, k) => {
    const ref = k.toggle({ label: "reference", options: ["calm", "urgent"], value: "calm" });
    k.follow(ref, { 1: "calm", 5: "urgent" });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const txt = c.box({ x: 8, y: 290, w: 220, h: 50, label: "“Your balance is £1,250.75.”", tone: "paper", size: 13, hl: s === 1 });
      const tac = c.box({ x: 270, y: 290, w: 150, h: 50, label: "Tacotron", tone: "take" });
      const mel = c.box({ x: 462, y: 290, w: 170, h: 50, label: "mel", sub: s >= 2 ? `${ref.value} style` : "style?", tone: "paper" });
      c.connect(txt, tac); c.connect(tac, mel);
      if (s === 1) c.chips({ x: 20, y: 120, items: [{ t: "calm?" }, { t: "cheerful?" }, { t: "worried?" }].map((it) => ({ ...it, tone: "predict", hl: true })) });
      if (s >= 2) {
        const r = c.box({ x: 8, y: 20, w: 150, h: 54, label: `${ref.value} clip`, sub: s >= 3 ? "other speaker" : "reference", tone: "bridge", hl: s === 3 });
        const e = c.box({ x: 8, y: 110, w: 150, h: 54, label: "reference encoder", tone: "take", hl: s === 2 });
        c.connect(r, e);
        const st = c.box({ x: 8, y: 200, w: 150, h: 50, label: "style vector", tone: "predict", hl: s === 2 });
        c.connect(e, st); c.connect(st, tac, { route: "elbow" });
        if (s >= 4) {
          c.text(220, 30, "global style tokens: attention weights", { size: 13, weight: 700, tone: "ink" });
          V.tbars(c, GSTW[ref.value].map((v, i) => [`token ${i + 1}`, v, s >= 4]), { x: 200, y: 44, w: 432, h: 210, labelW: 80, max: 0.5, fmt: (v) => v.toFixed(2), tone: "take" });
          if (s === 5) c.label(600, 270, "set weights by hand at inference", { size: 12, anchor: "end", tone: "predict", weight: 700 });
        }
      }
    };
  };

  // ---------------------------------------------------------------- controllable
  D["controllable"] = (fig, k) => {
    const pre = k.toggle({ label: "control", options: ["neutral", "1.25× speed", "higher", "excited"], value: "neutral" });
    k.follow(pre, { 1: "neutral", 2: "1.25× speed", 3: "higher", 4: "excited", 5: "neutral" });
    const c = k.canvas(W, H);
    const base = (t) => 165 - 35 * t + 22 * Math.sin(2 * Math.PI * 2.6 * t) * Math.exp(-0.8 * t) + 9 * Math.sin(2 * Math.PI * 7 * t);
    return (s) => {
      c.clear();
      const v = pre.value;
      const speed = v === "1.25× speed" ? 1.25 : v === "excited" ? 1.1 : 1;
      const shift = v === "higher" ? 40 : v === "excited" ? 45 : 0, range = v === "excited" ? 1.8 : 1;
      const N = Math.round(EX.frames / speed);
      const xs = [], ref = [], cur = [];
      for (let i = 0; i <= 60; i++) { const t = i / 60; xs.push(t * N); cur.push(165 + (base(t) - 165) * range + shift); }
      const xr = [], yr = [];
      for (let i = 0; i <= 60; i++) { const t = i / 60; xr.push(t * EX.frames); yr.push(base(t)); }
      const p = c.plot({ series: [{ x: xr, y: yr, tone: "muted", dash: true, width: 1.4 }, { x: xs, y: cur, tone: "bridge", width: 2.6 }],
        xmin: 0, xmax: 300, ymin: 60, ymax: 300, h: s >= 5 ? 250 : 340, xlabel: "frame", ylabel: "F0 (Hz)" });
      c.label(p.X(N), p.Y(cur[60]) - 16, `${N} frames`, { size: 13, tone: "predict", weight: 700, anchor: "middle" });
      if (v !== "neutral") c.label(p.X(250), p.Y(90), "dashed: neutral", { size: 12, tone: "muted" });
      if (s === 5) ["speech analysis", "NLP", "machine learning"].forEach((t, i) => c.box({ x: 8 + i * 210, y: 268, w: 200, h: 54, label: t, tone: ["bridge", "paper", "take"][i], hl: true }));
      if (s === 6) c.box({ x: 60, y: 268, w: 520, h: 54, label: "prompt: “a calm, older voice with a soft accent”", tone: "predict", hl: true, size: 14 });
    };
  };

  // ---------------------------------------------------------------- disentangle
  D["disentangle"] = (fig, k) => {
    const wd = k.toggle({ label: "bottleneck", options: ["narrow", "right", "wide"], value: "right" });
    k.follow(wd, { 1: "right", 3: "wide", 4: "right" });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const inp = c.box({ x: 8, y: 130, w: 100, h: 60, label: "speech", tone: "bridge" });
      const bw = { narrow: 14, right: 34, wide: 76 }[wd.value];
      const rows = [["content", "paper"], ["rhythm", "take"], ["pitch", "predict"]];
      const dec = c.box({ x: 500, y: 130, w: 132, h: 60, label: "decoder", tone: "take", hl: s === 2 });
      rows.forEach(([lab, tone], i) => {
        const y = 30 + i * 90;
        const e = c.box({ x: 150, y, w: 150, h: 54, label: `${lab} encoder`, tone, hl: s === 2, dim: s === 1 });
        c.connect(inp, e, { dim: s === 1 });
        const b = c.box({ x: 330 + (76 - bw) / 2, y: y + 6, w: bw, h: 42, tone: s === 3 ? "predict" : "muted", hl: s === 3, dim: s === 1 });
        c.connect(e, b, { dim: s === 1 }); c.connect(b, dec, { dim: s === 1 });
      });
      const spk = c.box({ x: 500, y: 30, w: 132, h: 54, label: "timbre", sub: "speaker emb.", tone: "bridge", dim: s === 1 });
      c.connect(spk, dec, { dim: s === 1 });
      if (s === 1) c.text(320, 340, "goal: change one factor, keep the rest", { size: 14, anchor: "middle", tone: "predict" });
      if (s >= 2 && s <= 3 && wd.value !== "right")
        c.label(420, 300, wd.value === "wide" ? "too wide: timbre leaks into content" : "too narrow: words get lost", { size: 13, tone: "bad", weight: 700, anchor: "middle" });
      if (s === 4) c.box({ x: 500, y: 222, w: 132, h: 76, label: "adversary", sub: "guess speaker", tone: "bad", hl: true });
      if (s === 5) c.box({ x: 500, y: 222, w: 132, h: 76, label: "noise model", sub: "per frame", tone: "bad", hl: true });
    };
  };

  // ---------------------------------------------------------------- robustness
  D["robustness"] = (fig, k) => {
    const c = k.canvas(W, H);
    const rows = [ // §5.2.10
      ["unseen or atypical text", "RobuTrans: text → linguistic features", "code"],
      ["extra-long sentences", "s-Transformer: segment-level attention", "code"],
      ["missing local context", "local RNN + Transformer (20 h Mandarin)", "code"],
      ["noisy reference audio", "diffusion + distillation for prosody", "code"],
      ["fragile alignment", "robust alignment module (Shih et al.)", "code"],
      ["sort codes, amounts, dates", "our take: test these first", "take"]];
    return (s) => V.board(c, rows, s, { split: 250 });
  };

  // ---------------------------------------------------------------- resynthesis
  D["resynthesis"] = (fig, k) => {
    const c = k.canvas(W, H);
    const units = [71, 12, 12, 57, 3, 88, 88, 40]; // illustrative unit IDs
    return (s) => {
      c.clear();
      const sp = c.box({ x: 8, y: 30, w: 110, h: 54, label: "speech", tone: "bridge", hl: s === 1 });
      const enc = c.box({ x: 150, y: 30, w: 120, h: 54, label: "S2u", sub: "encoder", tone: "take", hl: s === 2, dim: s < 2 });
      c.connect(sp, enc, { dim: s < 2 });
      if (s >= 2) c.chips({ x: 300, y: 44, items: units.map((u) => ({ t: String(u), tone: "paper", hl: s === 2 })) });
      if (s >= 3) {
        const lm = c.box({ x: 150, y: 130, w: 120, h: 54, label: "uLM", sub: "unit LM", tone: "take", hl: s === 3 });
        c.connect(enc, lm);
        c.chips({ x: 300, y: 144, items: units.map((u) => ({ t: String(u), tone: "paper", dim: true })).concat([{ t: "19", tone: "predict", dashed: true, hl: true }, { t: "19", tone: "predict", dashed: true, hl: true }, { t: "64", tone: "predict", dashed: true, hl: true }]) });
      }
      if (s >= 4) {
        const dec = c.box({ x: 150, y: 230, w: 120, h: 54, label: "u2S", sub: "decoder", tone: "take", hl: s === 4 });
        const out = c.box({ x: 8, y: 230, w: 110, h: 54, label: "speech", tone: "bridge", hl: s === 4 });
        c.connect(dec, out);
        if (s < 6) c.text(300, 262, "no text, no labels anywhere", { size: 14, tone: "code", weight: 700 });
        if (s >= 5) {
          const pr = c.box({ x: 300, y: 296, w: 150, h: 50, label: "pitch / prosody", tone: "predict", hl: s === 5 });
          const spk = c.box({ x: 470, y: 296, w: 150, h: 50, label: "speaker", tone: "bridge", hl: s === 5 });
          c.connect(pr, dec, { route: "elbow" });
        }
      }
      if (s === 6) c.box({ x: 300, y: 240, w: 320, h: 44, label: "+ text prompt, codec tokens → VALL-E", tone: "predict", hl: true, size: 13 });
    };
  };

  // ---------------------------------------------------------------- voice-conversion
  D["voice-conversion"] = (fig, k) => {
    const f = k.toggle({ label: "family", options: ["seq2seq", "ASR+TTS", "CycleGAN", "VAE"], value: "seq2seq" });
    k.follow(f, { 1: "seq2seq", 3: "ASR+TTS", 4: "CycleGAN", 5: "VAE" });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const a = c.box({ x: 8, y: 20, w: 170, h: 54, label: "voice A", sub: "“balance…”", tone: "bridge" });
      const b = c.box({ x: 462, y: 20, w: 170, h: 54, label: "voice B", sub: "“balance…”", tone: "code" });
      const vc = c.box({ x: 230, y: 20, w: 180, h: 54, label: "voice conversion", tone: "take", hl: s === 1 });
      c.connect(a, vc); c.connect(vc, b);
      if (s === 1) { c.text(320, 200, "keep the words · swap the speaker", { size: 16, anchor: "middle", tone: "predict", weight: 700 }); return; }
      const v = f.value, y = 140;
      if (v === "seq2seq") {
        const e = c.box({ x: 60, y, w: 200, h: 60, label: "Transformer encoder", tone: "take" });
        const d = c.box({ x: 380, y, w: 200, h: 60, label: "decoder", sub: "TTS-pretrained", tone: "take" });
        c.connect(e, d, { label: "attention" });
        c.text(320, 260, "converts prosody too, not only timbre", { size: 14, anchor: "middle", tone: "code" });
      } else if (v === "ASR+TTS") {
        const r = c.box({ x: 20, y, w: 160, h: 60, label: "ASR", tone: "paper" });
        const t = c.box({ x: 240, y, w: 160, h: 60, label: "content", sub: "words / PPG", tone: "muted" });
        const ts = c.box({ x: 460, y, w: 160, h: 60, label: "TTS", sub: "target voice", tone: "take" });
        c.connect(r, t); c.connect(t, ts);
        c.text(320, 260, "prosody is dropped at the middle box", { size: 14, anchor: "middle", tone: "bad" });
      } else if (v === "CycleGAN") {
        const g1 = c.box({ x: 120, y, w: 160, h: 60, label: "G: A → B", tone: "take" });
        const g2 = c.box({ x: 360, y, w: 160, h: 60, label: "F: B → A", tone: "take" });
        c.path("M280,160 C320,120 330,120 360,160", { tone: "muted", arrow: true });
        c.path("M360,190 C330,230 320,230 280,190", { tone: "muted", arrow: true });
        c.text(320, 270, "F(G(a)) ≈ a: no parallel sentences needed", { size: 14, anchor: "middle", tone: "code" });
      } else {
        const e = c.box({ x: 20, y, w: 160, h: 60, label: "encoder", tone: "take" });
        const z = c.box({ x: 240, y, w: 160, h: 60, label: "content code", tone: "paper" });
        const d = c.box({ x: 460, y, w: 160, h: 60, label: "decoder", tone: "take" });
        const spk = c.box({ x: 460, y: 240, w: 160, h: 50, label: "speaker B code", tone: "code" });
        c.connect(e, z); c.connect(z, d); c.connect(spk, d);
        c.text(20, 270, "works with little data", { size: 14, tone: "code" });
      }
      if (s === 6) c.box({ x: 120, y: 300, w: 400, h: 46, label: "consent first: the same tools fool voice biometrics", tone: "bad", hl: true });
    };
  };

  // ---------------------------------------------------------------- low-resource
  D["low-resource"] = (fig, k) => {
    const c = k.canvas(W, H);
    const DS = [["LibriTTS", 585], ["AISHELL-3", 85], ["VCTK", 44], ["LJSpeech", 24], ["CMU ARCTIC", 20], ["L2-ARCTIC", 11.2]]; // Table 5, §5.2.2
    const TECH = [["unpaired data", "semi-supervised"], ["ASR+MT+TTS", "cascade labels"], ["crowdsourcing", "volunteer data"], ["zero-shot style", "transfer"]];
    return (s) => {
      c.clear();
      c.text(8, 16, "TTS corpora (hours)", { size: 13, weight: 700 });
      V.tbars(c, DS.map(([n, h]) => [n, h, s === 1 || (s === 6 && n === "L2-ARCTIC"), s === 6 && n !== "L2-ARCTIC"]), { y: 26, h: 180, labelW: 110, max: 620, fmt: (v) => `${v} h` });
      if (s === 1) c.label(420, 120, "most languages: none of this", { size: 13, tone: "bad", weight: 700 });
      TECH.forEach(([a, b], i) => {
        if (s < i + 2 && s !== 6) return;
        c.box({ x: 8 + i * 157, y: 232, w: 148, h: 64, label: a, sub: b, tone: "take", hl: s === i + 2, dim: s === 6 });
      });
      if (s === 6) c.text(320, 330, "accents need data too: L2-ARCTIC is 11.2 h", { size: 14, anchor: "middle", tone: "predict", weight: 700 });
    };
  };

  // ---------------------------------------------------------------- tts-eval
  D["tts-eval"] = (fig, k) => {
    const N = k.slider({ label: "ratings", min: 20, max: 2000, step: 10, value: 100 });
    k.follow(N, { 2: 100, 3: 780 });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const X = (v) => 170 + ((v - 3.8) / 0.9) * 440;
      [3.8, 4.0, 4.2, 4.4, 4.6].forEach((v) => { c.line(X(v), 20, X(v), 170, { tone: "faint", width: 0.6 }); c.text(X(v), 186, v.toFixed(1), { size: 11, anchor: "middle", tone: "muted", inBox: true }); });
      const half = 1.96 / Math.sqrt(N.value);
      const rows = [["real audio", 4.45, 0.06, "code"], ["HiFi-GAN V1", 4.36, 0.07, "paper"], ["your system", 4.2, half, "predict"]]; // HG Table 1; last row illustrative
      rows.forEach(([lab, m, h], i) => {
        const y = 40 + i * 46;
        c.text(160, y + 5, lab, { size: 13, anchor: "end", weight: i === 2 && s === 2 ? 700 : 400, inBox: true });
        const showCI = (i === 2 && s >= 2) || (i < 2 && s >= 3);
        if (showCI) {
          c.line(X(Math.max(3.8, m - h)), y, X(Math.min(4.7, m + h)), y, { tone: rows[i][3], width: 3 });
          c.line(X(Math.max(3.8, m - h)), y - 7, X(Math.max(3.8, m - h)), y + 7, { tone: rows[i][3], width: 2 });
          c.line(X(Math.min(4.7, m + h)), y - 7, X(Math.min(4.7, m + h)), y + 7, { tone: rows[i][3], width: 2 });
        }
        c.dot(X(m), y, { r: 6, tone: rows[i][3] });
      });
      if (s >= 2) c.text(320, 214, `±1.96·σ/√N = 1.96 / √${N.value} = ±${half.toFixed(3)}  (σ = 1)`, { size: 14, mono: true, anchor: "middle", tone: s === 2 ? "predict" : "muted" });
      if (s === 3) c.text(320, 240, "4.36 + 0.07 = 4.43 > 4.39 = 4.45 − 0.06: overlap", { size: 14, mono: true, anchor: "middle", tone: "bad" });
      if (s === 4) [["MCD", "mel-cepstral distance (dB)"], ["WER / CER", "ASR on the output"]].forEach(([a, b], i) => c.box({ x: 60 + i * 270, y: 240, w: 250, h: 70, label: a, sub: b, tone: "paper", hl: true }));
      if (s === 5) [["CMOS", "A vs B"], ["MUSHRA", "hidden ref."], ["SECS", "speaker sim."], ["RTF · TTFA", "speed"]].forEach(([a, b], i) => c.box({ x: 8 + i * 157, y: 240, w: 148, h: 70, label: a, sub: b, tone: "take", hl: true }));
      if (s === 6) c.box({ x: 60, y: 240, w: 520, h: 70, label: "report: listeners · ratings · 95% CI · sentences · ASR model", tone: "predict", hl: true, size: 14 });
    };
  };
})();
