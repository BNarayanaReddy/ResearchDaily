/* Drawings for "Since 2023", "At a bank" and "Your move" (part 7). FBU = found by us, arXiv id in the comment. */
(function () {
  const D = RD.drawings, V = RD.sdr, W = V.W, H = V.H, EX = V.EX;
  const P = (V.p7 = {});

  // 3×3 tiles: [name, verdict, tone]; lit sets per step.
  D["predictions"] = (fig, k) => {
    const c = k.canvas(W, H);
    const T = [
      ["Large speech models", "yes · VALL-E 60K h", "code"],          // FBU 2301.02111
      ["Multilingual", "yes · F5-TTS 100K h", "code"],               // FBU 2410.06885
      ["Multimodal", "yes · Moshi duplex", "code"],                  // FBU 2410.00037
      ["In-context learning", "yes · 3 s voice prompt", "code"],     // FBU 2301.02111
      ["Controllable TTS", "partly · our call", "predict"],
      ["Parameter-efficient", "partly · our call", "predict"],
      ["Explainability", "open", "muted"],
      ["Brain-inspired", "open", "muted"],
      ["Text-to-audio for speech", "yes · Audiobox", "code"],         // FBU 2312.15821
    ];
    const lit = { 1: [], 2: [0, 1], 3: [3, 2], 4: [8], 5: [6, 7], 6: [] };
    return (s) => {
      c.clear();
      const tw = 200, th = 74, gx = 12, gy = 10, x0 = 8, y0 = 8;
      T.forEach(([n, v, tone], i) => {
        const col = i % 3, row = Math.floor(i / 3), x = x0 + col * (tw + gx), y = y0 + row * (th + gy);
        const on = lit[s].includes(i), shown = s >= 2 ? (s === 6 || on || [0, 1, 3, 2, 8, 6, 7].slice(0, { 2: 2, 3: 4, 4: 5, 5: 7, 6: 9 }[s] || 0).includes(i)) : true;
        c.box({ x, y, w: tw, h: th, label: n, sub: s >= 2 && shown ? v : "§7 prediction " + (i + 1), tone: s >= 2 && shown ? tone : "muted", hl: on, dim: s >= 2 && !on && s !== 6 });
      });
      if (s === 6) {
        c.box({ x: 8, y: 270, w: 624, h: 70, label: "Underplayed: codec tokens + flow matching", sub: "VALL-E named once (§3.3.2); flow matching never", tone: "take", hl: true });
      }
    };
  };

  D["codec-tokens"] = (fig, k) => {
    const n = k.slider({ label: "codebooks", min: 1, max: 32, step: 1, value: 1 });
    k.follow(n, { 1: 1, 2: 1, 3: 4, 4: 8, 5: 8 });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const q = n.value;
      if (s === 6) {
        V.code(c, [
          "r = z                      # (B, T, D) encoder frames",
          "codes = []",
          "for cb in codebooks:       # cb: (1024, D)",
          "    d = ((r[..., None, :] - cb) ** 2).sum(-1)  # (B, T, 1024)",
          "    i = d.argmin(-1)       # (B, T) one index per frame",
          "    codes.append(i)",
          "    r = r - cb[i]          # pass the leftover on",
          "z_hat = z - r              # = sum of chosen vectors",
        ], [3, 4, 6], { y: 40, lh: 32, size: 13 });
        return;
      }
      const wav = c.box({ x: 8, y: 20, w: 150, h: 60, label: "24 kHz audio", sub: "320 samples", tone: "bridge", hl: s === 1 });
      const enc = c.box({ x: 200, y: 20, w: 150, h: 60, label: "encoder", sub: "÷ 320 in time", tone: "take", hl: s === 1 });
      const fr = c.box({ x: 392, y: 20, w: 240, h: 60, label: "1 frame", sub: "75 frames per second", tone: "paper", hl: s === 1 });   // FBU 2210.13438 §3.1
      c.connect(wav, enc); c.connect(enc, fr);
      if (s >= 2) {
        // residual stack: bar widths shrink as residual error shrinks (illustrative)
        const shown = Math.min(q, 8);
        for (let i = 0; i < shown; i++) {
          const w = Math.max(40, 300 * Math.pow(0.7, i));
          c.box({ x: 8, y: 102 + i * 24, w, h: 20, label: i === 0 ? "codebook 1 · 1,024 codes" : `cb ${i + 1}`, size: 11, tone: i === 0 ? "paper" : "take", hl: (s === 2 && i === 0) || (s === 3 && i > 0) });
        }
        if (q > 8) c.text(8, 102 + 8 * 24 + 12, `+ ${q - 8} more codebooks`, { size: 12, tone: "muted" });
        c.label(330, 120, "each row fixes the leftover", { size: 12, tone: "muted" });
      }
      if (s >= 4) {
        const kbps = (q * 75 * 10) / 1000;   // 75 Hz × 10 bits per codebook
        c.box({ x: 340, y: 160, w: 292, h: 56, label: `${q} × 75 × 10 bits = ${kbps.toFixed(kbps < 10 ? 2 : 1)} kbps`, mono: true, size: 13, tone: "predict", hl: s === 4 });
      }
      if (s >= 5) {
        const frames = Math.round(EX.sec * 75);   // EX 3.4 s → 255
        c.box({ x: 340, y: 234, w: 292, h: 56, label: `bank line: ${frames} × ${q} = ${(frames * q).toLocaleString()} tokens`, mono: true, size: 13, tone: "code", hl: true });
        c.box({ x: 340, y: 300, w: 292, h: 40, label: `mel: ${EX.frames} × 80 real numbers`, mono: true, size: 12, tone: "muted" });
      }
    };
  };

  D["codec-lm"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      if (s === 6) {
        const pr = [0.34, 0.22, 0.16, 0.1, 0.07, 0.05, 0.04, 0.02];   // illustrative next-token probabilities
        let cum = 0; const inP = pr.map((v) => { const keep = cum < 0.8; cum += v; return keep; });
        V.title(c, "one AR step: 8 candidate tokens (illustrative)");
        pr.forEach((v, i) => {
          const x = 30 + i * 74, h = v * 500, keepK = i < 3, keepP = inP[i];
          c.box({ x, y: 200 - h, w: 56, h, tone: keepK ? "predict" : keepP ? "take" : "muted", hl: keepK });
          c.text(x + 28, 220, v.toFixed(2), { size: 12, anchor: "middle", mono: true, tone: "muted" });
        });
        c.box({ x: 8, y: 240, w: 300, h: 44, label: "top-k = 3: keep the 3 tallest", size: 13, tone: "predict" });
        c.box({ x: 324, y: 240, w: 308, h: 44, label: "top-p = 0.8: keep until sum ≥ 0.8", size: 13, tone: "take" });
        c.box({ x: 8, y: 296, w: 624, h: 44, label: "renormalize the kept probabilities, then draw one", size: 13, tone: "code", hl: true });
        return;
      }
      if (s <= 4) {
        const cols = 22, cw = 26, ch = 26, x0 = 60, y0 = 70, pr = 7;   // illustrative grid
        c.text(8, 62, "row", { size: 12, tone: "muted" });
        c.box({ x: x0, y: 14, w: pr * cw - 4, h: 34, label: "3 s prompt", size: 12, tone: "bridge", hl: s === 1 });
        c.box({ x: x0 + pr * cw, y: 14, w: (cols - pr) * cw - 4, h: 34, label: "new speech for the phonemes", size: 12, tone: "paper", hl: s === 1 });
        for (let r = 0; r < 8; r++) {
          c.text(40, y0 + r * (ch + 2) + 17, String(r + 1), { size: 12, anchor: "end", tone: "muted" });
          for (let j = 0; j < cols; j++) {
            const prompt = j < pr;
            let tone = "muted", on = false;
            if (prompt) tone = "bridge";
            else if (r === 0 && s >= 2) { tone = "predict"; on = s === 2; }
            else if (r > 0 && s >= 3) { tone = "take"; on = s === 3; }
            const filled = prompt || (r === 0 && s >= 2) || (r > 0 && s >= 3);
            const x = x0 + j * cw, y = y0 + r * (ch + 2);
            c.dot(x + (cw - 4) / 2, y + (ch - 4) / 2, { r: filled ? 7 : 3, tone: filled ? tone : "muted", hl: on });
          }
        }
        if (s >= 2 && s <= 3) c.label(330, 316, s === 2 ? "AR: row 1, one token at a time" : "NAR: rows 2–8, one pass each", { size: 13, tone: s === 2 ? "predict" : "take", weight: 700 });
        if (s >= 4) {
          c.box({ x: 60, y: 300, w: 330, h: 44, label: "EnCodec decoder → 24 kHz audio", size: 13, tone: "code", hl: true });
        }
      } else {
        V.title(c, "LibriSpeech zero-shot · VALL-E paper, Table 2 (found by us)");
        const rows = [["real recordings", 2.2, 0.754], ["YourTTS", 7.7, 0.337], ["VALL-E", 5.9, 0.580]];   // FBU 2301.02111 Table 2
        c.text(170, 52, "WER % (lower is better)", { size: 13, weight: 700, tone: "muted" });
        V.tbars(c, rows.map(([n, w]) => [n, w, n === "VALL-E", false]), { y: 64, h: 120, labelW: 150, max: 10, tone: "paper", fmt: (v) => v.toFixed(1) });
        c.text(170, 214, "speaker similarity (higher is better)", { size: 13, weight: 700, tone: "muted" });
        V.tbars(c, rows.map(([n, , sp]) => [n, sp, n === "VALL-E", false]), { y: 226, h: 120, labelW: 150, max: 1, tone: "code", fmt: (v) => v.toFixed(3) });
      }
    };
  };

  D["flow-matching"] = (fig, k) => {
    const steps = k.slider({ label: "sampling steps", min: 1, max: 16, step: 1, value: 2 });
    k.follow(steps, { 1: 16, 2: 2, 3: 2 });
    const c = k.canvas(W, H);
    // Illustrative 2-D toy: noise points at left, data points at right.
    const pairs = [[60, 90, 560, 150], [60, 180, 560, 110], [60, 270, 560, 250], [60, 320, 560, 300]];
    const curve = (a, t) => {   // a curved "diffusion-like" path (illustrative)
      const [x0, y0, x1, y1] = a, bend = 70 * Math.sin(Math.PI * t);
      return [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t - bend];
    };
    return (s) => {
      c.clear();
      if (s === 6) {
        V.code(c, [
          "# training: x1 = real mels (B, T, 80), cond = text",
          "x0 = torch.randn_like(x1)",
          "t = torch.rand(B, 1, 1)",
          "xt = (1 - t) * x0 + t * x1",
          "loss = ((v(xt, t, cond) - (x1 - x0)) ** 2).mean()",
          "# sampling: N Euler steps from noise",
          "x = torch.randn(B, T, 80)",
          "for i in range(N): x = x + v(x, i / N, cond) / N",
        ], [3, 4, 7], { y: 40, lh: 32, size: 13 });
        return;
      }
      c.text(60, 24, "noise", { size: 13, anchor: "middle", tone: "muted", weight: 700 });
      c.text(560, 24, "speech (mel)", { size: 13, anchor: "middle", tone: "bridge", weight: 700 });
      const n = steps.value;
      pairs.forEach((a) => {
        const [x0, y0, x1, y1] = a;
        if (s === 1 || s >= 3) {
          let d = `M${x0},${y0}`;
          for (let i = 1; i <= 40; i++) { const [x, y] = curve(a, i / 40); d += ` L${x},${y}`; }
          c.path(d, { tone: "muted", dash: true, dim: s >= 3 && s !== 3 });
        }
        if (s >= 2) c.line(x0, y0, x1, y1, { tone: "take", width: 2, hl: s === 2 });
        // Euler steps along the straight path land exactly; along the curve with too few steps they miss.
        if (s >= 3) {
          for (let i = 1; i <= n; i++) {
            const t = i / n;
            c.dot(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, { r: 4, tone: "take" });
          }
        }
        c.dot(x0, y0, { r: 7, tone: "muted" });
        c.dot(x1, y1, { r: 7, tone: "bridge" });
      });
      if (s === 1) c.label(310, 330, "diffusion: curved, many small steps", { size: 13, tone: "muted", weight: 700 });
      if (s === 2) c.label(310, 330, "flow matching: learn the straight-line velocity", { size: 13, tone: "take", weight: 700 });
      if (s === 3) c.label(310, 330, `${n} Euler step${n > 1 ? "s" : ""} on a straight path`, { size: 13, tone: "take", weight: 700 });
      if (s === 4) c.box({ x: 170, y: 296, w: 300, h: 50, label: "Voicebox: WER 1.9% vs VALL-E 5.9%", sub: "up to 20× faster (abstract)", size: 13, tone: "code", hl: true });   // FBU 2306.15687
      if (s === 5) c.box({ x: 150, y: 296, w: 340, h: 50, label: "LLM tokens → flow-matching decoder", sub: "CosyVoice; F5-TTS RTF 0.15", size: 13, tone: "predict", hl: true });   // FBU 2407.05407, 2410.06885
    };
  };

  D["bank-voice"] = (fig, k) => {
    const llm = k.slider({ label: "model first reply", min: 100, max: 1000, step: 50, value: 300, fmt: (v) => `${v} ms` });
    const rtf = k.slider({ label: "TTS RTF", min: 0.05, max: 1, step: 0.05, value: 0.3, fmt: (v) => v.toFixed(2) });
    const c = k.canvas(W, H);
    const order = ["require", "latency", "parts", "data", "train", "eval", "serve", "monitor", "safety"];
    const lit = { 1: [0], 2: [1], 3: [2], 4: [3, 4], 5: [5, 6], 6: [7, 8] };
    return (s) => {
      c.clear();
      order.forEach((t, i) => c.box({ x: 8 + i * 70, y: 6, w: 64, h: 32, label: t, size: 11, tone: lit[s].includes(i) ? "predict" : "muted", hl: lit[s].includes(i), dim: !lit[s].includes(i) }));
      if (s === 1) {
        c.box({ x: 8, y: 60, w: 200, h: 70, label: "voice or text in", sub: "Spending Insights trial", size: 13, tone: "paper" });
        c.box({ x: 220, y: 60, w: 200, h: 70, label: "follow-ups, topic changes", sub: "and interruptions", size: 13, tone: "paper" });
        c.box({ x: 432, y: 60, w: 200, h: 70, label: "in-house SLMs", sub: "proprietary models", size: 13, tone: "paper" });
      }
      if (s === 3) {
        const a = c.box({ x: 8, y: 60, w: 130, h: 54, label: "Nemotron ASR", size: 13, tone: "bridge" });
        const b = c.box({ x: 180, y: 60, w: 110, h: 54, label: "SLMs", size: 13, tone: "take" });
        const t = c.box({ x: 332, y: 60, w: 110, h: 54, label: "TTS", size: 13, tone: "bridge" });
        c.connect(a, b); c.connect(b, t);
        c.box({ x: 470, y: 60, w: 162, h: 54, label: "cascade", sub: "debuggable parts", size: 13, tone: "muted" });
        c.box({ x: 8, y: 134, w: 434, h: 54, label: "full-duplex model: listens while speaking", size: 13, tone: "take" });
        c.box({ x: 470, y: 134, w: 162, h: 54, label: "Moshi ~200 ms", size: 13, tone: "muted" });   // FBU 2410.00037
      }
      if (s === 4) {
        c.box({ x: 8, y: 60, w: 300, h: 70, label: "\"last quarter\" → \"last water\"", sub: "Scottish accent, before the fix", size: 13, tone: "bad" });
        c.box({ x: 332, y: 60, w: 300, h: 70, label: "20% fewer misheard words", sub: "UK accents + banking terms", size: 13, tone: "code" });
      }
      if (s === 5) {
        c.box({ x: 8, y: 60, w: 300, h: 70, label: "RTF = compute time ÷ audio time", mono: true, size: 12, tone: "paper" });
        c.box({ x: 332, y: 60, w: 300, h: 70, label: "stream 0.5 s chunks", sub: "play while the rest is made", size: 13, tone: "code" });
      }
      if (s === 6) {
        c.box({ x: 8, y: 60, w: 300, h: 70, label: "caller speaks → stop playback", sub: "barge-in", size: 13, tone: "predict" });
        c.box({ x: 332, y: 60, w: 300, h: 70, label: "spoofing · watermark · consent", sub: "next pages", size: 13, tone: "bad" });
      }
      if (s >= 2) {
        // Our assumed numbers: 300 ms end-of-speech detection, 0.5 s first chunk.
        const ep = 300, first = rtf.value * 500, tot = ep + llm.value + first, X = (ms) => 8 + ms * 0.36;
        c.text(8, 222, `time to first audio = ${ep} + ${llm.value} + ${Math.round(first)} = ${Math.round(tot)} ms`, { size: 14, mono: true, weight: 700, tone: "predict" });
        c.box({ x: X(0), y: 236, w: X(ep) - X(0), h: 40, label: "endpoint", size: 11, tone: "bridge", hl: s === 2 });
        c.box({ x: X(ep), y: 236, w: X(ep + llm.value) - X(ep), h: 40, label: "reply", size: 11, tone: "take", hl: s === 2 });
        c.box({ x: X(ep + llm.value), y: 236, w: Math.max(36, X(tot) - X(ep + llm.value)), h: 40, label: "TTS", size: 11, tone: "code", hl: s === 2 });
        c.text(8, 310, `whole 3.4 s line without streaming: ${Math.round(ep + llm.value + rtf.value * 3400)} ms`, { size: 13, mono: true, tone: "muted" });
      }
    };
  };

  D["bank-normalization"] = (fig, k) => {
    const T = k.toggle({ label: "input", options: ["money", "date", "sort code", "merchant"], value: "money" });
    k.follow(T, { 1: "money", 2: "date", 3: "sort code", 4: "merchant", 5: "date" });
    const c = k.canvas(W, H);
    const R = {
      money: ["£1,250.75", ["one thousand", "two hundred", "and fifty", "pounds", "seventy-five", "pence"], ["twelve fifty point seven five"]],
      date: ["03/05/2026", ["the third", "of May", "twenty", "twenty-six"], ["March the fifth"]],
      "sort code": ["12-34-56", ["twelve,", "thirty-four,", "fifty-six"], ["twelve thousand…"]],
      merchant: ["TK Maxx", ["T", "K", "Max"], ["tuck max"]],
    };
    return (s) => {
      c.clear();
      const [raw, good, bad] = R[T.value];
      const a = c.box({ x: 8, y: 20, w: 200, h: 60, label: raw, mono: true, tone: "paper", hl: s <= 4 });
      const fe = c.box({ x: 250, y: 20, w: 170, h: 60, label: "text normalizer", sub: T.value === "date" ? "locale: en-GB" : T.value === "merchant" ? "lexicon lookup" : "type-aware", tone: "take" });
      c.connect(a, fe);
      c.text(8, 104, "should say", { size: 13, weight: 700, tone: "code" });
      c.chips({ x: 8, y: 114, items: good.map((t) => ({ t, tone: "code" })), size: 14, maxW: 620 });
      c.text(8, 206, "must not say", { size: 13, weight: 700, tone: "bad" });
      c.chips({ x: 8, y: 216, items: bad.map((t) => ({ t, tone: "bad", dashed: true })), size: 14, maxW: 620 });
      if (s >= 5) c.box({ x: 8, y: 264, w: 624, h: 38, label: '<say-as interpret-as="date" format="dmy">03/05/2026</say-as>', mono: true, size: 12, tone: "predict", hl: s === 5 });
      if (s >= 6) c.box({ x: 8, y: 314, w: 624, h: 36, label: "test set: money · dates · codes · merchants, every release", size: 13, tone: "code", hl: true });
    };
  };

  D["spoofing"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const caller = c.box({ x: 8, y: 30, w: 150, h: 60, label: "real customer", tone: "bridge", hl: s === 1 });
      const sv = c.box({ x: 250, y: 30, w: 170, h: 60, label: "speaker check", sub: "embedding vs template", tone: "paper", hl: s === 1 || s === 3 });
      const dec = c.box({ x: 480, y: 30, w: 152, h: 60, label: "accept if score high", tone: "code" });
      c.connect(caller, sv); c.connect(sv, dec);
      let tts = null;
      if (s >= 2) {
        const clip = c.box({ x: 8, y: 150, w: 150, h: 60, label: "3 s of the voice", sub: "e.g. a voicemail", tone: "bad", hl: s === 2 });
        tts = c.box({ x: 250, y: 150, w: 170, h: 60, label: "zero-shot TTS clone", tone: "bad", hl: s === 2 });
        c.connect(clip, tts);
        c.connect(tts, sv, { tone: "bad", dash: true });
      }
      if (s === 3) c.box({ x: 8, y: 250, w: 624, h: 50, label: "EER is measured on real speakers, not on clones (Table 6)", size: 13, tone: "predict", hl: true });
      if (s >= 4) {
        const cm = c.box({ x: 480, y: 150, w: 152, h: 60, label: "spoof detector", sub: "ASVspoof 2019", tone: "code", hl: s === 4 });
        c.connect(tts, cm, { tone: "muted" });
        c.box({ x: 8, y: 250, w: 300, h: 50, label: "LA: synthesis + conversion", size: 13, tone: "muted", hl: s === 4 });
        c.box({ x: 332, y: 250, w: 300, h: 50, label: "PA: replayed recordings", size: 13, tone: "muted", hl: s === 4 });
      }
      if (s >= 5) c.box({ x: 8, y: 310, w: 300, h: 40, label: "watermark own output (AudioSeal)", size: 13, tone: "code", hl: s === 5 });
      if (s >= 6) c.box({ x: 332, y: 310, w: 300, h: 40, label: "written consent per voice", size: 13, tone: "take", hl: true });
    };
  };

  D["reviewer"] = (fig, k) => {
    const c = k.canvas(W, H);
    const rows = [
      ["TTS results", "no results table · Table 15 mislabelled", "bad"],
      ["Wrong citation", "\"WaveGAN\" → a wave-loads paper", "bad"],
      ["Eq. 29", "missing minus sign", "bad"],
      ["Repeats + slips", "§5.2.4 twice · 4.25× was training", "predict"],
      ["Coverage cut-off", "no flow matching · 1 spoof cite", "predict"],
      ["Steelman", "12 tasks + Tables 5–6 in one place", "code"],
    ];
    return (s) => V.board(c, rows, s, { split: 220, all: true });
  };

  D["verdict"] = (fig, k) => {
    const c = k.canvas(W, H);
    const rows = [
      ["Always", "pipeline · AR/NAR · alignment · 1-to-many", "code"],
      ["Coding 1: attention", "causal mask · KV cache · shapes", "paper"],
      ["Coding 2: generative", "DDPM · VAE · flow · mel · RVQ · top-p", "paper"],
      ["Design round", "bank chapter in 9 steps + eval", "predict"],
      ["Our verdict", "survey = map; originals = depth", "take"],
    ];
    return (s) => V.board(c, rows, s, { split: 200 });
  };
})();
