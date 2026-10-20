---
title: "DeepInfer"
paper_title: "DeepInfer: High-performance, large-scale inference framework for DeepSeek models (open-source release, no paper)"
authors: ["DeepSeek-AI"]
year: 2026
venue: "Software release: code, README and deployment Q&A"
source: model-release
source_id: "deepinfer"
sources:
  - {label: "Deployment Q&A", url: "https://github.com/deepseek-ai/DeepInfer/blob/774ce244b87cc0eb8d4b94ab9f5de2ab22049f01/doc/inference_deployment_qa.md", note: "DeepSeek's write-up of the V4.1 Flash serving system: parallelism, load balancing, KV storage, DSpark numbers"}
  - {label: "Model config", url: "https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash-1017", note: "config.json of the model DeepInfer serves, read at revision 1bae0e1; weights not downloaded"}
code: {url: "https://github.com/deepseek-ai/DeepInfer", license: "Apache-2.0", note: "inference engine only, read at commit 774ce24; KV cache system and load balancers not included; not built or run"}
paper_type: system
hook: "DeepSeek open-sourced the engine that serves 155 trillion tokens a day. Here is how one request travels through it, and which tricks you could borrow."
big_idea: "DeepInfer serves a 763B mixture-of-experts model by splitting prefill and decode onto different GPU pools, spreading experts across 64 or more decode GPUs with load-balanced replicas, verifying only the draft tokens most likely to be accepted, and rebuilding sliding-window caches from a bounded replay instead of the whole prompt."
goal: "Decide whether your team can serve DeepSeek-V4.1-Flash with DeepInfer, and which ideas to borrow for serving your own speech LLM."
difficulty: 3
difficulty_note: "New subfield for a speech engineer: LLM serving. Prefill and decode, KV caches, expert parallelism, speculative decoding and sliding windows each get a toolbox page. No paper, so every claim points to the README, the deployment Q&A doc, the config or the code."
date_added: 2026-10-20
tags: [LLMs, Systems, Efficiency]
description: "DeepSeek open-sourced the engine that serves 155 trillion tokens a day. Here is how one request travels through it, and which tricks you could borrow."
---

<article class="rd-page" id="phases" data-part="Toolbox" data-draw="phases" data-fast markdown>

<p class="rd-crumb"><b>Toolbox 1</b> Start here. No paper exists: pointers name the source, (§README), (§doc), (§config), (§code), (§eval).</p>

## Why is answering one request two different jobs?

1. **Our running example.** An agent sends a 50,000-token prompt and gets 2,000 tokens back.
2. **Prefill reads the prompt at once.** All new prompt tokens run through the model in parallel: many tokens, heavy matrix math.
3. **Decode writes one step at a time.** Each step adds a few tokens and must reread everything stored so far.
4. **So they want different hardware setups.** DeepSeek runs prefill on 8-GPU machines and decode on 64–128-GPU supernodes (§doc).

<p class="rd-cap">Deployment sizes from the deployment Q&A. The request is our example; bar lengths are schematic.</p>

<p class="rd-take"><b>Prefill is a big batch of reading; decode is a long walk of small steps.</b></p>

</article>

<article class="rd-page" id="kvcache" data-part="Toolbox" data-draw="kvcache" markdown>

<p class="rd-crumb"><b>Toolbox 2</b> What decode rereads on page 1.</p>

## What is the KV cache, and why keep it for days?

1. **Attention needs every earlier key and value.** Storing them, the **KV cache**, avoids recomputing the prompt each step.
2. **Agents resend almost the same prompt.** Our turn repeats the previous 49,000 tokens and adds 1,000 new ones.
3. **A cache hit skips that prefill.** Only the non-cached suffix has to be computed (§doc).
4. **DeepSeek keeps caches for days.** TTL is 3 days for agent traffic and 7 for chatbots, on about 100 PiB of SSD (§doc).

<p class="rd-cap">TTLs and capacity from the deployment Q&A. The cached share is our example.</p>

<p class="rd-take"><b>A cache hit turns 50,000 tokens of work into about 1,000.</b></p>

</article>

<article class="rd-page" id="ep" data-part="Toolbox" data-draw="ep" data-fast markdown>

<p class="rd-crumb"><b>Toolbox 3</b> The model has 384 experts; where do they live?</p>

## How do you spread 384 experts over 64 GPUs?

1. **Each token uses 6 of 384 experts.** Plus one shared expert, in each MoE layer (§config).
2. **Expert parallelism puts different experts on different GPUs.** Tokens travel to whichever GPUs hold their experts, then come back.
3. **Decode spreads them wide.** At EP64, 384 experts plus 64 replicas give 7 per GPU (§doc). Move the slider.
4. **Attention is copied, not split.** Each GPU runs attention for its own requests: data parallelism, DP = EP (§doc).

<p class="rd-cap">Expert counts from config.json and the Q&A. Which experts a token picks is made up.</p>

<p class="rd-take"><b>Fewer experts per GPU means less weight to read every step.</b></p>

</article>

<article class="rd-page" id="spec" data-part="Toolbox" data-draw="spec" data-fast markdown>

<p class="rd-crumb"><b>Toolbox 4</b> Speeds up page 1's decode walk.</p>

## How can one decode step produce several tokens?

1. **A cheap drafter guesses ahead.** DeepSeek-V4.1-Flash drafts 5 tokens per step by default (§README, §config).
2. **The big model checks all at once.** One forward pass scores the drafts in parallel: **verification**.
3. **Keep the agreeing prefix.** Accepted drafts plus one corrected token come out; the rest are thrown away.
4. **About 3.3 tokens per step.** Fixed 5-token drafts average 3.29 accepted tokens (§doc). Our 2,000 tokens need about 610 steps.

<p class="rd-cap">Draft length and accepted length from the README and Q&A; step count is our arithmetic.</p>

<p class="rd-take"><b>Speculative decoding trades extra verification for fewer steps.</b></p>

</article>

<article class="rd-page" id="swa" data-part="Toolbox" data-draw="swa" markdown>

<p class="rd-crumb"><b>Toolbox 5</b> A cache detail that matters on page 11.</p>

## What is a sliding window, and why is it a caching headache?

1. **Some layers look back only 128 tokens.** Sliding-window attention (SWA) keeps a short window per layer (§config).
2. **That window is state, not history.** It must match the exact end of the prompt, not a cached block.
3. **Block caches line up on 128s.** The long-range KV cache is stored in 128-token blocks (§doc).
4. **A hit can find blocks but no window.** Then the window must be rebuilt before decode can start (§doc).

<p class="rd-cap">Window and block sizes from config.json and the Q&A. Token positions are illustrative.</p>

<p class="rd-take"><b>Long-range caches are easy to reuse; sliding windows are not.</b></p>

</article>

<article class="rd-page" id="system" data-part="The system" data-draw="system" data-fast markdown>

<p class="rd-crumb"><b>System 1</b> Our 50,000-token request enters here.</p>

## What happens to one request, end to end?

1. **Recipe turns JSON into tokens.** DeepSeek Recipe encodes the API request (§doc).
2. **An entrypoint checks the cache.** It finds our 49,000-token prefix hit before routing (§doc).
3. **Prefill computes the rest.** A prefill machine loads the hit and computes the new suffix (§doc).
4. **The KV cache moves to decode.** A decode supernode writes the 2,000 answer tokens (§doc).
5. **This repo is only the engine.** The KV cache system and load balancers are not included (§README).

<p class="rd-cap">Our drawing of the Q&A's architecture figure. Green boxes are in this repo; grey ones are described only.</p>

<p class="rd-take"><b>DeepInfer is the engine inside each prefill and decode box.</b></p>

</article>

<article class="rd-page" id="eplb" data-part="The system" data-draw="eplb" markdown>

<p class="rd-crumb"><b>System 2</b> Fixes a weakness of page 3.</p>

## What if every token wants the same expert?

1. **Hot experts make slow GPUs.** A step waits for the busiest GPU, so one popular expert slows all 64.
2. **Copy the hot experts.** Each GPU holds spare slots for replicas of busy experts (§doc).
3. 💻 **Count, then repack.** Expert loads are counted over a window; replicas are placed greedily on the least-loaded GPU.
4. **Measured imbalance is small.** Slowest GPU over mean: 1.090 for decode, 1.045–1.074 for prefill (§doc). Toggle EPLB.

<p class="rd-cap">moe_lb values and settings from the Q&A; greedy packing from `eplb/policy.py`. Loads in the drawing are made up.</p>

<p class="rd-take"><b>Replicating hot experts keeps the slowest GPU within 9% of average.</b></p>

</article>

<article class="rd-page" id="balance" data-part="The system" data-draw="balance" markdown>

<p class="rd-crumb"><b>System 3</b> Routes page 6's request. Described in the Q&A; not in this repo.</p>

## Which machine gets our request?

1. **Prefill sorts by length.** Four tiers: under 16K, 16–64K, 64–256K, and longer. Ours is 16–64K (§doc).
2. **Chunks are sized by time.** A fitted cost model picks the largest chunk that fits a time budget, at most 32,768 tokens (§doc).
3. **Decode balances two things.** Request count sets batch size; total KV length sets attention cost (§doc).
4. **Short and long requests are paired.** Short ones go to GPUs with few but long sequences (§doc).
5. **About 80% of ideal.** Real balancing reaches about 80% of a perfectly balanced benchmark (§doc).

<p class="rd-cap">From the Q&A. The cost model itself is not in the repo; the engine's chunks use a token budget (§code scheduler.hpp).</p>

<p class="rd-take"><b>Balancing loses about a fifth of ideal throughput.</b></p>

</article>

<article class="rd-page" id="dspark" data-part="The system" data-draw="dspark" data-fast markdown>

<p class="rd-crumb"><b>System 4</b> Improves page 4's verification.</p>

## Which draft tokens are worth checking?

1. **Late drafts rarely survive.** Draft 5 is accepted only if drafts 1–4 were too.
2. **A confidence head scores each draft.** Multiplying scores gives each draft's chance of acceptance (§doc, §code dflash.py).
3. **Rank all drafts in the batch.** The scheduler adds the most likely drafts first, across every request (§code mtp_varlen.hpp).
4. **Stop where throughput peaks.** A profiled step-time table says when one more token costs more than it earns. Move the slider.
5. **Verified drafts fall from 5 to about 3.6.** Accepted length barely moves: 3.30 to 3.21, at 60 requests per GPU (§doc).

<p class="rd-cap">Algorithm from the code; numbers from the Q&A table. Confidences and the step-time curve in the drawing are made up.</p>

<p class="rd-take"><b>Spend verification on drafts that will probably survive.</b></p>

</article>

<article class="rd-page" id="replay" data-part="The system" data-draw="replay" data-fast markdown>

<p class="rd-crumb"><b>System 5</b> Solves page 5's window problem for our request.</p>

## How do you rebuild a sliding window without rereading the prompt?

1. **Cap the hit.** For a 50,000-token prompt, at most 49,866 tokens may hit: 128 window plus 6 for drafts (§doc).
2. **Round to blocks.** Our 49,000-token prefix gives a block hit of 48,896 tokens, a multiple of 128 (our arithmetic).
3. **No saved window? Back off one block.** Recompute 128 more tokens instead (§doc). Toggle the window cache.
4. **Replay only 128 tokens.** Each replayed query sees keys back to the replay start only: an approximate window (§doc).
5. **Decoder layers replay too.** Recomputing 128 tokens there instead of 2,560 nearly halves prefill compute (§doc).

<p class="rd-cap">Rules from the Q&A; hit lengths are our arithmetic for the example. Off by default in the code.</p>

<p class="rd-take"><b>Bounded replay makes cache recovery cost constant, not proportional to length.</b></p>

</article>

<article class="rd-page" id="storage" data-part="The system" data-draw="storage" markdown>

<p class="rd-crumb"><b>System 6</b> Where page 2's cache sits. Described in the Q&A; not in this repo.</p>

## Where do 100 PiB of KV cache live?

1. **Active cache sits in GPU memory.** The running requests' blocks and window state (§doc).
2. **Window state stays on the host.** One copy in local memory: 20 layers × 134 tokens × 528 B (§doc).
3. **Block cache goes to a storage cluster.** 3FS on SSDs, 10+2 erasure coding, about 14.4 TB per GPU (§doc).
4. **Any prefill machine can hit any prefix.** No machine affinity needed, so routing stays free (§doc). [[1.35 MiB | window state per request (§doc)]]

<p class="rd-cap">Sizes and layout from the Q&A table; MiB conversion is our arithmetic.</p>

<p class="rd-take"><b>Three tiers: GPU for now, host for windows, SSD cluster for history.</b></p>

</article>

<article class="rd-page" id="async" data-part="The system" data-draw="async" markdown>

<p class="rd-crumb"><b>System 7</b> Inside each of page 4's decode steps.</p>

## Why would a GPU sit idle between decode steps?

1. **Each step has CPU parts.** Schedule, then forward and sample on the GPU, then post-process on the CPU (§doc).
2. **The GPU waits for the CPU.** Post-processing step N and scheduling N+1 leave it idle (§doc).
3. **Overlap them.** The CPU schedules N+1 while the GPU still runs N (§doc, §code llm_engine.py).
4. **Fix stale numbers on the GPU.** The CPU lags a step, so a kernel corrects lengths before running (§code worker.py). Toggle overlap.

<p class="rd-cap">Pipeline from the Q&A; correction from the code. Bar lengths are illustrative.</p>

<p class="rd-take"><b>Hide CPU bookkeeping under GPU work.</b></p>

</article>

<article class="rd-page" id="invariance" data-part="The system" data-draw="invariance" markdown>

<p class="rd-crumb"><b>System 8</b> A correctness feature, not a speed one.</p>

## Why would the same prompt give different answers in different batches?

1. **Float addition is not associative.** Summing in a different order changes the last bits.
2. **Batch size changes the order.** Kernels split work differently for 8 requests than for 64.
3. 💻 **Batch-invariant mode fixes it.** Deterministic kernel modes and a fixed reduction path, NVIDIA only (§README).
4. 💻 **Sampling uses a per-request seed.** Randomness comes from (seed, position), so batch order cannot change it.

<p class="rd-cap">Mechanism from `runtime_config.py` and `random_sampling.py`. The float example is computed live.</p>

<p class="rd-take"><b>Same tokens in, same tokens out, whatever else is in the batch.</b></p>

</article>

<article class="rd-page" id="wide-ep" data-part="Does it work?" data-draw="wide-ep" data-fast markdown>

<p class="rd-crumb"><b>Results 1</b> Tests page 3's claim.</p>

## Does spreading experts over 64 GPUs pay off?

1. **Each point is a batch size.** Requests per GPU from 8 to 256; context 131,072 tokens (§README plot).
2. **More requests, more throughput.** EP64 goes from about 2,600 to 26,300 tokens/s per GPU (§doc plot).
3. **But each user slows down.** Per-user speed drops from about 325 to 103 tokens/s.
4. **EP64 beats EP8 everywhere.** At 64 requests: about 15,700 vs 12,700 tokens/s per GPU, and faster per user (§doc plot).

<p class="rd-cap">Values read off the Q&A plot, so approximate. Throughput assumes 75% draft acceptance.</p>

<p class="rd-take"><b>Wide expert parallelism moves the whole curve up and right.</b></p>

</article>

<article class="rd-page" id="prefill-curve" data-part="Does it work?" data-draw="prefill-curve" markdown>

<p class="rd-crumb"><b>Results 2</b> Prefill on 4 GPUs.</p>

## How fast does prefill read a prompt?

1. **Bigger chunks, more throughput.** From about 60,000 to 89,500 tokens/s per GPU (§README plot).
2. **Gains flatten past 16K.** Doubling 32,768 to 65,536 adds only about 3% (§README plot).
3. **Latency keeps growing.** A 65,536-token chunk takes about 730 ms per step.
4. **Our 1,104 new tokens are tiny.** At about 80,000 tokens/s per GPU, that is roughly 14 GPU-milliseconds (our arithmetic).

<p class="rd-cap">Values read off the README plot (EP4DP4, bounded replay on), so approximate.</p>

<p class="rd-take"><b>Prefill saturates near 16K-token chunks; caching matters more than chunk size.</b></p>

</article>

<article class="rd-page" id="dspark-result" data-part="Does it work?" data-draw="dspark-result" markdown>

<p class="rd-crumb"><b>Results 3</b> Measures page 9's idea.</p>

## How much does choosing drafts buy?

1. **Little at low load.** At 16 requests per GPU, throughput falls 1.5% (§doc).
2. **More as load rises.** +5.4% at 60, +6.7% at 72 (§doc).
3. **Most at the top.** +11.0% at 96 requests per GPU (§doc). Move the slider.
4. **Why it grows.** Busy GPUs pay more per verified token, so skipping weak drafts saves more.

<p class="rd-cap">All values from the Q&A's DSpark table (EP64/DP64, estimated throughput). Step 4 is the Q&A's reasoning, paraphrased.</p>

<p class="rd-take"><b>+4–7% at the production operating point, for free.</b></p>

</article>

<article class="rd-page" id="production" data-part="Does it work?" data-draw="production" markdown>

<p class="rd-crumb"><b>Results 4</b> The numbers DeepSeek reports from production.</p>

## What does it achieve in production?

1. **155 trillion tokens a day.** From a single cluster (§doc).
2. **US$38 per GPU-hour.** Overall revenue, at off-peak pricing (§doc).
3. **Accuracy survives the tricks.** AIME 2026 99.9%, GPQA Diamond 93.4%, HLE 42.6% through DeepInfer (§eval).
4. **Not independently checked.** All figures are DeepSeek's own.

<p class="rd-cap">Throughput and revenue from the Q&A; Pass@1 from eval/README.md.</p>

<p class="rd-take"><b>Big claims, all self-reported.</b></p>

</article>

<article class="rd-page" id="code" data-part="Your move" data-draw="code" markdown>

<p class="rd-crumb"><b>Your move 1</b> Maps the system pages to the code at commit 774ce24.</p>

## Where is each part in the code?

1. 💻 **The scheduler is C++.** `csrc/engine/scheduler.hpp` and `mtp_varlen.hpp` pick batches and drafts.
2. 💻 **Expert balancing is Python.** `model_executor/eplb/policy.py` repacks replicas greedily.
3. 💻 **Kernels come from outside.** FlashMLA, DeepGEMM, DeepEP and about 100 TileLang kernels (§README).
4. 💻 **Structured output uses xgrammar.** A token mask is applied before sampling and draft checks.
5. 💻 **No training code.** It is an inference engine only, built originally on vLLM (§README).

<p class="rd-cap">We read the code; we did not build or run it.</p>

<p class="rd-take"><b>The engine is open; the cluster around it is not.</b></p>

</article>

<article class="rd-page" id="reviewer" data-part="Your move" data-draw="reviewer" markdown>

<p class="rd-crumb"><b>Your move 2</b> Specific to this release.</p>

## What would a careful reviewer question?

1. **Defaults differ from the README.** It says async scheduling is on by default; `environ.py` defaults it off, like varlen drafts and replay (§code).
2. **Doc and code differ.** The Q&A's quadratic chunk-cost model is not in the repo (§doc, §code).
3. **Plots, not tables.** Throughput curves ship as images; the drawn values here are approximate (§README).
4. **Half the system is missing.** No KV cache system, P/D glue or load balancers (§README).
5. 🧠 **Steelman: rare openness.** Real production numbers, settings and failure stories rarely get published.

<p class="rd-cap">Each row points to the README, Q&A or code. Row 5 is our judgement.</p>

<p class="rd-take"><b>Read the defaults before trusting the README's feature list.</b></p>

</article>

<article class="rd-page" id="verdict" data-part="Your move" data-draw="verdict" data-fast markdown>

<p class="rd-crumb"><b>Your move 3</b> Our pick: a team that serves its own speech LLM.</p>

## Should your team use DeepInfer?

1. **Do you have the hardware?** NVIDIA SM100 or Huawei Ascend 950 only (§README).
2. **Enough GPUs?** The efficient unit is 64 prefill plus 64 decode GPUs (§doc).
3. **Only DeepSeek-V4.1-Flash runs.** A 763B-parameter model; your speech model is not supported (§README, §config).
4. **Borrow the ideas.** Async scheduling, confidence-chosen drafts and batch invariance carry over to any decoder.
5. 🧠 **Verdict: read it, don't deploy it.** Unless you serve V4.1 Flash at cluster scale.

<p class="rd-cap">Requirements from the README and Q&A; parameter count from the Hugging Face model metadata.</p>

<p class="rd-take"><b>A textbook for large-scale serving, not a drop-in server.</b></p>

</article>

<article class="rd-page" id="q-cache" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 1</b> From page 10.</p>

## Our 50,000-token prompt shares 49,000 tokens with a cached turn, but no window cache exists. How many tokens count as hit?

- [ ] 49,000, the shared prefix
- [ ] 48,896, the block-aligned prefix
- [x] 48,768, one block less
- [ ] 49,866, the cap

<p class="rd-take"><b>48,768.</b> The block hit is 48,896; with no saved window, the system backs off one 128-token block and recomputes it (§doc).</p>

</article>

<article class="rd-page" id="q-ep" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 2</b> From pages 3 and 7.</p>

## Why add replica experts instead of just more GPUs?

- [ ] Replicas let each token use more experts
- [x] A step waits for the busiest GPU, and replicas split hot experts' load
- [ ] Replicas reduce the model's parameter count
- [ ] More GPUs cannot run expert parallelism

<p class="rd-take"><b>The slowest GPU sets the pace.</b> Replicating hot experts brought moe_lb to 1.090 in decode (§doc).</p>

</article>

<article class="rd-page" id="q-dspark" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 3</b> From pages 9 and 16. Spot the flaw.</p>

## "Verifying fewer drafts must lower the accepted length a lot." What's wrong?

- [ ] Accepted length is fixed at 5
- [x] The skipped drafts were unlikely to be accepted anyway
- [ ] Verification happens on the CPU
- [ ] DSpark verifies more drafts, not fewer

<p class="rd-take"><b>Skipped drafts were long shots.</b> Verified length fell from 5 to 3.58, while accepted length only went from 3.30 to 3.21 (§doc).</p>

</article>
