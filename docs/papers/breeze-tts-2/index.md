---
title: "Breeze TTS 2"
paper_title: "Breeze TTS 2 (open-weight model release, no paper)"
authors: ["BreezeBlue"]
year: 2026
venue: "Model release: code, model card and blog post"
source: model-release
source_id: "breeze-tts-2"
sources:
  - {label: "Blog", url: "https://breezeblue.ai/breeze-tts-2", note: "vendor post, Aug 7 2026: benchmarks, latency, languages"}
code: {url: "https://github.com/breezeblue-ai/breeze-tts", license: "Apache-2.0", note: "inference only, read at commit 58ec70c; no training code"}
model: {url: "https://huggingface.co/BreezeBlue/Breeze-TTS-2", license: "BreezeBlue Research and Non-Commercial", note: "read at revision 3e28c51; 3.48B parameters by our count; too big for our 6 GB GPU, so we ran only its tokenizer"}
paper_type: model-release
hook: "A streaming TTS model that tops the open-weight leaderboard ships with code and weights but no paper. The code still tells you exactly how it works."
big_idea: "Breeze TTS 2 is a CSM-style speech language model: a text encoder reads the words, a 1.4B backbone predicts one codec code per 80 ms frame, and a small depth decoder fills in the other 15, with classifier-free guidance to push instructions harder."
goal: "Decide whether to build a real-time voice agent on Breeze TTS 2, possibly for Indian languages."
difficulty: 2
difficulty_note: "Home turf: codecs, TTS, streaming. New: the two-level backbone/depth-decoder split and classifier-free guidance on token logits. No paper, so every claim points to the code, config, README, card or blog."
date_added: 2026-10-11
tags: [Speech, TTS, Generative models, Efficiency]
description: "A streaming TTS model that tops the open-weight leaderboard ships with code and weights but no paper. The code still tells you exactly how it works."
---

<article class="rd-page" id="codec-tokens" data-part="Toolbox" data-draw="tokens" data-fast markdown>

<p class="rd-crumb"><b>Toolbox 1</b> Start here. No paper exists, so pointers name the source: (§config), (§code), (§README), (§card), (§blog).</p>

## How does speech become tokens a language model can predict?

1. **A codec chops audio into frames.** Breeze's audio tokenizer makes one frame every 80 ms: 1,920 samples at 24 kHz (§config).
2. **Each frame becomes 16 numbers.** Every frame is 16 codebook entries, each one of 2,048 choices (§config).
3. **We ran it on a real clip.** A 23.764 s recording came out as 298 frames of 16 codes: 12.54 frames a second. [[298 × 16 | codes for a 23.764 s clip (our run)]]
4. **That is a tiny bitrate.** 16 codes × 11 bits × 12.5 frames is 2,200 bits per second (our arithmetic). Move the slider.

<p class="rd-cap">Frame rate and codebook sizes are real (§config). The 298 × 16 result is our CPU run of the bundled tokenizer; the waveform is illustrative.</p>

<p class="rd-take"><b>Speech becomes 12.5 frames of 16 tokens per second.</b> Next: why one frame needs 16 tokens.</p>

</article>

<article class="rd-page" id="rvq" data-part="Toolbox" data-draw="rvq" markdown>

<p class="rd-crumb"><b>Toolbox 2</b> Uses the 16 codes per frame from page 1.</p>

## Why describe each frame with 16 codes instead of one?

1. **One code is too coarse.** A single pick from 2,048 entries only roughly matches a frame. The leftover error is large.
2. **The next code fixes the leftover.** Codebook 2 quantises what codebook 1 missed, and so on. This is **residual vector quantisation**.
3. **The first code carries meaning.** This tokenizer marks one codebook as semantic: it tracks what is said more than how (§config).
4. **Breeze uses 16 of 32.** The codec was built with 32 quantisers but runs with 16 valid ones (§config). Drag the slider to add codebooks. [[16 of 32 | codebooks used (§config)]]

<p class="rd-cap">Codebook counts are real (§config). The shrinking error is an illustrative toy computed in your browser, not measured on this codec.</p>

<p class="rd-take"><b>Code 1 says what; codes 2–16 add the detail.</b> Next: predicting 16 codes per frame without 16 times the work.</p>

</article>

<article class="rd-page" id="csm" data-part="Toolbox" data-draw="twolevel" data-fast markdown>

<p class="rd-crumb"><b>Toolbox 3</b> Uses the 16 codes per frame from page 2.</p>

## How do you predict 16 codes per frame without 16 times the steps?

1. **Flattening is slow.** Put all 16 codes in one long sequence, and each second needs 200 steps of the big model.
2. **Split time from depth.** A big **backbone** steps once per frame and predicts code 1. A small **depth decoder** fills in codes 2–16.
3. **The small model does most steps.** Per second: 12.5 backbone steps and 187.5 depth steps (our arithmetic). Flip the toggle.
4. **Sesame's CSM works this way.** Breeze's config names its parts "llama-1B" and "llama-100M", exactly as CSM's code does (§config; CSM found by us). [[12.5 | big-model steps per second of speech]]

<p class="rd-cap">Step counts follow from 12.5 Hz and 16 codebooks (§config). CSM's flavour names are in SesameAILabs/csm models.py (found by us). The timeline is illustrative.</p>

<p class="rd-take"><b>The backbone handles time; the depth decoder handles detail.</b> Next: how a prompt can be pushed harder.</p>

</article>

<article class="rd-page" id="cfg" data-part="Toolbox" data-draw="cfg" markdown>

<p class="rd-crumb"><b>Toolbox 4</b> Uses the next-code scores from page 3.</p>

## What does classifier-free guidance do to next-token scores?

1. **Run the model twice.** Once with the instruction, once without it. Each run scores every possible next code.
2. **Take the difference.** Codes the instruction pushed up get a positive difference. That difference is the instruction's effect.
3. **Then exaggerate it.** Guided = without + s × (with − without) (§code generation_breeze.py). Drag s and watch the probabilities.
4. **s = 1 means no guidance.** Breeze defaults to 1. The README suggests 4 for voice design and direction (§README). [[4 | suggested guidance scale (§README)]]

<p class="rd-cap">The formula and scales are real (§code, §README). The three candidate codes and their scores are illustrative; probabilities are computed live.</p>

<p class="rd-take"><b>Guidance amplifies whatever the instruction changes.</b> Next: how latency is measured.</p>

</article>

<article class="rd-page" id="latency" data-part="Toolbox" data-draw="rtf" markdown>

<p class="rd-crumb"><b>Toolbox 5</b> Uses the 80 ms frame from page 1.</p>

## What do TTFA and RTF actually measure?

1. **TTFA is the wait for sound.** **Time to first audio** runs from the request to the first playable samples (§README).
2. **RTF is speed while talking.** **Real-time factor** is generation time divided by audio length. Under 1 means faster than real time.
3. **Each frame has an 80 ms budget.** To stream without gaps, a frame must be ready in under 80 ms. Drag the per-frame time.
4. **Breeze claims RTF 0.32.** That is 25.6 ms of compute per 80 ms frame, about 3.1× real time (§README). [[25.6 ms | per 80 ms frame at RTF 0.32 (our arithmetic)]]

<p class="rd-cap">RTF 0.32 on a warmed H100 is the vendor's claim (§README). The per-frame milliseconds are our arithmetic.</p>

<p class="rd-take"><b>TTFA is about starting; RTF is about keeping up.</b> Next: the whole machine.</p>

</article>

<article class="rd-page" id="whole" data-part="The machine" data-draw="whole" data-fast markdown>

<p class="rd-crumb"><b>Machine 1</b> Builds on pages 1–4. From here on, follow one request: the README's voice-direction example.</p>

## What is the whole machine?

1. **A text encoder reads the words.** A 1.0B-parameter T5Gemma 2 encoder turns text into vectors (§config).
2. **A backbone runs over time.** 1.41B parameters in 28 Qwen3-style layers. It predicts code 1 of each frame (§config).
3. **A depth decoder fills each frame.** 434M parameters in 12 layers. It predicts codes 2–16 (§config).
4. **A codec turns codes into sound.** The 171M-parameter Qwen3-TTS tokenizer decodes frames to 24 kHz audio (§config, §README).
5. **Count everything.** Add a 537M text table: 3.48B parameters in bf16 (our count). Flip the toggle. [[3.48B | parameters (our count)]]

<p class="rd-cap">Parameter counts are ours, read from the safetensors headers at revision 3e28c51. Widths are to scale in "size" view.</p>

<p class="rd-take"><b>Read the text, plan over time, fill each frame, decode.</b> Next: what the model reads for our request.</p>

</article>

<article class="rd-page" id="prompt" data-part="The machine" data-draw="prompt" data-fast markdown>

<p class="rd-crumb"><b>Machine 2</b> Uses the four parts from page 6, with our running request.</p>

## What does the model read for our request?

1. **First, the reference transcript.** `[S0]` marks the speaker, then the exact words of the reference clip (§code templates.py).
2. **Then the reference audio, as codes.** One `<|AUDIO|>` slot per 80 ms frame, then an end marker. A 10 s clip fills 125 slots.
3. **Then the instruction, in tags.** `<ins_bos>`Speak slowly with a restrained, serious tone.`<ins_eos>` (§README).
4. **Then the text to speak.** "(clears throat) We need to discuss what happened last night." The vocal event is plain text (§README).
5. **Four modes, one template family.** Flip the mode: plain, design, clone, direction. Missing parts are simply left out (§code). [[4 | prompt templates (§code templates.py)]]

<p class="rd-cap">Templates and special tokens are real (§code templates.py). The 10 s reference clip is illustrative.</p>

<p class="rd-take"><b>Reference, instruction and text become one sequence.</b> Next: how the text parts become vectors.</p>

</article>

<article class="rd-page" id="text-encoder" data-part="The machine" data-draw="textenc" markdown>

<p class="rd-crumb"><b>Machine 3</b> Zooms into the text parts of page 7.</p>

## Why does a separate encoder read the text?

1. **Text and audio slots differ.** Text slots get text-encoder vectors. Audio slots get the sum of their 16 code embeddings (§code breeze.py).
2. **Each text piece is encoded alone.** The reference transcript and the target text never attend to each other inside the encoder (§code breeze.py).
3. **The encoder mixes short and long views.** 26 layers: most see a 512-token window; every sixth sees everything (§config).
4. **A linear map joins the spaces.** Encoder vectors are 1,152 wide; the backbone's are 2,048. One linear layer bridges them (§config). [[1,152 → 2,048 | vector width, encoder to backbone (§config)]]
5. 🧠 **Why bother?** A pretrained encoder brings language understanding, useful for free-form instructions. No paper states the reason.

<p class="rd-cap">Layer counts and widths are real (§config, §code breeze.py). The two-row layout is illustrative.</p>

<p class="rd-take"><b>A pretrained encoder reads the text; the backbone reads its output.</b> Next: one 80 ms frame.</p>

</article>

<article class="rd-page" id="frame-step" data-part="The machine" data-draw="frame" data-fast markdown>

<p class="rd-crumb"><b>Machine 4</b> Uses the two-level split from page 3.</p>

## What happens in one 80 ms frame?

1. **The backbone takes one step.** It predicts code 1 from 2,048 choices, plus one extra class that means "stop" (§code breeze.py).
2. **The depth decoder takes 15 steps.** Each step predicts the next code with its own output head (§code breeze.py). Drag the slider.
3. **The 16 codes form a frame.** It goes to the codec right away and streams out as 80 ms of audio (§code fast_streaming.py).
4. **The frame becomes the next input.** Its 16 code embeddings are summed into one vector for the backbone (§code breeze.py).
5. **It stops by itself.** The stop class ends speech. The CLI also caps output at 1,500 frames: 120 s (§code infer.py). [[16 | model steps per 80 ms frame]]

<p class="rd-cap">The step structure is from the code (§code). The code values shown are illustrative.</p>

<p class="rd-take"><b>One backbone step plus 15 small steps make 80 ms of speech.</b> Next: how the instruction gets amplified.</p>

</article>

<article class="rd-page" id="guidance" data-part="The machine" data-draw="guide" markdown>

<p class="rd-crumb"><b>Machine 5</b> Applies guidance from page 4 to the request from page 7.</p>

## What is the "without instruction" run in each mode?

1. **The negative prompt drops only the instruction.** For our direction request, it is the same clone prompt without the tags (§code templates.py).
2. **Both runs share one batch.** Guidance doubles the batch at every step, in backbone and depth decoder (§code). [[2 | runs per step]]
3. 🧠 **Identity stays; tone gets boosted.** The reference voice is in both runs, so guidance mainly exaggerates the instruction.
4. 💻 **A three-way mode exists, unused.** The code can weigh reference and instruction separately. The released CLI and streaming path never switch it on (§code infer.py).
5. **Plain text has nothing to amplify.** No instruction means no negative prompt: guidance stays off (§code).

<p class="rd-cap">Templates, batching and the unused three-way mode are real (§code templates.py, fast_streaming.py). Bar heights are illustrative.</p>

<p class="rd-take"><b>Guidance compares the request with and without its instruction.</b> Next: how each code is drawn.</p>

</article>

<article class="rd-page" id="sampling" data-part="The machine" data-draw="sampling" markdown>

<p class="rd-crumb"><b>Machine 6</b> Zooms into the "pick a code" moment of page 9.</p>

## How is each code actually picked?

1. **Scores become probabilities.** Logits are divided by a temperature of 0.9, then softmaxed (§code runtime.py). Drag the temperature.
2. **Only the top 50 survive.** Top-k 50 keeps the 50 likeliest codes; the rest get zero (§code runtime.py).
3. **Reserved ids are blocked.** Three ids above the 2,048 real codes are masked out (§code logits_process.py).
4. **Repeats of code 1 are discouraged.** A penalty of 1.1 lowers codes the backbone already chose (§code infer.py).
5. **A seed makes it repeatable.** The CLI seeds 42 by default (§code infer.py). [[0.9 | temperature, backbone and depth decoder (§code)]]

<p class="rd-cap">Settings are real (§code runtime.py, infer.py, logits_process.py). The six candidate scores are illustrative; probabilities are computed live.</p>

<p class="rd-take"><b>Sampling is mild and seeded: temperature 0.9, top 50.</b> Next: when the first sound comes out.</p>

</article>

<article class="rd-page" id="streaming" data-part="The machine" data-draw="stream" markdown>

<p class="rd-crumb"><b>Machine 7</b> Uses the frame loop from page 9 and TTFA from page 5.</p>

## How does sound start before the sentence is done?

1. **The prompt is read once.** One prefill pass reads the whole prompt; then the first frame starts (§code fast_streaming.py).
2. **Frames leave as soon as they're ready.** A finished frame is decoded before the next backbone step begins (§code fast_streaming.py).
3. **Eager mode waits for two frames.** The default path decodes 2 frames per chunk: 160 ms of audio (§code fast_streaming.py).
4. **The fast path sends one.** With `--fast-all`, each 80 ms frame is its own chunk. Flip the toggle. [[80 ms | audio per chunk on the fast path]]
5. **Output is raw PCM.** The API streams mono 24 kHz 16-bit samples, one request at a time (§README).

<p class="rd-cap">Chunk sizes and formats are real (§code fast_streaming.py, §README). Bar lengths in time are illustrative.</p>

<p class="rd-take"><b>First audio needs prefill plus one or two frames.</b> Next: what the fast path costs.</p>

</article>

<article class="rd-page" id="fast-path" data-part="The machine" data-draw="fast" markdown>

<p class="rd-crumb"><b>Machine 8</b> Uses the streaming loop from page 12.</p>

## What does the fast path buy, and what does it cost?

1. **Five stages can be captured.** Text encoder, prefill, decode, depth decoder and codec each get CUDA Graphs (§README).
2. **Graphs cut launch overhead.** Each step replays a recorded kernel sequence instead of launching kernels one by one.
3. **Memory almost doubles.** Eager needs about 7.7 GiB; the fast path about 14.4 GiB (§README). Flip the toggle.
4. **Start-up gets slower.** Graphs are warmed up for fixed shape buckets before the first request (§code warmup_profile.py).
5. **The speed claims are fast-path claims.** Under 40 ms TTFA and RTF 0.32 are for a warmed H100 (§README). [[14.4 GiB | GPU memory on the fast path (§README)]]

<p class="rd-cap">Memory and speed figures are the vendor's (§README). Per-stage memory isn't reported, so stages aren't drawn to scale.</p>

<p class="rd-take"><b>Speed costs twice the memory and a warm-up.</b> Next: how the model ranks.</p>

</article>

<article class="rd-page" id="elo" data-part="What's claimed" data-draw="elo" data-fast markdown>

<p class="rd-crumb"><b>Claim 1</b> The vendor's headline claim. Nothing earlier is needed.</p>

## Where does it rank against other TTS models?

1. **Listeners vote between pairs.** Artificial Analysis plays two models' clips and asks which is better. Votes become Elo scores (§README).
2. **Breeze tops the chart at 1,215.** Gemini 3.1 Flash TTS follows at 1,210, Cartesia Sonic 3.5 at 1,199 (§README).
3. **Five points is nearly a coin flip.** It predicts Breeze wins 50.7% of pairs against Gemini (our arithmetic).
4. **Among open models, the gap is big.** The next open-weight model, Fish Audio S2 Pro, scores 1,125: 90 points lower (§README). [[+90 | Elo over the next open-weight model]]
5. 🧠 **No error bars are shown.** Without vote counts, we can't tell whether 1,215 and 1,210 really differ.

<p class="rd-cap">Elo values are from the README's chart, a snapshot of the Artificial Analysis leaderboard dated Aug 25, 2026. Win rates are our arithmetic.</p>

<p class="rd-take"><b>Clearly the best open model; tied with the best closed one.</b> Next: the vendor's own benchmarks.</p>

</article>

<article class="rd-page" id="benchmarks" data-part="What's claimed" data-draw="bench" markdown>

<p class="rd-crumb"><b>Claim 2</b> Uses voice design and direction from page 7.</p>

## How does it do on voice design and direction?

1. **Voice design: best role fit.** Role Fit 78.02, ahead of MiMo-V2.5-TTS at 72.78 (§blog).
2. **And the most varied voices.** 708 distinct voices against VoxCPM2's 509. That is the blog's "39% more" (§blog).
3. **Voice direction: best score.** 4.25 against 3.76 for MiMo-v2.5-TTS, the blog's "13%" lead (§blog). Flip the toggle.
4. **But not the best similarity.** Its speaker similarity is 0.67; Inworld TTS-2 reaches 0.71 and VoxCPM2 0.70 (§blog). [[78.02 | Role Fit in voice design (§blog)]]
5. 🧠 **These are the vendor's own benchmarks.** BreezeBlue built and released them. Independent reruns would settle it.

<p class="rd-cap">All scores are from the blog's tables (Aug 7, 2026). We checked its percentages against those scores.</p>

<p class="rd-take"><b>It leads its own benchmarks, except on voice similarity.</b> Next: the latency numbers.</p>

</article>

<article class="rd-page" id="latency-claims" data-part="What's claimed" data-draw="lat" markdown>

<p class="rd-crumb"><b>Claim 3</b> Uses TTFA from page 5 and the fast path from page 13.</p>

## Why 127 ms in the blog but under 40 ms in the README?

1. **The README measures a local GPU.** Under 40 ms TTFA: warmed fast path, one H100, no network (§README).
2. **The blog measures the hosted API.** 127.2 ms at p50 and 159.3 ms at p95, timed from outside (§blog).
3. **On that chart it is third.** Speechify Simba 3.2 (82.5 ms) and Inworld TTS-2 Flash (100.2 ms) start sooner at p50 (§blog).
4. **Its tail ranks second.** At p95, only Speechify's 126.9 ms beats its 159.3 ms (§blog). Flip to p95. [[127.2 ms | hosted TTFA at p50 (§blog)]]
5. 🧠 **Compare like with like.** A local fast-path number can't be set against other vendors' API numbers.

<p class="rd-cap">All values are the vendor's (§README, §blog). The chart redraws the blog's numbers for its top six.</p>

<p class="rd-take"><b>Local and hosted latency are different measurements.</b> Next: what we could run ourselves.</p>

</article>

<article class="rd-page" id="our-run" data-part="Your move" data-draw="ourrun" markdown>

<p class="rd-crumb"><b>Your move 1</b> Found by us: what runs on a 6 GB laptop GPU.</p>

## What could we actually run, and what did it show?

1. **The full model didn't fit.** Our RTX 3050 has 6 GB. The bf16 weights alone are 6.97 GB (our count).
2. **The tokenizer did.** We ran the bundled 171M-parameter tokenizer on CPU with torch 2.9.1, as the repo pins (§code).
3. **Encoding was quick.** A 23.764 s clip encoded in 1.88 s: 298 frames of 16 codes, values 0 to 2,047.
4. **Decoding was the slow part.** Rebuilding 23.84 s of 24 kHz audio took 15.47 s on 8 CPU threads. [[15.47 s | to decode 23.764 s on CPU (our run)]]
5. 💻 **Try it yourself.** Our [tok_run.py](assets/tok_run.py) makes one encode and one decode call (§code audio.py).

<p class="rd-cap">All numbers are from our single CPU run (8 threads). The weight size is from the safetensors headers. Bars are to scale.</p>

<p class="rd-take"><b>Only the codec runs on small hardware; the model needs a 12 GB GPU.</b> Next: what a reviewer would question.</p>

</article>

<article class="rd-page" id="reviewer" data-part="Your move" data-draw="reviewer" markdown>

<p class="rd-crumb"><b>Your move 2</b> Our critique of pages 6–17.</p>

## What would a careful reviewer question?

1. 🧠 **No training recipe.** Data, hours and training steps appear nowhere in the README, card or blog (§README, §card).
2. 🧠 **Languages disagree.** The blog says 51 languages; the open model card lists English and Chinese (§blog, §card).
3. 🧠 **Unused weights ride along.** A 537M text table and a Mimi-shaped codec load, but streaming never uses them (§code breeze.py).
4. 🧠 **Benchmarks are home-made.** Design, direction and latency benchmarks are all BreezeBlue's (§blog).
5. 🧠 **Steelman: the code is complete.** It runs inference end to end, ships tests, and matches the config (§code).

<p class="rd-cap">Pointers mark the evidence behind each concern. The pills are our judgment.</p>

<p class="rd-take"><b>Trust the architecture; treat the scores as claims.</b> The code is first-hand; the numbers are self-reported.</p>

</article>

<article class="rd-page" id="verdict" data-part="Your move" data-draw="verdict" data-fast markdown>

<p class="rd-crumb"><b>Your move 3</b> Goal picked by us: a real-time voice agent, possibly for Indian languages. Uses pages 13–18.</p>

## Should you build a real-time voice agent on Breeze TTS 2?

1. **Quality looks strong.** 1,215 Elo, the best open-weight score on the chart (§README).
2. **Hardware is moderate.** 12 GB is the eager minimum; the fast path wants 24 GB (§README). Pick a GPU with the toggle.
3. **Telugu or Hindi: not supported.** The open model lists English and Chinese only (§card).
4. **Commercial use: no.** Weights and self-hosted outputs are research and non-commercial only (§README).
5. 🧠 **Verdict: prototype yes, product no.** Study its streaming design in English. [[2 | languages (§card)]]

<p class="rd-cap">Requirements, languages and license terms are the vendor's (§README, §card). The fit ticks compare GPU memory with the 7.7 and 14.4 GiB figures.</p>

<p class="rd-take bad"><b>Not for a commercial or Telugu product today.</b> Still a strong reference design.</p>

</article>

<article class="rd-page" id="check-tokens" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 1</b> From pages 1 and 3.</p>

## How many codec tokens does one second of Breeze speech take?

- [ ] 12.5
- [ ] 16
- [x] 200
- [ ] 2,200

<p class="rd-take"><b>12.5 frames × 16 codes = 200 tokens a second.</b> 12.5 is frames, 16 is codes per frame, and 2,200 is bits per second (§config).</p>

</article>

<article class="rd-page" id="check-guidance" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 2</b> From pages 4 and 10.</p>

## With guidance on in voice direction, what is the "without" run?

- [ ] An empty prompt with no text at all
- [x] The same clone prompt, minus the instruction
- [ ] The text alone, without the reference audio
- [ ] The instruction alone, without the text

<p class="rd-take"><b>Only the instruction is dropped.</b> The reference stays in both runs, so guidance boosts tone, not identity. The three-way mode that drops the reference too is never used (§code templates.py, infer.py).</p>

</article>

<article class="rd-page" id="check-latency" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 3</b> Spot the flaw. From pages 5 and 16.</p>

## "Breeze starts in under 40 ms, beating Speechify's 82.5 ms." What's wrong?

- [ ] Nothing: 40 ms is lower than 82.5 ms
- [x] 40 ms is a local H100 figure; 82.5 ms is a hosted API figure
- [ ] 40 ms is the real-time factor, not the time to first audio
- [ ] Speechify's number is p95, Breeze's is p50

<p class="rd-take"><b>Different measurements can't be ranked.</b> On the same hosted chart, Breeze's TTFA p50 is 127.2 ms, third behind Speechify's 82.5 ms (§README, §blog).</p>

</article>
