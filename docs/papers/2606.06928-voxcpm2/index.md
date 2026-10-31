---
title: "VoxCPM2"
paper_title: "VoxCPM2 Technical Report"
authors: ["Yixuan Zhou", "Guoyang Zeng", "Xin Liu", "Xiang Li", "Renjie Yu", "Jiancheng Gui", "Jiaheng Wu", "Ziyang Wang", "Xudong Shen", "Runchuan Ye", "Zhisheng Zhang", "Jiuyang Zhou", "Bingsong Bai", "Weiyue Sun", "Mengyuan Deng", "Qundong Shi", "Zhiyong Wu", "Zhiyuan Liu"]
year: 2026
venue: "arXiv preprint (v1, June 2026)"
arxiv_id: "2606.06928"
arxiv_version: v1
paper_type: method
code: {url: "https://github.com/OpenBMB/VoxCPM", license: "Apache-2.0", note: "Inference and fine-tuning code read at commit cce58a5 (Oct 2026); not run. V1 pointers refer to the VoxCPM paper, arXiv:2509.24650"}
model: {url: "https://huggingface.co/openbmb/VoxCPM2", license: "Apache-2.0", note: "Card, config and tokenizer read at revision 32279ef; weights not downloaded or run"}
hook: "One open 2B model clones a voice, designs one from a sentence and speaks 30 languages at 48 kHz. Could it dub an angry English line into Telugu, in a voice you are allowed to use?"
big_idea: "VoxCPM2 generates speech one 160 ms patch of continuous VAE latents at a time: a pretrained LLM plans an FSQ-rounded skeleton, a residual LM adds acoustic detail, and a small diffusion transformer draws the patch; five tasks share one model by rearranging the same input blocks."
goal: "Build the TTS stage of a dubbing pipeline: expressive speech into and out of Indian languages that keeps the source line's emotion, in a consented voice."
difficulty: 4
difficulty_note: "Home turf: TTS, codecs, zero-shot cloning. New: flow matching, FSQ, diffusion-autoregressive hybrids, and a long applied chapter on adding Indian languages and on dubbing, built from 30+ papers and datasets found by us."
date_added: 2026-10-31
tags: [Speech, TTS, Multilingual, Generative models, Fine-tuning]
description: "One open 2B model clones a voice, designs one from a sentence and speaks 30 languages at 48 kHz. Could it dub an angry English line into Telugu, in a voice you are allowed to use?"
---

<article class="rd-page" id="pipeline" data-part="Your dubbing problem" data-draw="pipeline" data-fast markdown>

<p class="rd-crumb"><b>Problem 1</b> Start here. We follow one line of dialogue through the whole lesson.</p>

## Where does TTS sit in your dubbing pipeline?

1. **Five stages, one line.** An English actor shouts "I told you never to come back here!" in 2.6 seconds. This is our running example.
2. **ASR and MT pass words only.** Recognition writes the English text. Translation gives Hindi: "मैंने कहा था, यहाँ कभी वापस मत आना!" Neither text carries the anger.
3. **TTS has to put the anger back.** It reads the Hindi text and must sound as furious as the actor did. This stage is the lesson's focus.
4. **VC swaps the voice.** You have no consent to reuse the actor's timbre. Voice conversion maps the TTS output onto a voice you may use.
5. 🧠 **VC can undo the TTS work.** A converter that flattens pitch or energy erases emotion too. The dubbing chapter asks whether VoxCPM2 can skip it.

<p class="rd-cap">The pipeline is your plan, not the paper's. The line, its translation and its 2.6 s length are our running example.</p>

<p class="rd-take"><b>The TTS stage gets words in one language and emotion from audio in another.</b> Next: what should cross over, and what must not.</p>

</article>

<article class="rd-page" id="what-crosses" data-part="Your dubbing problem" data-draw="what-crosses" markdown>

<p class="rd-crumb"><b>Problem 2</b> Uses the English line from page 1.</p>

## What should cross from the source line, and what must not?

1. **Emotion and energy must cross.** The actor is furious, loud and tense. The Hindi line should be too.
2. **Emphasis moves with the words.** English stresses "never". In Hindi that word is "कभी", at a different place in the line. Stress must follow the word, not the clock.
3. **Timing must roughly fit.** The mouth moves for 2.6 seconds. Hindi may need more syllables, so rate and pauses must adapt.
4. **Non-verbal sounds should survive.** A sharp breath or a bitter laugh carries meaning without any words.
5. **Timbre and accent must not cross.** They are the actor's identity. Without consent you may copy how they speak, never who they are.

<p class="rd-cap">The checklist is our framing of the dubbing task, not from the paper.</p>

<p class="rd-take"><b>Copy the how, never the who.</b> A TTS that takes "how" and "who" as separate inputs fits this job best.</p>

</article>

<article class="rd-page" id="why-voxcpm2" data-part="Your dubbing problem" data-draw="why-voxcpm2" markdown>

<p class="rd-crumb"><b>Problem 3</b> Uses the checklist from page 2.</p>

## Why look at VoxCPM2 for this job?

1. **One open 2B model, many modes.** It does plain TTS, cloning, voice design from a sentence and style-controlled cloning with one set of weights (§1.2). Weights are Apache 2.0 (§5).
2. **Who and how are separate inputs.** A reference clip says who. A text description says how: "angry, loud, fast" (Table 2).
3. **30 languages at 48 kHz.** Hindi is the only Indian language among them (Table 8).
4. **Two gaps for dubbing.** Emotion comes in only as text or as the cloned clip itself. There is no duration control (§3.4, §3.7).
5. 🧠 **So: learn it, then extend it.** The lesson builds the machine first, then asks what Telugu, Tamil or Bengali would take.

<p class="rd-cap">Facts from §1.2, §3.4, §3.7 and Table 8. The fit and gaps verdict is ours.</p>

<p class="rd-take"><b>VoxCPM2 already splits "who" from "how", but it speaks only one Indian language.</b> The toolbox comes next.</p>

</article>

<article class="rd-page" id="tokens-vs-latents" data-part="Toolbox" data-draw="tokens-vs-latents" data-fast markdown>

<p class="rd-crumb"><b>Toolbox 1</b> Nothing earlier is needed. The two families of large TTS models.</p>

## Why not just predict codec tokens like an LLM?

1. **Tokens make speech an LLM problem.** A codec turns audio into discrete tokens, and an LLM predicts them one by one. VALL-E and CosyVoice work this way (§1.1).
2. **Rounding throws detail away.** Quantization "inevitably discards fine-grained acoustic details" (§1.1). Breathiness and tiny pitch wobbles are the first to go.
3. **So most systems add a second model.** An LLM plans coarse tokens, then a flow-matching decoder restores detail. The two halves train separately (§1.1).
4. **Continuous latents keep the detail.** Predict real-valued VAE frames instead. Nothing is rounded away (§1.1).
5. **But continuous AR models drift.** One model must plan words and paint texture at once. Errors pile up in long or very expressive speech (§1.1).

<p class="rd-cap">The trade-off is from §1.1 and §3.1 V1 (V1 marks the first VoxCPM paper, arXiv:2509.24650). The drawing is a sketch.</p>

<p class="rd-take"><b>Tokens are stable but lossy; continuous latents are rich but drift.</b> VoxCPM's whole design tries to get both.</p>

</article>

<article class="rd-page" id="vae-latent" data-part="Toolbox" data-draw="vae-latent" markdown>

<p class="rd-crumb"><b>Toolbox 2</b> The "continuous latent" from page 4, made concrete.</p>

## What is a speech VAE latent, as numbers?

1. **An encoder squeezes time.** Strided convolutions shrink 16 kHz audio 640 times. Every 40 ms becomes one frame (§3.2).
2. **Each frame is 64 real numbers.** Not a token ID, a vector. Our 2.88 s Hindi line becomes 72 frames (§3.1). [[72 × 64 | frames × numbers for 2.88 s]]
3. **A decoder turns frames back into sound.** It is trained with mel and adversarial losses, like a vocoder (§3.5 V1).
4. **A tiny KL term keeps it smooth.** Its weight is 5e-5, so the latent stays close to a normal autoencoder (§3.5 V1).
5. **The TTS predicts these frames.** It never sees waveforms or mels. Its output quality is capped by the decoder (§4.5).

<p class="rd-cap">Rates and strides are real (§3.2, §3.5 V1). Frame values are drawn at random for illustration.</p>

<p class="rd-take"><b>Speech becomes 25 vectors per second, each 64 numbers.</b> Next: how to generate a vector instead of picking a token.</p>

</article>

<article class="rd-page" id="flow-matching" data-part="Toolbox" data-draw="flow-matching" markdown>

<p class="rd-crumb"><b>Toolbox 3</b> How to sample a continuous frame from page 5.</p>

## How does flow matching turn noise into a frame?

1. **Start from pure noise.** At time 0 the frame is a random Gaussian vector. At time 1 it should be real speech.
2. **Draw a straight line between them.** Training mixes a real frame and noise at a random time \(t\) (Eq. 5 V1).
3. **Learn the velocity along it.** The network sees the mix and predicts which way to move, and how fast (Eq. 5 V1).
4. **Sampling follows the arrows.** Start at noise and take small steps along the predicted velocity. Move the slider to change the step count.
5. **Same idea as F5-TTS.** VoxCPM uses it per patch, not for the whole sentence (§3.3.4 V1).

<p class="rd-cap">The loss is Eq. 5 V1. The two-target toy and its paths are our illustration, computed exactly.</p>

<p class="rd-take"><b>Flow matching learns a direction field from noise to data.</b> Next: how to push that field harder toward the text.</p>

</article>

<article class="rd-page" id="cfg" data-part="Toolbox" data-draw="cfg" markdown>

<p class="rd-crumb"><b>Toolbox 4</b> Uses the velocity from page 6.</p>

## What does classifier-free guidance do?

1. **Train with the condition sometimes missing.** VoxCPM2 hides the language-model condition 10% of the time (§3.5).
2. **Now there are two velocities.** One knows the text and context. One knows only the noisy patch.
3. **Extrapolate past the conditional one.** \(\hat v = v_u + \alpha (v_c - v_u)\). The default is \(\alpha = 2\) (§3.7). Drag the slider.
4. **Too little guidance slurs words.** Without CFG, VoxCPM's English WER was 16.32% (Table 9 V1).
5. **Too much breaks speech again.** At \(\alpha = 5\) WER rose to 12.78%. The sweet spot is 1.5 to 3 (§3.7, Table 9 V1).

<p class="rd-cap">Formula and α range from §3.7; WERs from Table 9 V1. The arrows are illustrative.</p>

<p class="rd-take"><b>Guidance doubles the pull toward the condition, at twice the compute.</b> The machine chapter shows the full curve.</p>

</article>

<article class="rd-page" id="fsq" data-part="Toolbox" data-draw="fsq" markdown>

<p class="rd-crumb"><b>Toolbox 5</b> The quantizer VoxCPM puts inside its LLM. 💻 = the released code at commit cce58a5.</p>

## What does finite scalar quantization do?

1. **Round each number to a few levels.** FSQ snaps every dimension to a fixed grid, with no learned codebook (Eq. 3 V1). Move the slider.
2. 💻 **The code squashes, then rounds.** It computes round(9·tanh(h))/9, so each value lands on one of 19 levels from −1 to 1 (§code scalar_quantization_layer.py:16).
3. **The paper says 9 levels.** "9" is the scale in the config; the grid it makes has 19 points (§3.3.1). Same layer, two ways to count.
4. **Gradients pass straight through.** The backward pass treats rounding as the identity, so the LLM above it still trains (§3.3.2 V1).
5. **512 dims make a vast grid.** \(19^{512}\) is about \(10^{655}\) cells. No softmax could predict that, so VoxCPM never uses FSQ codes as targets (§3.1 V1).

<p class="rd-cap">Dimensions from Table 1; the 19-level grid is read from the code (§code scalar_quantization_layer.py). The input value is yours to move.</p>

<p class="rd-take"><b>FSQ here is a squeeze on hidden states, not a vocabulary.</b> The machine chapter shows why the squeeze steadies speech.</p>

</article>

<article class="rd-page" id="ditar" data-part="Toolbox" data-draw="ditar" markdown>

<p class="rd-crumb"><b>Toolbox 6</b> Combines page 5 and page 6.</p>

## What is a diffusion-autoregressive TTS?

1. **Group frames into patches.** VoxCPM2 packs 4 frames into one patch, 160 ms of audio (§3.1).
2. **An LM steps over patches.** It reads text and all earlier patches, then outputs one hidden vector per new patch.
3. **A small diffusion model draws the patch.** It turns noise into the 4 frames, guided by that vector. DiTAR calls it a **LocDiT** (§2.1).
4. **Local means tiny and fast.** The LocDiT sees only one patch plus the previous one, so each draw is cheap (§3.3.1).
5. **Long-range plan, local detail.** The LM decides what comes next. The diffusion head decides exactly how it sounds.

<p class="rd-cap">Patch size and the DiTAR lineage are real (§2.1, §3.1). The patch values are illustrative.</p>

<p class="rd-take"><b>An LLM plans patch by patch; a local diffusion head paints each patch.</b> VoxCPM adds a hierarchy inside the LLM.</p>

</article>

<article class="rd-page" id="prompt-clone" data-part="Toolbox" data-draw="prompt-clone" markdown>

<p class="rd-crumb"><b>Toolbox 7</b> The last building block: cloning by continuation.</p>

## How does a TTS clone a voice it never trained on?

1. **Give a prompt clip and its transcript.** "Namaste, I am Asha" plus 3 seconds of Asha's voice.
2. **Append the new text.** The model sees text for both, then audio for the first part only.
3. **Ask it to keep going.** An AR model continues the audio. The likeliest continuation is the same voice, room and mood.
4. **That is zero-shot cloning.** No fine-tuning: the voice is in the context, like a few-shot prompt for an LLM (§1.1).
5. 🧠 **For dubbing, this cuts both ways.** It copies emotion well. It also copies timbre, which you have no consent to use.

<p class="rd-cap">Continuation cloning is VoxCPM's original mode (§3.4). Asha and her text are made up.</p>

<p class="rd-take"><b>Continuation copies everything in the prompt, voice included.</b> VoxCPM2 adds a second way to clone (page 30).</p>

</article>

<article class="rd-page" id="machine" data-part="The machine" data-draw="machine" data-fast markdown>

<p class="rd-crumb"><b>Machine 1</b> Uses the toolbox (page 5 to page 9). Our Hindi line enters here.</p>

## What is the whole VoxCPM2 machine?

1. **Text and past audio go in.** The Hindi tokens, plus every 160 ms patch made so far (Eq. 1).
2. **LocEnc squeezes each past patch.** Four latent frames become one vector \(E\) (§3.1).
3. **The TSLM plans; FSQ squeezes the plan.** A MiniCPM-4 LLM reads text and \(E\). FSQ rounds its state into a **skeleton** (Eq. 1).
4. **The RALM adds what rounding lost.** A second LM writes a **residual**: voice, texture, fine prosody (Eq. 1).
5. **The LocDiT draws the next patch.** It is guided by skeleton, residual and the previous patch. A stop head decides when to end (§3.1).
6. **The VAE decoder plays it at 48 kHz.** Each new patch can be decoded at once, so audio streams (§3.7).

<p class="rd-cap">Component names and flow from Eq. 1 and §3.1; the paper's version is Fig. 1. Box widths are not to scale.</p>

<p class="rd-take"><b>An LLM plans a rounded skeleton, a second LM adds detail, a small diffusion model paints 160 ms.</b> Next pages open each box.</p>

</article>

<article class="rd-page" id="shapes" data-part="The machine" data-draw="shapes" markdown>

<p class="rd-crumb"><b>Machine 2</b> Our 2.88 s Hindi line, as numbers. Uses page 5.</p>

## What shape is our Hindi line at each stage?

1. **2.88 s at 16 kHz: 46,080 samples.** The encoder always reads 16 kHz audio (§3.2).
2. **640 times shorter: 72 frames.** The strides are 2·5·8·8 = 640, so 25 frames a second (§3.2).
3. **Four frames per patch: 18 patches.** 6.25 patches a second, each 160 ms (§3.1).
4. **18 steps of the big LLM.** Not 72, and not 46,080. Move the slider to try a longer line.
5. **Out come 138,240 samples at 48 kHz.** The decoder upsamples each frame 1,920 times: 8·6·5·2·2·2 (§3.2).

<p class="rd-cap">Rates and strides are real (§3.1, §3.2). The arithmetic is live; the 2.88 s length is our example.</p>

<p class="rd-take"><b>One LLM step per 160 ms of speech.</b> That low rate is what makes a 2B model fast enough (Table 11).</p>

</article>

<article class="rd-page" id="asym-vae" data-part="The machine" data-draw="asym-vae" markdown>

<p class="rd-crumb"><b>Machine 3</b> Uses the 16 kHz in, 48 kHz out from page 12.</p>

## Why encode at 16 kHz but decode at 48 kHz?

1. **16 kHz audio stops at 8 kHz.** Sibilants and air live higher. 48 kHz audio reaches 24 kHz.
2. **A 48 kHz encoder costs three ways.** Longer sequences, a new latent space per source rate, and old 16 kHz data thrown away (§3.2).
3. **So the encoder stays at 16 kHz.** Every corpus, whatever its native rate, lands in one latent space (§3.2).
4. **The decoder invents the top band.** It learns to paint 8–24 kHz from 0–8 kHz evidence: implicit super-resolution (§3.2).
5. 💻 **The output rate is a dial.** A sample-rate condition layer scales the decoder for the requested rate (§code audio_vae_v2.py:218).

<p class="rd-cap">Design reasons from §3.2; code pointer at commit cce58a5. The band picture is illustrative.</p>

<p class="rd-take"><b>Low-rate in, high-rate out: crisp audio without longer sequences.</b> Table 10 measures what this costs (page 49).</p>

</article>

<article class="rd-page" id="patch-size" data-part="The machine" data-draw="patch-size" markdown>

<p class="rd-crumb"><b>Machine 4</b> Why "four frames" in page 12.</p>

## Why group four frames into one patch?

1. **VoxCPM used patches of 2.** Its LLM ran at 12.5 steps a second (Table 1). Flip the toggle.
2. **VoxCPM1.5 and 2 use 4.** 6.25 steps a second, each covering 160 ms (Table 1).
3. **Half the steps, steadier long speech.** Cheaper inference and better long-form stability, say the authors (§3.3.3).
4. **The context holds minutes.** 8,192 positions at 6.25 Hz is about 22 minutes, before text takes its share (Table 1).
5. 🧠 **The price is a harder local job.** The LocDiT must draw 4 frames at once. It grew from 4 to 12 layers (Table 1).

<p class="rd-cap">Rates and layer counts from Table 1. The 22-minute figure is our arithmetic: 8,192 ÷ 6.25 s.</p>

<p class="rd-take"><b>Bigger patches trade LLM steps for LocDiT work.</b> Next: how a patch enters the LLM.</p>

</article>

<article class="rd-page" id="locenc" data-part="The machine" data-draw="locenc" markdown>

<p class="rd-crumb"><b>Machine 5</b> The first box of page 11.</p>

## How does past audio get back into the LLM?

1. **The LLM must hear what it said.** The TSLM reads audio history, not only text (Eq. 1).
2. **LocEnc reads one patch at a time.** Four frames of 64 numbers, with full attention inside the patch (§3.7).
3. 💻 **A learned CLS token sums it up.** The code prepends a CLS token; its output is the patch vector \(E\) (§code local_encoder.py:24).
4. **12 layers, width 1,024.** Up from 4 layers in VoxCPM (Table 1).
5. **It never looks across patches.** The causal LMs do that. Patch-local means it streams (§3.7).

<p class="rd-cap">Sizes from Table 1; CLS detail from the code at cce58a5. Frame values are illustrative.</p>

<p class="rd-take"><b>Each 160 ms patch becomes one vector the LLM can read.</b> Next: the LLM itself.</p>

</article>

<article class="rd-page" id="tslm" data-part="The machine" data-draw="tslm" markdown>

<p class="rd-crumb"><b>Machine 6</b> Uses the vector \(E\) from page 15.</p>

## What does the Text-Semantic LM read?

1. **It starts life as a text LLM.** MiniCPM-4-1B: 28 layers, width 2,048, with rotary positions (Table 1, §3.3.1).
2. **Each position holds text or audio.** A binary flag picks the embedding: a token, or a patch vector \(E\) (§3.4).
3. **Raw text, no phonemes.** BPE tokens go in; the pretrained LLM works out pronunciation (§3.3.1 V1). 💻 No G2P exists in the code.
4. **Chinese is split into characters.** Multi-character Chinese tokens are broken up to fight sparsity (§3.3.1 V1; §code utils.py:40).
5. 🧠 **This is the Indic pressure point.** Telugu reaches the model only through MiniCPM's tokenizer. The Indic chapter counts what it sees (page 52).

<p class="rd-cap">Facts from Table 1, §3.4 and V1 §3.3.1; code at cce58a5. The token chips are illustrative.</p>

<p class="rd-take"><b>One LLM reads text and audio vectors in a single causal stream.</b> Next: what it does with its output.</p>

</article>

<article class="rd-page" id="fsq-skeleton" data-part="The machine" data-draw="fsq-skeleton" markdown>

<p class="rd-crumb"><b>Machine 7</b> FSQ from page 8, placed inside the machine.</p>

## What does FSQ do to the TSLM's plan?

1. **2,048 numbers per audio position.** That is the TSLM's hidden state (Table 1).
2. 💻 **Down to 512, round, back up.** A linear layer projects to 512 dims, FSQ rounds, another projects back to 2,048 (§code scalar_quantization_layer.py:13).
3. 💻 **Only audio positions are rounded.** Text positions bypass FSQ (§code voxcpm2.py:336).
4. **The rounded state is the skeleton.** Content and intonation, the part that must not drift (§3.3.2 V1).
5. **Skeletons cluster by meaning.** In V1's t-SNE they group by genre: news, poetry, rap (Fig. 3 V1).

<p class="rd-cap">Sizes from Table 1; code at cce58a5; the t-SNE finding is the paper's Fig. 3 V1. Values drawn are illustrative.</p>

<p class="rd-take"><b>The skeleton is a coarse, stable summary of what to say next.</b> Does squeezing help? The next page has numbers.</p>

</article>

<article class="rd-page" id="fsq-ablation" data-part="The machine" data-draw="fsq-ablation" markdown>

<p class="rd-crumb"><b>Machine 8</b> Tests the skeleton from page 17.</p>

## Does the FSQ squeeze actually help?

1. **Same model, different squeeze.** V1 trained small models on Emilia, 200K steps, varying only FSQ width (Table 6 V1).
2. **No squeeze is worst on hard text.** Without FSQ the hard Chinese CER is 24.92% (Table 6 V1).
3. **Too tight hurts too.** With 4 dims, English WER is 5.18% (Table 6 V1). Flip the toggle.
4. **The middle wins.** 16 to 256 dims balance best; V1 chose 256, V2 widened it to 512 (Table 6 V1, §3.3.1).
5. 🧠 **A noisy curve from single runs.** 16 dims beat 256 on hard CER. Read it as "some squeeze helps", not an exact optimum.

<p class="rd-cap">All numbers from Table 6 V1 (Emilia, 200K steps). Bars are in the table's order.</p>

<p class="rd-take"><b>Without the squeeze, hard sentences fall apart.</b> Next: how the detail lost to rounding comes back.</p>

</article>

<article class="rd-page" id="ralm" data-part="The machine" data-draw="ralm" markdown>

<p class="rd-crumb"><b>Machine 9</b> Recovers what page 17 rounded away.</p>

## What does the residual acoustic LM add?

1. **Rounding removed detail.** Speaker identity, spectral texture and micro-prosody mostly miss the skeleton (§3.3.3 V1).
2. **RALM reads three things.** The TSLM's text states, the skeletons so far, and the unrounded patch vectors \(E\) (Eq. 1).
3. **It outputs the residual.** One vector per patch carrying what the skeleton lacks (§3.3.3 V1).
4. **8 layers, width 2,048, no positions.** Removing RoPE (**NoPE**) helps long utterances, the authors argue (§3.3.1, Table 1).
5. **The split shows up in t-SNE.** Residuals cluster by speaker; skeletons cluster by content (Fig. 2 V1).

<p class="rd-cap">Facts from Eq. 1, §3.3.1, Table 1 and V1 §3.3.3, Fig. 2. The drawing is a sketch.</p>

<p class="rd-take"><b>The skeleton says what and roughly how; the residual says who and exactly how.</b> Next: what breaks without it.</p>

</article>

<article class="rd-page" id="ralm-ablation" data-part="The machine" data-draw="ralm-ablation" markdown>

<p class="rd-crumb"><b>Machine 10</b> Tests the residual from page 19.</p>

## What breaks without the residual path?

1. **Remove the RALM: hard CER 18.19 → 25.00.** The TSLM feeds the LocDiT directly, like DiTAR (Table 7 V1).
2. **A deeper TSLM doesn't fix it.** 30 layers instead of 24: 30.40% (Table 7 V1).
3. **RALM needs raw audio history.** Without \(E\) it reaches 27.17% (Table 7 V1).
4. **Without the residual, voices blur.** English similarity drops from 62.6 to 58.3 (Table 7 V1). Flip the toggle.
5. 🧠 **Emotion detail rides with voice.** Micro-prosody and speaker identity share the residual path (§3.3.3 V1). Copying one tends to copy the other.

<p class="rd-cap">All numbers from Table 7 V1 (Emilia ablations). The last step is our reading of §3.3.3 V1.</p>

<p class="rd-take"><b>The hierarchy beats a flat continuous LM on hard text.</b> The dubbing chapter returns to the who-and-how coupling.</p>

</article>

<article class="rd-page" id="fusion" data-part="The machine" data-draw="fusion" markdown>

<p class="rd-crumb"><b>Machine 11</b> What VoxCPM2 changed in page 19 and page 22.</p>

## What changed in how the paths are joined?

1. **V1 summed before the RALM.** Skeleton plus \(E\), element by element (§3.3.1).
2. **V2 concatenates, then projects.** \(W_{fuse}[h^{FSQ} \| E]\) lets the model learn the mix (Eq. 2). 💻 A 4,096 → 2,048 linear layer (§code voxcpm2.py:236).
3. **V1 summed again before the LocDiT.** Skeleton, residual and time collapsed into one token (§3.3.1).
4. **V2 keeps three separate tokens.** \(\mu_{sem}\), \(\mu_{res}\), \(\mu_t\) enter the LocDiT side by side (§3.3.1).
5. 🧠 **No ablation for either change.** The report gives reasons, not numbers. We can't tell how much each helped.

<p class="rd-cap">Eq. 2 and §3.3.1; code at cce58a5. The "no ablation" note is ours: no table tests these changes.</p>

<p class="rd-take"><b>V2 stops adding signals together and lets layers choose.</b> Next: the LocDiT's input, token by token.</p>

</article>

<article class="rd-page" id="locdit" data-part="The machine" data-draw="locdit" markdown>

<p class="rd-crumb"><b>Machine 12</b> The last box of page 11, using page 6.</p>

## How does the LocDiT draw one patch?

1. **Eleven tokens, full attention.** Three condition tokens, 4 clean frames of the previous patch, 4 noisy frames (§3.3.1).
2. **The previous patch makes it outpainting.** Seeing the last 160 ms keeps the seam smooth (§3.3.4 V1).
3. **It predicts velocity on the noisy four.** Only those positions are read out (§3.3.1).
4. 💻 **Ten Euler steps by default.** Each step moves the 4 frames from noise toward speech (§code core.py:214).
5. **12 layers, width 1,024.** Up from 4 layers in VoxCPM (Table 1).

<p class="rd-cap">Token layout from §3.3.1 and the code (§code local_dit_v2.py:110). Frame values are illustrative.</p>

<p class="rd-take"><b>A tiny bidirectional transformer outpaints 160 ms in ten steps.</b> Next: what the whole stack is trained on.</p>

</article>

<article class="rd-page" id="training-loss" data-part="The machine" data-draw="training-loss" markdown>

<p class="rd-crumb"><b>Machine 13</b> How page 22 and the stop head learn.</p>

## What exactly is VoxCPM2 trained to predict?

1. **Velocity on target patches.** The flow-matching loss of Eq. 5 V1, patch by patch (§3.5).
2. 💻 **Noise at t = 1, speech at t = 0.** The code mixes \((1-t)x + t\,z\) and regresses \(z - x\). Times favour the middle (§code unified_cfm.py:205).
3. **Plus a stop loss.** Cross-entropy on "is this the last patch?" (§3.5, Eq. 6 V1).
4. **Only the target audio counts.** Text, reference and prompt are context, masked out of both losses (§3.4).
5. **The condition is dropped 10% of the time.** That trains the unconditional branch for CFG (§3.5).
6. **No duration, pitch or text loss.** Timing and pronunciation are learned only through the audio loss (§3.5).

<p class="rd-cap">Losses from §3.5 and V1 Eq. 5–6; the time convention and log-normal time sampling are from the code at cce58a5.</p>

<p class="rd-take"><b>Two losses, both on target audio only.</b> Next: how the stop loss decides the line's length.</p>

</article>

<article class="rd-page" id="stop" data-part="The machine" data-draw="stop" markdown>

<p class="rd-crumb"><b>Machine 14</b> The stop loss from page 23, at inference.</p>

## How does it know when the line is over?

1. **No durations are predicted.** VoxCPM2 has no aligner and no length model (§3.1).
2. **A stop head watches every patch.** A small MLP reads the skeleton and votes "go on" or "stop" (§3.1; §code voxcpm2.py:239).
3. **The first "stop" ends the line.** For our Hindi line that should come at patch 18, after 2.88 s.
4. 💻 **Runaway lines get a retry.** If audio passes 6 patches per text token, the code regenerates, up to 3 times (§code core.py:219).
5. 🧠 **You can't ask for 2.6 seconds.** Length emerges on the fly. Dubbing needs workarounds (page 71).

<p class="rd-cap">Mechanism from §3.1 and the code at cce58a5. The stop curve is illustrative.</p>

<p class="rd-take"><b>Length is a running yes/no vote, not a target.</b> That is the biggest gap for lip-synced dubbing.</p>

</article>

<article class="rd-page" id="cfg-curve" data-part="The machine" data-draw="cfg-curve" markdown>

<p class="rd-crumb"><b>Machine 15</b> CFG from page 7, measured.</p>

## How much guidance does VoxCPM want?

1. **No guidance fails.** At \(\alpha = 1\), English WER is 16.32% and hard Chinese CER 56.87% (Table 9 V1).
2. **1.5 fixes most of it.** English WER falls to 1.86% (Table 9 V1).
3. **2 is best on almost every column.** WER 1.85%, similarity 72.9 (Table 9 V1). V2 keeps 2 as its default (§3.7).
4. **3 starts to hurt.** Hard CER climbs to 13.22% (Table 9 V1).
5. **5 collapses.** WER 12.78%, hard CER 48.46% (Table 9 V1).
6. 🧠 **Measured on V1, not V2.** V2 only reports a "practical range" of 1.5 to 3 (§3.7).

<p class="rd-cap">All points from Table 9 V1. Lines join measured points; nothing between them was measured.</p>

<p class="rd-take"><b>Guidance is essential, with a narrow sweet spot near 2.</b> Next: the two sampler tricks on top.</p>

</article>

<article class="rd-page" id="sampler" data-part="The machine" data-draw="sampler" markdown>

<p class="rd-crumb"><b>Machine 16</b> The solver steps from page 22.</p>

## What do sway sampling and CFG-Zero\* change?

1. **Ten steps from noise to speech.** Spaced evenly, each covers a tenth of the way (§code core.py:214).
2. **Sway packs steps near the noise.** Early errors grow the most, so steps crowd there (§3.7). 💻 Coefficient 1.0 (§code unified_cfm.py:67).
3. **CFG-Zero\* skips the first step.** 💻 The first 4% of steps, at least one, output zero velocity (§code unified_cfm.py:96).
4. **It also rescales the unconditional branch.** A projection factor fits it to the conditional one before mixing (§3.7; §code unified_cfm.py:78).
5. **No new parameters.** Both are inference-only and on by default (§3.7).

<p class="rd-cap">Step positions are computed from the code's sway formula at cce58a5. Methods from F5-TTS and CFG-Zero\* (§3.7).</p>

<p class="rd-take"><b>Same network, better-spent steps.</b> Next: how it runs live.</p>

</article>

<article class="rd-page" id="streaming" data-part="The machine" data-draw="streaming" markdown>

<p class="rd-crumb"><b>Machine 17</b> Runs page 11 in real time.</p>

## How does it stream, and how fast is it?

1. **Causal LMs never look ahead.** Patch \(i\) depends only on text and earlier patches (§3.7).
2. **Each patch is decoded at once.** A stateful causal decoder turns 160 ms of latents into audio (§3.7).
3. **RTF 0.30 in plain PyTorch.** On one RTX 4090, using about 8 GB of VRAM (Table 11). Flip the toggle.
4. **RTF 0.13 with Nano-vLLM.** Our 2.88 s line takes about 0.37 s to make (Table 11).
5. **First-audio latency is not reported.** Only RTF; the README points to its own benchmarks (§4.6).

<p class="rd-cap">RTF and VRAM from Table 11 (RTX 4090). Generation times are our arithmetic: RTF × 2.88 s.</p>

<p class="rd-take"><b>Faster than real time on one consumer GPU.</b> A dubbing batch job has room for retries.</p>

</article>

<article class="rd-page" id="sizes" data-part="The machine" data-draw="sizes" markdown>

<p class="rd-crumb"><b>Machine 18</b> Every box from page 11, across three releases.</p>

## How big is each part, and what grew?

1. **0.6B → 0.8B → 2B parameters.** VoxCPM, VoxCPM1.5, VoxCPM2 (Table 1). Flip the toggle.
2. **The TSLM doubled in width.** MiniCPM-4-0.5B (1,024 wide) became MiniCPM-4-1B (2,048 wide, 28 layers) (Table 1).
3. **LocEnc and LocDiT tripled in depth.** 4 layers each became 12 (Table 1).
4. **FSQ doubled to 512 dims.** For more languages and capacity (§3.3.1).
5. **Context doubled to 8,192.** Three-minute training clips fit in stage 2 (Table 1, §3.5).

<p class="rd-cap">All sizes from Table 1. Box widths scale with hidden size and heights with layer count.</p>

<p class="rd-take"><b>Most new capacity went into the planner and the local models.</b> Next chapter: one model, five jobs.</p>

</article>

<article class="rd-page" id="five-layouts" data-part="Five modes" data-draw="five-layouts" markdown>

<p class="rd-crumb"><b>Modes 1</b> Uses the two-track stream from page 16.</p>

## How can one model do five different jobs?

1. **Three building blocks.** Text (maybe with a description in front), a reference clip, and the target audio to generate (§3.4).
2. **Plain TTS: text, then audio.** Nothing else in the context (Table 2). Flip the toggle through the modes.
3. **Voice design: a description before the text.** "(A gruff middle-aged man, furious)" then the line (Table 2).
4. **Cloning puts a reference clip first.** Fenced by REF_START and REF_END, with no transcript needed (Table 2).
5. **Continuation adds prompt text and audio.** The model just keeps talking (Table 2).
6. **Same weights, same loss, same sampler.** Only the arrangement changes (§3.4).

<p class="rd-cap">Layouts from Table 2. 💻 In code the order is [REF_START, ref, REF_END, text, AUDIO_START, audio, AUDIO_END] (§code packers.py:329).</p>

<p class="rd-take"><b>The task is whatever the context implies.</b> Next: the new reference slot, which matters most for dubbing.</p>

</article>

<article class="rd-page" id="ref-pathway" data-part="Five modes" data-draw="ref-pathway" markdown>

<p class="rd-crumb"><b>Modes 2</b> The new block from page 29, compared with page 10.</p>

## What is the new reference-audio pathway?

1. **A fenced clip at the very start.** The reference is VAE-encoded into patches and placed between REF_START and REF_END (§3.3.2).
2. **No transcript needed.** Continuation needs the prompt's exact words; the reference slot does not (§3.3.2).
3. **Everything after can attend to it.** Causal LMs see it from every later position (§3.3.2).
4. **It is never a target.** The reference sits outside the loss, purely as context (§3.3.2).
5. **Not glued to the target in time.** So it lends identity without forcing its rhythm onto the line (§3.3.2, §4.2).
6. 🧠 **For dubbing: a consented voice goes here.** Who comes from this slot. How can come from text.

<p class="rd-cap">Mechanism from §3.3.2. 💻 The fence tokens are IDs 103 and 104 (§code voxcpm2.py:189). The last step is our use case.</p>

<p class="rd-take"><b>The reference slot carries who without dictating timing.</b> Next: does it clone as well as continuation?</p>

</article>

<article class="rd-page" id="recipes" data-part="Five modes" data-draw="recipes" markdown>

<p class="rd-crumb"><b>Modes 3</b> Compares page 10 with page 30.</p>

## Which cloning recipe works best?

1. **Three ways to use one clip.** As a continuation prompt, as a reference, or both (§4.2).
2. **Both together clone best.** English similarity 79.5 versus 77.7 and 75.3 (Table 4). Flip the toggle.
3. **Reference only is clearest on hard text.** Hard Chinese CER 6.85% versus 8.16% for continuation (Table 4).
4. **Why: no rhythm to copy.** Without an audio prefix the model picks its own prosody for tricky content (§4.2).
5. 🧠 **For dubbing, free rhythm may win.** With your consented actor's clip, reference only lets the angry line find its own rhythm. It costs 4 to 8 SIM points (Table 4).

<p class="rd-cap">Numbers from Table 4 (Seed-TTS-Eval). The dubbing reading is ours.</p>

<p class="rd-take"><b>Reference plus continuation clones best; reference alone keeps text clearest.</b> Next: making a voice from words alone.</p>

</article>

<article class="rd-page" id="voice-design" data-part="Five modes" data-draw="voice-design" markdown>

<p class="rd-crumb"><b>Modes 4</b> The description block from page 29.</p>

## How does a sentence become a voice?

1. **The description is just text.** It is concatenated before the line and read by the same TSLM (§3.4).
2. 💻 **Parentheses mark it by convention.** "(A young woman, gentle and sweet voice)Hello…" No code parses them (§code README.md:147).
3. **No style encoder, no adapter.** The LLM learned to map words like "husky" to sound during training (§2.2, §3.6).
4. **Attributes it was taught.** Age, gender, accent, texture, scenario; plus emotion, rate, pitch, energy, emphasis (§3.6).
5. **Runs vary.** The README suggests generating 1 to 3 times (§code README Risks).

<p class="rd-cap">Facts from §3.4, §3.6 and the README at cce58a5. The example descriptions are made up.</p>

<p class="rd-take"><b>Voice design is prompting: description in, voice out.</b> Next: mixing a description with a real voice.</p>

</article>

<article class="rd-page" id="controllable" data-part="Five modes" data-draw="controllable" data-fast markdown>

<p class="rd-crumb"><b>Modes 5</b> Combines page 30 and page 32. The dubbing key.</p>

## How does controllable cloning split who from how?

1. **The reference clip says who.** Your consented voice actor, three to thirty seconds (§3.3.2).
2. **The description says how.** "(furious, loud, fast, clipped)" before the Hindi line (Table 2).
3. **Trained with mined pairs.** Reference and target share a speaker but not a sentence (§3.6).
4. **It follows instructions well.** English scores 84.2 / 83.2 / 71.4, the best of the open models listed (Table 9).
5. 🧠 **For dubbing this can replace VC.** Generate straight in the consented voice; the source actor's audio never enters the model.
6. 🧠 **But "how" must fit in words.** A caption says "furious"; it can't carry the exact pitch curve of the original line.

<p class="rd-cap">Facts from §3.3.2, §3.6, Table 2 and Table 9. The dubbing use and its limit are our take.</p>

<p class="rd-take"><b>Who from a clip, how from a sentence.</b> The dubbing chapter builds on this (page 67).</p>

</article>

<article class="rd-page" id="data-mix" data-part="Training and data" data-draw="data-mix" markdown>

<p class="rd-crumb"><b>Data 1</b> What fed the machine. The baseline for any new language.</p>

## What is in the two million hours?

1. **Over 2 million hours in total.** 30 languages and 9 Chinese dialects (§1.2, §3.6).
2. **Chinese and English are most of it.** VoxCPM alone used 1.8M hours of mainly Chinese and English (§3.6; §4.1 V1).
3. **Each other language: 1K to 50K hours.** "Depending on data availability and annotation quality" (§3.6). [[1K–50K h | per non-zh/en language]]
4. **Per-language hours are not reported.** So we don't know Hindi's share. 🧠 Its weak Whisper-scored WER hints it is small (Table 6).
5. **Controllable data is far smaller.** Tens of thousands of open hours plus several thousand curated in-house (§3.6).

<p class="rd-cap">Totals and ranges from §3.6. Bar lengths for the 28 languages are a range, not per-language data.</p>

<p class="rd-take"><b>Every supported language had at least about 1,000 hours.</b> Keep that floor in mind for Telugu.</p>

</article>

<article class="rd-page" id="data-pipeline" data-part="Training and data" data-draw="data-pipeline" markdown>

<p class="rd-crumb"><b>Data 2</b> How raw audio became the hours in page 34.</p>

## How does raw audio become training pairs?

1. **Separate the voice from music.** Source separation strips background (§3.6).
2. **Cut at silences.** Voice activity detection splits long recordings into utterances (§3.6).
3. **Transcribe with ASR.** Text and audio are aligned by recognition, not by hand (§3.6).
4. **Filter on quality.** Low-quality clips are dropped. Thresholds are not reported (§3.6).
5. 🧠 **For Indic, ASR is the bottleneck.** Your transcripts are only as good as your Telugu ASR. Errors become pronunciations the model learns.

<p class="rd-cap">Steps from §3.6 (and §4.1 V1). Tools and thresholds are not named in the report.</p>

<p class="rd-take"><b>A standard pipeline: separate, segment, transcribe, filter.</b> Next: how the data was fed in stages.</p>

</article>

<article class="rd-page" id="curriculum" data-part="Training and data" data-draw="curriculum" markdown>

<p class="rd-crumb"><b>Data 3</b> The schedule over the data in page 34.</p>

## Why train in three stages?

1. **Stage 1: plain multilingual TTS.** Text–audio pairs only, clips up to 60 s, context 4,096 (§3.5).
2. **Stage 2: add control gradually.** Descriptions and reference triplets join at a rising ratio; context 8,192, clips up to 3 min (§3.5).
3. **Stages 1 and 2 use most compute.** Step counts and GPU hours are not reported (§3.5).
4. **Stage 3: a high-quality anneal.** Curated expressive data, more controllable samples, balanced languages, clips 2 s to 5 min (§3.5).
5. **The loss never changes.** Only the data mix, ratios and context length move (§3.5).
6. 🧠 **A recipe you can copy.** Teach Telugu to speak first, then to act.

<p class="rd-cap">Stages from §3.5. Bar heights for the control share are illustrative; ratios are not reported.</p>

<p class="rd-take"><b>Pronunciation first, control second, polish last.</b> Next: where the expressive data comes from.</p>

</article>

<article class="rd-page" id="expressive-select" data-part="Training and data" data-draw="expressive-select" markdown>

<p class="rd-crumb"><b>Data 4</b> Feeds stage 2 of page 36.</p>

## How do they find expressive audio worth labelling?

1. **Public style corpora are often flat.** Acoustically bland utterances cap how controllable a model can get (§3.6).
2. **Collect diverse scenarios first.** Speech from many expressive situations (§3.6).
3. **Pre-screen with emotion classifiers.** Lightweight classifiers score unlabelled audio (§3.6).
4. **Keep only the expressive ones.** Only "sufficiently expressive" samples go on to annotation. The threshold is not given (§3.6).
5. 🧠 **Cheap filter, expensive labels.** Run a classifier over thousands of hours; caption only the top slice.

<p class="rd-cap">Process from §3.6. The score distribution drawn is illustrative.</p>

<p class="rd-take"><b>Filter for expressiveness before paying for labels.</b> Next: who writes the labels.</p>

</article>

<article class="rd-page" id="captions" data-part="Training and data" data-draw="captions" markdown>

<p class="rd-crumb"><b>Data 5</b> Labels the clips kept on page 37.</p>

## Who writes the style descriptions?

1. **Two kinds of attribute.** Voice: age, gender, accent, texture, scenario. Style: emotion, rate, pitch, energy, emphasis (§3.6).
2. **Audio LLMs write free text.** Step-Audio R1 and Gemini 2.5 Pro describe each clip at varying detail (§3.6).
3. **Expert classifiers check them.** Gender, age and emotion are verified by dedicated models (§3.6).
4. **The text is used as is.** Descriptions become prefixes; no embedding module (§3.6).
5. 🧠 **Indic captions need an Indic-capable judge.** The captioner must hear Telugu emotion correctly, not just English.

<p class="rd-cap">Pipeline from §3.6. The sample caption is made up.</p>

<p class="rd-take"><b>Machines write the style labels; classifiers audit them.</b> Next: where cloning references come from.</p>

</article>

<article class="rd-page" id="ref-mining" data-part="Training and data" data-draw="ref-mining" markdown>

<p class="rd-crumb"><b>Data 6</b> Builds the triplets for page 30.</p>

## Where do cloning references come from?

1. **Same recording session.** A reference must share the target's speaker (§3.6).
2. **Speaker similarity above 0.7.** Cosine of speaker embeddings; lower pairs are dropped (§3.6). Move the slider.
3. **Never the clip just before.** The utterance right before the target is excluded (§3.6).
4. **So reference cloning scores lower.** Mined clips differ in fine detail from the target (§3.6).
5. 🧠 **Neighbour exclusion matters for you.** It stops the model from learning "continue the previous sentence's mood".

<p class="rd-cap">Threshold and rules from §3.6. The similarity values drawn are illustrative.</p>

<p class="rd-take"><b>References are mined, not recorded.</b> Next: the trick that teaches style apart from content.</p>

</article>

<article class="rd-page" id="decouple" data-part="Training and data" data-draw="decouple" markdown>

<p class="rd-crumb"><b>Data 7</b> Fixes a flaw in the captions of page 38.</p>

## Why clone a style onto unrelated text?

1. **Style leaks through words.** Cheerful styles come with happy sentences. A model can read mood from the text and ignore the prompt (§3.6).
2. **So re-voice the style on other words.** Clone an annotated clip's voice and style onto an unrelated transcript (§3.6).
3. **Keep the original description.** The pair is now \(\langle\)description, other text, audio\(\rangle\) (§3.6).
4. **It also seeds long-tail languages.** Style learned elsewhere is spoken in languages with little expressive data (§3.6).
5. **Only in stage 2.** Stage 3 uses native recordings only, to avoid synthetic artifacts (§3.6).
6. 🧠 **This is dubbing in miniature.** Angry style, neutral words, different language: exactly your test case.

<p class="rd-cap">Method from §3.6. The example sentences are made up.</p>

<p class="rd-take"><b>Self-synthesis breaks the link between mood and words.</b> It is also the cheapest way to make expressive Indic data.</p>

</article>

<article class="rd-page" id="wsd" data-part="Training and data" data-draw="wsd" markdown>

<p class="rd-crumb"><b>Data 8</b> The learning-rate end of page 36, measured in V1.</p>

## Why does the end of training matter so much?

1. **Warmup, stable, decay.** VoxCPM held \(10^{-4}\) for 400K steps, then decayed to \(5 \times 10^{-6}\) for 100K (Table 2 V1).
2. **The decay doubled the batch too.** From 4,096 to 8,192 tokens per batch (Table 2 V1).
3. **Hard Chinese CER: 13.22% → 8.87%.** From the decay phase alone (Table 8 V1). Flip the toggle.
4. **Similarity rose 4.4 points on hard text.** 68.6 → 73.0 (Table 8 V1).
5. **V2 calls it annealing.** Stage 3 applies learning-rate annealing on curated data (§3.5).

<p class="rd-cap">Numbers from Tables 2 and 8 V1 (VoxCPM 0.5B, 40 H100s). V2 does not report its schedule.</p>

<p class="rd-take"><b>A low-rate polish on clean data buys a lot.</b> A fine-tune for Telugu should end the same way.</p>

</article>

<article class="rd-page" id="seed-eval" data-part="Does it work?" data-draw="seed-eval" markdown>

<p class="rd-crumb"><b>Results 1</b> The standard cloning test. Uses WER and SIM, the two numbers every page below reports.</p>

## Does it clone voices as well as the best open models?

1. **Two scores per system.** WER says if the words came out right. SIM is the speaker-embedding cosine with the prompt (§4.1).
2. **English SIM 75.3, among the top.** Only LongCat-Audio-DiT is higher among open models, at 78.6 (Table 3). Flip the toggle.
3. **English WER 1.84% is middling.** Fish Audio S2 reaches 0.99% and Qwen3-TTS 1.23% (Table 3).
4. **Barely changed from VoxCPM.** V1 scored 1.85 / 72.9 at 0.6B (Table 3).
5. 🧠 **Thirty languages, same English quality.** V2 added 29 languages and control without losing its English (Table 3).

<p class="rd-cap">Numbers from Table 3 (Seed-TTS-Eval test-EN); a selection of rows. Recipe: reference + continuation (§4.2).</p>

<p class="rd-take"><b>Strong similarity, average intelligibility in English.</b> Next: the harder in-the-wild test.</p>

</article>

<article class="rd-page" id="cv3" data-part="Does it work?" data-draw="cv3" markdown>

<p class="rd-crumb"><b>Results 2</b> Same metrics as page 42, on harder audio.</p>

## How does it hold up on expressive, in-the-wild prompts?

1. **CV3-Eval uses messy, expressive references.** Nine languages plus hard subsets for Chinese and English (§4.1).
2. **Best on hard Chinese.** CER 8.55%, ahead of Fish Audio S2's 9.10% (Table 5).
3. **Fish S2 wins most other columns.** English 2.43% versus 5.00%; Italian 2.04% versus 4.25% (Table 5). Flip the toggle.
4. **The authors' explanation: scale and RL.** Fish S2 is 4B and adds reinforcement-learning post-training (§4.3, Table 3).
5. 🧠 **Expressive prompts are the dubbing case.** Your source lines are shouted, whispered and noisy. Expect CV3-like errors, not Seed-TTS-like ones.

<p class="rd-cap">WER/CER from Table 5. Only three systems report every column.</p>

<p class="rd-take"><b>On expressive prompts VoxCPM2 trails the 4B RL-tuned Fish S2.</b> Next: 24 languages.</p>

</article>

<article class="rd-page" id="mls-wer" data-part="Does it work?" data-draw="mls-wer" markdown>

<p class="rd-crumb"><b>Results 3</b> Intelligibility across 24 languages, scored by Whisper-large-v3.</p>

## Which languages does it speak clearly?

1. **Many are excellent.** German 0.68%, Turkish 0.82%, Dutch 0.91% WER (Table 6).
2. **Hindi is weak: 19.70%.** ElevenLabs gets 5.83% and MiniMax 6.96% (Table 6). [[19.70% | Hindi WER, Whisper-scored]]
3. **Arabic is weak too: 13.05%.** Both are trained languages with "relatively limited data" (§4.3).
4. **Unseen languages half work.** Czech 24.13% and Romanian 21.58%, never trained (§4.3, Table 6).
5. **Part of the blame is Whisper.** Whisper-large-v3 is weak on Hindi and Arabic, the authors argue (§4.3). The next pages test that.

<p class="rd-cap">WER from Table 6 (MiniMax-MLS-Test, Whisper-large-v3 ASR). Sorted by VoxCPM2's WER.</p>

<p class="rd-take"><b>Hindi, the one Indic language, is among the weakest.</b> Is that the model or the judge?</p>

</article>

<article class="rd-page" id="mls-sim" data-part="Does it work?" data-draw="mls-sim" markdown>

<p class="rd-crumb"><b>Results 4</b> The same 24 languages as page 44, scored for voice.</p>

## Does it keep the voice in every language?

1. **Best similarity in 22 of 24 languages.** Across Latin, Cyrillic, Arabic, Thai and Devanagari scripts (§4.3, Table 7).
2. **Hindi similarity is 85.6.** The best in the table, despite the weak WER (Table 7).
3. **Even unseen Czech keeps the voice.** 78.3, within 1.5 points of the best (Table 7).
4. **The authors credit continuous latents.** No token quantizer stands between the voice and the output (§4.3).
5. 🧠 **For dubbing, high SIM is a warning.** It copies voices very well, including ones you may not copy.

<p class="rd-cap">SIM from Table 7. Bars show VoxCPM2 and the best other system per language.</p>

<p class="rd-take"><b>Voice identity survives in every language; words do not always.</b> Next: a fairer judge for Hindi.</p>

</article>

<article class="rd-page" id="internal30" data-part="Does it work?" data-draw="internal30" markdown>

<p class="rd-crumb"><b>Results 5</b> The authors' own 30-language test, with a different ASR judge.</p>

## How does it do on all 30 trained languages?

1. **500 sentences per language.** References from Common Voice and FLEURS (§4.1).
2. **Gemini 3.1 Flash Lite transcribes.** Whisper was too weak on low-resource languages, the authors say (§4.1).
3. **Average 1.68% across 30 languages.** Under 3% for 28 of them (§4.3, Table 8). Flip the toggle.
4. **Hindi CER: 0.79%.** Fish S2 scores 0.91% on the same set (Table 8).
5. **Fish S2 collapses on three scripts.** Lao 87.40%, Burmese 85.27%, Khmer 75.15%; VoxCPM2 stays near 2% (Table 8).

<p class="rd-cap">From Table 8 (internal set; WER for spaced scripts, CER for others). Not released, so not reproducible.</p>

<p class="rd-take"><b>On the in-house test every trained language is clear.</b> But 0.79 and 19.70 cannot both describe Hindi the same way.</p>

</article>

<article class="rd-page" id="judge" data-part="Does it work?" data-draw="judge" data-fast markdown>

<p class="rd-crumb"><b>Results 6</b> Reconciles page 44 and page 46. Matters for every Indic test you run.</p>

## Is Hindi at 19.70% or 0.79%?

1. **Different metric.** 19.70 is word error rate; 0.79 is character error rate (Tables 6, 8). One wrong letter costs a whole word in WER.
2. **Different judge.** Whisper-large-v3 versus Gemini 3.1 Flash Lite (§4.1).
3. **Different sentences and references.** MiniMax's set versus an unreleased in-house set (§4.1).
4. **Three changes at once.** No table separates them, so the gap can't be split between model and judge.
5. 🧠 **Fix your judge before your model.** For Telugu, use a strong Indic ASR, report CER, and add native listeners.

<p class="rd-cap">Numbers from Tables 6 and 8. The factor split is unknown; the drawing shows the three changes, not their sizes.</p>

<p class="rd-take"><b>An Indic TTS score means little without its ASR and metric.</b> Report both, always.</p>

</article>

<article class="rd-page" id="instruct" data-part="Does it work?" data-draw="instruct" markdown>

<p class="rd-crumb"><b>Results 7</b> Tests page 32 and page 33.</p>

## Does it follow style instructions?

1. **Three levels of abstraction.** APS: "high pitch, slow". DSD: "a nervous whisper". RP: "a pirate captain" (§4.1).
2. **English: best open model on all three.** 84.2 / 83.2 / 71.4 (Table 9). Flip the toggle.
3. **Gemini-TTS-Pro is still ahead.** 87.6 / 86.0 on the first two English tasks (Table 9).
4. **Chinese role-play lags.** RP 60.8 versus MOSS-VoiceGenerator's 74.0 (Table 9).
5. **The authors blame annotation.** Too few high-level persona descriptions in training (§4.4).
6. 🧠 **Dubbing needs the DSD level.** "Furious, voice cracking" is a descriptive directive, its strongest English task.

<p class="rd-cap">Scores from Table 9 (InstructTTSEval). The example prompts are ours.</p>

<p class="rd-take"><b>Strong instruction following in English; weaker on abstract Chinese roles.</b> Next: the codec's ceiling.</p>

</article>

<article class="rd-page" id="vae-recon" data-part="Does it work?" data-draw="vae-recon" markdown>

<p class="rd-crumb"><b>Results 8</b> Measures the asymmetric codec from page 13.</p>

## How much quality does the 16-in, 48-out codec lose?

1. **The codec caps the whole system.** Perfect latents can't sound better than the decoder (§4.5).
2. **V1.5's 44 kHz codec is best full-band.** Mel distance 1.139 versus V2's 1.335 at 48 kHz (Table 10). Flip the toggle.
3. **V1's 16 kHz codec is best in-band.** PESQ 3.940 versus V2's 3.906 (Table 10).
4. **V2 is close to the best on both.** It sees only 16 kHz yet rebuilds 48 kHz (§4.5).
5. 🧠 **No Indic or emotional speech tested.** VCTK and Song Describer only. Check codec round-trips on your Telugu data first.

<p class="rd-cap">Numbers from Table 10 (VCTK). Lower mel distance is better; higher PESQ and STOI are better.</p>

<p class="rd-take"><b>V2's codec trades a little of each extreme for both at once.</b> Next: what listeners say.</p>

</article>

<article class="rd-page" id="mos" data-part="Does it work?" data-draw="mos" markdown>

<p class="rd-crumb"><b>Results 9</b> Human ratings for page 42, page 44 and page 48.</p>

## What do listeners think?

1. **50 listeners, about 100 samples.** Double-blind, 5-point scales (§4.7).
2. **Cloning: top similarity, 4.74.** Naturalness 4.78, just under Qwen3-TTS at 4.80 (Table 12).
3. **Eight languages: top naturalness, 4.78.** Similarity 4.66 trails OmniVoice's 4.72 (Table 13).
4. **Voice design: top instruction score, 4.50.** Qwen3-TTS-VD sounds more natural, 4.61 versus 4.48 (Table 14).
5. 🧠 **The top scores are within error bars.** Most gaps are 0.01–0.05 with ±0.02–0.03 intervals.

<p class="rd-cap">MOS from Tables 12–14 with the reported 95% intervals. No Indic language was rated.</p>

<p class="rd-take"><b>Listeners rate it level with the best open systems.</b> Next chapter: what it would take for Telugu.</p>

</article>

<article class="rd-page" id="indic-status" data-part="Scaling to Indic languages" data-draw="indic-status" markdown>

<p class="rd-crumb"><b>Indic 1</b> Starts the scaling chapter. Uses page 44 and page 34.</p>

## Where does VoxCPM2 stand on Indian languages today?

1. **Hindi is the only one trained.** None of Telugu, Tamil, Kannada, Malayalam, Bengali or Marathi is on the list (Table 8; §code README).
2. **Unseen languages come out half-intelligible.** Czech 24.13% and Romanian 21.58% WER, never trained, though in a familiar script (Table 6).
3. **Unseen Indic would be harder.** Telugu has a script the tokenizer has never seen (page 52).
4. **The maintainers plan more.** Tamil, Telugu and Kannada are "expected around the end of this year or early next year" (§code issue #387).
5. 🧠 **So you can wait or build.** Waiting costs months; building costs data. The rest of this chapter prices the build.

<p class="rd-cap">Facts from Tables 6 and 8 and the VoxCPM GitHub (issue #387, maintainer reply; found by us). Statuses as of October 2026.</p>

<p class="rd-take"><b>One Indian language today, three more promised, none expressive-tested.</b> Next: what the model sees when you type Telugu.</p>

</article>

<article class="rd-page" id="tokenizer" data-part="Scaling to Indic languages" data-draw="tokenizer" data-fast markdown>

<p class="rd-crumb"><b>Indic 2</b> The pressure point from page 16, counted by us in the released tokenizer.</p>

## How does VoxCPM2's tokenizer see Telugu?

1. **73,440 tokens, almost none Indic.** 15 contain a Devanagari character, 4 Bengali, 1 Tamil, 0 Telugu, all single characters (§code tokenizer.json).
2. **Unknown characters fall back to bytes.** Each Telugu character becomes its 3 UTF-8 bytes, each a separate token (§code tokenizer.json, byte_fallback).
3. **Hindi: 18 characters, about 25 tokens.** "नमस्ते आप कैसे हैं". Flip the toggle.
4. **Telugu: 25 characters, about 70 tokens.** "నమస్కారం మీరు ఎలా ఉన్నారు": 66 of them are byte pieces.
5. 🧠 **Hindi already runs mostly on bytes.** Yet it scores 0.79% CER with Gemini as judge (Table 8). Bytes can work, given enough data.

<p class="rd-cap">Vocabulary counts and token estimates are ours, from tokenizer.json at HF rev 32279ef. Estimates assume no merges across byte pieces, as the vocab implies.</p>

<p class="rd-take"><b>To VoxCPM2, Telugu is a stream of unfamiliar bytes, nearly 3 per character.</b> Next: what that costs.</p>

</article>

<article class="rd-page" id="byte-cost" data-part="Scaling to Indic languages" data-draw="byte-cost" markdown>

<p class="rd-crumb"><b>Indic 3</b> Consequences of page 52.</p>

## What does a byte-level script cost the model?

1. **Longer text sequences.** A Telugu line uses nearly 3 times the text positions of its character count, inside the same 8,192 context (Table 1).
2. **Each token means less.** One byte is a third of a letter. The LLM's pretrained knowledge of words doesn't help (§3.3.1 V1).
3. **The model must learn to spell from bytes.** With little data that is slow; Hindi shows it is possible with more.
4. 💻 **The runaway guard loosens.** The retry rule allows 6 patches per text token (§code core.py:221). Triple the tokens and a runaway line can run 3 times longer before a retry.
5. 🧠 **Extra tokens are cheap to add.** A few hundred Telugu characters or aksharas as new embeddings cost almost nothing in a 2B model.

<p class="rd-cap">Mechanics from Table 1 and the code at cce58a5. The size of each effect on quality is not measured anywhere we found.</p>

<p class="rd-take"><b>Bytes work but waste context, slow learning and weaken the length guard.</b> Next: what to feed instead.</p>

</article>

<article class="rd-page" id="frontend" data-part="Scaling to Indic languages" data-draw="frontend" markdown>

<p class="rd-crumb"><b>Indic 4</b> Options for the problem on page 53. Evidence found by us.</p>

## Should you add Telugu tokens, romanize, or use phonemes?

1. **Native characters usually win.** In MMS, letters beat romanized input for all scripts under 200 characters (§7.2 MMS). Indic abugidas have about 60 to 100.
2. **Romanizing hurts a covered script.** In Praxy, ISO-15919 romanization raised Hindi error from 0.204 to 0.334 (Table III Praxy). A 10-sentence pilot.
3. **Extending the vocabulary works for F5-TTS.** IN-F5 added 685 characters across 11 Indic languages (§3 IN-F5).
4. **Phonological features help tiny data.** With 10 minutes per language, features cut CER in 22 of 30 pairs (Table 3 Do et al.).
5. 🧠 **For VoxCPM2: add native characters as new tokens.** It keeps Hindi intact and needs no G2P.

<p class="rd-cap">Found by us: MMS 2305.13516, Praxy 2604.25441, IN-F5 2505.20693, Do et al. 2306.12040. None tested VoxCPM2.</p>

<p class="rd-take"><b>Native-script tokens are the safest bet; romanize only as a stopgap.</b> Next: how many hours.</p>

</article>

<article class="rd-page" id="data-curve" data-part="Scaling to Indic languages" data-draw="data-curve" data-fast markdown>

<p class="rd-crumb"><b>Indic 5</b> The question you asked. Every point below is a measured result, found by us.</p>

## How much data does a new language need?

1. **Under 1 hour: a cliff.** IN-F5 fine-tuned F5-TTS per Indic language: 1 h gave 59.4% WER, 10 h 31.3% (Table 4 IN-F5).
2. **10 to 100 hours: a plateau.** 100 h gave 32.6% WER, no better than 10 h (Table 4 IN-F5). The judge's ASR sets a floor.
3. **About 100 to 250 hours reaches real-speech CER.** OmniVoice's Telugu (230 h) scored 3.77% versus 4.51% for real recordings (Tables 10–11 OmniVoice).
4. **VoxCPM2's own languages had 1,000+ hours.** And its docs ask for 500+ hours to add a language (§3.6; §code docs).
5. 🧠 **Speaker adaptation is the cheap case.** The README's "5–10 minutes" means a voice, not a new language.

<p class="rd-cap">Points from IN-F5 (2505.20693) Table 4 and OmniVoice (2604.00688) Tables 10–11, on different models and judges. Dashed bands are the VoxCPM docs.</p>

<p class="rd-take"><b>Intelligible from about 10 h, near-human from about 200 h, VoxCPM-grade from 500+ h.</b> Next: what exists for Telugu.</p>

</article>

<article class="rd-page" id="indic-data" data-part="Scaling to Indic languages" data-draw="indic-data" markdown>

<p class="rd-crumb"><b>Indic 6</b> Supply for the demand on page 55. Found by us.</p>

## How many public hours exist per Indian language?

1. **Studio corpora: about 190 hours at best.** IndicTTS, SYSPIN and Rasa add to roughly 190 for Telugu, Hindi, Kannada, Bengali and Marathi. Flip the toggle.
2. **Tamil and Malayalam have less.** About 75 studio hours each; SYSPIN skips them.
3. **Restored crowd speech adds more.** IndicVoices-R: 136 h of Telugu, 112 h of Bengali, enhanced from extempore speech (Table 3 IV-R).
4. **Raw ASR audio is far larger.** IndicVoices has 7,348 h across 22 languages, mostly spontaneous (§1 IndicVoices).
5. 🧠 **5 to 25 times below VoxCPM2's floor.** Reaching 1,000 h means mining ASR-scale audio with VoxCPM2's own pipeline.

<p class="rd-cap">Sums are ours from the dataset cards (SYSPIN on AIKosh; Rasa on Hugging Face; IndicTTS ~20 h per language, 2410.14197). IV-R is 2409.05356; IndicVoices is 2403.01926.</p>

<p class="rd-take"><b>Clean public data stops near 200 hours per language.</b> The rest must be mined and filtered.</p>

</article>

<article class="rd-page" id="licences" data-part="Scaling to Indic languages" data-draw="licences" markdown>

<p class="rd-crumb"><b>Indic 7</b> Before you train on page 56 for a product. Found by us; not legal advice.</p>

## Which Indic datasets can a commercial dub use?

1. **SYSPIN: CC BY 4.0.** 900+ studio hours over 9 languages; attribution required (AIKosh card).
2. **Rasa and IndicVoices-R: CC BY 4.0.** Rasa is gated on Hugging Face; one snippet called IV-R "BY-ND", unverified.
3. **IndicTTS: two licences.** CC BY 4.0 on AIKosh, but IIT Madras also asks you to accept its own licence.
4. **MMS-TTS models: non-commercial.** CC BY-NC 4.0 rules them out as teachers or data sources.
5. **VoxCPM2 itself: Apache 2.0.** Code and weights both (§code LICENSE; §5).
6. 🧠 **Voice consent is separate from licence.** CC BY covers the recordings, not cloning the speakers into new lines.

<p class="rd-cap">Licence terms as listed on the dataset cards in October 2026, found by us. Check the current terms yourself.</p>

<p class="rd-take"><b>The main Indic corpora allow commercial training with attribution.</b> Cloning their speakers is a different question.</p>

</article>

<article class="rd-page" id="lora-vs-full" data-part="Scaling to Indic languages" data-draw="lora-vs-full" markdown>

<p class="rd-crumb"><b>Indic 8</b> How to spend the hours from page 56.</p>

## Full fine-tune or LoRA for a new language?

1. 💻 **VoxCPM ships both.** Full: learning rate 1e-5. LoRA: rank 32 on attention in both LMs and the LocDiT, learning rate 1e-4 (§code voxcpm_finetune_lora.yaml).
2. 💻 **Its docs say full for languages.** "Add a new language: 500+ hours, full fine-tuning", and LoRA rank 64 for language or style (§code docs).
3. **On 12.65 h of Korean, adapters won.** LoRA plus a prompt adapter: CER 4.91% versus 5.67% for full fine-tuning (Table 1 Kwon). Flip the toggle.
4. **They also kept unseen speakers.** Similarity 0.641 versus 0.627 (Table 2 Kwon).
5. 💻 **Memory: about 20 GB versus 40 GB.** LoRA versus full, for the 2B model (§code docs).
6. 🧠 **New tokens need trainable embeddings.** Shipped LoRA freezes them; add the new rows to the trainable set.

<p class="rd-cap">Kwon et al., Interspeech 2025 (doi 10.21437/Interspeech.2025-1344), on F5-TTS, found by us. VoxCPM configs at cce58a5.</p>

<p class="rd-take"><b>Small data: LoRA plus new embeddings. Hundreds of hours: full fine-tune.</b> Either way, guard the old languages.</p>

</article>

<article class="rd-page" id="forgetting" data-part="Scaling to Indic languages" data-draw="forgetting" markdown>

<p class="rd-crumb"><b>Indic 9</b> The risk in page 58: losing the other 29 languages.</p>

## How do you add Telugu without breaking Hindi?

1. 💻 **VoxCPM's docs: mix in old data.** Keep 10–20% Chinese and English in new-language fine-tunes (§code docs).
2. **A tiny replay buffer goes far.** In a multilingual Tacotron, 300 old utterances (about 1.3%) cut old-language distortion from 7.04 to 4.02 (Table 1 Yang).
3. **Joint training is the ceiling.** Training all languages together reached 3.59 (Table 1 Yang). Flip the toggle.
4. **Copy VoxCPM2's own recipe.** Stage 3 uses "a balanced language-level sampling ratio" (§3.5).
5. 🧠 **Measure Hindi before and after.** Forgetting is rarely reported; run the 30-language checks yourself.

<p class="rd-cap">Yang et al., arXiv:2110.04482, found by us: mel cepstral distortion, lower is better. VoxCPM docs at cce58a5.</p>

<p class="rd-take"><b>Replay a few percent of old data and check what you keep.</b> Next: which old languages help Telugu most.</p>

</article>

<article class="rd-page" id="donor" data-part="Scaling to Indic languages" data-draw="donor" markdown>

<p class="rd-crumb"><b>Indic 10</b> Which data to replay on page 59. Found by us.</p>

## Which languages help a new one learn?

1. **Pretraining helps more than mixing.** In IN-F5, English then Indic scored 73.4 MUSHRA; English plus Indic mixed 66.2; scratch 43.2 (Table 1 IN-F5).
2. **Pick donors by sounds, not family.** Phone-inventory overlap predicted transfer; language-family distance had the wrong sign (Table 5 Do et al.).
3. **Hindi shares many sounds with Telugu.** Aspirated and retroflex stops are in both. 🧠 Hindi is your best in-model donor.
4. **Zero-shot is possible with a sister script.** IN-F5 got Bhojpuri to 83.9 MUSHRA using a related script and 1 h of self-training (Table 5 IN-F5).
5. 🧠 **Train new Dravidian languages together.** Telugu, Kannada, Tamil and Malayalam share far more with each other than with Hindi.

<p class="rd-cap">IN-F5 (2505.20693), Do et al. (2306.12040), found by us. Phone overlaps are general phonology, not measured here.</p>

<p class="rd-take"><b>Choose donors by shared sounds, and add sister languages as a group.</b> Next: the expressive part.</p>

</article>

<article class="rd-page" id="indic-expressive" data-part="Scaling to Indic languages" data-draw="indic-expressive" markdown>

<p class="rd-crumb"><b>Indic 11</b> VoxCPM2's controllability data pipeline (page 37 to page 40), in Telugu.</p>

## Where would expressive Telugu data come from?

1. **Rasa: emotional studio speech.** Six emotions plus styles, about 52 h of Telugu, CC BY 4.0. The emotional share is not broken down (Rasa card).
2. **RASMALAI: captions already written.** 13,000 h in 23 Indic languages with style descriptions; speaking-rate captions 97.1% accurate (Table 6 RASMALAI).
3. **Screen ASR audio for emotion.** As VoxCPM2 did: classify thousands of hours, keep the expressive slice (§3.6).
4. **Re-voice style onto new words.** VoxCPM2's decoupling trick also seeds long-tail languages (§3.6).
5. 🧠 **Order of work.** Teach Telugu to speak first (stage 1), then add Rasa and RASMALAI captions (stage 2), then anneal on the cleanest.

<p class="rd-cap">Rasa on Hugging Face and RASMALAI (2505.18609), found by us; pipeline from §3.6. The stage plan is ours.</p>

<p class="rd-take"><b>Expressive Indic data exists in tens of hours, captions in thousands.</b> Next: polishing with rewards.</p>

</article>

<article class="rd-page" id="rl-indic" data-part="Scaling to Indic languages" data-draw="rl-indic" markdown>

<p class="rd-crumb"><b>Indic 12</b> A post-training step after page 61. Found by us.</p>

## Can reinforcement learning rescue a low-resource language?

1. **Reward clear speech directly.** Generate, transcribe, reward low CER and high similarity. No new recordings needed.
2. **Portuguese from 30 minutes.** Align2Speak took CER from 33.0% to 3.94% with GRPO (§3.3 Align2Speak). Flip the toggle.
3. **Largest gains where the base is weakest.** CosyVoice 3's reward training: Korean 12.8 → 4.02 CER (Table 5 CosyVoice 3).
4. **RL can't replace data.** Fish S2 used RL and still scores 14.64% WER on Hindi (Table 3 Fish S2).
5. 🧠 **A weak ASR makes a weak reward.** A weak judge teaches the model to please the judge.

<p class="rd-cap">Align2Speak 2509.21718, CosyVoice 3 2505.17589, Fish S2 2603.08823, found by us. VoxCPM2 itself uses no RL (§3.5).</p>

<p class="rd-take"><b>RL turns a few hours into clear speech, if the ASR judge is good.</b> Next: mixed-language lines.</p>

</article>

<article class="rd-page" id="codemix" data-part="Scaling to Indic languages" data-draw="codemix" markdown>

<p class="rd-crumb"><b>Indic 13</b> Real dialogue mixes languages. Found by us.</p>

## How do you handle Hinglish and Tenglish lines?

1. **Movie dialogue code-switches.** "Nuvvu late ga vacchav, bro" mixes Telugu and English in one breath.
2. **Write English words in the native script.** In Praxy, this cut Telugu code-mix error from 0.798 to 0.142 (Table V Praxy).
3. **It worked in a production Hinglish system.** Devanagari English plus Hindi: MOS 4.65 versus 4.36 for Hindi-only training (Table 1 Flipkart).
4. **Or keep both scripts and trust the LLM.** VoxCPM2 reads Latin well and Devanagari through bytes; untested on mixed lines.
5. 🧠 **Normalize in the MT step.** Decide per word: translate, transliterate, or keep. Feed TTS one consistent convention.

<p class="rd-cap">Praxy 2604.25441 (10-utterance pilot), Flipkart 2312.01103, found by us. The example line is made up.</p>

<p class="rd-take"><b>One script per line beats mixed scripts, in the evidence so far.</b> Next: how to measure all this.</p>

</article>

<article class="rd-page" id="indic-eval" data-part="Scaling to Indic languages" data-draw="indic-eval" markdown>

<p class="rd-crumb"><b>Indic 14</b> Lessons from page 47, as a test plan.</p>

## How should you evaluate an Indic dubbing TTS?

1. **CER with a strong Indic ASR.** Report the model and its CER on real recordings of the same sentences (§4.1).
2. **Similarity to the consented voice.** Not to the source actor; that should be low.
3. **Emotion kept from the source.** An emotion classifier on source and dub; 71% is real-speech level in VoicePrivacy's test (Table 9 VPC).
4. **Duration fit.** Dub length over source length per line (page 71).
5. **Native listeners.** Naturalness and emotion MOS; VoxCPM2's MOS tests had no Indic language (§4.7).
6. **Check the old languages.** Rerun Hindi and English after every fine-tune (page 59).

<p class="rd-cap">Metric choices are ours, built on §4.1, §4.7 and VoicePrivacy 2601.11846.</p>

<p class="rd-take"><b>Six numbers per release: CER, SIM, emotion, length, MOS, forgetting.</b> Next: the reverse direction.</p>

</article>

<article class="rd-page" id="indic-out" data-part="Scaling to Indic languages" data-draw="indic-out" markdown>

<p class="rd-crumb"><b>Indic 15</b> Your "in and out": Telugu source, English dub.</p>

## What changes when the Indic line is the source?

1. **The TTS side gets easy.** English output is VoxCPM2's strongest case: 1.84% WER on Seed-TTS-Eval (Table 3).
2. **The hard part moves upstream.** You need Telugu ASR for the transcript and Telugu-aware emotion captions.
3. **The captioner must hear Telugu emotion.** Its descriptions must match VoxCPM2's training style (§3.6).
4. **Consented voices in English are easy.** Same-language reference and text is the tested path (Table 4).
5. 🧠 **Out of Indic works today; into needs training.** Start your product with Indic-to-English and Indic-to-Hindi.

<p class="rd-cap">VoxCPM2 numbers from Tables 3–4; the direction comparison is our take.</p>

<p class="rd-take"><b>Out of Indic is a captioning problem; into Indic is a training problem.</b> Next: the full bill.</p>

</article>

<article class="rd-page" id="data-budget" data-part="Scaling to Indic languages" data-draw="data-budget" markdown>

<p class="rd-crumb"><b>Indic 16</b> 🧠 Puts page 55, page 56 and page 58 together. Our estimate, not a result.</p>

## What would a Telugu plan look like?

1. **Tier 1: about 190 studio hours.** Public data only (page 56). Expect clear speech in studio voices, little emotion. Move the slider.
2. **Tier 2: add about 140 restored hours.** IndicVoices-R brings real speakers and accents (Table 3 IV-R).
3. **Tier 3: mine to 500+ hours.** VoxCPM's docs floor for a new language (§code docs). Separate, VAD, ASR, filter (§3.6).
4. **Then about 50 expressive hours.** Rasa plus emotion-screened clips with captions (stage 2).
5. **Polish: anneal plus a CER reward.** Clean data at low learning rate (page 41), then RL (page 62).
6. 🧠 **Budget: hours, not GPUs, are scarce.** Full fine-tuning needs about 40 GB of GPU memory (§code docs).

<p class="rd-cap">Tier boundaries are our reading of the evidence on earlier pages; outcomes per tier are not measured for VoxCPM2.</p>

<p class="rd-take"><b>Public data gets Telugu speaking; mined data gets it to VoxCPM2's level.</b> Emotion is a smaller, separate budget.</p>

</article>

<article class="rd-page" id="dub-recipes" data-part="Dubbing with VoxCPM2" data-draw="dub-recipes" markdown>

<p class="rd-crumb"><b>Dubbing 1</b> Puts the five modes (page 29) against the checklist on page 2.</p>

## Which VoxCPM2 mode should drive a dub?

1. **Continuation on the source clip.** Copies emotion and timing best, and the actor's voice too. Needs VC after, and cross-lingual prompts are shaky (§4.2).
2. **Source clip in the reference slot.** Copies voice and some style. Still the actor's timbre, so still needs VC (§3.3.2).
3. **Consented reference plus a style caption.** Who from your voice actor, how from words. No VC at all (Table 2).
4. **Voice design plus a style caption.** A synthetic voice from a description. No consent question, but voices vary run to run (§code README Risks).
5. 🧠 **Option 3 fits the brief best.** The source actor's audio never enters the generator; only a description of it does.

<p class="rd-cap">Modes from Table 2 and §4.2. The ranking against the dubbing checklist is our take.</p>

<p class="rd-take"><b>Describe the source's emotion; clone only a consented voice.</b> The next pages fill in the gaps this leaves.</p>

</article>

<article class="rd-page" id="source-caption" data-part="Dubbing with VoxCPM2" data-draw="source-caption" markdown>

<p class="rd-crumb"><b>Dubbing 2</b> Feeds the "how" of option 3 on page 67.</p>

## How do you turn the source line's emotion into words?

1. **Use the same captioners VoxCPM2 trained on.** It learned from descriptions by Step-Audio R1 and Gemini 2.5 Pro (§3.6). Match their style.
2. **Measure, then describe.** Bin pitch, rate and energy from the source; add an emotion label. RASMALAI did this for 23 Indic languages (§3 RASMALAI).
3. **Binned attributes caption well.** RASMALAI's captions matched speaking rate 97.1% and mean pitch 86.2% of the time (Table 6 RASMALAI).
4. **Write it as a prefix.** "(furious, loud, fast, clipped, voice cracking)" before the Hindi text (§code README.md:170).
5. 🧠 **Words are a low-bandwidth channel.** Where the emphasis falls and the pitch contour don't survive a caption.

<p class="rd-cap">VoxCPM2 facts from §3.6; RASMALAI is arXiv:2505.18609, found by us. The caption is made up.</p>

<p class="rd-take"><b>A caption carries the emotion category and rough prosody, not its exact shape.</b> Next: does VC lose more?</p>

</article>

<article class="rd-page" id="vc-loss" data-part="Dubbing with VoxCPM2" data-draw="vc-loss" markdown>

<p class="rd-crumb"><b>Dubbing 3</b> Tests the worry on page 1: does VC erase emotion? Found by us.</p>

## How much emotion survives voice conversion?

1. **A test from speaker anonymization.** The third VoicePrivacy Challenge scored how well an emotion classifier still recognises anonymized speech (Table 9 VPC).
2. **Original speech: 71.1%.** Unweighted accuracy on IEMOCAP (Table 9 VPC).
3. **Plain VC: 36.1%.** About half of the emotion signal is gone. An ASR-then-TTS cascade gets 37.6% (Table 9 VPC). Flip the toggle.
4. **Emotion-aware systems keep most of it.** 61.0% and 64.5% for the best emotion-aware entries (Table 9 VPC).
5. 🧠 **So avoid VC or pick an emotion-aware one.** No study compares "generate in the consented voice" with "TTS then VC" directly.

<p class="rd-cap">Emotion recognition accuracy from Table 9 of arXiv:2601.11846 (found by us). Anonymization is a proxy for dubbing VC, not the same task.</p>

<p class="rd-take"><b>Ordinary VC halves measurable emotion.</b> That favours generating straight in the consented voice.</p>

</article>

<article class="rd-page" id="cross-lingual-ref" data-part="Dubbing with VoxCPM2" data-draw="cross-lingual-ref" markdown>

<p class="rd-crumb"><b>Dubbing 4</b> Checks options 1 and 2 on page 67: an English clip, Hindi words.</p>

## Can an English clip drive Hindi speech?

1. **The report claims cross-lingual synthesis.** Basic TTS supports "multilingual and cross-lingual synthesis" (§1.2).
2. **But no table tests it.** Every cloning benchmark pairs a reference and target in the same language (§4.1).
3. **A user report says it breaks for Hindi.** English reference plus Hindi text gave unintelligible or no audio (§code issue #288, open).
4. 🧠 **Your consented voice may speak English.** Then option 3 is cross-lingual too. Test it before you build on it.
5. 🧠 **A Hindi-speaking voice actor avoids the risk.** Same-language reference and text is the tested path (Table 7).

<p class="rd-cap">Claim from §1.2; issue #288 on the VoxCPM GitHub (found by us, open in October 2026). The cross-lingual risk is our reading.</p>

<p class="rd-take"><b>Cross-lingual cloning is claimed but untested.</b> Record consented references in each target language.</p>

</article>

<article class="rd-page" id="duration" data-part="Dubbing with VoxCPM2" data-draw="duration" markdown>

<p class="rd-crumb"><b>Dubbing 5</b> The gap from page 24: length is not a control.</p>

## How do you hit the lip-sync length?

1. **Our line is 11% too long.** The source took 2.6 s; the Hindi came out 2.88 s. Move the slider.
2. **Fix it in translation.** Ask the MT step for a shorter paraphrase that fits the time; PS-TTS does this with an LLM (§1 PS-TTS).
3. **Ask for speed in the caption.** "(fast)" moves speaking rate, but not to an exact length (§3.6).
4. **Or add a length input.** IndexTTS2 feeds a target token count and hits it within 0.067% (Table 4 IndexTTS2).
5. 🧠 **For VoxCPM2, count patches.** A target-patch-count embedding, dropped 30% of the time like IndexTTS2, would need fine-tuning.
6. **It matters for Hindi.** In DubWise, duration control cut XTTS's Hindi length deviation from 1.46 to 0.93 (Table 1 DubWise).

<p class="rd-cap">IndexTTS2 (arXiv:2506.21619), DubWise (2406.08802), PS-TTS (2604.09111), found by us. Slider arithmetic is ours.</p>

<p class="rd-take"><b>Today: shorten in MT and nudge with "fast". Tomorrow: train a patch-count input.</b> Next: sounds without words.</p>

</article>

<article class="rd-page" id="nonverbal" data-part="Dubbing with VoxCPM2" data-draw="nonverbal" markdown>

<p class="rd-crumb"><b>Dubbing 6</b> The "non-verbal" row of page 2.</p>

## What about laughs, sighs and breaths?

1. **VoxCPM2 reports no non-verbal tags.** Singing is mentioned; laughter tags are not (§4.4, §5).
2. 💻 **Spare special tokens exist, unused.** IDs 105–112 include `<|span|>` and `<|background|>`; no code reads them (§code tokenizer_config.json).
3. **Others use inline tags.** CosyVoice 3 has [laughter] and [breath]; Fish S2 activates its tags 88% of the time in English (Table 7 Fish S2).
4. **Tags can cost clarity.** NVSpeech's tag fine-tune raised CER from 3.13% to 7.5% (Table 4 NVSpeech).
5. **Cascades lose non-verbals most.** STEB rates the best non-verbal preservation 2.31 of 5 (§4 STEB).
6. **Small data can teach them.** MoVE reproduced 76% of non-verbals; LoRA on 30 minutes reached 95% of full-data fidelity (§1 MoVE).

<p class="rd-cap">VoxCPM2 facts from §4.4 and the tokenizer at rev 32279ef. Others found by us: 2603.08823, 2508.04195, 2606.25529, 2604.17435.</p>

<p class="rd-take"><b>Non-verbals are the weakest link and VoxCPM2 has no handle for them yet.</b> A tag fine-tune is a small, high-value project.</p>

</article>

<article class="rd-page" id="dub-frontier" data-part="Dubbing with VoxCPM2" data-draw="dub-frontier" markdown>

<p class="rd-crumb"><b>Dubbing 7</b> Found by us. Context for page 67.</p>

## What does recent research offer for expressive dubbing?

1. **SeamlessExpressive (2023).** Speech-to-speech translation keeping rate and pauses: rate correlation 0.06 → 0.59. Six languages, no Indic (Table 22 Seamless).
2. **DubWise (2024).** Duration-aligned XTTS, tested English → Hindi (Table 1 DubWise).
3. **IndexTTS2 (2025).** Separate emotion prompt and target length in one AR model. Chinese and English (Table 2 IndexTTS2).
4. **MAVFlow (2025).** Face-guided emotion: 36.5% emotion accuracy versus 28.6% for a cascade; real speech 81.95% (Table 2 MAVFlow).
5. **MoVE and STEB (2026).** Non-verbal transfer, and a benchmark showing cascades lose expressivity most (§1 MoVE; §4 STEB).
6. 🧠 **None covers Telugu.** The pieces exist; an Indic expressive dubbing model doesn't yet.

<p class="rd-cap">arXiv IDs: 2312.05187, 2406.08802, 2506.21619, 2503.11026, 2604.17435, 2606.25529, all verified by us.</p>

<p class="rd-take"><b>Even the best systems keep under half the source emotion.</b> Dubbing expressivity is an open problem.</p>

</article>

<article class="rd-page" id="dub-architecture" data-part="Dubbing with VoxCPM2" data-draw="dub-architecture" markdown>

<p class="rd-crumb"><b>Dubbing 8</b> 🧠 Our design sketch, built from page 30, page 40 and page 71.</p>

## What would a VoxCPM2-based dubbing TTS add?

1. 🧠 **Keep the consented reference slot.** Who stays exactly as VoxCPM2 does it (§3.3.2).
2. 🧠 **Add a source-prosody slot.** Encode the source line's pitch, energy and emotion features as a second fenced prefix, like REF_START.
3. 🧠 **Strip identity from that slot.** IndexTTS2 used a gradient-reversal layer against speaker identity on its emotion input (§3 IndexTTS2).
4. 🧠 **Add a patch-count input.** Target length from the source timing (page 71).
5. 🧠 **Train on self-made cross-lingual pairs.** VoxCPM2's decoupling trick re-voices one style onto other words; do it across languages (§3.6).

<p class="rd-cap">A proposal, not a result. Every part extends a mechanism in §3.3.2, §3.6 or IndexTTS2 (arXiv:2506.21619).</p>

<p class="rd-take"><b>Two new prefixes and one length input could turn VoxCPM2 into a dubbing model.</b> All of it needs training data you would have to make.</p>

</article>

<article class="rd-page" id="code-map" data-part="Your move" data-draw="code-map" markdown>

<p class="rd-crumb"><b>Move 1</b> 💻 The machine from page 11, in the repo at commit cce58a5.</p>

## Where is each part in the code?

1. 💻 **One model file.** `model/voxcpm2.py` builds every box: TSLM at line 183, fusion at 236, stop head at 239.
2. 💻 **FSQ is 20 lines.** `layers/scalar_quantization_layer.py`: project, tanh, round, project back.
3. 💻 **The LocDiT and its sampler.** `locdit/local_dit_v2.py` and `locdit/unified_cfm.py`: Euler, sway and CFG-Zero\*.
4. 💻 **The codec.** `audiovae/audio_vae_v2.py`: causal encoder, 48 kHz decoder, streaming cache.
5. 💻 **Training code is included.** `scripts/train_voxcpm_finetune.py` with full and LoRA configs. Pretraining data and recipes are not.

<p class="rd-cap">Paths under src/voxcpm/ in github.com/OpenBMB/VoxCPM at cce58a5 (Apache 2.0). Read by us, not run.</p>

<p class="rd-take"><b>Everything you need to fine-tune is public; the 2M-hour data is not.</b> Next: what a call looks like.</p>

</article>

<article class="rd-page" id="running-it" data-part="Your move" data-draw="running-it" markdown>

<p class="rd-crumb"><b>Move 2</b> 💻 The README's API for the modes on page 29. Not run by us.</p>

## What does a dubbing call look like?

1. 💻 **Load once.** `VoxCPM.from_pretrained("openbmb/VoxCPM2")`, about 8 GB of VRAM (§code core.py:137).
2. 💻 **Style goes in parentheses.** The description starts `text`, then the Hindi line follows (§code README.md:170).
3. 💻 **The consented voice is a path.** `reference_wav_path` fills the reference slot; no transcript needed.
4. 💻 **Defaults match the paper.** `cfg_value=2.0`, `inference_timesteps=10` (§code core.py:213).
5. 💻 **Retries are on.** `retry_badcase=True` regenerates runaway outputs (§code core.py:219).

<p class="rd-cap">API from the README and core.py at cce58a5. The style words and file name are our example; we did not run it.</p>

<p class="rd-take"><b>Option 3 from page 67 is one function call.</b> Next: a fine-tuning run.</p>

</article>

<article class="rd-page" id="finetune-run" data-part="Your move" data-draw="finetune-run" markdown>

<p class="rd-crumb"><b>Move 3</b> 💻 The shipped fine-tune configs, set up for page 66.</p>

## What does a Telugu fine-tune run look like?

1. 💻 **One JSON line per clip.** `{"audio": ..., "text": ...}`, plus an optional `ref_audio` (§code train_data_example.jsonl).
2. 💻 **Include references in 30–50% of rows.** The docs' advice, so cloning keeps working (§code docs).
3. 💻 **Full fine-tune: lr 1e-5, effective batch 16.** 1,000 steps by default; raise it for hundreds of hours (§code voxcpm_finetune_all.yaml).
4. 💻 **The codec stays frozen.** The AudioVAE is never trained (§code voxcpm2.py:1170).
5. 🧠 **Add 10–20% Hindi and English rows.** Replay against forgetting (page 59).

<p class="rd-cap">Config values from conf/voxcpm_v2 and the docs at cce58a5. The Telugu manifest line is ours.</p>

<p class="rd-take"><b>The run is standard; the data is the work.</b> Next: what a reviewer would ask.</p>

</article>

<article class="rd-page" id="reviewer" data-part="Your move" data-draw="reviewer" markdown>

<p class="rd-crumb"><b>Move 4</b> Questions specific to this report.</p>

## What would a careful reviewer question?

1. **No ablation for V2's changes.** Fusion, multi-token LocDiT, NoPE and the 512-dim FSQ are argued, not measured (§3.3.1).
2. **Per-language hours are missing.** "1K to 50K" can't explain weak Hindi (§3.6).
3. **The 30-language test is private.** The ASR judge changed too, so Table 8 can't be compared with Table 6 (§4.1).
4. **Cross-lingual cloning is claimed, not tested.** No table pairs a reference and text in different languages (§1.2, §4.1).
5. **Paper: 9 levels. Code: 19.** Same layer, different count (§3.3.1; §code).
6. 🧠 **Steelman: everything is open.** Weights, training code and API ship under Apache 2.0, so you can test each gap yourself.

<p class="rd-cap">Each point cites the section that raises it. The steelman is our view.</p>

<p class="rd-take"><b>Strong release, thin evidence for its own design changes.</b> Next: the alternatives for Indic.</p>

</article>

<article class="rd-page" id="alternatives" data-part="Your move" data-draw="alternatives" markdown>

<p class="rd-crumb"><b>Move 5</b> Found by us. Other open routes to Indic TTS, October 2026.</p>

## What else could you build an Indic dubbing TTS on?

1. **Indic Parler-TTS.** Caption-controlled, 21 languages, about 96 h of Telugu; CER 12%, MOS 4.14 (Table 5 RASMALAI). No cloning.
2. **IndicF5.** F5-TTS with explicit length, about 1,417 h over 11 languages, MIT licence (IndicF5 card). Cloning, no style captions.
3. **OmniVoice.** 646 languages, Telugu CER 3.77% on FLEURS (Table 10 OmniVoice). Explicit duration.
4. **Indic-Speak.** Llama-3.2-3B with emotion and non-verbal tokens; its card calls style control "not yet consistent". Hosting needs approval.
5. 🧠 **VoxCPM2's edge is control.** Caption plus clean reference cloning, Apache 2.0. Its gap is Indic coverage.

<p class="rd-cap">From the cited cards and papers (2505.18609, 2604.00688), found by us. Metrics come from different tests; don't rank them.</p>

<p class="rd-take"><b>Others have more Indic data; none has VoxCPM2's mix of control and licence.</b> Next: the verdict.</p>

</article>

<article class="rd-page" id="verdict" data-part="Your move" data-draw="verdict" data-fast markdown>

<p class="rd-crumb"><b>Move 6</b> The verdict for your goal: expressive Indic dubbing in a consented voice.</p>

## Should you build your dubbing TTS on VoxCPM2?

1. **Indic to English or Hindi: yes, now.** English WER 1.84%, Hindi CER 0.79% with Gemini as judge (Tables 3, 8).
2. **Into Telugu and others: train first.** No tokens, no data; about 190 public studio hours against a 500-hour docs floor (page 66).
3. **Emotion: use captions, skip VC.** Controllable cloning keeps the actor's audio out of the generator; plain VC halves emotion (Table 9 VPC).
4. **Timing: not yet.** No length control. Shorten in MT now; add a patch-count input later (page 71).
5. 🧠 **Verdict: the best open base for control.** Pair it with an Indic data project, and test cross-lingual references early.

<p class="rd-cap">Numbers from Tables 3 and 8, VoicePrivacy 2601.11846 and the dataset cards. The verdict is ours.</p>

<p class="rd-take"><b>Build on VoxCPM2 for control; budget months of Indic data work for coverage.</b> Next: what to try first.</p>

</article>

<article class="rd-page" id="try-next" data-part="Your move" data-draw="try-next" markdown>

<p class="rd-crumb"><b>Move 7</b> 🧠 Weekend-sized experiments, ordered by what they teach you.</p>

## What could you try first?

1. 🧠 **Codec round-trip on Telugu.** Encode and decode 1 hour of Rasa; measure CER and mel distance. Does the codec need retraining?
2. 🧠 **Cross-lingual reference test.** English voice, Hindi text, 100 lines. Reproduce or refute issue #288.
3. 🧠 **Caption-driven emotion test.** Caption 50 angry English clips; dub to Hindi; score emotion accuracy.
4. 🧠 **Ten-hour Telugu LoRA.** New character tokens plus rank 64; plot CER against the IN-F5 curve.
5. 🧠 **Patch-count input.** Fine-tune a length embedding on Hindi; measure duration error.

<p class="rd-cap">Our proposals. Placement on the map is our guess at effort and payoff.</p>

<p class="rd-take"><b>Test the codec and cross-lingual cloning before spending on data.</b> Then check yourself.</p>

</article>

<article class="rd-page" id="check-rate" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 1</b> From page 12 and page 14.</p>

## How many times per second does VoxCPM2's big LLM run?

- [ ] 25, once per latent frame
- [x] 6.25, once per four-frame patch
- [ ] 16,000, once per input sample
- [ ] 12.5, once per two-frame patch

<p class="rd-take"><b>6.25 times a second.</b> The codec makes 25 frames a second and the LLM steps once per 4-frame patch (§3.1). 12.5 was VoxCPM's rate with patches of 2 (Table 1).</p>

</article>

<article class="rd-page" id="check-fsq" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 2</b> From page 8 to page 18.</p>

## Why does VoxCPM2 round its LLM states with FSQ?

- [ ] To get discrete tokens that a softmax head predicts
- [ ] To compress audio for storage
- [x] To squeeze the plan into a stable skeleton while keeping training end to end
- [ ] To make inference faster

<p class="rd-take"><b>FSQ is a regularizer, not a vocabulary.</b> With 512 dims the grid is far too large to predict; rounding just stabilizes the plan, and gradients pass straight through (§3.1 V1, Table 6 V1).</p>

</article>

<article class="rd-page" id="check-dub" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 3</b> From page 33 and page 67.</p>

## You may not copy the source actor's voice. Which setup fits best?

- [ ] Continuation cloning on the source clip, then voice conversion
- [ ] The source clip in the reference slot
- [x] A consented voice in the reference slot, plus a caption of the source emotion
- [ ] Plain TTS with no reference

<p class="rd-take"><b>Who from a consented clip, how from a caption.</b> The source audio never enters the generator, and no VC step can erase the emotion (Table 2; Table 9 VPC).</p>

</article>

<article class="rd-page" id="check-judge" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 4</b> Spot the flaw. From page 47.</p>

## "Hindi improved from 19.70% to 0.79%." What is wrong with that claim?

- [ ] Nothing; the internal set is just easier
- [ ] The numbers come from different model versions
- [x] Metric, ASR judge and sentences all changed, so it isn't a comparison
- [ ] 0.79% is a similarity score, not an error rate

<p class="rd-take"><b>Three things changed at once.</b> WER versus CER, Whisper versus Gemini, and MiniMax's set versus a private one (Tables 6, 8; §4.1). It is the same model.</p>

</article>

<article class="rd-page" id="check-telugu" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 5</b> From page 52 and page 53.</p>

## What does VoxCPM2 receive when you type a Telugu sentence?

- [ ] Telugu phonemes from a built-in G2P
- [ ] An error, because Telugu is unsupported
- [ ] Romanized text
- [x] Mostly UTF-8 byte tokens, about 3 per character

<p class="rd-take"><b>Byte fallback.</b> The vocabulary has no Telugu entries, so each character becomes its UTF-8 bytes (tokenizer.json at rev 32279ef, counted by us). There is no G2P in the code.</p>

</article>

<article class="rd-page" id="check-data" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 6</b> From page 55 and page 56.</p>

## The README says "5–10 minutes adapts a language". What is the catch?

- [ ] None; ten minutes is enough for Telugu
- [x] Minutes adapt a voice or domain; the docs ask 500+ hours for a new language
- [ ] It only applies to LoRA rank 8
- [ ] Minutes work only for languages with Latin script

<p class="rd-take"><b>A voice is cheap; a language is not.</b> The fine-tuning docs say 500+ hours with full fine-tuning (§code docs), and IN-F5 shows a cliff below 1 hour (Table 4 IN-F5).</p>

</article>
