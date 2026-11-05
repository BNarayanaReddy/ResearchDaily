/* Drawings: "TTS: the machine" (part 04). Survey pointers as // §N or // Table N;
   FBU = numbers from original papers found by us (arXiv id in the comment); EX = the illustrative bank line. */
(function () {
  const D = RD.drawings, V = RD.sdr, W = V.W, H = V.H, EX = V.EX;
  const P4 = (V.p4 = {});
  const n0 = (v) => Math.round(v).toLocaleString("en-US");

  // EX: our ARPAbet transcription of the spoken line, per word (stress marks dropped).
  P4.words = [
    ["your", "Y AO R"], ["balance", "B AE L AH N S"], ["is", "IH Z"], ["one", "W AH N"], ["thousand", "TH AW Z AH N D"],
    ["two", "T UW"], ["hundred", "HH AH N D R AH D"], ["and", "AE N D"], ["fifty", "F IH F T IY"], ["pounds", "P AW N D Z"],
    ["seventy-five", "S EH V AH N T IY F AY V"], ["pence", "P EH N S"],
  ];
  P4.nPh = P4.words.reduce((a, [, p]) => a + p.split(" ").length, 0); // 56

  // A small heat map: rows × cols of values in [0,1], drawn as rects.
  P4.heat = (c, k, o) => {
    const { x, y, rows, cols, cw, ch, val, tone } = o;
    for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
      const v = val(i, j);
      c.add(k.h("rect", { x: x + j * cw, y: y + i * ch, width: cw - 1, height: ch - 1, rx: 1.5,
        class: `f-${v > 0.02 ? tone(i, j) : "muted"}`, opacity: v > 0.02 ? (0.15 + 0.85 * v).toFixed(2) : 0.12 }));
    }
    return { x, y, w: cols * cw, h: rows * ch };
  };

  // ---------------------------------------------------------------- 1 pipeline
  D["tts-pipeline"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const y = 40, bw = 150, bh = 70;
      const a = c.box({ x: 8, y, w: 120, h: bh, label: "text", sub: "characters", tone: "muted", hl: s === 4 });
      const t = c.box({ x: 160, y, w: bw, h: bh, label: "text analysis", sub: "→ phonemes", tone: "paper", hl: s === 1, dim: s < 1 }); // Fig. 14
      const m = c.box({ x: 334, y, w: bw, h: bh, label: "acoustic model", sub: "→ mel", tone: "take", hl: s === 2, dim: s < 2 }); // §5.2.1
      const v = c.box({ x: 508, y, w: 124, h: bh, label: "vocoder", sub: "→ waveform", tone: "bridge", hl: s === 3, dim: s < 3 }); // §5.2.1
      c.connect(a, t); c.connect(t, m, { dim: s < 2 }); c.connect(m, v, { dim: s < 3 });
      if (s >= 4) {
        const rows = [ // EX
          ["£1,250.75", "the raw line", "muted"],
          [`${P4.nPh} phonemes`, "Y AO R  B AE L AH N S …", "paper"],
          [`${EX.mels} × ${EX.frames}`, `mel bins × frames (hop ${EX.hop})`, "take"],
          [n0(EX.samples), `samples at ${n0(EX.sr)} Hz = ${EX.sec} s`, "bridge"],
        ];
        rows.forEach(([big, sub, tone], i) => {
          const yy = 140 + i * 52;
          c.box({ x: 8, y: yy, w: 210, h: 42, label: big, mono: true, size: 16, tone, hl: true });
          c.text(234, yy + 26, sub, { size: 13, tone: "muted", maxW: 390, lines: 1 });
        });
      }
      if (s >= 5) {
        c.box({ x: 160, y: 120, w: bw, h: 16, label: "", tone: "bad", solid: true, r: 3 });
        c.box({ x: 334, y: 120, w: bw, h: 16, label: "", tone: "bad", solid: true, r: 3 });
        c.box({ x: 508, y: 120, w: 124, h: 16, label: "", tone: "bad", solid: true, r: 3 });
        c.box({ x: 430, y: 300, w: 202, h: 50, label: "wrong words · skips · buzz", size: 13, tone: "bad", hl: true });
      }
    };
  };

  // ---------------------------------------------------------------- 2 front end
  D["text-frontend"] = (fig, k) => {
    const ctx = k.toggle({ label: "1250 is", options: ["an amount", "a year"], value: "an amount" });
    k.follow(ctx, { 1: "an amount", 2: "an amount", 3: "a year", 4: "an amount", 5: "an amount" });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const yr = ctx.value === "a year";
      c.text(8, 22, "1 · raw text", { size: 13, weight: 700, tone: "muted" });
      c.chips({ x: 8, y: 32, items: (yr ? ["In", "1250", ","] : ["Your", "balance", "is", "£1,250.75", "."]).map((t) => ({ t, tone: /\d/.test(t) ? "predict" : "muted", hl: /\d/.test(t) && s >= 2 })) });
      if (s >= 2) {
        c.text(8, 92, "2 · normalized words", { size: 13, weight: 700, tone: "paper" });
        const items = yr ? ["in", "twelve", "fifty"] : ["your", "balance", "is", "one", "thousand", "two", "hundred", "and", "fifty", "pounds", "seventy-five", "pence"];
        const r = c.chips({ x: 8, y: 102, maxW: 620, items: items.map((t, i) => ({ t, tone: "paper", hl: (yr && i > 0) || (!yr && i >= 3) })) });
        if (s >= 3) c.box({ x: 8, y: r.bottom + 10, w: 624, h: 34, size: 13, tone: yr ? "predict" : "code", hl: s === 3,
          label: yr ? "as a year: \"twelve fifty\" (a different reading)" : "as an amount: pounds and pence" });
      }
      if (s >= 4 && !yr) {
        c.text(8, 250, `3 · phonemes (${P4.nPh} in all, ARPAbet)`, { size: 13, weight: 700, tone: "take" });
        const ph = P4.words.slice(0, 5).map(([, p]) => p).join("  |  ");
        c.box({ x: 8, y: 260, w: 624, h: 34, label: ph + "  | …", mono: true, size: 13, tone: "take", hl: s === 4 });
      }
      if (s === 5) {
        c.box({ x: 8, y: 304, w: 200, h: 46, label: "03/05 → 3 May", sub: "UK date order", tone: "predict", hl: true });
        c.box({ x: 220, y: 304, w: 200, h: 46, label: "12-34-56", sub: "sort code, in pairs", tone: "predict", hl: true });
        c.box({ x: 432, y: 304, w: 200, h: 46, label: "TESCO STORES 2041", sub: "merchant name", tone: "predict", hl: true });
      }
      if (s >= 6) c.box({ x: 8, y: 312, w: 624, h: 38, label: "wrong amount read aloud = customer incident", size: 14, tone: "bad", hl: true });
    };
  };

  // ---------------------------------------------------------------- 3 history
  D["tts-history"] = (fig, k) => {
    const c = k.canvas(W, H);
    // FBU arXiv:1712.05884 Table 1 (MOS, 95% CI omitted)
    const mos = [["Parametric (SPSS)", 3.492, 1], ["Concatenative", 4.166, 1], ["WaveNet (linguistic)", 4.341, 2], ["Tacotron (Griffin-Lim)", 4.001, 4], ["Tacotron 2", 4.526, 4], ["Recordings", 4.582, 1]];
    const eras = [["SPSS + DNN", "paper"], ["WaveNet", "bridge"], ["DeepVoice 1/2", "take"], ["Tacotron 1/2", "take"], ["text → wave", "code"]]; // §5.2.3
    return (s) => {
      c.clear();
      eras.forEach(([l, tone], i) => {
        const b = c.box({ x: 8 + i * 126, y: 14, w: 116, h: 46, label: l, size: 13, tone, hl: s === i + 1, dim: s < i + 1 });
        if (i) c.arrow(8 + i * 126 - 9, 37, 8 + i * 126 - 1, 37, { tone: "muted", dim: s < i + 1, snap: false });
      });
      if (s === 5) c.text(632, 78, "ClariNet · FS2s · EATS", { size: 12, anchor: "end", tone: "code" });
      c.text(8, 112, "MOS in one 2017 listening test (1–5)", { size: 13, weight: 700, tone: "muted" });
      c.bars({ x: 8, y: 124, w: 620, rowH: 36, labelW: 190, max: 5, fmt: (v) => v.toFixed(2), tones: ["paper"],
        rows: mos.map(([l, v, st]) => ({ label: l, values: [v], hl: s === st || (st === 1 && l === "Recordings" && s >= 4), dim: s < st && l !== "Recordings" })) });
    };
  };

  // ---------------------------------------------------------------- 4 AR vs NAR
  D["ar-vs-nar"] = (fig, k) => {
    const sec = k.slider({ label: "line length", min: 1, max: 20, step: 0.2, value: EX.sec, fmt: (v) => `${v.toFixed(1)} s` });
    const c = k.canvas(W, H);
    const RTF_AR = 0.932, RTF_NAR = 0.0195; // FBU arXiv:2006.04558 Table 2: Transformer TTS 9.32e-1, FastSpeech 2 1.95e-2
    return (s) => {
      c.clear();
      const t = sec.value, fr = Math.ceil((t * EX.sr) / EX.hop);
      c.text(8, 20, `${t.toFixed(1)} s → ${n0(fr)} mel frames`, { size: 14, weight: 700, tone: "predict" });
      // AR chain
      const n = 12, cw = 40;
      c.text(8, 52, "autoregressive", { size: 13, weight: 700, tone: "take", dim: s === 2 });
      for (let i = 0; i < n; i++) {
        const b = c.box({ x: 130 + i * 41, y: 36, w: cw - 8, h: 26, label: i === n - 1 ? "…" : "", tone: "take", hl: s === 1 && i < 6, dim: s === 2 });
        if (i) c.arrow(130 + i * 41 - 8, 49, 130 + i * 41 - 1, 49, { tone: "take", dim: s === 2, snap: false });
      }
      c.text(130, 82, `${n0(fr)} steps, each waits for the last`, { size: 12, tone: "muted", dim: s === 2 });
      // NAR
      c.text(8, 122, "parallel", { size: 13, weight: 700, tone: "code", dim: s === 1 });
      for (let i = 0; i < n; i++) c.box({ x: 130 + i * 41, y: 106, w: cw - 8, h: 26, label: i === n - 1 ? "…" : "", tone: "code", hl: s === 2, dim: s === 1 });
      c.text(130, 152, "durations first, then all frames at once", { size: 12, tone: "muted", dim: s === 1 });
      if (s >= 3) {
        const ar = RTF_AR * t, nar = RTF_NAR * t;
        c.bars({ x: 8, y: 178, w: 620, rowH: 40, labelW: 190, max: Math.max(ar, 1), fmt: (v) => `${v < 0.1 ? v.toFixed(3) : v.toFixed(2)} s`, tones: ["predict"],
          rows: [{ label: "Transformer TTS (AR)", values: [ar], hl: s === 4 }, { label: "FastSpeech 2 (parallel)", values: [nar], hl: s === 4 }] });
        c.text(8, 282, "total time to synthesize, V100, with vocoder", { size: 12, tone: "muted" });
      }
      if (s >= 5) c.box({ x: 8, y: 300, w: 300, h: 48, label: "price: durations needed", size: 14, tone: "bad", hl: s === 5 });
      if (s >= 6) c.box({ x: 332, y: 300, w: 300, h: 48, label: "streaming: first audio fast, RTF < 1", size: 14, tone: "predict", hl: true });
    };
  };

  // ---------------------------------------------------------------- 5 Tacotron attention
  // Soft diagonal alignment: rows = characters, cols = frames.
  P4.align = (rows, cols, mode) => (i, j) => {
    let center;
    if (mode === "skip") center = j < cols * 0.45 ? (j / cols) * rows : Math.min(rows - 1, (j / cols) * rows + rows * 0.28);
    else if (mode === "repeat") { const jj = j < cols * 0.5 ? j : j < cols * 0.7 ? j - cols * 0.25 : j - cols * 0.25; center = (jj / cols) * rows * 1.33; if (j >= cols * 0.5 && j < cols * 0.55) center = (cols * 0.5 / cols) * rows * 1.33; }
    else if (mode === "stall") center = Math.min(rows * 0.62, (j / cols) * rows * 1.1);
    else center = (j / (cols - 1)) * (rows - 1);
    const d = i - center;
    return Math.exp(-(d * d) / 1.2);
  };

  D["tacotron-attention"] = (fig, k) => {
    const c = k.canvas(W, H);
    const chars = "your balance".split("");
    return (s) => {
      c.clear();
      const enc = c.box({ x: 8, y: 12, w: 170, h: 54, label: "encoder", sub: "conv + BiLSTM", tone: "paper", hl: s === 1 });
      const att = c.box({ x: 210, y: 12, w: 190, h: 54, label: "attention", sub: "location-sensitive", tone: "predict", hl: s === 2 || s === 3, dim: s < 2 });
      const dec = c.box({ x: 432, y: 12, w: 200, h: 54, label: "decoder → 1 frame", sub: "every 12.5 ms", tone: "take", hl: s === 2, dim: s < 2 });
      c.connect(enc, att, { dim: s < 2 }); c.connect(att, dec, { dim: s < 2 });
      if (s >= 2) {
        const rows = chars.length, cols = 30, cw = 12, ch = 15, x0 = 150, y0 = 96;
        const show = s === 2 ? 8 : cols;
        chars.forEach((ch_, i) => c.text(x0 - 8, y0 + i * ch + 13, ch_ === " " ? "␣" : ch_, { size: 12, mono: true, anchor: "end", tone: "muted" }));
        P4.heat(c, k, { x: x0, y: y0, rows, cols: show, cw, ch, val: P4.align(rows, cols, "ok"), tone: () => (s >= 4 ? "code" : "predict") });
        c.text(x0, y0 + rows * ch + 18, "decoder frames →", { size: 12, tone: "muted" });
        c.text(18, y0 + 50, "chars ↓", { size: 12, tone: "muted" });
        if (s >= 4) c.label(x0 + cols * cw + 10, y0 + 100, "healthy", { size: 13, tone: "code", weight: 700 });
      }
      if (s >= 5) {
        const pr = [0.01, 0.02, 0.03, 0.08, 0.31, 0.62];
        pr.forEach((p, i) => c.box({ x: 150 + i * 62, y: 322, w: 56, h: 30, label: p.toFixed(2), mono: true, size: 13, tone: p > 0.5 ? "bad" : "muted", hl: p > 0.5 }));
        c.text(140, 342, "stop token", { size: 13, anchor: "end", weight: 700, tone: "bad" });
        c.label(150 + 6 * 62, 342, "> 0.5 → stop", { size: 12, tone: "bad" });
      }
    };
  };

  // ---------------------------------------------------------------- 6 attention failures
  D["attention-failures"] = (fig, k) => {
    const mode = k.toggle({ label: "alignment", options: ["healthy", "skip", "repeat", "stall"], value: "healthy" });
    k.follow(mode, { 1: "healthy", 2: "skip", 3: "repeat", 4: "healthy", 5: "healthy", 6: "healthy" });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const m = mode.value, rows = 10, cols = 28;
      const tone = m === "healthy" ? "code" : "bad";
      if (s <= 3) {
        const x0 = 70, y0 = 30, cw = 18, ch = 22;
        P4.heat(c, k, { x: x0, y: y0, rows, cols, cw, ch, val: P4.align(rows, cols, m === "healthy" ? "ok" : m), tone: () => tone });
        c.text(x0, y0 + rows * ch + 20, "frames →", { size: 12, tone: "muted" });
        c.text(x0 - 8, y0 + 14, "words ↓", { size: 12, tone: "muted", anchor: "end" });
        const msg = { healthy: "every word once, in order", skip: "jumps ahead: a word is never said", repeat: "slides back: a word is said twice", stall: "stuck: the stop token may never fire" }[m];
        c.box({ x: x0, y: 300, w: 500, h: 44, label: msg, size: 14, tone, hl: true });
      } else {
        c.text(8, 22, "50 hard sentences: % with a skip or repeat", { size: 13, weight: 700 }); // FBU arXiv:1905.09263 Table 3
        c.bars({ x: 8, y: 36, w: 620, rowH: 46, labelW: 170, max: 40, fmt: (v) => `${v}%`, tones: ["bad"],
          rows: [{ label: "Tacotron 2", values: [24], hl: s === 4 }, { label: "Transformer TTS", values: [34], hl: s === 4 }, { label: "FastSpeech", values: [0], hl: s >= 5 }] });
        if (s >= 5) c.box({ x: 8, y: 200, w: 624, h: 44, label: "fixes: monotonic attention · alignment frameworks · explicit durations", size: 13, tone: "code", hl: s === 5 }); // §5.2.4
        if (s >= 6) c.box({ x: 8, y: 262, w: 624, h: 44, label: "hard set: single letters, spellings, repeated numbers", size: 13, tone: "predict", hl: true });
      }
    };
  };

  // ---------------------------------------------------------------- 7 Transformer TTS
  D["transformer-tts"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      c.text(8, 20, "Tacotron 2", { size: 13, weight: 700, tone: "muted" });
      c.text(330, 20, "Transformer TTS", { size: 13, weight: 700, tone: "take" });
      const l1 = c.box({ x: 8, y: 30, w: 140, h: 46, label: "RNN encoder", size: 13, tone: "muted", dim: s >= 1 });
      const l2 = c.box({ x: 160, y: 30, w: 140, h: 46, label: "RNN decoder", sub: "attention", size: 13, tone: "muted", dim: s >= 1 });
      c.connect(l1, l2);
      const r1 = c.box({ x: 330, y: 30, w: 140, h: 46, label: "self-attn encoder", size: 13, tone: "take", hl: s === 1 });
      const r2 = c.box({ x: 492, y: 30, w: 140, h: 46, label: "self-attn decoder", sub: "multi-head", size: 13, tone: "take", hl: s === 1 || s === 5 });
      c.connect(r1, r2);
      if (s >= 2) {
        const p = c.box({ x: 330, y: 100, w: 140, h: 36, label: "phonemes in", size: 13, tone: "paper", hl: s === 2 });
        const w = c.box({ x: 492, y: 100, w: 140, h: 36, label: "WaveNet vocoder", size: 13, tone: "bridge", hl: s === 2 });
      }
      if (s >= 3) {
        c.text(8, 172, "training speed vs Tacotron 2", { size: 13, weight: 700 }); // FBU arXiv:1809.08895
        c.bars({ x: 8, y: 182, w: 300, rowH: 34, labelW: 120, max: 4.5, fmt: (v) => `${v}×`, tones: ["code"],
          rows: [{ label: "Tacotron 2", values: [1] }, { label: "Transformer", values: [4.25], hl: s === 3 }] });
      }
      if (s >= 4) {
        c.text(330, 172, "MOS", { size: 13, weight: 700 }); // FBU arXiv:1809.08895
        c.bars({ x: 330, y: 182, w: 300, rowH: 34, labelW: 120, max: 5, fmt: (v) => v.toFixed(2), tones: ["paper"],
          rows: [{ label: "Transformer", values: [4.39], hl: s === 4 }, { label: "recordings", values: [4.44] }] });
      }
      if (s >= 5) c.box({ x: 8, y: 270, w: 624, h: 36, label: "inference: still one frame after another", size: 14, tone: "bad", hl: s === 5 });
      if (s >= 6) c.box({ x: 8, y: 316, w: 624, h: 36, label: "survey: \"4.25× faster\" · source: training speed", size: 14, tone: "predict", hl: true });
    };
  };

  // ---------------------------------------------------------------- 8 length regulator
  D["length-regulator"] = (fig, k) => {
    const al = k.slider({ label: "α (duration ×)", min: 0.3, max: 1.5, step: 0.1, value: 1.0, fmt: (v) => v.toFixed(1) });
    k.follow(al, { 1: 1.0, 2: 1.0, 3: 1.0, 4: 1.3, 6: 0.3, 7: 1.0 });
    const c = k.canvas(W, H);
    const D0 = [2, 2, 3, 1]; // FBU arXiv:1905.09263 §3.2
    const tones = ["paper", "take", "code", "predict"];
    return (s) => {
      c.clear();
      if (s === 7) { // padding masks for a batch of 3 lines (made-up lengths)
        const L = [9, 6, 4], T = 9;
        c.text(8, 22, "a batch of 3 phoneme sequences, padded to T_ph = 9", { size: 13, weight: 700 });
        L.forEach((n, b) => { for (let t = 0; t < T; t++) c.box({ x: 70 + t * 52, y: 40 + b * 50, w: 46, h: 38, label: t < n ? "ph" : "pad", size: 12, mono: true, tone: t < n ? "paper" : "muted", dashed: t >= n }); c.text(60, 64 + b * 50, `b${b}`, { size: 12, anchor: "end", mono: true }); });
        c.text(8, 210, "mask = [[1,1,1,1,1,1,1,1,1], [1,1,1,1,1,1,0,0,0], [1,1,1,1,0,0,0,0,0]]", { size: 12, mono: true, tone: "code", maxW: 624, lines: 2 });
        c.box({ x: 8, y: 250, w: 624, h: 40, label: "attention: padded keys → −∞ before softmax", size: 14, tone: "code", hl: true });
        c.box({ x: 8, y: 302, w: 624, h: 40, label: "loss: average over real mel frames only (B, T_mel mask)", size: 14, tone: "code", hl: true });
        return;
      }
      const a = +al.value.toFixed(1), Dr = D0.map((d) => Math.round(d * a + 1e-9));
      c.text(8, 22, "phoneme hidden states", { size: 13, weight: 700, tone: "muted" });
      D0.forEach((d, i) => {
        c.box({ x: 8 + i * 70, y: 32, w: 60, h: 38, label: `h${i + 1}`, mono: true, size: 15, tone: tones[i], hl: s === 1 });
        c.box({ x: 8 + i * 70, y: 78, w: 60, h: 26, label: s >= 4 ? `${(d * a).toFixed(1)}→${Dr[i]}` : `d=${d}`, mono: true, size: 12, tone: Dr[i] === 0 ? "bad" : "muted", hl: s === 1 || (s >= 4 && Dr[i] === 0) });
      });
      c.text(300, 56, `α = ${a.toFixed(1)}  →  D = [${Dr.join(", ")}]`, { size: 15, mono: true, weight: 700, tone: "predict" });
      if (s >= 2) {
        c.text(8, 140, `expanded: ${Dr.reduce((x, y) => x + y, 0)} frames`, { size: 13, weight: 700, tone: "muted" });
        let x = 8;
        Dr.forEach((d, i) => { for (let r = 0; r < d; r++) { c.box({ x, y: 150, w: 44, h: 34, label: `h${i + 1}`, mono: true, size: 13, tone: tones[i], hl: s === 2 }); x += 48; } });
        const lost = Dr.map((d, i) => (d === 0 ? `h${i + 1}` : null)).filter(Boolean);
        if (lost.length) c.box({ x: 8, y: 196, w: 624, h: 34, label: `${lost.join(", ")} rounded to 0 frames: that sound is gone`, size: 14, tone: "bad", hl: true });
      }
      if (s >= 3) {
        const fr = Math.round(EX.frames * a);
        c.box({ x: 8, y: 248, w: 624, h: 44, label: `our line: ${P4.nPh} phonemes → ≈ ${fr} frames (${(fr * EX.hop / EX.sr).toFixed(2)} s)`, size: 15, mono: true, tone: "take", hl: s === 3 });
      }
      if (s >= 5) c.box({ x: 8, y: 306, w: 624, h: 42, label: "durations from an autoregressive teacher's attention", size: 14, tone: "muted", hl: s === 5 });
    };
  };

  // ---------------------------------------------------------------- 9 one-to-many
  D["one-to-many"] = (fig, k) => {
    const c = k.canvas(W, H);
    const N = 40, xs = Array.from({ length: N }, (_, i) => i / (N - 1));
    const base = (x) => 200 + 10 * Math.sin(x * 9);
    const rise = xs.map((x) => base(x) + (x > 0.6 ? 380 * (x - 0.6) ** 2 * 3 : 0)); // illustrative
    const fall = xs.map((x) => base(x) - (x > 0.6 ? 380 * (x - 0.6) ** 2 * 3 : 0));
    const mean = rise.map((v, i) => (v + fall[i]) / 2);
    return (s) => {
      c.clear();
      if (s <= 3) {
        const ser = [];
        if (s >= 2) ser.push({ x: xs, y: rise, tone: "take", label: "question ↗", labelAt: 28, width: 2.4, dim: s === 3 }, { x: xs, y: fall, tone: "paper", label: "statement ↘", labelAt: 28, width: 2.4, dim: s === 3 });
        if (s >= 3) ser.push({ x: xs, y: mean, tone: "bad", label: "L2 average: flat", labelAt: 20, width: 3 });
        if (s === 1) ser.push({ x: xs, y: xs.map(base), tone: "muted", dash: true });
        c.plot({ series: ser, xmin: 0, xmax: 1, ymin: 100, ymax: 300, h: 300, xlabel: "time through \"…£1,250.75?\"", ylabel: "pitch (Hz, made up)", xFmt: () => "" });
        if (s === 1) c.box({ x: 70, y: 310, w: 560, h: 40, label: "one text → many valid ways to say it", size: 14, tone: "predict", hl: true });
        if (s === 3) c.box({ x: 70, y: 310, w: 560, h: 40, label: "mean of rise and fall = no intonation", size: 14, tone: "bad", hl: true });
        if (s === 2) c.box({ x: 70, y: 310, w: 560, h: 40, label: "both are correct targets", size: 14, tone: "code", hl: true });
      } else {
        c.text(8, 22, "pitch standard deviation σ (higher = livelier)", { size: 13, weight: 700 }); // FBU arXiv:2006.04558 Table 3
        c.bars({ x: 8, y: 36, w: 620, rowH: 40, labelW: 170, max: 60, fmt: (v) => v.toFixed(1), tones: ["paper"],
          rows: [{ label: "recordings", values: [54.4] }, { label: "Tacotron 2", values: [44.1], hl: s === 4 }, { label: "Transformer TTS", values: [40.8], hl: s === 4 },
            { label: "FastSpeech", values: [50.8], dim: s === 4 }, { label: "FastSpeech 2", values: [54.1], hl: s === 5, dim: s === 4 }] });
        if (s >= 5) c.box({ x: 8, y: 256, w: 624, h: 44, label: "fix 1: give pitch as input · fix 2: model the distribution", size: 14, tone: "code", hl: true });
      }
    };
  };

  // ---------------------------------------------------------------- 10 variance adaptor
  D["variance-adaptor"] = (fig, k) => {
    const mode = k.toggle({ label: "mode", options: ["training", "inference"], value: "training" });
    k.follow(mode, { 1: "training", 2: "training", 3: "inference", 4: "inference", 5: "training" });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const inf = mode.value === "inference";
      const enc = c.box({ x: 8, y: 16, w: 120, h: 50, label: "encoder", sub: "phonemes", tone: "paper" });
      const preds = [["duration", "aligner"], ["pitch", "from audio"], ["energy", "from audio"]];
      const bx = preds.map(([l, src], i) => c.box({ x: 168 + i * 130, y: 16, w: 120, h: 50, label: l, sub: inf ? "predicted" : src, tone: inf ? "take" : "code", hl: s === 1 || s === 2 || s === 3 }));
      c.connect(enc, bx[0]); c.connect(bx[0], bx[1]); c.connect(bx[1], bx[2]);
      const dec = c.box({ x: 568, y: 16, w: 64, h: 50, label: "mel", tone: "take" });
      c.connect(bx[2], dec);
      if (s >= 2) c.text(168, 88, inf ? "2-layer 1D-conv predictors fill in the values" : "ground-truth values from the recording", { size: 13, tone: inf ? "take" : "code", weight: 700 });
      if (s === 4) {
        const n = 16;
        for (let i = 0; i < n; i++) c.box({ x: 168 + i * 24, y: 104, w: 20, h: 28, label: "", tone: i % 3 ? "predict" : "paper", r: 3, hl: true });
        c.text(168, 152, "each frame's value → 1 of 256 bins → embedding, added", { size: 13, tone: "predict" });
      }
      if (s >= 5) {
        c.text(8, 176, "MOS, all with Parallel WaveGAN (95% CI ≈ ±0.08)", { size: 13, weight: 700 }); // FBU arXiv:2006.04558 Table 1
        c.bars({ x: 8, y: 186, w: 400, rowH: 28, labelW: 150, max: 4.5, fmt: (v) => v.toFixed(2), tones: ["paper"],
          rows: [["recordings", 4.30], ["GT mel + PWG", 3.92], ["Tacotron 2", 3.70], ["FastSpeech", 3.68], ["FastSpeech 2", 3.83]].map(([l, v]) => ({ label: l, values: [v], hl: l === "FastSpeech 2" || l === "FastSpeech" })) });
        c.text(430, 176, "training hours", { size: 13, weight: 700 }); // FBU Table 2
        c.bars({ x: 430, y: 186, w: 200, rowH: 40, labelW: 70, max: 60, fmt: (v) => `${v} h`, tones: ["code"],
          rows: [{ label: "FS", values: [53.12] }, { label: "FS2", values: [17.02], hl: true }] });
      }
      if (s >= 6) c.box({ x: 430, y: 290, w: 202, h: 60, label: "teacher output is smoothed: drop it", size: 13, tone: "predict", hl: true });
    };
  };

  // ---------------------------------------------------------------- 11 Glow-TTS MAS
  D["glow-tts-mas"] = (fig, k) => {
    const c = k.canvas(W, H);
    const R = 4, C = 10, r = V.rng(7);
    // made-up log-likelihoods with a planted monotonic structure
    const truth = [0, 0, 0, 1, 1, 2, 2, 2, 2, 3];
    const L = Array.from({ length: R }, (_, i) => Array.from({ length: C }, (_, j) => +(-(Math.abs(i - truth[j]) * 2.2) - r() * 1.2).toFixed(1)));
    // DP: Q(i,j) = max(Q(i-1,j-1), Q(i,j-1)) + L(i,j); start (0,0), end (R-1,C-1)
    const Q = Array.from({ length: R }, () => Array(C).fill(-Infinity));
    Q[0][0] = L[0][0];
    for (let j = 1; j < C; j++) for (let i = 0; i < R; i++) {
      const stay = Q[i][j - 1], move = i ? Q[i - 1][j - 1] : -Infinity;
      Q[i][j] = Math.max(stay, move) + L[i][j];
    }
    const path = []; let i = R - 1;
    for (let j = C - 1; j >= 0; j--) { path[j] = i; if (j && i && Q[i - 1][j - 1] >= Q[i][j - 1]) i--; }
    const dur = Array(R).fill(0); path.forEach((p) => dur[p]++);
    const ph = ["Y", "AO", "R", "B"];
    return (s) => {
      c.clear();
      if (s === 1) {
        const a = c.box({ x: 20, y: 60, w: 180, h: 60, label: "mel frames", sub: "80 × T_mel", tone: "bridge" });
        const f = c.box({ x: 240, y: 60, w: 160, h: 60, label: "normalizing flow", sub: "invertible", tone: "take", hl: true });
        const z = c.box({ x: 440, y: 60, w: 180, h: 60, label: "latent z", sub: "same shape", tone: "take" });
        c.connect(a, f); c.connect(f, z);
        c.box({ x: 20, y: 170, w: 600, h: 50, label: "no attention, no external aligner", size: 15, tone: "code", hl: true });
        return;
      }
      const showQ = s >= 3, mat = showQ ? Q : L;
      c.text(80, 22, showQ ? "Q: best path score so far" : "log-likelihood of frame j under phoneme i (made up)", { size: 13, weight: 700, tone: showQ ? "predict" : "muted" });
      c.matrix({ x: 80, y: 46, data: mat, cell: 54, cellH: 36, fmt: (v) => (Number.isFinite(v) ? v.toFixed(1) : "–"), rowLabels: ph, colLabels: Array.from({ length: C }, (_, j) => `f${j + 1}`),
        tone: (ii, jj) => (s >= 4 && path[jj] === ii ? "code" : null) });
      if (s >= 4) c.text(80, 214, `durations from the path: [${dur.join(", ")}]`, { size: 14, mono: true, weight: 700, tone: "code" });
      if (s >= 5) c.box({ x: 8, y: 236, w: 300, h: 50, label: "O(T_text × T_mel), < 20 ms/iter, CPU", size: 13, tone: "muted", hl: s === 5 });
      if (s >= 5) c.box({ x: 332, y: 236, w: 300, h: 50, label: "inference: duration predictor", size: 13, tone: "take", hl: s === 5 });
      if (s >= 6) c.box({ x: 8, y: 300, w: 624, h: 48, label: "15.7× faster than Tacotron 2 · robust past 260 characters", size: 14, tone: "code", hl: true }); // FBU arXiv:2005.11129 §5.2
    };
  };

  // ---------------------------------------------------------------- 12 VITS
  D["vits"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const post = c.box({ x: 8, y: 14, w: 180, h: 50, label: "posterior encoder", sub: "linear spec → z", tone: "bridge", hl: s === 2, dashed: true, dim: s < 2 });
      const z = c.box({ x: 230, y: 14, w: 90, h: 50, label: "z", mono: true, tone: "take", hl: s === 1 });
      const dec = c.box({ x: 360, y: 14, w: 150, h: 50, label: "decoder", sub: "HiFi-GAN-style", tone: "code", hl: s === 4, dim: s < 4 && s !== 1 });
      const wav = c.box({ x: 540, y: 14, w: 92, h: 50, label: "wave", tone: "bridge", dim: s < 4 && s !== 1 });
      c.connect(post, z, { dim: s < 2 }); c.connect(z, dec, { dim: s < 4 && s !== 1 }); c.connect(dec, wav, { dim: s < 4 && s !== 1 });
      const txt = c.box({ x: 8, y: 104, w: 180, h: 50, label: "text encoder", sub: "phonemes", tone: "paper", hl: s === 3, dim: s < 3 });
      const fl = c.box({ x: 230, y: 104, w: 160, h: 50, label: "flow + MAS", sub: "prior ↔ z", tone: "take", hl: s === 3, dim: s < 3 });
      c.connect(txt, fl, { dim: s < 3 });
      c.connect(fl, z, { dim: s < 3 });
      const du = c.box({ x: 420, y: 104, w: 212, h: 50, label: "stochastic durations", sub: "varied rhythm", tone: "predict", hl: s === 5, dim: s < 5 });
      if (s >= 4) c.box({ x: 360, y: 70, w: 150, h: 24, label: "discriminators", size: 12, tone: "bad", hl: s === 4 });
      if (s === 2) c.text(8, 84, "training only", { size: 12, tone: "bridge" });
      if (s >= 6) {
        c.text(8, 176, "MOS on LJ Speech (± ≈ 0.07)", { size: 13, weight: 700 }); // FBU arXiv:2106.06103 Table 1
        c.bars({ x: 8, y: 184, w: 624, rowH: 28, labelW: 250, max: 5, fmt: (v) => v.toFixed(2), tones: ["paper"],
          rows: [["recordings", 4.46], ["VITS", 4.43, 1], ["Glow-TTS + tuned HiFi-GAN", 4.32], ["Tacotron 2 + tuned HiFi-GAN", 4.25], ["Glow-TTS + HiFi-GAN", 4.14], ["Tacotron 2 + HiFi-GAN", 3.77]]
            .map(([l, v, h]) => ({ label: l, values: [v], hl: !!h })) });
      }
    };
  };

  // ---------------------------------------------------------------- 13 diffusion TTS
  D["diffusion-tts"] = (fig, k) => {
    const N = k.toggle({ label: "Grad-TTS steps", options: ["4", "10", "100", "1000"], value: "10" });
    k.follow(N, { 3: "4", 4: "10" });
    const c = k.canvas(W, H);
    // FBU arXiv:2105.06337 Table 2: [RTF, MOS]
    const G = { 4: [0.012, 3.96], 10: [0.033, 4.38], 100: [0.363, 4.38], 1000: [3.663, 4.44] };
    const others = [["Glow-TTS", 0.008, 4.11], ["FastSpeech", 0.004, 3.68], ["Tacotron 2", 0.075, 4.32]];
    return (s) => {
      c.clear();
      if (s <= 2) {
        const tx = c.box({ x: 8, y: 30, w: 150, h: 54, label: "text encoder", sub: "μ (mean mel)", tone: "paper", hl: s === 2 });
        const nz = c.box({ x: 200, y: 30, w: 150, h: 54, label: "μ + noise", tone: "muted", hl: s === 2 });
        const st = c.box({ x: 392, y: 30, w: 110, h: 54, label: "denoise ×N", tone: "take", hl: s === 2 });
        const ml = c.box({ x: 532, y: 30, w: 100, h: 54, label: "mel", tone: "take" });
        c.connect(tx, nz); c.connect(nz, st); c.connect(st, ml);
        c.box({ x: 8, y: 130, w: 300, h: 60, label: "mel: Grad-TTS, DiffTTS", size: 14, tone: "take", hl: s === 1 });
        c.box({ x: 332, y: 130, w: 300, h: 60, label: "waveform: WaveGrad, DiffWave", size: 14, tone: "bridge", hl: s === 1 });
        return;
      }
      const n = +N.value, [rtf, mos] = G[n];
      const p = c.plot({ series: [{ x: [4, 10, 100, 1000].map((v) => G[v][0]), y: [4, 10, 100, 1000].map((v) => G[v][1]), tone: "take", dots: true, label: "Grad-TTS", labelAt: 3 }],
        xlog: true, xmin: 0.003, xmax: 5, ymin: 3.5, ymax: 4.6, h: 300, xlabel: "real-time factor (log; lower is faster)", ylabel: "MOS" });
      others.forEach(([l, x, y]) => { c.dot(p.X(x), p.Y(y), { tone: "muted", r: 5 }); c.label(p.X(x) + 6, p.Y(y) - 8, l, { size: 12, tone: "muted" }); });
      c.line(p.X(0.003), p.Y(4.53), p.X(5), p.Y(4.53), { tone: "code", dash: true });
      c.label(p.X(0.004), p.Y(4.53) - 8, "recordings 4.53", { size: 12, tone: "code" });
      c.dot(p.X(rtf), p.Y(mos), { tone: "predict", r: 8 });
      c.label(p.X(rtf) + 10, p.Y(mos) + 18, `N = ${n}: RTF ${rtf}, MOS ${mos}`, { size: 13, tone: "predict", weight: 700 });
      if (s >= 5) c.box({ x: 70, y: 312, w: 560, h: 40, label: s >= 6 ? "N is a serving-time latency knob" : "ProDiff · InferGrad: fewer steps", size: 14, tone: s >= 6 ? "predict" : "code", hl: true });
    };
  };

  // ---------------------------------------------------------------- 14 datasets
  D["tts-datasets"] = (fig, k) => {
    const c = k.canvas(W, H);
    // §5.2.2 (LJ Speech ≈ 24 h); Table 5 hours
    const rows = [["LJ Speech", 24, 1], ["LibriTTS", 585, 2], ["CMU ARCTIC", 20, 3], ["L2-ARCTIC", 11.2, 3], ["AISHELL-3", 85, 4], ["AISHELL-4", 120, 4], ["VCTK", 44, 0]];
    return (s) => {
      c.clear();
      c.text(8, 22, "hours of speech", { size: 13, weight: 700 });
      c.bars({ x: 8, y: 34, w: 624, rowH: 38, labelW: 130, max: 600, fmt: (v) => `${v} h`, tones: ["bridge"],
        rows: rows.map(([l, v, st]) => ({ label: l, values: [v], hl: s === st, dim: st === 0 || (s < 5 && st > s) })) });
      if (s >= 5) c.box({ x: 260, y: 306, w: 372, h: 44, label: "one voice ≠ cloning unseen voices", size: 14, tone: "predict", hl: true });
    };
  };
})();
