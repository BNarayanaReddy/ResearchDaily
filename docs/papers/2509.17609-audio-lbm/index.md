---
title: "AudioLBM"
paper_title: "Audio Super-Resolution with Latent Bridge Models"
authors: ["Chang Li", "Zehua Chen", "Liyuan Wang", "Jun Zhu"]
year: 2025
venue: "NeurIPS 2025"
arxiv_id: "2509.17609"
arxiv_version: v3
paper_type: method
hook: "Most upsamplers paint the missing treble starting from random noise. AudioLBM starts from the muffled clip itself and walks it to 48 kHz, then on to 192 kHz."
big_idea: "Encode the low-res and high-res waveforms into one latent space, then train a bridge model that walks straight from one latent to the other, told which band it has and which band to make."
goal: "Decide whether to put an audio upsampler like AudioLBM after a 24 kHz TTS so you can ship 48 kHz speech."
difficulty: 3
difficulty_note: "Home turf: sample rates, spectrograms, codecs, TTS. New: diffusion bridges (one equation, with a live calculator) and cascaded models. Light math."
date_added: 2026-10-14
tags: [Speech, Audio, Generative models, Diffusion]
description: "Most upsamplers paint the missing treble starting from random noise. AudioLBM starts from the muffled clip itself and walks it to 48 kHz, then on to 192 kHz."
---

<article class="rd-page" id="band" data-part="Toolbox" data-draw="band" data-fast markdown>

<p class="rd-crumb"><b>Toolbox 1</b> Start here. Our running example: one 5.12-second VCTK speech clip recorded at 8 kHz.</p>

## What is actually missing from an 8 kHz clip?

1. **A sample rate caps the band.** A clip sampled at 8 kHz can only hold frequencies up to 4 kHz, half its rate.
2. **The target is 48 kHz.** That band runs to 24 kHz. So 20 of the 24 kHz are simply absent. [[83% | of the 48 kHz band is missing]]
3. **Resampling adds no sound.** Our clip becomes 245,760 samples at 48 kHz, but everything above 4 kHz stays silent. A model must create it.
4. 🧠 **The low band is a clue.** Harmonics below 4 kHz hint at the ones above. Fricatives like "s" live mostly up high and must be guessed.
5. **Move the slider.** The paper tests 8, 12, 16 and 24 kHz inputs (Table 1). Training sees cutoffs from 1 to 20 kHz (§4.1).

<p class="rd-cap">Band edges are exact arithmetic. The spectrum shape is illustrative, not measured.</p>

<p class="rd-take"><b>Super-resolution means inventing a band that is not there.</b> Next: how to score the invention.</p>

</article>

<article class="rd-page" id="lsd" data-part="Toolbox" data-draw="lsd" markdown>

<p class="rd-crumb"><b>Toolbox 2</b> Uses the missing band from page 1.</p>

## How do you score an upsampled clip?

1. **Compare log spectra, bin by bin.** **LSD** takes the log power ratio of reference and output per bin, squares, averages, and takes a root (Eq. 16). Lower is better.
2. **Split it by band.** **LSD(L)** scores only the band the input already had. **LSD(H)** scores the band the model invented (Eq. 17). Try the toggle.
3. **LSD(L) should stay small.** The input already holds those frequencies, so a model only has to keep them. The raw VCTK input scores 0.187 (Table 1).
4. **SSIM checks local structure.** It compares 7 × 7 patches of the log spectrogram, as image SSIM does (App. G.3). Higher is better.
5. **Perceptual scores guess a listener.** SigMOS for 48 kHz speech, ViSQOL for sound and music (§4.1). Both are models, not human tests.

<p class="rd-cap">The 12-bin spectra are made up; the LSD shown is computed live from them with Eq. 16. The 0.187 is Table 1.</p>

<p class="rd-take"><b>Watch LSD(L) and LSD(H) separately.</b> One says what was kept, the other what was invented.</p>

</article>

<article class="rd-page" id="diffusion" data-part="Toolbox" data-draw="diffusion" markdown>

<p class="rd-crumb"><b>Toolbox 3</b> Standalone. You may know this from diffusion vocoders.</p>

## How does a diffusion model turn noise into audio?

1. **Training adds noise step by step.** Take a clean latent and mix in Gaussian noise, more at each step, until only noise is left.
2. **A network learns to undo a step.** Given a noisy sample and its time, it predicts the noise that was added.
3. **Generation runs it backwards.** Start from pure noise, remove a little predicted noise each step, and land on data.
4. **A condition steers the walk.** AudioSR feeds in the low-res clip as a condition, but still starts from Gaussian noise (§1, Fig. 2).
5. 🧠 **The start knows nothing.** Every walk begins at a random point. The condition must carry the whole clip.

<p class="rd-cap">One-dimensional toy: the paths are seeded random draws, not a trained model.</p>

<p class="rd-take"><b>Diffusion starts from noise that knows nothing about the input.</b> Next: what if the start already knew?</p>

</article>

<article class="rd-page" id="bridge" data-part="Toolbox" data-draw="bridge" data-fast markdown>

<p class="rd-crumb"><b>Toolbox 4</b> Changes one thing on page 3: the starting point.</p>

## What if the walk starts from the low-res clip instead?

1. **Pin both ends.** A **bridge model** fixes one end at the low-res latent and the other at the high-res latent (§3.1). The start is one point, not a Gaussian.
2. **In between, mix and add noise.** Eq. 1 weights the two ends by time and adds noise. Move the slider over \(t\).
3. **Noise vanishes at both ends.** It is zero at \(t = 0\) and \(t = 1\). It peaks late, near \(t = 0.71\), so most steps are spent denoising.
4. **The schedule is the paper's.** \(g^2\) rises from 0.001 to 1.0, the "gmax" schedule (App. G.2). Its drift-free form comes from Bridge-TTS (found by us).
5. **Sampling walks from z_LR to z_HR.** It starts at the input's own latent, already close to the answer (§3.1). [[0.35 | largest noise std, near t = 0.71]]

<p class="rd-cap">Weights and noise are computed live from Eq. 1 with the gmax schedule. The two end values are illustrative.</p>

<p class="rd-take"><b>A bridge starts from the input itself, not from noise.</b> That one change is the paper's core idea.</p>

</article>

<article class="rd-page" id="machine" data-part="The machine" data-draw="machine" data-fast markdown>

<p class="rd-crumb"><b>Machine 1</b> Follows our 8 kHz clip from page 1 through the bridge of page 4.</p>

## What is the whole machine?

1. **Resample and low-pass.** Our clip becomes 245,760 samples at 48 kHz. A sharp filter cuts at its detected band, 4 kHz (§3.2, App. F.1).
2. **Encode the waveform.** A convolutional VAE squeezes it 512 times into 64 channels × 480 frames: \(z_{LR}\) (App. B.1.3).
3. **Run the bridge.** A 0.5B-parameter DiT walks \(z_{LR}\) to \(z_{HR}\) in 50 steps, told both bands (§3.2, §4.1).
4. **Decode.** The same VAE's decoder turns \(z_{HR}\) back into 245,760 samples, now with 0–24 kHz content (§3.1).
5. **Optionally, keep going.** Two more bridges take 48 kHz to 96 kHz, then 192 kHz (§3.3).

<p class="rd-cap">Sizes are real (§4.1, App. B.1.3, App. G.2). 480 frames is our arithmetic: 245,760 ÷ 512.</p>

<p class="rd-take"><b>Encode, bridge, decode.</b> The next pages open each box in turn.</p>

</article>

<article class="rd-page" id="wave-latent" data-part="The machine" data-draw="wave-latent" markdown>

<p class="rd-crumb"><b>Machine 2</b> Opens the encoder box of page 5.</p>

## Why encode the waveform, not the spectrogram?

1. **AudioSR works on mel images.** Our clip's mel has an empty top region. The model fills it starting from Gaussian noise (§1, Fig. 2).
2. **A2SB inpaints the STFT.** Same picture: the missing band is a hole, filled from noise (§1).
3. **AudioLBM encodes the waveform.** No latent channel means "high band", so nothing in \(z_{LR}\) is empty. Try the toggle.
4. **The low-res latent is a full draft.** Every number in \(z_{LR}\) says something about \(z_{HR}\). That is what a bridge can start from (§3.1).
5. **The VAE copies well.** Reconstruction LSD on VCTK is 0.580, the best of the six codecs compared (Table 6).

<p class="rd-cap">Grids are schematic. Shapes and the 0.580 are real (Fig. 2, App. B.1.3, Table 6).</p>

<p class="rd-take"><b>In waveform latents, the input is a draft, not a hole.</b> Next: how hard to squeeze.</p>

</article>

<article class="rd-page" id="squeeze" data-part="The machine" data-draw="squeeze" markdown>

<p class="rd-crumb"><b>Machine 3</b> Tunes the VAE from page 6.</p>

## How hard should the VAE squeeze?

1. **Less squeeze, better output.** Super-resolution LSD drops from 0.730 at \(r = 2048\) to 0.687 at \(r = 256\) (Table 4).
2. **But frames cost time.** Real-time factor on an A800 at 100 steps rises from 0.18 to 1.14 (Table 4).
3. **On a fixed budget, 512 wins.** With 96 A800-hours of bridge training each, \(r = 512\) scores best: LSD 0.711 (App. B.1.1).
4. **Drop the KL term.** A bridge never starts from a Gaussian, so the latent need not look Gaussian. KL = 0 reconstructs best (Table 5, App. B.1.2).
5. **Then rescale.** Without KL the latent's std is 3.93. Multiplying by \(s = 0.25\) brings it near 1 (Table 5). [[0.98 | latent std after × 0.25]]

<p class="rd-cap">All numbers are real (Tables 4–5). The four toggle values are the only rates tested.</p>

<p class="rd-take"><b>Squeeze 512×, skip the KL, rescale by 0.25.</b> Low-level tasks want a gentler VAE than generation does.</p>

</article>

<article class="rd-page" id="target" data-part="The machine" data-draw="target" markdown>

<p class="rd-crumb"><b>Machine 4</b> Trains the bridge from page 4 on latents from page 6.</p>

## What does the network learn to predict?

1. **Pick a pair and a time.** A training clip gives \(z_{HR}\) and its filtered twin \(z_{LR}\). Draw \(t\) uniformly (Eq. 2).
2. **Mix them with Eq. 1.** \(z_t\) sits between the ends, plus noise. Move the slider.
3. **Ask for the "noise".** The target is \((z_t - z_{HR})/\sigma_t\): what must be removed to reach \(z_{HR}\) (Eq. 2).
4. 🧠 **It is not pure noise.** Expand it: one part noise, one part a pull toward \(z_{LR}\). Near \(t = 1\) the pull grows. This is our algebra.
5. **Noise prediction won here.** Earlier bridges predicted \(z_{HR}\) directly. In this latent space, predicting noise sounded better (§3.1).

<p class="rd-cap">The end values and noise draw are illustrative. Every number shown is computed live from Eqs. 1–2 with the gmax schedule.</p>

<p class="rd-take"><b>The network predicts what to remove, given \(z_t\), \(t\) and \(z_{LR}\).</b> Next: using that guess to walk.</p>

</article>

<article class="rd-page" id="sampler" data-part="The machine" data-draw="sampler" markdown>

<p class="rd-crumb"><b>Machine 5</b> Uses the prediction from page 8.</p>

## How does it walk from z_LR to z_HR?

1. **Start at \(z_{LR}\).** No noise is drawn first. The start is the input's own latent (§3.1).
2. **Each step, guess the end.** The predicted noise gives \(\hat z_{HR} = z_t - \sigma_t \epsilon_\theta\) (§3.1).
3. **Then step part way.** Eq. 3 blends the current point with that guess, plus fresh noise that shrinks every step.
4. **50 steps, every stage.** A first-order SDE sampler (§4.1). Real-time factor 0.369 on an A800 (Table 12). Try fewer steps.
5. **Decode at the end.** The VAE decoder turns \(z_{HR}\) into the 48 kHz waveform (§3.1).

<p class="rd-cap">Paths follow Eq. 3 with a perfect guess and seeded noise. A trained network's guesses are not perfect.</p>

<p class="rd-take"><b>Guess the end, step toward it, repeat 50 times.</b> Next: telling the model which band to make.</p>

</article>

<article class="rd-page" id="freq-aware" data-part="The machine" data-draw="freq-aware" data-fast markdown>

<p class="rd-crumb"><b>Machine 6</b> Adds two inputs to the network of page 8.</p>

## Why tell the model which band it has?

1. **True 48 kHz audio is scarce.** Clips sampled under 32 kHz were dropped, leaving about 5,000 hours (§4.1).
2. **Use each clip's real band.** Many clips stop well below their Nyquist edge. Cap the target at the measured band (App. A.1).
3. **Draw the input band at random.** The input rate is drawn uniformly below the target rate (§3.2). One clip gives many pairs. Try the toggle.
4. **Name both bands as tokens.** \(f_{prior}\) and \(f_{target}\) become two embeddings prepended to the 480 frames (§3.2). [[482 | tokens per 5.12 s clip]]
5. **At inference, ask for 24 kHz.** \(f_{target}\) is 24 kHz. \(f_{prior}\) is the detected band: 4 kHz for our clip (§3.2).

<p class="rd-cap">Mechanism from §3.2 and App. A.1. The example clips and bands are illustrative; 482 is 480 frames plus 2.</p>

<p class="rd-take"><b>Any-to-any pairs turn every clip into training data.</b> Next: how it measures a clip's real band.</p>

</article>

<article class="rd-page" id="f-eff" data-part="The machine" data-draw="f-eff" markdown>

<p class="rd-crumb"><b>Machine 7</b> Supplies the measured band that page 10 needs.</p>

## How does it know a clip's real bandwidth?

1. **A nominal rate can lie.** MaskGCT outputs 24 kHz audio, yet its spectrum rolls off well below 12 kHz (App. A.2, Fig. 9).
2. **The wrong cutoff hurts.** Told the band reaches 12 kHz, AudioSR generated wrong high frequencies above the real edge (Fig. 9).
3. **Smooth the spectrum.** FFT magnitude, Savitzky-Golay smoothing, downsampling, then a log (App. A.1, Fig. 8).
4. **Find where it goes flat and quiet.** The first bin where curvature stays small for a stretch and energy is low (Eq. 6). That bin gives \(f_{eff}\) (Eq. 7).
5. **Used twice.** Training caps targets at \(f_{eff}\). Inference measures \(f_{prior}\) per clip and low-passes there (App. A.2).

<p class="rd-cap">The spectrum is made up; the curvature and cutoff are computed live from it. The paper's thresholds are not reported.</p>

<p class="rd-take"><b>Measure the band; never trust the file's sample rate.</b> This matters most for TTS output (page 21).</p>

</article>

<article class="rd-page" id="cascade" data-part="The machine" data-draw="cascade" markdown>

<p class="rd-crumb"><b>Machine 8</b> Chains the machine of page 5.</p>

## How does it get past 48 kHz?

1. **Three bridges in a row.** Any rate to 48 kHz, then 48 to 96 kHz, then 96 to 192 kHz (§3.3).
2. **Smaller models later.** Stage 1 has 0.5B parameters and 24 layers. Stages 2 and 3 have 0.3B and 16 layers (§4.1, App. G.2).
3. **Data shrinks fast.** 4,470 hours at 48 kHz, 240 at 96 kHz, only 15 at 192 kHz (Table 15).
4. **Reuse what exists.** A 192 kHz VAE fine-tuned from the 48 kHz one beats one trained at 192 kHz: LSD 0.713 vs 0.736 (Table 7).
5. **Each stage costs more time.** Real-time factor 0.369 for 48 kHz, 0.695 for 96, 1.351 for 192 (Table 12).

<p class="rd-cap">All hours, sizes and timings are real (Tables 7, 12, 15). Bar lengths are drawn to a log scale.</p>

<p class="rd-take"><b>One model per octave, each leaning on the last.</b> The catch: stage 2 now eats stage 1's mistakes.</p>

</article>

<article class="rd-page" id="prior-aug" data-part="The machine" data-draw="prior-aug" markdown>

<p class="rd-crumb"><b>Machine 9</b> Fixes the catch left by page 12.</p>

## Why damage the first stage's output on purpose?

1. **Stage 2 learns from perfect inputs.** But at test time it gets stage 1's output, with artifacts near the 24 kHz edge (§3.3, App. D.1).
2. **Cut the top 4 kHz.** A sharp low-pass removes most of stage 1's edge artifacts first (§4.1).
3. **Blur the latent along time.** A 5-tap Gaussian smooths each channel (Eq. 15). Training draws the blur \(b_r\) from 0 to 1 and tells the model (§3.3).
4. **Inference uses \(b_r = 0.3\).** Move the slider: that keeps most weight on the centre tap (§4.1).
5. **Blur beats noise.** LSD 1.182 with blur, 1.219 with nothing, 1.381 with latent noise (Table 10). Deterministic damage suits a fixed start point (§3.3).

<p class="rd-cap">Kernel weights are computed live from Eq. 15. LSD values are Table 10.</p>

<p class="rd-take"><b>Train stage 2 on inputs as flawed as stage 1's.</b> Then the cascade stops compounding errors.</p>

</article>

<article class="rd-page" id="vctk" data-part="Does it work?" data-draw="vctk" data-fast markdown>

<p class="rd-crumb"><b>Result 1</b> Our 8 kHz speech clip's test set, scored with page 2's metrics.</p>

## Does it beat speech specialists at 8 → 48 kHz?

1. **Ten systems, one test.** 500 VCTK clips, 8 → 48 kHz. Eight baselines trained on VCTK; AudioLBM never saw it (§4.1).
2. **Best invented band.** LSD(H) 0.724, against FlowHigh's 0.889, the best baseline (Table 1). [[0.724 | LSD(H), lowest in Table 1]]
3. **Best structure.** SSIM 0.893, against AudioSR's 0.809 (Table 1). Flip the toggle.
4. **Perceptual score: close to a tie.** SigMOS 3.023 beats AudioSR's 2.846 but trails AP-BWE's 3.082. The raw 8 kHz input scores 3.136 (Table 1).
5. **A VCTK-only twin does better.** Trained only on VCTK, it reaches SigMOS 3.095, highest of any system (Table 1).

<p class="rd-cap">All values from Table 1. Baselines with * were retrained by the authors.</p>

<p class="rd-take"><b>Clear wins on spectra; a narrow, mixed result on perceived quality.</b> Next: the one column it loses.</p>

</article>

<article class="rd-page" id="low-band" data-part="Does it work?" data-draw="low-band" markdown>

<p class="rd-crumb"><b>Result 2</b> The LSD(L) column of the page 14 table.</p>

## Did it keep the low band it was given?

1. **The input sets the floor.** The 8 kHz input scores LSD(L) 0.187 (Table 1).
2. **Waveform models keep it.** Bridge-SR scores 0.172 and UDM+ 0.216. Neither uses a compression network (§4.2).
3. **AudioLBM scores worst: 0.773.** The decoder redraws the low band too (Table 1). A VAE round trip alone scores 0.428 on low frequencies (Table 6).
4. **Others paste the input back.** **Low-frequency replacement** copies the input's band over the output (§4.2). AudioLBM's reported numbers skip it.
5. **Pasting helps AudioLBM too.** In the cascade, it cut LSD-LF from 0.811 to 0.331 (Table 11).

<p class="rd-cap">All values from Tables 1, 6 and 11. Table 11 is 16 → 96 kHz music, not VCTK.</p>

<p class="rd-take bad"><b>The VAE smudges what the input already got right.</b> For speech, paste the low band back.</p>

</article>

<article class="rd-page" id="which-part" data-part="Does it work?" data-draw="which-part" data-fast markdown>

<p class="rd-crumb"><b>Result 3</b> Separates the latent space (page 6) from the bridge (page 4).</p>

## Is it the bridge, or the latent space?

1. **Seven variants, same speech data.** Each trained 500K steps, tested on VCTK at 8 → 48 kHz with 50 steps (App. E.4).
2. **Same latent, swap the generator.** LSD: diffusion 0.758, flow 0.751, bridge 0.742 (Table 13). A small gap.
3. **Perceived quality gaps more.** SigMOS: diffusion 2.741, flow 2.892, bridge 3.095 (Table 13). Flip the toggle.
4. **Same bridge, swap the space.** LSD: STFT 1.295, raw waveform 1.037, waveform latent 0.742 (Table 13). A big gap.
5. 🧠 **Two rows look copied.** The mel rows match Table 1's AudioSR and FlowHigh to three decimals. Trust the three latent rows most.

<p class="rd-cap">All values from Table 13. The copied-row observation is ours, from comparing Tables 1 and 13.</p>

<p class="rd-take"><b>The latent space buys most of the LSD; the bridge buys perceived quality.</b></p>

</article>

<article class="rd-page" id="freq-ablation" data-part="Does it work?" data-draw="freq-ablation" markdown>

<p class="rd-crumb"><b>Result 4</b> Tests the band tokens of page 10.</p>

## Does telling it the band actually help?

1. **Start with no data filter.** Keep every low-rate clip: LSD 1.366 on ESC-50 sounds at 16 → 48 kHz (Table 2).
2. **Drop clips under 32 kHz.** LSD falls to 1.052 (Table 2).
3. **Add the band tokens.** \(f_{prior}\) brings 1.022; adding \(f_{target}\) brings 0.994 (Table 2).
4. **True 48 kHz data alone loses.** 1.127, worse than any-to-any training. Music shows the same order: 1.198 vs 1.124 (Table 2).
5. **Small runs.** Ablations train 0.2M steps at batch 32, without speech (§4.1).

<p class="rd-cap">All values from Table 2. Bars 2–4 each add one piece; the last trains on true 48 kHz data only.</p>

<p class="rd-take"><b>More, rougher data plus band labels beats less, perfect data.</b></p>

</article>

<article class="rd-page" id="beyond48" data-part="Does it work?" data-draw="beyond48" markdown>

<p class="rd-crumb"><b>Result 5</b> Tests the cascade of pages 12–13.</p>

## Does the cascade beat one direct model?

1. **No outside baseline exists.** Nobody had published 96 or 192 kHz upsampling, so the rival is their own direct model (§4.1).
2. **16 → 96 kHz: the cascade wins.** LSD 1.216 vs 1.406; ViSQOL 3.330 vs 3.010 (Table 3).
3. **16 → 192 kHz: by more.** LSD 1.365 vs 1.913. In the top band, 96–192 kHz, 1.474 vs 2.244 (Table 3).
4. **Remove one piece at a time.** At 96 kHz, losing the data filter hurts most: music LSD 1.361 → 2.026 (Fig. 4).

<p class="rd-cap">Tables 3 and Fig. 4 values; Fig. 4 numbers read from the paper's figure source. Test sets are internal.</p>

<p class="rd-take"><b>Stacking specialists beats one generalist at extreme rates.</b> But only on the authors' own test clips.</p>

</article>

<article class="rd-page" id="reviewer" data-part="Your move" data-draw="reviewer" markdown>

<p class="rd-crumb"><b>Your move 1</b> Checks the results of pages 14–18.</p>

## What would a careful reviewer question?

1. **Can anyone rerun it?** No code or weights: "not available at this stage" (NeurIPS checklist, Q5). None found by us on 2026-10-14.
2. **Whose data?** 4,000 of the 4,470 hours at 48 kHz are internal (Table 15). So are all 96 and 192 kHz test sets (§4.1).
3. **How noisy are the gaps?** No error bars or seeds (checklist, Q7). Some wins are 0.01 LSD.
4. **Tuned on what?** Inference blur and filter settings come from a grid search; the clips used are not stated (§3.3).
5. **Are the comparisons controlled?** Table 13 claims matched training, yet two rows equal Table 1 baselines.
6. 🧠 **Steelman.** The three same-latent rows are controlled, and the bridge wins all three metrics there.

<p class="rd-cap">Each answer cites the paper. "Found by us" means our own search of the paper, demo page and GitHub.</p>

<p class="rd-take"><b>Strong idea, hard to verify.</b> Treat exact gaps as indicative until weights appear.</p>

</article>

<article class="rd-page" id="after" data-part="Your move" data-draw="after" markdown>

<p class="rd-crumb"><b>Your move 2</b> All found by us; arXiv IDs checked on 2026-10-14.</p>

## What came after it?

1. **Before: bridges in speech.** Bridge-TTS (2312.03491) gave the schedule used here. A2SB (2501.11311) bridged STFTs for music.
2. **Same month: one-step bridges.** VoiceBridge (2509.25275) restores general speech with a one-step latent bridge.
3. **Flow matching answers.** UniverSR (2510.00771) and LatentFlowSR (2604.09188) upsample with flow matching instead.
4. **The field gets a map.** A survey of super-resolution and bandwidth extension appeared in May 2026 (2605.16681).
5. **Back to frequency awareness.** AnyBand (2608.00572) extends speech from many input bands with in-context spectral infilling.

<p class="rd-cap">Dates are arXiv submission dates. We read titles and abstracts, not results.</p>

<p class="rd-take"><b>The next question is speed.</b> Fifty steps is the cost later work attacks.</p>

</article>

<article class="rd-page" id="verdict" data-part="Your move" data-draw="verdict" data-fast markdown>

<p class="rd-crumb"><b>Your move 3</b> Our pick for a speech-AI reader: you ship a TTS that outputs 24 kHz.</p>

## Should you put it after your 24 kHz TTS?

1. **Can you download it?** No. Neither code nor weights are released (checklist, Q5).
2. **Does it help TTS output?** Yes. 20 listeners rated it above AudioSR on MaskGCT's 24 kHz speech (Fig. 1, App. G.4).
3. **Measure your real band first.** MaskGCT's 24 kHz audio rolls off well below 12 kHz (App. A.2). Yours may too.
4. **Can you afford it?** Real-time factor 0.369 on an A800: about 1.9 s per 5.12 s clip (Table 12).
5. 🧠 **Verdict: borrow the recipe.** Measure \(f_{eff}\) today. A VCTK-only twin, 40 hours, scored best (Table 1). Your own 48 kHz speech may suffice.

<p class="rd-cap">Answers cite the paper. 1.9 s is our arithmetic: 0.369 × 5.12 s. Fig. 1 does not print its scores.</p>

<p class="rd-take"><b>Not a drop-in today; a clear recipe to train your own.</b></p>

</article>

<article class="rd-page" id="q-start" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 1</b> From pages 3, 4 and 9.</p>

## Where does AudioLBM's sampler start?

- [ ] Gaussian noise, with the low-res clip as a condition
- [x] The low-res clip's own waveform latent
- [ ] A mel spectrogram whose empty band is filled with noise

<p class="rd-take"><b>At \(z_{LR}\), the input's own latent.</b> Noise plus a condition is AudioSR; a noise-filled hole is A2SB (§1, §3.1).</p>

</article>

<article class="rd-page" id="q-kl" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 2</b> From page 7.</p>

## Why can AudioLBM's VAE drop the KL term?

- [ ] Its latents are discrete codes, so KL is meaningless
- [ ] The DiT is too large to need regularized inputs
- [x] The bridge starts from z_LR, not a Gaussian, so the latent need not look Gaussian

<p class="rd-take"><b>No Gaussian start, no need for Gaussian latents.</b> KL = 0 reconstructed best; scaling by 0.25 tamed the range (App. B.1.2).</p>

</article>

<article class="rd-page" id="q-flaw" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 3</b> Spot the flaw. From pages 14 and 15.</p>

## Which claim does Table 1 NOT support?

- [ ] AudioLBM invents the high band better than FlowHigh
- [x] AudioLBM preserves the input's low band better than NU-Wave 2
- [ ] Its VCTK-only twin scores higher SigMOS than AP-BWE

<p class="rd-take"><b>Its low band is worse: LSD(L) 0.773 vs NU-Wave 2's 0.294.</b> The VAE redraws the whole band (Table 1).</p>

</article>
