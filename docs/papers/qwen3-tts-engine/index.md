---
title: "Qwen3-TTS Engine"
paper_title: "Qwen3-TTS-Engine: a high-concurrency streaming serving engine for Qwen3-TTS (open-source repo, no paper)"
authors: ["Sai Charan Reddy (GitHub: saichranreddy)"]
year: 2026
venue: "Software release: code and README; model from arXiv:2601.15621 (Qwen3-TTS)"
source: model-release
source_id: "qwen3-tts-engine"
sources:
  - {label: "README", url: "https://github.com/saichranreddy/Qwen3-TTS-Engine/blob/ebbbd0031f3bfe67bc3e031f3b0e74c7b9109542/README.md", note: "design, benchmarks, pitfalls; pointers (§README …)"}
  - {label: "Qwen3-TTS report", url: "https://arxiv.org/abs/2601.15621v1", note: "the model served; pointers (§3.4 Q3), (Table 2 Q3)"}
  - {label: "Serving context", url: "https://docs.vllm.ai/projects/vllm-omni/en/latest/serving/speech_api/", note: "vLLM-Omni, OpenAI, NVIDIA and PyTorch docs, found by us, cited on the pages that use them"}
code: {url: "https://github.com/saichranreddy/Qwen3-TTS-Engine", license: "none stated", note: "read in full at commit ebbbd00 (2026-10-29); no LICENSE file; results files and tests named in the README are not in the repo; not built or run"}
model: {url: "https://huggingface.co/Qwen/Qwen3-TTS-12Hz-0.6B-Base", license: "Apache-2.0", note: "Qwen3-TTS 12Hz 0.6B and 1.7B Base, loaded unchanged by the engine; not downloaded or run by us"}
paper_type: system
hook: "The stock Qwen3-TTS code needs 181 ms to make 80 ms of audio. A 2,700-line engine serves 576 voices at once on one A100, first sound under 100 ms. Here is every trick, measured."
big_idea: "The engine makes one CUDA graph of a whole TTS frame for every live stream (talker, 15-step code predictor and sampling), keeps each stream in a fixed seat with a paged cache, streams the codec exactly by carrying every layer's state on a side stream, and admits arrivals through a cached voice prefix, turning a launch-bound model into one limited by memory bandwidth and first-audio latency."
goal: "Learn how a streaming TTS is deployed at scale, and decide what to borrow for serving your Indic dubbing TTS."
difficulty: 3
difficulty_note: "Home turf: TTS, codecs, autoregressive decoding. New: serving metrics, open-loop load tests, CUDA graphs, torch.compile, paged caches, CUDA streams; twelve toolbox pages before the engine. No paper for the engine: pointers name the README, the code line, or the Qwen3-TTS report."
date_added: 2026-10-31
tags: [Speech, TTS, Systems, Efficiency]
description: "The stock Qwen3-TTS code needs 181 ms to make 80 ms of audio. A 2,700-line engine serves 576 voices at once on one A100, first sound under 100 ms. Here is every trick, measured."
---

<article class="rd-page" id="ttfa-rtf" data-part="Serving toolbox" data-draw="ttfa-rtf" data-fast markdown>

<p class="rd-crumb"><b>Toolbox 1</b> Start here. No paper: pointers name the source, (§README …), (§code file:line), (Table 2 Q3) = the Qwen3-TTS report.</p>

## What do TTFA and RTF actually measure?

1. **Our running example.** "Your order will be delivered by tomorrow evening." The engine turned it into 4.40 s of audio (§README Run one request).
2. **TTFA: submit to first sound.** Time to first audio, from the request to its first PCM samples on the host. Here: 24 ms.
3. **It includes waiting in line.** Queueing and admission count too, not just the model (§README Terms).
4. **RTF: wall time over audio time.** Below 1 means faster than playback. Here: 0.148, so 4.40 s took about 0.65 s (§README Run one request).
5. **A voice product needs both.** TTFA decides if a reply feels instant; RTF decides if playback ever stalls.

<p class="rd-cap">Numbers from the README's one-request smoke test (0.6B, A100, 64 seats). The timeline is drawn to scale from them.</p>

<p class="rd-take"><b>TTFA is about the start; RTF is about keeping up.</b> Next: what changes when hundreds of people ask at once.</p>

</article>

<article class="rd-page" id="offered-live" data-part="Serving toolbox" data-draw="offered-live" markdown>

<p class="rd-crumb"><b>Toolbox 2</b> Uses RTF from page 1.</p>

## Why is "576 streams" not 576 people at once?

1. **Offered load is an arrival rate.** N offered means N seconds of audio requested per second of wall time (§README Terms).
2. **The engine is unpaced.** It makes audio as fast as it can, not at playback speed (§README Terms).
3. **So streams finish early.** With RTF 0.58, a 25 s request is done in about 15 s.
4. **Live streams ≈ offered × RTF.** 576 offered at RTF 0.58 means about 335 inside the engine at once. Move the sliders.
5. **Read step time, not the label.** The README warns about exactly this (§README Pitfalls 9).

<p class="rd-cap">The rule live ≈ N × RTF is the README's (§README Terms); 576 and 0.581 are its validated 0.6B numbers. The rest is live arithmetic.</p>

<p class="rd-take"><b>Offered streams measure demand, live streams measure load.</b> Next: how arrivals are simulated.</p>

</article>

<article class="rd-page" id="open-loop" data-part="Serving toolbox" data-draw="open-loop" markdown>

<p class="rd-crumb"><b>Toolbox 3</b> How the load in page 2 is generated.</p>

## Why must a load test be open-loop?

1. **Closed loop: wait, then send.** Each simulated user sends the next request only after the last one finishes.
2. **That hides slowness.** A slow server slows the arrivals too, so latency looks fine (§README Terms).
3. **Open loop: a Poisson clock.** Requests arrive at random times at a fixed average rate, whatever the server does (§README Terms).
4. 💻 **Arrivals keep an absolute schedule.** A slow submit does not thin out later arrivals (§code bench_open.py:197).
5. **Warm up, then measure.** 45 s of warm-up and a 300 s window for the numbers to quote (§README Load test).

<p class="rd-cap">Method from the README and engine/bench_open.py at ebbbd00. Arrival times drawn are a seeded Poisson process.</p>

<p class="rd-take"><b>Open-loop tests show the latency real users would see.</b> Next: which latency to report.</p>

</article>

<article class="rd-page" id="percentiles" data-part="Serving toolbox" data-draw="percentiles" markdown>

<p class="rd-crumb"><b>Toolbox 4</b> Reads the TTFA from page 1 across many requests.</p>

## Why quote p99 instead of the average?

1. **Each request gets its own TTFA.** 6,375 requests were measured in the 0.6B run at 576 offered (§README validation table).
2. **p50 is the typical user.** 70.4 ms: half waited less (§README validation table).
3. **p99 is the unlucky one in a hundred.** 98.2 ms. At scale that is many people every minute.
4. **Targets are set on the tail.** The goal here was TTFA under 100 ms at p99 (§README Status).
5. 🧠 **Averages hide queueing spikes.** A mean can look fine while every hundredth user hears a gap.

<p class="rd-cap">p50, p95, p99 are real (§README validation table, 0.6B at 576). The distribution shape between them is illustrative.</p>

<p class="rd-take"><b>Serve the tail, not the mean.</b> Next: why the stock code is slow even when the GPU is idle.</p>

</article>

<article class="rd-page" id="launch-bound" data-part="Serving toolbox" data-draw="launch-bound" data-fast markdown>

<p class="rd-crumb"><b>Toolbox 5</b> The problem the whole engine solves.</p>

## How can a GPU be slow while doing almost nothing?

1. **One frame is 80 ms of audio.** Real time means producing a frame in under 80 ms (§README Terms).
2. **Upstream takes 178 ms at batch 1.** 2.3 times slower than real time (§README Results).
3. **185 ms at 16, 194 ms at 64.** Sixty-four times the work costs only 9% more time (§README Results). Move the slider.
4. **The time is not arithmetic.** It is Python and thousands of tiny kernel launches, each waiting on the CPU (§README How the model works).
5. **Batching then is almost free.** At 64 streams the same code already runs 26 times faster than real time in total.

<p class="rd-cap">Times from the README's stock-code table (0.6B, A100). Bars are to scale.</p>

<p class="rd-take"><b>A flat cost across batch sizes means overhead, not compute.</b> Remove the overhead and batch hard.</p>

</article>

<article class="rd-page" id="cuda-graphs" data-part="Serving toolbox" data-draw="cuda-graphs" markdown>

<p class="rd-crumb"><b>Toolbox 6</b> The first fix for page 5.</p>

## What does a CUDA graph record?

1. **Normally Python launches each kernel.** Every launch costs CPU time, and the GPU waits between them.
2. **A graph records the sequence once.** Kernels, their arguments and memory addresses are captured into one object (§README Engine design).
3. **Replay is one call.** The whole sequence runs on the GPU with no Python in between.
4. **The price: everything is frozen.** Shapes and buffer addresses must not change, so inputs are copied into fixed buffers first.
5. 💻 **The engine replays a whole frame.** Talker, sampling and 15 predictor steps in one graph (§code talker.py:116).

<p class="rd-cap">Mechanism from the README and talker.py at ebbbd00. Kernel counts in the drawing are illustrative.</p>

<p class="rd-take"><b>A graph turns thousands of launches into one.</b> Next: making each kernel do more.</p>

</article>

<article class="rd-page" id="torch-compile" data-part="Serving toolbox" data-draw="torch-compile" markdown>

<p class="rd-crumb"><b>Toolbox 7</b> Pairs with the graphs on page 6.</p>

## What does torch.compile add on top of a graph?

1. **It fuses small ops into bigger kernels.** A norm, a multiply and an add can become one kernel.
2. **Static shapes, one version per bucket.** The engine compiles with dynamic=False (§code talker.py:59).
3. **Own loop: 181 → 32.6 ms per frame.** Replacing upstream's nested generate() alone (§README What was optimised).
4. **Compile + graph: 32.6 → 26.1 ms.** At 256 live streams on the 0.6B (§README What was optimised).
5. **A silent trap.** After 8 recompiles PyTorch quietly runs the function uncompiled; the engine raises the limit (§code model_load.py:11).

<p class="rd-cap">Times from the README's optimisation table; code pointers at ebbbd00.</p>

<p class="rd-take"><b>Compile shrinks the kernels; graphs remove the launches.</b> Next: where each stream's memory lives.</p>

</article>

<article class="rd-page" id="paged-kv" data-part="Serving toolbox" data-draw="paged-kv" markdown>

<p class="rd-crumb"><b>Toolbox 8</b> The memory every live stream holds.</p>

## What is a paged key/value cache?

1. **Each stream keeps keys and values.** One entry per past position, per layer, so the talker needn't recompute history.
2. **Memory is cut into pages.** Here a page holds 256 positions (§code talker.py:30).
3. **A block table maps stream to pages.** The attention kernel follows it, so pages needn't be contiguous (§code talker.py:77).
4. **Our request needs 1 page.** About 78 prompt positions plus 55 frames: 133 positions.
5. **Seats here get 3 pages.** seat_len 768; prompt plus frames must fit (§README Configuration).

<p class="rd-cap">Page size and seat length are real (talker.py, README). The 133-position count is our arithmetic from the prompt and frames.</p>

<p class="rd-take"><b>Pages let many streams share one big memory pool.</b> Next: batching streams of different sizes.</p>

</article>

<article class="rd-page" id="buckets" data-part="Serving toolbox" data-draw="buckets" markdown>

<p class="rd-crumb"><b>Toolbox 9</b> Combines page 6 with a changing crowd.</p>

## How do you batch a crowd whose size keeps changing?

1. **A graph has a fixed batch size.** But live streams come and go every step.
2. **So capture several sizes.** Buckets of 1, 2, 4, 8, then every 16 rows up to the seat count (§code engine.py:65).
3. **Pad up to the next bucket.** 37 live streams run in the 48-row graph. Move the slider.
4. **Padding wastes 0.7–3% of rows.** Fine-grained buckets keep it small for the language model (§README What did not help).
5. **Padded rows still run.** They point at a scratch seat, which caused a crash once (§README Pitfalls 5).

<p class="rd-cap">Bucket list from engine.py:65; padding share from the README. The slider's arithmetic is live.</p>

<p class="rd-take"><b>Buckets trade a little padding for frozen, fast graphs.</b> Next: running two jobs at once on one GPU.</p>

</article>

<article class="rd-page" id="cuda-streams" data-part="Serving toolbox" data-draw="cuda-streams" markdown>

<p class="rd-crumb"><b>Toolbox 10</b> Lets page 6 overlap.</p>

## How can one GPU do two jobs at once?

1. **A CUDA stream is a queue of kernels.** Kernels in one stream run in order.
2. **Two streams can overlap.** The GPU interleaves their kernels when resources allow.
3. **The engine uses a side stream.** The codec decoder runs there while the next language-model step runs (§README Engine design).
4. **Streams can have priorities.** A priority −1 stream jumps ahead at kernel boundaries (§code arrivals.py:183).
5. **Each graph needs its own pool.** Graphs replayed on different streams need separate memory pools and capture streams (§README Pitfalls 7).

<p class="rd-cap">Mechanism from the README and arrivals.py at ebbbd00. The overlap drawn is schematic.</p>

<p class="rd-take"><b>Streams hide one job behind another.</b> Next: the one thing the CPU must read.</p>

</article>

<article class="rd-page" id="pinned" data-part="Serving toolbox" data-draw="pinned" markdown>

<p class="rd-crumb"><b>Toolbox 11</b> The CPU side of page 10.</p>

## Why does the host read only one number per stream?

1. **Every GPU-to-CPU read can stall.** The CPU must wait for the GPU to finish first.
2. **The engine reads only code 0.** One integer per stream, to spot the end-of-speech code (§README Engine design).
3. **Through pinned memory.** Page-locked host memory allows an asynchronous copy (§code engine.py:321).
4. **Everything else stays on the GPU.** Positions, penalties, text queues and codes are GPU tensors indexed by seat (§code talker.py header).
5. **Audio comes back in batches.** Decoded PCM is copied to pinned buffers per chunk (§code engine.py:178).

<p class="rd-cap">From the README and engine.py at ebbbd00. Sizes drawn are schematic.</p>

<p class="rd-take"><b>Keep state on the GPU; read back only what decides control flow.</b> Next: what really limits speed at scale.</p>

</article>

<article class="rd-page" id="bandwidth" data-part="Serving toolbox" data-draw="bandwidth" markdown>

<p class="rd-crumb"><b>Toolbox 12</b> What remains after page 5 is fixed.</p>

## When does memory bandwidth set the speed?

1. **Generating one token reads all the cache.** Every step, each stream's keys and values are read again.
2. **Longer context, more reading.** The talker step at 400 live grew from 6.8 to 15.7 ms between 80 and 420 positions (§README What did not help).
3. **15.7 GB read per step.** The README puts that at 86% of the A100's memory bandwidth.
4. **Then a faster kernel barely helps.** Its estimate: about 1 ms to gain from a different attention kernel (§README What did not help).
5. 🧠 **Long prompts cost every step.** A longer reference clip means more cache read on every frame.

<p class="rd-cap">Times and the 86% figure from the README. The bars are drawn to scale from those times.</p>

<p class="rd-take"><b>At scale the GPU waits on memory, not maths.</b> The toolbox is done; next, the model being served.</p>

</article>

<article class="rd-page" id="q3-whole" data-part="The model being served" data-draw="q3-whole" data-fast markdown>

<p class="rd-crumb"><b>Model 1</b> Qwen3-TTS-12Hz, the model the engine serves. Our sentence enters here.</p>

## What does Qwen3-TTS compute for every 80 ms of audio?

1. **A frame is 16 integer codes.** One from each of 16 codebooks of 2,048 entries, 12.5 frames a second (§README How the model works; Table 4 Q3).
2. **The talker picks code 0.** A 28-layer causal LM with a key/value cache: 1,024 wide in the 0.6B, 2,048 in the 1.7B (§README).
3. **The code predictor picks codes 1–15.** A 5-layer transformer, one code after another (§README; §3.1 Q3 calls it MTP).
4. **The decoder turns codes into sound.** A 114M causal codec decoder: 1,920 samples at 24 kHz per frame (§README).
5. **Our sentence: 55 frames.** 4.40 s ÷ 80 ms. Every frame repeats all three stages.

<p class="rd-cap">Sizes from the README's model section and Table 4 of the Qwen3-TTS report (arXiv:2601.15621). The 55 frames are our arithmetic.</p>

<p class="rd-take"><b>Three networks run once per frame: talker, code predictor, decoder.</b> Next: what the talker reads.</p>

</article>

<article class="rd-page" id="dual-track" data-part="The model being served" data-draw="dual-track" markdown>

<p class="rd-crumb"><b>Model 2</b> The talker's input, from page 13.</p>

## How do text and audio share one input?

1. **Two tracks, added together.** Text and audio are summed into one vector per position, not interleaved (§README; §3.1 Q3).
2. **The audio part: 16 embeddings summed.** One embedding per code of the frame just made (§README).
3. **The text part: the next text token.** One text token is consumed per frame (§code talker.py:103).
4. **When text runs out, a pad token.** The model keeps speaking until it samples end-of-speech (§README).
5. 🧠 **So text streams in as audio streams out.** Upstream calls this streaming text input (§README Voice cloning prompt).

<p class="rd-cap">From the README and talker.py at ebbbd00. Tokens drawn are illustrative.</p>

<p class="rd-take"><b>One summed vector per frame feeds the talker.</b> Next: the 15 steps hiding inside every frame.</p>

</article>

<article class="rd-page" id="code-predictor" data-part="The model being served" data-draw="code-predictor" markdown>

<p class="rd-crumb"><b>Model 3</b> The middle box of page 13.</p>

## Why are 15 tiny steps the real bottleneck?

1. **Codes 1–15 depend on each other.** Each needs the one before, so they come one at a time (§README).
2. **Each step has its own table and head.** 15 embedding tables and 15 output heads (§code model_load.py:57).
3. **16 sequential calls per frame.** One talker step plus 15 predictor steps (§README).
4. **Our sentence: 880 calls.** 55 frames × 16. Move the slider.
5. **Upstream spends 72% of each frame here.** 128.6 of 178 ms at batch 1 (§README Results).

<p class="rd-cap">Step counts from the README; time split from its stock-code table (0.6B). The call count is live arithmetic.</p>

<p class="rd-take"><b>The small model, called 15 times, costs more than the big one.</b> Next: the codec decoder.</p>

</article>

<article class="rd-page" id="codec-decoder" data-part="The model being served" data-draw="codec-decoder" markdown>

<p class="rd-crumb"><b>Model 4</b> The last box of page 13.</p>

## What does the 12 Hz decoder need to stream?

1. **It is fully causal.** No lookahead, so a frame can be played as soon as it is decoded (§2.2 Q3; §README).
2. **First, a transformer over frames.** 8 layers, each seeing a window of 72 frames (§README).
3. **Then convolutions upsample 1,920×.** Transposed and dilated convolutions make 24 kHz audio (§README).
4. **Every layer has a memory.** Windows, convolution histories and overlap tails must persist between chunks (§code decoder_stream.py header).
5. **Stacked windows reach far back.** 8 layers × 71 frames: a frame can depend on 568 earlier frames.

<p class="rd-cap">Structure from §2.2 of the Qwen3-TTS report, the README and decoder_stream.py. The 568-frame reach is the code's own note.</p>

<p class="rd-take"><b>Streaming the decoder means carrying its state, not re-running it.</b> The engine chapter shows how.</p>

</article>

<article class="rd-page" id="icl-prompt" data-part="The model being served" data-draw="icl-prompt" markdown>

<p class="rd-crumb"><b>Model 5</b> What the talker sees before frame 1.</p>

## What is inside the voice-cloning prompt?

1. **About 78 positions per request.** The talker is prefilled with them before the first frame (§README).
2. **3 role tokens.** The chat-style header (§README).
3. **6 control positions.** Language tag and a speaker vector from an ECAPA encoder (§README).
4. **Then the reference clip's codes.** With its transcript and the start of the target text on the text track (§README).
5. **The first 35 never change.** 3 + 6 + 26 reference-text tokens are identical for a voice and language (§README Admission).

<p class="rd-cap">Layout from the README (upstream's ICL mode with streaming text). The 35-position prefix returns on page 34.</p>

<p class="rd-take"><b>Half the prompt is the same for every request in a voice.</b> That fact saves the engine later.</p>

</article>

<article class="rd-page" id="sampling" data-part="The model being served" data-draw="sampling" markdown>

<p class="rd-crumb"><b>Model 6</b> How each code is chosen in page 13.</p>

## How is each code sampled?

1. **Temperature 0.9, top-k 50.** For code 0 and all 15 predictor codes (§README; §code ops.py:68).
2. **A repetition penalty on code 0.** 1.05 over the codes this request already produced (§code talker.py:90).
3. **Special ids are blocked.** The top 1,024 ids of the talker vocabulary are suppressed, except end-of-speech (§code talker.py:43).
4. **No end in the first 2 frames.** End-of-speech is masked until 2 frames exist (§code talker.py:22).
5. 🧠 **Sampling means draws differ.** Same distribution, different random numbers: exactness can't mean identical audio.

<p class="rd-cap">Settings from the README and the code at ebbbd00. The probability bars are illustrative.</p>

<p class="rd-take"><b>Every code is a random draw with fixed rules.</b> Next: what upstream's code costs.</p>

</article>

<article class="rd-page" id="upstream-cost" data-part="The model being served" data-draw="upstream-cost" markdown>

<p class="rd-crumb"><b>Model 7</b> Prices page 5 for this model.</p>

## Where does upstream's 181 ms per frame go?

1. **Talker: about 46 ms.** Flat from batch 1 to 64 (§README Results).
2. **Code predictor: about 130 ms.** Also flat (§README Results).
3. **Nested generate() calls in Python.** The predictor is a full Hugging Face generate() inside each frame (§README).
4. **So batching is free but slow.** 64 streams at 194 ms per frame is 26× real time in total, 0.4× per stream (§README Results).
5. **The target: under 80 ms with hundreds.** Over 400 streams for 0.6B, about 256 for 1.7B (§README Status).

<p class="rd-cap">Numbers from the README's stock table (0.6B, A100). Bars stack the two stages; the remainder is decode and Python.</p>

<p class="rd-take"><b>The work is tiny; the overhead is huge.</b> The engine chapter removes it step by step.</p>

</article>

<article class="rd-page" id="engine-whole" data-part="The engine" data-draw="engine-whole" data-fast markdown>

<p class="rd-crumb"><b>Engine 1</b> Uses the toolbox and the model chapter. Our sentence is now a request.</p>

## What happens in one step of the engine?

1. **One thread calls step() in a loop.** Each step advances every live stream by one frame (§README Engine design).
2. **Admit: up to 8 new requests.** They get a seat and a prefilled prompt (§README Admission).
3. **Frame: one graph for every live seat.** Talker, sampling and the 15 predictor steps (§README Engine design).
4. **Decode: chunks that are due.** On a side stream, overlapping the next step (§README Engine design).
5. **Events: audio and done.** The caller collects them with pop_events() (§code engine.py:291).
6. **Our request lives for about 55 steps.** One per frame, until end-of-speech.

<p class="rd-cap">Flow from the README's engine design and engine.py at ebbbd00. Box sizes are schematic.</p>

<p class="rd-take"><b>Admit, frame, decode, report: once every few tens of milliseconds.</b> Next: where a request lives.</p>

</article>

<article class="rd-page" id="seats" data-part="The engine" data-draw="seats" markdown>

<p class="rd-crumb"><b>Engine 2</b> The unit of memory in page 20.</p>

## What is a seat?

1. **A fixed slot for one stream.** 704 seats for the 0.6B, 640 for the 1.7B in the validated runs (§README Engine design).
2. **It owns a key/value cache.** 768 positions in pages of 256 (§README).
3. **And the stream's small state.** Its text queue, repetition mask and a decoder state slot (§README).
4. **A request takes a free seat.** Our sentence lands in one; nothing is allocated on arrival.
5. **Released only after the last audio.** The seat frees when its final PCM reaches the host (§README).
6. **Full means refused.** Beyond max_live, add_request returns False (§code engine.py:157).

<p class="rd-cap">From the README and engine.py at ebbbd00. Which seat our request gets is illustrative.</p>

<p class="rd-take"><b>Seats turn memory management into a free list.</b> Next: how many fit on one GPU.</p>

</article>

<article class="rd-page" id="kv-memory" data-part="The engine" data-draw="kv-memory" markdown>

<p class="rd-crumb"><b>Engine 3</b> Prices the seats of page 21.</p>

## How many seats fit in 80 GB?

1. **Cache per position: 112 KiB.** 28 layers × keys and values × 8 heads × 128 numbers × 2 bytes.
2. **Per seat: 84 MiB.** 768 positions × 112 KiB. Move the sliders.
3. **704 seats: 57.8 GiB.** Plus one scratch seat; matches the README's 57.8 GB (§README Limitations).
4. **Total: 68.9 GB for the 0.6B.** Weights, decoder states and graph memory take the rest (§README Limitations).
5. **So seats can't grow much.** Not at 768 positions per seat, the README notes (§README Limitations).

<p class="rd-cap">Shapes from talker.py and model_load.py; totals from the README. Per-seat arithmetic is ours and is live; the 1.7B has the same cache shape.</p>

<p class="rd-take"><b>The cache, not the weights, fills the card.</b> Next: what runs inside one frame.</p>

</article>

<article class="rd-page" id="frame-graph" data-part="The engine" data-draw="frame-graph" data-fast markdown>

<p class="rd-crumb"><b>Engine 4</b> The middle of page 20, using page 6.</p>

## How does a whole frame become one CUDA graph?

1. **Input: a list of seat numbers.** The only thing the host sends per step (§code talker.py header).
2. **Talker: 28 layers, one token per seat.** Writes keys and values into each seat's pages (§code talker.py:63).
3. **Code 0 sampled on the GPU.** Penalty, suppression and top-k inside the graph (§code talker.py:90).
4. **15 predictor steps, also inside.** Each with its own sampling (§code code_predictor.py:62).
5. **Next input written back to the seat.** 16 summed embeddings plus the next text token (§code talker.py:96).
6. **Replayed as one call.** The upstream version was 16 nested model calls (§README What was optimised).

<p class="rd-cap">Stages from talker.py and code_predictor.py at ebbbd00. One graph exists per batch bucket.</p>

<p class="rd-take"><b>One replay produces a full frame for every live stream.</b> Next: the trap with padded rows.</p>

</article>

<article class="rd-page" id="scratch-seat" data-part="The engine" data-draw="scratch-seat" markdown>

<p class="rd-crumb"><b>Engine 5</b> The padding from page 9, inside page 23.</p>

## Where do padded rows go?

1. **A 48-row graph with 37 live streams.** 11 rows are padding (our example).
2. **They point at a scratch seat.** Seat number n_seats, never a live one (§code talker.py header).
3. **But they still run.** Their position advanced on every replay (§README Pitfalls 5).
4. **After 768 steps it ran off the end.** A device-side assert in the first long run (§README Pitfalls 5).
5. 💻 **Fix: pin the scratch seat at 0.** Both the engine and the graph reset it every replay (§code engine.py:317; talker.py:111).

<p class="rd-cap">Story from the README's pitfalls; fix in the code at ebbbd00. The 37/48 split is our example.</p>

<p class="rd-take"><b>Padding is real work on real memory.</b> Next: random numbers inside a frozen graph.</p>

</article>

<article class="rd-page" id="rng-graph" data-part="The engine" data-draw="rng-graph" markdown>

<p class="rd-crumb"><b>Engine 6</b> Sampling from page 18, inside page 23.</p>

## How do you draw random numbers in a replayed graph?

1. **A graph freezes its inputs.** Including, by default, the random generator's state.
2. **So every replay draws the same sample.** Every frame would pick the same codes (§README Pitfalls 1).
3. **Register the generator with the graph.** register_generator_state lets each replay advance it (§code talker.py:122).
4. **Tested: 1,999 distinct of 2,000.** Draws across 2,000 replays (§README Pitfalls 1).
5. **One random stream for the engine.** The per-request seed argument is ignored (§README Configuration).

<p class="rd-cap">Numbers from the README's pitfalls; code at ebbbd00. The dice drawing is illustrative.</p>

<p class="rd-take"><b>Without registration, sampling inside a graph silently stops being random.</b> Next: a copy the compiler hid.</p>

</article>

<article class="rd-page" id="cp-copy" data-part="The engine" data-draw="cp-copy" markdown>

<p class="rd-crumb"><b>Engine 7</b> The predictor of page 15, under torch.compile.</p>

## What did the compiler secretly copy?

1. **The predictor keeps a 16-slot cache.** Per stream, per layer, it lives only for one frame (§README Engine design).
2. **Each step writes one slot in place.** Inside one compiled function, that write became a copy of the whole buffer (§README Pitfalls 2).
3. **17 of 35 ms went to copying.** At 400 live streams (§README Pitfalls 2).
4. 💻 **Fix: split the layer in two.** Compiled pieces before and after; the in-place write between them (§code code_predictor.py:58).
5. **Kernel time: 35.1 → 19.6 ms.** Same maths (§README What was optimised).

<p class="rd-cap">Numbers from the README; split from code_predictor.py at ebbbd00. Bar lengths are to scale.</p>

<p class="rd-take"><b>Keep in-place state writes outside compiled pieces.</b> Next: the decoder's memory.</p>

</article>

<article class="rd-page" id="decoder-state" data-part="The engine" data-draw="decoder-state" data-fast markdown>

<p class="rd-crumb"><b>Engine 8</b> Solves the streaming problem from page 16.</p>

## How does the decoder stream exactly?

1. **Every stage keeps what it looks back at.** The last 2 frames for the first convolution (§code decoder_stream.py header).
2. **Each transformer layer keeps 71 past frames.** Rotated keys and values, in a ring written in place (§code decoder_stream.py:34).
3. **Each convolution keeps its tail.** The last 6 samples, or 6 × dilation for dilated ones (§code decoder_stream.py header).
4. **3 MiB per seat.** That is the whole history needed (§README Engine design).
5. **A chunk costs only its own frames.** Nothing is ever decoded twice (§code decoder_stream.py header).

<p class="rd-cap">State layout from decoder_stream.py at ebbbd00 and the README. Block sizes in the drawing are schematic.</p>

<p class="rd-take"><b>Carry every layer's history and streaming becomes exact and cheap.</b> Next: why the shortcut fails.</p>

</article>

<article class="rd-page" id="rewindow" data-part="The engine" data-draw="rewindow" markdown>

<p class="rd-crumb"><b>Engine 9</b> The alternative to page 27.</p>

## Why not just re-decode a short window?

1. **The common shortcut.** Decode the new frames plus some old frames as context, then drop the old audio.
2. **Upstream's own chunked decode does this.** chunked_decode(300, 25): 12.8 dB against a one-shot decode (§README What did not help).
3. **Windows of 25 to 144 frames: 5–64 dB.** Still not exact (§README What did not help).
4. **Why: stacked windows reach 568 frames.** Each of 8 layers sees 72 frames, so context compounds (page 16).
5. **Cached state: 47–52 dB.** Against an fp32 one-shot decode (§README What exact means).

<p class="rd-cap">Signal-to-noise ratios from the README, all against a one-shot fp32 decode of the same codes. Higher is closer.</p>

<p class="rd-take"><b>Re-decoding a window is cheap to write and wrong.</b> Next: which precision.</p>

</article>

<article class="rd-page" id="precision" data-part="The engine" data-draw="precision" markdown>

<p class="rd-crumb"><b>Engine 10</b> The number format for page 27.</p>

## Why run the decoder in fp16 and not bf16?

1. **Upstream decodes in bf16.** That is 27–31 dB against fp32 (§README What exact means).
2. **fp16 gives 47–52 dB.** More mantissa bits, same speed class (§README What exact means).
3. **fp32 is exact to 57–61 dB, but slower.** Available as dec_dtype=fp32 (§README Configuration).
4. **The language model stays bf16.** Like upstream (§README What exact means).
5. 🧠 **Closer to ideal than upstream's decode.** For the decoder stage, by these measurements.

<p class="rd-cap">SNR ranges from the README; the README's "did not help" list gives 29–33 dB for bf16, a slightly different run.</p>

<p class="rd-take"><b>For waveform decoders, fp16 beats bf16 by 20 dB here.</b> Next: how big each audio chunk is.</p>

</article>

<article class="rd-page" id="ramp" data-part="The engine" data-draw="ramp" markdown>

<p class="rd-crumb"><b>Engine 11</b> Scheduling page 27 for low TTFA.</p>

## Why send 1 frame, then 2, then 4?

1. **The first packet is a single frame.** 80 ms of audio, decoded as soon as it exists (§README Engine design).
2. **Then 2 frames, then 4 at a time.** The ramp 1/2/4 (§README Configuration).
3. **Bigger chunks are cheaper per frame.** At 256 streams: 14.1 ms per 1-frame call, 44.5 ms per 4-frame call (§README Results). Move the slider.
4. **First packets are awaited inside the step.** They decide TTFA (§code engine.py:338).
5. **Steady chunks are collected next step.** So they overlap the next language-model step (§README Engine design).

<p class="rd-cap">Ramp and decoder costs from the README; per-frame costs are our division. Qwen's own serving uses 4-frame packets (§3.4 Q3).</p>

<p class="rd-take"><b>Small first, big after: low TTFA without paying it on every chunk.</b> Next: the overlap.</p>

</article>

<article class="rd-page" id="overlap" data-part="The engine" data-draw="overlap" markdown>

<p class="rd-crumb"><b>Engine 12</b> Uses page 10 and page 30.</p>

## How does decoding hide behind the language model?

1. **Two GPU queues.** The frame graph on the default stream, the decoder on a side stream (§README Engine design).
2. **Launch now, collect later.** Steady chunks start in step k and are read in step k+1 (§code engine.py:338).
3. **Under load the stages overlap.** At 0.6B, 512 offered: language model 29.7 ms, decoder 21.9 ms (§README Stage split).
4. **Yet the wall step is 36.2 ms.** Less than the 51.6 ms sum (§README Stage split).
5. **Overlap has a cost.** The language model alone takes about 25 ms; contention adds the rest (§README Stage split).

<p class="rd-cap">Stage times from the README (0.6B, 512 offered, graphed admission). The timeline is drawn to those numbers.</p>

<p class="rd-take"><b>Overlap turns 51.6 ms of work into a 36.2 ms step.</b> Next: the clone's first sound.</p>

</article>

<article class="rd-page" id="voice-snapshot" data-part="The engine" data-draw="voice-snapshot" markdown>

<p class="rd-crumb"><b>Engine 13</b> The decoder state of page 27, for a cloned voice.</p>

## Why prime the decoder with the reference clip?

1. **Upstream decodes reference plus generated codes.** Then it cuts the reference audio off (§README How the model works).
2. **So generated audio has the reference as history.** Start without it and the clip opens with noise (§README Pitfalls 3).
3. **11 dB without priming, 48 dB with.** (§README Engine design).
4. 💻 **Prime once per voice, snapshot it.** At boot the reference is decoded and the state saved (§code engine.py:92).
5. 💻 **Copy the snapshot into a seat on arrival.** A row copy, no decoding (§code decoder_stream.py:374).

<p class="rd-cap">SNR from the README; mechanism in decoder_stream.py and engine.py at ebbbd00.</p>

<p class="rd-take"><b>A voice is also a decoder state.</b> Next: what arrivals cost.</p>

</article>

<article class="rd-page" id="admission-stall" data-part="The engine" data-draw="admission-stall" markdown>

<p class="rd-crumb"><b>Engine 14</b> The first stage of page 20, before the fix.</p>

## Why did new arrivals slow everyone down?

1. **A new request needs its prompt prefilled.** 78 positions through 28 layers (page 17).
2. **Originally done eagerly, on the engine thread.** About 400 kernel launches, uncompiled (§code arrivals.py header).
3. **30 ms blocked per admission.** No stream advanced meanwhile (§README Pitfalls 10).
4. **Step 42 ms; frame only 18.5.** At 400 offered (§README Pitfalls 10).
5. **Our request waited 74.2 ms for first audio.** p50, with this path (§README Results).

<p class="rd-cap">Numbers from the README (0.6B, 400 offered, uncompiled prefill). Bars are to scale.</p>

<p class="rd-take"><b>Per-arrival work on the engine thread stalls every stream.</b> Next: the fix.</p>

</article>

<article class="rd-page" id="prefix-reuse" data-part="The engine" data-draw="prefix-reuse" markdown>

<p class="rd-crumb"><b>Engine 15</b> Fixes page 33 using page 17.</p>

## How does a shared voice prefix make admission cheap?

1. **35 of 78 positions never change.** For one voice and language (page 17).
2. **Compute their keys and values once.** Then copy them into each new seat (§README Admission).
3. **Prefill only the other 42.** One small CUDA graph per 1, 2, 4 or 8 arrivals (§README Admission).
4. **Text projection becomes a lookup.** Precomputed for every token id (§code arrivals.py:51).
5. **Blocked time: 31–41 ms → 0.14–0.25 ms.** GPU cost 3–4 ms per admission call (§README Admission).

<p class="rd-cap">Numbers from the README; layout from arrivals.py at ebbbd00. Causal attention is why prefix reuse is exact.</p>

<p class="rd-take"><b>Cache what every request shares; graph the rest.</b> Next: the last prompt token.</p>

</article>

<article class="rd-page" id="last-token" data-part="The engine" data-draw="last-token" markdown>

<p class="rd-crumb"><b>Engine 16</b> A detail of page 34.</p>

## Why leave the last prompt token for the bulk graph?

1. **Prefill stops one position short.** 77 of 78 positions go into the cache (§README First frame).
2. **The last one waits as the seat's input.** Exactly like an ordinary next input (§code engine.py docstring).
3. **So frame 0 comes from the shared graph.** No separate first-frame code path (§README First frame).
4. **Same maths as upstream.** Prefill then sample, just scheduled differently (§code engine.py docstring).
5. **TTFA = wait + admit + one frame + one decode.** (§README First frame).

<p class="rd-cap">From the README's First frame note and engine.py at ebbbd00.</p>

<p class="rd-take"><b>One code path for every frame, including the first.</b> Next: where first audio's time goes.</p>

</article>

<article class="rd-page" id="ttfa-anatomy" data-part="The engine" data-draw="ttfa-anatomy" markdown>

<p class="rd-crumb"><b>Engine 17</b> Measures page 35, before and after page 34.</p>

## Where does first audio's time go?

1. **Wait for the running step: 20.8 → 13.1 ms.** Shorter steps, shorter waits. Flip the toggle.
2. **Prompt build: 1.7 → 0.0 ms.** Now a table lookup.
3. **Prefill, engine blocked: 29.9 → 0.2 ms.** The big win.
4. **Bulk frame: 18.5 → 24.9 ms.** Admission now shares the GPU with the frame.
5. **First decode: 2.5 ms, both times.** Total p50: 74.2 → 41.9 ms (§README Results).

<p class="rd-cap">Median parts from the README (0.6B, 400 offered). Medians of parts need not add to the median total.</p>

<p class="rd-take"><b>TTFA nearly halved by moving work off the engine thread.</b> Next: a faster lane for first frames.</p>

</article>

<article class="rd-page" id="fast-lane" data-part="The engine" data-draw="fast-lane" markdown>

<p class="rd-crumb"><b>Engine 18</b> The next step after page 36.</p>

## What is the first-frame fast lane?

1. **Don't wait for the running step.** Prefill and frame 0 run on a priority −1 stream during the bulk graph (§README Fast lane).
2. **Frame 0 in 19–26 ms.** With 256–400 streams live, 0.6B (§README Fast lane).
3. **Bit-identical in 40 of 40 replays.** Against a quiet run (§README Fast lane).
4. **Each use stretches the bulk step 6–10 ms.** Everyone else pays a little (§README Fast lane).
5. 💻 **The README says it isn't wired in.** But engine.py has first_lane=1 and a _step_fl path, off by default and not validated (§code engine.py:70).

<p class="rd-cap">Numbers from the README; the wiring finding is ours from engine.py at ebbbd00, read, not run.</p>

<p class="rd-take"><b>A priority lane trades bulk speed for first-audio speed.</b> Next: why boot takes minutes.</p>

</article>

<article class="rd-page" id="boot" data-part="The engine" data-draw="boot" markdown>

<p class="rd-crumb"><b>Engine 19</b> The cost of page 6 and page 7.</p>

## Why does the engine take minutes to start?

1. **Every bucket is compiled and captured.** Talker, predictor, decoder and admission graphs (§code engine.py).
2. **185–190 s with a warm cache.** About 10 minutes cold (§README Limitations).
3. **The compile cache persists.** /tmp/torchinductor_<user>; the next boot is 3–4× shorter (§README Pitfalls 8).
4. **Decoder compile mode matters.** max-autotune took ~170 s per shape; default 20–45 s, same speed (§README What was optimised).
5. 🧠 **Plan deploys around boot.** Start new replicas before old ones stop.

<p class="rd-cap">Times from the README. The boot timeline is drawn from them; stage order is ours.</p>

<p class="rd-take"><b>Fast steps are bought with slow starts.</b> Next: what "exact" really promises.</p>

</article>

<article class="rd-page" id="exactness" data-part="The engine" data-draw="exactness" markdown>

<p class="rd-crumb"><b>Engine 20</b> Checks every change in this chapter.</p>

## What does "exact" mean for this engine?

1. **In fp32, the maths matches.** Talker logits within 4.5e-7, predictor within 6.4e-7 relative error (§README What exact means).
2. **Same token in 705 of 705 predictor calls.** Teacher-forced against upstream (§README What exact means).
3. **In bf16, rounding differs.** Logits 0.65–1.6% apart; same top token 87–100% of the time (§README What exact means).
4. **Draws differ by design.** Random numbers come from the GPU inside the graph (§README What exact means).
5. **So quality is checked statistically.** Against the stock model's own seed-to-seed spread (page 46).

<p class="rd-cap">Parity numbers from the README (engine/parity.py; its result files are not in the repo).</p>

<p class="rd-take"><b>Exact maths, same distribution, different dice.</b> The engine is built; next, its numbers.</p>

</article>

<article class="rd-page" id="ladder" data-part="Does it work?" data-draw="ladder" markdown>

<p class="rd-crumb"><b>Results 1</b> The engine chapter, as a list of measured wins.</p>

## Which change bought how much?

1. **Own frame loop: 181 → 32.6 ms per frame.** 0.6B, 256 live, still uncompiled (§README What was optimised). Flip the toggle.
2. **Compile + one graph per frame: → 26.1 ms.** (§README What was optimised).
3. **Predictor copy fix: step 26.1 → 17.8 ms.** At 256 live; at 400 live, 42.1 → 25.2 ms (§README What was optimised).
4. **Decoder: 119.0 → 44.5 ms.** 256 streams × 4 frames: compile, channels-last, in-place ring (§README What was optimised).
5. **Every step kept the maths.** The table marks each change exact or rounding-level (§README What was optimised).

<p class="rd-cap">All numbers from the README's optimisation table (A100). Each bar is a separately measured configuration.</p>

<p class="rd-take"><b>The biggest win was deleting Python, not writing kernels.</b> Next: how step time grows with load.</p>

</article>

<article class="rd-page" id="step-scaling" data-part="Does it work?" data-draw="step-scaling" markdown>

<p class="rd-crumb"><b>Results 2</b> Streams held live, no arrivals: the engine's raw speed.</p>

## How does step time grow with live streams?

1. **80 ms is the real-time line.** A step slower than one frame of audio can't keep up.
2. **LM alone, 0.6B: 13.4 → 48.5 ms.** From 128 to 1,024 live streams, short context (§README Results). Flip the toggle.
3. **Longer context costs more.** At 400 live, 25.2 ms becomes 34.1 ms with 420 positions (§README Results).
4. **Whole engine, 0.6B: 54.6 ms at 512 live.** Decoder included: RTF-equivalent 0.68 (§README Results).
5. **1.7B: 43.5 ms at 300 live.** RTF-equivalent 0.54 (§README Results).

<p class="rd-cap">From the README's step tables (A100, bf16 LM, fp16 decoder). Lines join measured points.</p>

<p class="rd-take"><b>Hundreds of streams fit under the 80 ms line.</b> Next: what happens with real arrivals.</p>

</article>

<article class="rd-page" id="knee" data-part="Does it work?" data-draw="knee" markdown>

<p class="rd-crumb"><b>Results 3</b> Open-loop arrivals (page 3) at rising load.</p>

## Where is the knee?

1. **0.6B at 400 offered: TTFA p99 64.0 ms.** RTF p50 0.33 (§README Results, 90 s sweeps). Flip the toggle.
2. **At 640: 131.4 ms.** First audio misses 100 ms; RTF 0.72 still holds (§README Results).
3. **At 768: everything breaks.** RTF 1.04 and 223 requests rejected (§README Results).
4. **1.7B crosses 100 ms near 512.** 102.9 ms at 512 offered (§README Results).
5. **TTFA fails before throughput.** The README calls first audio the binding limit above the knee (§README Status).

<p class="rd-cap">TTFA p99 from the README's 90 s open-loop sweeps (slightly optimistic, per the README). The dashed line is the 100 ms target.</p>

<p class="rd-take"><b>Latency, not throughput, sets capacity.</b> Next: the long runs to quote.</p>

</article>

<article class="rd-page" id="validation" data-part="Does it work?" data-draw="validation" data-fast markdown>

<p class="rd-crumb"><b>Results 4</b> The headline numbers, over 300 s windows.</p>

## What are the numbers to quote?

1. **0.6B: 576 offered streams.** TTFA p99 98.2 ms, RTF p99 0.62, 6,375 requests (§README validation table).
2. **1.7B: 480 offered streams.** TTFA p99 82.5 ms, RTF p99 0.51 (§README validation table). Flip the toggle.
3. **Zero rejected, zero unfinished.** And no recompile-limit warnings (§README).
4. **Requests of about 25 s each.** One voice, English text (§README Limitations).
5. **Upstream: under 1 stream in real time.** 181 ms per 80 ms frame (page 19).

<p class="rd-cap">From the README's validation table (A100-80GB, 45 s warm-up + 300 s). Result JSON files are not in the repo.</p>

<p class="rd-take"><b>One A100: about 576 streams of 0.6B under 100 ms p99.</b> Next: what the arrival fix contributed.</p>

</article>

<article class="rd-page" id="arrival-fix" data-part="Does it work?" data-draw="arrival-fix" markdown>

<p class="rd-crumb"><b>Results 5</b> page 34, measured over 300 s.</p>

## What did graphed admission buy?

1. **0.6B at 400: TTFA p99 109.8 → 64.7 ms.** (§README arrival fix). Flip the toggle.
2. **RTF p50 0.54 → 0.34.** The whole engine got faster, not just first audio.
3. **Step 42.3 → 26.5 ms.** No more stalls on each arrival.
4. **1.7B at 256: 99.1 → 50.0 ms.** RTF 0.36 → 0.25 (§README arrival fix).
5. **GPU per arrival: 23 → 4.7 ms.** Averaged over the sweeps (§README Results).

<p class="rd-cap">From the README's before/after table (300 s windows).</p>

<p class="rd-take"><b>One admission fix halved first-audio time.</b> Next: where the GPU time goes now.</p>

</article>

<article class="rd-page" id="stage-split" data-part="Does it work?" data-draw="stage-split" markdown>

<p class="rd-crumb"><b>Results 6</b> Inside one 36.2 ms step (page 31).</p>

## Where does the GPU time go under load?

1. **Language model: 29.7 ms.** 0.6B, 512 offered (§README Stage split).
2. **Decoder: 21.9 ms.** About 40% of the GPU work (§README Status).
3. **Admission: 3.9 ms.** Small since the fix (§README Stage split).
4. **32% of decoded rows are padding.** Decoder buckets are coarse (§README Status).
5. 🧠 **The decoder is the next target.** Finer buckets exist (dec_fine) but aren't validated (§README Configuration).

<p class="rd-cap">Stage times from the README; they overlap, so they sum to more than the step.</p>

<p class="rd-take"><b>The codec decoder is now nearly half the work.</b> Next: does the audio still sound right?</p>

</article>

<article class="rd-page" id="quality-gate" data-part="Does it work?" data-draw="quality-gate" markdown>

<p class="rd-crumb"><b>Results 7</b> Tests page 39 on real audio.</p>

## Does the engine's audio match stock?

1. **32 sentences, one voice.** 24 English, 4 Spanish, 4 German; Whisper-large-v3 and WavLM score them (§README Quality gate).
2. **Stock 0.6B: 5.7% or 7.3% WER.** It depends on the seed. That spread is the yardstick (§README Quality gate).
3. **Engine 0.6B: 6.1%.** Inside the spread; voice similarity 0.932 versus 0.930–0.937 (§README Quality gate). Flip the toggle.
4. **Engine 1.7B: 5.7% vs stock 4.9–5.1%.** German 5.8% against 0–1.9%: about three words, one seed (§README Status).
5. 🧠 **Small gate, honest caveats.** Four sentences per language; a second seed is still owed.

<p class="rd-cap">WER and similarity from the README (graphed admission, seed 1000). Most English "errors" are digits versus words.</p>

<p class="rd-take"><b>Audio matches stock within its own randomness, on a small test.</b> Next: Qwen's own numbers.</p>

</article>

<article class="rd-page" id="vs-paper" data-part="Does it work?" data-draw="vs-paper" markdown>

<p class="rd-crumb"><b>Results 8</b> Puts page 43 next to the Qwen3-TTS report.</p>

## How does this compare with Qwen's own serving numbers?

1. **Qwen measured 1, 3 and 6 concurrent requests.** On an internal vLLM V0 engine with compiled, graphed decoding (§3.4 Q3).
2. **0.6B first packet: 97 → 179 → 299 ms.** As concurrency goes 1 → 3 → 6 (Table 2 Q3). Flip the toggle.
3. **Their packet is 4 frames, 320 ms.** The engine's first packet is 1 frame (§3.4 Q3; §README).
4. **Engine: p99 98 ms, ~335 live.** 576 offered × RTF 0.58 (page 2).
5. 🧠 **Not a fair race.** Qwen's hardware is "a single typical computational resource"; definitions differ. Treat it as context, not a score.

<p class="rd-cap">Qwen numbers from Table 2 of arXiv:2601.15621; engine numbers from the README. Different hardware and metrics.</p>

<p class="rd-take"><b>The engine sustains, with hundreds live, the first-audio time Qwen reported for one.</b> Hardware is unknown, so treat this as rough.</p>

</article>

<article class="rd-page" id="missing" data-part="Toward production" data-draw="missing" markdown>

<p class="rd-crumb"><b>Production 1</b> From benchmark to service. Starts the deployment chapter.</p>

## What is missing before this can serve real users?

1. **No network front end.** The engine is a Python object driven by a loop (§README Limitations).
2. **One stored voice per model.** The fast path caches one voice's prefix at boot (§README Run one request).
3. **One random stream.** The per-request seed is ignored (§README Configuration).
4. **One GPU, one process.** No replicas, no failover (§README Setup).
5. **No licence file.** GitHub lists none, so reuse rights are unclear (found by us).
6. **Evidence files absent.** The results JSON, tests and several benchmark scripts named in the README are not in the repo (found by us).

<p class="rd-cap">Limitations from the README; the last two points are ours, from the repo at ebbbd00 and GitHub's metadata.</p>

<p class="rd-take"><b>A fast core, without the parts a service needs.</b> The next pages sketch those parts.</p>

</article>

<article class="rd-page" id="front-end" data-part="Toward production" data-draw="front-end" markdown>

<p class="rd-crumb"><b>Production 2</b> 🧠 The first gap on page 48. Found by us.</p>

## How should the audio reach a client?

1. **HTTP chunked PCM.** OpenAI's speech API streams raw 24 kHz 16-bit PCM this way (OpenAI docs).
2. **WebSocket frames.** vLLM-Omni serves Qwen3-TTS PCM over /v1/audio/speech/stream (vLLM-Omni docs).
3. **gRPC streams.** NVIDIA Triton's CosyVoice2 example streams over gRPC (CosyVoice runtime README).
4. **Our first packet is small.** 1,920 samples × 2 bytes = 3,840 bytes for 80 ms. Move the slider.
5. 🧠 **Send PCM inside a datacentre; Opus over phones.** 24 kHz 16-bit PCM is 48 KB/s per stream.

<p class="rd-cap">API facts from the OpenAI, vLLM-Omni and CosyVoice docs (found by us). Byte arithmetic is ours and live.</p>

<p class="rd-take"><b>Any streaming transport works; keep the first packet tiny.</b> Next: wiring it to the engine.</p>

</article>

<article class="rd-page" id="serve-loop" data-part="Toward production" data-draw="serve-loop" markdown>

<p class="rd-crumb"><b>Production 3</b> 🧠 Connects page 49 to page 20.</p>

## How should network threads talk to the engine?

1. 💻 **add_request is thread-safe.** It takes a lock and only enqueues (§code engine.py:157).
2. 💻 **step() must stay on one thread.** All GPU work happens there (§code bench_open.py header).
3. 🧠 **A queue per request.** The engine thread pushes PCM chunks; each socket thread drains its own.
4. 🧠 **Audio runs ahead of playback.** At RTF 0.58, a 25 s reply is ready in about 15 s; buffer it, don't block the engine.
5. 🧠 **Never do per-request work on the engine thread.** The admission stall showed what that costs (page 33).

<p class="rd-cap">Engine interface from engine.py and bench_open.py at ebbbd00. The queue design is our proposal.</p>

<p class="rd-take"><b>One GPU thread, many socket threads, queues between them.</b> Next: more than one voice.</p>

</article>

<article class="rd-page" id="multi-voice" data-part="Toward production" data-draw="multi-voice" markdown>

<p class="rd-crumb"><b>Production 4</b> The second gap on page 48.</p>

## What would serving many voices take?

1. **Each voice needs three cached things.** Prompt parts, a decoder snapshot, and prefix keys and values (page 32, page 34).
2. 💻 **Prefix slots: at most 8.** One per (voice, language) (§code arrivals.py:40).
3. 💻 **Every voice must match the first one's layout.** A different reference length fails an assertion (§code arrivals.py voice_slot).
4. 💻 **Only English, Spanish, German are registered.** Other languages hit a missing key on the fast path (§code engine.py:74). Read by us, not run.
5. 🧠 **A voice registry is real work.** Pad references to one length, raise the slot cap, register every language.

<p class="rd-cap">Findings from arrivals.py and engine.py at ebbbd00, read but not run. The README says other layouts fall back to the slow path; the code we read raises instead.</p>

<p class="rd-take"><b>Multi-voice serving is a design change, not a flag.</b> Next: how many GPUs you need.</p>

</article>

<article class="rd-page" id="capacity" data-part="Toward production" data-draw="capacity" markdown>

<p class="rd-crumb"><b>Production 5</b> 🧠 Uses page 2 and page 43.</p>

## How many GPUs would your traffic need?

1. **Measure demand in audio-seconds per second.** Requests per second × seconds of audio each.
2. **That number is "offered streams".** The unit of the README's tables (§README Terms).
3. **One A100: 576 for 0.6B, 480 for 1.7B.** At TTFA p99 under 100 ms (§README validation table).
4. 🧠 **Plan at 70% of that.** Peaks, longer texts and new voices eat the margin.
5. 🧠 **Example: 10 requests/s of 25 s.** 250 offered: one A100 for 0.6B with room to spare. Move the sliders.

<p class="rd-cap">Capacities from the README; the 70% headroom and the calculator are our planning rule, not measured.</p>

<p class="rd-take"><b>Size by audio-seconds per second, not by users.</b> Next: other GPUs.</p>

</article>

<article class="rd-page" id="other-gpus" data-part="Toward production" data-draw="other-gpus" markdown>

<p class="rd-crumb"><b>Production 6</b> 🧠 Ports page 22 and page 12 to other cards. Specs found by us.</p>

## Would it run on a smaller GPU?

1. **Memory sets the seat count.** About 87 MiB per seat (cache plus decoder state), on top of roughly 9 GB of fixed cost.
2. **The smoke test used 14.9 GB.** 64 seats, 0.6B: 14.9 GB minus 64 seats leaves about 9 GB fixed (§README Run one request).
3. **Bandwidth sets the speed at scale.** A100 SXM: 2,039 GB/s; L40S: 864; L4: 300 (NVIDIA product pages).
4. 🧠 **An L4: about 160 seats, slower steps.** It has a seventh of the bandwidth. Flip the toggle; seats are memory-only estimates.
5. 🧠 **Re-measure, don't scale.** Untested on any GPU but the A100.

<p class="rd-cap">GPU specs from NVIDIA's product pages (found by us). Seat estimates are our arithmetic; nothing was run.</p>

<p class="rd-take"><b>Smaller cards fit fewer seats and run each step slower.</b> Next: what breaks in production.</p>

</article>

<article class="rd-page" id="failure-modes" data-part="Toward production" data-draw="failure-modes" markdown>

<p class="rd-crumb"><b>Production 7</b> From the README's own pitfalls and limitations.</p>

## What will go wrong in production?

1. **Ramblers.** Each sweep had a request run to the 688-frame cap: 55 s for a 26 s text (§README Status).
2. **Silent recompiles.** Past the limit, a compiled function runs uncompiled; grep logs for recompile_limit (§README Load test).
3. **Slow boots.** 3–5 minutes warm, about 10 cold (§README Limitations).
4. **One thread, one failure.** An exception in step() stops every stream (§code bench_open.py serve loop).
5. **Speaking-rate drift.** Long texts with long references can drift, as in upstream (§README Limitations).

<p class="rd-cap">Failure modes from the README and bench_open.py at ebbbd00.</p>

<p class="rd-take"><b>Cap lengths, watch compile logs, plan boots, isolate failures.</b> Next: what to monitor.</p>

</article>

<article class="rd-page" id="monitoring" data-part="Toward production" data-draw="monitoring" markdown>

<p class="rd-crumb"><b>Production 8</b> Turns page 54 into dashboards.</p>

## What should you monitor?

1. **TTFA p99 and RTF p99.** The two promises to users (page 4).
2. 💻 **Wall ms per step.** Over 80 ms means falling behind real time (§code engine.py stats).
3. 💻 **Rejected requests.** The engine refuses when seats are full (§code engine.py:157).
4. 💻 **ended_by_cap.** Ramblers that hit the frame cap (§code engine.py:332).
5. 💻 **Padding rows.** lm_pad_rows and dec_pad_rows show wasted work (§code engine.py stats).
6. **Recompile warnings: must be 0.** (§README Load test).

<p class="rd-cap">Counter names from engine.py at ebbbd00 (stats()). Thresholds are ours.</p>

<p class="rd-take"><b>The engine already counts what matters; export it.</b> Next: why versions must be pinned.</p>

</article>

<article class="rd-page" id="pin-versions" data-part="Toward production" data-draw="pin-versions" markdown>

<p class="rd-crumb"><b>Production 9</b> A trap for page 25. Found by us.</p>

## Why pin every library version?

1. **Tested stack.** torch 2.8.0, transformers 4.57.3, flash-attn 2.8.3, triton 3.4.0, qwen-tts 0.1.1 (§README Setup).
2. **Transformers 5 is not supported.** By upstream (§README Setup).
3. **The engine leans on graph internals.** register_generator_state, memory pools, compile limits (§code talker.py:122).
4. **Newer PyTorch changed one of them.** On PyTorch main, register_generator_state is deprecated and does nothing (PyTorch source, found by us).
5. 🧠 **Re-run the RNG test before upgrading.** If sampling stops being random, audio repeats without any error.

<p class="rd-cap">Versions from the README; the deprecation is from PyTorch's Graph.cpp on main (found by us, not tested against this engine).</p>

<p class="rd-take"><b>Low-level speed tricks tie you to exact versions.</b> Next: other ways to serve Qwen3-TTS.</p>

</article>

<article class="rd-page" id="alternatives" data-part="Toward production" data-draw="alternatives" markdown>

<p class="rd-crumb"><b>Production 10</b> Found by us. Other serving routes, with their own numbers.</p>

## How else could you serve a model like this?

1. **vLLM-Omni.** Official route for Qwen3-TTS: two stages, OpenAI-style HTTP and WebSocket APIs (Qwen3-TTS README; vLLM-Omni docs).
2. **Its reported first audio grows with load.** Mean 70.6 ms at 1 request, 451 at 16, 1,128 at 64, on two H20s (vLLM-Omni blog).
3. **nanovllm-voxcpm, for VoxCPM2.** TTFB p50 36 → 158 ms from 1 to 64 requests on an RTX 4090 (nanovllm-voxcpm README).
4. **Triton + TensorRT-LLM, for CosyVoice2.** First chunk 220 → 1,107 ms from 1 to 4 requests on an L20 (CosyVoice runtime README).
5. 🧠 **Different hardware, models and metrics.** The pattern still holds: general engines degrade faster under load than this specialised one.

<p class="rd-cap">Vendor or project numbers from the cited READMEs and blog (found by us); not comparable as a ranking.</p>

<p class="rd-take"><b>General engines give APIs and breadth; this one gives tail latency.</b> Next: your Indic dubbing case.</p>

</article>

<article class="rd-page" id="indic-fit" data-part="Toward production" data-draw="indic-fit" markdown>

<p class="rd-crumb"><b>Production 11</b> Links this lesson to your VoxCPM2 lesson (dubbing goal).</p>

## Could this engine serve your Indic dubbing TTS?

1. **Not with Qwen3-TTS.** Ten languages, no Indian one (§README Limitations).
2. **VoxCPM2 runs a different loop.** 6.25 patches a second, each with 10 diffusion steps, instead of 12.5 frames with 15 code steps.
3. **The ideas still transfer.** Seats and paged caches, one graph per step, cached decoder state, voice-prefix reuse.
4. **VoxCPM2's codec is causal too.** Its AudioVAE streams with a stateful decoder, the same idea as page 27.
5. 🧠 **Dubbing is batch work.** Offline dubbing cares about throughput and RTF more than a 100 ms TTFA.

<p class="rd-cap">Qwen3-TTS facts from the README; VoxCPM2 facts from its report and code (see the VoxCPM2 lesson). The mapping is our take.</p>

<p class="rd-take"><b>Borrow the design, not the engine.</b> Next: the tricks worth carrying anywhere.</p>

</article>

<article class="rd-page" id="reuse" data-part="Toward production" data-draw="reuse" markdown>

<p class="rd-crumb"><b>Production 12</b> 🧠 A checklist distilled from the engine chapter.</p>

## Which tricks carry over to any autoregressive TTS?

1. **Profile first: is it launch-bound?** A flat time across batch sizes says yes (page 5).
2. **Graph the whole step, sampling included.** Register the RNG (page 23, page 25).
3. **Make the codec stateful.** Carry every layer's history; never re-decode windows (page 27).
4. **Keep arrivals off the step thread.** Cache shared prompt prefixes (page 34).
5. **Test open-loop; quote p99; gate quality.** Compare quality with the stock model's seed spread (page 3, page 46).

<p class="rd-cap">Our summary; each item points to the page with the evidence.</p>

<p class="rd-take"><b>Five habits turned 0.4 streams into 576.</b> Your move next.</p>

</article>

<article class="rd-page" id="code-map" data-part="Your move" data-draw="code-map" markdown>

<p class="rd-crumb"><b>Move 1</b> 💻 The engine chapter, in the repo at commit ebbbd00.</p>

## Where is each part in the code?

1. 💻 **engine.py: the loop.** Q3Engine with add_request, step, pop_events; 372 lines.
2. 💻 **talker.py: seats and the frame graph.** Paged cache, sampling, capture; 196 lines.
3. 💻 **code_predictor.py and arrivals.py.** The 15-step predictor; graphed admission and the fast lane.
4. 💻 **decoder_stream.py: the exact streaming codec.** Per-seat state, ring cache, voice snapshots; 414 lines.
5. 💻 **bench_open.py, eval/, scripts/.** Open-loop load test, quality gate, reproduction scripts.

<p class="rd-cap">Line counts from the repo at ebbbd00 (about 2,700 lines in all). Read by us; not built or run.</p>

<p class="rd-take"><b>Small enough to read in an afternoon.</b> Next: what a call looks like.</p>

</article>

<article class="rd-page" id="run-it" data-part="Your move" data-draw="run-it" markdown>

<p class="rd-crumb"><b>Move 2</b> 💻 The README's commands. Not run by us.</p>

## What does running it look like?

1. 💻 **One request to a wav.** infer.py --text "…" --out out.wav (§README Run one request).
2. 💻 **Your own voice.** Add --ref-wav and --ref-text; this path uses the slow prefill and is untested (§README).
3. 💻 **A load sweep.** scripts/run_load.sh 0.6B (§README Load test).
4. 💻 **The numbers to quote.** scripts/run_validate.sh 0.6B 576 (§README Load test).
5. **Needs an A100-80GB.** About 7.4 GB of weights; most of the card at full seats (§README Setup).

<p class="rd-cap">Commands from the README at ebbbd00. We did not run them; your 6 GB GPU is far too small for the validated setup.</p>

<p class="rd-take"><b>Three scripts reproduce the whole story, given the hardware.</b> Next: a reviewer's questions.</p>

</article>

<article class="rd-page" id="reviewer" data-part="Your move" data-draw="reviewer" markdown>

<p class="rd-crumb"><b>Move 3</b> Questions specific to this repo. Found by us.</p>

## What would a careful reviewer question?

1. **The evidence isn't in the repo.** results/*.json, the tests and several scripts the README lists are missing.
2. **README and code disagree on the fast lane.** "Not wired in", yet engine.py has a first_lane option.
3. **Languages beyond three may fail.** Only English, Spanish and German prefixes are registered (§code engine.py:74).
4. **One voice, one request shape.** Load tests use 25 s English requests only (§README Limitations).
5. **Dead and machine-specific code.** cp_attn.py is never imported; two scripts hard-code the author's home path.
6. 🧠 **Steelman: unusually honest.** Pitfalls, failures and open items are documented with numbers.

<p class="rd-cap">Each point checked by us in the repo at ebbbd00 (read, not run).</p>

<p class="rd-take"><b>Strong engineering, thin packaging.</b> Next: the verdict.</p>

</article>

<article class="rd-page" id="verdict" data-part="Your move" data-draw="verdict" data-fast markdown>

<p class="rd-crumb"><b>Move 4</b> The verdict for your goal: learn deployment, and plan serving for your dubbing TTS.</p>

## Should you learn from it, deploy it, or both?

1. **Learn from it: yes.** Every serving idea is here, measured: graphs, seats, stateful codec, prefix reuse.
2. **Deploy as is: no.** No front end, one voice, no licence (page 48).
3. **Copy the method: yes.** Profile, graph the whole step, make the codec stateful, test open-loop (page 59).
4. **For Indic dubbing: borrow the design.** Qwen3-TTS has no Indian language (page 58).
5. 🧠 **Ask for a licence before reusing.** Without one, the default is all rights reserved.

<p class="rd-cap">Our verdict, built on the README's numbers and our reading of the code.</p>

<p class="rd-take"><b>The best lesson in TTS serving we have read; not a product yet.</b> Next: what to try.</p>

</article>

<article class="rd-page" id="try-next" data-part="Your move" data-draw="try-next" markdown>

<p class="rd-crumb"><b>Move 5</b> 🧠 Projects, ordered by what they teach you.</p>

## What could you try next?

1. 🧠 **Profile your own TTS for launch overhead.** Time batch 1 against 16; a flat line means overhead.
2. 🧠 **Graph one VoxCPM2 step.** TSLM, RALM and ten Euler steps of the LocDiT in one replay.
3. 🧠 **Make the AudioVAE decoder stateful.** Compare SNR against a one-shot decode, as this repo does.
4. 🧠 **Write an open-loop harness.** Poisson arrivals, TTFA and RTF percentiles, for any engine.
5. 🧠 **Put a WebSocket in front.** One engine thread, queues, per-request sockets (page 50).

<p class="rd-cap">Our proposals. Placement on the map is our guess at effort and payoff.</p>

<p class="rd-take"><b>Start with the profiler; it tells you which trick matters.</b> Then check yourself.</p>

</article>

<article class="rd-page" id="check-launch" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 1</b> From page 5.</p>

## Upstream takes 178 ms per frame at batch 1 and 194 ms at batch 64. What does that tell you?

- [ ] The GPU is out of compute
- [x] The time is overhead (Python and launches), not arithmetic
- [ ] The key/value cache is too large
- [ ] Batch 64 is badly implemented

<p class="rd-take"><b>Flat time across batch sizes means overhead.</b> 64× the work cost 9% more time, so the arithmetic was never the bottleneck (§README Results).</p>

</article>

<article class="rd-page" id="check-offered" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 2</b> From page 2.</p>

## At 576 offered streams and RTF 0.58, about how many streams are inside the engine at once?

- [ ] 576
- [x] About 335
- [ ] About 990
- [ ] 704, every seat

<p class="rd-take"><b>Live ≈ offered × RTF.</b> 576 × 0.58 ≈ 335, because an unpaced engine finishes each request faster than it plays (§README Terms).</p>

</article>

<article class="rd-page" id="check-decoder" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 3</b> From page 27 and page 28.</p>

## Why does re-decoding a 72-frame window not give exact audio?

- [ ] Because the decoder looks ahead
- [ ] Because bf16 rounding adds noise
- [x] Because 8 stacked 72-frame windows reach far further back than 72 frames
- [ ] Because the window should be 25 frames

<p class="rd-take"><b>Receptive fields compound across layers.</b> Each of 8 layers sees 72 frames, so history reaches about 568 frames; only carried state is exact (§code decoder_stream.py header).</p>

</article>

<article class="rd-page" id="check-rng" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 4</b> From page 25 and page 56.</p>

## Sampling inside a CUDA graph returns the same codes every frame. What is the likely cause?

- [ ] Temperature is set to 0
- [x] The random generator's state is not advanced by the graph replay
- [ ] Top-k is too small
- [ ] The repetition penalty is too strong

<p class="rd-take"><b>The generator must be registered with the graph.</b> Without it every replay reuses the captured state (§README Pitfalls 1); check this again after any PyTorch upgrade.</p>

</article>

<article class="rd-page" id="check-ttfa" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 5</b> From page 33 and page 36.</p>

## Which change cut median first-audio time from 74 to 42 ms?

- [ ] A faster attention kernel
- [ ] Smaller decoder chunks
- [x] Moving prompt prefill off the engine thread with a cached voice prefix and graphs
- [ ] More seats

<p class="rd-take"><b>Admission stopped blocking the engine.</b> Prefill blocked time fell from 29.9 to 0.2 ms (§README Results).</p>

</article>

<article class="rd-page" id="check-flaw" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 6</b> Spot the flaw. From page 47.</p>

## "The engine beats Qwen's own serving by 3×." What is wrong with that claim?

- [ ] Nothing; 98 ms beats 299 ms
- [ ] Qwen measured a bigger model
- [x] Hardware, packet size, metric and engine all differ, so it isn't a like-for-like comparison
- [ ] The engine's numbers are from 90 s windows

<p class="rd-take"><b>Different setups, not a race.</b> Qwen's hardware isn't stated, its packet is 4 frames and it reports 1–6 concurrent requests with no percentiles (Table 2 Q3).</p>

</article>
