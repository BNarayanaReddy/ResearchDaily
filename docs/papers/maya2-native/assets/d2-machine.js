/* Drawings: The machine (whole model, normaliser, tokenizer, prompt, audio input, cb0 head, depth decoder). */
(function () {
  const D = RD.drawings, V = RD.maya, W = V.W, H = V.H;

  // Page 7. Parameter counts: our arithmetic from code shapes (backbone/config.json, depth_v2.py:47, audio_io.py:21).
  const PARTS = [
    ["28 layers", 1409.3, "take"],      // 28 x (q 4.19M + k,v 2.1M each + o 4.19M + MLP 37.7M)
    ["depth", 555.0, "paper"],          // §card Architecture "approximately 555M"
    ["text emb.", 398.4, "muted"],      // 194,548 x 2,048, tied with the text head
    ["audio in", 134.2, "bridge"],      // 32 x 2,048 rows x 2,048
  ];
  D["machine"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const n = c.box({ x: 8, y: 40, w: 112, h: 64, label: "normaliser", sub: "rules", tone: "muted", hl: s === 1 });
      const b = c.box({ x: 140, y: 40, w: 170, h: 64, label: "Qwen3 backbone", sub: "28 × 2,048", tone: "take", hl: s === 2, dim: s < 2 });
      const h0 = c.box({ x: 330, y: 40, w: 90, h: 64, label: "cb0 head", sub: "or stop", tone: "predict", hl: s === 3, dim: s < 3 });
      const d = c.box({ x: 440, y: 40, w: 100, h: 64, label: "depth", sub: "codes 1–31", tone: "paper", hl: s === 4, dim: s < 4 });
      const m = c.box({ x: 560, y: 40, w: 72, h: 64, label: "Mimi", sub: "80 ms", tone: "bridge", hl: s === 5, dim: s < 5 });
      c.connect(n, b, { dim: s < 2 }); c.connect(b, h0, { dim: s < 3 }); c.connect(h0, d, { dim: s < 4 }); c.connect(d, m, { dim: s < 5 });
      c.text(8, 22, "our Telugu sentence → 108 frames → 8.64 s", { size: 13, weight: 700, tone: "bridge" });
      if (s >= 2) c.text(140, 130, "steps once per 80 ms frame", { size: 12, tone: "take" });
      if (s >= 4) c.text(440, 130, "31 small steps per frame", { size: 12, tone: "paper" });
      if (s >= 6) {
        c.text(8, 166, "parameters (our count from layer shapes)", { size: 13, weight: 700 });
        V.tbars(c, PARTS.map(([lab, v]) => [lab, v / 1000, lab === "depth", false]), { y: 176, h: 128, labelW: 110, max: 1.5, fmt: (v) => `${v.toFixed(2)}B`, tone: "take" });
        c.text(8, 334, "+ cb0 head 4.2M, anchor 1.2M · sum 2,502,398,656, as in maya3_config.json", { size: 12, tone: "muted", maxW: 624 });
      }
    };
  };

  // Page 8. Before/after pairs copied from the repo's rule table (maya3/text/README.md).
  D["normalize"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      if (s <= 2) {
        c.clear();
        c.text(8, 22, "our sentence (raw)", { size: 13, weight: 700 });
        c.box({ x: 8, y: 34, w: 624, h: 50, label: "… వడ్డీ నిష్పత్తి 3:2 గా ఉండి, 7.25% ఇస్తుంది.", size: 16, tone: "paper" });
        c.box({ x: 120, y: 110, w: 140, h: 44, label: "3:2", mono: true, tone: "predict", hl: true });
        c.box({ x: 380, y: 110, w: 140, h: 44, label: "7.25%", mono: true, tone: "predict", hl: true });
        c.text(190, 176, "ratio? time? score?", { size: 12, anchor: "middle", tone: "muted" });
        c.text(450, 176, "percent, with a decimal", { size: 12, anchor: "middle", tone: "muted" });
        if (s === 2) c.box({ x: 8, y: 210, w: 624, h: 56, label: "normaliser: numbers, currency, dates, URLs, e-mails → words in the request language", tone: "code", hl: true, size: 14 });
        return;
      }
      V.board(c, [
        ["15-08-25 (date)", "fifteen August two thousand twenty five", "code"],
        ["11/26 near 'expiry'", "November two thousand twenty six", "code"],
        ["2023-24 (year range)", "two thousand twenty three twenty four", "code"],
        ["98765 43210", "read digit by digit", "code"],
        ["पिन 4532", "digit by digit, not a cardinal", "code"],
      ], 5, { all: true, split: 220, rowH: 60 });
      if (s >= 4) c.text(632, 340, s === 4 ? "Python: normalize=True" : "we did not run it", { size: 12, anchor: "end", tone: s === 4 ? "predict" : "bad", weight: 700 });
    };
  };

  // Page 9. Token counts measured by us with the tokenizers library on both tokenizer.json files.
  D["tokenizer"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const rows = [
        ["Telugu, Qwen3", 124, s === 1, false], ["Telugu, Maya", 44, s === 3, s < 3],
        ["Tamil, Qwen3", 110, false, s < 3], ["Tamil, Maya", 34, s === 3, s < 3],
        ["Hindi, Qwen3", 83, false, s < 3], ["Hindi, Maya", 43, false, s < 3],
        ["English, Qwen3", 28, s === 4, s < 4], ["English, Maya", 28, s === 4, s < 4],
      ];
      V.title(c, "tokens for the card's sample sentences (raw text)");
      V.tbars(c, rows, { y: 30, h: 240, labelW: 130, max: 130, fmt: (v) => `${v}`, tone: "paper" });
      if (s === 2) c.box({ x: 300, y: 280, w: 332, h: 44, label: "vocab 151,665 → 194,548", mono: true, tone: "take", hl: true, size: 14 });
      if (s >= 5) c.chips({ x: 8, y: 290, items: [{ t: "<|lang:te|>", tone: "take", hl: true }, { t: "<|audio|>", tone: "bridge", hl: true }, { t: "<|spk|>", tone: "muted" }, { t: "<|emo|>", tone: "muted" }, { t: "<|ctl:00|> … <|ctl:31|>", tone: "muted", dashed: true }], size: 13 });
    };
  };

  // Page 10. Prompt layouts from maya3/prompt.py:13 and the named-voice template (README Voices).
  D["prompt"] = (fig, k) => {
    const mode = k.toggle({ label: "voice", options: ["named", "icl_spk"], value: "named" });
    k.follow(mode, { 1: "named", 5: "icl_spk" });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const named = mode.value === "named";
      const items = [];
      if (!named) items.push({ t: "<|lang:hi|>", tone: "take" }, { t: "reference transcript", tone: "paper", dashed: true }, { t: "<|audio|>", tone: "bridge" }, { t: "ref frames", tone: "bridge", dashed: true }, { t: "end", tone: "predict" });
      items.push({ t: "<|lang:te|>", tone: "take", hl: s === 1 });
      if (named && s >= 2) items.push({ t: "{Nivedita}:", tone: "code", hl: s === 2 });
      if (s >= 3 || !named) items.push({ t: "సేవింగ్స్ … ఇస్తుంది. (44 tokens)", tone: "paper", hl: s === 3 }, { t: "<|audio|>", tone: "bridge", hl: s === 3 });
      if (s >= 4 || !named) items.push({ t: "108 frames", tone: "bridge", hl: s === 4 }, { t: "end-of-audio", tone: "predict", hl: s === 4 });
      const ch = c.chips({ x: 8, y: 30, items, size: 14, maxW: 624 });
      c.text(8, 18, named ? "built-in voice: the name selects it" : "clone: a Hindi reference, Telugu target", { size: 13, weight: 700, tone: named ? "code" : "take" });
      const y = Math.max(ch.bottom + 30, 170);
      if (named) c.box({ x: 8, y, w: 624, h: 50, label: "voice memory nulled; no reference audio", tone: "muted", hl: s === 2, size: 14, dim: s < 2 });
      else c.box({ x: 8, y, w: 624, h: 50, label: "+ ECAPA vector of the reference → anchor and depth memory", tone: "take", hl: true, size: 14 });
    };
  };

  // Page 11. audio_io.py: table of 32 x 2,048 rows, sum / sqrt(q), RMSNorm.
  D["audio-in"] = (fig, k) => {
    const q = k.slider({ label: "levels kept", min: 8, max: 32, step: 8, value: 32 });
    k.follow(q, { 1: 32, 4: 16 });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      c.text(8, 20, "one frame: 32 codes → one 2,048-d input vector", { size: 13, weight: 700 });
      for (let l = 0; l < 32; l++) {
        const keep = l < q.value;
        c.add(k.h("rect", { x: 8 + l * 19.5, y: 36, width: 17, height: 30, rx: 2, class: keep ? (l === 0 ? "f-take soft" : "f-paper softer") : "f-muted softer" }));
      }
      c.text(8, 84, s >= 4 ? `${q.value} of 32 codebooks used in this batch` : "codes 0 … 31 of frame t", { size: 12, tone: s >= 4 ? "predict" : "muted" });
      if (s >= 2) {
        const t = c.box({ x: 8, y: 110, w: 300, h: 60, label: "lookup table: 65,536 rows", sub: "2,048 rows per codebook · 134M params", tone: "bridge", hl: s === 2 });
        if (s >= 3) {
          const sm = c.box({ x: 340, y: 110, w: 292, h: 60, label: `sum ÷ √${q.value}, then RMSNorm`, mono: true, tone: "take", hl: s === 3 });
          c.connect(t, sm, { tone: "muted" });
          const o = c.box({ x: 340, y: 210, w: 292, h: 52, label: "backbone input at frame t", tone: "take", hl: s === 3 });
          c.connect(sm, o, { tone: "muted" });
        }
      }
      if (s >= 5) c.box({ x: 8, y: 290, w: 624, h: 50, label: "coarse levels alone must still steer the next frame", tone: "predict", hl: true, size: 14 });
    };
  };

  // Page 12. Head sizes from backbone.py:83 and tokens.py:24; probability bars illustrative.
  D["cb0-head"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const hs = c.box({ x: 8, y: 130, w: 150, h: 60, label: "backbone state", sub: "frame t, 2,048-d", tone: "take" });
      const a = c.box({ x: 200, y: 50, w: 210, h: 60, label: "audio head: 2,049 classes", sub: "2,048 codes + end-of-audio", tone: "predict", hl: s <= 3 });
      c.connect(hs, a, { tone: "muted" });
      if (s >= 4) {
        const t = c.box({ x: 200, y: 220, w: 210, h: 60, label: "text head: 194,548", sub: "on text positions only", tone: "paper", hl: s >= 4 });
        c.connect(hs, t, { tone: "muted" });
      }
      const p = [0.21, 0.14, 0.11, 0.08, 0.06, 0.05, 0.03];
      p.forEach((v, i) => c.add(k.h("rect", { x: 440 + i * 22, y: 110 - v * 300, width: 18, height: v * 300, rx: 2, class: "f-predict soft" })));
      const stopH = s >= 2 ? 0.09 * 300 : 0;
      if (s >= 2) c.add(k.h("rect", { x: 610, y: 110 - stopH, width: 18, height: stopH, rx: 2, class: "f-bad soft" }));
      c.text(440, 128, "codes", { size: 11, tone: "muted" });
      if (s >= 2) c.text(632, 128, "stop", { size: 11, tone: "bad", anchor: "end" });
      if (s >= 3) c.box({ x: 440, y: 150, w: 192, h: 44, label: "stop loss × 3", mono: true, tone: "bad", hl: s === 3, size: 14 });
      if (s >= 5) c.box({ x: 8, y: 300, w: 624, h: 46, label: "text-only batches keep the language model reading Indic text", tone: "paper", hl: true, size: 13 });
    };
  };

  // Page 13. Depth decoder prefix (depth_v2.py:257); sizes depth_v2.py:47.
  D["depth"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const shown = s <= 1 ? 1 : s === 2 ? 2 : 7;
      c.text(8, 20, "inside one frame: the prefix grows one code at a time", { size: 13, weight: 700 });
      for (let i = 0; i < shown; i++) {
        const lab = i === 0 ? "h → 1,024" : `cb${i - 1}`;
        c.box({ x: 8 + i * 78, y: 40, w: 70, h: 44, label: lab, size: 13, tone: i === 0 ? "take" : i === 1 ? "predict" : "paper", hl: i === shown - 1 && s <= 3 });
      }
      if (s >= 3) c.text(8 + 7 * 78 + 6, 66, "…", { size: 18, weight: 700 });
      const tr = c.box({ x: 8, y: 120, w: 624, h: 60, label: s >= 4 ? "4 causal layers · width 1,024 · 16 heads · cross-attends to the voice" : "depth transformer", tone: "paper", hl: s === 4, size: 14 });
      if (s >= 2) {
        const nxt = c.box({ x: 8, y: 220, w: 300, h: 50, label: s >= 3 ? "31 heads: one per level 1–31" : "head 1 → cb1", tone: "paper", hl: s === 2 || s === 3 });
        c.connect(tr, nxt, { tone: "muted" });
      }
      if (s >= 5) c.box({ x: 330, y: 220, w: 302, h: 50, label: "sample: temperature 0.7, top-64", mono: true, tone: "predict", hl: true, size: 13 });
      if (s >= 5) c.text(8, 310, "our clip: 108 frames × 31 = 3,348 depth codes", { size: 14, weight: 700, tone: "paper" });
    };
  };

  // Page 14. GROUP_OF_LEVEL (depth_v2.py:45); positions per frame from _forward_grouped's cost model (:333).
  D["depth-groups"] = (fig, k) => {
    const q = k.slider({ label: "levels q", min: 16, max: 32, step: 8, value: 32 });
    const c = k.canvas(W, H);
    const grp = (l) => (l <= 8 ? l - 1 : l <= 16 ? 8 : l <= 24 ? 9 : 10);
    return (s) => {
      c.clear();
      c.text(8, 20, "levels 1–31 and the trunk (weight set) each uses", { size: 13, weight: 700 });
      for (let l = 1; l <= 31; l++) {
        const g = grp(l), priv = g < 8, x = 8 + (l - 1) * 20;
        const tone = priv ? "take" : ["paper", "code", "bridge"][g - 8];
        const lit = (s === 1 && priv) || (s === 2 && !priv) || s >= 3;
        c.add(k.h("rect", { x, y: 34, width: 17, height: 34, rx: 2, class: `f-${tone} ${lit ? "soft" : "softer"}` }));
      }
      c.text(8, 86, "1–8 private", { size: 12, tone: "take" });
      if (s >= 2) { c.text(168, 86, "9–16 shared", { size: 12, tone: "paper" }); c.text(328, 86, "17–24 shared", { size: 12, tone: "code" }); c.text(488, 86, "25–31 shared", { size: 12, tone: "bridge" }); }
      if (s >= 3) c.box({ x: 8, y: 110, w: 624, h: 44, label: "11 trunks × 4 layers ≈ 461M of the decoder's 555M", tone: "muted", hl: s === 3, size: 14 });
      if (s >= 4) {
        const Q = q.value;
        let loop = 0; for (let L = 1; L < Q; L++) loop += L + 1;
        let grouped = 0; for (let L = 1; L <= Math.min(8, Q - 1); L++) grouped += L + 1;
        [16, 24, 31].forEach((top, i) => { const lo = 9 + 8 * i; if (Q - 1 >= lo) grouped += Math.min(top, Q - 1) + 1; });
        V.tbars(c, [["one pass per level", loop, false, false], ["one pass per trunk", grouped, true, false]], { y: 176, h: 110, labelW: 150, max: 540, fmt: (v) => `${v} positions`, tone: "paper" });
        if (s >= 5) c.text(8, 330, `per frame at q=${Q}: ${grouped} vs ${loop} = ${Math.round((100 * grouped) / loop)}% of the work`, { size: 14, weight: 700, tone: "code" });
      }
    };
  };

  // Page 15. amortize_frac = 0.125 (tts_model_v2.py:60). Frame picks seeded, not Maya's.
  D["amortize"] = (fig, k) => {
    const fr = k.slider({ label: "fraction of frames for depth", min: 1, max: 8, step: 1, value: 1, fmt: (v) => `${v}/8` });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const pick = new Set();
      const r = V.rng(5); const n = Math.max(1, Math.floor(108 * fr.value / 8));
      while (pick.size < n) pick.add(Math.floor(r() * 108));
      c.text(8, 20, "our 108 frames", { size: 13, weight: 700 });
      for (let f = 0; f < 108; f++) {
        const x = 8 + (f % 36) * 17.3, y = 34 + Math.floor(f / 36) * 40;
        const d = s >= 3 && pick.has(f);
        c.add(k.h("rect", { x, y, width: 15, height: 32, rx: 2, class: d ? "f-paper soft" : s >= 1 ? "f-take softer" : "f-muted softer" }));
      }
      c.text(8, 172, "every frame: codebook-0 loss", { size: 12, tone: "take" });
      if (s >= 2) c.box({ x: 8, y: 190, w: 624, h: 44, label: "depth on every frame: 31 levels × 108 frames per clip", tone: "bad", hl: s === 2, size: 14 });
      if (s >= 3) c.text(320, 172, `depth loss: ${n} frames (${fr.value}/8)`, { size: 12, tone: "paper", weight: 700 });
      if (s >= 4) c.box({ x: 8, y: 250, w: 624, h: 44, label: `depth training work: ${Math.round(100 * fr.value / 8)}% of all-frames`, mono: true, tone: "code", hl: s === 4, size: 14 });
      if (s >= 5) c.box({ x: 8, y: 306, w: 624, h: 40, label: "Maya 1/8 · Sesame CSM 1/16 (found by us)", tone: "muted", hl: true, size: 13 });
    };
  };
})();
