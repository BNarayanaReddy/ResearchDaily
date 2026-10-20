---
title: "Ming-3.0-tts-tiny"
paper_title: "Ming-3.0-tts-tiny (open-weight model release, no paper)"
authors: ["inclusionAI (Ant Group)"]
year: 2026
venue: "Model release: model card, code and blog"
source: model-release
source_id: "ming-3.0-tts-tiny"
sources:
  - {label: "Model card", url: "https://huggingface.co/inclusionAI/Ming-3.0-tts-tiny", note: "read at revision b170071 (Oct 20 2026): config, model code, benchmark tables"}
  - {label: "Blog & demos", url: "https://nomorecoding.github.io/Ming-3.0-tts/", note: "vendor page: models, Artificial Analysis rankings (for the 0.5b model)"}
code: {url: "https://github.com/inclusionAI/Ming-3.0-tts", license: "MIT", note: "inference only, read at commit e999c39; no training code; not run"}
model: {url: "https://huggingface.co/inclusionAI/Ming-3.0-tts-tiny", license: "MIT", note: "about 18 GB of bf16 shards; card, config and code read, weights not downloaded or run"}
paper_type: model-release
hook: "A speech model that never picks a token: each 80 ms of audio is 64 real numbers, drawn by a small flow model from a 7.9B mixture-of-experts language model's hidden state."
big_idea: "Ming-3.0-tts-tiny is an autoregressive language model over continuous audio latents: a 7.9B-total, 1.3B-active MoE backbone emits one hidden vector per 80 ms, a 16-layer DiT turns it into a 64-number latent with 10 flow-matching steps, and an aggregator feeds that latent back in."
goal: "Choose between Ming-3.0-tts-tiny and its 0.5b sibling for an expressive Chinese or English narration product."
difficulty: 3
difficulty_note: "Home turf: TTS, codecs, voice cloning. New: continuous latents instead of tokens, flow matching, mixture of experts and linear attention, each on its own page. No paper, so every claim points to the card, config, code or blog."
date_added: 2026-10-20
tags: [Speech, TTS, Generative models, Multilingual]
description: "A speech model that never picks a token: each 80 ms of audio is 64 real numbers, drawn by a small flow model from a 7.9B mixture-of-experts language model's hidden state."
---

<article class="rd-page" id="latents" data-part="Toolbox" data-draw="latents" data-fast markdown>

<p class="rd-crumb"><b>Toolbox 1</b> Start here. No paper exists, so pointers name the source: (§card), (§config), (§code), (§README), (§blog).</p>

## How can 80 ms of speech be 64 numbers instead of a token?

1. **Cut the waveform into frames.** The audio VAE reads 44.1 kHz audio in frames of 882 samples: one every 20 ms (§config).
2. **Group four frames into a patch.** Patches of 4 give one step every 80 ms, 12.5 per second (§config, §card).
3. **Each step is 64 real numbers.** No codebook and no token id: a continuous **latent** vector (§config).
4. **A decoder turns latents back into sound.** The same VAE rebuilds 44.1 kHz audio from the latent sequence (§code).
5. **Our running example.** A 4 s reference is 50 steps; an 8 s sentence is 100. [[100 | steps for 8 s]]

<p class="rd-cap">Rates and sizes from config.json (audio_config, tts_config). The waveform and latent values are made up.</p>

<p class="rd-take"><b>Speech becomes 12.5 vectors of 64 numbers per second.</b></p>

</article>

<article class="rd-page" id="flow" data-part="Toolbox" data-draw="flow" data-fast markdown>

<p class="rd-crumb"><b>Toolbox 2</b> How to generate one of page 1's 64-number vectors.</p>

## How does flow matching turn noise into a sample?

1. **Start from pure noise.** Draw a random vector \(x_0\), the same size as the target \(x_1\).
2. **Draw a straight path.** In training, the point at time t is \((1-t)x_0 + t\,x_1\) (§code CFM.py).
3. **Learn the velocity.** The network predicts \(x_1 - x_0\) at that point; the loss is mean squared error (§code CFM.py).
4. **Generate by following it.** Start at noise and take small Euler steps along the predicted velocity. Move the slider.
5. **Ming uses 10 steps.** Each 80 ms latent takes 10 velocity predictions by default (§card).

<p class="rd-cap">The 2-D points are a toy; real latents have 64 dimensions. Formulas from CFM.py.</p>

<p class="rd-take"><b>Flow matching learns which way to move noise to reach data.</b> No token, no softmax.</p>

</article>

<article class="rd-page" id="moe" data-part="Toolbox" data-draw="moe" markdown>

<p class="rd-crumb"><b>Toolbox 3</b> Explains "7.9B total, 1.3B active".</p>

## How can a 7.9B model run only 1.3B per token?

1. **Split the feed-forward layer into experts.** Each MoE layer has 128 small experts plus 1 shared one (§config).
2. **A router picks 8.** For each position, a sigmoid router scores the experts and keeps the top 8 (§config).
3. **Only picked experts compute.** The other 120 sit idle for that position, so compute follows active parameters.
4. **7.9B stored, about 1.3B used.** All experts must sit in memory, but each token runs about 1.3B (§card). [[16% | of parameters active per token (our arithmetic)]]

<p class="rd-cap">Expert counts from config.json; 7.9B and 1.3B from the card. Which experts light up is made up.</p>

<p class="rd-take"><b>Memory pays for 7.9B; speed pays for 1.3B.</b></p>

</article>

<article class="rd-page" id="machine" data-part="The machine" data-draw="machine" data-fast markdown>

<p class="rd-crumb"><b>Machine 1</b> Our 4 s reference and 8 s sentence enter here.</p>

## What is the whole machine?

1. **Text and controls go in first.** The prompt holds the task, the transcript and the new sentence as text tokens (§code).
2. **The voice comes in two forms.** A 192-number speaker embedding and the reference clip's 50 latents (§config, §code).
3. **The backbone runs left to right.** A 24-layer MoE language model makes one hidden vector per 80 ms step (§config).
4. **A DiT head draws the latent.** A 16-layer flow model turns that hidden vector into 64 numbers (§config).
5. **The latent feeds back in.** An aggregator maps it to the backbone's next input; after the last step, the VAE decodes audio (§code).

<p class="rd-cap">Sizes from config.json; flow from modeling_lingv3_tts.py. Our drawing; the card's is its architecture figure.</p>

<p class="rd-take"><b>An autoregressive loop: backbone, flow head, aggregator, repeat.</b> 100 rounds for our 8 s sentence.</p>

</article>

<article class="rd-page" id="prompt" data-part="The machine" data-draw="prompt" markdown>

<p class="rd-crumb"><b>Machine 2</b> Zooms into the input from page 4.</p>

## What does the model read before it speaks?

1. 💻 **A chat-style frame.** A human turn asks to "generate speech based on the following description"; an assistant turn answers.
2. 💻 **One slot holds the speaker.** Between `<spk>` markers sits a single position for the speaker embedding.
3. 💻 **Then the text.** The reference transcript and the new sentence follow "Text input:".
4. 💻 **The reference audio comes last.** After `<audio>`, 50 placeholders are replaced by the reference latents.
5. 💻 **Controls change the text part.** Emotion, dialect or a free-form instruction become extra prompt text, one task at a time (§card).

<p class="rd-cap">Layout from prompt_contract.py, the `legacy_antmmf` format that config.json selects. The sentences are ours.</p>

<p class="rd-take"><b>To the backbone, a TTS request looks like a chat turn.</b> The answer is audio, not text.</p>

</article>

<article class="rd-page" id="speaker" data-part="The machine" data-draw="speaker" markdown>

<p class="rd-crumb"><b>Machine 3</b> Fills the speaker slot from page 5.</p>

## Where does the voice come from?

1. **CAM++ makes a voice fingerprint.** A speaker-verification network turns the clip into 192 numbers (§card, §config).
2. 💻 **One linear layer maps it in.** It becomes one 1,536-wide position in the speaker slot.
3. 💻 **Cloning also adds the audio.** Tasks `seed`, `multilingual` and `paralinguistic` also feed the 50 reference latents.
4. 💻 **Control tasks use the fingerprint only.** `emotion`, `dialect` and `basic` skip the reference latents and transcript.
5. 💻 **Designed voices get an empty slot.** `voice_design` and `freeform` take no reference; the slot gets no fingerprint.

<p class="rd-cap">Modes from task_protocol.py and inference.py (commit e999c39).</p>

<p class="rd-take"><b>Three ways to set the voice: fingerprint plus audio, fingerprint only, or words.</b></p>

</article>

<article class="rd-page" id="backbone" data-part="The machine" data-draw="backbone" markdown>

<p class="rd-crumb"><b>Machine 4</b> Opens the backbone from page 4, using page 3's experts.</p>

## What happens inside the 24 layers?

1. **24 layers, 1,536 wide.** It is the Ling V3 MoE language model (§config, §card).
2. **Layer 1 is dense.** Its feed-forward block has no experts; layers 2 to 24 use page 3's 128 experts (§config).
3. **18 layers use linear attention.** Kimi Delta Attention keeps a fixed-size state, however long the audio (§code).
4. **Every fourth layer uses full attention.** Six multi-latent attention layers can still look back at every position (§code).
5. **The last layer's vector conditions the head.** Its final hidden state goes to the flow head and the stop head (§code).

<p class="rd-cap">Layer pattern from modeling_bailing_moe_v3.py: layer i uses full attention when (i + 1) is a multiple of 4.</p>

<p class="rd-take"><b>Mostly constant-memory layers, with periodic full lookback.</b></p>

</article>

<article class="rd-page" id="dithead" data-part="The machine" data-draw="dithead" data-fast markdown>

<p class="rd-crumb"><b>Machine 5</b> Applies page 2's flow matching to one step.</p>

## How does one hidden vector become 80 ms of audio?

1. **The head sees three positions.** The time-plus-condition vector, the previous latent and the noisy current latent (§code dit.py).
2. **It is a 16-layer transformer.** Width 1,024, 16 heads, running on just those three positions (§config).
3. **Ten passes per step.** The solver calls it 10 times, moving the noise toward a latent (§card).
4. **Out comes one latent.** 64 numbers for the next 80 ms of our sentence (§config).
5. **Training is page 2's loss.** Mean squared error on the velocity, conditioned on the backbone's vector (§code CFM.py).

<p class="rd-cap">Shapes from dit.py and config.json (flow_config). Latent values are made up.</p>

<p class="rd-take"><b>A small DiT draws each 80 ms in 10 steps.</b> Next: which times those 10 steps visit.</p>

</article>

<article class="rd-page" id="solver" data-part="The machine" data-draw="solver" markdown>

<p class="rd-crumb"><b>Machine 6</b> The 10 steps of page 8.</p>

## Which times do the 10 solver steps visit?

1. **Even steps would be 0.1 apart.** Ten equal steps from noise (t = 0) to data (t = 1).
2. 💻 **A fixed table starts finer.** EPSS times in 32nds: 0, 2, 4, 6, 8, 12, 16, 20, 24, 28, 32.
3. 💻 **Sway sampling squeezes the start.** With coefficient −1, each time becomes \(1 - \cos(\pi t/2)\).
4. **The first step is tiny.** It ends at t = 0.005; the last covers 0.81 to 1 (our arithmetic). Toggle the schedules.
5. 💻 **The API adds no noise.** It passes temperature 0, so each step is a plain Euler step.

<p class="rd-cap">Times computed live from CFM.py's EPSS table and sway formula.</p>

<p class="rd-take"><b>Most of the 10 steps are spent near the noise end.</b></p>

</article>

<article class="rd-page" id="cfg" data-part="The machine" data-draw="cfg" markdown>

<p class="rd-crumb"><b>Machine 7</b> Runs inside each of page 9's steps.</p>

## How does guidance push the flow head?

1. 💻 **Two velocities per step.** One uses the backbone's vector c; the other gets zeros in its place.
2. 💻 **Training made zeros meaningful.** The DiT's default drops the condition for 10% of examples.
3. 💻 **Push past the conditioned guess.** Velocity = c + w(c − u), with w = 2 by default (§card).
4. **Larger w follows the text harder.** Move w: the arrow stretches away from the unconditioned one.

<p class="rd-cap">Formula from CFM.py, w = 2 from the card. The 2-D arrows are made up.</p>

<p class="rd-take"><b>Guidance amplifies what the backbone adds over generic speech.</b></p>

</article>

<article class="rd-page" id="aggregator" data-part="The machine" data-draw="aggregator" markdown>

<p class="rd-crumb"><b>Machine 8</b> Closes the loop from page 4.</p>

## How does the new latent get back into the backbone?

1. **The backbone needs 1,536 numbers.** The latent has only 64 (§config).
2. **An aggregator bridges them.** An 8-layer transformer, width 1,024, reads the latent (§config).
3. 💻 **A summary token collects it.** A learned CLS position is prepended; its output becomes the next input.
4. 💻 **The same path reads the reference.** The 50 reference latents enter the prompt through this aggregator too.
5. 💻 **The head remembers one step.** The latest latent is also the "previous latent" for the next head call.

<p class="rd-cap">From aggregator.py and modeling_lingv3_tts.py; history_size = 1 in config.json.</p>

<p class="rd-take"><b>Each output becomes the next input, as in any language model.</b></p>

</article>

<article class="rd-page" id="stop" data-part="The machine" data-draw="stop" markdown>

<p class="rd-crumb"><b>Machine 9</b> Ends the loop.</p>

## How does it know when to stop talking?

1. **A stop head reads each step.** A linear layer gives the probability that speech should end (§code).
2. **Stop above 0.5.** Generation ends at the first step where it exceeds 0.5 (§config).
3. **Never before 13 steps.** That is about 1 s of speech minimum (§config, our arithmetic).
4. **Never after 250 steps.** That caps one call at 20 s (§config, our arithmetic). Move the slider.

<p class="rd-cap">Thresholds from config.json (tts_config). The probability curve is made up.</p>

<p class="rd-take"><b>One call speaks between about 1 and 20 seconds.</b> Longer text must be split.</p>

</article>

<article class="rd-page" id="cost" data-part="The machine" data-draw="cost" markdown>

<p class="rd-crumb"><b>Machine 10</b> Adds up pages 7 to 11 for our sentence.</p>

## How much work does 8 seconds of speech take?

1. **100 backbone steps.** One per 80 ms, each running about 1.3B active parameters (§card, §config).
2. **1,000 flow-head calls.** Ten per step; each call runs the conditioned and unconditioned copies together (§code).
3. **100 aggregator calls.** One per new latent (§code).
4. **Speed is not reported.** No real-time factor appears in the card, README or blog. Move the slider.

<p class="rd-cap">Counts are our arithmetic from the defaults. The bar heights are counts, not time.</p>

<p class="rd-take"><b>Cost grows with speech length: 10 head calls per 80 ms.</b></p>

</article>

<article class="rd-page" id="seed" data-part="Does it work?" data-draw="seed" data-fast markdown>

<p class="rd-crumb"><b>Results 1</b> Seed-TTS zero-shot cloning, Chinese and English.</p>

## Does it clone voices well?

1. **Best voice match in both languages.** Similarity 0.781 in Chinese and 0.728 in English, top among the open models listed (§card).
2. **Chinese errors are low, not lowest.** WER 0.82% against 0.71% for CosyVoice3-1.5B (§card).
3. **English errors trail more.** WER 1.67% against 1.24% for Qwen3-TTS-1.7B (§card). Toggle the language.
4. **The small sibling reads better.** Ming-3.0-tts-0.5b scores 0.80% and 1.58% WER (§card).

<p class="rd-cap">All values from the card's Seed-TTS table, run by the authors with each model's recommended settings.</p>

<p class="rd-take"><b>Strongest at sounding like the speaker; mid-pack on word accuracy.</b></p>

</article>

<article class="rd-page" id="multilingual" data-part="Does it work?" data-draw="multilingual" markdown>

<p class="rd-crumb"><b>Results 2</b> MiniMax test set, five languages.</p>

## How does it do beyond Chinese and English?

1. **Best word accuracy in German and Spanish.** WER 0.325% and 0.971% (§card).
2. **Close in French and Japanese.** 3.47% against 3.38% in French; Japanese CER 3.43% against 3.42% (§card).
3. **Korean is the gap.** CER 6.00%, against 1.64% for FireRedTTS3 and 1.73% for its 0.5b sibling (§card).
4. **Voice match trails here.** FireRedTTS3 has higher similarity in all five languages (§card). Toggle the metric.

<p class="rd-cap">Values from the card's multilingual table. The card itself names Korean as its clearest gap.</p>

<p class="rd-take"><b>Strong in European languages, weak in Korean.</b></p>

</article>

<article class="rd-page" id="control" data-part="Does it work?" data-draw="control" markdown>

<p class="rd-crumb"><b>Results 3</b> The controls from pages 5 and 6.</p>

## Do the controls actually work?

1. **Tags land most often.** Chinese single-tag PCER is 17.2%, against 22.8% for the 0.5b and 27.7% for NV-CV3 (§card).
2. **Emotion is second best.** CV3 accuracy averages 74.0%, against 77.7% for CosyVoice3 with DiffRO (§card).
3. **Hard emotion is weaker.** When the words carry no emotion, accuracy drops to 30.7% (§card).
4. **Voice design is second.** 75.4% on InstructTTSEval-ZH, against Qwen3-TTS's 77.1% (§card). Toggle the benchmark.

<p class="rd-cap">Values from the card's NVBench, CV3, CV3N and InstructTTSEval tables. PCER: lower is better.</p>

<p class="rd-take"><b>Best at paralinguistic tags; close behind on emotion and voice design.</b></p>

</article>

<article class="rd-page" id="siblings" data-part="Does it work?" data-draw="siblings" data-fast markdown>

<p class="rd-crumb"><b>Results 4</b> Every metric the card reports for both Ming models.</p>

## Does the 7.9B MoE beat its 0.5B dense sibling?

1. **Mostly, yes.** Tiny wins 40 of 62 shared metrics, the 0.5b wins 20, and 2 tie (our count, §card).
2. **Tiny leads where variety matters.** Multilingual 9 of 10, paralinguistic tags 9 of 12, voice design 4 of 4.
3. **The 0.5b leads on fine control.** Speed, pitch and volume 4 of 6; hard emotion 4 of 7.
4. **Seed-TTS splits.** Tiny matches voices better; the 0.5b has lower WER in both languages (§card).

<p class="rd-cap">Our tally of the card's tables, metric by metric. Podcast is tiny only.</p>

<p class="rd-take"><b>Sixteen times the stored parameters buys breadth, not a clean sweep.</b></p>

</article>

<article class="rd-page" id="breeze" data-part="Your move" data-draw="breeze" markdown>

<p class="rd-crumb"><b>Your move 1</b> Compares with our Breeze TTS 2 lesson.</p>

## How does it differ from Breeze TTS 2?

1. **Both speak in 80 ms steps.** Breeze predicts codec tokens per frame; Ming predicts a 64-number latent (§config).
2. **Different second stages.** Breeze's depth decoder picks 15 more codes; Ming's DiT runs 10 flow steps (§config).
3. **Leaderboards split them.** On Artificial Analysis, Ming-0.5b beats Breeze in Controlled Voice; Breeze wins Provider Voice (§blog).
4. **Licences differ.** Ming is MIT; Breeze's weights are research and non-commercial (§card).

<p class="rd-cap">Breeze facts from <a href="../breeze-tts-2/">our Breeze TTS 2 lesson</a>. Elo values from the blog, October 2026.</p>

<p class="rd-take"><b>Same 80 ms rhythm, opposite answers to "token or vector?"</b></p>

</article>

<article class="rd-page" id="reviewer" data-part="Your move" data-draw="reviewer" markdown>

<p class="rd-crumb"><b>Your move 2</b> Specific to this release.</p>

## What would a careful reviewer question?

1. **What was it trained on?** Not reported: no data, hours or training code (§card, §README).
2. **Whose leaderboard ranks?** The README credits "Ming-3.0-tts"; the blog says the ranked model is the 0.5b (§README, §blog).
3. **Who ran the baselines?** The authors, with a unified ASR protocol and each model's recommended settings (§card).
4. **How fast is it?** No real-time factor or latency is reported; the card recommends an H800 (§card).
5. 🧠 **Steelman: unusually open.** MIT weights and code, per-task limits listed, and weaknesses named in the card.

<p class="rd-cap">Each row points to the card, README or blog. Row 5 is our judgement.</p>

<p class="rd-take"><b>Well documented for use; silent on how it was made.</b></p>

</article>

<article class="rd-page" id="verdict" data-part="Your move" data-draw="verdict" data-fast markdown>

<p class="rd-crumb"><b>Your move 3</b> Our pick: an expressive Chinese or English narration product.</p>

## Should you pick tiny or the 0.5b?

1. **Need tags, emotion or designed voices?** Tiny: best tag accuracy, better voice design (75.4% vs 72.3%) (§card).
2. **Need exact words and attribute control?** The 0.5b: lower Seed-TTS WER and 93.3% attribute accuracy vs 88.2% (§card).
3. **Need dialogue?** Only tiny has the podcast task (§README).
4. **Small GPU?** Tiny stores 7.9B parameters, about 18 GB of shards; the card recommends an H800 (§card).
5. 🧠 **Verdict: start with the 0.5b.** Move to tiny if tags, design or podcasts matter. Neither supports Indic languages (§card).

<p class="rd-cap">Numbers from the card's tables and file list. Our pick of goal.</p>

<p class="rd-take"><b>Tiny for expressive range; 0.5b for accuracy and footprint.</b></p>

</article>

<article class="rd-page" id="q-rate" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 1</b> From pages 1 and 8.</p>

## How many times does the flow head run for 8 seconds of speech?

- [ ] 100, once per latent step
- [x] 1,000, ten per latent step
- [ ] 400, once per 20 ms frame
- [ ] 10, once per solver step

<p class="rd-take"><b>1,000.</b> 8 s at 12.5 steps per second is 100 latents, and each takes 10 flow steps (§config, §card).</p>

</article>

<article class="rd-page" id="q-active" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 2</b> From page 3.</p>

## Why does tiny need memory for 7.9B parameters if only 1.3B are active?

- [ ] The other experts run in the background
- [x] Any token may route to any expert, so all must be loaded
- [ ] The flow head stores the rest
- [ ] Only the first step uses all of them

<p class="rd-take"><b>Every expert must be ready.</b> The router picks 8 of 128 per position, and different positions pick different experts (§config).</p>

</article>

<article class="rd-page" id="q-leaderboard" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 3</b> From page 20. Spot the flaw.</p>

## "Tiny is 1st among open-weight models on Artificial Analysis." What's wrong?

- [ ] Artificial Analysis only ranks closed models
- [x] The ranked model is Ming-3.0-tts-0.5b, not tiny
- [ ] The ranking was for Korean
- [ ] Nothing; tiny is the ranked model

<p class="rd-take"><b>It was the 0.5b.</b> The blog names Ming-3.0-tts-0.5b for those rankings (§blog).</p>

</article>
