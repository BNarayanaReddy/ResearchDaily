---
title: "AudioSR"
paper_title: "AudioSR: Versatile Audio Super-resolution at Scale"
authors: ["Haohe Liu", "Ke Chen", "Qiao Tian", "Wenwu Wang", "Mark D. Plumbley"]
year: 2024
venue: "ICASSP 2024"
arxiv_id: "2309.07314"
arxiv_version: v1
code: {url: "https://github.com/haoheliu/versatile_audio_super_resolution", license: "MIT text, copyright line names another project", note: "inference code; training code as a Drive zip; read at d312fba, not run"}
model: {url: "https://huggingface.co/haoheliu/audiosr_basic", license: "Apache-2.0 per model card", note: "6.2 GB checkpoint; not run here, too big for our free disk"}
paper_type: method
hook: "One diffusion model takes speech, music or sound effects recorded at anywhere from 4 to 32 kHz and fills in the missing treble up to 48 kHz."
big_idea: "Generate the missing top of a mel spectrogram with a latent diffusion model steered by the low-res mel, let a 48 kHz vocoder turn it into sound, and paste the input's own low band back at both ends."
goal: "Decide whether to run AudioSR on your TTS output so you can ship 48 kHz audio."
difficulty: 2
difficulty_note: "Home turf: mel spectrograms, HiFi-GAN, TTS. New: latent diffusion, noise schedules and classifier-free guidance, each with its own page."
date_added: 2026-10-14
tags: [Speech, Audio, Generative models, Diffusion]
description: "One diffusion model takes speech, music or sound effects recorded at anywhere from 4 to 32 kHz and fills in the missing treble up to 48 kHz."
---

<article class="rd-page" id="band" data-part="Toolbox" data-draw="band" data-fast markdown>

<p class="rd-crumb"><b>Toolbox 1</b> Start here. Our running example: a 5.12-second VCTK speech clip recorded at 8 kHz.</p>

## What is missing from an 8 kHz clip?

1. **A sample rate caps the band.** A clip sampled at \(l\) Hz holds frequencies up to \(l/2\) (§2). Our 8 kHz clip stops at 4 kHz.
2. **The target is 48 kHz.** Its band reaches 24 kHz. Everything from 4 to 24 kHz must be estimated (§2). [[83% | of the 0–24 kHz band is missing]]
3. **Real inputs vary.** Devices, codecs and generators cut the band in different places (§1). A model trained on one rate fails on others.
4. **AudioSR takes 4 to 32 kHz inputs.** That is a band of 2 to 16 kHz, always extended to 24 kHz (Abstract, §1). Move the slider.

<p class="rd-cap">Band edges are exact arithmetic. The spectrum shape is illustrative.</p>

<p class="rd-take"><b>Upsampling means estimating a missing band whose size changes clip to clip.</b> Next: how that gap looks on a mel spectrogram.</p>

</article>

<article class="rd-page" id="mel" data-part="Toolbox" data-draw="mel" markdown>

<p class="rd-crumb"><b>Toolbox 2</b> Redraws the gap of page 1 on a mel axis.</p>

## Why does the gap look smaller on a mel spectrogram?

1. **AudioSR works on a mel spectrogram.** It estimates the high-res mel, not the waveform (§2).
2. 💻 **256 bins from 20 Hz to 24 kHz.** One frame every 480 samples, 10 ms at 48 kHz. Our clip gives 512 frames.
3. **Mel bins crowd the low end.** They are narrow below 1 kHz and wide above, like hearing. Flip the toggle.
4. **Our 4 kHz band fills 57%.** About 146 of 256 bins already hold sound, against 17% of the Hz axis. [[146 / 256 | mel bins our clip already fills]]
5. 🧠 **Top bins are coarse.** The highest bin spans about 390 Hz. Fine detail up there is left to the vocoder.

<p class="rd-cap">Bin counts are our arithmetic with librosa's default mel scale, which the code uses. The picture is schematic.</p>

<p class="rd-take"><b>On a mel scale, most of the picture is already there.</b> The model fills the top 110 bins.</p>

</article>

<article class="rd-page" id="lsd" data-part="Toolbox" data-draw="lsd" markdown>

<p class="rd-crumb"><b>Toolbox 3</b> Standalone. The score every results page uses.</p>

## How do you score an upsampled clip?

1. **Compare log spectra.** **LSD** squares the log power ratio of reference and output per bin, averages, and takes a root (§4).
2. **Lower is better; zero is identical.** Our kind of input, unprocessed 8 kHz VCTK, scores 5.15 (Table 1).
3. **Loudness alone moves it.** Make a clip 1.65 times louder and nothing else: LSD becomes 0.43. Move the slider.
4. 💻 **The authors later flagged this.** A 2025 repo note matches output energy before LSD. One example fell from 1.596 to 1.362.
5. **Listeners give another view.** Raters on Mechanical Turk score quality from 1 to 5 (§4).

<p class="rd-cap">LSD of a pure gain \(a\) is \(2\,|\log_{10} a|\), computed live. Other numbers: Table 1 and the repo's LSD-pitfall note.</p>

<p class="rd-take"><b>LSD measures spectral match, loudness included.</b> Keep that in mind on page 15.</p>

</article>

<article class="rd-page" id="vocoder" data-part="Toolbox" data-draw="vocoder" markdown>

<p class="rd-crumb"><b>Toolbox 4</b> Turns the mel of page 2 back into sound.</p>

## Why let a vocoder rebuild the waveform?

1. **A mel spectrogram has no phase.** You cannot play it. A neural vocoder turns it into a waveform.
2. **The vocoder already knows high bands.** Trained on 48 kHz audio, it learns what they sound like. NVSR showed this helps upsampling (§1, §2).
3. **HiFi-GAN, made 48 kHz-wide.** A multi-resolution discriminator curbs spectral leakage. It trains on all 7,000 hours (§3.1, §4).
4. **The round trip has a cost.** True mel through the vocoder alone: LSD 0.64 on speech, 0.61 music, 0.84 sound (Table 1, GT-Mel).
5. 🧠 **That is roughly a floor.** The best speech output scores 0.69, just above 0.64 (Table 1).

<p class="rd-cap">LSD values are the GT-Mel rows of Table 1. The drawing is schematic.</p>

<p class="rd-take"><b>Estimate the mel, let a 48 kHz vocoder do the rest.</b> Next: how to estimate the mel.</p>

</article>

<article class="rd-page" id="diffusion" data-part="Toolbox" data-draw="diffusion" data-fast markdown>

<p class="rd-crumb"><b>Toolbox 5</b> Standalone. You may know this from diffusion vocoders.</p>

## How does a diffusion model turn noise into a spectrogram?

1. **Training adds noise.** At step \(k\) the latent is \(\sqrt{\bar\alpha_k}\,z_0 + \sqrt{1-\bar\alpha_k}\,\epsilon\). Move the slider.
2. **A network learns to undo it.** Given the noisy latent and \(k\), it predicts what was added.
3. **Generation runs backwards.** Start from pure noise at step 1,000 and remove a little each step.
4. **Work in a smaller latent.** A VAE compresses the mel first, so diffusion handles fewer numbers. This is a **latent diffusion model** (§3.1).
5. **AudioLDM did this for text.** AudioSR reuses its recipe, steered by the low-res mel instead of a caption (§1, §3.1).

<p class="rd-cap">The toy spectrogram is made up. Mixing weights use the code's cosine schedule with 1,000 steps.</p>

<p class="rd-take"><b>Diffusion builds a spectrogram out of noise, one small step at a time.</b> Next: AudioSR's whole machine.</p>

</article>

<article class="rd-page" id="machine" data-part="The machine" data-draw="machine" data-fast markdown>

<p class="rd-crumb"><b>Machine 1</b> Follows our 8 kHz clip from page 1 through the parts of pages 2–5.</p>

## What is the whole machine?

1. **Resample, then find the band.** Our clip becomes 48 kHz. Its cutoff is measured and the input low-passed there (§2, §3.2).
2. **Mel, then encode.** The low-res mel goes through the VAE encoder into a small latent (§3.1).
3. **Denoise a latent from noise.** The diffusion model, steered by that latent, estimates the high-res latent (§3.1).
4. **Decode and paste.** The decoder gives a mel. Bins below the cutoff are swapped for the input's (§3.2).
5. **Vocode and paste again.** HiFi-GAN makes 48 kHz audio. Its low band is swapped for the input's too (§3.2).

<p class="rd-cap">Stage order from Fig. 2 and §3. Boxes are not to scale.</p>

<p class="rd-take"><b>Mel in, diffusion in the middle, vocoder out, input pasted back twice.</b> The next pages open each box.</p>

</article>

<article class="rd-page" id="latent" data-part="The machine" data-draw="latent" markdown>

<p class="rd-crumb"><b>Machine 2</b> Opens the encoder box of page 6.</p>

## What does the diffusion model actually see?

1. 💻 **Our clip becomes one 5.12 s chunk.** The code pads audio to multiples of 5.12 s: 512 mel frames × 256 bins.
2. 💻 **The VAE shrinks both axes 8×.** 512 × 256 becomes 64 × 32, with 16 channels. [[4× | fewer numbers than the mel]]
3. **Noise and condition sit side by side.** The noisy latent and the low-res latent are stacked: 32 channels in, 16 out (§3.1).
4. 🧠 **The condition is not the start.** Sampling still begins from noise; the low-res latent only steers. A bridge model starts from it instead.

<p class="rd-cap">Shapes are from the code config (16 × 128 × 32 per 10.24 s). Grids are schematic.</p>

<p class="rd-take"><b>It denoises 32,768 numbers, steered by 32,768 more.</b> Next: how the noise is scheduled.</p>

</article>

<article class="rd-page" id="schedule" data-part="The machine" data-draw="schedule" markdown>

<p class="rd-crumb"><b>Machine 3</b> Tunes the noising of page 5.</p>

## Why change the noise schedule?

1. **Each step mixes signal and noise.** The schedule sets how much signal, \(\sqrt{\bar\alpha_k}\), is left at step \(k\). Flip the toggle.
2. **The old schedule never reaches pure noise.** Linear betas leave 1.2% of the signal at step 1,000. [[1.2% | signal left at the last step]]
3. **But sampling starts from pure noise.** Training never saw that input. Lin et al. call this a flaw (§3.1).
4. **Cosine fixes the end.** The signal left at step 1,000 drops to 0.005%.
5. **Predict velocity, not noise.** The target \(v = \sqrt{\bar\alpha}\,\epsilon - \sqrt{1-\bar\alpha}\,z_0\) stays useful at both ends (Eq. 1).

<p class="rd-cap">Our arithmetic with the code's settings: linear betas 0.0015 to 0.0195, 1,000 steps.</p>

<p class="rd-take"><b>Make the last training step pure noise, since sampling starts there.</b></p>

</article>

<article class="rd-page" id="guidance" data-part="The machine" data-draw="guidance" markdown>

<p class="rd-crumb"><b>Machine 4</b> Sets how hard page 7's condition steers.</p>

## How strongly does the low-res clip steer?

1. **Sometimes hide the condition.** In training, 10% of the time the low-res latent becomes an empty tensor (§3.1).
2. **One network, two guesses.** At each step it predicts once with the condition and once without.
3. **Push past the conditional guess.** Output = unconditional + \(w\) × (conditional − unconditional). Move \(w\).
4. 💻 **The code uses \(w = 3.5\).** The paper does not give a value.
5. 🧠 **Too high may overdo it.** Larger \(w\) follows the cue harder. Later work saw AudioSR over-boost high bands (found by us).

<p class="rd-cap">The two arrows are illustrative; the combination rule is real. Over-boost: Fig. 5 of arXiv 2509.17609.</p>

<p class="rd-take"><b>Classifier-free guidance turns one model into a dial for fidelity.</b></p>

</article>

<article class="rd-page" id="cutoff" data-part="The machine" data-draw="cutoff" markdown>

<p class="rd-crumb"><b>Machine 5</b> Measures the band edge that page 6 needs.</p>

## How does it find where the input's band ends?

1. **Add up energy from low to high.** Sum each frequency bin's magnitude over time, then keep a running total.
2. **Find the 99% point.** The **roll-off frequency** is where the total reaches 0.99 of all energy (§3.2). Move the slider.
3. 💻 **The code uses 98.5%.** Below 1 kHz it gives up and treats the clip as full-band.
4. **Low-pass the input there.** An order-8 Chebyshev filter makes the edge look like training data (§3.2).
5. 💻 **The code picks the filter at random.** Butterworth, Chebyshev, elliptic or Bessel, fixed by the seed.

<p class="rd-cap">The spectrum is made up; the roll-off is computed live from it.</p>

<p class="rd-take"><b>The cutoff decides what gets kept and what gets invented.</b></p>

</article>

<article class="rd-page" id="replace" data-part="The machine" data-draw="replace" data-fast markdown>

<p class="rd-crumb"><b>Machine 6</b> Uses page 10's cutoff on page 6's outputs.</p>

## Why paste the input's low band back?

1. **The input already knows the low band.** Below the cutoff, the low-res input equals the target (§3.2).
2. **The model may still change it.** Diffusion and the vocoder both redraw every bin.
3. **Paste the low mel bins.** Below the cutoff, the estimated mel takes the input's values (§3.2). Flip the toggle.
4. **Paste again after the vocoder.** STFT bins below the cutoff are swapped too (§3.2). The code first matches their energy.
5. **Not perfect, measured later.** Others found AudioSR's low-band LSD 0.486, against 0.187 for the raw input (found by us).

<p class="rd-cap">Spectrograms are schematic. 0.486 and 0.187: Table 1 of arXiv 2509.17609, not this paper.</p>

<p class="rd-take"><b>Keep what you know; generate only what you don't.</b></p>

</article>

<article class="rd-page" id="data" data-part="The machine" data-draw="data" markdown>

<p class="rd-crumb"><b>Machine 7</b> Where the pairs that train pages 6–11 come from.</p>

## What did it learn from?

1. **About 7,000 hours at 48 kHz.** Music stems, FreeSound effects and OpenSLR speech (§4). Hours per source are not reported.
2. **Make pairs by filtering.** Each clip is low-passed at a cutoff drawn from 2 to 16 kHz (§4). Move the slider.
3. **Vary the filter too.** Chebyshev, elliptic, Butterworth or boxcar, order 2 to 10 (§4). Otherwise a model learns one filter's edge.
4. **A speech-tuned twin.** AudioSR-Speech is fine-tuned on speech (§5). Its data and steps are not reported.
5. 🧠 **Resampling adds no band.** A 44.1 kHz clip resampled to 48 kHz still stops at 22 kHz. Such targets teach empty tops.

<p class="rd-cap">Butterworth and Chebyshev curves are computed live. Data facts are from §4.</p>

<p class="rd-take"><b>One cheap trick, random low-pass filters, turns any 48 kHz audio into training pairs.</b></p>

</article>

<article class="rd-page" id="vctk" data-part="Does it work?" data-draw="vctk" markdown>

<p class="rd-crumb"><b>Result 1</b> Our 8 kHz clip's test set, scored as on page 3.</p>

## Does it beat speech specialists?

1. **Three input bands, one speech test.** VCTK, with input cutoffs at 4, 8 and 12 kHz (Table 1).
2. **NVSR wins at 4 and 8 kHz.** LSD 0.91 and 0.81, against the general AudioSR's 1.30 and 1.11 (Table 1).
3. **Speech tuning closes most of it.** AudioSR-Speech: 1.03 and 0.82 (Table 1).
4. **At 12 kHz, a 0.01 win.** AudioSR-Speech 0.69 against NVSR's 0.70 (Table 1). Flip the toggle.
5. **NuWave trails everywhere.** 1.42, 1.36 and 1.22 (Table 1).

<p class="rd-cap">All values from Table 1. The dashed line is the vocoder floor, GT-Mel 0.64.</p>

<p class="rd-take"><b>On speech, the specialist still wins; speech-tuned AudioSR roughly ties it.</b></p>

</article>

<article class="rd-page" id="music-sound" data-part="Does it work?" data-draw="music-sound" markdown>

<p class="rd-crumb"><b>Result 2</b> Same score as page 13, on music and sound effects.</p>

## How does it do on music and sound effects?

1. **Music: best at every cutoff.** LSD 0.99, 0.74 and 0.73, against NVSR's best 1.67, 1.34 and 0.95 (Table 1).
2. **Music nears the vocoder floor.** At 8 and 16 kHz it is within 0.13 of GT-Mel's 0.61 (Table 1).
3. **Sound: best at 8 and 16 kHz.** 1.57 and 1.35 (Table 1). Flip the toggle.
4. **Sound at 4 kHz: NVSR-DNN wins.** 1.64 against AudioSR's 1.74 (Table 1).

<p class="rd-cap">All values from Table 1. Bars are grouped by input cutoff.</p>

<p class="rd-take"><b>General audio is where AudioSR pulls ahead.</b> Next: the one loss that may not be a loss.</p>

</article>

<article class="rd-page" id="ears" data-part="Does it work?" data-draw="ears" data-fast markdown>

<p class="rd-crumb"><b>Result 3</b> Revisits page 14's 4 kHz sound loss with page 3's listeners.</p>

## Can the score and the listeners disagree?

1. **One condition got a listening test.** ESC-50 sound effects at a 4 kHz cutoff, rated 1 to 5 (Table 1).
2. **NVSR-DNN has the best LSD.** 1.64, lowest of the three systems (Table 1).
3. **Listeners rate it worst.** 2.84, below even the unprocessed input's 3.01 (Table 1).
4. **AudioSR: worse LSD, far better sound.** LSD 1.74 but a score of 4.01, near GT-Mel's 4.35 (Table 1). [[4.01 | listener score, vs 2.84 for the best-LSD system]]
5. **The authors agree.** LSD may not suit sound effects (§5).

<p class="rd-cap">All values from Table 1. GT-Mel's LSD is 0.84.</p>

<p class="rd-take"><b>A lower LSD did not mean a better sound.</b> Read every LSD table with this in mind.</p>

</article>

<article class="rd-page" id="plug-in" data-part="Does it work?" data-draw="plug-in" data-fast markdown>

<p class="rd-crumb"><b>Result 4</b> Runs the machine of page 6 on generated audio.</p>

## Does it improve generated audio?

1. **Upsample three generators.** 50 AudioLDM clips, 50 MusicGen, 20 FastSpeech 2 (§4).
2. **Listeners compare pairs.** Which sounds better: without, with, or no clear difference (§4).
3. **AudioLDM: 54% prefer with.** About 24% prefer without (Fig. 1). Flip the toggle.
4. **MusicGen: smallest gain.** It already outputs 32 kHz; 27% hear no clear difference (Fig. 1, §5).
5. **FastSpeech 2: 69% prefer with.** About 17% prefer without (Fig. 1). [[69% | prefer FastSpeech 2 with AudioSR]]

<p class="rd-cap">Percentages read off Fig. 1 by us, ±1 point; the paper prints none. Rater count is not reported.</p>

<p class="rd-take"><b>Listeners clearly prefer upsampled generated audio, most of all speech.</b></p>

</article>

<article class="rd-page" id="code" data-part="Your move" data-draw="code" markdown>

<p class="rd-crumb"><b>Your move 1</b> Maps pages 6–11 to the code, pinned to commit d312fba.</p>

## Where is each part in the code?

1. 💻 **Band detection is in utils.py.** `lowpass_filtering_prepare_inference` uses a 98.5% energy point, not 99%.
2. 💻 **The recipe is one dict.** `get_basic_config`: v-prediction, cosine schedule, 10% condition dropout, guidance 3.5.
3. 💻 **Both pastes are in ddpm.py.** `mel_replace_ops` swaps mel bins; `postprocessing` swaps STFT bins after matching energy.
4. 💻 **Training code is a zip.** Posted on Google Drive in December 2024, "not carefully organized" (README).
5. 💻 **Two licenses.** Weights: Apache-2.0 (model card). Code: MIT text whose copyright line names another project.

<p class="rd-cap">We read the code but did not run it: the 6.2 GB checkpoint did not fit our free disk.</p>

<p class="rd-take"><b>Inference is clean and open; training is there but rough.</b></p>

</article>

<article class="rd-page" id="reviewer" data-part="Your move" data-draw="reviewer" markdown>

<p class="rd-crumb"><b>Your move 2</b> Checks the results of pages 13–16.</p>

## What would a careful reviewer question?

1. **How noisy are the gaps?** No error bars or seeds. The 12 kHz speech win is 0.01 LSD (Table 1).
2. **How many listened?** The rater count is not reported. Only one condition got a 1–5 score (§4, Table 1).
3. **Is the recipe in the paper?** Model size, sampling steps and guidance appear only in the code.
4. **Whose music test?** AudioStock is 100 hand-picked tracks, chosen by the authors (§4).
5. **Does it hold up elsewhere?** Others measured SigMOS 2.846 for AudioSR, below the 8 kHz input's 3.136 (found by us).
6. 🧠 **Steelman.** Open weights, the first general-audio upsampler, and clear listener preference.

<p class="rd-cap">Each answer cites the paper. Row 5 is Table 1 of arXiv 2509.17609.</p>

<p class="rd-take"><b>A useful open tool with thin evidence.</b> Trust your own ears over its tables.</p>

</article>

<article class="rd-page" id="after" data-part="Your move" data-draw="after" markdown>

<p class="rd-crumb"><b>Your move 3</b> All found by us; arXiv IDs checked on 2026-10-14.</p>

## What came after it?

1. **Before: the two parents.** NVSR (2203.14941) gave the mel-and-vocoder recipe. AudioLDM (2301.12503) gave the latent diffusion.
2. **Then: one step instead of fifty.** FlashSR (2501.10807) distills AudioSR, about 22 times faster. FLowHigh (2501.04926) uses one-step flow matching.
3. **Bridges start from the input.** A2SB (2501.11311) bridges STFTs. [AudioLBM](../2509.17609-audio-lbm/) (2509.17609) bridges waveform latents.
4. **AudioLBM beats it on speech.** High-band LSD 0.724 against AudioSR's 0.994 on VCTK (2509.17609, Table 1).
5. **Dropping the vocoder.** UniverSR (2510.00771) generates without a separate vocoder.

<p class="rd-cap">Dates are arXiv submission dates. We read abstracts; the step 4 numbers are from that paper's table.</p>

<p class="rd-take"><b>AudioSR became the baseline to beat.</b> Later work attacks its speed and its noise start.</p>

</article>

<article class="rd-page" id="verdict" data-part="Your move" data-draw="verdict" data-fast markdown>

<p class="rd-crumb"><b>Your move 4</b> Our pick for a speech-AI reader: you ship a TTS below 48 kHz.</p>

## Should you put it after your TTS?

1. **Can you download it?** Yes. Weights are on Hugging Face under Apache-2.0, and `pip install audiosr` works (README).
2. **Do listeners like it on TTS?** 69% preferred FastSpeech 2 with it; about 17% without (Fig. 1).
3. **Is it fast enough?** Real-time factor 0.948 on an A800 at 50 steps, measured by others (found by us). Offline only.
4. **Will your audio suit it?** Low-pass first: odd cutoffs, like MP3's, break it (README note).
5. 🧠 **Verdict: try it offline.** Batch your TTS output and compare by ear. Don't trust a perceptual-score model alone.

<p class="rd-cap">Speed is Table 12 of arXiv 2509.17609. Fig. 1 values are read off the plot.</p>

<p class="rd-take"><b>A free plug-in upgrade for offline TTS; too slow for live use.</b></p>

</article>

<article class="rd-page" id="q-mel" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 1</b> From page 2.</p>

## How much of the mel picture does a 4 kHz-wide input already fill?

- [ ] About 17%, its share of 0–24 kHz
- [x] About 57% of the 256 mel bins
- [ ] All of it, since resampling fills every bin

<p class="rd-take"><b>About 146 of 256 bins.</b> Mel bins crowd the low end, so 17% of the Hz axis is 57% of the bins.</p>

</article>

<article class="rd-page" id="q-ears" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 2</b> From page 15.</p>

## On ESC-50 at a 4 kHz cutoff, which system did listeners rate worst?

- [ ] AudioSR
- [x] NVSR-DNN, which had the best LSD
- [ ] The unprocessed input

<p class="rd-take"><b>NVSR-DNN: 2.84, below the raw input's 3.01.</b> It had the best LSD, 1.64 (Table 1).</p>

</article>

<article class="rd-page" id="q-flaw" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 3</b> Spot the flaw. From pages 13 and 14.</p>

## Which claim does Table 1 NOT support?

- [ ] AudioSR beats NVSR on music at every cutoff
- [x] The general AudioSR beats NVSR on speech
- [ ] AudioSR-Speech edges out NVSR at a 12 kHz cutoff

<p class="rd-take"><b>On speech, NVSR beats the general model at every cutoff.</b> Only the speech-tuned twin wins, and only at 12 kHz (Table 1).</p>

</article>
