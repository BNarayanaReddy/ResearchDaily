---
title: "Duplex-MPE"
paper_title: "Duplex-MPE: Benchmarking Multi-Party Interaction in Full-Duplex Dialogue"
authors: ["Chengqian Ma", "Wenhao Feng", "Weixuan Jin", "Gaole Dai", "Tianyu Xie", "Yuexiao Ma", "Zhaolu Kang", "Xiangyu Zhao", "Xiawu Zheng", "Fei Chao"]
year: 2026
venue: "arXiv preprint"
arxiv_id: "2609.31948"
arxiv_version: v1
paper_type: benchmark-dataset
hook: "One voice model speaks after 99.5% of the questions put to it. Sounds great, until you learn it also talks through 20,355 of the 20,360 moments when it should have kept quiet."
big_idea: "To judge an assistant sitting in a group conversation, score starting, answering, staying silent and stopping on separate denominators, because a single 'did it respond?' number hides which of those it is failing."
goal: "Decide whether an open full-duplex model can sit unattended in a shared room, such as a meeting or a family car."
difficulty: 2
difficulty_note: "Home turf: speech models, VAD, ASR and TTS. New: multi-party turn-taking vocabulary and a paired test (McNemar). No heavy math."
date_added: 2026-09-30
tags: [Speech, Benchmarks, Evaluation, Datasets]
description: "One voice model speaks after 99.5% of the questions put to it. Sounds great, until you learn it also talks through 20,355 of the 20,360 moments when it should have kept quiet."
---

<article class="rd-page" id="duplex" data-part="Toolbox" data-draw="duplex" data-fast markdown>

<p class="rd-crumb"><b>Toolbox 1</b> Start here. Nothing earlier is needed.</p>

## What does full-duplex let a voice model do?

1. **A cascade takes strict turns.** VAD waits for you to stop. ASR, an LLM and TTS then reply. While it speaks, it isn't listening.
2. **Full-duplex listens while it talks.** Input audio keeps streaming in while output audio streams out, frame by frame (§1). Moshi popularised this design.
3. **So the model picks when to speak.** No harness says "your turn now". Silence is just another output it can emit.
4. **That choice can be measured.** Starting, staying quiet and stopping all show up on the output waveform (§3.4).

<p class="rd-cap">Both timelines are illustrative, not measured.</p>

<p class="rd-take"><b>A full-duplex model owns its own turn-taking.</b> That freedom is exactly what Duplex-MPE scores.</p>

</article>

<article class="rd-page" id="addressee" data-part="Toolbox" data-draw="room" markdown>

<p class="rd-crumb"><b>Toolbox 2</b> Uses the "when to speak" choice from page 1.</p>

## Who is a turn meant for, in a room of five?

1. **The addressee is who a turn targets.** "C, be honest…" targets C. Aria hears it and should stay out (Table 4).
2. **Naming is the easy cue.** "Aria, which one's cheapest?" names its target outright. That is **explicit addressing**.
3. **Context is the hard cue.** "You've been logging all three numbers, so run it" names nobody. The target must be inferred: **implicit addressing** (Table 5).
4. **Talking on means holding the floor.** The current speaker holds the **floor**. A brief "mm-hm" that doesn't take it is a **backchannel**.
5. **Other assistants compete too.** "Hey Siri, how long is the bus?" targets a different device. Aria must still keep quiet.

<p class="rd-cap">Utterances come from the paper's example scene (Table 4, Table 5). The room layout is illustrative.</p>

<p class="rd-take"><b>Every turn has an addressee, and only a few are Aria.</b> Next: how to tell whether two versions of a test really differ.</p>

</article>

<article class="rd-page" id="mcnemar" data-part="Toolbox" data-draw="mcnemar" markdown>

<p class="rd-crumb"><b>Toolbox 3</b> A small statistics tool, used again on page 14.</p>

## How do you tell whether paired yes/no results really differ?

1. **Run each scene twice.** Same model, two versions of one scene. Each pair lands in one of four cells (App. A5.1).
2. **Agreeing pairs say nothing.** "Spoke in both" and "spoke in neither" can't show which version gets more speech. Only the two disagreeing cells matter.
3. **Treat each disagreement as a coin flip.** With no real difference, each disagreeing pair should split evenly. The **exact McNemar test** measures how lopsided the split is.
4. **MiniCPM-o splits 90 to 78.** That is close to even, so there is no evidence of a difference (Table 16). [[p = 0.40 | from 90 vs 78 disagreeing pairs]]
5. **Now try 90 versus 40.** The p value falls far below 0.05. The split decides, not the 2,000 total. Move the sliders yourself.

<p class="rd-cap">MiniCPM-o's four cell counts and its p value are real (Table 16). The sliders run the exact two-sided test in your browser.</p>

<p class="rd-take"><b>Only pairs that disagree count, and only their imbalance matters.</b></p>

</article>

<article class="rd-page" id="scene" data-part="The benchmark" data-draw="scene" data-fast markdown>

<p class="rd-crumb"><b>Benchmark 1</b> From here on, follow one scene: four classmates picking a place to eat.</p>

## What does one Duplex-MPE conversation look like?

1. **Three options get pitched.** Tacos at nine dollars, karaoke at fifteen, Luigi's at eleven. Each turn addresses the group, so it's **N2**: stay silent (Table 4).
2. **Then comes the one real request.** Turn 4 asks Aria which option is cheapest. Its label is **T**: answer it. The gold answer is the taco place (App. A2.1).
3. **Mentions are not requests.** "This is why we keep Aria in here" names Aria but asks nothing: **N1**. Muttering about money is **N3**.
4. **A question that gets resolved.** Turn 10 asks Aria whether tacos take card (**N4<sub>Q</sub>**). Three seconds later a human answers it (**N4<sub>R</sub>**). Aria should stop.
5. **Every scene has exactly one T.** This one has 13 turns over 99.2 s. The benchmark has 2,000 scenes (§3.1). [[1 of 13 | turns asks Aria to answer]]

<p class="rd-cap">Labels follow the paper's example scene (Table 4); texts are shortened. Row order is real, row spacing is not time.</p>

<p class="rd-take"><b>Aria should answer once, start one more answer, and stay quiet otherwise.</b> Next: how 2,000 such scenes are made.</p>

</article>

<article class="rd-page" id="build" data-part="The benchmark" data-draw="build" markdown>

<p class="rd-crumb"><b>Benchmark 2</b> How the taco scene from page 4 was made.</p>

## How do you make 2,000 conversations without recording anyone?

1. **Pick five scene attributes.** Setting, activity, relationship, devices and register. Ours is classmates in a dorm common room, with a smart speaker nearby (§3.2).
2. **An LLM writes the script.** Claude Opus 5 writes the turns, their labels and T's gold answer. T is never first and never last (§3.2).
3. **TTS voices each turn separately.** Qwen3-TTS gives speakers A–D four fixed voices at 24 kHz. Separate clips give exact turn boundaries for free (App. A2.3).
4. **Humans spot-check the output.** All 1,282 checked TTS turns were intelligible. Gold answers held up in 98 of 100 conversations (Table 11).
5. **Then count it up.** 1,500 three-human scenes and 500 four-human ones (App. A2.2). 61.10 hours of distinct speech (§3.2). [[4,000 | conversations: each scene twice]]

<p class="rd-cap">All counts are real (§3.2, App. A2.2, App. A2.3, Table 11). Boxes are not to scale.</p>

<p class="rd-take"><b>Scripts supply the labels; TTS supplies the timing.</b> So every turn has a known label and exact boundaries.</p>

</article>

<article class="rd-page" id="pairing" data-part="The benchmark" data-draw="pairing" markdown>

<p class="rd-crumb"><b>Benchmark 3</b> Uses addressing from page 2, on turn 4 of our scene.</p>

## How does the same request become explicit or implicit?

1. **Explicit names Aria.** "Aria, out of those three, which one's the cheapest per person?" (Table 5).
2. **Implicit uses a context cue.** "You've been logging all three numbers, so run it." Only Aria has been tracking prices. Use the toggle to compare.
3. **Deleting the name isn't enough.** A request with no name might target a human. So the rewrite adds a cue that points to Aria (§3.3).
4. **Usually only T changes.** T alone was rewritten in 1,958 pairs. In 42, the turn before T changed too (App. A2.4).
5. **Later edits add some noise.** Final scripts differ only at T in 1,661 pairs. So effects are credited to the pair, not to the name alone (§3.3).

<p class="rd-cap">Both wordings and all counts are real (Table 5, App. A2.4). The "name deleted" version is ours, for contrast.</p>

<p class="rd-take"><b>Each scene exists twice, differing in how Aria is addressed.</b> Page 14 compares the two.</p>

</article>

<article class="rd-page" id="protocol" data-part="The benchmark" data-draw="protocol" markdown>

<p class="rd-crumb"><b>Benchmark 4</b> Our scene, played as one stream of audio.</p>

## What exactly does the model hear?

1. **A spoken job description first.** 31.9 s of speech tell the model it is Aria and when to stay silent. Then 0.5 s of silence (App. A3.1).
2. **Then the room, and nothing else.** Human clips play in order with 0.5 s gaps. No transcript, speaker labels or turn boundaries (§3.4).
3. **After T, the clock waits.** The model gets 5 s to start. Once it talks, playback waits for 2 s of silence, at most 60 s (§3.4).
4. **After N4<sub>Q</sub>, the clock doesn't wait.** Exactly 3 s of silence, then N4<sub>R</sub> plays, finished or not (§3.4).
5. **Only the output waveform is judged.** A causal Silero VAD marks speech of at least 120 ms. Pauses under 800 ms are merged (§3.4).

<p class="rd-cap">All timings are real (§3.4, App. A3.1). Segment lengths and Aria's speech are illustrative.</p>

<p class="rd-take"><b>Audio in, audio out, and only the audio is judged.</b> Next: the four scores computed from it.</p>

</article>

<article class="rd-page" id="scores" data-part="The benchmark" data-draw="scores" data-fast markdown>

<p class="rd-crumb"><b>Benchmark 5</b> Scores the timeline from page 7.</p>

## What are the four scores, and why not just one?

1. **Start: did it begin fresh after T?** A new onset within 5 s of T ending, with no speech already running. Counted over all 2,000 T turns (Table 2).
2. **Answer: was it right?** ASR transcribes the reply and an LLM judge compares it with the gold answer. Counted only where Aria spoke (§3.5).
3. **Shush: did it stay quiet?** Each N1, N2 and N3 window should hold no speech, or only a brief acknowledgement (Table 2).
4. **Stop: did it yield when resolved?** Once a human answers N4<sub>Q</sub>, Aria should be silent 2 s into N4<sub>R</sub> (Table 2).
5. **There is no single total.** Each score has its own denominator. A win on one can't pay for a failure on another (§3.5).

<p class="rd-cap">Definitions from Table 2; the paper's timeline version is Fig. 3. Start, Answer, Shush and Stop are our nicknames for fresh-onset response rate, conditional answer accuracy, silence preservation and answering-window yield.</p>

<p class="rd-take"><b>Four behaviours, four denominators, no average.</b></p>

</article>

<article class="rd-page" id="fresh" data-part="The benchmark" data-draw="fresh" markdown>

<p class="rd-crumb"><b>Benchmark 6</b> Zooms into Start from page 8, on turn 4 of our scene.</p>

## Why doesn't "spoke after the request" mean "answered it"?

1. **Response presence counts any speech.** If Aria's audio is on anywhere in T's response window, presence says yes (Table 2).
2. **That includes speech already running.** A model talking straight through turn 4 still "responds". It never decided to answer (App. A3.2).
3. **Start needs a fresh onset.** Silent when T ends, then a new onset within 5 s. Drag the slider to move Aria's onset.
4. **So each request has three outcomes.** Fresh onset, already speaking, or a miss. Presence is the first two added together (Table 9).

<p class="rd-cap">The 5 s rule and MiniCPM-o's counts are real (§3.4, Table 9). The onset on the slider is illustrative.</p>

<p class="rd-take"><b>Presence measures coverage; Start measures a decision.</b> Page 13 shows how far apart they get.</p>

</article>

<article class="rd-page" id="stoprule" data-part="The benchmark" data-draw="stoprule" markdown>

<p class="rd-crumb"><b>Benchmark 7</b> Turns 10–11 of our scene: "does it take card?", then "never mind".</p>

## When does stopping count as stopping?

1. **Only some events are scored.** Aria must stay silent during N4<sub>Q</sub>, start within the 3 s gap, and still be talking at N4<sub>R</sub> (§3.5).
2. **Everything else is left out.** Finished early, already talking or talking over the question: excluded, not failed (App. A4.1).
3. **The deadline is 2 s into N4<sub>R</sub>.** Silent at that moment passes. Drag the slider to move when Aria stops.
4. **It must then stay quiet.** Speaking again before the clip ends, plus 0.5 s, fails. The "resumes" toggle shows this (App. A4.1).
5. **Answer quality doesn't matter here.** Stop measures yielding only. A wrong answer that stops in time still passes (§3.5).

<p class="rd-cap">The rules and gaps are real (§3.5, App. A4.1). Clip lengths and Aria's speech are illustrative.</p>

<p class="rd-take"><b>Stop is a rate over eligible events only.</b> Keep that in mind for page 15.</p>

</article>

<article class="rd-page" id="judge" data-part="The benchmark" data-draw="judge" markdown>

<p class="rd-crumb"><b>Benchmark 8</b> Zooms into Shush from page 8.</p>

## When is talking during someone else's turn allowed?

1. **No speech passes at once.** If the VAD hears nothing from Aria, the window passes without a judge (App. A3.3).
2. **Otherwise transcribe, then classify.** Qwen3-ASR-1.7B transcribes the speech. Claude Opus 5 labels it a backchannel or an intrusion (§3.5).
3. **Brief and empty is fine.** MiniCPM-o's "Understood." lasted 0.67 s and added nothing, so it was exempt (Table 20).
4. **Short with content is not.** Voila's "The ants." lasted 0.45 s but carried content. Even "Nine dollars" would fail (App. A3.3).
5. **Unreadable speech fails too.** An empty transcript after detected speech counts as a failure. Humans agreed with the judge on 98 of 100 (Table 11).

<p class="rd-cap">Quotes and durations are real (Table 20, App. A3.3). Bar widths are to scale; "Nine dollars" has no reported duration.</p>

<p class="rd-take"><b>Shush judges content, not just length.</b> A length-only rule gives the same model order (App. A3.5).</p>

</article>

<article class="rd-page" id="profiles" data-part="What it finds" data-draw="profiles" data-fast markdown>

<p class="rd-crumb"><b>Finding 1</b> The four scores from page 8, on five open models.</p>

## How do five open models score on the four?

1. **MiniCPM-o 4.5 leads three of four.** Start 0.95, Answer 0.47 and Shush 0.92 with explicit requests (Table 3).
2. **Answers are weak everywhere.** Even the leader is right less than half the time. The other four are below 2% (Table 3).
3. **Shush splits the field.** Voila 0.84, FLM-Audio 0.40, Moshi 0.27. Freeze-Omni stays quiet in 5 of 20,360 windows (§4.1).
4. **Stop has a surprise leader.** Voila yields on 0.85 of its scored events, MiniCPM-o on 0.60 (Table 3). Page 15 explains the catch.
5. **Implicit requests look the same.** Flip the toggle: no score moves by more than 4.4 points (Table 3).

<p class="rd-cap">All values from Table 3. Freeze-Omni's Stop isn't reported because only one event qualified.</p>

<p class="rd-take"><b>One model is nearly usable; the rest fail in different ways.</b></p>

</article>

<article class="rd-page" id="trap" data-part="What it finds" data-draw="trap" data-fast markdown>

<p class="rd-crumb"><b>Finding 2</b> Uses fresh onset versus presence from page 9.</p>

## Why does Freeze-Omni look best and turn out worst?

1. **Rank by presence first.** Freeze-Omni has speech after 99.55% of T requests. That's first place (Table 3).
2. **Now split each bar.** Of its 2,000 T turns, 1,486 found it already talking. Only 505 were fresh onsets (Table 9).
3. **The leader drops to last.** On Start, Freeze-Omni scores 0.25. It rarely stopped talking long enough to begin (§4.5).
4. **FLM-Audio hides the same way.** 825 of its "responses" were already running. Presence 0.95, Start 0.54 (Table 9).
5. **The two rankings disagree.** Over ten model-and-condition entries, they correlate at −0.43. No model keeps its rank (§4.5). [[−0.43 | Spearman, presence vs Start]]

<p class="rd-cap">Counts from Table 9, explicit requests. Each bar is one model's 2,000 T requests.</p>

<p class="rd-take"><b>"It responded" can mean "it never stopped talking".</b> That's why Start is scored and presence isn't.</p>

</article>

<article class="rd-page" id="addressing" data-part="What it finds" data-draw="addressing" data-fast markdown>

<p class="rd-crumb"><b>Finding 3</b> Uses the pairs from page 6 and the McNemar test from page 3.</p>

## Does saying "Aria" change what the models do?

1. **A text model reacts strongly.** Gemini 3.1 Pro reads speaker-labelled transcripts. It responds to 94.7% of explicit requests but 30.4% of implicit ones (Table 17).
2. **So the manipulation works.** A 64.3-point gap with \(p<10^{-371}\). For a reader, named and unnamed requests differ (§4.2).
3. **Speech models barely move.** Explicit minus implicit ranges from −1.75 to +0.60 points. Every p is 0.24 or more (Table 16).
4. **Two readings fit this.** They infer the addressee from context equally well. Or they ignore the name entirely (§4.2).
5. 🧠 **The second reading seems likelier.** Four of five models answer under 2% correctly. Real context skill should show up there too.

<p class="rd-cap">Rates from Table 3, Table 16 and Table 17. Gemini read text, not audio, so it is a reference, not a competitor.</p>

<p class="rd-take"><b>Naming Aria changes a reader's decision, not the speech models'.</b> Perhaps because they aren't listening for the name.</p>

</article>

<article class="rd-page" id="funnel" data-part="What it finds" data-draw="funnel" markdown>

<p class="rd-crumb"><b>Finding 4</b> Uses the eligibility rules from page 10.</p>

## Why isn't Voila's 0.85 Stop score a win?

1. **Start from all N4 events.** Each condition has 1,911 resolved questions (Table 7). Every model faces the same ones.
2. **Most never qualify.** Voila starts after the question in 913. Only 620 are still talking when N4<sub>R</sub> begins (Table 14).
3. **Of those, 526 yield.** 526 / 620 = 0.85. That is the reported Stop score (Table 15).
4. **MiniCPM-o qualifies far more often.** 1,633 scored events and 974 yields. A lower rate, but more yields overall (Table 15).
5. 🧠 **Divide by all 1,911 instead.** MiniCPM-o then yields on 51%, Voila on 28%. This is our arithmetic, not a paper metric.

<p class="rd-cap">Counts are real (Table 7, Table 14, Table 15; explicit requests). The per-1,911 rates are our arithmetic.</p>

<p class="rd-take"><b>A conditional rate needs its denominator beside it.</b> The paper reports Stop only when at least 30 events qualify (§4.3).</p>

</article>

<article class="rd-page" id="reviewer" data-part="Your move" data-draw="reviewer" markdown>

<p class="rd-crumb"><b>Your move 1</b> Our critique of pages 5–15.</p>

## What would a careful reviewer question?

1. 🧠 **The spoken role is a confound.** A 31.9 s spoken preamble sets the rules. Moshi-style models weren't built for spoken instructions. A probe that could separate this isn't reported (§3.4).
2. 🧠 **One model family writes and grades.** Claude Opus 5 writes gold answers and judges replies (§3.2, §3.5). Human checks used balanced samples, not natural ones (App. A3.4).
3. 🧠 **Are implicit requests clearly addressed?** Reviewers said yes for 50 of 50 (Table 11). Gemini, with perfect transcripts, responded to only 30.4% (Table 17).
4. 🧠 **The audio is clean and scripted.** Four TTS voices, no overlap, no noise, and humans who never react to Aria. The authors flag this in their ethics statement.
5. 🧠 **Steelman: control comes before realism.** Identical clean audio isolates the speaking policy. The generator can make fresh draws later (§5).

<p class="rd-cap">Pointers mark the evidence behind each concern. The pills are our judgment.</p>

<p class="rd-take"><b>Trust the Shush order most and the Answer ranking least.</b> Every Shush pair differs significantly; most Answer pairs don't (App. A7.1).</p>

</article>

<article class="rd-page" id="verdict" data-part="Your move" data-draw="verdict" data-fast markdown>

<p class="rd-crumb"><b>Your move 2</b> Goal picked by us: a voice agent for meetings or a family car. Uses pages 12–15.</p>

## Should you put an open full-duplex model in a shared room today?

1. **Take the best model, MiniCPM-o 4.5.** It starts fresh on 95% of the requests addressed to it (Table 3).
2. **Count its intrusions.** It breaks silence in 7.6% of non-addressed turns. A scene held about ten such turns per 100 s (Table 3, Table 19).
3. **Scale to your meeting.** Move the slider. One hour of similar talk gives about 28 intrusions.
4. **Then check its answers.** Only 47% were correct, and every answer had just been said aloud (Table 3, Table 11).
5. 🧠 **Verdict: not yet, unattended.** Use Duplex-MPE as your acceptance test instead. We'd want Shush above 0.99 and Answer above 0.9.

<p class="rd-cap">Rates are real (Table 3). Turns per hour assume talk like the benchmark's: 20,360 windows over 2,000 scenes of 99.5 s on average (Table 6, Table 19).</p>

<p class="rd-take bad"><b>Not ready to sit unattended in a shared room.</b> But it gives you a ready yardstick for your own duplex model.</p>

</article>

<article class="rd-page" id="ideas" data-part="Your move" data-draw="ideas" markdown>

<p class="rd-crumb"><b>Your move 3</b> Found by us: no follow-ups yet. MSI-Bench (arXiv:2609.24812) is concurrent multi-speaker work.</p>

## What could you try next?

1. 🧠 **Sweep the 3 s answering gap.** Rerun with 1, 2, 3 and 5 s gaps. If Voila's eligible count jumps, latency was the issue, not choice.
2. 🧠 **Probe for "should I speak?".** Train a linear probe on hidden states at turn ends, T versus N1–N3. A good probe with bad behaviour blames the policy.
3. 🧠 **Run a cascaded baseline.** VAD, Whisper, an addressee classifier, an LLM, then TTS. It shows whether end-to-end models trail a simple pipeline.
4. 🧠 **Let the humans react.** Branch N4<sub>R</sub> on whether Aria already answered. Rankings may shift once the room adapts.

<p class="rd-cap">Placement on the map is our guess, not measured.</p>

<p class="rd-take"><b>Start with the gap sweep.</b> It needs no training, only reruns of the released pipeline.</p>

</article>

<article class="rd-page" id="check-labels" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 1</b> From page 4.</p>

## In the taco scene, which turn is the single T request?

- [ ] Turn 5: "this is exactly why we keep Aria in here"
- [x] Turn 4: asking Aria which option is cheapest per person
- [ ] Turn 6: "Hey Siri, how long is the bus?"
- [ ] Turn 10: asking Aria whether the taco place takes card

<p class="rd-take"><b>Turn 4 is the only T.</b> Turn 5 mentions Aria without asking (N1), turn 6 targets another device (N2), and turn 10 is an N4 question that a human resolves (Table 4).</p>

</article>

<article class="rd-page" id="check-presence" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 2</b> From pages 9 and 13.</p>

## Freeze-Omni has 99.55% presence but only 0.25 Start. Why?

- [ ] It answers most requests wrongly
- [x] It was usually already talking when the request ended
- [ ] It usually waits more than 5 s before answering
- [ ] The VAD misses its short replies

<p class="rd-take"><b>Already-running speech counts for presence, not for Start.</b> 1,486 of 2,000 T turns found it talking (Table 9). Waiting over 5 s would be a miss, which lowers presence too.</p>

</article>

<article class="rd-page" id="check-addressing" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 3</b> From pages 3 and 14.</p>

## Gemini drops 64 points without the name; speech models don't move. What follows?

- [ ] The speech models infer addressees from context as well as from names
- [ ] The implicit requests were badly written
- [x] The name doesn't change the speech models' decision, for reasons this test can't separate
- [ ] The speech models handle implicit requests better than Gemini

<p class="rd-take"><b>No detected difference is not equal skill.</b> Context inference and ignoring the name both fit the data (§4.2, App. A5.1).</p>

</article>

<article class="rd-page" id="check-voila" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 4</b> Spot the flaw. From pages 10 and 15.</p>

## "Voila's Stop is 0.85, so it's best at giving up the floor." What's wrong?

- [ ] Nothing: 0.85 beats MiniCPM-o's 0.60
- [x] The rate covers only 620 eligible events; MiniCPM-o yields far more often overall
- [ ] Stop also penalises wrong answers, which Voila avoids by rarely answering
- [ ] Voila's Stop was measured on implicit requests only

<p class="rd-take"><b>Read a conditional rate with its denominator.</b> Voila yields on 526 events, MiniCPM-o on 974, out of the same 1,911 (Table 15).</p>

</article>
