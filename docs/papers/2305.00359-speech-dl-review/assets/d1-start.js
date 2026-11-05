/* Drawings: "Start" and "Toolbox: sound" (part 1). Survey facts carry // §N or // Fig. N comments;
   EX marks the illustrative running example (RD.sdr.EX); all waveforms here are synthetic. */
(function () {
  const D = RD.drawings, V = RD.sdr, W = V.W, H = V.H;
  const P = (V.p1 = {});

  // Polyline path for an array of values drawn into a rectangle; values in [-1, 1] unless o.min/o.max.
  P.wave = (c, arr, x, y, w, h, o = {}) => {
    const lo = o.min ?? -1, hi = o.max ?? 1, n = arr.length;
    const d = arr.map((v, i) => `${i ? "L" : "M"}${(x + (i / (n - 1)) * w).toFixed(1)},${(y + h - ((v - lo) / (hi - lo)) * h).toFixed(1)}`).join(" ");
    return c.path(d, { tone: o.tone || "bridge", width: o.width || 1.5, dash: o.dash, dim: o.dim });
  };
  // Min/max envelope of a long signal, so it draws as a filled band.
  P.env = (c, arr, x, y, w, h, o = {}) => {
    const cols = Math.floor(w / 2), per = arr.length / cols, top = [], bot = [];
    for (let i = 0; i < cols; i++) {
      let mx = -1e9, mn = 1e9;
      for (let j = Math.floor(i * per); j < Math.floor((i + 1) * per); j++) { mx = Math.max(mx, arr[j]); mn = Math.min(mn, arr[j]); }
      top.push(mx); bot.push(mn);
    }
    const Yv = (v) => (y + h / 2 - v * h / 2).toFixed(1), X = (i) => (x + i * 2).toFixed(1);
    const d = "M" + top.map((v, i) => `${X(i)},${Yv(v)}`).join(" L") + " L" + bot.map((v, i) => `${X(cols - 1 - i)},${Yv(bot[cols - 1 - i])}`).join(" L") + " Z";
    return c.path(d, { tone: o.tone || "bridge", fill: o.tone || "bridge", width: 0.8 });
  };
  P.rect = (c, x, y, w, h, tone, op = 1) => c.add(c.svg.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "rect") && RD.sdr.p1._r(x, y, w, h, tone, op));
  P._k = null;
  P._r = (x, y, w, h, tone, op) => P._k.h("rect", { x: x.toFixed(1), y: y.toFixed(1), width: Math.max(0.5, w).toFixed(1), height: Math.max(0.5, h).toFixed(1), class: `f-${tone}`, "fill-opacity": op.toFixed(2) });
  P.fmt = (v) => Math.round(v).toLocaleString("en-GB");

  // ------------------------------------------------------------------ Start 1
  D["survey-map"] = (fig, k) => {
    const c = k.canvas(W, H);
    const cols = [ // Fig. 1 (redrawn)
      ["2000s", "HMM + GMM", 80], ["2010s", "LSTM · GRU", 80], ["2020", "wav2vec 2.0 · FastSpeech 2 · Conformer · ContextNet", 200],
      ["2021", "HuBERT · SpeechStew", 104], ["2022", "Whisper", 70], ["2023", "VALL-E", 70]];
    const secs = [ // words per section, counted by us on fulltext.md (references excluded)
      ["§1 Introduction", 1195], ["§2 Background", 2114], ["§3 Architectures", 10492], ["§4 Representations", 5026],
      ["§5 Tasks (12)", 22135], ["§6 Transfer learning", 2900], ["§7 Future directions", 1233]];
    return (s) => {
      c.clear();
      let x = 8;
      cols.forEach(([yr, m, w], i) => {
        c.text(x + w / 2, 22, yr, { size: 12, anchor: "middle", tone: "muted", weight: 700 });
        c.box({ x, y: 30, w, h: 58, label: m, size: 12, tone: i < 2 ? "muted" : "paper", hl: s === 1 && i >= 2, dim: s > 1 });
        x += w + 4;
      });
      if (s >= 2) {
        const rows = secs.map(([l, v]) => [l, v, (s === 3 && (l.startsWith("§5") || l.startsWith("§3"))), s >= 4 && !l.startsWith("§5")]);
        if (s >= 4) rows.splice(5, 0, ["  §5.2 TTS", 6303, true, false]); // §5.2 word count
        V.tbars(c, rows, { y: 104, rowH: s >= 4 ? 30 : 33, labelW: 170, max: 23000, fmt: (v) => P.fmt(v) + " words", tone: "paper" });
      }
      if (s >= 5) c.box({ x: 420, y: 112, w: 212, h: 44, label: "your core: deeper than the survey", size: 13, tone: "take", hl: true });
    };
  };

  // ------------------------------------------------------------------ Start 2
  D["task-map"] = (fig, k) => {
    const c = k.canvas(W, H);
    const groups = [ // §5.1–5.12, metrics from Table 6
      ["speech → text", [["ASR", "WER · §5.1"], ["Understanding", "intent F1 · §5.11"]]],
      ["speech → label", [["Speaker recognition", "EER · §5.3"], ["Diarization", "who spoke when"], ["Voice activity", "F1 · §5.8"], ["Quality assessment", "score · §5.9"]]],
      ["speech → speech", [["Speech translation", "BLEU · §5.5"], ["Enhancement", "PESQ · §5.6"], ["Super-resolution", "§5.7"], ["Separation", "SI-SDRi · §5.10"]]],
      ["text → speech", [["TTS", "MOS 1–5 · §5.2"], ["Voice conversion", "MOS · §5.2.6"]]]];
    const bank = new Set(["ASR", "Understanding", "TTS", "Speaker recognition"]);
    return (s) => {
      c.clear();
      groups.forEach(([hd, tasks], g) => {
        if (s < g + 1 && s < 5) return;
        const x = 8 + g * 158, now = s === g + 1;
        c.box({ x, y: 6, w: 150, h: 32, label: hd, size: 13, tone: g === 3 ? "take" : "muted", hl: now, solid: g === 3 });
        tasks.forEach(([t, m], i) => {
          const lit = s === 5 ? bank.has(t) : now;
          c.box({ x, y: 48 + i * 58, w: 150, h: 50, label: t, sub: m, size: 13, tone: s === 5 ? (bank.has(t) ? "predict" : "muted") : g === 3 ? "take" : "paper", hl: lit, dim: s === 5 && !bank.has(t) });
        });
      });
      if (s === 4) c.box({ x: 8, y: 296, w: 624, h: 46, label: "Audio-visual speech adds lips and video (§5.12)", size: 13, tone: "muted" });
      if (s >= 5) V.chain(c, [["caller", null, "bridge"], ["ASR", null, "predict"], ["understand", null, "predict"], ["answer", null, "muted"], ["TTS", null, "take", true]],
        { y: 292, h: 50, size: 13 });
    };
  };

  // ------------------------------------------------------------------ Sound 1
  D["sampling"] = (fig, k) => {
    const rates = { "8 kHz": 8000, "16 kHz": 16000, "22.05 kHz": 22050, "48 kHz": 48000 };
    const rate = k.toggle({ label: "rate", options: Object.keys(rates), value: "22.05 kHz" });
    k.follow(rate, { 1: "22.05 kHz", 3: "22.05 kHz", 5: "8 kHz" });
    const c = k.canvas(W, H);
    const comps = [[500, 0.55], [1500, 0.3], [6000, 0.15]]; // synthetic: harmonics 1, 3, 12 of 500 Hz
    const T = 0.003, x0 = 8, ww = 624, y0 = 30, hh = 120;
    const sig = (t, fmax) => comps.reduce((a, [f, A]) => a + (f <= fmax ? A * Math.sin(2 * Math.PI * f * t) : 0), 0);
    return (s) => {
      c.clear();
      const fs = rates[rate.value], ny = fs / 2;
      const full = Array.from({ length: 600 }, (_, i) => sig((i / 599) * T, 1e9));
      P.wave(c, full, x0, y0, ww, hh, { tone: s >= 3 ? "muted" : "bridge", width: s >= 3 ? 1 : 1.8 });
      c.text(x0, 18, "3 ms of our 3.4 s line (synthetic)", { size: 12, tone: "muted" });
      if (s >= 2) {
        const xa = x0, xb = x0 + ww * (0.002 / T);
        c.line(xa, y0 + hh + 10, xb, y0 + hh + 10, { tone: "take", width: 2 });
        c.line(xa, y0 + hh + 4, xa, y0 + hh + 16, { tone: "take", width: 2 }); c.line(xb, y0 + hh + 4, xb, y0 + hh + 16, { tone: "take", width: 2 });
        c.text((xa + xb) / 2, y0 + hh + 30, "one period 2 ms → 1 ÷ 0.002 s = 500 Hz", { size: 12, anchor: "middle", tone: "take", weight: s === 2 ? 700 : 400 });
      }
      if (s >= 3) {
        const n = Math.floor(T * fs);
        for (let i = 0; i <= n; i++) {
          const t = i / fs, X = x0 + (t / T) * ww, Yv = y0 + hh - ((sig(t, ny) + 1) / 2) * hh;
          c.dot(X, Yv, { r: fs > 30000 ? 2 : 3, tone: "paper", noOcc: true });
        }
        const N = Math.round(V.EX.sec * fs); // EX: 3.4 s × rate
        c.box({ x: 8, y: 200, w: 300, h: 50, label: `3.4 s × ${P.fmt(fs)} Hz = ${P.fmt(N)}`, sub: "samples for our line", size: 15, tone: "paper", hl: s === 3 || s === 5 });
      }
      if (s >= 4) {
        const bx = 330, bw = 302, by = 214, F = (f) => bx + (f / 24000) * bw;
        c.text(bx, by - 4, "frequencies kept (0–24 kHz)", { size: 12, tone: "muted" });
        c.box({ x: bx, y: by + 4, w: bw, h: 22, tone: "muted" });
        c.box({ x: bx, y: by + 4, w: Math.max(4, F(ny) - bx), h: 22, tone: "code", hl: s >= 4 });
        comps.forEach(([f]) => c.dot(F(f), by + 15, { r: 4, tone: f <= ny ? "bridge" : "bad", noOcc: true }));
        c.text(F(ny), by + 44, `ceiling ${P.fmt(ny)} Hz`, { size: 12, anchor: ny > 20000 ? "end" : "middle", tone: "code", weight: 700 });
      }
      if (s >= 5) {
        const lost = comps.filter(([f]) => f > ny).length;
        c.box({ x: 8, y: 280, w: 624, h: 56, label: lost ? "phone line: the 6 kHz component (hiss) is gone" : "every component fits under the ceiling", sub: "red dots: frequencies above half the rate", size: 14, tone: lost ? "bad" : "code", hl: true });
      }
    };
  };

  // ------------------------------------------------------------------ Sound 2
  D["time-features"] = (fig, k) => {
    const c = k.canvas(W, H);
    P._k = k;
    const fs = 8000, r = V.rng(11), N = 4800, sig = new Float32Array(N); // synthetic 0.6 s: vowel, "s", silence
    for (let i = 0; i < N; i++) {
      const t = i / fs;
      if (t < 0.25) sig[i] = 0.85 * Math.sin(Math.min(1, t / 0.03) * 0 + 2 * Math.PI * 150 * t) * 0.6 + 0.25 * Math.sin(2 * Math.PI * 450 * t) + 0.1 * Math.sin(2 * Math.PI * 900 * t);
      else if (t < 0.45) sig[i] = 0.22 * V.gauss(r);
      else sig[i] = 0.01 * V.gauss(r);
    }
    const FR = 200, nf = N / FR, en = [], zc = [];
    for (let f = 0; f < nf; f++) {
      let e = 0, z = 0;
      for (let j = f * FR; j < (f + 1) * FR; j++) { e += sig[j] * sig[j]; if (j > f * FR && Math.sign(sig[j]) !== Math.sign(sig[j - 1])) z++; }
      en.push(e); zc.push(z);
    }
    const emax = Math.max(...en), zmax = Math.max(...zc);
    const x0 = 110, ww = 522;
    return (s) => {
      c.clear(); P._k = k;
      c.text(8, 66, "waveform", { size: 12, tone: "muted" });
      P.env(c, Array.from(sig), x0 + 2, 24, ww - 4, 76);
      [["vowel", 0.125], ["“s”", 0.35], ["silence", 0.525]].forEach(([t, at]) => c.text(x0 + (at / 0.6) * ww, 14, t, { size: 12, anchor: "middle", tone: "muted" }));
      const bw = ww / nf;
      if (s >= 1) for (let f = 0; f <= nf; f += 1) c.line(x0 + f * bw, 106, x0 + f * bw, 112, { tone: "muted", width: 1 });
      if (s >= 2) {
        c.text(8, 170, "energy", { size: 12, tone: "paper", weight: 700 });
        c.box({ x: x0, y: 124, w: ww, h: 76, tone: "muted", hl: s === 2 });
        en.forEach((e, f) => c.add(P._r(x0 + f * bw + 2, 196 - (e / emax) * 68, bw - 4, (e / emax) * 68, "paper", 0.85)));
      }
      if (s >= 3) {
        c.text(8, 260, "zero", { size: 12, tone: "predict", weight: 700 });
        c.text(8, 276, "crossings", { size: 12, tone: "predict", weight: 700 });
        c.box({ x: x0, y: 212, w: ww, h: 76, tone: "muted", hl: s === 3 });
        zc.forEach((z, f) => c.add(P._r(x0 + f * bw + 2, 284 - (z / zmax) * 68, bw - 4, (z / zmax) * 68, "predict", 0.85)));
      }
      if (s >= 4) {
        const xs = x0 + (0.45 / 0.6) * ww;
        c.box({ x: xs, y: 296, w: x0 + ww - xs, h: 26, label: "pause: low on both", size: 12, tone: "code", hl: s === 4 });
      }
      if (s >= 5) c.box({ x: x0, y: 296, w: 380, h: 50, label: "FastSpeech 2: energy per frame → decoder", sub: "§5.2.3", size: 13, tone: "take", hl: true });
    };
  };

  // ------------------------------------------------------------------ Sound 3
  D["pitch"] = (fig, k) => {
    const f0 = k.slider({ label: "F0", min: 80, max: 300, value: 120, fmt: (v) => `${v} Hz` });
    const kind = k.toggle({ options: ["voiced", "unvoiced"], value: "voiced" });
    k.follow(kind, { 1: "voiced", 3: "voiced", 4: "unvoiced", 5: "voiced" });
    const c = k.canvas(W, H);
    const fs = 22050, N = 1024, LAG = 420;
    const noise = (() => { const r = V.rng(7); return Array.from({ length: N }, () => 0.5 * V.gauss(r)); })();
    return (s) => {
      c.clear();
      const F = f0.value, voiced = kind.value === "voiced";
      const x = Array.from({ length: N }, (_, n) => voiced ? [1, 0.6, 0.4, 0.25].reduce((a, A, h) => a + A * Math.sin(2 * Math.PI * F * (h + 1) * n / fs + h), 0) / 2 : noise[n]);
      c.text(8, 16, voiced ? "one 1,024-sample frame (46 ms), voiced" : "one frame of hiss, unvoiced", { size: 12, tone: "muted" });
      P.wave(c, x, 8, 24, 624, 96, { tone: "bridge" });
      if (s === 2) P.wave(c, x.slice(60).concat(Array(60).fill(0)), 8, 24, 624, 96, { tone: "predict", dash: true, width: 1.2 });
      if (s >= 2 && s <= 4) {
        const ac = [];
        const e0 = x.reduce((a, v) => a + v * v, 0);
        for (let L = 0; L <= LAG; L++) { let a = 0; for (let n = 0; n + L < N; n++) a += x[n] * x[n + L]; ac.push(a / e0); }
        const p = c.plot({ x: 0, y: 136, w: 640, h: 220, series: [{ x: ac.map((_, i) => i), y: ac, tone: "paper" }], xmin: 0, xmax: LAG, ymin: -1, ymax: 1,
          xlabel: "lag (samples)", ylabel: "autocorrelation" });
        if (s >= 3) {
          let i = 1; while (i < LAG && ac[i] > 0) i++;
          let best = i; for (let j = i; j <= LAG; j++) if (ac[j] > ac[best]) best = j;
          if (voiced && ac[best] > 0.3) {
            c.dot(p.X(best), p.Y(ac[best]), { r: 6, tone: "predict" });
            c.label(p.X(best), p.Y(ac[best]) - 16, `lag ${best} → F0 = 22,050 ÷ ${best} = ${Math.round(fs / best)} Hz`, { size: 13, tone: "predict", weight: 700 });
          } else c.label(p.X(LAG * 0.6), p.Y(0.7), "no clear peak: no F0", { size: 13, tone: "bad", weight: 700 });
        }
      }
      if (s >= 5) {
        const tt = Array.from({ length: 60 }, (_, i) => i / 59);
        const p = c.plot({ x: 0, y: 136, w: 640, h: 220, series: [
          { x: tt, y: tt.map((t) => 120 + 15 * Math.sin(t * 6) - 30 * t), tone: "muted", label: "statement: falls", labelAt: 45 },
          { x: tt, y: tt.map((t) => 120 + 15 * Math.sin(t * 6) + (t > 0.7 ? 260 * (t - 0.7) : 0)), tone: "take", label: "question: rises", labelAt: 57 }],
          xmin: 0, xmax: 1, ymin: 60, ymax: 220, xlabel: "time in the sentence (illustrative)", ylabel: "F0 (Hz)" });
      }
    };
  };

  // ------------------------------------------------------------------ Sound 4
  D["lpc"] = (fig, k) => {
    const ord = k.slider({ label: "order p", min: 1, max: 20, value: 2 });
    k.follow(ord, { 1: 2, 2: 2, 3: 12 });
    const c = k.canvas(W, H);
    const fs = 22050, N = 1024, T0 = Math.round(fs / 120); // synthetic vowel at 120 Hz
    let x = Array.from({ length: N }, (_, n) => (n % T0 === 0 ? 1 : 0));
    [[700, 90], [1200, 110], [2600, 160]].forEach(([F, B]) => { // three resonances (synthetic formants)
      const r = Math.exp(-Math.PI * B / fs), th = 2 * Math.PI * F / fs, y = [];
      for (let n = 0; n < N; n++) y[n] = x[n] + 2 * r * Math.cos(th) * (y[n - 1] || 0) - r * r * (y[n - 2] || 0);
      x = y;
    });
    const mx = Math.max(...x.map(Math.abs)); x = x.map((v) => v / mx);
    const win = x.map((v, n) => v * (0.5 - 0.5 * Math.cos(2 * Math.PI * n / (N - 1))));
    const R = []; for (let L = 0; L <= 20; L++) { let a = 0; for (let n = 0; n + L < N; n++) a += win[n] * win[n + L]; R.push(a); }
    const levinson = (p) => { // Levinson-Durbin recursion (§2.2)
      let a = [1], E = R[0];
      for (let i = 1; i <= p; i++) {
        let acc = R[i]; for (let j = 1; j < i; j++) acc += a[j] * R[i - j];
        const kk = -acc / E, na = a.slice(); na[i] = kk;
        for (let j = 1; j < i; j++) na[j] = a[j] + kk * a[i - j];
        a = na; E *= 1 - kk * kk;
      }
      return a;
    };
    const SH = 420, a0 = 300; // samples shown
    return (s) => {
      c.clear();
      const p = ord.value, a = levinson(p);
      const pred = x.map((_, n) => { let v = 0; for (let j = 1; j <= p; j++) v -= a[j] * (x[n - j] || 0); return v; });
      const res = x.map((v, n) => v - pred[n]);
      const e1 = res.slice(p).reduce((t, v) => t + v * v, 0), e0 = x.slice(p).reduce((t, v) => t + v * v, 0);
      const seg = (arr) => arr.slice(a0, a0 + SH);
      c.text(8, 16, "synthetic vowel, 420 of 1,024 samples", { size: 12, tone: "muted" });
      P.wave(c, seg(x), 8, 24, 624, 120, { tone: "bridge" });
      if (s === 1) {
        const n = 220, X = (i) => 8 + (i / (SH - 1)) * 624, Yv = (v) => 24 + 120 - ((v + 1) / 2) * 120;
        for (let j = 1; j <= 6; j++) c.dot(X(n - j * 3), Yv(x[a0 + n - j * 3]), { r: 3.5, tone: "paper", noOcc: true });
        c.dot(X(n), Yv(x[a0 + n]), { r: 6, tone: "predict" });
        c.box({ x: 8, y: 170, w: 624, h: 56, label: "ŝ[n] = a₁·s[n−1] + a₂·s[n−2] + … + aₚ·s[n−p]", sub: "a weighted sum of the past p samples (§2.2)", mono: true, size: 15, tone: "paper", hl: true });
      }
      if (s >= 2) P.wave(c, seg(pred), 8, 24, 624, 120, { tone: "predict", dash: true, width: 1.3 });
      if (s >= 2 && s <= 3) c.box({ x: 8, y: 170, w: 624, h: 56, label: `p = ${p}: ${(100 * e1 / e0).toFixed(1)}% of the energy left unpredicted`, sub: "weights from Levinson-Durbin, computed live", size: 15, tone: s === 3 ? "code" : "predict", hl: true });
      if (s >= 4) {
        c.text(8, 172, `leftover error (residual), p = ${p}`, { size: 12, tone: "bad", weight: 700 });
        const rm = Math.max(...seg(res).map(Math.abs)) || 1;
        P.wave(c, seg(res).map((v) => v / rm), 8, 180, 624, 100, { tone: "bad", width: 1.2 });
        c.label(8 + (T0 / SH) * 624, 196, "one pulse per pitch period", { size: 12, tone: "bad" });
      }
      if (s >= 5) c.box({ x: 8, y: 296, w: 624, h: 50, label: "LPCNet: LPC does the filter, a small network does the rest", sub: "cheap neural vocoder (§5.2.7)", size: 14, tone: "take", hl: true });
    };
  };

  // ------------------------------------------------------------------ Sound 5
  D["stft"] = (fig, k) => {
    const win = k.toggle({ label: "window", options: ["512", "1024", "2048"], value: "1024" });
    k.follow(win, { 1: "1024", 4: "1024" });
    const c = k.canvas(W, H);
    const sr = V.EX.sr, hop = V.EX.hop;
    const zoomN = 2205, r = V.rng(3); // first 0.1 s, synthetic
    const zsig = Array.from({ length: zoomN }, (_, n) => 0.6 * Math.sin(2 * Math.PI * 140 * n / sr) * Math.min(1, n / 400) + 0.25 * Math.sin(2 * Math.PI * 700 * n / sr) + 0.05 * V.gauss(r));
    return (s) => {
      c.clear(); P._k = k;
      const wv = +win.value, bins = wv / 2 + 1, frames = 1 + Math.floor(V.EX.samples / hop); // EX: 293
      c.text(8, 14, "first 0.1 s of our line (synthetic), frames of " + wv + " samples, hop 256", { size: 12, tone: "muted" });
      const zx = 8, zw = 624, zy = 22, zh = 70;
      P.env(c, zsig, zx, zy, zw, zh);
      for (let f = 0; f < 5; f++) {
        const xa = zx + (f * hop / zoomN) * zw, w = Math.min(zx + zw - xa, (wv / zoomN) * zw);
        const yy = zy + zh + 6 + f * 7;
        c.line(xa, yy, xa + w, yy, { tone: f === 0 ? "predict" : "muted", width: f === 0 ? 3 : 2 });
      }
      if (s >= 2) {
        const xa = zx, w = Math.min(zw, (wv / zoomN) * zw);
        const hann = Array.from({ length: 80 }, (_, i) => 0.5 - 0.5 * Math.cos(2 * Math.PI * i / 79));
        c.path("M" + hann.map((v, i) => `${(xa + (i / 79) * w).toFixed(1)},${(zy + zh - v * zh).toFixed(1)}`).join(" L"), { tone: "predict", width: 2 });
        c.label(xa + w / 2, zy + 10, "window fades the edges", { size: 12, tone: "predict" });
      }
      if (s >= 3) {
        const sx = 8, sy = 140, sw = 200, sh = 150;
        c.box({ x: sx, y: sy, w: sw, h: sh, tone: "muted", hl: s === 3 });
        const spec = Array.from({ length: 60 }, (_, i) => Math.exp(-((i - 4) ** 2) / 3) + 0.5 * Math.exp(-((i - 13) ** 2) / 4) + 0.15 * Math.exp(-((i - 35) ** 2) / 30) + 0.03);
        spec.forEach((v, i) => c.add(P._r(sx + 6 + i * 3.1, sy + sh - 8 - v * (sh - 20), 2.2, v * (sh - 20), "paper", 0.9)));
        c.text(sx + sw / 2, sy + sh + 16, `1 FFT → ${bins} bins, ${(sr / wv).toFixed(1)} Hz apart`, { size: 12, anchor: "middle", tone: "paper", weight: 700 });
      }
      if (s >= 4) {
        const gx = 236, gy = 140, gw = 396, gh = 150, nc = 66, nr = 30;
        c.box({ x: gx, y: gy, w: gw, h: gh, tone: "muted", hl: s === 4 });
        for (let j = 0; j < nc; j++) {
          const t = j / nc, f0 = 3 + 2 * Math.sin(t * 9), on = Math.sin(t * Math.PI * 7) > -0.6 ? 1 : 0.15;
          for (let i = 0; i < nr; i++) {
            let v = 0; for (let h = 1; h <= 6; h++) v += Math.exp(-((i - f0 * h) ** 2) / 1.5) / h;
            v = Math.min(1, (v + 0.04) * on);
            c.add(P._r(gx + 3 + j * ((gw - 6) / nc), gy + gh - 3 - (i + 1) * ((gh - 6) / nr), (gw - 6) / nc + 0.3, (gh - 6) / nr + 0.3, "paper", v));
          }
        }
        c.text(gx + gw / 2, gy + gh + 16, `spectrogram: ${bins} × ${frames}`, { size: 12, anchor: "middle", tone: "paper", weight: 700 });
      }
      if (s >= 5) c.box({ x: 8, y: 314, w: 624, h: 40, label: `window ${wv}: ${(1000 * wv / sr).toFixed(0)} ms of time, ${(sr / wv).toFixed(1)} Hz bins`, size: 14, tone: "predict", hl: true });
    };
  };

  // ------------------------------------------------------------------ Sound 6
  D["mel"] = (fig, k) => {
    const nm = k.toggle({ label: "filters", options: ["80", "40"], value: "80" });
    k.follow(nm, { 1: "80", 5: "80" });
    const c = k.canvas(W, H);
    const sr = V.EX.sr, fmax = sr / 2;
    const mel = (f) => 2595 * Math.log10(1 + f / 700), imel = (m) => 700 * (10 ** (m / 2595) - 1); // HTK form, not in the survey
    const ax = 30, aw = 596, ay = 190, F = (f) => ax + (f / fmax) * aw;
    const notes = {
      1: ["513 linear FFT bins, all 21.5 Hz wide", "paper"],
      3: ["each triangle sums the power under it", "paper"],
      4: ["log of each sum ≈ how loud it sounds", "paper"],
      5: ["80 × 293 log-mel: the TTS target for our line", "take"],
      6: ["phase is gone: a vocoder must rebuild it", "bad"] };
    return (s) => {
      c.clear();
      const n = +nm.value, m1 = mel(fmax), pts = Array.from({ length: n + 2 }, (_, i) => imel((i / (n + 1)) * m1));
      const below = pts.slice(1, -1).filter((f) => f < 1000).length;
      if (s < 6) {
      c.line(ax, ay, ax + aw, ay, { tone: "ink", width: 1.2 });
      [0, 1000, 2000, 4000, 6000, 8000, 10000].forEach((f) => { c.line(F(f), ay, F(f), ay + 5, { tone: "ink", width: 1 }); c.text(F(f), ay + 19, f ? `${f / 1000}k${f === 10000 ? " Hz" : ""}` : "0", { size: 11, anchor: "middle", tone: "muted" }); });
      if (s === 1) for (let i = 0; i <= 128; i++) c.line(F((i / 128) * fmax), ay - 4, F((i / 128) * fmax), ay - 60, { tone: "paper", width: 1 });
      if (s >= 2) {
        for (let i = 1; i <= n; i++) {
          const lo = F(pts[i - 1]), mid = F(pts[i]), hi = F(pts[i + 1]), low = pts[i] < 1000;
          c.path(`M${lo.toFixed(1)},${ay} L${mid.toFixed(1)},${ay - 140} L${hi.toFixed(1)},${ay}`, { tone: low && s === 2 ? "predict" : "take", width: 1 });
        }
        c.line(F(1000), ay - 150, F(1000), ay, { tone: "predict", dash: true, width: 1.2 });
      }
      }
      const chainOn = s >= 3;
      if (chainOn) V.chain(c, [["513 bins", "per frame", "paper", s === 3], [`${n} triangles`, "mel filterbank", "take", s === 3], ["log", "loudness", "paper", s === 4, s < 4], ["80 × 293", "for our line", "take", s === 5, s < 5]],
        { y: 222, h: 54, size: 14 });
      const nt = s === 2 ? [`${below} of ${n} filters sit below 1 kHz, 9% of the band`, "predict"] : notes[s];
      if (nt && s < 6) c.box({ x: 8, y: s >= 3 ? 290 : 226, w: 624, h: 50, label: nt[0], size: 15, tone: nt[1], hl: true });
      if (s >= 6) {
        V.code(c, [
          "frames = frame(wav, 1024, hop=256) * hann(1024)  # (293, 1024)",
          "power  = np.abs(np.fft.rfft(frames)) ** 2          # (293, 513)",
          "fbank  = mel_filters(sr=22050, n_fft=1024, n=80)   # (80, 513)",
          "mel    = power @ fbank.T                           # (293, 80)",
          "logmel = np.log(np.clip(mel, 1e-5, None))          # (293, 80)",
        ], [3], { y: 34, lh: 34, size: 13 });
      }
    };
  };

  // ------------------------------------------------------------------ Sound 7
  D["mfcc"] = (fig, k) => {
    const K = k.slider({ label: "keep", min: 2, max: 40, value: 12, fmt: (v) => `${v} coeffs` });
    k.follow(K, { 1: 12, 3: 12, 4: 12 });
    const c = k.canvas(W, H);
    const M = 80; // synthetic log-mel frame: formant envelope + harmonic ripple
    const env = Array.from({ length: M }, (_, i) => 1.2 * Math.exp(-((i - 12) ** 2) / 40) + 0.8 * Math.exp(-((i - 30) ** 2) / 60) + 0.5 * Math.exp(-((i - 52) ** 2) / 80) - i * 0.012);
    const fr = env.map((v, i) => v + 0.22 * Math.cos(2 * Math.PI * i / (3 + i * 0.08)));
    const dct = Array.from({ length: M }, (_, kk) => fr.reduce((a, v, n) => a + v * Math.cos(Math.PI * kk * (n + 0.5) / M), 0));
    const idct = (keep) => fr.map((_, n) => (dct[0] / M) + (2 / M) * dct.slice(1, keep).reduce((a, v, kk) => a + v * Math.cos(Math.PI * (kk + 1) * (n + 0.5) / M), 0));
    const steps = ["pre-emph", "frame", "window", "FFT", "mel", "log", "DCT", "lifter"];
    return (s) => {
      c.clear();
      c.chips({ x: 8, y: 6, size: 12, items: steps.map((t, i) => ({ t, tone: i < 6 ? "paper" : "take", hl: s === 1 ? i < 6 : s === 2 && i >= 6, dim: s === 1 && i >= 6 })) });
      const xs = fr.map((_, i) => i);
      const series = [{ x: xs, y: fr, tone: "bridge", label: "log-mel frame", labelAt: 72 }];
      if (s >= 3) series.push({ x: xs, y: idct(K.value), tone: "predict", label: `rebuilt from ${K.value}`, labelAt: 22 });
      const p = c.plot({ x: 0, y: 40, w: s === 2 ? 420 : 640, h: 250, series, xmin: 0, xmax: 79, ymin: -1.2, ymax: 1.8, xlabel: "mel bin", ylabel: "log power" });
      if (s === 2) {
        const bx = 440, by = 60, bw = 192, bh = 200;
        c.box({ x: bx, y: by, w: bw, h: bh, tone: "muted" });
        const mm = Math.max(...dct.slice(0, 40).map(Math.abs));
        dct.slice(0, 40).forEach((v, i) => c.line(bx + 8 + i * 4.4, by + bh - 10, bx + 8 + i * 4.4, by + bh - 10 - (Math.abs(v) / mm) * (bh - 30), { tone: i < 12 ? "take" : "muted", width: 3 }));
        c.text(bx + bw / 2, by + bh + 18, "DCT weights: first 12 lit", { size: 12, anchor: "middle", tone: "take" });
      }
      if (s >= 4) c.label(p.X(40), p.Y(1.3), "harmonic ripple gone", { size: 13, tone: "bad", weight: 700 });
      if (s === 5) c.box({ x: 8, y: 300, w: 624, h: 50, label: "ASR, speaker ID: compact, decorrelated, pitch-free", sub: "§2.2, §2.3", size: 14, tone: "code", hl: true });
      if (s >= 6) c.box({ x: 8, y: 300, w: 624, h: 50, label: "TTS: lost pitch can't come back, so predict log-mel", size: 14, tone: "bad", hl: true });
    };
  };

  // ------------------------------------------------------------------ Sound 8
  D["gmm-hmm"] = (fig, k) => {
    const c = k.canvas(W, H);
    const st = [["state 1", "paper"], ["state 2", "take"], ["state 3", "predict"]];
    const path = [0, 0, 0, 1, 1, 1, 1, 2, 2, 2]; // illustrative alignment of 10 frames
    return (s) => {
      c.clear();
      const fy = 30;
      c.text(8, fy - 10, "MFCC frames of one sound", { size: 12, tone: "muted" });
      c.chips({ x: 8, y: fy, size: 12, gap: 8, items: path.map((q, i) => ({ t: `o${i + 1}`, tone: s >= 4 ? st[q][1] : "bridge", hl: s === 1 || s === 4 })) });
      if (s >= 2) {
        const bs = st.map(([l, t], i) => c.box({ x: 90 + i * 170, y: 110, w: 120, h: 48, label: l, tone: t, hl: s === 2 }));
        bs.forEach((b, i) => {
          const B = b.bx;
          c.path(`M${B.cx - 18},${B.t} C${B.cx - 30},${B.t - 34} ${B.cx + 30},${B.t - 34} ${B.cx + 18},${B.t}`, { tone: "muted", arrow: true, width: 1.4 });
          if (i) c.connect(bs[i - 1], b, { tone: "muted" });
        });
      }
      if (s >= 3) {
        const gy = 270;
        st.forEach(([, t], i) => {
          const cx = 150 + i * 170, comps = [[-18, 9, 1], [8, 12, 0.7], [24, 7, 0.5]];
          const xs = Array.from({ length: 61 }, (_, j) => j - 30);
          const ys = xs.map((x) => comps.reduce((a, [m, sd, w]) => a + w * Math.exp(-((x - m * (0.8 + i * 0.1)) ** 2) / (2 * sd * sd)), 0));
          const mx = Math.max(...ys);
          c.path("M" + xs.map((x, j) => `${(cx + x * 2).toFixed(1)},${(gy - (ys[j] / mx) * 70).toFixed(1)}`).join(" L"), { tone: t, width: 2, dim: s >= 5 });
          c.line(cx - 62, gy, cx + 62, gy, { tone: "muted", width: 1, dim: s >= 5 });
        });
        c.text(320, gy + 18, "each state's emissions: a mixture of Gaussians", { size: 12, anchor: "middle", tone: "muted", dim: s >= 5 });
      }
      if (s === 4) c.box({ x: 8, y: 304, w: 624, h: 44, label: "Baum-Welch fits it; decoding picks the likeliest state path", size: 14, tone: "paper", hl: true });
      if (s === 5) c.box({ x: 8, y: 304, w: 624, h: 44, label: "2012: a deep network beats the GMMs (Hinton et al., §1)", size: 14, tone: "code", hl: true });
      if (s >= 6) c.box({ x: 8, y: 304, w: 624, h: 44, label: "still alive: monotonic text-to-frame alignment in Glow-TTS", size: 14, tone: "take", hl: true });
    };
  };

  // ------------------------------------------------------------------ Sound 9
  D["pre-neural-tts"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      V.chain(c, [["Concatenative", null, "muted"], ["text", null, "paper"], ["pick units", "recordings", "bridge", s === 1], ["join them", null, "bridge", s === 1], ["audio", null, "bridge"]],
        { y: 8, h: 52, size: 13, dim: s > 2 });
      if (s >= 2) {
        c.box({ x: 8, y: 68, w: 304, h: 30, label: "natural inside the database", size: 13, tone: "code", hl: s === 2 });
        c.box({ x: 328, y: 68, w: 304, h: 30, label: "joins click · new voice = new recordings", size: 13, tone: "bad", hl: s === 2 });
      }
      if (s >= 3) V.chain(c, [["SPSS", null, "muted"], ["text", null, "paper"], s >= 4 ? ["network", "was HMM", "take", s === 4] : ["HMM", "→ params", "paper", s === 3],
        ["vocoder", null, "muted"], ["audio", null, "bridge"]], { y: 120, h: 52, size: 13 });
      if (s >= 5) V.chain(c, [["WaveNet", "2016", "take"], ["linguistic features", null, "paper"], ["WaveNet", "per sample", "take", s === 5], ["waveform", null, "bridge", s === 5]],
        { y: 196, h: 52, size: 13 });
      if (s >= 6) c.chips({ x: 8, y: 280, size: 14, gap: 10, items: ["quality", "naturalness", "intelligibility", "less preprocessing"].map((t) => ({ t: "✓ " + t, tone: "code", hl: true })) });
    };
  };
})();
