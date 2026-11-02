---
title: "Maya 2 Native"
paper_title: "Maya 2 Native: streaming TTS for 11 Indian languages and English (open-weight release, no paper)"
authors: ["Maya Research (Dheemanth Reddy BS, Bharath Kumar Kakumani, Sai Charan Thippareddy, Prahalad Boreddy, Nikil Thalapaneni)"]
year: 2026
venue: "Model release 1.0 (2026-10-25): model card, config and inference code; no paper"
source: model-release
source_id: "maya2-native"
sources:
  - {label: "Model card", url: "https://huggingface.co/maya-research/maya2-native", note: "read 2026-11-02; pointers (§card …)"}
  - {label: "Engine docs", url: "https://github.com/MayaResearch/maya2-native/blob/c6b376868e268551d065c4206193e96257bef4a1/docs/ENGINE.md", note: "speed and memory measurements; pointers (§ENGINE …), (§README …)"}
  - {label: "Measured by us", url: "https://huggingface.co/maya-research/maya2-native/tree/main/backbone", note: "token counts from both tokenizer.json files and the sample clip lengths; the model itself was not run"}
code: {url: "https://github.com/MayaResearch/maya2-native", license: "Apache-2.0", note: "read at commit c6b3768 (2026-10-27): engine, server, model definition and prompt packer; no training loop, data or DPO code; pointers (§code file:line)"}
model: {url: "https://huggingface.co/maya-research/maya2-native", license: "Apache-2.0", note: "2.50B parameters, 5.0 GB bf16; not run by us (needs about 9.2 GB of GPU memory, our laptop has 6 GB)"}
paper_type: model-release
hook: "A Qwen3 language model that speaks Telugu, Tamil and nine more Indian languages in 20 voices, 224 streams on one GPU. No paper, but the code tells the whole story."
big_idea: "Maya 2 Native is a Qwen3-1.7B backbone that writes one coarse Mimi code per 80 ms, plus a 555M depth decoder that fills in 31 finer codes. Training tricks against its own drift (corrupted history, roll-in, a zero-initialised speaker anchor) and guarded stopping make it stable enough to stream."
goal: "Decide whether Maya 2 Native should be the Telugu voice of your agent or dubbing pipeline, next to OmniVoice and VoxCPM2."
difficulty: 3
difficulty_note: "Home turf: TTS, codecs, speaker embeddings, ASR metrics. New: depth decoders, exposure-bias fixes, DPO, guarded stopping; each gets its own page. No paper: pointers name the model card, the docs or a code line at commit c6b3768."
date_added: 2026-11-02
tags: [Speech, TTS, Multilingual, Generative models]
description: "A Qwen3 language model that speaks Telugu, Tamil and nine more Indian languages in 20 voices, 224 streams on one GPU. No paper, but the code tells the whole story."
---

<article class="rd-page" id="codec-frames" data-part="Toolbox" data-draw="codec-frames" markdown>

<p class="rd-crumb"><b>Toolbox 1</b> Start here. No paper: (§card …) is the model card, (§code file:line) the repo at c6b3768.</p>

## How does 8.64 s of Telugu become a grid of numbers?

1. **Our running example.** The card's Telugu clip in the voice Nivedita: 8.64 s at 24 kHz. We measured it. (§card Listen)
2. **Cut it into 80 ms frames.** Mimi, Kyutai's codec, makes one frame per 1,920 samples. That is 12.5 frames a second (§card Architecture).
3. **Each frame gets 32 codes.** Every code is a number from 0 to 2,047, one per **codebook**. [[108 × 32 | frames × codes for our clip]]
4. **So the clip is 3,456 numbers.** Move the slider to keep fewer codebooks. Fewer codes, fewer bits, rougher sound.
5. **The decoder plays them back.** Mimi turns each frame of 32 codes into 80 ms of audio, causally, frame by frame.

<p class="rd-cap">Frame rate, codebook count and size are real (§card Architecture); the clip length is our measurement of samples/te_nivedita.wav. The code values drawn are made up.</p>

<p class="rd-take"><b>Speech becomes a 108 × 32 grid of small integers.</b> Next: why the 32 rows are not equal.</p>

</article>

<article class="rd-page" id="rvq" data-part="Toolbox" data-draw="rvq" markdown>

<p class="rd-crumb"><b>Toolbox 2</b> Uses the 32 codebooks from page 1.</p>

## Why are the 32 codebooks not equal?

1. **The first code is a rough guess.** Codebook 0 picks the nearest of 2,048 vectors to the frame. Some error is left over.
2. **The next code fixes the leftover.** Codebook 1 quantises that error, codebook 2 the error after that. This is **residual vector quantisation**.
3. **Errors shrink level by level.** The bars show the leftover after each level. Late levels add fine detail, like hiss and breath.
4. **Mimi's first code is special.** It was trained to match a speech model's features, so it carries mostly what is said (found by us: Moshi, arXiv:2410.00037).
5. 🧠 **So code 0 is the plan.** Get codebook 0 right and the words are right. The other 31 make it sound real.

<p class="rd-cap">The bars are illustrative, not measured. The semantic first codebook is from the Moshi report (found by us), not from Maya's sources.</p>

<p class="rd-take"><b>Codebook 0 says what; codebooks 1–31 say how it sounds.</b> Next: how one model can write all 32.</p>

</article>

<article class="rd-page" id="depth-idea" data-part="Toolbox" data-draw="depth-idea" data-fast markdown>

<p class="rd-crumb"><b>Toolbox 3</b> Uses the 108 × 32 grid from page 1.</p>

## Why not let one transformer predict all 32 codes in a row?

1. **Flattening is the simple way.** Write the grid as one long sequence, code by code. Our clip becomes 3,456 steps.
2. **That is slow and long.** Each step is a full pass of a big model. Attention spans thousands of positions.
3. **Split the work in two.** A big model steps once per frame: 108 steps. It writes codebook 0.
4. **A small model fills each frame.** A **depth decoder** reads the big model's state and writes codes 1–31 inside that frame.
5. **This is a known recipe.** RQ-Transformer, Moshi and Sesame's CSM all use it (found by us). Toggle to compare the step counts.

<p class="rd-cap">Step counts are arithmetic on our 108-frame clip. The family of prior models is found by us; Maya's sources do not cite them.</p>

<p class="rd-take"><b>A big model per frame, a small model per code.</b> 108 big steps instead of 3,456.</p>

</article>

<article class="rd-page" id="exposure" data-part="Toolbox" data-draw="exposure" markdown>

<p class="rd-crumb"><b>Toolbox 4</b> Nothing earlier needed. Pages 21–22 use this.</p>

## Why does a model trained on clean history fail on its own output?

1. **Training feeds the true past.** At each frame the model sees real recorded frames before it. This is **teacher forcing**.
2. **Speaking feeds its own past.** At inference, each frame it reads was its own earlier guess, with small errors.
3. **It never practised that.** Errors it has never seen push it further off. The gap grows frame by frame. This is **exposure bias**.
4. **Fix: practise on your own mistakes.** Swap some true inputs for sampled ones during training. This is **scheduled sampling**.
5. **Or: practise on broken inputs.** Corrupt the past on purpose, keep the targets clean. Maya does both (pages 21–22).

<p class="rd-cap">The drift curves are illustrative. The two fixes are named in Maya's code (§code tts_model_v2.py:10).</p>

<p class="rd-take"><b>A model must see imperfect history in training to survive it at inference.</b></p>

</article>

<article class="rd-page" id="ecapa" data-part="Toolbox" data-draw="ecapa" markdown>

<p class="rd-crumb"><b>Toolbox 5</b> Nothing earlier needed.</p>

## How can 192 numbers describe a voice?

1. **A speaker-verification network.** ECAPA-TDNN was trained to tell thousands of speakers apart. Its last layer is 192 numbers (§card Architecture).
2. **Same voice, nearby vectors.** Two clips of one person point in similar directions. Similarity is the cosine between them.
3. **Average clips into a centroid.** One vector per built-in voice: the mean of its clips' embeddings.
4. **Classify by nearest centroid.** A generated clip is "Nivedita" if her centroid is closest. Maya scores voice identity this way (§card Evaluation).
5. **Maya also conditions on it.** The same 192 numbers tell the model whose voice to use (pages 16–17).

<p class="rd-cap">The 192-d size and the nearest-centroid metric are real (§card). The 2-D map is a cartoon of a 192-d space.</p>

<p class="rd-take"><b>One 192-number vector is both the voice's ID card and its steering input.</b></p>

</article>

<article class="rd-page" id="dpo" data-part="Toolbox" data-draw="dpo" markdown>

<p class="rd-crumb"><b>Toolbox 6</b> Nothing earlier needed. Page 23 uses this.</p>

## How do you train on "this take is better than that one"?

1. **Generate several takes.** Same text, same voice, different samples. Some mispronounce, some drift in voice.
2. **Rank them automatically.** Maya ranks by ASR agreement with the text and by speaker similarity (§card Training).
3. **Keep a better and a worse take.** That pair is one training example.
4. **Push the pair apart.** **DPO** raises the better take's likelihood relative to the worse one. A frozen copy keeps the model near where it started.
5. **No reward model is trained.** The ranking is the only signal. Its exact settings are not disclosed (§card Training).

<p class="rd-cap">The ranking signals are real (§card Training). The takes and their scores are illustrative; pair counts and β are not reported.</p>

<p class="rd-take"><b>DPO turns automatic rankings into a gradient.</b> Whatever the ranker misses, DPO cannot fix.</p>

</article>

<article class="rd-page" id="machine" data-part="The machine" data-draw="machine" data-fast markdown>

<p class="rd-crumb"><b>Machine 1</b> Uses the depth decoder idea from page 3. Our Telugu sentence enters here.</p>

## What is the whole machine?

1. **Text in, normalised first.** "7.25%" becomes spoken words before any model sees it (§card Quickstart).
2. **A Qwen3-1.7B backbone.** 28 layers, width 2,048, started from Qwen3-1.7B-Base. It steps once per 80 ms frame (§card Architecture).
3. **It writes codebook 0.** One coarse code per frame, or "stop".
4. **A depth decoder fills the frame.** About 555M parameters write codebooks 1–31 (§card Architecture).
5. **Mimi plays the frame.** 32 codes become 80 ms of 24 kHz audio, streamed at once. [[2.50B | parameters, codec excluded]]
6. **Box widths are to scale.** We computed each part from the code's layer shapes. The sum matches the card's 2,502,398,656.

<p class="rd-cap">Parameter counts are our arithmetic from layer shapes in the code (§code depth_v2.py:47); the total matches maya3_config.json. Mimi and ECAPA are separate downloads.</p>

<p class="rd-take"><b>An LLM plans each frame, a smaller transformer details it, a codec plays it.</b></p>

</article>

<article class="rd-page" id="normalize" data-part="The machine" data-draw="normalize" markdown>

<p class="rd-crumb"><b>Machine 2</b> Our sentence has "3:2" and "7.25%". What does the model hear?</p>

## Why rewrite "7.25%" before the model reads it?

1. **Digits are ambiguous aloud.** "3:2" could be a ratio, a time or a score. The model only learned spoken forms.
2. **A rule-based normaliser runs first.** It expands numbers, currency, dates, URLs and e-mails into words, per language (§README Text).
3. **Shapes it once got wrong.** The repo lists fixes found in failure reviews. The board shows five of them (§code text/README.md).
4. **Python must ask for it.** The server normalises by default; `generate()` needs `normalize=True` (§card Quickstart).
5. 🧠 **We could not run it here.** So we can't show our sentence's spoken form. Check yours by printing `normalise_text` output.

<p class="rd-cap">Before/after pairs are copied from the repo's rule table (§code text/README.md). The normaliser is standard-library Python; we did not execute it.</p>

<p class="rd-take"><b>Half of "reading numbers right" is a rulebook, not the neural model.</b></p>

</article>

<article class="rd-page" id="tokenizer" data-part="The machine" data-draw="tokenizer" data-fast markdown>

<p class="rd-crumb"><b>Machine 3</b> Our sentence again, before normalisation, through two tokenizers. Measured by us.</p>

## How many tokens is a Telugu sentence?

1. **Stock Qwen3 shreds Telugu.** Our 84-character sentence becomes 124 tokens, mostly single bytes. That is more tokens than characters.
2. **Maya grew the vocabulary.** 151,665 tokens became 194,548 (§code backbone/config.json). We count 42,833 new merges before the control tokens.
3. **Same sentence: 44 tokens.** Almost 3× shorter. Tamil drops from 110 to 34. [[124 → 44 | Telugu tokens, Qwen3 vs Maya]]
4. **English is untouched.** 28 tokens either way. The new merges are Indic.
5. **Plus 50 control tokens.** Language tags, `<|audio|>`, `<|spk|>` and 32 reserved slots (§code tokens.py:28).

<p class="rd-cap">Token counts are ours: both tokenizer.json files run with the tokenizers library on the card's raw sample texts. The 42,833 is the id gap below the first control token.</p>

<p class="rd-take"><b>A Telugu sentence costs a third of the tokens it would in stock Qwen3.</b> Shorter prompts, more room for text knowledge.</p>

</article>

<article class="rd-page" id="prompt" data-part="The machine" data-draw="prompt" data-fast markdown>

<p class="rd-crumb"><b>Machine 4</b> Uses the 44 tokens from page 9 and the 108 frames from page 1.</p>

## What does the model actually read?

1. **A language tag first.** `<|lang:te|>` says the target is Telugu (§code prompt.py:13).
2. **Then the voice's name.** Built-in voices are picked by a name prefix: `{Nivedita}: ` before the text (§README Voices).
3. **Then our text, then `<|audio|>`.** The switch token: from here on, every position is an audio frame.
4. **108 frames, then stop.** The model writes frames until it predicts end-of-audio, a special class we meet on page 12.
5. **Clones look different.** Toggle `icl_spk`: a reference clip's text and codes come first, with their own language tag.

<p class="rd-cap">Layouts follow the prompt builder (§code prompt.py:13). Token boxes are schematic; our text is 44 real tokens.</p>

<p class="rd-take"><b>One sequence: tag, name, text, switch, audio.</b> The voice is chosen by words, not by a separate model.</p>

</article>

<article class="rd-page" id="audio-in" data-part="The machine" data-draw="audio-in" markdown>

<p class="rd-crumb"><b>Machine 5</b> Uses the 32 codes per frame from page 1.</p>

## How does a frame of 32 codes enter the backbone?

1. **Audio never enters the text vocabulary.** Frames come in as vectors, not token ids (§code tokens.py:4).
2. **One table, 65,536 rows.** Each codebook gets its own 2,048 rows of width 2,048 (§code audio_io.py:21).
3. **Look up 32 rows and add them.** Divide by √32, then RMS-normalise. One vector per 80 ms frame (§code audio_io.py:35).
4. **Training sometimes uses fewer levels.** Each batch keeps the first 8, 16, 24 or 32 codebooks (§code packing_v2.py:163).
5. 🧠 **That teaches robustness to missing detail.** The coarse levels alone must still steer the next frame.

<p class="rd-cap">Table size, scaling and level choices are real (§code). The 134M-parameter table is the third-largest part of the model.</p>

<p class="rd-take"><b>A frame's 32 codes are summed into one input vector.</b> The backbone reads 108 such vectors for our clip.</p>

</article>

<article class="rd-page" id="cb0-head" data-part="The machine" data-draw="cb0-head" markdown>

<p class="rd-crumb"><b>Machine 6</b> Uses codebook 0 from page 2.</p>

## What does the backbone predict at each step?

1. **A new 2,049-way head.** 2,048 classes for codebook 0, plus one for **end-of-audio** (§code model/backbone.py:83).
2. **Stopping is just another class.** There is no separate stop token in the text vocabulary (§code tokens.py:13).
3. **Stop mistakes cost 3×.** The end-of-audio class has loss weight 3 (§code tokens.py:24).
4. **The text head stays.** On text positions the old 194,548-way head still predicts the next token.
5. **So it keeps reading practice.** Training mixes in text-only data to adapt the backbone to the languages (§card Training).

<p class="rd-cap">Head sizes and the 3× weight are real (§code). The probability bars are illustrative.</p>

<p class="rd-take"><b>One coarse code, or stop, per frame.</b> The text head keeps the language model alive.</p>

</article>

<article class="rd-page" id="depth" data-part="The machine" data-draw="depth" markdown>

<p class="rd-crumb"><b>Machine 7</b> Uses the depth decoder from page 3 and codebook 0 from page 12.</p>

## How does the depth decoder fill 31 codes?

1. **Start from the backbone's state.** Project its 2,048-d output to 1,024 for the first position (§code depth_v2.py:257).
2. **Add codebook 0.** Its embedding is the second position. Predict codebook 1.
3. **Repeat, one level at a time.** Each new code joins the prefix. 31 levels, 31 output heads (§code depth_v2.py:229).
4. **Small and causal.** 4 layers, width 1,024, 16 heads (§code depth_v2.py:47).
5. **Sampled with care.** Temperature 0.7, top-64 at every level (§code depth_v2.py:521). Our clip: 108 × 31 = 3,348 depth codes.

<p class="rd-cap">Sizes and sampling defaults are real (§code depth_v2.py). The prefix drawing is schematic.</p>

<p class="rd-take"><b>Inside each frame, a 4-layer transformer writes 31 codes in order.</b></p>

</article>

<article class="rd-page" id="depth-groups" data-part="The machine" data-draw="depth-groups" markdown>

<p class="rd-crumb"><b>Machine 8</b> Continues page 13. Where do 555M parameters fit in 4 layers?</p>

## Why does the depth decoder have 11 weight sets?

1. **Levels 1–8 get private weights.** Each has its own 4-layer trunk (§code depth_v2.py:45).
2. **Later levels share in bands.** Levels 9–16, 17–24 and 25–31 share one trunk per band. That is 11 trunks.
3. 🧠 **Coarse levels matter more.** They get dedicated capacity; fine detail shares it.
4. **Sharing allows one pass per band.** A causal pass over a band's longest prefix yields every level in it at once.
5. **527 positions become 118.** Per frame at 32 levels, in teacher-forced training. Move the slider for fewer levels (§code depth_v2.py:333).

<p class="rd-cap">Groups and position counts are real (§code depth_v2.py:45, :333). The grouped pass is a training speed-up; generation still runs level by level.</p>

<p class="rd-take"><b>11 trunks: eight private, three shared.</b> Sharing cuts training work to 22%.</p>

</article>

<article class="rd-page" id="amortize" data-part="The machine" data-draw="amortize" markdown>

<p class="rd-crumb"><b>Machine 9</b> Uses our 108 frames from page 1.</p>

## Why train the depth decoder on only 1 frame in 8?

1. **The backbone learns on every frame.** All 108 frames of our clip get a codebook-0 loss.
2. **The depth decoder runs 31 levels per frame.** Running it on every frame would dominate training cost.
3. **So it sees a random eighth.** `amortize_frac=0.125`: 13 of our 108 frames train it (§code tts_model_v2.py:60).
4. **It is cheap to share.** Each frame's depth job is independent, given the backbone's state.
5. **Sesame's CSM did the same.** It trained its decoder on 1/16 of frames (found by us). Move the slider to see the saving.

<p class="rd-cap">The 1/8 fraction is real (§code). CSM's 1/16 is from Sesame's blog (found by us). Frame picks are seeded, not Maya's.</p>

<p class="rd-take"><b>Depth learns from a random eighth of frames.</b> The backbone still learns from all of them.</p>

</article>

<article class="rd-page" id="speaker-doors" data-part="The voice" data-draw="speaker-doors" data-fast markdown>

<p class="rd-crumb"><b>Voice 1</b> Uses the 192-number voice vector from page 5.</p>

## Where does the voice enter the model?

1. **Door 1: the depth decoder.** The ECAPA vector becomes one 1,024-d memory token. Every depth layer cross-attends to it (§code depth_v2.py:239).
2. **That was not enough.** With the voice only there, the backbone's codebook-0 loss was identical with or without a speaker (§code anchors.py:3).
3. 🧠 **So the backbone was voice-blind.** It planned rhythm and coarse sound for nobody in particular.
4. **Door 2: the speaker anchor.** A small network adds the voice vector to the `<|audio|>` token's input (§code anchors.py:27).
5. **Now both halves know who speaks.** No new token or position was needed for it.

<p class="rd-cap">Both paths and the "identical loss" finding are from code comments (§code anchors.py, depth_v2.py). The finding's numbers are not published.</p>

<p class="rd-take"><b>The voice enters twice: once into the planner, once into the detailer.</b></p>

</article>

<article class="rd-page" id="anchor-zero" data-part="The voice" data-draw="anchor-zero" markdown>

<p class="rd-crumb"><b>Voice 2</b> Zooms into door 2 from page 16.</p>

## Why start the speaker anchor at exactly zero?

1. **A two-layer network.** 192 numbers in, 512 hidden, 2,048 out, added at `<|audio|>` (§code anchors.py:27).
2. **The last layer starts at zero.** So on day one it adds nothing (§code anchors.py:49).
3. **It joined a trained model.** The anchor was added to an earlier checkpoint. A zero start can't damage it at step 0.
4. **No voice? A learned stand-in.** Rows without a speaker vector get a trained "null" input instead (§code anchors.py:15).
5. **Dropped 20% of the time.** Whole rows lose the anchor, so the backbone also works without one (§code anchors.py:42).

<p class="rd-cap">Sizes, zero start, null input and 20% dropout are real (§code anchors.py). The growth curve is illustrative.</p>

<p class="rd-take"><b>Zero-initialised additions let you bolt a new input onto a trained model safely.</b></p>

</article>

<article class="rd-page" id="modes-mix" data-part="The voice" data-draw="modes-mix" markdown>

<p class="rd-crumb"><b>Voice 3</b> Uses the two doors from page 16 and the prompt from page 10.</p>

## How did training teach four ways to give a voice?

1. **Two switches per training row.** Are reference clips in the prompt? Is the voice vector given? (§code packing_v2.py:3)
2. **Most rows: vector only.** 55% `spk_only`, the cheapest way to name a voice.
3. **30% both, 5% clips only.** Up to 3 same-speaker clips go before the target (§code packing_v2.py:35).
4. **10% neither.** `joint_null` teaches an unconditioned model too. That is what guidance needs.
5. 💻 **But serving never uses guidance.** The engine has no guidance scale. Built-in voices use their names instead (§code engine.py:50).

<p class="rd-cap">The mix and the 3-clip limit are real (§code packing_v2.py). "No guidance at serving" is our reading of EngineConfig.</p>

<p class="rd-take"><b>One model learned four conditioning modes from one data mix.</b></p>

</article>

<article class="rd-page" id="named-voices" data-part="The voice" data-draw="named-voices" markdown>

<p class="rd-crumb"><b>Voice 4</b> Our running example, again. Nivedita was never trained on Telugu.</p>

## How does Nivedita speak Telugu without Telugu training?

1. **She has two training languages.** English and Hindi, each with at least an hour (§card Voices).
2. **Her name is the whole prompt.** `{Nivedita}: ` before the text, no reference audio, voice memory nulled (§code prompt.py:122).
3. **The language tag does the rest.** `<|lang:te|>` plus Telugu tokens; the model applies her timbre.
4. **Ten voices cover 10 or 11 languages.** Ten more cover one to three (§card Voices). The grid lights them.
5. **Assamese has no voice.** None has an hour of it; outputs can drift Bengali-like (§card Limitations).

<p class="rd-cap">The grid is the card's training-language table (§card Voices). Cross-lingual identity is measured on page 35.</p>

<p class="rd-take"><b>A name plus a language tag is enough for cross-lingual speech.</b> Accent may carry over.</p>

</article>

<article class="rd-page" id="cloning" data-part="The voice" data-draw="cloning" markdown>

<p class="rd-crumb"><b>Voice 5</b> Uses the `icl_spk` prompt from page 10 and both doors from page 16.</p>

## What happens when you register your own voice?

1. **Give 3–10 s and its exact transcript.** Plus the clip's language (§card Clone).
2. **Mimi encodes the clip.** Its 32-code frames become the reference span of the prompt.
3. **ECAPA embeds it.** 192 numbers feed both the anchor and the depth memory.
4. **The prefix is cached once.** Its tag is the reference's language, so it never depends on the target. Its backbone KV is reused per request (§code prompt.py:5).
5. **Other target language? One more tag.** A Hindi clip speaking Tamil gets `<|lang:ta|>` before the target text (§code prompt.py:109).

<p class="rd-cap">Steps follow the voice registry and prompt builder (§code prompt.py). The card reports no clone-similarity score.</p>

<p class="rd-take"><b>A cloned voice is a cached prompt prefix plus one vector.</b></p>

</article>

<article class="rd-page" id="rollin" data-part="Training tricks" data-draw="rollin" markdown>

<p class="rd-crumb"><b>Tricks 1</b> Uses exposure bias from page 4 and the depth decoder from page 13.</p>

## How does the depth decoder practise on its own mistakes?

1. **Normally each level sees true codes.** The prefix holds the recorded codes 0 to L−1.
2. **Roll-in swaps them for its own samples.** Level L reads codes the decoder just sampled, with no gradient through them (§code depth_v2.py:326).
3. **Up to 30% of depth frames.** The fraction ramps up during training (§code depth_v2.py:381).
4. **Sampled the way serving samples.** Temperature 0.7 and top-64, not the full softmax (§code depth_v2.py:103).
5. **Codebook 0 too.** In the last stage it is sampled from the backbone's own head (§code tts_model_v2.py:172). Targets stay the true codes.

<p class="rd-cap">Mechanism and the 30% are from the code's comments (§code depth_v2.py). The sampled codes drawn are made up.</p>

<p class="rd-take"><b>The depth decoder trains on prefixes it could really produce.</b></p>

</article>

<article class="rd-page" id="history-corrupt" data-part="Training tricks" data-draw="history-corrupt" data-fast markdown>

<p class="rd-crumb"><b>Tricks 2</b> Uses exposure bias from page 4. Listening tests heard static grow over a clip (§code s2_serve_controls.py:49).</p>

## Why feed the backbone deliberately wrong history?

1. **The backbone copied its history's sound.** It learned to carry over level and hiss. Its own slight hiss then snowballed (§code corrupt.py:3).
2. **The drift lived in coarse codes.** That is what the backbone reads, not the fine ones (§code corrupt.py:8).
3. **Fix: swap 1–4 s windows.** 62.5% of corruptions paste another speaker's audio, same language (§code corrupt.py:24).
4. **Or scramble the fine levels.** 37.5% keep codebooks 0–7 and randomise the rest.
5. **Only the input is broken.** Targets stay clean, so the model must predict good audio from bad history. Ramp: up to 30% of frames.

<p class="rd-cap">Kinds, weights and the 0 → 30% ramp over 10k updates are real (§code corrupt.py). Window positions drawn are seeded examples.</p>

<p class="rd-take"><b>Train on untrustworthy history, and the model stops copying its own artefacts.</b></p>

</article>

<article class="rd-page" id="stages" data-part="Training tricks" data-draw="stages" markdown>

<p class="rd-crumb"><b>Tricks 3</b> Uses DPO from page 6. Pieced together from code comments; no paper describes it.</p>

## What were the training stages?

1. 💻 **S1: packing fixed.** One training row holds one speaker only; unrelated clips never share a row (§code packing_v2.py:3).
2. 💻 **S2: the depth decoder with speaker memory.** Voice enters the depth decoder only; roll-in starts (§code tts_model_v2.py:1).
3. 💻 **S3: anchor and corrupted history.** Warm-started from S2, all additions start switched off (§code tts_model_v2.py:13).
4. **Then DPO.** Candidates ranked by ASR agreement and speaker similarity (§card Training).
5. **Undisclosed: data and compute.** Hours, sources, steps and the full configuration are not released (§card Training).

<p class="rd-cap">Stage names come from code comments, read by us. The card names only the DPO stage. Bar lengths are not durations.</p>

<p class="rd-take"><b>Three supervised stages, then preference tuning.</b> The data behind them is unknown.</p>

</article>

<article class="rd-page" id="stop" data-part="Speaking safely" data-draw="stop" markdown>

<p class="rd-crumb"><b>Safe 1</b> Uses the end-of-audio class from page 12.</p>

## How does it know when to stop?

1. **Sampling stop leaves babble tails.** If end-of-audio is one class in the draw, a near-miss keeps talking (§code s2_serve_controls.py:6).
2. **So it is taken out of the draw.** Codebook 0 is sampled without it; the stop is decided separately (§code engine.py:653).
3. **Three stop rules.** End-of-audio is the top class, or its probability ≥ 0.35, or the running hazard ≥ 0.6.
4. **Hazard adds up small chances.** 1 − Π(1 − p): many frames at 0.1 add up. Move the slider.
5. **Never too early.** Rules start after half the expected length. For our sentence, 33 frames (§code engine.py:413).

<p class="rd-cap">Thresholds are real (§code engine.py:681). The 33 frames uses the Telugu prior on our raw 84-character text. The p(stop) curve is illustrative.</p>

<p class="rd-take"><b>Stopping is a decision rule on top of the model, not a sample.</b></p>

</article>

<article class="rd-page" id="cb0-sampler" data-part="Speaking safely" data-draw="cb0-sampler" markdown>

<p class="rd-crumb"><b>Safe 2</b> Uses codebook 0 from page 12.</p>

## Why penalise codes it used recently?

1. **Codebook 0 is sampled warm.** Temperature 0.9, top-64 (§code engine.py:58).
2. **Recent codes get a penalty.** Any code seen in the last 12 frames loses 0.8 from its logit (§code engine.py:61).
3. 🧠 **That pushes it out of ruts.** A stuck code is a stalled sound; the penalty nudges it on.
4. **It nearly removed non-stopping.** On raw text, runs that never stopped fell from 0.79% to 0.07% (§code engine.py:57).
5. **Depth levels are cooler.** Temperature 0.7, top-64, no penalty (§code engine.py:54).

<p class="rd-cap">Settings and the 0.79% → 0.07% sweep result are from code comments (§code engine.py:56). The logits drawn are illustrative.</p>

<p class="rd-take"><b>A presence penalty on codebook 0 is the cheapest anti-loop tool.</b></p>

</article>

<article class="rd-page" id="duration-cap" data-part="Speaking safely" data-draw="duration-cap" markdown>

<p class="rd-crumb"><b>Safe 3</b> Our sentence, live. What if it never predicts stop?</p>

## How long is too long?

1. **Predict the length from the text.** Telugu: 0.45 s + 0.073 s per letter + 0.46 s per pause + 0.40 s per digit (§code duration_prior.json).
2. **Our raw sentence: 8.86 s.** 63 letters, 4 pauses, 5 digits. The real clip was 8.64 s.
3. **Cap at 2.2× plus 1.2 s.** That gives 258 frames, 20.6 s (§code guards.py:51).
4. **Move the sliders.** Longer text, more digits: the cap grows.
5. **And never past 120 s.** An absolute ceiling of 1,500 frames per piece (§code engine.py:63).

<p class="rd-cap">Coefficients are the Telugu row of duration_prior.json. Counts are on our raw text; the engine measures the normalised text, which is longer.</p>

<p class="rd-take"><b>A per-language length prior caps every utterance.</b> Runaway speech ends at 2.2× expected.</p>

</article>

<article class="rd-page" id="loop-guard" data-part="Speaking safely" data-draw="loop-guard" markdown>

<p class="rd-crumb"><b>Safe 4</b> Uses codebook 0 from page 12 and the stop rules from page 24.</p>

## What stops a runaway loop?

1. **Watch codebook 0's tail.** Every 2 frames from frame 32, check the last 96 codes (§code guards.py:7).
2. **Stall: 32 identical codes.** One sound held for 2.6 s.
3. **Loop: a repeating period.** Codes match those p frames back, 70% of the last 64, for p from 2 to 16.
4. **First, nudge it to finish.** Add +4 to the end-of-audio logit, so the model ends the phrase itself.
5. **Then cut.** Still looping 24 frames later? Stop. Windows around tags like `[laughs]` are exempt (§code guards.py:119).

<p class="rd-cap">All thresholds are real (§code guards.py). The code sequence drawn is synthetic, built to trip the period rule.</p>

<p class="rd-take"><b>Loops are caught on codebook 0, nudged first, cut second.</b></p>

</article>

<article class="rd-page" id="long-text" data-part="Speaking safely" data-draw="long-text" markdown>

<p class="rd-crumb"><b>Safe 5</b> Uses drift from page 22. What about a two-minute paragraph?</p>

## What happens to a long paragraph?

1. **Split at sentence ends.** Pieces of about 20 s, estimated by the length prior (§code engine.py:71).
2. **Each piece starts fresh.** A new backbone context with the same voice prompt (§README Text).
3. **Not on its own last output.** Re-prompting on its own audio carried drift forward: high-frequency noise rose from 0.5% to 8.4% (§code s2_serve_controls.py:55).
4. **150 ms of silence between pieces.** Streamed back to back (§code engine.py:70).
5. 🧠 **The price: prosody resets.** Each piece is read without hearing the last.

<p class="rd-cap">Piece length, gap and the 0.5% → 8.4% short test are from the code (§code). The paragraph drawn is schematic.</p>

<p class="rd-take"><b>Long text is many short utterances, each started clean.</b></p>

</article>

<article class="rd-page" id="frame-budget" data-part="Serving" data-draw="frame-budget" markdown>

<p class="rd-crumb"><b>Serving 1</b> Uses the whole machine from page 7. The Qwen3-TTS Engine lesson covers these tricks in depth.</p>

## Where do the 10.5 ms of one frame go?

1. **Each frame must beat 80 ms.** Slower than that and playback stalls.
2. **One stream on an H100: 10.5 ms.** Backbone 2.0, sampler 0.35, depth 6.5, Mimi 1.8 (§ENGINE Measured).
3. **The depth decoder is the bottleneck.** 31 levels run one after another, inside every frame.
4. **Batching hides it.** 100 streams take 23.7 ms per frame; 160 take 30 ms. Toggle the batch.
5. **Real time with room to spare.** 7× faster than playback for one stream, RTF 0.137.

<p class="rd-cap">Timings are the engine docs' H100 measurements on a pre-release checkpoint with the same architecture (§ENGINE Measured). The B=100 and B=160 splits by part are not reported.</p>

<p class="rd-take"><b>62% of a frame's time is the depth decoder.</b> Batching turns that into throughput.</p>

</article>

<article class="rd-page" id="tick" data-part="Serving" data-draw="tick" markdown>

<p class="rd-crumb"><b>Serving 2</b> Continues page 29.</p>

## How do 224 streams share one GPU?

1. **One tick, one frame for every seat.** Each active stream holds a fixed seat with its own cache (§code engine.py:3).
2. **New requests join mid-tick.** Their text is prefilled in the same step as everyone's decoding. Voice prefixes come from cache.
3. **Everything hot is a CUDA graph.** Backbone, sampler, depth decoder and Mimi replay as captured graphs.
4. **One copy to the CPU per tick.** Then guards and delivery run on the host.
5. **On one H100 NVL: 224 streams.** 323 s of audio per second, first audio p50 111 ms, zero stalls (§card Streaming).

<p class="rd-cap">Design from the engine docstring (§code engine.py:3); load numbers from the card's run of all 6,000 benchmark texts (§card Streaming).</p>

<p class="rd-take"><b>Continuous batching plus graphs: one GPU, 224 voices at once.</b></p>

</article>

<article class="rd-page" id="memory" data-part="Serving" data-draw="memory" markdown>

<p class="rd-crumb"><b>Serving 3</b> Will it run on your machine?</p>

## How much GPU memory does it need?

1. **Weights: 5.6 GB.** bf16 backbone plus fp16 depth decoder, as served (§ENGINE Hardware).
2. **Each seat reserves a cache.** 112 KiB per token for up to 2,048 tokens: 28 layers × 8 heads × 128 × 2 × 2 bytes.
3. **One seat: 7.7 GB, peaking at 9.2.** Plus about 0.5 GB of CUDA context. Move the slider.
4. **A 24 GB RTX 4090 serves 48.** 96 with half the cache (§ENGINE Hardware).
5. **Our 6 GB laptop GPU can't.** So we did not run the model.

<p class="rd-cap">Memory points are the docs' measurements (§ENGINE Hardware); the line joins them. The 112 KiB is our check of the docs' figure from the config.</p>

<p class="rd-take"><b>Plan on 12 GB for one stream, 24 GB for dozens.</b></p>

</article>

<article class="rd-page" id="cer-lang" data-part="Does it work?" data-draw="cer-lang" data-fast markdown>

<p class="rd-crumb"><b>Results 1</b> The card's own benchmark: 6,000 held-out texts, 500 per language.</p>

## Is the speech intelligible in every language?

1. **Three ASR judges transcribe it.** Character error rate (CER) against the spoken-form text (§card Evaluation).
2. **Hindi and Marathi are best.** About 1.5–2% CER under all three judges.
3. **Telugu: 2.3–2.6%.** Among the better half. Kannada and Gujarati are similar.
4. **Tamil, Malayalam, Odia: 3.5–4.6%.** Harder, but under 5%.
5. **Assamese is worst: 5.4–6.6%.** The language with no built-in voice trained on it (page 19). Toggle the judges.

<p class="rd-cap">CER values are the card's per-language table, scorer v1 (§card Results by language). Bars are sorted by Qwen3-ASR.</p>

<p class="rd-take"><b>Under 5% CER everywhere except Assamese.</b> Telugu is solid on this benchmark.</p>

</article>

<article class="rd-page" id="judges" data-part="Does it work?" data-draw="judges" markdown>

<p class="rd-crumb"><b>Results 2</b> Continues page 32. Why does English look bad under one judge?</p>

## Why do three ASR judges disagree?

1. **English: 9.69% vs 1.43%.** Maya's in-house ASR-1 against its held-out ASR-2, same audio (§card Results by language).
2. **ASR-1 loops on URLs.** "W W W" inflates its errors (§card Results by language).
3. **Script spelling is another trap.** An English word inside Telugu may be written in either script. Both are right.
4. **Scorer v2 accepts both.** Overall CER falls from 3.49% to 2.35% for ASR-1. Toggle the scorer.
5. **Code-mix drops most.** Heavy code-mix: 16.74% to 4.11% (§card Harder inputs).

<p class="rd-cap">All numbers from the card (§card Evaluation, Harder inputs). v1 and v2 score the same audio.</p>

<p class="rd-take"><b>Much of the "error" on mixed text is how the transcript is spelled.</b></p>

</article>

<article class="rd-page" id="failures" data-part="Does it work?" data-draw="failures" markdown>

<p class="rd-crumb"><b>Results 3</b> Uses the guards from pages 26–27.</p>

## How often does it fail outright?

1. **A failure needs two judges to agree.** Looping, big insertions, very high CER or a duration cap (§card Failures).
2. **0.15% of clips.** 0.03% with scorer v2: about 2 of 6,000.
3. **Loops 0.02%, truncations 0.13%.** No clip hit the absolute length cap.
4. **No voice name spoken aloud.** A risk of name prompts: 0 of 6,000 (§card Failures).
5. **Hard inputs remain hard.** Web addresses: 29% CER under scorer v1, 20% under v2 (§card Harder inputs).

<p class="rd-cap">Rates from the card's release measurements (§card Failures and voice consistency). Counts out of 6,000 are our arithmetic.</p>

<p class="rd-take"><b>Outright failures are rare; URLs and symbols are the weak spot.</b></p>

</article>

<article class="rd-page" id="identity" data-part="Does it work?" data-draw="identity" markdown>

<p class="rd-crumb"><b>Results 4</b> Uses nearest-centroid identity from page 5 and cross-lingual voices from page 19.</p>

## Does each voice stay itself?

1. **98.6% land on the right voice.** Nearest of 20 centroids, clips of at least 1 s (§card Failures).
2. **Cross-lingual holds up.** 98.9% in trained languages, 98.8% outside them (§card Failures).
3. **Real recordings score 98.0%.** The classifier is that good on the source voices themselves.
4. **Assamese is lowest: 96.4%.** Every voice is cross-lingual there (§card Results by language).
5. 🧠 **This is not clone similarity.** It picks among 20 known voices. Accent drift can pass it.

<p class="rd-cap">Identity rates are the card's (§card). The card warns these are task-specific, not evidence of more naturalness than real speech.</p>

<p class="rd-take"><b>Built-in voices stay recognisable across languages.</b> Accent is not measured.</p>

</article>

<article class="rd-page" id="arena" data-part="Does it work?" data-draw="arena" markdown>

<p class="rd-crumb"><b>Results 5</b> The only human judgement in the release: blind votes on VoiceArena.</p>

## How does it rank against commercial voices?

1. **People pick the better of two clips.** Many votes become a **Bradley–Terry Elo** score.
2. **Hindi, real-time models: #2.** 1047 ± 11, after Cartesia Sonic-3.6 at 1094 (§card VoiceArena).
3. **Its rank interval is 2–4.** Sonic-3.5 and Lightning 3.1 Pro overlap it.
4. **Ahead of Bulbul-V3 by 90 points.** Sarvam's Indic model scores 957 ± 9.
5. 🧠 **Hindi only, checkpoint unknown.** The arena dates the entry to July 2026, before the 1.0 release.

<p class="rd-cap">Elo scores and 95% intervals are the card's copy of the leaderboard, checked October 27, 2026 (§card VoiceArena). No Telugu leaderboard is reported.</p>

<p class="rd-take"><b>On Hindi, listeners rank it near the top commercial voices.</b></p>

</article>

<article class="rd-page" id="code-map" data-part="Your move" data-draw="code-map" markdown>

<p class="rd-crumb"><b>Move 1</b> Every part from the machine pages, located at commit c6b3768.</p>

## Where is each part in the code?

1. 💻 **The model: `tts/model/`.** Backbone wrapper, audio input, depth decoder, speaker anchor, history corruption.
2. 💻 **The prompt: `maya3/prompt.py`.** Reuses the training packer in `tts/data/packing_v2.py`, so prompts match training token for token.
3. 💻 **Stopping and guards.** `maya3/engine.py` (controlled stop, sampler) and `maya3/guards.py` (cap, loop guard).
4. 💻 **Speed: `serve/`.** Graphed backbone step, fp16 depth decoder, one-frame Mimi decoder.
5. 💻 **Missing: training.** The training loop, data, DPO and evaluation scripts are referenced but not shipped.

<p class="rd-cap">Paths read by us at commit c6b3768 (Apache-2.0). Code size is our line count of the .py files.</p>

<p class="rd-take"><b>You can read the model and serve it; you can't retrain it from this repo.</b></p>

</article>

<article class="rd-page" id="running" data-part="Your move" data-draw="running" markdown>

<p class="rd-crumb"><b>Move 2</b> The card's quick start, with our running example.</p>

## What does running it look like?

1. **Install from GitHub.** Linux, Python 3.10–3.12, a CUDA 12.8 driver (§card Quickstart).
2. **Load with one seat.** `max_seats=1` keeps the peak near 9.2 GB.
3. **Pass language, voice and `normalize=True`.** Without it, Python reads digits raw.
4. **Get 24 kHz float audio back.** Or `stream()` int16 chunks as frames finish.
5. **What we ran: tokenizers only.** Our GPU has 6 GB, and running repo code was not permitted here. The clips on page 1 are the card's.

<p class="rd-cap">The snippet is the card's Python example with our sentence (§card Quickstart). We did not execute it.</p>

<p class="rd-take"><b>Five lines and a 12 GB GPU get you Telugu speech.</b></p>

</article>

<article class="rd-page" id="reviewer" data-part="Your move" data-draw="reviewer" markdown>

<p class="rd-crumb"><b>Move 3</b> Questions for a release with no paper.</p>

## What would a careful reviewer question?

1. **Is the judge also the teacher?** ASR-2 is "held out from training, reward generation, and checkpoint selection". So ASR-1 likely was not (§card Benchmark design).
2. **Where are the baselines?** No other TTS was run on bench6k. The card says so (§card Limitations).
3. **Where is a human study?** Only Hindi arena votes, for an earlier checkpoint.
4. **What data is inside?** Licensed and synthetic speech, hours undisclosed. Built-in voices are partly synthetic (§card Training).
5. **How good are clones?** No cloning benchmark at all (§card Clone).
6. 🧠 **Steelman: the card is unusually candid.** It reports judge disagreement, hard categories and its own gaps.

<p class="rd-cap">Each point cites the card's own wording. The ASR-1 inference in row 1 is ours.</p>

<p class="rd-take"><b>Honest numbers, but self-graded, and partly by the model's own reward judge.</b></p>

</article>

<article class="rd-page" id="compare" data-part="Your move" data-draw="compare" markdown>

<p class="rd-crumb"><b>Move 4</b> Uses the OmniVoice and VoxCPM2 lessons on this site.</p>

## How does it differ from OmniVoice and VoxCPM2?

1. **Maya writes codes one frame at a time.** Coarse code from the backbone, 31 more from depth. It streams naturally.
2. **OmniVoice unmasks a whole grid.** Eight codebooks filled together in 32 passes, length fixed up front (OmniVoice lesson).
3. **VoxCPM2 draws continuous patches.** 160 ms latent patches with a small diffusion model (VoxCPM2 lesson).
4. **Telugu: two trained, one not.** Maya and OmniVoice train on Telugu; VoxCPM2 has Hindi as its only Indic language.
5. **Licences differ.** Maya and VoxCPM2 are Apache-2.0; OmniVoice weights are CC-BY-NC.

<p class="rd-cap">OmniVoice and VoxCPM2 facts are from their lessons on this site and their own sources. CERs are on different test sets, so the board shows no shared score.</p>

<p class="rd-take"><b>Maya is the streaming, Apache-licensed, Indic-first option of the three.</b></p>

</article>

<article class="rd-page" id="verdict" data-part="Your move" data-draw="verdict" data-fast markdown>

<p class="rd-crumb"><b>Move 5</b> The verdict for a Telugu voice agent or dubbing pipeline.</p>

## Should Maya 2 Native be your Telugu voice?

1. **Intelligibility: yes.** Telugu CER 2.29–2.64% on 500 held-out texts (§card Results by language).
2. **Agents: yes.** 14 ms to first audio alone, 224 streams per H100, Apache-2.0 (§card Streaming).
3. **Your own Telugu voice: test first.** Cloning is unmeasured. Sreekar is the only built-in voice trained on Telugu among the conversational ten (§card Voices).
4. **Dubbing emotion: not yet.** Emotion tags are best effort; no style control (§card Limitations).
5. **Fine-tuning: on your own.** No training code ships.
6. 🧠 **Verdict: the default Telugu agent voice.** For dubbing, pair it with VoxCPM2-style control later.

<p class="rd-cap">Numbers from the card. The "conversational ten" are the voices whose card profile says natural conversational style. The verdict is ours.</p>

<p class="rd-take"><b>Use it today for Telugu agents and narration; test clones; don't expect acting.</b></p>

</article>

<article class="rd-page" id="try-next" data-part="Your move" data-draw="try-next" markdown>

<p class="rd-crumb"><b>Move 6</b> Weekend-sized experiments. Placement on the map is our guess.</p>

## What could you try next?

1. 🧠 **Score clones yourself.** Ten Telugu speakers, 5 s references, ECAPA similarity and your ASR's CER.
2. 🧠 **Stress the normaliser.** Feed Telugu bank and phone-number text; diff `normalise_text` against what a human would read.
3. 🧠 **Toggle the guards.** Count loops and cuts on long Telugu paragraphs with guards on and off.
4. 🧠 **Fewer depth levels.** Decode with 16 or 24 codebooks; measure speed and CER (§code tokens.py:21).

<p class="rd-cap">Ideas are ours. The 16/24-level early exit is allowed by a code comment, not tested by us.</p>

<p class="rd-take"><b>Start with clone scoring: it is the release's biggest unmeasured claim.</b></p>

</article>

<article class="rd-page" id="check-depth" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 1</b> From pages 3, 12 and 13.</p>

## For our 108-frame clip, which part writes codebook 0?

- [ ] The depth decoder, as its first level
- [x] The backbone's 2,049-way head, once per frame
- [ ] Mimi's encoder, copied from the reference clip
- [ ] The text head, as a special token

<p class="rd-take"><b>The backbone writes codebook 0 (or stop) once per frame.</b> The depth decoder writes levels 1–31 from the backbone's state (page 13).</p>

</article>

<article class="rd-page" id="check-anchor" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 2</b> From pages 16 and 17.</p>

## Why was the speaker anchor added to the backbone?

- [ ] The depth decoder had no way to receive the voice
- [ ] To replace the ECAPA memory in the depth decoder
- [x] The backbone's codebook-0 loss did not change when given a speaker
- [ ] To let users type the voice name into the text

<p class="rd-take"><b>The backbone was voice-blind.</b> Its codebook-0 loss was identical with and without a speaker, so a zero-initialised anchor added the voice at `<|audio|>`, keeping the depth memory too.</p>

</article>

<article class="rd-page" id="check-corrupt" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 3</b> From pages 4 and 22.</p>

## In history corruption, what is corrupted?

- [ ] The training targets, so the model learns to denoise
- [ ] The reference clips, so cloning is more robust
- [x] The target span's past frames as the backbone reads them; labels stay clean
- [ ] The text tokens, to simulate normaliser errors

<p class="rd-take"><b>Only the history input is broken.</b> Reference clips and every label stay untouched, so the model learns to predict clean audio from untrustworthy history.</p>

</article>

<article class="rd-page" id="check-judge" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 4</b> Spot the flaw. From pages 33 and 39.</p>

## Which claim does the release evidence support best?

- [ ] Maya is more intelligible than Bulbul-V3 in Telugu
- [ ] English is Maya's weakest language, at 9.69% CER
- [ ] Cloned voices match their reference at 98.8%
- [x] Its Telugu CER is under 3% for all three ASR judges on its own benchmark

<p class="rd-take"><b>Telugu CER is 2.29–2.64% under all three judges.</b> No Telugu comparison exists; 9.69% is one judge looping on URLs; 98.8% is closed-set identity of built-in voices, not clone similarity.</p>

</article>
