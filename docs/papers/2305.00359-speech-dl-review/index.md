---
title: "Deep Learning for Speech: The Map"
paper_title: "A Review of Deep Learning Techniques for Speech Processing"
authors: ["Ambuj Mehrish", "Navonil Majumder", "Rishabh Bhardwaj", "Rada Mihalcea", "Soujanya Poria"]
year: 2023
venue: "Information Fusion, vol. 99, 101869 (2023); read as arXiv v3"
arxiv_id: "2305.00359"
arxiv_version: v3
paper_type: survey
hook: "One survey covers speech AI from MFCCs to diffusion, across 12 tasks. Follow one bank-balance sentence through all of it, and be ready for a TTS engineering interview."
big_idea: "Speech deep learning is a small set of building blocks (features, sequence models, learned representations, generative models) recombined per task; TTS is text front end, acoustic model and vocoder, and its history is a fight over speed, alignment and the one-to-many problem."
goal: "Prepare for a TTS engineer interview at a UK bank: know the whole map, go deep on TTS, and connect it to a voice assistant on phone lines."
difficulty: 3
difficulty_note: "Home turf for a speech reader, but very wide: 12 tasks, 8 architecture families and 4 kinds of representation learning. The TTS chapters go deeper than the survey, using original papers found by us."
date_added: 2026-11-06
tags: [Speech, TTS, ASR, Audio, Self-supervised, Generative models, Fine-tuning, Evaluation]
description: "One survey covers speech AI from MFCCs to diffusion, across 12 tasks. Follow one bank-balance sentence through all of it, and be ready for a TTS engineering interview."
---

<article class="rd-page" id="survey-map" data-part="Start" data-draw="survey-map" data-fast markdown>

<p class="rd-crumb"><b>Start 1</b> Start here. Nothing earlier is needed.</p>

## What does this survey cover, and how should you read it?

1. **Thirty years in one picture.** HMM + GMM in the 2000s, then LSTM and GRU. Then a burst: wav2vec 2.0, FastSpeech 2, Conformer, HuBERT, Whisper and VALL-E by 2023 (Fig. 1).
2. **Seven sections, one arc.** Background, architectures, representation learning, tasks, transfer learning, then future directions (§1). The bars show how many words each gets.
3. **Tasks take half the text.** Section 5 covers 12 tasks in about 22,000 words. Architectures get 10,500 (§3, §5).
4. **TTS is the biggest task.** Neural speech synthesis gets about 6,300 words, more than any other task (§5.2). It is your core. [[6,300 | words on TTS, the largest task section]]
5. 🧠 **Read it as a map.** The survey is wide, not deep. Our TTS chapters add numbers from the original papers, marked "found by us".

<p class="rd-cap">The timeline follows the paper's Fig. 1, redrawn. Word counts are ours, counted on the arXiv HTML text with tables, references excluded.</p>

<p class="rd-take"><b>The survey is a map of speech deep learning; TTS is the largest region on it.</b> Next: where TTS sits among the twelve tasks.</p>

</article>

<article class="rd-page" id="task-map" data-part="Start" data-draw="task-map" markdown>

<p class="rd-crumb"><b>Start 2</b> Uses the section map from page 1.</p>

## Where does TTS sit among the 12 speech tasks?

1. **Speech in, text out.** ASR writes words, scored by WER (§5.1, Table 6). Spoken language understanding pulls out intent, scored by F1 (§5.11).
2. **Speech in, a label out.** Speaker recognition scores EER (§5.3). Diarization, voice activity detection and quality assessment also label audio (§5.4, §5.8, §5.9).
3. **Speech in, speech out.** Translation, enhancement, super-resolution and separation all return audio (§5.5–5.7, §5.10). Separation is scored by SI-SDRi, enhancement by PESQ (Table 6).
4. **Text in, speech out.** Only TTS goes this way, judged by listeners with MOS from 1 to 5 (§5.2, Table 6). Voice conversion lives inside it (§5.2.6).
5. 🧠 **A bank assistant uses three.** A phone assistant chains ASR, then understanding, then TTS. Speaker verification may guard the door.

<p class="rd-cap">Tasks and metrics are from §5 and Table 6. Audio-visual speech (§5.12) is drawn apart because it adds video. The grouping by input and output is ours.</p>

<p class="rd-take"><b>TTS is the one task that turns text into sound, and the only one judged mainly by people.</b> Next: what that sound is, as numbers.</p>

</article>

<article class="rd-page" id="sampling" data-part="Toolbox: sound" data-draw="sampling" markdown>

<p class="rd-crumb"><b>Sound 1</b> From here on, follow one bank line: "Your balance is £1,250.75."</p>

## What is a digital speech signal, and why does sample rate matter?

1. **Sound is pressure over time.** A microphone, a **transducer**, turns air pressure into an electrical signal (§2.1). Our line lasts 3.4 seconds.
2. **Repeats set pitch and timbre.** A part that repeats every period has frequency 1 ÷ period. The waveform's shape sets its timbre (§2.1).
3. **Sampling measures at fixed steps.** The **sampling rate** is samples per second (§2.1). At 22,050 Hz our line is 74,970 numbers. [[74,970 | samples in our 3.4 s line]]
4. **Half the rate is the ceiling.** A rate keeps frequencies up to half of itself. At 22,050 Hz, that is about 11 kHz.
5. 🧠 **Phone lines use 8 kHz.** A phone-line voice assistant gets 27,200 samples for our line. Nothing above 4 kHz survives, so the hiss of "s" in "pence" is mostly lost.

<p class="rd-cap">Sample counts are arithmetic on our illustrative 3.4 s line. The waveform is synthetic. The half-rate (Nyquist) limit is standard signal theory, not from the survey.</p>

<p class="rd-take"><b>A speech signal is just a list of pressure samples, and the rate decides which sounds can exist in it.</b> Next: what you can read off that list directly.</p>

</article>

<article class="rd-page" id="time-features" data-part="Toolbox: sound" data-draw="time-features" markdown>

<p class="rd-crumb"><b>Sound 2</b> Uses the samples from page 3.</p>

## What can you read straight off the waveform?

1. **Cut it into short windows.** Every feature here is computed per window of a few hundred samples (§2.2).
2. **Energy shows loudness.** Square each sample and sum over the window (§2.2). The vowel in "balance" is loud; silence is near zero.
3. **Zero crossings show hiss.** Count sign changes per window (§2.2). Noisy sounds like "s" cross zero far more often than vowels.
4. **Silence is low on both.** Low energy and few crossings mark pauses, a simple cue for voice activity (§2.2).
5. 🧠 **TTS predicts energy too.** FastSpeech 2 feeds frame energy to its decoder (§5.2.3). You will meet it in page 42.

<p class="rd-cap">The signal is synthetic: a vowel, an "s"-like hiss and silence. Bars are computed live from it. The definitions are from §2.2.</p>

<p class="rd-take"><b>Energy and zero crossings separate loud vowels, hissy consonants and silence with almost no maths.</b> Next: the feature that carries melody.</p>

</article>

<article class="rd-page" id="pitch" data-part="Toolbox: sound" data-draw="pitch" markdown>

<p class="rd-crumb"><b>Sound 3</b> Uses the period idea from page 3.</p>

## What is pitch, and how is it found?

1. **Pitch is heard; F0 is measured.** Pitch is the perceived tone of a voice. It follows the **fundamental frequency**, F0 (§2.2).
2. **Compare the frame with itself.** Shift a copy of the window and multiply. This is **autocorrelation**, one way to find F0 (§2.2).
3. **The first peak is one period.** The best match comes after exactly one period. F0 = sample rate ÷ that lag. Move the slider.
4. **Hiss has no peak.** An unvoiced "s" never repeats, so it has no F0. Pitch trackers mark those frames unvoiced.
5. 🧠 **Melody carries meaning.** A rising F0 turns a statement into a question. FastPitch conditions TTS on the F0 contour for this (§5.2.3).

<p class="rd-cap">The voiced frame is synthetic and the autocorrelation is computed live at 22,050 Hz. The method is named in §2.2.</p>

<p class="rd-take"><b>F0 is the lag where a voiced frame best matches itself.</b> Next: predicting a sample from the ones before it.</p>

</article>

<article class="rd-page" id="lpc" data-part="Toolbox: sound" data-draw="lpc" markdown>

<p class="rd-crumb"><b>Sound 4</b> Uses the voiced frame from page 5.</p>

## How does LPC predict the next sample?

1. **Guess from the recent past.** **Linear predictive coding** predicts each sample as a weighted sum of the previous p samples (§2.2).
2. **Solve for the weights quickly.** The Levinson-Durbin algorithm finds the p weights from the frame's autocorrelation (§2.2). We run it live.
3. **More weights, smaller error.** Move the order slider. The readout shows how much of the frame's energy is left unpredicted.
4. **What is left is the buzz.** The leftover error is a train of pulses, one per pitch period. The weights capture the vocal tract's shape.
5. **LPCNet reuses this trick.** It pairs LPC with a small network to make a cheap, fast vocoder (§5.2.7). See page 51.

<p class="rd-cap">The frame is a synthetic vowel: pulses through three resonances. Weights and errors are computed live. The source-filter reading in step 4 is the standard one, not the survey's wording.</p>

<p class="rd-take"><b>LPC splits speech into a smooth filter you can predict and a buzz you cannot.</b> Next: the frequency view that replaced it.</p>

</article>

<article class="rd-page" id="stft" data-part="Toolbox: sound" data-draw="stft" markdown>

<p class="rd-crumb"><b>Sound 5</b> Uses the 74,970 samples from page 3.</p>

## How does a waveform become a spectrogram?

1. **Cut overlapping frames.** Take 1,024 samples, slide 256, repeat (§2.2). Our line gives 293 frames, one every 11.6 ms.
2. **Taper each frame.** A window function fades its edges, so the cut does not add false frequencies (§2.2).
3. **One FFT per frame.** The Fourier transform gives energy per frequency (§2.2). A 1,024-sample frame yields 513 bins, 21.5 Hz apart.
4. **Stack frames into an image.** Time runs across, frequency up. That is the **spectrogram**: here 513 × 293 (§2.2). [[513 × 293 | bins × frames for our line]]
5. **Window size is a trade-off.** Longer windows sharpen frequency but blur time. Move the slider and watch both numbers.

<p class="rd-cap">Frame and bin counts are live arithmetic for our illustrative settings (1,024 window, 256 hop, 22,050 Hz). The spectrogram image is synthetic.</p>

<p class="rd-take"><b>A spectrogram is many short FFTs side by side; the window sets what you can see sharply.</b> Next: shrinking 513 bins to 80.</p>

</article>

<article class="rd-page" id="mel" data-part="Toolbox: sound" data-draw="mel" data-fast markdown>

<p class="rd-crumb"><b>Sound 6</b> Uses the 513 × 293 spectrogram from page 7.</p>

## Why do speech models use mel spectrograms?

1. **Ears are uneven.** We hear small changes at low pitch, coarse ones at high pitch. The **mel scale** mimics this (§2.2).
2. **Triangles spaced by ear.** A **filterbank** of triangles is narrow at low frequencies and wide at high ones (§2.2). Count how many sit below 1 kHz.
3. **Each triangle sums power.** The 513 bins collapse to 80 numbers per frame (§2.2). Toggle to 40 filters to see coarser bands.
4. **Then take the log.** Logarithms compress loudness the way hearing does (§2.2). The result is the **log-mel spectrogram**.
5. **This is what TTS predicts.** For our line it is 80 × 293. The acoustic model in page 33 outputs exactly this. [[80 × 293 | log-mel matrix for our line]]
6. 💻 **Mel from scratch, five lines.** Frame and Hann-window: (293, 1024). Real FFT, squared magnitude: (293, 513). Multiply by the (513, 80) filterbank, then log: (293, 80).

<p class="rd-cap">Filter shapes use the common formula m = 2595·log10(1 + f/700), which the survey does not give. Counts and shapes are computed live for our illustrative 22,050 Hz settings.</p>

<p class="rd-take"><b>Mel spectrograms keep what ears use, in 80 numbers a frame, but drop phase.</b> A vocoder must rebuild it (page 47). Next: the older feature that squeezes mel further.</p>

</article>

<article class="rd-page" id="mfcc" data-part="Toolbox: sound" data-draw="mfcc" markdown>

<p class="rd-crumb"><b>Sound 7</b> Uses the log-mel frame from page 8.</p>

## What do MFCCs keep, and why does TTS drop them?

1. **Same start as mel.** Pre-emphasis, framing, windowing, FFT, mel filterbank, log (§2.2). Then two more steps: DCT and liftering.
2. **The DCT summarises the shape.** It rewrites one log-mel frame as cosine weights. The first few describe the broad envelope (§2.2).
3. **Keep about twelve.** MFCCs keep roughly 12 coefficients (§2.2). The amber curve rebuilds the frame from them. Slide to keep more.
4. **The harmonic ripple vanishes.** Few coefficients cannot draw the fine ripple of F0. Removing pitch is a stated goal of MFCCs (§2.2).
5. **Great for recognition.** Compact, decorrelated, pitch-free: ideal for ASR and speaker ID with GMMs (§2.2, §2.3).
6. 🧠 **Wrong target for TTS.** Thrown-away pitch can't be put back. TTS predicts log-mel, which a vocoder can invert.

<p class="rd-cap">The log-mel frame is synthetic; the DCT and the rebuilt curve are computed live. The step list and "12 parameters" come from §2.2.</p>

<p class="rd-take"><b>MFCCs keep the envelope and discard pitch: right for recognising, wrong for speaking.</b> Next: the models that used MFCCs for two decades.</p>

</article>

<article class="rd-page" id="gmm-hmm" data-part="Toolbox: sound" data-draw="gmm-hmm" markdown>

<p class="rd-crumb"><b>Sound 8</b> Uses the MFCC frames from page 9.</p>

## How did speech work before deep learning?

1. **Frames are the observations.** Each short frame becomes an MFCC vector. The model must explain the whole sequence (§2.3).
2. **Hidden states march forward.** An **HMM** gives each sound a few hidden states, left to right, with self-loops for longer sounds (§2.3).
3. **Each state emits a GMM.** A **Gaussian mixture** scores how likely a frame is in that state (§2.3). Mixtures model speakers too.
4. **EM trains it; search decodes.** Baum-Welch fits the model. Decoding finds the most likely state path (§2.3).
5. **Deep networks took over.** Hinton et al. (2012) showed large accuracy gains from DNNs over HMM systems (§1).
6. 🧠 **Alignment ideas survive.** Glow-TTS still finds a monotonic path from text to frames (page 43).

<p class="rd-cap">The three-state model, the Gaussians and the path are illustrative. The components and training method are from §2.3; SVMs, KNN and decision trees (§2.3) are not drawn.</p>

<p class="rd-take"><b>GMM-HMMs explained speech as hidden states marching left to right.</b> Next: how speech was made before neural TTS.</p>

</article>

<article class="rd-page" id="pre-neural-tts" data-part="Toolbox: sound" data-draw="pre-neural-tts" markdown>

<p class="rd-crumb"><b>Sound 9</b> Uses the HMMs from page 10.</p>

## How was speech synthesized before neural TTS?

1. **Glue recorded pieces.** **Concatenative synthesis** picks units from a big recorded database and joins them (§5.2.3, note 7).
2. 🧠 **Natural, but rigid.** In-database phrases sound real. Joins can click, and a new voice means new recordings.
3. **Predict parameters, then vocode.** **Statistical parametric synthesis** (SPSS) used HMMs to predict acoustic parameters, then a vocoder made sound (§5.2.3).
4. **Networks replaced the HMM.** Early neural TTS kept the SPSS pipeline and swapped the acoustic model (§5.2.3).
5. **WaveNet made the waveform.** In 2016 it generated audio directly from linguistic features: the first modern neural TTS (§5.2.3).
6. **Neural wins on four counts.** Better quality, naturalness and intelligibility, with less hand-built preprocessing (§5.2.3).

<p class="rd-cap">The three routes and their claims are from §5.2.3. Strengths and weaknesses of concatenative and SPSS in steps 2–3 are our summary.</p>

<p class="rd-take"><b>Neural TTS kept the old pipeline's shape and replaced its parts with networks.</b> Next chapter: the network families the survey builds everything from.</p>

</article>

<article class="rd-page" id="rnn" data-part="Architectures" data-draw="rnn" markdown>

<p class="rd-crumb"><b>Architectures 1</b> Uses the 293 mel frames of our bank line from page 7.</p>

## Why did speech models start with recurrence?

1. **Speech arrives as a sequence.** Our line is 293 frames in order. A plain feedforward net sees each frame alone (§3.1).
2. **A hidden state carries the past.** Each step mixes the new frame with the previous state: \(h_t = \mathcal{H}(W_{hh}h_{t-1} + W_{xh}x_t + b_h)\) (Eq. 1).
3. **Every frame can emit an output.** A linear layer reads \(h_t\), for example a phoneme guess per frame (Eq. 2).
4. **Step t waits for step t − 1.** The 293 frames take 293 strictly sequential updates. Training can't spread them across a GPU (§3.1.1).
5. 🧠 **Interview angle.** Recurrence was the bottleneck. CNNs, transformers and non-autoregressive TTS each attack this one wait.

<p class="rd-cap">Equations are the survey's (Eq. 1–2). The six cells and the 293-frame count are our illustrative bank line.</p>

<p class="rd-take"><b>An RNN's memory is its hidden state, and its cost is waiting in line.</b> Next: what if the model may also look ahead?</p>

</article>

<article class="rd-page" id="birnn" data-part="Architectures" data-draw="birnn" markdown>

<p class="rd-crumb"><b>Architectures 2</b> Builds on the hidden state from page 12.</p>

## Why can't a bidirectional RNN listen or speak live?

1. **Context from both sides helps.** Transcribing a whole utterance at once is more robust than using only the past (§3.1.1).
2. **Run two RNNs, opposite ways.** One reads frames left to right, one right to left (Eq. 3–4).
3. **Join them at every frame.** Each output sees the past and the future (Eq. 5). Bi-LSTMs became common in synthesis too (§3.1.2).
4. **The backward pass needs the last frame.** Drag the slider. Nothing comes out until all 3.4 s of our line has arrived.
5. 🧠 **Streaming needs a limit.** Live systems use one direction or a small look-ahead window. Ask about latency whenever someone proposes "Bi".

<p class="rd-cap">Equations are the survey's (Eq. 3–5). The 3.4 s line and the slider are illustrative.</p>

<p class="rd-take"><b>Bidirectional means better context and no streaming.</b> Next: how gates keep memory alive over hundreds of frames.</p>

</article>

<article class="rd-page" id="lstm-gru" data-part="Architectures" data-draw="lstm-gru" markdown>

<p class="rd-crumb"><b>Architectures 3</b> Fixes the memory problem left by page 12.</p>

## How do gates let an RNN remember a whole sentence?

1. **Plain memory fades fast.** Vanilla RNN gradients vanish, so long context is lost (§3.1.1). Move the slider: keep 0.9 per frame, and after 100 frames almost nothing remains.
2. **LSTM adds a separate cell.** \(c_t = f_t \odot c_{t-1} + i_t \odot \tanh(\cdot)\) (Eq. 8). The update is a sum, so memory can pass through untouched.
3. **Three gates decide.** Forget, input and output gates are sigmoids between 0 and 1 (Eq. 6, 7, 9).
4. **The output gate filters the cell.** \(h_t = o_t \odot \tanh(c_t)\) (Eq. 10).
5. **GRU merges it into two gates.** Update and reset gates, one state, fewer weights (Eq. 11–13).

<p class="rd-cap">Gate equations are the survey's (Eq. 6–13). The decay readout is plain arithmetic: keep-fraction to the power of 100 frames (about 1 s at a 10 ms hop).</p>

<p class="rd-take"><b>Gates turn "multiply every step" into "add, and forget on purpose".</b> Tacotron-era TTS ran on LSTMs for this reason.</p>

</article>

<article class="rd-page" id="ctc" data-part="Architectures" data-draw="ctc" markdown>

<p class="rd-crumb"><b>Architectures 4</b> Uses per-frame outputs from page 12.</p>

## How does CTC train without knowing which frame is which letter?

1. **Frames outnumber letters.** A caller says "yes" over 10 frames. Nobody labelled which frame holds "e" (§3.1.1).
2. **Add a blank symbol.** The model emits a letter or "_" at every frame. Repeated labels stretch a path to the input's length (§3.1.2).
3. **Merge repeats.** "y y _ e e e _ s s" becomes "y _ e _ s".
4. **Then drop blanks.** "y _ e _ s" becomes "yes". This collapse is the whole decoding rule.
5. **Sum over every path.** Many frame paths collapse to "yes". CTC maximises their total probability over all monotonic alignments (§3.5.1).
6. 🧠 **Why blanks matter.** "too" needs "o _ o": without a blank, the two o's would merge into one.
7. 💻 **Batch clips of different lengths.** Pad to the longest clip and keep true lengths. PyTorch's `ctc_loss` takes log-probs shaped (T, B, C) plus both length lists.

<p class="rd-cap">The survey describes CTC in §3.1.1, §3.1.2 and §3.5.1; the blank and collapse rule are standard CTC (Graves et al., 2006), found by us. The "yes" paths are our toy.</p>

<p class="rd-take"><b>CTC learns alignment by summing over all of them.</b> TTS borrows it too: CTC losses have been used in synthesis and voice conversion (§3.5.1).</p>

</article>

<article class="rd-page" id="cnn" data-part="Architectures" data-draw="cnn" markdown>

<p class="rd-crumb"><b>Architectures 5</b> Uses the 80 × 293 mel spectrogram from page 8.</p>

## Should a CNN slide over a spectrogram in 2D or 1D?

1. **Spectrograms are locally correlated.** Nearby times and nearby frequencies move together. Convolutions exploit that with shared weights (§3.2).
2. **2D treats it like an image.** A small kernel slides over time and frequency (Eq. 14). Each filter keeps 80 × 293 = 23,440 values.
3. **2D gets expensive.** Multiplies and feature-map memory grow quickly with input size (§3.2.1).
4. **1D spans all 80 bins.** The kernel covers full height and slides only in time (Eq. 15). Each filter keeps 293 values, 80 times fewer.
5. **Both live inside speech models.** wav2vec 2.0 runs a CNN on raw audio. Tacotron 2 uses convolutions too (§3.2.2).

<p class="rd-cap">Equations are the survey's (Eq. 14–15). Map sizes use our illustrative 80 × 293 bank-line spectrogram, one filter, no padding effects.</p>

<p class="rd-take"><b>For speech, 1D convolution over time is the cheap default.</b> FastSpeech mixes 1D convolutions with self-attention (§5.2.3).</p>

</article>

<article class="rd-page" id="tcn" data-part="Architectures" data-draw="tcn" markdown>

<p class="rd-crumb"><b>Architectures 6</b> Builds on 1D convolution from page 16.</p>

## How does WaveNet see a whole syllable with two-tap filters?

1. **Causal: only the past.** Output at time t uses inputs up to t, never later. No future leaks in (§3.2.4, Fig. 2).
2. **Dilation skips inputs.** A dilation of d spaces the filter taps d samples apart (Eq. 16). The cost per layer stays the same.
3. **Double it each layer.** With dilations 1, 2, 4, 8, the reach doubles every layer. Move the layers slider.
4. **WaveNet used 1 to 512.** One block of ten layers sees 1,024 samples, found by us. At 16 kHz that is 64 ms.
5. **Training runs in parallel.** All outputs compute at once, unlike an RNN (§3.2.5). Generation is still one sample at a time.

<p class="rd-cap">The receptive-field arithmetic is exact for kernel size 2. The 1–512 pattern and 16 kHz rate are from WaveNet (arXiv:1609.03499, §2.1), found by us.</p>

<p class="rd-take"><b>Dilation buys exponential reach for linear cost.</b> Real-time speech enhancement uses TCNs too (§3.2.5).</p>

</article>

<article class="rd-page" id="attention" data-part="Architectures" data-draw="attention" markdown>

<p class="rd-crumb"><b>Architectures 7</b> Replaces the sequential wait from page 12.</p>

## What does attention compute, number by number?

1. **Four sounds of "balance".** Each phoneme here is a toy 2-number vector. In self-attention, queries, keys and values all come from them (§3.3.1).
2. **Score every pair.** Dot each query with each key, then divide by \(\sqrt{d_k}\) (Eq. 17). Here \(d_k = 2\).
3. **Softmax each row.** Every row now sums to 1: how much this sound listens to each other sound.
4. **Mix the values.** Each output is the weighted sum of value vectors, read off the right-hand column.
5. **Every pair costs.** Our 293-frame line needs 293 × 293 = 85,849 scores per head, per layer.
6. 💻 **Code it with shapes.** Q, K, V are (B, H, T, d). Scores are (B, H, T, T). For a causal decoder, set future scores to −∞ before softmax.

<p class="rd-cap">The arithmetic is real and runs live on toy vectors we chose; the formula is Eq. 17. The 85,849 count uses our illustrative 293 frames.</p>

<p class="rd-take"><b>Attention is a learned, soft lookup over all positions at once.</b> Its cost grows with length squared, which matters for long speech.</p>

</article>

<article class="rd-page" id="transformer-block" data-part="Architectures" data-draw="transformer-block" markdown>

<p class="rd-crumb"><b>Architectures 8</b> Wraps the attention from page 18 into a block.</p>

## What else is in a transformer block, and what did speech change?

1. **Many heads, then merge.** Each head attends in its own smaller space. Outputs are concatenated and projected back (Eq. 18–19).
2. **Add, then normalise.** A residual and LayerNorm wrap attention (Eq. 20). They wrap the FFN too (Eq. 21).
3. **The FFN is per position.** Two dense layers act on each frame alone, like two 1×1 convolutions (§3.3.1).
4. **Speech is long and dense.** Speech-Transformer puts CNN layers in front to shorten the input (§3.3.2). Toggle 4× shortening: 85,849 scores drop to 5,476.
5. **It paid off.** A cited study tested 15 ASR, 1 multilingual ASR, 1 ST and 2 TTS tasks. Transformers beat RNNs in most of them (§3.3.2). Transformer TTS trains about 4.25× faster (§3.3.2).
6. 💻 **Cache keys and values.** Autoregressive decoding keeps past K and V as (B, H, t, d). Each new step appends one row and scores only its own query.

<p class="rd-cap">Block structure and results are from §3.3. The shortening toggle is our arithmetic on the illustrative 293-frame line (293² vs 74²).</p>

<p class="rd-take"><b>The block is attention plus FFN, glued by residuals and norms.</b> For speech, shorten the sequence before you attend.</p>

</article>

<article class="rd-page" id="conformer" data-part="Architectures" data-draw="conformer" markdown>

<p class="rd-crumb"><b>Architectures 9</b> Combines page 16 and page 19.</p>

## Why does the best ASR encoder put a convolution inside attention?

1. **Speech needs two kinds of context.** Convolution catches local detail like formant shifts. Attention catches long-range links (§3.4.1).
2. **One block holds both.** Attention, then a convolution module, between two feed-forward layers (§3.4). Each FFN adds only half its output, found by us.
3. **It set ASR records.** 2.1% / 4.3% WER on LibriSpeech test-clean / test-other, no language model, found by us (§3.4.1).
4. **Small still works.** A 10M-parameter Conformer reaches 2.7% / 6.3%, found by us.
5. **It also streams.** Conformer transducers serve real-time recognition (§3.4.1).

<p class="rd-cap">WERs and the half-step FFN "sandwich" are from the Conformer paper (arXiv:2005.08100, abstract and §2), found by us. The survey gives no numbers here.</p>

<p class="rd-take"><b>Local convolution plus global attention is the speech encoder default.</b> Next: the encoder-decoder shape that ASR and TTS share.</p>

</article>

<article class="rd-page" id="seq2seq" data-part="Architectures" data-draw="seq2seq" markdown>

<p class="rd-crumb"><b>Architectures 10</b> Uses the blocks from page 19 and alignment from page 15.</p>

## Why do ASR, TTS and speech translation share one skeleton?

1. **Encoder: prenet then main.** The input becomes \(X_e\) (Eq. 22). It is mel frames for ASR, phonemes for TTS.
2. **Decoder: one target step at a time.** It reads \(X_e\) and the target prefix, then predicts the next step (Eq. 23).
3. **A postnet refines.** It polishes the whole decoded sequence, such as mel frames in TTS (Eq. 23).
4. **Flip the toggle.** ASR, ST and TTS use the same boxes, only X and Y swap (Fig. 5, §3.5).
5. **Attention or CTC aligns them.** Attention gives soft alignment. CTC sums monotonic ones. Hybrids combine both (§3.5.1).
6. 🧠 **Train on truth, run on guesses.** Training feeds true prefixes (§3.5). Inference feeds back its own outputs.

<p class="rd-cap">Karita et al.'s unified formulation, as given in the survey (Fig. 5, Eq. 22–23). Box labels are ours.</p>

<p class="rd-take"><b>TTS is ASR run backwards through the same machine.</b> That is why alignment failures haunt both (see the TTS chapter).</p>

</article>

<article class="rd-page" id="side-branches" data-part="Architectures" data-draw="side-branches" markdown>

<p class="rd-crumb"><b>Architectures 11</b> Two families the survey covers that rarely drive TTS.</p>

## Where do reinforcement learning and graph networks fit in speech?

1. **RL: state, action, reward.** For ASR, actions are phonemes and the reward is edit-distance correctness (§3.6.1, §3.6.2).
2. **RL for synthesis.** States are text, actions are audio, and the reward is mel similarity (§3.6.2). Rewards are hard to design (§3.6.2).
3. **GNN: frames become nodes.** Edges join neighbouring frames, and layers pass messages between them (§3.7.1, Fig. 6).
4. **GNNs fit relational tasks.** Diarization, speaker verification, separation and multichannel enhancement use them (§3.7.2).
5. 🧠 **Know them, don't lead.** Neither is core TTS machinery. Mention them for breadth, then return to sequence models.

<p class="rd-cap">Facts from §3.6–3.7. The verdict in the last row is our take.</p>

<p class="rd-take"><b>RL and GNNs are side roads in speech.</b> Diffusion is not: it now powers TTS and vocoders.</p>

</article>

<article class="rd-page" id="diffusion-forward" data-part="Architectures" data-draw="diffusion-forward" markdown>

<p class="rd-crumb"><b>Architectures 12</b> A new kind of block: a generative process, not a layer.</p>

## What does adding noise step by step do to a speech signal?

1. **Start from clean speech.** \(x_0\) is a real signal, here a toy vowel-like wave (§3.8).
2. **Add a little noise per step.** \(q(x_t \mid x_{t-1}) = \mathcal{N}(\sqrt{1-\beta_t}\,x_{t-1}, \beta_t I)\), chained over T steps (Eq. 24).
3. **Signal fades as a product.** After t steps the signal keeps \(\sqrt{\bar\alpha_t}\), where \(\bar\alpha_t\) multiplies all the \(1-\beta\). Move the slider.
4. **End at pure noise.** With DDPM's 1,000 steps, β from 0.0001 to 0.02, \(x_T\) is Gaussian (found by us).
5. **The shape never shrinks.** Unlike VAEs or flows, every \(x_t\) has the data's full size (§3.8).
6. 💻 **Training jumps straight to t.** Sample t and noise ε. Set \(x_t = \sqrt{\bar\alpha_t}x_0 + \sqrt{1-\bar\alpha_t}\,\varepsilon\). The loss is MSE between predicted and true ε.

<p class="rd-cap">The process is Eq. 24. The 1,000-step linear schedule is from DDPM (arXiv:2006.11239, §4), found by us; the wave and noise are synthetic and seeded.</p>

<p class="rd-take"><b>Forward diffusion is a fixed recipe for destroying speech.</b> All the learning happens in reverse.</p>

</article>

<article class="rd-page" id="diffusion-reverse" data-part="Architectures" data-draw="diffusion-reverse" markdown>

<p class="rd-crumb"><b>Architectures 13</b> Reverses the chain from page 23.</p>

## How does a network turn noise back into speech, and why is it slow?

1. **Run the chain backwards.** Start at Gaussian noise \(x_T\) and step to \(x_0\) (Eq. 25).
2. **Learn to estimate the noise.** One network predicts the noise at each step, and subtracting it moves one step back (§3.8).
3. **Every step is a full pass.** Move the slider: network passes equal sampling steps. DDPM-style chains need 1,000.
4. **Speed became the research race.** FastDiff runs 58× faster than real time on a V100 GPU (§3.8.1).
5. **Quality is the prize.** DiffWave matches a WaveNet vocoder while synthesising much faster (§3.8.1).
6. 🧠 **Interview angle.** Diffusion is parallel over time but serial over steps. WaveNet is the opposite.
7. 💻 **The sampler is one loop.** For t from T down to 1: predict ε, remove its scaled share, add fresh noise except at the last step.

<p class="rd-cap">The reverse process is Eq. 25; FastDiff and DiffWave claims are from §3.8.1. The step slider is arithmetic, not a measured speed.</p>

<p class="rd-take"><b>Diffusion trades sampling steps for quality.</b> The TTS chapter shows where it drives mel spectrograms and vocoders.</p>

</article>

<article class="rd-page" id="repr-map" data-part="Representations" data-draw="repr-map" markdown>

<p class="rd-crumb"><b>Representations 1</b> Uses the hand-made features from page 8 and page 9.</p>

## What are the four ways to learn a speech representation?

1. **Features used to be recipes.** MFCCs and mel bins are fixed formulas (§2.2). Representation learning lets a network learn the features instead (§4).
2. **Supervised: learn from labels.** Train a network to name the speaker. Its hidden layers become speaker features as a side effect (§4.1).
3. **Unsupervised: explain the data.** A hidden variable z must explain the audio. No labels are used at all (§4.2).
4. **Semi-supervised: few labels, many clips.** A labelled loss plus an unlabelled loss, mixed by a weight α (§4.3).
5. **Self-supervised: labels from the audio.** Hide or alter part of the input, then predict it. Three families: generative, contrastive, predictive (§4.4).
6. 🧠 **Why TTS engineers care.** Speaker vectors pick the voice. Self-supervised units drive resynthesis and voice conversion (§5.2.5).

<p class="rd-cap">The four kinds and the three self-supervised families are the survey's (§4, Fig. 10–13). Placement along the label axis is our sketch.</p>

<p class="rd-take"><b>The fewer labels a method needs, the more audio it can learn from.</b> Next: the supervised kind that every multi-speaker TTS uses.</p>

</article>

<article class="rd-page" id="speaker-embeddings" data-part="Representations" data-draw="speaker-embeddings" markdown>

<p class="rd-crumb"><b>Representations 2</b> Builds on the supervised kind from page 25.</p>

## How does a network turn a voice into one vector?

1. **d-vector: classify every frame.** Each frame carries its speaker's label. At test time, average the last hidden layer over all frames (§4.1.1).
2. **x-vector: classify the whole segment.** Time-delay layers read frames. Statistics pooling joins their mean and standard deviation into one vector (§4.1.1).
3. **Keep the layer before softmax.** The x-vector is the second-to-last hidden layer. The speaker classifier itself is thrown away (§4.1.1).
4. **The loss shapes the space.** Table 1 lists seven losses, from softmax to GE2E. GE2E and prototypical losses did best on VoxCeleb1 (§4.1, Table 1).
5. **Same vector, many jobs.** Diarization, voice conversion and multi-speaker TTS all reuse these embeddings (§4.1.1).
6. 🧠 **Zero-shot TTS starts here.** Found by us: SV2TTS trained a GE2E encoder on 18K speakers. Its 256-number vector conditioned Tacotron 2 on unseen voices.

<p class="rd-cap">Architectures and losses from §4.1.1 and Table 1. SV2TTS numbers (18K speakers, 256 dims) are from arXiv:1806.04558 §2.1, found by us. Layer sizes drawn are not to scale.</p>

<p class="rd-take"><b>Train to name speakers, then keep the layer that describes them.</b> Your IVR voice is one such vector to the TTS model.</p>

</article>

<article class="rd-page" id="latent-models" data-part="Representations" data-draw="latent-models" markdown>

<p class="rd-crumb"><b>Representations 3</b> The unsupervised kind from page 25. A GMM from page 10 is the simplest case.</p>

## What does a latent variable model learn without labels?

1. **Assume a hidden cause z.** Audio x comes from something unseen: a phone, a speaker, a style. The model learns their joint \(p(x, z)\) (§4.2).
2. **Add up every possible cause.** Eq. 26: \(p(x) = \int p(x \mid z)\, p(z)\, dz\). With two causes, it is a two-bump mixture. Move the slider.
3. **The integral is the hard part.** With a neural \(p(x \mid z)\), there is no closed form. Classic tools sample instead, like MCMC (§4.2).
4. **A VAE learns to guess z.** An encoder proposes z from x; a decoder rebuilds x from z (Fig. 10, §4.2).
5. 💻 **Sample z so gradients flow.** `z = mu + exp(0.5*logvar) * eps`, with `eps = randn_like(mu)`, all shaped (B, d_z). The KL to N(0, I) is `-0.5*sum(1 + logvar - mu**2 - exp(logvar))`.
6. **VQ-VAE makes z discrete.** A codebook replaces the continuous z. That suits spoken language modelling (§4.4.1).
7. 🧠 **VITS is a VAE.** The TTS model on page 44 is a conditional VAE, with text as the condition (§5.2.3).

<p class="rd-cap">Eq. 26 and Fig. 10 are the survey's. The two Gaussian bumps are a toy example, computed live. The code is the standard VAE recipe, not from the survey.</p>

<p class="rd-take"><b>A latent model explains audio with causes it was never told about.</b> Next: what to do when a few labels do exist.</p>

</article>

<article class="rd-page" id="semi-supervised" data-part="Representations" data-draw="semi-supervised" markdown>

<p class="rd-crumb"><b>Representations 4</b> Mixes the supervised and unsupervised kinds from page 25.</p>

## How do a few labels and many unlabelled clips train one model?

1. **Two piles of data.** \(X_L\) holds \(N_L\) labelled pairs. \(X_U\) holds \(N_U\) clips with no labels, usually far more (§4.3).
2. **Labelled pile: the usual loss.** Eq. 28 averages the ordinary loss over \(X_L\) only.
3. **Unlabelled pile: be decisive.** Entropy minimization pushes each unlabelled prediction toward one label (Eq. 29). Move the slider and watch the entropy.
4. **Mix them with α.** The total is \(\mathcal{L}_{sup} + \alpha\,\mathcal{L}_{unsup}\). α sets how much the unlabelled pile counts (§4.3).
5. 🧠 **Check the sign.** Entropy is \(-\sum p \log p\). Eq. 29 as printed drops the minus, so minimizing it would maximize entropy.
6. **Useful where labels are scarce.** The survey cites ASR, TTS, quality assessment and speech translation, especially for low-resource languages (§4.3).

<p class="rd-cap">Eq. 27–29 are the survey's. The pile sizes and the four-label prediction are illustrative; entropy is computed live in bits.</p>

<p class="rd-take"><b>Labelled data teaches the task; unlabelled data teaches confidence.</b> Next: dropping labels completely.</p>

</article>

<article class="rd-page" id="ssl-generative" data-part="Representations" data-draw="ssl-generative" markdown>

<p class="rd-crumb"><b>Representations 5</b> The first self-supervised family from page 25.</p>

## What can a model learn by rebuilding its own input?

1. **The input is the label.** Generative self-supervision predicts part of the audio from the rest. No one annotates anything (§4.4.1).
2. **Auto-encoding: squeeze, then rebuild.** AEs, VAEs and VQ-VAEs push audio through a bottleneck and reconstruct it (§4.4.1).
3. **Autoregressive: predict what comes next.** APC predicts future frames from past ones. WaveNet does the same per sample (§4.4.1).
4. **Masked: fill the gaps.** BERT-style. Mockingjay masks all feature dimensions of chosen frames; TERA masks only some dimensions (§4.4.1).
5. **Small data by today's scale.** Pretraining used 50 to 960 hours of LibriSpeech (Table 2).
6. 🧠 **Rebuilding costs capacity.** Every detail must be reproduced, including noise. The next two families score choices instead of rebuilding.

<p class="rd-cap">Variants and pretraining hours from §4.4.1 and Table 2 (largest DeCoAR setting shown). The spectrogram strip is illustrative.</p>

<p class="rd-take"><b>Generative SSL learns by reconstruction: simple, but it must model everything.</b> Next: learning by choosing instead.</p>

</article>

<article class="rd-page" id="ssl-contrastive" data-part="Representations" data-draw="ssl-contrastive" data-fast markdown>

<p class="rd-crumb"><b>Representations 6</b> Second self-supervised family. Uses softmax over scores, as in page 18.</p>

## How does wav2vec 2.0 learn without rebuilding the audio?

1. **Pick the right one from a crowd.** Contrastive learning scores pairs. True pairs should score high, mismatched pairs low (§4.4.2).
2. **CPC: guess the future latent.** A summary of the past must pick the true next latent among negatives (Fig. 12).
3. **wav2vec 2.0 masks instead.** At each masked step, the transformer output must pick its true quantized target (§4.4.2). Found by us: among 100 distractors.
4. **The loss is a softmax.** \(-\log \frac{e^{s^+/\kappa}}{\sum e^{s/\kappa}}\), with κ = 0.1 (found by us). Raise the true-pair score and watch the loss fall.
5. **Pretrain, then fine-tune.** Pretraining used 960 h of LibriSpeech or 60,000 h of LibriLight, unlabelled (Table 3).
6. **Labels become nearly optional.** Found by us: 10 minutes of labels gave 4.8% WER on LibriSpeech test-clean. [[10 min | of labelled audio, 4.8% WER]]

<p class="rd-cap">Hours from Table 3. K = 100, κ = 0.1 and the 4.8/8.2 WER are from wav2vec 2.0 (arXiv:2006.11477), found by us. Distractor scores are seeded, illustrative values.</p>

<p class="rd-take"><b>Choosing the right answer teaches content without rebuilding every detail.</b> Next: HuBERT turns the choice into a classification.</p>

</article>

<article class="rd-page" id="ssl-predictive" data-part="Representations" data-draw="ssl-predictive" markdown>

<p class="rd-crumb"><b>Representations 7</b> Third family. Compare with the contrastive loss on page 30.</p>

## Why does HuBERT predict cluster IDs instead of audio?

1. **Speech has no tokens.** BERT needs discrete inputs. Speech is continuous, with no word or phone boundaries (§4.4.3).
2. **Discrete BERT borrows codes.** vq-wav2vec turns audio into codes; BERT masks and predicts them. Ten minutes of labels gave 25% WER on test-other (§4.4.3).
3. **HuBERT makes targets by k-means.** Cluster frames offline; each frame gets a cluster ID (Fig. 13). Found by us: round 1 uses 100 clusters on MFCCs.
4. **Loss only where masked.** Predicting hidden frames forces an acoustic and a language model in one (§4.4.3). Found by us: masks start at 8% of frames, 10 frames long.
5. **Then cluster its own features.** Round 2 found by us: 500 clusters on an inner HuBERT layer. Targets become more phone-like.
6. **WavLM adds noisy inputs.** Same recipe; it led SUPERB in 2023 (§4.4.3).

<p class="rd-cap">§4.4.3, Fig. 13. Cluster counts and mask settings: HuBERT (arXiv:2106.07447), found by us. IDs are illustrative.</p>

<p class="rd-take"><b>HuBERT classifies frames into its own clusters.</b> Next page: those IDs as units.</p>

</article>

<article class="rd-page" id="units-for-tts" data-part="Representations" data-draw="units-for-tts" markdown>

<p class="rd-crumb"><b>Representations 8</b> Uses the cluster IDs from page 31. Our bank line returns.</p>

## How do self-supervised units turn back into speech?

1. **Units are pseudo-text.** Cluster IDs act like letters learned from audio alone (§5.2.5). Our 3.4 s bank line becomes 170 units at 20 ms each.
2. **S2u: speech to units.** An SSL encoder plus k-means writes unit IDs (Fig. 15). Found by us: GSLM tried CPC, wav2vec 2.0 and HuBERT with 50–200 units.
3. **Merge the repeats.** Found by us: GSLM collapses runs of the same unit before training its uLM, which helped. Its authors guess shorter sequences use attention better.
4. **uLM: a language model on units.** It learns which unit sequences are likely, without any text (Fig. 15).
5. **u2S: units back to audio.** A decoder turns units into a waveform, like a TTS without text (§5.2.5).
6. 🧠 **Units keep words, lose voice.** So any speaker can say them: resynthesis and conversion. Codec tokens took this further (page 76).

<p class="rd-cap">S2u → uLM → u2S is GSLM (§5.2.5, Fig. 15). Encoders, unit counts and the merge step are from arXiv:2102.01192 (its Sec. 4.2), found by us. The 20 ms rate is HuBERT's; the unit IDs are illustrative.</p>

<p class="rd-take"><b>Discrete units make speech look like text, so text tools apply to it.</b> The TTS chapter starts next.</p>

</article>

<article class="rd-page" id="tts-pipeline" data-part="TTS: the machine" data-draw="tts-pipeline" data-fast markdown>

<p class="rd-crumb"><b>TTS 1</b> The core of the lesson. Uses mel frames from page 8. We follow one bank line from here on.</p>

## What are the three stages of a neural TTS system?

1. **Text analysis comes first.** It turns raw text into linguistic features: phonemes, plus prosody hints (Fig. 14).
2. **The acoustic model draws sound.** It maps linguistic features to acoustic features, usually a mel spectrogram (§5.2.1).
3. **The vocoder writes the waveform.** It turns the mel spectrogram into samples. HiFi-GAN is the survey's example (§5.2.1).
4. **Follow our bank line.** "Your balance is £1,250.75." becomes 56 phonemes, then 293 mel frames, then 74,970 samples. [[74,970 | samples, from 56 phonemes and 293 frames]]
5. 🧠 **Each stage fails differently.** A bad front end says the wrong words. A bad acoustic model skips words or sounds flat. A bad vocoder buzzes.

<p class="rd-cap">Three stages from §5.2.1 and Fig. 14 (our drawing, not theirs). The line, its 56 phonemes and the 22,050 Hz / hop 256 sizes are illustrative.</p>

<p class="rd-take"><b>Text → features → mel → wave.</b> Every model in this chapter replaces one or more of these boxes. Next: what happens to "£1,250.75" first.</p>

</article>

<article class="rd-page" id="text-frontend" data-part="TTS: the machine" data-draw="text-frontend" markdown>

<p class="rd-crumb"><b>TTS 2</b> Opens the first box of page 33.</p>

## What must happen to "£1,250.75" before a network sees it?

1. **The survey gives one line.** Text analysis "tokenizes the input text and generates linguistic features" (Fig. 14). The details below are standard practice, found by us.
2. **Normalize: symbols become words.** "£1,250.75" has no pronunciation. It must become "one thousand two hundred and fifty pounds seventy-five pence".
3. **Same digits, different readings.** Flip the toggle. As a year, 1250 reads "twelve fifty". Context decides, and a rule or model must know it.
4. **Then words become phonemes.** A lexicon or a grapheme-to-phoneme (**G2P**) model does it. FastSpeech 2 used an open-source G2P tool (found by us).
5. **UK banking adds its own cases.** Pence, dates like 03/05 (3 May in the UK), sort codes read in pairs, merchant names (page 79).
6. 🧠 **Interview angle.** Many production TTS bugs live here, not in the network. A wrong amount read aloud is a customer incident.

<p class="rd-cap">The survey only names "text analysis" (Fig. 14). Normalization and G2P detail found by us; FastSpeech 2's G2P footnote is in arXiv:2006.04558 §3.1. Phonemes are our ARPAbet transcription.</p>

<p class="rd-take"><b>Normalization decides what is said; the network decides how.</b> Next: how acoustic models evolved.</p>

</article>

<article class="rd-page" id="tts-history" data-part="TTS: the machine" data-draw="tts-history" markdown>

<p class="rd-crumb"><b>TTS 3</b> Continues from page 11, now with MOS scores. Each bar lights as its era appears.</p>

## How did TTS get from HMMs to end-to-end models?

1. **Networks first replaced HMMs.** Early neural models sat inside statistical parametric synthesis (§5.2.3). In one 2017 test, parametric scored 3.49 MOS and concatenative 4.17.
2. **WaveNet generated raw samples.** The first modern neural TTS went from linguistic features straight to waveform (§5.2.3). It scored 4.34 in the same test.
3. **DeepVoice made each part neural.** DeepVoice 1 and 2 kept the three SPSS components but built each with networks (§5.2.3).
4. **Tacotron went end to end to mel.** Characters or phonemes in, mel out, vocoder after (§5.2.3). Tacotron 2 scored 4.53; recordings scored 4.58.
5. **Then text straight to waveform.** ClariNet, FastSpeech 2s and EATS drop the separate mel stage (§5.2.3).

<p class="rd-cap">Eras from §5.2.3. MOS values are from Tacotron 2's Table 1 (arXiv:1712.05884, US English, 2017), found by us; that test had no FastSpeech or ClariNet.</p>

<p class="rd-take"><b>Each era removed hand-built parts, and quality rose toward human.</b> Next: the split that shapes everything after, autoregressive or not.</p>

</article>

<article class="rd-page" id="ar-vs-nar" data-part="TTS: the machine" data-draw="ar-vs-nar" data-fast markdown>

<p class="rd-crumb"><b>TTS 4</b> Uses our 293-frame line from page 33.</p>

## Why generate frames one at a time, or all at once?

1. **Autoregressive: one frame per step.** Each mel frame waits for the one before, as in Tacotron 2 (Table 9). Our 293-frame running example needs 293 sequential decoder steps.
2. **Non-autoregressive: all frames together.** Predict how long each phoneme lasts, then fill every frame in parallel (§5.2.1, Table 9).
3. **Speed is the headline.** FastSpeech made mel generation 269.40× faster than autoregressive Transformer TTS (found by us). [[47.8× | faster waveform synthesis, FastSpeech 2 vs Transformer TTS]]
4. **Move the slider.** With measured real-time factors, our 3.4 s line takes 3.17 s autoregressively but 0.066 s in parallel.
5. **The price is alignment.** Parallel models need durations from a teacher, an aligner or a search (page 40, page 43).
6. 🧠 **Streaming asks two numbers.** Time-to-first-audio: how soon the caller hears sound. RTF: below 1, so playback never stalls mid-sentence.

<p class="rd-cap">Families from Table 9. RTFs from FastSpeech 2 Table 2 (arXiv:2006.04558: V100, batch 1, Parallel WaveGAN vocoder); 269.40× from FastSpeech Table 2 (arXiv:1905.09263). Found by us.</p>

<p class="rd-take"><b>Parallel models trade a learned alignment for a 50× faster loop.</b> Codec LMs later brought autoregression back (page 76).</p>

</article>

<article class="rd-page" id="tacotron-attention" data-part="TTS: the machine" data-draw="tacotron-attention" markdown>

<p class="rd-crumb"><b>TTS 5</b> Uses the attention of page 18 and the seq2seq shape of page 21.</p>

## How does Tacotron 2 know which letter it is saying?

1. **Encode the characters.** 512-dimensional embeddings, three convolution layers, then one bidirectional LSTM of 512 units (found by us).
2. **Attend once per frame.** Each decoder step takes a weighted sum of encoder states. Every 12.5 ms frame chooses where to look.
3. **Location-sensitive attention.** It also sees the cumulative weights so far. That pushes it forward and fights repeats and skips (found by us).
4. **A good alignment is a diagonal.** Rows are characters, columns are frames. A healthy model walks steadily down and right.
5. **A stop token ends it.** A sigmoid predicts "done". Generation stops at the first frame above 0.5 (found by us).

<p class="rd-cap">Architecture from Tacotron 2 §2 (arXiv:1712.05884), found by us; the survey lists Tacotron 2 in §5.2.3 and Table 9. The alignment heat map is illustrative.</p>

<p class="rd-take"><b>Tacotron 2 learns alignment for free, but only softly.</b> Nothing forces it to stay on the diagonal. Next: what happens when it leaves.</p>

</article>

<article class="rd-page" id="attention-failures" data-part="TTS: the machine" data-draw="attention-failures" markdown>

<p class="rd-crumb"><b>TTS 6</b> Breaks the diagonal of page 37.</p>

## Why do attention-based TTS models skip and repeat words?

1. **Online alignments are brittle.** They "fail to generalize to long utterances and out-of-domain text", giving missing or repeated words (§5.2.4).
2. **Skip: attention jumps ahead.** A word is never spoken. In our line, "thousand" could vanish.
3. **Repeat: attention slides back.** A word is said twice. If attention stalls, the stop token may never fire.
4. **Measured on 50 hard sentences.** Tacotron 2 failed 24% of them, Transformer TTS 34%, FastSpeech 0% (found by us).
5. **Fixes the survey lists.** Monotonic attention in linear time (Raffel et al.), generic alignment frameworks, or explicit durations (§5.2.4).
6. 🧠 **Numbers are the hard case.** That test set includes spellings and repeated numbers: account numbers and sort codes look like that.

<p class="rd-cap">Failure types from §5.2.4. Counts from FastSpeech Table 3 (arXiv:1905.09263), found by us. The three alignment pictures are illustrative.</p>

<p class="rd-take bad"><b>Soft attention can drop a word, and a bank cannot ship that.</b> Next: what Transformers changed, and what they didn't.</p>

</article>

<article class="rd-page" id="transformer-tts" data-part="TTS: the machine" data-draw="transformer-tts" markdown>

<p class="rd-crumb"><b>TTS 7</b> Uses the Transformer block from page 19.</p>

## What did replacing RNNs with a Transformer buy?

1. **Self-attention replaces recurrence.** Multi-head attention replaced Tacotron 2's RNNs and its vanilla attention (§5.2.3).
2. **Same pipeline, new acoustic model.** Phonemes in, mel out, WaveNet as the vocoder (§5.2.3).
3. **Training runs in parallel.** With teacher forcing, every frame trains at once. The source paper reports about 4.25× faster training (found by us).
4. **Quality held.** MOS 4.39 against 4.44 for recordings (found by us). The survey says "similar MOS" (§5.2.3).
5. **Inference is still sequential.** The decoder remains autoregressive, so synthesis still runs frame by frame (page 36).
6. 🧠 **Read surveys carefully.** The survey says 4.25× "faster than Tacotron 2". The source says training speed, not synthesis.

<p class="rd-cap">Survey claims from §5.2.3. MOS and the training-speed wording from Li et al. (arXiv:1809.08895, abstract), found by us.</p>

<p class="rd-take"><b>Transformers made TTS faster to train, not faster to run.</b> Next: FastSpeech fixes running.</p>

</article>

<article class="rd-page" id="length-regulator" data-part="TTS: the machine" data-draw="length-regulator" markdown>

<p class="rd-crumb"><b>TTS 8</b> The non-autoregressive answer to page 36.</p>

## How does FastSpeech turn 56 phonemes into 293 frames?

1. **Durations in frames.** Each phoneme gets a whole number of mel frames. FastSpeech's own example: D = [2, 2, 3, 1] (found by us).
2. **Copy each state d times.** h1 h1 h2 h2 h3 h3 h3 h4: four phonemes become eight frames. This is the **length regulator** (§5.2.3).
3. **Our line, same idea.** 56 phonemes at about 5.2 frames each give 293 frames.
4. **Speed is one multiplier.** Scale durations by α and round. α = 1.3 gives [3, 3, 4, 1], slower speech (found by us). Move the slider.
5. **Durations need a teacher.** FastSpeech read them from an autoregressive teacher's attention (page 37).
6. 🧠 **Too fast deletes sounds.** Below α = 0.5, one-frame phonemes round to zero and vanish. Try 0.3.
7. 💻 **Batches need padding masks.** Lines differ in length. Pad phonemes (B, T_ph) and frames (B, T_mel) to the longest, and mask padding out of attention and the loss.

<p class="rd-cap">Example durations and α values from FastSpeech §3.2 (arXiv:1905.09263), found by us; it reports smooth speed control from 0.5× to 1.5×. Our line's frame count is illustrative.</p>

<p class="rd-take"><b>Explicit durations make alignment impossible to lose and speed easy to set.</b> Next: why the output still sounds flat.</p>

</article>

<article class="rd-page" id="one-to-many" data-part="TTS: the machine" data-draw="one-to-many" markdown>

<p class="rd-crumb"><b>TTS 9</b> Uses the pitch contours of page 5.</p>

## Why does a plain L2 loss make TTS sound flat?

1. **One text, many speeches.** "Your balance is £1,250.75" can be said flat, cheerful, or as a question. This is the **one-to-many problem** (§5.2.3).
2. **Two valid contours.** One rises at the end, one falls. Both are correct targets for the same text.
3. **L2 predicts their average.** Squared error is minimized by the mean, and the mean of rise and fall is flat.
4. **Measured: less pitch spread.** Pitch σ was 54.4 in recordings, 44.1 for Tacotron 2 and 40.8 for Transformer TTS (found by us).
5. **Two ways out.** Feed the missing information as input (page 42). Or model the whole distribution: flows, VAEs, diffusion (page 43, page 44, page 45).

<p class="rd-cap">Contours are illustrative. Pitch σ from FastSpeech 2 Table 3 (arXiv:2006.04558), found by us.</p>

<p class="rd-take"><b>Regression to the mean is why early TTS sounded robotic.</b> Next: FastSpeech 2 gives the model the answer.</p>

</article>

<article class="rd-page" id="variance-adaptor" data-part="TTS: the machine" data-draw="variance-adaptor" markdown>

<p class="rd-crumb"><b>TTS 10</b> The first fix from page 41.</p>

## How does FastSpeech 2 put pitch and energy back?

1. **Make variance an input.** Duration, pitch and energy become conditional inputs, not things to guess (§5.2.3).
2. **Training: real values in.** Durations come from the Montreal Forced Aligner; pitch and energy come from the recording (found by us).
3. **Inference: predictors take over.** Three small two-layer 1D-conv predictors output duration, pitch and energy (found by us).
4. **Values become embeddings.** Each frame's pitch and energy is quantized to 256 bins and embedded (found by us).
5. **No teacher, better voice.** On real mel targets, MOS rose from 3.68 to 3.83, and training fell from 53 to 17 hours (found by us).
6. 🧠 **Why drop distillation?** A teacher's output is smoothed and loses variance. Aligner durations plus real targets close that gap.

<p class="rd-cap">Design from §5.2.3. Aligner, predictors, 256 bins, MOS and training hours from FastSpeech 2 §2–3, Tables 1–2 (arXiv:2006.04558), found by us; all systems used Parallel WaveGAN.</p>

<p class="rd-take"><b>Give the model what it cannot guess, and the voice stops sounding flat.</b> FastPitch conditions on pitch alone; FastSpeech 2s skips the mel (§5.2.3).</p>

</article>

<article class="rd-page" id="glow-tts-mas" data-part="TTS: the machine" data-draw="glow-tts-mas" markdown>

<p class="rd-crumb"><b>TTS 11</b> Removes the teacher of page 40.</p>

## How can a model find its own alignment without attention?

1. **Glow-TTS needs no external aligner.** It is a flow-based parallel TTS (§5.2.4). A normalizing flow maps mel frames to a latent.
2. **Score every pairing.** Each phoneme predicts a Gaussian. Cell (i, j) holds frame j's log-likelihood under phoneme i.
3. **Search the best monotonic path.** Q(i, j) = max(Q(i−1, j−1), Q(i, j−1)) + log N(z_j). This is **monotonic alignment search** (found by us).
4. **Backtrack from the corner.** The path never goes back and never skips a phoneme. Its run lengths are the durations.
5. **Cheap, and training only.** Cost O(T_text × T_mel), under 20 ms per iteration on CPU. Inference uses a duration predictor (found by us).
6. **Fast and robust.** 15.7× faster than Tacotron 2. Tacotron 2's error rate climbs past about 260 characters; Glow-TTS stays flat (found by us).

<p class="rd-cap">Glow-TTS and EfficientTTS are in §5.2.4. Recurrence, cost and results from Glow-TTS §3.2 and §5 (arXiv:2005.11129), found by us. The 4 × 10 likelihood grid is made up.</p>

<p class="rd-take"><b>MAS is Viterbi on a learned likelihood: hard monotonic alignment with no aligner.</b> Next: VITS builds a full text-to-waveform model on it.</p>

</article>

<article class="rd-page" id="vits" data-part="TTS: the machine" data-draw="vits" markdown>

<p class="rd-crumb"><b>TTS 12</b> Combines page 27 and page 43.</p>

## How does VITS go from text to waveform in one model?

1. **A conditional VAE.** A latent conditioned on text models the speech, and an adversarial loss sharpens the output (§5.2.3).
2. **Posterior encoder, training only.** It reads the real clip's linear spectrogram and encodes the latent z (found by us).
3. **Prior from text, through a flow.** A text encoder plus a normalizing flow; MAS aligns them, as in Glow-TTS (found by us).
4. **The decoder writes the waveform.** A HiFi-GAN-style generator with discriminators: no mel output, no separate vocoder (found by us).
5. **Stochastic durations.** Sampled durations give one text different rhythms, a direct answer to page 41 (found by us).
6. 🧠 **Why skip the vocoder?** One model trained end to end on waveforms has no mismatch between two separately trained halves.

<p class="rd-cap">Description in §5.2.3. Components and results from VITS §2, Tables 1 and 4 (arXiv:2106.06103), found by us: LJ Speech MOS 4.43 vs 4.46 for recordings, 67.12× real time.</p>

<p class="rd-take"><b>VITS reached near-recording MOS on LJ Speech in one model.</b> Next: diffusion, slower but very flexible.</p>

</article>

<article class="rd-page" id="diffusion-tts" data-part="TTS: the machine" data-draw="diffusion-tts" markdown>

<p class="rd-crumb"><b>TTS 13</b> Uses the reverse process of page 24.</p>

## Can diffusion generate mel spectrograms, and at what cost?

1. **Diffusion for mel, or for waveform.** Grad-TTS and DiffTTS generate mel features; WaveGrad and DiffWave generate waveforms (§5.2.3).
2. **Grad-TTS starts near the answer.** Noise centred on the text encoder's output is refined step by step; MAS aligns text (found by us).
3. **Steps trade speed for quality.** Move the toggle: 4 steps give MOS 3.96, 10 give 4.38, 1,000 give 4.44 (found by us).
4. **Ten steps is the knee.** RTF 0.033, about twice as fast as Tacotron 2's 0.075 (found by us). [[4.38 | MOS at 10 steps; recordings 4.53]]
5. **Faster samplers followed.** ProDiff predicts clean data directly; InferGrad trains with the few inference steps in mind (§5.2.3).
6. 🧠 **Steps are a serving knob.** One trained model, many latency and quality settings, chosen at inference.

<p class="rd-cap">Model families from §5.2.3. MOS and RTF from Grad-TTS Table 2 (arXiv:2105.06337, LJ Speech, GPU), found by us. Lines only join points for reading.</p>

<p class="rd-take"><b>Diffusion buys quality with steps, and the step count is yours to set.</b> Next: the data all these models trained on.</p>

</article>

<article class="rd-page" id="tts-datasets" data-part="TTS: the machine" data-draw="tts-datasets" markdown>

<p class="rd-crumb"><b>TTS 14</b> Closes the machine chapter. Every model above was tested on one of these.</p>

## Which datasets do TTS papers train and test on?

1. **LJ Speech is the default.** About 24 hours from one female speaker reading public-domain text (§5.2.2). Tacotron, WaveNet and DeepVoice report on it.
2. **LibriTTS covers many speakers.** 585 hours from audiobooks, also used for voice conversion (Table 5).
3. **Accents: the ARCTIC pair.** CMU ARCTIC has 20 hours, L2-ARCTIC 11.2 hours of accented English (Table 5).
4. **Mandarin: AISHELL-3 and 4.** 85 and 120 hours, ticked for TTS and VC (Table 5).
5. 🧠 **One voice is not zero-shot.** LJ Speech trains one voice well. Cloning unseen voices needs many speakers and far more hours (page 76).

<p class="rd-cap">Hours from §5.2.2 and Table 5. VCTK (44 h) appears in Table 5 without task ticks, so it is greyed here.</p>

<p class="rd-take"><b>Most results in this chapter are one speaker, 24 hours, read English.</b> Remember that before trusting a MOS for your own voice.</p>

</article>

<article class="rd-page" id="why-vocoder" data-part="TTS: vocoders and voices" data-draw="why-vocoder" markdown>

<p class="rd-crumb"><b>Voice 1</b> Uses the 80 × 293 mel of our bank line from page 33 and page 8.</p>

## Why does a TTS model need a vocoder at all?

1. **The acoustic model stops at mel.** It turns linguistic features into acoustic features. A separate vocoder makes the waveform (§5.2.1, Fig. 14).
2. **Mel is small on purpose.** Our 3.4 s line is 293 frames × 80 bins: 23,440 numbers. The waveform is 74,970 samples, about 3.2 times more.
3. **Mel throws away phase.** It keeps only energy per band per frame. Many waveforms share the same mel, so inverting it is guesswork.
4. **Old fix: estimate phase by iteration.** Griffin-Lim alternates between spectrogram and waveform until they agree. Found by us; it sounds metallic, which is why neural vocoders took over.
5. 🧠 **Vocoder sets the ceiling.** Fed real mels, HiFi-GAN V1 scores 4.36 MOS against 4.45 for real audio. The acoustic model can only lose from there.

<p class="rd-cap">Sizes are our illustrative running example (22,050 Hz, hop 256). MOS values are from the HiFi-GAN paper (arXiv:2010.05646, Table 1), found by us.</p>

<p class="rd-take"><b>The vocoder turns a small, phase-free picture into 74,970 real samples.</b> Next: why the first neural vocoder took minutes to do it.</p>

</article>

<article class="rd-page" id="wavenet-cost" data-part="TTS: vocoders and voices" data-draw="wavenet-cost" markdown>

<p class="rd-crumb"><b>Voice 2</b> Uses causal dilated convolutions from page 17.</p>

## Why was WaveNet too slow to serve?

1. **One sample at a time.** WaveNet predicts each sample from all earlier ones with causal, dilated convolutions (§3.2.3, §5.2.3).
2. **Our line needs 74,970 steps.** Each step waits for the previous one. A GPU cannot parallelise along time. [[74,970 | sequential steps for 3.4 s]]
3. **Measured: 70 samples a second.** On a V100, WaveNet made 0.07 kHz (found by us). Our 3.4 s line takes about 18 minutes.
4. **Move the toggle.** HiFi-GAN V1 makes 3,701 kHz on the same GPU. The same line takes about 20 milliseconds.
5. **Cheaper autoregression came first.** WaveRNN, LPCNet and SampleRNN keep sample-by-sample output but shrink each step. LPCNet lets classic LPC do part of the work (§5.2.7, page 6).
6. 🧠 **Know RTF and first audio.** RTF is compute over audio time; below 1 keeps up. Streaming also needs the first chunk fast.

<p class="rd-cap">Speeds: HiFi-GAN paper (arXiv:2010.05646, Table 1, V100), found by us. Clip is illustrative.</p>

<p class="rd-take"><b>Sample-by-sample generation is accurate but serial: 18 minutes for one balance.</b> Next: how GANs make the whole waveform in one pass.</p>

</article>

<article class="rd-page" id="gan-vocoders" data-part="TTS: vocoders and voices" data-draw="gan-vocoders" markdown>

<p class="rd-crumb"><b>Voice 3</b> Builds on the speed problem from page 48.</p>

## How does a GAN vocoder learn to sound real?

1. **Generate everything at once.** A convolutional generator upsamples the mel 256 times, one frame to one hop of samples. No step waits for another (§5.2.7).
2. **Judge at several scales.** MelGAN's multi-scale discriminator looks at raw, ×2 and ×4 average-pooled audio (§5.2.7).
3. **Judge at several periods.** HiFi-GAN's multi-period discriminator folds the wave into columns of width p. Periods 2, 3, 5, 7, 11 are primes, so they overlap little (found by us).
4. **Match features, not only verdicts.** An L1 loss compares discriminator features of real and fake audio. HiFi-GAN adds a mel L1 loss, weighted 45 (§5.2.7; found by us).
5. **Or match spectra at many resolutions.** Parallel WaveGAN adds a multi-resolution STFT loss: 1.44 M parameters, 28.68× real time at 24 kHz (§5.2.7; found by us).

<p class="rd-cap">The waveform is a made-up vowel. Periods and loss weights are from HiFi-GAN (arXiv:2010.05646, §2.3, Eq. 5); Parallel WaveGAN numbers from arXiv:1910.11480. Both found by us.</p>

<p class="rd-take"><b>A GAN vocoder is a fast generator held honest by many critics.</b> Next: the two other parallel families.</p>

</article>

<article class="rd-page" id="flow-diffusion-vocoders" data-part="TTS: vocoders and voices" data-draw="flow-diffusion-vocoders" markdown>

<p class="rd-crumb"><b>Voice 4</b> Uses the reverse diffusion process from page 24.</p>

## How do flow and diffusion vocoders trade speed for quality?

1. **A flow is an invertible map.** It turns noise into a waveform in one parallel pass and gives exact likelihoods (§5.2.7).
2. **Flows run fast but heavy.** WaveGlow runs above 500 kHz on a V100. It needs 87.73 M parameters and scores 3.81 MOS (found by us).
3. **Diffusion refines in many passes.** Start from noise and denoise step by step, guided by the mel. WaveGrad and DiffWave do this (§5.2.7).
4. **Quality matches WaveNet.** DiffWave scores 4.44 MOS against 4.43 for a WaveNet vocoder (found by us). Move the slider: cost grows with every step.
5. **Fewer steps is the research race.** WaveGrad works with as few as six iterations (found by us). InferGrad trains with the short inference schedule (§5.2.7).
6. **Shape the noise to the voice.** PriorGrad and SpecGrad make the starting noise follow the mel's spectral envelope (§5.2.7).

<p class="rd-cap">Numbers found by us: WaveGlow (arXiv:1811.00002 abstract; MOS and size from arXiv:2010.05646 Table 1), DiffWave (arXiv:2009.09761), WaveGrad (arXiv:2009.00713). Pass counts are illustrative.</p>

<p class="rd-take"><b>Flows pay in parameters; diffusion pays in steps.</b> Next: all four families on one chart.</p>

</article>

<article class="rd-page" id="vocoder-families" data-part="TTS: vocoders and voices" data-draw="vocoder-families" data-fast markdown>

<p class="rd-crumb"><b>Voice 5</b> Sums up page 48 to page 50. It also stands alone on the quick tour.</p>

## Which vocoder family should you pick?

1. **Autoregressive: good, far too slow.** WaveNet scores 4.02 MOS at 0.003× real time on a GPU (§5.2.7; found by us).
2. **Flow: parallel but heavy.** WaveGlow runs 22.75× real time with 88 M parameters, at 3.81 MOS.
3. **GAN: the fastest family.** MelGAN runs 646× real time but scores 3.79 (§5.2.7). Speed alone was not enough.
4. **HiFi-GAN closed the gap.** V1 reaches 4.36 against 4.45 for real audio, at 168× real time. Toggle to CPU: V1 barely keeps up, V2 runs nearly 10×.
5. **Diffusion and universal vocoding.** Diffusion is not in this table; its speed depends on step count. One vocoder for every voice has had limited success (§5.2.7).
6. 🧠 **Streaming favours GANs.** A convolutional GAN can vocode mel chunk by chunk as it arrives. Many diffusion passes per chunk delay the first audio.

<p class="rd-cap">All MOS and speeds are from one controlled comparison on LJSpeech, the HiFi-GAN paper (arXiv:2010.05646, Table 1), found by us. Real time = 22.05 kHz.</p>

<p class="rd-take"><b>For serving, GAN vocoders won: near-real quality, hundreds of times faster than real time.</b> Pick the size by your hardware, not by MOS alone.</p>

</article>

<article class="rd-page" id="gst-prosody" data-part="TTS: vocoders and voices" data-draw="gst-prosody" markdown>

<p class="rd-crumb"><b>Voice 6</b> Uses attention from page 18.</p>

## How can a TTS model copy the style of a reference clip?

1. **Text underdetermines prosody.** "Your balance is £1,250.75" can sound calm, cheerful or worried. Style information is not in the text (§5.2.3).
2. **Encode a reference clip.** A separate encoder compresses a spoken example into one vector. Tacotron conditions on it (§5.2.3).
3. **Prosody transfers across speakers.** The embedding copies timing and intonation even when the reference voice differs (found by us).
4. **Global style tokens add a bank.** The reference attends over learned tokens; the attention weights are the style (§5.2.3). Toggle the reference to watch them move.
5. **No labels are needed.** Tokens are learned without style labels. At inference you can set the weights by hand (found by us).

<p class="rd-cap">Six tokens and their weights are illustrative. Sources found by us: Skerry-Ryan et al. (arXiv:1803.09047), GST (arXiv:1803.09017).</p>

<p class="rd-take"><b>A reference encoder turns "say it like this" into a vector.</b> Next: which knobs you can turn directly.</p>

</article>

<article class="rd-page" id="controllable" data-part="TTS: vocoders and voices" data-draw="controllable" markdown>

<p class="rd-crumb"><b>Voice 7</b> Uses the pitch contour from page 5 and the variance adaptor from page 42.</p>

## What does "controllable" TTS let you turn?

1. **Pitch, speed and emotion.** Controllable synthesis aims to set these while staying natural (§5.2.8).
2. **Speed stretches durations.** At 1.25× speed our 293 frames become about 234. Watch the line shorten.
3. **Pitch moves the contour.** Raising pitch shifts the whole F0 curve up. The words stay the same.
4. **Emotion moves several at once.** Analysis tools measure pitch, loudness and duration, the features that carry emotion (§5.2.8). Toggle "excited" to move all three.
5. **Three fields meet here.** Expressive speech analysis, NLP for meaning and sentiment, and machine learning (§5.2.8).
6. **Next: control by description.** The survey expects tone, accent and age set by text prompts (§7).

<p class="rd-cap">The F0 contour and energy are made up for our running example. Frame count follows our illustrative 293-frame clip.</p>

<p class="rd-take"><b>Control works when pitch, energy and duration are explicit inputs.</b> Next: how to separate them when they are not.</p>

</article>

<article class="rd-page" id="disentangle" data-part="TTS: vocoders and voices" data-draw="disentangle" markdown>

<p class="rd-crumb"><b>Voice 8</b> Builds on the controls from page 53.</p>

## How do you pull content, pitch, rhythm and timbre apart?

1. **Why separate them?** To change one factor without moving the others. That makes models more interpretable and expressive (§5.2.9).
2. **Squeeze through bottlenecks.** SpeechFlow splits speech into rhythm, pitch, content and timbre with three bottleneck reconstructions (§5.2.9).
3. 🧠 **Width is the dial.** Too wide, and timbre leaks into content. Too narrow, and the words are lost. Toggle the width.
4. **Or play adversarial games.** Adversarial and collaborative training splits content from style. A VAE with adversarial training splits speaker from noise (§5.2.9).
5. **Model noise per frame.** Frame-level noise modelling with adversarial training separates noise from the speaker (§5.2.9).

<p class="rd-cap">Encoder layout follows SpeechSplit (arXiv:2004.11284, "triple information bottleneck"), found by us. Bottleneck widths are illustrative.</p>

<p class="rd-take"><b>Disentangling means each factor gets its own narrow channel.</b> Next: what goes wrong on text the model never saw.</p>

</article>

<article class="rd-page" id="robustness" data-part="TTS: vocoders and voices" data-draw="robustness" markdown>

<p class="rd-crumb"><b>Voice 9</b> Extends the attention failures from page 38.</p>

## Why do TTS models fail on odd text, and how was it fixed?

1. **Unseen text breaks models.** RobuTrans first converts text to linguistic features. It also changes attention and position embeddings (§5.2.10).
2. **Very long sentences drift.** The s-Transformer works on segments, with segment-level attention. It stays robust on extra-long sentences (§5.2.10).
3. **Add local context.** A local RNN inside the Transformer beat a plain Transformer on 20 hours of Mandarin (§5.2.10).
4. **Noisy references need care.** Diffusion models plus distillation extract prosody from noisy audio (§5.2.10).
5. **Alignment is the root.** RAD-TTS builds a robust speech-text alignment module (§5.2.10, page 43).
6. 🧠 **Bank text is odd text.** Sort codes, amounts and dates are rare in training data. Test them first (page 79).

<p class="rd-cap">Problems and fixes are the survey's (§5.2.10). The survey gives no error rates for them.</p>

<p class="rd-take"><b>Most robustness fixes protect the alignment or the input text.</b> Next: speech made with no text at all.</p>

</article>

<article class="rd-page" id="resynthesis" data-part="TTS: vocoders and voices" data-draw="resynthesis" markdown>

<p class="rd-crumb"><b>Voice 10</b> Recaps the GSLM pipeline from page 32, then asks what it is for.</p>

## Can you make speech without any text at all?

1. **Resynthesis regenerates speech.** It rebuilds speech from a representation, keeping quality and prosody. It serves enhancement and voice conversion (§5.2.5).
2. **Speech to units.** GSLM's encoder turns speech into discrete units, a kind of pseudo-text (Fig. 15).
3. **A language model over units.** It learns which unit sequences are likely, and can continue them (Fig. 15).
4. **Units back to speech.** A decoder turns units into a waveform. All three parts train without labels (§5.2.5).
5. **Units separate the factors.** Self-supervised units carry content; prosody and speaker can come separately (§5.2.5).
6. 🧠 **Seed of codec LMs.** Swap units for codec tokens and add text: that is VALL-E (page 76).

<p class="rd-cap">Layout follows the survey's Fig. 15 (GSLM, Lakhotia et al.), redrawn. Unit IDs are made up.</p>

<p class="rd-take"><b>Text-free speech generation treats units as words.</b> Next: keeping the words and changing the voice.</p>

</article>

<article class="rd-page" id="voice-conversion" data-part="TTS: vocoders and voices" data-draw="voice-conversion" markdown>

<p class="rd-crumb"><b>Voice 11</b> Uses speaker embeddings from page 26.</p>

## How do you change who is speaking but keep the words?

1. **Same words, new voice.** Voice conversion swaps the speaker and keeps linguistic content (§5.2.6).
2. **Seq2seq with TTS pretraining.** The Voice Transformer Network converts prosody too, not only timbre (§5.2.6).
3. **Recognise, then resynthesise.** ASR extracts content; TTS speaks it in the target voice. Plain cascades lose prosody (§5.2.6).
4. **CycleGAN needs no parallel data.** Two mappings must undo each other. No paired sentences or alignment are required (§5.2.6; found by us).
5. **VAEs work with little data.** Encode content, swap the speaker code, decode (§5.2.6).
6. 🧠 **Consent and cloning risk.** Convert only into voices you have consent for. The same tools can fool voice biometrics (page 80).

<p class="rd-cap">Families are from the survey (§5.2.6). The CycleGAN-VC claim is from arXiv:1711.11293, found by us. Arrows are schematic.</p>

<p class="rd-take"><b>Every VC family separates "what is said" from "who says it".</b> Next: building voices with little data.</p>

</article>

<article class="rd-page" id="low-resource" data-part="TTS: vocoders and voices" data-draw="low-resource" markdown>

<p class="rd-crumb"><b>Voice 12</b> Compares with the 24-hour LJSpeech budget from page 46.</p>

## How do you build TTS for a language with little data?

1. **Most languages lack data.** Popular commercial speech services skip most languages for want of paired data (§5.2.11).
2. **Use unpaired data.** Semi-supervised synthesis learns from speech or text without its pair (§5.2.11).
3. **Manufacture pairs.** Cascade pretrained ASR, MT and TTS to label unlabelled speech (§5.2.11).
4. **Crowdsource recordings.** Crowdsourced data collection has built TTS for low-resource languages (§5.2.11).
5. **Transfer style zero-shot.** Generate unseen speakers, emotions and prosody without training on them (§5.2.11).
6. 🧠 **Accents are low-resource too.** A UK caller base spans many accents. L2-ARCTIC has 11.2 hours (Table 5).

<p class="rd-cap">Techniques are the survey's (§5.2.11); it reports no data sizes for them. Hours are from §5.2.2 and Table 5.</p>

<p class="rd-take"><b>Low-resource TTS borrows data: unpaired, generated, crowdsourced or transferred.</b> Next: how to tell whether any of it sounds good.</p>

</article>

<article class="rd-page" id="tts-eval" data-part="TTS: vocoders and voices" data-draw="tts-eval" data-fast markdown>

<p class="rd-crumb"><b>Voice 13</b> Uses the HiFi-GAN scores from page 51.</p>

## How do you know a TTS system sounds good?

1. **MOS: listeners rate 1 to 5.** The mean is the score, for TTS and voice conversion alike (Table 6, §5.2.1).
2. **Every MOS needs an interval.** The 95% half-width is about 1.96σ/√N. With σ = 1, ±0.07 needs about 780 ratings. Move the slider.
3. **Overlap means no winner.** HiFi-GAN V1's 4.36 ± 0.07 overlaps real audio's 4.45 ± 0.06.
4. **Objective metrics are cheaper.** MCD measures distance between mel-cepstra. WER runs ASR on the output (§5.2.1, page 72).
5. **More tools, found by us.** CMOS compares two systems side by side. MUSHRA rates against a hidden reference. SECS checks speaker similarity. RTF and time-to-first-audio measure speed.
6. 🧠 **State your setup.** Interviewers ask about listener count, interval, test sentences and ASR model. Without them a MOS is a vibe.

<p class="rd-cap">Intervals for real audio and HiFi-GAN V1 are from arXiv:2010.05646 (Table 1), found by us. σ = 1 and the 4.20 system are illustrative.</p>

<p class="rd-take"><b>A TTS score is only as good as its interval and setup.</b> This closes the TTS chapters; next come the neighbour tasks.</p>

</article>

<article class="rd-page" id="asr" data-part="Neighbour tasks" data-draw="asr" markdown>

<p class="rd-crumb"><b>Tasks 1</b> Uses CTC from page 15 and the Conformer from page 20.</p>

## How far has deep learning pushed speech recognition?

1. **One network replaced the pipeline.** Old ASR chained features, an acoustic model and a language model. End-to-end models map audio straight to text (§5.1.1).
2. **Three training recipes dominate.** CTC, attention encoder-decoders and transducers. The two transducers here score 2.0% and 2.23% on clean audio (Table 7).
3. **Best clean score: 1.4% WER.** Conformer + wav2vec 2.0 and w2v-BERT XXL both use extra unlabeled audio (Table 7). [[1.4% | WER, LibriSpeech test-clean (Table 7)]]
4. **"Other" is about twice as hard.** The same two models score 2.6% and 2.5% on the noisier test-other split (Table 7).
5. **Whisper was never trained here.** Zero-shot, it scores 2.7% and 5.6% (Table 7). The next page shows why that still impresses.
6. 🧠 **ASR judges your TTS.** Synthesize a sentence, transcribe it, compute WER. That is the standard intelligibility check (page 59).

<p class="rd-cap">WER values are real (Table 7, LibriSpeech rows). Table 7 also lists ContextNet's architecture as "Conformer + wav2vec2.0", which looks like a slip.</p>

<p class="rd-take"><b>On clean read English, ASR errors fell to about one word in seventy.</b> Next: what happens off that benchmark.</p>

</article>

<article class="rd-page" id="whisper-vs-w2v2" data-part="Neighbour tasks" data-draw="whisper-vs-w2v2" markdown>

<p class="rd-crumb"><b>Tasks 2</b> Uses wav2vec 2.0 from page 30.</p>

## Why does Whisper beat wav2vec 2.0 away from LibriSpeech?

1. **Tied at home.** Both large models score 2.7% WER on LibriSpeech clean (Table 8).
2. **Far apart in the wild.** On CHiME6 dinner-party audio, wav2vec 2.0 scores 65.8% and Whisper 25.5% (Table 8).
3. **Phone calls are hard for both.** CallHome: 34.8% vs 17.6%. Switchboard: 28.3% vs 13.8% (Table 8). CallHome is 8 kHz telephone speech (§5.4.2).
4. **Data explains the gap.** Whisper learned from 680,000 hours of labeled web audio (§5.1.3). wav2vec 2.0 pretrains unlabeled, then fine-tunes on one dataset.
5. 🧠 **Choose your judge carefully.** Scoring TTS with a brittle ASR measures the ASR. Use a robust one, and the same one every time.

<p class="rd-cap">WER (%) values are real (Table 8). The bars compare the same two models on nine test sets.</p>

<p class="rd-take"><b>A benchmark tie can hide a twofold gap on real audio.</b> Bank calls look more like CallHome than LibriSpeech.</p>

</article>

<article class="rd-page" id="speaker-verification" data-part="Neighbour tasks" data-draw="speaker-verification" markdown>

<p class="rd-crumb"><b>Tasks 3</b> Uses speaker embeddings from page 26.</p>

## How does a system check that a voice is who it claims to be?

1. **Identify or verify.** Identification picks one of many known speakers. Verification answers yes or no to a claimed identity (§5.3.1).
2. **Embed, then compare.** A network maps any utterance to a fixed vector. A score compares it with the enrolled template (§5.3.1).
3. **Move the threshold.** Raising it lets in fewer impostors (FAR falls) but rejects more true callers (FRR rises) (Table 6).
4. **EER is where they cross.** ECAPA-TDNN reports 0.87% on VoxCeleb1, found by us. The survey describes it without numbers (§5.3.3). [[0.87% | EER, ECAPA-TDNN (C=1024)]]
5. 🧠 **Your TTS is the attacker.** A good voice clone scores like a genuine caller. Banks pair verification with spoof detection (page 80).

<p class="rd-cap">Score curves are illustrative; FAR, FRR and EER are computed live from them. The 0.87% EER is from the ECAPA-TDNN paper (arXiv:2005.07143, Table 1), found by us.</p>

<p class="rd-take"><b>Verification is a threshold trade between letting impostors in and turning customers away.</b> A cloned voice moves an impostor onto the genuine side.</p>

</article>

<article class="rd-page" id="diarization" data-part="Neighbour tasks" data-draw="diarization" markdown>

<p class="rd-crumb"><b>Tasks 4</b> Uses speaker embeddings from page 26.</p>

## How does a system work out who spoke when?

1. **Find speech, then cut it.** Voice activity detection drops silence. Segmentation cuts the rest into short pieces (§5.4.1).
2. **Embed each piece.** A network such as an x-vector extractor gives one speaker vector per segment (§5.4.1).
3. **Cluster the vectors.** Each cluster becomes one speaker. Spectral clustering can choose the number of speakers itself (§5.4.3).
4. **Refine the edges.** Re-segmentation moves boundaries and handles overlapped speech (§5.4.1).
5. **Or do it end to end.** EEND outputs every speaker's activity per frame, overlaps included, with no clustering (§5.4.3).
6. 🧠 **A data tool for TTS.** Diarization cuts long recordings into single-speaker clips. That is how found audio becomes training data.

<p class="rd-cap">The pipeline follows the survey's Fig. 16, redrawn. The two-speaker call and its segments are illustrative.</p>

<p class="rd-take"><b>Diarization is embeddings plus clustering, or one network that does both.</b> CALLHOME, its classic benchmark, is 8 kHz telephone speech (§5.4.2).</p>

</article>

<article class="rd-page" id="s2st" data-part="Neighbour tasks" data-draw="s2st" markdown>

<p class="rd-crumb"><b>Tasks 5</b> Uses the encoder-decoder shape from page 21.</p>

## Should speech translation be a cascade or one model?

1. **A cascade chains three models.** ASR, then machine translation, then TTS. Errors and delays add up at each hand-off (§5.5.1).
2. **End to end removes hand-offs.** An audio encoder feeds a text decoder directly, with no transcript in between (§5.5.1).
3. **Translatotron goes speech to speech.** Google's model uses no text at inference. It trailed the cascade but proved feasible (§5.5.3).
4. **Pretraining fills the data gap.** Reuse wav2vec 2.0 and mBART; one system trained only 20% of its parameters (§5.5.3). [[20% | of parameters fine-tuned (§5.5.3)]]
5. 🧠 **TTS is the last mile.** In a cascade, your TTS decides how the translation sounds. The source speaker's prosody is lost unless passed along.

<p class="rd-cap">Both pipelines are drawn from §5.5; boxes are illustrative, not to scale.</p>

<p class="rd-take"><b>Cascades are modular and debuggable; direct models avoid error build-up.</b> Either way, the last stage decides how the output sounds.</p>

</article>

<article class="rd-page" id="enhancement" data-part="Neighbour tasks" data-draw="enhancement" markdown>

<p class="rd-crumb"><b>Tasks 6</b> Uses spectrograms from page 7.</p>

## How does a network clean up noisy speech?

1. **Noise hurts everything downstream.** Enhancement removes noise and distortion, often as a step before ASR (§5.6.1).
2. **Classic filters assume steady noise.** Spectral subtraction and Wiener filtering struggle when the noise changes (§5.6.3).
3. **Networks learn from pairs.** The DNS challenge offers over 10,000 hours of noisy speech and over 1,000 hours clean (§5.6.2).
4. **Top PESQ-WB: 3.23.** FRCRN, a U-Net with a convolutional recurrent network. PESQ runs from −0.5 to 4.5 (Table 10, Table 6).
5. **Read the table with care.** Most rows report only wideband or narrowband scores. Sudo rm -rf appears twice, with different citations (Table 10).
6. 🧠 **Clean TTS data gently.** Found audio needs denoising, but a TTS model learns enhancer artefacts too. Filtering bad clips is often safer.

<p class="rd-cap">PESQ values are real (Table 10, DNS challenge). Rows with no score for the chosen metric are left out.</p>

<p class="rd-take"><b>Learned enhancers beat classic filters on changing noise.</b> For a TTS engineer, they are a data-cleaning tool with side effects.</p>

</article>

<article class="rd-page" id="separation" data-part="Neighbour tasks" data-draw="separation" markdown>

<p class="rd-crumb"><b>Tasks 7</b> Continues from enhancement on page 65.</p>

## How do you split two voices talking at once?

1. **The cocktail-party problem.** One mixture goes in; one track per speaker comes out (§5.10.1).
2. **Outputs have no natural order.** Permutation invariant training scores every pairing and keeps the best (§5.10.3).
3. **Score the gain in decibels.** SI-SDRi measures how much cleaner each output is than the mixture (Table 6, Table 11).
4. **15.3 to 23.9 dB.** From Conv-TasNet (2019) to Separate And Diffuse (2023) on WSJ0-2mix (Table 11). [[+8.6 dB | in four years (Table 11)]]
5. **More speakers, much less gain.** Separate And Diffuse falls from 21.5 dB on Libri2Mix to 5.2 on Libri20Mix (Table 11).

<p class="rd-cap">SI-SDRi values are real (Table 11). The mixture sketch on steps 1–2 is illustrative.</p>

<p class="rd-take"><b>Two-speaker separation is nearly solved; crowds are not.</b> Next: judging quality without a clean reference.</p>

</article>

<article class="rd-page" id="quality-assessment" data-part="Neighbour tasks" data-draw="quality-assessment" markdown>

<p class="rd-crumb"><b>Tasks 8</b> Prepares the TTS metrics on page 59.</p>

## Can a model predict what listeners would score?

1. **MOS is the gold standard.** Listeners rate clips from 1 to 5. It is slow, costly and hard to scale (§5.9.1).
2. **PESQ and POLQA need the original.** They compare against a clean reference, which real audio usually lacks (§5.9.3).
3. **Neural predictors skip the reference.** They estimate MOS from the clip alone. The survey notes they generalize poorly (§5.9.3).
4. **NORESQA uses any clean speech.** Its reference may say different words; it is just a clean anchor (§5.9.3).
5. 🧠 **TTS has no original.** Synthetic speech has no matching clean recording. So TTS teams use reference-free predictors, then confirm with listeners.

<p class="rd-cap">The three families are from §5.9.3. The boxes and the scores on them are illustrative.</p>

<p class="rd-take"><b>Automatic MOS is a cheap filter, not a verdict.</b> Ship decisions still need a listening test.</p>

</article>

<article class="rd-page" id="slu" data-part="Neighbour tasks" data-draw="slu" markdown>

<p class="rd-crumb"><b>Tasks 9</b> A bank request, like our balance line from page 33.</p>

## How does a voice assistant turn speech into an action?

1. **Three jobs.** Keyword spotting, intent classification and slot filling (§5.11.1).
2. **Wake words first.** Keyword spotting listens for fixed words. KWT reaches 97.7% on 35-word Speech Commands (§5.11.3).
3. **Intent: what they want.** A pipeline runs ASR, then a text classifier. End-to-end models skip the transcript (§5.11.1).
4. **Slots: the details.** Amount, payee and date fill predefined slots. The best ATIS score is F1 0.9846 (Table 12).
5. 🧠 **TTS speaks the slots back.** "Fifty pounds to Mum, tomorrow?" The front end must read amounts and dates right (page 79).

<p class="rd-cap">Accuracy and F1 are real (§5.11.3, Table 12). The bank request and its labels are illustrative.</p>

<p class="rd-take"><b>Understanding produces slots; TTS has to say them back exactly.</b> A misread amount is a banking error, not a style issue.</p>

</article>

<article class="rd-page" id="edge-tasks" data-part="Neighbour tasks" data-draw="edge-tasks" markdown>

<p class="rd-crumb"><b>Tasks 10</b> Uses sample rates from page 3.</p>

## What do super-resolution, VAD and audio-visual models add?

1. **Super-resolution restores the highs.** NU-Wave 1 and 2 use diffusion to turn 16 or 24 kHz audio into 48 kHz (§5.7.3).
2. 🧠 **Phone lines go the other way.** An 8 kHz line keeps nothing above 4 kHz. Test your TTS after that cut, not before.
3. **VAD: is anyone speaking?** It separates speech from noise for hands-free and telephone apps (§5.8.1).
4. 🧠 **VAD sets turn-taking.** In a voice bot, it decides when the caller stopped. That is when TTS may start, or must stop.
5. **Audio-visual: lips help.** Lip-reading, audio-visual separation and talking-face generation (§5.12.1).

<p class="rd-cap">Tasks and models from §5.7, §5.8 and §5.12. The "your use" notes are ours.</p>

<p class="rd-take"><b>These smaller tasks sit around the TTS model in a real voice product.</b> VAD and the phone channel matter most for a bank.</p>

</article>

<article class="rd-page" id="domain-meta" data-part="Transfer learning" data-draw="domain-meta" markdown>

<p class="rd-crumb"><b>Transfer 1</b> Start of the transfer chapter. Uses ASR from page 60.</p>

## How do you adapt a speech model to a new domain or voice?

1. **Domains shift.** Train on audiobooks, deploy on phone calls: the input distribution changes (§6.1.1).
2. **Learn features that ignore domain.** A gradient reversal layer trains features a domain classifier cannot separate (§6.1.2).
3. **TTS adapts to new speakers.** AdaSpeech adapts a TTS model to a new speaker or domain (§6.1.2).
4. **ASR and TTS can teach each other.** The machine speech chain uses TTS to synthesize in-domain speech for ASR training (§6.1.2).
5. **Meta-learning learns to adapt.** Meta-TTS clones a voice from few samples in few steps (§6.2.2).

<p class="rd-cap">Techniques and examples from §6.1–§6.2. The board is our summary; it reports no numbers because the survey gives none.</p>

<p class="rd-take"><b>Adaptation means changing as little as possible for a new domain.</b> Next: how few parameters that can be.</p>

</article>

<article class="rd-page" id="peft" data-part="Transfer learning" data-draw="peft" markdown>

<p class="rd-crumb"><b>Transfer 2</b> Uses attention from page 18.</p>

## How do adapters, prefixes and LoRA train so few weights?

1. **Freeze the big model.** Train only small added modules, and swap them per task (§6.3.1).
2. **Adapter: squeeze, then expand.** Project from d down to m, apply a nonlinearity, project back, add the input (Eq. 30).
3. **Prefix: extra keys and values.** Learnable vectors are prepended to K and V in every head; Q is unchanged (Eq. 31).
4. **LoRA: a low-rank update.** Add \( s\,x W_{down} W_{up} \) with rank r (Eq. 33). It can merge into W, so no extra latency (§6.3.1).
5. **Count them yourself.** Move the sliders. At d = 1024 and r = 8, LoRA trains 16,384 weights instead of 1,048,576.

<p class="rd-cap">Equations are the survey's (Eq. 30, 31, 33). Counts are computed live for one d × d matrix, ignoring biases; prefix length 10 is our choice.</p>

<p class="rd-take"><b>All three freeze the backbone.</b> On wav2vec 2.0 they train 0.55% (prefix), 1.2% (LoRA) or 8.1% (adapter) of the weights (Table 13).</p>

</article>

<article class="rd-page" id="peft-tts" data-part="Transfer learning" data-draw="peft-tts" markdown>

<p class="rd-crumb"><b>Transfer 3</b> Uses MCD and WER from page 59.</p>

## Does parameter-efficient tuning work for TTS?

1. **Full fine-tuning: 35.8M weights.** The baseline updates all 35,802,977 parameters (Table 15).
2. **Two scores.** MCD measures spectral distance to the real recording. WER checks intelligibility through ASR. Lower is better for both.
3. **Adapters win on MCD.** 6.16 on LTS and 6.54 on L2ARCTIC, beating full fine-tuning with 659,200 weights (Table 15).
4. **Full tuning wins on WER.** 0.27 and 0.21: every lightweight method is less intelligible (Table 15).
5. **LoRA is smallest, not best.** 81,920 weights, and the worst-but-one MCD on LTS: 6.83 (Table 15). [[81,920 | LoRA weights vs 35.8M (Table 15)]]
6. 🧠 **Per-voice adapters suit a bank.** They are cheap to store and swap. Check WER on amounts and names before shipping.

<p class="rd-cap">MCD and WER are real (Table 15). Its "Parameters (%)" column holds counts; the backbone is unnamed.</p>

<p class="rd-take"><b>Adapters can match full tuning on timbre but not yet on intelligibility.</b> The survey sees no clear winner among them (§6.3.1).</p>

</article>

<article class="rd-page" id="compression" data-part="Transfer learning" data-draw="compression" markdown>

<p class="rd-crumb"><b>Transfer 4</b> Last page of the chapter. Uses wav2vec 2.0 from page 30.</p>

## How do you shrink a speech model for deployment?

1. **Distill a student.** A small model learns to copy a large teacher's outputs or hidden states (§6.3.2).
2. **Prune what doesn't matter.** Mask weights with low importance scores, following the lottery-ticket idea (§6.3.3).
3. **Factorize to low rank.** Low-rank transformers halve model size and run 1.35× faster (§6.3.3).
4. **Quantize the weights.** 32-bit floats become 8-, 4-, 2- or even 1-bit integers (§6.3.3).
5. **Every cut has a price.** Distillation plus quantization made wav2vec 2.0 4.8× smaller, with WER up 7%. Without distillation: 3.6× smaller, 0.1% worse (§6.3.3).

<p class="rd-cap">The 5 × 5 weights are made up; pruning, rank-1 and 4-bit rounding are computed on them. Size ratios are real (§6.3.3).</p>

<p class="rd-take"><b>Quantization alone was nearly free; distillation bought more size at a real accuracy cost.</b> Measure on your own data before you ship.</p>

</article>

<article class="rd-page" id="predictions" data-part="Since 2023" data-draw="predictions" markdown>

<p class="rd-crumb"><b>Since 2023 · 1</b> The survey's last section, scored by us against what came after.</p>

## Which of the survey's nine predictions came true?

1. **Nine bets, written in May 2023.** The conclusion lists nine directions: large, multilingual, multimodal, in-context, controllable, efficient, explainable, brain-inspired, and text-to-audio models (§7).
2. **Scale and multilingual: yes.** VALL-E trained on 60K hours, found by us. F5-TTS later trained on 100K hours of multilingual speech.
3. **In-context and multimodal: yes.** A 3-second recording now clones a voice. Moshi, found by us, holds a full-duplex spoken dialogue at about 200 ms latency.
4. **Text-to-audio for speech: yes.** Audiobox, found by us, makes speech and sounds with one flow-matching model, prompted by descriptions or examples.
5. **Explainable and brain-inspired: still open.** We found no TTS system built around either idea. These two are our weakest calls.
6. 🧠 **What it underplayed.** Codec tokens and flow matching now carry most new TTS systems. The survey names VALL-E once (§3.3.2) and never mentions flow matching.

<p class="rd-cap">The nine directions are real (§7). The verdicts are our judgment; examples are found by us: VALL-E arXiv:2301.02111, F5-TTS 2410.06885, Moshi 2410.00037, Audiobox 2312.15821.</p>

<p class="rd-take"><b>The survey saw the scale coming but not the tokens.</b> Next: what a codec token is.</p>

</article>

<article class="rd-page" id="codec-tokens" data-part="Since 2023" data-draw="codec-tokens" markdown>

<p class="rd-crumb"><b>Since 2023 · 2</b> Uses discrete units from page 32 and the sample rate from page 3.</p>

## How does a neural codec turn audio into tokens?

1. **An encoder squeezes time.** EnCodec's encoder turns 320 samples of 24 kHz audio into one frame. That gives 75 frames a second, found by us.
2. **A first codebook rounds coarsely.** Each frame snaps to the nearest of 1,024 learned vectors. That costs 10 bits per frame.
3. **Each extra codebook fixes the leftover.** Codebook 2 quantizes what codebook 1 missed, and so on. This stack is **residual vector quantization** (RVQ). Move the slider.
4. **Bitrate is plain arithmetic.** Eight codebooks × 75 frames × 10 bits = 6 kbps. SoundStream, found by us, beat Opus at 12 kbps using only 3 kbps.
5. **Our bank line becomes a token grid.** At 3.4 s it is 255 frames × 8 codebooks = 2,040 tokens. A language model can predict those.
6. 💻 **The encode loop is short.** Start with the residual equal to the frame. For each codebook, take the nearest code, store its index, and subtract its vector.

<p class="rd-cap">Rates are real: EnCodec arXiv:2210.13438 (§3.1–3.2), SoundStream arXiv:2107.03312 (abstract), both found by us. The bars are illustrative; the 3.4 s line is our running example.</p>

<p class="rd-take"><b>A codec makes audio look like text: a short grid of integers.</b> Next: a language model that writes that grid.</p>

</article>

<article class="rd-page" id="codec-lm" data-part="Since 2023" data-draw="codec-lm" markdown>

<p class="rd-crumb"><b>Since 2023 · 3</b> Uses the token grid from page 75 and AR vs NAR from page 36.</p>

## How does VALL-E speak in a voice it heard for 3 seconds?

1. **TTS becomes language modelling.** VALL-E reads phonemes plus the codec tokens of a 3-second prompt. It continues the grid in that voice (§3.3.2).
2. **An AR model writes codebook 1.** One token at a time, 75 per second of speech. This is the slow, sequential part (§4.2 of VALL-E).
3. **A NAR model fills codebooks 2–8.** Each pass fills a whole row at once, so it runs seven times. These rows add acoustic detail.
4. **EnCodec decodes the grid.** The 8-row grid goes back through the codec's decoder at 24 kHz. No mel spectrogram, no separate vocoder.
5. **It beat the 2022 zero-shot baseline.** WER 5.9% vs YourTTS's 7.7%. Speaker similarity 0.580 vs 0.337; real recordings score 0.754 (Table 2 of VALL-E).
6. 💻 **Sample, don't take the argmax.** Top-k keeps the k likeliest tokens. Top-p keeps the smallest set whose probabilities sum to p. Renormalize, then draw.

<p class="rd-cap">Numbers are from the VALL-E paper, arXiv:2301.02111 (§3, §4.2, Tables 2), found by us. The survey only describes the idea (§3.3.2). Grid size is illustrative.</p>

<p class="rd-take"><b>VALL-E split speech into a hard sequential row and easy parallel rows.</b> Three seconds of a voice is enough, which matters on page 80.</p>

</article>

<article class="rd-page" id="flow-matching" data-part="Since 2023" data-draw="flow-matching" markdown>

<p class="rd-crumb"><b>Since 2023 · 4</b> Builds on page 24 and page 45.</p>

## Why did flow matching replace diffusion in new TTS models?

1. **Diffusion walks a curved path.** Denoising goes from noise to a mel in many small steps (Eq. 25). Each step is one network call.
2. **Flow matching learns a straight path.** Pair a noise sample with a real one and draw the line between them. The network learns the velocity along it.
3. **Straight paths need fewer steps.** Move the slider: a few Euler steps already land near the target. Curved paths overshoot with so few.
4. **Voicebox showed it at scale.** A flow-matching model on 50K hours, found by us. It beat VALL-E: WER 1.9% vs 5.9%, and up to 20× faster.
5. **Now it is the common decoder.** F5-TTS runs at real-time factor 0.15. CosyVoice pairs an LLM over speech tokens with a flow-matching decoder.
6. 💻 **Loss and sampler fit in four lines.** Mix \( x_t = (1-t)x_0 + t x_1 \) and regress \( \lVert v_\theta(x_t,t) - (x_1 - x_0) \rVert^2 \). To sample, take N Euler steps from noise.

<p class="rd-cap">Numbers found by us: Voicebox arXiv:2306.15687, F5-TTS 2410.06885, CosyVoice 2407.05407 (abstracts); Matcha-TTS 2309.03199 also uses it. The paths and points are illustrative.</p>

<p class="rd-take"><b>Same goal as diffusion, straighter road, fewer steps.</b> Next: what all of this means on a bank's phone line.</p>

</article>

<article class="rd-page" id="bank-voice" data-part="At a bank" data-draw="bank-voice" markdown>

<p class="rd-crumb"><b>At a bank · 1</b> A design answer in nine steps: requirements first, safety last. NatWest facts found by us.</p>

## How would you design a streaming voice assistant for a bank?

1. **Requirements come from the product.** NatWest's Spending Insights trial talks about money by voice or text. It must handle follow-ups, topic changes and interruptions, on in-house small language models.
2. 🧠 **Set the latency budget.** Time to first audio is end-of-speech detection + model's first reply + first audio chunk. Move the sliders; our numbers, not theirs.
3. **Pick the components.** Their cascade is Nemotron ASR, then the SLMs, then TTS. A full-duplex model like Moshi listens while speaking, at about 200 ms.
4. **Data and training follow the failures.** Scottish "last quarter" was heard as "last water". Tuning for UK accents and banking terms cut misheard words by 20%.
5. **Evaluate and serve in streaming terms.** Track time to first audio and real-time factor (RTF: compute time ÷ audio time). Serve TTS in chunks so playback starts early.
6. 🧠 **Monitor barge-in, then safety.** When the caller talks over the assistant, stop playback within a beat. Safety comes on page 80.

<p class="rd-cap">Facts found by us: ffnews.com (Spending Insights, 25 Sep 2026; Nemotron ASR, 14 Oct 2026), Moshi arXiv:2410.00037. The budget bar is our arithmetic with assumed numbers.</p>

<p class="rd-take"><b>Answer design questions in order, and put a number on latency.</b> Next: the text front end that reads money aloud.</p>

</article>

<article class="rd-page" id="bank-normalization" data-part="At a bank" data-draw="bank-normalization" markdown>

<p class="rd-crumb"><b>At a bank · 2</b> Zooms into the text front end from page 34.</p>

## How should a bank's TTS read "£1,250.75" aloud?

1. **Money is the running example.** "£1,250.75" must become "one thousand two hundred and fifty pounds seventy-five pence". The survey's text analysis box (Fig. 14) hides this whole job.
2. **Dates are ambiguous.** "03/05/2026" is 3 May in the UK and March 5 in the US. The front end must know the locale.
3. **Codes are read in groups.** Sort code "12-34-56" is "twelve, thirty-four, fifty-six". Account numbers go digit by digit. Neither is ever "twelve thousand…".
4. **Merchant names need a lexicon.** "TK Maxx" is spelled out in part; "Sainsbury's" has a silent-looking ending. ASR has the mirror problem: "last quarter" heard as "last water".
5. **SSML lets the caller say the type.** A `<say-as interpret-as="date" format="dmy">` tag removes the guesswork. The dialogue system knows the type; pass it on.
6. 🧠 **A wrong amount is a complaint.** Test every release on money, dates, codes and merchants, before any MOS test.

<p class="rd-cap">Survey: a text analysis box only (§5.2.1, Fig. 14). Readings and codes are ours. "Last water": ffnews.com, Oct 2026, found by us.</p>

<p class="rd-take"><b>In banking, the front end decides correctness; the acoustic model decides beauty.</b> Next: the risk TTS itself creates for a bank.</p>

</article>

<article class="rd-page" id="spoofing" data-part="At a bank" data-draw="spoofing" markdown>

<p class="rd-crumb"><b>At a bank · 3</b> Joins speaker verification (page 62) and cloning (page 76).</p>

## Why does good TTS worry a bank's voice security team?

1. **Voice checks compare embeddings.** Verification compares a caller's embedding with an enrolled template (§5.3.1). Equal false-accept and false-reject rates give the **EER** (Table 6).
2. **Cloning needs 3 seconds.** A zero-shot model copies a voice from a short prompt (§3.3.2). Any voicemail greeting could be enough.
3. **EER does not measure spoofs.** It is computed on real people, not on synthetic copies of them. A low EER says nothing about clones.
4. **Spoof detectors are tested separately.** ASVspoof 2019, found by us, has synthesis and conversion attacks (logical access) and replays (physical access).
5. **Watermarks mark your own output.** AudioSeal, found by us, hides an inaudible mark in generated speech and finds it down to the sample.
6. 🧠 **Consent before any voice.** Record written consent from the voice talent, and say what the voice may be used for.

<p class="rd-cap">Verification and EER: §5.3, Table 6. Found by us: ASVspoof 2019 arXiv:1911.01601, AudioSeal arXiv:2401.17264. The survey cites anti-spoofing once (§6.1.1). The flow is illustrative.</p>

<p class="rd-take"><b>The better your TTS, the harder the bank's fraud problem.</b> Detect clones, mark your own audio, and get consent first.</p>

</article>

<article class="rd-page" id="reviewer" data-part="Your move" data-draw="reviewer" markdown>

<p class="rd-crumb"><b>Your move · 1</b> Each row was checked in the paper's text (v3).</p>

## What would a careful reviewer question in this survey?

1. **TTS has almost no numbers.** Section 5.2 names over 40 models (Table 9) but reports no results. Table 15 has some, under a "Parameters (%)" column of raw counts and an undefined "LTS" set.
2. **A citation points at ocean waves.** Table 9's vocoder "WaveGAN" cites Pena and Huang (2021), a coastal-engineering paper on wave loads.
3. **An equation lost its sign.** Eq. 29 drops the minus. Minimizing it as printed would raise prediction entropy, not lower it.
4. **Text repeats and claims slip.** One §5.2.4 paragraph appears twice, with stray "12345". §5.2.3 calls Transformer-TTS 4.25× faster than Tacotron 2; the original paper says 4.25× faster training.
5. **It stops before the turn.** Flow matching never appears, and spoofing gets one citation (§6.1.1). Pages page 75–page 80 fill the gap.
6. 🧠 **The steelman.** No other paper maps 12 tasks in one place. Its dataset and metric tables (Tables 5–6) make a good interview cheat sheet.

<p class="rd-cap">Every row points to the survey's own text (v3): Tables 9, 15, Eq. 29, §5.2.3–5.2.4, §6.1.1 and the reference list. Transformer-TTS: arXiv:1809.08895, found by us. The tones are our judgment.</p>

<p class="rd-take"><b>Use it as a map, not as a source of numbers.</b> For any number you quote, open the original paper.</p>

</article>

<article class="rd-page" id="verdict" data-part="Your move" data-draw="verdict" data-fast markdown>

<p class="rd-crumb"><b>Your move · 2</b> The goal: a TTS engineer interview at a UK bank, in two rounds.</p>

## Which pages should you revisit before each round?

1. **Always: the pipeline and its trade-offs.** Text front end, acoustic model, vocoder (page 33). Then AR vs NAR, alignment and one-to-many (page 36, page 38, page 41).
2. **Coding, part one: attention.** Causal mask, KV cache and shapes live on page 18 and page 19.
3. **Coding, part two: generative models.** Revisit page 23, page 27, page 77, page 7, page 75 and page 76.
4. **Design round: the bank chapter.** Rehearse page 78 to page 80 aloud, in the nine-step order. Add page 59 and page 51.
5. 🧠 **Our verdict.** The survey is a one-day map. Depth comes from the originals and the "Since 2023" pages.

<p class="rd-cap">The two-round goal is our reader's; the page mapping and verdict are ours, not the paper's.</p>

<p class="rd-take"><b>Breadth from the survey, depth from the originals, judgment from the bank pages.</b> Now test yourself.</p>

</article>

<article class="rd-page" id="quiz-mel" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 1</b> From page 8 and page 9.</p>

## Why is an MFCC a poor target for a TTS acoustic model?

- [ ] It has too many coefficients to predict
- [x] It is designed to throw away pitch (F0) information
- [ ] It uses a linear frequency scale, unlike hearing
- [ ] It can only be computed offline

<p class="rd-take"><b>MFCCs drop F0 on purpose.</b> One goal of MFCC extraction is removing vocal-fold excitation, i.e. pitch (§2.2). A TTS voice needs that pitch back, so models predict log-mel, which keeps it. MFCCs use 12 coefficients and the mel scale.</p>

</article>

<article class="rd-page" id="quiz-nar" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 2</b> From page 36 and page 40.</p>

## FastSpeech makes all mel frames at once. How does it know how many?

- [ ] The decoder predicts a stop token
- [ ] Every phoneme gets the same fixed number of frames
- [x] A duration predictor sets frames per phoneme, and a length regulator repeats them
- [ ] The vocoder trims the extra frames

<p class="rd-take"><b>Durations decide the length.</b> FastSpeech fixes the phoneme-to-frame mismatch with a length regulator driven by a duration predictor (§5.2.3). The stop token is how autoregressive Tacotron ends.</p>

</article>

<article class="rd-page" id="quiz-vocoder" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 3</b> From page 49.</p>

## What did HiFi-GAN add to MelGAN's discriminators?

- [ ] A multi-scale discriminator on downsampled audio
- [ ] A multi-resolution STFT loss
- [x] A multi-period discriminator
- [ ] Adaptive noise spectral shaping

<p class="rd-take"><b>The multi-period discriminator.</b> HiFi-GAN reuses MelGAN's multi-scale discriminator and adds a multi-period one (§5.2.7). Multi-resolution STFT loss is Parallel WaveGAN's; noise shaping belongs to diffusion vocoders.</p>

</article>

<article class="rd-page" id="quiz-alignment" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 4</b> From page 37 and page 38.</p>

## A Tacotron-style model skips words on a long statement. What is the likely cause?

- [ ] The vocoder lost phase information
- [ ] The duration predictor undershot
- [x] Its learned attention alignment broke on long or unusual text
- [ ] The mel spectrogram has too few bins

<p class="rd-take"><b>Brittle attention.</b> Alignments learned online by attention fail to generalize to long utterances and out-of-domain text, causing missing or repeated words (§5.2.4). Duration predictors belong to non-autoregressive models.</p>

</article>

<article class="rd-page" id="quiz-ssl" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 5</b> From page 75.</p>

## A codec makes 75 frames a second with 8 codebooks of 1,024 codes. What is its bitrate?

- [ ] 600 bits per second
- [x] 6 kbps
- [ ] 24 kbps
- [ ] 48 kbps

<p class="rd-take"><b>8 × 75 × 10 bits = 6 kbps.</b> A 1,024-entry codebook costs 10 bits per frame. 600 counts tokens, not bits; 24 kHz is the sample rate. This is VALL-E's EnCodec setting (found by us).</p>

</article>

<article class="rd-page" id="quiz-eval" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 6</b> From page 59.</p>

## A new voice gets 2% WER when an ASR model transcribes it. What have you learned?

- [ ] It sounds natural
- [x] It is intelligible to that ASR model, and not much more
- [ ] Its MOS will be above 4
- [ ] It matches the target speaker

<p class="rd-take"><b>WER checks words, not voice.</b> MOS rates naturalness on a 1–5 scale; MCD and WER are complementary objective checks (§5.2.1, Table 6). Speaker match needs its own test.</p>

</article>

<article class="rd-page" id="quiz-peft" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 7</b> From page 77 and page 23.</p>

## With \( x_t = (1-t)x_0 + t x_1 \), what does a flow-matching network regress?

- [ ] The noise \( x_0 \) that was added
- [ ] The clean sample \( x_1 \)
- [x] The velocity \( x_1 - x_0 \)
- [ ] The score, the gradient of log density

<p class="rd-take"><b>The velocity along the straight line.</b> Its target is \( x_1 - x_0 \), the same at every t on that line. Predicting the noise is DDPM's epsilon loss, a common mix-up.</p>

</article>

<article class="rd-page" id="quiz-spoof" data-part="Check yourself" data-quiz markdown>

<p class="rd-crumb"><b>Check 8</b> From page 62 and page 80.</p>

## Why doesn't a low EER prove a voice check is safe from TTS clones?

- [ ] EER only measures false rejections
- [ ] EER is for identification, not verification
- [x] EER is measured on real speakers, not synthetic copies
- [ ] VoxCeleb is too small to trust

<p class="rd-take"><b>Spoofs are a different test.</b> EER balances false accepts and false rejects among real voices (Table 6). Clone attacks need a countermeasure tested on spoofed audio, as in ASVspoof 2019 (found by us).</p>

</article>
