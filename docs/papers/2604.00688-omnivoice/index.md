---
title: "OmniVoice"
paper_title: "OmniVoice: Towards Omnilingual Zero-Shot Text-to-Speech with Diffusion Language Models"
authors: ["Han Zhu", "Lingxuan Ye", "Wei Kang", "Zengwei Yao", "Liyong Guo", "Fangjun Kuang", "Zhifeng Han", "Weiji Zhuang", "Long Lin", "Daniel Povey"]
year: 2026
venue: "arXiv preprint"
arxiv_id: "2604.00688"
arxiv_version: v3
code: {url: "https://github.com/k2-fsa/OmniVoice", license: "Apache-2.0", note: "inference, training, LoRA fine-tuning and evaluation code; read at commit 08be0b4, not run"}
model: {url: "https://huggingface.co/k2-fsa/OmniVoice", license: "CC-BY-NC per model card; audio tokenizer under the Boson Higgs Audio 2 Community License", note: "card and config read at revision c5fdb5c; not run by us"}
paper_type: method
hook: "One 0.8B model clones a voice in 646 languages, and half of them had about ten hours of training audio or less."
big_idea: "Treat TTS as fill-in-the-blanks on a grid of codec tokens: a bidirectional transformer, started from a text LLM, unmasks all eight codebooks together in 32 passes, after training that hides random cells across every codebook."
goal: "Decide whether to use OmniVoice for Telugu voice cloning."
difficulty: 3
difficulty_note: "Home turf: TTS, codecs, zero-shot cloning. New: masked discrete diffusion, its decoding schedule and guidance, each on its own page."
date_added: 2026-10-14
tags: [Speech, TTS, Multilingual, Generative models, Diffusion]
description: "One 0.8B model clones a voice in 646 languages, and half of them had about ten hours of training audio or less."
---

<article class="rd-page" id="tokens" data-part="Toolbox" data-draw="tokens" data-fast markdown>

<p class="rd-crumb"><b>Toolbox 1</b> Start here. Running example: a 3-second voice prompt, then 10 seconds of new speech.</p>

## How does 10 seconds of speech become a grid of whole numbers?

1. **A codec slices time into frames.** OmniVoice uses the Higgs audio tokenizer (§3.2). Its config hops 960 samples at 24 kHz: 25 frames per second.
2. **Each frame gets eight codes.** Eight codebooks each pick one of 1,024 entries (§3.2). A frame becomes a column of eight integers.
3. **The rows are not treated equally.** Decoding is nudged to fill lower codebooks first (§3.4). The training code also weights low rows more.
4. **Our target is a 250 × 8 grid.** Ten seconds is 250 frames, so 2,000 tokens to generate. Move the slider for other lengths. [[2,000 | tokens in 10 s of speech]]
5. **The codec turns the grid back into sound.** The same tokenizer decodes the finished grid into a 24 kHz waveform (§3.2).

<p class="rd-cap">Frame rate and codebook size are from the tokenizer config on Hugging Face. The waveform and codes are made up.</p>

<p class="rd-take"><b>Speech becomes 25 columns of eight integers per second.</b> TTS here means filling that grid.</p>

</article>

<article class="rd-page" id="maskgen" data-part="Toolbox" data-draw="maskgen" data-fast markdown>

<p class="rd-crumb"><b>Toolbox 2</b> Uses the token grid from page 1.</p>

## How can a model write every token at once?

1. **Start with every cell blank.** All target cells hold a special mask token, [M] (§2.1).
2. **Guess every blank in one pass.** A bidirectional transformer predicts a token for each masked cell at the same time (§2.1).
3. **Keep only the surest guesses.** A few cells are filled and the rest stay [M]. Filled cells become context for the next pass (§3.4).
4. **Repeat a fixed number of passes.** OmniVoice uses 32 passes at any length (§3.4). A frame-by-frame autoregressive model would need 250 for our clip.
5. **Train by hiding a random share.** Each example hides a share drawn uniformly from 0 to 1 (§2.1.1). This is the **masked diffusion** recipe of diffusion language models (§1).

<p class="rd-cap">One second (25 frames) of the grid. The fill order here is illustrative; page 14 gives the real schedule.</p>

<p class="rd-take"><b>Repeated fill-in-the-blanks is the whole generator.</b> Next: why earlier token models split this into two stages.</p>

</article>

<article class="rd-page" id="stages" data-part="Toolbox" data-draw="stages" markdown>

<p class="rd-crumb"><b>Toolbox 3</b> Uses the masked filling from page 2.</p>

## Why did earlier token TTS models use two stages?

1. **Fast TTS comes in two kinds.** Non-autoregressive models predict either continuous features, like F5-TTS and ZipVoice, or discrete tokens (§1).
2. **The token kind often used two stages.** MaskGCT maps text to semantic tokens, then semantic tokens to acoustic tokens (§1).
3. **Errors pass down the chain.** A wrong semantic token spoils the audio built from it: **error propagation** (§1).
4. **Semantic tokens drop detail.** They are low-bitrate, so fine acoustic detail is lost: an **information bottleneck** (§1).
5. **Single-stage models lagged.** Earlier one-stage token models trailed on intelligibility (§1). OmniVoice maps text straight to acoustic tokens (§2.1).

<p class="rd-cap">Model families and the two drawbacks are as the paper describes them (§1). Our drawing.</p>

<p class="rd-take"><b>OmniVoice bets on one stage, so it must fix intelligibility.</b> Pages 7 and 10 are the two fixes.</p>

</article>

<article class="rd-page" id="machine" data-part="The machine" data-draw="machine" data-fast markdown>

<p class="rd-crumb"><b>Machine 1</b> Our 3 s prompt and 10 s target enter here.</p>

## What is the whole machine?

1. **Text and audio share one sequence.** Text tokens Y (instruction and transcript) come first, then the acoustic grid X (§2.1).
2. **The grid has a prompt and a target.** Our 3 s prompt is 75 known frames. The 10 s target is 250 masked frames (§2.1).
3. **Eight codes become one vector.** Each frame's eight token embeddings are summed into one input position (§2.1).
4. **A bidirectional transformer reads everything.** Its 28 layers start from the Qwen3-0.6B language model (§3.2). Every position sees every other.
5. **Eight heads predict eight codes.** One head per codebook outputs a distribution over that codebook's entries (§2.1). [[0.8B | parameters, all parts (Table 1)]]

<p class="rd-cap">Layer count from the model's config.json; parameters from Table 1. Our drawing; the paper's is Fig. 1.</p>

<p class="rd-take"><b>One transformer: text and prompt in, acoustic tokens out.</b> The next pages take each box apart.</p>

</article>

<article class="rd-page" id="reads" data-part="The machine" data-draw="reads" markdown>

<p class="rd-crumb"><b>Machine 2</b> Zooms into the input sequence from page 4.</p>

## What does the model read, token by token?

1. 💻 **Style tokens open the sequence.** A language tag like `te`, then an instruction slot. Unused slots read None.
2. 💻 **Both transcripts share one text block.** The prompt's transcript and the new sentence are joined by a space.
3. **Then the prompt audio.** Our 75 prompt frames enter as known tokens. They carry the voice (§2.1).
4. **Then 250 masked frames.** The target length is set before decoding starts (§3.4, Eq. 4).
5. **Voice design drops the prompt.** The instruction holds attributes like "female, low pitch" instead (§2.3.2). Toggle the mode.
6. **Extra tags steer the output.** `<|denoise|>` asks for clean speech from a noisy prompt (§2.3.1). Tags like `[laughter]` add sounds (§2.3.3).

<p class="rd-cap">Token layout from the code (`_prepare_inference_inputs`, commit 08be0b4). The sentences are ours.</p>

<p class="rd-take"><b>Language, instruction, text and audio sit in one sequence.</b> The transformer reads all of it at once.</p>

</article>

<article class="rd-page" id="embed" data-part="The machine" data-draw="embed" markdown>

<p class="rd-crumb"><b>Machine 3</b> Opens the "sum" box from page 4.</p>

## How do eight tokens become one vector?

1. 💻 **One table holds every codebook.** It has 8 × 1,025 rows: 1,024 codes plus the mask token, per codebook.
2. 💻 **Each codebook gets an offset.** Codebook c's token id is shifted by c × 1,025, so codebooks never share rows.
3. **The eight vectors are summed.** One frame becomes one 1,024-wide vector, the size of one text token (§2.1).
4. 💻 **Text positions skip this.** They use the language model's own text embedding instead.
5. 💻 **One linear layer reads out.** It maps each 1,024-wide state to 8 × 1,025 logits, split into eight distributions (§2.1).

<p class="rd-cap">Sizes from config.json and the code (`_prepare_embed_inputs`). Token ids are made up.</p>

<p class="rd-take"><b>A frame costs one position, not eight.</b> So 10 s of speech is only 250 positions.</p>

</article>

<article class="rd-page" id="mask" data-part="The machine" data-draw="mask" data-fast markdown>

<p class="rd-crumb"><b>Machine 4</b> Training. Uses the grid from page 1.</p>

## Which tokens does training hide?

1. 💻 **Up to 30% stays as prompt.** The code picks a prompt share from 0 to 0.3. Prompt frames stay visible and earn no loss.
2. **Draw one masking rate per example.** The rate p is drawn uniformly between 0 and 1 (§2.1.1). Move the slider.
3. **Every cell flips its own coin.** Each target cell, in every codebook, is masked with probability p (§2.1.1).
4. **Loss lands on masked cells only.** Visible cells are context (Eq. 1). At p = 0.5, about 1,000 of our 2,000 cells train.
5. **On average, half the cells train.** Because p averages 0.5 over examples (§2.1.1). This is **full-codebook random masking**.

<p class="rd-cap">The rule and the 0–1 range are real (§2.1.1); the prompt range is from the training config. Cells are a seeded random draw.</p>

<p class="rd-take"><b>Every example trains all eight codebooks at once.</b> Next: what the older recipe did instead.</p>

</article>

<article class="rd-page" id="perlayer" data-part="The machine" data-draw="perlayer" markdown>

<p class="rd-crumb"><b>Machine 5</b> Compares against page 7's masking.</p>

## Why not mask one codebook at a time, like MaskGCT?

1. **Older recipes pick one layer.** Per-layer masking chooses one codebook per example, as in SoundStorm and MaskGCT (§2.1.1).
2. **Lower layers stay visible.** Rows below the chosen one are given, which matches layer-by-layer decoding (§2.1.1).
3. **Higher layers are hidden but ignored.** Rows above it are fully masked, yet left out of the loss (§2.1.1).
4. **Loss lands on one row.** Only that row's masked cells train: about 125 of our 2,000 at p = 0.5.
5. **Full-codebook masking trains every row.** About 1,000 cells train: C = 8 times more per example (§2.1.1). [[8× | more cells in the loss]]

<p class="rd-cap">Rules from §2.1.1. Counts are our arithmetic for p = 0.5 on 2,000 cells.</p>

<p class="rd-take"><b>Same data, eight times the training signal per example.</b> Page 18 shows what that buys.</p>

</article>

<article class="rd-page" id="loss" data-part="The machine" data-draw="loss" markdown>

<p class="rd-crumb"><b>Machine 6</b> Scores the masked cells from page 7.</p>

## What exactly does the loss add up?

1. **Cross-entropy on each masked cell.** For each masked cell (t, c), the loss is −log P of the true token (Eq. 1).
2. **The paper writes a plain sum.** Eq. 1 adds every masked cell, so every codebook counts the same (Eq. 1).
3. 💻 **The code averages each row first.** It takes the mean loss within each of the eight codebooks.
4. 💻 **Then it weights the rows.** Weights 8, 8, 6, 6, 4, 4, 2, 2 are normalised: 0.20 for the first rows, 0.05 for the last.
5. 💻 **These weights are code-only.** They sit in config.json and the training config. The paper does not mention them.

<p class="rd-cap">Weights from the model's config.json and `training/config.py`. Eq. 1 is the paper's.</p>

<p class="rd-take"><b>In the code, low codebooks count four times more than the top ones.</b> 0.20 against 0.05.</p>

</article>

<article class="rd-page" id="llm" data-part="The machine" data-draw="llm" markdown>

<p class="rd-crumb"><b>Machine 7</b> The second fix promised on page 3.</p>

## Why start from a text LLM that never heard audio?

1. **One-stage token TTS was hard to understand.** Earlier single-stage models had weaker intelligibility (§2.1.2).
2. **Copy Qwen3-0.6B's weights.** The backbone has the same shape as an autoregressive LLM, so weights load directly (§2.1.2, §3.2).
3. **Drop the causal mask.** The LLM learned left to right; here every position sees all others. The knowledge still transfers (§2.1.2).
4. **Keep its tokenizer too.** Subword text tokens replace grapheme-to-phoneme rules and per-language normalisation (§2.2).
5. 💻 **Only the audio parts start fresh.** Audio embeddings and audio heads are new layers outside the LLM.

<p class="rd-cap">The attention pattern is a schematic. Which parts are reused comes from the paper and the code.</p>

<p class="rd-take"><b>The LLM brings reading skill; audio is learned on top.</b> Page 18 measures the gain.</p>

</article>

<article class="rd-page" id="data" data-part="The machine" data-draw="data" markdown>

<p class="rd-crumb"><b>Machine 8</b> What all this is trained on.</p>

## Where do 581k hours in 646 languages come from?

1. **Fifty open datasets.** Emilia, Common Voice, FLEURS, IndicVoices-R and more; no in-house data (App. A).
2. **Cleaned before training.** A restoration model repairs degraded audio. Rule-based filters drop bad transcripts (§2.2).
3. **English alone is 35%.** It has 206,061 of the 581,489 hours (Table 11).
4. **Ten languages hold 84%.** Each has over 10,000 hours. The median language has 10.2 hours (our count, Table 11).
5. **265 languages have under 10 hours.** Telugu has 230 hours (Table 11).

<p class="rd-cap">All 646 languages from Table 11 (App. D), sorted by hours. Shares and counts are our arithmetic.</p>

<p class="rd-take"><b>Most languages are a sliver of a huge pile.</b> Next: how training reaches them.</p>

</article>

<article class="rd-page" id="resample" data-part="The machine" data-draw="resample" markdown>

<p class="rd-crumb"><b>Machine 9</b> Uses the hours from page 11.</p>

## How does a 10-hour language get heard at all?

1. **Repeat small languages.** Each language i gets a repetition factor \(r_i\) (Eq. 2).
2. **Less data, more repeats.** \(r_i = \max(1, \mathrm{round}((D_{max}/D_i)^{1-\beta}))\). \(D_{max}\) is English's 206,061 hours (Eq. 2).
3. **β sets the strength.** β = 1 keeps the raw mix and β = 0 evens it out. They use 0.8 (§2.2). Move the slider.
4. **At 0.8, Telugu repeats 4 times.** A 10-hour language repeats 7 times; the smallest one, 25 (our arithmetic).
5. **Small languages gain share.** Languages under 100 hours rise from 1.2% to 5.4% of training audio. English falls from 35% to 24% (our arithmetic).

<p class="rd-cap">Eq. 2 applied to the Table 11 hours; shares are our arithmetic. The repo's data config takes a per-language `repeat` count.</p>

<p class="rd-take"><b>β = 0.8 tilts the mix gently toward small languages.</b> English still dominates.</p>

</article>

<article class="rd-page" id="length" data-part="The machine" data-draw="length" markdown>

<p class="rd-crumb"><b>Machine 10</b> Sets the 250 masked frames from page 5.</p>

## How does it know how long to speak?

1. **Length is fixed before decoding.** The target grid needs a size before any cell is filled (§3.4).
2. 💻 **Each character has a weight.** A Latin letter is 1, a Chinese character 3, an Indic letter 1.8, a space 0.2.
3. **Scale by the prompt's pace.** Target length = prompt length × target weight ÷ prompt weight (Eq. 4).
4. 💻 **Vowel signs weigh nothing.** Telugu నమస్కారం counts five letters at 1.8, so 9.0. Its three combining marks count 0.
5. 💻 **Short outputs get stretched.** Below 50 frames (2 s), the code boosts the estimate along a cube-root curve.

<p class="rd-cap">Weights and rules from `utils/duration.py` (commit 08be0b4). The sentences are ours; the arithmetic is live.</p>

<p class="rd-take"><b>Length comes from counting weighted letters, not from the network.</b> The speech must then fit that grid.</p>

</article>

<article class="rd-page" id="schedule" data-part="The machine" data-draw="schedule" data-fast markdown>

<p class="rd-crumb"><b>Machine 11</b> Decoding the 2,000 blanks from page 1.</p>

## In what order does decoding fill the 2,000 blanks?

1. **Thirty-two passes of uneven size.** The share filled after pass n follows Eq. 3, with N = 32 and τ = 0.1 (§3.4).
2. **The start is cautious.** Pass 1 fills 7 of our 2,000 cells. After 16 passes only 189 are filled, 9% (our arithmetic).
3. **The end is bold.** The last pass alone fills 473 cells, about a quarter. Move the slider through the passes.
4. 🧠 **Big fills wait for context.** Toggle τ = 1 for even steps of about 63 cells. Small τ fills most cells once much is known.
5. **Fewer passes cost accuracy.** LibriSpeech-PC WER is 1.28 at 64 passes, 1.30 at 32, 1.50 at 16, 2.02 at 8 (Table 9).
6. **Fewer passes run faster.** Real-time factor is 0.0598 at 32 passes and 0.0319 at 16, batch 1 (Table 8).

<p class="rd-cap">Eq. 3 and its constants are real (§3.4). Per-pass counts follow the code's rounding on 2,000 cells.</p>

<p class="rd-take"><b>Most of the grid is filled in the last few passes.</b> Next: how each guess is sharpened.</p>

</article>

<article class="rd-page" id="cfg" data-part="The machine" data-draw="cfg" markdown>

<p class="rd-crumb"><b>Machine 12</b> Runs inside every pass from page 14.</p>

## How does guidance sharpen each guess?

1. 💻 **Run two copies per pass.** One sees text and prompt. The other sees only the target cells.
2. 💻 **Training makes the second copy work.** 10% of examples drop text and prompt, so the model also learns unconditioned speech.
3. **Push away from the plain guess.** Log-probabilities become c + w(c − u), with w = 2 (§3.4). This is **classifier-free guidance**.
4. **Text-backed tokens grow.** Move w: the token the text supports gains probability, and generic ones shrink.
5. 💻 **Then renormalise.** The result goes through log-softmax again, so it is a distribution.

<p class="rd-cap">Formula and w = 2 are real (§3.4, code). The four-token probabilities are made up.</p>

<p class="rd-take"><b>Guidance amplifies what the text adds over generic speech.</b></p>

</article>

<article class="rd-page" id="pick" data-part="The machine" data-draw="pick" markdown>

<p class="rd-crumb"><b>Machine 13</b> Chooses the k cells each pass on page 14 fills.</p>

## Which blanks get filled at each pass?

1. **Score each blank by confidence.** A cell's score is its top log-probability after guidance (§3.4).
2. **Penalise higher codebooks.** A layer penalty favours low rows (§3.4). The code subtracts 5 per layer index, so row 8 loses 35.
3. **Add noise at temperature 5.** Gumbel noise on the scores divided by 5 randomises positions a little (§3.4).
4. **Fill the top k.** k comes from the schedule; filled cells are excluded (§3.4).
5. **Tokens are plain argmax.** Positions are sampled, but each filled token is the most probable one (§3.4).

<p class="rd-cap">Rules from §3.4; penalty 5 and temperature 5 from the code. Scores and noise are made up (seeded).</p>

<p class="rd-take"><b>Low codebooks tend to fill first, with some randomness in where.</b></p>

</article>

<article class="rd-page" id="same-data" data-part="Does it work?" data-draw="same-data" markdown>

<p class="rd-crumb"><b>Results 1</b> English, zero-shot cloning on LibriSpeech-PC test-clean.</p>

## Does it beat models trained on the same data?

1. **Same data, three rivals.** OmniVoice-Emilia trains on the 100k-hour Emilia set, like F5-TTS, ZipVoice and MaskGCT (Table 1, §3.1).
2. **Lowest word error rate.** 1.57% against ZipVoice's 1.64% and MaskGCT's 2.26% (Table 1).
3. **Closest voice match.** Speaker similarity is 0.697, above MaskGCT's 0.691 (Table 1). Toggle the metric.
4. **The full model goes further.** Trained on 581k multilingual hours: 1.30% WER and 0.729 similarity (Table 1).
5. **Listeners agree, within error bars.** CMOS 0.44 ± 0.16 against Qwen3-TTS's 0.40 ± 0.16 (Table 2).

<p class="rd-cap">Numbers from Table 1 (LibriSpeech-PC) and Table 2. Grey bars are the other models.</p>

<p class="rd-take"><b>On equal data it is the best non-autoregressive model here.</b> Next: which design choice earns that.</p>

</article>

<article class="rd-page" id="ablations" data-part="Does it work?" data-draw="ablations" markdown>

<p class="rd-crumb"><b>Results 2</b> Tests pages 7, 8 and 10. All runs: Emilia data, 300k updates (§4.3).</p>

## Which design choice matters most?

1. **Masking: full-codebook wins.** WER 1.57% against 3.00% for SoundStorm-style and 2.04% for MaskGCT-style masking (Table 5).
2. **Loss on all rows matters.** Same masking, but loss on one codebook: WER rises to 2.85% (Table 5).
3. **LLM start: a big drop.** Random initialisation gets 2.79% WER on LibriSpeech-PC; the LLM start gets 1.57% (Table 6).
4. **Tuning can't close the gap.** The best of four learning rates still gives 2.52% (Table 6). Toggle the test set.
5. **Denoising trades similarity for quality.** With `<|denoise|>` training, UTMOS rises 4.23 to 4.32, and similarity falls 0.697 to 0.668 (Table 7).

<p class="rd-cap">All values from Tables 5–7, LibriSpeech-PC test-clean unless toggled.</p>

<p class="rd-take"><b>Both fixes matter: each removes 0.5 to 1.4 points of WER.</b></p>

</article>

<article class="rd-page" id="commercial" data-part="Does it work?" data-draw="commercial" markdown>

<p class="rd-crumb"><b>Results 3</b> The 24-language MiniMax benchmark, open data against paid systems.</p>

## Does it hold up against commercial systems?

1. **Lower average error.** Mean WER is 2.85% against 3.77% for MiniMax-Speech and 10.95% for ElevenLabs Multilingual v2 (Table 3).
2. **Best voice match everywhere.** Its speaker similarity is the highest in all 24 languages (Table 3).
3. **WER wins are fewer.** It has the lowest WER in 8 of 24 languages (our count, Table 3).
4. **Outliers pull the average.** ElevenLabs scores 73.9% on Thai and 73.4% on Vietnamese (Table 3).
5. **Cantonese is an ASR problem.** 17.7% with Whisper drops to 2.27% with SenseVoice-Small (§4.2).

<p class="rd-cap">All values from Table 3. The per-language win count is ours.</p>

<p class="rd-take"><b>A clear win on voice match; error rate is close, language by language.</b></p>

</article>

<article class="rd-page" id="lowres" data-part="Does it work?" data-draw="lowres" data-fast markdown>

<p class="rd-crumb"><b>Results 4</b> Joins per-language CER (App. C) with training hours (App. D).</p>

## Does it work in languages with 10 hours of data?

1. **102 languages, real recordings as reference.** FLEURS-102 is built by the authors; CER comes from Omnilingual ASR (§3.4.1, §3.5).
2. **Lower average error than the recordings.** Mean CER is 4.00% against 5.11% for the real speech (Table 4).
3. **Small languages mostly do well.** Of 33 languages with under 20 hours, 21 have CER at or below 5% (our count, App. C, D).
4. **Some fail.** Lao reaches 25.5% with 7.6 hours, and Yoruba 21.4% (App. C). Cantonese is 21.9% despite 13,302 hours.
5. **Beating real speech is a warning.** The authors say quality now exceeds what the ASR can measure (§4.2).

<p class="rd-cap">Each dot is one FLEURS language: hours from Table 11, CER from Table 10. The paper's version is Fig. 4.</p>

<p class="rd-take"><b>Ten hours is often enough to be understood.</b> The ASR judge is now the weak link.</p>

</article>

<article class="rd-page" id="code" data-part="Your move" data-draw="code" markdown>

<p class="rd-crumb"><b>Your move 1</b> Maps the machine pages to the code at commit [08be0b4](https://github.com/k2-fsa/OmniVoice/tree/08be0b4ccbac3e13e374e86fbfead4b4cac343e2).</p>

## Where is each part in the code?

1. 💻 **Masking lives in the data processor.** `data/processor.py` draws the prompt share and the mask rate, and sets loss labels.
2. 💻 **The model is one file.** `models/omnivoice.py` has the summed embeddings, the weighted loss and the 32-pass decoder.
3. 💻 **Length has its own module.** `utils/duration.py` holds the script weights from page 13.
4. 💻 **Training is included.** Full training and LoRA fine-tuning configs ship in `examples/config`, with docs.
5. 💻 **Some numbers are code-only.** Codebook weights, the penalty value 5, prompt share 0–30% and 10% dropout are not in the paper.

<p class="rd-cap">We read the code; we did not install or run it.</p>

<p class="rd-take"><b>The whole recipe is open: data prep, training, fine-tuning and evaluation.</b></p>

</article>

<article class="rd-page" id="reviewer" data-part="Your move" data-draw="reviewer" markdown>

<p class="rd-crumb"><b>Your move 2</b> Specific to this paper, with pointers.</p>

## What would a careful reviewer question?

1. **Ablations are bilingual only.** Every design test uses Emilia's Chinese and English, not the 646-language setting (§4.3).
2. **The multilingual judge is an ASR.** No listening test outside Chinese and English (Table 2). Urdu's real recordings score 80.3% CER (App. C).
3. **Rivals' data differs in Table 1.** Only the NAR rows share Emilia; the AR rivals used 55k to 5,000k hours (Table 1).
4. **The code has extra knobs.** Loss weights and penalty values are in the code, not the paper (page 21).
5. 🧠 **Steelman: it is reproducible.** Open data, open code, and 9.66 days on 8 H800 GPUs (§3.3, App. A).

<p class="rd-cap">Each row points to the paper or code. Row 5 is our judgement.</p>

<p class="rd-take"><b>Claims are well supported on Chinese and English; elsewhere they rest on ASR scores.</b></p>

</article>

<article class="rd-page" id="verdict" data-part="Your move" data-draw="verdict" data-fast markdown>

<p class="rd-crumb"><b>Your move 3</b> Our pick for a speech engineer: cloning voices in Telugu.</p>

## Should you use OmniVoice for Telugu voice cloning?

1. **Telugu is in training.** 230 hours (Table 11), from sources including IndicVoices-R, IndicTTS and Rasa (App. A).
2. **The ASR test looks good.** FLEURS Telugu CER is 3.77%, real speech scores 4.51% (App. C). No listening test (Table 2).
3. **Prompt in Telugu.** A cross-lingual prompt carries its accent, so use a 3–10 s same-language clip (README).
4. **Fine-tuning is supported.** LoRA and full fine-tuning recipes ship with the code (docs).
5. **Check the licence first.** Weights are CC-BY-NC (model card). Commercial products are ruled out.
6. 🧠 **Verdict: a strong research baseline.** Test it on your Telugu prompts, and listen yourself: page 20 shows ASR scores can mislead.

<p class="rd-cap">Numbers from Tables 10–11 and App. A; README and model card at the pinned versions.</p>

<p class="rd-take"><b>Use it for research and prototypes; the licence blocks commercial use.</b></p>

</article>

<article class="rd-page" id="q-tokens" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 1</b> From pages 1 and 6.</p>

## How many positions does 10 seconds of target speech take in the transformer?

- [ ] 2,000, one per token
- [x] 250, one per frame
- [ ] 240,000, one per sample
- [ ] 8, one per codebook

<p class="rd-take"><b>250 positions.</b> 25 frames per second gives 250 frames. Each frame's eight token embeddings are summed into one position (§2.1); the grid itself still holds 2,000 tokens.</p>

</article>

<article class="rd-page" id="q-schedule" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 2</b> From page 14.</p>

## After 16 of 32 passes, roughly how much of the grid is filled?

- [ ] About half, since half the passes are done
- [x] About 9%
- [ ] About 75%, since early passes do the most
- [ ] It depends only on the text

<p class="rd-take"><b>About 9%.</b> With τ = 0.1, Eq. 3 gives 0.1 × 0.5 ÷ (1 − 0.9 × 0.5) ≈ 0.091 (§3.4). Most cells are filled in the last passes.</p>

</article>

<article class="rd-page" id="q-fleurs" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 3</b> From page 20. Spot the flaw.</p>

## OmniVoice's CER beats real recordings in 77 of 102 languages. What does that show?

- [ ] Its speech is clearer than real human speech
- [x] The ASR judge struggles with the real recordings, so it can't separate them from good synthesis
- [ ] FLEURS recordings are mislabelled
- [ ] OmniVoice memorised the FLEURS test set

<p class="rd-take"><b>The judge is the limit.</b> The authors say OmniVoice's quality has exceeded what current ASR can measure (§4.2). The 77 is our count from App. C, where Urdu's real speech scores 80.3% CER.</p>

</article>
