/* Drawings: Toolbox (codec grid, RVQ, depth idea, exposure bias, ECAPA, DPO). */
(function () {
  const D = RD.drawings, V = RD.maya, W = V.W, H = V.H;

  // Page 1: 8.64 s clip -> 108 frames x 32 codes (our measurement; Mimi 12.5 Hz, 32 x 2048, §card Architecture)
  D["codec-frames"] = (fig, k) => {
    const q = k.slider({ label: "codebooks kept", min: 1, max: 32, step: 1, value: 32 });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const r = V.rng(7);
      // waveform strip
      let d = "M8,52";
      for (let i = 0; i <= 312; i++) {
        const x = 8 + i * 2, env = 0.35 + 0.65 * Math.abs(Math.sin(i / 23));
        d += ` L${x},${52 + (r() - 0.5) * 50 * env}`;
      }
      c.path(d, { tone: "bridge", width: 1.2, hl: s === 1 });
      c.text(8, 20, "8.64 s of Telugu, 24 kHz = 207,360 samples", { size: 13, weight: 700, tone: "bridge" });
      if (s >= 2) {
        for (let f = 0; f <= 108; f += 12) c.line(8 + f * 5.77, 84, 8 + f * 5.77, 94, { tone: "muted", width: 1 });
        c.text(8, 112, "108 frames of 80 ms (1,920 samples each)", { size: 13, tone: "paper", weight: s === 2 ? 700 : 400 });
      }
      if (s >= 3) {
        const rows = 32, cell = 6.1, y0 = 124;
        for (let l = 0; l < rows; l++) {
          const keep = l < q.value;
          c.add(k.h("rect", { x: 8, y: y0 + l * cell, width: 108 * 5.77, height: cell - 1.2, rx: 1,
            class: keep ? (l === 0 ? "f-take soft" : "f-paper softer") : "f-muted softer" }));
        }
        c.text(632, y0 + 8, "codebook 0", { size: 11, anchor: "end", tone: "take", inBox: true });
        c.text(632, y0 + 31 * cell + 4, "codebook 31", { size: 11, anchor: "end", tone: "muted", inBox: true });
      }
      if (s >= 4) {
        const n = 108 * q.value, kbps = (q.value * 11 * 12.5) / 1000;
        const wide = s === 4;
        c.box({ x: 8, y: 326, w: wide ? 624 : 404, h: 30, label: `108 × ${q.value} = ${n.toLocaleString("en-US")} codes · ${kbps.toFixed(2)} kbps`, mono: true, size: 13, tone: "predict", hl: s === 4 });
        if (!wide) c.box({ x: 420, y: 326, w: 212, h: 30, label: "Mimi: frame → 80 ms audio", size: 13, tone: "bridge", hl: true });
      }
    };
  };

  // Page 2: residual quantisation. Leftover energy per level is illustrative.
  D["rvq"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const left = [1, 0.62, 0.42, 0.3, 0.22, 0.17, 0.13, 0.1, 0.08];
      c.text(8, 20, "error left after each codebook (illustrative)", { size: 13, weight: 700 });
      const n = s >= 3 ? 9 : s >= 2 ? 3 : 2;
      for (let i = 0; i < n; i++) {
        const hgt = left[i] * 220, x = 30 + i * 66;
        c.add(k.h("rect", { x, y: 270 - hgt, width: 44, height: hgt, rx: 3, class: i === 0 ? "f-muted soft" : i === 1 ? "f-take soft" : "f-paper softer" }));
        c.text(x + 22, 292, i === 0 ? "frame" : `after ${i - 1}`, { size: 11, anchor: "middle", tone: "muted", inBox: true });
      }
      if (s === 1) c.box({ x: 360, y: 60, w: 270, h: 56, label: "codebook 0: nearest of 2,048", sub: "most of the frame, some error left", tone: "take", hl: true, size: 13 });
      if (s === 2) c.box({ x: 360, y: 60, w: 270, h: 56, label: "codebook 1 codes the leftover", sub: "residual vector quantisation", tone: "paper", hl: true, size: 13 });
      if (s === 3) c.box({ x: 360, y: 60, w: 270, h: 56, label: "late levels: fine detail", sub: "hiss, breath, room", tone: "paper", hl: true, size: 13 });
      if (s >= 4) c.box({ x: 8, y: 306, w: 300, h: 46, label: "codebook 0 ≈ what is said", sub: "matched to speech features", tone: "take", hl: s === 4, size: 13 });
      if (s >= 5) c.box({ x: 324, y: 306, w: 308, h: 46, label: "codebooks 1–31 ≈ how it sounds", tone: "paper", hl: true, size: 13 });
    };
  };

  // Page 3: flatten vs backbone+depth. Step counts are arithmetic on 108 frames.
  D["depth-idea"] = (fig, k) => {
    const mode = k.toggle({ label: "layout", options: ["flatten", "backbone + depth"], value: "flatten" });
    k.follow(mode, { 1: "flatten", 3: "backbone + depth" });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const flat = mode.value === "flatten";
      c.text(8, 20, flat ? "one big model, one code per step" : "big model per frame, small model per code", { size: 13, weight: 700, tone: flat ? "bad" : "code" });
      // 6 frames x 8 codes shown
      for (let f = 0; f < 6; f++) for (let l = 0; l < 8; l++) {
        const x = 30 + f * 70 + (flat ? l * 7.5 : 0), y = flat ? 70 : 60 + l * 17;
        const xx = flat ? 30 + (f * 8 + l) * 12.2 : x;
        c.add(k.h("rect", { x: xx, y: flat ? y : y, width: flat ? 10 : 46, height: flat ? 22 : 13, rx: 2,
          class: l === 0 ? "f-take soft" : "f-paper softer" }));
      }
      if (flat) {
        c.text(30, 116, "… 3,456 positions for our clip", { size: 12, tone: "muted" });
        if (s >= 2) c.box({ x: 30, y: 150, w: 580, h: 56, label: "3,456 big-model passes; attention over thousands of codes", tone: "bad", hl: s === 2, size: 14 });
        if (s >= 3) c.text(30, 236, "toggle to the split layout", { size: 12, tone: "muted" });
      } else {
        c.text(470, 70, "codebook 0", { size: 12, tone: "take" });
        c.text(470, 150, "codebooks 1–31", { size: 12, tone: "paper" });
        const b = c.box({ x: 30, y: 210, w: 270, h: 54, label: "backbone: 108 steps", sub: "writes codebook 0", tone: "take", hl: s === 3 });
        if (s >= 4) { const d = c.box({ x: 340, y: 210, w: 270, h: 54, label: "depth decoder: 31 per frame", sub: "small, inside one frame", tone: "paper", hl: s === 4 }); c.connect(b, d, { tone: "muted" }); }
        if (s >= 5) c.box({ x: 30, y: 290, w: 580, h: 44, label: "RQ-Transformer · Moshi · Sesame CSM · Qwen3-TTS (found by us)", tone: "muted", hl: true, size: 13 });
      }
    };
  };

  // Page 4: exposure bias cartoon. Curves are illustrative.
  D["exposure"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const xs = Array.from({ length: 41 }, (_, i) => i);
      const series = [{ x: xs, y: xs.map(() => 1), tone: "code", label: "true history (training)", labelAt: 30 }];
      if (s >= 2) series.push({ x: xs, y: xs.map((t) => 1 + 0.004 * t * t * (s >= 3 ? 1 : 0.15)), tone: "bad", label: "own history", labelAt: 34 });
      if (s >= 4) series.push({ x: xs, y: xs.map((t) => 1 + 0.06 * t * (s >= 5 ? 0.6 : 1) / 4), tone: "take", dash: true, label: "trained on own/broken history", labelAt: 22 });
      c.plot({ series, xmin: 0, xmax: 40, ymin: 0, ymax: 8, h: 330, xlabel: "frames generated", ylabel: "error (illustrative)" });
    };
  };

  // Page 5: ECAPA map. A 2-D cartoon of a 192-d space.
  D["ecapa"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const r = V.rng(11);
      const voices = [["Nivedita", 160, 120, "take"], ["Sreekar", 430, 110, "paper"], ["Kayal", 300, 260, "code"]];
      voices.forEach(([n, cx, cy, tone], vi) => {
        const pts = Array.from({ length: 7 }, () => [cx + V.gauss(r) * 26, cy + V.gauss(r) * 20]);
        if (s >= 2 || vi === 0) pts.forEach(([x, y]) => c.dot(x, y, { r: 4, tone, dim: s === 1 && vi > 0 }));
        if (s >= 3) { c.dot(cx, cy, { r: 9, tone }); c.label(cx + 14, cy - 12, `${n} centroid`, { size: 12, tone }); }
      });
      if (s === 1) c.box({ x: 360, y: 300, w: 270, h: 46, label: "each dot: one clip → 192 numbers", tone: "muted", hl: true, size: 13 });
      if (s >= 4) {
        c.dot(205, 150, { r: 6, tone: "predict" });
        c.arrow(205, 150, 168, 126, { tone: "predict", dash: true });
        c.box({ x: 360, y: 300, w: 270, h: 46, label: "new clip → nearest centroid", tone: "predict", hl: s === 4, size: 13 });
      }
      if (s >= 5) c.box({ x: 8, y: 300, w: 330, h: 46, label: "same vector steers the model", tone: "take", hl: true, size: 13 });
    };
  };

  // Page 6: DPO pairs from automatic ranking. Scores are illustrative.
  D["dpo"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const takes = [["take A", 1.2, 0.81], ["take B", 6.5, 0.74], ["take C", 0.9, 0.62], ["take D", 2.4, 0.79]];
      const best = 0, worst = 1;
      takes.forEach(([n, cer, sim], i) => {
        const y = 20 + i * 62;
        const tone = s >= 3 && i === best ? "code" : s >= 3 && i === worst ? "bad" : "muted";
        c.box({ x: 8, y, w: 180, h: 50, label: n, sub: "same text, new sample", tone, hl: s === 1 || (s >= 3 && (i === best || i === worst)) });
        if (s >= 2) c.box({ x: 210, y, w: 200, h: 50, label: `CER ${cer}% · sim ${sim}`, mono: true, size: 13, tone, hl: s === 2 });
      });
      if (s >= 4) {
        c.box({ x: 440, y: 40, w: 190, h: 70, label: "raise A", sub: "relative to frozen copy", tone: "code", hl: s === 4 });
        c.box({ x: 440, y: 130, w: 190, h: 70, label: "lower B", sub: "relative to frozen copy", tone: "bad", hl: s === 4 });
      }
      if (s >= 5) c.box({ x: 8, y: 280, w: 622, h: 50, label: "no reward model; pair counts and β not disclosed", tone: "muted", hl: true, size: 14 });
    };
  };
})();
