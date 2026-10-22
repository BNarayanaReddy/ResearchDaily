---
title: "Phonon-40m Multilingual"
paper_title: "phonon-40m-multilingual (open-weight model release, built on the CALM paper)"
authors: ["Gradium"]
year: 2026
venue: "Model release: model card, config, runtime code; method from arXiv:2509.06926 (CALM)"
source: model-release
source_id: "phonon-40m-multilingual"
sources:
  - {label: "CALM paper (method)", url: "https://arxiv.org/abs/2509.06926v3", note: "Rouard et al., Continuous Audio Language Models, v3; pointers like (§4.5), (Table 3), (App. F) refer to it"}
  - {label: "Model card", url: "https://huggingface.co/gradium/phonon-40m-multilingual", note: "gated repo; card and config read at revision 1537ce4, weights not downloaded"}
  - {label: "Pocket TTS", url: "https://github.com/kyutai-labs/pocket-tts", note: "Kyutai's parent model and training recipe, read at 44cb63e; tech report and small-model blog posts"}
code: {url: "https://github.com/gradium-ai/xn-ptts", license: "MIT OR Apache-2.0", note: "Rust runtime read at 49b9033; also 🤗 Transformers gradium_phonon_tts at 360d22e; no training code; not built or run"}
model: {url: "https://huggingface.co/gradium/phonon-40m-multilingual", license: "CC BY-NC 4.0", note: "40M parameters without the codec; 74.6 MB q8 GGUF; not run by us"}
paper_type: model-release
hook: "A 40M-parameter voice that speaks five languages, starts talking 7 ms after you ask, and never picks a single token."
big_idea: "Phonon is a tiny continuous audio language model: a 9-layer transformer emits one vector per 80 ms of speech, a one-step Lagrangian self-distillation head turns noise into 32 latent numbers, and the Mimi decoder plays them, so audio streams on a phone CPU faster than real time."
goal: "Decide whether to ship Phonon as an on-device voice in an app, and which Phonon to pick."
difficulty: 3
difficulty_note: "Home turf: TTS, codecs, Mimi. New: continuous latents, flow matching, one-step heads (LSD), Gaussian temperature, latent guidance and its distillation, each on its own page. The method comes from the CALM paper; Phonon-specific facts come from the card, config and code."
date_added: 2026-10-22
tags: [Speech, TTS, Generative models, Efficiency, Multilingual]
description: "A 40M-parameter voice that speaks five languages, starts talking 7 ms after you ask, and never picks a single token."
---

<article class="rd-page" id="latents" data-part="Toolbox" data-draw="latents" data-fast markdown>

<p class="rd-crumb"><b>Toolbox 1</b> Start here. (§4.5), (Table 3), (App. F) point to the CALM paper; (§card), (§config), (§code), (§README), (§blog) to Phonon's other sources.</p>

## Why predict 32 numbers instead of codec tokens?

1. **Tokens come in stacks.** A residual codec describes each 80 ms frame with several tokens, coarse to fine (§3.1).
2. **More quality means more tokens.** Each extra codebook adds bits, and predicting them costs extra compute (§1).
3. **A VAE gives one vector instead.** 32 real numbers per frame, no quantizer (§4.1, Table 1).
4. **The vector sounds better.** Acoustic quality 66.0 for the 32-number VAE against 57.7 for 8-codebook Mimi (Table 1).
5. **And keeps phonemes apart better.** ABX error 8.1% against 9.4% (Table 1). Toggle to compare.

<p class="rd-cap">Both rows from Table 1 (12.5 Hz, speech). The token stack and vector are drawn schematically.</p>

<p class="rd-take"><b>One continuous vector per frame beats a stack of tokens on quality.</b></p>

</article>

<article class="rd-page" id="codec" data-part="Toolbox" data-draw="codec" markdown>

<p class="rd-crumb"><b>Toolbox 2</b> The vector of page 1, in Phonon's codec.</p>

## What does Phonon's codec turn speech into?

1. **24 kHz in, 12.5 frames out per second.** Each frame covers 1,920 samples: 80 ms (§config).
2. **Each frame is 32 numbers.** Mimi's encoder produces a 32-dimensional latent (§config).
3. **Gaussian, not quantized.** A KL term pulls latents toward a normal distribution (§4.1, Eq. 2).
4. **Taught to know phonemes.** The encoder is distilled from WavLM across the whole latent (§5.1).
5. **Our example takes 3 s.** About 38 frames of 32 numbers: 1,200 numbers in all. Move the slider.

<p class="rd-cap">Rates from Phonon's config.json; training details from the CALM paper. Our 3 s length is an example.</p>

<p class="rd-take"><b>Three seconds of speech is a 38 × 32 grid of real numbers.</b></p>

</article>

<article class="rd-page" id="ar-vector" data-part="Toolbox" data-draw="ar-vector" markdown>

<p class="rd-crumb"><b>Toolbox 3</b> How a language model can output page 2's vectors.</p>

## How can an autoregressive model output a vector?

1. **A backbone reads the past.** A causal transformer turns earlier frames into one context vector z (§3.3).
2. **A softmax cannot output 32 real numbers.** There is no vocabulary to pick from.
3. **So a small head samples the vector.** It learns the distribution of the next frame given z (§3.3).
4. **Diffusion heads are slow.** MAR-style heads need many denoising steps per frame (§2).
5. **CALM makes the head one step.** That is the next two pages (§4.2).

<p class="rd-cap">Structure from §3.3 and Fig. 1 of the paper; our drawing.</p>

<p class="rd-take"><b>Backbone for context, small head for sampling.</b></p>

</article>

<article class="rd-page" id="flow" data-part="Toolbox" data-draw="flow" markdown>

<p class="rd-crumb"><b>Toolbox 4</b> The head's basic tool.</p>

## What is flow matching?

1. **Mix noise and data.** A point on the path is a blend of a data sample and Gaussian noise (§3.2).
2. **Learn the velocity.** A network predicts which way the blend moves at each time (§3.2).
3. **Generate by integrating.** Start from noise and follow the predicted velocity in small steps (§3.2).
4. **Few steps go wrong.** In music, a 4-step flow head scores FAD 28.8; 100 steps reach 0.64 (Table 9). Move the slider.

<p class="rd-cap">Points are a toy 2-D example. FAD values from Table 9 (music continuation).</p>

<p class="rd-take"><b>Plain flow matching needs many steps; real-time audio cannot wait for them.</b></p>

</article>

<article class="rd-page" id="one-step" data-part="Toolbox" data-draw="one-step" data-fast markdown>

<p class="rd-crumb"><b>Toolbox 5</b> Fixes page 4's step count.</p>

## How can one step replace a hundred?

1. **Learn the jump, not the slope.** A consistency model maps noise straight to a clean sample (§3.2).
2. **LSD learns any jump.** Lagrangian self-distillation predicts the state at time s from time t, for any pair (App. A, Eq. 4).
3. **One jump: noise to data.** With t = 1 and s = 0, one call samples a frame (App. A).
4. **One step holds up.** At 1 step, consistency reaches FAD 0.83 in 16.7 s for 30 s of music, RTF 0.56 (Table 9).
5. **Phonon uses one LSD step.** Its config sets `lsd_decode_steps` to 1 (§config).

<p class="rd-cap">Equations from App. A; speed and FAD from Table 9 (music, a large model). Our drawing.</p>

<p class="rd-take"><b>A one-step head makes continuous generation as cheap as picking a token.</b></p>

</article>

<article class="rd-page" id="lsd-train" data-part="The CALM recipe" data-draw="lsd-train" markdown>

<p class="rd-crumb"><b>Recipe 1</b> How page 5's head is trained.</p>

## How is a one-step head trained?

1. **Two losses share a batch.** Flow matching on 75% of examples, LSD on the other 25% (App. A).
2. **Flow matching teaches the slope.** The head learns velocities at single times, as on page 4 (Eq. 5).
3. **LSD teaches the jump.** The jump's rate of change must equal the slope at its landing point (Eq. 6).
4. 💻 **Times skew late.** Pocket TTS draws t as sigmoid of a normal with mean 0.4 (§code samplers.py).
5. **Reuse the backbone 8 times.** Each context vector trains the head on 8 noise draws: the head batch multiplier (§4.4, Table 14).

<p class="rd-cap">Split and multiplier from the paper; time sampling from Pocket TTS's training code. Bars are schematic.</p>

<p class="rd-take"><b>The head teaches itself to jump by checking its own slopes.</b></p>

</article>

<article class="rd-page" id="temperature" data-part="The CALM recipe" data-draw="temperature" markdown>

<p class="rd-crumb"><b>Recipe 2</b> Sampling with page 5's head.</p>

## What does temperature mean for a continuous sample?

1. **Text models sharpen logits.** Lower temperature favours likely tokens.
2. **Here, shrink the starting noise.** Temperature τ sets the noise variance, so its spread is √τ (§4.5).
3. **Less spread, safer speech.** The head lands nearer typical frames, trading variety for clarity (§4.5, App. C).
4. 💻 **Phonon samples at 0.3.** Spread √0.3 ≈ 0.55 instead of 1 (§code synth.rs). Move the slider.

<p class="rd-cap">Rule from §4.5; Phonon's 0.3 from the runtime's defaults. The cloud of points is a toy.</p>

<p class="rd-take"><b>Temperature is how wide the noise starts.</b></p>

</article>

<article class="rd-page" id="latent-cfg" data-part="The CALM recipe" data-draw="latent-cfg" markdown>

<p class="rd-crumb"><b>Recipe 3</b> Guidance without a trajectory.</p>

## How do you use guidance when there is only one step?

1. **Normal guidance bends a path.** With one step there is no path to bend (§4.6).
2. **Guide the context vector instead.** Run the backbone with and without text, then push: Z∅ + α(Z_C − Z∅) (§4.6).
3. **It sharply cuts errors.** WER drops from 2.39 to 1.81 with α = 1.5 (App. E.5).
4. **Guiding the voice prompt too costs quality.** Acoustic score 56.2 against 61.1 (App. E.5). Move α.

<p class="rd-cap">Formula from §4.6; numbers from the App. E.5 ablation (300M TTS model). Arrows are a toy.</p>

<p class="rd-take"><b>Guide the vector that conditions the head, not the head's path.</b></p>

</article>

<article class="rd-page" id="distill" data-part="The CALM recipe" data-draw="distill" markdown>

<p class="rd-crumb"><b>Recipe 4</b> Removes page 8's double cost.</p>

## How does guidance become free at inference?

1. **Guidance doubles the work.** Every step needs a with-text and a without-text backbone pass (§4.7).
2. **Train a student to copy the result.** Its output must match the guided vector, by L2 loss (§4.7).
3. **The student can be smaller.** Pocket TTS distils 24 teacher layers into 6, with α = 1.5 (App. F).
4. **The head is copied, not retrained.** The teacher's sampling head is reused as it is (§4.7).
5. 💻 **Phonon runs no guidance pass.** Its runtime leaves guidance off by default (§code synth.rs).

<p class="rd-cap">Recipe from §4.7 and App. F. That Phonon was distilled the same way is not stated in its card.</p>

<p class="rd-take"><b>Guidance and depth are both distilled away before shipping.</b></p>

</article>

<article class="rd-page" id="machine" data-part="Phonon's machine" data-draw="machine" data-fast markdown>

<p class="rd-crumb"><b>Machine 1</b> Our example enters: "It sold for £3.2m."</p>

## What is the whole Phonon machine?

1. **Text becomes tokens.** Normalised text goes through a 4,001-piece SentencePiece vocabulary (§config).
2. **A voice is prepended.** About 100 stored voices, each a sequence of 512-wide frames (§card, §code).
3. **A 9-layer backbone runs per frame.** Width 512, 8 heads, one step per 80 ms (§config).
4. **Two heads read it.** An end-of-speech logit, and a 6-layer LSD head that emits 32 numbers (§config).
5. **Mimi decodes.** The codec decoder turns latents into 24 kHz audio, frame by frame (§card).

<p class="rd-cap">All sizes from config.json. Our drawing; compare the paper's Fig. 1.</p>

<p class="rd-take"><b>Text and voice in, one 32-number frame out every 80 ms.</b></p>

</article>

<article class="rd-page" id="params" data-part="Phonon's machine" data-draw="params" markdown>

<p class="rd-crumb"><b>Machine 2</b> Sizes the boxes of page 10.</p>

## Where do 40M parameters go?

1. **The backbone is most of it.** 9 layers of attention and feed-forward at width 512: about 28.3M (our arithmetic).
2. **The text table is small.** 4,001 pieces × 512 dimensions: about 2.0M (our arithmetic).
3. **The rest is heads and projections.** About 9.6M remain of the card's 40M.
4. **The decoder is extra.** The card's 40M excludes the codec; the weight file holds 50.5M in all (§card, HF metadata).

<p class="rd-cap">Our arithmetic from config.json (weights only, no biases or norms). Totals from the card and Hugging Face file metadata.</p>

<p class="rd-take"><b>A 28M transformer does most of the thinking.</b></p>

</article>

<article class="rd-page" id="normalize" data-part="Phonon's machine" data-draw="normalize" markdown>

<p class="rd-crumb"><b>Machine 3</b> The first box of page 10, on our example.</p>

## Why must you tell it the language?

1. **Symbols must become words first.** "£3.2m" has to be read as words before the model sees it (§card).
2. **The rule depends on the language.** Our English example becomes "3 point 2 million pounds" (§code preprocess.rs).
3. **A wrong language says it wrong.** German "@" must not be read the English way, so `lang` has no default (§code).
4. **Times and dates are off by default.** "1:06pm on 20/12/2015" passes through unchanged (§code preprocess.rs). Toggle the input.

<p class="rd-cap">Input and output pairs are the runtime's own test cases (preprocess.rs, commit 49b9033).</p>

<p class="rd-take"><b>Half of "reading numbers well" happens before the model.</b></p>

</article>

<article class="rd-page" id="prompt" data-part="Phonon's machine" data-draw="prompt" markdown>

<p class="rd-crumb"><b>Machine 4</b> What the backbone of page 10 reads first.</p>

## What sequence does the backbone read?

1. 💻 **Voice frames first.** One `<|audio_prompt|>` slot per voice frame, filled by a 512-to-512 projection.
2. 💻 **Then the text tokens.** Our normalised sentence follows the voice.
3. 💻 **Then a start marker.** `<|audio_bos|>` opens the generated audio.
4. **The voice state is cached.** The voice's keys and values are computed once and reused (§code).

<p class="rd-cap">Layout from the Transformers chat template and Pocket TTS code. Frame counts are illustrative.</p>

<p class="rd-take"><b>Voice, then words, then speech: one causal sequence.</b></p>

</article>

<article class="rd-page" id="voices" data-part="Phonon's machine" data-draw="voices" markdown>

<p class="rd-crumb"><b>Machine 5</b> Where page 13's voice frames come from.</p>

## Can you clone your own voice?

1. **About 100 voices ship.** They live in the `gradium/phonon-voices` repo (§card).
2. **They come from a separate speaker encoder.** Its own 8-layer Mimi variant appears in the config (§config).
3. **That encoder is not released for Transformers.** So voices cannot be cloned there (§code docs).
4. **Cloning is offered in Gradium's studio.** The card points there for cloning and voice design (§card).

<p class="rd-cap">From the card, config and the Transformers docs. Whether the Rust runtime's audio-sample path works with this checkpoint was not checked.</p>

<p class="rd-take"><b>Pick from the catalogue; cloning is a paid service.</b></p>

</article>

<article class="rd-page" id="conditions" data-part="Phonon's machine" data-draw="conditions" markdown>

<p class="rd-crumb"><b>Machine 6</b> Two hidden inputs to page 10's backbone.</p>

## What are num_speakers and duration_delta?

1. **Two conditioners in the config.** A speaker-count lookup and a continuous duration value (§config).
2. **num_speakers is a lookup.** Values 0, 1 or 2, each a 16-number embedding (§config).
3. **duration_delta is a sine embedding.** Scaled by 1,000, 128 numbers, then projected (§config, §code).
4. **Their sum joins every frame.** It is added to each generated frame's input (§code).
5. **Defaults: 1 speaker, delta 0.** Their training meaning is not documented (§code). Move the slider.

<p class="rd-cap">Sizes from config.json; use from the Transformers and runtime code. The embedding curve is computed live.</p>

<p class="rd-take"><b>Two quiet knobs ride along with every frame.</b></p>

</article>

<article class="rd-page" id="step" data-part="Phonon's machine" data-draw="step" data-fast markdown>

<p class="rd-crumb"><b>Machine 7</b> One 80 ms frame of our sentence.</p>

## What happens in one 80 ms step?

1. **Feed the last frame back.** The previous 32 numbers enter through a linear layer (§code flow_lm.py).
2. **One backbone position.** With the KV cache, only the newest position is computed (§code).
3. **Check for the end.** A linear layer gives an end-of-speech logit (§code).
4. **Draw noise.** 32 Gaussian numbers with spread √0.3 (§code).
5. **One head call.** The LSD head jumps from noise to the frame: x = ε + v(h, 0, 1, ε) (§code).

<p class="rd-cap">Order from Pocket TTS's flow_lm.py and Phonon's generation code. Values shown are made up.</p>

<p class="rd-take"><b>Each 80 ms costs one backbone position and one head call.</b></p>

</article>

<article class="rd-page" id="lsd-steps" data-part="Phonon's machine" data-draw="lsd-steps" markdown>

<p class="rd-crumb"><b>Machine 8</b> Zooms into page 16's head call.</p>

## What if you gave the head more steps?

1. 💻 **N steps split the jump.** Step k moves from time k/N to (k+1)/N: x ← x + v/N.
2. **N = 1 is one jump.** Phonon's default, and the cheapest (§config).
3. **More steps can help quality.** In the paper's music model, 4 consistency steps beat 1 on FAD, 0.71 vs 0.83 (Table 4).
4. **Too many can hurt.** Consistency FAD worsens past 10 steps: 2.05 at 100 (Table 9). Move N.

<p class="rd-cap">Update rule from the code; FAD from Tables 4 and 9 (music). Phonon does not report other step counts.</p>

<p class="rd-take"><b>Phonon spends exactly one head call per frame.</b></p>

</article>

<article class="rd-page" id="eos" data-part="Phonon's machine" data-draw="eos" markdown>

<p class="rd-crumb"><b>Machine 9</b> Ends page 16's loop.</p>

## How does it know when to stop?

1. **A logit crosses a threshold.** Phonon stops when the end logit exceeds +4.0 (§config).
2. **Then a short tail.** It keeps 1 more frame, or 3 when the text has 4 words or fewer (§config, §code).
3. **There is also a cap.** At most ⌈(tokens/3 + 2) × 12.5⌉ frames (§code plan.rs). Move the token slider.
4. **Pocket TTS uses −4.0.** Same rule, opposite sign, plus a 6-frame minimum Phonon drops (§code).

<p class="rd-cap">Thresholds and the cap formula from configs and code; the logit curve is made up.</p>

<p class="rd-take"><b>Phonon ends speech only when it is confident: the logit must clear +4.</b></p>

</article>

<article class="rd-page" id="streaming" data-part="Phonon's machine" data-draw="streaming" markdown>

<p class="rd-crumb"><b>Machine 10</b> Turns page 16's frames into sound.</p>

## How does audio start playing after 7 ms?

1. **Every frame is playable.** Mimi decodes each 80 ms frame as soon as it exists (§README).
2. **Two threads overlap.** The backbone makes frame n+1 while Mimi decodes frame n (§code synth.rs).
3. **First audio in 7 ms.** On one MacBook Air M5 core, Phonon 40m starts in 7 ms (§README).
4. **Long text is split.** Chunks of up to 50 tokens are spoken one after another (§code tts_model.rs).
5. **So prosody resets.** The card notes it does not carry across the whole text (§card).

<p class="rd-cap">Timing from the runtime README; threading and chunking from the code. Bar lengths are illustrative.</p>

<p class="rd-take"><b>Streaming makes the first sound almost instant; splitting limits long-form prosody.</b></p>

</article>

<article class="rd-page" id="quant" data-part="Phonon's machine" data-draw="quant" markdown>

<p class="rd-crumb"><b>Machine 11</b> What ships to the phone.</p>

## What do q8 and q4k change?

1. **Only the backbone's big matrices shrink.** Attention and feed-forward weights; the codec stays float (§code quantize.rs).
2. **q8 cuts the file by 39%.** 74.6 MB against 121.7 MB for the unquantised file (§card, HF metadata).
3. **q4k saves less than you'd think.** 60.4 MB, because everything else stays unquantised (HF metadata).
4. **Devices differ.** WebGPU needs q8; the Neural Engine runs the backbone in fp16 (§code).

<p class="rd-cap">File sizes from the Hugging Face file listing; rules from the runtime code.</p>

<p class="rd-take"><b>8-bit is the sweet spot; 4-bit trims only another 19%.</b></p>

</article>

<article class="rd-page" id="traps" data-part="Phonon's machine" data-draw="traps" markdown>

<p class="rd-crumb"><b>Machine 12</b> Read before you copy the config.</p>

## Which config numbers are not what they seem?

1. **`temp: 0.8` is ignored.** The runtime no longer reads it and samples at 0.3 (§code tts_model.rs, synth.rs).
2. **Transformers also uses 0.3.** Its generation config overrides the 0.8 (§config).
3. **`eos_threshold: 4.0` means plus four.** Pocket TTS defaults to −4.0; signs are not interchangeable (§code).
4. **No minimum length.** Phonon sets 0 frames before end-of-speech; Pocket TTS waits 6 (§config, §code).

<p class="rd-cap">Each value from the named file. A runtime test confirms `temp` is skipped.</p>

<p class="rd-take"><b>The config tells you the architecture, not the sampling settings.</b></p>

</article>

<article class="rd-page" id="calm-tts" data-part="Does it work?" data-draw="calm-tts" markdown>

<p class="rd-crumb"><b>Results 1</b> The paper's 300M TTS model, LibriSpeech test-clean.</p>

## Did one-step continuous TTS beat token models?

1. **Lowest word errors.** CALM with 1-step LSD: WER 1.81 against 1.95 for DSM and 2.42 for F5-TTS (Table 3).
2. **Best acoustic quality.** MUSHRA 61.1, close to real speech at 61.8 (Table 3).
3. **Weak automatic voice match.** Similarity 0.52 against 0.66–0.67 for the others (Table 3).
4. **Human raters are kinder.** Speaker Elo 1966 is above the real recording's 1953 (Table 3). Toggle the metric.

<p class="rd-cap">All values from Table 3. DiTAR and SALAD results are copied from their papers there, so their missing cells are absent here.</p>

<p class="rd-take"><b>Clearer speech than bigger models, with a voice-match question mark.</b></p>

</article>

<article class="rd-page" id="ablation" data-part="Does it work?" data-draw="ablation" markdown>

<p class="rd-crumb"><b>Results 2</b> Tests pages 5 and 8 on TTS.</p>

## Which ingredient matters most for TTS?

1. **Guidance cuts WER most.** 2.39 without, 1.81 with α = 1.5 on text (App. E.5).
2. **LSD beats plain consistency.** MUSHRA 61.1 against 46.8, at the same one step (App. E.5).
3. **Consistency also hurts voice match.** Similarity 0.40 against 0.52 (App. E.5).
4. **Guiding the voice prompt is a trade.** Similarity 0.54, but MUSHRA 56.2 (App. E.5). Toggle the metric.

<p class="rd-cap">All values from the App. E.5 ablation table (in the paper's LaTeX source; the HTML version drops it).</p>

<p class="rd-take"><b>LSD for sound, guidance for words.</b></p>

</article>

<article class="rd-page" id="speed-paper" data-part="Does it work?" data-draw="speed-paper" markdown>

<p class="rd-crumb"><b>Results 3</b> Where the time goes, in the paper's speech model.</p>

## How much faster is a one-step head?

1. **The token head took a quarter.** An 8-codebook RQ-transformer took 26.7% of inference (Table 2).
2. **The one-step head takes 2.9%.** It is 12.3 times faster than the token head (Table 2).
3. **The whole model gains 1.3×.** The 2B backbone now dominates (Table 2).
4. **Quality rises too.** Acoustic score 3.45 against 2.75, both at temperature 0.8 (Table 2).

<p class="rd-cap">From Table 2 (speech continuation, 2B backbone). Phonon's backbone is far smaller, so its split differs.</p>

<p class="rd-take"><b>Once the head is cheap, the backbone is the cost.</b> That is why Phonon's backbone is tiny.</p>

</article>

<article class="rd-page" id="pocket" data-part="Does it work?" data-draw="pocket" markdown>

<p class="rd-crumb"><b>Results 4</b> Phonon's parent, after page 9's distillation.</p>

## How good was the distilled Pocket TTS?

1. **Lowest WER, tied.** 1.84, equal to the 750M DSM (Table 12).
2. **Good audio quality.** Elo 2016, behind only Chatterbox Turbo's 2055 (Table 12).
3. **Weakest voice match.** Speaker Elo 1898, the lowest of the cloning models (Table 12).
4. **Only cloner faster than real time on CPU.** Tested on an Apple M3 and an Intel Core Ultra 7 (App. F).

<p class="rd-cap">From Table 12 (LibriSpeech test-clean, enhanced audio). Kokoro has no voice cloning, so no speaker Elo.</p>

<p class="rd-take"><b>The recipe survives shrinking: same words, slightly worse voice match.</b></p>

</article>

<article class="rd-page" id="elo" data-part="Does it work?" data-draw="elo" data-fast markdown>

<p class="rd-crumb"><b>Results 5</b> Phonon's own listening tests, per language.</p>

## Do listeners prefer Phonon?

1. **English: a close race.** Phonon-40m-en 2117, the multilingual model 2097, Kokoro 2043 (§card).
2. **French: a wide lead.** The multilingual model 2016 against NeuTTS 1853 and Kokoro 1578 (§card).
3. **German and Spanish lead too.** Multilingual 2046 and 2076; the best rival 1768 and 1870 (§card).
4. **Raters were few outside English.** 468 raters for English; 168–201 for the others (§card). Toggle the language.

<p class="rd-cap">Elo from the card's tables, run by Gradium. Kokoro has no German row.</p>

<p class="rd-take"><b>Phonon wins every language it was tested in, by the most outside English.</b></p>

</article>

<article class="rd-page" id="hardset" data-part="Does it work?" data-draw="hardset" markdown>

<p class="rd-crumb"><b>Results 6</b> Tests page 12's normaliser and the model together.</p>

## Can it read numbers, dates and codes?

1. **The hard set is full of structured data.** Numbers, dates, codes and units, scored by LLM-assisted ASR (§card).
2. **Phonon errs about 2–3% of words.** English 2.0%, French 2.7%, German 2.9% for the multilingual model (§card).
3. **Magpie fails here.** 25–30% WER, despite fine Seed-TTS scores (§card).
4. **Kokoro sits between.** 3.5–5.5% where tested (§card). Toggle the language.

<p class="rd-cap">WER from the card. The hard set and the LLM-assisted scoring are Gradium's own and not published.</p>

<p class="rd-take"><b>Structured text separates models that ordinary benchmarks call equal.</b></p>

</article>

<article class="rd-page" id="mono-multi" data-part="Does it work?" data-draw="mono-multi" data-fast markdown>

<p class="rd-crumb"><b>Results 7</b> One model for five languages, or five models?</p>

## What does one multilingual model cost?

1. **Every language loses some Elo.** The multilingual model trails each single-language Phonon (§card).
2. **English loses least.** 20 Elo points, 2117 to 2097 (§card).
3. **Portuguese loses most.** 96 points, 2144 to 2048 (§card).
4. **Errors mostly rise too.** Hard-set WER grows 0.3–0.7 points, except English, where it falls from 2.3% to 2.0% (§card).

<p class="rd-cap">Differences are our arithmetic on the card's tables.</p>

<p class="rd-take"><b>One file for five languages costs 20–96 Elo; pick the single-language model if you can.</b></p>

</article>

<article class="rd-page" id="speed" data-part="Does it work?" data-draw="speed" markdown>

<p class="rd-crumb"><b>Results 8</b> The payoff of pages 19 and 20.</p>

## How fast is it on real devices?

1. **20× real time on one laptop core.** MacBook Air M5, one core, 7 ms to first audio (§README).
2. **20× on an iPhone's Neural Engine.** iPhone 16 Pro, 12 ms to first audio (§README).
3. **Even a Raspberry Pi keeps up.** 2.2× real time on one core, 88 ms to first audio (§README).
4. **Kokoro waits for the whole sentence.** 7.3× on the same M5 core, but 776 ms to first audio (§README).

<p class="rd-cap">All values from the runtime README, measured by Gradium. Log scale on the speed axis.</p>

<p class="rd-take"><b>On-device and faster than real time, everywhere they tested.</b></p>

</article>

<article class="rd-page" id="compare" data-part="Your move" data-draw="compare" markdown>

<p class="rd-crumb"><b>Your move 1</b> Places Phonon next to <a href="../ming-3-tts-tiny/">Ming-3.0-tts-tiny</a> and <a href="../breeze-tts-2/">Breeze TTS 2</a>.</p>

## How does it compare to Ming and Breeze?

1. **All three speak in 80 ms steps.** Breeze predicts codec tokens; Ming and Phonon predict continuous latents.
2. **Ming spends 10 head steps; Phonon one.** Ming's DiT runs 10 flow steps; Phonon's head runs one LSD step.
3. **Phonon is tiny.** 40M, against Ming's 1.3B active and Breeze's 3.48B total (§config).
4. **Licences differ.** Ming is MIT; Breeze and Phonon-40m weights are non-commercial (§card).

<p class="rd-cap">Ming and Breeze facts from our lessons on them.</p>

<p class="rd-take"><b>Same 80 ms rhythm, three very different budgets.</b></p>

</article>

<article class="rd-page" id="code" data-part="Your move" data-draw="code" markdown>

<p class="rd-crumb"><b>Your move 2</b> Where to read each part.</p>

## Where is each part in the code?

1. 💻 **Python reference: Pocket TTS.** `models/flow_lm.py` samples a frame; `training/` holds the LSD recipe.
2. 💻 **Transformers integration.** `gradium_phonon_tts` reuses Pocket TTS's generate loop.
3. 💻 **Rust runtime: xn-ptts.** `flow_lm.rs`, `synth.rs` and `preprocess.rs` run, stream and normalise.
4. 💻 **No Phonon training code.** The training recipe shown is Pocket TTS's, not Phonon's.

<p class="rd-cap">Commits: pocket-tts 44cb63e, xn-ptts 49b9033, transformers 360d22e. Read, not run.</p>

<p class="rd-take"><b>Every inference path is open; how Phonon was trained is not.</b></p>

</article>

<article class="rd-page" id="reviewer" data-part="Your move" data-draw="reviewer" markdown>

<p class="rd-crumb"><b>Your move 3</b> Specific to this release.</p>

## What would a careful reviewer question?

1. **What was Phonon trained on?** Not reported in the card or code. Pocket TTS used 88k hours of English (App. D).
2. **Who ran the benchmarks?** Gradium, with its own hard set and LLM-assisted scoring (§card).
3. **Does the config match runtime?** No: temperature 0.8 is ignored (§code).
4. **Can you clone?** Not with the open files (§code docs).
5. 🧠 **Steelman: unusually measured.** Rater counts, per-language tables and device timings are all published.

<p class="rd-cap">Each row points to the card, code or paper. Row 5 is our judgement.</p>

<p class="rd-take"><b>Open to run, closed on training data.</b></p>

</article>

<article class="rd-page" id="verdict" data-part="Your move" data-draw="verdict" data-fast markdown>

<p class="rd-crumb"><b>Your move 4</b> Our pick: an offline voice inside a mobile or desktop app.</p>

## Should you ship Phonon in your app?

1. **Does it speak your language?** English, French, German, Spanish, Portuguese only; no Indic languages (§card).
2. **Is it commercial?** The 40m models are non-commercial; phonon-31m-en is Apache-2.0 (§card).
3. **Fast enough?** 20× real time on one laptop core, 12 ms to first audio on an iPhone (§README).
4. **Need a custom voice?** Only the ~100 catalogue voices are open (§card).
5. 🧠 **Verdict: yes for English products, via 31m-en.** Use the 40m models for research or non-commercial apps.

<p class="rd-cap">From the card's family table and the runtime README.</p>

<p class="rd-take"><b>The best open on-device voice for five languages, if non-commercial terms fit.</b></p>

</article>

<article class="rd-page" id="q-temp" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 1</b> From pages 7 and 21.</p>

## At Phonon's real sampling temperature, what is the noise's spread?

- [ ] 0.8, from the config
- [ ] 0.3, the temperature itself
- [x] About 0.55, the square root of 0.3
- [ ] 1, temperature does not apply to continuous noise

<p class="rd-take"><b>√0.3 ≈ 0.55.</b> Temperature sets the variance (§4.5), and the runtime samples at 0.3, not the config's 0.8 (§code).</p>

</article>

<article class="rd-page" id="q-calls" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 2</b> From pages 16 and 17.</p>

## How many head calls does one second of Phonon speech take?

- [ ] 1
- [x] 12.5
- [ ] 125, ten per frame
- [ ] 24,000, one per sample

<p class="rd-take"><b>12.5.</b> One frame per 80 ms, and one LSD step per frame (§config).</p>

</article>

<article class="rd-page" id="q-eos" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 3</b> From pages 18 and 21.</p>

## You port Phonon's checkpoint to Pocket TTS's loop with its default threshold of −4.0. What is the risk?

- [ ] It never stops talking
- [x] It may stop too early: any logit above −4 ends speech
- [ ] Nothing; the sign is ignored
- [ ] It skips the voice prompt

<p class="rd-take"><b>Early stops.</b> Phonon expects the logit to clear +4.0 (§config). A −4.0 bar is far easier to clear.</p>

</article>

<article class="rd-page" id="q-multi" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 4</b> From page 28. Spot the flaw.</p>

## "The multilingual model is as good as the single-language ones." What's wrong?

- [ ] It is better in every language
- [x] It trails each single-language model by 20–96 Elo
- [ ] It was never compared to them
- [ ] It only speaks English

<p class="rd-take"><b>It trails each one.</b> English loses 20 Elo points and Portuguese 96 (§card).</p>

</article>
