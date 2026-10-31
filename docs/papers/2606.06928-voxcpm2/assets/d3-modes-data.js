/* Drawings: "Five modes" and "Training and data". */
(function () {
  const D = RD.drawings, V = RD.vox, W = V.W, H = V.H;

  // One sequence layout as chips: blocks [text, tone, dashed]
  const layout = (c, y, name, blocks, hl) => {
    c.text(8, y + 18, name, { size: 13, weight: hl ? 700 : 400, tone: hl ? "ink" : "muted", maxW: 150, lines: 1 });
    return c.chips({ x: 168, y, items: blocks.map(([t, tone, dashed]) => ({ t, tone, dashed, hl, dim: !hl })), size: 12, h: 28, maxW: 466 });
  };

  D["five-layouts"] = (fig, k) => {
    const c = k.canvas(W, H);
    const L = [ // Table 2
      ["plain TTS", [["text", "paper"], ["→ target", "code", true]]],
      ["voice design", [["(description) text", "paper"], ["→ target", "code", true]]],
      ["reference clone", [["REF ref audio REF", "bridge"], ["text", "paper"], ["→ target", "code", true]]],
      ["controllable", [["REF ref audio REF", "bridge"], ["(style) text", "paper"], ["→ target", "code", true]]],
      ["continuation", [["prompt + target text", "paper"], ["prompt audio", "bridge"], ["→ target", "code", true]]],
    ];
    return (s) => {
      c.clear();
      if (s === 1) {
        [["text (+ description)", "paper"], ["reference clip", "bridge"], ["target audio", "code"]].forEach(([l, tone], i) =>
          c.box({ x: 8 + i * 210, y: 30, w: 200, h: 60, label: l, size: 14, tone, hl: true }));
        c.text(8, 130, "three building blocks, two tracks (text and audio)", { size: 14, weight: 700 });
        return;
      }
      const on = { 2: [0], 3: [1], 4: [2], 5: [4], 6: [0, 1, 2, 3, 4] }[s];
      L.forEach(([n, b], i) => layout(c, 20 + i * 62, n, b, on.includes(i)));
      if (s === 6) c.box({ x: 168, y: 330 - 6, w: 464, h: 32, label: "same weights · same loss · same sampler", size: 13, tone: "code", hl: true });
    };
  };

  D["ref-pathway"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const ref = c.box({ x: 8, y: 30, w: 210, h: 56, label: "REF_START · ref · REF_END", size: 13, mono: true, tone: "bridge", hl: s === 1 });
      const tx = c.box({ x: 236, y: 30, w: 170, h: 56, label: "text", tone: "paper" });
      const tg = c.box({ x: 424, y: 30, w: 208, h: 56, label: "target audio", tone: "code", dashed: true });
      c.text(8, 112, "VAE-encoded patches of the consented clip", { size: 12, tone: "muted" });
      if (s >= 2) c.box({ x: 8, y: 130, w: 300, h: 46, label: "no transcript of the clip needed", size: 13, tone: "code", hl: s === 2 });
      if (s >= 3) {
        [tx, tg].forEach((b) => c.path(`M${b.bx.cx},${b.bx.t - 2} C${b.bx.cx},${4} ${ref.bx.cx},${4} ${ref.bx.cx},${ref.bx.t - 2}`, { tone: "take", width: 1.6, arrow: true, dim: s !== 3 }));
        c.text(330, 160, "every later position attends back", { size: 13, weight: 700, tone: "take" });
      }
      if (s >= 4) c.box({ x: 8, y: 196, w: 300, h: 46, label: "outside the loss: context only", size: 13, tone: "muted", hl: s === 4 });
      if (s >= 5) c.box({ x: 324, y: 196, w: 308, h: 46, label: "not glued in time: no rhythm forced", size: 13, tone: "predict", hl: s === 5 });
      if (s >= 6) c.box({ x: 8, y: 270, w: 624, h: 56, label: "dubbing: your consented voice actor goes in this slot", size: 15, tone: "take", hl: true });
    };
  };

  D["recipes"] = (fig, k) => {
    const m = k.toggle({ label: "metric", options: ["EN SIM", "hard ZH CER"], value: "EN SIM" });
    k.follow(m, { 1: "EN SIM", 3: "hard ZH CER", 5: "EN SIM" });
    const c = k.canvas(W, H);
    const T = [["continuation only", 77.7, 8.16], ["reference only", 75.3, 6.85], ["reference + continuation", 79.5, 7.44]]; // Table 4
    return (s) => {
      c.clear();
      const j = m.value === "EN SIM" ? 1 : 2;
      const hl = { 1: [0, 1, 2], 2: [2], 3: [1], 4: [1], 5: [1] }[s];
      V.title(c, j === 1 ? "English similarity · higher is better" : "hard Chinese CER (%) · lower is better");
      V.tbars(c, T.map((r, i) => [r[0], r[j], hl.includes(i), !hl.includes(i)]), { y: 40, h: 200, labelW: 200, tone: j === 1 ? "take" : "predict", fmt: (v) => v.toFixed(j === 1 ? 1 : 2), max: j === 1 ? 85 : 9 });
      if (s === 4) c.box({ x: 8, y: 266, w: 624, h: 50, label: "no audio prefix → model picks its own rhythm", size: 14, tone: "predict", hl: true });
      if (s === 5) c.box({ x: 8, y: 266, w: 624, h: 50, label: "consented clip as reference only: free rhythm, −4 to −8 SIM", size: 14, tone: "take", hl: true });
    };
  };

  D["voice-design"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      c.chips({ x: 8, y: 30, items: [{ t: "(A gruff middle-aged man, furious)", tone: "predict", hl: s <= 2 }, { t: "मैंने कहा था…", tone: "paper" }], size: 14, h: 34 });
      c.text(8, 22, "one text stream", { size: 12, tone: "muted" });
      if (s >= 2) c.box({ x: 8, y: 90, w: 300, h: 44, label: "parentheses: a convention only", size: 13, tone: "muted", hl: s === 2 });
      if (s >= 3) c.box({ x: 324, y: 90, w: 308, h: 44, label: "no style encoder · no adapter", size: 13, tone: "code", hl: s === 3 });
      if (s >= 4) {
        c.text(8, 170, "voice attributes", { size: 13, weight: 700, tone: "take" });
        c.chips({ x: 8, y: 180, items: ["age", "gender", "accent", "texture", "scenario"].map((t) => ({ t, tone: "take", hl: s === 4 })), size: 13 });
        c.text(8, 240, "style attributes", { size: 13, weight: 700, tone: "predict" });
        c.chips({ x: 8, y: 250, items: ["emotion", "rate", "pitch", "energy", "emphasis"].map((t) => ({ t, tone: "predict", hl: s === 4 })), size: 13 });
      }
      if (s >= 5) c.box({ x: 380, y: 300, w: 252, h: 46, label: "runs vary: try 1–3 times", size: 13, tone: "bad", hl: true });
    };
  };

  D["controllable"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const who = c.box({ x: 8, y: 30, w: 230, h: 64, label: "consented voice clip", sub: "3–30 s · WHO", tone: "bridge", hl: s === 1 });
      const how = c.box({ x: 8, y: 120, w: 230, h: 64, label: "(furious, loud, fast)", sub: "caption · HOW", mono: true, tone: "predict", hl: s === 2, dim: s < 2 });
      const tx = c.box({ x: 8, y: 210, w: 230, h: 56, label: "मैंने कहा था…", sub: "WHAT", tone: "paper" });
      const m = c.box({ x: 300, y: 100, w: 150, h: 100, label: "VoxCPM2", sub: "one backbone", tone: "take", hl: s === 3 });
      c.connect(who, m, { route: "elbow" }); c.connect(how, m, { dim: s < 2 }); c.connect(tx, m, { route: "elbow" });
      const o = c.box({ x: 490, y: 110, w: 142, h: 80, label: "angry Hindi", sub: "consented voice", tone: "code", hl: s >= 4 });
      c.connect(m, o);
      if (s === 3) c.text(300, 230, "trained on mined same-speaker pairs", { size: 13, tone: "take", weight: 700 });
      if (s === 4) c.box({ x: 260, y: 220, w: 372, h: 44, label: "EN instruction: 84.2 / 83.2 / 71.4", size: 13, mono: true, tone: "code", hl: true }); // Table 9
      if (s >= 5) c.box({ x: 260, y: 290, w: 372, h: 46, label: "the source actor's audio never enters", size: 14, tone: "code", hl: s === 5 });
      if (s >= 6) c.box({ x: 8, y: 290, w: 236, h: 46, label: "lost: exact pitch curve", size: 14, tone: "bad", hl: true });
    };
  };

  D["data-mix"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      c.box({ x: 8, y: 20, w: 624, h: 60, label: "over 2,000,000 hours · 30 languages + 9 dialects", size: 16, tone: "paper", hl: s === 1 }); // §3.6
      if (s >= 2) c.box({ x: 8, y: 100, w: 440, h: 56, label: "Chinese + English: the majority", sub: "VoxCPM alone: 1.8M h", tone: "paper", hl: s === 2 });
      if (s >= 3) {
        c.text(8, 190, "each of the other 28 languages", { size: 13, weight: 700, tone: "predict" });
        const X = (h) => 8 + Math.log10(h) * 120;
        c.line(X(100), 230, X(100000), 230, { tone: "muted" });
        [100, 1000, 10000, 100000].forEach((h) => c.text(X(h), 252, h >= 1000 ? `${h / 1000}K h` : `${h} h`, { size: 11, anchor: "middle", tone: "muted" }));
        c.box({ x: X(1000), y: 206, w: X(50000) - X(1000), h: 30, label: "1K – 50K h", size: 13, tone: "predict", hl: s === 3 });
      }
      if (s >= 4) c.box({ x: 8, y: 276, w: 300, h: 46, label: "Hindi's share: not reported", size: 13, tone: "bad", hl: s === 4 });
      if (s >= 5) c.box({ x: 324, y: 276, w: 308, h: 46, label: "controllable: tens of thousands of h", size: 13, tone: "take", hl: true });
    };
  };

  D["data-pipeline"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      V.chain(c, [
        ["separate", "drop music", "bridge", s === 1],
        ["VAD", "cut at silence", "bridge", s === 2, s < 2],
        ["ASR", "transcribe", "paper", s === 3, s < 3],
        ["filter", "drop bad clips", "code", s === 4, s < 4],
      ], { y: 40, h: 70, size: 15 });
      const notes = ["background music and effects removed", "long recordings → utterances", "text from recognition, not humans", "thresholds not reported"];
      if (s <= 4) c.text(8, 150, notes[s - 1], { size: 14, weight: 700, tone: "muted" });
      if (s >= 5) {
        c.box({ x: 8, y: 180, w: 624, h: 56, label: "Telugu: transcripts are only as good as your Telugu ASR", size: 14, tone: "bad", hl: true });
        c.box({ x: 8, y: 256, w: 624, h: 56, label: "ASR errors become pronunciations the model learns", size: 14, tone: "predict" });
      }
    };
  };

  D["curriculum"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const st = [ // §3.5
        ["Stage 1", "multilingual TTS", "≤ 60 s · context 4,096", 0.0],
        ["Stage 2", "+ controllable, rising", "≤ 3 min · context 8,192", 0.35],
        ["Stage 3", "anneal: curated, balanced", "2 s – 5 min · 8,192", 0.6],
      ];
      st.forEach(([n, d, sub, ctl], i) => {
        const on = s >= [1, 2, 4][i], x = 8 + i * 212;
        c.box({ x, y: 20, w: 200, h: 70, label: `${n}: ${d}`, sub, size: 13, tone: ["paper", "take", "code"][i], hl: s === [1, 2, 4][i], dim: !on });
        if (on) {
          c.box({ x: x + 40, y: 120, w: 120, h: 160, tone: "muted" });
          const hh = 160 * ctl; if (hh > 0) c.add(k.h("rect", { x: x + 40, y: 280 - hh, width: 120, height: hh, rx: 6, class: "f-predict soft" }));
          c.text(x + 100, 300, ctl ? "control data share" : "plain TTS only", { size: 12, anchor: "middle", tone: "muted" });
        }
      });
      if (s === 3) c.box({ x: 8, y: 312, w: 410, h: 40, label: "stages 1–2: most compute · steps not reported", size: 13, tone: "muted", hl: true });
      if (s >= 5) c.box({ x: 8, y: 312, w: 410, h: 40, label: "loss never changes; only data, ratio, context", size: 13, tone: "code", hl: s === 5 });
      if (s >= 6) c.box({ x: 430, y: 312, w: 202, h: 40, label: "speak first, then act", size: 13, tone: "take", hl: true });
    };
  };

  D["expressive-select"] = (fig, k) => {
    const c = k.canvas(W, H);
    const xs = Array.from({ length: 41 }, (_, i) => i / 40), ys = xs.map((x) => Math.exp(-((x - 0.3) ** 2) / 0.03) + 0.25 * Math.exp(-((x - 0.75) ** 2) / 0.02));
    return (s) => {
      c.clear();
      const p = c.plot({ series: [{ x: xs, y: ys, tone: "paper" }], xmin: 0, xmax: 1, ymin: 0, ymax: 1.2, xlabel: "expressiveness score from a light emotion classifier", ylabel: "share of clips",
        xFmt: (v) => v.toFixed(1), yFmt: () => "", h: 280 });
      if (s === 1) c.label(p.X(0.3), p.Y(1.1), "most clips are flat", { size: 14, tone: "bad", weight: 700 });
      if (s >= 2) c.label(p.X(0.8), p.Y(0.9), "many scenarios collected", { size: 13, tone: "paper", weight: 700 });
      if (s >= 3) c.box({ x: 8, y: 296, w: 300, h: 50, label: "classifier scores every clip", size: 13, tone: "take", hl: s === 3 });
      if (s >= 4) { c.path(`M${p.X(0.6)},${p.Y(0)} L${p.X(0.6)},${p.Y(1.15)}`, { tone: "predict", dash: true }); c.label(p.X(0.78), p.Y(0.55), "keep → annotate", { size: 14, tone: "predict", weight: 700 }); }
      if (s >= 5) c.box({ x: 324, y: 296, w: 308, h: 50, label: "cheap filter, expensive labels", size: 13, tone: "code", hl: true });
    };
  };

  D["captions"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const au = c.box({ x: 8, y: 30, w: 150, h: 60, label: "expressive clip", tone: "bridge" });
      if (s === 1) {
        c.box({ x: 190, y: 20, w: 442, h: 40, label: "voice: age, gender, accent, texture, scenario", size: 13, tone: "take", hl: true });
        c.box({ x: 190, y: 70, w: 442, h: 40, label: "style: emotion, rate, pitch, energy, emphasis", size: 13, tone: "predict", hl: true });
      }
      if (s >= 2) {
        const al = c.box({ x: 190, y: 30, w: 200, h: 60, label: "audio LLMs", sub: "Step-Audio R1 · Gemini 2.5 Pro", tone: "take", hl: s === 2 });
        c.connect(au, al);
        const cap = c.box({ x: 420, y: 30, w: 212, h: 60, label: "“a tense young woman, fast, rising pitch”", size: 12, tone: "predict", hl: s === 2 });
        c.connect(al, cap);
      }
      if (s >= 3) c.box({ x: 190, y: 120, w: 442, h: 46, label: "checked by gender, age and emotion classifiers", size: 13, tone: "code", hl: s === 3 });
      if (s >= 4) c.box({ x: 190, y: 186, w: 442, h: 46, label: "used verbatim as a text prefix", size: 13, tone: "paper", hl: s === 4 });
      if (s >= 5) c.box({ x: 8, y: 270, w: 624, h: 56, label: "Telugu needs a captioner that hears Telugu emotion", size: 14, tone: "bad", hl: true });
    };
  };

  D["ref-mining"] = (fig, k) => {
    const th = k.slider({ label: "similarity threshold", min: 0.4, max: 0.95, step: 0.05, value: 0.7, fmt: (v) => v.toFixed(2) });
    const c = k.canvas(W, H);
    const sims = [0.82, 0.55, 0.91, 0.74, 0.66, 0.88, 0.79, 0.93]; // illustrative
    return (s) => {
      c.clear();
      c.text(8, 22, "one recording session · utterances in order", { size: 13, weight: 700, tone: "bridge" });
      const tgt = 6;
      sims.forEach((v, i) => {
        const isT = i === tgt, prev = i === tgt - 1, keep = !isT && !prev && v >= th.value;
        const show = s >= 2;
        c.box({ x: 8 + i * 78, y: 40, w: 70, h: 60, label: isT ? "target" : `u${i + 1}`, sub: isT || !show ? "" : v.toFixed(2), tone: isT ? "code" : !show ? "bridge" : prev && s >= 3 ? "bad" : keep ? "take" : "muted", hl: isT || (keep && show), dim: show && !keep && !isT });
      });
      if (s >= 2) c.text(8, 130, `cosine similarity to the target · keep ≥ ${th.value.toFixed(2)}`, { size: 13, tone: "take", weight: 700 });
      if (s >= 3) c.text(8, 152, "the clip right before the target is never used", { size: 13, tone: "bad", weight: 700 });
      if (s >= 4) c.box({ x: 8, y: 186, w: 624, h: 50, label: "mined clips differ in detail → reference SIM < continuation SIM", size: 13, tone: "predict", hl: s === 4 });
      if (s >= 5) c.box({ x: 8, y: 256, w: 624, h: 50, label: "no shortcut: “carry on the last sentence's mood”", size: 14, tone: "code", hl: true });
    };
  };

  D["decouple"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      c.box({ x: 8, y: 20, w: 300, h: 60, label: "“What a wonderful day!”", sub: "caption: cheerful", tone: "paper", hl: s === 1 });
      if (s === 1) c.box({ x: 330, y: 20, w: 302, h: 60, label: "mood readable from the words alone", size: 13, tone: "bad", hl: true });
      if (s >= 2) {
        const cl = c.box({ x: 8, y: 110, w: 300, h: 60, label: "clone voice + style", sub: "with VoxCPM itself", tone: "take", hl: s === 2 });
        const nt = c.box({ x: 330, y: 110, w: 302, h: 60, label: "“The meeting is at four.”", sub: "unrelated text", tone: "paper", hl: s === 2 });
        c.connect(nt, cl);
      }
      if (s >= 3) c.box({ x: 8, y: 196, w: 624, h: 50, label: "⟨cheerful caption, “The meeting is at four.”, cheerful audio⟩", size: 13, tone: "code", hl: s === 3 });
      if (s >= 4) c.box({ x: 8, y: 262, w: 300, h: 44, label: "also seeds long-tail languages", size: 13, tone: "predict", hl: s === 4 });
      if (s >= 5) c.box({ x: 330, y: 262, w: 302, h: 44, label: "stage 2 only; stage 3 native", size: 13, tone: "muted", hl: s === 5 });
      if (s >= 6) c.box({ x: 8, y: 316, w: 624, h: 38, label: "dubbing in miniature: angry style, neutral words, new language", size: 13, tone: "take", hl: true });
    };
  };

  D["wsd"] = (fig, k) => {
    const m = k.toggle({ label: "metric", options: ["hard ZH CER", "hard ZH SIM"], value: "hard ZH CER" });
    k.follow(m, { 1: "hard ZH CER", 4: "hard ZH SIM" });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      // learning-rate schedule sketch: Table 2 V1 (400K stable at 1e-4, 100K decay to 5e-6)
      const X = (it) => 40 + it / 500 * 260, Y = (lr) => 150 - lr / 1e-4 * 100;
      c.path(`M${X(0)},${Y(0)} L${X(10)},${Y(1e-4)} L${X(400)},${Y(1e-4)} C${X(440)},${Y(1e-4)} ${X(460)},${Y(5e-6)} ${X(500)},${Y(5e-6)}`, { tone: "take", width: 2.4 });
      c.text(40, 20, "learning rate (VoxCPM, 500K steps)", { size: 13, weight: 700, tone: "take" });
      c.text(X(200), Y(1e-4) + 20, "1e-4 · 400K steps", { size: 12, anchor: "middle", tone: "muted" });
      if (s >= 1) c.text(X(500), Y(5e-6) + 20, "→ 5e-6", { size: 12, anchor: "end", tone: "muted" });
      if (s >= 2) c.box({ x: 40, y: 172, w: 260, h: 40, label: "decay doubles batch: 4,096 → 8,192", size: 12, tone: "muted", hl: s === 2 });
      if (s >= 3) {
        const cer = m.value === "hard ZH CER", a = cer ? 13.22 : 68.6, b = cer ? 8.87 : 73.0; // Table 8 V1
        V.tbars(c, [["after stable", a, false, false], ["after decay", b, true, false]], { x: 330, y: 50, w: 300, h: 120, labelW: 110, tone: cer ? "predict" : "take", fmt: (v) => v.toFixed(2), max: cer ? 15 : 80 });
        c.text(630, 34, cer ? "hard ZH CER (%)" : "hard ZH SIM", { size: 12, anchor: "end", weight: 700 });
      }
      if (s >= 5) c.box({ x: 40, y: 250, w: 590, h: 50, label: "V2 stage 3: learning-rate annealing on curated data", size: 14, tone: "code", hl: true });
    };
  };
})();
