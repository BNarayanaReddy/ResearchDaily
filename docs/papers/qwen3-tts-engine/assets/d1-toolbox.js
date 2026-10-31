/* Drawings: "Serving toolbox". */
(function () {
  const D = RD.drawings, V = RD.vox, W = V.W, H = V.H;

  D["ttfa-rtf"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      // README smoke test: 4.40 s audio, first audio 24 ms, RTF 0.148 -> ~651 ms wall
      const X = (sec) => 30 + sec * 132;
      c.text(30, 24, "“Your order will be delivered by tomorrow evening.”", { size: 14, weight: 700, tone: "paper" });
      c.text(30, 56, "audio: 4.40 s", { size: 13, tone: "bridge", weight: 700 });
      c.box({ x: X(0), y: 64, w: X(4.4) - X(0), h: 30, tone: "bridge", hl: s === 1 });
      [0, 1, 2, 3, 4].forEach((t) => c.text(X(t), 112, `${t} s`, { size: 11, anchor: "middle", tone: "muted" }));
      if (s >= 2) {
        c.text(30, 150, "wall clock", { size: 13, weight: 700, tone: "predict" });
        c.line(X(0), 168, X(0.024), 168, { tone: "predict", width: 6 });
        c.label(X(0.024) + 20, 196, "first audio at 24 ms", { size: 13, tone: "predict", weight: 700 });
      }
      if (s >= 3) c.box({ x: 30, y: 214, w: 286, h: 44, label: "TTFA = queue + admit + frame + decode", size: 12, tone: "muted", hl: s === 3 });
      if (s >= 4) {
        c.box({ x: X(0), y: 158, w: X(0.651) - X(0), h: 20, tone: "code", hl: s === 4 });
        c.box({ x: 332, y: 214, w: 300, h: 44, label: "RTF = 0.651 s ÷ 4.40 s = 0.148", mono: true, size: 13, tone: "code", hl: s === 4 });
      }
      if (s >= 5) c.box({ x: 30, y: 280, w: 602, h: 50, label: "TTFA: does it feel instant? · RTF: does playback ever stall?", size: 14, tone: "take", hl: true });
    };
  };

  D["offered-live"] = (fig, k) => {
    const N = k.slider({ label: "offered streams", min: 96, max: 800, step: 16, value: 576 });
    const R = k.slider({ label: "RTF", min: 0.1, max: 1.0, step: 0.01, value: 0.58, fmt: (v) => v.toFixed(2) });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const n = N.value, r = R.value, live = Math.round(n * r), req = 25;
      c.box({ x: 8, y: 12, w: 624, h: 50, label: `${n} offered = ${n} audio-seconds asked per second = ${(n / req).toFixed(1)} requests/s of ${req} s`, size: 13, tone: "paper", hl: s === 1 });
      if (s >= 2) c.box({ x: 8, y: 76, w: 624, h: 40, label: "unpaced: generate as fast as possible, not at playback speed", size: 13, tone: "muted", hl: s === 2 });
      if (s >= 3) {
        const X = (t) => 120 + t * 20;
        c.text(8, 152, "plays for", { size: 12, tone: "muted" }); c.box({ x: X(0), y: 138, w: X(req) - X(0), h: 22, tone: "bridge" });
        c.text(8, 186, "made in", { size: 12, tone: "muted" }); c.box({ x: X(0), y: 172, w: (X(req) - X(0)) * r, h: 22, tone: "code", hl: s === 3 });
        c.text(X(req * r) + 6, 188, `${(req * r).toFixed(1)} s`, { size: 12, mono: true, tone: "code" });
      }
      if (s >= 4) {
        const sw = 600 * Math.min(1, live / 800);
        c.box({ x: 20, y: 222, w: 600, h: 40, tone: "muted" });
        c.box({ x: 20, y: 222, w: Math.max(30, sw), h: 40, tone: "take", hl: true });
        c.text(320, 290, `live ≈ ${n} × ${r.toFixed(2)} = ${live} streams at once`, { size: 15, mono: true, anchor: "middle", weight: 700, tone: "take" });
      }
      if (s >= 5) c.text(320, 330, "read the step time, not the label", { size: 13, anchor: "middle", tone: "predict", weight: 700 });
    };
  };

  D["open-loop"] = (fig, k) => {
    const c = k.canvas(W, H);
    const r = V.rng(17), arr = []; let t = 0; while (t < 10) { t += -Math.log(r()) * 0.55; if (t < 10) arr.push(t); }
    return (s) => {
      c.clear();
      const X = (t) => 120 + t * 50;
      c.line(X(0), 80, X(10), 80, { tone: "muted" }); c.line(X(0), 210, X(10), 210, { tone: "muted" });
      c.text(8, 84, "closed loop", { size: 13, weight: 700, tone: s <= 2 ? "bad" : "muted" });
      // closed loop: next request starts when the last finishes; server slow in the middle
      const lat = (t) => (t > 3 && t < 7 ? 1.6 : 0.6); let u = 0; const cl = [];
      while (u < 10) { cl.push(u); u += lat(u); }
      cl.forEach((t) => c.dot(X(t), 80, { r: 5, tone: "bad", dim: s > 2 && s < 5 }));
      if (s >= 2) c.label(X(5), 50, "server slows → fewer requests sent", { size: 13, tone: "bad", weight: 700 });
      if (s >= 3) {
        c.text(8, 214, "open loop", { size: 13, weight: 700, tone: "code" });
        arr.forEach((t) => c.dot(X(t), 210, { r: 5, tone: "code" }));
        c.label(X(5), 180, "Poisson clock: arrivals ignore the server", { size: 13, tone: "code", weight: 700 });
      }
      if (s >= 4) c.box({ x: 120, y: 250, w: 500, h: 40, label: "absolute schedule: a slow submit doesn't thin arrivals", size: 13, tone: "code", hl: s === 4 });
      if (s >= 5) c.box({ x: 120, y: 304, w: 500, h: 40, label: "45 s warm-up + 300 s window", size: 13, tone: "predict", hl: true });
      c.text(X(10), 110, "time →", { size: 11, anchor: "end", tone: "muted" });
    };
  };

  D["percentiles"] = (fig, k) => {
    const c = k.canvas(W, H);
    const mu = Math.log(70.4), sg = 0.143; // fitted to p50 70.4 and p99 98.2 (README validation, 0.6B @ 576) — illustrative shape
    const xs = Array.from({ length: 121 }, (_, i) => 30 + i * 0.85), ys = xs.map((x) => Math.exp(-((Math.log(x) - mu) ** 2) / (2 * sg * sg)) / x);
    const mx = Math.max(...ys);
    return (s) => {
      c.clear();
      const p = c.plot({ series: [{ x: xs, y: ys.map((y) => y / mx), tone: "paper" }], xmin: 30, xmax: 132, ymin: 0, ymax: 1.15,
        xlabel: "time to first audio (ms), 6,375 requests", ylabel: "share of requests", xFmt: (v) => v.toFixed(0), yFmt: () => "" });
      const mark = (v, l, tone, on) => { c.path(`M${p.X(v)},${p.Y(0)} L${p.X(v)},${p.Y(1.05)}`, { tone, dash: true, width: on ? 2.2 : 1.2 }); c.label(p.X(v), p.Y(1.1), l, { size: 13, tone, weight: on ? 700 : 400 }); };
      if (s >= 2) mark(70.4, "p50 70.4", "code", s === 2);
      if (s >= 3) { mark(92.9, "p95 92.9", "predict", false); mark(98.2, "p99 98.2", "bad", s === 3); }
      if (s >= 4) { c.path(`M${p.X(100)},${p.Y(0)} L${p.X(100)},${p.Y(0.6)}`, { tone: "take", width: 2.5 }); c.label(p.X(115), p.Y(0.5), "target: 100 ms at p99", { size: 13, tone: "take", weight: 700 }); }
      if (s >= 5) c.label(p.X(45), p.Y(0.8), "mean hides the tail", { size: 13, tone: "muted", weight: 700 });
    };
  };

  D["launch-bound"] = (fig, k) => {
    const B = k.toggle({ label: "batch", options: ["1", "16", "64"], value: "1" });
    k.follow(B, { 1: "1", 2: "1", 3: "64", 5: "64" });
    const c = k.canvas(W, H);
    const T = { "1": 178, "16": 185, "64": 194 }; // README Results (stock, 0.6B)
    return (s) => {
      c.clear();
      const X = (ms) => 120 + ms * 2.2;
      ["1", "16", "64"].forEach((b, i) => {
        const on = b === B.value;
        c.text(110, 52 + i * 56, `batch ${b}`, { size: 13, anchor: "end", weight: on ? 700 : 400, tone: on ? "ink" : "muted" });
        if (s >= 2 || b === "1") { c.box({ x: X(0), y: 30 + i * 56, w: X(T[b]) - X(0), h: 36, tone: on ? "bad" : "muted", hl: on && s >= 2, dim: s >= 3 && !on }); c.text(X(T[b]) + 6, 54 + i * 56, `${T[b]} ms`, { size: 13, mono: true, tone: on ? "bad" : "muted" }); }
      });
      c.path(`M${X(80)},20 L${X(80)},200`, { tone: "code", dash: true, width: 2 });
      c.text(X(80), 216, "80 ms = real time", { size: 12, anchor: "middle", tone: "code", weight: 700 });
      if (s >= 3) c.box({ x: 20, y: 240, w: 600, h: 44, label: `64× the streams, +9% time: ${(64 * 80 / 194).toFixed(1)}× real time in total`, size: 14, tone: "predict", hl: s === 3 || s === 5 });
      if (s >= 4) c.box({ x: 20, y: 296, w: 600, h: 44, label: "the time is Python + kernel launches, not arithmetic", size: 14, tone: "bad", hl: s === 4 });
    };
  };

  D["cuda-graphs"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      c.text(8, 30, "eager: CPU launches every kernel", { size: 13, weight: 700, tone: "bad" });
      for (let i = 0; i < 12; i++) {
        c.box({ x: 20 + i * 50, y: 44, w: 18, h: 22, tone: "muted", r: 3 });
        c.box({ x: 20 + i * 50 + 22, y: 74, w: 20, h: 22, tone: "bad", r: 3, hl: s === 1 });
      }
      c.text(8, 116, "CPU (grey) · GPU (red): the GPU waits between kernels", { size: 12, tone: "muted" });
      if (s >= 2) {
        c.text(8, 156, "graph: record once", { size: 13, weight: 700, tone: "code" });
        c.box({ x: 20, y: 168, w: 260, h: 40, label: "capture → kernels + addresses", size: 13, tone: "code", hl: s === 2 });
      }
      if (s >= 3) {
        c.box({ x: 300, y: 168, w: 40, h: 40, label: "▶", tone: "muted" });
        for (let i = 0; i < 12; i++) c.box({ x: 350 + i * 23, y: 174, w: 20, h: 28, tone: "code", r: 3, hl: s === 3 });
        c.text(350, 226, "one replay call, kernels back to back", { size: 12, tone: "code" });
      }
      if (s >= 4) c.box({ x: 20, y: 250, w: 600, h: 40, label: "price: fixed shapes and fixed buffer addresses", size: 13, tone: "predict", hl: s === 4 });
      if (s >= 5) c.box({ x: 20, y: 302, w: 600, h: 40, label: "engine: one graph = a whole frame for all live streams", size: 13, tone: "take", hl: true });
    };
  };

  D["torch-compile"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      ["norm", "mul", "add", "silu", "mul", "add"].forEach((o, i) => c.box({ x: 8 + i * 58, y: 24, w: 52, h: 36, label: o, size: 12, tone: "muted", dim: s >= 2 }));
      if (s >= 1) c.text(8, 84, "six small kernels", { size: 12, tone: "muted" });
      if (s >= 1) c.box({ x: 380, y: 24, w: 250, h: 36, label: "→ 2 fused kernels", size: 13, tone: "code", hl: s === 1 });
      if (s >= 2) c.box({ x: 380, y: 72, w: 250, h: 36, label: "dynamic=False: one per bucket", size: 12, tone: "take", hl: s === 2 });
      if (s >= 3) {
        V.tbars(c, [["upstream generate()", 181, false, s > 3], ["own frame loop", 32.6, s === 3, false], ["+ compile + graph", 26.1, s === 4, s === 3]].slice(0, s >= 4 ? 3 : 2),
          { y: 130, h: 120, labelW: 170, tone: "predict", fmt: (v) => `${v} ms`, max: 190 });
      }
      if (s >= 5) c.box({ x: 8, y: 280, w: 624, h: 50, label: "8 recompiles → silently uncompiled · engine raises the limit to 4,096", size: 13, tone: "bad", hl: true });
    };
  };

  D["paged-kv"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      c.text(8, 22, "GPU memory pool: pages of 256 positions", { size: 13, weight: 700 });
      const mine = [5, 13, 18];
      for (let i = 0; i < 24; i++) {
        const x = 8 + (i % 12) * 52, y = 34 + Math.floor(i / 12) * 52, own = mine.includes(i) && s >= 3;
        c.box({ x, y, w: 46, h: 44, label: String(i), size: 12, tone: own ? "predict" : i % 3 === 0 ? "bridge" : "muted", hl: own || s === 2 });
      }
      if (s >= 1) c.text(8, 160, "each stream: keys + values per layer, per past position", { size: 12, tone: "muted" });
      if (s >= 3) { c.chips({ x: 8, y: 180, items: mine.map((m) => ({ t: `page ${m}`, tone: "predict", hl: true })), size: 14 }); c.text(260, 198, "block table of our seat", { size: 13, tone: "predict", weight: 700 }); }
      if (s >= 4) {
        c.box({ x: 8, y: 230, w: 624, h: 30, tone: "muted" });
        c.box({ x: 8, y: 230, w: 624 * 133 / 768, h: 30, tone: "code", hl: s === 4 });
        c.text(8 + 624 * 133 / 768 + 8, 251, "133 of 768 positions: 78 prompt + 55 frames", { size: 12, tone: "code" });
      }
      if (s >= 5) c.box({ x: 8, y: 280, w: 624, h: 44, label: "seat_len 768 = 3 pages · prompt + frames must fit", size: 14, tone: "take", hl: true });
    };
  };

  D["buckets"] = (fig, k) => {
    const n = k.slider({ label: "live streams", min: 1, max: 120, step: 1, value: 37 });
    const c = k.canvas(W, H);
    const BK = [1, 2, 4, 8, 16, 32, 48, 64, 80, 96, 112, 128];
    return (s) => {
      c.clear();
      const L = n.value, b = BK.find((x) => x >= L);
      c.chips({ x: 8, y: 14, items: BK.map((x) => ({ t: String(x), tone: x === b && s >= 2 ? "predict" : "muted", hl: x === b && s >= 2 })), size: 13 });
      c.text(8, 66, "captured batch sizes (buckets)", { size: 12, tone: "muted" });
      const cols = 16, cw = 38, ch = 18;
      for (let i = 0; i < b; i++) {
        const x = 8 + (i % cols) * cw, y = 86 + Math.floor(i / cols) * (ch + 4), live = i < L;
        if (s >= 3 || live) c.box({ x, y, w: cw - 4, h: ch, tone: live ? "code" : "bad", dashed: !live, r: 3, hl: !live && s === 5 });
      }
      if (s >= 3) c.text(8, 296, `${L} live → ${b}-row graph: ${b - L} padded rows (${(100 * (b - L) / b).toFixed(0)}%)`, { size: 14, weight: 700, tone: "predict" });
      if (s >= 4) c.text(8, 320, "engine average: 0.7–3% of rows are padding", { size: 13, tone: "code" });
      if (s >= 5) c.text(8, 344, "padded rows still run → they point at a scratch seat", { size: 13, tone: "bad", weight: 700 });
    };
  };

  D["cuda-streams"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const X = (ms) => 120 + ms * 9;
      c.text(110, 62, "default", { size: 12, anchor: "end", weight: 700 });
      c.text(110, 132, "side", { size: 12, anchor: "end", weight: 700 });
      [0, 1].forEach((i) => c.box({ x: X(i * 26), y: 40, w: 24 * 9, h: 36, label: `LM step ${i + 1}`, size: 13, tone: "take", hl: s === 1 }));
      if (s >= 2) c.box({ x: X(26), y: 110, w: 20 * 9, h: 36, label: "decode step-1 chunks", size: 12, tone: "bridge", hl: s === 2 || s === 3 });
      if (s >= 3) c.text(X(26), 172, "runs while LM step 2 runs", { size: 13, tone: "bridge", weight: 700 });
      if (s >= 4) {
        c.text(110, 222, "priority −1", { size: 12, anchor: "end", weight: 700, tone: "predict" });
        c.box({ x: X(30), y: 200, w: 8 * 9, h: 36, label: "frame 0", size: 12, tone: "predict", hl: s === 4 });
      }
      if (s >= 5) c.box({ x: 120, y: 270, w: 500, h: 44, label: "each graph owner: own memory pool + capture stream", size: 13, tone: "code", hl: true });
    };
  };

  D["pinned"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const g = c.box({ x: 8, y: 20, w: 360, h: 220, tone: "take", label: "", hl: s === 4 });
      c.text(20, 42, "GPU: all per-seat state", { size: 13, weight: 700, tone: "take", inBox: true });
      ["positions", "text queues", "penalty masks", "codes", "KV pages", "decoder state"].forEach((t, i) =>
        c.box({ x: 24 + (i % 2) * 170, y: 56 + Math.floor(i / 2) * 56, w: 160, h: 44, label: t, size: 13, tone: "muted", hl: s === 4 }));
      const host = c.box({ x: 440, y: 60, w: 192, h: 80, label: "host (CPU)", sub: "pinned buffer", tone: "paper", hl: s === 3 });
      if (s >= 1) c.text(440, 172, "every read can stall the CPU", { size: 12, tone: "bad" });
      if (s >= 2) { c.arrow(370, 100, 438, 100, { tone: "predict", width: 2.5, snap: false }); c.label(404, 80, "code 0 × B", { size: 13, tone: "predict", weight: 700 }); }
      if (s >= 3) c.text(440, 196, "non_blocking copy", { size: 12, tone: "paper", weight: 700 });
      if (s >= 5) c.box({ x: 8, y: 270, w: 624, h: 50, label: "PCM chunks → pinned buffers, once per decoded chunk", size: 14, tone: "bridge", hl: true });
    };
  };

  D["bandwidth"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      V.tbars(c, [["80 positions of context", 6.8, s === 2, false], ["420 positions of context", 15.7, s === 2, false]], { y: 40, h: 100, labelW: 200, tone: "take", fmt: (v) => `${v} ms`, max: 18 });
      c.text(632, 24, "talker step, 0.6B, 400 live", { size: 12, anchor: "end", weight: 700 });
      if (s === 1) c.box({ x: 8, y: 170, w: 624, h: 44, label: "each step re-reads every stream's keys and values", size: 14, tone: "muted", hl: true });
      if (s >= 3) {
        c.box({ x: 8, y: 170, w: 624, h: 44, tone: "muted" });
        c.box({ x: 8, y: 170, w: 624 * 0.86, h: 44, label: "15.7 GB per step = 86% of memory bandwidth", size: 14, tone: "bad", hl: s === 3 });
      }
      if (s >= 4) c.box({ x: 8, y: 232, w: 624, h: 44, label: "better attention kernel: about 1 ms to gain", size: 14, tone: "predict", hl: s === 4 });
      if (s >= 5) c.box({ x: 8, y: 294, w: 624, h: 44, label: "longer reference clip → more bytes read every frame", size: 14, tone: "take", hl: true });
    };
  };
})();
