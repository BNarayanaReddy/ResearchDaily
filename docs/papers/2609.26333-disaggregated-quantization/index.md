---
title: "Disaggregated Quantization"
paper_title: "Disaggregated Quantization: Specializing LLM Prefill and Decode"
authors: ["Andrei Panferov", "Maximilian Kleinegger", "Sweta Priyadarshi", "Tijmen Blankevoort", "Dan Alistarh"]
year: 2026
venue: "arXiv preprint"
arxiv_id: "2609.26333"
arxiv_version: v1
code: {url: "https://github.com/IST-DASLab/disaggregated-quantization", license: "not stated in the paper", note: "code for the main results, plus a llama.cpp fork with ODP (§5); not run here"}
model: {url: "https://huggingface.co/ISTA-DASLab/Qwen3.8-27B-NVFP4-prefiller", license: "not stated in the paper", note: "the trained Qwen3.8-27B prefillers (§5); not run here"}
paper_type: method
hook: "Take a 1-bit Qwen3.8-27B that scores 29% on MMLU-Pro, leave its weights untouched, and add a separately trained 4-bit prompt reader streamed from the SSD: it scores 61.5% and handles long prompts up to 1.78× faster."
big_idea: "Reading the prompt is compute-bound and writing the answer is memory-bound, so give each phase its own quantization format (and, if you can store it, its own weights), trained together through the KV cache so the answer stays right."
goal: "Decide whether to run a large LLM locally on one GPU as a 1–2-bit GGUF plus a trained prefiller, for long-prompt work such as Q&A over meeting transcripts."
difficulty: 3
difficulty_note: "New subfield (LLM inference and number formats), but the math is arithmetic: bytes versus FLOPs, block scales, and one KL loss."
date_added: 2026-09-30
tags: [LLMs, Efficiency, Systems]
description: "Take a 1-bit Qwen3.8-27B that scores 29% on MMLU-Pro, leave its weights untouched, and add a separately trained 4-bit prompt reader streamed from the SSD: it scores 61.5% and handles long prompts up to 1.78× faster."
---

<article class="rd-page" id="primer-prefill-decode" data-part="Toolbox" data-draw="phases" markdown>

<p class="rd-crumb"><b>Toolbox 1</b> Start here. Our running example: one 16K-token prompt on Qwen3-8B.</p>

## Why does answering a prompt happen in two phases?

1. **The prompt goes in at once.** Our example is a question about a long document, 16,384 tokens. **Prefill** pushes all of them through the network together (§1).
2. **Each layer leaves keys and values.** Attention stores them for every prompt token. That store is the **KV cache** (§1).
3. **The answer comes one token at a time.** **Decode** runs each new token alone through all 36 layers (Table 6). It reads the cache instead of the prompt.
4. **The cache is the only hand-off.** Big deployments already run the phases on separate GPUs (§1.1). [[16,384 vs 1 | tokens per pass]]

<p class="rd-cap">Token count and the 36 layers are real (Table 6, Table 10). The answer words and box sizes are illustrative.</p>

<p class="rd-take"><b>Prefill reads all at once; decode writes one token at a time.</b> Next: why they strain different hardware.</p>

</article>

<article class="rd-page" id="primer-bound" data-part="Toolbox" data-draw="bound" data-fast markdown>

<p class="rd-crumb"><b>Toolbox 2</b> Uses the two phases from page 1.</p>

## Why is reading limited by math, but writing by memory?

1. **Take one layer.** A 4096 × 4096 weight from Qwen3-8B (Table 6). In BF16 that is 33.6 MB to load.
2. **Decode feeds it one token.** Each weight does one multiply-add, then waits for the next step. About 1 FLOP per byte loaded (§1.1).
3. **So memory is the limit.** The math units sit idle while weights arrive. Fewer weight bytes means faster decode (§1.1).
4. **Prefill feeds it 16,384 tokens.** The same bytes now serve every token. That is about 1,820 FLOPs per byte. [[≈1,820 | FLOPs per byte at 16K tokens (our arithmetic)]]
5. **Now math is the limit.** Long prefill is compute-bound, so faster arithmetic helps and smaller weights barely do (§1.1). Drag the slider from 1 to 16K.

<p class="rd-cap">Layer size is real (Table 6); the cost formula is from §1.1. Byte and FLOP counts are our arithmetic, BF16 throughout.</p>

<p class="rd-take"><b>Decode wants small weights; prefill wants fast math.</b> Next: what "small" and "fast" mean as number formats.</p>

</article>

<article class="rd-page" id="primer-formats" data-part="Toolbox" data-draw="grid" markdown>

<p class="rd-crumb"><b>Toolbox 3</b> Gives page 2's "small weights" a size.</p>

## How do you store a weight in 2 or 4 bits?

1. **Cut weights into blocks of 16.** Each block gets its own scale (App. A.3). Here are the 16 weights of one block.
2. **Scale the largest to 6.** Divide the block by its scale. Its biggest value lands on ±6 (App. A.3).
3. **Snap to NVFP4's grid.** **NVFP4** allows a sign plus 0, 0.5, 1, 1.5, 2, 3, 4 or 6. Each weight moves to its nearest point (App. A.3).
4. **LUT2 has only four points.** The paper's 2-bit **LUT2** grid is −3.6517, 0, 2.5227 and 6. Its scale takes the sign, so the biggest value is always +6 (App. A.3).
5. **Count the bits.** The scale adds 0.5 bits per weight: LUT2 2.5, LUT3 3.5, NVFP4 4.5 (App. A.3). [[2.5 | bits per LUT2 weight]]

<p class="rd-cap">Grids and bit costs are real (App. A.3). The 16 weights are illustrative; we skip the FP8 rounding of the scale.</p>

<p class="rd-take"><b>Fewer grid points: fewer bytes, more error.</b> Next: recovering from that rounding.</p>

</article>

<article class="rd-page" id="primer-qad" data-part="Toolbox" data-draw="qad" markdown>

<p class="rd-crumb"><b>Toolbox 4</b> Trains the rounded weights from page 3.</p>

## How do you train a model that has been rounded?

1. **Keep full-precision master weights.** Training updates FP32 copies. The forward pass uses their rounded version (App. A.1).
2. **Rounding has no useful gradient.** The **straight-through estimator** (STE) passes gradients back as if rounding were not there (App. A.1).
3. **Copy a frozen teacher.** The unrounded model is the **teacher**. The rounded student learns to match its next-token probabilities (§3.1).
4. **The loss is a KL divergence.** \(\mathrm{KL}(p_{\text{teacher}}\|p_{\text{student}})\) is zero only when they agree (§3.1). Move the slider to see it change.
5. **It is a gentle nudge.** A constant learning rate of 3×10⁻⁶ for about 2,450 steps (Table 3). [[100M | tokens per run (Table 3)]]

<p class="rd-cap">Training settings are real (Table 3, App. A.1). The three-word vocabulary and its probabilities are illustrative; KL is computed live.</p>

<p class="rd-take"><b>Distillation teaches a rounded model to answer like the original.</b> Next: one format's trade-off.</p>

</article>

<article class="rd-page" id="problem" data-part="The machine" data-draw="problem" data-fast markdown>

<p class="rd-crumb"><b>Machine 1</b> Uses compute vs memory (page 2) and formats (page 3).</p>

## Why does one format for both phases force a bad trade?

1. **Weight-only skips fast math.** The kernel unpacks 2-bit weights and multiplies them with BF16 activations. Prefill runs at BF16 speed: 1.00× (Table 1).
2. **Fast math needs a hardware format.** Tensor cores multiply NVFP4 by NVFP4 natively. A 2-bit LUT weight is not such a format (§1.1, §2.3).
3. **So convert on the fly.** **Autocast** re-rounds the 2-bit weight to NVFP4 and rounds activations too. Prefill gets 1.49× faster on Qwen3-8B (Table 1).
4. **Decode pays for it.** The same rounding now hits every answer token. Decode-heavy accuracy falls from 38.4 to 34.8 (Table 1). [[−3.6 | decode-heavy points for 1.49× prefill]]
5. **Neither is close to BF16.** Full precision scores 66.2 decode-heavy and 84.2 prefill-heavy (Table 1).

<p class="rd-cap">Scores are Table 1 Qwen 3 family means; speedups are measured on Qwen3-8B. The kernel boxes are our sketch.</p>

<p class="rd-take bad"><b>With one format, fast prefill costs you worse answers.</b> Next: let each phase pick its own.</p>

</article>

<article class="rd-page" id="ladder" data-part="The machine" data-draw="ladder" data-fast markdown>

<p class="rd-crumb"><b>Machine 2</b> The whole machine, four rungs. Fixes page 5's trade.</p>

## What changes when prefill and decode stop sharing a format?

1. **Rung 1: one weight, one format.** The 2-bit weight is autocast to NVFP4 in both phases. Qwen3-8B needs 4.66 GB on the GPU (Table 1).
2. **Rung 2: split the format.** Same weight, but decode uses it weight-only. This is **format disaggregation**, still 4.66 GB (§2.3).
3. **Rung 3: split the weights.** Prefill gets its own NVFP4 copy, trained alongside the decoder. This is **full disaggregation**: 8.57 GB (§2.4).
4. **Rung 4: park that copy on SSD.** **ODP** streams prefill weights in only while the prompt is read. Back to 4.66 GB (§2.5). [[4.66 GB | GPU weights with ODP, same as 2-bit alone]]
5. **Attention stays untouched.** Only linear layers split. The KV cache keeps its original shape, so decode can read it (§2.4).

<p class="rd-cap">GB are Table 1 (Qwen3-8B and Gemma3-12B, 2-bit decode). The rungs are our redraw of the idea in Fig. 2.</p>

<p class="rd-take"><b>Each rung removes one source of rounding error from one phase.</b> The next pages climb the rungs one at a time.</p>

</article>

<article class="rd-page" id="format-disagg" data-part="The machine" data-draw="route" markdown>

<p class="rd-crumb"><b>Machine 3</b> Zooms into rung 2 from page 6.</p>

## What happens inside a layer when decode skips 4-bit activations?

1. **One weight, two paths.** Every linear layer keeps a single stored weight. The token's phase picks the path (§2.3).
2. **Prompt tokens take the fast path.** Weights and activations both become NVFP4 for tensor-core math. Prefill keeps its 1.49× (Table 1).
3. **Answer tokens skip activation rounding.** Decode multiplies the stored weight by BF16 activations. Only weight bytes matter here (§2.3).
4. **Decode even gets faster.** It drops one rounding call per layer. NVFP4's decode speedup rises from 2.86× to 2.93× (Table 1, App. C.2). [[2.93× | decode speedup over BF16, Qwen3-8B]]
5. **Storage does not change.** Same weights, so NVFP4 still needs 6.40 GB on Qwen3-8B (Table 1).

<p class="rd-cap">Speedups and GB are Table 1 (Qwen3-8B). The layer sketch is ours.</p>

<p class="rd-take"><b>Format disaggregation is a free switch: same file, same prefill speed, cleaner decode.</b> Its accuracy gain is on page 13.</p>

</article>

<article class="rd-page" id="full-disagg" data-part="The machine" data-draw="double" markdown>

<p class="rd-crumb"><b>Machine 4</b> Rung 3 from page 6, with the grids from page 3.</p>

## Why give prefill its own weights?

1. **Rung 2 still rounds twice.** Prefill sees the 2-bit weight converted to NVFP4: first to LUT2, then to NVFP4 (§2.3).
2. **NVFP4 could hold more.** It has 15 values, LUT2 only 4. The 2-bit encoding throws away detail that prefill could use (§2.3).
3. **Give prefill its own copy.** A separate NVFP4 weight starts from the same unrounded model (§2.4). Toggle to compare the errors.
4. **Both copies train together.** Each decode format gets its own prefill copy, trained toward the same answers (§2.4).
5. **The price is a second file.** GPU weights grow from 4.66 to 8.57 GB on Qwen3-8B (Table 1). [[8.57 GB | both copies on the GPU, 2-bit decode]]

<p class="rd-cap">GB from Table 1; grids from App. A.3; the 15-value count is our arithmetic. The weights and errors are illustrative, computed live.</p>

<p class="rd-take"><b>Full disaggregation frees prefill from the 2-bit grid, at the cost of a second checkpoint.</b> Next: how one training run fits both.</p>

</article>

<article class="rd-page" id="qadd" data-part="The machine" data-draw="qadd" data-fast markdown>

<p class="rd-crumb"><b>Machine 5</b> Applies the distillation from page 4 to rungs 2 and 3.</p>

## How do two pathways train in one pass?

1. **Chat data already marks roles.** In fine-tuning data, prompt tokens have ignored labels. Answer tokens are scored (§2.1).
2. **Reuse that mask to route.** Prompt positions run the prefill path; answer positions run the decode path. This is **QADD** (§2.1, App. A.1).
3. **Score only the answer.** The KL loss compares the answer predictions with the teacher's (App. A.1).
4. **Gradients still reach prefill.** Every answer token attends to keys and values written by prefill weights (§2.1).
5. **One more route: the boundary.** The last prompt token runs prefill but predicts the first answer token, so it is scored too (App. A.1). [[1 | forward–backward pass trains both paths]]

<p class="rd-cap">The routing and gradient routes are App. A.1. The seven-token chat is illustrative.</p>

<p class="rd-take"><b>The answer's loss trains the prompt reader through the KV cache.</b> Next: where that second set of weights lives.</p>

</article>

<article class="rd-page" id="odp" data-part="The machine" data-draw="odp-mem" data-fast markdown>

<p class="rd-crumb"><b>Machine 6</b> Rung 4 from page 6, for our 2-bit Qwen3-8B.</p>

## Where do the prefill weights wait while you decode?

1. **Decode weights live on the GPU.** For our 2-bit Qwen3-8B, 4.66 GB (Table 1). They sit idle while the prompt is read (§2.4).
2. **Prefill weights live on SSD.** The NVFP4 copy is needed only while the prompt is processed (§2.5).
3. **Borrow two block-sized slots.** ODP carves them out of the idle decode weights. One block computes while the next loads (§2.5).
4. **Stream the blocks in turn.** Each block's weights are dropped once it has written its keys and values (§2.5).
5. **Restore, then decode.** The borrowed decode weights come back. SSD reads: 3.64 + 0.20 GB (App. C.1). [[0 GB | extra GPU weight memory]]

<p class="rd-cap">Sizes are App. C.1 and Table 1 (Qwen3-8B, 36 blocks). Box sizes are not to scale.</p>

<p class="rd-take"><b>Extra weights cost SSD reads, not GPU memory.</b> Next: when reads slow you down.</p>

</article>

<article class="rd-page" id="odp-time" data-part="The machine" data-draw="odp-time" markdown>

<p class="rd-crumb"><b>Machine 7</b> Times the streaming from page 10.</p>

## When does streaming the weights cost nothing?

1. **Loading costs the same every time.** The whole prefill copy comes off the SSD, whatever the prompt length (§2.5).
2. **Compute grows with the prompt.** Longer prompts give each block more work, and more time to hide the next load (§2.5).
3. **Short prompts stall.** The GPU waits for the SSD between blocks (§2.5). At 1K, watch the gaps open in the compute row.
4. **Around 8K, compute takes over.** On DGX Spark, compute overtakes loading near 8K for all Qwen 3 models (§2.5).
5. **At 16K, streaming is nearly free.** Qwen3-8B prefill is 1.49× faster than BF16 resident, and 1.47× streamed (Table 10). [[1.47× | streamed prefill vs BF16 at 16K]]

<p class="rd-cap">Speedups are Table 10 (Qwen3-8B, DGX Spark). The timeline is schematic, scaled so loading equals compute at 8K (§2.5).</p>

<p class="rd-take"><b>ODP is nearly free for long prompts and costly for short ones.</b> Above 16K it adds under 5% on Qwen 3 (§3.2).</p>

</article>

<article class="rd-page" id="prefiller" data-part="The machine" data-draw="prefiller" markdown>

<p class="rd-crumb"><b>Machine 8</b> Full disaggregation (page 8), with the decoder frozen. New example: a 1-bit 27B.</p>

## Can you bolt a prefiller onto someone else's frozen model?

1. **Start from a released GGUF.** Our new example: Qwen3.8-27B squeezed to the 1-bit **IQ1_S** format by Unsloth (§3.2, App. A.2).
2. **Freeze the decoder.** Its weights never change. Training needs the checkpoint, not how it was made (§2.6).
3. **Train only a prefill copy.** An NVFP4 **prefiller** learns to write the cache this particular decoder reads best (§2.6).
4. **Shared parts stay frozen.** Embeddings, the output head and the linear-attention gates are shared and untouched (App. A.2).
5. **Cost: 95M tokens.** 980 steps on reasoning traces from the full model, using 64 B300 GPUs (App. A.2, Table 4). [[980 | training steps per prefiller]]

<p class="rd-cap">Training facts are App. A.2 and Table 4. The model has 64 blocks (App. A.2); the drawing shows the idea, not the blocks.</p>

<p class="rd-take"><b>A prefiller upgrades a model you cannot retrain, without touching its file.</b> Its results are on page 15.</p>

</article>

<article class="rd-page" id="evidence" data-part="Does it work?" data-draw="fmt-res" markdown>

<p class="rd-crumb"><b>Result 1</b> Measures accuracy on two test types, against rung 1. A win: higher accuracy at equal cost.</p>

## Does format disaggregation help, and on which tasks?

1. **Two kinds of test.** **Decode-heavy**: GSM8K, MATH-500 and MMLU-Pro, with long answers. **Prefill-heavy**: RULER, with long prompts and 30–128-token answers (§3.1, App. A.5).
2. **Each phase hurts different tests.** On most models, rounding only decode costs 2–4× more decode-heavy accuracy than rounding only prefill. On prefill-heavy tasks the order flips, on 7 of 8 models (§2.2).
3. **Decode-heavy gains on every format.** Qwen 3: +1.9 for NVFP4, +4.5 for LUT3, +2.5 for LUT2 (§3.2). Table 1 rounds the LUT2 gain to 2.4. [[+4.5 | decode-heavy points, LUT3, Qwen 3]]
4. **Prefill-heavy barely moves.** Under 1.3 points either way. Prefill did not change, so this is expected (§3.2).
5. **Gemma 3 agrees.** +3.1, +3.7 and +1.8 points decode-heavy for the same three formats (§3.2).

<p class="rd-cap">Bars are Table 1 family means (Qwen 3: four sizes; Gemma 3: three). The 2–4× and 7-of-8 figures are from §2.2.</p>

<p class="rd-take"><b>Format disaggregation is a small, free win on long answers.</b> Next: what a separate prefill model adds.</p>

</article>

<article class="rd-page" id="full-results" data-part="Does it work?" data-draw="full-res" markdown>

<p class="rd-crumb"><b>Result 2</b> Same tests as page 13, now against weight-only too. A win: beat weight-only with faster prefill.</p>

## Does a separate prefill model pay off at 2 bits?

1. **Weight-only is the bar to beat.** 2-bit weight-only scores 38.4 decode-heavy on Qwen 3, but prefill runs at 1.00× (Table 1).
2. **Rungs 1 and 2 fall short.** Autocast LUT2 scores 34.8. With format disaggregation, 37.2 (Table 1).
3. **Rung 3 jumps past it.** Full disaggregation scores 45.5 decode-heavy, with 1.49× prefill (Table 1).
4. **Prefill-heavy jumps further.** 76.6 against 64.1 for weight-only (Table 1). §3.2 prints the gain over rung 1 as 5.3; Table 1 gives 15.3. [[76.6 | prefill-heavy, 2-bit, full disagg., Qwen 3]]
5. **At 3 bits it roughly ties.** 61.7 against 61.5 for weight-only, still with fast prefill (Table 1).

<p class="rd-cap">Bars are Table 1 Qwen 3 family means; speedups are Qwen3-8B. The 5.3 vs 15.3 mismatch is ours to flag.</p>

<p class="rd-take"><b>Its own prefill weights beat 2-bit weight-only on both test types.</b> Next: a model nobody retrained.</p>

</article>

<article class="rd-page" id="rescue" data-part="Does it work?" data-draw="rescue" data-fast markdown>

<p class="rd-crumb"><b>Result 3</b> The prefiller from page 12. Measures one full benchmark run, against the GGUF alone.</p>

## How much can a prefiller rescue a 1-bit model?

1. **The 1-bit model is badly broken.** IQ1_S scores 29.04 on MMLU-Pro. Full precision scores 84.62 (Table 5).
2. **Add the trained prefiller.** Same decoder file, now 61.54. That is more than double (Table 5). [[+32.50 | MMLU-Pro points at IQ1_S]]
3. **Images too, without image training.** MMMU-Pro rises from 24.39 to 59.65, though training was text only (Table 5, §3.2).
4. **The gain shrinks as decoders improve.** +19.71 at IQ1_M, +7.42 at IQ2_XXS, under 3 points from IQ2_S up (Table 5).
5. **At 3 bits it hurts a little.** Q3_K_XL loses 0.62 on MMLU-Pro and 1.97 on MMMU-Pro (Table 5).

<p class="rd-cap">All scores are Table 5: one evaluation per format, prefiller at step 980. Formats run from about 1 to 3 bits.</p>

<p class="rd-take"><b>A prefiller rescues broken decoders and slightly hurts good ones.</b> Next: is that the training, or just 4-bit precision?</p>

</article>

<article class="rd-page" id="rtn-vs-trained" data-part="Does it work?" data-draw="rtn" markdown>

<p class="rd-crumb"><b>Result 4</b> Splits page 15's gain in two. Same decoders, against an untrained 4-bit prefill copy.</p>

## Is it the training, or just the 4-bit precision?

1. **Make an untrained prefill copy.** Round the full model straight to NVFP4: **round-to-nearest** (RTN), with no QADD (App. B.4).
2. **Precision alone helps a lot.** IQ1_S rises from 29.04 to 48.39 on MMLU-Pro (Tables 5, 7).
3. **Training adds 13 more.** The QADD prefiller reaches 61.54, which is 13.15 above RTN (Table 7). App. B.4 rounds it to 13.1. [[+13.15 | MMLU-Pro points from training, IQ1_S]]
4. **On images, training is most of it.** MMMU-Pro goes 24.39 → 30.29 with RTN, and 59.65 trained (Tables 5, 7).
5. **Prefillers partly transfer.** The IQ1_M prefiller gives the IQ1_S decoder 65.02 on MMLU-Pro, beating its own 61.54 (Table 7).

<p class="rd-cap">Weight-only bars are Table 5; RTN, trained and swapped prefillers are Table 7. One run each.</p>

<p class="rd-take"><b>Precision and training both matter; training matters most at the lowest bits.</b> Next: is the first token actually faster?</p>

</article>

<article class="rd-page" id="speed" data-part="Does it work?" data-draw="speed" markdown>

<p class="rd-crumb"><b>Result 5</b> Measures time, not accuracy, against weight-only or BF16. Uses ODP from page 11.</p>

## How much sooner does the first token arrive?

1. **Time to first token at 8K.** IQ1_S alone in llama.cpp takes 12.27 s. With the streamed NVFP4 prefiller, 6.90 s (§3.2). [[1.78× | faster first token at 8K, Qwen3.8-27B]]
2. **From 4K to 32K: 1.38× to 1.78×.** The speedup holds across the measured prompt lengths (§3.2, Fig. 1).
3. **Shorter prompts get slower.** Below 4K, SSD loading makes ODP lose to weight-only (§3.2, Fig. 1).
4. **The 8B stack agrees.** Qwen3-8B prefill at 16K takes 3,801 ms in BF16. NVFP4 is 1.49× faster, streamed 1.47× (Table 10).
5. **Bigger models gain more.** At 16K the streamed speedup rises from 1.12× at Qwen3-0.6B to 1.47× at 8B (Table 10).

<p class="rd-cap">Times are §3.2 and Table 10. The 27B run is llama.cpp; the 8B stack uses vLLM kernels on DGX Spark (App. C.1).</p>

<p class="rd-take"><b>Long prompts get a real speedup; short chats do not.</b> Next: does the free rung scale to huge models?</p>

</article>

<article class="rd-page" id="ptq-scale" data-part="Does it work?" data-draw="ptq" markdown>

<p class="rd-crumb"><b>Result 6</b> Rung 2 with no training. Paired tests, four repeats, against uniform 4-bit rounding.</p>

## Does the free version hold up at 2.8T parameters?

1. **No training at all.** Round eight large models to 4 bits, then switch off activation rounding at decode only (§3.3).
2. **11 of 13 go up.** Across MMLU-Pro and MMMU-Pro, point estimates improve in 11 of 13 pairs (§3.3, Table 2). [[11 / 13 | model–benchmark pairs improved]]
3. **Six are significant.** Paired per-item tests at p < 0.05; none is significantly worse (§3.3, App. A.5).
4. **The gains are small.** From −0.21 to +1.13 points. The largest is Gemma-4-31B on MMMU-Pro (Table 2).
5. 🧠 **No correction for many tests.** The paper says so (App. A.5). Thirteen tests at 0.05 expect 0.65 false hits; six is well above that.

<p class="rd-cap">Δ values and significance are Table 2. Kimi-K3 uses MXFP4; Qwen3.8-2.4T's reference is FP8 (Table 2). 0.65 is our arithmetic.</p>

<p class="rd-take"><b>The free rung-2 switch helps a little, even at trillion scale.</b> Next: what a careful reviewer would still ask.</p>

</article>

<article class="rd-page" id="reviewer" data-part="Your move" data-draw="reviewer" markdown>

<p class="rd-crumb"><b>Your move 1</b> Our critique of pages 13–18.</p>

## What would a careful reviewer question?

1. 🧠 **Multi-turn is untested.** Earlier answers were cached by decode weights. Rebuilt later through prefill, they could look different (§5).
2. 🧠 **Error bars are not seeds.** They span five late checkpoints of one run (§3.1, App. A.5). Several gains are under 2 points.
3. 🧠 **Batch size one only.** Decode is memory-bound at batch one (§1.1). Batched serving is not evaluated (§5).
4. 🧠 **The headline bundles two effects.** Of the +32.50, untrained precision gives 19.35 and training 13.15 (Tables 5, 7).
5. 🧠 **Answers get longer.** With a prefiller, IQ2_XXS truncation on MMLU-Pro rises from 1.25% to 3.39% (Table 8).
6. 🧠 **Steelman: the big gains are big.** +10.7 and +32.5 points dwarf checkpoint wobble. The paper flags most limits itself (§5, App. B.5).

<p class="rd-cap">Pointers mark the evidence behind each concern. The pills are our judgment; 19.35 and 13.15 are our arithmetic.</p>

<p class="rd-take"><b>Trust the big low-bit gains; treat 1–2-point gains as suggestive.</b> Next: what this means for your own GPU.</p>

</article>

<article class="rd-page" id="verdict" data-part="Your move" data-draw="verdict" data-fast markdown>

<p class="rd-crumb"><b>Verdict</b> For the goal on the cover: long prompts on one local GPU. Uses pages 15 and 17.</p>

## Should you run a 1-bit 27B with a prefiller on your own GPU?

1. **The rescue is real.** IQ1_S with its prefiller scores 61.54 on MMLU-Pro, up from 29.04 (Table 5).
2. **But a 2-bit file alone beats it.** IQ2_XXS weight-only scores 70.50 with no prefiller. With one, 77.93 (Table 5). [[70.50 > 61.54 | 2-bit alone vs 1-bit + prefiller]]
3. **Long prompts are the sweet spot.** The first token is 1.78× faster at 8K, but slower below 4K (§3.2, Fig. 1). Set the slider to your prompts.
4. **It needs fast FP4 hardware.** Prefill speed comes from native NVFP4 math. Speed was measured on DGX Spark (§1.1, App. C).
5. 🧠 **Our verdict: start at 2 bits.** Take the smallest decoder that fits, and add its prefiller for long prompts. Drop to 1 bit only if 2 won't fit.

<p class="rd-cap">Scores are Table 5; speed is §3.2. File sizes are not given in the text, so "fits" is your check. The verdict is ours.</p>

<p class="rd-take"><b>A prefiller is a strong add-on for long prompts, not a reason to drop to 1 bit.</b> Multi-turn chat remains untested (§5).</p>

</article>

<article class="rd-page" id="code-map" data-part="Your move" data-draw="release" markdown>

<p class="rd-crumb"><b>Your move 2</b> What you can reuse from pages 9–12.</p>

## What did the authors release, and what would rebuilding cost?

1. **Code and a llama.cpp fork.** The authors release code for the main results and a llama.cpp fork with ODP (§5).
2. **Trained 27B prefillers.** They are on the Hugging Face Hub (§5). Each was trained for one specific decoder (§2.6, App. B.4).
3. **Core runs need 8–32 GPUs.** B300s; full disaggregation doubles the count for the 8B and 12B models (Table 4).
4. **A 27B prefiller needs 64.** The decoder stays in memory as BF16 while only the prefill copy trains (App. A.2, Table 4). [[64 | B300 GPUs to train one 27B prefiller]]
5. **Some speedups are proxies.** LUT prefill reuses NVFP4 timings and leaves out the weight-conversion cost (App. B.3).

<p class="rd-cap">Everything here is from §5, Table 4 and Apps. A.2 and B.3. We did not run the code.</p>

<p class="rd-take"><b>You can reuse the released prefillers; training your own takes a GPU cluster.</b> Next: experiments worth trying.</p>

</article>

<article class="rd-page" id="whats-next" data-part="Your move" data-draw="ideas" markdown>

<p class="rd-crumb"><b>Your move 3</b> Open problems from §5 and §2.5, plus our ideas.</p>

## What could you try next?

1. **Paper's open problem: multi-turn.** Test whether decode copes with answer caches rebuilt by prefill (§5).
2. **Paper's open problem: batching.** Measure decode at larger batches, where weight loading is no longer the only cost (§5).
3. **Paper's idea: streamed encoders.** ODP should also apply to separate input networks, such as encoders (§2.5). It is untested.
4. 🧠 **For speech: split Whisper.** Its encoder reads 30 s at once; its decoder writes text. Try a W4A4 encoder and a 2-bit decoder, distilled jointly.
5. 🧠 **Cheapest first: an RTN prefiller.** With no training, it lifted IQ1_S by 19.35 points (Tables 5, 7). Try one on your own low-bit model.

<p class="rd-cap">Steps 1–3 are directions the paper names; 4–5 and every position on the map are our guesses.</p>

<p class="rd-take"><b>The cheapest experiment is an untrained 4-bit prefill copy; the most useful is multi-turn.</b> Then check yourself on the next three pages.</p>

</article>

<article class="rd-page" id="quiz" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 1</b> From page 9.</p>

## In QADD, what decides which path a token takes?

- [ ] Its position: the first tokens of each sequence use prefill
- [x] The fine-tuning label mask: positions with ignored labels use prefill
- [ ] Whether more than one token is processed at once
- [ ] A learned router trained by the KL loss

<p class="rd-take"><b>The label mask.</b> Prompt positions, whose labels are ignored, take prefill; answer positions take decode (§2.1, App. A.1).</p>

</article>

<article class="rd-page" id="check-format" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 2</b> From pages 7 and 13.</p>

## Why does format disaggregation barely move RULER scores?

- [ ] RULER prompts are too long to fit in NVFP4
- [x] It only changes the decode path, and RULER answers are 30–128 tokens
- [ ] RULER is scored without a KV cache
- [ ] Prefill-heavy scores are already at full-precision level

<p class="rd-take"><b>It only touches decode.</b> RULER's work is in the prompt, which still runs the same NVFP4 prefill (§3.2, App. A.5). NVFP4 scores 79.8 there against 84.2 for BF16 (Table 1).</p>

</article>

<article class="rd-page" id="check-flaw" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 3</b> Spot the flaw. From pages 15 and 16.</p>

## Where does IQ1_S's +32.5 MMLU-Pro gain come from?

- [ ] All of it comes from QADD training
- [x] 19.35 points from 4-bit precision alone, 13.15 from training
- [ ] Training adds nothing beyond an untrained 4-bit copy
- [ ] Only the prefiller trained with IQ1_S can produce it

<p class="rd-take"><b>Precision 19.35, training 13.15 (our arithmetic).</b> RTN reaches 48.39 and the trained prefiller 61.54, from 29.04 (Tables 5, 7). The IQ1_M prefiller even scores 65.02.</p>

</article>
