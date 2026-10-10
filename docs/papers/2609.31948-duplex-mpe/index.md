---
title: "Duplex-MPE"
paper_title: "Duplex-MPE: Benchmarking Multi-Party Interaction in Full-Duplex Dialogue"
authors: ["Chengqian Ma", "Wenhao Feng", "Weixuan Jin", "Gaole Dai", "Tianyu Xie", "Yuexiao Ma", "Zhaolu Kang", "Xiangyu Zhao", "Xiawu Zheng", "Fei Chao"]
year: 2026
venue: "arXiv preprint"
arxiv_id: "2609.31948"
arxiv_version: v1
paper_type: benchmark-dataset
hook: "One voice model has speech after 99.55% of the requests put to it. Sounds great, until you learn it also talks through 20,355 of the 20,360 moments when it should have kept quiet."
big_idea: "To judge an assistant sitting in a group conversation, score starting, answering, staying silent and stopping on separate denominators, because a single 'did it respond?' number hides which of those it is failing."
goal: "Decide whether an open full-duplex model can sit unattended in a shared room, such as a meeting or a family car."
difficulty: 2
difficulty_note: "Home turf: speech models, VAD, ASR and TTS. New: multi-party turn-taking vocabulary and a paired test (McNemar). No heavy math."
date_added: 2026-09-30
tags: [Speech, Benchmarks, Evaluation, Datasets]
description: "One voice model has speech after 99.55% of the requests put to it. Sounds great, until you learn it also talks through 20,355 of the 20,360 moments when it should have kept quiet."
---

<article class="rd-page" id="duplex" data-part="Toolbox" data-draw="duplex" data-fast markdown>

<p class="rd-crumb"><b>Toolbox 1</b> Start here. Nothing earlier is needed.</p>

## What does full-duplex let a voice model do?

1. **A cascade takes strict turns.** VAD waits for you to stop. ASR, an LLM and TTS then reply. While it talks, it can't hear you.
2. **Full-duplex listens while it talks.** Room audio keeps streaming in while its own speech streams out (§1). Moshi is one such model.
3. **So silence becomes an output.** No harness says "your turn now". At every moment, the model chooses to speak or stay quiet.
4. **Three choices show on the waveform.** When to start, when to stay quiet, when to stop. Duplex-MPE scores all three (§1). [[5 | systems tested (App. A1.3)]]

<p class="rd-cap">Both timelines are illustrative. The five tested systems are listed in App. A1.3.</p>

<p class="rd-take"><b>A full-duplex model runs its own turn-taking.</b> Next: in a room of five, whose turns are meant for it?</p>

</article>

<article class="rd-page" id="addressee" data-part="Toolbox" data-draw="room" markdown>

<p class="rd-crumb"><b>Toolbox 2</b> Uses the "when to speak" choice from page 1.</p>

## Who is a turn meant for, in a room of five?

1. **Every turn has an addressee.** The **addressee** is who a turn targets. "C, be honest…" targets C, not Aria (Table 4).
2. **Some turns target another device.** "Hey Siri, how long is the bus?" is for Siri. Aria hears it and stays out (Table 4).
3. **Some turns target nobody.** Muttering about money has no addressee at all. The paper calls this self-talk (§3.1).
4. **Only a few turns target Aria.** "Aria, which one's the cheapest?" is a turn it must answer (Table 4). [[2,000 | of 26,182 turns need an answer (Table 7)]]

<p class="rd-cap">Quotes come from the paper's example scene (Table 4). Counts are real (Table 7, explicit condition). The room layout is illustrative.</p>

<p class="rd-take"><b>Aria must follow every turn but answer very few.</b> Next: how a request shows it is meant for Aria.</p>

</article>

<article class="rd-page" id="naming" data-part="Toolbox" data-draw="naming" markdown>

<p class="rd-crumb"><b>Toolbox 3</b> Uses the addressee idea from page 2.</p>

## How can a request be for Aria if nobody says "Aria"?

1. **Explicit addressing names Aria.** "Aria, out of those three, which one's the cheapest per person?" The name points the request (Table 5).
2. **Implicit addressing uses a cue.** "You've been logging all three numbers, so run it." Only Aria was logging, so listeners infer it (Table 5).
3. **Deleting the name isn't enough.** A nameless request might target a human. So the cue must point at Aria (§3.3).
4. **Humans agree the cue works.** Reviewers judged all 50 sampled implicit requests to address Aria (Table 11). [[50 / 50 | judged addressed to Aria (Table 11)]]
5. **The cue costs a few words.** Unnamed requests average 123.3 characters, named ones 111.6 (Table 8).

<p class="rd-cap">Both wordings and all numbers are real (Table 5, Table 8, Table 11). The "name deleted" wording is ours, for contrast.</p>

<p class="rd-take"><b>A request can point at Aria without naming it.</b> Next: when talking over someone is allowed.</p>

</article>

<article class="rd-page" id="floor" data-part="Toolbox" data-draw="floor" markdown>

<p class="rd-crumb"><b>Toolbox 4</b> Uses the "when to speak" choice from page 1.</p>

## When may Aria talk while someone else has the floor?

1. **One person holds the floor.** The **floor** is the right to speak right now. Here B is mid-turn, so B holds it.
2. **A backchannel leaves it alone.** A brief "Understood." adds nothing and takes no turn. That is a **backchannel** (App. A3.3).
3. **Content takes the floor.** "Yeah, I'm free for all three" adds a claim. Now Aria competes for the turn (Table 20).
4. **Short can still take the floor.** Voila's "The ants." lasted 0.45 s. It carried content, so it was penalised (Table 20). [[0.45 s | "The ants." (Table 20)]]

<p class="rd-cap">Quotes and durations are real model outputs (Table 20). The floor timeline is illustrative.</p>

<p class="rd-take"><b>A backchannel is fine; content is an intrusion.</b> Next: how a judge tells them apart at scale.</p>

</article>

<article class="rd-page" id="vadgate" data-part="Toolbox" data-draw="vadgate" markdown>

<p class="rd-crumb"><b>Toolbox 5</b> Uses the backchannel from page 4.</p>

## How do you judge thousands of replies without reading each?

1. **A VAD marks speech first.** A causal Silero **VAD** scans Aria's output waveform. Bursts under 120 ms don't count as speech (§3.4).
2. **Short pauses are merged.** Two bursts less than 800 ms apart become one episode. Move the pause slider (§3.4).
3. **No speech means no judge.** A silent window passes at once, with no transcript and no LLM call (App. A3.3).
4. **Speech goes to ASR and a judge.** Qwen3-ASR-1.7B transcribes it. Claude Opus 5 decides what it was (§3.5). [[2,172 | of 20,360 reached the judge (Table 10)]]
5. 🧠 **We call this VAD-gated judging.** A cheap timing check runs on every window. The costly LLM check runs only where speech exists.

<p class="rd-cap">Thresholds and counts are real (§3.4, Table 10; MiniCPM-o, explicit). The waveform is illustrative.</p>

<p class="rd-take"><b>Timing comes from the VAD; meaning comes from a judge.</b> Next: how to compare paired yes/no results.</p>

</article>

<article class="rd-page" id="mcnemar" data-part="Toolbox" data-draw="mcnemar" markdown>

<p class="rd-crumb"><b>Toolbox 6</b> A small statistics tool, used again on page 16.</p>

## How do you tell whether paired yes/no results really differ?

1. **Run each scene twice.** Same model, two versions of one scene. Each pair lands in one of four cells (App. A5.1).
2. **Agreeing pairs say nothing.** "Spoke in both" and "spoke in neither" can't show which version gets more speech. Only the disagreeing cells matter.
3. **Treat each disagreement as a coin flip.** With no real difference, disagreeing pairs should split evenly. The **exact McNemar test** measures how lopsided the split is.
4. **MiniCPM-o splits 90 to 78.** That is close to even, so there's no evidence of a difference (Table 16). [[p = 0.3961 | 90 vs 78 (Table 16)]]
5. **Now try 90 versus 40.** The p value falls far below 0.05. The split decides, not the 2,000 total. Move the sliders yourself.

<p class="rd-cap">MiniCPM-o's four cell counts and its p value are real (Table 16). The sliders run the exact two-sided test in your browser.</p>

<p class="rd-take"><b>Only pairs that disagree count, and only their imbalance matters.</b> Next: the conversation the model actually hears.</p>

</article>

<article class="rd-page" id="scene" data-part="The benchmark" data-draw="scene" data-fast markdown>

<p class="rd-crumb"><b>Benchmark 1</b> From here on, follow one scene: four classmates picking a place to eat.</p>

## What does the model hear in one conversation?

1. **First, a spoken job description.** A 31.9 s preamble tells the model it is Aria, and when to stay silent (App. A3.1).
2. **Three options get pitched.** Tacos at nine dollars, karaoke at fifteen, Luigi's at eleven. Each is said to the group, so it's **N2** (Table 4).
3. **Then the one real request.** Turn 4 asks Aria which option is cheapest. Its label is **T**. The gold answer is the taco place (App. A2.1).
4. **Mentions and mutters need silence.** Naming Aria without asking anything is **N1**. Thinking aloud is **N3** (§3.1).
5. **One question gets resolved.** Turn 10 asks Aria whether tacos take card (**N4<sub>Q</sub>**). A human answers it in turn 11 (**N4<sub>R</sub>**).
6. **The model gets only the audio.** No transcript, speaker labels or turn boundaries (§3.4). Flip the toggle. [[1 of 13 | turns is a T (Table 4)]]

<p class="rd-cap">Labels and turn order follow the paper's scene (Table 4); texts are shortened. Row spacing and bar lengths are not time.</p>

<p class="rd-take"><b>Answer turn 4, start on turn 10, and otherwise stay quiet.</b> Next: how 2,000 such scenes were made.</p>

</article>

<article class="rd-page" id="build" data-part="The benchmark" data-draw="build" markdown>

<p class="rd-crumb"><b>Benchmark 2</b> How the taco scene from page 7 was made, twice.</p>

## How do you make 2,000 conversations, each in two versions?

1. **Start from five attributes.** Setting, activity, relationship, devices and register. Ours: classmates in a dorm common room, with another smart speaker (§3.2).
2. **An LLM writes the script.** Claude Opus 5 writes each turn, its label and T's gold answer. T is never first and never last (§3.2).
3. **Rewrite T the other way.** Each scene gets an explicit and an implicit T. 1,958 pairs changed only T; 42 also changed the turn before (App. A2.4).
4. **TTS voices every turn alone.** Qwen3-TTS gives speakers A–D four fixed voices. Separate clips give exact turn boundaries (App. A2.3).
5. **Humans spot-check a sample.** All 1,282 checked TTS turns were intelligible. 98 of 100 gold answers held up (Table 11). [[4,000 | conversations (§3.3)]]

<p class="rd-cap">All counts are real (§3.2, App. A2.2–A2.4, Table 11). Boxes are not to scale.</p>

<p class="rd-take"><b>Scripts supply the labels; TTS supplies the timing.</b> Next: the four scores computed on them.</p>

</article>

<article class="rd-page" id="scores" data-part="The benchmark" data-draw="scores" data-fast markdown>

<p class="rd-crumb"><b>Benchmark 3</b> Scores the taco scene from page 7. The next four pages each zoom into one row.</p>

## What are the four scores, and why not just one?

1. **Start: did it begin answering?** After T, Aria must start fresh within 5 s. Counted over all 2,000 T turns (Table 2).
2. **Answer: was the answer right?** A judge compares Aria's reply with the gold answer. Counted only where Aria spoke (Table 2).
3. **Shush: did it stay quiet?** Each N1, N2 and N3 window should hold no speech, or only a backchannel (Table 2).
4. **Stop: did it yield when resolved?** After N4<sub>R</sub> starts, Aria must fall silent within 2 s. Only eligible events count (Table 2).
5. **No total is formed.** Each score keeps its own denominator. A win on one can't pay for a failure on another (§3.5). [[4 | separate denominators (§3.5)]]

<p class="rd-cap">Definitions and totals are real (Table 2, Table 7, Table 19). Start, Answer, Shush and Stop are our nicknames for the paper's four metric names.</p>

<p class="rd-take"><b>Four behaviours, four denominators, no average.</b> Next: Start, on turn 4.</p>

</article>

<article class="rd-page" id="fresh" data-part="The benchmark" data-draw="fresh" markdown>

<p class="rd-crumb"><b>Benchmark 4</b> Start, from page 9, on turn 4 of our scene.</p>

## Why doesn't "spoke after the request" mean "started answering"?

1. **Measured: a fresh onset.** Aria is silent when T ends, then starts speaking within 5 s (Table 2). Drag the onset slider.
2. **On every T, out of 2,000.** In our scene, that's turn 4: "which one's the cheapest?" Every T counts, spoken to or not (Table 2).
3. **Speech already running doesn't pass.** A model talking straight through turn 4 never decided to answer. Its onset came before T ended (App. A3.2).
4. **Too late is a miss.** No onset within 5 s fails Start. Once Aria speaks, playback waits for 2 s of silence, at most 60 s (§3.4).
5. **Three outcomes, one passes.** Fresh, already speaking, or miss. **Response presence** adds the first two, so it can look high without fresh starts (Table 9). [[0.9500 | MiniCPM-o's Start (Table 9)]]

<p class="rd-cap">The 5 s rule and MiniCPM-o's counts are real (§3.4, Table 9, explicit). Aria's onset on the slider is illustrative.</p>

<p class="rd-take"><b>Start counts decisions, not airtime.</b> Next: whether the answer was right.</p>

</article>

<article class="rd-page" id="answer" data-part="The benchmark" data-draw="answer" markdown>

<p class="rd-crumb"><b>Benchmark 5</b> Answer, from page 9, on turn 4. Uses the judge from page 5.</p>

## What counts as a right answer, and out of how many?

1. **Measured: correctness.** Qwen3-ASR transcribes Aria's reply. Claude Opus 5 compares its meaning with the gold answer (§3.5).
2. **On T turns with speech.** For turn 4, whatever Aria said is judged against "the taco place, nine dollars a head" (App. A2.1).
3. **Counted against response presence.** A silent T has nothing to judge, so it leaves this denominator. It still fails Start (§3.5).
4. **Unclear verdicts count as wrong.** An empty or unparseable answer is scored incorrect. Humans agreed with the judge on 99 of 100 (§3.5, Table 11).
5. **Speaking isn't answering.** FLM-Audio spoke on 1,901 requests and was right on 2. Flip the toggle (§4.1). [[2 of 1,901 | FLM-Audio correct (§4.1)]]

<p class="rd-cap">Counts are real (Table 3, Table 9, §4.1; explicit). MiniCPM-o's 903 correct answers are our arithmetic (0.4730 × 1,909). Aria's reply is illustrative.</p>

<p class="rd-take"><b>Answer is judged only where Aria spoke.</b> Next: what counts as staying quiet.</p>

</article>

<article class="rd-page" id="judge" data-part="The benchmark" data-draw="judge" markdown>

<p class="rd-crumb"><b>Benchmark 6</b> Shush, from page 9, on the silent turns of our scene. Uses pages 4 and 5.</p>

## When does Aria's talking break the silence?

1. **Measured: silence kept.** An N1, N2 or N3 window passes if Aria says nothing, or only a backchannel (Table 2).
2. **On every other turn.** In our scene that's ten turns: 1–3, 5–9, 12 and 13 (Table 4). "Understood." in turn 7 would pass.
3. **Counted against every window.** Each condition has 20,360 silence windows. Each one passes or fails on its own (Table 19). [[20,360 | silence windows (Table 19)]]
4. **Content fails, however short.** Even "Nine dollars" counts as an intrusion. It answers a question, so it takes the floor (App. A3.3).
5. **Unreadable speech fails too.** If the VAD hears speech but ASR returns nothing, the window fails. Voila had 171 such windows (Table 10).

<p class="rd-cap">Rules and counts are real (Table 2, Table 10, Table 19, App. A3.3). Placing these replies in turn 7 is illustrative.</p>

<p class="rd-take"><b>Shush judges content, not just sound.</b> Next: stopping when a human resolves the question.</p>

</article>

<article class="rd-page" id="stoprule" data-part="The benchmark" data-draw="stoprule" markdown>

<p class="rd-crumb"><b>Benchmark 7</b> Stop, from page 9, on turns 10–11: "does it take card?", then "never mind".</p>

## When does stopping count as stopping?

1. **Measured: yielding.** The scheduler waits exactly 3 s after turn 10. Then turn 11 plays, whatever Aria is doing (§3.4).
2. **On eligible N4 events only.** Aria must stay quiet during turn 10, start within the gap, and still be talking at turn 11 (§3.5).
3. **Everything else is left out.** Finished early, already talking, or talking over the question: excluded, not failed (App. A4.1).
4. **Pass: silent 2 s into N4<sub>R</sub>.** Silent at that deadline passes. Drag the slider to move when Aria stops (App. A4.1). [[2 s | deadline after R starts (§3.5)]]
5. **And silent until the window ends.** Speaking again before the clip ends, plus 0.5 s, fails. Answer quality doesn't matter here (App. A4.1).

<p class="rd-cap">The rules and gaps are real (§3.4, §3.5, App. A4.1). Clip lengths and Aria's speech are illustrative.</p>

<p class="rd-take"><b>Stop is a rate over eligible events only.</b> Next: how five open models score on all four.</p>

</article>

<article class="rd-page" id="profiles" data-part="What it finds" data-draw="profiles" data-fast markdown>

<p class="rd-crumb"><b>Finding 1</b> The four scores from page 9, on five open models.</p>

## How do five open models score on the four?

1. **MiniCPM-o 4.5 leads three of four.** Start 0.9500, Answer 0.4730 and Shush 0.9242, on explicit requests (Table 3).
2. **Answers are weak everywhere.** Even the leader is right less than half the time. The other four score 0.0123 or less (Table 3). [[0.4730 | best Answer score (Table 3)]]
3. **Shush splits the field.** Voila 0.8351, FLM-Audio 0.3957, Moshi 0.2734. Freeze-Omni keeps silence in 5 of 20,360 windows (§4.1).
4. **Stop has a surprise leader.** Voila yields on 0.8484 of its scored events, MiniCPM-o on 0.5964 (Table 3). Page 17 explains the catch.
5. **Implicit requests look the same.** Flip the toggle. No score moves by more than 0.0438 (Table 3).

<p class="rd-cap">All values from Table 3, to four decimals. Freeze-Omni's Stop isn't reported: only one event qualified (§4.3).</p>

<p class="rd-take"><b>One model is nearly usable; the rest fail in different ways.</b> Next: why "it responded" can mislead.</p>

</article>

<article class="rd-page" id="trap" data-part="What it finds" data-draw="trap" data-fast markdown>

<p class="rd-crumb"><b>Finding 2</b> Uses Start versus response presence from page 10.</p>

## Why does Freeze-Omni look best and turn out worst?

1. **Rank by presence first.** Freeze-Omni has speech after 0.9955 of T requests. That's first place (Table 3).
2. **Now split each bar.** Of its 2,000 T turns, 1,486 found it already talking. Only 505 were fresh onsets (Table 9).
3. **The leader drops to last.** Re-rank by Start: Freeze-Omni scores 0.2525. It rarely stopped talking long enough to begin (§4.5).
4. **FLM-Audio hides the same way.** 825 of its "responses" were already running. Presence 0.9505, Start 0.5380 (Table 9).
5. **The two rankings disagree.** Over ten model-and-condition entries, they correlate at −0.4303. No model keeps its explicit rank (§4.5). [[−0.4303 | rank correlation (§4.5)]]

<p class="rd-cap">Counts from Table 9, explicit requests. Each bar is one model's 2,000 T requests.</p>

<p class="rd-take bad"><b>"It responded" can mean "it never stopped talking".</b> Next: does naming Aria change anything?</p>

</article>

<article class="rd-page" id="addressing" data-part="What it finds" data-draw="addressing" data-fast markdown>

<p class="rd-crumb"><b>Finding 3</b> Uses explicit vs implicit requests (page 3) and the McNemar test (page 6).</p>

## Does saying "Aria" change what the models do?

1. **A text model reacts strongly.** Gemini 3.1 Pro reads speaker-labelled transcripts. It responds to 0.9470 of named requests and 0.3040 of unnamed ones (Table 17).
2. **So the rewrite matters to a reader.** That 64.3-point gap gives \(p<10^{-371}\) (§4.2). [[64.3 pts | Gemini's gap (§4.2)]]
3. **Speech models barely move.** Pick a model. Explicit minus implicit ranges from −1.75 to +0.60 points (Table 16).
4. **No test reaches significance.** The smallest p is 0.2365, for Voila's 395 versus 430 split (Table 16).
5. **Two readings fit this.** Equal skill at reading context, or deafness to the name (§4.2). Also, 339 pairs differ beyond T (App. A2.4).

<p class="rd-cap">Rates from Table 17; pair counts and p values from Table 16, recomputed in your browser. Gemini read text, not audio: it is a reference, not a competitor.</p>

<p class="rd-take"><b>Naming Aria changes a reader's decision, not the speech models'.</b> Next: why Voila's Stop score needs a second look.</p>

</article>

<article class="rd-page" id="funnel" data-part="What it finds" data-draw="funnel" markdown>

<p class="rd-crumb"><b>Finding 4</b> Uses the eligibility rule from page 13.</p>

## Why isn't Voila's 0.8484 Stop score a win?

1. **Start from all N4 events.** Each condition has 1,911 resolved questions (Table 7). Every model faces the same ones.
2. **Most never qualify.** Voila first speaks after the question in 913. Only 620 are still talking when N4<sub>R</sub> begins (Table 14).
3. **Of those, 526 yield.** 526 / 620 gives 0.8484, the reported Stop score (Table 15).
4. **MiniCPM-o qualifies far more often.** 1,633 scored events and 974 yields: 0.5964. A lower rate, but more yields (Table 15). [[620 vs 1,633 | scored events (§4.3)]]
5. 🧠 **Divide by all 1,911 instead.** MiniCPM-o then yields on 51.0%, Voila on 27.5%. This is our arithmetic, not a paper metric.

<p class="rd-cap">Counts are real (Table 7, Table 14, Table 15; explicit requests). The per-1,911 rates are our arithmetic.</p>

<p class="rd-take"><b>A conditional rate needs its denominator beside it.</b> The paper reports Stop only when at least 30 events qualify (§4.3).</p>

</article>

<article class="rd-page" id="reviewer" data-part="Your move" data-draw="reviewer" markdown>

<p class="rd-crumb"><b>Your move 1</b> Our critique of pages 7–17.</p>

## What would a careful reviewer question?

1. 🧠 **Preamble untested alone.** A 31.9 s spoken instruction sets the rules (App. A3.1). §3.4 mentions a probe; we found no results.
2. 🧠 **Writer and grader overlap.** Claude Opus 5 writes gold answers and judges replies (§3.2, §3.5). Human checks used balanced samples (App. A3.4).
3. 🧠 **Implicit may be ambiguous.** Reviewers said yes for 50 of 50 (Table 11). Gemini, reading clean transcripts, responded to only 0.3040 (Table 17).
4. 🧠 **N4 counts don't reconcile.** 968 scenarios have an N4 event after T (App. A2.2). Yet each condition has 1,911 N4 events (Table 7).
5. 🧠 **Steelman: control first.** Clean TTS turns with 0.5 s gaps never overlap (App. A3.1). That isolates the speaking policy; fresh draws can come later (§5).

<p class="rd-cap">Pointers mark the evidence behind each concern. The pills are our judgment.</p>

<p class="rd-take"><b>Trust the Shush order most and the Answer ranking least.</b> Every Shush pair differs significantly; most Answer pairs don't (App. A7.1).</p>

</article>

<article class="rd-page" id="verdict" data-part="Your move" data-draw="verdict" data-fast markdown>

<p class="rd-crumb"><b>Your move 2</b> Goal picked by us: a voice agent for meetings or a family car. Uses pages 14–17.</p>

## Should you put an open full-duplex model in a shared room today?

1. **Take the best model, MiniCPM-o 4.5.** It starts fresh on 0.9500 of the requests put to it (Table 3).
2. **Count its intrusions.** Its Shush is 0.9242, so 7.58% of silence windows fail. A scene holds about 10.18 such windows (Table 3, Table 19).
3. **Scale to your meeting.** A scene averages 99.5 s (Table 6). Move the slider: an hour of similar talk gives about 28 intrusions. [[≈ 28 | intrusions per hour (our arithmetic)]]
4. **Then check its answers.** Only 0.4730 of them were judged correct (Table 3). In all 100 checked scenes, the answer had been said aloud (Table 11).
5. 🧠 **Verdict: not yet, unattended.** Use Duplex-MPE as your acceptance test instead. We'd want Shush above 0.99 and Answer above 0.9.

<p class="rd-cap">Rates are real (Table 3). Per-hour counts are our arithmetic: 20,360 windows over 2,000 scenes of 99.5 s (Table 6, Table 19).</p>

<p class="rd-take bad"><b>Not ready to sit unattended in a shared room.</b> But it gives you a ready yardstick for your own duplex model.</p>

</article>

<article class="rd-page" id="check-labels" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 1</b> From page 7.</p>

## In the taco scene, which turn is the single T request?

- [ ] Turn 5: "this is exactly why we keep Aria in here"
- [x] Turn 4: asking Aria which option is cheapest per person
- [ ] Turn 6: "Hey Siri, how long is the bus?"
- [ ] Turn 10: asking Aria whether the taco place takes card

<p class="rd-take"><b>Turn 4 is the only T.</b> Turn 5 mentions Aria without asking (N1), turn 6 targets another device (N2), and turn 10 is an N4 question that a human resolves (Table 4).</p>

</article>

<article class="rd-page" id="check-addressing" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 2</b> From pages 6 and 16.</p>

## Gemini drops 64 points without the name; speech models don't move. What follows?

- [ ] The speech models infer addressees from context as well as from names
- [ ] The implicit requests were badly written
- [x] The name doesn't change the speech models' decision, for reasons this test can't separate
- [ ] The speech models handle implicit requests better than Gemini

<p class="rd-take"><b>No detected difference is not equal skill.</b> Context inference and ignoring the name both fit the data (§4.2, App. A5.1).</p>

</article>

<article class="rd-page" id="check-voila" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 3</b> Spot the flaw. From pages 13 and 17.</p>

## "Voila's Stop is 0.8484, so it's best at giving up the floor." What's wrong?

- [ ] Nothing: 0.8484 beats MiniCPM-o's 0.5964
- [x] The rate covers only 620 eligible events; MiniCPM-o yields far more often overall
- [ ] Stop also penalises wrong answers, which Voila avoids by rarely answering
- [ ] Voila's Stop was measured on implicit requests only

<p class="rd-take"><b>Read a conditional rate with its denominator.</b> Voila yields on 526 events, MiniCPM-o on 974, out of the same 1,911 (Table 15).</p>

</article>
