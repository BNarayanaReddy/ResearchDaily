/* Drawings: The voice (two doors, anchor, modes, named voices, cloning) and Training tricks (roll-in, corruption, stages). */
(function () {
  const D = RD.drawings, V = RD.maya, W = V.W, H = V.H;

  // Page 16. depth_v2.py:239 speaker memory; anchors.py:3 finding and :27 module.
  D["speaker-doors"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const e = c.box({ x: 8, y: 150, w: 130, h: 60, label: "ECAPA", sub: "192 numbers", tone: "code" });
      const bb = c.box({ x: 230, y: 40, w: 230, h: 70, label: "backbone", sub: "plans codebook 0", tone: "take", hl: s === 3 || s >= 4, dim: s < 2 });
      const dp = c.box({ x: 230, y: 250, w: 230, h: 70, label: "depth decoder", sub: "cross-attends to voice memory", tone: "paper", hl: s === 1 });
      c.connect(e, dp, { tone: "code", label: "door 1" });
      if (s >= 2 && s < 4) c.box({ x: 480, y: 40, w: 152, h: 70, label: "cb0 loss: same with or without voice", tone: "bad", hl: true, size: 13 });
      if (s === 3) c.box({ x: 480, y: 130, w: 152, h: 60, label: "voice-blind planner", tone: "bad", hl: true, size: 13 });
      if (s >= 4) {
        c.connect(e, bb, { tone: "code", label: "door 2: anchor" });
        c.box({ x: 480, y: 40, w: 152, h: 70, label: "added at <|audio|>", mono: true, tone: "code", hl: s === 4, size: 13 });
      }
      if (s >= 5) c.box({ x: 480, y: 250, w: 152, h: 70, label: "both know who speaks", tone: "code", hl: true, size: 13 });
    };
  };

  // Page 17. anchors.py: 192 -> 512 -> 2048, zero-init fc2, null input, 20% dropout. Curve illustrative.
  D["anchor-zero"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const a = c.box({ x: 8, y: 30, w: 120, h: 54, label: "192", sub: "ECAPA", tone: "code" });
      const b = c.box({ x: 168, y: 30, w: 120, h: 54, label: "512", sub: "GELU", tone: "muted" });
      const o = c.box({ x: 328, y: 30, w: 140, h: 54, label: "2,048", sub: s >= 2 ? "weights = 0 at start" : "output", tone: s >= 2 ? "predict" : "take", hl: s === 2 });
      c.connect(a, b, { tone: "muted" }); c.connect(b, o, { tone: "muted" });
      const t = c.box({ x: 508, y: 30, w: 124, h: 54, label: "+ <|audio|>", mono: true, tone: "bridge", hl: s === 1 });
      c.connect(o, t, { tone: "muted" });
      if (s >= 3) {
        const xs = Array.from({ length: 31 }, (_, i) => i);
        c.plot({ series: [{ x: xs, y: xs.map((u) => (u < 1 ? 0 : 1 - Math.exp(-u / 8))), tone: "take", label: "anchor's contribution" }],
          xmin: 0, xmax: 30, ymin: 0, ymax: 1.1, y: 110, h: 240, w: 390, xlabel: "updates after warm start (illustrative)", yFmt: () => "" });
        c.box({ x: 70, y: 124, w: 230, h: 34, label: "step 0: identical to before", tone: "predict", hl: true, size: 12 });
      }
      if (s >= 4) c.box({ x: 410, y: 120, w: 222, h: 60, label: "no voice → learned null input", tone: "muted", hl: s === 4, size: 13 });
      if (s >= 5) c.box({ x: 410, y: 200, w: 222, h: 60, label: "20% of rows: anchor dropped", tone: "bad", hl: true, size: 13 });
    };
  };

  // Page 18. packing_v2.py:3 modes and shares.
  D["modes-mix"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      c.text(8, 20, "training rows by conditioning mode", { size: 13, weight: 700 });
      const cells = [["spk_only", "vector, no clips", 55, "code", 2], ["icl_spk", "clips + vector", 30, "take", 3], ["icl_only", "clips only", 5, "paper", 3], ["joint_null", "neither", 10, "muted", 4]];
      let x = 8;
      cells.forEach(([n, sub, pct, tone, st]) => {
        const w = (pct / 100) * 624;
        c.box({ x, y: 36, w: w - 2, h: 70, label: pct >= 10 ? `${n} ${pct}%` : `${pct}%`, sub: pct >= 30 ? sub : undefined, tone, hl: s === st, dim: s >= 2 && s < st, size: 13 });
        x += w;
      });
      if (s === 1) c.box({ x: 8, y: 140, w: 624, h: 54, label: "switch 1: clips in prompt?   switch 2: voice vector given?", tone: "muted", hl: true, size: 14 });
      if (s === 3) c.box({ x: 8, y: 140, w: 624, h: 54, label: "up to 3 same-speaker reference clips before the target", tone: "take", hl: true, size: 14 });
      if (s >= 4) c.box({ x: 8, y: 140, w: 624, h: 54, label: "neither → unconditioned model: the negative for guidance", tone: "muted", hl: s === 4, size: 14 });
      if (s >= 5) c.box({ x: 8, y: 220, w: 624, h: 60, label: "engine: no guidance scale; named voices use the name prompt", tone: "bad", hl: true, size: 14 });
    };
  };

  // Page 19. Training languages >= 1 h per voice (§card Voices).
  const VOICES = [
    ["Ahana", "bn en gu hi kn ml mr or pa ta te"], ["Vaidehi", "bn en gu hi kn ml mr or pa ta te"], ["Malini", "bn en gu hi kn ml mr or pa ta te"],
    ["Charvi", "bn en gu hi kn ml mr or pa ta te"], ["Jahnavi", "bn en gu hi kn ml mr or ta te"], ["Anirban", "bn en gu hi kn ml mr or pa ta te"],
    ["Nakul", "bn en gu hi kn ml mr or pa ta te"], ["Vasant", "bn en gu hi kn ml mr or ta te"], ["Siddhant", "bn en gu hi kn ml mr or pa ta te"],
    ["Satvik", "bn en gu hi kn ml mr or pa ta te"], ["Abhay", "en hi"], ["Nivedita", "en hi"], ["Ishwari", "hi"], ["Ritvik", "hi"], ["Vrinda", "hi"],
    ["Sreekar", "en hi te"], ["Kayal", "en ta"], ["Shaunak", "en hi"], ["Akshat", "en hi"], ["Tanushree", "en hi"],
  ];
  const LANGS = ["as", "bn", "en", "gu", "hi", "kn", "ml", "mr", "or", "pa", "ta", "te"];
  D["named-voices"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const cw = 31, rh = 15.6, x0 = 110, y0 = 34;
      LANGS.forEach((l, j) => c.text(x0 + j * cw + cw / 2, 24, l, { size: 11, anchor: "middle", mono: true, tone: (s === 3 && l === "te") || (s === 5 && l === "as") ? "predict" : "muted", weight: (s === 3 && l === "te") || (s === 5 && l === "as") ? 700 : 400 }));
      VOICES.forEach(([n, ls], i) => {
        const y = y0 + i * rh, set = ls.split(" ");
        const isN = n === "Nivedita";
        const rowLit = (s <= 3 && isN) || (s === 4 && i < 10);
        c.text(x0 - 8, y + 11.5, n, { size: 11, anchor: "end", tone: rowLit ? "ink" : "muted", weight: rowLit ? 700 : 400, inBox: true });
        LANGS.forEach((l, j) => {
          const on = set.includes(l);
          const target = isN && l === "te" && s >= 1;
          c.add(k.h("rect", { x: x0 + j * cw + 2, y: y + 1, width: cw - 4, height: rh - 3, rx: 2,
            class: target ? "f-predict soft" : on ? (rowLit ? "f-code soft" : "f-code softer") : (s === 5 && l === "as" ? "f-bad softer" : "f-muted softer") }));
        });
      });
      const notes = ["", "en, hi only: Telugu is cross-lingual", "name prompt, memory nulled", "<|lang:te|> sets the language", "ten voices: 10–11 languages", "Assamese: no voice has 1 h"];
      c.box({ x: 492, y: 130, w: 140, h: 100, label: notes[Math.min(s, 5)] || "", tone: s === 5 ? "bad" : "predict", hl: true, size: 13 });
    };
  };

  // Page 20. Voice registration (maya3/prompt.py, engine.prepare_voice).
  D["cloning"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const ref = c.box({ x: 8, y: 30, w: 170, h: 60, label: "your 3–10 s clip", sub: "+ exact transcript + lang", tone: "bridge", hl: s === 1 });
      if (s >= 2) { const m = c.box({ x: 230, y: 30, w: 170, h: 60, label: "Mimi encode", sub: "32-code frames", tone: "bridge", hl: s === 2 }); c.connect(ref, m, { tone: "muted" }); }
      if (s >= 3) { const e = c.box({ x: 230, y: 120, w: 170, h: 60, label: "ECAPA", sub: "192 numbers", tone: "code", hl: s === 3 }); c.connect(ref, e, { tone: "muted", route: "elbow" });
        c.box({ x: 452, y: 120, w: 180, h: 60, label: "anchor + depth memory", tone: "code", hl: s === 3, size: 13 }); }
      if (s >= 4) c.chips({ x: 8, y: 220, items: [{ t: "<|lang:hi|>", tone: "take", hl: s === 4 }, { t: "ref text", tone: "paper" }, { t: "<|audio|>", tone: "bridge" }, { t: "ref frames", tone: "bridge" }, { t: "end", tone: "predict" }], size: 13 });
      if (s >= 4) c.text(8, 212, "cached once per voice, KV included", { size: 12, tone: "take", weight: 700 });
      if (s >= 5) c.chips({ x: 8, y: 290, items: [{ t: "cached prefix", tone: "muted", dashed: true }, { t: "<|lang:ta|>", tone: "predict", hl: true }, { t: "Tamil target text", tone: "paper" }, { t: "<|audio|>", tone: "bridge" }], size: 13 });
    };
  };

  // Page 21. Roll-in (depth_v2.py _forward_loop / _forward_split). Codes drawn are made up.
  D["rollin"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const lv = ["h", "cb0", "cb1", "cb2", "cb3", "cb4", "cb5", "cb6"];
      const row = (y, title, sampledFrom, tone) => {
        c.text(8, y - 8, title, { size: 12, weight: 700, tone });
        lv.forEach((l, i) => {
          const samp = i >= sampledFrom && i > 0;
          c.box({ x: 8 + i * 78, y, w: 70, h: 40, label: l, size: 13, tone: i === 0 ? "take" : samp ? "predict" : "code", dashed: samp, hl: samp && s >= 2 });
        });
      };
      row(40, "teacher-forced: recorded codes in the prefix", 99, "code");
      if (s >= 2) row(130, s >= 5 ? "roll-in, last stage: cb0 sampled from the backbone too" : "roll-in: deeper codes are the decoder's own samples", s >= 5 ? 1 : 2, "predict");
      if (s >= 3) c.box({ x: 8, y: 200, w: 300, h: 50, label: "up to 30% of depth frames", tone: "predict", hl: s === 3, size: 14 });
      if (s >= 4) c.box({ x: 332, y: 200, w: 300, h: 50, label: "sampled at 0.7, top-64", mono: true, tone: "predict", hl: s === 4, size: 14 });
      if (s >= 5) c.box({ x: 8, y: 280, w: 624, h: 50, label: "targets: always the true codes; no gradient through samples", tone: "code", hl: true, size: 14 });
    };
  };

  // Page 22. History corruption (corrupt.py). Window positions seeded examples.
  D["history-corrupt"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const N = 60, cw = 10.2, x0 = 8;
      const strip = (y, title, kind) => {
        c.text(8, y - 8, title, { size: 12, weight: 700, tone: kind === "clean" ? "code" : kind === "drift" ? "bad" : "predict" });
        for (let f = 0; f < N; f++) {
          let cls = "f-code softer";
          if (kind === "drift") cls = f > 20 ? (f > 40 ? "f-bad soft" : "f-bad softer") : "f-code softer";
          if (kind === "swap" && f >= 18 && f < 36) cls = "f-predict soft";
          if (kind === "noise" && f >= 34 && f < 50) cls = "f-paper soft";
          c.add(k.h("rect", { x: x0 + f * cw, y, width: cw - 1.5, height: 30, rx: 2, class: cls }));
        }
      };
      if (s <= 2) {
        strip(40, "training: clean recorded history", "clean");
        strip(110, "serving: own history, slight hiss copied and amplified", "drift");
        if (s === 2) c.box({ x: 8, y: 170, w: 624, h: 50, label: "drift is in the coarse codes, the ones the backbone reads", tone: "bad", hl: true, size: 14 });
        return;
      }
      strip(40, "span swap (62.5%): 1–4 s from another speaker, same language", "swap");
      if (s >= 4) {
        strip(110, "level noise (37.5%): keep codebooks 0–7, randomise 8+", "noise");
      }
      if (s >= 5) {
        c.box({ x: 8, y: 180, w: 300, h: 60, label: "input: corrupted history", tone: "predict", hl: true });
        c.box({ x: 332, y: 180, w: 300, h: 60, label: "labels: the clean truth", tone: "code", hl: true });
        const xs = Array.from({ length: 11 }, (_, i) => i);
        c.plot({ series: [{ x: xs, y: xs.map((u) => 0.3 * u / 10), tone: "predict", label: "max corrupted fraction" }], xmin: 0, xmax: 10, ymin: 0, ymax: 0.35, h: 100, w: 624, x: 8, y: 254,
          xlabel: "thousand updates", yFmt: (v) => `${Math.round(v * 100)}%` });
      }
    };
  };

  // Page 23. Stages from code comments; DPO from the card. Bars are not durations.
  D["stages"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      if (s >= 5) V.board(c, [["data hours and sources", "not disclosed", "bad"], ["steps, batch, compute", "not disclosed", "bad"], ["DPO pairs, β", "not disclosed", "bad"]], 3, { all: true, top: 196, rowH: 52, split: 300 });
      else c.clear();
      const st = [["S1", "1 speaker/row", "muted"], ["S2", "voice in depth", "paper"], ["S3", "anchor, bad history", "take"], ["DPO", "ranked pairs", "code"]];
      const bx = [];
      st.forEach(([n, sub, tone], i) => {
        const b = c.box({ x: 8 + i * 158, y: 50, w: 148, h: 80, label: n, sub, tone, hl: s === i + 1, dim: s < i + 1, size: 15 });
        if (i) c.connect(bx[i - 1], b, { tone: "muted", dim: s < i + 1 });
        bx.push(b);
      });
      if (s >= 3) c.text(328, 160, "warm start from S2; new parts start off", { size: 12, tone: "take" });
    };
  };
})();
