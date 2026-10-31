/* Drawings: "The engine". */
(function () {
  const D = RD.drawings, V = RD.vox, W = V.W, H = V.H;
  const range = (c, X, y, a, b, tone, label, hl) => { c.box({ x: X(a), y, w: Math.max(6, X(b) - X(a)), h: 34, tone, hl }); c.text(X(b) + 8, y + 22, label, { size: 13, mono: true, weight: 700, tone }); };

  D["engine-whole"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const b = V.chain(c, [
        ["admit", "≤ 8 new", "paper", s === 2],
        ["frame graph", "all live seats", "take", s === 3],
        ["decode", "side stream", "bridge", s === 4],
        ["events", "audio / done", "code", s === 5],
      ], { y: 60, h: 76, size: 15 });
      c.path(`M${b[3].bx.cx},${b[3].bx.b + 4} V200 H${b[0].bx.cx} V${b[0].bx.b + 6}`, { tone: "muted", arrow: true });
      c.text(320, 222, "step() again, one engine thread", { size: 13, anchor: "middle", weight: 700, tone: s === 1 ? "predict" : "muted" });
      if (s >= 6) {
        for (let i = 0; i < 55; i++) c.add(k.h("rect", { x: 20 + i * 10.9, y: 260, width: 9, height: 30, rx: 2, class: "f-paper" }));
        c.text(20, 320, "our request: about 55 steps, one per frame", { size: 14, weight: 700, tone: "paper" });
      }
    };
  };

  D["seats"] = (fig, k) => {
    const c = k.canvas(W, H);
    const r = V.rng(4), live = Array.from({ length: 704 }, () => r() < 0.48);
    return (s) => {
      c.clear();
      const ours = 300;
      for (let i = 0; i < 704; i++) {
        const x = 10 + (i % 44) * 9, y = 14 + Math.floor(i / 44) * 13;
        const tone = i === ours && s >= 4 ? "predict" : live[i] ? "code" : "muted";
        c.add(k.h("rect", { x, y, width: 7, height: 10, rx: 1.5, class: `f-${tone}${i === ours && s >= 4 ? "" : " soft"}` }));
      }
      c.text(10, 232, "704 seats (0.6B) · green = live", { size: 12, tone: "muted" });
      const parts = [["KV cache", "768 positions · 3 pages", "take", 2], ["text queue", "trailing text", "paper", 3], ["penalty mask", "codes used", "predict", 3], ["decoder slot", "3 MiB state", "bridge", 3]];
      parts.forEach(([l, sub, tone, at], i) => { if (s >= at) c.box({ x: 420, y: 14 + i * 56, w: 212, h: 48, label: l, sub, tone, hl: s === at }); });
      if (s >= 5) c.box({ x: 10, y: 250, w: 400, h: 40, label: "freed when the last PCM reaches the host", size: 13, tone: "code", hl: s === 5 });
      if (s >= 6) c.box({ x: 10, y: 302, w: 400, h: 40, label: "all full → add_request returns False", size: 13, tone: "bad", hl: true });
    };
  };

  D["kv-memory"] = (fig, k) => {
    const S = k.slider({ label: "seats", min: 64, max: 1024, step: 16, value: 704 });
    const L = k.toggle({ label: "seat_len", options: ["256", "512", "768", "1024"], value: "768" });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const perPos = 28 * 2 * 8 * 128 * 2, len = +L.value, perSeat = perPos * len, kv = perSeat * (S.value + 1) / 2 ** 30;
      c.box({ x: 8, y: 14, w: 624, h: 44, label: `28 layers × K,V × 8 heads × 128 × 2 B = ${(perPos / 1024).toFixed(0)} KiB per position`, mono: true, size: 13, tone: "paper", hl: s === 1 });
      if (s >= 2) c.box({ x: 8, y: 70, w: 624, h: 44, label: `× ${len} positions = ${(perSeat / 2 ** 20).toFixed(0)} MiB per seat`, mono: true, size: 14, tone: "take", hl: s === 2 });
      if (s >= 3) {
        const X = (gb) => 20 + gb * 7.5;
        c.box({ x: X(0), y: 150, w: X(80) - X(0), h: 50, tone: "muted" });
        const kvw = Math.min(X(80), X(kv)) - X(0);
        c.box({ x: X(0), y: 150, w: Math.max(8, kvw), h: 50, label: kvw > 120 ? `KV ${kv.toFixed(1)} GiB` : "", size: 14, tone: kv > 69 ? "bad" : "take", hl: s === 3 });
        c.text(X(80), 222, "80 GB card", { size: 12, anchor: "end", tone: "muted" });
        c.text(20, 222, `${S.value} seats + 1 scratch`, { size: 12, tone: "take" });
      }
      if (s >= 4) c.box({ x: 8, y: 244, w: 624, h: 40, label: "README, 704 seats: 68.9 GB total, of which KV 57.8 GB", size: 13, tone: "code", hl: s === 4 });
      if (s >= 5) c.box({ x: 8, y: 296, w: 624, h: 40, label: "the cache, not the 0.6B weights, fills the card", size: 13, tone: "predict", hl: true });
    };
  };

  D["frame-graph"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      c.box({ x: 150, y: 8, w: 482, h: 344, tone: "muted", dashed: true });
      c.text(160, 28, "one CUDA graph per bucket", { size: 12, tone: "muted", inBox: true });
      const inp = c.box({ x: 8, y: 150, w: 120, h: 56, label: "seat list", sub: "only host input", tone: "paper", hl: s === 1 });
      const st = [["talker: 28 layers, 1 token / seat", "take", 2], ["code 0: penalty, suppress, top-k sample", "predict", 3], ["15 predictor steps + sampling", "predict", 4], ["next input → seat (Σ16 + text)", "code", 5]];
      let prev = inp;
      st.forEach(([l, tone, at], i) => {
        const b = c.box({ x: 180, y: 44 + i * 74, w: 430, h: 54, label: l, size: 13, tone, hl: s === at || s === 6, dim: s < at });
        c.connect(prev, b, { route: i === 0 ? "elbow" : undefined, dim: s < at });
        prev = b;
      });
      if (s >= 6) c.text(8, 260, "replay()", { size: 16, weight: 700, mono: true, tone: "code" });
    };
  };

  D["scratch-seat"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      for (let i = 0; i < 48; i++) {
        const x = 10 + (i % 16) * 38, y = 20 + Math.floor(i / 16) * 30, live = i < 37;
        c.box({ x, y, w: 32, h: 24, tone: live ? "code" : "bad", dashed: !live, r: 3, hl: !live && s === 2 });
      }
      c.text(10, 126, "37 live rows + 11 padded rows in the 48-row graph", { size: 13, weight: 700 });
      if (s >= 2) c.box({ x: 400, y: 140, w: 232, h: 50, label: "scratch seat (index n_seats)", size: 12, tone: "bad", hl: s === 2 });
      if (s >= 3) {
        const pos = s === 3 ? 410 : s === 4 ? 768 : 0;
        c.box({ x: 10, y: 210, w: 600, h: 34, tone: "muted" });
        c.box({ x: 10, y: 210, w: Math.max(10, 600 * pos / 768), h: 34, tone: pos >= 768 ? "bad" : "predict", hl: true });
        c.text(10, 268, `scratch seat position: ${pos} / 768`, { size: 14, mono: true, weight: 700, tone: pos >= 768 ? "bad" : "predict" });
      }
      if (s === 4) c.box({ x: 10, y: 290, w: 600, h: 44, label: "device-side assert in the first long run", size: 14, tone: "bad", hl: true });
      if (s >= 5) c.box({ x: 10, y: 290, w: 600, h: 44, label: "fix: reset the scratch seat to 0 on every replay", size: 14, tone: "code", hl: true });
    };
  };

  D["rng-graph"] = (fig, k) => {
    const c = k.canvas(W, H);
    const r = V.rng(23), draws = Array.from({ length: 10 }, () => 1 + Math.floor(r() * 2047));
    return (s) => {
      c.clear();
      c.text(8, 24, "code 0 drawn on 10 replays", { size: 13, weight: 700 });
      const same = s === 2;
      for (let i = 0; i < 10; i++) c.box({ x: 8 + i * 62, y: 40, w: 56, h: 50, label: s >= 2 ? String(same ? draws[0] : draws[i]) : "?", mono: true, size: 13, tone: same ? "bad" : s >= 3 ? "code" : "muted", hl: s === 2 || s === 4 });
      if (s === 1) c.box({ x: 8, y: 120, w: 624, h: 44, label: "a graph freezes inputs: including the RNG state", size: 14, tone: "muted", hl: true });
      if (s === 2) c.box({ x: 8, y: 120, w: 624, h: 44, label: "without registration: every replay, same sample", size: 14, tone: "bad", hl: true });
      if (s >= 3) c.box({ x: 8, y: 120, w: 624, h: 44, label: "g.register_generator_state(gen) → fresh draws", mono: true, size: 14, tone: "code", hl: s === 3 });
      if (s >= 4) c.box({ x: 8, y: 180, w: 624, h: 44, label: "1,999 distinct draws in 2,000 replays", size: 14, tone: "code", hl: s === 4 });
      if (s >= 5) c.box({ x: 8, y: 240, w: 624, h: 44, label: "one random stream for the engine: per-request seed ignored", size: 14, tone: "predict", hl: true });
    };
  };

  D["cp-copy"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const X = (ms) => 140 + ms * 13;
      c.text(130, 64, "before", { size: 13, anchor: "end", weight: 700 });
      c.box({ x: X(0), y: 40, w: 35.1 * 13, h: 44, label: s >= 3 ? "" : "predictor kernels: 35.1 ms", size: 13, tone: "predict", hl: s <= 2 });
      if (s >= 3) { c.box({ x: X(0), y: 40, w: 18.1 * 13, h: 44, label: "maths", size: 13, tone: "predict" }); c.box({ x: X(18.1), y: 40, w: 17 * 13, h: 44, label: "copying: 17 ms", size: 13, tone: "bad", hl: s === 3 }); }
      if (s === 1) c.text(140, 120, "16-slot cache per stream, per layer, for one frame", { size: 13, tone: "muted" });
      if (s === 2) c.text(140, 120, "one in-place write → compiler copies the whole buffer", { size: 13, tone: "bad", weight: 700 });
      if (s >= 4) {
        c.chips({ x: 140, y: 110, items: [{ t: "compiled pre", tone: "predict" }, { t: "index_copy_ (plain)", tone: "code", hl: true }, { t: "compiled post", tone: "predict" }], size: 13 });
        c.text(130, 126, "fix", { size: 13, anchor: "end", weight: 700 });
      }
      if (s >= 5) { c.text(130, 236, "after", { size: 13, anchor: "end", weight: 700 }); c.box({ x: X(0), y: 210, w: 19.6 * 13, h: 44, label: "19.6 ms", size: 14, tone: "code", hl: true }); c.text(140, 290, "at 400 live streams, same maths", { size: 13, tone: "code" }); }
    };
  };

  D["decoder-state"] = (fig, k) => {
    const c = k.canvas(W, H);
    const rows = [["first conv", "last 2 frames", "paper", 1], ["8 transformer layers", "71 past frames each (ring of 88)", "take", 2], ["convolutions", "last 6 samples × dilation", "bridge", 3]];
    return (s) => {
      c.clear();
      c.text(8, 22, "what one seat keeps between decoder calls", { size: 13, weight: 700 });
      rows.forEach(([a, b, tone, at], i) => { if (s >= at) c.box({ x: 8, y: 36 + i * 64, w: 624, h: 52, label: `${a}: ${b}`, size: 14, tone, hl: s === at }); });
      if (s >= 4) c.box({ x: 8, y: 232, w: 300, h: 50, label: "≈ 3 MiB per seat", size: 15, tone: "predict", hl: s === 4 });
      if (s >= 5) c.box({ x: 324, y: 232, w: 308, h: 50, label: "n new frames cost n frames", size: 14, tone: "code", hl: true });
    };
  };

  D["rewindow"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const X = (db) => 190 + db * 5.4;
      [0, 20, 40, 60].forEach((d) => { c.line(X(d), 30, X(d), 250, { tone: "faint", width: 0.6 }); c.text(X(d), 270, `${d} dB`, { size: 11, anchor: "middle", tone: "muted" }); });
      c.text(180, 58, "upstream chunked", { size: 12, anchor: "end", tone: s >= 2 ? "ink" : "muted" });
      c.text(180, 118, "window 25–144", { size: 12, anchor: "end", tone: s >= 3 ? "ink" : "muted" });
      c.text(180, 178, "cached state", { size: 12, anchor: "end", tone: s >= 5 ? "ink" : "muted" });
      if (s === 1) c.box({ x: 190, y: 290, w: 440, h: 44, label: "decode new + old frames, drop the old audio", size: 13, tone: "muted", hl: true });
      if (s >= 2) range(c, X, 40, 0, 12.8, "bad", "12.8", s === 2);
      if (s >= 3) range(c, X, 100, 5, 64, "predict", "5–64 dB", s === 3);
      if (s === 4) c.box({ x: 190, y: 290, w: 440, h: 44, label: "8 layers × 71 frames = 568 frames of reach", size: 13, tone: "take", hl: true });
      if (s >= 5) range(c, X, 160, 47, 52, "code", "47–52", true);
      c.text(630, 20, "SNR vs one-shot fp32 decode · higher = closer", { size: 12, anchor: "end", weight: 700 });
    };
  };

  D["precision"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const X = (db) => 150 + db * 6.4;
      [0, 20, 40, 60].forEach((d) => { c.line(X(d), 30, X(d), 220, { tone: "faint", width: 0.6 }); c.text(X(d), 240, `${d} dB`, { size: 11, anchor: "middle", tone: "muted" }); });
      [["bf16 (upstream)", 27, 31, "bad", 1], ["fp16 (engine)", 47, 52, "code", 2], ["fp32", 57, 61, "paper", 3]].forEach(([n, a, b, tone, at], i) => {
        c.text(140, 64 + i * 60, n, { size: 13, anchor: "end", tone: s >= at ? "ink" : "muted" });
        if (s >= at) range(c, X, 46 + i * 60, a, b, tone, `${a}–${b}`, s === at);
      });
      if (s >= 4) c.box({ x: 20, y: 262, w: 600, h: 34, label: "language model stays bf16, like upstream", size: 13, tone: "take", hl: s === 4 });
      if (s >= 5) c.box({ x: 20, y: 306, w: 600, h: 34, label: "fp16 beats bf16 by about 20 dB here", size: 13, tone: "code", hl: true });
      c.text(630, 20, "decoder SNR vs fp32 one-shot", { size: 12, anchor: "end", weight: 700 });
    };
  };

  D["ramp"] = (fig, k) => {
    const n = k.toggle({ label: "frames per call", options: ["1", "2", "4", "8"], value: "1" });
    k.follow(n, { 1: "1", 2: "4", 3: "1", 4: "1", 5: "4" });
    const c = k.canvas(W, H);
    const cost = { "1": 14.1, "2": 24.5, "4": 44.5, "8": 83.7 }; // README Results, 256 streams
    return (s) => {
      c.clear();
      const X = (f) => 30 + f * 34;
      c.text(30, 24, "frames of one stream →", { size: 12, tone: "muted" });
      const ch = [1, 2, 4, 4, 4];
      let f = 0;
      ch.forEach((m, i) => { c.box({ x: X(f), y: 36, w: m * 34 - 4, h: 40, label: `${m}`, size: 13, tone: i === 0 ? "predict" : i === 1 ? "paper" : "code", hl: (s === 1 && i === 0) || (s === 2 && i > 0) }); f += m; });
      c.text(30, 102, "ramp 1 / 2 / 4", { size: 13, weight: 700 });
      const nn = n.value, per = cost[nn] / +nn;
      V.tbars(c, ["1", "2", "4", "8"].map((m) => [`${m}-frame call`, +(cost[m] / +m).toFixed(1), m === nn, m !== nn]), { y: 130, h: 132, labelW: 120, tone: "bridge", fmt: (v) => `${v} ms/frame`, max: 16 });
      c.text(632, 120, `256 streams × ${nn} frames: ${cost[nn]} ms per call`, { size: 12, anchor: "end", weight: 700, tone: "bridge" });
      if (s === 4) c.box({ x: 30, y: 280, w: 600, h: 44, label: "first packets: decoded and awaited inside the step", size: 13, tone: "predict", hl: true });
      if (s === 5) c.box({ x: 30, y: 280, w: 600, h: 44, label: "steady chunks: collected one step later", size: 13, tone: "code", hl: true });
      if (s <= 3) c.text(30, 300, `per frame: ${per.toFixed(1)} ms`, { size: 14, mono: true, weight: 700, tone: "bridge" });
    };
  };

  D["overlap"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const X = (ms) => 130 + ms * 8.6;
      c.text(120, 62, "default", { size: 12, anchor: "end", weight: 700 });
      c.text(120, 132, "side", { size: 12, anchor: "end", weight: 700 });
      c.box({ x: X(0), y: 40, w: 29.7 * 8.6, h: 40, label: "LM 29.7 ms", size: 13, tone: "take", hl: s === 1 || s === 3 });
      if (s >= 2) c.box({ x: X(2), y: 110, w: 21.9 * 8.6, h: 40, label: "decode (step k−1)", size: 12, tone: "bridge", hl: s === 2 || s === 3 });
      if (s >= 2) c.text(X(2), 176, "launched last step, collected now", { size: 12, tone: "bridge" });
      if (s >= 4) { c.path(`M${X(36.2)},26 L${X(36.2)},200`, { tone: "predict", dash: true, width: 2 }); c.text(X(36.2), 218, "wall step 36.2 ms", { size: 13, anchor: "middle", weight: 700, tone: "predict" }); c.text(X(0), 250, "sum of stages 51.6 ms", { size: 13, tone: "muted" }); }
      if (s >= 5) c.box({ x: 130, y: 280, w: 490, h: 44, label: "LM alone ≈ 25 ms: contention costs ≈ 5 ms", size: 13, tone: "bad", hl: true });
    };
  };

  D["voice-snapshot"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      if (s <= 2) {
        c.chips({ x: 8, y: 30, items: [{ t: "reference codes", tone: "muted", hl: s === 1 }, { t: "generated codes", tone: "code", hl: true }], size: 14, h: 36 });
        c.text(8, 100, s === 1 ? "upstream: decode both, cut the reference audio off" : "skip the reference → no history → noisy start", { size: 13, weight: 700, tone: s === 1 ? "muted" : "bad" });
      }
      if (s >= 3) V.tbars(c, [["not primed", 11, false, false], ["primed", 48, true, false]], { y: 30, h: 90, labelW: 120, tone: "bridge", fmt: (v) => `${v} dB`, max: 55 });
      if (s >= 4) {
        const p = c.box({ x: 8, y: 160, w: 190, h: 56, label: "prime once", sub: "decode the reference", tone: "take", hl: s === 4 });
        const sn = c.box({ x: 222, y: 160, w: 190, h: 56, label: "snapshot", sub: "boot time", tone: "take", hl: s === 4 });
        c.connect(p, sn);
        if (s >= 5) { const r = c.box({ x: 436, y: 160, w: 196, h: 56, label: "restore", sub: "row copy at admission", tone: "code", hl: true }); c.connect(sn, r); }
      }
    };
  };

  D["admission-stall"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const X = (ms) => 30 + ms * 11;
      c.text(30, 24, "a step with an arrival, 0.6B at 400 offered (uncompiled prefill)", { size: 13, weight: 700 });
      if (s >= 2) c.box({ x: X(0), y: 40, w: 29.9 * 11, h: 50, label: "eager prefill 29.9 ms", size: 12, tone: "bad", hl: s === 2 || s === 3 });
      c.box({ x: X(s >= 2 ? 29.9 : 0), y: 40, w: 18.5 * 11, h: 50, label: "frame 18.5 ms", size: 13, tone: "take", hl: s === 4 });
      if (s === 1) c.text(30, 120, "78 positions × 28 layers per new request", { size: 13, tone: "muted" });
      if (s >= 3) c.text(30, 120, "≈ 30 ms blocked per admission: no stream advances", { size: 13, tone: "bad", weight: 700 });
      if (s >= 4) c.text(30, 146, "average step read 42 ms; the frame itself 18.5 ms", { size: 13, tone: "take", weight: 700 });
      if (s >= 5) c.box({ x: 30, y: 190, w: 580, h: 50, label: "our request's first audio: 74.2 ms (p50)", size: 15, tone: "predict", hl: true });
    };
  };

  D["prefix-reuse"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const X = (p) => 12 + p * 7.9;
      c.text(12, 24, "78 prompt positions of our request", { size: 13, weight: 700 });
      c.box({ x: X(0), y: 36, w: 35 * 7.9 - 2, h: 56, label: "35: shared", size: 13, tone: "code", hl: s === 1 || s === 2 });
      c.box({ x: X(35), y: 36, w: 42 * 7.9 - 2, h: 56, label: "42: this text", size: 13, tone: s >= 3 ? "predict" : "muted", hl: s === 3 });
      c.box({ x: X(77), y: 36, w: 7.9 - 1, h: 56, tone: "take" });
      if (s >= 2) c.box({ x: X(0), y: 110, w: 35 * 7.9 - 2, h: 44, label: "K/V computed once, copied", size: 12, tone: "code", hl: s === 2 });
      if (s >= 3) c.box({ x: X(35), y: 110, w: 42 * 7.9 - 2, h: 44, label: "graph for 1 / 2 / 4 / 8 arrivals", size: 12, tone: "predict", hl: s === 3 });
      if (s >= 4) c.box({ x: 12, y: 176, w: 616, h: 40, label: "text projection: precomputed table lookup per token id", size: 13, tone: "paper", hl: s === 4 });
      if (s >= 5) V.tbars(c, [["blocked, before", 36, false, false], ["blocked, after", 0.2, true, false]], { y: 236, h: 80, labelW: 140, tone: "code", fmt: (v) => (v < 1 ? "0.14–0.25 ms" : "31–41 ms"), max: 42 });
    };
  };

  D["last-token"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const X = (p) => 12 + p * 7.9;
      c.box({ x: X(0), y: 40, w: 77 * 7.9 - 2, h: 50, label: "77 positions prefilled into the cache", size: 13, tone: "paper", hl: s === 1 });
      c.box({ x: X(77), y: 40, w: 7.9 * 2, h: 50, tone: "predict", hl: s === 2 });
      if (s >= 2) c.label(X(79), 116, "position 78: the seat's pending input", { size: 13, tone: "predict", weight: 700, anchor: "end" });
      if (s >= 3) c.box({ x: 12, y: 150, w: 616, h: 44, label: "frame 0 comes out of the bulk graph with everyone else's frame", size: 13, tone: "take", hl: s === 3 });
      if (s >= 4) c.box({ x: 12, y: 206, w: 616, h: 40, label: "same maths as upstream: prefill, then sample", size: 13, tone: "code", hl: s === 4 });
      if (s >= 5) c.chips({ x: 12, y: 266, items: [["wait for step", "muted"], ["admit", "paper"], ["1 bulk frame", "take"], ["1-frame decode", "bridge"]].map(([t, tone]) => ({ t, tone, hl: true })), size: 13 });
      if (s >= 5) c.text(12, 324, "TTFA =", { size: 13, weight: 700 });
    };
  };

  D["ttfa-anatomy"] = (fig, k) => {
    const T = k.toggle({ label: "admission", options: ["uncompiled", "graphed"], value: "uncompiled" });
    k.follow(T, { 1: "graphed" });
    const c = k.canvas(W, H);
    const P = { uncompiled: [20.8, 1.7, 29.9, 18.5, 2.5, 74.2], graphed: [13.1, 0.0, 0.2, 24.9, 2.5, 41.9] }; // README Results, p50
    const names = ["wait for step", "prompt build", "prefill (blocked)", "bulk frame", "first decode"], tones = ["muted", "paper", "bad", "take", "bridge"];
    return (s) => {
      c.clear();
      const v = P[T.value];
      V.tbars(c, names.map((n, i) => [n, v[i], s === i + 1, s <= 5 && s !== i + 1]), { y: 30, h: 220, labelW: 150, tone: "predict", fmt: (x) => `${x.toFixed(1)} ms`, max: 32 });
      c.text(632, 18, `${T.value} admission · p50 parts, 0.6B at 400 offered`, { size: 12, anchor: "end", weight: 700 });
      c.box({ x: 8, y: 280, w: 624, h: 50, label: `total TTFA p50: ${v[5]} ms`, size: 16, mono: true, tone: T.value === "graphed" ? "code" : "bad", hl: s === 5 });
    };
  };

  D["fast-lane"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const X = (ms) => 140 + ms * 10;
      c.text(130, 62, "bulk (default)", { size: 12, anchor: "end", weight: 700 });
      c.text(130, 142, "fast lane (−1)", { size: 12, anchor: "end", weight: 700, tone: "predict" });
      c.box({ x: X(0), y: 40, w: (s >= 4 ? 34 : 26) * 10, h: 40, label: s >= 4 ? "bulk step +6–10 ms" : "bulk frame graph", size: 13, tone: s >= 4 ? "bad" : "take", hl: s === 4 });
      if (s >= 1) c.box({ x: X(4), y: 120, w: 18 * 10, h: 40, label: "prefill + frame 0", size: 12, tone: "predict", hl: s === 1 || s === 2 });
      if (s >= 2) c.text(X(4), 186, "frame 0 ready 19–26 ms after launch", { size: 13, tone: "predict", weight: 700 });
      if (s >= 3) c.text(X(4), 210, "bit-identical in 40 of 40 replays", { size: 13, tone: "code", weight: 700 });
      if (s >= 5) {
        c.box({ x: 20, y: 240, w: 290, h: 56, label: "README: not wired in", size: 13, tone: "muted" });
        c.box({ x: 330, y: 240, w: 290, h: 56, label: "engine.py: first_lane=1 (off)", sub: "_step_fl, unvalidated", tone: "predict", hl: true });
      }
    };
  };

  D["boot"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const X = (sec) => 120 + sec * 0.8;
      if (s >= 1) c.chips({ x: 20, y: 20, items: ["talker × buckets", "predictor", "admission graphs", "decoder × chunks × buckets"].map((t) => ({ t, tone: "take", hl: s === 1 })), size: 13 });
      if (s >= 2) {
        c.text(110, 112, "warm cache", { size: 12, anchor: "end" }); c.box({ x: X(0), y: 92, w: 187 * 0.8, h: 30, label: "185–190 s", size: 12, tone: "code", hl: s === 2 });
        c.text(110, 154, "cold", { size: 12, anchor: "end" }); c.box({ x: X(0), y: 134, w: 600 * 0.8 * 0.95, h: 30, label: "≈ 10 min", size: 12, tone: "bad", hl: s === 2 });
      }
      if (s >= 3) c.box({ x: 20, y: 188, w: 600, h: 36, label: "compile cache in /tmp/torchinductor_<user>: next boot 3–4× shorter", size: 12, tone: "paper", hl: s === 3 });
      if (s >= 4) c.box({ x: 20, y: 236, w: 600, h: 36, label: "decoder compile: max-autotune ~170 s/shape → default 20–45 s", size: 12, tone: "predict", hl: s === 4 });
      if (s >= 5) c.box({ x: 20, y: 286, w: 600, h: 44, label: "deploy: start new replicas before stopping old ones", size: 13, tone: "take", hl: true });
    };
  };

  D["exactness"] = (fig, k) => {
    const c = k.canvas(W, H);
    const rows = [["fp32: logits agree", "talker 4.5e-7 · predictor 6.4e-7", "code"], ["fp32: same token", "705 of 705 predictor calls", "code"], ["bf16: rounding only", "0.65–1.6% · top token 87–100%", "predict"], ["sampling", "same distribution, new draws", "take"], ["so quality is gated", "against the stock seed spread", "paper"]];
    return (s) => V.board(c, rows, s, { split: 230 });
  };
})();
