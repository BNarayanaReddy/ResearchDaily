/* Drawings: "Representations" (§4 of arXiv:2305.00359v3). */
(function () {
  const D = RD.drawings, V = RD.sdr, W = V.W, H = V.H;
  const P = (V.p3 = {});

  // A strip of n spectrogram-like frames; cell(i) → {tone, t, hl, dim, dashed}.
  P.strip = (c, x, y, n, cw, ch, cell) => {
    const out = [];
    for (let i = 0; i < n; i++) {
      const o = cell(i) || {};
      out.push(c.box({ x: x + i * cw, y, w: cw - 4, h: ch, label: o.t || "", size: 12, tone: o.tone || "bridge", hl: o.hl, dim: o.dim, dashed: o.dashed, r: 4 }));
    }
    return out;
  };

  D["repr-map"] = (fig, k) => {
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      c.line(40, 300, 600, 300, { tone: "muted" });
      c.text(40, 326, "all labelled", { size: 13, tone: "muted" });
      c.text(600, 326, "no labels", { size: 13, tone: "muted", anchor: "end" });
      c.text(320, 326, "labels needed →", { size: 13, tone: "muted", anchor: "middle" });
      const feat = c.box({ x: 40, y: 14, w: 560, h: 44, label: "hand-made features: mel, MFCC (§2.2)", size: 14, tone: "muted", hl: s === 1, dim: s > 1 });
      if (s >= 2) c.box({ x: 40, y: 92, w: 140, h: 64, label: "Supervised", sub: "speaker labels", tone: "paper", hl: s === 2 });
      if (s >= 4) c.box({ x: 230, y: 92, w: 150, h: 64, label: "Semi-supervised", sub: "few labels + α", tone: "paper", hl: s === 4 });
      if (s >= 3) c.box({ x: 440, y: 92, w: 160, h: 64, label: "Unsupervised", sub: "latent z", tone: "take", hl: s === 3 });
      if (s >= 5) {
        const ssl = c.box({ x: 230, y: 190, w: 370, h: 40, label: "Self-supervised: labels made from the audio", size: 14, tone: "take", hl: s === 5 });
        ["generative", "contrastive", "predictive"].forEach((t, i) => c.box({ x: 230 + i * 126, y: 244, w: 118, h: 36, label: t, size: 13, tone: "take", hl: s === 5 }));
      }
      if (s >= 6) c.box({ x: 40, y: 190, w: 160, h: 90, label: "TTS uses: speaker vectors, units", size: 13, tone: "predict", hl: true });
      void feat;
    };
  };

  D["speaker-embeddings"] = (fig, k) => {
    const T = k.toggle({ label: "embedding", options: ["d-vector", "x-vector"], value: "d-vector" });
    k.follow(T, { 1: "d-vector", 2: "x-vector" });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const x = T.value === "x-vector";
      P.strip(c, 16, 24, 8, 30, 40, () => ({ tone: "bridge" }));
      c.text(16, 84, "mel frames of one utterance", { size: 12, tone: "muted" });
      const fr = c.box({ x: 290, y: 18, w: 150, h: 52, label: x ? "TDNN layers" : "DNN per frame", sub: x ? "frame level" : "label = speaker", tone: "take", hl: s <= 2 });
      const pool = c.box({ x: 470, y: 18, w: 154, h: 52, label: x ? "stats pooling" : "average frames", sub: x ? "mean ‖ std" : "at test time", tone: "paper", hl: s === 1 || s === 2 });
      c.connect(fr, pool);
      const ff = c.box({ x: 470, y: 110, w: 154, h: 46, label: x ? "feed-forward" : "last hidden layer", size: 13, tone: "take", dim: !x });
      c.connect(pool, ff, { dim: !x });
      const emb = c.box({ x: 290, y: 110, w: 150, h: 46, label: x ? "x-vector" : "d-vector", tone: "predict", hl: s === 3 });
      c.connect(ff, emb, { dim: !x });
      if (x) {
        const sm = c.box({ x: 16, y: 110, w: 220, h: 46, label: "speaker softmax", sub: "thrown away", tone: "muted", dashed: true, dim: s >= 3 });
        c.connect(emb, sm, { dim: s >= 3, dash: true });
      }
      if (s >= 4) {
        c.text(16, 196, "Table 1 losses", { size: 13, weight: 700, tone: s === 4 ? "ink" : "muted" });
        c.chips({ x: 16, y: 204, size: 12, maxW: 610, items: ["softmax", "AM-softmax", "AAM-softmax", "triplet", "prototypical", "GE2E", "angular proto"].map((t) => ({ t, tone: t === "GE2E" || t === "prototypical" ? "code" : "muted", hl: s === 4 && (t === "GE2E" || t === "prototypical") })) });
      }
      if (s >= 5) {
        ["diarization", "voice conversion", "multi-speaker TTS"].forEach((t, i) => c.box({ x: 16 + i * 205, y: 268, w: 195, h: 36, label: t, size: 13, tone: i === 2 ? "predict" : "paper", hl: s === 5 }));
      }
      if (s >= 6) c.box({ x: 16, y: 316, w: 608, h: 38, label: "SV2TTS: GE2E encoder, 18K speakers → 256-d vector → Tacotron 2", size: 13, tone: "code", hl: true }); // FBU arXiv:1806.04558 §2.1
    };
  };

  D["latent-models"] = (fig, k) => {
    const pz = k.slider({ label: "p(z = voiced)", min: 0.05, max: 0.95, step: 0.05, value: 0.7, fmt: (v) => v.toFixed(2) });
    const c = k.canvas(W, H);
    const g = (x, m, sd) => Math.exp(-0.5 * ((x - m) / sd) ** 2) / (sd * Math.sqrt(2 * Math.PI));
    return (s) => {
      c.clear();
      const w = pz.value, xs = Array.from({ length: 121 }, (_, i) => -4 + i * 0.1);
      const a = xs.map((x) => (1 - w) * g(x, -1.5, 0.7)), b = xs.map((x) => w * g(x, 1.4, 0.9)), m = xs.map((x, i) => a[i] + b[i]);
      if (s === 5) { // standard VAE recipe (not from the survey)
        V.code(c, [
          "mu, logvar = enc(x)            # (B, d_z) each",
          "eps = torch.randn_like(mu)     # (B, d_z), no grad needed",
          "z = mu + torch.exp(0.5*logvar) * eps",
          "x_hat = dec(z)                 # (B, T, 80) mel",
          "rec = F.l1_loss(x_hat, x)",
          "kl = -0.5 * (1 + logvar - mu**2 - logvar.exp())",
          "kl = kl.sum(-1).mean()         # sum d_z, mean B",
          "loss = rec + beta * kl",
        ], [2, 5, 6], { y: 34, lh: 26 });
        const en = c.box({ x: 16, y: 270, w: 180, h: 46, label: "encoder q(z|x)", size: 13, tone: "take" });
        const zz = c.box({ x: 230, y: 270, w: 150, h: 46, label: "z = μ + σ·ε", size: 13, tone: "predict", hl: true });
        const de = c.box({ x: 414, y: 270, w: 210, h: 46, label: "decoder p(x|z)", size: 13, tone: "take" });
        c.connect(en, zz); c.connect(zz, de);
        return;
      }
      const plotOn = s >= 2;
      const p = c.plot({ x: 16, y: 10, w: 400, h: 230, xmin: -4, xmax: 5, ymin: 0, ymax: 0.5, xlabel: "feature x (toy)", ylabel: "density",
        series: plotOn ? [
          { x: xs, y: a, tone: "muted", dash: true, label: "z = unvoiced", labelAt: 30 },
          { x: xs, y: b, tone: "muted", dash: true, label: "z = voiced", labelAt: 70 },
          { x: xs, y: m, tone: "paper", label: "p(x)", labelAt: 100 },
        ] : [] });
      void p;
      const zb = c.box({ x: 450, y: 14, w: 174, h: 50, label: "hidden z", sub: s >= 1 ? "phone, speaker, style" : "", tone: "take", hl: s === 1 });
      const xb = c.box({ x: 450, y: 104, w: 174, h: 50, label: "audio x", tone: "bridge", hl: s === 1 });
      c.connect(zb, xb, { label: "p(x|z)" });
      if (s >= 2) c.text(450, 186, `p(x) = ${(1 - w).toFixed(2)}·N₁ + ${w.toFixed(2)}·N₂`, { size: 13, mono: true, maxW: 180, tone: s === 2 ? "ink" : "muted" });
      if (s === 3) c.box({ x: 16, y: 266, w: 608, h: 40, label: "neural p(x|z), continuous z: ∫ has no closed form → sample (MCMC)", size: 13, tone: "bad", hl: true });
      if (s >= 4) {
        const en = c.box({ x: 16, y: 270, w: 180, h: 46, label: "encoder q(z|x)", size: 13, tone: "take", hl: s === 4 });
        const zz = c.box({ x: 230, y: 270, w: 150, h: 46, label: s >= 6 ? "codebook z" : "z ~ Gaussian", size: 13, tone: s >= 6 ? "predict" : "take", hl: s === 6 });
        const de = c.box({ x: 414, y: 270, w: 210, h: 46, label: s >= 7 ? "decoder + text = VITS" : "decoder p(x|z)", size: 13, tone: s >= 7 ? "code" : "take", hl: s === 4 || s === 7 });
        c.connect(en, zz); c.connect(zz, de);
      }
    };
  };

  D["semi-supervised"] = (fig, k) => {
    const conf = k.slider({ label: "confidence", min: 0, max: 1, step: 0.05, value: 0.2, fmt: (v) => v.toFixed(2) });
    k.follow(conf, { 1: 0.2, 3: 0.85 });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      c.text(16, 24, "data", { size: 13, weight: 700, tone: "muted" });
      const xl = c.box({ x: 16, y: 36, w: 60, h: 40, label: "X_L", size: 13, tone: "paper", hl: s === 1 || s === 2 });
      const xu = c.box({ x: 16, y: 96, w: 260, h: 40, label: "X_U: many unlabelled clips", size: 13, tone: "bridge", hl: s === 1 || s === 3 });
      if (s >= 2) c.box({ x: 96, y: 36, w: 180, h: 40, label: "L_sup (Eq. 28)", size: 13, tone: "paper", hl: s === 2 });
      // A 4-label prediction for one unlabelled clip.
      const q = conf.value, top = 0.25 + 0.73 * q, rest = (1 - top) / 3;
      const probs = [top, rest * 1.3, rest, rest * 0.7].map((v) => v / (top + rest * 3));
      const Hb = -probs.reduce((acc, p) => acc + (p > 0 ? p * Math.log2(p) : 0), 0);
      if (s >= 3) {
        c.text(320, 24, "one unlabelled clip: predicted label", { size: 13, weight: 700, tone: "muted" });
        V.tbars(c, probs.map((p, i) => [["/a/", "/i/", "/u/", "/e/"][i], +p.toFixed(2), i === 0]), { x: 320, y: 36, w: 304, h: 150, labelW: 50, max: 1, tone: "take", fmt: (v) => v.toFixed(2) });
        c.box({ x: 320, y: 196, w: 304, h: 40, label: `entropy H = ${Hb.toFixed(2)} bits (max 2.00)`, mono: true, size: 13, tone: Hb < 1 ? "code" : "predict", hl: s === 3 });
      }
      if (s >= 4) c.box({ x: 16, y: 160, w: 260, h: 76, label: "L = L_sup + α·L_unsup", sub: "α weighs the unlabelled pile", mono: true, size: 14, tone: "take", hl: s === 4 });
      if (s >= 5) c.box({ x: 16, y: 256, w: 608, h: 40, label: "Eq. 29 as printed: Σ p log p = −H  → needs a minus to minimize H", size: 13, tone: "bad", hl: s === 5 });
      if (s >= 6) ["ASR", "TTS", "quality", "speech translation"].forEach((t, i) => c.box({ x: 16 + i * 153, y: 312, w: 145, h: 36, label: t, size: 13, tone: "paper", hl: s === 6 }));
      void xl; void xu;
    };
  };

  D["ssl-generative"] = (fig, k) => {
    const M = k.toggle({ label: "variant", options: ["auto-encode", "autoregressive", "masked"], value: "auto-encode" });
    k.follow(M, { 1: "masked", 2: "auto-encode", 3: "autoregressive", 4: "masked" });
    const c = k.canvas(W, H);
    return (s) => {
      c.clear();
      const mode = M.value, n = 12, cw = 50;
      if (s <= 4 || s === 6) {
        const masked = (i) => mode === "masked" && (i === 3 || i === 4 || i === 8);
        const fut = (i) => mode === "autoregressive" && i >= 9;
        c.text(16, 22, "input frames", { size: 13, tone: "muted", weight: 700 });
        P.strip(c, 16, 32, n, cw, 44, (i) => ({ tone: masked(i) || fut(i) ? "muted" : "bridge", t: masked(i) ? "▒" : fut(i) ? "?" : "", dashed: masked(i) || fut(i) }));
        let mid;
        if (mode === "auto-encode") mid = c.box({ x: 220, y: 118, w: 200, h: 50, label: "bottleneck", sub: "AE · VAE · VQ-VAE", tone: "take", hl: true });
        else if (mode === "autoregressive") mid = c.box({ x: 170, y: 118, w: 300, h: 50, label: "RNN / transformer reads the past", sub: "APC · WaveNet", tone: "take", hl: true });
        else mid = c.box({ x: 170, y: 118, w: 300, h: 50, label: "transformer sees both sides", sub: "Mockingjay · TERA · DeCoAR", tone: "take", hl: true });
        c.text(16, 220, mode === "auto-encode" ? "rebuild every frame" : mode === "autoregressive" ? "predict the next frames" : "rebuild only the hidden frames", { size: 13, tone: "muted", weight: 700 });
        P.strip(c, 16, 230, n, cw, 44, (i) => ({ tone: (mode === "auto-encode") || masked(i) || fut(i) ? "predict" : "muted", dim: !((mode === "auto-encode") || masked(i) || fut(i)), hl: masked(i) || fut(i) }));
        c.arrow(320, 80, 320, 116, { tone: "muted" });
        c.arrow(320, 170, 320, 226, { tone: "muted" });
        void mid;
        if (s === 6) c.box({ x: 16, y: 298, w: 608, h: 46, label: "every detail must be rebuilt, noise included", size: 14, tone: "bad", hl: true });
      } else {
        V.title(c, "pretraining hours (Table 2)");
        V.tbars(c, [["PASE (LS)", 50], ["PASE+ (LS)", 50], ["Mockingjay (LS)", 360, true], ["DeCoAR (LS, max)", 960, true]], { y: 40, h: 260, labelW: 170, max: 1000, fmt: (v) => `${v} h` }); // Table 2
      }
    };
  };

  D["ssl-contrastive"] = (fig, k) => {
    const sp = k.slider({ label: "true-pair score", min: -0.2, max: 1, step: 0.05, value: 0.3, fmt: (v) => v.toFixed(2) });
    k.follow(sp, { 1: 0.3, 4: 0.3 });
    const c = k.canvas(W, H);
    const r = V.rng(7), neg = Array.from({ length: 100 }, () => -0.1 + 0.5 * r()); // K = 100 distractors (FBU arXiv:2006.11477), scores illustrative
    const kappa = 0.1; // FBU arXiv:2006.11477 §4.2
    return (s) => {
      c.clear();
      if (s === 5 || s === 6) {
        V.title(c, s === 5 ? "wav2vec 2.0 pretraining audio (Table 3)" : "WER with only 10 min of labels (found by us)");
        if (s === 5) V.tbars(c, [["LibriSpeech", 960], ["LibriLight", 60000, true]], { y: 60, h: 160, labelW: 130, max: 60000, fmt: (v) => `${v.toLocaleString("en-US")} h` }); // Table 3
        else V.tbars(c, [["test-clean", 4.8, true], ["test-other", 8.2]], { y: 60, h: 160, labelW: 130, max: 10, tone: "code", fmt: (v) => `${v}%` }); // FBU arXiv:2006.11477 abstract
        c.text(320, 300, s === 5 ? "unlabelled hours" : "pretrained on 53k unlabelled hours", { size: 13, tone: "muted", anchor: "middle" });
        return;
      }
      // Frames with masked spans → context vectors → pick the true target.
      const masked = (i) => s >= 3 && i >= 4 && i <= 6;
      c.text(16, 20, s >= 3 ? "masked features" : "CPC: past → future", { size: 13, weight: 700, tone: "muted" });
      P.strip(c, 16, 30, 10, 22, 36, (i) => ({ tone: masked(i) ? "muted" : s < 3 && i > 6 ? "muted" : "bridge", t: masked(i) ? "▒" : s < 3 && i > 6 ? "?" : "", dashed: masked(i) || (s < 3 && i > 6), hl: s === 3 && i === 5 }));
      const ct = c.box({ x: 16, y: 100, w: 180, h: 46, label: s >= 3 ? "context c₅" : "context c_t", sub: "transformer out", tone: "take", hl: s === 2 || s === 3 });
      const tgt = c.box({ x: 16, y: 180, w: 180, h: 46, label: "true q⁺", sub: "quantized target", tone: "code", hl: s >= 1 });
      c.box({ x: 16, y: 260, w: 180, h: 46, label: "100 distractors", sub: "other steps", tone: "bad", dim: s < 2 });
      c.connect(ct, tgt, { label: "score" });
      // Bars: true pair vs a few distractors.
      const shown = neg.slice(0, 6);
      const rows = [["q⁺ (true)", +sp.value.toFixed(2), true]].concat(shown.map((v, i) => [`neg ${i + 1}`, +v.toFixed(2)]));
      c.text(260, 20, "cosine scores s", { size: 13, weight: 700, tone: "muted" });
      V.tbars(c, rows.map(([l, v, h]) => [l, Math.max(0, v), h]), { x: 260, y: 34, w: 364, h: 210, labelW: 90, max: 1, tone: "paper", fmt: (v) => v.toFixed(2) });
      if (s >= 4) {
        const all = [sp.value].concat(neg), mx = Math.max(...all.map((v) => v / kappa));
        const den = all.reduce((a, v) => a + Math.exp(v / kappa - mx), 0), pt = Math.exp(sp.value / kappa - mx) / den;
        c.box({ x: 260, y: 258, w: 364, h: 46, label: `p(true) = ${(pt * 100).toFixed(1)}%   loss = ${(-Math.log(pt)).toFixed(2)}`, mono: true, size: 14, tone: pt > 0.5 ? "code" : "predict", hl: s === 4 });
        c.text(442, 326, `κ = 0.1, 1 true + 100 negatives`, { size: 12, tone: "muted", anchor: "middle" });
      }
    };
  };

  D["ssl-predictive"] = (fig, k) => {
    const R = k.toggle({ label: "targets", options: ["round 1: MFCC, k=100", "round 2: layer, k=500"], value: "round 1: MFCC, k=100" });
    k.follow(R, { 1: "round 1: MFCC, k=100", 4: "round 1: MFCC, k=100", 5: "round 2: layer, k=500" });
    const c = k.canvas(W, H);
    // Illustrative frame → cluster IDs; round 2 is more consistent within a phone.
    const ids1 = [17, 17, 42, 9, 42, 63, 63, 8, 71, 8, 8, 30];
    const ids2 = [212, 212, 212, 88, 88, 88, 341, 341, 341, 5, 5, 5];
    const phones = ["b", "b", "b", "æ", "æ", "æ", "l", "l", "l", "ə", "ə", "ə"];
    return (s) => {
      c.clear();
      if (s <= 2) {
        c.text(16, 24, s === 1 ? "speech: continuous, no boundaries" : "Discrete BERT: vq-wav2vec codes", { size: 13, weight: 700, tone: "muted" });
        const r = V.rng(3);
        let d = "M16,110";
        for (let x = 16; x <= 624; x += 4) d += ` L${x},${110 + 40 * Math.sin(x / 9) * Math.sin(x / 61) + 10 * (r() - 0.5)}`;
        c.path(d, { tone: "bridge" });
        if (s === 2) {
          P.strip(c, 16, 180, 12, 50, 40, (i) => ({ t: String([3, 3, 77, 77, 77, 120, 41, 41, 9, 9, 250, 250][i]), tone: "paper", mono: true }));
          c.box({ x: 16, y: 250, w: 608, h: 46, label: "10 min of labels → 25% WER on test-other (§4.4.3)", size: 14, tone: "predict", hl: true });
        }
        return;
      }
      const ids = R.value.startsWith("round 2") ? ids2 : ids1;
      c.text(16, 22, "frames (phone shown for reference)", { size: 13, weight: 700, tone: "muted" });
      P.strip(c, 16, 30, 12, 50, 34, (i) => ({ t: phones[i], tone: "bridge" }));
      c.text(16, 96, "k-means target per frame", { size: 13, weight: 700, tone: "muted" });
      const masked = (i) => s >= 4 && i >= 4 && i <= 7;
      P.strip(c, 16, 104, 12, 50, 34, (i) => ({ t: String(ids[i]), tone: "paper", hl: masked(i) }));
      if (s >= 4) {
        c.text(16, 170, "model input (masked span)", { size: 13, weight: 700, tone: "muted" });
        P.strip(c, 16, 178, 12, 50, 34, (i) => ({ t: masked(i) ? "▒" : "", tone: masked(i) ? "muted" : "bridge", dashed: masked(i) }));
        c.box({ x: 16, y: 230, w: 608, h: 40, label: "cross-entropy on the 4 masked frames only: predict their IDs", size: 13, tone: "take", hl: s === 4 });
      }
      if (s === 5) c.box({ x: 16, y: 284, w: 608, h: 40, label: "round 2 IDs follow phones: b b b → 212 212 212", size: 13, tone: "code", hl: true });
      if (s === 6) c.box({ x: 16, y: 284, w: 608, h: 40, label: "WavLM: same targets, augmented inputs", size: 13, tone: "predict", hl: true });
    };
  };

  D["units-for-tts"] = (fig, k) => {
    const c = k.canvas(W, H);
    const ex = V.EX, nUnits = Math.round(ex.sec / 0.02); // 170 at 20 ms (HuBERT frame rate, FBU arXiv:2106.07447)
    const raw = [31, 31, 31, 7, 7, 88, 88, 88, 88, 14, 14, 52, 52, 52, 3, 3];
    const merged = raw.filter((u, i) => i === 0 || raw[i - 1] !== u);
    return (s) => {
      c.clear();
      const wav = c.box({ x: 16, y: 14, w: 180, h: 50, label: `${ex.sec} s bank line`, sub: `${nUnits} frames of 20 ms`, tone: "bridge", hl: s === 1 });
      if (s >= 2) {
        const s2u = c.box({ x: 230, y: 14, w: 170, h: 50, label: "S2u", sub: "SSL encoder + k-means", tone: "take", hl: s === 2 });
        c.connect(wav, s2u);
        c.box({ x: 430, y: 14, w: 194, h: 50, label: "CPC · w2v 2.0 · HuBERT", sub: "50 / 100 / 200 units", size: 13, tone: "muted", hl: s === 2 });
      }
      if (s >= 1) {
        c.text(16, 96, s >= 3 ? "units, repeats merged" : "units (first 16 of 170)", { size: 13, weight: 700, tone: "muted" });
        c.chips({ x: 16, y: 106, size: 14, maxW: 608, items: (s >= 3 ? merged : raw).map((u) => ({ t: String(u), tone: "paper", hl: s === 3 })) });
      }
      if (s >= 4) {
        const ulm = c.box({ x: 16, y: 180, w: 280, h: 50, label: "uLM", sub: "language model on units", tone: "take", hl: s === 4 });
        if (s >= 5) {
          const u2s = c.box({ x: 344, y: 180, w: 280, h: 50, label: "u2S", sub: "units → waveform", tone: "bridge", hl: s === 5 });
          c.connect(ulm, u2s);
        }
      }
      if (s >= 6) {
        c.box({ x: 16, y: 262, w: 290, h: 46, label: "same units, any voice", sub: "resynthesis · VC", tone: "code", hl: true });
        c.box({ x: 334, y: 262, w: 290, h: 46, label: "codec tokens → VALL-E", sub: "see Since 2023", tone: "predict", hl: true });
      }
    };
  };
})();
