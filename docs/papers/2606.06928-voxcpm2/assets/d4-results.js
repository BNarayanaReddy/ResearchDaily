/* Drawings: "Does it work?". */
(function () {
  const D = RD.drawings, V = RD.vox, W = V.W, H = V.H;

  D["seed-eval"] = (fig, k) => {
    const m = k.toggle({ label: "metric", options: ["EN SIM", "EN WER"], value: "EN SIM" });
    k.follow(m, { 1: "EN SIM", 3: "EN WER", 4: "EN SIM" });
    const c = k.canvas(W, H);
    const T = [ // Table 3, test-EN [WER, SIM]
      ["LongCat-Audio-DiT 3.5B", 1.5, 78.6], ["VoxCPM2 2B", 1.84, 75.3], ["OmniVoice 0.8B", 1.6, 74.1], ["MOSS-TTS 8B", 1.85, 73.4],
      ["VoxCPM 0.6B", 1.85, 72.9], ["Qwen3-TTS 1.7B", 1.23, 71.7], ["IndexTTS2 1.5B", 2.23, 70.6], ["Fish Audio S2 4B", 0.99, null]];
    return (s) => {
      c.clear();
      const j = m.value === "EN WER" ? 1 : 2;
      const hl = { 1: [1], 2: [0, 1], 3: [1, 5, 7], 4: [1, 4], 5: [1] }[s];
      V.title(c, j === 2 ? "speaker similarity · higher is better" : "WER (%) · lower is better");
      V.tbars(c, T.filter((r) => r[j] != null).map((r) => [r[0], r[j], hl.includes(T.indexOf(r)), !hl.includes(T.indexOf(r))]),
        { y: 30, h: 320, labelW: 190, tone: j === 2 ? "take" : "paper", fmt: (v) => v.toFixed(j === 2 ? 1 : 2), max: j === 2 ? 80 : 2.5 });
    };
  };

  D["cv3"] = (fig, k) => {
    const sys = k.toggle({ label: "compare with", options: ["Fish Audio S2", "CosyVoice 3-1.5B"], value: "Fish Audio S2" });
    k.follow(sys, { 1: "Fish Audio S2" });
    const c = k.canvas(W, H);
    const cols = ["zh", "en", "hard-zh", "hard-en", "ja", "ko", "de", "es", "fr", "it", "ru"];
    const T = { // Table 5
      VoxCPM2: [3.65, 5.0, 8.55, 8.48, 5.96, 5.69, 4.77, 3.8, 9.85, 4.25, 5.21],
      "Fish Audio S2": [2.65, 2.43, 9.1, 4.4, 3.96, 2.76, 2.22, 2.0, 6.26, 2.04, 2.78],
      "CosyVoice 3-1.5B": [3.91, 4.99, 9.77, 10.55, 7.57, 5.69, 6.43, 4.47, 11.8, 10.5, 6.64],
    };
    return (s) => {
      c.clear();
      const o = T[sys.value], hlc = { 1: [2, 3], 2: [2], 3: [1, 9], 4: [], 5: [2, 3] }[s];
      c.bars({ x: 8, y: 32, w: 624, rowH: 29, labelW: 80, tones: ["code", "muted"], max: 12, fmt: (v) => v.toFixed(2),
        rows: cols.map((cl, i) => ({ label: cl, values: [T.VoxCPM2[i], o[i]], hl: hlc.includes(i), dim: hlc.length && !hlc.includes(i) })) });
      c.text(632, 18, s === 4 ? "Fish S2: 4B parameters + RL post-training" : `WER/CER %: VoxCPM2 (green) vs ${sys.value} (grey)`, { size: 12, anchor: "end", weight: 700, tone: s === 4 ? "predict" : "ink" });
          };
  };

  const MLS = [ // Table 6 WER (VoxCPM2, best other) and Table 7 SIM (VoxCPM2, best other)
    ["German", 0.68, 0.55, 80.3, 77.5], ["Turkish", 0.82, 0.7, 87.1, 83.5], ["Dutch", 0.91, 0.8, 80.8, 73.8], ["Indonesian", 1.08, 1.06, 80.0, 76.3],
    ["Chinese", 1.14, 0.73, 82.5, 81.6], ["Polish", 1.14, 0.77, 88.4, 81.9], ["Spanish", 1.44, 0.91, 83.1, 81.4], ["Italian", 1.56, 0.95, 78.0, 81.7],
    ["Portuguese", 1.94, 1.14, 83.7, 81.7], ["Korean", 1.96, 1.18, 83.3, 81.7], ["English", 2.29, 0.93, 85.4, 79.7], ["Finnish", 2.63, 2.96, 89.0, 83.5],
    ["Greek", 2.84, 0.99, 86.0, 82.6], ["Thai", 2.96, 2.7, 84.0, 80.0], ["Vietnamese", 3.31, 0.88, 80.6, 74.3], ["Russian", 3.63, 2.4, 81.1, 79.2],
    ["French", 4.53, 2.86, 73.5, 69.8], ["Japanese", 4.63, 2.76, 82.8, 79.6], ["Ukrainian", 6.32, 1.0, 79.8, 74.7], ["Arabic", 13.05, 1.67, 79.1, 75.0],
    ["Hindi", 19.7, 5.83, 85.6, 82.1], ["Romanian", 21.58, 1.35, 79.7, 80.9], ["Czech", 24.13, 2.11, 78.3, 79.8], ["Cantonese", 38.58, 30.67, 83.5, 80.5]];

  D["mls-wer"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const hl = { 1: ["German", "Turkish", "Dutch"], 2: ["Hindi"], 3: ["Arabic", "Hindi"], 4: ["Czech", "Romanian"], 5: ["Hindi", "Arabic"] }[s];
      const rows = MLS.filter((r) => r[0] !== "Cantonese");
      c.bars({ x: 8, y: 22, w: 624, rowH: 14.6, labelW: 90, tones: ["code"], max: 26, fmt: (v) => v.toFixed(2),
        rows: rows.map((r) => ({ label: r[0], values: [r[1]], hl: hl.includes(r[0]), dim: !hl.includes(r[0]) })) });
      const tt = { 2: "Hindi: ElevenLabs 5.83 · MiniMax 6.96", 4: "Czech and Romanian were never trained", 5: "the model, or the Whisper judge?" }[s];
      c.text(632, 14, tt || "VoxCPM2 WER (%), Whisper-large-v3 judge", { size: 12, anchor: "end", weight: 700, tone: tt ? "predict" : "ink" });
    };
  };

  D["mls-sim"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const pick = ["English", "Finnish", "Polish", "Turkish", "Hindi", "Greek", "Czech", "Romanian", "Italian", "French"];
      const hl = { 1: pick, 2: ["Hindi"], 3: ["Czech"], 4: pick, 5: ["Hindi", "English"] }[s];
      const rows = MLS.filter((r) => pick.includes(r[0]));
      c.bars({ x: 8, y: 26, w: 624, rowH: 31, labelW: 90, tones: ["take", "muted"], min: 0, max: 95, fmt: (v) => v.toFixed(1),
        rows: rows.map((r) => ({ label: r[0], values: [r[3], r[4]], hl: hl.includes(r[0]), dim: !hl.includes(r[0]) })) });
      c.text(632, 16, "SIM: VoxCPM2 (violet) vs best other system (grey)", { size: 12, anchor: "end", weight: 700 });
    };
  };

  D["internal30"] = (fig, k) => {
    const sys = k.toggle({ label: "show", options: ["VoxCPM2", "both"], value: "VoxCPM2" });
    k.follow(sys, { 1: "VoxCPM2", 4: "both" });
    const c = k.canvas(W, H);
    const T = [ // Table 8: [lang, VoxCPM2, Fish S2]
      ["English", 0.42, 1.03], ["Hindi", 0.79, 0.91], ["Thai", 0.94, 1.92], ["Korean", 0.95, 0.29],
      ["Arabic", 1.23, 0.3], ["Burmese", 1.42, 85.27], ["Lao", 1.9, 87.4], ["Khmer", 2.05, 75.15], ["Hebrew", 2.98, 15.27]];
    return (s) => {
      c.clear();
      const both = sys.value === "both";
      const hl = { 1: [], 2: [], 3: [], 4: ["Hindi"], 5: ["Burmese", "Lao", "Khmer"] }[s];
      c.bars({ x: 8, y: 30, w: 624, rowH: 36, labelW: 90, tones: both ? ["code", "muted"] : ["code"], max: both ? 90 : 3.5, fmt: (v) => v.toFixed(2),
        rows: T.map((r) => ({ label: r[0], values: both ? [r[1], r[2]] : [r[1]], hl: hl.includes(r[0]), dim: hl.length > 0 && !hl.includes(r[0]) })) });
      const tt = { 1: "500 sentences per language · 9 of 30 shown", 2: "ASR judge: Gemini 3.1 Flash Lite", 3: "average over all 30 languages: 1.68%" }[s];
      c.text(632, 18, tt || (both ? "error % · VoxCPM2 (green) vs Fish S2 (grey)" : "VoxCPM2 error %"), { size: 12, anchor: "end", weight: 700, tone: tt ? "predict" : "ink" });
    };
  };

  D["judge"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const a = c.box({ x: 8, y: 20, w: 230, h: 80, label: "19.70", sub: "Table 6", size: 26, tone: "bad", hl: true });
      const b = c.box({ x: 402, y: 20, w: 230, h: 80, label: "0.79", sub: "Table 8", size: 26, tone: "code", hl: true });
      const rows = [["metric", "WER (words)", "CER (characters)"], ["ASR judge", "Whisper-large-v3", "Gemini 3.1 Flash Lite"], ["sentences", "MiniMax-MLS-Test", "in-house, unreleased"]];
      rows.forEach(([n, l, r], i) => {
        if (s < i + 1) return;
        const y = 124 + i * 58, on = s === i + 1;
        c.box({ x: 8, y, w: 230, h: 46, label: l, size: 13, tone: "bad", hl: on });
        c.box({ x: 402, y, w: 230, h: 46, label: r, size: 13, tone: "code", hl: on });
        c.text(320, y + 28, n, { size: 13, anchor: "middle", weight: 700, tone: on ? "predict" : "muted" });
      });
      if (s >= 4) c.text(320, 66, "same model", { size: 14, anchor: "middle", weight: 700, tone: "muted" });
      if (s >= 5) c.box({ x: 8, y: 306, w: 624, h: 46, label: "Telugu: strong Indic ASR · CER · native listeners", size: 14, tone: "take", hl: true });
    };
  };

  D["instruct"] = (fig, k) => {
    const L = k.toggle({ label: "language", options: ["English", "Chinese"], value: "English" });
    k.follow(L, { 1: "English", 4: "Chinese", 6: "English" });
    const c = k.canvas(W, H);
    const T = { // Table 9: [APS, DSD, RP]
      English: [["VoxCPM2", 84.2, 83.2, 71.4], ["Gemini-TTS-Pro", 87.6, 86.0, 67.2], ["Qwen3-TTS-VD", 82.9, 82.4, 68.4], ["MOSS-VoiceGen", 68.2, 82.0, 68.7], ["Hume", 83.0, 75.3, 54.3]],
      Chinese: [["VoxCPM2", 85.2, 71.5, 60.8], ["Gemini-TTS-Pro", 89.0, 90.1, 75.5], ["Qwen3-TTS-VD", 85.2, 81.1, 65.1], ["MOSS-VoiceGen", 78.0, 80.0, 74.0], ["Mimo-Audio-7B", 75.7, 74.3, 61.5]],
    };
    return (s) => {
      c.clear();
      const rows = T[L.value], hl = { 1: [0, 1, 2, 3, 4], 2: [0], 3: [1], 4: [0, 3], 5: [0], 6: [0] }[s];
      c.bars({ x: 8, y: 34, w: 624, rowH: 60, labelW: 130, tones: ["paper", "take", "predict"], max: 95, fmt: (v) => v.toFixed(1),
        rows: rows.map((r, i) => ({ label: r[0], values: r.slice(1), hl: hl.includes(i), dim: !hl.includes(i) })) });
      c.text(632, 18, `${L.value}: APS (blue) · DSD (violet) · RP (amber)`, { size: 12, anchor: "end", weight: 700 });
    };
  };

  D["vae-recon"] = (fig, k) => {
    const m = k.toggle({ label: "metric", options: ["MelD-48k", "PESQ-16k", "STOI-16k"], value: "MelD-48k" });
    k.follow(m, { 1: "MelD-48k", 3: "PESQ-16k", 4: "MelD-48k" });
    const c = k.canvas(W, H);
    const T = { "MelD-48k": [1.787, 1.139, 1.335], "PESQ-16k": [3.94, 3.148, 3.906], "STOI-16k": [0.911, 0.836, 0.907] }; // Table 10, VCTK
    const names = ["VoxCPM: 16k → 16k", "VoxCPM1.5: 44k → 44k", "VoxCPM2: 16k → 48k"];
    return (s) => {
      c.clear();
      const v = T[m.value], hl = { 1: [2], 2: [1, 2], 3: [0, 2], 4: [2], 5: [2] }[s];
      V.title(c, m.value === "MelD-48k" ? "mel distance at 48 kHz · lower is better" : `${m.value} · higher is better`);
      V.tbars(c, names.map((n, i) => [n, v[i], hl.includes(i), !hl.includes(i)]), { y: 40, h: 210, labelW: 200, tone: "bridge", fmt: (x) => x.toFixed(3) });
      if (s === 5) c.box({ x: 8, y: 276, w: 624, h: 50, label: "tested on VCTK + songs only: no Indic, no emotional speech", size: 14, tone: "bad", hl: true });
    };
  };

  D["mos"] = (fig, k) => {
    const c = k.canvas(W, H);
    const P = [ // Tables 12–14: [panel, system, score, ci]
      ["Cloning S-MOS", [["VoxCPM2", 4.74, 0.03], ["IndexTTS2", 4.71, 0.03], ["Qwen3-TTS", 4.69, 0.03]]],
      ["Multilingual N-MOS", [["VoxCPM2", 4.78, 0.02], ["Qwen3-TTS", 4.77, 0.02], ["OmniVoice", 4.76, 0.02]]],
      ["Voice design I-MOS", [["VoxCPM2", 4.5, 0.03], ["Qwen3-TTS-VD", 4.41, 0.04], ["MOSS-VoiceGen", 4.15, 0.05]]],
    ];
    return (s) => {
      c.clear();
      const X = (v) => 170 + (v - 4.0) / 1.0 * 440;
      [4.0, 4.25, 4.5, 4.75, 5.0].forEach((v) => { c.line(X(v), 30, X(v), 330, { tone: "faint", width: 0.6 }); c.text(X(v), 348, v.toFixed(2), { size: 11, anchor: "middle", tone: "muted" }); });
      P.forEach(([name, rows], pi) => {
        const on = s === 1 || s === pi + 2 || s === 5;
        c.text(8, 46 + pi * 100, name, { size: 13, weight: 700, tone: on ? "ink" : "muted" });
        rows.forEach(([n, v, ci], ri) => {
          const y = 62 + pi * 100 + ri * 22;
          c.text(160, y + 4, n, { size: 12, anchor: "end", tone: on ? "ink" : "muted", dim: !on });
          c.line(X(v - ci), y, X(v + ci), y, { tone: ri === 0 ? "code" : "muted", width: 3, dim: !on });
          c.dot(X(v), y, { r: 5, tone: ri === 0 ? "code" : "muted", dim: !on });
        });
      });
      if (s === 5) c.label(X(4.3), 300, "bars = 95% intervals: top gaps overlap", { size: 13, tone: "predict", weight: 700 });
    };
  };
})();
