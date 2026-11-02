/* Drawings: Does it work? (CER, judges, failures, identity, arena) and Your move. Numbers from the model card unless marked. */
(function () {
  const D = RD.drawings, V = RD.maya, W = V.W, H = V.H;

  // §card Results by language, scorer v1: [ASR-1, Qwen3-ASR, ASR-2, identity]
  const LANG = {
    as: ["Assamese", 5.41, 6.59, 5.54, 96.4], bn: ["Bengali", 2.60, 2.83, 2.68, 98.5], en: ["English", 9.69, 1.74, 1.43, 99.6],
    gu: ["Gujarati", 2.25, 3.76, 2.26, 98.9], hi: ["Hindi", 1.52, 2.05, 1.57, 99.6], kn: ["Kannada", 2.28, 2.72, 2.23, 97.9],
    ml: ["Malayalam", 3.75, 4.20, 4.03, 99.4], mr: ["Marathi", 1.66, 2.09, 1.54, 99.1], or: ["Odia", 3.45, 4.33, 3.54, 97.4],
    pa: ["Punjabi", 2.51, 3.32, 2.66, 99.1], ta: ["Tamil", 4.42, 4.55, 4.33, 98.1], te: ["Telugu", 2.29, 2.64, 2.53, 99.4],
  };

  // Page 32
  D["cer-lang"] = (fig, k) => {
    const j = k.toggle({ label: "judge", options: ["Qwen3-ASR", "ASR-1", "ASR-2"], value: "Qwen3-ASR" });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const ji = { "ASR-1": 1, "Qwen3-ASR": 2, "ASR-2": 3 }[j.value];
      const order = Object.keys(LANG).sort((a, b) => LANG[a][2] - LANG[b][2]);
      const lit = { 2: ["hi", "mr"], 3: ["te", "kn", "gu"], 4: ["ta", "ml", "or"], 5: ["as"] }[s] || [];
      const rows = order.map((l) => [LANG[l][0], LANG[l][ji], lit.includes(l), s >= 2 && lit.length && !lit.includes(l)]);
      V.title(c, `CER %, ${j.value}, scorer v1, 500 texts per language`);
      V.tbars(c, rows, { y: 26, h: 330, labelW: 100, max: 10, fmt: (v) => `${v.toFixed(2)}%`, tone: "paper" });
    };
  };

  // Page 33. §card Results by language; §card Benchmark design (v1 vs v2 overall); §card Harder inputs.
  D["judges"] = (fig, k) => {
    const sc = k.toggle({ label: "scorer", options: ["v1", "v2"], value: "v1" });
    k.follow(sc, { 1: "v1", 4: "v2" });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      if (s <= 2) {
        V.title(c, "English CER %, same audio, three judges");
        V.tbars(c, [["ASR-1 (in-house)", 9.69, true, false], ["Qwen3-ASR", 1.74, false, false], ["ASR-2 (held out)", 1.43, false, false]], { y: 30, h: 150, labelW: 150, max: 11, fmt: (v) => `${v}%`, tone: "bad" });
        if (s === 2) c.box({ x: 8, y: 220, w: 624, h: 56, label: "ASR-1 loops on spoken URLs: “W W W …”", tone: "bad", hl: true, size: 15 });
        return;
      }
      const v2 = sc.value === "v2";
      V.title(c, `ASR-1 CER %, scorer ${sc.value}`);
      V.tbars(c, [["overall", v2 ? 2.35 : 3.49, s === 4, false], ["heavy code-mix", v2 ? 4.11 : 16.74, s === 5, false], ["code-mix", v2 ? 3.51 : 10.60, false, false], ["symbols", v2 ? 2.49 : 6.34, false, false], ["web addresses", v2 ? 20.34 : 29.06, false, false]],
        { y: 30, h: 220, labelW: 150, max: 32, fmt: (v) => `${v}%`, tone: v2 ? "code" : "paper" });
      c.chips({ x: 8, y: 280, items: [{ t: "ఫిక్స్డ్", tone: "paper", hl: s === 3 }, { t: "= fixed", tone: "muted" }, { t: "both spellings are right", tone: s === 3 ? "predict" : "muted", hl: s === 3 }], size: 14 });
    };
  };

  // Page 34. §card Failures and voice consistency; §card Harder inputs.
  D["failures"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      V.title(c, "rates on 6,000 clips (%)");
      const rows = [["consensus failure, v1", 0.15, s === 2, s < 2], ["consensus failure, v2", 0.03, s === 2, s < 2], ["truncations", 0.13, s === 3, s < 3], ["loops", 0.02, s === 3, s < 3], ["hit length cap", 0.0, s === 3, s < 3], ["voice name spoken", 0.0, s === 4, s < 4]];
      V.tbars(c, rows, { y: 30, h: 220, labelW: 190, max: 0.2, fmt: (v) => `${v.toFixed(2)}%`, tone: "bad" });
      if (s === 1) c.box({ x: 8, y: 270, w: 624, h: 50, label: "failure = ASR-1 and Qwen3-ASR agree: loop, insertions, very high CER, cap", tone: "muted", hl: true, size: 13 });
      if (s === 2) c.text(8, 290, "0.15% ≈ 9 clips · 0.03% ≈ 2 clips (our arithmetic)", { size: 14, weight: 700, tone: "bad" });
      if (s >= 5) c.box({ x: 8, y: 270, w: 624, h: 50, label: "but web addresses: 29.06% CER (v1), 20.34% (v2)", tone: "bad", hl: true, size: 14 });
    };
  };

  // Page 35. §card identity numbers.
  D["identity"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      V.title(c, "voice identity: nearest of 20 centroids (%)");
      const rows = [["all of bench6k", 98.6, s === 1, false], ["trained languages", 98.9, s === 2, s < 2], ["cross-lingual", 98.8, s === 2, s < 2], ["real recordings", 98.0, s === 3, s < 3], ["Assamese", 96.4, s === 4, s < 4]];
      V.tbars(c, rows, { y: 30, h: 230, labelW: 160, max: 100, fmt: (v) => `${v}%`, tone: "code" });
      if (s >= 5) c.box({ x: 8, y: 280, w: 624, h: 52, label: "closed set of 20 voices: not clone similarity, not accent", tone: "take", hl: true, size: 14 });
    };
  };

  // Page 36. §card VoiceArena, Hindi, real-time only, checked 2026-10-27: [Elo, ±CI]
  const ARENA = [["Sonic-3.6", 1094, 13], ["Maya-2-Native", 1047, 11], ["Sonic-3.5", 1035, 12], ["Lightning 3.1 Pro", 1024, 12], ["Falcon 2", 1021, 14], ["Sonic-3", 961, 9], ["Bulbul-V3", 957, 9], ["Grok TTS", 890, 9], ["Dragon HD Omni", 855, 9]];
  D["arena"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const x0 = 150, X = (v) => x0 + ((v - 820) / (1120 - 820)) * 470;
      c.text(8, 18, "Bradley–Terry Elo with 95% interval (Hindi, real-time)", { size: 13, weight: 700 });
      ARENA.forEach(([n, e, ci], i) => {
        const y = 40 + i * 32, maya = n === "Maya-2-Native";
        const lit = (s >= 2 && maya) || (s === 3 && (i === 2 || i === 3)) || (s === 4 && i === 6) || (s === 2 && i === 0);
        c.text(x0 - 8, y + 5, n, { size: 12, anchor: "end", weight: maya ? 700 : 400, tone: lit ? "ink" : "muted", inBox: true });
        c.line(X(e - ci), y, X(e + ci), y, { tone: maya ? "take" : "muted", width: 3, dim: s >= 2 && !lit });
        c.dot(X(e), y, { r: 5, tone: maya ? "take" : lit ? "paper" : "muted" });
        if (lit || s === 1) c.text(X(e + ci) + 6, y + 4, String(e), { size: 11, mono: true, tone: maya ? "take" : "muted", inBox: true });
      });
      if (s >= 5) c.box({ x: 8, y: 318, w: 624, h: 36, label: "Hindi only · checkpoint not identified · no Telugu board", tone: "bad", hl: true, size: 13 });
    };
  };

  // Page 37. Repo layout at c6b3768.
  D["code-map"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      V.board(c, [
        ["tts/model/", "backbone · audio_io · depth_v2 · anchors · corrupt", "code"],
        ["maya3/prompt.py + tts/data/", "prompt builder = training packer", "code"],
        ["maya3/engine.py, guards.py", "controlled stop · sampler · cap · loop guard", "code"],
        ["serve/", "graphed backbone · fp16 depth · 1-frame Mimi", "code"],
        ["training loop, data, DPO", "not in the repo", "bad"],
      ], s);
    };
  };

  // Page 38. §card Quickstart snippet with our sentence; not executed by us.
  D["running"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const hl = { 1: [0], 2: [2, 3], 3: [4, 5, 6, 7], 4: [8], 5: [] }[s] || [];
      V.code(c, [
        "pip install \"maya3[server] @ git+https://github.com/…\"",
        "from maya3 import Maya3TTS",
        "tts = Maya3TTS.from_pretrained(",
        "    \"maya-research/maya2-native\", max_seats=1)",
        "audio = tts.generate(",
        "    \"సేవింగ్స్ తో పోలిస్తే … 7.25% ఇస్తుంది.\",",
        "    lang=\"te\", voice=\"Nivedita\",",
        "    normalize=True)",
        "sf.write(\"speech.wav\", audio, 24000)   # float32, 24 kHz mono",
      ], hl, { y: 34, size: 12 });
      if (s >= 5) c.box({ x: 8, y: 280, w: 624, h: 56, label: "we ran: both tokenizers + reading the sample WAVs; not the model", tone: "bad", hl: true, size: 14 });
    };
  };

  // Page 39. Reviewer board, each row cites the card.
  D["reviewer"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => V.board(c, [
      ["Judge = reward signal?", "ASR-2 held out; ASR-1 likely not", "bad"],
      ["Baselines on bench6k?", "none run", "bad"],
      ["Human study?", "Hindi arena only", "predict"],
      ["Training data?", "undisclosed hours", "predict"],
      ["Clone quality?", "no benchmark", "bad"],
      ["Candour?", "judge gaps, hard cases shown", "code"],
    ], s, { split: 260 });
  };

  // Page 40. Design board from this site's lessons.
  D["compare"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const cols = [["Maya 2 Native", "take"], ["OmniVoice", "paper"], ["VoxCPM2", "bridge"]];
      const rows = [
        ["generates", ["frame by frame, 32 codes", "whole 8-codebook grid, 32 passes", "160 ms continuous patches"]],
        ["streams", ["yes, 80 ms frames", "no: length fixed first", "yes, patch by patch"]],
        ["Telugu trained", ["yes", "yes, 230 h", "no (Hindi only)"]],
        ["licence", ["Apache-2.0", "CC-BY-NC", "Apache-2.0"]],
      ];
      const x0 = 120, cw = 170;
      cols.forEach(([n, t], j) => c.box({ x: x0 + j * (cw + 4), y: 10, w: cw, h: 34, label: n, tone: t, hl: s === j + 1 || s === 5, size: 13 }));
      rows.forEach(([lab, vals], i) => {
        const y = 56 + i * 72, show = i < 2 ? s >= 1 : i === 2 ? s >= 4 : s >= 5;
        if (!show) return;
        c.text(x0 - 8, y + 34, lab, { size: 12, anchor: "end", weight: 700, inBox: true });
        vals.forEach((v, j) => c.box({ x: x0 + j * (cw + 4), y, w: cw, h: 62, label: v, size: 12, tone: i === 2 && j === 2 ? "bad" : i === 3 && j === 1 ? "bad" : "muted", hl: (i < 2 && s === j + 1) || (i === 2 && s === 4) || (i === 3 && s === 5) }));
      });
    };
  };

  // Page 41. Verdict board.
  D["verdict"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => V.board(c, [
      ["Intelligible Telugu?", "yes: CER 2.29–2.64%", "code"],
      ["Voice agent?", "yes: 14 ms, 224 streams, Apache", "code"],
      ["Your own Telugu voice?", "test first: clones unmeasured", "predict"],
      ["Dubbing with emotion?", "not yet: tags best effort", "bad"],
      ["Fine-tune?", "no training code", "bad"],
      ["Verdict", "default Telugu agent voice", "take"],
    ], s, { split: 250 });
  };

  // Page 42. Effort x learning map; placement is our guess.
  D["try-next"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const P = c.plot({ series: [], xmin: 0, xmax: 10, ymin: 0, ymax: 10, h: 350, xlabel: "effort (our guess)", ylabel: "what you learn", xFmt: () => "", yFmt: () => "" });
      const ideas = [["clone scoring", 4, 8.6, "take"], ["normaliser stress", 2, 5, "paper"], ["guards on/off", 3, 6.5, "predict"], ["16/24 levels", 6, 4.4, "code"]];
      ideas.forEach(([n, x, y, t], i) => {
        if (s < i + 1) return;
        c.dot(P.X(x), P.Y(y), { r: 8, tone: t });
        c.label(P.X(x) + 12, P.Y(y) - 10, n, { size: 13, tone: t, weight: s === i + 1 ? 700 : 400 });
      });
    };
  };
})();
