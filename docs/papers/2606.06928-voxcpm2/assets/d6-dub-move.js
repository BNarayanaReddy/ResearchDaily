/* Drawings: "Dubbing with VoxCPM2" and "Your move". */
(function () {
  const D = RD.drawings, V = RD.vox, W = V.W, H = V.H;

  D["dub-recipes"] = (fig, k) => {
    const c = k.canvas(W, H);
    const rows = [
      ["1 · Continuation on source clip", "best emotion · actor's voice · needs VC", "bad"],
      ["2 · Source clip as reference", "actor's timbre · needs VC", "bad"],
      ["3 · Consented ref + style caption", "who: consented · how: words · no VC", "code"],
      ["4 · Voice design + style caption", "synthetic voice · varies per run", "predict"],
      ["Our pick", "option 3", "take"],
    ];
    return (s) => V.board(c, rows, s, { split: 270 });
  };

  D["source-caption"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const src = c.box({ x: 8, y: 30, w: 150, h: 64, label: "English source", sub: "2.6 s, furious", tone: "bridge" });
      const cap = c.box({ x: 190, y: 30, w: 200, h: 64, label: "audio-LLM captioner", sub: "VoxCPM2's style", tone: "take", hl: s === 1 });
      c.connect(src, cap);
      if (s >= 2) {
        const meas = c.box({ x: 190, y: 120, w: 200, h: 64, label: "pitch · rate · energy bins", sub: "+ emotion label", tone: "paper", hl: s === 2 });
        c.connect(src, meas, { route: "elbow" });
      }
      if (s >= 3) c.box({ x: 420, y: 120, w: 212, h: 64, label: "rate 97.1% · pitch 86.2%", sub: "RASMALAI caption accuracy", tone: "code", hl: s === 3 }); // Table 6 RASMALAI
      if (s >= 4) {
        const pre = c.box({ x: 420, y: 30, w: 212, h: 64, label: "(furious, loud, fast, clipped)", size: 13, mono: true, tone: "predict", hl: s === 4 });
        c.connect(cap, pre);
      }
      if (s >= 5) {
        c.box({ x: 8, y: 220, w: 300, h: 50, label: "kept: category, rough prosody", size: 13, tone: "code", hl: true });
        c.box({ x: 324, y: 220, w: 308, h: 50, label: "lost: exact contour, emphasis spot", size: 13, tone: "bad", hl: true });
      }
    };
  };

  D["vc-loss"] = (fig, k) => {
    const T = k.toggle({ label: "show", options: ["plain", "+ emotion-aware"], value: "plain" });
    k.follow(T, { 1: "plain", 4: "+ emotion-aware" });
    const c = k.canvas(W, H);
    const R = [["original speech", 71.1, "plain"], ["ASR → TTS cascade", 37.6, "plain"], ["voice conversion", 36.1, "plain"], ["VQ voice conversion", 38.2, "plain"],
      ["emotion-aware VC", 61.0, "aware"], ["neural-codec system", 64.5, "aware"]]; // Table 9 VPC
    return (s) => {
      c.clear();
      const rows = R.filter((r) => T.value !== "plain" || r[2] === "plain");
      const hl = { 1: [], 2: ["original speech"], 3: ["voice conversion", "ASR → TTS cascade"], 4: ["emotion-aware VC", "neural-codec system"], 5: ["original speech", "voice conversion"] }[s];
      V.title(c, "emotion recognition accuracy (UAR %, IEMOCAP) · VoicePrivacy Challenge");
      V.tbars(c, rows.map((r) => [r[0], r[1], hl.includes(r[0]), hl.length > 0 && !hl.includes(r[0])]), { y: 40, h: 280, labelW: 190, tone: "predict", max: 80, fmt: (v) => v.toFixed(1) });
      if (s === 1) c.label(430, 330, "a classifier asks: is the emotion still there?", { size: 13, tone: "muted", weight: 700 });
    };
  };

  D["cross-lingual-ref"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const ref = c.box({ x: 8, y: 30, w: 190, h: 60, label: "English reference", tone: "bridge" });
      const tx = c.box({ x: 8, y: 120, w: 190, h: 60, label: "Hindi text", tone: "paper" });
      const m = c.box({ x: 250, y: 70, w: 140, h: 70, label: "VoxCPM2", tone: "take", hl: s === 1 });
      c.connect(ref, m); c.connect(tx, m);
      const o = c.box({ x: 440, y: 70, w: 192, h: 70, label: s >= 3 ? "unintelligible / silent" : "Hindi in that voice?", sub: s >= 3 ? "issue #288 (open)" : "claimed (§1.2)", tone: s >= 3 ? "bad" : "muted", hl: s === 3 });
      c.connect(m, o);
      if (s >= 2) c.box({ x: 8, y: 206, w: 624, h: 46, label: "every benchmark pairs reference and text in one language", size: 13, tone: "predict", hl: s === 2 });
      if (s >= 4) c.box({ x: 8, y: 266, w: 300, h: 50, label: "English-speaking voice actor? test it", size: 13, tone: "predict", hl: s === 4 });
      if (s >= 5) c.box({ x: 324, y: 266, w: 308, h: 50, label: "Hindi-speaking voice actor: tested path", size: 13, tone: "code", hl: true });
    };
  };

  D["duration"] = (fig, k) => {
    const tgt = k.slider({ label: "Hindi output length", min: 2.0, max: 3.6, step: 0.04, value: 2.88, fmt: (v) => `${v.toFixed(2)} s` });
    k.follow(tgt, { 1: 2.88, 5: 2.6 });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const X = (t) => 20 + t * 160, src = 2.6;
      c.text(20, 26, "source: 2.6 s of moving lips", { size: 13, weight: 700, tone: "bridge" });
      c.box({ x: X(0), y: 36, w: X(src) - X(0), h: 34, tone: "bridge" });
      const t = tgt.value, ratio = t / src;
      c.text(20, 98, `Hindi: ${t.toFixed(2)} s = ${Math.round(t / 0.16)} patches`, { size: 13, weight: 700, tone: Math.abs(ratio - 1) < 0.03 ? "code" : "bad" });
      c.box({ x: X(0), y: 108, w: X(t) - X(0), h: 34, tone: Math.abs(ratio - 1) < 0.03 ? "code" : "bad" });
      c.line(X(src), 30, X(src), 150, { tone: "muted", dash: true });
      c.text(X(3.6), 98, `${ratio >= 1 ? "+" : ""}${((ratio - 1) * 100).toFixed(0)}%`, { size: 15, anchor: "end", mono: true, weight: 700, tone: Math.abs(ratio - 1) < 0.03 ? "code" : "bad" });
      const opts = [["shorter paraphrase in MT", "predict"], ["“(fast)” in the caption", "muted"], ["length input (IndexTTS2: ≤0.067% error)", "code"], ["patch-count embedding, 30% dropout", "take"], ["DubWise Hindi: deviation 1.46 → 0.93", "code"]];
      opts.forEach(([l, tone], i) => { if (s >= i + 2) c.box({ x: 20, y: 168 + i * 38, w: 600, h: 32, label: l, size: 13, tone, hl: s === i + 2 }); });
    };
  };

  D["nonverbal"] = (fig, k) => {
    const c = k.canvas(W, H);
    const rows = [
      ["VoxCPM2 tags for laughs?", "none reported", "bad"],
      ["Spare tokens 105–112", "exist, unused by code", "muted"],
      ["CosyVoice 3 · Fish S2", "inline tags · 88% EN activation", "code"],
      ["NVSpeech tag fine-tune", "CER 3.13% → 7.5%", "bad"],
      ["Cascades (STEB)", "non-verbals 2.31 / 5", "bad"],
      ["MoVE, LoRA on 30 min", "95% of full-data fidelity", "code"],
    ];
    return (s) => V.board(c, rows, s, { split: 260 });
  };

  D["dub-frontier"] = (fig, k) => {
    const c = k.canvas(W, H);
    const E = [ // found by us
      [2023, "SeamlessExpressive", "rate corr 0.06 → 0.59 · no Indic"],
      [2024, "DubWise", "duration-aligned XTTS · en → hi"],
      [2025, "IndexTTS2", "emotion prompt + target length"],
      [2025.4, "MAVFlow", "emotion acc 36.5% vs 28.6% cascade"],
      [2026, "MoVE · STEB", "non-verbals; cascades lose most"],
    ];
    return (s) => {
      c.clear();
      const X = (y) => 40 + (y - 2023) * 180;
      c.line(X(2023) - 20, 60, X(2026) + 30, 60, { tone: "muted", width: 2 });
      [2023, 2024, 2025, 2026].forEach((y) => c.text(X(y), 40, String(y), { size: 12, anchor: "middle", tone: "muted" }));
      E.forEach(([y, n, d], i) => {
        if (s < i + 1 && s < 6) return;
        c.dot(X(y), 60, { r: 7, tone: s === i + 1 ? "predict" : "paper" });
        c.box({ x: 8, y: 84 + i * 52, w: 624, h: 44, label: `${n}: ${d}`, size: 13, tone: s === i + 1 ? "predict" : "paper", hl: s === i + 1 });
      });
      if (s >= 6) c.label(320, 24, "none covers Telugu", { size: 14, tone: "bad", weight: 700 });
    };
  };

  D["dub-architecture"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const blocks = [
        ["REF consented voice", "bridge", 1],
        ["SRC source prosody", "predict", 2],
        ["LEN patch count", "take", 4],
        ["(caption) Hindi text", "paper", 0],
        ["→ target audio", "code", 0],
      ];
      c.chips({ x: 8, y: 40, items: blocks.map(([t, tone, at]) => ({ t, tone, hl: at === s, dim: at > s, dashed: at > 1 })), size: 14, h: 40 });
      c.text(8, 24, "a VoxCPM2 input sequence with two new blocks (our proposal)", { size: 13, weight: 700 });
      if (s >= 3) c.box({ x: 8, y: 120, w: 624, h: 50, label: "SRC encoder + gradient reversal against speaker ID (IndexTTS2-style)", size: 13, tone: "predict", hl: s === 3 });
      if (s >= 4) c.box({ x: 8, y: 186, w: 624, h: 50, label: "LEN from the source timing, dropped 30% in training", size: 13, tone: "take", hl: s === 4 });
      if (s >= 5) c.box({ x: 8, y: 252, w: 624, h: 56, label: "training pairs: re-voice one style across languages (§3.6 trick)", size: 13, tone: "code", hl: true });
    };
  };

  D["code-map"] = (fig, k) => {
    const c = k.canvas(W, H);
    const L = ["src/voxcpm/", "  model/voxcpm2.py            TSLM :183 · fusion :236 · stop :239", "  modules/layers/", "    scalar_quantization_layer.py   FSQ",
      "  modules/locdit/", "    local_dit_v2.py · unified_cfm.py", "  modules/audiovae/", "    audio_vae_v2.py               16k in · 48k out", "scripts/train_voxcpm_finetune.py", "conf/voxcpm_v2/*.yaml           full · LoRA"];
    const HL = { 1: [1], 2: [3], 3: [5], 4: [7], 5: [8, 9] };
    return (s) => { c.clear(); V.code(c, L, HL[s] || [], { y: 40, lh: 30, size: 13 }); };
  };

  D["running-it"] = (fig, k) => {
    const c = k.canvas(W, H);
    const L = ["from voxcpm import VoxCPM", "model = VoxCPM.from_pretrained(\"openbmb/VoxCPM2\")", "wav = model.generate(",
      "    text=\"(furious, loud, fast)मैंने कहा था, यहाँ कभी…\",", "    reference_wav_path=\"consented_actor_hi.wav\",", "    cfg_value=2.0, inference_timesteps=10,", "    retry_badcase=True)"];
    const HL = { 1: [1], 2: [3], 3: [4], 4: [5], 5: [6] };
    return (s) => { c.clear(); V.code(c, L, HL[s] || [], { y: 50, lh: 34, size: 13 }); c.text(632, 340, "not run by us", { size: 12, anchor: "end", tone: "muted" }); };
  };

  D["finetune-run"] = (fig, k) => {
    const c = k.canvas(W, H);
    const L = ["# train.jsonl (one clip per line)", "{\"audio\": \"te/0001.wav\", \"text\": \"నమస్కారం…\"}", "{\"audio\": \"te/0002.wav\", \"text\": \"…\", \"ref_audio\": \"te/0107.wav\"}",
      "# voxcpm_finetune_all.yaml", "learning_rate: 1.0e-5   batch 2 × accum 8", "max_steps: 1000   # raise for hundreds of hours", "# AudioVAE: always frozen", "{\"audio\": \"hi/0042.wav\", \"text\": \"…\"}   # replay"];
    const HL = { 1: [1], 2: [2], 3: [4, 5], 4: [6], 5: [7] };
    return (s) => { c.clear(); V.code(c, L, HL[s] || [], { y: 44, lh: 36, size: 13 }); };
  };

  D["reviewer"] = (fig, k) => {
    const c = k.canvas(W, H);
    const rows = [
      ["V2's design changes", "no ablation", "bad"],
      ["Hours per language", "not reported", "bad"],
      ["30-language test", "private · different judge", "predict"],
      ["Cross-lingual cloning", "claimed, untested", "predict"],
      ["FSQ levels", "paper 9 · code 19", "muted"],
      ["Steelman", "all open: test it yourself", "code"],
    ];
    return (s) => V.board(c, rows, s, { split: 270 });
  };

  D["alternatives"] = (fig, k) => {
    const c = k.canvas(W, H);
    const rows = [
      ["Indic Parler-TTS", "captions · 21 langs · no cloning", "paper"],
      ["IndicF5", "cloning + length · MIT · no captions", "paper"],
      ["OmniVoice", "646 langs · te CER 3.77%", "paper"],
      ["Indic-Speak", "emotion tags · licence limits", "predict"],
      ["VoxCPM2", "control + Apache 2.0 · no Telugu", "take"],
    ];
    return (s) => V.board(c, rows, s, { split: 220 });
  };

  D["verdict"] = (fig, k) => {
    const c = k.canvas(W, H);
    const rows = [
      ["Indic → English / Hindi", "yes, now", "code"],
      ["English → Telugu, Tamil…", "train first: ~190 h public", "predict"],
      ["Keep the emotion", "caption + consented voice, no VC", "code"],
      ["Lip-sync length", "not yet: MT + fine-tune", "bad"],
      ["Overall", "best open base for control", "take"],
    ];
    return (s) => V.board(c, rows, s, { split: 250 });
  };

  D["try-next"] = (fig, k) => {
    const c = k.canvas(W, H);
    const I = [ // [effort 0..1, payoff 0..1, label] — our guesses
      [0.12, 0.62, "codec round-trip"], [0.25, 0.82, "cross-lingual ref test"], [0.38, 0.55, "caption emotion test"],
      [0.66, 0.7, "10 h Telugu LoRA"], [0.85, 0.9, "patch-count input"]];
    return (s) => {
      c.clear();
      const p = c.plot({ series: [], xmin: 0, xmax: 1, ymin: 0, ymax: 1, xlabel: "effort →", ylabel: "what you learn →", xFmt: () => "", yFmt: () => "" });
      I.forEach(([x, y, l], i) => {
        if (s < i + 1) return;
        c.dot(p.X(x), p.Y(y), { r: s === i + 1 ? 9 : 6, tone: s === i + 1 ? "predict" : "paper" });
        c.label(p.X(x) + 10, p.Y(y) - 14, l, { size: 13, tone: s === i + 1 ? "predict" : "paper", weight: s === i + 1 ? 700 : 400 });
      });
    };
  };
})();
