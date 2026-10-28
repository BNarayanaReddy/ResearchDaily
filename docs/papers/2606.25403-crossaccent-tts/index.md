---
title: "CrossAccent-TTS"
paper_title: "CrossAccent-TTS: Cross-Lingual Accent-Intensity Controllable Text-to-Speech via Disentangled Speaker and Accent Representations"
authors: ["Ram Annamdevula", "Ankit Tatawat", "Ashishkumar P. Gudmalwar", "Nirmesh J. Shah", "Pankaj Wasnik"]
year: 2026
venue: "Interspeech 2026"
arxiv_id: "2606.25403"
arxiv_version: v1
paper_type: method
hook: "Clone a Telugu speaker's voice into Hindi and their accent comes along. What if you could turn that accent down, or up, with one number?"
big_idea: "CrossAccent-TTS scrubs language from a codec-LM voice prompt with a gradient reversal layer, then adds a learned language embedding back to every voice slot, so mixing two language embeddings with a weight λ sets accent strength at inference."
goal: "Dub a Telugu speaker into Hindi with an accent strength you choose."
difficulty: 2
difficulty_note: "Home turf: codec-token TTS, speaker prompts, accent. New: gradient reversal for disentanglement and a Perceiver bottleneck, each on its own page."
date_added: 2026-10-28
tags: [Speech, TTS, Multilingual, Generative models]
description: "Clone a Telugu speaker's voice into Hindi and their accent comes along. What if you could turn that accent down, or up, with one number?"
---

<article class="rd-page" id="leak" data-part="Toolbox" data-draw="leak" data-fast markdown>

<p class="rd-crumb"><b>Toolbox 1</b> Start here. Running example (ours): Priya's 5-second Telugu clip, made to speak Hindi.</p>

## Why does a cloned voice keep its accent in another language?

1. **Clone from one short clip.** Zero-shot TTS turns Priya's reference clip into a voice prompt, then speaks any text with it.
2. **The prompt holds everything.** Timbre, pitch range and accent all sit in the same embedding. Accent is woven into individual speech patterns (§1, §2).
3. **So Telugu leaks into Hindi.** Ask for Hindi and the Telugu accent comes along. The paper calls this **accent leakage** (§4.3.1).
4. **Sometimes you want some of it.** A dubbed character may sound right with an L2 accent. Too much hurts intelligibility (§1).
5. **The goal: separate, then dial.** Strip the accent from the voice, then add back exactly the accent you ask for.

<p class="rd-cap">The leakage problem and dubbing motivation are the paper's (§1). Priya and her clip are our illustration.</p>

<p class="rd-take"><b>A voice prompt carries accent whether you want it or not.</b> Next: the trick that makes an encoder forget something.</p>

</article>

<article class="rd-page" id="grl" data-part="Toolbox" data-draw="grl" markdown>

<p class="rd-crumb"><b>Toolbox 2</b> The tool page 6 uses to strip accent out.</p>

## How do you train an encoder to forget something?

1. **Add a spy classifier.** A small head reads the encoder's output and tries to guess a label, here the language.
2. **The spy learns normally.** Its gradient pushes it to guess better, like any classifier.
3. **Flip the sign on the way back.** A **gradient reversal layer** (GRL) does nothing going forward. Going backward, it multiplies the gradient by −λ.
4. **The encoder now helps the spy fail.** Each update moves the encoder toward outputs the spy can't read. Watch the gradient flip.
5. **A tug-of-war with one winner.** If the encoder wins, the label is no longer readable from its output.

<p class="rd-cap">The GRL mechanism is standard; the gradient values are illustrative. The scale matches this paper's λ = 0.1 (§4.2).</p>

<p class="rd-take"><b>A GRL turns "predict the label" into "hide the label" for everything before it.</b> Next: the whole machine.</p>

</article>

<article class="rd-page" id="machine" data-part="The machine" data-draw="machine" data-fast markdown>

<p class="rd-crumb"><b>Machine 1</b> Uses the leakage problem from page 1.</p>

## What is the whole CrossAccent-TTS machine?

1. **Reference audio becomes codec tokens.** Neucodec turns Priya's clip into discrete tokens (§3.1).
2. **A Perceiver squeezes the voice.** Any number of tokens becomes a fixed set of voice slots (§3.2.1).
3. **A GRL scrubs language out.** Training only: a classifier tries to read the language from the slots (§3.2.2).
4. **A language embedding goes back in.** Added to every slot; at inference, two can be mixed (§3.2.3, Eq. 2).
5. **Qwen writes speech tokens.** A 0.5B decoder reads slots plus text and predicts codec tokens. Neucodec decodes them (§3.3).

<p class="rd-cap">Component names and order follow the paper's Fig. 1; this drawing is our own redraw. The dashed part runs only in training.</p>

<p class="rd-take"><b>Squeeze, scrub, re-add, decode.</b> The accent dial lives in step 4. Next: what Priya's clip becomes.</p>

</article>

<article class="rd-page" id="tokens" data-part="The machine" data-draw="tokens" markdown>

<p class="rd-crumb"><b>Machine 2</b> Follows Priya's clip into the first box of page 3.</p>

## What does the reference clip become?

1. **Resample to 16 kHz.** Neucodec's encoder takes 16 kHz audio (§3.1). All training audio is resampled to match (§4.1.1).
2. **Fifty tokens a second.** Each token is one of 2¹⁶ codes from **finite scalar quantization** (FSQ) (§3.1). Move the slider. [[50 /s | Neucodec tokens, 16 bits each]]
3. **Training takes a random chunk.** Only part of each reference is used, so the voice encoder can't memorize the words (§3.1).
4. **Output comes back at 24 kHz.** The same codec's decoder upsamples when it turns predicted tokens into audio (§3.1).

<p class="rd-cap">Token rate, bits and sample rates are real (§3.1). The chunk length is not reported, so its width here is illustrative.</p>

<p class="rd-take"><b>Priya's 5 seconds become 250 tokens.</b> Next: how 250, or any count, becomes a fixed size.</p>

</article>

<article class="rd-page" id="perceiver" data-part="The machine" data-draw="perceiver" markdown>

<p class="rd-crumb"><b>Machine 3</b> Takes the 250 tokens from page 4.</p>

## How do 250 tokens become 32 voice slots?

1. **Embed and add positions.** Tokens get embeddings plus learnable positional encodings (§3.2.1).
2. **32 learned queries.** The **Perceiver Resampler** keeps 32 latent slots of width 768 (§4.2).
3. **Slots read all tokens.** Cross-attention lets each slot pull from the whole clip. Self-attention then mixes the slots (§3.2.1).
4. **Same size for any clip.** Move the slider: the output stays 32 × 768. [[32 × 768 | voice slots, any clip length]]
5. **A small box keeps the voice.** The bottleneck limits capacity, nudging slots toward timbre over phonetic content (§3.2.1).

<p class="rd-cap">Slot count, width and the mechanism are real (§3.2.1, §4.2). Attention lines are illustrative.</p>

<p class="rd-take"><b>A fixed bottleneck favours who is speaking over what they said.</b> But accent can still slip through. Next: scrubbing it.</p>

</article>

<article class="rd-page" id="scrub" data-part="The machine" data-draw="scrub" data-fast markdown>

<p class="rd-crumb"><b>Machine 4</b> Applies the GRL from page 2 to the slots from page 5.</p>

## How is the accent scrubbed out of the voice slots?

1. **A spy reads the slots.** An auxiliary classifier predicts the language or accent label from the 32 slots (§3.2.2).
2. **Six labels in the Indic run.** Hindi, Telugu, Tamil, Bengali, Marathi, English (§4.1.1). L2-ARCTIC adds six accent backgrounds (§4.1.2).
3. **The GRL sits in between.** The Perceiver is pushed to maximise the spy's error (§3.2.2).
4. **One weighted loss.** Decoder loss plus 0.1 times the classifier loss (Eq. 1, §4.2). Slide λ to see the mix.
5. **🧠 Not measured directly.** The spy's final accuracy is not reported, so we can't see how much language remains.

<p class="rd-cap">Labels, λ = 0.1 and Eq. 1 are real (§3.2.2, §4.1, §4.2). Loss values are illustrative.</p>

<p class="rd-take"><b>The voice slots are trained to say who, not which language.</b> Next: putting a chosen accent back.</p>

</article>

<article class="rd-page" id="langemb" data-part="The machine" data-draw="langemb" markdown>

<p class="rd-crumb"><b>Machine 5</b> Adds to the scrubbed slots from page 6.</p>

## How does a chosen accent go back in?

1. **One learned row per language.** A plain embedding table gives a vector of shape (B, 1, d) (§3.2.3).
2. **Copy it to every slot.** The row is expanded across all 32 slots (§3.2.3).
3. **Add, don't append.** Each slot becomes voice plus language, still (B, 32, 768) (§3.2.3).
4. **Every slot carries the accent.** The paper says this raises the language's relative influence on the decoder (§3.2.3).

<p class="rd-cap">Shapes and the expand-and-add are real (§3.2.3, §4.2). Cell colours are illustrative.</p>

<p class="rd-take"><b>Accent becomes a vector you add, not a property of the clip.</b> Next: mixing two of them.</p>

</article>

<article class="rd-page" id="dial" data-part="The machine" data-draw="dial" data-fast markdown>

<p class="rd-crumb"><b>Machine 6</b> Mixes two rows of the table from page 7.</p>

## How does one number set accent strength?

1. **Pick two language rows.** Say Telugu and Hindi, for Priya's Hindi line. Fig. 1 feeds a target language and an intensity at inference.
2. **Mix them with λ.** The condition is \(\lambda e_1 + (1-\lambda) e_2\), with λ between 0 and 1 (Eq. 2).
3. **Slide λ and watch it move.** The mixed vector travels along the line between the two rows.
4. **Inference only.** Training sees one language per clip. The mix is new at test time (§4.2, Fig. 1).
5. **🧠 Which end is which?** The paper calls the weight "accent intensity" but doesn't say which language is \(e_1\). We put the accent you dial toward there.

<p class="rd-cap">Eq. 2 is real. The two 3-number vectors are made-up stand-ins for the 768-wide rows.</p>

<p class="rd-take"><b>Accent strength is a straight-line blend of two learned vectors.</b> Page 15 shows whether listeners' ears agree.</p>

</article>

<article class="rd-page" id="decoder" data-part="The machine" data-draw="decoder" markdown>

<p class="rd-crumb"><b>Machine 7</b> Feeds the mixed slots from page 8 to the decoder.</p>

## What does the decoder read and write?

1. **Text becomes IPA.** Priya's Hindi line is converted to phonemes and tokenized (§4.2).
2. **Slots and text go in.** The 32 condition slots join the text embeddings (Fig. 1, §3.3).
3. **Qwen 2.5 (0.5B) writes tokens.** One codec token at a time, until an end token (§3.3).
4. **Three seconds, 150 tokens.** At 50 tokens per second (§3.1). Move the slider for longer lines.
5. **Neucodec turns them into audio.** Its decoder outputs a 24 kHz waveform (§3.1, §4.2).

<p class="rd-cap">Decoder, IPA input and token rate are real (§3.1, §3.3, §4.2). The phoneme tokens shown are illustrative.</p>

<p class="rd-take"><b>A small LLM writes codec tokens, steered by 32 accent-tinted voice slots.</b> Next: what it learned from.</p>

</article>

<article class="rd-page" id="train" data-part="The machine" data-draw="train" markdown>

<p class="rd-crumb"><b>Machine 8</b> How the parts on pages 3–9 were trained.</p>

## What was it trained on, and for how long?

1. **636 hours of in-house Indic speech.** Six languages: Hindi, Telugu, Tamil, Bengali, Marathi, English (§4.1.1).
2. **Plus 350 hours from Emilia-YODAS.** A custom split, for about 986 hours in total (§4.1.1). [[986 h | multilingual training audio]]
3. **Five epochs, end to end.** Decoder starts from Qwen 2.5 (0.5B); classifier trains jointly (§4.2).
4. **Then L2-ARCTIC, three more epochs.** 27 hours, 24 speakers, six accent backgrounds, with a lower learning rate (§4.1.2, §4.2).
5. **Not reported.** Batch size, learning rates, GPUs and training time are not given.

<p class="rd-cap">Hours, speakers and epochs are real (§4.1, §4.2). Bar lengths are to scale.</p>

<p class="rd-take"><b>About a thousand hours, mostly in-house, then a small English-accent top-up.</b> Next: how accent gets scored.</p>

</article>

<article class="rd-page" id="metrics" data-part="Does it work?" data-draw="metrics" markdown>

<p class="rd-crumb"><b>Results 1</b> The yardstick for pages 12–14.</p>

## How do you score an accent with a number?

1. **An accent model makes embeddings.** GenAID, from Accent Box, maps speech to an accent vector (§4.3.1).
2. **Retuned for India by the authors.** About 100k clips, 11 languages and 3,300 speakers from IndicVoices, two epochs (§4.3.1).
3. **Accent similarity: closer to target.** Cosine between generated speech and real target-accent speech. Higher is better (§4.3.1).
4. **Accent leakage: closer to reference.** Cosine between generated speech and the reference clip. Lower is better (§4.3.1).
5. **Plus voice and quality.** Resemblyzer cosine for speaker similarity; UTMOS for quality (§4.3.1).

<p class="rd-cap">Metric definitions are real (§4.3.1). The arrows are illustrative 2-D stand-ins for accent embeddings.</p>

<p class="rd-take"><b>Want high similarity to the target and low similarity to the source.</b> Next: the Indic numbers.</p>

</article>

<article class="rd-page" id="indic" data-part="Does it work?" data-draw="indic" data-fast markdown>

<p class="rd-crumb"><b>Results 2</b> Scored with page 11's metrics.</p>

## Does it beat IndicF5 and XTTS-v2 on Indian accents?

1. **Least leakage.** 0.203 against 0.284 for XTTS-v2 and 0.312 for IndicF5 (Table 1).
2. **Highest accent similarity.** 0.371, against at most 0.312 (Table 1).
3. **Voice kept.** Speaker similarity 0.842, level with IndicF5's 0.843 (Table 1).
4. **Quality on par.** UTMOS 3.181 against XTTS-v2's 3.168 (Table 1).
5. **🧠 Odd baseline rows.** Each baseline's leakage equals its similarity to three decimals. The paper doesn't explain why.

<p class="rd-cap">All numbers are from Table 1. Language pairs and test size are not reported.</p>

<p class="rd-take"><b>Less leakage and more target accent, without losing the voice.</b> Next: the English-accent test.</p>

</article>

<article class="rd-page" id="arctic" data-part="Does it work?" data-draw="arctic" markdown>

<p class="rd-crumb"><b>Results 3</b> Same metrics as page 12, on L2-ARCTIC.</p>

## Does it hold on foreign English accents?

1. **Quality jumps.** UTMOS 4.001, against 3.044 for the best baseline, GST (Table 2).
2. **Least leakage again.** 0.439, against 0.487–0.544 (Table 2).
3. **Accent similarity just ahead.** 0.686 against GST's 0.670 (Table 2).
4. **Speaker similarity is lower.** 0.693 against GST's 0.732. The text calls this comparable (§4.4.1).

<p class="rd-cap">All numbers are from Table 2. Baselines are CVAE-L, CVAE-NL and GST (§2).</p>

<p class="rd-take"><b>Clear wins on quality and leakage; a small loss on voice match.</b> Next: does the dial actually turn?</p>

</article>

<article class="rd-page" id="dialres" data-part="Does it work?" data-draw="dialres" data-fast markdown>

<p class="rd-crumb"><b>Results 4</b> Tests the λ dial from page 8.</p>

## Does turning the dial change the accent?

1. **Four settings tested.** Intensity 0, 0.3, 0.6 and 1.0, from cross-lingual references (§4.5).
2. **Similarity rises every time.** 0.203, 0.247, 0.336, 0.371 (Fig. 4). Move the slider.
3. **Not a straight line.** The biggest jump is 0.3 → 0.6. The last step adds only 0.035.
4. **🧠 The ends match Table 1.** 0.203 is Table 1's leakage; 0.371 its accent similarity. Likely the same runs.

<p class="rd-cap">Bar values are real (Fig. 4). Values between tested points are not measured; the slider snaps to them.</p>

<p class="rd-take"><b>The dial works and is monotonic, on one metric.</b> Next: what listeners heard.</p>

</article>

<article class="rd-page" id="mos" data-part="Does it work?" data-draw="mos" markdown>

<p class="rd-crumb"><b>Results 5</b> Human ears check pages 12–14.</p>

## Do listeners hear the target accent too?

1. **Twenty listeners.** Aged 23 to 35, no known hearing impairments (§4.3.2).
2. **Indic accents: 70.7.** Against 50.1 for XTTS-v2 and 47.1 for IndicF5 (Fig. 2).
3. **Foreign accents: 70.2.** Against 45 to 50.1 for the three baselines (Fig. 3).
4. **🧠 Read with care.** The score scale is not stated. CVAE-L and CVAE-NL repeat IndicF5's and XTTS-v2's exact numbers.

<p class="rd-cap">Scores are read from the paper's Fig. 2 and Fig. 3 labels. No confidence intervals are reported.</p>

<p class="rd-take"><b>Listeners favour it by about 20 points, on an unstated scale.</b> Next: a reviewer's eye.</p>

</article>

<article class="rd-page" id="reviewer" data-part="Your move" data-draw="reviewer" markdown>

<p class="rd-crumb"><b>Move 1</b> 🧠 Our review, written for this paper specifically.</p>

## What would a careful reviewer question?

1. **🧠 No ablation.** No run without the GRL or the language embedding. We can't tell which part does the work (§4.4).
2. **🧠 Scrubbing unverified.** The spy classifier's accuracy is never shown (§3.2.2).
3. **🧠 Repeated numbers.** Baseline leakage equals similarity in Table 1. Two foreign-accent MOS bars copy the Indic ones (Fig. 2, Fig. 3).
4. **🧠 Can anyone rerun it?** 636 hours are in-house; no code or model is mentioned. A demo page exists (§1, §4.1.1).
5. **🧠 Steelman: the recipe is cheap.** A GRL plus an added embedding is a small change to any codec-LM TTS.

<p class="rd-cap">Our judgement. Pointers show where each issue sits in the paper.</p>

<p class="rd-take"><b>Believe the direction; hold the exact numbers loosely.</b> Next: the verdict.</p>

</article>

<article class="rd-page" id="verdict" data-part="Your move" data-draw="verdict" data-fast markdown>

<p class="rd-crumb"><b>Move 2</b> 🧠 Goal we picked: dub a Telugu speaker into Hindi with a chosen accent.</p>

## Should you build your Hindi dub this way?

1. **For less leakage: yes.** Leakage fell from 0.284 to 0.203 against XTTS-v2 (Table 1).
2. **For the voice: safe.** Speaker similarity 0.842, level with IndicF5 (Table 1).
3. **For a smooth dial: partly.** Similarity rises with intensity but flattens past 0.6 (Fig. 4).
4. **Off the shelf: no.** No released weights or code are mentioned, so you would retrain (§4.1.1).
5. **🧠 Add it to your own TTS.** If you already run a codec-LM TTS, the GRL head and the added embedding are a weekend's change.

<p class="rd-cap">Numbers are real (Table 1, Fig. 4). The recommendations are ours.</p>

<p class="rd-take"><b>Borrow the recipe, not the model.</b> Then test the dial with your own listeners.</p>

</article>

<article class="rd-page" id="ideas" data-part="Your move" data-draw="ideas" markdown>

<p class="rd-crumb"><b>Move 3</b> 🧠 Our ideas, each a weekend or two.</p>

## What could you try next?

1. **🧠 Train the spy after the fact.** Freeze the slots and fit a fresh language probe. Its accuracy shows how much accent remains.
2. **🧠 Ablate the GRL.** Train once with λ_GRL = 0 and compare leakage. This answers page 16's first question.
3. **🧠 Push λ past 1.** Extrapolate beyond the line from page 8 and listen for exaggerated accents or artefacts.
4. **🧠 Listen at four λ values.** Run a listening test at 0, 0.3, 0.6, 1.0 to check that ears track Fig. 4.

<p class="rd-cap">Placement on the map is our guess.</p>

<p class="rd-take"><b>The cheapest, most useful test is a probe on the frozen slots.</b> Then check yourself.</p>

</article>

<article class="rd-page" id="check-shape" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 1</b> From pages 5 and 7.</p>

## A 9-second reference clip goes in. What shape is the decoder's condition?

- [ ] 450 × 768, one row per codec token
- [x] 32 × 768, whatever the clip length
- [ ] 33 × 768, because the language row is appended
- [ ] 1 × 768, a single speaker vector

<p class="rd-take"><b>32 slots of width 768 (§4.2).</b> The Perceiver fixes the count, and the language row is added to each slot, not appended (§3.2.3).</p>

</article>

<article class="rd-page" id="check-grl" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 2</b> From pages 2 and 6.</p>

## What does the gradient reversal layer change?

- [ ] It makes the classifier predict the wrong language
- [ ] It removes the language label from the training data
- [x] It flips the classifier's gradient before it reaches the Perceiver
- [ ] It subtracts the language embedding from the slots

<p class="rd-take"><b>The classifier still learns normally; only the encoder's update is flipped (§3.2.2).</b> So the encoder learns to hide the language.</p>

</article>

<article class="rd-page" id="check-zero" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 3</b> Spot the flaw. From pages 11 and 14.</p>

## "At intensity 0, the target accent is gone." What's wrong?

- [ ] Nothing: intensity 0 means no accent embedding at all
- [x] Similarity is still 0.203, and no score for "no accent" is given to compare
- [ ] Intensity 0 was never tested
- [ ] Accent similarity falls as intensity rises

<p class="rd-take"><b>0.203 is a cosine, not zero (Fig. 4).</b> Without a no-accent reference point, we can't say how much accent remains.</p>

</article>

<article class="rd-page" id="check-arctic" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 4</b> From page 13.</p>

## Which claim does Table 2 not support?

- [ ] CrossAccent-TTS leaks the least source accent
- [ ] CrossAccent-TTS has the best UTMOS
- [x] CrossAccent-TTS keeps the speaker best
- [ ] CrossAccent-TTS has the highest accent similarity

<p class="rd-take"><b>GST keeps the speaker better: 0.732 against 0.693 (Table 2).</b> The paper's "comparable" covers a real gap.</p>

</article>
