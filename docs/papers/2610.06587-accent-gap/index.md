---
title: "Mind the Accent Gap"
paper_title: "Mind the Accent Gap: British Accent Robustness in Speech-Driven Financial Voice Assistants"
authors: ["Aadam Haq", "Oggi Rudovic", "Malcolm Chadwick", "Jay Rainey", "Shucong Zhang", "Ricardo Guerrero", "Sourav Bhattacharya", "Maja Pantic"]
year: 2026
venue: "arXiv preprint (ICASSP 2027 submission)"
arxiv_id: "2610.06587"
arxiv_version: v1
paper_type: benchmark-dataset
hook: "A Scottish customer asks a banking assistant about spending at Tesco, and the transcript reads \"Hi Monte Santesco\". How often does that happen, and which ASR prevents it?"
big_idea: "CavaBench records 90 British and non-British speakers asking 200 financial questions, runs 11 ASR configurations into one tool-calling LLM, and finds that WER predicts tool-call accuracy well overall (r = −0.93) but misses which words break: dates, merchants and periods."
goal: "Pick the ASR for a streaming voice agent whose users have varied accents."
difficulty: 1
difficulty_note: "Home turf: ASR, WER, streaming transducers, Whisper. New: scoring an ASR by the LLM tool call it produces, on one page."
date_added: 2026-10-15
tags: [Speech, ASR, Benchmarks, Robustness, Agents]
description: "A Scottish customer asks a banking assistant about spending at Tesco, and the transcript reads \"Hi Monte Santesco\". How often does that happen, and which ASR prevents it?"
---

<article class="rd-page" id="cascade" data-part="Toolbox" data-draw="cascade" data-fast markdown>

<p class="rd-crumb"><b>Toolbox 1</b> Start here. Running example: "How much have I spent at Tesco last year?" (§5.3)</p>

## What does a cascaded voice assistant do with your words?

1. **Speech goes to ASR first.** A streaming ASR model turns the question into text (Fig. 1).
2. **The LLM only sees text.** The transcript is the sole record of what the customer wants (§2).
3. **The LLM fills a tool call.** Gemma-4-26B-A4B-it maps the text onto one financial tool schema (§4).
4. **The tool returns the answer.** A spending query runs over the customer's transactions. Any ASR error upstream travels all the way here.

<p class="rd-cap">Pipeline and LLM are from the paper (Fig. 1, §4). The tool-call fields drawn for our query are illustrative.</p>

<p class="rd-take"><b>In a cascade, the LLM is only as good as the transcript it is given.</b> Next: how a tool call is scored.</p>

</article>

<article class="rd-page" id="em" data-part="Toolbox" data-draw="em" markdown>

<p class="rd-crumb"><b>Toolbox 2</b> Scores the tool call from page 1.</p>

## When is a tool call exactly right?

1. **Five fields per call.** `metric`, `time_period`, `group_by`, `filter` and `compare_with` (§4).
2. **All five must match.** **Exact Match (EM)** counts a call correct only if every field equals the gold call (§4).
3. **Gold comes from the text.** The LLM ran 10 times on each reference query; the majority vote became gold, then was checked by hand (§4).
4. **One lost word fails it.** Toggle the transcript. Losing "Tesco" empties `filter`, so EM is 0 for this query.

<p class="rd-cap">The five fields and the gold-label recipe are real (§4). Field values for our query are illustrative.</p>

<p class="rd-take"><b>EM is all-or-nothing, so one critical word decides it.</b> Next: what streaming costs.</p>

</article>

<article class="rd-page" id="lookahead" data-part="Toolbox" data-draw="lookahead" markdown>

<p class="rd-crumb"><b>Toolbox 3</b> Why only one model here can truly stream.</p>

## What does a streaming model's lookahead buy?

1. **Streaming emits text as you speak.** Each new chunk of audio updates the transcript.
2. **A cache-aware encoder reuses state.** Nemotron keeps cached activations and processes only the new chunk (§2).
3. **Lookahead peeks a little ahead.** LA6 and LA13 are two lookahead settings. More future context means more accuracy and more delay (§4, §5.2).
4. **Chunking a non-causal model re-decodes.** Qwen3-ASR re-processes the growing prefix on every 1-second chunk (§4). Move the slider.
5. **The cost is measurable.** Nemotron is about 3.5× faster than chunked Qwen3-ASR, with under half its memory (§4).

<p class="rd-cap">3.5× and the half-memory claim are real (§4). Bar lengths show work per chunk and are illustrative.</p>

<p class="rd-take"><b>True streaming reuses work; pseudo-streaming repeats it.</b> Next: the benchmark itself.</p>

</article>

<article class="rd-page" id="data" data-part="The benchmark" data-draw="data" data-fast markdown>

<p class="rd-crumb"><b>Benchmark 1</b> Where our Tesco question comes from.</p>

## Who recorded CavaBench?

1. **90 people in a quiet room.** 50 male, 40 female, recorded in-house in clean conditions (§3). Accent is the variable.
2. **200 realistic questions.** Spending summaries, budgets, merchant lookups, trends, numbers. Each speaker read rounds of 20 (§3).
3. **2,919 utterances kept.** 3,079 were recorded; quality checks removed 160 (§3).
4. **About 4 hours in total.** Utterances average 4.73 s, from 2.16 to 20.82 s: 3.94 hours (§3). [[3.94 h | of audio in the whole benchmark]]
5. **The text is the prompt.** References are the prompt text, not new transcriptions (§3).

<p class="rd-cap">All counts are real (§3). The removed count, 160, is our subtraction.</p>

<p class="rd-take"><b>Small, clean and controlled: built to isolate accent.</b> Next: how accents were grouped.</p>

</article>

<article class="rd-page" id="accents" data-part="The benchmark" data-draw="accents" markdown>

<p class="rd-crumb"><b>Benchmark 2</b> Continues the 90 speakers from page 4.</p>

## How do 76 accent labels become four groups?

1. **Speakers described themselves.** Self-reported accents gave 76 different free-text values (§3).
2. **Scottish and Southern English.** About 685 and 710 utterances, about 23 speakers each (§3).
3. **Other British is a mixture.** Northern Irish, Mancunian, Yorkshire, Welsh, Midlands: about 747 utterances from 20 speakers (§3).
4. **Non-British is the fourth.** About 784 utterances from about 26 speakers (§3).
5. **🧠 Groups are roughly balanced.** No group has under 23% of utterances. Remember Other British: it returns on page 14.

<p class="rd-cap">Group sizes are real but approximate, as the paper gives them (§3). The percentage is our arithmetic.</p>

<p class="rd-take"><b>Four balanced groups, one of which hides five accents.</b> Next: how clean audio is made hard.</p>

</article>

<article class="rd-page" id="conditions" data-part="The benchmark" data-draw="conditions" data-fast markdown>

<p class="rd-crumb"><b>Benchmark 3</b> Same 2,919 clips from page 4, degraded six ways.</p>

## How is clean audio made hard?

1. **Clean is the floor.** Unmodified audio averages 6.0% WER across models (§5.2).
2. **Reverb and noise come next.** Room echo at RT60 0.3–0.8 s: 9.8%. MUSAN noise from +20 to −5 dB SNR: 11.8% (§4, §5.2).
3. **Telephony narrows the band.** A narrowband codec gives 12.9% (§5.2).
4. **A second talker hurts more.** Competing speech at +20 to +5 dB SIR gives 20.0% (§4, §5.2).
5. **Stacked damage is worst.** Environment mixes device and codec profiles with attenuation: 28.6% (§5.2).

<p class="rd-cap">Mean WERs per condition are real, averaged over models and accents (§5.2). The paper's per-model version is Fig. 2.</p>

<p class="rd-take"><b>Acoustic conditions move WER far more than accent does.</b> Next: the models.</p>

</article>

<article class="rd-page" id="models" data-part="The benchmark" data-draw="models" markdown>

<p class="rd-crumb"><b>Benchmark 4</b> Uses streaming vs chunking from page 3.</p>

## Which ASR models are lined up?

1. **Transducers on FastConformer.** Nemotron Streaming 0.6B uses an RNN-T decoder; Parakeet TDT 0.6B decodes offline (§2).
2. **Nemotron in four versions.** Base or fine-tuned, at LA6 or LA13 (§4).
3. **Parakeet fine-tuned with an adapter.** A gated encoder adapter, TDT loss, learning rate 3×10⁻⁵ (§4). Both fine-tunes used internal telephony-style data.
4. **Offline references.** Whisper Turbo, Distil-Whisper, Qwen3-ASR-1.7B offline and chunked, and Cohere's hosted API (§4).
5. **11 configurations in total.** Only Nemotron streams natively (§4). Cohere's architecture is undisclosed (§2).

<p class="rd-cap">Models, sizes and settings are real (§2, §4). Box widths are not to scale.</p>

<p class="rd-take"><b>One true streamer, tuned four ways, against strong offline models.</b> Next: the accent table.</p>

</article>

<article class="rd-page" id="table" data-part="What they found" data-draw="table" data-fast markdown>

<p class="rd-crumb"><b>Finding 1</b> Uses the four accent groups from page 5.</p>

## Which models treat every accent alike?

1. **Read one row at a time.** Pick a model; bars show its WER per accent group (Table 1).
2. **Spread is the fairness metric.** Spread is the best group minus the worst group (§5.1). The drawing computes it.
3. **Chunked Qwen collapses on Scottish.** 22.2% Scottish against about 13% elsewhere: a 9.4-point spread, the largest (Table 1).
4. **Cohere is tight.** 15.3% average, spread 1.6 (Table 1). It had no fine-tuning (§5.3).
5. **Qwen offline is best overall.** 11.1% average with a 1.6-point spread (Table 1).

<p class="rd-cap">WERs are real (Table 1), averaged over all six acoustic conditions. Spreads are computed from those cells.</p>

<p class="rd-take"><b>The same model can be fine for three accents and fail the fourth.</b> Next: whether fine-tuning helps.</p>

</article>

<article class="rd-page" id="finetune" data-part="What they found" data-draw="finetune" markdown>

<p class="rd-crumb"><b>Finding 2</b> Two rows from page 8, before and after fine-tuning.</p>

## Does fine-tuning close the accent gap?

1. **Nemotron improves on both.** Average WER 18.2% → 16.1%, spread 2.3 → 1.5 (Table 1, LA13).
2. **Its tool calls improve too.** Clean-condition EM rises from 75.5% to 78.2% (§5.1).
3. **Parakeet narrows the spread only.** Spread 2.7 → 1.7, but average WER barely moves: 16.6% → 16.5% (Table 1).
4. **Parakeet's EM does not improve.** The paper says so directly (§5.1).

<p class="rd-cap">All numbers are real (Table 1, §5.1). Fine-tuning data was internal telephony-style speech (§4).</p>

<p class="rd-take"><b>In-domain fine-tuning helped the streaming model most.</b> Next: lookahead versus fine-tuning.</p>

</article>

<article class="rd-page" id="lookahead-gain" data-part="What they found" data-draw="lagain" markdown>

<p class="rd-crumb"><b>Finding 3</b> Uses LA6 and LA13 from page 3.</p>

## Is more lookahead worth the latency?

1. **Base gains a little.** LA6 → LA13: WER 20.0% → 18.2%, EM 64.6% → 66.5% (§5.2).
2. **Fine-tuned gains the same.** WER 17.6% → 16.1%, EM 66.4% → 67.9% (§5.2).
3. **About 1.5–1.9 points each way.** Consistent, but modest (§5.2).
4. **Fine-tuning beats waiting.** Fine-tuned LA6 has lower WER than base LA13: 17.6% vs 18.2% (Table 1).

<p class="rd-cap">WER and EM are real, averaged over conditions (§5.2, Table 1). Arrows mark each change.</p>

<p class="rd-take"><b>Fine-tuning buys more than extra lookahead, and costs no latency.</b> Next: does WER predict EM?</p>

</article>

<article class="rd-page" id="corr" data-part="What they found" data-draw="corr" data-fast markdown>

<p class="rd-crumb"><b>Finding 4</b> Links the WER of pages 8–10 to the EM of page 2.</p>

## Does WER predict whether the tool call is right?

1. **Yes, across models.** Overall WER and EM have r = −0.93 over all configurations (§5.2).
2. **Six points are in the text.** Plotted here: four Nemotrons, Cohere and Qwen3-ASR offline (§5.2, §5.3).
3. **Three accents agree.** Per-accent r runs from −0.87 to −0.98 (§5.2).
4. **Scottish breaks it.** r is only −0.29, driven by chunked Qwen's Scottish WER spike (§5.2). [[−0.29 | WER–EM correlation for Scottish speakers]]

<p class="rd-cap">Points are real (§5.2, §5.3). Other models' overall EM is not in the text. Our r over these six is −0.99.</p>

<p class="rd-take"><b>WER is a good model-picker on average, and a bad one for some groups.</b> Next: which words break tool calls.</p>

</article>

<article class="rd-page" id="fields" data-part="What they found" data-draw="fields" data-fast markdown>

<p class="rd-crumb"><b>Finding 5</b> Opens up the failed tool calls of page 2.</p>

## Which fields break when a tool call fails?

1. **About one call in five fails.** On clean audio, 21.9% of tool calls were wrong (§5.3).
2. **Time is the top failure.** `time_period` is wrong in 33.5% of failures (§5.3).
3. **Comparisons and groupings follow.** `compare_with` 25.4%, `group_by` 25.3%, `filter` 12.3% (§5.3).
4. **Some calls never happen.** 16.2% are abstentions; 8.7% are calls that should not exist (§5.3).
5. **The metric is almost never wrong.** Only 0.7% (§5.3). The LLM knows you asked about spending.

<p class="rd-cap">Shares are real (§5.3). They sum to 122%, so one failure can hit several fields.</p>

<p class="rd-take"><b>Tool calls fail on when and what, not on which metric.</b> Next: which words go missing.</p>

</article>

<article class="rd-page" id="survive" data-part="What they found" data-draw="survive" markdown>

<p class="rd-crumb"><b>Finding 6</b> Back to our Tesco question from page 1.</p>

## Which words go missing?

1. **Our query was destroyed.** An Other British speaker's Tesco question became "Hi Monte Santesco last year". The LLM abstained (§5.3).
2. **A common retailer survives 56.3%.** Across 2,703 utterances, 197 spellings appeared; 24.4% dropped the name (§5.3).
3. **"Last quarter" survives 43.3%.** 36.5% dropped it; 19.4% became a bare "Q1"–"Q4"; sometimes "last water" (§5.3).
4. **Numbers fail silently.** Day counts are 85.9–98.4% right, but 60 becomes "sixteen" or "six" (§5.3).
5. **🧠 Silent beats loud, for harm.** A 60-day query answered over 6 days looks correct. An abstention at least invites a retry.

<p class="rd-cap">Rates and examples are real (§5.3). The "variant" and "Q1–Q4" remainders are our subtraction. The retailer is unnamed.</p>

<p class="rd-take"><b>The words a tool call needs most are the ones ASR drops most.</b> Next: when worse WER wins.</p>

</article>

<article class="rd-page" id="notenough" data-part="What they found" data-draw="notenough" markdown>

<p class="rd-crumb"><b>Finding 7</b> Uses the Scottish outlier of page 11 and the words of page 13.</p>

## Can a worse WER give better tool calls?

1. **The worst WER in the study.** Chunked Qwen3-ASR hits 49.8% WER with overlap at +5 dB (§5.3).
2. **Yet 67% of calls stay right.** Its errors are mostly filler; financial keywords survive (§5.3).
3. **Keywords decide.** "Groceries" survives 86.8% for chunked Qwen, 76.3% for Whisper Turbo (§5.3).
4. **Other British loses most often.** It is the lowest-EM group under most conditions, for every model (§5.3).

<p class="rd-cap">Numbers are real (§5.3). Whisper Turbo's WER in that condition is not given, so we show only its keyword rate.</p>

<p class="rd-take"><b>Which words are wrong matters more than how many.</b> Next: what a reviewer would question.</p>

</article>

<article class="rd-page" id="reviewer" data-part="Your move" data-draw="reviewer" markdown>

<p class="rd-crumb"><b>Move 1</b> 🧠 Our review, written for this paper specifically.</p>

## What would a careful reviewer question?

1. **🧠 Can anyone rerun it?** CavaBench and the fine-tuning data are internal (§3, §4). No release is mentioned.
2. **🧠 Gold labels come from an LLM.** A 10-run majority vote of an LLM, with manual checks (§4). Its own error rate is not given.
3. **🧠 One LLM, one schema.** Every EM uses Gemma-4-26B-A4B-it (§4). Another LLM may tolerate errors differently.
4. **🧠 Labels and text don't line up.** §5.1 is titled "Clean" but Table 1 averages six conditions. References to Section 7 and 3.2 lead nowhere.
5. **🧠 Steelman: the method transfers.** Accent-split, task-level scoring with token survival is easy to copy for your own users.

<p class="rd-cap">Our judgement. Pointers show where each issue sits in the paper.</p>

<p class="rd-take"><b>Trust the pattern more than the third decimal.</b> Next: the verdict.</p>

</article>

<article class="rd-page" id="verdict" data-part="Your move" data-draw="verdict" data-fast markdown>

<p class="rd-crumb"><b>Move 2</b> 🧠 Goal we picked: a streaming voice agent with varied accents.</p>

## Which ASR should front your streaming voice agent?

1. **Need true streaming? Nemotron.** About 3.5× faster than chunked Qwen, with half the memory (§4). Fine-tuned LA13: 16.1% WER, 67.9% EM (§5.3).
2. **Can wait for the full utterance? Qwen offline.** 11.1% WER, 73.7% EM; highest EM in every condition but Reverb (§5.2, §5.3).
3. **No fine-tuning budget? Cohere.** 15.3% WER, 70.1% EM, spread 1.6, but only as a hosted API (§2, §5.3).
4. **Avoid chunking a non-causal model.** Slow, and it collapsed on Scottish speech: 22.2% WER (Table 1, §4).
5. **🧠 Measure your own accents.** Score EM and keyword survival per accent group, not just average WER.

<p class="rd-cap">Numbers are real (Table 1, §4, §5.3). The recommendations are ours.</p>

<p class="rd-take"><b>Stream with a fine-tuned transducer, and test it per accent on the words your tools need.</b> Then check yourself.</p>

</article>

<article class="rd-page" id="check-em" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 1</b> From pages 2 and 12.</p>

## A transcript drops only "last quarter". What happens to EM?

- [ ] Nothing: EM ignores words the LLM can infer
- [x] The call fails, because `time_period` no longer matches gold
- [ ] EM drops by one-fifth, one field out of five
- [ ] Only WER changes; EM measures the metric field

<p class="rd-take"><b>EM is all-or-nothing over five fields (§4).</b> `time_period` is the most common failing field (§5.3).</p>

</article>

<article class="rd-page" id="check-scot" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 2</b> From pages 8 and 11.</p>

## Why is the WER–EM correlation weak for Scottish speakers?

- [ ] Scottish speakers asked different questions
- [ ] Every model is worse on Scottish speech
- [x] One model, chunked Qwen3-ASR, spikes to 22.2% WER on Scottish speech only
- [ ] Scottish audio was recorded over telephone lines

<p class="rd-take"><b>One outlier model drives it (§5.2).</b> Chunked Qwen's Scottish WER is 22.2% against about 13% for other groups (Table 1).</p>

</article>

<article class="rd-page" id="check-pick" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 3</b> Spot the flaw. From pages 11–14.</p>

## "Model A has lower WER than B, so A gives better tool calls." What's wrong?

- [ ] Nothing: r = −0.93 guarantees it
- [ ] WER and EM are unrelated
- [x] A can garble fewer words yet lose more task-critical ones
- [ ] EM only depends on the LLM

<p class="rd-take"><b>Lower WER usually, not always, means better calls.</b> Chunked Qwen keeps 67% EM at 49.8% WER by preserving keywords (§5.3).</p>

</article>
