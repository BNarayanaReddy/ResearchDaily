/* Drawings: "The model being served" (Qwen3-TTS 12Hz). */
(function () {
  const D = RD.drawings, V = RD.vox, W = V.W, H = V.H;

  D["q3-whole"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      c.text(8, 22, "one frame = 80 ms = 16 codes", { size: 13, weight: 700, tone: "paper" });
      c.chips({ x: 8, y: 32, items: Array.from({ length: 16 }, (_, i) => ({ t: i === 0 ? "c0" : `c${i}`, tone: i === 0 ? "take" : "predict", hl: s === 1 || (s === 2 && i === 0) || (s === 3 && i > 0) })), size: 12 });
      const t = c.box({ x: 8, y: 110, w: 190, h: 70, label: "talker", sub: "28 layers · KV cache", tone: "take", hl: s === 2, dim: s < 2 });
      const p = c.box({ x: 224, y: 110, w: 190, h: 70, label: "code predictor", sub: "5 layers × 15 steps", tone: "predict", hl: s === 3, dim: s < 3 });
      const d = c.box({ x: 440, y: 110, w: 192, h: 70, label: "codec decoder", sub: "114M · ×1,920 → 24 kHz", tone: "bridge", hl: s === 4, dim: s < 4 });
      c.connect(t, p, { dim: s < 3 }); c.connect(p, d, { dim: s < 4 });
      if (s >= 2) c.text(8, 206, "0.6B: width 1,024 · 1.7B: width 2,048", { size: 12, tone: "take" });
      if (s >= 5) {
        for (let f = 0; f < 55; f++) c.add(k.h("rect", { x: 8 + f * 11.3, y: 236, width: 9.5, height: 34, rx: 2, class: "f-paper" }));
        c.text(8, 300, "our sentence: 4.40 s ÷ 80 ms = 55 frames, each through all three", { size: 14, weight: 700, tone: "paper" });
      }
    };
  };

  D["dual-track"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const cols = ["frame 7", "frame 8", "frame 9", "frame 10"];
      cols.forEach((n, i) => {
        const x = 20 + i * 154, last = i === 3;
        c.text(x + 66, 22, n, { size: 12, anchor: "middle", tone: "muted" });
        c.box({ x, y: 32, w: 132, h: 56, label: s >= 2 ? "Σ 16 code embeddings" : "audio track", size: 12, tone: "predict", hl: s === 2 && i === 2 });
        c.box({ x, y: 118, w: 132, h: 44, label: s >= 4 && last ? "pad (text done)" : ["“tomorrow”", "“even”", "“ing”", "“.”"][i], size: 12, tone: s >= 4 && last ? "muted" : "paper", hl: s === 3 && i === 2 });
        c.text(x + 66, 106, "+", { size: 18, anchor: "middle", weight: 700 });
        if (s >= 1) c.box({ x, y: 190, w: 132, h: 40, label: "talker input", size: 12, tone: "take", hl: s === 1 });
      });
      if (s >= 1) c.text(20, 260, "two tracks added into one vector per position, not interleaved", { size: 13, weight: 700, tone: "take" });
      if (s >= 4) c.text(20, 284, "the model speaks on until it samples end-of-speech", { size: 13, tone: "muted" });
      if (s >= 5) c.box({ x: 20, y: 300, w: 600, h: 44, label: "text streams in while audio streams out", size: 14, tone: "code", hl: true });
    };
  };

  D["code-predictor"] = (fig, k) => {
    const fr = k.slider({ label: "frames", min: 1, max: 150, step: 1, value: 55 });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      c.text(8, 22, "inside one frame: 16 sequential network calls", { size: 13, weight: 700 });
      for (let i = 0; i < 16; i++) {
        const b = c.box({ x: 8 + i * 39, y: 34, w: 34, h: 40, label: i === 0 ? "T" : String(i), size: 12, tone: i === 0 ? "take" : "predict", hl: (s === 1 && i === 1) || s === 3 });
        if (i) c.arrow(8 + i * 39 - 4, 54, 8 + i * 39 - 1, 54, { tone: "muted", snap: false });
      }
      if (s >= 2) c.text(8, 100, "each predictor step: its own embedding table and output head (15 + 15)", { size: 12, tone: "predict" });
      if (s >= 4) c.box({ x: 8, y: 124, w: 624, h: 50, label: `${fr.value} frames × 16 calls = ${(fr.value * 16).toLocaleString("en-US")} sequential calls`, mono: true, size: 15, tone: "paper", hl: s === 4 });
      if (s >= 5) {
        V.tbars(c, [["talker", 45.5, false, false], ["code predictor", 128.6, true, false]], { y: 200, h: 110, labelW: 140, tone: "bad", fmt: (v) => `${v} ms`, max: 140 });
        c.text(632, 340, "upstream, batch 1: 72% in the predictor", { size: 12, anchor: "end", weight: 700, tone: "bad" });
      }
    };
  };

  D["codec-decoder"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const b = V.chain(c, [
        ["16 codes", "per frame", "predict", false],
        ["transformer", "8 layers, win 72", "take", s === 2, s < 2],
        ["convolutions", "×1,920 upsample", "bridge", s === 3, s < 3],
        ["24 kHz PCM", "80 ms per frame", "code", false, s < 3],
      ], { y: 30, h: 70, size: 14 });
      if (s === 1) c.box({ x: 8, y: 130, w: 624, h: 44, label: "fully causal: no lookahead, each frame playable at once", size: 14, tone: "code", hl: true });
      if (s >= 4) c.box({ x: 8, y: 130, w: 624, h: 44, label: "each layer remembers: windows, conv histories, overlap tails", size: 14, tone: "predict", hl: s === 4 });
      if (s >= 5) {
        const X = (f) => 620 - f * 1.0;
        for (let l = 0; l < 8; l++) c.add(k.h("rect", { x: X(71 * (l + 1)), y: 196 + l * 16, width: 71 * 1.0, height: 12, rx: 2, class: "f-take soft" }));
        c.text(8, 345, "8 stacked windows of 71 past frames reach 568 frames back", { size: 13, weight: 700, tone: "take" });
      }
    };
  };

  D["icl-prompt"] = (fig, k) => {
    const c = k.canvas(W, H);
    const segs = [["role", 3, "muted", 2], ["control", 6, "paper", 3], ["ref text + codes", 26, "bridge", 4], ["rest of ref codes + target text", 43, "predict", 4]]; // README: 78 positions, 35 shared
    return (s) => {
      c.clear();
      const X = (p) => 12 + p * 7.9;
      let p0 = 0;
      segs.forEach(([l, n, tone, at], i) => {
        const show = s >= at || s === 1;
        c.box({ x: X(p0), y: 50, w: n * 7.9 - 2, h: 60, label: n >= 6 ? l : "", size: 12, tone: show ? tone : "muted", hl: s === at, dim: !show });
        if (n < 6 && show) c.text(X(p0) + n * 3.9, 130, l, { size: 12, anchor: "start", tone });
        p0 += n;
      });
      c.text(12, 30, "≈ 78 prompt positions before frame 1", { size: 13, weight: 700 });
      if (s >= 3) c.text(X(3), 160, "language tag + ECAPA speaker vector", { size: 12, tone: "paper" });
      if (s >= 5) {
        c.box({ x: X(0), y: 200, w: 35 * 7.9 - 2, h: 50, label: "35 positions: same for every request", size: 12, tone: "code", hl: true });
        c.box({ x: X(35), y: 200, w: 43 * 7.9 - 2, h: 50, label: "43: depend on the target text", size: 12, tone: "muted" });
        c.text(12, 290, "(voice, language) fixes the first 35 → computed once", { size: 13, weight: 700, tone: "code" });
      }
    };
  };

  D["sampling"] = (fig, k) => {
    const c = k.canvas(W, H);
    const base = [3.2, 2.9, 2.6, 2.1, 1.8, 1.5, 1.2, 0.9]; // illustrative logits
    return (s) => {
      c.clear();
      let lg = base.slice();
      if (s >= 2) lg[0] = lg[0] / 1.05;                       // already produced -> penalised
      const lab = ["c 412", "c 87", "c 1203", "c 9", "c 640", "SPECIAL", "EOS", "c 77"];
      if (s >= 3) lg[5] = -Infinity;
      if (s >= 4) lg[6] = -Infinity;
      const e = lg.map((v) => Math.exp(v / 0.9)), z = e.reduce((a, b) => a + b, 0), p = e.map((v) => v / z);
      c.bars({ x: 8, y: 30, w: 624, rowH: 34, labelW: 110, tones: ["paper"], max: 0.5, fmt: (v) => v.toFixed(2),
        rows: lab.map((l, i) => ({ label: l, values: [p[i]], hl: (s === 2 && i === 0) || (s === 3 && i === 5) || (s === 4 && i === 6), dim: false })) });
      const notes = { 1: "temperature 0.9, keep the top 50, sample", 2: "repetition penalty 1.05 on codes already used", 3: "special ids suppressed", 4: "end-of-speech blocked for the first 2 frames", 5: "same distribution ≠ same draw" };
      c.text(632, 20, notes[s], { size: 13, anchor: "end", weight: 700, tone: "predict" });
    };
  };

  D["upstream-cost"] = (fig, k) => {
    const c = k.canvas(W, H);
    const T = [["batch 1", 45.5, 128.6, 178], ["batch 16", 46.1, 131.3, 185], ["batch 64", 45.9, 130.6, 194]]; // README Results
    return (s) => {
      c.clear();
      const X = (ms) => 110 + ms * 2.3;
      T.forEach(([n, t, p, tot], i) => {
        const y = 30 + i * 62;
        c.text(100, y + 26, n, { size: 13, anchor: "end" });
        c.box({ x: X(0), y, w: t * 2.3, h: 40, label: s >= 1 ? "talker" : "", size: 12, tone: "take", hl: s === 1 });
        if (s >= 2) c.box({ x: X(t), y, w: p * 2.3, h: 40, label: "code predictor", size: 12, tone: "predict", hl: s === 2 });
        if (s >= 2) c.text(X(tot) + 6, y + 26, `${tot} ms`, { size: 12, mono: true });
      });
      c.path(`M${X(80)},20 L${X(80)},${30 + 3 * 62}`, { tone: "code", dash: true });
      if (s >= 3) c.box({ x: 20, y: 228, w: 600, h: 40, label: "a full HF generate() inside every frame", size: 13, tone: "bad", hl: s === 3 });
      if (s >= 4) c.box({ x: 20, y: 276, w: 600, h: 34, label: "64 streams: 26× real time in total, 0.4× each", size: 13, tone: "muted", hl: s === 4 });
      if (s >= 5) c.box({ x: 20, y: 318, w: 600, h: 34, label: "target: > 400 streams (0.6B) under 80 ms per frame", size: 13, tone: "code", hl: true });
    };
  };
})();
