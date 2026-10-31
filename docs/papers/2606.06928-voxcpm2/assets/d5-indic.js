/* Drawings: "Scaling to Indic languages". Numbers from papers found by us carry the paper's name. */
(function () {
  const D = RD.drawings, V = RD.vox, W = V.W, H = V.H;

  D["indic-status"] = (fig, k) => {
    const c = k.canvas(W, H);
    const L = [["Hindi", "trained", "code"], ["Bengali", "—", "muted"], ["Marathi", "—", "muted"], ["Gujarati", "—", "muted"], ["Telugu", "planned", "predict"],
      ["Tamil", "planned", "predict"], ["Kannada", "planned", "predict"], ["Malayalam", "—", "muted"], ["Odia", "—", "muted"], ["Punjabi", "—", "muted"]];
    return (s) => {
      c.clear();
      L.forEach(([n, st, tone], i) => {
        const x = 8 + (i % 5) * 126, y = 20 + Math.floor(i / 5) * 84;
        const show = st === "trained" ? true : st === "planned" ? s >= 4 : s >= 1;
        c.box({ x, y, w: 118, h: 70, label: n, sub: show ? (st === "planned" && s < 4 ? "—" : st) : "", tone: s >= 4 || st === "trained" ? tone : "muted", hl: (s === 1 && st === "trained") || (s === 4 && st === "planned") });
      });
      if (s >= 2) c.box({ x: 8, y: 200, w: 300, h: 50, label: "unseen Czech 24.13% · Romanian 21.58%", size: 13, tone: "predict", hl: s === 2 }); // Table 6
      if (s >= 3) c.box({ x: 324, y: 200, w: 308, h: 50, label: "unseen script too: Telugu has 0 tokens", size: 13, tone: "bad", hl: s === 3 });
      if (s >= 5) c.box({ x: 8, y: 276, w: 624, h: 56, label: "wait months for the release, or build with your own data", size: 14, tone: "take", hl: true });
    };
  };

  D["tokenizer"] = (fig, k) => {
    const T = k.toggle({ label: "line", options: ["Hindi", "Telugu"], value: "Hindi" });
    k.follow(T, { 1: "Hindi", 3: "Hindi", 4: "Telugu" });
    const c = k.canvas(W, H);
    // counted by us from tokenizer.json (HF rev 32279ef): Devanagari 15, Bengali 4, Tamil 1, Telugu 0 entries
    const HI = ["▁", "न", "म", "स", "्", "त", "े", "▁", "<b>", "<b>", "<b>", "प", "▁", "क", "<b>", "<b>", "<b>", "स", "े", "▁", "ह", "<b>", "<b>", "<b>", "ं"]; // आ and ै are not in the vocab
    const TE = ["▁"].concat(Array.from({ length: 21 }, () => "<b>"), ["…"]);
    return (s) => {
      c.clear();
      if (s <= 2) {
        V.tbars(c, [["Devanagari", 15, s === 1, false], ["Bengali", 4, false, false], ["Tamil", 1, false, false], ["Telugu", 0.05, s === 1, false]],
          { y: 40, h: 170, labelW: 120, tone: "paper", fmt: (v) => (v < 1 ? "0" : String(v)), max: 20 });
        c.text(632, 22, "vocab entries with that script (of 73,440)", { size: 12, anchor: "end", weight: 700 });
        if (s === 2) c.chips({ x: 8, y: 250, items: [{ t: "న", tone: "paper" }, { t: "→", tone: "muted" }, ...["<0xE0>", "<0xB0>", "<0xA8>"].map((t) => ({ t, tone: "bad", hl: true }))], size: 16, h: 36 });
        return;
      }
      const te = T.value === "Telugu";
      c.text(8, 26, te ? "నమస్కారం మీరు ఎలా ఉన్నారు · 25 characters" : "नमस्ते आप कैसे हैं · 18 characters", { size: 16, weight: 700, tone: "paper" });
      c.chips({ x: 8, y: 44, items: (te ? TE : HI).map((t) => ({ t, tone: t === "<b>" ? "bad" : t === "…" ? "muted" : "code" })), size: 14, h: 30, maxW: 620 });
      c.box({ x: 8, y: 196, w: 300, h: 60, label: te ? "≈ 70 tokens" : "≈ 25 tokens", sub: te ? "66 are byte pieces" : "9 are byte pieces", size: 20, tone: te ? "bad" : "predict", hl: true });
      c.text(330, 222, "<b> = one UTF-8 byte token", { size: 13, tone: "bad" });
      if (s >= 5) c.box({ x: 8, y: 280, w: 624, h: 56, label: "Hindi mostly bytes too, yet CER 0.79% (Gemini judge, Table 8)", size: 14, tone: "code", hl: true });
    };
  };

  D["byte-cost"] = (fig, k) => {
    const n = k.slider({ label: "Telugu characters in a line", min: 10, max: 200, step: 5, value: 40 });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const ch = n.value, tok = Math.round(ch * 70 / 25), nat = ch; // ≈2.8 tokens/char from our count
      V.tbars(c, [["byte tokens today", tok, s === 1, false], ["with native tokens", nat, false, s === 1]], { y: 30, h: 110, labelW: 170, tone: "predict", max: 600, fmt: (v) => String(v) });
      if (s >= 2) c.box({ x: 8, y: 160, w: 300, h: 50, label: "one byte = a third of a letter", size: 13, tone: "bad", hl: s === 2 });
      if (s >= 3) c.box({ x: 324, y: 160, w: 308, h: 50, label: "must learn to spell from bytes", size: 13, tone: "predict", hl: s === 3 });
      if (s >= 4) c.box({ x: 8, y: 226, w: 624, h: 50, label: `retry cap: 6 × ${tok} = ${6 * tok} patches ≈ ${(6 * tok * 0.16).toFixed(0)} s before a retry`, mono: true, size: 13, tone: "bad", hl: s === 4 }); // code core.py:221
      if (s >= 5) c.box({ x: 8, y: 292, w: 624, h: 50, label: "fix: a few hundred new embeddings in a 2B model", size: 14, tone: "code", hl: true });
    };
  };

  D["frontend"] = (fig, k) => {
    const c = k.canvas(W, H);
    const rows = [
      ["Native letters vs romanized", "letters win under 200 chars (MMS)", "code"],
      ["Romanize Hindi (ISO-15919)", "error 0.204 → 0.334 (Praxy)", "bad"],
      ["Extend the vocabulary", "IN-F5: +685 Indic characters", "code"],
      ["Phonological features", "CER −4.97 pts in 22/30 (10 min data)", "predict"],
      ["Our pick for VoxCPM2", "native-character tokens, no G2P", "take"],
    ];
    return (s) => V.board(c, rows, s, { split: 260 });
  };

  D["data-curve"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const p = c.plot({ series: [{ x: [1, 10, 100], y: [59.4, 31.3, 32.6], tone: "paper", dots: true, label: "IN-F5 WER", labelAt: 2 }], // Table 4 IN-F5
        xlog: true, xmin: 0.1, xmax: 3000, ymin: 0, ymax: 70, xlabel: "hours of speech in the new language (log)", ylabel: "WER / CER (%)",
        xFmt: (v) => (v < 1 ? `${v * 60} min` : `${v} h`), yFmt: (v) => v.toFixed(0) });
      if (s === 1) c.label(p.X(1), p.Y(64), "1 h: 59.4%", { size: 14, tone: "bad", weight: 700 });
      if (s === 2) c.label(p.X(30), p.Y(42), "10 h ≈ 100 h", { size: 14, tone: "paper", weight: 700 });
      if (s >= 3) {
        c.dot(p.X(230), p.Y(3.77), { r: 7, tone: "code" }); c.dot(p.X(230), p.Y(4.51), { r: 5, tone: "muted" }); // Tables 10–11 OmniVoice
        c.label(p.X(260), p.Y(14), "OmniVoice te, 230 h: 3.77% (real 4.51%)", { size: 12, tone: "code", weight: 700, anchor: "end" });
      }
      if (s >= 4) {
        c.path(`M${p.X(500)},${p.Y(0)} L${p.X(500)},${p.Y(68)}`, { tone: "predict", dash: true });
        c.path(`M${p.X(1000)},${p.Y(0)} L${p.X(1000)},${p.Y(68)}`, { tone: "take", dash: true });
        c.label(p.X(500), p.Y(60), "docs: 500+ h", { size: 12, tone: "predict", weight: 700, anchor: "end" });
        c.label(p.X(1000), p.Y(50), "VoxCPM2 floor 1K h", { size: 12, tone: "take", weight: 700, anchor: "end" });
      }
      if (s >= 5) { c.path(`M${p.X(0.12)},${p.Y(0)} L${p.X(0.12)},${p.Y(68)}`, { tone: "bad", dash: true }); c.label(p.X(0.2), p.Y(56), "README 5–10 min: a voice", { size: 12, tone: "bad", weight: 700 }); }
    };
  };

  D["indic-data"] = (fig, k) => {
    const T = k.toggle({ label: "show", options: ["studio", "+ restored"], value: "studio" });
    k.follow(T, { 1: "studio", 3: "+ restored" });
    const c = k.canvas(W, H);
    const L = [ // our sums: IndicTTS ~20 + SYSPIN + Rasa (HF); IV-R Table 3
      ["Telugu", 187, 136.4], ["Hindi", 190, 74.6], ["Kannada", 195, 44.61], ["Bengali", 198, 111.99], ["Marathi", 196, 50.9], ["Tamil", 76, 99.47], ["Malayalam", 72, 82.57]];
    return (s) => {
      c.clear();
      const both = T.value !== "studio", hl = { 1: ["Telugu", "Hindi", "Kannada", "Bengali", "Marathi"], 2: ["Tamil", "Malayalam"], 3: ["Telugu", "Bengali"], 4: [], 5: ["Telugu"] }[s];
      c.bars({ x: 8, y: 30, w: 624, rowH: s >= 4 ? 28 : 40, labelW: 100, tones: both ? ["paper", "code"] : ["paper"], max: s >= 5 ? 1000 : 220, fmt: (v) => `${Math.round(v)} h`,
        rows: L.map((r) => ({ label: r[0], values: both ? [r[1], r[2]] : [r[1]], hl: hl.includes(r[0]), dim: hl.length > 0 && !hl.includes(r[0]) })) });
      c.text(632, 18, both ? "public hours: studio (blue) + restored IV-R (green)" : "public studio hours (our sums)", { size: 12, anchor: "end", weight: 700 });
      if (s === 4) c.box({ x: 8, y: 248, w: 624, h: 50, label: "IndicVoices raw: 7,348 h over 22 languages, mostly spontaneous", size: 13, tone: "bridge", hl: true });
      if (s >= 5) c.label(560, 300, "VoxCPM2 floor: 1,000 h", { size: 13, tone: "take", weight: 700, anchor: "end" });
    };
  };

  D["licences"] = (fig, k) => {
    const c = k.canvas(W, H);
    const rows = [
      ["SYSPIN (9 langs, 900+ h)", "CC BY 4.0", "code"],
      ["Rasa · IndicVoices-R", "CC BY 4.0 (Rasa gated)", "code"],
      ["IndicTTS (IIT Madras)", "CC BY + IITM licence", "predict"],
      ["MMS-TTS models", "CC BY-NC: no commercial use", "bad"],
      ["VoxCPM2 code + weights", "Apache 2.0", "code"],
      ["Cloning those speakers", "a separate consent question", "bad"],
    ];
    return (s) => V.board(c, rows, s, { split: 270 });
  };

  D["lora-vs-full"] = (fig, k) => {
    const m = k.toggle({ label: "Kwon et al. metric", options: ["CER (1 speaker)", "SIM (unseen)"], value: "CER (1 speaker)" });
    k.follow(m, { 1: "CER (1 speaker)", 3: "CER (1 speaker)", 4: "SIM (unseen)" });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      if (s <= 2) {
        c.box({ x: 8, y: 20, w: 300, h: 110, label: "full fine-tune", sub: "lr 1e-5 · all weights · ~40 GB", tone: "paper", hl: s === 2 });
        c.box({ x: 324, y: 20, w: 308, h: 110, label: "LoRA r32", sub: "lr 1e-4 · q/k/v/o in 2 LMs + DiT · ~20 GB", tone: "take", hl: s === 1 });
        if (s === 2) c.box({ x: 8, y: 160, w: 624, h: 56, label: "docs: new language → 500+ h, full fine-tune, LoRA r64 otherwise", size: 13, tone: "predict", hl: true });
        return;
      }
      const cer = m.value.startsWith("CER");
      const rows = cer ? [["full fine-tune", 5.67], ["LoRA + adapter", 4.91], ["from scratch", 17.3]] : [["full fine-tune", 0.627], ["LoRA + adapter", 0.641]]; // Tables 1–2 Kwon
      V.title(c, cer ? "Korean CER (%), 12.65 h · lower is better" : "unseen-speaker SIM · higher is better");
      V.tbars(c, rows.map((r, i) => [r[0], r[1], i === 1, false]), { y: 40, h: 150, labelW: 150, tone: cer ? "predict" : "take", fmt: (v) => (cer ? v.toFixed(2) : v.toFixed(3)), max: cer ? 18 : 0.7 });
      if (s >= 5) c.box({ x: 8, y: 220, w: 624, h: 50, label: "full ≈ 40 GB · LoRA ≈ 20 GB (2B model)", size: 14, tone: "muted", hl: s === 5 });
      if (s >= 6) c.box({ x: 8, y: 286, w: 624, h: 50, label: "new Telugu tokens: make their embedding rows trainable", size: 14, tone: "bad", hl: true });
    };
  };

  D["forgetting"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      if (s === 1) { c.box({ x: 8, y: 30, w: 624, h: 70, label: "VoxCPM docs: mix 10–20% Chinese + English into new-language fine-tunes", size: 14, tone: "code", hl: true }); }
      if (s >= 2) {
        const rows = [["plain fine-tune", 7.04, s === 2], ["replay 300 utt (≈1.3%)", 4.02, s === 2], ["joint training", 3.59, s === 3]]; // Table 1 Yang
        V.title(c, "old-language distortion (MCD) · lower is better");
        V.tbars(c, rows.map(([l, v, h]) => [l, v, h, false]), { y: 34, h: 150, labelW: 190, tone: "predict", fmt: (v) => v.toFixed(2), max: 8 });
      }
      if (s >= 4) c.box({ x: 8, y: 210, w: 624, h: 50, label: "VoxCPM2 stage 3: balanced language sampling", size: 14, tone: "take", hl: s === 4 });
      if (s >= 5) c.box({ x: 8, y: 276, w: 624, h: 50, label: "re-run Hindi + English tests after every fine-tune", size: 14, tone: "bad", hl: true });
    };
  };

  D["donor"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      if (s === 1) {
        V.title(c, "IN-F5 MUSHRA · higher is better");
        V.tbars(c, [["English → Indic", 73.4, true], ["English + Indic mixed", 66.2], ["from scratch", 43.2]], { y: 40, h: 160, labelW: 190, tone: "code", max: 80, fmt: (v) => v.toFixed(1) }); // Table 1 IN-F5
        return;
      }
      const lang = (x, y, n, tone, hl) => c.box({ x, y, w: 120, h: 46, label: n, tone, hl });
      const hi = lang(40, 110, "Hindi", "code", s === 3), te = lang(260, 110, "Telugu", "predict", s >= 3);
      const kn = lang(480, 40, "Kannada", "take", s === 5), ta = lang(480, 120, "Tamil", "take", s === 5), ml = lang(480, 200, "Malayalam", "take", s === 5);
      if (s >= 2) c.text(8, 30, "choose donors by shared sounds, not by family alone", { size: 13, weight: 700, tone: "predict" });
      if (s >= 3) c.connect(hi, te, { tone: "code", label: "aspirates, retroflexes" });
      if (s >= 4) c.box({ x: 8, y: 270, w: 624, h: 44, label: "IN-F5: Bhojpuri 83.9 MUSHRA from a sister script + 1 h", size: 13, tone: "code", hl: s === 4 });
      if (s >= 5) [kn, ta, ml].forEach((b) => c.connect(te, b, { tone: "take" }));
      if (s >= 5) c.text(8, 340, "train Dravidian languages as a group", { size: 13, weight: 700, tone: "take" });
    };
  };

  D["indic-expressive"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      V.chain(c, [
        ["Rasa", "≈52 h Telugu", "predict", s === 1],
        ["RASMALAI", "13K h captions", "take", s === 2, s < 2],
        ["screen ASR audio", "emotion classifier", "bridge", s === 3, s < 3],
        ["re-voice style", "new words", "code", s === 4, s < 4],
      ], { y: 30, h: 76, size: 14 });
      if (s >= 2) c.text(8, 140, "RASMALAI captions: speaking rate 97.1% correct, mean pitch 86.2%", { size: 13, tone: "take", weight: 700 }); // Table 6 RASMALAI
      if (s >= 5) {
        [["stage 1", "speak Telugu", "paper"], ["stage 2", "+ Rasa, captions", "take"], ["stage 3", "anneal on cleanest", "code"]].forEach(([a, b, tone], i) =>
          c.box({ x: 8 + i * 212, y: 200, w: 200, h: 70, label: a, sub: b, tone, hl: true }));
      }
    };
  };

  D["rl-indic"] = (fig, k) => {
    const T = k.toggle({ label: "study", options: ["Align2Speak", "CosyVoice 3"], value: "Align2Speak" });
    k.follow(T, { 1: "Align2Speak", 3: "CosyVoice 3", 4: "Align2Speak" });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      if (s === 1) {
        V.chain(c, [["generate", "N samples", "take", true], ["transcribe", "ASR judge", "paper", true], ["reward", "low CER, high SIM", "code", true], ["update", "GRPO", "predict", true]], { y: 60, h: 80 });
        return;
      }
      const a = T.value === "Align2Speak";
      const rows = a ? [["Portuguese, 30 min: before", 33.0], ["after GRPO", 3.94]] : [["Korean: before", 12.8], ["after reward training", 4.02]]; // §3.3 Align2Speak; Table 5 CosyVoice 3
      V.title(c, "CER (%) · lower is better");
      V.tbars(c, rows.map((r, i) => [r[0], r[1], i === 1, false]), { y: 40, h: 120, labelW: 210, tone: "code", max: 35, fmt: (v) => v.toFixed(2) });
      if (s >= 4) c.box({ x: 8, y: 196, w: 624, h: 50, label: "Fish S2 with RL: Hindi WER still 14.64%", size: 14, tone: "bad", hl: s === 4 }); // Table 3 Fish S2
      if (s >= 5) c.box({ x: 8, y: 262, w: 624, h: 50, label: "weak Telugu ASR → model learns to please the judge", size: 14, tone: "predict", hl: true });
    };
  };

  D["codemix"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      c.chips({ x: 8, y: 30, items: [["నువ్వు", "paper"], ["late", "bad"], ["గా", "paper"], ["వచ్చావ్", "paper"], ["bro", "bad"]].map(([t, tone]) => ({ t, tone, hl: s === 1 })), size: 18, h: 40 });
      if (s >= 2) c.chips({ x: 8, y: 90, items: [["నువ్వు", "paper"], ["లేట్", "code"], ["గా", "paper"], ["వచ్చావ్", "paper"], ["బ్రో", "code"]].map(([t, tone]) => ({ t, tone, hl: s === 2 })), size: 18, h: 40 });
      if (s >= 2) c.text(8, 154, "English words in Telugu script · Praxy: error 0.798 → 0.142", { size: 13, tone: "code", weight: 700 });
      if (s >= 3) c.box({ x: 8, y: 172, w: 624, h: 50, label: "Hinglish in Devanagari: MOS 4.65 vs 4.36 Hindi-only", size: 14, tone: "code", hl: s === 3 }); // Table 1 Flipkart
      if (s >= 4) c.box({ x: 8, y: 232, w: 624, h: 50, label: "mixed scripts into VoxCPM2: untested", size: 14, tone: "predict", hl: s === 4 });
      if (s >= 5) c.box({ x: 8, y: 292, w: 624, h: 50, label: "MT step decides per word: translate, transliterate, keep", size: 14, tone: "take", hl: true });
    };
  };

  D["indic-eval"] = (fig, k) => {
    const c = k.canvas(W, H);
    const rows = [
      ["Intelligibility", "CER, strong Indic ASR + real-speech CER", "paper"],
      ["Voice", "SIM to the consented voice", "take"],
      ["Emotion", "classifier on source vs dub", "predict"],
      ["Timing", "dub length ÷ source length", "bridge"],
      ["Listeners", "native N-MOS + emotion MOS", "code"],
      ["Forgetting", "Hindi + English re-tested", "bad"],
    ];
    return (s) => V.board(c, rows, s, { split: 200 });
  };

  D["indic-out"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      V.chain(c, [
        ["Telugu line", "source", "bridge", false],
        ["Telugu ASR", "upstream", "bad", s === 2],
        ["captioner", "hears Telugu", "bad", s === 3],
        ["VoxCPM2", "→ English", "code", s === 1 || s === 4],
      ], { y: 40, h: 76, size: 14 });
      if (s >= 1) c.text(8, 150, "English: WER 1.84% on Seed-TTS-Eval (Table 3)", { size: 13, tone: "code", weight: 700 });
      if (s >= 4) c.box({ x: 8, y: 186, w: 624, h: 50, label: "consented English voice: same-language path, tested", size: 14, tone: "code", hl: s === 4 });
      if (s >= 5) c.box({ x: 8, y: 260, w: 624, h: 60, label: "out of Indic: works now · into Indic: needs training", size: 15, tone: "take", hl: true });
    };
  };

  D["data-budget"] = (fig, k) => {
    const hrs = k.slider({ label: "Telugu hours you have", min: 10, max: 1200, step: 10, value: 190, fmt: (v) => `${v} h` });
    k.follow(hrs, { 1: 190, 2: 330, 3: 600 });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const h = hrs.value;
      const X = (v) => 20 + Math.log10(v / 10) / Math.log10(120) * 600;
      c.line(X(10), 70, X(1200), 70, { tone: "muted", width: 2 });
      [10, 30, 100, 300, 1000].forEach((v) => c.text(X(v), 92, `${v} h`, { size: 11, anchor: "middle", tone: "muted" }));
      [[190, "public studio", "paper"], [330, "+ IV-R", "code"], [500, "docs floor", "predict"]].forEach(([v, l, tone]) => {
        c.line(X(v), 52, X(v), 70, { tone, width: 2 }); c.text(X(v), 44, l, { size: 12, anchor: "middle", tone, weight: 700 });
      });
      c.dot(X(h), 70, { r: 9, tone: "take" });
      const tier = h < 100 ? ["intelligible, studio voices only", "LoRA + new tokens", "bad"] : h < 300 ? ["clear speech, little emotion", "full fine-tune, 10–20% replay", "predict"] : h < 500 ? ["more speakers and accents", "full fine-tune, replay", "paper"] : ["VoxCPM-level coverage", "full fine-tune + stage 2", "code"];
      c.box({ x: 20, y: 120, w: 600, h: 56, label: `${h} h → ${tier[0]}`, sub: tier[1], tone: tier[2], hl: true });
      if (s >= 4) c.box({ x: 20, y: 196, w: 290, h: 50, label: "+ ≈50 h expressive (stage 2)", size: 13, tone: "take", hl: s === 4 });
      if (s >= 5) c.box({ x: 330, y: 196, w: 290, h: 50, label: "anneal + CER reward", size: 13, tone: "code", hl: s === 5 });
      if (s >= 6) c.box({ x: 20, y: 266, w: 600, h: 50, label: "scarce: hours, not GPUs (full FT ≈ 40 GB)", size: 14, tone: "predict", hl: true });
      c.text(20, 344, "tiers are our reading of the evidence, not measured on VoxCPM2", { size: 12, tone: "muted" });
    };
  };
})();
