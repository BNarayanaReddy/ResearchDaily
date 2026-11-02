/* Drawings: Speaking safely (stop, sampler, duration cap, loop guard, long text) and Serving (frame budget, tick, memory). */
(function () {
  const D = RD.drawings, V = RD.maya, W = V.W, H = V.H;

  // Page 24. Controlled stop thresholds (engine.py:681): argmax, p >= 0.35, hazard >= 0.6; minimum 33 frames for our raw text.
  D["stop"] = (fig, k) => {
    const pk = k.slider({ label: "late p(stop)", min: 0.02, max: 0.3, step: 0.02, value: 0.1, fmt: (v) => v.toFixed(2) });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const N = 120, xs = Array.from({ length: N }, (_, i) => i);
      const p = xs.map((t) => (t < 100 ? 0.004 : pk.value));          // illustrative: stop chance rises at the end
      let Hz = 0; const hz = xs.map((t) => { if (t >= 33) Hz = 1 - (1 - Hz) * (1 - p[t]); return Hz; });
      const stopAt = hz.findIndex((v) => v >= 0.6);
      const series = [{ x: xs, y: p, tone: "bad", label: "p(stop)", labelAt: 110 }];
      if (s >= 4) series.push({ x: xs, y: hz, tone: "predict", label: "hazard", labelAt: 112 });
      const P = c.plot({ series, xmin: 0, xmax: N - 1, ymin: 0, ymax: 1, h: 300, xlabel: "frame", ylabel: "probability" });
      if (s === 1) c.box({ x: 90, y: 40, w: 360, h: 50, label: "sampled stop: miss it once, keep babbling", tone: "bad", hl: true, size: 13 });
      if (s === 2) c.box({ x: 90, y: 40, w: 360, h: 50, label: "draw codebook 0 without stop; decide stop by rule", tone: "code", hl: true, size: 13 });
      if (s >= 3) { c.line(P.X(0), P.Y(0.35), P.X(N - 1), P.Y(0.35), { tone: "bad", dash: true }); c.label(P.X(10), P.Y(0.35) - 8, "p ≥ 0.35", { size: 12, tone: "bad" }); }
      if (s >= 4) { c.line(P.X(0), P.Y(0.6), P.X(N - 1), P.Y(0.6), { tone: "predict", dash: true }); c.label(P.X(10), P.Y(0.6) - 8, "hazard ≥ 0.6", { size: 12, tone: "predict" }); }
      if (s >= 4 && stopAt > 0) c.dot(P.X(stopAt), P.Y(hz[stopAt]), { r: 6, tone: "predict" });
      if (s >= 4) c.text(632, 340, stopAt > 0 ? `stops at frame ${stopAt} (${stopAt - 100 + 1} frames after p rises)` : "no stop within 120 frames", { size: 12, anchor: "end", tone: "predict", weight: 700 });
      if (s >= 5) { c.line(P.X(33), P.Y(0), P.X(33), P.Y(0.95), { tone: "code", dash: true }); c.label(P.X(33) + 6, P.Y(0.9), "rules start: frame 33", { size: 12, tone: "code" }); }
    };
  };

  // Page 25. cb0 sampler: temp 0.9, top-64, presence penalty 0.8 over 12 frames (engine.py:58-62). Logits illustrative.
  D["cb0-sampler"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const codes = ["417", "1203", "88", "1950", "644", "301"], base = [2.4, 2.2, 1.6, 1.3, 1.0, 0.6], seen = [true, false, false, true, false, false];
      const lg = base.map((v, i) => (s >= 2 && seen[i] ? v - 0.8 : v));
      const ex = lg.map((v) => Math.exp(v / 0.9)), Z = ex.reduce((a, b) => a + b, 0);
      V.title(c, s >= 2 ? "after the presence penalty (−0.8 if seen in last 12 frames)" : "codebook-0 probabilities at temperature 0.9");
      V.tbars(c, codes.map((n, i) => [`code ${n}${seen[i] && s >= 2 ? " (recent)" : ""}`, Math.round((1000 * ex[i]) / Z) / 10, s >= 2 && seen[i], false]), { y: 30, h: 200, labelW: 150, max: 50, fmt: (v) => `${v}%`, tone: "paper" });
      if (s === 3) c.box({ x: 8, y: 250, w: 624, h: 48, label: "a held code = a stalled sound; the penalty nudges it on", tone: "take", hl: true, size: 14 });
      if (s >= 4) c.box({ x: 8, y: 250, w: 380, h: 48, label: "never-stopping runs: 0.79% → 0.07%", mono: true, tone: "code", hl: s === 4, size: 14 });
      if (s >= 5) c.box({ x: 400, y: 250, w: 232, h: 48, label: "depth: 0.7, top-64", mono: true, tone: "muted", hl: true, size: 14 });
      if (s >= 1) c.text(8, 330, "illustrative logits for six of the top-64 codes", { size: 12, tone: "muted" });
    };
  };

  // Page 26. Telugu row of maya3/assets/duration_prior.json; cap = 2.2 x expected + 1.2 s (guards.py:44); hard cap 1,500 frames.
  D["duration-cap"] = (fig, k) => {
    const L = k.slider({ label: "Telugu letters", min: 10, max: 400, step: 1, value: 63 });
    const P = k.slider({ label: "pauses", min: 0, max: 30, step: 1, value: 4 });
    const G = k.slider({ label: "digits", min: 0, max: 40, step: 1, value: 5 });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const co = [0.45026, 0.07269, 0.0576, 0.46093, 0.39692];
      const e = Math.max(0.35, co[0] + co[1] * L.value + co[3] * P.value + co[4] * G.value);
      const capF = Math.min(1500, Math.floor((2.2 * e + 1.2) / 0.08)), capS = capF * 0.08;
      c.text(8, 22, "expected = 0.450 + 0.0727·letters + 0.461·pauses + 0.397·digits", { size: 13, mono: true, weight: 700, maxW: 624 });
      c.box({ x: 8, y: 40, w: 624, h: 44, label: `= ${e.toFixed(2)} s for this text`, mono: true, tone: "paper", hl: s === 1 || s === 2, size: 15 });
      const sc = 600 / 40;
      const bar = (y, sec, tone, lab, hl) => { c.add(k.h("rect", { x: 16, y, width: Math.min(600, sec * sc), height: 30, rx: 3, class: `f-${tone} ${hl ? "soft" : "softer"}` })); c.text(16, y - 6, lab, { size: 12, tone, weight: hl ? 700 : 400 }); };
      if (s >= 2) bar(126, 8.64, "bridge", "real clip: 8.64 s (our running example)", s === 2);
      bar(186, e, "paper", `expected: ${e.toFixed(2)} s`, s === 2);
      if (s >= 3) bar(246, capS, "bad", `cap: 2.2 × ${e.toFixed(2)} + 1.2 = ${capS.toFixed(1)} s (${capF} frames)`, s >= 3);
      if (s >= 5) c.text(632, 344, "never past 1,500 frames = 120 s per piece", { size: 12, anchor: "end", tone: "bad", weight: 700 });
      if (s >= 4) c.text(16, 312, "0 s                    axis: 0–40 s", { size: 11, tone: "muted" });
    };
  };

  // Page 27. Loop guard (guards.py). Synthetic cb0 sequence that trips the period rule.
  D["loop-guard"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const r = V.rng(3), seq = [];
      for (let t = 0; t < 96; t++) seq.push(t < 50 ? Math.floor(r() * 9) : [3, 7, 1][t % 3]);
      const tone = (v) => ["paper", "take", "code", "predict", "bridge", "muted", "bad", "paper", "take"][v];
      c.text(8, 20, "codebook-0 tail: last 96 frames (synthetic)", { size: 13, weight: 700 });
      seq.forEach((v, t) => c.add(k.h("rect", { x: 8 + t * 6.5, y: 34, width: 5.4, height: 40, rx: 1, class: `f-${tone(v)} ${t >= 50 && s >= 3 ? "soft" : "softer"}` })));
      if (s >= 2) c.box({ x: 8, y: 100, w: 300, h: 50, label: "stall: 32 identical codes = 2.6 s", tone: "muted", hl: s === 2, size: 13 });
      if (s >= 3) c.box({ x: 324, y: 100, w: 308, h: 50, label: "period 3: 70%+ of last 64 match", tone: "bad", hl: s === 3, size: 13 });
      if (s >= 4) c.box({ x: 8, y: 180, w: 300, h: 56, label: "+4 on end-of-audio logit", sub: "model finishes the phrase", tone: "predict", hl: s === 4 });
      if (s >= 5) {
        c.box({ x: 324, y: 180, w: 308, h: 56, label: "24 frames later, still looping: cut", tone: "bad", hl: true });
        c.box({ x: 8, y: 270, w: 624, h: 44, label: "exempt windows around [laughs], fillers and speaker switches", tone: "muted", hl: true, size: 13 });
      }
    };
  };

  // Page 28. Long text: ~20 s pieces, 150 ms gaps (engine.py:70-71); re-prompt drift 0.5% -> 8.4% HF (s2_serve_controls.py:55).
  D["long-text"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const pieces = [21, 18, 22, 19, 20, 15];
      c.text(8, 22, "a 2-minute paragraph, split at sentence ends", { size: 13, weight: 700 });
      let x = 8;
      pieces.forEach((sec, i) => {
        const w = sec * 4.6;
        c.box({ x, y: 36, w, h: 50, label: `${sec} s`, tone: i % 2 ? "paper" : "take", hl: s === 1, size: 13 });
        x += w + (s >= 4 ? 6 : 1);
      });
      if (s >= 2) c.chips({ x: 8, y: 110, items: [{ t: "voice prefix", tone: "code", hl: s === 2 }, { t: "piece k text", tone: "paper" }, { t: "<|audio|>", tone: "bridge" }], size: 13 });
      if (s >= 2) c.text(8, 160, "fresh context for each piece", { size: 12, tone: "code" });
      if (s >= 3) V.tbars(c, [["first piece", 0.5, false, false], ["last piece, own-audio re-prompt", 8.4, true, false]], { y: 170, h: 90, labelW: 220, max: 10, fmt: (v) => `${v}% HF noise`, tone: "bad" });
      if (s >= 4) c.text(8, 290, "150 ms of silence between pieces", { size: 13, tone: "muted", weight: 700 });
      if (s >= 5) c.box({ x: 8, y: 304, w: 624, h: 44, label: "cost: each piece's prosody starts over", tone: "take", hl: true, size: 13 });
    };
  };

  // Page 29. ENGINE Measured: one frame 10.5 ms at B=1 = 2.0 + 0.35 + 6.5 + 1.8; B=100 23.7 ms; B=160 30 ms.
  D["frame-budget"] = (fig, k) => {
    const b = k.toggle({ label: "streams", options: ["1", "100", "160"], value: "1" });
    k.follow(b, { 1: "1", 4: "100" });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const sc = 600 / 80, x0 = 16;
      c.add(k.h("rect", { x: x0, y: 50, width: 600, height: 50, rx: 4, class: "f-muted softer" }));
      c.text(x0, 40, "80 ms: the time one frame of audio plays", { size: 13, weight: 700 });
      if (s >= 2) {
        const ms = b.value === "1" ? 10.5 : b.value === "100" ? 23.7 : 30;
        c.box({ x: x0, y: 50, w: Math.max(70, ms * sc), h: 50, label: `${ms} ms`, mono: true, tone: "paper", hl: true, size: 13 });
        if (b.value === "1") V.tbars(c, [["backbone", 2.0, false, false], ["sampler", 0.35, false, false], ["depth", 6.5, s === 3, false], ["Mimi", 1.8, false, false]], { y: 118, h: 120, labelW: 100, max: 8, fmt: (v) => `${v} ms`, tone: "paper" });
        else c.text(x0, 140, `${b.value} streams per frame; split by part not reported`, { size: 13, tone: "muted" });
      }
      if (s >= 3) c.box({ x: 16, y: 250, w: 600, h: 40, label: "depth: 31 levels in sequence = 62% of one frame", tone: "paper", hl: s === 3, size: 13 });
      if (s >= 5) c.box({ x: 16, y: 302, w: 600, h: 40, label: "one stream: RTF 0.137, about 7× real time", mono: true, tone: "code", hl: true, size: 14 });
    };
  };

  // Page 30. Engine tick (engine.py:3); load numbers §card Streaming.
  D["tick"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const seats = 16;
      c.text(8, 20, "one tick = one frame for every active seat", { size: 13, weight: 700 });
      for (let i = 0; i < seats; i++) {
        const x = 8 + i * 39, busy = i < 12, isNew = i === 12 && s >= 2;
        c.add(k.h("rect", { x, y: 32, width: 34, height: 34, rx: 4, class: busy ? "f-take soft" : isNew ? "f-predict soft" : "f-muted softer" }));
      }
      if (s >= 2) c.text(632, 86, "new request: prefilled inline", { size: 12, tone: "predict", anchor: "end" });
      if (s >= 3) {
        const parts = [["backbone step", "take"], ["cb0 + stop", "predict"], ["depth 31 levels", "paper"], ["Mimi frame", "bridge"]];
        const bx = parts.map(([l, t], i) => c.box({ x: 8 + i * 158, y: 104, w: 146, h: 50, label: l, tone: t, hl: s === 3, size: 13 }));
        bx.slice(1).forEach((b, i) => c.connect(bx[i], b, { tone: "muted" }));
        c.text(8, 172, "each a captured CUDA graph", { size: 12, tone: "muted" });
      }
      if (s >= 4) c.box({ x: 8, y: 186, w: 624, h: 42, label: "one GPU → CPU copy, then guards and delivery", tone: "muted", hl: s === 4, size: 13 });
      if (s >= 5) V.tbars(c, [["streams", 224, true, false], ["audio-s per s", 323, true, false], ["first audio p50 (ms)", 111, false, false], ["p99 (ms)", 242, false, false]],
        { y: 240, h: 112, labelW: 160, max: 340, fmt: (v) => String(v), tone: "code" });
    };
  };

  // Page 31. ENGINE Hardware: seats 1/8/16/32 -> steady 7.7/9.7/11.7/15.8 GB, peak 9.2/10.9/12.8/16.5.
  D["memory"] = (fig, k) => {
    const n = k.slider({ label: "seats", min: 1, max: 32, step: 1, value: 1 });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const S = [1, 8, 16, 32], st = [7.7, 9.7, 11.7, 15.8], pk = [9.2, 10.9, 12.8, 16.5];
      const interp = (arr) => { let i = 0; while (i < 2 && n.value > S[i + 1]) i++; const t = (n.value - S[i]) / (S[i + 1] - S[i]); return arr[i] + t * (arr[i + 1] - arr[i]); };
      const series = [{ x: S, y: st, tone: "paper", dots: true, label: "steady", labelAt: 2 }];
      if (s >= 3) series.push({ x: S, y: pk, tone: "bad", dots: true, label: "peak at load", labelAt: 1 });
      const P = c.plot({ series, xmin: 0, xmax: 34, ymin: 0, ymax: 26, h: 330, w: 420, xlabel: "concurrent seats", ylabel: "GPU GB" });
      if (s >= 1) { c.line(P.X(0), P.Y(5.6), P.X(34), P.Y(5.6), { tone: "muted", dash: true }); c.label(P.X(20), P.Y(5.6) + 14, "weights 5.6 GB", { size: 12, tone: "muted" }); }
      if (s >= 4) { c.line(P.X(0), P.Y(24), P.X(34), P.Y(24), { tone: "code", dash: true }); c.label(P.X(4), P.Y(24) - 8, "RTX 4090 24 GB", { size: 12, tone: "code" }); }
      if (s >= 5) { c.line(P.X(0), P.Y(6), P.X(34), P.Y(6), { tone: "bad", dash: true }); }
      const kv = n.value * 2048 * 112 / 1024 / 1024;
      c.box({ x: 440, y: 20, w: 192, h: 70, label: `${n.value} seat${n.value > 1 ? "s" : ""}: ${interp(st).toFixed(1)} GB`, sub: `peak ${interp(pk).toFixed(1)} GB`, mono: true, tone: "paper", hl: s === 3 });
      if (s >= 2) c.box({ x: 440, y: 110, w: 192, h: 70, label: `KV ${kv.toFixed(2)} GiB`, sub: "112 KiB × 2,048 × seats", mono: true, tone: "take", hl: s === 2 });
      if (s >= 5) c.box({ x: 440, y: 200, w: 192, h: 70, label: "our laptop: 6 GB", sub: "below one seat's 9.2 GB peak", tone: "bad", hl: true });
    };
  };
})();
