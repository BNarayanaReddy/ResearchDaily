/* Drawings for the Mind the Accent Gap lesson (arXiv:2610.06587v1).
   One entry per data-draw name; each is redrawn on every step and control change.
   Numbers from the paper carry a // Table N or // §N comment; everything else is
   illustrative layout or our arithmetic, as each page's caption says. */
(function () {
  window.RD = window.RD || {}; RD.drawings = RD.drawings || {};
  const D = RD.drawings;
  const W = 640, H = 360;

  // a checklist board: rows [question, answer, tone]; row i appears on step i + 1
  const board = (c, rows, s, top = 8, rowH = 68) => {
    c.clear();
    rows.forEach(([q, a, tone], i) => {
      if (s < i + 1) return;
      const y = top + i * rowH, now = s === i + 1;
      c.box({ x: 10, y, w: 620, h: rowH - 10, tone: "muted", hl: now });
      c.text(26, y + (rowH - 10) / 2 + 5, q, { size: 14, weight: now ? 700 : 400, maxW: 290, lines: 1, inBox: true });
      c.box({ x: 330, y: y + 8, w: 286, h: rowH - 26, label: a, size: 13, tone, hl: now });
    });
  };
  const legend = (c, x, y, items, gap = 150) => items.forEach(([t, tone], i) => {
    c.box({ x: x + i * gap, y, w: 14, h: 14, tone, solid: true, r: 3 });
    c.text(x + i * gap + 20, y + 12, t, { size: 12, inBox: true });
  });

  // Table 1: WER (%) per accent group, averaged over the 6 condition groups
  const ACC = ["Non-British", "Other British", "Scottish", "S. English"];
  const T1 = {
    "Nemotron Base-LA13": [18.1, 19.7, 17.4, 17.4, 18.2],
    "Nemotron FT-LA13": [16.6, 16.7, 15.2, 15.8, 16.1],
    "Nemotron Base-LA6": [19.5, 22.1, 19.4, 18.8, 20.0],
    "Nemotron FT-LA6": [17.9, 18.9, 16.7, 17.0, 17.6],
    "Qwen3-ASR offline": [10.2, 11.1, 11.4, 11.8, 11.1],
    "Qwen3-ASR chunked": [12.8, 13.3, 22.2, 12.9, 15.2],
    "Parakeet FT": [16.6, 17.1, 15.4, 16.7, 16.5],
    "Parakeet Base": [16.2, 18.2, 15.5, 16.7, 16.6],
    "Whisper Turbo": [14.9, 17.8, 16.1, 18.2, 16.7],
    "Distil-Whisper": [16.4, 18.8, 16.7, 17.7, 17.4],
    "Cohere": [14.5, 16.1, 14.8, 15.8, 15.3],
  };
  const spread = (r) => Math.max(...r.slice(0, 4)) - Math.min(...r.slice(0, 4));

  // =========================================================== TOOLBOX
  D["cascade"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const au = c.box({ x: 16, y: 30, w: 170, h: 60, label: "customer speaks", sub: "Scottish accent", tone: "bridge", hl: s === 1 });
      const asr = c.box({ x: 236, y: 30, w: 170, h: 60, label: "streaming ASR", tone: "bridge", hl: s === 1 });
      c.connect(au, asr, { tone: "bridge" });
      if (s >= 2) {
        const tx = c.box({ x: 16, y: 130, w: 608, h: 50, label: "“how much have i spent at tesco last year”", mono: true, size: 14, tone: "paper", hl: s === 2 });
        c.connect(asr, tx, { tone: "paper" });
      }
      if (s >= 3) {
        const llm = c.box({ x: 16, y: 220, w: 200, h: 60, label: "LLM", sub: "Gemma-4-26B-A4B-it", tone: "take", hl: s === 3 }); // §4
        const call = c.box({ x: 260, y: 210, w: 364, h: 80, label: "spend · last year · filter: Tesco", sub: "tool call (illustrative fields)", size: 14, tone: "predict", hl: s === 3 });
        c.connect(llm, call, { tone: "take" });
      }
      if (s >= 4) c.text(320, 330, "answer: £ spent at Tesco last year", { size: 15, anchor: "middle", weight: 700, tone: "code" });
    };
  };

  D["em"] = (fig, k) => {
    const t = k.toggle({ label: "transcript", options: ["correct", "garbled"], value: "correct" });
    k.follow(t, { 1: "correct", 4: "garbled" });
    const c = k.canvas(W, H);
    const F = ["metric", "time_period", "group_by", "filter", "compare_with"];          // §4
    const GOLD = ["spend", "last_year", "none", "merchant=Tesco", "none"];              // illustrative
    return (s) => {
      c.clear();
      const bad = t.value === "garbled";
      if (s !== 3) c.text(20, 26, bad ? "“hi monte santesco last year”" : "“how much have i spent at tesco last year”", { size: 14, mono: true, tone: bad ? "bad" : "paper", maxW: 600, lines: 1 });
      c.text(200, 62, "gold", { size: 13, weight: 700, anchor: "middle", tone: "muted" });
      c.text(470, 62, "predicted", { size: 13, weight: 700, anchor: "middle", tone: "muted" });
      F.forEach((f, i) => {
        const y = 74 + i * 46;
        const pred = bad && f === "filter" ? "(empty)" : GOLD[i];
        const ok = pred === GOLD[i];
        c.text(20, y + 24, f, { size: 13, mono: true, weight: s === 1 ? 700 : 400, inBox: true });
        if (s >= 2) c.box({ x: 130, y, w: 140, h: 36, label: GOLD[i], size: 12, mono: true, tone: "muted" });
        c.box({ x: 360, y, w: 220, h: 36, label: pred, size: 12, mono: true, tone: ok ? "code" : "bad", hl: !ok });
        if (s >= 2) c.text(600, y + 24, ok ? "✓" : "✗", { size: 18, weight: 700, tone: ok ? "code" : "bad", inBox: true });
      });
      if (s >= 2) c.text(320, 346, bad ? "EM = 0: one field wrong fails the call" : "EM = 1: all five match", { size: 16, weight: 700, anchor: "middle", tone: bad ? "bad" : "code" });
      if (s === 3) c.box({ x: 16, y: 8, w: 608, h: 30, label: "gold: majority of 10 LLM runs + manual check", size: 12, tone: "predict" }); // §4
    };
  };

  D["lookahead"] = (fig, k) => {
    const n = k.slider({ label: "seconds of audio so far", min: 1, max: 8, value: 4, fmt: (v) => `${v} s` });
    k.follow(n, { 4: 8 });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const N = n.value, cw = 64;
      c.text(20, 26, "work done when chunk N arrives (illustrative)", { size: 13, tone: "muted" });
      for (let i = 0; i < N; i++) c.box({ x: 20 + i * (cw + 6), y: 40, w: cw, h: 34, label: `${i + 1} s`, size: 12, tone: i === N - 1 ? "bridge" : "muted", hl: i === N - 1 && s === 1 });
      if (s >= 2) {
        c.text(20, 104, "Nemotron, cache-aware", { size: 14, weight: 700, tone: "code" });
        for (let i = 0; i < N - 1; i++) c.box({ x: 20 + i * (cw + 6), y: 114, w: cw, h: 34, label: "cache", size: 11, tone: "muted", dashed: true });
        c.box({ x: 20 + (N - 1) * (cw + 6), y: 114, w: cw, h: 34, label: "new", size: 12, tone: "code", hl: s === 2 });
      }
      if (s >= 3) {
        c.box({ x: 20 + N * (cw + 6), y: 114, w: Math.min(cw, 600 - N * (cw + 6)), h: 34, label: "LA", size: 12, tone: "predict", hl: s === 3, dashed: true });
      }
      if (s >= 4) {
        c.text(20, 190, "Qwen3-ASR, 1 s chunks", { size: 14, weight: 700, tone: "bad" });
        c.box({ x: 20, y: 200, w: N * (cw + 6) - 6, h: 34, label: `re-decodes all ${N} s`, size: 12, tone: "bad", hl: s === 4 });  // §4
      }
      if (s >= 5) c.text(20, 300, "≈ 3.5× lower latency · < ½ the memory for Nemotron", { size: 16, weight: 700, tone: "code", maxW: 600, lines: 1 }); // §4
    };
  };

  // =========================================================== THE BENCHMARK
  D["data"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const p = c.box({ x: 16, y: 20, w: 190, h: 70, label: "90 speakers", sub: "50 M · 40 F · clean room", tone: "bridge", hl: s === 1 }); // §3
      if (s >= 2) {
        const q = c.box({ x: 226, y: 20, w: 190, h: 70, label: "200 queries", sub: "rounds of 20", tone: "paper", hl: s === 2 });
        c.connect(q, p, { tone: "paper" });
      }
      if (s >= 3) {
        const X = (v) => 16 + v / 3079 * 600;
        c.add(k.h("rect", { x: X(0), y: 130, width: X(3079) - X(0), height: 40, rx: 5, class: "f-muted soft" }));
        c.add(k.h("rect", { x: X(0), y: 130, width: X(2919) - X(0), height: 40, rx: 5, class: "f-code" }));
        c.text(X(1460), 156, "2,919 kept", { size: 15, weight: 700, anchor: "middle", inBox: true });
        c.text(616, 196, "3,079 recorded · 160 removed", { size: 13, anchor: "end", tone: "muted" });
      }
      if (s >= 4) {
        const X = (v) => 16 + v / 21 * 600;
        c.line(X(0), 260, X(21), 260, { tone: "muted" });
        c.add(k.h("rect", { x: X(2.16), y: 248, width: X(20.82) - X(2.16), height: 24, rx: 4, class: "f-bridge soft" }));
        c.dot(X(4.73), 260, { r: 8, tone: "predict" });
        c.text(X(4.73), 240, "mean 4.73 s", { size: 13, anchor: "middle", weight: 700, tone: "predict" });
        c.text(X(2.16), 296, "2.16 s", { size: 12, anchor: "middle", tone: "muted" });
        c.text(X(20.82), 296, "20.82 s", { size: 12, anchor: "middle", tone: "muted" });
      }
      if (s >= 5) c.box({ x: 436, y: 20, w: 188, h: 70, label: "reference = prompt", sub: "no re-transcription", tone: "predict", hl: true });
    };
  };

  D["accents"] = (fig, k) => {
    const c = k.canvas(W, H);
    const G = [["Scottish", 685, 23], ["Southern English", 710, 23], ["Other British", 747, 20], ["Non-British", 784, 26]]; // §3 (approximate)
    return (s) => {
      c.clear();
      if (s === 1) {
        c.chips({ x: 20, y: 30, maxW: 600, size: 14, items: ["Glaswegian", "Scottish", "Edinburgh", "Geordie?", "Welsh", "Mancunian", "Yorkshire", "Brummie", "N. Irish", "RP", "London", "Kent", "Indian", "American", "…72 more"].map((t) => ({ t, tone: "muted" })) });
        c.text(20, 200, "76 free-text self-descriptions", { size: 18, weight: 700 });
        c.text(20, 230, "(chips are invented examples)", { size: 12, tone: "muted" });
        return;
      }
      const vis = G.filter((_, i) => s >= 2 + (i >= 2 ? i - 1 : 0));
      c.bars({ x: 10, y: 20, w: 620, rowH: 64, labelW: 150, max: 900, fmt: (v) => `~${v}`,
        rows: vis.map(([l, u]) => ({ label: l, values: [u], hl: (s === 3 && l === "Other British") || (s === 4 && l === "Non-British") })), tones: ["bridge"] });
      vis.forEach(([l, u, sp], i) => c.text(616, 20 + i * 64 + 52, `~${sp} speakers`, { size: 12, anchor: "end", tone: "muted", inBox: true }));
      if (s >= 3) c.label(320, 300, "Other British = N. Irish, Mancunian, Yorkshire, Welsh, Midlands", { size: 13, tone: "predict" });
      if (s >= 5) c.text(320, 340, "smallest share: 685 ÷ 2,926 ≈ 23%", { size: 14, mono: true, anchor: "middle", weight: 700 });
    };
  };

  D["conditions"] = (fig, k) => {
    const c = k.canvas(W, H);
    const C = [["Clean", 6.0, 1], ["Reverb", 9.8, 2], ["Noise", 11.8, 2], ["Telephony", 12.9, 3], ["Overlap", 20.0, 4], ["Environment", 28.6, 5]]; // §5.2
    return (s) => {
      c.clear();
      c.text(20, 22, "mean WER (%) over models and accents", { size: 13, tone: "muted" });
      c.bars({ x: 10, y: 34, w: 620, rowH: 52, labelW: 120, max: 32, fmt: (v) => `${v.toFixed(1)}%`, tones: ["bad"],
        rows: C.filter(([, , st]) => st <= s).map(([l, v, st]) => ({ label: l, values: [v], hl: st === s })) });
    };
  };

  D["models"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      c.text(20, 22, "FastConformer transducers", { size: 13, weight: 700, tone: "muted" });
      const nm = ["Base-LA6", "Base-LA13", "FT-LA6", "FT-LA13"];
      c.box({ x: 16, y: 34, w: 300, h: 54, label: "Nemotron Streaming 0.6B", sub: "cache-aware · RNN-T", tone: "code", hl: s === 1 });
      c.box({ x: 330, y: 34, w: 294, h: 54, label: "Parakeet TDT 0.6B", sub: "full context · offline", tone: "paper", hl: s === 1 });
      if (s >= 2) nm.forEach((t, i) => c.box({ x: 16 + i * 76, y: 100, w: 70, h: 40, label: t, size: 11, tone: "code", hl: s === 2 }));
      if (s >= 3) {
        c.box({ x: 330, y: 100, w: 140, h: 40, label: "Base", size: 12, tone: "paper" });
        c.box({ x: 484, y: 100, w: 140, h: 40, label: "FT: gated adapter", size: 12, tone: "paper", hl: s === 3 });
      }
      if (s >= 4) {
        c.text(20, 176, "offline references", { size: 13, weight: 700, tone: "muted" });
        ["Whisper Turbo", "Distil-Whisper", "Qwen3-ASR offline", "Qwen3-ASR chunked", "Cohere (API)"].forEach((t, i) =>
          c.box({ x: 16 + (i % 3) * 204, y: 188 + Math.floor(i / 3) * 56, w: 196, h: 46, label: t, size: 13, tone: i === 4 ? "muted" : "take", hl: s === 4, dashed: i === 4 }));
      }
      if (s >= 5) c.text(320, 342, "11 configurations · 1 native streamer", { size: 16, weight: 700, anchor: "middle", tone: "code" });
    };
  };

  // =========================================================== WHAT THEY FOUND
  D["table"] = (fig, k) => {
    const m = k.toggle({ label: "model", options: ["Nemotron FT-LA13", "Qwen3-ASR chunked", "Cohere", "Qwen3-ASR offline"], value: "Nemotron FT-LA13" });
    k.follow(m, { 1: "Nemotron FT-LA13", 3: "Qwen3-ASR chunked", 4: "Cohere", 5: "Qwen3-ASR offline" });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const r = T1[m.value];                                            // Table 1
      const lo = Math.min(...r.slice(0, 4)), hi = Math.max(...r.slice(0, 4));
      c.bars({ x: 10, y: 20, w: 620, rowH: 56, labelW: 130, max: 25, fmt: (v) => `${v.toFixed(1)}%`, tones: ["bridge"],
        rows: ACC.map((a, i) => ({ label: a, values: [r[i]], hl: r[i] === hi && s >= 2 })) });
      c.text(20, 270, `average ${r[4].toFixed(1)}%`, { size: 16, weight: 700, mono: true });
      if (s >= 2) c.text(620, 270, `spread ${hi.toFixed(1)} − ${lo.toFixed(1)} = ${(hi - lo).toFixed(1)}`, { size: 16, weight: 700, mono: true, anchor: "end", tone: hi - lo > 3 ? "bad" : "code" });
      if (s >= 2) c.text(320, 320, "spread = worst accent − best accent (the paper's fairness metric)", { size: 12, anchor: "middle", tone: "muted", maxW: 600, lines: 1 });
    };
  };

  D["finetune"] = (fig, k) => {
    const c = k.canvas(W, H);
    const rows = [
      ["Nemotron WER", 18.2, 16.1, 22, "%", 1], ["Nemotron spread", 2.3, 1.5, 4, "", 1],      // Table 1 (LA13)
      ["Nemotron clean EM", 75.5, 78.2, 100, "%", 2],                                         // §5.1
      ["Parakeet WER", 16.6, 16.5, 22, "%", 3], ["Parakeet spread", 2.7, 1.7, 4, "", 3],      // Table 1
    ];
    return (s) => {
      c.clear();
      legend(c, 20, 6, [["base", "muted"], ["fine-tuned", "code"]]);
      rows.filter((r) => r[5] <= s).forEach(([l, a, b, max, u, st], i) => {
        const y = 34 + i * 54, bw = 380, now = st === s;
        c.text(166, y + 26, l, { size: 13, anchor: "end", weight: now ? 700 : 400, inBox: true });
        [[a, "muted"], [b, "code"]].forEach(([v, tone], q) => {
          c.add(k.h("rect", { x: 176, y: y + 4 + q * 22, width: v / max * bw, height: 18, rx: 3, class: `f-${tone}${now ? " rdx-hl" : ""}` }));
          c.text(182 + v / max * bw, y + 18 + q * 22, `${v.toFixed(1)}${u}`, { size: 12, mono: true, inBox: true });
        });
      });
      if (s >= 4) c.box({ x: 330, y: 306, w: 294, h: 44, label: "Parakeet EM: not improved", size: 13, tone: "bad", hl: true });
    };
  };

  D["lagain"] = (fig, k) => {
    const c = k.canvas(W, H);
    const P = { "Base-LA6": [20.0, 64.6], "Base-LA13": [18.2, 66.5], "FT-LA6": [17.6, 66.4], "FT-LA13": [16.1, 67.9] }; // §5.2
    return (s) => {
      c.clear();
      const p = c.plot({ series: [], xmin: 15.5, xmax: 20.5, ymin: 64, ymax: 68.5, w: 620, h: 350,
        xlabel: "WER (%)  ← better", ylabel: "EM (%)  better →", xFmt: (v) => v.toFixed(1), yFmt: (v) => v.toFixed(0) });
      const pt = (n, tone, hl) => { const [x, y] = P[n]; c.dot(p.X(x), p.Y(y), { r: hl ? 8 : 6, tone }); c.label(p.X(x) + 10, p.Y(y) - 12, n, { size: 12, tone }); };
      const showBase = true, showFT = s >= 2;
      if (showBase) { pt("Base-LA6", "muted", s === 1); pt("Base-LA13", "muted", s === 1); c.arrow(p.X(20.0) - 8, p.Y(64.6) - 4, p.X(18.2) + 8, p.Y(66.5) + 4, { tone: "muted" }); }
      if (showFT) { pt("FT-LA6", "code", s === 2); pt("FT-LA13", "code", s === 2); c.arrow(p.X(17.6) - 8, p.Y(66.4) - 4, p.X(16.1) + 8, p.Y(67.9) + 4, { tone: "code" }); }
      if (s >= 3) c.label(p.X(19.2), p.Y(67.6), "each: −1.5 to −1.8 WER, +1.5 to +1.9 EM", { size: 13, tone: "predict", weight: 700 });
      if (s >= 4) c.arrow(p.X(18.2) - 8, p.Y(66.5) - 10, p.X(17.6) + 10, p.Y(66.4) - 10, { tone: "predict", dash: true });
    };
  };

  D["corr"] = (fig, k) => {
    const c = k.canvas(W, H);
    const P = [["Nemotron Base-LA6", 20.0, 64.6], ["Nemotron Base-LA13", 18.2, 66.5], ["Nemotron FT-LA6", 17.6, 66.4],
      ["Nemotron FT-LA13", 16.1, 67.9], ["Cohere", 15.3, 70.1], ["Qwen3 offline", 11.1, 73.7]];   // §5.2, §5.3
    return (s) => {
      c.clear();
      const p = c.plot({ series: [], xmin: 10, xmax: 21, ymin: 63, ymax: 75, w: 400, h: 350,
        xlabel: "overall WER (%)", ylabel: "overall EM (%)", xFmt: (v) => v.toFixed(0), yFmt: (v) => v.toFixed(0) });
      if (s >= 1) c.path(`M${p.X(10.5)},${p.Y(74.5)} L${p.X(20.5)},${p.Y(64)}`, { tone: "muted", dash: true });
      if (s >= 2) P.forEach(([n, x, y]) => c.dot(p.X(x), p.Y(y), { r: 6, tone: n.startsWith("Nemotron") ? "code" : n === "Cohere" ? "muted" : "take" }));
      if (s >= 2) { c.label(p.X(11.1) + 8, p.Y(73.7) + 16, "Qwen3 offline", { size: 12, tone: "take" }); c.label(p.X(15.3) + 8, p.Y(70.1) - 10, "Cohere", { size: 12 }); }
      const R = [["all models", -0.93, 1], ["3 accents", "−0.87…−0.98", 3], ["Scottish", -0.29, 4]];   // §5.2
      R.forEach(([l, v, st], i) => {
        if (s < st) return;
        c.box({ x: 436, y: 30 + i * 90, w: 190, h: 70, label: typeof v === "number" ? `r = ${v.toFixed(2).replace("-", "−")}` : `r = ${v}`, sub: l,
          size: typeof v === "number" ? 18 : 14, tone: l === "Scottish" ? "bad" : "code", hl: s === st });
      });
    };
  };

  D["fields"] = (fig, k) => {
    const c = k.canvas(W, H);
    const F = [["time_period", 33.5, 2], ["compare_with", 25.4, 3], ["group_by", 25.3, 3], ["abstention", 16.2, 4], ["filter", 12.3, 3], ["false positive", 8.7, 4], ["metric", 0.7, 5]]; // §5.3
    return (s) => {
      c.clear();
      c.text(20, 22, "share of the 21.9% failed calls (clean audio)", { size: 14, weight: 700 });
      if (s === 1) {
        c.add(k.h("rect", { x: 20, y: 80, width: 600, height: 60, rx: 6, class: "f-code soft" }));
        c.add(k.h("rect", { x: 20, y: 80, width: 600 * 0.219, height: 60, rx: 6, class: "f-bad" }));
        c.text(30 + 600 * 0.219, 116, "21.9% wrong", { size: 16, weight: 700, tone: "bad", inBox: true });
        return;
      }
      c.bars({ x: 10, y: 34, w: 620, rowH: 44, labelW: 130, max: 40, fmt: (v) => `${v.toFixed(1)}%`, tones: ["bad"],
        rows: F.filter(([, , st]) => st <= s).map(([l, v, st]) => ({ label: l, values: [v], hl: st === s })) });
    };
  };

  D["survive"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      if (s === 1) {
        c.box({ x: 20, y: 40, w: 600, h: 56, label: "“How much have I spent at Tesco last year?”", size: 15, tone: "paper" });
        c.box({ x: 20, y: 150, w: 600, h: 56, label: "“Hi Monte Santesco last year”", size: 15, tone: "bad", hl: true });   // §5.3
        c.arrow(320, 98, 320, 148, { tone: "bad", label: "ASR" });
        c.box({ x: 200, y: 250, w: 240, h: 50, label: "LLM abstains", tone: "predict" });
        return;
      }
      const stack = (y, label, parts) => {
        c.text(20, y - 8, label, { size: 14, weight: 700 });
        let x = 20;
        parts.forEach(([t, v, tone]) => {
          const w = v / 100 * 600;
          c.add(k.h("rect", { x, y, width: w, height: 36, class: `f-${tone}` }));
          if (w > 70) c.text(x + w / 2, y + 23, `${t} ${v}%`, { size: 12, anchor: "middle", weight: 700, inBox: true });
          x += w;
        });
      };
      stack(50, "a common UK retailer (2,703 utterances)", [["right", 56.3, "code"], ["dropped", 24.4, "bad"], ["variant", 19.3, "predict"]]); // §5.3
      if (s >= 3) stack(140, "“last quarter” (61,786 transcriptions)", [["right", 43.3, "code"], ["dropped", 36.5, "bad"], ["Q1–Q4", 19.4, "predict"]]); // §5.3
      if (s >= 4) {
        c.text(20, 222, "day counts: 85.9–98.4% right, but…", { size: 14, weight: 700 });
        c.box({ x: 20, y: 236, w: 160, h: 46, label: "“60 days”", tone: "paper" });
        const w = c.box({ x: 260, y: 236, w: 200, h: 46, label: "“sixteen” / “six”", tone: "bad", hl: s === 4 });
        c.arrow(182, 259, 258, 259, { tone: "bad" });
      }
      if (s >= 5) c.text(320, 330, "silent wrong answer, no retry prompt", { size: 15, weight: 700, anchor: "middle", tone: "bad" });
    };
  };

  D["notenough"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      c.box({ x: 16, y: 20, w: 290, h: 90, label: "49.8% WER", sub: "chunked Qwen · overlap +5 dB", size: 26, tone: "bad", hl: s === 1 });  // §5.3
      if (s >= 2) c.box({ x: 334, y: 20, w: 290, h: 90, label: "67% EM", sub: "errors are mostly filler", size: 26, tone: "code", hl: s === 2 });
      if (s >= 3) {
        c.text(20, 150, "“groceries” kept", { size: 14, weight: 700 });
        c.bars({ x: 10, y: 160, w: 620, rowH: 40, labelW: 150, max: 100, fmt: (v) => `${v}%`, tones: ["code"],
          rows: [{ label: "Qwen chunked", values: [86.8], hl: s === 3 }, { label: "Whisper Turbo", values: [76.3] }] });    // §5.3
      }
      if (s >= 4) c.box({ x: 16, y: 270, w: 608, h: 60, label: "Other British: lowest EM in most conditions, every model", size: 14, tone: "predict", hl: true });
    };
  };

  // =========================================================== YOUR MOVE
  D["reviewer"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => board(c, [
      ["Data released?", "no: internal (§3, §4)", "bad"],
      ["Gold labels", "LLM majority vote", "predict"],
      ["Downstream LLM", "only Gemma-4-26B", "predict"],
      ["Text vs table", "“Clean” but 6-condition avg", "bad"],
      ["Steelman", "method easy to copy", "code"],
    ], s);
  };

  D["verdict"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => board(c, [
      ["Must stream", "Nemotron FT-LA13: 16.1 / 67.9", "code"],
      ["Can wait", "Qwen3 offline: 11.1 / 73.7", "code"],
      ["No tuning budget", "Cohere API: 15.3 / 70.1", "predict"],
      ["Chunk a non-causal model", "avoid: Scottish 22.2", "bad"],
      ["🧠 Always", "EM + keywords per accent", "take"],
    ], s);                                                            // Table 1, §4, §5.3
  };
})();
