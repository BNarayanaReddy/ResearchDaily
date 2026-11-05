/* Drawings: "Neighbour tasks" and "Transfer learning" (part 06). Numbers carry // Table N or // §N comments. */
(function () {
  const D = RD.drawings, V = RD.sdr, W = V.W, H = V.H;
  const P = (V.p6 = {});

  // Erf approximation (Abramowitz-Stegun 7.1.26) for the live FAR/FRR arithmetic.
  P.erf = (x) => {
    const s = Math.sign(x); x = Math.abs(x);
    const t = 1 / (1 + 0.3275911 * x);
    const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
    return s * y;
  };
  P.cdf = (x, m, sd) => 0.5 * (1 + P.erf((x - m) / (sd * Math.SQRT2)));

  // ---------------------------------------------------------------- asr
  D["asr"] = (fig, k) => {
    const sp = k.toggle({ label: "test set", options: ["clean", "clean + other"], value: "clean" });
    k.follow(sp, { 1: "clean", 4: "clean + other", 5: "clean + other" });
    const c = k.canvas(W, H);
    const T = [ // Table 7, LibriSpeech test [clean, other]
      ["Conformer + wav2vec 2.0", 1.4, 2.6], ["w2v-BERT XXL", 1.4, 2.5], ["SpeechStew 1B", 1.7, 3.3], ["ContextNet + SpecAug", 1.7, 3.4],
      ["Conformer (L)", 1.9, 4.1], ["ContextNet", 1.9, 3.4], ["SpeechStew 100M", 2.0, 4.0], ["Transformer Transducer", 2.0, 4.2],
      ["LSTM Transducer", 2.23, 5.6], ["Squeezeformer", 2.47, 5.97], ["Whisper (zero-shot)", 2.7, 5.6]];
    return (s) => {
      c.clear();
      const both = sp.value !== "clean";
      const hl = { 1: [], 2: [7, 8], 3: [0, 1], 4: [0, 1], 5: [10], 6: [10] }[s] || [];
      V.title(c, s === 6 ? "the same WER scores your TTS: synthesize, transcribe, count" : both ? "WER %: test-clean (blue) and test-other (grey)" : "WER % on LibriSpeech test-clean · lower is better", s === 6 ? "code" : "muted");
      c.bars({ x: 8, y: 28, w: 624, rowH: 29, labelW: 190, tones: both ? ["paper", "muted"] : ["paper"], max: both ? 6.2 : 3,
        fmt: (v) => String(v),
        rows: T.map((r, i) => ({ label: r[0], values: both ? [r[1], r[2]] : [r[1]], hl: hl.includes(i), dim: hl.length > 0 && !hl.includes(i) })) });
    };
  };

  // ---------------------------------------------------------------- whisper vs wav2vec 2.0
  D["whisper-vs-w2v2"] = (fig, k) => {
    const c = k.canvas(W, H);
    const T = [ // Table 8 [dataset, wav2vec2.0 Large, Whisper Large]
      ["LibriSpeech Clean", 2.7, 2.7], ["LibriSpeech Other", 6.2, 5.2], ["Tedlium", 10.5, 4.0], ["Fleurs En", 14.6, 4.4],
      ["VoxPopuli En", 17.9, 7.3], ["Switchboard", 28.3, 13.8], ["Common Voice", 29.9, 9.0], ["CallHome", 34.8, 17.6], ["CHiME6", 65.8, 25.5]];
    return (s) => {
      c.clear();
      const hl = { 1: [0], 2: [8], 3: [5, 7], 4: [], 5: [5, 7] }[s];
      V.title(c, s === 4 ? "Whisper learned from 680,000 h of labeled web audio (§5.1.3)" : "WER %: wav2vec 2.0 Large (grey) vs Whisper Large (blue)", s === 4 ? "predict" : "muted");
      c.bars({ x: 8, y: 28, w: 624, rowH: 35, labelW: 150, tones: ["muted", "paper"], max: 66, fmt: (v) => v.toFixed(1),
        rows: T.map((r, i) => ({ label: r[0], values: [r[1], r[2]], hl: hl.includes(i), dim: hl.length > 0 && !hl.includes(i) })) });
    };
  };

  // ---------------------------------------------------------------- speaker verification
  D["speaker-verification"] = (fig, k) => {
    const th = k.slider({ label: "threshold", min: 0.3, max: 0.7, step: 0.01, value: 0.45, fmt: (v) => v.toFixed(2) });
    const out = k.readout("");
    const c = k.canvas(W, H);
    const IMP = [0.25, 0.08], GEN = [0.62, 0.08], CLONE = [0.56, 0.08]; // illustrative score curves
    return (s) => {
      c.clear();
      if (s <= 2) {
        const u = c.box({ x: 20, y: 70, w: 140, h: 56, label: "caller's audio", tone: "bridge", hl: s === 2 });
        const e = c.box({ x: 230, y: 70, w: 150, h: 56, label: "embedding net", sub: "fixed-length vector", tone: "take", hl: s === 2 });
        const sc = c.box({ x: 460, y: 140, w: 160, h: 56, label: "cosine score", tone: "predict", hl: s === 2 });
        const en = c.box({ x: 230, y: 210, w: 150, h: 56, label: "enrolled voiceprint", tone: "paper", hl: s === 2 });
        c.connect(u, e); c.connect(e, sc); c.connect(en, sc);
        c.box({ x: 20, y: 290, w: 600, h: 44, label: s === 1 ? "identify: which of N speakers?  ·  verify: is this really Alex?" : "same speaker → high score; different speaker → low score", tone: "muted", hl: true, size: 13 });
        out.textContent = "";
        return;
      }
      const X = (v) => 40 + (v / 1.0) * 560, base = 300, sc = 110;
      const curve = (m, sd, tone, dash) => {
        let d = "";
        for (let i = 0; i <= 120; i++) {
          const x = i / 120, y = Math.exp(-0.5 * ((x - m[0]) / m[1]) ** 2);
          d += (i ? "L" : "M") + X(x).toFixed(1) + "," + (base - y * sc).toFixed(1);
        }
        c.path(d, { tone, width: 2.5, dash });
      };
      c.line(X(0), base, X(1), base, { tone: "muted" });
      [0, 0.25, 0.5, 0.75, 1].forEach((v) => c.text(X(v), base + 18, v.toFixed(2), { size: 11, anchor: "middle", tone: "muted" }));
      c.text(X(0.5), base + 40, "similarity score", { size: 12, anchor: "middle", tone: "muted" });
      curve(IMP, null, "bad"); curve(GEN, null, "code");
      c.label(X(0.25), base - sc - 14, "impostors", { size: 13, tone: "bad", weight: 700 });
      c.label(X(0.66), base - sc - 14, "genuine callers", { size: 13, tone: "code", weight: 700 });
      const t = s === 4 ? 0.435 : th.value;
      const far = 1 - P.cdf(t, IMP[0], IMP[1]), frr = P.cdf(t, GEN[0], GEN[1]);
      c.line(X(t), base - sc - 30, X(t), base, { tone: "predict", width: 2, dash: true });
      c.label(X(t), 40, `threshold ${t.toFixed(2)}`, { size: 12, tone: "predict" });
      out.textContent = `FAR ${(far * 100).toFixed(2)}% · FRR ${(frr * 100).toFixed(2)}%`;
      if (s === 4) c.label(X(t) + 70, 70, "FAR = FRR: the EER point", { size: 13, weight: 700, tone: "ink" });
      if (s === 5) {
        curve(CLONE, null, "predict", true);
        const cf = 1 - P.cdf(t, CLONE[0], CLONE[1]);
        c.label(X(0.5), 70, `voice clone accepted: ${(cf * 100).toFixed(0)}%`, { size: 13, weight: 700, tone: "bad" });
      }
    };
  };

  // ---------------------------------------------------------------- diarization
  D["diarization"] = (fig, k) => {
    const c = k.canvas(W, H);
    // illustrative two-speaker call: [start s, end s, speaker]
    const SEG = [[0.3, 2.1, 0], [2.4, 4.0, 1], [4.2, 4.9, 0], [4.7, 5.6, 1], [5.9, 8.2, 0], [8.4, 9.6, 1]];
    return (s) => {
      c.clear();
      const stages = [["VAD + segment", 1], ["embed", 2], ["cluster", 3], ["re-segment", 4]];
      const bx = stages.map(([l, st], i) => c.box({ x: 8 + i * 158, y: 20, w: 136, h: 46, label: l, tone: s === 5 ? "muted" : "take", hl: s === st, dim: s === 5 || s < st }));
      bx.forEach((b, i) => { if (i) c.connect(bx[i - 1], b, { tone: "muted" }); });
      if (s === 5) c.box({ x: 120, y: 80, w: 400, h: 40, label: "EEND: one network, frame-level activity per speaker", tone: "predict", hl: true, size: 13 });
      const X = (t) => 60 + t * 56, y0 = 170;
      c.text(14, y0 + 22, "audio", { size: 12, tone: "muted" });
      c.box({ x: X(0), y: y0, w: X(10) - X(0), h: 34, tone: "muted" });
      SEG.forEach(([a, b]) => c.box({ x: X(a), y: y0 + 6, w: X(b) - X(a), h: 22, tone: "bridge", solid: true }));
      if (s >= 2) SEG.forEach(([a, b], i) => c.dot((X(a) + X(b)) / 2, y0 + 64, { r: 7, tone: s >= 3 ? (SEG[i][2] ? "predict" : "paper") : "ink" }));
      if (s >= 2) c.text(14, y0 + 68, "vectors", { size: 12, tone: "muted" });
      if (s >= 3) {
        [0, 1].forEach((spk) => {
          const y = y0 + 100 + spk * 34;
          c.text(14, y + 18, spk ? "spk B" : "spk A", { size: 12, tone: spk ? "predict" : "paper", weight: 700 });
          SEG.filter((g) => g[2] === spk).forEach(([a, b]) => {
            const aa = s >= 4 && a === 4.7 ? 4.75 : a;
            c.box({ x: X(aa), y, w: X(b) - X(aa), h: 24, tone: spk ? "predict" : "paper", solid: true, hl: s === 4 && (a === 4.2 || a === 4.7) });
          });
        });
      }
      if (s >= 4) c.label(X(4.8), y0 + 172, "overlap 4.7–4.9 s", { size: 12, tone: "ink" });
      if (s === 6) c.label(X(8), 100, "→ single-speaker TTS clips", { size: 13, tone: "code", weight: 700 });
      [0, 2, 4, 6, 8, 10].forEach((t) => c.text(X(t), y0 - 8, `${t}s`, { size: 11, anchor: "middle", tone: "muted" }));
    };
  };

  // ---------------------------------------------------------------- speech translation
  D["s2st"] = (fig, k) => {
    const m = k.toggle({ label: "design", options: ["cascade", "end to end", "direct S2ST"], value: "cascade" });
    k.follow(m, { 1: "cascade", 2: "end to end", 3: "direct S2ST", 4: "end to end", 5: "cascade" });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const src = c.box({ x: 8, y: 150, w: 110, h: 60, label: "English speech", tone: "bridge" });
      let last;
      if (m.value === "cascade") {
        const a = c.box({ x: 150, y: 150, w: 100, h: 60, label: "ASR", tone: "take", hl: s === 1 });
        const t = c.box({ x: 280, y: 150, w: 100, h: 60, label: "MT", tone: "take", hl: s === 1 });
        const ts = c.box({ x: 410, y: 150, w: 100, h: 60, label: "TTS", tone: "predict", hl: s === 5 });
        c.connect(src, a); c.connect(a, t, { label: "text" }); c.connect(t, ts, { label: "text" });
        last = ts;
        c.label(330, 80, s === 5 ? "source prosody dropped at the first hand-off" : "errors and delay add at each hand-off", { size: 13, tone: s === 5 ? "bad" : "ink", weight: 700 });
      } else if (m.value === "end to end") {
        const e = c.box({ x: 170, y: 150, w: 150, h: 60, label: "audio encoder", tone: "take", hl: s === 4, sub: s === 4 ? "from wav2vec 2.0" : "" });
        const d = c.box({ x: 350, y: 150, w: 150, h: 60, label: "text decoder", tone: "take", hl: s === 4, sub: s === 4 ? "from mBART" : "" });
        c.connect(src, e); c.connect(e, d);
        last = d;
        c.label(330, 80, s === 4 ? "fine-tune only 20% of parameters (§5.5.3)" : "no transcript in between", { size: 13, tone: "ink", weight: 700 });
      } else {
        const one = c.box({ x: 190, y: 150, w: 300, h: 60, label: "Translatotron: one seq2seq model", tone: "take", hl: true });
        c.connect(src, one);
        last = one;
        c.label(330, 80, "no text at inference; trailed the cascade", { size: 13, tone: "ink", weight: 700 });
      }
      const out = c.box({ x: 540, y: 150, w: 92, h: 60, label: m.value === "end to end" ? "German text" : "Spanish speech", tone: m.value === "end to end" ? "paper" : "bridge" });
      c.connect(last, out);
    };
  };

  // ---------------------------------------------------------------- enhancement
  D["enhancement"] = (fig, k) => {
    const met = k.toggle({ label: "metric", options: ["PESQ-WB", "PESQ-NB"], value: "PESQ-WB" });
    k.follow(met, { 1: "PESQ-WB", 5: "PESQ-NB", 6: "PESQ-WB" });
    const c = k.canvas(W, H);
    const T = [ // Table 10 [model, PESQ-WB, PESQ-NB]
      ["FRCRN", 3.23, null], ["Sudo rm -rf (2022b)", 2.95, null], ["DCTCRN-P", 2.82, null], ["PoCoNet", 2.7885, null],
      ["FullSubNet", 2.777, 3.305], ["RNN-Modulation", 2.75, null], ["Conv-TasNet-SNR", 2.73, null], ["Sudo rm -rf (2022a)", 2.69, null],
      ["RemixIT", 2.34, null], ["SN-Net", null, 3.39], ["DCCRN-E-Aug", null, 3.214], ["DTLN", null, 3.04], ["DCCRN-E", null, 3.04]];
    return (s) => {
      c.clear();
      const j = met.value === "PESQ-WB" ? 1 : 2;
      const rows = T.filter((r) => r[j] != null);
      const hl = { 1: [], 2: ["RemixIT"], 3: ["FullSubNet"], 4: ["FRCRN"], 5: ["FullSubNet"], 6: [] }[s];
      V.title(c, `${met.value} on the DNS challenge · scale −0.5 to 4.5`);
      c.bars({ x: 8, y: 28, w: 624, rowH: Math.min(34, Math.floor(320 / rows.length)), labelW: 170, tones: [j === 1 ? "paper" : "take"], max: 4.5,
        fmt: (v) => String(v), rows: rows.map((r) => ({ label: r[0], values: [r[j]], hl: hl.includes(r[0]), dim: hl.length > 0 && !hl.includes(r[0]) })) });
      if (s === 1) c.label(470, 200, "noisy in → clean out", { size: 13, tone: "predict", weight: 700 });
      if (s === 5) c.label(470, 250, "only FullSubNet reports both", { size: 13, tone: "predict", weight: 700 });
    };
  };

  // ---------------------------------------------------------------- separation
  D["separation"] = (fig, k) => {
    const set = k.toggle({ label: "benchmark", options: ["WSJ0-2mix", "speakers 2→20"], value: "WSJ0-2mix" });
    k.follow(set, { 1: "WSJ0-2mix", 3: "WSJ0-2mix", 5: "speakers 2→20" });
    const c = k.canvas(W, H);
    const T = [ // Table 11, WSJ0-2mix SI-SDRi (dB)
      ["Conv-TasNet (2019)", 15.3], ["Dual-path RNN", 18.8], ["Gated DualPathRNN", 20.12], ["Sandglasset", 21.0], ["SepFormer", 22.3],
      ["Sepit", 22.4], ["MossFormer (M)", 22.5], ["MossFormer (L)", 22.8], ["Separate And Diffuse (2023)", 23.9]];
    const N = [ // Table 11, Separate And Diffuse and Hungarian PIT on Libri{N}Mix
      ["Libri2Mix", 21.5, null], ["Libri5Mix", 14.2, 12.72], ["Libri10Mix", 9, 7.78], ["Libri20Mix", 5.2, 4.26]];
    return (s) => {
      c.clear();
      if (s <= 2) {
        const mix = c.box({ x: 20, y: 140, w: 140, h: 70, label: "mixture", sub: "two voices", tone: "bridge" });
        const net = c.box({ x: 230, y: 140, w: 140, h: 70, label: "separator", tone: "take" });
        const o1 = c.box({ x: 450, y: 70, w: 170, h: 56, label: "output 1", tone: "paper" });
        const o2 = c.box({ x: 450, y: 230, w: 170, h: 56, label: "output 2", tone: "predict" });
        c.connect(mix, net); c.connect(net, o1); c.connect(net, o2);
        if (s === 2) c.label(320, 320, "A↔1, B↔2 or A↔2, B↔1? keep the better pairing", { size: 13, weight: 700, tone: "ink" });
        return;
      }
      if (set.value === "WSJ0-2mix") {
        const hl = { 3: [], 4: [0, 8], 5: [8] }[s] || [];
        V.title(c, "SI-SDRi (dB) on WSJ0-2mix · higher is better");
        V.tbars(c, T.map((r, i) => [r[0], r[1], hl.includes(i), hl.length > 0 && !hl.includes(i)]), { y: 30, h: 320, labelW: 200, max: 25, fmt: (v) => String(v) });
      } else {
        V.title(c, "SI-SDRi (dB): Separate And Diffuse (blue) · Hungarian PIT (grey)");
        c.bars({ x: 8, y: 50, w: 624, rowH: 70, labelW: 120, tones: ["paper", "muted"], max: 23, fmt: (v) => String(v),
          rows: N.map((r, i) => ({ label: r[0], values: [r[1], r[2] ?? NaN], hl: i === 0 || i === 3 })) });
      }
    };
  };

  // ---------------------------------------------------------------- quality assessment
  D["quality-assessment"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const col = (x, title, ins, tone, on, dim) => {
        c.text(x + 95, 22, title, { size: 13, anchor: "middle", weight: 700, tone: dim ? "muted" : "ink" });
        const boxes = ins.map((l, i) => c.box({ x, y: 40 + i * 62, w: 190, h: 48, label: l, tone: i === 0 ? "bridge" : "paper", dim, hl: on, size: 13 }));
        const p = c.box({ x, y: 190, w: 190, h: 48, label: "predictor", tone: "take", dim, hl: on });
        boxes.forEach((b) => c.connect(b, p, { tone: "muted", dim }));
        return p;
      };
      if (s === 1) {
        const clip = c.box({ x: 40, y: 140, w: 160, h: 60, label: "one clip", tone: "bridge" });
        const pan = c.box({ x: 260, y: 140, w: 170, h: 60, label: "20 listeners", sub: "rate 1 to 5", tone: "predict", hl: true });
        const m = c.box({ x: 490, y: 140, w: 120, h: 60, label: "MOS", tone: "paper" });
        c.connect(clip, pan); c.connect(pan, m);
        c.label(320, 270, "slow · costly · does not scale", { size: 13, tone: "bad", weight: 700 });
        return;
      }
      const a = col(10, "intrusive (PESQ, POLQA)", ["test clip", "clean original"], "paper", s === 2, s > 2);
      if (s >= 3) col(222, "reference-free", ["test clip"], "paper", s === 3, s > 3 && s !== 5);
      if (s >= 4) col(434, "non-matching (NORESQA)", ["test clip", "any clean speech"], "paper", s === 4, s === 5);
      if (s === 2) c.label(105, 300, "real audio has no clean original", { size: 13, tone: "bad", weight: 700 });
      if (s === 5) c.label(317, 300, "TTS output: no original exists → this column", { size: 13, tone: "code", weight: 700 });
    };
  };

  // ---------------------------------------------------------------- SLU
  D["slu"] = (fig, k) => {
    const c = k.canvas(W, H);
    const words = ["hey", "Cora,", "send", "fifty", "pounds", "to", "Mum", "tomorrow"];
    return (s) => {
      c.clear();
      const tone = (i) => {
        if (s === 2 && i < 2) return "predict";
        if (s >= 4 && [3, 4].includes(i)) return "paper";
        if (s >= 4 && i === 6) return "take";
        if (s >= 4 && i === 7) return "code";
        return "muted";
      };
      c.chips({ x: 20, y: 30, items: words.map((t, i) => ({ t, tone: tone(i), hl: tone(i) !== "muted" })), size: 16, maxW: 600 });
      const ks = c.box({ x: 20, y: 130, w: 180, h: 54, label: "keyword spotting", sub: s >= 2 ? "KWT 97.7%" : "", tone: "predict", hl: s === 2, dim: s !== 1 && s !== 2 });
      const ic = c.box({ x: 230, y: 130, w: 180, h: 54, label: "intent", sub: s >= 3 ? "transfer_money" : "", tone: "take", hl: s === 3, dim: s !== 1 && s !== 3 });
      const sf = c.box({ x: 440, y: 130, w: 180, h: 54, label: "slots", sub: s >= 4 ? "ATIS best F1 0.9846" : "", tone: "paper", hl: s === 4, dim: s !== 1 && s !== 4 });
      c.connect(ks, ic, { tone: "muted" }); c.connect(ic, sf, { tone: "muted" });
      if (s >= 4) {
        const sl = [["amount", "£50", "paper"], ["payee", "Mum", "take"], ["date", "tomorrow", "code"]];
        sl.forEach(([a, b, t], i) => c.box({ x: 20 + i * 210, y: 220, w: 190, h: 44, label: `${a} = ${b}`, tone: t, hl: s === 4, size: 14 }));
      }
      if (s === 5) c.box({ x: 120, y: 290, w: 400, h: 50, label: "TTS: \"Fifty pounds to Mum, tomorrow?\"", tone: "bridge", hl: true });
    };
  };

  // ---------------------------------------------------------------- edge tasks
  D["edge-tasks"] = (fig, k) => {
    const c = k.canvas(W, H);
    const rows = [
      ["super-resolution", "16/24 kHz → 48 kHz (NU-Wave)", "paper", 1],
      ["phone channel", "48 kHz TTS → 8 kHz line", "predict", 2],
      ["voice activity detection", "speech or not?", "paper", 3],
      ["turn-taking", "caller stopped → TTS may start", "predict", 4],
      ["audio-visual", "lips, AV separation, talking faces", "paper", 5]];
    return (s) => {
      c.clear();
      rows.forEach(([q, a, tone, st], i) => {
        if (s < st) return;
        const y = 8 + i * 70, now = s === st;
        c.box({ x: 8, y, w: 624, h: 60, tone: "muted", hl: now });
        c.text(22, y + 35, q, { size: 14, weight: now ? 700 : 400, maxW: 220, lines: 1, inBox: true });
        c.box({ x: 260, y: y + 8, w: 364, h: 44, label: a, tone, hl: now, size: 13 });
      });
    };
  };

  // ---------------------------------------------------------------- domain + meta
  D["domain-meta"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      V.board(c, [
        ["domain shift", "audiobooks → phone calls", "bad"],
        ["gradient reversal", "domain-blind features", "take"],
        ["TTS speaker adaptation", "AdaSpeech: new voice or domain", "paper"],
        ["machine speech chain", "TTS makes in-domain speech for ASR", "code"],
        ["meta-learning", "Meta-TTS: voice from few samples", "predict"]], s, { split: 270 });
    };
  };

  // ---------------------------------------------------------------- PEFT calculator
  D["peft"] = (fig, k) => {
    const d = k.slider({ label: "width d", min: 256, max: 2048, step: 256, value: 1024, fmt: (v) => String(v) });
    const r = k.slider({ label: "rank r / bottleneck m", min: 4, max: 64, step: 4, value: 8, fmt: (v) => String(v) });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const dd = d.value, rr = r.value, full = dd * dd, P = 10;
      const counts = [["full matrix (d × d)", full, "muted"], ["adapter (2·d·m)", 2 * dd * rr, "paper"], ["prefix (2·len·d)", 2 * P * dd, "take"], ["LoRA (2·d·r)", 2 * dd * rr, "code"]];
      if (s === 1) {
        const fz = c.box({ x: 30, y: 80, w: 300, h: 200, label: "pre-trained backbone", sub: "frozen", tone: "muted", hl: true });
        const t1 = c.box({ x: 420, y: 80, w: 180, h: 52, label: "module: task A", tone: "code" });
        const t2 = c.box({ x: 420, y: 154, w: 180, h: 52, label: "module: task B", tone: "code" });
        const t3 = c.box({ x: 420, y: 228, w: 180, h: 52, label: "module: voice C", tone: "code" });
        [t1, t2, t3].forEach((t) => c.connect(t, fz, { tone: "muted", dash: true }));
        return;
      }
      if (s === 2) {
        const h = c.box({ x: 20, y: 150, w: 110, h: 60, label: `h (${dd})`, tone: "paper" });
        const dn = c.box({ x: 170, y: 150, w: 110, h: 60, label: "W_down", sub: `${dd} → ${rr}`, tone: "code", hl: true });
        const g = c.box({ x: 320, y: 150, w: 80, h: 60, label: "g(·)", tone: "take" });
        const up = c.box({ x: 440, y: 150, w: 110, h: 60, label: "W_up", sub: `${rr} → ${dd}`, tone: "code", hl: true });
        c.connect(h, dn); c.connect(dn, g); c.connect(g, up);
        c.path(`M75,150 C75,70 495,70 495,150`, { tone: "muted", dash: true });
        c.label(285, 60, "+ h (residual)", { size: 13, tone: "muted" });
        c.text(320, 290, `= ${(2 * dd * rr).toLocaleString()} trainable weights (Eq. 30)`, { size: 15, anchor: "middle", mono: true, weight: 700 });
        return;
      }
      if (s === 3) {
        c.chips({ x: 30, y: 60, items: [...Array(4)].map((_, i) => ({ t: `P${i + 1}`, tone: "take", hl: true })).concat([...Array(6)].map((_, i) => ({ t: `k${i + 1}`, tone: "muted" }))), size: 15 });
        c.text(30, 120, "keys: learnable prefix + the clip's own keys (same for values)", { size: 13, tone: "ink" });
        c.box({ x: 30, y: 150, w: 260, h: 56, label: "queries Q: unchanged", tone: "paper" });
        c.text(320, 290, `= ${(2 * P * dd).toLocaleString()} weights per layer (len ${P})`, { size: 15, anchor: "middle", mono: true, weight: 700 });
        return;
      }
      if (s === 4) {
        const x = c.box({ x: 20, y: 150, w: 90, h: 60, label: "x", tone: "paper" });
        const w0 = c.box({ x: 170, y: 60, w: 180, h: 70, label: "W (frozen)", sub: `${dd} × ${dd}`, tone: "muted" });
        const a = c.box({ x: 170, y: 230, w: 90, h: 60, label: "W_down", sub: `${dd}×${rr}`, tone: "code", hl: true });
        const b = c.box({ x: 290, y: 230, w: 90, h: 60, label: "W_up", sub: `${rr}×${dd}`, tone: "code", hl: true });
        const sum = c.box({ x: 450, y: 150, w: 70, h: 60, label: "+", tone: "take" });
        const hh = c.box({ x: 560, y: 150, w: 70, h: 60, label: "h", tone: "paper" });
        c.connect(x, w0); c.connect(x, a); c.connect(a, b); c.connect(w0, sum); c.connect(b, sum, { label: "× s" }); c.connect(sum, hh);
        return;
      }
      V.title(c, `trainable weights for one ${dd} × ${dd} matrix`);
      V.tbars(c, counts.map(([l, v, t]) => [l, v, t === "code", false]), { y: 50, h: 280, labelW: 180, fmt: (v) => v.toLocaleString(), max: full });
      c.label(420, 320, `LoRA = ${(100 * 2 * dd * rr / full).toFixed(2)}% of the matrix`, { size: 13, tone: "code", weight: 700 });
    };
  };

  // ---------------------------------------------------------------- PEFT for TTS
  D["peft-tts"] = (fig, k) => {
    const met = k.toggle({ label: "metric", options: ["MCD", "WER"], value: "MCD" });
    const ds = k.toggle({ label: "data", options: ["LTS", "L2ARCTIC"], value: "LTS" });
    k.follow(met, { 1: "MCD", 2: "MCD", 3: "MCD", 4: "WER", 5: "MCD", 6: "WER" });
    const c = k.canvas(W, H);
    const T = [ // Table 15 [method, params, LTS MCD, LTS WER, L2 MCD, L2 WER]
      ["Fine-tuning", 35802977, 6.2038, 0.2655, 6.71469, 0.2141], ["Adapter", 659200, 6.1634, 0.3143, 6.544, 0.2504],
      ["Prefix", 153600, 6.2523, 0.3334, 7.4264, 0.3244], ["LoRA", 81920, 6.8319, 0.3786, 7.0698, 0.3291],
      ["ConvAdapter", 108800, 6.9202, 0.3365, 6.9712, 0.3227]];
    return (s) => {
      c.clear();
      const j = (ds.value === "LTS" ? 2 : 4) + (met.value === "WER" ? 1 : 0);
      const hl = { 1: [0], 2: [], 3: [1], 4: [0], 5: [3], 6: [1, 3] }[s];
      V.title(c, `${met.value} on ${ds.value} · lower is better`);
      c.bars({ x: 8, y: 34, w: 624, rowH: 60, labelW: 230, tones: [met.value === "MCD" ? "take" : "paper"], min: 0,
        max: met.value === "MCD" ? 8 : 0.42, fmt: (v) => v.toFixed(met.value === "MCD" ? 2 : 3),
        rows: T.map((r, i) => ({ label: `${r[0]} · ${r[1].toLocaleString()} w`, values: [r[j]], hl: hl.includes(i), dim: hl.length > 0 && !hl.includes(i) })) });
    };
  };

  // ---------------------------------------------------------------- compression
  D["compression"] = (fig, k) => {
    const c = k.canvas(W, H);
    const Wm = [ // made-up 5 x 5 weights (illustrative)
      [0.82, -0.05, 0.41, 0.03, -0.66], [0.12, 0.74, -0.02, 0.38, 0.09], [-0.48, 0.06, 0.91, -0.11, 0.27],
      [0.04, -0.35, 0.15, 0.68, -0.01], [0.57, 0.21, -0.08, -0.44, 0.79]];
    const prune = Wm.map((r) => r.map((v) => (Math.abs(v) < 0.2 ? 0 : v)));
    // rank-1 from the first row/col pattern: u = column 0, v = row 0 / W[0][0]
    const u = Wm.map((r) => r[0]), v = Wm[0].map((x) => x / Wm[0][0]);
    const q4 = (x) => Math.round(x / (0.91 / 7)) * (0.91 / 7); // 4-bit symmetric: 15 levels of 0.13
    const quant = Wm.map((r) => r.map(q4));
    const fmt = (x) => (x === 0 ? "0" : x.toFixed(2).replace("0.", "."));
    return (s) => {
      c.clear();
      if (s === 1) {
        c.text(110, 24, "teacher", { size: 13, anchor: "middle", weight: 700 });
        c.matrix({ x: 10, y: 40, data: Wm, cell: 40, cellH: 34, fmt, tone: () => "paper" });
        c.text(470, 94, "student", { size: 13, anchor: "middle", weight: 700 });
        const st = c.matrix({ x: 410, y: 110, data: [[0.8, 0.4], [-0.5, 0.9]], cell: 60, cellH: 40, fmt, tone: () => "take" });
        c.arrow(230, 120, 400, 140, { tone: "predict", label: "copy outputs" });
        return;
      }
      const data = s === 2 ? prune : s === 3 ? null : s === 4 ? quant : Wm;
      if (s <= 4 && data) {
        c.matrix({ x: 30, y: 60, data, cell: 54, cellH: 44, fmt, tone: (i, j, x) => (x === 0 ? "bad" : s === 4 ? "code" : "paper") });
        c.text(165, 36, s === 2 ? `|w| < 0.2 set to 0: ${prune.flat().filter((x) => x === 0).length} of 25 pruned` : "4-bit: every weight snaps to a 0.13 step", { size: 13, anchor: "middle", weight: 700 });
      }
      if (s === 3) {
        c.text(120, 36, "u (5 × 1)", { size: 13, anchor: "middle", weight: 700 });
        c.matrix({ x: 90, y: 60, data: u.map((x) => [x]), cell: 60, cellH: 44, fmt, tone: () => "code" });
        c.text(370, 36, "v (1 × 5)", { size: 13, anchor: "middle", weight: 700 });
        c.matrix({ x: 220, y: 60, data: [v], cell: 60, cellH: 44, fmt, tone: () => "code" });
        c.label(370, 200, "25 weights → 10: a rank-1 stand-in for W", { size: 13, weight: 700, tone: "ink" });
      }
      if (s >= 2 && s <= 4) {
        const note = { 2: "lottery-ticket pruning (§6.3.3)", 3: "low-rank: ½ size, 1.35× faster (§6.3.3)", 4: "32-bit → 4-bit: 8× smaller weights" }[s];
        c.label(470, 320, note, { size: 13, tone: "predict", weight: 700 });
      }
      if (s === 5) {
        V.title(c, "wav2vec 2.0 size after compression (§6.3.3) · relative to original");
        V.tbars(c, [["original", 1, false, false], ["quantized, no KD (+0.1% WER)", 1 / 3.6, true, false], ["KD + quantized (+7% WER)", 1 / 4.8, true, false]],
          { y: 80, h: 240, labelW: 250, max: 1, fmt: (x) => (x === 1 ? "1×" : `1/${(1 / x).toFixed(1)}`) });
      }
    };
  };
})();
