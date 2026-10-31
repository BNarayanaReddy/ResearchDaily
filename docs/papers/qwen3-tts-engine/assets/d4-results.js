/* Drawings: "Does it work?". All numbers from the README tables unless marked Q3 (Qwen3-TTS report). */
(function () {
  const D = RD.drawings, V = RD.vox, W = V.W, H = V.H;

  D["ladder"] = (fig, k) => {
    const T = k.toggle({ label: "part", options: ["language model", "decoder"], value: "language model" });
    k.follow(T, { 1: "language model", 4: "decoder", 5: "language model" });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      if (T.value === "language model") {
        const rows = [["upstream generate()", 181], ["own frame loop", 32.6], ["+ compile + graph", 26.1], ["+ predictor copy fix", 17.8]];
        const hl = { 1: [1], 2: [2], 3: [3], 5: [0, 3] }[s] || [];
        V.tbars(c, rows.map(([l, v], i) => [l, v, hl.includes(i), hl.length && !hl.includes(i)]), { y: 36, h: 230, labelW: 180, tone: "take", fmt: (v) => `${v} ms`, max: 190 });
        c.text(632, 22, "ms per frame, 0.6B, 256 live", { size: 12, anchor: "end", weight: 700 });
      } else {
        const rows = [["CUDA graph only", 119.0], ["compiled", 56.0], ["channels-last", 45.8], ["in-place ring", 44.5]];
        V.tbars(c, rows.map(([l, v], i) => [l, v, i === 3, false]), { y: 36, h: 230, labelW: 180, tone: "bridge", fmt: (v) => `${v} ms`, max: 125 });
        c.text(632, 22, "decoder ms per call, 256 streams × 4 frames", { size: 12, anchor: "end", weight: 700 });
      }
      if (s >= 5) c.box({ x: 8, y: 294, w: 624, h: 44, label: "every change: exact maths or rounding-level", size: 14, tone: "code", hl: true });
    };
  };

  D["step-scaling"] = (fig, k) => {
    const T = k.toggle({ label: "measured", options: ["LM only", "whole engine"], value: "LM only" });
    k.follow(T, { 1: "LM only", 4: "whole engine" });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const lm = T.value === "LM only";
      const ser = lm ? [
        { x: [128, 256, 400, 512, 1024], y: [13.4, 17.8, 25.2, 27.9, 48.5], tone: "take", dots: true, label: "0.6B short", hl: s === 2 },
        { x: [256, 400, 512], y: [23.5, 34.1, 39.5], tone: "predict", dots: true, label: "0.6B ctx 420", dim: s < 3 },
        { x: [128, 256, 384, 512], y: [15.2, 20.5, 27.0, 33.2], tone: "paper", dots: true, label: "1.7B short", dim: s < 5 }]
        : [{ x: [128, 256, 400, 512], y: [22.0, 32.3, 48.1, 54.6], tone: "take", dots: true, label: "0.6B", hl: s === 4 },
           { x: [128, 192, 256, 300], y: [23.5, 31.6, 34.6, 43.5], tone: "paper", dots: true, label: "1.7B", dim: s < 5 }];
      const p = c.plot({ series: ser, xmin: 0, xmax: 1100, ymin: 0, ymax: 90, xlabel: "live streams", ylabel: "ms per step", xFmt: (v) => v.toFixed(0), yFmt: (v) => v.toFixed(0) });
      c.path(`M${p.X(0)},${p.Y(80)} L${p.X(1100)},${p.Y(80)}`, { tone: "bad", dash: true });
      c.label(p.X(900), p.Y(84), "80 ms = real time", { size: 12, tone: "bad", weight: 700 });
    };
  };

  D["knee"] = (fig, k) => {
    const m = k.toggle({ label: "metric", options: ["TTFA p99", "RTF p50"], value: "TTFA p99" });
    k.follow(m, { 1: "TTFA p99", 3: "RTF p50", 4: "TTFA p99" });
    const c = k.canvas(W, H);
    const A = { x: [400, 512, 640, 768], t: [64.0, 86.6, 131.4, 168.5], r: [0.326, 0.442, 0.718, 1.038] };
    const B = { x: [256, 320, 384, 448, 512, 576, 640], t: [49.8, 54.9, 67.4, 78.0, 102.9, 124.5, 173.3], r: [0.26, 0.289, 0.348, 0.439, 0.607, 0.7, 0.886] };
    return (s) => {
      c.clear();
      const t = m.value === "TTFA p99";
      const p = c.plot({ series: [{ x: A.x, y: t ? A.t : A.r, tone: "take", dots: true, label: "0.6B", dim: s === 4 }, { x: B.x, y: t ? B.t : B.r, tone: "paper", dots: true, label: "1.7B", dim: s < 4 }],
        xmin: 200, xmax: 800, ymin: 0, ymax: t ? 180 : 1.2, xlabel: "offered streams (90 s sweeps)", ylabel: t ? "TTFA p99 (ms)" : "RTF p50", xFmt: (v) => v.toFixed(0), yFmt: (v) => (t ? v.toFixed(0) : v.toFixed(1)) });
      const lim = t ? 100 : 1; c.path(`M${p.X(200)},${p.Y(lim)} L${p.X(800)},${p.Y(lim)}`, { tone: "bad", dash: true });
      const at = { 1: [400, A], 2: [640, A], 3: [768, A], 4: [512, B], 5: [640, A] }[s];
      const i = at[1].x.indexOf(at[0]); const v = t ? at[1].t[i] : at[1].r[i];
      c.dot(p.X(at[0]), p.Y(v), { r: 8, tone: "predict" });
      c.label(p.X(at[0]) - 10, p.Y(v) - 18, s === 3 ? "768: RTF 1.04, 223 rejected" : `${at[0]}: ${t ? v + " ms" : v}`, { size: 13, tone: "predict", weight: 700, anchor: "end" });
    };
  };

  D["validation"] = (fig, k) => {
    const M = k.toggle({ label: "model", options: ["0.6B", "1.7B"], value: "0.6B" });
    k.follow(M, { 1: "0.6B", 2: "1.7B", 4: "0.6B" });
    const c = k.canvas(W, H);
    const T = { "0.6B": [[400, 42.8, 59.4, 64.7, 0.396], [512, 53.8, 71.5, 78.2, 0.532], [576, 70.4, 92.9, 98.2, 0.62]],
                "1.7B": [[256, 34.7, 45.8, 50.0, 0.281], [448, 56.1, 73.3, 77.3, 0.49], [480, 59.8, 78.2, 82.5, 0.513]] };
    return (s) => {
      c.clear();
      const rows = T[M.value];
      c.bars({ x: 8, y: 34, w: 624, rowH: 62, labelW: 130, tones: ["code", "predict", "bad"], max: 110, fmt: (v) => `${v} ms`,
        rows: rows.map((r, i) => ({ label: `${r[0]} offered`, values: [r[1], r[2], r[3]], hl: i === 2, dim: s >= 3 && i !== 2 })) });
      c.text(632, 22, `${M.value}: TTFA p50 / p95 / p99, 300 s windows`, { size: 12, anchor: "end", weight: 700 });
      const top = rows[2];
      c.box({ x: 8, y: 240, w: 624, h: 40, label: `${top[0]} offered: TTFA p99 ${top[3]} ms · RTF p99 ${top[4]}`, mono: true, size: 14, tone: "code", hl: s <= 2 });
      if (s >= 3) c.box({ x: 8, y: 292, w: 300, h: 40, label: "0 rejected · 0 unfinished", size: 13, tone: "code", hl: s === 3 });
      if (s >= 4) c.box({ x: 324, y: 292, w: 308, h: 40, label: "one voice · ~25 s English", size: 13, tone: "predict", hl: s === 4 });
      if (s >= 5) c.text(8, 352, "upstream: 181 ms per 80 ms frame, under one stream in real time", { size: 12, tone: "bad", weight: 700 });
    };
  };

  D["arrival-fix"] = (fig, k) => {
    const m = k.toggle({ label: "metric", options: ["TTFA p99", "RTF p50", "step"], value: "TTFA p99" });
    k.follow(m, { 1: "TTFA p99", 2: "RTF p50", 3: "step", 4: "TTFA p99" });
    const c = k.canvas(W, H);
    const T = { "TTFA p99": [[109.8, 64.7], [99.1, 50.0]], "RTF p50": [[0.539, 0.344], [0.355, 0.253]], step: [[42.3, 26.5], [27.8, 19.9]] };
    return (s) => {
      c.clear();
      const v = T[m.value];
      c.bars({ x: 8, y: 40, w: 624, rowH: 80, labelW: 130, tones: ["bad", "code"], max: m.value === "RTF p50" ? 0.6 : 120, fmt: (x) => (x < 1 ? x.toFixed(3) : `${x} ms`),
        rows: [{ label: "0.6B @ 400", values: v[0], hl: s <= 3, dim: s === 4 }, { label: "1.7B @ 256", values: v[1], hl: s === 4, dim: s < 4 && s > 0 && false }] });
      c.text(632, 24, `${m.value}: uncompiled prefill (red) vs graphed admission (green)`, { size: 12, anchor: "end", weight: 700 });
      if (s >= 5) c.box({ x: 8, y: 230, w: 624, h: 50, label: "GPU per arrival: 23 ms → 4.7 ms", size: 15, tone: "code", hl: true });
    };
  };

  D["stage-split"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      V.tbars(c, [["language model", 29.7, s === 1, s > 3], ["decoder", 21.9, s === 2, s > 3 && s !== 4], ["admission", 3.9, s === 3, s > 3], ["wall step", 36.2, false, s < 4 ? false : true]],
        { y: 30, h: 190, labelW: 150, tone: "predict", fmt: (v) => `${v} ms`, max: 40 });
      c.text(632, 18, "0.6B, 512 offered, per step (stages overlap)", { size: 12, anchor: "end", weight: 700 });
      if (s >= 4) {
        c.box({ x: 8, y: 240, w: 624, h: 36, tone: "muted" });
        c.box({ x: 8, y: 240, w: 624 * 0.68, h: 36, label: "real decoded rows 68%", size: 13, tone: "bridge" });
        c.box({ x: 8 + 624 * 0.68, y: 240, w: 624 * 0.32, h: 36, label: "padding 32%", size: 13, tone: "bad", hl: true });
      }
      if (s >= 5) c.box({ x: 8, y: 294, w: 624, h: 40, label: "finer decoder buckets (dec_fine) exist; not validated", size: 13, tone: "take", hl: true });
    };
  };

  D["quality-gate"] = (fig, k) => {
    const m = k.toggle({ label: "metric", options: ["WER all (%)", "SIM to voice"], value: "WER all (%)" });
    k.follow(m, { 1: "WER all (%)", 3: "SIM to voice", 4: "WER all (%)" });
    const c = k.canvas(W, H);
    const T = [["stock 0.6B s1000", 5.7, 0.937], ["stock 0.6B s2000", 7.3, 0.930], ["engine 0.6B", 6.1, 0.932], ["stock 1.7B s1000", 4.9, 0.930], ["stock 1.7B s2000", 5.1, 0.928], ["engine 1.7B", 5.7, 0.929]];
    return (s) => {
      c.clear();
      const j = m.value.startsWith("WER") ? 1 : 2;
      const hl = { 1: [], 2: [0, 1], 3: [2], 4: [3, 4, 5], 5: [5] }[s];
      V.tbars(c, T.map((r, i) => [r[0], r[j], hl.includes(i), hl.length > 0 && !hl.includes(i)]), { y: 30, h: 250, labelW: 170, tone: j === 1 ? "paper" : "take", fmt: (v) => (j === 1 ? `${v}%` : v.toFixed(3)), max: j === 1 ? 8 : 1 });
      c.text(632, 18, `${m.value} · 32 gate sentences`, { size: 12, anchor: "end", weight: 700 });
      if (s >= 4) c.box({ x: 8, y: 296, w: 624, h: 40, label: "1.7B German: 5.8% vs 0–1.9% stock (4 sentences, one seed)", size: 13, tone: "predict", hl: s === 4 });
    };
  };

  D["vs-paper"] = (fig, k) => {
    const M = k.toggle({ label: "Qwen model", options: ["0.6B", "1.7B"], value: "0.6B" });
    k.follow(M, { 1: "0.6B" });
    const c = k.canvas(W, H);
    const Q = { "0.6B": [97, 179, 299], "1.7B": [101, 195, 333] }; // Table 2 Q3
    return (s) => {
      c.clear();
      const p = c.plot({ series: [{ x: [1, 3, 6], y: Q[M.value], tone: "paper", dots: true, label: `Qwen ${M.value} (vLLM V0)`, dim: s === 1 }], xlog: true, xmin: 1, xmax: 1000, ymin: 0, ymax: 350,
        xlabel: "concurrent requests (log)", ylabel: "first audio (ms)", xFmt: (v) => v.toFixed(0), yFmt: (v) => v.toFixed(0) });
      if (s === 1) c.label(p.X(10), p.Y(300), "Qwen tested 1, 3, 6 at once", { size: 13, tone: "paper", weight: 700 });
      if (s === 3) c.label(p.X(20), p.Y(250), "their packet: 4 frames = 320 ms", { size: 13, tone: "muted", weight: 700 });
      if (s >= 4) { c.dot(p.X(335), p.Y(98.2), { r: 8, tone: "code" }); c.label(p.X(335), p.Y(150), "engine 0.6B: p99 98 ms, ~335 live", { size: 13, tone: "code", weight: 700, anchor: "end" }); }
      if (s >= 5) c.box({ x: 380, y: 40, w: 240, h: 40, label: "different hardware, packets, metrics", size: 12, tone: "bad", hl: true });
    };
  };
})();
