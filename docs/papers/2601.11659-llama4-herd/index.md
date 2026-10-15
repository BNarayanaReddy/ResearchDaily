---
title: "Llama 4 Herd"
paper_title: "The Llama 4 Herd: Architecture, Training, Evaluation, and Deployment Notes"
authors: ["Unknown (arXiv redacted the author list)"]
year: 2026
venue: "arXiv preprint, removed by arXiv administrators for incorrect authorship; an unofficial survey, not a Meta publication"
arxiv_id: "2601.11659"
arxiv_version: v1
paper_type: survey
hook: "Two open models both use 17B parameters per token, yet one needs almost four times the memory. A withdrawn, unofficial survey of Llama 4 explains why."
big_idea: "Llama 4 Scout and Maverick are mixture-of-experts models that run 17B parameters per token but must hold 109B or 400B in memory, read images and text in one stream, and (for Scout) stretch a 256K training context to a claimed 10M with iRoPE."
goal: "Decide whether to build a Telugu voice assistant on Llama 4 Scout."
difficulty: 2
difficulty_note: "Familiar ground: transformers, attention, LLMs. New: mixture-of-experts, RoPE vs no-position layers, distillation, each on its own page. Read from a withdrawn, unofficial survey: every number is second-hand and developer-reported."
date_added: 2026-10-15
tags: [LLMs, Multimodal, Efficiency, Distillation]
description: "Two open models both use 17B parameters per token, yet one needs almost four times the memory. A withdrawn, unofficial survey of Llama 4 explains why."
---

<article class="rd-page" id="moe" data-part="Toolbox" data-draw="moe" data-fast markdown>

<p class="rd-crumb"><b>Toolbox 1</b> Start here. Source: a withdrawn, unofficial survey of Meta's Llama 4 materials.</p>

## What does "17B active, 109B total" mean?

1. **A dense layer uses everything.** In a normal feed-forward block, every token passes through every weight. Compute grows with model size.
2. **MoE keeps many feed-forward blocks.** Each block is an **expert**. A small **router** scores the experts for each token. Scout has 16 of them (Table 1).
3. **Only the chosen expert runs.** The token "sold" visits one expert; the rest stay idle. Compute follows the **active** parameters: 17B (Table 1).
4. **Every expert stays in memory.** The next token may pick any expert. So memory follows the **total**: 109B for Scout (Table 1). [[109B | held to run 17B per token]]

<p class="rd-cap">Expert counts and parameter totals are real (Table 1). Router scores are made up; the 16-way choice is drawn per token.</p>

<p class="rd-take"><b>MoE buys big-model capacity at small-model compute, but not at small-model memory.</b> Next: how position enters attention.</p>

</article>

<article class="rd-page" id="rope" data-part="Toolbox" data-draw="rope" markdown>

<p class="rd-crumb"><b>Toolbox 2</b> Standard background, needed for Scout's long context on page 8.</p>

## How does attention know where a token sits?

1. **Attention alone ignores order.** Shuffle the words and the scores stay the same. Position has to be added.
2. **RoPE rotates by position.** **RoPE** turns each query and key by an angle that grows with its position. Move the slider to change the gap.
3. **Scores depend on the gap.** Only the angle between query and key matters. So the score encodes distance between two tokens.
4. **Long gaps reach unseen angles.** The slowest rotations only turn a little within the training length. Past it, they hit angles the model never saw.
5. **A NoPE layer skips rotation.** A layer with **no positional embedding** has nothing to extrapolate. Scout mixes both kinds (§2.2).

<p class="rd-cap">Illustrative: one slow rotation pair, drawn as a dial. The 256K training length is Scout's (§4.2); the angles are not real.</p>

<p class="rd-take"><b>RoPE layers can break beyond their training length; NoPE layers can't, because they know no positions.</b> Next: what a teacher model adds.</p>

</article>

<article class="rd-page" id="soft" data-part="Toolbox" data-draw="soft" markdown>

<p class="rd-crumb"><b>Toolbox 3</b> Standard background, used for Behemoth on page 11.</p>

## What does a teacher's soft target add?

1. **A hard target is one word.** Training text says the next token is "March". Cross-entropy pushes all probability onto it.
2. **A teacher spreads probability.** A big model might say March 60%, April 25%, May 10%. That is a **soft target**.
3. **Soft targets carry more signal.** They say which wrong answers are nearly right. The student learns that April was close.
4. **Mix the two losses.** Slide the weight between hard and soft. Maverick's training weighted them dynamically (§2.3).

<p class="rd-cap">All probabilities are made up for illustration. The mixing weight's real schedule is not given in this document (§2.3).</p>

<p class="rd-take"><b>Distillation trains the student on the teacher's whole distribution, not just the right answer.</b> Next: the three models.</p>

</article>

<article class="rd-page" id="herd" data-part="The herd" data-draw="herd" data-fast markdown>

<p class="rd-crumb"><b>Herd 1</b> Uses active and total parameters from page 1.</p>

## Who is in the Llama 4 herd?

1. **Scout is the small one.** 17B active, 109B total, 16 experts. Claimed context: 10M tokens (Table 1).
2. **Maverick has eight times the experts.** Still 17B active, but 128 experts and 400B total. Context: 1M tokens (Table 1).
3. **Behemoth is the teacher.** 288B active, 16 experts, nearly 2T total. It was still training at release (§2.3).
4. **Toggle to total parameters.** Active size is flat for the two released models. Total, and so memory, is not.
5. **Only two have open weights.** Scout and Maverick ship base and instruct checkpoints (Table 1). Behemoth was only previewed (§1).

<p class="rd-cap">All sizes are real but second-hand: the survey copies them from Meta's blog and model cards (Table 1, §2.3).</p>

<p class="rd-take"><b>Same compute per token, very different weight budgets.</b> Next: how a photo gets in.</p>

</article>

<article class="rd-page" id="fusion" data-part="The herd" data-draw="fusion" data-fast markdown>

<p class="rd-crumb"><b>Herd 2</b> Running example from here on: a bar-chart photo plus "Which month sold most?"</p>

## How does a photo enter the same stream as words?

1. **A vision encoder reads the photo.** It is based on MetaCLIP. It was trained separately, against a frozen Llama (§2.2).
2. **Its outputs become tokens.** Image tokens and word tokens sit in one sequence. This is **early fusion** (§2.4).
3. **One backbone reads both.** No separate adapter path at the end. Pretraining mixed text, images and video stills (§3.1).
4. **How many images fit?** Pretraining used up to 48 per prompt. Post-training worked well up to 8; model cards test about 5 (§2.4, §3.1).
5. **No audio in, no images out.** Inputs are text and images; outputs are text and code (Table 1).

<p class="rd-cap">Modalities and image counts are real (Table 1, §2.4, §3.1). Token counts per image are not reported; the chips are illustrative.</p>

<p class="rd-take"><b>To the backbone, our chart is just more tokens.</b> Next: what one token meets inside Maverick.</p>

</article>

<article class="rd-page" id="layer" data-part="The herd" data-draw="layer" data-fast markdown>

<p class="rd-crumb"><b>Herd 3</b> Follows the token "sold" from page 5 through the MoE of page 1.</p>

## What happens to one token inside Maverick?

1. **Layers alternate.** Maverick stacks dense layers and MoE layers in turn. Meta says this improves inference efficiency (§2.2).
2. **A dense layer is shared.** Every token, image or word, uses the same feed-forward weights there.
3. **Every token visits the shared expert.** In each MoE layer, "sold" always goes to one **shared expert** (§2.2).
4. **Plus one routed expert of 128.** The router picks exactly one more expert for this token (§2.2).
5. **The blueprint stops there.** Layer counts, widths and expert sizes are not in this document.

<p class="rd-cap">Alternation, shared expert and 1-of-128 routing are real (§2.2). Six layers and the router's choice are illustrative.</p>

<p class="rd-take"><b>Each token gets a common path plus one specialist per MoE layer.</b> Next: what that costs in memory.</p>

</article>

<article class="rd-page" id="memory" data-part="The herd" data-draw="memory" data-fast markdown>

<p class="rd-crumb"><b>Herd 4</b> Uses total parameters from pages 1 and 4.</p>

## Why does a 17B-active model need 200 GB?

1. **Weights scale with the total.** Scout's 109B parameters at 2 bytes each make 218 GB. Cloudflare reports "over 200 GB" (§2.5).
2. **One H100 holds 80 GB.** At bf16, Scout needs about three of them for weights alone.
3. **Int4 fits one GPU.** Half a byte per parameter gives 55 GB. Meta says Scout fits one H100 this way (§6).
4. **Maverick needs a whole host.** 400B in FP8 is 400 GB. Meta ships FP8 weights for one H100 DGX host (§6).
5. **Long context adds more.** The KV cache grows with context length on top of this (§2.5).

<p class="rd-cap">Parameter counts and the fit claims are real (Table 1, §2.5, §6). The GB figures are our arithmetic for weights only.</p>

<p class="rd-take"><b>Sparse compute does not shrink the bill for holding the weights.</b> Next: how Scout claims 10M tokens.</p>

</article>

<article class="rd-page" id="irope" data-part="The herd" data-draw="irope" data-fast markdown>

<p class="rd-crumb"><b>Herd 5</b> Uses RoPE and NoPE layers from page 2.</p>

## How does Scout stretch past its 256K training length?

1. **The claim is 10M tokens.** That is Scout's reported context length (Table 1).
2. **Training stopped at 256K.** Scout was pretrained and post-trained at 256K context (§4.2). The claim is 39 times longer.
3. **Interleave NoPE with RoPE.** **iRoPE** mixes attention layers without positions among RoPE layers (§2.2). The mixing ratio is not reported.
4. **NoPE layers have nothing to break.** They never saw positions, so unseen lengths look the same to them.
5. **Sharpen attention at inference.** Scout also scales attention temperature at inference time (§2.2). The next page shows why.
6. **Mid-training helped too.** A continued phase with long-context data came before (§3.1). Tests used needle retrieval and long code (§4.2).

<p class="rd-cap">256K, 10M and the iRoPE ingredients are real (Table 1, §2.2, §4.2). The layer pattern drawn is illustrative.</p>

<p class="rd-take"><b>Scout trains short, then leans on position-free layers to read long.</b> Next: why attention needs sharpening.</p>

</article>

<article class="rd-page" id="temp" data-part="The herd" data-draw="temp" markdown>

<p class="rd-crumb"><b>Herd 6</b> Continues the temperature scaling named on page 8.</p>

## Why sharpen attention when the context grows?

1. **One key matters most.** Say the needle key scores 14 above the others. At 256K tokens it gets most of the weight.
2. **More keys dilute it.** Softmax shares weight among all keys. Slide to 10M and the needle's share drops.
3. **Scale the scores up.** Multiplying scores by a factor that grows with length sharpens the softmax. Toggle it on.
4. **The needle comes back.** With scaling, its weight recovers at 10M. Scout applies such scaling at inference (§2.2).

<p class="rd-cap">Our arithmetic on made-up scores. The scaling rule log N / log 256K is illustrative; the real formula is not in this document.</p>

<p class="rd-take"><b>Longer contexts flatten softmax; a length-aware temperature undoes it.</b> Next: what went into pretraining.</p>

</article>

<article class="rd-page" id="data" data-part="The herd" data-draw="data" markdown>

<p class="rd-crumb"><b>Herd 7</b> Back to both released models from page 4.</p>

## What did pretraining consume?

1. **Scout read more tokens.** About 40T for Scout, about 22T for Maverick (Table 1). Data ends August 2024.
2. **Do not mix up 30T.** Meta's "more than 30T" describes Behemoth's mixture, a different scope (§3.1).
3. **200 languages went in.** Over 100 had at least 1B tokens each. Yet only 12 are officially supported (§3.1, Table 1).
4. **7.38M H100 hours in total.** Scout took 5.0M and Maverick 2.38M (§3.2).
5. **About 8–9M tokens per GPU-hour.** Toggle to see each model's rate. The survey calls this a coarse sanity check (§3.2).

<p class="rd-cap">Token counts and GPU-hours are real, self-reported (Table 1, §3.2). The per-hour rates are our division of those numbers.</p>

<p class="rd-take"><b>Maverick saw fewer tokens than Scout; a teacher made up the difference.</b> Next: that teacher.</p>

</article>

<article class="rd-page" id="codistill" data-part="The herd" data-draw="codistill" markdown>

<p class="rd-crumb"><b>Herd 8</b> Uses soft targets from page 3 and Behemoth from page 4.</p>

## How did Behemoth teach Maverick?

1. **Both trained at once.** Maverick was **codistilled** from Behemoth while Behemoth was still training (§2.3).
2. **Hard plus soft targets.** The student loss mixed the data's next token with Behemoth's distribution (§2.3).
3. **The weight shifted during training.** Meta calls it a dynamically weighted loss. The schedule is not given (§2.3).
4. **Teacher passes were shared.** Doing this during pretraining spread Behemoth's forward-pass cost over most of the data (§2.3).
5. **New data got extra targets.** Data added later received separate teacher-generated targets (§2.3).

<p class="rd-cap">The recipe is real but only described in words (§2.3). The timeline and weight curve are illustrative.</p>

<p class="rd-take"><b>Maverick learned from a 2T teacher's soft targets, not just from text.</b> Next: the fine-tuning recipe.</p>

</article>

<article class="rd-page" id="posttrain" data-part="The herd" data-draw="posttrain" markdown>

<p class="rd-crumb"><b>Herd 9</b> After pretraining, for Maverick.</p>

## Why throw away half the fine-tuning data?

1. **Three stages, two kept light.** Lightweight **SFT**, then online **RL**, then lightweight **DPO** (§4.1).
2. **Heavy SFT narrows the model.** Meta reports that aggressive SFT or DPO restricts exploration during RL (§4.1).
3. **Drop the easy half.** Llama models judged difficulty; more than half the easy examples were removed (§4.1).
4. **RL keeps medium-to-hard prompts.** Online RL alternates training with re-filtering, biased toward harder prompts (§4.1).
5. **DPO polishes corner cases.** A final light preference step fixes response quality on edge cases (§4.1).

<p class="rd-cap">Stages and filtering are real but described only in words (§4.1). The dots and the share removed are illustrative.</p>

<p class="rd-take"><b>Less imitation, more practice on hard prompts.</b> Next: the benchmark tables.</p>

</article>

<article class="rd-page" id="base" data-part="Does it work?" data-draw="base" markdown>

<p class="rd-crumb"><b>Results 1</b> Base checkpoints, before post-training. All numbers are developer-reported.</p>

## Does the base model beat Llama 3.1?

1. **Scout matches a 70B dense model.** MMLU 79.6 against 79.3, with 17B active (Table 3).
2. **Maverick edges past 405B.** MMLU 85.5 against 85.2; MMLU-Pro 62.9 against 61.6 (Table 3).
3. **Math moves most.** MATH: Maverick 61.2, Llama 3.1 405B 53.5 (Table 3).
4. **Multilingual QA does not.** On TyDiQA, Maverick's 31.7 trails 405B's 34.3 (Table 3).
5. **Images have no baseline.** ChartQA 85.3 and DocVQA 91.6 for Maverick; Llama 3.1 cannot see (Table 3).

<p class="rd-cap">Scores are real, copied from Meta's model card (Table 3, bf16). Bars for Llama 3.1 70B, 405B, Scout, Maverick.</p>

<p class="rd-take"><b>17B active roughly matches 70B–405B dense on text, except multilingual QA.</b> Next: the instruction-tuned models.</p>

</article>

<article class="rd-page" id="instruct" data-part="Does it work?" data-draw="instruct" data-fast markdown>

<p class="rd-crumb"><b>Results 2</b> Instruction-tuned checkpoints. Uses Scout vs Maverick from page 4.</p>

## Where does Maverick's bigger expert pool show?

1. **Hard reasoning shows it.** GPQA Diamond: Maverick 69.8, Scout 57.2 (Table 4).
2. **Fresh code shows it.** LiveCodeBench: Maverick 43.4, Scout 32.8, Llama 3.3 70B 33.3 (Table 4).
3. **Multilingual math barely moves.** MGSM: Scout 90.6, Maverick 92.3, Llama 3.3 70B 91.1 (Table 4).
4. **Documents tie.** Toggle to images: both score 94.4 on DocVQA (Table 4).
5. **Charts gain from tuning.** ChartQA rises from 85.3 base to 90.0 for Maverick (Tables 3, 4). That covers our chart question.

<p class="rd-cap">Scores are real, from Meta's model card (Table 4, bf16). Same active size; the survey ties the gap to 128 experts (§5.2).</p>

<p class="rd-take"><b>More experts pay off most on hard reasoning and coding.</b> Next: whether the long context is used.</p>

</article>

<article class="rd-page" id="mtob" data-part="Does it work?" data-draw="mtob" markdown>

<p class="rd-crumb"><b>Results 3</b> Tests the long context from page 8.</p>

## Does the long context get used?

1. **The task puts a book in the prompt.** MTOB translates between English and kgv, with half or the full book as context (Table 4).
2. **The baseline gets no score.** Llama 3 rows read "Context window is 128K" (Table 4). There is no number to compare.
3. **Maverick beats Scout.** Full book, English to kgv: 50.8 against 39.7 chrF (Table 4).
4. **🧠 Longer is not better here.** Scout claims 10M tokens, ten times Maverick. It still loses on its signature task.

<p class="rd-cap">chrF scores are real (Table 4). kgv is the language code for Kalamang (our note); the survey does not explain MTOB.</p>

<p class="rd-take"><b>A bigger context window is no guarantee of better long-context answers.</b> Next: what providers actually serve.</p>

</article>

<article class="rd-page" id="served" data-part="Your move" data-draw="served" markdown>

<p class="rd-crumb"><b>Move 1</b> Uses the KV-cache cost from page 7.</p>

## How much context will a provider give you?

1. **Scout claims 10M.** Maverick claims 1M (Table 1). The bars use a log scale.
2. **Cloudflare started at 131K.** Workers AI launched Scout with a 131,000-token window (§8).
3. **Bedrock offered 3.5M.** Scout at 3.5M, Maverick at the full 1M (§8).
4. **SageMaker listed Maverick at 128K.** Scout was listed at 10M (§8).
5. **The KV cache sets the limit.** It grows with context length and batch size (§8). 10M tokens is 76 times 131K.

<p class="rd-cap">Provider limits are real, at announcement time, as reported in §8. Our ratio 10M ÷ 131K ≈ 76.</p>

<p class="rd-take"><b>Treat context length as a per-endpoint contract, not a model constant (§8).</b> Next: the license.</p>

</article>

<article class="rd-page" id="license" data-part="Your move" data-draw="license" markdown>

<p class="rd-crumb"><b>Move 2</b> Before you ship anything built on Llama 4.</p>

## What does the license make you do?

1. **Show "Built with Llama".** Redistribution needs the agreement and that phrase in product materials (§9).
2. **Start the name with "Llama".** A distributed model trained from Llama outputs must be named "Llama-…" (§9).
3. **Keep the NOTICE file.** Copies must carry a specified attribution notice (§9).
4. **Above 700M users, ask Meta.** Licensees past 700M monthly active users need a separate license (§9).
5. **EU limits on multimodal models.** Rights to the multimodal models are not granted to EU-based individuals or companies, except end users (§9).

<p class="rd-cap">Summarised from §9, which summarises Meta's license text. Read the license itself before relying on this.</p>

<p class="rd-take"><b>It is open weights under a custom license, not open source (§9).</b> Next: what a reviewer would question.</p>

</article>

<article class="rd-page" id="reviewer" data-part="Your move" data-draw="reviewer" markdown>

<p class="rd-crumb"><b>Move 3</b> 🧠 Our review of this document, not of Llama 4 itself.</p>

## What would a careful reviewer question?

1. **🧠 Who wrote it?** arXiv removed v1 for incorrect authorship. The PDF still lists hundreds of Meta names.
2. **🧠 Every number is second-hand.** It copies model cards and blogs; it runs nothing itself (§1).
3. **🧠 Token counts conflict.** 40T and 22T per model versus 30T for Behemoth's mix (§3.1). The survey flags it, without resolving it.
4. **🧠 The blueprint is missing.** No layer counts, widths, NoPE ratio or temperature formula.
5. **🧠 Steelman: it is careful.** It separates marketing claims from model cards and flags the LMArena variant (§1, §10.1).

<p class="rd-cap">Our judgement. Pointers show where each issue appears in the document.</p>

<p class="rd-take"><b>Useful as an index of Meta's claims; not a source to cite as Meta's.</b> Next: the verdict for a speech project.</p>

</article>

<article class="rd-page" id="verdict" data-part="Your move" data-draw="verdict" data-fast markdown>

<p class="rd-crumb"><b>Move 4</b> 🧠 Goal we picked: a Telugu voice assistant, ASR in front, LLM in the middle.</p>

## Should you build a Telugu voice assistant on Scout?

1. **No audio input.** Scout reads text and images only (Table 1). You need your own ASR and TTS around it.
2. **Telugu is not supported.** Hindi is among the 12 languages; Telugu is not (Table 1). Pretraining covered 200 (§3.1).
3. **Hardware is one H100.** Int4 weights fit 80 GB (§6). A 24 GB card cannot hold 55 GB.
4. **Naming and branding rules apply.** A fine-tune must be named "Llama-…" and show "Built with Llama" (§9).
5. **🧠 Verdict: not your first pick.** Use a smaller dense LLM with Telugu support unless you already have an H100.

<p class="rd-cap">Facts from Table 1, §3.1, §6, §9. The 55 GB is our arithmetic (page 7). The verdict is ours.</p>

<p class="rd-take bad"><b>Scout is too big and too Telugu-blind to be the easy choice for this goal.</b> Then check yourself.</p>

</article>

<article class="rd-page" id="check-memory" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 1</b> From pages 1, 4 and 7.</p>

## Why does Maverick need far more memory than Scout?

- [ ] It has a longer context window
- [x] All 128 experts must stay loaded, so 400B parameters sit in memory
- [ ] It activates more parameters for every token
- [ ] Its weights are stored in FP8

<p class="rd-take"><b>Memory follows total parameters, and Maverick holds 400B.</b> Both activate 17B per token; Maverick's context (1M) is shorter than Scout's (Table 1).</p>

</article>

<article class="rd-page" id="check-irope" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 2</b> From pages 2, 8 and 9.</p>

## How does Scout aim to work beyond 256K tokens?

- [ ] It was trained directly on 10M-token documents
- [ ] It removes positional embeddings from every layer
- [x] It interleaves position-free layers with RoPE layers and scales attention temperature at inference
- [ ] It compresses old tokens into image tokens

<p class="rd-take"><b>iRoPE plus inference-time temperature scaling (§2.2).</b> Training stopped at 256K (§4.2), and RoPE layers are kept, not removed.</p>

</article>

<article class="rd-page" id="check-arena" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 3</b> Spot the flaw. From pages 13–15 and the reviewer page.</p>

## A blog says your downloaded Maverick scores 1417 on LMArena. What's wrong?

- [ ] LMArena only scores image tasks
- [ ] 1417 was Scout's score, not Maverick's
- [x] The scored "experimental chat" variant was not the released checkpoint
- [ ] LMArena scores base models, not instruction-tuned ones

<p class="rd-take"><b>The arena model was a different, experimental variant (§10.1).</b> The survey treats the bf16 model-card tables as the reference instead (§1, §10.1).</p>

</article>
