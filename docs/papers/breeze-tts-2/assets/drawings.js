/* Drawings for the Breeze TTS 2 lesson. One entry per data-draw name. Each is
   redrawn on every step and control change. Numbers from the sources carry a
   // §source comment; everything else is illustrative layout. */
(function () {
  window.RD = window.RD || {}; RD.drawings = RD.drawings || {};
  const D = RD.drawings;
  const W = 640, H = 360;
  const n0 = (v) => v.toLocaleString("en-US");
  const softmax = (xs) => { const m = Math.max(...xs); const e = xs.map((x) => Math.exp(x - m)); const s = e.reduce((a, b) => a + b, 0); return e.map((x) => x / s); };
  const rng = (seed) => { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };

  // ------------------------------------------------- toolbox: codec tokens
  D["tokens"] = (fig, k) => {
    const len = k.slider({ label: "clip length", min: 1, max: 60, step: 0.1, value: 10, fmt: (v) => `${v.toFixed(1)} s` });
    k.follow(len, { 1: 10, 4: 23.8 });
    const c = k.canvas(W, H);
    const r = rng(7), codes = Array.from({ length: 16 * 12 }, () => Math.floor(r() * 2048));
    return (s) => {
      c.clear();
      // one second of audio with 12.5 frames (§config: 1920 samples at 24 kHz)
      c.text(20, 22, "one second of audio", { size: 12, tone: "muted" });
      for (let x = 24; x < 616; x += 3) {
        const a = 4 + 16 * Math.abs(Math.sin(x * 0.21) * Math.cos(x * 0.043));
        c.line(x, 58 - a, x, 58 + a, { tone: "bridge", width: 1.2 });
      }
      const fw = 592 / 12.5;
      for (let i = 0; i <= 12; i++) c.line(24 + i * fw, 84, 24 + i * fw, 94, { tone: "predict", width: 2 });
      c.text(620, 112, "a tick every 80 ms = 1,920 samples", { anchor: "end", size: 12, tone: "predict", weight: 700 });
      if (s >= 2) {
        c.text(20, 136, "each frame: 16 codes, each 0–2,047", { size: 12, tone: "muted" });
        for (let col = 0; col < 12; col++) for (let row = 0; row < 16; row++) {
          const v = codes[col * 16 + row];
          c.box({ x: 24 + col * fw + 2, y: 144 + row * 8, w: fw - 4, h: 7, tone: row === 0 ? "take" : "paper", r: 1, solid: v % 3 === 0 });
        }
      }
      if (s === 3) {
        // our run (tok_result.json)
        c.box({ x: 24, y: 290, w: 592, h: 52, label: "our clip: 23.764 s → 298 frames × 16 codes", sub: "Breeze's tokenizer on CPU · 12.54 frames per second", size: 15, tone: "code", hl: true });
      }
      if (s >= 4) {
        const sec = len.value, frames = Math.ceil(sec * 12.5);
        c.text(24, 300, `${sec.toFixed(1)} s → ${n0(frames)} frames → ${n0(frames * 16)} tokens`, { size: 16, weight: 700, mono: true });
        c.text(24, 330, "16 codes × 11 bits × 12.5 frames = 2,200 bits per second", { size: 13, tone: "paper", mono: true });
      }
    };
  };

  // ------------------------------------------------------ toolbox: RVQ toy
  D["rvq"] = (fig, k) => {
    const nq = k.slider({ label: "codebooks", min: 1, max: 32, step: 1, value: 1 });
    k.follow(nq, { 1: 1, 2: 2, 3: 2, 4: 16 });
    const c = k.canvas(W, H);
    // toy: each codebook has 4 levels and refines the residual, so error shrinks 4x per codebook
    const target = 0.73686;
    const approx = (n) => { let r = target, a = 0, step = 0.25; for (let i = 0; i < n; i++) { const q = Math.round(r / step) * step; a += q; r -= q; step /= 4; } return a; };
    return (s) => {
      c.clear();
      const n = nq.value, a = approx(n), err = Math.abs(target - a);
      const X = (v) => 40 + v * 560;
      c.line(X(0), 60, X(1), 60, { tone: "faint", width: 2 });
      c.text(X(0), 84, "0", { anchor: "middle", size: 12, tone: "muted" });
      c.text(X(1), 84, "1", { anchor: "middle", size: 12, tone: "muted" });
      c.dot(X(target), 60, { r: 7, tone: "ink" });
      c.label(X(target), 36, "true frame", { anchor: "middle", size: 12, weight: 700 });
      c.dot(X(a), 60, { r: 6, tone: "predict" });
      c.label(X(a), 100, `after ${n} codebook${n > 1 ? "s" : ""}`, { anchor: "middle", size: 12, tone: "predict", weight: 700 });
      c.text(320, 132, `toy error: ${err < 1e-6 ? err.toExponential(1) : err.toFixed(6)}`, { anchor: "middle", size: 15, mono: true, weight: 700 });
      // error per codebook count, log scale
      const bw = 17;
      for (let i = 1; i <= 32; i++) {
        const e = Math.max(Math.abs(target - approx(Math.min(i, 12))), 1e-9);
        const hgt = Math.max(3, 150 * (1 + Math.log10(e) / 9));
        const used = i <= 16;
        c.box({ x: 40 + (i - 1) * bw, y: 320 - hgt, w: bw - 3, h: hgt, r: 2, tone: i === 1 && s >= 3 ? "take" : used ? "paper" : "muted",
          solid: i <= n, dashed: s >= 4 && !used, dim: s >= 4 && !used });
      }
      c.text(40, 344, "codebook 1", { size: 12, tone: s >= 3 ? "take" : "muted", weight: s >= 3 ? 700 : 400 });
      if (s >= 3) c.label(56, 200, "semantic: what is said", { anchor: "start", size: 12, tone: "take", weight: 700 });
      if (s >= 4) c.text(612, 344, "codebooks 17–32: built, not used", { anchor: "end", size: 12, tone: "muted" });
    };
  };

  // ------------------------------------------------ toolbox: two-level split
  D["twolevel"] = (fig, k) => {
    const mode = k.toggle({ label: "layout", options: ["flat", "two-level"], value: "flat" });
    k.follow(mode, { 1: "flat", 2: "two-level" });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const two = mode.value === "two-level";
      c.text(20, 26, "three frames = 240 ms of speech", { size: 13, weight: 700 });
      for (let f = 0; f < 3; f++) {
        const x0 = 20 + f * 205;
        c.text(x0, 54, `frame ${f + 1}`, { size: 12, tone: "muted" });
        if (!two) {
          for (let i = 0; i < 16; i++) c.box({ x: x0 + (i % 8) * 24, y: 64 + Math.floor(i / 8) * 30, w: 20, h: 24, r: 3, tone: "paper", solid: true });
        } else {
          c.box({ x: x0, y: 64, w: 190, h: 40, label: s >= 4 ? "backbone (llama-1B)" : "backbone: code 1", size: 12, tone: "paper", hl: s === 2 });
          for (let i = 0; i < 15; i++) c.box({ x: x0 + (i % 8) * 24, y: 116 + Math.floor(i / 8) * 22, w: 20, h: 16, r: 2, tone: "take", solid: true });
          if (f === 0) c.text(x0, 180, s >= 4 ? "depth decoder (llama-100M)" : "depth decoder: codes 2–16", { size: 12, tone: "take", weight: 700 });
        }
      }
      c.text(20, two ? 222 : 150, two ? "small boxes: cheap steps of a small model" : "every box is one step of the big model", { size: 12, tone: "muted" });
      if (s >= 3) {
        if (two) {
          c.box({ x: 20, y: 244, w: 290, h: 56, label: "12.5", sub: "backbone steps per second", size: 22, tone: "paper", hl: true });
          c.box({ x: 330, y: 244, w: 290, h: 56, label: "187.5", sub: "depth-decoder steps per second", size: 22, tone: "take" });
        } else {
          c.box({ x: 20, y: 244, w: 600, h: 56, label: "200", sub: "big-model steps per second", size: 22, tone: "bad" });
        }
      }
      if (s >= 4) c.text(320, 334, "the same flavour names as Sesame's CSM (found by us)", { anchor: "middle", size: 13, tone: "muted" });
    };
  };

  // ---------------------------------------------- toolbox: guidance on logits
  D["cfg"] = (fig, k) => {
    const sc = k.slider({ label: "guidance s", min: 0, max: 6, step: 0.5, value: 1 });
    k.follow(sc, { 1: 1, 3: 4, 4: 4 });
    const c = k.canvas(W, H);
    const U = [2.0, 1.5, 0.5], C = [1.6, 2.2, 0.4], names = ["code A", "code B", "code C"]; // illustrative
    const row = (y, label, logits, tone, hl) => {
      const p = softmax(logits);
      c.text(20, y + 24, label, { size: 13, weight: 700, tone });
      p.forEach((v, i) => {
        const x = 200 + i * 145;
        c.box({ x, y, w: 130, h: 36, tone: "muted", r: 4 });
        c.box({ x, y, w: Math.max(3, v * 130), h: 36, tone, r: 4, solid: true, hl });
        c.text(x + 65, y + 50, `${(v * 100).toFixed(0)}%`, { anchor: "middle", size: 12, mono: true });
      });
    };
    return (s) => {
      c.clear();
      names.forEach((nme, i) => c.text(265 + i * 145, 24, nme, { anchor: "middle", size: 12, tone: "muted" }));
      row(40, "without instruction", U, "muted");
      row(110, "with instruction", C, "paper");
      if (s >= 2) {
        C.forEach((v, i) => {
          const d = v - U[i];
          c.text(265 + i * 145, 184, `${d >= 0 ? "+" : "−"}${Math.abs(d).toFixed(1)}`, { anchor: "middle", size: 15, mono: true, weight: 700, tone: d >= 0 ? "code" : "bad" });
        });
        c.text(20, 184, "with − without", { size: 13, tone: "muted" });
      }
      if (s >= 3) {
        const v = sc.value, G = U.map((u, i) => u + v * (C[i] - u));
        row(210, `guided, s = ${v}`, G, "predict", true);
        c.text(320, 300, "guided = without + s × (with − without)", { anchor: "middle", size: 14, mono: true, weight: 700 });
      }
      if (s >= 4) c.text(320, 334, sc.value === 1 ? "s = 1: the same as 'with' (Breeze's default)" : "s = 4: the README's suggestion for design and direction",
        { anchor: "middle", size: 13, tone: "predict", weight: 700 });
    };
  };

  // ----------------------------------------------------- toolbox: TTFA, RTF
  D["rtf"] = (fig, k) => {
    const ms = k.slider({ label: "compute per frame", min: 5, max: 120, step: 0.1, value: 40, fmt: (v) => `${v.toFixed(1)} ms` });
    k.follow(ms, { 1: 40, 3: 100, 4: 25.6 });
    const c = k.canvas(W, H);
    const X = (t) => 90 + t * 0.55; // 1 ms = 0.55 px
    return (s) => {
      c.clear();
      const m = ms.value, ttfa = 120 + m; // illustrative prefill of 120 ms, then one frame
      c.text(14, 70, "made", { size: 12, tone: "muted" });
      c.text(14, 150, "played", { size: 12, tone: "muted" });
      c.line(X(0), 66, 626, 66, { tone: "faint" });
      c.line(X(0), 146, 626, 146, { tone: "faint" });
      c.box({ x: X(0), y: 52, w: X(120) - X(0), h: 28, label: "prefill", size: 11, tone: "muted" });
      let t = 120, late = false;
      for (let i = 0; i < 12; i++) {
        const a = X(t), b = X(t + m);
        if (b > 626) break;
        c.box({ x: a, y: 52, w: Math.max(2, b - a - 1), h: 28, tone: "paper", solid: true, r: 2 });
        t += m;
      }
      let p = ttfa;
      for (let i = 0; i < 12; i++) {
        const start = Math.max(p, 120 + (i + 1) * m);
        if (start > p + 0.01) late = true;
        const a = X(start), b = X(start + 80);
        if (a > 626) break;
        c.box({ x: a, y: 132, w: Math.max(2, Math.min(b, 626) - a - 1), h: 28, tone: start > p + 0.01 ? "bad" : "code", r: 2 });
        p = start + 80;
      }
      c.line(X(0), 96, X(ttfa), 96, { tone: "predict", width: 2.5 });
      c.text(X(ttfa / 2), 116, `TTFA ≈ ${ttfa.toFixed(0)} ms`, { anchor: "middle", size: 12, tone: "predict", weight: 700 });
      if (s >= 2) c.text(320, 210, `RTF = ${m.toFixed(1)} / 80 = ${(m / 80).toFixed(2)}`, { anchor: "middle", size: 22, mono: true, weight: 700, tone: m < 80 ? "code" : "bad" });
      if (s >= 3) c.text(320, 244, m < 80 ? "faster than real time: playback never waits" : "slower than real time: gaps appear (red)", { anchor: "middle", size: 14, tone: m < 80 ? "code" : "bad", weight: 700 });
      if (s >= 4) c.text(320, 300, "Breeze's claim: RTF 0.32 on a warmed H100 (§README)", { anchor: "middle", size: 14, tone: "paper", weight: 700 });
      c.text(626, 340, "prefill length is illustrative", { anchor: "end", size: 11, tone: "muted" });
      void late;
    };
  };

  // --------------------------------------------------- machine: whole thing
  D["whole"] = (fig, k) => {
    const view = k.toggle({ label: "view", options: ["size", "work per second"], value: "size" });
    k.follow(view, { 1: "size" });
    const c = k.canvas(W, H);
    // parameter counts from the safetensors headers, revision 3e28c51 (millions)
    const P = [["text encoder", 999.90, "T5Gemma 2 · once per request", "bridge"],
      ["backbone", 1409.41, "Qwen3-style · 12.5 steps/s", "paper"],
      ["depth decoder", 434.28, "12 layers · 187.5 steps/s", "take"],
      ["codec", 170.56, "Qwen3-TTS tokenizer · 12.5 frames/s", "code"]];
    return (s) => {
      c.clear();
      const size = view.value === "size";
      const boxes = [];
      P.forEach(([nm, m, work, tone], i) => {
        if (s < i + 1) return;
        const w = size ? Math.max(170, (m / 1409.41) * 470) : 470;
        boxes[i] = c.box({ x: 14, y: 12 + i * 66, w, h: 48, label: nm, sub: size ? `${n0(Math.round(m))}M parameters` : work, size: 15, subSize: 12, tone, hl: s === i + 1 });
        if (i > 0 && boxes[i - 1]) c.connect(boxes[i - 1], boxes[i], { side: "v" });
      });
      if (s >= 5) {
        c.box({ x: 14, y: 286, w: size ? (536.9 / 1409.41) * 470 : 470, h: 40, label: "text table", sub: size ? "537M, fallback only" : "not used by these prompts", size: 13, subSize: 11, tone: "muted", dashed: true });
        c.text(626, 312, "3.48B in bf16", { anchor: "end", size: 18, weight: 700 });
        c.text(626, 336, "main checkpoint, our count", { anchor: "end", size: 12, tone: "muted" });
      }
    };
  };

  // -------------------------------------------------------- machine: prompt
  D["prompt"] = (fig, k) => {
    const mode = k.toggle({ label: "mode", options: ["plain", "design", "clone", "direction"], value: "direction" });
    k.follow(mode, { 1: "direction", 5: "plain" });
    const c = k.canvas(W, H);
    // templates.py; texts from the README's voice-direction example
    const SEG = {
      ref: [{ t: "[S0]", tone: "muted" }, { t: "This is the exact transcript of the reference audio.", tone: "bridge" }],
      audio: [{ t: "<|AUDIO|> × 125", tone: "code" }, { t: "<|audio_eos|>", tone: "code" }],
      ins: [{ t: "[S0]", tone: "muted" }, { t: "<ins_bos>", tone: "predict" }, { t: "Speak slowly with a restrained, serious tone.", tone: "predict" }, { t: "<ins_eos>", tone: "predict" }],
      text: [{ t: "(clears throat) We need to discuss what happened last night.", tone: "paper" }],
    };
    const MODES = { plain: ["text"], design: ["ins", "text"], clone: ["ref", "audio", "text"], direction: ["ref", "audio", "ins", "text"] };
    const ORDER = ["ref", "audio", "ins", "text"];
    return (s) => {
      c.clear();
      const m = mode.value;
      const shown = MODES[m].filter((g) => s >= 5 || ORDER.indexOf(g) < s);
      const items = [];
      shown.forEach((g) => {
        let segItems = SEG[g];
        if (g === "text" && !MODES[m].includes("ins")) segItems = [{ t: "[S0]", tone: "muted" }, ...segItems];
        segItems.forEach((it) => items.push({ ...it, hl: s < 5 && ORDER.indexOf(g) === s - 1 }));
      });
      c.text(20, 24, `${m} mode: what the model reads, left to right`, { size: 13, weight: 700 });
      if (items.length) c.chips({ x: 20, y: 40, items, size: 13, maxW: 600 });
      const legend = [["reference transcript", "bridge"], ["reference audio codes", "code"], ["instruction", "predict"], ["text to speak", "paper"]];
      legend.forEach(([l, tn], i) => {
        c.box({ x: 20 + i * 152, y: 300, w: 14, h: 14, tone: tn, solid: true, r: 2 });
        c.text(40 + i * 152, 312, l, { size: 12 });
      });
      if (s >= 2 && MODES[m].includes("audio")) c.text(20, 346, "10 s of reference audio = 125 frame slots (illustrative clip)", { size: 12, tone: "muted" });
    };
  };

  // -------------------------------------------------- machine: text encoder
  D["textenc"] = (fig, k) => {
    const seg = k.toggle({ label: "text piece", options: ["reference transcript", "text to speak"], value: "reference transcript" });
    k.follow(seg, { 1: "reference transcript", 2: "text to speak" });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const ref = seg.value === "reference transcript";
      const a = c.box({ x: 14, y: 14, w: 190, h: 40, label: "reference transcript", size: 12, tone: "bridge", hl: ref });
      const b = c.box({ x: 214, y: 14, w: 180, h: 40, label: "audio slots", size: 12, tone: "code" });
      const t2 = c.box({ x: 404, y: 14, w: 222, h: 40, label: "instruction + text", size: 12, tone: "paper", hl: !ref });
      const enc = c.box({ x: ref ? 14 : 404, y: 96, w: ref ? 190 : 222, h: 46, label: "text encoder", sub: "this piece only", size: 13, tone: "bridge", hl: s === 2 });
      c.connect(ref ? a : t2, enc, { side: "v" });
      const sum = c.box({ x: 214, y: 96, w: 180, h: 46, label: "sum of 16", sub: "code embeddings", size: 13, tone: "code" });
      c.connect(b, sum, { side: "v" });
      if (s >= 2) c.text(320, 172, "pieces never attend to each other inside the encoder", { anchor: "middle", size: 12, tone: "bridge", weight: 700 });
      if (s >= 3) {
        c.text(14, 204, "26 encoder layers", { size: 12, tone: "muted" });
        for (let i = 0; i < 26; i++) {
          const full = [5, 11, 17, 23].includes(i); // §config layer_types
          c.box({ x: 14 + i * 23, y: 214, w: 19, h: full ? 44 : 26, r: 2, tone: full ? "predict" : "bridge", solid: full, hl: s === 3 && full });
        }
        c.text(626, 280, "tall: full attention · short: 512-token window", { anchor: "end", size: 12, tone: "muted" });
      }
      if (s >= 4) c.box({ x: 120, y: 296, w: 400, h: 46, label: "linear map: 1,152 → 2,048", sub: "into the backbone's width", size: 15, tone: "paper", hl: s === 4 });
    };
  };

  // ------------------------------------------------------- machine: a frame
  D["frame"] = (fig, k) => {
    const d = k.slider({ label: "depth step", min: 0, max: 15, step: 1, value: 0 });
    k.follow(d, { 1: 0, 2: 7, 3: 15 });
    const c = k.canvas(W, H);
    const r = rng(11), codes = Array.from({ length: 16 }, () => Math.floor(r() * 2048)); // illustrative
    return (s) => {
      c.clear();
      const bb = c.box({ x: 14, y: 20, w: 150, h: 54, label: "backbone", sub: "1 step", size: 15, tone: "paper", hl: s === 1 });
      const dd = c.box({ x: 14, y: 100, w: 150, h: 54, label: "depth decoder", sub: `${d.value} of 15 steps`, size: 14, tone: "take", hl: s === 2 });
      c.connect(bb, dd, { side: "v" });
      const cells = [];
      for (let i = 0; i < 16; i++) {
        const filled = i === 0 || i <= d.value;
        cells[i] = c.box({ x: 194 + (i % 8) * 54, y: i < 8 ? 20 : 100, w: 48, h: 54, label: filled ? String(codes[i]) : "?", sub: `c${i + 1}`, size: 12, subSize: 10, mono: true,
          tone: i === 0 ? "paper" : "take", dashed: !filled, hl: i === d.value && s === 2 });
      }
      if (s >= 3) {
        const codec = c.box({ x: 194, y: 190, w: 200, h: 50, label: "codec", sub: "decodes this frame now", size: 14, tone: "code", hl: s === 3 });
        const audio = c.box({ x: 426, y: 190, w: 200, h: 50, label: "80 ms of audio", sub: "streams out", size: 14, tone: "bridge", hl: s === 3 });
        c.connect(codec, audio);
      }
      if (s >= 4) c.box({ x: 14, y: 190, w: 150, h: 50, label: "sum of 16", sub: "→ next backbone step", size: 13, tone: "paper", hl: s === 4 });
      if (s >= 5) {
        c.box({ x: 14, y: 270, w: 300, h: 50, label: "or: the stop class", sub: "backbone ends the speech", size: 14, tone: "bad", hl: true });
        c.box({ x: 326, y: 270, w: 300, h: 50, label: "cap: 1,500 frames", sub: "= 120 s in the CLI", size: 14, tone: "muted" });
      }
    };
  };

  // ---------------------------------------------------- machine: guidance
  D["guide"] = (fig, k) => {
    const mode = k.toggle({ label: "mode", options: ["direction", "design", "plain"], value: "direction" });
    k.follow(mode, { 1: "direction", 5: "plain" });
    const c = k.canvas(W, H);
    const WITH = { direction: ["ref text", "ref audio", "instruction", "text"], design: ["instruction", "text"], plain: ["text"] };
    const WITHOUT = { direction: ["ref text", "ref audio", "text"], design: ["text"], plain: null };
    const TONE = { "ref text": "bridge", "ref audio": "code", instruction: "predict", text: "paper" };
    return (s) => {
      c.clear();
      const m = mode.value;
      c.text(14, 30, "with", { size: 13, weight: 700 });
      c.chips({ x: 110, y: 12, items: WITH[m].map((t) => ({ t, tone: TONE[t], hl: t === "instruction" })), size: 14 });
      c.text(14, 86, "without", { size: 13, weight: 700 });
      if (WITHOUT[m]) c.chips({ x: 110, y: 68, items: WITHOUT[m].map((t) => ({ t, tone: TONE[t] })), size: 14 });
      else c.text(110, 86, "no negative prompt: guidance stays off", { size: 13, tone: "bad", weight: 700 });
      if (s >= 2 && WITHOUT[m]) {
        const bb = c.box({ x: 110, y: 130, w: 220, h: 50, label: "backbone", sub: "batch of 2", size: 14, tone: "paper", hl: s === 2 });
        const dd = c.box({ x: 380, y: 130, w: 220, h: 50, label: "depth decoder", sub: "batch of 2", size: 14, tone: "take", hl: s === 2 });
        c.connect(bb, dd);
      }
      if (s >= 3 && m === "direction") c.text(110, 214, "the voice comes from the reference in both rows", { size: 13, tone: "code", weight: 700 });
      if (s >= 4 && m === "direction") {
        c.text(14, 262, "unused", { size: 13, tone: "muted", weight: 700 });
        c.chips({ x: 110, y: 244, items: [{ t: "text only", tone: "muted", dashed: true }, { t: "ref + text", tone: "muted", dashed: true }, { t: "ins + text", tone: "muted", dashed: true }], size: 13 });
        c.text(110, 310, "three-way mode: in the code, never enabled by the CLI or streaming path", { size: 12, tone: "muted" });
      }
    };
  };

  // ---------------------------------------------------- machine: sampling
  D["sampling"] = (fig, k) => {
    const tmp = k.slider({ label: "temperature", min: 0.3, max: 2, step: 0.1, value: 0.9 });
    k.follow(tmp, { 1: 0.9 });
    const c = k.canvas(W, H);
    const L = [3.1, 2.6, 2.2, 1.0, 0.4, -0.5]; // illustrative logits for six candidate codes
    const ids = ["417", "1203", "88", "1950", "731", "2049"];
    return (s) => {
      c.clear();
      const T = tmp.value;
      const logits = L.map((v, i) => {
        if (s >= 3 && i === 5) return -Infinity;                    // reserved id masked
        if (s >= 4 && i === 0) return v > 0 ? v / 1.1 : v * 1.1;   // already chosen: repetition penalty
        return v;
      });
      const p = softmax(logits.map((v) => v / T));
      c.text(20, 24, `six candidate codes, temperature ${T.toFixed(1)}`, { size: 13, weight: 700 });
      p.forEach((v, i) => {
        const x = 20 + i * 102;
        const masked = s >= 3 && i === 5;
        c.box({ x, y: 60, w: 90, h: 200, tone: "muted", r: 4, dim: masked });
        c.box({ x, y: 260 - Math.max(2, v * 200), w: 90, h: Math.max(2, v * 200), tone: masked ? "bad" : i === 0 && s >= 4 ? "predict" : "paper", solid: true, r: 4 });
        c.text(x + 45, 284, ids[i], { anchor: "middle", size: 13, mono: true, tone: masked ? "bad" : undefined });
        c.text(x + 45, 304, masked ? "masked" : `${(v * 100).toFixed(1)}%`, { anchor: "middle", size: 12, mono: true, tone: masked ? "bad" : "muted" });
      });
      if (s === 2) c.text(320, 340, "top-k keeps the 50 likeliest of 2,048; all six here survive", { anchor: "middle", size: 13, tone: "paper", weight: 700 });
      if (s === 3) c.text(320, 340, "id 2049 is a reserved id, not a real code: blocked", { anchor: "middle", size: 13, tone: "bad", weight: 700 });
      if (s === 4) c.text(320, 340, "417 was already chosen: its score is divided by 1.1", { anchor: "middle", size: 13, tone: "predict", weight: 700 });
      if (s >= 5) c.text(320, 340, "seed 42: the same request gives the same speech", { anchor: "middle", size: 13, tone: "code", weight: 700 });
    };
  };

  // --------------------------------------------------- machine: streaming
  D["stream"] = (fig, k) => {
    const mode = k.toggle({ label: "path", options: ["eager", "fast"], value: "eager" });
    k.follow(mode, { 1: "eager", 4: "fast" });
    const c = k.canvas(W, H);
    const X = (t) => 80 + t * 1.6; // 1 ms = 1.6 px, illustrative timings
    return (s) => {
      c.clear();
      const fast = mode.value === "fast", per = fast ? 1 : 2, fms = 38;
      c.text(10, 66, "model", { size: 12, tone: "muted" });
      c.text(10, 146, "audio out", { size: 12, tone: "muted" });
      c.line(X(0), 62, 626, 62, { tone: "faint" });
      c.line(X(0), 142, 626, 142, { tone: "faint" });
      c.box({ x: X(0), y: 48, w: X(60) - X(0), h: 28, label: "prefill", size: 12, tone: "muted", hl: s === 1 });
      let first = null;
      for (let f = 0; f < 8; f++) {
        if (s < 2 && f > 0) break;
        const a = X(60 + f * fms), b = X(60 + (f + 1) * fms);
        if (b > 626) break;
        c.box({ x: a + 1, y: 48, w: b - a - 2, h: 28, label: `f${f + 1}`, size: 11, tone: "paper", solid: true });
        if ((f + 1) % per === 0) {
          const t0 = 60 + (f + 1) * fms;
          if (first === null) first = t0;
          const x = X(t0);
          if (x + per * 60 < 626) c.box({ x, y: 128, w: per * 60 - 4, h: 28, label: `${per * 80} ms`, size: 11, tone: "bridge" });
        }
      }
      if (s >= 2 && first !== null) {
        c.line(X(0), 96, X(first), 96, { tone: "predict", width: 2.5 });
        c.text(X(first / 2), 116, "until first audio", { anchor: "middle", size: 12, tone: "predict", weight: 700 });
      }
      if (s >= 3) c.text(320, 210, fast ? "fast path: every frame is its own 80 ms chunk" : "eager: chunks of 2 frames = 160 ms", { anchor: "middle", size: 16, weight: 700, tone: fast ? "code" : "paper" });
      if (s >= 5) c.text(320, 260, "output: raw PCM, mono, 24 kHz, 16-bit, one request at a time", { anchor: "middle", size: 13, tone: "bridge", weight: 700 });
      c.text(626, 340, "frame and prefill times are illustrative", { anchor: "end", size: 11, tone: "muted" });
    };
  };

  // --------------------------------------------------- machine: fast path
  D["fast"] = (fig, k) => {
    const mode = k.toggle({ label: "mode", options: ["eager", "fast-all"], value: "eager" });
    k.follow(mode, { 1: "fast-all", 3: "eager", 4: "fast-all" });
    const c = k.canvas(W, H);
    const STAGES = ["text encoder", "prefill", "decode", "depth decoder", "codec"];
    return (s) => {
      c.clear();
      const fast = mode.value === "fast-all";
      STAGES.forEach((st, i) => c.box({ x: 14 + i * 124, y: 14, w: 114, h: 48, label: st, sub: fast ? "CUDA Graph" : "eager", size: 12, subSize: 10,
        tone: fast ? "code" : "muted", hl: s === 1 || (s === 2 && fast) }));
      if (s >= 2) c.text(320, 92, fast ? "each step replays a recorded kernel sequence" : "each kernel is launched one by one", { anchor: "middle", size: 13, tone: fast ? "code" : "muted", weight: 700 });
      if (s >= 3) {
        // §README GPU memory
        const X = (g) => 120 + g * 20;
        c.text(14, 140, "GPU memory", { size: 12, tone: "muted" });
        c.box({ x: X(0), y: 124, w: X(7.7) - X(0), h: 30, label: "7.7 GiB", size: 12, tone: "muted", hl: !fast });
        c.box({ x: X(0), y: 164, w: X(14.4) - X(0), h: 30, label: "14.4 GiB", size: 12, tone: "code", hl: fast });
        [[12, "12 GB GPU"], [24, "24 GB GPU"]].forEach(([g, l]) => {
          c.line(X(g), 202, X(g), 214, { tone: "ink", width: 2 });
          c.text(X(g), 232, l, { anchor: "middle", size: 12 });
        });
      }
      if (s >= 4) c.box({ x: 14, y: 254, w: 290, h: 44, label: fast ? "warm-up before first request" : "no warm-up", size: 13, tone: fast ? "predict" : "muted" });
      if (s >= 5) c.box({ x: 324, y: 254, w: 302, h: 44, label: "TTFA < 40 ms · RTF 0.32", sub: "claims for a warmed H100", size: 13, tone: "paper", hl: true });
    };
  };

  // ------------------------------------------------------- claims: Elo
  // README chart, Artificial Analysis snapshot dated Aug 25, 2026; open = open weights
  const ELO = [["Breeze TTS 2", 1215, true], ["Gemini 3.1 Flash TTS", 1210, false], ["Cartesia Sonic 3.5", 1199, false],
    ["Inworld Realtime TTS-2", 1185, false], ["Eleven v3", 1177, false], ["Fish Audio S2 Pro", 1125, true],
    ["Voxtral TTS", 1082, true], ["Kokoro 82M v1.0", 1060, true], ["Higgs Audio V3", 1042, true],
    ["Chatterbox", 1020, true], ["VibeVoice 7B", 969, true], ["XTTS v2", 920, true]];
  D["elo"] = (fig, k) => {
    const view = k.toggle({ label: "show", options: ["all", "open-weight"], value: "all" });
    k.follow(view, { 1: "all", 4: "open-weight" });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const rows = view.value === "all" ? ELO : ELO.filter((r) => r[2]);
      const X = (e) => 200 + ((e - 900) / 330) * 360, rh = Math.min(28, 300 / rows.length);
      rows.forEach(([nm, e, open], i) => {
        const y = 10 + i * rh, lit = (s === 2 && i < 3) || (s === 3 && i < 2) || (s >= 4 && view.value !== "all" && i < 2) || nm === "Breeze TTS 2";
        c.text(192, y + rh * 0.62, nm, { anchor: "end", size: 12, dim: !lit && s >= 2 });
        c.box({ x: X(900), y: y + 2, w: X(e) - X(900), h: rh - 6, r: 3, tone: nm === "Breeze TTS 2" ? "paper" : open ? "bridge" : "muted", solid: true, dim: !lit && s >= 2 });
        c.text(X(e) + 6, y + rh * 0.62, n0(e), { size: 12, mono: true, dim: !lit && s >= 2 });
      });
      if (s === 3) c.text(626, 340, "5 points → Breeze wins 50.7% of pairs (our arithmetic)", { anchor: "end", size: 13, tone: "predict", weight: 700 });
      if (s === 4) c.text(626, 340, view.value === "all" ? "flip to open-weight" : "+90 → wins 62.7% vs Fish Audio S2 Pro (our arithmetic)", { anchor: "end", size: 13, tone: "code", weight: 700 });
      if (s >= 5) c.text(626, 340, "no vote counts or error bars are shown", { anchor: "end", size: 13, tone: "bad", weight: 700 });
    };
  };

  // ------------------------------------------------- claims: home benchmarks
  // blog tables, Aug 7, 2026
  const DESIGN = [["Breeze TTS 2", 78.02, 708], ["MiMo-V2.5-TTS", 72.78, 202], ["Inworld Voice Design", 64.61, 378],
    ["Fun-AudioGen-VD", 63.82, 136], ["Eleven v3", 58.88, 111], ["Qwen3-TTS-VD", 58.48, 83], ["VoxCPM2", 55.28, 509]];
  const DIRECT = [["Breeze TTS 2", 4.25, 0.67], ["MiMo-v2.5-TTS", 3.76, 0.66], ["StepAudio 2.5 TTS", 3.48, 0.64],
    ["Qwen-Audio 3.0-TTS-Plus", 3.33, 0.65], ["Inworld TTS-2", 3.01, 0.71], ["VoxCPM2", 2.49, 0.70]];
  D["bench"] = (fig, k) => {
    const t = k.toggle({ label: "benchmark", options: ["voice design", "voice direction"], value: "voice design" });
    k.follow(t, { 1: "voice design", 3: "voice direction" });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const design = t.value === "voice design";
      const rows = design ? DESIGN : DIRECT, max = design ? 80 : 4.5;
      const second = design ? "voices" : "similarity";
      const secondLit = (design && s === 2) || (!design && s >= 4);
      c.text(400, 22, design ? "Role Fit" : "Direction score", { anchor: "middle", size: 12, tone: "muted", weight: 700 });
      c.text(600, 22, second, { anchor: "middle", size: 12, tone: secondLit ? "predict" : "muted", weight: 700 });
      rows.forEach(([nm, a, b], i) => {
        const y = 34 + i * 44, me = i === 0;
        c.text(206, y + 20, nm, { anchor: "end", size: 12, weight: me ? 700 : 400 });
        c.box({ x: 216, y: y + 2, w: (a / max) * 330, h: 26, r: 3, tone: me ? "paper" : "muted", solid: true, hl: me && !secondLit });
        c.text(222 + (a / max) * 330, y + 20, design ? a.toFixed(2) : a.toFixed(2), { size: 12, mono: true });
        const top = design ? b === 708 : b === 0.71;
        c.text(600, y + 20, design ? String(b) : b.toFixed(2), { anchor: "middle", size: 13, mono: true, weight: secondLit && (top || me) ? 700 : 400, tone: secondLit && top ? "predict" : undefined });
      });
      if (s >= 5) c.text(626, 350, "all three benchmarks are BreezeBlue's own", { anchor: "end", size: 12, tone: "bad", weight: 700 });
    };
  };

  // ------------------------------------------------------- claims: latency
  // blog latency chart (hosted APIs), ms
  const LAT = [["Speechify Simba 3.2", 82.5, 126.9], ["Inworld TTS-2 Flash", 100.2, 179.8], ["Breeze TTS 2", 127.2, 159.3],
    ["ElevenLabs Flash v2.5", 143.6, 191.6], ["Inworld TTS-2", 148.5, 249.4], ["Cartesia Sonic 3.5", 215.2, 262.0]];
  D["lat"] = (fig, k) => {
    const q = k.toggle({ label: "percentile", options: ["p50", "p95"], value: "p50" });
    k.follow(q, { 1: "p50", 4: "p95" });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const j = q.value === "p50" ? 1 : 2;
      const rows = [...LAT].sort((a, b) => a[j] - b[j]);
      const X = (ms) => 200 + ms * 1.2;
      c.text(14, 22, `hosted APIs, time to first audio ${q.value} (§blog)`, { size: 13, weight: 700, dim: s === 1 });
      rows.forEach((r, i) => {
        const y = 34 + i * 38, me = r[0] === "Breeze TTS 2";
        c.text(192, y + 20, r[0], { anchor: "end", size: 12, weight: me ? 700 : 400, dim: s === 1 });
        c.box({ x: X(0), y: y + 3, w: X(r[j]) - X(0), h: 24, r: 3, tone: me ? "paper" : "muted", solid: true, hl: me && s >= 2, dim: s === 1 });
        c.text(X(r[j]) + 6, y + 20, `${r[j].toFixed(1)} ms${me ? `  (#${i + 1})` : ""}`, { size: 12, mono: true, weight: me ? 700 : 400, dim: s === 1 });
      });
      c.text(192, 290, "Breeze, local H100", { anchor: "end", size: 12, weight: 700, tone: "code" });
      c.box({ x: X(0), y: 274, w: X(40) - X(0), h: 24, r: 3, tone: "code", dashed: true, hl: s === 1 });
      c.text(X(40) + 6, 291, "< 40 ms (§README)", { size: 12, mono: true, tone: "code" });
      if (s >= 5) c.text(320, 340, "different setups: don't rank the dashed bar against the rest", { anchor: "middle", size: 13, tone: "bad", weight: 700 });
    };
  };

  // ---------------------------------------------------------- your move: run
  D["ourrun"] = (fig, k) => {
    const v = k.toggle({ label: "show", options: ["memory", "time"], value: "memory" });
    k.follow(v, { 1: "memory", 3: "time" });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      if (v.value === "memory") {
        const X = (g) => 200 + g * 48;
        // our GPU; weights from safetensors headers (6,966,413,058 bytes); eager figure from §README
        [["our GPU (RTX 3050)", 6, "muted"], ["bf16 weights", 6.97, "bad"], ["eager inference", 7.7, "bad"]].forEach(([l, g, tn], i) => {
          const y = 40 + i * 60;
          c.text(192, y + 24, l, { anchor: "end", size: 13 });
          c.box({ x: X(0), y, w: X(g) - X(0), h: 36, r: 4, tone: tn, solid: i > 0, label: `${g} GB`, size: 13 });
        });
        c.text(200, 244, s >= 2 ? "the 0.68 GB tokenizer fits easily: we ran it on CPU" : "the model alone overflows a 6 GB card", { size: 14, weight: 700, tone: s >= 2 ? "code" : "bad" });
      } else {
        const X = (sec) => 200 + sec * 14;
        // tok_result.json
        [["clip length", 23.764, "bridge"], ["encode (CPU)", 1.88, "code"], ["decode (CPU)", 15.47, "predict"]].forEach(([l, sec, tn], i) => {
          const y = 40 + i * 60;
          c.text(192, y + 24, l, { anchor: "end", size: 13, weight: (s === 3 && i === 1) || (s >= 4 && i === 2) ? 700 : 400 });
          c.box({ x: X(0), y, w: X(sec) - X(0), h: 36, r: 4, tone: tn, solid: true, hl: (s === 3 && i === 1) || (s >= 4 && i === 2) });
          c.text(X(sec) + 8, y + 24, `${sec} s`, { size: 13, mono: true });
        });
        c.text(320, 244, "298 frames × 16 codes, values 0 to 2,047", { anchor: "middle", size: 14, weight: 700, tone: "code", mono: true });
      }
      if (s >= 5) c.text(320, 320, "assets/tok_run.py: one encode call, one decode call", { anchor: "middle", size: 13, tone: "muted", mono: true });
    };
  };

  // ---------------------------------------------------- your move: reviewer
  D["reviewer"] = (fig, k) => {
    const c = k.canvas(W, H);
    const R = [["no training recipe", "not disclosed", "bad"], ["languages disagree", "51 (blog) vs 2 (card)", "bad"],
      ["unused weights ride along", "537M table + spare codec", "predict"], ["home-made benchmarks", "all BreezeBlue's", "predict"],
      ["steelman: complete code", "inference + tests", "code"]];
    return (s) => {
      c.clear();
      R.forEach(([q, a, tone], i) => {
        if (s < i + 1) return;
        const y = 10 + i * 68, now = s === i + 1;
        c.box({ x: 10, y, w: 620, h: 56, tone: "muted", hl: now });
        c.text(26, y + 34, q, { size: 14, weight: now ? 700 : 400, maxW: 340, lines: 1, inBox: true });
        c.box({ x: 384, y: y + 11, w: 232, h: 34, label: a, size: 12, tone, hl: now });
      });
    };
  };

  // ----------------------------------------------------- your move: verdict
  D["verdict"] = (fig, k) => {
    const g = k.toggle({ label: "your GPU", options: ["6 GB", "12 GB", "24 GB", "80 GB"], value: "12 GB" });
    k.follow(g, { 2: "12 GB" });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const gb = parseInt(g.value, 10), eager = gb >= 12, fast = gb >= 24; // §README: 12 GB eager, 24 GB fast path
      const rows = [["quality", "1,215 Elo: best open model", "code"],
        ["hardware", fast ? "eager and fast path both fit" : eager ? "eager only: fast path needs 24 GB" : "doesn't fit: 12 GB minimum", fast ? "code" : eager ? "predict" : "bad"],
        ["Telugu / Hindi", "not supported: English and Chinese only", "bad"],
        ["commercial product", "no: research and non-commercial", "bad"],
        ["our verdict", "prototype yes, product no", "predict"]];
      rows.forEach(([q, a, tone], i) => {
        if (s < i + 1) return;
        const y = 10 + i * 68, now = s === i + 1;
        c.box({ x: 10, y, w: 620, h: 56, tone: "muted", hl: now });
        c.text(26, y + 34, q, { size: 14, weight: now ? 700 : 400, maxW: 180, lines: 1, inBox: true });
        c.box({ x: 214, y: y + 11, w: 402, h: 34, label: a, size: 12, tone, hl: now });
      });
    };
  };
})();
